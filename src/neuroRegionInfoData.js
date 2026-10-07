// Per-row info cards for the Neuro exam grids (same InfoCard.jsx shape as
// neuroExamLibraryData.js): every region row of the sensory grids, every
// muscle row of the Strength / MMT grids, every Modified Ashworth row, plus
// the Involuntary Movements, Rebound (Holmes-Stewart) and Dysmetria cards.
// Wired into NeurologicalAssessment.jsx through LRGrid's `rowInfo` prop
// (see SensorySection / MotorSection / ToneReflexSection / CoordinationSection).
//
// Every card's three photo slots are deterministic Cloudinary ids
// (n_<key>, n_<key>_2, n_<key>_3), so InfoCard.jsx's in-app "tap to upload"
// works on each of them straight away -- same scheme as the rest of the
// Neuro/Cardio info cards. Photos are uploaded later, one slot at a time.
//
// Clinical content follows standard neurological-examination teaching:
// Kendall/Daniels & Worthingham for manual muscle testing positions and
// substitutions, MRC/Oxford grading, Bohannon & Smith for the Modified
// Ashworth Scale, and standard bedside-neurology texts for sensory testing
// and movement-disorder phenomenology.

const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/";
const img = (id) => `${CLOUDINARY_BASE}${id}`;
const slots = (id) => [img(id), img(`${id}_2`), img(`${id}_3`)];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function card({ id, title, icon, category, caption, position, technique, special, tip, scaleLabel, scale, normal, abnormal, redFlags, note }) {
  const boxes = [
    { tone: "", label: "👤 Position", text: position },
    { tone: "blue", label: "🖐️ Technique", text: technique },
    { tone: "purple", label: "🩺 Special consideration", text: special },
  ];
  if (tip) boxes.push({ tone: "amber", label: "⚠️ Tip", text: tip });
  return {
    title,
    icon,
    category,
    perform: { images: slots(id), caption, boxes },
    scaleLabel,
    scale: { type: "table", rows: scale },
    interpret: { normal, abnormal, ...(redFlags ? { redFlags } : {}), note },
  };
}

/* ===================== SENSORY: LIGHT TOUCH / PINPRICK ===================== */

// Sites + what a deficit in that region means. Shared by light touch and
// pinprick so the two grids can never drift apart on anatomy.
const SENSORY_REGIONS = {
  "Face": {
    icon: "😐",
    sites: "forehead (V1), cheek (V2) and jaw/chin (V3) on each side",
    position: "Patient seated or lying, eyes closed, face fully visible and relaxed.",
    pattern: "A deficit confined to one trigeminal division points to a branch or ganglion lesion; loss over the whole hemiface suggests the trigeminal nerve or brainstem. Loss in a concentric 'onion-skin' pattern (mouth and nose first) points to the spinal trigeminal nucleus in the brainstem.",
    tip: "The angle of the jaw is supplied by C2–C3, not by the trigeminal nerve, so sensation there is normal in a true trigeminal lesion.",
    red: "New facial numbness together with limb weakness, speech change or vertigo — possible acute stroke or brainstem lesion, urgent medical review",
  },
  "UE proximal": {
    icon: "💪",
    sites: "the shoulder tip (C4), lateral upper arm (C5, the axillary-nerve 'badge' area), the medial upper arm (T2) and the medial elbow/forearm (T1)",
    position: "Patient seated or supine, eyes closed, both arms exposed to the shoulder.",
    pattern: "A patch limited to the lateral upper arm suggests the axillary nerve (e.g. after shoulder dislocation); a band that follows a segment suggests a C4–C5, T1 or T2 root; loss over the whole arm suggests a plexus, cord or brain lesion.",
    tip: "Compare the two sides at matching points rather than judging each side alone.",
    red: "New arm sensory loss with weakness or neck pain after trauma — possible cord or root injury, urgent medical review",
  },
  "UE distal": {
    icon: "🖐️",
    sites: "the thumb (C6), middle finger (C7) and little finger (C8) pads, plus the palm, and the dorsum of the first web space (radial nerve)",
    position: "Patient seated, forearms supported palm-up on the thighs or a table, eyes closed.",
    pattern: "Thumb, index, middle and half of the ring finger suggests the median nerve (e.g. carpal tunnel) or C6–C7; little finger and half of the ring finger suggests the ulnar nerve or C8; the back of the first web space suggests the radial nerve; a glove-shaped loss suggests a polyneuropathy.",
    tip: "Test the finger pads, not the nails or the finger sides, and compare each digit with the same digit on the other hand.",
    red: "Progressive hand numbness with clumsiness, gait change or hyperreflexia — possible cervical myelopathy, prompt medical review",
  },
  "Trunk": {
    icon: "🧍",
    sites: "the chest at the nipple line (T4), the xiphisternum (about T6–T7), the umbilicus (T10) and the groin crease (T12–L1), on both the front and the back, with a few lateral points",
    position: "Patient supine or seated, eyes closed, trunk exposed, gown or drape used for privacy.",
    pattern: "A clear horizontal cut-off is a sensory level and points to a spinal cord lesion at or just above that segment; a single-sided band suggests a thoracic root; loss over the back but not the front (or the reverse) should make you check the midline and the sides too.",
    tip: "Work from the numb area upward toward normal skin, and mark the level with a skin pen, so you can re-check it at the next session.",
    red: "A new sensory level with leg weakness or bladder/bowel change — possible cord compression, emergency referral",
  },
  "LE proximal": {
    icon: "🦵",
    sites: "the anterior thigh (L2–L3), the medial knee (L3) and the lateral thigh (lateral femoral cutaneous nerve, L2–L3)",
    position: "Patient supine, eyes closed, both legs exposed and relaxed.",
    pattern: "Anterior thigh and medial knee loss suggests L2–L3 (or the femoral nerve); a patch on the lateral thigh alone suggests the lateral femoral cutaneous nerve (meralgia paraesthetica); loss over the whole leg suggests a lumbosacral plexus, cord or brain lesion.",
    tip: "Test the same distance from the joint on both legs so the two sides really are comparable.",
    red: "New thigh numbness with progressive leg weakness or urinary retention — possible cauda equina or cord lesion, emergency referral",
  },
  "LE distal": {
    icon: "🦶",
    sites: "the medial malleolus/medial leg (L4), the dorsum of the foot and first web space (L5), the lateral foot and heel (S1), and the sole",
    position: "Patient supine, eyes closed, feet uncovered and relaxed.",
    pattern: "A dermatomal strip fits a root (L4, L5, S1); loss that ends at a line around the ankle or shin (stocking) suggests a length-dependent polyneuropathy such as diabetic; the dorsum of the foot with foot drop suggests the common peroneal nerve or L5.",
    tip: "In neuropathy, start at the toes and move upward until sensation returns to normal, then record that level.",
    red: "Saddle numbness, bilateral leg symptoms or bladder/bowel change — possible cauda equina syndrome, emergency referral",
  },
};

const SENSORY_SCALE = [
  { k: "Intact", v: "Felt and localised correctly at every site, same as the other side" },
  { k: "Impaired", v: "Reduced or dulled compared with the other side or a normal area" },
  { k: "Absent", v: "No sensation reported" },
  { k: "Hyperesthesia", v: "Exaggerated or unpleasant response to a normal stimulus" },
  { k: "Paresthesia", v: "Tingling or pins-and-needles felt with or without a stimulus" },
  { k: "Not testable", v: "Unable to cooperate, reduced consciousness, aphasia or a dressing in the way" },
];

function lightTouchCard(region) {
  const r = SENSORY_REGIONS[region];
  return card({
    id: `n_lt_${slug(region)}`,
    title: `Light Touch — ${region}`,
    icon: r.icon,
    category: "Learn · Neuro · Sensory",
    caption: `Cotton wisp at ${r.sites}`,
    position: r.position,
    technique: `Demonstrate the touch with eyes open first. Then, with eyes closed, touch ${r.sites} with a wisp of cotton wool (or a fingertip), lightly and without pressure, in an unpredictable order. Ask the patient to say 'yes' each time they feel it, and compare side to side.`,
    special: `${r.pattern} Light touch travels in both the dorsal column and the anterolateral pathways, so it is often the last modality lost in a cord lesion — always compare it with pinprick.`,
    tip: r.tip,
    scaleLabel: "Recording",
    scale: SENSORY_SCALE,
    normal: [`Light touch felt and located correctly at every ${region.toLowerCase()} site, symmetrical`],
    abnormal: ["Reduced or absent on one side → lesion on the pathway to that side; compare with pinprick to see which tract is involved", "Reduced light touch with normal pinprick (or the reverse) is a dissociated loss and is more localising than a loss of both"],
    redFlags: [r.red],
    note: "Map the edge of any deficit carefully and draw it on the body chart — the shape (dermatome, single nerve, glove/stocking, hemi-body or a level) is what localises the lesion.",
  });
}

function pinprickCard(region) {
  const r = SENSORY_REGIONS[region];
  return card({
    id: `n_pp_${slug(region)}`,
    title: `Pain / Pinprick — ${region}`,
    icon: r.icon,
    category: "Learn · Neuro · Sensory",
    caption: `Sharp vs dull at ${r.sites}`,
    position: r.position,
    technique: `Use a new disposable neuro-tip or pin for each patient — never reuse a pin. Show the patient what 'sharp' and 'dull' feel like on their sternum with eyes open. Then, with eyes closed, touch ${r.sites} with the sharp and dull ends in an unpredictable order and ask which they feel. Compare side to side, and test from the numb area toward normal skin.`,
    special: `${r.pattern} Pinprick tests the spinothalamic (anterolateral) pathway, which crosses within a few segments of entering the cord, so a spinothalamic loss appears on the opposite side of the body from the lesion below the level of the lesion.`,
    tip: `${r.tip} Dispose of the sharp immediately and never use it on broken or infected skin.`,
    scaleLabel: "Recording",
    scale: SENSORY_SCALE,
    normal: [`Sharp and dull told apart correctly at every ${region.toLowerCase()} site, symmetrical`],
    abnormal: ["Sharp felt as dull, or sharp not felt → spinothalamic or peripheral small-fibre loss on the affected side", "Pinprick lost with light touch spared (or the reverse) → dissociated loss, e.g. syringomyelia, Brown-Séquard or a lateral medullary lesion"],
    redFlags: [r.red],
    note: "A patient who cannot tell sharp from dull is not necessarily numb to light touch — record each modality separately rather than 'sensation reduced'.",
  });
}

/* ===================== SENSORY: TEMPERATURE / PROPRIOCEPTION / VIBRATION ===================== */

const TEMPERATURE_REGIONS = {
  "UE": { icon: "🖐️", sites: "the forearm and hand (dorsum and palm)", pattern: "A cape-like loss over both arms and shoulders with normal touch suggests a central cord lesion such as syringomyelia; a glove loss suggests a small-fibre polyneuropathy." },
  "Trunk": { icon: "🧍", sites: "the chest and abdomen at a few levels, front and back", pattern: "A level on the trunk with loss below it suggests a spinothalamic (cord) lesion; the level of loss lies a few segments below the true lesion because the fibres cross first." },
  "LE": { icon: "🦵", sites: "the shin, dorsum of the foot and toes", pattern: "Loss that starts at the toes and rises like a stocking suggests a length-dependent small-fibre neuropathy (e.g. diabetic); loss on one side of the body below a level suggests a contralateral spinothalamic lesion." },
};

function temperatureCard(region) {
  const r = TEMPERATURE_REGIONS[region];
  return card({
    id: `n_temp_${slug(region)}`,
    title: `Temperature — ${region}`,
    icon: r.icon,
    category: "Learn · Neuro · Sensory",
    caption: `Warm and cold at ${r.sites}`,
    position: "Patient relaxed, eyes closed, the limb or area exposed and supported, in a room that is not cold.",
    technique: `Use two tubes (or metal objects) — one filled with warm water, one with cool water, checked so neither is painful. Touch ${r.sites} with one at a time in an unpredictable order and ask 'warm' or 'cold'. Compare side to side and proximal to distal.`,
    special: `${r.pattern} Temperature and pain travel together in the spinothalamic tract, so their loss is usually seen together.`,
    tip: "If no warm/cold tubes are available, the cold flat of a tuning fork against the skin is an acceptable bedside substitute; pinprick is a proxy for the same pathway.",
    scaleLabel: "Recording",
    scale: SENSORY_SCALE,
    normal: ["Warm and cold identified correctly, symmetrical"],
    abnormal: ["Cannot tell warm from cold → spinothalamic tract or small-fibre involvement", "Loss with preserved light touch and proprioception → dissociated (spinothalamic) loss"],
    redFlags: ["Loss of temperature sense in an insensate limb — high risk of burns and pressure injury; give skin-protection advice"],
    note: "Temperature loss is a safety issue as well as a localising sign — teach the patient to check bath water with an unaffected body part.",
  });
}

const PROPRIOCEPTION_JOINTS = {
  "Fingers": { icon: "☝️", where: "the distal phalanx of the index or ring finger", next: "wrist, then elbow" },
  "Wrist": { icon: "🤚", where: "the hand at the wrist (holding the metacarpals)", next: "elbow, then shoulder" },
  "Toes": { icon: "🦶", where: "the great toe (holding the distal phalanx by its sides)", next: "ankle, then knee" },
  "Ankle": { icon: "🦶", where: "the foot at the ankle (holding the heel and forefoot by their sides)", next: "knee, then hip" },
};

function proprioceptionCard(joint) {
  const j = PROPRIOCEPTION_JOINTS[joint];
  return card({
    id: `n_prop_${slug(joint)}`,
    title: `Proprioception — ${joint}`,
    icon: j.icon,
    category: "Learn · Neuro · Sensory",
    caption: `Move ${j.where} up or down with eyes closed`,
    position: `Patient's eyes closed, the limb relaxed and supported, ${j.where} held by its sides (not by the pad and nail) to avoid giving pressure cues.`,
    technique: `Show the patient 'up' and 'down' with eyes open. Then, with eyes closed, move ${j.where} up or down by a small amount, hold still, and ask the patient to name the direction. Repeat several times in a random order. If it is impaired, test the next more proximal joint (${j.next}) to find where position sense becomes normal.`,
    special: "Joint position sense travels in the dorsal columns with vibration. Loss with normal strength produces sensory ataxia: unsteadiness that is worse with the eyes closed or in the dark, and a positive Romberg.",
    tip: "Move the joint a small amount — a large movement can be guessed from the change in pressure. Hold only the sides so the patient cannot tell direction from where you press.",
    scaleLabel: "Recording",
    scale: SENSORY_SCALE,
    normal: [`Direction of even small ${joint.toLowerCase()} movements named correctly, both sides`],
    abnormal: ["Wrong or delayed answers distally → dorsal column pathway or large-fibre neuropathy (diabetes, B12 deficiency, tabes dorsalis, MS)", "Loss on one side with same-side weakness → check for a cord or brain lesion pattern, not just neuropathy"],
    redFlags: ["Reduced position sense with unsteady walking in the dark or falls — high fall risk; assess balance and safety before mobilising"],
    note: "Proprioceptive loss often goes unnoticed by the patient until directly tested, so screen it before any balance or gait assessment.",
  });
}

const VIBRATION_SITES = {
  "Wrist": { icon: "🔔", where: "the ulnar or radial styloid at the wrist", next: "olecranon, then the clavicle" },
  "Ankle": { icon: "🔔", where: "the medial malleolus (or the great toe interphalangeal joint)", next: "tibial tuberosity, then the anterior superior iliac spine" },
};

function vibrationCard(site) {
  const s = VIBRATION_SITES[site];
  return card({
    id: `n_vib_${slug(site)}`,
    title: `Vibration — ${site}`,
    icon: s.icon,
    category: "Learn · Neuro · Sensory",
    caption: `128 Hz tuning fork on ${s.where}`,
    position: "Patient relaxed, eyes closed, limb supported, the bony prominence exposed.",
    technique: `Strike a 128 Hz tuning fork on the heel of your hand (not on a hard surface) and place the base firmly on ${s.where}. Ask the patient to say 'now' when they feel it and 'stop' when it stops; compare with your own perception at the same site on yourself or the other side. If it is reduced, move up to ${s.next} to find where it becomes normal.`,
    special: "Vibration travels in the dorsal columns with position sense. Loss is typically length-dependent (toes and ankles first) in peripheral neuropathy and in B12 deficiency.",
    tip: "Dampen the fork with your fingers between tests. To check the patient is not just feeling pressure, occasionally place the stopped fork on the bone and ask if they feel vibration.",
    scaleLabel: "Recording",
    scale: SENSORY_SCALE,
    normal: ["Vibration felt at the normal duration, matching yours, both sides"],
    abnormal: ["Reduced or absent distally → peripheral neuropathy or dorsal column pathology (B12 deficiency, MS, tabes dorsalis)", "A level, with normal vibration above and reduced below → cord lesion at that level"],
    redFlags: ["Loss of vibration with progressive limb weakness or gait change over days to weeks — possible Guillain-Barré or cord disease, urgent medical review"],
    note: "Vibration sense at the toes and ankles falls with age, so mild reduction there in an older adult with a normal exam otherwise can be a normal finding.",
  });
}

/* ===================== STRENGTH / MMT ===================== */

const MMT_SCALE = [
  { k: "5", v: "Normal — full range against gravity and full resistance" },
  { k: "4", v: "Good — full range against gravity and moderate resistance" },
  { k: "3", v: "Fair — full range against gravity only" },
  { k: "2", v: "Poor — full range with gravity eliminated" },
  { k: "1", v: "Trace — flicker or palpable contraction, no movement" },
  { k: "0", v: "No contraction" },
];

// One entry per MMT row in NeurologicalAssessment.jsx's MotorSection.
// `elim` = gravity-eliminated position for grades 2 and below.
const MMT_MUSCLES = [
  { row: "Neck flexion", region: "Neck", icon: "🧠", muscles: "Sternocleidomastoid, longus colli and longus capitis (deep neck flexors)", innervation: "Accessory nerve (CN XI) and cervical ventral rami C1–C6", position: "Supine, head resting on the bed.", technique: "Ask the patient to tuck the chin and lift the head off the bed. Give resistance with your hand on the forehead, pushing back toward the bed.", elim: "Side-lying, head supported on a smooth surface.", sub: "Poking the chin forward uses the sternocleidomastoid and hides deep-flexor weakness; test a chin-tuck lift.", weak: ["Weak deep neck flexors are common after whiplash and with neck pain", "Marked weakness of neck flexion with other limb signs → myopathy, motor neuron disease or myasthenia"], red: "Sudden neck weakness ('dropped head') with swallowing or breathing difficulty — possible neuromuscular emergency", caution: "Do not test against resistance if there is any suspected cervical fracture, instability or acute whiplash with neurological signs." },
  { row: "Neck extension", region: "Neck", icon: "🧠", muscles: "Splenius capitis and cervicis, semispinalis, cervical erector spinae", innervation: "Dorsal rami of the cervical nerves", position: "Prone with the head over the end of the bed, or seated.", technique: "Ask the patient to lift the head and extend the neck. Give resistance on the back of the head (occiput).", elim: "Side-lying with the head supported.", sub: "Shoulder elevation and trunk extension can lift the head without true neck extensor strength.", weak: ["Weak neck extensors → 'head drop' in ALS, myasthenia and myopathy", "Neck extensor weakness with pain and fever → consider infection or a cervical mass"], red: "New head drop with widespread weakness — urgent neurological review", caution: "Do not test against resistance if there is any suspected cervical fracture or instability." },
  { row: "Neck rotation", region: "Neck", icon: "🧠", muscles: "Sternocleidomastoid (turns the head to the opposite side), splenius capitis (same side)", innervation: "Accessory nerve (CN XI) and C2–C3", position: "Supine or seated, head in neutral.", technique: "Ask the patient to turn the head to one side. Give resistance with your hand on the cheek/jaw on that side, pushing back toward the middle.", elim: "Supine with the head turned along the bed surface.", sub: "Trunk rotation or shoulder movement can substitute; keep the shoulders still.", weak: ["Weak turning of the head to the LEFT points to the RIGHT sternocleidomastoid (CN XI)", "Combined with a weak shoulder shrug → accessory nerve lesion"], red: "", caution: "Do not test against resistance if there is any suspected cervical instability." },
  { row: "Neck lateral flexion", region: "Neck", icon: "🧠", muscles: "Scalenes, sternocleidomastoid, upper trapezius, cervical erector spinae", innervation: "Cervical ventral rami C3–C8 and accessory nerve", position: "Seated (or side-lying for grades 2 and below).", technique: "Ask the patient to bring the ear toward the shoulder. Give resistance with your hand above the ear on the same side, pushing back toward the middle. Do not let the shoulder rise.", elim: "Supine, head sliding sideways along the bed.", sub: "Raising the shoulder toward the ear (shoulder hike) is a common substitution.", weak: ["Unilateral weakness → cervical root (C3–C8) or accessory nerve lesion", "Symmetrical weakness with other muscles → myopathy or neuromuscular disease"], red: "", caution: "Do not test against resistance if there is any suspected cervical instability." },
  { row: "Shoulder flexion", region: "Shoulder", icon: "💪", muscles: "Anterior deltoid, coracobrachialis, clavicular head of pectoralis major", innervation: "Axillary nerve (C5–C6), musculocutaneous nerve (C5–C7)", position: "Seated, arm at 90° of flexion with the elbow straight (or slightly bent), palm down.", technique: "Ask the patient to hold the arm up. Stabilise the shoulder, and give resistance with your other hand on the distal upper arm, above the elbow, pushing down.", elim: "Side-lying, arm sliding forward along the bed.", sub: "Leaning the trunk back or shrugging the shoulder up.", weak: ["C5–C6 root or axillary nerve lesion", "Deltoid weakness after shoulder dislocation or surgery → axillary nerve injury"], red: "", caution: "Do not test in a painful, acutely dislocated or freshly repaired shoulder." },
  { row: "Shoulder extension", region: "Shoulder", icon: "💪", muscles: "Latissimus dorsi, teres major, posterior deltoid", innervation: "Thoracodorsal nerve (C6–C8), lower subscapular nerve (C5–C6), axillary nerve", position: "Prone, arm by the side, palm up (or seated, leaning forward slightly).", technique: "Ask the patient to lift the arm backward off the bed. Give resistance with your hand on the back of the upper arm, above the elbow, pushing down.", elim: "Side-lying, arm sliding backward along the bed.", sub: "Tilting the scapula forward or lifting the trunk.", weak: ["C6–C8 root, thoracodorsal nerve or posterior cord lesion", "Combined with weak elbow extension and wrist drop → posterior cord or radial nerve pattern"], red: "", caution: "" },
  { row: "Shoulder abduction", region: "Shoulder", icon: "💪", muscles: "Middle deltoid, supraspinatus", innervation: "Axillary nerve (C5–C6), suprascapular nerve (C5–C6)", position: "Seated, arm at 90° of abduction, elbow straight or bent, palm down.", technique: "Ask the patient to hold the arm out to the side. Stabilise the top of the shoulder, and give resistance with your other hand on the outer upper arm above the elbow, pushing down.", elim: "Supine, arm sliding out to the side along the bed.", sub: "Trunk lean away from the side, or shoulder hike (upper trapezius) making the arm rise.", weak: ["C5 root (most commonly with C4/5 disc), axillary or suprascapular nerve", "Painful weakness with a positive drop-arm test → rotator cuff tear"], red: "", caution: "" },
  { row: "Shoulder adduction", region: "Shoulder", icon: "💪", muscles: "Pectoralis major, latissimus dorsi, teres major", innervation: "Medial and lateral pectoral nerves (C5–T1), thoracodorsal nerve (C6–C8)", position: "Supine (or seated) with the arm abducted to about 45°–90°.", technique: "Ask the patient to bring the arm down and across toward the body. Give resistance with your hand on the inner upper arm, above the elbow, pushing outward.", elim: "Supine, arm sliding across the bed toward the body.", sub: "Leaning or rolling the trunk toward the arm.", weak: ["C6–T1 roots or pectoral/thoracodorsal nerves", "Sudden pectoral weakness with a bulge in the chest wall → pectoralis major rupture"], red: "", caution: "" },
  { row: "Shoulder internal rotation", region: "Shoulder", icon: "💪", muscles: "Subscapularis, pectoralis major, latissimus dorsi, teres major", innervation: "Upper and lower subscapular nerves (C5–C6), pectoral nerves", position: "Seated, upper arm at the side with a towel roll, elbow bent to 90°, forearm pointing forward.", technique: "Ask the patient to swing the hand across toward the belly. Stabilise the elbow, and give resistance with your hand on the inner wrist/forearm, pushing outward.", elim: "Prone with the arm hanging over the side of the bed, forearm swinging backward.", sub: "Trunk rotation or elbow moving away from the side.", weak: ["C5–C6 root or subscapular nerve", "Painful weakness with a positive lift-off or belly-press test → subscapularis tear"], red: "", caution: "" },
  { row: "Shoulder external rotation", region: "Shoulder", icon: "💪", muscles: "Infraspinatus, teres minor, posterior deltoid", innervation: "Suprascapular nerve (C5–C6), axillary nerve (C5–C6)", position: "Seated, upper arm at the side with a towel roll, elbow bent to 90°, forearm pointing forward.", technique: "Ask the patient to swing the hand outward, away from the belly. Stabilise the elbow, and give resistance with your hand on the outer wrist/forearm, pushing inward.", elim: "Prone with the arm hanging over the side of the bed, forearm swinging forward.", sub: "Trunk rotation, elbow drifting away from the side, or wrist extension.", weak: ["Suprascapular nerve or C5–C6 root lesion", "Weak external rotation with a positive external rotation lag sign → rotator cuff (infraspinatus) tear"], red: "", caution: "" },
  { row: "Elbow flexion", region: "Elbow / forearm", icon: "💪", muscles: "Biceps brachii, brachialis, brachioradialis", innervation: "Musculocutaneous nerve (C5–C6); brachioradialis by the radial nerve (C5–C6)", position: "Seated or supine, elbow bent to about 90°. Forearm supinated tests the biceps, neutral the brachioradialis and pronated the brachialis.", technique: "Ask the patient to bend the elbow further. Stabilise the upper arm, and give resistance with your hand on the front of the wrist, pushing to straighten it.", elim: "Supine or seated with the arm supported so the forearm slides along a surface.", sub: "Wrist flexion, or shoulder shrug and trunk lean.", weak: ["C5–C6 root lesion or musculocutaneous nerve injury", "Isolated biceps weakness with a bulge (Popeye sign) → biceps tendon rupture"], red: "", caution: "" },
  { row: "Elbow extension", region: "Elbow / forearm", icon: "💪", muscles: "Triceps brachii, anconeus", innervation: "Radial nerve (C6–C8, mainly C7)", position: "Supine with the shoulder flexed to 90° and the elbow bent (or seated with the arm supported).", technique: "Ask the patient to straighten the elbow. Stabilise the upper arm, and give resistance with your hand on the back of the wrist, pushing to bend it.", elim: "Seated, arm supported on a table so the forearm slides along it.", sub: "Letting gravity or momentum swing the arm into extension, or locking the shoulder.", weak: ["C7 root lesion (the most commonly affected cervical root)", "Triceps weakness with wrist drop → radial nerve or posterior cord lesion"], red: "", caution: "" },
  { row: "Forearm pronation", region: "Elbow / forearm", icon: "💪", muscles: "Pronator teres, pronator quadratus", innervation: "Median nerve (C6–C7); anterior interosseous nerve (C8–T1)", position: "Seated, elbow at the side bent to 90°, forearm in neutral.", technique: "Ask the patient to turn the palm down. Stabilise the elbow, and give resistance with your hand at the distal forearm, turning it back toward palm-up.", elim: "Forearm supported so the rotation is horizontal.", sub: "Shoulder abduction and internal rotation, or trunk lean.", weak: ["Median nerve lesion (e.g. at the elbow) or C6–C7 root", "Weak pronation with a poor 'OK' sign → anterior interosseous nerve palsy"], red: "", caution: "" },
  { row: "Forearm supination", region: "Elbow / forearm", icon: "💪", muscles: "Supinator, biceps brachii", innervation: "Posterior interosseous nerve (C5–C6), musculocutaneous nerve", position: "Seated, elbow at the side bent to 90°, forearm in neutral.", technique: "Ask the patient to turn the palm up. Stabilise the elbow, and give resistance with your hand at the distal forearm, turning it back toward palm-down.", elim: "Forearm supported so the rotation is horizontal.", sub: "Shoulder external rotation and adduction, or trunk lean.", weak: ["C5–C6 root or radial (posterior interosseous) nerve", "Weak supination with finger drop but no wrist drop → posterior interosseous nerve syndrome"], red: "", caution: "" },
  { row: "Wrist flexion", region: "Wrist / hand", icon: "🤚", muscles: "Flexor carpi radialis, flexor carpi ulnaris", innervation: "Median nerve (C6–C7), ulnar nerve (C8–T1)", position: "Seated, forearm supported palm-up, fingers relaxed.", technique: "Ask the patient to bend the wrist toward the palm. Stabilise the forearm, and give resistance with your hand on the palm, pushing to extend the wrist.", elim: "Forearm in neutral, resting on its ulnar side.", sub: "Finger flexors making the wrist bend as they contract (keep the fingers relaxed).", weak: ["C6–C7 root or median nerve lesion (FCR); C8 or ulnar nerve (FCU)", "Wrist flexion deviating to the radial side → weak FCU"], red: "", caution: "" },
  { row: "Wrist extension", region: "Wrist / hand", icon: "🤚", muscles: "Extensor carpi radialis longus and brevis, extensor carpi ulnaris", innervation: "Radial nerve (C6–C8)", position: "Seated, forearm supported palm-down, fingers relaxed.", technique: "Ask the patient to lift the wrist up. Stabilise the forearm, and give resistance with your hand on the back of the hand, pushing to flex the wrist.", elim: "Forearm in neutral, resting on its ulnar side.", sub: "Finger extensors lifting the wrist as they contract (keep the fingers relaxed), or brachioradialis.", weak: ["C6 root (wrist extension is the C6 key muscle) or radial nerve lesion", "Wrist drop → radial nerve palsy (e.g. from arm compression) or posterior cord"], red: "", caution: "" },
  { row: "Finger flexion", region: "Wrist / hand", icon: "🤚", muscles: "Flexor digitorum superficialis (PIP) and profundus (DIP)", innervation: "Median nerve (C7–C8); ulnar nerve for the ring and little fingers' profundus (C8–T1)", position: "Seated, forearm supported palm-up, wrist in neutral.", technique: "Test the middle joint (PIP) by stabilising the proximal phalanx and resisting flexion at the middle phalanx. Test the end joint (DIP) by stabilising the middle phalanx and resisting flexion at the fingertip. Test each finger separately.", elim: "Forearm in neutral resting on its ulnar side.", sub: "The wrist flexors and tenodesis effect (wrist extension makes the fingers close).", weak: ["C8 root (long finger flexors are the C8 key muscle) or median/ulnar nerve", "Index DIP weakness with a poor 'OK' sign → anterior interosseous nerve"], red: "", caution: "" },
  { row: "Finger extension", region: "Wrist / hand", icon: "🤚", muscles: "Extensor digitorum, extensor indicis, extensor digiti minimi", innervation: "Posterior interosseous nerve, radial nerve (C7–C8)", position: "Seated, forearm supported palm-down, wrist in neutral, fingers flexed at the knuckles.", technique: "Ask the patient to straighten the fingers at the knuckles (MCP joints). Stabilise the hand, and give resistance on the back of the proximal phalanges, pushing to flex them.", elim: "Forearm in neutral, resting on its ulnar side.", sub: "Wrist flexion making the fingers straighten (tenodesis) — keep the wrist in neutral.", weak: ["C7–C8 root or posterior interosseous nerve", "Fingers cannot extend but the wrist still extends → posterior interosseous nerve palsy"], red: "", caution: "" },
  { row: "Finger abduction", region: "Wrist / hand", icon: "🤚", muscles: "Dorsal interossei, abductor digiti minimi", innervation: "Ulnar nerve (C8–T1)", position: "Seated, hand flat on a table palm-down, fingers straight.", technique: "Ask the patient to spread the fingers apart. Stabilise the hand, and give resistance on the outer side of the index finger and the little finger, pushing them together. Test the first dorsal interosseous by resisting the index finger.", elim: "Hand flat on a table already (gravity is eliminated by the table).", sub: "Finger flexion or extension changing the apparent spread, and wrist deviation.", weak: ["T1 (C8–T1) root or ulnar nerve lesion", "Wasted first dorsal interosseous with a clawed hand → ulnar nerve palsy or T1 lesion"], red: "", caution: "" },
  { row: "Grip strength", region: "Wrist / hand", icon: "🤚", muscles: "Flexor digitorum superficialis and profundus, thenar and hypothenar muscles, lumbricals and interossei", innervation: "Median and ulnar nerves (C7–T1)", position: "Seated, shoulder adducted, elbow bent to 90°, forearm in neutral, wrist in neutral to slight extension.", technique: "Use a hand-held dynamometer set to the second handle position. Ask the patient to squeeze as hard as possible for a few seconds. Take three trials on each side with about 30 seconds of rest between them, and record the best (or the average — say which) and the side tested first.", elim: "", sub: "Lifting the elbow from the side, or bending the wrist sharply to gain leverage.", weak: ["Reduced grip on one side → C8–T1 root, median/ulnar nerve or upper motor neuron weakness", "Reduced grip on both sides → sarcopenia, myopathy, neuropathy or general deconditioning"], red: "", caution: "" },
  { row: "Hip flexion", region: "Hip", icon: "🦵", muscles: "Iliopsoas (with rectus femoris, sartorius and tensor fasciae latae)", innervation: "Femoral nerve and lumbar plexus (L1–L3, mainly L2)", position: "Seated, hips and knees at 90°, holding the edge of the table.", technique: "Ask the patient to lift the thigh off the table. Stabilise the pelvis, and give resistance with your hand on the front of the thigh, above the knee, pushing down.", elim: "Side-lying, the leg supported, knee bent, sliding forward.", sub: "Leaning back, or using the tensor fasciae latae and sartorius (the thigh drifts out and rotates outward).", weak: ["L1–L3 root lesion or femoral nerve injury", "Proximal weakness on both sides (trouble climbing stairs) → myopathy or muscle disease"], red: "Sudden bilateral leg weakness with bladder change — possible cord or cauda equina lesion, emergency referral", caution: "" },
  { row: "Hip extension", region: "Hip", icon: "🦵", muscles: "Gluteus maximus (with the hamstrings)", innervation: "Inferior gluteal nerve (L5–S2)", position: "Prone with the knee bent to 90° to isolate the gluteus maximus (a pillow under the abdomen if the back is sensitive).", technique: "Ask the patient to lift the thigh off the bed. Stabilise the pelvis, and give resistance with your hand on the back of the thigh, above the knee, pushing down.", elim: "Side-lying, the leg supported, sliding backward.", sub: "Arching the low back or rotating the pelvis, and hamstring activation.", weak: ["S1 root (L5–S2) or inferior gluteal nerve", "Waddling or trouble rising from a chair → gluteus maximus weakness or myopathy"], red: "", caution: "" },
  { row: "Hip abduction", region: "Hip", icon: "🦵", muscles: "Gluteus medius and minimus (with the tensor fasciae latae)", innervation: "Superior gluteal nerve (L4–S1)", position: "Side-lying on the untested side, the underneath hip and knee bent for stability, the test leg straight and in line with the trunk.", technique: "Ask the patient to raise the leg toward the ceiling, keeping the toes forward. Stabilise the pelvis, and give resistance with your hand on the outer thigh, above the knee, pushing down.", elim: "Supine, the leg sliding out to the side along the bed.", sub: "Hip hiking or trunk side-bending (quadratus lumborum), or the leg drifting forward into hip flexion with the pelvis rolling backward (tensor fasciae latae). Keep the hip in slight extension and neutral rotation.", weak: ["L5 root or superior gluteal nerve", "A positive Trendelenburg sign (the pelvis drops on the side opposite the standing leg) → weak gluteus medius on the stance side"], red: "", caution: "" },
  { row: "Hip adduction", region: "Hip", icon: "🦵", muscles: "Adductor longus, brevis and magnus, gracilis, pectineus", innervation: "Obturator nerve (L2–L4)", position: "Side-lying on the tested side, the top leg supported by the examiner, the tested leg straight.", technique: "Ask the patient to lift the bottom leg up toward the top one. Stabilise the pelvis, and give resistance with your hand on the inner thigh, above the knee, pushing down.", elim: "Supine, the leg sliding in toward the midline along the bed.", sub: "Rolling the trunk backward or forward, or hip flexion.", weak: ["L2–L4 root or obturator nerve injury", "Pain and weakness in athletes → adductor strain or groin injury"], red: "", caution: "" },
  { row: "Hip internal rotation", region: "Hip", icon: "🦵", muscles: "Gluteus minimus and anterior medius, tensor fasciae latae", innervation: "Superior gluteal nerve (L4–S1)", position: "Seated, hips and knees at 90°, holding the edge of the table.", technique: "Ask the patient to swing the foot outward (this rotates the thigh inward). Stabilise the knee, and give resistance with your hand on the outer ankle, pushing the foot back inward.", elim: "Supine, hip and knee straight, rolling the leg inward along the bed.", sub: "Leaning the trunk to the side, lifting the buttock, or the knee sliding outward.", weak: ["L4–S1 root lesion or superior gluteal nerve", "Reduced range with pain → hip joint disease rather than muscle weakness"], red: "", caution: "" },
  { row: "Hip external rotation", region: "Hip", icon: "🦵", muscles: "Piriformis, obturators, gemelli, quadratus femoris, gluteus maximus", innervation: "Nerves to the short rotators and inferior gluteal nerve (L5–S2)", position: "Seated, hips and knees at 90°, holding the edge of the table.", technique: "Ask the patient to swing the foot inward (this rotates the thigh outward). Stabilise the knee, and give resistance with your hand on the inner ankle, pushing the foot back outward.", elim: "Supine, hip and knee straight, rolling the leg outward along the bed.", sub: "Leaning the trunk away, or the knee sliding inward.", weak: ["L5–S2 root lesion", "Pain and weakness on external rotation → check for piriformis syndrome or hip pathology"], red: "", caution: "" },
  { row: "Knee flexion", region: "Knee / ankle", icon: "🦵", muscles: "Biceps femoris, semitendinosus, semimembranosus (hamstrings)", innervation: "Sciatic nerve — tibial part (L5–S2) and common peroneal part (short head of biceps femoris)", position: "Prone with the knee bent to about 90°, the foot slightly turned to test the medial or lateral hamstrings.", technique: "Ask the patient to bend the knee further. Stabilise the thigh, and give resistance with your hand on the back of the lower leg near the ankle, pushing to straighten it.", elim: "Side-lying, the leg supported, knee sliding into flexion.", sub: "Hip flexion (the buttock rises), gastrocnemius or sartorius and gracilis for the medial side.", weak: ["S1 root (L5–S2) or sciatic nerve lesion", "Sudden pain and weakness while sprinting → hamstring tear"], red: "", caution: "" },
  { row: "Knee extension", region: "Knee / ankle", icon: "🦵", muscles: "Quadriceps (rectus femoris and the three vasti)", innervation: "Femoral nerve (L2–L4, mainly L3)", position: "Seated, knees bent to 90° over the edge of the table, holding the edge.", technique: "Ask the patient to straighten the knee. Stabilise the thigh, and give resistance with your hand on the front of the lower leg near the ankle, pushing to bend it.", elim: "Side-lying, the leg supported, knee sliding into extension.", sub: "Leaning back and lifting the hip, or locking the knee with momentum. A patient with weak quadriceps may push the thigh with the hand to lock the knee.", weak: ["L3 root (L2–L4) or femoral nerve injury", "Quadriceps wasting with buckling of the knee → femoral neuropathy or muscle disease"], red: "", caution: "" },
  { row: "Ankle dorsiflexion", region: "Knee / ankle", icon: "🦶", muscles: "Tibialis anterior (with the toe extensors)", innervation: "Deep peroneal nerve (L4–L5)", position: "Seated or supine, the heel resting, foot relaxed.", technique: "Ask the patient to pull the foot up toward the shin. Stabilise the lower leg, and give resistance with your hand on the top of the foot, pushing it down.", elim: "Side-lying, the foot sliding forward on the bed.", sub: "The toe extensors lifting the toes without true ankle dorsiflexion, and hip flexion.", weak: ["L4–L5 root or deep/common peroneal nerve lesion", "Foot drop with a high stepping gait → L4–L5 disc, peroneal nerve palsy at the fibular head, or a central lesion"], red: "New foot drop with back pain and bladder/bowel change — possible cauda equina, emergency referral", caution: "" },
  { row: "Ankle plantarflexion", region: "Knee / ankle", icon: "🦶", muscles: "Gastrocnemius and soleus", innervation: "Tibial nerve (S1–S2)", position: "Standing, holding a support lightly for balance (for grades 4–5); otherwise prone or supine with the foot free.", technique: "Ask the patient to rise onto the toes of one leg as many times as possible, up to 25 repeats. This is more sensitive than manual resistance, which usually cannot overcome a normal calf. If the patient cannot stand, give manual resistance on the sole with the knee straight (gastrocnemius) and bent (soleus).", elim: "Side-lying, the foot pushing down along the bed.", sub: "Using the fingers to push up on the support, knee bending, or the toe flexors and peroneals.", weak: ["S1 root (S1–S2) or tibial nerve lesion", "Unable to do a single-leg heel raise → significant S1 weakness or Achilles tendon rupture (check the Thompson test)"], red: "", caution: "" },
  { row: "Ankle inversion", region: "Knee / ankle", icon: "🦶", muscles: "Tibialis posterior (with the tibialis anterior)", innervation: "Tibial nerve (L4–L5)", position: "Seated or supine, the foot in slight plantarflexion and relaxed.", technique: "Ask the patient to turn the sole of the foot inward. Stabilise the lower leg, and give resistance with your hand on the inner border of the forefoot, pushing it outward.", elim: "Side-lying, the foot turning inward along the bed.", sub: "The toe flexors and tibialis anterior (which gives dorsiflexion with inversion), so keep the foot slightly plantarflexed.", weak: ["L4–L5 root or tibial nerve lesion", "Weak inversion with a flatfoot deformity → tibialis posterior dysfunction"], red: "", caution: "" },
  { row: "Ankle eversion", region: "Knee / ankle", icon: "🦶", muscles: "Peroneus longus and brevis", innervation: "Superficial peroneal nerve (L5–S1)", position: "Seated or supine, the foot in slight plantarflexion and relaxed.", technique: "Ask the patient to turn the sole of the foot outward. Stabilise the lower leg, and give resistance with your hand on the outer border of the forefoot, pushing it inward.", elim: "Side-lying, the foot turning outward along the bed.", sub: "The toe extensors (extensor digitorum longus), which give dorsiflexion with eversion, so keep the foot slightly plantarflexed.", weak: ["L5–S1 root or superficial peroneal nerve lesion", "Weak eversion with foot drop → common peroneal nerve palsy at the fibular head"], red: "", caution: "" },
];

function mmtCard(m) {
  const category = "Learn · Neuro · Strength / MMT";
  const isGrip = m.row === "Grip strength";
  return card({
    id: `n_mmt_${slug(m.row)}`,
    title: `${isGrip ? "Grip Strength" : "MMT — " + m.row}`,
    icon: m.icon,
    category,
    caption: isGrip ? "Hand-held dynamometer, three trials each side" : `${m.row} against resistance, ${m.region.toLowerCase()}`,
    position: m.position,
    technique: m.technique + (m.elim ? ` For grades 2 and below, test with gravity eliminated: ${m.elim}` : ""),
    special: `${m.muscles} — ${m.innervation}. ${m.caution || "Compare the two sides. Test the pain-free side first to set a baseline and the painful side last, and stop if pain increases."}`,
    tip: `Watch for substitution: ${m.sub}`,
    scaleLabel: "MRC / Oxford 0–5",
    scale: MMT_SCALE,
    normal: ["Grade 5 bilaterally, symmetrical, no substitution"],
    abnormal: m.weak,
    redFlags: m.red ? [m.red] : undefined,
    note: "Grades 4 and 5 are subjective — a strong examiner is beaten by a healthy quadriceps or calf. Where you need to track change, use hand-held dynamometry or a functional test, and record the position tested and the side compared.",
  });
}

/* ===================== MODIFIED ASHWORTH: PER MUSCLE GROUP ===================== */

const MAS_SCALE = [
  { k: "0", v: "No increase in muscle tone" },
  { k: "1", v: "Slight increase — a catch and release, or minimal resistance at the end of the range" },
  { k: "1+", v: "Slight increase — a catch, then minimal resistance through less than half of the range" },
  { k: "2", v: "More marked increase through most of the range, the part still moves easily" },
  { k: "3", v: "Considerable increase, passive movement difficult" },
  { k: "4", v: "Affected part rigid in flexion or extension" },
];

const MAS_GROUPS = {
  "Elbow flexors": { icon: "💪", position: "Supine, arm by the side, forearm in a neutral or slightly supinated position, the muscle in its most shortened position (elbow fully flexed).", technique: "Move the elbow passively from full flexion to full extension over about one second. Grade the resistance you feel as the elbow extends.", special: "Elbow flexors are the classic post-stroke spastic group (with wrist and finger flexors and shoulder adductors). Test with the shoulder in the same position each time, because shoulder position changes the biceps' length.", tip: "Check for a contracture: if the elbow cannot reach full extension slowly, the limit may be joint or soft tissue shortening rather than spasticity." },
  "Wrist flexors": { icon: "🤚", position: "Seated or supine, forearm supported and pronated, fingers relaxed, the wrist in full flexion (the flexors in their shortened position).", technique: "Move the wrist passively from full flexion to full extension over about one second, with the fingers relaxed. Grade the resistance felt.", special: "Wrist and finger flexors often show a flexed, clenched-fist posture after stroke. The wrist flexors share their origin at the elbow, so test the wrist with the elbow extended and again with the elbow flexed; a difference means the elbow-crossing wrist flexors are tight.", tip: "Test the wrist flexors with the fingers free, so the long finger flexors are not stretched at the same time." },
  "Hip adductors": { icon: "🦵", position: "Supine, both legs in neutral with the knees extended and the hips together (the adductors in their shortened position).", technique: "Move the hip passively into abduction, from the midline to the end of the available range, over about one second. Test each side separately and compare.", special: "Adductor spasticity causes scissoring in walking and makes hygiene and perineal care difficult. Note whether the resistance is symmetric.", tip: "Support the whole leg so the patient does not tense to stay upright. Stop at the first firm resistance if the range is limited by pain." },
  "Knee extensors": { icon: "🦵", position: "Supine, hip in neutral, the knee fully extended (the quadriceps shortened) with the leg supported.", technique: "Move the knee passively from full extension into flexion over about one second, keeping the hip in neutral. Grade the resistance as the knee bends.", special: "Quadriceps spasticity gives a stiff-legged gait and swing-phase problems. Test the knee with the hip flexed as well as extended to separate rectus femoris from the vasti.", tip: "Tone in the quadriceps often rises with an unsupported hip or a full bladder, so keep positions and conditions the same each time." },
  "Ankle plantarflexors": { icon: "🦶", position: "Supine, the knee extended to test the gastrocnemius and again with the knee flexed to test the soleus, ankle in full plantarflexion (muscle shortened).", technique: "Move the ankle passively from full plantarflexion into dorsiflexion over about one second. Grade the resistance. Repeat with the knee flexed and compare.", special: "Plantarflexor spasticity is a common cause of equinus and toe-walking after stroke, brain injury and in cerebral palsy. A stiffer response with the knee extended points to the gastrocnemius.", tip: "A fixed equinus that will not dorsiflex slowly is likely a contracture rather than spasticity — record the passive range separately." },
};

function masCard(group) {
  const g = MAS_GROUPS[group];
  return card({
    id: `n_mas_${slug(group)}`,
    title: `Modified Ashworth — ${group}`,
    icon: g.icon,
    category: "Learn · Neuro · Tone / Reflexes",
    caption: `Passive stretch of the ${group.toLowerCase()} at a constant speed`,
    position: g.position,
    technique: g.technique,
    special: g.special,
    tip: g.tip,
    scaleLabel: "0–4 grading (Bohannon & Smith)",
    scale: MAS_SCALE,
    normal: ["0 on both sides"],
    abnormal: ["1 to 1+ → mild spasticity", "2 to 3 → moderate to marked spasticity, review positioning, stretching and medical options", "4 → rigid — assess for contracture and skin risk"],
    redFlags: ["A sudden increase in spasticity — look for a trigger such as a urinary infection, pressure injury, a full bladder or bowel, or a new cord lesion"],
    note: "Test at the same speed, position and time of day each visit. The MAS is a coarse, examiner-dependent scale, so pair it with passive range of motion and a functional measure.",
  });
}

/* ===================== INVOLUNTARY MOVEMENTS / REBOUND / DYSMETRIA ===================== */

const involuntaryMovements = card({
  id: "n_involuntary_movements",
  title: "Involuntary Movements",
  icon: "🌀",
  category: "Learn · Neuro · Motor",
  caption: "Watch at rest, in posture, in action and while distracted",
  position: "Patient seated comfortably, the arms and legs uncovered, face and hands in full view. Watch without asking for anything first.",
  technique: "Observe in this order: at rest (hands on the lap); arms outstretched (posture); finger-to-nose and drawing a spiral (action); walking; and while counting backward or opening and closing the other hand to bring out a hidden movement. Note the body part, the side, the speed, the rhythm, whether it changes with posture or action, and whether the patient can suppress it.",
  special: "Name the movement by its pattern: tremor is a regular back-and-forth oscillation; chorea is irregular, brief, flowing movements that move from one part to another; athetosis is slow, writhing movements; dystonia is a sustained, twisting posture; myoclonus is a sudden, brief, shock-like jerk; a tic is a brief, repeated movement the patient feels an urge to make and can briefly suppress.",
  tip: "Tremor at rest that reduces with movement is typical of Parkinson's disease; a tremor that appears or worsens on reaching for a target is cerebellar. Ask the patient about drugs (antipsychotics, metoclopramide, lithium, valproate), caffeine and thyroid disease.",
  scaleLabel: "Movement types",
  scale: [
    { k: "Tremor", v: "Rhythmic oscillation — rest, postural or kinetic/intention" },
    { k: "Chorea", v: "Irregular, brief, unpredictable, flowing movements" },
    { k: "Athetosis", v: "Slow, writhing, continuous movement, often distal" },
    { k: "Dystonia", v: "Sustained muscle contraction causing twisting or abnormal posture" },
    { k: "Myoclonus", v: "Sudden, brief, shock-like jerks" },
    { k: "Tics", v: "Brief, repeated, stereotyped movements or sounds with a premonitory urge, briefly suppressible" },
  ],
  normal: ["No abnormal movement at rest, in posture or in action"],
  abnormal: [
    "Rest tremor of about 4–6 Hz ('pill-rolling') with rigidity and slow movement → Parkinsonism",
    "Postural and action tremor of both hands, often with a family history → essential tremor",
    "Intention tremor that worsens toward the target with dysmetria → cerebellar disease",
    "Chorea → Huntington's disease, Sydenham chorea, drug-induced or metabolic causes",
    "Athetosis or dystonia with abnormal posture → dyskinetic cerebral palsy, drug effect or a basal ganglia lesion",
    "Myoclonus → metabolic, drug or post-hypoxic cause, or epilepsy syndromes",
  ],
  redFlags: [
    "Sudden violent flinging of one arm and leg (hemiballismus) → stroke of the basal ganglia, emergency",
    "New movement disorder with fever, marked rigidity and confusion → possible neuroleptic malignant syndrome or serotonin syndrome, emergency",
  ],
  note: "Record the type, body part, side, and what makes it better or worse. Video (with consent) is the best record, and lets a neurologist review the phenomenology later.",
});

const reboundTest = card({
  id: "n_rebound_test",
  title: "Rebound Test (Holmes-Stewart)",
  icon: "↩️",
  category: "Learn · Neuro · Coordination",
  caption: "Resist elbow flexion, release suddenly, watch how the arm is checked",
  position: "Patient seated or supine, elbow bent to about 90°, the other hand of the examiner guarding the patient's shoulder or face.",
  technique: "Hold the patient's wrist and ask them to pull the forearm toward the shoulder against your firm resistance. Release the wrist suddenly while your other hand guards in front of the patient's shoulder or face. A normal patient checks the movement within a short distance as the triceps brakes the arm. Test both sides.",
  special: "In cerebellar disease the antagonist (triceps) fails to brake the movement, so the arm 'rebounds' or overshoots far toward the body. This is a sign of ipsilateral cerebellar hemisphere disease. A normal limb checks the movement quickly, whereas a cerebellar limb is slow to check it and overshoots, so read the result together with tone.",
  tip: "Always guard the patient's face or chest with your free hand or a padded surface before releasing — a positive rebound can hit the patient.",
  scaleLabel: "Findings",
  scale: [
    { k: "Normal", v: "Arm is checked quickly, moves only a short distance" },
    { k: "Positive", v: "Arm overshoots and rebounds, checked late or not at all" },
    { k: "Not tested", v: "Weakness, pain or fear prevents safe testing" },
  ],
  normal: ["The antagonist checks the movement promptly, both sides"],
  abnormal: ["Delayed or absent checking on one side → ipsilateral cerebellar hemisphere lesion", "Bilateral overshoot → diffuse cerebellar disease (e.g. alcohol, drugs, degeneration)"],
  redFlags: ["New rebound with headache, vomiting, vertigo or gait ataxia of sudden onset → possible cerebellar stroke or haemorrhage, emergency referral"],
  note: "Combine with finger-to-nose, rapid alternating movements and tandem gait — a cerebellar problem shows in several of these together.",
});

const dysmetria = card({
  id: "n_dysmetria",
  title: "Dysmetria",
  icon: "🎯",
  category: "Learn · Neuro · Coordination",
  caption: "Overshoot or undershoot when reaching for a target",
  position: "Patient seated, arm free, the examiner's finger placed at arm's length in front of the patient.",
  technique: "Ask the patient to touch your finger and then their own nose as accurately and quickly as possible, moving your finger to a new place each time. Repeat with the eyes open and then closed, and test each side. In the legs, use heel-to-shin. Watch whether the finger stops short of, or passes beyond, the target.",
  special: "Overshooting the target is hypermetria and stopping short is hypometria; both are called dysmetria and are signs of ipsilateral cerebellar hemisphere disease. Dysmetria that gets much worse when the eyes are closed suggests proprioceptive loss (sensory ataxia) rather than a cerebellar cause.",
  tip: "Also watch for tremor that grows as the finger nears the target (intention tremor), and for a jerky, decomposed path to the target.",
  scaleLabel: "Findings",
  scale: [
    { k: "None", v: "The finger lands accurately on the target" },
    { k: "Overshoots (hypermetria)", v: "The finger passes beyond the target and corrects" },
    { k: "Undershoots (hypometria)", v: "The finger stops short of the target" },
  ],
  normal: ["Accurate, smooth movement to the target with the eyes open and closed, both sides"],
  abnormal: ["Overshoot or undershoot on one side → ipsilateral cerebellar hemisphere lesion", "Marked worsening with eyes closed and reduced joint position sense → sensory ataxia"],
  redFlags: ["Sudden dysmetria with vertigo, headache or vomiting → possible cerebellar stroke, emergency referral"],
  note: "Always test both sides and compare — a one-sided dysmetria is more useful for localising the lesion than a symmetrical finding.",
});

/* ===================== EXPORTED ROW MAPS ===================== */

const SENSORY_REGION_ROWS = ["Face", "UE proximal", "UE distal", "Trunk", "LE proximal", "LE distal"];

export const LIGHT_TOUCH_ROW_INFO = Object.fromEntries(SENSORY_REGION_ROWS.map((r) => [r, lightTouchCard(r)]));
export const PINPRICK_ROW_INFO = Object.fromEntries(SENSORY_REGION_ROWS.map((r) => [r, pinprickCard(r)]));
export const TEMPERATURE_ROW_INFO = Object.fromEntries(Object.keys(TEMPERATURE_REGIONS).map((r) => [r, temperatureCard(r)]));
export const PROPRIOCEPTION_ROW_INFO = Object.fromEntries(Object.keys(PROPRIOCEPTION_JOINTS).map((r) => [r, proprioceptionCard(r)]));
export const VIBRATION_ROW_INFO = Object.fromEntries(Object.keys(VIBRATION_SITES).map((r) => [r, vibrationCard(r)]));
export const MMT_ROW_INFO = Object.fromEntries(MMT_MUSCLES.map((m) => [m.row, mmtCard(m)]));
export const MAS_ROW_INFO = Object.fromEntries(Object.keys(MAS_GROUPS).map((r) => [r, masCard(r)]));

export const neuroRegionInfoData = { involuntaryMovements, reboundTest, dysmetria };
