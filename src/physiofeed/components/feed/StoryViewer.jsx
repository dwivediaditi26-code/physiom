import { useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

const IMAGE_MS = 5000;
const FALLBACK_VIDEO_MS = 8000;
const TICK_MS = 50;

function timeAgo(iso) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

// Feature (2026-08-19): the actual full-screen story viewer -- before
// this, tapping a story ring just turned it gray with nothing behind it.
// Only ever opened with a REAL group (StoriesBar.jsx keeps the old
// cosmetic-only tap for "demo-" groups, since there's no real media to
// show for those). Deliberately doesn't chain into the next person's
// stories once this one finishes -- closes instead -- to keep V1 scope
// tight; same reasoning as the original media-upload rollout shipping
// without video compression.
//
// The progress bar advances on a fixed timer (5s per photo, the story's
// own recorded duration -- or an 8s fallback -- per video) rather than
// being wired to the actual <video> element's playback clock. Simpler,
// and close enough for a first version; a slow connection could make the
// video and the bar drift out of sync, which is an acceptable trade-off
// here but worth knowing about.
export default function StoryViewer({ group, isOwn, onClose }) {
  const { viewStory, deleteStory } = useAppData();
  const [items, setItems] = useState(group.items);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seenRef = useRef(new Set());
  const current = items[index];

  useEffect(() => {
    if (!current) { onClose(); return; }
    if (!seenRef.current.has(current.id)) {
      seenRef.current.add(current.id);
      viewStory(current.id);
    }
    setProgress(0);
    setConfirmDelete(false);
    const durationMs = current.mediaType === "video" ? (current.duration ? current.duration * 1000 : FALLBACK_VIDEO_MS) : IMAGE_MS;
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        goNext();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  // -1 is a sentinel for "past the last item" -- the effect above already
  // closes the viewer via its `if (!current)` guard once index reaches it,
  // so there's no separate close-on-advance effect needed here.
  const goNext = () => {
    setIndex((i) => (i + 1 < items.length ? i + 1 : -1));
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const del = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteStory(current.id);
      const remaining = items.filter((it) => it.id !== current.id);
      if (remaining.length === 0) { onClose(); return; }
      setItems(remaining);
      setIndex((i) => Math.min(i, remaining.length - 1));
    } catch (e) {
      // Nothing sensible to show inline in a full-screen viewer -- log it
      // and let them try the "..."/delete again.
      console.error("Couldn't delete story:", e?.message || e);
      setConfirmDelete(false);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full h-full sm:max-w-sm sm:h-[92vh] sm:rounded-2xl overflow-hidden bg-slate-900">
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {items.map((it, i) => (
            <div key={it.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${i < index ? 100 : i === index ? progress : 0}%`, transition: i === index ? "none" : undefined }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Avatar size={30} grad={group.grad} initials={group.initials} photoUrl={group.avatarUrl} />
            <div>
              <p className="text-white text-xs font-semibold">{group.name}</p>
              <p className="text-white/70 text-[10px]">{timeAgo(current.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwn && (
              <button
                onClick={del}
                aria-label="Delete this story"
                className="flex items-center gap-1 text-white/90 hover:text-white text-[10px] font-medium bg-black/30 rounded-full px-2 py-1"
              >
                <Trash2 size={12} /> {confirmDelete ? "Tap again" : ""}
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="text-white/90 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="absolute inset-0">
          {current.mediaType === "video" ? (
            <video key={current.id} src={current.mediaUrl} className="w-full h-full object-contain" autoPlay muted playsInline />
          ) : (
            <img key={current.id} src={current.mediaUrl} alt="" className="w-full h-full object-contain" />
          )}
        </div>

        <button onClick={goPrev} aria-label="Previous story" className="absolute inset-y-0 left-0 w-1/3 z-10" />
        <button onClick={goNext} aria-label="Next story" className="absolute inset-y-0 right-0 w-2/3 z-10" />
      </div>
    </div>
  );
}
