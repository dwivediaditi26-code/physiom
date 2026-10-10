import { test, expect } from '@playwright/test';
import {
  signUp, startOrtho, fillDemographics, fillChiefComplaint, goToStep, saveAssessment,
  expectPatientListed, uniqueSuffix,
} from './appMap';

// Medical-record files live inside the patient record. The copy kept on the phone used to be
// written to localStorage (about 5 MB for everything), so a few attached documents filled it and
// the copy silently was not saved: every start then waited for all patients to download again.
// Here two documents totalling more than 5 MB are attached, then the page is reloaded with the
// patients unreachable in the cloud (a weak connection): the patient must still be listed, from
// the copy on the phone.
//
// Real account on the disposable TEST Supabase project only (see e2e/README.md).

test.describe('Saved copy with documents attached', () => {
  test('still opens from the phone after a reload when documents add up to more than 5 MB', async ({ page, context }) => {
    test.setTimeout(120_000);
    const unique = uniqueSuffix();
    const name = `E2E Documents ${unique}`;
    await signUp(page, { name: 'E2E Documents', email: `e2e-docs-${unique}@physiomind-test.dev`, password: 'TestPass123!' });
    await startOrtho(page, { name, region: 'Knee', side: 'Right' });
    await fillDemographics(page, { name, age: 40, sex: 'Female' });
    await fillChiefComplaint(page, `E2E-${unique} documents`);

    await goToStep(page, 'Medical Records');
    const twoMb = 2.2 * 1024 * 1024;
    await page.locator('input[type="file"]:not([capture])').setInputFiles([
      { name: 'scan-one.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(twoMb, 'a') },
      { name: 'scan-two.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(twoMb, 'b') },
    ]);
    await expect(page.getByText('scan-two.pdf').first()).toBeVisible({ timeout: 30_000 });
    await saveAssessment(page);
    await expectPatientListed(page, name);
    await page.waitForTimeout(1500); // let the copy on the phone be written

    // A weak connection: reading patients from the cloud never answers.
    await context.route('**/rest/v1/patients*', (route) => (route.request().method() === 'GET' ? route.abort() : route.continue()));
    await page.reload();
    await expectPatientListed(page, name, 30_000);
    // The documents are in the copy too (an older, smaller copy would list the patient but not the files).
    await page.getByText(/👤\s*Profile/).first().dispatchEvent('click'); // the open patient's profile
    await page.getByRole('button', { name: /^Docs$/ }).click();
    await expect(page.getByText('scan-two.pdf').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('scan-one.pdf').first()).toBeVisible();
  });
});
