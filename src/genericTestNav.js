// genericTestNav.js — per-region priority-test -> module deep-link resolver
// for the genericPhase05 regions (hip, knee, ankle, foot, elbow, wrist,
// hand). Same pattern as shoulderPhase05.js's shoulderTestNav().
//
// Without this, genericPhase05's priority-test buttons all pointed at
// "special" with no region/test context (ctx: null) -- so clicking any of
// them, e.g. "Hip Scour test", landed on the Special Tests screen defaulted
// to Shoulder (SpecialTestsSection's fallback region) with nothing
// highlighted. Looked like the button didn't do anything useful.
//
// Each keyExam label (as it appears in each region's evidence.json) maps to
// either:
//   - kind:"special" -> a real { specialRegion, highlightTest } id in
//     SPECIAL_TESTS_DATA (sharedClinicalData.js). Note SPECIAL_TESTS_DATA
//     groups ankle+foot as "ankle_foot" and elbow+wrist as "elbow_wrist" --
//     not separate keys -- and has no "hand" category at all.
//   - kind:"rom" -> a real { romRegion, romHighlights } into ROM_DATA
//     (sharedClinicalData.js), same shape shoulderPhase05.js's capsular_
//     pattern/global_rom_loss entries use, and the same ctx the "ROM" layer
//     card (layerNavButtons, SubjectiveObjective.jsx) already sends for
//     these regions -- reused here so the priority-test button and the
//     layer card agree on what "ROM" means for a given region. Note ROM_DATA
//     has no "Hand" region at all.
//   - kind:"mmt" -> a real { mmtRegion, mmtHighlights } into MMT_DATA
//     (sharedClinicalData.js), consumed by the MMT module (lazy_mmt.jsx ->
//     PhysioNeuro.jsx's MMTModule) exactly like ROM's romRegion/romHighlights.
//     Note MMT_DATA's region keys don't match ROM_DATA's/SPECIAL_TESTS_DATA's
//     -- it's "Hip & Pelvis" (not "Hip"), "Knee", "Elbow & Forearm" (not
//     "Elbow") -- keys must match MMT_DATA exactly or MMTModule silently
//     falls back to its default region.
//   - kind:"palpation" -> opens PalpationModule (ClinicalModules.jsx). It has
//     no region concept at all (just a front/back body-map of point
//     hotspots, ANATOMICAL_HOTSPOTS), so there's no "region" to pass -- only
//     an optional hotspotIds array naming real ANATOMICAL_HOTSPOTS ids to
//     highlight (both L/R variants, since a condition-level recommendation
//     doesn't know which side the patient's affected). PalpationModule
//     switches to that hotspot's front/back view and rings it -- it does NOT
//     auto-record a finding (that would fabricate an unexamined result).
//     Left without hotspotIds (still opens the module, just no highlight)
//     when no ANATOMICAL_HOTSPOTS point is a clean match -- e.g. metatarsal
//     heads/plantar plate has no dedicated forefoot hotspot in the array.
//
// Labels with no dedicated module yet (imaging referrals and anything not a
// clean 1:1 match -- guessing wrong is worse than leaving it non-clickable)
// resolve to null and stay a non-clickable "no dedicated module" chip, same
// honest fallback shoulderPhase05 already uses for its own gaps.

import { SPECIAL_TESTS_DATA } from "./sharedClinicalData.js";

const MAP = {
  hip: {
    "FADIR test": { kind: "special", specialRegion: "hip", highlightTest: "st_fadir_test" },
    "Hip Scour test": { kind: "special", specialRegion: "hip", highlightTest: "st_hip_scour" },
    "Ober's test": { kind: "special", specialRegion: "hip", highlightTest: "st_ober_test" },
    "Piriformis (FAIR) test": { kind: "special", specialRegion: "hip", highlightTest: "st_piriformis_test" },
    "Trendelenburg test": { kind: "special", specialRegion: "hip", highlightTest: "st_trendelenburg_test" },
    "Passive hip ROM with end-feel (capsular pattern)": {
      kind: "rom", romRegion: "Hip", romHighlights: ["rom_hir", "rom_her", "rom_hflex", "rom_hext", "rom_habd", "rom_hadd"],
      why: "Hip OA capsular pattern: IR most restricted, then ER, then abduction. Compare bilaterally.",
    },
    "Resisted hip abduction (MMT)": {
      kind: "mmt", mmtRegion: "Hip & Pelvis", mmtHighlights: ["mmt_gmed", "mmt_gmin"],
      why: "Gluteus medius/minimus weakness on resisted abduction -- correlates with Trendelenburg sign and lateral hip (greater trochanteric) pain.",
    },
    "Resisted hip extension / knee flexion (MMT)": {
      kind: "mmt", mmtRegion: "Hip & Pelvis", mmtHighlights: ["mmt_gmax", "mmt_hamstr"],
      why: "Pain or weakness on resisted hip extension or knee flexion, localised to the ischial tuberosity -- proximal hamstring tendinopathy.",
    },
    "Resisted hip adduction (MMT)": {
      kind: "mmt", mmtRegion: "Hip & Pelvis", mmtHighlights: ["mmt_adduc"],
      why: "Pain on resisted adduction -- adductor strain / athletic pubalgia. Compare against the adductor squeeze test threshold.",
    },
    "Palpation of ischial tuberosity": {
      kind: "palpation",
      // hamstring_r/l structures list "Proximal hamstring origin (ischial
      // tuberosity)" directly -- gmax_r/l also mentions ischial tuberosity as
      // a secondary structure, but hamstring is the closer clinical match for
      // *proximal hamstring tendinopathy* specifically (this test's own
      // rationale below), so hamstring wins over gmax, not a coin flip.
      hotspotIds: ["hamstring_r", "hamstring_l"],
      why: "Ischial tuberosity tenderness -- proximal hamstring tendinopathy. Opens the Palpation module and highlights the proximal hamstring point (both sides -- pick the affected one).",
    },
    "Palpation of adductor origin / pubic ramus": {
      kind: "palpation",
      hotspotIds: ["groin_r", "groin_l"],
      why: "Adductor-origin / pubic ramus tenderness -- adductor strain / athletic pubalgia. Opens the Palpation module and highlights the groin/adductor-origin point (both sides -- pick the affected one).",
    },
  },
  knee: {
    "Clarke's sign": { kind: "special", specialRegion: "knee", highlightTest: "st_clarkes" },
    "Lachman's test": { kind: "special", specialRegion: "knee", highlightTest: "st_lachmans" },
    "McMurray's test": { kind: "special", specialRegion: "knee", highlightTest: "st_mcmurray_test" },
    "Noble compression test": { kind: "special", specialRegion: "knee", highlightTest: "st_noble" },
    // No separate knee-catalog Ober's test -- IT band/TFL is filed under hip
    // in SPECIAL_TESTS_DATA, same cross-region link pattern shoulderPhase05
    // uses for spurling_positive -> cervical.
    "Ober's test": { kind: "special", specialRegion: "hip", highlightTest: "st_ober_test" },
    "Patellar grind test": { kind: "special", specialRegion: "knee", highlightTest: "st_patellar_grind" },
    "Pivot shift test": { kind: "special", specialRegion: "knee", highlightTest: "st_pivot_shift" },
    "Posterior drawer test": { kind: "special", specialRegion: "knee", highlightTest: "st_posterior_drawer" },
    "Sweep/ballottement test for effusion": { kind: "special", specialRegion: "knee", highlightTest: "st_effusion" },
    "Thessaly test": { kind: "special", specialRegion: "knee", highlightTest: "st_thessaly" },
    "Valgus stress test": { kind: "special", specialRegion: "knee", highlightTest: "st_valgus_stress_knee" },
    "Varus stress test": { kind: "special", specialRegion: "knee", highlightTest: "st_varus_stress_knee" },
    "Passive knee ROM with end-feel": {
      kind: "rom", romRegion: "Knee", romHighlights: ["rom_kflex", "rom_kext"],
      why: "Flexion loss indicates effusion, posterior capsule tightness, or a meniscal block. Measure first.",
    },
    "Resisted knee extension (MMT)": {
      kind: "mmt", mmtRegion: "Knee", mmtHighlights: ["mmt_quad"],
      why: "Pain on resisted knee extension with tenderness at the inferior pole of the patella -- patellar tendinopathy.",
    },
    "Palpation of patellar tendon": {
      kind: "palpation",
      hotspotIds: ["patella_r", "patella_l"],
      why: "Tenderness at the inferior pole of the patella / patellar tendon -- patellar tendinopathy. Opens the Palpation module and highlights the patella/patellar-tendon point (both sides -- pick the affected one).",
    },
  },
  ankle: {
    "Anterior drawer test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_ant_drawer_ankle" },
    "Navicular drop test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_navicular_drop" },
    "Royal London Hospital test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_royal_london" },
    "Squeeze/mortise test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_squeeze_ankle" },
    "Talar tilt test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_talar_tilt" },
    "Thompson's (Simmond's) test": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_thompson_test" },
    "Tinel's sign at tarsal tunnel": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_tinel_ankle" },
    "Passive ROM with end-feel assessment": {
      kind: "rom", romRegion: "Ankle", romHighlights: ["rom_adf", "rom_apf", "rom_ainv", "rom_aev"],
      why: "Dorsiflexion <35° weight-bearing is clinically significant and the primary kinetic-chain driver -- check first.",
    },
    "Passive dorsiflexion end-feel": {
      kind: "rom", romRegion: "Ankle", romHighlights: ["rom_adf"],
      why: "Isolated dorsiflexion end-feel -- hard/bony suggests anterior impingement, soft/boggy suggests capsular restriction.",
    },
  },
  foot: {
    "Windlass test (dorsiflex the hallux)": { kind: "special", specialRegion: "ankle_foot", highlightTest: "st_windlass_test" },
    "1st MTP active/passive dorsiflexion ROM + end-feel": {
      kind: "rom", romRegion: "Foot", romHighlights: ["rom_1mtpf", "rom_1mtpp"],
      why: "1st MTP dorsiflexion loss (hallux limitus/rigidus) -- compare active vs passive range and note end-feel quality.",
    },
    "Palpation of medial calcaneal tubercle / plantar fascia origin": {
      kind: "palpation",
      hotspotIds: ["plantar_r", "plantar_l"],
      why: "Medial calcaneal tubercle tenderness -- plantar fasciitis. Opens the Palpation module and highlights the plantar/heel point (both sides -- pick the affected one).",
    },
    "Palpation of central weight-bearing heel pad (vs medial origin)": {
      kind: "palpation",
      // Same single plantar_r/l hotspot as the medial-origin entry above --
      // ANATOMICAL_HOTSPOTS has one heel/plantar point, not separate
      // medial-origin vs central-fat-pad points, so this can highlight the
      // area but can't visually distinguish the two sub-locations within it.
      hotspotIds: ["plantar_r", "plantar_l"],
      why: "Central heel-pad tenderness vs medial origin helps differentiate fat-pad syndrome from plantar fasciitis. Opens the Palpation module and highlights the plantar/heel point (both sides) -- the medial-vs-central distinction itself still needs manual palpation, no separate hotspot for it.",
    },
    "Palpation of metatarsal heads / plantar plate": {
      kind: "palpation",
      // No forefoot/metatarsal-head hotspot exists in ANATOMICAL_HOTSPOTS --
      // left unmapped rather than guessing at the nearest point.
      why: "Metatarsal head / plantar plate tenderness -- metatarsalgia or plantar plate injury. Opens the Palpation module; no matching body-map point yet, locate manually.",
    },
  },
  elbow: {
    "Cozen's test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_cozens" },
    "Elbow valgus stress test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_valgus_stress_elbow" },
    "Golfer's elbow test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_golfers" },
    "Mill's test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_mills" },
    "Tinel's sign at elbow": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_tinel_elbow" },
    "Active/passive elbow ROM with end-feel": {
      kind: "rom", romRegion: "Elbow", romHighlights: ["rom_eflex", "rom_eext", "rom_esup", "rom_epro"],
      why: "Flexion/extension and forearm supination/pronation -- establishes mobility baseline and end-feel quality.",
    },
    "Resisted elbow flexion/supination (biceps)": {
      kind: "mmt", mmtRegion: "Elbow & Forearm", mmtHighlights: ["mmt_bicep"],
      why: "Pain or weakness on resisted flexion + supination with antecubital tenderness -- distal biceps tendinopathy or rupture (look for a Popeye deformity).",
    },
    "Resisted supination": {
      kind: "mmt", mmtRegion: "Elbow & Forearm", mmtHighlights: ["mmt_supinator"],
      why: "Pain ~4cm distal to the lateral epicondyle on resisted supination -- radial tunnel / PIN entrapment (can mimic lateral epicondylalgia).",
    },
    "Resisted pronation with elbow flexion": {
      kind: "mmt", mmtRegion: "Elbow & Forearm", mmtHighlights: ["mmt_pt"],
      why: "Pain on resisted pronation with elbow flexion, proximal-volar-forearm tenderness -- pronator teres syndrome (median nerve entrapment).",
    },
  },
  wrist: {
    "Finkelstein's test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_finkelstein" },
    "Grind test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_grind" },
    "Phalen's test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_phalen" },
    "Tinel's sign at wrist": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_tinel_wrist" },
    "Watson scaphoid shift test": { kind: "special", specialRegion: "elbow_wrist", highlightTest: "st_watson" },
    "Active/passive wrist ROM with end-feel": {
      kind: "rom", romRegion: "Wrist", romHighlights: ["rom_wflex", "rom_wext", "rom_wrad", "rom_wuln"],
      why: "Flexion/extension and radial/ulnar deviation -- establishes mobility baseline and end-feel quality.",
    },
  },
  hand: {
    // SPECIAL_TESTS_DATA has no "hand" category and ROM_DATA has no "Hand"
    // region -- nothing to map yet.
  },
};

function findSpecialTestMeta(specialRegion, highlightTest) {
  const reg = SPECIAL_TESTS_DATA[specialRegion];
  if (!reg) return null;
  return reg.tests.find((t) => t.id === highlightTest) || null;
}

export function genericTestNav(engineRegion, label) {
  const entry = MAP[engineRegion] && MAP[engineRegion][label];
  if (!entry) return null;

  if (entry.kind === "rom") {
    return {
      kind: "rom",
      icon: "📐",
      nav: "rom",
      ctx: { romRegion: entry.romRegion, romHighlights: entry.romHighlights },
      why: entry.why,
    };
  }

  if (entry.kind === "mmt") {
    return {
      kind: "mmt",
      icon: "💪",
      nav: "mmt",
      ctx: { mmtRegion: entry.mmtRegion, mmtHighlights: entry.mmtHighlights },
      why: entry.why,
    };
  }

  if (entry.kind === "palpation") {
    // PalpationModule (ClinicalModules.jsx) has no region concept, just
    // point hotspots -- ctx carries palpHotspotIds (real ANATOMICAL_HOTSPOTS
    // ids) when a clean match exists so the module can switch view and ring
    // the point; empty array/undefined when it doesn't (e.g. metatarsal
    // heads), same honest-gap behavior as leaving it non-clickable.
    return {
      kind: "palpation", icon: "🖐️", nav: "palpation",
      ctx: entry.hotspotIds ? { palpHotspotIds: entry.hotspotIds } : {},
      why: entry.why,
    };
  }

  // kind === "special"
  const meta = findSpecialTestMeta(entry.specialRegion, entry.highlightTest);
  const why = meta
    ? `${meta.structure ? meta.structure + " — " : ""}positive: ${meta.positive || "see test detail"}.`
    : "Confirmatory test for this condition — opens the Special Tests module to perform and record it.";
  return { kind: "special", icon: "🔬", nav: "special", ctx: { specialRegion: entry.specialRegion, highlightTest: entry.highlightTest }, why };
}
