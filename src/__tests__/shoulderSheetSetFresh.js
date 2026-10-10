// shoulderSheetSetFresh.js -- a SECOND, fresh exam in the clinician's voice ("the patient", "they", short notes), written AFTER the Shoulder
// matcher had been fixed for the sheet's own sentences (shoulderSheetSet.js). None of these sentences was used to tune the matcher before
// their first run was recorded. Row = [lang, text, must, may] -- same meaning as in shoulderSheetSet.js. The answer keys are DRAFTS written
// by Claude for Aditi to check.
import { KEYS } from "./shoulderWildSets.js";

const { INSID, FALL, DIRECT, FORCED, REPOH, THROW, LIFTOH, POSTOP, AGE, OH, BEHIND, ACROSS, LYING, LIFT, ARC, REST, SUPPORT, ICEHEAT, MEDS, AVOID,
  CONST, INTER, MORN, NIGHT, ACT, IMPR, NORAD, ELBOW, HAND, NECK, BLADES, FRAC, CANTLIFT, PROGR, NIGHTPOS, MASS, INFECT, CANCER } = KEYS;

export const SHOULDER_SHEET_FRESH = [
  // Subacromial pain / rotator cuff tendinopathy
  ["en", "Pain on the outer shoulder when the arm goes above shoulder height, eases when the arm is lowered.", [OH], [ARC, REST]],
  ["en", "Hurts most between about 60 and 120 degrees of lifting the arm out to the side.", [ARC], []],
  ["en", "Cannot comb their hair or reach the top shelf without pain.", [OH], []],
  ["en", "Wakes at night when rolling onto the sore shoulder.", [LYING, NIGHT], []],
  ["en", "Swimmer with a gradual onset of shoulder ache after increasing weekly distance.", [INSID, REPOH], []],
  ["en", "Worse with overhead work, better with rest and a hot pack.", [OH, REST, ICEHEAT], [REPOH]],
  ["en", "Takes ibuprofen and it settles the ache a little.", [MEDS], []],
  ["en", "Pain is constant, a dull ache all day, worse on lifting.", [CONST, LIFT], []],
  ["hi", "Kandhe mein dard jab haath sir ke upar jata hai, aaram karne par kam hota hai.", [OH, REST], []],
  ["hi", "Raat ko us kandhe par letne se aankh khul jati hai.", [LYING, NIGHT], []],
  ["de", "हाथ सिर के ऊपर ले जाने पर कंधे में दर्द, आराम से कम होता है।", [OH, REST], []],
  ["de", "रात को उस कंधे पर लेटने से नींद खुल जाती है।", [LYING, NIGHT], []],
  // Full-thickness tear
  ["en", "Fell onto the shoulder two days ago and cannot lift the arm since.", [FALL, CANTLIFT], [FRAC]],
  ["en", "Felt a tearing sensation lifting a heavy bag off the top shelf.", [LIFTOH], []],
  ["en", "Arm drops when held out, weak in lifting, pain at night.", [NIGHT], [LIFT]],
  ["en", "Older patient, long history of shoulder pain, now suddenly weaker after a jerk.", [], [FORCED, AGE]],
  ["en", "Unable to raise the arm after a road accident, shoulder looks different.", [CANTLIFT, DIRECT], [FRAC]],
  ["hi", "Do din pehle kandhe ke bal gire, tab se haath upar nahi utha pate.", [FALL, CANTLIFT], [FRAC]],
  ["de", "दो दिन पहले कंधे के बल गिरे, तब से हाथ ऊपर नहीं उठा पाते।", [FALL, CANTLIFT], [FRAC]],
  // Frozen shoulder
  ["en", "Progressive stiffness, cannot reach the back pocket or fasten a bra.", [BEHIND], []],
  ["en", "Shoulder is stiff in every direction and aches badly when they lie down.", [], [LYING, NIGHT]],
  ["en", "Diabetic patient, gradual loss of movement over four months, no injury.", [INSID], []],
  ["en", "Night pain is the worst part, they get about two hours of sleep.", [NIGHT], []],
  ["en", "Developed after six weeks in a sling following the wrist fracture.", [], [POSTOP]],
  ["en", "Cannot put the arm into a coat sleeve.", [], [BEHIND]],
  ["hi", "Peeche pocket tak haath nahi pahunchta, kandha bahut akda hua hai.", [BEHIND], [MORN]],
  ["de", "पीछे जेब तक हाथ नहीं पहुंचता, कंधा बहुत अकड़ा हुआ है।", [BEHIND], [MORN]],
  // AC joint
  ["en", "Tender at the top of the shoulder after a bike crash onto the point of the shoulder.", [FALL], [DIRECT]],
  ["en", "Pain when the arm is brought across the chest, and when pushing up from a chair.", [ACROSS], []],
  ["en", "Gym-goer with an ache at the end of the collarbone, worse on bench press and push-ups.", [LIFT], [INSID, ACROSS]],
  ["en", "Cannot lie on that side because of the pain on top of the shoulder.", [LYING], []],
  ["en", "A step deformity at the collarbone since being tackled.", [DIRECT], [FRAC, MASS]],
  ["hi", "Kandhe ke upar dard, haath seene ke saamne se le jane par badhta hai.", [ACROSS], []],
  ["de", "कंधे के ऊपर दर्द, हाथ सीने के सामने से ले जाने पर बढ़ता है।", [ACROSS], []],
  // Biceps / SLAP
  ["en", "Deep pain at the front of the shoulder when throwing, with a pop when it started.", [THROW], []],
  ["en", "Painful clicking in the shoulder when lifting overhead.", [OH], [LIFT, LIFTOH]],
  ["en", "Fell on the outstretched arm and since then has pain at the front when lifting.", [FALL, LIFT], []],
  ["en", "Tender along the biceps tendon, pain reaching behind the back.", [BEHIND], []],
  ["en", "Weightlifter with pain when curling and when pressing overhead.", [OH, LIFT], []],
  ["hi", "Gend phenkte waqt kandhe ke aage tez dard, shuru mein pop ki awaaz.", [THROW], []],
  ["de", "गेंद फेंकते समय कंधे के आगे तेज दर्द, शुरू में पॉप की आवाज़।", [THROW], []],
  // Instability
  ["en", "Shoulder dislocated during a rugby tackle, has had two more since.", [DIRECT], [FRAC, FORCED, THROW]],
  ["en", "Feels apprehensive with the arm raised and turned back.", [], [OH, FORCED]],
  ["en", "Slips out in sleep when the arm is above the head.", [], [OH, LYING, NIGHT]],
  ["en", "Hyperlaxity, the arm clunks out when reaching for a seat belt.", [ACROSS], []],
  ["en", "Throwing athlete whose shoulder gives way on the follow-through.", [THROW], []],
  ["hi", "Rugby mein tackle ke baad kandha utra, uske baad do baar aur.", [DIRECT], [FRAC]],
  ["de", "रग्बी में टैकल के बाद कंधा उतरा, उसके बाद दो बार और।", [DIRECT], [FRAC]],
  // Calcific
  ["en", "Woke with sudden severe shoulder pain, no injury, could not lift the arm.", [INSID], [NIGHT, OH]],
  ["en", "Pain is sharp and constant, ice helps a little.", [CONST, ICEHEAT], []],
  ["en", "Forty-five year old with acute severe pain at the top of the shoulder, no recent trauma.", [INSID], []],
  ["en", "Cannot sleep at all for three nights because of the pain.", [NIGHT], []],
  ["hi", "Achanak kandhe mein bahut tez dard, koi chot nahi, haath upar nahi utha pa rahe.", [INSID], []],
  ["de", "अचानक कंधे में बहुत तेज दर्द, कोई चोट नहीं, हाथ ऊपर नहीं उठा पा रहे।", [INSID], []],
  // GH osteoarthritis
  ["en", "Elderly patient with a grinding shoulder and morning stiffness lasting 20 minutes.", [MORN, AGE], []],
  ["en", "Aches in cold weather, worse when reaching behind, better after a warm shower.", [BEHIND, ICEHEAT], [IMPR]],
  ["en", "Previous dislocation 20 years ago, shoulder gradually stiffer since.", [INSID], [AGE]],
  ["en", "Constant deep ache, worse at night, cannot lie on it.", [CONST, NIGHT, LYING], []],
  ["en", "Loosens up after moving around for an hour.", [IMPR], []],
  ["hi", "Subah kandha akda rehta hai, thoda hilane par dheela ho jata hai.", [MORN], [IMPR]],
  ["de", "सुबह कंधा अकड़ा रहता है, थोड़ा हिलाने पर ढीला हो जाता है।", [MORN], [IMPR]],
  // Cervical referral
  ["en", "Neck stiffness with arm pain down to the elbow, shoulder moves freely.", [ELBOW], [NECK]],
  ["en", "Pins and needles in the hand when looking down for long.", [HAND], []],
  ["en", "Pain goes up the side of the neck and between the shoulder blades.", [NECK, BLADES], []],
  ["en", "Shoulder movements do not reproduce the pain, neck turning does.", [], [NECK]],
  ["hi", "Gardan akdi hui, dard kohni tak aata hai, kandha aaram se hilta hai.", [ELBOW], [NECK]],
  ["de", "गर्दन अकड़ी हुई, दर्द कोहनी तक आता है, कंधा आराम से हिलता है।", [ELBOW], [NECK]],
  // Red flags
  ["en", "Constant unrelenting pain that no position eases, getting worse each day.", [PROGR, CONST], [NIGHTPOS, NIGHT]],
  ["en", "Hard lump over the collarbone, noticed three weeks ago.", [MASS], []],
  ["en", "Hot, red and swollen shoulder with a fever.", [INFECT], []],
  ["en", "Treated for breast cancer five years ago, now new shoulder pain.", [CANCER], []],
  ["en", "Pain at night in whatever position they lie.", [NIGHTPOS, NIGHT], [LYING]],
  ["hi", "Kandhe par gaanth mehsoos hoti hai, kuch hafton se.", [MASS], []],
  ["de", "कंधे पर गांठ महसूस होती है, कुछ हफ्तों से।", [MASS], []],
  // radiation and relief
  ["en", "Pain stays in the shoulder and does not go anywhere.", [NORAD], []],
  ["en", "Pain travels down the outer arm to the elbow but not past it.", [ELBOW], []],
  ["en", "Resting the arm on a pillow or in a sling takes the strain off.", [SUPPORT, REST], []],
  ["en", "Avoids lifting the arm above the shoulder because it hurts.", [AVOID], [OH]],
  ["en", "Heat pack helps a lot, ibuprofen only a little.", [ICEHEAT, MEDS], []],
  ["en", "Pain only when they play tennis, nothing otherwise.", [ACT], [THROW]],
  ["en", "Comes and goes through the week.", [INTER], []],
  ["hi", "Dard kandhe mein hi rehta hai, kahin aur nahi jata.", [NORAD], []],
  ["de", "दर्द कंधे में ही रहता है, कहीं और नहीं जाता।", [NORAD], []],
  // must stay silent
  ["en", "Patient works as a driver and lives in Surat.", [], []],
  ["en", "Medical history: type 2 diabetes, on metformin.", [], []],
  ["en", "Pain score is 6 out of 10.", [], []],
  ["en", "He has been referred by his employer.", [], []],
  ["en", "She would like to return to tennis eventually.", [], []],
  ["en", "Husband brought the patient to the clinic.", [], []],
  ["hi", "Mareez ko pichle hafte doctor ne dekha tha.", [], []],
  ["de", "मरीज़ की उम्र पचास साल है।", [], []],
];
