// lumbarSIPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a LUMBAR / SACRO-ILIAC / PELVIC (low back, buttock, sciatica) complaint in
// everyday words (English, Hinglish, Hindi in Devanagari) and suggests which of the Subjective checklist options it means.
// No AI, no network, no cost. It only SUGGESTS; the student taps to confirm. The matching engine is phraseEngine.js.
//
// Covers 14 Lumbar/SI questions: where it hurts, where it spreads, how it started, postures that aggravate / relieve,
// 24-hour pattern, leg neurological symptoms, bladder/bowel baseline, the four red-flag screens, ADL restrictions and
// work impact. Not covered: Irritability (a clinician's judgement, not something a patient says).
// The option strings must match the form exactly (a test checks this).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
// Left / right answers (L) / (R) are built with sided() from phraseSides.js.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { SIDE_HINGLISH, SIDE_DEVA, LEFT_W, RIGHT_W, BOTH_W, sided } from "./phraseSides.js";
import { extendPhrases } from "./phrasePattern.js";

const SI = sided([
  "{e} si joint", "{e} sacroiliac joint", "pain over the {e} si joint", "{e} sacroiliac pain", "{e} sided si joint pain", "pain at the {e} sacroiliac joint", "{e} si joint is sore",
  "{h} si joint me dard", "{h} taraf si joint me dard", "{h} kulhe ke piche ki haddi ke jod me dard", "{h} sacroiliac joint me dard",
  "{d} एसआई जोड़ में दर्द", "{d} तरफ एसआई जोड़ में दर्द", "{d} कूल्हे के पीछे की हड्डी के जोड़ में दर्द", "{d} सैक्रोइलियक जोड़ में दर्द",
]);
const BUT_UP = sided([
  "{e} upper buttock", "pain in the upper part of the {e} buttock", "{e} buttock pain high up", "top of the {e} buttock", "upper {e} gluteal area",
  "{h} chutad ke upar ke hisse me dard", "{h} nitamb ke upar dard", "{h} kulhe ke upar wale hisse me dard", "{h} chutad me upar dard",
  "{d} नितंब के ऊपर के हिस्से में दर्द", "{d} चूतड़ के ऊपर वाले हिस्से में दर्द", "{d} कूल्हे के ऊपरी हिस्से में दर्द", "{d} चूतड़ में ऊपर दर्द",
]);
const BUT_LOW = sided([
  "{e} lower buttock", "pain in the lower part of the {e} buttock", "{e} buttock pain low down", "bottom of the {e} buttock", "lower {e} gluteal area", "under the {e} buttock",
  "{h} chutad ke neeche ke hisse me dard", "{h} nitamb ke niche dard", "{h} chutad me niche dard", "{h} chutad ke nichle hisse me dard",
  "{d} नितंब के नीचे के हिस्से में दर्द", "{d} चूतड़ के नीचे वाले हिस्से में दर्द", "{d} चूतड़ में नीचे दर्द", "{d} चूतड़ के निचले हिस्से में दर्द",
]);
const ISCH = sided([
  "{e} sitting bone", "pain at the {e} sit bone", "{e} ischial tuberosity", "{e} sitting bone is tender", "pain under the {e} buttock when i sit on the bone", "{e} ischial pain",
  "{h} baithne wali haddi me dard", "{h} baithne ki haddi dukhti hai", "{h} ischial tuberosity me dard", "baithte waqt {h} haddi me dard",
  "{d} बैठने वाली हड्डी में दर्द", "{d} बैठने की हड्डी दुखती है", "{d} इस्कियल ट्यूबरोसिटी में दर्द", "बैठते वक्त {d} हड्डी में दर्द",
]);
const PARA = sided([
  "pain to the {e} of the spine", "{e} side of the lower back", "pain on the {e} side of my low back", "{e} sided low back pain", "muscles on the {e} of the spine are tight", "{e} paraspinal pain",
  "kamar ke {h} taraf dard", "reedh ke {h} taraf dard", "{h} taraf kamar me dard", "kamar ke {h} hisse me dard",
  "कमर के {d} तरफ दर्द", "रीढ़ के {d} तरफ दर्द", "{d} तरफ कमर में दर्द", "कमर के {d} हिस्से में दर्द",
]);
const GROIN = sided([
  "pain goes into the {e} groin", "pain spreads to the {e} groin", "{e} groin pain from the back", "pain radiates to the {e} groin", "into the {e} groin",
  "dard {h} jaangh ke jod tak jata hai", "kamar se {h} groin tak dard", "dard {h} groin me bhi hota hai", "{h} groin me dard jata hai",
  "दर्द {d} जांघ के जोड़ तक जाता है", "कमर से {d} ग्रोइन तक दर्द", "दर्द {d} ग्रोइन में भी होता है", "{d} ग्रोइन में दर्द जाता है",
]);
const TO_BUT = sided([
  "pain goes to the {e} buttock", "pain spreads into the {e} buttock", "radiates to the {e} buttock", "{e} buttock pain from the back", "into the {e} buttock",
  "dard {h} chutad tak jata hai", "kamar se {h} nitamb tak dard", "dard {h} chutad me bhi hota hai", "{h} chutad me dard jata hai",
  "दर्द {d} चूतड़ तक जाता है", "कमर से {d} नितंब तक दर्द", "दर्द {d} चूतड़ में भी होता है", "{d} चूतड़ में दर्द जाता है",
]);
const POST_THIGH = sided([
  "pain down the back of the {e} thigh", "pain goes to the back of my {e} thigh", "sciatica down the back of the {e} leg to the thigh", "{e} hamstring pain from the back", "pain along the back of the {e} thigh",
  "dard {h} jaangh ke peeche tak jata hai", "{h} jaangh ke pichle hisse me dard", "kamar se {h} jaangh ke peeche dard utarta hai", "{h} pair ki jaangh ke peeche dard",
  "दर्द {d} जांघ के पीछे तक जाता है", "{d} जांघ के पिछले हिस्से में दर्द", "कमर से {d} जांघ के पीछे दर्द उतरता है", "{d} पैर की जांघ के पीछे दर्द",
]);
const ANT_THIGH = sided([
  "pain goes to the front of the {e} thigh", "pain in the front of my {e} thigh from the back", "{e} anterior thigh pain", "pain down the front of the {e} thigh", "pain spreads to the front of the {e} thigh",
  "dard {h} jaangh ke samne tak jata hai", "{h} jaangh ke aage ke hisse me dard", "kamar se {h} jaangh ke aage dard", "{h} pair ki jaangh ke samne dard",
  "दर्द {d} जांघ के सामने तक जाता है", "{d} जांघ के आगे के हिस्से में दर्द", "कमर से {d} जांघ के आगे दर्द", "{d} पैर की जांघ के सामने दर्द",
]);
const KNEE = sided([
  "pain goes down to the {e} knee", "pain from the back spreads to the {e} knee", "{e} knee pain referred from the back", "sciatica to the {e} knee", "radiates to the {e} knee",
  "dard {h} ghutne tak jata hai", "kamar se {h} ghutne tak dard", "{h} ghutne me dard peeth se aata hai", "dard {h} ghutne tak utarta hai",
  "दर्द {d} घुटने तक जाता है", "कमर से {d} घुटने तक दर्द", "{d} घुटने में दर्द पीठ से आता है", "दर्द {d} घुटने तक उतरता है",
]);
const CALF = sided([
  "pain goes down to the {e} calf", "pain in the {e} calf from the back", "sciatica down to the {e} calf", "{e} calf pain with the back pain", "radiates to the {e} calf",
  "dard {h} pindli tak jata hai", "kamar se {h} pindli tak dard", "{h} pindli me dard peeth se aata hai", "dard {h} pindli tak utarta hai",
  "दर्द {d} पिंडली तक जाता है", "कमर से {d} पिंडली तक दर्द", "{d} पिंडली में दर्द पीठ से आता है", "दर्द {d} पिंडली तक उतरता है",
]);
const TOES = sided([
  "pain and tingling in the toes of the {e} foot", "pain goes to the {e} toes", "numbness in the {e} toes", "{e} toes tingle", "pins and needles in the {e} toes", "sciatica down to the {e} toes",
  "{h} pair ke angoothon me jhunjhuni", "dard {h} pair ki ungliyon tak jata hai", "{h} pair ke angoothe sunn", "{h} pair ki ungliyon me sunnpan",
  "{d} पैर के अंगूठों में झनझनाहट", "दर्द {d} पैर की उंगलियों तक जाता है", "{d} पैर के अंगूठे सुन्न", "{d} पैर की उंगलियों में सुन्नपन",
]);
const NEURO = sided([
  "numbness in the {e} leg", "tingling down my {e} leg", "{e} leg is weak", "pins and needles in the {e} leg", "{e} leg feels numb and heavy", "weakness in the {e} foot", "{e} leg neurological symptoms",
  "{h} pair me sunnpan", "{h} pair me jhunjhuni", "{h} pair me kamzori", "{h} pair sunn ho jata hai",
  "{d} पैर में सुन्नपन", "{d} पैर में झनझनाहट", "{d} पैर में कमजोरी", "{d} पैर सुन्न हो जाता है",
]);
const SIDE_LYING = sided([
  "lying on my {e} side hurts", "pain when i sleep on the {e} side", "{e} side lying makes it worse", "cannot lie on the {e} side", "lying on the {e} side is painful",
  "{h} karwat par sone se dard", "{h} taraf let kar dard", "{h} side par lette to dard", "{h} karwat lena mushkil",
  "{d} करवट पर सोने से दर्द", "{d} तरफ लेटकर दर्द", "{d} साइड पर लेटने से दर्द", "{d} करवट लेना मुश्किल",
]);

const LUMBAR_BASE = {
  location: {
    "Upper lumbar (L1-L2)": [
      "~upper lumbar", "upper part of the lower back", "top of the lower back", "l1 l2", "l1 to l2", "upper lumbar spine", "pain in the upper lumbar region", "just below the ribs at the back",
      "kamar ke upar wale hisse me dard", "kamar ka upri hissa", "kamar ke upar dard", "pasliyon ke neeche kamar me dard",
      "कमर के ऊपर वाले हिस्से में दर्द", "कमर का ऊपरी हिस्सा", "कमर के ऊपर दर्द", "पसलियों के नीचे कमर में दर्द",
    ],
    "Mid lumbar (L3)": [
      "~mid lumbar", "middle of the lower back", "mid lumbar spine", "l3 level", "level l3", "pain in the middle of the lumbar spine", "waist level in the back", "halfway down the lower back",
      "kamar ke beech me dard", "kamar ke beech wale hisse me dard", "kamar ke madhya me dard", "beech ki kamar me dard",
      "कमर के बीच में दर्द", "कमर के बीच वाले हिस्से में दर्द", "कमर के मध्य में दर्द", "बीच की कमर में दर्द",
    ],
    "Lower lumbar (L4-L5)": [
      "~lower lumbar", "~l4 l5", "lower lumbar spine", "l4 to l5", "bottom of the lower back", "pain at the belt line", "lower part of the lower back", "pain just above the beltline",
      "kamar ke neeche wale hisse me dard", "kamar ka nichla hissa", "kamar ke niche dard", "belt wali jagah par dard",
      "कमर के निचले हिस्से में दर्द", "कमर का निचला भाग", "कमर के नीचे दर्द", "बेल्ट वाली जगह पर दर्द",
    ],
    "Lumbosacral junction (L5-S1)": [
      "~lumbosacral", "lumbosacral junction", "l5 s1", "l5 to s1", "where the spine meets the pelvis at the bottom", "base of the spine", "very bottom of the lower back", "lumbosacral pain",
      "kamar aur kulhe ke jod par dard", "reedh ke aakhri hisse me dard", "kamar ke sabse niche dard", "kamar ke aadhar par dard",
      "कमर और कूल्हे के जोड़ पर दर्द", "रीढ़ के आखिरी हिस्से में दर्द", "कमर के सबसे नीचे दर्द", "कमर के आधार पर दर्द",
    ],
    "Central / midline": [
      "~midline", "~central", "centre of the lower back", "centre of my back", "right in the middle of the spine", "pain over the spine itself", "central low back pain", "in the midline of the back", "over the spinous processes",
      "kamar ke bilkul beech me dard", "reedh ke upar dard", "reedh ke thik beech me dard", "kamar ki reedh me dard",
      "कमर के बिल्कुल बीच में दर्द", "रीढ़ के ऊपर दर्द", "रीढ़ के ठीक बीच में दर्द", "कमर की रीढ़ में दर्द",
    ],
    "Paraspinal right of midline": PARA.R,
    "Paraspinal left of midline": PARA.L,
    "Bilateral / band": [
      "~band", "~bilateral", "pain across the whole lower back", "pain across both sides of the lower back", "band of pain across the back", "belt like pain across the low back", "both sides of the lower back", "across the waist at the back", "spread right across the lower back",
      "poori kamar me dard", "kamar ke dono taraf dard", "kamar me patte jaisa dard", "kamar me ek se doosre kone tak dard",
      "पूरी कमर में दर्द", "कमर के दोनों तरफ दर्द", "कमर में पट्टी जैसा दर्द", "कमर में एक से दूसरे कोने तक दर्द",
    ],
    "Sacrum (central)": [
      "~sacrum", "~sacral", "pain over the sacrum", "sacral pain", "middle of the sacrum", "pain in the bone at the base of the spine", "central sacral pain", "over the flat bone above the tailbone",
      "sacrum me dard", "reedh ke aakhri chaude hisse me dard", "kamar ke neeche ki chauri haddi me dard", "tailbone ke upar ki haddi me dard",
      "सैक्रम में दर्द", "रीढ़ के आखिरी चौड़े हिस्से में दर्द", "कमर के नीचे की चौड़ी हड्डी में दर्द", "टेलबोन के ऊपर की हड्डी में दर्द",
    ],
    "SI joint (L)": SI.L,
    "SI joint (R)": SI.R,
    "Bilateral SI joints": [
      "both si joints", "bilateral si joint pain", "both sacroiliac joints", "si joints on both sides", "pain at both sides of the pelvis at the back", "pain over both dimples at the base of the back", "both back dimples hurt",
      "dono si joint me dard", "dono taraf si joint me dard", "kulhe ke peeche dono taraf dard", "kamar ke neeche dono gaddhon me dard",
      "दोनों एसआई जोड़ में दर्द", "दोनों तरफ एसआई जोड़ में दर्द", "कूल्हे के पीछे दोनों तरफ दर्द", "कमर के नीचे दोनों गड्ढों में दर्द",
    ],
    "Coccyx": [
      "~coccyx", "~tailbone", "pain in the tailbone", "coccyx pain", "tailbone pain when sitting", "pain at the very end of the spine", "sore tailbone", "coccydynia", "pain at the bottom of the spine when i sit",
      "tailbone me dard", "reedh ki aakhri haddi me dard", "poonch ki haddi me dard", "baithne par tailbone dukhti hai",
      "टेलबोन में दर्द", "रीढ़ की आखिरी हड्डी में दर्द", "पूंछ की हड्डी में दर्द", "बैठने पर टेलबोन दुखती है",
    ],
    "Buttock (L) — upper": BUT_UP.L,
    "Buttock (L) — lower": BUT_LOW.L,
    "Buttock (R) — upper": BUT_UP.R,
    "Buttock (R) — lower": BUT_LOW.R,
    "Ischial tuberosity (L)": ISCH.L,
    "Ischial tuberosity (R)": ISCH.R,
  },

  radiation: {
    "No radiation — local only": [
      "nothing in the legs", "nothing in the leg", "nothing in legs",
      "no radiation", "pain is local", "stays in the back", "does not spread", "doesnt spread anywhere", "pain doesnt travel", "only in the lower back", "does not go down the leg", "back only",
      "dard sirf kamar me hai", "dard kahin aur nahi jata", "dard failta nahi", "pair me kuch nahi hota", "dard kamar tak hi rehta hai",
      "दर्द सिर्फ कमर में है", "दर्द कहीं और नहीं जाता", "दर्द फैलता नहीं", "दर्द कमर तक ही रहता है", "पैर में कुछ नहीं होता",
    ],
    "Across lower back (belt distribution)": [
      "pain spreads across the lower back", "across the back like a belt", "pain goes from side to side across the back", "spreads across the waist", "radiates across the low back", "pain across the belt line",
      "dard kamar ke aar paar failta hai", "dard kamar me belt ki tarah failta hai", "dard ek taraf se doosri taraf jata hai", "kamar me chaaron taraf dard",
      "दर्द कमर के आर पार फैलता है", "दर्द कमर में बेल्ट की तरह फैलता है", "दर्द एक तरफ से दूसरी तरफ जाता है", "कमर में चारों तरफ दर्द",
    ],
    "Into groin (L)": GROIN.L,
    "Into groin (R)": GROIN.R,
    "To buttock (L)": TO_BUT.L,
    "To buttock (R)": TO_BUT.R,
    "To posterior thigh (L)": POST_THIGH.L,
    "To posterior thigh (R)": POST_THIGH.R,
    "To anterior thigh (L)": ANT_THIGH.L,
    "To anterior thigh (R)": ANT_THIGH.R,
    "To lateral thigh": [
      "pain on the outer side of the thigh", "pain down the side of the thigh", "lateral thigh pain from the back", "outside of the thigh hurts", "pain spreads to the outer thigh", "pain along the outer side of the leg to the thigh",
      "jaangh ke bahar ki taraf dard", "jaangh ki side me dard", "kamar se jaangh ke bahari hisse me dard", "jaangh ke bagal me dard",
      "जांघ के बाहर की तरफ दर्द", "जांघ की साइड में दर्द", "कमर से जांघ के बाहरी हिस्से में दर्द", "जांघ के बगल में दर्द",
    ],
    "To knee (L)": KNEE.L,
    "To knee (R)": KNEE.R,
    "To calf (L)": CALF.L,
    "To calf (R)": CALF.R,
    "To lateral lower leg (L5)": [
      "pain along the outer side of the shin", "outer side of the lower leg", "pain down the side of the shin", "lateral lower leg pain", "pain on the outside of the lower leg", "l5 pattern pain down the outside of the leg",
      "pindli ke bahar ki taraf dard", "taang ke bahari hisse me dard", "pair ke bahar ki side me dard", "shin ke bahar dard",
      "पिंडली के बाहर की तरफ दर्द", "टांग के बाहरी हिस्से में दर्द", "पैर के बाहर की साइड में दर्द", "शिन के बाहर दर्द",
    ],
    "To medial lower leg (L4)": [
      "pain along the inner side of the shin", "inner side of the lower leg", "pain down the inside of the shin", "medial lower leg pain", "pain on the inside of the lower leg", "l4 pattern pain down the inside of the leg",
      "pindli ke andar ki taraf dard", "taang ke andar wale hisse me dard", "pair ke andar ki side me dard", "shin ke andar dard",
      "पिंडली के अंदर की तरफ दर्द", "टांग के अंदर वाले हिस्से में दर्द", "पैर के अंदर की साइड में दर्द", "शिन के अंदर दर्द",
    ],
    "To dorsum of foot (L5)": [
      "pain on the top of the foot", "top of the foot hurts", "dorsum of the foot", "numbness on the top of the foot", "pain over the top of my foot from the back", "top of the foot and big toe",
      "pair ke upar ki taraf dard", "pair ke upri hisse me dard", "pair ke upar sunnpan", "paanv ke upar wale hisse me jhunjhuni",
      "पैर के ऊपर की तरफ दर्द", "पैर के ऊपरी हिस्से में दर्द", "पैर के ऊपर सुन्नपन", "पांव के ऊपर वाले हिस्से में झनझनाहट",
    ],
    "To sole of foot (S1)": [
      "pain in the sole of the foot", "sole of the foot hurts", "burning in the sole", "numbness in the sole of my foot", "pain under the foot from the back", "tingling on the bottom of the foot", "pain in the sole and outer foot",
      "talwe me dard", "pair ke talwe me jalan", "talwe me sunnpan", "pair ke neeche wale hisse me jhunjhuni",
      "तलवे में दर्द", "पैर के तलवे में जलन", "तलवे में सुन्नपन", "पैर के नीचे वाले हिस्से में झनझनाहट",
    ],
    "To toes (L)": TOES.L,
    "To toes (R)": TOES.R,
    "Bilateral lower limb — concerning": [
      "pain in both legs", "both legs are affected by the pain", "pain goes down both legs", "pain radiating into both legs", "both legs hurt", "pain in both legs and feet", "bilateral leg pain",
      "dono pairon me dard", "dono pair prabhavit hain dard se", "kamar se dono pairon me dard utarta hai", "dono pair dukhte hain",
      "दोनों पैरों में दर्द", "दोनों पैर दर्द से प्रभावित हैं", "कमर से दोनों पैरों में दर्द उतरता है", "दोनों पैर दुखते हैं",
    ],
  },

  mechanismType: {
    "No clear mechanism — insidious onset": [
      "no clear mechanism", "gradual onset", "came on slowly", "no injury it came on gradually", "built up over weeks", "started by itself", "crept up slowly", "slowly got worse with no injury",
      "bina chot ke dheere dheere shuru hua", "apne aap shuru hua", "dheere dheere dard badhta gaya", "koi chot nahi lagi bas dard badhta gaya",
      "बिना चोट के धीरे धीरे शुरू हुआ", "अपने आप शुरू हुआ", "धीरे धीरे दर्द बढ़ता गया", "कोई चोट नहीं लगी बस दर्द बढ़ता गया",
    ],
    "Lifting — spine flexed": [
      "lifted something bending forward", "lifting with a bent back", "lifted with my back rounded", "bent over to lift and felt it go", "lifted a heavy object with a flexed spine", "lifting with a stooped back", "picked up something heavy bending my back",
      "jhukkar bhaari saman uthaya", "peeth jhukakar wazan uthate waqt dard", "jhuk kar uthane se kamar me jhatka", "kamar mod kar bhaari cheez uthayi",
      "झुककर भारी सामान उठाया", "पीठ झुकाकर वजन उठाते वक्त दर्द", "झुक कर उठाने से कमर में झटका", "कमर मोड़कर भारी चीज उठाई",
    ],
    "Lifting — spine rotated": [
      "lifted while twisted", "lifting and turning to one side", "lifted a weight with my body rotated", "lifting something off to the side", "twisted while lifting", "lifting with the trunk rotated", "picked it up while turning",
      "ghoomte hue wazan uthaya", "mud kar bhaari saman uthane se", "side me ghumkar uthate waqt dard", "ghumte waqt cheez uthane se kamar me jhatka",
      "घूमते हुए वजन उठाया", "मुड़ कर भारी सामान उठाने से", "साइड में घूमकर उठाते वक्त दर्द", "घूमते वक्त चीज उठाने से कमर में झटका",
    ],
    "Lifting — spine flexed AND rotated (most common disc mechanism)": [
      "lifted while bending and twisting", "bent forward and twisted while lifting", "lifting with a flexed and rotated spine", "bending and twisting to pick something up", "lifted and twisted at the same time", "twisted and bent over while lifting a heavy box",
      "jhukkar aur ghumkar bhaari saman uthaya", "jhukte aur mudte hue wazan uthane se", "jhuk kar ghumne par uthate waqt kamar me chot", "ek saath jhuk aur mud kar uthane se",
      "झुककर और घूमकर भारी सामान उठाया", "झुकते और मुड़ते हुए वजन उठाने से", "झुक कर घूमने पर उठाते वक्त कमर में चोट", "एक साथ झुक और मुड़ कर उठाने से",
    ],
    "Lifting — from floor (deadlift position)": [
      "lifted from the floor", "picked something up off the floor", "lifting from ground level", "deadlift", "lifting a heavy box off the ground", "lifting a weight from the floor", "bent down to pick up a heavy bag from the floor",
      "zameen se bhaari saman uthaya", "farsh se wazan uthate waqt dard", "neeche se bhaari cheez uthane se", "zameen se uthate waqt kamar me jhatka",
      "जमीन से भारी सामान उठाया", "फर्श से वजन उठाते वक्त दर्द", "नीचे से भारी चीज उठाने से", "जमीन से उठाते वक्त कमर में झटका",
    ],
    "Twisting without lifting": [
      "twisted my back without lifting anything", "twisting injury", "turned suddenly and felt a catch", "twisted awkwardly", "rotated my trunk and felt a sharp pain", "twisting motion", "spun round and felt something go in my back",
      "bina uthaye kamar mod di", "achanak ghumne par kamar me jhatka", "ghumte waqt kamar me kat se laga", "kamar mud gayi",
      "बिना उठाए कमर मोड़ दी", "अचानक घूमने पर कमर में झटका", "घूमते वक्त कमर में कट से लगा", "कमर मुड़ गई",
    ],
    "Bending forward without lifting": [
      "bent forward and it caught", "bending down to pick up a pen", "bent forward to tie my shoes and felt a pull", "bending forward with nothing in my hands", "leaned forward and my back went", "felt it go when i bent over",
      "jhukte hi kamar pakad gayi", "jhukkar joote bandhte waqt kamar me jhatka", "bina kuch uthaye jhukne par dard", "aage jhukte hi kamar me kat",
      "झुकते ही कमर पकड़ गई", "झुककर जूते बांधते वक्त कमर में झटका", "बिना कुछ उठाए झुकने पर दर्द", "आगे झुकते ही कमर में कट",
    ],
    "Coughing / sneezing — onset": [
      "started with a sneeze", "pain began when i coughed", "sneezed and my back went", "onset after a cough", "coughing brought it on", "felt it go when i sneezed", "a big sneeze set it off",
      "chheenk aane par kamar me dard shuru hua", "khansi ke dauran dard shuru hua", "chheenkte hi kamar pakad gayi", "khansne se dard shuru hua",
      "छींक आने पर कमर में दर्द शुरू हुआ", "खांसी के दौरान दर्द शुरू हुआ", "छींकते ही कमर पकड़ गई", "खांसने से दर्द शुरू हुआ",
    ],
    "Straining on toilet (Valsalva)": [
      "straining on the toilet", "pain started while straining to pass stool", "valsalva", "strained on the toilet and my back went", "constipation straining brought it on", "bearing down on the toilet", "pushing hard in the toilet",
      "shauch me zor lagane se dard shuru hua", "potty me zor lagate waqt kamar me dard", "kabz me zor lagane se", "toilet me strain karne se",
      "शौच में जोर लगाने से दर्द शुरू हुआ", "पॉटी में जोर लगाते वक्त कमर में दर्द", "कब्ज में जोर लगाने से", "टॉयलेट में स्ट्रेन करने से",
    ],
    "Stumble / trip without full fall": [
      "tripped and didnt fall", "stumbled and jarred my back", "missed a step and jolted my back", "tripped on a kerb and caught myself", "stumbled without falling", "missed the bottom stair", "slipped and managed to stay on my feet",
      "ladkhada gaya par gira nahi", "sidhi chhoot gayi aur kamar me jhatka", "thokar lagi par gira nahi", "pair phisla par sambhal gaya",
      "लड़खड़ा गया पर गिरा नहीं", "सीढ़ी छूट गई और कमर में झटका", "ठोकर लगी पर गिरा नहीं", "पैर फिसला पर संभल गया",
    ],
    "Fall onto back / buttocks": [
      "fell on my back", "fell onto my bottom", "fell backwards onto my tailbone", "landed on my buttocks", "slipped and fell on my back", "fall onto the back", "sat down hard on the floor", "fell on my backside",
      "peeth ke bal gir gaya", "chutad ke bal gir gaya", "phisalkar kamar ke bal gira", "peeche ki taraf gir gaya",
      "पीठ के बल गिर गया", "चूतड़ के बल गिर गया", "फिसलकर कमर के बल गिरा", "पीछे की तरफ गिर गया",
    ],
    "Fall from height": [
      "fell from a height", "fell from a ladder", "fell off a roof", "fall from a tree", "fell down a flight of stairs", "fell from a scaffold", "fell off a wall", "fell from the second floor",
      "oonchai se gir gaya", "seedhi se gir gaya", "chhat se gir gaya", "ped se gir gaya",
      "ऊंचाई से गिर गया", "सीढ़ी से गिर गया", "छत से गिर गया", "पेड़ से गिर गया",
    ],
    "Motor vehicle accident": [
      "car accident", "road traffic accident", "rear ended", "motor vehicle accident", "mva", "bike accident", "hit by a car", "car crash", "seatbelt injury",
      "accident me kamar me chot", "gaadi ki takkar", "road accident me chot lagi", "bike se takra gaya",
      "एक्सीडेंट में कमर में चोट", "गाड़ी की टक्कर", "सड़क दुर्घटना में चोट लगी", "बाइक से टकरा गया",
    ],
    "Sport — specific (notes)": [
      "injured playing sport", "hurt it playing football", "pulled my back playing cricket", "injury while weight training", "hurt it at the gym", "sports injury", "golf swing injury", "back went during a game",
      "khelte waqt kamar me chot", "cricket khelte waqt kamar pakad gayi", "gym me kamar me chot", "football khelte hue dard shuru hua",
      "खेलते वक्त कमर में चोट", "क्रिकेट खेलते वक्त कमर पकड़ गई", "जिम में कमर में चोट", "फुटबॉल खेलते हुए दर्द शुरू हुआ",
    ],
    "Sustained poor posture over time": [
      "poor posture", "sustained poor posture", "slouching for years", "desk job posture", "sitting at a desk all day", "long hours at the computer", "sitting for hours every day", "hunched over a laptop",
      "kharab posture ki wajah se", "ghanto baithkar kaam karne se", "desk job ki wajah se kamar dard", "computer ke saamne der tak baithne se",
      "खराब पोस्चर की वजह से", "घंटों बैठकर काम करने से", "डेस्क जॉब की वजह से कमर दर्द", "कंप्यूटर के सामने देर तक बैठने से",
    ],
    "Post-surgical": [
      "post surgical", "after surgery", "after spinal surgery", "post operative", "since my operation", "after the discectomy", "after the back operation", "following surgery",
      "operation ke baad se dard", "kamar ke operation ke baad", "surgery ke baad kamar me dard", "operation ke baad dard shuru hua",
      "ऑपरेशन के बाद से दर्द", "कमर के ऑपरेशन के बाद", "सर्जरी के बाद कमर में दर्द", "ऑपरेशन के बाद दर्द शुरू हुआ",
    ],
    "Post-partum": [
      "post partum", "after delivery", "after childbirth", "after having my baby", "since the baby was born", "after pregnancy", "following the birth of my child", "after my c section",
      "delivery ke baad se kamar dard", "bachche ke janm ke baad se dard", "pregnancy ke baad kamar me dard", "baby hone ke baad se kamar dard",
      "डिलीवरी के बाद से कमर दर्द", "बच्चे के जन्म के बाद से दर्द", "प्रेग्नेंसी के बाद कमर में दर्द", "बेबी होने के बाद से कमर दर्द",
    ],
    "Post-illness": [
      "after a viral illness", "after the flu", "after a fever", "post viral", "after a bad infection", "after being ill", "after covid", "after typhoid",
      "bukhar ke baad kamar dard", "viral ke baad kamar me dard", "bimari ke baad kamar dard shuru hua", "typhoid ke baad se dard",
      "बुखार के बाद कमर दर्द", "वायरल के बाद कमर में दर्द", "बीमारी के बाद कमर दर्द शुरू हुआ", "टाइफाइड के बाद से दर्द",
    ],
    "No identified mechanism": [
      "~no identified mechanism", "cannot identify any cause", "no idea how it started", "no obvious cause", "dont know what caused it", "no known reason", "cannot think of anything that caused it", "nothing specific happened",
      "pata nahi kaise shuru hua", "koi wajah samajh nahi aati", "kya hua pata nahi", "kisi wajah ka andaza nahi",
      "पता नहीं कैसे शुरू हुआ", "कोई वजह समझ नहीं आती", "क्या हुआ पता नहीं", "किसी वजह का अंदाजा नहीं",
    ],
  },

  aggPostures: {
    "Sitting — any duration": [
      "~sitting", "sitting hurts", "any sitting is painful", "cannot sit at all", "pain as soon as i sit", "sitting makes it worse", "sitting is the worst", "pain when i sit down",
      "baithne par dard", "baithte hi dard badhta hai", "baithna mushkil", "baithne se kamar dard",
      "बैठने पर दर्द", "बैठते ही दर्द बढ़ता है", "बैठना मुश्किल", "बैठने से कमर दर्द",
    ],
    "Sitting >15 minutes": [
      "sitting for more than 15 minutes", "after sitting 15 minutes it starts", "cannot sit longer than 15 minutes", "pain after sitting for 20 minutes", "sitting over 15 minutes hurts",
      "pandrah minute se zyada baithne par dard", "pandrah minute baithne ke baad dard shuru", "bees minute baithne par dard", "15 minute se zyada baith nahi pata",
      "पंद्रह मिनट से ज्यादा बैठने पर दर्द", "पंद्रह मिनट बैठने के बाद दर्द शुरू", "बीस मिनट बैठने पर दर्द", "15 मिनट से ज्यादा बैठ नहीं पाता",
    ],
    "Sitting >30 minutes": [
      "sitting for more than 30 minutes", "after sitting half an hour it starts", "cannot sit longer than half an hour", "pain after sitting for 40 minutes", "sitting over 30 minutes hurts",
      "tees minute se zyada baithne par dard", "aadha ghanta baithne ke baad dard shuru", "chalis minute baithne par dard", "30 minute se zyada baith nahi pata",
      "तीस मिनट से ज्यादा बैठने पर दर्द", "आधा घंटा बैठने के बाद दर्द शुरू", "चालीस मिनट बैठने पर दर्द", "30 मिनट से ज्यादा बैठ नहीं पाता",
    ],
    "Sitting >1 hour": [
      "sitting for more than an hour", "after sitting an hour it starts", "cannot sit longer than an hour", "pain after sitting for two hours", "sitting over an hour hurts", "long sitting is painful",
      "ek ghante se zyada baithne par dard", "ek ghanta baithne ke baad dard shuru", "do ghante baithne par dard", "lamba baithne par dard",
      "एक घंटे से ज्यादा बैठने पर दर्द", "एक घंटा बैठने के बाद दर्द शुरू", "दो घंटे बैठने पर दर्द", "लंबा बैठने पर दर्द",
    ],
    "Soft / unsupported seating": [
      "soft sofa makes it worse", "sitting on a soft couch hurts", "unsupported seating", "sitting on a stool is painful", "low soft seats are the worst", "the sofa kills my back", "sitting on a bench without a back hurts",
      "naram sofa par baithne se dard", "bina sahare ki kursi par dard", "naram gadde par baithne par kamar dard", "stool par baithne se dard",
      "नरम सोफे पर बैठने से दर्द", "बिना सहारे की कुर्सी पर दर्द", "नरम गद्दे पर बैठने पर कमर दर्द", "स्टूल पर बैठने से दर्द",
    ],
    "Standing — any duration": [
      "~standing", "standing hurts", "any standing is painful", "cannot stand at all", "pain as soon as i stand", "standing makes it worse", "pain when i stand up",
      "khade hone par dard", "khade hote hi dard badhta hai", "khade rehna mushkil", "khade hone se kamar dard",
      "खड़े होने पर दर्द", "खड़े होते ही दर्द बढ़ता है", "खड़े रहना मुश्किल", "खड़े होने से कमर दर्द",
    ],
    "Standing >15 minutes": [
      "standing for more than 15 minutes", "after standing 15 minutes it starts", "cannot stand longer than 15 minutes", "pain after standing for 20 minutes", "standing over 15 minutes hurts",
      "pandrah minute se zyada khade rehne par dard", "pandrah minute khade rehne ke baad dard shuru", "bees minute khade rehne par dard", "15 minute se zyada khada nahi reh pata",
      "पंद्रह मिनट से ज्यादा खड़े रहने पर दर्द", "पंद्रह मिनट खड़े रहने के बाद दर्द शुरू", "बीस मिनट खड़े रहने पर दर्द", "15 मिनट से ज्यादा खड़ा नहीं रह पाता",
    ],
    "Standing >30 minutes": [
      "standing for more than 30 minutes", "after standing half an hour it starts", "cannot stand longer than half an hour", "pain after standing for 40 minutes", "standing over 30 minutes hurts", "long standing is painful",
      "tees minute se zyada khade rehne par dard", "aadha ghanta khade rehne ke baad dard shuru", "chalis minute khade rehne par dard", "30 minute se zyada khada nahi reh pata",
      "तीस मिनट से ज्यादा खड़े रहने पर दर्द", "आधा घंटा खड़े रहने के बाद दर्द शुरू", "चालीस मिनट खड़े रहने पर दर्द", "30 मिनट से ज्यादा खड़ा नहीं रह पाता",
    ],
    "Lying supine (flat)": [
      "lying flat on my back hurts", "pain when i lie on my back", "lying supine makes it worse", "cannot lie flat", "lying on my back is painful", "flat on my back is the worst", "back lying aggravates it",
      "seedha let kar dard", "peeth ke bal lete to dard", "seedhe lete rehne par dard badhta hai", "peeth ke bal sona mushkil",
      "सीधा लेटकर दर्द", "पीठ के बल लेटे तो दर्द", "सीधे लेटे रहने पर दर्द बढ़ता है", "पीठ के बल सोना मुश्किल",
    ],
    "Lying prone (face down)": [
      "lying face down hurts", "pain when i lie on my stomach", "lying prone makes it worse", "cannot lie on my front", "sleeping on my stomach is painful", "face down aggravates it",
      "ulta let kar dard", "pet ke bal lete to dard", "ulta lete rehne par dard badhta hai", "pet ke bal sona mushkil",
      "उल्टा लेटकर दर्द", "पेट के बल लेटे तो दर्द", "उल्टा लेटे रहने पर दर्द बढ़ता है", "पेट के बल सोना मुश्किल",
    ],
    "Lying on left side": SIDE_LYING.L,
    "Lying on right side": SIDE_LYING.R,
    "Driving (duration — specify in notes)": [
      "~driving", "driving hurts", "pain when i drive", "long drives are painful", "driving makes it worse", "after driving for an hour my back kills me", "the car seat aggravates it",
      "gaadi chalane par kamar dard", "driving ke baad dard badhta hai", "lambi drive me kamar dard", "gaadi chalate waqt dard",
      "गाड़ी चलाने पर कमर दर्द", "ड्राइविंग के बाद दर्द बढ़ता है", "लंबी ड्राइव में कमर दर्द", "गाड़ी चलाते वक्त दर्द",
    ],
    "Reading in bed": [
      "~reading in bed", "reading in bed hurts", "propped up in bed makes it worse", "sitting up in bed with a book is painful", "lying propped up reading hurts", "using the phone in bed hurts my back", "reading lying propped up on pillows",
      "bistar par padhte waqt dard", "bed par tek lagakar padhne se dard", "bistar me mobile chalate waqt kamar dard", "lete lete padhne se kamar dard",
      "बिस्तर पर पढ़ते वक्त दर्द", "बेड पर टेक लगाकर पढ़ने से दर्द", "बिस्तर में मोबाइल चलाते वक्त कमर दर्द", "लेटे लेटे पढ़ने से कमर दर्द",
    ],
    "Slumped / flexed posture": [
      "~slumped", "slumping makes it worse", "slouched sitting hurts", "sitting slumped on the sofa", "slouching aggravates it", "rounded back posture is painful", "flexed posture hurts", "slouching at my desk",
      "jhuk kar baithne par dard", "kamar jhukakar baithne se dard badhta hai", "kubad nikalkar baithne par dard", "dhile baithne par kamar dard",
      "झुककर बैठने पर दर्द", "कमर झुकाकर बैठने से दर्द बढ़ता है", "कूबड़ निकालकर बैठने पर दर्द", "ढीले बैठने पर कमर दर्द",
    ],
    "Forward bent posture (e.g. over sink)": [
      "bending over the sink", "standing bent forward", "leaning over a bench", "bent over washing dishes", "stooping for a while", "bent forward position hurts", "washing my face bent over the basin", "bending over to cook",
      "sink par jhukkar kaam karte waqt dard", "jhuke jhuke kaam karne par dard", "aage jhukkar bartan dhote waqt kamar dard", "jhukkar khade rehne par dard",
      "सिंक पर झुककर काम करते वक्त दर्द", "झुके झुके काम करने पर दर्द", "आगे झुककर बर्तन धोते वक्त कमर दर्द", "झुककर खड़े रहने पर दर्द",
    ],
    "Twisted / asymmetric posture": [
      "twisted sitting hurts", "sitting with my legs crossed", "sleeping twisted", "asymmetric posture aggravates it", "sitting turned to one side at my desk", "standing on one leg", "carrying a child on one hip",
      "tedha baithne par dard", "pair par pair chadhakar baithne se dard", "ek taraf mudkar baithne par kamar dard", "ek pair par khade hone se dard",
      "टेढ़ा बैठने पर दर्द", "पैर पर पैर चढ़ाकर बैठने से दर्द", "एक तरफ मुड़कर बैठने पर कमर दर्द", "एक पैर पर खड़े होने से दर्द",
    ],
  },

  relPostures: {
    "Lying flat (supine)": [
      "lying flat on my back eases it", "lying down flat relieves the pain", "flat on my back helps", "relief when i lie on my back", "lying supine gives relief", "being flat on the floor helps",
      "seedha lete rehne se aaram", "peeth ke bal lete to dard kam", "seedhe let kar rahat milti hai", "seedha lette hi aaram",
      "सीधा लेटे रहने से आराम", "पीठ के बल लेटे तो दर्द कम", "सीधे लेटकर राहत मिलती है", "सीधा लेटते ही आराम",
    ],
    "Lying with knees bent (crook lying)": [
      "~crook lying", "lying with my knees bent helps", "knees up on the bed relieves it", "lying on my back with knees bent eases the pain", "crook lying gives relief", "bent knees while lying feels better",
      "ghutne mod kar lette to aaram", "ghutne upar karke lete rehne se dard kam", "lette hue ghutne mode to rahat", "ghutne mod kar sone se aaram",
      "घुटने मोड़कर लेटे तो आराम", "घुटने ऊपर करके लेटे रहने से दर्द कम", "लेटे हुए घुटने मोड़े तो राहत", "घुटने मोड़कर सोने से आराम",
    ],
    "Lying with pillow under knees": [
      "pillow under my knees helps", "a pillow under the knees relieves it", "lying with a pillow beneath my knees eases the pain", "knees propped on a pillow feels better", "pillow under the knees gives relief",
      "ghutno ke neeche takiya rakhne se aaram", "ghutne ke niche takiya lagane se dard kam", "takiya ghutno ke niche rakhkar lete to rahat", "ghutno ke neeche takiye se aaram",
      "घुटनों के नीचे तकिया रखने से आराम", "घुटने के नीचे तकिया लगाने से दर्द कम", "तकिया घुटनों के नीचे रखकर लेटे तो राहत", "घुटनों के नीचे तकिये से आराम",
    ],
    "Lying on side — knees together": [
      "lying on my side with knees together helps", "side lying with the knees together eases it", "curled up on my side with my knees together", "on my side knees together feels better",
      "karwat par ghutne saath rakhkar lette to aaram", "ghutne milakar karwat se sone par dard kam", "ghutne jod kar side me let kar rahat",
      "करवट पर घुटने साथ रखकर लेटे तो आराम", "घुटने मिलाकर करवट से सोने पर दर्द कम", "घुटने जोड़कर साइड में लेटकर राहत",
    ],
    "Lying on side — pillow between knees": [
      "pillow between my knees helps", "a pillow between the knees when i sleep on my side", "side lying with a pillow between the knees relieves it", "pillow between the legs eases the pain", "sleeping on my side with a pillow between my knees",
      "ghutno ke beech takiya rakhne se aaram", "ghutne ke beech takiya lagakar karwat se sone par dard kam", "pairon ke beech takiya rakhkar sone se rahat", "ghutno ke beech takiye se aaram",
      "घुटनों के बीच तकिया रखने से आराम", "घुटने के बीच तकिया लगाकर करवट से सोने पर दर्द कम", "पैरों के बीच तकिया रखकर सोने से राहत", "घुटनों के बीच तकिये से आराम",
    ],
    "Lying prone (face down)": [
      "lying face down relieves it", "lying on my stomach helps", "prone lying eases the pain", "relief when i lie on my front", "sleeping on my stomach feels better", "face down gives relief",
      "ulta lette to aaram", "pet ke bal lete rehne se dard kam", "ulta lete hue rahat milti hai", "pet ke bal sone se aaram",
      "उल्टा लेटे तो आराम", "पेट के बल लेटे रहने से दर्द कम", "उल्टा लेटे हुए राहत मिलती है", "पेट के बल सोने से आराम",
    ],
    "Prone on elbows (extension load)": [
      "~prone on elbows", "propping myself up on my elbows helps", "lying on my front propped on elbows eases it", "on my elbows relieves the pain", "extension on elbows gives relief", "mckenzie press up on elbows helps", "sphinx position helps",
      "kohniyon ke sahare ulta lette to aaram", "kohni par tek lagakar ulta lete rehne se dard kam", "kohniyon par uthkar lete to rahat", "sphinx position se aaram",
      "कोहनियों के सहारे उल्टा लेटे तो आराम", "कोहनी पर टेक लगाकर उल्टा लेटे रहने से दर्द कम", "कोहनियों पर उठकर लेटे तो राहत", "स्फिंक्स पोजीशन से आराम",
    ],
    "Sitting with good lumbar support": [
      "sitting with a lumbar roll helps", "a lumbar support makes sitting comfortable", "sitting with good back support relieves it", "a rolled towel behind my back helps", "supported sitting eases the pain", "a cushion behind my back helps",
      "peeth ke peeche sahara lagakar baithne se aaram", "lumbar roll lagane se dard kam", "kamar ke peeche takiya rakhkar baithne se rahat", "sahare ke saath baithne par aaram",
      "पीठ के पीछे सहारा लगाकर बैठने से आराम", "लंबर रोल लगाने से दर्द कम", "कमर के पीछे तकिया रखकर बैठने से राहत", "सहारे के साथ बैठने पर आराम",
    ],
    "Sitting on firm chair": [
      "a firm chair helps", "sitting on a hard chair is better", "firm seat relieves it", "sitting on a firm surface eases the pain", "a hard seat feels better", "firm chairs are best",
      "sakht kursi par baithne se aaram", "kadak kursi par baithne par dard kam", "sakht seat par rahat", "kadi kursi par baithna theek lagta hai",
      "सख्त कुर्सी पर बैठने से आराम", "कड़क कुर्सी पर बैठने पर दर्द कम", "सख्त सीट पर राहत", "कड़ी कुर्सी पर बैठना ठीक लगता है",
    ],
    "Standing — weight shifted": [
      "shifting my weight helps", "standing with my weight on one leg eases it", "weight shifted onto one leg relieves the pain", "leaning on one leg feels better", "changing my standing position helps", "resting one foot on a stool when standing helps",
      "wazan ek pair par daalne se aaram", "khade hokar pair badalte rehne se dard kam", "ek pair par bhaar dalkar khade hone se rahat", "khade hue pair badalne se aaram",
      "वजन एक पैर पर डालने से आराम", "खड़े होकर पैर बदलते रहने से दर्द कम", "एक पैर पर भार डालकर खड़े होने से राहत", "खड़े हुए पैर बदलने से आराम",
    ],
    "Walking slowly": [
      "walking slowly helps", "a slow walk eases the pain", "gentle walking relieves it", "strolling around is better than sitting", "a slow walk loosens it up", "walking at an easy pace gives relief",
      "dheere chalne se aaram", "dheere dheere tahalne se dard kam", "halka chalne se rahat", "dheere chalne par theek lagta hai",
      "धीरे चलने से आराम", "धीरे धीरे टहलने से दर्द कम", "हल्का चलने से राहत", "धीरे चलने पर ठीक लगता है",
    ],
    "Hands and knees (flexion unloading)": [
      "~on all fours", "on all fours eases the pain", "on my hands and knees relieves it", "crawling position helps", "going onto hands and knees feels better", "all fours gives relief", "cat camel position on hands and knees helps",
      "haath aur ghutno par aane se aaram", "chaar pairon par hone se dard kam", "haath ghutne tek kar rahne par rahat", "ghutno aur haathon ke bal aane par aaram",
      "हाथ और घुटनों पर आने से आराम", "चार पैरों पर होने से दर्द कम", "हाथ घुटने टेक कर रहने पर राहत", "घुटनों और हाथों के बल आने पर आराम",
    ],
    "Leaning forward on trolley / counter (stenosis pattern)": [
      "leaning on the shopping trolley helps", "leaning forward on a counter eases it", "leaning over a trolley relieves the pain", "bending forward over a walker helps", "leaning on a table feels better", "leaning forward on the supermarket trolley makes walking easier",
      "trolley par jhukkar chalne se aaram", "counter par jhukkar khade hone se dard kam", "table par tek lagakar khade hone se rahat", "aage jhukkar chalne par aaram",
      "ट्रॉली पर झुककर चलने से आराम", "काउंटर पर झुककर खड़े होने से दर्द कम", "टेबल पर टेक लगाकर खड़े होने से राहत", "आगे झुककर चलने पर आराम",
    ],
    "Sitting with legs elevated": [
      "legs up helps", "sitting with my feet up relieves it", "putting my legs up on a stool eases the pain", "recliner with legs elevated is best", "feet raised while sitting feels better", "legs on a footstool gives relief",
      "pair upar karke baithne se aaram", "pairon ko upar rakhne se dard kam", "stool par pair rakhkar baithne se rahat", "pair uthakar baithne par aaram",
      "पैर ऊपर करके बैठने से आराम", "पैरों को ऊपर रखने से दर्द कम", "स्टूल पर पैर रखकर बैठने से राहत", "पैर उठाकर बैठने पर आराम",
    ],
  },

  overallPattern: {
    "Constant — never goes away": [
      "~constant", "constant pain", "pain all the time", "never goes away", "pain 24 hours a day", "always there", "the pain is constant", "pain never settles completely",
      "hamesha dard", "lagatar dard rehta hai", "dard kabhi khatam nahi hota", "din raat dard rehta hai",
      "हमेशा दर्द", "लगातार दर्द रहता है", "दर्द कभी खत्म नहीं होता", "दिन रात दर्द रहता है",
    ],
    "Constant — varies in intensity hour to hour": [
      "constant and varies hour to hour", "always there and goes up and down", "background pain that fluctuates through the day", "constant ache that changes in severity", "never goes away completely and some hours are worse", "pain is always present and the intensity changes",
      "dard hamesha rehta hai par ghante ke hisaab se badalta hai", "lagatar dard par tezi badalti rehti hai", "dard hota hai par kabhi halka kabhi tez", "hamesha dard par ghante ke hisaab se kam zyada",
      "दर्द हमेशा रहता है पर घंटे के हिसाब से बदलता है", "लगातार दर्द पर तेजी बदलती रहती है", "दर्द होता है पर कभी हल्का कभी तेज", "हमेशा दर्द पर घंटे के हिसाब से कम ज्यादा",
    ],
    "Intermittent — clear triggers": [
      "comes and goes with clear triggers", "intermittent with obvious triggers", "pain comes on when i do certain things", "only appears with specific movements and then settles", "intermittent pain brought on by bending",
      "kuch khaas kaam karne par dard aata jata hai", "kisi khaas harkat se dard aata hai aur phir chala jata hai", "jab kuch khaas karta hoon tab hi dard", "dard ke kaaran saaf pata hain",
      "कुछ खास काम करने पर दर्द आता जाता है", "किसी खास हरकत से दर्द आता है और फिर चला जाता है", "जब कुछ खास करता हूं तब ही दर्द", "दर्द के कारण साफ पता हैं",
    ],
    "Intermittent — unpredictable": [
      "comes and goes for no reason", "unpredictable pain", "random episodes of pain", "intermittent with no pattern", "pain appears out of nowhere", "no way of predicting when it comes", "pain comes at random",
      "dard bina wajah aata jata hai", "kab aayega pata nahi chalta", "achanak dard aa jata hai", "dard ka koi pattern nahi hai",
      "दर्द बिना वजह आता जाता है", "कब आएगा पता नहीं चलता", "अचानक दर्द आ जाता है", "दर्द का कोई पैटर्न नहीं है",
    ],
    "Only with specific loading": [
      "only when i load the spine", "only when lifting", "only with heavy loading", "only when i carry something heavy", "pain only with specific loads", "only when i put weight through my back", "only on lifting or carrying",
      "sirf bhaari saman uthane par dard", "sirf wazan padne par dard", "sirf khaas bojh uthane par", "bojh dalne par hi dard hota hai",
      "सिर्फ भारी सामान उठाने पर दर्द", "सिर्फ वजन पड़ने पर दर्द", "सिर्फ खास बोझ उठाने पर", "बोझ डालने पर ही दर्द होता है",
    ],
    "Only at rest / worse at rest": [
      "worse at rest", "worse when i am still", "pain is worse when i rest", "better when i move and worse when i rest", "worse when resting", "settles with moving and flares with rest", "worse sitting still",
      "aaram karne par dard badhta hai", "chup baithne par zyada dard", "rest karne se dard badhta hai", "hilne dulne se kam aur aaram se zyada",
      "आराम करने पर दर्द बढ़ता है", "चुप बैठने पर ज्यादा दर्द", "रेस्ट करने से दर्द बढ़ता है", "हिलने डुलने से कम और आराम से ज्यादा",
    ],
    "Morning dominant": [
      "worse in the morning", "worst first thing in the morning", "stiff and sore when i wake up", "morning pain is the worst", "bad on waking", "pain on getting out of bed", "morning stiffness in the back",
      "subah zyada dard", "subah uthte hi kamar me dard", "subah kamar akad jati hai", "subah sabse zyada takleef",
      "सुबह ज्यादा दर्द", "सुबह उठते ही कमर में दर्द", "सुबह कमर अकड़ जाती है", "सुबह सबसे ज्यादा तकलीफ",
    ],
    "Evening dominant — worse after day's activities": [
      "worse in the evening", "worst at the end of the day", "builds up through the day and is worst by evening", "evening pain", "gets worse as the day goes on", "end of day pain", "worse after a day on my feet",
      "shaam ko zyada dard", "din dhalte dard badhta hai", "shaam tak dard sabse zyada", "din bhar ke kaam ke baad shaam ko dard",
      "शाम को ज्यादा दर्द", "दिन ढलते दर्द बढ़ता है", "शाम तक दर्द सबसे ज्यादा", "दिन भर के काम के बाद शाम को दर्द",
    ],
    "Night dominant": [
      "~night dominant", "worse at night", "night pain", "pain wakes me up", "wakes me at night", "cannot sleep because of the pain", "pain is worst at night", "disturbs my sleep",
      "raat ko dard", "raat ko zyada dard", "raat ko dard se neend khul jati hai", "raat me kamar dard badhta hai",
      "रात को दर्द", "रात में ज्यादा दर्द", "रात को दर्द से नींद खुल जाती है", "रात में कमर दर्द बढ़ता है",
    ],
    "Activity-proportional (warms up then fades)": [
      "warms up and then fades", "stiff at first then eases once i get going", "pain increases the longer i am active", "proportional to how much i do", "eases off after the first few minutes of moving", "the more i do the worse it gets",
      "shuru me dard phir chalte rehne se kam", "jitna kaam utna dard", "garam hone ke baad dard kam ho jata hai", "hilne dulne ke baad dard kam",
      "शुरू में दर्द फिर चलते रहने से कम", "जितना काम उतना दर्द", "गरम होने के बाद दर्द कम हो जाता है", "हिलने डुलने के बाद दर्द कम",
    ],
    "Delayed onset — pain next day after activity": [
      "pain the next day after activity", "delayed pain after exercise", "worst the day after", "i pay for it the next day", "it hurts more the morning after a big day", "pain comes on a day later",
      "agle din dard hota hai", "kaam ke ek din baad dard", "agli subah zyada dard", "kaam karne ke agle din takleef",
      "अगले दिन दर्द होता है", "काम के एक दिन बाद दर्द", "अगली सुबह ज्यादा दर्द", "काम करने के अगले दिन तकलीफ",
    ],
    "Worse second half of night (AS inflammatory pattern)": [
      "worse in the second half of the night", "wakes me in the early hours with pain", "pain wakes me around 3 am", "waking at 4 in the morning with back pain", "second half of the night is the worst", "pain in the small hours",
      "raat ke doosre hisse me dard zyada", "teen baje ke baad dard se neend khul jati hai", "subah chaar baje dard se jaag jata hoon", "raat ke aakhri pahar me dard",
      "रात के दूसरे हिस्से में दर्द ज्यादा", "तीन बजे के बाद दर्द से नींद खुल जाती है", "सुबह चार बजे दर्द से जाग जाता हूं", "रात के आखिरी पहर में दर्द",
    ],
    "Unpredictable — no pattern (nociplastic flag)": [
      "no pattern at all", "no pattern to the pain", "nothing predictable about it", "cannot find any pattern", "random whatever i do", "no rhyme or reason to the pain", "pain with no pattern whatsoever",
      "dard ka koi pattern nahi", "kuch bhi karun dard ka koi pattern nahi", "dard kab hoga koi andaza nahi", "dard ka koi tarika nahi",
      "दर्द का कोई पैटर्न नहीं", "कुछ भी करूं दर्द का कोई पैटर्न नहीं", "दर्द कब होगा कोई अंदाजा नहीं", "दर्द का कोई तरीका नहीं",
    ],
  },

  neuroPresent: {
    "No leg neurological symptoms": [
      "~no", "no leg symptoms", "no numbness or tingling in the legs", "no leg weakness", "legs are fine", "no pins and needles in the legs", "no neurological symptoms in the legs", "no leg numbness",
      "pair me koi dikkat nahi", "pair me sunnpan nahi", "pair me jhunjhuni nahi", "pairon me kuch nahi",
      "पैर में कोई दिक्कत नहीं", "पैर में सुन्नपन नहीं", "पैर में झनझनाहट नहीं", "पैरों में कुछ नहीं",
    ],
    "Yes — unilateral (L)": NEURO.L,
    "Yes — unilateral (R)": NEURO.R,
    "Yes — bilateral (cauda equina / stenosis flag)": [
      "numbness in both legs", "both legs are weak", "tingling in both legs", "bilateral leg symptoms", "both legs feel numb and heavy", "weakness in both feet", "symptoms in both legs and feet",
      "dono pairon me sunnpan", "dono pairon me kamzori", "dono pairon me jhunjhuni", "dono pair sunn aur bhaari",
      "दोनों पैरों में सुन्नपन", "दोनों पैरों में कमजोरी", "दोनों पैरों में झनझनाहट", "दोनों पैर सुन्न और भारी",
    ],
  },

  bladderBaseline: {
    "Normal bladder and bowel before pain onset": [
      "bladder and bowels were normal before the pain", "normal bladder and bowel function before this started", "no bladder or bowel problems before the pain", "bladder and bowel fine before onset", "used to be normal for bladder and bowels",
      "dard se pehle peshab aur potty theek thi", "pehle bladder aur bowel normal the", "dard shuru hone se pehle peshab potty me koi dikkat nahi thi", "pehle sab normal tha peshab potty ka",
      "दर्द से पहले पेशाब और पॉटी ठीक थी", "पहले ब्लैडर और बाउल नॉर्मल थे", "दर्द शुरू होने से पहले पेशाब पॉटी में कोई दिक्कत नहीं थी", "पहले सब नॉर्मल था पेशाब पॉटी का",
    ],
    "Pre-existing bladder issues — specify in notes": [
      "i already had bladder problems before this", "pre existing bladder issues", "bladder trouble for years", "overactive bladder before the back pain", "long standing bladder problem", "bladder problem that was there before the pain",
      "pehle se peshab ki dikkat thi", "dard se pehle bhi bladder ki samasya thi", "peshab ki purani dikkat", "bladder ki dikkat pehle se hai",
      "पहले से पेशाब की दिक्कत थी", "दर्द से पहले भी ब्लैडर की समस्या थी", "पेशाब की पुरानी दिक्कत", "ब्लैडर की दिक्कत पहले से है",
    ],
    "Pre-existing bowel issues — specify in notes": [
      "i already had bowel problems before this", "pre existing bowel issues", "constipation for years before the back pain", "irritable bowel before this", "long standing bowel problem", "bowel problem that was there before the pain",
      "pehle se potty ki dikkat thi", "dard se pehle bhi bowel ki samasya thi", "potty ki purani dikkat", "kabz pehle se hai",
      "पहले से पॉटी की दिक्कत थी", "दर्द से पहले भी बाउल की समस्या थी", "पॉटी की पुरानी दिक्कत", "कब्ज पहले से है",
    ],
    "Not asked — needs clarifying": [
      "bladder and bowel not asked", "still need to ask about bladder and bowel", "baseline bladder function not asked yet", "need to clarify bladder and bowel history", "bladder bowel history not taken",
      "bladder aur bowel ke bare me poochha nahi", "peshab potty ke bare me poochna baaki hai", "bladder baseline abhi poochha nahi", "peshab potty ka history nahi liya",
      "ब्लैडर और बाउल के बारे में पूछा नहीं", "पेशाब पॉटी के बारे में पूछना बाकी है", "ब्लैडर बेसलाइन अभी पूछा नहीं", "पेशाब पॉटी का हिस्ट्री नहीं लिया",
    ],
    "Uncertain": [
      "~uncertain", "not sure about the bladder before the pain", "unsure whether bladder was normal before", "cannot remember if the bladder was fine before", "not sure about bowel habits before", "dont remember if there were bladder problems",
      "pehle peshab ka pata nahi", "yaad nahi pehle bladder theek tha ya nahi", "potty pehle normal thi ya nahi pata nahi", "bladder ke bare me pakka nahi",
      "पहले पेशाब का पता नहीं", "याद नहीं पहले ब्लैडर ठीक था या नहीं", "पॉटी पहले नॉर्मल थी या नहीं पता नहीं", "ब्लैडर के बारे में पक्का नहीं",
    ],
  },

  redFlagsCauda: {
    "No cauda equina signs": [
      "no cauda equina signs", "no signs of cauda equina", "cauda equina screen is negative", "no saddle numbness no bladder or bowel changes", "nothing to suggest cauda equina", "cauda equina negative",
      "cauda equina ke koi lakshan nahi", "peshab potty ya saddle area me koi dikkat nahi", "cauda equina screen negative", "cauda equina ke sanket nahi",
      "कौडा इक्वाइना के कोई लक्षण नहीं", "पेशाब पॉटी या सैडल एरिया में कोई दिक्कत नहीं", "कौडा इक्वाइना स्क्रीन नेगेटिव", "कौडा इक्वाइना के संकेत नहीं",
    ],
    "Bilateral leg weakness — new onset": [
      "both legs have become weak", "new weakness in both legs", "bilateral leg weakness", "both legs gave way", "cannot lift either foot", "weakness in both legs since yesterday", "legs feel heavy and weak on both sides",
      "dono pairon me nayi kamzori", "dono pair achanak kamzor ho gaye", "dono pairon me kamzori kal se", "dono pair jawab de rahe hain",
      "दोनों पैरों में नई कमजोरी", "दोनों पैर अचानक कमजोर हो गए", "दोनों पैरों में कमजोरी कल से", "दोनों पैर जवाब दे रहे हैं",
    ],
    "Saddle area anaesthesia — perineum / inner thighs": [
      "saddle numbness", "numbness in the saddle area", "numb between my legs", "numbness around the genitals and inner thighs", "numb perineum", "cannot feel when wiping", "numbness where i would sit on a saddle", "saddle anaesthesia",
      "jaangh ke beech sunnpan", "jaangh ke andar ki taraf aur private part me sunnpan", "saddle area me kuch mehsoos nahi hota", "jahan baithte hain wahan sunn pan",
      "जांघ के बीच सुन्नपन", "जांघ के अंदर की तरफ और प्राइवेट पार्ट में सुन्नपन", "सैडल एरिया में कुछ महसूस नहीं होता", "जहां बैठते हैं वहां सुन्नपन",
    ],
    "Bladder retention — cannot urinate": [
      "cannot pass urine", "unable to urinate", "urinary retention", "cant empty my bladder", "no urge to pass urine and cant go", "straining to pass urine with nothing coming", "bladder feels full and nothing comes",
      "peshab nahi ho pa raha", "peshab rok gaya hai", "peshab karne ka mann nahi hota aur nahi hota", "peshab nikalne me bahut dikkat",
      "पेशाब नहीं हो पा रहा", "पेशाब रुक गया है", "पेशाब करने का मन नहीं होता और नहीं होता", "पेशाब निकालने में बहुत दिक्कत",
    ],
    "Bladder incontinence — new onset / unexpected": [
      "leaking urine", "new urinary incontinence", "wetting myself", "cant control my bladder", "urine leaks without warning", "passed urine without realising", "lost control of my bladder",
      "peshab nikal jata hai", "peshab pe control nahi", "bina pata chale peshab ho jata hai", "peshab apne aap nikal jata hai",
      "पेशाब निकल जाता है", "पेशाब पर कंट्रोल नहीं", "बिना पता चले पेशाब हो जाता है", "पेशाब अपने आप निकल जाता है",
    ],
    "Bowel incontinence — new onset / unexpected": [
      "leaking stool", "new bowel incontinence", "soiling myself", "cant control my bowels", "stool passes without warning", "lost control of my bowels", "accidents with my bowels",
      "potty nikal jati hai", "potty pe control nahi", "bina pata chale potty ho jati hai", "potty apne aap nikal jati hai",
      "पॉटी निकल जाती है", "पॉटी पर कंट्रोल नहीं", "बिना पता चले पॉटी हो जाती है", "पॉटी अपने आप निकल जाती है",
    ],
    "Reduced anal tone (if assessed)": [
      "~reduced anal tone", "reduced anal tone", "poor anal tone on examination", "loose anal sphincter", "decreased anal sphincter tone", "lax anal tone", "reduced sphincter tone",
      "gudaa ka tone kam hai", "anal ka tone kam mila", "sphincter ka tone kam", "anal sphincter ka dhila hona",
      "एनल टोन कम है", "गुदा ढीला मिला", "स्फिंक्टर टोन कम", "एनल स्फिंक्टर ढीला है",
    ],
    "Sexual dysfunction — new onset": [
      "new sexual dysfunction", "problems with erections since the pain", "loss of sensation during sex", "new difficulty with sexual function", "cant get an erection anymore", "no feeling during intercourse",
      "yaun kriya me nayi dikkat", "sambandh banane me nayi samasya", "dard ke baad se erection me dikkat", "sex ke dauran sunn mehsoos hota hai",
      "यौन क्रिया में नई दिक्कत", "संबंध बनाने में नई समस्या", "दर्द के बाद से इरेक्शन में दिक्कत", "सेक्स के दौरान सुन्न महसूस होता है",
    ],
    "Rapidly progressive bilateral neurological deficit": [
      "rapidly progressive symptoms in both legs", "getting worse quickly in both legs", "neurological symptoms are worsening fast on both sides", "weakness spreading quickly in both legs", "rapidly worsening numbness and weakness", "deteriorating quickly",
      "dono pairon me tezi se badhte lakshan", "din ba din tezi se kharab ho raha hai dono pair", "kamzori tezi se badh rahi hai dono taraf", "kuch ghanto me haalat bigad gayi",
      "दोनों पैरों में तेजी से बढ़ते लक्षण", "दिन ब दिन तेजी से खराब हो रहा है दोनों पैर", "कमजोरी तेजी से बढ़ रही है दोनों तरफ", "कुछ घंटों में हालत बिगड़ गई",
    ],
    "Bilateral sciatica — new onset": [
      "sciatica in both legs", "new bilateral sciatica", "pain shooting down both legs", "pain down both legs from the back", "sciatica on both sides", "bilateral leg pain that is new",
      "dono pairon me sciatica", "dono pairon me nasen khinchne wala dard", "kamar se dono pairon tak dard", "dono taraf sciatica ka dard",
      "दोनों पैरों में साइटिका", "दोनों पैरों में नसें खिंचने वाला दर्द", "कमर से दोनों पैरों तक दर्द", "दोनों तरफ साइटिका का दर्द",
    ],
  },

  redFlagsFracture: {
    "No fracture indicators": [
      "no fracture indicators", "no fracture risk", "no risk factors for fracture", "fracture screen is negative", "nothing to suggest a fracture", "no fracture concern",
      "fracture ka koi shak nahi", "fracture ke koi lakshan nahi", "fracture screen negative", "fracture ka khatra nahi",
      "फ्रैक्चर का कोई शक नहीं", "फ्रैक्चर के कोई लक्षण नहीं", "फ्रैक्चर स्क्रीन नेगेटिव", "फ्रैक्चर का खतरा नहीं",
    ],
    "Major high-energy trauma": [
      "high energy trauma", "serious road accident", "major trauma", "high speed collision", "fell from a great height", "crush injury", "severe impact to the back",
      "badi chot lagi", "tez raftaar accident", "bahut oonchai se gira", "gambhir accident",
      "बड़ी चोट लगी", "तेज रफ्तार एक्सीडेंट", "बहुत ऊंचाई से गिरा", "गंभीर एक्सीडेंट",
    ],
    "Minor trauma + known osteoporosis": [
      "minor fall with known osteoporosis", "osteoporosis and a small fall", "weak bones and a minor injury", "known osteoporosis and a trivial trauma", "osteoporosis and then slipped", "low bone density and a minor bump",
      "osteoporosis hai aur halki chot lagi", "haddi kamzor hai aur chhoti si girne par dard", "osteoporosis ke saath mamuli chot", "kamzor haddi aur halka sa gira",
      "ऑस्टियोपोरोसिस है और हल्की चोट लगी", "हड्डी कमजोर है और छोटी सी गिरने पर दर्द", "ऑस्टियोपोरोसिस के साथ मामूली चोट", "कमजोर हड्डी और हल्का सा गिरा",
    ],
    "Minor trauma + age >70": [
      "minor fall in an elderly patient", "elderly and a small fall", "over 70 and a minor injury", "older person tripped and has back pain", "age over seventy and a trivial fall", "elderly lady slipped and has back pain",
      "budhape me halki chot", "sattar saal se upar aur chhoti si girne par", "bujurg gir gaye aur kamar dard", "umar zyada hai aur halka gira",
      "बुढ़ापे में हल्की चोट", "सत्तर साल से ऊपर और छोटी सी गिरने पर", "बुजुर्ग गिर गए और कमर दर्द", "उम्र ज्यादा है और हल्का गिरा",
    ],
    "Long-term corticosteroid use": [
      "long term steroids", "on steroids for years", "taking prednisolone for a long time", "long term corticosteroid use", "steroid tablets for many months", "chronic steroid use", "on oral steroids long term",
      "kaafi saalon se steroid le raha hoon", "lambe samay se steroid ki goli", "prednisolone lambe samay se", "steroid ka lamba course",
      "काफी सालों से स्टेरॉयड ले रहा हूं", "लंबे समय से स्टेरॉयड की गोली", "प्रेडनिसोलोन लंबे समय से", "स्टेरॉयड का लंबा कोर्स",
    ],
    "History of previous vertebral fracture": [
      "previous vertebral fracture", "had a spinal fracture before", "history of a compression fracture", "broke a vertebra in the past", "old spine fracture", "previous fracture of the spine",
      "pehle reedh ki haddi tooti thi", "pehle spine fracture ho chuka hai", "compression fracture ka history", "kamar ki haddi pehle tooti thi",
      "पहले रीढ़ की हड्डी टूटी थी", "पहले स्पाइन फ्रैक्चर हो चुका है", "कम्प्रेशन फ्रैक्चर का इतिहास", "कमर की हड्डी पहले टूटी थी",
    ],
    "Point bone tenderness on spinous process": [
      "point tenderness over a spinous process", "pinpoint bony tenderness on the spine", "tender over one vertebra", "localised bone tenderness over the spine", "spinous process is very tender to touch", "tapping the spine hurts at one spot",
      "reedh ki ek haddi dabane par bahut dard", "ek hi jagah reedh dabane par tez dard", "spinous process dabane par dard", "reedh par ek jagah chhune se dard",
      "रीढ़ की एक हड्डी दबाने पर बहुत दर्द", "एक ही जगह रीढ़ दबाने पर तेज दर्द", "स्पाइनस प्रोसेस दबाने पर दर्द", "रीढ़ पर एक जगह छूने से दर्द",
    ],
    "Severe unrelenting pain unaffected by position": [
      "severe unrelenting pain whatever position", "severe pain unaffected by movement", "nothing changes the severe pain", "severe constant pain that no position relieves", "unremitting pain that does not change with posture", "severe pain is the same in every position",
      "bahut tez dard jo kisi position se kam nahi hota", "har position me ek jaisa tez dard", "dard hilne se bhi kam nahi hota", "kisi bhi tarah lette to dard kam nahi hota",
      "बहुत तेज दर्द जो किसी पोजीशन से कम नहीं होता", "हर पोजीशन में एक जैसा तेज दर्द", "दर्द हिलने से भी कम नहीं होता", "किसी भी तरह लेटे तो दर्द कम नहीं होता",
    ],
    "Post-menopausal woman + acute onset": [
      "post menopausal woman with sudden onset", "after menopause and the pain came on suddenly", "postmenopausal and acute back pain", "woman past menopause with sudden back pain", "sudden pain after menopause",
      "menopause ke baad achanak kamar dard", "menopause ho chuka hai aur achanak dard shuru hua", "rajonivritti ke baad achanak dard", "mahavari band hone ke baad achanak kamar dard",
      "मेनोपॉज के बाद अचानक कमर दर्द", "मेनोपॉज हो चुका है और अचानक दर्द शुरू हुआ", "रजोनिवृत्ति के बाद अचानक दर्द", "माहवारी बंद होने के बाद अचानक कमर दर्द",
    ],
  },

  redFlagsInflammatory: {
    "No inflammatory features": [
      "no inflammatory features", "no inflammatory back pain features", "inflammatory screen is negative", "nothing to suggest inflammatory back pain", "no features of spondyloarthropathy", "no asas features",
      "inflammatory features nahi hain", "inflammatory screen negative", "sujan wale back pain ke lakshan nahi", "spondyloarthropathy ke koi lakshan nahi",
      "इन्फ्लेमेटरी लक्षण नहीं हैं", "इन्फ्लेमेटरी स्क्रीन नेगेटिव", "सूजन वाले कमर दर्द के लक्षण नहीं", "स्पोंडिलोआर्थ्रोपैथी के कोई लक्षण नहीं",
    ],
    "Age of onset <45": [
      "started when i was in my twenties", "onset before the age of 45", "pain began in my early thirties", "first came on at age 25", "young age of onset", "back pain since my teens", "started at 30",
      "bees saal ki umar me shuru hua", "paintalis saal se pehle shuru hua", "jawani me hi dard shuru ho gaya", "tees saal ki umar me dard shuru",
      "बीस साल की उम्र में शुरू हुआ", "पैंतालीस साल से पहले शुरू हुआ", "जवानी में ही दर्द शुरू हो गया", "तीस साल की उम्र में दर्द शुरू",
    ],
    "Insidious onset over weeks-months": [
      "insidious onset", "came on gradually over months", "slow onset over weeks", "crept on over several months", "no sudden start it built over weeks", "gradual onset over a few months",
      "dheere dheere mahino me shuru hua", "hafton me dheere dheere dard badha", "achanak nahi dheere dheere shuru hua", "kuch mahino me dard badhta gaya",
      "धीरे धीरे महीनों में शुरू हुआ", "हफ्तों में धीरे धीरे दर्द बढ़ा", "अचानक नहीं धीरे धीरे शुरू हुआ", "कुछ महीनों में दर्द बढ़ता गया",
    ],
    "Morning stiffness >30 minutes": [
      "morning stiffness for more than half an hour", "stiff for over 30 minutes in the morning", "an hour of stiffness every morning", "morning stiffness lasting 45 minutes", "stiff for ages when i wake up", "takes over half an hour to loosen up in the morning",
      "subah aadhe ghante se zyada akdan", "subah ek ghanta jakdan rehti hai", "subah uthne par tees minute se zyada jakdan", "subah kamar ko khulne me der lagti hai",
      "सुबह आधे घंटे से ज्यादा अकड़न", "सुबह एक घंटा जकड़न रहती है", "सुबह उठने पर तीस मिनट से ज्यादा जकड़न", "सुबह कमर को खुलने में देर लगती है",
    ],
    "Stiffness improves with movement / exercise": [
      "stiffness improves with movement", "better with exercise", "eases once i get moving", "loosens up with activity", "exercise makes it better", "the stiffness goes after i move around", "walking helps the stiffness",
      "hilne dulne se akdan kam", "exercise karne se aaram", "chalne phirne se jakdan theek ho jati hai", "kasrat se kamar ki akdan khul jati hai",
      "हिलने डुलने से अकड़न कम", "एक्सरसाइज करने से आराम", "चलने फिरने से जकड़न ठीक हो जाती है", "कसरत से कमर की अकड़न खुल जाती है",
    ],
    "Worse with rest — restlessness at night": [
      "worse with rest and restless at night", "cant lie still at night because of the pain", "have to get up and move at night", "rest makes it worse and i toss and turn", "restlessness at night with back pain", "better walking around than lying still",
      "aaram se dard badhta hai aur raat ko bechaini", "raat ko let nahi pata uthkar chalna padta hai", "lete rehne se dard badhta hai raat ko karwat badalta rehta hoon", "raat ko dard ke maare tahalna padta hai",
      "आराम से दर्द बढ़ता है और रात को बेचैनी", "रात को लेट नहीं पाता उठकर चलना पड़ता है", "लेटे रहने से दर्द बढ़ता है रात को करवट बदलता रहता हूं", "रात को दर्द के मारे टहलना पड़ता है",
    ],
    "Alternating buttock pain (R to L)": [
      "alternating buttock pain", "pain switches from one buttock to the other", "buttock pain moves from right to left", "the pain alternates between the buttocks", "one day the left buttock the next day the right", "pain swaps sides in the buttocks",
      "chutad ka dard kabhi ek taraf kabhi doosri taraf", "dard dayen se bayen chutad me badalta rehta hai", "ek din bayen chutad me doosre din dayen me dard", "nitamb ka dard badalta rehta hai",
      "चूतड़ का दर्द कभी एक तरफ कभी दूसरी तरफ", "दर्द दाएं से बाएं चूतड़ में बदलता रहता है", "एक दिन बाएं चूतड़ में दूसरे दिन दाएं में दर्द", "नितंब का दर्द बदलता रहता है",
    ],
    "Family history of AS / psoriasis / IBD / uveitis": [
      "family history of ankylosing spondylitis", "my father has ankylosing spondylitis", "psoriasis runs in the family", "family history of crohns", "my brother has uveitis", "family history of colitis", "relatives with spondylitis",
      "parivar me ankylosing spondylitis hai", "papa ko spondylitis hai", "parivar me psoriasis ka history", "bhai ko uveitis hai",
      "परिवार में एंकाइलोज़िंग स्पोंडिलाइटिस है", "पापा को स्पोंडिलाइटिस है", "परिवार में सोरायसिस का इतिहास", "भाई को यूवाइटिस है",
    ],
    "Psoriasis — personal history": [
      "i have psoriasis", "history of psoriasis", "psoriasis patches on the skin", "diagnosed with psoriasis", "skin psoriasis for years", "personal history of psoriasis", "psoriatic skin",
      "mujhe psoriasis hai", "psoriasis ka history hai", "skin par psoriasis ke dhabbe", "psoriasis ka ilaaj chal raha hai",
      "मुझे सोरायसिस है", "सोरायसिस का इतिहास है", "त्वचा पर सोरायसिस के धब्बे", "सोरायसिस का इलाज चल रहा है",
    ],
    "IBD (Crohn's / colitis) — personal history": [
      "i have crohns disease", "history of ulcerative colitis", "diagnosed with ibd", "inflammatory bowel disease", "crohns for years", "personal history of colitis", "i have colitis",
      "mujhe crohns ki bimari hai", "ulcerative colitis ka history", "ibd ka ilaaj chal raha hai", "aant ki sujan ki bimari hai",
      "मुझे क्रोन्स की बीमारी है", "अल्सरेटिव कोलाइटिस का इतिहास", "आईबीडी का इलाज चल रहा है", "आंत की सूजन की बीमारी है",
    ],
    "Uveitis / iritis — personal history": [
      "i have had uveitis", "history of iritis", "red painful eye diagnosed as uveitis", "eye inflammation in the past", "recurrent iritis", "personal history of uveitis", "had an inflamed eye",
      "mujhe uveitis ho chuka hai", "aankh ki sujan ka history", "aankh laal aur dard uveitis nikla", "iritis ka ilaaj hua tha",
      "मुझे यूवाइटिस हो चुका है", "आंख की सूजन का इतिहास", "आंख लाल और दर्द यूवाइटिस निकला", "आइराइटिस का इलाज हुआ था",
    ],
    "Peripheral joint involvement": [
      "pain and swelling in other joints", "peripheral joint involvement", "knee and ankle swelling as well", "swollen joints along with the back pain", "arthritis in other joints too", "joint pain in the hands and feet as well",
      "doosre jodon me bhi dard aur sujan", "ghutne aur takhne me bhi sujan", "kamar ke saath doosre jod bhi sujhe hain", "haath pair ke jodon me bhi dard",
      "दूसरे जोड़ों में भी दर्द और सूजन", "घुटने और टखने में भी सूजन", "कमर के साथ दूसरे जोड़ भी सूजे हैं", "हाथ पैर के जोड़ों में भी दर्द",
    ],
    "NSAIDs very effective (ASAS criterion)": [
      "anti inflammatories work really well", "nsaids give excellent relief", "brufen works within a day", "diclofenac takes the pain away completely", "pain is gone within 48 hours of an anti inflammatory", "responds dramatically to nsaids",
      "anti inflammatory goli se bahut aaram", "brufen khane se dard turant chala jata hai", "diclofenac se poora dard theek", "dard ki goli se ek din me aaram",
      "एंटी इन्फ्लेमेटरी गोली से बहुत आराम", "ब्रूफेन खाने से दर्द तुरंत चला जाता है", "डाइक्लोफेनाक से पूरा दर्द ठीक", "दर्द की गोली से एक दिन में आराम",
    ],
    "HLA-B27 positive (known)": [
      "~hla b27", "hla b27 positive", "tested positive for hla b27", "hla b27 came back positive", "known hla b27 positive", "b27 positive", "hlab27 is positive",
      "hla b27 positive aaya hai", "hla b27 ka test positive", "hla b27 positive nikla", "b27 positive hai",
      "एचएलए बी27 पॉजिटिव आया है", "एचएलए बी27 का टेस्ट पॉजिटिव", "एचएलए बी27 पॉजिटिव निकला", "बी27 पॉजिटिव है",
    ],
    "Elevated ESR / CRP (known)": [
      "~esr", "~crp", "elevated esr", "raised crp", "high esr and crp", "inflammatory markers are raised", "crp is elevated", "esr is high on the blood test",
      "esr badha hua hai", "crp zyada aaya hai", "blood test me esr aur crp high", "inflammation ke markers badhe hue hain",
      "ईएसआर बढ़ा हुआ है", "सीआरपी ज्यादा आया है", "ब्लड टेस्ट में ईएसआर और सीआरपी हाई", "इन्फ्लेमेशन के मार्कर बढ़े हुए हैं",
    ],
  },

  redFlagsSerious: {
    "No other red flags": [
      "no other red flags", "no red flags", "no warning signs", "none of the above", "nothing worrying", "red flags absent", "no other warning signs",
      "koi aur red flag nahi", "koi khatre ki baat nahi", "koi chinta wali baat nahi", "koi warning sign nahi",
      "कोई और रेड फ्लैग नहीं", "कोई खतरे की बात नहीं", "कोई चिंता वाली बात नहीं", "कोई वार्निंग साइन नहीं",
    ],
    "Constant pain — completely unaffected by position or movement": [
      "constant pain that does not change with position", "pain unaffected by movement", "nothing changes the pain at all", "pain stays the same whatever i do", "constant pain not affected by posture", "unrelenting constant pain", "pain is the same in every position",
      "dard position badalne se bhi kam nahi hota", "har position me ek jaisa dard", "dard hamesha rehta hai chahe kuch bhi karun", "kisi bhi position me dard kam nahi hota",
      "हिलने डुलने से भी दर्द कम नहीं होता", "दर्द हर हालत में एक जैसा रहता है", "लगातार दर्द जो किसी स्थिति से नहीं बदलता", "किसी भी पोजीशन में दर्द कम नहीं होता",
    ],
    "Progressive night pain": [
      "progressive night pain", "night pain that keeps getting worse", "pain wakes me every night and is getting worse", "waking at night with worsening pain", "night pain getting worse over weeks", "pain at night that is steadily increasing",
      "raat ka dard din ba din badh raha hai", "raat ko dard se neend khulti hai aur badhta ja raha hai", "raat ko dard jagata hai roz badh raha hai", "har raat dard se uthna padta hai aur badh raha hai",
      "रात का दर्द दिन ब दिन बढ़ रहा है", "रात को दर्द से नींद खुलती है और बढ़ता जा रहा है", "रात को दर्द जगाता है रोज बढ़ रहा है", "हर रात दर्द से उठना पड़ता है और बढ़ रहा है",
    ],
    "Thoracic pain accompanying lumbar pain": [
      "pain in the mid back as well", "thoracic pain along with the low back pain", "upper back pain too", "pain in the middle of the back as well as the low back", "pain between the shoulder blades along with the lower back", "mid back and low back both hurt",
      "kamar ke saath peeth ke beech me bhi dard", "kamar ke upar peeth me bhi dard", "peeth ke upar wale hisse me bhi dard", "kamar aur peeth dono me dard",
      "कमर के साथ पीठ के बीच में भी दर्द", "कमर के ऊपर पीठ में भी दर्द", "पीठ के ऊपर वाले हिस्से में भी दर्द", "कमर और पीठ दोनों में दर्द",
    ],
    "Abdominal pain accompanying": [
      "abdominal pain along with the back pain", "stomach pain as well", "belly pain with the back pain", "tummy ache too", "pain in the abdomen as well", "abdominal pain accompanying",
      "kamar dard ke saath pet me bhi dard", "pet me bhi dard hota hai", "kamar aur pet dono me dard", "pet dard bhi saath me",
      "कमर दर्द के साथ पेट में भी दर्द", "पेट में भी दर्द होता है", "कमर और पेट दोनों में दर्द", "पेट दर्द भी साथ में",
    ],
    "Pulsatile abdominal mass (AAA)": [
      "pulsating lump in the tummy", "pulsatile abdominal mass", "feel a throbbing mass in my abdomen", "aaa", "abdominal aortic aneurysm", "a beating lump in the belly", "pulsing mass in the stomach",
      "pet me dhadakta hua ganth", "pet me dhadakne wali gaanth", "pet me dhak dhak karti gaanth", "aorta ka aneurysm",
      "पेट में धड़कता हुआ गांठ", "पेट में धड़कने वाली गांठ", "पेट में धक धक करती गांठ", "एओर्टा का एन्यूरिज्म",
    ],
    "Unexplained weight loss": [
      "unexplained weight loss", "losing weight without trying", "lost weight without dieting", "weight loss for no reason", "lost a lot of weight recently", "weight dropping with back pain",
      "wazan bina wajah ghat gaya", "wazan kam ho raha hai bina koshish", "bina diet ke wazan kam hua", "wazan tezi se gir raha hai",
      "वजन बिना वजह कम हुआ", "बिना कोशिश के वजन घट रहा है", "बिना डाइट के वजन कम हुआ", "वजन तेजी से गिर रहा है",
    ],
    "History of cancer — any": [
      "~cancer", "~cancer history", "history of cancer", "had cancer", "cancer survivor", "treated for cancer", "breast cancer history", "known malignancy", "previous cancer", "prostate cancer",
      "~kainsar", "cancer ka history", "kabhi cancer hua tha", "cancer ka ilaaj hua tha", "pehle cancer tha",
      "~कैंसर", "कैंसर का इतिहास", "कभी कैंसर हुआ था", "कैंसर का इलाज हुआ था", "पहले कैंसर था",
    ],
    "IV drug use — risk of discitis": [
      "intravenous drug use", "iv drug use", "injects drugs", "history of injecting drugs", "uses intravenous drugs", "injecting heroin",
      "nasha injection se leta hoon", "injection se nasha karta hai", "nashe ke injection ka history", "drugs injection se lete hain",
      "नशा इंजेक्शन से लेता हूं", "इंजेक्शन से नशा करता है", "नशे के इंजेक्शन का इतिहास", "ड्रग्स इंजेक्शन से लेते हैं",
    ],
    "Recent bacterial infection elsewhere": [
      "recent bacterial infection", "had a urine infection recently", "recent skin infection", "recently treated for a chest infection", "had an abscess lately", "infection elsewhere recently", "antibiotics for an infection last month",
      "haal hi me infection hua tha", "pichle mahine peshab ka infection", "skin ka infection hua tha", "antibiotic liye the kisi infection ke liye",
      "हाल ही में इन्फेक्शन हुआ था", "पिछले महीने पेशाब का इन्फेक्शन", "स्किन का इन्फेक्शन हुआ था", "एंटीबायोटिक लिए थे किसी इन्फेक्शन के लिए",
    ],
    "Fever / systemically unwell with back pain": [
      "fever with back pain", "fever and chills along with the back pain", "temperature and back pain", "feeling unwell and feverish with back pain", "high temperature and night sweats with back pain", "systemically unwell with back pain",
      "bukhar ke saath kamar dard", "bukhar aur kamar me dard", "bukhar aur kaampkampi ke saath dard", "tabiyat kharab aur bukhar ke saath kamar dard",
      "बुखार के साथ कमर दर्द", "बुखार और कमर में दर्द", "बुखार और कंपकंपी के साथ दर्द", "तबीयत खराब और बुखार के साथ कमर दर्द",
    ],
    "Pain radiating to flank / loin (renal / ureteric)": [
      "pain in the flank", "loin pain", "pain radiating to the flank", "pain going to the side of the abdomen", "pain colicky in the loin", "pain from the loin to the groin", "flank pain with blood in urine",
      "baghal me dard jo peeth se aata hai", "pasli ke neeche side me dard", "kamar se pet ki side tak dard", "gurde wali jagah par dard",
      "बगल में दर्द जो पीठ से आता है", "पसली के नीचे साइड में दर्द", "कमर से पेट की साइड तक दर्द", "गुर्दे वाली जगह पर दर्द",
    ],
  },

  adlRestrictions: {
    "No ADL restrictions": [
      "no adl restrictions", "no limitations in daily activities", "can do everything", "no restriction at all", "nothing is limited", "no problem with daily activities",
      "koi pareshani nahi kaam me", "sab kaam kar leta hoon", "kisi kaam me dikkat nahi", "koi rukavat nahi",
      "कोई परेशानी नहीं काम में", "सब काम कर लेता हूं", "किसी काम में दिक्कत नहीं", "कोई रुकावट नहीं",
    ],
    "Putting on shoes and socks": [
      "difficulty putting on shoes and socks", "cant put my socks on", "tying my shoelaces hurts", "putting on shoes is a struggle", "cant bend to put on my socks", "need help to put on my shoes",
      "joote mozey pehanne me dikkat", "mozey nahi pehan pata", "joote ke fite bandhne me dard", "joote pehanna mushkil",
      "जूते मोजे पहनने में दिक्कत", "मोजे नहीं पहन पाता", "जूते के फीते बांधने में दर्द", "जूते पहनना मुश्किल",
    ],
    "Bending to floor level": [
      "difficulty bending to the floor", "cant bend down to the ground", "picking things up off the floor is hard", "cannot reach the floor", "bending to floor level hurts", "cant bend to pick up anything dropped",
      "zameen tak jhukne me dikkat", "neeche jhuk kar cheez uthane me dikkat", "farsh se kuch uthana mushkil", "zameen tak jhuk nahi pata",
      "जमीन तक झुकने में दिक्कत", "नीचे झुककर चीज उठाने में दिक्कत", "फर्श से कुछ उठाना मुश्किल", "जमीन तक झुक नहीं पाता",
    ],
    "Lifting children": [
      "cannot lift my children", "difficulty lifting the kids", "cant pick up my child", "lifting my toddler hurts", "cant carry my baby", "unable to lift my grandchildren",
      "bachche ko utha nahi pata", "bachcho ko uthane me dikkat", "bachche ko godi me lena mushkil", "potey potiyon ko nahi utha pata",
      "बच्चे को उठा नहीं पाता", "बच्चों को उठाने में दिक्कत", "बच्चे को गोदी में लेना मुश्किल", "पोते पोतियों को नहीं उठा पाता",
    ],
    "Lifting shopping / moderate loads": [
      "cant lift shopping bags", "difficulty carrying groceries", "lifting moderate loads is hard", "cant carry a bucket of water", "carrying the shopping hurts", "cannot lift anything heavy",
      "bazaar ka saman uthane me dikkat", "sabzi ka thaila uthana mushkil", "bhaari saman nahi utha pata", "paani ki balti nahi utha pata",
      "बाजार का सामान उठाने में दिक्कत", "सब्जी का थैला उठाना मुश्किल", "भारी सामान नहीं उठा पाता", "पानी की बाल्टी नहीं उठा पाता",
    ],
    "Vacuuming / mopping / floor cleaning": [
      "vacuuming is painful", "mopping the floor is hard", "cant sweep the floor", "difficulty cleaning floors", "cant do the mopping", "floor cleaning hurts my back",
      "jhadu pocha lagane me dikkat", "pocha lagana mushkil", "farsh saaf karne me dard", "jhadu nahi laga pati",
      "झाड़ू पोछा लगाने में दिक्कत", "पोछा लगाना मुश्किल", "फर्श साफ करने में दर्द", "झाड़ू नहीं लगा पाती",
    ],
    "Bed mobility — turning over": [
      "difficulty turning over in bed", "cant roll over in bed", "turning in bed hurts", "struggle to turn over at night", "cannot change position in bed", "rolling over is painful",
      "bed par karwat badalne me dikkat", "bistar me palatna mushkil", "raat ko karwat lene me dard", "sote hue palat nahi pata",
      "बेड पर करवट बदलने में दिक्कत", "बिस्तर में पलटना मुश्किल", "रात को करवट लेने में दर्द", "सोते हुए पलट नहीं पाता",
    ],
    "Getting out of bed": [
      "difficulty getting out of bed", "cant get out of bed easily", "getting up from bed hurts", "struggle to get up in the morning", "need help to get out of bed", "getting out of bed is the worst",
      "bistar se uthne me dikkat", "bed se uthna mushkil", "subah uthne me dard", "bistar se uthte waqt kamar pakad leti hai",
      "बिस्तर से उठने में दिक्कत", "बेड से उठना मुश्किल", "सुबह उठने में दर्द", "बिस्तर से उठते वक्त कमर पकड़ लेती है",
    ],
    "Getting in / out of bath": [
      "difficulty getting in and out of the bath", "cant step into the bath", "getting out of the bath is hard", "stepping over the bath edge hurts", "cant get in the tub", "bathing is difficult",
      "bathtub me jane aur nikalne me dikkat", "nahane ke tub me ghusna mushkil", "bath se bahar nikalna mushkil", "nahate waqt tub me chadhna mushkil",
      "बाथटब में जाने और निकलने में दिक्कत", "नहाने के टब में घुसना मुश्किल", "बाथ से बाहर निकलना मुश्किल", "नहाते वक्त टब में चढ़ना मुश्किल",
    ],
    "Driving": [
      "difficulty driving", "cant drive for long", "driving is painful", "cannot drive because of the pain", "getting in and out of the car hurts", "stopped driving",
      "gaadi chalane me dikkat", "gaadi nahi chala pata", "driving karna mushkil", "lambi drive nahi kar pata",
      "गाड़ी चलाने में दिक्कत", "गाड़ी नहीं चला पाता", "ड्राइविंग करना मुश्किल", "लंबी ड्राइव नहीं कर पाता",
    ],
    "Sexual activity": [
      "difficulty with sexual activity", "sex is painful because of my back", "intimacy is affected", "limited sexual activity", "cant be intimate because of the back pain", "sexual activity is restricted",
      "sambandh banane me dikkat", "intimacy me kamar dukhti hai", "physical relation me takleef", "sex me dikkat kamar dard ki wajah se",
      "संबंध बनाने में दिक्कत", "इंटिमेसी में कमर दुखती है", "शारीरिक संबंध में तकलीफ", "सेक्स में दिक्कत कमर दर्द की वजह से",
    ],
    "Gardening": [
      "cant do the gardening", "gardening is painful", "weeding hurts my back", "digging in the garden is hard", "had to give up gardening", "difficulty with gardening",
      "bagwani nahi kar pata", "bagiche me kaam karna mushkil", "ghaas ukhadne me kamar dard", "paudhon ki dekhbhal nahi hoti",
      "बागवानी नहीं कर पाता", "बगीचे में काम करना मुश्किल", "घास उखाड़ने में कमर दर्द", "पौधों की देखभाल नहीं होती",
    ],
    "Housework generally": [
      "housework is difficult", "cant manage the housework", "struggling with household chores", "difficulty doing chores around the house", "cant do the cleaning and cooking", "housework is a struggle",
      "ghar ka kaam karne me dikkat", "ghar ke kaam nahi ho pate", "ghar ka kaam mushkil", "roz ke ghar ke kaam me takleef",
      "घर का काम करने में दिक्कत", "घर के काम नहीं हो पाते", "घर का काम मुश्किल", "रोज के घर के काम में तकलीफ",
    ],
    "Childcare / parenting duties": [
      "difficulty looking after my child", "childcare is hard", "cant manage my parenting duties", "struggling to care for the kids", "cant bathe and dress my baby", "limited with my children",
      "bachche ki dekhbhal me dikkat", "bachche sambhalna mushkil", "bachcho ka kaam nahi ho pata", "bachche ko nahlana pehnana mushkil",
      "बच्चे की देखभाल में दिक्कत", "बच्चे संभालना मुश्किल", "बच्चों का काम नहीं हो पाता", "बच्चे को नहलाना पहनाना मुश्किल",
    ],
  },

  workImpact: {
    "No work impact": [
      "no work impact", "work is not affected", "no problems at work", "back pain is not affecting my job", "i can work normally", "no effect on work",
      "kaam par koi asar nahi", "kaam me koi dikkat nahi", "naukri par asar nahi", "kaam normal chal raha hai",
      "काम पर कोई असर नहीं", "काम में कोई दिक्कत नहीं", "नौकरी पर असर नहीं", "काम नॉर्मल चल रहा है",
    ],
    "Mild discomfort — full duties": [
      "mild discomfort at work and doing full duties", "coping with my full duties with some discomfort", "still doing my normal job with a bit of pain", "working full duties despite the ache", "managing full duties with mild pain",
      "thodi takleef ke saath poora kaam kar leta hoon", "dard hai par poori duty kar raha hoon", "halke dard ke saath poora kaam", "poore kaam kar leta hoon halki takleef ke saath",
      "थोड़ी तकलीफ के साथ पूरा काम कर लेता हूं", "दर्द है पर पूरी ड्यूटी कर रहा हूं", "हल्के दर्द के साथ पूरा काम", "पूरे काम कर लेता हूं हल्की तकलीफ के साथ",
    ],
    "Modified duties": [
      "on modified duties", "light duties at work", "doing lighter work", "my employer has given me alternative duties", "restricted duties at work", "no heavy lifting allowed at work",
      "halka kaam mila hai", "modified duty par hoon", "office me halka kaam de diya hai", "bhaari kaam se chhoot mili hai",
      "हल्का काम मिला है", "मॉडिफाइड ड्यूटी पर हूं", "ऑफिस में हल्का काम दे दिया है", "भारी काम से छूट मिली है",
    ],
    "Reduced hours": [
      "working reduced hours", "cut down my hours at work", "part time because of the pain", "working fewer hours", "only managing half days", "reduced my shifts",
      "kam ghante kaam kar raha hoon", "kaam ke ghante kam kar diye", "aadhe din ka kaam", "kam shift kar raha hoon",
      "कम घंटे काम कर रहा हूं", "काम के घंटे कम कर दिए", "आधे दिन का काम", "कम शिफ्ट कर रहा हूं",
    ],
    "Off work — short term (<4 weeks)": [
      "off work for a week", "off work for two weeks", "on sick leave for a few days", "off work for three weeks", "took a couple of weeks off work", "off work less than a month",
      "ek hafte se kaam par nahi gaya", "do hafte ki chhutti par hoon", "kuch din ki sick leave", "teen hafte se ghar par hoon",
      "एक हफ्ते से काम पर नहीं गया", "दो हफ्ते की छुट्टी पर हूं", "कुछ दिन की सिक लीव", "तीन हफ्ते से घर पर हूं",
    ],
    "Off work — medium term (4–12 weeks)": [
      "off work for six weeks", "off work for two months", "on sick leave for eight weeks", "been off work for about a month", "off work for ten weeks", "off work for 3 months",
      "chhe hafte se kaam par nahi gaya", "do mahine se chhutti par hoon", "aath hafte ki sick leave", "ek mahine se ghar par hoon",
      "छह हफ्ते से काम पर नहीं गया", "दो महीने से छुट्टी पर हूं", "आठ हफ्ते की सिक लीव", "एक महीने से घर पर हूं",
    ],
    "Off work — long term (>12 weeks)": [
      "off work for six months", "off work for more than three months", "on sick leave for a year", "has not worked for over four months", "long term sick leave", "off work for months and months",
      "chhe mahine se kaam par nahi gaya", "teen mahine se zyada se chhutti par", "ek saal se ghar par hoon", "kai mahino se kaam band hai",
      "छह महीने से काम पर नहीं गया", "तीन महीने से ज्यादा से छुट्टी पर", "एक साल से घर पर हूं", "कई महीनों से काम बंद है",
    ],
    "Unemployed — job loss": [
      "lost my job because of the back pain", "i was laid off", "lost my job", "made redundant after the injury", "dismissed because of my back", "currently unemployed because of the pain",
      "kamar dard ki wajah se naukri chali gayi", "naukri se nikal diya gaya", "naukri chhoot gayi", "kaam chhootne ke baad se ghar par",
      "कमर दर्द की वजह से नौकरी चली गई", "नौकरी से निकाल दिया गया", "नौकरी छूट गई", "काम छूटने के बाद से घर पर",
    ],
    "Unable to return to previous occupation": [
      "cannot go back to my old job", "unable to return to my previous occupation", "cant do my old work anymore", "had to change career because of the back", "will never be able to do my old job again", "cannot return to heavy work",
      "purani naukri par wapas nahi ja sakta", "pehle wala kaam ab nahi kar sakta", "kaam badalna pada kamar ki wajah se", "purane kaam par laut nahi sakta",
      "पुरानी नौकरी पर वापस नहीं जा सकता", "पहले वाला काम अब नहीं कर सकता", "काम बदलना पड़ा कमर की वजह से", "पुराने काम पर लौट नहीं सकता",
    ],
  },
};

// Added from the clinician-voice "everyday words" sheet (PhysioMind-Lumbar-Everyday-Words-DRAFT.pdf): what a clinician types ABOUT the
// patient ("the patient", "they"), in English, Hinglish and Hindi. See lumbarSISheetSet.test.js.
const SHEET_PHRASES = {
  radiation: {
    "No radiation — local only": [
      "no leg pain", "nothing goes into the leg", "nothing goes down the leg", "no pain or tingling down either leg", "stays in the back",
      "pair mein koi dard nahi", "pair mein dard nahi", "पैर में कोई दर्द नहीं", "पैर में दर्द नहीं",
    ],
  },
  neuroPresent: {
    "No leg neurological symptoms": ["no neuro", "no neurology", "neuro normal"],
  },
  mechanismType: {
    "Coughing / sneezing — onset": ["sneezing sent a jolt", "sneeze sent a jolt", "cough sent a jolt"],
    "No clear mechanism — insidious onset": ["gradual onset", "insidious", "crept in", "no injury", "no particular event", "koi chot nahi", "कोई चोट नहीं", "dheere dheere shuru hua", "धीरे धीरे शुरू हुआ"],
    "Twisting without lifting": ["twist", "awkward twist", "ghumne par", "achanak ghumne par", "अचानक घूमने पर", "घूमने पर"],
    "Fall onto back / buttocks": [
      "fall on the buttock", "fell on the buttock", "landed on the buttock", "landed hard on the buttock", "landed on the bottom", "hard landing on the bottom", "fall onto the buttocks",
      "fell on the bottom", "chutad ke bal girne", "चूतड़ के बल गिरने", "चूतड़ पर गिरने", "chutad par girne",
    ],
    "Sport — specific (notes)": ["gymnastics", "gymnast", "fast bowling", "fast bowler", "cricket season", "extension sport", "athlete", "jimnastik", "जिम्नास्टिक", "फास्ट बॉलिंग", "खेल में"],
    "Sustained poor posture over time": ["poor posture", "bad posture", "desk job", "long hours of sitting", "galat posture", "गलत पोस्चर", "der tak baithkar kaam", "देर तक बैठकर काम"],
    "Bending forward without lifting": ["repeated bending forward", "lots of bending forward", "repetitive flexion", "bending forward all day", "baar baar aage jhukna", "बार बार आगे झुकना"],
  },
  aggPostures: {
    "Driving (duration — specify in notes)": ["लंबी ड्राइव", "लंबी ड्राइव के बाद", "ड्राइव के बाद", "long drive", "after a long drive"],
  },
  relPostures: {
    "Leaning forward on trolley / counter (stenosis pattern)": ["easier cycling than walking", "better cycling than walking", "cycling is easier", "bent forward over the handlebars"],
    "Lying with knees bent (crook lying)": ["crook lying", "better crook lying", "lie with the knees bent", "lying with the knees bent", "ghutne mod kar letne", "घुटने मोड़कर लेटने"],
  },
  redFlagsCauda: {
    "Sexual dysfunction — new onset": ["unable to have sex", "cannot have sex", "cant have sex", "sexual problems since", "sex nahi kar paa raha", "यौन संबंध नहीं बना पा रहा"],
    "Bladder retention — cannot urinate": [
      "cannot pass urine", "cant pass urine", "cannot pass water", "unable to pass urine", "not able to pass urine", "has not been able to pass urine", "have not been able to pass urine", "not been able to pass urine", "difficulty passing urine",
      "peshaab nahi aa raha", "peshab nahi aa raha", "पेशाब नहीं आ रहा", "पेशाब नहीं आता",
    ],
  },
  redFlagsFracture: {
    "Point bone tenderness on spinous process": ["pain on pressing the spinous process", "pressing the spinous process", "spinous process tenderness", "tender spinous process", "point tenderness", "bony tenderness"],
    "Long-term corticosteroid use": ["on steroids", "takes steroids", "steroid use", "long term steroids", "long term steroid use", "steroid ka sevan", "स्टेरॉइड का सेवन"],
    "Minor trauma + known osteoporosis": ["minor trauma osteoporosis", "osteoporosis", "haddi kamzori", "हड्डी कमज़ोरी", "हड्डी कमजोरी"],
  },
  redFlagsInflammatory: {
    "Family history of AS / psoriasis / IBD / uveitis": [
      "fh of as", "fh of ankylosing spondylitis", "family history of as", "family history of ankylosing spondylitis", "father has ankylosing spondylitis", "ankylosing spondylitis in the family",
      "parivaar mein reedh ki sujan ka itihas", "परिवार में रीढ़ की सूजन का इतिहास",
    ],
    "Uveitis / iritis — personal history": ["red painful eye", "painful red eye", "red eye", "uveitis", "iritis"],
    "Psoriasis — personal history": ["history of psoriasis", "has psoriasis", "psoriasis"],
    "Age of onset <45": ["young patient", "young man", "young woman", "age under 45", "in their twenties", "in their thirties", "kam umar mein", "कम उम्र में"],
    "Stiffness improves with movement / exercise": ["improves with exercise", "better with exercise", "loosens up when they exercise", "kasrat se kam hota hai", "कसरत से कम होती है", "कसरत से कम होता है"],
  },
  overallPattern: {
    "Worse second half of night (AS inflammatory pattern)": [
      "second half of the night", "early hours", "wakes in the early hours", "wake around three in the morning", "3 in the morning", "3am",
      "raat ke doosre hisse mein", "रात के दूसरे हिस्से में",
    ],
  },
  redFlagsSerious: {
    "History of cancer — any": ["hx cancer", "h o cancer", "cancer ka itihas", "कैंसर का इतिहास"],
    "Unexplained weight loss": ["weight loss", "lost weight", "lost 6 kg without trying", "wazan kam hua", "wazan bhi kam hua", "वज़न कम हुआ", "वज़न भी कम हुआ", "वजन कम हुआ", "वजन भी कम हुआ"],
  },
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const LUMBAR_SI_PHRASES = mergePhrases(LUMBAR_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W, NERVE: NERVE_W } = WORDS;
// Words that say a sentence is about the low back / pelvis / leg, or about another body part.
const OWN_W = "lbp back lower_back low_back lumbar lumbosacral kamar कमर sacrum sacral sacroiliac si_joint si pelvis pelvic buttock* buttocks gluteal glute coccyx tailbone chutad चूतड़ nitamb नितंब leg legs pair पैर thigh* jaangh जांघ calf pindli पिंडली foot toes toe sciatica sciatic groin hip hips spine reedh रीढ़ disc";
const FOREIGN_W = "thoracic mid_back upper_back neck* gardan गर्दन cervical shoulder* ankle* wrist* knee* ghutna घुटना headache jaw eye* ear throat";
const FAMILY_W = WORDS.FAMILY;
// A sentence about the low back that mentions these other places is still about the low back.
const EXEMPT = [
  "relPostures|Lying with knees bent (crook lying)",
  "relPostures|Lying with pillow under knees",
  "relPostures|Lying on side — knees together",
  "relPostures|Lying on side — pillow between knees",
  "relPostures|Hands and knees (flexion unloading)",
  "radiation|To knee (L)",
  "radiation|To knee (R)",
  "redFlagsSerious|Thoracic pain accompanying lumbar pain",
  "redFlagsSerious|Abdominal pain accompanying",
  "redFlagsSerious|Pain radiating to flank / loin (renal / ureteric)",
  "redFlagsInflammatory|Peripheral joint involvement",
  "redFlagsInflammatory|Uveitis / iritis — personal history",
  "redFlagsInflammatory|Psoriasis — personal history",
  "redFlagsInflammatory|IBD (Crohn's / colitis) — personal history",
  "redFlagsInflammatory|Family history of AS / psoriasis / IBD / uveitis",
  "redFlagsSerious|Fever / systemically unwell with back pain",
];

const AGE_UNDER_45 = Array.from({ length: 30 }, (_, i) => String(15 + i)).join(" ");
const NUM_15_29 = Array.from({ length: 15 }, (_, i) => String(15 + i)).join(" ") + " fifteen pandrah पंद्रह twenty bees बीस";
const NUM_30_59 = Array.from({ length: 30 }, (_, i) => String(30 + i)).join(" ") + " thirty tees तीस forty chalis चालीस fifty pachas पचास half_hour half_hour aadha_ghanta आधा_घंटा";
const NUM_60_UP = "60 90 120 hour hours an_hour one_hour two_hours ek_ghanta एक_घंटा ghanta ghante घंटा घंटे";
const WEEKS_SHORT = "1 2 3 one two three ek do teen एक दो तीन a_couple_of few_days kuch_din कुछ_दिन";

const matcher = createPhraseMatcher({
  phrases: LUMBAR_SI_PHRASES,
  singleChoiceFields: ["neuroPresent", "bladderBaseline", "workImpact"],
  noneOptions: {
    radiation: "No radiation — local only",
    redFlagsCauda: "No cauda equina signs",
    redFlagsFracture: "No fracture indicators",
    redFlagsInflammatory: "No inflammatory features",
    redFlagsSerious: "No other red flags",
    adlRestrictions: "No ADL restrictions",
    neuroPresent: "No leg neurological symptoms",
    workImpact: "No work impact",
  },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  guardExempt: EXEMPT,
  optionGuards: {
    "redFlagsSerious|History of cancer — any": FAMILY_W,
    "redFlagsInflammatory|Psoriasis — personal history": FAMILY_W,
    "redFlagsInflammatory|IBD (Crohn's / colitis) — personal history": FAMILY_W,
    "redFlagsInflammatory|Uveitis / iritis — personal history": FAMILY_W,
    "redFlagsInflammatory|HLA-B27 positive (known)": FAMILY_W,
    "redFlagsFracture|History of previous vertebral fracture": FAMILY_W,
    "redFlagsFracture|Minor trauma + known osteoporosis": FAMILY_W,
  },
  hinglish: [
    ...SIDE_HINGLISH,
    [/\bon and off\b/g, "intermittent"],
    [/\b(kamar|kamer|kmar|kamr)\b/g, "kamar"],
    [/\b(peeth|pith|peith|peet|pitth|peetha)\b/g, "peeth"],
    [/\b(reedh|reed|ridh|rirh|reerh|reedhh|redh)\b/g, "reedh"],
    [/\b(chutad|chutadh|chutar|chootad|nitamb|nitumb)\b/g, "chutad"],
    [/\b(jaangh|jangh|jaang|janagh|janga)\b/g, "jaangh"],
    [/\b(pindli|pindali|pindly|pindlee)\b/g, "pindli"],
    [/\b(talwe|talwa|talve|talva)\b/g, "talwe"],
    [/\b(ghutna|ghutne|ghutno|ghutnon|ghutana|ghutane)\b/g, "ghutna"],
    [/\b(paer|pair|pao|pav|pairon|pairo|paero|payron|paanv)\b/g, "pair"],
    [/\b(angootha|angutha|angoothe|anguthe|angooth|angoothon)\b/g, "angutha"],
    [/\b(ungli|unglee|ungliyan|ungliyon|unglian|ungliya|ungliyaan)\b/g, "ungli"],
    [/\b(jhukne|jhukna|jhukte|jhukta|jhukti|jhuk|jhukkar|jhukar|jhukane|jhukana)\b/g, "jhuk"],
    [/\b(baithne|baithna|baithte|baithta|baithti|baith|baithkar|baithke)\b/g, "baith"],
    [/\b(khade rehne|khade hone|khade hote|khade rehna|khade|khada|khadi|khadey)\b/g, "khade"],
    [/\b(lete|lette|letna|leta|leti|let|letkar|letke|lete lete)\b/g, "let"],
    [/\b(ghumne|ghumna|ghoomne|ghoomna|ghumte|ghumta|ghoomte|ghoomta|ghumane|ghumana|ghumkar)\b/g, "ghum"],
    [/\b(uthane|uthana|uthate|uthata|uthati|uthaya|uthaye|uthayi|uthana)\b/g, "uthana"],
    [/\b(chalne|chalna|chalte|chalta|chalti|chale)\b/g, "chalna"],
    [/\b(dheere|dhire|dheeray|dheerey)\b/g, "dheere"],
    [/\b(bhaari|bhari|bhaaree|bhaarii)\b/g, "bhaari"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche|nichla|nichli|nichle)\b/g, "niche"],
    [/\b(peeche|piche|pichhe|peechhe|pichche|pichle|pichla)\b/g, "peeche"],
    [/\b(aage|aagey|aga)\b/g, "aage"],
    [/\b(samne|saamne|saame|samney)\b/g, "samne"],
    [/\b(beech|bich|bichh)\b/g, "beech"],
    [/\b(shaam|sham)\b/g, "shaam"],
    [/\b(raat|raath|rat)\b/g, "raat"],
    [/\b(neend|nind|neendh)\b/g, "neend"],
    [/\b(bukhar|bukhaar|bukar)\b/g, "bukhar"],
    [/\b(wazan|vajan|vazan|wajan|vajn)\b/g, "wazan"],
    [/\b(peshab|pesab|pishab)\b/g, "peshab"],
    [/\b(potty|potti|pakhana|shauch)\b/g, "potty"],
    [/\b(akdan|akad|akadna|akdi|jakdan|jakad|jakadna|akadne)\b/g, "akdan"],
    [/\b(takleef|taklif|takleeph)\b/g, "takleef"],
    [/\b(sekai|sek|sekaai|seki)\b/g, "sekai"],
    [/\b(khichav|khichaav|khinchav|khichao|khinchaav|khichaw)\b/g, "khichav"],
    [/\b(sunnpan|sunpan|sunnapan)\b/g, "sunnpan"],
    [/\b(takhna|takhne|takhno)\b/g, "takhna"],
    [/\b(dawai|dawa|davai|dava|davaai|dawaai)\b/g, "dawai"],
  ],
  deva: [
    ...SIDE_DEVA,
    [/चूतड(़)?(ों|ो)?/g, "चूतड"],
    [/नितंब(ों|ो)?/g, "चूतड"],
    [/जांघ(ों|ो)?/g, "जांघ"],
    [/पिंडल(ी|ियां|ियों)/g, "पिंडली"],
    [/पैर(ों)?/g, "पैर"],
    [/बैठ(ना|ने|ते|ता|ती|कर)?/g, "बैठ"],
    [/झुक(ना|ने|ते|ता|ती|कर)?/g, "झुक"],
    [/घूम(ना|ने|ते|ता|ती)?/g, "घूम"],
    [/घुमा(ना|ने|ते|ता|ती)/g, "घूम"],
    [/मुड(ना|ने|ते|ता|ती)/g, "मुड"],
    [/लेट(ना|ने|ते|ता|ती|कर)?/g, "लेट"],
    [/खड(़)?(े|ा|ी)\s*(होने|होते|रहने|रहते|रहना|होना)/g, "खड"],
    [/खड(़)?(े|ा|ी)/g, "खड"],
    [/उठा(ना|ने|ते|ता|ती|या)/g, "उठाना"],
    [/चल(ना|ने|ते|ता|ती)/g, "चल"],
  ],
  rules: ({ rule, O }) => {
    // ───── shared word lists ─────
    const BACK = "back kamar कमर lumbar spine reedh रीढ़";
    const LEG = "leg legs pair पैर taang टांग tango टांगों";
    const SPREAD = "goes go going radiat* spread* travel* shoots shoot refer* down jata जाता utarta उतरता failta फैलता aata आता";
    const PAINX = PAIN_W + " agony agonising agonizing excruciating unbearable terrible awful worst worse killing kills on_fire";
    const TRIG = "set_off set_it_off sets_it_off sets_off brings_it_on bring_it_on brought_it_on triggers triggered trigger brings_on aggravates aggravated worsens worsened flares flare flared makes_it_worse make_it_worse hurts hurt bothers";
    const WHEN = "when whenever while on during with every each par पर jab जब";
    const HELP = "help helps helped helping comfortable comfy takes_load_off take_load_off takes_pressure_off take_pressure_off takes_off takes_away take_away took_away gets_rid relax relaxes relaxed loosen loosens relief relieve relieves relieved ease eases eased settle settles settled calm calms soothe soothes better improves improved works worked aaram आराम rahat राहत fayda फायदा kam कम";
    const RELIEFW = "relieves relieved relief eases ease easier better improves helps help soothes settles";
    const CANT = "cant cannot unable is_out no_longer not_possible impossible afraid scared fear dar डर difficulty difficult trouble hard mushkil मुश्किल dikkat दिक्कत nahi नहीं stop* stopped quit given_up give_up gave_up giving_up avoid* band बंद struggle struggling";
    const CANTP = CANT + " painful hurts hurt sore problem problems nightmare limited limit limits restricted";
    const FN = (extra = {}) => ({ selfNeg: true, blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी", ...extra, unless: "started began start onset " + (extra.unless || "") });
    const aggRule = (opt, groups, win, o = {}) => rule("aggPostures", opt, groups, win, { ...o, unless: ((o.unless || "") + " " + RELIEFW).trim(), blockAfter: ((o.blockAfter || "") + " fine ok okay normal").trim(), reliefKills: true, reliefAfter: true });

    // ───── location ─────
    const L = (i) => O("location", i);
    const [LUP, LMID, LLOW, LSJ, LCEN, LPARR, LPARL, LBAND, LSAC, LSIL, LSIR, LSIB, LCOC, LBULU, LBULL, LBURU, LBURL, LISCL, LISCR] = Array.from({ length: 19 }, (_, i) => L(i));
    rule("location", LUP, ["upper top high_up upari upar ऊपरी ऊपर", "lumbar lower_back kamar कमर"], 5, { unless: "mid middle lower niche" });
    rule("location", LMID, ["mid middle beech बीच madhya मध्य", "lumbar lower_back kamar कमर"], 4, { unless: "upper top lower bottom" });
    rule("location", LLOW, ["lower bottom niche नीचे nichla निचला", "lumbar kamar कमर"], 3, { unless: "upper mid middle back_pain" });
    rule("location", LLOW, ["bottom", "back"], 4, { unless: "upper top mid middle thigh leg" });
    rule("location", LLOW, ["belt_line beltline belt_wali बेल्ट_वाली"], 2);
    rule("location", LSJ, ["lumbosacral", "junction joint jod जोड़"], 3);
    rule("location", LCEN, ["central centre center midline beech बीच middle", "spine reedh रीढ़ lower_back kamar कमर"], 4, { ctx: "pain", unless: "lumbar l1 l2 l3 l4 l5 level of_midline right_of left_of" });
    rule("location", LPARL, [LEFT_W, "paraspinal spine reedh रीढ़ lower_back low_back kamar कमर"], 5, { ctx: "painOrArm", block: "at in where into from radiat* spread* leg legs thigh calf foot toes buttock si_joint sacroiliac pair पैर jaangh pindli chutad down going goes", blockAfter: "leg legs thigh pair पैर buttock chutad" });
    rule("location", LPARR, [RIGHT_W, "paraspinal spine reedh रीढ़ lower_back low_back kamar कमर"], 5, { ctx: "painOrArm", block: "at in where into from radiat* spread* leg legs thigh calf foot toes buttock si_joint sacroiliac pair पैर jaangh pindli chutad down going goes", blockAfter: "leg legs thigh pair पैर buttock chutad" });
    rule("location", LBAND, ["whole entire across poori पूरी dono दोनों both", "lower_back low_back kamar कमर back"], 4, { ctx: "pain", unless: "leg legs" });
    rule("location", LSAC, ["sacrum sacral"], 1);
    rule("location", LSIL, [LEFT_W, "si sacroiliac si_joint psis dimple"], 4);
    rule("location", LSIR, [RIGHT_W, "si sacroiliac si_joint psis dimple"], 4);
    rule("location", LSIB, [BOTH_W, "si sacroiliac si_joint"], 3);
    rule("location", LCOC, ["coccyx tailbone coccydynia"], 1);
    rule("location", LBULU, [LEFT_W, "buttock buttocks gluteal glute chutad चूतड़", "upper top upar ऊपर high"], 5, { unless: "lower_back low_back" });
    rule("location", LBULL, [LEFT_W, "buttock buttocks gluteal glute chutad चूतड़", "lower bottom niche नीचे low under"], 5, { unless: "lower_back low_back" });
    rule("location", LBURU, [RIGHT_W, "buttock buttocks gluteal glute chutad चूतड़", "upper top upar ऊपर high"], 5, { unless: "lower_back low_back" });
    rule("location", LBURL, [RIGHT_W, "buttock buttocks gluteal glute chutad चूतड़", "lower bottom niche नीचे low under"], 5, { unless: "lower_back low_back" });
    rule("location", LISCL, [LEFT_W, "sitting_bone sit_bone ischial ischium baithne_wali"], 4);
    rule("location", LISCR, [RIGHT_W, "sitting_bone sit_bone ischial ischium baithne_wali"], 4);

    // ───── radiation ─────
    const R = (i) => O("radiation", i);
    const [RNONE, RBELT, RGRL, RGRR, RBUL, RBUR, RPTL, RPTR, RATL, RATR, RLAT, RKNL, RKNR, RCAL, RCAR, RL5, RL4, RDORS, RSOLE, RTOEL, RTOER, RBIL] = Array.from({ length: 22 }, (_, i) => R(i));
    rule("radiation", RNONE, ["doesnt does_not dont not no never nahi नहीं", "travel* spread* radiat* shoot* jata जाता failta फैलता"], 3, { selfNeg: true });
    rule("radiation", RNONE, ["only sirf सिर्फ", "back kamar कमर lower_back"], 4, { ctx: "pain", unless: "when while jab जब sit sitting" });
    rule("radiation", RBELT, [SPREAD, "across aar आर side_to_side belt"], 6, { ctx: "painOrArm", unless: "leg legs thigh calf pair पैर" });
    rule("radiation", RGRL, [LEFT_W, "groin jaangh_ke_jod"], 6, { ctx: "painOrArm" });
    rule("radiation", RGRR, [RIGHT_W, "groin jaangh_ke_jod"], 6, { ctx: "painOrArm" });
    rule("radiation", RBUL, [SPREAD, LEFT_W, "buttock buttocks gluteal chutad चूतड़"], 9, { unless: "upper lower top bottom upar niche ऊपर नीचे si sacroiliac sitting_bone sit_bone" });
    rule("radiation", RBUR, [SPREAD, RIGHT_W, "buttock buttocks gluteal chutad चूतड़"], 9, { unless: "upper lower top bottom upar niche ऊपर नीचे si sacroiliac sitting_bone sit_bone" });
    rule("radiation", RPTL, [LEFT_W, "hamstring back_of_thigh back_of_leg"], 4);
    rule("radiation", RPTL, [LEFT_W, "thigh jaangh जांघ", "back behind peeche पीछे posterior"], 7);
    rule("radiation", RPTR, [RIGHT_W, "hamstring back_of_thigh back_of_leg"], 4);
    rule("radiation", RPTR, [RIGHT_W, "thigh jaangh जांघ", "back behind peeche पीछे posterior"], 7);
    rule("radiation", RPTL, ["back_of behind posterior", LEFT_W, "leg legs thigh pair पैर jaangh जांघ"], 5, { noComma: true });
    rule("radiation", RPTR, ["back_of behind posterior", RIGHT_W, "leg legs thigh pair पैर jaangh जांघ"], 5, { noComma: true });
    rule("radiation", RATL, ["front_of anterior", LEFT_W, "thigh jaangh जांघ"], 5, { noComma: true });
    rule("radiation", RATL, [LEFT_W, "thigh jaangh जांघ", "aage आगे samne सामने front"], 5, { noComma: true });
    rule("radiation", RATR, [RIGHT_W, "thigh jaangh जांघ", "aage आगे samne सामने front"], 5, { noComma: true });
    rule("radiation", RATR, ["front_of anterior", RIGHT_W, "thigh jaangh जांघ"], 5, { noComma: true });
    rule("radiation", RATL, [LEFT_W, "front_of_thigh anterior_thigh"], 4);
    rule("radiation", RATR, [RIGHT_W, "front_of_thigh anterior_thigh"], 4);
    rule("radiation", RLAT, ["outer outside lateral bahar बाहर bahari बाहरी side", "thigh jaangh जांघ"], 3, { ctx: "painOrArm", unless: "shin calf lower_leg hip" });
    rule("radiation", RKNL, [LEFT_W, "knee ghutna घुटना"], 7, { ctx: "painOrArm", unless: "below_knee below_the_knee under_knee" });
    rule("radiation", RKNR, [RIGHT_W, "knee ghutna घुटना"], 7, { ctx: "painOrArm", unless: "below_knee below_the_knee under_knee" });
    rule("radiation", RCAL, [LEFT_W, "calf pindli पिंडली"], 5, { ctx: "painOrArm" });
    rule("radiation", RCAR, [RIGHT_W, "calf pindli पिंडली"], 5, { ctx: "painOrArm" });
    rule("radiation", RL5, ["outer outside lateral bahar बाहर side", "shin lower_leg taang टांग pindli पिंडली leg legs"], 5, { ctx: "painOrArm", unless: "inner inside medial andar अंदर thigh jaangh जांघ" });
    rule("radiation", RL4, ["inner inside medial andar अंदर", "shin lower_leg taang टांग pindli पिंडली"], 6, { ctx: "painOrArm", unless: "outer outside lateral bahar बाहर" });
    rule("radiation", RDORS, ["top upar ऊपर dorsum", "foot pair पैर paanv"], 5, { ctx: "painOrArm" });
    rule("radiation", RSOLE, ["sole talwe तलवे bottom_of_the_foot underneath"], 1, { ctx: "painOrArm" });
    rule("radiation", RTOEL, [LEFT_W, "toes toe angutha अंगूठा ungli उंगली"], 5, { ctx: "painOrArm" });
    rule("radiation", RTOER, [RIGHT_W, "toes toe angutha अंगूठा ungli उंगली"], 5, { ctx: "painOrArm" });
    rule("radiation", RBIL, [BOTH_W, "legs pair पैर taange टांगें", PAIN_W], 6);

    // ───── mechanism ─────
    const M = (i) => O("mechanismType", i);
    const [MINS, MLFLEX, MLROT, MLBOTH, MLFLOOR, MTWIST, MBEND, MCOUGH, MSTRAIN, MSTUMBLE, MFALLB, MFALLH, MMVA, MSPORT, MPOST, MSURG, MPP, MILL, MNONE] = Array.from({ length: 19 }, (_, i) => M(i));
    const LIFTW = "lift* lifted lifting carry carrying carried pick picked picking uthana उठाना uthate uthaya उठाया";
    const LOADW = "heavy weight box boxes bag bags suitcase* luggage bhaari भारी wazan वजन bojh बोझ saman सामान object cylinder bucket furniture";
    rule("mechanismType", MLBOTH, [LIFTW, "bend* bending bent jhuk* झुक*", "twist* twisted twisting rotat* turn* turning ghum* घूम* mud* मुड़* mod"], 11, { unless: "cant cannot unable avoid" });
    rule("mechanismType", MLFLEX, [LIFTW, "bend* bending bent stoop* jhuk* झुक* flexed rounded"], 6, { unless: "twist* twisted twisting rotat* ghum* घूम* mud* मुड़* mod cant cannot unable avoid" });
    rule("mechanismType", MLROT, [LIFTW, "twist* twisted twisting rotat* turn* turning side ghum* घूम* mud* मुड़* mod"], 6, { unless: "bend* bending bent jhuk* झुक* cant cannot unable avoid" });
    rule("mechanismType", MLFLOOR, [LIFTW, "floor ground zameen जमीन farsh फर्श deadlift off_the_floor"], 6, { unless: "cant cannot unable avoid" });
    rule("mechanismType", MTWIST, ["twisted twist twisting spun turned ghum* घूम* mud* मुड़* mod", BACK], 10, { ctx: "painOrArm", unless: "lift* lifting lifted uthana उठाना bend* jhuk* झुक* cant cannot unable" });
    rule("mechanismType", MBEND, ["bend* bending bent leaned jhuk* झुक*", "forward over down aage आगे sink shoes pen", "felt caught went pulled snapped twinge suddenly started began shuru शुरू"], 10, { unless: "lift* lifting lifted pick* picked picking twist* twisting cant cannot unable" });
    rule("mechanismType", MSTUMBLE, ["missed miss", "step stair stairs"], 4);
    rule("mechanismType", MLFLOOR, ["deadlift deadlifts deadlifting"], 1);
    rule("mechanismType", MPOST, ["driving driver lorry truck taxi", "years hours long ghante घंटे"], 6, { unless: "cant cannot unable" });
    rule("mechanismType", MINS, ["crept creeping built_up came_on_slowly"], 2);
    rule("mechanismType", MCOUGH, ["cough* sneez* khansi खांसी khansne chheenk छींक", "started onset began brought set felt went shuru शुरू"], 8);
    rule("mechanismType", MSTRAIN, ["strain* straining push pushing pushed zor जोर", "toilet potty shauch शौच stool constipation kabz"], 6);
    rule("mechanismType", MSTUMBLE, ["tripped stumbled missed_a_step slipped ladkhada* लड़खड़ा* thokar ठोकर", "without didnt didn_t not nahi नहीं saved caught managed"], 8, { selfNeg: true });
    rule("mechanismType", MFALLB, ["fell fall fallen slipped landed gir* गिर*", "back bottom buttocks backside tailbone peeth पीठ chutad चूतड़ kamar कमर"], 9);
    rule("mechanismType", MFALLH, ["fell fall fallen jumped dived gir* गिर*", "height ladder roof tree scaffold wall floor_up oonchai ऊंचाई seedhi सीढ़ी chhat छत ped पेड़"], 6);
    rule("mechanismType", MMVA, ["accident takkar टक्कर crash collision mva rta", "car bike road gaadi गाड़ी motorcycle truck bus vehicle scooter motorway highway"], 6);
    rule("mechanismType", MSPORT, ["injured hurt pulled strained felt went injury khelte खेलते", "football cricket badminton tennis golf gym squats squat deadlift* powerlifting weights sport sports game match training workout rugby hockey basketball volleyball netball khelte"], 8);
    rule("mechanismType", MSPORT, ["rugby football cricket hockey basketball volleyball netball tennis badminton golf gym", "injury injured"], 3);
    rule("mechanismType", MPOST, ["posture slouch* hunch* desk laptop computer", "hours years long ghante घंटे ghanto घंटों der देर lambe लंबे all_day"], 8, { unless: "cant cannot unable possible brings_it_on brings_on makes_it_worse make_it_worse worse worsens aggravates triggers set_it_off" });
    rule("mechanismType", MSURG, ["surgery operation operated ऑपरेशन सर्जरी discectomy laminectomy fusion", "after post since following baad बाद"], 6);
    rule("mechanismType", MPP, ["delivery childbirth birth pregnancy pregnant baby labour c_section caesarean cesarean janm जन्म", "after post since baad बाद following"], 9);
    rule("mechanismType", MILL, ["viral flu fever infection typhoid covid bukhar बुखार bimari बीमारी", "after post following baad बाद"], 6, { unless: "with_fever" });
    rule("mechanismType", MINS, ["gradual gradually slowly slow dheere धीरे", "start* began onset shuru शुरू come came badh बढ़ worse worsen* worsened increas*"], 6, { selfNeg: true, unless: "improv* better theek ठीक kam कम settl*" });
    rule("mechanismType", MNONE, ["no without any koi कोई", "mechanism cause caused reason incident wajah वजह kaaran कारण"], 5, { selfNeg: true, unless: "history previous before other" });

    // ───── postures that aggravate ─────
    const A = (i) => O("aggPostures", i);
    const [ASIT, ASIT15, ASIT30, ASIT60, ASOFT, ASTAND, ASTAND15, ASTAND30, ASUP, APRO, ALL, ALR, ADRIVE, AREADBED, ASLUMP, ABENT, ATWIST] = Array.from({ length: 17 }, (_, i) => A(i));
    const SITW = "sit sitting sat baith* बैठ*";
    const STANDW = "stand standing khade khada खड़े खड़ा";
    const MINW = "minutes minute mins min minit मिनट";
    aggRule(ASIT15, [SITW, NUM_15_29, MINW], 6, { unless: "stand standing" });
    aggRule(ASIT30, [SITW, NUM_30_59, MINW + " half_hour half_hour aadha_ghanta आधा_घंटा"], 6, { unless: "stand standing" });
    aggRule(ASIT30, [SITW, "half_hour half_hour aadha_ghanta आधा_घंटा"], 5, { unless: "stand standing" });
    aggRule(ASIT60, [SITW, NUM_60_UP], 6, { unless: "stand standing", block: "half" });
    aggRule(ASIT60, ["hour hours an_hour one_hour two_hours", "in_car car_seat"], 4, { unless: "half" });
    aggRule(ASIT60, ["long prolonged lamba लंबा der देर", SITW], 3, { ctx: "pain", unless: "stand standing minutes" });
    aggRule(ASOFT, ["soft_sofa soft_sofas low_sofa low_sofas saggy_sofa squashy_sofa naram_sofa", PAINX + " " + TRIG], 6);
    aggRule(ASOFT, ["soft naram नरम stool unsupported bina_sahare बिना_सहारे bench gadde गद्दे", SITW + " seat seating kursi कुर्सी"], 6);
    aggRule(ASTAND15, [STANDW, NUM_15_29, MINW], 6, { unless: "sit sitting" });
    aggRule(ASTAND30, [STANDW, NUM_30_59, MINW + " half_hour half_hour aadha_ghanta आधा_घंटा"], 6, { unless: "sit sitting" });
    aggRule(ASTAND30, [STANDW, "half_hour aadha_ghanta आधा_घंटा"], 7, { unless: "sit sitting" });
    aggRule(ASTAND30, ["long prolonged lamba लंबा der देर", STANDW], 3, { ctx: "pain", unless: "sit sitting minutes" });
    aggRule(ASUP, ["lying lie lay let लेट flat seedha सीधा supine", "back peeth पीठ flat supine seedha सीधा"], 5, { ctx: "pain", unless: "side stomach prone face_down ulta उल्टा pet पेट" });
    aggRule(ASUP, ["lying lie lay", "back supine flat", CANT + " " + PAINX + " " + TRIG], 8, { unless: "side stomach prone face_down" });
    aggRule(APRO, ["lying lie lay let लेट sleeping sleep", "stomach front prone face_down ulta उल्टा pet पेट"], 5, { ctx: "pain" });
    aggRule(ALL, ["lying lie lay sleep sleeping slept let लेट", LEFT_W, "side"], 6, { unless: "right dayen दायां" });
    aggRule(ALL, [LEFT_W, "karwat करवट"], 4, { unless: "right dayen दायां" });
    aggRule(ALR, ["lying lie lay sleep sleeping slept let लेट", RIGHT_W, "side"], 6, { unless: "left bayen बायां" });
    aggRule(ALR, [RIGHT_W, "karwat करवट"], 4, { unless: "left bayen बायां" });
    aggRule(ADRIVE, ["driving drive drives gaadi गाड़ी chalane चलाने car_seat in_car", PAINX + " " + TRIG], 8);
    aggRule(AREADBED, ["reading read padh* पढ़* phone mobile", "bed bistar बिस्तर propped"], 6, { ctx: "painOrArm" });
    aggRule(ASLUMP, ["slump* slouch* hunch* rounded kubad कूबड़ jhuk* झुक*", SITW], 5, { ctx: "painOrArm" });
    aggRule(ASLUMP, ["slump* slouch* slouched hunch*", PAINX + " " + TRIG], 8);
    aggRule(ABENT, ["bending bent stooping stoop jhuk* झुक* leaning", "sink basin bench dishes washing_dishes cooking bartan बर्तन", PAINX + " " + TRIG], 12);
    aggRule(ABENT, ["bending bent stooping stoop jhuk* झुक* leaning", "sink basin bench dishes washing_dishes cooking bartan बर्तन"], 6, { ctx: "painOrArm" });
    aggRule(ATWIST, ["twisted asymmetric crossed tedha टेढ़ा cross sideways", "sit sitting posture baith* बैठ* legs pair पैर desk"], 6, { unless: "lifting lifted" });
    aggRule(ASIT, ["sitting sit baith* बैठ*", PAINX + " " + TRIG], 8, { unless: "minutes minute half_hour hour hours 15 30 20 45 ghanta घंटा ghante घंटे ghanto घंटों ek_ghante stand standing sitting_bone sit_bone ischial crossed sideways slumped slouched rounded where sofa sofas couch couches soft low stool unsupported" });

    // ───── postures that relieve ─────
    const RP = (i) => O("relPostures", i);
    const [PFLAT, PCROOK, PPILKNEE, PSIDEKN, PSIDEPIL, PPRONE, PELBOW, PSUPPORT, PFIRM, PSHIFT, PWALK, PALL4, PLEAN, PLEGSUP] = Array.from({ length: 14 }, (_, i) => RP(i));
    const NOTHING = { blockAfter: "nothing none" };
    rule("relPostures", PFLAT, ["lying lie lay let लेट flat seedha सीधा supine", "back peeth पीठ flat supine seedha सीधा", HELP], 8, { ...NOTHING, unless: "knees knee ghutne ghutna घुटने घुटना pillow takiya तकिया bent" });
    rule("relPostures", PCROOK, ["knees ghutne ghutna घुटने घुटना", "bent mod मोड़ up upar ऊपर raised", "lying lie lay let लेट bed", HELP], 10, NOTHING);
    rule("relPostures", PPILKNEE, ["pillow takiya तकिया cushion", "under below beneath niche नीचे", "knees ghutne ghutna घुटने घुटना", HELP], 10, NOTHING);
    rule("relPostures", PSIDEKN, ["side karwat करवट", "knees ghutne ghutna घुटने घुटना", "together milakar मिलाकर saath साथ jod जोड़", HELP], 10, { ...NOTHING, unless: "pillow takiya तकिया between beech बीच" });
    rule("relPostures", PSIDEPIL, ["pillow takiya तकिया", "between beech बीच", "knees legs ghutne ghutna घुटने pair पैर", HELP], 10, NOTHING);
    rule("relPostures", PPRONE, ["lying lie lay let लेट sleeping", "stomach front prone face_down ulta उल्टा pet पेट", HELP], 8, { ...NOTHING, unless: "elbows elbow kohni कोहनी" });
    rule("relPostures", PELBOW, ["elbows elbow kohni कोहनी kohniyon कोहनियों", "prone propped propping press_up up उठ sphinx tek टेक", HELP], 10, NOTHING);
    rule("relPostures", PELBOW, ["elbows kohni कोहनी kohniyon कोहनियों", HELP], 8, { ...NOTHING, unless: "tennis" });
    rule("relPostures", PSUPPORT, ["lumbar_support lumbar_roll back_support rolled_towel cushion_behind", HELP], 8, NOTHING);
    rule("relPostures", PFIRM, ["firm hard sakht सख्त kadak कड़क kadi कड़ी", "chair seat kursi कुर्सी surface", HELP], 8, { ...NOTHING, unless: "hurts hurt painful" });
    rule("relPostures", PSHIFT, ["shifting shifted shift changing badalne बदलने weight wazan वजन bhaar भार", "leg foot pair पैर stool position", HELP], 10, NOTHING);
    rule("relPostures", PWALK, ["walking walk strolling stroll tahalne टहलने chalne चलने", "slow slowly gentle easy dheere धीरे halka हल्का", HELP], 8, NOTHING);
    rule("relPostures", PALL4, ["all_fours hands_and_knees haath_ghutne crawling chaar_pairon", HELP], 8, NOTHING);
    rule("relPostures", PLEAN, ["leaning lean jhukkar झुककर tek टेक", "trolley cart counter table walker bench", HELP], 10, NOTHING);
    rule("relPostures", PLEGSUP, ["legs_up feet_up legs_elevated feet_raised pair_upar पैर_ऊपर", HELP], 8, NOTHING);

    // ───── 24-hour pattern ─────
    const P = (i) => O("overallPattern", i);
    const [PCONST, PCONSTVAR, PINTTRIG, PINTUNP, PLOAD, PREST, PMORN, PEVE, PNIGHT, PWARM, PDELAY, PSECOND, PNOPAT] = Array.from({ length: 13 }, (_, i) => P(i));
    rule("overallPattern", PCONST, [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops nonstop non_stop din_bhar pura_din poora_din पूरा_दिन पूरे_दिन har_waqt har_samay हर_समय lagatar लगातार din_raat दिन_रात"], 8, { selfNeg: true, noComma: true, block: "after when while during from if only jab जब" });
    rule("overallPattern", PCONST, ["never", "away stops ends eases go goes", PAIN_W], 6, { selfNeg: true });
    rule("overallPattern", PCONST, ["constant continuous persistent unrelenting unremitting lagatar लगातार", PAIN_W], 10, { unless: "ups_and_downs up_and_down ups fluctuat* varies varying vary changes intensity" });
    rule("overallPattern", PCONSTVAR, ["constant always continuous", "ups_and_downs up_and_down fluctuat* varies varying changes"], 8);
    rule("overallPattern", PCONSTVAR, ["always constant present never_goes", "varies varying fluctuates fluctuating some_days some_hours sometimes worse_than_others up_and_down"], 10);
    rule("overallPattern", PINTUNP, ["unpredictable random randomly no_reason out_of_nowhere", PAIN_W + " episodes episode attacks attack"], 6, { selfNeg: true });
    rule("overallPattern", PINTUNP, ["comes_and_goes on_and_off intermittent come_and_go", "no_pattern random unpredictable no_reason"], 8, { selfNeg: true });
    rule("overallPattern", PINTTRIG, ["certain specific particular khaas खास", "things activities movements harkat हरकत kaam काम"], 4);
    rule("overallPattern", PLOAD, ["only sirf सिर्फ", "lift* loading loaded heavy carry carrying bojh बोझ wazan वजन uthane उठाने"], 6);
    rule("overallPattern", PREST, ["worse worst more badh बढ़ zyada ज्यादा", "rest resting still aaram आराम chup चुप"], 5, { unless: "better relieved eases improves" });
    rule("overallPattern", PMORN, ["morning subah सुबह uthte उठते", PAIN_W + " stiff* akdan akad* अकड़* jakad* जकड़*"], 6, { noComma: true });
    rule("overallPattern", PMORN, ["morning mornings subah सुबह", "bad worst worse sore stiff bura"], 4);
    rule("overallPattern", PNIGHT, ["wakes woke waking", "every_night each_night at_night nightly raat रात"], 4, { reliefKills: true });
    rule("overallPattern", PINTUNP, ["random randomly unpredictable"], 1);
    rule("overallPattern", PEVE, ["evening shaam शाम end_of_day by_evening din_dhalte दिन_ढलते", "worse worst more zyada ज्यादा badh बढ़ " + PAINX], 6, { reliefKills: true, noComma: true });
    rule("overallPattern", PNIGHT, ["night raat रात", "worse worst wakes woke jaga जगा khul खुल badh बढ़ zyada ज्यादा"], 6, { ctx: "pain", reliefKills: true, unless: "second_half early_hours small_hours 3_am 4_am sweats sweat sweating" });
    rule("overallPattern", PNIGHT, ["night raat रात", PAIN_W], 6, { reliefKills: true, noComma: true, block: "only_when only_if only_while when while if jab जब sweats sweat sweating second_half early_hours small_hours" });
    rule("overallPattern", PWARM, ["warm* loosen* ease* eases improve* better aaram आराम rahat राहत kam कम", "moving move movement hilne हिलने chalne चलने once_i_get_going"], 8, { unless: "worse_when worse_with worse_on worse_after worse_during dheere slow slowly gentle halka" });
    rule("overallPattern", PDELAY, ["next_day day_after following_day agle अगले din_baad", PAIN_W + " pay"], 8);
    rule("overallPattern", PDELAY, ["delayed delay"], 1, { ctx: "pain" });
    rule("overallPattern", PSECOND, ["second_half early_hours small_hours 3_am 4_am 3am 4am teen_baje तीन_बजे chaar_baje चार_बजे aakhri_pahar आखिरी_पहर", PAIN_W + " wake* woke jaga जाग* khul खुल"], 8);
    rule("overallPattern", PNOPAT, ["no_pattern no_rhyme nothing_predictable pattern पैटर्न", "pain dard दर्द whatsoever at_all nahi नहीं"], 8, { selfNeg: true, unless: "pattern_of" });

    // ───── leg neurological symptoms (one answer) ─────
    const NP = (i) => O("neuroPresent", i);
    const [NNO, NL, NR, NBIL] = Array.from({ length: 4 }, (_, i) => NP(i));
    const LEGP = LEG + " foot feet toes toe";
    const NSYMP = NERVE_W + " weak* weakness heavy numb* tingl* pins sunn* सुन्न* jhunjhuni झुनझुनी झनझनाहट kamzor कमजोर dropfoot foot_drop";
    rule("neuroPresent", NL, [LEFT_W, LEGP, NSYMP], 12, { unless: "both dono दोनों bilateral" });
    rule("neuroPresent", NR, [RIGHT_W, LEGP, NSYMP], 12, { unless: "both dono दोनों bilateral" });
    rule("neuroPresent", NBIL, [BOTH_W, LEGP + " feet", NSYMP], 8);
    rule("neuroPresent", NNO, ["no without nahi नहीं koi कोई", LEGP, "symptom symptoms tingling numbness numb pins pins_and_needles weakness jhunjhuni झनझनाहट sunn सुन्न dikkat दिक्कत takleef"], 6, { selfNeg: true, unless: "legs_going legs_getting legs_go legs_get leg_going leg_getting" });
    rule("neuroPresent", NBIL, [BOTH_W, "legs_going legs_getting legs_go legs_get", NSYMP], 8, { selfNeg: true });

    // ───── bladder / bowel baseline (one answer) ─────
    const BB = (i) => O("bladderBaseline", i);
    const [BNORM, BBLAD, BBOWEL, BNOTASK, BUNC] = Array.from({ length: 5 }, (_, i) => BB(i));
    rule("bladderBaseline", BNORM, ["normal fine theek ठीक sahi सही", "bladder peshab पेशाब bowel bowels potty पॉटी", "before pehle पहले prior onset until till"], 9, { selfNeg: true, unless: "issues problem problems trouble dikkat दिक्कत cant_remember dont_remember not_sure unsure remember yaad याद" });
    rule("bladderBaseline", BBLAD, ["already pre_existing preexisting long_standing pehle पहले se_hi purani पुरानी for_years", "bladder peshab पेशाब urinary overactive"], 8, { selfNeg: true, unless: "bowel potty पॉटी" });
    rule("bladderBaseline", BBOWEL, ["already pre_existing preexisting long_standing pehle पहले se_hi purani पुरानी for_years", "bowel bowels potty पॉटी constipation kabz कब्ज ibs"], 8, { selfNeg: true });
    rule("bladderBaseline", BNOTASK, ["not_asked not_taken still_to_ask need_to_ask poochha पूछा poochna पूछना", "bladder bowel peshab पेशाब potty पॉटी"], 9, { selfNeg: true });
    rule("bladderBaseline", BUNC, ["not_sure unsure uncertain cant_remember dont_remember yaad_nahi याद_नहीं pata_nahi पता_नहीं pakka_nahi", "bladder bowel peshab पेशाब potty पॉटी"], 9, { selfNeg: true });

    // ───── cauda equina screen ─────
    const CE = (i) => O("redFlagsCauda", i);
    const [CNO, CWEAK, CSADDLE, CRET, CINCB, CINCW, CTONE, CSEX, CPROG, CBISC] = Array.from({ length: 10 }, (_, i) => CE(i));
    rule("redFlagsCauda", CWEAK, [BOTH_W + " legs", "legs leg pair पैर", "weak* weakness gave_way giving_way kamzor कमजोर jawab जवाब"], 8, { unless: "walk* chalne चलने stand* khade खड़े claudication" });
    rule("redFlagsCauda", CSADDLE, ["saddle perineum perineal genitals genital private_part inner_thighs between_legs jaangh_ke_beech जांघ_के_बीच", "numb* sunn* सुन्न* anaesthesia anesthesia feeling touch mehsoos महसूस"], 8);
    rule("redFlagsCauda", CRET, ["pass passing empty emptying urinate urinating void retention", "cant cannot unable difficulty trouble struggle straining no_urge nothing_comes"], 7, { selfNeg: true, unless: "leak* incontinen* control" });
    rule("redFlagsCauda", CRET, ["peshab पेशाब", "nahi नहीं ruk रुक band बंद rok रोक dikkat दिक्कत takleef तकलीफ mushkil मुश्किल"], 4, { selfNeg: true, unless: "control kantrol कंट्रोल nikal निकल leak pehle पहले purani पुरानी se_hi" });
    rule("redFlagsCauda", CINCB, ["urine urinary peshab पेशाब bladder", "leak* incontinen* wetting control nikal निकल lost accident"], 7, { unless: "retention cant_pass cannot_pass" });
    rule("redFlagsCauda", CINCW, ["stool bowel bowels potty पॉटी faecal fecal", "leak* incontinen* soiling control nikal निकल lost accident"], 7);
    rule("redFlagsCauda", CTONE, ["anal sphincter gudaa गुदा", "tone loose lax reduced decreased dheela ढीला poor kam कम"], 5);
    rule("redFlagsCauda", CSEX, ["sexual erection erections erectile intercourse sex yaun यौन sambandh संबंध", "dysfunction problem problems difficulty loss new nayi नई dikkat दिक्कत samasya समस्या"], 8, { unless: "painful hurts" });
    rule("redFlagsCauda", CPROG, ["bilateral both dono दोनों", "deficit deficits weakness numbness symptoms", "progress* rapid* worsening"], 8);
    rule("redFlagsCauda", CPROG, ["rapid* quickly fast tezi तेजी hours ghanto", "progress* worsen* worse deteriorat* spread* badh बढ़ kharab खराब bigad बिगड़"], 8, { ctx: "painOrArm" });
    rule("redFlagsCauda", CBISC, [BOTH_W + " legs", "sciatica sciatic"], 8);

    // ───── fracture indicators ─────
    const FR = (i) => O("redFlagsFracture", i);
    const [FRNO, FRHIGH, FROSTEO, FR70, FRSTER, FRPREV, FRPOINT, FRSEV, FRPM] = Array.from({ length: 9 }, (_, i) => FR(i));
    rule("redFlagsFracture", FRHIGH, ["high_energy high_speed tez_raftaar major severe serious bhayankar भयंकर badi बड़ी gambhir गंभीर", "accident crash collision trauma mva fall takkar टक्कर chot चोट"], 6, { blockAfter: "pain ache back", unless: "small minor trivial little" });
    rule("redFlagsFracture", FROSTEO, ["osteoporosis osteoporotic weak_bones brittle_bones thin_bones kamzor_haddi कमजोर_हड्डी", "minor small trivial little halki हल्की chhoti छोटी mamuli मामूली fall fell slip slipped gir* गिर* bump* knock* chot चोट"], 8);
    rule("redFlagsFracture", FR70, ["elderly old older bujurg बुजुर्ग budhape बुढ़ापे 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 seventy eighty sattar सत्तर", "minor small trivial little halki हल्की chhoti छोटी mamuli मामूली fall fell slip slipped tripped gir* गिर* bump chot चोट"], 10, { unless: "old_injury old_back_injury old_fall" });
    rule("redFlagsFracture", FRSTER, ["steroid steroids prednisolone corticosteroid* prednisone steroid", "long_term long years months lambe लंबे saalon सालों kaafi कितने"], 8);
    rule("redFlagsFracture", FRPREV, ["previous prior earlier old before ago years_ago pehle पहले history", "vertebral spinal spine compression vertebra reedh रीढ़ kamar कमर", "fracture fractured broke broken tooti टूटी toot"], 10);
    rule("redFlagsFracture", FRPOINT, ["point pinpoint localised localized one single one_spot ek_hi_jagah", "tender* tenderness dabane दबाने chhune छूने", "spinous spine vertebra l1 l2 l3 l4 l5 t12 reedh रीढ़ bone"], 10);
    rule("redFlagsFracture", FRSEV, ["unrelenting unremitting severe constant", "whatever any every no_matter regardless unaffected", "position positions posture movement move hilne हिलने sthiti स्थिति anything"], 10, { selfNeg: true });
    rule("redFlagsFracture", FRPM, ["post_menopausal postmenopausal menopause menopausal mahavari महावारी rajonivritti रजोनिवृत्ति", "sudden suddenly acute achanak अचानक onset"], 8);

    // ───── inflammatory features ─────
    const IF = (i) => O("redFlagsInflammatory", i);
    const [IFNO, IFAGE, IFINS, IFMORN, IFMOVE, IFREST, IFALT, IFFAM, IFPSO, IFIBD, IFUVE, IFPERI, IFNSAID, IFHLA, IFESR] = Array.from({ length: 15 }, (_, i) => IF(i));
    rule("redFlagsInflammatory", IFAGE, ["onset started began first shuru शुरू since", "age aged years year saal साल umar उम्र twenties thirties teens teenage young jawani जवानी early", AGE_UNDER_45], 10, { unless: "stiff stiffness morning" });
    rule("redFlagsInflammatory", IFAGE, ["twenties thirties teens teenage young jawani जवानी early_thirties early_twenties", "started began onset shuru शुरू first came"], 8);
    rule("redFlagsInflammatory", IFAGE, ["started began onset since", "was aged at", AGE_UNDER_45], 6);
    rule("redFlagsInflammatory", IFINS, ["insidious gradual gradually slowly dheere धीरे creeping crept", "months weeks mahino महीनों hafton हफ्तों onset"], 8);
    rule("redFlagsInflammatory", IFMORN, ["morning subah सुबह wake* waking", "stiff* akdan jakdan जकड़न अकड़न", "half_hour half_hour aadha_ghanta आधा_घंटा hour ghanta घंटा 30 40 45 60 minutes thirty forty"], 10, { selfNeg: false });
    rule("redFlagsInflammatory", IFMOVE, ["stiffness akdan jakdan जकड़न अकड़न", "improves improve* better eases loosens loosen* hilne हिलने dulne exercise kasrat कसरत chalne चलने movement"], 8);
    rule("redFlagsInflammatory", IFREST, ["rest resting aaram आराम lying still", "worse badh बढ़ restless restlessness bechaini बेचैनी toss tossing karwat करवट"], 8);
    rule("redFlagsInflammatory", IFREST, ["restless restlessness bechaini बेचैनी", "night raat रात"], 5);
    rule("redFlagsInflammatory", IFALT, ["alternating alternates alternate switching switches swaps swap moves move shifts badalta बदलता", "buttock buttocks chutad चूतड़"], 8);
    rule("redFlagsInflammatory", IFFAM, ["family parivar परिवार father mother dad mum mom brother sister papa पापा bhai भाई", "spondylitis ankylosing psoriasis crohns colitis uveitis ibd as"], 8);
    rule("redFlagsInflammatory", IFPSO, ["psoriasis psoriatic sorayasis सोरायसिस"], 1, { unless: "family father mother brother sister runs" });
    rule("redFlagsInflammatory", IFIBD, ["crohns crohn colitis ibd inflammatory_bowel क्रोन्स कोलाइटिस"], 1);
    rule("redFlagsInflammatory", IFUVE, ["uveitis iritis यूवाइटिस"], 1);
    rule("redFlagsInflammatory", IFPERI, ["knee* ankle* wrist* elbow* joints jodon जोड़ों", "swollen swelling sujan सूजन arthritis", "also too as_well bhi भी along"], 8);
    rule("redFlagsInflammatory", IFPERI, ["other_joints other_joint peripheral doosre_jodon दूसरे_जोड़ों", "swelling swollen sujan सूजन pain dard दर्द arthritis"], 8);
    rule("redFlagsInflammatory", IFPERI, ["other_joints other_joint peripheral joints_too"], 2);
    rule("redFlagsInflammatory", IFNSAID, ["nsaid nsaids anti_inflammatory anti_inflammatories brufen ibuprofen diclofenac voveran naproxen etoricoxib aceclofenac", "works work relief effective excellent dramatically within turant तुरंत bahut बहुत aaram आराम"], 8);
    rule("redFlagsInflammatory", IFESR, ["esr crp", "high raised elevated badha बढ़ा ज्यादा zyada"], 6);
    rule("redFlagsInflammatory", IFHLA, ["hla b27 hlab27 b27"], 2);

    // ───── other serious pathology ─────
    const SE = (i) => O("redFlagsSerious", i);
    const [SNO, SCONST, SNIGHT, STHOR, SABD, SAAA, SWT, SCA, SIV, SINF, SFEV, SFLANK] = Array.from({ length: 12 }, (_, i) => SE(i));
    rule("redFlagsSerious", SCONST, ["constant continuous unrelenting same", "position movement posture hilne हिलने sthiti स्थिति sit sitting lie lying stand standing"], 8, { selfNeg: true, unless: "after when while worse better relieved" });
    rule("redFlagsSerious", SCONST, ["doesnt_change does_not_change dont_change not_change unchanged no_change nothing_changes never_changes badalta_nahi", "rest movement position posture move moving hilne हिलने"], 8, { selfNeg: true });
    rule("redFlagsSerious", SNIGHT, ["night raat रात", "wakes woke jaga जगा jagata जगाता khul खुल neend नींद sleep disturbs disturb* disturbed", "progress* worsening getting_worse gets_worse badh बढ़ increasing steadily every_night roz रोज"], 14);
    rule("redFlagsSerious", SNIGHT, ["night raat रात", PAIN_W, "progress* worsening getting_worse gets_worse badh बढ़ increasing steadily every_night roz रोज"], 8, { selfNeg: true });
    rule("redFlagsSerious", STHOR, ["thoracic mid_back upper_back shoulder_blades shoulder_blade middle_of_the_back peeth_ke_beech पीठ_के_बीच peeth पीठ", "also too as_well bhi भी along accompanying saath साथ both dono दोनों"], 8);
    rule("redFlagsSerious", SABD, ["abdominal abdomen stomach belly tummy pet पेट", "pain ache dard दर्द"], 4, { unless: "no without nahi pulsatile pulsating" });
    rule("redFlagsSerious", SAAA, ["pulsatile pulsating pulsing throbbing beating dhadakta धड़कता dhadakne धड़कने aaa aneurysm", "mass lump gaanth गांठ abdomen abdominal pet पेट belly tummy stomach aorta aneurysm"], 8);
    rule("redFlagsSerious", SWT, ["weight wazan वजन", "loss lost losing ghat घट* kam कम dropping dropped gir गिर*", "unexplained without_trying bina बिना no_reason"], 8, { selfNeg: true });
    rule("redFlagsSerious", SWT, ["weight wazan वजन", "lost losing loss ghat घट* dropped dropping"], 6, { unless: "want wants wanted wish trying plan gym program programme gain gained" });
    rule("redFlagsSerious", SCA, ["cancer tumor tumour malignan* carcinoma lymphoma leukemia myeloma metastas* kainsar कैंसर", "history had diagnosed treated treatment survivor chemo chemotherapy radiotherapy past previous earlier before tha था hua हुआ ilaaj इलाज"], 6);
    rule("redFlagsSerious", SIV, ["iv intravenous inject* injecting injection nashe नशे nasha नशा", "drug drugs heroin nasha नशा use user"], 6);
    rule("redFlagsSerious", SINF, ["infection infected abscess uti antibiotics antibiotic", "recent recently last_month lately haal हाल pichle पिछले"], 8);
    rule("redFlagsSerious", SFEV, ["fever temperature bukhar बुखार chills night_sweats", "back lumbar spine kamar कमर peeth पीठ pain dard दर्द"], 8);
    rule("redFlagsSerious", SFEV, ["fever temperature bukhar बुखार", "sweat* sweats night_sweats chills shivering rigors kaampkampi कंपकंपी unwell"], 8);
    rule("redFlagsSerious", SFLANK, ["flank loin gurde गुर्दे", PAIN_W + " colic colicky"], 5);

    // ───── ADL restrictions ─────
    const D = (i) => O("adlRestrictions", i);
    const [DNONE, DSHOES, DBEND, DLIFTKID, DLIFTSH, DVAC, DBEDMOB, DOUTBED, DBATH, DDRIVE, DSEX, DGARD, DHOUSE, DCHILD] = Array.from({ length: 14 }, (_, i) => D(i));
    rule("adlRestrictions", DSHOES, [CANTP, "shoes socks shoelaces laces joote जूते mozey मोजे"], 9, FN());
    rule("adlRestrictions", DSHOES, ["put_on putting_on tie tying", "shoes socks shoelaces laces"], 5, { ctx: "pain" });
    rule("adlRestrictions", DBEND, [CANTP, "bend* bending jhuk* झुक*"], 6, FN());
    rule("adlRestrictions", DBEND, [CANTP, "pick picking picks", "floor ground zameen जमीन farsh फर्श"], 8, FN());
    rule("adlRestrictions", DLIFTKID, [CANTP, "lift* carry carrying pick utha उठा", "child children kids kid baby toddler grandchild* bachcha बच्चा bachche बच्चे bachcho बच्चों"], 10, FN());
    rule("adlRestrictions", DLIFTSH, [CANTP, "lift* carry carrying utha उठा", "shopping groceries bags bag saman सामान thaila थैला bucket balti बाल्टी heavy bhaari भारी loads load"], 10, FN({ unless: "child children kids kid baby toddler bachcha बच्चा bachche बच्चे" }));
    rule("adlRestrictions", DVAC, [CANTP, "vacuum vacuuming hoover hoovering mop mopping sweep sweeping pocha पोछा jhadu झाड़ू floors cleaning"], 9, FN());
    rule("adlRestrictions", DBEDMOB, [CANTP, "turn turning roll rolling over palat पलट karwat करवट", "bed night bistar बिस्तर"], 10, FN());
    rule("adlRestrictions", DOUTBED, [CANTP, "get getting got", "out up", "bed bistar बिस्तर"], 9, FN());
    rule("adlRestrictions", DOUTBED, [CANTP, "uthne उठने uthna", "bistar बिस्तर bed"], 8, FN());
    rule("adlRestrictions", DBATH, [CANTP, "bath tub bathtub shower nahane नहाने"], 9, FN());
    rule("adlRestrictions", DDRIVE, [CANTP, "drive driving gaadi गाड़ी chalane चलाने"], 9, FN());
    rule("adlRestrictions", DSEX, [CANTP, "sex sexual intimacy intimate sambandh संबंध"], 9, FN());
    rule("adlRestrictions", DGARD, [CANTP, "garden gardening weeding digging bagwani बागवानी bagiche बगीचे"], 9, FN());
    rule("adlRestrictions", DHOUSE, [CANTP, "housework chores household cleaning cooking ghar_ka_kaam घर_का_काम"], 9, FN({ unless: "office computer desk job" }));
    rule("adlRestrictions", DCHILD, [CANTP, "child children baby kids toddler parenting childcare bachcha बच्चा bachche बच्चे bachcho बच्चों", "care looking_after dekhbhal देखभाल bathe bathing dress dressing nahlana"], 12, FN());

    // ───── work impact (one answer) ─────
    const W = (i) => O("workImpact", i);
    const [WNO, WMILD, WMOD, WRED, WSHORT, WMED, WLONG, WUNEMP, WUNABLE] = Array.from({ length: 9 }, (_, i) => W(i));
    const OFF = "off unable_to_work cant_work not_working out_of_work sick_leave leave chhutti छुट्टी gaya_nahi nahi_gaya नहीं_गया";
    rule("workImpact", WNO, ["no without nahi नहीं koi कोई", "work job naukri नौकरी kaam काम", "impact effect asar असर affect* dikkat दिक्कत problem problems"], 8, { selfNeg: true });
    rule("workImpact", WMILD, ["full poori पूरी normal", "duties duty kaam काम job", "discomfort mild halki हल्की thodi थोड़ी takleef तकलीफ ache pain dard दर्द"], 10, { unless: "cant cannot unable modified light" });
    rule("workImpact", WRED, ["half_days half_day part_time"], 2);
    rule("workImpact", WMOD, ["modified light lighter alternative restricted halka हल्का", "duties duty work kaam काम"], 5);
    rule("workImpact", WRED, ["reduced reduce reduced_hours cut fewer kam कम part_time half_days aadhe आधे", "hours ghante घंटे shifts shift days din"], 5);
    rule("workImpact", WSHORT, [OFF, WEEKS_SHORT, "week weeks hafta hafte हफ्ता हफ्ते days din दिन"], 9, { selfNeg: true, unless: "months month year saal mahine महीने" });
    rule("workImpact", WMED, [OFF, "4 5 6 7 8 9 10 11 12 four five six seven eight nine ten eleven twelve chhe छह aath आठ", "week weeks hafte हफ्ते"], 8, { selfNeg: true });
    rule("workImpact", WMED, [OFF, "1 2 3 one two three ek do teen एक दो तीन a_month", "month months mahine महीने mahina"], 8, { selfNeg: true });
    rule("workImpact", WLONG, [OFF, "4 5 6 7 8 9 10 11 12 four five six seven eight nine ten chhe छह saat सात", "months mahine महीने mahino महीनों"], 8, { selfNeg: true });
    rule("workImpact", WLONG, [OFF, "year years saal साल"], 6, { selfNeg: true });
    rule("workImpact", WUNEMP, ["lost laid_off redundant dismissed sacked nikal निकाल chhoot छूट chali_gayi चली_गई", "job naukri नौकरी work employment"], 8);
    rule("workImpact", WUNEMP, ["unemployed berozgar बेरोजगार"], 1);
    rule("workImpact", WUNABLE, ["cannot cant unable never nahi नहीं", "return go_back back wapas वापस previous old purani पुरानी pehle पहले", "job occupation work naukri नौकरी kaam काम"], 10, { selfNeg: true });

    // ── clinician-voice notes ("the patient", "they", short fragments; see lumbarSISheetSet.test.js) ──
    const NOLEG = "no nothing nahi नहीं koi कोई";
    rule("radiation", RNONE, [NOLEG, "leg legs pair पैर", "pain symptoms dard दर्द goes going down"], 9, { selfNeg: true });
    // "pair mein kuch nahi" / "पैरों में कुछ नहीं" (nothing in the legs) -- a rule, because the same words are already a phrase for the neurological "No"
    rule("radiation", RNONE, ["kuch_nahi कुछ_नहीं", "pair paer पैर पैरों"], 4, { selfNeg: true });
    rule("neuroPresent", NNO, [NOLEG, "leg legs pair पैर neuro neurological", "pain symptoms dard दर्द tingling numbness neuro neurological sciatica goes going down"], 7, { selfNeg: true, unless: "cannot cant unable can_t couldnt" });
    rule("radiation", RCAL, [LEFT_W, "calf pindli पिंडली"], 9, { ctx: "painOrArm", block: "right dayen दायां" });
    rule("radiation", RCAR, [RIGHT_W, "calf pindli पिंडली"], 9, { ctx: "painOrArm", block: "left bayen बायां" });
    rule("radiation", RBIL, ["both dono दोनों bilateral", "legs leg pair पैर pairon", "pain dard दर्द goes going down radiat* spread* tak तक"], 6, { unless: "numb* tingl* sunn* सुन्न* weak* sciatica" });
    rule("mechanismType", MLBOTH, [LIFTW, "flexion flexed", "rotation rotated"], 8);
    rule("mechanismType", MFALLB, ["fell fall fallen slipped landed landing gir* गिर*", "buttock buttocks bottom chutad चूतड़"], 6);
    rule("mechanismType", MBEND, ["repeated repetitive lots_of baar_baar बार_बार all_day", "bend* bending bent flexion jhuk* झुक*"], 6, { unless: "lift* lifting lifted pick* carry*" });
    rule("mechanismType", MPOST, ["poor bad galat गलत", "posture poscher पोस्चर"], 3);
    rule("mechanismType", MPOST, ["sits sit sitting baith* बैठ*", "hours ghante घंटे ghanto घंटों der देर long lamba लंबा"], 8, { unless: "worse worsens aggravat* flares flare cant cannot unable badh* बढ़* badhta बढ़ता" });
    rule("aggPostures", ASTAND, [STANDW, PAINX + " " + TRIG + " most"], 7, { reliefKills: true, unless: "minutes minute mins min half_hour hour hours ghanta घंटा ghante घंटे ghanto घंटों मिनट long prolonged lamba लंबा der देर" });
    rule("aggPostures", ABENT, ["straighten* seedha सीधा सीधे coming_up come_up comes_up come_back_up coming_back_up", "bend* bending bent jhuk* झुक* tying shoes flexion"], 7);
    rule("relPostures", PCROOK, ["knees knee ghutna घुटने घुटना", "bent mod* मोड़* flexed up raised", "lie lying lay let लेट* sleep"], 8, NOTHING);
    rule("relPostures", PLEAN, ["eased relieved better relief aaram आराम improves helps", "lean* leaning", "forward aage आगे jhuk"], 8);
    rule("relPostures", PLEAN, ["trolley ट्रॉली", "forward aage आगे jhuk* झुक* lean*"], 6);
    rule("redFlagsInflammatory", IFMOVE, ["exercise exercising workout walk* kasrat कसरत movement moving", "loosen* better improves improve* eases ease kam कम aaram आराम"], 7, { unless: "rest resting" });
    rule("redFlagsInflammatory", IFINS, ["insidious gradual gradually crept slowly dheere धीरे", "week weeks month months mahine महीने hafte हफ्ते"], 6, { blockAfter: "improvement improving improved better recovery relief easing eased settling" });
    rule("redFlagsInflammatory", IFFAM, ["father mother brother sister uncle aunt family parivaar परिवार fh", "ankylosing spondylitis as psoriasis uveitis sujan सूजन"], 6);
    rule("redFlagsFracture", FRSTER, ["steroid steroids corticosteroid* prednisolone prednisone स्टेरॉइड"], 1, { blockBefore: "no without never" });
    rule("redFlagsSerious", SNIGHT, ["constant continuous lagatar लगातार", "night nights raat रात", "pain ache dard दर्द"], 8, { selfNeg: true });
    rule("location", LPARR, ["right dayen दायां", "of_midline of_spine right_of_spine reedh_ke_paas रीढ़_के_पास next_to_the_spine next_to_spine beside_the_spine beside_spine"], 4, { ctx: "painOrArm", block: "left bayen बायां" });
    rule("location", LPARL, ["left bayen बायां", "of_midline of_spine left_of_spine reedh_ke_paas रीढ़_के_पास next_to_the_spine next_to_spine beside_the_spine beside_spine"], 4, { ctx: "painOrArm", block: "right dayen दायां" });
    rule("location", LCEN, ["central", "lbp back_pain low_back_pain lower_back_pain"], 2);
    rule("location", LSIR, [RIGHT_W, "sij esi एसआई si_jt"], 4);
    rule("location", LSIL, [LEFT_W, "sij esi एसआई si_jt"], 4);
    rule("location", LBULL, [LEFT_W, "chutad चूतड़ buttock", "lower niche नीचे nichla निचले निचला"], 4);
    rule("location", LBURL, [RIGHT_W, "chutad चूतड़ buttock", "lower niche नीचे nichla निचले निचला"], 4);
    rule("aggPostures", ASIT, ["sit sitting baith* बैठ*", "even", "minutes minute mins"], 6, { reliefKills: true });
    rule("mechanismType", MINS, ["dheere_dheere धीरे_धीरे"], 2, { blockAfter: "theek ठीक improv* kam कम" });
    // "Gradual." written alone in the Onset box, but not "gradual improvement"
    rule("mechanismType", MINS, ["insidious"], 1);
    rule("mechanismType", MINS, ["gradual gradually"], 1, { blockAfter: "improvement improving improved improve better recovery recovering relief healing" });
    rule("location", LPARL, [LEFT_W, "muscle muscles maspeshi* मांसपेश*", "back kamar कमर lower_back"], 10, { block: "right dayen दायां leg legs pair पैर thigh calf buttock buttocks chutad चूतड़" });
    rule("location", LPARR, [RIGHT_W, "muscle muscles maspeshi* मांसपेश*", "back kamar कमर lower_back"], 10, { block: "left bayen बायां leg legs pair पैर thigh calf buttock buttocks chutad चूतड़" });
    rule("redFlagsInflammatory", IFAGE, ["man woman male female", "twenty twenties thirty thirties"], 4);
    // fresh clinician exam (lumbarSISheetSetFresh.js)
    rule("location", LCEN, ["central", "low_back lower_back backache back_ache"], 3);
    rule("relPostures", PWALK, ["walking_about walk_about walking_around walk_around", "eases easier better relief improves helps"], 6);
    rule("aggPostures", ASIT, ["sit sitting baith* बैठ*", "worse hurts hurt painful pain"], 5, { reliefKills: true });
    rule("mechanismType", MBEND, ["bend* bending bent jhuk* झुक*", "sudden sharp suddenly"], 8, { unless: "lift* lifting lifted pick* carry*" });
    rule("overallPattern", PMORN, ["stiff* sore akda*", "getting_out_of_bed get_out_of_bed out_of_bed getting_up morning"], 8);
    rule("mechanismType", MCOUGH, ["sneez* cough*", "sent set brought triggered jolt locked caused"], 6);
    rule("redFlagsInflammatory", IFAGE, ["twenty twenties thirty thirties", "year_old years_old yo"], 4);
    rule("redFlagsInflammatory", IFAGE, ["pandrah solah satrah atharah unnis bees ikkis baais teis chaubis pachchis panchis chhabbis sattais atthais untis tees battis tentis chauntis paintis chhattis saintis adtis chalis पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस", "saal साल"], 3);
    rule("redFlagsInflammatory", IFMOVE, ["tahalne tahalna टहलने kasrat कसरत", "kam कम aaram आराम"], 5);
    rule("redFlagsInflammatory", IFPERI, ["heel heels knee knees ankle wrist elbow shoulder", "as_well_as along_with also too bhi भी"], 8, { unless: "knees_up knees_bent bent_knees knee_up knees_flexed" });
    rule("redFlagsFracture", FRHIGH, ["fell fall fallen jumped", "ladder roof scaffold tree height metres feet"], 8, { unless: "small minor little trivial" });
    rule("adlRestrictions", DVAC, ["vacuum vacuuming mop mopping hoover sweeping jhadu झाड़ू pocha पोछा", "struggle* difficult hard trouble difficulty cant cannot unable"], 8);
    rule("adlRestrictions", DOUTBED, ["out_of_bed get_out_of_bed getting_out_of_bed", "struggle* difficult ages slow hard trouble difficulty cant cannot unable"], 7);
    rule("adlRestrictions", DDRIVE, ["drive drives driving", "stop stops stopping break breaks", "half_hour every"], 8);
    rule("adlRestrictions", DDRIVE, ["stop stops stopping break breaks pull_over", "every half_hour hour"], 6, { story: "drive drives driving drove" });
    rule("workImpact", WLONG, ["not_worked not_working hasnt_worked has_not_worked", "4 5 6 7 8 9 10 11 12 four five six seven eight nine ten", "month months mahine महीने"], 8, { selfNeg: true });
    rule("mechanismType", MSPORT, ["gymnast gymnasts gymnastics cricket bowler bowls bowling athlete athletes sport sports khel खेल जिम्नास्ट* बॉलिंग"], 1, { blockBefore: "no without never" });
  },
});

export const FIELDS = matcher.fields;
export const PHRASE_COUNT = matcher.PHRASE_COUNT;
export const RULE_COUNT = matcher.RULE_COUNT;
export const phrasesFor = matcher.phrasesFor;
export const allPhrases = matcher.allPhrases;
export const describeRules = matcher.describeRules;
export const understandField = matcher.understandField;
export const understandStory = matcher.understandStory;
