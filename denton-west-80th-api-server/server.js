require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS ---
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  })
);

app.use(express.json({ limit: '100kb' }));

// --- Basic rate limiting on form submissions to deter spam/abuse ---
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 submissions per IP per window across all forms
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' },
});
app.use('/api', (req, res, next) => {
  if (req.method === 'POST') return submitLimiter(req, res, next);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'denton-west-80th-api' }));

app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Denton-West 80th API listening on port ${PORT}`);
});
