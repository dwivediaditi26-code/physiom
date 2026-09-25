# PhysioMind: repository audit

**Date:** 2026-09-25 · **Audited commit:** `9e049f9` (main) · **Scope:** read-only, no app code changed

This is Phase 1 of the cleanup: what the repo contains today, what is actually used, and what is stale.
The actions that follow from it are in [CLEANUP_PLAN.md](CLEANUP_PLAN.md).

## In simple words

A full check-up of the app, like an assessment before treatment. It found:

1. **The app is healthy.** It builds, and the website works.
2. **Old code was lying around**: 13 whole files and a lot of smaller pieces that the app never uses, left behind by features you removed earlier. ✅ *Removed on 2026-09-25.*
3. **Three problems only in the phone app:**
   - AI features, evidence search and delete-account couldn't reach the server
   - the "Forgot password" link went nowhere
   - the icon was Capacitor's default placeholder

   ✅ *All three fixed on 2026-09-25.*
4. **Some code is copy-pasted** in 3–4 places (form boxes, voice input, photo upload), so a fix in one copy doesn't reach the others. *Still to do.*
5. **58 automatic checks fail** because they still expect old screen designs. They aren't app bugs. *Still to do.*
6. **No passwords or secret keys were found in the code.** Good.

The rest of this page is the detailed evidence behind each point. It's a snapshot of 2026-09-25, so some items listed below are already fixed; [CLEANUP_PLAN.md](CLEANUP_PLAN.md) tracks what's done.

## How this was checked (so the "unused" claims can be trusted)

| Check | Method |
|---|---|
| Which files the app actually loads | Bundled **both** real entry points (`src/main.jsx`, `src/main-tester.jsx`) with esbuild and read its metafile. That follows static imports **and** every `lazy(() => import("…"))`, so a file missing from it is never loaded by the app. The repo has no `import.meta.glob` or `require()` in app code, so nothing is loaded by a pattern the bundler can't see. |
| Which exports are used | Parsed all 342 app files + `api/` with `@babel/parser` and matched every `export` against every `import` / re-export / dynamic import, keeping test-only usage separate. |
| Which screens are reachable | Matched each `active==="…"` screen in `AppFull.jsx` against every place in `src/` that navigates to that id. |
| Which packages are used | Searched every tracked `.js/.jsx/.ts` file for imports of each `package.json` dependency. |
| Current health | `npm run build`, `npm run typecheck`, `npx vitest run`, on `9e049f9` **and** on a clean copy of the previous commit `c79f468` (same results on both). |
| Native projects | Read `capacitor.config.ts`, `android/`, `ios/`; compared app icons/splash byte-for-byte with Capacitor's default template; ran `cap sync android` + Gradle debug and signed-release builds locally. |

---

## A. Current architecture

| Layer | What's there |
|---|---|
| UI | React 18 + Vite 5, plain JS/JSX. Inline styles almost everywhere; Tailwind is scoped to `src/physiofeed/**` only (preflight off). One TypeScript island: `src/reasoningEngine/` (clinical reasoning, 34 files). |
| App shell | `src/AppFull.jsx` (3,202 lines): auth gate, all top-level navigation, most screens. |
| Clinical app | ~200 files **flat** in `src/` (`Ortho*`, `ortho*`, `Neuro*`, `Cardio*`, `Subjective*`, `lazy_*.jsx`, `*Conditions.json`, `*Reasoning*.js`, …). |
| PhysioFeed (social) | `src/physiofeed/` (132 files), already organised as `components/ pages/ data/ lib/ context/ learn/`. `data/db.js` is the only data layer. |
| Backend | Supabase (auth, Postgres + RLS, realtime, storage). Vercel serverless functions in `api/` (Groq LLM parsing, PubMed/EuropePMC search, account deletion). Cloudinary for clinical photos (unsigned upload preset). |
| Hosting | Vercel, deployed by its GitHub integration on push to `main`. PWA: `public/manifest.webmanifest` + `public/sw.js`. |
| Native | Capacitor 8.5, `appId com.physiomindpro.app`, `webDir dist`. `android/` (Gradle 8.14.3, AGP 8.13, SDK 24–36) and `ios/` (Swift Package Manager, iOS 15+). |
| Size | 342 app source files (~130k lines) · 132 unit-test files (~14.8k lines) · 13 Playwright specs. Largest files: `PostureEngine.jsx` 9.6k, `ClinicalModules.jsx` 6.6k, `sharedClinicalData.js` 6.6k, `SubjectiveObjective.jsx` 6.4k lines. |

## B. Application entry flow

```
index.html ──▶ src/main.jsx
                 ├─ Vercel Analytics inject()
                 ├─ initNativeApp()            (Android back button + status bar; no-op on web)
                 ├─ installAiIntakeTestHarness (window.physioAITest, opt-in console tool)
                 ├─ installButtonRipple()
                 ├─ Sentry.init()              (only if VITE_SENTRY_DSN is set)
                 └─ <App/>  = src/App.jsx ──▶ re-exports src/AppFull.jsx
                                               ├─ supabase.auth.getSession() (8s timeout) + onAuthStateChange
                                               ├─ no session ─▶ AuthScreen.jsx (sign in / sign up / reset / guest / demo)
                                               └─ session   ─▶ AppInner (all screens)
index.html also registers /sw.js in production builds.

tester.html ─▶ src/main-tester.jsx ─▶ src/TesterEntry.jsx
               (standalone Ortho/Neuro/Cardio preview for external testers, served at /tester)
```

## C. Routing map

There is **no URL-based routing**. Refreshing the page always lands on the home screen. That's by design, but it means deep links can't exist today.

**Clinical app:** `AppFull.jsx` keeps an `active` screen id in state and mirrors it into `window.history` (pushState/popstate) so Back works. It has 32 screen ids:

`home · clinical · profile · physiofeed · demographics · subjective · subj_ai · subj_region · objective · observation · posture · palpation · chart_palpation · rom · mmt · special · neuro · neurotemplates · cyriax · fascia · nkt · fma · kinetic · outcome · exercise · treatment · assessment_report · specialty_profile · ortho_new_assessment · neuro_assessment · cardio_assessment · subjective_compare`

- **Dead screen:** `subjective_compare` ("Subjective — New vs Old"). Nothing in the app navigates to it. A code comment says it was kept "per instruction", so deleting it is your call.

**PhysioFeed:** react-router `MemoryRouter` (in-memory; the URL never changes).

| Access | Routes |
|---|---|
| Signed-in | `/feed` `/profile` `/profile/:userId` `/evidence` `/explore` `/communities` `/discussions` `/people` `/search` `/messages` `/saved` `/notifications` |
| Admin (UI hides unless `profile.isAdmin`) | `/admin/reports` `/admin/evidence` |
| Fallback | `/` and `*` → `/feed` |

`ProfileTabEntry.jsx` mounts its own MemoryRouter at `/profile`, and `LearnTabEntry.jsx` hosts the Learn tab.

**Vercel rewrites:** `/privacy` and `/terms` → `index.html`, `/tester` → `tester.html`.

## D. Feature map

| Feature | Where it lives today |
|---|---|
| Auth, guest mode, demo | `AuthScreen.jsx`, `DemoWalkthrough.jsx`, `AppFull.jsx` (session), `AccountDeletion.jsx` + `api/deleteAccount.js` |
| Patients | `PatientDatabase.jsx`, `SpecialtyPatientProfile.jsx`, `AppModules.jsx`, `localCrypto.js` |
| Ortho assessment | `OrthoAssessment.jsx` (+ `OrthoAssessmentNew.jsx` adapter), `OrthoIPD/Outpatient/PostOpAssessment.jsx`, ~45 `ortho*.js(x)` helpers, `ConditionObjectiveAssessment.jsx`, `*Conditions.json`, `*ReasoningEngine.js`, `*VariableExtractor.js`, `src/reasoningEngine/` |
| Neuro assessment | `NeurologicalAssessment.jsx`, `PhysioNeuro.jsx`, `NeuroCarePlan.jsx`, `neuro*.js`, `src/streams/` |
| Cardio assessment | `CardiopulmonaryAssessment.jsx`, `CardioCarePlan.jsx`, `cardio*.js`, `respiratoryData.js` |
| Subjective / Objective (legacy engine, still live) | `SubjectiveObjective.jsx`, `SubjectiveAssessmentNew.jsx`, `ObjectiveHub.jsx`, `ClinicalModules.jsx`, `lazy_*.jsx` (20 lazy wrappers) |
| Posture screening | `PostureEngine.jsx`, `HybridKendall.jsx`, `kendallPlumb.js`, `vitposeEngine.js`, `contourEngine.js`, `sagittalFindings.js` |
| AI intake | `AIAssistant.jsx`, `OrthoAIIntakePanel.jsx`, `aiIntakeParser.js`, `orthoAiIntake.js`, `api/parse.js`, `api/chat.js`, `api/extract*NoteVariables.js` |
| Care plans, exercises | `*CarePlan.jsx`, `orthoExercise*.jsx`, `neuroExercisePrescription.jsx`, `clinicProtocols.js`, `HomeProtocolTab.jsx` |
| Reports / sharing / PDF | `AssessmentReportView.jsx`, `ShareAssessmentModal.jsx`, jsPDF + html2canvas via `sharedClinicalData.js` |
| Feed, explore, people, search | `physiofeed/pages/*`, `physiofeed/components/{feed,people,…}` |
| Profile | `physiofeed/pages/ProfilePage.jsx`, `OtherProfilePage.jsx`, `components/profile/*` |
| Communities, case discussions | `CommunitiesPage.jsx`, `CaseDiscussionsPage.jsx`, `components/communities/*` |
| Messaging, notifications | `MessagesPage.jsx`, `NotificationsPage.jsx`, `context/*`, Supabase realtime |
| Opportunities (jobs, internships, workshops…) | `ExplorePage.jsx`, `components/opportunities/*` (+ `wizard/`), `data/opportunitiesMock.js` |
| Evidence library | `EvidencePage.jsx`, `AdminAddEvidencePage.jsx`, `components/evidence/*`, `api/pubmed*.js`, `api/europepmc*.js` |
| Learn / study mode / quizzes | `physiofeed/learn/*` (~45 files) |
| Moderation | `AdminReportsPage.jsx` |
| Native shell | `nativeApp.js`, `OfflineBanner.jsx` (`@capacitor/network`), `InstallPrompt.jsx` (PWA) |

## E. Data flow

```
UI component ──▶ src/physiofeed/data/db.js ──▶ Supabase (tables, RLS, realtime, storage)   [PhysioFeed]
UI component ──▶ src/supabase.js (+ PatientDatabase / AppModules helpers) ──▶ Supabase      [clinical]
UI component ──▶ fetch("/api/…") ──▶ Vercel function ──▶ Groq / PubMed / EuropePMC / Supabase admin
UI component ──▶ fetch("https://api.cloudinary.com/…", upload_preset=ml_default)          [photos]
```

- The clinical side has no single data layer. Supabase calls are spread across `PatientDatabase.jsx`, `AppModules.jsx`, `clinicProtocols.js`, `AppFull.jsx` and others.
- **The Cloudinary upload code is copied 4 times:** `ConditionObjectiveAssessment.jsx` (×2), `orthoFieldKit.jsx`, `InfoCard.jsx`.
- Schema lives in `supabase/*.sql`: 30 hand-run migration/seed files, no migration runner. Two more setup files (`supabase_rls_setup.sql`, `supabase_clinic_protocols_setup.sql`) sit loose at the repo root.

## F. Authentication flow

- Email + password through Supabase (`signInWithPassword`, `signUp` with `full_name`/`clinic_name` metadata, `resetPasswordForEmail`). Guest mode and a demo walkthrough work without an account.
- The session is restored with `getSession()` (8s timeout guard) and kept in sync with `onAuthStateChange`.
- `/api/*` endpoints require a bearer token (`authHeader()` in `src/supabase.js`, checked in `api/_lib/rateLimit.js`).
- Admin screens check `profile.isAdmin` **in the client only**. The real protection has to be Supabase RLS on the admin tables (not re-verified in this audit).
- ⚠ **Password reset in the native app:** `redirectTo: window.location.origin + "/?reset=1"` becomes `https://localhost/?reset=1` inside the Android/iOS app, so the emailed reset link can't open anything. See H/I.

## G. Capacitor configuration

```ts
{ appId: 'com.physiomindpro.app', appName: 'PhysioMind Pro', webDir: 'dist' }
```

- Plugins installed: `@capacitor/app`, `network`, `status-bar`, `preferences`. **`preferences` is never imported** (it's registered natively, but nothing calls it).
- Not installed or configured: splash-screen, keyboard, push notifications, deep links / app links, camera plugin (the camera works through the WebView's `getUserMedia`).
- `nativeApp.js` wires the Android back button to `history.back()` and stops the status bar from overlapping the WebView.
- `public/sw.js` also registers inside the native app. That's harmless on iOS (service workers aren't supported on `capacitor://`) but unnecessary on Android.

## H. Android readiness

| Item | Status |
|---|---|
| Project | ✅ Builds. Verified locally with the same steps the CI workflow runs: `npm run build` → `cap sync android` → `assembleDebug` (7.1 MB APK) → `bundleRelease` + `assembleRelease` signed with a throwaway test keystore (signatures checked with `apksigner`/`jarsigner`). Run on `c79f468`; `9e049f9` only changed web files, which build fine. |
| Toolchain | JDK 21 (JetBrains Runtime pinned in `gradle/gradle-daemon-jvm.properties`), Gradle 8.14.3, compileSdk/targetSdk 36, minSdk 24. |
| Permissions | `INTERNET`, `CAMERA` (camera optional). `ACCESS_NETWORK_STATE` comes in with the network plugin. |
| **App icon + splash** | ❌ **Still Capacitor's default placeholder** (byte-identical to the template). Must be replaced before the Play Store. |
| **`/api/*` calls** | ❌ **All 14 `fetch("/api/…")` calls are relative.** In the app they hit `https://localhost/api/…` and fail, so AI intake, AI chat, evidence search and account deletion are broken in the APK. Fix: prefix the Vercel origin when `Capacitor.isNativePlatform()`. CORS is already `*` on every endpoint, so no server change is needed. |
| Password-reset link | ❌ See F. |
| Signing | ⏳ No keystore yet. The CI workflow signs automatically once the 4 secrets exist. |
| versionCode | ⚠ Hard-coded `1` in `android/app/build.gradle`. Fine for the first Play upload, but every later upload needs a higher number. |
| `allowBackup="true"` | ⚠ The app stores patient data; consider `false` (or backup rules) before release. |
| CI | ✅ New: `.github/workflows/android-build.yml`. |

## I. iOS readiness

| Item | Status |
|---|---|
| Project | ✅ Present (SPM, bundle id `com.physiomindpro.app`, iOS 15+, version 1.0 (1)). |
| Permissions text | ✅ `NSCameraUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `PrivacyInfo.xcprivacy` present. |
| App icon + splash | ❌ Capacitor default placeholder (byte-identical to the template). |
| `/api/*` calls, password reset | ❌ Same as Android (`capacitor://localhost`). |
| Signing | ❌ Blocked: no Apple Developer team set (`DEVELOPMENT_TEAM` empty), no certificates/profiles. |
| Build machine | This Mac has only Command Line Tools, no Xcode, so iOS can only be built in CI on a macOS runner (Phase 12/13). |

## J. Build process

| Command | What it does | Result today |
|---|---|---|
| `npm run dev` | Vite dev server | ✅ |
| `npm run build` | Builds `index.html` + `tester.html` into `dist/`; a plugin stamps a per-build version into `dist/sw.js` | ✅ Passes (warning: chunks > 600 kB, largest is `OrthoPostOpAssessment` at 2.0 MB / 529 kB gzip) |
| `npm run typecheck` | `tsc --noEmit` | ✅ Passes |
| `npm test` | Vitest, jsdom | ❌ **58 of 1,217 tests fail** in 14 files (already failing before `9e049f9`, so not caused by the latest commit). See below. |
| `npm run test:e2e` | Playwright | Not run (needs the test Supabase project) |
| `npm run mobile:sync` | build + `cap sync` | ✅ |
| Vercel | `vercel.json` `buildCommand` also stamps the version into `public/sw.js`, then runs `npm run build` | ⚠ Duplicates the Vite plugin's job (see K) |

**Failing tests by cause:**

| Cause | Files (failures) |
|---|---|
| Stale after UI redesigns (text/labels changed: "New Patient", "Assessment Library", nav now has two "Clinical" elements) | `clinicalLandingRedesign` (5), `clinicalTabRedesign` (4), `guestMode` (3), `homeAiIntakeExplainer` (8), `wfStepper9Steps` (7), `regionSelectionPersistence` (1), `learnTabSmoke` (1), `studyModeSmoke` (1), `orthoAiIntakeRegionsAndOldData` (1) |
| Test environment gap (jsdom has no `scrollTo`/`scrollIntoView`) | `conditionObjectiveAssessment` (14) |
| Stale expectations after data/API changes | `physiofeedDbSupabaseWiring` (5), `parseApiVerificationPipeline` (5), `shoulderTemplateOverhaul` (2) |
| Over-strict test (false alarm) | `postureReportXssEscaping` (1): it forbids the text `d.patient.` anywhere in `PostureEngine.jsx`, and the only match is a **code comment** at line 8750. No real patient field reaches the report. The regex needs to skip comments. |

No existing CI workflow runs the unit tests, so nobody noticed these piling up.

## K. Duplicate code

| Duplicate | Copies | Canonical candidate |
|---|---|---|
| Form field kit (`TextField`, `SelectField`, `NumberField`, `TextArea`, `Segmented`, `ScaleField`, `LRGrid`, `FieldShell`, `SelectPopover`, `Alert`, `Hint`, `InfoButton`, `StepNav`, `SectionIntro`, `MissingDemographicsModal`, `useSectionData`, `fmtVal`, …, ~20 pieces) | 3: `CardiopulmonaryAssessment.jsx`, `NeurologicalAssessment.jsx`, `orthoFieldKit.jsx` | `orthoFieldKit.jsx` |
| `useVoiceInput` / `VoiceMicButton` | 5 / 4 | one shared hook + button |
| `AddAssessmentModal`, `SubjectiveSection`, `DemographicsSection`, `PrecautionsSection` | 3–5 | per-specialty differences need checking first |
| Cloudinary unsigned upload | 4 | one `uploadToCloudinary()` helper |
| `slugifyFinding` / `findingPhotoId` | 2 (`ConditionObjectiveAssessment.jsx`, `PhysioNeuro.jsx`), different ID schemes | one helper; keep both ID schemes so existing photos still resolve |
| Region reasoning helpers (`multicheckState`, `selectState`, `tierOf`, `specialTestValue`, `joinMulti`) | 5–6 across `ortho*Reasoning.js` / `*VariableExtractor.js` | one shared module |
| Knowledge-base helpers (`categoryLabel`, `conditionLabel`, `settingLabel`, …) | 3 (`ortho/neuro/cardioClinicalKnowledge.js`) | one shared module |
| Learn tab `toCard` | 8 study files | one helper |
| Profile editor rows (`EntryRow`, `NewEntryRow`) | 4 edit modals | one component |
| `BodyChartInteractive` | 2 (`BodyChartInteractive.jsx`, `PatientDatabase.jsx`), **both unused** | delete both |
| Supabase client | 2 (`src/supabase.js`, `src/physiofeed/lib/supabase.js`, the second unused) | `src/supabase.js` |
| SW cache-version stamping | 2 (`vercel.json` buildCommand + `vite.config.js` plugin) | the Vite plugin |

## L. Dead / unused code

**Files the app never loads** (not reachable from either entry point):

| File | Lines | Why it's dead (evidence) | Other references |
|---|---|---|---|
| `src/BodyChartInteractive.jsx` | 264 | Superseded by `BodyChartPro.jsx` (June); import removed in `3d967f7` | none |
| `src/DiagnosisEngine.js` | 70 | Old suggestion engine removed in July (`Remove legacy interpretationEngine…`) | only a test that checks it stays trimmed |
| `src/cardioEvidence.js` | 64 | "AI Treatment Assistant" removed in `3b1b78c` (2026-09-03) | none |
| `src/cardioTreatmentSuggestions.js` | 159 | same, `3b1b78c` | none |
| `src/neuroTreatmentCatalog.js` | 217 | same, `3b1b78c` | comment in `api/neuroTreatmentReasoning.js` |
| `api/neuroTreatmentReasoning.js` | 83 | its only caller was removed in `3b1b78c`; still deployed as a live, callable Groq endpoint | none |
| `src/groqSystemPrompt.js` | 149 | the real prompts live in `api/*.js`; this is the June prompt draft | a test that guards its model id |
| `src/lazy_diagnosis.jsx` | 1 | lazy wrapper whose last user was removed in `fb78c7f` | none |
| `src/physiofeed/lib/supabase.js` | 14 | duplicate client, never imported (`PHYSIOFEED_HANDOFF.md` already says "DEAD CODE") | docs only |
| `src/physiofeed/pages/ComingSoonPage.jsx` | 15 | placeholder route removed when real pages landed | a comment |
| `src/physiofeed/components/profile/ExerciseGrid.jsx` | 41 | removed from the profile in `d605f57` (2026-09-24) | docs only |
| `src/physiofeed/data/applicantsMock.js` | 129 | replaced by real applications data in `3c8324f` | comments |
| `src/physiofeed/learn/interpretQuiz.js` | 34 | replaced by the per-item quiz builders | its own unit test |
| `src/physiofeed/lib/r2Upload.js` | 33 | **unfinished**: "Scaffold Cloudflare R2 upload support (not wired in yet)" | none |
| `api/uploadPresign.js` | 119 | same R2 scaffold; the only thing that uses `@aws-sdk/*` | — |

**Dead code inside live files** (the file is used, these parts aren't):

| Where | What | Size |
|---|---|---|
| `PatientDatabase.jsx:728-907` | `BodyChartInteractive` (second copy) | 180 lines |
| `orthoIndividualSuggestions.js:50-150` | `suggestCpaItems`, `suggestKineticChainItems`, `suggestFmaItems`, `suggestSttItems` + their `*Why`/`*How` | ~100 lines |
| `orthoFieldKit.jsx` | `MiniSelect` (593-640), `GradeField` (802-818) | 65 lines |
| `orthoCommonSections.jsx:372-415` | `OutcomeMeasureSection` | 44 lines |
| `orthoSetupKit.jsx:240-251` | `ConditionGrid` | 12 lines |
| `SubjectiveCompare.jsx` + `subjective_compare` screen | unreachable screen (kept "per instruction") | 185 lines |
| `clinicProtocols.js` | `deleteClinicProtocol`: API helper with no caller yet (fine to keep) | small |

**Unused packages:**

| Package | Evidence |
|---|---|
| `@capacitor/preferences` | 0 imports anywhere. Removing it needs `cap sync` so the native projects drop it too. |
| `@testing-library/user-event` (dev) | 0 imports |
| `@babel/parser` (dev) | 0 imports; only used by hand in past sessions. It also comes in through Vite's React plugin anyway. |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | used only by the unfinished R2 scaffold (`api/uploadPresign.js`) |

Every other dependency is used (jsdom, postcss and autoprefixer through config; typescript through `npm run typecheck`).

**Stale files at the repo root:**

| File | Status |
|---|---|
| `HANDOFF.md` | Session notes from July/August, references old folder names (`physiom-main 5`). Historical. |
| `PHYSIOFEED_HANDOFF.md`, `PHYSIOFEED_MVP_MAP.md` | Useful PhysioFeed notes, partly outdated. |
| `palpation-cloudinary-uploader.html` | Standalone content tool for uploading palpation photos. Not part of the build and not deployed. |
| `supabase_rls_setup.sql`, `supabase_clinic_protocols_setup.sql` | Belong with the other SQL in `supabase/`. |
| `public/logo.png` | Referenced nowhere in the repo (might be used outside it). |
| *(missing)* `README.md` | There is no README. |

## M. Potentially dangerous files / settings

| Item | Risk |
|---|---|
| **No hardcoded secrets found.** Scanned for OpenAI/Groq/AWS keys, JWTs, service-role keys and private keys. The only key in source is the Supabase **publishable** key in `src/supabase.js`, which is meant to be public (RLS protects the data). | ✅ |
| `.gitignore` does **not** ignore `*.jks` / `*.keystore` (the lines are commented out in `android/.gitignore`) | A signing keystore could be committed by accident. **Fixed in this change** (added to the root `.gitignore`). |
| Cloudinary unsigned preset `ml_default` is hardcoded | Anyone who reads the bundle can upload images to the account. Low risk; consider a signed upload or a restricted preset. |
| `api/neuroTreatmentReasoning.js` is live but unused | An authenticated endpoint that spends Groq quota and has no reason to exist. |
| Admin checks are client-side | Make sure RLS on the reports/evidence admin tables enforces the admin role. |

## N. Files that must NOT be deleted

Even if they look unused:

- `src/App.jsx`: a one-line re-export, but `main.jsx` imports it.
- All 20 `src/lazy_*.jsx` wrappers **except** `lazy_diagnosis.jsx`. They are the code-splitting boundaries, and `vite.config.js` explains why they must stay separate files.
- `tester.html`, `src/main-tester.jsx`, `src/TesterEntry.jsx`: the `/tester` build entry.
- `src/aiIntakeTestHarness.js`: loaded on purpose (`window.physioAITest`), and `ai-accuracy.yml` depends on it.
- `public/sw.js`, `public/manifest.webmanifest`, icons: the PWA.
- `vercel.json`: the rewrites for `/privacy`, `/terms`, `/tester`.
- `android/`, `ios/`, `capacitor.config.ts`: never delete or regenerate.
- `android/gradle/gradle-daemon-jvm.properties`: pins the JDK both CI and Android Studio use.
- Everything in `supabase/`: this is the only record of how the live database was built.
- `e2e/`, `playwright.config.ts`, `src/__mocks__/`, `src/__tests__/setupTests.js`.
- `src/physiofeed/data/db.js`: the only PhysioFeed backend interface.
- `src/physiofeed/data/mockData.js`, `opportunitiesMock.js`: still imported by 13 live files.

## O. Recommended cleanup plan (summary)

Details, per-file evidence and order are in [CLEANUP_PLAN.md](CLEANUP_PLAN.md).

1. **Mobile blockers first** (small, high-value): absolute API URLs in the native app, a password-reset redirect that works in the app, real icons/splash.
2. **Delete proven-dead code**: 13 files, ~1,300 lines, plus ~400 lines of dead code inside live files and 2–4 unused packages. Each step: build + tests + a commit.
3. **Update the 58 failing tests** (none point to a real app bug), then add a `test.yml` CI job so they can't silently rot again.
4. **Tidy the root**: move SQL into `supabase/`, the old handoff docs into `docs/`, the uploader into `tools/`, add a README.
5. **Consolidate duplicates**: form kit, voice input, Cloudinary upload, reasoning helpers.
6. **Restructure `src/` into feature folders** (the big move). Only when no other session has uncommitted work, and only with explicit permission to touch `AppFull.jsx`.
