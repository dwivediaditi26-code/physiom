// cervicalPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a CERVICAL (neck) complaint in everyday words (English, Hinglish, Hindi in
// Devanagari) and suggests which of the Subjective checklist options it means. No AI, no network, no cost.
// It only SUGGESTS; the student taps to confirm. The matching engine is phraseEngine.js.
//
// Covers 15 Cervical questions: where it hurts, where it spreads, how it started, arm/hand symptoms, Lhermitte's sign,
// movements that aggravate / relieve, 24-hour pattern, headache, the four red-flag screens, fracture indicators and
// limited activities. Not covered: Irritability and "Action taken" (a clinician's judgement, not something a patient says).
// The option strings must match the form exactly (a test checks this).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
// Left / right answers (L) / (R) are built with sided() from phraseSides.js.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { SIDE_HINGLISH, SIDE_DEVA, LEFT_W, RIGHT_W, BOTH_W, sided } from "./phraseSides.js";
import { extendPhrases } from "./phrasePattern.js";

const LAT_NECK = sided([
  "{e} side of the neck", "pain on the {e} side of my neck", "{e} neck pain", "neck pain on the {e}", "{e} sided neck pain", "pain in the {e} side of the neck", "{e} lateral neck",
  "gardan ke {h} taraf dard", "{h} taraf gardan me dard", "gardan me {e} side dard", "{e} side gardan me dard",
  "गर्दन के {d} तरफ दर्द", "{d} तरफ गर्दन में दर्द", "गर्दन में {d} साइड दर्द", "गर्दन के {d} हिस्से में दर्द",
]);
const TRAP = sided([
  "{e} trapezius", "{e} upper trapezius", "{e} trap", "{e} upper trap", "tight {e} trapezius", "{e} trapezius muscle pain", "knot in the {e} trapezius", "pain in the {e} trap",
  "{h} trapezius me dard", "{h} kandhe ke upar ki maspeshi me dard", "{e} trapezius me dard", "{h} kandhe aur gardan ke beech ki maspeshi me dard",
  "{d} ट्रेपेज़ियस में दर्द", "{d} कंधे के ऊपर की मांसपेशी में दर्द", "{d} ट्रैप में दर्द", "{d} कंधे और गर्दन के बीच की मांसपेशी में दर्द",
]);
const SHOULDER_RAD = sided([
  "pain goes into the {e} shoulder", "pain spreads to my {e} shoulder and upper arm", "radiates to the {e} shoulder", "pain into the {e} upper arm", "{e} shoulder and upper arm pain from the neck",
  "pain travels to the {e} shoulder",
  "dard {h} kandhe aur bazu tak jata hai", "gardan se {h} kandhe tak dard jata hai", "dard {h} kandhe me bhi hota hai", "{h} kandhe aur upri bazu me dard",
  "दर्द {d} कंधे और बाजू तक जाता है", "गर्दन से {d} कंधे तक दर्द जाता है", "दर्द {d} कंधे में भी होता है", "{d} कंधे और ऊपरी बाजू में दर्द",
]);
const ARM_RAD = sided([
  "pain goes down the {e} arm to the elbow", "pain radiates down my {e} arm", "{e} arm pain from the neck", "pain down the {e} arm as far as the elbow", "pain travels down the {e} arm", "{e} arm pain",
  "gardan se {h} bazu me dard utarta hai", "dard {h} bazu se kohni tak jata hai", "{h} bazu me dard", "gardan ka dard {h} bazu tak aata hai",
  "गर्दन से {d} बाजू में दर्द उतरता है", "दर्द {d} बाजू से कोहनी तक जाता है", "{d} बाजू में दर्द", "गर्दन का दर्द {d} बाजू तक आता है",
]);
const HAND_RAD = sided([
  "pain goes into the {e} hand and fingers", "tingling in the {e} hand", "numbness in the {e} fingers", "pins and needles in my {e} hand", "{e} hand numbness", "{e} hand pain from the neck", "{e} fingers go numb",
  "{h} haath me jhunjhuni", "{h} haath ki ungliyon me sunnpan", "{h} haath me dard aur sunnpan", "{h} haath me chinti si chalti hai",
  "{d} हाथ में झनझनाहट", "{d} हाथ की उंगलियों में सुन्नपन", "{d} हाथ में दर्द और सुन्नपन", "{d} हाथ में चींटी सी चलती है",
]);
const ARM_YES = sided([
  "pain and tingling in the {e} arm", "{e} arm symptoms", "{e} arm is numb", "weakness in the {e} arm", "symptoms in the {e} arm and hand", "{e} arm feels heavy and weak", "{e} arm and hand symptoms",
  "{h} haath me dard aur jhunjhuni", "{h} bazu aur haath me takleef", "{h} haath me kamzori", "{h} bazu sunn ho jata hai",
  "{d} हाथ में दर्द और झनझनाहट", "{d} बाजू और हाथ में तकलीफ", "{d} हाथ में कमजोरी", "{d} बाजू सुन्न हो जाता है",
]);
const ROT = sided([
  "turning my head to the {e} hurts", "pain on rotating to the {e}", "looking over my {e} shoulder hurts", "rotation to the {e} is painful", "turning {e} aggravates it",
  "{h} taraf gardan ghumane par dard", "{h} taraf mudne par dard", "gardan {h} ghumane se dard badhta hai", "{h} taraf dekhne par dard",
  "{d} तरफ गर्दन घुमाने पर दर्द", "{d} तरफ मुड़ने पर दर्द", "गर्दन {d} घुमाने से दर्द बढ़ता है", "{d} तरफ देखने पर दर्द",
]);
const SIDEBEND = sided([
  "bending the neck to the {e} hurts", "side bend to the {e} is painful", "tilting my head to the {e} makes it worse", "ear to the {e} shoulder hurts", "side flexion to the {e} aggravates it",
  "gardan {h} taraf jhukane par dard", "{h} taraf gardan tedhi karne par dard", "kaan ko {h} kandhe ki taraf le jane par dard", "{h} side gardan jhukane par dard",
  "गर्दन {d} तरफ झुकाने पर दर्द", "{d} तरफ गर्दन टेढ़ी करने पर दर्द", "कान को {d} कंधे की तरफ ले जाने पर दर्द", "{d} साइड गर्दन झुकाने पर दर्द",
]);
const QUADRANT = sided([
  "looking up and to the {e} hurts", "extension and rotation to the {e} is the worst", "tilting back and turning to the {e} makes it sharp", "quadrant position to the {e} aggravates it", "head back and turned {e} is painful",
  "upar dekhte hue {h} taraf mudne par dard", "sir peeche karke {h} ghumane par dard", "peeche jhukkar {h} mudne par dard", "gardan peeche karke {h} taraf dekhne par dard",
  "ऊपर देखते हुए {d} तरफ मुड़ने पर दर्द", "सिर पीछे करके {d} घुमाने पर दर्द", "पीछे झुककर {d} मुड़ने पर दर्द", "गर्दन पीछे करके {d} तरफ देखने पर दर्द",
]);
const REL_ROT = sided([
  "turning to the {e} relieves it", "rotating my head {e} eases the pain", "looking {e} makes it feel better", "turning the neck {e} gives relief", "relief on rotation to the {e}",
  "{h} taraf gardan ghumane se aaram", "{h} taraf mudne se dard kam hota hai", "{h} dekhne se aaram milta hai", "gardan {h} ghumane se rahat",
  "{d} तरफ गर्दन घुमाने से आराम", "{d} तरफ मुड़ने से दर्द कम होता है", "{d} देखने से आराम मिलता है", "गर्दन {d} घुमाने से राहत",
]);

const CERVICAL_BASE = {
  location: {
    "Suboccipital / base of skull": [
      "~suboccipital", "base of the skull", "where the neck meets the head", "back of the head at the neck", "just below the skull at the back", "pain at the base of my skull", "under the back of the skull",
      "gardan aur sir ke jod par dard", "khopdi ke neeche dard", "sir ke peeche gardan ke upar dard", "sir ke aadhar par dard",
      "गर्दन और सिर के जोड़ पर दर्द", "खोपड़ी के नीचे दर्द", "सिर के पीछे गर्दन के ऊपर दर्द", "सिर के आधार पर दर्द",
    ],
    "Upper cervical (C0-C3)": [
      "~upper cervical", "~upper neck", "upper part of the neck", "top of the neck", "upper neck pain", "c1 c2", "c1 to c3", "pain in the upper neck",
      "gardan ke upar wale hisse me dard", "gardan ka upri hissa", "gardan ke upar dard", "upri gardan me dard",
      "गर्दन के ऊपरी हिस्से में दर्द", "गर्दन का ऊपरी भाग", "गर्दन के ऊपर दर्द", "ऊपरी गर्दन में दर्द",
    ],
    "Mid cervical (C4-C5)": [
      "~mid cervical", "~mid neck", "middle of the neck", "mid neck pain", "c4 c5", "c4 to c5", "halfway down the neck", "pain in the middle of the neck",
      "gardan ke beech me dard", "gardan ke beech wale hisse me dard", "beech ki gardan me dard", "gardan ke madhya me dard",
      "गर्दन के बीच में दर्द", "गर्दन के बीच वाले हिस्से में दर्द", "बीच की गर्दन में दर्द", "गर्दन के मध्य में दर्द",
    ],
    "Lower cervical (C6-T1)": [
      "~lower cervical", "~lower neck", "lower part of the neck", "bottom of the neck", "lower neck pain", "c6 c7", "c6 to c7", "pain in the lower neck", "c7 t1",
      "gardan ke neeche wale hisse me dard", "gardan ke niche dard", "gardan ka nichla hissa", "niche ki gardan me dard",
      "गर्दन के निचले हिस्से में दर्द", "गर्दन के नीचे दर्द", "गर्दन का निचला भाग", "नीचे की गर्दन में दर्द",
    ],
    "Anterior neck": [
      "~anterior neck", "front of the neck", "front of my neck", "pain at the front of the neck", "anterior neck pain", "pain in the front of the neck",
      "gardan ke aage dard", "gardan ke samne dard", "gardan ke aage ki taraf dard", "gardan ke samne wale hisse me dard",
      "गर्दन के आगे दर्द", "गर्दन के सामने दर्द", "गर्दन के आगे की तरफ दर्द", "गर्दन के सामने वाले हिस्से में दर्द",
    ],
    "Posterior neck (central)": [
      "~posterior neck", "back of the neck", "back of my neck", "nape of the neck", "pain in the back of the neck", "centre of the back of the neck", "posterior neck pain", "pain in the nape",
      "gardan ke peeche dard", "gardan ke peeche ki taraf dard", "gardan ke pichle hisse me dard", "gardan ke peeche beech me dard",
      "गर्दन के पीछे दर्द", "गर्दन के पीछे की तरफ दर्द", "गर्दन के पिछले हिस्से में दर्द", "गर्दन के पीछे बीच में दर्द",
    ],
    "Lateral neck (L)": LAT_NECK.L,
    "Lateral neck (R)": LAT_NECK.R,
    "Cervico-thoracic junction": [
      "cervicothoracic junction", "cervico thoracic junction", "base of the neck where it meets the shoulders", "where the neck meets the upper back", "c7 t2", "bump at the base of the neck", "pain at the base of the neck and top of the back",
      "gardan aur peeth ke jod par dard", "gardan ke aadhar par dard", "gardan ke niche peeth ke upar dard", "gardan jahan peeth se milti hai wahan dard",
      "गर्दन और पीठ के जोड़ पर दर्द", "गर्दन के आधार पर दर्द", "गर्दन के नीचे पीठ के ऊपर दर्द", "गर्दन जहां पीठ से मिलती है वहां दर्द",
    ],
    "Trapezius (L)": TRAP.L,
    "Trapezius (R)": TRAP.R,
    "Levator scapulae": [
      "~levator", "levator scapulae", "levator scap", "top inner corner of the shoulder blade", "pain at the angle of the neck and shoulder blade", "between the neck and the shoulder blade", "knot above the shoulder blade",
      "kandhe ki haddi ke upar ke kone me dard", "gardan aur kandhe ki haddi ke beech dard", "kandhe ki haddi ke upar gaanth", "gardan se kandhe ki haddi tak ki maspeshi me dard",
      "कंधे की हड्डी के ऊपर के कोने में दर्द", "गर्दन और कंधे की हड्डी के बीच दर्द", "कंधे की हड्डी के ऊपर गांठ", "गर्दन से कंधे की हड्डी तक की मांसपेशी में दर्द",
    ],
    "Sternocleidomastoid": [
      "~sternocleidomastoid", "~scm", "sternocleidomastoid muscle", "the muscle at the side of the neck running to the collarbone", "muscle from behind the ear to the collarbone", "sternomastoid", "sternocleidomastoid tightness",
      "kaan ke peeche se haansli tak ki maspeshi me dard", "gardan ki side wali lambi maspeshi me dard", "gardan ke side ki naali jaisi maspeshi me dard", "scm maspeshi me khichav",
      "कान के पीछे से हंसली तक की मांसपेशी में दर्द", "गर्दन की साइड वाली लंबी मांसपेशी में दर्द", "गर्दन के साइड की नली जैसी मांसपेशी में दर्द", "एससीएम मांसपेशी में खिंचाव",
    ],
    "Scalene": [
      "~scalene", "~scalenes", "scalene muscles", "side of the neck above the collarbone", "muscle at the base of the neck at the side", "scalene tightness", "tight scalenes",
      "gardan ke side me haansli ke upar dard", "gardan ke aadhar ki side wali maspeshi me dard", "scalene maspeshi me dard", "haansli ke upar gardan ki maspeshi me khichav",
      "गर्दन के साइड में हंसली के ऊपर दर्द", "गर्दन के आधार की साइड वाली मांसपेशी में दर्द", "स्केलीन मांसपेशी में दर्द", "हंसली के ऊपर गर्दन की मांसपेशी में खिंचाव",
    ],
  },

  radiation: {
    "No radiation — local only": [
      "no radiation", "pain is local", "stays in the neck", "does not spread", "doesnt spread anywhere", "pain doesnt travel", "only in the neck", "does not go down the arm", "neck only",
      "dard sirf gardan me hai", "dard kahin aur nahi jata", "dard failta nahi", "dard gardan tak hi rehta hai", "haath me kuch nahi hota",
      "दर्द सिर्फ गर्दन में है", "दर्द कहीं और नहीं जाता", "दर्द फैलता नहीं", "दर्द गर्दन तक ही रहता है", "हाथ में कुछ नहीं होता",
    ],
    "Into occiput / back of head": [
      "pain goes to the back of the head", "spreads up to the back of my head", "radiates into the occiput", "pain travels up into the back of the head", "up the back of the head", "into the occiput",
      "dard sir ke peeche tak jata hai", "gardan se sir ke peeche dard chadhta hai", "sir ke pichle hisse tak dard failta hai", "dard sir ke peeche aata hai",
      "दर्द सिर के पीछे तक जाता है", "गर्दन से सिर के पीछे दर्द चढ़ता है", "सिर के पिछले हिस्से तक दर्द फैलता है", "दर्द सिर के पीछे आता है",
    ],
    "Behind the eye / retro-orbital": [
      "pain behind the eye", "behind my eyes", "retro orbital pain", "pain behind the eyeball", "ache behind the eye", "pain goes behind the eye", "pressure behind the eyes",
      "aankh ke peeche dard", "aankhon ke peeche dard", "dard aankh ke peeche tak jata hai", "aankh ke peeche dabav",
      "आंख के पीछे दर्द", "आंखों के पीछे दर्द", "दर्द आंख के पीछे तक जाता है", "आंख के पीछे दबाव",
    ],
    "Temporal region": [
      "pain in the temples", "temple pain", "ache at the temple", "pain goes to the side of the head", "spreads to the temples", "temporal headache", "radiates to the temple",
      "kanpati me dard", "kanpatiyon me dard", "dard kanpati tak jata hai", "sir ki side me dard",
      "कनपटी में दर्द", "कनपटियों में दर्द", "दर्द कनपटी तक जाता है", "सिर की साइड में दर्द",
    ],
    "Jaw / TMJ region": [
      "~jaw pain", "~tmj", "pain in the jaw", "jaw ache", "radiates to the jaw", "tmj pain", "pain goes to the jaw", "jaw joint pain", "pain in the jaw joint",
      "jabde me dard", "dard jabde tak jata hai", "jabde ke jod me dard", "jabda dukhta hai",
      "जबड़े में दर्द", "दर्द जबड़े तक जाता है", "जबड़े के जोड़ में दर्द", "जबड़ा दुखता है",
    ],
    "Ear / periauricular": [
      "pain around the ear", "pain behind the ear", "ear pain with the neck pain", "ache near the ear", "radiates to the ear", "pain in front of the ear", "pain spreads around the ear",
      "kaan ke aaspaas dard", "kaan ke peeche dard", "kaan me dard gardan ke saath", "dard kaan tak jata hai",
      "कान के आसपास दर्द", "कान के पीछे दर्द", "कान में दर्द गर्दन के साथ", "दर्द कान तक जाता है",
    ],
    "Top of shoulder (C4 pattern)": [
      "pain on top of the shoulder", "tip of the shoulder", "top of my shoulder hurts", "pain over the top of the shoulder", "spreads to the top of the shoulder", "pain at the shoulder tip",
      "kandhe ke upar dard", "kandhe ke upri hisse me dard", "kandhe ki nok par dard", "dard kandhe ke upar tak jata hai",
      "कंधे के ऊपर दर्द", "कंधे के ऊपरी हिस्से में दर्द", "कंधे की नोक पर दर्द", "दर्द कंधे के ऊपर तक जाता है",
    ],
    "Shoulder / upper arm (L)": SHOULDER_RAD.L,
    "Shoulder / upper arm (R)": SHOULDER_RAD.R,
    "Down arm to elbow (L)": ARM_RAD.L,
    "Down arm to elbow (R)": ARM_RAD.R,
    "To hand / fingers (L)": HAND_RAD.L,
    "To hand / fingers (R)": HAND_RAD.R,
    "Bilateral upper limb": [
      "pain in both arms", "both arms are affected", "tingling in both arms", "pain goes down both arms", "bilateral arm symptoms", "both arms numb", "both upper limbs affected",
      "dono bazuon me dard", "dono haathon me jhunjhuni", "dono bazu sunn ho jate hain", "dono haath prabhavit hain",
      "दोनों बाजुओं में दर्द", "दोनों हाथों में झनझनाहट", "दोनों बाजू सुन्न हो जाते हैं", "दोनों हाथ प्रभावित हैं",
    ],
    "Around chest / anterior chest wall": [
      "pain goes around the chest", "spreads to the front of the chest", "radiates to the chest wall", "pain into the chest", "pain wraps around to the chest", "spreads across the front of the chest",
      "dard seene tak jata hai", "gardan se seene tak dard", "dard chhati ke aage tak failta hai", "dard seene me bhi hota hai",
      "दर्द सीने तक जाता है", "गर्दन से सीने तक दर्द", "दर्द छाती के आगे तक फैलता है", "दर्द सीने में भी होता है",
    ],
    "Between shoulder blades": [
      "pain between the shoulder blades", "spreads between my shoulder blades", "radiates to the interscapular area", "pain goes down between the shoulder blades", "into the upper back between the blades",
      "kandhon ke beech dard", "dard kandhon ke beech tak jata hai", "gardan se kandhe ki haddiyon ke beech dard", "dono kandhon ke beech me dard",
      "कंधों के बीच दर्द", "दर्द कंधों के बीच तक जाता है", "गर्दन से कंधे की हड्डियों के बीच दर्द", "दोनों कंधों के बीच में दर्द",
    ],
  },

  mechanismType: {
    "No clear mechanism — insidious onset": [
      "no clear mechanism", "no obvious cause", "no idea why", "it just built up", "gradual onset", "came on slowly", "no injury it came on gradually", "no specific cause", "woke up with it", "built up over weeks", "started by itself", "crept up slowly",
      "bina chot ke dheere dheere shuru hua", "apne aap shuru hua", "dheere dheere dard badhta gaya", "koi wajah samajh nahi aati", "subah uthte hi gardan me dard tha",
      "बिना चोट के धीरे धीरे शुरू हुआ", "अपने आप शुरू हुआ", "धीरे धीरे दर्द बढ़ता गया", "कोई वजह समझ नहीं आती", "सुबह उठते ही गर्दन में दर्द था",
    ],
    "Whiplash — rear-end MVA": [
      "rear end collision", "rear ended at a signal", "hit from behind in the car", "car hit me from behind", "rear end accident", "whiplash after being rear ended", "shunted from behind",
      "gaadi ne peeche se takkar maari", "peeche se takkar lagi", "car ko peeche se thok diya", "rear end accident me chot",
      "गाड़ी ने पीछे से टक्कर मारी", "पीछे से टक्कर लगी", "कार को पीछे से ठोक दिया", "रियर एंड एक्सीडेंट में चोट",
    ],
    "Whiplash — front-end MVA": [
      "head on collision", "front end collision", "hit another car head on", "crashed into the car in front", "car hit the wall and my head jerked forward", "frontal impact whiplash", "braked hard and hit the car ahead",
      "saamne se takkar", "aamne saamne ki takkar", "gaadi saamne wali se takra gayi", "achanak brake lagane par sir aage jhatka",
      "सामने से टक्कर", "आमने सामने की टक्कर", "गाड़ी सामने वाली से टकरा गई", "अचानक ब्रेक लगाने पर सिर आगे झटका",
    ],
    "Whiplash — side impact MVA": [
      "side impact collision", "hit from the side in the car", "t boned", "car hit me on the side", "side on crash", "side impact accident", "another car crashed into the side of mine",
      "gaadi ko side se takkar", "side se takkar lagi", "car ko bagal se thok diya", "side impact accident me chot",
      "गाड़ी को साइड से टक्कर", "साइड से टक्कर लगी", "कार को बगल से ठोक दिया", "साइड इम्पैक्ट एक्सीडेंट में चोट",
    ],
    "Hyperflexion (head forced forward)": [
      "hyperflexion", "head forced forward", "head snapped forward", "neck bent forward violently", "chin driven onto the chest", "head thrown forwards", "forced flexion injury",
      "sir zor se aage jhatka", "gardan achanak aage mud gayi", "thodi zor se aage jhuk gayi gardan", "thuddi seene se lag gayi",
      "सिर जोर से आगे झटका", "गर्दन अचानक आगे मुड़ गई", "गर्दन जोर से आगे झुक गई", "ठुड्डी सीने से लग गई",
    ],
    "Hyperextension (head forced back)": [
      "hyperextension", "head forced back", "head snapped back", "neck bent backwards violently", "head thrown back", "neck forced backwards", "forced extension injury",
      "sir zor se peeche jhatka", "gardan achanak peeche mud gayi", "gardan jor se peeche chali gayi", "sir peeche ki taraf jhatka khaya",
      "सिर जोर से पीछे झटका", "गर्दन अचानक पीछे मुड़ गई", "गर्दन जोर से पीछे चली गई", "सिर पीछे की तरफ झटका खाया",
    ],
    "Combined flexion + rotation": [
      "flexion and rotation", "bent forward and twisted the neck", "flexed and rotated my neck", "twisted while looking down", "neck turned while bent forward", "combined flexion rotation injury",
      "gardan jhukakar ghumane se", "aage jhukte hue gardan mud gayi", "neeche dekhte hue gardan ghum gayi", "jhukkar mudne par gardan me jhatka",
      "गर्दन झुकाकर घुमाने से", "आगे झुकते हुए गर्दन मुड़ गई", "नीचे देखते हुए गर्दन घूम गई", "झुककर मुड़ने पर गर्दन में झटका",
    ],
    "Direct trauma to head / neck": [
      "direct blow to the head", "hit on the neck", "blow to the neck", "hit on the head", "struck on the head", "head injury", "something fell on my head", "banged my head", "hit in the neck",
      "sir par chot lagi", "gardan par maar padi", "sir par kuch gir gaya", "gardan par chot lagi", "sir par thoka lagi",
      "सिर पर चोट लगी", "गर्दन पर मार पड़ी", "सिर पर कुछ गिर गया", "गर्दन पर चोट लगी", "सिर पर ठोकर लगी",
    ],
    "Diving / swimming impact": [
      "diving accident", "dived into shallow water", "hit the bottom of the pool when diving", "swimming accident", "dived and hit my head", "jumped into the water and hit the bottom", "diving impact",
      "paani me kood kar sir takra gaya", "swimming pool me sir takra gaya", "kood kar neeche se sir lag gaya", "diving me chot",
      "पानी में कूदकर सिर टकरा गया", "स्विमिंग पूल में सिर टकरा गया", "कूदकर नीचे से सिर लग गया", "डाइविंग में चोट",
    ],
    "Sustained poor posture over time": [
      "poor posture", "sustained poor posture", "slouching for years", "desk job posture", "forward head posture from the computer", "long hours on the laptop", "looking at my phone for hours", "hunched over a screen",
      "kharab posture ki wajah se", "ghanto computer par jhuk kar kaam", "mobile mein sir jhukakar der tak dekhna", "laptop par lambe samay tak kaam",
      "खराब पोस्चर की वजह से", "घंटों कंप्यूटर पर झुककर काम", "मोबाइल में सिर झुकाकर देर तक देखना", "लैपटॉप पर लंबे समय तक काम",
    ],
    "Sleeping position": [
      "slept awkwardly", "slept in a bad position", "woke up with a stiff neck", "slept with the wrong pillow", "sleeping on the sofa gave me a stiff neck", "awkward sleeping position", "slept with my neck twisted", "crick in the neck after sleep",
      "galat tarike se sone se", "sote waqt gardan akad gayi", "galat takiye par sone se", "sone ke baad gardan jam gayi", "sote samay gardan mud gayi",
      "गलत तरीके से सोने से", "सोते वक्त गर्दन अकड़ गई", "गलत तकिये पर सोने से", "सोने के बाद गर्दन जाम हो गई", "सोते समय गर्दन मुड़ गई",
    ],
    "Lifting heavy load": [
      "lifting a heavy load", "lifted something heavy", "strained my neck lifting", "carrying a heavy bag on the shoulder", "carried a heavy weight on my head", "lifted a heavy box and felt it in my neck", "overhead lifting heavy weight",
      "bhaari saman uthane se", "bhaari bojh uthate waqt gardan me khichav", "sir par bhaari wazan uthane se", "bhaari bag kandhe par uthane se",
      "भारी सामान उठाने से", "भारी बोझ उठाते वक्त गर्दन में खिंचाव", "सिर पर भारी वजन उठाने से", "भारी बैग कंधे पर उठाने से",
    ],
    "Post-surgical": [
      "post surgical", "after surgery", "after neck surgery", "post operative", "since my operation", "after cervical fusion", "after the operation on my neck", "following surgery",
      "operation ke baad se dard", "gardan ke operation ke baad", "surgery ke baad gardan me dard", "operation ke baad dard shuru hua",
      "ऑपरेशन के बाद से दर्द", "गर्दन के ऑपरेशन के बाद", "सर्जरी के बाद गर्दन में दर्द", "ऑपरेशन के बाद दर्द शुरू हुआ",
    ],
    "Post-illness / meningism": [
      "after a viral illness", "after the flu", "after a fever", "post viral", "neck stiffness after an infection", "meningism", "after a bad cold",
      "bukhar ke baad gardan me dard", "viral ke baad gardan akad gayi", "bimari ke baad gardan jam gayi", "bukhar ke saath gardan akdan",
      "बुखार के बाद गर्दन में दर्द", "वायरल के बाद गर्दन अकड़ गई", "बीमारी के बाद गर्दन जाम हो गई", "बुखार के साथ गर्दन अकड़न",
    ],
  },

  armPresent: {
    "No arm or hand symptoms": [
      "~no", "no arm symptoms", "no arm or hand symptoms", "no pins and needles in the arm", "no numbness in the hands", "arms are fine", "no tingling in the arms", "no arm pain",
      "haath me koi dikkat nahi", "bazu me kuch nahi", "haath me jhunjhuni nahi", "haath sunn nahi hota",
      "हाथ में कोई दिक्कत नहीं", "बाजू में कुछ नहीं", "हाथ में झनझनाहट नहीं", "हाथ सुन्न नहीं होता",
    ],
    "Yes — unilateral (L)": ARM_YES.L,
    "Yes — unilateral (R)": ARM_YES.R,
    "Yes — bilateral (concerning for cord)": [
      "symptoms in both arms and hands", "both hands are numb", "both arms and hands affected", "bilateral arm and hand symptoms", "tingling in both hands", "both hands feel clumsy and numb",
      "dono haathon me jhunjhuni aur dard", "dono haath sunn", "dono bazuon aur haathon me takleef", "dono haath kamzor aur sunn",
      "दोनों हाथों में झनझनाहट और दर्द", "दोनों हाथ सुन्न", "दोनों बाजुओं और हाथों में तकलीफ", "दोनों हाथ कमजोर और सुन्न",
    ],
  },

  lhermitte: {
    "No": [
      "~no", "no lhermitte", "lhermitte negative", "no electric shocks", "no shock sensation down the spine", "no electric shock when i bend my neck", "lhermittes sign is negative",
      "bijli ka jhatka nahi lagta", "gardan jhukane par karant nahi lagta", "lhermitte nahi hai", "reedh me karant jaisa kuch nahi",
      "बिजली का झटका नहीं लगता", "गर्दन झुकाने पर करंट नहीं लगता", "लर्मिट नहीं है", "रीढ़ में करंट जैसा कुछ नहीं",
    ],
    "Yes — electric shock down spine with neck flexion (myelopathy / MS flag)": [
      "electric shock down the spine when i bend my neck", "lhermitte positive", "shock like feeling down my back with neck flexion", "electric shock down the spine on looking down", "zap down the spine when i flex my neck", "lhermittes sign positive", "electric shocks down my back when i look down",
      "gardan jhukane par reedh me bijli ka jhatka", "gardan niche karne par reedh me karant", "neeche dekhne par reedh me bijli jaisa jhatka", "gardan jhukate hi peeth me karant daud jata hai",
      "गर्दन झुकाने पर रीढ़ में बिजली का झटका", "गर्दन नीचे करने पर रीढ़ में करंट", "नीचे देखने पर रीढ़ में बिजली जैसा झटका", "गर्दन झुकाते ही पीठ में करंट दौड़ जाता है",
    ],
    "Unsure": [
      "not sure about the electric shock", "lhermitte unsure", "might have the electric shock feeling", "i am not sure if there is a shock sensation", "unsure about lhermitte", "not sure whether it zaps down the spine",
      "bijli ke jhatke ke bare me pata nahi", "lhermitte pata nahi", "karant lagta hai ya nahi yakin nahi", "shayad reedh me karant lagta hai",
      "बिजली के झटके के बारे में पता नहीं", "लर्मिट पता नहीं", "करंट लगता है या नहीं यकीन नहीं", "शायद रीढ़ में करंट लगता है",
    ],
    "Not assessed": [
      "lhermitte not tested", "lhermitte not assessed", "not assessed yet", "did not ask about electric shocks", "lhermittes not checked", "still to check lhermittes",
      "lhermitte jaancha nahi", "abhi tak lhermitte nahi dekha", "bijli ke jhatke ke bare me poochha nahi", "lhermitte test nahi hua",
      "लर्मिट जांचा नहीं", "अभी तक लर्मिट नहीं देखा", "बिजली के झटके के बारे में पूछा नहीं", "लर्मिट टेस्ट नहीं हुआ",
    ],
  },

  aggMovements: {
    "Flexion — looking down": [
      "~looking down", "looking down hurts", "bending the neck forward hurts", "looking at my phone makes it worse", "reading with head down hurts", "neck flexion is painful", "pain on looking down", "chin to chest hurts",
      "neeche dekhne par dard", "gardan aage jhukane par dard", "mobile dekhne par dard badhta hai", "padhte waqt sir jhukane par dard",
      "नीचे देखने पर दर्द", "गर्दन आगे झुकाने पर दर्द", "मोबाइल देखने पर दर्द बढ़ता है", "पढ़ते वक्त सिर झुकाने पर दर्द",
    ],
    "Extension — looking up": [
      "~looking up", "looking up hurts", "tilting the head back hurts", "extending the neck is painful", "pain on looking up", "head back hurts", "looking at the ceiling hurts", "neck extension makes it worse",
      "upar dekhne par dard", "gardan peeche karne par dard", "sir peeche karne par dard", "chhat ki taraf dekhne par dard",
      "ऊपर देखने पर दर्द", "गर्दन पीछे करने पर दर्द", "सिर पीछे करने पर दर्द", "छत की तरफ देखने पर दर्द",
    ],
    "Rotation left": ROT.L,
    "Rotation right": ROT.R,
    "Side bend left": SIDEBEND.L,
    "Side bend right": SIDEBEND.R,
    "Combined extension + rotation left (quadrant)": QUADRANT.L,
    "Combined extension + rotation right (quadrant)": QUADRANT.R,
    "Combined flexion + rotation": [
      "~flexion and rotation", "looking down and turning hurts", "bending forward and twisting the neck", "looking down and to the side is painful", "flexed and turned position hurts", "turning while looking down aggravates it",
      "neeche dekhte hue mudne par dard", "jhukkar gardan ghumane par dard", "aage jhukkar side dekhne par dard", "neeche dekhkar ghumne par dard",
      "नीचे देखते हुए मुड़ने पर दर्द", "झुककर गर्दन घुमाने पर दर्द", "आगे झुककर साइड देखने पर दर्द", "नीचे देखकर घूमने पर दर्द",
    ],
    "Sustained end-range any direction": [
      "~sustained", "holding the neck in one position", "staying in the same position for a long time", "end of range held for long", "holding my head still for long", "sustained positions make it worse", "keeping the neck in one posture hurts",
      "ek hi position me der tak rehne par dard", "gardan ek hi tarah rakhne par dard", "der tak ek hi mudra me rehne par dard", "lambe samay tak ek position me",
      "एक ही स्थिति में देर तक रहने पर दर्द", "गर्दन एक ही तरह रखने पर दर्द", "देर तक एक ही मुद्रा में रहने पर दर्द", "लंबे समय तक एक स्थिति में",
    ],
    "Quick / sudden movements": [
      "~sudden movements", "~quick movements", "sudden movements hurt", "quick head movements are painful", "a sudden turn of the head", "jerky movements aggravate it", "sudden jolt makes it worse", "any quick neck movement",
      "achanak hilne par dard", "jhatke se gardan ghumane par dard", "tezi se mudne par dard", "achanak harkat par dard",
      "अचानक हिलने पर दर्द", "झटके से गर्दन घुमाने पर दर्द", "तेजी से मुड़ने पर दर्द", "अचानक हरकत पर दर्द",
    ],
    "All movements equally": [
      "~all movements", "all movements hurt", "every movement of the neck is painful", "all movements equally painful", "any direction hurts the same", "pain with every neck movement", "all directions are painful", "cannot move the neck without pain",
      "har harkat par dard", "gardan ki har harkat me dard", "har taraf ghumane par barabar dard", "kisi bhi disha me gardan hilane par dard",
      "हर हरकत पर दर्द", "गर्दन की हर हरकत में दर्द", "हर तरफ घुमाने पर बराबर दर्द", "किसी भी दिशा में गर्दन हिलाने पर दर्द",
    ],
  },

  relMovements: {
    "Chin tuck (cranio-cervical flexion)": [
      "~chin tuck", "~chin tucks", "chin tuck relieves it", "tucking my chin in helps", "pulling the chin in eases the pain", "chin tucks give relief", "nodding the head slightly helps", "chin tuck exercise helps",
      "thuddi andar karne se aaram", "chin tuck karne se dard kam hota hai", "thuddi ko andar ki taraf dabane se aaram", "chin tuck se rahat",
      "ठुड्डी अंदर करने से आराम", "चिन टक करने से दर्द कम होता है", "ठुड्डी को अंदर की तरफ दबाने से आराम", "चिन टक से राहत",
    ],
    "Cervical retraction": [
      "~retraction", "~cervical retraction", "pulling the head straight back helps", "retraction eases it", "pushing my head back over my shoulders helps", "neck retraction relieves the pain", "sliding the head backwards gives relief",
      "sir ko peeche ki taraf khinchne se aaram", "retraction se dard kam hota hai", "gardan ko seedha peeche karne se aaram", "sir ko peeche dhakelne se rahat",
      "सिर को पीछे की तरफ खींचने से आराम", "रिट्रैक्शन से दर्द कम होता है", "गर्दन को सीधा पीछे करने से आराम", "सिर को पीछे धकेलने से राहत",
    ],
    "Cervical extension": [
      "looking up relieves it", "tilting the head back eases the pain", "extension relieves it", "bending the neck backwards helps", "looking up gives relief", "head back feels better", "neck extension eases the symptoms",
      "upar dekhne se aaram", "gardan peeche karne se dard kam hota hai", "sir peeche karne se rahat", "peeche jhukne se aaram milta hai",
      "ऊपर देखने से आराम", "गर्दन पीछे करने से दर्द कम होता है", "सिर पीछे करने से राहत", "पीछे झुकने से आराम मिलता है",
    ],
    "Cervical flexion": [
      "looking down relieves it", "bending the neck forward eases the pain", "flexion relieves it", "chin to chest helps", "looking down gives relief", "head forward feels better", "neck flexion eases the symptoms",
      "neeche dekhne se aaram", "gardan aage jhukane se dard kam hota hai", "sir aage karne se rahat", "aage jhukne se aaram milta hai",
      "नीचे देखने से आराम", "गर्दन आगे झुकाने से दर्द कम होता है", "सिर आगे करने से राहत", "आगे झुकने से आराम मिलता है",
    ],
    "Rotation left": REL_ROT.L,
    "Rotation right": REL_ROT.R,
    "Specific direction (McKenzie preference)": [
      "~directional preference", "one particular direction relieves it", "a certain movement always helps", "repeated movements in one direction help", "mckenzie directional preference", "moving in one direction makes it better", "a specific direction gives relief",
      "ek khaas disha me hilne se aaram", "kisi ek taraf hilane se dard kam hota hai", "ek hi disha me baar baar hilane se rahat", "mckenzie wali disha me aaram",
      "एक खास दिशा में हिलने से आराम", "किसी एक तरफ हिलाने से दर्द कम होता है", "एक ही दिशा में बार बार हिलाने से राहत", "मैकेंजी वाली दिशा में आराम",
    ],
    "Shoulder blade retraction / squeeze": [
      "~scapular retraction", "squeezing the shoulder blades together helps", "pulling the shoulders back eases it", "shoulder blade squeeze relieves the pain", "pinching the shoulder blades together helps", "scapular retraction gives relief", "pulling my shoulders back helps",
      "kandhe peeche karne se aaram", "kandhon ki haddiyan paas laane se dard kam hota hai", "kandhe peeche kheenchne se rahat", "shoulder blade squeeze se aaram",
      "कंधे पीछे करने से आराम", "कंधों की हड्डियां पास लाने से दर्द कम होता है", "कंधे पीछे खींचने से राहत", "शोल्डर ब्लेड स्क्वीज़ से आराम",
    ],
    "Shoulder elevation (unloads C4/C5)": [
      "shrugging my shoulders helps", "lifting the shoulders up relieves it", "raising the shoulder eases the arm pain", "shoulder shrug relieves it", "shoulders up gives relief", "hunching the shoulders up helps",
      "kandhe upar uthane se aaram", "kandhe ucchkane se dard kam hota hai", "kandhe upar karne se rahat", "kandhe sikodne se aaram",
      "कंधे ऊपर उठाने से आराम", "कंधे उचकाने से दर्द कम होता है", "कंधे ऊपर करने से राहत", "कंधे सिकोड़ने से आराम",
    ],
    "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)": [
      "putting my hand on my head relieves the arm pain", "raising the arm overhead helps", "hand on top of the head eases the arm symptoms", "arm up over the head gives relief", "resting the arm on my head helps the tingling", "shoulder abduction relief sign positive",
      "haath sir par rakhne se aaram", "haath upar karne se bazu ka dard kam hota hai", "haath sir ke upar rakhne se jhunjhuni kam", "bazu sir ke upar karne se rahat",
      "हाथ सिर पर रखने से आराम", "हाथ ऊपर करने से बाजू का दर्द कम होता है", "हाथ सिर के ऊपर रखने से झनझनाहट कम", "बाजू सिर के ऊपर करने से राहत",
    ],
    "Gentle stretching": [
      "~stretching", "gentle stretching helps", "stretches give relief", "stretching the neck eases it", "a gentle stretch relieves the pain", "neck stretches help", "stretching helps a bit",
      "halka stretching se aaram", "stretch karne se dard kam hota hai", "gardan ko tanne se aaram milta hai", "stretching karne se rahat",
      "हल्की स्ट्रेचिंग से आराम", "स्ट्रेच करने से दर्द कम होता है", "गर्दन को तानने से आराम मिलता है", "स्ट्रेचिंग करने से राहत",
    ],
    "Hot shower with water on neck": [
      "~hot shower", "a hot shower helps", "hot water on the neck relieves it", "warm water running over my neck eases the pain", "standing under a hot shower gives relief", "hot water on my neck feels better", "a warm shower eases the stiffness",
      "garam paani se nahane se aaram", "garam paani gardan par girne se dard kam hota hai", "shower me garam paani se rahat", "gardan par garam paani dalne se aaram",
      "गरम पानी से नहाने से आराम", "गरम पानी गर्दन पर गिरने से दर्द कम होता है", "शावर में गरम पानी से राहत", "गर्दन पर गरम पानी डालने से आराम",
    ],
  },

  overallPattern: {
    "Constant — never goes away": [
      "~constant", "constant pain", "pain all the time", "never goes away", "pain 24 hours a day", "always there", "the pain is constant", "pain never settles completely", "present all day and night",
      "hamesha dard", "lagatar dard rehta hai", "dard kabhi khatam nahi hota", "din raat dard rehta hai",
      "हमेशा दर्द", "लगातार दर्द रहता है", "दर्द कभी खत्म नहीं होता", "दिन रात दर्द रहता है",
    ],
    "Constant — varies in intensity": [
      "constant and varies in intensity", "always there and goes up and down", "background pain that fluctuates", "constant ache that changes in severity", "never goes away completely and some hours are worse", "pain is always present and the intensity changes",
      "dard hamesha rehta hai par kabhi kam kabhi zyada", "lagatar dard par tezi badalti rehti hai", "dard hota hai par kabhi halka kabhi tez", "hamesha dard par ghante ke hisaab se badalta hai",
      "दर्द हमेशा रहता है पर कभी कम कभी ज्यादा", "लगातार दर्द पर तेजी बदलती रहती है", "दर्द होता है पर कभी हल्का कभी तेज", "हमेशा दर्द पर घंटे के हिसाब से बदलता है",
    ],
    "Intermittent — clear triggers": [
      "comes and goes with clear triggers", "intermittent with obvious triggers", "pain comes on when i do certain things", "only appears with specific movements", "triggered by particular activities and then settles", "intermittent pain brought on by looking down",
      "kuch khaas kaam karne par dard aata jata hai", "kisi khaas harkat se dard aata hai aur phir chala jata hai", "jab kuch khaas karta hoon tab hi dard", "dard ke kaaran saaf pata hain",
      "कुछ खास काम करने पर दर्द आता जाता है", "किसी खास हरकत से दर्द आता है और फिर चला जाता है", "जब कुछ खास करता हूं तब ही दर्द", "दर्द के कारण साफ पता हैं",
    ],
    "Intermittent — unpredictable": [
      "comes and goes for no reason", "unpredictable pain", "random episodes of pain", "intermittent with no pattern", "pain appears out of nowhere", "no way of predicting when it comes", "pain comes at random",
      "dard bina wajah aata jata hai", "kab aayega pata nahi chalta", "achanak dard aa jata hai", "dard ka koi pattern nahi hai",
      "दर्द बिना वजह आता जाता है", "कब आएगा पता नहीं चलता", "अचानक दर्द आ जाता है", "दर्द का कोई पैटर्न नहीं है",
    ],
    "Activity-related only": [
      "~activity related", "only with activity", "pain only when i am active", "only when i use my neck a lot", "only comes on with activity", "activity brings it on and rest settles it", "only during certain activities",
      "sirf kaam karne par dard", "kaam karte waqt hi dard hota hai", "sirf activity me dard", "gardan ka zyada istemal karne par hi dard",
      "सिर्फ काम करने पर दर्द", "काम करते वक्त ही दर्द होता है", "सिर्फ एक्टिविटी में दर्द", "गर्दन का ज्यादा इस्तेमाल करने पर ही दर्द",
    ],
    "Position-related only": [
      "~position related", "only in certain positions", "depends on the position of my neck", "only when my head is in a particular position", "specific positions bring it on", "pain only in one position", "posture dependent",
      "sirf kuch positions me dard", "gardan ki position par dard nirbhar", "sirf ek khaas mudra me dard", "position badalne par dard chala jata hai",
      "सिर्फ कुछ पोजीशन में दर्द", "गर्दन की पोजीशन पर दर्द निर्भर", "सिर्फ एक खास मुद्रा में दर्द", "पोजीशन बदलने पर दर्द चला जाता है",
    ],
    "Morning dominant": [
      "worse in the morning", "worst first thing in the morning", "stiff and sore when i wake up", "morning pain is the worst", "bad on waking", "pain on getting out of bed", "morning stiffness in the neck",
      "subah zyada dard", "subah uthte hi gardan me dard", "subah gardan akad jati hai", "subah sabse zyada takleef",
      "सुबह ज्यादा दर्द", "सुबह उठते ही गर्दन में दर्द", "सुबह गर्दन अकड़ जाती है", "सुबह सबसे ज्यादा तकलीफ",
    ],
    "Evening dominant": [
      "worse in the evening", "worst at the end of the day", "builds up through the day and is worst by evening", "evening pain", "by night time it is at its worst after the day", "gets worse as the day goes on", "end of day pain",
      "shaam ko zyada dard", "din dhalte dard badhta hai", "shaam tak dard sabse zyada", "din bhar ke kaam ke baad shaam ko dard",
      "शाम को ज्यादा दर्द", "दिन ढलते दर्द बढ़ता है", "शाम तक दर्द सबसे ज्यादा", "दिन भर के काम के बाद शाम को दर्द",
    ],
    "Night dominant": [
      "~night dominant", "worse at night", "night pain", "pain wakes me up", "wakes me at night", "cannot sleep because of the pain", "pain is worst at night", "disturbs my sleep",
      "raat ko dard", "raat ko zyada dard", "raat ko dard se neend khul jati hai", "raat me gardan dard badhta hai",
      "रात को दर्द", "रात में ज्यादा दर्द", "रात को दर्द से नींद खुल जाती है", "रात में गर्दन दर्द बढ़ता है",
    ],
    "Episodic flare-ups on background constant pain": [
      "flare ups on top of constant pain", "a constant ache with periodic flare ups", "background pain with episodes of severe pain", "constant dull pain and then bad episodes", "always some pain and sometimes it flares", "acute flares on a chronic ache",
      "hamesha halka dard aur kabhi kabhi tez daura", "lagatar dard ke upar kabhi kabhi flare up", "halka dard rehta hai aur kabhi tez ho jata hai", "background dard ke saath kabhi kabhi tez episode",
      "हमेशा हल्का दर्द और कभी कभी तेज दौरा", "लगातार दर्द के ऊपर कभी कभी फ्लेयर अप", "हल्का दर्द रहता है और कभी तेज हो जाता है", "बैकग्राउंड दर्द के साथ कभी कभी तेज एपिसोड",
    ],
    "Warms up — eases with movement": [
      "warms up", "eases once i get moving", "better once the neck has warmed up", "stiff at first then loosens with movement", "improves with movement", "loosens up after a few minutes of moving", "gets better as i move about",
      "hilne dulne se aaram", "chalne phirne ke baad dard kam", "shuru me akdan phir hilne se theek", "garam hone ke baad theek lagta hai",
      "हिलने डुलने से आराम", "चलने फिरने के बाद दर्द कम", "शुरू में अकड़न फिर हिलने से ठीक", "गरम होने के बाद ठीक लगता है",
    ],
    "Completely gone between episodes": [
      "completely gone between episodes", "totally pain free between attacks", "no pain at all between episodes", "settles fully between flare ups", "back to normal between episodes", "pain free in between", "symptom free between attacks",
      "daure ke beech me dard bilkul nahi", "episodes ke beech me poori tarah theek", "dard ke baad bilkul normal ho jata hai", "beech me kuch nahi hota",
      "दौरे के बीच में दर्द बिल्कुल नहीं", "एपिसोड के बीच में पूरी तरह ठीक", "दर्द के बाद बिल्कुल नॉर्मल हो जाता है", "बीच में कुछ नहीं होता",
    ],
  },

  haPresent: {
    "No headache": [
      "~no headache", "no headache", "no headaches", "no headache with the neck pain", "no head pain", "headache is absent", "no headaches at all",
      "sir dard nahi hai", "sir me dard nahi", "gardan dard ke saath sir dard nahi", "sir dard bilkul nahi",
      "सिर दर्द नहीं है", "सिर में दर्द नहीं", "गर्दन दर्द के साथ सिर दर्द नहीं", "सिर दर्द बिल्कुल नहीं",
    ],
    "Yes — primary complaint": [
      "headache is my main problem", "the headache is the main complaint", "mostly headaches", "i came for the headaches", "my main problem is the headache", "headache is the primary complaint", "headaches are the worst part",
      "sir dard sabse badi pareshani hai", "mukhya shikayat sir dard hai", "zyadatar sir dard hi hota hai", "sir dard ke liye aaya hoon",
      "सिर दर्द सबसे बड़ी परेशानी है", "मुख्य शिकायत सिर दर्द है", "ज्यादातर सिर दर्द ही होता है", "सिर दर्द के लिए आया हूं",
    ],
    "Yes — secondary to neck pain": [
      "headache comes with the neck pain", "the neck pain brings on a headache", "headaches after the neck gets stiff", "headache secondary to the neck pain", "when my neck hurts i get a headache", "headache starts from the neck", "neck pain then headache",
      "gardan dard ke saath sir dard", "gardan dard hone par sir dard hota hai", "gardan se sir dard shuru hota hai", "pehle gardan dard phir sir dard",
      "गर्दन दर्द के साथ सिर दर्द", "गर्दन दर्द होने पर सिर दर्द होता है", "गर्दन से सिर दर्द शुरू होता है", "पहले गर्दन दर्द फिर सिर दर्द",
    ],
    "Yes — concurrent but possibly unrelated": [
      "headaches that may be unrelated", "also gets headaches separate from the neck", "has migraines as well", "headache probably not from the neck", "separate headache problem", "migraine too", "headaches for other reasons",
      "sir dard alag se bhi hota hai", "migraine bhi hai", "sir dard shayad gardan se nahi", "sir dard ki alag samasya",
      "सिर दर्द अलग से भी होता है", "माइग्रेन भी है", "सिर दर्द शायद गर्दन से नहीं", "सिर दर्द की अलग समस्या",
    ],
    "Previous headache history — not current": [
      "had headaches in the past", "previous history of headaches", "headaches years ago and not now", "used to get headaches", "headaches in the past which have settled", "no current headache and had them before", "old headaches",
      "pehle sir dard hota tha ab nahi", "pehle sir dard ki shikayat thi", "sir dard purane samay me hota tha", "ab sir dard nahi par pehle tha",
      "पहले सिर दर्द होता था अब नहीं", "पहले सिर दर्द की शिकायत थी", "सिर दर्द पुराने समय में होता था", "अब सिर दर्द नहीं पर पहले था",
    ],
  },

  redFlagsMyelopathy: {
    "No myelopathy signs": [
      "no myelopathy signs", "no signs of myelopathy", "no cord signs", "myelopathy screen is negative", "no clumsiness or gait problems", "nothing to suggest cord compression",
      "myelopathy ke koi lakshan nahi", "cord ke koi sanket nahi", "chalne me koi dikkat nahi aur haath theek", "myelopathy screen negative",
      "मायलोपैथी के कोई लक्षण नहीं", "कॉर्ड के कोई संकेत नहीं", "चलने में कोई दिक्कत नहीं और हाथ ठीक", "मायलोपैथी स्क्रीन नेगेटिव",
    ],
    "Bilateral hand symptoms (grip clumsiness / numbness)": [
      "numbness in both hands", "both hands clumsy", "grip is weak in both hands", "both hands feel numb and clumsy", "dropping things from both hands", "bilateral hand numbness", "both hands feel like wearing gloves",
      "dono haathon me sunnpan", "dono haath kamzor aur pakad kharab", "dono haathon se cheezein gir jati hain", "dono haath dastane pehne jaise lagte hain",
      "दोनों हाथों में सुन्नपन", "दोनों हाथ कमजोर और पकड़ खराब", "दोनों हाथों से चीजें गिर जाती हैं", "दोनों हाथ दस्ताने पहने जैसे लगते हैं",
    ],
    "Loss of fine motor control (buttons / writing)": [
      "difficulty with buttons", "cannot do up my buttons", "handwriting has got worse", "trouble writing", "fine finger movements are difficult", "fumbling with buttons", "cant button my shirt", "poor dexterity",
      "button lagane me dikkat", "likhne me dikkat", "ungliyon se baareek kaam nahi hota", "kameez ke button nahi lag paate",
      "बटन लगाने में दिक्कत", "लिखने में दिक्कत", "उंगलियों से बारीक काम नहीं होता", "कमीज के बटन नहीं लग पाते",
    ],
    "Gait disturbance / wide-based gait / ataxia": [
      "unsteady on my feet", "walking is unsteady", "wide based gait", "off balance when walking", "staggering when walking", "ataxic gait", "cannot walk in a straight line", "my walking has become clumsy",
      "chalte waqt ladkhadata hoon", "chalne me santulan nahi", "chalna ladkhada sa ho gaya hai", "seedhi line me nahi chal pata",
      "चलते वक्त लड़खड़ाता हूं", "चलने में संतुलन नहीं", "चलना लड़खड़ा सा हो गया है", "सीधी लाइन में नहीं चल पाता",
    ],
    "Unexplained falls": [
      "unexplained falls", "falling for no reason", "keeps falling over", "legs gave way and i fell", "had several falls recently", "falls without any warning", "tripping and falling more often",
      "bina wajah gir jata hoon", "baar baar gir jata hoon", "pair jawab dene se gir gaya", "aajkal zyada girne laga hoon",
      "बिना वजह गिर जाता हूं", "बार बार गिर जाता हूं", "पैर जवाब देने से गिर गया", "आजकल ज्यादा गिरने लगा हूं",
    ],
    "Bilateral lower limb weakness or stiffness": [
      "both legs are weak", "weakness in both legs", "legs feel stiff and heavy", "both legs feel stiff", "heaviness in both legs", "legs have become weak and stiff", "spastic legs",
      "dono pairon me kamzori", "dono pair akad gaye hain", "pair bhaari aur sakht lagte hain", "pairon me jakdan aur kamzori",
      "दोनों पैरों में कमजोरी", "दोनों पैर अकड़ गए हैं", "पैर भारी और सख्त लगते हैं", "पैरों में जकड़न और कमजोरी",
    ],
    "Hyperreflexia (known)": [
      "~hyperreflexia", "hyperreflexia", "brisk reflexes", "reflexes are brisk", "exaggerated reflexes", "reflexes are increased", "hyperreflexic",
      "reflexes tez hain", "reflex zyada tez hain", "reflexes badhe hue hain", "hyperreflexia hai",
      "रिफ्लेक्स तेज हैं", "रिफ्लेक्स ज्यादा तेज हैं", "रिफ्लेक्स बढ़े हुए हैं", "हाइपररिफ्लेक्सिया है",
    ],
    "Babinski positive (known)": [
      "~babinski", "babinski positive", "babinskis sign is positive", "upgoing plantar response", "extensor plantar response", "positive babinski",
      "babinski positive hai", "babinski sign mila", "talwe ka reflex upar ki taraf", "babinski ka test positive",
      "बबिंस्की पॉजिटिव है", "बबिंस्की साइन मिला", "तलवे का रिफ्लेक्स ऊपर की तरफ", "बबिंस्की का टेस्ट पॉजिटिव",
    ],
    "Hoffman's sign (known)": [
      "~hoffman", "hoffmans sign positive", "hoffman positive", "positive hoffmans", "hoffmanns sign is present", "hoffmans test positive",
      "hoffman positive hai", "hoffman sign mila", "hoffman ka test positive", "hoffman sign present",
      "हॉफमैन पॉजिटिव है", "हॉफमैन साइन मिला", "हॉफमैन का टेस्ट पॉजिटिव", "हॉफमैन साइन मौजूद",
    ],
    "Bladder dysfunction — new onset": [
      "new bladder problems", "new onset bladder dysfunction", "difficulty passing urine since the neck pain", "bladder control has changed", "cant control my bladder anymore", "urgency and leaking since this started", "started leaking urine",
      "peshab ki nayi dikkat", "peshab rokne me dikkat", "peshab nikal jata hai", "peshab karne me takleef shuru hui",
      "पेशाब की नई दिक्कत", "पेशाब रोकने में दिक्कत", "पेशाब निकल जाता है", "पेशाब करने में तकलीफ शुरू हुई",
    ],
    "Bowel dysfunction — new onset": [
      "new bowel problems", "new onset bowel dysfunction", "bowel control has changed", "constipation that started with this", "cant control my bowels", "bowel habit has changed since this started", "leaking stool",
      "potty ki nayi dikkat", "potty rokne me dikkat", "potty ka control nahi", "kabz ki nayi shikayat",
      "पॉटी की नई दिक्कत", "पॉटी रोकने में दिक्कत", "पॉटी का कंट्रोल नहीं", "कब्ज की नई शिकायत",
    ],
    "Lhermitte's sign": [
      "~lhermitte", "lhermittes sign", "lhermittes sign present", "electric shock down the spine on neck flexion", "electric shock down my back when i look down", "shock down the spine when i bend my neck", "lhermitte sign positive",
      "gardan jhukane par reedh me karant", "gardan neeche karte hi reedh me bijli", "lhermitte sign hai", "reedh me bijli ka jhatka",
      "गर्दन झुकाने पर रीढ़ में करंट", "गर्दन नीचे करते ही रीढ़ में बिजली", "लर्मिट साइन है", "रीढ़ में बिजली का झटका",
    ],
    "Rapidly progressive neurological symptoms": [
      "rapidly progressive symptoms", "getting worse quickly", "neurological symptoms are worsening fast", "symptoms progressing over days", "rapidly worsening weakness", "deteriorating quickly", "worse every day",
      "tezi se badhte lakshan", "din ba din tezi se kharab ho raha hai", "kamzori tezi se badh rahi hai", "kuch dino me haalat bigad gayi",
      "तेजी से बढ़ते लक्षण", "दिन ब दिन तेजी से खराब हो रहा है", "कमजोरी तेजी से बढ़ रही है", "कुछ दिनों में हालत बिगड़ गई",
    ],
  },

  redFlagsVbi: {
    "No VBI signs": [
      "no vbi signs", "no signs of vbi", "vbi screen is negative", "no dizziness or double vision", "no drop attacks or slurred speech", "no vertebrobasilar symptoms", "no 5 ds and 3 ns",
      "vbi ke koi lakshan nahi", "chakkar ya double vision nahi", "vbi screen negative", "koi vertebrobasilar lakshan nahi",
      "वीबीआई के कोई लक्षण नहीं", "चक्कर या डबल विजन नहीं", "वीबीआई स्क्रीन नेगेटिव", "कोई वर्टिब्रोबेसिलर लक्षण नहीं",
    ],
    "Dizziness with neck movement — specific": [
      "dizzy when i turn my neck", "dizziness with neck movement", "giddy on looking up", "feel dizzy when i move my head", "spinning sensation on turning the head", "lightheaded with certain neck positions", "vertigo on neck rotation",
      "gardan ghumane par chakkar", "gardan hilane par chakkar aate hain", "upar dekhne par chakkar", "sir ghumane par sab ghoomta hai",
      "गर्दन घुमाने पर चक्कर", "गर्दन हिलाने पर चक्कर आते हैं", "ऊपर देखने पर चक्कर", "सिर घुमाने पर सब घूमता है",
    ],
    "Diplopia (double vision)": [
      "double vision", "diplopia", "seeing double", "things look double", "two images of everything", "blurred and double vision", "sees double when turning the head",
      "double dikhta hai", "do do dikhai deta hai", "cheezein double dikhti hain", "aankhon se double vision",
      "दो दो दिखता है", "डबल दिखता है", "चीजें डबल दिखती हैं", "आंखों से डबल विजन",
    ],
    "Drop attacks": [
      "drop attacks", "legs suddenly give way without warning", "collapsed suddenly with no loss of consciousness", "sudden falls with no warning", "dropped to the floor suddenly", "knees buckled and i fell with no warning", "sudden collapse",
      "achanak gir jata hoon bina chakkar ke", "pair achanak jawab de dete hain aur gir jata hoon", "achanak zameen par gir gaya", "bina warning ke gir pada",
      "अचानक गिर जाता हूं बिना चक्कर के", "पैर अचानक जवाब दे देते हैं और गिर जाता हूं", "अचानक जमीन पर गिर गया", "बिना वार्निंग के गिर पड़ा",
    ],
    "Dysarthria (slurred speech)": [
      "slurred speech", "dysarthria", "speech became slurred", "difficulty speaking clearly", "words come out slurred", "my speech is not clear", "trouble getting words out",
      "bolne me ladkhadahat", "zubaan ladkhadati hai", "saaf bol nahi pata", "bolte waqt shabd atak jate hain",
      "बोलने में लड़खड़ाहट", "जुबान लड़खड़ाती है", "साफ बोल नहीं पाता", "बोलते वक्त शब्द अटक जाते हैं",
    ],
    "Dysphagia (difficulty swallowing)": [
      "difficulty swallowing", "dysphagia", "trouble swallowing", "food gets stuck when i swallow", "painful or difficult to swallow", "cant swallow properly", "swallowing has become difficult",
      "nigalne me dikkat", "khana nigalne me takleef", "nivala atakta hai", "paani nigalna mushkil",
      "निगलने में दिक्कत", "खाना निगलने में तकलीफ", "निवाला अटकता है", "पानी निगलना मुश्किल",
    ],
    "Ataxia (coordination loss)": [
      "loss of coordination", "ataxia", "clumsy and uncoordinated", "cant coordinate my movements", "bumping into things", "poor coordination", "hands and legs not coordinated",
      "talmel nahi rehta", "haath pair ka talmel bigad gaya", "cheezon se takra jata hoon", "coordination kharab ho gaya",
      "तालमेल नहीं रहता", "हाथ पैर का तालमेल बिगड़ गया", "चीजों से टकरा जाता हूं", "कोऑर्डिनेशन खराब हो गया",
    ],
    "Nausea with neck movement": [
      "nausea when i move my neck", "feel sick when i turn my head", "queasy with neck movement", "nauseous on looking up", "sick feeling with certain neck movements", "nausea comes on with head turning", "vomiting with neck movements",
      "gardan hilane par ji machlata hai", "sir ghumane par ulti jaisa lagta hai", "gardan ghumane par mitli", "upar dekhne par ji ghabrata hai",
      "गर्दन हिलाने पर जी मचलाता है", "सिर घुमाने पर उल्टी जैसा लगता है", "गर्दन घुमाने पर मितली", "ऊपर देखने पर जी घबराता है",
    ],
    "Nystagmus (eye oscillation)": [
      "nystagmus", "eyes flicker", "eyes jumping from side to side", "eyes oscillate", "my eyes keep twitching sideways", "involuntary eye movements", "eye jerking",
      "aankhein apne aap hilti hain", "aankhein idhar udhar kaampti hain", "aankhon ka kampan", "aankhein jhatke se hilti hain",
      "आंखें अपने आप हिलती हैं", "आंखें इधर उधर कांपती हैं", "आंखों का कंपन", "आंखें झटके से हिलती हैं",
    ],
    "Numbness — face or bilateral limbs": [
      "numbness in the face", "face feels numb", "numb face and both arms", "facial numbness", "tingling around the mouth", "numbness on one side of the face", "both arms and legs go numb",
      "chehre par sunnpan", "chehra sunn ho jata hai", "munh ke aaspaas jhunjhuni", "chehre aur dono haathon me sunnpan",
      "चेहरे पर सुन्नपन", "चेहरा सुन्न हो जाता है", "मुंह के आसपास झनझनाहट", "चेहरे और दोनों हाथों में सुन्नपन",
    ],
    "Thunderclap headache — sudden worst ever": [
      "thunderclap headache", "sudden worst headache of my life", "worst headache ever came on instantly", "sudden severe headache like being hit", "explosive headache", "headache peaked within seconds", "the worst headache i have ever had",
      "achanak zindagi ka sabse tez sir dard", "achanak bahut tez sir dard jaise kisi ne mara ho", "ek dum se tez sir dard", "sabse bura sir dard achanak",
      "अचानक जिंदगी का सबसे तेज सिर दर्द", "अचानक बहुत तेज सिर दर्द जैसे किसी ने मारा हो", "एक दम से तेज सिर दर्द", "सबसे बुरा सिर दर्द अचानक",
    ],
    "Horner's syndrome (drooping eyelid + small pupil)": [
      "horners syndrome", "drooping eyelid", "one eyelid is drooping", "small pupil with a droopy eyelid", "ptosis", "eyelid drooping on one side", "one pupil smaller than the other",
      "palak latak gayi hai", "ek aankh ki palak girti hai", "ek taraf ki palak jhuki hui", "aankh ki putli chhoti ho gayi",
      "पलक लटक गई है", "एक आंख की पलक गिरती है", "एक तरफ की पलक झुकी हुई", "आंख की पुतली छोटी हो गई",
    ],
  },

  redFlagsInstability: {
    "No instability signs": [
      "no instability signs", "no signs of instability", "instability screen is negative", "neck feels stable", "no craniovertebral instability", "no rheumatoid or trauma history and the neck feels stable",
      "instability ke koi lakshan nahi", "gardan stable lagti hai", "gardan ladkhadati nahi", "instability screen negative",
      "इंस्टेबिलिटी के कोई लक्षण नहीं", "गर्दन स्थिर लगती है", "गर्दन लड़खड़ाती नहीं", "इंस्टेबिलिटी स्क्रीन नेगेटिव",
    ],
    "Rheumatoid arthritis — known": [
      "rheumatoid arthritis", "known rheumatoid", "i have ra", "diagnosed with rheumatoid arthritis", "history of rheumatoid arthritis", "ra for years", "rheumatoid disease",
      "rheumatoid arthritis hai", "gathiya ki bimari hai", "ra ka ilaaj chal raha hai", "rheumatoid ka history",
      "रूमेटॉयड आर्थराइटिस है", "गठिया की बीमारी है", "आरए का इलाज चल रहा है", "रूमेटॉयड का इतिहास",
    ],
    "Down syndrome / trisomy 21": [
      "down syndrome", "downs syndrome", "trisomy 21", "has down syndrome", "patient with down syndrome", "child with downs",
      "down syndrome hai", "downs syndrome wala", "trisomy 21 hai", "down syndrome ka mareez",
      "डाउन सिंड्रोम है", "डाउन्स सिंड्रोम वाला", "ट्राइसोमी 21 है", "डाउन सिंड्रोम का मरीज",
    ],
    "Recent significant trauma": [
      "recent significant trauma", "had a significant injury recently", "serious accident last week", "major trauma a few days ago", "recent serious injury to the head or neck", "a bad fall recently",
      "haal hi me badi chot lagi", "kuch din pehle gambhir accident hua", "pichle hafte badi chot", "haal ki gambhir chot",
      "हाल ही में बड़ी चोट लगी", "कुछ दिन पहले गंभीर एक्सीडेंट हुआ", "पिछले हफ्ते बड़ी चोट", "हाल की गंभीर चोट",
    ],
    "Post-surgical cervical fusion": [
      "cervical fusion", "post surgical cervical fusion", "had a neck fusion", "fusion surgery on my neck", "acdf", "neck fusion with plates", "anterior cervical discectomy and fusion",
      "gardan ka fusion operation", "cervical fusion surgery hui thi", "gardan me plate lagi hai", "gardan ki haddi jodne ka operation",
      "गर्दन का फ्यूजन ऑपरेशन", "सर्वाइकल फ्यूजन सर्जरी हुई थी", "गर्दन में प्लेट लगी है", "गर्दन की हड्डी जोड़ने का ऑपरेशन",
    ],
    "Sense of head not stable on neck": [
      "head feels unstable on the neck", "feels like my head is too heavy for my neck", "head feels loose", "feel i have to hold my head up with my hands", "head is wobbly on my neck", "my neck cannot hold my head", "head feels like it will fall off",
      "sir gardan par stable nahi lagta", "sir bahut bhaari lagta hai gardan par", "sir dhila sa lagta hai", "sir ko haathon se sambhalna padta hai",
      "सिर गर्दन पर स्थिर नहीं लगता", "सिर बहुत भारी लगता है गर्दन पर", "सिर ढीला सा लगता है", "सिर को हाथों से संभालना पड़ता है",
    ],
    "Constant occipital / suboccipital pain unrelieved": [
      "constant pain at the base of the skull", "relentless suboccipital pain", "constant occipital pain nothing relieves", "unrelenting pain at the back of the head", "constant pain at the base of my skull that nothing helps", "occipital pain that never settles",
      "sir ke peeche lagatar dard jo kisi se kam nahi hota", "khopdi ke neeche hamesha dard aur kuch aaram nahi deta", "sir ke pichle hisse me dard kabhi kam nahi hota", "gardan ke upar lagatar dard jo theek nahi hota",
      "सिर के पीछे लगातार दर्द जो किसी से कम नहीं होता", "खोपड़ी के नीचे हमेशा दर्द और कुछ आराम नहीं देता", "सिर के पिछले हिस्से में दर्द कभी कम नहीं होता", "गर्दन के ऊपर लगातार दर्द जो ठीक नहीं होता",
    ],
    "Muscle spasm severe — guarding": [
      "severe muscle spasm", "muscles are in spasm", "neck muscles clamped down", "guarding the neck", "neck locked in spasm", "severe spasm in the neck muscles", "holding the neck rigid",
      "gardan ki maspeshiyan bahut kas gayi hain", "gardan me tez spasm", "gardan akad kar jam gayi", "gardan sakht ho gayi hai",
      "गर्दन की मांसपेशियां बहुत कस गई हैं", "गर्दन में तेज स्पाज्म", "गर्दन अकड़ कर जाम हो गई", "गर्दन सख्त हो गई है",
    ],
    "Sharp pain on neck flexion": [
      "sharp pain when i bend my neck forward", "sharp pain on neck flexion", "stabbing pain on looking down", "flexing the neck gives sharp pain", "knife like pain on bending the head forward", "sudden sharp pain when i drop my chin",
      "gardan aage jhukane par tez dard", "neeche dekhne par chubhne wala dard", "sir jhukate hi tez dard", "gardan jhukane par chhuri jaisa dard",
      "गर्दन आगे झुकाने पर तेज दर्द", "नीचे देखने पर चुभने वाला दर्द", "सिर झुकाते ही तेज दर्द", "गर्दन झुकाने पर छुरी जैसा दर्द",
    ],
  },

  redFlagsOther: {
    "No other red flags": [
      "no other red flags", "no red flags", "no warning signs", "none of the above", "nothing worrying", "red flags absent", "no other warning signs",
      "koi aur red flag nahi", "koi khatre ki baat nahi", "koi chinta wali baat nahi", "koi warning sign nahi",
      "कोई और रेड फ्लैग नहीं", "कोई खतरे की बात नहीं", "कोई चिंता वाली बात नहीं", "कोई वार्निंग साइन नहीं",
    ],
    "Carotid / vertebral artery dissection symptoms": [
      "carotid dissection", "vertebral artery dissection", "suspected arterial dissection", "neck pain with a sudden severe headache and drooping eyelid", "pain at the side of the neck with visual disturbance after a neck manipulation", "dissection symptoms",
      "dhamni ke phatne ke lakshan", "gardan ki dhamni me chot ke lakshan", "carotid dissection ka shak", "vertebral artery dissection ka shak",
      "धमनी के फटने के लक्षण", "गर्दन की धमनी में चोट के लक्षण", "कैरोटिड डिसेक्शन का शक", "वर्टिब्रल आर्टरी डिसेक्शन का शक",
    ],
    "Thunderclap headache — sudden onset worst ever": [
      "sudden onset worst headache with neck pain", "came on instantly and is the worst headache ever with my neck pain", "neck pain with an abrupt severe headache", "a violent headache hit me suddenly along with neck pain", "worst ever headache that started in seconds with a sore neck", "instant severe headache and stiff neck",
      "gardan dard ke saath achanak sabse tez sir dard", "ek pal me shuru hua bahut tez sir dard aur gardan dard", "achanak aaya zordar sir dard gardan ke saath", "gardan akadne ke saath achanak sabse bura sir dard",
      "गर्दन दर्द के साथ अचानक सबसे तेज सिर दर्द", "एक पल में शुरू हुआ बहुत तेज सिर दर्द और गर्दन दर्द", "अचानक आया जोरदार सिर दर्द गर्दन के साथ", "गर्दन अकड़ने के साथ अचानक सबसे बुरा सिर दर्द",
    ],
    "Known cervical cancer / tumour": [
      "cervical tumour", "tumour in the neck", "cancer of the spine", "known cancer in the neck", "history of cancer", "neck tumour", "cancer that has spread to the spine", "metastases in the neck",
      "gardan me tumour", "gardan ka kainsar", "reedh me cancer hai", "gardan me gaanth jo kainsar hai",
      "गर्दन में ट्यूमर", "गर्दन का कैंसर", "रीढ़ में कैंसर है", "गर्दन में गांठ जो कैंसर है",
    ],
    "Recent high-energy trauma to neck": [
      "high energy trauma to the neck", "major road accident with neck injury", "fall from height onto the neck", "severe neck injury in a crash", "high speed collision", "serious impact injury to the neck", "fell from a ladder onto my head",
      "gardan par bhayankar chot", "badi gaadi ki takkar me gardan me chot", "oonchai se gir kar gardan par chot", "tez raftaar takkar me gardan me chot",
      "गर्दन पर भयंकर चोट", "बड़ी गाड़ी की टक्कर में गर्दन में चोट", "ऊंचाई से गिरकर गर्दन पर चोट", "तेज रफ्तार टक्कर में गर्दन में चोट",
    ],
    "Torticollis — acute with fever (retropharyngeal abscess risk)": [
      "stiff neck with fever", "acute torticollis with a fever", "head tilted to one side and a high temperature", "neck locked to one side with fever and a sore throat", "neck stiffness and fever", "wry neck with fever",
      "bukhar ke saath gardan tedhi", "gardan ek taraf mud gayi aur bukhar", "gardan akad gayi aur tez bukhar", "gale me dard aur gardan jam ke saath bukhar",
      "बुखार के साथ गर्दन टेढ़ी", "गर्दन एक तरफ मुड़ गई और बुखार", "गर्दन अकड़ गई और तेज बुखार", "गले में दर्द और गर्दन जाम के साथ बुखार",
    ],
    "Constitutional symptoms with neck pain": [
      "unexplained weight loss with the neck pain", "night sweats and weight loss", "feeling unwell with fever and weight loss", "constitutional symptoms", "lost weight and tired with the neck pain", "feeling generally unwell and losing weight",
      "wazan kam ho raha hai aur gardan dard", "raat ko pasina aur wazan me kami", "bukhar aur thakan ke saath gardan dard", "tabiyat kharab rehti hai aur wazan ghat raha hai",
      "वजन कम हो रहा है और गर्दन दर्द", "रात को पसीना और वजन में कमी", "बुखार और थकान के साथ गर्दन दर्द", "तबीयत खराब रहती है और वजन घट रहा है",
    ],
  },

  fractureScreen: {
    "Not applicable": [
      "~not applicable", "no fracture risk", "no trauma so fracture screen not applicable", "no injury so no fracture concern", "fracture screen is not relevant", "no fracture indicators", "no trauma at all",
      "fracture ka koi shak nahi", "chot nahi lagi isliye fracture ka sawal nahi", "fracture screen lagu nahi", "koi chot nahi",
      "फ्रैक्चर का कोई शक नहीं", "चोट नहीं लगी इसलिए फ्रैक्चर का सवाल नहीं", "फ्रैक्चर स्क्रीन लागू नहीं", "कोई चोट नहीं",
    ],
    "High-energy trauma (MVA / fall >1m / diving)": [
      "high energy trauma", "road traffic accident at speed", "fell from more than a metre", "fell from a height", "diving into shallow water", "major car crash", "high speed accident", "fell off a roof",
      "tez raftaar accident", "oonchai se gir gaya", "ek meter se oopar se gira", "badi gaadi ki takkar",
      "तेज रफ्तार एक्सीडेंट", "ऊंचाई से गिर गया", "एक मीटर से ऊपर से गिरा", "बड़ी गाड़ी की टक्कर",
    ],
    "Axial loading mechanism (head impact)": [
      "axial load", "landed on my head", "hit the top of my head", "something heavy fell on my head", "head first impact", "fell onto the top of the head", "compressed through the top of the head", "landed headfirst",
      "sir ke bal gir gaya", "sir ke upar kuch bhaari gir gaya", "sir ke upar se chot lagi", "ulta sir ke bal gira",
      "सिर के बल गिर गया", "सिर के ऊपर कुछ भारी गिर गया", "सिर के ऊपर से चोट लगी", "उल्टा सिर के बल गिरा",
    ],
    "Immediate severe pain + muscle spasm": [
      "immediate severe pain and spasm", "severe pain straight away with muscle spasm", "instant agonising pain and spasm", "pain was immediate and severe and the muscles locked up", "severe pain right at the moment of injury with spasm", "terrible pain and muscle spasm straight after",
      "chot lagte hi tez dard aur spasm", "turant bahut dard aur maspeshiyan kas gayin", "ek dum se tez dard aur akdan", "chot ke saath hi dard aur spasm",
      "चोट लगते ही तेज दर्द और स्पाज्म", "तुरंत बहुत दर्द और मांसपेशियां कस गईं", "एक दम से तेज दर्द और अकड़न", "चोट के साथ ही दर्द और स्पाज्म",
    ],
    "Cannot move neck at all — voluntary splinting": [
      "cannot move the neck at all", "unable to move my neck", "holding the neck completely still", "neck is totally locked", "afraid to move the neck at all", "voluntary splinting of the neck", "cant turn my head at all",
      "gardan bilkul nahi hila sakta", "gardan hila nahi pa raha", "gardan ko bilkul sthir rakhta hoon", "gardan bilkul jam gayi hai",
      "गर्दन बिल्कुल नहीं हिला सकता", "गर्दन हिला नहीं पा रहा", "गर्दन को बिल्कुल स्थिर रखता हूं", "गर्दन बिल्कुल जाम हो गई है",
    ],
    "Neurological symptoms from time of injury": [
      "numbness from the moment of the injury", "tingling started straight after the accident", "weakness straight after the injury", "neurological symptoms since the injury", "lost feeling in my arms at the time of the accident", "pins and needles immediately after the fall",
      "chot ke samay se hi sunnpan", "accident ke turant baad se jhunjhuni", "chot lagte hi haath sunn ho gaye", "chot ke saath hi kamzori",
      "चोट के समय से ही सुन्नपन", "एक्सीडेंट के तुरंत बाद से झनझनाहट", "चोट लगते ही हाथ सुन्न हो गए", "चोट के साथ ही कमजोरी",
    ],
    "Odontoid peg fracture risk — elderly + fall": [
      "elderly after a fall", "old person fell and hit the head", "odontoid fracture risk", "older patient fell and has neck pain", "fell at 80 and has neck pain", "elderly with a head injury from a fall", "dens fracture risk",
      "budhape me gir gaya aur gardan dard", "bujurg gir gaye aur sir par chot", "boodhe vyakti ka girna aur gardan dard", "umar zyada hai aur gir gaya",
      "बुढ़ापे में गिर गया और गर्दन दर्द", "बुजुर्ग गिर गए और सिर पर चोट", "बूढ़े व्यक्ति का गिरना और गर्दन दर्द", "उम्र ज्यादा है और गिर गया",
    ],
    "NEXUS criteria not cleared": [
      "nexus not cleared", "nexus criteria not met", "failed nexus", "nexus positive", "cannot clear the neck by nexus", "does not meet the nexus low risk criteria",
      "nexus clear nahi hua", "nexus criteria poore nahi hue", "nexus me fail", "nexus positive hai",
      "नेक्सस क्लियर नहीं हुआ", "नेक्सस क्राइटेरिया पूरे नहीं हुए", "नेक्सस में फेल", "नेक्सस पॉजिटिव है",
    ],
    "Canadian C-Spine Rule — high risk features": [
      "canadian c spine rule high risk", "high risk by the canadian c spine rule", "canadian rule positive", "c spine rule high risk factor present", "age over 65 with a dangerous mechanism", "canadian c spine high risk feature",
      "canadian c spine rule me high risk", "canadian rule positive hai", "c spine rule ka high risk factor", "canadian c spine rule me khatra",
      "कैनेडियन सी स्पाइन रूल में हाई रिस्क", "कैनेडियन रूल पॉजिटिव है", "सी स्पाइन रूल का हाई रिस्क फैक्टर", "कैनेडियन सी स्पाइन रूल में खतरा",
    ],
    "Bilateral facet dislocation — high energy": [
      "bilateral facet dislocation", "both facet joints dislocated", "facet dislocation from a high energy injury", "locked facets on both sides", "bilateral facet lock", "jumped facets",
      "dono facet jod khisak gaye", "facet dislocation hai", "dono taraf ke facet joint hat gaye", "facet lock",
      "दोनों फेसेट जोड़ खिसक गए", "फेसेट डिसलोकेशन है", "दोनों तरफ के फेसेट जोड़ हट गए", "फेसेट लॉक",
    ],
    "Clay shoveler fracture — sudden load / whip": [
      "clay shoveler fracture", "clay shovellers", "snapped something shovelling", "sudden pull at the base of the neck while shovelling", "crack at the base of the neck when lifting a spade", "spinous process fracture from sudden load", "heard a snap in the lower neck during heavy digging",
      "belcha chalate waqt gardan ke neeche kuch tuta", "khudai karte waqt gardan ke aadhar par jhatka", "phawde se khudai me gardan ke niche awaaz aayi", "achanak bojh uthane par gardan ke niche ki haddi tooti",
      "बेलचा चलाते वक्त गर्दन के नीचे कुछ टूटा", "खुदाई करते वक्त गर्दन के आधार पर झटका", "फावड़े से खुदाई में गर्दन के नीचे आवाज आई", "अचानक बोझ उठाने पर गर्दन के नीचे की हड्डी टूटी",
    ],
  },

  fnAdl: {
    "No functional limitation": [
      "no functional limitation", "no limitations", "nothing is limited", "can do everything", "no problem with daily activities", "no restriction at all", "not limiting anything",
      "koi pareshani nahi kaam me", "sab kaam kar leta hoon", "kisi kaam me dikkat nahi", "koi rukavat nahi",
      "कोई परेशानी नहीं काम में", "सब काम कर लेता हूं", "किसी काम में दिक्कत नहीं", "कोई रुकावट नहीं",
    ],
    "Driving — head rotation restricted": [
      "difficulty driving", "cannot turn my head to drive", "driving is difficult because i cant look over my shoulder", "reversing the car is hard", "cant check blind spots", "driving is painful", "stopped driving",
      "gaadi chalane me dikkat", "gardan ghumane ki wajah se gaadi nahi chala pata", "reverse karne me gardan dukhti hai", "gaadi chalate waqt side nahi dekh pata",
      "गाड़ी चलाने में दिक्कत", "गर्दन घुमाने की वजह से गाड़ी नहीं चला पाता", "रिवर्स करने में गर्दन दुखती है", "गाड़ी चलाते वक्त साइड नहीं देख पाता",
    ],
    "Looking over shoulder — road safety concern": [
      "cant look over my shoulder safely", "unsafe to check over my shoulder on the road", "worried about not seeing the traffic behind me", "cannot do a proper shoulder check", "blind spot check is unsafe", "road safety worry because i cant turn my head",
      "kandhe ke upar se dekhna surakshit nahi", "peeche ka traffic nahi dekh pata", "gardan nahi ghumne se sadak par khatra", "blind spot dekhna mushkil",
      "कंधे के ऊपर से देखना सुरक्षित नहीं", "पीछे का ट्रैफिक नहीं देख पाता", "गर्दन नहीं घूमने से सड़क पर खतरा", "ब्लाइंड स्पॉट देखना मुश्किल",
    ],
    "Computer / screen use": [
      "difficulty using the computer", "cant look at a screen for long", "screen use makes the pain worse", "computer work is a problem", "cant use the laptop for long", "limited at the computer", "phone use hurts my neck",
      "computer par kaam karne me dikkat", "screen par zyada der nahi dekh pata", "laptop par kaam mushkil", "mobile chalane me gardan dukhti hai",
      "कंप्यूटर पर काम करने में दिक्कत", "स्क्रीन पर ज्यादा देर नहीं देख पाता", "लैपटॉप पर काम मुश्किल", "मोबाइल चलाने में गर्दन दुखती है",
    ],
    "Reading / desk work": [
      "difficulty reading", "cannot read for long", "desk work is difficult", "reading makes my neck hurt", "limited at my desk", "studying for long is painful", "cant read a book with my head down",
      "padhne me dikkat", "der tak padh nahi pata", "desk par kaam mushkil", "padhte waqt gardan dukhti hai",
      "पढ़ने में दिक्कत", "देर तक पढ़ नहीं पाता", "डेस्क पर काम मुश्किल", "पढ़ते वक्त गर्दन दुखती है",
    ],
    "Watching TV": [
      "difficulty watching tv", "cant watch tv for long", "watching television hurts my neck", "tv watching is a problem", "cant sit and watch a film", "limited with tv",
      "tv dekhne me dikkat", "der tak tv nahi dekh pata", "tv dekhte waqt gardan dukhti hai", "film dekhna mushkil",
      "टीवी देखने में दिक्कत", "देर तक टीवी नहीं देख पाता", "टीवी देखते वक्त गर्दन दुखती है", "फिल्म देखना मुश्किल",
    ],
    "Sleeping — position difficulty": [
      "difficulty sleeping", "cant get comfortable in bed", "cannot find a comfortable position to sleep", "sleep is disturbed by the neck pain", "hard to sleep on my side", "poor sleep due to neck pain", "cant sleep properly",
      "neend nahi aati dard se", "so nahi pata", "sone ki position nahi mil rahi", "raat ko theek se so nahi pata",
      "नींद नहीं आती दर्द से", "सो नहीं पाता", "सोने की पोजीशन नहीं मिल रही", "रात को ठीक से सो नहीं पाता",
    ],
    "Hair washing / drying": [
      "difficulty washing my hair", "cant dry my hair", "hair washing is painful", "blow drying my hair hurts my neck", "cant tie my hair up", "combing hair is hard",
      "baal dhone me dikkat", "baal sukhane me dikkat", "baal banana mushkil", "baal dhote waqt gardan dukhti hai",
      "बाल धोने में दिक्कत", "बाल सुखाने में दिक्कत", "बाल बनाना मुश्किल", "बाल धोते वक्त गर्दन दुखती है",
    ],
    "Overhead activities": [
      "difficulty with overhead activities", "cant reach up", "putting things on high shelves hurts", "hanging washing is difficult", "overhead work is painful", "cant lift my arms above my head", "cant paint the ceiling",
      "upar haath karne wale kaam me dikkat", "upar shelf par saman nahi rakh pata", "kapde sukhane me dikkat", "chhat par kaam mushkil",
      "ऊपर हाथ करने वाले काम में दिक्कत", "ऊपर शेल्फ पर सामान नहीं रख पाता", "कपड़े सुखाने में दिक्कत", "छत पर काम मुश्किल",
    ],
    "Carrying / lifting": [
      "difficulty carrying", "cant lift anything heavy", "carrying shopping bags hurts", "lifting is a problem", "cant carry my child", "cant lift my bag", "carrying a rucksack is painful",
      "bhaari saman uthane me dikkat", "kuch utha nahi pata", "bag uthane me gardan dukhti hai", "bachche ko nahi utha pata",
      "भारी सामान उठाने में दिक्कत", "कुछ उठा नहीं पाता", "बैग उठाने में गर्दन दुखती है", "बच्चे को नहीं उठा पाता",
    ],
    "Sport / exercise": [
      "cannot play sport", "had to stop exercising", "cant go to the gym", "stopped playing because of my neck", "sport is limited", "cant swim", "cant do my yoga",
      "khel nahi pata", "exercise band kar di", "gym nahi ja pata", "yoga nahi kar pata",
      "खेल नहीं पाता", "एक्सरसाइज बंद कर दी", "जिम नहीं जा पाता", "योग नहीं कर पाता",
    ],
    "Work duties": [
      "cannot do my job properly", "work is affected by the neck pain", "unable to do my work duties", "had to take time off work", "cant manage my work", "my job is difficult because of the neck", "reduced hours at work",
      "kaam nahi kar pata", "naukri me dikkat", "office ka kaam nahi ho pata", "kaam par jana mushkil",
      "काम नहीं कर पाता", "नौकरी में दिक्कत", "ऑफिस का काम नहीं हो पाता", "काम पर जाना मुश्किल",
    ],
    "Childcare": [
      "difficulty looking after my child", "cant pick up my baby", "childcare is hard", "cant carry my toddler", "struggling to care for the kids", "limited with my children",
      "bachche ki dekhbhal me dikkat", "bachche ko utha nahi pata", "bachche sambhalna mushkil", "bachcho ka kaam nahi ho pata",
      "बच्चे की देखभाल में दिक्कत", "बच्चे को उठा नहीं पाता", "बच्चे संभालना मुश्किल", "बच्चों का काम नहीं हो पाता",
    ],
    "Sexual activity": [
      "difficulty with sexual activity", "sex is painful because of my neck", "intimacy is affected", "limited sexual activity", "cant be intimate because of the neck pain", "sexual activity is restricted",
      "sambandh banane me dikkat", "intimacy me gardan dukhti hai", "physical relation me takleef", "sex me dikkat gardan dard ki wajah se",
      "संबंध बनाने में दिक्कत", "इंटिमेसी में गर्दन दुखती है", "शारीरिक संबंध में तकलीफ", "सेक्स में दिक्कत गर्दन दर्द की वजह से",
    ],
    "Concentration / cognitive (headache)": [
      "difficulty concentrating", "cant concentrate because of the headache", "foggy head with the pain", "memory and focus are poor", "brain fog from the pain", "cant focus on my work",
      "dhyan nahi lagta", "sir dard ki wajah se concentration nahi", "dimaag bhaari rehta hai", "kisi cheez par focus nahi kar pata",
      "ध्यान नहीं लगता", "सिर दर्द की वजह से कंसंट्रेशन नहीं", "दिमाग भारी रहता है", "किसी चीज पर फोकस नहीं कर पाता",
    ],
    "Social activities": [
      "difficulty with social activities", "stopped going out socially", "stopped socialising", "avoiding social events", "cant go to parties", "social life is limited by the pain", "not meeting people",
      "bahar jana band kar diya", "samajik kaam me dikkat", "parties me nahi jata", "logon se milna band kar diya",
      "बाहर जाना बंद कर दिया", "सामाजिक काम में दिक्कत", "पार्टियों में नहीं जाता", "लोगों से मिलना बंद कर दिया",
    ],
  },
};


// Added for the way a CLINICIAN types about a patient ("the patient", "they", short notes) -- see cervicalSheetSet.js. Kept apart from the
// base lists so the order of the answers (which the tests index by position) never changes.
const SHEET_PHRASES = {
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const CERVICAL_PHRASES = mergePhrases(CERVICAL_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W, NERVE: NERVE_W } = WORDS;
// Words that say a sentence is about the neck / about another body part.
const OWN_W = "neck* gardan गर्दन cervical cervico cervicothoracic nape occiput skull head sir सिर khopdi खोपड़ी trapezius trap traps levator scm scalene shoulder* kandha कंधा arm arms bazu बाजू haath हाथ hand hands finger fingers ungli उंगली elbow* kohni कोहनी leg legs pair पैर tango टांगों walking gait balance jaw jabda जबड़े ear kaan कान eye eyes aankh आंख face chehra चेहरा dizzy dizziness headache";
const FOREIGN_W = "thoracic knee* ankle* foot feet toe* hip* groin lower_back low_back lumbar kamar कमर ghutna घुटना takhna टखना stomach pet पेट tooth teeth chest_pain";
const FAMILY_W = WORDS.FAMILY;
// A sentence about the neck that mentions these other places is still about the neck.
const EXEMPT = [
  "redFlagsMyelopathy|Bilateral lower limb weakness or stiffness",
  "redFlagsMyelopathy|Unexplained falls",
  "redFlagsMyelopathy|Gait disturbance / wide-based gait / ataxia",
  "redFlagsMyelopathy|Bladder dysfunction — new onset",
  "redFlagsMyelopathy|Bowel dysfunction — new onset",
  "redFlagsVbi|Drop attacks",
  "redFlagsVbi|Dysphagia (difficulty swallowing)",
  "redFlagsVbi|Numbness — face or bilateral limbs",
  "fractureScreen|High-energy trauma (MVA / fall >1m / diving)",
  "fnAdl|Sleeping — position difficulty",
];

const matcher = createPhraseMatcher({
  phrases: CERVICAL_PHRASES,
  singleChoiceFields: ["armPresent", "lhermitte", "haPresent"],
  noneOptions: {
    radiation: "No radiation — local only",
    redFlagsMyelopathy: "No myelopathy signs",
    redFlagsVbi: "No VBI signs",
    redFlagsInstability: "No instability signs",
    redFlagsOther: "No other red flags",
    fnAdl: "No functional limitation",
    fractureScreen: "Not applicable",
    armPresent: "No arm or hand symptoms",
    haPresent: "No headache",
    lhermitte: "No",
  },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  guardExempt: EXEMPT,
  optionGuards: {
    "redFlagsOther|Known cervical cancer / tumour": FAMILY_W,
    "redFlagsInstability|Rheumatoid arthritis — known": FAMILY_W,
    "redFlagsInstability|Down syndrome / trisomy 21": FAMILY_W,
  },
  hinglish: [
    [/\s,\s+(?=(?:[^\s,|]+\s+){0,8}(?:better|eases|eased|relieved|helps|helped|improves|aaram|आराम|rahat|राहत)(?=\s|$))/g, " | "], // "worse looking up, and putting the hand on the head eases it" = two statements
    [/\bright (after|away|now|then|here|before)\b/g, "right_$1"],
    [/\b(taang|taango|taangon|taangein|tange|tango)\b/g, "tango"],
    [/\b(peshaab|peshab|pesab|pishab|pesaab)\b/g, "peshab"],
    [/\b(baanh|baah|banh|bahu|baahu)\b/g, "baanh"],
    [/\b(seedhi|sidhi|seedhee|sidhee)\b/g, "seedhi"],
    [/\bsirdard\b/g, "sir dard"],
    ...SIDE_HINGLISH,
    [/\b(gardan|gardhan|gardn|gardaan)\b/g, "gardan"],
    [/\b(kandha|kandhe|kandhon|kanda|kande|kandho)\b/g, "kandha"],
    [/\b(bazu|baju|bajoo|bazoo|bazuon|bajuon|baazu|baaju)\b/g, "bazu"],
    [/\b(haath|hath|hathon|haathon|haathi)\b/g, "haath"],
    [/\b(kohni|kuhni|kohnee|kehni)\b/g, "kohni"],
    [/\b(peeche|piche|pichhe|peechhe|pichche|pichle|pichla)\b/g, "peeche"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche|nichla|nichli|nichle)\b/g, "niche"],
    [/\b(aage|aagey|aga)\b/g, "aage"],
    [/\b(samne|saamne|saame|samney)\b/g, "samne"],
    [/\b(beech|bich|bichh)\b/g, "beech"],
    [/\b(sir|sar|sirr)\b/g, "sir"],
    [/\b(khopdi|khopri|khoprii)\b/g, "khopdi"],
    [/\b(jabda|jabde|jabra|jabre|jabdon)\b/g, "jabda"],
    [/\b(kaan|kaano|kaanon|kan)\b/g, "kaan"],
    [/\b(aankh|aankhon|aankhein|ankh|ankhen|aankhe)\b/g, "aankh"],
    [/\b(chehra|chehre|chehara|chehare)\b/g, "chehra"],
    [/\b(jhukne|jhukna|jhukte|jhukta|jhukti|jhuk|jhukkar|jhukar|jhukane|jhukana|jhukata)\b/g, "jhuk"],
    [/\b(ghumne|ghumna|ghoomne|ghoomna|ghumte|ghumta|ghoomte|ghoomta|ghumane|ghumana|ghumata|ghoomta)\b/g, "ghum"],
    [/\b(dekhne|dekhna|dekhte|dekhta|dekhti|dekh|dekhkar)\b/g, "dekh"],
    [/\b(akdan|akad|akadna|akdi|jakdan|jakad|jakadna|akadne)\b/g, "akdan"],
    [/\b(chakkar|chakar|chakkr|chakker)\b/g, "chakkar"],
    [/\b(bhaari|bhari|bhaaree|bhaarii)\b/g, "bhaari"],
    [/\b(wazan|vajan|vazan|wajan|vajn)\b/g, "wazan"],
    [/\b(bukhar|bukhaar|bukar)\b/g, "bukhar"],
    [/\b(neend|nind|neendh)\b/g, "neend"],
    [/\b(shaam|sham)\b/g, "shaam"],
    [/\b(sekai|sek|sekaai|seki)\b/g, "sekai"],
    [/\b(paer|pair|pao|pav|pairon|pairo|paero|payron)\b/g, "pair"],
    [/\b(khichav|khichaav|khinchav|khichao|khinchaav|khichaw)\b/g, "khichav"],
    [/\b(thuddi|thudi|thoddi)\b/g, "thuddi"],
    [/\b(takleef|taklif|takleeph)\b/g, "takleef"],
    [/\b(peshab|pesab|pishab)\b/g, "peshab"],
    [/\b(potty|potti|pakhana|shauch)\b/g, "potty"],
  ],
  deva: [
    [/मांसपेशि(यों|यां|यां|याँ|यो)/g, "मांसपेशी"],
    ...SIDE_DEVA,
    [/कंध(ा|े|ों|ो)/g, "कंधा"],
    [/बाजू(ओं|ए|एं|ऐं|ओ)?/g, "बाजू"],
    [/झुक(ना|ने|ते|ता|ती|कर|ाने|ाना|ाता)?/g, "झुक"],
    [/घूम(ना|ने|ते|ता|ती)?/g, "घूम"],
    [/घुमा(ना|ने|ते|ता|ती)/g, "घूम"],
    [/मुड(ना|ने|ते|ता|ती)/g, "मुड"],
    [/देख(ना|ने|ते|ता|ती|कर)?/g, "देख"],
    [/पैर(ों)?/g, "पैर"],
    [/आंख(ें|ों|ो)?/g, "आंख"],
  ],
  rules: ({ rule, O }) => {
    // ───── shared word lists ─────
    const NECK = "neck* gardan गर्दन cervical";
    const ARM = "arm arms baanh बांह bazu बाजू";
    const HAND = "hand hands finger fingers fingertips thumb palm ungli उंगली panja पंजा haath हाथ";
    const SHOULDER = "shoulder shoulders upper_arm kandha कंधा";
    const SPREAD = "goes go going radiat* spread* travel* shoots shoot refer* down jata जाता utarta उतरता failta फैलता aata आता";
    const PAINX = PAIN_W + " agony agonising excruciating unbearable terrible awful worst worse killing";
    const TRIG = "set_off set_it_off sets_it_off sets_off brings_it_on bring_it_on brought_it_on triggers triggered trigger brings_on aggravates aggravated worsens worsened flares flare flared makes_it_worse make_it_worse hurts hurt bothers";
    const WHEN = "when whenever while on during with every each par पर jab जब";
    const HELP = "help helps helped helping takes_pressure_off take_pressure_off takes_off takes_away take_away took_away gets_rid relax relaxes relaxed loosen loosens relief relieve relieves relieved ease eases eased settle settles settled calm calms soothe soothes better improves improved works worked aaram आराम rahat राहत fayda फायदा kam कम";
    const SYMP = PAIN_W + " " + NERVE_W + " weak* weakness heavy burner burners stinger tingling tingle tingles tingled paraesthesia paresthesia numb* pins sunn* सुन्न* jhunjhuni झुनझुनी झनझनाहट kamzor कमजोर takleef तकलीफ";
    const CANT = "struggles cant cannot unable no_longer not_possible impossible afraid scared fear dar डर difficulty difficult trouble hard mushkil मुश्किल dikkat दिक्कत nahi नहीं stop* stopped quit given_up give_up gave_up giving_up avoid* band बंद struggle struggling";
    const CANTP = CANT + " " + PAIN_W + " problem problems";
    const HW = "headache* migraine* sir_dard सिर_दर्द सिरदर्द sirdard";
    const DIFFW = "worse worst hurts hurt painful pain hard harder difficult difficulty struggle struggles struggling trouble limited limits cant cannot unable dikkat दिक्कत mushkil मुश्किल badh* बढ़* aggravat* khichav खिंचाव strain tension";
    const FN = (extra = {}) => ({ selfNeg: true, blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी", ...extra, unless: "started began start onset " + (extra.unless || "") });

    // ───── location ─────
    const L = (i) => O("location", i);
    const [SUBOCC, UPPERC, MIDC, LOWERC, ANTN, POSTN, LATL, LATR, CTJ, TRAPL, TRAPR, LEVAT, SCM, SCAL] = Array.from({ length: 14 }, (_, i) => L(i));
    rule("location", SUBOCC, ["base bottom aadhar आधार jod जोड़ neeche niche नीचे under below beneath", "skull khopdi खोपड़ी occiput sir सिर head"], 5, { ctx: "painOrArm", unless: "upper mid middle lower" });
    rule("location", UPPERC, ["upper upari upar ऊपरी ऊपर top high_up", NECK], 5, { unless: "mid middle lower back", block: "shoulder shoulders kandha कंधा", blockAfter: "of_the shoulder shoulders kandha कंधा" });
    rule("location", MIDC, ["mid middle beech बीच centre center madhya मध्य", NECK], 3, { unless: "upper lower back" });
    rule("location", LOWERC, ["lower bottom niche नीचे nichla निचला", NECK], 3, { unless: "upper mid middle back skull sir head" });
    rule("location", ANTN, ["front anterior aage आगे samne सामने", NECK], 3, { ctx: "pain", unless: "head sir back" });
    rule("location", POSTN, ["back posterior peeche पीछे nape pichle", NECK], 3, { ctx: "pain", blockAfter: "karne करने karna kar कर", unless: "head sir skull front shoulder blade lower_back" });
    rule("location", LATL, [LEFT_W, NECK], 5, { ctx: "pain", block: "arm arms hand hands finger fingers fingertips shoulder bazu बाजू haath हाथ kandha कंधा elbow kohni going radiating spreading turn* turning rotat* rotating look* looking tilt* tilting bend* bending ghum* mud* mod dekh* movement", blockBefore: "turn* turning rotat* rotating look* looking tilt* tilting bend* bending ghum* mud* mod dekh* jhuk* झुक* movement", blockAfter: "arm arms hand hands finger fingers bazu बाजू haath हाथ trap traps trapezius kandha कंधा shoulder ghum* mud* mod jhuk* dekh* turn* look* tilt* bend*", unless: "right dayen दायां" });
    rule("location", LATR, [RIGHT_W, NECK], 5, { ctx: "pain", block: "arm arms hand hands finger fingers fingertips shoulder bazu बाजू haath हाथ kandha कंधा elbow kohni going radiating spreading turn* turning rotat* rotating look* looking tilt* tilting bend* bending ghum* mud* mod dekh* movement", blockBefore: "turn* turning rotat* rotating look* looking tilt* tilting bend* bending ghum* mud* mod dekh* jhuk* झुक* movement", blockAfter: "arm arms hand hands finger fingers bazu बाजू haath हाथ trap traps trapezius kandha कंधा shoulder ghum* mud* mod jhuk* dekh* turn* look* tilt* bend*", unless: "left bayen बायां" });
    rule("location", CTJ, ["junction base bottom aadhar आधार jod जोड़", NECK, "back peeth पीठ shoulders shoulder"], 7, { ctx: "painOrArm", unless: "skull head" });
    rule("location", TRAPL, [LEFT_W, "trapezius trap traps upper_trap"], 4);
    rule("location", TRAPR, [RIGHT_W, "trapezius trap traps upper_trap"], 4);
    rule("location", TRAPL, [LEFT_W, "kandha कंधा shoulder", "maspeshi मांसपेशी muscle", "upar ऊपर top"], 6);
    rule("location", TRAPR, [RIGHT_W, "kandha कंधा shoulder", "maspeshi मांसपेशी muscle", "upar ऊपर top"], 6);
    rule("location", LEVAT, ["levator"], 1);
    rule("location", LEVAT, [NECK, "shoulder_blade shoulder_blades scapula scapulae", "between angle corner knot"], 8, { ctx: "painOrArm" });
    rule("location", SCM, ["sternocleidomastoid sternomastoid scm"], 1);
    rule("location", SCAL, ["scalene scalenes"], 1);

    // ───── radiation ─────
    const R = (i) => O("radiation", i);
    const [RNONE, ROCC, REYE, RTEMP, RJAW, REAR, RSHTOP, RSHL, RSHR, RARML, RARMR, RHANDL, RHANDR, RBIL, RCHEST, RBLADE] = Array.from({ length: 16 }, (_, i) => R(i));
    rule("radiation", RNONE, ["doesnt does_not dont not no never nahi नहीं", "travel* spread* radiat* shoot* jata जाता failta फैलता"], 3, { selfNeg: true });
    rule("radiation", ROCC, [SPREAD, "back_of_head back_of_head occiput occipital sir_ke_peeche सिर_के_पीछे"], 8);
    rule("radiation", REYE, ["behind peeche पीछे", "eye eyes eyeball aankh आंख"], 3, { ctx: "painOrArm" });
    rule("radiation", RTEMP, ["temple temples temporal kanpati कनपटी"], 1, { ctx: "painOrArm" });
    rule("radiation", RJAW, ["jaw jabda जबड़े tmj"], 1, { ctx: "painOrArm" });
    rule("radiation", REAR, ["ear kaan कान"], 1, { ctx: "painOrArm", unless: "earlier year years near hear phone mobile holding held toward towards tilt* drop* dropping lean* leaning" });
    rule("radiation", RSHTOP, ["top tip nok नोक upar ऊपर", "shoulder* kandha कंधा"], 4, { ctx: "painOrArm", unless: "maspeshi मांसपेशी muscle trapezius trap knots knot bands band trigger both dono दोनों" });
    rule("radiation", RSHL, [LEFT_W, "shoulder upper_arm kandha कंधा"], 4, { ctx: "painOrArm", unless: "right dayen दायां top_of tip_of upar ऊपर look looking over turn* turning toward towards tilt* bend* bending drop* dropping lean* leaning", block: "trapezius trap", blockAfter: "blade blades scapula" });
    rule("radiation", RSHR, [RIGHT_W, "shoulder upper_arm kandha कंधा"], 4, { ctx: "painOrArm", unless: "left bayen बायां top_of tip_of upar ऊपर look looking over turn* turning toward towards tilt* bend* bending drop* dropping lean* leaning", block: "trapezius trap", blockAfter: "blade blades scapula" });
    rule("radiation", RARML, [LEFT_W, ARM], 4, { ctx: "painOrArm", unless: "upper_arm", block: "right dayen दायां दाएं daayein", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("radiation", RARMR, [RIGHT_W, ARM], 4, { ctx: "painOrArm", unless: "upper_arm", block: "left bayen बायां बाएं baayein", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("radiation", RHANDL, [LEFT_W, HAND], 4, { ctx: "painOrArm", block: "right dayen दायां दाएं daayein", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("radiation", RHANDR, [RIGHT_W, HAND], 4, { ctx: "painOrArm", block: "left bayen बायां बाएं baayein", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("radiation", RSHL, [LEFT_W, NECK, SPREAD, "shoulder upper_arm kandha कंधा"], 10, { blockAfter: "blade blades scapula", unless: "right dayen दायां" });
    rule("radiation", RSHR, [RIGHT_W, NECK, SPREAD, "shoulder upper_arm kandha कंधा"], 10, { blockAfter: "blade blades scapula", unless: "left bayen बायां" });
    rule("radiation", RARML, [LEFT_W, NECK, SPREAD, ARM], 10, { unless: "right dayen दायां upper_arm" });
    rule("radiation", RARMR, [RIGHT_W, NECK, SPREAD, ARM], 10, { unless: "left bayen बायां upper_arm" });
    rule("radiation", RHANDL, [LEFT_W, NECK, SPREAD, "hand hands finger fingers fingertips ungli उंगली"], 12, { unless: "right dayen दायां" });
    rule("radiation", RHANDR, [RIGHT_W, NECK, SPREAD, "hand hands finger fingers fingertips ungli उंगली"], 12, { unless: "left bayen बायां" });
    rule("radiation", RBIL, [BOTH_W, "arm arms hand hands bazu बाजू haath हाथ baanh बांह upper_limbs upper_limb", SYMP], 9, { unless: "legs leg pair पैर feet" });
    rule("radiation", RCHEST, [SPREAD, "chest chhati छाती seena सीना"], 7);
    rule("radiation", RBLADE, [SPREAD, "shoulder_blade shoulder_blades blade blades scapula interscapular kandhon_ke_beech"], 6);

    // ───── mechanism ─────
    const M = (i) => O("mechanismType", i);
    const [MINS, MREAR, MFRONT, MSIDE, MHFLEX, MHEXT, MFLROT, MDIRECT, MDIVE, MPOST, MSLEEP, MLIFT, MSURG, MILL] = Array.from({ length: 14 }, (_, i) => M(i));
    const CRASH = "accident crash collision collided smashed rammed ploughed ran_into takkar टक्कर takra टकरा thok ठोक mva rta rtc impact";
    const VEH = "car gaadi गाड़ी bike scooter vehicle lorry truck bus motorbike motorcycle";
    rule("mechanismType", MREAR, ["rear rear_ended rear_end behind peeche_se पीछे_से", CRASH], 6, { unless: "front head_on side" });
    rule("mechanismType", MREAR, ["rear_ended rear_end shunted"], 2);
    rule("mechanismType", MFLROT, ["twisted rotated turned", "looking_down bending_forward bent_forward flexed forward down"], 6, { unless: "hurts hurt painful worse aggravates" });
    rule("mechanismType", MFRONT, ["head_on frontal front_end front samne सामने", CRASH], 6, { unless: "rear behind side" });
    rule("mechanismType", MFRONT, ["head_on frontal front_end", "hit hits struck crashed collided wall tree pole car"], 4);
    rule("mechanismType", MREAR, ["rear behind peeche_se पीछे_से", "hit hits struck", VEH], 6, { unless: "front head_on side" });
    rule("mechanismType", MSIDE, ["side_impact side_on t_boned side bagal बगल", CRASH], 6, { unless: "rear behind front head_on" });
    rule("mechanismType", MHFLEX, ["forced snapped thrown driven jerked jhatka झटका", "forward forwards aage आगे flexion"], 6, { ctx: "painOrArm", unless: "extension" });
    rule("mechanismType", MHEXT, ["forced snapped thrown driven jerked jhatka झटका", "back backwards peeche पीछे extension"], 6, { ctx: "painOrArm", unless: "flexion" });
    rule("mechanismType", MDIRECT, ["hit blow banged struck knocked fell_on thok", "head neck sir सिर gardan गर्दन"], 7, { unless: "car bike accident collision crash wall hit_from dive diving dived swimming pool" });
    rule("mechanismType", MDIVE, ["dive diving dived swimming pool shallow", "water pool hit bottom sir सिर takra टकरा"], 8);
    rule("mechanismType", MDIVE, ["dive dived diving", "shallow water pool end"], 6);
    rule("mechanismType", MPOST, ["posture slouch* hunch* desk laptop computer mobile phone screen", "hours years long ghante घंटे ghanto घंटों der देर lambe लंबे"], 8, { unless: "cant cannot unable possible brings_it_on brings_on makes_it_worse make_it_worse worse worsens aggravates triggers set_it_off" });
    rule("mechanismType", MSLEEP, ["slept sleeping sleep woke wake waking uthte उठते so सो sote सोते sone सोने", "awkward wrong bad pillow position sofa twisted stiff crick galat गलत ajeeb अजीब draught draft akdan अकड़न अकड़ी locked stuck atak अटक jam जाम takiye तकिये"], 8, { ctx: "painOrArm", unless: "and_so" });
    rule("mechanismType", MLIFT, ["lift* lifted lifting carry carrying carried uthane उठाने uthate उठाते", "heavy weight box bag suitcase sack bori बोरी bhaari भारी wazan वजन bojh बोझ"], 8, { ctx: "painOrArm", unless: "cant cannot unable avoid" });
    rule("mechanismType", MSURG, ["surgery operation operated ऑपरेशन सर्जरी fusion", "after post since following baad बाद"], 6);
    rule("mechanismType", MILL, ["viral flu fever infection cold bukhar बुखार bimari बीमारी", "after post following baad बाद"], 6, { unless: "with_fever" });
    rule("mechanismType", MINS, ["gradual gradually slowly slow dheere धीरे", "start* began onset shuru शुरू come came badh बढ़ worse worsen* worsened increas*"], 6, { ctx: "painOrArm", selfNeg: true, unless: "improv* better theek ठीक kam कम settl*" });
    rule("mechanismType", MINS, ["no without", "accident injury trauma"], 4, { selfNeg: true, unless: "history previous before other fracture" });
    rule("mechanismType", MINS, ["built_up crept_up creeping gradual_onset"], 2);
    rule("mechanismType", MINS, ["no without bina बिना", "injury trauma accident chot चोट", "gradual slowly dheere धीरे started shuru"], 9, { selfNeg: true });

    // ───── arm / hand symptoms (one answer) ─────
    const AP = (i) => O("armPresent", i);
    const [ANO, AL, AR, ABIL] = Array.from({ length: 4 }, (_, i) => AP(i));
    rule("armPresent", AL, [LEFT_W, ARM + " " + HAND, SYMP], 14, { unless: "both dono दोनों", block: "right dayen दायां दाएं daayein jhuk* झुक* bend* bending tilt* tilting", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("armPresent", AR, [RIGHT_W, ARM + " " + HAND, SYMP], 14, { unless: "both dono दोनों right_after right_away right_now right_then", block: "left bayen बायां बाएं baayein jhuk* झुक* bend* bending tilt* tilting", blockBefore: "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards" });
    rule("armPresent", AL, [LEFT_W, NECK, SPREAD, ARM + " " + HAND], 12, { unless: "right dayen दायां" });
    rule("armPresent", AR, [RIGHT_W, NECK, SPREAD, ARM + " " + HAND], 12, { unless: "left bayen बायां" });
    rule("armPresent", ABIL, [BOTH_W, "arm arms hand hands bazu बाजू haath हाथ baanh बांह", SYMP], 9, { unless: "legs leg pair पैर feet" });
    rule("armPresent", ANO, ["no without nahi नहीं koi कोई", "arm arms hand hands bazu बाजू haath हाथ", "symptom symptoms tingling numbness numb pins pins_and_needles pain weakness jhunjhuni झनझनाहट sunn सुन्न dikkat दिक्कत takleef"], 6, { selfNeg: true, unless: "difference farak फर्क फरक change changes changed alter alters altered" });

    // ───── Lhermitte's sign (one answer) ─────
    const LH = (i) => O("lhermitte", i);
    const [LNO, LYES, LUNS, LNOT] = Array.from({ length: 4 }, (_, i) => LH(i));
    rule("lhermitte", LYES, ["shock shocks karant करंट bijli बिजली zap zaps zapping electric electricity electrical", "spine back reedh रीढ peeth पीठ down", "neck gardan गर्दन flex* bend* look* chin niche नीचे jhuk झुक dekh देख"], 12, { unless: "no not nahi नहीं never", selfNeg: true });
    rule("lhermitte", LNO, ["no not never nahi नहीं", "shock shocks karant करंट bijli बिजली electric zap lhermitte"], 5, { selfNeg: true });
    rule("lhermitte", LUNS, ["unsure not_sure pata_nahi पता_नहीं shayad शायद maybe might", "shock shocks karant करंट bijli बिजली electric zap lhermitte"], 7, { selfNeg: true });
    rule("lhermitte", LNOT, ["not_assessed not_tested not_checked nahi_dekha नहीं_देखा", "lhermitte lhermittes"], 6, { selfNeg: true });

    // ───── aggravating movements ─────
    const RELIEFW = "relieves relieved relief eases ease easier better improves helps help soothes settles";
    const aggRule = (opt, groups, win, o = {}) => rule("aggMovements", opt, groups, win, { ...o, unless: ((o.unless || "") + " " + RELIEFW).trim(), blockAfter: ((o.blockAfter || "") + " fine ok okay normal").trim(), reliefKills: true, reliefAfter: true });
    const A = (i) => O("aggMovements", i);
    const [AFLEX, AEXT, AROTL, AROTR, ASBL, ASBR, AQL, AQR, AFLROT, ASUST, AQUICK, AALL] = Array.from({ length: 12 }, (_, i) => A(i));
    aggRule(AFLEX, ["looking look bending bend flex* jhuk* झुक* dekh* देख* chin", "down niche नीचे forward aage आगे phone mobile reading screen"], 4, { ctx: "pain", block: "up upar ऊपर back backwards peeche पीछे turn* rotat* ghum*" , reliefKills: true, reliefAfter: true });
    aggRule(AFLEX, ["looking_down look_down bending_forward bending_down flexing phone mobile reading", PAINX + " " + TRIG], 8, { reliefKills: true, reliefAfter: true });
    aggRule(AEXT, ["looking look tilt* bend* bending extend* extension head_back dekh* देख* jhuk* झुक*", "up upar ऊपर back backwards peeche पीछे ceiling chhat"], 4, { ctx: "painOrArm", unless: "forward forwards aage आगे down_back", block: "down niche नीचे turn* rotat* ghum*", blockAfter: "left right bayen dayen बायां दायां", reliefKills: true, reliefAfter: true });
    aggRule(AROTL, [LEFT_W, "turn* turning rotat* look* looking ghum* घूम* mud* मुड़* mod dekh* देख*"], 6, { ctx: "painOrArm", unless: "extend* extension up upar ऊपर back backwards peeche tilt* bend* jhuk* झुक* side_bend arm arms hand" , reliefKills: true, reliefAfter: true });
    aggRule(AROTR, [RIGHT_W, "turn* turning rotat* look* looking ghum* घूम* mud* मुड़* mod dekh* देख*"], 6, { ctx: "painOrArm", unless: "extend* extension up upar ऊपर back backwards peeche tilt* bend* jhuk* झुक* side_bend arm arms hand" , reliefKills: true, reliefAfter: true });
    aggRule(ASBL, [LEFT_W, "side_bend tilt* tilting bend* bending jhuk* झुक* ear kaan कान lean* leaning leaned"], 6, { blockNext: "haath हाथ bazu बाजू baanh बांह kandha कंधा arm arms hand hands", ctx: "painOrArm", unless: "turn* rotat* ghum* look* looking extension elbow kohni कोहनी wrist peeche पीछे backward backwards" , reliefKills: true, reliefAfter: true });
    aggRule(ASBR, [RIGHT_W, "side_bend tilt* tilting bend* bending jhuk* झुक* ear kaan कान lean* leaning leaned"], 6, { blockNext: "haath हाथ bazu बाजू baanh बांह kandha कंधा arm arms hand hands", ctx: "painOrArm", unless: "turn* rotat* ghum* look* looking extension elbow kohni कोहनी wrist peeche पीछे backward backwards" , reliefKills: true, reliefAfter: true });
    aggRule(AQL, [LEFT_W, "up upar ऊपर back backwards peeche पीछे extension quadrant", "turn* turned rotat* ghum* घूम* mud* मुड़* mod dekh* देख* look* looking"], 9, { reliefKills: true, reliefAfter: true });
    aggRule(AQR, [RIGHT_W, "up upar ऊपर back backwards peeche पीछे extension quadrant", "turn* turned rotat* ghum* घूम* mud* मुड़* mod dekh* देख* look* looking"], 9, { reliefKills: true, reliefAfter: true });
    aggRule(AFLEX, ["sir सिर head gardan गर्दन", "jhuk* झुक*", PAIN_W], 6, { unless: "side tedhi peeche back backwards taraf तरफ left right bayen dayen बायां दायां" });
    aggRule(AFLROT, ["down niche नीचे forward aage आगे jhuk* झुक* flexion bend* bending", "turn* turning rotat* twist* ghum* घूम* mud* मुड़* mod"], 6, { unless: "twisted rotated extension up upar ऊपर back backwards peeche" , reliefKills: true, reliefAfter: true });
    aggRule(ASUST, ["same one single sustained prolonged ek_hi एक_ही long der देर lambe लंबे", "position posture mudra मुद्रा sthiti स्थिति holding keeping rakhne रखने"], 8, { ctx: "pain" , reliefKills: true, reliefAfter: true });
    aggRule(AQUICK, ["sudden suddenly quick quickly jerky jerk jerks abrupt jolt achanak अचानक jhatke झटके tezi तेजी", "movement movements motion turn* harkat हरकत hilne हिलने ghum*"], 6, { ctx: "painOrArm" , reliefKills: true, reliefAfter: true });
    aggRule(AQUICK, ["sudden suddenly quick jerk jerks jerky abrupt jolt achanak अचानक jhatke झटके", "movement movements motion harkat हरकत hilne हिलने", PAINX + " " + TRIG], 10, { reliefKills: true, reliefAfter: true });
    aggRule(ASUST, ["one_position same_position single_position same_posture one_posture ek_hi एक_ही", "hours long prolonged der देर ghante घंटे ghanto घंटों", PAINX + " " + TRIG], 12, { reliefKills: true, reliefAfter: true });
    aggRule(AALL, ["all every any sab har हर", "movement movements direction directions harkat हरकत disha दिशा"], 5, { ctx: "pain" , reliefKills: true, reliefAfter: true });

    // ───── relieving movements ─────
    const RM = (i) => O("relMovements", i);
    const [RCHIN, RRETR, REXT, RFLEX, RROTL, RROTR, RMCK, RSCAP, RELEV, RARM, RSTRETCH, RSHOWER] = Array.from({ length: 12 }, (_, i) => RM(i));
    rule("relMovements", RCHIN, ["chin_tuck chin_tucks chin_in thuddi", HELP], 6, { blockAfter: "nothing none" });
    rule("relMovements", RRETR, ["retraction retract* pulling_head sir_ko_peeche", HELP], 10, { blockAfter: "nothing none", unless: "scapular scapula shoulder_blade shoulder_blades blade blades" });
    rule("relMovements", REXT, ["looking_up tilting_back head_back bending_backwards neck_extension upar_dekhne ऊपर_देखने peeche_jhukne", HELP], 7, { blockAfter: "nothing none" });
    rule("relMovements", RFLEX, ["looking_down bending_forward neck_flexion chin_to_chest neeche_dekhne नीचे_देखने aage_jhukne", HELP], 7, { blockAfter: "nothing none" });
    rule("relMovements", RROTL, [LEFT_W, "turn* turning rotat* look* looking ghum* घूम* mud* मुड़* dekh* देख*", HELP], 9, { blockAfter: "nothing none" });
    rule("relMovements", RROTR, [RIGHT_W, "turn* turning rotat* look* looking ghum* घूम* mud* मुड़* dekh* देख*", HELP], 9, { blockAfter: "nothing none" });
    rule("relMovements", RMCK, ["direction disha दिशा mckenzie preference", HELP], 8, { blockAfter: "nothing none" });
    rule("relMovements", RSCAP, ["shoulder_blade shoulder_blades scapular kandhe_peeche कंधे_पीछे shoulders_back pulling_shoulders squeeze squeezing pinch pinching शोल्डर_ब्लेड", HELP], 14, { blockAfter: "nothing none" });
    rule("relMovements", RELEV, ["shrug shrugging shrugs raising_shoulder shoulders_up kandhe_upar कंधे_ऊपर ucchkane uchkane उचकाने sikodne सिकोड़ने", HELP], 14, { blockAfter: "nothing none" });
    rule("relMovements", RARM, ["hand arm haath हाथ bazu बाजू", "overhead head sir सिर top upar ऊपर", HELP], 9, { blockAfter: "nothing none" });
    rule("relMovements", RSTRETCH, ["stretch* स्ट्रेच* khichav खिंचाव tanne तानने", HELP], 14, { blockAfter: "nothing none" });
    rule("relMovements", RSHOWER, ["shower hot_water garam_paani गरम_पानी गर्म_पानी nahane नहाने", "neck gardan गर्दन", HELP], 10, { blockAfter: "nothing none" });
    rule("relMovements", RSHOWER, ["shower hot_shower hot_water garam_paani गरम_पानी गर्म_पानी nahane नहाने", HELP], 12, { blockAfter: "nothing none" });

    // ───── 24-hour pattern ─────
    const P = (i) => O("overallPattern", i);
    const [PCONST, PCONSTVAR, PINTTRIG, PINTUNP, PACT, PPOS, PMORN, PEVE, PNIGHT, PFLARE, PWARM, PGONE] = Array.from({ length: 12 }, (_, i) => P(i));
    rule("overallPattern", PCONST, [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops nonstop non_stop din_bhar pura_din poora_din पूरा_दिन पूरे_दिन har_waqt har_samay हर_समय lagatar लगातार din_raat दिन_रात"], 8, { selfNeg: true, noComma: true, block: "after when while during from if only jab जब", unless: "badh* बढ़* builds build building" });
    rule("overallPattern", PCONST, ["never", "away stops ends eases go goes", PAIN_W], 6, { selfNeg: true });
    rule("overallPattern", PINTUNP, ["unpredictable random randomly no_pattern out_of_nowhere no_reason", PAIN_W + " pain episodes episode attacks attack"], 6, { selfNeg: true });
    rule("overallPattern", PINTUNP, ["comes_and_goes on_and_off intermittent come_and_go", "no_pattern random unpredictable no_reason"], 8, { selfNeg: true });
    rule("overallPattern", PCONST, ["constant continuous persistent lagatar लगातार", PAIN_W], 3);
    rule("overallPattern", PCONSTVAR, ["always constant present never_goes", "varies varying fluctuates fluctuating some_days some_hours sometimes worse_than_others up_and_down"], 10);
    rule("overallPattern", PPOS, ["depends depend dependent", "hold holding position posture"], 6);
    rule("overallPattern", PINTTRIG, ["certain specific particular khaas खास", "things activities movements harkat हरकत kaam काम"], 4, { ctx: "pain" });
    rule("overallPattern", PACT, ["only sirf सिर्फ", "activity activities exercise kaam काम work working"], 7);
    rule("overallPattern", PACT, ["only sirf सिर्फ", "game games sport sports playing play match contact training"], 6);
    rule("overallPattern", PMORN, ["morning subah सुबह uthte उठते", PAIN_W + " stiff* akdan akad* अकड़* jakad* जकड़*"], 6, { noComma: true });
    rule("overallPattern", PEVE, ["evening shaam शाम end_of_day by_evening din_dhalte दिन_ढलते", "worse worst more zyada ज्यादा badh बढ़ " + PAINX], 6, { reliefKills: true, noComma: true });
    rule("overallPattern", PNIGHT, ["night raat रात", "worse worst wakes woke jaga जगा khul खुल badh बढ़ zyada ज्यादा"], 6, { ctx: "pain", reliefKills: true, unless: "sweats sweat sweating sweaty" });
    rule("overallPattern", PNIGHT, ["night raat रात", PAIN_W], 6, { reliefKills: true, noComma: true, block: "only_when only_if only_while when while if jab जब sweats sweat sweating began started start came" });
    rule("overallPattern", PWARM, ["warm* loosen* ease* eases improve* better aaram आराम rahat राहत kam कम", "moving move movement walk walking walks hilne हिलने chalne चलने once_i_get_going"], 8, { unless: "worse" });
    rule("overallPattern", PGONE, ["gone nothing fine ok okay symptom_free pain_free normal bilkul_nahi बिल्कुल_नहीं kuch_nahi कुछ_नहीं", "between beech बीच episodes episode attacks attack flare_ups daure दौरे"], 8, { selfNeg: true });
    rule("overallPattern", PFLARE, ["flare flares flared flare_ups episodes episode attacks daura दौरा", "constant background always hamesha हमेशा lagatar लगातार baseline ongoing"], 8, { ctx: "pain" });

    // ───── headache (one answer) ─────
    const HP = (i) => O("haPresent", i);
    const [HNO, HPRIM, HSEC, HCONC, HPREV] = Array.from({ length: 5 }, (_, i) => HP(i));
    rule("haPresent", HNO, ["no without dont doesnt never nahi नहीं", HW], 4, { selfNeg: true });
    rule("haPresent", HPRIM, [HW, "main primary mukhya मुख्य biggest worst_part worst_thing sabse_badi सबसे_बड़ी mostly mainly most bother* bothers zyadatar ज्यादातर complaint problem"], 6);
    rule("haPresent", HSEC, [HW, "neck gardan गर्दन"], 7, { unless: "no not nahi नहीं without unrelated separate main primary chief mukhya मुख्य minor" });
    rule("haPresent", HCONC, [HW, "unrelated separate alag अलग also too bhi भी concurrent"], 7);
    rule("haPresent", HPREV, [HW, "past previous previously used_to before pehle पहले years_ago purane पुराने"], 7, { selfNeg: true });

    // ───── myelopathy screen ─────
    const MY = (i) => O("redFlagsMyelopathy", i);
    const [MYNO, MYHAND, MYFINE, MYGAIT, MYFALL, MYLEG, MYHYPER, MYBAB, MYHOFF, MYBLAD, MYBOW, MYLHER, MYPROG] = Array.from({ length: 13 }, (_, i) => MY(i));
    rule("redFlagsMyelopathy", MYHAND, [BOTH_W, "hand hands haath हाथ fingers grip", "numb* clumsy weak* tingl* pins pins_and_needles sunn* सुन्न* pakad पकड़ drop* gir* गिर* jhunjhuni झनझनाहट kamzor कमजोर"], 9);
    rule("redFlagsMyelopathy", MYFINE, ["button buttons writing handwriting write pen pencil spoon dropping drops dropped likhne लिखने dexterity fine_motor fine_movements", "difficulty difficult struggle struggles struggling trouble hard cant cannot unable dikkat दिक्कत mushkil मुश्किल worse clumsy fumbl* nahi नहीं"], 8, { selfNeg: true, blockAfter: "nahi नहीं", blockBefore: "koi कोई" });
    rule("redFlagsMyelopathy", MYFINE, ["fine_motor fine_finger dexterity"], 2);
    rule("redFlagsMyelopathy", MYGAIT, ["unsteady staggering stagger* wobbl* off_balance unbalanced ladkhada* लड़खड़ा* santulan संतुलन ataxi* wide_based", "walk walking gait chalne चलने chalte चलते feet foot"], 8);
    rule("redFlagsMyelopathy", MYFALL, ["fall falls falling fell fallen gir* गिर*", "unexplained no_reason without_reason repeated repeatedly keeps frequent often baar_baar बार_बार bina_wajah बिना_वजह several twice thrice couple times baar बार x2 x3 multiple"], 7, { selfNeg: true });
    rule("redFlagsMyelopathy", MYLEG, [BOTH_W + " legs", "legs leg pair पैर tango टांगों", "weak* weakness stiff* heavy heaviness spastic kamzor कमजोर akdan अकड़न जकड़न sakht सख्त bhaari भारी"], 8);
    rule("redFlagsMyelopathy", MYLEG, ["pair पैर tango टांगों legs leg", "weak* weakness stiff* heavy heaviness spastic kamzor कमजोर akdan अकड़न जकड़न sakht सख्त bhaari भारी"], 5, { unless: "left right bayen dayen बायां दायां one_leg ek एक single" });
    rule("redFlagsMyelopathy", MYGAIT, ["unsteady unbalanced off_balance staggering wobbly"], 2, { unless: "head neck gardan गर्दन sir सिर" });
    rule("redFlagsMyelopathy", MYPROG, ["progress* progressing worsening deteriorating", "weak* numb* sunn* symptoms neurological"], 8);
    rule("redFlagsMyelopathy", MYBLAD, ["bladder urine peshab पेशाब urinary", "new difficulty cant cannot hold holding control leak* incontinen* retention urgency nayi नई rokne रोकने dikkat दिक्कत"], 8);
    rule("redFlagsMyelopathy", MYBOW, ["bowel bowels stool potty पॉटी faecal fecal", "new difficulty control leak* incontinen* constipation nayi नई rokne रोकने dikkat दिक्कत kabz कब्ज"], 8);
    rule("redFlagsMyelopathy", MYPROG, ["rapid* quickly fast tezi तेजी", "progress* worsen* worse deteriorat* badh बढ़ kharab खराब bigad बिगड़"], 6);
    rule("redFlagsMyelopathy", MYBAB, ["babinski babinskis", "positive present"], 4);
    rule("redFlagsMyelopathy", MYBAB, ["upgoing up_going extensor", "toe toes plantar response"], 4);
    rule("redFlagsMyelopathy", MYHOFF, ["hoffman hoffmans hoffmann hoffmanns", "positive present"], 4);
    rule("redFlagsMyelopathy", MYLHER, ["lhermitte lhermittes", "sign positive present hai yes"], 4);
    rule("redFlagsMyelopathy", MYLHER, ["shock shocks karant करंट bijli बिजली zap zaps zapping electric electricity electrical", "spine back reedh रीढ peeth पीठ down", "neck gardan गर्दन flex* bend* look* chin niche नीचे jhuk झुक dekh देख"], 12, { unless: "no not nahi नहीं never", selfNeg: true });

    // ───── VBI screen ─────
    const VB = (i) => O("redFlagsVbi", i);
    const [VNO, VDIZ, VDIP, VDROP, VDYS, VDYSP, VATAX, VNAUS, VNYS, VNUMB, VTHUN, VHORN] = Array.from({ length: 12 }, (_, i) => VB(i));
    rule("redFlagsVbi", VDIZ, ["dizzy dizziness giddy giddiness vertigo lightheaded faint woozy swim swims swimming chakkar चक्कर spinning", "neck head gardan गर्दन sir सिर turn* rotat* look* ghum* घूम* movement move moving hilane हिलाने"], 8);
    rule("redFlagsVbi", VDIP, ["double doubles doubled doubling diplopia dohra दोहरा do_do दो_दो", "vision see* seeing look looks looking dikh* दिख* images"], 4);
    rule("redFlagsVbi", VDROP, ["drop dropped collapse* collapsed legs_give_way gir* गिर*", "suddenly sudden no_warning without_warning achanak अचानक bina_warning"], 8, { selfNeg: true });
    rule("redFlagsVbi", VDYS, ["slurred slur* dysarthri* ladkhada* लड़खड़ा*", "speech speak speaking words bolne बोलने zubaan जुबान"], 6);
    rule("redFlagsVbi", VDYSP, ["swallow* nigalne निगलने nivala निवाला dysphagi*", "difficulty difficult trouble hard stuck stick sticks atak अटक takleef तकलीफ dikkat दिक्कत mushkil मुश्किल painful cant cannot"], 8);
    rule("redFlagsVbi", VATAX, ["coordination talmel तालमेल ataxi* uncoordinated bumping", "loss lost poor bad kharab खराब bigad बिगड़ trouble difficulty"], 8);
    rule("redFlagsVbi", VNAUS, ["nausea nauseous nauseated queasy sick vomit* ulti उल्टी mitli मितली ji_machal जी_मचल", "neck head gardan गर्दन sir सिर turn* rotat* look* ghum* घूम* movement move moving hilane हिलाने"], 8);
    rule("redFlagsVbi", VNYS, ["nystagmus eyes_flicker eyes_jumping eyes_oscillate eye_jerking", "eyes eye aankh आंख"], 4);
    rule("redFlagsVbi", VNUMB, ["face facial chehra चेहरा mouth munh मुंह lips", "numb* tingl* sunn* सुन्न* jhunjhuni झनझनाहट"], 6);
    rule("redFlagsVbi", VTHUN, ["thunderclap explosive worst_headache worst_headache_ever sudden_worst_headache", "headache sir_dard सिर_दर्द"], 6);
    rule("redFlagsVbi", VTHUN, ["thunderclap explosive"], 1);
    rule("redFlagsVbi", VHORN, ["horners horner ptosis droop* drooping droopy latak लटक", "eyelid eyelids eye palak पलक pupil"], 6);

    // ───── craniovertebral instability ─────
    const IN = (i) => O("redFlagsInstability", i);
    const [INNO, INRA, INDOWN, INTRAUMA, INFUSION, INUNST, INOCC, INSPASM, INFLEX] = Array.from({ length: 9 }, (_, i) => IN(i));
    rule("redFlagsInstability", INRA, ["rheumatoid ra gathiya गठिया", "arthritis disease bimari बीमारी known diagnosed have has hai है history"], 6);
    rule("redFlagsInstability", INDOWN, ["downs down_syndrome trisomy"], 2);
    rule("redFlagsInstability", INTRAUMA, ["recent recently haal हाल last_week days_ago yesterday pichle पिछले kal कल", "trauma injury accident fall fell chot चोट crash"], 8);
    rule("redFlagsInstability", INFUSION, ["fusion fused acdf plates plate", "cervical neck gardan गर्दन surgery operation"], 8);
    rule("redFlagsInstability", INUNST, ["head sir सिर", "unstable loose wobbl* hilta हिलता heavy_for fall_off hold_up sambhal संभाल dhila ढीला", "neck gardan गर्दन"], 8);
    rule("redFlagsInstability", INOCC, ["constant lagatar लगातार relentless unrelenting unrelieved never_settles", "occipital suboccipital base_of_skull base_of_skull khopdi खोपड़ी sir_ke_peeche सिर_के_पीछे"], 8, { selfNeg: true });
    rule("redFlagsInstability", INSPASM, ["spasm spasms spasming guarding rigid clamped kas_gayi कस_गई kas_gayin sakht सख्त", "severe tez तेज bahut बहुत muscles muscle maspeshi मांसपेशी", "neck gardan गर्दन"], 8);
    rule("redFlagsInstability", INFLEX, ["sharp stabbing knife tez तेज chubhne चुभने", "flexion looking_down bend_forward bending_forward jhuk* झुक* dekh* देख* niche नीचे chin down forward", PAIN_W], 8, { unless: "left right side sideways bayen dayen बायां दायां" });

    // ───── other cervical red flags ─────
    const OT = (i) => O("redFlagsOther", i);
    const [OTNO, OTDISS, OTTHUN, OTCA, OTHIGH, OTTORT, OTCONST] = Array.from({ length: 7 }, (_, i) => OT(i));
    rule("redFlagsOther", OTDISS, ["dissection dissected", "carotid vertebral artery arterial dhamni धमनी"], 8);
    rule("redFlagsOther", OTTHUN, ["thunderclap explosive worst_headache worst_headache_ever sudden_worst_headache", "headache sir_dard सिर_दर्द"], 6);
    rule("redFlagsOther", OTTHUN, ["thunderclap explosive"], 1);
    rule("redFlagsOther", OTCA, ["cancer tumor tumour growth malignan* carcinoma lymphoma myeloma metastas* kainsar कैंसर", "history had diagnosed treated known spine neck gardan गर्दन reedh रीढ cervical ilaaj इलाज"], 8);
    rule("redFlagsOther", OTHIGH, ["high_energy major serious bhayankar भयंकर badi बड़ी tez_raftaar", "trauma accident crash collision injury chot चोट takkar टक्कर fall height oonchai ऊंचाई"], 8, { ctx: "painOrArm" });
    rule("redFlagsOther", OTTORT, ["fever bukhar बुखार temperature", "torticollis stiff_neck wry_neck neck_stiffness gardan_akad गर्दन_अकड़ gardan_jam गर्दन_जाम gardan_tedhi गर्दन_टेढ़ी"], 8);
    rule("redFlagsOther", OTCONST, ["weight wazan वजन sweats night_sweats pasina पसीना unwell tired fatigue thakan थकान", "loss lost losing ghat घट* kam कम dropping sweats unexplained"], 8);

    // ───── fracture indicators ─────
    const FR = (i) => O("fractureScreen", i);
    const [FRNA, FRHIGH, FRAXIAL, FRSPASM, FRSPLINT, FRNEURO, FRODON, FRNEXUS, FRCAN, FRFACET, FRCLAY] = Array.from({ length: 11 }, (_, i) => FR(i));
    rule("fractureScreen", FRHIGH, ["high_energy high_speed tez_raftaar major severe serious bhayankar भयंकर", "accident crash collision trauma mva fall takkar टक्कर"], 6);
    rule("fractureScreen", FRHIGH, ["fell fall fallen gir* गिर*", "height metre meter ladder seedhi सीढ़ी roof tree oonchai ऊंचाई"], 8);
    rule("fractureScreen", FRHIGH, ["dive dived diving", "shallow water pool"], 6);
    rule("fractureScreen", FRNA, ["no without", "fracture", "concern risk"], 6, { selfNeg: true });
    rule("fractureScreen", FRAXIAL, ["head sir सिर", "landed hit struck fell_on fell_onto top headfirst head_first gira गिरा lag लग", "top upar ऊपर bal बल headfirst"], 6, { unless: "car accident collision" });
    rule("fractureScreen", FRSPASM, ["immediate immediately instant instantly straight_away turant तुरंत ek_dum एक_दम chot_lagte", "severe terrible agonising tez तेज bahut बहुत", "spasm spasms locked kas कस akdan अकड़न"], 10);
    rule("fractureScreen", FRSPLINT, ["cant cannot unable nahi नहीं", "move turn* hila हिला", "neck gardan गर्दन head sir सिर", "at_all bilkul बिल्कुल completely totally"], 9, { selfNeg: true });
    rule("fractureScreen", FRNEURO, ["numb* tingl* sunn* सुन्न* weak* kamzor कमजोर jhunjhuni झनझनाहट pins", "injury accident fall chot चोट moment immediately straight_after right_after turant तुरंत"], 14);
    rule("fractureScreen", FRODON, ["elderly old older bujurg बुजुर्ग boodhe बूढ़े budhape बुढ़ापे 80 75 70 85 90", "fall fell fallen gir* गिर*"], 8);
    rule("fractureScreen", FRODON, ["odontoid dens peg"], 1);
    rule("fractureScreen", FRNEXUS, ["nexus"], 1);
    rule("fractureScreen", FRCAN, ["canadian", "c_spine cspine rule"], 4);
    rule("fractureScreen", FRFACET, ["facet facets", "dislocat* dislocation locked lock jumped khisak खिसक"], 5);
    rule("fractureScreen", FRCLAY, ["clay_shoveler clay_shovellers shoveler shoveller shovelling shoveling spade belcha बेलचा phawde फावड़े khudai खुदाई digging", "snap snapped crack cracked tooti टूटी tuta jhatka झटका pull"], 8);

    // ───── limited activities ─────
    const N = (i) => O("fnAdl", i);
    const [NNONE, NDRIVE, NSHOULDER, NCOMP, NREAD, NTV, NSLEEP, NHAIR, NOVER, NCARRY, NSPORT, NWORK, NCHILD, NSEX, NCONC, NSOCIAL] = Array.from({ length: 16 }, (_, i) => N(i));
    rule("fnAdl", NDRIVE, [CANTP, "drive driving gaadi गाड़ी chalane चलाने chala चला chalana चलाना reverse reversing"], 9, FN());
    rule("fnAdl", NSHOULDER, [CANTP, "shoulder_check over_shoulder blind_spot blind_spots", "safe safely unsafe road traffic"], 9, FN());
    rule("fnAdl", NSHOULDER, ["unsafe worried worry khatra खतरा", "shoulder_check over_shoulder blind_spot blind_spots traffic_behind"], 8);
    rule("fnAdl", NCOMP, [CANTP, "computer laptop screen screens phone mobile typing keyboard"], 9, FN());
    rule("fnAdl", NREAD, [CANTP, "read reading padh* पढ़* study studying desk"], 9, FN());
    rule("fnAdl", NTV, [CANTP, "tv television film movie netflix"], 9, FN());
    rule("fnAdl", NSLEEP, [CANTP, "sleep sleeping so सो sone sona sote neend नींद comfortable wake waking"], 9, FN({ unless: "khul खुल jati जाती wakes woke jaga जगा" }));
    rule("fnAdl", NHAIR, [CANTP, "hair baal बाल dry drying comb combing dhone धोने sukhane सुखाने"], 9, FN());
    rule("fnAdl", NOVER, [CANTP, "overhead above_head over_head reach reaching shelf shelves hanging_washing hang_washing hang_clothes hanging_clothes washing_line"], 9, FN());
    rule("fnAdl", NCARRY, [CANTP, "lift* carry carrying uthana उठाना utha उठा bag bags shopping rucksack"], 9, FN({ unless: "child baby toddler kids bachcha बच्चा bachche बच्चे waqt वक्त achanak अचानक sudden suddenly" }));
    rule("fnAdl", NSPORT, [CANTP, "gym sport sports football cricket running jogging workout* exercise exercising khel* खेल* jim जिम yoga swimming swim tennis badminton"], 9, FN());
    rule("fnAdl", NWORK, [CANTP, "work job duties kaam काम naukri नौकरी office duty"], 9, FN({ unless: "computer laptop screen typing कंप्यूटर after_work evening" }));
    rule("fnAdl", NCHILD, [CANTP, "child children baby toddler kids bachcha बच्चा bachche बच्चे bachcho बच्चों childcare"], 9, FN());
    rule("fnAdl", NSEX, [CANTP, "sex sexual intimacy intimate sambandh संबंध"], 9, FN());
    rule("fnAdl", NCONC, ["brain_fog foggy poor_concentration cant_concentrate difficulty_concentrating"], 2);
    rule("fnAdl", NWORK, ["cut reduced reduce", "hours"], 3, FN());
    rule("fnAdl", NCONC, [CANTP, "concentrate concentrating concentration focus dhyan ध्यान memory fog foggy"], 9, FN());
    rule("fnAdl", NSOCIAL, [CANTP, "social socially socialising parties party outings going_out bahar_jana बाहर_जाना milna मिलना"], 9, FN());

    // ───── added for the way a CLINICIAN types about a patient (cervicalSheetSet.js) ─────
    const OPPL = "left bayen बायां बाएं baayein", OPPR = "right dayen दायां दाएं daayein";
    const MOVEB = "turn* turning rotate* tilt* tilting bend* bending lean* leaning look* looking away toward towards";
    // location
    rule("location", SUBOCC, ["suboccipital sub_occipital"], 1);
    rule("location", LATL, [LEFT_W, NECK, "spasm spasms tight tightness stiffness muscle knot"], 8, { block: "arm arms hand hands finger fingers fingertips shoulder going radiating spreading turn* turning rotat* rotating look* looking tilt* tilting bend* bending" });
    rule("location", LATR, [RIGHT_W, NECK, "spasm spasms tight tightness stiffness muscle knot"], 8, { block: "arm arms hand hands finger fingers fingertips shoulder going radiating spreading turn* turning rotat* rotating look* looking tilt* tilting bend* bending" });
    rule("location", TRAPL, [BOTH_W, "trapezius trap traps upper_trap upper_traps"], 6);
    rule("location", TRAPR, [BOTH_W, "trapezius trap traps upper_trap upper_traps"], 6);
    rule("location", TRAPL, [BOTH_W, "shoulders kandha कंधा", "bands band knots knot gaanth गांठ trigger"], 9);
    rule("location", TRAPR, [BOTH_W, "shoulders kandha कंधा", "bands band knots knot gaanth गांठ trigger"], 9);
    rule("location", TRAPL, [BOTH_W, "kandha कंधा shoulders", "maspeshi मांसपेशी muscle muscles", "upar ऊपर top"], 9);
    rule("location", TRAPR, [BOTH_W, "kandha कंधा shoulders", "maspeshi मांसपेशी muscle muscles", "upar ऊपर top"], 9);
    // radiation
    rule("radiation", REYE, ["retro_orbital retroorbital orbital"], 1);
    rule("radiation", ROCC, [SPREAD, "back_of_head behind_head"], 14);
    rule("radiation", ROCC, [SPREAD, "behind peeche पीछे", "head sir सिर khopdi"], 14, { ctx: "painOrArm" });
    rule("radiation", RHANDL, [LEFT_W, ARM, "finger fingers fingertips hand hands thumb ungli उंगली"], 8, { ctx: "painOrArm", block: OPPR, blockBefore: MOVEB });
    rule("radiation", RHANDR, [RIGHT_W, ARM, "finger fingers fingertips hand hands thumb ungli उंगली"], 8, { ctx: "painOrArm", block: OPPL, blockBefore: MOVEB });
    rule("radiation", RHANDL, [LEFT_W, "finger fingers pinky thumb ring little", SYMP], 12, { block: OPPR, blockBefore: MOVEB });
    rule("radiation", RHANDR, [RIGHT_W, "finger fingers pinky thumb ring little", SYMP], 12, { block: OPPL, blockBefore: MOVEB });
    // how it started
    rule("mechanismType", MREAR, ["ran_into hit crashed_into rammed bumped", "back rear behind", VEH], 9, { unless: "front head_on side" });
    rule("mechanismType", MREAR, ["rear", "shunt shunts shunted"], 3);
    rule("mechanismType", MSIDE, ["side", "hit hits struck rammed crashed", VEH + " van"], 8, { unless: "rear behind front head_on" });
    rule("mechanismType", MFRONT, ["ahead front in_front", "hit hits ran_into crashed collided rammed", VEH], 8, { unless: "rear behind side" });
    rule("mechanismType", MLIFT, ["lift* lifted lifting carry carrying carried", "heavy weight box bag suitcase sack bori बोरी bhaari भारी"], 6, { unless: "cant cannot unable avoid difficulty" });
    rule("mechanismType", MLIFT, ["lift* lifted lifting", "strain strained pulled sudden suddenly achanak अचानक khichav खिंचाव"], 5, { unless: "cant cannot unable avoid difficulty" });
    rule("mechanismType", MSLEEP, ["woke woken wake waking uthte उठते", "stiff locked stuck atak अटक akdan अकड़* jam जाम torticollis", NECK], 8);
    rule("mechanismType", MSLEEP, ["waking woke wake", "torticollis"], 4);
    rule("mechanismType", MDIVE, ["dive dived diving"], 2, { unless: "scuba" });
    // arm / hand
    rule("armPresent", AL, [LEFT_W, ARM + " " + HAND, SYMP], 14, { unless: "both dono दोनों", block: OPPR + " jhuk* झुक* bend* bending tilt* tilting", blockBefore: MOVEB });
    // Lhermitte
    rule("lhermitte", LYES, ["lhermitte lhermittes", "present positive yes sign"], 4, { unless: "no not negative absent nahi नहीं" });
    // movements that make it worse (fragments such as "Worse: extension, right rotation.")
    const WORSEW = "worse worst worsens worsened aggravates aggravated aggravating triggers triggered set_off sets_off set_it_off sets_it_off brings_on brings_it_on makes_it_worse make_it_worse";
    aggRule(AEXT, ["extension extend* extending", WORSEW], 5);
    aggRule(AFLEX, ["flexion flexing flexed", WORSEW], 5, { unless: "side lateral" });
    aggRule(AEXT, ["looking look tip tilt* extend* dekh* देख*", "up upar ऊपर back backwards", "or ya या and aur और"], 6, { ctx: "painOrArm", block: "down niche नीचे" });
    aggRule(AROTL, [LEFT_W, "rotation rotating rotate turn* turning", WORSEW], 9, { unless: "extension up upar ऊपर back backwards tilt* bend* side_bend arm arms hand" });
    aggRule(AROTR, [RIGHT_W, "rotation rotating rotate turn* turning", WORSEW], 9, { unless: "extension up upar ऊपर back backwards tilt* bend* side_bend arm arms hand" });
    aggRule(ASBL, [LEFT_W, "side_flexion lateral_flexion side_bend", WORSEW], 9);
    aggRule(ASBR, [RIGHT_W, "side_flexion lateral_flexion side_bend", WORSEW], 9);
    aggRule(AQUICK, ["sudden suddenly quick quickly jerk jerks jerky abrupt achanak अचानक", "head neck sir सिर gardan गर्दन", "turn turns turning ghum* घूम* movement movements harkat हरकत jerk jerks hilane हिलाने"], 7, { ctx: "painOrArm" });
    aggRule(AALL, ["everything anything whatever", "neck* head gardan गर्दन sir सिर", PAINX + " " + TRIG], 8);
    aggRule(AALL, ["no none", "movement movements direction directions", "free painfree pain_free"], 5, { selfNeg: true });
    aggRule(ASUST, ["same one single sustained prolonged ek_hi एक_ही long der देर lambe लंबे", "position posture mudra मुद्रा sthiti स्थिति holding holds keeping rakhne रखने"], 8, { ctx: "painOrArm" });
    // movements that ease it
    rule("relMovements", RFLEX, ["look looking looks bend* bending drop* dropping flexion flexing", "down forward neeche नीचे aage आगे", HELP], 8, { blockAfter: "nothing none" });
    rule("relMovements", RFLEX, ["flexion", HELP], 3, { blockAfter: "nothing none" });
    rule("relMovements", REXT, ["look looking looks tilt* tilting", "up upar ऊपर back backwards peeche पीछे", HELP], 8, { blockAfter: "nothing none" });
    rule("relMovements", RELEV, ["lift* rais* elevat* shrug*", "shoulders kandhe कंधे कंधा", HELP], 14, { blockAfter: "nothing none" });
    // pattern over 24 hours
    rule("overallPattern", PNIGHT, ["night nights raat रात", "worst worse zyada ज्यादा sabse सबसे"], 3, { reliefKills: true });
    rule("overallPattern", PNIGHT, ["night nights raat रात", "disturb* disturbance interrupted interrupts sleepless"], 3);
    rule("overallPattern", PNIGHT, ["nocturnal nighttime night_time"], 1);
    rule("overallPattern", PNIGHT, ["night nights raat रात", NERVE_W + " tingle tingles tingling tingled numb* jhunjhuni झुनझुनी paraesthesia paresthesia"], 8, { reliefKills: true, noComma: true, block: "only_when only_if only_while when while if jab जब sweats sweat sweating" });
    rule("overallPattern", PCONST, ["doesnt dont does_not do_not never", "let_up lets_up letting_up stop stops ease eases easing"], 4, { selfNeg: true, ctx: "painOrArm" });
    rule("overallPattern", PEVE, ["evening evenings shaam शाम", "dominant predominantly zyada ज्यादा worst most sabse सबसे"], 4);
    rule("overallPattern", PEVE, ["end", "working_day day workday"], 4, { ctx: "painOrArm" });
    rule("overallPattern", PEVE, ["evening evenings shaam शाम by_evening", PAIN_W + " badly"], 10, { noComma: true, reliefKills: true });
    // headache
    rule("haPresent", HSEC, ["from came comes begins begin starts start originates arises", NECK], 4, { story: HW, unless: "no not nahi नहीं without unrelated separate" });
    // myelopathy / VBI / instability / other
    rule("redFlagsVbi", VTHUN, ["worst sabse सबसे", "life ever zindagi जिंदगी", HW], 8);
    rule("redFlagsVbi", VTHUN, ["sudden suddenly achanak अचानक", "worst sabse सबसे", HW], 8);
    rule("redFlagsVbi", VDROP, ["drop_attack drop_attacks"], 2);
    rule("redFlagsOther", OTTHUN, ["worst sabse सबसे", "life ever zindagi जिंदगी", HW], 8);
    rule("redFlagsOther", OTTHUN, ["sudden suddenly achanak अचानक", "worst sabse सबसे", HW], 8);
    rule("redFlagsInstability", INRA, ["ra"], 1, { unless: "right left arm arms hand shoulder elbow bayen dayen" });
    rule("redFlagsInstability", INUNST, ["sense feel feels feeling mehsoos महसूस", "instability unstable wobbly loose dhila ढीला hilta हिलता"], 5, { ctx: "painOrArm", unless: "feet foot walk walking legs leg pair पैर balance" });
    rule("redFlagsOther", OTTORT, ["fever bukhar बुखार temperature", "locked stuck atak अटक jam जाम", NECK], 14);
    rule("fractureScreen", FRAXIAL, ["headfirst head_first sir_ke_bal सिर_के_बल"], 3);
    rule("fractureScreen", FRHIGH, ["fell fall fallen thrown crash crashed", "motorbike motorcycle bike scooter horse speed"], 8, { unless: "slipped" });
    rule("redFlagsOther", OTHIGH, ["fell fall fallen thrown crash crashed", "motorbike motorcycle bike scooter horse speed"], 8, { unless: "slipped" });
    rule("fractureScreen", FRHIGH, ["ladder seedhi सीढ़ी roof scaffold height", "came_down fell fall landed headfirst head_first"], 8);
    rule("fractureScreen", FRAXIAL, ["fall fell fallen gir* गिर*", "onto landed", "head sir सिर"], 8);
    rule("redFlagsInstability", INFUSION, ["fusion fused acdf"], 2);
    // limited activities
    rule("fnAdl", NCOMP, ["computer laptop screen screens typing keyboard कंप्यूटर", DIFFW], 14, FN());
    rule("fnAdl", NWORK, ["desk office daftar दफ्तर", "work kaam काम job duties duty naukri नौकरी", DIFFW + " keep_up"], 10, FN());
    rule("fnAdl", NWORK, ["at_work", DIFFW], 6, FN());
    rule("fnAdl", NDRIVE, ["driving drive", "out impossible off"], 3, FN());
    rule("fnAdl", NSHOULDER, [CANTP, "blind_spot blind_spots shoulder_check over_shoulder"], 6, FN());
    rule("fnAdl", NWORK, ["desk shift", "full_day whole_day all_day day", "keep_up cope coping manage managing cant cannot unable"], 10, FN());
    rule("fnAdl", NSLEEP, ["pillow pillows takiya takiye तकिये", "chang* keep_changing adjust* swap* toss*"], 6);
    rule("fnAdl", NDRIVE, ["gaadi गाड़ी", "chala* चला* chalane चलाने", "nahi नहीं cant cannot"], 6, { selfNeg: true });
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
