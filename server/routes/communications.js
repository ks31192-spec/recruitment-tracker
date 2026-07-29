import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendCustomEmail, sendTemplateEmail } from '../lib/email.js';

const router = Router();
router.use(authenticate);

// This can send real email to a candidate in the school's name, so it is not
// something a viewer or panel member should be able to trigger.
router.post('/', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { candidate_id, application_id, comm_type, direction, summary, outcome, follow_up_date, email_subject, email_body, template_id } = req.body;
  if (!candidate_id || !comm_type || !direction) {
    return res.status(400).json({ success: false, error: 'candidate_id, comm_type, direction required' });
  }

  // If type is email, actually send it
  let emailResult = null;
  if (comm_type === 'email' && direction === 'outgoing') {
    const candidate = await db.prepare('SELECT full_name, email FROM candidates WHERE id = ?').get(candidate_id);
    if (!candidate?.email) {
      return res.status(400).json({ success: false, error: 'Candidate has no email address' });
    }
    if (template_id) {
      emailResult = await sendTemplateEmail(candidate.email, candidate.full_name, template_id, { summary: summary || '' });
    } else if (email_subject && email_body) {
      emailResult = await sendCustomEmail(candidate.email, email_subject, email_body);
    } else {
      return res.status(400).json({ success: false, error: 'email_subject and email_body required for email type, or provide template_id' });
    }
    if (!emailResult.sent) {
      return res.status(500).json({ success: false, error: `Email failed: ${emailResult.reason}` });
    }
  }

  const r = await db.prepare(`INSERT INTO communication_log (candidate_id, application_id, comm_type, direction, summary, outcome, follow_up_date, logged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(candidate_id, application_id || null, comm_type, direction, summary || null, outcome || null, follow_up_date || null, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid, email: emailResult } });
});

router.get('/follow-ups', async (req, res) => {
  const rows = await db.prepare(`SELECT cl.*, c.full_name, c.phone FROM communication_log cl
    JOIN candidates c ON cl.candidate_id = c.id WHERE cl.follow_up_date IS NOT NULL
    AND cl.follow_up_date <= date('now', '+7 days') ORDER BY cl.follow_up_date`).all();
  res.json({ success: true, data: rows });
});

export default router;
