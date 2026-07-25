import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List notifications for current user, newest first, limit 50
router.get('/', async (req, res) => {
  const rows = await db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json({ success: true, data: rows });
});

// Count of unread notifications for current user
router.get('/unread-count', async (req, res) => {
  const row = await db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ success: true, data: { count: row.count } });
});

// Mark single notification as read
router.put('/:id/read', async (req, res) => {
  const result = await db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true });
});

// Mark all as read for current user
router.post('/mark-all-read', async (req, res) => {
  await db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).run(req.user.id);
  res.json({ success: true });
});

// Helper to create a notification from anywhere in the server
export async function createNotification(userId, title, body, link) {
  const result = await db.prepare(
    'INSERT INTO notifications (user_id, title, body, link) VALUES (?, ?, ?, ?)'
  ).run(userId, title, body || null, link || null);
  return result.lastInsertRowid;
}

export default router;
