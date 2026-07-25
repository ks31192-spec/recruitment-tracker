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
  const apps = await db.prepare(`SELECT a.*, c.full_name, c.phone, c.photo_path, c.source,
    (SELECT GROUP_CONCAT(t.name) FROM candidate_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.candidate_id = c.id) as tags,
    (SELECT 1 FROM blacklist bl WHERE bl.candidate_id = c.id) as is_blacklisted
    FROM applications a JOIN candidates c ON a.candidate_id = c.id
    WHERE a.vacancy_id = ? ORDER BY a.applied_date DESC`).all(req.params.id);
  res.json({ success: true, data: apps });
});

router.get('/:id/screening-questions', async (req, res) => {
  const questions = await db.prepare('SELECT * FROM screening_questions WHERE vacancy_id = ? ORDER BY sort_order').all(req.params.id);
  res.json({ success: true, data: questions });
});

router.post('/:id/screening-questions', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { question, is_knockout } = req.body;
  if (!question) return res.status(400).json({ success: false, error: 'Question required' });
  const maxOrder = (await db.prepare('SELECT MAX(sort_order) as m FROM screening_questions WHERE vacancy_id = ?').get(req.params.id))?.m || 0;
  const r = await db.prepare('INSERT INTO screening_questions (vacancy_id, question, is_knockout, sort_order) VALUES (?, ?, ?, ?)')
    .run(req.params.id, question, is_knockout ? 1 : 0, maxOrder + 1);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id/screening-questions/:qid', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { question, is_knockout, sort_order } = req.body;
  await db.prepare('UPDATE screening_questions SET question = ?, is_knockout = ?, sort_order = ? WHERE id = ? AND vacancy_id = ?')
    .run(question, is_knockout ? 1 : 0, sort_order || 0, req.params.qid, req.params.id);
  res.json({ success: true, data: { id: +req.params.qid } });
});

router.delete('/:id/screening-questions/:qid', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM screening_questions WHERE id = ? AND vacancy_id = ?').run(req.params.qid, req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

router.get('/:id/screening-answers', async (req, res) => {
  const answers = await db.prepare(`SELECT sa.*, sq.question, sq.is_knockout, c.full_name, a.id as application_id
    FROM screening_answers sa
    JOIN screening_questions sq ON sa.question_id = sq.id
    JOIN applications a ON sa.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id
    WHERE sq.vacancy_id = ?
    ORDER BY a.id, sq.sort_order`).all(req.params.id);
  res.json({ success: true, data: answers });
});

router.get('/:id/eligibility', async (req, res) => {
  const vacancy = await db.prepare('SELECT * FROM vacancies WHERE id = ?').get(req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Not found' });

  const apps = await db.prepare(`SELECT a.id as application_id, a.candidate_id, c.full_name, c.phone
    FROM applications a JOIN candidates c ON a.candidate_id = c.id WHERE a.vacancy_id = ?`).all(req.params.id);

  const results = [];
  for (const app of apps) {
    const quals = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(app.candidate_id);
    const exps = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(app.candidate_id);

    const flags = [];
    const hasBed = quals.some(q => q.is_bed);
    const hasDeled = quals.some(q => q.is_deled);
    const hasCtet = quals.some(q => q.ctet_score);
    const hasNet = quals.some(q => q.net_qualified);

    if (vacancy.qualification_required) {
      const req_lower = vacancy.qualification_required.toLowerCase();
      if (req_lower.includes('b.ed') && !hasBed) flags.push('Missing B.Ed');
      if (req_lower.includes('d.el.ed') && !hasDeled) flags.push('Missing D.El.Ed');
      if (req_lower.includes('ctet') && !hasCtet) flags.push('No CTET score');
      if (req_lower.includes('net') && !hasNet) flags.push('Not NET qualified');
    }

    let totalExp = 0;
    for (const e of exps) {
      if (e.from_date && e.to_date) {
        totalExp += (new Date(e.to_date) - new Date(e.from_date)) / (365.25 * 24 * 60 * 60 * 1000);
      }
    }
    if (vacancy.experience_min && totalExp < vacancy.experience_min) {
      flags.push(`Experience ${Math.round(totalExp)}y < required ${vacancy.experience_min}y`);
    }

    results.push({
      ...app,
      total_experience_years: Math.round(totalExp * 10) / 10,
      has_bed: hasBed, has_deled: hasDeled, has_ctet: hasCtet, has_net: hasNet,
      flags,
      eligible: flags.length === 0,
    });
  }
  res.json({ success: true, data: results });
});

export default router;
