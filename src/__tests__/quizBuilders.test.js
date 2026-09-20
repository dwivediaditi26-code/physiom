// quizBuilders.test.js
// The Learn quizzes are generated from each item's own reference data
// (2026-09-20, Aditi: "in quiz have more ques ... from itself so that student
// learn fully"). These tests hold every real ROM movement, MMT muscle, special
// test and palpation structure to the same rules: enough questions, a fair set
// of options, exactly one right answer, and the same questions every time.
import { describe, it, expect } from "vitest";
import { ROM_DATA, MMT_DATA, SPECIAL_TESTS_DATA } from "../sharedClinicalData.js";
import { PALPATION_DATA } from "../palpationData.js";
import { hash, tooSimilar, rootsNested, rootSet, midOf, splitHow, makeQuestion, clean } from "../physiofeed/learn/quizKit.js";
import { romQuestions, mmtQuestions, specialQuestions, palpationQuestions } from "../physiofeed/learn/quizBuilders.js";

const romAll = Object.values(ROM_DATA).flat();
const mmtAll = Object.values(MMT_DATA).flat();
const stAll = Object.values(SPECIAL_TESTS_DATA).flatMap((r) => r.tests);
const palAll = Object.values(PALPATION_DATA).flat();

const sets = {
  rom: Object.entries(ROM_DATA).flatMap(([region, list]) => list.map((m) => ({ id: m.id, qs: romQuestions(m, list, romAll, region) }))),
  mmt: Object.entries(MMT_DATA).flatMap(([, list]) => list.map((m) => ({ id: m.id, qs: mmtQuestions(m, list, mmtAll) }))),
  special: Object.values(SPECIAL_TESTS_DATA).flatMap((reg) => reg.tests.map((t) => ({ id: t.id, qs: specialQuestions(t, reg.tests, stAll) }))),
  palpation: Object.entries(PALPATION_DATA).flatMap(([, list]) => list.map((p) => ({ id: p.id, qs: palpationQuestions(p, list, palAll) }))),
};

describe("quizKit helpers", () => {
  it("treats near-identical answers as too similar, and different ones as fine", () => {
    expect(tooSimilar("Firm", "Firm (capsule)")).toBe(true);
    expect(tooSimilar("Supine", "supine.")).toBe(true);
    expect(tooSimilar("Prone", "Supine")).toBe(false);
    expect(tooSimilar("Axillary nerve", "Radial nerve")).toBe(false);
  });

  it("spots root levels that sit inside one another", () => {
    expect([...rootSet("C5–C7")]).toEqual(["C5", "C6", "C7"]);
    expect([...rootSet("C6–C8 (primarily C7)")].sort()).toEqual(["C6", "C7", "C8"]);
    expect(rootsNested("C5–C6", "C5")).toBe(true);
    expect(rootsNested("C6–T1", "C7")).toBe(true);
    expect(rootsNested("C5–C6", "C6–C7")).toBe(false);
    expect(rootsNested("L4–S1", "C5")).toBe(false);
  });

  it("reads a sensitivity / specificity range", () => {
    expect(midOf("30–40%")).toBe(35);
    expect(midOf("69%")).toBe(69);
    expect(Number.isNaN(midOf("Variable"))).toBe(true);
    expect(Number.isNaN(midOf("—"))).toBe(true);
  });

  it("splits a how-to paragraph into positions and steps", () => {
    const { positions, steps } = splitHow("Patient seated. Therapist behind. Apply axial load. Positive if pain.");
    expect(positions).toEqual(["Patient seated.", "Therapist behind."]);
    expect(steps).toEqual(["Apply axial load.", "Positive if pain."]);
  });

  it("makes a stable question with one right answer, and skips when there are too few wrong answers", () => {
    const args = { id: "t1", topic: "Topic", question: "Q?", answer: "Alpha", tiers: [["Beta", "Gamma", "Delta", "Epsilon"]], explanation: "E" };
    const a = makeQuestion(args);
    const b = makeQuestion(args);
    expect(a).toEqual(b);
    expect(a.options).toHaveLength(4);
    expect(a.options.find((o) => o.id === a.correctOptionId).text).toBe("Alpha");
    expect(makeQuestion({ ...args, tiers: [["Beta", "Gamma"]] })).toBeNull();
    expect(makeQuestion({ ...args, tiers: [["alpha", "Alpha (x)", "Beta", "Gamma"]] })).toBeNull();
    expect(makeQuestion({ ...args, answer: "x".repeat(300) })).toBeNull();
  });

  it("hashes the same string to the same number", () => {
    expect(hash("abc")).toBe(hash("abc"));
    expect(hash("abc")).not.toBe(hash("abd"));
  });
});

describe("generated quizzes hold to the rules for every real item", () => {
  for (const [kind, list] of Object.entries(sets)) {
    it(`${kind}: every question is well-formed`, () => {
      for (const { id, qs } of list) {
        const topics = new Set();
        for (const q of qs) {
          const where = `${kind} ${id} / ${q.topic}`;
          expect(q.question, where).toBeTruthy();
          expect(q.topic, where).toBeTruthy();
          expect(q.explanation, where).toBeTruthy();
          expect(q.options.length, where).toBeGreaterThanOrEqual(3);
          expect(q.options.length, where).toBeLessThanOrEqual(4);
          expect(q.options.map((o) => o.id).join(""), where).toBe("ABCD".slice(0, q.options.length));
          const texts = q.options.map((o) => clean(o.text).toLowerCase());
          expect(new Set(texts).size, where).toBe(texts.length);
          expect(q.options.filter((o) => o.id === q.correctOptionId), where).toHaveLength(1);
          q.options.forEach((o) => expect(o.text.length, where).toBeLessThanOrEqual(260));
          expect(topics.has(q.topic), `${where} repeated`).toBe(false);
          topics.add(q.topic);
        }
      }
    });

    it(`${kind}: no wrong answer is a near-copy of the right one`, () => {
      for (const { id, qs } of list) {
        for (const q of qs) {
          if (q.topic === "How reliable it is" || q.topic === "Normal range") continue; // fixed statements / plain numbers, not drawn from neighbouring text
          const right = q.options.find((o) => o.id === q.correctOptionId).text;
          q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => {
            expect(tooSimilar(o.text, right), `${kind} ${id} / ${q.topic}: "${o.text}" vs "${right}"`).toBe(false);
          });
        }
      }
    });
  }

  it("gives every MMT muscle 8 questions and every ROM movement at least 6", () => {
    sets.mmt.forEach(({ id, qs }) => expect(qs.length, id).toBe(8));
    sets.rom.forEach(({ id, qs }) => expect(qs.length, id).toBeGreaterThanOrEqual(6));
  });

  it("gives every special test at least 3 questions and most palpation structures at least 5", () => {
    sets.special.forEach(({ id, qs }) => expect(qs.length, id).toBeGreaterThanOrEqual(3));
    const rich = sets.palpation.filter(({ qs }) => qs.length >= 5).length;
    expect(rich / sets.palpation.length).toBeGreaterThan(0.7);
  });

  it("builds exactly the same questions every time", () => {
    const again = Object.values(MMT_DATA).flatMap((list) => list.map((m) => mmtQuestions(m, list, mmtAll)));
    expect(again).toEqual(sets.mmt.map((s) => s.qs));
  });

  it("names the joint in ROM questions so 'Extension' is not ambiguous", () => {
    const shoulderExt = sets.rom.find(({ qs }) => qs[0]?.question.includes("(Shoulder)"));
    expect(shoulderExt).toBeTruthy();
    expect(sets.rom.find(({ id }) => id === "rom_cflex").qs[0].question).toContain("Flexion (Cervical)");
  });
});

describe("special test 'how reliable' question follows the numbers", () => {
  const base = { id: "t", label: "Test", structure: "S", positive: "P", how: "" };
  const ask = (sensitivity, specificity) => specialQuestions({ ...base, sensitivity, specificity }, [], []).find((q) => q.topic === "How reliable it is");
  const rightText = (q) => q.options.find((o) => o.id === q.correctOptionId).text;

  it("high specificity, low sensitivity rules IN", () => expect(rightText(ask("30–40%", "92–93%"))).toMatch(/rule the condition in/));
  it("high sensitivity, low specificity rules OUT", () => expect(rightText(ask("90%", "40%"))).toMatch(/rule the condition out/));
  it("both high is informative both ways", () => expect(rightText(ask("91%", "90%"))).toMatch(/Both a positive and a negative/));
  it("both low is weak on its own", () => expect(rightText(ask("40%", "45%"))).toMatch(/Neither result/));
  it("asks nothing when the numbers sit in the grey zone or are missing", () => {
    expect(ask("70%", "70%")).toBeUndefined();
    expect(ask("Variable", "Variable")).toBeUndefined();
    expect(ask("—", "—")).toBeUndefined();
  });
});
