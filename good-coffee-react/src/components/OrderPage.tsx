import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { MenuCategory, MenuItem, CartItem, Order } from '../types';

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [table, setTable] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(true);

  // Fetch menu on mount — open first category by default
  useEffect(() => {
    fetch('/menu.json')
      .then((res) => res.json())
      .then((data: MenuCategory[]) => {
        setMenuItems(data);
        if (data.length > 0) {
          setOpenCategories({ [data[0].category]: true });
        }
      })
      .catch(() => alert('Failed to load menu'));
  }, []);

  // Auto-fetch past orders when name changes
  useEffect(() => {
    if (name.trim().length === 0) {
      setPastOrders([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetchPastOrders(name.trim());
    }, 500);
    return () => clearTimeout(timeout);
  }, [name]);

  // Poll order status
  useEffect(() => {
    if (orderId === null) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/orders/${orderId}`);
        const data = await res.json();
        if (res.ok) setOrderStatus(data);
      } catch {
        /* ignore */
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchPastOrders = async (customerName: string) => {
    try {
      const res = await fetch(`/orders-by-name/${encodeURIComponent(customerName)}`);
      const data = await res.json();
      setPastOrders(data);
    } catch {
      /* ignore */
    }
  };

  const findMenuItem = useCallback(
    (id: number): MenuItem | undefined => {
      for (const cat of menuItems) {
        const found = cat.items.find((item) => item.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [menuItems]
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [item.id]: { ...item, quantity: 1 } };
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async () => {
    if (!name.trim() || !location || !table.trim()) {
      alert('Please fill all your info.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Please add at least one menu item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location,
          table: table.trim(),
          items: cartItems.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderId(data.orderId);
        setShowForm(false);
      } else {
        alert(data.error || 'Order failed');
      }
    } catch {
      alert('Error submitting order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setCart({});
    setOrderId(null);
    setOrderStatus(null);
    setShowForm(true);
  };

  const getStatusBadge = (status: string) => {
    const cls =
      status === 'In List' ? 'in-list' : status === 'Preparing' ? 'preparing' : 'ready';
    return <span className={`status-badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="order-section">
      {/* Hero banner */}
      <div className="order-hero">
        <div className="order-hero-content">
          <h1>Order Your Coffee</h1>
          <p>Pick your favorites, we'll have them ready in minutes</p>
          <Link to="/" className="order-hero-link">
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="order-container">
        {showForm ? (
          <div className="order-layout">
            {/* LEFT — Menu & Form */}
            <div className="order-main">
              {/* Customer info card */}
              <div className="card">
                <h2>
                  <i
                    className="fas fa-user"
                    style={{ marginRight: '1rem', color: '#c08a5d' }}
                  />
                  Your Details
                </h2>
                <div className="order-form-grid">
                  <div className="form-group">
                    <label htmlFor="order-name">Name</label>
                    <input
                      id="order-name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="order-location">Location</label>
                    <select
                      id="order-location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    >
                      <option value="">Select location</option>
                      <option value="Inside">Inside</option>
                      <option value="Outside">Outside</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="order-table">Table Number</label>
                    <input
                      id="order-table"
                      type="number"
                      min={1}
                      placeholder="Table number"
                      value={table}
                      onChange={(e) => setTable(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Past orders */}
              {pastOrders.length > 0 && (
                <div className="card">
                  <h3>
                    <i
                      className="fas fa-history"
                      style={{ marginRight: '1rem', color: '#c08a5d' }}
                    />
                    Your Past Orders
                  </h3>
                  {pastOrders.slice(0, 2).map((order) => (
                    <div className="past-order" key={order.id}>
                      <p>
                        <strong>Order #{order.id}</strong> —{' '}
                        {getStatusBadge(order.status)}
                      </p>
                      <p>📍 {order.location} · Table {order.table}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Menu */}
              <div className="card">
                <h2>
                  <i
                    className="fas fa-coffee"
                    style={{ marginRight: '1rem', color: '#c08a5d' }}
                  />
                  Menu
                </h2>
                {menuItems.map((cat) => (
                  <div key={cat.category} className="menu-category">
                    <div
                      className={`category-title ${
                        openCategories[cat.category] ? 'open' : ''
                      }`}
                      onClick={() => toggleCategory(cat.category)}
                    >
                      {cat.category}
                    </div>
                    {openCategories[cat.category] && (
                      <div className="menu-items-grid">
                        {cat.items.map((item) => (
                          <div className="menu-item" key={item.id}>
                            <img src={item.image} alt={item.name} />
                            <div className="menu-item-info">
                              <strong>{item.name}</strong>
                              <span className="menu-item-price">
                                {item.price.toFixed(2)} DT
                              </span>
                            </div>
                            <button onClick={() => addToCart(item)}>
                              <i className="fas fa-plus" /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Sticky Cart */}
            <div className="order-sidebar">
              <div className="card cart-card">
                <h2>
                  <i
                    className="fas fa-shopping-cart"
                    style={{ marginRight: '1rem', color: '#c08a5d' }}
                  />
                  Cart{' '}
                  {itemCount > 0 && (
                    <span className="cart-badge">{itemCount}</span>
                  )}
                </h2>
                <div className="order-list">
                  {cartItems.length === 0 ? (
                    <div className="cart-empty">
                      <i
                        className="fas fa-coffee"
                        style={{
                          fontSize: '4rem',
                          color: '#e2d6cf',
                          marginBottom: '1rem',
                        }}
                      />
                      <p>Your cart is empty</p>
                      <p style={{ fontSize: '1.2rem', color: '#999' }}>
                        Add items from the menu
                      </p>
                    </div>
                  ) : (
                    <>
                      {cartItems.map((item) => (
                        <div className="order-item" key={item.id}>
                          <div>
                            <span className="order-item-name">{item.name}</span>
                            <span className="order-item-price">
                              {(item.price * item.quantity).toFixed(2)} DT
                            </span>
                          </div>
                          <div className="item-controls">
                            <button onClick={() => removeFromCart(item.id)}>−</button>
                            <span className="item-qty">{item.quantity}</span>
                            <button onClick={() => addToCart(item)}>+</button>
                          </div>
                        </div>
                      ))}
                      <div className="order-total">
                        <span>Total</span>
                        <span>{total.toFixed(2)} DT</span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="btn-primary btn-place-order"
                  onClick={handleSubmit}
                  disabled={submitting || cartItems.length === 0}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> Placing Order...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check" /> Place Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="order-status-page">
            <div className="card">
              <div className="status-header">
                <i
                  className="fas fa-check-circle"
                  style={{ fontSize: '5rem', color: '#27ae60' }}
                />
                <h2>Order Placed Successfully!</h2>
                <p style={{ fontSize: '1.5rem', color: '#888' }}>
                  Order #{orderId}
                </p>
              </div>

              {orderStatus && (
                <div className="status-box">
                  <div className="status-grid">
                    <div className="status-info-item">
                      <i className="fas fa-user" />
                      <div>
                        <small>Name</small>
                        <p>{orderStatus.name}</p>
                      </div>
                    </div>
                    <div className="status-info-item">
                      <i className="fas fa-map-marker-alt" />
                      <div>
                        <small>Location</small>
                        <p>{orderStatus.location}</p>
                      </div>
                    </div>
                    <div className="status-info-item">
                      <i className="fas fa-chair" />
                      <div>
                        <small>Table</small>
                        <p>{orderStatus.table}</p>
                      </div>
                    </div>
                    <div className="status-info-item">
                      <i className="fas fa-clock" />
                      <div>
                        <small>Elapsed</small>
                        <p>{orderStatus.elapsedMinutes} min</p>
                      </div>
                    </div>
                  </div>
                  <div className="status-current">
                    <span>Status:</span> {getStatusBadge(orderStatus.status)}
                  </div>
                  <h3 style={{ marginTop: '1.5rem' }}>Items:</h3>
                  <ul>
                    {orderStatus.items.map((i) => {
                      const menuItem = findMenuItem(i.id);
                      return (
                        <li key={i.id}>
                          {menuItem ? menuItem.name : 'Unknown'} × {i.quantity || 1}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="status-actions">
                <button
                  className="btn-secondary"
                  onClick={() => fetchPastOrders(name.trim())}
                >
                  <i className="fas fa-history" /> View All My Orders
                </button>
                <button className="btn-primary" onClick={handleNewOrder}>
                  <i className="fas fa-plus" /> Make Another Order
                </button>
              </div>

              {pastOrders.length > 0 && (
                <div className="past-orders-section">
                  <h3>Your Past Orders</h3>
                  {pastOrders.map((order) => (
                    <div className="past-order" key={order.id}>
                      <p>
                        <strong>Order #{order.id}</strong> —{' '}
                        {getStatusBadge(order.status)}
                      </p>
                      <p>
                        📍 {order.location} · Table {order.table} ·{' '}
                        {order.elapsedMinutes} min
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
