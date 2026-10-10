// lumbarSIPhraseMapWild.test.js -- how the DRAFT Lumbar/SI phrase matcher copes with messy, real-life typing, as opposed
// to the neat phrases it was drafted from. Same scoring as the other regions' exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (147 sentences)  first exam of the first draft:       precision 84.1%, recall 88.4%
//          (145 suggestions, 23 wrong; found 122 of the 138 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 99.3%     -> "seen"
//   Set B  (160 sentences)  fair exam, written after A's fixes:   precision 90.2%, recall 71.9%
//          (133 suggestions, 13 wrong; found 120 of the 167)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set C  (170 sentences)  second fair exam, after B's fixes:    precision 92.1%, recall 77.6%
//          (139 suggestions, 11 wrong; found 128 of the 165)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Set A: tailbone pain when sitting also ticks "Sitting"; tingling in the toes of one foot also ticks "leg neurological
//     symptoms (that side)"; both legs weak also ticks "bilateral leg symptoms"; "gradual over months" also ticks the
//     inflammatory "Insidious onset"; a fall from a height is a "Fall from height"; morning stiffness also ticks "Morning
//     dominant"; "my mother has psoriasis" is the family-history answer; "worse at rest, better when I move" also ticks the
//     inflammatory "Worse with rest"; "kamar ke beech" can mean mid-lumbar or the centre of the back, so both are accepted.
//   - Set B: numb top of foot and big toe ticks both the foot and toes answers; pain across the lower back also ticks
//     "Bilateral / band"; "pain wakes me in the early hours" also ticks "Night dominant"; "constant severe pain regardless of
//     position" also ticks "Constant"; "pet me dard" is a plausible "abdominal pain accompanying"; a coccyx fall onto ice does not
//     say the person landed on the back.
//   - Set C: "an ache in the lower back and left buttock" says neither which part of the buttock nor a lumbar level, so only the
//     mechanism is keyed; a tailbone landing also names the coccyx; "bed rest makes it worse" / "worse when I lie still" are
//     "worse at rest" (and the inflammatory item); "sitting for long hours in the car" also ticks "Sitting >1 hour"; "leaning over the
//     counter for a long time" has no pain word, so nothing is expected; "crept on over several months" ticks both onset answers.
// Known miss kept on purpose: "I tripped on the kerb but did not fall" -- the matcher reads each side of a "but" separately.
// So the honest estimate for typing the matcher has never seen is about 9 in 10 suggestions right and about 7 to 8 in 10 of the
// right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../lumbarSIPhraseMap.js";
import { LUMBAR_SI_A, LUMBAR_SI_B, LUMBAR_SI_C, score } from "./lumbarSIWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", LUMBAR_SI_A, 140, 10], ["B", LUMBAR_SI_B, 150, 10], ["C", LUMBAR_SI_C, 160, 8]]) {
  describe(`Lumbar/SI Set ${name}`, () => {
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
