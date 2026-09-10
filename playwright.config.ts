import { defineConfig, devices } from '@playwright/test';

// E2E config. Runs against a real, disposable Supabase TEST project (never
// production) -- see e2e/README.md for how that's wired up. Locally this
// starts `vite preview` against whatever VITE_SUPABASE_URL/ANON_KEY are set
// in your shell; in CI, the workflow builds the app against the test
// project's env vars first, then starts preview against that build.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Tried bumping this to 4 (ubuntu-latest has 4 vCPUs) to fix the 45-min
  // job timeout routinely cancelling the suite mid-run (PR #36/#37) -- that
  // made things worse, not better: 4 parallel Chrome instances overloaded
  // the single shared `vite preview` server, and ~108/114 tests failed on
  // "Start Assessment button not visible within 25s" (a resource-
  // contention symptom, not a real regression -- 2 workers never showed
  // failures like this, only ran out of time). Back to 2; the timeout
  // fix belongs in the workflow's job timeout-minutes instead.
  workers: process.env.CI ? 2 : undefined,
  // Per-test timeout (Playwright's own default is 30s). The cross-device
  // spec waits up to 45s for a real cloud-save round-trip to a disposable,
  // often-dormant free-tier Supabase project (cold-start latency on the
  // first query after inactivity) -- without raising this, that wait would
  // get killed by the test-level timeout before it ever got a chance to
  // resolve, regardless of the assertion's own {timeout} option.
  timeout: 90_000,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
