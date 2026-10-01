// appMap.ts — the "robot knows your app" layer for the browser tests.
//
// Every screen the tests touch is opened through a helper in this file, so
// when the app's screens change you fix the selector ONCE here and every
// test keeps working. Nothing else in e2e/ should hard-code a button label
// for navigation.
//
// THE MAP (today's app, 2026-09) -- where things are and how the robot gets there
//
//   Phone: bottom bar   HOME | CLINICAL | PHYSIOFEED | LEARN | PROFILE
//                       (test ids bnav-tab-home, -__clinical, -physiofeed, -learn, -profile)
//   Desktop: sidebar    Home | Patients | Clinical | Learn | PhysioFeed | Settings
//
//   Home ............... tiles: Clinical, Assessment, AI Assessment, Posture Analysis
//                        (test ids home-tile-*), then Evidence, Explore, Learn, Saved
//   Clinical ........... sub-tabs  Today | Assess | Patients | Treatment | Posture
//     Assess ........... "＋ New Assessment" -> quick details (name, specialty)
//       Ortho .......... pathway -> body region(s) -> how to start -> 20 steps
//                        (Demographics ... Final Review) -> Save Assessment
//       Neuro .......... setting -> template -> steps -> Summary & Review
//       Cardio ......... Start Assessment -> setting -> system -> steps -> Summary & Review
//     Patients ......... the patient list (filters: All / Outpatient / IPD / Post-op ...)
//     Treatment ........ patients in active treatment
//     Posture .......... leaves Clinical for the Posture Analysis screen
//   Learn .............. topics: Practical Skills, Clinical Cases (+ "Soon" cards)
//   PhysioFeed ......... phone: tabs Feed | Opportunity | Case Discussion | People | Evidence | Saved
//                        desktop: left menu Physio Feed | Opportunity | Case Discussion | People |
//                        Evidence | Messages | Saved
//   Profile ............ Edit Profile, Professional Profile | Activity, Sign out
//
// Two ways into the app:
//   enterGuestMode()  -- "Try the full app", no account, nothing reaches
//                        Supabase. Needs no secrets, so it runs anywhere.
//   signUp()/login()  -- a real account on the disposable TEST Supabase
//                        project (see e2e/README.md). Never point these at
//                        the live project: they save patients.

import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// What the Ortho assessment contains
// ─────────────────────────────────────────────────────────────────────────────

// The step bar of a "General Assessment" (the core sections). "Advanced
// Assessment" has more steps; use the counter ("Step n/m") for those.
export const ORTHO_STEPS = [
  "Demographics", "Subjective", "Red Flag Screen", "Pain", "General Observation",
  "Palpation", "ROM", "MMT", "Joint Mobility", "Special Tests", "Neuro Screen",
  "Limb Length", "Functional Assessment", "Outcome Measure", "Clinical Assessment",
  "Problem List", "Care Plan Goals", "Care Plan Treatment", "Care Plan", "Medical Records", "Final Review",
] as const;

// Body regions on the region step, exactly as labelled there.
export const REGIONS = [
  "Cervical", "Thoracic", "Lumbar", "Sacrum / Coccyx",
  "Shoulder", "Elbow", "Wrist", "Hand / Fingers",
  "Hip", "Knee", "Ankle", "Foot / Toes", "Pelvis",
] as const;
export type Region = (typeof REGIONS)[number];
export type Side = "Right" | "Left" | "Bilateral";
export type Specialty = "Ortho" | "Neuro" | "Cardio";

// ─────────────────────────────────────────────────────────────────────────────
// Getting in
// ─────────────────────────────────────────────────────────────────────────────
export const noCrash = (page: Page) => expect(page.getByText("Something went wrong")).toHaveCount(0);

// Start from a clean browser (once per page, so a reload later in a test does
// not wipe the login) and skip the first-run tour.
async function freshStart(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("e2e_init")) { localStorage.clear(); sessionStorage.setItem("e2e_init", "1"); }
      localStorage.setItem("pm_onboarded", "1");
    } catch { /* storage blocked -- nothing to clear */ }
  });
}

// The Home screen's tiles are the signal that we are "in the app".
export async function expectHome(page: Page) {
  await expect(page.getByTestId("home-tile-clinical")).toBeVisible({ timeout: 25_000 });
  await noCrash(page);
}

// After a reload the app comes back on the screen you were on (not Home), so
// "we're still signed in" means: the app frame is there and the sign-in form is not.
// On a phone the sidebar exists in the page but is a closed drawer, so only
// count a bar or sidebar that is actually showing.
export async function expectStillSignedIn(page: Page) {
  await expect(page.getByTestId("bnav-tab-home").or(page.locator(".pm-sidebar")).filter({ visible: true }).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByPlaceholder("you@clinic.com")).toHaveCount(0);
  await noCrash(page);
}

// Did the patient really reach the database? The header's "Saved to cloud"
// label is set by the on-device draft save, so it proves nothing about the
// cloud; the reliable signal is the database's answer to the save request.
// Call trackCloudSaves() on a page BEFORE saving, then expectCloudSaved().
export function trackCloudSaves(page: Page) {
  const t = { ok: 0, failed: [] as string[] };
  page.on("response", async (res) => {
    if (res.request().method() === "POST" && res.url().includes("/rest/v1/patients")) {
      if (res.status() < 300) t.ok++;
      else t.failed.push(`${res.status()} ${(await res.text().catch(() => "")).slice(0, 160)}`);
    }
  });
  return t;
}

export async function expectCloudSaved(t: { ok: number; failed: string[] }, timeout = 45_000) {
  try {
    await expect.poll(() => t.ok, { timeout }).toBeGreaterThan(0);
  } catch {
    throw new Error(`No patient save was accepted by the database. Rejected saves: ${t.failed.join(" | ") || "none seen"}`);
  }
}

export async function enterGuestMode(page: Page) {
  await freshStart(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Try the full app/ }).click();
  await expectHome(page);
}

export function creds() {
  const p = path.join(__dirname, "login.local.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return { email: j.email, password: j.password };
  }
  return { email: process.env.E2E_EMAIL || "", password: process.env.E2E_PASSWORD || "" };
}

// Safety net: the tests that sign in or sign up write to a real database, so
// they must never run against the live one. The app falls back to the live
// project whenever VITE_SUPABASE_URL was not set when it was built, so look
// at the build the tests are about to use (and at the address, when testing
// a deployed copy) and refuse if it points at the live project.
const LIVE_PROJECT_REF = "gkhcysvayjrkrufcnqvz";
export function assertNotLiveDatabase() {
  const remote = process.env.E2E_BASE_URL;
  if (remote) {
    if (/physiom-sbs4/.test(remote)) {
      throw new Error(`Refusing to sign in or sign up on the live site (${remote}). Use a copy built against the TEST Supabase project.`);
    }
    return;
  }
  const assets = path.join(__dirname, "..", "dist", "assets");
  const files = fs.existsSync(assets) ? fs.readdirSync(assets).filter(f => f.endsWith(".js")) : [];
  for (const f of files) {
    if (fs.readFileSync(path.join(assets, f), "utf8").includes(LIVE_PROJECT_REF)) {
      throw new Error(
        "Refusing to sign in or sign up: this build talks to the LIVE Supabase project. " +
        "Build with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set to the TEST project (see e2e/README.md)."
      );
    }
  }
}

// An existing test-project account (E2E_EMAIL / E2E_PASSWORD, or
// e2e/login.local.json).
export async function login(page: Page, account = creds()) {
  assertNotLiveDatabase();
  expect(account.email,"Put your TEST-project login in e2e/login.local.json (or E2E_EMAIL / E2E_PASSWORD)").not.toBe("");
  await freshStart(page);
  await page.goto("/");
  await page.getByPlaceholder("you@clinic.com").fill(account.email);
  await page.getByPlaceholder("••••••••").fill(account.password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expectHome(page);
}

// A brand-new account. The TEST project must have "Confirm email" OFF,
// otherwise sign-up never returns a session (see e2e/README.md).
export async function signUp(page: Page, account: { name: string; email: string; password: string }) {
  assertNotLiveDatabase();
  await freshStart(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.getByPlaceholder("Dr. Aditi").fill(account.name);
  await page.getByPlaceholder("you@clinic.com").fill(account.email);
  await page.getByPlaceholder("Create a strong password").fill(account.password);
  // The Terms / Privacy tick box must be ticked before the button works.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account →" }).click();
  await expectHome(page);
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Moving around
// ─────────────────────────────────────────────────────────────────────────────

// Leaving an assessment asks "Save this assessment?" first. Entries are kept
// either way; the tests take "Leave without saving" when it shows up.
export async function leaveIfAsked(page: Page) {
  const leave = page.getByText("Leave without saving");
  if (await leave.isVisible({ timeout: 1500 }).catch(() => false)) await leave.click();
}

export type MainTab = "home" | "clinical" | "physiofeed" | "learn" | "profile";

// The five main areas. Phone layout has a bottom bar, desktop layout has a
// sidebar (which has no "Profile" -- the phone bar is the only way in).
export async function openMainTab(page: Page, tab: MainTab) {
  const bar = page.getByTestId(`bnav-tab-${tab === "clinical" ? "__clinical" : tab}`);
  if (await bar.isVisible().catch(() => false)) {
    await bar.click();
  } else {
    expect(tab, "the desktop sidebar has no Profile entry").not.toBe("profile");
    const label = { home: "Home", clinical: "Clinical", physiofeed: "PhysioFeed", learn: "Learn" }[tab];
    await page.locator(".pm-sidebar").getByText(label, { exact: label !== "Clinical" }).first().click();
  }
  await leaveIfAsked(page);
}

export async function openClinical(page: Page) {
  await openMainTab(page, "clinical");
  // Shown on every Clinical sub-tab, e.g. "1 patient today".
  await expect(page.getByText(/\d+ patients? today/)).toBeVisible({ timeout: 15_000 });
}

export type ClinicalTab = "Today" | "Assess" | "Patients" | "Treatment" | "Posture";

// Clinical's sub-tabs. "Patients" carries a count in front ("3Patients").
export async function openClinicalTab(page: Page, tab: ClinicalTab) {
  const name = tab === "Patients" ? /^\s*\d*\s*Patients\s*$/ : tab;
  await page.getByRole("button", { name, exact: tab !== "Patients" }).first().click();
}

// Clinical -> Patients: is this patient in the list?
export async function expectPatientListed(page: Page, name: string, timeout = 15_000) {
  await openClinical(page);
  await openClinicalTab(page, "Patients");
  await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout });
}

// ─────────────────────────────────────────────────────────────────────────────
// Starting an assessment
// ─────────────────────────────────────────────────────────────────────────────

// Clinical -> Assess -> "＋ New Assessment" -> name (+ optional age and sex)
// + specialty -> Next.
export async function startNewAssessment(
  page: Page,
  specialty: Specialty,
  patientName: string,
  extra: { age?: number; sex?: "Male" | "Female" | "Other" } = {},
) {
  await openClinical(page);
  await openClinicalTab(page, "Assess");
  await page.getByText("＋ New Assessment").click();
  const modal = page.getByTestId("specialty-picker-modal");
  await modal.getByPlaceholder("e.g. Riya Sharma").fill(patientName);
  if (extra.age !== undefined) await modal.getByPlaceholder("yrs").fill(String(extra.age));
  if (extra.sex) await modal.getByRole("button", { name: extra.sex, exact: true }).click();
  await modal.getByText(specialty, { exact: true }).click();
  await modal.getByText("Next →").click();
}

export interface OrthoStart {
  name: string;
  // Also typed into the quick form; the wizard should already have them.
  age?: number;
  sex?: "Male" | "Female" | "Other";
  region?: Region;
  side?: Side;
  // "How do you want to start?" choice.
  setup?: "General Assessment" | "Advanced Assessment";
}

// Pathway "Outpatient / Musculoskeletal" -> region (+ side for limbs) -> setup
// -> lands on step 1 of the assessment.
export async function startOrtho(page: Page, o: OrthoStart) {
  const region = o.region ?? "Knee";
  const setup = o.setup ?? "General Assessment";
  await startNewAssessment(page, "Ortho", o.name, { age: o.age, sex: o.sex });
  await page.getByText("Outpatient / Musculoskeletal").click();
  await page.getByRole("button", { name: /^Continue/ }).click();

  await page.getByRole("button", { name: region, exact: true }).click();
  // Limb regions ask which side; the spine and pelvis do not.
  const side = page.getByRole("button", { name: o.side ?? "Right", exact: true });
  if (await side.isVisible({ timeout: 1500 }).catch(() => false)) await side.click();
  await page.getByRole("button", { name: /^Continue/ }).click();

  await page.getByText(setup, { exact: true }).click();
  await page.getByRole("button", { name: /Start assessment/ }).click();
  await expect(page.getByText(/Step 1\/\d+/)).toBeVisible({ timeout: 15_000 });
  await noCrash(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inside the Ortho assessment
// ─────────────────────────────────────────────────────────────────────────────

// The step bar's chips are buttons named exactly like the step.
export async function goToStep(page: Page, step: (typeof ORTHO_STEPS)[number] | string) {
  await page.getByRole("button", { name: step, exact: true }).first().click();
  await noCrash(page);
}

export async function stepCounter(page: Page): Promise<{ n: number; total: number }> {
  const text = (await page.locator("body").innerText()).match(/Step (\d+)\/(\d+)/);
  expect(text, "no 'Step n/m' counter on screen").not.toBeNull();
  return { n: Number(text![1]), total: Number(text![2]) };
}

// Click "Next" from wherever we are to the last step ("Review & complete"
// on the second-to-last one). Checks the counter moves by one each time and
// nothing crashes. Returns how many steps there were.
export async function walkToEnd(page: Page): Promise<number> {
  const { n: first, total } = await stepCounter(page);
  for (let n = first; n < total - 1; n++) {
    await expect(page.getByText(new RegExp(`Step ${n}/${total}`))).toBeVisible();
    await noCrash(page);
    await page.getByRole("button", { name: /^Next$/ }).click();
  }
  await expect(page.getByText(new RegExp(`Step ${total - 1}/${total}`))).toBeVisible();
  await page.getByRole("button", { name: /Review & complete/ }).click();
  await expect(page.getByText(new RegExp(`Step ${total}/${total}`))).toBeVisible();
  await expect(page.getByRole("button", { name: /Save Assessment/ })).toBeVisible();
  await noCrash(page);
  return total;
}

// Demographics step. Saving needs the name and age. The quick form's name,
// age and sex are already filled in here; typing them again just replaces them.
export async function fillDemographics(page: Page, d: { name: string; age?: number; sex?: "Male" | "Female" | "Other" }) {
  await goToStep(page, "Demographics");
  await page.getByPlaceholder("Patient's full name").fill(d.name);
  if (d.age !== undefined) await page.locator("select").first().selectOption(String(d.age));
  if (d.sex) await page.getByRole("button", { name: d.sex, exact: true }).first().click();
}

// The Subjective step's "chief complaint" box.
export async function fillChiefComplaint(page: Page, text: string) {
  await goToStep(page, "Subjective");
  await page.getByPlaceholder("In the patient's own words...").fill(text);
}

// Final Review -> "Save Assessment"; the button turns into "Saved ✓".
export async function saveAssessment(page: Page) {
  await goToStep(page, "Final Review");
  await page.getByRole("button", { name: /Save Assessment/ }).click();
  await expect(page.getByRole("button", { name: /Saved ✓/ })).toBeVisible({ timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Neuro and Cardio assessments
// ─────────────────────────────────────────────────────────────────────────────
// Both are step-by-step wizards like Ortho, but with no "Step n/m" counter:
// "Next" moves on, the last step's button says "Review & finish" and leads to
// "Summary & Review" with a "Save Assessment" button.

export type Setting = "Inpatient" | "ICU" | "Post-operative" | "Outpatient" | "Neuro Rehabilitation" | "Rehabilitation";

// Setting -> "Use Template" -> a condition template -> lands on the first step.
export async function startNeuro(page: Page, o: { name: string; setting?: Setting; template?: string }) {
  await startNewAssessment(page, "Neuro", o.name);
  await page.getByText(o.setting ?? "Outpatient", { exact: true }).click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByText("Use Template").click();
  await page.getByText(o.template ?? "General Neurological", { exact: true }).click();
  await expect(page.getByText("Patient Information").first()).toBeVisible({ timeout: 15_000 });
  await noCrash(page);
}

// "Start Assessment" -> setting -> system -> first step.
export async function startCardio(page: Page, o: { name: string; setting?: Setting; system?: "Cardiovascular" | "Respiratory" | "Combined" }) {
  await startNewAssessment(page, "Cardio", o.name);
  await page.getByText("Start Assessment", { exact: true }).click();
  await page.getByText(o.setting ?? "Outpatient", { exact: true }).click();
  await page.getByRole("button", { name: /Continue to system/ }).click();
  await page.getByText(o.system ?? "Cardiovascular", { exact: true }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.getByText("Patient Information").first()).toBeVisible({ timeout: 15_000 });
  await noCrash(page);
}

// "Next" all the way to "Review & finish", then check the summary page is
// there. Returns how many screens it walked through.
export async function walkWizardToEnd(page: Page): Promise<number> {
  let screens = 1;
  for (let i = 0; i < 60; i++) {
    await noCrash(page);
    const finish = page.getByRole("button", { name: /Review & finish/ });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      screens++;
      break;
    }
    await page.getByRole("button", { name: /^Next$/ }).click();
    screens++;
  }
  await expect(page.getByRole("button", { name: /Save Assessment/ })).toBeVisible({ timeout: 15_000 });
  await noCrash(page);
  return screens;
}
