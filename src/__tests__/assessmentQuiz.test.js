// assessmentQuiz.test.js
// The Quiz tab on Learn's Cardio & Respiratory and Neuro-conditions screens is
// generated from each item's own data (2026-09-20, Aditi: "now do same for neuro
// and cardio"). These tests hold every real item to the same rules as the other
// Learn quizzes: enough questions, a fair set of options, exactly one right
// answer taken from the item itself, and the same questions every time.
import { describe, it, expect } from "vitest";
import { cardiovascularData } from "../cardiovascularData.js";
import { respiratoryData } from "../respiratoryData.js";
import { neuroConditionLibraryData } from "../neuroConditionLibraryData.js";
import { buildAssessmentQuiz, scaleRows } from "../physiofeed/learn/assessmentQuiz.js";
import { clean, tooSimilar } from "../physiofeed/learn/quizKit.js";

const cardioRegion = (d) => {
  const p = d.category.split("·").map((s) => s.trim());
  return p.length > 2 ? p[2] : p[p.length - 1];
};
const neuroRegion = (d) => d.category.split("·").pop().trim();

const DATASETS = [
  ["Cardio & Respiratory", { ...cardiovascularData, ...respiratoryData }, cardioRegion],
  ["Neuro conditions", neuroConditionLibraryData, neuroRegion],
];
const poolOf = (data, regionOf) => Object.entries(data).map(([id, d]) => ({ id, region: regionOf(d), d }));
const quizzes = (data, regionOf) => {
  const pool = poolOf(data, regionOf);
  return Object.entries(data).map(([id, d]) => ({ id, d, qs: buildAssessmentQuiz(id, d.title, d, regionOf(d), pool) }));
};

const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
};
const norm = (s) => clean(s).toLowerCase();
const ownText = (d) => strings(d).map(norm);
const rightOf = (q) => q.options.find((o) => o.id === q.correctOptionId).text;
const POSITION_WORDS = /\b(seated|sitting|supine|prone|standing|upright|lying|side[- ]?lying|recumbent|reclined)\b/i;

describe("scaleRows", () => {
  it("reads a table row as key / value and a meter row as chip / name — description", () => {
    expect(scaleRows({ scale: { type: "table", rows: [{ k: "Tachycardia", v: ">100 bpm" }] } })).toEqual([{ key: "Tachycardia", value: ">100 bpm" }]);
    expect(scaleRows({ scale: { type: "meter", rows: [{ chip: "2+", name: "Normal", desc: "Easily palpable" }] } })).toEqual([{ key: "2+", value: "Normal — Easily palpable" }]);
    expect(scaleRows({})).toEqual([]);
    expect(scaleRows(null)).toEqual([]);
  });
});

describe("buildAssessmentQuiz", () => {
  for (const [label, data, regionOf] of DATASETS) {
    const all = quizzes(data, regionOf);

    it(`${label}: every item gets 5 to 9 well-formed questions, nearly all at least 6`, () => {
      // Tinel's sign has three how-to boxes that are one 260+ character sentence each: too long for
      // a phone option, so those questions are left out rather than cut short.
      expect(all.filter(({ qs }) => qs.length >= 6).length / all.length).toBeGreaterThan(0.95);
      for (const { id, d, qs } of all) {
        expect(qs.length, id).toBeGreaterThanOrEqual(5);
        expect(qs.length, id).toBeLessThanOrEqual(9);
        const ids = new Set();
        const topics = {};
        for (const q of qs) {
          const where = `${id} / ${q.topic}`;
          expect(q.question, where).toContain(d.title);
          expect(q.topic, where).toBeTruthy();
          expect(q.explanation, where).toBeTruthy();
          expect(q.options, where).toHaveLength(4);
          expect(q.options.map((o) => o.id).join(""), where).toBe("ABCD");
          const texts = q.options.map((o) => norm(o.text));
          expect(new Set(texts).size, where).toBe(4);
          expect(q.options.filter((o) => o.id === q.correctOptionId), where).toHaveLength(1);
          q.options.forEach((o) => expect(o.text.length, where).toBeLessThanOrEqual(240));
          expect(ids.has(q.id), `${where} duplicate id`).toBe(false);
          ids.add(q.id);
          topics[q.topic] = (topics[q.topic] || 0) + 1;
        }
        Object.entries(topics).forEach(([t, n]) => expect(n, `${id} asks "${t}" ${n} times`).toBeLessThanOrEqual(t === "Scale / reference" ? 2 : 1));
        expect(topics["Normal finding"], id).toBe(1);
        expect(topics["Abnormal finding"], id).toBe(1);
        expect(topics["Patient position"], id).toBe(1);
      }
    });

    it(`${label}: the right answer is the item's own text; a wrong answer never is`, () => {
      for (const { id, d, qs } of all) {
        const own = ownText(d);
        for (const q of qs) {
          const where = `${id} / ${q.topic}`;
          const right = rightOf(q);
          // A meter row reads "Name — description": each half is in the data.
          const parts = q.topic === "Scale / reference" && right.includes(" — ") ? right.split(" — ") : [right];
          parts.forEach((part) => expect(own.some((t) => t.includes(norm(part))), `${where}: "${part}" is not in the item`).toBe(true));
          if (q.topic === "Scale / reference") continue; // the rest of the same table is a fair wrong answer
          q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => {
            expect(own.some((t) => t.includes(norm(o.text))), `${where}: wrong answer "${o.text}" is the item's own text`).toBe(false);
          });
        }
      }
    });

    it(`${label}: no wrong answer is a near-copy of the right one`, () => {
      for (const { id, qs } of all) {
        for (const q of qs) {
          if (q.topic === "Scale / reference") continue; // short values from one table: see the scale test below
          const right = rightOf(q);
          const limit = q.topic === "Patient position" || q.topic === "How it is performed" ? 0.4 : 0.6;
          q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => {
            expect(tooSimilar(o.text, right, limit), `${id} / ${q.topic}: "${o.text}" vs "${right}"`).toBe(false);
          });
        }
      }
    });

    it(`${label}: a scale question's wrong answers are other values, never the right one twice`, () => {
      let asked = 0;
      for (const { id, d, qs } of all) {
        const rows = scaleRows(d);
        const scaleQs = qs.filter((q) => q.topic === "Scale / reference");
        expect(scaleQs.length, id).toBeLessThanOrEqual(rows.length >= 4 ? 2 : 1);
        if (rows.length < 2) expect(scaleQs, id).toHaveLength(0);
        for (const q of scaleQs) {
          asked++;
          const key = q.question.match(/what goes with “(.+)”\?$/)?.[1];
          const row = rows.find((r) => r.key === key);
          expect(row, `${id}: row "${key}"`).toBeTruthy();
          expect(rightOf(q), id).toBe(row.value);
          expect(new Set(q.options.map((o) => norm(o.text))).size, id).toBe(4);
        }
      }
      expect(asked).toBeGreaterThan(all.length / 2);
    });

    it(`${label}: wrong findings come from other groups when there are enough of them`, () => {
      const pool = poolOf(data, regionOf);
      for (const { id, d, qs } of all) {
        const region = regionOf(d);
        const q = qs.find((x) => x.topic === "Normal finding");
        const sameRegion = new Set(pool.filter((p) => p.id !== id && p.region === region).flatMap((p) => p.d.interpret.normal).map(norm));
        const farCount = new Set(pool.filter((p) => p.region !== region).flatMap((p) => p.d.interpret.normal).map(norm)).size;
        if (farCount < 10) continue;
        q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => expect(sameRegion.has(norm(o.text)), `${id}: "${o.text}" is from the same group`).toBe(false));
      }
    });

    it(`${label}: a position question's wrong answers are positions too`, () => {
      for (const { id, qs } of all) {
        const q = qs.find((x) => x.topic === "Patient position");
        if (!POSITION_WORDS.test(rightOf(q))) continue;
        q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => expect(o.text, id).toMatch(POSITION_WORDS));
      }
    });

    it(`${label}: no option is cut off mid-bracket`, () => {
      for (const { id, qs } of all) {
        qs.forEach((q) => q.options.forEach((o) => {
          expect((o.text.match(/\(/g) || []).length, `${id}: ${o.text}`).toBe((o.text.match(/\)/g) || []).length);
        }));
      }
    });

    it(`${label}: builds the same questions in the same order every time`, () => {
      const again = quizzes(data, regionOf);
      expect(again.map((x) => x.qs)).toEqual(all.map((x) => x.qs));
    });
  }

  it("asks the red-flag question wherever an item has red flags and there are enough others", () => {
    const [, data, regionOf] = DATASETS[0];
    const withRed = quizzes(data, regionOf).filter(({ d }) => d.interpret.redFlags?.length);
    expect(withRed.length).toBeGreaterThan(10);
    const asked = withRed.filter(({ qs }) => qs.some((q) => q.topic === "Red flag")).length;
    expect(asked / withRed.length).toBeGreaterThan(0.9);
  });

  it("uses a meter row's grade and description, e.g. pulse volume 2+", () => {
    const [, data, regionOf] = DATASETS[0];
    const item = quizzes(data, regionOf).find(({ id }) => id === "pulseVolume");
    const q = item.qs.find((x) => x.topic === "Scale / reference");
    expect(q.question).toMatch(/^Under “.+” for Pulse Volume/);
    expect(q.options.every((o) => o.text.includes(" — "))).toBe(true);
  });

  it("returns nothing for a missing item, and skips what an item has no data for", () => {
    expect(buildAssessmentQuiz("x", "X", null, "r", [])).toEqual([]);
    expect(buildAssessmentQuiz("x", "X", {}, "r", [])).toEqual([]);
    expect(buildAssessmentQuiz("x", "X", { interpret: { normal: ["Only this"] } }, "r", [])).toEqual([]);
  });
});
