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
// mode): a lucide-react icon component, used instead of emoji for those
// two datasets so the Learn tab's medical icons are consistent line-art
// SVGs (same icon set already used everywhere else in the app) rather
// than platform-inconsistent emoji glyphs. Takes priority over emoji.
export default function StudyGrid({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          aria-label={`Open ${item.title}`}
          className="text-left bg-white border border-slate-200 rounded-2xl p-3"
        >
          <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5 flex items-center justify-center">
            {item.Icon ? (
              <item.Icon size={44} strokeWidth={1.5} className="text-violet-500" aria-hidden="true"/>
            ) : item.emoji ? (
              <span className="text-5xl" aria-hidden="true">{item.emoji}</span>
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
      ))}
    </div>
  );
}
