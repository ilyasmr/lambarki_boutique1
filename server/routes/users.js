import pool from '../db.js';

export async function getUsers(req, res) {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
    const users = result.rows.map(r => ({
      id: r.id, username: r.username, name: r.name, role: r.role,
      email: r.email, active: r.active, password: r.password
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  const { id, username, name, role, email, active, password } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (id, username, name, role, email, active, password)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, username, name, role, email, active !== false, password || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { username, name, role, email, active, password } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET username=$1, name=$2, role=$3, email=$4, active=$5, password=$6 WHERE id=$7 RETURNING *`,
      [username, name, role, email, active !== false, password || '', id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
