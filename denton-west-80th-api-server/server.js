require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  })
);

app.use(express.json({ limit: '100kb' }));

// Serve visitor-uploaded photos (same disk location the upload route writes to)
const UPLOAD_DIR = path.join(path.dirname(process.env.DB_PATH || path.join(__dirname, 'data', 'celebration.db')), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Basic rate limiting on form submissions to deter spam/abuse
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' },
});
app.use('/api', (req, res, next) => {
  if (req.method === 'POST') return submitLimiter(req, res, next);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'denton-west-80th-api-simple' }));

app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Denton-West 80th API (simple) listening on port ${PORT}`);
});
