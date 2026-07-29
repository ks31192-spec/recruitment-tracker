// SQLite leaves foreign key enforcement OFF unless `PRAGMA foreign_keys = ON` is
// issued per connection, so every `ON DELETE CASCADE` in the schema is inert.
// Child rows have to be cleared by hand or deleting a parent silently orphans them.
//
// Turning the pragma on instead would make deletes *fail* wherever a child has no
// cascade declared (offers.application_id, for one), so explicit cleanup is the
// safer route on a database that is persisted as a blob.

const placeholders = ids => ids.map(() => '?').join(',');

/**
 * Remove applications and everything hanging off them: stage history, interviews
 * (with their panels and evaluations), offers and screening answers.
 * Communication history is kept — it belongs to the candidate, not the application
 * — but its dangling reference is cleared.
 */
export async function deleteApplicationsCascade(db, applicationIds) {
  const ids = applicationIds.map(Number).filter(Number.isInteger);
  if (!ids.length) return;
  const ph = placeholders(ids);

  const interviews = await db.prepare(`SELECT id FROM interviews WHERE application_id IN (${ph})`).all(...ids);
  const interviewIds = interviews.map(i => i.id);
  if (interviewIds.length) {
    const iph = placeholders(interviewIds);
    await db.prepare(`DELETE FROM evaluations WHERE interview_id IN (${iph})`).run(...interviewIds);
    await db.prepare(`DELETE FROM interview_panel WHERE interview_id IN (${iph})`).run(...interviewIds);
    // Another interview may point here as the one it was rescheduled from.
    await db.prepare(`UPDATE interviews SET rescheduled_from_id = NULL WHERE rescheduled_from_id IN (${iph})`).run(...interviewIds);
    await db.prepare(`DELETE FROM interviews WHERE id IN (${iph})`).run(...interviewIds);
  }

  await db.prepare(`DELETE FROM offers WHERE application_id IN (${ph})`).run(...ids);
  await db.prepare(`DELETE FROM screening_answers WHERE application_id IN (${ph})`).run(...ids);
  await db.prepare(`DELETE FROM application_stage_history WHERE application_id IN (${ph})`).run(...ids);
  await db.prepare(`UPDATE communication_log SET application_id = NULL WHERE application_id IN (${ph})`).run(...ids);
  await db.prepare(`DELETE FROM applications WHERE id IN (${ph})`).run(...ids);
}
