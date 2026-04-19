const request = require('supertest');
const { createApp } = require('../app');
const { initDb, pool } = require('../db');

let cachedApp;

async function getApp() {
  if (!cachedApp) {
    await initDb();
    cachedApp = createApp();
  }
  return cachedApp;
}

function uniqueEmail(prefix = 'user') {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`;
}

async function registerUser(app, overrides = {}) {
  const body = {
    email: uniqueEmail(overrides.role || 'user'),
    password: 'Password123!',
    fullName: 'Test User',
    role: 'student',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, body };
}

async function closePool() {
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
}

module.exports = { getApp, uniqueEmail, registerUser, closePool, request };
