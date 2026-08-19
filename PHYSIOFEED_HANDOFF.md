# PhysioFeed — Session Handoff

Read this once at the start of a new chat instead of re-exploring the repo.
Covers only the **PhysioFeed** social feature (`src/physiofeed/`). The
pre-existing `HANDOFF.md` at repo root covers the clinical assessment
engine (Subjective/Objective/SOAP/etc.) — a separate, unrelated part of
the app; you don't need it for PhysioFeed work.

## What this app is

PhysioMind Pro ("physiom") — a real teaching-clinic web app. PhysioFeed is
its social layer: a feed, profiles, people search, direct messages, saved
posts, evidence library, communities. Owner **Aditi Dwivedi** is
non-technical — explain things in plain language, don't ask her to run
anything except pasted SQL.

- Repo: `github.com/dwivediaditi26-code/physiom`, branch `main`
- Live: `physiom-sbs4.vercel.app` (auto-deploys on push to `main`)
- Local working copy in this sandbox: `/tmp/work/physiom`
- Real Supabase project (this sandbox **cannot reach** it over the
  network — `gkhcysvayjrkrufcnqvz.supabase.co` is blocked here; all
  backend/RLS verification must use a local Postgres simulation, never a
  live call)

## Working cadence (do this every time, no exceptions)

1. Implement the change.
2. `npm run build` — must succeed.
3. Run **scoped** Vitest files only (see list below) — **never** `npx
   vitest run src/__tests__/` (the whole directory). It times out at the
   2-minute tool limit every time. Always name specific files.
4. If the change touches a table/column, verify RLS locally first (see
   "Verifying SQL/RLS locally" below) before handing Aditi any SQL.
5. `git add` the specific changed files (never `-A` blindly — check
   `git status` first), commit with a message explaining root
   cause/what/why (see recent commits for the house style), push.
6. If a change needs a new SQL migration, paste the **full SQL as a
   copy-pasteable code block directly in chat** (Aditi's standing
   instruction) and tell her plainly that it's required and what it's
   for. Most UI/logic fixes need **no** SQL — say so explicitly when true,
   so she doesn't go hunting for a migration that doesn't exist.
7. Brief recap at the end: what broke / what changed / what she needs to
   do (if anything). No filler.

Scoped test files to run (fast, ~10s total):
```
npx vitest run src/__tests__/physiofeedDbSupabaseWiring.test.jsx src/__tests__/physioFeedSmoke.test.jsx src/__tests__/physiofeedMediaValidation.test.jsx
```

Push technique (this sandbox has no saved git credentials — Aditi
provides a GitHub PAT in chat when needed; **never hardcode the token in
a file**, only use it inline in the push command for that turn):
```
git remote set-url origin "https://<PAT>@github.com/dwivediaditi26-code/physiom.git" && https_proxy= HTTPS_PROXY= http_proxy= HTTP_PROXY= git push origin main; git remote set-url origin "https://github.com/dwivediaditi26-code/physiom.git"
```

## Architecture in one paragraph

`src/App.jsx` → `AppFull.jsx` (the real app shell, huge file, mostly the
clinical engine — leave it alone unless the task is literally "how does
PhysioFeed mount"). `AppFull.jsx` lazy-loads `physiofeed/PhysioFeedEntry.jsx`
for the PhysioFeed tab, `ProfileTabEntry.jsx` for physiom's real Profile
tab (reuses PhysioFeed's own `ProfilePage.jsx`), and `LearnTabEntry.jsx`
for study mode. `PhysioFeedEntry.jsx` sets up a `MemoryRouter` (physiom
owns the real browser URL itself) and renders `PhysioFeedRoutes.jsx`,
which is the actual route table (`/feed`, `/profile`, `/people`,
`/messages`, etc.) inside `AppShell.jsx` (header + nav + content area).

**The one rule that matters most:** `src/physiofeed/data/db.js` is the
**only** file allowed to talk to Supabase or the mock data. Every page/
component calls `db.js` functions (usually via `AppDataContext.jsx`,
sometimes directly like `AdminReportsPage.jsx`/`MessagesPage.jsx` do for
page-local data) — never `mockData.js` or `supabase.js` directly from a
component. If a task involves data, `db.js` is where the logic goes.

### The db.js pattern (repeats ~20 times in that file)

```js
export async function doThing(...) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("table")...;
    if (error) throw error;
  } catch (e) {
    // fall back to mutating the local in-memory demo array (_posts/_people/etc.)
  }
  return getPosts(); // or whatever re-fetch reflects the new state
}
```
Real query first; any failure (not signed in, RLS block, or — the common
case — a demo/mock id that doesn't exist in the real table) falls back to
the original mock-array behavior. This is why the demo feed still works
for a signed-out visitor. **Exceptions that intentionally skip the
fallback and just throw:** `updateProfile()`, upload functions
(`uploadPostImage`/`uploadPostVideo`/`uploadProfileImage`), and all of
direct messages (`getConversations`/`getMessages`/`sendMessage`) —
there's nothing sensible to silently fall back to for those, so they
surface a real error instead of pretending to succeed.

### select("*") rule
Never add a new column to an explicit named `.select("col1, col2")` list
in `db.js` if the migration might not have run yet on production — an
unknown column fails the **whole** query (see `getPosts()`/`getPeople()`
comments). Use `select("*")` for any query whose shape might race ahead
of a migration.

## File map

### Core / routing
| File | What it is | Edit it to change |
|---|---|---|
| `PhysioFeedEntry.jsx` | Router mount point, `MemoryRouter` setup | How PhysioFeed embeds into physiom's tab system (rare) |
| `PhysioFeedRoutes.jsx` | Route table | Add/remove a page/route |
| `ProfileTabEntry.jsx` | Wires physiom's real "Profile" tab to PhysioFeed's `ProfilePage.jsx` | — |
| `LearnTabEntry.jsx` | Wires physiom's "Learn" tab to `learn/StudyMode.jsx` | Study-mode entry, unrelated to feed/social |
| `context/AppDataContext.jsx` | Global state: posts/people/profile/notifications/etc., one wrapper function per `db.js` mutation | Add a new global action here (add to both the `useCallback` and the `value` object) |
| `data/db.js` | **The** data layer (see above) | Any backend-touching logic |
| `data/mockData.js` | Seed data for the in-memory demo store (`CURRENT_USER`, `INITIAL_POSTS`, `PEOPLE`, etc.) | Demo/fallback content only |
| `lib/media.js` | Browser-only file validation/compression (no Supabase import) | Image/video upload limits, compression quality |
| `lib/supabase.js` | **DEAD CODE — not imported anywhere.** The real client is `src/supabase.js` (repo root `src/`, one level up). Don't confuse the two. | — |

### Layout
| File | What it is |
|---|---|
| `components/layout/AppShell.jsx` | Top-level shell: `DemoBanner`, `Header`, `MobileTabs` (pill nav strip, mobile-only), `Sidebar` (desktop-only), content area |
| `components/layout/Header.jsx` | Sticky top bar: logo, physio search dropdown (desktop, `hidden md:block`), notification bell, message icon, own-profile link (`hidden sm:flex`) |
| `components/layout/Sidebar.jsx` | Desktop-only left nav, renders `PRO_NAV` from `shared/constants.js` |
| `components/shared/constants.js` | `GRADIENTS` (avatar/tile color map), `PRO_NAV` (nav item list), `initialsOf()` |
| `components/shared/icons.jsx` | Central `iconName` string → lucide-react component registry. Adding a new icon anywhere needs an entry here first. |
| `components/shared/Avatar.jsx` | Renders `photoUrl` as a real `<img>` if set, else gradient+initials placeholder (auto-falls-back on image load error) |

### Feed
| File | What it is |
|---|---|
| `pages/FeedPage.jsx` | Feed screen: `StoriesBar` + `Composer` + `FeedPostCard` list + `FeedRightRail` |
| `components/feed/FeedPostCard.jsx` | The post card — likes/comments/follow/save/delete, all the interaction wiring |
| `components/feed/PostMedia.jsx` | Renders a post's media. Real uploaded photos in the main feed use natural aspect ratio (`object-contain`, capped height) — **don't** revert to `object-cover`, that was the "photos are cropped" bug. Grid thumbnails (`size="small"`) intentionally still crop. |
| `components/feed/DeletePostButton.jsx` | "..." menu on your own posts, two-tap confirm |
| `components/feed/ReportButton.jsx` | Flag-a-post menu (shown on others' posts) |
| `components/feed/GridPostCard.jsx` | Condensed card for Profile/Saved grids |
| `components/feed/CaseBody.jsx` / `ResearchBody.jsx` / `PollBody.jsx` | Renders structured post types (see `add_content_types.sql`) |
| `components/feed/create/*` | The "Create" flow: `CreateTypePicker` → `ComposerFrame` (shared chrome) → `PostComposer`/`CaseComposer`/`ResearchComposer`/`PollComposer` |
| `components/feed/StoriesBar.jsx` | Stories row (local-only, `markStorySeen`, not backed by real Storage yet) |

### Profile
| File | What it is |
|---|---|
| `pages/ProfilePage.jsx` | Your own profile page (there is **no** "view someone else's profile" page yet — a real gap; People/search/messages all link elsewhere instead) |
| `components/profile/ProfileHeader.jsx` | Cover + avatar + "Edit Profile" button → opens `EditProfileModal` |
| `components/profile/EditProfileModal.jsx` | Name/role/location/bio/quote fields, gradient picker, and real photo upload (validate → compress → `uploadProfileImage()` → preview; URL only saved on Save) |
| `components/profile/AboutCard.jsx`, `ExpertiseCard.jsx`, `EducationCard.jsx`, `AchievementsCard.jsx`, `ExerciseGrid.jsx` | Static/demo-only profile sections, not wired to Supabase (still 100% mock data) |

### People / search / messages
| File | What it is |
|---|---|
| `pages/PeoplePage.jsx` | People directory + search (name/role/location). Also shows a "(You)" card when your own name matches the search — `getPeople()` deliberately excludes you from the main list (can't follow yourself) |
| `components/people/PersonCard.jsx` | One person row: avatar, Message button (→ `/messages?with=id`), Follow button |
| `pages/MessagesPage.jsx` | Inbox + thread view. Loads its own data directly from `db.js` (not `AppDataContext` — page-local, like `AdminReportsPage.jsx`). Which thread is open lives in `?with=<userId>` |
| Header's search dropdown | Lives inline in `Header.jsx`, not a separate file — live-filters `people`, same "(You)" special case as PeoplePage |

### Other pages
| File | What it is |
|---|---|
| `pages/EvidencePage.jsx` | Research article library (admin-curated, `research_articles` table) |
| `pages/ExplorePage.jsx` | Trending topic tags (static list) + "Popular this week" (top posts by like count) + "Physios to follow" — all derived client-side from `posts`/`people`, no dedicated backend query |
| `pages/CommunitiesPage.jsx` | Join/leave communities |
| `pages/SavedPage.jsx` | Your saved posts |
| `pages/AdminReportsPage.jsx` | Admin-only (`profile.isAdmin`) moderation queue, page-local data |
| `learn/*` | Study mode for students (MMT/ROM/Neuro/Special tests) — **unrelated to the social feed**, reuses real clinical data, own separate concern |

## Supabase migrations (`supabase/*.sql`)

Run in the Supabase Dashboard → SQL Editor, in roughly this order (later
ones don't strictly depend on earlier ones except where noted). **This
sandbox cannot check what Aditi has actually run** — if a feature seems
to "not work," ask/consider whether the matching migration was run
before assuming it's a code bug.

| File | Adds | Required for |
|---|---|---|
| `schema.sql` | Original base schema (incl. `patients` with a wide-open `allow_all_patients` policy — see Known Issues) | Base app |
| `add_profiles_table.sql` | `profiles` table, real per-user identity | Any real (non-demo) PhysioFeed identity |
| `add_social_tables.sql` | `posts`, `post_likes`, `comments`, `follows`, `saved_posts` | Real posts/likes/comments/follows/saves |
| `add_evidence_communities.sql` | `research_articles`, `research_saves`, `communities`, `community_members` | Evidence + Communities pages |
| `add_notifications.sql` | `notifications` + SECURITY DEFINER triggers on like/comment/follow | Notification bell having real content |
| `add_moderation.sql` | `reports` table + admin policies | Report-a-post + admin review page |
| `add_media_storage.sql` | Storage buckets: `post-images`, `post-videos`, `profile-images` (folder-scoped RLS) | Any real file upload |
| `add_content_types.sql` | `post_type` + structured `media` fields, `poll_votes` | Case/Research/Poll post types |
| `add_profile_avatar.sql` | `profiles.avatar_url` column | Real profile photo upload |
| `add_direct_messages.sql` | `direct_messages` table + notify trigger | The Messages feature |
| `api_rate_limit_setup.sql`, `soft_delete_patients.sql` | Unrelated to PhysioFeed (clinical/patients side) | — |
| `/supabase_rls_setup.sql` (repo root, not in `supabase/`) | Locks down `patients` RLS to `auth.uid() = user_id`, explicitly drops the old `allow_all_patients` policy | Patient data isolation — **flagged open, unconfirmed whether run** (see Known Issues) |

## Verifying SQL/RLS locally (do this before handing Aditi any new migration)

Local Postgres 16 is installed but stopped by default:
```
service postgresql start
sudo -u postgres psql -c "CREATE DATABASE physiom_rls_test;"
```
Stub Supabase's `auth` schema (this project has no saved fixture file for
this — write it inline each time, it's short):
```sql
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
drop role if exists authenticated;
create role authenticated nologin;
grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
```
Then `\i supabase/your_migration.sql`, grant the new table(s) to
`authenticated`, seed a couple of `auth.users` rows, and run scenarios as
```sql
set role authenticated;
set request.jwt.claim.sub = '<uuid>';
-- try the thing; reset role; between scenarios
```
Drop the test database when done (`DROP DATABASE physiom_rls_test;`).
This exact technique verified `add_profile_avatar.sql` (3 scenarios) and
`add_direct_messages.sql` (7 scenarios) this session.

## Known conventions & gotchas (learned the hard way this session)

- **`JSON.parse(JSON.stringify(undefined))` throws a SyntaxError** —
  `JSON.stringify(undefined)` returns the actual `undefined` value, not
  the string `"undefined"`. This was the root cause of a real "likes/
  comments not working" bug (a `.find()` miss on a real post crashed
  *after* the real write had already succeeded, so the UI silently never
  updated). Any `clone(_array.find(...))` pattern in `db.js` needs a
  `found ? clone(found) : null` guard, not a bare `|| null`.
- **PostgREST schema cache lag** — right after a column is added via SQL,
  Supabase's API layer can return "could not find the 'X' column... in
  the schema cache" even though the column genuinely exists. Fix: either
  don't write that column from the client until it's confirmed visible,
  or tell Aditi to run `NOTIFY pgrst, 'reload schema';` in the SQL Editor.
- **Two-sided RLS for anything conversational** (DMs) — select policy
  must allow *either* party, not just the row's literal owner.
- Full Vitest suite times out — **always** scope to specific files.

## Known open issues / deferred (not fixed, don't assume they're fine)

- **`patients` table RLS**: `schema.sql` ships a wide-open
  `allow_all_patients` policy. `supabase_rls_setup.sql` exists to fix it
  properly (scoped to `auth.uid() = user_id`) but whether Aditi has
  actually run it against production is unconfirmed — this is a real
  patient-data exposure risk until verified. Don't silently "fix" it
  without her sign-off on the multi-clinician access model first (a
  clinic may legitimately want shared patient visibility — that's her
  call, not a unilateral code change).
- **No "view someone else's profile" page** — People/search/Messages all
  route around this gap (to `/people` or `/messages`, never a real
  profile URL). A real fix would need a `/profile/:userId` route.
- **Carousel index (`mediaIndex`) doesn't persist for real multi-photo
  posts** — it's local-array-only in `db.js`, a no-op for posts that live
  in the real `posts` table. Guarded against crashing, not actually fixed.
  Real fix: move `mediaIndex` into `FeedPostCard.jsx` component state.
- **`likedByPreview` avatars** show initials only, not real avatar URLs
  (`getPosts()` only carries liker *names* into that field, not full
  profile objects) — lower priority, larger change if ever requested.
- **Header's empty space on narrow/mobile widths** — logo text, own-
  profile avatar, and search bar are all `hidden sm:block`/`hidden
  md:block`, so there's dead space on phone-width screens. Aditi was
  asked to pick a fill (app name / avatar / search bar / trust my
  judgment) and the question was interrupted mid-session — **still open,
  ask her again or just pick one** rather than assuming an answer.
- **Messaging a demo/mock person** (e.g. `u-priya`, ids that aren't real
  Supabase auth users) will surface a real error in `MessagesPage.jsx`
  (foreign-key violation) rather than a graceful demo fallback — accepted
  as-is, not a bug, just a rough edge for demo content.

## Recent commit history (most recent first, for "what just happened")

```
77e67e8 Fix: chat icon missing from header on mobile widths
ad75335 Redesign: mobile PhysioFeed nav strip as pill tabs
74c0a31 Feature: chat area to message physios
620e8cc Fix: searching your own name in physio search always came back empty
ddf1590 Feature: search option to find physios
82cfaf0 Feature: delete post and delete comment options
55831cc Fix: uploaded photos in the feed were cropped to a fixed rectangle
6d36208 Feature: real profile photo upload
0a3ee6a Fix: profile save failed with schema-cache error on updated_at column
159b715 Fix: likes/comments/follows crashed silently on real posts; add profile editing
5a88e10 PhysioFeed: structured content types (Post/Case/Research/Video/Photo/Poll)
0ea009e PhysioFeed rollout step 6: real photo/video upload (final V1 item)
dcce9cd PhysioFeed rollout step 5: minimum moderation (report + admin review)
f705eeb PhysioFeed rollout step 3-4: people/evidence/communities/notifications on real Supabase
5de2afb PhysioFeed: wire posts/likes/comments/follows/saves to real Supabase
3b2a8f0 Supabase: add core social tables (posts/likes/comments/follows/saves)
ff24525 Supabase: add profiles table migration for PhysioFeed real identity
88a0184 PhysioFeed: wire getProfile() to real Supabase per-user identity
```
Run `git log --oneline -30` for more, or `git show <hash>` for full detail
on any of the above.

## Quick start checklist for a new session

1. Read this file. Skip re-exploring the repo unless something here seems
   stale (check file timestamps / `git log` if unsure).
2. Ask Aditi what broke or what she wants, in plain terms — she's
   non-technical, describes symptoms not causes.
3. Locate the relevant file(s) via the map above instead of grepping
   blind.
4. Follow the cadence section exactly. Don't skip the build/test steps
   to save time — they're fast and they're what keeps this reliable.
