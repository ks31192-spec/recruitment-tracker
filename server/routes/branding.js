import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /branding - public, no auth needed (used by login/careers pages too)
router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ success: true, data: settings });
});

// PUT /branding - admin only
router.put('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const { school_name, school_tagline, school_short, school_logo } = req.body;
  if (school_name) await db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('school_name', school_name.trim());
  if (school_tagline) await db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('school_tagline', school_tagline.trim());
  if (school_short !== undefined) await db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('school_short', (school_short || '').trim());
  if (school_logo !== undefined) {
    if (school_logo) {
      if (school_logo.length > 500000) return res.status(400).json({ success: false, error: 'Logo too large. Please use a smaller image.' });
      await db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('school_logo', school_logo);
    } else {
      await db.prepare('DELETE FROM site_settings WHERE key = ?').run('school_logo');
    }
  }
  const rows = await db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ success: true, data: settings });
});

export default router;
