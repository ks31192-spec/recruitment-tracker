import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { status, department_id, academic_year_id } = req.query;
  let sql = `SELECT v.*, d.name as department_name, des.title as designation_title, ay.label as academic_year,
    (SELECT COUNT(*) FROM applications a WHERE a.vacancy_id = v.id) as applicant_count
    FROM vacancies v
    LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN designations des ON v.designation_id = des.id
    LEFT JOIN academic_years ay ON v.academic_year_id = ay.id WHERE 1=1`;
  const params = [];
  if (status && status !== 'all') { sql += ' AND v.status = ?'; params.push(status); }
  if (department_id) { sql += ' AND v.department_id = ?'; params.push(department_id); }
  if (academic_year_id) { sql += ' AND v.academic_year_id = ?'; params.push(academic_year_id); }
  sql += ' ORDER BY v.created_at DESC';
  res.json({ success: true, data: await db.prepare(sql).all(...params) });
});

router.get('/:id', async (req, res) => {
  const v = await db.prepare(`SELECT v.*, d.name as department_name, des.title as designation_title, ay.label as academic_year
    FROM vacancies v LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN designations des ON v.designation_id = des.id
    LEFT JOIN academic_years ay ON v.academic_year_id = ay.id WHERE v.id = ?`).get(req.params.id);
  if (!v) return res.status(404).json({ success: false, error: 'Not found' });
  const stageCounts = await db.prepare(`SELECT current_stage, COUNT(*) as count FROM applications WHERE vacancy_id = ? GROUP BY current_stage`).all(req.params.id);
  res.json({ success: true, data: { ...v, stage_counts: stageCounts } });
});

router.post('/', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { title, department_id, designation_id, subject, qualification_required, experience_min, experience_max, salary_range_min, salary_range_max, positions_count, academic_year_id, description } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title required' });
  const r = await db.prepare(`INSERT INTO vacancies (title, department_id, designation_id, subject, qualification_required, experience_min, experience_max, salary_range_min, salary_range_max, positions_count, academic_year_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, department_id || null, designation_id || null, subject || null, qualification_required || null, experience_min || 0, experience_max || null, salary_range_min || null, salary_range_max || null, positions_count || 1, academic_year_id || null, description || null, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { title, department_id, designation_id, subject, qualification_required, experience_min, experience_max, salary_range_min, salary_range_max, positions_count, status, academic_year_id, description } = req.body;
  await db.prepare(`UPDATE vacancies SET title=?, department_id=?, designation_id=?, subject=?, qualification_required=?, experience_min=?, experience_max=?, salary_range_min=?, salary_range_max=?, positions_count=?, status=?, academic_year_id=?, description=?, updated_at=datetime('now') WHERE id=?`)
    .run(title, department_id || null, designation_id || null, subject || null, qualification_required || null, experience_min || 0, experience_max || null, salary_range_min || null, salary_range_max || null, positions_count || 1, status || 'open', academic_year_id || null, description || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

router.post('/:id/clone', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const orig = await db.prepare('SELECT * FROM vacancies WHERE id = ?').get(req.params.id);
  if (!orig) return res.status(404).json({ success: false, error: 'Not found' });
  const r = await db.prepare(`INSERT INTO vacancies (title, department_id, designation_id, subject, qualification_required, experience_min, experience_max, salary_range_min, salary_range_max, positions_count, academic_year_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`${orig.title} (Copy)`, orig.department_id, orig.designation_id, orig.subject, orig.qualification_required, orig.experience_min, orig.experience_max, orig.salary_range_min, orig.salary_range_max, orig.positions_count, orig.academic_year_id, orig.description, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.get('/:id/applications', async (req, res) => {
  const apps = await db.prepare(`SELECT a.*, c.full_name, c.phone, c.photo_path, c.source
    FROM applications a JOIN candidates c ON a.candidate_id = c.id
    WHERE a.vacancy_id = ? ORDER BY a.applied_date DESC`).all(req.params.id);
  res.json({ success: true, data: apps });
});

export default router;
