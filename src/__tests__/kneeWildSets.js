// kneeWildSets.js -- shared by the Knee phrase-matcher tests (not a test itself).
// Sets of messy, real-life sentences written the way students type, each marked with what a physio would
// tick ("field|option"). These answer keys are DRAFTS written by Claude for Aditi to review.
// A = the first exam, used to find what the first draft missed; B and C = fair exams written after the
// earlier sets' fixes and NOT used to tune the matcher until their first run was recorded.
// See kneePhraseMapWild.test.js for the history.
import { KNEE_PHRASES, understandStory } from "../kneePhraseMap.js";

const O = (field, i) => Object.keys(KNEE_PHRASES[field])[i];
const k = (field, i) => `${field}|${O(field, i)}`;
// location
const ANT = k("location", 0), AROUND = k("location", 1), BELOW = k("location", 2), ABOVE = k("location", 3), MEDIAL = k("location", 4),
  LATERAL = k("location", 5), POPL = k("location", 6), TUBER = k("location", 7), DIFFUSE = k("location", 8);
// mechanism
const INSID = k("mechanism", 0), TWIST = k("mechanism", 1), DIRECT = k("mechanism", 2), HYPER = k("mechanism", 3), LAND = k("mechanism", 4),
  PIVOT = k("mechanism", 5), POSTOP = k("mechanism", 6);
// giving way, locking
const GNO = k("givingWay", 0), GPIVOT = k("givingWay", 1), GSTAIRS = k("givingWay", 2), GRANDOM = k("givingWay", 3);
const LKNO = k("locking", 0), LKTRUE = k("locking", 1), LKMOM = k("locking", 2);
// pattern
const CONST = k("pattern", 0), INTER = k("pattern", 1), MORN = k("pattern", 2), NIGHT = k("pattern", 3), ACT = k("pattern", 4), IMPR = k("pattern", 5);
// red flags
const WEIGHT = k("redFlags", 0), SWELLNOW = k("redFlags", 1), LOCKEDK = k("redFlags", 2), HOTRED = k("redFlags", 3), CANCER = k("redFlags", 4), RFNONE = k("redFlags", 5);
export const KEYS = { ANT, AROUND, BELOW, ABOVE, MEDIAL, LATERAL, POPL, TUBER, DIFFUSE, INSID, TWIST, DIRECT, HYPER, LAND, PIVOT, POSTOP,
  GNO, GPIVOT, GSTAIRS, GRANDOM, LKNO, LKTRUE, LKMOM, CONST, INTER, MORN, NIGHT, ACT, IMPR, WEIGHT, SWELLNOW, LOCKEDK, HOTRED, CANCER, RFNONE };

export const KNEE_A = [
  // ── English ──
  ["en", "pain on the inner side of my left knee after twisting while playing football", [MEDIAL, TWIST]],
  ["en", "pain just below the kneecap when I run, I am a basketball player", [BELOW]],
  ["en", "my knee gives way when I go down the stairs", [GSTAIRS]],
  ["en", "the knee gives way when I change direction quickly", [GPIVOT]],
  ["en", "knee buckled out of nowhere while I was walking", [GRANDOM]],
  ["en", "no giving way, the knee feels stable", [GNO]],
  ["en", "it locks and I cannot straighten it, I have to wiggle it free", [LKTRUE]],
  ["en", "it feels like it catches for a second and then releases", [LKMOM]],
  ["en", "no locking or catching", [LKNO]],
  ["en", "it swelled up like a balloon straight after I landed from a jump", [SWELLNOW, LAND]],
  ["en", "I cannot put any weight on the leg since the fall", [WEIGHT]],
  ["en", "the knee is hot, red and very tender", [HOTRED]],
  ["en", "history of cancer in the bone", [CANCER]],
  ["en", "pain at the back of the knee", [POPL]],
  ["en", "pain on the outer side of the knee when running long distance", [LATERAL]],
  ["en", "pain behind the kneecap going down stairs", [AROUND]],
  ["en", "pain above the kneecap", [ABOVE]],
  ["en", "tender bony bump below the knee, I am 13 and play football", [TUBER]],
  ["en", "pain all over the knee, I cannot say exactly where", [DIFFUSE]],
  ["en", "pain at the front of the knee after sitting", [ANT]],
  ["en", "knee pain started after my knee replacement last year", [POSTOP]],
  ["en", "I hit my knee on the dashboard in an accident", [DIRECT]],
  ["en", "my knee bent backwards when I stepped in a hole", [HYPER]],
  ["en", "planted my foot and turned quickly in football, felt a pop", [PIVOT]],
  ["en", "I twisted my knee on the stairs", [TWIST]],
  ["en", "no injury, the pain came on gradually", [INSID]],
  ["en", "the pain is worse at night", [NIGHT]],
  ["en", "there is morning stiffness", [MORN]],
  ["en", "constant pain all day", [CONST]],
  ["en", "the pain comes and goes", [INTER]],
  ["en", "pain only when running", [ACT]],
  ["en", "it gets better as the day goes on", [IMPR]],
  ["en", "I cannot straighten my knee since the injury, it is stuck bent", [LOCKEDK, LKTRUE]],
  ["en", "the knee suddenly swelled up within minutes after the tackle", [SWELLNOW]],
  ["en", "no red flags", [RFNONE]],
  ["en", "I do not have any locking", [LKNO]],
  ["en", "the knee does not give way", [GNO]],
  // ── must stay silent ──
  ["en", "my shoulder hurts at night", []],
  ["en", "hip pain when I walk", []],
  ["en", "ankle sprain last year", []],
  ["en", "no history of cancer", []],
  ["en", "my father had cancer", []],
  ["en", "she is a runner", []],
  ["en", "the knee x-ray was normal", []],
  ["en", "I did not twist it or fall", []],
  ["en", "I am going to the market tomorrow", []],
  ["en", "the match was played in the morning", []],
  // ── Hinglish ──
  ["hi", "ghutne ke andar ki taraf dard hai", [MEDIAL]],
  ["hi", "ghutne ki katori ke niche dard hota hai daudte waqt", [BELOW]],
  ["hi", "seedhiyan utarte waqt ghutna jawab de deta hai", [GSTAIRS]],
  ["hi", "ghutna achanak jawab de deta hai bina wajah", [GRANDOM]],
  ["hi", "ghutna mudte waqt fasak jata hai", [GPIVOT]],
  ["hi", "ghutna lock ho jata hai aur seedha nahi hota", [LKTRUE, LOCKEDK]],
  ["hi", "ghutna thodi der ke liye atak jata hai", [LKMOM]],
  ["hi", "chot ke turant baad ghutna phool gaya", [SWELLNOW]],
  ["hi", "pair par bilkul bhaar nahi daal pa raha", [WEIGHT]],
  ["hi", "ghutne ke peeche dard", [POPL]],
  ["hi", "football khelte waqt ghutna mud gaya", [TWIST]],
  ["hi", "bike se gir ke ghutne par chot lagi", [DIRECT]],
  ["hi", "kood kar utarte waqt ghutne me dard", [LAND]],
  ["hi", "operation ke baad se ghutne me dard hai", [POSTOP]],
  ["hi", "raat ko ghutne me dard zyada hota hai", [NIGHT]],
  ["hi", "subah uthte hi ghutna akad jata hai", [MORN]],
  ["hi", "ghutna garam aur laal hai", [HOTRED]],
  ["hi", "poore ghutne me dard hai", [DIFFUSE]],
  ["hi", "ghutne ke bahar ki taraf dard", [LATERAL]],
  ["hi", "ghutne ki katori ke upar dard", [ABOVE]],
  ["hi", "bina chot ke dheere dheere dard shuru hua", [INSID]],
  ["hi", "ghutna lock nahi hota", [LKNO]],
  ["hi", "ghutna kabhi jawab nahi deta", [GNO]],
  ["hi", "kamar me dard hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "घुटने के अंदर की तरफ दर्द", [MEDIAL]],
  ["de", "सीढ़ियां उतरते समय घुटना जवाब दे देता है", [GSTAIRS]],
  ["de", "घुटना अटक कर खुल जाता है", [LKMOM]],
  ["de", "चोट के तुरंत बाद घुटना फूल गया", [SWELLNOW]],
  ["de", "घुटने के पीछे दर्द", [POPL]],
  ["de", "खेलते समय घुटना मुड़ गया", [TWIST]],
  ["de", "रात को घुटने में दर्द", [NIGHT]],
  ["de", "घुटना गरम और लाल है", [HOTRED]],
  ["de", "कटोरी के नीचे दर्द", [BELOW]],
  ["de", "कंधे में दर्द है", []],
  // ── mixed ──
  ["mx", "knee me pain hai stairs chadhte waqt", []],
  ["mx", "left knee ka operation hua tha, ab dard hai", [POSTOP]],
];

// Set B: the first fair exam. Written after Set A had been used to improve the matcher, and NOT used to tune it afterwards.
export const KNEE_B = [
  // ── English ──
  ["en", "sharp pain along the inside of the knee when I twist, I think it is my meniscus", [MEDIAL]],
  ["en", "I get a catching feeling and then it gives", [LKMOM]],
  ["en", "it has locked twice and I had to bend it back and forth to unlock it", [LKTRUE]],
  ["en", "pain below the kneecap, worse after jumping, it is the patellar tendon", [BELOW]],
  ["en", "pain around my kneecap when I squat", [AROUND]],
  ["en", "my knee feels like it will buckle on the way downstairs", [GSTAIRS]],
  ["en", "I have never had it give way", [GNO]],
  ["en", "it just gave way while I was standing still", [GRANDOM]],
  ["en", "I felt a pop when I landed, then the knee puffed up within the hour", [SWELLNOW]],
  ["en", "after the car accident my knee hit the dashboard and I couldn't walk", [DIRECT, WEIGHT]],
  ["en", "I slipped on ice and fell directly on my kneecap", [DIRECT]],
  ["en", "my knee over-extended during a kick", [HYPER]],
  ["en", "I came down awkwardly after a lay-up in basketball", [LAND]],
  ["en", "sudden stop and turn while sprinting, the knee went", [PIVOT]],
  ["en", "TKR done 8 months ago, still painful", [POSTOP]],
  ["en", "gradual onset over six weeks", [INSID]],
  ["en", "the knee pain is there all the time", [CONST]],
  ["en", "stiffness first thing in the morning that eases after 20 minutes", [MORN]],
  ["en", "red hot swollen knee, cannot bear to touch it, plus a fever", [HOTRED]],
  ["en", "cannot straighten the knee fully since last week", [LOCKEDK]],
  ["en", "I can't weight-bear on it", [WEIGHT]],
  ["en", "had lymphoma 10 years back", [CANCER]],
  ["en", "behind the knee there is a tight painful area", [POPL]],
  ["en", "outer knee pain after cycling", [LATERAL]],
  ["en", "tender bony bump just under the knee, I am 14", [TUBER]],
  ["en", "the whole knee is swollen and sore, not one spot", [DIFFUSE]],
  ["en", "pain at the front of my knee when I climb up", [ANT]],
  ["en", "no swelling, no locking, no giving way", [LKNO, GNO]],
  // ── must stay silent ──
  ["en", "my low back hurts when I bend", []],
  ["en", "elbow pain on gripping", []],
  ["en", "I fell asleep at 10", []],
  ["en", "my mother had breast cancer", []],
  ["en", "the physio asked me to squat", []],
  ["en", "knee brace for sale", []],
  ["en", "she plays football every weekend", []],
  ["en", "I did not hit it or twist it", []],
  ["en", "the knee swells a bit by evening", []],
  ["en", "ache after long drives and sitting at the cinema", []],
  // ── Hinglish ──
  ["hi", "ghutne ke bahar wali taraf dard hota hai cycle chalane par", [LATERAL]],
  ["hi", "ghutne ke upar ki taraf, katori ke ek inch upar, dard", [ABOVE]],
  ["hi", "seedhiyon se utarte waqt ghutna dagmaga jata hai", [GSTAIRS]],
  ["hi", "ghutna kabhi kabhi bina bataye jawab de deta hai", [GRANDOM]],
  ["hi", "chalte waqt ghutna lock ho jata hai aur phir khulta nahi", [LKTRUE]],
  ["hi", "khelte waqt ghutna ghum gaya aur awaaz aayi", [TWIST]],
  ["hi", "ghutne par seedhe gir gaya tha concrete par", [DIRECT]],
  ["hi", "volleyball me kood kar neeche aaya to ghutne me jhatka laga", [LAND]],
  ["hi", "ghutne ka operation ho chuka hai pichle saal", [POSTOP]],
  ["hi", "ghutne me dard raat ko sote waqt badh jata hai", [NIGHT]],
  ["hi", "subah ke waqt ghutna jam sa ho jata hai", [MORN]],
  ["hi", "hamesha dard rehta hai", [CONST]],
  ["hi", "kabhi kabhi hi dard hota hai", [INTER]],
  ["hi", "sirf daudte waqt dard hota hai", [ACT]],
  ["hi", "ghutna phool gaya chot lagne ke kuch hi minute baad", [SWELLNOW]],
  ["hi", "ghutne ke andar ki taraf dard aur sujan, laal bhi hai, chhune par garam", [HOTRED, MEDIAL]],
  ["hi", "ek kadam bhi nahi chal sakta pair rakhte hi dard", [WEIGHT]],
  ["hi", "ghutna seedha nahi ho pa raha", [LOCKEDK]],
  ["hi", "pehle cancer hua tha, ab ghutne me dard", [CANCER]],
  ["hi", "ghutna jawab nahi deta, lock bhi nahi hota", [GNO, LKNO]],
  ["hi", "ghutne ke niche haddi ubhri hui hai aur dukhti hai", [TUBER]],
  ["hi", "saare ghutne me dard fail gaya hai", [DIFFUSE]],
  ["hi", "mera bhai football khelta hai", []],
  ["hi", "kal subah doctor ke paas jaunga", []],
  ["hi", "pet me dard hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "घुटने के बाहर की तरफ दर्द रहता है", [LATERAL]],
  ["de", "घुटना बिना वजह जवाब दे देता है", [GRANDOM]],
  ["de", "घुटना लॉक हो जाता है और सीधा नहीं होता", [LKTRUE, LOCKEDK]],
  ["de", "चोट लगते ही घुटना फूल गया", [SWELLNOW]],
  ["de", "कटोरी के आसपास दर्द", [AROUND]],
  ["de", "घुटने के नीचे हड्डी उभरी हुई है", [TUBER]],
  ["de", "ऑपरेशन के बाद से घुटने में दर्द", [POSTOP]],
  ["de", "लगातार दर्द रहता है", [CONST]],
  ["de", "सुबह के समय ज्यादा अकड़न रहती है", [MORN]],
  ["de", "दर्द रात को बढ़ जाता है", [NIGHT]],
  ["de", "पैर पर वजन नहीं डाल पा रहा", [WEIGHT]],
  ["de", "मेरे पिताजी को कैंसर था", []],
  ["de", "पेट में दर्द है", []],
  ["de", "बारिश हो रही है", []],
];

// Set C: the second fair exam, written after Set B's fixes. Its first run is the best estimate of how the matcher does
// on typing it has never seen; it was used to improve the matcher only afterwards (see kneePhraseMapWild.test.js).
export const KNEE_C = [
  // ── English ──
  ["en", "my knee swells up and gives way whenever I pivot on it, it happened first during a football match", [GPIVOT]],
  ["en", "I heard a loud pop and the knee was huge within minutes", [SWELLNOW]],
  ["en", "pain on the outside of the knee, I am a long distance runner", [LATERAL]],
  ["en", "pain in the hollow behind the knee after squatting", [POPL]],
  ["en", "below the kneecap there is a sore spot when I kneel", [BELOW]],
  ["en", "pain in the tendon above the patella when I stand up from a chair", [ABOVE]],
  ["en", "my kneecap hurts when I go up and down stairs", [AROUND]],
  ["en", "left knee gave way on the stairs yesterday", [GSTAIRS]],
  ["en", "the knee gives out when I twist to get out of the car", [GPIVOT]],
  ["en", "it just goes from under me for no reason", [GRANDOM]],
  ["en", "no locking, no giving way, no swelling", [LKNO, GNO]],
  ["en", "the knee locked in a bent position after I got up from the floor and I could not straighten it for ten minutes", [LKTRUE]],
  ["en", "after surgery on my meniscus last winter", [POSTOP]],
  ["en", "it started after I increased my running distance too fast", [INSID]],
  ["en", "I tripped and my knee twisted inwards", [TWIST]],
  ["en", "bashed my knee against the table corner", [DIRECT]],
  ["en", "jumped off a wall and landed stiff legged", [LAND]],
  ["en", "I was cutting hard to the left when it happened", [PIVOT]],
  ["en", "the pain is constant and gets worse at night", [CONST, NIGHT]],
  ["en", "pain only in the mornings, then fine", [MORN]],
  ["en", "the pain improves once I warm up", [IMPR]],
  ["en", "intermittent pain", [INTER]],
  ["en", "the knee is red, hot and exquisitely tender, I have a fever", [HOTRED]],
  ["en", "cancer treatment in 2015", [CANCER]],
  ["en", "cannot stand on the leg at all after the tackle", [WEIGHT]],
  ["en", "unable to bear any weight, went to casualty", [WEIGHT]],
  ["en", "I can't extend the knee fully, there is a block", [LOCKEDK]],
  ["en", "pain at the front of the knee and behind the kneecap", [ANT, AROUND]],
  ["en", "tender lump at the top of the shin just below the knee", [TUBER]],
  ["en", "diffuse ache around the whole knee", [DIFFUSE]],
  ["en", "inner knee pain when I squat and twist", [MEDIAL]],
  ["en", "I had a total knee replacement two years back", [POSTOP]],
  // ── must stay silent ──
  ["en", "swelling appeared only the next day", []],
  ["en", "that was a knee jerk reaction", []],
  ["en", "my uncle has cancer", []],
  ["en", "he is a knee surgeon", []],
  ["en", "the hip is fine, no pain in the groin", []],
  ["en", "she wore a knee length skirt", []],
  ["en", "ankle swelling at night", []],
  ["en", "my back aches at night", []],
  ["en", "I will see the doctor tomorrow", []],
  // ── Hinglish ──
  ["hi", "ghutne ke andar wali side me dard", [MEDIAL]],
  ["hi", "chadhte waqt ghutne ki katori ke aas paas dard hota hai", [AROUND]],
  ["hi", "game khelte waqt achanak se ghutna ghum gaya", [TWIST]],
  ["hi", "chalne par ghutna beech beech me jawab de jata hai", [GRANDOM]],
  ["hi", "seedhiyan chadhte waqt ghutna fisal jata hai", [GSTAIRS]],
  ["hi", "ghutna kaafi jyada sujan gaya chot ke turant baad", [SWELLNOW]],
  ["hi", "ghutna lock ho gaya tha ek baar, ab theek hai", [LKTRUE]],
  ["hi", "kabhi kabhi ghutna atak jata hai aur phir chalne lagta hai", [LKMOM]],
  ["hi", "dard raat ko neend kharab kar deta hai", [NIGHT]],
  ["hi", "subah uthte hi pehle kuch kadam dard hota hai", [MORN]],
  ["hi", "pura din dard rehta hai", [CONST]],
  ["hi", "pehle cancer ka ilaaj hua tha", [CANCER]],
  ["hi", "mere chacha ko cancer hai", []],
  ["hi", "pair par poora wazan nahi daal sakta", [WEIGHT]],
  ["hi", "ghutne ke peeche gaanth si hai", [POPL]],
  ["hi", "ghutna garam hai sujan hai aur dard bhi bahut hai", [HOTRED]],
  ["hi", "baju me dard hai", []],
  ["hi", "mausam kaafi accha hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "घुटने के पीछे की तरफ दर्द और सूजन", [POPL]],
  ["de", "घुटना मुड़ते समय जवाब दे देता है", [GPIVOT]],
  ["de", "सीढ़ी उतरते समय घुटना फिसल जाता है", [GSTAIRS]],
  ["de", "घुटना अचानक जवाब दे देता है", [GRANDOM]],
  ["de", "चोट के कुछ ही मिनटों में घुटना सूज गया", [SWELLNOW]],
  ["de", "कटोरी के ऊपर की नस में दर्द", [ABOVE]],
  ["de", "घुटना टकरा गया था दीवार से", [DIRECT]],
  ["de", "ऑपरेशन के बाद से घुटना अकड़ गया है", [POSTOP]],
  ["de", "रात को सोते समय दर्द ज्यादा होता है", [NIGHT]],
  ["de", "मेरी बहन को कैंसर है", []],
  ["de", "सिर में दर्द है", []],
];

export function score(rows) {
  let suggested = 0, right = 0, wanted = 0, found = 0;
  const wrong = [], missed = [];
  for (const [lang, text, want] of rows) {
    const got = understandStory(text).suggestions.map((s) => `${s.field}|${s.option}`);
    const wantSet = new Set(want);
    for (const g of got) { suggested++; if (wantSet.has(g)) right++; else wrong.push(`[${lang}] "${text}" -> WRONG ${g}`); }
    for (const w of want) { wanted++; if (got.includes(w)) found++; else missed.push(`[${lang}] "${text}" -> MISSED ${w}`); }
  }
  return { suggested, right, wanted, found, wrong, missed, precision: suggested ? right / suggested : 1, recall: wanted ? found / wanted : 1 };
}
