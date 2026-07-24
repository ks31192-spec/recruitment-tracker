import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();
router.use(authenticate);

router.get('/candidates', (req, res) => {
  const { search, source } = req.query;
  let sql = `SELECT c.id, c.full_name, c.father_or_husband_name, c.gender, c.date_of_birth, c.phone, c.whatsapp_number, c.email, c.current_city, c.current_state, c.source, c.referrer_name, c.notes, c.created_at FROM candidates c WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
  if (source) { sql += ' AND c.source = ?'; params.push(source); }
  sql += ' ORDER BY c.created_at DESC';
  const rows = db.prepare(sql).all(...params);

  const headers = ['ID', 'Full Name', "Father's/Husband's Name", 'Gender', 'DOB', 'Phone', 'WhatsApp', 'Email', 'City', 'State', 'Source', 'Referrer', 'Notes', 'Created'];
  let csv = headers.join(',') + '\n';
  rows.forEach(r => {
    csv += [r.id, esc(r.full_name), esc(r.father_or_husband_name), r.gender, r.date_of_birth, r.phone, r.whatsapp_number, esc(r.email), esc(r.current_city), esc(r.current_state), r.source, esc(r.referrer_name), esc(r.notes), r.created_at].join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
  res.send(csv);
});

router.get('/vacancy-report/:id', (req, res) => {
  const v = db.prepare(`SELECT v.*, d.name as department_name, des.title as designation_title
    FROM vacancies v LEFT JOIN departments d ON v.department_id = d.id LEFT JOIN designations des ON v.designation_id = des.id WHERE v.id = ?`).get(req.params.id);
  if (!v) return res.status(404).json({ success: false, error: 'Not found' });

  const apps = db.prepare(`SELECT a.*, c.full_name, c.phone, c.email, c.source FROM applications a
    JOIN candidates c ON a.candidate_id = c.id WHERE a.vacancy_id = ? ORDER BY a.applied_date`).all(req.params.id);

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${v.title} Report</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#333}h1{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
    th{background:#f3f4f6;font-weight:600}.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}.info p{margin:4px 0;font-size:14px}.label{color:#666;font-weight:500}</style></head><body>
    <h1>Vacancy Report: ${v.title}</h1>
    <div class="info">
    <p><span class="label">Department:</span> ${v.department_name || '-'}</p>
    <p><span class="label">Designation:</span> ${v.designation_title || '-'}</p>
    <p><span class="label">Subject:</span> ${v.subject || '-'}</p>
    <p><span class="label">Status:</span> ${v.status}</p>
    <p><span class="label">Positions:</span> ${v.positions_filled || 0}/${v.positions_count} filled</p>
    <p><span class="label">Created:</span> ${v.created_at}</p>
    </div>
    <h2>Applicants (${apps.length})</h2>
    <table><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Stage</th><th>Applied</th></tr>`;
  apps.forEach((a, i) => {
    html += `<tr><td>${i + 1}</td><td>${a.full_name}</td><td>${a.phone || '-'}</td><td>${a.email || '-'}</td><td>${a.source || '-'}</td><td>${a.current_stage}</td><td>${a.applied_date}</td></tr>`;
  });
  html += '</table></body></html>';

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="vacancy-${v.id}-report.html"`);
  res.send(html);
});

router.get('/database-backup', authorize('super_admin'), (req, res) => {
  const dbPath = join(dirname(__dirname), 'db', 'recruitment.db');
  try {
    const data = readFileSync(dbPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="recruitment-backup-${new Date().toISOString().slice(0, 10)}.db"`);
    res.send(data);
  } catch {
    res.status(500).json({ success: false, error: 'Backup failed' });
  }
});

router.get('/template', (req, res) => {
  const csv = 'Full Name,Father/Husband Name,Gender(male/female/other),DOB(YYYY-MM-DD),Phone,WhatsApp,Email,City,State,Source(walk_in/naukri/whatsapp/referral/website/direct_call/other),Referrer Name,Notes\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="candidate-import-template.csv"');
  res.send(csv);
});

router.post('/candidates-import', authorize('super_admin', 'admin', 'hr'), (req, res) => {
  const { rows } = req.body;
  if (!rows?.length) return res.status(400).json({ success: false, error: 'No rows provided' });

  let imported = 0;
  const errors = [];
  rows.forEach((row, i) => {
    if (!row.full_name) { errors.push(`Row ${i + 1}: missing full name`); return; }
    try {
      db.prepare(`INSERT INTO candidates (full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, source, referrer_name, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(row.full_name, row.father_or_husband_name || null, row.gender || null, row.date_of_birth || null, row.phone || null, row.whatsapp_number || null, row.email || null, row.current_city || null, row.current_state || null, row.source || null, row.referrer_name || null, row.notes || null, req.user.id);
      imported++;
    } catch (e) { errors.push(`Row ${i + 1}: ${e.message}`); }
  });
  res.json({ success: true, data: { imported, errors } });
});

function esc(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default router;
