import pool from '../db.js';

export async function getInvoices(req, res) {
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY date DESC');
    const invoices = result.rows.map(r => ({
      id: r.id, invoiceNumber: r.invoice_number, clientName: r.client_name,
      clientId: r.client_id, clientPhone: r.client_phone,
      items: r.items || [], subtotal: parseFloat(r.subtotal), tax: parseFloat(r.tax),
      discount: parseFloat(r.discount), total: parseFloat(r.total), profit: parseFloat(r.profit),
      date: r.date, status: r.status, paymentMethod: r.payment_method,
      paymentStatus: r.payment_status, amountPaid: parseFloat(r.amount_paid || 0),
      amountDue: parseFloat(r.amount_due || 0), notes: r.notes, cashierName: r.cashier_name
    }));
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createInvoice(req, res) {
  const { id, invoiceNumber, clientName, clientId, clientPhone, items, subtotal, tax, discount, total, profit, date, status, paymentMethod, paymentStatus, amountPaid, amountDue, notes, cashierName } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO invoices (id, invoice_number, client_name, client_id, client_phone, items, subtotal, tax, discount, total, profit, date, status, payment_method, payment_status, amount_paid, amount_due, notes, cashier_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [id, invoiceNumber, clientName, clientId || null, clientPhone || null,
       JSON.stringify(items || []), subtotal, tax, discount, total, profit, date,
       status, paymentMethod, paymentStatus || 'paid', amountPaid || 0, amountDue || 0,
       notes || null, cashierName]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateInvoice(req, res) {
  const { id } = req.params;
  const { invoiceNumber, clientName, clientId, clientPhone, items, subtotal, tax, discount, total, profit, date, status, paymentMethod, paymentStatus, amountPaid, amountDue, notes, cashierName } = req.body;
  try {
    const result = await pool.query(
      `UPDATE invoices SET invoice_number=$1, client_name=$2, client_id=$3, client_phone=$4, items=$5,
       subtotal=$6, tax=$7, discount=$8, total=$9, profit=$10, date=$11, status=$12,
       payment_method=$13, payment_status=$14, amount_paid=$15, amount_due=$16, notes=$17, cashier_name=$18
       WHERE id=$19 RETURNING *`,
      [invoiceNumber, clientName, clientId || null, clientPhone || null, JSON.stringify(items || []),
       subtotal, tax, discount, total, profit, date, status, paymentMethod,
       paymentStatus || 'paid', amountPaid || 0, amountDue || 0, notes || null, cashierName, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteInvoice(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
