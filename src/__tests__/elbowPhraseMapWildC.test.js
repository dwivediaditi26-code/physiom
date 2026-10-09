// elbowPhraseMapWildC.test.js -- Set C: written AFTER the word-order rules were frozen, so the rules
// were never tuned against it. It is the fair exam. (Set A found what version 1 missed; Set B was
// written just before the rules and the rules were shaped with it in mind; both are "seen" now.)
//
// It deliberately includes sentences the matcher is expected to miss, and tricky look-alikes it may
// get wrong, so the numbers are honest. `want` is what a physio would tick. Where pain comes "from
// lifting the baby" both the mechanism and the aggravating movement are wanted.
import { describe, it, expect } from "vitest";
import { ELBOW_PHRASES, understandStory } from "../elbowPhraseMap.js";

const O = (field, i) => Object.keys(ELBOW_PHRASES[field])[i];
const LAT = O("location", 0), MED = O("location", 1), FORE = O("location", 4), RAD = O("location", 7);
const INTOF = O("radiation", 1), MEDN = O("radiation", 3), ULNN = O("radiation", 4), NORAD = O("radiation", 0);
const FALL = O("mechanism", 1), REPG = O("mechanism", 2), RACQ = O("mechanism", 3), GOLF = O("mechanism", 4), TRAUMA = O("mechanism", 6), VIB = O("mechanism", 7);
const GRIP = O("aggravating", 0), LIFT = O("aggravating", 1), SUST = O("aggravating", 6), TYPE = O("aggravating", 5);
const CONST = O("pattern", 0), INTER = O("pattern", 1), MORN = O("pattern", 2), NIGHT = O("pattern", 3), ACT = O("pattern", 4);
const NNONE = O("neuro", 0), NCARP = O("neuro", 1), NCUB = O("neuro", 2), WEAK = O("neuro", 3), DROP = O("neuro", 4), WASTE = O("neuro", 5);
const FRAC = O("redFlags", 0), COMP = O("redFlags", 3), HOT = O("redFlags", 4), BILAT = O("redFlags", 5);
const k = (field, option) => `${field}|${option}`;

const WILD_C = [
  // ── English ──
  ["en", "I've had this nagging ache on the outer side of my right elbow for about six weeks", [k("location", LAT)]],
  ["en", "it really hurts when I lift a full kettle or carry shopping bags", [k("aggravating", LIFT)]],
  ["en", "my forearm feels tight and the pain shoots towards my wrist", [k("location", FORE)]],
  ["en", "pain is on the inner part of the elbow near the bony bump, I think it's golfer's elbow", [k("location", MED)]],
  ["en", "I started swimming a lot more and then this began", []],
  ["en", "I work on a construction site with a jackhammer all day", [k("mechanism", VIB)]],
  ["en", "it hurts mostly when I'm gripping the steering wheel on long drives", [k("aggravating", SUST), k("aggravating", GRIP)]],
  ["en", "I get pins and needles in my thumb and first two fingers, mostly when I sleep", [k("radiation", MEDN), k("neuro", NCARP)]],
  ["en", "the little finger goes numb whenever my elbow stays bent, like on a phone call", [k("neuro", NCUB), k("radiation", ULNN)]],
  ["en", "no numbness, no weakness, nothing like that", [k("neuro", NNONE)]],
  ["en", "I slipped on the stairs and put my hand out to stop the fall", [k("mechanism", FALL)]],
  ["en", "my wrist is swollen, very hot and red since yesterday and I feel feverish", [k("redFlags", HOT)]],
  ["en", "pain lasts the whole day and doesn't ease even with rest", [k("pattern", CONST)]],
  ["en", "pain flares up now and then for a few days and then settles", [k("pattern", INTER)]],
  ["en", "the elbow is most painful when I first get out of bed", [k("pattern", MORN)]],
  ["en", "I often wake up at 3am with a throbbing arm", [k("pattern", NIGHT)]],
  ["en", "it only hurts while I'm actually playing squash", [k("pattern", ACT), k("mechanism", RACQ)]],
  ["en", "swelling around the elbow has doubled in a few hours and the pain is unbearable", [k("redFlags", COMP)]],
  ["en", "both of my wrists ache in the mornings", [k("redFlags", BILAT), k("pattern", MORN)]],
  ["en", "I crashed my scooter and landed on the elbow", [k("mechanism", TRAUMA)]],
  ["en", "my fingers feel clumsy and I drop my keys", [k("neuro", DROP)]],
  ["en", "the thumb muscles look flat and hollow compared to the other hand", [k("neuro", WASTE)]],
  ["en", "tennis elbow I guess, started after a weekend of badminton", [k("location", LAT), k("mechanism", RACQ)]],
  ["en", "it does not radiate anywhere, stays right at the elbow", [k("radiation", NORAD)]],
  ["en", "the pain travels from the elbow down to my ring finger and pinky", [k("radiation", INTOF)]],
  ["en", "I think I broke my wrist, it looks bent and is very swollen", [k("redFlags", FRAC)]],
  ["en", "I type reports all day and my wrist is aching", [k("aggravating", TYPE)]],
  ["en", "the doctor said nothing is broken", []],
  ["en", "I was not injured in any accident", []],
  ["en", "my elbow does not hurt when I lift things", []],
  ["en", "the pain is not worse in the morning", []],
  // ── Hinglish ──
  ["hi", "kohni ke bahar ki side pe dard hai", [k("location", LAT)]],
  ["hi", "bag uthate waqt haath me dard hota hai", [k("aggravating", LIFT)]],
  ["hi", "tennis khelne ke baad se kohni dukh rahi hai", [k("mechanism", RACQ)]],
  ["hi", "raat ko hath sunn ho jata hai aur neend khul jati hai", [k("neuro", NCARP)]],
  ["hi", "haath se glass chhut jata hai", [k("neuro", DROP)]],
  ["hi", "pakadne me bahut takleef hoti hai", [k("aggravating", GRIP)]],
  ["hi", "kohni ke andar wali side dard hai, golf khelta hu", [k("mechanism", GOLF)]],
  ["hi", "dono kalai me dard hai", [k("redFlags", BILAT)]],
  ["hi", "subah uthte waqt dard zyada hota hai", [k("pattern", MORN)]],
  ["hi", "dard lagatar bana rehta hai din raat", [k("pattern", CONST)]],
  ["hi", "dard aata-jata rehta hai", [k("pattern", INTER)]],
  ["hi", "girne ke baad kohni tedhi ho gayi", [k("redFlags", FRAC)]],
  ["hi", "kalai ke upar ki taraf sujan aur garam", [k("redFlags", HOT)]],
  ["hi", "ungliyon me jhunjhuni hoti hai jab kohni mudti hai", [k("neuro", NCUB)]],
  ["hi", "kamzori ki wajah se cup nahi pakad pata", [k("neuro", WEAK)]],
  ["hi", "mere haath ki mansapeshiyan patli ho gayi hain", [k("neuro", WASTE)]],
  ["hi", "kapde dhone ke baad kohni me dard shuru hua", [k("mechanism", REPG)]],
  ["hi", "mujhe chot nahi lagi kabhi", []],
  ["hi", "kamar dard me bhari saman uthana mushkil hai", []],
  ["hi", "badminton nahi khelta main", []],
  // ── Hindi (Devanagari) ──
  ["de", "कोहनी के बाहर की तरफ दर्द रहता है", [k("location", LAT)]],
  ["de", "बैग उठाते समय हाथ में दर्द होता है", [k("aggravating", LIFT)]],
  ["de", "रात को दर्द ज्यादा बढ़ जाता है", [k("pattern", NIGHT)]],
  ["de", "सुबह सबसे ज्यादा दर्द होता है", [k("pattern", MORN)]],
  ["de", "हाथ में सुन्नपन रात में होता है", [k("neuro", NCARP)]],
  ["de", "हड्डी टूटी हुई लग रही है", [k("redFlags", FRAC)]],
  ["de", "कोहनी पर चोट लगी", [k("mechanism", TRAUMA)]],
  ["de", "सूजन तेजी से बढ़ रही है", [k("redFlags", COMP)]],
  ["de", "दर्द आता जाता रहता है", [k("pattern", INTER)]],
  ["de", "वजन उठाने पर दर्द", [k("aggravating", LIFT)]],
  // ── mixed ──
  ["mx", "elbow ke inner side me pain", [k("location", MED)]],
  ["mx", "morning me wrist stiff aur dard", [k("pattern", MORN)]],
  ["mx", "cup pakadte time outside elbow dard", [k("location", LAT), k("aggravating", GRIP)]],
  ["mx", "thumb ke paas wrist side pain, mobile chalane se", [k("location", RAD)]],
  ["mx", "golf aur tennis dono khelta hu", [k("mechanism", GOLF), k("mechanism", RACQ)]],
  ["mx", "no pain at night, only hurts when I type", [k("aggravating", TYPE)]],
  // ── look-alikes and unrelated: must stay silent ──
  ["en", "I read an article about elbow injuries", []],
  ["en", "my friend has tennis elbow", []],
  ["en", "the elbow macaroni was overcooked", []],
  ["en", "wrist watch repair shop is closed", []],
  ["en", "I need a hand with moving house", []],
  ["en", "thumbs down on that movie", []],
  ["en", "back to work on monday", []],
  ["en", "the grip of the golf club was new", []],
  ["en", "morning sickness and night shifts", []],
  ["en", "I lift my spirits by dancing", []],
  ["en", "heavy rain and strong wind", []],
  ["en", "the hot sun made me red and tired", []],
  ["en", "knee swelling is increasing quickly", []],
  ["en", "I could not sleep because of my cough", []],
  ["en", "pain in my tooth at night", []],
  ["en", "I have pain in my stomach after eating", []],
  ["en", "the Hindi word for elbow is kohni", []],
  ["en", "I woke up and made tea", []],
  ["en", "he has weak eyesight", []],
  ["en", "the hold music was annoying", []],
  ["hi", "paani garam hai", []],
  ["hi", "main raat ko jaldi so jata hu", []],
  ["hi", "bachche school gaye hain", []],
  ["de", "रात का खाना तैयार है", []],
  ["de", "सुबह की सैर अच्छी है", []],
  ["de", "कमर और घुटने में दर्द है", []],
];

function score(rows) {
  let suggested = 0, right = 0, wanted = 0, found = 0;
  const wrong = [], missed = [];
  for (const [lang, text, want] of rows) {
    const got = understandStory(text).suggestions.map((s) => k(s.field, s.option));
    const wantSet = new Set(want);
    for (const g of got) { suggested++; if (wantSet.has(g)) right++; else wrong.push(`[${lang}] "${text}" -> WRONG ${g}`); }
    for (const w of want) { wanted++; if (got.includes(w)) found++; else missed.push(`[${lang}] "${text}" -> MISSED ${w}`); }
  }
  return { suggested, right, wanted, found, wrong, missed, precision: suggested ? right / suggested : 1, recall: wanted ? found / wanted : 1 };
}

// FIRST measurement on Set C (the rules untouched since Set B): precision 92.6% (4 wrong of 54),
// recall 74.6% (found 50 of 67). Its problems (negation reaching "not injured in any accident",
// "my friend has tennis elbow", a few missing everyday words) were then fixed in general ways, after
// which Set C scores precision 97.0%, recall 95.5% -- so Set C is a "seen" set too.
// The floors only guard against getting worse.
const MIN_PRECISION = 0.94;
const MIN_RECALL = 0.9;

describe("Set C: the fair exam (written after the rules were frozen)", () => {
  it("has 90+ sentences, including 30+ that must stay silent", () => {
    expect(WILD_C.length).toBeGreaterThanOrEqual(90);
    expect(WILD_C.filter((r) => r[2].length === 0).length).toBeGreaterThanOrEqual(30);
  });
  it("precision stays at or above the recorded floor", () => {
    const s = score(WILD_C);
    expect(s.precision, `wrong:\n${s.wrong.join("\n")}`).toBeGreaterThanOrEqual(MIN_PRECISION);
  });
  it("recall stays at or above the recorded floor", () => {
    expect(score(WILD_C).recall).toBeGreaterThanOrEqual(MIN_RECALL);
  });
});

export { WILD_C, score };
