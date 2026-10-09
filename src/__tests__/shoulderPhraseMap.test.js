// shoulderPhraseMap.test.js -- hand-written cases for the DRAFT Shoulder everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in shoulderPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases (empty, gibberish, other body
// parts, a relative's cancer), negation, safety around red flags, typing straight into one question's box, and the
// known limitations, written down on purpose so they are visible, not hidden.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../shoulderPhraseMap.js";
import { KEYS as K } from "./shoulderWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();

// [name, text, expected suggestions]  -- the result must be EXACTLY this (nothing extra).
const STORY = [
  ["EN-01 painter", "Shoulder pain for 3 months, started after painting the ceiling, hurts when I reach up", [K.REPOH, K.OH]],
  ["EN-02 fall + cannot lift", "Fell on my shoulder from a bike and now I cannot lift my arm at all", [K.FALL, K.CANTLIFT]],
  ["EN-03 swimmer", "I am a swimmer and the pain is worst at night, I cannot sleep on that side", [K.REPOH, K.NIGHT, K.LYING]],
  ["EN-04 bra", "Pain when I fasten my bra behind my back", [K.BEHIND]],
  ["EN-05 across", "It hurts when I reach across to the other shoulder", [K.ACROSS]],
  ["EN-06 radiation", "The pain goes down to my elbow and up to the neck", [K.ELBOW, K.NECK]],
  ["EN-07 blades", "Pain between my shoulder blades", [K.BLADES]],
  ["EN-08 relief ice", "Ice packs help and rest makes it better", [K.ICEHEAT, K.REST]],
  ["EN-09 relief tablets", "Painkillers help a bit", [K.MEDS]],
  ["EN-10 sling", "Wearing a sling helps", [K.SUPPORT]],
  ["EN-11 surgery", "Pain since the operation on my shoulder", [K.POSTOP]],
  ["EN-12 age", "Degenerative changes, he is 72", [K.AGE]],
  ["EN-13 throwing", "Pain from throwing, I am a fast bowler", [K.THROW]],
  ["EN-14 overhead lift", "Pain started after lifting a heavy box onto a high shelf", [K.LIFTOH]],
  ["EN-15 yanked", "My arm was yanked when the dog pulled the lead", [K.FORCED]],
  ["EN-16 lump", "There is a lump on my collarbone", [K.MASS]],
  ["EN-17 infection", "The shoulder is hot, red and swollen", [K.INFECT]],
  ["EN-18 cancer history", "Treated for breast cancer in 2018", [K.CANCER]],
  ["EN-19 night in all positions", "Night pain in every position, I cannot get comfortable", [K.NIGHT, K.NIGHTPOS]],
  ["EN-20 broken", "I heard a crack when I landed on my shoulder", [K.FRAC, K.FALL]],
  ["EN-21 pattern constant", "The pain never goes away", [K.CONST]],
  ["EN-22 pattern intermittent", "Pain comes and goes", [K.INTER]],
  ["EN-23 pattern morning", "Stiff in the morning", [K.MORN]],
  ["EN-24 pattern improves", "It loosens up during the day", [K.IMPR]],
  ["EN-25 no injury", "No injury, it started on its own", [K.INSID]],
  ["EN-26 none of the above", "No red flags", [K.RFNONE]],
  ["EN-27 painful arc", "I get a painful arc when I lift my arm to the side", [K.ARC]],
  ["EN-28 lifting bags", "Pain when carrying heavy bags", [K.LIFT]],
  // Hinglish
  ["HI-01", "kandhe me dard hai aur haath upar karne me dard", [K.OH]],
  ["HI-02", "raat ko dard zyada hota hai", [K.NIGHT]],
  ["HI-03", "peeche haath le jane me dard", [K.BEHIND]],
  ["HI-04", "kandhe ke bal gir gaya tha", [K.FALL]],
  ["HI-05", "dard kohni tak jata hai", [K.ELBOW]],
  ["HI-06", "dard gardan tak jata hai", [K.NECK]],
  ["HI-07", "sekai se aaram milta hai", [K.ICEHEAT]],
  ["HI-08", "badminton khelne se dard shuru hua", [K.THROW]],
  ["HI-09", "bina chot ke dheere dheere shuru hua", [K.INSID]],
  ["HI-10", "kandhe me gaanth hai", [K.MASS]],
  ["HI-11", "operation ke baad se dard hai", [K.POSTOP]],
  ["HI-12", "us taraf let ne me dard", [K.LYING]],
  // Hindi (Devanagari)
  ["DE-01", "कंधे में दर्द है और हाथ ऊपर करने में दर्द", [K.OH]],
  ["DE-02", "रात को दर्द और करवट लेने में दर्द", [K.NIGHT, K.LYING]],
  ["DE-03", "गर्दन तक दर्द जाता है", [K.NECK]],
  ["DE-04", "सिकाई से आराम मिलता है", [K.ICEHEAT]],
  ["DE-05", "दोनों कंधों के बीच दर्द", [K.BLADES]],
  ["DE-06", "ऑपरेशन के बाद से कंधे में दर्द", [K.POSTOP]],
  ["DE-07", "टेनिस खेलने से कंधे में दर्द", [K.THROW]],
  ["DE-08", "कंधे में गांठ है", [K.MASS]],
  // spelling, mixed language, apostrophes
  ["MX-01 mixed", "shoulder me pain hai jab overhead kaam karta hoon", [K.OH, K.REPOH]],
  ["MX-02 apostrophe", "It doesn’t radiate anywhere", [K.NORAD]],
  ["MX-03 capitals", "PAIN AT NIGHT AND I CAN'T SLEEP ON THAT SIDE", [K.NIGHT, K.LYING]],
];

describe("hand-written stories: the result is exactly what a physio would tick", () => {
  for (const [name, text, want] of STORY) {
    it(name, () => { expect(pick(text)).toEqual(sorted(want)); });
  }
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀😀 🙏"],
    ["knee", "my knee hurts when I climb stairs"], ["low back", "lower back pain worse in the morning"],
    ["hip", "hip pain at night"], ["ankle", "ankle sprain last month"], ["neck only", "my neck is stiff in the morning"],
    ["not clinical", "the shoulder bag was heavy"], ["idiom", "he shoulders a lot of responsibility"],
    ["a friend", "my friend has a frozen shoulder"], ["relative's cancer", "my mother had cancer, I have shoulder pain"],
    ["relative's cancer, Hindi", "मेरी मां को कैंसर था"], ["relative's cancer, Hinglish", "mummy ko cancer tha, mujhe kandhe me dard hai"],
    ["no history", "no history of cancer"], ["no fracture or lump", "I do not have any fracture or lump"],
    ["not at night", "the pain is not there at night"], ["no tingling", "no numbness or tingling in the hand"],
    ["surgery is planned", "shoulder surgery is scheduled for next week"], ["advice", "the patient was told to avoid heavy lifting"],
    ["elbow story", "my elbow hurts when I grip a cup"], ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
    ["swimming pool", "I went swimming on Sunday and had fun"],
  ];
  for (const [name, text] of SILENT) it(name, () => { expect(pick(text)).toEqual([]); });
});

describe("negation and relief words", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("a list after 'no' is cancelled too", () => { expect(pick("no tennis or badminton or cricket")).toEqual([]); });
  it("'better with' is relief, not a trigger", () => { expect(pick("it feels better with lifting")).not.toContain(K.LIFT); });
  it("a fall that did not happen is not suggested", () => { expect(pick("I did not fall and I was not hit")).toEqual([]); });
  it("a negation in one clause does not leak into the next", () => {
    expect(pick("no night pain, but pain when lifting my arm overhead")).toContain(K.OH);
  });
});

describe("safety around the red flags", () => {
  it("'None of the above' is never suggested next to a real red flag", () => {
    const got = understandStory("I heard a snap and I fell on my shoulder, no other red flags");
    expect(got.byField.redFlags || []).not.toContain("None of the above");
  });
  it("'No radiation' is never suggested next to a real direction", () => {
    const got = understandStory("pain goes down to the elbow, not radiating further, no radiation to the neck");
    expect((got.byField.radiation || []).includes("No radiation") && (got.byField.radiation || []).length > 1).toBe(false);
  });
  it("a relative's cancer is never the patient's cancer history, but the patient's own is", () => {
    expect(pick("my father has cancer")).toEqual([]);
    expect(pick("I had cancer in 2015")).toEqual([K.CANCER]);
  });
  it("'cannot lift the arm' needs a trauma word to be the red flag", () => {
    expect(pick("I cannot lift my arm above shoulder height")).not.toContain(K.CANTLIFT);
    expect(pick("after the fall I cannot lift my arm")).toContain(K.CANTLIFT);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Aggravating: bare words count", () => {
    expect(f("aggravating", "overhead")).toEqual([K.OH.split("|")[1]]);
    expect(f("aggravating", "lifting")).toEqual([K.LIFT.split("|")[1]]);
    expect(f("aggravating", "behind the back")).toEqual([K.BEHIND.split("|")[1]]);
  });
  it("Relieving: 'rest', 'ice' and 'heat'", () => {
    expect(f("relieving", "rest")).toEqual([K.REST.split("|")[1]]);
    expect(f("relieving", "ice")).toEqual([K.ICEHEAT.split("|")[1]]);
    expect(f("relieving", "heat")).toEqual([K.ICEHEAT.split("|")[1]]);
  });
  it("Mechanism: a sport name on its own counts only inside that box", () => {
    expect(f("mechanism", "cricket")).toEqual([K.THROW.split("|")[1]]);
    expect(pick("cricket")).toEqual([]);
  });
  it("Radiation: 'up to neck' is understood even though a neck is another body part", () => {
    expect(f("radiation", "up to neck")).toEqual([K.NECK.split("|")[1]]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("pattern", "pain when lifting my arm overhead").suggestions).toEqual([]);
  });
  it("an unknown question gives nothing", () => {
    expect(understandField("nonsense", "overhead").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "pain when I lift my arm overhead and it is worse at night. ".repeat(2000);
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
  it("a later, unrelated 'nahi' can cancel an earlier phrase", () => {
    // "after the fall my hand does not go up": the 'nahi' two words later cancels the fall.
    expect(pick("गिरने के बाद हाथ ऊपर नहीं उठ रहा")).not.toContain(K.FALL);
  });
  it("'avoid ... up' written with 'na' (do not) is not understood", () => {
    expect(pick("haath upar na karne se dard nahi hota")).not.toContain(K.AVOID);
  });
});
