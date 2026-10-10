// kneeSheetSet.test.js -- how the Knee phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short notes), taken
// from the Knee "everyday words" sheet (PhysioMind-Knee-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish and Hindi, for all 9
// knee conditions. Same scoring as the other exams (kneeSheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (216 sentences)  first exam of the Knee matcher as it was:  precision 77.3%, recall 51.8%
//          (128 suggestions, 29 wrong; found 86 of the 166 a physio would tick)
//          main gaps: no wording for "the patient ... / they ..." (twisted, gave way, hit, tackled, overload, wear and tear ...), a blow's
//          direction ("hit on the outside of the knee") was read as the place of the pain, "foot stuck" was read as a locked knee
//          after its general fixes and 8 answer-key corrections:               precision 100%,  recall 100%      -> "seen"
//   Fresh set  (116 sentences)  fair exam, written after those fixes:       precision 94.0%, recall 85.5%
//          (134 suggestions, 8 wrong; found 118 of the 138)
//          after its general fixes and 1 answer-key correction:                precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Sheet: "cannot straighten" also ticks the "Locked knee" red flag; "Catching or locking. Cannot fully straighten." is two sentences
//     the matcher reads one at a time, so it is no longer a must; "at the time of the fall or accident" may tick Direct blow; "landed on
//     the front of the knee" may tick the front of the knee; "around or under the kneecap" may also tick below the kneecap; "Gradual,
//     usually over 50" alone does not prove an insidious onset; "eases as they warm up" is fair to tick "Improves through the day".
//     "keeps giving way", "still gives way" and "gave way" do not say whether there is a trigger, so they no longer MUST tick "unpredictable /
//     no clear trigger" -- the same documented choice as in kneePhraseMap.test.js ("a plain 'the knee gives way' is not guessed").
//   - Fresh: "gave way during a cutting move" is giving way WITH pivoting, not "unpredictable".
// Known limits kept on purpose: "how it started" (sudden / gradual) and "how long" have no question in the Knee form, so they only count
// where a sentence also says something the form asks (e.g. "no injury", "morning stiffness"); a "but" still splits a sentence in two.
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../kneePhraseMap.js";
import { KNEE_SHEET, scoreSheet } from "./kneeSheetSet.js";
import { KNEE_SHEET_FRESH } from "./kneeSheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", KNEE_SHEET, 200, 25], ["Fresh", KNEE_SHEET_FRESH, 110, 6]]) {
  describe(`Knee clinician-voice ${name} set`, () => {
    it(`has ${minSentences}+ sentences across English, Hinglish and Hindi, including ${minSilent}+ that must stay silent`, () => {
      expect(rows.length).toBeGreaterThanOrEqual(minSentences);
      for (const l of ["en", "hi", "de"]) expect(rows.filter((r) => r[0] === l).length).toBeGreaterThanOrEqual(8);
      expect(rows.filter((r) => r[2].length === 0 && r[3].length === 0).length).toBeGreaterThanOrEqual(minSilent);
    });
    it("precision stays at or above the recorded floor", () => {
      const s = scoreSheet(rows);
      expect(s.precision, `wrong:\n${s.wrong.join("\n")}`).toBeGreaterThanOrEqual(MIN_PRECISION);
    });
    it("recall stays at or above the recorded floor", () => {
      const s = scoreSheet(rows);
      expect(s.recall, `missed:\n${s.missed.join("\n")}`).toBeGreaterThanOrEqual(MIN_RECALL);
    });
    it("every sentence that must stay silent stays silent", () => {
      const noisy = rows.filter((r) => r[2].length === 0 && r[3].length === 0).filter(([, t]) => understandStory(t).suggestions.length > 0).map(([, t]) => t);
      expect(noisy).toEqual([]);
    });
  });
}

describe("Knee clinician-voice: the direction of a blow is not the place of the pain", () => {
  const places = (t) => understandStory(t).suggestions.filter((s) => s.field === "location").map((s) => s.option);
  it("a blow to the outside does not tick the outer knee", () => {
    expect(places("They were hit on the outside of the knee and the inside is sore.")).toEqual(["Medial joint line"]);
    expect(places("Pain on the inner side of the knee after a knock from the outside.")).toEqual(["Medial joint line"]);
  });
  it("pain on the outer side still ticks the outer knee, even after a blow to the inside", () => {
    expect(places("A knock on the inside of the knee, now pain on the outer side of the knee.")).toEqual(["Lateral joint line"]);
  });
  it("plain pain locations are unchanged", () => {
    expect(places("Pain on the outer side of the knee.")).toEqual(["Lateral joint line"]);
    expect(places("Inner knee pain when walking.")).toEqual(["Medial joint line"]);
  });
});
