// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
            console.log('Service worker registered.', reg);
            const s = document.getElementById('status');
            if (s) s.textContent = 'Service worker registered.';
        }).catch((err) => {
            console.warn('Service worker registration failed:', err);
            const s = document.getElementById('status');
            if (s) s.textContent = 'SW registration failed';
        });
    });
} else {
    const s = document.getElementById('status');
    if (s) s.textContent = 'Service workers not supported.';
}

// Lightweight IndexedDB helper
const DB_NAME = 'inventory-db';
const DB_VERSION = 1;
const STORE = 'items';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbAdd(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const r = store.add(item);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}

async function idbPut(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const r = store.put(item);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}

async function idbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
    });
}

async function idbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const r = store.delete(id);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
    });
}

// Application logic
const GST_RATE = 0.18; // 18% GST
const API_BASE = (function() {
    try { return `${location.protocol}//${location.hostname}:8001`; } catch (e) { return null; }
})();

async function apiAvailable() {
    if (!API_BASE) return false;
    try {
        const res = await fetch(`${API_BASE}/api/ping`, { cache: 'no-store' });
        return res.ok;
    } catch (e) { return false; }
}

async function fetchItemsFromServer() {
    const res = await fetch(`${API_BASE}/api/items`);
    if (!res.ok) throw new Error('fetch failed');
    return res.json();
}

async function createItemServer(item) {
    const res = await fetch(`${API_BASE}/api/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    if (!res.ok) throw new Error('create failed');
    return res.json();
}

async function updateItemServer(item) {
    const res = await fetch(`${API_BASE}/api/items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    if (!res.ok) throw new Error('update failed');
    return res.json();
}

async function deleteItemServer(id) {
    const res = await fetch(`${API_BASE}/api/items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('delete failed');
    return true;
}

async function idbClear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const r = store.clear();
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
    });
}

// Try to sync from server into IDB (replace local store) when available
async function syncFromServer() {
    if (!(await apiAvailable())) return false;
    try {
        const items = await fetchItemsFromServer();
        await idbClear();
        for (const it of items) {
            // put with server id
            await idbPut(it);
        }
        return true;
    } catch (e) {
        console.warn('sync failed', e);
        return false;
    }
}

async function renderItems() {
    const tbody = document.getElementById('items');
    tbody.innerHTML = '';
    const items = await idbGetAll();
    items.forEach((it) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(it.name)}</td>
            <td>${it.weight != null ? (it.weight + ' kg') : ''}</td>
            <td>₹${parseFloat(it.price||0).toFixed(2)}</td>
            <td>${it.qty || 0}</td>
        `;
        const actionsTd = document.createElement('td');
        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => populateForm(it));
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.addEventListener('click', async() => {
            await idbDelete(it.id);
            await renderItems();
            renderCart();
        });
        const addToCart = document.createElement('button');
        addToCart.textContent = 'Add to cart';
        addToCart.addEventListener('click', () => addToCartHandler(it));
        const qrBtn = document.createElement('button');
        qrBtn.textContent = 'QR';
        qrBtn.className = 'qr-btn';
        qrBtn.addEventListener('click', () => showQrForItem(it));
        actionsTd.appendChild(edit);
        actionsTd.appendChild(del);
        actionsTd.appendChild(addToCart);
        actionsTd.appendChild(qrBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });
}

function escapeHtml(s) { return String(s).replace(/[&<>"]+/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[m] || m)); }

function populateForm(item) {
    document.getElementById('item-name').value = item.name || '';
    document.getElementById('item-weight').value = item.weight || '';
    document.getElementById('item-price').value = item.price || '';
    document.getElementById('item-expiry').value = item.expiry || '';
    document.getElementById('item-qty').value = item.qty || 0;
    document.getElementById('item-form').dataset.editId = item.id;
}

document.getElementById('item-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    const id = document.getElementById('item-form').dataset.editId;
    const item = {
        name: document.getElementById('item-name').value.trim(),
        weight: parseFloat(document.getElementById('item-weight').value) || 0,
        price: parseFloat(document.getElementById('item-price').value) || 0,
        expiry: document.getElementById('item-expiry').value || null,
        qty: parseInt(document.getElementById('item-qty').value) || 0
    };
    if (id) {
        item.id = Number(id);
        // try server then idb
        if (await apiAvailable()) {
            try {
                const serverItem = await updateItemServer(item);
                await idbPut(serverItem);
            } catch (e) { await idbPut(item); }
        } else { await idbPut(item); }
        delete document.getElementById('item-form').dataset.editId;
    } else {
        if (await apiAvailable()) {
            try {
                const serverItem = await createItemServer(item);
                await idbPut(serverItem);
            } catch (e) { await idbAdd(item); }
        } else {
            await idbAdd(item);
        }
    }
    e.target.reset();
    await renderItems();
    await renderCart();
});

// Sample add
document.getElementById('add-sample').addEventListener('click', async() => {
    const items = await idbGetAll();
    const sample = { name: 'Sample Item ' + (items.length + 1), price: 10.0, qty: 1, weight: 0.5 };
    if (await apiAvailable()) {
        try {
            const serverItem = await createItemServer(sample);
            await idbPut(serverItem);
        } catch (e) { await idbAdd(sample); }
    } else { await idbAdd(sample); }
    await renderItems();
});

// Billing/cart
let CART = [];

function addToCartHandler(item) {
    const existing = CART.find(c => c.id === item.id);
    if (existing) existing.qty += 1;
    else CART.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    renderCart();
}

function renderCart() {
    const ul = document.getElementById('cart-items');
    ul.innerHTML = '';
    let total = 0;
    CART.forEach(ci => {
        const li = document.createElement('li');
        const line = (ci.price || 0) * ci.qty;
        total += line;
        li.textContent = `${ci.name} — ${ci.qty} × ₹${(ci.price||0).toFixed(2)} = ₹${line.toFixed(2)}`;
        const rem = document.createElement('button');
        rem.textContent = '−';
        rem.addEventListener('click', () => {
            ci.qty--;
            if (ci.qty <= 0) CART = CART.filter(x => x !== ci);
            renderCart();
        });
        const add = document.createElement('button');
        add.textContent = '+';
        add.addEventListener('click', () => {
            ci.qty++;
            renderCart();
        });
        li.appendChild(rem);
        li.appendChild(add);
        ul.appendChild(li);
    });
    const gst = total * GST_RATE;
    const grand = total + gst;
    document.getElementById('cart-total').textContent = grand.toFixed(2);
    document.getElementById('cart-gst').textContent = gst.toFixed(2);
}

// Initial render
(async() => {
    // Try initial sync from server, then render local store
    await syncFromServer();
    await renderItems();
    renderCart();
})();

// Reporting: compute total quantity and total sales
async function computeReport() {
    const items = await idbGetAll();
    let totalQty = 0;
    let totalSales = 0;
    items.forEach(it => {
        totalQty += Number(it.qty || 0);
        totalSales += (Number(it.price || 0) * Number(it.qty || 0));
    });
    const out = document.getElementById('report-result');
    out.innerHTML = `<div><strong>Total quantity:</strong> ${totalQty}</div><div><strong>Total sales:</strong> ₹${totalSales.toFixed(2)}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('generate-report');
    if (btn) btn.addEventListener('click', computeReport);
});

// Tabs: attach handlers and persist last-open tab
function initTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-btn'));

    function activate(targetId) {
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        document.getElementById(targetId).style.display = 'block';
        buttons.forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
        try { localStorage.setItem('inventory-active-tab', targetId); } catch (e) {}
    }
    buttons.forEach(b => b.addEventListener('click', () => activate(b.dataset.target)));
    const saved = localStorage.getItem('inventory-active-tab') || 'panel-inventory';
    activate(saved);
}
initTabs();

// QR modal helpers
function showQrForItem(item) {
    const modal = document.getElementById('qr-modal');
    const body = document.getElementById('qr-body');
    const title = document.getElementById('qr-title');
    const download = document.getElementById('qr-download');
    body.innerHTML = '';
    title.textContent = `QR for ${item.name}`;
    const payload = JSON.stringify({ id: item.id, name: item.name, weight: item.weight, price: item.price });
    if (navigator.onLine) {
        // Use api.qrserver.com to generate QR images (more reliable replacement for Google Charts QR endpoint)
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'QR Code';
        body.appendChild(img);
        download.onclick = async() => {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `qr-${item.id}.png`;
                a.click();
            } catch (e) { alert('Download failed'); }
        };
    } else {
        const pre = document.createElement('pre');
        pre.textContent = payload;
        body.appendChild(pre);
        download.onclick = () => { navigator.clipboard.writeText(payload).then(() => alert('Payload copied')); };
    }
    modal.setAttribute('aria-hidden', 'false');
}

function initQrModalHandlers() {
    const closeIcon = document.getElementById('qr-close');
    const modal = document.getElementById('qr-modal');
    const qrCloseBtn = document.getElementById('qr-close-btn');
    if (!modal) return;
    if (closeIcon) closeIcon.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
    // close modal on overlay click
    modal.addEventListener('click', (e) => { if (e.target === e.currentTarget) modal.setAttribute('aria-hidden', 'true'); });
    if (qrCloseBtn) qrCloseBtn.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
    // close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal && modal.getAttribute('aria-hidden') === 'false') modal.setAttribute('aria-hidden', 'true');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQrModalHandlers);
} else {
    initQrModalHandlers();
}