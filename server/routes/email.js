import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendEmail } from '../lib/email.js';

const router = Router();
router.use(authenticate);

router.get('/status', authorize('super_admin'), async (req, res) => {
  const configured = !!process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@resend.dev';
  res.json({
    success: true,
    data: {
      configured,
      from,
      provider: 'Resend',
    },
  });
});

router.post('/test', authorize('super_admin'), async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, error: 'to email required' });

  const result = await sendEmail({
    to,
    subject: 'Test Email — Recruitment Tracker',
    html: `<div style="font-family:sans-serif;padding:20px">
      <h2 style="color:#4f46e5">Email is working!</h2>
      <p>This is a test email from your Recruitment Tracker platform.</p>
      <p style="color:#6b7280;font-size:13px">Sent at ${new Date().toLocaleString('en-IN')}</p>
    </div>`,
  });

  if (result.sent) {
    res.json({ success: true, data: { message: 'Test email sent', id: result.id } });
  } else {
    res.status(500).json({ success: false, error: result.reason });
  }
});

export default router;
