// shoulderSheetSet.test.js -- how the Shoulder phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short notes),
// taken from the Shoulder "everyday words" sheet (PhysioMind-Shoulder-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish and Hindi,
// for all 10 shoulder conditions. Same scoring as the other exams (shoulderSheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (248 sentences)  first exam of the Shoulder matcher as it was:  precision 95.6%, recall 54.1%
//          (158 suggestions, 7 wrong; found 146 of the 270 a physio would tick)
//          main gaps: "after a fall" / "fell on the stairs" with no body part named, "cannot lift the arm" when the fall is in the
//          previous sentence, "forced / pulled" arm, cricket and "bowls", "across the body", age words ("elderly", "in their fifties"),
//          "pain starts in the neck", "pain at night" with words between, "no single event" / "no clear cause", Hinglish "peeche haath
//          nahi ja pata" and Devanagari "रात को ... दर्द"; "arm kept in a sling" was ticked as a relief
//          after its general fixes and 9 answer-key corrections:                precision 100%,  recall 100%      -> "seen"
//   Fresh set  (91 sentences)   fair exam, written after those fixes:         precision 91.6%, recall 63.2%
//          (83 suggestions, 7 wrong; found 67 of the 106)
//          main gaps: "rolling onto the sore shoulder", "above shoulder height", "60 to 120 degrees", "tackled", "bike crash", seat belt,
//          bench press / weightlifter, "constant" pain, "no recent trauma", "elderly", "cannot sleep ... nights", Hinglish "gend phenkte",
//          "kandhe ke upar" (top of the shoulder) was read as overhead, "koi chot nahi" (no injury) was read as an injury
//          after its general fixes and 7 answer-key corrections:                precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Sheet: a fall onto the shoulder is "Fall onto shoulder", not "Direct blow" (a blow is a hit or tackle); a sling is immobilisation, not
//     "Post-surgical"; the "first dislocation" line does not mention a fall; "cannot raise the arm" at night is not "Overhead reaching";
//     the neck lines are about another body part, so their mechanism is only "may"; "on and off" says the pattern is intermittent; a
//     dislocation may tick the suspected-fracture flag; the bowler line says nothing about a forced pull.
//   - Fresh: "a jerk" with no arm or shoulder named, "lie down" (not "lying on the shoulder"), "arm raised and turned back", "arm above the
//     head" while asleep, "woke with pain" (could be morning) are only "may"; "overhead work" may also be the repetitive-overhead cause;
//     "pain when lifting overhead" may also read as the lifting-overhead cause.
// Changed for ALL regions in this step: a rule may now also require a word from ANYWHERE in the note (the "story" flag, see phraseEngine.js),
// because a clinician writes "Sudden. After a fall. Cannot lift the arm." in separate fragments; a negated word ("no injury", "koi chot
// nahi") never counts. "Constant" is read next to a pain word ("pain is constant"), "nights" like "night", "akda" like "akdan".
// Known limits kept on purpose: "how it started" (sudden / gradual) and "how long" have no question in the Shoulder form, so they only count
// where a sentence also says something the form asks (e.g. "no injury", "after a fall").
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../shoulderPhraseMap.js";
import { SHOULDER_SHEET, scoreSheet } from "./shoulderSheetSet.js";
import { SHOULDER_SHEET_FRESH } from "./shoulderSheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", SHOULDER_SHEET, 240, 30], ["Fresh", SHOULDER_SHEET_FRESH, 90, 6]]) {
  describe(`Shoulder clinician-voice ${name} set`, () => {
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

describe("Shoulder clinician-voice: safety readings", () => {
  const sug = (t) => understandStory(t).suggestions.map((s) => `${s.field}|${s.option}`);
  const CANTLIFT = "redFlags|Cannot lift arm at all after trauma";
  it("'cannot lift the arm' with no fall or injury anywhere is not the after-trauma flag", () => {
    expect(sug("The patient cannot lift the arm.")).not.toContain(CANTLIFT);
  });
  it("a fall in one sentence and 'cannot lift the arm' in the next is the after-trauma flag", () => {
    expect(sug("Fell on the stairs yesterday. Cannot lift the arm.")).toContain(CANTLIFT);
  });
  it("'no injury' (English or Hinglish) does not count as an injury", () => {
    expect(sug("Sudden severe shoulder pain, no injury. Could not lift the arm.")).not.toContain(CANTLIFT);
    expect(sug("Achanak kandhe mein tez dard, koi chot nahi, haath upar nahi utha pa rahe.")).not.toContain(CANTLIFT);
  });
  it("'kandhe ke upar dard' is the top of the shoulder, not overhead reaching", () => {
    expect(sug("Kandhe ke upar dard, haath seene ke saamne se le jane par badhta hai.")).not.toContain("aggravating|Overhead reaching");
  });
  it("an arm kept in a sling is a cause, not a relief", () => {
    expect(sug("It began after the arm was kept in a sling.")).not.toContain("relieving|Supportive positioning");
  });
  it("'gradual improvement' is not a gradual start", () => {
    expect(sug("Gradual improvement with physio.")).not.toContain("mechanism|Insidious / overuse");
    expect(sug("Gradual onset.")).toContain("mechanism|Insidious / overuse");
  });
  it("'fell asleep' and 'fall risk' are not a fall onto the shoulder", () => {
    expect(sug("The patient fell asleep on the sofa after dinner.")).not.toContain("mechanism|Fall onto shoulder / outstretched hand");
    expect(sug("Fall risk assessment done since the clinic visit.")).not.toContain("mechanism|Fall onto shoulder / outstretched hand");
  });
  it("'avoids lifting the arm' is avoiding, not pain with lifting", () => {
    expect(sug("Avoids lifting the arm above the shoulder because it hurts.")).not.toContain("aggravating|Lifting");
  });
  it("'their' reads like 'my'", () => {
    expect(sug("Pain in their shoulder when they reach overhead.")).toEqual(sug("Pain in my shoulder when I reach overhead."));
  });
});
