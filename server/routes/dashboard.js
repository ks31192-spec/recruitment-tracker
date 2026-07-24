import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const active_vacancies = (await db.prepare(`SELECT COUNT(*) as c FROM vacancies WHERE status IN ('open','interviewing','reopened')`).get()).c;
  const total_candidates = (await db.prepare('SELECT COUNT(*) as c FROM candidates').get()).c;
  const month_start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const apps_this_month = (await db.prepare(`SELECT COUNT(*) as c FROM applications WHERE applied_date >= ?`).get(month_start)).c;
  const pending_interviews = (await db.prepare(`SELECT COUNT(*) as c FROM interviews WHERE status = 'scheduled' AND scheduled_date >= date('now')`).get()).c;
  const pending_offers = (await db.prepare(`SELECT COUNT(*) as c FROM offers WHERE response = 'pending'`).get()).c;
  const overdue_followups = (await db.prepare(`SELECT COUNT(*) as c FROM communication_log WHERE follow_up_date < date('now') AND follow_up_date IS NOT NULL`).get()).c;
  const positions_filled = (await db.prepare(`SELECT SUM(positions_filled) as c FROM vacancies`).get()).c || 0;
  res.json({ success: true, data: { active_vacancies, total_candidates, apps_this_month, pending_interviews, pending_offers, overdue_followups, positions_filled } });
});

router.get('/pipeline-summary', async (req, res) => {
  const rows = await db.prepare(`SELECT current_stage, COUNT(*) as count FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id WHERE v.status IN ('open','interviewing','reopened')
    GROUP BY current_stage`).all();
  res.json({ success: true, data: rows });
});

router.get('/source-analysis', async (req, res) => {
  const rows = await db.prepare(`SELECT c.source, COUNT(*) as total,
    SUM(CASE WHEN a.current_stage = 'joined' THEN 1 ELSE 0 END) as hired
    FROM candidates c LEFT JOIN applications a ON c.id = a.candidate_id
    GROUP BY c.source`).all();
  res.json({ success: true, data: rows });
});

router.get('/monthly-trend', async (req, res) => {
  const rows = await db.prepare(`SELECT strftime('%Y-%m', applied_date) as month, COUNT(*) as count
    FROM applications WHERE applied_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month`).all();
  res.json({ success: true, data: rows });
});

router.get('/recent-activity', async (req, res) => {
  const rows = await db.prepare(`SELECT ash.to_stage, ash.changed_at, c.full_name, v.title as vacancy_title, u.name as changed_by_name
    FROM application_stage_history ash
    JOIN applications a ON ash.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN users u ON ash.changed_by = u.id
    ORDER BY ash.changed_at DESC LIMIT 15`).all();
  res.json({ success: true, data: rows });
});

export default router;
