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
- Commit `fca1ec6` ("Fix: navTo() didn't exit a live stream") is also pushed and live on `origin/main`, on top of `6131f97` — same symptom reported again after Neuro went live ("click Neuro, no other button works"), deeper root cause than the two fixes above:
  - `AppFull.jsx`'s `navTo()` (the one function behind every SidebarItems click, bottom nav, Home tiles, dashboard rows, patient-profile jumps, and Neuro Templates' own internal deep-link checklist) only ever did `setActive(key)` — it never touched `stream`. Every target `active` key only renders while `stream==="ortho"`, so firing `navTo` from inside a live stream updated the sidebar highlight but the main pane stayed frozen on `AssessmentEngine`. Confirmed this even broke `NeuroTemplatesHub`'s own checklist links (they call `navTo("neuro",...)`/`navTo("outcome",...)` to jump to the old standalone exam/outcome-scale tabs), so it wasn't Neuro-only, it was every navTo call site, all of them.
  - Fix: `navTo()` now calls `setStream("ortho")` unconditionally before `setActive(key)`. Audited every call site in the codebase — none of them ever want to stay inside a non-ortho stream after firing, so there's no case this breaks. The manual "← Back to Ortho" pill from `6131f97` stays too, for exiting without picking a specific screen.
- Commit `c512dac` ("Palpation body figure: add front hair, add Admin Mode point editor") is also pushed and live on `origin/main`, on top of `66b2759` — two asks against the Palpation module's own SVG figure (`ClinicalModules.jsx`), not Body Chart (separate component, confirmed by mistake first — real vendored inline SVG paths here, not an uploaded image like Body Chart uses):
  - **Hair**: vendored asset (`react-muscle-highlighter`, MIT) only ships hair geometry for the back-of-head view — `BODY_HAIR_BACK` existed, `BODY_HAIR_FRONT` did not, so anterior always rendered bald. Added `BODY_HAIR_FRONT`: a hand-built half-ellipse cap sized off `BODY_HEAD_FRONT`'s own bounding box (computed via `svg-path-bbox`: head spans x 302–426, y 126–254). Not a vendored-style match, but no longer blank. `BodyFigureSVG` now picks the hair path by `view` instead of only rendering it for `"back"`.
  - **Point editor**: the 65-point `ANATOMICAL_HOTSPOTS` array had no visual editor at all (unlike Body Chart's own separate Admin Mode for its region polygons). Added the same pattern here, adapted for single points instead of polygons — `BodyFigureSVG` now takes a `hotspots` prop instead of reading the module constant directly (so edits actually move the click target, not just a preview overlay); new `AdminHotspotOverlay` component drags a dot with local live-feedback state, committing to `editedHotspots` (persisted to `localStorage` under `palp_hotspot_overrides`) only on release; `handleHotspotClick` gated so dragging can't also record a palpation finding. "📋 Export corrected points" copies a ready-to-paste `const ANATOMICAL_HOTSPOTS = [...]` block; "↺ Reset to default" clears local overrides.
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

## 2026-08-05 — Duplicate "objective assessment for this condition" card, fixed for real

Root cause (unchanged from below): `genericPhase05.js` (Hip/Groin, Knee, Ankle/Foot, Elbow/Wrist/Hand — regions with no bespoke Phase 0.5 screen) and `ProbableDiagnosis.jsx` (mounted in the same Interpretation view since commit `f874525`) both call the identical `reasoningEngine/runReasoningFromData` and both rendered their own "objective assessment for this condition" card off the same "Suggest probable objective assessment" trigger.

**First attempt (superseded, see below):** removed `genericPhase05`'s block, kept only `ProbableDiagnosis`'s. Wrong call — user built `genericPhase05` deliberately and its priority-test list is the better UI (each test is a clickable button that deep-links to its module + a "?" explaining why it matters); `ProbableDiagnosis`'s equivalent list was plain, non-clickable text chips. Reverted.

**Final fix:** kept `genericPhase05` as the one card shown, upgraded its visual presentation to match what the user liked about `ProbableDiagnosis` (score/match-tier badge, colored Supports/Against/Not-yet-tested finding chips, evidence-confidence line, confidence-reduced warning), and removed the standalone `ProbableDiagnosis` auto-mount from this Interpretation view since it's now fully redundant.

- `src/ProbableDiagnosis.jsx` — exported its local `Chips` component (was module-private) so both files render tag chips with the exact same component, not a lookalike copy.
- `src/genericPhase05.js` — `runGenericPhase05()`'s per-condition object now also carries `band`, `missing` (full array, was previously only kept as a count), `evidenceConfidence`, `whyConfidenceReduced` — all already available on the underlying differential (`d`), just weren't being passed through before.
- `src/SubjectiveObjective.jsx`:
  - Import swapped from `ProbableDiagnosis` (default) to `{ Chips }` (named) from `ProbableDiagnosis.jsx`.
  - The `<ProbableDiagnosis autoRun hideButton>` mount (was ~line 4995, added in commit `f874525`) removed — see the comment left in its place for the full reasoning. **Not touched:** `ProbableDiagnosis.jsx` itself, and its separate, unrelated mount in `ClinicalModules.jsx`'s SOAP "Suggest Probable Diagnosis" card (`<ProbableDiagnosis data={data} onNav={onNav} />`, no autoRun/hideButton) — that one stays exactly as-is.
  - `genericPhase05`'s render block (Hip/Knee/Ankle-Foot/Elbow-Wrist-Hand) restored and extended with the score badge, `Chips` rows, evidence-confidence line, and confidence-reduced warning. Its clickable priority-test buttons and "assess by layer" cards are unchanged.
  - Scope note: this only touches the 4 `genericPhase05` families. Shoulder/Cervical/Lumbar/Thoracic each have their own bespoke Phase 0.5 block further down (not `genericPhase05`) — those were pulling from the same underlying differential as `ProbableDiagnosis` too, so removing the `ProbableDiagnosis` mount doesn't lose them anything, but their visual styling wasn't touched/upgraded this round — only asked to fix Hip/Groin-family + generic.
- Verified with `@babel/parser` on all 3 touched files — parse OK. `npm test` still can't run in this bash sandbox — confirmed the cause is unrelated to any of this: this sandbox is Linux (`aarch64`), `node_modules/@rolldown/` only has the `binding-darwin-arm64` package because `npm install` was originally run on the user's Mac, not this sandbox. No Linux binding was ever fetched. Real test confirmation needs to happen in a Terminal on the actual Mac.
- `src/__tests__/genericPhase05.test.jsx` and `genericPhase05ReviewRunAnalysis.test.jsx` — briefly renamed `.removed` during the first (wrong) attempt, restored to their real names. Untouched otherwise; their assertions (heading text, chip presence) should still hold against the new markup — reasoned through manually since the suite can't run here, not test-confirmed.
- Committed as `8c4af65` and pushed to `origin/main`. **Reverted the same session — see next entry.**

## 2026-08-05 (later) — Reverted commit 8c4af65 per user request

User asked to reverse all of the above. Did a `git revert` of `8c4af65` (not a hard reset/force-push — commit was already public on `origin/main`, so the safe move is a new commit that undoes it, keeping history intact) for the 3 code files:

- `src/ProbableDiagnosis.jsx` — `Chips` back to module-private (un-exported).
- `src/genericPhase05.js` — `band`, `missing`, `evidenceConfidence`, `whyConfidenceReduced` removed from the per-condition object again.
- `src/SubjectiveObjective.jsx` — back to importing `ProbableDiagnosis` (default) instead of `{ Chips }`; the `<ProbableDiagnosis autoRun hideButton>` mount restored in the Subjective Interpretation view; `genericPhase05`'s render block back to its plain pre-upgrade styling (no score badge/chips/evidence-confidence line).

Net effect: back to the exact behavior as of `261a3c8` — both cards (the plain-chip `ProbableDiagnosis` one and the boxed-row `genericPhase05` one) render again for Hip/Groin/Knee/Ankle-Foot/Elbow-Wrist-Hand, i.e. the original "why is it showing twice" duplication is back too. **This entry (and the one above) intentionally left in the log** rather than deleted, so the next session has the full history if this gets revisited — the two competing systems and the "keep genericPhase05, borrow ProbableDiagnosis's styling" plan are already worked out above if wanted again.

`src/__tests__/genericPhase05.test.jsx` / `genericPhase05ReviewRunAnalysis.test.jsx` untouched by the revert (they were already restored to their real names, and their assertions target markup unaffected by the revert either way).

## 2026-08-06 — Fixed genericPhase05's priority-test buttons (wrong Special Tests region)

Bug (found via screenshot): tapping a `genericPhase05` priority test — e.g. "Hip Scour test" under Hip/Groin — did navigate to the Special Tests screen, but always landed on **Shoulder** with nothing highlighted, because `SubjectiveObjective.jsx` built every one of these buttons with `ctx:null`, and `SpecialTestsSection` (same file, ~line 470-474) defaults its region to `"shoulder"` whenever `navContext.specialRegion` is missing. Looked broken/dead.

Shoulder, Cervical, Lumbar, and Thoracic's own Phase 0.5 blocks never had this problem — each has its own `*TestNav()` resolver (e.g. `shoulderPhase05.js`'s `shoulderTestNav()`) mapping a test's label to a real `{ specialRegion, highlightTest }`. `genericPhase05` (Hip/Knee/Ankle-Foot/Elbow-Wrist-Hand) never got one.

- New file `src/genericTestNav.js` — same pattern as `shoulderTestNav()`. Cross-referenced every `keyExams` label produced by `hip/knee/ankle/foot/elbow/wrist/hand.evidence.json` against the real test catalog in `SPECIAL_TESTS_DATA` (`sharedClinicalData.js`) to build the label → `{specialRegion, highlightTest}` map by hand (no fuzzy matching — a wrong deep link is worse than none). Findings:
  - `SPECIAL_TESTS_DATA` groups these as `"ankle_foot"` and `"elbow_wrist"` (not separate ankle/foot/elbow/wrist keys) and has **no `"hand"` category at all** — hand's keyExams currently have nothing to map to, same honest gap Shoulder already has for its own untooled items (imaging refs, etc).
  - Knee's "Ober's test" has no knee-catalog entry — pointed it at hip's `st_ober_test` (IT band/TFL is filed under Hip), same cross-region pattern `shoulderTestNav` already uses (`spurling_positive` → cervical).
  - Every `st_*` id referenced was verified to actually exist in `SPECIAL_TESTS_DATA` before committing (no dangling ids).
  - Tests without a Special Tests catalog match (ROM/MMT/palpation/imaging items — those live in other modules) resolve to `null` and fall back to the same non-clickable "📋 no dedicated module yet" chip Shoulder's own gaps already use — not guessed at.
- `SubjectiveObjective.jsx` — `genericPhase05`'s `c.keyExams.map(...)` now calls `genericTestNav(c.engineRegion, t)` and only marks a button clickable when a real target comes back, same `target ? {...} : {...fallback}` shape Shoulder's block already uses just above it in the same file.

**Process note — a mistake worth flagging:** the 2026-08-05 revert (previous entry) synced `.git` back into this mounted folder but never actually checked out the working-tree files to match the new `HEAD` — `cp -a .git` alone doesn't do that. Verification at the time only checked `git log`/`git fsck`/`HEAD` vs remote, not `git diff` against the working tree, so the stale (un-reverted) file contents sat on disk undetected until this session's edits exposed it. Caught and fixed by force-checking out `src/ProbableDiagnosis.jsx` and `src/genericPhase05.js` from `HEAD` (via `git show HEAD:path` + rewriting, since `git checkout` itself can't unlink files on this mount) before layering this fix on top. **Lesson for next time: after any `.git`-only sync-back on this mount, always confirm with `git diff` against the working tree, not just `git log`/`git fsck`.**

## 2026-08-06 (later) — genericTestNav extended to also deep-link ROM

Same bug class as the Special Tests fix above, for the ROM-flavored `keyExams` entries (e.g. hip's "Passive hip ROM with end-feel (capsular pattern)") -- they had no dedicated module match at all before, so they just fell back to the non-clickable "no dedicated module yet" chip.

- `src/genericTestNav.js` — each `MAP[region][label]` entry now carries a `kind: "special" | "rom"` discriminator. `kind:"rom"` entries carry `{ romRegion, romHighlights }` into `ROM_DATA` (`sharedClinicalData.js`), same shape `shoulderPhase05.js` and the existing "ROM" layer card (`layerNavButtons`) already use, and `genericTestNav()` now returns `{ nav:"rom", ... }` for those instead of always assuming Special Tests.
- Verified every `romRegion`/`romHighlights` id against the real `ROM_DATA` field lists before writing them (same no-guessing rule as the Special Tests map): Hip (`rom_hir/her/hflex/hext/habd/hadd`), Knee (`rom_kflex/kext`), Ankle (`rom_adf/apf/ainv/aev`), Foot (`rom_1mtpf/1mtpp`), Elbow (`rom_eflex/eext/esup/epro`), Wrist (`rom_wflex/wext/wrad/wuln`).
- Note: `ROM_DATA` has a genuine separate `"Wrist"` region (distinct field set from `"Elbow"`) even though the existing "Elbow / Wrist ROM" layer-card button collapses both into one `romRegion:"Elbow"` link for convenience — the new wrist keyExam entry points at the real `"Wrist"` region instead, so it's slightly more precise than that older button.
- 7 keyExam labels mapped this round (hip 1, knee 1, ankle 2, foot 1, elbow 1, wrist 1). Left unmapped on purpose (ambiguous / not a clean 1:1 to a ROM field, e.g. "Weight-bearing dorsiflexion lunge test", "Thumb ROM assessment", "Subtalar mobility assessment") rather than guess wrong — same honest-gap philosophy as the Special Tests map. `ROM_DATA` has no `"Hand"` region at all, so hand still has nothing to map to for either kind.
- `SubjectiveObjective.jsx` unchanged this round — its `genericTestNav(c.engineRegion, t)` call already handled whatever `nav`/`ctx` came back generically.

## 2026-08-06 (later still) — Functional Movement Screen (FMA layer card): fixed wrong-default-region, same bug class

Not a `genericPhase05` keyExam this time -- the "Functional (FMA)" card is one of the six generic "assess by layer" cards (Observation/Posture/Functional/ROM/Fascia/Outcome) rendered by `layerNavButtons`/`layerNavBtn`, shared across **every** region's Phase 0.5 block (bespoke Shoulder/Cervical/Lumbar/Thoracic blocks too, not just `genericPhase05`). It opens `FunctionalScreenHub` (`RegionalFunctionalScreens.jsx`, exported as `FMASection`) -- the app's actual Functional Movement Screen (region-specific functional tests: Deep Squat, ASLR, single-leg tests, etc. per region).

Same bug class as Special Tests/ROM: `layerNavBtn` never set a `ctx` for the `"fma"` key (only `"fascia"`/`"nkt"`/`"kinetic"` had special-cased ctx builders), so it always opened with `navContext={}` -- and `FunctionalScreenHub` defaults to `region:"lumbar"` whenever `navContext.fsRegion` is missing (`RegionalFunctionalScreens.jsx` ~line 4222). So clicking "Functional (FMA)" from e.g. a Hip or Knee condition card always landed on Lumbar's functional tests.

- `SubjectiveObjective.jsx` — new `FS_REGION_FOR` map (same convention as the existing `NKT_REGION_FOR`/`KC_REGION_FOR` tables right above it) translating each region-loop `family` string to `FunctionalScreenHub`'s region ids (`cervical`, `thoracic`, `lumbar`, `shoulder`, `hip`, `knee`, `ankle`, `wrist`). `layerNavBtn` now sets `ctx = { fsRegion: FS_REGION_FOR[family] }` for `m.key === "fma"`.
- `"Elbow/Wrist/Hand"` maps to `"wrist"` -- `FunctionalScreenHub` has no combined elbow+wrist+hand region, only separate `"elbow"` and `"wrist"` (labelled "Wrist/Hand" in its own UI), so `"wrist"` is the closer of the two options, not a blind guess.
- No per-test highlight here (unlike Special Tests'/ROM's `highlightTest`/`romHighlights`) -- `FunctionalScreenHub` only has a search box, no highlight-a-specific-test state to hook into. Region-correctness is the whole fix, and it's the same fix Special Tests/ROM needed.
- Broader blast radius than the previous two fixes on purpose: this one corrects the FMA card for **every** region's Phase 0.5 block, not just the four `genericPhase05` families, since `layerNavBtn` is shared code.

## 2026-08-06 (later still) — Outcome measures: fixed wrong-questionnaire mismatches (worse bug class than the last three)

Different from the Special Tests/ROM/FMA fixes: this one wasn't "opens the right module with no context," it was **silently opening the wrong questionnaire**. Worth flagging as more serious — a hip patient tapping "Oxford Hip Score" was being handed the Oxford *Knee* Score form.

Root cause: `outcomeScaleId()` (`SubjectiveObjective.jsx`) matches a measure name against `OUTCOME_SCALE_IDS` by substring (`name.includes(key)`). The map had both `"oxford knee": "oks"` and a bare `oxford: "oks"` fallback — so *any* "Oxford ___" measure matched `"oks"` (Oxford Knee Score), the app's only implemented Oxford scale.

Wrote a small Python harness against the actual `outcomeScaleId` matching logic and every region's real `conditionLayers.outcome` text (`reasoningEngine/regions/*.evidence.json`) to check all 51 distinct (region, measure) pairs for mismatches, rather than eyeballing it — found 5 real false positives, all via the same `oxford` key:

- Hip: **"Oxford Hip Score"**, "HAGOS (groin) + Oxford Hip", "VISA-G + Oxford Hip" → all were going to Oxford Knee Score.
- Shoulder: **"Oxford Shoulder Score"** → same wrong target.
- Foot: **"Manchester-Oxford Foot Questionnaire (MOXFQ)"** → same wrong target — not even a naming coincidence, just an unrelated foot questionnaire that happens to contain "Oxford."

Fix: deleted the bare `oxford: "oks"` fallback, kept only the specific `"oxford knee": "oks"`. Re-ran the same harness after the change — all 5 now correctly fall through to the existing "no in-app questionnaire yet" non-clickable state (confirmed via `sharedClinicalData.js`'s `SCALES`: no `ohs`, `oss`, or `moxfq` id exists in the app at all, so non-clickable is the honest, correct state, not a regression). "Oxford Knee Score" (knee region) still correctly matches `oks`.

Also checked the other 46 matched (region, measure) pairs from the same harness run for the same class of error (compound strings like "IKDC + KOOS + Tegner", "PRTEE + DASH") — those all matched a scale that's genuinely present in the string, just not the *only* one mentioned when several are combined; not a misdirection, left as-is.

This fix is universal like the FMA one — `OUTCOME_SCALE_IDS`/`outcomeScaleId` is shared code used by every region's outcome-measure buttons, not just `genericPhase05`'s four families.

## 2026-08-06 (later still) — Re-applied the genericPhase05 / ProbableDiagnosis merge, this time with explicit go-ahead

Same duplicate-card issue documented earlier this session (the "Duplicate objective-assessment card" and "Reverted commit 8c4af65" entries above) — user was shown the same duplication again via screenshot, confirmed explicitly this time to redo the merge. Identical change to what commit `8c4af65` did, reapplied on top of everything since (`b13ce40`/`d7db78e`/`ea275ee`/`7e80ace`):

- `src/ProbableDiagnosis.jsx` — `Chips` exported again.
- `src/genericPhase05.js` — per-condition object carries `band`, `missing`, `evidenceConfidence`, `whyConfidenceReduced` again.
- `src/SubjectiveObjective.jsx` — import back to `{ Chips }`; `<ProbableDiagnosis autoRun hideButton>` mount removed again (comment updated to reference this session's actual fix history instead of the original reasoning); `genericPhase05`'s card restyled with the score badge / colored finding chips / evidence-confidence line again.

One meaningful difference from the first time: `genericPhase05`'s priority-test buttons are no longer just "clickable but sends everyone to Shoulder" — they're the actually-fixed, correctly-deep-linking buttons from the Special Tests/ROM/FMA/Outcome fixes above. So keeping this card as the sole one is a stronger call now than it was the first time.

Verified with `@babel/parser` on all 3 files — parse OK. No leftover `ProbableDiagnosis` code references (checked via grep — only comments mention it by name now). `genericPhase05.test.jsx` / `genericPhase05ReviewRunAnalysis.test.jsx` assertions (`/Phase 0.5 — Hip \/ Groin condition matches/i` etc.) still match — new heading text is a superset (`💡 ... (ranked)` wrapped around the same core string), reasoned through manually since `npm test` still can't run in this sandbox (unrelated Mac-vs-Linux native binary issue, documented earlier).

## 2026-08-06 (later still) — Redesigned the merged card (user reviewed a mockup first, then approved)

Straight merge above still had two visually separate sections per condition (a "priority tests" box, then a separate set of "assess by layer" cards) and a text-heavy top (name + redundant "Weak match" pill + "45%" + a 3-line stat sentence). Showed the user a mockup via the visualize tool before touching code; got approval on this specific layout.

- New `src/SubjectiveObjective.jsx` components (right after `layerNavButtons`, ~line 189): `LAYER_TAG_COLOR` (key → accent color per layer type), `ActionRow` (compact single-line action: icon, label, colored type tag, "?" why-toggle), `GenericConditionCard` (the full per-condition card, extracted into its own component specifically so it can hold its own `useState` for the new collapse toggle — can't do that inline inside a `.map()` callback).
- Card layout, top to bottom: name + `{score}% · {tier}` (e.g. "45% · weak match") replacing the old redundant pill+text pair; a 5-segment strength bar colored by match tier; a single collapsed summary line (✓/✕/○ counts) that expands on tap into the existing `Chips` rows + evidence-confidence + confidence-reduced warning (was always-visible before, now progressive disclosure since "not yet tested" chips could run to 7+ items); one flat "Next best actions, in order" list merging what used to be two separate systems — `keyExams` (via `genericTestNav`, tagged "Special test" or "ROM") and the assessment-module "layer" cards (Observation/Posture/Functional/Fascia/Outcome, tagged with their own label) — instead of a boxed "objective assessment" section followed by a separate row of layer cards.
- `genericTestNav.js` — added a `kind` field (`"special"` / `"rom"`) to its return object so the new UI can tag/color actions by type; previously `kind` was only used internally to build `ctx`, never exposed.
- Outcome measures get expanded into the same flat list too (one row per named measure, tagged "Outcome measure"), replicating the existing `splitOutcomeMeasures`/`outcomeScaleId` logic (unchanged) rather than duplicating the whole `layerNavButtons` outcome branch.
- `src/__tests__/genericPhase05.test.jsx` — one assertion updated: `/Objective assessment — for this condition/i` (text that no longer renders) → `/Next best actions, in order/i` (the new section label). The other 3 tests in that file and all of `genericPhase05ReviewRunAnalysis.test.jsx` were checking the `Phase 0.5 — ... condition matches` heading and condition names only, both unchanged, so untouched.
- `objAssessTileNav.test.jsx` (checks no `onNav` call ever gets a `null` context) reasoned through, not run: `ActionRow`'s click handler uses the same `onNav(a.nav, a.ctx || {})` safety pattern the old `NavActionBtn` used, so the invariant holds; its `/OPEN|→/i` element-matching wasn't specific to the old layout to begin with (matches any `→` character anywhere on the rendered page, not just this card).
- Verified with `@babel/parser` on all touched files — parse OK. `npm test` still can't run in this sandbox (documented cause: this is a Linux sandbox, `node_modules` only has the Mac-installed native binding).

## 2026-08-06 (even later) — Hip/Groin header color tweak + wired MMT into genericTestNav

- `src/SubjectiveObjective.jsx`: `RC_S["Hip / Groin"]` was `#d946ef` (fuchsia-500, felt "too pink" to the user) → tried `#be185d` (deep rose) → tried `#ec4899` (pink-500) → user asked for literal "baby pink." Landed on `#FBCFE8` (pastel pink-200) as the fill, but a true pastel fails contrast with the hardcoded white header/tab text used by every other region. Added `RC_TEXT_OVERRIDE = {"Hip / Groin": "#9d174d"}` (deep rose) and wired it into the two places regCol was used as *text* rather than fill: the region header title/tag chips (~line 5283) and the active region-tab label (~line 5109). Every other region's color is dark/saturated enough that white text already works, so this only affects Hip/Groin — verified by grep that no other region's `regCol` text usage changed.
- User then asked why some "Next best actions" rows (e.g. "Resisted hip adduction (MMT)", "Palpation of adductor origin / pubic ramus", "Oxford Hip Score", "HOOS", "HAGOS", "iHOT-33") showed gray/non-clickable. Outcome-measure ones are a real content gap (the app only has HOOS-JR/KOOS-JR + Oxford Knee Score implemented, not full HOOS/HAGOS/iHOT-33/Oxford Hip — confirmed via grep across `sharedClinicalData.js`, nothing found). For MMT/palpation I initially (wrongly) told the user there was no dedicated module — user corrected me. Checked: `lazy_mmt.jsx` (→ `PhysioNeuro.jsx`'s `MMTModule`) and `lazy_palpation.jsx` (→ `ClinicalModules.jsx`'s `PalpationModule`) both exist and are real, wired-up nav targets (`"mmt"`, `"palpation"` are valid `navKey`s in `AppFull.jsx`). The actual gap: `genericTestNav.js` only ever implemented `kind:"special"` and `kind:"rom"` resolution — never `"mmt"`, so any "(MMT)" keyExam fell through to the honest "no dedicated module" fallback even though a module existed.
- User asked to wire in MMT (not palpation — `PalpationModule` takes no `navContext` at all, it's a free-form body-map hotspot picker with no region/highlight targeting to hook into, so that one's left as a known gap, not guessed at).
- `genericTestNav.js`: added `kind:"mmt"` support — resolves to `{ kind:"mmt", icon:"💪", nav:"mmt", ctx:{ mmtRegion, mmtHighlights }, why } }`, same shape as the `"rom"` branch, consumed by `MMTModule`'s `navContext.mmtRegion`/`navContext.mmtHighlights` (verified by reading `PhysioNeuro.jsx` directly — same "support array or single value" pattern ROM uses). Mapped 4 real keyExam labels to real `MMT_DATA` muscle IDs (verified every id + region string against `sharedClinicalData.js` programmatically, not by eye): Hip → "Resisted hip abduction (MMT)" (`mmt_gmed`+`mmt_gmin`, region `"Hip & Pelvis"`), "Resisted hip extension / knee flexion (MMT)" (`mmt_gmax`+`mmt_hamstr`), "Resisted hip adduction (MMT)" (`mmt_adduc`); Knee → "Resisted knee extension (MMT)" (`mmt_quad`, region `"Knee"`). Also picked up 3 elbow ones while in the data (`mmt_bicep`, `mmt_supinator`, `mmt_pt`, region `"Elbow & Forearm"`) since the same MMT-labeled-but-unmapped pattern existed there too.
- Note: `MMT_DATA`'s region keys don't match ROM's/Special Tests' — it's `"Hip & Pelvis"` not `"Hip"`, `"Elbow & Forearm"` not `"Elbow"` — documented in a new comment block in `genericTestNav.js` so this isn't a trap for future edits.
- `src/SubjectiveObjective.jsx` (`GenericConditionCard`, ~line 236): action tag/color logic extended from a two-way (`rom`/`special`) ternary to three-way, adding `"MMT"` tag with `#f97316` (orange) — distinct from ROM's purple and Special Tests' cyan.
- Verified with `@babel/parser` — both files parse clean. Verified all 8 new muscle-id/region pairs exist in `MMT_DATA` via a small Node script reading `sharedClinicalData.js` directly (not by eye).
- Palpation remains unwired — intentionally, since `PalpationModule` has no `navContext` support to target. Flagged to the user as a known follow-up, not silently left broken.

---
Generated 2026-07-30. Updated 2026-08-06.
