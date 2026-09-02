import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Full detail page for one item -- the whole uploaded photo at full size
// (never cropped, unlike the small square list thumbnail), then all of
// its real data below as the same info cards the actual clinical entry
// screen shows for this item, just without the interactive recording
// controls (this view is read-only). Opened by tapping a row in
// StudyGrid; back returns to the grid, not all the way out to Learn.
export default function StudyDetail({ item, onBack, children }) {
  // Same "real photo first, icon/emoji as its fallback" rule as
  // StudyGrid.jsx (2026-09-01) -- a photo that matches the live
  // assessment's InfoCard takes priority when uploaded; the icon only
  // shows in its place if that photo 404s, not just because both exist.
  const fallback = item.Icon
    ? <item.Icon size={88} strokeWidth={1.25} className="text-violet-500 py-6" aria-hidden="true"/>
    : item.emoji
    ? <span className="text-8xl py-6" aria-hidden="true">{item.emoji}</span>
    : null;
  // 2026-09-02, Aditi: "cardio study mode doesn't show the same three
  // images as the live cardio info cards" -- item.images (up to 3, see
  // CardioStudy.jsx) drives a swipeable gallery here, matching the live
  // InfoCard.jsx popup; item.image alone (every other study dataset)
  // still renders as the single photo it always has.
  const names = item.images?.length ? item.images : item.image ? [item.image] : [];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 flex items-center justify-center" style={fallback ? { minHeight: 160 } : undefined}>
          {names.length ? (
            <ImageGallery names={names} fallback={fallback}/>
          ) : fallback ? (
            fallback
          ) : (
            <StudyImage name={null} full/>
          )}
        </div>
        <div className="p-4">
          <div className="text-xl font-semibold text-slate-900">{item.title}</div>
          {item.subtitle && <div className="text-sm font-medium text-violet-600 mt-1">{item.subtitle}</div>}
          {children && <div className="mt-4 space-y-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// Pages through up to 3 real photos, same swipe-or-tap-dot interaction as
// InfoCard.jsx's PerformPane so study mode matches the live info-card
// gallery it's mirroring instead of only ever showing the first photo.
function ImageGallery({ names, fallback }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [names]);
  const active = Math.min(idx, names.length - 1);
  const touchStartX = useRef(null);
  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 30 || names.length < 2) return;
    if (dx < 0) setIdx((i) => Math.min(names.length - 1, i + 1));
    else setIdx((i) => Math.max(0, i - 1));
  }
  return (
    <div className="w-full">
      <div style={{ touchAction: "pan-y" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <StudyImage name={names[active]} full fallback={fallback}/>
      </div>
      {names.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2.5">
          {names.map((_, i) => (
            <span
              key={i}
              onClick={() => setIdx(i)}
              role="button"
              aria-label={`Photo ${i + 1} of ${names.length}`}
              className={`h-1.5 rounded-full cursor-pointer ${i === active ? "w-4 bg-violet-500" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
