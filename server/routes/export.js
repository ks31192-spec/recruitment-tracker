import { Router } from 'express';
import PDFDocument from 'pdfkit';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/candidates', async (req, res) => {
  const { search, source } = req.query;
  let sql = `SELECT c.id, c.full_name, c.father_or_husband_name, c.gender, c.date_of_birth, c.phone, c.whatsapp_number, c.email, c.current_city, c.current_state, c.source, c.referrer_name, c.notes, c.created_at FROM candidates c WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
  if (source) { sql += ' AND c.source = ?'; params.push(source); }
  sql += ' ORDER BY c.created_at DESC';
  const rows = await db.prepare(sql).all(...params);

  const headers = ['ID', 'Full Name', "Father's/Husband's Name", 'Gender', 'DOB', 'Phone', 'WhatsApp', 'Email', 'City', 'State', 'Source', 'Referrer', 'Notes', 'Created'];
  let csv = headers.join(',') + '\n';
  rows.forEach(r => {
    csv += [r.id, esc(r.full_name), esc(r.father_or_husband_name), r.gender, r.date_of_birth, r.phone, r.whatsapp_number, esc(r.email), esc(r.current_city), esc(r.current_state), r.source, esc(r.referrer_name), esc(r.notes), r.created_at].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
  res.send(csv);
});

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
}

const stageLabels = {
  applied: 'Applied', shortlisted: 'Shortlisted', interview_scheduled: 'Interview Scheduled',
  interview_done: 'Interview Done', demo_scheduled: 'Demo Scheduled', demo_done: 'Demo Done',
  selected: 'Selected', offer_made: 'Offer Made', joined: 'Joined',
  rejected: 'Rejected', waitlisted: 'Waitlisted', declined: 'Declined', no_response: 'No Response',
};

router.get('/vacancy-report/:id', async (req, res) => {
  const v = await db.prepare(`SELECT v.*, d.name as department_name, des.title as designation_title
    FROM vacancies v LEFT JOIN departments d ON v.department_id = d.id LEFT JOIN designations des ON v.designation_id = des.id WHERE v.id = ?`).get(req.params.id);
  if (!v) return res.status(404).json({ success: false, error: 'Not found' });

  const apps = await db.prepare(`SELECT a.*, c.full_name, c.phone, c.email, c.source FROM applications a
    JOIN candidates c ON a.candidate_id = c.id WHERE a.vacancy_id = ? ORDER BY a.applied_date`).all(req.params.id);

  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 }, layout: 'landscape' });
  const filename = `vacancy-${v.id}-report.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const blue = '#1e40af';
  const gray = '#666666';
  const pw = 747; // landscape A4 minus margins

  // Header
  doc.fontSize(16).fillColor(blue).font('Helvetica-Bold').text('Vacancy Report', { align: 'center' });
  doc.fontSize(10).fillColor(gray).font('Helvetica').text('A M World School', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(50 + pw, doc.y).lineWidth(1).strokeColor(blue).stroke();
  doc.moveDown(0.6);

  // Vacancy info
  doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text(v.title);
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor(gray);
  const info = [
    `Department: ${v.department_name || '-'}`,
    `Designation: ${v.designation_title || '-'}`,
    `Subject: ${v.subject || '-'}`,
    `Status: ${v.status?.toUpperCase()}`,
    `Positions: ${v.positions_filled || 0}/${v.positions_count} filled`,
    `Created: ${fmtDate(v.created_at)}`,
  ];
  doc.text(info.join('  |  '), { lineGap: 2 });
  if (v.salary_range_min || v.salary_range_max) {
    doc.text(`Salary Range: Rs. ${Number(v.salary_range_min || 0).toLocaleString('en-IN')} - Rs. ${Number(v.salary_range_max || 0).toLocaleString('en-IN')}`);
  }
  doc.moveDown(0.8);

  // Table header
  doc.fontSize(12).fillColor('#1a1a1a').font('Helvetica-Bold').text(`Applicants (${apps.length})`);
  doc.moveDown(0.4);

  if (apps.length === 0) {
    doc.fontSize(10).fillColor(gray).font('Helvetica').text('No applicants yet.');
  } else {
    const cols = [
      { header: '#', width: 30 },
      { header: 'Name', width: 150 },
      { header: 'Phone', width: 100 },
      { header: 'Email', width: 160 },
      { header: 'Source', width: 80 },
      { header: 'Stage', width: 120 },
      { header: 'Applied', width: pw - 30 - 150 - 100 - 160 - 80 - 120 },
    ];

    const tableTop = doc.y;
    const rowH = 22;

    // Header row
    doc.rect(50, tableTop, pw, rowH).fill('#1e3a5f');
    let xPos = 50;
    cols.forEach(col => {
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold').text(col.header, xPos + 4, tableTop + 6, { width: col.width - 8 });
      xPos += col.width;
    });

    // Data rows
    apps.forEach((a, i) => {
      const rowY = tableTop + rowH + i * rowH;
      if (rowY > 520) {
        doc.addPage();
        doc.y = 50;
        return;
      }
      if (i % 2 === 0) doc.rect(50, rowY, pw, rowH).fill('#f8f9fa');
      xPos = 50;
      const sourceLabels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call' };
      const row = [
        String(i + 1),
        a.full_name || '-',
        a.phone || '-',
        a.email || '-',
        sourceLabels[a.source] || a.source || '-',
        stageLabels[a.current_stage] || a.current_stage || '-',
        fmtDate(a.applied_date),
      ];
      row.forEach((val, ci) => {
        doc.fontSize(9).fillColor('#333333').font('Helvetica').text(val, xPos + 4, rowY + 6, { width: cols[ci].width - 8, lineBreak: false });
        xPos += cols[ci].width;
      });
    });

    // Stage summary at the bottom
    const stageCounts = {};
    apps.forEach(a => { stageCounts[a.current_stage] = (stageCounts[a.current_stage] || 0) + 1; });
    doc.y = Math.max(doc.y, tableTop + rowH + apps.length * rowH + 20);
    doc.moveDown(1);
    doc.fontSize(11).fillColor('#1a1a1a').font('Helvetica-Bold').text('Stage Summary');
    doc.moveDown(0.3);
    Object.entries(stageCounts).forEach(([stage, count]) => {
      doc.fontSize(10).font('Helvetica').fillColor(gray).text(`${stageLabels[stage] || stage}: ${count}`, { indent: 10 });
    });
  }

  // Footer
  doc.fontSize(8).fillColor('#999999').text(`Generated on ${new Date().toLocaleString('en-IN')}`, 50, 550, { align: 'right', width: pw });

  doc.end();
});

router.get('/database-backup', authorize('super_admin'), async (req, res) => {
  const tables = ['users', 'academic_years', 'departments', 'designations', 'vacancies', 'candidates',
    'candidate_qualifications', 'candidate_experience', 'applications', 'application_stage_history',
    'interviews', 'interview_panel', 'evaluations', 'offers', 'communication_log', 'documents'];
  const backup = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    backup.tables[t] = await db.prepare(`SELECT * FROM ${t}`).all();
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="recruitment-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

router.get('/template', (req, res) => {
  const csv = 'Full Name,Father/Husband Name,Gender(male/female/other),DOB(YYYY-MM-DD),Phone,WhatsApp,Email,City,State,Aadhar(12-digit),Oasis ID,Current Salary,Expected Salary,Source(walk_in/naukri/whatsapp/referral/website/direct_call/other),Referrer Name,Notes\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="candidate-import-template.csv"');
  res.send(csv);
});

router.post('/candidates-import', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { rows } = req.body;
  if (!rows?.length) return res.status(400).json({ success: false, error: 'No rows provided' });

  let imported = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.full_name) { errors.push(`Row ${i + 1}: missing full name`); continue; }
    const aadhar = row.aadhar_number ? String(row.aadhar_number).replace(/\s/g, '') : null;
    try {
      await db.prepare(`INSERT INTO candidates (full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, aadhar_number, oasis_id, current_salary, expected_salary, source, referrer_name, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(row.full_name, row.father_or_husband_name || null, row.gender || null, row.date_of_birth || null, row.phone || null, row.whatsapp_number || null, row.email || null, row.current_city || null, row.current_state || null, aadhar, row.oasis_id || null, row.current_salary || null, row.expected_salary || null, row.source || null, row.referrer_name || null, row.notes || null, req.user.id);
      imported++;
    } catch (e) { errors.push(`Row ${i + 1}: ${e.message}`); }
  }
  res.json({ success: true, data: { imported, errors } });
});

function esc(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default router;
