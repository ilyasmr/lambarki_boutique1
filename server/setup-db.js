import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        email TEXT,
        active BOOLEAN DEFAULT true,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        join_date TEXT,
        total_spent NUMERIC DEFAULT 0,
        outstanding_debt NUMERIC DEFAULT 0,
        debt_date TEXT,
        debt_due_date TEXT,
        debt_payments JSONB DEFAULT '[]',
        has_postal_check BOOLEAN DEFAULT false,
        postal_checks JSONB DEFAULT '[]',
        purchases JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        buy_price NUMERIC NOT NULL DEFAULT 0,
        sell_price NUMERIC NOT NULL DEFAULT 0,
        category TEXT,
        stock INTEGER DEFAULT 0,
        min_stock_alert INTEGER DEFAULT 5,
        description TEXT,
        image TEXT DEFAULT '',
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_id TEXT,
        client_phone TEXT,
        items JSONB DEFAULT '[]',
        subtotal NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        profit NUMERIC DEFAULT 0,
        date TEXT,
        status TEXT DEFAULT 'paid',
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'paid',
        amount_paid NUMERIC DEFAULT 0,
        amount_due NUMERIC DEFAULT 0,
        notes TEXT,
        cashier_name TEXT
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        product_name TEXT,
        type TEXT CHECK (type IN ('in','out')),
        qty INTEGER,
        date TEXT,
        reason TEXT,
        operator TEXT,
        batch_id TEXT
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        amount NUMERIC DEFAULT 0,
        date TEXT,
        person TEXT,
        responsible TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS drawer_state (
        id TEXT PRIMARY KEY DEFAULT 'singleton',
        withdrawals_adjustment NUMERIC DEFAULT 0,
        cash_income_adjustment NUMERIC DEFAULT 0,
        drawer_balance_adjustment NUMERIC DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT,
        date TEXT,
        operator TEXT,
        description_ar TEXT,
        description_fr TEXT,
        target_id TEXT
      );
    `);

    console.log('✅ Tables created successfully!');

    // Seed initial data
    await seedInitialData(client);

    console.log('🎉 Database setup complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedInitialData(client) {
  // Check if already seeded
  const check = await client.query('SELECT COUNT(*) FROM users');
  if (parseInt(check.rows[0].count) > 0) {
    console.log('ℹ️  Data already exists, skipping seed.');
    return;
  }

  console.log('🌱 Seeding initial data...');

  // Users
  const users = [
    { id: 'usr-1', username: 'admin', name: 'Ilias Lambarki', role: 'admin', email: 'lamb.ilyas@gmail.com', active: true, password: 'ilyas_mr3' },
    { id: 'usr-2', username: 'caissier', name: 'Yassine Alami', role: 'cashier', email: 'yassine.alami@lambarki.ma', active: true, password: 'yassine123' },
    { id: 'usr-3', username: 'rachida', name: 'Fouad Lambarki', role: 'admin', email: 'fouad.l@lambarki.ma', active: true, password: 'fouad123' }
  ];
  for (const u of users) {
    await client.query(
      'INSERT INTO users (id, username, name, role, email, active, password) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
      [u.id, u.username, u.name, u.role, u.email, u.active, u.password]
    );
  }

  // Sample Products
  const products = [
    { id: 'prod-1', name: 'Huile d\'olive Extra Vierge 1L', sku: '6111234567890', buyPrice: 45, sellPrice: 65, category: 'Huiles', stock: 120, minStockAlert: 20, description: 'Huile d\'olive marocaine de qualité supérieure' },
    { id: 'prod-2', name: 'Sucre en poudre 1kg', sku: '6111234567891', buyPrice: 8, sellPrice: 12, category: 'Epicerie', stock: 200, minStockAlert: 30, description: 'Sucre blanc raffiné' },
    { id: 'prod-3', name: 'Farine de blé 1kg', sku: '6111234567892', buyPrice: 6, sellPrice: 9, category: 'Epicerie', stock: 150, minStockAlert: 25, description: 'Farine blanche type 55' },
    { id: 'prod-4', name: 'Thé vert Maroc 200g', sku: '6111234567893', buyPrice: 18, sellPrice: 28, category: 'Boissons', stock: 80, minStockAlert: 15, description: 'Thé gunpowder de qualité' },
    { id: 'prod-5', name: 'Sel de table 1kg', sku: '6111234567894', buyPrice: 3, sellPrice: 5, category: 'Epicerie', stock: 5, minStockAlert: 20, description: 'Sel iodé raffiné' }
  ];
  for (const p of products) {
    await client.query(
      'INSERT INTO products (id, name, sku, buy_price, sell_price, category, stock, min_stock_alert, description, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
      [p.id, p.name, p.sku, p.buyPrice, p.sellPrice, p.category, p.stock, p.minStockAlert, p.description, '']
    );
  }

  // Sample Clients
  const clients = [
    { id: 'cli-1', name: 'Ahmed El Amrani', email: 'ahmed.elamrani@yahoo.fr', phone: '0612345678', address: 'Avenue Allal Ben Abdallah, Rabat', joinDate: '2026-03-10', totalSpent: 320, outstandingDebt: 0 },
    { id: 'cli-2', name: 'Hassan Agro', email: 'hassan.agro@gmail.com', phone: '0623456789', address: 'Zone Industrielle Bir Rami, Kénitra', joinDate: '2026-04-15', totalSpent: 420, outstandingDebt: 850 }
  ];
  for (const c of clients) {
    await client.query(
      'INSERT INTO clients (id, name, email, phone, address, join_date, total_spent, outstanding_debt, debt_payments, purchases, postal_checks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING',
      [c.id, c.name, c.email, c.phone, c.address, c.joinDate, c.totalSpent, c.outstandingDebt, '[]', '[]', '[]']
    );
  }

  console.log('✅ Seed data inserted!');
}

setupDatabase();
