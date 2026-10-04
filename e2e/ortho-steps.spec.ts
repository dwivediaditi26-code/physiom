import { test, expect } from "@playwright/test";
import { ORTHO_STEPS, enterGuestMode, startOrtho, walkToEnd, goToStep, stepCounter, noCrash, uniqueSuffix } from "./appMap";

// The Ortho assessment is the biggest screen in the app (20 steps for a
// General Assessment). These tests open every step, both by tapping "Next"
// and by jumping straight from the step bar, and fail on any crash
// ("Something went wrong") or a step counter that does not move as expected.
// Guest mode -- no account or secrets needed.

test.describe("Ortho assessment steps @steps", () => {
  test("General Assessment: Next walks every step in order and ends on Final Review", async ({ page }) => {
    await enterGuestMode(page);
    await startOrtho(page, { name: `E2E Steps ${uniqueSuffix()}`, region: "Knee", setup: "General Assessment" });
    const total = await walkToEnd(page);
    expect(total).toBe(ORTHO_STEPS.length);
  });

  test("General Assessment: every step opens from the step bar", async ({ page }) => {
    await enterGuestMode(page);
    await startOrtho(page, { name: `E2E Jump ${uniqueSuffix()}`, region: "Shoulder", setup: "General Assessment" });
    for (const [i, step] of ORTHO_STEPS.entries()) {
      await goToStep(page, step);
      const { n, total } = await stepCounter(page);
      expect(n, `tapping "${step}" should open step ${i + 1}`).toBe(i + 1);
      expect(total).toBe(ORTHO_STEPS.length);
    }
    await noCrash(page);
  });

  test("Advanced Assessment has more steps than General and all of them open", async ({ page }) => {
    await enterGuestMode(page);
    await startOrtho(page, { name: `E2E Advanced ${uniqueSuffix()}`, region: "Lumbar", setup: "Advanced Assessment" });
    const total = await walkToEnd(page);
    expect(total).toBeGreaterThan(ORTHO_STEPS.length);
  });
});
