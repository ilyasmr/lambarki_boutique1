import pool from '../db.js';

// GET all products
export async function getProducts(req, res) {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
    const products = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      buyPrice: parseFloat(r.buy_price || 0),
      sellPrice: parseFloat(r.sell_price || 0),
      category: r.category,
      stock: parseInt(r.stock || 0),
      minStockAlert: parseInt(r.min_stock_alert || 0),
      description: r.description || '',
      image: r.image || ''
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST create product
export async function createProduct(req, res) {
  const { id, name, sku, buyPrice, sellPrice, category, stock, minStockAlert, description, image } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (id, name, sku, buy_price, sell_price, category, stock, min_stock_alert, description, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, name, sku, buyPrice, sellPrice, category, stock, minStockAlert, description, image || '']
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      sku: r.sku,
      buyPrice: parseFloat(r.buy_price || 0),
      sellPrice: parseFloat(r.sell_price || 0),
      category: r.category,
      stock: parseInt(r.stock || 0),
      minStockAlert: parseInt(r.min_stock_alert || 0),
      description: r.description || '',
      image: r.image || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT update product
export async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, sku, buyPrice, sellPrice, category, stock, minStockAlert, description, image } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET name=$1, sku=$2, buy_price=$3, sell_price=$4, category=$5, stock=$6,
       min_stock_alert=$7, description=$8, image=$9 WHERE id=$10 RETURNING *`,
      [name, sku, buyPrice, sellPrice, category, stock, minStockAlert, description, image || '', id]
    );
    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      sku: r.sku,
      buyPrice: parseFloat(r.buy_price || 0),
      sellPrice: parseFloat(r.sell_price || 0),
      category: r.category,
      stock: parseInt(r.stock || 0),
      minStockAlert: parseInt(r.min_stock_alert || 0),
      description: r.description || '',
      image: r.image || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE product
export async function deleteProduct(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
