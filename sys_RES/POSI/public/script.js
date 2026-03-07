const menuDiv = document.getElementById('menu');
const orderDiv = document.getElementById('order');
const submitBtn = document.getElementById('submitBtn');
const statusSection = document.getElementById('status-section');
const formSection = document.getElementById('form-section');
const orderStatusDiv = document.getElementById('order-status');
const newOrderBtn = document.getElementById('newOrderBtn');
const pastOrdersDiv = document.getElementById('past-orders');
const pastOrdersFormDiv = document.getElementById('past-orders-form');
const viewAllOrdersBtn = document.getElementById('viewAllOrdersBtn');

let menuItems = [];
let currentOrder = {};
let statusInterval;

async function fetchMenu() {
  const res = await fetch('menu.json');
  if (!res.ok) {
    alert('Failed to load menu');
    return;
  }
  menuItems = await res.json();
  renderMenu();
}

function renderMenu() {
  menuDiv.innerHTML = '';
  menuItems.forEach(category => {
    const catDiv = document.createElement('div');
    catDiv.style.width = '100%';
    catDiv.style.marginBottom = '0px';

    const catTitle = document.createElement('h3');
    catTitle.textContent = category.category;
    catTitle.classList.add('category-title');
    catTitle.style.cursor = 'pointer';
    catTitle.style.userSelect = 'none';
    catDiv.appendChild(catTitle);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.display = 'none';
    itemsContainer.style.flexWrap = 'wrap';
    itemsContainer.style.gap = '10px';
    itemsContainer.style.marginTop = '6px';
    itemsContainer.style.marginLeft = '10px';

    category.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'menu-item';
      div.style.flex = '1 1 45%';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.alignItems = 'center';
      div.style.padding = '10px';
      div.style.border = '1px solid #ccc';
      div.style.borderRadius = '8px';
      div.style.background = '#fff';
      div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';

      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" 
          style="width:100px;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px;">
        <span><strong>${item.name}</strong> - ${item.price.toFixed(2)}</span>
        <button data-id="${item.id}" style="margin-top:8px;">Add</button>
      `;
      itemsContainer.appendChild(div);
    });

    catDiv.appendChild(itemsContainer);
    menuDiv.appendChild(catDiv);

    catTitle.addEventListener('click', () => {
      itemsContainer.style.display = (itemsContainer.style.display === 'none') ? 'flex' : 'none';
    });
  });

  menuDiv.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => addToOrder(parseInt(btn.dataset.id)));
  });
}

function findMenuItemById(id) {
  for (const category of menuItems) {
    const found = category.items.find(item => item.id === id);
    if (found) return found;
  }
  return null;
}

function addToOrder(itemId) {
  const item = findMenuItemById(itemId);
  if (!item) return;

  if (!currentOrder[itemId]) {
    currentOrder[itemId] = { ...item, quantity: 1 };
  } else {
    currentOrder[itemId].quantity++;
  }
  renderOrder();
}

function renderOrder() {
  orderDiv.innerHTML = '';
  const items = Object.values(currentOrder);
  if (items.length === 0) {
    orderDiv.innerHTML = '<i>No items selected.</i>';
    return;
  }

  let total = 0;
  items.forEach(item => {
    const line = document.createElement('div');
    line.className = 'order-item';
    line.textContent = `${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}`;
    orderDiv.appendChild(line);
    total += item.price * item.quantity;
  });

  const totalDiv = document.createElement('div');
  totalDiv.style.fontWeight = 'bold';
  totalDiv.textContent = `Total: TND ${total.toFixed(2)}`;
  orderDiv.appendChild(totalDiv);
}

submitBtn.addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const location = document.getElementById('location').value;
  const table = document.getElementById('table').value.trim();
  const items = Object.values(currentOrder).map(({id, quantity}) => ({ id, quantity }));

  if (!name || !location || !table) {
    alert('Please fill all your info.');
    return;
  }
  if (items.length === 0) {
    alert('Please add at least one menu item.');
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, table, items }),
    });
    const data = await res.json();
    if (res.ok) {
      showStatus(data.orderId);
    } else {
      alert(data.error || 'Order failed');
      submitBtn.disabled = false;
    }
  } catch (e) {
    alert('Error submitting order');
    submitBtn.disabled = false;
  }
});

async function showStatus(orderId) {
  formSection.style.display = 'none';
  statusSection.style.display = 'block';

  async function updateStatus() {
    const res = await fetch(`/orders/${orderId}`);
    const data = await res.json();
    if (!res.ok) {
      orderStatusDiv.textContent = data.error || 'Order not found';
      clearInterval(statusInterval);
      return;
    }

    orderStatusDiv.innerHTML = `
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Location:</strong> ${data.location}</p>
      <p><strong>Table:</strong> ${data.table}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <p><strong>Elapsed:</strong> ${data.elapsedMinutes} minutes</p>
      <p><strong>Items:</strong></p>
      <ul>
        ${data.items.map(i => {
          const menuItem = findMenuItemById(i.id);
          const name = menuItem ? menuItem.name : 'Unknown';
          return `<li>${name} x${i.quantity || 1}</li>`;
        }).join('')}
      </ul>
    `;

    if (data.status === 'Ready') {
      clearInterval(statusInterval);
    }
  }

  await updateStatus();
  statusInterval = setInterval(updateStatus, 5000);
}

newOrderBtn.addEventListener('click', () => {
  currentOrder = {};
  orderStatusDiv.innerHTML = '';
  pastOrdersDiv.innerHTML = '<p>Enter your name above to see your past orders.</p>';
  pastOrdersDiv.style.display = 'none';
  statusSection.style.display = 'none';
  formSection.style.display = 'block';
  submitBtn.disabled = false;
});

viewAllOrdersBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  if (!name) {
    alert('Please enter your name to view your orders.');
    return;
  }
  fetchOrdersByName(name, pastOrdersDiv);
  pastOrdersDiv.style.display = 'block';
});

async function fetchOrdersByName(name, targetDiv) {
  if (!name) return;
  try {
    const res = await fetch(`/orders-by-name/${encodeURIComponent(name)}`);
    const orders = await res.json();
    displayPastOrders(orders, targetDiv);
  } catch (e) {
    console.error('Failed to fetch past orders', e);
  }
}

function displayPastOrders(orders, targetDiv) {
  if (!orders || orders.length === 0) {
    targetDiv.innerHTML = '<p>No past orders found.</p>';
    return;
  }

  targetDiv.innerHTML = '';

  orders.forEach(order => {
    const itemsList = order.items.map(i => {
      const menuItem = findMenuItemById(i.id);
      const name = menuItem ? menuItem.name : 'Unknown';
      const qty = i.quantity || 1;
      return `<li>${name} x${qty}</li>`;
    }).join('');

    const orderHtml = `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:6px; background:#fefefe;">
        <strong>Order #${order.id}</strong> — Status: <em>${order.status}</em><br/>
        Location: ${order.location} — Table: ${order.table}<br/>
        Elapsed: ${order.elapsedMinutes} minutes<br/>
        Items:
        <ul>${itemsList}</ul>
      </div>
    `;
    targetDiv.innerHTML += orderHtml;
  });
}

// Fetch menu at start
fetchMenu();
renderOrder();

// Auto-load past orders when name changes
document.getElementById('name').addEventListener('input', (e) => {
  const name = e.target.value.trim();
  if (name.length > 0) {
    fetchOrdersByName(name, pastOrdersFormDiv);
  } else {
    pastOrdersFormDiv.innerHTML = '<p>Enter your name to see your past orders.</p>';
  }
});
