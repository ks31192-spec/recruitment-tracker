import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

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

// --- SLA Tracking ---

router.get('/sla-config', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM sla_config ORDER BY stage').all();
  res.json({ success: true, data: rows });
});

router.post('/sla-config', authorize('super_admin', 'admin'), async (req, res) => {
  const { stage, max_days } = req.body;
  if (!stage || !max_days) return res.status(400).json({ success: false, error: 'stage and max_days required' });
  await db.prepare(`INSERT INTO sla_config (stage, max_days, updated_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(stage) DO UPDATE SET max_days = excluded.max_days, updated_by = excluded.updated_by, updated_at = datetime('now')`)
    .run(stage, max_days, req.user.id);
  res.json({ success: true, data: { stage, max_days } });
});

router.get('/sla-breaches', async (_req, res) => {
  const terminalStages = ['rejected', 'declined', 'no_response', 'joined'];
  const slaConfigs = await db.prepare('SELECT stage, max_days FROM sla_config').all();
  const slaMap = {};
  slaConfigs.forEach(s => { slaMap[s.stage] = s.max_days; });
  const defaultSla = 7;

  const rows = await db.prepare(`
    SELECT a.id as application_id, c.full_name as candidate_name, c.phone,
      v.title as vacancy_title, a.current_stage,
      (SELECT ash.changed_at FROM application_stage_history ash
       WHERE ash.application_id = a.id AND ash.to_stage = a.current_stage
       ORDER BY ash.changed_at DESC LIMIT 1) as stage_entered_at
    FROM applications a
    JOIN candidates c ON a.candidate_id = c.id
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.current_stage NOT IN (${terminalStages.map(() => '?').join(',')})
  `).all(...terminalStages);

  const breaches = [];
  const now = Date.now();
  for (const row of rows) {
    if (!row.stage_entered_at) continue;
    const daysInStage = Math.floor((now - new Date(row.stage_entered_at + 'Z').getTime()) / (1000 * 60 * 60 * 24));
    const slaLimit = slaMap[row.current_stage] ?? defaultSla;
    if (daysInStage > slaLimit) {
      breaches.push({
        application_id: row.application_id,
        candidate_name: row.candidate_name,
        phone: row.phone,
        vacancy_title: row.vacancy_title,
        current_stage: row.current_stage,
        days_in_stage: daysInStage,
        sla_limit: slaLimit,
        breach_days: daysInStage - slaLimit
      });
    }
  }
  breaches.sort((a, b) => b.breach_days - a.breach_days);
  res.json({ success: true, data: breaches });
});

// --- Hiring Forecast ---

router.get('/hiring-forecast', async (_req, res) => {
  // Overall average time-to-fill across all completed hires
  const overallAvg = await db.prepare(`
    SELECT ROUND(AVG(julianday(ash.changed_at) - julianday(a.applied_date)), 1) as avg_days
    FROM applications a
    JOIN application_stage_history ash ON ash.application_id = a.id AND ash.to_stage = 'joined'
    WHERE a.current_stage = 'joined'
  `).get();
  const globalAvg = overallAvg?.avg_days || 45;

  // Historical avg per department+designation combo
  const historicalRows = await db.prepare(`
    SELECT v.department_id, v.designation_id,
      ROUND(AVG(julianday(ash.changed_at) - julianday(a.applied_date)), 1) as avg_days,
      COUNT(*) as sample_count
    FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    JOIN application_stage_history ash ON ash.application_id = a.id AND ash.to_stage = 'joined'
    WHERE a.current_stage = 'joined'
    GROUP BY v.department_id, v.designation_id
  `).all();
  const histMap = {};
  historicalRows.forEach(r => { histMap[`${r.department_id}_${r.designation_id}`] = r; });

  // Open vacancies
  const openVacancies = await db.prepare(`
    SELECT v.id as vacancy_id, v.title, v.department_id, v.designation_id,
      d.name as department
    FROM vacancies v
    LEFT JOIN departments d ON v.department_id = d.id
    WHERE v.status IN ('open','interviewing','reopened')
  `).all();

  const forecasts = openVacancies.map(v => {
    const key = `${v.department_id}_${v.designation_id}`;
    const hist = histMap[key];
    const sampleCount = hist?.sample_count || 0;
    const historicalAvg = hist?.avg_days || null;
    const predictedDays = historicalAvg || globalAvg;
    let confidence = 'low';
    if (sampleCount >= 10) confidence = 'high';
    else if (sampleCount >= 3) confidence = 'medium';

    return {
      vacancy_id: v.vacancy_id,
      title: v.title,
      department: v.department,
      predicted_days: predictedDays,
      confidence,
      historical_avg: historicalAvg,
      sample_count: sampleCount
    };
  });

  res.json({ success: true, data: forecasts });
});

// --- Custom Report ---

router.get('/custom-report', async (req, res) => {
  const { start_date, end_date, department_id, source, group_by } = req.query;
  if (!group_by) return res.status(400).json({ success: false, error: 'group_by parameter required (department, source, month, stage)' });

  const dimensions = group_by.split(',').map(d => d.trim());
  const selectParts = [];
  const groupParts = [];

  for (const dim of dimensions) {
    switch (dim) {
      case 'department':
        selectParts.push('d.name as department');
        groupParts.push('v.department_id');
        break;
      case 'source':
        selectParts.push('c.source');
        groupParts.push('c.source');
        break;
      case 'month':
        selectParts.push("strftime('%Y-%m', a.applied_date) as month");
        groupParts.push("strftime('%Y-%m', a.applied_date)");
        break;
      case 'stage':
        selectParts.push('a.current_stage as stage');
        groupParts.push('a.current_stage');
        break;
      default:
        return res.status(400).json({ success: false, error: `Invalid group_by dimension: ${dim}` });
    }
  }

  const conditions = [];
  const params = [];
  if (start_date) { conditions.push('a.applied_date >= ?'); params.push(start_date); }
  if (end_date) { conditions.push('a.applied_date <= ?'); params.push(end_date); }
  if (department_id) { conditions.push('v.department_id = ?'); params.push(department_id); }
  if (source) { conditions.push('c.source = ?'); params.push(source); }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT ${selectParts.join(', ')},
      COUNT(DISTINCT a.id) as total_applications,
      COUNT(DISTINCT a.candidate_id) as unique_candidates,
      SUM(CASE WHEN a.current_stage = 'joined' THEN 1 ELSE 0 END) as hired,
      SUM(CASE WHEN a.current_stage = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN a.current_stage IN ('shortlisted','interview_scheduled','interview_done','demo_scheduled','demo_done','selected','offer_made') THEN 1 ELSE 0 END) as in_pipeline
    FROM applications a
    JOIN candidates c ON a.candidate_id = c.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN departments d ON v.department_id = d.id
    ${whereClause}
    GROUP BY ${groupParts.join(', ')}
    ORDER BY total_applications DESC
  `;

  const rows = await db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

// --- Cost Per Hire ---

router.get('/cost-per-hire', async (_req, res) => {
  const perVacancy = await db.prepare(`
    SELECT v.id as vacancy_id, v.title, v.positions_filled,
      SUM(rc.amount) as total_cost,
      CASE WHEN v.positions_filled > 0
        THEN ROUND(SUM(rc.amount) / v.positions_filled, 2)
        ELSE NULL END as cost_per_hire
    FROM recruitment_costs rc
    JOIN vacancies v ON rc.vacancy_id = v.id
    GROUP BY v.id
    ORDER BY total_cost DESC
  `).all();

  const overall = await db.prepare(`
    SELECT SUM(rc.amount) as total_cost,
      (SELECT SUM(positions_filled) FROM vacancies WHERE positions_filled > 0) as total_hires
    FROM recruitment_costs rc
  `).get();

  const overallCph = overall.total_hires > 0
    ? Math.round((overall.total_cost || 0) / overall.total_hires * 100) / 100
    : null;

  res.json({
    success: true,
    data: {
      per_vacancy: perVacancy,
      overall: {
        total_cost: overall.total_cost || 0,
        total_hires: overall.total_hires || 0,
        cost_per_hire: overallCph
      }
    }
  });
});

export default router;
