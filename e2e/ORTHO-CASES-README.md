# Ortho case library — 10 synthetic cases (E2E)

Files:
- `e2e/ortho-cases.fixtures.ts` — the 10 cases as structured data (age, sex, body
  region and side, chief complaint, the wording a sensible impression would use).
  All synthetic — no real patients.
- `e2e/ortho-cases.spec.ts` — data-driven spec. Runs each case through today's
  Ortho assessment: start (region + side) → Demographics → Subjective (chief
  complaint) → Clinical Assessment → Final Review → Save → the patient shows in
  Clinical → Patients. Runs in BOTH the `chromium` (desktop) and `mobile-chrome`
  projects = 20 tests.

## Safe to run anywhere
It uses **Guest Mode** ("Try the full app"), so no account, no secrets and no
database are involved, and it can never leave test patients behind. (Earlier
versions logged in and saved real patients to a test Supabase project; the
"E2E ORTHO DELETE ME" name is kept only so a stray one is easy to spot.)

## Run it
```bash
npm install
npx playwright install            # one time — downloads browsers
npm run build                     # preview serves this build

npm run test:e2e -- ortho-cases            # both desktop + mobile (20 tests)
npm run test:e2e -- ortho-cases --project=chromium   # desktop only
npm run test:e2e:ui -- ortho-cases         # watch it click through live
npm run test:e2e:report                    # HTML report w/ video+screenshots
```

## What's a hard check vs information
- **Hard (fails the test):** every screen opens without a crash; the chief
  complaint carries through to Final Review; saving works; the patient is listed.
- **Information (test report annotation, never fails):** whether the Clinical
  Assessment step mentions the expected condition. With only a chief complaint
  typed in, the differential has little to go on.

## About the data
The first version of these cases also had ROM angles, MMT grades, special-test
results and observation notes for the old Screening Workflow. Those screens are
gone. The values are still in git history (`git log -- e2e/ortho-cases.fixtures.ts`)
if you want to enter them into today's ROM / MMT / Special Tests steps, which
would also make the impression check meaningful.

## Scaling to 100 cases
Add more objects to `ORTHO_CASES` in the fixtures file — the spec auto-generates a
test per case. Aim for 10–15 per region (shoulder, elbow, wrist/hand, cervical,
thoracic, lumbar, hip, knee, foot/ankle).
