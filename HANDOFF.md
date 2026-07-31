# PhysioMind Pro — Testing Handoff

Project: React/Vite physiotherapy app.
Main folder: `~/Downloads/physiom-main 5/` — now a git repo (see Git status below).
Mirror copy: `physiom-dev 2`.
GitHub `github.com/dwivediaditi26-code/physiom` — remote confirmed reachable, has `main`/`dev`/2 bugfix branches.

## Git status (2026-07-30) — PUSHED

- `physiom-main 5` is `git init`'d, `origin` = `https://github.com/dwivediaditi26-code/physiom.git`.
- Commit `aac12f7` ("Fix test suite: localStorage polyfill, button label rename, e2e locator fixes") is pushed and live on `origin/main` (was `06d70af`, fast-forward, no conflicts, no force needed).
- Pushed with the token from chat, used once as a one-off URL argument (never written to `.git/config`, never stored on disk). **That token now has a live push under its belt — revoke it today**, it does not get safer by having been "used already."
- Committed: `setupTests.js`, `fasciaInSoap.test.jsx` (new), the 9 renamed-label test files, `e2e/appMap.ts`, `e2e/commands.spec.ts`, `package-lock.json`.
- Commit `e418f0f` ("Hide Live capture entry point in posture analysis UI") is also pushed and live on `origin/main`, on top of `aac12f7`. Removed the "Live" mode-toggle button in `src/PostureEngine.jsx` (students were seeing it); `startCamera`/`capturePhoto`/`stopCamera`/`flipCamera` and the `isLive` JSX branch are untouched, just unreachable from the UI now. Re-add `["live","▣ Live"]` to the mode-toggle array (~line 6298) to bring it back.
- Commit `f874525` ("Scope specialty tabs to Home/Demographics, trim AI panel, reuse ProbableDiagnosis in Subjective") is also pushed and live on `origin/main`, on top of `e418f0f`:
  - `AppFull.jsx` — Ortho/Neuro/Sports/Pedia/Cardio selector now only renders on `active==="home"` or `active==="demographics"` (was on every screen). New Patient's a separate full-screen modal, already covers whatever's behind it.
  - `AIAssistant.jsx` — removed "Fill patient record from this instead" button. Chat input/Send untouched; `extractToRecord()` left in place, unused.
  - `ProbableDiagnosis.jsx` — added optional `autoRun`/`hideButton` props (default `false`, fully backward-compatible with the existing SOAP/Docs usage in `ClinicalModules.jsx`).
  - `SubjectiveObjective.jsx` — renders `<ProbableDiagnosis autoRun hideButton>` in the Interpretation results view, triggered by the existing "Suggest probable objective assessment" button, no second button. Region-agnostic (12 regions), so covers every region.
  - Known inherited limitation: detects one primary region from data (+ known companion e.g. lumbar+SI); a case spanning unrelated joints only surfaces the first-detected region's differential — same as its existing SOAP/Docs usage, not a new gap.
- Commit `74b6134` ("Fix Body Chart requiring scroll on open; make palpated structures selectable") is also pushed and live on `origin/main`, on top of `f874525`:
  - `SubjectiveObjective.jsx` — the Body Chart sub-tab had a leftover `minHeight:200` empty div (`id="subjective-bodychart-slot"`, confirmed nothing else in the codebase targets that id) sitting directly above where the real chart (`LazyBodyChart`, mounted as a sibling in `AppFull.jsx`) renders. That dead 200px was pushing the chart below the fold, forcing a scroll on open. Dropped the `minHeight`, kept the id.
  - `ClinicalModules.jsx` (`PalpationModule`) — "Structures at this point" chips were inert display-only. Now clickable, single-select (same toggle pattern as Tenderness Grade right below), writing to a new `pin.structure` field via the existing `updatePin()`. Rides along automatically through the existing `palp_pins` persistence — no schema changes needed elsewhere. Selected structure also now shows in the pin-list summary line.
  - Follow-up done in the next commit below.
- Commit `d01bf36` ("Surface confirmed palpation structure in Live SOAP, SOAP note, and Patient Profile") is also pushed and live on `origin/main`, on top of `74b6134` — closes the gap flagged above:
  - `ClinicalModules.jsx` `buildRealtimeSOAP()` (feeds Live SOAP panel + PDF/export text) — region label now reads e.g. "Abdomen — External oblique" everywhere a palpation finding is listed.
  - `ClinicalModules.jsx` `SOAPNoteModule` — its own separate chip summary on the DOCS-tab SOAP screen now includes structure too.
  - `ClinicalModules.jsx` `PalpationModule` — mini per-pin summary now mentions structure (and shows even if structure is the only field set); "Palpation Summary — All Points" table got a new Structure column.
  - `PatientDatabase.jsx` — confirmed structure now shown as its own 🏗 badge in the patient profile's Palpation section, ahead of tenderness/temp.
  - All four just read the one `pin.structure` field already being written — no new persistence.
  - **Breaks 3 test files** — `aiPipeline10Regions.test.jsx`, `aiIntakeParser.test.jsx`, `aiChatReviewUI.test.jsx` all click/query the now-removed "Fill patient record" button. Left as-is — decide whether to update them or restore the button.
- Commit `242e482` ("Fix Neuro stream trapping all nav") is also pushed and live on `origin/main`, on top of `d01bf36`:
  - Bug: clicking "Neuro" beside "Ortho" killed the whole app's nav — no sidebar, no bottom nav, no Assessment/SOAP/Exercise tabs responded, only a manual reload got out.
  - `AppFull.jsx` — `STREAM_CONFIGS.neuro` (a real config, `streams/neuro.js`) existed even though `STREAMS`' neuro entry said `live:false`/"SOON". The routing ternary only checked `STREAM_CONFIGS[stream]`, so Neuro routed straight into `<AssessmentEngine>` anyway — a self-contained view with no nav of its own — while `stream !== "ortho"` made the main pane ignore `active`/sidebar clicks entirely.
  - Fix: routing now also requires `STREAMS.find(s=>s.id===stream)?.live`, same bar as Sports/Pedia/Cardio, so an unfinished stream always falls through to `StreamEnginePlaceholder` (has a working "← Back to Ortho" button) instead of the chrome-less engine.
- Commit `6131f97` ("Take Neuro stream live; add permanent Back-to-Ortho exit on AssessmentEngine") is also pushed and live on `origin/main`, on top of `242e482` — the actual "make Neuro live" step:
  - `AppFull.jsx` — `STREAMS`' neuro entry flipped `live:false` → `live:true`. `streams/neuro.js` is Step-2-complete (Templates/Demographics/Subjective/Objective/Plan phases, condition-aware `showIf`, per-condition checklists for Stroke/TBI/SCI/Parkinson's/GBS/MS/CP); its widgets (`streams/neuroWidgets.jsx` — GCS, Cranial, Reflexes, Coordination, Sensory, SensoryRegion, Myotome, NeuralTension, Vestibular, Perceptual, RedFlags) are the same components already proven under the old Neurological/Neuro Templates sidebar screens, not new/untested code.
  - Caught before shipping: flipping `live:true` alone would have reopened the exact trap fixed in `242e482` — `AssessmentEngine` itself has no back-out button, and `StreamSelector` (the only escape) is scoped to `active==="home"/"demographics"`, so it disappears the moment you navigate anywhere else while a stream is active, same dead-end as before.
  - Fix: `AssessmentEngine`'s render now always shows a small "← Back to Ortho" pill directly above it (mirrors `StreamEnginePlaceholder`'s existing button), independent of `active`. Closes this trap class for good — applies to any future stream flipped live (Sports/Pedia/Cardio unaffected, still `live:false` → placeholder).
- **Left uncommitted on purpose** (not mentioned in any handoff round, unclear if wanted):
  - `e2e/COMMANDS.md`, `e2e/ORTHO-CASES-README.md`, `e2e/ortho-cases.fixtures.ts`, `e2e/ortho-cases.spec.ts`
  - `.gitignore` (+2 lines, `.code-review-graph/` — auto-added by a local tool, harmless, unrelated to any task here)
  - `.claude/`, `.mcp.json`, `CLAUDE.md` — local tool config, probably shouldn't ever be pushed
  - A pile of OTHER AI-tool config that showed up untracked partway through this session: `.codebuddy/`, `.cursor/`, `.cursorrules`, `.gemini/`, `.kiro/`, `.qoder/`, `.vscode/`, `.windsurfrules`, `AGENTS.md`, `CODEBUDDY.md`, `GEMINI.md`, `QODER.md`, `opencode.jsonc`, `.github/code-review-graph.instruction.md` — didn't create these, don't know their origin (worth a look on your end), left fully alone.
  - Review and `git add` any of these separately if they should ship.
- Cosmetic only: local branch is still named `master` (rename to `main` hit the lock quirk below mid-operation, aborted safely, repo integrity confirmed via `git fsck` — clean every time). Doesn't affect what's on GitHub. Rename yourself anytime with `git branch -m master main` from a real Terminal — likely won't hit the same quirk there since it's probably specific to this session's bridge to your folder, not your Mac's disk itself.
- Quirk: this folder sits under a synced/cloud Downloads path, and while connected through this sandbox, git sometimes can't clean up its own `.git/*.lock` files (or, occasionally, a nested `.git/.git/` from a copy step) after a command. Harmless — if a command ever hard-fails on it, delete the named `.lock` file and retry. A few stray `.git-broken-backup*/` folders from these quirks sit in the project root — safe to ignore or delete manually later (this sandbox couldn't remove them either).

## ⚠️ Security — not yet done

A GitHub token and an account password were pasted into chat in earlier sessions (redacted here, do not re-add them to this file).

- Revoke the token: GitHub → Settings → Developer settings → Personal access tokens → delete.
- Change the account password.
- Don't paste credentials into chat going forward.

## Two test layers

- `npm test` (Vitest, 899 unit tests) — the real, reliable suite. Runs locally, free, no AI tokens.
- `npm run test:e2e` (Playwright browser tests) — smoke checks only; fragile, don't rely on for correctness.

## Fixes already made (local, uncommitted)

1. `src/__tests__/setupTests.js` — added in-memory `localStorage` polyfill. Node 22's native localStorage was shadowing jsdom's and crashing ~35 tests. This was the big one.
2. `src/__tests__/fasciaInSoap.test.jsx` — new test proving fascia findings reach the SOAP note (passes).
3. 10 test files — replaced old button label `/Review & Run Analysis/` → `/Suggest probable objective assessment/` (button was renamed in the app).
4. `e2e/appMap.ts` + `e2e/commands.spec.ts` — fixed `runAnalysis` (ambiguous locator) and `openSoap` (use "Live SOAP" button).

## Current status

`npm test` → 890 passing, 8 failing, 1 skipped.

**Stale tests (just update to match app):**
- `cervicalTestNav`, `thoracicTestNav` — Observation/Rib Springing now map to modules.
- `summaryModalCrash`, `objAssessTileNav`, `subjectiveFormContinuousScroll` — renamed labels / new two-step flow.

**Need a decision (possible real bugs — don't blindly fix):**
- `bodyChartRegions` — posterior thigh L/R overlap 0.57 (tap may hit wrong side).
- `extractionAuditTrail` — app auto-defaults region to "Knee (R)" when no side is given (should it assume a side?).

## Next

1. Revoke the exposed token (still live — see Security section).
2. Decide if the two flagged behaviors are intended. If yes, update those 2 tests. If no, fix the app.
3. Update the 6 stale tests.

## Token-saving strategy for future sessions

1. Don't paste full test output. Paste only the summary line (`Tests X failed | Y passed`) and `⎯⎯ FAIL` header lines, or run:
   `npm test 2>&1 | grep -E "✓|×|FAIL|Tests " | head -60`
2. Run single files while iterating: `npm test -- fasciaInSoap`
3. Strip noisy AI-harness logs: `npm test 2>&1 | grep -v "🤖"`
4. Batch asks — list all failing test names up front for one fix pass instead of one-per-message.
5. Prefer `npm test` (unit) over Playwright — unit failures are one-line, Playwright dumps whole-page HTML.

---
Generated 2026-07-30.
