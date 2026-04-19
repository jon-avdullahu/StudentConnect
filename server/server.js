require('dotenv').config();
const { createApp } = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 5001;
const app = createApp();

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
