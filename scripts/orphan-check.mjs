// Counts rows whose parent no longer exists. Run against the local dev DB.
import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';

const SQL = await initSqlJs();
const db = new SQL.Database(readFileSync('../server/db/recruitment.db'));

const checks = [
  ['applications -> candidates', 'SELECT COUNT(*) FROM applications a LEFT JOIN candidates c ON a.candidate_id=c.id WHERE c.id IS NULL'],
  ['applications -> vacancies', 'SELECT COUNT(*) FROM applications a LEFT JOIN vacancies v ON a.vacancy_id=v.id WHERE v.id IS NULL'],
  ['interviews -> applications', 'SELECT COUNT(*) FROM interviews i LEFT JOIN applications a ON i.application_id=a.id WHERE a.id IS NULL'],
  ['interview_panel -> interviews', 'SELECT COUNT(*) FROM interview_panel p LEFT JOIN interviews i ON p.interview_id=i.id WHERE i.id IS NULL'],
  ['evaluations -> interviews', 'SELECT COUNT(*) FROM evaluations e LEFT JOIN interviews i ON e.interview_id=i.id WHERE i.id IS NULL'],
  ['offers -> applications', 'SELECT COUNT(*) FROM offers o LEFT JOIN applications a ON o.application_id=a.id WHERE a.id IS NULL'],
  ['stage_history -> applications', 'SELECT COUNT(*) FROM application_stage_history h LEFT JOIN applications a ON h.application_id=a.id WHERE a.id IS NULL'],
  ['documents -> candidates', 'SELECT COUNT(*) FROM documents d LEFT JOIN candidates c ON d.candidate_id=c.id WHERE c.id IS NULL'],
  ['screening_answers -> applications', 'SELECT COUNT(*) FROM screening_answers s LEFT JOIN applications a ON s.application_id=a.id WHERE a.id IS NULL'],
];

let total = 0;
for (const [label, sql] of checks) {
  const n = db.exec(sql)[0].values[0][0];
  total += n;
  console.log(`${n === 0 ? 'ok  ' : 'ORPH'} ${label}: ${n}`);
}
console.log(total === 0 ? '\nNo orphans.' : `\n${total} orphaned row(s).`);
