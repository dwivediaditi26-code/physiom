// FasciaNKT.jsx — Fascia, NKT, Cyriax region tests, and FMA section
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes).
import React, { useState, useEffect } from "react";
import { C, RegionChips, applyPersistentHighlight } from "./utils.jsx";
import { NKT_REGIONS } from "./sharedClinicalData.js";
// Shared components that remain in SubjectiveObjective.jsx (render-time only; safe cycle).
import { SmallClinicalImg, FunctionalScreenHub } from "./SubjectiveObjective.jsx";

function FMASection({ navContext={}, data={}, set=()=>{}, navTo=()=>{} }){
  return (
    <div>
      <FunctionalScreenHub data={data} set={set} navTo={navTo} navContext={navContext}/>
    </div>
  );
}
// ─── FASCIA LINE DATA ─────────────────────────────────────────────────────────
const FASCIA_LINES_DATA = {
  sbl:{ label:"Superficial Back Line", color:"#ff6b35", route:"Plantar fascia → Gastrocnemius → Hamstrings → Sacrotuberous lig → Erector spinae → Suboccipitals → Scalp", restrictions:"Plantar fasciitis, hamstring tightness, thoracolumbar restriction, suboccipital tension, forward head, limited forward bend", compensation:"Plantar restriction pulls entire posterior chain → suboccipital compression → forward head posture" },
  sfl:{ label:"Superficial Front Line", color:"#00d4ff", route:"Dorsum foot → Tibialis anterior → Quadriceps → Rectus abdominis → SCM → Scalp", restrictions:"Anterior ankle restriction, quad tightness, abdominal restriction, chest tightness, SCM overactivity", compensation:"SFL short = SBL stretched and overloaded → kyphosis + forward head" },
  ll:{ label:"Lateral Line", color:"#a8ff3e", route:"Peroneals → IT band → TFL/Glute max → Ext oblique → Intercostals → SCM/Splenius", restrictions:"Lateral ankle pain, IT band syndrome, lateral knee, lateral hip, lateral trunk tightness, scoliosis", compensation:"LL restriction → scoliotic lean → contralateral lateral trunk shift → knee valgus contralaterally" },
  spiral:{ label:"Spiral Line", color:"#d4a5ff", route:"Skull → Splenius → Opposite rhomboids → Serratus → Ext oblique → Opp int oblique → TFL → IT band → Tibialis ant → Peroneals → back to skull", restrictions:"Rotational asymmetry, scoliosis, limited sport rotation, shoulder-to-hip diagonal tightness", compensation:"SPL restriction → rotational asymmetry → disc loading asymmetry. Diagonal chain connects foot to opposite shoulder" },
  dfl:{ label:"Deep Front Line", color:"#ffd700", route:"Foot arch → Tib posterior → Adductors → Iliopsoas → Diaphragm → Mediastinum → Scalenes → Hyoids → Skull base", restrictions:"Flatfoot, adductor tightness, psoas restriction, breathing dysfunction, pelvic floor issues, TMJ tension", compensation:"DFL arch collapse → adductors tighten → psoas pulls anterior → diaphragm shifts → scalenes overwork → forward head" },
  bal:{ label:"Back Arm Lines", color:"#ff9a9e", route:"SBAL: Trapezius → Deltoid → Lateral forearm → Back of hand. DBAL: Rotator cuff → Triceps → Ulna → Hypothenar", restrictions:"SBAL: upper trap tightness, lateral shoulder, tennis elbow. DBAL: RC dysfunction, posterior shoulder, ulnar wrist", compensation:"SBAL restriction → shoulder elevation → neck tension. DBAL → triceps tightness → elbow restriction" },
  fal:{ label:"Front Arm Lines", color:"#90caf9", route:"SFAL: Pec major → Medial forearm flexors → Fingers. DFAL: Pec minor → Biceps → Carpal tunnel → Thumb", restrictions:"SFAL: pec tightness, medial epicondylalgia, carpal tunnel. DFAL: pec minor, biceps tendinopathy, De Quervain's", compensation:"SFAL restriction → anterior shoulder → forward head. DFAL → biceps overactivity → shoulder impingement" },
  fl:{ label:"Functional Lines", color:"#b0f2b6", route:"Back FL: Lat dorsi → Sacral fascia → Opposite glute max → Lateral femur. Front FL: Pec major → Opp rectus abdominis → Opp adductors", restrictions:"Inability to transfer force across midline, throwing dysfunction, gait asymmetry, contralateral limb pain", compensation:"FL disruption → cannot load contralateral diagonal → compensatory spinal loading" },
};

const FASCIA_REGIONS_DATA = {
  screening:{
    label:"Global Screening", color:"#00d4ff",
    intro:"Start every fascial assessment with global screening tests to identify which fascial lines are restricted and whether dysfunction is local or chain-driven. Fascia responds to slow sustained pressure — always hold 90+ seconds.",
    tests:[
      { id:"fa_skin_roll", label:"Skin Rolling Test (Kibler Fold)", line:"All lines", type:"Global screen",
        how:"Patient prone then supine. Pinch skin between thumb and index finger and roll systematically along the spine (lumbar → thoracic → cervical), then along limbs (distal to proximal). Assess: (1) RESISTANCE — does skin drag or refuse to roll? (2) BLANCHING — does area whiten under pressure? (3) TENDERNESS — is rolling painful? (4) THICKNESS — boggy or thickened? Map all restricted areas to their fascial line. Compare bilateral symmetry.",
        options:[
          { val:"Free — no restriction anywhere", color:"#00c97a", meaning:"Fascial glide normal. Skin rolls smoothly without resistance, blanching, or tenderness. Superficial fascia hydrated and mobile. No myofascial restriction driving distant symptoms. Movement unrestricted by superficial fascial density." },
          { val:"Localised restriction — focal densification", color:"#ffb300", meaning:"Specific area resists rolling — tethers, blanches, or tender. Local densification present. Identify which fascial line this restriction lies on. Treat with sustained myofascial pressure 90 sec at restriction point, then movement load that line." },
          { val:"Line restriction — multiple areas along one line", color:"#ff6b35", meaning:"Multiple restricted areas forming a pattern consistent with one fascial line (e.g. posterior from plantar → calf → thoracolumbar → suboccipital = SBL). Treatment must address the entire line not just focal points. Identify the primary driver — the most densified or oldest restriction point." },
          { val:"Generalised restriction — systemic", color:"#ff4d6d", meaning:"Widespread restriction throughout. May indicate chronic inflammation, prolonged immobility, post-surgical diffuse scarring, or systemic dehydration. Consider rheumatological referral. Global myofascial release, graded movement, and hydration program required." },
        ],
        treatment:"Focal: sustained pressure 90–120 sec + IASTM/Graston + immediate movement loading. Line: MFR along entire line sequentially. Global: whole-body program, aquatic therapy, movement variety, hydration.",
      },
      { id:"fa_passive_tension", label:"Passive Line Tension Test", line:"SBL / SFL", type:"Chain tension screen",
        how:"SBL TEST: Patient supine. Bilateral hip flex to 90° knees extended (bilateral SLR). At resistance, add ankle DF — does lumbar tension increase noticeably? Large increase = SBL chain under tension. SFL TEST: Patient supine. Extend knee from flexed position. At resistance, add hip extension — feel chain buildup through anterior line. KEY: A 'wall' feeling = fascial restriction. Gradual increase = muscle length. Knee bend release test: at SLR resistance, bend knee — drop >10° = fascial restriction (not muscle shortness).",
        options:[
          { val:"Symmetric, minimal tension — normal", color:"#00c97a", meaning:"Both lines at normal resting length. Bilateral SLR 70°+ without significant resistance buildup. Ankle DF does not markedly increase lumbar tension. SFL: knee extends freely. Fascial chains not driving symptoms. No line treatment needed." },
          { val:"SBL asymmetric — posterior chain restriction", color:"#ffb300", meaning:"Asymmetric resistance — one side greater pull through posterior chain. Ankle DF adds significant resistance (not pain) = fascial not neural. SBL under tension. 'Tight hamstrings' not responding to stretching = SBL chain. TREAT: full SBL release from foot → calf → hamstrings → thoracolumbar → suboccipitals." },
          { val:"SFL tension — anterior chain", color:"#ff6b35", meaning:"Knee extension restricted with pull through anterior thigh into hip. Adding hip extension markedly increases resistance. SFL under tension — contributing to forward head and anterior pelvic tilt. TREAT: SFL release from foot dorsum → quads → rectus abdominis → SCM." },
          { val:"Both SBL and SFL — flexion bias posture", color:"#ff4d6d", meaning:"Both chains restricted. Patient locked in flexed forward-tilted posture. Cannot fully extend or flex without restriction. Full-body MFR program required. Common after prolonged immobility, major surgery, or chronic pain posture." },
        ],
        treatment:"SBL: foam roll from plantar fascia → calf → hamstrings → thoracolumbar sequentially. SFL: release quads → hip flexors → abdominals → SCM. Movement: slow eccentric loading of restricted line after MFR.",
      },
      { id:"fa_active_line_load", label:"Active Fascial Line Loading", line:"All lines", type:"Dynamic screen",
        how:"Patient performs movements loading each line. Observe where restriction or compensation first appears: SBL = standing forward bend (where does motion stop?). SFL = standing backbend (where does trunk resist?). LL = lateral bend each side (compare symmetry). SPL = rotational lunge (where does rotation restrict?). DFL = single-leg heel raise with trunk rotation (core DFL). FUNCTIONAL LINES = bird-dog contralateral arm/leg extension. Note: abrupt 'wall' feeling = fascial. Gradual = muscle. Compensation point = approximate line restriction location.",
        options:[
          { val:"Free and symmetric — all lines normal", color:"#00c97a", meaning:"All major fascial lines move freely and symmetrically. Forward bend smooth sequential. Backbend: thoracic extends freely. Lateral bend equal. Rotation symmetric. No compensation in any plane. Fascial system contributing to movement without restriction." },
          { val:"LL restriction — asymmetric lateral bend", color:"#ffb300", meaning:"Lateral bend significantly more restricted one side. Lateral Line (LL) restricted on shorter side. Check: peroneals, IT band, QL, lateral ribs, lateral neck on restricted side. LL MFR sequence: peroneus SMR → IT band → TFL → lateral intercostals → lateral neck." },
          { val:"SBL restriction — limited forward bend", color:"#ff6b35", meaning:"Forward bend restricted — abrupt wall before 70°. SBL restriction. Find primary driver: plantar fascia, hamstrings, thoracolumbar, or suboccipitals — wherever motion restriction is greatest. Release from that point along the line." },
          { val:"SPL restriction — rotation asymmetry", color:"#ff4d6d", meaning:"Rotation significantly restricted one direction. Spiral line restricted on that side. Release diagonally: tibialis anterior → IT band/TFL → opposite external oblique → rhomboids → splenius. Work the diagonal — not just one side." },
        ],
        treatment:"Identify restricted line → MFR along entire line → immediately reload with controlled movement (movement cements fascial reorganisation). Fascia responds to slow sustained loading more than rapid stretching.",
      },
      { id:"fa_densification", label:"Fascial Densification Test (Stecco Method)", line:"All — segmental", type:"Densification screen",
        how:"Take up slack in skin and subcutaneous tissue with fingertip. Press deeper into deep fascial layer. Move finger in small circles (1–2cm) in all directions. NORMAL: finger glides freely in all directions. DENSIFICATION: finger meets resistance in one or more directions — fascia has lost hyaluronan-based glide. Assess speed of release: rapid = hydration issue. Slow = structural densification. Compare bilaterally. Common sites: thoracolumbar, IT band, suboccipital, plantar fascia, pec minor.",
        options:[
          { val:"Free glide — normal fascial hydration", color:"#00c97a", meaning:"Fascial glide present in all directions. Hyaluronan matrix optimal. No densification. Normal proprioceptive input from this region. Movement unrestricted by fascial density." },
          { val:"Mild — one direction restricted", color:"#ffb300", meaning:"Restricted in one vector — mild densification. Early stage fascial change. May respond to hydration and movement alone. Sustained MFR (90 sec) + movement. Monitor." },
          { val:"Moderate — multiple directions restricted", color:"#ff6b35", meaning:"Restricted in multiple vectors. Significant densification. Local symptoms + movement restriction. Tissue feels 'gritty'. IASTM/Graston + dry needling + eccentric movement loading." },
          { val:"Severe — fibrous / scar tissue", color:"#ff4d6d", meaning:"Cannot move in any direction — fibrous densification. Hyaluronan replaced by collagen cross-links. Post-surgical, post-injury, or chronic overuse. Ultrasound pre-treatment → IASTM → sustained MFR → movement loading essential." },
        ],
        treatment:"Mild: sustained pressure 90 sec + movement. Moderate: IASTM + movement. Severe: ultrasound → IASTM → sustained MFR → progressive loading. Hydration essential — fascia is 70% water.",
      },
      { id:"fa_scar", label:"Scar Tissue & Adhesion Assessment", line:"All — regional", type:"Post-surgical screen",
        how:"For each scar: (1) MOBILITY: pinch scar — does it move freely over underlying tissue in all directions? (2) SENSITIVITY: hypersensitive (allodynia) or hyposensitive? (3) THICKNESS: raised (hypertrophic/keloid) or flat? (4) COLOUR: red = active/immature; white = mature. (5) TENSION: does scar create distant pulling? (6) ADHESION: place finger flat over scar, move in X, Y, Z planes — resistance = deep adhesion to fascia/muscle. Map scar adhesions to fascial lines they may be restricting.",
        options:[
          { val:"Mobile scar — no restriction", color:"#00c97a", meaning:"Scar moves freely in all directions. No deep adhesions. Normal scar maturation. No pulling or referred symptoms. No movement restriction related to scar." },
          { val:"Surface adhesion — subcutaneous layer", color:"#ffb300", meaning:"Scar tethered in some directions. Surface adhesion to subcutaneous layer. Scar mobilisation (multidirectional skin rolling over scar), silicone sheeting, vitamin E. Begin 3–4 weeks post-closure." },
          { val:"Deep adhesion — fascia / muscle", color:"#ff6b35", meaning:"Scar adhered to deep fascia or muscle. Skin moves but deep tissue does not. Creates tethering of underlying structures — restricts muscle function, alters joint mechanics. IASTM over scar, deep scar mobilisation, dry needling around adhesion. Common: Caesarean → psoas adhesion → LBP." },
          { val:"Neurological — allodynia / hypersensitivity", color:"#ff4d6d", meaning:"Scar hypersensitive to light touch. Nerve endings trapped in scar tissue. Desensitisation: graded touch (cotton → fingertip → firm pressure over weeks). TENS over scar. Neural mobilisation proximally." },
        ],
        treatment:"Surface: scar massage circular/transverse × 5 min/day from week 3. Deep: IASTM + deep friction + dry needling around adhesion. Neurological: desensitisation + TENS + neural mobilisation. All: vitamin E/silicone gel + movement through scar direction daily.",
      },
    ]
  },
  sbl_sfl:{
    label:"SBL & SFL Lines", color:"#ff6b35",
    intro:"The Superficial Back Line (SBL) and Superficial Front Line (SFL) are antagonist lines running along the posterior and anterior body. They balance each other in upright posture. When one is restricted the other is overstretched and reactive. Hamstrings that won't release with stretching, plantar fasciitis, forward head posture, and anterior pelvic tilt are all signs of SBL/SFL imbalance.",
    tests:[
      { id:"fa_sbl_hamstring", label:"Hamstring Fascial vs Muscle Length (SBL)", line:"SBL", type:"SBL mid-line test",
        how:"STEP 1 — SLR: Perform SLR — note angle at resistance. STEP 2 — Ankle DF: At resistance, add ankle DF. Pain increase = neural. Resistance increase without pain = fascial (SBL). STEP 3 — Knee bend release: At SLR resistance, slightly bend knee. Drop >10° = fascial restriction. Drop <5° = true muscle shortness. STEP 4 — Active contraction: Patient actively contracts quad at end range SLR — range increases = fascial limit (muscle contraction helps slide fascial layer). If muscle is truly short, active contraction will not help.",
        options:[
          { val:"Normal — SLR 70°+, no fascial wall", color:"#00c97a", meaning:"SLR 70°+ without significant fascial wall. Knee bend: small drop (<5°) = normal muscle length. Ankle DF: minimal resistance change. Normal hamstring length and SBL fascial mobility. Forward bend to mid-shin or below." },
          { val:"Neural restriction — Bragard positive", color:"#ffb300", meaning:"Ankle DF markedly increases symptoms (pain, tingling) → neural tension not fascial. Neural mobilisation is the treatment — not myofascial release. Assess with slump + ULTT for full neural picture." },
          { val:"SBL fascial restriction — not muscle shortness", color:"#ff6b35", meaning:"Knee bend drops >10° (fascial). Ankle DF adds resistance without pain (fascial not neural). Active quad contraction increases range = fascial glide issue. DO NOT stretch the hamstrings — they are not short. TREAT: foam roll hamstrings, SBL release from foot → thoracolumbar." },
          { val:"True muscle shortness — gradual resistance", color:"#7f5af0", meaning:"Gradual resistance buildup (not abrupt wall). Knee bend: small drop. Ankle DF: minimal change. Active contraction does not help. True muscle shortness — PNF stretching and progressive loading appropriate." },
        ],
        treatment:"Fascial: SBL SMR (foam roll plantar → calf → hamstrings → thoracolumbar systematically). Movement: slow eccentric SBL loading (standing forward bend with hands on wall). Neural: nerve gliding. Muscle: PNF stretching.",
      },
      { id:"fa_tlf", label:"Thoracolumbar Fascia (TLF) Assessment", line:"SBL / Functional Lines", type:"SBL central test",
        how:"Patient prone. Palpate TLF (broad diamond-shaped sheet connecting lats, erectors, glute max). (1) TISSUE GLIDE: hand flat over TLF, move skin all directions. (2) OBLIQUE TENSION: pull skin diagonally (lower right to upper left and vice versa) — asymmetric resistance = functional line involvement. (3) PASSIVE TRUNK ROTATION: slowly rotate pelvis — TLF tension should build and release symmetrically. (4) SKIN ROLL: roll skin over TLF bilaterally — compare sides.",
        options:[
          { val:"Normal — symmetric glide, free rotation", color:"#00c97a", meaning:"TLF glides freely in all directions. Oblique tension symmetric. Passive trunk rotation creates symmetric gradual resistance. Skin rolling free. TLF hydrated and mobile. Normal force transmission through TLF." },
          { val:"Unilateral restriction", color:"#ffb300", meaning:"TLF restricted one side — unilateral prolonged loading, sport dominance, or old injury. Oblique tension restricted one diagonal. Ipsilateral hip extension restricted and contralateral shoulder restricted (functional line). TREAT: unilateral TLF release." },
          { val:"Bilateral restriction — erector spinae dominant", color:"#ff6b35", meaning:"TLF restricted bilaterally. Erector spinae chronically overactive (CPA: TA inhibited). Common in chronic LBP. TREAT: bilateral TLF release + TA activation + glute max activation (both attach to TLF)." },
          { val:"TLF fibrosis — post-injury / surgery", color:"#ff4d6d", meaning:"TLF fibrotic, thickened, rigid. Post-lumbar surgery, prolonged bed rest, or lumbar trauma. TREAT: IASTM along TLF, sustained MFR 3+ min, dry needling paraspinal at TLF level, progressive movement loading." },
        ],
        treatment:"Unilateral: targeted TLF release 90 sec + IASTM. Bilateral: foam roller thoracolumbar + oblique self-release. Activate: TA + glute max (key TLF tensioners). Movement: cat-cow, thoracolumbar rotation.",
      },
    ]
  },
  spiral_ll:{
    label:"Spiral & Lateral Lines", color:"#d4a5ff",
    intro:"The Spiral Line wraps diagonally connecting opposite shoulder to same hip. The Lateral Line provides lateral stability. Both are critical for gait, sport rotation, and scoliosis patterns. Rotation asymmetry and IT band issues are classic SPL/LL presentations.",
    tests:[
      { id:"fa_spiral_rot", label:"Spiral Line Rotation Assessment", line:"Spiral", type:"SPL dynamic test",
        how:"STEP 1 — Standing rotation: arms folded, rotate trunk fully both ways. Compare symmetry and quality (wall = fascial, gradual = muscle). STEP 2 — Seated vs standing: if restricted only standing = SPL driven, not purely thoracic. STEP 3 — Foot wedge test: rotate standing, then place wedge under one foot (supinate). If rotation improves = SPL foot-to-opposite-shoulder connection. STEP 4 — Arm overhead test: raise arm on restricted side during rotation — if rotation improves = arm line connecting into SPL.",
        options:[
          { val:"Symmetric — SPL balanced", color:"#00c97a", meaning:"Symmetric rotation. Standing equals seated. Foot wedge no effect. Spiral line balanced. Normal rotational capacity for gait and sport." },
          { val:"Asymmetric — SPL restriction one side", color:"#ffb300", meaning:"Rotation restricted one direction. Standing > seated = SPL driven. Foot wedge test changes rotation = foot-to-shoulder SPL confirmed. Release the diagonal: tibialis ant → IT band/TFL → opposite external oblique → rhomboids → splenius." },
          { val:"Bilateral restriction — scoliosis pattern", color:"#ff6b35", meaning:"Both rotations restricted asymmetrically. SPL contributes to rotational scoliosis. Identify shortened side — treat that SPL. Never aggressively release the stretched convex SPL." },
          { val:"Rotation restricted with lateral shift", color:"#ff4d6d", meaning:"Rotation restriction with visible lateral trunk shift. Both SPL and LL involved. Rule out disc pathology first. If clear: combined SPL + LL release." },
        ],
        treatment:"Release SPL diagonal: tibialis ant SMR → IT band → TFL → opposite external oblique → opposite rhomboids → ipsilateral splenius. Movement: rotational lunges, woodchop as dynamic SPL loading.",
      },
      { id:"fa_ll_test", label:"Lateral Line Assessment", line:"Lateral Line", type:"LL restriction test",
        how:"STEP 1 — Lateral bend: stand and bend laterally each direction — compare. STEP 2 — LL tension test: hand at iliac crest + hand at lateral rib — feel lateral line tension like a bowstring. STEP 3 — Peroneal chain: passively invert foot while holding lateral knee — does inversion create chain pull up through IT band? STEP 4 — Intercostal: patient bends toward restricted side — palpate intercostals on convex side — tight = LL intercostal component. STEP 5 — Neck: add ipsilateral neck side-bend at end of trunk bend — further restriction = LL cervical component.",
        options:[
          { val:"Symmetric — LL balanced", color:"#00c97a", meaning:"Equal lateral bend. LL tension symmetric. Peroneal chain free. No scoliotic deviation. Normal lateral stability." },
          { val:"Restricted one side — lateral chain", color:"#ffb300", meaning:"Lateral bend restricted toward one side. LL on shorter side restricted. Peroneal inversion creates chain pull up through IT band and lateral trunk. TREAT: peroneus → IT band → QL → lateral intercostals → lateral neck." },
          { val:"Restricted with scoliosis", color:"#ff6b35", meaning:"Lateral bend restricted AND scoliotic curve visible. Treat the shortened (concave) side LL — the stretched convex side responds. Never aggressively release the stretched LL." },
          { val:"LL restriction with hip elevation", color:"#ff4d6d", meaning:"LL restricted AND ipsilateral hip elevated. QL and LL both involved. Functional leg length discrepancy. TREAT: QL release + IT band SMR + lateral rib mobilisation + glute med activation (CPA)." },
        ],
        treatment:"Release: peroneus SMR → IT band foam roll → TFL SMR → QL release → lateral rib mobilisation → lateral neck SMR. Movement: LL dynamic stretch (side bend with arm overhead). Standing lateral swing for LL rehydration.",
      },
    ]
  },
  dfl_region:{
    label:"Deep Front Line (DFL)", color:"#ffd700",
    intro:"The DFL is the body's innermost fascial line — running from the foot arch through adductors, iliopsoas, diaphragm, and to skull base. It is the 'core' of the fascial system. DFL dysfunction affects breathing, pelvic floor, core stability, and connects foot arch directly to jaw and head position.",
    tests:[
      { id:"fa_dfl_arch", label:"DFL Foundation — Medial Arch Assessment", line:"DFL", type:"DFL origin test",
        how:"STEP 1 — Navicular drop: mark navicular sitting → standing. Normal <6mm. STEP 2 — Short foot: draw metatarsal heads toward heel without curling toes. Can patient activate? STEP 3 — DFL chain test: in short foot position, resist hip adduction — does adduction strength change with arch position? (DFL: arch → adductors connected). STEP 4 — Breathing: in short foot position, breathe deeply — does arch position change with breath? (DFL: arch → psoas → diaphragm). STEP 5 — Thomas test: positive = DFL psoas-arch connection restricted.",
        options:[
          { val:"Normal arch — DFL foundation intact", color:"#00c97a", meaning:"Navicular drop <6mm. Short foot activates on command. Adduction strength unchanged by arch position. Breathing doesn't change arch. Thomas test negative. DFL origin functioning — supporting arch and connecting upward." },
          { val:"Collapsed arch — DFL origin failure", color:"#ffb300", meaning:"Navicular drop 6–10mm. Short foot difficult. Adduction strength changes with arch position. DFL under tension from below. TREAT: short foot exercise + tibialis post activation + intrinsic strengthening." },
          { val:"Severe arch collapse — DFL chain", color:"#ff6b35", meaning:"Navicular drop >10mm. Short foot impossible. DFL chain test positive. Breathing changes arch further — psoas/diaphragm pulling through DFL. Full DFL chain restriction." },
          { val:"Rigid high arch — DFL over-tension", color:"#7f5af0", meaning:"Arch too high. DFL under constant tension. Poor shock absorption. DFL from intrinsics to scalenes under baseline tension. Release DFL from intrinsics → adductors → psoas sequentially." },
        ],
        treatment:"Arch collapse: short foot × 20 reps, tibialis posterior activation, intrinsic strengthening. Over-tension: DFL release — plantar intrinsic MFR, adductor MFR, psoas release. Breathing integration: breathe while maintaining short foot position.",
      },
      { id:"fa_dfl_breathing", label:"Diaphragm — DFL Central Hub", line:"DFL", type:"DFL central test",
        how:"Patient supine, knees bent. STEP 1 — Breathing: hand on chest + hand on abdomen. Normal: abdomen rises first. STEP 2 — Lateral expansion: hands bilaterally on lower ribs — normal 360° expansion including posterior. STEP 3 — Diaphragm palpation: fingers under lower rib cage margin, breathe in — feel clear descent. STEP 4 — DFL tension: one hand under thoracolumbar (psoas level) + other on anterior lower ribs — breathe — do these two structures move together through DFL? STEP 5 — Psoas connection: Thomas test positive? (psoas and diaphragm share fascial attachment through DFL).",
        options:[
          { val:"Normal — DFL hub free", color:"#00c97a", meaning:"Abdomen rises first. 360° rib expansion. Diaphragm clearly descends. Psoas and diaphragm move together. Thomas test negative. Core IAP managed correctly." },
          { val:"Thoracic breathing — diaphragm inhibited", color:"#ffb300", meaning:"Chest rises first. Scalenes/SCM visible on normal breathing. Diaphragm barely descends. CPA: diaphragm inhibited → scalenes compensating. Core IAP generation impaired → LBP risk. TREAT: diaphragm activation (crocodile breathing) + scalene release." },
          { val:"Diaphragm restricted — fascial adhesion", color:"#ff6b35", meaning:"Breathing partially restricted. DFL tension test: thoracolumbar and rib cage do NOT move together. Often post-abdominal surgery. Diaphragmatic fascial adhesion: manual release under lower rib margin + visceral mobilisation." },
          { val:"Paradoxical breathing — severe DFL disruption", color:"#ff4d6d", meaning:"Abdomen moves IN on inhalation. Diaphragm not descending. Severe DFL disruption. Consider phrenic nerve, chronic anxiety, or post-surgical adhesion. Refer for respiratory physiotherapy." },
        ],
        treatment:"Inhibited: 360° diaphragmatic breathing — crocodile breathing prone, lateral rib expansion drills. Restricted: manual release under lower rib margin during breathing. Psoas release if Thomas positive. Visceral mobilisation if post-surgical.",
      },
    ]
  },
  force_chain:{
    label:"Force Transmission & Chain", color:"#00c97a",
    intro:"Fascial force transmission determines whether dysfunction is LOCAL or CHAIN-DRIVEN. Regional interdependence means a problem in one region causes symptoms in a remote region. Identifying the primary fascial driver — not just treating the painful area — is the key to lasting results.",
    tests:[
      { id:"fa_remote_test", label:"Remote Restriction Test (Regional Interdependence)", line:"All", type:"Cross-regional chain test",
        how:"PURPOSE: Does treating a REMOTE area (not the painful area) change symptoms? (1) Baseline: assess painful area — note ROM and pain. (2) Remote release: apply 90 sec sustained pressure to a suspected chain connection (remote from pain). (3) Re-assess: does ROM or pain change immediately? Common connections to test: plantar fascia → ipsilateral suboccipital (SBL). Right pec minor → left hip flexor (functional line). Ipsilateral hamstring → contralateral cervical rotation (SBL → functional). TFL → contralateral shoulder (LL → functional). POSITIVE = remote treatment significantly changes local symptoms.",
        options:[
          { val:"No remote effect — local dysfunction", color:"#00c97a", meaning:"Remote treatment does not change local symptoms. Dysfunction is primarily local. Standard local assessment and treatment appropriate. Fascial chains not significantly contributing." },
          { val:"Moderate remote effect — chain involved", color:"#ffb300", meaning:"Remote treatment partially changes symptoms (20–40% improvement). Chain contributing but local dysfunction also present. Treat BOTH: release remote chain driver AND treat locally." },
          { val:"Significant remote effect — chain is primary driver", color:"#ff6b35", meaning:"Remote treatment markedly changes symptoms (>50% improvement). Remote area IS the primary driver — local area is the victim of chain tension. Focus treatment at the remote fascial driver, not the painful site." },
          { val:"Multiple remote connections — complex chain", color:"#ff4d6d", meaning:"Multiple remote areas influence local symptoms. Multi-line complex restriction. Patient has been treated locally repeatedly without lasting effect. Map all chain connections. Begin at the fascial chain driver furthest from symptoms." },
        ],
        treatment:"Local only: standard treatment. Chain involved: find primary restriction in line → release from primary point → reassess whole line → load entire line eccentrically. Movement mandatory after every fascial release.",
      },
      { id:"fa_force_closure", label:"Force Closure / SIJ Fascial Tension Test", line:"Functional Lines / DFL", type:"Pelvic chain test",
        how:"ASLR TEST: patient supine, lift one leg 20cm. Rate effort 0–5. ANTERIOR COMPRESSION: bilateral ASIS compression — does ASLR ease? (anterior force closure deficit). POSTERIOR COMPRESSION: SIJ compression posteriorly — does ASLR ease? (posterior deficit). TLF TEST: palpate bilateral TLF — does palpating help ASLR? (TLF contributing to force closure). ABDOMINAL COMPRESSION: manual abdominal pressure during ASLR — ease = TA + TLF force closure needed.",
        options:[
          { val:"ASLR normal — force closure adequate", color:"#00c97a", meaning:"ASLR easy (0–1 effort). Compression not needed. SIJ force closure adequate through TLF, TA, glute max, and biceps femoris. Pelvic ring stable." },
          { val:"Anterior force closure deficit", color:"#ffb300", meaning:"ASLR effortful. Anterior ASIS compression helps. TA + obliques + pelvic floor insufficient. TREAT: TA activation, oblique strengthening, pelvic floor physiotherapy." },
          { val:"Posterior force closure deficit", color:"#ff6b35", meaning:"Posterior SIJ compression helps. Glute max + biceps femoris + TLF insufficient posteriorly. Common postpartum. TREAT: glute max activation, TLF tensioning, SIJ belt short-term." },
          { val:"Bilateral deficit — severe", color:"#ff4d6d", meaning:"Both anterior and posterior compression help. Severe force closure failure. Multi-system treatment: pelvic physiotherapy + SIJ belt + graded loading program." },
        ],
        treatment:"Anterior deficit: TA drawing-in + pelvic floor. Posterior deficit: glute max CPA + TLF activation (deadlift pattern). Bilateral: SIJ belt 6–8 weeks + specific stabilisation. TLF: MFR + immediate loading (bridge, deadlift).",
      },
      { id:"fa_compensation_map", label:"Fascial Compensation Pattern Mapping", line:"All", type:"Multi-line integration",
        how:"SYSTEMATIC MAPPING: (1) Identify primary complaint: location, movement most affected. (2) Test ALL lines at painful area: which fascial line passes through? (3) Follow line AWAY from pain: does restricting/releasing remote area change local pain? (4) Test ANTAGONIST line: SBL restricted → test SFL. LL → opposite LL. (5) Test FUNCTIONAL CONNECTIONS: check contralateral extremity. (6) Classify: LOCAL (restriction only at pain site) vs CHAIN (one line, multiple areas) vs GLOBAL (multiple lines). (7) PRIMARY RESTRICTION: most densified or oldest point in chain — often matches old injury or surgery site.",
        options:[
          { val:"Local pattern — single area, single line", color:"#00c97a", meaning:"Restriction only at painful area. One line, local only. Responds well to local treatment. Common in acute injuries. Straightforward fascial presentation." },
          { val:"Chain pattern — one line, multiple areas", color:"#ffb300", meaning:"Restriction at painful site AND multiple points along same line. Identify OLDEST or MOST DENSIFIED point in chain — this is the driver. TREAT: release primary driver first → reassess whole line → movement load entire line." },
          { val:"Multi-line pattern — two or more lines", color:"#ff6b35", meaning:"Two or more lines restricted. Complex postural dysfunction. Treat most restricted line first — others often partially normalise. Common in chronic pain, post-surgical patients." },
          { val:"Global restriction — all lines involved", color:"#ff4d6d", meaning:"Multiple lines globally restricted. Systemic fascial restriction — autoimmune, chronic inflammation, major trauma, prolonged immobility. Global MFR program, movement therapy, hydration, lifestyle modification. Specialist MFR referral." },
        ],
        treatment:"Local: treat locally. Chain: identify driver → release sequentially → load line. Multi-line: treat most restricted first, reassess. Global: whole-body — aquatic therapy, global MFR, movement variety. Movement after EVERY fascial release is mandatory.",
      },
    ]
  },
};

// ─── FASCIA LINE BODY MAP ─────────────────────────────────────────────────────
function FasciaBodyMap({ selected, onSelect }) {
  const lines = {
    sbl:{ d:"M124,385 L125,340 L127,295 L130,250 L133,205 L137,165 L140,130 L143,95 L146,72 L148,58 L150,38", color:"#ff6b35", label:"SBL" },
    sfl:{ d:"M176,385 L175,340 L173,295 L170,250 L167,205 L163,165 L160,130 L157,95 L154,72 L152,58 L150,38", color:"#00d4ff", label:"SFL" },
    ll:{ d:"M113,385 L110,340 L108,295 L107,255 L109,215 L113,185 L110,160 L106,140 L96,118 L92,95 L96,75", color:"#a8ff3e", label:"LL" },
    spiral:{ d:"M176,380 Q168,340 155,300 Q140,260 125,230 Q108,200 100,170 Q96,140 100,115 Q107,92 120,78 Q137,65 150,55", color:"#d4a5ff", label:"SPL" },
    dfl:{ d:"M150,385 L150,345 L149,300 L148,255 L148,210 L149,170 L149,130 L150,95 L150,65 L150,40", color:"#ffd700", label:"DFL" },
    bal:{ d:"M150,100 L140,108 L122,115 L100,120 L88,132 L86,155 L86,185 L86,210", color:"#ff9a9e", label:"BAL" },
    fal:{ d:"M150,100 L160,108 L178,115 L200,120 L212,132 L214,155 L214,185 L214,210", color:"#90caf9", label:"FAL" },
  };
  const bodyParts = [
    {t:"ellipse",cx:150,cy:32,rx:20,ry:25},{t:"rect",x:142,y:56,w:16,h:18,rx:4},
    {t:"ellipse",cx:150,cy:120,rx:36,ry:48},{t:"ellipse",cx:150,cy:188,rx:32,ry:20},
    {t:"rect",x:88,y:88,w:14,h:52,rx:7},{t:"rect",x:198,y:88,w:14,h:52,rx:7},
    {t:"rect",x:81,y:144,w:12,h:48,rx:6},{t:"rect",x:207,y:144,w:12,h:48,rx:6},
    {t:"ellipse",cx:87,cy:206,rx:9,ry:12},{t:"ellipse",cx:213,cy:206,rx:9,ry:12},
    {t:"rect",x:119,y:207,w:20,h:68,rx:8},{t:"rect",x:161,y:207,w:20,h:68,rx:8},
    {t:"ellipse",cx:129,cy:282,rx:12,ry:12},{t:"ellipse",cx:171,cy:282,rx:12,ry:12},
    {t:"rect",x:121,y:293,w:16,h:62,rx:6},{t:"rect",x:163,y:293,w:16,h:62,rx:6},
    {t:"ellipse",cx:124,cy:370,rx:15,ry:9},{t:"ellipse",cx:176,cy:370,rx:15,ry:9},
  ];
  return (
    <div style={{background:C.s2,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
      <div style={{fontSize:"0.8rem",fontWeight:700,color:C.muted,textAlign:"center",marginBottom:10,textTransform:"uppercase",letterSpacing:"1px"}}>Fascial Lines — Tap to Select</div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
        <svg width="300" height="410" viewBox="0 0 300 410" style={{display:"block",flexShrink:0}}>
          {bodyParts.map((p,i)=>p.t==="ellipse"
            ?<ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="#FFFFFF" stroke="#E0E0E2" strokeWidth="1.5"/>
            :<rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx||0} fill="#FFFFFF" stroke="#E0E0E2" strokeWidth="1.5"/>
          )}
          {Object.entries(lines).map(([key,ln])=>(
            <g key={key} style={{cursor:"pointer"}} onClick={()=>onSelect(selected===key?null:key)}>
              <path d={ln.d} stroke={ln.color} strokeWidth={selected===key?5:2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={selected&&selected!==key?0.15:1} style={{transition:"all 0.2s"}}/>
            </g>
          ))}
          {Object.entries(lines).map(([key,ln])=>{
            const pts=ln.d.match(/[\d.]+/g);
            const mx=Math.floor(pts.length/4)*2;
            const lx=parseFloat(pts[mx])+(key==="sbl"?-20:key==="sfl"?6:key==="dfl"?5:0);
            const ly=parseFloat(pts[mx+1]);
            return <text key={"t"+key} x={lx} y={ly} fontSize="9" fill={ln.color} fontWeight="700" opacity={selected&&selected!==key?0.15:1} style={{cursor:"pointer",pointerEvents:"none"}}>{ln.label}</text>;
          })}
        </svg>
        <div style={{flex:1,minWidth:160}}>
          <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Fascial Lines</div>
          {Object.entries(FASCIA_LINES_DATA).map(([key,ln])=>(
            <div key={key} onClick={()=>onSelect(selected===key?null:key)}
              style={{background:selected===key?`${ln.color}18`:C.s3,border:`1px solid ${selected===key?ln.color:C.border}`,borderRadius:8,padding:"7px 10px",marginBottom:5,cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{fontWeight:700,fontSize:"0.74rem",color:ln.color}}>{ln.label}</div>
              {selected===key&&<div style={{fontSize:"0.78rem",color:C.muted,marginTop:3,lineHeight:1.5}}>{ln.restrictions}</div>}
            </div>
          ))}
        </div>
      </div>
      {selected&&FASCIA_LINES_DATA[selected]&&(
        <div style={{background:`${FASCIA_LINES_DATA[selected].color}08`,border:`1px solid ${FASCIA_LINES_DATA[selected].color}30`,borderRadius:9,padding:12,marginTop:12}}>
          <div style={{fontWeight:700,color:FASCIA_LINES_DATA[selected].color,marginBottom:6,fontSize:"0.85rem"}}>{FASCIA_LINES_DATA[selected].label}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:"0.82rem"}}>
            <div><div style={{fontWeight:700,color:C.muted,fontSize:"0.8rem",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>Route</div><div style={{color:C.text,lineHeight:1.6}}>{FASCIA_LINES_DATA[selected].route}</div></div>
            <div><div style={{fontWeight:700,color:C.muted,fontSize:"0.8rem",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>Compensation Pattern</div><div style={{color:C.text,lineHeight:1.6}}>{FASCIA_LINES_DATA[selected].compensation}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FASCIA SECTION COMPONENT ────────────────────────────────────────────────
function FasciaSection({ data, set, navContext={} }) {
    const [region, setRegion] = useState("screening");
  const [openTest, setOpenTest] = useState(null);
  const [modalTest, setModalTest] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const reg = FASCIA_REGIONS_DATA[region];

  // Deep-link: switch to relevant region and highlight test cards
  React.useEffect(()=>{
    const targets = navContext.fasciaHighlights
      ? navContext.fasciaHighlights
      : navContext.fasciaHighlight ? [navContext.fasciaHighlight] : [];
    if(!targets.length) return;
    // Infer region from target ID
    const first = targets[0];
    if(first.includes("sbl")||first.includes("sfl")||first.includes("tlf")) setRegion("sbl_sfl");
    else setRegion("screening");
    setTimeout(()=>{
      let scrolled=false;
      targets.forEach(id=>{
        const el = document.querySelector(`[data-fa-id="${id}"]`);
        if(el){
          if(!scrolled){ el.scrollIntoView({ behavior:"smooth", block:"center" }); scrolled=true; }
          applyPersistentHighlight(el);
        }
      });
    }, 450);
  },[navContext.fasciaHighlight, navContext.fasciaHighlights]);

  return (
    <div>
      <FasciaBodyMap selected={selectedLine} onSelect={setSelectedLine} />
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {Object.entries(FASCIA_REGIONS_DATA).map(([key,r])=>(
          <button key={key} type="button" onClick={()=>{setRegion(key);setOpenTest(null);}}
            style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${region===key?r.color:C.border}`,background:region===key?`${r.color}15`:"transparent",color:region===key?r.color:C.muted,fontSize:"0.74rem",fontWeight:region===key?700:400,cursor:"pointer"}}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={{background:`${reg.color}08`,border:`1px solid ${reg.color}25`,borderRadius:10,padding:14,marginBottom:16,fontSize:"0.8rem",color:C.text,lineHeight:1.7}}>{reg.intro}</div>
      {reg.tests.map((t)=>{
        const currentVal=data[t.id]||"";
        const currentOption=t.options.find(o=>o.val===currentVal);
        const isOpen=openTest===t.id;
        return (
          <div key={t.id} data-fa-id={t.id} style={{background:C.surface,border:`1px solid ${currentVal?reg.color+"40":C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
            <div onClick={()=>setOpenTest(isOpen?null:t.id)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${currentVal?reg.color:"#1a2d45"}`}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:"0.8rem",padding:"2px 7px",borderRadius:7,background:`${reg.color}20`,color:reg.color,fontWeight:700}}>{t.type}</span>
                  <span style={{fontSize:"0.8rem",color:C.muted}}>Line: {t.line}</span>
                </div>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:C.text}}>{t.label}</div>
                {currentVal&&<div style={{marginTop:5,display:"inline-flex",alignItems:"center",gap:6,padding:"2px 8px",borderRadius:8,background:`${currentOption?.color||C.muted}18`,border:`1px solid ${currentOption?.color||C.muted}40`}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:currentOption?.color||C.muted}}/>
                  <span style={{fontSize:"0.78rem",fontWeight:700,color:currentOption?.color||C.muted}}>{currentVal}</span>
                </div>}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginLeft:10}}>
                <button type="button" onClick={e=>{e.stopPropagation();setModalTest(t);}} style={{padding:"3px 10px",background:"rgba(127,90,240,0.15)",border:`1px solid ${C.a2}40`,borderRadius:6,color:C.a2,fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>ℹ Info</button>
                <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            {isOpen&&(
              <div style={{padding:"0 14px 14px"}}>
                <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:12,marginBottom:12}}>
                  <div style={{fontSize:"0.73rem",fontWeight:700,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>👐 How to Perform</div>
                  <div style={{fontSize:"0.8rem",color:C.text,lineHeight:1.7,whiteSpace:"pre-line"}}>{t.how}</div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:"0.73rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📊 Select Finding — What Each Result Means</div>
                  {t.options.map(opt=>(
                    <div key={opt.val} onClick={()=>set(t.id,currentVal===opt.val?"":opt.val)}
                      style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",borderRadius:9,marginBottom:7,cursor:"pointer",border:`1px solid ${currentVal===opt.val?opt.color:C.border}`,background:currentVal===opt.val?`${opt.color}12`:"transparent",transition:"all 0.15s"}}>
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${opt.color}`,background:currentVal===opt.val?opt.color:"transparent",flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {currentVal===opt.val&&<span style={{color:"#000",fontSize:"0.75rem",fontWeight:900}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"0.8rem",color:opt.color,marginBottom:3}}>{opt.val}</div>
                        <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.6}}>{opt.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:`${reg.color}08`,border:`1px solid ${reg.color}25`,borderRadius:8,padding:11}}>
                  <div style={{fontSize:"0.73rem",fontWeight:700,color:reg.color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>→ Treatment Protocol</div>
                  <div style={{fontSize:"0.77rem",color:C.text,lineHeight:1.7}}>{t.treatment}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {modalTest&&(
        <div onClick={()=>setModalTest(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${reg.color}50`,borderRadius:14,padding:24,maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div><div style={{fontWeight:800,color:reg.color,fontSize:"1rem"}}>{modalTest.label}</div><div style={{fontSize:"0.8rem",color:C.muted,marginTop:3}}>{modalTest.type} · Line: {modalTest.line}</div></div>
              <button onClick={()=>setModalTest(null)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 9px",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.73rem",fontWeight:700,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>👐 How to Perform</div>
              <div style={{background:C.s2,borderRadius:8,padding:14,fontSize:"0.82rem",color:C.text,lineHeight:1.8,whiteSpace:"pre-line"}}>{modalTest.how}</div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.73rem",fontWeight:700,color:C.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>📊 What Each Result Means</div>
              {modalTest.options.map(opt=>(
                <div key={opt.val} style={{padding:"8px 12px",borderRadius:8,marginBottom:7,border:`1px solid ${opt.color}30`,background:`${opt.color}08`}}>
                  <div style={{fontWeight:700,fontSize:"0.78rem",color:opt.color,marginBottom:3}}>{opt.val}</div>
                  <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.6}}>{opt.meaning}</div>
                </div>
              ))}
            </div>
            <div style={{background:`${reg.color}08`,border:`1px solid ${reg.color}25`,borderRadius:8,padding:12,marginBottom:16}}>
              <div style={{fontSize:"0.73rem",fontWeight:700,color:reg.color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>→ Treatment Protocol</div>
              <div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.7}}>{modalTest.treatment}</div>
            </div>
            <button onClick={()=>setModalTest(null)} style={{width:"100%",padding:"9px",background:C.a2,border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── CPA REGION COMPONENT ────────────────────────────────────────────────────
function NKTSection({ data, set, navContext={} }) {
    const [region, setRegion] = useState(navContext.nktRegion||"cervical");
  React.useEffect(()=>{ if(navContext.nktRegion) setRegion(navContext.nktRegion); },[navContext.nktRegion]);
  React.useEffect(()=>{
    const targets=navContext.nktHighlights?navContext.nktHighlights:navContext.nktHighlight?[navContext.nktHighlight]:[];
    if(!targets.length) return;
    setTimeout(()=>{
      let scrolled=false;
      targets.forEach(id=>{
        const el=document.querySelector(`[data-nkt-id="${id}"]`);
        if(el){ if(!scrolled){el.scrollIntoView({behavior:"smooth",block:"center"});scrolled=true;}
          applyPersistentHighlight(el); }
      });
    },450);
  },[navContext.nktHighlight,navContext.nktHighlights]);
  const [openTest, setOpenTest] = useState(null);
  const [modalTest, setModalTest] = useState(null);
  const reg = NKT_REGIONS[region];

  const [nktHelpOpen, setNktHelpOpen] = React.useState(() => !localStorage.getItem("pm_cpa_seen"));
  return (
    <div>
      {/* ── CPA Framework Explainer ── */}
      <div style={{border:"1px solid #0891b244",borderRadius:12,overflow:"hidden",marginBottom:14}}>
        <div onClick={()=>{setNktHelpOpen(o=>!o); localStorage.setItem("pm_cpa_seen","1");}}
          style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",cursor:"pointer",background:"#0891b20a"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"1rem"}}>📚</span>
            <span style={{fontWeight:700,fontSize:"0.85rem",color:"#0891b2"}}>What is CPA Assessment?</span>
            <span style={{fontSize:"0.75rem",color:"#0891b288",fontStyle:"italic"}}>Tap to {nktHelpOpen?"hide":"show"} guide</span>
          </div>
          <span style={{fontSize:"0.75rem",color:"#0891b2"}}>{nktHelpOpen?"▲":"▼"}</span>
        </div>
        {nktHelpOpen && (
          <div style={{padding:"14px 16px",borderTop:"1px solid #0891b222",background:"#f0faff",fontSize:"0.82rem",color:"#0a3a4a",lineHeight:1.7}}>
            <p style={{margin:"0 0 10px"}}><strong>Compensation Pattern Analysis (CPA)</strong> is a functional movement assessment approach based on motor control principles. It identifies <strong>compensation patterns</strong> where overactive (facilitated) muscles substitute for inhibited (neurologically underactive) muscles, creating dysfunctional movement and pain.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div style={{background:"#0891b20d",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,marginBottom:4,color:"#0891b2"}}>🧠 CPA core principle</div>
                <div>The nervous system stores movement programmes that can become disrupted after injury or disuse. Injury creates <strong>dysfunctional compensation patterns</strong>: one overactive muscle inhibits its paired antagonist.<br/><br/><strong>Inhibited</strong> = weak, underactive<br/><strong>Facilitated</strong> = overactive, tight</div>
              </div>
              <div style={{background:"#05966910",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,marginBottom:4,color:"#059669"}}>🔍 Assessment steps</div>
                <div>1. <strong>Test inhibited muscle</strong> — manual muscle test (MMT) → weak<br/>2. <strong>Treat facilitated muscle</strong> — release (massage, dry needling)<br/>3. <strong>Retest inhibited</strong> — should now test strong<br/>4. If stronger = compensation confirmed</div>
              </div>
            </div>
            <div style={{background:"#7c3aed0d",borderRadius:8,padding:10,border:"1px solid #7c3aed25"}}>
              <strong style={{color:"#7c3aed"}}>💡 Common patterns</strong><br/>
              Upper trap facilitating lower trap/serratus (shoulder). SCM facilitating deep cervical flexors (neck pain). Hip flexor facilitating glute max (LBP). Pec minor facilitating lower trap (postural kyphosis).
            </div>
          </div>
        )}
      </div>

      {/* Region chips */}
      <RegionChips
        regions={Object.entries(NKT_REGIONS).map(([key,r])=>({
          key,
          label: r.label,
          filled: r.tests.filter(t=>data[t.id]).length,
        }))}
        active={region}
        onSelect={k=>{setRegion(k);setOpenTest(null);}}
      />

      {/* Region intro — hidden on mobile */}
      <div className="pm-desktop-only" style={{ background:`${reg.color}08`, border:`1px solid ${reg.color}25`, borderRadius:10, padding:14, marginBottom:16, fontSize:"0.8rem", color:C.text, lineHeight:1.7 }}>
        {reg.intro}
      </div>

      {/* Tests */}
      {reg.tests.map((t,i)=>{
        const currentVal = data[t.id] || "";
        const currentOption = t.options.find(o=>o.val===currentVal);
        const isOpen = openTest === t.id;
        return (
          <div key={t.id} data-nkt-id={t.id} style={{ background:C.surface, border:`1px solid ${currentVal?reg.color+"40":C.border}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
            {/* Header */}
            <div onClick={()=>setOpenTest(isOpen?null:t.id)}
              style={{ padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${currentVal?reg.color:"#1a2d45"}` }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"0.88rem", color:C.text }}>{t.label}</div>
                <div style={{ fontSize:"0.8rem", color:C.muted, marginTop:2 }}>🎯 Muscle: {t.muscle} &nbsp;|&nbsp; ⚠️ Compensator: {t.compensator}</div>
                {currentVal && <div style={{ marginTop:5, display:"inline-flex", alignItems:"center", gap:6, padding:"2px 8px", borderRadius:8, background:`${currentOption?.color||C.muted}18`, border:`1px solid ${currentOption?.color||C.muted}40` }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:currentOption?.color||C.muted }} />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:currentOption?.color||C.muted }}>{currentVal}</span>
                </div>}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button type="button" onClick={e=>{ e.stopPropagation(); setModalTest(t); }}
                  style={{ padding:"3px 10px", background:"rgba(127,90,240,0.15)", border:`1px solid ${C.a2}40`, borderRadius:6, color:C.a2, fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                  ℹ How to Perform
                </button>
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ padding:"0 14px 14px" }}>
                {/* How to */}
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, padding:12, marginBottom:12 }}>
                  <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>👐 How to Perform</div>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <SmallClinicalImg id={t.id} title={t.label} />
                    <div style={{ fontSize:"0.8rem", color:C.text, lineHeight:1.7, flex:1 }}>{t.how}</div>
                  </div>
                </div>

                {/* Options */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>📊 Select Finding — What Each Result Means</div>
                  {t.options.map(opt=>(
                    <div key={opt.val} onClick={()=>set(t.id, currentVal===opt.val?"":opt.val)}
                      style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 12px", borderRadius:9, marginBottom:7, cursor:"pointer", border:`1px solid ${currentVal===opt.val?opt.color:C.border}`, background:currentVal===opt.val?`${opt.color}12`:"transparent", transition:"all 0.15s" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${opt.color}`, background:currentVal===opt.val?opt.color:"transparent", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {currentVal===opt.val && <span style={{ color:"#000", fontSize:"0.75rem", fontWeight:900 }}>✓</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:"0.8rem", color:opt.color, marginBottom:3 }}>{opt.val}</div>
                        <div style={{ fontSize:"0.76rem", color:C.text, lineHeight:1.6 }}>{opt.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Treatment */}
                <div style={{ background:`${reg.color}08`, border:`1px solid ${reg.color}25`, borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:"0.75rem", fontWeight:700, color:reg.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>→ Treatment Protocol</div>
                  <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.7 }}>{t.treatment}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* How-to Modal */}
      {modalTest && (
        <div onClick={()=>setModalTest(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${reg.color}50`, borderRadius:14, padding:24, maxWidth:560, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, color:reg.color, fontSize:"1rem" }}>{modalTest.label}</div>
                <div style={{ fontSize:"0.82rem", color:C.muted, marginTop:3 }}>Muscle: {modalTest.muscle}</div>
              </div>
              <button onClick={()=>setModalTest(null)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>👐 Step-by-Step Procedure</div>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <SmallClinicalImg id={modalTest.id} title={modalTest.label} />
                <div style={{ background:C.s2, borderRadius:8, padding:14, fontSize:"0.82rem", color:C.text, lineHeight:1.8, flex:1 }}>{modalTest.how}</div>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.a3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>⚠️ What Each Result Means</div>
              {modalTest.options.map(opt=>(
                <div key={opt.val} style={{ padding:"8px 12px", borderRadius:8, marginBottom:6, border:`1px solid ${opt.color}30`, background:`${opt.color}08` }}>
                  <div style={{ fontWeight:700, fontSize:"0.78rem", color:opt.color, marginBottom:3 }}>{opt.val}</div>
                  <div style={{ fontSize:"0.76rem", color:C.text, lineHeight:1.6 }}>{opt.meaning}</div>
                </div>
              ))}
            </div>
            <div style={{ background:`${reg.color}08`, border:`1px solid ${reg.color}25`, borderRadius:8, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:reg.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>→ Treatment Protocol</div>
              <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.7 }}>{modalTest.treatment}</div>
            </div>
            <button onClick={()=>setModalTest(null)} style={{ width:"100%", padding:"9px", background:C.a2, border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CYRIAX REGION COMPONENT ─────────────────────────────────────────────────
const CYRIAX_REGIONS = {
  cervical:{ label:"Cervical", tests:[
    { id:"cy_c_flex", label:"Resisted Cervical Flexion", muscle:"SCM / deep neck flexors", how:"Patient seated, chin neutral. Resist forehead with palm. POSITIVE = pain or weakness at neck flexors.", sig:"Weak+painless = C3/4 neuropraxia. Weak+painful = serious lesion or C4 disc." },
    { id:"cy_c_ext", label:"Resisted Cervical Extension", muscle:"Semispinalis / splenius / suboccipitals", how:"Resist occiput. Patient extends into your hand.", sig:"Weakness = upper cervical instability or C5/6 radiculopathy. Strong+painful = posterior cervical muscle lesion." },
    { id:"cy_c_sflex_l", label:"Resisted Side Flex Left", muscle:"Left scalenes / lateral flexors", how:"Resist left temporal bone. Patient side-flexes left.", sig:"Pain = ipsilateral scalene/lateral flexor lesion. Weakness = C3/4 nerve root." },
    { id:"cy_c_sflex_r", label:"Resisted Side Flex Right", muscle:"Right scalenes / lateral flexors", how:"Resist right temporal bone.", sig:"Asymmetric weakness = radiculopathy. Compare both sides." },
    { id:"cy_c_rot_l", label:"Resisted Rotation Left", muscle:"Right SCM / Left splenius capitis", how:"Resist left chin rotation.", sig:"Tests contralateral SCM. Relevant for torticollis, whiplash." },
    { id:"cy_c_rot_r", label:"Resisted Rotation Right", muscle:"Left SCM / Right splenius capitis", how:"Resist right chin rotation.", sig:"Tests left SCM and right splenius." },
  ]},
  shoulder:{ label:"Shoulder", tests:[
    { id:"cy_s_abd", label:"Resisted Shoulder Abduction", muscle:"Supraspinatus / middle deltoid", how:"Arm at side 0–30°. Resist distally. The key shoulder test.", sig:"Strong+painful = supraspinatus tendinopathy. Weak+painless = C5 root or complete tear." },
    { id:"cy_s_flex", label:"Resisted Shoulder Flexion", muscle:"Anterior deltoid / biceps", how:"Arm at side, elbow extended. Resist forward flexion.", sig:"Strong+painful = anterior deltoid or biceps lesion. Weak+painless = C5/6." },
    { id:"cy_s_er", label:"Resisted External Rotation", muscle:"Infraspinatus / teres minor", how:"Elbow 90°, at side. Resist outward rotation.", sig:"Strong+painful = infraspinatus tendinopathy. Weak+painless = massive RC tear or C5." },
    { id:"cy_s_ir", label:"Resisted Internal Rotation", muscle:"Subscapularis", how:"Elbow 90°, at side. Resist inward rotation.", sig:"Weak+painful = subscapularis lesion. Combine with lift-off + belly press." },
    { id:"cy_s_elbow_flex", label:"Resisted Elbow Flexion", muscle:"Biceps long head", how:"Elbow 90°, supinated. Resist flexion.", sig:"Pain at bicipital groove = biceps long head lesion. Use with Speed's test." },
  ]},
  elbow:{ label:"Elbow / Wrist", tests:[
    { id:"cy_e_flex", label:"Resisted Elbow Flexion", muscle:"Biceps / brachialis", how:"Elbow 90°, supinated. Resist flexion.", sig:"Strong+painful = distal biceps or brachialis. Weak+painless = C5/6 radiculopathy." },
    { id:"cy_e_ext", label:"Resisted Elbow Extension", muscle:"Triceps", how:"Elbow 30°. Resist extension.", sig:"Weak+painless = C7 root. Strong+painful = triceps tendinopathy (rare)." },
    { id:"cy_w_ext", label:"Resisted Wrist Extension", muscle:"ECRB / ECRL / ECU", how:"Fist clenched, resist wrist extension. Main lateral epicondylalgia test.", sig:"Strong+painful at lateral epicondyle = ECRB tendinopathy (tennis elbow)." },
    { id:"cy_w_flex", label:"Resisted Wrist Flexion", muscle:"FCR / FCU", how:"Resist wrist flexion.", sig:"Strong+painful at medial epicondyle = FCR/FCU tendinopathy (golfer's elbow)." },
    { id:"cy_e_pro", label:"Resisted Pronation", muscle:"Pronator teres", how:"Elbow 90°, neutral. Resist pronation.", sig:"Pain medial elbow = medial epicondylalgia. Tests pronator teres." },
    { id:"cy_e_sup", label:"Resisted Supination", muscle:"Supinator / biceps", how:"Elbow 90°, pronated. Resist supination.", sig:"Lateral pain = lateral epicondylalgia variant. Proximal pain = biceps radial insertion." },
  ]},
  lumbar:{ label:"Lumbar / Hip", tests:[
    { id:"cy_l_flex", label:"Resisted Trunk Flexion", muscle:"Rectus abdominis / hip flexors", how:"Supine, knees bent. Resist curl-up. POSITIVE = anterior pain.", sig:"Differentiates from passive lumbar flexion pain. Weak = nerve root or serious lesion." },
    { id:"cy_l_ext", label:"Resisted Trunk Extension", muscle:"Erector spinae", how:"Prone. Resist trunk extension.", sig:"Strong+painful = muscular lumbar lesion. Weak = L3–L5 radiculopathy." },
    { id:"cy_hip_flex_res", label:"Resisted Hip Flexion", muscle:"Iliopsoas", how:"Supine. Resist hip flexion at 90°.", sig:"Strong+painful = iliopsoas tendinopathy. Weak+painless = L2/3 radiculopathy." },
    { id:"cy_hip_abd_res", label:"Resisted Hip Abduction", muscle:"Gluteus medius / TFL", how:"Sidelying. Resist hip abduction.", sig:"Weak+painful = gluteus medius tear or trochanteric bursitis." },
    { id:"cy_l_sflex_l", label:"Resisted Side Flex Left", muscle:"Left QL / lateral trunk", how:"Standing. Resist left lateral trunk flexion.", sig:"Tests left QL and lateral trunk muscles." },
    { id:"cy_l_sflex_r", label:"Resisted Side Flex Right", muscle:"Right QL / lateral trunk", how:"Standing. Resist right lateral trunk flexion.", sig:"Asymmetric = ipsilateral nerve root or QL lesion." },
  ]},
  knee:{ label:"Knee", tests:[
    { id:"cy_k_ext", label:"Resisted Knee Extension", muscle:"Quadriceps / patellar tendon", how:"Seated, knee 90°. Resist extension.", sig:"Strong+painful = patellar tendinopathy. Weak+painless = L3/4 radiculopathy." },
    { id:"cy_k_flex", label:"Resisted Knee Flexion", muscle:"Hamstrings", how:"Prone. Resist knee flexion at 90°.", sig:"Strong+painful = hamstring tendinopathy. Weak+painless = S1/2 radiculopathy." },
    { id:"cy_k_flex_er", label:"Resisted Knee Flexion + ER", muscle:"Biceps femoris", how:"Prone. Resist flexion + external rotation.", sig:"Pain at lateral joint line/fibular head = biceps femoris insertion tendinopathy." },
    { id:"cy_k_flex_ir", label:"Resisted Knee Flexion + IR", muscle:"Medial hamstrings", how:"Prone. Resist flexion + internal rotation.", sig:"Pain medial knee = semimembranosus/semitendinosus insertion lesion." },
  ]},
  ankle:{ label:"Ankle / Foot", tests:[
    { id:"cy_a_df", label:"Resisted Dorsiflexion", muscle:"Tibialis anterior", how:"Resist ankle dorsiflexion + inversion.", sig:"Weak+painless = L4 radiculopathy. Strong+painful = tib ant tendinopathy." },
    { id:"cy_a_pf", label:"Resisted Plantarflexion", muscle:"Gastroc / soleus", how:"Resist plantarflexion.", sig:"Weak+painless = S1/2 radiculopathy. Strong+painful = Achilles/gastroc lesion." },
    { id:"cy_a_inv", label:"Resisted Inversion", muscle:"Tibialis posterior", how:"Resist foot inversion in plantarflexion.", sig:"Pain medial ankle = tib post tendinopathy. Weakness = tib post tear." },
    { id:"cy_a_ev", label:"Resisted Eversion", muscle:"Peroneals", how:"Resist foot eversion.", sig:"Pain lateral ankle = peroneal tendinopathy. Weakness = peroneal nerve injury." },
    { id:"cy_a_toe_ext", label:"Resisted Great Toe Extension", muscle:"Extensor hallucis longus", how:"Resist great toe extension.", sig:"Weak+painless = L5 radiculopathy (most specific L5 myotome)." },
  ]},
};

function CyriaxRegionTests({ data, set }) {
  const [region, setRegion] = useState("shoulder");
  const [modalT, setModalT] = useState(null);
  const RESULTS = ["Strong & Painless (normal)","Strong & Painful (minor lesion)","Weak & Painless (neurological)","Weak & Painful (serious lesion)"];
  const tests = CYRIAX_REGIONS[region]?.tests||[];
  const inp = { width:"100%", background:C.s3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"7px 10px", fontSize:"0.78rem", outline:"none", fontFamily:"inherit" };
  return (
    <div>
      {modalT && (
        <div onClick={()=>setModalT(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.accent}40`, borderRadius:14, padding:24, maxWidth:480, width:"100%", maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ fontWeight:800, color:C.accent, marginBottom:12 }}>{modalT.label}</div>
            <div style={{ marginBottom:12 }}><div style={{ fontSize:"0.75rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>How to Perform</div><div style={{ background:C.s2, borderRadius:8, padding:12, fontSize:"0.8rem", color:C.text, lineHeight:1.7 }}>{modalT.how}</div></div>
            <div style={{ marginBottom:16 }}><div style={{ fontSize:"0.75rem", fontWeight:700, color:C.a3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Clinical Significance</div><div style={{ background:C.s2, borderRadius:8, padding:12, fontSize:"0.8rem", color:C.text, lineHeight:1.7 }}>{modalT.sig}</div></div>
            <div style={{ marginBottom:14 }}><div style={{ fontSize:"0.75rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>What Each Result Means</div>
              {[{val:"Strong & Painless (normal)",col:"#00c97a",m:"No contractile lesion at this muscle. Look elsewhere for the pain source."},
                {val:"Strong & Painful (minor lesion)",col:"#ffb300",m:"Minor lesion of contractile tissue — tendinopathy or small partial tear. Can generate force but hurts. TREAT: DTFM + eccentric loading."},
                {val:"Weak & Painless (neurological)",col:"#7f5af0",m:"Neurological deficit — nerve root or peripheral nerve. No lesion in the muscle itself. Check dermatomes + reflexes. Consider imaging."},
                {val:"Weak & Painful (serious lesion)",col:"#ff4d6d",m:"Serious lesion — complete rupture, fracture, or psychogenic overlay. REFER for imaging immediately. Do not load."},
              ].map(o=><div key={o.val} style={{ padding:"7px 10px", borderRadius:7, marginBottom:5, border:`1px solid ${o.col}30`, background:`${o.col}08` }}>
                <div style={{ fontWeight:700, fontSize:"0.75rem", color:o.col, marginBottom:2 }}>{o.val}</div>
                <div style={{ fontSize:"0.73rem", color:C.text, lineHeight:1.5 }}>{o.m}</div>
              </div>)}
            </div>
            <button onClick={()=>setModalT(null)} style={{ width:"100%", padding:"8px", background:C.a2, border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
        {Object.entries(CYRIAX_REGIONS).map(([k,r])=>(
          <button key={k} type="button" onClick={()=>setRegion(k)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${region===k?C.accent:C.border}`, background:region===k?"rgba(0,229,255,0.1)":"transparent", color:region===k?C.accent:C.muted, fontSize:"0.74rem", fontWeight:region===k?700:400, cursor:"pointer" }}>{r.label}</button>
        ))}
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {tests.map(t=>{
          const val = data[t.id]||""; const isProb = val.includes("Painful")||val.includes("Weak");
          return (
            <div key={t.id} style={{ background:C.surface, border:`1px solid ${isProb?C.red+"50":C.border}`, borderRadius:10, padding:"11px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7, gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"0.8rem", fontWeight:600, color:C.text }}>{t.label}</div>
                  <div style={{ fontSize:"0.78rem", color:C.muted, marginTop:1 }}>Muscle: {t.muscle}</div>
                </div>
                <button type="button" onClick={()=>setModalT(t)} style={{ padding:"2px 9px", background:"rgba(127,90,240,0.15)", border:`1px solid ${C.a2}40`, borderRadius:6, color:C.a2, fontSize:"0.75rem", fontWeight:700, cursor:"pointer", flexShrink:0 }}>ℹ Info</button>
              </div>
              <select value={val} onChange={e=>set(t.id,e.target.value)} style={{...inp, borderColor:isProb?C.red:C.border}}>
                <option value="">— select result —</option>
                {RESULTS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FMASection, FasciaSection, NKTSection, CyriaxRegionTests, FasciaBodyMap };
