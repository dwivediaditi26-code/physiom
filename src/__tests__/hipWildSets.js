// hipWildSets.js -- shared by the Hip phrase-matcher tests (not a test itself).
// Sets of messy, real-life sentences written the way students type, each marked with what a physio would
// tick ("field|option"). These answer keys are DRAFTS written by Claude for Aditi to review.
// A = the first exam, used to find what the first draft missed; B and C = fair exams written after the
// earlier sets' fixes and NOT used to tune the matcher until their first run was recorded.
// See hipPhraseMapWild.test.js for the history.
import { HIP_PHRASES, understandStory } from "../hipPhraseMap.js";

const O = (field, i) => Object.keys(HIP_PHRASES[field])[i];
const k = (field, i) => `${field}|${O(field, i)}`;
// location
const GROIN = k("location", 0), FLEXOR = k("location", 1), LATERAL = k("location", 2), POST = k("location", 3), ISCH = k("location", 4),
  ADD = k("location", 5), PUBIC = k("location", 6), SIJ = k("location", 7);
// dominant pattern
const DGROIN = k("locationPattern", 0), DLAT = k("locationPattern", 1), DPOST = k("locationPattern", 2), DADD = k("locationPattern", 3), DDIFF = k("locationPattern", 4);
// mechanism
const INSID = k("mechanism", 0), AGE = k("mechanism", 1), TWIST = k("mechanism", 2), FALL = k("mechanism", 3), KICK = k("mechanism", 4),
  LUNGE = k("mechanism", 5), FAST = k("mechanism", 6), RETURN = k("mechanism", 7), POSTPARTUM = k("mechanism", 8), THR = k("mechanism", 9);
// aggravating
const FADIR = k("aggravating", 0), FABER = k("aggravating", 1), CROSS = k("aggravating", 2), PSIT = k("aggravating", 3), HARD = k("aggravating", 4),
  LYING = k("aggravating", 5), WALK = k("aggravating", 6), STAIRS = k("aggravating", 7), CAR = k("aggravating", 8);
// 24-hour pattern (hip's own six answers)
const INTER = k("pattern", 0), CONST = k("pattern", 1), NIGHT = k("pattern", 2), MORN = k("pattern", 3), IMPR = k("pattern", 4), WORSE = k("pattern", 5);
// mechanical symptoms
const MNONE = k("mechanical", 0), CLICKOK = k("mechanical", 1), CLICKPAIN = k("mechanical", 2), CATCH = k("mechanical", 3), GIVEWAY = k("mechanical", 4),
  LOCK = k("mechanical", 5), INTSNAP = k("mechanical", 6), EXTSNAP = k("mechanical", 7), CREP = k("mechanical", 8);
// red flags
const FRACW = k("redFlags", 0), NOF = k("redFlags", 1), HOTHIP = k("redFlags", 2), AVN = k("redFlags", 3), PROGR = k("redFlags", 4),
  ABDO = k("redFlags", 5), GYNAE = k("redFlags", 6), TESTIC = k("redFlags", 7), CANCER = k("redFlags", 8), RFNONE = k("redFlags", 9);
export const KEYS = { GROIN, FLEXOR, LATERAL, POST, ISCH, ADD, PUBIC, SIJ, DGROIN, DLAT, DPOST, DADD, DDIFF, INSID, AGE, TWIST, FALL, KICK, LUNGE, FAST,
  RETURN, POSTPARTUM, THR, FADIR, FABER, CROSS, PSIT, HARD, LYING, WALK, STAIRS, CAR, INTER, CONST, NIGHT, MORN, IMPR, WORSE, MNONE, CLICKOK, CLICKPAIN,
  CATCH, GIVEWAY, LOCK, INTSNAP, EXTSNAP, CREP, FRACW, NOF, HOTHIP, AVN, PROGR, ABDO, GYNAE, TESTIC, CANCER, RFNONE };

export const HIP_A = [
  // ── English ──
  ["en", "pain in the groin when I bring my knee up to my chest", [GROIN, FADIR]],
  ["en", "deep pain in the buttock after sitting for hours at my desk job", [POST, PSIT]],
  ["en", "pain on the side of the hip, I cannot lie on that side at night", [LATERAL, LYING, NIGHT]],
  ["en", "I fell on my hip last week and can't walk", [FALL, FRACW]],
  ["en", "my elderly mother fell and the leg looks shortened and turned outwards", [FALL, NOF]],
  ["en", "pain at the sit bone when I sit on hard chairs", [ISCH, HARD]],
  ["en", "inner thigh pain, I pulled it while lunging in a badminton game", [ADD, LUNGE]],
  ["en", "pain at the pubic bone after delivery of my second baby", [PUBIC, POSTPARTUM]],
  ["en", "SI joint pain on the right, worse when I climb stairs", [SIJ, STAIRS]],
  ["en", "clicking in the hip but no pain", [CLICKOK]],
  ["en", "painful clicking when I swing my leg", [CLICKPAIN]],
  ["en", "my hip catches sometimes", [CATCH]],
  ["en", "the hip gave way and I nearly fell", [GIVEWAY]],
  ["en", "the hip locks up when I stand from sitting", [LOCK]],
  ["en", "I can feel a snap at the front of the hip when I lift my leg", [INTSNAP, FLEXOR]],
  ["en", "snapping on the outside of the hip when I walk", [EXTSNAP, LATERAL]],
  ["en", "a grinding feeling in the hip", [CREP]],
  ["en", "no clicking, no locking, no catching", [MNONE]],
  ["en", "I have been taking steroid tablets for years", [AVN]],
  ["en", "pain in the hip along with lower abdominal pain", [ABDO]],
  ["en", "pain in the groin and the testicle", [GROIN, TESTIC]],
  ["en", "the pain gets worse during my periods", [GYNAE]],
  ["en", "the hip is hot and swollen and I have a fever", [HOTHIP]],
  ["en", "history of prostate cancer", [CANCER]],
  ["en", "the pain is getting worse every day whatever I do", [PROGR]],
  ["en", "I had a total hip replacement in 2019", [THR]],
  ["en", "pain after sprinting at the track", [FAST]],
  ["en", "back to football after a long break and the groin started hurting", [RETURN, GROIN]],
  ["en", "I was kicking a ball hard and felt a pull", [KICK]],
  ["en", "I twisted my hip pivoting on one leg in basketball", [TWIST]],
  ["en", "no injury, it started slowly", [INSID]],
  ["en", "age related wear and tear, arthritis", [AGE]],
  ["en", "stiff in the morning for half an hour", [MORN]],
  ["en", "the pain is worse towards the evening", [WORSE]],
  ["en", "the pain is constant", [CONST]],
  ["en", "pain comes and goes with walking", [INTER, WALK]],
  ["en", "it improves as the day goes on", [IMPR]],
  ["en", "pain getting out of the car", [CAR]],
  ["en", "pain sitting cross legged", [CROSS]],
  ["en", "pain in the figure of four position", [FABER]],
  ["en", "pain on walking", [WALK]],
  ["en", "pain going up stairs", [STAIRS]],
  ["en", "mostly in the groin", [DGROIN, GROIN]],
  ["en", "pain all around the hip", [DDIFF]],
  // ── must stay silent ──
  ["en", "my knee hurts on stairs", []],
  ["en", "neck stiffness in the morning", []],
  ["en", "no history of cancer", []],
  ["en", "my mother had breast cancer", []],
  ["en", "I walked to the market", []],
  ["en", "elbow pain at night", []],
  ["en", "I did not fall", []],
  // ── Hinglish ──
  ["hi", "jaangh ke jod me dard hota hai jab ghutna chhati ki taraf laata hoon", [GROIN, FADIR]],
  ["hi", "kulhe ke bahar ki taraf dard raat ko zyada", [LATERAL, NIGHT]],
  ["hi", "chutad me gehra dard, der tak baithne se badh jata hai", [POST, PSIT]],
  ["hi", "gir gaya tha, ab kulhe par bhaar nahi daal pa raha", [FALL, FRACW]],
  ["hi", "delivery ke baad se kulhe me dard", [POSTPARTUM]],
  ["hi", "kulha badalwane ke baad dard", [THR]],
  ["hi", "paalthi maarkar baithne par dard", [CROSS]],
  ["hi", "seedhiyan chadhte waqt dard", [STAIRS]],
  ["hi", "car se utarte waqt kulhe me dard", [CAR]],
  ["hi", "us taraf let ne par dard", [LYING]],
  ["hi", "kulhe me click ki awaaz aati hai bina dard ke", [CLICKOK]],
  ["hi", "kulha jawab de deta hai", [GIVEWAY]],
  ["hi", "kulha lock ho jata hai", [LOCK]],
  ["hi", "pet me dard ke saath kulhe me dard", [ABDO]],
  ["hi", "mahavari ke dauran dard badh jata hai", [GYNAE]],
  ["hi", "sharab bahut peeta hai", [AVN]],
  ["hi", "andkosh me bhi dard hai", [TESTIC]],
  ["hi", "subah kulha akad jata hai", [MORN]],
  ["hi", "shaam ko zyada dard hota hai", [WORSE]],
  ["hi", "din me theek ho jata hai", [IMPR]],
  ["hi", "hamesha dard rehta hai", [CONST]],
  ["hi", "raat ko dard se neend khul jati hai", [NIGHT]],
  ["hi", "kabhi kabhi dard hota hai", [INTER]],
  ["hi", "football khelte waqt kick maarne se dard", [KICK]],
  ["hi", "tez daudte waqt ek dum dard", [FAST]],
  ["hi", "bina chot ke dheere dheere shuru hua", [INSID]],
  ["hi", "ghutne me dard hai", []],
  ["hi", "kamar me dard hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "कूल्हे के बाहर की तरफ दर्द", [LATERAL]],
  ["de", "जांघ के अंदर की तरफ दर्द", [ADD]],
  ["de", "गिरने के बाद कूल्हे में दर्द", [FALL]],
  ["de", "प्रसव के बाद से कूल्हे में दर्द", [POSTPARTUM]],
  ["de", "चलने में दर्द", [WALK]],
  ["de", "सीढ़ियां चढ़ते समय दर्द", [STAIRS]],
  ["de", "सुबह अकड़न", [MORN]],
  ["de", "रात को दर्द", [NIGHT]],
  ["de", "कूल्हा अटक जाता है", [CATCH]],
  ["de", "कूल्हा गरम और सूजन", [HOTHIP]],
  ["de", "सिर में दर्द है", []],
];

// Set B: the first fair exam. Written after Set A had been used to improve the matcher, and NOT used to tune it afterwards.
export const HIP_B = [
  // ── English ──
  ["en", "groin pain after hockey practice, sharp when I sprint", [GROIN, FAST]],
  ["en", "she has a deep ache in her right buttock that goes down the leg when she sits long", [POST, PSIT]],
  ["en", "outer hip tenderness, lying on that side is impossible", [LATERAL, LYING]],
  ["en", "tripped over the carpet and landed on her left hip, now she can't put weight on it", [FALL, FRACW]],
  ["en", "pain at the front above the pubic area since the pregnancy", [PUBIC]],
  ["en", "dull pain in the hip flexor when I run uphill", [FLEXOR]],
  ["en", "pinching pain at the front of the hip when I squat deep", [FLEXOR, FADIR]],
  ["en", "knee to chest movement is painful in the groin", [GROIN, FADIR]],
  ["en", "can't sit with legs crossed like a yogi", [CROSS]],
  ["en", "sitting for long on a flight makes my hip stiff and sore", [PSIT]],
  ["en", "the hip pops when I get up from a chair and doesn't hurt", [CLICKOK]],
  ["en", "there is a clunk at the front of my hip when I stand up from the sofa", [INTSNAP, FLEXOR]],
  ["en", "loud pop on the outer side of the hip when I go up stairs", [EXTSNAP, LATERAL]],
  ["en", "a crunching sound deep in the joint when I squat", [CREP]],
  ["en", "my leg suddenly buckled and I fell", [GIVEWAY, FALL]],
  ["en", "left hip locked when I stood up and it took a minute to release", [LOCK]],
  ["en", "it feels like something is catching in the front of the hip", [CATCH, FLEXOR]],
  ["en", "no clicking or catching or giving way", [MNONE]],
  ["en", "high dose steroids for asthma over many years", [AVN]],
  ["en", "I drink heavily every day", [AVN]],
  ["en", "she has sickle cell disease", [AVN]],
  ["en", "the pain is in my groin and lower tummy", [GROIN, ABDO]],
  ["en", "pelvic pain with periods and also hip pain", [GYNAE]],
  ["en", "pain in the left testicle and groin", [TESTIC, GROIN]],
  ["en", "red, hot, swollen hip and she is feverish", [HOTHIP]],
  ["en", "can't weight bear on the left leg after slipping in the bathroom", [FALL, FRACW]],
  ["en", "pain getting worse week by week despite rest and painkillers", [PROGR]],
  ["en", "treated for breast cancer 3 years ago", [CANCER]],
  ["en", "hip replaced last year", [THR]],
  ["en", "started after a long run in new shoes, no fall", [INSID]],
  ["en", "he turned sharply on a wet pitch and felt a twinge in the hip", [TWIST]],
  ["en", "after a fencing match, lunge to the right", [LUNGE]],
  ["en", "I am 75 and the doctor says arthritis", [AGE]],
  ["en", "pain first thing in the morning that settles after I walk around", [MORN, IMPR]],
  ["en", "the ache builds up after a day on my feet", [WORSE]],
  ["en", "the pain disturbs my sleep every night", [NIGHT]],
  ["en", "pain only during football matches", [INTER]],
  ["en", "unrelenting hip pain", [PROGR]],
  // ── must stay silent ──
  ["en", "my wrist is swollen", []],
  ["en", "he is 60 and retired", []],
  ["en", "nice weather today", []],
  ["en", "her uncle had prostate cancer", []],
  ["en", "I will start playing football again next month", []],
  ["en", "the gym is closed on Sundays", []],
  ["en", "no fever, no swelling", []],
  // ── Hinglish ──
  ["hi", "jaangh ke jod me tez dard jab football khelta hoon aur kick maarta hoon", [GROIN, KICK]],
  ["hi", "kulhe ke peeche gehra dard jab main der tak baithta hoon", [POST, PSIT]],
  ["hi", "us taraf karwat lene me dard hota hai", [LYING]],
  ["hi", "baithne wali haddi me dard kadak kursi par baithne se", [ISCH, HARD]],
  ["hi", "gir gaya bathroom me aur ab khada nahi ho pa raha", [FALL, FRACW]],
  ["hi", "pregnancy ke baad se pubic haddi me dard", [PUBIC, POSTPARTUM]],
  ["hi", "kulhe ka operation hua tha 2 saal pehle", [THR]],
  ["hi", "kulhe me kar kar ki awaaz aati hai", [CREP]],
  ["hi", "kulha atak jata hai kabhi kabhi", [CATCH]],
  ["hi", "kulhe me click hota hai aur dard bhi hota hai", [CLICKPAIN]],
  ["hi", "mujhe pet me dard hai aur kulhe me bhi", [ABDO]],
  ["hi", "bachchedani me problem hai aur kulhe me dard", [GYNAE]],
  ["hi", "lambe samay se steroid le raha hoon", [AVN]],
  ["hi", "pehle cancer ka ilaaj hua tha", [CANCER]],
  ["hi", "dard har roz badhta ja raha hai, chahe aaram karo ya chalo", [PROGR]],
  ["hi", "dard raat me bahut badh jata hai", [NIGHT]],
  ["hi", "subah uthte hi kulha jam jata hai thodi der tak", [MORN]],
  ["hi", "chalne se dard kam ho jata hai", [IMPR]],
  ["hi", "din ke aakhir me dard zyada hota hai", [WORSE]],
  ["hi", "sirf running ke time dard hota hai", [INTER]],
  ["hi", "bina kisi chot ke apne aap shuru ho gaya", [INSID]],
  ["hi", "mera ghutna kharab hai", []],
  ["hi", "aaj mausam achha hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "कूल्हे के पीछे गहरा दर्द", [POST]],
  ["de", "जांघ के जोड़ में दर्द", [GROIN]],
  ["de", "गिर गया और खड़ा नहीं हो पा रहा", [FALL, FRACW]],
  ["de", "डिलीवरी के बाद से दर्द", [POSTPARTUM]],
  ["de", "कूल्हे का ऑपरेशन हुआ था", [THR]],
  ["de", "सीढ़ियां चढ़ने में दर्द", [STAIRS]],
  ["de", "गाड़ी से उतरते समय दर्द", [CAR]],
  ["de", "कूल्हे में कर कर आवाज आती है", [CREP]],
  ["de", "शाम को दर्द बढ़ जाता है", [WORSE]],
  ["de", "रात को नींद नहीं आती दर्द से", [NIGHT]],
  ["de", "मेरी मां को कैंसर था", []],
  ["de", "हाथ में दर्द है", []],
  ["de", "सुबह कूल्हा जाम हो जाता है", [MORN]],
];

// Set C: the second fair exam, written after Set B's fixes. Its first run is the best estimate of how the matcher does
// on typing it has never seen; it was used to improve the matcher only afterwards (see hipPhraseMapWild.test.js).
export const HIP_C = [
  // ── English ──
  ["en", "pain deep inside the hip joint, felt in the groin crease when I put on socks", [GROIN]],
  ["en", "pain in my glutes on the right when I stand up from sitting", [POST]],
  ["en", "tender over the bump on the outside of my hip", [LATERAL]],
  ["en", "sharp pain in the inner thigh when I sprint", [ADD, FAST]],
  ["en", "sitting on the toilet seat hurts the bone at the bottom of my pelvis", [ISCH]],
  ["en", "pain right over the pubic bone after I had the baby", [PUBIC, POSTPARTUM]],
  ["en", "stairs are the worst, especially going up", [STAIRS]],
  ["en", "I get a catch in the groin when I swing my leg forward", [CATCH, GROIN]],
  ["en", "my hip feels like it will give way going downstairs", [GIVEWAY]],
  ["en", "the hip joint feels hot to touch and is swollen, she is unwell", [HOTHIP]],
  ["en", "fell off a ladder two days ago, the leg is shorter and the foot points outward", [FALL, NOF]],
  ["en", "broken hip after a fall in the shower", [NOF, FALL]],
  ["en", "hip pain for six months, now waking me every night", [NIGHT]],
  ["en", "my back and hip are stiff in the morning for about an hour", [MORN]],
  ["en", "the pain eases after I have been moving for a while", [IMPR]],
  ["en", "the pain is always there, even at rest", [CONST]],
  ["en", "a twinge now and then when I walk fast", [INTER]],
  ["en", "sudden pain in the groin while playing football, felt something tear", [GROIN]],
  ["en", "post-natal pelvic girdle pain", [POSTPARTUM]],
  ["en", "total hip replacement on the left in 2018", [THR]],
  ["en", "ex footballer with years of kicking", [KICK]],
  ["en", "pain after running my first 10k in months", [RETURN]],
  ["en", "gradual onset pain with age, the x-ray shows osteoarthritis", [INSID, AGE]],
  ["en", "I take steroid injections regularly for my back", [AVN]],
  ["en", "she was diagnosed with ovarian cysts", [GYNAE]],
  ["en", "the scrotum is swollen", [TESTIC]],
  ["en", "the pain is getting worse every day and nothing helps", [PROGR]],
  // ── must stay silent ──
  ["en", "cancer runs in the family, nothing for me", []],
  ["en", "I injured my wrist", []],
  ["en", "my sister is pregnant", []],
  ["en", "he is a delivery boy", []],
  ["en", "knee replacement planned for next year", []],
  ["en", "I walk every day", []],
  ["en", "the car broke down", []],
  // ── Hinglish ──
  ["hi", "jaangh ke andar ki taraf khichav jaisa dard", [ADD]],
  ["hi", "kulhe ke bahar ki haddi pe lette hue dard hota hai", [LATERAL, LYING]],
  ["hi", "ghar ki seedhiyan chadhte waqt kulhe me dard", [STAIRS]],
  ["hi", "car me baithte aur utarte waqt dard", [CAR]],
  ["hi", "lambi flight me baithne se kulha akad jata hai", [PSIT]],
  ["hi", "paalthi maar ke baithna mushkil hai kulhe me dard ki wajah se", [CROSS]],
  ["hi", "ek pair dusre ghutne pe rakhte hi dard", [FABER]],
  ["hi", "kulhe me jakdan raat ko aur subah", [MORN]],
  ["hi", "kulha jawab de jata hai seedhiyon par", [GIVEWAY]],
  ["hi", "pet aur jaangh me ek saath dard", [ABDO]],
  ["hi", "periods me kulhe me dard badh jata hai", [GYNAE]],
  ["hi", "bahut zyada sharab peeta hai", [AVN]],
  ["hi", "jaangh me gaanth sa mehsoos hota hai", []],
  ["hi", "dard lagatar rehta hai chahe kuch bhi karo", [CONST]],
  ["hi", "tez daudne se kulhe me khichav aaya", [FAST]],
  ["hi", "kulhe ke operation ke baad se dard", [THR]],
  ["hi", "unchi jagah se gir gaya tha", [FALL]],
  ["hi", "bina kisi wajah ke kulhe me dard shuru hua", [INSID]],
  ["hi", "kal match hai", []],
  ["hi", "sir dard hai", []],
  // ── Hindi (Devanagari) ──
  ["de", "कूल्हे के आगे की तरफ दर्द", [FLEXOR]],
  ["de", "नितंब में दर्द बैठने पर", [POST]],
  ["de", "कूल्हे में आवाज के साथ दर्द", [CLICKPAIN]],
  ["de", "पैर मुड़ जाता है अचानक", [GIVEWAY]],
  ["de", "रात में सोते समय दर्द से आंख खुल जाती है", [NIGHT]],
  ["de", "लगातार दर्द", [CONST]],
  ["de", "शराब पीता है रोज", [AVN]],
  ["de", "कैंसर का इलाज चल रहा है", [CANCER]],
  ["de", "मेरे चाचा को कैंसर है", []],
  ["de", "आज बारिश है", []],
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
