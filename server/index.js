import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

import { getProducts, createProduct, updateProduct, deleteProduct, adjustStock } from './routes/products.js';
import { getClients, createClient, updateClient, deleteClient } from './routes/clients.js';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from './routes/invoices.js';
import { getUsers, createUser, updateUser, deleteUser } from './routes/users.js';
import { getMovements, createMovement, deleteMovement, updateMovement } from './routes/movements.js';
import { getActivities, createActivity, deleteActivity, updateActivity } from './routes/activities.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Products ──────────────────────────────────────────

// --- WITHDRAWALS ---
async function getWithdrawals(req, res) {
  try {
    const result = await db.query('SELECT * FROM withdrawals ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function createWithdrawal(req, res) {
  const { id, amount, date, person, responsible, notes } = req.body;
  try {
    await db.query(
      'INSERT INTO withdrawals (id, amount, date, person, responsible, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, amount, date, person, responsible, notes]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function updateWithdrawal(req, res) {
  const { id } = req.params;
  const { amount, person, responsible, notes } = req.body;
  try {
    await db.query(
      'UPDATE withdrawals SET amount=$1, person=$2, responsible=$3, notes=$4 WHERE id=$5',
      [amount, person, responsible, notes, id]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function deleteWithdrawal(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM withdrawals WHERE id=$1', [id]);
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// --- DRAWER STATE ---
async function getDrawerState(req, res) {
  try {
    let result = await db.query("SELECT * FROM drawer_state WHERE id='singleton'");
    if (result.rows.length === 0) {
      await db.query("INSERT INTO drawer_state (id) VALUES ('singleton')");
      result = await db.query("SELECT * FROM drawer_state WHERE id='singleton'");
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function updateDrawerState(req, res) {
  const { withdrawals_adjustment, cash_income_adjustment, drawer_balance_adjustment } = req.body;
  try {
    await db.query(
      "UPDATE drawer_state SET withdrawals_adjustment=$1, cash_income_adjustment=$2, drawer_balance_adjustment=$3 WHERE id='singleton'",
      [withdrawals_adjustment || 0, cash_income_adjustment || 0, drawer_balance_adjustment || 0]
    );
    res.json({ id: 'singleton' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

app.get('/api/products', getProducts);
app.post('/api/products', createProduct);
app.put('/api/products/:id', updateProduct);
app.put('/api/products/:id/adjust_stock', adjustStock);
app.delete('/api/products/:id', deleteProduct);

// ── Clients ───────────────────────────────────────────
app.get('/api/clients', getClients);
app.post('/api/clients', createClient);
app.put('/api/clients/:id', updateClient);
app.delete('/api/clients/:id', deleteClient);

// ── Invoices ──────────────────────────────────────────
app.get('/api/invoices', getInvoices);
app.post('/api/invoices', createInvoice);
app.put('/api/invoices/:id', updateInvoice);
app.delete('/api/invoices/:id', deleteInvoice);

// ── Users ─────────────────────────────────────────────
app.get('/api/users', getUsers);
app.post('/api/users', createUser);
app.put('/api/users/:id', updateUser);
app.delete('/api/users/:id', deleteUser);

// ── Stock Movements ───────────────────────────────────
app.get('/api/movements', getMovements);
app.post('/api/movements', createMovement);
app.put('/api/movements/:id', updateMovement);
app.delete('/api/movements/:id', deleteMovement);

// ── Activities ────────────────────────────────────────
app.get('/api/activities', getActivities);
app.post('/api/activities', createActivity);

app.get('/api/withdrawals', getWithdrawals);
app.post('/api/withdrawals', createWithdrawal);
app.put('/api/withdrawals/:id', updateWithdrawal);
app.delete('/api/withdrawals/:id', deleteWithdrawal);

app.post('/api/drawer_state/clear', async (req, res) => {
  try {
    await db.query('TRUNCATE TABLE withdrawals');
    await db.query("UPDATE drawer_state SET withdrawals_adjustment=0, cash_income_adjustment=0, drawer_balance_adjustment=0 WHERE id='singleton'");
    res.json({ status: 'ok' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/drawer_state', getDrawerState);
app.put('/api/drawer_state', updateDrawerState);

app.put('/api/activities/:id', updateActivity);
app.delete('/api/activities/:id', deleteActivity);

// ── System Management ─────────────────────────────────
app.post('/api/system/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM activities');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM clients');
    await pool.query("DELETE FROM users WHERE username NOT IN ('admin', 'caissier', 'rachida')");
    res.json({ status: 'success', message: 'All business data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check ──────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ API Server running on http://localhost:${PORT}`);
    console.log(`🗄️  Connected to Neon PostgreSQL`);
  });
}
