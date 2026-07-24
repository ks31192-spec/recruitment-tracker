import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', (req, res) => {
  const { application_id, designation_offered, salary_offered, joining_date_proposed } = req.body;
  if (!application_id) return res.status(400).json({ success: false, error: 'application_id required' });
  const r = db.prepare(`INSERT INTO offers (application_id, designation_offered, salary_offered, joining_date_proposed) VALUES (?, ?, ?, ?)`)
    .run(application_id, designation_offered || null, salary_offered || null, joining_date_proposed || null);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', (req, res) => {
  const { response, response_date, decline_reason, actually_joined, actual_joining_date, left_during_probation, probation_leave_date, probation_leave_reason, notes } = req.body;
  db.prepare(`UPDATE offers SET response=?, response_date=?, decline_reason=?, actually_joined=?, actual_joining_date=?, left_during_probation=?, probation_leave_date=?, probation_leave_reason=?, notes=? WHERE id=?`)
    .run(response || 'pending', response_date || null, decline_reason || null, actually_joined ? 1 : 0, actual_joining_date || null, left_during_probation ? 1 : 0, probation_leave_date || null, probation_leave_reason || null, notes || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

router.get('/pending', (req, res) => {
  const rows = db.prepare(`SELECT o.*, c.full_name, v.title as vacancy_title
    FROM offers o JOIN applications a ON o.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    WHERE o.response = 'pending' ORDER BY o.offer_date DESC`).all();
  res.json({ success: true, data: rows });
});

export default router;
