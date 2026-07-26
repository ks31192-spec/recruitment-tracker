import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { sendInterviewInvite } from '../lib/email.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { application_id, interview_type, scheduled_date, scheduled_time, mode, location_or_link, demo_topic, demo_class, demo_duration_minutes, panel_member_ids } = req.body;
  if (!application_id || !interview_type || !scheduled_date) {
    return res.status(400).json({ success: false, error: 'application_id, interview_type, scheduled_date required' });
  }
  const r = await db.prepare(`INSERT INTO interviews (application_id, interview_type, scheduled_date, scheduled_time, mode, location_or_link, demo_topic, demo_class, demo_duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(application_id, interview_type, scheduled_date, scheduled_time || null, mode || 'in_person', location_or_link || null, demo_topic || null, demo_class || null, demo_duration_minutes || null);
  const info = await db.prepare(`SELECT c.full_name, c.email, c.id as candidate_id, v.title as vacancy_title
    FROM applications a JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.id = ?`).get(application_id);

  // Email interview invite to candidate
  if (info?.email && req.body.send_email !== false) {
    sendInterviewInvite(info.email, info.full_name, {
      vacancyTitle: info.vacancy_title, interviewType: interview_type,
      date: scheduled_date, time: scheduled_time, mode: mode || 'in_person', location: location_or_link,
    }).catch(() => {});
  }

  if (panel_member_ids?.length && info) {
    const when = scheduled_time ? `${scheduled_date} at ${scheduled_time}` : scheduled_date;
    for (const uid of panel_member_ids) {
      await db.prepare('INSERT INTO interview_panel (interview_id, user_id) VALUES (?, ?)').run(r.lastInsertRowid, uid);
      if (uid !== req.user.id) {
        try {
          await createNotification(uid, `${interview_type === 'demo' ? 'Demo' : 'Interview'} panel: ${info.full_name}`,
            `You're on the panel for ${info.full_name} (${info.vacancy_title}) on ${when}`,
            `/candidates/${info.candidate_id}`);
        } catch { /* best-effort */ }
      }
    }
  }
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { scheduled_date, scheduled_time, mode, location_or_link, status, demo_topic, demo_class, demo_duration_minutes } = req.body;
  await db.prepare(`UPDATE interviews SET scheduled_date=?, scheduled_time=?, mode=?, location_or_link=?, status=?, demo_topic=?, demo_class=?, demo_duration_minutes=?, updated_at=datetime('now') WHERE id=?`)
    .run(scheduled_date, scheduled_time || null, mode || 'in_person', location_or_link || null, status || 'scheduled', demo_topic || null, demo_class || null, demo_duration_minutes || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

// All interviews & demos for a candidate, with remarks + author name
router.get('/candidate/:candidateId', async (req, res) => {
  const rows = await db.prepare(`SELECT i.*, v.title as vacancy_title, u.name as remarks_by_name
    FROM interviews i
    JOIN applications a ON i.application_id = a.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN users u ON i.remarks_by = u.id
    WHERE a.candidate_id = ?
    ORDER BY i.scheduled_date DESC, i.scheduled_time DESC`).all(req.params.candidateId);
  res.json({ success: true, data: rows });
});

// Save/update the institution's remarks for an interview or demo
router.put('/:id/remarks', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { remarks, status } = req.body;
  const existing = await db.prepare('SELECT id FROM interviews WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Interview not found' });
  if (status) {
    await db.prepare(`UPDATE interviews SET remarks=?, remarks_by=?, remarks_at=datetime('now'), status=?, updated_at=datetime('now') WHERE id=?`)
      .run(remarks || null, req.user.id, status, req.params.id);
  } else {
    await db.prepare(`UPDATE interviews SET remarks=?, remarks_by=?, remarks_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
      .run(remarks || null, req.user.id, req.params.id);
  }
  const row = await db.prepare(`SELECT i.*, u.name as remarks_by_name FROM interviews i LEFT JOIN users u ON i.remarks_by = u.id WHERE i.id = ?`).get(req.params.id);
  res.json({ success: true, data: row });
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

router.get('/schedule/calendar', async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, error: 'month query param required in YYYY-MM format' });
  }
  const rows = await db.prepare(`SELECT i.*, a.candidate_id, c.full_name, c.phone, v.title as vacancy_title
    FROM interviews i
    JOIN applications a ON i.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE i.scheduled_date LIKE ?
    ORDER BY i.scheduled_date, i.scheduled_time`).all(`${month}%`);
  res.json({ success: true, data: rows });
});

export default router;
