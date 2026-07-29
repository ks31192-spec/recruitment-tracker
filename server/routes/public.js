import { Router } from 'express';
import db from '../db/connection.js';
import { insertQualifications, insertExperience } from './candidates.js';
import multer from 'multer';
import { saveFile, uniqueName } from '../lib/filestore.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/careers', async (_req, res) => {
  const vacancies = await db.prepare(`SELECT v.id, v.title, v.subject, v.qualification_required, v.experience_min, v.experience_max,
    v.salary_range_min, v.salary_range_max, v.positions_count, v.positions_filled, v.description, v.created_at,
    d.name as department_name, des.title as designation_title
    FROM vacancies v
    LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN designations des ON v.designation_id = des.id
    WHERE v.status IN ('open','interviewing','reopened')
    ORDER BY v.created_at DESC`).all();
  res.json({ success: true, data: vacancies });
});

router.get('/careers/:id', async (req, res) => {
  const v = await db.prepare(`SELECT v.id, v.title, v.subject, v.qualification_required, v.experience_min, v.experience_max,
    v.salary_range_min, v.salary_range_max, v.positions_count, v.positions_filled, v.description, v.created_at,
    d.name as department_name, des.title as designation_title
    FROM vacancies v
    LEFT JOIN departments d ON v.department_id = d.id
    LEFT JOIN designations des ON v.designation_id = des.id
    WHERE v.id = ? AND v.status IN ('open','interviewing','reopened')`).get(req.params.id);
  if (!v) return res.status(404).json({ success: false, error: 'Vacancy not found or closed' });

  const questions = await db.prepare('SELECT id, question, is_knockout, sort_order FROM screening_questions WHERE vacancy_id = ? ORDER BY sort_order').all(req.params.id);
  res.json({ success: true, data: { ...v, screening_questions: questions } });
});

router.post('/apply/:vacancyId', upload.single('resume'), async (req, res) => {
  const { vacancyId } = req.params;
  const { full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state,
    current_salary, expected_salary, aadhar_number, oasis_id, is_fresher, salary_expected, earliest_join_date, screening_answers } = req.body;

  if (!full_name) return res.status(400).json({ success: false, error: 'Full name is required' });

  // Mandatory fields
  const fresher = is_fresher === 'true' || is_fresher === true || is_fresher === '1';
  const expected = expected_salary || salary_expected;
  if (expected == null || expected === '') return res.status(400).json({ success: false, error: 'Expected salary is required' });
  if (!fresher && (current_salary == null || current_salary === '')) return res.status(400).json({ success: false, error: 'Current salary is required (or mark as Fresher)' });
  if (!aadhar_number || !/^\d{12}$/.test(String(aadhar_number).replace(/\s/g, ''))) return res.status(400).json({ success: false, error: 'A valid 12-digit Aadhar number is required' });
  const aadhar = String(aadhar_number).replace(/\s/g, '');

  const vacancy = await db.prepare(`SELECT id FROM vacancies WHERE id = ? AND status IN ('open','interviewing','reopened')`).get(vacancyId);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found or closed' });

  // Parse qualification/experience JSON payloads (sent as strings in multipart form)
  let quals = [], exps = [];
  try { quals = req.body.qualifications ? JSON.parse(req.body.qualifications) : []; } catch { quals = []; }
  try { exps = req.body.experience ? JSON.parse(req.body.experience) : []; } catch { exps = []; }

  let candidateId;
  if (phone) {
    const existing = await db.prepare('SELECT id FROM candidates WHERE phone = ?').get(phone);
    if (existing) {
      candidateId = existing.id;
      await db.prepare(`UPDATE candidates SET full_name=?, father_or_husband_name=?, gender=?, date_of_birth=?, whatsapp_number=?, email=?, current_city=?, current_state=?, current_salary=?, expected_salary=?, aadhar_number=?, oasis_id=?, is_fresher=?, source='website', updated_at=datetime('now') WHERE id=?`)
        .run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, whatsapp_number || null, email || null, current_city || null, current_state || null, fresher ? null : (current_salary || null), expected || null, aadhar, oasis_id || null, fresher ? 1 : 0, candidateId);
    }
  }

  let resume_path = null;
  if (req.file) {
    const key = `applications/${uniqueName(req.file.originalname)}`;
    await saveFile(key, req.file.buffer, { name: req.file.originalname, mime: req.file.mimetype });
    resume_path = `uploads/${key}`;
  }

  if (candidateId && resume_path) {
    // Re-applying with a fresh CV: keep the newest one on the record.
    await db.prepare(`UPDATE candidates SET resume_path = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(resume_path, candidateId);
    await db.prepare('INSERT INTO documents (candidate_id, doc_type, file_name, file_path) VALUES (?, ?, ?, ?)')
      .run(candidateId, 'resume', req.file.originalname, resume_path);
  }

  if (!candidateId) {
    const r = await db.prepare(`INSERT INTO candidates (full_name, father_or_husband_name, gender, date_of_birth, phone, whatsapp_number, email, current_city, current_state, current_salary, expected_salary, aadhar_number, oasis_id, is_fresher, source, resume_path, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'website', ?, ?)`)
      .run(full_name, father_or_husband_name || null, gender || null, date_of_birth || null, phone || null, whatsapp_number || null, email || null, current_city || null, current_state || null, fresher ? null : (current_salary || null), expected || null, aadhar, oasis_id || null, fresher ? 1 : 0, resume_path, 'Applied via careers page');
    candidateId = r.lastInsertRowid;

    await insertQualifications(candidateId, quals);
    if (!fresher) await insertExperience(candidateId, exps);

    if (req.file) {
      await db.prepare('INSERT INTO documents (candidate_id, doc_type, file_name, file_path) VALUES (?, ?, ?, ?)')
        .run(candidateId, 'resume', req.file.originalname, resume_path);
    }
  }

  const existingApp = await db.prepare('SELECT id FROM applications WHERE candidate_id = ? AND vacancy_id = ?').get(candidateId, vacancyId);
  if (existingApp) {
    return res.status(409).json({ success: false, error: 'You have already applied for this position' });
  }

  const app = await db.prepare('INSERT INTO applications (candidate_id, vacancy_id, salary_expected, earliest_join_date) VALUES (?, ?, ?, ?)')
    .run(candidateId, vacancyId, expected || null, earliest_join_date || null);
  await db.prepare(`INSERT INTO application_stage_history (application_id, from_stage, to_stage) VALUES (?, NULL, 'applied')`)
    .run(app.lastInsertRowid);

  if (screening_answers) {
    let answers;
    try { answers = typeof screening_answers === 'string' ? JSON.parse(screening_answers) : screening_answers; } catch { answers = []; }
    for (const a of answers) {
      if (a.question_id && a.answer !== undefined) {
        await db.prepare('INSERT OR REPLACE INTO screening_answers (application_id, question_id, answer) VALUES (?, ?, ?)').run(app.lastInsertRowid, a.question_id, a.answer);
      }
    }
  }

  res.json({ success: true, data: { message: 'Application submitted successfully', application_id: app.lastInsertRowid } });
});

export default router;
