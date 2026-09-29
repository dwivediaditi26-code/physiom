import { test, expect } from "@playwright/test";
import { enterGuestMode, startNeuro, startCardio, walkWizardToEnd, uniqueSuffix } from "./appMap";

// Neuro and Cardio assessments: start each the way a physio would and walk
// every screen to the summary page. Fails on any crash ("Something went
// wrong") or a walk that ends before the summary. Guest mode -- no account
// or secrets needed.

test.describe("Neuro and Cardio assessments @neurocardio", () => {
  test("Neuro (Outpatient, General Neurological template): every screen opens, ends on Summary & Review", async ({ page }) => {
    await enterGuestMode(page);
    await startNeuro(page, { name: `E2E Neuro ${uniqueSuffix()}`, setting: "Outpatient", template: "General Neurological" });
    const screens = await walkWizardToEnd(page);
    expect(screens).toBeGreaterThan(15);
    await expect(page.getByText("Summary & Review").first()).toBeVisible();
  });

  test("Neuro: a different template (Stroke) also opens and walks to the end", async ({ page }) => {
    await enterGuestMode(page);
    await startNeuro(page, { name: `E2E Stroke ${uniqueSuffix()}`, setting: "Inpatient", template: "Stroke" });
    const screens = await walkWizardToEnd(page);
    expect(screens).toBeGreaterThan(10);
  });

  test("Cardio (Outpatient, Cardiovascular): every screen opens, ends on Summary & Review", async ({ page }) => {
    await enterGuestMode(page);
    await startCardio(page, { name: `E2E Cardio ${uniqueSuffix()}`, setting: "Outpatient" });
    const screens = await walkWizardToEnd(page);
    expect(screens).toBeGreaterThan(15);
    await expect(page.getByText("Summary & Review").first()).toBeVisible();
  });
});
