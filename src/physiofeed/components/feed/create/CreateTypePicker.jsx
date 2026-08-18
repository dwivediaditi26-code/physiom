import { FileText, Stethoscope, FlaskConical, Video, Image as ImageIcon, BarChart3 } from "lucide-react";

// The very first thing a physio sees after tapping "Create" -- picking a
// type up front is what keeps the feed from turning into one undifferentiated
// wall of text (Aditi's spec, 2026-08-18). Each tile just sets composerType;
// Composer.jsx renders the matching sub-composer once one is picked.
const TYPES = [
  { id: "post", icon: FileText, label: "Post", desc: "Share something with physiotherapists" },
  { id: "case", icon: Stethoscope, label: "Clinical Case", desc: "Share an educational case" },
  { id: "research", icon: FlaskConical, label: "Research", desc: "Share / discuss research" },
  { id: "video", icon: Video, label: "Video", desc: "Technique · Exercise · Tip" },
  { id: "photo", icon: ImageIcon, label: "Photo / Image", desc: "Posture · exercise · diagram" },
  { id: "poll", icon: BarChart3, label: "Poll", desc: "Ask the physio community" },
];

export default function CreateTypePicker({ onPick, onClose }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-sm">Create on PhysioFeed</h3>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {TYPES.map(({ id, icon: Icon, label, desc }) => (
          <button
            key={id}
            onClick={() => onPick(id)}
            className="flex flex-col items-start gap-1.5 text-left p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <Icon size={18} className="text-violet-600" />
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <span className="text-[11px] text-slate-400 leading-snug">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
