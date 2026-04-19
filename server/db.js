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
        role VARCHAR(50) DEFAULT 'student',
        bio TEXT,
        preferences JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE users ADD COLUMN bio TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE users ADD COLUMN preferences JSONB;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;

      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        url TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_members (
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS team_invitations (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$
      BEGIN
        BEGIN
          ALTER TABLE messages ADD COLUMN message_type VARCHAR(40) DEFAULT 'text';
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE messages ADD COLUMN metadata JSONB;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE messages ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END;
      END $$;

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reported_entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database ready.');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDb };
