const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// Insert route handlers
const handlers = `
// --- WITHDRAWALS ---
async function getWithdrawals(req, res) {
  try {
    const result = await db.query('SELECT * FROM withdrawals ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function createWithdrawal(req, res) {
  const { id, amount, date, person, responsible, notes } = req.body;
  try {
    await db.query(
      'INSERT INTO withdrawals (id, amount, date, person, responsible, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, amount, date, person, responsible, notes]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function updateWithdrawal(req, res) {
  const { id } = req.params;
  const { amount, person, responsible, notes } = req.body;
  try {
    await db.query(
      'UPDATE withdrawals SET amount=$1, person=$2, responsible=$3, notes=$4 WHERE id=$5',
      [amount, person, responsible, notes, id]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function deleteWithdrawal(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM withdrawals WHERE id=$1', [id]);
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// --- DRAWER STATE ---
async function getDrawerState(req, res) {
  try {
    let result = await db.query("SELECT * FROM drawer_state WHERE id='singleton'");
    if (result.rows.length === 0) {
      await db.query("INSERT INTO drawer_state (id) VALUES ('singleton')");
      result = await db.query("SELECT * FROM drawer_state WHERE id='singleton'");
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function updateDrawerState(req, res) {
  const { withdrawals_adjustment, cash_income_adjustment, drawer_balance_adjustment } = req.body;
  try {
    await db.query(
      "UPDATE drawer_state SET withdrawals_adjustment=$1, cash_income_adjustment=$2, drawer_balance_adjustment=$3 WHERE id='singleton'",
      [withdrawals_adjustment || 0, cash_income_adjustment || 0, drawer_balance_adjustment || 0]
    );
    res.json({ id: 'singleton' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}
`;

// Add handlers before 'app.get('/api/products''
code = code.replace("app.get('/api/products',", handlers + "\napp.get('/api/products',");

// Insert route registrations
const routes = `
app.get('/api/withdrawals', getWithdrawals);
app.post('/api/withdrawals', createWithdrawal);
app.put('/api/withdrawals/:id', updateWithdrawal);
app.delete('/api/withdrawals/:id', deleteWithdrawal);

app.get('/api/drawer_state', getDrawerState);
app.put('/api/drawer_state', updateDrawerState);
`;

code = code.replace("app.post('/api/activities', createActivity);", "app.post('/api/activities', createActivity);\n" + routes);

// Add to clear system
const clearQueryOld = "await client.query('TRUNCATE TABLE invoices, clients, activities, stock_movements, products');";
const clearQueryNew = "await client.query('TRUNCATE TABLE invoices, clients, activities, stock_movements, products, withdrawals');\n      await client.query(\"UPDATE drawer_state SET withdrawals_adjustment=0, cash_income_adjustment=0, drawer_balance_adjustment=0 WHERE id='singleton'\");";
code = code.replace(clearQueryOld, clearQueryNew);

fs.writeFileSync('server/index.js', code);
console.log('Updated server/index.js');
