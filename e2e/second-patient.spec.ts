import { test, expect } from '@playwright/test';
import {
  signUp, startOrtho, fillDemographics, fillChiefComplaint, saveAssessment,
  expectPatientListed, startNewAssessment, noCrash, uniqueSuffix,
} from './appMap';

// A second patient, started in the same sitting as the first, must be a clean new
// record. It used to open the FIRST patient's finished assessment (the screen was kept
// alive in the background), and the patient list then showed both records under the
// first patient's name. Real students enter patient after patient without reloading.

test.describe('Second patient in the same sitting', () => {
  test('starts clean and keeps its own name and answers', async ({ page }) => {
    test.setTimeout(180_000);
    const unique = uniqueSuffix();
    const first = `E2E Second First ${unique}`;
    const second = `E2E Second Second ${unique}`;
    await signUp(page, { name: 'E2E Second Patient', email: `e2e-second-${unique}@physiomind-test.dev`, password: 'TestPass123!' });

    await startOrtho(page, { name: first, region: 'Knee', side: 'Right' });
    await fillDemographics(page, { name: first, age: 40, sex: 'Female' });
    await fillChiefComplaint(page, `first-patient-complaint-${unique}`);
    await saveAssessment(page);
    await expectPatientListed(page, first);

    // Start the second patient the normal way: Clinical -> Assess -> New Assessment.
    await startOrtho(page, { name: second, region: 'Knee', side: 'Right' });
    await expect(page.getByText(/Step 1\/\d+/)).toBeVisible();
    // The new record must not show anything from the first patient.
    await expect(page.getByText(first).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText(`first-patient-complaint-${unique}`).filter({ visible: true })).toHaveCount(0);
    await fillDemographics(page, { name: second, age: 55, sex: 'Male' });
    await fillChiefComplaint(page, `second-patient-complaint-${unique}`);
    await saveAssessment(page);

    // Both patients exist, each under their own name. (Before the fix the second patient
    // came out with the first one's name, so the second name was nowhere on screen.)
    await expectPatientListed(page, second);
    await expect(page.getByText(first).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(second).filter({ visible: true }).first()).toBeVisible();
    await noCrash(page);
  });
});
