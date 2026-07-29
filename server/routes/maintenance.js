import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { findOrphans, repairOrphans } from '../lib/repair.js';
import { logAudit } from './audit.js';

const router = Router();
router.use(authenticate, authorize('super_admin'));

router.get('/orphans', async (_req, res) => {
  const orphans = await findOrphans();
  res.json({ success: true, data: { count: orphans.reduce((n, o) => n + o.rows.length, 0), tables: orphans } });
});

router.post('/orphans/repair', async (req, res) => {
  const removed = await repairOrphans();
  const count = removed.reduce((n, o) => n + o.rows.length, 0);
  if (count > 0) {
    // The removed rows go in the audit details so this is reversible by hand,
    // same as a vacancy/candidate delete.
    await logAudit(req.user.id, req.user.name, 'repair_orphans', 'maintenance', null, JSON.stringify(removed), req.ip);
  }
  res.json({ success: true, data: { count, tables: removed.map(o => ({ table: o.table, removed: o.rows.length })) } });
});

export default router;
