import { useEffect } from "react";
import { Link } from "react-router-dom";
import CareerNewsBoard from "../components/news/CareerNewsBoard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own top-level nav item, beside Opportunity (2026-09-30, Aditi's
// arrow-annotated screenshot: pointed from the News toggle up at the top
// nav row, between Opportunity and Case Discussion -- moved out of being a
// sub-tab inside ExplorePage into its own route/nav entry, see
// constants.js's PRO_NAV and Header.jsx's NAV_ITEMS).
export default function NewsPage() {
  const { profile, notifications, markNotificationRead } = useAppData();
  // Opening News counts as seeing the "new in News" bell item.
  const unseenNews = notifications.find((n) => String(n.id).startsWith("news:") && !n.read);
  useEffect(() => {
    if (unseenNews) markNotificationRead(unseenNews.id);
  }, [unseenNews?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-2xl font-extrabold text-[#2B2140] mb-1">News & Updates</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Daily briefing for physiotherapists.</p>
        {/* Admin accounts only. The desktop sidebar already lists admin pages,
            but there is no sidebar on a phone, so this is the way in there. */}
        {profile?.isAdmin && (
          <Link to="/admin/news" className="inline-flex items-center gap-1 mt-3 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">＋ Add news</Link>
        )}
      </div>
      <CareerNewsBoard />
    </main>
  );
}
