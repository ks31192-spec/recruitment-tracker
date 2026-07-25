import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = join(uploadsDir, String(req.params.id));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.post('/candidates/:id/documents', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const doc_type = req.body.doc_type || 'other';
  const relativePath = `uploads/${req.params.id}/${req.file.filename}`;
  const r = await db.prepare(`INSERT INTO documents (candidate_id, doc_type, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)`)
    .run(req.params.id, doc_type, req.file.originalname, relativePath, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid, file_name: req.file.originalname, file_path: relativePath } });
});

router.post('/candidates/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const relativePath = `uploads/${req.params.id}/${req.file.filename}`;
  await db.prepare('UPDATE candidates SET photo_path = ?, updated_at = datetime("now") WHERE id = ?').run(relativePath, req.params.id);
  res.json({ success: true, data: { photo_path: relativePath } });
});

export default router;
