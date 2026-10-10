// lumbarSISheetSet.test.js -- how the Lumbar / SI phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short
// notes), taken from the Lumbar "everyday words" sheet (PhysioMind-Lumbar-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish and
// Hindi, for all 11 lumbar / SI conditions. Same scoring as the other exams (lumbarSISheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (272 sentences)  first exam of the Lumbar matcher as it was:  precision 78.0%, recall 39.5%
//          (214 suggestions, 47 wrong; found 135 of the 342 a physio would tick)
//          main gaps: "lying on the back with knees up" and other postures with extra words between, "walks slowly", "stands / sits for
//          N minutes", "bending forward to pick up", "twisting", "gradual / no injury", "age of onset", "pain on one side of the back",
//          "SI joint" / Hindi "एसआई", "burning" vs "bulge", "can't lift", "off work N months", Hinglish "dheere dheere", "on and off" was
//          read as "off work"; "no leg symptoms" was not read as the neurological "No"
//          with the answer keys corrected first (see below), before any matcher fix:  precision 83.2%, recall 42.8%
//          after its general fixes:                                                precision 100%,  recall 100%      -> "seen"
//   Fresh set  (90 sentences)   fair exam, written after those fixes:         precision 76.6%, recall 58.7%
//          (107 suggestions, 25 wrong; found 71 of the 121)
//          main gaps: "getting out of bed", "stop every half hour" while driving, "has not worked for N months", "both legs going numb",
//          "sneezing sent a jolt", "year old", Hindi numerals for the age, "a fast bowler", "central low back", "hurts to sit",
//          "sudden sharp when bending", "family history", "peripheral joints"
//          after its general fixes and 30 answer-key corrections:                precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Pain going down the leg is NOT "leg neurological symptoms" by itself (only numbness, tingling or weakness are), and "numbness in
//     both legs" is the neurological answer, not a place the pain travels to; "no numbness or tingling" answers only that question.
//   - "Below the knee" is not "to the knee"; "lower back" alone is not a lumbar level or a buttock part; "coughing or sneezing" is a way
//     the pain STARTED, not a thing that makes it worse in the Aggravating list; "better when sitting" is a relief, not an aggravator.
//   - "Twisting" with no lifting is not the "lifting" mechanisms; a plain "fall" is only "may" for fall from height.
// Changed for ALL regions in this step: a rule may now also require a word from ANYWHERE in the note (the "story" flag, see phraseEngine.js),
// because a clinician writes "Drives to work but has to stop every half hour." or "Sudden. After a fall. Cannot lift." in separate
// fragments; a negated word never counts. The Lumbar form has no question for how it started or how long as such, so those lines only count
// where a sentence also says something a form question covers.
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../lumbarSIPhraseMap.js";
import { LUMBAR_SHEET, scoreSheet } from "./lumbarSISheetSet.js";
import { LUMBAR_SHEET_FRESH } from "./lumbarSISheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", LUMBAR_SHEET, 250, 30], ["Fresh", LUMBAR_SHEET_FRESH, 85, 6]]) {
  describe(`Lumbar clinician-voice ${name} set`, () => {
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

describe("Lumbar clinician-voice: safety readings", () => {
  const sug = (t) => understandStory(t).suggestions.map((s) => `${s.field}|${s.option}`);
  const MINS = "mechanismType|No clear mechanism — insidious onset";
  const NBIL = "neuroPresent|Yes — bilateral (cauda equina / stenosis flag)";
  const NNO = "neuroPresent|No leg neurological symptoms";
  it("'gradual improvement' is not a gradual start, but 'Gradual.' written alone is", () => {
    expect(sug("Gradual improvement with physio.")).not.toContain(MINS);
    expect(sug("Gradual.")).toContain(MINS);
  });
  it("'without both legs going numb' is bilateral numbness, not 'no leg symptoms'", () => {
    const got = sug("Cannot stand for long in the kitchen without both legs going numb.");
    expect(got).toContain(NBIL);
    expect(got).not.toContain(NNO);
  });
  it("'no numbness in the legs' is still 'no leg neurological symptoms'", () => {
    expect(sug("No numbness or tingling in the legs.")).toContain(NNO);
  });
  it("'knees up' (crook lying) is not a peripheral-joint problem", () => {
    const got = sug("When they lie on the back with the knees up the pain settles, and sitting also helps.");
    expect(got).not.toContain("redFlagsInflammatory|Peripheral joint involvement");
    expect(got).toContain("relPostures|Lying with knees bent (crook lying)");
  });
  it("'drives' and 'stops every half hour' in separate fragments is a driving limit; driving alone is not", () => {
    expect(sug("Drives to work but has to stop every half hour.")).toContain("adlRestrictions|Driving");
    expect(sug("Drives to work every day.")).not.toContain("adlRestrictions|Driving");
  });
  it("'has not worked for eight months' is long-term time off work; 'not worked since Monday' is not", () => {
    expect(sug("Has not worked for the last eight months.").some((x) => x.startsWith("workImpact|Off work — long term"))).toBe(true);
    expect(sug("Has not worked since Monday.").some((x) => x.startsWith("workImpact|Off work — long term"))).toBe(false);
  });
  it("'on and off' is an on-and-off pattern, not 'off work'", () => {
    expect(sug("The pain comes on and off.").some((x) => x.startsWith("workImpact"))).toBe(false);
  });
  it("'their' reads like 'my'", () => {
    expect(sug("Pain in their lower back when they bend forward.")).toEqual(sug("Pain in my lower back when I bend forward."));
  });
});
