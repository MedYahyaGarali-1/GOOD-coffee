import { useState, useEffect, useCallback, useRef } from 'react';
import type { MenuCategory, MenuItem, Order } from '../types';

type FilterTab = 'all' | 'In List' | 'Preparing' | 'Ready';

export default function StaffDashboard() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const knownOrderIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send a Windows toast notification
  const sendWindowsNotification = useCallback((order: Order, itemNames: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(`🔔 New Order #${order.id}`, {
        body: `${order.name} · ${order.location} · Table ${order.table}\n${itemNames}`,
        icon: '/logo4.png',
        tag: `order-${order.id}`,
        requireInteraction: true, // stays until dismissed
      });
      // Focus the staff tab when clicked
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, []);

  // Beep sound (plays if speaker is connected)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.5;
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch {
      /* Audio not available */
    }
  }, []);

  useEffect(() => {
    fetch('/menu.json')
      .then((res) => res.json())
      .then((data: MenuCategory[]) => setMenuItems(data))
      .catch(() => console.error('Failed to fetch menu'));
  }, []);

  const findMenuItem = useCallback((id: number): MenuItem | undefined => {
    for (const cat of menuItems) {
      const found = cat.items.find((item) => item.id === id);
      if (found) return found;
    }
    return undefined;
  }, [menuItems]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/orders');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Order[] = await res.json();

      // Detect new orders (not on first load)
      if (!isFirstLoad.current) {
        for (const order of data) {
          if (!knownOrderIds.current.has(order.id) && order.status === 'In List') {
            // Build item names for the notification
            const itemNames = order.items
              .map((i) => {
                const mi = findMenuItem(i.id);
                return `${mi ? mi.name : 'Item'} ×${i.quantity || 1}`;
              })
              .join(', ');
            sendWindowsNotification(order, itemNames);
            playNotificationSound();
            break; // one at a time
          }
        }
      }

      // Update known IDs
      knownOrderIds.current = new Set(data.map((o) => o.id));
      isFirstLoad.current = false;

      setOrders(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, [findMenuItem, sendWindowsNotification, playNotificationSound]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const markPreparing = async (oid: number) => {
    try {
      await fetch(`/orders/${oid}/preparing`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const markReady = async (oid: number) => {
    try {
      await fetch(`/orders/${oid}/prepared`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Stats
  const activeOrders = orders.filter((o) => o.status !== 'Ready');
  const inListCount = orders.filter((o) => o.status === 'In List').length;
  const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
  const readyCount = orders.filter((o) => o.status === 'Ready').length;

  const filteredOrders =
    filter === 'all' ? activeOrders : orders.filter((o) => o.status === filter);

  const getElapsedClass = (mins: string) => {
    const m = parseFloat(mins);
    if (m >= 15) return 'urgent';
    if (m >= 8) return 'warning';
    return '';
  };

  return (
    <div className="staff-section">
      {/* Dashboard header */}
      <div className="staff-header">
        <div className="staff-header-top">
          <h1>
            <i className="fas fa-concierge-bell" /> Order Dashboard
          </h1>
          <div className="staff-live-badge">
            <span className="pulse-dot" />
            Live — updated {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Stats row */}
        <div className="staff-stats">
          <div className="stat-card stat-total">
            <i className="fas fa-receipt" />
            <div>
              <span className="stat-number">{activeOrders.length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="stat-card stat-inlist">
            <i className="fas fa-list" />
            <div>
              <span className="stat-number">{inListCount}</span>
              <span className="stat-label">In List</span>
            </div>
          </div>
          <div className="stat-card stat-preparing">
            <i className="fas fa-fire" />
            <div>
              <span className="stat-number">{preparingCount}</span>
              <span className="stat-label">Preparing</span>
            </div>
          </div>
          <div className="stat-card stat-ready">
            <i className="fas fa-check-circle" />
            <div>
              <span className="stat-number">{readyCount}</span>
              <span className="stat-label">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="staff-filters">
        {(['all', 'In List', 'Preparing', 'Ready'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' ? 'All Active' : tab}
            <span className="filter-count">
              {tab === 'all'
                ? activeOrders.length
                : orders.filter((o) => o.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Order cards */}
      <div className="staff-orders">
        {filteredOrders.length === 0 ? (
          <div className="staff-empty">
            <i className="fas fa-mug-hot" />
            <h3>No orders {filter !== 'all' ? `with status "${filter}"` : 'right now'}</h3>
            <p>Orders will appear here automatically</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              className={`staff-order-card status-border-${order.status.replace(/\s/g, '-')}`}
              key={order.id}
            >
              <div className="order-card-header">
                <div className="order-card-id">
                  <span className="order-hash">#</span>
                  {order.id}
                </div>
                <span
                  className={`staff-badge badge-${order.status.replace(/\s/g, '-')}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-card-details">
                <div className="order-detail">
                  <i className="fas fa-user" />
                  <span>{order.name}</span>
                </div>
                <div className="order-detail">
                  <i className="fas fa-map-marker-alt" />
                  <span>{order.location}</span>
                </div>
                <div className="order-detail">
                  <i className="fas fa-chair" />
                  <span>Table {order.table}</span>
                </div>
                <div className={`order-detail ${getElapsedClass(order.elapsedMinutes)}`}>
                  <i className="fas fa-clock" />
                  <span>{parseFloat(order.elapsedMinutes).toFixed(0)} min</span>
                </div>
              </div>

              <div className="order-card-items">
                <h4>Items</h4>
                <div className="items-chips">
                  {order.items.map((i, idx) => {
                    const menuItem = findMenuItem(i.id);
                    return (
                      <span className="item-chip" key={`${i.id}-${i.variant || idx}`}>
                        {menuItem ? menuItem.name : 'Unknown'}
                        {i.variant ? ` (${i.variant})` : ''}
                        <span className="chip-qty">×{i.quantity || 1}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="order-card-actions">
                {order.status === 'In List' && (
                  <button
                    className="btn-start"
                    onClick={() => markPreparing(order.id)}
                  >
                    <i className="fas fa-fire" /> Start Preparing
                  </button>
                )}
                {order.status === 'Preparing' && (
                  <button
                    className="btn-ready"
                    onClick={() => markReady(order.id)}
                  >
                    <i className="fas fa-check" /> Mark Ready
                  </button>
                )}
                {order.status === 'Ready' && (
                  <span className="done-label">
                    <i className="fas fa-check-double" /> Done
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
