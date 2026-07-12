// Verifies the on-demand console test harness (aiIntakeTestHarness.js)
// that physioAITest.runAll() / runOne() expose in the browser console.
// This tool makes real network calls to /api/parse when actually used on
// the live app; here fetch is mocked so the test suite doesn't hit the
// real Groq API, but every other part of the pipeline it drives --
// mapping, the real interpretation engine, the real SOAP generator -- is
// the genuine production code, imported the same way the harness
// imports it (through the app's existing lazy wrapper files, not a
// second, different import path that would defeat code-splitting).

import { describe, test, expect, vi, beforeEach } from "vitest";
import { installAiIntakeTestHarness, runOne, runAll, CASES } from "../aiIntakeTestHarness.js";

describe("AI intake console test harness", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test("installs window.physioAITest with runAll, runOne, and the 15 built-in cases", () => {
    installAiIntakeTestHarness();
    expect(window.physioAITest).toBeTruthy();
    expect(typeof window.physioAITest.runAll).toBe("function");
    expect(typeof window.physioAITest.runOne).toBe("function");
    expect(window.physioAITest.CASES.length).toBe(15);
  });

  test("exactly 5 fracture, 5 lumbar, and 5 other cases, all with real narratives", () => {
    expect(CASES.filter(c => c.id.startsWith("fx")).length).toBe(5);
    expect(CASES.filter(c => c.id.startsWith("lx")).length).toBe(5);
    expect(CASES.filter(c => c.id.startsWith("ot")).length).toBe(5);
    CASES.forEach(c => {
      expect(c.narrative.length).toBeGreaterThan(20);
      expect(c.expectedRegion).toBeTruthy();
    });
  });

  test("runOne drives the real pipeline: parse -> map -> interpretation -> SOAP", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        age: 45, sex: "Male", occupation: "Warehouse worker", region: "Lumbar / SI", laterality: "Left",
        duration: "< 1 week (hyperacute)", onset: "Lifting injury", nrsNow: 6, nrsWorst: 9, nrsBest: 3,
        painQuality: ["Sharp"], aggMovements: ["Bending"], aggActivities: ["Lifting"],
        relMovements: ["Lying flat"], hasRadiation: true, radiationSide: "Left", radiationArea: "Left leg",
        neuroSymptoms: ["Shooting pain"], flags: ["Difficulty initiating urination -- screen for cauda equina"],
      }),
    });

    const result = await runOne("38 year old, hurt his back lifting, pain down the left leg", { label: "test case", expectedRegion: "Lumbar / SI" });

    expect(result.error).toBeFalsy();
    expect(result.mapped.region).toBe("Lumbar / SI");
    expect(result.mapped.updates.dem_age).toBe("45");
    expect(result.mapped.redFlagsToReview.length).toBe(1);
    // Interpretation engine actually ran on the mapped data
    expect(result.interpretation).toBeTruthy();
    expect(result.interpretation.regionResults.length).toBe(1);
    expect(result.interpretation.regionResults[0].region).toBe("Lumbar / SI");
    // Real SOAP text was generated from the same data
    expect(result.soap).toBeTruthy();
    expect(typeof result.soap.S).toBe("string");
    expect(typeof result.soap.O).toBe("string");
  });

  test("a failed case doesn't stop the rest of the batch", async () => {
    global.fetch
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ age: 30, region: "Cervical spine", flags: [] }),
      });

    const results = await runAll();
    expect(results.length).toBe(15);
    expect(results[0].error).toBe("network down");
    // Every case after the failure still ran
    expect(results[1].error).toBeFalsy();
  }, 20000);
});
