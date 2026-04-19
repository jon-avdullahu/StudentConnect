#!/usr/bin/env node

/**
 * Bootstrap an admin user or promote an existing user to admin.
 *
 * Usage:
 *   node scripts/seed-admin.js                         # interactive-style defaults
 *   ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=secret node scripts/seed-admin.js
 *   PROMOTE_EMAIL=existing@user.com node scripts/seed-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@studentconnect.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const PROMOTE_EMAIL = process.env.PROMOTE_EMAIL;

async function run() {
  if (PROMOTE_EMAIL) {
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [PROMOTE_EMAIL.toLowerCase()]);
    if (existing.rowCount === 0) {
      console.error(`No user found with email: ${PROMOTE_EMAIL}`);
      process.exit(1);
    }
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', PROMOTE_EMAIL.toLowerCase()]);
    console.log(`Promoted ${PROMOTE_EMAIL} to admin.`);
  } else {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
    if (existing.rowCount > 0) {
      await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', ADMIN_EMAIL.toLowerCase()]);
      console.log(`User ${ADMIN_EMAIL} already exists — role updated to admin.`);
    } else {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
        [ADMIN_EMAIL.toLowerCase(), hash, 'Admin', 'admin']
      );
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
