'use strict';

require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

// One shared connection pool for the whole app.
// Every value comes from .env, nothing is hardcoded.
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // return DATE/DATETIME as plain strings, avoids timezone shifts
});

// Parameterized query helper. Always pass user input through `params`.
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Run several statements in one transaction.
// Usage: await withTransaction(async (conn) => { await conn.execute(...); });
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Used by the dashboard, /health/db and `npm run test:db`.
// Never throws: returns { connected: false, error } when MySQL is not reachable.
async function checkConnection() {
  try {
    const rows = await query(
      `SELECT VERSION() AS version,
              DATABASE() AS db_name,
              (SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') AS table_count`
    );
    return {
      connected: true,
      version: rows[0].version,
      database: rows[0].db_name,
      tableCount: Number(rows[0].table_count)
    };
  } catch (err) {
    return { connected: false, code: err.code || 'UNKNOWN', error: err.message };
  }
}

module.exports = { pool, query, withTransaction, checkConnection };
