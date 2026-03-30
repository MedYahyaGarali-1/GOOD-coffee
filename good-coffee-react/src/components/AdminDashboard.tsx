import { useState, useEffect, useCallback } from 'react';
import type { Coupon, MenuCategory, MenuItem } from '../types';

interface ReportData {
  period: string;
  summary: { total_orders: string; total_items: string };
  timeline: { label: string; order_count: string }[];
  topItems: { item_id: string; total_qty: string }[];
  topCustomers: { name: string; order_count: string }[];
}

type Tab = 'reports' | 'coupons' | 'menu' | 'happyhour';

interface HappyHourConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  prices: Record<string, number>;
  label: string;
  active: boolean;
}

export default function AdminDashboard() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<Tab>('reports');

  // Reports
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCoupon, setNewCoupon] = useState({ client_name: '', expires_days: 30 });

  // Menu
  const [editMenu, setEditMenu] = useState<MenuCategory[] | null>(null);
  const [menuSaved, setMenuSaved] = useState(false);

  // Happy Hour
  const [happyHour, setHappyHour] = useState<HappyHourConfig | null>(null);
  const [hhSaved, setHhSaved] = useState(false);

  // Menu item lookup for reports
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);

  const headers = useCallback(
    () => ({ 'x-admin-pin': pin, 'Content-Type': 'application/json' }),
    [pin]
  );

  // Login
  const handleLogin = async () => {
    setAuthError('');
    try {
      const res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        setAuthError('Wrong PIN');
      }
    } catch {
      setAuthError('Server unreachable');
    }
  };

  // Fetch menu items for name lookups
  useEffect(() => {
    fetch('/menu.json')
      .then((r) => r.json())
      .then((data: MenuCategory[]) => setMenuItems(data))
      .catch(() => {});
  }, []);

  const findMenuItemName = useCallback(
    (id: string): string => {
      for (const cat of menuItems) {
        const found = cat.items.find((i) => String(i.id) === id);
        if (found) return found.name;
      }
      return `Item #${id}`;
    },
    [menuItems]
  );

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`/admin/reports?period=${reportPeriod}`, { headers: headers() });
      if (res.ok) setReportData(await res.json());
    } catch {
      /* ignore */
    }
  }, [reportPeriod, headers]);

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/admin/coupons', { headers: headers() });
      if (res.ok) setCoupons(await res.json());
    } catch {
      /* ignore */
    }
  }, [headers]);

  // Fetch menu for editing
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/admin/menu', { headers: headers() });
      if (res.ok) setEditMenu(await res.json());
    } catch {
      /* ignore */
    }
  }, [headers]);

  // Fetch happy hour config
  const fetchHappyHour = useCallback(async () => {
    try {
      const res = await fetch('/admin/happy-hour', { headers: headers() });
      if (res.ok) setHappyHour(await res.json());
    } catch {
      /* ignore */
    }
  }, [headers]);

  // Auto-fetch on tab change
  useEffect(() => {
    if (!authenticated) return;
    if (tab === 'reports') fetchReports();
    if (tab === 'coupons') fetchCoupons();
    if (tab === 'menu') fetchMenu();
    if (tab === 'happyhour') fetchHappyHour();
  }, [authenticated, tab, fetchReports, fetchCoupons, fetchMenu, fetchHappyHour]);

  // Create coupon
  const createCoupon = async () => {
    if (!newCoupon.client_name.trim()) return;
    try {
      const res = await fetch('/admin/coupons', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(newCoupon),
      });
      if (res.ok) {
        setNewCoupon({ client_name: '', expires_days: 30 });
        fetchCoupons();
      }
    } catch {
      /* ignore */
    }
  };

  // Delete coupon
  const deleteCoupon = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await fetch(`/admin/coupons/${id}`, { method: 'DELETE', headers: headers() });
      fetchCoupons();
    } catch {
      /* ignore */
    }
  };

  // Save menu
  const saveMenu = async () => {
    if (!editMenu) return;
    try {
      const res = await fetch('/admin/menu', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(editMenu),
      });
      if (res.ok) {
        setMenuSaved(true);
        setTimeout(() => setMenuSaved(false), 3000);
      }
    } catch {
      /* ignore */
    }
  };

  // Save happy hour config
  const saveHappyHour = async (updates: Partial<HappyHourConfig>) => {
    try {
      const res = await fetch('/admin/happy-hour', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setHappyHour(await res.json());
        setHhSaved(true);
        setTimeout(() => setHhSaved(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  // Update happy hour price for an item
  const updateHHPrice = (itemId: string, price: number) => {
    if (!happyHour) return;
    const newPrices = { ...happyHour.prices, [itemId]: price };
    setHappyHour({ ...happyHour, prices: newPrices });
  };

  // Remove happy hour price for an item
  const removeHHPrice = (itemId: string) => {
    if (!happyHour) return;
    const newPrices = { ...happyHour.prices };
    delete newPrices[itemId];
    setHappyHour({ ...happyHour, prices: newPrices });
  };

  // Add new item to happy hour
  const [newHHItemId, setNewHHItemId] = useState('');
  const [newHHItemPrice, setNewHHItemPrice] = useState('');

  // Update a menu item field
  const updateMenuItem = (catIdx: number, itemIdx: number, field: keyof MenuItem, value: string | number) => {
    if (!editMenu) return;
    const updated = editMenu.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return {
        ...cat,
        items: cat.items.map((item, ii) => {
          if (ii !== itemIdx) return item;
          return { ...item, [field]: field === 'price' ? parseFloat(String(value)) || 0 : value };
        }),
      };
    });
    setEditMenu(updated);
  };

  // Add item to a category
  const addMenuItem = (catIdx: number) => {
    if (!editMenu) return;
    const maxId = editMenu.flatMap((c) => c.items).reduce((max, i) => Math.max(max, i.id), 0);
    const updated = editMenu.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return {
        ...cat,
        items: [
          ...cat.items,
          { id: maxId + 1, name: 'New Item', price: 0, image: '', description: '' },
        ],
      };
    });
    setEditMenu(updated);
  };

  // Remove item from a category
  const removeMenuItem = (catIdx: number, itemIdx: number) => {
    if (!editMenu) return;
    const updated = editMenu.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) };
    });
    setEditMenu(updated);
  };

  // ==================== LOGIN ====================
  if (!authenticated) {
    return (
      <div className="admin-section">
        <div className="admin-login">
          <div className="admin-login-card">
            <h2>
              <i className="fas fa-lock" style={{ marginRight: '1rem', color: '#c08a5d' }} />
              Admin Access
            </h2>
            <p>Enter admin PIN to continue</p>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
              placeholder="••••"
              autoFocus
            />
            {authError && <p className="admin-error">{authError}</p>}
            <button className="btn-primary" onClick={handleLogin} style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fas fa-sign-in-alt" /> Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== DASHBOARD ====================
  return (
    <div className="admin-section">
      <div className="admin-header">
        <h1>
          <i className="fas fa-cog" /> Admin Dashboard
        </h1>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          <i className="fas fa-chart-bar" /> Reports
        </button>
        <button className={`admin-tab ${tab === 'coupons' ? 'active' : ''}`} onClick={() => setTab('coupons')}>
          <i className="fas fa-ticket-alt" /> Coupons
        </button>
        <button className={`admin-tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
          <i className="fas fa-utensils" /> Menu
        </button>
        <button className={`admin-tab ${tab === 'happyhour' ? 'active' : ''}`} onClick={() => setTab('happyhour')}>
          <i className="fas fa-sun" /> Happy Hour
        </button>
      </div>

      <div className="admin-content">
        {/* ==================== REPORTS ==================== */}
        {tab === 'reports' && (
          <>
            {/* Period selector */}
            <div className="period-selector">
              {['hourly', 'daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                <button
                  key={p}
                  className={`period-btn ${reportPeriod === p ? 'active' : ''}`}
                  onClick={() => setReportPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {reportData ? (
              <>
                {/* Summary stats */}
                <div className="report-summary">
                  <div className="report-stat">
                    <i className="fas fa-shopping-bag" />
                    <div>
                      <span className="report-stat-number">{reportData.summary.total_orders}</span>
                      <span className="report-stat-label">Orders</span>
                    </div>
                  </div>
                  <div className="report-stat">
                    <i className="fas fa-coffee" />
                    <div>
                      <span className="report-stat-number">{reportData.summary.total_items}</span>
                      <span className="report-stat-label">Items Sold</span>
                    </div>
                  </div>
                </div>

                {/* Bar chart — orders over time */}
                {reportData.timeline.length > 0 && (
                  <div className="report-card">
                    <h3>
                      <i className="fas fa-chart-bar" /> Orders Over Time
                    </h3>
                    <div className="report-chart">
                      {(() => {
                        const maxCount = Math.max(...reportData.timeline.map((t) => parseInt(t.order_count) || 1));
                        return reportData.timeline.map((t, i) => (
                          <div className="chart-bar-wrap" key={i}>
                            <span className="chart-value">{t.order_count}</span>
                            <div
                              className="chart-bar"
                              style={{ height: `${(parseInt(t.order_count) / maxCount) * 100}%` }}
                            />
                            <span className="chart-label">{t.label}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Top items */}
                {reportData.topItems.length > 0 && (
                  <div className="report-card">
                    <h3>
                      <i className="fas fa-fire" /> Top Items
                    </h3>
                    <div className="report-list">
                      {reportData.topItems.map((item, i) => (
                        <div className="report-list-item" key={i}>
                          <span className="report-rank">#{i + 1}</span>
                          <span className="report-item-name">{findMenuItemName(item.item_id)}</span>
                          <span className="report-item-qty">{item.total_qty} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top customers */}
                {reportData.topCustomers.length > 0 && (
                  <div className="report-card">
                    <h3>
                      <i className="fas fa-users" /> Top Customers
                    </h3>
                    <div className="report-list">
                      {reportData.topCustomers.map((c, i) => (
                        <div className="report-list-item" key={i}>
                          <span className="report-rank">#{i + 1}</span>
                          <span className="report-item-name">{c.name}</span>
                          <span className="report-item-qty">{c.order_count} orders</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="admin-empty">
                <i className="fas fa-spinner fa-spin" />
                <h3>Loading reports...</h3>
              </div>
            )}
          </>
        )}

        {/* ==================== COUPONS ==================== */}
        {tab === 'coupons' && (
          <>
            <div className="report-card">
              <h3>
                <i className="fas fa-plus-circle" /> Create Coffee Coupon
              </h3>
              <p style={{ color: '#aaa', fontSize: '1.3rem', marginBottom: '1.5rem' }}>
                ☕ Coupons unlock special coffee prices: Espresso 2DT · Cappuccino 2.4DT · Americano 2.5DT · Latte 2.5DT
              </p>
              <div className="coupon-form-grid">
                <div className="form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmed"
                    value={newCoupon.client_name}
                    onChange={(e) => setNewCoupon({ ...newCoupon, client_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Expires In (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={newCoupon.expires_days}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={createCoupon}
                disabled={!newCoupon.client_name.trim()}
                style={{ marginTop: '1.5rem' }}
              >
                <i className="fas fa-plus" /> Create Coupon
              </button>
            </div>

            {/* Coupons list */}
            <div className="coupons-list">
              {coupons.length === 0 ? (
                <div className="admin-empty">
                  <i className="fas fa-ticket-alt" />
                  <h3>No Coupons Yet</h3>
                  <p>Create your first coffee coupon above.</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div className={`coupon-card ${coupon.used ? 'used' : ''}`} key={coupon.id}>
                    <div className="coupon-code">{coupon.code}</div>
                    <div className="coupon-details">
                      <p>
                        <strong>{coupon.client_name}</strong>
                      </p>
                      <p>☕ Special coffee prices unlocked</p>
                      <p className="coupon-meta">
                        {coupon.used ? '❌ Used' : '✅ Active'} · Expires{' '}
                        {new Date(coupon.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="coupon-delete" onClick={() => deleteCoupon(coupon.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ==================== MENU ==================== */}
        {tab === 'menu' && editMenu && (
          <>
            <div className="admin-menu-actions">
              <button className="btn-primary" onClick={saveMenu}>
                <i className="fas fa-save" /> {menuSaved ? 'Saved ✓' : 'Save Menu'}
              </button>
            </div>

            {editMenu.map((cat, catIdx) => (
              <div className="report-card" key={catIdx}>
                <h3>
                  <i className="fas fa-tag" /> {cat.category}
                  <button className="add-item-btn" onClick={() => addMenuItem(catIdx)}>
                    <i className="fas fa-plus" /> Add Item
                  </button>
                </h3>
                <div className="menu-edit-list">
                  {cat.items.map((item, itemIdx) => (
                    <div className="menu-edit-item" key={item.id}>
                      <div className="menu-edit-fields">
                        <input
                          value={item.name}
                          onChange={(e) => updateMenuItem(catIdx, itemIdx, 'name', e.target.value)}
                          placeholder="Name"
                          style={{ minWidth: '15rem' }}
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateMenuItem(catIdx, itemIdx, 'price', e.target.value)}
                          placeholder="Price"
                          style={{ maxWidth: '10rem' }}
                          step="0.1"
                        />
                        <input
                          value={item.description || ''}
                          onChange={(e) => updateMenuItem(catIdx, itemIdx, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <input
                          value={item.image}
                          onChange={(e) => updateMenuItem(catIdx, itemIdx, 'image', e.target.value)}
                          placeholder="Image path"
                        />
                      </div>
                      <button className="coupon-delete" onClick={() => removeMenuItem(catIdx, itemIdx)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ==================== HAPPY HOUR ==================== */}
        {tab === 'happyhour' && happyHour && (
          <>
            {/* Status banner */}
            <div className={`report-card hh-status-card ${happyHour.active ? 'hh-active' : ''}`}>
              <div className="hh-status-header">
                <div>
                  <h3>
                    <i className="fas fa-sun" /> {happyHour.label || 'Happy Hour'}
                  </h3>
                  <p className="hh-status-text">
                    {happyHour.active
                      ? '🟢 Currently ACTIVE — discounted prices are live!'
                      : happyHour.enabled
                      ? `⏰ Scheduled: ${happyHour.startHour}:00 – ${happyHour.endHour}:00`
                      : '🔴 Disabled'}
                  </p>
                </div>
                <label className="hh-toggle">
                  <input
                    type="checkbox"
                    checked={happyHour.enabled}
                    onChange={(e) => saveHappyHour({ ...happyHour, enabled: e.target.checked })}
                  />
                  <span className="hh-toggle-slider" />
                </label>
              </div>
            </div>

            {/* Schedule */}
            <div className="report-card">
              <h3><i className="fas fa-clock" /> Schedule</h3>
              <div className="hh-schedule-row">
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    value={happyHour.label}
                    onChange={(e) => setHappyHour({ ...happyHour, label: e.target.value })}
                    placeholder="e.g. Happy Hour ☀️"
                  />
                </div>
                <div className="form-group">
                  <label>Start Hour</label>
                  <select
                    value={happyHour.startHour}
                    onChange={(e) => setHappyHour({ ...happyHour, startHour: parseInt(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>End Hour</label>
                  <select
                    value={happyHour.endHour}
                    onChange={(e) => setHappyHour({ ...happyHour, endHour: parseInt(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => saveHappyHour(happyHour)}
                style={{ marginTop: '1.5rem' }}
              >
                <i className="fas fa-save" /> {hhSaved ? 'Saved ✓' : 'Save Schedule'}
              </button>
            </div>

            {/* Prices */}
            <div className="report-card">
              <h3><i className="fas fa-tags" /> Happy Hour Prices</h3>
              <p style={{ color: '#999', fontSize: '1.3rem', marginBottom: '1.5rem' }}>
                Set discounted prices for items during happy hour. Only listed items get discounted.
              </p>

              {Object.entries(happyHour.prices).length > 0 ? (
                <div className="hh-prices-list">
                  {Object.entries(happyHour.prices).map(([itemId, price]) => (
                    <div className="hh-price-row" key={itemId}>
                      <span className="hh-item-name">{findMenuItemName(itemId)}</span>
                      <div className="hh-price-input">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={price}
                          onChange={(e) => updateHHPrice(itemId, parseFloat(e.target.value) || 0)}
                        />
                        <span>DT</span>
                      </div>
                      <button className="coupon-delete" onClick={() => removeHHPrice(itemId)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#ccc', fontStyle: 'italic', marginBottom: '1.5rem' }}>No items yet — add one below.</p>
              )}

              {/* Add item to happy hour */}
              <div className="hh-add-row">
                <select
                  value={newHHItemId}
                  onChange={(e) => setNewHHItemId(e.target.value)}
                >
                  <option value="">Select item...</option>
                  {menuItems.flatMap((cat) =>
                    cat.items
                      .filter((item) => !happyHour.prices[String(item.id)])
                      .map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name} ({item.price} DT)
                        </option>
                      ))
                  )}
                </select>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Price"
                  value={newHHItemPrice}
                  onChange={(e) => setNewHHItemPrice(e.target.value)}
                  style={{ maxWidth: '10rem' }}
                />
                <button
                  className="btn-primary"
                  disabled={!newHHItemId || !newHHItemPrice}
                  onClick={() => {
                    updateHHPrice(newHHItemId, parseFloat(newHHItemPrice));
                    setNewHHItemId('');
                    setNewHHItemPrice('');
                  }}
                >
                  <i className="fas fa-plus" /> Add
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={() => saveHappyHour({ prices: happyHour.prices })}
                style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}
              >
                <i className="fas fa-save" /> {hhSaved ? 'Saved ✓' : 'Save Prices'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
