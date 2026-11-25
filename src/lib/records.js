// Converts in-progress UI answers into analysis-ready rows:
// { respondent_id, person_id, knows_person, closeness_rating, submitted_at }
//
// UI status  -> knows_person
//   "yes"    -> true
//   "no"     -> false
//   "skip"   -> null   (explicitly skipped: unknown, NOT "no")
//   (none)   -> null   (never answered: unknown, NOT "no")
// closeness_rating is only kept when knows_person is true; otherwise null.

export function statusToKnows(status) {
  if (status === "yes") return true;
  if (status === "no") return false;
  return null;
}

export function buildRecords(respondentId, personIds, answers, submittedAt) {
  return personIds
    .filter((pid) => pid !== respondentId) // never include self
    .map((pid) => {
      const a = answers[pid] ?? {};
      const knows = statusToKnows(a.status);
      const rating = knows === true && Number.isInteger(a.rating) && a.rating >= 1 && a.rating <= 5 ? a.rating : null;
      return {
        respondent_id: respondentId,
        person_id: pid,
        knows_person: knows,
        closeness_rating: rating,
        submitted_at: submittedAt,
      };
    });
}

export function summarize(personIds, answers) {
  const counts = { yes: 0, no: 0, skip: 0, unanswered: 0 };
  for (const pid of personIds) {
    const s = answers[pid]?.status;
    if (s === "yes" || s === "no" || s === "skip") counts[s] += 1;
    else counts.unanswered += 1;
  }
  return counts;
}
