// ortho-cases.spec.ts — 10 SYNTHETIC orthopedic patients through the Ortho
// assessment, on both the desktop (chromium) and phone (mobile-chrome)
// projects in playwright.config.ts.
//
// For each case: start an Ortho General Assessment for the case's region and
// side -> Demographics (name, age, sex) -> Subjective (chief complaint) ->
// open the Clinical Assessment step -> Final Review -> Save -> the patient
// shows in Clinical -> Patients.
//
// Guest mode: nothing reaches any database, so no account or secrets are
// needed and it can never leave test patients behind.
//
// Hard checks (must pass): every screen opens without a crash, the chief
// complaint carries through to Final Review, saving works, the patient is
// listed. Soft check (reported, never failing): whether the Clinical
// Assessment step mentions something matching the case's expected
// impression -- with only a chief complaint typed in, the differential has
// little to go on, so this is information, not a verdict. It shows up in the
// test report as an annotation.

import { test, expect } from "@playwright/test";
import { ORTHO_CASES } from "./ortho-cases.fixtures";
import {
  enterGuestMode, startOrtho, fillDemographics, fillChiefComplaint, goToStep, saveAssessment,
  expectPatientListed, noCrash, uniqueSuffix,
} from "./appMap";

test.describe("Ortho case library (10 synthetic cases) @cases", () => {
  for (const c of ORTHO_CASES) {
    test(`${c.id} (${c.diagnosis}): demographics -> complaint -> review -> save -> listed`, async ({ page }) => {
      const name = `E2E ORTHO DELETE ME — ${c.id} ${uniqueSuffix()}`;

      await enterGuestMode(page);
      await startOrtho(page, { name, region: c.region, side: c.side });
      await fillDemographics(page, { name, age: c.age, sex: c.gender });
      await fillChiefComplaint(page, c.chiefComplaint);

      // Soft check: does the clinical assessment mention the expected condition?
      await goToStep(page, "Clinical Assessment");
      await noCrash(page);
      const clinicalText = await page.locator("body").innerText();
      test.info().annotations.push({
        type: "impression",
        description: `${c.diagnosis}: ${c.expectImpression.test(clinicalText) ? "expected wording found" : "expected wording NOT found (informational)"}`,
      });

      await goToStep(page, "Final Review");
      await expect(page.getByText(c.chiefComplaint)).toBeVisible();

      await saveAssessment(page);
      await expectPatientListed(page, name);
      await noCrash(page);
    });
  }
});
