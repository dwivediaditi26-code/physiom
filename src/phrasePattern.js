// phrasePattern.js -- the "24-hour pattern" question, shared by every region whose form uses the standard six
// answers (Constant / Intermittent / Worse in morning / Worse at night / Activity-related / Improves through the
// day): Elbow, Shoulder, Knee. The wording of these answers is the same in every region, so one list serves all.
// Hip and Ankle/Foot have their own pattern answers and their own lists.
import { WORDS } from "./phraseEngine.js";

const PAIN_W = WORDS.PAIN;

export const PATTERN_PHRASES = {
    "Constant": [
      "~constant", "constant pain", "pain all the time", "pain all day and night", "pain 24 hours", "never goes away",
      "never fully goes away", "always painful", "always there",
      "pain is constant", "pain was constant", "the pain stays constant", "hamesha dard", "hamesha rehta hai", "lagatar dard", "din raat dard", "dard kabhi khatam nahi hota",
      "हमेशा दर्द", "लगातार दर्द", "दिन रात दर्द",
    ],
    "Intermittent": [
      "~intermittent", "comes and goes", "on and off", "now and then", "intermittent pain", "pain is intermittent", "intermittent ache", "occasional twinges", "occasional twinge", "twinges now and then", "occasional pain", "occasionally", "sometimes pain",
      "kabhi kabhi dard", "kabhi hota hai kabhi nahi", "aata jata rehta hai", "thodi der ke liye aata hai",
      "कभी कभी दर्द", "आता जाता रहता है", "थोड़ी देर के लिए आता है",
    ],
    "Worse in morning": [
      "worse in the morning", "worse in morning", "worst in the morning", "stiff in the morning", "morning stiffness",
      "first thing in the morning", "pain on waking", "pain when i wake up",
      "subah zyada dard", "subah dard zyada hota hai", "subah uthte hi dard", "subah akdan", "subah jakdan", "subah jakad jata hai", "subah uthte hi jakad",
      "सुबह ज्यादा दर्द", "सुबह उठते ही दर्द", "सुबह अकड़न", "सुबह जकड़न",
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
      "loosens up during the day", "warms up", "better once i start moving", "once i warm up", "better once i warm up", "improves once i warm up", "improves when i warm up", "improves after warming up", "eases once warmed up", "eases off once i get moving",
      "improves as the day goes on", "improves during the day", "gets easier as the day goes on", "easier later in the day",
      "din me theek ho jata hai", "din chadhte theek", "chalne phirne se aaram", "hilne dulne se aaram",
      "दिन में ठीक हो जाता है", "दिन चढ़ने पर आराम", "हिलने डुलने से आराम",
    ],
};

// Adds region-specific phrases to some answers: extendPhrases(PATTERN_PHRASES, { "Worse at night": ["..."] }).
export const extendPhrases = (base, extra) => {
  const out = { ...base };
  for (const [option, list] of Object.entries(extra)) {
    if (!out[option]) throw new Error("unknown option: " + option);
    out[option] = [...out[option], ...list];
  }
  return out;
};

// The word-order rules for those six answers (positions 0-5 are the answers in the order above).
export function patternRules({ rule, O }) {
  const OPT = O;
    rule("pattern", OPT("pattern", 0), [PAIN_W, "all_day all_time whole_day entire_day whole_time day_and_night 24_hours constantly never_stops never_stop nonstop non_stop din_bhar pura_din poora_din पूरा_दिन पूरे_दिन har_waqt har_samay हर_समय हर_वक्त lagatar लगातार din_raat दिन_रात"], 8,
    { selfNeg: true, noComma: true, block: "after when while during from if only jab जब" });
  rule("pattern", OPT("pattern", 0), ["never", "away stops ends eases go goes", PAIN_W], 6, { selfNeg: true });
  rule("pattern", OPT("pattern", 1), ["sometimes occasionally some_days on_some_days kabhi_kabhi कभी_कभी at_times now_and_then", PAIN_W], 6, { blockAfter: "at_first" });
  rule("pattern", OPT("pattern", 2), ["morning subah सुबह wake* uthte uthne", "worse worst most mostly stiff* zyada ज्यादा akdan akad* अकड* jakad* jakdan जकड़* first pehle पहले"], 6, { ctx: "pain", reliefKills: true });
  rule("pattern", OPT("pattern", 2), ["out_of_bed get_up getting_up", "first most worst worse mostly"], 8, { ctx: "pain", reliefKills: true });
  rule("pattern", OPT("pattern", 2), ["morning mornings subah सुबह uthte uthne wake*", "stiff* akdan akad* अकड* jakad* jakdan जकड़* jam jaam"], 7, { reliefKills: true, noComma: true });
  rule("pattern", OPT("pattern", 2), ["morning mornings subah सुबह", PAIN_W], 4, { reliefKills: true, noComma: true, block: "only_when only_if only_while when while if type" });
  rule("pattern", OPT("pattern", 3), ["night raat रात", "worse worst more zyada ज्यादा badh बढ़ bad"], 7, { ctx: "pain", reliefKills: true });
  // "wakes me at night" is night pain, but "hurts most when I wake up" is morning pain
  rule("pattern", OPT("pattern", 3), ["wakes_me woke_me waking_me wake_me wake_up_at wake_up_in wake_up_during jag jaag जाग* disturb* neend नींद sleep", PAIN_W], 8, { reliefKills: true, noComma: true, unless: "morning mornings subah सुबह first_thing out_of_bed get_up" });
  rule("pattern", OPT("pattern", 2), ["wake_up waking_up woke_up on_waking upon_waking after_waking उठते उठने", PAIN_W], 5, { reliefKills: true, noComma: true, unless: "night raat रात at_night" });
  rule("pattern", OPT("pattern", 3), ["night raat रात", PAIN_W], 4, { reliefKills: true, noComma: true });
  rule("pattern", OPT("pattern", 4), ["only sirf सिर्फ", "use* using work* activity play* kaam काम move* moving hilna swing* throw* serv* reach* raise* lift* run* jog* walk* climb* squat* kneel* jump* daud* दौड़* chalte chalna chalne चलने चलते", PAIN_W], 8);
  rule("pattern", OPT("pattern", 4), ["kaam काम", "dauran दौरान waqt वक्त samay समय", PAIN_W], 7);
  rule("pattern", OPT("pattern", 5), ["better improves improve* eases settles aaram आराम राहत loosen* warm*", "day din दिन moving move* movement activity hours hilna चलने हिलने"], 6, { ctx: "painOrArm" });
}
