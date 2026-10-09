// shoulderPhraseMapWild.test.js -- how the DRAFT Shoulder phrase matcher copes with messy, real-life typing, as
// opposed to the neat phrases it was drafted from. Same scoring as the Elbow exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (88 sentences)  first exam of the first draft:      precision 97.3%, recall 88.9%
//          after its general fixes:                               precision 100%,  recall 98.8%      -> "seen"
//   Set B  (97 sentences)  fair exam, written after A's fixes: precision 91.8%, recall 71.8%
//          (61 suggestions, 5 wrong; found 56 of the 78 a physio would tick)
//          after its general fixes:                               precision 100%,  recall 100%       -> "seen"
//   Set C  (81 sentences)  second fair exam, after B's fixes:   precision 91.8%, recall 69.2%
//          (49 suggestions, 4 wrong; found 45 of the 65)
//          after its general fixes:                               precision 100%,  recall 95.4%      -> "seen"
// So the honest estimate for typing the matcher has never seen is about 9 in 10 suggestions right and
// about 7 in 10 of the right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../shoulderPhraseMap.js";
import { SHOULDER_A, SHOULDER_B, SHOULDER_C, score } from "./shoulderWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", SHOULDER_A, 80, 15], ["B", SHOULDER_B, 90, 15], ["C", SHOULDER_C, 75, 15]]) {
  describe(`Shoulder Set ${name}`, () => {
    it(`has ${minSentences}+ sentences across English, Hinglish and Hindi, including ${minSilent}+ that must stay silent`, () => {
      expect(rows.length).toBeGreaterThanOrEqual(minSentences);
      for (const l of ["en", "hi", "de"]) expect(rows.filter((r) => r[0] === l).length).toBeGreaterThanOrEqual(8);
      expect(rows.filter((r) => r[2].length === 0).length).toBeGreaterThanOrEqual(minSilent);
    });
    it("precision stays at or above the recorded floor", () => {
      const s = score(rows);
      expect(s.precision, `wrong:\n${s.wrong.join("\n")}`).toBeGreaterThanOrEqual(MIN_PRECISION);
    });
    it("recall stays at or above the recorded floor", () => {
      const s = score(rows);
      expect(s.recall, `missed:\n${s.missed.join("\n")}`).toBeGreaterThanOrEqual(MIN_RECALL);
    });
    it("every sentence that must stay silent stays silent", () => {
      const noisy = rows.filter((r) => r[2].length === 0).filter(([, t]) => understandStory(t).suggestions.length > 0).map(([, t]) => t);
      expect(noisy).toEqual([]);
    });
  });
}
