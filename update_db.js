import pool from './server/db.js';

async function updateDb() {
  try {
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1');
    await pool.query('UPDATE products SET version = 1 WHERE version IS NULL');
    console.log('✅ Added version column to products table');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

updateDb();
