import { X } from "lucide-react";
import FeedPostCard from "./FeedPostCard.jsx";

// Opened from GridPostCard.jsx (Profile/Saved/Explore grids) -- those tiles
// only ever showed a like/comment COUNT with no way to actually read or add
// a comment, unlike the main feed where FeedPostCard.jsx shows the full
// comment thread + an add-comment box. Rather than rebuild that inline
// engagement UI a second time for the grid, this modal renders the exact
// same FeedPostCard used on /feed -- guarantees the grid and the feed can
// never drift out of sync on what "the right way" to show likes/comments
// looks like, since it's literally the same component either place.
export default function PostDetailModal({ post, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-transparent w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end mb-2 px-1 sm:px-0">
          <button onClick={onClose} aria-label="Close post" className="p-1.5 rounded-full bg-white/90 text-slate-500 hover:text-slate-700 shadow-sm">
            <X size={18} />
          </button>
        </div>
        <FeedPostCard post={post} />
      </div>
    </div>
  );
}
