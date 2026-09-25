# PhysioMind

PhysioMind is a learning and clinical tool for physiotherapy students and clinicians:

- clinical assessments for Ortho, Neuro and Cardio
- patient records and posture screening
- study mode with quizzes (the Learn tab)
- **PhysioFeed**: feed, profiles, opportunities, case discussions and messages

**Live website:** https://physiom-sbs4.vercel.app

## How it fits together

- The app is **one website** (React). The Android and iPhone apps are that same website running inside a phone-app shell (Capacitor), so one fix covers all three.
- **Supabase** stores the data: accounts, patients, posts, profiles, messages.
- **Vercel** hosts the website and the small server functions in `api/`, which handle AI (through Groq), evidence search and account deletion.
- **Cloudinary** stores clinical photos.

## Where things are

| Folder / file | What's inside |
|---|---|
| `src/` | The app itself |
| `src/AppFull.jsx` | The main shell: login, menus, which screen is showing |
| `src/Ortho*.jsx`, `src/ortho*.js(x)` | Ortho assessment |
| `src/Neuro*.jsx`, `src/PhysioNeuro.jsx`, `src/neuro*.js` | Neuro assessment |
| `src/Cardio*.jsx`, `src/cardio*.js` | Cardio assessment |
| `src/physiofeed/` | PhysioFeed and the Learn tab (`learn/`) |
| `src/physiofeed/data/db.js` | Every PhysioFeed read/write to the database goes through here |
| `src/__tests__/` | Automatic checks (`npm test`) |
| `api/` | Server functions (AI, evidence search, delete account) |
| `supabase/` | Database setup scripts (SQL), run by hand in Supabase's SQL editor |
| `public/` | Logo, website icons, offline support (`sw.js`) |
| `android/`, `ios/` | The phone-app projects. **Never delete these.** |
| `assets/logo.png` | Source image for the phone-app icons |
| `e2e/` | Browser tests that click through the real app ([how to run](e2e/README.md)) |
| `docs/` | Reports, plans and notes (list below) |
| `tools/` | Helper pages that aren't part of the app |
| `.github/workflows/` | Jobs GitHub runs by itself (Android build, tests, nightly AI check) |

## Everyday commands

Run these in Terminal, inside this folder.

| Command | What it does |
|---|---|
| `npm install` | Downloads the packages. Needed the first time, and after `package.json` changes |
| `npm run dev` | Runs the app on your Mac (the address it prints, e.g. http://localhost:5173) |
| `npm test` | Runs the automatic checks |
| `npm run build` | Builds the app exactly like the live site does |
| `npm run mobile:sync` | Builds the app and copies it into the Android/iPhone projects |

## How changes go live

- **Website:** push to the `main` branch on GitHub, and Vercel builds and publishes it by itself in 1–2 minutes. If a build fails, the live site keeps showing the last working version.
- **Android app:** every push to `main` also builds a test app. Open GitHub → **Actions** → **Android build** → newest run, and download `physiomind-debug-apk` at the bottom. For the Play Store version, see the notes at the top of `.github/workflows/android-build.yml`.
- **iPhone app:** not set up yet.

## Passwords and keys

Never put passwords or secret keys in the code.

- **On your Mac:** copy `.env.local.example` to `.env.local` and fill it in. The copy is never uploaded.
- **Live website:** Vercel → project → Settings → Environment Variables (for example `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **GitHub jobs:** GitHub → repo → Settings → Secrets and variables → Actions (the test accounts now, the Android signing key later).

## Documents

| File | What it is |
|---|---|
| [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) | Full check-up of the project (2026-09-25) |
| [docs/CLEANUP_PLAN.md](docs/CLEANUP_PLAN.md) | The cleanup plan and what's done so far |
| [docs/PHYSIOFEED_HANDOFF.md](docs/PHYSIOFEED_HANDOFF.md), [docs/PHYSIOFEED_MVP_MAP.md](docs/PHYSIOFEED_MVP_MAP.md) | How PhysioFeed is built, and its feature map |
| [docs/history/HANDOFF.md](docs/history/HANDOFF.md) | Older notes on the clinical side (July–August 2026) |

## Safety rules

- A full copy of the app from before the September 2026 cleanup is on the branch `cleanup/before-architecture-cleanup`.
- Don't delete `android/`, `ios/`, `supabase/` or `capacitor.config.ts`.
- To change the database, add a new `.sql` file in `supabase/` and run it in Supabase's SQL editor. Never edit an old one that has already been run.
