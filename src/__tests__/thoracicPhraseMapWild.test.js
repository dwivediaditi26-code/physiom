// thoracicPhraseMapWild.test.js -- how the DRAFT Thoracic phrase matcher copes with messy, real-life typing, as opposed
// to the neat phrases it was drafted from. Same scoring as the other regions' exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (112 sentences)  first exam of the first draft:       precision 91.2%, recall 88.6%
//          (102 suggestions, 9 wrong; found 93 of the 105 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set B  (114 sentences)  fair exam, written after A's fixes:   precision 86.5%, recall 68.8%
//          (89 suggestions, 12 wrong; found 77 of the 112)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set C  (102 sentences)  second fair exam, after B's fixes:    precision 85.1%, recall 61.2%
//          (74 suggestions, 11 wrong; found 63 of the 103)
//          after its general fixes:                                 precision 100%,  recall 99.1%     -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - pain that is provoked by breathing also ticks the 24-hour pattern "Breathing-related" (Sets A and B);
//   - Set B: "kinesiotape on the upper back helped" also names the upper back as the place; "pichle hafte accident hua tha"
//     says an accident, not necessarily a road one, so only "Recent trauma";
//   - Set C: "left side of the rib cage towards the back" is the side of the chest wall (the "towards the back" is vague);
//     "burning pain going round the left side of the chest" also names the side of the chest; "pressure in the chest and pain
//     in the left arm" ticks both the chest-tightness and the left-arm answers; "she had a heart attack last year" is the
//     patient's own cardiac history (the speaker is describing the patient); one sentence had no pain word and got "hurts".
// So the honest estimate for typing the matcher has never seen is about 6 in 7 suggestions right and about 6 to 7 in 10 of
// the right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../thoracicPhraseMap.js";
import { THORACIC_A, THORACIC_B, THORACIC_C, score } from "./thoracicWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", THORACIC_A, 100, 10], ["B", THORACIC_B, 100, 10], ["C", THORACIC_C, 95, 8]]) {
  describe(`Thoracic Set ${name}`, () => {
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
