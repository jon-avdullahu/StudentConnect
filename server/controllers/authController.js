const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.register = async (req, res) => {
  try {
    const { email, password, fullName, university, role } = req.body;
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
    const validRole = role === 'landlord' ? 'landlord' : 'student';
    const user = await UserModel.create(email, passwordHash, fullName, university, validRole);
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { id: user.id, email: user.email, full_name: user.full_name, university: user.university, role: user.role }, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await UserModel.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, university: user.university, role: user.role },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
};
