// Building blocks for the Learn quizzes.
//
// 2026-09-20, Aditi: "in quiz have more ques to related to reference knowledge
// from itself so that student learn fully". A Quiz tab used to ask ONE question.
// Every ROM movement, MMT muscle, special test and palpation structure now gets
// a short set of questions generated from that item's own reference data (the
// same fields the Learn and Technique tabs show), with the wrong answers taken
// from its neighbours. Nothing is written by hand here: a question only exists
// when the data behind it does, and it is skipped when there are not enough
// clearly-different wrong answers to make it fair.
//
// Everything is deterministic (stable hashes, no Math.random), so an item always
// shows the same questions in the same order.

export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const LETTERS = "ABCDEFG";
// Longer than this and four options are too much to read on a phone.
const MAX_OPTION = 240;

// Tidy a data string for use as an answer option.
export function clean(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
}
const norm = (s) => clean(s).toLowerCase();
const words = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2));

// Some data is written with SHOUTED words ("Percuss POSTERIOR TIBIAL NERVE").
// Soften those for options; short acronyms (ACL, SLR, PA) are left alone.
export function softCaps(text) {
  return String(text ?? "").replace(/\b[A-Z]{5,}\b/g, (w) => w.toLowerCase());
}

// True when two answers are close enough that a student could fairly pick
// either: identical, one inside the other, or mostly the same words.
export function tooSimilar(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  A.forEach((w) => { if (B.has(w)) shared++; });
  return shared / (A.size + B.size - shared) >= 0.6;
}

// Spinal segments in order, so "C5–C7" can be expanded to C5, C6, C7.
const SEGMENTS = [
  ...Array.from({ length: 8 }, (_, i) => `C${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `T${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `L${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `S${i + 1}`),
];
export function rootSet(str) {
  const out = new Set();
  const s = String(str || "").toUpperCase();
  s.replace(/([CTLS])(\d+)\s*[–-]\s*([CTLS])?(\d+)/g, (m, a, n1, b, n2) => {
    const i = SEGMENTS.indexOf(a + n1);
    const j = SEGMENTS.indexOf((b || a) + n2);
    if (i >= 0 && j >= 0) for (let k = Math.min(i, j); k <= Math.max(i, j); k++) out.add(SEGMENTS[k]);
    return m;
  });
  (s.match(/[CTLS]\d+/g) || []).forEach((m) => { if (SEGMENTS.includes(m)) out.add(m); });
  return out;
}
// One root level sitting inside another's range (C5 vs C5–C6) is not a fair wrong answer.
export function rootsNested(a, b) {
  const A = rootSet(a);
  const B = rootSet(b);
  if (!A.size || !B.size) return false;
  const inside = (X, Y) => [...X].every((s) => Y.has(s));
  return inside(A, B) || inside(B, A);
}

// "30–40%" -> 35, "69%" -> 69, "Variable" / "—" -> NaN.
export function midOf(s) {
  const nums = String(s ?? "").match(/\d+(?:\.\d+)?/g);
  if (!nums) return NaN;
  const v = nums.map(Number);
  return v.length > 1 ? (v[0] + v[1]) / 2 : v[0];
}

// ---- How-to text ------------------------------------------------------------

export function sentences(text) {
  return (String(text || "").match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((x) => x.trim()).filter(Boolean);
}

// Splits a how-to paragraph into the position sentences (Patient... / Therapist...)
// and the remaining execution steps.
export function splitHow(how) {
  const all = sentences(how);
  const positions = [];
  const steps = [];
  all.forEach((s) => {
    if (/^\W*(patient|therapist|examiner)\b/i.test(s) && steps.length === 0) positions.push(s);
    else steps.push(s);
  });
  return { positions, steps };
}

// ---- Questions ----------------------------------------------------------------

// A multiple-choice question whose wrong answers are drawn from `tiers` (arrays
// of candidate strings, best source first -- e.g. the same region, then
// everything). Wrong answers are ranked by a stable hash, and any that could
// fairly be argued correct (see tooSimilar / `distinct`) are dropped. Returns
// null when there are not enough left.
export function makeQuestion({ id, topic, question, answer, tiers, explanation, wrong = 3, distinct }) {
  const correct = clean(answer);
  if (!correct || correct.length > MAX_OPTION) return null;
  // Wrong answers about as long as the right one, so length is not a giveaway.
  const gap = (c) => Math.abs(Math.log((c.length + 10) / (correct.length + 10)));
  const picked = [];
  const seen = new Set([norm(correct)]);
  for (const tier of tiers || []) {
    const ranked = [...new Set((tier || []).map(clean).filter(Boolean))]
      .filter((c) => c.length <= MAX_OPTION && !seen.has(norm(c)) && !tooSimilar(c, correct) && (!distinct || distinct(correct, c)))
      .map((v) => ({ v, b: Math.floor(gap(v) / 0.35), k: hash(`${id}:${v}`) }))
      .sort((a, b) => a.b - b.b || a.k - b.k);
    for (const { v } of ranked) {
      if (picked.length >= wrong) break;
      if (seen.has(norm(v))) continue;
      picked.push(v);
      seen.add(norm(v));
    }
    if (picked.length >= wrong) break;
  }
  if (picked.length < wrong) return null;
  const ordered = [...picked, correct]
    .map((v, i) => ({ v, k: hash(`${id}#${v}${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: LETTERS[i], text: o.v }));
  return { id, topic, question, options: ordered, correctOptionId: ordered.find((o) => o.text === correct).id, explanation };
}

// A question whose options are fixed in advance (e.g. what a sensitivity /
// specificity pair means); only the order is shuffled, by hash.
export function makeFixedQuestion({ id, topic, question, options, correct, explanation }) {
  if (!options || !options.includes(correct)) return null;
  const ordered = options
    .map((v, i) => ({ v, k: hash(`${id}#${v}${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: LETTERS[i], text: o.v }));
  return { id, topic, question, options: ordered, correctOptionId: ordered.find((o) => o.text === correct).id, explanation };
}
