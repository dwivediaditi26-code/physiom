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

`e2e/patient-journey.spec.ts` signs up a brand-new, uniquely-named test
account on every run, creates a patient, records a real MMT finding,
confirms it shows up in the SOAP note, and signs the note. Each run creates
its own throwaway account and patient (timestamp + random suffix in the
name/email) so parallel runs never collide -- there's no cleanup step
because it's a disposable test project; if you want to periodically clear
out old test accounts, that's a manual housekeeping task on the test
project, not something the tests themselves need to worry about.

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

The current spec covers one path end-to-end as the highest-value smoke
test. Natural next additions, each as its own `test()` in this same file or
a new spec: ROM, Special Tests, Neuro, Gait, Outcome Measures modules;
logging out and back in to confirm persistence; a dedicated mobile-viewport
spec once the bottom-nav selectors are mapped out (skipped for now in the
existing spec rather than guessed at).
