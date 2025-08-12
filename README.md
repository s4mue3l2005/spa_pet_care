# spa_pet_care

Perfecto, Samuel — gracias por confirmar. Voy a generar todo lo necesario siguiendo tus indicaciones:

Nombre de la BD: pd_samuel_arena_caiman

Base CRUD principal: customers (Customers).

Entidad adicional para consultas y CRUD lógico: invoices (facturas) — esto encaja bien con las consultas solicitadas (total pagado por cliente, facturas pendientes, transacciones por plataforma).

Motor: MySQL.

Incluyo un endpoint extra que ejecuta la carga masiva desde CSV (punto extra del enunciado).

A continuación te entrego los artefactos principales listos para copiar/pegar y poner a funcionar en tu proyecto. Lo ordeno en secciones para que puedas seguirlo paso a paso.

Resumen rápido del flujo (qué archivos/acciones hay)
ddl/pd_samuel_arena_caiman.sql — DDL MySQL para crear la base (tablas, PK, FK, restricciones).

server/ — backend en Node.js + Express:

server/db.js — conexión MySQL (mysql2).

server/seeders/run_seeders.js — script que lee server/data/data.csv e inserta en el orden correcto.

server/index.js — servidor Express con rutas:

CRUD customers: /api/customers

Reports: /api/reports/total_paid_by_customer, /api/reports/pending_invoices, /api/reports/transactions_by_platform/:platform

Endpoint extra: POST /api/seed → ejecuta el proceso de seed (carga masiva) desde CSV (punto extra).

server/data/data.csv — coloca el CSV convertido ahí (instrucciones abajo).

app/ — frontend minimal (Bootstrap):

app/index.html

app/css/styles.css

app/js/main.js — consume la API y permite CRUD básico para customers.

docs/ — incluiré instrucciones para generar/guardar el diagrama; te doy el modelo relacional textual y un SVG/PNG (si quieres lo puedo exportar y poner en docs).

Fintech.postman_collection.json — colección Postman con endpoints y ejemplos.

README.md — en inglés, completo con instrucciones, normalización y cómo ejecutar todo.

1) DDL MySQL — ddl/pd_samuel_arena_caiman.sql
Guarda este archivo y ejecútalo (por ejemplo en MySQL Workbench o mysql CLI) después de crear la base de datos o inclúyelo para crearla.

sql
Copiar
Editar
-- ddl/pd_samuel_arena_caiman.sql
-- Create database and schema for the assignment
CREATE DATABASE IF NOT EXISTS pd_samuel_arena_caiman CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pd_samuel_arena_caiman;

-- Table: platforms
CREATE TABLE IF NOT EXISTS platforms (
  platform_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  identification_number VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(150) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  billing_period VARCHAR(20) NOT NULL,
  amount_billed DECIMAL(14,2) NOT NULL,
  customer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id VARCHAR(50) PRIMARY KEY,
  transaction_datetime DATETIME NOT NULL,
  transaction_amount DECIMAL(14,2) NOT NULL,
  transaction_status VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50),
  customer_id INT NOT NULL,
  platform_id INT,
  invoice_id INT,
  amount_paid DECIMAL(14,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tx_platform FOREIGN KEY (platform_id) REFERENCES platforms(platform_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tx_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
2) Conversión Excel → CSV y ubicación
Abre data.xlsx → guarda la hoja Sheet1 como CSV (CSV UTF-8 (delimitado por comas)).

Nombra el archivo data.csv.

Sitúalo en: server/data/data.csv.

Nota: el seeder que entrego asume los nombres de columnas en español tal como en tu Excel:

mathematica
Copiar
Editar
ID de la Transacción,Fecha y Hora de la Transacción,Monto de la Transacción,Estado de la Transacción,Tipo de Transacción,Nombre del Cliente,Número de Identificación,Dirección,Teléfono,Correo Electrónico,Plataforma Utilizada,Número de Factura,Periodo de Facturación,Monto Facturado,Monto Pagado
Si tu CSV usa una pequeña variación en nombres, ajusta las keys en el run_seeders.js que te doy.

3) Backend: Node.js + Express + mysql2
3.1 Instalación de dependencias
En la raíz del proyecto ejecuta:

bash
Copiar
Editar
npm init -y
npm install express mysql2 csv-parse dotenv express-validator cors
(Además, para desarrollo puedes usar nodemon):

bash
Copiar
Editar
npm install --save-dev nodemon
Agrega en package.json el script:

json
Copiar
Editar
"scripts": {
  "start": "node server/index.js",
  "dev": "nodemon server/index.js"
}
3.2 server/db.js — conexión MySQL (usar dotenv para credenciales)
Crea .env en la raíz con:

ini
Copiar
Editar
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pd_samuel_arena_caiman
Archivo server/db.js:

js
Copiar
Editar
// server/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pd_samuel_arena_caiman',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
3.3 server/seeders/run_seeders.js — carga masiva desde CSV
js
Copiar
Editar
// server/seeders/run_seeders.js
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const pool = require('../db');

async function runSeed() {
  const csvPath = path.join(__dirname, '..', 'data', 'data.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error('CSV file not found at server/data/data.csv');
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insert platforms unique
    const platformMap = new Map();
    for (const r of records) {
      const p = (r['Plataforma Utilizada'] || r['Plataforma'] || '').trim();
      if (!p) continue;
      platformMap.set(p, null);
    }
    for (const name of platformMap.keys()) {
      const [res] = await conn.query(
        'INSERT INTO platforms (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name',
        [name]
      );
      const insertId = res.insertId ? res.insertId : (await conn.query('SELECT platform_id FROM platforms WHERE name = ?', [name]))[0][0].platform_id;
      platformMap.set(name, insertId);
    }

    // 2) Insert customers unique
    const customerMap = new Map();
    for (const r of records) {
      const idnum = (r['Número de Identificación'] || r['identification'] || '').toString().trim();
      if (!idnum) continue;
      if (!customerMap.has(idnum)) {
        const name = (r['Nombre del Cliente'] || '').trim();
        const address = (r['Dirección'] || null);
        const phone = (r['Teléfono'] || null);
        const email = (r['Correo Electrónico'] || null);
        // Insert or ignore on duplicate identification_number
        const [res] = await conn.query(
          `INSERT INTO customers (name, identification_number, address, phone, email)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address), phone = VALUES(phone), email = VALUES(email)`,
          [name, idnum, address, phone, email]
        );
        // get the id
        let custId;
        if (res.insertId && res.insertId !== 0) custId = res.insertId;
        else {
          const [rows] = await conn.query('SELECT customer_id FROM customers WHERE identification_number = ?', [idnum]);
          custId = rows[0].customer_id;
        }
        customerMap.set(idnum, custId);
      }
    }

    // 3) Insert invoices unique
    const invoiceMap = new Map();
    for (const r of records) {
      const invNum = (r['Número de Factura'] || '').toString().trim();
      if (!invNum) continue;
      if (!invoiceMap.has(invNum)) {
        const billing_period = (r['Periodo de Facturación'] || '').toString().trim();
        const amount_billed = parseFloat((r['Monto Facturado'] || 0) || 0);
        const custId = customerMap.get((r['Número de Identificación'] || '').toString().trim());
        const [res] = await conn.query(
          `INSERT INTO invoices (invoice_number, billing_period, amount_billed, customer_id)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE billing_period = VALUES(billing_period), amount_billed = VALUES(amount_billed)`,
          [invNum, billing_period, amount_billed, custId]
        );
        let invId;
        if (res.insertId && res.insertId !== 0) invId = res.insertId;
        else {
          const [rows] = await conn.query('SELECT invoice_id FROM invoices WHERE invoice_number = ?', [invNum]);
          invId = rows[0].invoice_id;
        }
        invoiceMap.set(invNum, invId);
      }
    }

    // 4) Insert transactions (payments)
    for (const r of records) {
      const txId = (r['ID de la Transacción'] || '').toString().trim();
      if (!txId) continue;
      const datetime = (r['Fecha y Hora de la Transacción'] || '').toString().trim();
      // try to normalize datetime if needed
      const txAmount = parseFloat((r['Monto de la Transacción'] || 0) || 0);
      const status = (r['Estado de la Transacción'] || '').trim();
      const type = (r['Tipo de Transacción'] || '').trim();
      const custId = customerMap.get((r['Número de Identificación'] || '').toString().trim());
      const platformName = (r['Plataforma Utilizada'] || '').trim();
      const platformId = platformMap.get(platformName) || null;
      const invId = invoiceMap.get((r['Número de Factura'] || '').toString().trim()) || null;
      const amountPaid = parseFloat((r['Monto Pagado'] || 0) || 0);

      // Insert ignoring duplicate txId
      await conn.query(
        `INSERT INTO transactions
        (transaction_id, transaction_datetime, transaction_amount, transaction_status, transaction_type, customer_id, platform_id, invoice_id, amount_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE transaction_status = VALUES(transaction_status)`,
        [txId, datetime || null, txAmount, status, type, custId, platformId, invId, amountPaid]
      );
    }

    await conn.commit();
    console.log('Seeders executed successfully.');
  } catch (err) {
    await conn.rollback();
    console.error('Seeding error:', err);
    throw err;
  } finally {
    conn.release();
  }
}

// If run directly, execute
if (require.main === module) {
  runSeed().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = runSeed;
Notas:

El script maneja duplicados con ON DUPLICATE KEY UPDATE.

Asume que data.csv tiene cabeceras exactas. Si usas otros nombres, ajústalos.

El script retorna / lanza errores si algo falla.

3.4 server/index.js — Express con endpoints (CRUD + reports + seed endpoint)
js
Copiar
Editar
// server/index.js
const express = require('express');
const pool = require('./db');
const runSeed = require('./seeders/run_seeders');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CRUD: Customers ---

// GET /api/customers
app.get('/api/customers', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const offset = (page - 1) * limit;
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY customer_id LIMIT ? OFFSET ?', [limit, offset]);
    res.json({ data: rows, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/:id
app.get('/api/customers/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE customer_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers
app.post('/api/customers',
  body('name').isLength({ min: 1 }),
  body('identification_number').isLength({ min: 1 }),
  body('email').optional().isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, identification_number, address, phone, email } = req.body;
    try {
      const [result] = await pool.query(
        `INSERT INTO customers (name, identification_number, address, phone, email)
         VALUES (?, ?, ?, ?, ?)`,
        [name, identification_number, address || null, phone || null, email || null]
      );
      const inserted = { customer_id: result.insertId, name, identification_number, address, phone, email };
      res.status(201).json(inserted);
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate entry (identification or email)' });
      res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/customers/:id
app.put('/api/customers/:id',
  body('email').optional().isEmail(),
  async (req, res) => {
    const id = req.params.id;
    const { name, identification_number, address, phone, email } = req.body;
    try {
      const [result] = await pool.query(
        `UPDATE customers SET name = COALESCE(?, name),
         identification_number = COALESCE(?, identification_number),
         address = COALESCE(?, address),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email)
         WHERE customer_id = ?`,
        [name, identification_number, address, phone, email, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
      const [rows] = await pool.query('SELECT * FROM customers WHERE customer_id = ?', [id]);
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate entry' });
      res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/customers/:id
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM customers WHERE customer_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Reports (advanced queries only accessible via Postman) ---

// 1) Total paid by each customer
app.get('/api/reports/total_paid_by_customer', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.customer_id, c.name, c.identification_number,
             COALESCE(SUM(t.amount_paid), 0) AS total_paid
      FROM customers c
      LEFT JOIN transactions t ON t.customer_id = c.customer_id
      GROUP BY c.customer_id, c.name, c.identification_number
      ORDER BY total_paid DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2) Pending invoices with client and last transaction info
app.get('/api/reports/pending_invoices', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.invoice_id, i.invoice_number, i.billing_period, i.amount_billed,
             COALESCE(SUM(t.amount_paid),0) AS total_paid,
             (i.amount_billed - COALESCE(SUM(t.amount_paid),0)) AS balance,
             c.customer_id, c.name AS customer_name, c.identification_number
      FROM invoices i
      JOIN customers c ON c.customer_id = i.customer_id
      LEFT JOIN transactions t ON t.invoice_id = i.invoice_id
      GROUP BY i.invoice_id
      HAVING balance > 0
      ORDER BY balance DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3) List transactions by platform
app.get('/api/reports/transactions_by_platform/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    const [rows] = await pool.query(`
      SELECT t.transaction_id, t.transaction_datetime, t.transaction_amount, t.amount_paid, t.transaction_status,
             c.customer_id, c.name AS customer_name, i.invoice_id, i.invoice_number
      FROM transactions t
      LEFT JOIN platforms p ON p.platform_id = t.platform_id
      LEFT JOIN customers c ON c.customer_id = t.customer_id
      LEFT JOIN invoices i ON i.invoice_id = t.invoice_id
      WHERE p.name = ?
      ORDER BY t.transaction_datetime DESC
    `, [platform]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Extra endpoint: execute seed (POST /api/seed) ---
app.post('/api/seed', async (req, res) => {
  try {
    await runSeed();
    res.json({ success: true, message: 'Seed executed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Seed failed', detail: err.message });
  }
});

// Serve static frontend (optional)
app.use('/', express.static(path.join(__dirname, '..', 'app')));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
Asegúrate de tener server/seeders/run_seeders.js exportado correctamente y la ruta server/data/data.csv presente. El endpoint POST /api/seed invocará runSeed() y ejecutará la carga masiva desde el CSV.

4) Frontend minimal — app/
4.1 app/index.html (dashboard customers básico con Bootstrap)
html
Copiar
Editar
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Fintech Dashboard - Customers</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="/css/styles.css" rel="stylesheet">
</head>
<body>
  <div class="container py-4">
    <h1 class="mb-3">Fintech - Customers Dashboard</h1>

    <div class="mb-3">
      <button id="btnReload" class="btn btn-primary">Reload customers</button>
      <button id="btnOpenNew" class="btn btn-success">New customer</button>
      <button id="btnRunSeed" class="btn btn-warning">Run CSV Seed (extra)</button>
    </div>

    <div id="alert" style="display:none" class="alert"></div>

    <table class="table table-striped" id="customersTable">
      <thead>
        <tr>
          <th>ID</th><th>Name</th><th>Identification</th><th>Email</th><th>Phone</th><th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <!-- Modal for new/edit -->
  <div class="modal fade" id="customerModal" tabindex="-1">
    <div class="modal-dialog">
      <form id="customerForm" class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Customer</h5></div>
        <div class="modal-body">
          <input type="hidden" id="customer_id">
          <div class="mb-2"><label>Name</label><input id="name" class="form-control" required></div>
          <div class="mb-2"><label>Identification</label><input id="identification_number" class="form-control" required></div>
          <div class="mb-2"><label>Email</label><input id="email" type="email" class="form-control"></div>
          <div class="mb-2"><label>Phone</label><input id="phone" class="form-control"></div>
          <div class="mb-2"><label>Address</label><textarea id="address" class="form-control"></textarea></div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
4.2 app/css/styles.css (very small)
css
Copiar
Editar
/* app/css/styles.css */
body { background: #f8f9fa; }
.table td, .table th { vertical-align: middle; }
4.3 app/js/main.js
js
Copiar
Editar
// app/js/main.js
const API = '';

async function fetchCustomers() {
  const res = await fetch('/api/customers');
  const data = await res.json();
  return data.data || data;
}

function showAlert(msg, type='info') {
  const a = document.getElementById('alert');
  a.style.display = 'block';
  a.className = 'alert alert-' + type;
  a.innerText = msg;
  setTimeout(()=> a.style.display='none', 3000);
}

async function loadTable() {
  const table = document.querySelector('#customersTable tbody');
  table.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try {
    const { data } = await fetch('/api/customers').then(r => r.json());
    table.innerHTML = '';
    data.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.customer_id}</td>
        <td>${c.name}</td>
        <td>${c.identification_number}</td>
        <td>${c.email || ''}</td>
        <td>${c.phone || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-edit" data-id="${c.customer_id}">Edit</button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${c.customer_id}">Delete</button>
        </td>
      `;
      table.appendChild(tr);
    });
  } catch (err) {
    table.innerHTML = '<tr><td colspan="6">Error loading</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTable();

  document.getElementById('btnReload').addEventListener('click', loadTable);
  document.getElementById('btnOpenNew').addEventListener('click', () => {
    document.getElementById('customerForm').reset();
    document.getElementById('customer_id').value = '';
    new bootstrap.Modal(document.getElementById('customerModal')).show();
  });

  document.getElementById('customersTable').addEventListener('click', async (e) => {
    if (e.target.matches('.btn-edit')) {
      const id = e.target.dataset.id;
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) return showAlert('Error fetching customer', 'danger');
      const data = await res.json();
      document.getElementById('customer_id').value = data.customer_id;
      document.getElementById('name').value = data.name;
      document.getElementById('identification_number').value = data.identification_number;
      document.getElementById('email').value = data.email || '';
      document.getElementById('phone').value = data.phone || '';
      document.getElementById('address').value = data.address || '';
      new bootstrap.Modal(document.getElementById('customerModal')).show();
    } else if (e.target.matches('.btn-del')) {
      if (!confirm('Delete customer?')) return;
      const id = e.target.dataset.id;
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Deleted', 'success');
        loadTable();
      } else {
        showAlert('Delete failed', 'danger');
      }
    }
  });

  document.getElementById('customerForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('customer_id').value;
    const payload = {
      name: document.getElementById('name').value,
      identification_number: document.getElementById('identification_number').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value
    };
    let res;
    if (id) {
      res = await fetch(`/api/customers/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    } else {
      res = await fetch(`/api/customers`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    }
    if (res.ok) {
      showAlert('Saved', 'success');
      loadTable();
      bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
    } else {
      const err = await res.json();
      showAlert('Error saving: ' + (err.error || JSON.stringify(err)), 'danger');
    }
  });

  document.getElementById('btnRunSeed').addEventListener('click', async () => {
    if (!confirm('Run CSV seed? This will insert data from server/data/data.csv')) return;
    const res = await fetch('/api/seed', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showAlert('Seed executed', 'success');
      loadTable();
    } else {
      showAlert('Seed failed: ' + (data.error || data.detail || JSON.stringify(data)), 'danger');
    }
  });
});
5) Postman collection (esqueleto) — Fintech.postman_collection.json
Te proporciono un JSON mínimo con las rutas principales (puedes importarlo en Postman y añadir ejemplos concretos). Aquí dejo un ejemplo simplificado (cópialo y guárdalo como Fintech.postman_collection.json):

json
Copiar
Editar
{
  "info": {
    "name": "Fintech API - pd_samuel_arena_caiman",
    "description": "Collection for customers CRUD and reports",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Customers - List",
      "request": {
        "method": "GET",
        "header": [],
        "url": { "raw": "http://localhost:3000/api/customers", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","customers"] }
      }
    },
    {
      "name": "Customers - Get by ID",
      "request": { "method": "GET", "url": { "raw": "http://localhost:3000/api/customers/1", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","customers","1"] } }
    },
    {
      "name": "Customers - Create",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": { "mode": "raw", "raw": "{\"name\":\"John Doe\",\"identification_number\":\"12345\",\"email\":\"john@example.com\"}" },
        "url": { "raw": "http://localhost:3000/api/customers", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","customers"] }
      }
    },
    {
      "name": "Customers - Update",
      "request": {
        "method": "PUT",
        "header": [{"key":"Content-Type","value":"application/json"}],
        "body": { "mode": "raw", "raw": "{\"name\":\"John Updated\",\"email\":\"john2@example.com\"}" },
        "url": { "raw": "http://localhost:3000/api/customers/1", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","customers","1"] }
      }
    },
    {
      "name": "Customers - Delete",
      "request": { "method": "DELETE", "url": { "raw": "http://localhost:3000/api/customers/1", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","customers","1"] } }
    },
    {
      "name": "Report - Total paid by customer",
      "request": { "method": "GET", "url": { "raw": "http://localhost:3000/api/reports/total_paid_by_customer", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","reports","total_paid_by_customer"] } }
    },
    {
      "name": "Report - Pending invoices",
      "request": { "method": "GET", "url": { "raw": "http://localhost:3000/api/reports/pending_invoices", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","reports","pending_invoices"] } }
    },
    {
      "name": "Report - Transactions by platform",
      "request": { "method": "GET", "url": { "raw": "http://localhost:3000/api/reports/transactions_by_platform/Nequi", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","reports","transactions_by_platform","Nequi"] } }
    },
    {
      "name": "Seed (run CSV)",
      "request": { "method": "POST", "url": { "raw": "http://localhost:3000/api/seed", "protocol": "http", "host": ["localhost"], "port": "3000", "path": ["api","seed"] } }
    }
  ]
}
6) README (ENGLISH) — README.md
Guarda este archivo en la raíz del proyecto. Está completo y explica cómo ejecutar todo.

markdown
Copiar
Editar
# Fintech Data Organizer - pd_samuel_arena_caiman

**Author:** Samuel Arena (clan: caiman)  
**Project:** Organize Fintech transactions (Nequi / Daviplata) into a normalized MySQL database, provide CRUD and reports.

---

## Introduction

This project reads a provided Excel file of transactions and normalizes the data into a relational MySQL database (`pd_samuel_arena_caiman`). It includes a Node.js/Express backend API, a small frontend dashboard for managing customers, seeders to load the CSV data into the database, and three advanced queries required by the assignment.

---

## Requirements

- Node.js >= 16
- MySQL server
- npm
- (optional) Postman for testing collection

---

## Setup & Installation

1. Clone the repository.
2. Create MySQL database and user or use root.
3. Import DDL:
   ```bash
   mysql -u root -p < ddl/pd_samuel_arena_caiman.sql
Place the CSV file converted from Excel at server/data/data.csv.

Create .env file with DB credentials:

ini
Copiar
Editar
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pd_samuel_arena_caiman
PORT=3000
Install Node dependencies:

bash
Copiar
Editar
npm install
Run
Start server:

bash
Copiar
Editar
npm run dev
Open the frontend at http://localhost:3000/ to use the simple dashboard.

CSV Loading (Massive load)
Convert data.xlsx to data.csv and save to server/data/data.csv.

Two ways to seed:

Manual (run the seeder script):

bash
Copiar
Editar
node server/seeders/run_seeders.js
Via API (extra endpoint):

http
Copiar
Editar
POST http://localhost:3000/api/seed
The seeder inserts platforms, customers, invoices and transactions in the correct order and uses deduplication.

API
Customers (CRUD)
GET /api/customers — list customers (pagination optional)

GET /api/customers/:id — get customer

POST /api/customers — create customer

Body: { name, identification_number, address?, phone?, email? }

PUT /api/customers/:id — update customer

DELETE /api/customers/:id — delete customer

Reports (advanced queries)
GET /api/reports/total_paid_by_customer
Returns each customer and the sum of amount_paid.

GET /api/reports/pending_invoices
Returns invoices with outstanding balances and customer info.

GET /api/reports/transactions_by_platform/:platform
Returns transactions filtered by platform name.

Extra
POST /api/seed — Execute CSV seeding (extra credit). Make sure server/data/data.csv exists.

Normalization (1NF → 3NF) — Summary
Original sheet had repeated customer fields and repeated platform names. Normalization steps:

1NF: Every field atomic — each transaction row becomes an atomic record.

2NF: Separated partial dependencies — customer data moved to customers.

3NF: Removed transitive dependencies — platforms moved to platforms, invoices to invoices, and transactions reference them by foreign keys.

Final tables: customers, platforms, invoices, transactions.

Model (ER) — brief
customers (customer_id, name, identification_number, address, phone, email)

platforms (platform_id, name)

invoices (invoice_id, invoice_number, billing_period, amount_billed, customer_id)

transactions (transaction_id, transaction_datetime, transaction_amount, transaction_status, transaction_type, customer_id, platform_id, invoice_id, amount_paid)

(An image of the relational model should be included in docs/ — you can export from draw.io and add docs/model_relational.png)

Postman
Import Fintech.postman_collection.json and test the API endpoints (CRUD + reports + seed).

Developer
Samuel Arena (clan: caiman)
Email: your-email@example.com (please update)

Notes & Improvements
Add authentication (JWT) for production.

Add pagination and filtering for large datasets.

Add transactions history and reconciliation UI for invoices.

yaml
Copiar
Editar

---

# 7) Modelo relacional (breve explicación para draw.io)
- Crea 4 rectángulos: `customers`, `platforms`, `invoices`, `transactions`.
- Añade PK (PK) y FKs:
  - `invoices.customer_id -> customers.customer_id`
  - `transactions.customer_id -> customers.customer_id`
  - `transactions.platform_id -> platforms.platform_id`
  - `transactions.invoice_id -> invoices.invoice_id`
- Exporta a PNG y colócalo en `docs/model_relacional.png`.

Si quieres, yo puedo crear el PNG por ti y añadirlo a la carpeta `docs/` (dímelo y lo hago).

---

# 8) Qué necesito de ti para terminar todo y empaquetarlo ahora mismo
1. Confirma la contraseña y acceso a MySQL **si quieres que yo pruebe ejecutar** migrations/seeders en este entorno (por privacidad y seguridad, no lo pongas aquí — normalmente lo harás localmente). No es necesario que me la des: puedo generar todo listo para que lo ejecutes localmente.
2. ¿Quieres que genere y suba el `docs/model_relacional.png` ahora mismo? (puedo generarlo automáticamente y dejarlo en `docs/`).
3. ¿Quieres que agregue JWT auth mínima? (no requerido por el enunciado).

---

# Siguientes pasos que puedo hacer ahora mismo (elige una):
- (A) Empaquetar todos los archivos y mostrártelos aquí en la conversación para que copies (DDL, server files, frontend files, postman JSON, README) — **lista completa de archivos con su contenido**.
- (B) Además generar `docs/model_relacional.png` y añadirlo.
- (C) Mostrarte exactamente cómo ejecutar paso por paso (comandos) para que levantes todo en tu máquina (MySQL + Node).
- (D) Todo lo anterior (A + B + C).

Dime qué opción quieres que haga ahora y lo procedo de inmediato. Si prefieres, empiezo creando todos los archivos en la estructura del proyecto y te doy un .zip listo para subir a Moodle. ¿Lo empaqueto ya?







Dijiste:
el script de la base de datos va dentro de docs el archivo.sql 


ChatGPT dijo:
Exacto, Samuel 👍.
Siguiendo la misma lógica de la estructura de biblioteca-easy-main, el script SQL (pd_samuel_arena_caiman.sql) debe ir dentro de la carpeta docs/ junto con:

El modelo relacional en imagen (model_relacional.png o .jpg).

La colección de Postman (Fintech.postman_collection.json).

Cualquier documentación adicional (por ejemplo, un PDF con el enunciado).

Quedaría así la estructura base para tu proyecto:

python-repl
Copiar
Editar
📂 docs/
   ├── pd_samuel_arena_caiman.sql       ← Script DDL de la base de datos
   ├── model_relacional.png             ← Imagen del diagrama ER
   ├── Fintech.postman_collection.json  ← Colección Postman
   └── README.md                        ← (también puede ir en raíz, pero se puede tener copia aquí)
📂 server/
📂 app/
...
Si quieres, puedo dejártelo ya creado en /docs/pd_samuel_arena_caiman.sql con el contenido listo para ejecutar en MySQL para que solo lo copies.

¿Quieres que te lo ponga ahora mismo con la ruta y contenid