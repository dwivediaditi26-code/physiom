// thoracicPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a THORACIC (mid / upper back, ribs, chest wall) complaint in everyday
// words (English, Hinglish, Hindi in Devanagari) and suggests which of the Subjective checklist options it means.
// No AI, no network, no cost. It only SUGGESTS; the student taps to confirm. The matching engine is phraseEngine.js.
//
// Covers 8 Thoracic questions (location, radiation, mechanism, aggravating movements, what helps, 24-hour pattern,
// red flags, limited activities). Not covered: Irritability (a clinician's judgement, not something a patient says).
// The option strings must match the form exactly (a test checks this).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { SIDE_HINGLISH, SIDE_DEVA, LEFT_W, RIGHT_W, BOTH_W } from "./phraseSides.js";
import { extendPhrases } from "./phrasePattern.js";

const THORACIC_BASE = {
  location: {
    "Upper thoracic T1–T4": [
      "~upper back", "upper thoracic", "upper thoracic area", "level t2", "t2 level", "level t3", "t3 level", "level t4", "t4 level", "upper thoracic spine", "upper part of the back", "top of the back", "upper part of my back", "t1 to t4", "t1 t4",
      "pain in the upper back", "upper back pain", "high up in the back", "upper back between the neck and mid back",
      "peeth ke upar wale hisse me dard", "peeth ke upri hisse me dard", "upar ki peeth me dard", "peeth ka upri hissa", "peeth ke upar dard",
      "पीठ के ऊपरी हिस्से में दर्द", "पीठ के ऊपर वाले हिस्से में", "ऊपरी पीठ में दर्द", "पीठ के ऊपरी भाग में", "पीठ के ऊपर दर्द",
    ],
    "Mid thoracic T5–T8": [
      "~mid back", "mid thoracic", "mid thoracic area", "at the bra line", "around the bra line", "bra strap level", "at the level of the bra strap", "level t6", "t6 level", "level t7", "t7 level", "middle of the back", "middle back", "mid thoracic spine", "centre of the back", "center of the back", "in the middle of my back",
      "t5 to t8", "t5 t8", "mid back pain", "pain in the middle of the back", "middle of my back hurts", "halfway down the back",
      "peeth ke beech me dard", "peeth ke beech wale hisse me dard", "beech ki peeth me dard", "peeth ke madhya me dard", "peeth ke beech ka dard",
      "पीठ के बीच में दर्द", "बीच की पीठ में दर्द", "पीठ के बीच वाले हिस्से में", "पीठ के मध्य में दर्द", "पीठ के बीच का दर्द",
    ],
    "Lower thoracic T9–T12": [
      "lower thoracic", "lower thoracic area", "level t10", "t10 level", "level t11", "t11 level", "lower thoracic spine", "lower thoracic region", "t9 to t12", "t9 t12", "bottom of the rib cage at the back", "lower ribs at the back",
      "back of the lower ribs", "pain at the back just below the shoulder blades", "back at the level of the lower ribs", "lower rib level in the back",
      "pasliyon ke neeche peeth me dard", "peeth me nichli pasliyon ke paas dard", "kamar ke upar peeth me dard", "peeth me neeche ki pasliyon ke paas",
      "पसलियों के नीचे पीठ में दर्द", "पीठ में निचली पसलियों के पास दर्द", "कमर के ऊपर पीठ में दर्द", "पीठ में नीचे की पसलियों के पास",
    ],
    "Cervico-thoracic junction C7–T2": [
      "cervicothoracic junction", "junction of the neck and back", "neck and back junction", "c7", "c7 level", "level c7", "cervico thoracic junction", "cervicothoracic", "base of the neck", "bottom of the neck", "where the neck meets the back", "where the neck meets the shoulders",
      "c7 to t2", "c7 t2", "pain at the base of the neck", "top of the spine at the base of the neck", "bony lump at the base of the neck",
      "gardan ke neeche peeth ke upar dard", "gardan aur peeth ke jod par dard", "gardan ke aadhar par dard", "gardan ke niche wali haddi me dard", "gardan ke jod par dard",
      "गर्दन के नीचे पीठ के ऊपर दर्द", "गर्दन और पीठ के जोड़ पर दर्द", "गर्दन के आधार पर दर्द", "गर्दन के निचले हिस्से में दर्द", "गर्दन के नीचे की हड्डी में दर्द",
    ],
    "Thoracolumbar junction T12–L1": [
      "thoracolumbar junction", "where the ribs end", "level t12", "t12 level", "thoraco lumbar junction", "thoracolumbar", "t12 to l1", "t12 l1", "where the rib cage ends at the back", "junction of the upper and lower back",
      "where the mid back meets the lower back", "pain at the waistline in the back", "at the bottom of the ribs at the back where the lower back starts", "the transition between mid and lower back",
      "peeth aur kamar ke jod par dard", "peeth aur kamar ke beech dard", "peeth jahan kamar se milti hai wahan dard", "peeth ke neeche aur kamar ke upar dard",
      "पीठ और कमर के जोड़ पर दर्द", "पीठ और कमर के बीच में दर्द", "पीठ जहां कमर से मिलती है वहां दर्द", "पीठ के नीचे और कमर के ऊपर दर्द",
    ],
    "Interscapular — central": [
      "between the shoulder blades", "between my shoulder blades", "in between the shoulder blades", "interscapular", "interscapular pain", "pain between the shoulder blades",
      "centre between the shoulder blades", "between the shoulderblades", "behind the chest between the shoulder blades", "pain in between the scapulae",
      "kandhon ke beech me dard", "dono kandhon ke beech dard", "kandhe ki haddiyon ke beech dard", "kandhon ke beech ki jagah par dard", "dono kandhe ke beech me",
      "कंधों के बीच में दर्द", "दोनों कंधों के बीच दर्द", "कंधे की हड्डियों के बीच दर्द", "कंधों के बीच की जगह पर दर्द", "दोनों कंधे के बीच में",
    ],
    "Interscapular — left": [
      "left of the shoulder blades", "left shoulder blade pain", "pain under the left shoulder blade", "left side between the shoulder blades", "around the left shoulder blade",
      "left interscapular", "pain at the inner edge of the left shoulder blade", "left scapula pain", "inside edge of the left shoulder blade",
      "bayen kandhe ki haddi ke paas dard", "bayen kandhe ki haddi ke neeche dard", "left kandhe ki haddi me dard", "bayen taraf kandhon ke beech dard",
      "बाएं कंधे की हड्डी के पास दर्द", "बाएं कंधे की हड्डी के नीचे दर्द", "बाएं कंधे की हड्डी में दर्द", "बाएं तरफ कंधों के बीच दर्द",
    ],
    "Interscapular — right": [
      "right of the shoulder blades", "right shoulder blade pain", "pain under the right shoulder blade", "right side between the shoulder blades", "around the right shoulder blade",
      "right interscapular", "pain at the inner edge of the right shoulder blade", "right scapula pain", "inside edge of the right shoulder blade",
      "dayen kandhe ki haddi ke paas dard", "dayen kandhe ki haddi ke neeche dard", "right kandhe ki haddi me dard", "dayen taraf kandhon ke beech dard",
      "दाएं कंधे की हड्डी के पास दर्द", "दाएं कंधे की हड्डी के नीचे दर्द", "दाएं कंधे की हड्डी में दर्द", "दाएं तरफ कंधों के बीच दर्द",
    ],
    "Costovertebral — lateral": [
      "~costovertebral", "back of the rib cage", "back of the ribs", "posterior ribs", "costovertebral joint", "where the ribs meet the spine", "ribs at the back near the spine", "rib joint at the back", "rib pain near the spine",
      "next to the spine at rib level", "side of the spine where the ribs attach", "rib stuck at the back", "pain where the rib joins the spine",
      "pasli aur reedh ke jod par dard", "reedh ke paas pasli me dard", "peeth me pasli ke jod par dard", "pasliyon ka reedh se jodh dard",
      "पसली और रीढ़ के जोड़ पर दर्द", "रीढ़ के पास पसली में दर्द", "पीठ में पसली के जोड़ पर दर्द", "पसलियों का रीढ़ से जोड़ दर्द",
    ],
    "Lateral chest wall": [
      "~lateral chest wall", "side of the chest", "side of the ribs", "ribs on the side", "pain along the side of the ribs", "side of the rib cage", "ribs under the armpit",
      "side chest wall", "pain in the ribs at the side", "ribs at the side of my chest",
      "pasliyon me side me dard", "seene ke side me dard", "bagal ki pasliyon me dard", "chhati ke bagal me dard", "side ki pasliyon me dard",
      "छाती के बगल में दर्द", "पसलियों के बगल में दर्द", "बगल की पसलियों में दर्द", "सीने के बगल में दर्द", "साइड की पसलियों में दर्द",
    ],
    "Anterior chest wall": [
      "~anterior chest wall", "front of the chest", "front of the chest wall", "anterior chest", "pain in the front of the chest wall", "ribs at the front", "front of the ribs",
      "chest wall pain at the front", "pain in the front of the chest", "front chest wall tenderness",
      "chhati ke samne dard", "seene ke aage dard", "chhati ke aage ki pasliyon me dard", "samne ki pasliyon me dard", "chhati ke samne wale hisse me dard",
      "छाती के आगे दर्द", "सीने के आगे दर्द", "सामने की पसलियों में दर्द", "छाती के सामने वाले हिस्से में दर्द", "छाती के सामने दर्द",
    ],
    "Sternal / midline anterior": [
      "~sternum", "~breastbone", "tenderness over the breastbone", "tender breastbone", "tenderness over the sternum", "tender sternum", "sternal pain", "pain over the breastbone", "pain at the sternum", "centre of the chest", "center of the chest", "middle of the chest",
      "pain over the sternum", "midline chest pain", "breastbone tender",
      "seene ke beech me dard", "chhati ke beech me dard", "chhati ke bilkul beech me dard", "seene ki haddi me dard",
      "सीने के बीच में दर्द", "छाती के बीच में दर्द", "छाती के बिल्कुल बीच में दर्द", "उरोस्थि में दर्द", "सीने की हड्डी में दर्द",
    ],
    "Around chest — dermatomal band": [
      "band around the chest", "pain wraps around the chest", "girdle pain", "belt like pain around the ribs", "pain going around the ribs to the front", "tight band around the chest",
      "pain wrapping around from back to front", "pain like a tight belt around the chest", "pain wraps around my ribs", "band like pain around the ribs",
      "chhati ke charo taraf patte jaisa dard", "pasliyon ke charo taraf belt jaisa dard", "peeth se aage ki taraf ghere hue dard", "chhati par patti jaisa dard",
      "पसलियों के चारों ओर पट्टी जैसा दर्द", "छाती के चारों तरफ बेल्ट जैसा दर्द", "पीठ से आगे की तरफ घेरते हुए दर्द", "छाती पर पट्टी जैसा दर्द",
    ],
    "Bilateral paraspinal": [
      "~paraspinal", "~bilateral paraspinal", "both sides of the spine", "either side of the spine", "on both sides of my spine", "paraspinal muscles", "pain along both sides of the spine",
      "muscles on both sides of the spine", "both sides of the back", "pain either side of the backbone",
      "reedh ke dono taraf dard", "reedh ke dono side dard", "peeth me reedh ke dono taraf dard", "dono taraf ki maspeshiyon me dard",
      "रीढ़ के दोनों तरफ दर्द", "रीढ़ के दोनों साइड दर्द", "पीठ में रीढ़ के दोनों तरफ दर्द", "दोनों तरफ की मांसपेशियों में दर्द",
    ],
  },

  radiation: {
    "No radiation — local": [
      "no radiation", "stays in one spot", "doesnt travel", "does not travel", "pain does not travel", "not radiating", "pain is local", "stays in one place", "does not spread", "doesnt spread anywhere", "pain doesnt travel", "pain stays in the back", "does not go anywhere else", "only local pain",
      "dard kahin aur nahi jata", "dard ek hi jagah rehta hai", "dard failta nahi", "sirf peeth me dard hai aur kahin nahi", "dard aage nahi jata",
      "दर्द कहीं और नहीं जाता", "दर्द एक ही जगह रहता है", "दर्द फैलता नहीं", "सिर्फ पीठ में दर्द है और कहीं नहीं", "दर्द आगे नहीं जाता",
    ],
    "Around chest wall — dermatomal": [
      "pain goes around the ribs", "spreads around my ribs to the front", "wraps around the chest", "follows the rib", "along the rib to the front", "going around the side to the front",
      "travels around the ribs", "pain travels along the rib", "pain follows the line of the rib", "radiates along the ribs",
      "pasliyon ke saath saath aage tak dard", "dard pasli ke saath aage jata hai", "dard chhati ke charo taraf jata hai", "pasli ke saath dard failta hai",
      "पसली के साथ साथ आगे तक दर्द", "दर्द पसली के साथ आगे जाता है", "दर्द छाती के चारों तरफ फैलता है", "पसलियों के साथ दर्द फैलता है",
    ],
    "To shoulder blade — interscapular referred": [
      "goes to the shoulder blade", "spreads to between the shoulder blades", "refers to the scapula", "pain goes up to my shoulder blade", "radiates to the shoulder blade",
      "travels to the shoulder blade", "spreads to the shoulder blades", "pain shoots up to the shoulder blade",
      "dard kandhe ki haddi tak jata hai", "dard kandhon ke beech tak jata hai", "kandhe ki haddi tak dard failta hai", "dard upar kandhe ki haddi tak aata hai",
      "दर्द कंधे की हड्डी तक जाता है", "दर्द कंधों के बीच तक जाता है", "कंधे की हड्डी तक दर्द फैलता है", "दर्द ऊपर कंधे की हड्डी तक आता है",
    ],
    "To anterior chest — cardiac / visceral differential": [
      "goes to the front of the chest", "comes through to the front of my chest", "pain goes through to the chest", "radiates to the chest", "spreads to the front of the chest",
      "travels through to the chest", "pain goes right through to the front", "pain goes from the back to the front of the chest",
      "peeth se seene tak dard jata hai", "dard peeth se chhati ke samne aata hai", "dard aar paar seene tak jata hai", "peeth ka dard seene tak aata hai",
      "पीठ से सीने तक दर्द जाता है", "दर्द पीठ से छाती के सामने आता है", "दर्द आर पार सीने तक जाता है", "पीठ का दर्द सीने तक आता है",
    ],
    "To abdomen — visceral differential": [
      "goes to the stomach", "spreads to the abdomen", "radiates to my belly", "pain in the tummy as well", "pain goes through to the belly", "travels round to the abdomen",
      "pain goes to the stomach area", "spreads into the upper abdomen",
      "peeth se pet tak dard jata hai", "dard pet tak aata hai", "peeth ka dard pet me bhi hota hai", "dard pet ki taraf failta hai",
      "पीठ से पेट तक दर्द जाता है", "दर्द पेट तक आता है", "पीठ का दर्द पेट में भी होता है", "दर्द पेट की तरफ फैलता है",
    ],
    "To groin / hip — lower thoracic referred": [
      "goes to the groin", "pain goes down to the groin", "spreads to the hip", "radiates to the groin", "pain travels to the groin", "goes down into the hip",
      "spreads down to the groin", "pain reaches the groin",
      "peeth se jaangh tak dard jata hai", "dard groin tak jata hai", "dard kulhe tak aata hai", "dard jaangh ke jod tak jata hai",
      "पीठ से जांघ तक दर्द जाता है", "दर्द कूल्हे तक आता है", "दर्द जांघ के जोड़ तक जाता है", "दर्द कमर के नीचे कूल्हे तक जाता है",
    ],
    "Bilateral chest / girdle": [
      "pain on both sides of the chest", "bilateral chest pain", "both sides of the chest hurt", "pain across both sides of the ribs", "both sides of the ribs",
      "pain on both sides of the rib cage", "spreads to both sides of the chest", "pain goes to both sides",
      "dono taraf seene me dard", "dono taraf ki pasliyon me dard", "dono side chhati me dard", "chhati ke dono taraf dard failta hai",
      "दोनों तरफ छाती में दर्द", "दोनों तरफ की पसलियों में दर्द", "दोनों साइड सीने में दर्द", "छाती के दोनों तरफ दर्द फैलता है",
    ],
    "Cardiac-like radiation — left chest / arm (urgent flag)": [
      "pain goes to my left arm", "left arm pain with chest pain", "radiates to the left arm and jaw", "chest tightness with pain going to the left arm", "pain spreading to the jaw",
      "chest pain going to the left arm", "pain down the left arm and into the jaw", "chest pain spreading to the left arm",
      "seene se bayen haath tak dard", "bayen haath me dard aur seene me dard", "seene ka dard bayen haath aur jabde tak jata hai", "seene me dard jo bayen haath me jata hai",
      "सीने से बाएं हाथ तक दर्द", "बाएं हाथ में दर्द और सीने में दर्द", "सीने का दर्द बाएं हाथ और जबड़े तक जाता है", "सीने में दर्द जो बाएं हाथ में जाता है",
    ],
  },

  mechanismType: {
    "Insidious — postural / sustained": [
      "gradual onset", "came on slowly", "no injury it came on gradually", "slowly worsened over time", "poor posture over the years", "slouching for a long time",
      "gradually got worse", "crept up slowly", "started slowly with no injury", "built up over weeks",
      "bina chot ke dheere dheere shuru hua", "dheere dheere dard badhta gaya", "kharab posture ki wajah se dard", "bahut din se jhuk kar baithne se dard",
      "बिना चोट के धीरे धीरे शुरू हुआ", "धीरे धीरे दर्द बढ़ता गया", "खराब पोस्चर की वजह से दर्द", "बहुत दिन से झुक कर बैठने से दर्द",
    ],
    "Lifting injury": [
      "lifted something heavy", "lifting injury", "strained my back lifting", "pulled something lifting", "carrying a heavy bag", "hurt it lifting a box", "felt a pop while lifting",
      "lifted a heavy weight and felt a pull", "was lifting and felt something go",
      "bhaari saman uthate waqt dard hua", "bhaari bojh uthane se dard shuru hua", "wazan uthate waqt peeth me khichav", "bhaari bag uthane se dard",
      "भारी सामान उठाते समय दर्द हुआ", "भारी बोझ उठाने से दर्द शुरू हुआ", "वजन उठाते समय पीठ में खिंचाव", "भारी बैग उठाने से दर्द",
    ],
    "Rotation injury": [
      "twisted my back", "twisting injury", "turned suddenly and felt a catch", "rotated and felt a sharp pain", "twisting motion", "twisted awkwardly", "golf swing injury",
      "twisted to reach something and felt a catch", "turned round quickly and felt a pull",
      "peeth mod di", "mudte waqt peeth me khichav", "achanak ghumne par peeth me jhatka", "ghumte waqt peeth me kat se laga",
      "पीठ मुड़ गई", "मुड़ते समय पीठ में खिंचाव", "अचानक घूमने पर पीठ में झटका", "घूमते समय पीठ में कट सा लगा",
    ],
    "Fall / direct trauma": [
      "fell on my back", "fall from a ladder", "fell from a ladder", "fell off a ladder", "fall from a height", "fell from a height", "fell off my bike", "fall onto the back", "hit on the back", "blow to the back", "kicked in the back", "slipped and fell on my back", "fell down the stairs",
      "banged my back", "direct blow to the back", "back hit against something",
      "peeth ke bal gir gaya", "peeth par chot lagi", "peeth par maar padi", "phisalkar peeth ke bal gira",
      "पीठ के बल गिर गया", "पीठ पर चोट लगी", "पीठ पर मार पड़ी", "फिसलकर पीठ के बल गिरा",
    ],
    "MVA — thoracic component": [
      "car accident", "rear end collision", "collision on the motorway", "road collision", "road traffic accident", "rear ended", "seatbelt injury", "mva", "motor vehicle accident", "hit by a car", "bike accident", "car crash",
      "accident me peeth me chot", "gadi ki takkar", "road accident me chot lagi", "bike se takra gaya",
      "गाड़ी की टक्कर", "सड़क दुर्घटना", "एक्सीडेंट के बाद पीठ में दर्द", "बाइक से टकरा गया", "कार एक्सीडेंट",
    ],
    "Prolonged computer / desk posture": [
      "desk job", "long hours at the computer", "sitting at a desk all day", "working on a laptop", "hunched over a computer", "work from home posture", "hunched over my desk",
      "sitting at the computer for hours", "long hours of desk work",
      "computer par baith kar kaam karne se", "laptop par ghanto kaam", "desk job ki wajah se", "ghanto computer ke saamne baithne se",
      "कंप्यूटर पर घंटों काम करने से", "लैपटॉप पर घंटों काम", "डेस्क जॉब की वजह से", "घंटों कंप्यूटर के सामने बैठने से",
    ],
    "Post-surgical": [
      "post surgical", "after surgery", "post operative", "after thoracotomy", "after the operation on my back", "since my surgery", "following surgery", "spinal surgery",
      "pain started after my operation", "after heart surgery",
      "operation ke baad se dard", "surgery ke baad peeth me dard", "operation ke baad dard shuru hua", "peeth ke operation ke baad",
      "ऑपरेशन के बाद से दर्द", "सर्जरी के बाद पीठ में दर्द", "ऑपरेशन के बाद दर्द शुरू हुआ", "पीठ के ऑपरेशन के बाद",
    ],
    "Post-partum — breastfeeding posture": [
      "post partum", "after delivery", "after childbirth", "after having my baby", "while breastfeeding", "feeding the baby", "nursing posture", "since the baby was born",
      "pain from feeding the baby",
      "delivery ke baad se peeth dard", "baby ko doodh pilate waqt dard", "bachche ke janm ke baad se dard", "bachche ko doodh pilane se peeth dard",
      "डिलीवरी के बाद से पीठ दर्द", "बच्चे को दूध पिलाते समय दर्द", "बच्चे के जन्म के बाद से दर्द", "बच्चे को दूध पिलाने से पीठ दर्द",
    ],
    "Osteoporotic fracture — minimal trauma": [
      "osteoporotic fracture", "fracture after a minor fall", "compression fracture", "broke a vertebra from a small fall", "weak bones fracture", "vertebral fracture from sneezing",
      "spine fracture with little trauma", "crush fracture", "fractured after a trivial fall",
      "mamuli girne se fracture", "haddi kamzor hone se fracture", "halki chot me reedh ki haddi toot gayi", "chhoti si girne par reedh toot gayi",
      "मामूली गिरने से फ्रैक्चर", "हड्डी कमजोर होने से फ्रैक्चर", "हल्की चोट में रीढ़ की हड्डी टूट गई", "छोटी सी गिरने पर रीढ़ टूट गई",
    ],
    "Viral illness — post-viral costochondritis": [
      "costochondritis", "after a viral infection", "after the flu", "post viral", "after a chest infection", "after a bad cough", "after covid", "after a viral fever",
      "rib pain after a cold",
      "viral bukhar ke baad", "khansi ke baad pasliyon me dard", "bukhar ke baad seene me dard", "flu ke baad pasli me dard",
      "वायरल बुखार के बाद", "खांसी के बाद पसलियों में दर्द", "बुखार के बाद सीने में दर्द", "फ्लू के बाद पसली में दर्द",
    ],
    "No clear mechanism": [
      "~no clear mechanism", "no clear cause", "no injury that i can remember", "cant remember any injury", "no injury i can remember", "no injury she can remember", "no injury he can remember", "dont know how it started", "no known reason", "woke up with it", "woke up with this pain", "no idea why", "cannot think of any cause",
      "no obvious cause",
      "pata nahi kaise shuru hua", "koi wajah samajh nahi aati", "subah uthte hi dard tha", "bina kisi kaaran ke dard",
      "पता नहीं कैसे शुरू हुआ", "कोई वजह समझ नहीं आती", "सुबह उठते ही दर्द था", "बिना किसी कारण के दर्द",
    ],
  },

  aggMovements: {
    "Rotation (most thoracic sensitive to)": [
      "~rotation", "~twisting", "twisting hurts", "rotating the trunk hurts", "turning to look behind", "looking over my shoulder", "look over my shoulder", "reversing the car", "twisting my upper body", "pain on rotation", "pain when i twist", "turning the trunk",
      "pain on turning round",
      "mudne par dard", "ghumne par dard", "dhad ghumane par dard", "peeche mudkar dekhne par dard",
      "मुड़ने पर दर्द", "घूमने पर दर्द", "धड़ घुमाने पर दर्द", "पीछे मुड़कर देखने पर दर्द",
    ],
    "Side bending": [
      "~side bending", "side bending hurts", "bending sideways", "leaning to the side", "bending to the side", "pain on side bend", "when i bend to the side",
      "pain when leaning sideways", "side bend is painful",
      "side me jhukne par dard", "bagal me jhukne par dard", "ek taraf jhukne par dard", "dayen bayen jhukne par dard",
      "साइड में झुकने पर दर्द", "बगल में झुकने पर दर्द", "एक तरफ झुकने पर दर्द", "दाएं बाएं झुकने पर दर्द",
    ],
    "Extension": [
      "~extension", "leaning back", "bending backwards", "arching my back", "backward bend", "pain on extension", "when i lean backwards", "pain on arching", "bending back",
      "peeche jhukne par dard", "peeche ki taraf jhukne par dard", "peeth ko peeche modne par dard", "kamaan banane par dard",
      "पीछे झुकने पर दर्द", "पीछे की तरफ झुकने पर दर्द", "पीठ को पीछे मोड़ने पर दर्द", "कमान बनाने पर दर्द",
    ],
    "Flexion": [
      "~flexion", "bending forward", "slouching", "leaning forward", "rounding my back", "pain on flexion", "forward bend", "when i bend forward", "pain on bending forward",
      "aage jhukne par dard", "aage ki taraf jhukne par dard", "kuba hone par dard", "jhukne par dard",
      "आगे झुकने पर दर्द", "आगे की तरफ झुकने पर दर्द", "कूबड़ निकालने पर दर्द", "झुकने पर दर्द",
    ],
    "Combined movements": [
      "~combined movements", "combined movements hurt", "twisting and bending", "bending and twisting", "reaching and twisting", "a mix of movements", "bending while twisting",
      "pain when i bend and turn together",
      "jhukne aur ghumne par dard", "jhukte hue ghumne par dard", "mudne aur jhukne dono par dard", "milli juli harkaton se dard",
      "झुकने और घूमने पर दर्द", "झुकते हुए घूमने पर दर्द", "मुड़ने और झुकने दोनों पर दर्द", "मिली जुली हरकतों से दर्द",
    ],
    "Deep breathing in": [
      "~deep breathing", "deep breath in", "breathing in deeply", "inhaling hurts", "taking a deep breath", "on inspiration", "pain when i breathe in", "pain on deep breath", "hurts to breathe in",
      "pain on deep breathing", "pain when i take a deep breath",
      "saans andar lene par dard", "gehri saans lene par dard", "gehri saans lene me dard", "saans lete waqt dard",
      "सांस अंदर लेने पर दर्द", "गहरी सांस लेने पर दर्द", "गहरी सांस लेने में दर्द", "सांस लेते समय दर्द",
    ],
    "Deep breathing out": [
      "~breathing out", "~exhaling", "breathing out hurts", "pain on exhaling", "exhale hurts", "when i breathe out", "pain when i breathe out", "hurts to breathe out", "on expiration",
      "saans bahar chhodne par dard", "saans bahar nikalne par dard", "saans chhodte waqt dard", "saans chhodne me dard",
      "सांस छोड़ने पर दर्द", "सांस बाहर निकालने पर दर्द", "सांस छोड़ते समय दर्द", "सांस छोड़ने में दर्द",
    ],
    "Coughing": [
      "~coughing", "~cough", "pain on coughing", "coughing hurts", "pain when i cough", "cough makes it worse", "it hurts when i cough", "pain with every cough",
      "khansi karne par dard", "khansi aane par dard", "khansne par dard", "khansi se dard badhta hai",
      "खांसी में दर्द", "खांसने पर दर्द", "खांसी आने पर दर्द", "खांसी से दर्द बढ़ता है",
    ],
    "Sneezing": [
      "~sneezing", "~sneeze", "pain on sneezing", "sneezing hurts", "pain when i sneeze", "it hurts when i sneeze", "sneeze makes it worse", "a sneeze sets off the pain",
      "chheenkne par dard", "chheenk aane par dard", "chheenk se dard badhta hai", "chheenkte waqt peeth me dard",
      "छींकने पर दर्द", "छींक आने पर दर्द", "छींक से दर्द बढ़ता है", "छींकते समय पीठ में दर्द",
    ],
    "Laughing": [
      "~laughing", "~laugh", "laughing hurts", "pain when i laugh", "pain on laughing", "it hurts when i laugh", "laughing makes it worse", "cannot laugh without pain",
      "hasne par dard", "hanste waqt dard", "hasne se dard badhta hai", "hasne me dard hota hai",
      "हंसने पर दर्द", "हंसते समय दर्द", "हंसने से दर्द बढ़ता है", "हंसने में दर्द होता है",
    ],
    "Sustained end-range posture": [
      "~sustained posture", "staying in one position", "prolonged sitting", "holding the same posture", "remaining in one position too long", "sitting for a long time",
      "pain after sitting for long", "staying in the same position for long",
      "ek hi position me der tak rehne par dard", "der tak baithne par dard", "lambe samay tak baithne se dard", "ek hi mudra me der tak rehne par",
      "एक ही स्थिति में देर तक रहने पर दर्द", "देर तक बैठने पर दर्द", "लंबे समय तक बैठने से दर्द", "एक ही मुद्रा में देर तक रहने पर",
    ],
    "Quick / sudden movements": [
      "~sudden movements", "~quick movements", "sudden movements hurt", "jerky movements", "a sudden twist", "abrupt movement", "pain with quick movements", "any sudden movement",
      "achanak hilne par dard", "jhatke se hilne par dard", "achanak harkat karne par dard", "tez harkat par dard",
      "अचानक हिलने पर दर्द", "झटके से हिलने पर दर्द", "अचानक हरकत करने पर दर्द", "तेज हरकत पर दर्द",
    ],
    "Lifting": [
      "~lifting", "pain when lifting", "lifting things hurts", "picking up heavy things", "carrying a heavy bag hurts", "pain when i lift", "pain on lifting", "lifting aggravates it",
      "uthane par dard", "bhaari saman uthane par dard", "wazan uthane par dard", "bhaari cheez uthane par dard",
      "उठाने पर दर्द", "भारी सामान उठाने पर दर्द", "वजन उठाने पर दर्द", "भारी चीज उठाने पर दर्द",
    ],
    "Reaching overhead": [
      "~reaching overhead", "reaching up", "arms above my head", "putting things on a high shelf", "lifting arms up hurts", "pain when i raise my arms", "reaching up high",
      "reaching above my head", "pain on raising both arms",
      "haath upar karne par dard", "haath upar uthane par dard", "upar haath badhane par dard", "upar shelf par saman rakhne par dard",
      "हाथ ऊपर करने पर दर्द", "हाथ ऊपर उठाने पर दर्द", "ऊपर हाथ बढ़ाने पर दर्द", "ऊपर शेल्फ पर सामान रखने पर दर्द",
    ],
  },

  relTreatments: {
    "Heat": [
      "~heat", "heat helps", "hot pack helps", "hot water bag helps", "a hot shower helps", "warm compress helps", "heat gives relief", "hot compress eases it", "heating pad helps",
      "garam sekai se aaram", "garam paani ki thaili se aaram", "sekai se aaram milta hai", "garam paani se nahane se aaram",
      "गरम सेकाई से आराम", "गरम पानी की थैली से आराम", "सेकाई से आराम मिलता है", "गरम पानी से नहाने से आराम",
    ],
    "Ice": [
      "~ice", "ice helps", "ice pack helps", "cold pack helps", "ice gives relief", "cold compress helps", "ice eases it", "an ice pack gives relief",
      "baraf se aaram", "baraf lagane se aaram", "thanda sek karne se aaram", "ice pack se aaram milta hai",
      "बर्फ से आराम", "बर्फ लगाने से आराम", "ठंडा सेक करने से आराम", "आइस पैक से आराम मिलता है",
    ],
    "Manipulation — significant relief": [
      "~manipulation", "manipulation helped a lot", "chiropractor adjustment helped", "cracking my back gives relief", "spinal manipulation gave big relief", "clicking my back helps",
      "had my back cracked and felt much better", "adjustment gave significant relief", "manipulation gave big relief",
      "back crack karwane se bahut aaram", "chiropractor ne adjust kiya to bahut aaram mila", "peeth ki haddi bithane se bahut aaram", "manipulation se bahut aaram mila",
      "पीठ क्रैक करवाने से बहुत आराम", "कायरोप्रैक्टर ने एडजस्ट किया तो बहुत आराम मिला", "पीठ की हड्डी बिठाने से बहुत आराम", "मैनिपुलेशन से बहुत आराम मिला",
    ],
    "Mobilisation": [
      "~mobilisation", "~mobilization", "mobilisation helps", "mobilization helped", "physio mobilised my back and it helped", "joint mobilisation gave relief", "gentle mobilisation eases it",
      "manual therapy helps", "hands on treatment helped",
      "mobilisation se aaram", "physio ke mobilisation se aaram mila", "haath se jod ghumane se aaram", "manual therapy se aaram milta hai",
      "मोबिलाइजेशन से आराम", "फिजियो के मोबिलाइजेशन से आराम मिला", "हाथ से जोड़ घुमाने से आराम", "मैनुअल थेरेपी से आराम मिलता है",
    ],
    "Stretching": [
      "~stretching", "stretching helps", "stretches help", "stretching gives relief", "stretching eases it", "a good stretch helps", "gentle stretches relieve it", "stretching the back helps",
      "stretching se aaram", "khichav karne se aaram", "stretch karne se aaram milta hai", "peeth ko tanne se aaram",
      "स्ट्रेचिंग से आराम", "खिंचाव करने से आराम", "स्ट्रेच करने से आराम मिलता है", "पीठ को तानने से आराम",
    ],
    "Breathing exercises": [
      "~breathing exercises", "breathing exercises help", "deep breathing exercises relieve it", "pranayama helps", "slow breathing helps", "controlled breathing eases it", "diaphragmatic breathing helps",
      "breathing exercise gives relief", "deep breathing helps",
      "pranayam se aaram", "saans ki kasrat se aaram", "gehri saans ki exercise se aaram", "anulom vilom se aaram milta hai",
      "प्राणायाम से आराम", "सांस की कसरत से आराम", "गहरी सांस की एक्सरसाइज से आराम", "अनुलोम विलोम से आराम मिलता है",
    ],
    "Postural correction": [
      "~postural correction", "sitting up straight helps", "correcting my posture helps", "good posture helps", "standing tall eases it", "better posture relieves it", "straightening up helps",
      "fixing my posture helps", "posture correction gave relief",
      "seedha baithne se aaram", "posture theek karne se aaram", "seedha khade hone se aaram milta hai", "sahi posture me rehne se aaram",
      "सीधा बैठने से आराम", "पोस्चर ठीक करने से आराम", "सीधा खड़े होने से आराम मिलता है", "सही पोस्चर में रहने से आराम",
    ],
    "Taping": [
      "~taping", "~kinesio tape", "taping helps", "kinesio tape helps", "tape on my back gives relief", "strapping helps", "the tape eases it", "taping gave relief",
      "tape lagane se aaram", "kinesio tape se aaram", "peeth par tape lagane se aaram milta hai", "tape bandhne se aaram",
      "टेप लगाने से आराम", "किनेसियो टेप से आराम", "पीठ पर टेप लगाने से आराम मिलता है", "टेप बांधने से आराम",
    ],
    "NSAIDs effective": [
      "~nsaids", "~ibuprofen", "~diclofenac", "ibuprofen helps", "diclofenac helps", "anti inflammatory tablets help", "nsaids give relief", "painkillers like brufen help", "voveran helps", "naproxen helps",
      "brufen se aaram", "diclofenac se aaram milta hai", "voveran se aaram", "anti inflammatory goli se aaram", "dard ki goli se aaram milta hai",
      "ब्रूफेन से आराम", "डाइक्लोफेनाक से आराम मिलता है", "वोवेरान से आराम", "सूजन की गोली से आराम", "दर्द की गोली से आराम मिलता है",
    ],
    "Paracetamol effective": [
      "~paracetamol", "~dolo", "paracetamol helps", "dolo helps", "crocin gives relief", "paracetamol eases it", "a paracetamol tablet relieves the pain", "tylenol helps", "calpol helps",
      "paracetamol se aaram", "dolo se aaram milta hai", "crocin se aaram", "dolo lene se dard kam hota hai",
      "पैरासिटामोल से आराम", "डोलो से आराम मिलता है", "क्रोसिन से आराम", "डोलो लेने से दर्द कम होता है",
    ],
    "Muscle relaxants": [
      "~muscle relaxants", "~muscle relaxant", "muscle relaxants help", "muscle relaxant tablets relieve it", "thiocolchicoside helps", "myospaz helps", "relaxant tablets give relief", "tizanidine helps",
      "muscle relaxant se aaram", "myospaz se aaram milta hai", "muscle ko dheela karne wali goli se aaram", "relaxant goli se aaram",
      "मसल रिलैक्सेंट से आराम", "मायोस्पैज से आराम मिलता है", "मांसपेशी ढीली करने वाली गोली से आराम", "रिलैक्सेंट गोली से आराम",
    ],
    "No treatment helps": [
      "nothing helps", "none of the medicines help", "none of the medicines or exercises help", "nothing seems to help", "nothing really helps", "nothing works", "no treatment helps", "none of the treatments help", "nothing gives relief", "no relief from anything", "nothing i try helps", "none of the treatments work", "nothing eases it", "nothing makes it better",
      "tried everything and nothing helps",
      "kuch bhi aaram nahi deta", "kisi cheez se aaram nahi milta", "koi ilaaj kaam nahi karta", "sab kuch try kiya par aaram nahi",
      "कुछ भी आराम नहीं देता", "किसी चीज से आराम नहीं मिलता", "कोई इलाज काम नहीं करता", "सब कुछ ट्राई किया पर आराम नहीं",
    ],
  },

  pattern: {
    "Mechanical — movement and posture related": [
      "~mechanical", "mechanical pain", "worse with movement and better with rest", "worse with movement better with rest", "worse on moving and eases with rest", "worse with movement and posture", "pain depends on my position", "posture and movement related", "better with rest worse with movement", "pain changes with position",
      "depends on how i move", "movement makes it worse and rest eases it",
      "harkat aur posture se dard badalta hai", "position ke hisaab se dard", "hilne dulne se dard badhta hai aaram se kam hota hai", "baithne uthne ke tarike par dard nirbhar",
      "हरकत और पोस्चर से दर्द बदलता है", "पोजीशन के हिसाब से दर्द", "हिलने डुलने से दर्द बढ़ता है आराम से कम होता है", "बैठने उठने के तरीके पर दर्द निर्भर",
    ],
    "Constant — unrelated to movement (red flag)": [
      "constant pain whatever i do", "pain doesnt change with movement", "nothing changes the pain", "same pain in any position", "unrelenting pain", "pain is there no matter what position",
      "constant and does not change with movement", "movement makes no difference to the pain",
      "har haal me dard rehta hai", "position badalne se bhi dard nahi badalta", "hilne se dard me koi fark nahi", "chahe kuch bhi karun dard ek jaisa rehta hai",
      "हर हाल में दर्द रहता है", "पोजीशन बदलने से भी दर्द नहीं बदलता", "हिलने से दर्द में कोई फर्क नहीं", "चाहे कुछ भी करूं दर्द एक जैसा रहता है",
    ],
    "Breathing-related — with respiration": [
      "~breathing related", "pain with breathing", "worse when i breathe", "breathing hurts", "painful to breathe", "pain with every breath", "breath makes it worse", "pain on breathing",
      "saans lene me dard", "saans ke saath dard badhta hai", "saans lene par peeth me dard", "har saans par dard",
      "सांस लेने में दर्द", "सांस के साथ दर्द बढ़ता है", "सांस लेने पर पीठ में दर्द", "हर सांस पर दर्द",
    ],
    "Activity-dependent": [
      "~activity dependent", "pain with activity", "worse with activity", "pain after exercise", "pain comes on when i am active", "activity brings it on", "pain when i do things",
      "worse the more active i am",
      "kaam karne par dard", "kaam karne se dard badhta hai", "exercise ke baad dard", "chalne phirne se dard badhta hai",
      "काम करने पर दर्द", "काम करने से दर्द बढ़ता है", "एक्सरसाइज के बाद दर्द", "चलने फिरने से दर्द बढ़ता है",
    ],
    "Night dominant": [
      "~night dominant", "worse at night", "night pain", "pain at night", "pain wakes me up", "wakes me up at night", "cannot sleep because of the pain", "pain is worst at night",
      "raat ko dard", "raat ko zyada dard", "raat ko dard se neend khul jati hai", "raat me peeth dard badhta hai",
      "रात को दर्द", "रात में ज्यादा दर्द", "रात को दर्द से नींद खुल जाती है", "रात में पीठ दर्द बढ़ता है",
    ],
    "Morning stiffness": [
      "~morning stiffness", "stiff in the morning", "morning stiffness", "stiffness when i wake up", "stiff first thing in the morning", "back is stiff on waking", "worse on waking",
      "stiffness after getting out of bed",
      "subah akdan", "subah peeth akad jati hai", "subah uthte hi jakdan", "subah uthne par peeth me jakdan",
      "सुबह अकड़न", "सुबह पीठ अकड़ जाती है", "सुबह उठते ही जकड़न", "सुबह उठने पर पीठ में जकड़न",
    ],
    "Inflammatory — morning stiffness / eases with movement": [
      "~inflammatory", "morning stiffness that eases with movement", "stiff in the morning and loosens up as i move", "stiffness that improves with exercise", "better with activity worse with rest",
      "stiff in the morning and gets better as the day goes on", "eases with movement and returns with rest", "loosens up once i get moving",
      "subah akdan jo hilne se theek ho jati hai", "subah jakdan hilne dulne se kam ho jati hai", "aaram se dard badhta hai aur kaam karne se kam hota hai", "rest karne par akdan badhti hai chalne se kam",
      "सुबह अकड़न जो हिलने से ठीक हो जाती है", "सुबह जकड़न हिलने डुलने से कम हो जाती है", "आराम से दर्द बढ़ता है और काम करने से कम होता है", "आराम करने पर अकड़न बढ़ती है चलने से कम",
    ],
  },

  redFlags: {
    "No red flags": [
      "no red flags", "no red flag", "no warning signs", "none of the above", "nothing worrying", "red flags absent", "screen is negative", "no red flag symptoms",
      "koi red flag nahi", "koi khatre ki baat nahi", "koi chinta wali baat nahi", "koi warning sign nahi",
      "कोई रेड फ्लैग नहीं", "कोई खतरे की बात नहीं", "कोई चिंता वाली बात नहीं", "कोई वार्निंग साइन नहीं",
    ],
    "Constant pain completely unaffected by position or movement": [
      "constant pain that does not change with position", "pain unaffected by movement", "nothing changes the pain at all", "pain stays the same whatever i do",
      "constant pain not affected by posture", "unrelenting constant pain", "pain is the same in every position", "pain not relieved by any position",
      "dard position badalne se bhi kam nahi hota", "har position me ek jaisa dard", "dard hamesha rehta hai chahe kuch bhi karun", "kisi bhi position me dard kam nahi hota",
      "हिलने डुलने से भी दर्द कम नहीं होता", "दर्द हर हालत में एक जैसा रहता है", "लगातार दर्द जो किसी स्थिति से नहीं बदलता", "किसी भी पोजीशन में दर्द कम नहीं होता",
    ],
    "Night pain — awakens patient — progressive": [
      "night pain that wakes me up and is getting worse", "progressive night pain", "pain wakes me every night and keeps getting worse", "waking at night with worsening pain",
      "night pain getting worse over weeks", "pain at night that is steadily increasing", "wakes me at night and is progressively worse",
      "raat ko dard se neend khul jati hai aur badhta ja raha hai", "raat ko dard jagata hai roz badh raha hai", "raat ka dard din ba din badh raha hai", "har raat dard se uthna padta hai aur badh raha hai",
      "रात को दर्द से नींद खुल जाती है और बढ़ता जा रहा है", "रात को दर्द जगाता है रोज बढ़ रहा है", "रात का दर्द दिन ब दिन बढ़ रहा है", "हर रात दर्द से उठना पड़ता है और बढ़ रहा है",
    ],
    "Progressive worsening despite conservative treatment": [
      "getting worse despite physiotherapy", "no improvement with treatment and getting worse", "worsening despite treatment", "worse even after medication and physio",
      "getting worse in spite of treatment", "treatment is not working and the pain is increasing", "worse after weeks of treatment",
      "ilaaj ke baad bhi dard badh raha hai", "physio ke baad bhi dard badh raha hai", "dawai se bhi fayda nahi aur dard badh gaya", "ilaaj chal raha hai phir bhi dard badh raha hai",
      "इलाज के बाद भी दर्द बढ़ रहा है", "फिजियो के बाद भी दर्द बढ़ रहा है", "दवाई से भी फायदा नहीं और दर्द बढ़ गया", "इलाज चल रहा है फिर भी दर्द बढ़ रहा है",
    ],
    "Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw": [
      "chest tightness with the pain", "pain with chest tightness", "chest pressure with sweating", "chest heaviness with the back pain", "tightness in the chest and pain down the left arm",
      "sweating and chest pain", "crushing chest pain", "chest feels tight and heavy",
      "seene me jakdan ke saath dard", "seene par dabav aur dard", "seene me bharipan aur peeth dard", "seene me dabav aur bayen haath me dard",
      "सीने में जकड़न के साथ दर्द", "सीने पर दबाव और दर्द", "सीने में भारीपन और पीठ दर्द", "सीने में दबाव और बाएं हाथ में दर्द",
    ],
    "Cardiac history — pain reproduces cardiac pattern": [
      "history of heart disease", "bypass operation", "bypass surgery", "heart surgery", "angioplasty", "pacemaker fitted", "cardiac surgery", "heart attack in the past", "i have angina", "previous heart attack", "known cardiac condition", "heart patient", "had a stent", "bypass surgery",
      "same as my angina pain", "pain feels like my heart pain before",
      "dil ki bimari ka history", "pehle heart attack aa chuka hai", "dil ka operation hua tha", "angina ki samasya hai",
      "दिल की बीमारी का इतिहास", "पहले हार्ट अटैक आ चुका है", "दिल का ऑपरेशन हुआ था", "एंजाइना की समस्या है",
    ],
    "Respiratory symptoms — shortness of breath / haemoptysis": [
      "shortness of breath", "breathless", "difficulty breathing", "coughing up blood", "haemoptysis", "short of breath with the pain", "blood in sputum", "cant catch my breath", "breathlessness",
      "saans phoolna", "saans lene me takleef", "khansi me khoon aata hai", "saans ukhadna",
      "सांस फूलना", "सांस लेने में तकलीफ", "खांसी में खून आता है", "सांस उखड़ना",
    ],
    "Abdominal symptoms — pain with eating / weight loss": [
      "pain after eating", "pain with meals", "loss of appetite and weight loss", "pain when i eat", "stomach pain with eating", "vomiting after food", "abdominal symptoms", "pain gets worse after meals",
      "khane ke baad dard", "khana khane par dard", "bhookh nahi lagti aur wazan kam", "khane ke baad ulti aur peeth dard",
      "खाना खाने के बाद दर्द", "खाने पर पीठ में दर्द", "भूख नहीं लगती और वजन कम", "खाने के बाद उल्टी और पीठ दर्द",
    ],
    "Cancer history — any — thoracic metastases risk": [
      "~cancer", "~cancer history", "history of cancer", "had cancer", "cancer survivor", "treated for cancer", "breast cancer history", "known malignancy", "previous cancer", "metastases",
      "~kainsar", "cancer ka history", "kabhi cancer hua tha", "cancer ka ilaaj hua tha", "pehle cancer tha",
      "~कैंसर", "कैंसर का इतिहास", "कभी कैंसर हुआ था", "कैंसर का इलाज हुआ था", "पहले कैंसर था",
    ],
    "Unexplained weight loss + thoracic pain": [
      "unexplained weight loss", "losing weight without trying", "lost weight without dieting", "weight loss for no reason", "weight dropping with back pain", "lost a lot of weight recently",
      "wazan bina wajah ghat gaya", "wazan kam ho raha hai bina koshish", "bina diet ke wazan kam hua", "wazan tezi se gir raha hai",
      "वजन बिना वजह कम हुआ", "बिना कोशिश के वजन घट रहा है", "बिना डाइट के वजन कम हुआ", "वजन तेजी से गिर रहा है",
    ],
    "Fever + thoracic pain (discitis / osteomyelitis)": [
      "fever with back pain", "fever and thoracic pain", "temperature and chills with the pain", "night sweats and fever", "high temperature with back pain", "fever and chills with spine pain",
      "bukhar ke saath peeth dard", "bukhar aur peeth me dard", "bukhar aur kaampkampi ke saath dard", "tez bukhar aur reedh me dard",
      "बुखार के साथ पीठ दर्द", "बुखार और पीठ में दर्द", "बुखार और कंपकंपी के साथ दर्द", "तेज बुखार और रीढ़ में दर्द",
    ],
    "Recent trauma — fracture risk": [
      "recent fall", "recent accident", "recent injury to the back", "had a fall last week", "road accident recently", "recent trauma", "fell a few days ago", "recently hit my back",
      "haal hi me gir gaya", "pichle hafte accident hua", "haal ki chot", "kuch din pehle gir gaya tha",
      "हाल ही में गिर गया", "पिछले हफ्ते एक्सीडेंट हुआ", "हाल की चोट", "कुछ दिन पहले गिर गया था",
    ],
    "Known osteoporosis — pathological fracture risk": [
      "osteoporosis", "known osteoporosis", "weak bones", "brittle bones", "low bone density", "osteoporosis diagnosed", "told i have thin bones", "i have osteoporosis",
      "haddiyan kamzor hain", "osteoporosis hai", "haddi ka ghanatva kam hai", "haddiyan bhurbhuri ho gayi hain",
      "हड्डियां कमजोर हैं", "ऑस्टियोपोरोसिस है", "हड्डी का घनत्व कम है", "हड्डियां भुरभुरी हो गई हैं",
    ],
    "Neurological symptoms in legs — cord compression": [
      "tingling in both legs", "numbness in the legs", "leg numbness with back pain", "pins and needles in the legs", "legs feel numb", "legs feel strange", "numb legs",
      "pairon me sunnpan", "pairon me jhunjhuni", "tango me sunn pan", "pairon me chinti si chalti hai",
      "पैरों में सुन्नपन", "पैरों में झनझनाहट", "टांगों में सुन्न", "पैरों में चींटी सी चलती है",
    ],
    "Bilateral leg weakness or sensory change (cord level)": [
      "both legs are weak", "weakness in both legs", "legs giving way", "heaviness in both legs", "difficulty walking because the legs are weak", "legs have become weak", "legs feel heavy",
      "dono pairon me kamzori", "pairon me kamzori aur chalne me dikkat", "dono pair bhaari lagte hain", "pair jawab de dete hain",
      "दोनों पैरों में कमजोरी", "पैरों में कमजोरी और चलने में दिक्कत", "दोनों पैर भारी लगते हैं", "पैर जवाब दे देते हैं",
    ],
    "Age >50 — first episode without cause": [
      "first ever episode of back pain", "never had back pain before and over fifty", "first time back pain at an older age", "new back pain for the first time at my age",
      "first episode without any cause", "over fifty and this is my first episode", "over 50 with new onset pain",
      "pehli baar peeth dard pachas saal ke baad", "pehli baar dard hua hai aur umar zyada hai", "pachas se upar umar me pehla dard", "bina wajah pehli baar dard bade umar me",
      "पहली बार पीठ दर्द पचास साल के बाद", "पहली बार दर्द हुआ है और उम्र ज्यादा है", "पचास से ऊपर उम्र में पहला दर्द", "बिना वजह पहली बार दर्द बड़ी उम्र में",
    ],
    "Systemically unwell — malaise + thoracic pain": [
      "feeling unwell", "generally unwell", "malaise", "feel terrible all over", "tired and unwell with the back pain", "run down and unwell", "fatigue and feeling ill", "feel ill all over",
      "tabiyat kharab rehti hai", "bahut thakan aur kamzori", "poore sharir me bechaini", "bimar bimar sa lagta hai",
      "तबीयत खराब रहती है", "बहुत थकान और कमजोरी", "पूरे शरीर में बेचैनी", "बीमार बीमार सा लगता है",
    ],
  },

  fnAdl: {
    "No limitations": [
      "no limitations", "no limitation", "not limiting anything", "can do everything", "no problem with daily activities", "nothing is limited", "no functional limitation",
      "koi pareshani nahi kaam me", "sab kaam kar leta hoon", "kisi kaam me dikkat nahi", "koi rukavat nahi",
      "कोई परेशानी नहीं काम में", "सब काम कर लेता हूं", "किसी काम में दिक्कत नहीं", "कोई रुकावट नहीं",
    ],
    "Deep breathing": [
      "cannot take a deep breath", "difficulty breathing deeply", "deep breaths are limited by pain", "unable to breathe in fully", "cant breathe deeply because of the pain", "shallow breathing because of pain",
      "gehri saans nahi le pata", "gehri saans lene me dikkat", "poori saans nahi le pata", "dard ki wajah se saans poori nahi bharta",
      "गहरी सांस नहीं ले पाता", "गहरी सांस लेने में दिक्कत", "पूरी सांस नहीं ले पाता", "दर्द की वजह से सांस पूरी नहीं भरता",
    ],
    "Coughing / sneezing": [
      "cannot cough properly", "afraid to cough or sneeze", "coughing is difficult", "sneezing is painful so i hold it", "cant cough without pain", "cough and sneeze are limited",
      "khansi ya chheenk nahi pata", "khansne se dar lagta hai", "chheenkne me dikkat", "khansi dabani padti hai dard ki wajah se",
      "खांसी या छींक नहीं पाता", "खांसने से डर लगता है", "छींकने में दिक्कत", "खांसी दबानी पड़ती है दर्द की वजह से",
    ],
    "Sitting tolerance": [
      "cannot sit for long", "difficulty sitting for long", "sitting tolerance is poor", "cant sit for more than ten minutes", "have to stand up after sitting a while", "sitting is limited",
      "der tak baith nahi pata", "zyada der baithna mushkil", "baithne me dikkat hoti hai", "das minute se zyada baith nahi pata",
      "देर तक बैठ नहीं पाता", "ज्यादा देर बैठना मुश्किल", "बैठने में दिक्कत होती है", "दस मिनट से ज्यादा बैठ नहीं पाता",
    ],
    "Driving": [
      "difficulty driving", "cant drive for long", "driving is painful", "cannot drive because of the pain", "turning to check blind spots is hard", "stopped driving",
      "gaadi chalane me dikkat", "gaadi nahi chala pata", "driving karna mushkil", "lambi drive nahi kar pata",
      "गाड़ी चलाने में दिक्कत", "गाड़ी नहीं चला पाता", "ड्राइविंग करना मुश्किल", "लंबी ड्राइव नहीं कर पाता",
    ],
    "Computer work": [
      "difficulty working at the computer", "cant work on the computer for long", "computer work is painful", "typing at a desk is hard", "limited at my desk job", "cant use the laptop for long",
      "computer par kaam karne me dikkat", "computer par zyada der kaam nahi kar pata", "laptop par kaam mushkil", "desk par baithkar kaam nahi hota",
      "कंप्यूटर पर काम करने में दिक्कत", "कंप्यूटर पर ज्यादा देर काम नहीं कर पाता", "लैपटॉप पर काम मुश्किल", "डेस्क पर बैठकर काम नहीं होता",
    ],
    "Sport": [
      "cannot play sport", "had to stop sport", "unable to exercise", "cant go to the gym", "stopped playing because of the pain", "sport is limited", "cant do my workouts",
      "khel nahi pata", "khelna band kar diya", "gym nahi ja pata", "exercise nahi kar pata",
      "खेल नहीं पाता", "खेलना बंद कर दिया", "जिम नहीं जा पाता", "एक्सरसाइज नहीं कर पाता",
    ],
    "Lifting": [
      "cannot lift anything", "difficulty lifting", "cant carry heavy things", "unable to lift my child", "lifting is limited", "cant carry shopping bags", "avoid lifting because of the pain",
      "kuch utha nahi pata", "bhaari saman nahi utha pata", "uthane me dikkat", "bachche ko nahi utha pata",
      "कुछ उठा नहीं पाता", "भारी सामान नहीं उठा पाता", "उठाने में दिक्कत", "बच्चे को नहीं उठा पाता",
    ],
    "Sleeping": [
      "cannot sleep properly", "hard to get comfortable at night", "wake up often at night because of pain", "trouble sleeping because of the pain", "sleep is disturbed", "cant get comfortable in bed", "cannot find a comfortable position to sleep", "poor sleep due to pain",
      "neend nahi aati dard se", "so nahi pata", "raat ko theek se so nahi pata", "neend kharab ho gayi hai",
      "नींद नहीं आती दर्द से", "सो नहीं पाता", "रात को ठीक से सो नहीं पाता", "नींद खराब हो गई है",
    ],
    "Work tasks": [
      "cannot do my work", "difficulty doing my job", "work is affected", "cant manage my work duties", "had to take leave from work", "unable to work properly",
      "kaam nahi kar pata", "naukri me dikkat", "office ka kaam nahi ho pata", "kaam par jana mushkil",
      "काम नहीं कर पाता", "नौकरी में दिक्कत", "ऑफिस का काम नहीं हो पाता", "काम पर जाना मुश्किल",
    ],
  },
};


// Added for the way a CLINICIAN types about a patient ("the patient", "they", short notes) -- see thoracicSheetSet.js. Kept apart from the
// base lists so the order of the answers (which the tests index by position) never changes.
const SHEET_PHRASES = {
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const THORACIC_PHRASES = mergePhrases(THORACIC_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W } = WORDS;
// Words that say a sentence is about the thoracic region / about another one.
const OWN_W = "mid_back middle_back upper_back peeth पीठ thoracic rib* chest chhati छाती seena सीना spine reedh रीढ sternum breastbone scapula* shoulder_blade shoulder_blades blade blades interscapular paraspinal kandha कंधा chhatti pasli पसली";
const FOREIGN_W = "knee* ankle* foot feet toe* elbow* wrist* neck* cervical gardan गर्दन headache jaw hip* groin lower_back low_back lumbar kamar कमर tooth teeth eye* ear throat ghutna घुटना takhna टखना kohni कोहनी kalai कलाई sir सिर";
const FAMILY_W = WORDS.FAMILY;
// A sentence about the thoracic spine that mentions these other places is still about the thoracic spine.
const EXEMPT = [
  "redFlags|Neurological symptoms in legs — cord compression",
  "redFlags|Bilateral leg weakness or sensory change (cord level)",
  "radiation|To anterior chest — cardiac / visceral differential",
  "location|Cervico-thoracic junction C7–T2",
  "location|Thoracolumbar junction T12–L1",
  "radiation|To groin / hip — lower thoracic referred",
  "radiation|Cardiac-like radiation — left chest / arm (urgent flag)",
  "redFlags|Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw",
];

const AGE_50_PLUS = Array.from({ length: 49 }, (_, i) => String(51 + i)).join(" ") + " fifty_one fifty_five sixty seventy sixty_five over_50 over_fifty above_50 above_fifty pachas पचास साठ sattar सत्तर";

const matcher = createPhraseMatcher({
  phrases: THORACIC_PHRASES,
  singleChoiceFields: [],
  noneOptions: { radiation: "No radiation — local", relTreatments: "No treatment helps", redFlags: "No red flags", fnAdl: "No limitations" },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  guardExempt: EXEMPT,
  optionGuards: {
    "redFlags|Cancer history — any — thoracic metastases risk": FAMILY_W,
    "redFlags|Known osteoporosis — pathological fracture risk": FAMILY_W,
    "redFlags|Cardiac history — pain reproduces cardiac pattern": FAMILY_W,
    // "pain goes round to the front of my chest" says where the pain GOES, not where it is
    "pattern|Morning stiffness": "better improves improve* eases ease loosen* loosens settles hilne हिलने theek ठीक kam कम movement moving",
    // "stop slouching" is advice, not a movement that hurts
    "aggMovements|Flexion": "stop stopped stopping correct correcting correction",
    // "pain on the right between the shoulder blades" is the right-hand interscapular option, not the central one
    "location|Interscapular — central": "on_right on_left right_sided left_sided right_side left_side",
    "location|Anterior chest wall": "goes go going radiat* spread* travel* shoots jata जाता failta फैलता aata आता through round",
  },
  hinglish: [
    [/\bon (?:their |my |his |her |the )?feet\b/g, "standing"], // "a long time on their feet" is a standing posture; "feet" alone would read as another body part
    ...SIDE_HINGLISH,
    [/\b(peeth|pith|peith|peet|pitth|peetha)\b/g, "peeth"],
    [/\b(reedh|reed|ridh|rirh|reerh|reedhh|redh)\b/g, "reedh"],
    [/\b(pasli|pasliyan|pasliyon|pasliya|pasliyaan|pasliyo|paslee)\b/g, "pasli"],
    [/\b(chhati|chhaati|chaati|chati|chhatti|chhatee)\b/g, "chhati"],
    [/\b(seena|seene|sine|sina|seenay)\b/g, "seena"],
    [/\b(kandha|kandhe|kandhon|kanda|kande|kandho)\b/g, "kandha"],
    [/\b(beech|bich|bichh)\b/g, "beech"],
    [/\b(khansi|khaansi|khasi|khansee|khaasi|khaansee|khansne|khansna)\b/g, "khansi"],
    [/\b(chheenk|chheenkna|chheenkne|chhink|chhinkna|chheenkte|chheenkta|chhinkne)\b/g, "chheenk"],
    [/\b(saans|sans|saas|saanse|saansein|saanson)\b/g, "saans"],
    [/\b(jhukne|jhukna|jhukte|jhukta|jhukti|jhuk|jhukkar|jhukar)\b/g, "jhuk"],
    [/\b(ghumne|ghumna|ghoomne|ghoomna|ghumte|ghumta|ghoomte|ghoomta|ghumane|ghumana)\b/g, "ghum"],
    [/\b(bhaari|bhari|bhaaree|bhaarii)\b/g, "bhaari"],
    [/\b(hasne|hasna|hanste|hansna|hansne|hansta|haste)\b/g, "hans"],
    [/\b(aage|aagey|aga)\b/g, "aage"],
    [/\b(peeche|piche|pichhe|peechhe|pichche)\b/g, "peeche"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche|nichli|nichle)\b/g, "niche"],
    [/\b(jod|jodh|jode)\b/g, "jod"],
    [/\b(bukhar|bukhaar|bukar|bukhaar)\b/g, "bukhar"],
    [/\b(wazan|vajan|vazan|wajan|vajn)\b/g, "wazan"],
    [/\b(thakan|thakaan|thkan|thakawat)\b/g, "thakan"],
    [/\b(neend|nind|neendh)\b/g, "neend"],
    [/\b(khichav|khichaav|khinchav|khichao|khinchaav|khichaw)\b/g, "khichav"],
    [/\b(dawai|dawa|davai|dava|davaai|dawaai)\b/g, "dawai"],
    [/\b(sekai|sek|sekaai|seki)\b/g, "sekai"],
    [/\b(paer|pair|pao|pav|pairon|pairo|paero|payron)\b/g, "pair"],
    [/\b(kamar|kamer|kmar)\b/g, "kamar"],
    [/\b(gardan|gardhan|gardn)\b/g, "gardan"],
    [/\b(bhaaripan|bharipan|bhariyan|bharipann|bhaaripann)\b/g, "bharipan"],
    [/\b(phoolti|phoolta|phoolna|phoolne|phoola|phooli|phulti|phulta|phulna|phool)\b/g, "phool"],
  ],
  deva: [
    ...SIDE_DEVA,
    [/पसल(ी|ि)(यों|यां|या|यो)?/g, "पसली"],
    [/सीन(ा|े)/g, "सीना"],
    [/कंध(ा|े|ों|ो)/g, "कंधा"],
    [/खांस(ी|ने|ना|ते|ता)/g, "खांसी"],
    [/छींक(ने|ना|ते|ता)?/g, "छींक"],
    [/सांस/g, "सांस"],
    [/झुक(ना|ने|ते|ता|ती|कर)?/g, "झुक"],
    [/घूम(ना|ने|ते|ता|ती)?/g, "घूम"],
    [/मुड(ना|ने|ते|ता|ती)/g, "मुड"],
    [/हंस(ना|ने|ते|ता|ती)/g, "हंस"],
    [/उठा(ना|ने|ते|ता|ती)/g, "उठाना"],
    [/पैर(ों)?/g, "पैर"],
    [/बुखार/g, "बुखार"],
  ],
  rules: ({ rule, O }) => {
    const L = (i) => O("location", i);
    const [UPPER, MID, LOWER, CTJ, TLJ, ISC, ISL, ISR, COSTO, LATW, ANTW, STERN, BAND, PARA] = Array.from({ length: 14 }, (_, i) => L(i));
    // "set it off", "brings it on": the sentence says what triggers the pain even without a pain word
    const PAINX = PAIN_W + " agony agonising agonizing excruciating unbearable terrible awful worst worse";
    const TRIG = "set_off set_it_off sets_it_off sets_off brings_it_on bring_it_on brought_it_on triggers_it triggers triggered trigger brings_on bring_on brought_on aggravates aggravated worsens worsened flares flare flared makes_it_worse make_it_worse hurts hurt bothers";
    const WHEN = "when whenever while on during with every each par पर jab जब";
    const SCAP = "shoulder_blade shoulder_blades shoulderblade shoulderblades blade blades scapula scapulae scapular kandha कंधा";
    // location
    rule("location", UPPER, ["upper upari upar ऊपरी ऊपर high top", "back peeth पीठ thoracic"], 4, { unless: "lower mid middle beech बीच abdomen abdominal stomach pet पेट kamar कमर" });
    rule("location", MID, ["mid middle beech बीच centre center madhya मध्य", "back peeth पीठ thoracic"], 6, { unless: "shoulder_blade shoulder_blades blades scapula kandha कंधा कंधों interscapular lower upper" });
    rule("location", ISC, ["between bw beech बीच interscapular", SCAP], 5);
    rule("location", ISL, [LEFT_W, SCAP], 11, { ctx: "painOrArm", unless: "right dayen दायां", blockBefore: "have has had having" });
    rule("location", ISR, [RIGHT_W, SCAP], 11, { ctx: "painOrArm", unless: "left bayen बायां" });
    rule("location", COSTO, ["rib* pasli पसली", "spine reedh रीढ", "junction joint jod जोड़ meet* join* attach* near paas पास"], 7, { ctx: "pain", unless: "lumbar last_rib twelfth_rib" });
    rule("location", LATW, ["side bagal बगल sides", "rib* pasli पसली chest chhati छाती seena सीना"], 4, { ctx: "pain", unless: "spine reedh रीढ back peeth पीठ both dono दोनों" });
    rule("location", ANTW, ["front anterior aage आगे samne सामने", "chest chhati छाती seena सीना rib* pasli पसली"], 6, { ctx: "pain", unless: "goes go going radiat* spread* travel* comes through refer* जाता आता फैलता wrap* around charo चारों band belt girdle", blockBefore: "through" });
    rule("location", STERN, ["middle centre center beech बीच midline", "chest chhati छाती seena सीना sternum"], 3, { ctx: "pain", unless: "back peeth पीठ" });
    rule("location", UPPER, ["t1 t2 t3 t4"], 1, { unless: "thyroid tsh t3_t4_levels" });
    rule("location", MID, ["t5 t6 t7 t8"], 1);
    rule("location", LOWER, ["t9 t10 t11 t12"], 1, { unless: "l1" });
    rule("location", STERN, ["sternum sternal breastbone", PAIN_W + " tender tenderness"], 8, { unless: "goes go going radiat* spread* travel* through refer*" });
    rule("location", BAND, ["band belt girdle patta patti पट्टी पट्टा wrap* wrapping charo चारों gher* घेर*", "chest ribs rib pasli पसली chhati छाती seena सीना"], 6, { unless: "arm arms jaw jabda जबड़े haath हाथ" });
    rule("location", PARA, ["both dono दोनों either bilateral", "side sides taraf तरफ", "spine reedh रीढ paraspinal backbone"], 6, { ctx: "painOrArm" });
    // radiation
    const R = (i) => O("radiation", i);
    const [RNONE, RWALL, RBLADE, RANT, RABD, RGROIN, RBILAT, RCARD] = Array.from({ length: 8 }, (_, i) => R(i));
    const SPREAD = "goes go going radiat* spread* travel* shoots shoot refer* runs run running extend* extends passes pass jata जाता failta फैलता aata आता";
    rule("radiation", RWALL, [SPREAD, "around round going_round charo चारों", "rib* pasli पसली chest chhati छाती"], 7);
    rule("radiation", RWALL, [SPREAD, "along follows following saath_saath साथ_साथ", "rib* pasli पसली"], 10);
    rule("radiation", RBLADE, [SPREAD, SCAP + " interscapular"], 5);
    rule("radiation", RANT, [SPREAD + " through aar आर", "front_of_chest front_chest chest chhati छाती seena सीना sternum breastbone"], 6, { unless: "left bayen बायां arm haath हाथ jaw jabda जबड़े" });
    rule("radiation", RABD, [SPREAD, "stomach abdomen belly tummy pet पेट"], 8);
    rule("radiation", RGROIN, [SPREAD, "groin hip jaangh जांघ kulha कूल्हे kulhe"], 5);
    rule("radiation", RGROIN, ["groin jaangh जांघ", PAIN_W], 4, { blockBefore: "no without" });
    rule("radiation", RNONE, ["doesnt does_not dont not no never nahi नहीं", "travel* spread* radiat* shoot* jata जाता failta फैलता"], 3, { selfNeg: true });
    rule("radiation", RBILAT, ["both dono दोनों bilateral", "side sides taraf तरफ", "chest chhati छाती seena सीना rib* pasli पसली"], 5, { ctx: "painOrArm" });
    rule("radiation", RCARD, [SPREAD + " pain dard दर्द", "left bayen बायां", "arm haath हाथ jaw jabda जबड़े jabde"], 6, { unless: "right dayen दायां" });
    // mechanism
    const M = (i) => O("mechanismType", i);
    const [MINS, MLIFT, MROT, MFALL, MMVA, MDESK, MPOST, MPP, MOSTEO, MVIRAL, MNONE] = Array.from({ length: 11 }, (_, i) => M(i));
    const ONSET = "started began start onset achanak अचानक sudden suddenly went gave_way snapped felt pop popped pulled strain strained strains injury injured twinge catch caught after hua हुआ aaya आया shuru शुरू khichav खिंचाव lag लग hurt";
    const LOAD = "heavy weight box* bag* suitcase* luggage bhaari भारी wazan वजन bojh बोझ saman सामान luggage furniture suitcase cylinder bucket";
    rule("mechanismType", MLIFT, ["lift* lifted lifting carry carrying carried uthate uthane uthaya उठाते उठाने उठाया", LOAD, ONSET], 9, { unless: "cant cannot unable avoid heaviness tingling tingly numbness numb" });
    rule("mechanismType", MDESK, ["computer laptop desk कंप्यूटर", "kaam काम work working typing"], 5, { ctx: "painOrArm", unless: "cant cannot unable stopped possible impossible difficulty hard" });
    rule("mechanismType", MINS, ["gradual gradually slowly slow dheere धीरे", "start* began onset shuru शुरू come came badh बढ़ worse worsen* worsened increas*"], 6, { ctx: "painOrArm", selfNeg: true, unless: "improv* better theek ठीक kam कम settl*" });
    rule("mechanismType", MROT, ["twist* turned turning rotat* mod mud* ghum* घूम* मुड़*", "suddenly sharp catch jhatka झटका khichav खिंचाव kat awkwardly achanak अचानक quickly"], 6, { ctx: "painOrArm" });
    rule("mechanismType", MFALL, ["fell fall fallen slipped came_off thrown gir* गिर*", "back peeth पीठ stairs bal बल ladder height roof tree horse bike scooter"], 5);
    rule("mechanismType", MFALL, ["hit struck kicked banged blow punch maar मार laat लात", "back peeth पीठ"], 4, { unless: "car bike accident takkar टक्कर" });
    rule("mechanismType", MMVA, ["accident takkar टक्कर crash collision mva rta", "car bike road gaadi गाड़ी motorcycle truck bus vehicle scooter motorway highway rear"], 5);
    rule("mechanismType", MDESK, ["desk computer laptop screen office कंप्यूटर", "hours ghante घंटे ghanto घंटों all_day long der देर zyada ज्यादा sitting baith* बैठ*"], 8, { unless: "cant cannot unable possible impossible difficulty hard minutes" });
    rule("mechanismType", MPOST, ["surgery operation operated ऑपरेशन सर्जरी thoracotomy", "after post since following baad बाद"], 6);
    rule("mechanismType", MPP, ["breastfeed* breast_feed* nursing feeding doodh दूध", "baby infant child bachcha bachche बच्चे बच्चा pilate पिलाते"], 6);
    rule("mechanismType", MPP, ["delivery childbirth birth janm जन्म", "after post since baad बाद"], 5);
    rule("mechanismType", MOSTEO, ["fracture fractured toot टूट* crack*", "minor small trivial little minimal halki हल्की chhoti छोटी mamuli मामूली sneez* cough*"], 8, { unless: "major severe high_energy" });
    rule("mechanismType", MVIRAL, ["viral flu covid infection virus bukhar बुखार khansi खांसी", "after post baad बाद following"], 6, { ctx: "painOrArm" });
    rule("mechanismType", MVIRAL, ["flu covid viral virus infection", "rib* pasli पसली chest chhati छाती seena सीना"], 14, { ctx: "painOrArm", unless: "cancer fracture" });
    rule("mechanismType", MNONE, ["no without any", "injury trauma incident", "remember recall"], 9, { selfNeg: true });
    rule("mechanismType", MDESK, ["wfh work_from_home software_developer software_dev programmer coder desk_job office_job it_job"], 3, { ctx: "painOrArm", unless: "cant cannot unable stopped" });
    rule("mechanismType", MROT, ["started began start onset after", "twist* turn* turned rotat* mod ghum*"], 4, { ctx: "painOrArm" });
    rule("mechanismType", MMVA, ["car bike vehicle lorry truck bus scooter motorbike motorcycle", "hit struck rear_ended collided collision crash"], 6);
    // aggravating movements
    const A = (i) => O("aggMovements", i);
    const [AROT, ASIDE, AEXT, AFLEX, ACOMB, AIN, AOUT, ACOUGH, ASNEEZE, ALAUGH, ASUST, AQUICK, ALIFT, AREACH] = Array.from({ length: 14 }, (_, i) => A(i));
    rule("aggMovements", AROT, ["twist* rotat* turn* mod ghum* घूम* mud* मुड़*", PAIN_W], 7, { unless: "bend* flex* jhuk* झुक* lift* uthana उठाना" });
    rule("aggMovements", AROT, [WHEN, "twist* rotat* turn* mod ghum* घूम* मुड़*"], 3, { ctx: "pain", blockBefore: "started began start onset", unless: "bend* flex* jhuk* झुक* lift* uthana उठाना" });
    rule("aggMovements", ASIDE, ["side sideways lateral bagal बगल", "bend* bending lean* leaning jhuk* झुक*"], 5);
    rule("aggMovements", AEXT, ["backward backwards peeche पीछे arch* kamaan कमान", "bend* bending lean* leaning jhuk* झुक* extension", PAIN_W], 7, { unless: "side sideways" });
    rule("aggMovements", AEXT, ["arch arches arching kamaan कमान lies_back lie_back lying_back lean_back leaning_back"], 2, { ctx: "pain" });
    rule("aggMovements", AFLEX, ["forward forwards aage आगे slouch* stoop* hunch* rounding", "bend* bending lean* leaning jhuk* झुक* sitting"], 5, { ctx: "pain", unless: "side sideways" });
    rule("aggMovements", AFLEX, ["bend* bending bent stoop* stooping jhuk* झुक*", PAINX], 6, { unless: "side sideways lateral backward backwards peeche पीछे twist* turn* rotat* ghum* mod arch*" });
    rule("aggMovements", AFLEX, ["bending bend stooping", "down floor shoelaces ground pick", PAINX], 8, { unless: "side sideways" });
    rule("aggMovements", ACOMB, ["bend* bending jhuk* झुक*", "twist* twisting rotat* turn* ghum* घूम* mud* मुड़*"], 6, { ctx: "pain" });
    rule("aggMovements", AIN, ["deep gehri गहरी breath breathe breathing inhale inhaling inspiration saans सांस", "in andar अंदर lene लेने lete लेते take taking"], 6, { ctx: "pain", unless: "out exhal* bahar बाहर chhod* छोड़* cant cannot unable difficulty trouble" });
    rule("aggMovements", AIN, ["deep deeply gehri गहरी", "breath breathe breathes breathing saans सांस"], 4, { ctx: "pain", unless: "out exhal* bahar बाहर chhod* छोड़* cant cannot unable difficulty trouble" });
    rule("aggMovements", AIN, ["inspiration inspiratory inhale inhaling inhalation", PAIN_W], 10, { unless: "cant cannot unable difficulty trouble" });
    rule("aggMovements", AOUT, ["breathe breathing breath saans सांस", "out exhal* expiration bahar बाहर chhod* छोड़* nikal* निकाल*"], 6, { ctx: "pain" });
    rule("aggMovements", ACOUGH, ["cough* khansi खांसी khansne खांसने khasi", PAINX], 7, { blockBefore: "with have has had nasty bad", noComma: true, unless: "blood khoon खून haemoptysis hemoptysis" });
    rule("aggMovements", ACOUGH, [WHEN, "cough* khansi खांसी"], 3, { ctx: "pain", noComma: true, unless: "blood khoon खून haemoptysis hemoptysis" });
    rule("aggMovements", ASNEEZE, ["sneeze sneezes sneezing chheenk छींक chheenkne छींकने", PAIN_W], 7, { noComma: true });
    rule("aggMovements", ASNEEZE, [WHEN, "sneeze sneezes sneezing chheenk छींक"], 3, { ctx: "pain", noComma: true });
    rule("aggMovements", ALAUGH, ["laugh laughs laughing hans हंस hasne", PAIN_W], 7, { noComma: true });
    rule("aggMovements", ALAUGH, [WHEN, "laugh laughs laughing hans हंस"], 3, { ctx: "pain", noComma: true });
    rule("aggMovements", ASUST, ["sustained prolonged long der देर lambe लंबे", "sitting standing position posture baith* बैठ* posture mudra मुद्रा sthiti स्थिति same ek एक"], 6, { ctx: "pain" });
    rule("aggMovements", ASUST, ["one_position same_position single_position one_posture same_posture one_place ek_hi एक_ही journeys journey drives long_drive", "hours long prolonged der देर ghante घंटे ghanto घंटों lambe लंबे", PAIN_W + " " + TRIG], 12, { unless: "cant cannot unable" });
    rule("aggMovements", AQUICK, ["sudden suddenly quick quickly jerky jerk jerks abrupt achanak अचानक jhatke झटके tez तेज", "movement movements motion harkat हरकत hilne हिलने hilna twist trunk body"], 5, { ctx: "pain" });
    rule("aggMovements", AQUICK, ["sudden suddenly quick jerk jerks jerky abrupt achanak अचानक jhatke झटके", "movement movements motion harkat हरकत hilne हिलने trunk body", TRIG], 9);
    rule("aggMovements", ALIFT, ["lifting lift lifts uthane उठाने", TRIG], 10, { unless: "started began cant cannot unable overhead above_head over_head" });
    rule("aggMovements", ALIFT, ["lift* lifted lifting uthane उठाने uthate उठाते uthana उठाना carry* carrying", "heavy weight bag box bhaari भारी wazan वजन saman सामान things cheez चीज"], 6, { ctx: "painOrArm", unless: "overhead above_head arms_up arm_up haath_upar upar_haath started began felt pop popped pulled strain strained injury injured hua हुआ aaya आया shuru शुरू khichav खिंचाव cant cannot unable" });
    rule("aggMovements", AREACH, ["reach* raise raising lifting overhead above_head over_head upar upar_haath haath_upar ऊपर", "arm arms haath हाथ shelf overhead above_head over_head"], 6, { ctx: "painOrArm" });
    rule("aggMovements", AREACH, ["reach* reaching", "overhead above_head over_head up upar shelf"], 4, { ctx: "painOrArm" });
    // what helps
    const T = (i) => O("relTreatments", i);
    const [THEAT, TICE, TMANIP, TMOB, TSTRETCH, TBREATH, TPOST, TTAPE, TNSAID, TPARA, TRELAX, TNONE] = Array.from({ length: 12 }, (_, i) => T(i));
    const HELP = "help helps helped helping relax relaxes relaxed loosen loosens relief relieve relieves relieved ease eases eased settle settles settled calm calms soothe soothes better improves improved works worked aaram आराम rahat राहत fayda फायदा kam कम effective helpful away gone largely off looser freer";
    rule("relTreatments", THEAT, ["heat hot_water_bottle water_bottle hot_pack heat_pack hot warm garam गरम गर्म sekai सेकाई compress heating", HELP], 14, { unless: "cold ice thanda ठंडा baraf बर्फ", blockAfter: "nothing none" });
    rule("relTreatments", TICE, ["ice cold baraf बर्फ thanda ठंडा", HELP], 8, { unless: "heat hot warm garam गरम" , blockAfter: "nothing none" });
    rule("relTreatments", TMANIP, ["manipulation मैनिपुलेशन मैनीपुलेशन chiropractor chiropractic adjust* crack* cracking clicking bithane बिठाने", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TMOB, ["mobilis* mobiliz* mobilisation manual_therapy hands_on", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TSTRETCH, ["stretch* स्ट्रेच* khichav खिंचाव tanne तानने", HELP], 12, { blockAfter: "nothing none" });
    rule("relTreatments", TBREATH, ["pranayam* प्राणायाम anulom अनुलोम breathing_exercise breathing_exercises diaphragmatic", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TPOST, ["posture पोस्चर sitting_up_straight sit_up_straight sitting_straight sit_straight standing_straight standing_tall stand_tall seedha_baithne सीधा_बैठने seedha_khade सीधा_खड़े upright", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TTAPE, ["tape taping kinesio kinesiotape strapping", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TNSAID, ["nsaid nsaids ibuprofen brufen diclofenac voveran naproxen anti_inflammatory", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TPARA, ["paracetamol dolo crocin tylenol calpol", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TRELAX, ["relaxant relaxants thiocolchicoside myospaz tizanidine", HELP], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TNONE, ["none nothing", HELP], 7, { selfNeg: true, unless: "heat ice tablet tablets stretch stretching stretches" });
    rule("relTreatments", TNONE, ["kisi koi kuch kabhi", "aaram आराम", "nahi नहीं"], 7, { selfNeg: true });
    // 24-hour pattern
    const P = (i) => O("pattern", i);
    const [PMECH, PCONST, PBREATH, PACT, PNIGHT, PMORN, PINFL] = Array.from({ length: 7 }, (_, i) => P(i));
    rule("pattern", PCONST, ["constant unrelenting continuous lagatar लगातार hamesha हमेशा", "whatever any regardless matter no_matter chahe चाहे har_haal हर_हाल"], 8, { selfNeg: true });
    rule("pattern", PCONST, ["same unchanged whatever regardless nothing no_matter ek_jaisa एक_जैसा", "position positions posture movement move moving hilne हिलने sthiti स्थिति sit sitting lie lying stand standing"], 8, { selfNeg: true, unless: "after when while worse better relieved" });
    rule("pattern", PCONST, ["doesnt_change does_not_change dont_change not_change unchanged no_change nothing_changes never_changes badalta_nahi", "rest movement position posture move moving hilne हिलने"], 8, { selfNeg: true });
    rule("pattern", PMECH, ["movement moving move activity position posture hilne हिलने", "rest resting aaram आराम"], 8, { ctx: "pain", selfNeg: true, unless: "same unchanged nothing" });
    rule("pattern", PBREATH, ["breath breathe breathing inspiration inhal* exhal* saans सांस", PAIN_W], 12, { blockBefore: "shortness short", unless: "cant cannot unable difficulty trouble" });
    rule("pattern", PNIGHT, ["night raat रात", "worse worst wakes woke jaga जगा khul खुल badh बढ़ zyada ज्यादा"], 6, { ctx: "pain", reliefKills: true });
    rule("pattern", PNIGHT, ["night raat रात", PAIN_W], 4, { reliefKills: true, noComma: true, block: "only_when only_if only_while when while if jab जब" });
    rule("pattern", PMORN, ["morning subah सुबह uthte उठते wake* waking", "stiff* akdan akad* अकड़* jakad* jakdan जकड़* jam"], 6, { reliefKills: true, unless: "ease* eases improve* better loosen* hilne हिलने movement move moving kam कम" });
    rule("pattern", PINFL, ["morning subah सुबह wake waking woke uthte उठते", "stiff* akdan akad* अकड़* jakad* jakdan जकड़*", "ease* eases improve* improves better loosen* loosens hilne हिलने hilne_dulne movement move moving exercise kam कम theek ठीक"], 14, { reliefKills: false });
    rule("pattern", PACT, ["activity active exercise kaam काम karne करने", "worse more badh बढ़ after baad बाद brought_on brought_it_on triggers triggered comes_on"], 6, { ctx: "pain", unless: "cough* khansi खांसी sneez* chheenk छींक laugh* hans हंस breath* saans सांस" });
    // limited activities
    const N = (i) => O("fnAdl", i);
    const [NLIM, NBREATH, NCOUGH, NSIT, NDRIVE, NCOMP, NSPORT, NLIFT, NSLEEP, NWORK] = Array.from({ length: 10 }, (_, i) => N(i));
    const CANT = "cant cannot unable not_possible impossible afraid scared fear dar डर difficulty difficult trouble hard mushkil मुश्किल dikkat दिक्कत nahi नहीं stop* stopped quit given_up give_up gave_up giving_up avoid* band बंद struggle struggling struggles"; 
    const CANTP = CANT + " " + PAIN_W + " ache aches aching worse aggravates aggravate bothers uncomfortable problem problems";
    const WORSEW = "shoots shoot worse worst worsens worsened aggravates aggravated aggravating triggers triggered set_off sets_off set_it_off sets_it_off brings_on brings_it_on makes_it_worse make_it_worse catches hurts hurt badh* बढ़*";
    rule("fnAdl", NBREATH, [CANT, "deep gehri गहरी breath breathe breathing saans सांस"], 7, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NCOUGH, [CANT, "cough coughing sneeze sneezing khansi खांसी chheenk छींक khansne खांसने"], 7, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NSIT, [CANT, "sit sitting baith* बैठ* sitting_tolerance"], 7, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NSIT, ["sitting_tolerance sit_tolerance"], 2);
    rule("fnAdl", NDRIVE, [CANT, "drive driving gaadi गाड़ी chalane चलाने chala चला"], 7, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NCOMP, [CANT, "computer laptop typing keyboard कंप्यूटर लैपटॉप"], 7, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NSPORT, [CANT, "gym sport sports football cricket running jogging workout* exercise exercising khel* खेल* jim जिम yoga swimming tennis badminton"], 6, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NLIFT, [CANT, "lift* lifted lifting carry carrying uthana उठाना utha उठा"], 6, { selfNeg: true, unless: "arm arms shoulder shoulders" , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NSLEEP, [CANT, "sleep sleeping so सो neend नींद comfortable wake waking"], 8, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    rule("fnAdl", NWORK, [CANT, "work job duties kaam काम naukri नौकरी office duty"], 6, { selfNeg: true , blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी" });
    // red flags
    const F = (i) => O("redFlags", i);
    const [FNONE, FCONST, FNIGHT, FWORSE, FCARD, FCARDH, FRESP, FABD, FCA, FWT, FFEVER, FTRAUMA, FOSTEO, FLEGN, FLEGW, FAGE, FUNWELL] = Array.from({ length: 17 }, (_, i) => F(i));
    rule("redFlags", FCONST, ["constant continuous unrelenting same", "position movement posture hilne हिलने sthiti स्थिति sit sitting lie lying stand standing"], 8, { selfNeg: true, block: "not_constant isnt_constant aint_constant", unless: "after when while worse better relieved" });
    rule("redFlags", FCONST, ["doesnt_change does_not_change dont_change not_change unchanged no_change nothing_changes never_changes badalta_nahi", "rest movement position posture move moving hilne हिलने"], 8, { selfNeg: true });
    rule("redFlags", FNIGHT, ["night raat रात", "wakes woke jaga जगा jagata जगाता khul खुल neend नींद sleep disturbs disturb* disturbed", "progress* worsening getting_worse gets_worse badh बढ़ increasing steadily every_night roz रोज"], 14);
    rule("redFlags", FWORSE, ["despite inspite in_spite even_after bhi_badh phir_bhi फिर_भी", "treatment physio physiotherapy medication ilaaj इलाज dawai दवाई", "worse worsening badh बढ़ increasing"], 10);
    rule("redFlags", FCARD, ["chest seena सीना chhati छाती", "tight* tightness pressure weight heavy heaviness jakdan जकड़न dabav दबाव bharipan भारीपन crushing", "sweat* pasina पसीना left bayen बायां jaw jabda जबड़े"], 12, { unless: "legs leg pair पैर" });
    rule("redFlags", FCARD, ["chest seena सीना chhati छाती", "tightness tight pressure crushing heaviness jakdan जकड़न dabav दबाव bharipan भारीपन"], 4, { unless: "legs leg pair पैर" });
    rule("redFlags", FCARDH, ["heart cardiac angina stent bypass dil दिल", "history disease attack condition patient hua हुआ tha था bimari बीमारी pehle पहले had before operation surgery"], 8);
    rule("redFlags", FRESP, ["breathless* shortness short_of_breath dyspn* haemoptysis hemoptysis", PAIN_W + " pain"], 20, { ctx: "painOrArm" });
    rule("redFlags", FRESP, ["blood khoon खून", "cough* sputum khansi खांसी khansne खांसने"], 5);
    rule("redFlags", FABD, ["eating eat meals meal food khana खाना khane खाने", "pain dard दर्द vomit* ulti उल्टी worse badh बढ़"], 6, { ctx: "painOrArm", unless: "ice heat tablet tablets goli गोली dawai दवाई dolo paracetamol brufen diclofenac gel medicine medicines" });
    rule("redFlags", FABD, ["food meals meal eating eat khana खाना", "sick nausea nauseous nauseated vomit* off appetite"], 6, { unless: "tablet tablets goli गोली dawai दवाई dolo paracetamol brufen diclofenac gel medicine medicines" });
    rule("redFlags", FCA, ["cancer tumor tumour malignan* carcinoma lymphoma leukemia myeloma kainsar कैंसर metastas* secondaries", "history had diagnosed treated treatment survivor chemo chemotherapy radiotherapy past previous earlier before pehle पहले chuka चुका tha था hua हुआ ilaaj इलाज"], 6);
    rule("redFlags", FWT, ["weight wazan वजन", "loss lost losing ghat घट* kam कम dropping dropped gir गिर*", "unexplained without_trying bina बिना no_reason"], 8, { selfNeg: true });
    rule("redFlags", FWT, ["weight wazan वजन", "lost losing loss ghat घट* kam कम dropped dropping"], 6, { unless: "want wants wanted wish trying plan gym program programme gain gained no nil denies" });
    rule("redFlags", FFEVER, ["fever temperature bukhar बुखार chills night_sweats", "back thoracic spine peeth पीठ reedh रीढ pain dard दर्द"], 12);
    rule("redFlags", FFEVER, ["fever temperature bukhar बुखार", "sweat* sweats night_sweats chills shivering rigors kaampkampi कंपकंपी"], 8);
    rule("redFlags", FTRAUMA, ["fall fell accident injury trauma hit gir* गिर* chot चोट", "recent recently yesterday last_week days_ago haal हाल pichle पिछले kal कल parso परसों"], 12);
    rule("redFlags", FOSTEO, ["osteoporosis ऑस्टियोपोरोसिस osteoporotic weak_bones brittle_bones thin_bones", "known diagnosed told have has hai है"], 8);
    rule("redFlags", FLEGN, ["numb* tingl* sunn* सुन्न* jhunjhuni झनझनाहट pins_and_needles", "leg legs foot feet pair पैर tango टांगों pairon पैरों"], 6);
    rule("redFlags", FLEGW, ["weak* weakness heavy heaviness kamzor कमजोर bhaari भारी jawab जवाब giving_way buckle* buckling jelly gives_way gave_way collapsing", "leg legs pair पैर tango टांगों pairon पैरों"], 6);
    rule("redFlags", FAGE, ["first first_time first_ever pehli पहली never_before", AGE_50_PLUS], 14, { selfNeg: true });
    rule("redFlags", FUNWELL, ["run_down off_colour washed_out wiped_out drained worn_out"], 2);
    rule("redFlags", FUNWELL, ["unwell malaise ill sick bimar बीमार tabiyat तबीयत kharab खराब", "generally all_over whole body sharir शरीर thakan थकान tired fatigue"], 8);

    // ───── added for the way a CLINICIAN types about a patient (thoracicSheetSet.js) ─────
    const WORST = WORSEW + " " + PAINX;
    // radiation
    rule("radiation", RNONE, ["stays stay stayed", "put local there"], 3);
    rule("radiation", RWALL, ["wrap* wraps wrapping round around charo चारों", "chest ribs rib* pasli पसली chhati छाती seena सीना", "from starts start begins begin goes go going spreads spread* se से"], 8, { unless: "arm arms jaw jabda जबड़े haath हाथ" });
    rule("radiation", RWALL, ["dermatomal"], 1, { unless: "arm arms jaw jabda जबड़े haath हाथ" });
    // location
    rule("location", COSTO, ["costovertebral costotransverse"], 1);
    // how it started
    rule("mechanismType", MROT, ["twist twisted twisting turned", "sudden suddenly achanak अचानक quickly sharp"], 6);
    rule("mechanismType", MDESK, ["desk computer laptop", "posture hunched slouched hunching slouching"], 4, { unless: "cant cannot unable" });
    rule("mechanismType", MDESK, ["desk computer laptop कंप्यूटर", "work working posture hunched worker"], 3, { story: PAIN_W + " back peeth पीठ", unless: "cant cannot unable stopped difficulty hard" });
    rule("mechanismType", MINS, ["gradual gradually insidious crept built_up"], 3, { blockAfter: "improvement improving improved improve better recovery recovering relief healing" });
    rule("mechanismType", MINS, ["dheere धीरे"], 2, { blockAfter: "theek ठीक improv* kam कम" });
    rule("mechanismType", MNONE, ["no nobody none unknown", "cause reason wajah vajah वजह"], 5, { selfNeg: true });
    rule("mechanismType", MNONE, ["idiopathic"], 1);
    rule("mechanismType", MNONE, ["no without nahi नहीं", "injury trauma chot चोट"], 4, { selfNeg: true, unless: "gradual gradually slowly dheere धीरे insidious" });
    rule("mechanismType", MVIRAL, ["cold flu viral infection covid", "after post following baad बाद"], 6, { unless: "cant cannot" });
    // aggravating movements (fragments such as "Worse: rotation.")
    rule("aggMovements", AROT, ["twist* twisting rotation rotating turning turn ghum* घूम*", WORSEW], 8, { unless: "bend* flex* jhuk* झुक* lift* uthana उठाना" });
    rule("aggMovements", AFLEX, ["flexion flexing", WORSEW], 4);
    rule("aggMovements", AEXT, ["extension extending", WORSEW], 4);
    rule("aggMovements", ACOUGH, ["cough* khansi खांसी khansne खांसने", "sneez* chheenk छींक laugh* hans हंस deep_breath", WORST], 12, { blockBefore: "with have has had nasty bad" });
    rule("aggMovements", ACOUGH, ["cough* khansi खांसी khansne खांसने", WORSEW], 5, { blockBefore: "with have has had nasty bad" });
    rule("aggMovements", ASNEEZE, ["sneez* chheenk छींक", WORSEW], 5);
    rule("aggMovements", AIN, ["inspiration inspiratory deep_breath deep_breaths big_breath gehri_saans", WORST], 12, { unless: "out exhal* bahar बाहर cant cannot unable difficulty trouble" });
    rule("aggMovements", AIN, ["deep big gehri गहरी full", "breath breathe saans सांस", WORSEW], 9, { unless: "out exhal* bahar बाहर" });
    rule("aggMovements", AREACH, ["overhead above_head over_head shelf shelves top_shelf", "reach reaching reaches hanging hang raise raising", WORST], 10);
    rule("aggMovements", ASUST, ["stand standing sit sitting baith* बैठ* khade खड़े stay position posture feet", "long longer prolonged sustained lamba der देर hours school_day one_position same_position ek_hi एक_ही", WORST], 12);
    // what helps
    rule("relTreatments", TPOST, ["postural posture_correction sit_tall sitting_tall stand_tall standing_tall", HELP], 14, { blockAfter: "nothing none" });
    rule("relTreatments", TTAPE, ["tape taping टेप", HELP], 14, { blockAfter: "nothing none" });
    rule("relTreatments", TPOST, ["posture पोस्चर", "theek ठीक correct* correction sudhar सुधार", HELP], 10, { blockAfter: "nothing none" });
    rule("relTreatments", TNSAID, ["anti_inflammatory anti_inflammatories antiinflammatory antiinflammatories painkiller painkillers", HELP], 10, { blockAfter: "nothing none" });
    rule("relTreatments", TRELAX, ["relaxant relaxants thiocolchicoside myospaz tizanidine", HELP + " tightness"], 8, { blockAfter: "nothing none" });
    rule("relTreatments", TRELAX, ["dheela dheeli ढीला ढीली", "dawai दवा दवाई goli गोली", HELP], 8, { blockAfter: "nothing none" });
    // 24-hour pattern
    rule("pattern", PBREATH, ["breath breathe breathing breathes respiration saans सांस", WORSEW + " brings_it_on"], 8);
    rule("pattern", PMECH, ["mechanical"], 1);
    rule("pattern", PMECH, ["movement movements moving move position positions posture", "depends depend related brings_on change changing settle settles"], 8, { unless: "same unchanged nothing never stiff stiffness morning subah सुबह akdan अकड़न" });
    rule("pattern", PMECH, ["eases ease relieves relieved settles better improves kam कम", "moving move movement walking walks get_up chalne चलने phirne फिरने"], 8, { unless: "same unchanged nothing never stiff stiffness morning subah सुबह akdan अकड़न" });
    rule("pattern", PACT, ["only sirf सिर्फ", "computer laptop desk work working sport sports game games exercise activity kaam काम khel* खेल*"], 6);
    rule("pattern", PACT, ["activity_related activity_dependent"], 2);
    rule("pattern", PACT, ["laptop computer desk work", "holiday holidays weekend weekends days_off chhutti छुट्टी", "fine gone better normal theek ठीक"], 14);
    rule("pattern", PNIGHT, ["wakes wake woke waking khul खुल", "early_hours early_hour doosre दूसरे"], 6);
    rule("pattern", PNIGHT, ["raat रात", "doosre दूसरे hisse हिस्से second half early"], 6);
    rule("pattern", PNIGHT, ["three_or_four three_or_4 3_or_4 three four 3 4", "morning night am", "wake wakes woke waking"], 8);
    rule("pattern", PINFL, ["morning mornings subah सुबह", "stiff stiffness locked akdan अकड़*"], 8, { story: "frees loosens eases improves exercise walk movement hilne हिलने" });
    // limited activities
    rule("fnAdl", NSIT, [CANTP, "sit sitting baith* बैठ* sat"], 12, { selfNeg: true, blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी", unless: "started began start onset desk computer laptop office कंप्यूटर one_position same_position single_position ek_hi एक_ही same unchanged no_matter regardless" });
    rule("fnAdl", NSPORT, [CANTP, "gym sport sports football cricket game games match practice badminton running jogging workout* khel* खेल* jim जिम yoga swimming tennis"], 12, { selfNeg: true, blockAfter: "nahi नहीं", blockBefore: "koi कोई kisi किसी", unless: "started began start onset" });
        rule("fnAdl", NSLEEP, ["sleep sleeping neend नींद", "disturb* disturbance wakes waking woken kharab खराब interrupted broken"], 6);
    rule("fnAdl", NSLEEP, ["keeps_waking keeps_waking_them wakes_them waking_them"], 3);
    rule("fnAdl", NSLEEP, ["wake wakes woke waking khul खुल", "early_hours"], 4);
    // red flags
    rule("redFlags", FNONE, ["no none nil nothing koi कोई", "red_flag red_flags redflag redflags रेड_फ्लैग"], 5, { selfNeg: true });
    rule("redFlags", FNONE, ["rf red_flag red_flags", "negative clear normal nil none"], 4);
    rule("redFlags", FNONE, ["nothing none", "worrying concerning sinister"], 3, { selfNeg: true });
    rule("redFlags", FCONST, ["constant unrelenting continuous", PAIN_W], 3, { story: "night weight fever wakes unwell cancer nights raat रात" });
    rule("redFlags", FCONST, ["nothing", "changes change alters helps", PAIN_W], 8, { selfNeg: true });
    rule("redFlags", FCONST, ["lagatar लगातार constant", "farak फर्क fark", "position sthiti स्थिति"], 10, { selfNeg: true });
    rule("redFlags", FNIGHT, ["night raat रात", "wakes wake woke waking jaga जगा jagata जगाता khul खुल"], 6, { story: "weight wazan वजन fever bukhar unwell cancer constant lagatar loose lost progressive worsening" });
    rule("redFlags", FNIGHT, ["night raat रात nights", "there through all_night whole_night"], 5, { story: "weight wazan वजन fever bukhar unwell cancer constant lagatar loose lost progressive worsening" });
    rule("redFlags", FWT, ["clothes", "loose looser"], 6);
    rule("redFlags", FUNWELL, ["unwell malaise washed_out bahut_kamzori बहुत_कमजोरी"], 2, { story: PAIN_W + " back peeth पीठ" });
    rule("redFlags", FTRAUMA, ["fell fall fallen came_off thrown gir* गिर*", "ladder seedhi सीढ़ी height roof tree horse bike scooter stairs"], 8);
    rule("redFlags", FAGE, ["age aged umar उम्र", "first_episode first_ever first pehli पहली"], 6);
    rule("redFlags", FAGE, [AGE_50_PLUS, "first_episode first_ever first pehli पहली"], 12);
    rule("redFlags", FABD, ["meals meal eating eat food khana खाना", "worse badh बढ़* pain dard"], 6, { story: PAIN_W });
    rule("redFlags", FLEGN, ["numb* tingl* sunn* सुन्न* jhunjhuni झुनझुनी झनझनाहट pins paraesthesia paresthesia", "leg legs foot feet pair पैर tango टांगों pairon पैरों"], 6);
    rule("redFlags", FLEGW, [BOTH_W, "legs pair पैर tango टांगों", "numb* tingl* weak* pins paraesthesia sunn* सुन्न* jhunjhuni झुनझुनी heavy"], 8);
    rule("radiation", RWALL, ["wrap* wraps wrapping", "round around front", "from starts start begins begin goes go going spreads spread* se से"], 8, { unless: "arm arms jaw jabda जबड़े haath हाथ" });
    rule("location", COSTO, ["beside next_to alongside paas पास", "spine reedh रीढ", "rib* ribs pasli पसली"], 8, { ctx: "pain", unless: "lumbar last_rib twelfth_rib" });
    rule("aggMovements", ALIFT, ["lift* lifting lifted weights uthane उठाने uthate उठाते uthana उठाना", WORST], 8, { unless: "started began cant cannot unable overhead above_head over_head after_lifting after_lift following_lifting since_lifting shuru शुरू" });
    rule("aggMovements", ASNEEZE, ["sneez* chheenk छींक", "cough* khansi खांसी laugh* hans हंस deep_breath breath", WORST], 12, { blockBefore: "with have has had nasty bad" });
    rule("aggMovements", ACOUGH, ["cough* khansi खांसी khansne खांसने", "sneez* chheenk छींक"], 4, { story: WORST, blockBefore: "with have has had nasty bad" });
    rule("pattern", PBREATH, ["respiration respirations", PAIN_W], 4);
    rule("pattern", PMECH, ["harkat हरकत", "posture पोस्चर", "jura जुड़ा juda"], 8);
    rule("pattern", PACT, ["laptop computer desk work working", "aches ache pain sore hurts"], 8, { story: "holiday holidays weekend weekends days_off chhutti छुट्टी" });
    rule("redFlags", FNIGHT, ["night nights", PAIN_W], 3, { story: "weight wazan वजन fever bukhar unwell cancer constant lagatar loose lost" });

    // ───── added after the FIRST run of the fresh exam (thoracicSheetSetFresh.js) ─────
    // location
    rule("location", LOWER, ["kamar कमर", "upar ऊपर", "peeth पीठ"], 4);
    rule("location", LOWER, ["low lower bottom", "thoracic"], 3, { unless: "upper mid middle lumbar" });
    rule("location", TLJ, ["last_rib twelfth_rib floating_rib"], 1, { ctx: "pain" });
    rule("location", TLJ, ["lumbar", "meets meet junction joins join transition"], 6, { ctx: "pain" });
    rule("location", COSTO, ["pasli पसली", "paas पास", "peeth पीठ"], 5, { ctx: "pain", unless: "neeche niche नीचे nichli निचली" });
    rule("location", MID, ["beech बीच madhya मध्य", "dard दर्द"], 4, { story: "peeth पीठ", unless: "seena सीना chhati छाती pet पेट sir सिर pasli पसली kandha कंधा gardan गर्दन kamar कमर" });
    rule("location", ANTW, ["sternum sternal breastbone", "next_to beside alongside adjacent near", "rib* ribs"], 8, { ctx: "pain" });
    rule("location", PARA, ["both dono दोनों either bilateral", "side sides taraf तरफ", "muscle* muscles mansapeshi* मांसपेशी* knots knot spasm paraspinals"], 8, { ctx: "painOrArm" });
    // radiation
    rule("radiation", RWALL, ["jolt jolts shoots shooting zap* stabs sends", "around round", "rib* ribs chest"], 8);
    rule("radiation", RANT, [SPREAD + " through", "front anterior", "chest chhati छाती seena सीना"], 13, { unless: "left bayen बायां arm haath हाथ jaw jabda जबड़े" });
    // how it started
    rule("mechanismType", MROT, ["twist twisted twisting rotated rotating turned turning", "pop popped felt_pop snap snapped tore tear"], 8);
    // aggravating movements
    rule("aggMovements", AREACH, ["tingl* tingly numb* numbness sunn* सुन्न* jhunjhuni झुनझुनी heaviness", "overhead above_head over_head"], 11);
    rule("aggMovements", AREACH, ["haath हाथ arm arms", "upar ऊपर overhead", "karne करने uthane उठाने rakhne रखने"], 4, { ctx: "painOrArm" });
    // 24-hour pattern
    rule("pattern", PACT, ["worse worst more badh* बढ़* zyada ज्यादा", "end"], 6, { ctx: "pain", unless: "range" });
    rule("pattern", PNIGHT, ["second_half later_half small_hours early_hours", "night nights"], 4);
    rule("pattern", PINFL, ["stiff* akdan akad* अकड़* locked", "get_up got_up walk walking walk_about chalna चलना chalne चलने uthkar उठकर move moving"], 8, { story: "night nights raat रात morning subah सुबह" });
    rule("pattern", PINFL, ["rest resting aaram आराम", "no_relief not_relieved no_better doesnt_help does_not_help not_improve worse_with_rest worse_after_rest"], 6, { selfNeg: true, story: "better improves eases loosens exercise moving movement walking activity" });
    rule("pattern", PINFL, ["worse worst more badh* बढ़*", "rest resting inactivity"], 4, { story: "better improves eases loosens exercise moving movement walking activity" });
    // limited activities
    rule("fnAdl", NBREATH, ["shallow", "breath breaths breathe breathing saans सांस"], 3);
    rule("fnAdl", NSLEEP, ["lying lie lies", WORSEW, "side"], 8, { story: "night bed raat रात sleep" });
    rule("fnAdl", NSLEEP, ["sote सोते sone सोने", "samay समय waqt वक्त", "dard दर्द pain"], 8);
    rule("fnAdl", NSLEEP, ["karwat करवट", "lene लेने badalne बदलने", "dard दर्द pain"], 8);
    rule("fnAdl", NDRIVE, ["gaadi गाड़ी", "chalane chalate chalata chalaate चलाने चलाते", "dard दर्द pain"], 6);
    // red flags
    rule("redFlags", FWT, ["loss lost losing dropped", "kg kgs kilo kilos"], 4, { unless: "want wants wanted wish trying plan gym program programme gain gained no nil denies" });
    rule("redFlags", FNIGHT, ["rest", "night nights raat रात"], 5, { story: "kg kgs weight wazan वजन fever bukhar unwell cancer constant lagatar loose lost progressive worsening nothing" });
    rule("redFlags", FCONST, ["rest", "nothing none", "eases ease relieves relieve settles helps"], 8, { selfNeg: true, unless: "except apart only besides" });
    rule("redFlags", FWORSE, ["badh* बढ़*", "dawai dawa दवा दवाई ilaaj इलाज physio", "bhi भी nahi नहीं"], 12, { selfNeg: true });
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
