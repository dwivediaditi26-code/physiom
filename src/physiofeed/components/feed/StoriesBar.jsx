import { useState } from "react";
import { Plus } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { GRADIENTS, initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";
import CreateStoryModal from "./CreateStoryModal.jsx";
import StoryViewer from "./StoryViewer.jsx";

// Feature (2026-08-19): real stories. Previously this whole bar was
// decoration -- "+ Your story" opened the regular post composer (shared
// composerOpen state with the feed's "Share a clinical tip" box, not a
// story flow at all), the five names were fixed and fake, and tapping a
// ring just flipped it gray with nothing behind it. Now real story
// groups (one ring per author, however many stories they've posted) open
// an actual full-screen viewer (StoryViewer.jsx); the "+" opens a real
// upload flow (CreateStoryModal.jsx).
//
// `stories` still falls back to the old five-name placeholder list when
// nobody's posted a real one yet or the migration hasn't run (see
// db.js's getStories()) -- those entries carry isDemo: true, so tapping
// one here keeps the old cosmetic-only "just turn the ring gray" behavior
// instead of opening a viewer with no real media to show.
export default function StoriesBar() {
  const { stories, viewStory, profile } = useAppData();
  const [creating, setCreating] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);

  if (!profile) return null;

  const mine = stories.find((s) => s.authorId === profile.id);
  const others = stories.filter((s) => s.authorId !== profile.id);

  const openGroup = (s) => {
    if (s.isDemo) { viewStory(s.items[0].id); return; }
    setViewingGroup(s);
  };

  return (
    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-4 px-0.5 py-1">
      <button onClick={() => (mine ? openGroup(mine) : setCreating(true))} className="flex flex-col items-center gap-1 shrink-0 w-16">
        <div className={`relative w-14 h-14 rounded-full p-[2px] ${mine ? `bg-gradient-to-br ${GRADIENTS.violet}` : "bg-slate-200"}`}>
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
              {mine ? (
                <Avatar size={48} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
              ) : (
                <Plus size={18} className="text-violet-600" />
              )}
            </div>
          </div>
          {mine && (
            <button
              onClick={(e) => { e.stopPropagation(); setCreating(true); }}
              aria-label="Add another story"
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center ring-2 ring-white"
            >
              <Plus size={11} />
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-500 truncate w-full text-center">Your story</span>
      </button>

      {others.map((s) => (
        <button key={s.authorId} onClick={() => openGroup(s)} className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className={`w-14 h-14 rounded-full p-[2px] ${s.seen ? "bg-slate-200" : `bg-gradient-to-br ${GRADIENTS[s.grad]}`}`}>
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <Avatar size={48} grad={s.grad} initials={s.initials || initialsOf(s.name)} photoUrl={s.avatarUrl} />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 truncate w-full text-center">{s.name}</span>
        </button>
      ))}

      {creating && <CreateStoryModal onClose={() => setCreating(false)} />}
      {viewingGroup && <StoryViewer group={viewingGroup} isOwn={viewingGroup.authorId === profile.id} onClose={() => setViewingGroup(null)} />}
    </div>
  );
}
