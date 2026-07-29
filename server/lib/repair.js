import db from '../db/connection.js';

// Every NOT NULL child -> parent relationship the app relies on. Mirrors what
// lib/cascade.js cleans up on delete, plus the rest of the schema, so this also
// catches damage left over from before that fix existed (see application_stage_history
// and offers, which the original candidate-delete route never touched).
const CHECKS = [
  { table: 'applications', column: 'candidate_id', parent: 'candidates' },
  { table: 'applications', column: 'vacancy_id', parent: 'vacancies' },
  { table: 'application_stage_history', column: 'application_id', parent: 'applications' },
  { table: 'interviews', column: 'application_id', parent: 'applications' },
  { table: 'interview_panel', column: 'interview_id', parent: 'interviews' },
  { table: 'evaluations', column: 'interview_id', parent: 'interviews' },
  { table: 'offers', column: 'application_id', parent: 'applications' },
  { table: 'communication_log', column: 'candidate_id', parent: 'candidates' },
  { table: 'documents', column: 'candidate_id', parent: 'candidates' },
  { table: 'screening_answers', column: 'application_id', parent: 'applications' },
  { table: 'screening_answers', column: 'question_id', parent: 'screening_questions' },
  { table: 'candidate_tags', column: 'candidate_id', parent: 'candidates' },
  { table: 'blacklist', column: 'candidate_id', parent: 'candidates' },
  { table: 'candidate_qualifications', column: 'candidate_id', parent: 'candidates' },
  { table: 'candidate_experience', column: 'candidate_id', parent: 'candidates' },
  { table: 'candidate_notes', column: 'candidate_id', parent: 'candidates' },
];

/** Report every orphaned row without touching anything. */
export async function findOrphans() {
  const results = [];
  for (const { table, column, parent } of CHECKS) {
    const rows = await db.prepare(
      `SELECT c.* FROM ${table} c LEFT JOIN ${parent} p ON c.${column} = p.id WHERE p.id IS NULL AND c.${column} IS NOT NULL`
    ).all();
    if (rows.length) results.push({ table, column, parent, rows });
  }
  return results;
}

/**
 * Delete every orphaned row found. Removing one level can reveal a new one — e.g.
 * an application orphaned by a deleted vacancy gets removed, which then orphans
 * the interviews that pointed at that application — so this repeats until a pass
 * finds nothing left. Returns each pass's findings, for the audit trail.
 */
export async function repairOrphans() {
  const passes = [];
  for (let i = 0; i < CHECKS.length; i++) { // a hard ceiling: no chain can be longer than the table count
    const orphans = await findOrphans();
    if (!orphans.length) break;
    for (const { table, rows } of orphans) {
      const ids = rows.map(r => r.id);
      const ph = ids.map(() => '?').join(',');
      await db.prepare(`DELETE FROM ${table} WHERE id IN (${ph})`).run(...ids);
    }
    passes.push(...orphans);
  }
  return passes;
}
