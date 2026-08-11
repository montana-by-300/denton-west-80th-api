const express = require('express');
const db = require('../db');
const { requireAdmin, isNonEmptyString, isValidEmail, toCSV, sendCSV } = require('../helpers');

const router = express.Router();

/* ======================================================================
   HACKATHON REGISTRATIONS
   ====================================================================== */

router.post('/hackathon', (req, res) => {
  const { name, email, phone, team, role, idea } = req.body || {};
  if (!isNonEmptyString(name) || !isValidEmail(email) || !isNonEmptyString(phone)) {
    return res.status(400).json({ error: 'Name, a valid email and phone number are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO hackathon_registrations (name, email, phone, team, role, idea, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name.trim(), email.trim(), phone.trim(), team || '', role || '', idea || '', Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Registration received.' });
});

router.get('/hackathon', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM hackathon_registrations ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/hackathon/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM hackathon_registrations ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'team', label: 'Team' },
    { key: 'role', label: 'Role' },
    { key: 'idea', label: 'Project Idea' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'hackathon-registrations.csv', csv);
});

/* ======================================================================
   MAIN RSVP & CONTACT FORM
   ====================================================================== */

router.post('/rsvp', (req, res) => {
  const { name, email, phone, events, guests, message } = req.body || {};
  if (!isNonEmptyString(name) || !isValidEmail(email) || !isNonEmptyString(phone)) {
    return res.status(400).json({ error: 'Name, a valid email and phone number are required.' });
  }
  const eventsJson = JSON.stringify(Array.isArray(events) ? events : []);
  const stmt = db.prepare(`
    INSERT INTO rsvps (name, email, phone, events, guests, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    name.trim(),
    email.trim(),
    phone.trim(),
    eventsJson,
    Number(guests) || 1,
    message || '',
    Date.now()
  );
  res.status(201).json({ id: info.lastInsertRowid, message: 'RSVP received.' });
});

router.get('/rsvp', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM rsvps ORDER BY created_at DESC').all();
  res.json(rows.map((r) => ({ ...r, events: JSON.parse(r.events || '[]') })));
});

router.get('/rsvp/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM rsvps ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'events', label: 'Events Attending', format: (v) => JSON.parse(v || '[]').join('; ') },
    { key: 'guests', label: 'Guests' },
    { key: 'message', label: 'Message' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'rsvps.csv', csv);
});

/* ======================================================================
   GALA RSVP
   ====================================================================== */

router.post('/gala-rsvp', (req, res) => {
  const { name, attend, guests } = req.body || {};
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO gala_rsvps (name, attend, guests, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(name.trim(), attend || 'Joyfully Accepts', Number(guests) || 1, Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Gala RSVP received.' });
});

router.get('/gala-rsvp', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM gala_rsvps ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/gala-rsvp/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM gala_rsvps ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'attend', label: 'Attending?' },
    { key: 'guests', label: 'Guests' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'gala-rsvps.csv', csv);
});

/* ======================================================================
   BOOK ORDERS
   ====================================================================== */

router.post('/book-orders', (req, res) => {
  const { name, email, copies } = req.body || {};
  if (!isNonEmptyString(name) || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO book_orders (name, email, copies, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(name.trim(), email.trim(), Number(copies) || 1, Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Order recorded.' });
});

router.get('/book-orders', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM book_orders ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/book-orders/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM book_orders ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'copies', label: 'Copies' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'book-orders.csv', csv);
});

/* ======================================================================
   TRIBUTES  (writes require nothing special; reads are public so the
   Tribute Wall can display them, but admin can also export to CSV)
   ====================================================================== */

router.post('/tributes', (req, res) => {
  const { name, relationship, message } = req.body || {};
  if (!isNonEmptyString(name) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'Name and a message are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO tributes (name, relationship, message, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(name.trim(), relationship || '', message.trim(), Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Tribute added.' });
});

// Public read — powers the Tribute Wall on the site. Limited to the most recent 50.
router.get('/tributes', (req, res) => {
  const rows = db.prepare('SELECT name, relationship, message, created_at FROM tributes ORDER BY created_at DESC LIMIT 50').all();
  res.json(rows);
});

router.get('/tributes/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM tributes ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'message', label: 'Message' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'tributes.csv', csv);
});

/* ======================================================================
   ADMIN STATS SUMMARY
   ====================================================================== */

router.get('/stats', requireAdmin, (req, res) => {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  res.json({
    hackathon: count('hackathon_registrations'),
    rsvp: count('rsvps'),
    gala: count('gala_rsvps'),
    book: count('book_orders'),
    tribute: count('tributes'),
  });
});

module.exports = router;
