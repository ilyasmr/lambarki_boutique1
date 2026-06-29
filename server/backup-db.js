import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runBackup() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('❌ Please specify a backup file path.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('🔄 Fetching database tables...');
    const usersRes = await client.query('SELECT * FROM users');
    const clientsRes = await client.query('SELECT * FROM clients');
    const productsRes = await client.query('SELECT * FROM products');
    const invoicesRes = await client.query('SELECT * FROM invoices');
    const movementsRes = await client.query('SELECT * FROM stock_movements');
    const activitiesRes = await client.query('SELECT * FROM activities');

    const backupData = {
      timestamp: new Date().toISOString(),
      users: usersRes.rows,
      clients: clientsRes.rows.map(r => ({
        id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address,
        joinDate: r.join_date, totalSpent: parseFloat(r.total_spent || 0),
        outstandingDebt: parseFloat(r.outstanding_debt || 0), debtDate: r.debt_date,
        debtDueDate: r.debt_due_date, debtPayments: r.debt_payments || [],
        hasPostalCheck: r.has_postal_check, postalChecks: r.postal_checks || [],
        purchases: r.purchases || []
      })),
      products: productsRes.rows.map(r => ({
        id: r.id, name: r.name, sku: r.sku, buyPrice: parseFloat(r.buy_price || 0),
        sellPrice: parseFloat(r.sell_price || 0), category: r.category,
        stock: parseInt(r.stock || 0), minStockAlert: parseInt(r.min_stock_alert || 0),
        description: r.description, image: r.image
      })),
      invoices: invoicesRes.rows.map(r => ({
        id: r.id, invoiceNumber: r.invoice_number, clientName: r.client_name,
        clientId: r.client_id, clientPhone: r.client_phone, items: r.items || [],
        subtotal: parseFloat(r.subtotal || 0), tax: parseFloat(r.tax || 0),
        discount: parseFloat(r.discount || 0), total: parseFloat(r.total || 0),
        profit: parseFloat(r.profit || 0), date: r.date, status: r.status,
        paymentMethod: r.payment_method, paymentStatus: r.payment_status,
        amountPaid: parseFloat(r.amount_paid || 0), amountDue: parseFloat(r.amount_due || 0),
        notes: r.notes, cashierName: r.cashier_name
      })),
      stockMovements: movementsRes.rows.map(r => ({
        id: r.id, productId: r.product_id, productName: r.product_name,
        type: r.type, qty: parseInt(r.qty || 0), date: r.date,
        reason: r.reason, operator: r.operator, batchId: r.batch_id
      })),
      activities: activitiesRes.rows.map(r => ({
        id: r.id, type: r.type, date: r.date, operator: r.operator,
        descriptionAr: r.description_ar, descriptionFr: r.description_fr, targetId: r.target_id
      }))
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ Database backup saved to: ${backupPath}`);
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runBackup();
