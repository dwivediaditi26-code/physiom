import { MapPin, IndianRupee, Clock, Video } from "lucide-react";
import { TYPE_COLORS } from "../../data/opportunitiesMock.js";

const TYPE_LABEL = { job: "Job", internship: "Internship", collaboration: "Collaboration", workshop: "Workshop" };

// "Candy Coat" (2026-09-22, Aditi's pick from three Explore restyle
// directions): each opportunity type owns a real color, carried through
// this card's top tint, badge and CTA -- instead of one flat violet for
// every card regardless of type. See TYPE_COLORS in opportunitiesMock.js.
function Pill({ children, icon: Icon }) {
  return (
    <span className="pf-font-body inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F7F5FF] text-[#6E5CC7]">
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

export default function OpportunityCard({ opp, onOpen }) {
  const isWorkshop = opp.type === "workshop";
  const c = TYPE_COLORS[opp.type] || TYPE_COLORS.job;

  return (
    <div
      className="rounded-[22px] p-4 border-2 shadow-sm hover:shadow-md transition"
      style={{ borderColor: "#F1EEFB", background: `linear-gradient(180deg, ${c.tint} 0%, #fff 88px)` }}
    >
      {opp.bannerUrl && (
        <button type="button" onClick={() => onOpen(opp)} className="block w-full h-28 -mt-4 -mx-4 mb-3 rounded-t-[20px] overflow-hidden" style={{ width: "calc(100% + 2rem)" }}>
          <img src={opp.bannerUrl} alt="" className="w-full h-full object-cover" />
        </button>
      )}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs pf-font-head font-bold shrink-0" style={{ background: c.solid }}>
            {opp.orgInitials}
          </div>
          <div className="min-w-0">
            <p className="pf-font-body text-sm font-bold text-slate-900 truncate">{opp.org}</p>
            <span className="pf-font-head inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: c.solid }}>
              {TYPE_LABEL[opp.type]}
            </span>
          </div>
        </div>
        <span className="pf-font-body text-[11px] text-slate-400 shrink-0">{opp.postedAgo}</span>
      </div>

      <button type="button" onClick={() => onOpen(opp)} className="text-left w-full">
        <p className="pf-font-head text-[15px] font-bold text-slate-900 leading-snug mb-1">{opp.title}</p>
        <p className="pf-font-body text-sm text-slate-500 leading-snug mb-3 line-clamp-2">{opp.description}</p>
      </button>

      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {isWorkshop ? (
          <>
            <Pill icon={Clock}>{opp.date}</Pill>
            {opp.mode === "Online" && <Pill icon={Video}>{opp.mode}</Pill>}
            <Pill icon={IndianRupee}>{opp.fee}{opp.feeNote ? ` · ${opp.feeNote}` : ""}</Pill>
          </>
        ) : (
          <>
            {opp.location && <Pill icon={MapPin}>{opp.location}</Pill>}
            {(opp.stipend || opp.salary) && <Pill icon={IndianRupee}>{opp.stipend || opp.salary}</Pill>}
            {opp.tags?.map((t) => <Pill key={t}>{t}</Pill>)}
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onOpen(opp)} className="pf-font-body text-xs font-bold text-slate-500 hover:text-slate-700">View details</button>
        <button
          type="button"
          onClick={() => onOpen(opp)}
          data-opp-cta
          className="pf-font-head text-xs font-bold text-white px-4 py-2 rounded-xl shadow-sm active:scale-[0.97] transition"
          style={{ background: c.solid }}
        >
          {isWorkshop ? "Register" : "Apply"}
        </button>
      </div>
    </div>
  );
}
