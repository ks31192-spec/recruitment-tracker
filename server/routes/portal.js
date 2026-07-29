import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import db from '../db/connection.js';
import multer from 'multer';
import { extname } from 'path';
import { saveFile, uniqueName } from '../lib/filestore.js';
import { sendPortalOtp } from '../lib/email.js';

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many OTP requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// A 6-digit code is only 1,000,000 guesses, so verification needs its own cap.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Show the candidate which address the code went to without publishing it in full.
function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  if (!domain) return '';
  const shown = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  return `${shown}${'•'.repeat(Math.max(3, user.length - shown.length))}@${domain}`;
}

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

const router = Router();

// Request OTP. The code is delivered by email — the candidate may look themselves
// up by phone or by email, but either way it goes to the address on their record.
router.post('/request-otp', otpLimiter, async (req, res) => {
  const identifier = String(req.body.identifier ?? req.body.phone ?? '').trim();
  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Phone number or email is required' });
  }

  const candidate = await db
    .prepare(`SELECT id, full_name, phone, email FROM candidates
              WHERE phone = ? OR whatsapp_number = ? OR lower(email) = lower(?)`)
    .get(identifier, identifier, identifier);

  if (!candidate) {
    return res.status(404).json({ success: false, error: 'No application found for that phone number or email' });
  }
  if (!candidate.email?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'We do not have an email address on your application, so we cannot send a login code. Please contact the school office.',
    });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Retire any earlier unused codes so only the newest one works.
  await db.prepare(
    `DELETE FROM candidate_portal_tokens WHERE candidate_id = ? AND otp NOT LIKE 'session:%'`
  ).run(candidate.id);

  const inserted = await db
    .prepare('INSERT INTO candidate_portal_tokens (candidate_id, phone, otp, expires_at) VALUES (?, ?, ?, ?)')
    .run(candidate.id, identifier, otp, expiresAt);

  const delivery = await sendPortalOtp(candidate.email.trim(), candidate.full_name, otp);

  if (!delivery.sent) {
    // Without email configured at all there is no way in locally, so fall back to
    // returning the code off-production rather than leaving the portal unusable.
    if (!process.env.VERCEL && delivery.reason === 'no_api_key') {
      return res.json({
        success: true,
        data: { message: 'Email is not configured — showing the code for local testing.', otp, email_hint: maskEmail(candidate.email) },
      });
    }
    // Don't leave a live code behind for a message that never went out.
    await db.prepare('DELETE FROM candidate_portal_tokens WHERE id = ?').run(inserted.lastInsertRowid);
    return res.status(502).json({
      success: false,
      error: `We could not send your login code: ${delivery.reason}. Please contact the school office.`,
    });
  }

  res.json({
    success: true,
    data: { message: 'Login code sent', email_hint: maskEmail(candidate.email) },
  });
});

// Verify OTP
router.post('/verify-otp', verifyLimiter, async (req, res) => {
  const phone = String(req.body.identifier ?? req.body.phone ?? '').trim();
  const { otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
  }

  const token = await db
    .prepare(
      `SELECT * FROM candidate_portal_tokens
       WHERE phone = ? AND otp = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(phone.trim(), otp.trim());

  if (!token) {
    return res.status(401).json({ success: false, error: 'Invalid or expired OTP' });
  }

  // Delete used OTP token
  await db.prepare('DELETE FROM candidate_portal_tokens WHERE id = ?').run(token.id);

  // Issue a portal session token (valid 1 hour)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.prepare(
    'INSERT INTO candidate_portal_tokens (candidate_id, phone, otp, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token.candidate_id, phone.trim(), `session:${sessionToken}`, sessionExpires);

  // Fetch candidate details
  const candidate = await db
    .prepare('SELECT id, full_name, phone, whatsapp_number, email, current_city, current_state FROM candidates WHERE id = ?')
    .get(token.candidate_id);

  // Fetch applications with vacancy info
  const applications = await db
    .prepare(
      `SELECT a.id, a.current_stage, a.applied_date, a.created_at,
              v.title as vacancy_title, v.subject, d.name as department_name
       FROM applications a
       JOIN vacancies v ON a.vacancy_id = v.id
       LEFT JOIN departments d ON v.department_id = d.id
       WHERE a.candidate_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(token.candidate_id);

  // Fetch documents
  const documents = await db
    .prepare('SELECT id, doc_type, file_name, uploaded_at FROM documents WHERE candidate_id = ?')
    .all(token.candidate_id);

  res.json({
    success: true,
    data: {
      session_token: sessionToken,
      candidate,
      applications,
      documents,
    },
  });
});

// Upload document — requires portal session token
router.post('/upload-document', upload.single('file'), async (req, res) => {
  const { candidate_id, session_token } = req.body;
  if (!candidate_id || !session_token) {
    return res.status(400).json({ success: false, error: 'candidate_id and session_token are required' });
  }

  const session = await db.prepare(
    `SELECT * FROM candidate_portal_tokens
     WHERE candidate_id = ? AND otp = ? AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`
  ).get(candidate_id, `session:${session_token}`);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'File is required' });
  }

  const key = `portal/${uniqueName(req.file.originalname)}`;
  await saveFile(key, req.file.buffer, { name: req.file.originalname, mime: req.file.mimetype });
  const filePath = `uploads/${key}`;
  const r = await db
    .prepare('INSERT INTO documents (candidate_id, doc_type, file_name, file_path) VALUES (?, ?, ?, ?)')
    .run(candidate_id, 'other', req.file.originalname, filePath);

  res.json({
    success: true,
    data: { id: r.lastInsertRowid, file_name: req.file.originalname, file_path: filePath },
  });
});

export default router;
