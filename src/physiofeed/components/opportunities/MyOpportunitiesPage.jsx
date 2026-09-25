import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import OpportunityCard from "./OpportunityCard.jsx";

const STATUS_CHIP = {
  shortlisted: "bg-[#FFF4DC] text-[#8A6100]",
  passed: "bg-[#F4F2FA] text-[#8A7FA3]",
  new: "bg-[#F7F5FF] text-[#6E5CC7]",
};
const STATUS_LABEL = { shortlisted: "Shortlisted", passed: "Not selected", new: "Applied" };

// Student-side "My Opportunities" (Phase G, 2026-09-25) -- replaces the
// flat "My Applications" list with the tabs the brief calls for. Workshop
// registrations and everything-else applications both live in the same
// `applications` table (db.js's getMyApplications()), so they're split
// here by `a.opportunity.type` rather than needing a second query; Saved
// reads db.getSavedOpportunities() (built in Phase A, unused until now).
// Past is a status, not a source -- an item moves here the moment its
// opportunity's lifecycleStatus goes closed/expired/cancelled, regardless
// of which of the other three tabs it came from.
export default function MyOpportunitiesPage({
  registeredItems, applicationItems, savedItems, pastApplicationItems, pastSavedItems,
  onBack, onOpen,
}) {
  const [tab, setTab] = useState("registered");
  const TABS = [
    { key: "registered", label: "Registered", count: registeredItems.length },
    { key: "applications", label: "Applications", count: applicationItems.length },
    { key: "saved", label: "Saved", count: savedItems.length },
    { key: "past", label: "Past", count: pastApplicationItems.length + pastSavedItems.length },
  ];

  return (
    <main className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#F7F5FF] text-[#8A7FA3]"><ChevronLeft size={20} /></button>
        <h1 className="pf-font-head text-xl font-bold text-[#2B2140] flex-1">My Opportunities</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`pf-font-head shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border-2 ${tab === t.key ? "bg-[#FFB020] border-[#FFB020] text-[#3A2A00] shadow-sm" : "bg-white border-[#F1EEFB] text-[#6E5CC7]"}`}
          >
            {t.label} <span className={tab === t.key ? "opacity-70" : "text-[#C4BAE3]"}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "registered" && (
        <ApplicationList items={registeredItems} onOpen={onOpen} empty="You haven't registered for any workshops yet." />
      )}
      {tab === "applications" && (
        <ApplicationList items={applicationItems} onOpen={onOpen} empty="You haven't applied to anything yet." />
      )}
      {tab === "saved" && (
        savedItems.length === 0 ? (
          <p className="pf-font-body text-sm text-[#A79CC4]">Nothing saved yet -- tap the bookmark on a listing to keep it here.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 pb-6">
            {savedItems.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={onOpen} />)}
          </div>
        )
      )}
      {tab === "past" && (
        pastApplicationItems.length === 0 && pastSavedItems.length === 0 ? (
          <p className="pf-font-body text-sm text-[#A79CC4]">Nothing here yet -- closed, expired or cancelled listings you registered, applied or saved will show up here.</p>
        ) : (
          <div className="space-y-6 pb-6">
            {pastApplicationItems.length > 0 && (
              <div>
                {pastSavedItems.length > 0 && <p className="text-xs font-bold uppercase tracking-wide text-[#C4BAE3] mb-2.5">From your applications</p>}
                <ApplicationList items={pastApplicationItems} onOpen={onOpen} />
              </div>
            )}
            {pastSavedItems.length > 0 && (
              <div>
                {pastApplicationItems.length > 0 && <p className="text-xs font-bold uppercase tracking-wide text-[#C4BAE3] mb-2.5">From your saved</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  {pastSavedItems.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={onOpen} />)}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </main>
  );
}

function ApplicationList({ items, onOpen, empty }) {
  if (items.length === 0) return empty ? <p className="pf-font-body text-sm text-[#A79CC4]">{empty}</p> : null;
  return (
    <div className="space-y-3 pb-6">
      {items.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => a.opportunity && onOpen(a.opportunity)}
          className="w-full text-left bg-white border-2 border-[#F1EEFB] rounded-2xl px-4 py-3.5 hover:bg-[#FBFAFF] transition"
        >
          <p className="pf-font-head text-sm font-bold text-[#2B2140] leading-snug">{a.opportunity?.title || "Opportunity"}</p>
          <p className="pf-font-body text-xs text-[#8A7FA3] mb-2">{a.opportunity?.org || ""}</p>
          <span className={`pf-font-head inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[a.status] || STATUS_CHIP.new}`}>
            {STATUS_LABEL[a.status] || "Applied"}
          </span>
          <span className="pf-font-body text-[11px] text-[#A79CC4] ml-2">{a.appliedAgo}</span>
        </button>
      ))}
    </div>
  );
}
