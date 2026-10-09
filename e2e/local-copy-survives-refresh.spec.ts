import { test, expect } from '@playwright/test';
import {
  signUp, startOrtho, fillDemographics, fillChiefComplaint, saveAssessment,
  expectPatientListed, expectCloudSaved, trackCloudSaves, uniqueSuffix,
} from './appMap';

// On a weak connection the app must open from the copy saved on the phone, not wait for every
// patient to download again. That copy used to be locked with the sign-in token, which is
// replaced about once an hour, so after a refresh the phone could not open its own copy and the
// patient list stayed empty until the download finished. Here the patients are blocked from the
// cloud after a reload: they must still appear, from the saved copy.
//
// Real account on the disposable TEST Supabase project only (see e2e/README.md).

test.describe('Saved copy on the phone', () => {
  test('opens after a reload even when the patients cannot be downloaded', async ({ page, context }) => {
    test.setTimeout(150_000);
    const unique = uniqueSuffix();
    const name = `E2E Local Copy ${unique}`;
    const saves = trackCloudSaves(page);
    await signUp(page, { name: 'E2E Local Copy', email: `e2e-local-${unique}@physiomind-test.dev`, password: 'TestPass123!' });
    await startOrtho(page, { name, region: 'Knee', side: 'Right' });
    await fillDemographics(page, { name, age: 40, sex: 'Female' });
    await fillChiefComplaint(page, `E2E-${unique} saved copy`);
    await saveAssessment(page);
    await expectCloudSaved(saves);
    await expectPatientListed(page, name);

    // "An hour later": the stored sign-in has run out, so the app gets a NEW token when it opens.
    await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
      if (!k) throw new Error('no stored sign-in found');
      const session = JSON.parse(localStorage.getItem(k) || '{}');
      session.expires_at = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem(k, JSON.stringify(session));
    });
    // A weak connection: reading patients from the cloud never answers.
    await context.route('**/rest/v1/patients*', (route) => route.request().method() === 'GET' ? route.abort() : route.continue());
    await page.reload();
    await expectPatientListed(page, name, 30_000);
  });
});
