import { Heart, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import { GRADIENTS } from "../shared/constants.js";

export default function PostMedia({ post, onDoubleTap, burst, size = "large" }) {
  const img = post.media === "carousel" ? post.images[post.mediaIndex || 0] : null;
  const bgGrad = img ? img.gradient : post.gradient;
  const h = size === "large" ? "h-56 sm:h-72" : "h-44";

  // Real uploaded media (post-images/post-videos Storage buckets) takes
  // over rendering entirely for "photo"/"video" posts that actually have
  // media_urls -- everything below this block is unchanged and still
  // handles every demo post (gradient tiles, checklist/phases overlays,
  // the demo carousel) exactly as before.
  const hasRealMedia = Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0;
  if (hasRealMedia && (post.media === "photo" || post.media === "video")) {
    const idx = post.mediaIndex || 0;
    const currentUrl = post.mediaUrls[idx];
    return (
      <div onDoubleClick={onDoubleTap} className={`relative ${h} rounded-2xl bg-slate-900 overflow-hidden select-none`}>
        {post.media === "photo" ? (
          <img src={currentUrl} alt={post.heading} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <video src={currentUrl} controls className="absolute inset-0 w-full h-full object-contain bg-black" />
        )}
        {post.media === "photo" && post.heading && (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4 pointer-events-none">
            <h3 className={`text-white font-bold ${size === "large" ? "text-lg sm:text-xl" : "text-sm"} leading-snug drop-shadow-sm`}>{post.heading}</h3>
          </div>
        )}
        {post.media === "photo" && post.mediaUrls.length > 1 && size === "large" && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onDoubleTap("prev"); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white"><ChevronLeft size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDoubleTap("next"); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white"><ChevronRight size={16} /></button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.mediaUrls.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} />)}
            </div>
          </>
        )}
        {burst && <Heart size={72} className="absolute inset-0 m-auto text-white fill-white animate-ping opacity-90 pointer-events-none" />}
      </div>
    );
  }

  return (
    <div onDoubleClick={onDoubleTap} className={`relative ${h} rounded-2xl bg-gradient-to-br ${GRADIENTS[bgGrad]} overflow-hidden flex items-end p-4 sm:p-5 select-none`}>
      <Icon name={post.iconName} size={size === "large" ? 28 : 22} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/70" />

      {post.media === "video" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${size === "large" ? "w-14 h-14" : "w-11 h-11"} rounded-full bg-white/25 backdrop-blur flex items-center justify-center`}>
            <Play size={size === "large" ? 22 : 18} className="text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
      {post.media === "video" && (
        <span className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-[11px] sm:text-xs font-medium text-white bg-black/40 px-1.5 sm:px-2 py-0.5 rounded-md">{post.duration}</span>
      )}
      {post.media === "checklist" && (
        <ul className="relative z-10 space-y-1 sm:space-y-1.5">
          {post.checklist.map((c) => (
            <li key={c} className="text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/80" /> {c}
            </li>
          ))}
        </ul>
      )}
      {post.media === "phases" && (
        <div className="relative z-10 flex gap-1.5 sm:gap-2">
          {post.phases.map((ph, i) => (
            <span key={ph} className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg ${i === 0 ? "bg-white text-slate-900" : "bg-white/20 text-white"}`}>{ph}</span>
          ))}
        </div>
      )}
      {img && <span className="relative z-10 text-white font-semibold text-sm bg-black/30 px-2.5 py-1 rounded-lg">{img.label}</span>}

      <h3 className={`absolute top-4 left-4 right-10 sm:top-5 sm:left-5 sm:right-14 text-white font-bold ${size === "large" ? "text-lg sm:text-xl" : "text-sm"} leading-snug drop-shadow-sm`}>
        {post.media === "image" ? post.heading : ""}
      </h3>

      {post.media === "carousel" && size === "large" && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onDoubleTap("prev"); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white"><ChevronLeft size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDoubleTap("next"); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white"><ChevronRight size={16} /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {post.images.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === (post.mediaIndex || 0) ? "bg-white" : "bg-white/40"}`} />)}
          </div>
        </>
      )}
      {burst && <Heart size={72} className="absolute inset-0 m-auto text-white fill-white animate-ping opacity-90" />}
    </div>
  );
}
