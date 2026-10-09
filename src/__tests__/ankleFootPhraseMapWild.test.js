// ankleFootPhraseMapWild.test.js -- how the DRAFT Ankle/Foot phrase matcher copes with messy, real-life typing, as
// opposed to the neat phrases it was drafted from. Same scoring as the other regions' exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (94 sentences)  first exam of the first draft:        precision 92.2%, recall 94.9%
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//          (one answer key was also corrected: a sentence naming the back of the ankle ticks that place too)
//   Set B  (86 sentences)  fair exam, written after A's fixes:   precision 89.3%, recall 56.8%
//          (56 suggestions, 6 wrong; found 50 of the 88 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 98.9%      -> "seen"
//   Set C  (75 sentences)  second fair exam, after B's fixes:    precision 86.8%, recall 58.2%
//          (53 suggestions, 7 wrong; found 46 of the 79)
//          after its general fixes:                                 precision 100%,  recall 98.8%      -> "seen"
//          (two answer keys were also corrected: "kicked on the shin" ticks the shin as the place;
//           swelling after a walk or run also ticks walking/running)
// So the honest estimate for typing the matcher has never seen is about 9 in 10 suggestions right and about
// 6 in 10 of the right answers found -- the weakest region, because foot and ankle answers are wordy.
// The rest is left for the student to tick by hand (or use AI). The floors below only guard against getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../ankleFootPhraseMap.js";
import { ANKLE_FOOT_A, ANKLE_FOOT_B, ANKLE_FOOT_C, score } from "./ankleFootWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", ANKLE_FOOT_A, 85, 6], ["B", ANKLE_FOOT_B, 80, 8], ["C", ANKLE_FOOT_C, 70, 8]]) {
  describe(`Ankle/Foot Set ${name}`, () => {
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
