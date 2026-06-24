import pool from '../db.js';

export async function getMovements(req, res) {
  try {
    const result = await pool.query('SELECT * FROM stock_movements ORDER BY date DESC');
    const movements = result.rows.map(r => ({
      id: r.id, productId: r.product_id, productName: r.product_name,
      type: r.type, qty: parseInt(r.qty), date: r.date,
      reason: r.reason, operator: r.operator, batchId: r.batch_id
    }));
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createMovement(req, res) {
  const { id, productId, productName, type, qty, date, reason, operator, batchId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO stock_movements (id, product_id, product_name, type, qty, date, reason, operator, batch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, productId, productName, type, qty, date, reason, operator, batchId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteMovement(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM stock_movements WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
