// ankleFootPhraseMap.test.js -- hand-written cases for the DRAFT Ankle/Foot everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in ankleFootPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, negation, the two single-choice
// questions (24-hour pattern, swelling), safety around red flags, typing straight into one question's box, and the
// known limitations, written down on purpose so they are visible, not hidden.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../ankleFootPhraseMap.js";
import { KEYS as K } from "./ankleFootWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

const STORY = [
  ["EN-01 lateral sprain", "Rolled my ankle playing football, pain on the outer side", [K.INV, K.LATA]],
  ["EN-02 medial", "Pain on the inside of the ankle", [K.MEDA]],
  ["EN-03 front of the ankle", "Pinching at the front of the ankle when squatting", [K.ANTA, K.DORSI]],
  ["EN-04 plantar fasciitis", "Heel pain, worst with the first steps in the morning", [K.PLANT, K.FIRST]],
  ["EN-05 insertional", "Pain where the achilles attaches to the heel", [K.ACHI]],
  ["EN-06 mid-portion", "Thickened achilles, pain in the middle of the tendon", [K.ACHM]],
  ["EN-07 bunion", "Pain at the base of the big toe", [K.TOE1]],
  ["EN-08 metatarsalgia", "Pain under the ball of the foot", [K.FORE]],
  ["EN-09 Morton's", "Burning between the third and fourth toes", [K.BETW, K.BURNBETW]],
  ["EN-10 dorsum", "Pain on top of the foot", [K.TOP]],
  ["EN-11 shin splints", "Shin splints", [K.SHIN]],
  ["EN-12 referred from back", "Pain from my lower back going down to the foot", [K.BACK]],
  ["EN-13 tarsal tunnel", "Burning along the inside of the ankle into the sole", [K.TARSAL, K.MEDA]],
  ["EN-14 into the sole", "The pain goes into the sole of the foot", [K.SOLE]],
  ["EN-15 no radiation", "It does not radiate", [K.NORAD]],
  ["EN-16 eversion", "My ankle rolled outwards", [K.EVER]],
  ["EN-17 high ankle", "High ankle sprain", [K.HIGH]],
  ["EN-18 direct", "A heavy box dropped on my foot", [K.DIRECT]],
  ["EN-19 fall from height", "Fell from a ladder", [K.FALLH]],
  ["EN-20 landing", "Bad landing from a jump", [K.LAND]],
  ["EN-21 footwear", "Pain started after I got new running shoes", [K.CHG]],
  ["EN-22 training", "I doubled my mileage", [K.TRAIN]],
  ["EN-23 stairs", "Pain on stairs", [K.STAIRS]],
  ["EN-24 barefoot", "Pain walking barefoot on tiles", [K.BAREFOOT]],
  ["EN-25 tight shoes", "Tight shoes hurt", [K.TIGHT]],
  ["EN-26 downhill", "Pain going downhill", [K.DOWNH]],
  ["EN-27 pattern night", "Pain wakes me at night", [K.NIGHT]],
  ["EN-28 pattern burning", "Burning pain in the foot at night", [K.BURN]],
  ["EN-29 swelling none", "No swelling", [K.SNONE]],
  ["EN-30 swelling mild", "Mild swelling that goes down by evening", [K.SMILD]],
  ["EN-31 swelling persistent", "The ankle is always swollen", [K.SMOD]],
  ["EN-32 swelling severe", "It swells up a lot after running", [K.SSEV]],
  ["EN-33 Ottawa bone", "Tender over the ankle bone", [K.OTTBONE]],
  ["EN-34 Ottawa weight bearing", "Cannot weight bear since the injury", [K.OTTWEIGHT]],
  ["EN-35 Achilles rupture", "Heard a pop at the back of the ankle and cannot rise on my toes", [K.ACHRUP, K.POSTA]],
  ["EN-36 stress fracture", "Stress fracture suspected", [K.STRESS]],
  ["EN-37 septic", "The ankle is red hot and swollen with fever", [K.HOTJ]],
  ["EN-38 compartment", "The foot is cold and pale and the calf is hard", [K.COMPART]],
  ["EN-39 cancer", "History of cancer", [K.CANCER]],
  // Hinglish
  ["HI-01", "takhne ke bahar ki taraf dard hai", [K.LATA]],
  ["HI-02", "edi me dard subah pehle kadam par", [K.PLANT, K.FIRST]],
  ["HI-03", "ungliyon ke beech jalan", [K.BURNBETW, K.BETW]],
  ["HI-04", "naye joote pehne ke baad dard", [K.CHG]],
  ["HI-05", "seedhiyan chadhte waqt dard", [K.STAIRS]],
  ["HI-06", "sujan nahi hai", [K.SNONE]],
  ["HI-07", "pair par bhaar nahi daal pa raha", [K.OTTWEIGHT]],
  ["HI-08", "raat ko dard badh jata hai", [K.NIGHT]],
  // Hindi (Devanagari)
  ["DE-01", "टखने के पीछे दर्द", [K.POSTA]],
  ["DE-02", "एड़ी में दर्द", [K.PLANT]],
  ["DE-03", "नंगे पैर चलने में दर्द", [K.BAREFOOT]],
  ["DE-04", "रात को जलन", [K.BURN]],
  // mixed
  ["MX-01 apostrophe", "It doesn’t radiate anywhere", [K.NORAD]],
  ["MX-02 capitals", "TENDER OVER THE ANKLE BONE", [K.OTTBONE]],
];

describe("hand-written stories: the result is exactly what a physio would tick", () => {
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["hip", "my hip hurts at night"], ["shoulder", "shoulder pain at night"], ["wrist", "my wrist is swollen"], ["knee", "my knee hurts on stairs"],
    ["relative's cancer", "his father had bone cancer"], ["relative's cancer, Hindi", "मेरे पिताजी को कैंसर था"], ["relative's cancer, Hinglish", "meri mummy ko cancer tha"],
    ["no history of cancer", "no history of cancer"], ["a pair of shoes", "I bought a pair of shoes"], ["heels at a wedding", "she wore heels to the wedding"],
    ["a cousin's stress fracture", "my cousin had a stress fracture"], ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("negation, and a statement that is itself a 'no'", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no swelling' IS the answer 'None', not a cancelled swelling", () => { expect(pick("no swelling")).toEqual([K.SNONE]); });
  it("'no radiation' IS the answer, not a cancelled radiation", () => { expect(pick("no radiation")).toEqual([K.NORAD]); });
  it("a negation in one clause does not leak into the next", () => {
    expect(pick("no night pain, but pain on stairs")).toEqual([K.STAIRS]);
  });
  it("walking barefoot is the barefoot answer, not plain walking", () => {
    expect(pick("nange pair chalne se dard")).not.toContain(K.WALKRUN);
  });
});

describe("the two single-choice questions", () => {
  it("swelling: two different answers are reported as ambiguous, not silently picked", () => {
    const got = understandStory("mild swelling that settles by evening but the ankle is always swollen");
    expect(got.byField.swelling.length).toBeGreaterThan(1);
    expect(got.ambiguous).toContain("swelling");
  });
  it("24-hour pattern: a burning night is the 'burning' answer, not plain night pain", () => {
    expect(understandStory("burning pain in the soles at night").byField.pattern).toEqual([name(K.BURN)]);
  });
  it("'None' is never suggested next to a real swelling answer", () => {
    const got = understandStory("no swelling in the morning, it swells up a lot after running");
    expect((got.byField.swelling || []).includes("None") && got.byField.swelling.length > 1).toBe(false);
  });
});

describe("safety around the red flags", () => {
  it("'None of the above' is never suggested next to a real red flag", () => {
    const got = understandStory("the ankle is red hot and swollen with fever, no other red flags");
    expect(got.byField.redFlags || []).not.toContain("None of the above");
  });
  it("a relative's cancer is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer")).toEqual([]);
    expect(pick("I had cancer in 2012")).toEqual([K.CANCER]);
  });
  it("'someone stepped on my foot' is a direct impact, 'I stepped on a stone' is not", () => {
    expect(pick("someone stepped on my foot")).toContain(K.DIRECT);
    expect(pick("stepped on a stone and my foot rolled in")).not.toContain(K.DIRECT);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: a bare 'heel' counts only inside the box", () => {
    expect(f("location", "heel")).toEqual([name(K.PLANT)]);
  });
  it("Aggravating: bare 'walking' and 'stairs'", () => {
    expect(f("aggravating", "walking")).toEqual([name(K.WALKRUN)]);
    expect(f("aggravating", "stairs")).toEqual([name(K.STAIRS)]);
  });
  it("Swelling: a bare 'none'", () => {
    expect(f("swelling", "none")).toEqual(["None"]);
  });
  it("Red flags: a bare 'cancer' counts only inside that box", () => {
    expect(f("redFlags", "cancer")).toEqual([name(K.CANCER)]);
    expect(pick("cancer")).toEqual([]);
  });
  it("Radiation: 'referred from the back' is understood even though 'back' is another part", () => {
    expect(f("radiation", "sciatica down to the foot")).toEqual([name(K.BACK)]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("pattern", "heel pain on stairs").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "heel pain on stairs and the pain is worse at night. ".repeat(2000);
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
  it("'worst when I get up' (from a chair or from bed?) is not guessed as the first-steps answer", () => {
    expect(pick("plantar fasciitis, worst when I get up")).not.toContain(K.FIRST);
  });
  it("'though' cuts a sentence in two, so 'worse after the match though it eased during' is not read as one idea", () => {
    expect(pick("after the match the pain gets much worse though it eased during")).not.toContain(K.WARM);
  });
});
