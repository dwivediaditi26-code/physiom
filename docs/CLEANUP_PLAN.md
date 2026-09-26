# PhysioMind: cleanup plan

**Date:** 2026-09-25 · **Based on:** [AUDIT_REPORT.md](AUDIT_REPORT.md) (commit `9e049f9`)

## In simple words

**Done so far:**

- Backup copy saved.
- Phone-app problems fixed (server calls, password reset, icon).
- Old unused code removed.
- GitHub's automatic Android build and checks work again.
- Main folder tidied and a guide added (`README.md`).
- All 58 broken automatic checks updated to match today's screens; GitHub now runs every check on each change (the "Checks" job).
- Leftover code behind the removed "Select from old patient data" button deleted.

**Next, in this order:**

1. ~~**Update the 58 old automatic checks** and make GitHub run them on every change.~~ Done.
2. **Merge copy-pasted code** (form boxes, voice input, photo upload) into one shared version each.
3. **Small phone-app settings**: app version number for the Play Store, backup setting for patient data, offline support inside the app.
4. **Set up the iPhone build** on GitHub.
5. **Reorganise the folders by feature** (Ortho, Neuro, Feed, Learn…). This is the biggest move, so it's last.
6. **Store release**: developer accounts, signing keys, store listings.

## Progress

| Done | Commit |
|---|---|
| Safety branch `cleanup/before-architecture-cleanup` (pushed) | at `6b41146` |
| Native app calls the live `/api/*`; password-reset link works in the app | `c263d49` |
| 2a dead files, R2 scaffold (your call: remove), 2c unused packages | `ff1a8fa` |
| Compare screen removed (your call); 2b + a wider scan of unused code inside live files (~3,600 lines) | `39c221b` |
| CI on Node 24: `npm ci` works again (Android build + the nightly AI check were failing on it) | `1a2b2e4` |
| Real app icon + splash for Android and iOS (source: `assets/logo.png`) | `3c894d2` |
| Section 3 root tidy-up + `README.md`; `vercel.json` build command simplified (the Vite plugin already stamps `sw.js`) | `4bb6664` |
| Step 1: the 58 stale checks updated to the current screens (see below); new "Checks" GitHub job runs typecheck + all tests on every push/PR; the "old patient data" list (`OrthoOldDataPicker`, `listOldPatientRecords`, old-flow import), unreachable since `b7fe240`, removed | `ab8152a` |
| Your call: the AI chat's hidden "Fill patient record" feature removed (review card, confirm/fill code, and the 15 skipped checks that only covered it). The shared mapping in `aiIntakeParser.js` stays, the older Subjective screen still uses it | `0f54280` |
| Your call: the whole AI Assistant chat removed (`AIAssistant.jsx`, the `api/chat.js` server endpoint, its screen entry). No button led to it any more, and the endpoint was marked "not shipping", so nothing visible changes; it also closes an unused paid AI endpoint. The AI-assisted assessment (speak/type the Subjective, `api/parse.js`) is separate and stays | `e127053` |
| Your call: the old step-by-step "Screening Workflow" removed -- its step bar and pages (Demographics, Body Regions, Subjective, AI, Chart/Palpation, Objective), the standalone ROM/MMT/Special Tests/Neuro/Gait/... pages only it opened, the old config-driven "stream" engine, and 20 files only they used. Kept: Treatment / Exercise Prescription / Home Protocol (patient profile's "Edit Program" and Learn open it) and Posture Analysis. A saved or browser-history link to a removed page now opens Home. `PhysioNeuro.jsx` is now unused but left in place while another session edits it -- delete it once that work is committed | this commit, "Remove the old Screening Workflow" |

What changed in the checks, in short: Home, Learn, Clinical (Today / Assess / Patients / Treatment), the New Assessment quick form and the Objective page's topic tabs were all redesigned in August–September, and the checks still looked for the old buttons and titles. They now follow the same taps a clinician makes today; the shared steps live in `src/__tests__/clinicalFlow.js`. PhysioFeed checks now expect the intended "signed-in failures show an error instead of faking success" behaviour (P7/P9), `/api/parse` checks go through its new login gate, and one check that printed after finishing (and made the whole run look failed) was fixed. Result: 1,193 pass, 0 fail.

Still marked "skipped" on purpose (1): it tracks a known engine bug in the older Subjective analysis (region names with L/R don't match, see `lumbarReviewRunAnalysis.test.jsx`). The other 15 skipped checks covered the AI chat's "Fill patient record" button and were removed with it.

`ConditionObjectiveAssessment.jsx` was skipped throughout because another session is working in it.

Rules for carrying out the rest:

- Before step 1: create the safety branch `cleanup/before-architecture-cleanup` at the current `main` and push it.
- One small commit per step. Each commit must pass `npm run build`, `npm run typecheck` and `npx vitest run` (all green since step 1; GitHub's "Checks" job shows it on every push).
- If a claim below turns out to be wrong while doing it (something *is* used), stop and keep the file.
- Never touch the uncommitted work of a parallel session. **`src/AppFull.jsx` changes need explicit permission.**

---

## 1. KEEP (no change)

Everything not listed in sections 2–6. In particular, everything in audit section **N** ("Files that must NOT be deleted"): `App.jsx`, the 19 live `lazy_*.jsx` wrappers, the tester entry, `aiIntakeTestHarness.js`, `public/*`, `vercel.json`, `android/`, `ios/`, `capacitor.config.ts`, `supabase/`, `e2e/`, `physiofeed/data/db.js`, and the mock-data files that live code still imports.

## 2. DELETE: only proven-unused

Evidence columns: **Imp** = imported by anything the app loads · **Route** = referenced by a screen/route · **Dyn** = loaded dynamically (`lazy`/`import()`/string lookup) · **Cap** = needed by Capacitor · **Tool** = needed by build/CI tooling · **Risk** = can removing it break something.

### 2a. Dead files

| File | Why unused | Imp | Route | Dyn | Cap | Tool | Risk / what else to update |
|---|---|---|---|---|---|---|---|
| `src/BodyChartInteractive.jsx` | replaced by `BodyChartPro.jsx`; import removed in `3d967f7` | no | no | no | no | no | none |
| `src/lazy_diagnosis.jsx` | its last user was removed in `fb78c7f` | no | no | no | no | no | none (`ProbableDiagnosis.jsx` itself stays; it's used elsewhere) |
| `src/cardioEvidence.js` | feature removed in `3b1b78c` | no | no | no | no | no | none |
| `src/cardioTreatmentSuggestions.js` | feature removed in `3b1b78c` | no | no | no | no | no | none |
| `src/neuroTreatmentCatalog.js` | feature removed in `3b1b78c` | no | no | no | no | no | none |
| `api/neuroTreatmentReasoning.js` | its only caller was removed in `3b1b78c`; nothing fetches `/api/neuroTreatmentReasoning` | no | no | no | no | Vercel deploys it as a function | none; removing it closes an unused paid (Groq) endpoint |
| `src/physiofeed/lib/supabase.js` | duplicate client, never imported | no | no | no | no | no | none; update the `PHYSIOFEED_HANDOFF.md` line that mentions it |
| `src/physiofeed/pages/ComingSoonPage.jsx` | no route uses it since `4f7c97b` | no | no | no | no | no | none |
| `src/physiofeed/components/profile/ExerciseGrid.jsx` | removed from the profile in `d605f57` | no | no | no | no | no | none; update the doc line in `PHYSIOFEED_HANDOFF.md` |
| `src/physiofeed/data/applicantsMock.js` | replaced by real data in `3c8324f` | no | no | no | no | no | none; 2 stale comments mention it |
| `src/DiagnosisEngine.js` | old engine removed in July; only `ALL_DIAGNOSES` is left and nothing in the app reads it | no | no | no | no | test only | also delete `src/__tests__/diagnosisEngineCleanup.test.js` (it only guards this file) |
| `src/groqSystemPrompt.js` | June prompt draft; the live prompts are in `api/*.js` | no | no | no | no | test only | edit `src/__tests__/groqModelMigration.test.js` to drop its `GROQ_CONFIG` check (the api/ checks stay) |
| `src/physiofeed/learn/interpretQuiz.js` | replaced by the per-item quiz builders | no | no | no | no | test only | also delete `src/__tests__/interpretQuiz.test.js` |

**Total:** 13 files, about 1,300 lines.

### 2b. Dead code inside live files

| Where | What | Evidence |
|---|---|---|
| `src/PatientDatabase.jsx:728-907` | `BodyChartInteractive` (second copy) | exported, no importer, not used in its own file |
| `src/orthoIndividualSuggestions.js:50-150` | `suggestCpaItems/KineticChainItems/FmaItems/SttItems` + `cpa/kc/fma/stt` `Why`/`How` | each name appears only at its definition |
| `src/orthoFieldKit.jsx` | `MiniSelect` (593-640), `GradeField` (802-818) | same |
| `src/orthoCommonSections.jsx:372-415` | `OutcomeMeasureSection` | same |
| `src/orthoSetupKit.jsx:240-251` | `ConditionGrid` | same |

### 2c. Unused packages

| Package | Evidence | Extra step |
|---|---|---|
| `@capacitor/preferences` | 0 imports | `npx cap sync` afterwards (it's registered in `android/capacitor.settings.gradle` and the iOS plugin list) |
| `@testing-library/user-event` (dev) | 0 imports | none |
| `@babel/parser` (dev) | 0 imports | none (still present through `@vitejs/plugin-react`) |

### 2d. Needs your decision

| Item | Options |
|---|---|
| **Cloudflare R2 upload scaffold**: `src/physiofeed/lib/r2Upload.js`, `api/uploadPresign.js`, the `@aws-sdk/*` packages, the R2 block in `.env.local.example` | "not wired in yet" since 2026-09-21. **Finish it** (wire it into post uploads) **or delete all of it.** Keeping it half-built is the worst option. |
| **"Subjective — New vs Old" screen**: `SubjectiveCompare.jsx` + the `subjective_compare` block in `AppFull.jsx` | Nothing navigates to it. A comment says it was kept on your instruction. Delete? (Needs an `AppFull.jsx` edit.) |
| `public/logo.png` | Not referenced in the repo. Delete unless it's used outside (store listing, social image, email). |

## 3. MOVE (root tidy-up, no code changes)

| From | To | Why |
|---|---|---|
| `supabase_rls_setup.sql`, `supabase_clinic_protocols_setup.sql` | `supabase/` | all the other SQL is already there |
| `HANDOFF.md` → `docs/history/`; `PHYSIOFEED_HANDOFF.md`, `PHYSIOFEED_MVP_MAP.md` → `docs/` | | older clinical notes are history; the PhysioFeed notes are still in use |
| `palpation-cloudinary-uploader.html` | `tools/` | content-authoring tool, not part of the app (not in the Vite build) |
| *(new)* `README.md` | repo root | there isn't one; it will point to `docs/` |

## 4. MERGE: one canonical implementation

For each item: write the shared version, switch the callers one file at a time, and diff the rendered output before and after. Some copies differ slightly on purpose (per-specialty colours and labels), so these aren't blind find-and-replace.

| Duplicate | Canonical target |
|---|---|
| Form field kit (~20 components) in `CardiopulmonaryAssessment.jsx`, `NeurologicalAssessment.jsx`, `orthoFieldKit.jsx` | `orthoFieldKit.jsx` → later `src/components/form/` |
| `useVoiceInput` (5) + `VoiceMicButton` (4) | `src/hooks/useVoiceInput.js` + one button component |
| Cloudinary upload (4 copies) | `src/services/cloudinary.js` → `uploadImage(file, publicId)` |
| `slugifyFinding` / `findingPhotoId` (2) | the same service. **Keep both ID formats exactly**, or every existing photo stops resolving. |
| Region reasoning helpers (`multicheckState`, `selectState`, `tierOf`, `specialTestValue`, `joinMulti`) | `src/utils/reasoningHelpers.js` |
| `categoryLabel` / `conditionLabel` / `settingLabel` (3 knowledge files) | one shared helper |
| Learn `toCard` (8), profile `EntryRow`/`NewEntryRow` (4) | one each |
| SW version stamping (`vercel.json` buildCommand + Vite plugin) | keep the Vite plugin; set `buildCommand` to plain `npm run build` |

## 5. REFACTOR: needed for the mobile apps (do these first)

| Issue | Change | Files |
|---|---|---|
| `/api/*` calls fail inside the native app (relative URLs) | add `apiUrl(path)`: returns `path` on the web, `https://physiom-sbs4.vercel.app` + `path` when `Capacitor.isNativePlatform()`. Use it at all 14 call sites. CORS already allows `*`. | `AIAssistant.jsx`, `AccountDeletion.jsx`, `OrthoAIIntakePanel.jsx`, `SubjectiveObjective.jsx`, `aiIntakeTestHarness.js`, `physiofeed/data/db.js` |
| Password-reset email link points at `https://localhost` in the app | on native, use the Vercel URL as `redirectTo` | `AuthScreen.jsx` |
| Placeholder app icon + splash | generate from `public/icon-512.png` / `logo.svg` with `@capacitor/assets` | `android/app/src/main/res/*`, `ios/App/App/Assets.xcassets/*` |
| Service worker registers inside the native app | skip registration when native | `index.html` |
| Play Store versionCode is fixed at `1` | read `versionCode` from a Gradle property (CI passes `github.run_number`), default `1` | `android/app/build.gradle`, `android-build.yml` |
| `allowBackup="true"` with patient data | set it to `false` | `AndroidManifest.xml` |

## 6. ARCHIVE

Nothing needs a separate archive branch: git history keeps every deleted file (`git log --all -- <path>`), and the safety branch keeps the whole pre-cleanup tree.

---

## 7. The big restructure (Phases 4–7): later, gated

Target layout (inside `src/`, PhysioFeed already mostly matches it):

```
src/
  app/            AppFull shell, entry, navigation
  components/     shared UI (form kit, modals, cards)
  features/
    auth/  patients/  ortho/  neuro/  cardio/  subjective-objective/  posture/
    ai-intake/  care-plan/  reports/  learn/
    feed/  profile/  explore/  people/  communities/  case-discussion/
    messaging/  notifications/  opportunities/  evidence/  admin/
  services/       supabase.js, db.js, cloudinary.js, api.js
  hooks/  utils/  data/ (condition JSON + static clinical data)  types/
```

**Gates, all of which must be true before starting:**

1. No other session has uncommitted work in the repo. (True at the time of the audit: the parallel session's profile/objective work landed as `9e049f9`. Re-check `git status` right before starting, because moving files under a live session loses its work.)
2. You've given explicit permission to edit `AppFull.jsx`. Every screen import lives there.
3. Steps 2–5 above are done, and `test.yml` CI is green.

**Method:** move one feature folder per commit with `git mv` (keeps history), update imports, build and test, commit. Leave `vite.config.js`'s `sharedClinicalData` chunk rule and the `lazy_*.jsx` boundaries working. The rule matches by filename, so check the chunk list before and after each move.

## 8. Order of work

| # | Step | Touches `AppFull.jsx`? | Needs a quiet repo (no other live session)? |
|---|---|---|---|
| 0 | Safety branch | – | no |
| 1 | Mobile blockers (section 5) | no | no (small edits at known lines) |
| 2 | Delete dead files + packages (2a, 2c) | no | no |
| 3 | Remove dead code inside live files (2b) | no | no |
| 4 | Update the 58 stale tests, add `test.yml` | no | no |
| 5 | Root tidy-up (section 3) + README | no | no |
| 6 | Your decisions (2d) | the compare screen needs it | – |
| 7 | Merge duplicates (section 4) | no | preferably (touches many files) |
| 8 | Restructure (section 7) | **yes** | **yes** |
| 9 | iOS workflow, `BUILD.md`, `MOBILE_SETUP.md`, `TESTING.md`, `ARCHITECTURE.md` | no | no |
