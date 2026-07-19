import { normalizeFromData, runShoulderReasoningFromData, normalizeCervicalFromData, normalizeLumbarFromData, runReasoningFromData } from "../reasoningEngine/index";

describe("normalizeFromData (flat app record -> typed engine inputs, real field ids)", () => {
  it("maps st_ special tests, rom_ ROM and mmt_mmt_ MMT from the flat data object", () => {
    const data = {
      cc_main: "Right shoulder pain, worse reaching overhead",
      cc_onset: "insidious, no injury",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
      st_empty_can: "Positive — painful (tendinopathy)",
      rom_sabd_L_arom: "140", rom_sabd_L_prom: "165",
      mmt_mmt_supra_L: "4", mmt_mmt_supra_R: "3",
      palp_pins: JSON.stringify([{ structures: ["greater tuberosity"] }]),
    };
    const { subjective, objective, region } = normalizeFromData(data);
    expect(region).toBe("shoulder");
    expect(subjective.overheadAggravation).toBe(true);
    expect(subjective.onsetInsidious).toBe(true);
    expect(objective.specialTests.hawkins).toBe(true);
    expect(objective.specialTests.neer).toBe(true);
    expect(objective.specialTests.empty_can).toBe(true);
    expect(objective.rom[0].movement).toBe("Abduction");
    // worse side wins on MMT (grade 3, not 4)
    expect(objective.mmt[0].grade).toBe(3);
    expect(objective.palpation.tenderStructures).toContain("greater tuberosity");
  });

  it("runs the full pipeline from a flat record and returns a ranked differential", () => {
    const data = {
      cc_main: "shoulder pain overhead",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
      st_empty_can: "Positive — painful (tendinopathy)",
    };
    const r = runShoulderReasoningFromData(data);
    expect(r.stopped).toBe(false);
    expect(r.differentials.length).toBeGreaterThan(0);
    expect(r.differentials[0].name).toMatch(/Subacromial|tendinopathy/i);
  });

  it("never fabricates findings — an empty record yields no positive tests", () => {
    const { objective } = normalizeFromData({});
    expect(Object.keys(objective.specialTests)).toHaveLength(0);
    expect(objective.rom).toHaveLength(0);
    expect(objective.mmt).toHaveLength(0);
  });

  it("derives drop-arm from a massive-tear external-rotation-lag result", () => {
    const { objective } = normalizeFromData({ st_er_lag: "Positive — full lag (massive RC tear)" });
    expect(objective.specialTests.er_lag).toBe(true);
    expect(objective.specialTests.drop_arm).toBe(true);
  });

  // Regression: sh_night/sh_behaviour/sh_agg_mov/sh_agg_act/sh_onset/cx_behaviour/
  // cc_pattern/cc_agg/sh_imaging do NOT exist anywhere in sharedClinicalData.js --
  // the shoulder normalizer used to read only these nonexistent fields for
  // night/constant pain, aggravation and imaging, so those signals could never
  // fire from a real assessment no matter what the clinician recorded. Locks in
  // the fix: real signals now come from cc_main free text and grf_*/hx_imaging.
  it("detects night pain, malignancy and imaging findings from the REAL fields the app writes (not the guessed ones)", () => {
    const data = {
      cc_main: "Constant right shoulder pain, wakes me at night",
      dem_age: "58",
      grf_cancer: ["Past cancer — <5 years"],
      grf_systemic: ["Unexplained weight loss >5kg"],
      grf_fracture: ["Major trauma — high energy"],
      hx_imaging: ["MRI — abnormal"],
      hx_imaging_detail: "MRI shows a full-thickness supraspinatus tear",
    };
    const { subjective, objective } = normalizeFromData(data);
    expect(subjective.nightPain).toBe(true);
    expect(subjective.constantPain).toBe(true);
    expect(subjective.malignancyHistory).toBe(true);
    expect(subjective.unexplainedWeightLoss).toBe(true);
    expect(subjective.traumaHistory).toBe(true);
    expect(objective.imaging?.performed).toBe(true);
    expect(objective.imaging?.summary).toMatch(/full-thickness/i);
  });

  // Regression: the negative options on grf_cancer/grf_fracture/grf_systemic
  // never contain the word "positive", so the old isPos() check was always
  // false even when a genuine negative screen was recorded (which is correct
  // -- but it was ALSO always false when a positive finding was selected,
  // which is the bug). This confirms the negative screen still correctly
  // yields no red flags.
  it("does not fabricate red flags from an explicitly negative general screen", () => {
    const data = {
      cc_main: "shoulder pain",
      grf_cancer: ["No cancer history"],
      grf_systemic: ["None — systemically well"],
      grf_fracture: ["No fracture indicators"],
    };
    const { subjective } = normalizeFromData(data);
    expect(subjective.malignancyHistory).toBe(false);
    expect(subjective.systemicIllness).toBe(false);
    expect(subjective.traumaHistory).toBe(false);
  });

  // Regression for a bug caught during real-case validation: "insidious onset,
  // no injury" -- completely normal clinical phrasing -- was being read as
  // BOTH insidious AND traumatic, because has(onset,"injury") matches the
  // "injury" substring inside "no injury". onsetInsidious was always correct;
  // onsetTraumatic was the false positive.
  it("does not read negated onset phrasing ('no injury'/'no trauma'/'no fall') as confirming trauma", () => {
    const noInjury = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "insidious, no injury" });
    expect(noInjury.subjective.onsetInsidious).toBe(true);
    expect(noInjury.subjective.onsetTraumatic).toBe(false);

    const noTrauma = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "gradual onset, no trauma" });
    expect(noTrauma.subjective.onsetTraumatic).toBe(false);

    const deniesFall = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "insidious, denies fall or injury" });
    expect(deniesFall.subjective.onsetTraumatic).toBe(false);
  });

  // Real positive mentions of trauma must still register -- the fix guards
  // against negation, it must not blanket-suppress genuine trauma detection.
  it("still detects genuine traumatic onset when actually described", () => {
    const fell = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "sudden onset after a fall onto outstretched arm" });
    expect(fell.subjective.onsetTraumatic).toBe(true);

    const workInjury = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "work injury lifting a heavy box" });
    expect(workInjury.subjective.onsetTraumatic).toBe(true);
  });

  // Regression: painful arc (shl_arc/shr_arc dedicated select, or the
  // "Painful arc — 60 to 120 degrees abduction" option inside the
  // shl_agg_mov/shr_agg_mov aggravating-movements multicheck) was collected
  // by the app but never reached the shoulder engine at all.
  it("reads painful arc from the dedicated shl_arc/shr_arc select field", () => {
    const { objective } = normalizeFromData({
      cc_main: "shoulder pain",
      shr_arc: "60–120° abduction (subacromial)",
    });
    expect(objective.specialTests.painful_arc).toBe(true);
  });

  it("reads painful arc from the shl_agg_mov/shr_agg_mov checkbox option as a fallback", () => {
    const { objective } = normalizeFromData({
      cc_main: "shoulder pain",
      shl_agg_mov: ["Reaching overhead", "Painful arc — 60 to 120 degrees abduction"],
    });
    expect(objective.specialTests.painful_arc).toBe(true);
  });

  it("does not fabricate painful arc when the arc field says 'No painful arc' or 'Above 120°'", () => {
    const none = normalizeFromData({ cc_main: "shoulder pain", shr_arc: "No painful arc" });
    expect(none.objective.specialTests.painful_arc).toBeUndefined();

    const acPattern = normalizeFromData({ cc_main: "shoulder pain", shr_arc: "Above 120° (AC joint)" });
    expect(acPattern.objective.specialTests.painful_arc).toBeUndefined();
  });

  // Regression: Spurling's (st_spurling) is a real, shared field the shoulder
  // evidence model explicitly wants for its cervical-referral exclusion
  // differential, but only the cervical normalizer ever read it.
  it("reads Spurling's test for the shoulder region's cervical-referral exclusion differential", () => {
    const { objective } = normalizeFromData({
      cc_main: "shoulder pain radiating into forearm",
      st_spurling: "Positive — reproduces ipsilateral radicular arm pain",
    });
    expect(objective.specialTests.spurling).toBe(true);
  });

  // Regression: negation safety must generalise beyond onset -- every
  // free-text cc_main-derived behavioural signal was vulnerable the same way.
  it("does not read negated phrasing as confirming night pain, constant pain, easing-with-rest, paraesthesia, overhead aggravation, or stiffness", () => {
    const cases: Array<[string, keyof ReturnType<typeof normalizeFromData>["subjective"]]> = [
      ["Right shoulder pain, no night pain", "nightPain"],
      ["Right shoulder pain, not constant", "constantPain"],
      ["Right shoulder pain, does not ease with rest", "easesWithRest"],
      ["Right shoulder pain, denies tingling or numbness", "paresthesia"],
      ["Right shoulder pain, not aggravated by overhead activity", "overheadAggravation"],
      ["Right shoulder pain, no stiffness", "progressiveStiffness"],
    ];
    for (const [cc_main, field] of cases) {
      const { subjective } = normalizeFromData({ cc_main });
      expect(subjective[field], `${field} for "${cc_main}"`).toBe(false);
    }
  });

  // Compound negated lists ("denies X or Y") must negate every item in the
  // list, not just the word immediately after the negator.
  it("negates every item in a compound negated list, not just the first", () => {
    const { subjective } = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "insidious, denies fall or injury" });
    expect(subjective.onsetTraumatic).toBe(false);
    expect(subjective.onsetInsidious).toBe(true);
  });

  // A contrastive re-assertion after an earlier negation must still register.
  it("still detects a genuine positive mention after an earlier unrelated negation, once a contrastive word appears", () => {
    const { subjective } = normalizeFromData({ cc_main: "shoulder pain", cc_onset: "no clear injury, but definite trauma from a fall at work" });
    expect(subjective.onsetTraumatic).toBe(true);
  });

  // Genuine positive mentions of these signals must still register --
  // hasUnnegated must not blanket-suppress real findings.
  it("still detects genuine night pain, constant pain, paraesthesia, overhead aggravation, and stiffness when actually present", () => {
    expect(normalizeFromData({ cc_main: "Wakes me up with night pain" }).subjective.nightPain).toBe(true);
    expect(normalizeFromData({ cc_main: "Constant ache all day" }).subjective.constantPain).toBe(true);
    expect(normalizeFromData({ cc_main: "Numbness and tingling into the hand" }).subjective.paresthesia).toBe(true);
    expect(normalizeFromData({ cc_main: "Worse reaching overhead" }).subjective.overheadAggravation).toBe(true);
    expect(normalizeFromData({ cc_main: "Progressive stiffness for months" }).subjective.progressiveStiffness).toBe(true);
  });

  // Regression: radiationBelowElbow used to read a field ("loc_radiation")
  // that does not exist anywhere in the app. The real fields are
  // shl_radiation/shr_radiation.
  it("reads radiation below the elbow from the real shl_radiation/shr_radiation fields", () => {
    const hand = normalizeFromData({ cc_main: "shoulder pain", shr_radiation: "Down to hand (concerning)" });
    expect(hand.subjective.radiationBelowElbow).toBe(true);

    const deltoidOnly = normalizeFromData({ cc_main: "shoulder pain", shr_radiation: "Down to deltoid insertion" });
    expect(deltoidOnly.subjective.radiationBelowElbow).toBe(false);
  });

  // Regression: shl_rf/shr_rf -- shoulder's own dedicated red-flag checklist
  // -- was never read at all. Each of these previously meant the
  // corresponding redFlags.ts rule could never fire from a shoulder
  // assessment, silently, no matter what a clinician checked.
  it("wires shoulder's own red-flag checklist (shl_rf/shr_rf) into the matching red-flag sub-signals", () => {
    const nightPain = normalizeFromData({ cc_main: "shoulder pain", shr_rf: "Pain at rest and night — progressive (malignancy flag)" });
    expect(nightPain.subjective.nightPainUnrelieved).toBe(true);

    const fracture = normalizeFromData({ cc_main: "shoulder pain after a fall", shr_rf: "Suspected fracture" });
    expect(fracture.subjective.unableToWeightBear).toBe(true);
    expect(fracture.subjective.traumaHistory).toBe(true);

    const dislocation = normalizeFromData({ cc_main: "shoulder pain", shl_rf: "Suspected unreduced dislocation" });
    expect(dislocation.subjective.irreducibleLocking).toBe(true);

    const septic = normalizeFromData({ cc_main: "shoulder pain", shl_rf: "Skin changes — erythema / warmth (septic joint)" });
    expect(septic.subjective.hotSwollenJoint).toBe(true);

    const vascular = normalizeFromData({ cc_main: "shoulder pain", shr_rf: "Vascular compromise" });
    expect(vascular.subjective.vascularCompromiseSigns).toBe(true);

    const cancer = normalizeFromData({ cc_main: "shoulder pain", shr_rf: "Cancer history — bone mets risk" });
    expect(cancer.subjective.malignancyHistory).toBe(true);
  });

  // Regression: the malignancy red-flag rule (unexplainedWeightLoss &&
  // nightPainUnrelieved && ageOver50) could never fire for shoulder because
  // nightPainUnrelieved was never set -- confirmed via real-case validation.
  it("can now trigger the malignancy red flag from a shoulder assessment via the shoulder-specific night-pain option", () => {
    const { subjective } = normalizeFromData({
      cc_main: "Constant right shoulder pain for 2 months, unintentional weight loss",
      dem_age: "63",
      shr_rf: "Pain at rest and night — progressive (malignancy flag)",
      grf_systemic: ["Unexplained weight loss >5kg"],
    });
    expect(subjective.unexplainedWeightLoss).toBe(true);
    expect(subjective.nightPainUnrelieved).toBe(true);
    expect(subjective.ageOver50).toBe(true);
  });

  // Regression: cervical myelopathy (bilateral hand clumsiness + gait
  // disturbance) presenting as shoulder/arm pain produced zero warning when
  // assessed via shoulder, because myelopathySigns was never read -- the
  // single most safety-significant gap found during real-case validation.
  it("reads cross-region myelopathy signs (cx_rf_myelopathy) so a shoulder assessment isn't blind to it", () => {
    const { subjective } = normalizeFromData({
      cc_main: "Bilateral shoulder and arm pain with clumsy hands and unsteady gait",
      cx_rf_myelopathy: ["Bilateral hand clumsiness", "Gait disturbance / unsteadiness"],
    });
    expect(subjective.myelopathySigns).toBe(true);
  });

  // Regression: cardiac/respiratory/abdominal visceral referral (classic
  // "shoulder pain that's actually your heart/lungs" teaching scenarios --
  // Pancoast tumours and cardiac ischaemia both classically present as
  // shoulder pain) had zero coverage for shoulder. Reads the same tx_rf/
  // tx_radiation fields thoracic's own normalizer already uses.
  it("reads cross-region cardiac/respiratory/abdominal visceral referral signals (tx_rf/tx_radiation)", () => {
    const cardiac = normalizeFromData({
      cc_main: "Left shoulder pain with chest tightness",
      tx_rf: "Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw",
    });
    expect(cardiac.subjective.thoracicCardiacSymptoms).toBe(true);

    const radiation = normalizeFromData({
      cc_main: "Left shoulder pain",
      tx_radiation: "Cardiac-like radiation — left chest / arm (urgent flag)",
    });
    expect(radiation.subjective.thoracicCardiacLikeRadiation).toBe(true);

    const anteriorChest = normalizeFromData({
      cc_main: "Right shoulder pain",
      shr_radiation: "Anterior chest",
    });
    expect(anteriorChest.subjective.thoracicCardiacLikeRadiation).toBe(true);

    const respiratory = normalizeFromData({
      cc_main: "Right shoulder pain, breathless",
      tx_rf: "Respiratory symptoms — shortness of breath / haemoptysis",
    });
    expect(respiratory.subjective.thoracicRespiratorySymptoms).toBe(true);

    const abdominal = normalizeFromData({
      cc_main: "Right shoulder tip pain",
      tx_rf: "Abdominal symptoms — pain with eating / weight loss",
    });
    expect(abdominal.subjective.thoracicAbdominalSymptoms).toBe(true);
  });

  // End-to-end: the red-flag SCREEN itself (not just the sub-signal) must
  // actually halt shoulder suggestions for the two gaps found during
  // real-case validation.
  it("end-to-end: red flag screen halts shoulder suggestions for myelopathy and cardiac-referral signals", async () => {
    const { runReasoning } = await import("../reasoningEngine/index");
    const myelopathy = normalizeFromData({
      cc_main: "Bilateral shoulder and arm pain with clumsy hands and unsteady gait",
      cx_rf_myelopathy: ["Bilateral hand clumsiness", "Gait disturbance / unsteadiness"],
    });
    const myelopathyResult = runReasoning(myelopathy.subjective, myelopathy.objective, "shoulder");
    expect(myelopathyResult.stopped).toBe(true);
    expect(myelopathyResult.redFlag.flags.some((f) => f.id === "myelopathy")).toBe(true);

    const cardiac = normalizeFromData({
      cc_main: "Left shoulder pain with chest tightness",
      tx_rf: "Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw",
    });
    const cardiacResult = runReasoning(cardiac.subjective, cardiac.objective, "shoulder");
    expect(cardiacResult.stopped).toBe(true);
    expect(cardiacResult.redFlag.flags.some((f) => f.id === "thoracic_visceral_referral")).toBe(true);
  });
});

describe("normalizeCervicalFromData — regression: guessed field names replaced with real ones", () => {
  // Regression: cx_behaviour, cx_onset, cx_arm_pain, cx_headache,
  // cx_unilateral_headache, cx_stiffness, cx_gait, cx_umn, cx_vbi,
  // cx_dizziness, cx_thunderclap, cx_paresthesia do not exist anywhere in
  // sharedClinicalData.js -- none of these findings could ever be detected
  // from a real cervical assessment before this fix, regardless of what the
  // clinician recorded (this is what a user hit live: ROM/history genuinely
  // entered, "Not yet tested" shown anyway).
  it("detects pattern, headache, radiating arm pain and gait disturbance from the REAL cx_ fields", () => {
    const data = {
      cc_main: "Neck pain with unilateral headache",
      cx_pattern: ["Constant — varies in intensity"],
      cx_arm_present: "Yes — unilateral (R)",
      cx_ha_present: "Yes — secondary to neck pain",
      cx_ha_location: ["Temporal (R)"],
      cx_rf_myelopathy: ["Gait disturbance / wide-based gait / ataxia"],
      cx_moi: ["Whiplash — rear-end MVA"],
    };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.constantPain).toBe(true);
    expect(subjective.radiatingArmPain).toBe(true);
    expect(subjective.headacheFromNeck).toBe(true);
    expect(subjective.unilateralHeadache).toBe(true);
    expect(subjective.gaitDisturbance).toBe(true);
    expect(subjective.myelopathySigns).toBe(true);
    expect(subjective.onsetTraumatic).toBe(true);
  });

  it("detects VBI signs and thunderclap headache from the real cx_rf_vbi screen", () => {
    const data = {
      cc_main: "neck pain",
      cx_rf_vbi: ["Dizziness with neck movement — specific", "Thunderclap headache — sudden worst ever"],
    };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.dizzinessVBI).toBe(true);
    expect(subjective.vertebrobasilarSigns).toBe(true);
    expect(subjective.suddenSevereHeadacheOrNeckPain).toBe(true);
  });

  it("detects malignancy/fracture/systemic red flags from the real grf_* fields", () => {
    const data = {
      cc_main: "neck pain",
      grf_cancer: ["Active cancer — in treatment"],
      grf_fracture: ["Minor trauma + age >50"],
      grf_systemic: ["Fever / systemically unwell"],
    };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.malignancyHistory).toBe(true);
    expect(subjective.traumaHistory).toBe(true);
    expect(subjective.systemicIllness).toBe(true);
  });

  it("does not fabricate a headache/arm-pain/gait finding from an explicitly negative screen", () => {
    const data = {
      cc_main: "neck pain",
      cx_arm_present: "No arm or hand symptoms",
      cx_ha_present: "No headache",
      cx_rf_myelopathy: ["No myelopathy signs"],
      cx_rf_vbi: ["No VBI signs"],
    };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.radiatingArmPain).toBe(false);
    expect(subjective.headacheFromNeck).toBe(false);
    expect(subjective.gaitDisturbance).toBe(false);
    expect(subjective.myelopathySigns).toBe(false);
    expect(subjective.dizzinessVBI).toBe(false);
  });

  it("reads imaging from hx_imaging/hx_imaging_detail (cx_imaging does not exist)", () => {
    const data = { cc_main: "neck pain", hx_imaging: ["X-ray — abnormal"], hx_imaging_detail: "cervical spondylosis" };
    const { objective } = normalizeCervicalFromData(data);
    expect(objective.imaging?.performed).toBe(true);
    expect(objective.imaging?.summary).toMatch(/spondylosis/i);
  });
});

describe("normalizeCervicalFromData — deep audit: ULTT wiring, cx_night helper bug, red-flag gaps, negation safety", () => {
  // Regression: ultta_positive was wired from st_slump_test (a lower-limb/whole-
  // neuraxis test), not st_ultt1 (ULTT1 -- Median Nerve), which is the actual
  // ULTT-A component of the Wainner cervical radiculopathy cluster this
  // diagnosis cites. st_slump_test is a real, separately-used field (lumbar
  // slump), so a positive slump alone must NOT satisfy cervical's ULTT signal.
  it("wires the Wainner cluster's ULTT-A from the real st_ultt1/2/3 fields, not st_slump_test", () => {
    const positive = normalizeCervicalFromData({ cc_main: "arm pain", st_ultt1: "Positive right — median nerve sensitised" });
    expect(positive.objective.specialTests.ultt).toBe(true);
    const radial = normalizeCervicalFromData({ cc_main: "arm pain", st_ultt2: "Positive left — radial nerve sensitised" });
    expect(radial.objective.specialTests.ultt).toBe(true);
    const ulnar = normalizeCervicalFromData({ cc_main: "arm pain", st_ultt3: "Positive right — ulnar nerve sensitised" });
    expect(ulnar.objective.specialTests.ultt).toBe(true);
    const slumpOnly = normalizeCervicalFromData({ cc_main: "arm pain", st_slump_test: "Reproduces symptoms — eases with neck extension" });
    expect(slumpOnly.objective.specialTests.ultt).toBeUndefined();
  });

  // Regression: cx_night was read with isPos(), which only matches
  // "positive"/"+ve"/"true"/"yes" substrings. None of cx_night's real options
  // ("Wakes multiple times from sleep", "Constant night pain -- cannot sleep",
  // etc.) contain those words, so isPos(data.cx_night) was ALWAYS false --
  // nightPain silently depended on the cx_pattern "night" fallback alone.
  it("detects night pain from the real cx_night checklist text (isPos() never matched it)", () => {
    const { subjective } = normalizeCervicalFromData({ cc_main: "neck pain", cx_night: ["Wakes multiple times from sleep"] });
    expect(subjective.nightPain).toBe(true);
  });

  // nightPainUnrelieved was never set at all for cervical -- the malignancy red
  // flag (unexplainedWeightLoss && nightPainUnrelieved && ageOver50) was
  // structurally blind for this region regardless of what was recorded.
  it("sets nightPainUnrelieved from cx_night's 'constant, cannot sleep' option and fires the malignancy red flag end to end", () => {
    const { subjective } = normalizeCervicalFromData({ cc_main: "neck pain", cx_night: ["Constant night pain — cannot sleep"] });
    expect(subjective.nightPainUnrelieved).toBe(true);

    const data = {
      dem_age: "64",
      cc_main: "constant neck pain, worse over six weeks",
      cx_night: ["Constant night pain — cannot sleep"],
      grf_systemic: ["Unexplained weight loss >5kg"],
    };
    const r = runReasoningFromData(data, "cervical");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "malignancy")).toBe(true);
  });

  // unableToWeightBear (reused across regions as "hard evidence of suspected
  // fracture") was never set for cervical -- the fracture red flag
  // (traumaHistory && unableToWeightBear) was structurally blind even though a
  // full, real "Cervical -- Fracture Screen" checklist (cx_fracture_screen,
  // NEXUS / Canadian C-Spine Rule wording) already existed and was simply never
  // read anywhere in the engine.
  it("wires the real cx_fracture_screen checklist into traumaHistory/unableToWeightBear and fires the fracture red flag end to end", () => {
    const { subjective } = normalizeCervicalFromData({
      cc_main: "severe neck pain after motorcycle accident",
      cx_fracture_screen: ["High-energy trauma (MVA / fall >1m / diving)", "Cannot move neck at all — voluntary splinting"],
    });
    expect(subjective.traumaHistory).toBe(true);
    expect(subjective.unableToWeightBear).toBe(true);

    const r = runReasoningFromData({ cc_main: "severe neck pain after MVA, cannot move neck", cx_fracture_screen: ["High-energy trauma (MVA / fall >1m / diving)", "Cannot move neck at all — voluntary splinting"] }, "cervical");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "fracture")).toBe(true);
  });

  it("does not fire the fracture red flag from cx_fracture_screen's 'Not applicable' placeholder", () => {
    const { subjective } = normalizeCervicalFromData({ cc_main: "neck pain", cx_fracture_screen: ["Not applicable"] });
    expect(subjective.unableToWeightBear).toBe(false);
  });

  // cx_rf_other reinforcement: "Known cervical cancer / tumour" ->
  // malignancyHistory, "Constitutional symptoms with neck pain" ->
  // systemicIllness, "Carotid / vertebral artery dissection symptoms" ->
  // vascularCompromiseSigns. Same cross-field-reinforcement pattern used for
  // shoulder's shl_rf/shr_rf audit.
  it("reinforces malignancyHistory, systemicIllness and vascularCompromiseSigns from the real cx_rf_other checklist", () => {
    const cancer = normalizeCervicalFromData({ cc_main: "neck pain", cx_rf_other: ["Known cervical cancer / tumour"] });
    expect(cancer.subjective.malignancyHistory).toBe(true);
    const constitutional = normalizeCervicalFromData({ cc_main: "neck pain", cx_rf_other: ["Constitutional symptoms with neck pain"] });
    expect(constitutional.subjective.systemicIllness).toBe(true);
    const dissection = normalizeCervicalFromData({ cc_main: "neck pain", cx_rf_other: ["Carotid / vertebral artery dissection symptoms"] });
    expect(dissection.subjective.vascularCompromiseSigns).toBe(true);
  });

  // Negation safety: cc_main is genuine free text, and cc_onset -- though a UI
  // dropdown with fixed options -- is ALSO written by the AI intake parser
  // (aiIntakeParser.js: updates.cc_onset = result.onset) with LLM-generated text
  // that is not enum-validated, so it carries the same risk. Plain has() reads
  // ordinary clinical negation ("denies dizziness", "no headache") as a
  // confirmation because the negated word is a substring of itself.
  it("does not fabricate dizziness/headache/stiffness/paraesthesia findings from negated free text", () => {
    const data = {
      cc_main: "Neck pain, denies dizziness, no headache, not stiff, denies numbness or tingling",
    };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.dizzinessVBI).toBe(false);
    expect(subjective.vertebrobasilarSigns).toBe(false);
    expect(subjective.headacheFromNeck).toBe(false);
    expect(subjective.neckStiffness).toBe(false);
    expect(subjective.paresthesia).toBe(false);
  });

  it("still detects genuine positive mentions of the same terms (negation guard is not overzealous)", () => {
    const data = { cc_main: "Neck pain with dizziness, headache, stiffness, and numbness in the fingers" };
    const { subjective } = normalizeCervicalFromData(data);
    expect(subjective.dizzinessVBI).toBe(true);
    expect(subjective.headacheFromNeck).toBe(true);
    expect(subjective.neckStiffness).toBe(true);
    expect(subjective.paresthesia).toBe(true);
  });

  // Regression: cc_onset's real dropdown includes a literal "Sudden — no trauma"
  // option (e.g. acute wry neck / idiopathic facet lock). "sudden" used to be
  // its own keyword alongside "trauma", and hasUnnegated only negates the
  // specific key it's checking -- so "sudden" matched positively even while
  // "trauma" in that same option was correctly excluded. Also verifies cx_moi
  // is read as an independent OR source, not merely a `??` fallback that a
  // populated (but unrelated) cc_onset would shadow.
  it("does not read 'Sudden — no trauma' as a traumatic onset, but still catches 'Sudden — traumatic' and cx_moi mechanisms", () => {
    const noTrauma = normalizeCervicalFromData({ cc_main: "neck locked this morning", cc_onset: "Sudden — no trauma" });
    expect(noTrauma.subjective.onsetTraumatic).toBe(false);

    const traumatic = normalizeCervicalFromData({ cc_main: "neck pain", cc_onset: "Sudden — traumatic" });
    expect(traumatic.subjective.onsetTraumatic).toBe(true);

    // cc_onset populated with something unrelated must not shadow a real cx_moi mechanism.
    const moiOnly = normalizeCervicalFromData({ cc_main: "neck pain", cc_onset: "Woke with it", cx_moi: ["Whiplash — rear-end MVA"] });
    expect(moiOnly.subjective.onsetTraumatic).toBe(true);
  });

  // Regression: cx_agg_mov ("Movements aggravate") and cx_agg_post ("Postures
  // aggravate") are two separate real questions a clinician normally answers
  // both of. The old `cx_agg_mov ?? cx_agg_post` fallback meant a populated
  // cx_agg_mov (even with unrelated content) silently shadowed a correctly
  // filled cx_agg_post.
  it("reads extension/rotation aggravation from BOTH cx_agg_mov and cx_agg_post independently", () => {
    const movOnly = normalizeCervicalFromData({ cc_main: "neck pain", cx_agg_mov: ["Extension — looking up"] });
    expect(movOnly.subjective.extensionRotationAggravation).toBe(true);
    // cx_agg_mov populated with unrelated content must not shadow cx_agg_post.
    const postOnly = normalizeCervicalFromData({
      cc_main: "neck pain",
      cx_agg_mov: ["Side bend left"],
      cx_agg_post: ["Looking up — overhead"],
    });
    expect(postOnly.subjective.extensionRotationAggravation).toBe(true);
  });

  it("reads radiation from the real cx_radiation field alone (loc_radiation has never existed)", () => {
    const { subjective } = normalizeCervicalFromData({ cc_main: "neck pain", cx_radiation: ["To hand / fingers (R)"] });
    expect(subjective.radiatingArmPain).toBe(true);
  });
});

describe("normalizeLumbarFromData — regression: grf_* + imaging field fixes", () => {
  it("detects malignancy/fracture/systemic red flags from the real grf_* fields (isPos() never matched their real options)", () => {
    const data = {
      cc_main: "back pain",
      grf_cancer: ["Active cancer — in treatment"],
      grf_fracture: ["Major trauma — high energy"],
      grf_systemic: ["Unexplained weight loss >5kg"],
    };
    const { subjective } = normalizeLumbarFromData(data);
    expect(subjective.malignancyHistory).toBe(true);
    expect(subjective.traumaHistory).toBe(true);
    expect(subjective.unexplainedWeightLoss).toBe(true);
  });

  it("reads imaging from hx_imaging/hx_imaging_detail (lx_imaging/imaging_summary do not exist)", () => {
    const data = { cc_main: "back pain", hx_imaging: ["X-ray — abnormal"], hx_imaging_detail: "Grade 1 spondylolisthesis L5/S1" };
    const { objective } = normalizeLumbarFromData(data);
    expect(objective.imaging?.performed).toBe(true);
    expect(objective.imaging?.summary).toMatch(/spondylolisthesis/i);
  });
});

describe("normalizeLumbarFromData — deep audit: fracture red-flag gap, cauda equina bilateral-sciatica gap, extension-aggravation parity, negation safety", () => {
  // Regression: unableToWeightBear (reused across regions as "hard evidence of
  // suspected fracture") was never set for lumbar -- the fracture red flag
  // (traumaHistory && unableToWeightBear) was structurally blind even though a
  // full, real "Lumbar -- Fracture risk indicators" checklist (lx_rf_fracture)
  // already existed and was only partially read (traumaHistory alone, via one
  // of its nine options).
  it("wires the real lx_rf_fracture checklist into traumaHistory/unableToWeightBear and fires the fracture red flag end to end", () => {
    const { subjective } = normalizeLumbarFromData({
      cc_main: "low back pain",
      lx_rf_fracture: ["Point bone tenderness on spinous process", "Minor trauma + age >70"],
    });
    expect(subjective.traumaHistory).toBe(true);
    expect(subjective.unableToWeightBear).toBe(true);

    const r = runReasoningFromData({
      cc_main: "sudden severe low back pain after a minor fall, 74 years old",
      lx_rf_fracture: ["Point bone tenderness on spinous process", "Minor trauma + age >70"],
    }, "lumbar");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "fracture")).toBe(true);
  });

  it("does not fire the fracture red flag from lx_rf_fracture's 'No fracture indicators' placeholder", () => {
    const { subjective } = normalizeLumbarFromData({ cc_main: "low back pain", lx_rf_fracture: ["No fracture indicators"] });
    expect(subjective.unableToWeightBear).toBe(false);
  });

  // Regression: lx_rf_cauda's "Bilateral sciatica — new onset" option -- a real,
  // recognised cauda equina warning sign in its own right (new-onset bilateral
  // sciatica, distinct from the usual unilateral presentation) -- was defined
  // in sharedClinicalData.js but never read into any signal at all.
  it("detects the cauda equina red flag from lx_rf_cauda's 'Bilateral sciatica — new onset' option", () => {
    const { subjective } = normalizeLumbarFromData({ cc_main: "back and leg pain", lx_rf_cauda: ["Bilateral sciatica — new onset"] });
    expect(subjective.bilateralLegWeakness).toBe(true);

    const r = runReasoningFromData({ cc_main: "sudden bilateral leg pain", lx_rf_cauda: ["Bilateral sciatica — new onset"] }, "lumbar");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "cauda_equina")).toBe(true);
  });

  // Regression: lx_moi_position's "Flexed forward" option was wired into
  // flexionAggravation, but the parallel "Extended backward" option in that
  // same field was never wired into extensionAggravation -- an asymmetric gap
  // (extension_aggravation feeds both facet syndrome and spinal stenosis).
  it("reads extension aggravation from lx_moi_position's 'Extended backward', matching flexion's existing 'Flexed forward' wiring", () => {
    const { subjective } = normalizeLumbarFromData({ cc_main: "back pain", lx_moi_position: ["Extended backward"] });
    expect(subjective.extensionAggravation).toBe(true);
  });

  // Regression: `lx_moi ?? cc_onset` meant a populated-but-unrelated lx_moi
  // silently shadowed a correctly-filled cc_onset, and the combined string was
  // read with has() instead of hasUnnegated() -- misreading a negated cc_onset
  // (AI-parser free text) as a positive. Split into independent reads, OR'd.
  it("reads onset from BOTH lx_moi and cc_onset independently (lx_moi no longer shadows cc_onset)", () => {
    // lx_moi populated with an unrelated (insidious) mechanism must not shadow a real cc_onset trauma mention.
    const onsetOnly = normalizeLumbarFromData({ cc_main: "back pain", cc_onset: "MVA / whiplash", lx_moi: ["No clear mechanism — insidious onset"] });
    expect(onsetOnly.subjective.onsetTraumatic).toBe(true);

    // lx_moi-only mechanism data (no relevant cc_onset) still correctly registers post-refactor.
    const moiOnly = normalizeLumbarFromData({ cc_main: "back pain", cc_onset: "Woke with it", lx_moi: ["Fall from height"] });
    expect(moiOnly.subjective.onsetTraumatic).toBe(true);

    // AI-parser free text negation on the shared cc_onset field (same risk class as cervical's identical fix).
    const noTrauma = normalizeLumbarFromData({ cc_main: "back pain", cc_onset: "Sudden — no trauma" });
    expect(noTrauma.subjective.onsetTraumatic).toBe(false);
    const traumatic = normalizeLumbarFromData({ cc_main: "back pain", cc_onset: "Sudden — traumatic" });
    expect(traumatic.subjective.onsetTraumatic).toBe(true);
  });

  // Negation safety: cc_main is genuine free text (also AI-parser-writable).
  // Plain has() previously read "denies numbness or tingling" as a confirmation.
  it("does not fabricate paraesthesia from negated free text in cc_main, but still detects genuine mentions", () => {
    const negated = normalizeLumbarFromData({ cc_main: "Low back pain, denies numbness or tingling in the legs" });
    expect(negated.subjective.paresthesia).toBe(false);

    const positive = normalizeLumbarFromData({ cc_main: "Low back pain with tingling down the right leg" });
    expect(positive.subjective.paresthesia).toBe(true);
  });
});
