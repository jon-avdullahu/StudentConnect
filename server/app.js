const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { authMiddleware } = require('./middleware/auth');

function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  if (process.env.NODE_ENV !== 'test') {
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: Number(process.env.API_RATE_LIMIT_MAX) || 400,
      message: { error: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', apiLimiter);
  }

  app.get('/', (_req, res) => {
    res.json({ message: 'StudentConnect API is running' });
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/listings', require('./routes/listings'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/me/profile', require('./routes/profile'));
  app.use('/api/students', require('./routes/students'));
  app.use('/api/teams', require('./routes/teams'));

  app.get('/api/me', authMiddleware, async (req, res) => {
    try {
      const UserModel = require('./models/userModel');
      const user = await UserModel.findProfileById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json({
        userId: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        university: user.university,
      });
    } catch (err) {
      console.error('/api/me error:', err);
      res.status(500).json({ error: 'Failed to load user.' });
    }
  });

  return app;
}

module.exports = { createApp };
