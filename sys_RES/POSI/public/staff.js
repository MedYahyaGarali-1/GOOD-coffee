let menuItems = [];

// Search for item by ID inside all categories in menu.json
function findMenuItemById(id) {
  for (const category of menuItems) {
    if (category.items && Array.isArray(category.items)) {
      const found = category.items.find(item => item.id === id);
      if (found) return found;
    }
  }
  return null;
}

async function fetchMenu() {
  try {
    const res = await fetch('menu.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    menuItems = await res.json();
  } catch (e) {
    console.error('Failed to fetch menu:', e);
    menuItems = [];
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/orders');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const orders = await res.json();
    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '';

    const activeOrders = orders.filter(o => o.status !== 'Ready');

    if (activeOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No active orders</td></tr>';
      return;
    }

    activeOrders.forEach(order => {
      const itemsList = order.items.map(i => {
        const menuItem = findMenuItemById(i.id);
        const name = menuItem ? menuItem.name : 'Unknown Item';
        const qty = i.quantity || 1;
        return `<li>${name} x${qty}</li>`;
      }).join('');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.id}</td>
        <td>${order.name || '-'}</td>
        <td>${order.location || '-'}</td>
        <td>${order.table || '-'}</td>
        <td><ul class="items-list">${itemsList}</ul></td>
        <td class="status-${order.status.replace(/\s/g, '-')}">${order.status}</td>
        <td>${order.elapsedMinutes != null ? order.elapsedMinutes : '-'}</td>
        <td>
          <button onclick="markPrepared(${order.id})">Mark as Prepared</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
}

async function markPrepared(orderId) {
  try {
    const res = await fetch(`/orders/${orderId}/prepared`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fetchOrders(); // Refresh orders
  } catch (err) {
    console.error('Error marking order prepared:', err);
  }
}

async function init() {
  await fetchMenu();
  await fetchOrders();
  setInterval(fetchOrders, 5000);
}

init();
