/* ============================================================
   orthoRegionAiFill.js — turns a raw /api/parse result into answers for
   the region-specific Subjective checklist (orthoSubjectiveRegionData.js),
   so "AI Parse" fills the same fields a clinician would tick by hand.

   Why this exists (2026-10-07, Aditi: "see if the AI extracted subjective
   assessment fills out all the manual subjective assessment"): the mapper
   in orthoAiIntake.js only ever filled the generic Subjective/Pain fields.
   The region tabs stayed empty -- and on the AI-first screen they did not
   even get the "From AI intake" note.

   Rules this file lives by:
   - Evidence only. An option is ticked only when the extracted wording
     really names it (or a clear lay synonym of it). A missing option is
     always safer than a wrong tick -- these fields feed the clinical
     reasoning engines.
   - Negation is respected ("no trauma" never ticks a trauma option).
   - Direction and side must be stated: "stairs" alone never ticks
     "Stairs (up)" or "Stairs (down)"; "(L)" options need "left" (or the
     narrative's own laterality).
   - Never ticks "No red flags"/"None of the above" style answers from
     silence, and never fills irritability, Lhermitte, referral action or
     bladder baseline -- those need the clinician's own question.
   Everything not ticked still reaches the clinician through the "From AI
   intake" note, so nothing the AI heard is lost.
   ============================================================ */
import { contentKeyForRegion, subjectiveFieldsForRegion } from "./orthoSubjectiveRegionData.js";

const NEG = new Set(["no", "not", "denies", "denied", "deny", "without", "never", "nil", "negative", "isnt", "wasnt", "dont", "doesnt", "didnt", "cannot", "cant"]);
const STOP = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or", "my", "his", "her", "their", "is", "it", "its", "that", "this", "when", "while", "by", "from", "as", "be", "are", "was", "has", "have", "had", "very", "some", "any", "also", "into", "than", "then", "just", "about", "e", "g"]);
// Words that, alone, are never enough evidence for an option.
const TOO_GENERIC = new Set(["bilateral", "central", "left", "right", "upper", "lower", "mid", "anterior", "posterior", "lateral", "medial", "pain", "joint", "movement", "activity", "other", "none", "diffuse", "area", "region", "side", "general", "test", "symptom"]);
// Words that only decorate an option ("Walking distance", "Sitting tolerance").
const FILLER = new Set(["distance", "tolerance", "participation", "demand", "task", "duration", "any", "symptom"]);
// A lone short word is no evidence -- except these.
const SHORT_OK = new Set(["ice", "tap", "run", "si", "fall", "rest", "heat"]);

function stem(word) {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  if (w.length > 3 && /(.)\1$/.test(w) && !/(ss|ll)$/.test(w)) w = w.slice(0, -1);
  return w;
}

function rawWords(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

/* Lay wording -> the option wording it means. Each entry's output is a list
   of canonical phrases separated by "|"; a canonical phrase can only tick an
   option whose own words appear inside it as one run, so one lay phrase
   never leaks into a neighbouring option ("groin" ticks "Anterior groin",
   never "Anterior hip"). */
const LEX = [
  [/\b(up ?stairs|climbing (the )?stairs|going up (the )?stairs|stairs? up|walking up (the )?stairs)\b/, "stairs up"],
  [/\b(down ?stairs|descending stairs|going down (the )?stairs|stairs? down|coming down (the )?stairs|walking down (the )?stairs)\b/, "stairs down"],
  [/\bstairs?\b/, "stairs"],
  // shoulder / upper limb
  [/\b(overhead|above (my |the )?head|raising (my |the )?arm|lifting (my |the )?arm up|reaching up|high shelf|washing (my )?hair|combing)\b/, "overhead reaching|overhead activities"],
  [/\b(behind (my |the )?back|tuck(ing)? (in )?(a |my )?shirt|hook(ing)? (a |my )?bra|back pocket)\b/, "reaching behind back"],
  [/\b(across (my |the )?body|cross[- ]body)\b/, "reaching across the body"],
  [/\b(lying|sleeping|lie|sleep|lies|slept) (on|onto) (the |my |that |this |affected )?(left |right )?(shoulder|side)\b/, "lying on the shoulder|lying on affected side|sleeping on that side"],
  [/\b(front of (the |my )?shoulder|anterior shoulder)\b/, "anterior shoulder"],
  [/\b(outer (part|side)? ?(of )?(the |my )?shoulder|side of (the |my )?shoulder|deltoid|lateral shoulder)\b/, "lateral shoulder"],
  [/\b(back of (the |my )?shoulder|posterior shoulder)\b/, "posterior shoulder"],
  [/\b(ac joint|acromioclavicular)\b/, "ac joint"],
  [/\b(biceps tendon|bicipital)\b/, "bicipital groove"],
  [/\b(subacromial|impingement|under the (acromion|bone))\b/, "subacromial"],
  [/\bpainful arc\b/, "painful arc"],
  [/\b(shoulder blade border|scapular border|medial border of the scapula)\b/, "scapular border"],
  [/\bupper arm\b/, "upper arm"],
  [/\b(sport|throwing|bowling|cricket|tennis|badminton|swimming|gym|weights?|racquet|football|soccer|basketball|volleyball)\b/, "work sport|sport"],
  [/\b(work|job|office|desk|computer|lifting at work|labou?r|warehouse|factory)\b/, "work demands|work"],
  [/\b(dress(ing)?|putting on (a |my )?(shirt|jacket|clothes|coat)|wearing (a |my )?(shirt|jacket|clothes))\b/, "dressing"],
  [/\b(carry(ing)?|shopping|groceries|bags?)\b/, "carrying"],
  [/\blift(ing|s)?\b(?! (up )?(my |the |his |her )?(arm|hand|leg|head|knee))/, "lifting"],
  [/\bgrip(ping)?\b|\bholding tools\b/, "gripping"],
  [/\b(typing|keyboard|mouse)\b/, "repetitive typing mouse use|typing"],
  [/\bwriting\b/, "typing|writing"],
  [/\b(jar|bottle|door ?knob|buttons?|zip|fine motor|small objects)\b/, "fine motor"],
  [/\bsustained grip\b/, "sustained grip"],
  [/\b(thumb (movement|use)|using (my )?thumb)\b/, "thumb movements"],
  // knee / hip / ankle
  [/\b(kneecap|patella|patellar)\b/, "around the kneecap"],
  [/\b(front of (the |my )?knee|anterior knee)\b/, "anterior"],
  [/\b(below (the |my )?(kneecap|patella)|patellar tendon|tibial tuberosity)\b/, "below the kneecap|below the joint line"],
  [/\b(above (the |my )?(kneecap|patella)|quad(riceps)? tendon)\b/, "above the kneecap"],
  [/\b(inner (side|part)? ?(of )?(the |my )?(knee|ankle|elbow)|inside of (the |my )?(knee|ankle|elbow)|medial (knee|joint line))\b/, "medial joint line|medial ankle ligaments|medial elbow"],
  [/\b(outer (side|part)? ?(of )?(the |my )?(knee|ankle|elbow)|outside of (the |my )?(knee|ankle|elbow)|lateral (knee|joint line))\b/, "lateral joint line|lateral ankle ligaments|lateral elbow"],
  [/\b(back of (the |my )?knee|popliteal|behind (the |my )?knee)\b/, "behind the knee"],
  [/\b(squat(ting)?|kneel(ing)?|crouch(ing)?)\b/, "squatting|kneeling"],
  [/\b((sitting|sit) (for )?(a )?(long|prolonged|extended)|(long|prolonged|extended) (periods? of )?sitting|movie sign|cinema)\b/, "prolonged sitting"],
  [/\btwist(ing)?\b/, "twisting"],
  [/\b(pivot(ing)?|change of direction|side ?step(ping)?)\b/, "pivoting|pivoting cutting movement"],
  [/\bcutting (movement|manoeuvre|maneuver)s?\b|\bcutting (and|or) (pivoting|turning)\b/, "pivoting cutting movement"],
  [/\b(brace|knee support|strapping)\b/, "support brace|splint brace"],
  [/\b(splint)\b/, "splint brace"],
  [/\b(groin)\b/, "anterior groin"],
  [/\b(side of (the |my )?hip|outer hip|lateral hip|trochanter|trochanteric)\b/, "lateral hip"],
  [/\b(buttock|glute(al)?|deep in (the )?(bum|buttock))\b/, "deep buttock"],
  [/\b(sit ?bone|ischial)\b/, "ischial tuberosity"],
  [/\b(inner thigh|adductor)\b/, "adductor inner thigh"],
  [/\bpubic\b/, "pubic symphysis"],
  [/\b(sacroiliac|si joint)\b/, "si joint"],
  [/\b(cross[- ]legged|crossing (my )?legs)\b/, "sitting cross legged"],
  [/\b(getting (in|out) of (a |the )?car|out of the car|car transfer)\b/, "getting out of a car"],
  [/\b(low (chair|seat|sofa)|from a chair|getting up from (a |the )?(chair|sofa|toilet)|sit[- ]to[- ]stand)\b/, "getting up from low chairs"],
  [/\b(walk(ing|s)?)\b/, "walking"],
  [/\b(run(ning)?|jog(ging)?)\b/, "running"],
  [/\b(painless click\w*|click\w* (that is |which is )?painless)\b/, "clicking painless"],
  [/\b(painful click\w*|click\w* (with|and|that hurts?) pain)\b/, "clicking with pain"],
  [/\bcatch(ing)?\b/, "catching sensation"],
  [/\bsnap(ping)?\b/, "snapping"],
  [/\b(grind(ing)?|crepitus|crunch(ing)?)\b/, "crepitus grinding"],
  [/\b(outer ankle|lateral ankle|ankle ligament|rolled (my |his |her )?ankle|ankle sprain)\b/, "lateral ankle ligaments"],
  [/\b(front of (the |my )?ankle|anterior ankle)\b/, "anterior ankle"],
  [/\b(back of (the |my )?ankle|posterior ankle)\b/, "posterior ankle"],
  [/\b(achilles)\b.*\b(insertion|heel bone|where it attaches)|\binsertional\b/, "achilles tendon insertional"],
  [/\b(achilles)\b.*\b(mid[- ]?portion|midportion|few centimet(er|re)s above|middle)|\bmid[- ]?portion\b/, "achilles tendon mid portion"],
  [/\b(plantar|sole|arch|underneath (the |my |his |her )?(foot|heel)|under (the |my |his |her )?(heel|foot)|bottom of (the |my |his |her )?(heel|foot))\b|(?<!(above|behind|back of|over) (the |my |his |her )?)\bheel (pain|spur)|\b(left |right )?heel\b(?!.*achilles)(?<!(above|behind|back of|over) (the |my |his |her )?(left |right )?heel)/, "plantar heel"],
  [/\b(big toe|great toe|hallux|1st mtp|first mtp)\b/, "1st big toe joint"],
  [/\b(forefoot|ball of (the |my )?foot|metatarsal)\b/, "forefoot metatarsals"],
  [/\b(top of (the |my )?foot|dorsum)\b/, "top of the foot"],
  [/\b(first steps?|first thing in the morning|getting out of bed)\b/, "first steps in the morning"],
  [/\b(inversion|rolled (my |his |her |the )?ankle (in|inwards?)|rolled (it )?(in|inwards?))\b/, "inversion sprain"],
  [/\b(eversion|rolled (my |his |her |the )?ankle (out|outwards?))\b/, "eversion sprain"],
  [/\b(new shoes|different shoes|change in (footwear|surface)|new surface)\b/, "change in footwear surface"],
  [/\b(increas\w* (my |his |her |the )?(\w+ )?(mileage|training|running|volume|load)|ramped up|more miles|training load|sudden increase)\b/, "sudden increase in training"],
  // elbow / wrist / hand
  [/\b(tennis elbow|lateral epicondyl\w*|outer elbow|outside of (the |my )?elbow)\b/, "lateral elbow"],
  [/\b(golfer'?s? elbow|medial epicondyl\w*|inner elbow|inside of (the |my )?elbow)\b/, "medial elbow"],
  [/\b(back of (the |my )?(wrist|hand)|dorsal wrist)\b/, "dorsal wrist"],
  [/\b(palm side|volar|palm-side)\b/, "volar wrist"],
  [/\b(thumb side|radial wrist|de ?quervain)\b/, "radial wrist"],
  [/\b(little finger side|pinky side|ulnar wrist)\b/, "ulnar wrist"],
  [/\b(night|woke|waking|wakes)\b.*\b(numb\w*|tingl\w*|pins)\b|\b(numb\w*|tingl\w*|pins)\b.*\b(night|woke|waking|wakes)\b/, "numbness tingling night dominant"],
  [/\b(elbow (bent|flexed|flexion)|bending (my |the )?elbow|phone to (my )?ear)\b/, "numbness tingling worse with elbow flexion"],
  [/\b(thumb|index|middle finger)\b.*\b(numb\w*|tingl\w*|pins)\b|\b(numb\w*|tingl\w*|pins)\b.*\b(thumb|index|middle finger)\b/, "numbness tingling thumb index middle finger"],
  [/\b(ring|little|pinky)\b.*\b(numb\w*|tingl\w*|pins)\b|\b(numb\w*|tingl\w*|pins)\b.*\b(ring finger|little finger|pinky)\b/, "numbness tingling ring and little finger"],
  [/\b(drop(ping|s)? (things|objects|cups|items|plates))\b/, "dropping objects"],
  [/\b(weak(ness)? (in |of )?(my |the |her |his )?grip|grip weakness|weak grip)\b/, "weakness in grip"],
  [/\b(into (the |my )?fingers|to (the |my )?fingers)\b/, "into the fingers"],
  [/\b(up (the |my )?forearm)\b/, "up the forearm"],
  // onset / mechanism wording (also matches the AI's own onset labels)
  [/\bgradual\b.*\binsidious\b|\binsidious\b|\bgradual\b|\bcame on slowly\b|\bcrept\b/, "insidious onset overuse|insidious overuse|no clear mechanism insidious onset|insidious postural sustained|insidious"],
  [/\b(repetitive strain|overuse|repetitive|repeated(ly)?)\b/, "insidious overuse|insidious onset overuse"],
  [/\bno clear cause\b/, "no clear mechanism insidious onset|no clear mechanism|no identified mechanism"],
  [/\b(degenerat\w*|wear and tear|osteoarthritis|age[- ]related)\b/, "age related degenerative"],
  [/\b(fell|fall|fallen|slip(ped)?|tripp?ed?)\b/, "fall"],
  [/\b(outstretched|put (my |his |her )?hand (out|down)|landed on (my |his |her )?(hand|wrist))\b/, "fall onto outstretched hand|fall onto shoulder outstretched hand"],
  [/\b(direct blow|hit directly|struck|knocked|tackle[d]?|blow to)\b/, "direct blow|direct impact|direct trauma"],
  [/\b(road traffic|mva|whiplash|car accident|motor vehicle)\b/, "mva whiplash|motor vehicle accident|mva thoracic component"],
  [/\b(rear[- ]end(ed)?)\b/, "whiplash rear end mva"],
  [/\b(surgery|surgical|post[- ]?op(erative)?|operation|replacement|repair|reconstruction)\b/, "post surgical"],
  [/\b(sleep(ing)? (position|awkwardly|wrong)|slept (awkwardly|wrong|funny))\b/, "sleeping position"],
  [/\b(poor posture|bad posture|slouch(ing|ed)?|hunch(ed|ing)?|desk posture|sustained posture)\b/, "sustained poor posture over time|insidious postural sustained"],
  [/\b(computer|laptop|screen|desk job)\b/, "prolonged computer desk posture|computer work|computer screen use"],
  [/\b(sitting at (a |the |my )?desk|desk work|office work|sitting at (a |the |my )?computer)\b/, "prolonged computer desk posture|reading desk work"],
  [/\b(lifting|lifted|heavy (box|bag|load|weight))\b/, "lifting heavy load|lifting injury"],
  [/\b(lift\w*.*twist\w*|twist\w*.*lift\w*)\b/, "lifting spine rotated"],
  [/\btwisting injury\b/, "non contact twisting|twisting without lifting|rotation injury"],
  [/\b(twist(ed|ing)|rotat(ed|ing) (my |his |her )?(spine|back|trunk))\b/, "twisting"],
  [/\b(twist(ed|ing)|pivot(ed|ing)) (his |her |my |the )?(knee|hip|ankle)\b|\bnon[- ]contact\b/, "non contact twisting|twisting"],
  [/\b(bend(ing)? (forward|over|down)|bent over|stoop(ing)?|forward bend|over the sink)\b/, "forward bent posture|bending to floor level|bending forward without lifting"],
  [/\b(post[- ]?partum|after (the )?(birth|delivery|baby)|breast ?feeding|new baby|lifting (the )?baby)\b/, "post partum"],
  [/\b(kick(ing)?)\b/, "kicking mechanism"],
  [/\b(lung(e|ing)|lunges)\b/, "lunging mechanism"],
  [/\b(landing|landed|land(ing)? from)\b/, "landing from a jump"],
  [/\bhyper ?extension\b/, "hyperextension"],
  [/\b(return(ed|ing)? to (sport|running|training|gym))\b/, "return to sport after time off"],
  // spine
  [/\b(looking down|bending (my |the )?neck forward|neck flexion)\b/, "flexion looking down"],
  [/\b(looking up|tilting (my |the )?head back|neck extension|looking at the ceiling)\b/, "extension looking up"],
  [/\b(turn(ing)? (my |the |his |her )?(head|neck) (to )?(the )?left|rotat\w* (to )?(the )?left|look(ing)? (over (my )?)?left)\b/, "rotation left"],
  [/\b(turn(ing)? (my |the |his |her )?(head|neck) (to )?(the )?right|rotat\w* (to )?(the )?right|look(ing)? (over (my )?)?right)\b/, "rotation right"],
  [/\b(driving|reversing|shoulder check|looking over (my )?shoulder)\b/, "driving head rotation restricted"],
  [/\b(sit(ting)?)\b/, "sitting"],
  [/\b(stand(ing)?)\b/, "standing"],
  [/\b(lying (flat|down)|lying on (my )?back)\b/, "lying flat supine"],
  [/\b(putting on (my )?(shoes|socks)|shoes and socks|tying (my )?shoe)\b/, "putting on shoes and socks"],
  [/\b(turn(ing)? over in bed|rolling over)\b/, "bed mobility turning over"],
  [/\b(out of bed|getting up from bed)\b/, "getting out of bed"],
  [/\b(cough(ing)?|sneez(e|ing))\b/, "coughing sneezing|coughing|sneezing"],
  [/\b(deep breath(ing)?|breathing in|inhal(e|ing))\b/, "deep breathing in"],
  [/\b(between (my |the )?shoulder blades?|interscapular|inter-scapular)\b/, "interscapular central"],
  [/\b(upper back|upper thoracic)\b/, "upper thoracic t1 t4"],
  [/\b(mid(dle)? back|mid[- ]thoracic|middle of the back)\b/, "mid thoracic t5 t8"],
  [/\b(lower thoracic|thoracolumbar)\b/, "lower thoracic t9 t12"],
  [/\b(ribs?|rib cage)\b/, "costovertebral lateral|lateral chest wall"],
  [/\b(base of (the |my )?skull|suboccipital)\b/, "suboccipital base of skull"],
  [/\b(back of (the |my )?neck|posterior neck)\b/, "posterior neck central"],
  [/\b(front of (the |my )?neck|anterior neck|throat)\b/, "anterior neck"],
  [/\b(trap(ezius)?|upper trap)\b/, "trapezius"],
  [/\b(levator)\b/, "levator scapulae"],
  [/\b(arm|hand) (above|over|on top of) (my |his |her )?head|hand on (my |his |her )?head\b/, "arm overhead relieves arm symptoms"],
  [/\b(heat|hot (shower|pack|water|bag)|heating pad)\b/, "heat"],
  [/\b(ice|cold (pack|compress)|cold)\b/, "ice"],
  [/\b(painkiller|pain ?killer|ibuprofen|paracetamol|tablet|medicine|medication|anti-?inflammatory|nsaid)\b/, "medication"],
  [/\b(rest(ing)?)\b/, "rest"],
  [/\b(stretch(ing)?)\b/, "stretching"],
  [/\b(tap(e|ing|ed))\b/, "taping"],
  [/\b(walk(ing)? slowly|gentle walk(ing)?|slow walk)\b/, "walking slowly"],
  [/\b(leaning forward|lean(ing)? on (a )?(trolley|cart|counter))\b/, "leaning forward on trolley counter"],
  [/\b(knees? (bent|up)|crook lying|pillow under (my )?knees?)\b/, "lying with knees bent crook lying"],
  [/\b(cancer|tumou?r|malignan\w*|carcinoma)\b/, "cancer history|known cervical cancer tumour|history of cancer any|cancer history any"],
  [/\b(weight loss|lost weight|losing weight)\b/, "unexplained weight loss"],
  [/\b(fever|chills|night sweats|unwell)\b/, "fever systemically unwell|constitutional symptoms"],
  [/\bosteoporo\w*\b/, "known osteoporosis pathological fracture risk"],
  [/\bminor (trauma|fall)\b.*\bosteoporo\w*|\bosteoporo\w*\b.*\bminor (trauma|fall)\b/, "minor trauma known osteoporosis"],
  [/\b(locked knee|(can'?t|cannot|unable to|won'?t) (fully )?(straighten|extend)( (the |my |his |her )?knee)?)\b/, "locked knee that won t straighten"],
  [/\b(unable|cannot|can'?t|not able) to (bear|take) weight|\bnon[- ]weight[- ]?bearing\b/, "unable to bear weight for 4 steps|cannot weight bear 4 steps|suspected fracture cannot weight bear"],
  [/\b(immediate(ly)?|straight away)\b.*\bswell\w*|\bswell\w*\b.*\b(immediate(ly)?|straight away)\b|\bhaemarthrosis|\bhemarthrosis/, "immediate marked swelling after injury"],
  [/\b(unsteady|wide[- ]based|balance (problem|issue)s?|ataxi\w*|gait (disturbance|problem)|stumbl\w*)\b/, "gait disturbance wide based gait"],
  [/\bbilateral (leg|lower limb)s? weak\w*|both legs? (are |is )?weak/, "bilateral leg weakness new onset|bilateral lower limb weakness or stiffness"],
  [/\b(bladder|urinary) incontinen\w*/, "bladder incontinence new onset unexpected"],
  [/\bbowel incontinen\w*/, "bowel incontinence new onset unexpected"],
  [/\b(back of (the |my |her |his )?(left |right )?thigh|hamstring)/, "posterior thigh"],
  [/\b(front of (the |my |her |his )?(left |right )?thigh)/, "anterior thigh"],
  [/\b(side|outer) of (the |my |her |his )?(left |right )?thigh/, "lateral thigh"],
  [/\b(steroid|cortisone|prednisolone)\b/, "long term corticosteroid use"],
  [/\b(night pain|pain at night|wakes? (me |her |him )?(up )?(at night|with pain)|disturbs? sleep)\b/, "night pain unrelated to position|progressive night pain|night pain awakens patient progressive"],
  [/\b(constant (pain )?(unrelated|unaffected|regardless)|unremitting|unrelenting|pain (is )?constant and unaffected)\b/, "constant progressive pain unrelated to movement|constant pain completely unaffected by position or movement|constant pain unaffected|constant progressive pain unrelated to loading"],
  [/\b(saddle|perineum|numbness (in|around) (the )?(groin|genitals|inner thighs))\b/, "saddle area anaesthesia perineum inner thighs"],
  [/\b(urinary retention|cannot (pass|urinate)|can'?t (pass|urinate))\b/, "bladder retention cannot urinate"],
  [/\b(dizz(y|iness)|vertigo|light-?headed)\b/, "dizziness with neck movement"],
  [/\b(double vision|diplopia)\b/, "diplopia"],
  [/\b(drop attack)\b/, "drop attacks"],
  [/\b(slurred|slurring)\b/, "dysarthria"],
  [/\b(clumsy|clumsiness|difficulty with buttons|can'?t (do|fasten) (up )?(my )?buttons)\b/, "loss of fine motor control buttons writing"],
  [/\b(chest tightness|chest pain|heart)\b/, "cardiac symptoms with pain"],
  [/\b(shortness of breath|breathless|haemoptysis|coughing blood)\b/, "respiratory symptoms shortness of breath"],
];

// Applies every lay-wording rule to a clause. A rule is skipped when the
// matched wording is negated ("no trauma", "denies a fall").
function canonicalPhrases(clause) {
  const lower = clause.toLowerCase().replace(/[‘’]/g, "'");
  const out = [];
  LEX.forEach(([re, canon]) => {
    const m = re.exec(lower);
    if (!m) return;
    const before = lower.slice(Math.max(0, m.index - 28), m.index);
    if (/\b(no|not|denies|denied|without|never|nil|negative|isn'?t|wasn'?t|doesn'?t|didn'?t)\s+(\w+\s+){0,2}$/.test(before)) return;
    canon.split("|").forEach((c) => out.push(c));
  });
  return out.map((c) => rawWords(c).filter((w) => !STOP.has(w)).map(stem)).filter((a) => a.length);
}

// A phrase is split into clauses so a negation never leaks across them.
function clausesOf(text) {
  return String(text || "").split(/[.;,\n]|\bbut\b|\bhowever\b|\balthough\b/i).map((c) => c.trim()).filter(Boolean);
}

function tokenize(text) {
  return rawWords(text).map((w) => ({ w: stem(w), raw: w, neg: NEG.has(w), stop: STOP.has(w) })).filter((t) => !t.stop);
}

// Option label -> alternatives; each alternative is the list of stems that
// must all appear together for the option to count as named.
function optionAlternatives(label) {
  const direction = /\((up|down)\)/i.exec(label);
  const side = /\((l|r)\)/i.exec(label);
  const parens = [];
  const noParen = label.replace(/\(([^)]*)\)/g, (m, inner) => {
    if (!/^(up|down|l|r)$/i.test(inner.trim()) && !/e\.g\./i.test(inner)) parens.push(inner);
    return " ";
  });
  const compound = / — /.test(noParen);
  let parts = [noParen];
  if (!compound && noParen.includes("/")) {
    const sides = noParen.split("/");
    const wordCount = (t) => rawWords(t).length;
    const looksLikeNounPair = sides.length === 2 && wordCount(sides[0]) >= 3 && wordCount(sides[1]) === 1;
    if (!looksLikeNounPair) parts = sides;
  }
  const lists = parts;
  return lists.map((alt) => {
    const stems = rawWords(alt.replace(/\s—\s|\s-\s/g, " ")).filter((w) => !STOP.has(w) && !FILLER.has(w) && !FILLER.has(stem(w))).map(stem);
    return { stems, dir: direction ? direction[1].toLowerCase() : null, side: side ? (side[1].toLowerCase() === "l" ? "left" : "right") : null };
  }).filter((a) => a.stems.length);
}

function containsRun(seq, run) {
  if (!run.length) return false;
  for (let i = 0; i + run.length <= seq.length; i++) {
    let ok = true;
    for (let j = 0; j < run.length; j++) if (seq[i + j] !== run[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

function altMatches(alt, tokens, canon, sideHint, canonOnly = false) {
  const meaningful = alt.stems.filter((s) => !TOO_GENERIC.has(s));
  if (!meaningful.length) return false;
  if (alt.stems.length === 1 && alt.stems[0].length < 4 && !SHORT_OK.has(alt.stems[0])) return false;
  const run = alt.dir ? [...alt.stems, stem(alt.dir)] : alt.stems;
  const stems = tokens.map((t) => t.w);
  const sideOk = !alt.side || stems.includes(alt.side) || sideHint === alt.side;
  if (!sideOk) return false;
  // 1) a canonical (lay-wording) phrase that holds the option's own words
  if (canon.some((c) => containsRun(c, run))) return true;
  if (canonOnly) return false;
  // 2) the option's own words, close together, in what was actually said
  const need = alt.dir ? run : alt.stems;
  const idx = need.map((s) => stems.indexOf(s));
  if (idx.some((i) => i < 0)) return false;
  const span = Math.max(...idx) - Math.min(...idx);
  if (span > need.length + 1) return false;
  const first = Math.min(...idx);
  const before = tokens.slice(Math.max(0, first - 3), first);
  if (before.some((t) => t.neg)) return false;
  return true;
}

// Wording that blocks an otherwise matching option ("lift the arm" is not
// "Lifting" objects).
const VETO = [
  [/\blift(ing|s)? (up )?(my |the |his |her )?(arm|hand|leg|head)|\b(cannot|can'?t|unable to) lift\b/, /^(lifting|carrying \/ lifting|lifting overhead)$/i],
];

function matchOptions(options, phrases, { sideHint = "", max = Infinity, canonOnly = false } = {}) {
  const scored = new Map();
  phrases.flatMap(clausesOf).forEach((clause) => {
    const tokens = tokenize(clause);
    const canon = canonicalPhrases(clause);
    const hasSide = tokens.some((t) => t.w === "left" || t.w === "right");
    options.forEach((opt) => {
      if (VETO.some(([cre, ore]) => cre.test(clause.toLowerCase()) && ore.test(opt))) return;
      const alts = optionAlternatives(opt);
      let best = 0;
      alts.forEach((alt) => {
        if (altMatches(alt, tokens, canon, hasSide ? "" : sideHint, canonOnly || /^clicking/i.test(opt))) best = Math.max(best, alt.stems.length);
      });
      if (best > 0) scored.set(opt, Math.max(scored.get(opt) || 0, best));
    });
  });
  return [...scored.entries()].sort((a, b) => b[1] - a[1] || options.indexOf(a[0]) - options.indexOf(b[0])).slice(0, max).map(([o]) => o);
}

const arr = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
const NO_NEURO = /^no neurological symptoms$/i;

function sideOf(result) {
  return ["Left", "Right"].includes(result.laterality) ? result.laterality.toLowerCase() : "";
}

// result._narrative is the clinician's own words (OrthoAIIntakePanel adds it).
// The AI's fields have no slot for "no locking, no giving way" or "it clicks",
// so those few yes/no screens read the narrative itself.
function allText(result) {
  return [result._narrative, result.chiefComplaint, result.locationDescription, result.onsetContext, result.radiationArea, ...arr(result.aggMovements), ...arr(result.aggActivities), ...arr(result.relMovements), ...arr(result.functionalLimitations), ...arr(result.morningSymptoms), ...arr(result.nightSymptoms), result.diurnalPattern, result.priorTreatmentTried].filter(Boolean).join(". ");
}

function patternWants(result) {
  const diurnal = `${result.diurnalPattern || ""} ${arr(result.nightSymptoms).join(" ")} ${arr(result.morningSymptoms).join(" ")}`.toLowerCase();
  const wants = [];
  if (arr(result.nightSymptoms).length || /\bnight|sleep|wake|woke/.test(diurnal)) wants.push({ re: /night/i, not: /second half|inflammatory|burning/i });
  if (arr(result.morningSymptoms).length || /\bmorning|first thing|on waking|stiff/.test(diurnal)) wants.push({ re: /morning/i, not: /improves.*warm/i });
  if (/\bevening|afternoon|end of (the )?day|after work|later in the day|worsen\w* (through|during) the day/.test(diurnal)) wants.push({ re: /evening|worse through the day/i });
  if (/\bwarm(s|ed)? up\b/.test(diurnal)) wants.unshift({ re: /warms up/i });
  const sp = result.symptomPattern || "";
  if (/^Constant/i.test(sp)) wants.push({ re: /^constant/i, not: /red flag|unrelated|episodic/i });
  else if (/^Intermittent/i.test(sp)) wants.push({ re: /^intermittent/i });
  else if (/^Mechanical/i.test(sp)) wants.push({ re: /activity-related|mechanical|activity-dependent/i, not: /proportional|only/i });
  return wants;
}

function pickPattern(field, result) {
  const wants = patternWants(result);
  const picked = [];
  wants.forEach((w) => {
    const hit = field.options.find((o) => w.re.test(o) && !(w.not && w.not.test(o)));
    if (hit && !picked.includes(hit)) picked.push(hit);
  });
  if (!picked.length) return "";
  return field.type === "multi" ? picked.join(", ") : picked[0];
}

function limbSide(result) {
  const s = result.radiationSide || result.laterality;
  return ["Left", "Right", "Bilateral"].includes(s) ? s : "";
}

// Radiation / neuro "present?" single-choice fields (arm / leg).
function pickPresence(field, result, kind) {
  const neuro = arr(result.neuroSymptoms);
  const positiveNeuro = neuro.filter((n) => !NO_NEURO.test(n));
  const denies = neuro.some((n) => NO_NEURO.test(n)) && !positiveNeuro.length;
  const radiates = result.hasRadiation === true && (kind === "arm" ? /arm|hand|finger|elbow|forearm|wrist|thumb/i : /leg|foot|toe|calf|thigh|knee|shin|buttock|sciatic/i).test(`${result.radiationArea || ""} ${result.locationDescription || ""}`);
  const positive = kind === "arm" ? positiveNeuro.length > 0 || radiates : positiveNeuro.length > 0 && result.hasRadiation !== false;
  if (positive) {
    const side = limbSide(result);
    const want = side === "Bilateral" ? /bilateral/i : side === "Left" ? /\(L\)/ : side === "Right" ? /\(R\)/ : null;
    return want ? field.options.find((o) => want.test(o)) || "" : "";
  }
  if (denies && (kind === "leg" || result.hasRadiation !== true)) return field.options.find((o) => /^no /i.test(o)) || "";
  return "";
}

function pickRadiation(field, result) {
  if (result.hasRadiation === false) return field.options.find((o) => /^no radiation/i.test(o)) || "";
  if (result.hasRadiation !== true) return "";
  const phrases = [result.radiationArea].filter(Boolean);
  const side = limbSide(result);
  const hit = matchOptions(field.options, phrases, { sideHint: side === "Left" ? "left" : side === "Right" ? "right" : sideOf(result) });
  return hit.join(", ");
}

function pickNeuroList(field, result) {
  const neuro = arr(result.neuroSymptoms);
  if (!neuro.length) return "";
  if (neuro.every((n) => NO_NEURO.test(n))) return field.options.find((o) => /^none$/i.test(o)) || "";
  const phrases = [...neuro, result.radiationArea, ...arr(result.functionalLimitations), result.chiefComplaint, ...arr(result.nightSymptoms)].filter(Boolean);
  return matchOptions(field.options, phrases).join(", ");
}

function pickGivingWay(field, result) {
  const text = allText(result).toLowerCase();
  if (/\b(no|denies|without) (giving way|buckling|instability)\b/.test(text)) return field.options.find((o) => /^no$/i.test(o)) || "";
  if (!/giv(es|ing|e) way|gave way|buckl|gives out|gave out|unstable|knee goes|leg gives/.test(text)) return "";
  if (/pivot|twist|turn|cutting|change of direction/.test(text)) return field.options.find((o) => /pivot/i.test(o)) || "";
  if (/stairs/.test(text)) return field.options.find((o) => /stairs/i.test(o)) || "";
  return field.options.find((o) => /unpredictable/i.test(o)) || "";
}

function pickLocking(field, result) {
  const text = allText(result).toLowerCase();
  if (/\b(no|denies|without) (true )?(locking|catching)\b/.test(text)) return field.options.find((o) => /^no$/i.test(o)) || "";
  if (/\block(s|ed|ing)? (up|in)\b|\blocking\b|\bgets stuck\b|\bcan'?t (straighten|extend)\b/.test(text)) return field.options.find((o) => /true mechanical/i.test(o)) || "";
  if (/\bcatch(es|ing)?\b|\bmomentary\b/.test(text)) return field.options.find((o) => /pseudo/i.test(o)) || "";
  return "";
}

function pickHeadache(field, result) {
  const text = allText(result).toLowerCase();
  if (/\b(no|denies|without) headaches?\b/.test(text)) return field.options.find((o) => /^no headache/i.test(o)) || "";
  return "";
}

const ROLE_BY_FIELD = {
  location: "location",
  radiation: "radiation",
  mechanism: "mechanism",
  mechanismType: "mechanism",
  aggravating: "agg",
  aggMovements: "agg",
  aggPostures: "agg",
  relieving: "rel",
  relMovements: "rel",
  relPostures: "rel",
  relTreatments: "rel",
  pattern: "pattern",
  overallPattern: "pattern",
  function: "function",
  fnAdl: "function",
  adlRestrictions: "function",
  redFlags: "flags",
  redFlagsMyelopathy: "flags",
  redFlagsVbi: "flags",
  redFlagsInstability: "flags",
  redFlagsOther: "flags",
  redFlagsCauda: "flags",
  redFlagsFracture: "flags",
  redFlagsInflammatory: "flags",
  redFlagsSerious: "flags",
  fractureScreen: "flags",
  neuro: "neuroList",
  neuroPresent: "legPresence",
  armPresent: "armPresence",
  givingWay: "givingWay",
  locking: "locking",
  mechanical: "mechanical",
  haPresent: "headache",
};

// Phrases each role reads from the extraction.
function phrasesFor(role, result) {
  const location = [result.locationDescription, result.chiefComplaint];
  switch (role) {
    case "location": return location;
    case "mechanism": {
      return [result.onset, result.onsetContext, result.chiefComplaint];
    }
    case "agg": return [...arr(result.aggMovements), ...arr(result.aggActivities)];
    case "rel": return arr(result.relMovements);
    case "function": return [...arr(result.functionalLimitations)];
    case "flags": return arr(result.flags);
    case "mechanical": return [result._narrative, result.chiefComplaint, result.locationDescription, ...arr(result.functionalLimitations), ...arr(result.aggMovements), ...arr(result.aggActivities), result.onsetContext];
    default: return [];
  }
}

// "Sitting — any duration" says less than "Sitting >30 minutes"; "No clear
// mechanism" contradicts a mechanism that was named. Keep the specific one.
function dropGenericWhenSpecific(picked, role) {
  if (picked.length < 2) return picked;
  let out = picked;
  if (role === "mechanism") {
    const specific = out.filter((o) => !/^(no clear mechanism|no identified mechanism|insidious)/i.test(o));
    if (specific.length) out = out.filter((o) => !/^(no clear mechanism|no identified mechanism)/i.test(o));
  }
  out = out.filter((o) => {
    if (!/ — any duration$/i.test(o)) return true;
    const head = o.split(" — ")[0].toLowerCase();
    return !out.some((x) => x !== o && x.toLowerCase().startsWith(head));
  });
  return out;
}

// Returns { [fieldId]: "Option A, Option B" } for one region, using only the
// answers the extraction actually supports. Existing answers are never read
// or touched here -- the caller merges with fill-blank semantics.
export function regionFieldsFromParse(region, result = {}) {
  const fields = subjectiveFieldsForRegion(region);
  const key = contentKeyForRegion(region);
  const out = {};
  if (!key || !result) return out; // generic regions are free text; the AI note covers them
  const sideHint = sideOf(result);
  fields.forEach((field) => {
    const role = ROLE_BY_FIELD[field.id];
    if (!role || !field.options?.length) return;
    let value = "";
    if (role === "pattern") value = pickPattern(field, result);
    else if (role === "radiation") value = pickRadiation(field, result);
    else if (role === "neuroList") value = pickNeuroList(field, result);
    else if (role === "legPresence") value = pickPresence(field, result, "leg");
    else if (role === "armPresence") value = pickPresence(field, result, "arm");
    else if (role === "givingWay") value = pickGivingWay(field, result);
    else if (role === "locking") value = pickLocking(field, result);
    else if (role === "headache") value = pickHeadache(field, result);
    else {
      const phrases = phrasesFor(role, result);
      const nightLinked = role === "agg" ? matchOptions(field.options, [result.diurnalPattern, ...arr(result.nightSymptoms), ...arr(result.morningSymptoms)].filter(Boolean), { sideHint, canonOnly: true }) : [];
      const extra = role === "flags" ? matchOptions(field.options, [result.chiefComplaint, result.radiationArea, ...arr(result.functionalLimitations), ...arr(result.neuroSymptoms)].filter(Boolean), { sideHint, canonOnly: true }) : [];
      if (!phrases.some(Boolean) && !extra.length && !nightLinked.length) return;
      const direct = phrases.some(Boolean) ? matchOptions(field.options, phrases, { sideHint, max: field.type === "single" ? 1 : Infinity }) : [];
      const matches = [...new Set([...direct, ...extra, ...nightLinked])].slice(0, field.type === "single" ? 1 : undefined);
      let clean = role === "flags" ? matches.filter((o) => !/^(no |none|not applicable)/i.test(o)) : matches;
      clean = dropGenericWhenSpecific(clean, role);
      value = clean.join(", ");
    }
    if (value) out[field.id] = value;
  });
  return out;
}

// Convenience for the wizard: regions = [{id, side}] -> { [regionId]: fields }.
export function regionFillsFromParse(regions = [], result = {}) {
  const out = {};
  regions.forEach((r) => {
    if (!r?.id) return;
    const fields = regionFieldsFromParse(r, result);
    if (Object.keys(fields).length) out[r.id] = fields;
  });
  return out;
}
