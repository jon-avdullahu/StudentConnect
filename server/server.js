require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'StudentConnect API is running' });
});

app.use('/api/auth', authRoutes);

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ userId: req.userId });
});

const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
