const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, university } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, university) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, university, created_at',
      [email.toLowerCase(), passwordHash, fullName.trim(), university?.trim() || null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { id: user.id, email: user.email, full_name: user.full_name, university: user.university }, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, university FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, university: user.university },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;
