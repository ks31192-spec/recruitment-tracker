import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/time-to-hire', async (_req, res) => {
  const rows = await db.prepare(`SELECT v.title, v.id as vacancy_id,
    ROUND(AVG(julianday(ash_joined.changed_at) - julianday(a.applied_date)), 1) as avg_days,
    COUNT(DISTINCT a.id) as hires
    FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    JOIN application_stage_history ash_joined ON ash_joined.application_id = a.id AND ash_joined.to_stage = 'joined'
    WHERE a.current_stage = 'joined'
    GROUP BY v.id ORDER BY avg_days`).all();
  res.json({ success: true, data: rows });
});

router.get('/stage-funnel', async (req, res) => {
  const { vacancy_id } = req.query;
  let sql = `SELECT ash.to_stage as stage, COUNT(DISTINCT ash.application_id) as count
    FROM application_stage_history ash`;
  const params = [];
  if (vacancy_id) {
    sql += ' JOIN applications a ON ash.application_id = a.id WHERE a.vacancy_id = ?';
    params.push(vacancy_id);
  }
  sql += ' GROUP BY ash.to_stage';
  const rows = await db.prepare(sql).all(...params);

  const stageOrder = ['applied', 'shortlisted', 'interview_scheduled', 'interview_done', 'demo_scheduled', 'demo_done', 'selected', 'offer_made', 'joined'];
  const ordered = stageOrder.map(s => ({ stage: s, count: rows.find(r => r.stage === s)?.count || 0 }));
  const dropoffs = stageOrder.map(s => ({ stage: s, count: rows.find(r => r.stage === s)?.count || 0, dropped: ['rejected', 'declined', 'no_response', 'waitlisted'].reduce((sum, ds) => sum + (rows.find(r => r.stage === ds)?.count || 0), 0) }));
  res.json({ success: true, data: { funnel: ordered, dropoffs } });
});

router.get('/source-effectiveness', async (_req, res) => {
  const rows = await db.prepare(`SELECT c.source,
    COUNT(DISTINCT c.id) as total_candidates,
    COUNT(DISTINCT a.id) as total_applications,
    SUM(CASE WHEN a.current_stage = 'shortlisted' OR a.current_stage IN ('interview_scheduled','interview_done','demo_scheduled','demo_done','selected','offer_made','joined') THEN 1 ELSE 0 END) as shortlisted,
    SUM(CASE WHEN a.current_stage = 'joined' THEN 1 ELSE 0 END) as hired,
    ROUND(CAST(SUM(CASE WHEN a.current_stage = 'joined' THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(DISTINCT a.id), 0) * 100, 1) as hire_rate
    FROM candidates c
    LEFT JOIN applications a ON c.id = a.candidate_id
    GROUP BY c.source
    ORDER BY hired DESC`).all();
  res.json({ success: true, data: rows });
});

router.get('/vacancy-aging', async (_req, res) => {
  const rows = await db.prepare(`SELECT v.id, v.title, v.status, v.created_at,
    d.name as department_name,
    CAST(julianday('now') - julianday(v.created_at) AS INTEGER) as days_open,
    v.positions_count, v.positions_filled,
    (SELECT COUNT(*) FROM applications a WHERE a.vacancy_id = v.id) as applicant_count
    FROM vacancies v
    LEFT JOIN departments d ON v.department_id = d.id
    WHERE v.status IN ('open','interviewing','reopened')
    ORDER BY days_open DESC`).all();
  res.json({ success: true, data: rows });
});

router.get('/recruiter-workload', async (_req, res) => {
  const rows = await db.prepare(`SELECT u.id, u.name,
    (SELECT COUNT(*) FROM vacancies v WHERE v.created_by = u.id AND v.status IN ('open','interviewing','reopened')) as active_vacancies,
    (SELECT COUNT(*) FROM interviews i JOIN applications a ON i.application_id = a.id JOIN vacancies v ON a.vacancy_id = v.id WHERE v.created_by = u.id AND i.status = 'scheduled') as pending_interviews,
    (SELECT COUNT(*) FROM communication_log cl WHERE cl.logged_by = u.id AND cl.logged_at >= datetime('now', '-7 days')) as comms_this_week
    FROM users u WHERE u.is_active = 1 AND u.role IN ('super_admin','admin','hr')
    ORDER BY active_vacancies DESC`).all();
  res.json({ success: true, data: rows });
});

router.get('/offer-acceptance', async (_req, res) => {
  const rows = await db.prepare(`SELECT
    COUNT(*) as total_offers,
    SUM(CASE WHEN o.response = 'accepted' THEN 1 ELSE 0 END) as accepted,
    SUM(CASE WHEN o.response = 'declined' THEN 1 ELSE 0 END) as declined,
    SUM(CASE WHEN o.response = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN o.response = 'negotiating' THEN 1 ELSE 0 END) as negotiating,
    SUM(CASE WHEN o.actually_joined = 1 THEN 1 ELSE 0 END) as actually_joined,
    SUM(CASE WHEN o.left_during_probation = 1 THEN 1 ELSE 0 END) as left_probation,
    ROUND(CAST(SUM(CASE WHEN o.response = 'accepted' THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0) * 100, 1) as acceptance_rate
    FROM offers o`).get();
  res.json({ success: true, data: rows });
});

export default router;
