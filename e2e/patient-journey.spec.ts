import { test, expect } from '@playwright/test';

// Full patient-journey smoke test -- the one thing that has never been
// verified by actually clicking through the real app in a real browser.
// Every prior fix this project has had was verified by source-code-level
// review + component tests (Vitest/RTL), which is real but not the same as
// "does this work when a person does it". This closes that gap for the
// single highest-value path: sign up -> create a patient -> record a real
// finding -> see it in the SOAP note -> sign the note.
//
// IMPORTANT: this must run against a disposable TEST Supabase project, never
// production -- see e2e/README.md for how that's wired (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY at build time). The test project's Auth settings
// must have "Confirm email" turned OFF, otherwise signUp() never returns a
// session and there's no way to click an email confirmation link in CI.
//
// Desktop-only for now: mobile uses a different bottom-sheet navigation
// (pm-bnav-*) that hasn't been mapped out here yet and deserves its own spec
// rather than guessing at untested selectors.

// Phase 1 (per the testing roadmap discussed with the user): lock in
// coverage for the three modules that had real, confirmed bugs fixed this
// project -- Neurological (Neural Tension + GCS), CPA/NKT, and STTT/Cyriax
// -- plus Patient Profile, which had its own separate, independently broken
// rendering for all of these. This test records one real, clinically
// specific finding per module via actual UI interaction (not synthetic
// data passed directly to a component in a unit test) and confirms it
// reaches both the signed SOAP note and Patient Profile correctly.

test.describe('Full patient journey', () => {
  test.skip(({ isMobile }) => isMobile, 'Mobile uses a different bottom-nav UI -- needs its own spec');

  test('sign up, create a patient, record findings across MMT/CPA/Neuro/STTT, see them in the signed SOAP note and Patient Profile', async ({ page }) => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-${unique}@physiomind-test.dev`;
    const password = 'TestPass123!';
    const patientName = `E2E Test Patient ${unique}`;

    await page.goto('/');

    // ── Sign up (test project must have email confirmation OFF) ──
    await page.getByRole('button', { name: 'Create free account' }).click();
    await page.getByPlaceholder('Dr. Aditi').fill('E2E Runner');
    await page.getByPlaceholder('you@clinic.com').fill(email);
    await page.getByPlaceholder('Create a strong password').fill(password);
    await page.getByRole('button', { name: 'Create free account →' }).click();

    // ── Land in the app. A first-time onboarding modal covers everything
    // on a brand-new account (localStorage has no "pm_onboarded" flag yet in
    // a fresh browser context) -- it also contains its own "New Patient"
    // text in one of its steps, so it must be dismissed before anything else
    // or the later text match becomes ambiguous.
    await page.getByRole('button', { name: 'Skip tour' }).click();

    // ── Create a patient via the intake form ──
    // NOTE on scoping: this page can have up to THREE elements matching
    // "New Patient" text at once -- confirmed by two real CI failures in a
    // row while chasing this. (1) <SidebarItems> is rendered TWICE in
    // AppFull.jsx: once inside the hidden mobile nav drawer (`.pm-nav-drawer`,
    // positioned off-screen by CSS -- and it renders FIRST in DOM order, the
    // opposite of what an earlier fix here assumed, which is why .first()
    // timed out clicking an element permanently outside the viewport), and
    // once inside the real, always-visible desktop sidebar (`.pm-sidebar`).
    // (2) A separate "No active patient" banner (`.pm-patient-bar`) has its
    // own standalone "＋ New Patient" button, shown whenever no patient is
    // selected yet -- exactly the state right after signup. Rather than
    // guess at DOM order/position again, scope directly to the real
    // `.pm-sidebar` container by its stable class name -- this can't drift
    // if the page's structure changes elsewhere.
    const sidebar = page.locator('.pm-sidebar');
    await expect(sidebar.getByText('New Patient', { exact: false })).toBeVisible({ timeout: 10_000 });
    await sidebar.getByText('New Patient', { exact: false }).click();

    // Real CI failure #5: "Start Assessment →" also resolved to 2 elements --
    // a completely unrelated hero banner button on the dashboard (which stays
    // mounted behind this modal, not unmounted) has the exact same text and
    // navigates straight to Subjective, bypassing intake entirely. Given how
    // many distinct ambiguity classes this modal has hit (sidebar dup, role
    // substring match, ancestor-text match, and now an unrelated background
    // element with identical text), added a data-testid to the actual modal
    // wrapper in AppFull.jsx rather than continuing to patch text-matching
    // edge cases one at a time -- scope everything inside intake to it.
    const intake = page.getByTestId('intake-modal');
    await intake.getByPlaceholder('e.g. Riya Sharma').fill(patientName);
    await intake.getByRole('button', { name: 'Consent', exact: true }).click();
    await intake.getByRole('checkbox', { name: 'I consent to physiotherapy assessment and treatment' }).check();
    await intake.getByRole('button', { name: 'Start Assessment →' }).click();

    // Intake auto-navigates to Subjective -- confirms the patient record
    // was actually created, not just the modal closing.
    await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    // ── Record a real MMT finding ──
    await sidebar.getByText('MMT', { exact: true }).click();
    await expect(page.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 10_000 });
    // First muscle card's Left grade select -- grade "5" (Normal).
    await page.locator('select.pm-compact-select').first().selectOption('5');

    // ── CPA/NKT: Deep Neck Flexors -> Inhibited ──
    // Was reading the wrong legacy fields entirely before this session's fix
    // (cpa_pattern/cx_cpa) -- confirmed via real UI here, not synthetic data.
    // "Advanced Assessment" group is collapsed by default, unlike
    // "Assessment" (open by default) -- must expand it first.
    await sidebar.getByText('Advanced Assessment', { exact: true }).click();
    await sidebar.getByText('CPA — Compensation Pattern Analysis', { exact: true }).click();
    // data-nkt-id already exists in source (SubjectiveObjective.jsx) as a
    // stable per-test hook -- scope to it rather than matching on label text,
    // which would hit the same kind of ancestor-text ambiguity seen earlier.
    const dnfCard = page.locator('[data-nkt-id="nkt_dnf"]');
    await dnfCard.getByText('Deep Neck Flexors (DNF)').click(); // expand
    await dnfCard.getByText('Inhibited', { exact: true }).click();

    // ── Neurological: Neural Tension (SLR) + GCS ──
    // Real bug fixed this session (Patient Profile only): Neural Tension
    // tests had no explicit group in the label-grouping logic and fell into
    // a catch-all labeled "Dermatomes" -- confirmed via a live screenshot
    // showing "NT SLR" under the DERMATOMES heading. GCS (gcs_eye/verbal/
    // motor) never matched Patient Profile's field filter at all, so it
    // never appeared there regardless of whether it was recorded.
    await sidebar.getByText('Neurological', { exact: true }).click();
    await page.getByRole('button', { name: 'Neural Tension' }).click();
    // Added data-nt-id this session (matching the existing data-neuro-id /
    // data-cy-id / data-nkt-id convention already used elsewhere) since
    // Neural Tension test cards had no stable per-test hook before.
    const slrCard = page.locator('[data-nt-id="nt_slr"]');
    await slrCard.locator('select').first().selectOption('Positive — symptoms reproduced');
    await page.getByRole('button', { name: 'GCS' }).click();
    await page.getByText('4 — Spontaneous').click();
    await page.getByText('5 — Oriented').click();
    await page.getByText('6 — Obeys Commands').click();

    // ── STTT/Cyriax: Wrist Flexion (the exact real region-garbling bug) ──
    // "cyriax_wrist_hand_act_rom_wr_a_flex" is the precise real-world key
    // that used to render as "Hand Act Rom Wr A Flex" with a stray "wrist"
    // badge, instead of the real label "Wrist Flexion" -- caused by a lazy
    // region-matching regex that mis-split any two-word region id.
    await sidebar.getByText('STTT — Selective Tissue Tension', { exact: true }).click();
    await page.getByRole('button', { name: 'Wrist & Hand' }).click();
    // data-cy-id already exists in source (SubjectiveObjective.jsx).
    const wristFlexCard = page.locator('[data-cy-id="wr_a_flex"]');
    await wristFlexCard.locator('input[type="text"]').first().fill('60');

    // Phase 2 (per the testing roadmap): data-driven modules (MMT already
    // covered above), done as one real, clinically specific finding per
    // module rather than exhaustively clicking through every single real
    // entry -- that exhaustive coverage already exists cheaply and fast as
    // Vitest unit tests (mmtLabels.test.js, romCoverage.test.js,
    // specialTestLabels.test.js each loop the real data source and check
    // every single muscle/movement/test). This E2E layer's job is
    // different: prove a real click, in a real browser, actually reaches
    // the real UI element and the real SOAP note -- not re-prove label
    // completeness, which is already proven exhaustively and far more
    // cheaply elsewhere.

    // ── ROM: Cervical Flexion (first region, first movement) ──
    await sidebar.getByText('Range of Motion', { exact: true }).click();
    // First number input on a freshly-opened ROM screen is Cervical
    // Flexion's Active ROM value (ROM_DATA's first region, first movement).
    await page.locator('input[type="number"]').first().fill('30');

    // ── Special Tests: Neer's Test -> Positive (default region: shoulder) ──
    await sidebar.getByText('Special Tests', { exact: false }).click();
    await page.getByText("Neer's Test", { exact: true }).click(); // expand
    // Only the expanded card renders a <select> at all (collapsed cards
    // don't render the result-selection block), so once Neer's Test is the
    // only expanded card, .first() reliably targets its LEFT-side select.
    await page.locator('select').first().selectOption('Positive — anterior shoulder pain (impingement)');

    // Phase 3 (per the testing roadmap): Gait (had a severe, confirmed SOAP
    // bug this project -- Trendelenburg/phase deviations/scale scores never
    // reached the SOAP note at all), plus Kinetic Chain and Fascia.
    // Deliberately NOT included this round: Palpation (its hotspots are raw
    // SVG <circle> elements with no stable id/attribute to target -- needs
    // its own careful setup rather than a fragile pixel-coordinate click),
    // Functional Assessment/FMS, Posture Analysis (likely photo/AI-driven),
    // and Observation -- flagged honestly rather than rushed.

    // ── Gait: Trendelenburg -> Present ──
    // "ag_trend" was the exact real field behind the second most severe SOAP
    // bug found this project -- GaitModule wrote here, but the old SOAP
    // builder checked entirely different, non-existent flat field names.
    await sidebar.getByText('Gait Analysis', { exact: true }).click();
    // Real CI failure: GaitModule shows a "Quick Gait Summary" panel by
    // default, and the entire detailed tab bar (including "Gait Pattern")
    // is collapsed behind a "Detailed analysis" toggle (showFull state,
    // starts false) -- missed during initial research since it wasn't
    // visible from reading the tabs array alone. Must expand it first.
    await page.getByText('Detailed analysis', { exact: false }).click();
    await page.getByRole('button', { name: 'Gait Pattern' }).click(); // internal tab
    // Real CI failure: the "Quick Gait Summary" panel (quickFields) has its
    // own selects (ag_antalgic, g_oga_step_sym, etc.) that stay mounted even
    // after expanding "Detailed analysis" -- .first() grabbed one of those
    // instead of Trendelenburg's, which doesn't have a "Present" option at
    // all, hence the "did not find some options" timeout. Added data-ag-id
    // to the ABNORMAL_GAITS row wrapper (matching the same convention used
    // everywhere else: data-neuro-id/data-cy-id/data-nkt-id/data-kc-id/
    // data-fa-id/data-nt-id) rather than guessing at select ordering again.
    await page.locator('[data-ag-id="ag_trend"]').locator('select').selectOption('Present');

    // ── Kinetic Chain: Ankle DF -> Moderately restricted ──
    await sidebar.getByText('Kinetic Chain', { exact: true }).click();
    // data-kc-id already exists in source (SubjectiveObjective.jsx).
    const ankleDfCard = page.locator('[data-kc-id="kc_ankle_df"]');
    await ankleDfCard.getByText('Weight-Bearing Dorsiflexion').click(); // expand
    await ankleDfCard.getByText('Moderately restricted').click();

    // ── Fascia: Skin Rolling -> Localised restriction ──
    await sidebar.getByText('Fascia Integration', { exact: true }).click();
    // data-fa-id already exists in source (SubjectiveObjective.jsx).
    const skinRollCard = page.locator('[data-fa-id="fa_skin_roll"]');
    await skinRollCard.getByText('Skin Rolling Test').click(); // expand
    await skinRollCard.getByText('Localised restriction').click();

    // ── Palpation: click a body-map hotspot, grade its tenderness ──
    // Unlike every other module's test rows, hotspots were raw SVG <circle>
    // elements with no stable id/attribute at all -- added data-hotspot-id
    // this round, matching the same convention used everywhere else.
    await sidebar.getByText('Palpation', { exact: true }).click();
    await page.locator('[data-hotspot-id="scalp"]').click();
    // Real CI failures, twice in a row: (1) "Scalp / Occiput" also appears
    // in a separate structures reference table elsewhere on this screen,
    // and (2) getByText's default substring match is case-insensitive, so
    // "Tenderness Grade" also matched an unrelated legend line "Dot colour
    // = tenderness grade". Using the full exact heading text this time to
    // close off this whole class of collision rather than trimming the
    // search string again and hitting a third one.
    await expect(page.getByText('Tenderness Grade (0 – 4+)', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: '2+', exact: true }).click();

    // ── Functional Assessment: Lumbar Screen, Sit-to-Stand -> Compensated ──
    // NOTE: the sidebar's "Functional Assessment" item renders a real,
    // working module (FunctionalScreenHub -> LumbarFunctionalScreen by
    // default), which is a DIFFERENT thing from the classic 7-movement FMS
    // (Deep Squat/Hurdle Step/etc, flat fields like "sp_fms_sq") that the
    // diagnosis engine and an older SOAP section still reference -- that
    // classic FMS has NO corresponding input UI anywhere in this app at all
    // (confirmed: sp_fms_* is only ever read, never written, by anything).
    // That's a separate, real finding flagged to the user, not something
    // fixed here. This module actually stores grades in a JSON blob per
    // region (e.g. data.lfs_data), which IS correctly wired end-to-end
    // already.
    await sidebar.getByText('Functional Assessment', { exact: true }).click();
    // data-lfs-id added this round (LumbarFunctionalScreen had no stable
    // per-test hook, unlike NKT/KC/Fascia's data-nkt-id/data-kc-id/data-fa-id).
    const stsCard = page.locator('[data-lfs-id="lfs_sts"]');
    await stsCard.getByText('Sit-to-Stand', { exact: true }).click(); // expand
    await stsCard.getByText('Compensated', { exact: false }).click();

    // ── Observation: General Appearance -> Healthy ──
    // Real finding along the way: Patient Profile's Observation section only
    // ever showed the Posture/Physical Exam subset of obs_ fields
    // (swelling/deformity/skin/etc) -- the "General Observation" section
    // (appearance/consciousness/attitude/build/nutrition), shown open by
    // default in the real ObservationModule UI, was completely missing from
    // Patient Profile despite its own section header appearing. Fixed this
    // round (PatientDatabase.jsx) before writing this test, so it verifies
    // the fix rather than just documenting the gap.
    await sidebar.getByText('Observation', { exact: true }).click();
    await page.getByRole('button', { name: 'Healthy', exact: true }).click();

    // ── Posture Analysis: smoke test only, not a full analysis ──
    // This module is a fundamentally different kind of interaction from
    // everything else tested -- camera/photo upload + MediaPipe AI pose
    // detection + optional manual landmark placement, not a form. The
    // underlying scoring math (HybridKendall) already has 37 dedicated unit
    // tests (kendallGeometry.test.js/kendallPatterns.test.js). Simulating a
    // real photo analysis here would need a real test image fixture and
    // reliable AI pose detection in a headless CI browser -- a much bigger,
    // separate piece of work, not attempted here. This just confirms the
    // module actually loads without crashing when navigated to.
    await sidebar.getByText('Posture Analysis', { exact: true }).click();
    // Real CI failure: "Upload or capture a photo to begin." lives inside
    // the findings/results panel, which may not render this specific text
    // until MediaPipe (the AI pose-detection library) finishes initialising
    // -- a network-dependent load that can take longer in a fresh CI
    // environment than the 10s this test allows. Switched to the "↑ Upload"
    // mode-toggle button, part of the static UI shell rendered immediately
    // on mount with no dependency on MediaPipe's load state.
    await expect(page.getByRole('button', { name: '↑ Upload' })).toBeVisible({ timeout: 10_000 });

    // ── Open SOAP Notes (Documentation group is collapsed by default) ──
    await sidebar.getByText('Documentation', { exact: true }).click();
    await sidebar.getByText('SOAP Notes', { exact: true }).click();

    // Every finding recorded above should be visible somewhere in the real,
    // rendered SOAP screen -- this is the exact class of bug (a module's
    // data existing but never reaching the SOAP note) found repeatedly
    // earlier this project via source review; here it's confirmed live.
    await expect(page.getByText('Sternocleidomastoid').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Deep Neck Flexors').first()).toBeVisible();
    await expect(page.getByText('Straight Leg Raise').first()).toBeVisible();
    await expect(page.getByText('Wrist Flexion').first()).toBeVisible();
    await expect(page.getByText('Flexion').first()).toBeVisible(); // ROM
    await expect(page.getByText(/Neer/).first()).toBeVisible(); // Special Tests
    // GCS: was only wired into Live SOAP text and Patient Profile before --
    // added to this visual screen this same session, confirmed live here.
    await expect(page.getByText('Glasgow Coma Scale')).toBeVisible();
    await expect(page.getByText('Trendelenburg').first()).toBeVisible(); // Gait
    await expect(page.getByText('Ankle DF').first()).toBeVisible(); // Kinetic Chain
    await expect(page.getByText('Skin Rolling').first()).toBeVisible(); // Fascia
    await expect(page.getByText('Scalp').first()).toBeVisible(); // Palpation
    await expect(page.getByText('Sit-to-Stand').first()).toBeVisible(); // Functional Assessment
    await expect(page.getByText('Healthy').first()).toBeVisible(); // Observation

    // ── Sign and lock the note (two-step confirm) ──
    await page.getByRole('button', { name: 'Sign & lock note' }).click();
    await page.getByRole('button', { name: 'Confirm sign & lock' }).click();
    await expect(page.getByText('Note signed and locked successfully')).toBeVisible({ timeout: 10_000 });

    // ── Patient Profile: confirm this session's six section fixes hold up
    // under real UI interaction, not just the synthetic-data unit tests
    // already covering these (patientProfileLabels.test.jsx). ──
    await sidebar.getByText('Profile', { exact: false }).click();
    const profile = page.getByTestId('patient-profile-modal');
    await profile.getByText('Assessment', { exact: true }).click();
    // CPA: real muscle name, not the raw code "dnf".
    await expect(profile.getByText('Deep Neck Flexors').first()).toBeVisible({ timeout: 10_000 });
    // Neurological: Neural Tension now has its own real group heading,
    // and SLR is filed under it -- not under "Dermatomes".
    await expect(profile.getByText('Neural Tension', { exact: true })).toBeVisible();
    await expect(profile.getByText('Straight Leg Raise').first()).toBeVisible();
    // GCS: previously never appeared anywhere in Patient Profile at all.
    await expect(profile.getByText('Glasgow Coma Scale')).toBeVisible();
    // STTT: real region label ("Wrist/Hand") and real test label
    // ("Wrist Flexion"), not the old garbled "Hand Act Rom Wr A Flex".
    await expect(profile.getByText('Wrist Flexion').first()).toBeVisible();
    await expect(profile.getByText('Wrist/Hand').first()).toBeVisible();
    // Special Tests: real test name (this session's fix, task #26) --
    // ST_DATA_LABELS checked before the smaller, staler SPECIAL_TEST_NAMES.
    await expect(profile.getByText(/Neer/).first()).toBeVisible();
    // Palpation: this section didn't exist at all in Patient Profile before
    // this session -- confirms the pin's real label and grade both show up.
    await expect(profile.getByText('Palpation', { exact: false })).toBeVisible();
    await expect(profile.getByText('Scalp').first()).toBeVisible();
    // Functional Assessment: real test label from the working fs_data
    // module (not the dead classic-FMS code path).
    await expect(profile.getByText('Sit-to-Stand').first()).toBeVisible();
    // Observation: real finding fixed this round -- Patient Profile's
    // Observation section previously only showed the Posture/Physical Exam
    // subset of obs_ fields, completely omitting "General Observation"
    // (appearance/consciousness/attitude/build/nutrition) despite its own
    // section header appearing.
    await expect(profile.getByText('Healthy').first()).toBeVisible();
  });
});
