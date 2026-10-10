// storyGate.js -- "is there enough of a story to rank conditions?"
// Aditi (2026-10-10): the AI Objective Assessment showed "Live Match" and percentages after a single tick, with no Chief complaint,
// Onset, Mechanism or Duration -- a percentage built from almost nothing reads like a diagnosis. Her rule: show the ranking only when
//   1. Chief complaint is filled in,
//   2. Onset OR Duration is filled in, and
//   3. at least two ⭐ questions (the ones that change the ranking) are answered.
// Until then the conditions stay listed, unranked and without percentages, and the screen says what is still missing.
// Red-flag warnings are NOT gated: safety messages must never wait for a story.
import { subjectiveFieldsForRegion, isMatchingRelevant } from "./orthoSubjectiveRegionData.js";

export const MIN_STAR_ANSWERS = 2;

const filled = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim().length > 0);

// How many different ⭐ questions have an answer, across the picked regions that belong to this assessment.
export function starAnswerCount(subjective, regions = []) {
  const byRegion = subjective?.regions || {};
  let n = 0;
  for (const r of regions) {
    const answers = byRegion[r.id] || {};
    for (const f of subjectiveFieldsForRegion(r)) {
      if (isMatchingRelevant(r, f.id) && filled(answers[f.id])) n++;
    }
  }
  return n;
}

export function storyGate(subjective, regions = []) {
  const s = subjective || {};
  const hasChief = filled(s.chiefComplaint);
  const hasOnsetOrDuration = filled(s.onset) || filled(s.duration);
  const starAnswers = starAnswerCount(s, regions);
  const missing = [];
  if (!hasChief) missing.push("Chief complaint");
  if (!hasOnsetOrDuration) missing.push("Onset or Duration");
  if (starAnswers < MIN_STAR_ANSWERS) {
    const need = MIN_STAR_ANSWERS - starAnswers;
    missing.push(`${need} more ⭐ answer${need === 1 ? "" : "s"} in the region questions (${starAnswers} of ${MIN_STAR_ANSWERS})`);
  }
  return { ok: missing.length === 0, missing, hasChief, hasOnsetOrDuration, starAnswers };
}
