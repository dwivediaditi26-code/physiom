import { test, expect, Page } from "@playwright/test";
import { enterGuestMode, openMainTab, startNeuro, noCrash, uniqueSuffix } from "./appMap";

// Phone only: the PhysioFeed section row (Feed, Opportunity, News, ...) is
// drawn inside the app's own top bar. Two things went wrong with that
// (Aditi, 2026-10-10):
//   - once PhysioFeed had been opened, the row stayed in the top bar on Home
//     and Clinical;
//   - after a full-screen assessment (Ortho/Neuro/Cardio) the top bar is
//     rebuilt, and PhysioFeed then had no section row at all.
// Guest mode, so it needs no Supabase project and no secrets.

const sectionRow = (page: Page) => page.getByRole("navigation", { name: "PhysioFeed sections" });

test.describe("PhysioFeed section row in the top bar @guest", () => {
  test.skip(({ isMobile }) => !isMobile, "the row only sits in the top bar on a phone");

  test("shows on PhysioFeed only, and is still there after a full-screen assessment", async ({ page }) => {
    await enterGuestMode(page);

    await openMainTab(page, "physiofeed");
    await expect(sectionRow(page)).toBeVisible({ timeout: 15_000 });

    // Left behind on other tabs: it must not be.
    await openMainTab(page, "home");
    await expect(sectionRow(page)).toHaveCount(0);
    await openMainTab(page, "clinical");
    await expect(sectionRow(page)).toHaveCount(0);

    // A full-screen assessment rebuilds the top bar.
    await startNeuro(page, { name: `E2E Top Bar ${uniqueSuffix()}` });
    await expect(sectionRow(page)).toHaveCount(0);

    await openMainTab(page, "physiofeed");
    await expect(sectionRow(page)).toBeVisible({ timeout: 15_000 });
    await noCrash(page);
  });
});
