# Run your first Playwright test (beginner guide)

Playwright is free and open source. It opens a real browser and clicks through
your app like a person. You run it on your own computer — nothing to pay for.

## Do this once (setup)

1. Install Node.js (if you don't have it): https://nodejs.org — download the
   "LTS" version and install it like any app.
2. Open the Terminal app.
3. Get the project onto your computer and enter its folder. If you use GitHub
   Desktop, clone `physiom` and note where it saved it, then in Terminal:
   `cd path/to/physiom`
4. Install the project + Playwright's browsers (one time):

       npm install
       npx playwright install

## Run the starter test (no login / no database needed)

    npm run build          # make a production build once
    npm run test:e2e -- smoke-starter.spec.ts

That opens a real browser, loads the app, checks it rendered, and saves a
screenshot (`e2e-screenshot.png`) so you can see what it saw.

## See it happen live / write new tests

    npm run test:e2e:ui    # visual mode — watch each step, time-travel, debug

To record a test just by clicking around your app:

    npm run preview        # in one Terminal tab: serves the built app on :4173
    npx playwright codegen http://localhost:4173   # in another tab

Playwright writes the test code for you as you click. Copy that into a new
`e2e/whatever.spec.ts` file.

## After a run

    npm run test:e2e:report   # opens the HTML report with videos/screenshots

## The bigger tests (login + patient data)

`patient-journey.spec.ts` and `multi-visit-and-cross-device.spec.ts` need a
free Supabase TEST project and two secrets — see `e2e/README.md`. Skip these
until you're comfortable; the starter above needs none of that.

---

## Run the therapist test (phone view, uses your real login)

This one logs in as you and clicks through the app like a therapist.

1. Make a file with your login. In Terminal, in the project folder, run
   (replace with your real email/password):

       cat > e2e/login.local.json <<'JSON'
       { "email": "you@example.com", "password": "your-password" }
       JSON

   This file stays only on your Mac — it is git-ignored and never uploaded.
2. Run it and watch:

       npm run test:e2e:ui

   In the window, click `therapist-mobile.spec.ts` and press ▶. It logs in
   and opens the Subjective screen on a phone-sized browser.

Safe by design: the test never saves a patient, so it doesn't change any real
data — it only fills the on-screen form and checks buttons work.

## Record your own tests by clicking (no coding)

Once login works, you can record new tests just by using the app:

    npm run preview
    npx playwright codegen http://localhost:4173

Click through your app; Playwright writes the test code. Paste it into a new
file like e2e/my-test.spec.ts.
