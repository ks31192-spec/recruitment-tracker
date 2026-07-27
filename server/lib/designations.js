// Only teaching roles are tied to a subject — an "Accountant Computer" or
// "Librarian Science" is meaningless. Everything else (Accountant, Librarian,
// Office Assistant, IT Support, ...) is a plain role with no subject.
//
// Matching is on the leading word so titles like "TGT (Maths)" or "PGT-II"
// still register as teaching.
export const TEACHING_DESIGNATIONS = ['PRT', 'TGT', 'PGT', 'HOD'];

export function isTeachingDesignation(title) {
  if (!title) return false;
  const t = String(title).trim().toUpperCase();
  // "Head of Department" is the spelled-out form of HOD and is subject-bound.
  if (/^HEADS?\s+OF\s+DEPARTMENT/.test(t)) return true;
  const first = t.split(/[^A-Z]+/)[0];
  return TEACHING_DESIGNATIONS.includes(first);
}

// Adds is_teaching to designation rows so clients can decide whether to offer
// a subject picker, without each one hardcoding the list.
export function withTeachingFlag(rows) {
  return rows.map(r => ({ ...r, is_teaching: isTeachingDesignation(r.title) ? 1 : 0 }));
}
