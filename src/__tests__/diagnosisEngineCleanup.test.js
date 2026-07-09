// diagnosisEngineCleanup.test.js
// Regression guard: DiagnosisEngine.js's old suggestion engine
// (runDiagnosisEngine, runNeuroPatternEngine, runFunctionalScreenEngine,
// runOutcomeMeasureEngine, getTopDiagnoses, getTopDiagnosesEnhanced) was
// removed when src/interpretationEngine/ took over "Suggested Clinical
// Diagnoses" in SOAP Notes' Assessment tab -- none of those functions were
// used anywhere else in the app. ALL_DIAGNOSES stays because the manual
// Provisional Diagnosis dropdown picker still depends on it independently.
import { describe, it, expect } from "vitest";
import * as DiagnosisEngine from "../DiagnosisEngine.js";

describe("DiagnosisEngine.js — trimmed to ALL_DIAGNOSES only", () => {
  it("still exports ALL_DIAGNOSES with real content", () => {
    expect(Array.isArray(DiagnosisEngine.ALL_DIAGNOSES)).toBe(true);
    expect(DiagnosisEngine.ALL_DIAGNOSES.length).toBeGreaterThan(50);
    expect(DiagnosisEngine.ALL_DIAGNOSES).toContain("Rotator Cuff Tear (Supraspinatus)");
  });

  it("no longer exports the removed suggestion-engine functions", () => {
    expect(DiagnosisEngine.runDiagnosisEngine).toBeUndefined();
    expect(DiagnosisEngine.getTopDiagnoses).toBeUndefined();
    expect(DiagnosisEngine.getTopDiagnosesEnhanced).toBeUndefined();
    expect(DiagnosisEngine.runNeuroPatternEngine).toBeUndefined();
    expect(DiagnosisEngine.runFunctionalScreenEngine).toBeUndefined();
    expect(DiagnosisEngine.runOutcomeMeasureEngine).toBeUndefined();
  });
});
