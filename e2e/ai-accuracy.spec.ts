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
// installAiIntakeTestHarness() in src/main.jsx, and touching no
// Supabase/patient record (confirmed by reading aiIntakeTestHarness.js:
// each case is an in-memory sandbox object; nothing is saved) -- rather
// than reimplementing its cases or scoring logic here.
//
// NOTE: /api/parse now requires auth (api/_lib/rateLimit.js, added to stop
// the endpoint being callable by anyone with no login) -- this test signs
// in with a dedicated PRODUCTION QA account (PROD_QA_EMAIL/PROD_QA_PASSWORD
// secrets) before calling the harness. This is deliberately NOT the same
// E2E_EMAIL/E2E_PASSWORD used by e2e.yml -- those log into the disposable
// TEST Supabase project; this needs a real account on PRODUCTION
// (dlauxdokkrqbvbormxte) since that's the project physiom-sbs4.vercel.app
// (this test's target) actually talks to. See the login step below for the
// one-time account setup needed.
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

import { test, expect, type Page } from "@playwright/test";

// CI retries (playwright.config.ts: retries: 2) re-run this ENTIRE test --
// all 15 cases -- from scratch on any failure. The harness already retries
// each individual case up to 3x with backoff (aiIntakeTestHarness.js's
// callParse), so an outer full-test retry doesn't add resilience, it just
// triples the real Groq call volume in a short window. First real run hit
// 11-13/15 errors, worse than the "occasional handful" the harness's own
// comments describe -- consistent with this test's own retries stacking
// with the harness's internal retries and compounding a rate limit, not a
// genuine 73-87% pipeline failure rate. Disabling retry here isolates the
// true single-pass error rate before tuning anything else.
test.describe.configure({ retries: 0 });

const ACCURACY_THRESHOLD = 0.8; // 12/15 -- tune upward once a real baseline run establishes what's normal

// Real root cause (confirmed via an actual failed run, not guessed): Groq
// rate-limits this org's `openai/gpt-oss-120b` key at 8000 TPM on the
// on_demand tier. api/parse.js's system prompt is large (~24KB source,
// mostly prompt text) with max_completion_tokens: 3000 -- a single real
// call can plausibly consume most of that 8000/min budget by itself. The
// harness's own runAll() paces cases only 600ms apart, which is nowhere
// near enough headroom and reliably triggers 429s under any back-to-back
// run (12/15 cases errored on a clean single-pass run with zero outer
// retries -- this is a hard ceiling, not occasional flakiness).
//
// This is bigger than this test: it means the REAL APP can likely sustain
// only ~1 AI-intake submission/minute across ALL concurrent users before
// others start seeing failures -- a genuine capacity risk for 100+
// students, separate from and more urgent than this accuracy check
// passing. Flagged to the user; not something this test can or should
// paper over.
//
// Fix here: drive runOne() ourselves in a loop (also exported on
// window.physioAITest) instead of runAll(), with a TPM-safe ~65s gap
// between calls, rather than editing the shared harness's pacing (that
// file backs a real manual dev tool too -- changing its behavior for
// everyone belongs in its own deliberate change, not as a side effect of
// this test).
const CALL_GAP_MS = 65_000;

type HarnessResult = {
  id?: string;
  label: string;
  narrative: string;
  expectedRegion: string | null;
  error: string | null;
  mapped: { region: string | null; updates: Record<string, unknown>; redFlagsToReview: unknown[] } | null;
};

// One-time setup needed before this passes: create a QA account on the
// PRODUCTION Supabase project (dlauxdokkrqbvbormxte) -- Dashboard ->
// Authentication -> Users -> Add user -> turn "Auto Confirm User" ON (so no
// confirmation email blocks login) -- then add its email/password as repo
// secrets PROD_QA_EMAIL / PROD_QA_PASSWORD (Settings -> Secrets and
// variables -> Actions -> New repository secret). Do NOT reuse a real
// student/patient-bearing account here.
async function loginToProd(page: Page) {
  const email = process.env.PROD_QA_EMAIL || "";
  const password = process.env.PROD_QA_PASSWORD || "";
  expect(
    email && password,
    "Set PROD_QA_EMAIL / PROD_QA_PASSWORD repo secrets -- a dedicated account on the PRODUCTION Supabase project, not the disposable e2e test project E2E_EMAIL/E2E_PASSWORD points at elsewhere. See the comment above loginToProd() for the one-time setup steps."
  ).toBeTruthy();

  await page.getByRole("textbox", { name: "you@clinic.com" }).fill(email);
  await page.getByRole("textbox", { name: "••••••••" }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  // Wait for the login form to clear rather than asserting a specific
  // post-login screen -- this account may or may not have completed
  // onboarding, and either way all we actually need is an authenticated
  // Supabase session for authHeader() to pick up.
  await page.waitForFunction(() => !document.querySelector('input[placeholder="you@clinic.com"]'), { timeout: 20_000 }).catch(() => {});
}

test("@ai-accuracy real Groq intake pipeline scores across built-in + extended cases", async ({ page }) => {
  // 31 cases (15 original + 16 EXTRA_CASES -- confusable pairs, extra red
  // flags, under-represented regions, hedged mechanism, multi-region) *
  // ~65s TPM-safe gap + call time + the harness's own internal per-case
  // retry/backoff on top of any residual 429 => needs real room.
  //
  // 40min was NOT enough in practice: a real run hit "Test timeout of
  // 2400000ms exceeded" with the browser forcibly closed mid-run (reported
  // "Slow test file: 42.0m" -- it needed more than 40, not less). 30 gaps *
  // 65s alone is 32.5min before any actual call latency or internal
  // retry/backoff is added, so 40min left almost no slack. This is a
  // nightly job with no reason to be stingy on time -- generous ceiling.
  test.setTimeout(55 * 60_000);

  await page.goto("/");
  await loginToProd(page); // /api/parse now requires a valid session -- see api/_lib/rateLimit.js
  // window.physioAITest attaches at module load (src/main.jsx), before
  // React even mounts -- wait for it defensively anyway.
  await page.waitForFunction(
    () => Boolean((window as any).physioAITest?.runOne && (window as any).physioAITest?.CASES && (window as any).physioAITest?.EXTRA_CASES),
    { timeout: 15_000 }
  );

  const results: HarnessResult[] = await page.evaluate(async (gapMs) => {
    // @ts-ignore -- window.physioAITest is installed at runtime by src/main.jsx, not typed
    const { runOne, CASES, EXTRA_CASES } = window.physioAITest;
    const allCases = [...CASES, ...EXTRA_CASES];
    const out = [];
    for (let i = 0; i < allCases.length; i++) {
      out.push(await runOne(allCases[i].narrative, allCases[i]));
      if (i < allCases.length - 1) await new Promise((r) => setTimeout(r, gapMs)); // no trailing wait after the last case
    }
    return out;
  }, CALL_GAP_MS);

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

  // Embed the ACTUAL error text (not just case labels) directly in the
  // assertion message -- the separate ai-accuracy-summary.json attachment
  // has the full detail, but it's proven awkward to locate in the GitHub
  // Actions UI; putting a truncated error inline means whatever gets
  // pasted/screenshotted from the failure already has the real diagnostic.
  expect(
    errored.length,
    `${errored.length} case(s) errored calling the real pipeline:\n` +
      errored.map((e) => `  - ${e.label}: ${(e.error || "(no message)").slice(0, 200)}`).join("\n")
  ).toBe(0);

  expect(
    accuracy,
    `Region-detection accuracy ${(accuracy * 100).toFixed(0)}% (${correct.length}/${scored.length}) fell below the ${ACCURACY_THRESHOLD * 100}% threshold. See the ai-accuracy-summary.json attachment for per-case detail.`
  ).toBeGreaterThanOrEqual(ACCURACY_THRESHOLD);
});
