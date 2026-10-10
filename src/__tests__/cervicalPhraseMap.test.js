// cervicalPhraseMap.test.js -- hand-written cases for the DRAFT Cervical everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in cervicalPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, left and right, negation, the three
// single-choice questions, safety around the red flags, typing straight into one question's box, and the known limitations,
// written down on purpose so they are visible. The matcher only SUGGESTS options; a person confirms.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../cervicalPhraseMap.js";
import { KEYS as K } from "./cervicalWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

describe("realistic stories", () => {
  const STORY = [
    ["EN-01 desk worker", "Pain at the back of the neck for two weeks, started after sitting at the laptop for hours every day", [K.POSTN, K.MPOST]],
    ["EN-02 left side, turning", "Sharp pain on the left side of my neck when I turn my head to the left", [K.LATL, K.GROTL]],
    ["EN-03 radicular arm", "The pain goes down my left arm to the elbow", [K.RARML, K.AL]],
    ["EN-04 hand tingling", "Tingling in my left hand", [K.RHANDL, K.AL]],
    ["EN-05 whiplash", "Rear ended at a traffic light last month, whiplash", [K.MREAR]],
    ["EN-06 sleeping", "Woke up with a stiff neck after sleeping on the sofa", [K.MSLEEP]],
    ["EN-07 looking down", "Looking down at my phone makes it worse", [K.GFLEX]],
    ["EN-08 quadrant", "Looking up and to the right is the worst position", [K.GQR]],
    ["EN-09 relieved by tucks", "Chin tucks help", [K.VCHIN]],
    ["EN-10 arm overhead", "Putting my hand on top of my head relieves the arm pain", [K.VARM]],
    ["EN-11 morning", "Worse in the morning when I wake up", [K.PMORN]],
    ["EN-12 night", "Worse at night, it wakes me up", [K.PNIGHT]],
    ["EN-13 Lhermitte", "Electric shock down the spine when I bend my neck forward", [K.LYES, K.MYLHER]],
    ["EN-14 myelopathy hands", "Pins and needles in both hands", [K.RBIL, K.ABIL, K.MYHAND]],
    ["EN-15 myelopathy gait", "Unsteady on my feet", [K.MYGAIT]],
    ["EN-16 VBI dizziness", "Dizzy when I turn my neck", [K.VDIZ]],
    ["EN-17 VBI swallowing", "Difficulty swallowing food", [K.VDYSP]],
    ["EN-18 instability", "Had a cervical fusion two years ago", [K.INFUSION]],
    ["EN-19 fever torticollis", "Stiff neck with a high fever", [K.OTTORT]],
    ["EN-20 none", "No other red flags", [K.OTNO]],
    ["EN-21 fracture", "Landed on my head", [K.FRAXIAL]],
    ["EN-22 function", "Difficulty driving, cannot turn to check my blind spot", [K.NDRIVE]],
    ["HI-01", "gardan ke peeche dard hai", [K.POSTN]],
    ["HI-02", "gardan ke bayen taraf dard hota hai", [K.LATL]],
    ["HI-03", "dono haathon me sunnpan", [K.RBIL, K.ABIL, K.MYHAND]],
    ["HI-04", "chakkar aate hain jab gardan ghumata hoon", [K.VDIZ]],
    ["HI-05", "raat ko dard se neend khul jati hai", [K.PNIGHT]],
    ["DE-01", "गर्दन के पीछे दर्द है", [K.POSTN]],
    ["DE-02", "बाएं तरफ गर्दन में दर्द", [K.LATL]],
    ["DE-03", "नीचे देखने पर दर्द", [K.GFLEX]],
    ["DE-04", "दोनों हाथों में झनझनाहट", [K.RBIL, K.ABIL, K.MYHAND]],
  ];
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["knee", "my knee hurts at night"], ["lower back", "lower back pain when I bend forward"], ["foot", "plantar fasciitis in the right foot"],
    ["stomach", "pet me dard hai"], ["idiom", "that guy is a pain in the neck"] ,
    ["friend's whiplash", "my friend had a whiplash injury"], ["relative's RA", "her sister has rheumatoid arthritis"],
    ["relative's cancer", "my uncle had spine cancer"], ["relative's cancer, Hindi", "मेरे चाचा को गर्दन में कैंसर था"],
    ["no history of cancer", "no history of cancer"], ["no dizziness", "no dizziness and no double vision"],
    ["no night pain", "no night pain"], ["right now", "right now I feel fine"],
    ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("left and right", () => {
  it("left and right neck", () => {
    expect(pick("pain on the left side of my neck")).toEqual([K.LATL]);
    expect(pick("pain on the right side of my neck")).toEqual([K.LATR]);
  });
  it("left and right arm, hand, trapezius", () => {
    expect(pick("left arm pain")).toContain(K.RARML);
    expect(pick("tingling in the right hand")).toContain(K.RHANDR);
    expect(pick("tight left trapezius")).toEqual([K.TRAPL]);
    expect(pick("tight right trap")).toEqual([K.TRAPR]);
  });
  it("Hinglish and Hindi spellings of left and right", () => {
    for (const t of ["baayen haath me jhunjhuni", "bayein haath me jhunjhuni", "बाएं हाथ में झनझनाहट", "बायीं हाथ में झनझनाहट"]) expect(pick(t)).toContain(K.RHANDL);
    for (const t of ["daayen haath me jhunjhuni", "dahine haath me jhunjhuni", "दाएं हाथ में झनझनाहट", "दायीं हाथ में झनझनाहट"]) expect(pick(t)).toContain(K.RHANDR);
  });
  it("both sides in one sentence give both answers", () => {
    const got = pick("tingling in the left hand and numbness in the right hand");
    expect(got).toContain(K.RHANDL);
    expect(got).toContain(K.RHANDR);
  });
  it("a side pairs with the neck, not with a limb the neck pain travels to", () => {
    expect(pick("pain from the neck going down the left arm")).not.toContain(K.LATL);
  });
  it("'turning right is fine' is not an aggravating movement", () => {
    expect(pick("turning left hurts and turning right is fine")).toEqual([K.GROTL]);
  });
  it("a relief is not an aggravating movement", () => {
    expect(pick("rotating the head to the left makes it feel better")).toEqual([K.VROTL]);
    expect(pick("looking down eases the pain")).toEqual([K.VFLEX]);
  });
  it("'upper arm' is the shoulder / upper arm answer, not 'down the arm'", () => {
    expect(pick("pain into the left upper arm")).toContain(K.RSHL);
    expect(pick("pain into the left upper arm")).not.toContain(K.RARML);
  });
});

describe("negation, and a statement that is itself a 'no'", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no headache' IS the answer for the headache question", () => { expect(pick("no headache")).toEqual([K.HNO]); });
  it("'no electric shocks' IS the answer 'No' for Lhermitte", () => { expect(pick("no electric shocks")).toEqual([K.LNO]); });
  it("'no arm symptoms' IS the answer for the arm question", () => { expect(pick("no arm symptoms")).toEqual([K.ANO]); });
  it("the three 'none' screens are answers of their own", () => {
    expect(pick("no myelopathy signs, no vbi signs and no instability signs")).toEqual(sorted([K.MYNO, K.VNO, K.INNO]));
  });
});

describe("the single-choice questions", () => {
  it("arm symptoms: left and right in one sentence is reported as ambiguous, not silently picked", () => {
    const got = understandStory("tingling in the left hand and numbness in the right hand");
    expect(got.ambiguous).toContain("armPresent");
  });
  it("headache: one clear answer", () => {
    expect(understandStory("the headaches are the main problem").byField.haPresent).toEqual([name(K.HPRIM)]);
  });
  it("Lhermitte: the exact option text works, even though it contains the word 'but'... for headache", () => {
    expect(pick("Yes — concurrent but possibly unrelated")).toEqual([K.HCONC]);
  });
  it("'No' is never suggested next to a 'Yes' for the same question", () => {
    const got = understandStory("no headache, the headaches are the main problem");
    expect((got.byField.haPresent || []).includes("No headache") && got.byField.haPresent.length > 1).toBe(false);
  });
});

describe("safety around the red flags", () => {
  it("'None' is never suggested next to a real red flag of the same screen", () => {
    const got = understandStory("double vision, no other vbi signs");
    expect(got.byField.redFlagsVbi || []).not.toContain(name(K.VNO));
  });
  it("a relative's illness is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer of the spine")).toEqual([]);
    expect(pick("I have rheumatoid arthritis")).toEqual([K.INRA]);
  });
  it("a thunderclap headache is flagged in both screens that ask about it", () => {
    const got = pick("sudden thunderclap headache");
    expect(got).toContain(K.VTHUN);
    expect(got).toContain(K.OTTHUN);
  });
  it("Lhermitte's sign ticks the single question and the myelopathy list", () => {
    const got = pick("zaps of electricity run down my spine if I look down");
    expect(got).toContain(K.LYES);
    expect(got).toContain(K.MYLHER);
  });
  it("bladder and bowel changes are separate flags", () => {
    expect(pick("new bladder problems since the pain started")).toEqual([K.MYBLAD]);
    expect(pick("she cant control her bowels since this started")).toEqual([K.MYBOW]);
  });
  it("a fracture screen answer does not turn 'no injury' into an unclear mechanism", () => {
    expect(pick("no fracture concern as there was no injury")).toEqual([K.FRNA]);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: bare words count", () => {
    expect(f("location", "scalene")).toEqual([name(K.SCAL)]);
    expect(f("location", "upper neck")).toEqual([name(K.UPPERC)]);
  });
  it("Relieving: a bare stretching or hot shower counts only in its own box", () => {
    expect(f("relMovements", "stretching")).toEqual([name(K.VSTRETCH)]);
    expect(f("relMovements", "hot shower")).toEqual([name(K.VSHOWER)]);
    expect(pick("stretching")).toEqual([]);
  });
  it("Aggravating: 'looking down' counts only in its own box", () => {
    expect(f("aggMovements", "looking down")).toEqual([name(K.GFLEX)]);
    expect(pick("looking down")).toEqual([]);
  });
  it("Headache, Lhermitte and arm symptoms: a bare 'no' is the answer 'No'", () => {
    expect(f("haPresent", "no headache")).toEqual([name(K.HNO)]);
    expect(f("lhermitte", "no")).toEqual(["No"]);
    expect(f("armPresent", "no")).toEqual([name(K.ANO)]);
  });
  it("Myelopathy exam findings: a bare Babinski or Hoffman counts only in its own box", () => {
    expect(f("redFlagsMyelopathy", "babinski")).toEqual([name(K.MYBAB)]);
    expect(f("redFlagsMyelopathy", "hoffman")).toEqual([name(K.MYHOFF)]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("overallPattern", "dizzy when i turn my neck").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "pain on the left side of the neck when I turn my head and it is worse at night. ".repeat(2000);
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
  it("a sentence joined with 'but' is read as two halves, so a pattern spread over both is missed", () => {
    expect(pick("it is there all the time but some hours are worse than others")).not.toContain(K.PCONSTVAR);
  });
  it("'pain on the left side when I turn' does not guess which way the head turned", () => {
    expect(pick("sharp pain on the left side of my neck when I turn to look at the person next to me")).not.toContain(K.GROTL);
  });
  it("'haath' in Hinglish means hand or arm, so it is read as hand / fingers", () => {
    expect(pick("bayen haath me dard")).toContain(K.RHANDL);
  });
});
