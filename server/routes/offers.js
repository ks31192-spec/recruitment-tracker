import { Router } from 'express';
import PDFDocument from 'pdfkit';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

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

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtSalary(v) {
  return v ? `Rs. ${Number(v).toLocaleString('en-IN')}` : 'As discussed';
}

async function generateOfferPDF(offer, res) {
  const nameRow = await db.prepare("SELECT value FROM site_settings WHERE key = 'school_name'").get();
  const schoolName = nameRow?.value || 'A M World School';

  const doc = new PDFDocument({ size: 'A4', margins: { top: 72, bottom: 72, left: 72, right: 72 } });

  const filename = `offer-letter-${offer.full_name.replace(/\s+/g, '-')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const blue = '#1e40af';
  const gray = '#555555';
  const black = '#1a1a1a';
  const pw = 451; // page width minus margins

  // Header
  doc.fontSize(20).fillColor(blue).text(schoolName, { align: 'center' });
  doc.fontSize(10).fillColor(gray).text('Excellence in Education', { align: 'center' });
  doc.moveDown(0.5);
  const y = doc.y;
  doc.moveTo(72, y).lineTo(72 + pw, y).lineWidth(1).strokeColor(blue).stroke();
  doc.moveTo(72, y + 3).lineTo(72 + pw, y + 3).stroke();
  doc.y = y + 16;

  // Ref line
  const ref = `Ref: AMWS/HR/${new Date().getFullYear()}/${String(offer.id).padStart(4, '0')}`;
  const date = `Date: ${fmtDate(offer.offer_date)}`;
  doc.fontSize(10).fillColor(gray);
  doc.text(ref, 72, doc.y, { continued: false });
  doc.text(date, 72, doc.y - 14, { align: 'right' });
  doc.moveDown(1);

  // Addressee
  doc.fontSize(11).fillColor(black).text('To,');
  doc.font('Helvetica-Bold').text(offer.full_name);
  if (offer.current_city) doc.font('Helvetica').text(offer.current_city);
  doc.font('Helvetica');
  doc.moveDown(1);

  // Title
  doc.fontSize(14).fillColor(blue).font('Helvetica-Bold').text('OFFER OF APPOINTMENT', { align: 'center', underline: true });
  doc.moveDown(0.8);

  // Body
  doc.fontSize(11).fillColor(black).font('Helvetica');
  doc.text(`Dear ${offer.full_name},`);
  doc.moveDown(0.5);
  doc.text(`We are pleased to offer you the position at ${schoolName}. Based on your qualifications, experience, and performance during the selection process, we are confident that you will be a valuable addition to our team.`, { lineGap: 3 });
  doc.moveDown(0.8);

  // Details table
  const position = offer.designation_offered || offer.designation_title || offer.vacancy_title;
  const details = [
    ['Position', position],
    ['Department', offer.department_name || '-'],
  ];
  if (offer.subject) details.push(['Subject', offer.subject]);
  details.push(
    ['Monthly CTC', fmtSalary(offer.salary_offered)],
    ['Proposed Joining Date', offer.joining_date_proposed ? fmtDate(offer.joining_date_proposed) : 'To be confirmed'],
    ['Probation Period', '6 months from the date of joining'],
  );

  const tableTop = doc.y;
  const col1W = 160;
  const col2W = pw - col1W;
  details.forEach(([label, value], i) => {
    const rowY = tableTop + i * 26;
    // light bg for alternating rows
    if (i % 2 === 0) {
      doc.rect(72, rowY, pw, 26).fill('#f8f9fa');
    }
    doc.fillColor('#444444').font('Helvetica-Bold').fontSize(10).text(label, 82, rowY + 7, { width: col1W - 10 });
    doc.fillColor(black).font('Helvetica').text(value, 72 + col1W, rowY + 7, { width: col2W - 10 });
  });
  doc.y = tableTop + details.length * 26 + 16;

  // Terms
  doc.font('Helvetica-Bold').fontSize(11).fillColor(black).text('Terms & Conditions:');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
  const terms = [
    'This offer is subject to verification of your original documents and certificates.',
    'The probation period will be of 6 months, during which your performance will be reviewed.',
    'You are expected to maintain the highest standards of professional conduct and ethics.',
    'During the probation period, either party may terminate the employment with one month\'s notice.',
    'After confirmation, a notice period of two months shall apply.',
  ];
  terms.forEach((t, i) => {
    doc.text(`${i + 1}. ${t}`, { indent: 10, lineGap: 2 });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.5);
  const deadline = offer.joining_date_proposed
    ? fmtDate(new Date(new Date(offer.joining_date_proposed).getTime() - 7 * 24 * 60 * 60 * 1000))
    : '7 days from receipt';
  doc.fontSize(11).text(`Kindly confirm your acceptance of this offer by signing and returning a copy of this letter by `, { continued: true });
  doc.font('Helvetica-Bold').text(`${deadline}.`, { continued: false });
  doc.font('Helvetica');
  doc.moveDown(0.5);
  doc.text(`We look forward to welcoming you to the ${schoolName} family.`);
  doc.moveDown(0.8);
  doc.text('Warm regards,');

  // Signatures
  const sigY = Math.max(doc.y + 50, 680);
  doc.moveTo(72, sigY).lineTo(230, sigY).lineWidth(0.5).strokeColor('#333333').stroke();
  doc.moveTo(330, sigY).lineTo(523, sigY).stroke();
  doc.fontSize(9).fillColor(gray);
  doc.text('Principal / Authorized Signatory', 72, sigY + 6, { width: 158, align: 'center' });
  doc.text(schoolName, 72, sigY + 18, { width: 158, align: 'center' });
  doc.text('Candidate\'s Signature', 330, sigY + 6, { width: 193, align: 'center' });
  doc.text(offer.full_name, 330, sigY + 18, { width: 193, align: 'center' });

  doc.end();
}

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
  await generateOfferPDF(offer, res);
});

export default router;
