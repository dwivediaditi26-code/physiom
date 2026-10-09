// elbowPhraseMap.js -- DRAFT, for Aditi to review. (The matching engine itself is in phraseEngine.js.)
//
// Understands what a student types about an Elbow / Wrist / Hand complaint in
// everyday words (English, Hinglish, Hindi in Devanagari) and suggests which of
// the Subjective checklist options it means. No AI, no network, no cost.
//
// It only SUGGESTS. Nothing here ticks anything: the screen is meant to show
// "We understood: Lateral elbow, Gripping -- tap to confirm" (not built yet).
// A wrong tick in a clinical tool is worse than a missing one, so every rule
// below prefers saying nothing to guessing.
//
// Covers the 7 questions that change the AI Objective Assessment ranking
// (location, radiation, mechanism, aggravating, pattern, neuro, redFlags); the
// option strings must match the form exactly (a test checks this).
//
// Phrase notation:  "~word"  = a bare word that only counts when the student is
// typing INTO that question's own box (e.g. "gripping" typed in "Aggravating
// movement"). In a free story it is ignored, because on its own it proves nothing.

import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { PATTERN_PHRASES, patternRules } from "./phrasePattern.js";

export const ELBOW_PHRASES = {
  location: {
    "Lateral elbow": [
      "lateral elbow", "outer elbow", "outside of the elbow", "outside of elbow", "outer side of the elbow",
      "outer side of elbow", "tennis elbow", "outside of my elbow",
      "kohni ke bahar", "kohni ke bahar ki taraf", "kohni ke bahari hisse", "bahar ki taraf kohni",
      "कोहनी के बाहर", "कोहनी के बाहरी हिस्से", "कोहनी की बाहरी तरफ",
    ],
    "Medial elbow": [
      "medial elbow", "inner elbow", "inner side of the elbow", "inner side of elbow", "golfers elbow", "golfer elbow",
      "funny bone", "inner bony part of the elbow",
      "kohni ke andar ki taraf", "kohni ki andar wali taraf", "kohni ke andruni hisse",
      "कोहनी के अंदर की तरफ", "कोहनी के अंदरूनी हिस्से", "कोहनी की अंदर वाली तरफ",
    ],
    "Posterior elbow": [
      "posterior elbow", "back of the elbow", "back of elbow", "back of my elbow", "point of the elbow",
      "tip of the elbow", "olecranon",
      "kohni ke peeche", "kohni ke piche ki taraf", "kohni ki nok",
      "कोहनी के पीछे", "कोहनी की नोक", "कोहनी के पिछले हिस्से",
    ],
    "Anterior elbow": [
      "anterior elbow", "front of the elbow", "front of elbow", "elbow crease", "bend of the elbow",
      "bend of my elbow", "crook of the elbow",
      "kohni ke aage", "kohni ke samne", "kohni ke mod", "kohni ke mudne wali jagah",
      "कोहनी के आगे", "कोहनी के सामने", "कोहनी के मोड़",
    ],
    "Forearm": [
      "forearm", "fore arm", "lower arm", "between the elbow and wrist", "between elbow and wrist",
      "kohni se kalai tak", "kohni aur kalai ke beech", "kalai se kohni ke beech",
      "कोहनी से कलाई तक", "कलाई और कोहनी के बीच", "अग्रबाहु",
    ],
    "Dorsal wrist": [
      "dorsal wrist", "back of the wrist", "back of wrist", "back of my wrist", "top of the wrist", "top of wrist",
      "kalai ke upri hisse", "kalai ke peeche", "kalai ke upar wali taraf",
      "कलाई के ऊपरी हिस्से", "कलाई के पीछे", "कलाई की ऊपर वाली तरफ",
    ],
    "Volar (palm-side) wrist": [
      "volar wrist", "palm side of the wrist", "palm side of wrist", "inside of the wrist", "inside of wrist",
      "wrist crease", "underside of the wrist",
      "kalai ke andar ki taraf", "hatheli ki taraf kalai", "kalai ki hatheli wali taraf",
      "कलाई के अंदर की तरफ", "हथेली की तरफ कलाई", "कलाई की हथेली वाली तरफ",
    ],
    "Radial wrist / thumb side": [
      "radial wrist", "thumb side of the wrist", "thumb side of wrist", "wrist on the thumb side", "thumb side wrist",
      "kalai ke angutha ki taraf", "angutha ki taraf kalai", "kalai ka angutha wala hissa",
      "कलाई के अंगूठे की तरफ", "अंगूठे की तरफ कलाई", "कलाई का अंगूठे वाला हिस्सा",
    ],
    "Ulnar wrist": [
      "ulnar wrist", "little finger side of the wrist", "little finger side of wrist", "pinky side of the wrist",
      "pinky side wrist", "pinky side of wrist",
      "kalai ke chhoti ungli ki taraf", "chhoti ungli ki taraf kalai", "kalai ka chhoti ungli wala hissa",
      "कलाई के छोटी उंगली की तरफ", "छोटी उंगली की तरफ कलाई", "कलाई का छोटी उंगली वाला हिस्सा",
    ],
    "Thumb": [
      "~thumb", "base of the thumb", "base of my thumb", "thumb joint", "pain in the thumb", "pain in my thumb",
      "~angutha", "angutha me dard", "angutha ke jad me dard",
      "~अंगूठा", "अंगूठे में दर्द", "अंगूठे की जड़ में दर्द",
    ],
    "Fingers": [
      "~fingers", "finger joints", "pain in the fingers", "pain in my fingers", "pain in my finger",
      "~ungli", "ungli me dard", "ungli ke jodon me dard",
      "~उंगली", "उंगली में दर्द", "उंगली के जोड़ों में दर्द",
    ],
    "Palm": [
      "~palm", "palm of the hand", "palm of my hand", "pain in the palm", "pain in my palm",
      "~hatheli", "hatheli me dard",
      "~हथेली", "हथेली में दर्द",
    ],
  },

  radiation: {
    "No radiation": [
      "no radiation", "does not radiate", "doesnt radiate", "not radiating", "does not spread", "doesnt spread",
      "stays in one place", "stays at one spot", "localised pain", "localized pain", "pain stays only at the elbow",
      "dard fail nahi", "dard aage nahi jata", "dard ek hi jagah rehta hai", "ek hi jagah dard",
      "दर्द फैलता नहीं", "दर्द आगे नहीं जाता", "दर्द एक ही जगह रहता है",
    ],
    "Into the fingers": [
      "radiates to the fingers", "radiating into the fingers", "radiating to the fingers", "radiates into my fingers",
      "pain going into the fingers", "pain goes down to the fingers", "pain goes into my fingers",
      "spreads to the fingers", "travels to the fingers", "down to the fingers", "into the fingers",
      "ungli tak dard", "ungli tak jata hai", "ungli me dard jata hai", "ungli tak fail",
      "उंगलियों तक जाता है", "उंगलियों तक दर्द", "उंगलियों में फैलता है",
    ],
    "Up the forearm": [
      "radiates up the forearm", "pain going up the forearm", "pain goes up the forearm", "up the forearm",
      "down the forearm", "pain goes down the forearm", "travels down the forearm", "spreads down the forearm",
      "kalai tak dard jata hai", "kohni se kalai tak dard jata hai", "dard kalai tak jata hai",
      "कलाई तक जाता है", "कोहनी से कलाई तक दर्द जाता है", "दर्द कलाई तक जाता है",
    ],
    "Numbness / tingling — thumb, index, middle finger (median nerve pattern)": [
      "numbness in thumb index and middle finger", "tingling in thumb index and middle finger",
      "tingling in thumb index and middle fingers", "numbness in the thumb index and middle fingers",
      "pins and needles in thumb index and middle finger", "thumb index and middle finger tingling",
      "thumb index and middle finger numb", "thumb and first two fingers numb", "thumb and first two fingers tingling",
      "angutha aur pehli do ungli sunnpan", "angutha aur pehli do ungli me sunnpan", "angutha aur do ungli me jhunjhuni", "angutha aur pehli do ungli me jhunjhuni",
      "अंगूठे और पहली दो उंगलियों में सुन्नपन", "अंगूठे तर्जनी और मध्यमा में झनझनाहट", "अंगूठे और पहली दो उंगलियों में झनझनाहट",
    ],
    "Numbness / tingling — ring and little finger (ulnar nerve pattern)": [
      "numbness in ring and little finger", "tingling in ring and little finger", "tingling in ring and little fingers",
      "pins and needles in the little finger", "little and ring finger numb", "pinky and ring finger tingling",
      "numb little finger", "little finger numbness", "pinky numb",
      "chhoti ungli aur uske paas wali ungli me sunnpan", "chhoti ungli aur anamika me sunnpan", "chhoti ungli aur anamika me jhunjhuni", "chhoti ungli me sunnpan",
      "छोटी उंगली और अनामिका में सुन्नपन", "छोटी और अनामिका उंगली में झनझनाहट", "छोटी उंगली में सुन्नपन",
    ],
  },

  mechanism: {
    "Insidious / overuse": [
      "overuse", "over use", "no injury", "no specific injury", "no particular injury", "started on its own",
      "started by itself", "came on slowly", "gradually started", "slowly started", "gradual onset", "no known cause",
      "dont know how it started", "too much work",
      "bina chot ke", "apne aap shuru hua", "dheere dheere shuru hua", "kaaran pata nahi", "zyada kaam karne se",
      "बिना चोट के", "अपने आप शुरू हुआ", "धीरे धीरे शुरू हुआ", "कारण पता नहीं", "ज्यादा काम करने से",
    ],
    "Fall onto outstretched hand": [
      "fall onto outstretched hand", "fell on an outstretched hand", "fell on my outstretched hand",
      "fell on my hand", "fell on the hand", "fall on hand", "foosh", "put my hand out to save myself",
      "fell and put my hand out", "landed on my hand",
      "haath ke bal gir", "haath tek kar gir", "haath pe gir", "haath par gir",
      "हाथ के बल गिर", "हाथ टेककर गिर", "हाथ पर गिर",
    ],
    "Repetitive gripping / lifting": [
      "repetitive gripping", "repetitive lifting", "heavy lifting at work", "lifting heavy weights",
      "lifting heavy objects", "carrying heavy bags", "carrying heavy loads", "carrying buckets",
      "lifting weights in the gym", "weights in the gym", "after the gym", "wringing clothes", "washing clothes by hand",
      "kneading dough", "using a hammer all day", "using a screwdriver all day", "painting walls",
      "carry heavy bags", "carry heavy loads", "carry heavy things", "carry buckets", "lift heavy weights", "lift heavy objects",
      "lift weights in the gym", "wring clothes", "wash clothes by hand", "knead dough", "use a hammer all day",
      "use a screwdriver all day", "paint walls",
      "baar baar uthana", "bhari saman uthana", "bhari wazan uthana", "bhari thaile uthana", "balti uthana",
      "kapde nichodna", "kapde dhona", "aata goondhna", "hathode se kaam", "gym me weight",
      "बार बार उठाना", "भारी सामान उठाना", "भारी वजन उठाना", "बाल्टी उठाना", "कपड़े निचोड़ना", "आटा गूंथना", "हथौड़े से काम",
    ],
    "Racquet sport (lateral elbow)": [
      "tennis", "badminton", "squash", "racquet sport", "racket sport", "played tennis", "playing tennis",
      "playing badminton", "table tennis", "pickleball", "play tennis", "play badminton", "play squash", "played badminton",
      "tennis khelne se", "badminton khelne se", "tennis khelna", "badminton khelna",
      "टेनिस", "बैडमिंटन", "टेनिस खेलने से", "बैडमिंटन खेलने से",
    ],
    "Golf / throwing (medial elbow)": [
      "golf", "playing golf", "play golf", "played golf", "golf swing", "throw ball", "throwing ball", "throwing a ball", "throwing sports", "throw the ball", "overhead throwing",
      "cricket bowling", "bowling in cricket", "javelin", "baseball", "pitching", "fast bowler",
      "golf khelne se", "ball phenkne se", "ball phenkna", "cricket me bowling",
      "गोल्फ", "गेंद फेंकने से", "गेंद फेंकना", "क्रिकेट में गेंदबाजी",
    ],
    "Repetitive thumb use (e.g. new parent lifting baby)": [
      "repetitive thumb use", "lifting the baby", "lifting my baby", "carrying the baby", "carrying my baby", "lift baby", "carry baby", "lifted baby",
      "pick up baby", "hold baby all day",
      "new mother", "new mom", "new parent", "holding the baby all day", "texting a lot", "playing video games", "gaming",
      "baby ko uthane se", "bachche ko god me uthane se", "naye bachche", "bachche ko uthana", "texting zyada",
      "बच्चे को उठाने से", "बच्चे को गोद में", "नए बच्चे", "मोबाइल पर टेक्स्टिंग",
    ],
    "Direct trauma": [
      "direct blow", "hit on the elbow", "hit my elbow", "banged my elbow", "knocked my elbow", "bumped my elbow",
      "hit by a ball", "road accident", "accident", "collision", "got hit",
      "kohni par chot", "kohni me chot", "kohni takra", "kohni par maar", "accident me chot",
      "कोहनी पर चोट", "कोहनी टकरा", "कोहनी पर मार", "एक्सीडेंट में चोट",
    ],
    "Vibration exposure": [
      "vibration", "vibrating tools", "power tools", "drilling machine", "jackhammer", "chainsaw", "grinder",
      "using a drill", "vibrating machine at work",
      "drill machine chalane se", "machine ke vibration", "kampan wali machine", "drill machine",
      "कंपन वाली मशीन", "ड्रिल मशीन", "मशीन के कंपन",
    ],
  },

  aggravating: {
    "Gripping": [
      "~gripping", "~grip", "pain when i grip", "pain when i hold things", "hurts to hold things", "hurts when i hold",
      "pain when gripping", "pain on gripping", "pain with gripping", "hurts to grip",
      "hurts when i grip", "hurts when gripping", "painful to grip", "gripping hurts", "gripping makes it worse",
      "grip makes it worse", "worse with gripping", "worse when i grip", "pain when holding", "pain holding a cup",
      "hurts when i hold things", "shaking hands hurts", "turning a door handle hurts", "opening jar lids hurts",
      "~pakadna", "pakad me dard", "pakad par dard", "kuch pakad ke dard", "mutthi bandh karne me dard", "cup pakad ke dard",
      "~पकड़ना", "पकड़ने में दर्द", "पकड़ने पर दर्द", "पकड़ते समय दर्द", "मुट्ठी बंद करने में दर्द",
    ],
    "Lifting": [
      "~lifting", "~lift", "pain when i lift", "hurts when i lift", "hurts when lifting", "pain when lifting", "pain on lifting", "pain with lifting", "hurts to lift",
      "lifting hurts", "lifting makes it worse", "worse with lifting", "worse when i lift", "pain lifting things",
      "~uthana", "uthana me dard", "uthana par dard", "uthana ke dard", "weight uthana me dard",
      "~उठाना", "उठाने में दर्द", "उठाते समय दर्द", "वजन उठाने में दर्द", "भारी सामान उठाने पर दर्द",
    ],
    "Wrist extension against resistance": [
      "~wrist extension", "~extending the wrist", "pain bending the wrist back", "pain bending wrist backwards",
      "hurts to bend my wrist up", "cocking the wrist", "backhand shot hurts", "pain on backhand",
      "pain lifting with palm facing down", "pain pulling the wrist up",
      "kalai upar karne me dard", "kalai ko peeche mudne me dard", "kalai peeche mod kar dard",
      "कलाई ऊपर करने में दर्द", "कलाई पीछे मोड़ने में दर्द",
    ],
    "Wrist flexion against resistance": [
      "~wrist flexion", "~flexing the wrist", "pain bending the wrist down", "pain bending wrist forward",
      "hurts to curl the wrist", "wrist curls hurt", "pain lifting with palm facing up", "palm up lifting hurts",
      "pain pulling the wrist down",
      "kalai niche karne me dard", "kalai aage mudne me dard", "kalai aage mod kar dard",
      "कलाई नीचे करने में दर्द", "कलाई आगे मोड़ने में दर्द",
    ],
    "Thumb movements": [
      "~thumb movement", "~thumb movements", "thumb movements hurt", "pain moving the thumb", "pain with thumb movement",
      "pain when i move my thumb", "pain when i use my thumb", "hurts to move my thumb",
      "~angutha", "angutha hilane me dard", "angutha hilne par dard", "angutha mudne me dard",
      "~अंगूठा", "अंगूठा हिलाने में दर्द", "अंगूठे को मोड़ने में दर्द",
    ],
    "Repetitive typing / mouse use": [
      "~typing", "~mouse", "~computer work", "pain when i type", "hurts when i type", "pain when typing", "pain with typing", "hurts to type", "typing hurts",
      "pain using the mouse", "pain when using a mouse", "pain after working on the computer",
      "pain from long hours at the computer", "keyboard use hurts", "laptop work hurts",
      "typing karne me dard", "mouse chalane me dard", "computer par kaam karne se dard", "keyboard par kaam karne se dard",
      "टाइप करने में दर्द", "माउस चलाने में दर्द", "कंप्यूटर पर काम करने से दर्द",
    ],
    "Sustained grip": [
      "~sustained grip", "~prolonged grip", "pain when holding for a long time", "pain holding something for long",
      "pain carrying a bag for long", "pain holding the steering wheel", "pain holding a phone for long",
      "der tak pakad ke dard", "der tak pakad ke rakhne par dard", "lambe samay tak pakad ke dard",
      "देर तक पकड़ने से दर्द", "देर तक पकड़कर रखने पर दर्द", "लंबे समय तक पकड़ने से दर्द",
    ],
  },

  pattern: PATTERN_PHRASES,

  neuro: {
    "None": [
      "no neurological symptoms", "no numbness tingling or weakness", "no numbness or tingling or weakness",
      "no nerve symptoms", "no numbness or weakness", "no pins and needles or weakness",
      "sunnpan ya kamzor nahi", "koi nerve ki problem nahi", "koi sunnpan ya kamzor nahi",
      "सुन्नपन या कमजोरी नहीं", "कोई न्यूरोलॉजिकल समस्या नहीं", "कोई नस की समस्या नहीं",
    ],
    "Numbness / tingling — night-dominant (carpal tunnel pattern)": [
      "numbness at night", "tingling at night", "hand goes numb at night", "hand numb at night",
      "wakes me up with a numb hand", "waking with tingling hands", "wake up with numb fingers",
      "shake my hand to relieve numbness",
      "raat ko sunnpan", "raat ko haath sunn", "raat ko jhunjhuni", "neend me haath sunn",
      "रात को सुन्नपन", "रात को हाथ सुन्न", "रात को झनझनाहट", "नींद में हाथ सुन्न",
    ],
    "Numbness / tingling — worse with elbow flexion (cubital tunnel pattern)": [
      "numbness when the elbow is bent", "tingling when elbow bent", "numb when i bend my elbow",
      "tingling while holding the phone", "numb on the phone", "numbness when sleeping with elbow bent",
      "sleeping with bent elbow numbness",
      "kohni mudne par sunnpan", "kohni mudne par jhunjhuni", "phone pakad ke haath sunn", "kohni mod kar sone se sunn",
      "कोहनी मोड़ने पर सुन्नपन", "कोहनी मुड़ने पर झनझनाहट", "फोन पकड़ते समय हाथ सुन्न",
    ],
    "Weakness in grip": [
      "weak grip", "grip is weak", "weakness in grip", "grip weakness", "cant grip", "cannot grip", "unable to grip",
      "cannot hold things properly", "hand feels weak", "weak hand",
      "pakad kamzor", "pakad ki taakat kam", "haath me kamzor",
      "पकड़ कमजोर", "पकड़ने की ताकत कम", "हाथ में कमजोरी",
    ],
    "Dropping objects": [
      "dropping things", "dropping objects", "drops things", "keep dropping things", "drop things",
      "things slip from my hand", "things fall from my hand", "dropped cup", "dropping cups",
      "cheezein haath se gir", "saman haath se chhut", "haath se cheezein gir", "haath se glass chhut",
      "चीजें हाथ से गिर", "सामान हाथ से छूट", "हाथ से गिलास छूट",
    ],
    "Wasting of hand muscles": [
      "wasting of the hand muscles", "muscle wasting", "hand muscles have shrunk", "hand muscles thinner",
      "thinning of hand muscles", "muscles of the hand are shrinking", "hand looks thinner", "web of thumb looks hollow",
      "haath ki muscles patli", "haath ki mansapeshiyan sookh", "haath patla ho", "mansapeshi kam ho",
      "हाथ की मांसपेशियां पतली", "हाथ की मांसपेशियां सूख", "हाथ पतला हो",
    ],
  },

  redFlags: {
    "Suspected fracture (fall / trauma + deformity)": [
      "suspected fracture", "possible fracture", "think it is broken", "think i broke", "heard a crack", "heard a snap",
      "bone looks bent", "elbow looks deformed", "deformed elbow", "deformity", "bone sticking out", "arm looks crooked",
      "elbow out of place", "dislocated",
      "haddi toot", "haddi tedha", "kohni tedha", "haath tedha dikhta hai", "fracture lag raha hai",
      "हड्डी टूट", "हड्डी टेढ़ी", "कोहनी टेढ़ी", "फ्रैक्चर लग रहा है",
    ],
    "Snuffbox tenderness after a fall (possible scaphoid fracture)": [
      "pain at the base of the thumb after a fall", "tender at the base of the thumb after falling", "snuffbox",
      "anatomical snuffbox", "scaphoid", "pain between thumb and wrist after fall", "pain at thumb base after falling on hand",
      "gir ke baad angutha ke jad me dard", "gir ke baad angutha ke niche dard",
      "गिरने के बाद अंगूठे की जड़ में दर्द", "गिरने के बाद अंगूठे के नीचे दर्द",
    ],
    "Sudden inability to extend a finger (tendon rupture)": [
      "cannot straighten my finger suddenly", "suddenly cant straighten finger", "sudden inability to extend a finger",
      "finger suddenly stuck bent", "finger will not extend", "cant lift my finger up suddenly", "finger dropped suddenly",
      "ungli achanak seedhi nahi", "ungli achanak mud gayi seedhi nahi", "ungli seedhi nahi ho rahi achanak",
      "उंगली अचानक सीधी नहीं", "उंगली अचानक मुड़ गई सीधी नहीं हो रही",
    ],
    "Rapidly increasing swelling / severe pain (compartment syndrome)": [
      "rapidly increasing swelling", "swelling is increasing fast", "swelling increasing quickly",
      "swelling getting bigger fast", "severe pain and swelling getting worse", "forearm is tight and swollen",
      "very tight swollen forearm",
      "sujan tezi se badh", "sujan bahut jaldi badh", "bahut tej dard aur sujan badh", "forearm bahut tight",
      "सूजन तेजी से बढ़", "बहुत तेज दर्द और सूजन बढ़",
    ],
    "Hot / red / swollen joint": [
      "hot red swollen joint", "red hot swollen elbow", "red and swollen joint", "joint is hot and red", "hot and swollen",
      "red hot joint", "warm swollen elbow", "joint feels hot",
      "garam aur laal sujan", "joint garam hai aur laal", "kohni garam aur sujan",
      "गर्म और लाल सूजन", "जोड़ गरम और लाल", "कोहनी गर्म और सूजी हुई",
    ],
    "Bilateral symptoms (systemic screen)": [
      "both elbows", "both hands", "both wrists", "both arms", "both sides", "same in both hands",
      "other hand too", "other elbow as well",
      "dono kohni", "dono haath", "dono kalai", "dono taraf", "dusre haath me bhi",
      "दोनों कोहनी", "दोनों हाथ", "दोनों कलाई", "दूसरे हाथ में भी",
    ],
    "None of the above": [
      "no red flags", "no red flag", "no warning signs", "none of the above", "nothing worrying",
      "koi red flag nahi", "koi khatre ki baat nahi",
      "कोई रेड फ्लैग नहीं", "कोई खतरे की बात नहीं",
    ],
  },
};


const { PAIN: PAIN_W, NERVE: NERVE_W, SIDE: SIDE_W } = WORDS;
const ELBOW_W = "elbow elbows kohni कोहनी";
const WRIST_W = "wrist wrists kalai कलाई";
const ARM_W = "elbow* forearm wrist* hand hands arm arms thumb finger fingers palm kohni kalai haath ungli angutha hatheli कोहनी कलाई हाथ उंगली अंगूठा हथेली";
// A sentence about another body part is not about this complaint.
const FOREIGN_W = "back backs backache knee* neck shoulder* hip* ankle* foot feet leg legs spine waist thigh calf chest stomach head headache jaw toe* groin tooth teeth eye* ear throat kamar ghutn* ghutna gardan kandha कमर घुटन* गर्दन कंधा पैर पेट सिर घुटने";

const matcher = createPhraseMatcher({
  phrases: ELBOW_PHRASES,
  singleChoiceFields: ["pattern"],
  noneOptions: { neuro: "None", redFlags: "None of the above" },
  ownWords: ARM_W,
  foreignWords: FOREIGN_W,
  rules: ({ rule, O }) => {
    const OPT = O;
    // location
    rule("location", OPT("location", 0), [ELBOW_W, "outer outside lateral bahar bahari बाहर बाहरी"], 5);
    rule("location", OPT("location", 1), [ELBOW_W, "inner medial andruni अंदरूनी"], 5);
    rule("location", OPT("location", 2), [ELBOW_W, "posterior behind olecranon back_side backside pichle pichla piche peeche पीछे पिछले पिछला"], 5);
    rule("location", OPT("location", 3), [ELBOW_W, "anterior front crease aage samne आगे सामने"], 5);
    rule("location", OPT("location", 9), ["thumb angutha अंगूठा", PAIN_W], 4, { unless: "side taraf wrist kalai कलाई radial ulnar" });
    rule("location", OPT("location", 7), [WRIST_W, "thumb angutha अंगूठा radial", SIDE_W], 7);
    rule("location", OPT("location", 8), [WRIST_W, "pinky little_finger chhoti छोटी ulnar", SIDE_W], 7);
    // radiation
    rule("radiation", OPT("radiation", 1), [ "radiat* spread* travel* goes going jata jati जाता जाती फैल* fail", "fingers finger ungli उंगली" ], 7, { ctx: "pain" });
    rule("radiation", OPT("radiation", 3), [NERVE_W, "thumb angutha अंगूठा", "index middle first pehli tarjani two do"], 8);
    rule("radiation", OPT("radiation", 4), [NERVE_W, "pinky little_finger little_fingers chhoti छोटी anamika अनामिका ring_finger ring_fingers"], 7);
    // mechanism
    rule("mechanism", OPT("mechanism", 1), ["fell fallen tripped landed gir गिर", "hand palm wrist outstretched"], 6, { unless: "asleep sleep ill sick love apart" });
    rule("mechanism", OPT("mechanism", 1), ["put_hand_out put_hands_out stuck_hand_out stretched_hand_out", "fall fell stop save slipped tripped"], 10);
    rule("mechanism", OPT("mechanism", 1), ["gir गिर", "haath_ke_bal haath_pe haath_par haath_tek हाथ_के_बल हाथ_पर हाथ_टेककर"], 6);
    rule("mechanism", OPT("mechanism", 2), ["carry* lift* uthana उठाना", "heavy bhari भारी"], 5, { ctx: "painOrArm", blockBefore: PAIN_W });
    rule("mechanism", OPT("mechanism", 2), ["paint* garden* gardening weed* hammer* wring* knead* scrub* mop* sweep* farming"], 1, { ctx: "painOrArm" });
    rule("mechanism", OPT("mechanism", 4), ["throw* bowl* phenkna", "ball cricket javelin"], 4, { ctx: "painOrArm" });
    rule("mechanism", OPT("mechanism", 5), ["carry* lift* hold* uthana उठाना god गोद pick*", "baby bachche bachcha बच्चे बच्चा infant newborn"], 4, { ctx: "painOrArm" });
    rule("mechanism", OPT("mechanism", 6), ["chot चोट hit banged knocked bumped struck injured crash* collided landed_on", ELBOW_W], 4);
    // aggravating
    // "weak grip" is weakness, not painful gripping; "lifting my baby all day, pain at ..." is exposure, not
    // "hurts when I lift" -- so these words between the two groups switch the rule off.
    const A = { reliefKills: true, block: "weak* kamzor कमजोर all_day every_day daily din_bhar roz रोज" };
    rule("aggravating", OPT("aggravating", 0), ["grip* grab* pakad पकड clutch*", PAIN_W], 7, A);
    rule("aggravating", OPT("aggravating", 0), ["cup mug glass bottle jar handle pen racket hammer doorknob", PAIN_W], 10, A);
    rule("aggravating", OPT("aggravating", 1), ["lift* uthana उठाना carry*", PAIN_W], 6, A);
    rule("aggravating", OPT("aggravating", 6), ["grip* hold* pakad पकड steering", "steering long_drive* long_drives long_time for_long hours der lambe देर लंबे", PAIN_W], 9, { reliefKills: true, block: "weak* kamzor कमजोर" });
    rule("aggravating", OPT("aggravating", 5), ["typing typed types mouse keyboard laptop computer टाइप माउस कीबोर्ड कंप्यूटर type_lot type_all type_on i_type type_report* type_email* type_notes", PAIN_W], 7, { reliefKills: true, block: "weak* kamzor कमजोर" });
    rule("aggravating", OPT("aggravating", 4), ["thumb angutha अंगूठा", "move* moving movement* use using chalana texting scrolling mobile phone hilna हिलाना हिलने", PAIN_W], 7, A);
    patternRules({ rule, O });
    // neuro
    rule("neuro", OPT("neuro", 1), [NERVE_W, "night raat रात sleep* neend नींद wake* shake*"], 12, { unless: "elbow kohni कोहनी bent bend* flex*" });
    rule("neuro", OPT("neuro", 2), [NERVE_W, "bent bend* bending flex* mod मोड*", ELBOW_W], 12);
    rule("neuro", OPT("neuro", 3), ["weak* kamzor कमजोर cannot cant unable", "grip* hold* pakad पकड pen cup glass bottle jar things objects"], 5, { selfNeg: true });
    rule("neuro", OPT("neuro", 4), ["drop* chhut* छूट* gir गिर slip*", "things objects cup* glass phone pen keys plate* bottle* coin* cheez* चीज* saman सामान"], 5);
    rule("neuro", OPT("neuro", 5), ["wast* shrunk shrink* thin* flat hollow patl* पतल* sookh* सूख*", "muscle* mansapeshi* मांसपेशी*"], 6);
    // red flags
    rule("redFlags", OPT("redFlags", 0), ["bone haddi हड्डी", "broken break* bent crooked toot टूट tedha टेढ़"], 5);
    rule("redFlags", OPT("redFlags", 0), ["looks lag लग dikh* दिख*", "bent crooked deformed tedha टेढ़*", ARM_W], 7);
    rule("redFlags", OPT("redFlags", 0), ["heard suna सुना", "snap* crack* pop*"], 3);
    rule("redFlags", OPT("redFlags", 0), ["fracture fractured broken", "think thought suspect* lag लग might maybe"], 5);
    rule("redFlags", OPT("redFlags", 3), ["swell* sujan सूजन", "increas* growing bigger doubled doubling tripled ballooned ballooning badh बढ़ rapid* fast quickly tezi तेजी jaldi"], 6);
    rule("redFlags", OPT("redFlags", 4), ["hot warm garam गर्म* गरम* गर्मी heat*", "red laal लाल", "swollen swelling puffy sujan सूजन सूजी"], 8);
    rule("redFlags", OPT("redFlags", 4), ["hot warm garam गर्म* गरम*", "swollen swelling sujan सूजन", "elbow wrist joint kohni kalai कोहनी कलाई जोड़ haath"], 8);
    rule("redFlags", OPT("redFlags", 5), ["both dono दोनों", ARM_W], 3);
    rule("redFlags", OPT("redFlags", 1), ["thumb angutha अंगूठा snuffbox scaphoid", "fall fell falling gir गिर", "pain painful sore tender dard दर्द"], 10, { unless: "asleep sleep" });
    rule("redFlags", OPT("redFlags", 2), ["finger ungli उंगली", "straighten* extend* seedhi सीधी सीधा", "sudden* achanak अचानक"], 12, { selfNeg: true });
  },
});

export const ELBOW_FIELDS = matcher.fields;
export const FIELDS = matcher.fields;
export const PHRASE_COUNT = matcher.PHRASE_COUNT;
export const RULE_COUNT = matcher.RULE_COUNT;
export const phrasesFor = matcher.phrasesFor;
export const allPhrases = matcher.allPhrases;
export const describeRules = matcher.describeRules;
export const understandField = matcher.understandField;
export const understandStory = matcher.understandStory;
