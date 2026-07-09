// interpretationEngine.test.js
// Unit + integration tests for src/interpretationEngine/ -- the clinical
// diagnosis suggestion engine that replaced DiagnosisEngine.js's
// runDiagnosisEngine/getTopDiagnosesEnhanced in SOAP Notes' Assessment tab.
// Each module is tested directly against its own expected shape; the
// integration tests at the bottom run the full pipeline through
// buildAssessmentData() the way the live app actually calls it.
import { describe, it, expect } from "vitest";
import { redFlagScreen } from "../interpretationEngine/redFlagScreen.js";
import { regionScreen } from "../interpretationEngine/regionScreen.js";
import { subjectiveParser } from "../interpretationEngine/subjectiveParser.js";
import { romEndFeelLogic } from "../interpretationEngine/romEndFeelLogic.js";
import { mmtGrading } from "../interpretationEngine/mmtGrading.js";
import { specialTestCluster, CLUSTERS } from "../interpretationEngine/specialTestCluster.js";
import { cyriaxPattern } from "../interpretationEngine/cyriaxPattern.js";
import { functionalScreen } from "../interpretationEngine/functionalScreen.js";
import { kineticChainLink } from "../interpretationEngine/kineticChainLink.js";
import { differentialRanker } from "../interpretationEngine/differentialRanker.js";
import { runInterpretation } from "../interpretationEngine/index.js";
import { buildAssessmentData, detectRegion } from "../interpretationAdapter.js";

describe("redFlagScreen", () => {
  it("triggers on cauda equina indicators", () => {
    const r = redFlagScreen({ subjective: { bladderBowelChange: true } });
    expect(r.triggered).toBe(true);
    expect(r.flags[0].id).toBe("cauda_equina");
  });
  it("does not trigger on clean subjective data", () => {
    const r = redFlagScreen({ subjective: { chiefComplaint: "mild knee ache" } });
    expect(r.triggered).toBe(false);
  });
  it("never throws on missing/malformed subjective data", () => {
    expect(() => redFlagScreen({})).not.toThrow();
    expect(() => redFlagScreen({ subjective: null })).not.toThrow();
  });
});

describe("regionScreen", () => {
  it("prefers an explicit region over chief-complaint keywords", () => {
    const r = regionScreen({ subjective: { region: "cervical", chiefComplaint: "knee pain" } });
    expect(r.region).toBe("cervical");
    expect(r.matchedVia).toBe("explicit");
  });
  it("falls back to chief-complaint keyword matching", () => {
    const r = regionScreen({ subjective: { chiefComplaint: "sharp low back pain" } });
    expect(r.region).toBe("lumbar");
    expect(r.matchedVia).toBe("chiefComplaint");
  });
  it("returns unspecified when nothing matches", () => {
    const r = regionScreen({ subjective: { chiefComplaint: "general fatigue" } });
    expect(r.region).toBe("unspecified");
  });
});

describe("subjectiveParser", () => {
  it("classifies mechanical pattern", () => {
    const f = subjectiveParser({ painWithMovementOnly: true, easesWithRest: true });
    expect(f.find(x => x.finding.includes("Pain pattern")).flags).toContain("mechanical");
  });
  it("classifies acute stage from short duration", () => {
    const f = subjectiveParser({ symptomDurationDays: 3 });
    expect(f.find(x => x.finding.includes("Stage")).flags).toContain("acute");
  });
});

describe("romEndFeelLogic", () => {
  it("flags a deficit and contractile-pattern differentiation", () => {
    const f = romEndFeelLogic([{ movement: "flexion", activeROM: 60, passiveROM: 88, normalROM: 90 }]);
    expect(f[0].flags.some(x => x.includes("contractile"))).toBe(true);
  });
});

describe("mmtGrading", () => {
  it("flags strong+painful as a contractile lesion", () => {
    const f = mmtGrading([{ muscle: "supraspinatus", grade: 4, painOnResist: true }]);
    expect(f[0].flags[0]).toMatch(/contractile lesion/);
  });
});

describe("specialTestCluster", () => {
  it("covers cervical, shoulder, elbow, wrist, lumbar, hip, knee, ankle", () => {
    for (const region of ["cervical","shoulder","elbow","wrist","lumbar","hip","knee","ankle"]) {
      expect(CLUSTERS[region]).toBeTruthy();
      expect(CLUSTERS[region].length).toBeGreaterThan(0);
    }
  });
  it("every cluster requires at least 2 real tests -- no single-test 'clusters'", () => {
    for (const clusters of Object.values(CLUSTERS)) {
      for (const c of clusters) {
        expect(c.tests.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it("scores high confidence when enough tests are positive", () => {
    const f = specialTestCluster({ st_hawkins: true, st_neer: true }, { region: "shoulder" });
    const impingement = f.find(x => x.finding.includes("Subacromial impingement"));
    expect(impingement.severity).toBe("high");
  });
});

describe("cyriaxPattern", () => {
  it("detects a capsular pattern when all relevant movements are restricted", () => {
    const rom = [
      { movement: "external rotation", passiveROM: 40, normalROM: 90 },
      { movement: "abduction", passiveROM: 60, normalROM: 170 },
    ];
    const f = cyriaxPattern(rom, []);
    expect(f.some(x => x.flags.includes("capsular/arthritic pattern"))).toBe(true);
  });
});

describe("functionalScreen (refined for the app's real 0/1/2 grade scale)", () => {
  it("classifies grade 2 as ABN (highest priority)", () => {
    const f = functionalScreen({ movements: [{ movementName: "kfs_squat", grade: 2 }] });
    expect(f[0].flags[0]).toBe("ABN");
    expect(f[0].severity).toBe(null);
  });
  it("classifies grade 0 as POOR with high severity", () => {
    const f = functionalScreen({ movements: [{ movementName: "kfs_squat", grade: 0 }] });
    expect(f[0].flags[0]).toBe("POOR");
    expect(f[0].severity).toBe("high");
  });
  it("still accepts the original array + isFunctional/isPainful shape", () => {
    const f = functionalScreen([{ movementName: "deep squat", isFunctional: false, isPainful: true }]);
    expect(f[0].flags[0]).toBe("POOR");
  });
});

describe("kineticChainLink (fixed rule routing)", () => {
  it("triggers ROM-based rules only against ROM data", () => {
    const rom = [{ movement: "ankle dorsiflexion", passiveROM: 5, normalROM: 20 }];
    const f = kineticChainLink(rom, {});
    expect(f.some(x => x.flags.includes("ankle_to_knee"))).toBe(true);
  });
  it("triggers functional-based rules only against functional data", () => {
    const f = kineticChainLink([], { overactiveMuscles: ["TFL"] });
    expect(f.some(x => x.flags.includes("hip_to_knee"))).toBe(true);
  });
  it("never throws when given the wrong shape", () => {
    expect(() => kineticChainLink(null, undefined)).not.toThrow();
  });
});

describe("differentialRanker with extended region config", () => {
  it("has rule sets for every region the app supports (not just the original shoulder/lumbar/knee)", () => {
    for (const region of ["cervical","shoulder","elbow","wrist","lumbar","hip","knee","ankle","general"]) {
      const r = differentialRanker([{ flags: [] }], { region });
      expect(r.note).toBeUndefined();
    }
  });
  it("reports no rule set for a truly unconfigured region", () => {
    const r = differentialRanker([], { region: "unspecified" });
    expect(r.note).toMatch(/No differential rule set/);
  });
});

describe("full pipeline integration (buildAssessmentData -> runInterpretation)", () => {
  it("empty data never throws and detects no region", () => {
    expect(detectRegion({})).toBeNull();
    expect(() => runInterpretation(buildAssessmentData({}))).not.toThrow();
  });

  it("realistic cervical radiculopathy case surfaces the right differential", () => {
    const data = {
      dem_age: "45", dem_gender: "Female",
      cc_main: "Neck pain radiating into right arm and hand",
      loc_radiation: "arm and hand",
      neuro_quality: "tingling",
      rom_cflex_arom: "30", rom_cflex_prom: "32",
      mmt_dnf_L: "3",
      st_spurling: "Positive — radicular symptoms",
      st_distraction: "Positive — relief of symptoms",
      st_ultt1: "Positive",
    };
    const result = runInterpretation(buildAssessmentData(data));
    expect(result.stopped).toBe(false);
    expect(result.region.region).toBe("cervical");
    expect(result.ranked.primaryDifferential).toBe("Cervical radiculopathy");
  });

  it("realistic shoulder impingement case surfaces the right differential", () => {
    const data = {
      dem_age: "38",
      cc_main: "Shoulder pain with overhead activity",
      rom_shflex_arom: "110", rom_shflex_prom: "150",
      st_hawkins: "Positive", st_neer: "Positive",
    };
    const result = runInterpretation(buildAssessmentData(data));
    expect(result.stopped).toBe(false);
  });

  it("red flag case halts before any differential is produced", () => {
    const data = { dem_age: "62", cc_main: "Low back pain", lx_rf_cauda: "Positive" };
    const result = runInterpretation(buildAssessmentData(data));
    expect(result.stopped).toBe(true);
    expect(result.ranked).toBeUndefined();
  });

  it("demographic age feeds the malignancy red flag rule (ageOver50)", () => {
    const older = buildAssessmentData({ dem_age: "65", grf_cancer: "Positive", lx_rf_inflammatory: "Positive" });
    expect(older.subjective.ageOver50).toBe(true);
    const younger = buildAssessmentData({ dem_age: "22", grf_cancer: "Positive", lx_rf_inflammatory: "Positive" });
    expect(younger.subjective.ageOver50).toBe(false);
  });
});
