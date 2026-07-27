// Only teaching roles are tied to a subject — an "Accountant Computer" or
// "Librarian Science" is meaningless. Everything else (Accountant, Librarian,
// Office Assistant, IT Support, ...) is a plain role with no subject.
//
// Matching is on the leading word so titles like "TGT (Maths)" or "PGT-II"
// still register as teaching.
export const TEACHING_DESIGNATIONS = ['PRT', 'TGT', 'PGT', 'HOD', 'COORDINATOR'];

export function isTeachingDesignation(title) {
  if (!title) return false;
  const t = String(title).trim().toUpperCase();
  // "Head of Department" is the spelled-out form of HOD and is subject-bound.
  if (/\bHEADS?\s+OF\s+DEPARTMENT\b/.test(t)) return true;
  // Whole-word anywhere in the title, so qualified variants like
  // "Academic Coordinator", "Science HOD" or "PGT-II" still register, while
  // "Headmaster", "Sports Coach" and "Counsellor" stay out.
  return TEACHING_DESIGNATIONS.some(k => new RegExp(`\\b${k}\\b`).test(t));
}

// Adds is_teaching to designation rows so clients can decide whether to offer
// a subject picker, without each one hardcoding the list.
export function withTeachingFlag(rows) {
  return rows.map(r => ({ ...r, is_teaching: isTeachingDesignation(r.title) ? 1 : 0 }));
}
