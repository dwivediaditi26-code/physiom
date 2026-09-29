import { Image as ImageIcon } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import CreateTypePicker from "./create/CreateTypePicker.jsx";
import PostComposer from "./create/PostComposer.jsx";
import CaseComposer from "./create/CaseComposer.jsx";
import DiscussionComposer from "./create/DiscussionComposer.jsx";
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
    // Collapsed bar (2026-09-28, Aditi's redesigned-top-nav reference):
    // just the image shortcut now -- the document icon and "+" menu this
    // bar carried under the earlier "Option 6" mockup moved up into
    // CreatePanel.jsx, opened from physiom's own top header instead (see
    // AppFull.jsx's pm-mobile-hdr). Tapping the avatar/placeholder still
    // opens the full picker -- it's the only way to reach Video/Poll/
    // Research/Clinical Case, none of which get a dedicated control.
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-center gap-3">
        <button
          onClick={() => setComposerOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none"
        >
          <Avatar size={36} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
          <span className="text-sm text-[#8995AA] truncate">Share a clinical tip, case, or research…</span>
        </button>
        <button
          onClick={() => { setComposerOpen(true); setComposerType("photo"); }}
          aria-label="Add a photo"
          className="p-2 rounded-lg hover:bg-slate-50 text-[#8995AA] shrink-0 focus:outline-none"
        >
          <ImageIcon size={19} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  if (!composerType) {
    return <CreateTypePicker onPick={setComposerType} onClose={() => setComposerOpen(false)} />;
  }

  switch (composerType) {
    case "case": return <CaseComposer />;
    case "discussion": return <DiscussionComposer />;
    case "research": return <ResearchComposer />;
    case "poll": return <PollComposer />;
    case "video": return <PostComposer mode="video" />;
    case "photo": return <PostComposer mode="photo" />;
    default: return <PostComposer mode="post" />;
  }
}
