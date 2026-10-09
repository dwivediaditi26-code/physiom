// hipPhraseMap.test.js -- hand-written cases for the DRAFT Hip everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in hipPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, negation, the two single-choice
// questions (dominant place, 24-hour pattern), safety around red flags, typing straight into one question's box, and the
// known limitations, written down on purpose so they are visible, not hidden.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../hipPhraseMap.js";
import { KEYS as K } from "./hipWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

const STORY = [
  ["EN-01 FAI story", "Pinching pain in the groin when I squat deep or bring my knee to my chest", [K.GROIN, K.FADIR]],
  ["EN-02 piriformis-type story", "Deep buttock pain after sitting for hours at my desk job", [K.POST, K.PSIT]],
  ["EN-03 trochanteric", "Pain on the side of the hip, I cannot lie on that side", [K.LATERAL, K.LYING]],
  ["EN-04 sit bone", "Pain at the sit bone when I sit on hard chairs", [K.ISCH, K.HARD]],
  ["EN-05 adductor", "Inner thigh pain, pulled it lunging for a shuttle", [K.ADD, K.LUNGE]],
  ["EN-06 pubic", "Pain at the pubic bone after delivery", [K.PUBIC, K.POSTPARTUM]],
  ["EN-07 SIJ", "SI joint pain, worse on stairs", [K.SIJ, K.STAIRS]],
  ["EN-08 FABER", "Pain in the figure of four position", [K.FABER]],
  ["EN-09 cross-legged", "I cannot sit cross legged on the floor", [K.CROSS]],
  ["EN-10 car", "Hurts getting out of the car", [K.CAR]],
  ["EN-11 snapping front", "A snap at the front of the hip when I lift my leg", [K.INTSNAP, K.FLEXOR]],
  ["EN-12 snapping outer", "Snapping on the outside of the hip when I walk", [K.EXTSNAP, K.LATERAL]],
  ["EN-13 painless click", "The hip clicks without pain", [K.CLICKOK]],
  ["EN-14 painful click", "Painful clicking when I swing my leg", [K.CLICKPAIN]],
  ["EN-15 catching", "My hip catches sometimes", [K.CATCH]],
  ["EN-16 giving way", "The hip gives way", [K.GIVEWAY]],
  ["EN-17 locking", "My hip locks up", [K.LOCK]],
  ["EN-18 grinding", "A grinding feeling in the hip", [K.CREP]],
  ["EN-19 no mechanical", "No clicking, no locking, no catching", [K.MNONE]],
  ["EN-20 NOF", "Suspected hip fracture after a fall, the leg looks shortened and turned outwards", [K.NOF, K.FALL]],
  ["EN-21 cannot weight bear", "Fell and cannot stand on the leg", [K.FALL, K.FRACW]],
  ["EN-22 septic", "Hot swollen hip with fever", [K.HOTHIP]],
  ["EN-23 AVN risk", "On steroid tablets for years", [K.AVN]],
  ["EN-24 abdomen", "Hip pain with lower abdominal pain", [K.ABDO]],
  ["EN-25 gynae", "Hip pain gets worse during periods", [K.GYNAE]],
  ["EN-26 testicular", "Pain in the testicle and the groin", [K.TESTIC, K.GROIN]],
  ["EN-27 cancer", "History of prostate cancer", [K.CANCER]],
  ["EN-28 THR", "Total hip replacement in 2019", [K.THR]],
  ["EN-29 return to sport", "Back to football after a long break", [K.RETURN]],
  ["EN-30 sprint", "Pain after sprinting", [K.FAST]],
  ["EN-31 pattern night", "Pain wakes me at night", [K.NIGHT]],
  ["EN-32 pattern morning", "Stiff in the morning", [K.MORN]],
  ["EN-33 pattern evening", "Worse towards the evening", [K.WORSE]],
  ["EN-34 pattern constant", "Constant pain", [K.CONST]],
  ["EN-35 pattern improves", "Improves as the day goes on", [K.IMPR]],
  ["EN-36 dominant groin", "Mostly in the groin", [K.DGROIN, K.GROIN]],
  ["EN-37 diffuse", "Pain all around the hip", [K.DDIFF]],
  // Hinglish
  ["HI-01", "jaangh ke jod me dard hai", [K.GROIN]],
  ["HI-02", "kulhe ke bahar ki taraf dard hai", [K.LATERAL]],
  ["HI-03", "chutad me gehra dard hai", [K.POST]],
  ["HI-04", "gir gaya tha aur pair par bhaar nahi daal pa raha", [K.FALL, K.FRACW]],
  ["HI-05", "delivery ke baad se dard hai", [K.POSTPARTUM]],
  ["HI-06", "kulha badalwane ke baad dard hai", [K.THR]],
  ["HI-07", "seedhiyan chadhte waqt dard", [K.STAIRS]],
  ["HI-08", "kulha jawab de deta hai", [K.GIVEWAY]],
  ["HI-09", "kulha lock ho jata hai", [K.LOCK]],
  ["HI-10", "subah kulha akad jata hai", [K.MORN]],
  ["HI-11", "shaam ko zyada dard hota hai", [K.WORSE]],
  ["HI-12", "raat ko dard hota hai", [K.NIGHT]],
  // Hindi (Devanagari)
  ["DE-01", "जांघ के अंदर की तरफ दर्द", [K.ADD]],
  ["DE-02", "कूल्हे के बाहर की तरफ दर्द", [K.LATERAL]],
  ["DE-03", "सीढ़ियां चढ़ने में दर्द", [K.STAIRS]],
  ["DE-04", "गाड़ी से उतरते समय दर्द", [K.CAR]],
  ["DE-05", "कूल्हे का ऑपरेशन हुआ था", [K.THR]],
  ["DE-06", "लगातार दर्द", [K.CONST]],
  // mixed
  ["MX-01 apostrophe", "The hip doesn’t click or lock", [K.MNONE]],
  ["MX-02 capitals", "PAIN IN THE GROIN WHEN I SQUAT", [K.GROIN]],
];

describe("hand-written stories: the result is exactly what a physio would tick", () => {
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["knee", "my knee hurts on stairs"], ["shoulder", "shoulder pain at night"], ["wrist", "my wrist is swollen"], ["neck", "neck stiffness in the morning"],
    ["relative's cancer", "my mother had breast cancer"], ["relative's cancer, Hindi", "मेरे चाचा को कैंसर है"], ["relative's cancer, Hinglish", "mummy ko cancer tha"],
    ["no history of cancer", "no history of cancer"], ["a delivery boy", "he is a delivery boy"], ["knee replacement", "knee replacement planned for next year"],
    ["did not fall", "I did not fall"], ["walking is just walking", "I walk every day"], ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("negation, and a statement that is itself a 'no'", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no clicking or locking' IS the answer 'None', not a cancelled symptom", () => { expect(pick("no clicking or locking")).toEqual([K.MNONE]); });
  it("a negation in one clause does not leak into the next", () => {
    expect(pick("no night pain, but pain on the stairs")).toEqual([K.STAIRS]);
  });
  it("'chalne se dard kam ho jata hai' is relief with walking, not pain on walking", () => {
    expect(pick("chalne se dard kam ho jata hai")).not.toContain(K.WALK);
  });
});

describe("the two single-choice questions", () => {
  it("dominant place: 'mostly' plus a place picks one answer", () => {
    expect(understandStory("mostly on the outside of the hip").byField.locationPattern).toEqual([name(K.DLAT)]);
  });
  it("'main' (Hindi for 'I') is not mistaken for 'mainly'", () => {
    expect(understandStory("kulhe ke peeche dard jab main baithta hoon").byField.locationPattern).toBeUndefined();
  });
  it("24-hour pattern: two different patterns are reported as ambiguous, not silently picked", () => {
    const got = understandStory("pain wakes me at night and it is stiff in the morning");
    expect(got.byField.pattern.length).toBeGreaterThan(1);
    expect(got.ambiguous).toContain("pattern");
  });
});

describe("safety around the red flags", () => {
  it("'None of the above' is never suggested next to a real red flag", () => {
    const got = understandStory("hot swollen hip with fever, no other red flags");
    expect(got.byField.redFlags || []).not.toContain("None of the above");
  });
  it("a relative's cancer is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer")).toEqual([]);
    expect(pick("I had cancer in 2012")).toEqual([K.CANCER]);
  });
  it("'since the pregnancy' is not 'after delivery'", () => {
    expect(pick("pain at the front since the pregnancy")).not.toContain(K.POSTPARTUM);
  });
  it("'subah kulha jam jata hai' is morning stiffness, not a locking hip", () => {
    expect(pick("subah kulha jam jata hai")).toEqual([K.MORN]);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: bare words count", () => {
    expect(f("location", "groin")).toEqual([name(K.GROIN)]);
    expect(f("location", "buttock")).toEqual([name(K.POST)]);
  });
  it("Aggravating: 'walking' and 'stairs'", () => {
    expect(f("aggravating", "walking")).toEqual([name(K.WALK)]);
    expect(f("aggravating", "stairs")).toEqual([name(K.STAIRS)]);
  });
  it("Mechanical symptoms: a bare 'None'", () => {
    expect(f("mechanical", "none")).toEqual(["None"]);
  });
  it("Red flags: a bare 'cancer' counts only inside that box", () => {
    expect(f("redFlags", "cancer")).toEqual([name(K.CANCER)]);
    expect(pick("cancer")).toEqual([]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("pattern", "pain in the groin when I squat").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "pain in the groin on stairs and the pain is worse at night. ".repeat(2000);
    const t0 = performance.now();
    const r = understandStory(big);
    expect(performance.now() - t0).toBeLessThan(5000);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
  it("non-string input does not throw", () => {
    for (const v of [null, undefined, 42, {}, []]) expect(() => understandStory(v)).not.toThrow();
  });
});

// Written down on purpose: things this draft does NOT get right. If one starts passing, move it above.
describe("known limitations (documented, not hidden)", () => {
  it("'X but no pain' is cut in two at 'but', so a painless click said that way is not recognised", () => {
    expect(pick("clicking in the hip but no pain")).not.toContain(K.CLICKOK);
  });
  it("a bare 'there is a sound' with no pain word is left for the student", () => {
    expect(pick("कूल्हे में आवाज के साथ दर्द")).not.toContain(K.CLICKPAIN);
  });
});
