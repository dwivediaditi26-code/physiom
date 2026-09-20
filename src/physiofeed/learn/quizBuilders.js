// Turns one Learn item (a ROM movement, MMT muscle, special test or palpation
// structure) into a short list of quiz questions built from that item's own
// reference data. See quizKit.js for how wrong answers are chosen.
//
// Order follows the tabs: Learn-tab facts first, then Technique-tab facts, so
// working through the quiz revisits the page top to bottom. Each question's
// explanation restates only the fact it tested (not the neighbouring ones), so a
// later question is not answered by an earlier explanation.
//
// `region` = the items in the same region (the best source of plausible wrong
// answers); `all` = every item of that kind (used when a region is too small).

import { hash, clean, softCaps, makeQuestion, makeFixedQuestion, rootsNested, midOf, splitHow, tooSimilar } from "./quizKit.js";

const MAX = { rom: 8, mmt: 8, special: 7, palpation: 6 };

// "Deep Neck Flexors (longus colli/capitis)" -> "Deep Neck Flexors" for question stems.
const stem = (name) => String(name || "").replace(/\s*\(.*$/, "").trim() || String(name || "");
const others = (list, item) => (list || []).filter((x) => x.id !== item.id);

// ---- ROM ------------------------------------------------------------------------

// The data spells the same plane / axis several ways ("Frontal", "Frontal
// (coronal)"; "Vertical", "Longitudinal"); fold them to one label each so a wrong
// answer is never just a synonym of the right one.
const PLANES = [
  [/sagittal/i, "Sagittal plane"],
  [/frontal|coronal/i, "Frontal (coronal) plane"],
  [/transverse|horizontal/i, "Transverse plane"],
  [/multi/i, "More than one plane"],
];
const AXES = [
  [/frontal|coronal/i, "Frontal (coronal) axis"],
  [/\bap\b|anterior/i, "Anteroposterior (AP) axis"],
  [/vertical|longitudinal/i, "Vertical (longitudinal) axis"],
  [/multi/i, "More than one axis"],
];
const canon = (table, s) => {
  const hit = table.find(([re]) => re.test(String(s || "")));
  return hit ? hit[1] : null;
};

function rangeQuestion(m, region, name = m.mv) {
  if (m.normal == null) return null;
  const pool = [...new Set(others(region, m).filter((x) => x.normal != null && x.normal !== m.normal).map((x) => x.normal))];
  // Regions with few distinct normals (e.g. cervical, where several movements
  // share 45) pad the choices with plausible nearby values.
  const step = m.normal >= 60 ? 20 : m.normal >= 20 ? 15 : 5;
  [m.normal - step, m.normal + step, m.normal + 2 * step, m.normal - 2 * step, m.normal + 3 * step].forEach((v) => {
    if (v > 0 && v !== m.normal && !pool.includes(v)) pool.push(v);
  });
  const picks = pool.map((v) => ({ v, k: hash(`${m.id}:range:${v}`) })).sort((a, b) => a.k - b.k).slice(0, 3).map((o) => o.v);
  if (picks.length < 3) return null;
  const unit = m.unit || "°";
  const ordered = [...picks, m.normal]
    .map((v, i) => ({ v, k: hash(`${m.id}:range#${v}${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: "ABCD"[i], v: o.v, text: `${o.v}${unit}` }));
  return {
    id: `${m.id}:range`,
    topic: "Normal range",
    question: `What is the normal range for ${name}?`,
    options: ordered.map(({ id, text }) => ({ id, text })),
    correctOptionId: ordered.find((o) => o.v === m.normal).id,
    explanation: `${name} — normal range: ${m.normal}${unit}.`,
  };
}

export function romQuestions(m, region, all, regionName) {
  if (!m) return [];
  const o1 = others(region, m);
  const o2 = others(all, m);
  const T = (f) => [o1.map(f), o2.map(f)];
  const ask = (key, topic, question, answer, get, explanation, extra) =>
    makeQuestion({ id: `${m.id}:${key}`, topic, question, answer, tiers: T(get), explanation, ...extra });
  // "Extension" alone could be any joint: name it ("Extension (Shoulder)") unless it already says so.
  const name = regionName && !String(m.mv).toLowerCase().includes(String(regionName).toLowerCase()) ? `${m.mv} (${regionName})` : m.mv;
  const plane = canon(PLANES, m.plane);
  const axis = canon(AXES, m.axis);
  const fixed = (key, topic, question, answer, labels, explanation) =>
    answer ? makeQuestion({ id: `${m.id}:${key}`, topic, question, answer, tiers: [labels], explanation }) : null;

  return [
    rangeQuestion(m, region, name),
    fixed("plane", "Plane of movement", `In which plane does ${name} occur?`, plane, PLANES.map(([, l]) => l), `${name} — plane: ${plane}.`),
    fixed("axis", "Axis of movement", `About which axis does ${name} occur?`, axis, AXES.map(([, l]) => l), `${name} — axis: ${axis}.`),
    m.endfeel?.normal && ask("endfeel", "End feel", `What is the normal end feel at the end of ${name}?`, m.endfeel.normal, (x) => x.endfeel?.normal, `${name} — normal end feel: ${clean(m.endfeel.normal)}.`),
    m.muscles && ask("muscles", "Muscles", `Which muscles produce ${name}?`, m.muscles, (x) => x.muscles, `${name} — muscles: ${clean(m.muscles)}.`),
    m.start && ask("start", "Starting position", `What is the correct starting position for measuring ${name}?`, m.start, (x) => x.start, `${name} — starting position: ${clean(m.start)}.`),
    m.gonio && ask("gonio", "Goniometer placement", `Where is the goniometer placed to measure ${name}?`, m.gonio, (x) => x.gonio, `${name} — goniometer: ${clean(m.gonio)}.`),
    m.compensation && ask("comp", "Compensation", `Which compensation should you watch for when measuring ${name}?`, m.compensation, (x) => x.compensation, `${name} — watch for: ${clean(m.compensation)}.`),
  ].filter(Boolean).slice(0, MAX.rom);
}

// ---- MMT --------------------------------------------------------------------------

export function mmtQuestions(m, region, all) {
  if (!m) return [];
  const name = stem(m.muscle);
  const o1 = others(region, m);
  const o2 = others(all, m);
  const T = (f) => [o1.map(f), o2.map(f)];
  const ask = (key, topic, question, answer, get, explanation, extra) =>
    answer ? makeQuestion({ id: `${m.id}:${key}`, topic, question, answer, tiers: T(get), explanation, ...extra }) : null;

  return [
    ask("nerve", "Nerve supply", `Which nerve supplies the ${name}?`, m.nerve, (x) => x.nerve, `${name} — nerve supply: ${clean(m.nerve)}.`),
    ask("root", "Root level", `Which spinal root level supplies the ${name}?`, m.root, (x) => x.root, `${name} — root level: ${clean(m.root)}.`, { distinct: (a, c) => !rootsNested(a, c) }),
    ask("action", "Action", `What is the main action of the ${name}?`, m.action, (x) => x.action, `${name} — action: ${clean(m.action)}.${m.functional ? ` ${clean(m.functional)}.` : ""}`),
    ask("origin", "Origin", `Where does the ${name} originate?`, m.origin, (x) => x.origin, `${name} — origin: ${clean(m.origin)}.`),
    ask("insertion", "Insertion", `Where does the ${name} insert?`, m.insertion, (x) => x.insertion, `${name} — insertion: ${clean(m.insertion)}.`),
    ask("position", "Testing position", `How is the patient positioned to test the ${name}?`, m.patient, (x) => x.patient, `${name} — patient position: ${clean(m.patient)}.`),
    ask("resistance", "Resistance", `Where and how does the therapist resist when testing the ${name}?`, m.resistance, (x) => x.resistance, `${name} — resistance: ${clean(m.resistance)}.`),
    ask("substitution", "Substitution", `Which substitution should you watch for when testing the ${name}?`, m.substitution, (x) => x.substitution, `${name} — substitution: ${clean(m.substitution)}.`),
    ask("gravity", "Gravity-eliminated test", `How is the ${name} tested with gravity eliminated?`, m.gravElim, (x) => x.gravElim, `${name} — gravity eliminated: ${clean(m.gravElim)}.`),
  ].filter(Boolean).slice(0, MAX.mmt);
}

// ---- Special tests ----------------------------------------------------------------

const firstPosition = (t) => {
  const s = splitHow(t?.how).positions.find((x) => /^\W*patient\b/i.test(x));
  return s ? clean(softCaps(s)) : null;
};
// The first real execution step (not a "Positive = ..." result line).
const firstStep = (t) => {
  const s = splitHow(t?.how).steps.find((x) => clean(x).length >= 25 && !/^\W*(positive|negative)\b/i.test(x));
  return s ? clean(softCaps(s)) : null;
};

const READING = {
  rulein: "A positive result helps rule the condition in, but a normal result does not rule it out",
  ruleout: "A negative result helps rule the condition out, but a positive result does not confirm it",
  both: "Both a positive and a negative result change the likelihood of the condition",
  weak: "Neither result is very informative on its own, so combine it with other findings",
};
const READING_WHY = {
  rulein: "High specificity means few false positives, so a positive result is meaningful (SpPin). Low sensitivity means many false negatives, so a normal result cannot exclude the condition.",
  ruleout: "High sensitivity means few false negatives, so a negative result is meaningful (SnNout). Low specificity means many false positives, so a positive result is not conclusive.",
  both: "Sensitivity and specificity are both high, so a positive and a negative result are both informative.",
  weak: "Sensitivity and specificity are both low, so neither result is reliable alone. Combine the test with the history and other findings.",
};

function diagnosticQuestion(t) {
  const sens = midOf(t.sensitivity);
  const spec = midOf(t.specificity);
  if (!Number.isFinite(sens) || !Number.isFinite(spec)) return null;
  const HIGH = 80;
  const LOW = 65;
  let key = null;
  if (spec >= HIGH && sens < LOW) key = "rulein";
  else if (sens >= HIGH && spec < LOW) key = "ruleout";
  else if (sens >= HIGH && spec >= HIGH) key = "both";
  else if (sens < LOW && spec < LOW) key = "weak";
  if (!key) return null;
  return makeFixedQuestion({
    id: `${t.id}:diagnostic`,
    topic: "How reliable it is",
    question: `The ${t.label} has sensitivity ${clean(t.sensitivity)} and specificity ${clean(t.specificity)}. What does that mean in practice?`,
    options: Object.values(READING),
    correct: READING[key],
    explanation: `${READING_WHY[key]}`,
  });
}

export function specialQuestions(t, region, all) {
  if (!t) return [];
  const o1 = others(region, t);
  const o2 = others(all, t);
  const different = (x) => !tooSimilar(x.structure, t.structure);
  const T = (f, keep = () => true) => [o1.filter(keep).map(f), o2.filter(keep).map(f)];
  const out = [];
  if (t.quickCheck?.question) out.push({ ...t.quickCheck, topic: t.quickCheck.topic || "Quick check" });
  const ask = (key, topic, question, answer, tiers, explanation) =>
    answer ? makeQuestion({ id: `${t.id}:${key}`, topic, question, answer, tiers, explanation }) : null;

  out.push(
    ask("structure", "What it tests", `Which structure does the ${t.label} primarily assess?`, t.structure, T((x) => x.structure), `${t.label} stresses ${clean(t.structure)}.`),
    diagnosticQuestion(t),
    ask("positive", "Positive finding", `What is a positive finding on the ${t.label}?`, t.positive, T((x) => x.positive, different), `Positive ${t.label}: ${clean(t.positive)}.`),
    ask("position", "Patient position", `How is the patient positioned for the ${t.label}?`, firstPosition(t), T(firstPosition), `${t.label}: ${firstPosition(t)}.`),
    ask("manoeuvre", "How it is performed", `Which describes how the ${t.label} is performed?`, firstStep(t), T(firstStep), `${t.label}: ${firstStep(t)}.`),
    ask("choose", "Choosing the test", `Which test would you choose to assess ${clean(t.structure)}?`, t.label, T((x) => x.label, different), `${t.label} assesses ${clean(t.structure)}.`),
  );
  return out.filter(Boolean).slice(0, MAX.special);
}

// ---- Palpation --------------------------------------------------------------------

const POSITIONS = ["Prone", "Supine", "Seated", "Side lying"];
const canonPosition = (s) => POSITIONS.find((p) => new RegExp(`^${p.replace(" ", "[ -]?")}$`, "i").test(clean(s))) || null;

export function palpationQuestions(item, region, all) {
  if (!item) return [];
  const a = item.attachments || {};
  const same = (x) => x.id !== item.id && x.type === item.type;
  const o1 = (region || []).filter(same);
  const o2 = (all || []).filter(same);
  const o3 = others(all, item);
  const T = (f) => [o1.map(f), o2.map(f), o3.map(f)];
  const name = item.name;
  const ask = (key, topic, question, answer, get, explanation) =>
    answer ? makeQuestion({ id: `${item.id}:${key}`, topic, question, answer, tiers: T(get), explanation }) : null;
  const pos = canonPosition(item.position);

  return [
    ask("origin", "Origin", `Where does the ${name} originate?`, a.origin, (x) => x.attachments?.origin, `${name} — origin: ${clean(a.origin)}.`),
    ask("insertion", "Insertion", `Where does the ${name} insert?`, a.insertion, (x) => x.attachments?.insertion, `${name} — insertion: ${clean(a.insertion)}.`),
    ask("actions", "Action", `What is the action of the ${name}?`, item.actions, (x) => x.actions, `${name} — action: ${clean(item.actions)}.`),
    pos ? makeQuestion({ id: `${item.id}:position`, topic: "Palpation position", question: `In which position is the ${name} palpated?`, answer: pos, tiers: [POSITIONS], explanation: `${name} — palpated with the client ${pos.toLowerCase()}.` }) : null,
    ask("feel", "What you feel for", `What are you feeling for when you palpate the ${name}?`, item.feelFor, (x) => x.feelFor, `${name} — you are feeling for: ${clean(item.feelFor)}.`),
    ask("hand", "Hand placement", `Where do you place your hand to start palpating the ${name}?`, item.handPlacement, (x) => x.handPlacement, `${name} — hand placement: ${clean(item.handPlacement)}.`),
  ].filter(Boolean).slice(0, MAX.palpation);
}
