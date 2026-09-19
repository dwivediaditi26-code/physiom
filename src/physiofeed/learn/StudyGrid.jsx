import StudyImage from "./StudyImage.jsx";
import { DisplayFont } from "./learnTheme.jsx";

// Each card gets its own colour, cycling through a palette (literal class names).
const CARD_COLORS = [
  { border: "border-violet-200", bar: "bg-violet-500", img: "bg-violet-50", tag: "bg-violet-100 text-violet-700" },
  { border: "border-sky-200", bar: "bg-sky-500", img: "bg-sky-50", tag: "bg-sky-100 text-sky-700" },
  { border: "border-orange-200", bar: "bg-orange-500", img: "bg-orange-50", tag: "bg-orange-100 text-orange-700" },
  { border: "border-rose-200", bar: "bg-rose-500", img: "bg-rose-50", tag: "bg-rose-100 text-rose-700" },
  { border: "border-cyan-200", bar: "bg-cyan-500", img: "bg-cyan-50", tag: "bg-cyan-100 text-cyan-700" },
  { border: "border-pink-200", bar: "bg-pink-500", img: "bg-pink-50", tag: "bg-pink-100 text-pink-700" },
];

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
      <DisplayFont/>
      {items.map((item, idx) => {
        const c = CARD_COLORS[idx % CARD_COLORS.length];
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
          className={`text-left bg-white border ${c.border} rounded-2xl p-3 pt-0 overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] transition`}
        >
          <div className={`h-1.5 -mx-3 mb-3 ${c.bar}`}/>
          <div className={`h-32 w-full rounded-xl overflow-hidden ${c.img} mb-2.5 flex items-center justify-center`}>
            {item.image ? (
              <StudyImage name={item.image} size={128} fallback={fallback}/>
            ) : fallback ? (
              fallback
            ) : (
              <StudyImage name={item.image} size={128}/>
            )}
          </div>
          <div className="cl-display text-sm font-extrabold text-slate-900 leading-tight line-clamp-2">{item.title}</div>
          {item.subtitle && <div className="text-xs text-slate-500 mt-1 truncate">{item.subtitle}</div>}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {item.tags.map((tag, i) => (
                <span key={i} className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${c.tag}`}>{tag}</span>
              ))}
            </div>
          )}
        </button>
        );
      })}
    </div>
  );
}
