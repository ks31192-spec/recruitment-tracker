import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { candidate_id, application_id, comm_type, direction, summary, outcome, follow_up_date } = req.body;
  if (!candidate_id || !comm_type || !direction) {
    return res.status(400).json({ success: false, error: 'candidate_id, comm_type, direction required' });
  }
  const r = await db.prepare(`INSERT INTO communication_log (candidate_id, application_id, comm_type, direction, summary, outcome, follow_up_date, logged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(candidate_id, application_id || null, comm_type, direction, summary || null, outcome || null, follow_up_date || null, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.get('/follow-ups', async (req, res) => {
  const rows = await db.prepare(`SELECT cl.*, c.full_name, c.phone FROM communication_log cl
    JOIN candidates c ON cl.candidate_id = c.id WHERE cl.follow_up_date IS NOT NULL
    AND cl.follow_up_date <= date('now', '+7 days') ORDER BY cl.follow_up_date`).all();
  res.json({ success: true, data: rows });
});

export default router;
