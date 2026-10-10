// cervicalSheetSet.test.js -- how the Cervical phrase matcher copes with the CLINICIAN's way of writing ("the patient", "they", short
// notes), taken from the Cervical "everyday words" sheet (PhysioMind-Cervical-Everyday-Words-DRAFT.pdf): English in four styles, Hinglish
// and Hindi, for all 11 cervical conditions. Same scoring as the other exams (cervicalSheetSet.js explains the answer keys):
//   precision = of everything it suggested, how much was fair     (a wrong suggestion misleads)
//   recall    = of everything a physio would tick, how much it found (a miss just means "tap it yourself" / use AI)
//
// HISTORY (honest numbers; a set is only a fair exam the first time it is run):
//   Sheet set  (350 sentences)  first exam of the Cervical matcher as it was:  precision 87.7%, recall 63.9%
//          (398 suggestions, 49 wrong; found 301 of the 471 a physio would tick)
//          main gaps: computer / screen use, sleeping position ("slept awkwardly"), "looking up" / "turning right" when a word like "better"
//          or "eases" sits later in the same sentence, the side of an arm confused with the side the head turned or tilted to ("turning
//          right ... arm pain"), "L arm" / "R arm", "base of the skull" / "behind the head", Hindi words (the joined "सिरदर्द", "झुनझुनी",
//          "अकड़न", nukta letters), headache as the main complaint, "fallen twice", "pen / buttons", bladder, "worst headache of their life",
//          ladder / headfirst falls, "wobbly" read as an unstable head, "ear" and "shoulder" read as places the pain spreads to when they
//          were the direction of a head tilt, "right after" read as the right side
//          after its general fixes and 14 answer-key corrections:                precision 100%,  recall 100%      -> "seen"
//   Fresh set  (93 sentences)   fair exam, written after those fixes:         precision 89.7%, recall 71.2%
//          (117 suggestions, 12 wrong; found 84 of the 118)
//          main gaps: "end of the working day", "loosens up with a walk", "peeche jhukne" (bending back), "side impact" / "rear shunt",
//          "carrying a heavy can", "hold a pen", "stinger / burner", "contact games", night-time tingling, "full day at the desk",
//          pillows, motorbike falls, "the dive", "pins and needles from the moment of the injury", "sudden worst headache", "previous
//          fusion", "drop attack", "blind spot", "struggles to look up at shelves", "going out with friends" (friends = someone else)
//          after its general fixes and 7 answer-key corrections:                 precision 100%,  recall 100%      -> "seen"
// Answer keys corrected after a first run, and why (each is a clinical call for Aditi to confirm):
//   - Sheet: "looking up and turning to the right" is the quadrant movement (extension + right rotation), so plain "rotation right" is only
//     "may"; when only the turning side is named, the side of the arm is not known, so the arm answers are only "may".
//   - Sheet: "woke with a stiff neck" is a way it started, not yet a morning pattern ("Morning dominant" only "may"); "the accident was ten
//     days ago" may tick recent trauma; "creeping on for two years" is a gradual start; a headache brought on by neck movement may be
//     "secondary to the neck"; "long spells at the screen / sitting" may be sustained poor posture; "walking has gone off" and "getting worse
//     every week" are not clearly a gait disturbance or a rapidly progressive loss; "three times this season, always after a tackle" is only
//     "may" for a clear trigger; "computer work" may also tick work duties.
//   - Fresh: "locked on the left side after a sudden turn" does not name the neck, so the lateral-neck and rotation answers are only "may";
//     left-hand burning during sport may tick the hand and sport answers; "numbness in both hands at night" may tick the bilateral-hand
//     myelopathy answer; "dizzy, double vision, drop attack" does not tie the dizziness to neck movement.
// Changed for ALL regions in this step: "L" / "R" are read as left / right ("L arm", "R shoulder"); "with friends" or "with colleagues" is the
// patient's own social life, not a complaint about someone else; a rule may name the word that must NOT come right after it (blockNext, see
// phraseEngine.js). In Cervical a comma followed by "better ..." / "... eases it" now starts a new statement, so "worse looking up, better
// with the hand on the head" keeps "looking up" as the thing that makes it worse.
// One existing expectation changed: "cannot turn to check my blind spot" now ticks BOTH "Driving" and "Looking over shoulder" (cervicalPhraseMap.test.js, EN-22).
// Known limits kept on purpose: the form has no question for how it started (sudden / gradual) or how long, so those lines only count where
// a sentence also says something the form asks (e.g. "after a road accident"). "Tilting the head to the right (away from the left arm)"
// ticks only the side bend, not the left arm (the word "away" makes the rule stay silent).
// The floors below only guard against the matcher getting worse.
import { describe, it, expect } from "vitest";
import { understandStory } from "../cervicalPhraseMap.js";
import { CERVICAL_SHEET, scoreSheet } from "./cervicalSheetSet.js";
import { CERVICAL_SHEET_FRESH } from "./cervicalSheetSetFresh.js";

const MIN_PRECISION = 0.95;
const MIN_RECALL = 0.9;

for (const [name, rows, minSentences, minSilent] of [["Sheet", CERVICAL_SHEET, 340, 40], ["Fresh", CERVICAL_SHEET_FRESH, 90, 6]]) {
  describe(`Cervical clinician-voice ${name} set`, () => {
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

describe("Cervical clinician-voice: safety readings", () => {
  const sug = (t) => understandStory(t).suggestions.map((s) => `${s.field}|${s.option}`);
  const AR = "armPresent|Yes — unilateral (R)", AL = "armPresent|Yes — unilateral (L)";
  it("the side the head turns to is not the side of the arm", () => {
    expect(sug("Looking up and turning to the right sends the pain down the arm.")).not.toContain(AR);
  });
  it("'right after the hit' is not the right side", () => {
    const got = sug("Right after the hit the left upper arm went numb for a few minutes.");
    expect(got).toContain(AL);
    expect(got).not.toContain(AR);
  });
  it("a worse-with movement followed by a relief in the same sentence keeps the movement", () => {
    expect(sug("The patient has neck pain, worse on looking up and turning the head to the right, better when they rest the hand on top of the head.")).toContain("aggMovements|Extension — looking up");
  });
  it("a relief is not read as a thing that makes it worse", () => {
    expect(sug("Neck pain is better when looking up.")).not.toContain("aggMovements|Extension — looking up");
  });
  it("'the headache is the main problem' is the primary headache, not 'secondary to the neck'", () => {
    const got = sug("The headache is the main problem, the neck pain is minor.");
    expect(got).toContain("haPresent|Yes — primary complaint");
    expect(got).not.toContain("haPresent|Yes — secondary to neck pain");
  });
  it("'no difference to the hand symptoms' does not say there are no hand symptoms", () => {
    expect(sug("Neck movements make no difference to the hand symptoms.")).not.toContain("armPresent|No arm or hand symptoms");
  });
  it("'fell down two steps' is not 'unexplained falls', but 'fallen twice' is", () => {
    expect(sug("Older patient, fell backwards down two steps and hit the head.")).not.toContain("redFlagsMyelopathy|Unexplained falls");
    expect(sug("The patient has fallen twice, legs stiff.")).toContain("redFlagsMyelopathy|Unexplained falls");
  });
  it("'night-time numbness' is not a neurological symptom at the time of an injury", () => {
    expect(sug("Night-time numbness in both hands.")).not.toContain("fractureScreen|Neurological symptoms from time of injury");
  });
  it("'the arm pain began that night' is not a night-time pattern", () => {
    expect(sug("They lifted a heavy suitcase and the arm pain began that night.")).not.toContain("overallPattern|Night dominant");
  });
  it("a head tilt towards the shoulder or the ear is not a place the pain spreads to", () => {
    const got = sug("Dropping the left ear towards the left shoulder pulls on the muscle.");
    expect(got).not.toContain("radiation|Ear / periauricular");
    expect(got).not.toContain("radiation|Shoulder / upper arm (L)");
  });
  it("'wobbly on their feet' is walking, not an unstable head", () => {
    expect(sug("They are wobbly on their feet, the legs feel stiff.")).not.toContain("redFlagsInstability|Sense of head not stable on neck");
  });
  it("'L arm' and 'R arm' are read as left and right", () => {
    expect(sug("Burner L arm to fingers.")).toContain(AL);
    expect(sug("R arm pain with tingling in the fingers.")).toContain(AR);
  });
  it("going out 'with friends' is the patient's own social life", () => {
    expect(sug("Avoids going out with friends.")).toContain("fnAdl|Social activities");
  });
  it("'their' reads like 'my'", () => {
    expect(sug("Pain in their neck when they look up.")).toEqual(sug("Pain in my neck when I look up."));
  });
});
