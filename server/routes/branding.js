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

async function loadSettings() {
  const rows = await db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings;
}

// The uploaded logo is stored as a data URI; the manifest needs a real URL,
// so serve the decoded bytes here.
router.get('/logo.png', async (req, res) => {
  const settings = await loadSettings();
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/s.exec(settings.school_logo || '');
  if (!m) return res.status(404).json({ success: false, error: 'No logo set' });
  const buf = Buffer.from(m[2], 'base64');
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(buf);
});

// Home-screen labels get cut off around 12 characters, so build a short name
// out of whole leading words rather than truncating mid-word.
function shortNameFrom(name) {
  const words = String(name || '').split(/\s+/).filter(Boolean);
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > 12) break;
    out = next;
  }
  return out || String(name || '').slice(0, 12) || 'Recruitment';
}

// PNG dimensions live in the IHDR chunk, so the manifest can declare the
// logo's true size instead of guessing.
function pngSize(buf) {
  if (buf.length < 24 || buf.slice(1, 4).toString() !== 'PNG') return null;
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

const FALLBACK_ICONS = [48, 72, 96, 128, 144, 152, 192, 384, 512].map(s => ({
  src: `/icon-${s}x${s}.png`, sizes: `${s}x${s}`, type: 'image/png',
}));

// Built from the branding settings so an installed app carries the
// organisation's own name and logo, not whatever was baked in at build time.
export async function manifestHandler(req, res) {
  const settings = await loadSettings();
  const name = settings.school_name || 'Recruitment Tracker';

  let icons = [...FALLBACK_ICONS, { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }];
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/s.exec(settings.school_logo || '');
  if (m) {
    const size = pngSize(Buffer.from(m[2], 'base64'));
    // Declared as "any" only — a bare logo has no safe padding, so marking it
    // maskable would let Android crop its edges.
    if (size) icons = [{ src: '/api/branding/logo.png', sizes: size, type: m[1], purpose: 'any' }];
  }

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.json({
    name,
    short_name: shortNameFrom(name),
    description: settings.school_tagline || `Recruitment management for ${name}`,
    theme_color: '#2563eb',
    background_color: '#f8fafc',
    display: 'standalone',
    orientation: 'any',
    scope: '/',
    start_url: '/',
    categories: ['business', 'productivity'],
    icons,
  });
}

export default router;
