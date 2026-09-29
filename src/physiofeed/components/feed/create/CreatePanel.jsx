import { useNavigate } from "react-router-dom";
import { X, SquarePen, Briefcase, MessagesSquare, ChevronRight } from "lucide-react";
import { useAppData } from "../../../context/AppDataContext.jsx";

// The "Create" sheet from Aditi's redesigned-top-nav reference (2026-09-28):
// opened by the "+" in physiom's own top app header (see AppFull.jsx
// pm-mobile-hdr + CreatePanelBridge in PhysioFeedEntry.jsx), same three
// destinations the Feed composer's own picker already offers, just as a
// dedicated full-screen-reachable sheet instead of a small anchored dropdown.
const OPTIONS = [
  {
    Icon: SquarePen, bg: "#F0E8FF", color: "#6D28D9",
    title: "Create a Post",
    desc: "Share an update, clinical tip, research, or general discussion",
  },
  {
    Icon: Briefcase, bg: "#DDF8EA", color: "#16866B",
    title: "Post an Opportunity",
    desc: "Share a job, internship, collaboration, or workshop",
  },
  {
    Icon: MessagesSquare, bg: "#DCEAFF", color: "#2563EB",
    title: "Create a Case Discussion",
    desc: "Share an anonymized clinical case for discussion",
  },
];

export default function CreatePanel() {
  const navigate = useNavigate();
  const { createPanelOpen, setCreatePanelOpen, setComposerOpen, setComposerType } = useAppData();

  if (!createPanelOpen) return null;

  const close = () => setCreatePanelOpen(false);
  // "Create a Post" (2026-09-28, Aditi: "creat a post should open this
  // page..." pointing at CreateTypePicker's 7-way grid) opens the SAME
  // full picker the Feed composer's avatar/placeholder already does --
  // composerType null + composerOpen true is exactly the condition
  // Composer.jsx renders CreateTypePicker under -- rather than jumping
  // straight to a blank text-only post and hiding Clinical Case/Discussion/
  // Research/Video/Photo/Poll behind a second tap.
  const pick = (i) => {
    close();
    if (i === 0) { setComposerOpen(true); setComposerType(null); }
    else if (i === 1) navigate("/explore?create=1");
    else { setComposerOpen(true); setComposerType("discussion"); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40" onClick={close}>
      <div
        className="w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl bg-white p-4 shadow-xl max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: "calc(var(--pm-bnav-h, 60px) + env(safe-area-inset-bottom) + 1rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Create</h2>
          <button onClick={close} aria-label="Close" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center focus:outline-none">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {OPTIONS.map(({ Icon, bg, color, title, desc }, i) => (
            <button
              key={title}
              onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left focus:outline-none"
            >
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={20} strokeWidth={1.75} color={color} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-400 leading-snug">{desc}</span>
              </span>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
