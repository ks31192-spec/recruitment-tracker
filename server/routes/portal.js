import { Router } from 'express';
import db from '../db/connection.js';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(uploadsDir, 'portal');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone?.trim()) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const candidate = await db
    .prepare('SELECT id, full_name, phone FROM candidates WHERE phone = ? OR whatsapp_number = ?')
    .get(phone.trim(), phone.trim());

  if (!candidate) {
    return res.status(404).json({ success: false, error: 'No candidate found with this phone number' });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db
    .prepare('INSERT INTO candidate_portal_tokens (candidate_id, phone, otp, expires_at) VALUES (?, ?, ?, ?)')
    .run(candidate.id, phone.trim(), otp, expiresAt);

  res.json({
    success: true,
    data: { message: 'OTP sent', otp },
  });
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
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

  // Delete used token
  await db.prepare('DELETE FROM candidate_portal_tokens WHERE id = ?').run(token.id);

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
      candidate,
      applications,
      documents,
    },
  });
});

// Upload document (pass candidate_id in body)
router.post('/upload-document', upload.single('file'), async (req, res) => {
  const { candidate_id } = req.body;
  if (!candidate_id) {
    return res.status(400).json({ success: false, error: 'candidate_id is required' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'File is required' });
  }

  const candidate = await db.prepare('SELECT id FROM candidates WHERE id = ?').get(candidate_id);
  if (!candidate) {
    return res.status(404).json({ success: false, error: 'Candidate not found' });
  }

  const filePath = `/uploads/portal/${req.file.filename}`;
  const r = await db
    .prepare('INSERT INTO documents (candidate_id, doc_type, file_name, file_path) VALUES (?, ?, ?, ?)')
    .run(candidate_id, 'other', req.file.originalname, filePath);

  res.json({
    success: true,
    data: { id: r.lastInsertRowid, file_name: req.file.originalname, file_path: filePath },
  });
});

export default router;
