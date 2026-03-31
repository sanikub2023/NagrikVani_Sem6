/**
 * db/connection.js
 * Creates and exports a MySQL database connection pool.
 *
 * A "pool" is like a set of pre-opened database connections
 * that are reused — much faster than opening a new connection
 * for every single request.
 *
 * All other files import this instead of connecting directly.
 */

const mysql = require('mysql2/promise');

// ── Create connection pool ──────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'nagrikvaani',
  waitForConnections: true,   // wait if all connections are busy
  connectionLimit:    10,     // max 10 simultaneous connections
  queueLimit:         0,      // unlimited queue
  charset:            'utf8mb4' // supports Hindi, Marathi characters
});

// ── Test connection on startup ──────────────────────────────────
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL database connected successfully!');
    conn.release(); // return connection to pool
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    console.error('    Check your .env file — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1); // stop server if DB is not available
  }
}

testConnection();

module.exports = pool;