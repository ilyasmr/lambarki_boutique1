import pool from '../db.js';

export async function getClients(req, res) {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    const clients = result.rows.map(r => ({
      id: r.id, name: r.name, email: r.email, phone: r.phone,
      address: r.address, joinDate: r.join_date, totalSpent: parseFloat(r.total_spent),
      outstandingDebt: parseFloat(r.outstanding_debt || 0),
      debtDate: r.debt_date, debtDueDate: r.debt_due_date,
      debtPayments: r.debt_payments || [],
      hasPostalCheck: r.has_postal_check || false,
      postalChecks: r.postal_checks || [],
      purchases: r.purchases || []
    }));
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createClient(req, res) {
  const { id, name, email, phone, address, joinDate, totalSpent, outstandingDebt, debtDate, debtDueDate, debtPayments, hasPostalCheck, postalChecks, purchases } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clients (id, name, email, phone, address, join_date, total_spent, outstanding_debt, debt_date, debt_due_date, debt_payments, has_postal_check, postal_checks, purchases)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [id, name, email, phone, address, joinDate, totalSpent || 0, outstandingDebt || 0,
       debtDate || null, debtDueDate || null, JSON.stringify(debtPayments || []),
       hasPostalCheck || false, JSON.stringify(postalChecks || []), JSON.stringify(purchases || [])]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateClient(req, res) {
  const { id } = req.params;
  const { name, email, phone, address, joinDate, totalSpent, outstandingDebt, debtDate, debtDueDate, debtPayments, hasPostalCheck, postalChecks, purchases } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clients SET name=$1, email=$2, phone=$3, address=$4, join_date=$5, total_spent=$6,
       outstanding_debt=$7, debt_date=$8, debt_due_date=$9, debt_payments=$10,
       has_postal_check=$11, postal_checks=$12, purchases=$13 WHERE id=$14 RETURNING *`,
      [name, email, phone, address, joinDate, totalSpent || 0, outstandingDebt || 0,
       debtDate || null, debtDueDate || null, JSON.stringify(debtPayments || []),
       hasPostalCheck || false, JSON.stringify(postalChecks || []), JSON.stringify(purchases || []), id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteClient(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clients WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
