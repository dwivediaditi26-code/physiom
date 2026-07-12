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

  // Real-world finding from testing on the live app: running all 15
  // cases back to back occasionally failed a handful of consecutive
  // calls partway through, while the exact same narrative re-run in
  // isolation immediately succeeded -- a transient rate limit, not a
  // logic bug. These tests cover the retry-with-backoff added in
  // response to that.

  test("a transient failure is retried and the case still succeeds", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ age: 30, region: "Cervical spine", flags: [] }) });

    const promise = runOne("test narrative", { label: "retry test" });
    await vi.advanceTimersByTimeAsync(2100); // past the first 2s backoff
    const result = await promise;

    expect(result.error).toBeFalsy();
    expect(result.mapped.region).toBe("Cervical spine");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  test("exhausting all 3 attempts marks the case failed with the real error message", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockRejectedValue(new Error("still rate limited"));

    const promise = runOne("test narrative", { label: "always fails" });
    await vi.advanceTimersByTimeAsync(2100); // 1st retry backoff
    await vi.advanceTimersByTimeAsync(4100); // 2nd retry backoff
    const result = await promise;

    expect(result.error).toBe("still rate limited");
    expect(global.fetch).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  test("a case that exhausts all retries doesn't stop the rest of the 15-case batch", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount <= 3) throw new Error("rate limited"); // all 3 attempts for case 1 fail
      return { ok: true, json: async () => ({ age: 30, region: "Cervical spine", flags: [] }) };
    });

    const promise = runAll();
    await vi.advanceTimersByTimeAsync(120000); // flush every backoff + between-case gap
    const results = await promise;

    expect(results.length).toBe(15);
    expect(results[0].error).toBe("rate limited");
    // Every case after the exhausted one still ran and succeeded
    expect(results.slice(1).every(r => !r.error)).toBe(true);
    vi.useRealTimers();
  }, 15000);
});
