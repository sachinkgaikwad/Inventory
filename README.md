# Inventory

Create inventory and billing PWA for food items.

This project now includes a lightweight Flask + SQLite backend for persisting inventory, plus a client-side PWA that uses IndexedDB when offline.

Files of interest
- `server.py` — Flask API using SQLite (file `inventory.db`) running on port 8001 by default
- `requirements.txt` — Python dependencies for the server
- `index.html`, `scripts/app.js`, `styles.css` — client PWA

Quick start (client)

1) Serve the static client from the project root (Python 3 simple server):

```bash
python3 -m http.server 8000
```

2) Open http://localhost:8000 in your browser.

Quick start (server)

1) Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Run the Flask server (will create `inventory.db` automatically):

```bash
python3 server.py
```

By default the server listens on port 8001. The client will attempt to use the server for CRUD operations and fall back to IndexedDB if the server is unavailable.

Notes
- When the client detects the server is available it will sync server items into IndexedDB and use the server for create/update/delete operations. If the server is unreachable the client uses the local IndexedDB store and will continue to function offline.
- To enable multi-device sync, run the Flask server on a reachable host and point the client to that host (modify `API_BASE` in `scripts/app.js` if needed).
 
macOS / Safari notes
- For best macOS experience install the app from Safari: open the site, then use Safari → File → Add to Dock (or Add to Home Screen on iOS) to get a standalone app-like window.
- Safari uses the `mask-icon` (pinned tab) and `apple-touch-icon` to display your icon; replace `icons/pinned.svg` and `icons/icon-192.png` with branded assets for a nicer look.
- To make the PWA feel native on macOS, consider running the Flask server and serving static files from the same origin so the app can be installed without mixed ports.
# Inventory

Create inventory and billing PWA for food items.

Planned features
1. Dashboard — shows current stock.
2. Inventory — generate QR codes, add new items to inventory using generated QR codes. Item details: name, weight (kg), price, expiry date.
3. Billing — tabular billing UI, add items using phone camera QR codes, include GST and totals.
4. Data persistence — SQLite or server-side DB for real storage and sync.

PWA scaffold

This repository includes a minimal Progressive Web App scaffold so you can prototype the UI and service worker behavior quickly.

Files added
- `index.html` — minimal app shell and UI (inventory form, list, billing cart)
- `manifest.json` — web app manifest for installability
- `sw.js` — service worker (caches app shell and provides cache-first fetch)
- `scripts/app.js` — client script: registers SW and provides IndexedDB-backed inventory CRUD and a simple billing cart (GST calculation)
- `styles.css` — basic styles
- `icons/` — placeholder icons used by the manifest

Quick start (serve locally)

1) From the project root run a simple static server. If you have Python 3 installed you can run:

```bash
python3 -m http.server 8000
```

2) Open http://localhost:8000 in a Chromium-based browser (Chrome, Edge) or Firefox.

3) On page load the service worker will register and cache the app shell. Check DevTools -> Application -> Service Workers to confirm.

Testing offline

- In DevTools -> Network choose "Offline", then reload the page. The cached shell should load and the UI remain functional (inventory is persisted in IndexedDB).

Install the app

- In Chrome/Edge: if the app is installable you'll see an install button in the address bar or inside the browser menu (Install app). You can also trigger the install flow from the Application panel.

Notes & next steps

- Inventory now includes a weight field (kg) instead of a generic type. The client stores inventory in IndexedDB (`scripts/app.js`).
- Replace the placeholder icons in `icons/` with proper 192x192 and 512x512 PNGs if you want branding.
- To enable multi-device sync add a small backend (Node/Python) with SQLite and REST endpoints. I can scaffold that for you.
# Inventory

Create inventory and billing PWA for food items.

Planned features
1. Dashboard — shows current stock.
2. Inventory — generate QR codes, add new items to inventory using generated QR codes. Item details: name, type, price, expiry date.
3. Billing — tabular billing UI, add items using phone camera QR codes, include GST and totals.
4. Data persistence — SQLite or server-side DB for real storage and sync.

PWA scaffold

This repository includes a minimal Progressive Web App scaffold so you can prototype the UI and service worker behavior quickly.

Files added
- `index.html` — minimal app shell and UI
- `manifest.json` — web app manifest for installability
- `sw.js` — service worker (caches app shell and provides cache-first fetch)
- `scripts/app.js` — client script: registers SW and provides IndexedDB-backed inventory CRUD and a simple billing cart (GST calculation)
- `styles.css` — basic styles
- `icons/` — placeholder icons used by the manifest

Quick start (serve locally)

1) From the project root run a simple static server. If you have Python 3 installed you can run:

```bash
python3 -m http.server 8000
```

2) Open http://localhost:8000 in a Chromium-based browser (Chrome, Edge) or Firefox.

3) On page load the service worker will register and cache the app shell. Check DevTools -> Application -> Service Workers to confirm.

Testing offline

- In DevTools -> Network choose "Offline", then reload the page. The cached shell should load and the UI remain functional (inventory is persisted in IndexedDB).

Install the app

- In Chrome/Edge: if the app is installable you'll see an install button in the address bar or inside the browser menu (Install app). You can also trigger the install flow from the Application panel.

Notes & next steps

- You can replace the placeholder icons in `icons/` with proper 192x192 and 512x512 PNGs (already replaced with valid placeholders in this commit).
- Inventory and billing are implemented client-side using IndexedDB in `scripts/app.js`. Next steps: add QR code generation/scan and server-side persistence if you want multi-device sync.


If you'd like, I can:
- Replace the placeholder icons with real PNGs.
- Wire up a simple SQLite-backed API and a minimal backend to persist inventory items.
- Add unit tests and CI for the build.
# Inventory
Create inventory , billing PWA for food items 
1 dashboard shows current stock , 
2.Inventory , Generate QR codes , add new items to inventory using generated QR codes. 
item details : name , type , price , expiry date 
2. billing shows tabular for , add items using phone camera QR codes , incude GST , add total .
3 . create SQL light database for same .

