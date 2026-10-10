// lumbarSIPhraseMap.test.js -- hand-written cases for the DRAFT Lumbar/SI everyday-phrase matcher.
// (Structure and the "every drafted phrase gives back its own option" checks are in regionPhraseMaps.test.js;
// the messy-typing exams are in lumbarSIPhraseMapWild.test.js.)
//
// Realistic stories in English / Hinglish / Hindi, the "nothing should match" cases, left and right, sitting and standing
// times, work time off, negation, the three single-choice questions, safety around the red flags, typing straight into one
// question's box, and the known limitations, written down on purpose so they are visible.
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { understandStory, understandField } from "../lumbarSIPhraseMap.js";
import { KEYS as K } from "./lumbarSIWildSets.js";

const pick = (text) => understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`).sort();
const sorted = (a) => [...a].sort();
const name = (key) => key.split("|")[1];

describe("realistic stories", () => {
  const STORY = [
    ["EN-01 disc story", "Low back pain for three weeks after lifting a heavy box from the floor, bending and twisting at the same time", [K.MLFLOOR, K.MLBOTH]],
    ["EN-02 SI joint", "Pain over the right si joint", [K.LSIR]],
    ["EN-03 sciatica to calf", "Pain down to the right calf", [K.RCAR]],
    ["EN-04 sciatica thigh", "The pain goes down the back of my left thigh", [K.RPTL]],
    ["EN-05 foot numbness", "Numbness on the top of the foot", [K.RDORS]],
    ["EN-06 coccyx", "Tailbone pain when I sit", [K.LCOC, K.ASIT]],
    ["EN-07 sitting time", "Sitting for more than 30 minutes brings it on", [K.ASIT30]],
    ["EN-08 standing time", "Standing for more than 15 minutes hurts", [K.ASTAND15]],
    ["EN-09 side lying", "Lying on my right side hurts", [K.ALR]],
    ["EN-10 knees bent", "Lying on my back with my knees bent helps", [K.PCROOK]],
    ["EN-11 on elbows", "Lying on my stomach on my elbows eases it", [K.PELBOW]],
    ["EN-12 trolley", "Leaning on the trolley helps when I walk round the supermarket", [K.PLEAN]],
    ["EN-13 night", "Worse at night and wakes me", [K.PNIGHT]],
    ["EN-14 early hours", "Pain wakes me at 3 am", [K.PSECOND]],
    ["EN-15 leg numbness", "Numbness in the right leg", [K.NR]],
    ["EN-16 cauda", "Numb in the saddle area", [K.CSADDLE]],
    ["EN-17 retention", "Cannot pass urine", [K.CRET]],
    ["EN-18 incontinence", "Leaking urine since this started", [K.CINCB]],
    ["EN-19 inflammatory", "Pain alternating between the buttocks", [K.IFALT]],
    ["EN-20 family", "My father has ankylosing spondylitis", [K.IFFAM]],
    ["EN-21 cancer", "History of breast cancer", [K.SCA]],
    ["EN-22 AAA", "Pulsatile mass in the abdomen", [K.SAAA]],
    ["EN-23 function", "Cant put my socks on", [K.DSHOES]],
    ["EN-24 work", "On light duties at work", [K.WMOD]],
    ["HI-01", "kamar ke neeche wale hisse me dard hai", [K.LLOW]],
    ["HI-02", "kamar ke bayen taraf dard", [K.LPARL]],
    ["HI-03", "dayen si joint me dard", [K.LSIR]],
    ["HI-04", "dard dayen pindli tak utarta hai", [K.RCAR]],
    ["HI-05", "peshab nahi ho pa raha", [K.CRET]],
    ["HI-06", "gaadi chalane me dikkat", [K.DDRIVE]],
    ["DE-01", "कमर के बीच में दर्द है", [K.LMID, K.LCEN]],
    ["DE-02", "पेशाब रुक गया है", [K.CRET]],
    ["DE-03", "दोनों पैरों में सुन्नपन", [K.NBIL]],
  ];
  for (const [n, text, want] of STORY) it(n, () => { expect(pick(text)).toEqual(sorted(want)); });
});

describe("nothing should be suggested", () => {
  const SILENT = [
    ["empty", ""], ["spaces", "   \n\t  "], ["punctuation", "!!! ... ??? ,,,"], ["gibberish", "asdf qwerty zxcv lkjh"],
    ["numbers", "12345 67890 3.14"], ["emoji", "😀😀 🙏"],
    ["knee", "my knee hurts at night"], ["neck", "neck pain when I look up"], ["upper back", "upper back pain between the shoulder blades"],
    ["foot", "plantar fasciitis in the right foot"], ["head", "sir me dard hai"], ["idiom", "that guy is a pain in the neck"],
    ["friend's back", "my friend has back pain"], ["relative's cancer", "my uncle had bowel cancer"], ["relative's cancer, Hindi", "मेरी मौसी को कैंसर था"],
    ["no history of cancer", "no history of cancer"], ["no night pain", "no night pain"], ["right now", "right now I am a bit tired"],
    ["hostile markup", "<script>alert(1)</script> {{7*7}} ${x}"],
  ];
  for (const [n, text] of SILENT) it(n, () => { expect(pick(text)).toEqual([]); });
});

describe("left and right", () => {
  it("SI joint", () => {
    expect(pick("left sacroiliac joint is very tender")).toEqual([K.LSIL]);
    expect(pick("pain over the right si joint")).toEqual([K.LSIR]);
    expect(pick("both si joints")).toEqual([K.LSIB]);
  });
  it("buttock upper and lower, per side", () => {
    expect(pick("pain in the upper part of the left buttock")).toEqual([K.LBULU]);
    expect(pick("pain under the right buttock")).toEqual([K.LBURL]);
  });
  it("side of the spine, but not 'right at the bottom'", () => {
    expect(pick("pain to the right of the spine in the lumbar area")).toEqual([K.LPARR]);
    expect(pick("pain right at the bottom of the spine where it meets the pelvis, L5 S1")).toEqual([K.LSJ]);
  });
  it("Hinglish and Hindi spellings of left and right", () => {
    for (const t of ["baayen pair me sunnpan", "bayein pair me sunnpan", "बाएं पैर में सुन्नपन", "बायीं पैर में सुन्नपन"]) expect(pick(t)).toContain(K.NL);
    for (const t of ["daayen pair me sunnpan", "dahine pair me sunnpan", "दाएं पैर में सुन्नपन", "दायीं पैर में सुन्नपन"]) expect(pick(t)).toContain(K.NR);
  });
  it("both sides in one sentence give both answers (the single question reports it as ambiguous)", () => {
    const got = understandStory("numbness in the left leg and tingling in the right leg");
    expect(got.byField.neuroPresent).toEqual(expect.arrayContaining([name(K.NL), name(K.NR)]));
    expect(got.ambiguous).toContain("neuroPresent");
  });
  it("a plain 'lower back' does not become a lumbar level or a buttock part", () => {
    expect(pick("an ache in the lower back and left buttock")).toEqual([]);
  });
});

describe("sitting and standing times", () => {
  it("sitting", () => {
    expect(pick("after sitting twenty minutes it starts")).toEqual([K.ASIT15]);
    expect(pick("sitting for 45 minutes")).toEqual([K.ASIT30]);
    expect(pick("cannot sit longer than an hour")).toEqual([K.ASIT60]);
    expect(pick("sitting beyond half an hour is a problem")).toEqual([K.ASIT30]);
  });
  it("standing", () => {
    expect(pick("i cant stand for more than twenty minutes")).toEqual([K.ASTAND15]);
    expect(pick("standing in the kitchen for half an hour is too much")).toEqual([K.ASTAND30]);
  });
  it("a very short time is left to the student", () => {
    expect(pick("sitting for 10 minutes")).toEqual([]);
  });
  it("sitting bone and sofa wording do not become 'sitting'", () => {
    expect(pick("sore on my left sitting bone")).toEqual([K.LISCL]);
    expect(pick("soft sofas make it much worse")).toEqual([K.ASOFT]);
  });
});

describe("time off work", () => {
  it("weeks and months", () => {
    expect(pick("off work for two weeks")).toEqual([K.WSHORT]);
    expect(pick("off sick for six weeks")).toEqual([K.WMED]);
    expect(pick("off work for three months")).toEqual([K.WMED]);
    expect(pick("off sick for a year")).toEqual([K.WLONG]);
    expect(pick("do hafte se kaam par nahi gaya")).toEqual([K.WSHORT]);
  });
  it("job loss and no return", () => {
    expect(pick("lost my job because of the back")).toEqual([K.WUNEMP]);
    expect(pick("can never go back to my old job")).toEqual([K.WUNABLE]);
  });
});

describe("negation, and a statement that is itself a 'no'", () => {
  it("'no' cancels what follows", () => { expect(pick("no night pain")).toEqual([]); });
  it("'nahi' after the phrase cancels it", () => { expect(pick("dard raat ko nahi hota")).toEqual([]); });
  it("'no leg symptoms' IS the answer for the leg question", () => { expect(pick("no numbness or tingling in the legs")).toEqual([K.NNO]); });
  it("'no cauda equina signs' / 'no fracture indicators' / 'no other red flags' are answers", () => {
    expect(pick("no cauda equina signs")).toEqual([K.CNO]);
    expect(pick("no fracture indicators")).toEqual([K.FRNO]);
    expect(pick("no other red flags")).toEqual([K.SNO]);
  });
  it("'no work impact' / 'no limitations' are answers", () => {
    expect(pick("no work impact")).toEqual([K.WNO]);
    expect(pick("no limitations in daily activities")).toEqual([K.DNONE]);
  });
  it("'did not help' is not a posture that relieves", () => { expect(pick("lying flat did not help at all")).not.toContain(K.PFLAT); });
});

describe("the single-choice questions", () => {
  it("bladder baseline", () => {
    expect(pick("my bladder and bowels were normal before the pain started")).toEqual([K.BNORM]);
    expect(pick("i had bladder problems for years before the pain")).toEqual([K.BBLAD]);
    expect(pick("cant remember if my bladder was normal before")).toEqual([K.BUNC]);
  });
  it("work impact: one clear answer", () => {
    expect(understandStory("working half days now").byField.workImpact).toEqual([name(K.WRED)]);
  });
  it("an answer with 'but' in its own text still works when pasted whole", () => {
    expect(pick("Mild discomfort — full duties")).toEqual([K.WMILD]);
  });
});

describe("safety around the red flags", () => {
  it("'None' is never suggested next to a real red flag of the same screen", () => {
    const got = understandStory("cannot pass urine, no other cauda equina signs");
    expect(got.byField.redFlagsCauda || []).not.toContain(name(K.CNO));
  });
  it("a relative's cancer is never the patient's, but the patient's own is", () => {
    expect(pick("my grandfather had cancer")).toEqual([]);
    expect(pick("I had cancer in 2015")).toEqual([K.SCA]);
  });
  it("retention and incontinence are different flags", () => {
    expect(pick("unable to empty my bladder")).toEqual([K.CRET]);
    expect(pick("wetting myself without realising")).toEqual([K.CINCB]);
  });
  it("'pehle se peshab ki dikkat thi' is the baseline answer, not retention", () => {
    expect(pick("pehle se peshab ki dikkat thi")).toEqual([K.BBLAD]);
  });
  it("bilateral pain is not 'bilateral sciatica' unless sciatica is said", () => {
    expect(pick("pain goes down both legs")).toEqual([K.RBIL]);
    expect(pick("new sciatica in both legs")).toEqual([K.CBISC]);
  });
  it("osteoporosis with a small fall is flagged, a relative's is not", () => {
    expect(pick("has osteoporosis and slipped on a wet floor")).toEqual([K.FROSTEO]);
    expect(pick("her mother has osteoporosis and slipped on a wet floor")).toEqual([]);
  });
});

describe("typing straight into one question's own box", () => {
  const f = (field, text) => understandField(field, text).byField[field] || [];
  it("Location: bare words count", () => {
    expect(f("location", "coccyx")).toEqual([name(K.LCOC)]);
    expect(f("location", "sacrum")).toEqual([name(K.LSAC)]);
  });
  it("Postures: bare words count only in their own box", () => {
    expect(f("aggPostures", "driving")).toEqual([name(K.ADRIVE)]);
    expect(f("relPostures", "on all fours")).toEqual([name(K.PALL4)]);
    expect(pick("driving")).toEqual([]);
  });
  it("Leg symptoms and bladder baseline: a bare 'no' / 'uncertain'", () => {
    expect(f("neuroPresent", "no")).toEqual([name(K.NNO)]);
    expect(f("bladderBaseline", "uncertain")).toEqual([name(K.BUNC)]);
  });
  it("Red flags: a bare 'cancer' and a bare 'hla b27' count only inside their own box", () => {
    expect(f("redFlagsSerious", "cancer")).toEqual([name(K.SCA)]);
    expect(f("redFlagsInflammatory", "hla b27")).toEqual([name(K.IFHLA)]);
    expect(pick("cancer")).toEqual([]);
  });
  it("only the box's own question is answered", () => {
    expect(understandField("overallPattern", "cannot pass urine").suggestions).toEqual([]);
  });
});

describe("robustness", () => {
  it("a huge paste does not hang or throw", () => {
    const big = "pain on the left side of the lower back and it is worse at night. ".repeat(2000);
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
  it("a sentence joined with 'but' is read as two halves, so a trip-without-fall is missed", () => {
    expect(pick("I tripped on the kerb but did not fall, jarred my back")).not.toContain(K.MSTUMBLE);
  });
  it("a bare age does not tick 'Age of onset <45'; the student must say when it started", () => {
    expect(pick("he is 28 years old with low back pain")).not.toContain(K.IFAGE);
  });
  it("'sciatica' on its own does not choose a leg area", () => {
    expect(pick("left sided sciatica")).toEqual([]);
  });
});
