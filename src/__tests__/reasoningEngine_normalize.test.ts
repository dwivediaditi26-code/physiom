import { normalizeFromData, runShoulderReasoningFromData, normalizeCervicalFromData, normalizeLumbarFromData } from "../reasoningEngine/index";

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
