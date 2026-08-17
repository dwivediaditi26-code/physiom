import { ClipboardList, Clock, Languages, ShieldCheck } from "lucide-react";

export default function AboutCard() {
  const rows = [
    { icon: ClipboardList, text: "Sports Physiotherapist" },
    { icon: Clock, text: "5+ years of experience" },
    { icon: Languages, text: "Speaks: English, Hindi, Marathi" },
    { icon: ShieldCheck, text: "Member: IAP, WCPT" },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">About</p>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const Icon = r.icon;
          return <div key={r.text} className="flex items-center gap-2.5 text-sm text-slate-600"><Icon size={15} className="text-slate-400 shrink-0" /> {r.text}</div>;
        })}
        <div className="flex items-center gap-2.5 text-sm text-emerald-600 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available for online consults</div>
      </div>
    </div>
  );
}
