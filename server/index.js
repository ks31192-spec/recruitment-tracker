import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { ensureReady, refreshFromFirestore } from './db/connection.js';
import { readFile } from './lib/filestore.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import vacancyRoutes from './routes/vacancies.js';
import candidateRoutes from './routes/candidates.js';
import applicationRoutes from './routes/applications.js';
import interviewRoutes from './routes/interviews.js';
import offerRoutes from './routes/offers.js';
import communicationRoutes from './routes/communications.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/upload.js';
import exportRoutes from './routes/export.js';
import publicRoutes from './routes/public.js';
import auditRoutes from './routes/audit.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import referralRoutes from './routes/referrals.js';
import portalRoutes from './routes/portal.js';
import brandingRoutes, { manifestHandler } from './routes/branding.js';
import emailRoutes from './routes/email.js';
import talentPoolRoutes from './routes/talent-pool.js';
import backupRoutes, { cronBackupHandler } from './routes/backups.js';
import maintenanceRoutes from './routes/maintenance.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
// Uploads live in the file store, not on disk — /tmp does not survive a cold start
// on Vercel. `authenticate` also accepts `?token=`, which is what <img>/<a> use.
app.get('/uploads/*', authenticate, async (req, res) => {
  const file = await readFile(req.params[0]);
  if (!file) return res.status(404).json({ success: false, error: 'File not found' });
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(file.buffer);
});

app.get('/api/health', async (_req, res) => {
  try {
    await ensureReady();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, stack: e.stack });
  }
});

app.use('/api', (req, res, next) => { ensureReady().then(() => refreshFromFirestore()).then(() => next()).catch(next); });

// Public routes (no auth)
app.use('/api/branding', brandingRoutes);
// Served from the DB so the installed app follows the branding settings.
app.get('/api/manifest.webmanifest', manifestHandler);
app.use('/api/public', publicRoutes);
app.use('/api/portal', portalRoutes);
// Vercel Cron cannot present a user token; this one carries CRON_SECRET instead.
app.get('/api/cron/backup', cronBackupHandler);

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/talent-pool', talentPoolRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api', uploadRoutes);
app.use('/api/export', exportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;

if (!process.env.VERCEL) {
  const PORT = 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
