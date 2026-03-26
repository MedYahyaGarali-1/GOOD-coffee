import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { MenuCategory, MenuItem, CartItem, Order } from '../types';

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [table, setTable] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'tracking'>('order');

  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<Order | null>(null);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [trackingName, setTrackingName] = useState('');
  const [showForm, setShowForm] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    client_name: string;
    coffee_coupon_prices: Record<string, number>;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Espresso variant picker
  const [variantPicker, setVariantPicker] = useState<MenuItem | null>(null);

  // IDs that require a variant choice
  const ESPRESSO_IDS = [5, 25]; // Espresso & Iced Espresso
  const ESPRESSO_VARIANTS = ['Serrée', 'Normale', 'Allongée'];

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

  // Auto-refresh past orders when on tracking tab
  useEffect(() => {
    if (activeTab !== 'tracking' || trackingName.trim().length === 0) return;
    fetchPastOrders(trackingName.trim());
    const interval = setInterval(() => fetchPastOrders(trackingName.trim()), 5000);
    return () => clearInterval(interval);
  }, [activeTab, trackingName]);

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

  // Cart key = "id" or "id-variant"
  const cartKey = (id: number, variant?: string) => variant ? `${id}-${variant}` : `${id}`;

  const addToCart = (item: MenuItem, variant?: string) => {
    // If this is an espresso item and no variant chosen yet, show picker
    if (ESPRESSO_IDS.includes(item.id) && !variant) {
      setVariantPicker(item);
      return;
    }
    const key = cartKey(item.id, variant);
    setCart((prev) => {
      const existing = prev[key];
      if (existing) {
        return { ...prev, [key]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [key]: { ...item, quantity: 1, variant } };
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartEntries = Object.entries(cart);          // [key, CartItem][]
  const cartItems   = cartEntries.map(([, v]) => v); // CartItem[]

  // Total quantity of an item id across all variants (for grid badge)
  const totalQtyForId = (id: number) =>
    cartEntries.reduce((sum, [, v]) => (v.id === id ? sum + v.quantity : sum), 0);

  // Is an espresso item? (used to decide grid UX)
  const isEspresso = (id: number) => ESPRESSO_IDS.includes(id);

  // Calculate total with coffee-only coupon logic
  const getCouponPrice = (id: number): number | null => {
    if (!appliedCoupon) return null;
    const p = appliedCoupon.coffee_coupon_prices[String(id)];
    return p !== undefined ? p : null;
  };

  const getItemPrice = (item: CartItem) => {
    const couponPrice = getCouponPrice(item.id);
    return couponPrice !== null ? couponPrice : item.price;
  };

  const total = cartItems.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const totalWithoutCoupon = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const savings = totalWithoutCoupon - total;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch(`/coupons/validate/${encodeURIComponent(couponCode.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
        setCouponError('');
      }
    } catch {
      setCouponError('Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

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
          items: cartItems.map(({ id, quantity, variant }) => ({ id, quantity, ...(variant ? { variant } : {}) })),
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
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
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
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

      {/* Tab navigation */}
      <div className="order-tabs">
        <button
          className={`order-tab ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          <i className="fas fa-coffee" /> Order
        </button>
        <button
          className={`order-tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          <i className="fas fa-receipt" /> My Orders
        </button>
      </div>

      <div className="order-container">
        {activeTab === 'order' ? (
          <>
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

              {/* Menu */}
              <div className="card menu-card">
                <h2>
                  <i
                    className="fas fa-coffee"
                    style={{ marginRight: '1rem', color: '#c08a5d' }}
                  />
                  Menu
                </h2>

                {/* Category tabs — horizontal scroll */}
                <div className="category-tabs">
                  {menuItems.map((cat) => (
                    <button
                      key={cat.category}
                      className={`category-tab ${
                        openCategories[cat.category] ? 'active' : ''
                      }`}
                      onClick={() => {
                        // Toggle: if already open close it, otherwise open only this one
                        setOpenCategories((prev) => {
                          const isOpen = prev[cat.category];
                          // Close all, then open selected (or close if toggling off)
                          const next: Record<string, boolean> = {};
                          if (!isOpen) next[cat.category] = true;
                          return next;
                        });
                      }}
                    >
                      <span className="tab-icon">
                        {cat.category === 'Breakfast' && <i className="fas fa-egg" />}
                        {cat.category === 'Coffee & Espresso' && <i className="fas fa-mug-hot" />}
                        {cat.category === 'Tea Selection' && <i className="fas fa-leaf" />}
                        {cat.category === 'Pastry' && <i className="fas fa-cookie-bite" />}
                        {cat.category === 'Juices & Cold Drinks' && <i className="fas fa-glass-whiskey" />}
                        {cat.category === 'Iced Coffee' && <i className="fas fa-snowflake" />}
                        {cat.category === 'Water' && <i className="fas fa-tint" />}
                      </span>
                      {cat.category}
                    </button>
                  ))}
                </div>

                {/* Items for active category */}
                {menuItems.map((cat) =>
                  openCategories[cat.category] ? (
                    <div key={cat.category} className="menu-items-section">
                      <div className="menu-items-grid">
                        {cat.items.map((item) => {
                          const espresso = isEspresso(item.id);
                          const totalQty = espresso ? totalQtyForId(item.id) : 0;
                          const inCart = espresso ? totalQty > 0 : !!cart[cartKey(item.id)];
                          const simpleEntry = cart[cartKey(item.id)]; // for non-espresso qty
                          return (
                            <div
                              className={`menu-item ${inCart ? 'in-cart' : ''}`}
                              key={item.id}
                            >
                              <div className="menu-item-img-wrap">
                                <img src={item.image} alt={item.name} />
                                {inCart && (
                                  <span className="menu-item-cart-badge">
                                    {espresso ? totalQty : simpleEntry?.quantity}
                                  </span>
                                )}
                              </div>
                              <div className="menu-item-body">
                                <div className="menu-item-info">
                                  <strong>{item.name}</strong>
                                  {item.description && (
                                    <p className="menu-item-desc">{item.description}</p>
                                  )}
                                </div>
                                <div className="menu-item-footer">
                                  <span className="menu-item-price">
                                    {item.price.toFixed(1)} DT
                                  </span>
                                  {espresso ? (
                                    /* Espresso: always show add btn (opens variant picker) */
                                    <button
                                      className="menu-add-btn"
                                      onClick={() => addToCart(item)}
                                    >
                                      <i className="fas fa-plus" />
                                    </button>
                                  ) : inCart && simpleEntry ? (
                                    <div className="menu-item-qty-controls">
                                      <button
                                        className="qty-btn"
                                        onClick={() => removeFromCart(cartKey(item.id))}
                                      >
                                        −
                                      </button>
                                      <span className="qty-value">{simpleEntry.quantity}</span>
                                      <button
                                        className="qty-btn"
                                        onClick={() => addToCart(item)}
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="menu-add-btn"
                                      onClick={() => addToCart(item)}
                                    >
                                      <i className="fas fa-plus" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}

                {/* Prompt if nothing selected */}
                {Object.values(openCategories).every((v) => !v) && (
                  <div className="menu-empty-prompt">
                    <i className="fas fa-hand-pointer" />
                    <p>Select a category above to browse items</p>
                  </div>
                )}
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
                      {cartEntries.map(([key, item]) => {
                        const discounted = getCouponPrice(item.id) !== null;
                        const effectivePrice = getItemPrice(item);
                        return (
                        <div className="order-item" key={key}>
                          <div>
                            <span className="order-item-name">
                              {item.name}{item.variant ? ` — ${item.variant}` : ''}
                              {discounted && <span className="coupon-tag">☕ coupon</span>}
                            </span>
                            <span className="order-item-price">
                              {discounted && (
                                <span className="original-price">{(item.price * item.quantity).toFixed(2)}</span>
                              )}
                              {(effectivePrice * item.quantity).toFixed(2)} DT
                            </span>
                          </div>
                          <div className="item-controls">
                            <button onClick={() => removeFromCart(key)}>−</button>
                            <span className="item-qty">{item.quantity}</span>
                            <button onClick={() => addToCart(item, item.variant)}>+</button>
                          </div>
                        </div>
                        );
                      })}

                      {/* Coupon input */}
                      <div className="coupon-section">
                        {appliedCoupon ? (
                          <div className="coupon-applied">
                            <div className="coupon-applied-info">
                              <i className="fas fa-tag" />
                              <span>☕ <strong>{appliedCoupon.code}</strong> — Special coffee prices applied</span>
                            </div>
                            <button className="coupon-remove-btn" onClick={removeCoupon}>
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        ) : (
                          <div className="coupon-input-row">
                            <input
                              type="text"
                              placeholder="Coupon code"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                            />
                            <button
                              className="coupon-apply-btn"
                              onClick={applyCoupon}
                              disabled={couponLoading || !couponCode.trim()}
                            >
                              {couponLoading ? <i className="fas fa-spinner fa-spin" /> : 'Apply'}
                            </button>
                          </div>
                        )}
                        {couponError && <p className="coupon-error">{couponError}</p>}
                      </div>

                      {savings > 0 && (
                        <div className="cart-savings">
                          <i className="fas fa-piggy-bank" /> You save {savings.toFixed(2)} DT with coupon!
                        </div>
                      )}

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
                    {orderStatus.items.map((i, idx) => {
                      const menuItem = findMenuItem(i.id);
                      return (
                        <li key={`${i.id}-${i.variant || idx}`}>
                          {menuItem ? menuItem.name : 'Unknown'}{i.variant ? ` (${i.variant})` : ''} × {i.quantity || 1}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="status-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setTrackingName(name.trim());
                    setActiveTab('tracking');
                    fetchPastOrders(name.trim());
                  }}
                >
                  <i className="fas fa-history" /> View All My Orders
                </button>
                <button className="btn-primary" onClick={handleNewOrder}>
                  <i className="fas fa-plus" /> Make Another Order
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        ) : (
          /* ==================== MY ORDERS / TRACKING TAB ==================== */
          <div className="tracking-section">
            <div className="card">
              <h2>
                <i className="fas fa-receipt" style={{ marginRight: '1rem', color: '#c08a5d' }} />
                Track Your Orders
              </h2>
              <p style={{ fontSize: '1.4rem', color: '#888', marginBottom: '1.5rem' }}>
                Enter your name to see your orders and their status
              </p>
              <div className="tracking-search">
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={trackingName}
                  onChange={(e) => setTrackingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && trackingName.trim()) {
                      fetchPastOrders(trackingName.trim());
                    }
                  }}
                />
                <button
                  className="btn-primary"
                  onClick={() => fetchPastOrders(trackingName.trim())}
                  disabled={!trackingName.trim()}
                >
                  <i className="fas fa-search" /> Search
                </button>
              </div>
            </div>

            {pastOrders.length > 0 ? (
              <div className="tracking-orders">
                {pastOrders.map((order) => (
                  <div className="card tracking-order-card" key={order.id}>
                    <div className="tracking-order-header">
                      <div>
                        <h3>Order #{order.id}</h3>
                        <p className="tracking-order-meta">
                          📍 {order.location} · Table {order.table} · {order.elapsedMinutes} min ago
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="tracking-order-items">
                      {order.items.map((item, idx) => {
                        const menuItem = findMenuItem(item.id);
                        return (
                          <div className="tracking-item" key={`${item.id}-${item.variant || idx}`}>
                            <span>{menuItem ? menuItem.name : `Item #${item.id}`}{item.variant ? ` (${item.variant})` : ''}</span>
                            <span>× {item.quantity || 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="tracking-order-progress">
                      <div className={`progress-step ${['In List', 'Preparing', 'Ready'].includes(order.status) ? 'active' : ''}`}>
                        <i className="fas fa-clipboard-list" />
                        <span>In List</span>
                      </div>
                      <div className="progress-line" />
                      <div className={`progress-step ${['Preparing', 'Ready'].includes(order.status) ? 'active' : ''}`}>
                        <i className="fas fa-fire" />
                        <span>Preparing</span>
                      </div>
                      <div className="progress-line" />
                      <div className={`progress-step ${order.status === 'Ready' ? 'active' : ''}`}>
                        <i className="fas fa-check-circle" />
                        <span>Ready</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trackingName.trim() ? (
              <div className="card tracking-empty">
                <i className="fas fa-search" style={{ fontSize: '4rem', color: '#e2d6cf', marginBottom: '1rem' }} />
                <h3>No Orders Found</h3>
                <p>No orders found for "{trackingName}". Make sure you use the same name you ordered with.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Espresso Variant Picker Modal */}
      {variantPicker && (
        <div className="variant-overlay" onClick={() => setVariantPicker(null)}>
          <div className="variant-modal" onClick={(e) => e.stopPropagation()}>
            <button className="variant-close" onClick={() => setVariantPicker(null)}>
              <i className="fas fa-times" />
            </button>
            <div className="variant-header">
              <img src={variantPicker.image} alt={variantPicker.name} className="variant-img" />
              <h3>{variantPicker.name}</h3>
              <p>Choose your espresso style</p>
            </div>
            <div className="variant-options">
              {ESPRESSO_VARIANTS.map((v) => (
                <button
                  key={v}
                  className="variant-btn"
                  onClick={() => {
                    addToCart(variantPicker, v);
                    setVariantPicker(null);
                  }}
                >
                  <span className="variant-name">{v}</span>
                  <span className="variant-desc">
                    {v === 'Serrée' && 'Strong & short'}
                    {v === 'Normale' && 'Classic balance'}
                    {v === 'Allongée' && 'Longer & lighter'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
