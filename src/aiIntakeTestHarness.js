// aiIntakeTestHarness.js
//
// An on-demand testing tool for the AI intake pipeline, run entirely
// from the browser console -- not automatic, not wired into any UI, and
// completely inert until called. Built because a permanent, always-on
// console log (added and then removed in an earlier iteration) printed
// noise during every real patient's assessment, which isn't something a
// working clinician wants. This is the opposite shape: silent unless
// you explicitly ask for it.
//
// It exists to answer one question honestly: when you describe a real
// patient to the AI, does the ACTUAL production pipeline -- the real
// /api/parse call to Groq, the real field mapping, the real
// interpretation engine, the real SOAP generator -- produce something
// sensible? Every function this harness calls is the same one the app
// itself uses; nothing here is reimplemented or mocked.
//
// It never touches a real patient record. Each case builds its own
// throwaway, in-memory data object -- nothing is saved, nothing is sent
// to Supabase, your actual patients are untouched no matter how many
// times you run this.
//
// Usage, from the browser console on the live app:
//   physioAITest.runAll()                 -- runs all 15 built-in cases
//   physioAITest.runOne("your own narrative here")   -- test one of your own
//
// Each case's full detail prints as a collapsed console group (click to
// expand); a summary table prints at the end so you can scan all 15 at
// a glance before drilling into any one that looks off.

import { mapParseResultToUpdates } from "./aiIntakeParser.js";

// 15 cases: 5 fracture/post-surgical, 5 lumbar (varied presentations,
// one with a genuine red flag), 5 other conditions across the
// remaining regions the AI intake covers. Realistic, natural-language
// narratives -- the way a student would actually describe a patient,
// not pre-structured data.
const CASES = [
  // ── FRACTURE / POST-SURGICAL (5) ──────────────────────────────────
  { id: "fx1_shoulder", label: "Fracture 1 — Shoulder (greater tuberosity, post-op)", expectedRegion: "Shoulder (R)",
    narrative: "25 year old, post op stiffness and limited ROM in the right shoulder, two months back had a greater tuberosity of humerus fracture and post op pain due to a road traffic accident." },
  { id: "fx2_wrist", label: "Fracture 2 — Wrist (distal radius, post-cast)", expectedRegion: "Elbow/Wrist/Hand",
    narrative: "52 year old woman, distal radius fracture on the left wrist six weeks ago, cast removed last week, stiff and weak, pain when trying to grip things." },
  { id: "fx3_ankle", label: "Fracture 3 — Ankle (lateral malleolus, post-ORIF)", expectedRegion: "Ankle / Foot",
    narrative: "34 year old man, lateral malleolus fracture on the right ankle, had surgery with plates and screws ten weeks ago, still swollen, painful putting weight on it." },
  { id: "fx4_hip", label: "Fracture 4 — Hip (neck of femur, post-hemiarthroplasty)", expectedRegion: "Hip / Groin",
    narrative: "78 year old woman, fractured neck of femur on the left hip after a fall at home, had a hemiarthroplasty four weeks ago, uses a walker, pain going from sitting to standing." },
  { id: "fx5_knee", label: "Fracture 5 — Knee (tibial plateau, post-ORIF)", expectedRegion: "Knee (L)",
    narrative: "29 year old man, tibial plateau fracture in the left knee from a motorbike accident, had surgery with plates eight weeks ago, partial weight bearing only, knee still stiff and swollen." },

  // ── LUMBAR (5) ──────────────────────────────────────────────────────
  { id: "lx1_redflag", label: "Lumbar 1 — Acute lifting injury + bladder red flag", expectedRegion: "Lumbar / SI", expectFlags: true,
    narrative: "38 year old warehouse worker, threw his back out lifting a box four days ago, sharp pain shooting down the left leg to the foot, and he mentioned some difficulty starting urination since yesterday." },
  { id: "lx2_chronic", label: "Lumbar 2 — Chronic mechanical, desk worker", expectedRegion: "Lumbar / SI",
    narrative: "45 year old office worker, dull aching low back pain for two years, worse by end of day sitting at a desk, better after walking and stretching, no leg symptoms." },
  { id: "lx3_extension", label: "Lumbar 3 — Extension-intolerant, young gymnast", expectedRegion: "Lumbar / SI",
    narrative: "17 year old gymnast, low back pain for three weeks, much worse when arching backward doing a bridge, better bending forward, no injury she can recall." },
  { id: "lx4_stenosis", label: "Lumbar 4 — Neurogenic claudication, elderly", expectedRegion: "Lumbar / SI",
    narrative: "70 year old man, low back and both legs ache and go heavy after walking more than five minutes, much better sitting down or leaning on a shopping trolley, gradual onset over a year." },
  { id: "lx5_postpartum", label: "Lumbar 5 — SI joint, postpartum", expectedRegion: "Lumbar / SI",
    narrative: "31 year old woman, six weeks postpartum, pain around the lower back and one side of the pelvis, worse going up stairs and rolling over in bed." },

  // ── OTHER CONDITIONS (5) ────────────────────────────────────────────
  { id: "ot1_cervicogenic", label: "Other 1 — Cervicogenic headache, desk worker", expectedRegion: "Cervical spine",
    narrative: "40 year old software engineer, neck pain and headaches starting at the base of the skull for the past three months, gradual onset, worse after long hours at the laptop, better with a heat pack." },
  { id: "ot2_thoracic", label: "Other 2 — Thoracic postural, teenager with backpack", expectedRegion: "Thoracic spine",
    narrative: "16 year old student, aching pain between the shoulder blades for four months, gradual onset, worse carrying a heavy backpack, some mild curve noticed in his spine." },
  { id: "ot3_pfps", label: "Other 3 — Patellofemoral pain, runner", expectedRegion: "Knee (R)",
    narrative: "24 year old recreational runner, pain around the front of the right knee for two months, gradual onset, worse going down stairs and after running, no swelling or injury." },
  { id: "ot4_frozen", label: "Other 4 — Frozen shoulder, diabetic", expectedRegion: "Shoulder (L)",
    narrative: "58 year old woman with diabetes, left shoulder has gradually gotten stiffer over five months, no injury, severe night pain, can barely reach behind her back." },
  { id: "ot5_cts", label: "Other 5 — Carpal tunnel, typist", expectedRegion: "Elbow/Wrist/Hand",
    narrative: "36 year old typist, numbness and tingling in the right thumb and first two fingers for two months, worse at night, gradual onset, shakes her hand to relieve it." },
];

// EXTRA_CASES: 16 additional cases widening coverage beyond the original 15
// (which stay untouched above so the manual physioAITest.runAll() console
// tool keeps its original fast ~15-case shape for quick dev checks). These
// exist for the CI @ai-accuracy suite (e2e/ai-accuracy.spec.ts), which
// combines CASES + EXTRA_CASES for a fuller pass, run nightly with TPM-safe
// pacing rather than by a developer waiting at the console.
//
// Focus, deliberately different from the original 15:
//  - confusable pairs within the same region (rotator cuff vs. cervical
//    radiculopathy referring into the arm; ACL-mechanism vs. MCL-mechanism
//    knee injuries; hip OA vs. labral tear) -- tests DISCRIMINATION, not
//    just "did it find A region", which the original 15 mostly don't stress
//  - regions the original 15 barely touch (cervical had 1, thoracic had 1,
//    hip had 1, ankle had 1)
//  - a second and third red-flag case (original 15 has exactly one -- cauda
//    equina) -- cervical myelopathy, and an elderly fall/fracture flag
//  - a hedged-mechanism case, directly testing the system prompt's explicit
//    "if the patient hedges about cause, don't pick that specific mechanism"
//    rule (api/parse.js) rather than assuming it just works
//  - a genuine multi-region complaint (tests that the PRIMARY region is
//    still identified correctly when two body areas are both mentioned)
const EXTRA_CASES = [
  // ── CONFUSABLE PAIRS ────────────────────────────────────────────────
  { id: "cf1_mcl", label: "Confusable 1 — MCL sprain (contact/valgus), not ACL", expectedRegion: "Knee (R)",
    narrative: "22 year old football player, someone hit the outside of his right knee during a tackle two days ago, pain on the inner side of the knee, feels a bit unstable pushing off that leg, no locking or catching." },
  { id: "cf2_meniscus", label: "Confusable 2 — Meniscus tear (twisting, locking), not ligament", expectedRegion: "Knee (L)",
    narrative: "33 year old woman, twisted her left knee getting out of a low car three weeks ago, pain along the inside joint line, catches and occasionally locks when straightening it out, mild swelling on and off." },
  { id: "cf3_rotatorcuff", label: "Confusable 3 — Rotator cuff tear (true shoulder pathology)", expectedRegion: "Shoulder (R)",
    narrative: "61 year old man, sudden weakness lifting his right arm overhead after trying to catch a falling box two weeks ago, can't hold the arm up against resistance, pain over the outer shoulder, neck feels completely fine." },
  { id: "cf4_cervrad_arm", label: "Confusable 4 — Neck pain referring into arm (NOT shoulder pathology)", expectedRegion: "Cervical spine",
    narrative: "47 year old man, neck pain for six weeks that shoots down the outside of his right arm into his thumb and index finger, some tingling there too, worse turning his head that direction, shoulder itself doesn't hurt to move." },
  { id: "cf5_dequervain", label: "Confusable 5 — De Quervain's (thumb-side wrist), not carpal tunnel", expectedRegion: "Elbow/Wrist/Hand",
    narrative: "29 year old new mother, pain on the thumb side of her right wrist for a month, worse lifting the baby with her thumb out to the side, no numbness or tingling anywhere." },
  { id: "cf6_ankle_sprain", label: "Confusable 6 — Acute inversion ankle sprain (not fracture)", expectedRegion: "Ankle / Foot",
    narrative: "19 year old basketball player, rolled his left ankle inward landing from a jump yesterday, swelling on the outside of the ankle, painful but can put some weight through it, no obvious deformity." },
  { id: "cf7_achilles", label: "Confusable 7 — Achilles tendinopathy (gradual, not acute rupture)", expectedRegion: "Ankle / Foot",
    narrative: "44 year old recreational runner, gradual ache in the back of his right heel over three months, worse the first few steps in the morning and at the start of a run, eases once warmed up." },
  { id: "cf8_hip_oa", label: "Confusable 8 — Hip osteoarthritis (elderly, gradual)", expectedRegion: "Hip / Groin",
    narrative: "68 year old woman, gradual deep ache in her right groin and outer hip for over a year, worse walking distances and going up stairs, morning stiffness lasting about twenty minutes, no injury." },
  { id: "cf9_hip_labral", label: "Confusable 9 — Hip labral tear (young, pivoting, clicking)", expectedRegion: "Hip / Groin",
    narrative: "26 year old recreational footballer, sharp catching pain deep in the left groin when pivoting or twisting to kick, an occasional clicking sensation, gradual onset over four months, no clear injury." },

  // ── RED FLAGS (original 15 has exactly one) ─────────────────────────
  { id: "cf10_myelopathy_redflag", label: "Confusable 10 — Cervical myelopathy red flag (hand clumsiness, gait)", expectedRegion: "Cervical spine", expectFlags: true,
    narrative: "66 year old man, neck stiffness for months, but the new thing over the past few weeks is his hands feel clumsy buttoning his shirt and his wife says his walking looks unsteady, not like his usual gait." },
  { id: "cf11_hip_fragility_redflag", label: "Confusable 11 — Elderly fall, can't weight bear (occult fracture flag)", expectedRegion: "Hip / Groin", expectFlags: true,
    narrative: "82 year old woman, fell in the bathroom yesterday, right hip and groin pain since, unable to put any weight on that leg at all, leg looks slightly shorter and turned outward compared to the other one." },

  // ── UNDER-REPRESENTED REGIONS ────────────────────────────────────────
  { id: "cf12_whiplash", label: "Confusable 12 — Acute whiplash, MVA, no red flags", expectedRegion: "Cervical spine",
    narrative: "35 year old woman, rear-ended at a red light three days ago, neck pain and stiffness since that evening, headache at the base of the skull, no arm symptoms, no dizziness, no red flags she's aware of." },
  { id: "cf13_costochondritis", label: "Confusable 13 — Costochondritis (thoracic wall, reproducible on palpation)", expectedRegion: "Thoracic spine",
    narrative: "24 year old man, sharp pain on the left side of his chest wall for ten days, worse taking a deep breath or pressing on the area himself, started after an intense upper-body gym session, no cardiac history, no shortness of breath." },

  // ── HEDGED MECHANISM (tests the anti-guessing prompt rule directly) ──
  { id: "cf14_hedged_onset", label: "Confusable 14 — Hedged mechanism (model should NOT pick a specific cause)", expectedRegion: "Lumbar / SI",
    narrative: "50 year old man, dull low back pain for two weeks, not totally sure what caused it, maybe from a weekend of gardening, or possibly just from sitting awkwardly at his desk, honestly not certain either way." },

  // ── MULTI-REGION (primary complaint should still resolve correctly) ──
  { id: "cf15_multiregion", label: "Confusable 15 — Two distinct regions in one narrative, primary should still resolve", expectedRegion: "Lumbar / SI",
    narrative: "39 year old man, his main complaint is low back pain for six weeks that's really limiting him at work, and separately he also mentions some mild right knee ache after long walks that started around the same time." },
  { id: "cf16_multiregion_shoulder_primary", label: "Confusable 16 — Two distinct regions, shoulder is the primary complaint", expectedRegion: "Shoulder (L)",
    narrative: "45 year old woman, the main reason she's here is severe left shoulder pain and stiffness for two months that's stopping her from sleeping on that side, she also briefly mentions some mild occasional ankle soreness from an old sprain years ago that doesn't really bother her." },
];

async function callParseOnce(narrative) {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: narrative }),
  });
  const result = await res.json();
  if (!res.ok || result.error) {
    // api/parse.js's 502 branch includes the real Groq response text in
    // `detail` -- without surfacing it, every Groq-side failure (bad key,
    // rate limit, model issue, outage) collapses into the same unhelpful
    // "Groq error" label with no way to tell them apart. Found this gap
    // live: a real 502 gave no way to diagnose what actually went wrong.
    const detail = result.detail ? ` -- ${String(result.detail).slice(0, 300)}` : "";
    throw new Error((result.error || `Server error (${res.status})`) + detail);
  }
  return result;
}

// Real-world finding: running all 15 cases back to back occasionally
// fails a handful of consecutive calls partway through (observed: 4
// cases in a row), while the exact same narrative re-run on its own
// immediately afterward succeeds. That pattern -- fine in isolation,
// fails under a rapid burst -- points at a transient rate limit
// (Groq's API or Vercel's serverless concurrency), not a bug in the
// mapping or interpretation logic. Retrying with backoff instead of
// giving up on the first failure makes runAll() reliably finish all 15
// in one pass rather than needing a second manual run for whatever
// happened to land in the rate-limited window.
async function callParse(narrative, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  try {
    return await callParseOnce(narrative);
  } catch (e) {
    if (attempt >= MAX_ATTEMPTS) throw e;
    const waitMs = attempt * 2000; // 2s, then 4s
    console.log(`%c⏳ Attempt ${attempt} failed (${e.message}) -- retrying in ${waitMs / 1000}s...`, "color:#b45309");
    await new Promise(res => setTimeout(res, waitMs));
    return callParse(narrative, attempt + 1);
  }
}

// Runs one narrative through the full real pipeline: /api/parse -> field
// mapping -> interpretation engine -> SOAP generator. Returns a plain
// object with everything needed to print or inspect; also prints a
// console group as it goes so partial progress is visible even if a
// later stage throws.
async function runOne(narrative, opts = {}) {
  const label = opts.label || "Custom narrative";
  const expectedRegion = opts.expectedRegion || null;

  console.groupCollapsed(`%c🤖 ${label}`, "background:#7c3aed;color:#fff;padding:2px 7px;border-radius:4px;font-weight:bold");
  console.log("Narrative:", narrative);

  let aiResponse, mapped, interpretation = null, soap = null, error = null;
  try {
    aiResponse = await callParse(narrative);
    console.log("Raw AI response (/api/parse):", aiResponse);

    mapped = mapParseResultToUpdates(aiResponse, {});
    const regionMatch = expectedRegion ? (mapped.region === expectedRegion ? "✓ matches expected" : `✗ expected ${expectedRegion}`) : "";
    console.log(`Region detected: ${mapped.region || "(none)"} ${regionMatch}`);
    console.log("Fields that would be written to Subjective:", mapped.updates);
    console.log("Red flags noticed:", mapped.redFlagsToReview.length ? mapped.redFlagsToReview : "(none)");

    // Sandboxed data -- nothing here touches a real patient record.
    const sandboxData = { ...mapped.updates };

    if (mapped.region) {
      // Heavier modules are dynamically imported here, not at app
      // startup, so this test harness never adds weight to the normal
      // app bundle every user downloads -- only loaded if you actually
      // run a test.
      // Imported through the SAME lazy wrapper files AppFull.jsx already
      // uses (lazy_subjective.jsx / lazy_soapnote.jsx), not the raw
      // SubjectiveObjective.jsx / ClinicalModules.jsx files directly --
      // a second, different dynamic-import path to the same large
      // module confuses Rollup's chunking and can pull it into the
      // eagerly-loaded main bundle instead of keeping it lazy for
      // everyone who never runs this test tool.
      const [{ runEngineV6 }, { buildRealtimeSOAP }] = await Promise.all([
        import("./lazy_subjective.jsx"),
        import("./lazy_soapnote.jsx"),
      ]);

      interpretation = runEngineV6(sandboxData, [mapped.region]);
      const rr = interpretation?.regionResults?.[0];
      if (rr) {
        console.log("Review / clinical suggestion — primary pattern:", rr.primaryPattern, `(${rr.confidence} confidence)`);
        console.log("Top differentials:", rr.differentials?.map(d => `${d.label} [${d.confidence}]`));
        console.log("Precautions:", rr.precautions?.length ? rr.precautions : "(none)");
        console.log("Urgent flag:", interpretation.anyUrgent ? "⚠ YES" : "No");
      }

      soap = buildRealtimeSOAP(sandboxData);
      console.log("SOAP Notes / SOAP Live — Subjective (S):", soap.S || "(empty)");
      console.log("SOAP Notes / SOAP Live — Objective (O):", soap.O || "(empty)");
    } else {
      console.log("%cNo region detected -- interpretation and SOAP generation both require a region, so both were skipped for this case.", "color:#b45309");
    }
  } catch (e) {
    error = e.message;
    console.log("%c✗ FAILED:", "color:#dc2626;font-weight:bold", error);
  }
  console.groupEnd();

  return { id: opts.id, label, narrative, expectedRegion, aiResponse, mapped, interpretation, soap, error };
}

async function runAll() {
  console.log(`%c🤖 Running all ${CASES.length} AI intake test cases — this makes ${CASES.length} real calls to /api/parse, one at a time, so it will take a little while.`, "background:#7c3aed;color:#fff;padding:3px 9px;border-radius:5px;font-weight:bold;font-size:1.05em");
  const results = [];
  for (const c of CASES) {
    const r = await runOne(c.narrative, c);
    results.push(r);
    // Small gap between calls, easier on the API and easier to read as it streams in.
    await new Promise(res => setTimeout(res, 600));
  }

  console.log("%c🤖 Summary — all 15 cases", "background:#059669;color:#fff;padding:3px 9px;border-radius:5px;font-weight:bold;font-size:1.05em");
  console.table(results.map(r => ({
    Case: r.label,
    "Region detected": r.mapped?.region || (r.error ? "ERROR" : "(none)"),
    "Region as expected?": r.error ? "—" : (r.expectedRegion ? (r.mapped?.region === r.expectedRegion ? "✓" : "✗") : "—"),
    "Fields filled": r.mapped ? Object.keys(r.mapped.updates).length : 0,
    "Red flags": r.mapped?.redFlagsToReview?.length || 0,
    "SOAP generated?": r.soap ? "✓" : "—",
    "Urgent?": r.interpretation?.anyUrgent ? "⚠" : "—",
    "Primary pattern": r.interpretation?.regionResults?.[0]?.primaryPattern || "—",
  })));

  const failed = results.filter(r => r.error);
  if (failed.length) console.log(`%c${failed.length} case(s) failed:`, "color:#dc2626;font-weight:bold", failed.map(f => f.label));
  else console.log("%cAll 15 cases completed without errors. Expand any group above for full detail.", "color:#166534;font-weight:bold");

  return results;
}

// Attach to window -- inert until called, no automatic execution, no
// effect on normal app use.
function installAiIntakeTestHarness() {
  if (typeof window === "undefined") return;
  window.physioAITest = { runAll, runOne: (narrative, opts) => runOne(narrative, opts || {}), CASES, EXTRA_CASES };
}

export { installAiIntakeTestHarness, runAll, runOne, CASES, EXTRA_CASES };
