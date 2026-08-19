import { useRef, useState } from "react";
import { X, Image as ImageIcon, Video, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import {
  MAX_STORY_VIDEO_SECONDS, validateImageFile, validateVideoFile, getVideoDuration, compressImage,
} from "../../lib/media.js";

// Feature (2026-08-19): real stories. "+ Your story" in StoriesBar.jsx
// used to open the regular post composer (wrong thing entirely -- it
// shares composerOpen/composerType state with the "Share a clinical tip"
// box on the feed). This is a fully separate, self-contained modal (same
// pattern as EditProfileModal.jsx) so it doesn't touch that state at all.
// No caption/text on the media -- kept to "just a photo or video that
// disappears in 24h" for V1, same scope discipline as the original real-
// media-upload rollout (post captions came later, in their own step).
export default function CreateStoryModal({ onClose }) {
  const { addStory, uploadStoryImage, uploadStoryVideo } = useAppData();
  const [picked, setPicked] = useState(null); // { kind: 'image'|'video', file, previewUrl, duration? }
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const reset = () => {
    if (picked) URL.revokeObjectURL(picked.previewUrl);
    setPicked(null);
    setError(null);
  };

  const handleImagePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    setPicked({ kind: "image", file, previewUrl: URL.createObjectURL(file) });
  };

  const handleVideoPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const err = validateVideoFile(file);
    if (err) { setError(err); return; }
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_STORY_VIDEO_SECONDS) { setError(`Story videos must be under ${MAX_STORY_VIDEO_SECONDS} seconds.`); return; }
      setPicked({ kind: "video", file, previewUrl: URL.createObjectURL(file), duration });
    } catch (readErr) {
      setError(readErr.message || "Couldn't read that video file.");
    }
  };

  const post = async () => {
    if (!picked || posting) return;
    setPosting(true);
    setError(null);
    try {
      if (picked.kind === "image") {
        const mediaUrl = await uploadStoryImage(await compressImage(picked.file));
        await addStory({ mediaUrl, mediaType: "image" });
      } else {
        const mediaUrl = await uploadStoryVideo(picked.file);
        await addStory({ mediaUrl, mediaType: "video", duration: picked.duration });
      }
      reset();
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't post that story -- please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">Add to your story</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {!picked ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
              >
                <ImageIcon size={24} /> <span className="text-xs font-semibold">Photo</span>
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
              >
                <Video size={24} /> <span className="text-xs font-semibold">Video</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[55vh] mx-auto">
              {picked.kind === "image" ? (
                <img src={picked.previewUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <video src={picked.previewUrl} className="w-full h-full object-contain" autoPlay loop muted playsInline />
              )}
              <button
                type="button"
                onClick={reset}
                disabled={posting}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-50"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePicked} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoPicked} />

          {error && (
            <div className="flex items-start gap-1.5 mt-3 text-xs text-rose-600">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-3">Visible to everyone for 24 hours, then it disappears automatically.</p>

          <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-slate-100">
            <button onClick={onClose} disabled={posting} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={post}
              disabled={!picked || posting}
              className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post to story"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
