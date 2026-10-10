// cervicalPhraseMapWild.test.js -- how the DRAFT Cervical phrase matcher copes with messy, real-life typing, as opposed
// to the neat phrases it was drafted from. Same scoring as the other regions' exams:
//   precision = of everything it suggested, how much was right     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "type it again / use AI")
// The answer keys are drafts written by Claude, for Aditi to check.
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Set A  (122 sentences)  first exam of the first draft:       precision 92.5%, recall 89.5%
//          (120 suggestions, 9 wrong; found 111 of the 124 a physio would tick)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
//   Set B  (136 sentences)  fair exam, written after A's fixes:   precision 82.3%, recall 80.0%
//          (141 suggestions, 25 wrong; found 116 of the 145)
//          after its general fixes:                                 precision 100%,  recall 99.4%     -> "seen"
//   Set C  (137 sentences)  second fair exam, after B's fixes:    precision 88.8%, recall 77.1%
//          (125 suggestions, 14 wrong; found 111 of the 144)
//          after its general fixes:                                 precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Set A: an electric shock down the spine on bending the neck forward ticks both Lhermitte's sign questions (the form asks
//     twice) but the movement itself is not ticked as an aggravating movement; "unsteady and falling" does not say the falls were
//     unexplained.
//   - Set B: a head injury also ticks "Direct trauma"; something heavy falling on the head also ticks "Axial loading"; "both hands
//     numb and clumsy" also ticks both arms; a headache that starts at the base of the skull also names that place; a constant
//     ache at the base of the skull also ticks "Constant" and that place; reading that hurts ticks both "looking down" and
//     "Reading"; a thoracic sentence typed into the neck form still offers "between the shoulder blades"; "desk at the end of the
//     day" was dropped as an inference.
//   - Set C: "pain on the left side of the neck when I turn" does not say which way the head turned; a hit on the back of the neck
//     also names that place; a dive with a bang on the head ticks "Diving", "Direct trauma" and "High-energy trauma"; "always
//     present with some days worse" is "Constant - varies"; "only when I do overhead work" is "Activity-related".
// Known miss kept on purpose: "it is there all the time but some hours are worse" -- the matcher reads each side of a "but"
// separately, so it cannot join the two halves.
// So the honest estimate for typing the matcher has never seen is about 5 in 6 to 9 in 10 suggestions right and about 3 in 4 to 4 in 5
// of the right answers found; the rest is left for the student to tick by hand (or use AI).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../cervicalPhraseMap.js";
import { CERVICAL_A, CERVICAL_B, CERVICAL_C, score } from "./cervicalWildSets.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["A", CERVICAL_A, 110, 10], ["B", CERVICAL_B, 120, 10], ["C", CERVICAL_C, 120, 8]]) {
  describe(`Cervical Set ${name}`, () => {
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
