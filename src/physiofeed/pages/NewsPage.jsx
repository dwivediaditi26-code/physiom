import CareerNewsBoard from "../components/news/CareerNewsBoard.jsx";

// Own top-level nav item, beside Opportunity (2026-09-30, Aditi's
// arrow-annotated screenshot: pointed from the News toggle up at the top
// nav row, between Opportunity and Case Discussion -- moved out of being a
// sub-tab inside ExplorePage into its own route/nav entry, see
// constants.js's PRO_NAV and Header.jsx's NAV_ITEMS).
export default function NewsPage() {
  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-2xl font-extrabold text-[#2B2140] mb-1">News & Updates</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Daily briefing for physiotherapists.</p>
      </div>
      <CareerNewsBoard />
    </main>
  );
}
