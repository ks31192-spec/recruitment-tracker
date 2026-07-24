import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { application_id, interview_type, scheduled_date, scheduled_time, mode, location_or_link, demo_topic, demo_class, demo_duration_minutes, panel_member_ids } = req.body;
  if (!application_id || !interview_type || !scheduled_date) {
    return res.status(400).json({ success: false, error: 'application_id, interview_type, scheduled_date required' });
  }
  const r = await db.prepare(`INSERT INTO interviews (application_id, interview_type, scheduled_date, scheduled_time, mode, location_or_link, demo_topic, demo_class, demo_duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(application_id, interview_type, scheduled_date, scheduled_time || null, mode || 'in_person', location_or_link || null, demo_topic || null, demo_class || null, demo_duration_minutes || null);
  if (panel_member_ids?.length) {
    for (const uid of panel_member_ids) {
      await db.prepare('INSERT INTO interview_panel (interview_id, user_id) VALUES (?, ?)').run(r.lastInsertRowid, uid);
    }
  }
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', async (req, res) => {
  const { scheduled_date, scheduled_time, mode, location_or_link, status, demo_topic, demo_class, demo_duration_minutes } = req.body;
  await db.prepare(`UPDATE interviews SET scheduled_date=?, scheduled_time=?, mode=?, location_or_link=?, status=?, demo_topic=?, demo_class=?, demo_duration_minutes=?, updated_at=datetime('now') WHERE id=?`)
    .run(scheduled_date, scheduled_time || null, mode || 'in_person', location_or_link || null, status || 'scheduled', demo_topic || null, demo_class || null, demo_duration_minutes || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

router.post('/:id/evaluate', async (req, res) => {
  const { subject_knowledge, communication, teaching_aptitude, confidence_personality, tech_comfort, overall_impression, strengths, concerns, recommendation, private_notes } = req.body;
  try {
    const r = await db.prepare(`INSERT INTO evaluations (interview_id, evaluator_id, subject_knowledge, communication, teaching_aptitude, confidence_personality, tech_comfort, overall_impression, strengths, concerns, recommendation, private_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, req.user.id, subject_knowledge, communication, teaching_aptitude, confidence_personality, tech_comfort, overall_impression, strengths || null, concerns || null, recommendation || null, private_notes || null);
    res.json({ success: true, data: { id: r.lastInsertRowid } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Already evaluated' });
    throw e;
  }
});

router.get('/:id/evaluations', async (req, res) => {
  let evals = await db.prepare(`SELECT e.*, u.name as evaluator_name FROM evaluations e JOIN users u ON e.evaluator_id = u.id WHERE e.interview_id = ?`).all(req.params.id);
  if (req.user.role !== 'super_admin') {
    evals = evals.map(e => ({ ...e, private_notes: undefined }));
  }
  res.json({ success: true, data: evals });
});

router.get('/schedule/today', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.prepare(`SELECT i.*, a.candidate_id, c.full_name, c.phone, v.title as vacancy_title,
    GROUP_CONCAT(u.name) as panel_names
    FROM interviews i JOIN applications a ON i.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN interview_panel ip ON ip.interview_id = i.id LEFT JOIN users u ON ip.user_id = u.id
    WHERE i.scheduled_date = ? GROUP BY i.id ORDER BY i.scheduled_time`).all(today);
  res.json({ success: true, data: rows });
});

router.get('/schedule/upcoming', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.prepare(`SELECT i.*, c.full_name, c.phone, v.title as vacancy_title
    FROM interviews i JOIN applications a ON i.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    WHERE i.scheduled_date >= ? AND i.status = 'scheduled' ORDER BY i.scheduled_date, i.scheduled_time LIMIT 20`).all(today);
  res.json({ success: true, data: rows });
});

export default router;
