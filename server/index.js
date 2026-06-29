import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

import { getProducts, createProduct, updateProduct, deleteProduct } from './routes/products.js';
import { getClients, createClient, updateClient, deleteClient } from './routes/clients.js';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from './routes/invoices.js';
import { getUsers, createUser, updateUser, deleteUser } from './routes/users.js';
import { getMovements, createMovement, deleteMovement } from './routes/movements.js';
import { getActivities, createActivity } from './routes/activities.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Products ──────────────────────────────────────────
app.get('/api/products', getProducts);
app.post('/api/products', createProduct);
app.put('/api/products/:id', updateProduct);
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
app.delete('/api/movements/:id', deleteMovement);

// ── Activities ────────────────────────────────────────
app.get('/api/activities', getActivities);
app.post('/api/activities', createActivity);

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
