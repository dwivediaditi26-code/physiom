// kneePhraseMap.test.js -- hand-written cases for the DRAFT Knee everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in kneePhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, negation, the two single-choice
// questions (giving way, locking), safety around red flags, typing straight into one question's box, and the known
// limitations, written down on purpose so they are visible, not hidden.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../kneePhraseMap.js";
import { KEYS as K } from "./kneeWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

const STORY = [
  ["EN-01 meniscus story", "Inner knee pain after I twisted it playing football, and it catches sometimes", [K.MEDIAL, K.TWIST]],
  ["EN-02 patellar tendon", "Pain below the kneecap when I jump, patellar tendon", [K.BELOW]],
  ["EN-03 patellofemoral", "Pain around the kneecap going down stairs", [K.AROUND]],
  ["EN-04 behind the knee", "Pain behind the knee when I squat", [K.POPL]],
  ["EN-05 outer knee", "Outer side of the knee hurts after long runs", [K.LATERAL]],
  ["EN-06 above kneecap", "Pain above the kneecap", [K.ABOVE]],
  ["EN-07 Osgood", "He is 13, Osgood Schlatter, bump below the knee", [K.TUBER]],
  ["EN-08 diffuse", "Pain all over the knee, cannot point to one spot", [K.DIFFUSE]],
  ["EN-09 giving way on stairs", "The knee gives way on the stairs", [K.GSTAIRS]],
  ["EN-10 giving way twisting", "The knee gives way when I turn", [K.GPIVOT]],
  ["EN-11 giving way random", "The knee buckles without warning", [K.GRANDOM]],
  ["EN-12 no giving way", "The knee never gives way", [K.GNO]],
  ["EN-13 true locking", "It locks and I cannot straighten it", [K.LKTRUE]],
  ["EN-14 pseudo-locking", "It catches for a second and then releases", [K.LKMOM]],
  ["EN-15 no locking", "No locking", [K.LKNO]],
  ["EN-16 haemarthrosis", "It swelled up like a balloon straight after the injury", [K.SWELLNOW]],
  ["EN-17 cannot weight bear", "Unable to bear weight since the tackle", [K.WEIGHT]],
  ["EN-18 hot knee", "Hot, red and very tender knee", [K.HOTRED]],
  ["EN-19 cancer history", "Treated for cancer in 2016", [K.CANCER]],
  ["EN-20 dashboard", "My knee hit the dashboard in a crash", [K.DIRECT]],
  ["EN-21 hyperextension", "The knee bent backwards when I stepped in a hole", [K.HYPER]],
  ["EN-22 landing", "I landed badly from a jump", [K.LAND]],
  ["EN-23 pivoting", "I planted my foot and turned quickly", [K.PIVOT]],
  ["EN-24 post-surgical", "Pain since my knee replacement", [K.POSTOP]],
  ["EN-25 overuse", "No injury, it came on gradually", [K.INSID]],
  ["EN-26 pattern night", "The pain is worse at night", [K.NIGHT]],
  ["EN-27 pattern morning", "Stiff in the morning", [K.MORN]],
  ["EN-28 pattern intermittent", "The pain comes and goes", [K.INTER]],
  ["EN-29 locked knee flag", "I can't straighten the knee since the injury", [K.LOCKEDK]],
  ["EN-30 none of the above", "No red flags", [K.RFNONE]],
  // Hinglish
  ["HI-01", "ghutne ke andar ki taraf dard hai", [K.MEDIAL]],
  ["HI-02", "ghutne ke bahar ki taraf dard hai", [K.LATERAL]],
  ["HI-03", "katori ke niche dard hai", [K.BELOW]],
  ["HI-04", "ghutne ke peeche dard hai", [K.POPL]],
  ["HI-05", "seedhiyon par ghutna jawab de deta hai", [K.GSTAIRS]],
  ["HI-06", "ghutna mudte waqt jawab de deta hai", [K.GPIVOT]],
  ["HI-07", "ghutna achanak jawab de deta hai", [K.GRANDOM]],
  ["HI-08", "ghutna lock nahi hota", [K.LKNO]],
  ["HI-09", "ghutna thodi der ke liye atak jata hai", [K.LKMOM]],
  ["HI-10", "chot ke turant baad ghutna phool gaya", [K.SWELLNOW]],
  ["HI-11", "ghutna mud gaya khelte waqt", [K.TWIST]],
  ["HI-12", "ghutne ka operation hua tha", [K.POSTOP]],
  ["HI-13", "raat ko ghutne me dard hota hai", [K.NIGHT]],
  ["HI-14", "ghutna garam aur laal hai", [K.HOTRED]],
  // Hindi (Devanagari)
  ["DE-01", "घुटने के अंदर की तरफ दर्द", [K.MEDIAL]],
  ["DE-02", "कटोरी के ऊपर दर्द", [K.ABOVE]],
  ["DE-03", "सीढ़ियां उतरते समय घुटना जवाब दे देता है", [K.GSTAIRS]],
  ["DE-04", "घुटना अटक कर खुल जाता है", [K.LKMOM]],
  ["DE-05", "चोट के तुरंत बाद घुटना फूल गया", [K.SWELLNOW]],
  ["DE-06", "रात को घुटने में दर्द", [K.NIGHT]],
  ["DE-07", "घुटना सीधा नहीं हो रहा", [K.LOCKEDK]],
  // mixed
  ["MX-01 mixed", "knee ka operation hua tha, ab dard hai", [K.POSTOP]],
  ["MX-02 apostrophe", "The knee doesn’t give way", [K.GNO]],
  ["MX-03 capitals", "THE KNEE LOCKS AND I CANNOT STRAIGHTEN IT", [K.LKTRUE, K.LOCKEDK]],
];

describe("hand-written stories: the result is exactly what a physio would tick", () => {
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["shoulder", "my shoulder hurts at night"], ["hip", "hip pain when I walk"], ["ankle", "ankle swelling at night"],
    ["back", "my back aches at night"], ["stomach", "pet me dard hai"],
    ["knee idiom", "that was a knee jerk reaction"], ["knee surgeon", "he is a knee surgeon"], ["skirt", "she wore a knee length skirt"],
    ["relative's cancer", "my mother had cancer"], ["relative's cancer, Hindi", "मेरे पिताजी को कैंसर था"],
    ["relative's cancer, Hinglish", "mummy ko cancer tha"], ["no history of cancer", "no history of cancer"],
    ["swelling the next day", "swelling appeared only the next day"], ["did not twist", "I did not twist it or hit it"],
    ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("negation, and a statement that is itself a 'no'", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no locking' IS the answer 'No', not a cancelled 'locking'", () => { expect(pick("no locking")).toEqual([K.LKNO]); });
  it("'never gives way' IS the answer 'No' for giving way", () => { expect(pick("it never gives way")).toEqual([K.GNO]); });
  it("a negation in one clause does not leak into the next", () => {
    expect(pick("no locking, but it gives way on the stairs")).toEqual(sorted([K.LKNO, K.GSTAIRS]));
  });
  it("'gives way when I turn' describes the giving way, not how the injury happened", () => {
    expect(pick("the knee gives way when I turn")).not.toContain(K.PIVOT);
    expect(pick("the knee gives way when I twist")).not.toContain(K.TWIST);
  });
});

describe("the two single-choice questions", () => {
  it("giving way: a trigger picks the answer", () => {
    expect(understandStory("it gives way on stairs").byField.givingWay).toEqual([name(K.GSTAIRS)]);
  });
  it("giving way: two different triggers are reported as ambiguous, not silently picked", () => {
    const got = understandStory("it gives way on stairs and when I twist");
    expect(got.byField.givingWay.length).toBeGreaterThan(1);
    expect(got.ambiguous).toContain("givingWay");
  });
  it("'No' is never suggested next to a 'Yes' for the same question", () => {
    const got = understandStory("no giving way on the flat but it gives way on stairs");
    expect((got.byField.givingWay || []).includes("No") && got.byField.givingWay.length > 1).toBe(false);
  });
  it("locking: 'locks' alone without a detail still reports nothing for the momentary answer", () => {
    expect(understandStory("it catches for a second").byField.locking).toEqual([name(K.LKMOM)]);
  });
});

describe("safety around the red flags", () => {
  it("'None of the above' is never suggested next to a real red flag", () => {
    const got = understandStory("hot red and very tender knee, no other red flags");
    expect(got.byField.redFlags || []).not.toContain("None of the above");
  });
  it("a relative's cancer is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer")).toEqual([]);
    expect(pick("I had cancer in 2012")).toEqual([K.CANCER]);
  });
  it("swelling that is NOT immediate is not the haemarthrosis flag", () => {
    expect(pick("the knee swells by the evening")).not.toContain(K.SWELLNOW);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: bare words count", () => {
    expect(f("location", "kneecap")).toEqual([name(K.AROUND)]);
    expect(f("location", "diffuse")).toEqual([name(K.DIFFUSE)]);
  });
  it("Giving way and locking: a bare 'no' is the answer 'No'", () => {
    expect(f("givingWay", "no")).toEqual(["No"]);
    expect(f("locking", "no")).toEqual(["No"]);
  });
  it("Red flags: a bare 'cancer' counts only inside that box", () => {
    expect(f("redFlags", "cancer")).toEqual([name(K.CANCER)]);
    expect(pick("cancer")).toEqual([]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("pattern", "it gives way on the stairs").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "the knee gives way on stairs and the pain is worse at night. ".repeat(2000);
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
  it("a plain 'the knee gives way' with no trigger named is not guessed", () => {
    expect(understandStory("the knee gives way").byField.givingWay).toBeUndefined();
  });
  it("a one-sentence knee 'inside' (could mean deep inside) is left for the student", () => {
    expect(pick("pain deep inside the knee")).not.toContain(K.MEDIAL);
  });
});
