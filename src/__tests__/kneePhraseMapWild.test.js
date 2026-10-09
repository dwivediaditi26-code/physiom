// kneePhraseMapWild.test.js -- how the DRAFT Knee phrase matcher copes with messy, real-life typing, as opposed
// to the neat phrases it was drafted from. Same scoring as the Elbow and Shoulder exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (83 sentences)  first exam of the first draft:        precision 97.1%, recall 90.5%
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set B  (77 sentences)  fair exam, written after A's fixes:   precision 90.9%, recall 60.6%
//          (44 suggestions, 4 wrong; found 40 of the 66 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set C  (70 sentences)  second fair exam, after B's fixes:    precision 95.2%, recall 67.8%
//          (42 suggestions, 2 wrong; found 40 of the 59)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
// So the honest estimate for typing the matcher has never seen is about 9 in 10 to 19 in 20 suggestions right and
// about 6 to 7 in 10 of the right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../kneePhraseMap.js";
import { KNEE_A, KNEE_B, KNEE_C, score } from "./kneeWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", KNEE_A, 80, 10], ["B", KNEE_B, 75, 10], ["C", KNEE_C, 65, 8]]) {
  describe(`Knee Set ${name}`, () => {
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
