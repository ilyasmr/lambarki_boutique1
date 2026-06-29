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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Get the movement details
    const mRes = await client.query('SELECT * FROM stock_movements WHERE id=$1', [id]);
    if (mRes.rows.length > 0) {
      const m = mRes.rows[0];
      const diff = m.type === 'in' ? -parseInt(m.qty) : parseInt(m.qty);
      // 2. Adjust the product stock
      await client.query('UPDATE products SET stock = stock + $1 WHERE id=$2', [diff, m.product_id]);
    }
    // 3. Delete the movement
    await client.query('DELETE FROM stock_movements WHERE id=$1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function updateMovement(req, res) {
  const { id } = req.params;
  const { qty, reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Get the current movement details
    const mRes = await client.query('SELECT * FROM stock_movements WHERE id=$1', [id]);
    if (mRes.rows.length === 0) {
      return res.status(404).json({ error: 'Movement not found' });
    }
    const m = mRes.rows[0];
    const oldQty = parseInt(m.qty);
    const newQty = parseInt(qty);
    
    // If the quantity changed, calculate how much to update the product's stock
    if (oldQty !== newQty) {
      let diff = 0;
      if (m.type === 'in') {
        diff = newQty - oldQty;
      } else {
        diff = oldQty - newQty;
      }
      await client.query('UPDATE products SET stock = stock + $1 WHERE id=$2', [diff, m.product_id]);
    }

    // 2. Update the movement record
    const result = await client.query(
      'UPDATE stock_movements SET qty=$1, reason=$2 WHERE id=$3 RETURNING *',
      [newQty, reason, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
