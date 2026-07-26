import { Router } from 'express';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Default joining/onboarding checklist, seeded on first view of an accepted offer.
const DEFAULT_ONBOARDING = [
  'Collect original documents & certificates', 'Sign & return appointment letter', 'Submit joining report',
  'Collect bank details for salary', 'Add to payroll', 'Issue ID card', 'Create official email / LMS access',
  'Class / subject allocation', 'Assign mentor / buddy', 'Orientation & induction', 'Handover teaching material',
];

function parseOnboarding(raw) {
  const seed = () => DEFAULT_ONBOARDING.map(item => ({ item, done: false, done_by: null, done_at: null }));
  if (!raw) return seed();
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : seed(); } catch { return seed(); }
}

router.post('/', async (req, res) => {
  const { application_id, designation_offered, salary_offered, joining_date_proposed } = req.body;
  if (!application_id) return res.status(400).json({ success: false, error: 'application_id required' });
  const r = await db.prepare(`INSERT INTO offers (application_id, designation_offered, salary_offered, joining_date_proposed) VALUES (?, ?, ?, ?)`)
    .run(application_id, designation_offered || null, salary_offered || null, joining_date_proposed || null);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.put('/:id', async (req, res) => {
  const { response, response_date, decline_reason, actually_joined, actual_joining_date, left_during_probation, probation_leave_date, probation_leave_reason, notes } = req.body;
  await db.prepare(`UPDATE offers SET response=?, response_date=?, decline_reason=?, actually_joined=?, actual_joining_date=?, left_during_probation=?, probation_leave_date=?, probation_leave_reason=?, notes=? WHERE id=?`)
    .run(response || 'pending', response_date || null, decline_reason || null, actually_joined ? 1 : 0, actual_joining_date || null, left_during_probation ? 1 : 0, probation_leave_date || null, probation_leave_reason || null, notes || null, req.params.id);
  res.json({ success: true, data: { id: +req.params.id } });
});

router.get('/pending', async (req, res) => {
  const rows = await db.prepare(`SELECT o.*, c.full_name, v.title as vacancy_title
    FROM offers o JOIN applications a ON o.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    WHERE o.response = 'pending' ORDER BY o.offer_date DESC`).all();
  res.json({ success: true, data: rows });
});

// --- Onboarding handoff ---
// List offers that have been accepted or joined, with onboarding progress.
router.get('/onboarding', async (_req, res) => {
  const rows = await db.prepare(`SELECT o.id, o.application_id, o.designation_offered, o.salary_offered, o.joining_date_proposed,
    o.response, o.actually_joined, o.actual_joining_date, o.onboarding,
    a.candidate_id, c.full_name, c.phone, v.id as vacancy_id, v.title as vacancy_title, d.name as department_name
    FROM offers o JOIN applications a ON o.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN departments d ON v.department_id = d.id
    WHERE o.response = 'accepted' OR o.actually_joined = 1
    ORDER BY COALESCE(o.actual_joining_date, o.joining_date_proposed) DESC`).all();
  const data = rows.map(o => {
    const items = parseOnboarding(o.onboarding);
    delete o.onboarding;
    return { ...o, onboarding: items, done_count: items.filter(i => i.done).length, total: items.length };
  });
  res.json({ success: true, data });
});

router.get('/:id/onboarding', async (req, res) => {
  const o = await db.prepare('SELECT onboarding FROM offers WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ success: false, error: 'Offer not found' });
  res.json({ success: true, data: parseOnboarding(o.onboarding) });
});

router.put('/:id/onboarding', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { onboarding } = req.body;
  if (!Array.isArray(onboarding)) return res.status(400).json({ success: false, error: 'onboarding array required' });
  const now = new Date().toISOString();
  const stamped = onboarding.map(i => ({
    item: i.item,
    done: !!i.done,
    done_by: i.done ? (i.done_by || req.user.name) : null,
    done_at: i.done ? (i.done_at || now) : null,
  }));
  await db.prepare('UPDATE offers SET onboarding = ? WHERE id = ?').run(JSON.stringify(stamped), req.params.id);
  res.json({ success: true, data: stamped });
});

router.get('/:id/letter', async (req, res) => {
  const offer = await db.prepare(`SELECT o.*, c.full_name, c.father_or_husband_name, c.phone, c.email, c.current_city,
    v.title as vacancy_title, v.subject, d.name as department_name, des.title as designation_title
    FROM offers o
    JOIN applications a ON o.application_id = a.id
    JOIN candidates c ON a.candidate_id = c.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN designations des ON v.designation_id = des.id
    WHERE o.id = ?`).get(req.params.id);

  if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

  const salaryFormatted = offer.salary_offered ? `₹${Number(offer.salary_offered).toLocaleString('en-IN')}` : 'As discussed';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offer Letter - ${offer.full_name}</title>
<style>
  @page{margin:2.5cm}body{font-family:'Georgia',serif;color:#1a1a1a;line-height:1.8;max-width:700px;margin:40px auto;padding:40px}
  .header{text-align:center;border-bottom:3px double #1e40af;padding-bottom:20px;margin-bottom:30px}
  .header h1{color:#1e40af;font-size:22px;margin:0}
  .header p{color:#666;font-size:12px;margin:4px 0 0}
  .ref{display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:24px}
  h2{font-size:16px;text-align:center;margin:24px 0 16px;text-decoration:underline}
  .details{margin:20px 0}
  .details table{width:100%;border-collapse:collapse}
  .details td{padding:6px 12px;font-size:14px;border-bottom:1px solid #eee}
  .details td:first-child{font-weight:bold;width:40%;color:#444}
  .sign{margin-top:60px;display:flex;justify-content:space-between}
  .sign div{text-align:center;width:40%}
  .sign .line{border-top:1px solid #333;margin-top:40px;padding-top:8px;font-size:13px}
  @media print{body{margin:0;padding:20px}}
</style></head><body>
<div class="header">
  <h1>A M World School</h1>
  <p>Excellence in Education</p>
</div>
<div class="ref">
  <span>Ref: AMWS/HR/${new Date().getFullYear()}/${String(offer.id).padStart(4, '0')}</span>
  <span>Date: ${new Date(offer.offer_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
</div>
<p>To,<br><strong>${offer.full_name}</strong>${offer.current_city ? `<br>${offer.current_city}` : ''}</p>
<h2>OFFER OF APPOINTMENT</h2>
<p>Dear <strong>${offer.full_name}</strong>,</p>
<p>We are pleased to offer you the position at A M World School. Based on your qualifications, experience, and performance during the selection process, we are confident that you will be a valuable addition to our team.</p>
<div class="details">
<table>
  <tr><td>Position</td><td>${offer.designation_offered || offer.designation_title || offer.vacancy_title}</td></tr>
  <tr><td>Department</td><td>${offer.department_name || '-'}</td></tr>
  ${offer.subject ? `<tr><td>Subject</td><td>${offer.subject}</td></tr>` : ''}
  <tr><td>Monthly CTC</td><td>${salaryFormatted}</td></tr>
  <tr><td>Proposed Joining Date</td><td>${offer.joining_date_proposed ? new Date(offer.joining_date_proposed).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'To be confirmed'}</td></tr>
  <tr><td>Probation Period</td><td>6 months from the date of joining</td></tr>
</table>
</div>
<p><strong>Terms &amp; Conditions:</strong></p>
<ol style="font-size:14px">
  <li>This offer is subject to verification of your original documents and certificates.</li>
  <li>The probation period will be of 6 months, during which your performance will be reviewed.</li>
  <li>You are expected to maintain the highest standards of professional conduct and ethics.</li>
  <li>During the probation period, either party may terminate the employment with one month's notice.</li>
  <li>After confirmation, a notice period of two months shall apply.</li>
</ol>
<p>Kindly confirm your acceptance of this offer by signing and returning a copy of this letter by <strong>${offer.joining_date_proposed ? new Date(new Date(offer.joining_date_proposed).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '7 days from receipt'}</strong>.</p>
<p>We look forward to welcoming you to the A M World School family.</p>
<p style="margin-top:24px">Warm regards,</p>
<div class="sign">
  <div>
    <div class="line">Principal / Authorized Signatory<br>A M World School</div>
  </div>
  <div>
    <div class="line">Candidate's Signature<br>${offer.full_name}</div>
  </div>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="offer-letter-${offer.full_name.replace(/\s+/g, '-')}.html"`);
  res.send(html);
});

export default router;
