import { test, expect } from "@playwright/test";
import { enterGuestMode, expectHome, openMainTab, openClinical, openClinicalTab, noCrash } from "./appMap";

// A quick tour of every main area of the app -- the map in appMap.ts, walked
// end to end. Each stop must open without a crash and show its own
// landmark. Guest mode: no account or secrets needed. Runs on the desktop
// and phone projects (the phone has a Profile tab; the desktop sidebar has
// none, so that stop is phone-only).

test.describe("App tour @tour", () => {
  test("Home -> Clinical -> Learn -> PhysioFeed, and back to Home", async ({ page, isMobile }) => {
    await enterGuestMode(page);

    await openMainTab(page, "clinical");
    await expect(page.getByText(/\d+ patients? today/)).toBeVisible();
    await noCrash(page);

    await openMainTab(page, "learn");
    await expect(page.getByText(/\d+ topics/)).toBeVisible({ timeout: 15_000 });
    for (const topic of ["Practical Skills", "Clinical Cases"]) {
      await expect(page.getByText(topic).first()).toBeVisible();
    }
    await noCrash(page);

    await openMainTab(page, "physiofeed");
    // The phone shows the sections as tabs along the top; the desktop shows
    // them as a menu on the left (with "Physio Feed" and "Messages" too).
    const sections = isMobile
      ? ["Feed", "Opportunity", "Case Discussion", "People", "Evidence", "Saved"]
      : ["Physio Feed", "Opportunity", "Case Discussion", "People", "Evidence", "Messages", "Saved"];
    for (const tab of sections) {
      await expect(page.getByText(tab, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });
    }
    await noCrash(page);

    await openMainTab(page, "home");
    await expectHome(page);
  });

  test("Profile opens from the phone bottom bar", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the desktop sidebar has no Profile entry");
    await enterGuestMode(page);
    await openMainTab(page, "profile");
    await noCrash(page);
    // A guest sees either the profile or a "sign in to continue" prompt.
    await expect(page.getByText(/Edit Profile|Sign in|sign in/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the Home tiles lead to their screens", async ({ page }) => {
    await enterGuestMode(page);

    await page.getByTestId("home-tile-clinical").click();
    await expect(page.getByText(/\d+ patients? today/)).toBeVisible();

    await openMainTab(page, "home");
    await page.getByTestId("home-tile-assessment").click();
    await expect(page.getByText("＋ New Assessment")).toBeVisible();

    await openMainTab(page, "home");
    await page.getByTestId("home-tile-posture").click();
    await expect(page.getByText("Posture Analysis").first()).toBeVisible();

    await openClinical(page);
    await openClinicalTab(page, "Treatment");
    await noCrash(page);
  });
});
