import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// --- Departments ---
router.get('/departments', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM departments ORDER BY name').all();
  res.json({ success: true, data: rows });
});

router.post('/departments', authorize('super_admin', 'admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  try {
    const r = await db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
    res.json({ success: true, data: { id: r.lastInsertRowid, name } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Department already exists' });
    throw e;
  }
});

router.put('/departments/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const { name } = req.body;
  await db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true, data: { id: +req.params.id, name } });
});

router.delete('/departments/:id', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Designations ---
router.get('/designations', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM designations ORDER BY title').all();
  res.json({ success: true, data: rows });
});

router.post('/designations', authorize('super_admin', 'admin'), async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title required' });
  try {
    const r = await db.prepare('INSERT INTO designations (title) VALUES (?)').run(title);
    res.json({ success: true, data: { id: r.lastInsertRowid, title } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Designation already exists' });
    throw e;
  }
});

router.put('/designations/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const { title } = req.body;
  await db.prepare('UPDATE designations SET title = ? WHERE id = ?').run(title, req.params.id);
  res.json({ success: true, data: { id: +req.params.id, title } });
});

router.delete('/designations/:id', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM designations WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Academic Years ---
router.get('/academic-years', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM academic_years ORDER BY start_date DESC').all();
  res.json({ success: true, data: rows });
});

router.post('/academic-years', authorize('super_admin', 'admin'), async (req, res) => {
  const { label, start_date, end_date, is_current } = req.body;
  if (!label) return res.status(400).json({ success: false, error: 'Label required' });
  if (is_current) await db.prepare('UPDATE academic_years SET is_current = 0').run();
  const r = await db.prepare('INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)').run(label, start_date, end_date, is_current ? 1 : 0);
  res.json({ success: true, data: { id: r.lastInsertRowid, label, start_date, end_date, is_current: !!is_current } });
});

router.put('/academic-years/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const { label, start_date, end_date, is_current } = req.body;
  if (is_current) await db.prepare('UPDATE academic_years SET is_current = 0').run();
  await db.prepare('UPDATE academic_years SET label = ?, start_date = ?, end_date = ?, is_current = ? WHERE id = ?').run(label, start_date, end_date, is_current ? 1 : 0, req.params.id);
  res.json({ success: true, data: { id: +req.params.id, label, start_date, end_date, is_current: !!is_current } });
});

router.delete('/academic-years/:id', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM academic_years WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Users ---
router.get('/users', authorize('super_admin'), async (req, res) => {
  const rows = await db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, data: rows });
});

router.post('/users', authorize('super_admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, error: 'All fields required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const r = await db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
    res.json({ success: true, data: { id: r.lastInsertRowid, name, email, role, is_active: 1 } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Email already exists' });
    throw e;
  }
});

router.put('/users/:id', authorize('super_admin'), async (req, res) => {
  const { name, email, role, is_active } = req.body;
  await db.prepare('UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?')
    .run(name, email, role, is_active ? 1 : 0, req.params.id);
  res.json({ success: true, data: { id: +req.params.id, name, email, role, is_active: !!is_active } });
});

export default router;
