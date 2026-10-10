// thoracicPhraseMap.test.js -- hand-written cases for the DRAFT Thoracic everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in thoracicPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, negation, safety around the red
// flags, typing straight into one question's box, and the known limitations, written down on purpose so they are visible.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../thoracicPhraseMap.js";
import { KEYS as K } from "./thoracicWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

describe("realistic stories", () => {
  const STORY = [
    ["EN-01 desk worker", "Pain between the shoulder blades from sitting at a desk all day", [K.ISC, K.MDESK]],
    ["EN-02 mid back lifting", "Pain in the middle of my back after lifting boxes at work", [K.MID, K.MLIFT]],
    ["EN-03 pleuritic", "Sharp pain under the right shoulder blade when I take a deep breath", [K.ISR, K.AIN, K.PBREATH]],
    ["EN-04 cough and sneeze", "It hurts to cough and sneeze", [K.ACOUGH, K.ASNEEZE]],
    ["EN-05 band", "Pain wraps around my ribs to the front, like a tight belt", [K.BAND]],
    ["EN-06 morning", "Stiff in the morning and loosens up as I move", [K.PINFL]],
    ["EN-07 night", "Worse at night, it wakes me up", [K.PNIGHT]],
    ["EN-08 heat", "A hot water bottle on it every evening settles it", [K.THEAT]],
    ["EN-09 cardiac", "Chest tightness and sweating with the pain", [K.FCARD]],
    ["EN-10 cord", "Both legs feel weak and heavy", [K.FLEGW]],
    ["EN-11 cancer", "History of breast cancer treated two years ago", [K.FCA]],
    ["EN-12 weight", "Lost weight without trying, about 6 kilos in two months", [K.FWT]],
    ["EN-13 osteoporosis fracture", "Fractured a vertebra after a minor fall, she has weak bones", [K.MOSTEO, K.FOSTEO]],
    ["EN-14 none of the above", "No red flags", [K.FNONE]],
    ["EN-15 function", "Cannot sit for long at my desk", [K.NSIT]],
    ["HI-01", "peeth ke beech me dard hai", [K.MID]],
    ["HI-02", "kandhon ke beech me dard hota hai computer par kaam karte waqt", [K.ISC, K.MDESK]],
    ["HI-03", "bayen kandhe ki haddi ke neeche dard", [K.ISL]],
    ["HI-04", "khansi aane par peeth me dard", [K.ACOUGH]],
    ["HI-05", "raat ko dard se neend khul jati hai", [K.PNIGHT]],
    ["HI-06", "bukhar aur peeth me dard", [K.FFEVER]],
    ["HI-07", "pairon me jhunjhuni aur kamzori", [K.FLEGN, K.FLEGW]],
    ["DE-01", "पीठ के बीच में दर्द है", [K.MID]],
    ["DE-02", "कंधों के बीच दर्द", [K.ISC]],
    ["DE-03", "खांसी में दर्द होता है", [K.ACOUGH]],
    ["DE-04", "सीने में जकड़न के साथ दर्द", [K.FCARD]],
    ["DE-05", "हड्डियां कमजोर हैं", [K.FOSTEO]],
  ];
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["knee", "my knee hurts at night"], ["neck", "neck pain when I look up"], ["lower back", "lower back pain when I bend forward"],
    ["sciatica", "sciatica down the right leg"], ["stomach", "pet me dard hai"], ["waist, Hinglish", "kamar dard hai"],
    ["back idiom", "that was a back breaking day"], ["x-ray", "it is a thoracic spine x-ray"],
    ["relative's cancer", "my mother had cancer"], ["relative's cancer, Hindi", "मेरे पिताजी को कैंसर था"],
    ["relative's cancer, Hinglish", "meri bhabhi ko cancer tha"], ["no history of cancer", "no history of cancer"],
    ["relative's osteoporosis", "her sister has osteoporosis"], ["friend's heart attack", "my friend had a heart attack"],
    ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("negation", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no pain when I breathe in' is not a breathing pain", () => { expect(pick("no pain when I breathe in")).toEqual([]); });
  it("'did not help' is not a treatment that helps", () => { expect(pick("diclofenac gel did not help at all")).toEqual([]); });
  it("'relieves nothing' is not relief", () => { expect(pick("leaning back to stretch relieves nothing")).not.toContain(K.TSTRETCH); });
  it("a negation in one clause does not leak into the next", () => {
    expect(pick("no cough, but it hurts when I laugh")).toContain(K.ALAUGH);
  });
});

describe("breathing: the direction decides", () => {
  it("breathing in", () => { expect(pick("pain when I breathe in")).toContain(K.AIN); });
  it("breathing out", () => { expect(pick("pain when I breathe out")).toContain(K.AOUT); expect(pick("pain when I breathe out")).not.toContain(K.AIN); });
  it("'cannot take a deep breath' is a limited activity, not the aggravating movement", () => {
    expect(pick("I cannot take a deep breath because of the pain")).toEqual([K.NBREATH]);
  });
  it("shortness of breath is a respiratory red flag, not breathing pain", () => {
    expect(pick("shortness of breath")).toEqual([K.FRESP]);
  });
});

describe("safety around the red flags", () => {
  it("'No red flags' is never suggested next to a real red flag in the same sentence", () => {
    const got = understandStory("chest tightness and sweating, no other red flags");
    expect(got.byField.redFlags || []).not.toContain(name(K.FNONE));
  });
  it("a relative's cancer is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer")).toEqual([]);
    expect(pick("I had cancer in 2012")).toEqual([K.FCA]);
  });
  it("an age rule needs both the first-time wording and an age over fifty", () => {
    expect(pick("she is 62 and has never had back pain before, this is the first time")).toEqual([K.FAGE]);
    expect(pick("he is 25 and this is the first time he has had back pain")).not.toContain(K.FAGE);
  });
  it("left arm pain with chest tightness is flagged", () => {
    const got = pick("pressure in the chest and pain in the left arm");
    expect(got).toContain(K.FCARD);
    expect(got).toContain(K.RCARD);
  });
});

describe("left and right", () => {
  it("left shoulder blade", () => { expect(pick("pain under the left shoulder blade")).toEqual([K.ISL]); });
  it("right shoulder blade", () => { expect(pick("pain under the right shoulder blade")).toEqual([K.ISR]); });
  it("Hinglish and Hindi spellings of left", () => {
    for (const t of ["baayen kandhe ki haddi ke neeche dard", "bayein kandhe ki haddi ke paas dard", "बाएं कंधे की हड्डी के नीचे दर्द", "बायीं कंधे की हड्डी में दर्द"]) expect(pick(t)).toEqual([K.ISL]);
  });
  it("Hinglish and Hindi spellings of right", () => {
    for (const t of ["daayen kandhe ki haddi ke neeche dard", "dahine kandhe ki haddi ke paas dard", "दाएं कंधे की हड्डी के नीचे दर्द", "दायीं कंधे की हड्डी में दर्द"]) expect(pick(t)).toEqual([K.ISR]);
  });
  it("'right now' is not a side", () => { expect(pick("I want to see you right now")).toEqual([]); });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: bare words count", () => {
    expect(f("location", "upper back")).toEqual([name(K.UPPER)]);
    expect(f("location", "paraspinal")).toEqual([name(K.PARA)]);
  });
  it("What helps: a bare treatment counts only in its own box", () => {
    expect(f("relTreatments", "ice")).toEqual([name(K.TICE)]);
    expect(f("relTreatments", "heat")).toEqual([name(K.THEAT)]);
    expect(pick("ice")).toEqual([]);
  });
  it("Aggravating: a bare movement counts only in its own box", () => {
    expect(f("aggMovements", "lifting")).toEqual([name(K.ALIFT)]);
    expect(f("aggMovements", "coughing")).toEqual([name(K.ACOUGH)]);
    expect(pick("lifting")).toEqual([]);
  });
  it("Red flags: a bare 'cancer' counts only inside that box", () => {
    expect(f("redFlags", "cancer")).toEqual([name(K.FCA)]);
    expect(pick("cancer")).toEqual([]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("pattern", "pain on coughing").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "the pain between the shoulder blades is worse at night and on deep breathing. ".repeat(2000);
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
  it("'back of the neck going into the upper back' does not guess the cervico-thoracic junction", () => {
    expect(pick("pain in the back of the neck going into the upper back")).not.toContain(K.CTJ);
  });
  it("a plain 'chest pain' is not guessed to be any location", () => {
    expect(pick("chest pain")).toEqual([]);
  });
  it("a fever with no pain or back word is not guessed to be the infection flag", () => {
    expect(pick("she has chest tightness and a fever")).not.toContain(K.FFEVER);
  });
});
