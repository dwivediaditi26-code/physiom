import { test, expect } from '@playwright/test';

// Full patient-journey smoke test -- the one thing that has never been
// verified by actually clicking through the real app in a real browser.
// Every prior fix this project has had was verified by source-code-level
// review + component tests (Vitest/RTL), which is real but not the same as
// "does this work when a person does it". This closes that gap for the
// single highest-value path: sign up -> create a patient -> record a real
// finding -> see it in the SOAP note -> sign the note.
//
// IMPORTANT: this must run against a disposable TEST Supabase project, never
// production -- see e2e/README.md for how that's wired (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY at build time). The test project's Auth settings
// must have "Confirm email" turned OFF, otherwise signUp() never returns a
// session and there's no way to click an email confirmation link in CI.
//
// Desktop-only for now: mobile uses a different bottom-sheet navigation
// (pm-bnav-*) that hasn't been mapped out here yet and deserves its own spec
// rather than guessing at untested selectors.

test.describe('Full patient journey', () => {
  test.skip(({ isMobile }) => isMobile, 'Mobile uses a different bottom-nav UI -- needs its own spec');

  test('sign up, create a patient, record an MMT finding, see it in the signed SOAP note', async ({ page }) => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-${unique}@physiomind-test.dev`;
    const password = 'TestPass123!';
    const patientName = `E2E Test Patient ${unique}`;

    await page.goto('/');

    // ── Sign up (test project must have email confirmation OFF) ──
    await page.getByRole('button', { name: 'Create free account' }).click();
    await page.getByPlaceholder('Dr. Aditi').fill('E2E Runner');
    await page.getByPlaceholder('you@clinic.com').fill(email);
    await page.getByPlaceholder('Create a strong password').fill(password);
    await page.getByRole('button', { name: 'Create free account →' }).click();

    // ── Land in the app. A first-time onboarding modal covers everything
    // on a brand-new account (localStorage has no "pm_onboarded" flag yet in
    // a fresh browser context) -- it also contains its own "New Patient"
    // text in one of its steps, so it must be dismissed before anything else
    // or the later text match becomes ambiguous.
    await page.getByRole('button', { name: 'Skip tour' }).click();

    // ── Create a patient via the intake form ──
    await expect(page.getByText('New Patient', { exact: false })).toBeVisible({ timeout: 10_000 });
    await page.getByText('New Patient', { exact: false }).click();
    await page.getByPlaceholder('e.g. Riya Sharma').fill(patientName);
    await page.getByRole('button', { name: 'Consent' }).click();
    await page.getByText('I consent to physiotherapy assessment and treatment').click();
    await page.getByRole('button', { name: 'Start Assessment →' }).click();

    // Intake auto-navigates to Subjective -- confirms the patient record
    // was actually created, not just the modal closing.
    await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    // ── Record a real MMT finding ──
    await page.getByText('MMT', { exact: true }).click();
    await expect(page.getByText('Sternocleidomastoid')).toBeVisible({ timeout: 10_000 });
    // First muscle card's Left grade select -- grade "5" (Normal).
    await page.locator('select.pm-compact-select').first().selectOption('5');

    // ── Open SOAP Notes (Documentation group is collapsed by default) ──
    await page.getByText('Documentation', { exact: true }).click();
    await page.getByText('SOAP Notes', { exact: true }).click();

    // The MMT finding just recorded should be visible somewhere in the
    // Objective section of the real, rendered SOAP screen.
    await expect(page.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 10_000 });

    // ── Sign and lock the note (two-step confirm) ──
    await page.getByRole('button', { name: 'Sign & lock note' }).click();
    await page.getByRole('button', { name: 'Confirm sign & lock' }).click();
    await expect(page.getByText('Note signed and locked successfully')).toBeVisible({ timeout: 10_000 });
  });
});
