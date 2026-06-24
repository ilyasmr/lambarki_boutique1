import pool from '../db.js';

export async function getActivities(req, res) {
  try {
    const result = await pool.query('SELECT * FROM activities ORDER BY date DESC LIMIT 200');
    const activities = result.rows.map(r => ({
      id: r.id, type: r.type, date: r.date, operator: r.operator,
      descriptionAr: r.description_ar, descriptionFr: r.description_fr, targetId: r.target_id
    }));
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createActivity(req, res) {
  const { id, type, date, operator, descriptionAr, descriptionFr, targetId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO activities (id, type, date, operator, description_ar, description_fr, target_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, type, date, operator, descriptionAr, descriptionFr, targetId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
