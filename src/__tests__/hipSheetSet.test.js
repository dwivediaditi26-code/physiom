// hipSheetSet.test.js -- how the Hip phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short notes), taken
// from the Hip "everyday words" sheet (PhysioMind-Hip-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish and Hindi, for all 7 hip
// conditions. Same scoring as the other exams (hipSheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (176 sentences)  first exam of the Hip matcher as it was:   precision 97.9%, recall 76.0%
//          (144 suggestions, 3 wrong; found 92 of the 121 a physio would tick)
//          main gaps: "click or catch" / "roll onto the sore side" / "get out of a car" / "stairs" far from "worse", Hinglish "badhta",
//          "after a twist", "no real injury", wear-and-tear wording, Devanagari "जांघ के जोड़" and "बैठने की हड्डी"; a relative's hip
//          replacement was ticked as the patient's
//          after its general fixes and 3 answer-key corrections:               precision 100%,  recall 100%      -> "seen"
//   Fresh set  (92 sentences)   fair exam, written after those fixes:       precision 97.0%, recall 94.9%
//          (135 suggestions, 4 wrong; found 112 of the 118)
//          main gaps: "for long periods" was read as menstrual periods, "ghisaav" (wear) as grinding, "चलाने" (driving) as walking,
//          "click ... dard ke bina" as a painful click; "giving way" (the -ing form), "रात को ... दर्द", "wakes them when they roll over"
//          after its general fixes (no key changes):                           precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Sheet: "the outer hip got sore" also ticks the outer hip; a one-word fragment such as "Stairs." cannot be tied to a pain, so it is
//     not required; "worse with sitting" alone does not say prolonged sitting.
// Also changed for ALL regions in this step: "their", "his" and "her" are read like "my" (a clinician writes "their groin", not "my groin").
// Known limits kept on purpose: "how it started" (sudden / gradual) and "how long" have no question in the Hip form, so they only count
// where a sentence also says something the form asks (e.g. "no injury", "after a fall"); a "but" still splits a sentence in two.
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../hipPhraseMap.js";
import { HIP_SHEET, scoreSheet } from "./hipSheetSet.js";
import { HIP_SHEET_FRESH } from "./hipSheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", HIP_SHEET, 170, 30], ["Fresh", HIP_SHEET_FRESH, 90, 6]]) {
  describe(`Hip clinician-voice ${name} set`, () => {
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

describe("Hip clinician-voice: safety readings", () => {
  const sug = (t) => understandStory(t).suggestions.map((s) => `${s.field}|${s.option}`);
  it("'for long periods' is sitting, not menstrual periods", () => {
    expect(sug("Deep hip pain when they sit for long periods.").join("|")).not.toMatch(/Gynaecological/);
  });
  it("a relative's hip replacement is not the patient's", () => {
    expect(sug("Her mother had a hip replacement last year.")).toEqual([]);
  });
  it("a click with 'no pain' is painless, not painful", () => {
    const s = sug("Kulhe mein click ki awaaz, dard ke bina.").join("|");
    expect(s).not.toMatch(/Clicking — with pain/);
  });
  it("'their' reads like 'my'", () => {
    expect(sug("Pain in their groin when they sit for long.")).toEqual(sug("Pain in my groin when I sit for long."));
  });
});
