
// ─── FASCIA LINE DATA ─────────────────────────────────────────────────────────
// Exported (2026-09-03) so the Ortho Outpatient wizard can render the same
// fascia content Phase 0.5 does, from this one source, instead of a copy.
export const FASCIA_LINES_DATA = {
  sbl:{ label:"Superficial Back Line", color:"#ff6b35", route:"Plantar fascia → Gastrocnemius → Hamstrings → Sacrotuberous lig → Erector spinae → Suboccipitals → Scalp", restrictions:"Plantar fasciitis, hamstring tightness, thoracolumbar restriction, suboccipital tension, forward head, limited forward bend", compensation:"Plantar restriction pulls entire posterior chain → suboccipital compression → forward head posture" },
  sfl:{ label:"Superficial Front Line", color:"#00d4ff", route:"Dorsum foot → Tibialis anterior → Quadriceps → Rectus abdominis → SCM → Scalp", restrictions:"Anterior ankle restriction, quad tightness, abdominal restriction, chest tightness, SCM overactivity", compensation:"SFL short = SBL stretched and overloaded → kyphosis + forward head" },
  ll:{ label:"Lateral Line", color:"#a8ff3e", route:"Peroneals → IT band → TFL/Glute max → Ext oblique → Intercostals → SCM/Splenius", restrictions:"Lateral ankle pain, IT band syndrome, lateral knee, lateral hip, lateral trunk tightness, scoliosis", compensation:"LL restriction → scoliotic lean → contralateral lateral trunk shift → knee valgus contralaterally" },
  spiral:{ label:"Spiral Line", color:"#d4a5ff", route:"Skull → Splenius → Opposite rhomboids → Serratus → Ext oblique → Opp int oblique → TFL → IT band → Tibialis ant → Peroneals → back to skull", restrictions:"Rotational asymmetry, scoliosis, limited sport rotation, shoulder-to-hip diagonal tightness", compensation:"SPL restriction → rotational asymmetry → disc loading asymmetry. Diagonal chain connects foot to opposite shoulder" },
  dfl:{ label:"Deep Front Line", color:"#ffd700", route:"Foot arch → Tib posterior → Adductors → Iliopsoas → Diaphragm → Mediastinum → Scalenes → Hyoids → Skull base", restrictions:"Flatfoot, adductor tightness, psoas restriction, breathing dysfunction, pelvic floor issues, TMJ tension", compensation:"DFL arch collapse → adductors tighten → psoas pulls anterior → diaphragm shifts → scalenes overwork → forward head" },
  bal:{ label:"Back Arm Lines", color:"#ff9a9e", route:"SBAL: Trapezius → Deltoid → Lateral forearm → Back of hand. DBAL: Rotator cuff → Triceps → Ulna → Hypothenar", restrictions:"SBAL: upper trap tightness, lateral shoulder, tennis elbow. DBAL: RC dysfunction, posterior shoulder, ulnar wrist", compensation:"SBAL restriction → shoulder elevation → neck tension. DBAL → triceps tightness → elbow restriction" },
  fal:{ label:"Front Arm Lines", color:"#90caf9", route:"SFAL: Pec major → Medial forearm flexors → Fingers. DFAL: Pec minor → Biceps → Carpal tunnel → Thumb", restrictions:"SFAL: pec tightness, medial epicondylalgia, carpal tunnel. DFAL: pec minor, biceps tendinopathy, De Quervain's", compensation:"SFAL restriction → anterior shoulder → forward head. DFAL → biceps overactivity → shoulder impingement" },
  fl:{ label:"Functional Lines", color:"#b0f2b6", route:"Back FL: Lat dorsi → Sacral fascia → Opposite glute max → Lateral femur. Front FL: Pec major → Opp rectus abdominis → Opp adductors", restrictions:"Inability to transfer force across midline, throwing dysfunction, gait asymmetry, contralateral limb pain", compensation:"FL disruption → cannot load contralateral diagonal → compensatory spinal loading" },
};

export const FASCIA_REGIONS_DATA = {
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


