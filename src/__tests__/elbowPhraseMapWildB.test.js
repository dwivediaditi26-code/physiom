// elbowPhraseMapWildB.test.js -- a SECOND set of messy, real-life sentences, written before the
// word-order rules were added, so the rules were never tuned against it. (Set A,
// elbowPhraseMapWild.test.js, was used to find what the first version missed, so it is no longer a
// fair exam.) Same scoring: precision = how much of what it suggests is right, recall = how much of
// what a physio would tick it finds. The "silent" group is sentences that contain words the rules
// look for but are NOT about the elbow complaint -- they must produce nothing.
import { describe, it, expect } from "vitest";
import { understandStory } from "../elbowPhraseMap.js";
import { WILD_B, score } from "./elbowWildSets.js";

// Measured on Set B: version 1 (phrases only) scored precision 83% and recall 36% (before the rules existed).
// The rules were written just after Set B, with its kinds of sentences in mind, so Set B is a "seen" set;
// with the rules it scores precision 97.1%, recall 95.7%. The floors only guard against getting worse.
const MIN_PRECISION = 0.94;
const MIN_RECALL = 0.9;

describe("Set B: messy typing the word-order rules were never tuned on", () => {
  it("has 70+ sentences, including 15+ that must stay silent", () => {
    expect(WILD_B.length).toBeGreaterThanOrEqual(70);
    expect(WILD_B.filter((r) => r[2].length === 0).length).toBeGreaterThanOrEqual(15);
  });
  it("precision stays at or above the recorded floor", () => {
    const s = score(WILD_B);
    expect(s.precision, `wrong:\n${s.wrong.join("\n")}`).toBeGreaterThanOrEqual(MIN_PRECISION);
  });
  it("recall stays at or above the recorded floor", () => {
    expect(score(WILD_B).recall).toBeGreaterThanOrEqual(MIN_RECALL);
  });
  it("every sentence that must stay silent stays silent", () => {
    const noisy = WILD_B.filter((r) => r[2].length === 0).filter(([, t]) => understandStory(t).suggestions.length > 0).map(([, t]) => t);
    expect(noisy).toEqual([]);
  });
});

