# E2E tests (Playwright)

These tests drive a real, rendered browser against a real build of the app
and a real backend -- unlike the Vitest/RTL tests in `src/__tests__`, which
run in a simulated jsdom environment and never touch a network or a real
Supabase project.

## One-time setup (do this once, before the workflow can run)

### 1. Create a second, disposable Supabase project just for testing

This must be a **separate project from production** -- never point these
tests at the real project (`dlauxdokkrqbvbormxte`). Supabase's free tier
allows 2 free projects per account, so this costs nothing extra.

1. In the Supabase dashboard, create a new project (any name, e.g.
   `physiom-e2e-test`).
2. Go to **Authentication -> Providers -> Email** and turn **"Confirm
   email" OFF**. This is required: without it, `supabase.auth.signUp()`
   never returns an active session, the app just shows "check your email to
   confirm," and there is no way for an automated browser test to click an
   email link. With it off, signup logs the test straight in, exactly like a
   real student's signup flow does today (assuming your production project
   has the same setting -- if not, this test project intentionally behaves
   differently from prod on this one setting only).
3. From **Project Settings -> API**, copy the **Project URL** and the
   **anon / publishable key**.
4. **Set up the database schema.** A brand-new Supabase project has no
   tables at all -- go to **SQL Editor -> New Query** and run these two
   files from the repo root, in order:
   - `supabase/schema.sql` (creates the `patients` table)
   - `supabase_rls_setup.sql` (adds the `user_id` column and the
     per-user Row Level Security policies)

   Without this step, every write to Supabase (patient creation, autosave)
   fails silently -- `syncPatientsToSupabase` in `PatientDatabase.jsx`
   catches the error and only logs it via `console.warn`, so nothing in
   the UI itself will tell you this is missing. This was found the hard
   way: every test that only checks data within a single browser session
   kept passing regardless, and it took a cross-device test (one that
   logs in from a second, independent session to read data back) to
   expose that the test project had never had its schema set up at all.

### 2. Add two secrets to this GitHub repo

Go to the repo on github.com -> **Settings -> Secrets and variables ->
Actions -> New repository secret**, and add:

| Name                      | Value                                      |
|----------------------------|---------------------------------------------|
| `E2E_SUPABASE_URL`        | the test project's Project URL              |
| `E2E_SUPABASE_ANON_KEY`   | the test project's anon/publishable key     |

That's it -- the workflow (`.github/workflows/e2e.yml`) already references
these exact names. Nothing else needs configuring.

## What the tests actually do

The tests are split by whether they need an account.

**No account, no secrets (Guest mode -- runs anywhere, also on every pull
request):**

| File | What it checks |
|---|---|
| `smoke-starter.spec.ts` | the app loads and renders |
| `app-tour.spec.ts` | a tour of every main area: Home tiles, Clinical, Learn, PhysioFeed, Profile (phone) |
| `guest-journey.spec.ts` | Home tiles, Clinical's five tabs, an Ortho assessment with findings typed in -> Final Review -> Save -> patient in the list |
| `ortho-steps.spec.ts` | all 20 steps of the Ortho assessment open (by "Next" and from the step bar); Advanced Assessment too |
| `regions.spec.ts` | every body region (13) opens its ROM, MMT and Special Tests steps |
| `neuro-cardio.spec.ts` | Neuro (two templates) and Cardio walk to "Summary & Review" |
| `ortho-cases.spec.ts` + `ortho-cases.fixtures.ts` | 10 synthetic patients through demographics -> complaint -> review -> save -> listed |

All of these run on both a desktop-sized and a phone-sized browser (see
`playwright.config.ts`). Guest Mode never touches the database, so they can't
leave anything behind.

**Real account on the TEST Supabase project (needs the two secrets above):**

| File | What it checks |
|---|---|
| `patient-journey.spec.ts` | sign up, save an Ortho assessment, reload the page -- the patient is still there (it came back from Supabase) |
| `cross-device.spec.ts` | a patient saved on "device A" appears on a second, separate browser ("device B") after signing in |
| `load-concurrency.spec.ts` (`@load`, own workflow) | N students saving at the same time |

Each run creates its own throwaway account and patient (timestamp + random
suffix in the name/email) so parallel runs never collide -- there's no
cleanup step because it's a disposable test project; if you want to
periodically clear out old test accounts, that's a manual housekeeping task
on the test project, not something the tests themselves need to worry about.

`ai-accuracy.spec.ts` (`@ai-accuracy`) is separate: it scores the real AI
intake against a threshold every night (`ai-accuracy.yml`).

`appMap.ts` is the map of the app: a diagram of every area at the top, and every
"how do I get to this screen" step below it (open Clinical, start an Ortho / Neuro /
Cardio assessment, jump to a step...). When a screen changes, fix it there once and
every test follows.

## Running locally

```bash
npx playwright install --with-deps   # first time only, needs a real machine
                                       # or CI -- see project notes on why this
                                       # sandbox specifically couldn't do this
export VITE_SUPABASE_URL="<test project URL>"
export VITE_SUPABASE_ANON_KEY="<test project anon key>"
npm run build
npx playwright test
```

Or skip the env vars and it'll fall back to hitting the real production
Supabase project via the hardcoded default in `src/supabase.js` -- **don't
do this** for anything other than a one-off manual check where you're
certain you won't submit real patient-shaped data.

## Adding more coverage later

Natural next additions, each as a new `test()` or spec built on `appMap.ts`:
typing real values into ROM / MMT / Special Tests and checking them on
Final Review (`guest-journey.spec.ts` does this for one MMT grade and one
special test); the Care Plan and PDF report; Treatment / Exercise; Learn and
PhysioFeed; a follow-up visit for an existing patient (the old
"multi-visit" spec was removed with the old Quick Visit screens -- write a new
one once you decide what a follow-up looks like today).

Use `npx playwright codegen http://localhost:4173` to record a click path
and copy the selectors into `appMap.ts`.
