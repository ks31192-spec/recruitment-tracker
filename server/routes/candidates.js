import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { search, source, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  let sql = `SELECT c.*,
    (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = c.id) as application_count,
    (SELECT a2.current_stage FROM applications a2 WHERE a2.candidate_id = c.id ORDER BY a2.created_at DESC LIMIT 1) as latest_stage,
    (SELECT v.title FROM applications a3 JOIN vacancies v ON a3.vacancy_id = v.id WHERE a3.candidate_id = c.id ORDER BY a3.created_at DESC LIMIT 1) as latest_vacancy
    FROM candidates c WHERE 1=1`;
  const params = [];
  if (search) {
    sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (source) { sql += ' AND c.source = ?'; params.push(source); }
  const countSql = sql.replace(/SELECT c\.\*[\s\S]*?FROM candidates c/, 'SELECT COUNT(*) as total FROM candidates c');
  const total = (await db.prepare(countSql).get(...params))?.total || 0;
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  res.json({ success: true, data: { candidates: await db.prepare(sql).all(...params), total, page: +page, pages: Math.ceil(total / limit) } });
});

router.get('/duplicates-check', async (req, res) => {
  const { phone, name, father_name } = req.query;
  let dupes = [];
  if (phone) {
    dupes = await db.prepare('SELECT id, full_name, phone, photo_path FROM candidates WHERE phone = ?').all(phone);
  }
  if (!dupes.length && name) {
    const sql = father_name
      ? 'SELECT id, full_name, phone, photo_path FROM candidates WHERE full_name LIKE ? AND father_or_husband_name LIKE ?'
      : 'SELECT id, full_name, phone, photo_path FROM candidates WHERE full_name LIKE ?';
    dupes = father_name ? await db.prepare(sql).all(`%${name}%`, `%${father_name}%`) : await db.prepare(sql).all(`%${name}%`);
  }
  res.json({ success: true, data: dupes });
});

router.get('/:id', async (req, res) => {
  const c = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });
  c.qualifications = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(c.id);
  c.experience = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(c.id);
  c.applications = await db.prepare(`SELECT a.*, v.title as vacancy_title, v.subject, d.name as department_name
    FROM applications a JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN departments d ON v.department_id = d.id
    WHERE a.candidate_id = ? ORDER BY a.applied_date DESC`).all(c.id);
  c.documents = await db.prepare('SELECT * FROM documents WHERE candidate_id = ?').all(c.id);
  res.json({ success: true, data: c });
});

router.post('/', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, source, referrer_name, notes, force } = req.body;
  if (!full_name) return res.status(400).json({ success: false, error: 'Full name required' });

  if (!force && phone) {
    const dupes = await db.prepare('SELECT id, full_name, phone FROM candidates WHERE phone = ?').all(phone);
    if (dupes.length) return res.json({ success: true, data: { duplicates: dupes } });
  }

  const r = await db.prepare(`INSERT INTO candidates (full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, source, referrer_name, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, phone || null, whatsapp_number || null, email || null, current_city || null, current_state || null, source || null, referrer_name || null, notes || null, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, source, referrer_name, notes } = req.body;
  await db.prepare(`UPDATE candidates SET full_name=?, father_or_husband_name=?, gender=?, date_of_birth=?, phone=?, whatsapp_number=?, email=?, current_city=?, current_state=?, source=?, referrer_name=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, phone || null, whatsapp_number || null, email || null, current_city || null, current_state || null, source || null, referrer_name || null, notes || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

router.get('/:id/timeline', async (req, res) => {
  const events = [];
  const stages = await db.prepare(`SELECT ash.*, a.vacancy_id, v.title as vacancy_title, u.name as changed_by_name
    FROM application_stage_history ash
    JOIN applications a ON ash.application_id = a.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN users u ON ash.changed_by = u.id
    WHERE a.candidate_id = ? ORDER BY ash.changed_at DESC`).all(req.params.id);
  stages.forEach(s => events.push({ type: 'stage_change', date: s.changed_at, ...s }));

  const interviews = await db.prepare(`SELECT i.*, v.title as vacancy_title
    FROM interviews i JOIN applications a ON i.application_id = a.id
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.candidate_id = ? ORDER BY i.scheduled_date DESC`).all(req.params.id);
  interviews.forEach(i => events.push({ type: 'interview', date: i.scheduled_date, ...i }));

  const comms = await db.prepare(`SELECT cl.*, u.name as logged_by_name FROM communication_log cl
    LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.candidate_id = ? ORDER BY cl.logged_at DESC`).all(req.params.id);
  comms.forEach(c => events.push({ type: 'communication', date: c.logged_at, ...c }));

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, data: events });
});

router.post('/:id/qualifications', authenticate, async (req, res) => {
  const { degree, specialization, university, year_of_passing, percentage_or_cgpa, is_bed, is_deled, ctet_score, stet_score, net_qualified } = req.body;
  const r = await db.prepare(`INSERT INTO candidate_qualifications (candidate_id, degree, specialization, university, year_of_passing, percentage_or_cgpa, is_bed, is_deled, ctet_score, stet_score, net_qualified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, degree || null, specialization || null, university || null, year_of_passing || null, percentage_or_cgpa || null, is_bed ? 1 : 0, is_deled ? 1 : 0, ctet_score || null, stet_score || null, net_qualified ? 1 : 0);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.post('/:id/experience', authenticate, async (req, res) => {
  const { school_name, designation, from_date, to_date, reason_for_leaving, reference_contact } = req.body;
  const r = await db.prepare(`INSERT INTO candidate_experience (candidate_id, school_name, designation, from_date, to_date, reason_for_leaving, reference_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, school_name || null, designation || null, from_date || null, to_date || null, reason_for_leaving || null, reference_contact || null);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

// --- Notes ---
router.get('/:id/notes', async (req, res) => {
  const notes = await db.prepare('SELECT * FROM candidate_notes WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ success: true, data: notes });
});

router.post('/:id/notes', async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ success: false, error: 'Note required' });
  const r = await db.prepare('INSERT INTO candidate_notes (candidate_id, user_id, user_name, note) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, req.user.name, note.trim());
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.delete('/:id/notes/:noteId', async (req, res) => {
  await db.prepare('DELETE FROM candidate_notes WHERE id = ? AND candidate_id = ?').run(req.params.noteId, req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Tags ---
router.get('/meta/tags', async (_req, res) => {
  const tags = await db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json({ success: true, data: tags });
});

router.post('/meta/tags', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  try {
    const r = await db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#3b82f6');
    res.json({ success: true, data: { id: r.lastInsertRowid, name, color: color || '#3b82f6' } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Tag already exists' });
    throw e;
  }
});

router.delete('/meta/tags/:tagId', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.tagId);
  res.json({ success: true, data: { message: 'Deleted' } });
});

router.get('/:id/tags', async (req, res) => {
  const tags = await db.prepare('SELECT t.* FROM tags t JOIN candidate_tags ct ON t.id = ct.tag_id WHERE ct.candidate_id = ?').all(req.params.id);
  res.json({ success: true, data: tags });
});

router.post('/:id/tags', async (req, res) => {
  const { tag_id } = req.body;
  if (!tag_id) return res.status(400).json({ success: false, error: 'tag_id required' });
  try {
    await db.prepare('INSERT INTO candidate_tags (candidate_id, tag_id) VALUES (?, ?)').run(req.params.id, tag_id);
  } catch { /* already tagged */ }
  res.json({ success: true, data: { message: 'Tagged' } });
});

router.delete('/:id/tags/:tagId', async (req, res) => {
  await db.prepare('DELETE FROM candidate_tags WHERE candidate_id = ? AND tag_id = ?').run(req.params.id, req.params.tagId);
  res.json({ success: true, data: { message: 'Untagged' } });
});

// --- Blacklist ---
router.get('/:id/blacklist', async (req, res) => {
  const bl = await db.prepare('SELECT * FROM blacklist WHERE candidate_id = ?').get(req.params.id);
  res.json({ success: true, data: bl || null });
});

router.post('/:id/blacklist', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'Reason required' });
  try {
    await db.prepare('INSERT INTO blacklist (candidate_id, reason, blacklisted_by) VALUES (?, ?, ?)').run(req.params.id, reason, req.user.id);
  } catch {
    await db.prepare('UPDATE blacklist SET reason = ?, blacklisted_by = ?, created_at = datetime("now") WHERE candidate_id = ?').run(reason, req.user.id, req.params.id);
  }
  res.json({ success: true, data: { message: 'Blacklisted' } });
});

router.delete('/:id/blacklist', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM blacklist WHERE candidate_id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Removed from blacklist' } });
});

export default router;
