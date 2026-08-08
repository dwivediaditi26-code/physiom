# Ortho case library — 10 synthetic cases (E2E)

Files:
- `e2e/ortho-cases.fixtures.ts` — the 10 cases as structured data (demographics,
  subjective, ROM, MMT, special tests, expected impression). All synthetic — no
  real patients.
- `e2e/ortho-cases.spec.ts` — data-driven spec. Runs each case through the full
  therapist workflow: Subjective → Suggest probable objective assessment → Objective (ROM / MMT /
  Special tests) → Clinical Impression / Probable Diagnosis → Save → reload from
  the backend. Runs in BOTH the `chromium` (desktop) and `mobile-chrome` projects
  = 20 tests.

## ⚠️ Before you run — this SAVES real patients
Each case creates a patient named `E2E ORTHO DELETE ME <case>`. Run it ONLY while
logged into a **disposable TEST Supabase project**, never production. See
`e2e/README.md` for how to stand one up (confirm-email OFF, schema loaded).

## Run it
```bash
npm install
npx playwright install            # one time — downloads browsers
npm run build                     # preview serves this build

# put your TEST-project login here (gitignored, never uploaded):
cat > e2e/login.local.json <<'JSON'
{ "email": "you@test-project.dev", "password": "your-password" }
JSON

npm run test:e2e -- ortho-cases            # both desktop + mobile (20 tests)
npm run test:e2e -- ortho-cases --project=chromium   # desktop only
npm run test:e2e:ui -- ortho-cases         # watch it click through live
npm run test:e2e:report                    # HTML report w/ video+screenshots
```

## What's a hard assertion vs best-effort
- **Hard (fails the test):** subjective marker carries through; analysis runs
  without crash; a clinical impression/probable diagnosis surfaces; the saved
  patient reloads from the backend with its subjective intact.
- **Best-effort (logged as annotations, won't false-fail):** exact per-movement
  ROM values, MMT grades, and special-test results. The app renders region-
  specific labels that vary; these helpers match defensively. If a region's
  labels differ from the fixture, run `npx playwright codegen http://localhost:4173`,
  click through that module once, and tighten the selector in the helper.

## Notes on the data
- MMT: the app only offers coarse grades (5/5…0/5), so textbook `4-/5` / `3+/5`
  map to the nearest whole grade in the fixture (`grade` is already the exact
  option string the dropdown contains).
- Cleanup: delete the `E2E ORTHO DELETE ME` patients from the patient list after a
  run (or just reset the disposable test project).

## Scaling to 100 cases
Add more objects to `ORTHO_CASES` in the fixtures file — the spec auto-generates a
test per case. Aim for 10–15 per region (shoulder, elbow, wrist/hand, cervical,
thoracic, lumbar, hip, knee, foot/ankle).
