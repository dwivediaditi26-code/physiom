import { createPortal } from "react-dom";
import { X, GraduationCap, Briefcase, Users2, Handshake } from "lucide-react";

// "What do you want to post?" (2026-09-24) -- the entry point the Explore
// FAB opens before any create form. Workshop hands off to its own wizard
// (WorkshopWizard.jsx); the other three share
// wizard/ApplicationOpportunityForm.jsx, parameterized by type.
// Color-coded per type (2026-09-28, Aditi: "make it white not gray, and
// colour codded") instead of one shared indigo tone -- same palette as the
// main nav icons (Header.jsx) and CreatePanel.jsx, so a type reads at a
// glance instead of every row looking the same.
// Order: Job, Internship, Workshop, Collaboration (2026-09-28, Aditi).
const TYPES = [
  { key: "job", label: "Job", sub: "Full-time / part-time", icon: Briefcase, bg: "#DDF8EA", color: "#16866B" },
  { key: "internship", label: "Internship", sub: "Student opportunity", icon: Users2, bg: "#DCEAFF", color: "#2563EB" },
  { key: "workshop", label: "Workshop", sub: "Course / webinar", icon: GraduationCap, bg: "#F0E8FF", color: "#6D28D9" },
  { key: "collaboration", label: "Collaboration", sub: "Research / project", icon: Handshake, bg: "#FFE9D6", color: "#C2410C" },
];

export default function CreateOpportunityTypePicker({ onClose, onPick }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-slate-900">What do you want to post?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        <div className="px-5 pb-8 space-y-2.5">
          {TYPES.map(({ key, label, sub, icon: Icon, bg, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="w-full flex items-center gap-3 text-left bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={20} color={color} strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">{label}</span>
                <span className="block text-xs text-slate-500">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
