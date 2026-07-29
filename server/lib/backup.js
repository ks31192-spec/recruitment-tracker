import db from '../db/connection.js';
import { saveFile, readFile, deleteFile, listFiles } from './filestore.js';

// Snapshots live in the same chunked store as uploads, so they persist across
// Vercel cold starts rather than sitting in /tmp.
const PREFIX = 'backups';
const KEEP = Math.max(1, Number(process.env.BACKUP_RETENTION) || 30);

// Every table worth restoring. Ordered parent-first so a manual restore can be
// replayed straight down the list without tripping over missing references.
export const BACKUP_TABLES = [
  'users', 'academic_years', 'departments', 'designations', 'site_settings',
  'email_templates', 'sla_config', 'tags',
  'vacancies', 'screening_questions', 'document_checklist', 'recruitment_costs',
  'candidates', 'candidate_qualifications', 'candidate_experience', 'candidate_notes',
  'candidate_tags', 'blacklist', 'documents',
  'applications', 'application_stage_history', 'screening_answers',
  'interviews', 'interview_panel', 'evaluations',
  'offers', 'communication_log', 'referrals', 'notifications', 'audit_log',
];

/**
 * Write a full JSON snapshot of the database and prune old ones.
 * Returns the stored key plus per-table row counts.
 */
export async function createBackup(trigger = 'manual') {
  const tables = {};
  const counts = {};
  for (const t of BACKUP_TABLES) {
    try {
      const rows = await db.prepare(`SELECT * FROM ${t}`).all();
      tables[t] = rows;
      counts[t] = rows.length;
    } catch (e) {
      // A table added later may not exist in an older loaded blob; skip it
      // rather than losing the whole backup.
      counts[t] = `skipped: ${e.message}`;
    }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    trigger,
    schema_tables: BACKUP_TABLES,
    tables,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  // ':' is legal in a Firestore id but awkward in a filename.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${PREFIX}/backup-${stamp}.json`;

  await saveFile(key, body, { name: `backup-${stamp}.json`, mime: 'application/json' });

  const pruned = await pruneOldBackups();
  return { key, size: body.length, counts, pruned };
}

/** Drop everything past the retention window, oldest first. */
async function pruneOldBackups() {
  const all = await listBackups();
  const stale = all.slice(KEEP);
  for (const b of stale) {
    try { await deleteFile(b.key); } catch (e) { console.error('[backup] prune failed', b.key, e.message); }
  }
  return stale.map(b => b.key);
}

export async function listBackups() {
  return listFiles(PREFIX);
}

export async function readBackup(key) {
  if (!key.startsWith(`${PREFIX}/`)) return null;
  return readFile(key);
}
