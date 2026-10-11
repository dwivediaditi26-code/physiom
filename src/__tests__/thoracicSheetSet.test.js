// thoracicSheetSet.test.js -- how the Thoracic phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short
// notes), taken from the Thoracic "everyday words" sheet (PhysioMind-Thoracic-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish
// and Hindi, for all 11 thoracic conditions. Same scoring as the other exams (thoracicSheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (374 sentences)  first exam of the Thoracic matcher as it was:  precision 93.5%, recall 60.4%
//          (337 suggestions, 22 wrong; found 272 of the 450 a physio would tick)
//          main gaps: short notes such as "Worse: rotation / cough / inspiration", "sneezing" (only "sneeze" was known), the Devanagari
//          spellings of "ribs", "on their feet", limits written as a difficulty (sitting, driving, sport, lifting, sleep), "after lifting"
//          read as a lifting problem instead of the way it started, a band round the ribs, "no clear cause" / gradual start, red-flag
//          lines (weight loss, constant pain, night pain, leg signs) and the inflammatory 24-hour pattern
//          after its general fixes and the answer-key corrections listed below:   precision 100%,  recall 100%      -> "seen"
//   Fresh set  (98 sentences)   fair exam, written after those fixes:         precision 92.2%, recall 74.2%
//          (129 suggestions, 10 wrong; found 92 of the 124)
//          main gaps: "low in the thoracic spine", "kamar ke upar peeth", "a jolt of pain around the ribs", lying on one side at night,
//          "a pop while twisting", "shallow breaths", "pasli ke paas peeth", tingling when the arms are overhead, "to the front of the
//          chest" after a long phrase, "worse by the end of the day", "second half of the night", stiffness that eases when they walk,
//          "no relief with rest", "a loss of 6 kg", "nothing eases it", "dawai se bhi nahi ruk raha", "struggles to carry", "gaadi
//          chalane mein", Hindi "कंप्यूटर", "the last rib" / "where the back meets the lumbar spine", "next to the sternum", "muscles on
//          both sides"; wrong: "on the right between the shoulder blades" also ticked the CENTRAL option, "a cough with blood" ticked
//          coughing as something that makes it worse, "the last rib ... lumbar spine" ticked the rib-joint option
//          after its general fixes and 8 answer-key corrections:                 precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Sheet: a sentence may name the middle or the upper back legitimately (MID / UPPER) next to the condition it is about; "in the front
//     of the chest" is the anterior chest wall; lifting, sleeping, NSAID and bending alternatives that a physio could fairly tick are
//     "may"; "gradually worse over the last year" style lines may tick a gradual start, a mechanical or constant pattern, but the form has
//     no question for how long, so none of those is required.
//   - Fresh: "aches after PE and long sitting" (and its Hindi twin) may also tick sustained posture, like the sheet's sitting rows; "stretching
//     the chest and upper back gives relief" may tick the upper back; "morning stiffness ... loosens up as the day goes on" (English and
//     Hinglish) is the inflammatory pattern, plain "morning stiffness" is only "may"; "aches in the afternoon at work" does not say work is
//     limited, so "Work tasks" is only "may"; "all day on the laptop" is the cause of the pain, not a limit, so "Computer work" is only "may";
//     the Hinglish row about "gardan ke aadhar" (base of the neck) is a sentence about the neck, which the matcher deliberately ignores unless it
//     also says something thoracic, so "Reaching overhead" is only "may" there.
// Changed for ALL regions in this step: nothing in the shared engine (phraseEngine.js / phraseSides.js); every change is in thoracicPhraseMap.js.
// No existing expectation changed (thoracicPhraseMap.test.js, the Wild sets and the phrase-map checks pass as they were).
// Known limits kept on purpose: the form has no question for how it started (sudden / gradual) or how long, so those lines only count where
// a sentence also says something the form asks. A sentence about another body part (neck, lumbar spine) with no thoracic word stays silent.
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../thoracicPhraseMap.js";
import { THORACIC_SHEET, scoreSheet } from "./thoracicSheetSet.js";
import { THORACIC_SHEET_FRESH } from "./thoracicSheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", THORACIC_SHEET, 360, 40], ["Fresh", THORACIC_SHEET_FRESH, 90, 6]]) {
  describe(`Thoracic clinician-voice ${name} set`, () => {
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

describe("Thoracic clinician-voice: safety readings", () => {
  const sug = (t) => understandStory(t).suggestions.map((s) => `${s.field}|${s.option}`);
  it("pain 'on the right between the shoulder blades' is the right interscapular option, not the central one", () => {
    const got = sug("Dull ache between the shoulder blades on the right.");
    expect(got).toContain("location|Interscapular — right");
    expect(got).not.toContain("location|Interscapular — central");
  });
  it("'a cough with blood' is a respiratory red flag, not coughing as something that makes it worse", () => {
    const got = sug("Chest pain with breathlessness and a cough with blood.");
    expect(got).toContain("redFlags|Respiratory symptoms — shortness of breath / haemoptysis");
    expect(got).not.toContain("aggMovements|Coughing");
  });
  it("'started after lifting boxes' is the way it started, not something that makes it worse", () => {
    const got = sug("Pain started after lifting boxes at work.");
    expect(got).toContain("mechanismType|Lifting injury");
    expect(got).not.toContain("aggMovements|Lifting");
  });
  it("'no injury, it came on gradually' is a gradual start, not 'no clear mechanism'", () => {
    const got = sug("No injury, it came on gradually over weeks.");
    expect(got).toContain("mechanismType|Insidious — postural / sustained");
    expect(got).not.toContain("mechanismType|No clear mechanism");
  });
  it("'the last rib, where the back meets the lumbar spine' is the thoracolumbar junction, not the rib joint", () => {
    const got = sug("Ache at the level of the last rib, right where the back meets the lumbar spine.");
    expect(got).toContain("location|Thoracolumbar junction T12–L1");
    expect(got).not.toContain("location|Costovertebral — lateral");
  });
  it("wanting to lose weight is not unexplained weight loss, but 'lost 6 kg' with night pain is", () => {
    expect(sug("The patient wants to lose weight and has back pain.")).not.toContain("redFlags|Unexplained weight loss + thoracic pain");
    const got = sug("He lost 6 kg in two months, mid back pain at night.");
    expect(got).toContain("redFlags|Unexplained weight loss + thoracic pain");
    expect(got).toContain("redFlags|Night pain — awakens patient — progressive");
  });
  it("'stop slouching' is advice, not a movement that hurts", () => {
    expect(sug("Needs to stop slouching, the mid back aches.")).not.toContain("aggMovements|Flexion");
  });
  it("'their' reads like 'my'", () => {
    expect(sug("Their mid back hurts when they twist.")).toEqual(sug("My mid back hurts when I twist."));
  });
});
