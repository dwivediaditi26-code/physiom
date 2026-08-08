// appMap.ts — a machine-readable map of how PhysioMind Pro works.
//
// This is the "the robot knows your app" layer. Every module, how to open it,
// how to fill it, and how to read the SOAP note / PDF lives here. The command
// specs (commands.spec.ts) and the case suite (ortho-cases.spec.ts) both build
// on this, so when the app's UI changes you fix the selector ONCE here and
// every command keeps working.
//
// Add a new module? Add one entry to MODULES. Add a new plain-language command?
// Add a tagged test in commands.spec.ts that calls these helpers.

import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Module registry — the objective-assessment modules, keyed by the app's own
// internal nav key. `openBy` is the visible tile/label text the robot clicks.
// ─────────────────────────────────────────────────────────────────────────────
export interface ModuleDef {
  key: string;          // app's internal nav key (rom, mmt, special, fascia, ...)
  label: string;        // EXACT sidebar label text the robot clicks
  navKey: string;       // app nav key
  group: "assessment" | "advanced"; // collapsible sidebar group it lives in
  tag: string;          // grep tag, e.g. "@special"
  fillKind: "rom" | "mmt" | "special" | "generic" | "none"; // how the robot enters data
}

// Labels, navKeys and groups read straight from src/AppFull.jsx <SidebarGroup>/
// <SidebarItem> definitions. The "Assessment" group is expanded by default;
// "Advanced Assessment" is collapsed and must be expanded first.
export const MODULES: ModuleDef[] = [
  { key: "posture",     label: "Posture Analysis",                navKey: "posture",     group: "assessment", tag: "@posture",     fillKind: "generic" },
  { key: "observation", label: "Observation",                     navKey: "observation", group: "assessment", tag: "@observation", fillKind: "generic" },
  { key: "palpation",   label: "Palpation",                       navKey: "palpation",   group: "assessment", tag: "@palpation",   fillKind: "generic" },
  { key: "rom",         label: "Range of Motion",                 navKey: "rom",         group: "assessment", tag: "@rom",         fillKind: "rom" },
  { key: "mmt",         label: "MMT",                             navKey: "mmt",         group: "assessment", tag: "@mmt",         fillKind: "mmt" },
  { key: "special",     label: "Special Tests (100+)",            navKey: "special",     group: "assessment", tag: "@special",     fillKind: "special" },
  { key: "neuro",       label: "Neurological",                    navKey: "neuro",       group: "assessment", tag: "@neuro",       fillKind: "generic" },
  { key: "outcome",     label: "Outcome Measures",                navKey: "outcome",     group: "assessment", tag: "@outcome",     fillKind: "generic" },
  { key: "fma",         label: "Functional Assessment",           navKey: "fma",         group: "advanced",   tag: "@fma",         fillKind: "generic" },
  { key: "gait",        label: "Gait Analysis",                   navKey: "gait",        group: "advanced",   tag: "@gait",        fillKind: "generic" },
  { key: "cyriax",      label: "STTT — Selective Tissue Tension", navKey: "cyriax_full", group: "advanced",   tag: "@cyriax",      fillKind: "generic" },
  { key: "kinetic",     label: "Kinetic Chain",                   navKey: "kinetic",     group: "advanced",   tag: "@kinetic",     fillKind: "generic" },
  { key: "fascia",      label: "Fascia Integration",              navKey: "fascia",      group: "advanced",   tag: "@fascia",      fillKind: "generic" },
];

export const moduleByKey = (k: string) => MODULES.find(m => m.key === k)!;

// ─────────────────────────────────────────────────────────────────────────────
// Credentials + login
// ─────────────────────────────────────────────────────────────────────────────
export function creds() {
  const p = path.join(__dirname, "login.local.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return { email: j.email, password: j.password };
  }
  return { email: process.env.E2E_EMAIL || "", password: process.env.E2E_PASSWORD || "" };
}

export const noCrash = (page: Page) => expect(page.getByText("Something went wrong")).toHaveCount(0);

export async function login(page: Page) {
  const { email, password } = creds();
  expect(email, "Put your TEST-project login in e2e/login.local.json").not.toBe("");
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} localStorage.setItem("pm_onboarded", "1"); });
  await page.goto("/");
  await page.getByRole("textbox", { name: "you@clinic.com" }).fill(email);
  await page.getByRole("textbox", { name: "••••••••" }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: /^Next/ }).first();
    if (await next.isVisible({ timeout: i === 0 ? 4000 : 1200 }).catch(() => false)) await next.click().catch(() => {});
    else break;
  }
  const skip = page.getByRole("button", { name: /Skip tour|Got it/i }).first();
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("button", { name: /Start Assessment/i }).first()).toBeVisible({ timeout: 25000 });
  await noCrash(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
export async function startAssessment(page: Page) {
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  // Button was renamed from "Review & Run Analysis" to "Suggest probable
  // objective assessment" in SubjectiveObjective.jsx (line ~4833) -- test
  // was still waiting on the old text and failing on real, current UI.
  await expect(page.getByText(/Suggest probable objective assessment/i)).toBeVisible({ timeout: 20000 });
}

export async function selectRegion(page: Page, group: string, regionName: string) {
  if (!(await page.getByText("Lower limb").first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /\+ Add body region|\+ Edit/ }).first().click({ timeout: 8000 }).catch(() => {});
  }
  await page.getByText(`${group}▼`).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByText(regionName, { exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "Right", exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "▲" }).first().click({ timeout: 5000 }).catch(() => {});
}

export async function runAnalysis(page: Page) {
  // 1) open the review/summary modal (button renamed from "Review & Run
  //    Analysis" to "Suggest probable objective assessment")
  await page.getByRole("button", { name: /Suggest probable objective assessment/i }).first()
    .click({ timeout: 8000 }).catch(() => {});
  // 2) click the modal's "Run analysis" — scope by EXACT name so it doesn't also
  //    match the outer button (which would trigger a strict-mode error the
  //    old .catch() silently swallowed, so analysis never actually ran).
  const run = page.getByRole("button", { name: "🧠 Run analysis" }).first();
  if (await run.isVisible({ timeout: 8000 }).catch(() => false)) {
    await run.click().catch(() => {});
  }
  // 3) wait for the interpretation to actually produce results before moving on
  await page.getByText(/Interpretation|Probable|Impression|Clinical/i).first()
    .waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

// Dismiss the "What you've documented / Run analysis" modal (and any similar
// overlay) if it's covering the screen, so sidebar clicks aren't intercepted.
export async function dismissModal(page: Page) {
  const cont = page.getByRole("button", { name: /Continue editing|Close|Got it|Cancel/i }).first();
  if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cont.click({ timeout: 2000 }).catch(() => {});
    return;
  }
  await page.keyboard.press("Escape").catch(() => {});
}

// Open an objective module via the DESKTOP sidebar (.pm-sidebar). The app also
// renders an off-screen mobile drawer (.pm-nav-drawer) FIRST in the DOM, so we
// must scope to .pm-sidebar or a plain .first() clicks the hidden copy and
// nothing navigates. Modules in the "Advanced Assessment" group are collapsed
// by default, so expand that group header first.
// On the mobile project (.pm-sidebar hidden) we fall back to the bottom-nav
// drawer.
export async function openModule(page: Page, m: ModuleDef): Promise<boolean> {
  const sidebar = page.locator(".pm-sidebar");

  if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
    const item = sidebar.getByText(m.label, { exact: true }).first();
    // expand the Advanced group if this module lives there and isn't showing
    if (m.group === "advanced" && !(await item.isVisible().catch(() => false))) {
      const header = sidebar.getByText("Advanced Assessment", { exact: false }).first();
      if (await header.isVisible().catch(() => false)) {
        await header.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
    if (await item.isVisible({ timeout: 3000 }).catch(() => false)) {
      await item.scrollIntoViewIfNeeded().catch(() => {});
      await item.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(700);
      return true;
    }
    return false;
  }

  // ── mobile fallback: open the nav drawer, then click inside it ──
  // Two hamburger buttons share the exact accessible name "Open navigation"
  // (AppFull.jsx's .pm-header desktop bar AND .pm-mobile-hdr mobile bar --
  // only one is ever visible via CSS media query, the other stays in the
  // DOM). getByRole(...).first() always picked the desktop one, which is
  // display:none on a mobile viewport -- the click silently no-op'd, the
  // drawer never opened, and every module lookup that depended on it just
  // burned its own retries until the outer test hit its 90s timeout.
  // Scope directly to the mobile header's hamburger instead.
  const menu = page.locator(".pm-mobile-hdr .pm-hamburger").first();
  if (await menu.isVisible({ timeout: 2000 }).catch(() => false)) await menu.click().catch(() => {});
  const drawer = page.locator(".pm-nav-drawer");
  if (m.group === "advanced") {
    const header = drawer.getByText("Advanced Assessment", { exact: false }).first();
    if (await header.isVisible().catch(() => false)) { await header.click().catch(() => {}); await page.waitForTimeout(400); }
  }
  const mItem = drawer.getByText(m.label, { exact: true }).first();
  if (await mItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mItem.scrollIntoViewIfNeeded().catch(() => {});
    await mItem.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// "Click every button in the current view, assert no crash after each."
// This is the engine behind commands like "test all special-test buttons".
// ─────────────────────────────────────────────────────────────────────────────
// Buttons that navigate away, open blocking modals, or mutate data — never
// click these during a "click everything" crawl or they hijack the whole run
// (e.g. New Patient opens an intake modal that blocks every later click).
// "review & run" -> "suggest probable" matches the button's rename from
// "Review & Run Analysis" to "Suggest probable objective assessment"
// (SubjectiveObjective.jsx ~line 4833) -- the stale pattern here meant
// clickEveryButton() would no longer skip it during a crawl and would
// click straight into the analysis modal mid-test.
const UNSAFE_BUTTON = /new patient|switch patient|\+ *new|load patient|profile|home|dashboard|demographics|subjective|posture analysis|observation|palpation|range of motion|\bmmt\b|special tests|neurolog|outcome|functional|gait|stt|kinetic|fascia|treatment|documentation|soap|review & run|suggest probable|run analysis|sign|log ?out|delete|remove|save & exit|export|pdf|consent|switch|patients?\b/i;

export async function clickEveryButton(page: Page, opts: { max?: number; skip?: RegExp } = {}) {
  const max = opts.max ?? 30;
  const buttons = page.getByRole("button");
  const n = Math.min(await buttons.count(), max);
  let clicked = 0;
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    const txt = (await b.textContent().catch(() => "")) || "";
    if (opts.skip && opts.skip.test(txt)) continue;
    if (UNSAFE_BUTTON.test(txt)) continue;
    if (!(await b.isVisible().catch(() => false))) continue;
    // short per-click timeout so a blocked click fails fast instead of hanging
    await b.click({ timeout: 1200 }).catch(() => {});
    clicked++;
    // if a click opened a modal/overlay, close it before the next one
    await page.keyboard.press("Escape").catch(() => {});
    await noCrash(page);
  }
  return clicked;
}

// Toggle/select every option control in the current module (dropdowns + option
// buttons). Used to exercise "do all the buttons/inputs in this module work".
export async function exerciseModuleInputs(page: Page) {
  // dropdowns: pick the last non-empty option (usually an abnormal/positive value)
  const selects = page.locator("select");
  const sc = await selects.count();
  for (let i = 0; i < Math.min(sc, 30); i++) {
    const s = selects.nth(i);
    const opts = await s.locator("option").allTextContents().catch(() => []);
    const pick = opts.filter(o => o && !/select|—|N\/A|choose/i.test(o)).pop();
    if (pick) await s.selectOption({ label: pick }).catch(() => {});
    await noCrash(page);
  }
  // number inputs: put a plausible value
  const nums = page.locator('input[type="number"]');
  const nc = await nums.count();
  for (let i = 0; i < Math.min(nc, 30); i++) {
    await nums.nth(i).fill("45").catch(() => {});
  }
  await noCrash(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOAP note
// ─────────────────────────────────────────────────────────────────────────────
export async function openSoap(page: Page) {
  // Preferred: the in-context "Live SOAP" panel button (always present during an
  // assessment). This renders the S/O/A/P note without leaving the workflow.
  const live = page.getByRole("button", { name: /Live SOAP/i }).first();
  if (await live.isVisible({ timeout: 3000 }).catch(() => false)) {
    await live.click().catch(() => {});
    await page.waitForTimeout(800);
    return;
  }
  // Fallback: Documentation → SOAP Notes sidebar path
  const doc = page.getByText("Documentation").first();
  if (await doc.isVisible({ timeout: 3000 }).catch(() => false)) await doc.click().catch(() => {});
  const soap = page.getByText("SOAP Notes").first();
  if (await soap.isVisible({ timeout: 3000 }).catch(() => false)) await soap.click().catch(() => {});
  const cont = page.getByRole("button", { name: /Continue SOAP/i }).first();
  if (await cont.isVisible({ timeout: 2000 }).catch(() => false)) await cont.click().catch(() => {});
  await page.waitForTimeout(800);
}

// Grab the full visible SOAP note text so a command can assert what's in it.
export async function soapText(page: Page): Promise<string> {
  await openSoap(page);
  const body = await page.locator("body").innerText().catch(() => "");
  return body;
}

export async function assertInSoap(page: Page, needle: RegExp) {
  const text = await soapText(page);
  expect(text, `Expected SOAP note to contain ${needle}`).toMatch(needle);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF / report
// ─────────────────────────────────────────────────────────────────────────────
// The app opens a print-formatted report in a NEW TAB (Print → Save as PDF).
// This clicks Export PDF and returns the new tab's text so a command can assert
// the report shows the expected content.
export async function exportReportText(page: Page): Promise<string> {
  const ctx = page.context();
  const btn = page.getByRole("button", { name: /Export PDF|Generate|Report/i }).first();
  if (!(await btn.isVisible({ timeout: 4000 }).catch(() => false))) return "";
  const [popup] = await Promise.all([
    ctx.waitForEvent("page").catch(() => null),
    btn.click().catch(() => {}),
  ]);
  if (!popup) {
    // same-tab render fallback
    return await page.locator("body").innerText().catch(() => "");
  }
  await popup.waitForLoadState("domcontentloaded").catch(() => {});
  const txt = await popup.locator("body").innerText().catch(() => "");
  await popup.close().catch(() => {});
  return txt;
}

export const REGIONS: Record<string, { group: string; name: string }> = {
  cervical:  { group: "Spine",      name: "Cervical spine" },
  thoracic:  { group: "Spine",      name: "Thoracic spine" },
  lumbar:    { group: "Spine",      name: "Lumbar / SI" },
  shoulder:  { group: "Upper limb", name: "Shoulder" },
  elbow:     { group: "Upper limb", name: "Elbow" },
  wrist:     { group: "Upper limb", name: "Wrist / Hand" },
  hip:       { group: "Lower limb", name: "Hip / Groin" },
  knee:      { group: "Lower limb", name: "Knee" },
  ankle:     { group: "Lower limb", name: "Ankle / Foot" },
};
