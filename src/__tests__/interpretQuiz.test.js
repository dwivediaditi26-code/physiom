import { describe, it, expect } from "vitest";
import { buildInterpretQuiz } from "../physiofeed/learn/interpretQuiz.js";
import { cardiovascularData } from "../cardiovascularData.js";
import { respiratoryData } from "../respiratoryData.js";
import { neuroConditionLibraryData } from "../neuroConditionLibraryData.js";

// The Quick Check on Learn's Cardio & Respiratory and Neuro-conditions study
// screens is generated from each item's own interpret lists, so this checks
// every real item yields a well-formed question rather than the "No quick
// check" placeholder.

const regionOf = (d) => d.category.split("·").pop().trim();
const poolOf = (data) => Object.entries(data).map(([id, d]) => ({ id, region: regionOf(d), d }));
const ownFindings = (d) => [...(d.interpret?.normal || []), ...(d.interpret?.abnormal || []), ...(d.interpret?.redFlags || [])];

const DATASETS = [
  ["Cardio & Respiratory", { ...cardiovascularData, ...respiratoryData }],
  ["Neuro conditions", neuroConditionLibraryData],
];

describe("buildInterpretQuiz", () => {
  for (const [label, data] of DATASETS) {
    it(`builds a valid 4-option Quick Check for every ${label} item`, () => {
      const pool = poolOf(data);
      for (const [id, d] of Object.entries(data)) {
        const q = buildInterpretQuiz(id, d.title, d, regionOf(d), pool);
        expect(q, id).toBeTruthy();
        expect(q.options, id).toHaveLength(4);
        expect(new Set(q.options.map((o) => o.text)).size, id).toBe(4);
        expect(q.question, id).toContain(d.title);

        const right = q.options.filter((o) => o.id === q.correctOptionId);
        expect(right, id).toHaveLength(1);
        const own = ownFindings(d);
        expect(own, id).toContain(right[0].text);
        q.options.filter((o) => o.id !== q.correctOptionId).forEach((o) => expect(own, `${id}: distractor is the item's own finding`).not.toContain(o.text));
      }
    });
  }

  it("asks the same question with the same option order every time", () => {
    const data = { ...cardiovascularData, ...respiratoryData };
    const pool = poolOf(data);
    const d = data.heartRate;
    const a = buildInterpretQuiz("heartRate", d.title, d, regionOf(d), pool);
    const b = buildInterpretQuiz("heartRate", d.title, d, regionOf(d), pool);
    expect(b).toEqual(a);
  });

  it("returns null when the item has no interpretation to ask about", () => {
    expect(buildInterpretQuiz("x", "X", { interpret: {} }, "r", [])).toBeNull();
    expect(buildInterpretQuiz("x", "X", {}, "r", [])).toBeNull();
  });
});
