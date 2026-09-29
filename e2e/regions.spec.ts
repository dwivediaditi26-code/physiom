import { test, expect } from "@playwright/test";
import { REGIONS, enterGuestMode, startOrtho, goToStep, noCrash, uniqueSuffix } from "./appMap";

// Every body region, start to first findings screens. For each of the 13
// regions: start an Ortho General Assessment for it, then open the three
// steps where the region's own content lives (ROM, MMT, Special Tests) and
// check each shows its entry controls and nothing crashes. Runs on both the
// desktop and the phone project (see playwright.config.ts). Guest mode --
// nothing is saved anywhere, no account or secrets needed.

test.describe("Every body region @regions", () => {
  for (const region of REGIONS) {
    test(`${region}: ROM, MMT and Special Tests open`, async ({ page }) => {
      await enterGuestMode(page);
      await startOrtho(page, { name: `E2E ${region} ${uniqueSuffix()}`, region });

      await goToStep(page, "ROM");
      await expect(page.getByText("+ Add movement")).toBeVisible();

      await goToStep(page, "MMT");
      await expect(page.getByText("+ Add muscle")).toBeVisible();

      await goToStep(page, "Special Tests");
      await expect(page.getByText("+ Add test")).toBeVisible();

      await noCrash(page);
    });
  }
});
