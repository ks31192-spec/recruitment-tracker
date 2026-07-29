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
  const apps = await db.prepare(`SELECT a.*, c.full_name, c.phone, c.photo_path, c.source, c.expected_salary, c.current_salary, c.is_fresher,
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

// --- Document Checklist ---

router.get('/:id/document-checklist', async (req, res) => {
  const items = await db.prepare('SELECT * FROM document_checklist WHERE vacancy_id = ? ORDER BY sort_order').all(req.params.id);
  res.json({ success: true, data: items });
});

router.post('/:id/document-checklist', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { doc_name, is_required } = req.body;
  if (!doc_name) return res.status(400).json({ success: false, error: 'doc_name required' });
  const maxOrder = (await db.prepare('SELECT MAX(sort_order) as m FROM document_checklist WHERE vacancy_id = ?').get(req.params.id))?.m || 0;
  const r = await db.prepare('INSERT INTO document_checklist (vacancy_id, doc_name, is_required, sort_order) VALUES (?, ?, ?, ?)')
    .run(req.params.id, doc_name, is_required != null ? (is_required ? 1 : 0) : 1, maxOrder + 1);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.delete('/:id/document-checklist/:itemId', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM document_checklist WHERE id = ? AND vacancy_id = ?').run(req.params.itemId, req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Recruitment Costs ---

router.get('/:id/costs', async (req, res) => {
  const costs = await db.prepare(`SELECT rc.*, u.name as created_by_name FROM recruitment_costs rc
    LEFT JOIN users u ON rc.created_by = u.id WHERE rc.vacancy_id = ? ORDER BY rc.date DESC`).all(req.params.id);
  res.json({ success: true, data: costs });
});

router.post('/:id/costs', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { cost_type, amount, description, date } = req.body;
  if (!cost_type || amount == null) return res.status(400).json({ success: false, error: 'cost_type and amount required' });
  const r = await db.prepare('INSERT INTO recruitment_costs (vacancy_id, cost_type, amount, description, date, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, cost_type, amount, description || null, date || new Date().toISOString().slice(0, 10), req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.delete('/:id/costs/:costId', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM recruitment_costs WHERE id = ? AND vacancy_id = ?').run(req.params.costId, req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

router.get('/:id/cost-summary', async (req, res) => {
  const total = (await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM recruitment_costs WHERE vacancy_id = ?').get(req.params.id))?.total || 0;
  const breakdown = await db.prepare('SELECT cost_type, SUM(amount) as total FROM recruitment_costs WHERE vacancy_id = ? GROUP BY cost_type').all(req.params.id);
  const joined = (await db.prepare(`SELECT COUNT(*) as c FROM applications WHERE vacancy_id = ? AND current_stage = 'joined'`).get(req.params.id))?.c || 0;
  const costPerHire = joined > 0 ? Math.round((total / joined) * 100) / 100 : null;
  res.json({ success: true, data: { total, breakdown, joined_count: joined, cost_per_hire: costPerHire } });
});

// Classify a candidate's expected salary against the vacancy's budget band.
function salaryFit(expected, min, max) {
  if (!expected || (!min && !max)) return null;
  if (max && expected > max) return { label: `${Math.round((expected / max - 1) * 100)}% over budget`, level: 'over' };
  if (min && expected < min) return { label: 'below range', level: 'under' };
  return { label: 'within budget', level: 'within' };
}

// Side-by-side comparison of all applicants for a vacancy.
router.get('/:id/compare', async (req, res) => {
  const vac = await db.prepare('SELECT salary_range_min, salary_range_max FROM vacancies WHERE id = ?').get(req.params.id);
  const apps = await db.prepare(`SELECT a.id as application_id, a.candidate_id, a.current_stage, a.applied_date,
    c.full_name, c.phone, c.current_city, c.current_salary, c.expected_salary, c.is_fresher, c.verifications,
    (SELECT 1 FROM blacklist bl WHERE bl.candidate_id = c.id) as is_blacklisted
    FROM applications a JOIN candidates c ON a.candidate_id = c.id
    WHERE a.vacancy_id = ? ORDER BY a.applied_date DESC`).all(req.params.id);

  const results = [];
  for (const app of apps) {
    const quals = await db.prepare('SELECT degree, specialization, university, year_of_passing, percentage_or_cgpa, is_appearing FROM candidate_qualifications WHERE candidate_id = ?').all(app.candidate_id);
    const exps = await db.prepare('SELECT from_date, to_date, subjects_taught FROM candidate_experience WHERE candidate_id = ?').all(app.candidate_id);

    let totalYears = 0;
    const subjects = new Set();
    for (const e of exps) {
      if (e.from_date) {
        const end = e.to_date ? new Date(e.to_date) : new Date();
        totalYears += (end - new Date(e.from_date)) / (365.25 * 24 * 60 * 60 * 1000);
      }
      if (e.subjects_taught) e.subjects_taught.split(/[,;]/).forEach(s => s.trim() && subjects.add(s.trim()));
    }

    const scoreRow = await db.prepare(`SELECT AVG(ev.overall_impression) as avg_score, COUNT(ev.id) as n
      FROM evaluations ev JOIN interviews i ON ev.interview_id = i.id
      WHERE i.application_id = ?`).get(app.application_id);

    let verifiedCount = 0, verTotal = 0;
    try {
      const vers = app.verifications ? JSON.parse(app.verifications) : [];
      verTotal = vers.length;
      verifiedCount = vers.filter(v => v.status === 'verified').length;
    } catch { /* ignore */ }

    results.push({
      application_id: app.application_id,
      candidate_id: app.candidate_id,
      full_name: app.full_name,
      phone: app.phone,
      current_city: app.current_city,
      current_stage: app.current_stage,
      is_blacklisted: !!app.is_blacklisted,
      is_fresher: !!app.is_fresher,
      current_salary: app.current_salary,
      expected_salary: app.expected_salary,
      salary_fit: salaryFit(app.expected_salary, vac?.salary_range_min, vac?.salary_range_max),
      total_experience_years: Math.round(totalYears * 10) / 10,
      subjects: [...subjects],
      qualifications: quals,
      avg_eval_score: scoreRow?.avg_score != null ? Math.round(scoreRow.avg_score * 10) / 10 : null,
      eval_count: scoreRow?.n || 0,
      verified_count: verifiedCount,
      verification_total: verTotal,
    });
  }
  res.json({ success: true, data: results });
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const v = await db.prepare('SELECT id FROM vacancies WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ success: false, error: 'Not found' });

  // Applications carry a NOT NULL vacancy_id and cannot be reassigned, so deleting
  // the vacancy would leave every applicant's pipeline history pointing at a row
  // that no longer exists — and the list queries all INNER JOIN vacancies, so those
  // applications would simply vanish from the UI. Closing keeps the record instead.
  const applicants = (await db.prepare('SELECT COUNT(*) as c FROM applications WHERE vacancy_id = ?').get(req.params.id))?.c || 0;
  if (applicants > 0) {
    return res.status(409).json({
      success: false,
      error: `This vacancy has ${applicants} application${applicants === 1 ? '' : 's'} against it. Close the vacancy instead of deleting it, so the hiring history is kept.`,
    });
  }

  await db.prepare('DELETE FROM screening_questions WHERE vacancy_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM document_checklist WHERE vacancy_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM recruitment_costs WHERE vacancy_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM vacancies WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Vacancy deleted' } });
});

export default router;
