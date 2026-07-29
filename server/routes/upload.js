import { Router } from 'express';
import multer from 'multer';
import { extname } from 'path';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { saveFile, uniqueName } from '../lib/filestore.js';

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
router.use(authenticate);
// Writing to a candidate's file is a recruiting action — viewers and panel
// members get read access only.
const canUpload = authorize('super_admin', 'admin', 'hr');

// The id lands in the storage key, so keep it to digits.
function candidateId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid candidate id' });
    return null;
  }
  return id;
}

router.post('/candidates/:id/documents', canUpload, upload.single('file'), async (req, res) => {
  const id = candidateId(req, res);
  if (!id) return;
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const doc_type = req.body.doc_type || 'other';
  const relativePath = `uploads/${id}/${uniqueName(req.file.originalname)}`;
  await saveFile(relativePath.slice('uploads/'.length), req.file.buffer, {
    name: req.file.originalname,
    mime: req.file.mimetype,
  });
  const r = await db.prepare(`INSERT INTO documents (candidate_id, doc_type, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, doc_type, req.file.originalname, relativePath, req.user.id);
  res.json({ success: true, data: { id: r.lastInsertRowid, file_name: req.file.originalname, file_path: relativePath } });
});

router.post('/candidates/:id/photo', canUpload, upload.single('photo'), async (req, res) => {
  const id = candidateId(req, res);
  if (!id) return;
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const relativePath = `uploads/${id}/${uniqueName(req.file.originalname)}`;
  await saveFile(relativePath.slice('uploads/'.length), req.file.buffer, {
    name: req.file.originalname,
    mime: req.file.mimetype,
  });
  await db.prepare('UPDATE candidates SET photo_path = ?, updated_at = datetime("now") WHERE id = ?').run(relativePath, id);
  res.json({ success: true, data: { photo_path: relativePath } });
});

export default router;
