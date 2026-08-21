import { test, expect, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login, creds, openSoap } from './appMap';

// e2e/load-concurrency.spec.ts
//
// Concurrency/load check: simulates N students logged into their own
// accounts, each creating a patient, recording a finding, and opening the
// SOAP note AT THE SAME TIME. This is the scenario the regular E2E
// suite never exercises -- every other spec runs one browser context at a
// time. What this is trying to catch: Supabase connection/throughput
// limits, RLS contention, or UI race conditions that only show up under
// real concurrent writes -- not correctness of any single flow (that's
// what patient-journey.spec.ts already covers).
//
// Deliberately NOT signing up N new accounts concurrently: Supabase's own
// Auth (GoTrue) rate-limits sign-ups per IP, and every context in this test
// runs from the same GitHub Actions runner IP -- N simultaneous sign-ups
// would likely trip THAT limit first and tell us nothing about our own
// app. Real students also don't all sign up in the same second; they log
// into existing accounts, which is what actually needs to hold up under
// load. So: ONE pre-existing account (same E2E_EMAIL/E2E_PASSWORD the rest
// of this suite already uses -- see e2e.yml), logged into N times
// concurrently, each session creating its own distinct patient.
//
// Runs against the disposable TEST Supabase project only (see
// e2e/README.md) -- same as the rest of this suite, never production.
// Tagged @load and excluded from the default e2e.yml run (see that
// file's --grep-invert) since it's heavier and not something every PR
// needs to pay for -- it has its own workflow, load-test.yml, run manually.
//
// Concurrency count is configurable via LOAD_CONCURRENCY (a
// workflow_dispatch input in load-test.yml) -- default kept modest (15)
// because each concurrent "student" is a real Chromium browser context
// rendering the full React app, and GitHub's standard ubuntu-latest runner
// has 7GB RAM. 15 is a reasonable starting point; raise gradually once a
// run at this level is clean rather than jumping straight to 100.

const N = parseInt(process.env.LOAD_CONCURRENCY || '15', 10);
const MIN_SUCCESS_RATE = parseFloat(process.env.LOAD_MIN_SUCCESS_RATE || '0.9');

interface RunResult {
  index: number;
  ok: boolean;
  ms: number;
  error?: string;
}

async function oneStudentFlow(browser: Browser, index: number): Promise<RunResult> {
  const started = Date.now();
  const context = await browser.newContext();
  const page = await context.newPage();
  const patientName = `Load Test Patient ${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`;

  // Track the actual Supabase auth network response so a login failure
  // reports WHY (e.g. a 429 from Supabase's own sign-in rate limit) instead
  // of just "the button never appeared". That distinction matters: a 429 is
  // a real backend limit worth acting on (raise it / spread logins / Pro
  // tier); a timeout with no error response at all is more likely this CI
  // runner running out of CPU/RAM trying to render N real browsers at once
  // -- a test-harness ceiling, not something real students on their own
  // devices would hit. First real 50-concurrency run (2026-08-11) hit this
  // exact ambiguity: 29/50 failed, all timing out waiting for the
  // post-login UI with no other signal -- this is what's needed to tell
  // those two apart on the next run.
  let lastAuthStatus: number | null = null;
  let lastAuthBody: string | null = null;
  let lastNetworkError: string | null = null;
  page.on('response', async (res) => {
    if (res.url().includes('/auth/v1/token')) {
      lastAuthStatus = res.status();
      if (res.status() >= 400) {
        lastAuthBody = (await res.text().catch(() => null))?.slice(0, 300) ?? null;
      }
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('/auth/v1/token')) {
      lastNetworkError = req.failure()?.errorText ?? 'unknown network failure';
    }
  });

  try {
    await login(page);

    const sidebar = page.locator('.pm-sidebar');
    await expect(sidebar.getByText('New Patient', { exact: false })).toBeVisible({ timeout: 15_000 });
    await sidebar.getByText('New Patient', { exact: false }).click();

    const intake = page.getByTestId('intake-modal');
    await intake.getByPlaceholder('e.g. Riya Sharma').fill(patientName);
    await intake.getByRole('button', { name: 'Consent', exact: true }).click();
    await intake.getByRole('checkbox', { name: 'I consent to physiotherapy assessment and treatment' }).check();
    await intake.getByRole('button', { name: 'Start Assessment →' }).click();
    await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    // Record one real finding (MMT) -- exercises an actual Supabase write,
    // not just navigation.
    await sidebar.getByText('MMT', { exact: true }).click();
    await expect(page.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('select.pm-compact-select').first().selectOption('5');

    // Open the SOAP note -- confirms the finding actually reads back
    // (not just that the write request was fired) under concurrent load.
    await openSoap(page);
    const soapBody = await page.locator('body').innerText();
    if (soapBody.length < 50 || /Something went wrong/i.test(soapBody)) {
      throw new Error(`SOAP note looked empty or crashed (len=${soapBody.length})`);
    }

    return { index, ok: true, ms: Date.now() - started };
  } catch (e: any) {
    const authInfo = lastNetworkError
      ? ` [auth request failed: ${lastNetworkError}]`
      : lastAuthStatus !== null
        ? ` [last auth response: ${lastAuthStatus}${lastAuthBody ? ' -- ' + lastAuthBody : ''}]`
        : ' [no auth network activity observed -- likely never got past a prior step]';
    return { index, ok: false, ms: Date.now() - started, error: (String(e?.message || e).slice(0, 300) + authInfo) };
  } finally {
    await context.close().catch(() => {});
  }
}

test.describe('Load / concurrency @load', () => {
  // Override the suite-wide retries:2 (playwright.config.ts) -- a failed
  // load-test run is real data, not flakiness to retry past. Retrying
  // immediately re-fires the exact same N-concurrent-login flood right
  // after the first attempt failed; if the cause is a real rate limit on
  // Supabase's side, the retry likely hits while that window hasn't reset
  // yet, stacking multiple punishing runs back to back and muddying the
  // result instead of confirming it. (First real 50-run, 2026-08-11: 3
  // attempts back to back, 40-48% each time -- consistent, but 3x the CI
  // time for one data point.)
  test.describe.configure({ retries: 0 });

  test(`${N} students creating a patient + recording a finding + opening the SOAP note at the same time`, async ({ browser }) => {
    test.setTimeout(Math.max(120_000, N * 4000));
    const { email } = creds();
    expect(email, 'Put E2E_EMAIL/E2E_PASSWORD (or e2e/login.local.json) in place -- load test reuses the existing E2E test account').not.toBe('');

    const results = await Promise.all(
      Array.from({ length: N }, (_, i) => oneStudentFlow(browser, i))
    );

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    const durations = results.map(r => r.ms).sort((a, b) => a - b);
    const avgMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const p95Ms = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1];
    const successRate = succeeded.length / results.length;

    const summary = {
      ranAt: new Date().toISOString(),
      concurrency: N,
      succeeded: succeeded.length,
      failed: failed.length,
      successRate,
      avgMs,
      p95Ms,
      errors: failed.map(f => ({ index: f.index, ms: f.ms, error: f.error })),
    };

    fs.writeFileSync(path.join(process.cwd(), 'load-test-summary.json'), JSON.stringify(summary, null, 2));
    console.log('Load test summary:', JSON.stringify(summary, null, 2));

    expect(
      successRate,
      `Only ${succeeded.length}/${results.length} concurrent flows succeeded. See load-test-summary.json / errors above for what broke (auth, Supabase connection limits, RLS, or a UI race).`
    ).toBeGreaterThanOrEqual(MIN_SUCCESS_RATE);
  });
});
