// hipPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a HIP complaint in everyday words (English, Hinglish, Hindi in
// Devanagari) and suggests which of the Subjective checklist options it means. No AI, no network, no cost.
// It only SUGGESTS; the student taps to confirm. The matching engine is in phraseEngine.js.
//
// Covers the 7 Hip questions that change the AI Objective Assessment ranking (location, dominant pattern,
// mechanism, aggravating, 24-hour pattern, mechanical symptoms, red flags). The option strings must match the
// form exactly (a test checks this). Hip has its OWN 24-hour-pattern answers (not the standard six).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { extendPhrases } from "./phrasePattern.js";

const HIP_BASE = {
  location: {
    "Anterior groin": [
      "~groin", "groin pain", "pain in the groin", "pain in my groin", "pain at the groin", "pain deep in the groin", "groin ache", "in the groin", "at the groin",
      "pain where the thigh meets the pelvis at the front",
      "groin me dard", "jaangh ke jod me dard", "pet aur jaangh ke beech dard", "jaangh ke upar dard", "groin ke paas dard",
      "ग्रोइन में दर्द", "जांघ के जोड़ में दर्द", "पेट और जांघ के बीच दर्द", "जांघ के ऊपर दर्द", "ग्रोइन के पास दर्द",
    ],
    "Anterior hip / hip flexor region": [
      "front of the hip", "front of my hip", "anterior hip", "hip flexor", "hip flexor pain", "pain at the front of the hip",
      "top of the thigh at the front", "front of the thigh near the hip", "pain in the hip flexor",
      "kulhe ke aage dard", "kulhe ke samne dard", "kulhe ke aage ki taraf", "jaangh ke upar aage ki taraf dard", "kulhe ke samne wale hisse me dard",
      "कूल्हे के आगे दर्द", "कूल्हे के सामने दर्द", "कूल्हे के आगे की तरफ", "जांघ के ऊपर आगे की तरफ दर्द", "कूल्हे के सामने वाले हिस्से में दर्द",
    ],
    "Lateral hip (greater trochanter)": [
      "side of the hip", "side of my hip", "outer hip", "outer side of the hip", "lateral hip", "greater trochanter", "trochanteric pain",
      "trochanteric bursitis", "bony bit on the side of the hip", "pain on the outside of the hip", "pain on the side of the hip",
      "kulhe ke bahar ki taraf dard", "kulhe ke side me dard", "kulhe ki bahari haddi me dard", "kulhe ke bagal me dard", "kulhe ke bahari hisse me dard",
      "कूल्हे के बाहर की तरफ दर्द", "कूल्हे के साइड में दर्द", "कूल्हे की बाहरी हड्डी में दर्द", "कूल्हे के बगल में दर्द", "कूल्हे के बाहरी हिस्से में दर्द",
    ],
    "Posterior hip / deep buttock": [
      "~buttock", "buttock pain", "pain in the buttock", "pain in my buttock", "deep in the buttock", "deep buttock pain", "pain in my bum",
      "back of the hip", "posterior hip", "glute pain", "pain deep in the glutes", "pain in the gluteal area",
      "kulhe ke peeche dard", "chutad me dard", "nitamb me gehra dard", "kulhe ke piche ki taraf dard", "kulhe ke peeche gehra dard",
      "कूल्हे के पीछे दर्द", "चूतड़ में दर्द", "नितंब में गहरा दर्द", "कूल्हे के पीछे की तरफ दर्द", "कूल्हे के पीछे गहरा दर्द",
    ],
    "Ischial tuberosity": [
      "sit bone", "sit bone pain", "sitting bone", "ischial tuberosity", "ischial pain", "pain in my sit bone", "high hamstring pain at the sit bone",
      "pain at the bone i sit on", "hamstring origin pain", "bone at the bottom of my pelvis", "bone at the bottom of the pelvis",
      "baithne wali haddi me dard", "baithne ki haddi me dard", "sit bone me dard", "baithte waqt haddi me dard", "baithne wali haddi ke paas dard",
      "बैठने वाली हड्डी में दर्द", "बैठने की हड्डी में दर्द", "सिट बोन में दर्द", "बैठते समय हड्डी में दर्द", "बैठने वाली हड्डी के पास दर्द",
    ],
    "Adductor / inner thigh": [
      "inner thigh", "inner thigh pain", "adductor", "adductor pain", "inside of the thigh", "inner thigh near the groin",
      "pain on the inside of the thigh", "groin strain inner thigh", "pulled adductor",
      "jaangh ke andar ki taraf dard", "andar ki jaangh me dard", "jaangh ke andruni hisse me dard", "andruni jaangh me dard", "jaangh ke andar dard",
      "जांघ के अंदर की तरफ दर्द", "अंदर की जांघ में दर्द", "जांघ के अंदरूनी हिस्से में दर्द", "अंदरूनी जांघ में दर्द", "जांघ के अंदर दर्द",
    ],
    "Pubic symphysis": [
      "pubic pain", "pubic bone", "pubic bone pain", "pubis", "pubic symphysis", "symphysis pubis", "pain over the pubic bone",
      "pelvic girdle pain at the front", "pain at the front of the pelvis in the middle",
      "pubic haddi me dard", "pet ke neeche beech ki haddi me dard", "pubic bone me dard", "pelvis ke aage beech me dard",
      "प्यूबिक हड्डी में दर्द", "पेट के नीचे बीच की हड्डी में दर्द", "प्यूबिक बोन में दर्द", "पेल्विस के आगे बीच में दर्द",
    ],
    "SI joint": [
      "si joint", "sij", "sacroiliac", "sacroiliac joint", "sacroiliac pain", "dimple of the back pain", "pain over the back of the pelvis",
      "pain next to the tailbone on one side", "pain at the dimple in the low back",
      "si joint me dard", "kamar ke neeche ek taraf dard", "kamar ke nichle hisse me ek taraf dard", "tailbone ke paas ek taraf dard",
      "एसआई जॉइंट में दर्द", "कमर के नीचे एक तरफ दर्द", "कमर के निचले हिस्से में एक तरफ दर्द", "टेलबोन के पास एक तरफ दर्द",
    ],
  },

  locationPattern: {
    "Groin-dominant": [
      "mostly in the groin", "mainly in the groin", "mostly groin pain", "mainly groin pain", "groin dominant", "groin is the worst",
      "the worst pain is in the groin", "main pain is in the groin",
      "zyada tar groin me dard", "sabse zyada dard groin me", "mainly groin me dard", "dard zyada jaangh ke jod me",
      "ज्यादातर ग्रोइन में दर्द", "सबसे ज्यादा दर्द ग्रोइन में", "मुख्य रूप से ग्रोइन में दर्द", "दर्द ज्यादा जांघ के जोड़ में",
    ],
    "Lateral hip-dominant": [
      "mostly on the outside of the hip", "mainly on the side of the hip", "side of the hip is the worst", "lateral hip dominant",
      "outer hip is the main problem", "the worst pain is on the outside of the hip", "main pain is on the side of the hip",
      "zyada tar kulhe ke bahar ki taraf dard", "sabse zyada dard kulhe ke side me", "mainly kulhe ke bahar dard", "dard zyada kulhe ke bagal me",
      "ज्यादातर कूल्हे के बाहर की तरफ दर्द", "सबसे ज्यादा दर्द कूल्हे के साइड में", "मुख्य रूप से कूल्हे के बाहर दर्द", "दर्द ज्यादा कूल्हे के बगल में",
    ],
    "Posterior / buttock-dominant": [
      "mostly in the buttock", "mainly in the buttock", "mostly buttock pain", "buttock dominant", "the worst pain is in the buttock",
      "main pain is in the buttock", "mostly at the back of the hip", "mainly deep in the glutes",
      "zyada tar chutad me dard", "sabse zyada dard kulhe ke peeche", "mainly nitamb me dard", "dard zyada kulhe ke peeche wale hisse me",
      "ज्यादातर नितंब में दर्द", "सबसे ज्यादा दर्द कूल्हे के पीछे", "मुख्य रूप से नितंब में दर्द", "दर्द ज्यादा कूल्हे के पीछे वाले हिस्से में",
    ],
    "Adductor-dominant": [
      "mostly in the inner thigh", "mainly inner thigh pain", "adductor dominant", "the worst pain is in the inner thigh",
      "main pain is the inner thigh", "mostly adductor pain", "mainly on the inside of the thigh",
      "zyada tar andar ki jaangh me dard", "sabse zyada dard jaangh ke andar", "mainly andruni jaangh me dard", "dard zyada jaangh ke andar wale hisse me",
      "ज्यादातर अंदर की जांघ में दर्द", "सबसे ज्यादा दर्द जांघ के अंदर", "मुख्य रूप से अंदरूनी जांघ में दर्द", "दर्द ज्यादा जांघ के अंदर वाले हिस्से में",
    ],
    "Diffuse / mixed": [
      "pain all around the hip", "all over the hip", "diffuse hip pain", "mixed pain around the hip", "hard to say where it hurts",
      "cant say exactly where", "pain in several places around the hip", "pain is all over the hip area",
      "poore kulhe me dard", "kulhe ke har taraf dard", "kai jagah dard", "ek jagah nahi bata sakta dard kahan hai", "kulhe ke aaspaas har jagah dard",
      "पूरे कूल्हे में दर्द", "कूल्हे के हर तरफ दर्द", "कई जगह दर्द", "एक जगह नहीं बता सकता दर्द कहां है", "कूल्हे के आसपास हर जगह दर्द",
    ],
  },

  mechanism: {
    "Insidious onset / overuse": [
      "overuse", "over use", "no injury", "no specific injury", "no particular injury", "no trauma", "started on its own",
      "started by itself", "came on slowly", "gradually started", "slowly started", "gradual onset", "no known cause",
      "dont know how it started", "too much running", "too much walking", "overtraining", "increased my training", "pain came out of nowhere",
      "started out of nowhere", "started for no reason", "no apparent cause", "no obvious cause", "slowly building", "no accident",
      "no fall", "creeping onset", "slow onset", "insidious onset", "insidious",
      "bina chot ke", "bina kisi chot ke", "apne aap shuru ho gaya", "apne aap shuru hua", "dheere dheere shuru hua", "kaaran pata nahi", "zyada chalne se", "zyada daudne se", "koi chot nahi lagi",
      "chot nahi lagi thi", "apne aap dard hua", "bina kisi wajah ke",
      "बिना चोट के", "अपने आप शुरू हुआ", "धीरे धीरे शुरू हुआ", "कारण पता नहीं", "ज्यादा चलने से", "ज्यादा दौड़ने से", "कोई चोट नहीं लगी",
      "चोट नहीं लगी थी", "अपने आप दर्द हुआ", "बिना किसी वजह के",
    ],
    "Age-related degenerative": [
      "age related", "age related changes", "degenerative", "degeneration", "wear and tear", "due to age", "because of age",
      "getting old", "old age", "arthritis", "osteoarthritis", "hip arthritis", "arthritis in the hip", "worn out hip joint", "oa hip",
      "umar ke saath", "budhape ki wajah se", "umar ki wajah se", "ghisav", "budhape me", "umar badhne se", "arthritis hai", "umar ho gayi hai", "budhapa",
      "उम्र के साथ", "बुढ़ापे की वजह से", "उम्र की वजह से", "घिसाव", "बुढ़ापे में", "उम्र बढ़ने से", "गठिया", "उम्र हो गई है", "बुढ़ापा",
    ],
    "Twisting / pivoting mechanism": [
      "twisting injury", "twisted my hip", "hip twisted", "twisted awkwardly", "twisting mechanism", "pivoting mechanism", "pivoted on my leg",
      "twisted while turning", "turned quickly and felt a twinge", "foot planted and turned", "twisted on a planted foot", "pivot injury",
      "kulha mud gaya", "kulhe me moch", "ghumte waqt kulha mud gaya", "pair jama kar ghoomte waqt", "mudte waqt kulhe me jhatka", "kulha ghum gaya",
      "कूल्हा मुड़ गया", "कूल्हे में मोच", "घूमते समय कूल्हा मुड़ गया", "पैर जमाकर घूमते समय", "मुड़ते समय कूल्हे में झटका", "कूल्हा घूम गया",
    ],
    "Fall": [
      "fell on my hip", "fall on the hip", "slipped and fell", "had a fall", "fell down", "fell on my side", "fall from height",
      "fell off a ladder", "fell down the stairs", "fell off my bike", "tripped and fell", "after a fall", "since the fall",
      "kulhe ke bal gir", "gir gaya", "phisal kar gir", "girne ke baad", "seedhiyon se gir", "bike se gir", "gir gayi",
      "कूल्हे के बल गिर", "गिर गया", "फिसल कर गिर", "गिरने के बाद", "सीढ़ियों से गिर", "बाइक से गिर", "गिर गई",
    ],
    "Kicking mechanism": [
      "kicking", "kicking mechanism", "kicked a ball", "kicking a football", "kicking a ball", "football kick", "kick injury", "kicked hard",
      "missed the ball while kicking", "powerful kick", "while kicking",
      "ball ko laat maarte waqt", "kick maarte waqt", "football me kick maarte hue", "laat maarne se", "zor se kick",
      "गेंद को लात मारते समय", "किक मारते समय", "फुटबॉल में किक मारते हुए", "लात मारने से", "जोर से किक",
    ],
    "Lunging mechanism": [
      "lunging", "lunging mechanism", "lunge", "lunges", "lunged forward", "lunges in the gym", "lunging for a ball", "fencing lunge",
      "badminton lunge", "overstretched in a lunge", "did a deep lunge",
      "lunge karte waqt", "aage ki taraf lunge", "lunge maarte hue", "gym me lunges", "lunge lagate waqt",
      "लंज करते समय", "आगे की तरफ लंज", "लंज मारते हुए", "जिम में लंजेस", "लंज लगाते समय",
    ],
    "High-speed sport": [
      "high speed sport", "sprinting", "sprint", "sprinter", "running fast", "athletics", "track sprint", "sudden acceleration", "accelerating hard",
      "hockey", "rugby", "fast running", "speed work",
      "tez daudte waqt", "ek dum se bhaagte hue", "sprint karte waqt", "tez daudne se", "hockey khelte waqt",
      "तेज दौड़ते समय", "एक दम से भागते हुए", "स्प्रिंट करते समय", "तेज दौड़ने से", "हॉकी खेलते समय",
    ],
    "Return to sport after time off": [
      "returned to sport after a break", "restarted running after months", "back to the gym after a long break", "first time playing after lockdown",
      "resumed training", "started playing again after", "break from sport", "layoff from sport", "returned to training after injury",
      "started again after a long gap", "back to playing after months",
      "khelna dobara shuru kiya", "kaafi time baad khela", "lambe break ke baad khelna", "gym dobara shuru kiya", "kai mahine baad daudna shuru kiya",
      "खेलना दोबारा शुरू किया", "काफी समय बाद खेला", "लंबे ब्रेक के बाद खेलना", "जिम दोबारा शुरू किया", "कई महीने बाद दौड़ना शुरू किया",
    ],
    "Post-partum": [
      "post partum", "postpartum", "after delivery", "after childbirth", "after giving birth", "post natal", "postnatal",
      "since i had my baby", "since the delivery", "after my c section", "after normal delivery", "following the birth of my baby",
      "delivery ke baad", "bachche ke janm ke baad", "pregnancy ke baad", "baby hone ke baad", "c section ke baad",
      "प्रसव के बाद", "डिलीवरी के बाद", "बच्चे के जन्म के बाद", "बेबी होने के बाद", "सी सेक्शन के बाद",
    ],
    "Post hip replacement": [
      "hip replacement", "after my hip replacement", "total hip replacement", "thr", "hip replaced", "after hip surgery", "post hip replacement",
      "hip surgery", "since the hip replacement", "had my hip replaced",
      "kulha badalwane ke baad", "hip replacement ke baad", "kulhe ka operation", "kulhe ka operation hua tha", "kulha badalwaya tha",
      "कूल्हा बदलवाने के बाद", "हिप रिप्लेसमेंट के बाद", "कूल्हे का ऑपरेशन", "कूल्हे का ऑपरेशन हुआ था", "कूल्हा बदलवाया था",
    ],
  },

  aggravating: {
    "FADIR combined (flexion-adduction-internal rotation)": [
      "fadir", "pain when i bring my knee to my chest", "pain with hip flexion and rotation", "pain when i bring the knee across the body",
      "pinching in the groin when i bend the hip", "pain on flexing the hip and turning it in", "pain when i pull my knee toward the opposite shoulder",
      "pinch at the front of the hip when i squat", "pain when i bring my knee up and across", "pain bringing the knee across to the other side",
      "ghutna chhati ki taraf laane par dard", "ghutna dusre kandhe ki taraf le jane par dard", "kulha mod kar andar ki taraf ghumane par dard",
      "kulhe ko mod kar ghutna upar laane par dard", "ghutna seene tak laane par dard",
      "घुटना छाती की तरफ लाने पर दर्द", "घुटना दूसरे कंधे की तरफ ले जाने पर दर्द", "कूल्हा मोड़कर अंदर की तरफ घुमाने पर दर्द",
      "कूल्हे को मोड़कर घुटना ऊपर लाने पर दर्द", "घुटना सीने तक लाने पर दर्द",
    ],
    "FABER combined (flexion-abduction-external rotation)": [
      "faber", "pain when i put my ankle on the opposite knee", "figure of four position hurts", "pain in the figure 4 position",
      "pain putting on socks with the foot over the other knee", "pain tying shoelaces with the foot on the knee", "pain crossing my leg with the ankle on the knee",
      "pain with legs apart and out", "foot over the opposite knee hurts", "pain in the figure four",
      "ek pair dusre ghutne par rakhne par dard", "figure of four me dard", "pair ko dusre ghutne par rakh kar baithne par dard", "mozey pehente waqt pair ghutne par rakhne par dard",
      "एक पैर दूसरे घुटने पर रखने पर दर्द", "फिगर ऑफ फोर में दर्द", "पैर को दूसरे घुटने पर रखकर बैठने पर दर्द", "मोजे पहनते समय पैर घुटने पर रखने पर दर्द",
    ],
    "Sitting cross-legged": [
      "sitting cross legged", "cross legged sitting", "sitting on the floor cross legged", "pain when i sit cross legged", "lotus position hurts",
      "sitting in a lotus position", "sitting with crossed legs on the floor", "cannot sit cross legged",
      "paalthi maarkar baithne par dard", "chauki maar ke baithne par dard", "sukhasan me baithne par dard", "zameen par paalthi maar kar baithna mushkil", "padmasan me dard",
      "पालथी मारकर बैठने पर दर्द", "चौकड़ी मारकर बैठने पर दर्द", "सुखासन में बैठने पर दर्द", "जमीन पर पालथी मारकर बैठना मुश्किल", "पद्मासन में दर्द",
    ],
    "Prolonged sitting": [
      "prolonged sitting", "sitting for long", "sitting for a long time", "pain after sitting for hours", "pain from sitting at my desk",
      "desk job pain", "long hours of sitting", "pain on long drives", "pain after sitting for long", "worse with prolonged sitting",
      "der tak baithne se dard", "lambe samay tak baithne par dard", "ghanton baithne se dard", "desk par baithne se dard", "lambi drive me dard",
      "देर तक बैठने से दर्द", "लंबे समय तक बैठने पर दर्द", "घंटों बैठने से दर्द", "डेस्क पर बैठने से दर्द", "लंबी ड्राइव में दर्द",
    ],
    "Sitting on hard surface": [
      "sitting on hard chairs", "hard surface", "sitting on a hard bench", "sitting on the floor", "cannot sit on a hard seat",
      "sit bones hurt on hard chairs", "pain sitting on a hard surface", "hard seat hurts", "pain on hard seats",
      "kadak jagah par baithne se dard", "kadi kursi par baithne par dard", "sakht seat par baithne se dard", "bench par baithne se dard", "kadak seat par dard",
      "कड़क जगह पर बैठने से दर्द", "कड़ी कुर्सी पर बैठने पर दर्द", "सख्त सीट पर बैठने से दर्द", "बेंच पर बैठने से दर्द", "कड़क सीट पर दर्द",
    ],
    "Lying on affected side": [
      "lying on that side", "lying on the affected side", "sleeping on my side", "cannot lie on the right side", "pain when lying on the hip",
      "side sleeping hurts", "pain when i lie on it", "cannot sleep on that side", "pain lying on my side at night", "hurts to sleep on that hip",
      "us taraf let ne par dard", "karwat lene par dard", "kulhe par let ne se dard", "us side par sone se dard", "us taraf let nahi pata",
      "उस तरफ लेटने पर दर्द", "करवट लेने पर दर्द", "कूल्हे पर लेटने से दर्द", "उस साइड पर सोने से दर्द", "उस तरफ लेट नहीं पाता",
    ],
    "Walking": [
      "~walking", "pain on walking", "pain when i walk", "pain while walking", "walking hurts", "hurts to walk", "limping", "i limp",
      "pain after a short walk", "walking makes it worse",
      "chalne me dard", "chalte waqt dard", "chalna mushkil", "langda kar chalta hoon", "thoda chalte hi dard",
      "चलने में दर्द", "चलते समय दर्द", "चलना मुश्किल", "लंगड़ा कर चलता हूं", "थोड़ा चलते ही दर्द",
    ],
    "Stairs": [
      "~stairs", "climbing stairs", "pain going upstairs", "pain on the stairs", "stairs hurt", "pain going up stairs", "pain going downstairs",
      "pain when i climb the stairs", "stairs make it worse",
      "seedhiyan chadhte waqt dard", "seedhiyon par dard", "seedhiyan chadhna mushkil", "seedhiyan utarte waqt dard", "zeene par dard",
      "सीढ़ियां चढ़ते समय दर्द", "सीढ़ियों पर दर्द", "सीढ़ियां चढ़ना मुश्किल", "सीढ़ियां उतरते समय दर्द", "जीने पर दर्द",
    ],
    "Getting out of a car": [
      "getting out of a car", "getting in and out of the car", "pain stepping out of the car", "pain getting out of the car", "car transfers hurt",
      "pain when i get out of the car", "getting out of my car hurts", "pain getting into a car",
      "car se utarte waqt dard", "gaadi se nikalte waqt dard", "gaadi me baithte aur utarte waqt dard", "car se bahar nikalte waqt dard", "gaadi se utarna mushkil",
      "कार से उतरते समय दर्द", "गाड़ी से निकलते समय दर्द", "गाड़ी में बैठते और उतरते समय दर्द", "कार से बाहर निकलते समय दर्द", "गाड़ी से उतरना मुश्किल",
    ],
  },

  pattern: {
    "Intermittent — activity-related": [
      "intermittent pain", "pain is intermittent", "comes and goes", "on and off", "now and then", "only with activity", "activity related pain",
      "pain only when walking", "pain only when i run", "pain only after exercise", "pain after playing", "pain only when i use it", "pain with activity only",
      "kabhi kabhi dard", "kabhi hota hai kabhi nahi", "sirf kaam karne par dard", "sirf daudne par dard", "kasrat ke baad dard", "khelne ke baad dard",
      "कभी कभी दर्द", "कभी होता है कभी नहीं", "सिर्फ काम करने पर दर्द", "सिर्फ दौड़ने पर दर्द", "कसरत के बाद दर्द", "खेलने के बाद दर्द",
    ],
    "Constant — rarely eases": [
      "constant pain", "pain all the time", "pain is constant", "never goes away", "rarely eases", "doesnt settle", "always there", "pain 24 hours",
      "constant severe pain", "constant dull pain", "there all the time", "pain never settles",
      "hamesha dard", "lagatar dard", "din raat dard", "dard kabhi khatam nahi hota", "dard kam hi hota hai", "pura din dard rehta hai",
      "हमेशा दर्द", "लगातार दर्द", "दिन रात दर्द", "दर्द कभी खत्म नहीं होता", "दर्द कम ही होता है", "पूरा दिन दर्द रहता है",
    ],
    "Night pain": [
      "night pain", "pain at night", "worse at night", "wakes me at night", "pain wakes me up", "pain wakes me at night", "cannot sleep because of pain",
      "pain disturbs my sleep", "pain keeps me awake", "hip pain at night",
      "raat ko dard", "raat ko zyada dard", "raat me dard badh", "raat ko neend nahi aati dard se", "raat ko dard se neend khul jati hai", "dard se aankh khul jati hai", "dard se neend toot jati hai",
      "रात को दर्द", "रात को ज्यादा दर्द", "रात में दर्द बढ़", "रात को नींद नहीं आती दर्द से", "रात को दर्द से नींद खुल जाती है", "दर्द से आंख खुल जाती है", "दर्द से नींद टूट जाती है",
    ],
    "Morning stiffness": [
      "morning stiffness", "stiff in the morning", "stiffness on waking", "stiff for the first 30 minutes", "stiff first thing in the morning",
      "hip is stiff when i get up", "stiff after waking", "stiff for the first half hour",
      "subah akdan", "subah kulha akad jata hai", "subah uthte hi jakdan", "subah uthne par kulha jam jata hai", "subah kulhe me jakdan",
      "सुबह अकड़न", "सुबह कूल्हा अकड़ जाता है", "सुबह उठते ही जकड़न", "सुबह उठने पर कूल्हा जाम हो जाता है", "सुबह कूल्हे में जकड़न",
    ],
    "Improves through the day": [
      "improves through the day", "better as the day goes on", "better as the day goes by", "gets better during the day", "loosens up", "loosens up during the day",
      "improves with moving", "eases through the day", "warms up", "improves as the day goes on", "improves during the day", "gets easier as the day goes on", "better once i get moving", "improves once i warm up",
      "din me theek ho jata hai", "din chadhte theek", "chalne phirne se aaram", "hilne dulne se aaram", "din bhar me aaram aa jata hai",
      "दिन में ठीक हो जाता है", "दिन चढ़ने पर आराम", "चलने फिरने से आराम", "हिलने डुलने से आराम", "दिन भर में आराम आ जाता है",
    ],
    "Worse through the day": [
      "worse through the day", "worse as the day goes on", "gets worse by evening", "pain builds up through the day", "worse at the end of the day",
      "evening pain", "worse in the evening", "worse towards the evening", "gets worse as the day goes by", "builds up during the day",
      "din ke saath dard badhta hai", "shaam ko zyada dard", "dopahar ke baad zyada dard", "din bhar dard badhta jata hai", "shaam tak dard badh jata hai",
      "दिन के साथ दर्द बढ़ता है", "शाम को ज्यादा दर्द", "दोपहर के बाद ज्यादा दर्द", "दिन भर दर्द बढ़ता जाता है", "शाम तक दर्द बढ़ जाता है",
    ],
  },

  mechanical: {
    "None": [
      "no clicking or locking", "no mechanical symptoms", "no clicking catching or locking", "none of the mechanical symptoms", "no clicks no catching",
      "no clicking", "no catching or giving way", "no snapping or clicking", "doesnt click or lock", "does not click or lock", "doesnt click lock or catch", "does not click lock or catch", "never clicks or locks",
      "koi click ya lock nahi", "koi awaaz ya atakna nahi", "koi mechanical problem nahi", "na click hota hai na lock",
      "कोई क्लिक या लॉक नहीं", "कोई आवाज या अटकना नहीं", "कोई मैकेनिकल समस्या नहीं", "न क्लिक होता है न लॉक",
    ],
    "Clicking — painless": [
      "painless click", "clicks and doesnt hurt", "clicking without pain", "clicks with no pain", "painless clicking", "it clicks and it doesnt hurt",
      "click that doesnt hurt", "harmless click",
      "click hota hai par dard nahi", "bina dard ke click", "click ki awaaz aati hai par dard nahi hota", "kulhe me click bina dard ke",
      "क्लिक होता है पर दर्द नहीं", "बिना दर्द के क्लिक", "क्लिक की आवाज आती है पर दर्द नहीं होता", "कूल्हे में क्लिक बिना दर्द के",
    ],
    "Clicking — with pain": [
      "painful click", "clicks and hurts", "clicking with pain", "clicking that hurts", "it clicks and it hurts", "painful clicking",
      "click with a sharp pain", "clicks and then pain",
      "click ke saath dard", "click hota hai aur dard hota hai", "dard ke saath click", "click karta hai to dard hota hai",
      "क्लिक के साथ दर्द", "क्लिक होता है और दर्द होता है", "दर्द के साथ क्लिक", "क्लिक करता है तो दर्द होता है",
    ],
    "Catching sensation": [
      "catching", "catches", "catching feeling in the hip", "feels like it catches", "hip catches", "catching sensation", "a catching feeling",
      "something catches in the hip", "sharp catch in the groin",
      "kulha atak jata hai", "kulhe me atakne ka ehsaas", "kuch phans jata hai kulhe me", "kulhe me phansne jaisa lagta hai",
      "कूल्हा अटक जाता है", "कूल्हे में अटकने का एहसास", "कुछ फंस जाता है कूल्हे में", "कूल्हे में फंसने जैसा लगता है",
    ],
    "Giving way": [
      "hip gives way", "hip buckles", "leg gives way", "hip feels unstable", "hip collapses", "my hip gave way", "leg buckles under me",
      "hip gives out", "hip feels like it will give way",
      "kulha jawab de deta hai", "kulha achanak jawab de deta hai", "pair mud jata hai achanak", "pair mod jata hai", "pair mod jata hai achanak", "kulha kamzor pad jata hai", "kulhe ne dhokha diya",
      "कूल्हा जवाब दे देता है", "कूल्हा अचानक जवाब दे देता है", "पैर अचानक मुड़ जाता है", "पैर मुड़ जाता है अचानक", "पैर मुड़ जाता है", "कूल्हा कमजोर पड़ जाता है", "कूल्हे ने धोखा दिया",
    ],
    "Locking — intermittent": [
      "hip locks", "hip locking", "locks up", "hip gets stuck", "hip locks up", "locking in the hip", "the hip locks and then releases",
      "hip locked for a moment", "hip gets locked",
      "kulha lock ho jata hai", "kulha atak jata hai kuch der ke liye", "kulha jam ho jata hai", "kulha lock ho gaya",
      "कूल्हा लॉक हो जाता है", "कूल्हा कुछ देर के लिए अटक जाता है", "कूल्हा जाम हो जाता है", "कूल्हा लॉक हो गया",
    ],
    "Internal snapping (anterior, iliopsoas)": [
      "snapping at the front of the hip", "snapping hip front", "iliopsoas snapping", "snap in the groin when i lift my leg",
      "clunk at the front of the hip when standing from sitting", "internal snapping", "snapping in the groin", "front of the hip snaps",
      "snapping hip at the front",
      "kulhe ke aage atakne ki awaaz", "groin me tak ki awaaz", "kulhe ke aage snapping", "pair uthate waqt groin me awaaz",
      "कूल्हे के आगे अटकने की आवाज", "ग्रोइन में टक की आवाज", "कूल्हे के आगे स्नैपिंग", "पैर उठाते समय ग्रोइन में आवाज",
    ],
    "External snapping (lateral, IT band)": [
      "snapping on the outside of the hip", "it band snapping", "snap on the outer hip when i walk", "lateral snapping", "outer hip pops",
      "external snapping", "snapping on the side of the hip", "side of the hip snaps", "it band snaps over the hip",
      "kulhe ke bahar ki taraf tak ki awaaz", "chalte waqt kulhe ke bahar awaaz", "kulhe ke side me snapping", "kulhe ke bahar pop ki awaaz",
      "कूल्हे के बाहर की तरफ टक की आवाज", "चलते समय कूल्हे के बाहर आवाज", "कूल्हे के साइड में स्नैपिंग", "कूल्हे के बाहर पॉप की आवाज",
    ],
    "Crepitus / grinding": [
      "grinding", "crepitus", "grinding feeling in the hip", "grating", "crunching in the hip", "grinding sensation", "hip grinds",
      "grating sound in the hip", "crunchy hip",
      "kulhe me kar kar awaaz", "ghisne ki awaaz", "kulhe me ragadne jaisa lagta hai", "kulhe me kirkiri ki awaaz",
      "कूल्हे में कर कर आवाज", "घिसने की आवाज", "कूल्हे में रगड़ने जैसा लगता है", "कूल्हे में किरकिरी की आवाज",
    ],
  },

  redFlags: {
    "Suspected fracture / cannot weight bear (elderly + fall)": [
      "cannot walk after the fall", "unable to bear weight after a fall", "fell and cannot stand", "elderly fall cant walk", "cannot weight bear after the fall",
      "fell and unable to get up", "unable to stand after falling", "cant put weight on the leg after the fall",
      "gir kar chal nahi pa raha", "gir ke baad pair par bhaar nahi daal pa raha", "gir gaya aur uth nahi pa raha", "girne ke baad khada nahi ho pa raha",
      "गिर कर चल नहीं पा रहा", "गिरने के बाद पैर पर भार नहीं डाल पा रहा", "गिर गया और उठ नहीं पा रहा", "गिरने के बाद खड़ा नहीं हो पा रहा",
    ],
    "Suspected fracture neck of femur": [
      "fracture neck of femur", "hip fracture", "broken hip", "nof fracture", "femur neck fracture", "leg looks shortened and turned outwards after a fall",
      "leg shortened and rotated", "suspected hip fracture", "fractured neck of femur", "think the hip is broken",
      "kulhe ki haddi toot", "hip fracture lag raha hai", "kulha toot gaya", "pair chhota aur bahar ki taraf mud gaya",
      "कूल्हे की हड्डी टूट", "हिप फ्रैक्चर लग रहा है", "कूल्हा टूट गया", "पैर छोटा और बाहर की तरफ मुड़ गया",
    ],
    "Acute hot swollen hip joint": [
      "hot swollen hip", "hip joint hot and swollen", "red hot hip with fever", "septic arthritis hip", "acute hot hip", "hip is hot and swollen",
      "hot red swollen hip joint", "hip feels hot and looks swollen", "fever and a hot painful hip",
      "kulha garam aur sujan", "kulha garam hai sujan hai bukhar bhi", "kulhe me garmi aur sujan", "kulha laal garam aur sujan",
      "कूल्हा गरम और सूजन", "कूल्हा गरम है सूजन है बुखार भी", "कूल्हे में गर्मी और सूजन", "कूल्हा लाल गरम और सूजन",
    ],
    "Avascular necrosis risk (steroid use, sickle cell, alcohol excess)": [
      "on steroids long term", "taking steroids for years", "steroid use", "sickle cell", "alcohol excess", "heavy drinker", "drinks a lot", "i drink heavily", "drink heavily every day", "drinking heavily", "heavy drinking", "drink a lot of alcohol", "drinks every day", "daily alcohol",
      "history of steroids", "avascular necrosis", "avn risk", "many steroid injections", "long term steroid tablets", "drinks heavily every day",
      "steroid ki dawai", "steroid khata hai", "sharab ka zyada sevan", "bahut sharab peeta hai", "sickle cell hai", "lambe samay se steroid",
      "स्टेरॉयड की दवा", "स्टेरॉयड खाता है", "शराब का ज्यादा सेवन", "बहुत शराब पीता है", "सिकल सेल है", "लंबे समय से स्टेरॉयड",
    ],
    "Constant progressive pain unrelated to loading": [
      "constant progressive pain", "pain keeps getting worse regardless of movement", "pain that does not change with loading", "constant pain whatever i do",
      "pain getting worse every day no matter what", "unrelenting pain", "nothing changes the pain", "pain is not related to movement",
      "same whether i move or not", "not affected by movement", "unaffected by movement", "regardless of movement",
      "dard lagatar badh raha hai chahe kuch bhi karun", "dard har roz badh raha hai", "hilne se dard ka koi lena dena nahi", "dard badhta hi ja raha hai",
      "दर्द लगातार बढ़ रहा है चाहे कुछ भी करूं", "दर्द हर रोज बढ़ रहा है", "हिलने से दर्द का कोई लेना देना नहीं", "दर्द बढ़ता ही जा रहा है",
    ],
    "Referred pain from abdomen / pelvis": [
      "pain from the abdomen", "pain with abdominal pain", "lower abdominal pain along with hip pain", "pelvic pain with hip pain",
      "pain moving from the stomach to the groin", "abdominal pain and hip pain together", "pain from the pelvis",
      "pet me dard ke saath kulhe me dard", "pet ke neeche dard ke saath kulhe me dard", "pet se jaangh tak dard", "pelvic dard ke saath kulhe me dard",
      "पेट में दर्द के साथ कूल्हे में दर्द", "पेट के नीचे दर्द के साथ कूल्हे में दर्द", "पेट से जांघ तक दर्द", "पेल्विक दर्द के साथ कूल्हे में दर्द",
    ],
    "Gynaecological referral suspected": [
      "gynae problem", "period pain with hip pain", "ovarian cyst", "endometriosis", "fibroids", "pcod", "menstrual pain referring to the hip",
      "pain with periods", "white discharge", "uterus problem", "gynaecological problem", "pain gets worse with my periods",
      "mahavari ke dauran dard", "masik dharm me dard", "bachchedani ki problem", "periods ke time kulhe me dard", "safed paani ki problem",
      "माहवारी के दौरान दर्द", "मासिक धर्म में दर्द", "बच्चेदानी की समस्या", "पीरियड्स के समय कूल्हे में दर्द", "सफेद पानी की समस्या",
    ],
    "Testicular referral suspected": [
      "testicular pain with groin pain", "pain in the testicle", "swelling in the scrotum", "groin pain with testicle pain", "testis pain",
      "scrotal swelling", "pain in the testicles and groin", "lump in the testicle",
      "andkosh me dard", "andkosh me sujan", "groin ke saath andkosh me dard", "testicle me dard",
      "अंडकोष में दर्द", "अंडकोष में सूजन", "ग्रोइन के साथ अंडकोष में दर्द", "टेस्टिकल में दर्द",
    ],
    "Cancer history": [
      "~cancer", "~cancer history", "history of cancer", "had cancer", "cancer in the past", "cancer survivor", "prostate cancer history",
      "treated for cancer", "diagnosed with cancer", "previous cancer",
      "~kainsar", "cancer ka history", "kabhi cancer hua tha", "cancer tha", "cancer ka ilaaj hua tha", "pehle cancer hua tha",
      "~कैंसर", "कैंसर का इतिहास", "कभी कैंसर हुआ था", "कैंसर था", "कैंसर का इलाज हुआ था", "पहले कैंसर हुआ था",
    ],
    "None of the above": [
      "no red flags", "no red flag", "no warning signs", "none of the above", "nothing worrying",
      "koi red flag nahi", "koi khatre ki baat nahi",
      "कोई रेड फ्लैग नहीं", "कोई खतरे की बात नहीं",
    ],
  },
};

// Added from the clinician-voice "everyday words" sheet (PhysioMind-Hip-Everyday-Words-DRAFT.pdf): what a clinician types ABOUT the
// patient ("the patient", "they"), in English, Hinglish and Hindi. See hipSheetSet.test.js.
const SHEET_PHRASES = {
  location: {
    "Anterior groin": ["जांघ के जोड़ में गहरा दर्द", "ग्रोइन में गहरा दर्द"],
    "Ischial tuberosity": ["baithne ki haddi", "baithne ki haddi par dard", "बैठने की हड्डी", "बैठने की हड्डी पर दर्द", "बैठने की हड्डी पर गहरा दर्द"],
  },
  mechanism: {
    "Insidious onset / overuse": [
      "no real injury", "no single event", "crept up slowly", "crept up", "crept up over the years", "built up slowly", "slowly over months", "slowly over months or years",
      "repetitive hip flexion", "repetitive hip flexion and rotation", "repetitive hip movements", "increased weekly mileage", "increased mileage", "mileage increase",
      "sudden increase in running", "sudden increase in training", "too much too soon", "overload",
      "koi chot nahi", "dheere dheere koi chot nahi", "mahino ya saalon mein dheere dheere", "saalon mein dheere dheere", "mahino mein dheere dheere",
      "कोई चोट नहीं", "धीरे धीरे कोई चोट नहीं", "महीनों या सालों में धीरे धीरे", "सालों में धीरे धीरे", "महीनों में धीरे धीरे",
    ],
    "Age-related degenerative": ["ghisaav", "ghisav", "घिसाव"],
    "Twisting / pivoting mechanism": ["after a twist", "after twisting", "bad twist", "twist on the hip", "after a twist on the hip"],
    "Kicking mechanism": ["laat maarna", "laat maarne", "लात मारना", "लात मारने"],
    "Return to sport after time off": ["started running again", "started playing again", "started exercising again", "began running again"],
  },
  mechanical: {
    "Catching sensation": ["click or catch", "clicks or catches", "clicking or catching", "clicking catching", "click ya atak", "क्लिक या अटकना", "क्लिक या अटक"],
    "Internal snapping (anterior, iliopsoas)": ["kulhe ke aage chatakne ki awaaz", "कूल्हे के आगे चटकने की आवाज़", "कूल्हे के आगे चटकने की आवाज"],
    "External snapping (lateral, IT band)": ["kulhe ke bahar chatakne ki awaaz", "कूल्हे के बाहर चटकने की आवाज़", "कूल्हे के बाहर चटकने की आवाज"],
  },
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const HIP_PHRASES = mergePhrases(HIP_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W } = WORDS;
// Words that say a sentence is about this region / about another one.
const OWN_W = "hip* groin buttock* glute* gluteal thigh* pelvis pelvic trochanter* trochanteric adductor* si_joint sacroiliac ischial tailbone sit_bone pubic pubis symphysis kulh* कूल्ह* कूल्हा jaangh* जांघ nitamb नितंब chutad चूतड़ leg legs";
const FOREIGN_W = "shoulder* elbow* wrist* hand hands neck_pain neck_stiffness neck_stiff neck_aches neck_ache neck_hurts knee* ankle* toe* headache jaw tooth teeth eye* ear throat chest kandha kohni kalai gardan ghutn* ghutna कंधा कोहनी कलाई गर्दन घुटन* घुटना सिर टखना";
const FAMILY_W = WORDS.FAMILY;

const matcher = createPhraseMatcher({
  phrases: HIP_PHRASES,
  singleChoiceFields: ["locationPattern", "pattern"],
  noneOptions: { mechanical: "None", redFlags: "None of the above" },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  optionGuards: {
    "redFlags|Cancer history": FAMILY_W,
    // a relative's operation is not the patient's
    "mechanism|Post hip replacement": FAMILY_W,
    // "now and then it clicks or catches" describes the clicking, not how the pain behaves
    "pattern|Intermittent — activity-related": "click clicks clicking catch catches catching snap snaps snapping lock locks locking",
    // "subah kulha jam jata hai" is morning stiffness, not a locking hip
    "mechanical|Locking — intermittent": "subah सुबह morning mornings uthte उठते akdan अकड़न stiff stiffness jakdan जकड़न",
  },
  // the test positions name a knee, an ankle or the opposite shoulder -- that is not a sentence about another joint
  guardExempt: ["aggravating|FADIR combined (flexion-adduction-internal rotation)", "aggravating|FABER combined (flexion-abduction-external rotation)"],
  hinglish: [
    [/\b(kulha|kulhe|kulho|kulhon|kuulha|kulah|kulle)\b/g, "kulha"],
    [/\b(jaangh|jangh|jaanghe|jaanghon|janghon|jaanghein)\b/g, "jaangh"],
    [/\b(chutad|chutar|chutadd|chootad|chutadon)\b/g, "chutad"],
    [/\b(nitamb|nitambon)\b/g, "nitamb"],
    [/\b(seedhiyan|seedhiyon|sidhiyan|sidhiyon|seedhiya|sidhiya|seedhiye|zeena|zeene|jeena|jeene)\b/g, "seedhiyan"],
    [/\b(chalne|chalna|chalte|chalta|chalti)\b/g, "chalna"],
    [/\b(baithne|baithna|baithte|baithta|baithti|baithkar)\b/g, "baithna"],
    [/\b(paalthi|palthi|paltthi|chauki|chaukdi|chokdi|sukhasan|padmasan)\b/g, "paalthi"],
    [/\b(let ne|letne|letna|lete|lette|leta|leti|letti|letkar)\b/g, "letna"],
    [/\b(karwat|karvat|karwaat)\b/g, "karwat"],
    [/\b(sone|sona|sote|sota|soti|soya|soye)\b/g, "sona"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche)\b/g, "niche"],
    [/\b(peeche|piche|pichhe|peechhe|pichche|pichle|pichla)\b/g, "peeche"],
    [/\b(raat|raath|rat)\b/g, "raat"],
    [/\b(shaam|sham|shaamko)\b/g, "shaam"],
    [/\b(dopahar|dopaher|dophar)\b/g, "dopahar"],
    [/\b(achanak|acchanak)\b/g, "achanak"],
    [/\b(jawab|jawaab|javab|jawap)\b/g, "jawab"],
    [/\b(mud|mudd)\b/g, "mod"],
    [/\b(atak|atakna|atakne|atakta|atakti|atka|atki|atke|atakkar)\b/g, "atak"],
    [/\b(gaanth|ganth|gaath|gant)\b/g, "gaanth"],
    [/\b(paer|pair|pao|pav)\b/g, "pair"],
    [/\b(sharab|sharaab|daru)\b/g, "sharab"],
    [/\b(mahavari|mahawari|masik)\b/g, "mahavari"],
    [/\b(andkosh|andkosha|andakosh)\b/g, "andkosh"],
  ],
  deva: [
    [/कूल्ह(ा|े|ों|ो)?/g, "कूल्हा"],
    [/जांघ(ों|ें|े)?/g, "जांघ"],
    [/नितंब(ों)?/g, "नितंब"],
    [/सीढ(ी|ि)(यों|यां|या)?/g, "सीढी"],
    [/पालथी|चौकड़ी|चौकडी|सुखासन|पद्मासन/g, "पालथी"],
    [/जवाब/g, "जवाब"],
  ],
  rules: ({ rule, O }) => {
    const HIPW = "hip* kulha कूल्हा";
    // location
    const [GROIN, FLEXOR, LATERAL, POST, ISCH, ADD, PUBIC, SIJ] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => O("location", i));
    rule("location", GROIN, ["groin jaangh_ke_jod", PAIN_W], 6);
    rule("location", GROIN, ["groin"], 1, { ctx: "pain" });
    rule("location", GROIN, ["जांघ_के_जोड़", PAIN_W], 6);
    rule("location", FLEXOR, ["front anterior samne सामने aage आगे", HIPW], 4);
    rule("location", LATERAL, ["outer outside lateral side bahar bahari बाहर बाहरी bagal बगल", HIPW], 4, { unless: "front back" });
    rule("location", POST, ["back behind posterior peeche पीछे", HIPW], 4, { unless: "front bend* bending", block: "and aur or ya" });
    rule("location", POST, ["buttock buttocks glute glutes gluteal bum chutad चूतड़ nitamb नितंब", PAIN_W], 5);
    rule("location", POST, ["buttock buttocks glute glutes gluteal chutad चूतड़ nitamb नितंब", "gehra गहरा deep"], 9, { ctx: "pain" });
    rule("location", ISCH, ["sit_bone sitting_bone ischial", PAIN_W], 5);
    rule("location", ADD, ["inner inside adductor andruni अंदरूनी andar अंदर", "thigh jaangh जांघ"], 4);
    rule("location", PUBIC, ["pubic pubis symphysis", PAIN_W], 5);
    rule("location", SIJ, ["si_joint sij sacroiliac", PAIN_W], 5);
    // dominant pattern (single choice): "mainly/mostly/worst" + the place
    const DOM = "mainly mostly primarily worst dominant zyada_tar zyada sabse mukhya ज्यादातर सबसे मुख्य";
    const [DGROIN, DLAT, DPOST, DADD, DDIFF] = [0, 1, 2, 3, 4].map((i) => O("locationPattern", i));
    rule("locationPattern", DGROIN, [DOM, "groin jaangh_ke_jod ग्रोइन"], 6);
    rule("locationPattern", DLAT, [DOM, "outer outside lateral side bahar बाहर bagal बगल", "hip* kulha कूल्हा"], 8);
    rule("locationPattern", DPOST, [DOM, "buttock buttocks glute glutes gluteal posterior chutad चूतड़ nitamb नितंब peeche पीछे"], 6);
    rule("locationPattern", DADD, [DOM, "adductor inner_thigh andruni अंदरूनी", "thigh jaangh जांघ"], 7);
    rule("locationPattern", DDIFF, ["all everywhere diffuse mixed poore पूरे har हर kai कई", "hip* kulha कूल्हा around aaspaas आसपास"], 5);
    // mechanism
    const M = (i) => O("mechanism", i);
    const [INSID, AGE, TWIST, FALL, KICK, LUNGE, FAST, RETURN, POSTPARTUM, THR] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(M);
    rule("mechanism", TWIST, ["turned turn", "sharply quickly suddenly awkwardly abruptly"], 2, { ctx: "painOrArm" });
    rule("mechanism", TWIST, ["twisted twisting pivoted pivot* moch मोच mud_gaya mud_gayi mud_gaye मुड़_गया मुड़_गई घूम_गया", HIPW + " leg"], 5);
    rule("mechanism", TWIST, ["after following", "twist twisting"], 3);
    rule("mechanism", TWIST, ["bad sudden sharp awkward violent forceful", "twist twisting"], 3);
    rule("mechanism", FALL, ["fell fall fallen slipped slipping tripped tripping phisal फिसल"], 1, { ctx: "painOrArm", unless: "asleep sleep ill sick love apart nearly almost" });
    rule("mechanism", FALL, ["gir गिर"], 1, { unless: "nearly almost" });
    rule("mechanism", KICK, ["kick* laat लात kick किक"], 1, { ctx: "painOrArm", unless: "kickstart" });
    rule("mechanism", LUNGE, ["lunge lunges lunging lunged लंज"], 1, { ctx: "painOrArm" });
    rule("mechanism", FAST, ["sprint* hockey rugby tez तेज ek_dum एक_दम", "run* running daud* दौड़* bhaag* भाग* play* khel* खेल* sprint*"], 4, { ctx: "painOrArm" });
    rule("mechanism", RETURN, ["first", "months years", "run running 10k 5k marathon game match session training workout gym"], 8, { ctx: "painOrArm" });
    rule("mechanism", RETURN, ["back_to returned returning restarted resumed", "break gap layoff time_off lockdown months"], 8);
    rule("mechanism", RETURN, ["return* resum* restart* started_again dobara दोबारा phir_se", "sport gym training running playing khel* खेल* gym जिम"], 6);
    rule("mechanism", POSTPARTUM, ["delivery childbirth birth baby bachche बच्चे prasav प्रसव डिलीवरी c_section", "after post since following baad बाद"], 5, { ctx: "painOrArm" });
    rule("mechanism", THR, ["replace* replacement thr", HIPW + " joint"], 5, { unless: "fell fall tripped" });
    rule("mechanism", THR, ["operation surgery ऑपरेशन सर्जरी operated", HIPW], 5, { unless: "scheduled planned upcoming next" });
    // aggravating
    const AGG_W = PAIN_W + " worse worsens worsen worst aggravate* badhta badhti badhte बढ़ता बढ़ती बढ़ते";
    const STIFF_W = AGG_W + " stiff stiffness akad* अकड़* jakad* जकड़* tight";
    const A = { reliefKills: true, reliefAfter: true, block: "weak* kamzor कमजोर all_day every_day daily din_bhar roz रोज" };
    const G = (i) => O("aggravating", i);
    const [FADIR, FABER, CROSS, PSIT, HARD, LYING, WALK, STAIRS, CAR] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(G);
    rule("aggravating", FADIR, [PAIN_W, "knee ghutna घुटना", "chest chhati छाती opposite_shoulder dusre_kandhe across_the_body across_body"], 12, A);
    rule("aggravating", FADIR, ["pinch* pinching impingement", "bend* flex* squat* squatting sitting"], 10, { ctx: "pain" });
    rule("aggravating", FABER, [PAIN_W, "ankle pair foot", "opposite_knee other_knee dusre_ghutne figure_of_four figure_four figure_4"], 9, A);
    rule("aggravating", FABER, ["figure_of_four figure_four figure_4 faber", PAIN_W], 8, A);
    rule("aggravating", CROSS, [PAIN_W, "cross_legged cross_legs crossed_legs legs_crossed paalthi पालथी lotus"], 12, A);
    rule("aggravating", CROSS, ["cannot cant unable mushkil मुश्किल difficult difficulty", "cross_legged cross_legs legs_crossed paalthi पालथी"], 8, { selfNeg: true });
    rule("aggravating", PSIT, [PAIN_W, "sitting sit baithna बैठ* desk drive driving drives", "long hours hours prolonged der देर lamba lambe लंबे ghanton घंटों for_long"], 9, A);
    rule("aggravating", PSIT, ["sits sitting sit baithna baithta बैठ*", "long prolonged hours der देर ghanton घंटों lamba lambi lambe लंबे"], 3, { ctx: "pain", reliefKills: true });
    rule("aggravating", PSIT, [STIFF_W, "sitting sit baithna बैठ*", "long prolonged hours flight der देर ghanton घंटों lamba lambi lambe लंबे"], 9, A);
    rule("aggravating", HARD, [AGG_W, "sitting sit baithna बैठ*", "hard sakht सख्त kadak कड़क kadi कड़ी bench floor"], 10, A);
    rule("aggravating", LYING, [PAIN_W, "sleep* lie lying lay letna लेट* sona सोन* karwat करवट turn_over rolling_over roll_onto rolls_onto rolling_onto roll_over", "side taraf तरफ on_hip on_that_hip on_that_side affected haddi_pe haddi_par kulha_pe kulha_par"], 10, A);
    rule("aggravating", LYING, ["wakes_them woke_them wake_them wakes_him wakes_her waking_them", "roll_over rolls_over rolling_over turn_over turning_over roll_onto"], 7, { block: "better" });
    rule("aggravating", LYING, ["cannot cant unable", "sleep* lie lying lay letna लेट* sona सोन*", "side taraf तरफ on_hip on_that_hip affected"], 7, { block: "better" });
    rule("aggravating", WALK, [AGG_W, "walk* chalna चलना चलने चलते चलता चलती limp* langda लंगड़*"], 6, A);
    rule("aggravating", STAIRS, [AGG_W, "stairs staircase steps upstairs downstairs seedhiyan सीढी zeena जीना"], 11, A);
    rule("aggravating", CAR, ["get_out getting_out gets_out get_out_of getting_out_of", "car gaadi गाड़ी कार taxi auto"], 6, { ctx: "painOrArm", reliefKills: true, reliefAfter: true });
    rule("aggravating", HARD, ["hard sakht सख्त kadak कड़क bench floor", "seat seats chair chairs surface surfaces sitting sit baithna बैठ* jagah जगह"], 4, { ctx: "painOrArm", reliefKills: true });
    rule("aggravating", CAR, [AGG_W, "car gaadi गाड़ी कार taxi auto", "out_of get_out getting_out utarte उतरते nikalte निकलते exit* stepping_out bahar बाहर"], 9, A);
    // pattern (own answers)
    const P = (i) => O("pattern", i);
    const [INTER, CONST, NIGHT, MORN, IMPR, WORSE] = [0, 1, 2, 3, 4, 5].map(P);
    rule("pattern", INTER, [PAIN_W, "sometimes occasionally some_days on_and_off comes_and_goes now_and_then kabhi_kabhi कभी_कभी at_times intermittent"], 6);
    rule("pattern", INTER, ["only sirf सिर्फ", "use* using walk* run* running activity exercise play* playing match matches game games practice training football cricket kaam काम daud* दौड़* khel* खेल* time", PAIN_W], 8, { block: "night raat रात" });
    rule("pattern", CONST, [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops never_stop nonstop non_stop din_bhar pura_din poora_din पूरा_दिन har_waqt lagatar लगातार din_raat दिन_रात rarely_eases"], 8,
      { selfNeg: true, noComma: true, block: "after when while during from if only jab जब" });
    rule("pattern", CONST, ["never", "away stops ends eases go goes", PAIN_W], 6, { selfNeg: true });
    rule("pattern", NIGHT, ["night raat रात", "worse worst more zyada ज्यादा badh बढ़ bad"], 7, { ctx: "pain", reliefKills: true });
    rule("pattern", NIGHT, ["wakes_me woke_me waking_me wake_me jag jaag जाग* disturb* neend नींद sleep", PAIN_W], 8, { reliefKills: true, noComma: true, unless: "morning mornings subah सुबह first_thing out_of_bed get_up" });
    rule("pattern", NIGHT, ["night raat रात", PAIN_W], 5, { reliefKills: true, noComma: true });
    rule("pattern", NIGHT, ["wakes_me woke_me waking_me wake_me", "every_night nightly each_night"], 4);
    rule("pattern", MORN, ["morning mornings subah सुबह uthte uthne wake* waking", "stiff* akdan akad* अकड* jakad* jakdan जकड़* jam jaam जाम"], 7, { reliefKills: true, noComma: true });
    rule("pattern", MORN, ["morning subah सुबह wake* uthte uthne", "worse worst most mostly first pehle पहले zyada ज्यादा"], 6, { ctx: "pain", reliefKills: true, unless: "evening shaam शाम" });
    rule("pattern", IMPR, ["better improves improve* eases settles aaram आराम राहत kam कम loosen* warm*", "day din दिन moving move* movement activity hours hilna chalna walk* walking around चलने हिलने"], 6, { ctx: "painOrArm", unless: "worse worsens evening shaam शाम" });
    rule("pattern", WORSE, ["worse worsens worst builds_up zyada ज्यादा badhta badh बढ़ता बढ़", "evening shaam शाम afternoon dopahar दोपहर end_of_the_day through_the_day as_the_day after_day day_on_feet on_feet by_evening din_ke_aakhir aakhir_me दिन_के_आखिर"], 7, { ctx: "pain", reliefKills: true });
    // mechanical symptoms
    const MX = (i) => O("mechanical", i);
    const [MNONE, CLICKOK, CLICKPAIN, CATCH, GIVEWAY, LOCK, INTSNAP, EXTSNAP, CREP] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(MX);
    rule("mechanical", CLICKOK, ["click* clicks clicking क्लिक", "painless no_pain without_pain bina_dard बिना_दर्द doesnt_hurt harmless"], 8, { selfNeg: true });
    rule("mechanical", CLICKPAIN, ["click* clicks clicking क्लिक", "hurts painful pain dard दर्द sharp"], 5, { block: "no without painless nahi नहीं bina बिना", blockAfter: "bina बिना nahi नहीं" });
    rule("mechanical", CATCH, ["catch catches catching atak"], 1, { ctx: "painOrArm" });
    rule("mechanical", CATCH, ["click clicks clicking क्लिक", "catch catches catching atak अटक*"], 4);
    rule("mechanical", GIVEWAY, ["give* gave giving buckle* buckles buckling collapse* collapsing jawab जवाब dhokha धोखा", HIPW + " leg"], 5);
    rule("mechanical", LOCK, ["lock locks locked locking jam लॉक जाम", HIPW], 5, { unless: "no not never nahi नहीं subah सुबह morning mornings uthte उठते akdan अकड़न stiff stiffness" });
    rule("mechanical", INTSNAP, ["snap* clunk* tak_ki_awaaz chatak* चटक*", "front anterior groin iliopsoas aage आगे samne सामने"], 6);
    rule("mechanical", EXTSNAP, ["snap* pop* pops clunk* chatak* चटक*", "outer outside lateral side it_band trochanter* trochanteric greater_trochanter bahar बाहर bagal बगल"], 6);
    rule("mechanical", CREP, ["grind* grinding grate* grating crepitus crunch* crunchy ragad* रगड़* kirkiri किरकिरी ghisne ghisti ghista घिसने घिसती घिसता"], 1, { ctx: "painOrArm" });
    rule("mechanical", CREP, ["grinding crunching grating crunchy kar_kar कर_कर kirkiri किरकिरी", "sound noise feeling sensation awaaz आवाज"], 5);
    // red flags
    const R = (i) => O("redFlags", i);
    const [FRACW, NOF, HOTHIP, AVN, PROGR, ABDO, GYNAE, TESTIC, CANCER] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(R);
    rule("redFlags", FRACW, ["cant cannot unable couldnt nahi नहीं", "walk* stand* weight bhaar भार get_up uth* उठ* chal* चल* खड़* khada khade khadi", "fall fell fallen gir गिर slipped slipping tripped tripping landed"], 14, { selfNeg: true });
    rule("redFlags", NOF, ["fracture fractured broken toot टूट", "hip* kulha कूल्हा femur neck_of_femur nof haddi हड्डी"], 5);
    rule("redFlags", NOF, ["shortened shorter short chhota छोटा", "rotated turned_out turned_outwards points_outward points_outwards pointing_outward points_out outward outwards bahar_ki_taraf mud मुड़", "leg foot pair पैर"], 8);
    rule("redFlags", HOTHIP, ["hot warm garam गर्म* गरम*", "swollen swelling sujan सूजन", "hip* kulha कूल्हा joint"], 8);
    rule("redFlags", HOTHIP, ["fever bukhar बुखार", "hot warm garam गर्म* गरम*", "hip* kulha कूल्हा"], 8);
    rule("redFlags", AVN, ["steroid* स्टेरॉयड sickle सिकल alcohol sharab शराब avascular avn drinker drinks", "long years history excess heavy zyada ज्यादा bahut बहुत lambe लंबे regular daily roz रोज"], 8);
    rule("redFlags", AVN, ["avascular avn sickle सिकल steroid_injections"], 2);
    rule("redFlags", PROGR, ["getting_worse worse worsening badh बढ़", "every_day each_day daily roz रोज har_roz हर_रोज", "whatever no_matter regardless chahe चाहे nothing_helps nothing_works nothing_eases nothing_relieves"], 9, { block: "when while if after only", selfNeg: true });
    rule("redFlags", PROGR, ["getting_worse worse worsening", "despite even_with regardless", "rest painkillers medication physio treatment"], 8);
    rule("redFlags", PROGR, ["unrelenting relentless unremitting"], 1, { ctx: "pain" });
    rule("redFlags", PROGR, ["constant* continuous* unrelenting relentless lagatar लगातार", "progressive* worsening increasing getting_worse badh बढ़ every_day roz daily", PAIN_W], 9, { block: "when while if after" });
    rule("redFlags", ABDO, ["abdomen abdominal stomach tummy lower_tummy pet पेट belly", PAIN_W, "hip* kulha कूल्हा groin jaangh जांघ"], 10);
    rule("redFlags", GYNAE, ["period periods menstrual menstruation mahavari माहवारी pcod pcos endometriosis fibroid* ovarian uterus uterine gynae gynaecological bachchedani बच्चेदानी", PAIN_W], 8, { block: "long prolonged extended short sitting standing hours" });
    rule("redFlags", GYNAE, ["ovarian pcod pcos endometriosis fibroid* gynae gynaecolog* hysterectomy"], 1);
    rule("redFlags", TESTIC, ["testicle testicles testicular testis scrotum scrotal andkosh अंडकोष", PAIN_W + " swelling swollen lump sujan सूजन"], 6);
    rule("redFlags", CANCER, ["cancer cancers tumor tumour tumors malignan* carcinoma lymphoma leukemia myeloma kainsar कैंसर cancerous", "history had diagnosed treated treatment survivor chemo chemotherapy radiotherapy past previous earlier before tha था hua हुआ ilaaj इलाज"], 6);
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
