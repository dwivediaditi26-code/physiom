// kneePhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a KNEE complaint in everyday words (English, Hinglish, Hindi in
// Devanagari) and suggests which of the Subjective checklist options it means. No AI, no network, no cost.
// It only SUGGESTS; the student taps to confirm. The matching engine is in phraseEngine.js.
//
// Covers the 6 Knee questions that change the AI Objective Assessment ranking (location, mechanism, giving way,
// locking, 24-hour pattern, red flags). The option strings must match the form exactly (a test checks this).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { PATTERN_PHRASES, patternRules, extendPhrases } from "./phrasePattern.js";

const KNEE_BASE = {
  location: {
    "Anterior / diffuse": [
      "~anterior knee", "front of the knee", "front of knee", "anterior knee pain", "pain in the front of my knee",
      "pain at the front of the knee", "knee pain at the front", "pain on the front of the knee",
      "ghutne ke aage dard", "ghutne ke samne dard", "ghutne ke aage ki taraf", "ghutne ke samne wale hisse me dard",
      "घुटने के आगे दर्द", "घुटने के सामने दर्द", "घुटने के आगे की तरफ", "घुटने के सामने वाले हिस्से में दर्द",
    ],
    "Around the kneecap": [
      "~kneecap", "~patella", "around the kneecap", "around my kneecap", "around the knee cap", "behind the kneecap", "behind the knee cap",
      "pain in the kneecap", "kneecap pain", "pain at the kneecap", "patellofemoral pain", "patellofemoral", "pain around the patella",
      "ghutne ki katori me dard", "katori ke aaspaas dard", "katori ke piche dard", "ghutne ki chakri me dard",
      "घुटने की कटोरी में दर्द", "कटोरी के आसपास दर्द", "कटोरी के पीछे दर्द", "घुटने की चक्की में दर्द",
    ],
    "Below the kneecap (patellar tendon)": [
      "below the kneecap", "below my kneecap", "under the kneecap", "just below the knee cap", "beneath the kneecap",
      "patellar tendon", "patella tendon", "bottom of the kneecap", "bottom of the knee cap", "lower pole of the patella", "jumpers knee", "jumper's knee", "pain below the kneecap", "tendon below the kneecap",
      "katori ke niche dard", "katori ke neeche dard", "ghutne ki katori ke niche", "ghutne ki chakri ke niche dard",
      "कटोरी के नीचे दर्द", "घुटने की कटोरी के नीचे", "कटोरी के नीचे की नस में दर्द", "घुटने की चक्की के नीचे दर्द",
    ],
    "Above the kneecap (quad tendon)": [
      "above the kneecap", "above my kneecap", "above the knee cap", "just above the knee cap", "quad tendon", "quadriceps tendon",
      "pain above the kneecap", "tendon above the kneecap", "top of the kneecap",
      "katori ke upar dard", "ghutne ki katori ke upar", "ghutne ki chakri ke upar dard", "katori ke upar ki taraf",
      "कटोरी के ऊपर दर्द", "घुटने की कटोरी के ऊपर", "कटोरी के ऊपर की तरफ", "घुटने की चक्की के ऊपर दर्द",
    ],
    "Medial joint line": [
      "medial joint line", "medial knee", "inside of the knee joint line",
      "inner joint line", "pain on the inner side of my knee", "inside edge of the knee",
      "ghutne ke andar ki taraf", "ghutne ke andruni hisse me dard", "ghutne ka andar wala hissa", "ghutne ke andar ki taraf dard",
      "घुटने के अंदर की तरफ", "घुटने के अंदरूनी हिस्से में दर्द", "घुटने का अंदर वाला हिस्सा", "घुटने के अंदर की तरफ दर्द",
    ],
    "Lateral joint line": [
      "lateral joint line", "lateral knee",
      "outer joint line", "pain on the outer side of my knee", "outside edge of the knee",
      "ghutne ke bahar ki taraf", "ghutne ke bahari hisse me dard", "ghutne ka bahar wala hissa", "ghutne ke bahar ki taraf dard",
      "घुटने के बाहर की तरफ", "घुटने के बाहरी हिस्से में दर्द", "घुटने का बाहर वाला हिस्सा", "घुटने के बाहर की तरफ दर्द",
    ],
    "Behind the knee (popliteal)": [
      "behind the knee", "back of the knee", "back of my knee", "popliteal", "popliteal fossa", "posterior knee", "posterior knee pain", "knee pit", "hollow of the knee",
      "pain behind the knee", "pain at the back of the knee",
      "ghutne ke peeche dard", "ghutne ke piche", "ghutne ke pichhe ki taraf", "ghutne ke peeche ki jagah me dard",
      "घुटने के पीछे दर्द", "घुटने के पीछे की तरफ", "घुटने के पिछले हिस्से में दर्द", "घुटने के पीछे की जगह में दर्द",
    ],
    "Below the joint line (tibial tuberosity)": [
      "tibial tuberosity", "osgood schlatter", "osgood schlatters", "bump below the knee", "bony bump below the kneecap",
      "tender bump below the knee", "bump just under the knee", "bump under the knee", "bony bump under the knee", "knobbly bit below the knee", "bump on the shin below the knee",
      "ghutne ke niche haddi ka ubhaar", "ghutne ke niche ubhaar me dard", "ghutne ke niche ki haddi", "ghutne ke niche ki ubhri haddi",
      "घुटने के नीचे हड्डी का उभार", "घुटने के नीचे उभार में दर्द", "घुटने के नीचे की हड्डी", "घुटने के नीचे की उभरी हड्डी",
    ],
    "Diffuse": [
      "~diffuse", "diffuse pain", "pain all over the knee", "all around the knee", "whole knee hurts", "the whole knee", "entire knee",
      "cant point to one spot", "cannot point to one spot", "pain all around the knee", "pain everywhere in the knee",
      "poore ghutne me dard", "poore ghutne me dard hai", "ghutne me har jagah dard", "ek jagah nahi bata sakta dard kahan hai", "saare ghutne me dard",
      "पूरे घुटने में दर्द", "घुटने में हर जगह दर्द", "एक जगह नहीं बता सकता दर्द कहां है", "सारे घुटने में दर्द",
    ],
  },

  mechanism: {
    "Insidious / overuse": [
      "overuse", "over use", "no injury", "no specific injury", "no particular injury", "no trauma", "started on its own",
      "started by itself", "came on slowly", "gradually started", "slowly started", "gradual onset", "no known cause",
      "dont know how it started", "too much running", "too much walking", "increased my running", "increased my running distance", "increased my training", "ramped up my training", "started running a lot", "overtraining", "increased my mileage", "pain came out of nowhere",
      "pain appeared out of nowhere", "started out of nowhere", "started for no reason", "no apparent cause", "no obvious cause", "slowly building", "no accident", "no fall", "creeping onset", "insidious onset",
      "bina chot ke", "apne aap shuru hua", "dheere dheere shuru hua", "kaaran pata nahi", "zyada chalne se", "zyada daudne se", "koi chot nahi lagi",
      "chot nahi lagi thi", "apne aap dard hua", "bina kisi wajah ke",
      "बिना चोट के", "अपने आप शुरू हुआ", "धीरे धीरे शुरू हुआ", "कारण पता नहीं", "ज्यादा चलने से", "ज्यादा दौड़ने से", "कोई चोट नहीं लगी",
      "चोट नहीं लगी थी", "अपने आप दर्द हुआ", "बिना किसी वजह के",
    ],
    "Non-contact twisting": [
      "non contact twisting", "non contact injury", "twisted my knee", "my knee twisted", "twisting injury", "twisted the knee",
      "foot stuck and the body turned", "foot got stuck and i twisted", "turned and felt a pop", "twisted while walking", "twisted awkwardly",
      "knee twisted while playing", "twist injury",
      "ghutna mud gaya", "ghutne me moch", "paer fasa aur body ghum gayi", "ghutna ghum gaya", "ghutna ulta seedha mud gaya", "ghutne me moch aa gayi",
      "घुटना मुड़ गया", "घुटने में मोच", "पैर फंसा और शरीर घूम गया", "घुटना घूम गया", "घुटने में मोच आ गई",
    ],
    "Direct blow": [
      "direct blow", "hit on the knee", "hit my knee", "banged my knee", "knocked my knee", "bumped my knee", "kicked on the knee",
      "knee hit the dashboard", "dashboard injury", "fell on my knee", "fell onto my knee", "landed on my knee", "road accident", "accident",
      "collision", "got hit", "blow to the knee",
      "ghutne par chot", "ghutne me chot", "ghutna takra", "ghutne par laat lagi", "ghutne par maar", "accident me chot", "ghutne ke bal gir",
      "घुटने पर चोट", "घुटने में चोट", "घुटना टकरा", "घुटने पर लात लगी", "घुटने पर मार", "एक्सीडेंट में चोट", "घुटने के बल गिर",
    ],
    "Hyperextension": [
      "hyperextension", "hyperextended", "hyper extended my knee", "knee bent backwards", "knee went backwards", "knee bent the wrong way",
      "knee snapped back", "overstretched the knee", "over extended", "overextended", "knee over extended", "knee overextended", "bent backwards",
      "ghutna peeche ki taraf mud gaya", "ghutna ulta mud gaya", "ghutna ulti taraf mud gaya", "ghutna peeche mud gaya", "ghutna zyada khinch gaya",
      "घुटना पीछे की तरफ मुड़ गया", "घुटना उल्टा मुड़ गया", "घुटना उल्टी तरफ मुड़ गया", "घुटना पीछे मुड़ गया", "घुटना ज्यादा खिंच गया",
    ],
    "Landing from a jump": [
      "landing from a jump", "landed from a jump", "landed badly from a jump", "jumped and landed", "bad landing", "landed awkwardly",
      "basketball landing", "volleyball landing", "came down awkwardly", "came down badly", "came down wrong", "came down on one leg", "after a lay up", "after a rebound", "landing on one leg", "landed on one leg after jumping", "landed badly",
      "jump karke utarte waqt", "kood kar landing", "kood ke utarte hue", "jump ke baad landing", "kood kar ek pair par utara",
      "कूदकर उतरते समय", "कूद कर लैंडिंग", "कूदकर उतरते हुए", "जंप के बाद लैंडिंग", "कूद कर एक पैर पर उतरा",
    ],
    "Pivoting / cutting movement": [
      "pivoting movement", "cutting movement", "pivoted on my foot", "sudden change of direction", "changed direction suddenly", "changing direction",
      "sidestep", "side stepping", "foot planted and turned", "planted my foot and turned", "turning quickly while running",
      "football turn", "twisting on a planted foot", "cutting hard", "was cutting", "cutting to the left", "cutting to the right", "cutting sharply", "stop and turn", "sudden stop and turn", "stopped suddenly and turned", "sharp turn while running", "quick turn",
      "direction badalte waqt", "achanak mudte waqt", "paer jama kar ghoomte waqt", "football me mudte waqt",
      "दिशा बदलते समय", "अचानक मुड़ते समय", "पैर जमाकर घूमते समय", "फुटबॉल में मुड़ते समय",
    ],
    "Post-surgical": [
      "post surgery", "post surgical", "post operative", "after surgery", "since the operation", "after my operation", "after knee surgery",
      "knee replacement", "acl reconstruction", "after arthroscopy", "total knee replacement", "after the operation on my knee", "tkr",
      "operation ke baad", "surgery ke baad", "ghutne ka operation", "operation ke baad se dard", "ghutna badalwane ke baad", "knee replacement ke baad",
      "ऑपरेशन के बाद", "सर्जरी के बाद", "घुटने का ऑपरेशन", "ऑपरेशन के बाद से दर्द", "घुटना बदलवाने के बाद",
    ],
  },

  givingWay: {
    "No": [
      "~no", "no giving way", "no giving way at all", "do not have any giving way", "never had giving way", "no episodes of giving way", "knee does not give way", "knee doesnt give way", "doesnt buckle", "never gives way", "never had it give way", "has never given way", "never given way", "never had the knee give way", "never felt it give way", "never buckled",
      "never buckles", "not unstable", "knee feels stable", "knee is stable", "no buckling", "no instability",
      "ghutna jawab nahi deta", "ghutna kabhi jawab nahi deta", "ghutna kabhi nahi mudta", "ghutna stable hai", "ghutna dhokha nahi deta", "ghutna nahi fasakta",
      "घुटना जवाब नहीं देता", "घुटना कभी जवाब नहीं देता", "घुटना कभी नहीं मुड़ता", "घुटना स्थिर है", "घुटना धोखा नहीं देता",
    ],
    "Yes — with pivoting / twisting": [
      "gives way when i twist", "gives way on twisting", "buckles when i turn", "buckles when i pivot", "knee gives way when i pivot",
      "gives way with pivoting", "gives way when i change direction", "gives way with twisting movements", "collapses when i turn",
      "gives way when turning", "knee gives way while turning",
      "ghutna mudte waqt jawab de deta hai", "ghutna ghumate waqt jawab de deta hai", "ghutna mudne par fasak jata hai", "ghutna ghumne par dhokha deta hai",
      "ghutna direction badalte waqt jawab de deta hai",
      "घुटना मुड़ते समय जवाब दे देता है", "घुटना घुमाते समय जवाब दे देता है", "घुटना मुड़ने पर फिसल जाता है", "घुटना घूमने पर धोखा देता है",
      "घुटना दिशा बदलते समय जवाब दे देता है",
    ],
    "Yes — on stairs": [
      "gives way on stairs", "gives way on the stairs", "buckles going downstairs", "buckles on stairs", "gives way when climbing stairs",
      "knee gives way going down stairs", "gives way going up the stairs", "knee gives way on steps", "collapses on stairs",
      "seedhiyon par ghutna jawab de deta hai", "seedhiyan utarte waqt ghutna jawab de deta hai", "seedhiyan chadhte waqt ghutna fasak jata hai",
      "seedhiyon par ghutna dhokha deta hai", "seedhiyon par ghutna mud jata hai",
      "सीढ़ियों पर घुटना जवाब दे देता है", "सीढ़ियां उतरते समय घुटना जवाब दे देता है", "सीढ़ियां चढ़ते समय घुटना फिसल जाता है",
      "सीढ़ियों पर घुटना धोखा देता है", "सीढ़ियों पर घुटना मुड़ जाता है",
    ],
    "Yes — unpredictable / no clear trigger": [
      "gives way for no reason", "unpredictable giving way", "gives way randomly", "buckles without warning", "suddenly gives way while walking",
      "gives way without any warning", "gives way for no apparent reason", "knee gives way suddenly out of the blue", "random giving way",
      "ghutna achanak jawab de deta hai", "bina wajah ghutna jawab de deta hai", "chalte chalte ghutna jawab de deta hai", "ghutna kabhi bhi jawab de deta hai",
      "ghutna achanak fasak jata hai",
      "घुटना अचानक जवाब दे देता है", "बिना वजह घुटना जवाब दे देता है", "चलते चलते घुटना जवाब दे देता है", "घुटना कभी भी जवाब दे देता है",
      "घुटना अचानक फिसल जाता है",
    ],
  },

  locking: {
    "No": [
      "~no", "no locking", "no locking or catching", "do not have any locking", "dont have any locking", "never had locking", "no episodes of locking", "no history of locking", "doesnt lock", "does not lock", "never locks", "knee never locks", "no catching or locking",
      "ghutna lock nahi hota", "ghutna kabhi lock nahi hota", "ghutna jam nahi hota", "ghutna atakta nahi", "koi lock nahi",
      "घुटना लॉक नहीं होता", "घुटना कभी लॉक नहीं होता", "घुटना जाम नहीं होता", "घुटना अटकता नहीं", "कोई लॉक नहीं",
    ],
    "Yes — true mechanical locking": [
      "true locking", "mechanical locking", "knee locks and i cannot straighten it", "knee locks and cant straighten", "knee gets stuck bent",
      "locked knee", "knee locks completely", "stuck in a bent position", "knee locks in a bent position", "locks and wont straighten", "it has locked", "has locked twice", "knee locked up", "locked up completely", "had to unlock it", "wiggle it to unlock", "locked twice",
      "knee gets locked and wont straighten",
      "ghutna lock ho jata hai seedha nahi hota", "ghutna lock ho gaya", "ghutna lock ho jata hai", "lock ho gaya tha", "knee locked", "knee locks", "ghutna jam ho jata hai aur seedha nahi hota", "ghutna mudi hui haalat me atak jata hai",
      "ghutna lock ho gaya hai seedha nahi ho raha", "ghutna mudi haalat me jam ho jata hai",
      "घुटना लॉक हो जाता है सीधा नहीं होता", "घुटना लॉक हो गया", "घुटना लॉक हो जाता है", "घुटना जाम हो जाता है और सीधा नहीं होता", "घुटना मुड़ी हुई हालत में अटक जाता है",
      "घुटना लॉक हो गया है सीधा नहीं हो रहा", "घुटना मुड़ी हालत में जाम हो जाता है",
    ],
    "Yes — momentary / pseudo-locking": [
      "momentary locking", "pseudo locking", "knee catches momentarily", "feels like it catches", "knee catches then frees up",
      "brief catching", "catches for a second", "catches and then releases", "clicks and catches", "catching feeling", "a catching feeling", "catching sensation", "knee catches", "briefly sticks then frees",
      "knee catches and then clicks free", "locks for a second",
      "ghutna thodi der ke liye atak jata hai", "ghutna atak jata hai", "ghutna kabhi kabhi atak jata hai", "atak kar phir chal padta hai", "kuch second ke liye lock ho jata hai", "atak kar khul jata hai", "ghutna atak kar phir khul jata hai",
      "ek pal ke liye atakta hai",
      "घुटना थोड़ी देर के लिए अटक जाता है", "कुछ सेकंड के लिए लॉक हो जाता है", "अटक कर खुल जाता है", "घुटना अटक कर फिर खुल जाता है",
      "एक पल के लिए अटकता है",
    ],
  },

  pattern: extendPhrases(PATTERN_PHRASES, {
    "Worse at night": [
      "knee pain at night", "pain in the knee wakes me at night", "pain when i lie down at night", "cannot sleep because of knee pain",
      "raat ko ghutne me dard", "raat ko ghutna dukhta hai", "रात को घुटने में दर्द", "रात को घुटना दुखता है",
    ],
    "Improves through the day": [
      "eases as they warm up", "as they warm up", "eases as it warms up", "eases as it warms", "improves as they warm up", "settles as they warm up",
    ],
    "Worse in morning": [
      "knee stiff when i get up", "knee stiff in the morning", "stiff knee first thing", "stiffness after waking",
      "subah ghutna akad jata hai", "subah uthte hi ghutna jakad jata hai", "सुबह घुटना अकड़ जाता है", "सुबह उठते ही घुटना जकड़ जाता है",
    ],
  }),

  redFlags: {
    "Unable to bear weight for 4 steps": [
      "unable to bear weight", "cannot bear weight", "cant bear weight", "cannot put weight on it", "unable to put weight on the leg",
      "cant take four steps", "cant take 4 steps", "unable to walk four steps", "cannot take even a few steps", "cannot walk at all",
      "unable to walk at all", "cant stand on that leg", "cant walk since the injury", "cant weight bear", "couldnt walk", "could not walk", "unable to walk after the injury", "cant weight bear on it",
      "pair par bhaar nahi daal pa raha", "ek bhi kadam nahi chal paya", "chal nahi pa raha bilkul", "chaar kadam bhi nahi chal pa raha", "pair par khada nahi ho pa raha",
      "पैर पर भार नहीं डाल पा रहा", "एक भी कदम नहीं चल पाया", "बिल्कुल चल नहीं पा रहा", "चार कदम भी नहीं चल पा रहा", "पैर पर खड़ा नहीं हो पा रहा",
    ],
    "Immediate marked swelling after injury (possible haemarthrosis)": [
      "swelled up immediately", "swelling within minutes of the injury", "ballooned straight away", "swelled up like a balloon",
      "immediate swelling", "swelling right after the injury", "swelling within an hour", "puffed up within the hour", "knee puffed up", "puffed up straight away", "knee blew up straight after", "knee swelled up straight away",
      "marked swelling straight after the injury", "haemarthrosis",
      "turant sujan", "chot ke turant baad ghutna phool gaya", "fauran sujan", "chot lagte hi sujan", "kuch minute me hi ghutna phool gaya",
      "तुरंत सूजन", "चोट के तुरंत बाद घुटना फूल गया", "फौरन सूजन", "चोट लगते ही सूजन", "कुछ मिनट में ही घुटना फूल गया",
    ],
    "Locked knee that won't straighten": [
      "locked knee that wont straighten", "knee locked and wont straighten", "cannot straighten the knee", "cant straighten my knee",
      "stuck bent and will not straighten", "cant extend my knee fully since the injury", "knee wont straighten",
      "knee wont go straight", "unable to straighten the knee",
      "ghutna seedha nahi ho raha", "ghutna lock ho gaya seedha nahi hota", "ghutna seedha nahi hota", "ghutna mud kar atak gaya seedha nahi ho raha", "ghutna seedha karna mushkil",
      "घुटना सीधा नहीं हो रहा", "घुटना लॉक हो गया सीधा नहीं होता", "घुटना सीधा नहीं होता", "घुटना मुड़कर अटक गया सीधा नहीं हो रहा", "घुटना सीधा करना मुश्किल",
    ],
    "Hot red severely tender joint": [
      "hot red and very tender knee", "knee is hot red swollen and very painful", "hot swollen red joint", "joint is hot and tender",
      "hot red joint", "red hot swollen knee", "very tender hot knee", "hot and red and cannot touch it", "severely tender and warm",
      "garam laal aur bahut dard", "ghutna garam aur laal", "ghutna garam laal aur sujan", "chhune par bahut dard aur garam", "ghutna laal aur garam hai",
      "गरम लाल और बहुत दर्द", "घुटना गरम और लाल", "घुटना गरम लाल और सूजन", "छूने पर बहुत दर्द और गरम", "घुटना लाल और गरम है",
    ],
    "Cancer history": [
      "~cancer", "~cancer history", "history of cancer", "had cancer", "cancer in the past", "cancer survivor", "bone cancer history",
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

// Added from the clinician-voice "everyday words" sheet (PhysioMind-Knee-Everyday-Words-DRAFT.pdf): what a clinician types ABOUT the
// patient ("the patient", "they"), in English, Hinglish and Hindi. See kneeSheetSet.test.js.
const SHEET_PHRASES = {
  mechanism: {
    "Insidious / overuse": [
      "too much too soon", "overload", "overloaded", "sudden increase in training", "sudden increase in running", "sudden jump in activity",
      "training suddenly increased", "increase in training", "lots of jumping", "a lot of jumping", "jump a lot", "jumping again and again",
      "repeated jumping", "training spike", "more training than usual", "running more than usual", "doing more than usual", "did more than usual",
      "built up slowly", "built up gradually", "crept up", "crept up gradually", "crept up over the years", "slowly over the years", "slowly over months or years", "slowly over months",
      "wear and tear", "no fall or injury", "years of squatting", "years of squatting or kneeling", "years of squatting and sitting on the floor",
      "used their knees a lot", "used the knees a lot", "high mileage", "more distance than before", "longer distances than before", "lots of running",
      "running or cycling a lot", "running more than usual lately", "new gym plan", "after a heavy week of jumping", "heavy week of jumping or training",
      "increased weekly mileage", "increased mileage", "mileage increase", "sudden mileage increase", "increase in mileage", "increase in weekly mileage", "gradual with no injury", "gradual no injury", "gradual onset with no injury",
      "saalon se dheere dheere", "mahino se dheere dheere", "dheere dheere dard badh raha hai", "koi chot nahi", "dheere dheere koi chot nahi", "achanak zyada daudna", "zyada daudna", "baar baar kudna", "training achanak badha dena",
      "training achanak badhana", "mahino ya saalon mein dheere dheere", "saalon mein dheere dheere", "mahino mein dheere dheere", "ghisaav", "ghisav",
      "pehle se zyada doori", "zyada kaam ya exercise ke baad shuru hua", "exercise ke baad shuru hua",
      "कोई चोट नहीं", "धीरे धीरे कोई चोट नहीं", "अचानक ज्यादा दौड़ना", "ज्यादा दौड़ना", "बार बार कूदना", "ट्रेनिंग अचानक बढ़ा देना",
      "महीनों या सालों में धीरे धीरे", "सालों में धीरे धीरे", "सालों से धीरे धीरे", "महीनों से धीरे धीरे", "धीरे धीरे दर्द बढ़ रहा है", "घिसाव", "पहले से ज्यादा दूरी", "ज्यादा काम या कसरत के बाद शुरू हुआ", "कसरत के बाद शुरू हुआ",
    ],
    "Non-contact twisting": [
      "twisted it", "they twisted it", "twisted on a fixed foot", "twisted on a planted foot", "twist with foot fixed", "twisted over a planted foot",
      "body twisted over a planted foot", "turned on a foot that was not moving", "foot was stuck and they turned", "foot stuck and they turned",
      "foot stuck and turned", "turned on a fixed foot", "after a twist", "after twisting", "twist in football", "twist in football or skiing", "twist in skiing", "twist playing football", "twisted while squatting low", "twisted playing football", "sudden twist",
      "achanak mudne par", "football khelte mudte waqt", "khelte mudte waqt",
      "अचानक मुड़ने पर", "फुटबॉल खेलते मुड़ते समय", "खेलते मुड़ते समय",
    ],
    "Direct blow": [
      "dashboard", "डैशबोर्ड", "moment of the hit", "moment of the blow", "at the time of the hit", "when they were hit", "when it was hit", "was tackled", "got tackled", "in a tackle", "tackled from the side",
      "tackled", "was hit", "got hit by",
      "chot lagte hi", "ghutne par maara gaya", "ghutne ke andar maara gaya", "ghutne ke bahar maara", "taang ke bahar maara",
      "घुटने के अंदर मारा गया", "घुटने या टांग के बाहर मारा", "टांग के बाहर मारा",
    ],
    "Landing from a jump": [
      "collapsed on landing", "knee collapsed inwards on landing", "collapsed inwards on landing", "jumped for a ball", "came down after a jump", "came down awkwardly after a jump",
      "kood kar galat landing", "kood kar galat landing hui", "galat landing hui", "galat landing", "kood kar galat tarah se utara",
      "कूदकर गलत तरह से उतरा", "कूदकर गलत लैंडिंग", "गलत लैंडिंग हुई", "गलत तरह से उतरा",
    ],
  },
  givingWay: {
    // Only wording that itself says "any time / no trigger". A plain "keeps giving way" does not say there is no trigger, so it is left to the student.
    "Yes — unpredictable / no clear trigger": [
      "ghutna kabhi bhi dhokha deta hai", "घुटना कभी भी धोखा देता है",
    ],
  },
  locking: {
    "Yes — momentary / pseudo-locking": [
      "catches or gets stuck", "gets stuck and has to be wiggled free", "wiggled free", "has to be wiggled free", "sticks halfway", "stuck halfway",
      "sticks halfway like something is stuck inside", "shake it to get it moving", "have to shake it to get it moving", "felt it catch", "feels it catch",
      "catching or locking", "catching and locking", "clicking and catching", "catching and clicking", "clicks and catching", "keeps catching on and off", "sticking comes back",
    ],
  },
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const KNEE_PHRASES = mergePhrases(KNEE_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W } = WORDS;
// Words that say a sentence is about this region / about another one.
const OWN_W = "knee* kneecap patella leg legs thigh shin ghutn* ghutna katori कटोरी chakri चक्की टोपी घुटन* घुटना टांग taang पैर";
const FOREIGN_W = "shoulder* elbow* wrist* hand hands neck back_pain back_aches back_ache back_hurts back_hurt back_stiff back_stiffness pain_in_back backache lower_back upper_back low_back hip* ankle* groin headache jaw toe* tooth teeth eye* ear throat stomach chest kandha kohni kalai gardan kamar कंधा कोहनी कलाई गर्दन कमर पेट सिर टखना एड़ी";
// A relative's illness is not the patient's cancer history.
const FAMILY_W = WORDS.FAMILY;
const GIVE_W = "give* gave giving goes_from_under went_from_under goes_out went_out buckle* buckles buckled collapse* collapsed jawab जवाब fasak* फिसल* dhokha धोखा latak* dagmag* डगमग* let_them_down lets_them_down letting_them_down let_down lets_down fold folds folded folding";
// Present-tense giving way ("gives way when I turn") describes the giving way; past tense ("twisted ... and the knee gave way") is the injury story.
const GIVE_PRES = "give gives giving buckle buckles buckling collapse collapses collapsing goes_out goes_from_under jawab जवाब fasak* फिसल* dhokha धोखा latak* dagmag* डगमग* let_them_down lets_them_down letting_them_down fold folds folding";
// What a blow comes from or lands on ("hit on the outside of the knee" is the blow, not the place the pain is).
const HIT_W = "hit hits hitting knock knocks knocked blow blows kick kicks kicked kicking struck strike tackle tackled tackling tackles bump bumped bumping smash smashed bang banged slam slammed from force valgus varus";
// inside the span between "outside" and "knee": also Hinglish / Hindi words for a blow
const HIT_IN = HIT_W + " se से maara mara marna maar laat मारा मार लात";
const HIT_AFTER = "maara mara marna maar laat laga lagi मारा मार लात";

const matcher = createPhraseMatcher({
  phrases: KNEE_PHRASES,
  singleChoiceFields: ["pattern", "givingWay", "locking"],
  noneOptions: { redFlags: "None of the above", givingWay: "No", locking: "No" },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  optionGuards: {
    "redFlags|Cancer history": FAMILY_W,
    // "gives way when I turn" describes the giving way, not how the injury happened
    "mechanism|Pivoting / cutting movement": GIVE_PRES,
    "mechanism|Non-contact twisting": GIVE_PRES,
    // "the knee still lets them down now and then" is giving way, not how the pain behaves
    "pattern|Intermittent": GIVE_W,
  },
  hinglish: [
    [/\b(ghutna|ghutne|ghutno|ghutnon|ghutana|ghutane|ghuta|gutna|gutne)\b/g, "ghutna"],
    [/\b(katori|katoree|kataori|katory|katorii)\b/g, "katori"],
    [/\b(chakri|chakki|chakkri)\b/g, "chakri"],
    [/\b(seedhiyan|seedhiyon|sidhiyan|sidhiyon|seedhiya|sidhiya|seedhiye)\b/g, "seedhiyan"],
    [/\b(seedha|seedhi|sidha|sidhi|seedhe|sidhe)\b/g, "seedha"],
    [/\b(jawab|jawaab|javab|jawap)\b/g, "jawab"],
    [/\b(mud|mudd)\b/g, "mod"],
    [/\b(fasakna|fasakne|fasak|fasakta|fasakti|fisalna|fisalne|fisal|fisalta|fisalti)\b/g, "fisal"],
    [/\b(fasa|fasta|fasti|fasna|fasne|fas)\b/g, "fasna"],
    [/\b(atak|atakna|atakne|atakta|atakti|atka|atki|atke|atakkar)\b/g, "atak"],
    [/\b(kadam|qadam|kadmon|kadme)\b/g, "kadam"],
    [/\b(chalne|chalna|chalte|chalta|chalti)\b/g, "chalna"],
    [/\b(phool|phoola|phooli|phoolna|phulna|phul|phoolne)\b/g, "phool"],
    [/\b(turant|turat|fauran|foran|ekdum|tatkal)\b/g, "turant"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche)\b/g, "niche"],
    [/\b(peeche|piche|pichhe|peechhe|pichche|pichle|pichla)\b/g, "peeche"],
    [/\b(gaanth|ganth|gaath|gant)\b/g, "gaanth"],
    [/\b(raat|raath|rat)\b/g, "raat"],
    [/\b(achanak|acchanak|achanak se)\b/g, "achanak"],
    [/\b(paer|pair|pao|pav)\b/g, "pair"],
    [/\b(aas paas|aaspaas|aaspas|aas pas)\b/g, "aaspaas"],
    // "ghutna peeche ya bahar ki taraf mud gaya" = the knee bent the wrong way, not a pain place
    [/\bghutna peeche(?: ya (?:bahar|andar))?(?: ki taraf)? mod\b/g, "ghutna ulta mod"],
  ],
  deva: [
    [/घुटन(ा|े|ों|ो)?/g, "घुटना"],
    [/कटोर(ी|ि)/g, "कटोरी"],
    [/चक्क(ी|ि)/g, "चक्की"],
    [/सीढ(ी|ि)(यों|यां|या)?/g, "सीढी"],
    [/सीध(ा|ी|े)/g, "सीधा"],
    [/जवाब/g, "जवाब"],
    [/मिनट(ों|ो)?/g, "मिनट"],
    [/घुटना पीछे(?: या (?:बाहर|अंदर))?(?: की तरफ)? मुड/g, "घुटना उल्टा मुड"],
  ],
  rules: ({ rule, O }) => {
    const L = (i) => O("location", i);
    const [ANT, AROUND, BELOW, ABOVE, MEDIAL, LATERAL, POPL, TUBER, DIFFUSE] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(L);
    const KNEE = "knee* ghutna घुटना";
    const CAP = "kneecap knee_cap patella katori कटोरी chakri चक्की टोपी";
    // location
    rule("location", AROUND, [CAP, "around behind aaspaas आसपास peeche पीछे"], 4, { ctx: "pain" });
    rule("location", AROUND, [CAP, PAIN_W], 3, { unless: "below under beneath above upar niche नीचे ऊपर" });
    rule("location", BELOW, ["below under beneath niche नीचे", CAP], 4, { unless: "bump bony ubhri ubhaar उभरी उभार tuberosity osgood" });
    rule("location", TUBER, ["bump bumps lump bony ubhri ubhaar उभरी उभार उभरा", "below under beneath niche नीचे", KNEE], 9);
    rule("location", ABOVE, ["above upar ऊपर", CAP], 4);
    rule("location", MEDIAL, ["inner inside_of medial andruni अंदरूनी andar अंदर", KNEE], 5, { unless: "deep", block: HIT_IN, blockBefore: HIT_W, blockAfter: HIT_AFTER });
    rule("location", MEDIAL, ["inside inner medial", "sore tender painful hurts hurting aching"], 3, { ctx: "painOrArm", block: HIT_W, blockBefore: HIT_W });
    rule("location", LATERAL, ["outer outside lateral bahar bahari बाहर बाहरी", KNEE], 5, { block: HIT_IN, blockBefore: HIT_W, blockAfter: HIT_AFTER });
    rule("location", LATERAL, ["outside outer lateral", "sore tender painful hurts hurting aching"], 3, { ctx: "painOrArm", block: HIT_W, blockBefore: HIT_W });
    rule("location", MEDIAL, ["pain ache aching", "on_inside on_the_inside"], 3, { ctx: "painOrArm", block: HIT_W, blockBefore: HIT_W });
    rule("location", LATERAL, ["pain ache aching", "on_outside on_the_outside"], 3, { ctx: "painOrArm", block: HIT_W, blockBefore: HIT_W });
    rule("location", LATERAL, ["bahar bahari बाहर बाहरी", "taraf तरफ ओर hissa हिस्से", PAIN_W], 6, { ctx: "painOrArm", block: HIT_IN, blockAfter: HIT_AFTER });
    rule("location", POPL, ["back behind peeche पीछे", "ghutna घुटना knee"], 4, { unless: "kneecap knee_cap patella katori कटोरी chakri चक्की", block: "bent bend bends bending mod mudd mud मुड़" });
    rule("location", ANT, ["front anterior samne सामने aage आगे", KNEE], 4);
    rule("location", DIFFUSE, ["whole entire all_over all_around everywhere poore पूरे saare सारे", KNEE, PAIN_W], 6);
    // mechanism
    const M = (i) => O("mechanism", i);
    const [INSID, TWIST, DIRECT, HYPER, LAND, PIVOT, POSTOP] = [0, 1, 2, 3, 4, 5, 6].map(M);
    rule("mechanism", TWIST, ["after during playing while_playing", "twisting twisted"], 3);
    rule("mechanism", TWIST, ["twisted moch मोच mud_gaya mud_gayi mud_gaye mud_gya मुड़_गया मुड़_गई घूम_गया", KNEE + " leg"], 4, { unless: "ulta ulti उल्टा उल्टी peeche पीछे backwards" });
    rule("mechanism", DIRECT, ["hit banged bashed knocked bumped kicked struck smashed slammed crashed collided dashboard laat लात", KNEE], 4);
    rule("mechanism", DIRECT, ["hit hits knock knocks knocked blow blows kick kicks kicked struck tackle tackled bumped smash smashed bang banged slam slammed", KNEE + " leg side"], 6);
    rule("mechanism", DIRECT, ["hit hits knock knocked blow kick kicked struck tackle tackled bumped smash smashed", "outside inside outer inner side"], 4);
    rule("mechanism", DIRECT, [KNEE + " taang टांग", "maara mara marna maar laat मारा मार लात"], 6);
    rule("mechanism", DIRECT, ["fell fall fallen landed gir गिर", "on_knee on_bent_knee on_knees onto_knee on_kneecap on_knee_cap on_patella ghutna_par ghutna_pe ghutna_ke_bal घुटना_पर घुटना_के_बल"], 4);
    rule("mechanism", HYPER, ["hyperextend* hyperextension hyper_extension hyper_extended overextend* over_extended over_extend"], 1, { ctx: "painOrArm" });
    rule("mechanism", HYPER, ["backwards backward ulta उल्टा ulti उल्टी peeche पीछे", KNEE, "bend* bent bending mod mudd मुड़ मुड़ा"], 6, { unless: "dard दर्द pain" });
    rule("mechanism", LAND, ["land* landed landing utarte उतरते utar उतर niche_aaya niche_aate niche_aana niche_aayi", "jump* kood कूद* hop"], 9, { blockAfter: "sprint* sprinting running run" });
    rule("mechanism", PIVOT, ["pivoted pivoting pivot cutting sidestep* sidestepped side_step swerve* change_of_direction changing_direction changed_direction direction_change direction_badalte", ], 1, { ctx: "painOrArm", unless: "gives gave give buckle* buckles collapse* jawab जवाब" });
    rule("mechanism", PIVOT, ["foot_planted planted_foot planted_my_foot pair_jama"], 1, { ctx: "painOrArm" });
    rule("mechanism", PIVOT, ["cutting cut", "turn turns turning"], 3);
    // "twisted" (a twist that happened) -- not "pain when twisting"
    rule("mechanism", TWIST, ["twisted"], 1);
    rule("mechanism", TWIST, ["sudden sharp awkward violent forceful bad", "twist twisting"], 3, { ctx: "painOrArm" });
    rule("mechanism", TWIST, ["twist twisted twisting", "foot pair fixed planted stuck jama"], 6, { ctx: "painOrArm", unless: "pain hurts sore dard" });
    rule("mechanism", TWIST, ["achanak अचानक sudden suddenly", "mudne mudte mudna मुड़ने मुड़ते मुड़ना twist* turn*"], 3, { unless: "dard दर्द pain hurts" });
    rule("mechanism", TWIST, ["khelte खेलते football फुटबॉल cricket क्रिकेट खेल", "mudne mudte mudna मुड़ने मुड़ते मुड़ना"], 4, { unless: "dard दर्द pain hurts" });
    rule("mechanism", POSTOP, ["surgery operation operated arthroscopy replacement tkr ऑपरेशन सर्जरी", "after post since following baad बाद"], 6);
    rule("mechanism", POSTOP, ["operation surgery ऑपरेशन सर्जरी", "hua tha हुआ था"], 5, { ctx: "painOrArm" });
    rule("mechanism", POSTOP, ["replace* replacement implant*", KNEE + " joint"], 5, { unless: "fell fall tripped" });
    // giving way
    const G = (i) => O("givingWay", i);
    const [GNO, GPIVOT, GSTAIRS, GRANDOM] = [0, 1, 2, 3].map(G);
    rule("givingWay", GPIVOT, [GIVE_W, "twist* pivot* turn* turning cutting mudte मुड़ते mod ghumate घुमाते ghumne घूमने direction"], 8);
    rule("givingWay", GSTAIRS, [GIVE_W, "stairs staircase steps downstairs upstairs seedhiyan सीढी"], 8);
    rule("givingWay", GRANDOM, [GIVE_W, "beech_beech_me बीच_बीच_में randomly suddenly unpredictably unexpectedly without_warning no_reason for_no_reason out_of_nowhere just_gave just_gives just_gave_way standing_still while_standing while_sitting at_rest bina_bataye बिना_बताए kabhi_kabhi कभी_कभी sometimes occasionally achanak अचानक bina_wajah बिना_वजह kabhi_bhi कभी_भी out_of_the_blue"], 8, { selfNeg: true, block: "stairs staircase seedhiyan सीढी twist* pivot* turn* turning" });
    rule("givingWay", GNO, ["never no not dont doesnt didnt nahi नहीं kabhi_nahi", GIVE_W], 4, { selfNeg: true });
    // locking
    const Lk = (i) => O("locking", i);
    const [LKNO, LKTRUE, LKMOM] = [0, 1, 2].map(Lk);
    rule("locking", LKTRUE, ["lock locks locked locking jam jammed stuck atak लॉक जाम अटक", "straighten* extend* seedha सीधा bent mudi mod मुड़ी unlock* wiggle*"], 8, { selfNeg: true, blockBefore: "pair paer foot zameen पैर ज़मीन जमीन", block: "gaya gayi gaye gya गया गयी गई" });
    rule("locking", LKTRUE, ["lock locks locked jam jammed atak लॉक जाम अटक", "khulta khulti khul खुल*", "nahi नहीं"], 10, { selfNeg: true });
    rule("locking", LKNO, ["lock locks locking jam atak लॉक जाम अटक*", "never no not dont doesnt didnt nahi नहीं"], 4, { selfNeg: true, block: "seedha सीधा straighten* khulta खुल*" });
    rule("locking", LKMOM, ["atak_jata atak_jati atak_jaata अटक_जाता अटक_जाती अटक_जाते"], 3, { blockBefore: "pair paer foot zameen पैर ज़मीन जमीन" });
    rule("locking", LKMOM, ["catch* caught atak click* clicks", "momentary momentarily brief* second* seconds sec thodi_der kuch_second pal पल सेकंड free frees freed khul खुल"], 6);
    // red flags
    const R = (i) => O("redFlags", i);
    const [WEIGHT, SWELLNOW, LOCKEDK, HOTRED, CANCER] = [0, 1, 2, 3, 4].map(R);
    rule("redFlags", WEIGHT, ["cant cannot unable couldnt nahi नहीं", "weight_bear bear_weight put_weight weight bhaar भार wazan वजन वज़न kadam कदम step steps"], 7, { selfNeg: true });
    rule("redFlags", WEIGHT, ["cant cannot unable couldnt", "walk walking stand standing", "injury injured accident fall fell collision tackle tackled hit twisted landed chot gir"], 14, { selfNeg: true });
    rule("redFlags", SWELLNOW, ["swell* swollen sujan सूजन सूज phool फूल balloon* blew_up puffed puffy bloated inflated huge enormous massive double_size twice_size", "immediate* immediately straight_away straightaway instantly within_minutes within_an_hour within_hours within_hour within_the_hour within_few_minutes within_a_few_minutes within_half_hour right_away right_after turant तुरंत kuch_minute kuch_hi_minute lagte_hi लगते_ही कुछ_ही_मिनट कुछ_मिनट"], 8);
    rule("redFlags", LOCKEDK, ["cant cannot unable wont nahi नहीं", "straighten* extend* seedha सीधा", KNEE], 9, { selfNeg: true });
    rule("redFlags", HOTRED, ["hot warm garam गर्म* गरम* heat*", "red laal लाल redness laali"], 10, { ctx: "painOrArm" });
    rule("redFlags", HOTRED, ["hot warm garam गर्म* गरम*", "swollen swelling sujan सूजन", "joint knee ghutna घुटना"], 8);
    rule("redFlags", CANCER, ["cancer cancers tumor tumour tumors malignan* carcinoma lymphoma leukemia myeloma kainsar कैंसर cancerous", "history had diagnosed treated treatment survivor chemo chemotherapy radiotherapy past previous earlier before tha था hua हुआ ilaaj इलाज"], 6);
    // the shared 24-hour-pattern rules
    patternRules({ rule, O });
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
