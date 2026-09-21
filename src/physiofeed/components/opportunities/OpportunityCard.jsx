import { MapPin, IndianRupee, Clock, Video } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";

const TYPE_LABEL = { job: "Job", internship: "Internship", collaboration: "Collaboration", workshop: "Workshop" };
const TYPE_TINT = {
  job: "bg-violet-50 text-violet-700",
  internship: "bg-teal-50 text-teal-700",
  collaboration: "bg-amber-50 text-amber-700",
  workshop: "bg-rose-50 text-rose-700",
};

function Pill({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

export default function OpportunityCard({ opp, onOpen }) {
  const isWorkshop = opp.type === "workshop";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar size={34} grad={opp.orgGradient} initials={opp.orgInitials} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{opp.org}</p>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_TINT[opp.type]}`}>{TYPE_LABEL[opp.type]}</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">{opp.postedAgo}</span>
      </div>

      <button type="button" onClick={() => onOpen(opp)} className="text-left w-full">
        <p className="text-[15px] font-bold text-slate-900 leading-snug mb-1">{opp.title}</p>
        <p className="text-sm text-slate-500 leading-snug mb-3 line-clamp-2">{opp.description}</p>
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
        <button type="button" onClick={() => onOpen(opp)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">View details</button>
        <button
          type="button"
          onClick={() => onOpen(opp)}
          className="text-xs font-bold text-white px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm active:scale-[0.97] transition"
        >
          {isWorkshop ? "Register" : "Apply"}
        </button>
      </div>
    </div>
  );
}
