import { test, expect } from "@playwright/test";
import {
  enterGuestMode, expectHome, openClinical, openClinicalTab, startOrtho, fillDemographics,
  fillChiefComplaint, goToStep, saveAssessment, expectPatientListed, noCrash, uniqueSuffix,
} from "./appMap";

// Guest-mode journey -- the real app with no account, so it needs no
// Supabase project and no secrets and can run anywhere (every pull request,
// your own laptop). Nothing a guest does reaches the database, which also
// means it cannot make a mess in any real account.
//
// What it proves, in the words of a physio using the app: I can open
// Clinical, start an Ortho assessment, type findings in, see them on the
// Final Review page, save, and find the patient in my list.

test.describe("Guest mode journey @guest", () => {
  test("Home shows the main tiles and Clinical has its five tabs", async ({ page }) => {
    await enterGuestMode(page);
    for (const id of ["clinical", "assessment", "ai", "posture"]) {
      await expect(page.getByTestId(`home-tile-${id}`)).toBeVisible();
    }

    await openClinical(page);
    for (const tab of ["Today", "Assess", "Treatment", "Posture"]) {
      await expect(page.getByRole("button", { name: tab, exact: true }).first()).toBeVisible();
    }
    // "Patients" carries a count in front of it ("3Patients").
    await expect(page.getByRole("button", { name: /^\s*\d*\s*Patients\s*$/ }).first()).toBeVisible();

    // Each sub-tab opens without crashing. "Posture" leaves Clinical for the
    // Posture Analysis screen, so come back to Clinical for every tab.
    for (const tab of ["Assess", "Patients", "Treatment", "Today"] as const) {
      await openClinical(page);
      await openClinicalTab(page, tab);
      await noCrash(page);
    }
    await openClinical(page);
    await openClinicalTab(page, "Posture");
    await expect(page.getByText("Posture Analysis").first()).toBeVisible();
    await noCrash(page);
  });

  test("Ortho: type findings in, see them on Final Review, save, find the patient in the list", async ({ page }) => {
    const unique = uniqueSuffix();
    const patientName = `E2E Guest Patient ${unique}`;
    const marker = `E2E-${unique} right knee pain for 2 weeks`;

    await enterGuestMode(page);
    await startOrtho(page, { name: patientName, region: "Knee", side: "Right" });
    await fillDemographics(page, { name: patientName, age: 35, sex: "Male" });
    await fillChiefComplaint(page, marker);

    // MMT: give the first muscle's left side a 4/5.
    await goToStep(page, "MMT");
    await page.locator("select").first().selectOption("4");

    // Special Tests: mark the first test positive.
    await goToStep(page, "Special Tests");
    await page.getByRole("button", { name: "Positive" }).first().click();

    // Everything typed shows up on the Final Review page.
    await goToStep(page, "Final Review");
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText(/L 4\/5/)).toBeVisible();
    await expect(page.getByText(/right: Positive/i).first()).toBeVisible();

    await saveAssessment(page);
    await expectPatientListed(page, patientName);
    await noCrash(page);
  });

  test("a guest who reloads is sent back to the sign-in screen (nothing is kept)", async ({ page }) => {
    await enterGuestMode(page);
    await page.reload();
    await expect(page.getByRole("button", { name: /Try the full app/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("home-tile-clinical")).toHaveCount(0);
  });

  test("Home is reachable again after visiting Clinical", async ({ page }) => {
    await enterGuestMode(page);
    await openClinical(page);
    const home = page.getByTestId("bnav-tab-home");
    if (await home.isVisible().catch(() => false)) await home.click();
    else await page.locator(".pm-sidebar").getByText("Home", { exact: true }).first().click();
    await expectHome(page);
  });
});
