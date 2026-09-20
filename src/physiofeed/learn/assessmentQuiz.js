import { clean, hash, makeQuestion, readable, tooSimilar } from "./quizKit.js";

// Quiz for the study items whose data is an assessment card (Cardio &
// Respiratory, Neuro conditions) rather than a flat table like ROM/MMT: a scale
// or reference table, interpret.normal / abnormal / redFlags lists, a clinical
// note, and four how-to boxes (position, technique, special consideration, tip).
//
// 2026-09-20, Aditi: "now do same for neuro and cardio" -- these used to ask ONE
// normal-or-red-flag question (interpretQuiz.js). Each item now gets a short quiz
// built from its own data, in the order the tabs show it (Learn-tab facts, then
// Technique-tab facts), with the wrong answers taken from OTHER items --
// preferring ones in a different group, so a sibling with a similar finding or
// position can't be an equally right answer. Nothing is written by hand: a
// question exists only when the item's data does, and is skipped when there are
// not enough clearly different wrong answers.
//
// `pool` is [{ id, region, d }] for every item in the dataset.

const MAX_QUESTIONS = 9;
// A long how-to box is shown as its first sentence(s), up to this many characters.
const BUDGET = 200;

// Some "position" boxes are general advice ("Observe throughout the session…"), not
// a body position; a position question's wrong answers are real positions when
// its right answer is one.
const POSITION_WORDS = /\b(seated|sitting|supine|prone|standing|upright|lying|side[- ]?lying|recumbent|reclined)\b/i;

const list = (x) => (Array.isArray(x) ? x.map(String).filter(Boolean) : []);
const boxOf = (d, re) => (d?.perform?.boxes || []).find((b) => re.test(b.label || ""))?.text || "";
const BOX = { position: /position/i, technique: /technique/i, special: /special/i, tip: /tip/i };

// The rows of an item's scale, whichever way the data spells them: a table row is
// { k, v }, a meter row is { chip, name, desc }.
export function scaleRows(d) {
  const s = d?.scale;
  if (!s || !Array.isArray(s.rows)) return [];
  return s.rows
    .map((r) => (s.type === "meter"
      ? { key: clean(r.chip), value: clean(r.desc ? `${r.name} — ${r.desc}` : r.name) }
      : { key: clean(r.k), value: clean(r.v) }))
    .filter((r) => r.key && r.value);
}

export function buildAssessmentQuiz(id, title, d, region, pool) {
  if (!d) return [];
  const others = (pool || []).filter((p) => p.id !== id);
  const far = others.filter((p) => p.region !== region);
  const near = others.filter((p) => p.region === region);
  // Other groups' items first, then this group's. `prefer` moves the candidates that
  // pass it to the front of both, so the wrong answers look like the right one.
  const tiers = (get, prefer) => {
    const base = [far.flatMap((p) => get(p.d)), near.flatMap((p) => get(p.d))];
    return prefer ? [...base.map((l) => l.filter(prefer)), ...base] : base;
  };
  const ask = (key, topic, question, answer, get, explanation, { prefer, ...extra } = {}) =>
    answer ? makeQuestion({ id: `${id}:${key}`, topic, question, answer, tiers: tiers(get, prefer), explanation, ...extra }) : null;

  // A wrong finding must not be one of this item's own findings.
  const mine = [...list(d.interpret?.normal), ...list(d.interpret?.abnormal), ...list(d.interpret?.redFlags)];
  const notMine = (_, c) => !mine.some((m) => tooSimilar(m, c));

  const normal = list(d.interpret?.normal)[0];
  const abnormal = list(d.interpret?.abnormal)[0];
  const red = list(d.interpret?.redFlags)[0];
  const note = readable(d.interpret?.note, BUDGET + 40);
  const position = readable(boxOf(d, BOX.position), BUDGET);
  const technique = readable(boxOf(d, BOX.technique), BUDGET);
  const special = readable(boxOf(d, BOX.special), BUDGET);
  const tip = readable(boxOf(d, BOX.tip), BUDGET);

  const rows = scaleRows(d);
  const label = clean(d.scaleLabel) || "Scale";
  const lower = (s) => clean(s).toLowerCase();
  const inTable = new Set(rows.map((r) => lower(r.value)));
  // The n-th row asked about: the first is picked by hash, a second sits half-way round.
  const scale = (n) => {
    if (rows.length < 2 || (n > 0 && rows.length < 4)) return null;
    const row = rows[(hash(`${id}:scale`) + n * Math.floor(rows.length / 2)) % rows.length];
    // Short values ("Hard" / "Very hard", "60–100 bpm" / ">100 bpm") share words
    // without being the same answer, so the word-overlap check is off here: the
    // table's other rows are different answers by definition, and another item's
    // row is only dropped when it contains, or sits inside, the right answer.
    const distinct = (correct, c) => inTable.has(lower(c)) || !(lower(c).includes(lower(correct)) || lower(correct).includes(lower(c)));
    // Number-style values get number-style wrong answers first, words get words.
    const sameKind = (list) => list.filter((v) => /\d/.test(v) === /\d/.test(row.value));
    const others = tiers((x) => scaleRows(x).map((r) => r.value));
    return makeQuestion({
      id: `${id}:scale${n}`,
      topic: "Scale / reference",
      question: `Under “${label}” for ${title}: what goes with “${row.key}”?`,
      answer: row.value,
      // The same table's other rows first (learn the whole scale), then other items' rows.
      tiers: [rows.filter((r) => r !== row).map((r) => r.value), ...others.map(sameKind), ...others],
      explanation: `${title} — ${label}: “${row.key}” = ${row.value}.`,
      closed: true,
      distinct,
    });
  };

  // Two techniques or positions that read alike could both be right, so those
  // wrong answers are held to a stricter "not too similar" limit.
  const strict = { overlap: 0.4 };
  const out = [
    ask("normal", "Normal finding", `Which of these is a normal finding for ${title}?`, normal, (x) => list(x.interpret?.normal), `Normal for ${title}: ${clean(normal)}.`, { distinct: notMine }),
    ask("abnormal", "Abnormal finding", `Which of these is an abnormal finding when assessing ${title}?`, abnormal, (x) => list(x.interpret?.abnormal), `Abnormal for ${title}: ${clean(abnormal)}.`, { distinct: notMine }),
    ask("red", "Red flag", `Which of these is a red flag when assessing ${title}?`, red, (x) => list(x.interpret?.redFlags), `Red flag for ${title}: ${clean(red)}.`, { distinct: notMine }),
    scale(0),
    scale(1),
    ask("note", "Clinical note", `Which clinical note goes with ${title}?`, note, (x) => [readable(x.interpret?.note, BUDGET + 40)], `${title}: ${note}.`),
    ask("position", "Patient position", `How should the patient be positioned for ${title}?`, position, (x) => [readable(boxOf(x, BOX.position), BUDGET)], `${title} — position: ${position}.`,
      { ...strict, prefer: POSITION_WORDS.test(position) ? (v) => POSITION_WORDS.test(v) : undefined }),
    ask("technique", "How it is performed", `Which describes how ${title} is performed?`, technique, (x) => [readable(boxOf(x, BOX.technique), BUDGET)], `${title}: ${technique}.`, strict),
    ask("special", "Special consideration", `Which special consideration applies to ${title}?`, special, (x) => [readable(boxOf(x, BOX.special), BUDGET)], `${title} — ${special}.`),
    ask("tip", "Clinical tip", `Which tip applies to ${title}?`, tip, (x) => [readable(boxOf(x, BOX.tip), BUDGET)], `${title} — ${tip}.`),
  ].filter(Boolean);

  // A tenth question (everything present) drops the second scale row.
  return (out.length > MAX_QUESTIONS ? out.filter((q) => !q.id.endsWith(":scale1")) : out).slice(0, MAX_QUESTIONS);
}
