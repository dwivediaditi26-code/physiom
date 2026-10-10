// ankleFootPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about an ANKLE / FOOT complaint in everyday words (English, Hinglish, Hindi in
// Devanagari) and suggests which of the Subjective checklist options it means. No AI, no network, no cost.
// It only SUGGESTS; the student taps to confirm. The matching engine is in phraseEngine.js.
//
// Covers the 7 Ankle / Foot questions that change the AI Objective Assessment ranking (location, radiation,
// mechanism, aggravating, 24-hour pattern, swelling, red flags). The option strings must match the form exactly
// (a test checks this). Ankle/Foot has its OWN 24-hour-pattern answers (not the standard six).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { extendPhrases } from "./phrasePattern.js";

const ANKLE_FOOT_BASE = {
  location: {
    "Lateral ankle ligaments": [
      "outer ankle", "lateral ankle", "outside of the ankle", "outside of my ankle", "atfl", "outer side of my ankle", "outer side of the ankle",
      "pain below the outer ankle bone", "lateral ankle ligament", "pain on the outside of the ankle",
      "takhne ke bahar ki taraf dard", "takhne ke bahari hisse me dard", "takhne ke bahar dard", "takhne ke bahar wali taraf",
      "टखने के बाहर की तरफ दर्द", "टखने के बाहरी हिस्से में दर्द", "टखने के बाहर दर्द", "टखने के बाहर वाली तरफ",
    ],
    "Medial ankle ligaments": [
      "inner ankle", "medial ankle", "inside of the ankle", "inside of my ankle", "deltoid ligament", "inner side of my ankle", "inner side of the ankle",
      "pain below the inner ankle bone", "medial ankle ligament", "pain on the inside of the ankle",
      "takhne ke andar ki taraf dard", "takhne ke andruni hisse me dard", "takhne ke andar dard", "takhne ke andar wali taraf",
      "टखने के अंदर की तरफ दर्द", "टखने के अंदरूनी हिस्से में दर्द", "टखने के अंदर दर्द", "टखने के अंदर वाली तरफ",
    ],
    "Anterior ankle": [
      "front of the ankle", "front of my ankle", "anterior ankle", "pain at the front of the ankle when squatting", "pain in the front of the ankle",
      "pinching at the front of the ankle", "ankle pain at the front", "front of ankle joint",
      "takhne ke aage dard", "takhne ke samne dard", "takhne ke aage ki taraf", "takhne ke samne wale hisse me dard",
      "टखने के आगे दर्द", "टखने के सामने दर्द", "टखने के आगे की तरफ", "टखने के सामने वाले हिस्से में दर्द",
    ],
    "Posterior ankle": [
      "back of the ankle", "back of my ankle", "posterior ankle", "behind the ankle", "behind the ankle bone", "pain at the back of the ankle",
      "deep at the back of the ankle", "pain behind my ankle", "back of ankle joint",
      "takhne ke peeche dard", "takhne ke piche ki taraf", "takhne ke pichhe wale hisse me dard", "takhne ke peeche gehra dard",
      "टखने के पीछे दर्द", "टखने के पीछे की तरफ", "टखने के पिछले हिस्से में दर्द", "टखने के पीछे गहरा दर्द",
    ],
    "Achilles tendon — insertional": [
      "achilles at the heel", "where the achilles meets the heel", "back of the heel", "back of my heel", "heel bone at the back", "insertional achilles",
      "achilles insertion", "achilles pain at the heel bone", "pain where the achilles attaches", "achilles attachment pain",
      "edi ke peeche dard", "edi ke peeche jaha nas judi hai", "achilles ka heel se judne wala hissa", "edi ki haddi ke peeche dard", "edi ke peeche ki nas me dard",
      "एड़ी के पीछे दर्द", "एड़ी के पीछे जहां नस जुड़ी है", "अकिलीज का एड़ी से जुड़ने वाला हिस्सा", "एड़ी की हड्डी के पीछे दर्द", "एड़ी के पीछे की नस में दर्द",
    ],
    "Achilles tendon — mid-portion": [
      "mid achilles", "middle of the achilles", "achilles 4 cm above the heel", "thickened achilles", "midportion achilles", "mid portion of the achilles",
      "pain in the middle of the achilles tendon", "achilles above the heel", "lump in the middle of the achilles", "5 cm above the heel", "4 cm above the heel", "few cm above the heel",
      "achilles ke beech me dard", "achilles ke beech wale hisse me dard", "achilles ke beech ki nas me dard", "edi se upar achilles me dard",
      "अकिलीज के बीच में दर्द", "अकिलीज के बीच वाले हिस्से में दर्द", "अकिलीज की बीच की नस में दर्द", "एड़ी से ऊपर अकिलीज में दर्द",
    ],
    "Plantar heel / arch": [
      "~heel", "heel pain", "pain in the heel", "plantar fasciitis", "bottom of the heel", "underneath the heel", "arch pain", "pain in the arch of the foot",
      "sole of the heel", "heel spur", "base of the heel", "bottom of my heel", "pain under the heel", "pain in my arch",
      "edi me dard", "edi ke niche dard", "talwe me dard", "arch me dard", "edi ke neeche chubhne wala dard",
      "एड़ी में दर्द", "एड़ी के नीचे दर्द", "तलवे में दर्द", "आर्च में दर्द", "एड़ी के नीचे चुभने वाला दर्द",
    ],
    "1st big toe joint": [
      "big toe joint", "base of the big toe", "bunion", "gout in the big toe", "first mtp joint", "hallux", "big toe pain", "pain in my big toe",
      "pain at the base of my big toe",
      "pair ke angutha ka jod", "angutha ke jod me dard", "pair ke angutha me dard", "angutha ki jad me dard", "pair ke bade angutha me dard",
      "पैर के अंगूठे का जोड़", "अंगूठे के जोड़ में दर्द", "पैर के अंगूठे में दर्द", "अंगूठे की जड़ में दर्द", "पैर के बड़े अंगूठे में दर्द",
    ],
    "Forefoot / metatarsals": [
      "ball of the foot", "ball of my foot", "forefoot", "metatarsal", "metatarsals", "metatarsalgia", "under the ball of my foot", "pain under the forefoot",
      "front of the foot sole", "pain in the ball of the foot",
      "pair ke aage ke hisse me dard", "pair ke panje me dard", "panje ke niche dard", "pair ke aage wale hisse me dard", "panje ki haddiyon me dard",
      "पैर के आगे के हिस्से में दर्द", "पैर के पंजे में दर्द", "पंजे के नीचे दर्द", "पैर के आगे वाले हिस्से में दर्द", "पंजे की हड्डियों में दर्द",
    ],
    "Between the toes": [
      "between the toes", "between my toes", "web space", "mortons neuroma", "morton's neuroma", "pain between the third and fourth toes",
      "pain in the toe web", "between the toes sharp pain",
      "ungliyon ke beech me dard", "pair ki ungliyon ke beech dard", "ungliyon ke beech chubhne wala dard", "do ungliyon ke beech dard",
      "उंगलियों के बीच में दर्द", "पैर की उंगलियों के बीच दर्द", "उंगलियों के बीच चुभने वाला दर्द", "दो उंगलियों के बीच दर्द",
    ],
    "Top of the foot": [
      "top of the foot", "top of my foot", "dorsum of the foot", "dorsal foot", "pain on the top of my foot", "pain on top of the foot", "upper foot pain",
      "pain on the upper part of the foot",
      "pair ke upar dard", "pair ke upri hisse me dard", "pair ke upar wale hisse me dard", "pair ki upri sataah par dard",
      "पैर के ऊपर दर्द", "पैर के ऊपरी हिस्से में दर्द", "पैर के ऊपर वाले हिस्से में दर्द", "पैर की ऊपरी सतह पर दर्द",
    ],
    "Shin": [
      "shin pain", "shin splints", "front of the shin", "pain along the shin", "shinbone", "tibia pain", "pain in my shin", "shin hurts",
      "pain on the inner edge of the shin",
      "shin ki haddi me dard", "pindli ki haddi me dard", "pindli ki haddi ke aage dard", "shin me dard", "tang ki aage ki haddi me dard",
      "शिन में दर्द", "पिंडली की हड्डी में दर्द", "पिंडली की हड्डी के आगे दर्द", "टांग के आगे की हड्डी में दर्द", "शिन स्प्लिंट्स",
    ],
  },

  radiation: {
    "No radiation": [
      "no radiation", "does not radiate", "doesnt radiate", "not radiating", "does not spread", "doesnt spread",
      "stays in one place", "stays at one spot", "localised pain", "localized pain", "pain stays only at the ankle", "pain stays only in the foot",
      "dard fail nahi", "dard aage nahi jata", "dard ek hi jagah rehta hai", "ek hi jagah dard", "dard pair tak hi rehta hai",
      "दर्द फैलता नहीं", "दर्द आगे नहीं जाता", "दर्द एक ही जगह रहता है", "दर्द पैर तक ही रहता है",
    ],
    "Referred from the lower back": [
      "pain from the lower back", "back pain going down to the foot", "sciatica", "pain radiating from the back to the foot", "referred from the back",
      "lower back pain with pain down the leg to the foot", "pain from my back down to my foot", "back pain and then foot pain",
      "kamar se pair tak dard", "kamar se utarta dard", "kamar ka dard pair tak jata hai", "kamar se pair tak jata hua dard", "sciatica ka dard",
      "कमर से पैर तक दर्द", "कमर से उतरता दर्द", "कमर का दर्द पैर तक जाता है", "कमर से पैर तक जाता हुआ दर्द", "साइटिका का दर्द",
    ],
    "Tarsal tunnel — burning into the sole/toes (posterior tibial nerve)": [
      "burning into the sole", "burning sensation along the inner ankle into the sole", "tarsal tunnel", "burning in the sole and toes", "tibial nerve",
      "pins and needles in the sole of the foot", "burning from the inner ankle to the toes", "burning along the inside of the ankle into the foot",
      "talwe me jalan", "takhne ke andar se talwe tak jalan", "talwe aur ungliyon me jalan", "takhne se talwe tak jalan", "talwe me jhunjhuni",
      "तलवे में जलन", "टखने के अंदर से तलवे तक जलन", "तलवे और उंगलियों में जलन", "टखने से तलवे तक जलन", "तलवे में झनझनाहट",
    ],
    "Burning between the toes": [
      "burning between the toes", "burning between toes", "numbness between the toes", "mortons burning", "burning in the toe web", "tingling between the toes",
      "burning pain between my toes",
      "ungliyon ke beech jalan", "pair ki ungliyon ke beech jalan", "ungliyon ke beech sunnpan", "ungliyon ke beech jhunjhuni",
      "उंगलियों के बीच जलन", "पैर की उंगलियों के बीच जलन", "उंगलियों के बीच सुन्नपन", "उंगलियों के बीच झनझनाहट",
    ],
    "Into the sole of the foot": [
      "pain into the sole of the foot", "pain goes into the sole", "radiates to the sole", "shooting into the sole", "pain travels to the sole",
      "pain spreading into the sole", "pain down into the sole of my foot",
      "talwe tak dard jata hai", "dard talwe tak", "dard talwe me fail jata hai", "talwe tak shooting dard",
      "तलवे तक दर्द जाता है", "दर्द तलवे तक", "दर्द तलवे में फैल जाता है", "तलवे तक शूटिंग दर्द",
    ],
  },

  mechanism: {
    "Insidious onset / overuse": [
      "overuse", "over use", "no injury", "no specific injury", "no particular injury", "no trauma", "started on its own",
      "started by itself", "came on slowly", "gradually started", "slowly started", "gradual onset", "no known cause",
      "dont know how it started", "too much running", "too much walking", "overtraining", "pain came out of nowhere",
      "started out of nowhere", "started for no reason", "no apparent cause", "no obvious cause", "slowly building", "no accident",
      "no fall", "creeping onset", "slow onset", "insidious onset", "insidious", "on my feet all day",
      "bina chot ke", "apne aap shuru hua", "dheere dheere shuru hua", "kaaran pata nahi", "zyada chalne se", "zyada daudne se", "zyada daudne ki wajah se", "zyada chalne ki wajah se", "bahut daudne se", "koi chot nahi lagi",
      "chot nahi lagi thi", "apne aap dard hua", "bina kisi wajah ke", "din bhar khade rehne se",
      "बिना चोट के", "अपने आप शुरू हुआ", "धीरे धीरे शुरू हुआ", "कारण पता नहीं", "ज्यादा चलने से", "ज्यादा दौड़ने से", "ज्यादा दौड़ने की वजह से", "ज्यादा चलने की वजह से", "कोई चोट नहीं लगी",
      "चोट नहीं लगी थी", "अपने आप दर्द हुआ", "बिना किसी वजह के", "दिन भर खड़े रहने से",
    ],
    "Inversion sprain (rolled inward)": [
      "rolled my ankle", "rolled it inwards", "rolled inward", "inversion sprain", "turned my ankle", "twisted my ankle", "ankle rolled in", "ankle went over",
      "rolled on the outside of the foot", "went over on my ankle", "ankle went over", "went over on it", "went over on my foot", "sprained my ankle", "sprained ankle", "ankle sprain", "rolled my ankle inwards", "foot turned inwards",
      "takhna mud gaya", "takhne me moch", "paer andar ki taraf mud gaya", "takhna andar ki taraf mud gaya", "pair mud gaya aur takhne me moch aayi",
      "टखना मुड़ गया", "टखने में मोच", "पैर अंदर की तरफ मुड़ गया", "टखना अंदर की तरफ मुड़ गया", "पैर मुड़ गया और टखने में मोच आई",
    ],
    "Eversion sprain (rolled outward)": [
      "rolled outward", "rolled my ankle outwards", "eversion sprain", "everted", "ankle rolled out", "rolled it outwards", "foot turned outwards and the ankle twisted",
      "ankle rolled to the outside", "ankle went outwards", "rolled outwards",
      "paer bahar ki taraf mud gaya", "takhna bahar ki taraf mud gaya", "pair bahar mud gaya", "takhna bahar ki taraf lud gaya",
      "पैर बाहर की तरफ मुड़ गया", "टखना बाहर की तरफ मुड़ गया", "पैर बाहर मुड़ गया", "टखना बाहर की तरफ लुढ़क गया",
    ],
    "High ankle sprain (syndesmosis)": [
      "high ankle sprain", "syndesmosis", "twisted with the foot turned out and planted", "pain above the ankle joint after a twist",
      "tackled foot planted and leg rotated", "ankle sprain above the ankle", "syndesmotic injury", "high sprain",
      "ankle ke upar moch", "takhne ke upar moch", "takhne ke upar ki nas me moch", "high ankle moch",
      "टखने के ऊपर मोच", "टखने के ऊपर की नस में मोच", "हाई एंकल मोच", "टखने के ऊपर चोट",
    ],
    "Direct impact": [
      "kicked on the ankle", "hit on the foot", "something fell on my foot", "dropped a weight on my foot", "stamped on", "hit by a ball on the shin",
      "kicked on the shin", "direct blow", "direct impact", "got kicked", "accident", "stepped on my foot", "someone stepped on my foot",
      "pair par kuch gir gaya", "pair par chot", "pair par laat lagi", "pair par bhaari cheez gir gayi", "shin par laat lagi", "accident me chot",
      "पैर पर कुछ गिर गया", "पैर पर चोट", "पैर पर लात लगी", "पैर पर भारी चीज गिर गई", "शिन पर लात लगी", "एक्सीडेंट में चोट",
    ],
    "Fall from height": [
      "fall from height", "fell from a height", "fell from a ladder", "jumped from the roof", "fell from the second floor", "fell off a wall",
      "fell off the roof", "fell down from a height", "fell from a tree",
      "unchai se gir", "seedhi se gir kar", "chat se gir", "uncha se gir gaya", "deewar se gir gaya",
      "ऊंचाई से गिर", "सीढ़ी से गिर कर", "छत से गिर", "ऊंचे से गिर गया", "दीवार से गिर गया",
    ],
    "Landing from a jump": [
      "landing from a jump", "landed from a jump", "bad landing", "jumped and landed on the foot", "landed on someones foot", "basketball landing",
      "landed awkwardly", "landed badly", "came down awkwardly", "landed on the side of my foot", "landed on the outside of my foot",
      "kood kar utarte waqt", "kood ke utarte hue", "jump ke baad landing", "kood kar ek pair par utara", "kood kar pair mud gaya",
      "कूदकर उतरते समय", "कूद कर उतरते हुए", "जंप के बाद लैंडिंग", "कूद कर एक पैर पर उतरा", "कूद कर पैर मुड़ गया",
    ],
    "Change in footwear / surface": [
      "new shoes", "changed my shoes", "started wearing heels", "running on a hard surface", "switched to a concrete track", "new running shoes",
      "different surface", "flat shoes after heels", "new sandals", "new boots", "changed to a different surface", "started running on tarmac", "flip flops", "wearing flip flops", "flipflops", "wearing flats", "flat shoes", "new insoles", "changed my insoles", "minimalist shoes", "barefoot shoes",
      "naye joote", "naye chappal", "joote badle", "sakht zameen par daud", "heels pehenna shuru kiya", "naye shoes pehne", "naye joote pehne ke baad",
      "नए जूते", "नई चप्पल", "जूते बदले", "सख्त जमीन पर दौड़", "हील पहनना शुरू किया", "नए शूज़ पहने", "नए जूते पहनने के बाद",
    ],
    "Sudden increase in training": [
      "increased my training", "suddenly started running more", "doubled my mileage", "marathon training ramped up", "started jogging every day", "too much too soon",
      "sudden increase in running", "ramped up my training", "increased my running", "increased my distance", "sudden increase in training", "started running a lot", "couch to 5k", "couch to 10k", "started a running programme", "started a running program", "started training for a marathon", "started running again",
      "gym me achanak zyada", "achanak daudna shuru kiya", "training achanak badha di", "achanak zyada daudne laga", "roz jogging shuru ki",
      "जिम में अचानक ज्यादा", "अचानक दौड़ना शुरू किया", "ट्रेनिंग अचानक बढ़ा दी", "अचानक ज्यादा दौड़ने लगा", "रोज जॉगिंग शुरू की",
    ],
  },

  aggravating: {
    "First steps in the morning": [
      "first steps in the morning", "first few steps out of bed", "first step when i get up", "pain when i take the first steps", "morning first step",
      "first steps after sitting", "pain on the first step after rest", "worst with the first steps", "first steps are the worst",
      "subah pehle kadam par dard", "uthte hi pehle kadam par dard", "subah uthte hi paer rakhte dard", "pehle kadam par sabse zyada dard", "bistar se uthte hi dard",
      "सुबह पहले कदम पर दर्द", "उठते ही पहले कदम पर दर्द", "सुबह उठते ही पैर रखते दर्द", "पहले कदम पर सबसे ज्यादा दर्द", "बिस्तर से उठते ही दर्द",
    ],
    "Walking / running": [
      "~walking", "~running", "pain when running", "pain when walking", "worse with walking", "after a long walk", "jogging hurts", "walking hurts",
      "running makes it worse", "hurts to walk", "hurts to run", "pain on walking", "pain on running",
      "chalne me dard", "daudne me dard", "chalte waqt dard", "daudte waqt dard", "jogging karne se dard", "lamba chalne ke baad dard",
      "चलने में दर्द", "दौड़ने में दर्द", "चलते समय दर्द", "दौड़ते समय दर्द", "जॉगिंग करने से दर्द", "लंबा चलने के बाद दर्द",
    ],
    "Downhill running": [
      "downhill running", "running downhill", "going downhill", "walking downhill", "descending a slope", "pain on downhill", "downhill hurts",
      "pain coming down a hill", "worse going down a slope",
      "dhalan par daudne me dard", "utaar par daudne me dard", "dhalan utarte waqt dard", "pahaad se utarte waqt dard", "dhalan par chalne me dard",
      "ढलान पर दौड़ने में दर्द", "उतार पर दौड़ने में दर्द", "ढलान उतरते समय दर्द", "पहाड़ से उतरते समय दर्द", "ढलान पर चलने में दर्द",
    ],
    "Dorsiflexion (e.g. squatting, stairs down)": [
      "~squatting", "~dorsiflexion", "pain when i squat", "stairs down", "knee over toes", "pain when i crouch", "lunging forward over the foot", "pain kneeling",
      "pain squatting down", "pain bending the ankle up", "hurts when i squat", "pain going downstairs",
      "ukdu baithne me dard", "ukdu baithte waqt dard", "panjon ke bal baithne me dard", "seedhiyan utarte waqt takhne me dard", "ghutna aage karne par takhne me dard",
      "उकड़ू बैठने में दर्द", "उकड़ू बैठते समय दर्द", "पंजों के बल बैठने में दर्द", "सीढ़ियां उतरते समय टखने में दर्द", "घुटना आगे करने पर टखने में दर्द",
    ],
    "Stairs": [
      "~stairs", "climbing stairs", "pain on stairs", "pain going upstairs", "pain going up stairs", "stairs hurt", "pain when i climb the stairs", "stairs make it worse",
      "seedhiyan chadhte waqt dard", "seedhiyon par dard", "seedhiyan chadhna mushkil", "seedhiyan chadhte waqt pair me dard",
      "सीढ़ियां चढ़ते समय दर्द", "सीढ़ियों पर दर्द", "सीढ़ियां चढ़ना मुश्किल", "सीढ़ियां चढ़ते समय पैर में दर्द",
    ],
    "Barefoot on a hard floor": [
      "barefoot on a hard floor", "walking barefoot", "without shoes on the floor", "walking on tiles barefoot", "pain walking barefoot on hard floors",
      "barefoot at home", "pain without shoes", "hard floor hurts without slippers",
      "nange pair farsh par dard", "nange pair chalne se dard", "bina chappal ke chalne se dard", "nange pair tiles par dard", "bina joote ke dard",
      "नंगे पैर फर्श पर दर्द", "नंगे पैर चलने से दर्द", "बिना चप्पल के चलने से दर्द", "नंगे पैर टाइल्स पर दर्द", "बिना जूते के दर्द",
    ],
    "Tight / narrow footwear": [
      "tight shoes", "narrow shoes", "pointed shoes", "heels hurt", "high heels hurt", "narrow toe box", "tight footwear", "shoes that squeeze",
      "pain in tight shoes", "pain wearing heels",
      "tang joote", "tang shoes", "tang jooton me dard", "heels pehenne se dard", "sandal ki strap se dard", "nukile jooton me dard",
      "तंग जूते", "तंग शूज़", "तंग जूतों में दर्द", "हील पहनने से दर्द", "सैंडल की स्ट्रैप से दर्द", "नुकीले जूतों में दर्द",
    ],
  },

  pattern: {
    "Intermittent — activity-related": [
      "intermittent pain", "pain is intermittent", "comes and goes", "on and off", "off and on", "depending on the day", "some days worse than others", "now and then", "only with activity", "activity related pain",
      "pain only when i run", "pain only after exercise", "pain after playing", "pain only when i use it", "pain with activity only",
      "kabhi kabhi dard", "kabhi hota hai kabhi nahi", "sirf kaam karne par dard", "sirf daudne par dard", "kasrat ke baad dard", "khelne ke baad dard",
      "कभी कभी दर्द", "कभी होता है कभी नहीं", "सिर्फ काम करने पर दर्द", "सिर्फ दौड़ने पर दर्द", "कसरत के बाद दर्द", "खेलने के बाद दर्द",
    ],
    "Constant — never fully eases": [
      "constant pain", "pain all the time", "pain is constant", "never goes away", "never fully eases", "always there", "pain 24 hours",
      "constant severe pain", "constant dull pain", "there all the time", "from morning till night", "morning till night", "from morning to night", "all day long", "pain never settles", "does not fully ease", "never really settles", "never really eases", "never really goes away", "it never settles",
      "hamesha dard", "lagatar dard", "din raat dard", "dard kabhi khatam nahi hota", "dard poori tarah kam nahi hota", "pura din dard rehta hai",
      "हमेशा दर्द", "लगातार दर्द", "दिन रात दर्द", "दर्द कभी खत्म नहीं होता", "दर्द पूरी तरह कम नहीं होता", "पूरा दिन दर्द रहता है",
    ],
    "Worse in morning, improves through day": [
      "worse in the morning and improves through the day", "first thing in the morning then eases", "stiff in the morning and better as i walk",
      "worse in the morning better later", "morning pain that eases during the day", "sore in the morning, loosens up as the day goes on",
      "worse when i get up and then settles", "morning stiffness that improves",
      "subah zyada phir din me theek", "subah dard zyada din me kam", "subah uthte hi dard phir chalne se aaram", "subah akdan phir din me theek ho jata hai",
      "सुबह ज्यादा फिर दिन में ठीक", "सुबह दर्द ज्यादा दिन में कम", "सुबह उठते ही दर्द फिर चलने से आराम", "सुबह अकड़न फिर दिन में ठीक हो जाता है",
    ],
    "Warms up then worsens (tendinopathy pattern)": [
      "warms up then gets worse", "warms up and then gets worse", "warms up and then worsens", "warms up and then hurts more", "better at first then worse later", "eases as i warm up then worsens afterwards", "worse after the activity",
      "settles during exercise and flares afterwards", "warms up then worsens", "starts stiff then eases then hurts after", "tendinopathy pattern",
      "feels fine then it hurts after", "feels fine then hurts after", "fine during then sore after", "fine at first then hurts", "pehle theek phir badhta hai", "garam hone ke baad theek phir exercise ke baad zyada", "shuru me aaram phir baad me dard badhta hai", "kasrat ke baad dard badh jata hai",
      "पहले ठीक फिर बढ़ता है", "गर्म होने के बाद ठीक फिर एक्सरसाइज के बाद ज्यादा", "शुरू में आराम फिर बाद में दर्द बढ़ता है", "कसरत के बाद दर्द बढ़ जाता है",
    ],
    "Night dominant (screen for serious pathology)": [
      "night dominant", "worse at night", "pain mostly at night", "night pain is the worst", "night pain", "pain at night", "wakes me at night",
      "pain wakes me up", "cannot sleep because of pain", "pain disturbs my sleep", "pain keeps me awake", "keeps me awake at night", "the pain keeps me up",
      "raat ko zyada dard", "raat me dard badh jata hai", "raat ko dard sabse zyada", "raat ko dard se neend khul jati hai", "raat ko neend nahi aati dard se",
      "रात को ज्यादा दर्द", "रात में दर्द बढ़ जाता है", "रात को दर्द सबसे ज्यादा", "रात को दर्द से नींद खुल जाती है", "रात को नींद नहीं आती दर्द से",
    ],
    "Burning / night pain": [
      "burning pain", "burning at night", "burning pain at night", "night time burning", "burning pain in the foot at night", "burning sensation in the foot",
      "feet burn at night", "burning feet", "burning pain with night pain", "burning in the sole at night",
      "raat ko jalan", "pair me jalan", "talwe me jalan raat ko", "raat ko pair jalte hain", "jalan wala dard",
      "रात को जलन", "पैर में जलन", "तलवे में जलन रात को", "रात को पैर जलते हैं", "जलन वाला दर्द",
    ],
  },

  swelling: {
    "None": [
      "~none", "~no swelling", "no swelling", "no swelling at all", "not swollen", "there is no swelling", "doesnt swell", "no puffiness",
      "koi sujan nahi", "sujan nahi hai", "bilkul sujan nahi", "sujan bilkul nahi hai", "sujan nahi aati",
      "कोई सूजन नहीं", "सूजन नहीं है", "बिल्कुल सूजन नहीं", "सूजन बिल्कुल नहीं है", "सूजन नहीं आती",
    ],
    "Mild — settles same day": [
      "mild swelling that goes down by evening", "swelling settles overnight", "slight swelling that settles the same day", "mild swelling that settles",
      "a little swelling that goes down", "swelling goes down by the next morning", "slight puffiness that settles", "mild swelling settles by evening",
      "thodi sujan jo raat tak utar jati hai", "halki sujan jo usi din theek ho jati hai", "thodi sujan jo shaam tak kam ho jati hai", "halki sujan raat tak utar jati hai",
      "थोड़ी सूजन जो रात तक उतर जाती है", "हल्की सूजन जो उसी दिन ठीक हो जाती है", "थोड़ी सूजन जो शाम तक कम हो जाती है", "हल्की सूजन रात तक उतर जाती है",
    ],
    "Moderate — persistent low-grade swelling": [
      "persistent swelling", "constantly swollen", "low grade swelling that doesnt go", "ankle always a bit puffy", "swelling stays for weeks",
      "swelling that never fully goes down", "never really goes", "never really goes down", "swelling stays all week", "swelling never goes down", "ongoing swelling", "the ankle is always swollen", "permanent swelling",
      "lagatar sujan", "sujan kam nahi hoti", "hamesha thodi sujan rehti hai", "hafton se sujan hai", "sujan utarti hi nahi",
      "लगातार सूजन", "सूजन कम नहीं होती", "हमेशा थोड़ी सूजन रहती है", "हफ्तों से सूजन है", "सूजन उतरती ही नहीं",
    ],
    "Severe / recurrent swelling after activity": [
      "severe swelling after activity", "swells up a lot after running", "recurrent swelling", "keeps swelling up after every game", "ankle balloons after sport",
      "swells up badly after exercise", "big swelling after walking", "swelling comes back every time i run", "huge swelling after activity",
      "khelne ke baad bahut sujan", "baar baar sujan", "daudne ke baad bahut sujan aa jati hai", "har baar khelne ke baad takhna phool jata hai", "kasrat ke baad bahut sujan",
      "खेलने के बाद बहुत सूजन", "बार बार सूजन", "दौड़ने के बाद बहुत सूजन आ जाती है", "हर बार खेलने के बाद टखना फूल जाता है", "कसरत के बाद बहुत सूजन",
    ],
  },

  redFlags: {
    "Ottawa rules — bony tenderness at malleolus": [
      "tender over the ankle bone", "bony tenderness at the malleolus", "pain when pressing on the ankle bone", "tender at the tip of the lateral malleolus",
      "pressing the ankle bone hurts", "tender on the bone at the back of the ankle bone", "malleolus tenderness", "bone tender to touch at the ankle",
      "takhne ki haddi dabane par dard", "takhne ki haddi par dabane se dard", "takhne ke haddi chhune par dard", "takhne ki haddi par chhune se dard hota hai",
      "टखने की हड्डी दबाने पर दर्द", "टखने की हड्डी पर दबाने से दर्द", "टखने की हड्डी छूने पर दर्द", "टखने की हड्डी पर छूने से दर्द होता है",
    ],
    "Ottawa rules — cannot weight bear 4 steps": [
      "cannot walk four steps", "unable to take 4 steps", "cant weight bear", "cant put weight on the foot", "cannot stand on it", "unable to bear weight",
      "cannot bear weight", "cant take four steps", "cannot take even a few steps", "unable to walk at all",
      "ek bhi kadam nahi chal paya", "pair par bhaar nahi daal pa raha", "chaar kadam bhi nahi chal pa raha", "pair par khada nahi ho pa raha", "bilkul chal nahi pa raha",
      "एक भी कदम नहीं चल पाया", "पैर पर भार नहीं डाल पा रहा", "चार कदम भी नहीं चल पा रहा", "पैर पर खड़ा नहीं हो पा रहा", "बिल्कुल चल नहीं पा रहा",
    ],
    "Suspected Achilles rupture (unable to rise on toes)": [
      "heard a pop at the back of the ankle", "cannot rise on my toes", "cant stand on tiptoe", "felt like i was kicked in the back of the leg",
      "achilles ruptured", "achilles snapped", "achilles rupture", "cant go up on my toes", "unable to push off",
      "ankle ke peeche pop ki awaaz", "panjon ke bal khade nahi ho pa raha", "achilles toot gaya", "achilles phat gaya", "panjon par khada nahi ho pa raha",
      "टखने के पीछे पॉप की आवाज", "पंजों के बल खड़ा नहीं हो पा रहा", "अकिलीज टूट गया", "अकिलीज फट गया", "पंजों पर खड़ा नहीं हो पा रहा",
    ],
    "Suspected complete ATFL rupture": [
      "ankle gives way completely", "ankle very unstable after a sprain", "ankle opens up", "felt it tear", "complete tear of the ligament", "ankle is floppy",
      "ligament has torn completely", "ankle feels loose and unstable", "complete ligament rupture",
      "takhna bilkul dheela", "ligament poora fat gaya", "takhna bahut kamzor aur dheela lagta hai", "takhne ka ligament toot gaya", "takhna bilkul jawab de gaya",
      "टखना बिल्कुल ढीला", "लिगामेंट पूरा फट गया", "टखना बहुत कमजोर और ढीला लगता है", "टखने का लिगामेंट टूट गया", "टखना बिल्कुल जवाब दे गया",
    ],
    "Stress fracture suspected (focal tibial tenderness)": [
      "tender spot on the shin bone", "focal tibial tenderness", "pain at one spot on the bone", "stress fracture", "can press and find one sore spot on the shin",
      "pinpoint tenderness on the shin", "one sore spot on the bone", "suspected stress fracture",
      "shin ki haddi me ek jagah dabane par dard", "stress fracture lag raha hai", "haddi par ek hi jagah dard", "pindli ki haddi par ek jagah dard",
      "शिन की हड्डी में एक जगह दबाने पर दर्द", "स्ट्रेस फ्रैक्चर लग रहा है", "हड्डी पर एक ही जगह दर्द", "पिंडली की हड्डी पर एक जगह दर्द",
    ],
    "Peroneal tendon subluxation": [
      "tendon slips over the outer ankle bone", "peroneal tendon snaps", "tendon pops over the outer ankle", "snapping behind the outer ankle",
      "peroneal tendon subluxation", "peroneal tendon slipping", "tendon flicks over the ankle bone", "clunk behind the outer ankle bone",
      "tendon phisalta hai takhne ke bahar", "takhne ke bahar nas phisalti hai", "takhne ke bahar tak ki awaaz", "takhne ke bahar ki nas uchhalti hai",
      "टेंडन फिसलता है टखने के बाहर", "टखने के बाहर नस फिसलती है", "टखने के बाहर टक की आवाज", "टखने के बाहर की नस उछलती है",
    ],
    "Acute hot swollen joint": [
      "hot swollen ankle", "ankle red hot and swollen", "joint hot and swollen with fever", "septic ankle", "acute hot swollen joint", "ankle is hot and swollen",
      "hot red swollen foot", "red hot ankle with fever",
      "takhna garam sujan laal", "takhna garam aur sujan", "takhna laal garam aur sujan bukhar ke saath", "pair garam aur sujan",
      "टखना गरम सूजन लाल", "टखना गरम और सूजन", "टखना लाल गरम और सूजन बुखार के साथ", "पैर गरम और सूजन",
    ],
    "Compartment syndrome / vascular compromise": [
      "tight swollen calf", "calf is hard and very painful", "foot is cold and pale", "foot has gone blue", "no pulse in the foot",
      "severe pain and swelling in the lower leg with numbness", "very tight lower leg", "cold white foot", "lower leg is rock hard",
      "pindli bahut kasi hui", "pair thanda aur peela", "pair neela pad gaya", "pindli bahut sakht aur dard", "pair me nabz nahi mil rahi",
      "पिंडली बहुत कसी हुई", "पैर ठंडा और पीला", "पैर नीला पड़ गया", "पिंडली बहुत सख्त और दर्द", "पैर में नब्ज नहीं मिल रही",
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

// Added from the clinician-voice "everyday words" sheet (PhysioMind-AnkleFoot-Everyday-Words-DRAFT.pdf): what a clinician types ABOUT the
// patient ("the patient", "they"), in English, Hinglish and Hindi. See ankleSheetSet.test.js.
const SHEET_PHRASES = {
  location: {
    "Lateral ankle ligaments": ["lateral ligaments", "pain over the lateral ligaments", "lateral malleolus", "behind the lateral malleolus", "outer ankle bone"],
    "1st big toe joint": ["1st mtp", "1st mtp pain", "first mtp", "1st mtp joint", "anguthe ke jod mein dard", "angutha jod mein dard", "अंगूठे के जोड़ में दर्द", "अंगूठे का जोड़ दर्द"],
    "Plantar heel / arch": ["plantar fascia pain", "plantar fascia", "plantar fasciitis", "centre of the heel", "center of the heel", "middle of the heel", "edi ke beech", "एड़ी के बीच", "bruise under the heel", "stone bruise under the heel", "under the heel", "edi ke neeche dard", "एड़ी के नीचे दर्द"],
    "Top of the foot": ["top of the middle of the foot", "middle of the foot", "midfoot", "mid foot"],
  },
  mechanism: {
    "Inversion sprain (rolled inward)": ["inversion", "inversion injury", "inversion sprain", "inversion sprains", "recurrent inversion", "repeated inversion", "inversion with the foot pointing down", "keeps rolling over", "rolling over", "ankle keeps rolling", "ankle turned in", "ankle went over"],
    "Insidious onset / overuse": ["koi chot nahi", "dheere dheere koi chot nahi", "कोई चोट नहीं", "धीरे धीरे कोई चोट नहीं", "no real injury", "no single event", "crept up slowly", "crept up over weeks", "built up slowly", "gradual onset"],
    "Sudden increase in training": ["more mileage", "increased mileage", "mileage increase", "sudden increase in training", "doubled their weekly running", "doubled the weekly running", "daud ki doori achanak badha di", "दौड़ की दूरी अचानक बढ़ा दी", "hills and speed work"],
    "Change in footwear / surface": ["change to harder surfaces", "a change to harder surfaces", "switched to a hard track", "sakht zameen par daudna shuru kiya", "सख्त ज़मीन पर दौड़ना शुरू किया"],
    "High ankle sprain (syndesmosis)": ["external rotation", "external rotation with dorsiflexion", "foot forced outwards while the ankle was bent up", "foot was forced outwards while the ankle was bent up"],
  },
  aggravating: {
    "First steps in the morning": ["first step", "first steps", "first step pain", "first few steps", "out of bed", "get out of bed", "getting out of bed", "pehla kadam", "pehle kadam", "पहला कदम", "पहले कदम"],
    "Barefoot on a hard floor": ["hard floors barefoot", "hard floor barefoot", "sakht farsh par nange pair", "सख्त फर्श पर नंगे पैर", "hard floors, barefoot"],
  },
  radiation: {
    "Tarsal tunnel — burning into the sole/toes (posterior tibial nerve)": ["sole of the foot burns", "sole burns", "burning sole", "talve mein jalan", "तलवे में जलन"],
  },
};
const mergePhrases = (base, extra) => {
  const out = { ...base };
  for (const [field, opts] of Object.entries(extra)) out[field] = extendPhrases(out[field], opts);
  return out;
};
export const ANKLE_FOOT_PHRASES = mergePhrases(ANKLE_FOOT_BASE, SHEET_PHRASES);

const { PAIN: PAIN_W } = WORDS;
// Words that say a sentence is about this region / about another one.
const OWN_W = "ankle* foot feet heel* sole arch toe* achilles shin* tibia tibial calf leg legs malleol* takhn* टखन* टखना pair पैर panje पंजे edi एड़ी एडी talwa तलवा pindli पिंडली tang टांग";
const FOREIGN_W = "shoulder* elbow* wrist* hand hands neck hip* groin chest stomach headache jaw tooth teeth eye* ear throat kandha kohni kalai gardan kulha कंधा कोहनी कलाई गर्दन कूल्हा सिर पेट ghutn* ghutna घुटन* घुटना knee knees back_pain back_aches backache pain_in_back upper_back";
const FAMILY_W = WORDS.FAMILY;

const matcher = createPhraseMatcher({
  phrases: ANKLE_FOOT_PHRASES,
  singleChoiceFields: ["pattern", "swelling"],
  noneOptions: { swelling: "None", radiation: "No radiation", redFlags: "None of the above" },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  optionGuards: {
    "redFlags|Cancer history": FAMILY_W,
    // an achilles story is not a plantar-heel story; a burning sole is the nerve answer, not plantar pain
    "location|Plantar heel / arch": "achilles अकिलीज अकिलीस burn* jalan जलन heels ooncha uncha oonchi unchi ऊंचा ऊंची ऊँचा high_heel high_heels pehanne पहनने",
    // "nange pair chalne me dard" is the barefoot answer, not plain walking
    // "like being kicked" is a simile, not a kick
    "mechanism|Direct impact": "like as_if felt_as_if feels_like",
    "aggravating|Walking / running": "barefoot bare_foot bare_feet nange नंगे without_shoes bina_chappal bina_joote feels_fine fine_then",
    // burning at night is the "burning" answer, not plain night pain
    "pattern|Night dominant (screen for serious pathology)": "burn* jalan जलन jalte",
  },
  // a "back" or "knee" word is natural in these answers (pain from the back; a shin below the knee)
  guardExempt: ["radiation|Referred from the lower back", "location|Shin"],
  hinglish: [
    [/\b(takhna|takhne|takhno|takhnon|takhana|takhane|takhnaa)\b/g, "takhna"],
    [/\b(edi|eedi|adi|ediyan|ediyon|edhi|edii)\b/g, "edi"],
    [/\b(talwa|talwe|talwo|talve|talwon|talwa)\b/g, "talwa"],
    [/\b(paer|pair|pao|pav|panv|paon|pairon|pairo)\b/g, "pair"],
    [/\b(panje|panja|panjon|panjo)\b/g, "panje"],
    [/\b(pindli|pindliyan|pindliyon|pindali|pindly)\b/g, "pindli"],
    [/\b(moch|mochh|moach)\b/g, "moch"],
    [/\b(mud|mudd)\b/g, "mod"],
    [/\b(chalne|chalna|chalte|chalta|chalti)\b/g, "chalna"],
    [/\b(daudne|daudna|daudte|daudta|daudti|dauda)\b/g, "daudna"],
    [/\b(seedhiyan|seedhiyon|sidhiyan|sidhiyon|seedhiya|sidhiya|seedhiye)\b/g, "seedhiyan"],
    [/\b(kadam|qadam|kadmon|kadme)\b/g, "kadam"],
    [/\b(ukdu|ukdoo|ukru|ukdun)\b/g, "ukdu"],
    [/\b(jalan|jalne|jalte|jalta|jalti)\b/g, "jalan"],
    [/\b(joota|joote|jooton|jute|jootey)\b/g, "joote"],
    [/\b(chappal|chappals|chapal|chappalein)\b/g, "chappal"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche)\b/g, "niche"],
    [/\b(peeche|piche|pichhe|peechhe|pichche|pichle|pichla)\b/g, "peeche"],
    [/\b(raat|raath|rat)\b/g, "raat"],
    [/\b(achanak|acchanak)\b/g, "achanak"],
    [/\b(gaanth|ganth|gaath|gant)\b/g, "gaanth"],
    [/\b(dhalan|dhalaan|dhaalan)\b/g, "dhalan"],
    [/\b(kasa|kasi|kasna|kasne)\b/g, "kasa"],
    [/\b(angutha|anguthe|angoothe|angootha|anguthon)\b/g, "angutha"],
    // "takhna andar ki taraf mud gaya" = rolled inward; "pair bahar ki taraf mud gaya" = turned outward. Not pain places.
    [/\bandar ki taraf (mod|mura|mudi|mude|mudna|modna)\b(?! par\b)/g, "inwardroll"],
    [/\bbahar ki taraf (mod|mura|mudi|mude|mudna|modna)\b(?! par\b)/g, "outwardroll"],
  ],
  deva: [
    [/टखन(ा|े|ों|ो)?/g, "टखना"],
    [/एड(ी|ियों|ियां|िया|़ी)/g, "एडी"],
    [/तलव(ा|े|ों|ो)/g, "तलवा"],
    [/पैर(ों)?|पांव(ों)?|पाँव(ों)?/g, "पैर"],
    [/पंज(ा|े|ों|ो)/g, "पंजा"],
    [/पिंडल(ी|ियां|ियों|ि)/g, "पिंडली"],
    [/सीढ(ी|ि)(यों|यां|या)?/g, "सीढी"],
    [/उकडू|उकड़ू/g, "उकडू"],
    [/अंगूठ(ा|े|ों)/g, "अंगूठा"],
    [/जूत(े|ों|ा)/g, "जूते"],
    [/अंदर की तरफ (मुडना|मुडा|मुडी|मुडे|मुड)(?![ऀ-ॿ])(?! पर)/g, "inwardroll"],
    [/बाहर की तरफ (मुडना|मुडा|मुडी|मुडे|मुड)(?![ऀ-ॿ])(?! पर)/g, "outwardroll"],
  ],
  rules: ({ rule, O }) => {
    const ANKLEW = "ankle* takhna टखना";
    const FOOTW = "foot feet pair पैर";
    // location
    const [LATA, MEDA, ANTA, POSTA, ACHI, ACHM, PLANT, TOE1, FORE, BETW, TOP, SHIN] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => O("location", i));
    rule("location", LATA, ["outer outside lateral bahar bahari बाहर बाहरी", ANKLEW], 4, { unless: "inside inner medial front back" });
    rule("location", LATA, [ANKLEW, "outer outside lateral bahar बाहर", "side taraf तरफ"], 12, { unless: "inside inner medial front back" });
    rule("location", LATA, [ANKLEW, "on_outside on_the_outside outer_side outside_of lateral_side"], 12, { unless: "inside inner medial front back" });
    rule("location", MEDA, ["inner inside medial andruni अंदरूनी andar अंदर", ANKLEW], 6, { unless: "outside outer lateral front back mod मुड़ rolled twisted turned moch" });
    rule("location", MEDA, [ANKLEW, "inner inside medial andar अंदर", "side taraf तरफ"], 12, { unless: "outside outer lateral front back inwardroll outwardroll" });
    rule("location", ANTA, ["front anterior samne सामने aage आगे", ANKLEW], 4);
    rule("location", POSTA, ["back behind posterior peeche पीछे", ANKLEW], 4, { unless: "heel edi एडी achilles" });
    rule("location", ACHI, ["achilles अकिलीज अकिलीस", "heel edi एडी", "insertion insertional attaches attachment judi जुड़ी judne judta judti जुड़ता जुड़ती pas पास near close"], 8);
    rule("location", ACHM, ["achilles अकिलीज अकिलीस", "middle mid beech बीच midportion mid_portion"], 5);
    rule("location", ACHM, ["achilles tendon cord nas नस", "above upar ऊपर", "heel edi एडी"], 9);
    rule("location", PLANT, ["heel edi एडी arch arches talwa तलवा", "bruise bruised bruising"], 7, { unless: "back peeche पीछे behind achilles अकिलीज अकिलीस above upar ऊपर tendon" });
    rule("location", PLANT, ["heel edi एडी arch arches talwa तलवा", PAIN_W], 6, { unless: "back peeche पीछे behind achilles अकिलीज अकिलीस heels tak तक fail above upar ऊपर tendon" });
    rule("location", TOE1, ["angutha अंगूठा", "jod जोड़ jodd"], 4, { ctx: "pain" });
    rule("location", TOE1, ["big_toe bade_angutha hallux bunion pair_ka_angutha pair_ke_angutha पैर_का_अंगूठा पैर_के_अंगूठा", PAIN_W], 10);
    rule("location", FORE, ["forefoot ball_of_foot metatarsal* panje पंजा pair_ke_aage पैर_के_आगे", PAIN_W], 8, { block: "se से zor ज़ोर dhakka धक्का dhakke धक्के", blockAfter: "se से ko को zor ज़ोर dhakka धक्का dhakke धक्के" });
    rule("location", FORE, ["under beneath niche", "front_of_the_foot front_of_foot ball_of_the_foot ball_of_foot forefoot"], 5, { ctx: "pain" });
    rule("location", BETW, ["between beech बीच", "toe toes ungli उंगली उंगलियों"], 6);
    rule("location", BETW, ["toe_web web_space webspace"], 2);
    rule("location", ACHI, ["edi एडी heel", "peeche पीछे back behind", "nas नस tendon"], 6, { unless: "above upar ऊपर" });
    rule("location", TOP, ["top upper upar ऊपर ऊपरी dorsum dorsal", FOOTW], 5, { unless: "toe toes thik ठीक just_above" });
    rule("location", SHIN, ["shin shinbone tibia pindli_ki_haddi", PAIN_W], 8);
    rule("location", SHIN, ["shin shinbone shin_ki_haddi pindli_ki_haddi tibia"], 1, { unless: "guard guards pad pads" });
    rule("location", SHIN, [PAIN_W, "lower_leg", "bone haddi हड्डी"], 8);
    // radiation
    const [NORAD, BACK, TARSAL, BURNBETW, SOLE] = [0, 1, 2, 3, 4].map((i) => O("radiation", i));
    rule("radiation", BACK, [WORDS_BACK(), "radiat* spread* travel* going goes down niche tak तक pair पैर foot leg sciatica"], 8, { ctx: "pain" });
    rule("radiation", TARSAL, ["burn* jalan जलन tingl* jhunjhuni झनझनाहट pins_and_needles", "sole soles talwa तलवा toes ungli उंगली"], 9, { unless: "between beech बीच" });
    rule("radiation", BURNBETW, ["burn* jalan जलन numb* sunn* सुन्न* tingl* jhunjhuni झनझनाहट", "toe_web web_space webspace"], 5);
    rule("radiation", BURNBETW, ["burn* jalan जलन numb* sunn* सुन्न* tingl* jhunjhuni झनझनाहट", "between beech बीच", "toe toes ungli उंगली उंगलियों"], 7);
    rule("radiation", TARSAL, ["sole soles talwa तलवा", "burns burning jalan जलन buzzes buzzing"], 5);
    rule("radiation", SOLE, ["radiat* spread* travel* goes going go shoots shoot shooting jata jati जाता जाती फैल* fail tak तक", "sole soles talwa तलवा"], 6, { ctx: "pain", unless: "burn* jalan जलन" });
    // mechanism
    const [INSID, INV, EVER, HIGH, DIRECT, FALLH, LAND, FOOTW_CHG, TRAIN] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => O("mechanism", i));
    rule("mechanism", INV, ["rolled rolls rolling twisted turned sprain* went_over mod moch मोच मुड़", ANKLEW], 8, { unless: "outwards outward everted eversion high upar ऊपर upwards dorsiflex* outwardroll" });
    rule("mechanism", INV, ["inwardroll"], 1);
    rule("mechanism", INV, [ANKLEW, "rolled twisted turned went rolling rolls", "in inwards inward over"], 4, { unless: "outwards outward everted eversion high" });
    rule("mechanism", INV, ["foot", "rolled turned twisted", "in inwards inward"], 3);
    rule("mechanism", EVER, ["rolled twisted turned rotated", "outwards outward everted eversion"], 8, { ctx: "painOrArm", unless: "inwards inward inwardroll" });
    rule("mechanism", EVER, ["mod मुड़", "bahar बाहर"], 4, { ctx: "painOrArm", unless: "andar अंदर inwardroll", block: "dard दर्द sujan सूजन", blockAfter: "par पर" });
    rule("mechanism", EVER, ["outwardroll"], 1, { ctx: "painOrArm" });
    rule("mechanism", HIGH, ["high", "sprain moch मोच syndesmo*"], 4, { ctx: "painOrArm" });
    rule("mechanism", HIGH, ["foot_planted planted_foot foot_was_planted planted_my_foot foot_fixed foot_was_fixed fixed_foot", "twist* rotat* tackle* tackled"], 8);
    rule("mechanism", HIGH, ["external_rotation externally_rotated forced_outwards forced_outward twisted_outwards turned_outwards pair_bahar_ki_taraf outwardroll", "dorsiflex* bent_up bent_upwards upar ऊपर upwards"], 14);
    rule("mechanism", DIRECT, ["kicked stamped stepped_on_foot hit struck smashed dropped fell_on laat लात", "foot feet shin ankle pair पैर"], 5, { unless: "asleep" });
    rule("mechanism", FALLH, ["dropped_from fell_from jumped_from jumping_down_from jumped_down_from jump_down_from", "floor balcony terrace storey height ladder roof wall"], 6);
    rule("mechanism", FALLH, ["kood कूद", "unchai ऊंचाई chat छत deewar दीवार"], 5);
    rule("mechanism", FALLH, ["fell fall fallen gir गिर jumped_off jumped_from jump_from kood_kar_gir", "height ladder roof wall floor tree unchai ऊंचाई chat छत seedhi सीढ़ी deewar दीवार"], 6);
    rule("mechanism", LAND, ["land* landed landing utarte उतरते utar", "jump* kood कूद* hop"], 6);
    rule("mechanism", FOOTW_CHG, ["change changed switch switched shifted moved", "surface surfaces track ground floor roads road pavement tarmac concrete"], 5);
    rule("mechanism", FOOTW_CHG, ["moved switched changed shifted", "sandals sandal shoes boots trainers footwear chappal joote"], 6);
    rule("mechanism", FOOTW_CHG, ["new naye नए naya नया changed badle बदले switched different", "shoes shoe sandals boots joote जूते chappal चप्पल surface track floor ground heels trainers footwear"], 5);
    rule("mechanism", TRAIN, ["training trained trains", "marathon half_marathon 10k 5k race"], 6);
    rule("mechanism", TRAIN, ["started begun began beginning", "couch_to_5k couch_to_10k marathon half_marathon running_programme running_program"], 6);
    rule("mechanism", TRAIN, ["increased increase doubled ramped upped more badha बढ़ा sudden suddenly achanak अचानक", "training running mileage distance jogging daudna दौड़ना daud दौड़ doori दूरी gym workout"], 6);
    // aggravating
    const A = { reliefKills: true, reliefAfter: true, block: "weak* all_day every_day daily din_bhar roz रोज" };
    const AGG_W = PAIN_W + " pinch* pinching worse worsens worsen worst aggravate* badhta badhti badhte बढ़ता बढ़ती बढ़ते";
    const [FIRST, WALKRUN, DOWNH, DORSI, STAIRS, BAREFOOT, TIGHT] = [0, 1, 2, 3, 4, 5, 6].map((i) => O("aggravating", i));
    rule("aggravating", FIRST, ["first_thing"], 2, { ctx: "pain", reliefKills: true });
    rule("aggravating", FIRST, [PAIN_W, "get_out_of_bed getting_out_of_bed out_of_bed gets_out_of_bed"], 8, { reliefKills: true });
    rule("aggravating", FIRST, ["first_step first_steps first_few_steps pehla_kadam pehle_kadam पहला_कदम पहले_कदम"], 3, { ctx: "painOrArm", reliefKills: true });
    rule("aggravating", FIRST, [AGG_W, "first pehle पहले", "step steps kadam कदम", "morning subah सुबह bed bistar बिस्तर get_up getting_up uthte उठते"], 8, A);
    rule("aggravating", FIRST, ["step stepping steps kadam कदम", "out_of_bed get_out_of_bed getting_out_of_bed bed bistar बिस्तर get_up getting_up"], 5, { ctx: "pain", reliefKills: true });
    rule("aggravating", FIRST, ["first pehle पहले", "out_of_bed getting_out_of_bed get_up getting_up bed bistar बिस्तर"], 5, { ctx: "pain", reliefKills: true });
    rule("aggravating", FIRST, ["uthte उठते", "subah सुबह morning bed bistar बिस्तर"], 3, { ctx: "pain", reliefKills: true, unless: "evening shaam शाम" });
    rule("aggravating", FIRST, ["first pehle पहले", "step steps kadam कदम", "morning subah सुबह bed bistar बिस्तर get_up getting_up uthte उठते"], 6, { ctx: "pain", reliefKills: true });
    rule("aggravating", WALKRUN, [AGG_W, "walk* run* running jog* jogging chalna चल* daudna दौड़*"], 7, { ...A, block: "like jaise जैसे started began shuru starting", blockAfter: "shuru started began start", blockBefore: "downhill dhalan ढलान uphill starting start starts", unless: "barefoot bare_foot bare_feet nange नंगे without_shoes without_slippers bina_chappal bina_joote warm warms warmed garam" });
    rule("aggravating", DOWNH, [AGG_W, "downhill dhalan ढलान utaar उतार pahaad पहाड़ slope hill descending"], 7, A);
    rule("aggravating", DORSI, [AGG_W, "squat* squatting crouch* kneel* kneeling ukdu उकडू dorsiflex*"], 9, A);
    rule("aggravating", STAIRS, [AGG_W, "stairs staircase upstairs seedhiyan सीढी zeena जीना"], 7, { ...A, block: "down downstairs utarte उतरते", blockBefore: "down downstairs utarte उतरते", blockAfter: "mod मुड़ rolled twisted turned utarte उतरते down downstairs", unless: "squat* ukdu उकडू" });
    rule("aggravating", DORSI, [AGG_W, "stairs staircase steps seedhiyan सीढी zeena जीना", "down downstairs utarte उतरते"], 8, { ...A, blockAfter: "mod मुड़ rolled twisted turned" });
    rule("aggravating", TIGHT, [AGG_W, "heels"], 9, A);
    rule("aggravating", TIGHT, ["tight tang तंग narrow pointed pointy squashed squeezed cramped", "shoes shoe footwear boots trainers sandals joote जूते"], 3, { blockAfter: "calf calves muscle muscles hamstring hamstrings" });
    rule("aggravating", BAREFOOT, ["hard sakht सख्त", "barefoot bare_foot bare_feet nange नंगे"], 5);
    rule("aggravating", BAREFOOT, ["cannot cant unable difficult mushkil मुश्किल", "barefoot bare_foot bare_feet nange नंगे"], 6, { selfNeg: true });
    rule("aggravating", BAREFOOT, [AGG_W, "barefoot bare_foot bare_feet nange नंगे bina_chappal बिना_चप्पल bina_joote बिना_जूते without_shoes without_slippers"], 8, { reliefKills: true });
    rule("aggravating", TIGHT, [AGG_W, "tight tang तंग narrow pointed pointy nukile नुकीले heels strap squeeze*", "shoe shoes footwear joote जूते sandal सैंडल chappal चप्पल heels"], 8, A);
    // pattern (own answers)
    const P = (i) => O("pattern", i);
    const [INTER, CONST, MORNIMP, WARM, NIGHT, BURN] = [0, 1, 2, 3, 4, 5].map(P);
    rule("pattern", INTER, [PAIN_W, "sometimes occasionally some_days on_and_off comes_and_goes now_and_then kabhi_kabhi कभी_कभी at_times intermittent"], 6);
    rule("pattern", INTER, ["only sirf सिर्फ", "use* using walk* run* running activity exercise play* playing match matches game games training sport sports football cricket kaam काम daud* दौड़* khel* खेल*", PAIN_W], 8, { block: "night raat रात" });
    rule("pattern", CONST, [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops never_stop nonstop non_stop din_bhar pura_din poora_din पूरा_दिन har_waqt lagatar लगातार din_raat दिन_रात"], 8,
      { selfNeg: true, noComma: true, block: "after when while during from if only jab जब" });
    rule("pattern", MORNIMP, ["morning mornings subah सुबह first_thing", "better improves eases settles loosens warm* aaram आराम theek ठीक kam कम", "day din दिन walking walk chalna चल* moving"], 9, { ctx: "painOrArm", reliefKills: false });
    rule("pattern", MORNIMP, ["morning subah सुबह waking wake* on_waking", "stiffness stiff* akdan अकड़न", "loosen* eases settles improves"], 9);
    rule("pattern", WARM, ["eased eases settled settles better", "during while", "worse worsens flares", "after afterwards later baad बाद"], 12);
    rule("pattern", WARM, ["warm* garam", "worse worsens worst badh बढ़ flare* flares", "afterwards after later baad बाद"], 8);
    rule("pattern", WARM, ["warms_up warm_up warmed_up", "then", "aches aching hurts sore worse pain again afterwards later"], 7);
    rule("pattern", NIGHT, ["night raat रात", "worse worst more zyada ज्यादा badh बढ़ bad"], 7, { ctx: "pain", reliefKills: true, unless: "burn* jalan जलन" });
    rule("pattern", NIGHT, ["wakes_me woke_me waking_me wake_me jag jaag जाग* disturb* neend नींद sleep", PAIN_W], 8, { reliefKills: true, noComma: true, unless: "morning mornings subah सुबह burn* jalan जलन" });
    rule("pattern", NIGHT, ["night raat रात", PAIN_W], 4, { reliefKills: true, noComma: true, unless: "burn* jalan जलन" });
    rule("pattern", BURN, ["burn* jalan जलन jalte", "night raat रात", PAIN_W + " foot feet pair पैर talwa तलवा sole"], 8);
    // swelling
    const [SNONE, SMILD, SMOD, SSEV] = [0, 1, 2, 3].map((i) => O("swelling", i));
    const SWELL = "swell* swollen swelling sujan सूजन puffy puffiness phool फूल blows_up blow_up blown_up balloons ballooned";
    const SETTLE = "settles settle goes_down go_down goes_away go_away subsides disappears disappear resolves resolve utar उतर kam कम by_morning overnight same_day";
    rule("swelling", SMILD, [SWELL, "mild slight slightly little thodi थोड़ी halki हल्की", "settles settle goes_down go_down subsides utar उतर kam कम same_day evening overnight shaam शाम"], 9);
    rule("swelling", SMILD, [SWELL, SETTLE], 9, { block: "never not persistent" });
    rule("swelling", SMOD, [SWELL, "kam कम utar उतर", "nahi नहीं"], 8, { selfNeg: true });
    rule("swelling", SMOD, [SWELL, "persistent persistently constantly always permanent ongoing lagatar लगातार hamesha हमेशा hafton हफ्तों weeks never"], 8);
    rule("swelling", SSEV, [SWELL, "severe huge big massively massive heavily balloon* recurrent recurring badly bahut बहुत baar_baar बार_बार again_and_again every every_time har_baar हर_बार", "after baad बाद activity exercise running run walk walking game sport match khelne खेलने daudne दौड़ने kasrat कसरत"], 10);
    // red flags
    const R = (i) => O("redFlags", i);
    const [OTTBONE, OTTWEIGHT, ACHRUP, ATFL, STRESS, PERON, HOTJ, COMPART, CANCER] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(R);
    rule("redFlags", OTTBONE, ["press* pressing tender touch chhune छूने dabane दबाने", "bump bone haddi हड्डी bony", "ankle* takhna टखना"], 8);
    rule("redFlags", OTTBONE, ["tender tenderness dabane दबाने dabaane press* pressing chhune छूने touch", "malleol* fibula ankle_bone takhne_ki_haddi टखने_की_हड्डी bony_tenderness"], 8);
    rule("redFlags", OTTWEIGHT, ["cant cannot unable couldnt nahi नहीं", "weight_bear bear_weight put_weight weight bhaar भार wazan वजन kadam कदम step steps khada khade खड़ा खड़े stand*", "foot leg ankle pair पैर"], 8, { selfNeg: true });
    rule("redFlags", OTTWEIGHT, ["cant cannot unable couldnt could_not", "weight_bear bear_weight put_weight weight"], 5, { selfNeg: true });
    rule("redFlags", OTTWEIGHT, ["cant cannot unable couldnt nahi नहीं", "step steps kadam कदम", "four 4 chaar चार even bhi भी few ek एक one"], 6, { selfNeg: true });
    rule("redFlags", OTTWEIGHT, ["cant cannot unable couldnt", "walk walking", "injury injured accident fall fell collision tackle tackled twisted landed chot gir"], 14, { selfNeg: true });
    rule("redFlags", ACHRUP, ["pop popped snap snapped rupture* ruptured toot टूट phat फट पॉप", "achilles अकिलीज अकिलीस back_of_the_ankle ankle_ke_peeche टखने_के_पीछे calf"], 10);
    rule("redFlags", ACHRUP, ["pop popped snap snapped", "back peeche पीछे behind"], 6, { ctx: "painOrArm" });
    rule("redFlags", ACHRUP, ["cant cannot unable nahi नहीं mushkil मुश्किल difficult", "rise tiptoe tip_toe tiptoes push_up push_off on_toes on_my_toes up_on_toes panjon पंजों पंजे"], 6, { selfNeg: true, unless: "squat* kneel* ukdu उकडू weight_bear bear_weight put_weight weight bhaar भार" });
    rule("redFlags", ACHRUP, ["cant cannot unable nahi नहीं mushkil मुश्किल difficult", "rise tiptoe tip_toe toes panjon पंजों push_off", "toes tiptoe पंजों पंजे"], 8, { selfNeg: true, unless: "squat* kneel* ukdu उकडू weight_bear bear_weight put_weight weight bhaar भार" });
    rule("redFlags", ATFL, ["torn tear torn_completely complete floppy loose dheela ढीला phat फट", "ligament ligaments lagament लिगामेंट atfl ankle takhna टखना"], 16);
    rule("redFlags", STRESS, ["stress_fracture pinpoint focal one_spot one_sore_spot ek_jagah एक_जगह", "shin tibia bone haddi हड्डी pindli पिंडली"], 7);
    rule("redFlags", PERON, ["click clicks snap snaps pop pops clunk", "outer outside lateral", "ankle_bone malleolus"], 8);
    rule("redFlags", PERON, ["peroneal", "tendon slip* snap* pop* subluxat* nas नस phisal*"], 5);
    rule("redFlags", PERON, ["tendon", "slips slip snaps snap pops flicks clunk phisalta", "outer_ankle outside_ankle lateral_malleolus takhne_ke_bahar"], 8);
    rule("redFlags", HOTJ, ["hot warm garam गर्म* गरम*", "red laal लाल", "swollen swelling puffy sujan सूजन"], 8, { ctx: "painOrArm" });
    rule("redFlags", HOTJ, ["hot warm garam गर्म* गरम*", "swollen swelling puffy sujan सूजन", "ankle joint takhna टखना foot pair पैर"], 8);
    rule("redFlags", COMPART, ["cold pale white blue neela नीला thanda ठंडा peela पीला no_pulse nabz नब्ज", "foot feet pair पैर toes calf"], 6);
    rule("redFlags", COMPART, ["tight hard rock_hard kasa कसा कसी sakht सख्त", "calf lower_leg pindli पिंडली", PAIN_W + " swollen swelling numb* balloon* tense"], 10);
    rule("redFlags", CANCER, ["cancer cancers tumor tumour tumors malignan* carcinoma lymphoma leukemia myeloma kainsar कैंसर cancerous", "history had diagnosed treated treatment survivor chemo chemotherapy radiotherapy past previous earlier before tha था hua हुआ ilaaj इलाज ago pehle पहले"], 6);
  },
});

// "back" words for the "referred from the lower back" answer.
function WORDS_BACK() { return "lower_back low_back back_pain back_ache backache from_back kamar कमर sciatica sciatic lumbar spine spinal"; }

export const FIELDS = matcher.fields;
export const PHRASE_COUNT = matcher.PHRASE_COUNT;
export const RULE_COUNT = matcher.RULE_COUNT;
export const phrasesFor = matcher.phrasesFor;
export const allPhrases = matcher.allPhrases;
export const describeRules = matcher.describeRules;
export const understandField = matcher.understandField;
export const understandStory = matcher.understandStory;
