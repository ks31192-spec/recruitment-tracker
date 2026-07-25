import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

export async function logAudit(userId, userName, action, entityType, entityId, details, ipAddress) {
  await db.prepare('INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, userName, action, entityType, entityId || null, details || null, ipAddress || null);
}

router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  const { entity_type, user_id, action, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  if (action) { sql += ' AND action LIKE ?'; params.push(`%${action}%`); }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = (await db.prepare(countSql).get(...params))?.total || 0;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(+limit, offset);
  const rows = await db.prepare(sql).all(...params);
  res.json({ success: true, data: { logs: rows, total, page: +page, pages: Math.ceil(total / limit) } });
});

export default router;
