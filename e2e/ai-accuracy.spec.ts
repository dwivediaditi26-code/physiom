// ai-accuracy.spec.ts — @ai-accuracy
//
// Real-Groq accuracy check for the AI intake pipeline. Unlike every other
// e2e/*.spec.ts file, this makes REAL calls to a REAL deployed instance's
// /api/parse -> real Groq -> real region/field extraction. It costs Groq
// tokens and is non-deterministic (LLM output varies run to run), so it is
// DELIBERATELY EXCLUDED from the default suite (see e2e.yml's
// --grep-invert) and runs only via the separate ai-accuracy.yml workflow
// (nightly + manual dispatch), against a live URL (no local build / no
// Supabase test project needed -- see below).
//
// Reuses window.physioAITest -- installed unconditionally at app boot by
// installAiIntakeTestHarness() in src/main.jsx, BEFORE login, and touching
// no Supabase/patient record (confirmed by reading aiIntakeTestHarness.js:
// each case is an in-memory sandbox object; nothing is saved) -- rather
// than reimplementing its 15 built-in cases or scoring logic here.
//
// Metric: region-detection accuracy (does the AI correctly identify which
// body region a free-text narrative describes?), scored against a
// threshold rather than asserted per-case. The model is probabilistic --
// one borderline case flipping run to run is expected noise, not a
// regression. A sustained drop below threshold is the real signal (prompt
// drift, model swap, Groq-side change) worth failing loudly for.
//
// Separately, ANY case that hard-errors calling the real pipeline (bad
// key, Groq outage, malformed response -- see callParseOnce's error
// handling in aiIntakeTestHarness.js) is always a hard fail: that's a
// pipeline break, not a wrong-but-valid guess.

import { test, expect } from "@playwright/test";

const ACCURACY_THRESHOLD = 0.8; // 12/15 -- tune upward once a real baseline run establishes what's normal

type HarnessResult = {
  id?: string;
  label: string;
  narrative: string;
  expectedRegion: string | null;
  error: string | null;
  mapped: { region: string | null; updates: Record<string, unknown>; redFlagsToReview: unknown[] } | null;
};

test("@ai-accuracy real Groq intake pipeline scores across built-in cases", async ({ page }) => {
  test.setTimeout(5 * 60_000); // 15 real sequential API calls, each with up to 3 retries + backoff

  await page.goto("/");
  // window.physioAITest attaches at module load (src/main.jsx), before
  // React even mounts -- wait for it defensively anyway.
  await page.waitForFunction(() => Boolean((window as any).physioAITest?.runAll), { timeout: 15_000 });

  const results: HarnessResult[] = await page.evaluate(async () => {
    // @ts-ignore -- window.physioAITest is installed at runtime by src/main.jsx, not typed
    return await window.physioAITest.runAll();
  });

  const errored = results.filter((r) => r.error);
  const scored = results.filter((r) => r.expectedRegion && !r.error);
  const correct = scored.filter((r) => r.mapped?.region === r.expectedRegion);
  const accuracy = scored.length ? correct.length / scored.length : 0;

  const summary = results.map((r) => ({
    case: r.label,
    expected: r.expectedRegion,
    detected: r.mapped?.region ?? null,
    match: r.expectedRegion ? r.mapped?.region === r.expectedRegion : null,
    error: r.error,
  }));

  await test.info().attach("ai-accuracy-summary.json", {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });

  console.log(`Region-detection accuracy: ${correct.length}/${scored.length} (${(accuracy * 100).toFixed(0)}%)`);
  const misses = summary.filter((s) => s.match === false);
  if (misses.length) {
    console.log(
      "Misses:",
      misses.map((m) => `${m.case}: expected ${m.expected}, got ${m.detected ?? "(none)"}`)
    );
  }
  if (errored.length) {
    console.log(
      `${errored.length} case(s) errored calling the real pipeline (not scored toward accuracy):`,
      errored.map((e) => `${e.label}: ${e.error}`)
    );
  }

  expect(
    errored.length,
    `${errored.length} case(s) errored calling the real pipeline: ${errored.map((e) => e.label).join(", ")}`
  ).toBe(0);

  expect(
    accuracy,
    `Region-detection accuracy ${(accuracy * 100).toFixed(0)}% (${correct.length}/${scored.length}) fell below the ${ACCURACY_THRESHOLD * 100}% threshold. See the ai-accuracy-summary.json attachment for per-case detail.`
  ).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
});
