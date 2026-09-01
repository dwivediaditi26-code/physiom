import StudyImage from "./StudyImage.jsx";

// Overview grid -- 2-column colorful tile cards, matching the same card
// style Learn's own Assessment Library already uses (white bg, border,
// rounded-2xl) so study mode feels consistent with the rest of Learn.
// Image sits in a fixed 128px-tall box (not scaled to the tile's own
// width) so it stays a contained thumbnail instead of growing to fill
// the whole card on a wide screen. Title below, short real-data tag pills
// where the item has genuine discrete fields worth calling out. Tapping a
// tile opens the full detail page for that item (StudyDetail), it does
// not expand inline.
//
// `item.emoji` (2026-08-19, Outcome Measures/Functional Screen study
// mode): those datasets have a real emoji icon per item (same one the
// actual clinical screen shows) but no uploaded Cloudinary photo -- shows
// the real emoji large instead of StudyImage's "no image" placeholder.
// ROM/MMT/Special/Neuro cards don't set this, so they're unaffected.
//
// `item.Icon` (2026-08-27, Cardio & Respiratory / Neuro Conditions study
// mode): a lucide-react icon component, same icon set used everywhere else
// in the app. 2026-09-01: no longer an outright alternative to item.image
// -- when both exist, the real photo (matching what the live assessment's
// own InfoCard already shows for that item) is tried first via
// StudyImage's `fallback` prop, and the icon only shows if that photo
// hasn't actually been uploaded yet (404) instead of item.Icon silently
// hiding a real photo, or a bare "broken image" glyph showing for photos
// that just aren't uploaded yet.
export default function StudyGrid({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const fallback = item.Icon
          ? <item.Icon size={44} strokeWidth={1.5} className="text-violet-500" aria-hidden="true"/>
          : item.emoji
          ? <span className="text-5xl" aria-hidden="true">{item.emoji}</span>
          : null;
        return (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          aria-label={`Open ${item.title}`}
          className="text-left bg-white border border-slate-200 rounded-2xl p-3"
        >
          <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5 flex items-center justify-center">
            {item.image ? (
              <StudyImage name={item.image} size={128} fallback={fallback}/>
            ) : fallback ? (
              fallback
            ) : (
              <StudyImage name={item.image} size={128}/>
            )}
          </div>
          <div className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{item.title}</div>
          {item.subtitle && <div className="text-xs text-slate-500 mt-1 truncate">{item.subtitle}</div>}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {item.tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}
        </button>
        );
      })}
    </div>
  );
}
