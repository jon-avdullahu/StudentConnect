const { pool } = require('../db');

class UserModel {
  static async create(email, passwordHash, fullName, university, role = 'student') {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, university, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, university, created_at, role',
      [email.toLowerCase(), passwordHash, fullName.trim(), university?.trim() || null, role]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, university, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findProfileById(id) {
    const result = await pool.query(
      `SELECT id, email, full_name, university, role, bio, preferences, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updateProfile(id, updates) {
    const parts = [];
    const values = [];
    let i = 1;
    if (updates.full_name !== undefined) {
      parts.push(`full_name = $${i++}`);
      values.push(updates.full_name);
    }
    if (updates.university !== undefined) {
      parts.push(`university = $${i++}`);
      values.push(updates.university);
    }
    if (updates.bio !== undefined) {
      parts.push(`bio = $${i++}`);
      values.push(updates.bio);
    }
    if (updates.preferences !== undefined) {
      parts.push(`preferences = $${i++}::jsonb`);
      values.push(JSON.stringify(updates.preferences));
    }
    if (parts.length === 0) return null;
    values.push(id);
    const q = `UPDATE users SET ${parts.join(', ')} WHERE id = $${i} RETURNING id, email, full_name, university, role, bio, preferences, created_at`;
    const result = await pool.query(q, values);
    return result.rows[0];
  }

  static async listPublicStudents({ excludeUserId, search, limit, offset }) {
    const params = [excludeUserId];
    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      const s = `$${params.length}`;
      searchClause = ` AND (
        full_name ILIKE ${s}
        OR COALESCE(university, '') ILIKE ${s}
        OR COALESCE(bio, '') ILIKE ${s}
        OR COALESCE(preferences::text, '') ILIKE ${s}
      )`;
    }
    params.push(limit, offset);
    const lim = `$${params.length - 1}`;
    const off = `$${params.length}`;
    const q = `
      SELECT id, full_name, university, bio, preferences, created_at
      FROM users
      WHERE role = 'student' AND id <> $1
      ${searchClause}
      ORDER BY full_name ASC
      LIMIT ${lim} OFFSET ${off}
    `;
    const result = await pool.query(q, params);
    return result.rows;
  }

  static async getPublicStudentById(id) {
    const result = await pool.query(
      `SELECT id, full_name, university, bio, preferences, created_at
       FROM users WHERE id = $1 AND role = 'student'`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = UserModel;
