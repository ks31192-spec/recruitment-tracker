import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
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

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: user });
});

router.post('/change-password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Both passwords required' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true, data: { message: 'Password changed' } });
});

export default router;
