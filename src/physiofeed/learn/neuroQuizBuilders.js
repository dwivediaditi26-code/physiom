import { clean, makeQuestion, readable, rootSet, rootsNested } from "./quizKit.js";

// Quizzes for the Neuro study screen's four reference lists -- reflexes,
// dermatomes, myotomes and cranial nerves (sharedClinicalData.js) -- built from
// each entry's own fields, the way quizBuilders.js does for ROM / MMT / special
// tests / palpation. (The Neuro *conditions* are assessment cards and use
// assessmentQuiz.js.) 2026-09-20, Aditi: "now do same for neuro and cardio" --
// each of these used to ask one question.
//
// Each question is a fact the Learn or Technique tab shows, in both directions
// where it makes sense (root level -> reflex and reflex -> root level). Wrong
// answers come from the other entries in the same list. Everything is
// deterministic, so an entry always shows the same questions in the same order.

const BUDGET = 200;
const others = (all, item, key) => (all || []).filter((x) => x[key] !== item[key]);

// ---- Reflexes -----------------------------------------------------------------

// "Patella (Quadriceps)" -> "Patella"; "Plantar Reflex (Normal)" -> "Plantar Reflex".
const stem = (label) => String(label || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
// "Biceps" -> "the Biceps reflex", "Babinski Sign" -> "the Babinski Sign"; a plural or
// a finding ("Ankle Clonus", "Fasciculations") takes no article.
const named = (label) => {
  const s = stem(label);
  if (/reflex|jerk|sign$/i.test(s)) return `the ${s}`;
  return /clonus|drift|fasciculations|wasting|tone/i.test(s) ? s : `the ${s} reflex`;
};
// Most reflexes list the root level or nerve they test ("C5–C6", "S1", "V (trigeminal)");
// the UMN / LMN signs list a lesion site ("UMN — Cervical Cord"), which is not a root level.
const isRootLevel = (level) => /^(?:[CTLS]\d|[IVX]+ \()/.test(clean(level));
const shareRoot = (a, b) => {
  const A = rootSet(a);
  const B = rootSet(b);
  return A.size > 0 && B.size > 0 && [...A].some((s) => B.has(s));
};

// Words that name the reflex itself ("babinski", "hoffmann", "biceps"). A wrong answer that
// mentions them ("Equivalent significance to Hoffmann's", "reverse of Hoffmann's") is about
// this reflex, so it is not a fair wrong answer for it.
const GENERIC_NAME_WORDS = new Set(["reflex", "muscle", "assessment", "normal"]);
const nameWords = (label) => stem(label).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 5 && !GENERIC_NAME_WORDS.has(w));

export function reflexQuestions(r, all) {
  if (!r) return [];
  const rest = others(all, r, "id");
  const name = named(r.label);
  const rootOnes = rest.filter((x) => isRootLevel(x.level));
  const out = [];
  // The signs come in look-alike families (Babinski / Chaddock / Oppenheim, Hoffmann /
  // Trömner, the three clonus tests) that share a group, so a sign's wrong answers come from
  // the other groups. Deep tendon reflexes differ by site and can be compared with each other.
  const apart = rest.filter((x) => r.group === "DTR" || x.group !== r.group);
  const words = nameWords(r.label);
  const notAboutMe = (_, c) => !words.some((w) => c.toLowerCase().includes(w));

  if (isRootLevel(r.level)) {
    out.push(makeQuestion({
      id: `${r.id}:level`,
      topic: "Root level",
      question: `Which root level or nerve is tested by ${name}?`,
      answer: r.level,
      tiers: [rootOnes.map((x) => x.level)],
      explanation: `${stem(r.label)}: ${clean(r.level)}.`,
      closed: true,
      distinct: (a, c) => !rootsNested(a, c),
    }));
    // The other direction. Skipped when another reflex shares this exact level (Biceps and
    // Brachioradialis are both C5–C6); reflexes on an overlapping level are not offered.
    if (!rest.some((x) => clean(x.level).toLowerCase() === clean(r.level).toLowerCase())) {
      out.push(makeQuestion({
        id: `${r.id}:reverse`,
        topic: "Which reflex",
        question: `Which reflex is tested at ${clean(r.level)}?`,
        answer: stem(r.label),
        tiers: [rootOnes.filter((x) => !shareRoot(x.level, r.level)).map((x) => stem(x.label))],
        explanation: `${stem(r.label)}: ${clean(r.level)}.`,
        closed: true,
      }));
    }
  }

  // Similar-looking techniques (Babinski's and the normal plantar reflex both stroke the sole)
  // could each be argued right, so those wrong answers are held to a stricter limit.
  const technique = readable(r.technique, BUDGET);
  out.push(technique && makeQuestion({
    id: `${r.id}:technique`,
    topic: "How to test",
    question: `Which describes how to test ${name}?`,
    answer: technique,
    tiers: [apart.map((x) => readable(x.technique, BUDGET))],
    explanation: `${stem(r.label)}: ${technique}.`,
    overlap: 0.35,
    distinct: notAboutMe,
  }));
  const finding = readable(r.finding, BUDGET);
  out.push(finding && makeQuestion({
    id: `${r.id}:finding`,
    topic: "Clinical finding",
    question: `Which clinical finding goes with ${name}?`,
    answer: finding,
    tiers: [apart.map((x) => readable(x.finding, BUDGET))],
    explanation: `${stem(r.label)}: ${finding}.`,
    overlap: 0.35,
    distinct: notAboutMe,
  }));
  return out.filter(Boolean);
}

// ---- Dermatomes ---------------------------------------------------------------

const isDisc = (s) => /^[CTLS]\d/.test(clean(s));
// "L4/5" -> {L4, L5}, "C7/T1" -> {C7, T1}: the vertebral levels a disc name touches.
const discLevels = (s) => {
  const m = clean(s).toUpperCase().match(/^([CTLS])(\d+)\/([CTLS])?(\d+)$/);
  return m ? new Set([`${m[1]}${m[2]}`, `${m[3] || m[1]}${m[4]}`]) : new Set();
};
// The same spinal region (C, T, L, S) first, so a lumbar question is answered from lumbar levels.
const sameRegion = (rest, item) => rest.filter((x) => String(x.level)[0] === String(item.level)[0]);

export function dermatomeQuestions(dm, all) {
  if (!dm) return [];
  const rest = others(all, dm, "id");
  const near = sameRegion(rest, dm);
  const ask = (key, topic, question, answer, get, explanation, extra) =>
    makeQuestion({ id: `${dm.id}:${key}`, topic, question, answer, tiers: [near.map(get), rest.map(get)], explanation, ...extra });
  return [
    dm.region && ask("region", "Area supplied", `Which area does the ${dm.level} dermatome supply?`, dm.region, (x) => x.region, `${dm.level}: ${clean(dm.region)}.`, { overlap: 0.5 }),
    dm.region && ask("reverse", "Which dermatome", `Which dermatome supplies “${clean(dm.region)}”?`, dm.level, (x) => x.level, `${clean(dm.region)}: ${dm.level}.`, { closed: true }),
    dm.myotome && ask("myotome", "Myotome", `Which myotome shares the ${dm.level} root level?`, dm.myotome, (x) => x.myotome, `${dm.level}: myotome — ${clean(dm.myotome)}.`),
    // Books disagree on which root a lumbar disc affects (exiting vs traversing), so the wrong
    // discs here share no vertebral level with the right one -- nothing near it can be argued.
    isDisc(dm.disc) && makeQuestion({
      id: `${dm.id}:disc`,
      topic: "Disc level",
      question: `Which disc level is linked to the ${dm.level} root?`,
      answer: dm.disc,
      tiers: [rest.filter((x) => isDisc(x.disc)).map((x) => x.disc)],
      explanation: `${dm.level}: disc level ${clean(dm.disc)}.`,
      closed: true,
      distinct: (a, c) => ![...discLevels(c)].some((v) => discLevels(a).has(v)),
    }),
  ].filter(Boolean);
}

// ---- Myotomes -----------------------------------------------------------------

export function myotomeQuestions(m, all) {
  if (!m) return [];
  const rest = others(all, m, "level");
  const near = sameRegion(rest, m);
  const id = `myo:${m.level}`;
  const ask = (key, topic, question, answer, get, explanation, extra) =>
    makeQuestion({ id: `${id}:${key}`, topic, question, answer, tiers: [near.map(get), rest.map(get)], explanation, ...extra });
  return [
    m.action && ask("action", "Movement tested", `Which movement tests the ${m.level} myotome?`, m.action, (x) => x.action, `${m.level}: ${clean(m.action)}.`, { overlap: 0.5 }),
    m.action && ask("level", "Root level", `Which root level tests ${clean(m.action)}?`, m.level, (x) => x.level, `${clean(m.action)}: ${m.level}.`, { closed: true, distinct: (a, c) => !rootsNested(a, c) }),
    m.test && ask("test", "How to test", `How is the ${m.level} myotome tested (${stem(m.action)})?`, m.test, (x) => x.test, `${m.level}: ${clean(m.test)}.`, { overlap: 0.5 }),
    m.compensation && ask("compensation", "Compensation", `Which compensation should you watch for when testing ${clean(m.action)}?`, m.compensation, (x) => x.compensation, `${clean(m.action)}: ${clean(m.compensation)}.`),
  ].filter(Boolean);
}

// ---- Cranial nerves -----------------------------------------------------------

// The comma-separated tests, without splitting inside brackets ("(coffee, mint, soap)").
export function testSteps(text) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of String(text || "")) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.filter(Boolean);
}
// The pupillary light reflex tests CN II (in) and CN III (out), so it cannot pick out one nerve.
const stepThatNamesOneNerve = (cn) => testSteps(cn.test).find((s) => !/pupil/i.test(s)) || null;
// "Compare face at rest" -> "compare face at rest" mid-sentence; acronyms ("SLR") are left alone.
const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function cranialQuestions(cn, all) {
  if (!cn) return [];
  const rest = others(all, cn, "id");
  const label = (x) => `CN ${x.numeral} — ${x.name}`;
  const step = stepThatNamesOneNerve(cn);
  const note = readable(cn.note, BUDGET + 40);
  // A note that says "CN XI palsy..." or names the "optic tract" gives its own nerve away, and
  // so would a wrong answer that names it: neither is used.
  const numerals = new RegExp(`\\bCN\\s*(?:${(String(cn.numeral).match(/[IVX]+/g) || ["-"]).join("|")})\\b`, "i");
  const nameWords = String(cn.name).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5);
  const namesMe = (t) => numerals.test(t) || nameWords.some((w) => String(t).toLowerCase().includes(w));
  const ask = (key, topic, question, answer, get, explanation, extra) =>
    makeQuestion({ id: `${cn.id}:${key}`, topic, question, answer, tiers: [rest.map(get)], explanation, ...extra });
  return [
    ask("name", "Nerve name", `What is the name of cranial nerve ${cn.numeral}?`, cn.name, (x) => x.name, `CN ${cn.numeral} is the ${clean(cn.name)}.`),
    ask("numeral", "Nerve number", `Which cranial nerve number goes with “${clean(cn.name)}”?`, `CN ${cn.numeral}`, (x) => `CN ${x.numeral}`, `${clean(cn.name)} is CN ${cn.numeral}.`, { closed: true }),
    step && ask("test", "How it is tested", `Which cranial nerve is tested by: ${lowerFirst(clean(step))}?`, label(cn), label, `${label(cn)} — tested by ${lowerFirst(clean(step))}.`, { closed: true }),
    note && !namesMe(note) && ask("note", "Clinical point", `Which clinical point goes with CN ${cn.numeral} (${clean(cn.name)})?`, note, (x) => readable(x.note, BUDGET + 40), `${label(cn)}: ${note}.`, { distinct: (_, c) => !namesMe(c) }),
  ].filter(Boolean);
}
