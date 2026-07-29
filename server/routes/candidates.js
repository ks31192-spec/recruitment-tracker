import { Router } from 'express';
import { readFileSync } from 'fs';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { deleteFile } from '../lib/filestore.js';
import { deleteApplicationsCascade } from '../lib/cascade.js';
import { logAudit } from './audit.js';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resumeDest = process.env.VERCEL ? '/tmp/uploads/resumes' : join(__dirname, '..', 'uploads', 'resumes');
const resumeUpload = multer({ dest: resumeDest, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

// Insert qualification rows for a candidate. Auto-derives is_bed/is_deled/net flags
// from the degree text so AI ranking + eligibility checks keep working.
async function insertQualifications(candidateId, quals) {
  if (!Array.isArray(quals)) return;
  for (const q of quals) {
    const degree = (q.degree || '').trim();
    if (!degree && !q.university && !q.year_of_passing && !q.percentage_or_cgpa) continue;
    const d = degree.toLowerCase();
    const is_bed = q.is_bed ? 1 : (d.includes('b.ed') || d.includes('bed') ? 1 : 0);
    const is_deled = q.is_deled ? 1 : (d.includes('d.el.ed') || d.includes('deled') ? 1 : 0);
    const net_qualified = q.net_qualified ? 1 : 0;
    await db.prepare(`INSERT INTO candidate_qualifications (candidate_id, degree, specialization, university, year_of_passing, percentage_or_cgpa, is_appearing, is_bed, is_deled, ctet_score, stet_score, net_qualified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(candidateId, degree || null, q.specialization || null, q.university || null, q.year_of_passing || null, q.percentage_or_cgpa || null, q.is_appearing ? 1 : 0, is_bed, is_deled, q.ctet_score || null, q.stet_score || null, net_qualified);
  }
}

async function insertExperience(candidateId, exps) {
  if (!Array.isArray(exps)) return;
  for (const e of exps) {
    if (!e.school_name && !e.designation && !e.subjects_taught) continue;
    await db.prepare(`INSERT INTO candidate_experience (candidate_id, school_name, designation, from_date, to_date, subjects_taught, other_roles, reason_for_leaving, reference_contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(candidateId, e.school_name || null, e.designation || null, e.from_date || null, e.to_date || null, e.subjects_taught || null, e.other_roles || null, e.reason_for_leaving || null, e.reference_contact || null);
  }
}

// Aadhar is stored full but only ever returned masked, except via the audited reveal endpoint.
function maskAadhar(num) {
  if (!num) return null;
  const s = String(num).replace(/\s/g, '');
  if (s.length < 4) return 'XXXX';
  return 'XXXX XXXX ' + s.slice(-4);
}

// Default document-verification checklist seeded on a candidate's first view.
const DEFAULT_VERIFICATION_ITEMS = [
  'Aadhar Card', '10th Certificate', '12th Certificate', 'Graduation Certificate',
  'Post-Graduation Certificate', 'B.Ed / D.El.Ed Certificate', 'Experience / Relieving Letters',
  'Photo ID (PAN / Passport / DL)', 'Address Proof', 'Police Verification',
  'POCSO / Background Check', 'Reference Check',
];

function parseVerifications(raw) {
  if (!raw) return DEFAULT_VERIFICATION_ITEMS.map(item => ({ item, status: 'pending', notes: '', verified_by_name: null, verified_at: null }));
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : DEFAULT_VERIFICATION_ITEMS.map(item => ({ item, status: 'pending', notes: '', verified_by_name: null, verified_at: null }));
  } catch {
    return DEFAULT_VERIFICATION_ITEMS.map(item => ({ item, status: 'pending', notes: '', verified_by_name: null, verified_at: null }));
  }
}

// Validate the mandatory fields shared by school-add and public-apply flows.
function validateMandatory({ expected_salary, aadhar_number, current_salary, is_fresher }) {
  if (expected_salary == null || expected_salary === '') return 'Expected salary is required';
  if (!is_fresher && (current_salary == null || current_salary === '')) return 'Current salary is required (or mark as Fresher)';
  if (!aadhar_number || !/^\d{12}$/.test(String(aadhar_number).replace(/\s/g, ''))) return 'A valid 12-digit Aadhar number is required';
  return null;
}

export { insertQualifications, insertExperience, validateMandatory };

// --- Resume Parser (before /:id routes) ---
// Extracts text from PDF, DOCX, and TXT files, then parses candidate info.
async function extractText(filePath, ext) {
  if (ext === '.txt') {
    return readFileSync(filePath, 'utf-8');
  }
  if (ext === '.pdf') {
    const data = new Uint8Array(readFileSync(filePath));
    const parser = new PDFParse({ data });
    await parser.load();
    const result = await parser.getText();
    return result.text || '';
  }
  if (ext === '.docx' || ext === '.doc') {
    const buf = readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || '';
  }
  return '';
}

function parseResumeText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let name = '';
  const nameLine = lines.find(l => /^name\s*[:\-]/i.test(l));
  if (nameLine) {
    name = nameLine.replace(/^name\s*[:\-]\s*/i, '').trim();
  } else if (lines.length) {
    name = lines[0];
  }

  const phoneMatch = text.match(/(?:\+91[\s-]?|0)?[6-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : '';

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const qualifications = [];
  const keywords = ['B.Ed', 'D.El.Ed', 'CTET', 'NET', 'M.Ed', 'B.A.', 'M.A.', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'Ph.D', 'STET', 'B.Tech', 'M.Tech', 'MBA', 'BCA', 'MCA', 'B.E.', 'M.E.'];
  for (const kw of keywords) {
    if (text.toLowerCase().includes(kw.toLowerCase())) qualifications.push(kw);
  }

  let experience = '';
  const expMatch = text.match(/(\d+)\s*(?:\+\s*)?(?:years?|yrs?)(?:\s*(?:of\s*)?(?:experience|exp))?/i);
  if (expMatch) experience = expMatch[1] + ' years';

  let currentCity = '';
  const cityMatch = text.match(/(?:city|location|address|residing)\s*[:\-]\s*(.+)/i);
  if (cityMatch) currentCity = cityMatch[1].trim().split(/[,\n]/)[0].trim();

  return { name, phone, email, qualifications, experience, current_city: currentCity };
}

router.post('/parse-resume', authorize('super_admin', 'admin', 'hr'), resumeUpload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const ext = extname(req.file.originalname).toLowerCase();
  const supported = ['.txt', '.pdf', '.docx', '.doc'];

  if (!supported.includes(ext)) {
    return res.json({ success: true, data: { name: '', phone: '', email: '', qualifications: [], raw_text: '', message: `Unsupported file type ${ext}. Supported: PDF, DOCX, TXT.` } });
  }

  let text = '';
  let message = '';
  try {
    text = await extractText(req.file.path, ext);
    if (!text.trim()) message = 'File was parsed but no text content could be extracted.';
  } catch (err) {
    message = `Could not parse ${ext} file: ${err.message}`;
  }

  const parsed = text ? parseResumeText(text) : { name: '', phone: '', email: '', qualifications: [], experience: '', current_city: '' };
  res.json({ success: true, data: { ...parsed, raw_text: text, message: message || undefined } });
});

router.get('/', async (req, res) => {
  const { search, source, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  let sql = `SELECT c.*,
    (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = c.id) as application_count,
    (SELECT a2.current_stage FROM applications a2 WHERE a2.candidate_id = c.id ORDER BY a2.created_at DESC LIMIT 1) as latest_stage,
    (SELECT v.title FROM applications a3 JOIN vacancies v ON a3.vacancy_id = v.id WHERE a3.candidate_id = c.id ORDER BY a3.created_at DESC LIMIT 1) as latest_vacancy
    FROM candidates c WHERE 1=1`;
  const params = [];
  if (search) {
    sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (source) { sql += ' AND c.source = ?'; params.push(source); }
  const countSql = sql.replace(/SELECT c\.\*[\s\S]*?FROM candidates c/, 'SELECT COUNT(*) as total FROM candidates c');
  const total = (await db.prepare(countSql).get(...params))?.total || 0;
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const candidates = (await db.prepare(sql).all(...params)).map(c => ({ ...c, aadhar_number: maskAadhar(c.aadhar_number) }));
  res.json({ success: true, data: { candidates, total, page: +page, pages: Math.ceil(total / limit) } });
});

router.get('/duplicates-check', async (req, res) => {
  const { phone, name, father_name } = req.query;
  let dupes = [];
  if (phone) {
    dupes = await db.prepare('SELECT id, full_name, phone, photo_path FROM candidates WHERE phone = ?').all(phone);
  }
  if (!dupes.length && name) {
    const sql = father_name
      ? 'SELECT id, full_name, phone, photo_path FROM candidates WHERE full_name LIKE ? AND father_or_husband_name LIKE ?'
      : 'SELECT id, full_name, phone, photo_path FROM candidates WHERE full_name LIKE ?';
    dupes = father_name ? await db.prepare(sql).all(`%${name}%`, `%${father_name}%`) : await db.prepare(sql).all(`%${name}%`);
  }
  res.json({ success: true, data: dupes });
});

// --- Duplicate Detection ---
router.get('/duplicates', async (_req, res) => {
  // Find groups of potential duplicates
  const groups = [];
  const seen = new Set();

  // 1. Same phone (exact match)
  const phoneGroups = await db.prepare(`
    SELECT phone, GROUP_CONCAT(id) as ids
    FROM candidates WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone HAVING COUNT(*) > 1
  `).all();
  for (const pg of phoneGroups) {
    const ids = pg.ids.split(',').map(Number);
    const candidates = await db.prepare(
      `SELECT id, full_name, father_or_husband_name, phone, email, photo_path, created_at
       FROM candidates WHERE id IN (${ids.map(() => '?').join(',')})`
    ).all(...ids);
    ids.forEach(id => seen.add(id));
    groups.push({ match_type: 'phone', match_value: pg.phone, candidates });
  }

  // 2. Same email (exact match)
  const emailGroups = await db.prepare(`
    SELECT email, GROUP_CONCAT(id) as ids
    FROM candidates WHERE email IS NOT NULL AND email != ''
    GROUP BY LOWER(email) HAVING COUNT(*) > 1
  `).all();
  for (const eg of emailGroups) {
    const ids = eg.ids.split(',').map(Number).filter(id => !seen.has(id));
    if (ids.length < 2) continue;
    const candidates = await db.prepare(
      `SELECT id, full_name, father_or_husband_name, phone, email, photo_path, created_at
       FROM candidates WHERE id IN (${ids.map(() => '?').join(',')})`
    ).all(...ids);
    ids.forEach(id => seen.add(id));
    groups.push({ match_type: 'email', match_value: eg.email, candidates });
  }

  // 3. Same full_name + father_or_husband_name
  const nameGroups = await db.prepare(`
    SELECT full_name, father_or_husband_name, GROUP_CONCAT(id) as ids
    FROM candidates
    WHERE father_or_husband_name IS NOT NULL AND father_or_husband_name != ''
    GROUP BY LOWER(full_name), LOWER(father_or_husband_name) HAVING COUNT(*) > 1
  `).all();
  for (const ng of nameGroups) {
    const ids = ng.ids.split(',').map(Number).filter(id => !seen.has(id));
    if (ids.length < 2) continue;
    const candidates = await db.prepare(
      `SELECT id, full_name, father_or_husband_name, phone, email, photo_path, created_at
       FROM candidates WHERE id IN (${ids.map(() => '?').join(',')})`
    ).all(...ids);
    ids.forEach(id => seen.add(id));
    groups.push({ match_type: 'name', match_value: `${ng.full_name} / ${ng.father_or_husband_name}`, candidates });
  }

  res.json({ success: true, data: groups });
});

// --- Merge Candidates ---
router.post('/merge', authorize('super_admin', 'admin'), async (req, res) => {
  const { keep_id, merge_id } = req.body;
  if (!keep_id || !merge_id) return res.status(400).json({ success: false, error: 'keep_id and merge_id required' });
  if (keep_id === merge_id) return res.status(400).json({ success: false, error: 'Cannot merge a candidate with itself' });

  const keepCandidate = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(keep_id);
  const mergeCandidate = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(merge_id);
  if (!keepCandidate || !mergeCandidate) return res.status(404).json({ success: false, error: 'One or both candidates not found' });

  // Move applications (skip if duplicate vacancy)
  const mergeApps = await db.prepare('SELECT * FROM applications WHERE candidate_id = ?').all(merge_id);
  for (const app of mergeApps) {
    const existing = await db.prepare('SELECT id FROM applications WHERE candidate_id = ? AND vacancy_id = ?').get(keep_id, app.vacancy_id);
    if (!existing) {
      await db.prepare('UPDATE applications SET candidate_id = ? WHERE id = ?').run(keep_id, app.id);
    }
  }

  // Move documents
  await db.prepare('UPDATE documents SET candidate_id = ? WHERE candidate_id = ?').run(keep_id, merge_id);

  // Move communication_log
  await db.prepare('UPDATE communication_log SET candidate_id = ? WHERE candidate_id = ?').run(keep_id, merge_id);

  // Move candidate_notes
  await db.prepare('UPDATE candidate_notes SET candidate_id = ? WHERE candidate_id = ?').run(keep_id, merge_id);

  // Move candidate_tags (ignore duplicates)
  const mergeTags = await db.prepare('SELECT tag_id FROM candidate_tags WHERE candidate_id = ?').all(merge_id);
  for (const t of mergeTags) {
    try {
      await db.prepare('INSERT INTO candidate_tags (candidate_id, tag_id) VALUES (?, ?)').run(keep_id, t.tag_id);
    } catch { /* already tagged */ }
  }
  await db.prepare('DELETE FROM candidate_tags WHERE candidate_id = ?').run(merge_id);

  // Copy qualifications + experience from merge to keep (preserves all columns)
  const mergeQuals = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(merge_id);
  await insertQualifications(keep_id, mergeQuals);
  const mergeExp = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(merge_id);
  await insertExperience(keep_id, mergeExp);

  // Fill null fields on keep from merge
  const fillableFields = ['father_or_husband_name', 'gender', 'date_of_birth', 'phone', 'whatsapp_number', 'email', 'current_city', 'current_state', 'current_salary', 'expected_salary', 'aadhar_number', 'oasis_id', 'photo_path', 'resume_path', 'source', 'referrer_name', 'notes'];
  const updates = [];
  const updateVals = [];
  for (const f of fillableFields) {
    if (!keepCandidate[f] && mergeCandidate[f]) {
      updates.push(`${f} = ?`);
      updateVals.push(mergeCandidate[f]);
    }
  }
  if (updates.length) {
    await db.prepare(`UPDATE candidates SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...updateVals, keep_id);
  }

  // Move blacklist if keep doesn't have one
  const keepBl = await db.prepare('SELECT id FROM blacklist WHERE candidate_id = ?').get(keep_id);
  if (!keepBl) {
    await db.prepare('UPDATE blacklist SET candidate_id = ? WHERE candidate_id = ?').run(keep_id, merge_id);
  } else {
    await db.prepare('DELETE FROM blacklist WHERE candidate_id = ?').run(merge_id);
  }

  // Delete merge candidate (cascades qualifications, experience via ON DELETE CASCADE)
  await db.prepare('DELETE FROM candidates WHERE id = ?').run(merge_id);

  // Return updated keep candidate
  const updated = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(keep_id);
  updated.qualifications = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(keep_id);
  updated.experience = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(keep_id);
  res.json({ success: true, data: updated });
});

// --- AI Candidate Ranking ---
router.get('/ai-rank/:vacancyId', async (req, res) => {
  const vacancy = await db.prepare('SELECT * FROM vacancies WHERE id = ?').get(req.params.vacancyId);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const qualRequired = (vacancy.qualification_required || '').toLowerCase();
  const expMin = vacancy.experience_min || 0;
  const expMax = vacancy.experience_max || 99;

  // Get all applicants for this vacancy
  const applicants = await db.prepare(`
    SELECT a.id as application_id, a.candidate_id, a.current_stage,
      c.full_name, c.phone, c.resume_path
    FROM applications a
    JOIN candidates c ON a.candidate_id = c.id
    WHERE a.vacancy_id = ?
  `).all(req.params.vacancyId);

  const results = [];

  for (const app of applicants) {
    const breakdown = { qualification: 0, experience: 0, resume: 0, blacklist: 0, screening: 0 };
    let maxPossible = 100; // 25 qual + 30 exp + 10 resume + 10 blacklist + 10 screening + 15 extra qualifications

    // Qualification match (up to 25 pts)
    const quals = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(app.candidate_id);
    if (quals.length) {
      let qualScore = 0;
      const hasBed = quals.some(q => q.is_bed);
      const hasDeled = quals.some(q => q.is_deled);
      const hasCtet = quals.some(q => q.ctet_score && q.ctet_score > 0);
      const hasNet = quals.some(q => q.net_qualified);

      if (qualRequired.includes('b.ed') && hasBed) qualScore += 7;
      else if (hasBed) qualScore += 4;

      if (qualRequired.includes('d.el.ed') && hasDeled) qualScore += 6;
      else if (hasDeled) qualScore += 3;

      if (qualRequired.includes('ctet') && hasCtet) qualScore += 6;
      else if (hasCtet) qualScore += 3;

      if (qualRequired.includes('net') && hasNet) qualScore += 6;
      else if (hasNet) qualScore += 3;

      // General degree match
      if (quals.some(q => q.degree && qualRequired.includes(q.degree.toLowerCase()))) qualScore += 5;

      breakdown.qualification = Math.min(qualScore, 25);
    }

    // Experience match (up to 30 pts)
    const exps = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(app.candidate_id);
    if (exps.length) {
      let totalYears = 0;
      for (const e of exps) {
        if (e.from_date && e.to_date) {
          totalYears += (new Date(e.to_date) - new Date(e.from_date)) / (365.25 * 24 * 60 * 60 * 1000);
        } else if (e.from_date) {
          totalYears += (Date.now() - new Date(e.from_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        }
      }
      totalYears = Math.round(totalYears * 10) / 10;

      if (totalYears >= expMin && totalYears <= expMax) breakdown.experience = 30;
      else if (totalYears > expMax) breakdown.experience = 20;
      else if (totalYears > 0) breakdown.experience = 10;
    }

    // Resume (10 pts)
    if (app.resume_path) breakdown.resume = 10;

    // Blacklist check (10 pts or -50 pts)
    const bl = await db.prepare('SELECT id FROM blacklist WHERE candidate_id = ?').get(app.candidate_id);
    if (bl) {
      breakdown.blacklist = -50;
    } else {
      breakdown.blacklist = 10;
    }

    // Screening answers completeness (up to 10 pts)
    const totalQuestions = await db.prepare(
      'SELECT COUNT(*) as cnt FROM screening_questions WHERE vacancy_id = ?'
    ).get(req.params.vacancyId);
    if (totalQuestions.cnt > 0) {
      const answered = await db.prepare(
        `SELECT COUNT(*) as cnt FROM screening_answers sa
         JOIN screening_questions sq ON sa.question_id = sq.id
         WHERE sa.application_id = ? AND sq.vacancy_id = ? AND sa.answer IS NOT NULL AND sa.answer != ''`
      ).get(app.application_id, req.params.vacancyId);
      breakdown.screening = Math.round((answered.cnt / totalQuestions.cnt) * 10);
    }

    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
    results.push({
      candidate_id: app.candidate_id,
      full_name: app.full_name,
      phone: app.phone,
      current_stage: app.current_stage,
      score: Math.max(score, 0),
      max_possible: maxPossible,
      breakdown
    });
  }

  results.sort((a, b) => b.score - a.score);
  res.json({ success: true, data: results });
});

router.get('/:id', async (req, res) => {
  const c = await db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });
  c.verification_items = parseVerifications(c.verifications);
  delete c.verifications;
  c.aadhar_number = maskAadhar(c.aadhar_number);
  c.can_reveal_aadhar = ['super_admin', 'admin'].includes(req.user.role);
  c.qualifications = await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(c.id);
  c.experience = await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(c.id);
  c.applications = await db.prepare(`SELECT a.*, v.title as vacancy_title, v.subject, d.name as department_name,
    o.id as offer_id, o.response as offer_response, o.salary_offered, o.designation_offered
    FROM applications a JOIN vacancies v ON a.vacancy_id = v.id LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN offers o ON o.application_id = a.id
    WHERE a.candidate_id = ? ORDER BY a.applied_date DESC`).all(c.id);
  c.documents = await db.prepare('SELECT * FROM documents WHERE candidate_id = ?').all(c.id);
  res.json({ success: true, data: c });
});

// Reveal the full Aadhar number — restricted + audit-logged.
router.get('/:id/aadhar', authorize('super_admin', 'admin'), async (req, res) => {
  const c = await db.prepare('SELECT full_name, aadhar_number FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });
  await db.prepare('INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, req.user.name, 'view_aadhar', 'candidate', +req.params.id, `Viewed Aadhar of ${c.full_name}`);
  res.json({ success: true, data: { aadhar_number: c.aadhar_number || null } });
});

// Document-verification checklist
router.get('/:id/verifications', async (req, res) => {
  const c = await db.prepare('SELECT verifications FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: parseVerifications(c.verifications) });
});

router.put('/:id/verifications', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { verifications } = req.body;
  if (!Array.isArray(verifications)) return res.status(400).json({ success: false, error: 'verifications array required' });
  const now = new Date().toISOString();
  // Stamp who/when for items that have a decided status.
  const stamped = verifications.map(v => {
    const decided = v.status === 'verified' || v.status === 'flagged';
    return {
      item: v.item,
      status: v.status || 'pending',
      notes: v.notes || '',
      verified_by_name: decided ? (v.verified_by_name || req.user.name) : null,
      verified_at: decided ? (v.verified_at || now) : null,
    };
  });
  await db.prepare(`UPDATE candidates SET verifications = ?, updated_at = datetime('now') WHERE id = ?`).run(JSON.stringify(stamped), req.params.id);
  res.json({ success: true, data: stamped });
});

router.post('/', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state,
    current_salary, expected_salary, aadhar_number, oasis_id, is_fresher, source, referrer_name, notes, qualifications, experience, force } = req.body;
  if (!full_name) return res.status(400).json({ success: false, error: 'Full name required' });

  const validationError = validateMandatory({ expected_salary, aadhar_number, current_salary, is_fresher });
  if (validationError) return res.status(400).json({ success: false, error: validationError });

  if (!force && phone) {
    const dupes = await db.prepare('SELECT id, full_name, phone FROM candidates WHERE phone = ?').all(phone);
    if (dupes.length) return res.json({ success: true, data: { duplicates: dupes } });
  }

  const aadhar = aadhar_number ? String(aadhar_number).replace(/\s/g, '') : null;
  const r = await db.prepare(`INSERT INTO candidates (full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, current_salary, expected_salary, aadhar_number, oasis_id, is_fresher, source, referrer_name, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, phone || null, whatsapp_number || null, email || null, current_city || null, current_state || null, is_fresher ? null : (current_salary || null), expected_salary || null, aadhar, oasis_id || null, is_fresher ? 1 : 0, source || null, referrer_name || null, notes || null, req.user.id);
  const candidateId = r.lastInsertRowid;

  await insertQualifications(candidateId, qualifications);
  if (!is_fresher) await insertExperience(candidateId, experience);

  res.json({ success: true, data: { id: candidateId } });
});

router.put('/:id', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state,
    current_salary, expected_salary, aadhar_number, oasis_id, is_fresher, source, referrer_name, notes, qualifications, experience } = req.body;

  // Blank aadhar on edit means "keep existing" (the form only ever shows a masked value).
  let aadhar = aadhar_number ? String(aadhar_number).replace(/\s/g, '') : null;
  if (!aadhar) {
    const existing = await db.prepare('SELECT aadhar_number FROM candidates WHERE id = ?').get(req.params.id);
    aadhar = existing?.aadhar_number || null;
  }

  const validationError = validateMandatory({ expected_salary, aadhar_number: aadhar, current_salary, is_fresher });
  if (validationError) return res.status(400).json({ success: false, error: validationError });

  await db.prepare(`UPDATE candidates SET full_name=?, father_or_husband_name=?, gender=?, date_of_birth=?, phone=?, whatsapp_number=?, email=?, current_city=?, current_state=?, current_salary=?, expected_salary=?, aadhar_number=?, oasis_id=?, is_fresher=?, source=?, referrer_name=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, phone || null, whatsapp_number || null, email || null, current_city || null, current_state || null, is_fresher ? null : (current_salary || null), expected_salary || null, aadhar, oasis_id || null, is_fresher ? 1 : 0, source || null, referrer_name || null, notes || null, req.params.id);

  // Replace qualifications / experience when the arrays are provided by the form.
  if (Array.isArray(qualifications)) {
    await db.prepare('DELETE FROM candidate_qualifications WHERE candidate_id = ?').run(req.params.id);
    await insertQualifications(+req.params.id, qualifications);
  }
  if (Array.isArray(experience)) {
    await db.prepare('DELETE FROM candidate_experience WHERE candidate_id = ?').run(req.params.id);
    if (!is_fresher) await insertExperience(+req.params.id, experience);
  }

  res.json({ success: true, data: { id: +req.params.id } });
});

router.get('/:id/timeline', async (req, res) => {
  const events = [];
  const stages = await db.prepare(`SELECT ash.*, a.vacancy_id, v.title as vacancy_title, u.name as changed_by_name
    FROM application_stage_history ash
    JOIN applications a ON ash.application_id = a.id
    JOIN vacancies v ON a.vacancy_id = v.id
    LEFT JOIN users u ON ash.changed_by = u.id
    WHERE a.candidate_id = ? ORDER BY ash.changed_at DESC`).all(req.params.id);
  stages.forEach(s => events.push({ type: 'stage_change', date: s.changed_at, ...s }));

  const interviews = await db.prepare(`SELECT i.*, v.title as vacancy_title
    FROM interviews i JOIN applications a ON i.application_id = a.id
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.candidate_id = ? ORDER BY i.scheduled_date DESC`).all(req.params.id);
  interviews.forEach(i => events.push({ type: 'interview', date: i.scheduled_date, ...i }));

  const comms = await db.prepare(`SELECT cl.*, u.name as logged_by_name FROM communication_log cl
    LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.candidate_id = ? ORDER BY cl.logged_at DESC`).all(req.params.id);
  comms.forEach(c => events.push({ type: 'communication', date: c.logged_at, ...c }));

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, data: events });
});

router.post('/:id/qualifications', authenticate, authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await insertQualifications(+req.params.id, [req.body]);
  res.json({ success: true, data: { message: 'Added' } });
});

router.post('/:id/experience', authenticate, authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await insertExperience(+req.params.id, [req.body]);
  res.json({ success: true, data: { message: 'Added' } });
});

// --- Notes ---
router.get('/:id/notes', async (req, res) => {
  const notes = await db.prepare('SELECT * FROM candidate_notes WHERE candidate_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ success: true, data: notes });
});

router.post('/:id/notes', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ success: false, error: 'Note required' });
  const r = await db.prepare('INSERT INTO candidate_notes (candidate_id, user_id, user_name, note) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, req.user.name, note.trim());
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.delete('/:id/notes/:noteId', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM candidate_notes WHERE id = ? AND candidate_id = ?').run(req.params.noteId, req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});

// --- Tags ---
router.get('/meta/tags', async (_req, res) => {
  const tags = await db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json({ success: true, data: tags });
});

router.post('/meta/tags', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  try {
    const r = await db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#3b82f6');
    res.json({ success: true, data: { id: r.lastInsertRowid, name, color: color || '#3b82f6' } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ success: false, error: 'Tag already exists' });
    throw e;
  }
});

router.delete('/meta/tags/:tagId', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.tagId);
  res.json({ success: true, data: { message: 'Deleted' } });
});

router.get('/:id/tags', async (req, res) => {
  const tags = await db.prepare('SELECT t.* FROM tags t JOIN candidate_tags ct ON t.id = ct.tag_id WHERE ct.candidate_id = ?').all(req.params.id);
  res.json({ success: true, data: tags });
});

router.post('/:id/tags', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { tag_id } = req.body;
  if (!tag_id) return res.status(400).json({ success: false, error: 'tag_id required' });
  try {
    await db.prepare('INSERT INTO candidate_tags (candidate_id, tag_id) VALUES (?, ?)').run(req.params.id, tag_id);
  } catch { /* already tagged */ }
  res.json({ success: true, data: { message: 'Tagged' } });
});

router.delete('/:id/tags/:tagId', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  await db.prepare('DELETE FROM candidate_tags WHERE candidate_id = ? AND tag_id = ?').run(req.params.id, req.params.tagId);
  res.json({ success: true, data: { message: 'Untagged' } });
});

// --- Blacklist ---
router.get('/:id/blacklist', async (req, res) => {
  const bl = await db.prepare('SELECT * FROM blacklist WHERE candidate_id = ?').get(req.params.id);
  res.json({ success: true, data: bl || null });
});

router.post('/:id/blacklist', authorize('super_admin', 'admin', 'hr'), async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'Reason required' });
  try {
    await db.prepare('INSERT INTO blacklist (candidate_id, reason, blacklisted_by) VALUES (?, ?, ?)').run(req.params.id, reason, req.user.id);
  } catch {
    await db.prepare('UPDATE blacklist SET reason = ?, blacklisted_by = ?, created_at = datetime("now") WHERE candidate_id = ?').run(reason, req.user.id, req.params.id);
  }
  res.json({ success: true, data: { message: 'Blacklisted' } });
});

router.delete('/:id/blacklist', authorize('super_admin', 'admin'), async (req, res) => {
  await db.prepare('DELETE FROM blacklist WHERE candidate_id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Removed from blacklist' } });
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  const c = await db.prepare('SELECT id, photo_path, resume_path FROM candidates WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });

  // Stored files outlive the row now, so clear them out too.
  const docs = await db.prepare('SELECT * FROM documents WHERE candidate_id = ?').all(req.params.id);
  const stored = [...docs.map(d => d.file_path), c.photo_path, c.resume_path];
  for (const p of stored) {
    if (!p) continue;
    const key = String(p).replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    try { await deleteFile(key); } catch (e) { console.error('Failed to remove file', key, e.message); }
  }

  // Snapshot everything first so the audit entry can be used to rebuild the record.
  const snapshot = {
    candidate: await db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id),
    qualifications: await db.prepare('SELECT * FROM candidate_qualifications WHERE candidate_id = ?').all(req.params.id),
    experience: await db.prepare('SELECT * FROM candidate_experience WHERE candidate_id = ?').all(req.params.id),
    notes: await db.prepare('SELECT * FROM candidate_notes WHERE candidate_id = ?').all(req.params.id),
    documents: docs,
    applications: await db.prepare('SELECT * FROM applications WHERE candidate_id = ?').all(req.params.id),
  };

  await db.prepare('DELETE FROM candidate_notes WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM candidate_tags WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM candidate_qualifications WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM candidate_experience WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM documents WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM blacklist WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM communication_log WHERE candidate_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM candidate_portal_tokens WHERE candidate_id = ?').run(req.params.id);
  // Interviews, panels, evaluations and offers hang off the applications and would
  // otherwise be left behind pointing at rows that no longer exist.
  const apps = await db.prepare('SELECT id FROM applications WHERE candidate_id = ?').all(req.params.id);
  await deleteApplicationsCascade(db, apps.map(a => a.id));
  await db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);

  await logAudit(req.user.id, req.user.name, 'delete_candidate', 'candidate', +req.params.id,
    JSON.stringify(snapshot), req.ip);

  res.json({ success: true, data: { message: 'Candidate deleted' } });
});

export default router;
