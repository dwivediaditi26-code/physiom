import { MemoryRouter } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import "./physiofeed.css";

// Reuses PhysioFeed's own profile page design (cover, avatar, stats, tabs,
// posts) for physiom's real Profile tab -- same component, no separate
// build.
//
// Bug fix (2026-08-19): this used to skip MemoryRouter entirely on the
// (once-true) assumption that "ProfilePage and its subcomponents don't use
// any react-router hooks". That stopped being true the moment
// FeedPostCard.jsx gained author <Link>s (for jumping to someone's
// profile) and GridPostCard.jsx started opening PostDetailModal.jsx (which
// renders that same FeedPostCard for the full comment view) -- clicking a
// post's comment icon here crashed the whole tab with "useHref() may be
// used only in the context of a <Router>". Wrapped the same way
// PhysioFeedEntry.jsx already wraps the real PhysioFeed tab, for the same
// reason: an isolated MemoryRouter, not BrowserRouter, so it doesn't fight
// with physiom's own real browser URL/back-button handling.
//
// The bio/stats/posts shown are still PhysioFeed's demo data (same caveat
// as the PhysioFeed tab itself -- not real follower counts for the actual
// logged-in user yet), so this stays clearly labeled rather than presenting
// fabricated numbers as real. Real sign-out is wired in below the profile
// card since that's the one genuinely real, necessary action this screen
// needs regardless of demo content.
//
// `pf-bare-entry` (2026-09-22, ProfileTabs.jsx's new sticky tab bar):
// unlike PhysioFeedEntry.jsx (the real PhysioFeed tab), this route renders
// ProfilePage with no AppShell/Header.jsx above it -- so there's no
// .pf-header for the new sticky tab strip to stack under. Marks that for
// physiofeed.css so it clears physiom's own top bar directly instead of
// leaving a gap sized for a header that isn't here.
export default function ProfileTabEntry({ onSignOut }) {
  return (
    <div className="physiofeed-root pf-bare-entry">
      <MemoryRouter initialEntries={["/profile"]}>
        <AppDataProvider>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium rounded-xl py-1.5 px-3 mb-4">
            Demo profile — bio, stats and posts below are placeholder content, not your real activity yet.
          </div>
          <div className="flex gap-6">
            <ProfilePage/>
          </div>
          <button onClick={onSignOut} className="w-full mt-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-sm text-rose-600">
            Sign out
          </button>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}
