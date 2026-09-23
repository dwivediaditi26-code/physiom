# PhysioFeed MVP — Implementation Map

Audit date: 2026-09-22. Working doc for the P0–P9 MVP build.
Update the status columns as each priority lands; don't let this drift.

---

## 1. What exists today

### Working — real Supabase, persists, end-to-end

| System | Backing tables / mechanism |
|---|---|
| Auth + guest mode | Supabase Auth; guest mode is in-memory only |
| Profile core (name, headline, photo, location, bio) | `profiles` |
| Posts: create, like, comment, save, delete, polls, report | `posts`, `post_likes`, `comments`, `saved_posts`, `poll_votes`, `reports` |
| Follow (one-way only) | `follows` (`follower_id`, `following_id`) |
| Direct messages, realtime, unread/read | `direct_messages` + Postgres changes subscription |
| Notifications | `notifications` + DB triggers; `actor_id`/`kind`/`post_id` columns exist for deep links |
| Evidence + saves | `research_articles`, `research_saves` |
| Communities | `communities`, `community_members` |
| Media upload | storage buckets: post-images, post-videos, profile-images |
| Moderation | `reports`, admin reports page |

### Partially working

| System | Gap |
|---|---|
| Profile Experience / Education / Certifications / Research | UI + `db.js` CRUD complete; **the two migrations were unrun as of this audit**, so nothing persisted for real users |
| "Connect" | Just a one-way `follows` row relabelled. No `pending` / `accepted` / `rejected`, no Accept/Ignore, no requests inbox |
| Notifications | Only 4 trigger types (message, like, comment, follow). Nothing for connections or applications |
| Saved | `saved_posts` (posts) and `research_saves` (evidence) are two separate systems; neither covers jobs/workshops/research opportunities |

### UI-only — no backend, evaporates on refresh

- **Opportunities** — 10 components under `components/opportunities/`; state is `useState(INITIAL_OPPORTUNITIES)` inside `pages/ExplorePage.jsx`, seeded from `data/opportunitiesMock.js`
- **Applications** — `ApplyOpportunityModal`, `ApplicantPipeline`, `ApplicantProfileSheet`, `MyPostingsPage`, `data/applicantsMock.js`
- **Applicant chat** — `context/DemoConversationsContext.jsx`, a second messaging system parallel to the real one
- **Organizations** — do not exist at all (no table, no model)
- **Global search** — does not exist (`PeoplePage` has a `?q=` filter only)
- **My Applications** — no page, no route

### Routes

Present: `/feed`, `/profile`, `/profile/:userId`, `/evidence`, `/explore`, `/communities`, `/people`, `/messages`, `/saved`, `/notifications`, `/admin/reports`, `/admin/evidence`

Missing (blocks deep-linking): `/opportunity/:id`, `/application/:id`, `/organization/:id`

> Note: PhysioFeed uses `MemoryRouter`, not `BrowserRouter` — physiom owns the real URL bar. Deep links from notifications have to go through the existing jump-bridge pattern in `PhysioFeedEntry.jsx`, not real browser URLs.

---

## 2. Architecture rules to preserve

- **`src/physiofeed/data/db.js` is the only backend interface.** Screens never call Supabase directly. Every new system (opportunities, applications, connections) adds functions here, not in components.
- **Real-first, demo-fallback:** reads try Supabase and fall back to a `mockData.js` array on any failure; writes throw a real user-facing error instead of pretending to succeed.
- Migrations are run **manually** in Supabase Dashboard → SQL Editor. There are no CLI credentials in the dev environment.
- Global CSS trap: `src/utils.jsx` forces a colour-only `transition !important` on every element. Any transform/opacity transition needs its own `!important`.
- The working tree is shared with other Claude sessions. `git fetch` + `git status` before committing; stage explicit paths only.

---

## 3. Priority plan

| P | Scope | Status | Notes |
|---|---|---|---|
| P0 | Audit + auth + DB foundation | Done | Two profile migrations run 2026-09-22 and verified live |
| P1 | Professional identity | **PASSED** | Acceptance test driven end-to-end on the real signed-in account: added a certification → full reload → still there → confirmed the row independently via the REST API → deleted it → confirmed gone. Read, write and delete paths all work |
| P2 | People + Connect/Accept/Ignore | **PASSED** | Acceptance test run two-user by Aditi 2026-09-22 |
| P3 | Messaging | Done | Real threads + realtime; unread dot added to both headers 2026-09-22 |
| P4 | Opportunities + Jobs + Save | Built, untested | db.js + every render site real (3c8324f). Acceptance test needs a signed-in account |
| P5 | Apply + My Applications | Built, untested | Real applications table + My Applications list (3c8324f). Acceptance test needs two accounts |
| P6 | Application status + notifications | Built, untested | Triggers shipped in the P2–P6 migration; client now reads entity_type/entity_id and deep-links |
| P7 | Feed + posts + evidence | Largely working | Verify against acceptance tests |
| P8 | Search + discovery | Not started | Build from scratch |
| P9 | Permissions, states, mobile QA | Not started | |

**Rule: do not start a priority while the one above it fails its acceptance test.**

---

## 4. Reuse, don't rebuild

| Need | Reuse |
|---|---|
| Any new data access | `db.js` + `AppDataContext` |
| Applicant/recruiter chat | Fold `DemoConversationsContext` into real `direct_messages` — don't keep two chat systems |
| Saved jobs/workshops/research | Generalise `saved_posts` into one `saved_items` (`item_type` + `item_id`) rather than a third save table |
| New notification types | Existing `notifications` table + DB trigger pattern; `actor_id`/`kind` are already there for deep links |
| Connection state | Extend/replace `follows` — keep follow and connect as separate concepts |
| Profile identity | Done. Don't redesign it. |

---

## 4b. Schema decisions (2026-09-22)

SQL to run in the Supabase dashboard, in order:

1. ✅ **Run 2026-09-22** — `supabase/add_profile_clinical_cv.sql` + `supabase/add_profile_clinical_taxonomy.sql` (P1). Verified live.
2. ⬜ `supabase/add_notification_post_id.sql` — **was never run.** `notifications.post_id` is missing, so `getNotifications()` 400s and silently falls back to *demo* notifications for real signed-in users. Already idempotent, paste as-is.
3. ⬜ `supabase/add_mvp_network_opportunities.sql` — everything for P2–P6.

> Lesson: a migration file existing in `supabase/` does **not** mean it was ever run. Check against the live database (`/rest/v1/<table>?select=<col>&limit=1`) rather than assuming.

Decisions worth remembering:

- **Connections are separate from follows.** `follows` stays as-is (content subscription); the new `connections` table carries `pending / accepted / rejected / withdrawn`. A unique index on `(least(requester_id, recipient_id), greatest(...))` means one row per *pair* regardless of direction — a re-request after a reject updates that row back to `pending` rather than inserting a second.
- **Connection visibility:** accepted rows are public (needed for connection counts and mutuals); pending/rejected are visible only to the two parties.
- **Opportunities use `details jsonb`** for type-specific extras (mentor, highlights, setup, stats, stipend/salary/duration/audience), mirroring `posts.media jsonb`. Only things Explore filters or searches on are real columns. This keeps the existing opportunity components' object shape.
- **Applications: only the recruiter can UPDATE.** Postgres RLS is row-level, not column-level, so there's no way to let applicants edit a cover note without also letting them set their own status to `hired`. Applicant withdrawal is a DELETE instead.
- **Applications are unique per `(opportunity_id, applicant_id)`** — no duplicate applications, enforced in the DB not the UI.
- **`saved_items`** is the new unified save table (`item_type` + `item_id`, text id since `posts.id` is text and `opportunities.id` is bigint). `saved_posts` and `research_saves` stay for now so nothing breaks; migrate them into it later.
- **Notifications must be triggers.** `notifications` has no INSERT policy by design — only `SECURITY DEFINER` trigger functions can write rows. New connection/application notifications are therefore DB triggers, matching the existing like/comment/follow/message ones. `entity_type` + `entity_id` were added so a notification can deep-link to any object, not just a post.

## 5. Acceptance tests per priority

**P1** — sign in → edit profile → add workplace, education, certification → save → refresh → data still there.

**P2** — user A connects to B → B sees request → B accepts → both show Connected → Message button appears.

**P3** — A messages B → B gets unread state → B opens → marked read → B replies → A sees it.

**P4** — recruiter creates and publishes a job → appears in Explore → user searches, opens, saves → saved state survives refresh.

**P5** — user applies → appears in My Applications as Applied → recruiter sees applicant → moves to Shortlisted → applicant sees the same status.

**P6** — each of the above emits a notification that deep-links to the correct object.

**P7** — A posts → B sees it in feed → B likes → A sees the like.

**P8** — one search box returns categorised results across people, opportunities, posts, evidence.

---

## 6. Deferred (explicitly out of MVP)

AI recommendations / job matching / resume analysis, endorsements, testimonials, full ATS, interview scheduling, video and voice calls, group messaging, advanced analytics, feed ranking algorithms, DOI verification, publication indexing, skill or competency scoring, patient outcome tracking, payments, subscriptions, ads, full organization pages, push/email notification infrastructure.
