import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Stats — must be before /:id routes
router.get('/stats', authorize('super_admin', 'admin'), async (req, res) => {
  const total = (await db.prepare('SELECT COUNT(*) as c FROM referrals').get())?.c || 0;
  const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM referrals GROUP BY status').all();
  const topReferrers = await db.prepare(`SELECT u.name, COUNT(*) as count FROM referrals r
    JOIN users u ON r.referrer_user_id = u.id GROUP BY r.referrer_user_id ORDER BY count DESC LIMIT 10`).all();
  const hired = byStatus.find(s => s.status === 'hired')?.count || 0;
  const conversionRate = total > 0 ? Math.round((hired / total) * 10000) / 100 : 0;
  res.json({ success: true, data: { total, hired, conversion_rate: conversionRate, by_status: byStatus, top_referrers: topReferrers } });
});

// List referrals
router.get('/', async (req, res) => {
  const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
  let sql = `SELECT r.*, u.name as referrer_name, v.title as vacancy_title
    FROM referrals r
    LEFT JOIN users u ON r.referrer_user_id = u.id
    LEFT JOIN vacancies v ON r.vacancy_id = v.id`;
  const params = [];
  if (!isAdmin) {
    sql += ' WHERE r.referrer_user_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY r.created_at DESC';
  const data = await db.prepare(sql).all(...params);
  res.json({ success: true, data });
});

// Create referral
router.post('/', async (req, res) => {
  const { candidate_name, candidate_phone, candidate_email, vacancy_id, notes } = req.body;
  if (!candidate_name) return res.status(400).json({ success: false, error: 'candidate_name required' });
  const r = await db.prepare(`INSERT INTO referrals (referrer_user_id, candidate_name, candidate_phone, candidate_email, vacancy_id, notes)
    VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.id, candidate_name, candidate_phone || null, candidate_email || null, vacancy_id || null, notes || null);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

// Update referral status
router.put('/:id/status', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { status } = req.body;
  const valid = ['submitted', 'reviewed', 'shortlisted', 'hired', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  await db.prepare('UPDATE referrals SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true, data: { id: +req.params.id, status } });
});

export default router;
