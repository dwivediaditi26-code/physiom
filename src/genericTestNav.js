// genericTestNav.js — per-region priority-test -> Special Tests deep-link
// resolver for the genericPhase05 regions (hip, knee, ankle, foot, elbow,
// wrist, hand). Same pattern as shoulderPhase05.js's shoulderTestNav().
//
// Without this, genericPhase05's priority-test buttons all pointed at
// "special" with no region/test context (ctx: null) -- so clicking any of
// them, e.g. "Hip Scour test", landed on the Special Tests screen defaulted
// to Shoulder (SpecialTestsSection's fallback region) with nothing
// highlighted. Looked like the button didn't do anything useful.
//
// Maps each evidence.json keyExam label to its real
// { specialRegion, highlightTest } id in SPECIAL_TESTS_DATA
// (sharedClinicalData.js) where a matching test actually exists there. Note
// SPECIAL_TESTS_DATA groups ankle+foot as "ankle_foot" and elbow+wrist as
// "elbow_wrist" -- not separate keys -- and has no "hand" category at all,
// so hand keyExams currently have nothing to map to.
//
// Labels with no dedicated module yet (imaging referrals, ROM/MMT/palpation
// items -- none of those are in the Special Tests catalog) resolve to null
// and stay a non-clickable "no dedicated module" chip, same honest fallback
// shoulderPhase05 already uses for its own gaps rather than guessing.

import { SPECIAL_TESTS_DATA } from "./sharedClinicalData.js";

const MAP = {
  hip: {
    "FADIR test": { specialRegion: "hip", highlightTest: "st_fadir_test" },
    "Hip Scour test": { specialRegion: "hip", highlightTest: "st_hip_scour" },
    "Ober's test": { specialRegion: "hip", highlightTest: "st_ober_test" },
    "Piriformis (FAIR) test": { specialRegion: "hip", highlightTest: "st_piriformis_test" },
    "Trendelenburg test": { specialRegion: "hip", highlightTest: "st_trendelenburg_test" },
  },
  knee: {
    "Clarke's sign": { specialRegion: "knee", highlightTest: "st_clarkes" },
    "Lachman's test": { specialRegion: "knee", highlightTest: "st_lachmans" },
    "McMurray's test": { specialRegion: "knee", highlightTest: "st_mcmurray_test" },
    "Noble compression test": { specialRegion: "knee", highlightTest: "st_noble" },
    // No separate knee-catalog Ober's test -- IT band/TFL is filed under hip
    // in SPECIAL_TESTS_DATA, same cross-region link pattern shoulderPhase05
    // uses for spurling_positive -> cervical.
    "Ober's test": { specialRegion: "hip", highlightTest: "st_ober_test" },
    "Patellar grind test": { specialRegion: "knee", highlightTest: "st_patellar_grind" },
    "Pivot shift test": { specialRegion: "knee", highlightTest: "st_pivot_shift" },
    "Posterior drawer test": { specialRegion: "knee", highlightTest: "st_posterior_drawer" },
    "Sweep/ballottement test for effusion": { specialRegion: "knee", highlightTest: "st_effusion" },
    "Thessaly test": { specialRegion: "knee", highlightTest: "st_thessaly" },
    "Valgus stress test": { specialRegion: "knee", highlightTest: "st_valgus_stress_knee" },
    "Varus stress test": { specialRegion: "knee", highlightTest: "st_varus_stress_knee" },
  },
  ankle: {
    "Anterior drawer test": { specialRegion: "ankle_foot", highlightTest: "st_ant_drawer_ankle" },
    "Navicular drop test": { specialRegion: "ankle_foot", highlightTest: "st_navicular_drop" },
    "Royal London Hospital test": { specialRegion: "ankle_foot", highlightTest: "st_royal_london" },
    "Squeeze/mortise test": { specialRegion: "ankle_foot", highlightTest: "st_squeeze_ankle" },
    "Talar tilt test": { specialRegion: "ankle_foot", highlightTest: "st_talar_tilt" },
    "Thompson's (Simmond's) test": { specialRegion: "ankle_foot", highlightTest: "st_thompson_test" },
    "Tinel's sign at tarsal tunnel": { specialRegion: "ankle_foot", highlightTest: "st_tinel_ankle" },
  },
  foot: {
    "Windlass test (dorsiflex the hallux)": { specialRegion: "ankle_foot", highlightTest: "st_windlass_test" },
  },
  elbow: {
    "Cozen's test": { specialRegion: "elbow_wrist", highlightTest: "st_cozens" },
    "Elbow valgus stress test": { specialRegion: "elbow_wrist", highlightTest: "st_valgus_stress_elbow" },
    "Golfer's elbow test": { specialRegion: "elbow_wrist", highlightTest: "st_golfers" },
    "Mill's test": { specialRegion: "elbow_wrist", highlightTest: "st_mills" },
    "Tinel's sign at elbow": { specialRegion: "elbow_wrist", highlightTest: "st_tinel_elbow" },
  },
  wrist: {
    "Finkelstein's test": { specialRegion: "elbow_wrist", highlightTest: "st_finkelstein" },
    "Grind test": { specialRegion: "elbow_wrist", highlightTest: "st_grind" },
    "Phalen's test": { specialRegion: "elbow_wrist", highlightTest: "st_phalen" },
    "Tinel's sign at wrist": { specialRegion: "elbow_wrist", highlightTest: "st_tinel_wrist" },
    "Watson scaphoid shift test": { specialRegion: "elbow_wrist", highlightTest: "st_watson" },
  },
  hand: {
    // SPECIAL_TESTS_DATA has no "hand" category -- nothing to map yet.
  },
};

function findTestMeta(specialRegion, highlightTest) {
  const reg = SPECIAL_TESTS_DATA[specialRegion];
  if (!reg) return null;
  return reg.tests.find((t) => t.id === highlightTest) || null;
}

export function genericTestNav(engineRegion, label) {
  const entry = MAP[engineRegion] && MAP[engineRegion][label];
  if (!entry) return null;
  const meta = findTestMeta(entry.specialRegion, entry.highlightTest);
  const why = meta
    ? `${meta.structure ? meta.structure + " — " : ""}positive: ${meta.positive || "see test detail"}.`
    : "Confirmatory test for this condition — opens the Special Tests module to perform and record it.";
  return { icon: "🔬", nav: "special", ctx: entry, why };
}
