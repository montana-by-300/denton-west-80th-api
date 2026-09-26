const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { requireAdmin, isNonEmptyString, isValidEmail, toCSV, sendCSV, formatBytes } = require('../helpers');

const router = express.Router();

/* ======================================================================
   VISITOR PHOTO UPLOADS â€” storage setup
   Photos are saved to disk under DB_PATH's sibling "uploads" folder, so
   they persist on the same disk as the SQLite database.
   ====================================================================== */
const UPLOAD_DIR = path.join(path.dirname(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'celebration.db')), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const STORAGE_LIMIT_BYTES = 800 * 1024 * 1024; // 800 MB warning threshold

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `visitor-${unique}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB max per photo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only photo files are accepted â€” videos and other file types are not supported.'));
    }
    cb(null, true);
  },
});

/* ======================================================================
   HACKATHON REGISTRATIONS
   ====================================================================== */

router.post('/hackathon/registrations', (req, res) => {
  const { fullName, email, phone, teamName, role, projectIdea } = req.body || {};
  if (!isNonEmptyString(fullName) || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO hackathon_registrations (full_name, email, phone, team_name, role, project_idea, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    fullName.trim(), email.trim(), phone || '', teamName || '', role || '', projectIdea || '', Date.now()
  );
  res.status(201).json({ id: info.lastInsertRowid, message: 'Registration received.' });
});

router.get('/admin/hackathon/registrations', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM hackathon_registrations ORDER BY created_at DESC').all();
  res.json({ registrations: rows });
});

router.get('/admin/hackathon/registrations/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM hackathon_registrations ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'team_name', label: 'Team' },
    { key: 'role', label: 'Role' },
    { key: 'project_idea', label: 'Project Idea' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'hackathon-registrations.csv', csv);
});

/* ======================================================================
   RSVPs  (includes Gala attendance via events:["gala"] + attending field)
   ====================================================================== */

router.post('/rsvps', (req, res) => {
  const { fullName, email, phone, events, attending, guests, message } = req.body || {};
  if (!isNonEmptyString(fullName)) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const eventsJson = JSON.stringify(Array.isArray(events) ? events : []);
  const stmt = db.prepare(`
    INSERT INTO rsvps (full_name, email, phone, events, attending, guests, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    fullName.trim(), email || '', phone || '', eventsJson, attending || '', Number(guests) || 1, message || '', Date.now()
  );
  res.status(201).json({ id: info.lastInsertRowid, message: 'RSVP received.' });
});

router.get('/admin/rsvps', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM rsvps ORDER BY created_at DESC').all();
  res.json({ rsvps: rows.map((r) => ({ ...r, events: JSON.parse(r.events || '[]') })) });
});

router.get('/admin/rsvps/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM rsvps ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'events', label: 'Events', format: (v) => JSON.parse(v || '[]').join('; ') },
    { key: 'attending', label: 'Attending?' },
    { key: 'guests', label: 'Guests' },
    { key: 'message', label: 'Message' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'rsvps.csv', csv);
});

/* ======================================================================
   BOOK ORDERS
   ====================================================================== */

router.post('/book-orders', (req, res) => {
  const { fullName, email, copies } = req.body || {};
  if (!isNonEmptyString(fullName) || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO book_orders (full_name, email, copies, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(fullName.trim(), email.trim(), Number(copies) || 1, Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Order recorded.' });
});

router.get('/admin/book-orders', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM book_orders ORDER BY created_at DESC').all();
  res.json({ orders: rows });
});

router.get('/admin/book-orders/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM book_orders ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'copies', label: 'Copies' },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'book-orders.csv', csv);
});

/* ======================================================================
   TRIBUTES  (need admin approval before they're public)
   ====================================================================== */

router.post('/tributes', (req, res) => {
  const { name, relationship, message } = req.body || {};
  if (!isNonEmptyString(name) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'Name and a message are required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO tributes (name, relationship, message, approved, created_at)
    VALUES (?, ?, ?, 0, ?)
  `);
  const info = stmt.run(name.trim(), relationship || '', message.trim(), Date.now());
  res.status(201).json({ id: info.lastInsertRowid, message: 'Tribute submitted for approval.' });
});

// Public read â€” powers the Tribute Wall. Approved tributes only, no auth needed.
router.get('/tributes', (req, res) => {
  const rows = db.prepare(
    'SELECT name, relationship, message, created_at FROM tributes WHERE approved = 1 ORDER BY created_at DESC LIMIT 50'
  ).all();
  res.json({ tributes: rows });
});

// Admin read â€” every tribute, approved or not, so the committee can review.
router.get('/admin/tributes', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM tributes ORDER BY created_at DESC').all();
  res.json({ tributes: rows.map((t) => ({ ...t, approved: !!t.approved })) });
});

router.patch('/admin/tributes/:id/approve', requireAdmin, (req, res) => {
  const info = db.prepare('UPDATE tributes SET approved = 1 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Tribute not found.' });
  res.json({ message: 'Tribute approved.' });
});

router.get('/admin/tributes/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM tributes ORDER BY created_at DESC').all();
  const csv = toCSV(rows, [
    { key: 'name', label: 'Name' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'message', label: 'Message' },
    { key: 'approved', label: 'Approved', format: (v) => (v ? 'Yes' : 'No') },
    { key: 'created_at', label: 'Submitted', format: (v) => new Date(v).toISOString() },
  ]);
  sendCSV(res, 'tributes.csv', csv);
});

/* ======================================================================
   VISITOR PHOTOS  (visitor-submitted photos â€” need admin approval)
   ====================================================================== */

router.post('/visitor-photos', (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Could not upload that file. Please try a photo under 12MB.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a photo to upload.' });
    }
    const { uploaderName, caption } = req.body || {};
    const stmt = db.prepare(`
      INSERT INTO visitor_photos (filename, uploader_name, caption, size_bytes, approved, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `);
    const info = stmt.run(req.file.filename, uploaderName || '', caption || '', req.file.size, Date.now());
    res.status(201).json({ id: info.lastInsertRowid, message: 'Photo submitted for approval.' });
  });
});

// Public read â€” approved visitor photos only, no auth needed.
router.get('/visitor-photos', (req, res) => {
  const rows = db.prepare(
    'SELECT id, filename, uploader_name, caption, created_at FROM visitor_photos WHERE approved = 1 ORDER BY created_at DESC LIMIT 200'
  ).all();
  res.json({ photos: rows.map((p) => ({ ...p, url: '/uploads/' + p.filename })) });
});

// Admin read â€” every visitor photo, pending or approved, for moderation.
router.get('/admin/visitor-photos', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM visitor_photos ORDER BY created_at DESC').all();
  res.json({ photos: rows.map((p) => ({ ...p, approved: !!p.approved, url: '/uploads/' + p.filename })) });
});

router.patch('/admin/visitor-photos/:id/approve', requireAdmin, (req, res) => {
  const info = db.prepare('UPDATE visitor_photos SET approved = 1 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Photo not found.' });
  res.json({ message: 'Photo approved.' });
});

// Reject/remove a visitor photo â€” deletes both the database row and the file on disk.
router.delete('/admin/visitor-photos/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM visitor_photos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Photo not found.' });
  db.prepare('DELETE FROM visitor_photos WHERE id = ?').run(req.params.id);
  const filePath = path.join(UPLOAD_DIR, row.filename);
  fs.unlink(filePath, () => {}); // best-effort; ignore if already gone
  res.json({ message: 'Photo removed.' });
});

// Storage usage â€” lets the admin dashboard warn once visitor uploads pass 800MB.
router.get('/admin/storage-status', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT COALESCE(SUM(size_bytes),0) AS total FROM visitor_photos').get();
  const totalBytes = row.total || 0;
  res.json({
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    limitBytes: STORAGE_LIMIT_BYTES,
    limitFormatted: formatBytes(STORAGE_LIMIT_BYTES),
    percentUsed: Math.round((totalBytes / STORAGE_LIMIT_BYTES) * 100),
    overLimit: totalBytes >= STORAGE_LIMIT_BYTES,
  });
});

module.exports = router;
