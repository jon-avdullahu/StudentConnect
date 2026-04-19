require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createApp } = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 5001;

// Ensure the uploads directory always exists. Render's free disk is ephemeral
// so this folder is recreated empty on every restart unless backed by a paid
// persistent disk; either way, multer needs it to exist.
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = createApp();

const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
