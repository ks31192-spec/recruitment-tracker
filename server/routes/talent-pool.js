import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// The five buckets an institution asks for when sizing up a role.
// Order matters — it's the order they're presented in.
export const BUCKETS = [
  { key: 'not_interviewed', label: 'Not Interviewed' },
  { key: 'interview_only', label: 'Interview Only' },
  { key: 'demo_done', label: 'Demo Done' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
];

// A candidate sits in exactly one bucket. Terminal outcomes (rejected /
// selected) win over progress, otherwise we go by what has actually been
// completed — falling back to the stage in case an interview row is missing.
function bucketOf(r) {
  const s = r.current_stage;
  if (s === 'rejected') return 'rejected';
  if (s === 'selected' || s === 'offer_made' || s === 'joined') return 'selected';
  if (r.demos_done > 0 || s === 'demo_done') return 'demo_done';
  if (r.interviews_done > 0 || s === 'interview_done' || s === 'demo_scheduled') return 'interview_only';
  return 'not_interviewed';
}

// Designations and the subjects actually present on vacancies, for the pickers.
router.get('/options', async (_req, res) => {
  const designations = await db.prepare('SELECT id, title FROM designations ORDER BY title').all();
  const subjects = await db.prepare(
    `SELECT DISTINCT subject FROM vacancies
      WHERE subject IS NOT NULL AND TRIM(subject) <> ''
      ORDER BY subject`
  ).all();
  res.json({
    success: true,
    data: { designations, subjects: subjects.map(s => s.subject) },
  });
});

router.get('/', async (req, res) => {
  const { designation_id, subject } = req.query;

  const where = [];
  const params = [];
  if (designation_id) {
    where.push('v.designation_id = ?');
    params.push(Number(designation_id));
  }
  if (subject && subject.trim()) {
    where.push('LOWER(TRIM(v.subject)) = LOWER(TRIM(?))');
    params.push(subject);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await db.prepare(
    `SELECT
       a.id                AS application_id,
       a.applied_date,
       a.current_stage,
       a.rejection_reason,
       c.id                AS candidate_id,
       c.full_name, c.phone, c.email, c.current_city,
       c.expected_salary, c.resume_path,
       v.id                AS vacancy_id,
       v.title             AS vacancy_title,
       v.subject,
       d.title             AS designation,
       (SELECT COUNT(*) FROM interviews i
         WHERE i.application_id = a.id AND i.interview_type = 'interview'
           AND i.status = 'completed')                       AS interviews_done,
       (SELECT COUNT(*) FROM interviews i
         WHERE i.application_id = a.id AND i.interview_type = 'demo'
           AND i.status = 'completed')                       AS demos_done
     FROM applications a
     JOIN candidates c  ON c.id = a.candidate_id
     JOIN vacancies  v  ON v.id = a.vacancy_id
     LEFT JOIN designations d ON d.id = v.designation_id
     ${whereSql}
     ORDER BY a.applied_date DESC, c.full_name`,
    ).all(...params);

  // Interviewer remarks for the applications we're showing.
  let remarksByApp = {};
  if (rows.length) {
    const ids = rows.map(r => r.application_id);
    const placeholders = ids.map(() => '?').join(',');
    const remarks = await db.prepare(
      `SELECT i.application_id, i.id, i.interview_type, i.scheduled_date,
              i.status, i.remarks, i.remarks_at, u.name AS remarks_by_name
         FROM interviews i
         LEFT JOIN users u ON u.id = i.remarks_by
        WHERE i.application_id IN (${placeholders})
          AND i.remarks IS NOT NULL AND TRIM(i.remarks) <> ''
        ORDER BY i.scheduled_date`
    ).all(...ids);
    for (const r of remarks) {
      (remarksByApp[r.application_id] ||= []).push(r);
    }
  }

  const buckets = Object.fromEntries(BUCKETS.map(b => [b.key, []]));
  for (const r of rows) {
    buckets[bucketOf(r)].push({ ...r, remarks: remarksByApp[r.application_id] || [] });
  }

  res.json({
    success: true,
    data: {
      total: rows.length,
      counts: Object.fromEntries(BUCKETS.map(b => [b.key, buckets[b.key].length])),
      buckets,
    },
  });
});

export default router;
