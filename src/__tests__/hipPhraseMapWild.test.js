// hipPhraseMapWild.test.js -- how the DRAFT Hip phrase matcher copes with messy, real-life typing, as opposed
// to the neat phrases it was drafted from. Same scoring as the Elbow, Shoulder and Knee exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (90 sentences)  first exam of the first draft:        precision 95.6%, recall 88.8%
//          after its general fixes:                                 precision 100%,  recall 98.0%      -> "seen"
//          (two answer keys were also corrected: a sentence naming the front of the hip should tick that place too)
//   Set B  (81 sentences)  fair exam, written after A's fixes:   precision 92.6%, recall 70.0%
//          (68 suggestions, 5 wrong; found 63 of the 90 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 98.9%      -> "seen"
//   Set C  (64 sentences)  second fair exam, after B's fixes:    precision 95.7%, recall 77.6%
//          (47 suggestions, 2 wrong; found 45 of the 58)
//          after its general fixes:                                 precision 100%,  recall 98.3%      -> "seen"
// So the honest estimate for typing the matcher has never seen is about 9 in 10 to 19 in 20 suggestions right and
// about 7 to 8 in 10 of the right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../hipPhraseMap.js";
import { HIP_A, HIP_B, HIP_C, score } from "./hipWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", HIP_A, 85, 8], ["B", HIP_B, 75, 8], ["C", HIP_C, 60, 8]]) {
  describe(`Hip Set ${name}`, () => {
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
