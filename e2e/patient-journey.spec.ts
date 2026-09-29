import { test, expect } from '@playwright/test';
import {
  signUp, startOrtho, fillDemographics, fillChiefComplaint, goToStep, saveAssessment,
  expectPatientListed, expectHome, noCrash, uniqueSuffix,
} from './appMap';

// Full patient journey with a REAL account: the one path where cloud sync
// matters. Sign up -> start an Ortho assessment -> record findings -> save ->
// the patient is in the list -> reload the page (the login and the patient
// are still there, i.e. they came back from Supabase, not just from memory).
//
// IMPORTANT: this must run against a disposable TEST Supabase project, never
// production -- see e2e/README.md for how that is wired (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY at build time). The test project's Auth settings
// must have "Confirm email" turned OFF, otherwise signUp() never returns a
// session and there is no way to click an email link in CI.
//
// The screens themselves are covered without any account by the guest specs
// (guest-journey, ortho-steps, regions, neuro-cardio, ortho-cases); this file
// only adds what needs a real account.

test.describe('Full patient journey (real account)', () => {
  test('sign up, record an Ortho assessment, save it, and find the patient again after a reload', async ({ page }) => {
    const unique = uniqueSuffix();
    const email = `e2e-${unique}@physiomind-test.dev`;
    const password = 'TestPass123!';
    const patientName = `E2E Test Patient ${unique}`;
    const marker = `E2E-${unique} knee pain for 3 weeks`;

    await signUp(page, { name: 'E2E Runner', email, password });

    await startOrtho(page, { name: patientName, region: 'Knee', side: 'Right' });
    await fillDemographics(page, { name: patientName, age: 41, sex: 'Female' });
    await fillChiefComplaint(page, marker);

    // MMT: a 4/5 for the first muscle's left side.
    await goToStep(page, 'MMT');
    await page.locator('select').first().selectOption('4');

    await goToStep(page, 'Final Review');
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText(/L 4\/5/)).toBeVisible();

    await saveAssessment(page);
    await expectPatientListed(page, patientName);

    // The patient must have reached the cloud: after a reload the account is
    // still signed in and the patient is still listed.
    await page.reload();
    await expectHome(page);
    await expectPatientListed(page, patientName, 30_000);
    await noCrash(page);
  });
});
