import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', (req, res) => {
  const { candidate_id, vacancy_id, salary_expected, earliest_join_date } = req.body;
  if (!candidate_id || !vacancy_id) return res.status(400).json({ success: false, error: 'candidate_id and vacancy_id required' });
  try {
    const r = db.prepare(`INSERT INTO applications (candidate_id, vacancy_id, salary_expected, earliest_join_date) VALUES (?, ?, ?, ?)`)
      .run(candidate_id, vacancy_id, salary_expected || null, earliest_join_date || null);
    db.prepare(`INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by) VALUES (?, NULL, 'applied', ?)`)
      .run(r.lastInsertRowid, req.user.id);
    res.json({ success: true, data: { id: r.lastInsertRowid } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Already applied to this vacancy' });
    throw e;
  }
});

router.get('/:id', (req, res) => {
  const app = db.prepare(`SELECT a.*, c.full_name, c.phone, c.photo_path, v.title as vacancy_title
    FROM applications a JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id WHERE a.id = ?`).get(req.params.id);
  if (!app) return res.status(404).json({ success: false, error: 'Not found' });
  app.history = db.prepare(`SELECT ash.*, u.name as changed_by_name FROM application_stage_history ash
    LEFT JOIN users u ON ash.changed_by = u.id WHERE ash.application_id = ? ORDER BY ash.changed_at DESC`).all(req.params.id);
  res.json({ success: true, data: app });
});

router.put('/:id/stage', (req, res) => {
  const { stage, reason } = req.body;
  const app = db.prepare('SELECT current_stage FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ success: false, error: 'Not found' });
  db.prepare(`UPDATE applications SET current_stage = ?, rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE rejection_reason END, decline_reason = CASE WHEN ? = 'declined' THEN ? ELSE decline_reason END, waitlist_expiry_date = CASE WHEN ? = 'waitlisted' THEN ? ELSE waitlist_expiry_date END, updated_at = datetime('now') WHERE id = ?`)
    .run(stage, stage, reason || null, stage, reason || null, stage, req.body.waitlist_expiry_date || null, req.params.id);
  db.prepare(`INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason) VALUES (?, ?, ?, ?, ?)`)
    .run(req.params.id, app.current_stage, stage, req.user.id, reason || null);
  res.json({ success: true, data: { id: +req.params.id, stage } });
});

export default router;
