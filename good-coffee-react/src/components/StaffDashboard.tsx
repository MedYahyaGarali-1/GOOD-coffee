import { useState, useEffect, useCallback } from 'react';
import type { MenuCategory, MenuItem, Order } from '../types';

export default function StaffDashboard() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/menu.json')
      .then((res) => res.json())
      .then((data: MenuCategory[]) => setMenuItems(data))
      .catch(() => console.error('Failed to fetch menu'));
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/orders');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Order[] = await res.json();
      setOrders(data.filter((o) => o.status !== 'Ready'));
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const findMenuItem = (id: number): MenuItem | undefined => {
    for (const cat of menuItems) {
      const found = cat.items.find((item) => item.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const markPrepared = async (oid: number) => {
    try {
      await fetch(`/orders/${oid}/prepared`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error('Error marking order prepared:', err);
    }
  };

  return (
    <div className="staff-section">
      <h1>Staff Order Dashboard</h1>

      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Name</th>
            <th>Location</th>
            <th>Table</th>
            <th>Items</th>
            <th>Status</th>
            <th>Elapsed (min)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center' }}>
                No active orders
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.name || '-'}</td>
                <td>{order.location || '-'}</td>
                <td>{order.table || '-'}</td>
                <td>
                  <ul className="items-list">
                    {order.items.map((i) => {
                      const menuItem = findMenuItem(i.id);
                      return (
                        <li key={i.id}>
                          {menuItem ? menuItem.name : 'Unknown Item'} x{i.quantity || 1}
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td className={`status-${order.status.replace(/\s/g, '-')}`}>
                  {order.status}
                </td>
                <td>{order.elapsedMinutes ?? '-'}</td>
                <td>
                  <button onClick={() => markPrepared(order.id)}>Mark as Prepared</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
