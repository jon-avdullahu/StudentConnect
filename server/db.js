const { Pool } = require('pg');

const connectionString = (process.env.DATABASE_URL || '').trim();

function parsePgUrl(urlString) {
  try {
    const u = new URL(urlString.replace(/^postgresql:/, 'http:'));
    const password = (u.password || '').trim();
    return {
      host: (u.hostname || 'localhost').trim(),
      port: parseInt(u.port, 10) || 5432,
      user: (u.username || '').trim() || undefined,
      password,
      database: u.pathname ? u.pathname.slice(1).replace(/%2F/g, '/').trim() : undefined,
    };
  } catch {
    return null;
  }
}

const parsed = connectionString ? parsePgUrl(connectionString) : null;
const pool = new Pool(
  parsed
    ? {
        ...parsed,
        password: String(parsed.password ?? ''),
      }
    : { connectionString: undefined }
);

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        university VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database ready.');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDb };
