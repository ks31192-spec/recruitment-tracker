import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  return null;
}

const router = Router();

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }
  const user = await db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: user });
});

router.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Both passwords required' });
  }
  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ success: false, error: pwError });
  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true, data: { message: 'Password changed' } });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  const user = await db.prepare('SELECT id, name, email FROM users WHERE email = ? AND is_active = 1').get(email);
  if (!user) return res.json({ success: true, data: { message: 'If that email exists, a reset link has been generated' } });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expires);

  res.json({ success: true, data: { message: 'If that email exists, a reset link has been generated' } });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ success: false, error: 'Token and new password required' });
  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ success: false, error: pwError });

  const record = await db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime("now")').get(token);
  if (!record) return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });

  const hash = bcrypt.hashSync(new_password, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hash, record.user_id);
  await db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

  res.json({ success: true, data: { message: 'Password reset successfully' } });
});

router.post('/admin-reset-password', authenticate, authorize('super_admin'), async (req, res) => {
  const { user_id, new_password } = req.body;
  if (!user_id || !new_password) return res.status(400).json({ success: false, error: 'user_id and new_password required' });
  const hash = bcrypt.hashSync(new_password, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hash, user_id);
  res.json({ success: true, data: { message: 'Password reset for user' } });
});

export default router;
