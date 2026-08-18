import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import CreateTypePicker from "./create/CreateTypePicker.jsx";
import PostComposer from "./create/PostComposer.jsx";
import CaseComposer from "./create/CaseComposer.jsx";
import ResearchComposer from "./create/ResearchComposer.jsx";
import PollComposer from "./create/PollComposer.jsx";

// Router for the whole "Create" flow (Aditi's spec, 2026-08-18): tapping
// the collapsed bar opens the type picker first instead of a blank text
// box, then renders whichever composer matches the chosen type. Video and
// Photo both reuse PostComposer (same post shape, just media-first
// framing) -- Case/Research/Poll get their own structured composers since
// their card layout is genuinely different.
export default function Composer() {
  const { composerOpen, setComposerOpen, composerType, setComposerType, profile } = useAppData();

  if (!profile) return null;

  if (!composerOpen) {
    return (
      <button
        onClick={() => setComposerOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-left hover:border-violet-200 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} />
        <span className="text-sm text-slate-400">Share a clinical tip, case, or research with the community…</span>
      </button>
    );
  }

  if (!composerType) {
    return <CreateTypePicker onPick={setComposerType} onClose={() => setComposerOpen(false)} />;
  }

  switch (composerType) {
    case "case": return <CaseComposer />;
    case "research": return <ResearchComposer />;
    case "poll": return <PollComposer />;
    case "video": return <PostComposer mode="video" />;
    case "photo": return <PostComposer mode="photo" />;
    default: return <PostComposer mode="post" />;
  }
}
