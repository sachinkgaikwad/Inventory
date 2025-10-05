#!/usr/bin/env python3
from flask import Flask, request, jsonify, g
import sqlite3
import os

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, 'inventory.db')

app = Flask(__name__)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            weight REAL,
            price REAL,
            expiry TEXT,
            qty INTEGER
        )
    ''')
    db.commit()

# Initialize DB at startup inside an application context (avoid using before_first_request)

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return resp

@app.route('/api/ping')
def ping():
    return jsonify({'ok': True})

@app.route('/api/items', methods=['GET', 'POST', 'OPTIONS'])
def items():
    if request.method == 'OPTIONS':
        return ('', 204)
    db = get_db()
    if request.method == 'GET':
        cur = db.execute('SELECT id, name, weight, price, expiry, qty FROM items ORDER BY id DESC')
        rows = cur.fetchall()
        items = [dict(r) for r in rows]
        return jsonify(items)
    if request.method == 'POST':
        data = request.get_json(force=True)
        cur = db.execute('INSERT INTO items (name, weight, price, expiry, qty) VALUES (?,?,?,?,?)',
                         (data.get('name'), data.get('weight'), data.get('price'), data.get('expiry'), data.get('qty')))
        db.commit()
        item_id = cur.lastrowid
        cur = db.execute('SELECT id, name, weight, price, expiry, qty FROM items WHERE id = ?', (item_id,))
        row = cur.fetchone()
        return jsonify(dict(row)), 201

@app.route('/api/items/<int:item_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
def item_detail(item_id):
    if request.method == 'OPTIONS':
        return ('', 204)
    db = get_db()
    if request.method == 'DELETE':
        db.execute('DELETE FROM items WHERE id = ?', (item_id,))
        db.commit()
        return ('', 204)
    if request.method == 'PUT':
        data = request.get_json(force=True)
        db.execute('UPDATE items SET name=?, weight=?, price=?, expiry=?, qty=? WHERE id=?',
                   (data.get('name'), data.get('weight'), data.get('price'), data.get('expiry'), data.get('qty'), item_id))
        db.commit()
        cur = db.execute('SELECT id, name, weight, price, expiry, qty FROM items WHERE id = ?', (item_id,))
        row = cur.fetchone()
        return jsonify(dict(row))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    # ensure DB is initialized
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', port=port, debug=True)
