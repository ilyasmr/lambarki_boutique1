import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Prevent unhandled errors from crashing the Node server when serverless connections timeout
pool.on('error', (err, client) => {
  console.error('⚠️ Unexpected error on idle client:', err.message);
});

export default pool;
