require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const app = express();

app.use(cors());
app.use(express.json());

// ==================== RATE LIMITING & ANTI-SPAM ====================
const orderRateMap = new Map();   // IP → { count, firstAt }
const ORDER_RATE_WINDOW = 60000;  // 1 minute window
const ORDER_RATE_MAX = 3;         // max 3 orders per minute per IP
const MAX_ITEMS_PER_ORDER = 20;   // max 20 items per order
const MAX_QTY_PER_ITEM = 10;     // max 10 of same item

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = orderRateMap.get(ip);

  if (!entry || now - entry.firstAt > ORDER_RATE_WINDOW) {
    orderRateMap.set(ip, { count: 1, firstAt: now });
    return next();
  }

  if (entry.count >= ORDER_RATE_MAX) {
    return res.status(429).json({ error: 'Too many orders. Please wait a minute.' });
  }

  entry.count++;
  return next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of orderRateMap) {
    if (now - entry.firstAt > ORDER_RATE_WINDOW) orderRateMap.delete(ip);
  }
}, 300000);

// Serve menu.json and other assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// In production, serve the built React app from dist/
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/good_coffee';

// Telegram bot config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Load menu.json once (for item name lookups in Telegram messages)
let menuData = [];
try {
  menuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'menu.json'), 'utf-8'));
} catch { /* menu not found — names will fall back to IDs */ }

function findMenuItemName(id) {
  for (const cat of menuData) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item.name;
  }
  return `Item #${id}`;
}

async function notifyTelegram(orderId, name, location, table, items) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const itemLines = items.map(i => {
      const itemName = findMenuItemName(i.id);
      const variant = i.variant ? ` (${i.variant})` : '';
      return `  • ${itemName}${variant} ×${i.quantity}`;
    }).join('\n');

    const text =
      `🔔 *New Order #${orderId}*\n` +
      `👤 *${name}*\n` +
      `📍 ${location} — Table ${table}\n\n` +
      `${itemLines}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Telegram notification failed:', err.message);
  }
}

// ==================== HAPPY HOUR SYSTEM ====================
const HAPPY_HOUR_FILE = path.join(__dirname, 'happy-hour.json');

// Default happy hour config
const DEFAULT_HAPPY_HOUR = {
  enabled: true,
  startHour: 5,   // 5:00 AM
  endHour: 10,    // 10:00 AM
  prices: {
    5: 2,     // Espresso: 2.5 → 2 DT
    6: 2.4,   // Cappuccino: 2.8 → 2.4 DT
    7: 2.5,   // Americano: 2.8 → 2.5 DT
    8: 2.5,   // Latte: 3 → 2.5 DT
  },
  label: 'Happy Hour ☀️',
};

function loadHappyHour() {
  try {
    if (fs.existsSync(HAPPY_HOUR_FILE)) {
      return JSON.parse(fs.readFileSync(HAPPY_HOUR_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_HAPPY_HOUR };
}

function saveHappyHour(config) {
  fs.writeFileSync(HAPPY_HOUR_FILE, JSON.stringify(config, null, 2));
}

function isHappyHourActive() {
  const config = loadHappyHour();
  if (!config.enabled) return { active: false, config };
  const hour = new Date().getHours();
  const active = hour >= config.startHour && hour < config.endHour;
  return { active, config };
}

function getHappyHourPrice(itemId) {
  const { active, config } = isHappyHourActive();
  if (!active) return null;
  const price = config.prices[String(itemId)];
  return price !== undefined ? price : null;
}

// PostgreSQL connection pool
const pool = new Pool({ connectionString: DATABASE_URL });

// Helper: compute status from an order row
function getStatus(order) {
  const diffMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
  if (order.prepared) return 'Ready';
  if (order.preparing) return 'Preparing';
  if (diffMinutes < 2) return 'In List';
  if (diffMinutes < 7) return 'Preparing';
  return 'Ready';
}

function getElapsed(order) {
  return ((Date.now() - new Date(order.created_at).getTime()) / 60000).toFixed(1);
}

function formatOrder(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    table: row.table,
    items: row.items,
    status: getStatus(row),
    elapsedMinutes: getElapsed(row),
    timestamp: row.created_at,
  };
}

// ==================== API ROUTES ====================

// Admin PIN (change this!)
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

// Admin auth middleware
function requireAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'];
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Place a new order (with optional coupon) — rate limited
app.post('/orders', rateLimit, async (req, res) => {
  const { name, location, table, items, couponCode } = req.body;
  if (!name || !location || !table || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing order info' });
  }

  // Anti-spam: validate name (2-50 chars, no weird stuff)
  const trimName = String(name).trim();
  if (trimName.length < 2 || trimName.length > 50) {
    return res.status(400).json({ error: 'Name must be 2-50 characters' });
  }

  // Anti-spam: max items & max quantity
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return res.status(400).json({ error: `Maximum ${MAX_ITEMS_PER_ORDER} different items per order` });
  }
  for (const item of items) {
    if (!item.id || !item.quantity || item.quantity < 1) {
      return res.status(400).json({ error: 'Invalid item in order' });
    }
    if (item.quantity > MAX_QTY_PER_ITEM) {
      return res.status(400).json({ error: `Maximum ${MAX_QTY_PER_ITEM} of each item` });
    }
  }

  let discount = 0;
  let fixedPrice = null;
  let couponId = null;

  // Validate coupon if provided
  if (couponCode) {
    try {
      const couponRes = await pool.query(
        `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND used = FALSE AND expires_at > NOW()`,
        [couponCode]
      );
      if (couponRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired coupon code' });
      }
      const coupon = couponRes.rows[0];
      discount = coupon.discount_percent || 0;
      fixedPrice = coupon.fixed_price;
      couponId = coupon.id;
    } catch (err) {
      console.error('Error validating coupon:', err);
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (name, location, "table", items, coupon_id, discount_percent, fixed_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, location, table, JSON.stringify(items), couponId, discount, fixedPrice]
    );

    // Mark coupon as used
    if (couponId) {
      await pool.query('UPDATE coupons SET used = TRUE WHERE id = $1', [couponId]);
    }

    const orderId = result.rows[0].id;

    // Send Telegram notification to baristas
    notifyTelegram(orderId, name, location, table, items);

    res.json({ orderId, discount, fixedPrice });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get single order by ID
app.get('/orders/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).json({ error: 'Not found' });

  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(formatOrder(result.rows[0]));
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Mark order as preparing
app.post('/orders/:id/preparing', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query(
      'UPDATE orders SET preparing = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Mark order as prepared/ready
app.post('/orders/:id/prepared', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query(
      'UPDATE orders SET prepared = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get all orders (for staff dashboard)
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC'
    );
    res.json(result.rows.map(formatOrder));
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders by customer name
app.get('/orders-by-name/:name', async (req, res) => {
  const name = req.params.name.toLowerCase();
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE LOWER(name) = $1 AND created_at > NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC',
      [name]
    );
    res.json(result.rows.map(formatOrder));
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Coffee coupon prices — per-item fixed prices when a coupon is applied
const COFFEE_COUPON_PRICES = {
  5: 2,     // Espresso: 2.5 → 2 DT
  6: 2.4,   // Cappuccino: 2.8 → 2.4 DT
  7: 2.5,   // Americano: 2.8 → 2.5 DT
  8: 2.5,   // Latte: 3 → 2.5 DT
  // 9 (Mocha) not included — stays at normal price
};

// Validate coupon (public — for order page)
app.get('/coupons/validate/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, client_name, discount_percent, fixed_price FROM coupons WHERE UPPER(code) = UPPER($1) AND used = FALSE AND expires_at > NOW()`,
      [req.params.code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired coupon' });
    res.json({ ...result.rows[0], applies_to: 'coffee_only', coffee_coupon_prices: COFFEE_COUPON_PRICES });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ==================== HAPPY HOUR PUBLIC ENDPOINT ====================
app.get('/happy-hour', (req, res) => {
  const { active, config } = isHappyHourActive();
  res.json({
    active,
    label: config.label,
    startHour: config.startHour,
    endHour: config.endHour,
    prices: active ? config.prices : {},
  });
});

// ==================== ADMIN HAPPY HOUR ====================
app.get('/admin/happy-hour', requireAdmin, (req, res) => {
  const config = loadHappyHour();
  const { active } = isHappyHourActive();
  res.json({ ...config, active });
});

app.put('/admin/happy-hour', requireAdmin, (req, res) => {
  const { enabled, startHour, endHour, prices, label } = req.body;
  const config = loadHappyHour();

  if (typeof enabled === 'boolean') config.enabled = enabled;
  if (startHour !== undefined) config.startHour = parseInt(startHour);
  if (endHour !== undefined) config.endHour = parseInt(endHour);
  if (prices && typeof prices === 'object') config.prices = prices;
  if (label) config.label = label;

  saveHappyHour(config);
  const { active } = isHappyHourActive();
  res.json({ success: true, ...config, active });
});

// ==================== ADMIN API ROUTES ====================

// Admin login check
app.post('/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) return res.json({ success: true });
  res.status(401).json({ error: 'Wrong PIN' });
});

// Get all coupons
app.get('/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Create coupon
app.post('/admin/coupons', requireAdmin, async (req, res) => {
  const { client_name, discount_percent, fixed_price, expires_days } = req.body;
  if (!client_name) return res.status(400).json({ error: 'Client name required' });

  // Generate unique code: GC-XXXX
  const code = 'GC-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const expiresDays = expires_days || 30;

  try {
    const result = await pool.query(
      `INSERT INTO coupons (code, client_name, discount_percent, fixed_price, expires_at) 
       VALUES ($1, $2, $3, $4, NOW() + $5::interval) RETURNING *`,
      [code, client_name, discount_percent || 0, fixed_price || null, `${expiresDays} days`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Delete coupon
app.delete('/admin/coupons/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Reports API
app.get('/admin/reports', requireAdmin, async (req, res) => {
  const { period } = req.query; // hourly, daily, weekly, monthly, yearly
  
  let interval, groupBy, dateFormat;
  switch (period) {
    case 'hourly':
      interval = "24 hours";
      groupBy = "date_trunc('hour', created_at)";
      dateFormat = "TO_CHAR(date_trunc('hour', created_at), 'HH24:00')";
      break;
    case 'weekly':
      interval = "7 days";
      groupBy = "DATE(created_at)";
      dateFormat = "TO_CHAR(DATE(created_at), 'Dy DD Mon')";
      break;
    case 'monthly':
      interval = "30 days";
      groupBy = "DATE(created_at)";
      dateFormat = "TO_CHAR(DATE(created_at), 'DD Mon')";
      break;
    case 'yearly':
      interval = "365 days";
      groupBy = "date_trunc('month', created_at)";
      dateFormat = "TO_CHAR(date_trunc('month', created_at), 'Mon YYYY')";
      break;
    default: // daily
      interval = "24 hours";
      groupBy = "date_trunc('hour', created_at)";
      dateFormat = "TO_CHAR(date_trunc('hour', created_at), 'HH24:00')";
  }

  try {
    // Summary stats
    const summary = await pool.query(
      `SELECT COUNT(*) as total_orders, 
              COALESCE(SUM(jsonb_array_length(items)), 0) as total_items
       FROM orders WHERE created_at > NOW() - $1::interval`,
      [interval]
    );

    // Orders over time
    const timeline = await pool.query(
      `SELECT ${dateFormat} as label, COUNT(*) as order_count
       FROM orders WHERE created_at > NOW() - $1::interval
       GROUP BY ${groupBy} ORDER BY ${groupBy}`,
      [interval]
    );

    // Top items (flatten JSONB items array)
    const topItems = await pool.query(
      `SELECT item->>'id' as item_id, SUM((item->>'quantity')::int) as total_qty
       FROM orders, jsonb_array_elements(items) as item
       WHERE created_at > NOW() - $1::interval
       GROUP BY item->>'id' ORDER BY total_qty DESC LIMIT 10`,
      [interval]
    );

    // Top customers
    const topCustomers = await pool.query(
      `SELECT name, COUNT(*) as order_count 
       FROM orders WHERE created_at > NOW() - $1::interval
       GROUP BY name ORDER BY order_count DESC LIMIT 10`,
      [interval]
    );

    res.json({
      period: period || 'daily',
      summary: summary.rows[0],
      timeline: timeline.rows,
      topItems: topItems.rows,
      topCustomers: topCustomers.rows,
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Menu management — update menu.json
app.get('/admin/menu', requireAdmin, async (req, res) => {
  try {
    const menuPath = path.join(__dirname, 'public', 'menu.json');
    const data = fs.readFileSync(menuPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read menu' });
  }
});

app.put('/admin/menu', requireAdmin, async (req, res) => {
  try {
    const menuPath = path.join(__dirname, 'public', 'menu.json');
    fs.writeFileSync(menuPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

// SPA catch-all: serve index.html for any non-API route (production)
if (fs.existsSync(distPath)) {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server after verifying DB connection
async function start() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Auto-create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        "table" VARCHAR(50) NOT NULL,
        items JSONB NOT NULL,
        preparing BOOLEAN DEFAULT FALSE,
        prepared BOOLEAN DEFAULT FALSE,
        coupon_id INTEGER,
        discount_percent NUMERIC DEFAULT 0,
        fixed_price NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        discount_percent NUMERIC DEFAULT 0,
        fixed_price NUMERIC,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // Add new columns if they don't exist (for existing DBs)
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS fixed_price NUMERIC;
    `).catch(() => {});

    client.release();

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`LAN access: http://${getLocalIP()}:${PORT}`);
      console.log(`Staff dashboard: http://localhost:${PORT}/staff`);
      console.log(`Order page: http://${getLocalIP()}:${PORT}/order`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    console.error('Make sure PostgreSQL is running and the database exists.');
    console.error(`Connection URL: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}`);
    process.exit(1);
  }
}

start();

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
