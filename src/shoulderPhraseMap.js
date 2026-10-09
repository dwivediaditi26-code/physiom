// shoulderPhraseMap.js -- DRAFT, for Aditi to review.
//
// Understands what a student types about a SHOULDER complaint in everyday words (English, Hinglish, Hindi in
// Devanagari) and suggests which of the Subjective checklist options it means. No AI, no network, no cost.
// It only SUGGESTS; the student taps to confirm. The matching engine is in phraseEngine.js.
//
// Covers the 6 Shoulder questions that change the AI Objective Assessment ranking (mechanism, aggravating,
// relieving, pattern, radiation, red flags). The option strings must match the form exactly (a test checks this).
//
// "~word" = a bare word that only counts when typed INTO that question's own box.
import { createPhraseMatcher, WORDS } from "./phraseEngine.js";
import { PATTERN_PHRASES, patternRules, extendPhrases } from "./phrasePattern.js";

export const SHOULDER_PHRASES = {
  mechanism: {
    "Insidious / overuse": [
      "overuse", "over use", "no injury", "no specific injury", "no particular injury", "no trauma", "started on its own",
      "started by itself", "came on slowly", "gradually started", "slowly started", "gradual onset", "no known cause",
      "dont know how it started", "too much work", "came on gradually", "out of nowhere", "appeared out of nowhere", "came out of nowhere",
      "for no reason", "nothing i did", "no apparent cause", "no obvious cause", "didnt do anything", "spontaneously", "slowly building", "no accident", "no particular incident", "no incident", "no specific incident", "crept up", "just crept up", "came on by itself", "came on its own",
      "no fall", "creeping onset", "slow onset", "insidious onset", "insidious",
      "bina chot ke", "apne aap shuru hua", "dheere dheere shuru hua", "kaaran pata nahi", "zyada kaam karne se", "koi chot nahi lagi", "chot nahi lagi thi", "apne aap dard hua", "apne aap hua", "bina wajah dard", "bina kisi wajah ke",
      "बिना चोट के", "अपने आप शुरू हुआ", "धीरे धीरे शुरू हुआ", "कारण पता नहीं", "ज्यादा काम करने से", "कोई चोट नहीं लगी", "चोट नहीं लगी थी", "अपने आप दर्द हुआ", "बिना किसी वजह के",
    ],
    "Fall onto shoulder / outstretched hand": [
      "fell on my shoulder", "fall on the shoulder", "fall onto shoulder", "landed on my shoulder", "fell onto my shoulder",
      "fell on an outstretched hand", "fell on my outstretched hand", "fall onto outstretched hand", "fell on my hand",
      "fall on hand", "foosh", "put my hand out to save myself", "fell and put my hand out", "landed on my hand",
      "slipped and fell on my shoulder", "fell off my bike onto my shoulder",
      "kandhe ke bal gir", "kandhe par gir", "haath ke bal gir", "haath tek kar gir", "haath pe gir", "haath par gir",
      "कंधे के बल गिर", "कंधे पर गिर", "हाथ के बल गिर", "हाथ टेककर गिर", "हाथ पर गिर",
    ],
    "Direct blow": [
      "direct blow", "hit on the shoulder", "hit my shoulder", "banged my shoulder", "knocked my shoulder", "bumped my shoulder",
      "hit by a ball on the shoulder", "got tackled", "was tackled", "road accident", "accident", "collision", "got hit",
      "someone hit me on the shoulder", "blow to the shoulder",
      "kandhe par chot", "kandhe me chot", "kandha takra", "kandhe par maar", "accident me chot", "kandhe par kisi ne mara",
      "कंधे पर चोट", "कंधे में चोट", "कंधा टकरा", "कंधे पर मार", "एक्सीडेंट में चोट",
    ],
    "Forced overhead / rotation movement": [
      "forced overhead", "forced overhead movement", "arm yanked", "my arm was yanked", "arm was pulled", "someone pulled my arm",
      "dog pulled my arm", "jerk to the arm", "sudden jerk", "twisted my arm", "arm twisted behind", "arm forced backwards",
      "forced rotation", "wrenched my shoulder", "arm got pulled hard",
      "haath jhatke se kheecha", "haath khincha gaya", "haath ko jhatka laga", "haath marod diya", "haath peeche mud gaya", "achanak jhatka laga",
      "हाथ झटके से खिंच", "हाथ को झटका लगा", "हाथ मरोड़ दिया", "हाथ पीछे मुड़ गया", "अचानक झटका लगा",
    ],
    "Repetitive overhead activity": [
      "repetitive overhead", "repetitive overhead activity", "overhead work", "working overhead", "working with arms above head",
      "painting ceilings", "painting the ceiling", "painting walls overhead", "hanging clothes all day", "changing light bulbs",
      "overhead shelves all day", "~swimming", "~swimmer", "freestyle swimming", "arms above head all day", "i swim", "swim every day", "butterfly stroke", "freestyle stroke",
      "upar haath rakh ke kaam", "chhat ki painting", "chhat par paint", "baar baar haath upar", "tairna", "swimming karne se", "upar kaam karna",
      "ऊपर हाथ रखकर काम", "छत की पेंटिंग", "बार बार हाथ ऊपर", "तैराकी", "तैरने से",
    ],
    "Throwing / racquet sport": [
      "throwing", "throwing a ball", "throw the ball", "overhead throw", "cricket throw", "cricket bowling", "fast bowler",
      "~cricket", "~bowling", "~javelin", "~baseball", "~tennis", "~badminton", "~squash", "~volleyball", "~basketball", "racquet sport", "racket sport",
      "throwing a javelin", "javelin throw", "playing cricket", "playing tennis", "playing badminton", "playing volleyball", "tennis serve", "smash",
      "ball phenkne se", "ball phenkna", "cricket khelne se", "bowling karne se", "badminton khelne se", "tennis khelne se", "volleyball khelne se",
      "गेंद फेंकने से", "गेंद फेंकना", "क्रिकेट खेलने से", "गेंदबाजी", "बैडमिंटन खेलने से", "टेनिस खेलने से", "वॉलीबॉल खेलने से",
    ],
    "Lifting overhead": [
      "lifting overhead", "lifting something overhead", "lifted a heavy suitcase onto a shelf", "put a bag on the top shelf",
      "lifting a heavy object above my head", "overhead press", "overhead presses", "shoulder press", "shoulder presses", "military press", "lifted luggage into the overhead cabin",
      "lifting weights overhead", "lifted a heavy box onto a high shelf",
      "upar saman uthane se", "upar rakhte waqt", "bhari saman upar uthate", "suitcase upar rakhte", "almari ke upar saman rakhte", "shoulder press karne se",
      "ऊपर सामान उठाने से", "ऊपर रखते समय", "भारी सामान ऊपर उठाते", "अलमारी के ऊपर सामान रखते", "शोल्डर प्रेस करने से",
    ],
    "Post-surgical": [
      "post surgery", "post surgical", "post operative", "after surgery", "since the operation", "after my operation",
      "after shoulder surgery", "rotator cuff repair", "after the operation on my shoulder", "after arthroscopy",
      "operation ke baad", "surgery ke baad", "kandhe ka operation hua tha", "kandhe ka operation", "operation ke baad se dard", "rotator cuff ka operation",
      "ऑपरेशन के बाद", "सर्जरी के बाद", "कंधे का ऑपरेशन हुआ था", "कंधे का ऑपरेशन",
    ],
    "Age-related / degenerative": [
      "age related", "age related changes", "degenerative", "degeneration", "wear and tear", "due to age", "because of age",
      "getting old", "old age", "arthritis", "osteoarthritis", "age related wear",
      "umar ke saath", "budhape ki wajah se", "umar ki wajah se", "ghisav", "budhape me", "umar badhne se", "arthritis hai", "umar ho gayi hai", "umar zyada ho gayi", "budhapa",
      "उम्र के साथ", "बुढ़ापे की वजह से", "उम्र की वजह से", "घिसाव", "बुढ़ापे में", "उम्र बढ़ने से", "गठिया", "उम्र हो गई है", "बुढ़ापा",
    ],
  },

  aggravating: {
    "Overhead reaching": [
      "~overhead", "~overhead reaching", "~reaching up", "pain reaching overhead", "pain when i reach up", "pain lifting my arm up",
      "hurts to raise my arm", "hurts raising my arm", "cannot raise my arm without pain", "pain combing my hair",
      "pain putting things on a high shelf", "pain taking something from the top shelf", "hurts when i lift my arm above my head",
      "pain washing my hair", "pain hanging clothes", "cannot comb my hair", "cant comb my hair", "difficulty combing my hair", "cannot brush my hair", "cant reach the top shelf",
      "haath upar karne me dard", "haath upar uthane me dard", "upar haath le jane me dard", "baal kanghi karne me dard",
      "upar shelf se saman nikalne me dard", "haath upar karte hi dard", "baal nahi bana pata", "baal kanghi nahi kar pata",
      "हाथ ऊपर करने में दर्द", "हाथ ऊपर उठाने में दर्द", "ऊपर हाथ ले जाने में दर्द", "बाल बनाने में दर्द", "ऊपर शेल्फ से सामान निकालने में दर्द",
    ],
    "Reaching behind back": [
      "~behind the back", "~behind my back", "~reaching behind", "pain reaching behind my back", "pain putting hand behind back",
      "hurts to reach behind", "pain doing up a bra", "pain tucking in my shirt", "pain washing my back", "pain putting on a jacket",
      "cannot reach my back pocket", "pain reaching back pocket", "hurts to scratch my back", "pain tying an apron",
      "cannot reach behind my back",
      "peeche haath le jane me dard", "peeche haath karne me dard", "peeche pocket me haath dalne me dard", "kamar ke peeche haath",
      "peeth khujane me dard", "bra ka hook lagane me dard", "peeche haath nahi ja pata",
      "पीछे हाथ ले जाने में दर्द", "पीछे हाथ करने में दर्द", "पीछे जेब में हाथ डालने में दर्द", "पीठ खुजाने में दर्द", "ब्रा का हुक लगाने में दर्द",
    ],
    "Reaching across the body": [
      "~across the body", "~reaching across", "pain reaching across my body", "pain when i reach across my chest",
      "pain putting my hand on the opposite shoulder", "hurts to touch the opposite shoulder", "pain crossing my arm",
      "hurts to pull the seat belt across", "seat belt hurts to pull", "pain reaching across the car",
      "dusre kandhe tak haath le jane me dard", "saamne se haath ghumane me dard", "seat belt lagane me dard", "seene ke upar se haath le jane me dard",
      "दूसरे कंधे तक हाथ ले जाने में दर्द", "सामने से हाथ घुमाने में दर्द", "सीट बेल्ट लगाने में दर्द", "सीने के ऊपर से हाथ ले जाने में दर्द",
    ],
    "Lying on the shoulder": [
      "~lying on the shoulder", "~sleeping on the shoulder", "pain lying on that side", "pain when i lie on it", "cannot sleep on that side",
      "hurts to sleep on that side", "pain sleeping on my side", "cannot lie on the affected side", "worse lying on the shoulder",
      "sleeping on the shoulder hurts", "pain when i lie on my shoulder", "cant lie on that shoulder",
      "us taraf let ne me dard", "us side par sone se dard", "kandhe par let ne se dard", "karwat lene me dard", "us taraf let nahi pata", "dard wali taraf sone se dard",
      "उस तरफ लेटने में दर्द", "कंधे पर लेटने से दर्द", "करवट लेने में दर्द", "उस तरफ सो नहीं पाता", "दर्द वाली तरफ सोने से दर्द",
    ],
    "Lifting": [
      "~lifting", "~lift", "pain lifting things", "pain lifting objects", "hurts to lift heavy things", "hurts to lift a bag",
      "pain carrying a heavy bag", "pain carrying shopping", "pain carrying groceries", "lifting makes it worse", "worse with lifting",
      "pain lifting heavy weights", "hurts to carry heavy things",
      "~uthana", "weight uthana me dard", "bhari saman uthane me dard", "bhari bag uthane me dard", "saman uthane par dard",
      "~उठाना", "वजन उठाने में दर्द", "भारी सामान उठाने पर दर्द", "भारी बैग उठाने में दर्द", "सामान उठाने में दर्द",
    ],
    "Painful arc (mid-range)": [
      "painful arc", "pain in the middle of raising my arm", "pain halfway up", "pain mid range", "pain midway through lifting my arm",
      "pain between 60 and 120 degrees", "pain only in the middle of the movement", "arm hurts halfway when raising",
      "pain on the way up then it eases at the top", "pain at shoulder height", "pain when my arm is at shoulder level",
      "haath uthate waqt beech me dard", "aadhe raste me dard", "beech ke angle par dard", "beech me dard hota hai phir kam ho jata hai", "kandhe ki unchai par dard",
      "हाथ उठाते समय बीच में दर्द", "आधे रास्ते में दर्द", "बीच के कोण पर दर्द", "बीच में दर्द होता है फिर कम हो जाता है", "कंधे की ऊंचाई पर दर्द",
    ],
  },

  relieving: {
    "Rest": [
      "~rest", "better with rest", "better when i rest", "rest helps", "relieved by rest", "eases with rest", "settles with rest",
      "pain goes away when i rest", "resting makes it better", "rest relieves it", "relief with rest",
      "aaram se theek", "aaram karne se aaram", "aaram se dard kam", "rest karne se theek", "aaram karne par theek ho jata hai",
      "आराम से ठीक", "आराम करने से राहत", "आराम से दर्द कम", "आराम करने पर ठीक हो जाता है",
    ],
    "Supportive positioning": [
      "supporting the arm", "arm supported on a pillow", "support under the arm", "sleeping with a pillow under the arm",
      "pillow under arm helps", "holding the arm close to the body", "supporting the elbow helps", "sling helps", "arm in a sling",
      "keeping the arm supported", "propping the arm", "resting the arm on a pillow",
      "haath ko sahara dene se aaram", "takiya laga ke aaram", "haath ke niche takiya", "sling lagane se aaram", "haath ko sahara", "haath ko sahara dene par theek",
      "हाथ को सहारा देने से आराम", "तकिया लगाने से आराम", "हाथ के नीचे तकिया", "स्लिंग लगाने से आराम", "हाथ को सहारा",
    ],
    "Ice / heat": [
      "~ice", "~heat", "ice helps", "ice makes it better", "heat helps", "hot water bag", "hot pack", "cold pack", "ice pack",
      "hot compress", "heat pad", "warm compress", "hot water fomentation", "hot shower helps", "warm shower helps", "heating pad",
      "~sekai", "sekai se aaram", "garam sekai", "barf se aaram", "barf lagane se aaram", "hot pack se aaram", "garam paani ki thaili", "thanda sek", "garam sek",
      "~सिकाई", "सिकाई से आराम", "गरम सिकाई", "बर्फ से आराम", "बर्फ लगाने से राहत", "गरम पानी की थैली", "ठंडी सिकाई",
    ],
    "Medication": [
      "painkiller helps", "pain killers help", "tablet helps", "medicine helps", "better with medicines", "better after taking a tablet",
      "painkillers relieve", "anti inflammatory helps", "taking ibuprofen helps", "paracetamol helps", "diclofenac helps",
      "relieved by painkillers", "pain gel helps", "pain spray helps",
      "dawai se aaram", "dard ki goli se aaram", "painkiller lene se aaram", "goli khane se aaram", "medicine se aaram", "tablet leta hoon to theek", "dawai lene par theek",
      "दवा से आराम", "दर्द की गोली से आराम", "दवाई लेने से राहत", "गोली खाने से आराम", "पेनकिलर से आराम",
    ],
    "Avoiding overhead activity": [
      "avoiding overhead activity", "avoid overhead activity", "avoid lifting my arm up", "better when i keep the arm down",
      "better when i dont raise my arm", "pain goes if i dont lift my arm", "keeping the arm low", "better if i dont reach up",
      "relief when the arm is down", "better if i keep it by my side", "better when i avoid overhead work",
      "haath upar na uthane se aaram", "haath upar karna band karne se aaram", "haath niche rakhne se aaram", "upar haath na le jane se theek", "upar ka kaam band karne se aaram",
      "हाथ ऊपर न उठाने से आराम", "हाथ ऊपर करना बंद करने से आराम", "हाथ नीचे रखने से आराम", "ऊपर हाथ न ले जाने से ठीक", "ऊपर का काम बंद करने से आराम",
    ],
  },

  pattern: extendPhrases(PATTERN_PHRASES, {
    "Constant": [
      "constant severe pain", "constant dull pain", "constant aching pain", "constant ache", "constant sharp pain", "constant throbbing pain",
      "dull and there all the time", "there all the time", "unremitting pain", "persistent pain",
    ],
    "Worse at night": [
      "cannot sleep on that side because of pain", "pain keeps me awake at night", "night pain in the shoulder", "pain when i lie down at night",
      "raat ko kandhe me dard", "raat ko let te hi dard", "रात को कंधे में दर्द", "रात को लेटते ही दर्द",
    ],
  }),

  radiation: {
    "No radiation": [
      "no radiation", "does not radiate", "doesnt radiate", "not radiating", "does not spread", "doesnt spread",
      "stays in one place", "stays at one spot", "localised pain", "localized pain", "pain stays only in the shoulder",
      "pain is only in the shoulder", "only in the shoulder", "kahin aur nahi jata", "kahin nahi jata", "sirf kandhe me dard", "dard sirf kandhe me hai", "doesnt go anywhere else", "does not go anywhere else", "does not travel", "doesnt travel",
      "dard fail nahi", "dard aage nahi jata", "dard ek hi jagah rehta hai", "ek hi jagah dard", "dard kandhe tak hi rehta hai",
      "दर्द फैलता नहीं", "कहीं और नहीं जाता", "सिर्फ कंधे में दर्द", "दर्द आगे नहीं जाता", "दर्द एक ही जगह रहता है", "दर्द कंधे तक ही रहता है",
    ],
    "Down to elbow": [
      "radiates to the elbow", "pain goes down to the elbow", "pain travels down to my elbow", "pain down the upper arm to the elbow",
      "pain spreads to the elbow", "down to the elbow", "goes down the arm to the elbow", "pain reaches the elbow", "upto the elbow",
      "kohni tak dard jata hai", "dard kohni tak fail", "dard kohni tak aata hai", "kandhe se kohni tak dard", "dard baju me kohni tak",
      "कोहनी तक दर्द जाता है", "दर्द कोहनी तक फैलता है", "कंधे से कोहनी तक दर्द", "दर्द बाजू में कोहनी तक",
    ],
    "Down to hand (consider cervical origin)": [
      "radiates to the hand", "pain goes down to the hand", "pain down to the fingers", "pain going into my fingers",
      "pain all the way down the arm to the fingers", "pain to the wrist and hand", "tingling in the hand", "numbness in the hand",
      "pins and needles in the hand", "tingling in my fingers", "numb fingers", "down to the hand",
      "haath tak dard jata hai", "ungliyon tak dard", "dard poore haath me", "kandhe se ungli tak dard", "haath me jhunjhuni", "haath me sunnpan", "ungliyon me sunnpan",
      "हाथ तक दर्द जाता है", "उंगलियों तक दर्द", "दर्द पूरे हाथ में", "कंधे से उंगली तक दर्द", "हाथ में झनझनाहट", "हाथ में सुन्नपन",
    ],
    "Up to neck": [
      "pain goes up to the neck", "radiates to the neck", "pain spreading to my neck", "pain going up the side of the neck",
      "pain goes up into the neck", "pain up to the neck", "pain travels up to my neck", "neck also hurts", "neck pain along with it",
      "gardan tak dard jata hai", "dard gardan tak", "gardan me bhi dard", "gardan ki taraf dard", "dard upar gardan tak jata hai",
      "गर्दन तक दर्द जाता है", "दर्द गर्दन तक", "गर्दन में भी दर्द", "गर्दन की तरफ दर्द", "दर्द ऊपर गर्दन तक जाता है",
    ],
    "Between shoulder blades": [
      "between the shoulder blades", "pain between my shoulder blades", "pain between the scapulae", "interscapular pain",
      "pain in the upper back between the shoulder blades", "pain behind between the shoulders", "upper back between the blades",
      "pain between the blades",
      "dono kandhon ke beech dard", "kandhe ki haddiyon ke beech dard", "peeth ke upar beech me dard", "dono shoulder blade ke beech", "kandhon ke beech peeth me dard",
      "दोनों कंधों के बीच दर्द", "कंधे की हड्डियों के बीच दर्द", "पीठ के ऊपर बीच में दर्द", "दोनों कंधों के बीच पीठ में दर्द",
    ],
  },

  redFlags: {
    "Suspected fracture (recent fall / trauma)": [
      "suspected fracture", "possible fracture", "think it is broken", "think i broke", "heard a crack", "heard a snap",
      "bone looks out of place", "bone sticking out", "shoulder looks deformed", "deformed shoulder", "broken collarbone",
      "collarbone broken", "step in the collarbone", "fracture of the collar bone", "collar bone fracture", "collarbone fracture", "clavicle fracture", "fractured clavicle", "fractured collarbone",
      "humerus fracture", "fracture of the humerus", "proximal humerus fracture", "fracture hai", "fracture bataya", "fracture bola", "said it is a fracture", "told me it is a fracture", "fracture confirmed", "fracture on x ray", "shoulder dislocated", "dislocated shoulder", "shoulder popped out", "shoulder out of place",
      "haddi toot", "kandha utar gaya", "kandha apni jagah se hat gaya", "kandhe ki haddi tedhi", "fracture lag raha hai", "collar bone toot",
      "हड्डी टूट", "कंधा उतर गया", "कंधा अपनी जगह से हट गया", "कंधे की हड्डी टेढ़ी", "फ्रैक्चर लग रहा है", "कॉलर बोन टूट", "फ्रैक्चर है",
    ],
    "Cannot lift arm at all after trauma": [
      "cannot lift my arm at all since the fall", "unable to lift arm after the fall", "cant raise my arm since the accident",
      "arm is completely stuck since the injury", "cannot move the arm at all after the injury", "arm hangs and wont lift after the fall",
      "my arm is useless since the fall",
      "gir ke baad haath upar nahi utha", "chot ke baad haath bilkul nahi utha pa raha", "chot ke baad haath bilkul upar nahi ja raha", "gir ke baad haath hil nahi raha",
      "गिरने के बाद हाथ ऊपर नहीं उठा", "चोट के बाद हाथ बिल्कुल नहीं उठ पा रहा", "गिरने के बाद हाथ हिल नहीं रहा",
    ],
    "Constant progressive pain unrelated to movement": [
      "constant progressive pain", "pain keeps getting worse regardless of movement", "pain that does not change with movement",
      "constant pain whatever i do", "pain getting worse every day no matter what", "unrelenting pain", "nothing changes the pain",
      "pain is not related to movement", "pain is there even when still and increasing", "same whether i move or not", "not affected by movement", "unaffected by movement",
      "regardless of movement", "irrespective of movement", "same at rest and with movement",
      "dard lagatar badh raha hai chahe kuch bhi karun", "dard har roz badh raha hai", "hilne se dard ka koi lena dena nahi", "kisi bhi position me dard kam nahi hota aur badh raha hai", "dard badhta hi ja raha hai",
      "दर्द लगातार बढ़ रहा है चाहे कुछ भी करूं", "दर्द हर रोज बढ़ रहा है", "हिलने से दर्द का कोई लेना देना नहीं", "किसी भी पोजीशन में दर्द कम नहीं होता और बढ़ रहा है", "दर्द बढ़ता ही जा रहा है",
    ],
    "Night pain unrelated to position": [
      "night pain whatever position", "pain at night in every position", "night pain unrelated to position", "pain at night even when lying still",
      "pain wakes me up whichever way i lie", "cant find a comfortable position at night", "pain at night no matter how i sleep",
      "pain in all positions at night", "unrelenting night pain",
      "raat ko kisi bhi position me dard", "raat ko kisi bhi taraf let ne par dard", "raat ko aaram nahi milta kisi bhi position me", "raat me chain nahi milta",
      "रात को किसी भी पोजीशन में दर्द", "रात को किसी भी तरफ लेटने पर दर्द", "रात को किसी भी पोजीशन में आराम नहीं मिलता", "रात में चैन नहीं मिलता",
    ],
    "Palpable mass": [
      "~lump", "~mass", "a lump on the shoulder", "lump on my collarbone", "bump on the shoulder", "ball like swelling", "palpable mass",
      "growth on the shoulder", "a lump near the shoulder", "i can feel a lump", "swelling like a ball", "hard swelling", "hard lump", "bulge", "bulging", "something sticking out on the shoulder",
      "~gaanth", "kandhe par gaanth", "kandhe me ubhaar", "goli jaisa ubhaar", "gaanth mehsoos hoti hai", "kandhe ke paas gaanth",
      "~गांठ", "कंधे पर गांठ", "कंधे में उभार", "गोली जैसा उभार", "गांठ महसूस होती है", "कंधे के पास गांठ",
    ],
    "Redness / warmth / swelling (possible infection)": [
      "red hot swollen shoulder", "shoulder is red and warm", "redness warmth and swelling", "hot red swollen", "feels warm to touch",
      "red and swollen shoulder", "warm swollen red", "red and warm joint", "swollen warm and red",
      "kandha laal aur garam", "kandhe me laali aur sujan", "garam aur sujan", "laal aur sujan", "kandha garam aur laal hai",
      "कंधा लाल और गरम", "कंधे में लाली और सूजन", "गरम और सूजन", "लाल और सूजन", "कंधा गर्म और लाल है",
    ],
    "Cancer history": [
      "~cancer", "~cancer history", "history of cancer", "had cancer", "cancer in the past", "cancer survivor", "breast cancer history",
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

const { PAIN: PAIN_W } = WORDS;
// Words that say a sentence is about this region / about another one.
const OWN_W = "shoulder* arm arms upper_arm deltoid collarbone clavicle scapula blade blades rotator elbow hand hands up_to_neck to_neck into_neck gardan_tak गर्दन_तक kandha कंधा baju बाजू बांह haath हाथ";
const FOREIGN_W = "back_pain backache pain_in_back upper_back neck gardan गर्दन knee* hip* ankle* foot feet leg legs thigh calf groin waist lumbar spine lower_back low_back stomach headache jaw toe* tooth teeth eye* ear throat ghutn* ghutna kamar कमर घुटन* पैर पेट सिर घुटने";
// A relative's illness is not the patient's cancer history.
const FAMILY_W = "mother father family mom dad mummy mumma mama sister brother uncle aunt grandmother grandfather grandma grandpa relative relatives wife husband son daughter maa मां माँ papa पापा baap बाप bhai भाई behen बहन dada dadi nana nani चाचा मामा";

const matcher = createPhraseMatcher({
  phrases: SHOULDER_PHRASES,
  singleChoiceFields: ["pattern"],
  noneOptions: { redFlags: "None of the above", radiation: "No radiation" },
  ownWords: OWN_W,
  foreignWords: FOREIGN_W,
  optionGuards: { "redFlags|Cancer history": FAMILY_W },
  guardExempt: ["radiation|Up to neck"],
  hinglish: [
    [/\b(kandha|kandhe|kandho|kandhon|kandhey|kanda)\b/g, "kandha"],
    [/\b(baju|bazu|baaju|bajoo|baanh|baah)\b/g, "baju"],
    [/\b(gardan|gardaan|gardn)\b/g, "gardan"],
    [/\b(sekai|sikai|sek|seki|sekayi|sikaai)\b/g, "sekai"],
    [/\b(dawai|dawa|dawaai|davai|davaai|dawaiyan|dawaiyaan|davaiyan)\b/g, "dawai"],
    [/\b(gaanth|ganth|gaath|gant)\b/g, "gaanth"],
    [/\b(upar|uper|oopar|upr)\b/g, "upar"],
    [/\b(niche|neeche|nichey|nche)\b/g, "niche"],
    [/\b(peeche|piche|pichhe|peechhe|pichche)\b/g, "peeche"],
    [/\b(sone|sona|sote|sota|soti|soya|soye)\b/g, "sona"],
    [/\b(letne|letna|lete|leta|leti|letkar)\b/g, "letna"],
    [/\b(karwat|karvat|karwaat)\b/g, "karwat"],
    [/\b(raat|raath|rat)\b/g, "raat"],
    [/\b(takiya|takia|takiyaa|takiye)\b/g, "takiya"],
  ],
  deva: [
    [/कंध(ा|े|ों|ो)/g, "कंधा"],
    [/बांह(ें|ों)?/g, "बांह"],
    [/बाजू(ओं|एं)?/g, "बाजू"],
  ],
  rules: ({ rule, O }) => {
    const [FALL, DIRECT, FORCED, REPOH, THROW, LIFTOH, POSTOP] = [1, 2, 3, 4, 5, 6, 7].map((i) => O("mechanism", i));
    // mechanism
    rule("mechanism", FALL, ["fell fall fallen falling slipped tripped landed gir गिर", "shoulder kandha कंधा hand haath हाथ outstretched arm"], 6, { unless: "asleep sleep ill sick love apart" });
    rule("mechanism", FALL, ["put_hand_out put_hands_out stuck_hand_out stretched_hand_out", "fall fell stop save slipped tripped"], 10);
    rule("mechanism", FALL, ["gir गिर", "haath_ke_bal haath_pe haath_par haath_tek kandha_ke_bal kandha_par kandha_pe हाथ_के_बल हाथ_पर हाथ_टेककर कंधा_के_बल कंधा_पर"], 6);
    rule("mechanism", DIRECT, ["hit banged knocked bumped struck tackled collided collision chot चोट", "shoulder kandha कंधा"], 4, { unless: "press" });
    rule("mechanism", FORCED, ["yanked jerked jerk* wrenched twisted tugged khincha khinch* kheench* jhatka jhatke jhatk* marod* मरोड़* झटक* खिंच* खींच*", "arm haath hand shoulder kandha कंधा हाथ"], 5);
    rule("mechanism", REPOH, ["overhead above_head above_her_head above_his_head above_their_head upar ऊपर", "work* job paint* repeated* repetitive swim* hang* daily everyday roz रोज kaam काम"], 8, { ctx: "painOrArm", unless: "band बंद stop* avoid*" });
    rule("mechanism", REPOH, ["curtain* ceiling bulb bulbs whitewash* distemper"], 1, { ctx: "painOrArm" });
    rule("mechanism", REPOH, ["swim* swimmer freestyle butterfly backstroke breaststroke tairna तैर* तैराकी"], 1, { ctx: "painOrArm" });
    rule("mechanism", LIFTOH, ["after since started began injured hurt strained tweaked baad बाद", "lift* carry* uthana उठाना put* place* rakh* रख*", "overhead above_head upar ऊपर shelf shelves cupboard almari अलमारी high top"], 9);
    rule("mechanism", LIFTOH, ["lifted hoisted heaved loaded stored uthaya", "overhead above_head locker shelf shelves cupboard almari अलमारी"], 8, { blockBefore: PAIN_W });
    rule("mechanism", THROW, ["throw* bowl* phenkna", "ball cricket javelin"], 6, { ctx: "painOrArm" });
    rule("mechanism", THROW, ["play* played khelna खेल* game games match practice training coaching season serve serving", "cricket tennis badminton squash volleyball basketball baseball handball pickleball javelin table_tennis क्रिकेट टेनिस बैडमिंटन वॉलीबॉल"], 5, { ctx: "painOrArm", unless: "gir गिर fell fall fallen tripped slipped tackled collided" });
    rule("mechanism", POSTOP, ["replace* replacement implant*", "shoulder kandha कंधा joint"], 5, { unless: "fell fall tripped" });
    rule("mechanism", POSTOP, ["surgery operation operated arthroscopy ऑपरेशन सर्जरी", "after post since following baad बाद"], 6);
    // aggravating
    // "weak" or an all-day exposure between the two groups switches a rule off.
    const AGG_W = PAIN_W + " worse worsens worsen aggravate* badh बढ़";
    const A = { reliefKills: true, block: "weak* kamzor कमजोर all_day every_day daily din_bhar roz रोज" };
    const OH = O("aggravating", 0), BEHIND = O("aggravating", 1), ACROSS = O("aggravating", 2), LYING = O("aggravating", 3), LIFT = O("aggravating", 4), ARC = O("aggravating", 5);
    rule("aggravating", OH, [PAIN_W, "overhead above_head upar ऊपर shelf shelves top_shelf high_shelf cupboard almari अलमारी"], 7, A);
    rule("aggravating", OH, [PAIN_W, "raise* raising lift* lifting reach* uthana उठाना upar ऊपर comb* kanghi", "arm arms haath हाथ"], 6, { ...A, blockBefore: "lift* carry* heavy", blockAfter: "side sideways" });
    rule("aggravating", OH, [PAIN_W, "haath हाथ arm arms", "upar ऊपर overhead"], 12, { ...A, blockBefore: "lift* carry* heavy", blockAfter: "side sideways" });
    rule("aggravating", OH, [PAIN_W, "reach* reaching", "up above overhead"], 5, { ...A, blockBefore: "avoid* stop* stopped band बंद" });
    rule("aggravating", OH, ["comb* shampoo* wash* brush* tie tying dry* blow_dry* kanghi", "hair baal बाल"], 4, { ctx: "pain", reliefKills: true });
    rule("aggravating", OH, ["reach* reaching", "top high shelf shelves upar overhead above_head cupboard almari अलमारी"], 4, { ctx: "pain", reliefKills: true });
    rule("aggravating", BEHIND, [PAIN_W, "behind_back peeche पीछे back_pocket bra bra_hook apron hook"], 8, A);
    rule("aggravating", BEHIND, [PAIN_W, "behind", "arm arms hand hands haath हाथ"], 9, A);
    rule("aggravating", BEHIND, [PAIN_W, "wash* scratch* scrub* tuck* fasten* zip* hook* unhook* khujan*", "back bra pocket shirt dress peeth पीठ"], 6, A);
    rule("aggravating", ACROSS, [PAIN_W, "across_body across_chest opposite_shoulder other_shoulder dusre_kandhe seatbelt seat_belt"], 8, A);
    rule("aggravating", LYING, [PAIN_W, "sleep* lie lying lay letna लेट* sona सोन* karwat करवट turn_over turning_over roll_over rolling_over", "side taraf तरफ on_shoulder on_that_shoulder on_this_shoulder on_that_side kandha_par कंधा_पर"], 10, A);
    rule("aggravating", LYING, ["cannot cant unable", "sleep* lie lying lay letna लेट* sona सोन*", "side taraf तरफ on_shoulder on_that_shoulder on_this_shoulder kandha_par कंधा_पर"], 7, { block: "better" });
    rule("aggravating", LIFT, ["lift* carry* uthana उठाना", AGG_W], 6, { reliefKills: true, block: "weak* kamzor कमजोर all_day every_day daily din_bhar roz रोज started began", blockBefore: "upar ऊपर overhead above_head", blockAfter: "arm arms haath हाथ shoulder kandha कंधा" });
    rule("aggravating", ARC, ["halfway midway mid_range middle beech बीच aadhe आधे", "raising lifting lift* raise* uthate उठाते up", PAIN_W], 8, A);
    // relieving
    const REST = O("relieving", 0), SUPPORT = O("relieving", 1), ICEHEAT = O("relieving", 2), MEDS = O("relieving", 3), AVOID = O("relieving", 4);
    const HELPS = "help* better relief relieve* relieved eases soothes settles improves theek ठीक rahat राहत kam कम aaram आराम take_edge_off work works worked";
    rule("relieving", REST, ["rest resting rested aaram आराम", "better relief relieves relieved helps eases settles improves theek ठीक rahat राहत kam कम"], 8);
    rule("relieving", SUPPORT, ["sling brace", HELPS], 5);
    rule("relieving", SUPPORT, ["pillow takiya तकिया sling support* sahara सहारा", "arm haath हाथ elbow baju बाजू"], 5, { ctx: "painOrArm" });
    rule("relieving", SUPPORT, ["hold* holding support* supporting cradl* prop*", "arm elbow shoulder kandha", "other_hand opposite_hand dusre_haath"], 8);
    rule("relieving", ICEHEAT, ["ice icing barf बर्फ sekai सिकाई सेक fomentation hot_pack hot_water_bag hot_compress heating_pad heat warm_shower hot_shower warm_bath hot_bath hot_water warm_water garam_paani गरम_पानी गर्म_पानी", HELPS], 5);
    rule("relieving", MEDS, ["painkiller* pain_killer* tablet* tablets medicine* medication* ibuprofen diclofenac paracetamol brufen dawai दवा दवाई goli गोली", HELPS], 6);
    rule("relieving", AVOID, ["avoid* stop* stopped band बंद", "overhead above_head upar ऊपर reaching_up raising_arm lifting_arm"], 5);
    // radiation
    const [NORAD, ELBOW, HAND, NECK, BLADES] = [0, 1, 2, 3, 4].map((i) => O("radiation", i));
    const GOES = "radiat* spread* travel* goes going go jata jati जाता जाती फैल* fail down niche नीचे";
    rule("radiation", ELBOW, [GOES, "elbow kohni कोहनी"], 6, { ctx: "pain" });
    rule("radiation", HAND, [GOES, "hand hands fingers finger ungli उंगली wrist kalai कलाई"], 7, { ctx: "pain" });
    rule("radiation", ELBOW, ["kohni कोहनी elbow", "tak तक till until"], 2, { ctx: "pain" });
    rule("radiation", ELBOW, ["to into till until", "elbow"], 2, { ctx: "pain" });
    rule("radiation", HAND, ["ungli उंगली fingers haath हाथ", "tak तक"], 2, { ctx: "pain" });
    rule("radiation", HAND, [WORDS.NERVE, "hand hands fingers finger haath ungli हाथ उंगली"], 5);
    rule("radiation", NECK, [GOES.replace("down niche नीचे", "up upar ऊपर tak तक"), "neck gardan गर्दन"], 6, { ctx: "pain" });
    rule("radiation", NECK, ["gardan गर्दन", "tak तक"], 2, { ctx: "pain" });
    rule("radiation", BLADES, ["blades blade scapula scapulae", "between beech बीच middle"], 5);
    // red flags
    const FRAC = O("redFlags", 0), CANTLIFT = O("redFlags", 1), PROGR = O("redFlags", 2), NIGHTPOS = O("redFlags", 3), MASS = O("redFlags", 4), INFECT = O("redFlags", 5), CANCER = O("redFlags", 6);
    rule("redFlags", FRAC, ["bone haddi हड्डी", "broken break* bent crooked toot टूट tedha टेढ़"], 5);
    rule("redFlags", FRAC, ["heard suna सुना", "snap* crack* pop*"], 3);
    rule("redFlags", FRAC, ["fracture fractured broken", "think thought suspect* lag लग might maybe"], 5);
    rule("redFlags", FRAC, ["dislocat* utar utra utri उतर उतरा उतरी", "shoulder kandha कंधा"], 4);
    rule("redFlags", FRAC, ["deform* misshap* crooked tedha टेढ़*", "looks look looking dikh* दिख* appears lag लग"], 4, { ctx: "painOrArm" });
    rule("redFlags", CANTLIFT, ["cant cannot unable couldnt nahi नहीं", "lift* raise* move* uthana उठ* utha* upar ऊपर", "arm haath hand shoulder kandha कंधा हाथ", "fall fell fallen accident injury injured trauma hit gir गिर chot चोट"], 14, { selfNeg: true });
    rule("redFlags", PROGR, ["constant* continuous* unrelenting relentless lagatar लगातार", "progressive* worsening increasing getting_worse badh बढ़ every_day roz daily", PAIN_W], 9, { block: "when while if after" });
    rule("redFlags", NIGHTPOS, ["night raat रात", "any every whichever whatever kisi_bhi किसी_भी no_matter koi_bhi", "position positions side way lie lying lay taraf तरफ letna लेट* sona सोन* karwat करवट"], 9, { ctx: "pain" });
    rule("redFlags", MASS, ["lump lumps bump growth mass nodule gaanth गांठ ubhaar उभार", "shoulder collarbone clavicle armpit kandha कंधा baju बाजू"], 6);
    rule("redFlags", INFECT, ["hot warm garam गर्म* गरम* heat*", "red laal लाल redness laali", "swollen swelling puffy sujan सूजन सूजी"], 8);
    rule("redFlags", INFECT, ["hot warm garam गर्म* गरम*", "swollen swelling sujan सूजन", "shoulder joint kandha कंधा"], 8);
    rule("redFlags", INFECT, ["hot warm garam गर्म* गरम* heat*", "red laal लाल redness laali"], 10, { ctx: "painOrArm" });
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
