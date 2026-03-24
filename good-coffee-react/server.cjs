const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Serve menu.json from public folder
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3001;

// In-memory orders store
let orders = [];
let nextOrderId = 1;

// API endpoint: place order
app.post('/orders', (req, res) => {
  const { name, location, table, items } = req.body;
  if (!name || !location || !table || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing order info" });
  }
  const order = {
    id: nextOrderId++,
    name,
    location,
    table,
    items,
    timestamp: new Date().toISOString(),
  };
  orders.push(order);
  res.json({ orderId: order.id });
});

// API endpoint: get order status by id
app.get('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);

  // Handle the "prepared" route
  if (req.params.id === 'prepared') return res.status(404).json({ error: "Not found" });

  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const orderTime = new Date(order.timestamp);
  const now = new Date();
  const diffMinutes = (now - orderTime) / 60000;

  let status = "";
  if (order.prepared) {
    status = "Ready";
  } else if (order.preparing) {
    status = "Preparing";
  } else if (diffMinutes < 2) {
    status = "In List";
  } else if (diffMinutes < 7) {
    status = "Preparing";
  } else {
    status = "Ready";
  }

  res.json({
    id: order.id,
    name: order.name,
    location: order.location,
    table: order.table,
    items: order.items,
    status,
    elapsedMinutes: diffMinutes.toFixed(1),
  });
});

// Mark order as preparing
app.post('/orders/:id/preparing', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.preparing = true;
  res.json({ success: true });
});

// Mark order as prepared/ready
app.post('/orders/:id/prepared', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.prepared = true;
  res.json({ success: true });
});

// API endpoint to get all orders with statuses
app.get('/orders', (req, res) => {
  const now = new Date();

  const ordersWithStatus = orders.map(order => {
    const orderTime = new Date(order.timestamp);
    const diffMinutes = (now - orderTime) / 60000;
    let status = "";
    if (order.prepared) {
      status = "Ready";
    } else if (order.preparing) {
      status = "Preparing";
    } else if (diffMinutes < 2) {
      status = "In List";
    } else if (diffMinutes < 7) {
      status = "Preparing";
    } else {
      status = "Ready";
    }

    return {
      id: order.id,
      name: order.name,
      location: order.location,
      table: order.table,
      items: order.items,
      status,
      elapsedMinutes: diffMinutes.toFixed(1),
      timestamp: order.timestamp
    };
  });

  res.json(ordersWithStatus);
});

// Get all orders by customer name (case insensitive)
app.get('/orders-by-name/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const now = new Date();

  const filteredOrders = orders.filter(order => order.name.toLowerCase() === name);

  const ordersWithStatus = filteredOrders.map(order => {
    const orderTime = new Date(order.timestamp);
    const diffMinutes = (now - orderTime) / 60000;
    let status = "";
    if (order.prepared) {
      status = "Ready";
    } else if (order.preparing) {
      status = "Preparing";
    } else if (diffMinutes < 2) {
      status = "In List";
    } else if (diffMinutes < 7) {
      status = "Preparing";
    } else {
      status = "Ready";
    }

    return {
      id: order.id,
      location: order.location,
      table: order.table,
      items: order.items,
      status,
      elapsedMinutes: diffMinutes.toFixed(1),
      timestamp: order.timestamp
    };
  });

  res.json(ordersWithStatus);
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
