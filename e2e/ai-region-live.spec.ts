// ai-region-live.spec.ts — @ai-accuracy
//
// REAL AI, one body region at a time (2026-10-07, Aditi: "let's do it brick by
// brick ... one region at a time"). For each case of the chosen region it
//   1. opens Home -> AI Assessment,
//   2. types the case's narrative and presses "Parse with AI" (the real
//      /api/parse -> real Groq),
//   3. presses "Apply to Subjective & Pain",
//   4. opens every group in the region tab and reads the manual form,
//   5. checks every `expect` option is ticked and no `forbid` option is,
//   6. walks to Final Review and checks the same answers are printed there
//      (Final Review and the PDF are built from the same rows).
//
// Run one region:   AI_REGION=knee npx playwright test ai-region-live --project=chromium
// Run everything:   AI_REGION=all  npx playwright test ai-region-live --project=chromium
//
// Needs PROD_QA_EMAIL / PROD_QA_PASSWORD (a dedicated QA account, never a
// real clinician's -- see ai-accuracy.spec.ts) and E2E_BASE_URL pointing at a
// build whose /api/parse works (the live site, or `vercel dev`).
//
// COST: every call uses ~5,000 Groq tokens of a 200,000-token/day, 8,000/min
// organisation limit shared with the real app, so calls are 65 s apart and
// the default is ONE region. It never saves anything: each assessment is
// left with "Leave without saving".
import { test, expect, type Page } from "@playwright/test";
// @ts-ignore -- plain JS shared with the offline unit tests
import { AI_REGION_CASES } from "./ai-region-cases.js";

test.describe.configure({ retries: 0 });
test.skip(({ isMobile }) => isMobile, "one phone-sized run is enough for the live AI check");

const CALL_GAP_MS = 65_000;
const WANT = (process.env.AI_REGION || "").toLowerCase();

type Case = { id: string; live?: boolean; region: { id: string }; narrative: string; expect: Record<string, string[]>; forbid?: Record<string, string[]> };
const cases: Case[] = (AI_REGION_CASES as Case[]).filter((c) => !c.live && !c.id.startsWith("nothing") && (WANT === "all" || (WANT && (c.region.id === WANT || c.id.toLowerCase().includes(WANT)))));

async function login(page: Page) {
  const email = process.env.PROD_QA_EMAIL || "";
  const password = process.env.PROD_QA_PASSWORD || "";
  expect(email && password, "Set PROD_QA_EMAIL / PROD_QA_PASSWORD (a dedicated QA account)").toBeTruthy();
  await page.goto("/");
  await page.getByRole("textbox", { name: "you@clinic.com" }).fill(email);
  await page.getByRole("textbox", { name: "••••••••" }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await page.waitForFunction(() => !document.querySelector('input[placeholder="you@clinic.com"]'), { timeout: 20_000 }).catch(() => {});
}

async function openAiAssessment(page: Page) {
  await page.getByText("AI Assessment", { exact: true }).first().click();
  // First use on a QA account: the one-time patient-permission confirmation.
  const box = page.getByTestId("patient-permission-modal").getByRole("checkbox");
  if (await box.isVisible({ timeout: 2000 }).catch(() => false)) {
    await box.check();
    await page.getByTestId("patient-permission-modal").getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByPlaceholder(/45 year old office worker/)).toBeVisible({ timeout: 20_000 });
}

async function readRegionForm(page: Page): Promise<string> {
  await expect(page.getByText("Region-specific subjective")).toBeVisible({ timeout: 30_000 });
  const heads = page.locator("button.collapsible-head");
  // Groups the AI filled are already open (a tap would close them); open only the closed ones.
  for (let i = 0; i < (await heads.count()); i++) {
    if ((await heads.nth(i).getAttribute("aria-expanded")) !== "true") await heads.nth(i).click();
  }
  const values = await page.$$eval("input.select-input, textarea, input.text-input", (els) => els.map((e) => (e as HTMLInputElement).value).filter(Boolean));
  return values.join("\n");
}

for (const c of cases) {
  test(`@ai-accuracy live AI -> manual form: ${c.id}`, async ({ page }) => {
    test.setTimeout(4 * 60_000);
    await login(page);
    await openAiAssessment(page);

    await page.getByPlaceholder(/45 year old office worker/).fill(c.narrative);
    const started = Date.now();
    await page.getByRole("button", { name: /Parse with AI/ }).click();
    await expect(page.getByText("Extracted Patient Information")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("button", { name: /Apply to Subjective/ }).click();

    const form = await readRegionForm(page);
    const missing: string[] = [];
    const wrong: string[] = [];
    Object.entries(c.expect).forEach(([key, options]) => options.forEach((o) => { if (!form.includes(o)) missing.push(`${key}: ${o}`); }));
    Object.entries(c.forbid || {}).forEach(([key, options]) => options.forEach((o) => { if (form.includes(o)) wrong.push(`${key}: ${o}`); }));

    // Final Review prints the same rows the PDF does.
    for (let i = 0; i < 25 && !(await page.getByRole("button", { name: /Save Assessment/ }).isVisible().catch(() => false)); i++) {
      await page.getByRole("button", { name: /^(Next|Review & complete)/ }).first().click();
    }
    const review = await page.locator("body").innerText();
    const notInReview = Object.entries(c.expect).flatMap(([key, options]) => options.filter((o) => form.includes(o) && !review.includes(o)).map((o) => `${key}: ${o}`));

    test.info().annotations.push({ type: "result", description: `missing=${missing.length} wrong=${wrong.length} notInReview=${notInReview.length}` });
    expect.soft(missing, "ticks the manual form should have after AI").toEqual([]);
    expect.soft(wrong, "ticks that would be wrong clinical data").toEqual([]);
    expect.soft(notInReview, "answers filled on the form but missing from Final Review").toEqual([]);

    // Leave without saving anything, then respect the TPM-safe spacing.
    await page.getByRole("button", { name: /^Home$/i }).first().click().catch(() => {});
    const leave = page.getByRole("button", { name: /Leave without/ });
    if (await leave.isVisible({ timeout: 2000 }).catch(() => false)) await leave.click();
    const left = CALL_GAP_MS - (Date.now() - started);
    if (left > 0) await page.waitForTimeout(left);
  });
}

if (!cases.length) {
  test("@ai-accuracy live AI -> manual form: choose a region", async () => {
    test.skip(true, "Set AI_REGION=<shoulder|knee|hip|ankle|wrist|elbow|cervical|thoracic|lumbar|all> to choose what to run");
  });
}
