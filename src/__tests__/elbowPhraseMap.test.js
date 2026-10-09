// elbowPhraseMap.test.js -- tests for the DRAFT Elbow everyday-phrase matcher.
//
//  1. Structure: every option it can suggest is a real option of the Subjective form,
//     every option has several phrases, no phrase is listed twice.
//  2. Round trip: every drafted phrase, put in a sentence, gives back its own option.
//  3. 110+ hand-written cases: realistic stories (English / Hinglish / Hindi), the
//     "nothing should match" cases (empty, gibberish, other body parts, hostile input),
//     negation ("no tingling", "not worse at night", "nahi"), false-positive traps,
//     red-flag safety, overlapping phrases, and typing straight into one question's box.
//  4. Known limitations, written down on purpose so they are visible, not hidden.
//
// The matcher only SUGGESTS options; a person confirms. These tests check what it suggests.
import { describe, it, expect } from "vitest";
import { SUBJECTIVE_REGION_FIELDS } from "../orthoSubjectiveRegionData.js";
import {
  ELBOW_PHRASES, ELBOW_FIELDS, PHRASE_COUNT, allPhrases, understandStory, understandField,
} from "../elbowPhraseMap.js";

const O = (field, i) => Object.keys(ELBOW_PHRASES[field])[i];
// location
const LAT = O("location", 0), MED = O("location", 1), POST = O("location", 2), ANT = O("location", 3),
  FORE = O("location", 4), DORS = O("location", 5), VOL = O("location", 6), RAD = O("location", 7),
  ULN = O("location", 8), THUMB = O("location", 9), FING = O("location", 10), PALM = O("location", 11);
// radiation
const NORAD = O("radiation", 0), INTOF = O("radiation", 1), UPFA = O("radiation", 2), MEDN = O("radiation", 3), ULNN = O("radiation", 4);
// mechanism
const INSID = O("mechanism", 0), FALL = O("mechanism", 1), REPG = O("mechanism", 2), RACQ = O("mechanism", 3),
  GOLF = O("mechanism", 4), THUMBUSE = O("mechanism", 5), TRAUMA = O("mechanism", 6), VIB = O("mechanism", 7);
// aggravating
const GRIP = O("aggravating", 0), LIFT = O("aggravating", 1), WEXT = O("aggravating", 2), WFLEX = O("aggravating", 3),
  THMOV = O("aggravating", 4), TYPE = O("aggravating", 5), SUST = O("aggravating", 6);
// pattern
const CONST = O("pattern", 0), INTER = O("pattern", 1), MORN = O("pattern", 2), NIGHT = O("pattern", 3), ACT = O("pattern", 4), IMPR = O("pattern", 5);
// neuro
const NNONE = O("neuro", 0), NCARP = O("neuro", 1), NCUB = O("neuro", 2), WEAK = O("neuro", 3), DROP = O("neuro", 4), WASTE = O("neuro", 5);
// red flags
const FRAC = O("redFlags", 0), SNUFF = O("redFlags", 1), TEND = O("redFlags", 2), COMP = O("redFlags", 3),
  HOT = O("redFlags", 4), BILAT = O("redFlags", 5), RFNONE = O("redFlags", 6);

const HINGLISH_MARKERS = /\b(kohni|dard|haath|kalai|ungli|angutha|nahi|raat|subah|kamzor|sunnpan|jhunjhuni|uthana|uthane|pakad|pakadne|sujan|chot|gir|dono|kaam|hatheli|bachche|khelne|kabhi|hamesha|lagatar|bina|apne|dheere|zyada|koi|kapde|balti|bhari|baar|hathode|phenkne|seedhi|tedha|toot|aaram|neend|achanak|chalane|sunn|mutthi|hilane|der|din|ek|aata|thodi|kaaran|saman|patla|patli|mansapeshi|tezi|jaldi|garam|laal|dusre|kampan|naye|texting|khatre)\b/i;

const sorted = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]).sort(([a], [b]) => (a < b ? -1 : 1)));

describe("structure of the phrase list", () => {
  const formFields = Object.fromEntries(SUBJECTIVE_REGION_FIELDS.elbowWristHand.map((f) => [f.id, f]));

  it("covers the 7 questions that change the AI Objective Assessment ranking", () => {
    expect([...ELBOW_FIELDS].sort()).toEqual(["aggravating", "location", "mechanism", "neuro", "pattern", "radiation", "redFlags"]);
  });

  it("every option it can suggest exists, spelled exactly, in the Subjective form", () => {
    const missing = [];
    for (const field of ELBOW_FIELDS) {
      const real = new Set(formFields[field].options);
      for (const option of Object.keys(ELBOW_PHRASES[field])) if (!real.has(option)) missing.push(`${field}: ${option}`);
    }
    expect(missing).toEqual([]);
  });

  it("every option of those 7 questions has phrases (nothing in the form is left out)", () => {
    const left = [];
    for (const field of ELBOW_FIELDS) for (const option of formFields[field].options) if (!ELBOW_PHRASES[field][option]) left.push(`${field}: ${option}`);
    expect(left).toEqual([]);
  });

  it("every option has at least 8 drafted phrases", () => {
    const thin = [];
    for (const field of ELBOW_FIELDS) for (const [option, list] of Object.entries(ELBOW_PHRASES[field])) if (list.length < 8) thin.push(`${field}: ${option} (${list.length})`);
    expect(thin).toEqual([]);
  });

  it("has well over 200 phrases", () => {
    expect(PHRASE_COUNT).toBeGreaterThanOrEqual(200);
  });

  it("each of English, Hinglish and Hindi (Devanagari) is represented for every option", () => {
    const lacking = [];
    for (const field of ELBOW_FIELDS) for (const [option, list] of Object.entries(ELBOW_PHRASES[field])) {
      const text = list.join(" ");
      if (!/[ऀ-ॿ]/.test(text)) lacking.push(`${field}: ${option} has no Hindi`);
      if (!HINGLISH_MARKERS.test(text)) lacking.push(`${field}: ${option} has no Hinglish`);
    }
    expect(lacking).toEqual([]);
  });

  it("no non-bare phrase is listed twice across the whole list", () => {
    const seen = new Map(); const dups = [];
    for (const p of allPhrases().filter((x) => !x.bare)) {
      const prior = seen.get(p.key);
      if (prior && (prior.field !== p.field || prior.option !== p.option)) dups.push(`"${p.key}" -> ${prior.field}/${prior.option} AND ${p.field}/${p.option}`);
      seen.set(p.key, p);
    }
    expect(dups).toEqual([]);
  });

  it("no bare word points at two different options inside one question", () => {
    const seen = new Map(); const dups = [];
    for (const p of allPhrases().filter((x) => x.bare)) {
      const k = p.field + "|" + p.key; const prior = seen.get(k);
      if (prior && prior !== p.option) dups.push(`${p.field}: "${p.key}" -> ${prior} AND ${p.option}`);
      seen.set(k, p.option);
    }
    expect(dups).toEqual([]);
  });
});

describe("round trip: every drafted phrase gives back its own option", () => {
  it("typed into its own question's box (all phrases, including bare words)", () => {
    const failures = [];
    for (const p of allPhrases()) {
      const got = understandField(p.field, `since two weeks ${p.key} thanks`).byField[p.field] || [];
      if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}" -> ${JSON.stringify(got)}`);
    }
    expect(failures).toEqual([]);
  });

  it("written inside a free story (phrases that carry their own context)", () => {
    const failures = [];
    for (const p of allPhrases().filter((x) => !x.bare)) {
      const got = understandStory(`since two weeks ${p.key} thanks`).byField[p.field] || [];
      if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}" -> ${JSON.stringify(got)}`);
    }
    expect(failures).toEqual([]);
  });

  it("capital letters, extra spaces, tabs and new lines make no difference", () => {
    const failures = [];
    for (const p of allPhrases().filter((x) => !x.bare && !/[ऀ-ॿ]/.test(x.key))) {
      const messy = `\n  SINCE   TWO WEEKS\t${p.key.toUpperCase().split(" ").join("   ")}!!!  `;
      const got = understandStory(messy).byField[p.field] || [];
      if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}"`);
    }
    expect(failures).toEqual([]);
  });
});

// ───────────────────────────── hand-written cases ─────────────────────────────
// [name, text, expected byField]  -- the result must be EXACTLY this (nothing extra).
const STORY = [
  // English stories
  ["EN-01 tennis elbow story", "Pain on the outside of my elbow for 3 weeks, hurts when I grip a cup", { location: [LAT], aggravating: [GRIP] }],
  ["EN-02 tennis elbow + tennis", "Tennis elbow, I play tennis every weekend", { location: [LAT], mechanism: [RACQ] }],
  ["EN-03 golfer's elbow", "Inner elbow pain after playing golf", { location: [MED], mechanism: [GOLF] }],
  ["EN-04 fall and crack", "I fell on my hand last week and heard a crack", { mechanism: [FALL], redFlags: [FRAC] }],
  ["EN-05 night pain and night numbness", "Pain at night and numbness at night in my hand", { pattern: [NIGHT], neuro: [NCARP] }],
  ["EN-06 ulnar fingers", "Numbness in ring and little finger since a month", { radiation: [ULNN] }],
  ["EN-07 heavy bags + forearm", "I carry heavy bags every day and my forearm aches", { mechanism: [REPG], location: [FORE] }],
  ["EN-08 drill + back of elbow", "Using a drill machine at work, pain in the back of the elbow", { mechanism: [VIB], location: [POST] }],
  ["EN-09 typing", "Pain when typing for hours", { aggravating: [TYPE] }],
  ["EN-10 no injury", "No injury, it started on its own", { mechanism: [INSID] }],
  ["EN-11 both elbows", "Both elbows hurt", { redFlags: [BILAT] }],
  ["EN-12 fingers + weak grip", "Pain going into the fingers and weak grip", { radiation: [INTOF], neuro: [WEAK] }],
  ["EN-13 thumb side wrist", "The thumb side of my wrist hurts", { location: [RAD] }],
  ["EN-14 dropping things", "I keep dropping things and my hand feels weak", { neuro: [DROP, WEAK] }],
  ["EN-15 cubital tunnel", "Tingling when elbow bent, especially on the phone", { neuro: [NCUB] }],
  ["EN-16 new mother", "New mom, lifting my baby all day, pain at the base of my thumb", { mechanism: [THUMBUSE], location: [THUMB] }],
  ["EN-17 sustained grip", "Pain holding the steering wheel", { aggravating: [SUST] }],
  ["EN-18 morning stiffness", "Stiff in the morning", { pattern: [MORN] }],
  ["EN-19 wrist back, backhand", "Back of the wrist hurts and pain on backhand", { location: [DORS], aggravating: [WEXT] }],
  ["EN-20 improves through the day", "It loosens up during the day", { pattern: [IMPR] }],
  // Hinglish
  ["HI-01", "kohni ke bahar dard hai aur pakadne me dard", { location: [LAT], aggravating: [GRIP] }],
  ["HI-02", "haath ke bal gir gaya, kohni tedhi lag rahi hai", { mechanism: [FALL], redFlags: [FRAC] }],
  ["HI-03", "raat ko dard zyada hota hai aur raat ko haath sunn ho jata hai", { pattern: [NIGHT], neuro: [NCARP] }],
  ["HI-04", "subah uthte hi dard hota hai", { pattern: [MORN] }],
  ["HI-05", "dono haath me jhunjhuni", { redFlags: [BILAT] }],
  ["HI-06", "cricket me bowling karta hoon", { mechanism: [GOLF] }],
  ["HI-07", "bachche ko uthane se kohni me dard", { mechanism: [THUMBUSE] }],
  ["HI-08", "kuhni ke bahar darad hai", { location: [LAT] }],
  ["HI-09", "weight uthane me dard", { aggravating: [LIFT] }],
  ["HI-10", "haath me kamzori hai", { neuro: [WEAK] }],
  ["HI-11", "angutha aur pehli do ungliyon me sunnpan", { radiation: [MEDN] }],
  ["HI-12", "ungliyon tak dard jata hai", { radiation: [INTOF] }],
  ["HI-13", "dard ek hi jagah rehta hai", { radiation: [NORAD] }],
  ["HI-14", "tennis khelne se kohni ke bahar dard", { mechanism: [RACQ], location: [LAT] }],
  ["HI-15", "kapde nichodna aur balti uthana roz ka kaam hai", { mechanism: [REPG] }],
  ["HI-16", "bina chot ke dheere dheere shuru hua", { mechanism: [INSID] }],
  ["HI-17", "kohni par chot lagi thi", { mechanism: [TRAUMA] }],
  ["HI-18", "kabhi kabhi dard hota hai", { pattern: [INTER] }],
  ["HI-19", "lagatar dard rehta hai", { pattern: [CONST] }],
  ["HI-20", "computer par kaam karne se dard", { aggravating: [TYPE] }],
  // Hindi (Devanagari)
  ["DE-01", "कोहनी के बाहर दर्द है और पकड़ने में दर्द", { location: [LAT], aggravating: [GRIP] }],
  ["DE-02", "टेनिस खेलने से कोहनी के बाहर दर्द", { mechanism: [RACQ], location: [LAT] }],
  ["DE-03", "हाथ के बल गिर गया और हड्डी टूट गई", { mechanism: [FALL], redFlags: [FRAC] }],
  ["DE-04", "रात को दर्द और रात को हाथ सुन्न", { pattern: [NIGHT], neuro: [NCARP] }],
  ["DE-05", "सुबह उठते ही दर्द", { pattern: [MORN] }],
  ["DE-06", "दोनों हाथ में दर्द", { redFlags: [BILAT] }],
  ["DE-07", "पकड़ कमजोर हो गई है", { neuro: [WEAK] }],
  ["DE-08", "वजन उठाने में दर्द", { aggravating: [LIFT] }],
  ["DE-09", "कोहनी के पीछे दर्द", { location: [POST] }],
  ["DE-10", "दर्द फैलता नहीं", { radiation: [NORAD] }],
  ["DE-11", "उंगलियों तक दर्द", { radiation: [INTOF] }],
  ["DE-12", "बिना चोट के धीरे धीरे शुरू हुआ", { mechanism: [INSID] }],
  // Spelling and mixed-language
  ["MX-01 mixed", "pakadne par dard, outer elbow", { aggravating: [GRIP], location: [LAT] }],
  ["MX-02 spelling kehni", "kehni ke bahar dard", { location: [LAT] }],
  ["MX-03 spelling nahin + spread", "dard failta nahin hai", { radiation: [NORAD] }],
  ["MX-04 Devanagari with chandrabindu", "उँगलियों तक दर्द जाता है", { radiation: [INTOF] }],
  ["MX-05 apostrophes", "It doesn’t radiate", { radiation: [NORAD] }],
  ["MX-06 hyphen", "Night-pain, thumb-side wrist", { pattern: [NIGHT], location: [RAD] }],
  // Negation
  ["NG-01", "No pain on gripping", {}],
  ["NG-02", "It does not hurt when I grip things", {}],
  ["NG-03", "no radiation", { radiation: [NORAD] }],
  ["NG-04", "the pain doesn't spread", { radiation: [NORAD] }],
  ["NG-05 not worse at night", "pain is not worse at night", {}],
  ["NG-06 not constant but intermittent", "pain is not constant, it comes and goes", { pattern: [INTER] }],
  ["NG-07 no red flags", "no red flags", { redFlags: [RFNONE] }],
  ["NG-08 never fell", "I never fell on my hand", {}],
  ["NG-09 didn't fall", "I didn't fall on my hand", {}],
  ["NG-10 Hinglish nahi (after)", "kohni ke bahar dard nahi hai", {}],
  ["NG-11 Hindi nahin (after)", "कोहनी के बाहर दर्द नहीं है", {}],
  ["NG-12 no nerve symptoms at all", "no numbness or tingling or weakness", { neuro: [NNONE] }],
  ["NG-13 None + night pain", "no neurological symptoms but pain at night", { neuro: [NNONE], pattern: [NIGHT] }],
  ["NG-14 no tingling but weak grip", "no tingling but weak grip", { neuro: [WEAK] }],
  ["NG-15 gripping yes, lifting no", "pain with gripping, no pain with lifting", { aggravating: [GRIP] }],
  ["NG-16 list: no tennis, no badminton", "no tennis, no badminton", {}],
  ["NG-17 I don't play tennis or badminton", "I don't play tennis or badminton", {}],
  ["NG-18 negation does not leak across a comma", "no tingling, hurts when I grip", { aggravating: [GRIP] }],
  ["NG-19 negation does not leak across 'but'", "no pain at night but hurts when I grip", { aggravating: [GRIP] }],
  ["NG-20 no swelling or fracture is not 'none of the above'", "no fracture, no swelling", {}],
  ["NG-21 'no injury' means gradual onset (self-negating phrase)", "no injury at all", { mechanism: [INSID] }],
  ["NG-22 relief is not aggravation", "pain gets better with lifting", {}],
  ["NG-23 relief clause then real aggravation", "rest helps, gripping makes it worse", { aggravating: [GRIP] }],
  ["NG-24 only one tingling item negated: ring/little finger numbness stays", "no thumb pain but numbness in ring and little finger", { radiation: [ULNN] }],
  // Overlap / ambiguity / safety
  ["OV-01 longest phrase wins", "thumb side of the wrist hurts", { location: [RAD] }],
  ["OV-02 both patterns ambiguous", "constant pain, never goes away, worse in the morning", { pattern: [CONST, MORN] }],
  ["OV-03 intermittent + activity", "it comes and goes, only hurts when I move it", { pattern: [INTER, ACT] }],
  ["OV-04 'inside of the elbow' is too ambiguous: nothing suggested", "pain on the inside of the elbow", {}],
  ["OV-05 'kohni ke andar' is too ambiguous: nothing suggested", "kohni ke andar dard hai", {}],
  ["OV-06 repeated phrase counted once", "tennis tennis tennis", { mechanism: [RACQ] }],
  ["OV-07 order does not matter", "grip hurts when i grip. outer elbow.", { aggravating: [GRIP], location: [LAT] }],
  ["OV-08 'tennis elbow' is a location, 'tennis' later is the sport", "tennis elbow from tennis", { location: [LAT], mechanism: [RACQ] }],
  ["OV-09 fall + deformity + swelling", "Fell on my hand, elbow looks deformed, swelling is increasing fast", { mechanism: [FALL], redFlags: [FRAC, COMP] }],
  ["OV-10 scaphoid", "Pain at the base of the thumb after a fall", { redFlags: [SNUFF] }],
  ["OV-11 tendon rupture", "suddenly can't straighten finger", { redFlags: [TEND] }],
  ["OV-12 hot red joint", "the joint is hot and red", { redFlags: [HOT] }],
  ["OV-13 Hinglish hot red", "garam aur laal sujan hai", { redFlags: [HOT] }],
  ["OV-14 wasting", "hand muscles have shrunk", { neuro: [WASTE] }],
];

// What must give NOTHING at all.
const NOTHING = [
  ["NU-01 empty", ""], ["NU-02 spaces", "     "], ["NU-03 tabs and newlines", "\n\t \n"],
  ["NU-04 gibberish", "asdfghjkl qwertyuiop"], ["NU-05 greeting", "hello"], ["NU-06 digits", "12345 67890"],
  ["NU-07 emoji", "😀😀🙏"], ["NU-08 knee", "knee pain since monday when I climb stairs"],
  ["NU-09 headache", "headache and fever"], ["NU-10 fine", "I am fine"],
  ["NU-11 Hinglish pain only", "dard hai"], ["NU-12 Hindi pain only", "दर्द है"],
  ["NU-13 punctuation only", "...!!!???"], ["NU-14 the word null", "null"], ["NU-15 the word undefined", "undefined"],
  ["NU-16 html", "<script>alert(1)</script>"], ["NU-17 sql", "'; DROP TABLE patients;--"],
  ["NU-18 just 'elbow'", "elbow"], ["NU-19 just 'wrist'", "wrist"], ["NU-20 just 'hand'", "hand"],
  ["NU-21 just 'pain'", "pain"], ["NU-22 shoulder", "my shoulder hurts when I reach overhead"],
  ["NU-23 neck", "neck stiffness and shoulder blade ache"], ["NU-24 other language (Spanish)", "me duele el codo"],
  ["NU-25 other language (French)", "j'ai mal au coude"], ["NU-26 other script (Arabic)", "ألم في الكوع"],
  ["NU-27 other script (Chinese)", "手肘痛"], ["NU-28 long filler", "lorem ipsum dolor sit amet ".repeat(400)],
];

// Sentences that LOOK like phrases but are not: must not suggest anything.
const TRAPS = [
  ["TR-01 fell asleep", "I fell asleep on my arm"],
  ["TR-02 hot water", "a hot water bottle helps"],
  ["TR-03 throwing up", "I was throwing up yesterday"],
  ["TR-04 back of my mind", "it is at the back of my mind"],
  ["TR-05 thumbs up", "thumbs up"],
  ["TR-06 palm tree", "palm tree near the house"],
  ["TR-07 racket slipped", "the grip of the racket slipped"],
  ["TR-08 hand sanitizer", "hand sanitizer"],
  ["TR-09 accidentally", "I accidentally pressed the button"],
  ["TR-10 morning without pain", "I woke up in the morning and had tea"],
  ["TR-11 night without pain", "we watched a movie at night"],
  ["TR-12 constant as an adjective elsewhere", "the temperature is constant"],
  ["TR-13 lifting without pain", "the lifting of the ban"],
  ["TR-14 typing without pain", "typing speed test"],
  ["TR-15 Hindi unrelated", "आज मौसम अच्छा है"],
  ["TR-16 Hinglish unrelated", "aaj mausam accha hai"],
];

describe("110+ hand-written cases: stories, spellings, negation, overlaps, safety", () => {
  it.each(STORY)("%s", (_n, text, expected) => {
    const got = understandStory(text);
    expect(sorted(got.byField)).toEqual(sorted(expected));
    // a single-choice question with two answers must be flagged, never silently picked
    const multiPattern = (expected.pattern || []).length > 1;
    expect(got.ambiguous).toEqual(multiPattern ? ["pattern"] : []);
  });

  it.each(NOTHING)("%s -> nothing suggested", (_n, text) => {
    expect(understandStory(text).suggestions).toEqual([]);
    for (const f of ELBOW_FIELDS) expect(understandField(f, text).suggestions).toEqual([]);
  });

  it.each(TRAPS)("%s -> nothing suggested", (_n, text) => {
    expect(understandStory(text).suggestions).toEqual([]);
  });

  it("never throws on odd input (null, undefined, numbers, objects, huge text)", () => {
    for (const bad of [null, undefined, 0, 12345, {}, [], true, NaN]) {
      expect(() => understandStory(bad)).not.toThrow();
      expect(understandStory(bad).suggestions).toEqual([]);
      expect(() => understandField("location", bad)).not.toThrow();
    }
    const huge = "outer elbow pain when gripping ".repeat(8000);
    const t0 = Date.now();
    const got = understandStory(huge);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(sorted(got.byField)).toEqual(sorted({ location: [LAT], aggravating: [GRIP] }));
  });

  it("an unknown question gives nothing", () => {
    expect(understandField("shoeSize", "outer elbow").suggestions).toEqual([]);
  });
});

describe("typing straight into one question's own box", () => {
  const F = (field, text) => understandField(field, text).byField[field] || [];
  it.each([
    ["aggravating", "gripping", [GRIP]],
    ["aggravating", "Gripping, Lifting", [GRIP, LIFT]],
    ["aggravating", "typing", [TYPE]],
    ["aggravating", "mouse use", [TYPE]],
    ["aggravating", "thumb movement", [THMOV]],
    ["aggravating", "pakadna", [GRIP]],
    ["aggravating", "uthana", [LIFT]],
    ["aggravating", "पकड़ना", [GRIP]],
    ["aggravating", "no gripping", []],
    ["aggravating", "better with gripping", []],
    ["aggravating", "pain when lifting", [LIFT]],
    ["location", "thumb", [THUMB]],
    ["location", "fingers", [FING]],
    ["location", "palm", [PALM]],
    ["location", "hatheli", [PALM]],
    ["location", "अंगूठा", [THUMB]],
    ["location", "thumb side of the wrist", [RAD]],
    ["location", "lateral elbow and forearm", [LAT, FORE]],
    ["location", "Lateral elbow, Posterior elbow", [LAT, POST]],
    ["location", "outer", []],
    ["location", "pain when gripping", []],
    ["mechanism", "tennis", [RACQ]],
    ["mechanism", "golf", [GOLF]],
    ["mechanism", "fell on my hand", [FALL]],
    ["mechanism", "Fall onto outstretched hand", [FALL]],
    ["mechanism", "no injury", [INSID]],
    ["pattern", "constant", [CONST]],
    ["pattern", "comes and goes", [INTER]],
    ["pattern", "worse at night", [NIGHT]],
    ["pattern", "worse at night and in the morning", [NIGHT]],
    ["pattern", "not constant", []],
    ["neuro", "weak grip", [WEAK]],
    ["neuro", "dropping things", [DROP]],
    ["neuro", "None", [NNONE]],
    ["neuro", "None, weak grip", [WEAK]],
    ["redFlags", "none of the above", [RFNONE]],
    ["redFlags", "both elbows", [BILAT]],
    ["redFlags", "deformity", [FRAC]],
    ["radiation", "no radiation", [NORAD]],
    ["radiation", "into the fingers", [INTOF]],
  ])("%s: %j", (field, text, expected) => {
    expect([...F(field, text)].sort()).toEqual([...expected].sort());
  });
});

describe("red-flag safety", () => {
  const redFlags = (t) => understandStory(t).byField.redFlags || [];
  it("none of the ordinary complaints above suggests a red flag by accident", () => {
    const risky = STORY.filter(([n, , exp]) => !exp.redFlags && !/^(OV-09|OV-10|OV-11|OV-12|OV-13|NG-07)/.test(n));
    const wrong = risky.filter(([, text]) => redFlags(text).length > 0).map(([n]) => n);
    expect(wrong).toEqual([]);
  });
  it.each([
    ["heard a snap and the elbow looks deformed", [FRAC]],
    ["my arm looks crooked after the fall", [FRAC]],
    ["haddi toot gayi", [FRAC]],
    ["tender at the base of the thumb after falling", [SNUFF]],
    ["anatomical snuffbox pain", [SNUFF]],
    ["finger will not extend", [TEND]],
    ["ungli achanak seedhi nahi hoti", [TEND]],
    ["swelling is increasing fast", [COMP]],
    ["sujan tezi se badh rahi hai", [COMP]],
    ["red and swollen joint", [HOT]],
    ["dono kohni me dard", [BILAT]],
    ["both wrists hurt", [BILAT]],
  ])("real warning sign is caught: %s", (text, expected) => {
    expect(redFlags(text).sort()).toEqual([...expected].sort());
  });
  it("'None of the above' is never suggested next to a real warning sign", () => {
    expect(redFlags("no red flags but both elbows hurt")).toEqual([BILAT]);
  });
  it("'None' for nerves is never suggested next to a nerve symptom", () => {
    const got = understandStory("no neurological symptoms, weak grip").byField.neuro;
    expect(got).toEqual([WEAK]);
  });
});

// Written down on purpose. These are the cases the matcher does NOT get right today.
// If one of these starts failing because it got BETTER, update it and say so.
describe("known limitations (documented, not fixed)", () => {
  it("a sport mentioned without playing it still counts: 'golf on TV' suggests Golf / throwing", () => {
    expect(understandStory("I watched golf on tv").byField.mechanism).toEqual([GOLF]);
  });
  it("'dislocated' about another joint still suggests a suspected fracture", () => {
    expect(understandStory("I dislocated my shoulder").byField.redFlags).toEqual([FRAC]);
  });
  it("'both sides of the road' suggests bilateral symptoms", () => {
    expect(understandStory("accident on both sides of the road").byField.redFlags).toEqual([BILAT]);
  });
  it("separate negatives ('no tingling, no numbness, no weakness') are not turned into 'None'", () => {
    expect(understandStory("no tingling, no numbness, no weakness").suggestions).toEqual([]);
  });
  it("misspellings it does not know are missed ('tenis')", () => {
    expect(understandStory("I play tenis").suggestions).toEqual([]);
  });
  it("a different word order is missed ('outer side of the right elbow')", () => {
    expect(understandStory("outer side of the right elbow hurts").suggestions).toEqual([]);
  });
  it("words it was never given are missed ('pickleball' is known, 'padel' is not)", () => {
    expect(understandStory("I play padel").suggestions).toEqual([]);
  });
});
