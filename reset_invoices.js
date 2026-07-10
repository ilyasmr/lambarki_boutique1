import pool from './server/db.js';

async function resetInvoices() {
  try {
    await pool.query('DELETE FROM invoices');
    console.log('✅ Invoices deleted successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetInvoices();
