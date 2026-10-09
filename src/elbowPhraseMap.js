// elbowPhraseMap.js -- DRAFT, for Aditi to review.
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

  pattern: {
    "Constant": [
      "~constant", "constant pain", "pain all the time", "pain all day and night", "pain 24 hours", "never goes away",
      "never fully goes away", "always painful", "always there",
      "hamesha dard", "hamesha rehta hai", "lagatar dard", "din raat dard", "dard kabhi khatam nahi hota",
      "हमेशा दर्द", "लगातार दर्द", "दिन रात दर्द",
    ],
    "Intermittent": [
      "~intermittent", "comes and goes", "on and off", "now and then", "occasional pain", "occasionally", "sometimes pain",
      "kabhi kabhi dard", "kabhi hota hai kabhi nahi", "aata jata rehta hai", "thodi der ke liye aata hai",
      "कभी कभी दर्द", "आता जाता रहता है", "थोड़ी देर के लिए आता है",
    ],
    "Worse in morning": [
      "worse in the morning", "worse in morning", "worst in the morning", "stiff in the morning", "morning stiffness",
      "first thing in the morning", "pain on waking", "pain when i wake up",
      "subah zyada dard", "subah dard zyada hota hai", "subah uthte hi dard", "subah akdan",
      "सुबह ज्यादा दर्द", "सुबह उठते ही दर्द", "सुबह अकड़न",
    ],
    "Worse at night": [
      "worse at night", "worse during the night", "night pain", "pain at night", "pain wakes me up",
      "wakes me up at night", "cannot sleep because of pain", "pain disturbs my sleep",
      "raat ko dard", "raat ko zyada dard", "raat me dard badh", "raat ko neend nahi aati dard se",
      "रात को दर्द", "रात में ज्यादा दर्द", "दर्द से नींद खुल जाती है",
    ],
    "Activity-related": [
      "~activity related", "pain with activity", "pain only with activity", "pain when i use it", "pain only when using",
      "only hurts when i move it", "hurts only during activity",
      "kaam karne par dard", "kaam karte waqt dard", "sirf kaam karne par dard", "hilane par dard", "istemal karne par dard",
      "काम करने पर दर्द", "सिर्फ काम करने पर दर्द", "इस्तेमाल करने पर दर्द",
    ],
    "Improves through the day": [
      "improves through the day", "gets better during the day", "better as the day goes on", "eases through the day",
      "loosens up during the day", "warms up", "better once i start moving",
      "din me theek ho jata hai", "din chadhte theek", "chalne phirne se aaram", "hilne dulne se aaram",
      "दिन में ठीक हो जाता है", "दिन चढ़ने पर आराम", "हिलने डुलने से आराम",
    ],
  },

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

export const ELBOW_FIELDS = Object.keys(ELBOW_PHRASES);
const SINGLE_CHOICE_FIELDS = new Set(["pattern"]);

// ───────────────────────── normalising ─────────────────────────
// Common Hinglish spellings -> one form. Phrases and typed text both go through this,
// so a phrase written one way still matches the same word spelled another way.
const HINGLISH = [
  [/\b(kehni|kuhni|kohnee|kohani|kohni)\b/g, "kohni"],
  [/\b(darad|dardd|dard)\b/g, "dard"],
  [/\b(nahin|nahi|nhi|nahee)\b/g, "nahi"],
  [/\b(sunn?pan|sunpan|sunnapan)\b/g, "sunnpan"],
  [/\b(jhunjhuni|jhunjhunee|jhunjhunahat|jhanjhanahat)\b/g, "jhunjhuni"],
  [/\b(ungli|unglee|ungliyan|ungliyon|unglian|ungliya|ungliyaan)\b/g, "ungli"],
  [/\b(kalai|kalayi|kalaee)\b/g, "kalai"],
  [/\b(angutha|angootha|anguthe|angoothe|angutho|anguthaa)\b/g, "angutha"],
  [/\b(hatheli|hathheli)\b/g, "hatheli"],
  [/\b(haath|hath|hathon|haathon)\b/g, "haath"],
  [/\b(uthana|uthane|uthaana|uthaane|uthate|uthaate|uthata|uthati|uthayi|uthaya|uthaye)\b/g, "uthana"],
  [/\b(pakadna|pakadne|pakadte|pakadta|pakadti|pakad|pakarna|pakarne|pakarte|pakar|pakadkar)\b/g, "pakad"],
  [/\b(zyada|jyada|jyaada|zyaada)\b/g, "zyada"],
  [/\b(subah|subha|savere)\b/g, "subah"],
  [/\b(kamzor|kamjor|kamzori|kamjori|kamzoree)\b/g, "kamzor"],
  [/\b(sujan|sujhan|sooji|suji|sooja|suja|soojan)\b/g, "sujan"],
  [/\b(garam|garm|garum)\b/g, "garam"],
  [/\b(laal|lal|laall)\b/g, "laal"],
  [/\bgir (gaya|gayi|gaye|jata|jati|jate|gya)\b/g, "gir"],
  [/\b(girne|girna|girta|girti|girte|gira|gire|giri|girgaya|girgayi)\b/g, "gir"],
  [/\b(tedhi|tedha|tedhe)\b/g, "tedha"],
  [/\btoot (gayi|gaya|gaye)\b/g, "toot"],
  [/\b(tooti|toota|tuta|tuti|toot)\b/g, "toot"],
  [/\b(badhta|badhti|badhne|badhna|badh rahi|badh raha|badh rahe|badh)\b/g, "badh"],
  [/\b(failta|failti|failna|phailta|phailti|phailna|fail)\b/g, "fail"],
  [/\b(chotein|chott|chot)\b/g, "chot"],
  [/\blag (gayi|gaya|gaye)\b/g, "lag"],
  [/\b(lagi|lagna|lagta|lagti|laga|lage|lagne|lag)\b/g, "lag"],
  [/\b(phenkne|phenkna|phenka|fenkne|fenkna)\b/g, "phenkna"],
  [/\b(chalane|chalana|chalate|chalata|chalani)\b/g, "chalana"],
  [/\b(khelne|khelna|khelte|khelta|khelti|khela)\b/g, "khelna"],
  [/\b(karne|karna|karte|karta|karti)\b/g, "karna"],
  [/\b(hilane|hilana|hilne|hilna|hilte)\b/g, "hilna"],
  [/\b(mudne|mudna|mudte|mudta|mudti|mudi|modne|modna|modti|mod kar|mod)\b/g, "mod"],
  [/\b(dhone|dhona|dhote|dhoti|dhoya|dhoye)\b/g, "dhona"],
];
const DEVA = [
  [/पकड(ना|ने|ते|ता|ती|कर)?/g, "पकड"],
  [/टूट(ी|ा|े)?/g, "टूट"],
  [/उठा(ना|ने|ते|ता|ती|या)/g, "उठाना"],
  [/उंगली(यां|यों|याँ)?/g, "उंगली"],
  [/अंगूठ[ाेों]/g, "अंगूठा"],
  [/हाथ(ों)?/g, "हाथ"],
  [/सूज(न|ी|ा)/g, "सूजन"],
  [/गिर(ा|ी|ने|ना|ते|ता|ती|े)?/g, "गिर"],
  [/नहीं|नही/g, "नहीं"],
  [/कमजोर(ी)?|कमज़ोर(ी)?/g, "कमजोर"],
];

function canon(raw) {
  let s = String(raw ?? "").normalize("NFC").toLowerCase();
  s = s.replace(/[​-‍﻿]/g, "");
  s = s.replace(/़/g, "");            // Devanagari nukta
  s = s.replace(/ँ/g, "ं");      // chandrabindu -> anusvara
  s = s.replace(/[’‘`´]/g, "'");
  s = s.replace(/([a-z])'([a-z])/g, "$1$2"); // don't -> dont
  s = s.replace(/'/g, "");
  s = s.replace(/[।.;!?\n\r]+/g, " | "); // sentence ends
  s = s.replace(/,/g, " , ");
  s = s.replace(/[()/:"“”\-–—_+*#<>{}[\]=~]/g, " ");
  for (const [re, to] of HINGLISH) s = s.replace(re, to);
  for (const [re, to] of DEVA) s = s.replace(re, to);
  s = s.replace(/\b(the|my|a|an)\b/g, " ");   // "back of my elbow" == "back of the elbow"
  return s.replace(/\s+/g, " ").trim();
}

const NEGATORS = new Set(["no", "not", "never", "without", "none", "nothing", "neither", "nor", "nil",
  "dont", "doesnt", "didnt", "isnt", "wasnt", "arent", "hasnt", "havent", "wont", "wouldnt",
  "nahi", "bina", "bagair", "mat", "नहीं", "बिना", "बगैर", "मत"]);
const NEGATORS_AFTER = new Set(["nahi", "नहीं"]);
const RELIEF = new Set(["better", "relieved", "relief", "eases", "ease", "improves", "improve", "settles", "helps",
  "aaram", "rahat", "आराम", "राहत"]);
const CLAUSE_BREAKS = new Set(["|", "but", "however", "although", "though", "lekin", "magar", "लेकिन", "मगर", "परंतु", "किंतु"]);
const CONNECTORS = new Set([",", "and", "or", "aur", "ya", "और", "या"]);

// ───────────────────────── compiling ─────────────────────────
const COMPILED = [];
for (const field of ELBOW_FIELDS) {
  for (const [option, list] of Object.entries(ELBOW_PHRASES[field])) {
    for (const raw of list) {
      const bare = raw.startsWith("~");
      const tokens = canon(bare ? raw.slice(1) : raw).split(" ").filter((t) => t && t !== ",");
      if (!tokens.length) continue;
      const selfNegating = tokens.some((t) => NEGATORS.has(t));
      COMPILED.push({ field, option, bare, tokens, selfNegating, key: tokens.join(" ") });
    }
  }
}
// The exact wording of each checklist option always maps to itself, so pasting or typing
// the option's own text works. One- and two-word labels ("Constant", "Lifting", "None")
// are bare: they only count inside that question's own box.
const SEEN = new Set(COMPILED.map((c) => c.field + "|" + c.option + "|" + c.key));
for (const field of ELBOW_FIELDS) {
  for (const option of Object.keys(ELBOW_PHRASES[field])) {
    const tokens = canon(option).split(" ").filter((t) => t && t !== ",");
    const key = tokens.join(" ");
    if (!tokens.length || SEEN.has(field + "|" + option + "|" + key)) continue;
    COMPILED.push({ field, option, bare: tokens.length <= 2, tokens, selfNegating: tokens.some((t) => NEGATORS.has(t)), key });
  }
}
// Longest phrase first, so "thumb side of the wrist" wins over "thumb".
COMPILED.sort((a, b) => b.tokens.length - a.tokens.length || b.key.length - a.key.length);

export const PHRASE_COUNT = COMPILED.length;
export function phrasesFor(field, option) { return (ELBOW_PHRASES[field]?.[option] || []).map((p) => (p.startsWith("~") ? p.slice(1) : p)); }
export function allPhrases() {
  return COMPILED.map((c) => ({ field: c.field, option: c.option, bare: c.bare, key: c.key, selfNegating: c.selfNegating }));
}


// ───────────────────────── word-order rules ─────────────────────────
// The phrase list needs the exact words in the exact order. Real typing is looser ("elbow outer
// side", "glass pakadte hi dard hota hai"). A rule says: these WORD GROUPS must all appear close
// together, in any order. Each group is a space-separated list of alternatives; "a_b" is the
// two-word alternative "a b"; a trailing * matches any ending (lift* = lift, lifting, lifted).
//
// Safety, because a wrong suggestion misleads:
//  - rules stay silent in a sentence that mentions another body part (back, knee, neck ...),
//  - negation ("no", "not", "nahi") and "better with ..." kill a rule, as for phrases,
//  - several rules also need a pain word, an arm word, or must not have a blocking word between.
const g = (s) => s.split(/\s+/).filter(Boolean).map((alt) => alt.split("_").map((w) => {
  const star = w.endsWith("*"); const c = canon(star ? w.slice(0, -1) : w);
  return { w: c, prefix: star };
}));
const ELBOW_W = "elbow elbows kohni कोहनी";
const WRIST_W = "wrist wrists kalai कलाई";
const PAIN_W = "pain pains painful paining hurt hurts hurting ache aches aching sore soreness tender burning throbbing throbs throb dard दर्द dukh* दुख* takleef तकलीफ jalan जलन";
const NERVE_W = "numb* tingl* sunn* jhunjhuni झनझनाहट सुन्न* pins_and_needles";
const SIDE_W = "side taraf wala wale wali तरफ वाला वाले वाली ओर border edge";
const ARM_W = "elbow* forearm wrist* hand hands arm arms thumb finger fingers palm kohni kalai haath ungli angutha hatheli कोहनी कलाई हाथ उंगली अंगूठा हथेली";
// A sentence about another body part is not about this complaint.
const FOREIGN_W = "back backs backache knee* neck shoulder* hip* ankle* foot feet leg legs spine waist thigh calf chest stomach head headache jaw toe* groin tooth teeth eye* ear throat kamar ghutn* ghutna gardan kandha कमर घुटन* गर्दन कंधा पैर पेट सिर घुटने";

const RULES = [];
const rule = (field, option, groups, win, o = {}) => RULES.push({ field, option, groups: groups.map(g), win, selfNeg: false, ...o, src: groups, srcFlags: o,
  noComma: !!o.noComma, unless: o.unless ? g(o.unless) : null, block: o.block ? g(o.block) : null, blockBefore: o.blockBefore ? g(o.blockBefore) : null, ctx: o.ctx || null });
const OPT = (field, i) => Object.keys(ELBOW_PHRASES[field])[i];

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
// pattern
rule("pattern", OPT("pattern", 0), [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops never_stop nonstop non_stop din_bhar har_waqt har_samay हर_समय हर_वक्त lagatar लगातार din_raat दिन_रात"], 5,
  { selfNeg: true, noComma: true, block: "after when while during from if only jab जब" });
rule("pattern", OPT("pattern", 0), ["never", "away stops ends eases go goes", PAIN_W], 6, { selfNeg: true });
rule("pattern", OPT("pattern", 1), ["sometimes occasionally some_days on_some_days kabhi_kabhi कभी_कभी at_times now_and_then", PAIN_W], 6);
rule("pattern", OPT("pattern", 2), ["morning subah सुबह wake* uthte uthne", "worse worst most mostly stiff* zyada ज्यादा akdan akad* अकड* first"], 6, { ctx: "pain", reliefKills: true });
rule("pattern", OPT("pattern", 2), ["out_of_bed get_up getting_up", "first most worst worse mostly"], 8, { ctx: "pain", reliefKills: true });
rule("pattern", OPT("pattern", 2), ["morning mornings subah सुबह", PAIN_W], 4, { reliefKills: true, block: "only when while if type" });
rule("pattern", OPT("pattern", 3), ["night raat रात", "worse worst more zyada ज्यादा badh bad"], 5, { ctx: "pain", reliefKills: true });
// "wakes me at night" is night pain, but "hurts most when I wake up" is morning pain
rule("pattern", OPT("pattern", 3), ["wakes_me woke_me waking_me wake_me wake_up_at wake_up_in wake_up_during jag jaag जाग* disturb* neend नींद sleep", PAIN_W], 8, { reliefKills: true, unless: "morning mornings subah सुबह first_thing out_of_bed get_up" });
rule("pattern", OPT("pattern", 2), ["wake_up waking_up woke_up उठते उठने", PAIN_W], 5, { reliefKills: true, unless: "night raat रात at_night" });
rule("pattern", OPT("pattern", 3), ["night raat रात", PAIN_W], 4, { reliefKills: true });
rule("pattern", OPT("pattern", 4), ["only sirf सिर्फ", "use* using work* activity play* kaam काम move* moving hilna", PAIN_W], 8);
rule("pattern", OPT("pattern", 4), ["kaam काम", "dauran दौरान waqt वक्त samay समय", PAIN_W], 7);
rule("pattern", OPT("pattern", 5), ["better improves improve* eases settles aaram आराम राहत loosen* warm*", "day din दिन moving move* movement activity hours hilna चलने हिलने"], 6, { ctx: "painOrArm" });
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

function patMatchAt(tokens, i, alt) {
  if (i + alt.length > tokens.length) return false;
  for (let j = 0; j < alt.length; j++) {
    const t = tokens[i + j], p = alt[j];
    if (p.prefix ? !t.startsWith(p.w) : t !== p.w) return false;
  }
  return true;
}
// Every place a group occurs: [{s, e}]
function groupHits(tokens, group) {
  const hits = [];
  for (let i = 0; i < tokens.length; i++) for (const alt of group) if (patMatchAt(tokens, i, alt)) hits.push({ s: i, e: i + alt.length });
  return hits;
}
const anyWord = (tokens, group) => groupHits(tokens, group).length > 0;
const FOREIGN = g(FOREIGN_W), PAIN = g(PAIN_W), ARM = g(ARM_W);
const OTHERS = g("friend friends colleague colleagues neighbour neighbor dost");

// Smallest span that holds one hit from every group without overlapping hits.
function bestSpan(hitLists, win) {
  let best = null;
  const pick = (gi, chosen) => {
    if (gi === hitLists.length) {
      const s = Math.min(...chosen.map((h) => h.s)), e = Math.max(...chosen.map((h) => h.e));
      if (e - s <= win && (!best || e - s < best.e - best.s)) best = { s, e };
      return;
    }
    for (const h of hitLists[gi]) {
      if (chosen.some((c) => h.s < c.e && c.s < h.e)) continue;
      pick(gi + 1, [...chosen, h]);
    }
  };
  pick(0, []);
  return best;
}

// For the review sheet: each rule in words (original word lists, not the compiled form).
export function describeRules() {
  return RULES.map((r) => ({ field: r.field, option: r.option, groups: r.src, window: r.win, flags: r.srcFlags }));
}
export const RULE_COUNT = RULES.length;

const RULE_CHUNK = 80;
const RULE_MAX_TOKENS = 400; // a real note is a few dozen words; a huge paste must not slow the screen
function understandByRules(allTokens, allCommaBefore, fields) {
  const tokens = allTokens.slice(0, RULE_MAX_TOKENS), commaBefore = allCommaBefore.slice(0, RULE_MAX_TOKENS);
  if (tokens.length <= RULE_CHUNK) return understandByRulesChunk(tokens, commaBefore, fields);
  const seen = new Set(); const out = [];
  for (let s = 0; s < tokens.length; s += RULE_CHUNK / 2) {
    const part = tokens.slice(s, s + RULE_CHUNK);
    for (const r of understandByRulesChunk(part, commaBefore.slice(s, s + RULE_CHUNK), fields)) {
      const key = r.field + "|" + r.option; if (!seen.has(key)) { seen.add(key); out.push(r); }
    }
    if (s + RULE_CHUNK >= tokens.length) break;
  }
  return out;
}
function understandByRulesChunk(tokens, commaBefore, fields) {
  if (!RULES.length) return [];
  const out = [];
  const wordsBefore = (idx, n) => {
    const w = []; let i = idx - 1;
    if (idx < tokens.length && commaBefore[idx]) return w;
    while (i >= 0 && w.length < n) { w.push(tokens[i]); if (commaBefore[i]) break; i--; }
    return w;
  };
  const wordsAfter = (idx, n) => { const w = []; for (let i = idx; i < tokens.length && w.length < n; i++) { if (commaBefore[i]) break; w.push(tokens[i]); } return w; };
  const hasPain = anyWord(tokens, PAIN), hasArm = anyWord(tokens, ARM);
  for (const r of RULES) {
    if (!fields.has(r.field)) continue;
    if (r.ctx === "pain" && !hasPain) continue;
    if (r.ctx === "painOrArm" && !hasPain && !hasArm) continue;
    if (r.unless && anyWord(tokens, r.unless)) continue;
    const lists = r.groups.map((grp) => groupHits(tokens, grp));
    if (lists.some((l) => !l.length)) continue;
    const span = bestSpan(lists, r.win);
    if (!span) continue;
    const inside = tokens.slice(span.s, span.e);
    if (r.noComma && commaBefore.slice(span.s + 1, span.e).some(Boolean)) continue;
    if (r.block && groupHits(inside, r.block).length) continue;
    if (r.blockBefore && groupHits(wordsBefore(span.s, 3), r.blockBefore).length) continue;
    if (!r.selfNeg) {
      if (inside.some((t) => NEGATORS.has(t))) continue;
      if (wordsBefore(span.s, 4).some((t) => NEGATORS.has(t))) continue;
      if (wordsAfter(span.e, 3).some((t) => NEGATORS_AFTER.has(t))) continue;
    }
    if (r.reliefKills && (inside.some((t) => RELIEF.has(t)) || wordsBefore(span.s, 5).some((t) => RELIEF.has(t)))) continue;
    out.push({ field: r.field, option: r.option, phrase: "rule" });
  }
  return out;
}

function matchesAt(tokens, start, phraseTokens) {
  if (start + phraseTokens.length > tokens.length) return false;
  for (let i = 0; i < phraseTokens.length; i++) if (tokens[start + i] !== phraseTokens[i]) return false;
  return true;
}

// Splits canonical text into words plus, for each word, whether a comma sits just before it.
function wordsAndCommas(tokens) {
  const words = []; const commaBefore = [];
  let pendingComma = false;
  for (const t of tokens) {
    if (t === ",") { pendingComma = true; continue; }
    words.push(t); commaBefore.push(pendingComma); pendingComma = false;
  }
  return { words, commaBefore };
}

function understandClause(rawTokens, fields, { bareAllowed }) {
  const { words: tokens, commaBefore } = wordsAndCommas(rawTokens);
  // "my back hurts when I lift", "neck pain is worse at night": about another body part, no arm word -> not ours.
  if (anyWord(tokens, FOREIGN) && !anyWord(tokens, ARM)) return [];
  if (anyWord(tokens, OTHERS)) return []; // "my friend has tennis elbow"
  const claimed = new Array(tokens.length).fill(false);
  const found = [];
  for (const c of COMPILED) {
    if (!fields.has(c.field)) continue;
    if (c.bare && !bareAllowed) continue;
    for (let s = 0; s + c.tokens.length <= tokens.length; s++) {
      if (!matchesAt(tokens, s, c.tokens)) continue;
      const e = s + c.tokens.length;
      if (claimed.slice(s, e).some(Boolean)) continue;
      for (let i = s; i < e; i++) claimed[i] = true;
      found.push({ c, s, e });
    }
  }
  found.sort((a, b) => a.s - b.s);

  // The words just before a match, never reaching back across a comma.
  const wordsBefore = (idx, n) => {
    const out = []; let i = idx - 1;
    if (idx < tokens.length && commaBefore[idx]) return out;
    while (i >= 0 && out.length < n) { out.push(tokens[i]); if (commaBefore[i]) break; i--; }
    return out;
  };
  // The words just after a match, never reaching forward across a comma.
  const wordsAfter = (idx, n) => {
    const out = [];
    for (let i = idx; i < tokens.length && out.length < n; i++) { if (commaBefore[i]) break; out.push(tokens[i]); }
    return out;
  };
  const results = [];
  let prev = null;
  for (const f of found) {
    let negated = false;
    if (!f.c.selfNegating) {
      negated = wordsBefore(f.s, 4).some((t) => NEGATORS.has(t));
      if (!negated) negated = wordsAfter(f.e, 3).some((t) => NEGATORS_AFTER.has(t));
      // "no tennis or badminton" / "no tennis, badminton": the "no" reaches the next item of the list
      if (!negated && prev && prev.negated && f.s > 0) {
        const viaWord = CONNECTORS.has(tokens[f.s - 1]) && prev.e <= f.s - 1;
        const viaComma = commaBefore[f.s] && prev.e === f.s;
        if (viaWord || viaComma) negated = true;
      }
    }
    // "better with gripping" is relief, not something that makes it worse
    if (!negated && f.c.field === "aggravating" && wordsBefore(f.s, 5).some((t) => RELIEF.has(t))) negated = true;
    results.push({ ...f, negated });
    prev = results[results.length - 1];
  }
  const fromPhrases = results.filter((r) => !r.negated);
  const fromRules = understandByRules(tokens, commaBefore, fields)
    .map((x) => ({ c: { field: x.field, option: x.option, key: x.phrase } }));
  return [...fromPhrases, ...fromRules];
}

function runUnderstanding(text, fields, bareAllowed) {
  const tokens = canon(text).split(" ").filter(Boolean);
  const clauses = []; let cur = [];
  for (const t of tokens) { if (CLAUSE_BREAKS.has(t)) { if (cur.length) clauses.push(cur); cur = []; } else cur.push(t); }
  if (cur.length) clauses.push(cur);
  const seen = new Set(); const suggestions = [];
  for (const clause of clauses) {
    for (const r of understandClause(clause, fields, { bareAllowed })) {
      const k = r.c.field + "|" + r.c.option;
      if (seen.has(k)) continue;
      seen.add(k);
      suggestions.push({ field: r.c.field, option: r.c.option, phrase: r.c.key });
    }
  }
  // "None" means no nerve symptoms at all -- never suggest it next to a symptom.
  const hasNeuroSymptom = suggestions.some((s) => s.field === "neuro" && s.option !== "None");
  const hasRedFlag = suggestions.some((s) => s.field === "redFlags" && s.option !== "None of the above");
  const clean = suggestions.filter((s) => !(s.field === "neuro" && s.option === "None" && hasNeuroSymptom)
    && !(s.field === "redFlags" && s.option === "None of the above" && hasRedFlag));
  const byField = {};
  for (const s of clean) (byField[s.field] ||= []).push(s.option);
  const ambiguous = Object.keys(byField).filter((f) => SINGLE_CHOICE_FIELDS.has(f) && byField[f].length > 1);
  return { suggestions: clean, byField, ambiguous };
}

// The student typed into ONE question's own box: bare words count.
export function understandField(fieldId, text) {
  if (!ELBOW_PHRASES[fieldId]) return { suggestions: [], byField: {}, ambiguous: [] };
  return runUnderstanding(text, new Set([fieldId]), true);
}

// The student wrote a free story: only phrases that carry their own context count.
export function understandStory(text) {
  return runUnderstanding(text, new Set(ELBOW_FIELDS), false);
}
