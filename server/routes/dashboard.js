import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// The queries themselves are counts over an in-memory database and take no
// measurable time — the cost of this page was entirely the round trips. They are
// factored out so /overview can serve all of them in one response.

async function getSummary() {
  const active_vacancies = (await db.prepare(`SELECT COUNT(*) as c FROM vacancies WHERE status IN ('open','interviewing','reopened')`).get()).c;
  const total_candidates = (await db.prepare('SELECT COUNT(*) as c FROM candidates').get()).c;
  const month_start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const apps_this_month = (await db.prepare(`SELECT COUNT(*) as c FROM applications WHERE applied_date >= ?`).get(month_start)).c;
  const pending_interviews = (await db.prepare(`SELECT COUNT(*) as c FROM interviews WHERE status = 'scheduled' AND scheduled_date >= date('now')`).get()).c;
  const pending_offers = (await db.prepare(`SELECT COUNT(*) as c FROM offers WHERE response = 'pending'`).get()).c;
  const overdue_followups = (await db.prepare(`SELECT COUNT(*) as c FROM communication_log WHERE follow_up_date < date('now') AND follow_up_date IS NOT NULL`).get()).c;
  const positions_filled = (await db.prepare(`SELECT SUM(positions_filled) as c FROM vacancies`).get()).c || 0;
  return { active_vacancies, total_candidates, apps_this_month, pending_interviews, pending_offers, overdue_followups, positions_filled };
}

const getPipeline = () => db.prepare(`SELECT current_stage, COUNT(*) as count FROM applications a
  JOIN vacancies v ON a.vacancy_id = v.id WHERE v.status IN ('open','interviewing','reopened')
  GROUP BY current_stage`).all();

const getSources = () => db.prepare(`SELECT c.source, COUNT(*) as total,
  SUM(CASE WHEN a.current_stage = 'joined' THEN 1 ELSE 0 END) as hired
  FROM candidates c LEFT JOIN applications a ON c.id = a.candidate_id
  GROUP BY c.source`).all();

const getRecentActivity = () => db.prepare(`SELECT ash.to_stage, ash.changed_at, c.full_name, v.title as vacancy_title, u.name as changed_by_name
  FROM application_stage_history ash
  JOIN applications a ON ash.application_id = a.id
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  LEFT JOIN users u ON ash.changed_by = u.id
  ORDER BY ash.changed_at DESC LIMIT 15`).all();

// Everything the dashboard needs, in one round trip instead of four.
router.get('/overview', async (_req, res) => {
  const [summary, pipeline, sources, activity] = await Promise.all([
    getSummary(), getPipeline(), getSources(), getRecentActivity(),
  ]);
  res.json({ success: true, data: { summary, pipeline, sources, activity } });
});

// Kept for anything still calling them individually.
router.get('/summary', async (_req, res) => {
  res.json({ success: true, data: await getSummary() });
});

router.get('/pipeline-summary', async (_req, res) => {
  res.json({ success: true, data: await getPipeline() });
});

router.get('/source-analysis', async (_req, res) => {
  res.json({ success: true, data: await getSources() });
});

router.get('/recent-activity', async (_req, res) => {
  res.json({ success: true, data: await getRecentActivity() });
});

router.get('/monthly-trend', async (_req, res) => {
  const rows = await db.prepare(`SELECT strftime('%Y-%m', applied_date) as month, COUNT(*) as count
    FROM applications WHERE applied_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month`).all();
  res.json({ success: true, data: rows });
});

export default router;
