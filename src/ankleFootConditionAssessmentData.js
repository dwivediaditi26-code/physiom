// ankleFootConditionAssessmentData.js
//
// Per-condition content for the "AI Objective Assessment" page, Ankle/Foot
// region — same standalone, condition-wise pattern as the other three
// region data files. Sourced from two real, verified places, nothing
// invented:
//   - keyExams and the observation/posture/functionalScreen/fascia/outcome
//     one-liners come straight from src/reasoningEngine/regions/ankle.evidence.json
//     (AK01-AK10) and foot.evidence.json (FT01-FT07) — the same real
//     evidence files orthoAnkleFootReasoning.js already reads to power the
//     app's real Ankle/Foot differential — cross-checked field-for-field.
//   - resistedNarrative, cpaNkt, kineticChain.chainEffect, and
//     functionalScreen prose are transcribed verbatim from
//     /Users/cashify/Documents/PhysiomObjectiveAssessmentReference.pdf,
//     pp.26-31 ("Ankle / Foot" section).
//   - Several conditions' own text explicitly says a module doesn't apply
//     (e.g. AK03's syndesmosis isn't covered by the talocrural/subtalar
//     kinetic-chain tests, AK05's acute rupture defers everything to
//     urgent referral, FT02's fat-pad syndrome isn't a compensation-pattern
//     or joint-mobility condition) — carried over verbatim via
//     notApplicable / muscle:null rather than invented content.
//   - Condition ids (AK01..AK10, FT01..FT07) match orthoAnkleFootReasoning.js's
//     own FIXED_ID_BY_NAME generation (ankle.evidence.json then
//     foot.evidence.json diagnoses order).

// Real Ankle AROM movements + normal-value hints — same ids/normals
// orthoAnkleFootReasoning.js's own ROM_IDS and the app's real ROM module
// use. No separate Foot-specific ROM ids exist in the app's ROM library
// (1st MTP mobility is captured via the Key Exams/Kinetic Chain modules
// instead) — same scope orthoAnkleFootReasoning.js's own ROM_IDS uses.
export const ANKLE_FOOT_ROM_MOVEMENTS = [
  { id: "adf", label: "Dorsiflexion", normal: 20 },
  { id: "apf", label: "Plantarflexion", normal: 50 },
  { id: "ainv", label: "Inversion", normal: 35 },
  { id: "aev", label: "Eversion", normal: 15 },
];

export const ANKLE_FOOT_CONDITIONS = {
  AK01: {
    id: "AK01", name: "Lateral Ankle Sprain (ATFL/CFL) — Acute",
    keyExams: ["Anterior drawer test", "Talar tilt test", "Ottawa Ankle Rules screen"],
    observationChecklist: ["Lateral swelling/bruising", "Antalgic gait"],
    postureChecklist: ["Guarded plantarflexed posture"],
    palpationZones: null,
    resistedTestName: "Resisted Eversion",
    resistedNarrative: "Resisted eversion (peroneals) often weak/painful acutely (protective reflex inhibition, not necessarily a tear); passive inversion (STJ) reproduces pain, especially if ATFL/CFL torn (talar tilt).",
    cpaNkt: { muscle: "Peroneals", narrative: "Peroneals typically inhibited/reflex-guarded acutely; as healing progresses, check for \"Overactive, tib ant inhibition\" feeding recurrent instability." },
    kineticChain: {
      testName: "Subtalar Joint Mobility (inversion/eversion)",
      chipOptions: ["Guarded, acute restriction", "No restriction"],
      chainEffect: "The direct match to ATFL/CFL sprain mechanics; expect acute guarding rather than a fixed hypo/hypermobility pattern yet.",
    },
    functionalScreen: {
      testName: "Single Leg Balance (proprioception + CAI screen)",
      measure: { type: "text", label: "Result" },
      note: "Once acute swelling allows — too early acutely, but the baseline test to schedule for follow-up.",
    },
    fascia: "Lateral ligament / peroneal fascia",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK02: {
    id: "AK02", name: "Chronic Ankle Instability (CAI)",
    keyExams: ["Talar tilt test", "Single-leg balance / proprioception screen", "Subtalar mobility assessment"],
    observationChecklist: ["Recurrent swelling", "Feeling of giving way"],
    postureChecklist: ["Rearfoot varus / supinated posture"],
    palpationZones: null,
    resistedTestName: "Resisted Eversion",
    resistedNarrative: "Resisted eversion often weak (peroneal weakness/reflex inhibition well documented in CAI); passive inversion shows excess/hypermobile range — the opposite of a capsular restriction.",
    cpaNkt: { muscle: "Peroneals", narrative: "Check both \"Overactive, tib ant inhibition\" AND simple peroneal weakness/delay; this cross-check is the key CPA question in chronic instability." },
    kineticChain: {
      testName: "Subtalar Joint Mobility",
      chipOptions: ["Hypermobile, excessive pronation / L-R asymmetry", "Normal"],
      chainEffect: "Expect \"hypermobile, excessive pronation\" or a marked L-vs-R asymmetry, per this app's own documented CAI presentation.",
    },
    functionalScreen: {
      testName: "Single Leg Balance (proprioception + chronic ankle instability screen)",
      measure: { type: "text", label: "Result" },
      note: "The named functional test for exactly this condition.",
    },
    fascia: "Peroneal fascial support; subtalar mobility",
    outcome: "Cumberland Ankle Instability Tool (CAIT); FAAM",
  },
  AK03: {
    id: "AK03", name: "High Ankle Sprain (Syndesmosis)",
    keyExams: ["Squeeze/mortise test", "External rotation stress test"],
    observationChecklist: ["Swelling above joint line", "Pain on squeeze"],
    postureChecklist: ["Externally-rotated foot guarding"],
    palpationZones: null,
    resistedTestName: "Resisted Dorsiflexion/Plantarflexion",
    resistedNarrative: "Resisted DF/PF are less specific here; passive external-rotation stress + squeeze (proximal tib-fib compression) is the definitive joint-play test, not a resisted-muscle one.",
    cpaNkt: { muscle: null, narrative: "Not primarily compensation-driven (ligamentous/syndesmotic) — reassess Tib Ant/Peroneal balance once healed; prolonged non-weight-bearing can inhibit both." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not covered by this app's talocrural/subtalar kinetic-chain tests (a syndesmosis is a separate joint) — rely on the squeeze/external-rotation stress tests above.",
    },
    functionalScreen: {
      testName: "Weight-Bearing Dorsiflexion (Knee-to-Wall)",
      measure: { type: "text", label: "Result" },
      note: "Syndesmotic widening affects mortise dorsiflexion mechanics even though it isn't the primary named screen for this injury.",
    },
    fascia: "Interosseous membrane / distal syndesmotic fascia",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK04: {
    id: "AK04", name: "Achilles Tendinopathy (Insertional or Mid-Portion)",
    keyExams: ["Royal London Hospital test", "Single-leg heel raise endurance test", "Achilles palpation (insertional vs mid-portion)"],
    observationChecklist: ["Tendon thickening/tenderness", "Calf wasting"],
    postureChecklist: ["Overpronation increasing tendon load"],
    palpationZones: ["Achilles tendon (insertional and mid-portion)"],
    resistedTestName: "Resisted Plantarflexion",
    resistedNarrative: "Resisted PF (gastroc/soleus) strong but painful at the tendon — classic contractile pattern (single-leg heel raise is the functional resisted test); passive DF may reproduce pain (better with knee flexed = gastroc vs soleus differentiation).",
    cpaNkt: { muscle: "Gastrocnemius/Soleus", narrative: "\"Overactive, Achilles tendinopathy pattern\" compensating for an inhibited Glute Max (hip); reduced glute-driven propulsion increases calf load." },
    kineticChain: {
      testName: "Weight-Bearing Dorsiflexion Lunge Test",
      chipOptions: ["Restricted DF, gastroc/soleus tight", "Normal DF"],
      chainEffect: "Restricted DF directly increases Achilles load; explicitly names gastroc/soleus tightness as a driver.",
    },
    functionalScreen: {
      testName: "Single Leg Heel Raise (calf endurance + hop test)",
      measure: { type: "text", label: "Result" },
      note: "The direct named functional test for this exact condition — calf endurance + Achilles load.",
    },
    fascia: "Superficial back line (gastroc-soleus-Achilles)",
    outcome: "VISA-A; FAAM",
  },
  AK05: {
    id: "AK05", name: "Achilles Tendon Rupture (Complete)",
    keyExams: ["Thompson's (Simmond's) test", "Palpable tendon gap"],
    observationChecklist: ["Palpable gap", "Positive Thompson", "Bruising"],
    postureChecklist: ["Cannot toe-off, flat gait"],
    palpationZones: ["Achilles tendon gap"],
    resistedTestName: "Resisted Plantarflexion",
    resistedNarrative: "Resisted PF absent/severely weak with a palpable gap — Thompson's/Simmond's (passive calf squeeze) IS the definitive test, not active resisted testing.",
    cpaNkt: { muscle: null, narrative: "Not applicable acutely — urgent orthopaedic referral takes priority over compensation-pattern testing." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not applicable acutely — urgent orthopaedic referral takes priority.",
    },
    functionalScreen: {
      testName: "Single Leg Heel Raise (not applicable acutely)",
      measure: { type: "text", label: "Result" },
      note: "A Single Leg Heel Raise attempt would be diagnostic by its complete failure, but formal functional testing is deferred to urgent referral.",
    },
    fascia: "N/A — urgent referral",
    outcome: "N/A — acute/medical; functional outcome once appropriate",
  },
  AK06: {
    id: "AK06", name: "Ankle Osteoarthritis",
    keyExams: ["Passive ROM with end-feel assessment", "Weight-bearing dorsiflexion lunge test", "Imaging referral if not already available"],
    observationChecklist: ["Anterior joint-line swelling", "Reduced DF", "Crepitus"],
    postureChecklist: ["Stiff antalgic posture"],
    palpationZones: null,
    resistedTestName: "Resisted Dorsiflexion/Plantarflexion",
    resistedNarrative: "Resisted tests generally painless (non-contractile); passive DF/PF restricted (capsular pattern PF>DF) with a hard/bony end-feel.",
    cpaNkt: { muscle: "Gastrocnemius/Soleus", narrative: "Often overactive/shortened restricting DF — check alongside Tib Ant for an anterior-impingement contribution." },
    kineticChain: {
      testName: "Weight-Bearing Dorsiflexion Lunge Test",
      chipOptions: ["Severely restricted (<4cm/<10°)", "Not restricted"],
      chainEffect: "Expect severe restriction (<4cm/<10°), consistent with OA-related capsular loss.",
    },
    functionalScreen: {
      testName: "Weight-Bearing Dorsiflexion (Knee-to-Wall)",
      measure: { type: "text", label: "Result" },
      note: "The same test named as the functional screen for ankle DF restriction, impingement, and OA.",
    },
    fascia: "Anterior capsular fascia",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK07: {
    id: "AK07", name: "Tibialis Posterior Dysfunction / Progressive Flatfoot (PTTD)",
    keyExams: ["Navicular drop test", "Single-leg heel raise (too-many-toes sign)", "Resisted inversion in plantarflexion"],
    observationChecklist: ["Medial swelling", "\"Too-many-toes\"", "Collapsing arch"],
    postureChecklist: ["Hindfoot valgus / flatfoot posture"],
    palpationZones: null,
    resistedTestName: "Resisted Inversion",
    resistedNarrative: "Resisted inversion (tib post) weak — single-leg heel raise fails to invert the heel (the functional resisted-test equivalent); navicular drop quantifies the arch collapse.",
    cpaNkt: { muscle: "Tibialis Posterior", narrative: "\"Inhibited, progressive flatfoot\" with Peroneals overactive is the textbook PTTD compensation pattern, explicitly documented." },
    kineticChain: {
      testName: "Subtalar Joint Mobility",
      chipOptions: ["Hypermobile, excessive pronation", "Normal"],
      chainEffect: "\"Hypermobile, excessive pronation... tibialis posterior failing to control pronation\" is the exact documented pattern for this condition.",
    },
    functionalScreen: {
      testName: "Dynamic Arch / Navicular Drop",
      measure: { type: "text", label: "Result" },
      note: "Tibialis posterior function + foot pronation screen — the named functional test for exactly this condition.",
    },
    fascia: "Deep posterior-compartment fascia (tib-post)",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK08: {
    id: "AK08", name: "Peroneal Tendinopathy",
    keyExams: ["Resisted eversion", "Peroneal tendon palpation behind lateral malleolus", "Subluxation provocation (resisted eversion + dorsiflexion)"],
    observationChecklist: ["Retromalleolar swelling/tenderness"],
    postureChecklist: ["Rearfoot varus (overload) posture"],
    palpationZones: ["Peroneal tendon, behind lateral malleolus"],
    resistedTestName: "Resisted Eversion",
    resistedNarrative: "Resisted eversion strong but painful behind the lateral malleolus — classic contractile pattern; subluxation provocation (resisted eversion + DF) is the joint-play analogue.",
    cpaNkt: { muscle: "Peroneals", narrative: "\"Overactive, tib ant inhibition\" or \"tib post inhibition\"; determine WHICH muscle the peroneals are compensating for before treating in isolation." },
    kineticChain: {
      testName: "Subtalar Joint Mobility (adjunct)",
      chipOptions: ["Restricted / altered eversion stability", "Normal"],
      chainEffect: "As adjunct context (peroneals stabilise subtalar eversion) — not the primary test, but useful for the compensation pattern above.",
    },
    functionalScreen: {
      testName: "Single Leg Heel Raise (heel-eversion quality)",
      measure: { type: "text", label: "Result" },
      note: "The app has no peroneal-specific named functional screen, so this tib-post-oriented test is used as the closest adjunct.",
    },
    fascia: "Lateral (peroneal) compartment fascia",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK09: {
    id: "AK09", name: "Tarsal Tunnel Syndrome",
    keyExams: ["Tinel's sign at tarsal tunnel", "Sensory mapping of plantar foot", "Dorsiflexion-eversion provocation"],
    observationChecklist: ["Medial-ankle Tinel", "Intrinsic wasting"],
    postureChecklist: ["Overpronation compressing the tunnel"],
    palpationZones: ["Tarsal tunnel (medial ankle)"],
    resistedTestName: "Resisted Inversion/Plantarflexion",
    resistedNarrative: "Resisted inversion/PF generally preserved (neural, not contractile); Tinel's + sustained eversion-DF is the key provocation, sensory mapping confirms the nerve distribution.",
    cpaNkt: { muscle: null, narrative: "Not a classic muscle-pair pattern (nerve entrapment) — check for overpronation (Tib Post inhibition) as the mechanical driver compressing the tunnel." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not a joint-mobility condition (nerve entrapment); Subtalar Mobility can be checked as the mechanical driver of the overpronation noted above.",
    },
    functionalScreen: {
      testName: "Dynamic Arch / Navicular Drop",
      measure: { type: "text", label: "Result" },
      note: "Overpronation is the documented mechanical driver compressing the tunnel, matching the CPA finding above.",
    },
    fascia: "Flexor retinaculum / tibial neural tension",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  AK10: {
    id: "AK10", name: "Anterior Ankle Impingement",
    keyExams: ["Weight-bearing dorsiflexion lunge test with anterior pain provocation", "Passive dorsiflexion end-feel"],
    observationChecklist: ["Anterior joint-line tenderness", "Dorsiflexion block"],
    postureChecklist: ["Restricted-DF stiff posture"],
    palpationZones: null,
    resistedTestName: "Resisted Dorsiflexion",
    resistedNarrative: "Resisted DF may reproduce anterior pinch pain if soft-tissue impingement; passive DF end-feel is HARD/bony if bony impingement — the key end-feel distinction from a simple gastroc-tightness DF restriction.",
    cpaNkt: { muscle: "Gastrocnemius/Soleus", narrative: "Overactivity restricting available DF increases anterior joint approximation — check calf length/activation alongside the joint pathology." },
    kineticChain: {
      testName: "Weight-Bearing Dorsiflexion Lunge Test",
      chipOptions: ["Restricted, anterior pinch reproduced", "Normal, no pinch"],
      chainEffect: "The direct match, expecting restricted DF with anterior pinch reproduced during the lunge.",
    },
    functionalScreen: {
      testName: "Weight-Bearing Dorsiflexion (Knee-to-Wall)",
      measure: { type: "text", label: "Result" },
      note: "The same test, whose own subtitle names \"impingement + CAI screen\" as its purpose.",
    },
    fascia: "Anterior capsular / talar fascial pinch",
    outcome: "FAAM or FAOS; Cumberland Ankle Instability Tool (instability)",
  },
  FT01: {
    id: "FT01", name: "Plantar Fasciitis / Plantar Fasciopathy",
    keyExams: ["Windlass test (dorsiflex the hallux)", "Palpation of medial calcaneal tubercle / plantar fascia origin", "Gait / arch assessment"],
    observationChecklist: ["Medial calcaneal tenderness", "Antalgic heel-strike"],
    postureChecklist: ["High or collapsed arch, overpronation"],
    palpationZones: ["Medial calcaneal tubercle / plantar fascia origin"],
    resistedTestName: "Resisted Toe Flexion (FHL)",
    resistedNarrative: "Not a classic resisted-muscle test (fascia, not contractile) — the Windlass test (passive great-toe dorsiflexion, weight-bearing) is the definitive provocation; resisted toe flexion (FHL) is usually painless.",
    cpaNkt: { muscle: "Flexor Hallucis Longus (FHL)", narrative: "\"Inhibited, plantar fascia overload\" is the exact documented driver: the fascia takes over arch-support duty the FHL should share." },
    kineticChain: {
      testName: "First MTP Extension — Hallux Mobility",
      chipOptions: ["Restricted, reduced windlass arch rise", "Normal windlass response"],
      chainEffect: "This app's own windlass test (dorsiflex the great toe on a step, observe the arch rise) is the direct kinetic-chain correlate.",
    },
    functionalScreen: {
      testName: "Dynamic Arch / Navicular Drop",
      measure: { type: "text", label: "Result" },
      note: "The closest named screen; this app has no foot-specific FMA region, only ankle — arch mechanics overlap enough to be informative here.",
    },
    fascia: "Superficial back line (plantar-fascia ↔ gastroc)",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT02: {
    id: "FT02", name: "Heel Fat Pad Syndrome",
    keyExams: ["Palpation of central weight-bearing heel pad (vs medial origin)", "Barefoot vs cushioned-footwear comparison"],
    observationChecklist: ["Central heel tenderness", "Thin heel pad"],
    postureChecklist: ["Neutral arch; barefoot hard-surface loading"],
    palpationZones: ["Central weight-bearing heel pad"],
    resistedTestName: "Resisted Toe/Ankle Movements",
    resistedNarrative: "Not a resisted-muscle test — direct palpation of the central weight-bearing heel pad (vs the plantar fascia's medial origin) differentiates; no windlass reproduction (differentiates from plantar fasciitis).",
    cpaNkt: { muscle: null, narrative: "Not a compensation-pattern condition (fat-pad atrophy/loading) — footwear cushioning is the primary intervention, not muscle activation." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not a joint-mobility condition (fat-pad atrophy) — none of this app's foot/ankle kinetic-chain tests target the heel pad specifically.",
    },
    functionalScreen: {
      testName: "No dedicated functional screen",
      measure: { type: "text", label: "Result" },
      note: "Not a functional-movement condition — direct palpation comparison (STTT, above) is the primary tool, not a named FMA screen.",
    },
    fascia: "Plantar fat-pad / heel fascia",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT03: {
    id: "FT03", name: "Morton's Neuroma (Interdigital Neuroma)",
    keyExams: ["Mulder's click (mediolateral squeeze + interspace pressure)", "Web-space sensory testing", "Toe-box footwear review"],
    observationChecklist: ["3rd/4th web-space tenderness", "Splayed toes"],
    postureChecklist: ["Narrow-toe-box / forefoot-loading posture"],
    palpationZones: ["3rd/4th web space"],
    resistedTestName: "Resisted Toe Movements",
    resistedNarrative: "Not a resisted-muscle test (neural/interdigital) — Mulder's click (passive mediolateral squeeze) is the definitive provocation.",
    cpaNkt: { muscle: null, narrative: "Not a classic compensation pattern — narrow toe-box loading is mechanical, not motor-control driven; Foot Intrinsics facilitation is a supportive adjunct only." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not a joint-mobility condition (interdigital nerve) — none of the foot/ankle kinetic-chain tests isolate the web spaces.",
    },
    functionalScreen: {
      testName: "No dedicated functional screen",
      measure: { type: "text", label: "Result" },
      note: "Mulder's click (STTT, above) is the primary provocation, not a functional-movement screen.",
    },
    fascia: "Intermetatarsal fascia / plantar digital nerve",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT04: {
    id: "FT04", name: "Metatarsalgia (Mechanical Forefoot Overload)",
    keyExams: ["Palpation of metatarsal heads / plantar plate", "Forefoot loading / single-leg heel raise", "Footwear and load review"],
    observationChecklist: ["Plantar callus under metatarsal heads"],
    postureChecklist: ["Forefoot-loading / high-heel posture"],
    palpationZones: ["Metatarsal heads / plantar plate"],
    resistedTestName: "Resisted Toe Flexion/Extension",
    resistedNarrative: "Resisted toe flexion/extension usually painless; forefoot loading (single-leg heel raise reproducing pain under the metatarsal heads) is the functional provocation.",
    cpaNkt: { muscle: "Foot Intrinsics", narrative: "\"Inhibited, arch collapse\" often allows excess forefoot loading; check short-foot exercise capacity." },
    kineticChain: {
      testName: "First MTP Extension — Hallux Mobility (adjunct)",
      chipOptions: ["Restricted hallux extension, lateral load shift", "Normal hallux extension"],
      chainEffect: "Restricted hallux extension shifts load laterally onto the metatarsal heads, feeding this exact presentation.",
    },
    functionalScreen: {
      testName: "Single Leg Heel Raise (ankle-region adjunct)",
      measure: { type: "text", label: "Result" },
      note: "Observe forefoot-loading tolerance; this app has no dedicated forefoot-loading functional test.",
    },
    fascia: "Plantar plate / forefoot fascia",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT05: {
    id: "FT05", name: "First MTP Osteoarthritis / Hallux Rigidus",
    keyExams: ["1st MTP active/passive dorsiflexion ROM + end-feel", "Grind/axial compression of the 1st MTP", "Imaging if OA suspected"],
    observationChecklist: ["Dorsal 1st-MTP osteophyte", "Reduced toe extension"],
    postureChecklist: ["Supinated / lateral-loading gait avoiding push-off"],
    palpationZones: ["1st MTP joint"],
    resistedTestName: "Resisted Great-Toe Extension (EHL)",
    resistedNarrative: "Resisted great-toe extension (EHL) may be painful at end-range; passive 1st-MTP dorsiflexion is MOST restricted (capsular pattern extension>flexion) with a hard/bony end-feel — the grind test confirms.",
    cpaNkt: { muscle: null, narrative: "Not primarily a compensation pattern (joint OA) — Foot Intrinsics (abductor hallucis) facilitation supports remaining function but doesn't reverse the joint change." },
    kineticChain: {
      testName: "First MTP Extension — Hallux Mobility",
      chipOptions: ["Severely restricted, <20° (hallux rigidus)", "Normal (≥65°)"],
      chainEffect: "The direct match: \"severely restricted, <20°/hallux rigidus... patient walks on lateral foot border\" is this app's own description of exactly this condition.",
    },
    functionalScreen: {
      testName: "No dedicated functional screen",
      measure: { type: "text", label: "Result" },
      note: "No dedicated forefoot/hallux FMA test exists in this app's library — the grind test and passive ROM (above) remain the primary tools.",
    },
    fascia: "Plantar plate / 1st-ray fascia",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT06: {
    id: "FT06", name: "Turf Toe (1st MTP Hyperextension Sprain)",
    keyExams: ["1st MTP dorsiflexion stress test", "Plantar plate / sesamoid palpation", "Imaging to exclude sesamoid fracture"],
    observationChecklist: ["Swelling/tenderness of 1st MTP", "Athlete"],
    postureChecklist: ["Push-off avoidance posture"],
    palpationZones: ["Plantar plate / sesamoid complex"],
    resistedTestName: "Resisted Great-Toe Flexion",
    resistedNarrative: "Resisted great-toe flexion may be weak/painful if the plantar plate/FHL is involved; passive 1st-MTP dorsiflexion STRESS reproduces pain — an acute sprain restriction, not the chronic restriction seen in hallux rigidus.",
    cpaNkt: { muscle: "Flexor Hallucis Longus (FHL)", narrative: "May show acute reflex inhibition post-injury — reassess once the sprain has settled." },
    kineticChain: {
      testName: "First MTP Extension — Hallux Mobility",
      chipOptions: ["Acute hyperextension-provoked pain", "No pain, normal range"],
      chainEffect: "Tests the OPPOSITE direction from this injury's mechanism (chronic restriction vs. an acute hyperextension sprain) — use cautiously and only once acute pain allows.",
    },
    functionalScreen: {
      testName: "No dedicated functional screen",
      measure: { type: "text", label: "Result" },
      note: "No dedicated forefoot/hallux FMA test exists in this app's library — the dorsiflexion stress test (above) remains the primary tool.",
    },
    fascia: "Plantar plate / sesamoid complex",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
  FT07: {
    id: "FT07", name: "Midfoot Sprain / Osteoarthritis (Navicular / Cuboid)",
    keyExams: ["Midfoot palpation (navicular, cuboid, TMT joints)", "Midfoot stress / piano-key test", "Weight-bearing imaging if Lisfranc suspected"],
    observationChecklist: ["Dorsal midfoot swelling/tenderness"],
    postureChecklist: ["Collapsed or rigid midfoot posture"],
    palpationZones: ["Navicular", "Cuboid", "TMT joints"],
    resistedTestName: "Resisted Inversion/Eversion",
    resistedNarrative: "Resisted inversion/eversion is less specific here; passive midfoot stress/piano-key glide (joint-play) is the definitive provocation.",
    cpaNkt: { muscle: "Tibialis Posterior / Peroneals", narrative: "Can secondarily guard around a stiff or unstable midfoot — screen both once acute pain allows." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "Not covered by this app's foot/ankle kinetic-chain tests (talocrural, subtalar, and hallux are modelled; the midtarsal joints are not) — rely on the passive midfoot-stress test above.",
    },
    functionalScreen: {
      testName: "Single Leg Balance",
      measure: { type: "text", label: "Result" },
      note: "No dedicated midfoot FMA test exists in this app's library — Single Leg Balance can surface secondary instability once acute pain allows.",
    },
    fascia: "Midfoot dorsal & plantar fascia",
    outcome: "FAAM or Manchester-Oxford Foot Questionnaire (MOXFQ)",
  },
};

export const ANKLE_FOOT_CONDITION_ORDER = [
  "AK01", "AK02", "AK03", "AK04", "AK05", "AK06", "AK07", "AK08", "AK09", "AK10",
  "FT01", "FT02", "FT03", "FT04", "FT05", "FT06", "FT07",
];
