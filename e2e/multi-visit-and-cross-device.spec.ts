import { test, expect } from '@playwright/test';

// Two scenarios deliberately deferred earlier in this project's testing
// roadmap (the user chose "keep going with remaining modules" over these at
// the time) -- now built as their own spec, separate from
// patient-journey.spec.ts's single-visit MMT/CPA/Neuro/STTT/etc. coverage.
//
// 1) Multi-visit: does a real follow-up ("Quick Visit") session actually
//    reach the Progress tab's Session Timeline? This is a genuinely
//    different code path from the main SOAP note -- QuickVisitForm
//    (AppModules.jsx) writes to `data.tx_sessions`, which only the
//    Patient Profile's Progress tab (PatientDatabase.jsx) reads. Nothing
//    in patient-journey.spec.ts touches this at all.
// 2) Cross-device: does data created on one browser/device genuinely
//    reach a real Supabase backend, or could it silently be
//    localStorage-only? Two independent Playwright BrowserContexts (no
//    shared cookies/storage, same as two different physical devices)
//    signing in with the same real account is the only way to prove this
//    without trusting a screenshot -- if the second context can load a
//    patient the first one created, the round-trip through the real
//    backend is proven, not assumed.

test.describe('Multi-visit follow-up + cross-device sync', () => {
  test.skip(({ isMobile }) => isMobile, 'Mobile uses a different bottom-nav UI -- needs its own spec');

  test('a Quick Visit follow-up session appears in the Progress tab timeline and Patient Profile', async ({ page }) => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-mv-${unique}@physiomind-test.dev`;
    const password = 'TestPass123!';
    const patientName = `E2E MultiVisit Patient ${unique}`;

    await page.goto('/');
    await page.getByRole('button', { name: 'Create free account' }).click();
    await page.getByPlaceholder('Dr. Aditi').fill('E2E Runner');
    await page.getByPlaceholder('you@clinic.com').fill(email);
    await page.getByPlaceholder('Create a strong password').fill(password);
    await page.getByRole('button', { name: 'Create free account →' }).click();
    await page.getByRole('button', { name: 'Skip tour' }).click();

    const sidebar = page.locator('.pm-sidebar');
    await expect(sidebar.getByText('New Patient', { exact: false })).toBeVisible({ timeout: 10_000 });
    await sidebar.getByText('New Patient', { exact: false }).click();

    const intake = page.getByTestId('intake-modal');
    await intake.getByPlaceholder('e.g. Riya Sharma').fill(patientName);
    await intake.getByRole('button', { name: 'Consent', exact: true }).click();
    await intake.getByRole('checkbox', { name: 'I consent to physiotherapy assessment and treatment' }).check();
    await intake.getByRole('button', { name: 'Start Assessment →' }).click();
    await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    // ── Visit 1: one real finding (MMT), then sign & lock the note ──
    await sidebar.getByText('MMT', { exact: true }).click();
    await expect(page.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('select.pm-compact-select').first().selectOption('5');

    await sidebar.getByText('Documentation', { exact: true }).click();
    await sidebar.getByText('SOAP Notes', { exact: true }).click();
    await page.getByRole('button', { name: 'Sign & lock note' }).click();
    await page.getByRole('button', { name: 'Confirm sign & lock' }).click();
    await expect(page.getByText('Note signed and locked successfully')).toBeVisible({ timeout: 10_000 });

    // ── Visit 2: a real follow-up via Quick Visit (a completely separate
    // code path from the main SOAP note -- QuickVisitForm/tx_sessions) ──
    await sidebar.getByText('Quick Visit', { exact: true }).click();
    await page.getByPlaceholder('e.g. 5').fill('6');
    await page.getByPlaceholder('e.g. 3').fill('3');
    await page.getByRole('button', { name: 'Exercise therapy', exact: true }).click();
    // Real CI failure: saveQuick() (AppModules.jsx) calls setSaved(true) and
    // navTo("soap") in the same synchronous handler -- the navigation
    // unmounts this form before the "Saved…" button-text change can ever
    // become visible in a real browser, a genuine race rather than a flaky
    // selector. Check we actually landed on SOAP Notes instead: since
    // visit 1's note is already signed & locked, arriving here should show
    // it under "Locked notes" (ClinicalModules.jsx's SOAPNoteModule).
    await page.getByRole('button', { name: 'Save & Go to SOAP →' }).click();
    await expect(page.getByText(/Locked notes/)).toBeVisible({ timeout: 10_000 });

    // ── Patient Profile -> Progress tab: confirm the follow-up visit
    // reached the Session Timeline with its real pain values, and that a
    // second session now exists (not just the original signed note) ──
    await sidebar.getByText('Profile', { exact: false }).click();
    const profile = page.getByTestId('patient-profile-modal');
    await profile.getByText('Progress', { exact: true }).click();
    await expect(profile.getByText('Session Timeline')).toBeVisible({ timeout: 10_000 });
    await expect(profile.getByText('NRS: 6→3')).toBeVisible();
    await expect(profile.getByText(/Exercise therapy/)).toBeVisible();
  });

  test('a patient created on one device is visible after signing in from a second, independent browser context', async ({ browser }) => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-xdev-${unique}@physiomind-test.dev`;
    const password = 'TestPass123!';
    const patientName = `E2E CrossDevice Patient ${unique}`;

    // ── "Device A": sign up, create a patient, save one real finding ──
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    // Capture the app's own console output (it already does
    // console.warn("[Supabase sync error]", e) on a failed upsert) into an
    // array, not just console.log -- a plain console.log only shows up in
    // the raw "Run E2E tests" step log, which turned out to be a dead end
    // for getting a diagnosis from CI output alone across several rounds.
    // Folding any captured warnings/errors directly into the *thrown error
    // message* below means they show up in the same failure summary
    // GitHub surfaces automatically, no digging into expanded step logs
    // required.
    const consoleIssues = [];
    pageA.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleIssues.push(`[console.${msg.type()}] ${msg.text()}`);
      }
    });
    pageA.on('pageerror', (err) => consoleIssues.push(`[pageerror] ${err.message}`));
    await pageA.goto('/');
    await pageA.getByRole('button', { name: 'Create free account' }).click();
    await pageA.getByPlaceholder('Dr. Aditi').fill('E2E Runner A');
    await pageA.getByPlaceholder('you@clinic.com').fill(email);
    await pageA.getByPlaceholder('Create a strong password').fill(password);
    await pageA.getByRole('button', { name: 'Create free account →' }).click();
    await pageA.getByRole('button', { name: 'Skip tour' }).click();

    const sidebarA = pageA.locator('.pm-sidebar');
    await expect(sidebarA.getByText('New Patient', { exact: false })).toBeVisible({ timeout: 10_000 });
    await sidebarA.getByText('New Patient', { exact: false }).click();
    const intakeA = pageA.getByTestId('intake-modal');
    await intakeA.getByPlaceholder('e.g. Riya Sharma').fill(patientName);
    await intakeA.getByRole('button', { name: 'Consent', exact: true }).click();
    await intakeA.getByRole('checkbox', { name: 'I consent to physiotherapy assessment and treatment' }).check();
    await intakeA.getByRole('button', { name: 'Start Assessment →' }).click();
    await expect(pageA.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    await sidebarA.getByText('MMT', { exact: true }).click();
    await expect(pageA.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 10_000 });
    await pageA.locator('select.pm-compact-select').first().selectOption('5');

    // Real CI failure: a flat 2s wait here isn't enough. AppFull.jsx's cloud
    // autosave effect (the one that pushes `data` edits to Supabase) itself
    // *debounces 2000ms before it even starts the network request* -- a
    // flat waitForTimeout(2_000) right after the edit is a race against that
    // same debounce, most likely closing the context just as the actual
    // network request began rather than after it finished. Wait for the
    // real "✓ Saved to cloud" indicator (cloudSaveStatus === "saved" in
    // AppFull.jsx) instead of guessing a duration -- this is the same
    // signal a real clinician would look at before assuming a save is safe.
    //
    // Follow-up real CI failures, seen repeatedly even after extending the
    // wait to 45s: still "element(s) not found", genuinely absent rather
    // than merely slow -- ruling out cold-start latency as the cause.
    // cloudSaveStatus (AppFull.jsx) has exactly one other terminal state,
    // "error" -- rendered as "⚠ Offline — will retry on next edit" -- so a
    // failed upsert is the live hypothesis now, not a timing issue. Race
    // both outcomes and, on failure, throw a message that embeds whichever
    // one appeared plus any captured console output, so the actual cause
    // shows up directly in the failure summary rather than requiring a
    // trip into the raw CI step log or the trace artifact.
    // Same dual-render class of bug as the .pm-patient-bar scoping below for
    // Device B: pm-mobile-hdr renders its own compact "· ⚠ Offline — will
    // retry" status (activePatient block) alongside pm-patient-bar's fuller
    // "⚠ Offline — will retry on next edit" -- both stay mounted regardless
    // of viewport (CSS just hides one), so an unscoped getByText against
    // `page` hits Playwright's strict-mode violation (2 elements) before
    // the intended assertion ever gets to run. Scope to .pm-patient-bar,
    // the real always-mounted desktop status source.
    const patientBarA = pageA.locator('.pm-patient-bar');
    try {
      await expect(patientBarA.getByText(/Saved to cloud|Offline — will retry/)).toBeVisible({ timeout: 45_000 });
      const stateText = (await patientBarA.getByText(/Saved to cloud|Offline — will retry/).first().textContent()) || '(none)';
      if (/Offline/.test(stateText)) {
        throw new Error(
          `Cloud save reached an error state instead of succeeding: "${stateText}". ` +
          `Console output captured during this page's lifetime:\n${consoleIssues.join('\n') || '(no console warnings/errors captured)'}`
        );
      }
    } catch (e) {
      throw new Error(
        `${e.message}\n\nConsole output captured during this page's lifetime:\n${consoleIssues.join('\n') || '(no console warnings/errors captured)'}`
      );
    }
    await contextA.close();

    // ── "Device B": a brand-new, fully independent browser context (no
    // shared cookies/localStorage/IndexedDB with Device A -- the closest
    // Playwright equivalent to a genuinely different physical device) ──
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/');
    // AuthScreen's default view is the Login form itself (confirmed by
    // reading AppFull.jsx's App() -- it renders <AuthScreen/> directly when
    // signed out; LandingPage/LandingAndAuth exist in the codebase but are
    // never actually rendered by anything, a separate dead-code finding not
    // acted on here). No toggle click needed -- Email/Password/"Sign in →"
    // are already visible.
    await pageB.getByPlaceholder('you@clinic.com').fill(email);
    await pageB.getByPlaceholder('••••••••').fill(password);
    await pageB.getByRole('button', { name: 'Sign in →' }).click();

    // Anchor point: confirm login actually landed in the main app shell
    // before reasoning about anything inside it. If this line itself ever
    // fails, the problem is login/session handling, not the patient bar.
    await expect(pageB.locator('.pm-sidebar')).toBeVisible({ timeout: 15_000 });

    // The first-time onboarding modal is gated on a per-browser localStorage
    // flag (pm_onboarded), independent of signup vs login -- Device B is a
    // genuinely fresh context, so it shows the same modal a signup would.
    // Dismiss it if present; don't hard-fail if some other timing means it
    // isn't (e.g. a slightly different mount order), since it's not the
    // actual thing this test is verifying.
    const skipTour = pageB.getByRole('button', { name: 'Skip tour' });
    if (await skipTour.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skipTour.click();
    }

    // Open the patient loader and confirm the SAME patient, created on
    // Device A, is visible via the real backend rather than any local
    // cache. Real CI failures chasing this: (1) getByText('Load Patient')
    // alone resolves to the MOBILE bottom-nav's hidden "👥 Load Patient"
    // button (pm-bnav-dx) too -- same dual-render class of bug as the
    // sidebar duplication elsewhere -- fixed by scoping to the real,
    // always-visible desktop `.pm-patient-bar` container. (2) Even scoped,
    // "Load Patient" alone still wasn't found -- that text only renders in
    // the *no active patient* branch of this bar; the *has active patient*
    // branch (a plausible outcome if the app auto-loads the most recently
    // used patient on login) shows "Switch Patient" instead, but both
    // buttons call the identical setShowPatientDb(true) handler, so either
    // one opens the same patient list. Matching both rather than assuming
    // which branch renders.
    const patientBar = pageB.locator('.pm-patient-bar');
    const openPatientList = patientBar.getByText(/Load Patient|Switch Patient/);
    await expect(openPatientList).toBeVisible({ timeout: 15_000 });
    await openPatientList.click();
    await expect(pageB.getByText(patientName)).toBeVisible({ timeout: 10_000 });

    await contextB.close();
  });
});
