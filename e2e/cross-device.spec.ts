import { test, expect } from '@playwright/test';
import {
  signUp, login, startOrtho, fillDemographics, fillChiefComplaint, saveAssessment,
  expectPatientListed, trackCloudSaves, expectCloudSaved, noCrash, uniqueSuffix,
} from './appMap';

// Cross-device sync: a patient saved on "device A" must appear on "device B"
// (a completely separate browser context -- no shared storage, cookies or
// memory) after signing in to the same account. A test that only checks one
// browser session cannot catch a broken cloud save, because everything is
// still in that session's own memory; a second, independent session can.
//
// Real account on the disposable TEST Supabase project only (see
// e2e/README.md). "Confirm email" must be OFF on that project.
//
// Waits are generous on purpose: the free-tier test project is often asleep
// and its first query after a pause can take 20+ seconds.

test.describe('Cross-device sync', () => {
  test('a patient saved on device A shows up on device B after signing in', async ({ browser }) => {
    const unique = uniqueSuffix();
    const account = { name: 'E2E Cross Device', email: `e2e-xdev-${unique}@physiomind-test.dev`, password: 'TestPass123!' };
    const patientName = `E2E Cross Device Patient ${unique}`;

    // ── Device A: sign up, create and save an assessment ──
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const cloudSaves = trackCloudSaves(pageA);
    await signUp(pageA, account);
    await startOrtho(pageA, { name: patientName, region: 'Knee', side: 'Right' });
    await fillDemographics(pageA, { name: patientName, age: 33, sex: 'Male' });
    await fillChiefComplaint(pageA, `E2E-${unique} cross-device check`);
    await saveAssessment(pageA);
    await expectPatientListed(pageA, patientName);
    // The database itself must have accepted the save (a rejected save shows
    // "Offline -- will retry" in the header and never reaches device B).
    await expectCloudSaved(cloudSaves);

    // ── Device B: a brand-new browser context, same account ──
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await login(pageB, { email: account.email, password: account.password });
    await expectPatientListed(pageB, patientName, 45_000);
    await noCrash(pageB);

    await ctxA.close();
    await ctxB.close();
  });
});
