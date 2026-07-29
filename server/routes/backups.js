import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createBackup, listBackups, readBackup } from '../lib/backup.js';
import { logAudit } from './audit.js';

const router = Router();

// --- Scheduled run -----------------------------------------------------------
// Mounted before `authenticate` because Vercel Cron cannot carry a user JWT. It
// authenticates with CRON_SECRET instead, which Vercel sends as a bearer token.
// With no secret configured the endpoint refuses to run rather than sitting open.
export async function cronBackupHandler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, error: 'CRON_SECRET is not configured' });
  }
  const provided = req.headers.authorization?.replace(/^Bearer /, '') || req.query.secret;
  if (provided !== secret) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await createBackup('scheduled');
    console.log('[backup] scheduled backup stored', result.key, result.size, 'bytes');
    res.json({ success: true, data: { key: result.key, size: result.size, pruned: result.pruned.length } });
  } catch (e) {
    console.error('[backup] scheduled backup failed:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

// --- Operator-facing ---------------------------------------------------------
router.use(authenticate, authorize('super_admin'));

router.get('/', async (_req, res) => {
  res.json({ success: true, data: await listBackups() });
});

router.post('/', async (req, res) => {
  const result = await createBackup('manual');
  await logAudit(req.user.id, req.user.name, 'create_backup', 'backup', null, result.key, req.ip);
  res.json({ success: true, data: { key: result.key, size: result.size, pruned: result.pruned.length } });
});

// The key contains a slash, so it arrives as a wildcard rather than a param.
router.get('/download/*', async (req, res) => {
  const file = await readBackup(`backups/${req.params[0]}`);
  if (!file) return res.status(404).json({ success: false, error: 'Backup not found' });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.send(file.buffer);
});

export default router;
