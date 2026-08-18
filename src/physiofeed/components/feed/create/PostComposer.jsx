import { useRef, useState } from "react";
import { X, Image as ImageIcon, Video, FlaskConical } from "lucide-react";
import { useAppData } from "../../../context/AppDataContext.jsx";
import ComposerFrame from "./ComposerFrame.jsx";
import {
  MAX_IMAGES, MAX_VIDEO_SECONDS, validateImageFile, validateVideoFile,
  getVideoDuration, compressImage,
} from "../../../lib/media.js";

const CATEGORIES = ["Techniques", "Case Studies", "Research", "Education"];

const MODE_COPY = {
  post: { title: "Post", placeholder: "What are you seeing in clinic this week?" },
  video: { title: "Video", placeholder: "Describe the technique, exercise, or tip…" },
  photo: { title: "Photo / Image", placeholder: "Describe what this shows…" },
};

// Handles all three of Post/Video/Photo from the create menu -- they're
// the same underlying post shape (text + optional media), just with
// different framing. Video/Photo require their media before you can post;
// plain Post doesn't (text-only posts are still the common case).
export default function PostComposer({ mode = "post" }) {
  const { publishPost, profile, uploadImage, uploadVideo, setComposerOpen, setComposerType } = useAppData();
  const copy = MODE_COPY[mode];
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState([]); // [{ file, previewUrl }]
  const [video, setVideo] = useState(null); // { file, previewUrl, duration }
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const resetMedia = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    if (video) URL.revokeObjectURL(video.previewUrl);
    setImages([]);
    setVideo(null);
  };

  const handleImagesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    if (video) { setError("A post can have photos or a video, not both."); return; }
    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(`Only ${MAX_IMAGES} photos per post -- added the first ${room}.`);
    const next = [];
    for (const file of files.slice(0, room)) {
      const err = validateImageFile(file);
      if (err) { setError(err); continue; }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
  };

  const handleVideoPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (images.length) { setError("A post can have photos or a video, not both."); return; }
    const err = validateVideoFile(file);
    if (err) { setError(err); return; }
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_SECONDS) { setError(`Videos must be under ${MAX_VIDEO_SECONDS} seconds.`); return; }
      setVideo({ file, previewUrl: URL.createObjectURL(file), duration });
    } catch (readErr) {
      setError(readErr.message || "Couldn't read that video file.");
    }
  };

  const removeImage = (idx) => setImages((prev) => { URL.revokeObjectURL(prev[idx].previewUrl); return prev.filter((_, i) => i !== idx); });
  const removeVideo = () => { URL.revokeObjectURL(video.previewUrl); setVideo(null); };

  const close = () => { resetMedia(); setComposerType(null); setComposerOpen(false); };
  const back = () => { resetMedia(); setComposerType(null); };

  const mediaRequired = mode === "video" || mode === "photo";
  const canSubmit = text.trim() && (!mediaRequired || images.length > 0 || video) && !uploading;

  const submit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      let media = null;
      if (images.length > 0) {
        const urls = [];
        for (const img of images) urls.push(await uploadImage(await compressImage(img.file)));
        media = { type: "photo", urls };
      } else if (video) {
        media = { type: "video", urls: [await uploadVideo(video.file)], duration: video.duration };
      }
      await publishPost({ text: text.trim(), category, media, title: title.trim() || undefined });
      resetMedia();
      setText(""); setTitle("");
      setComposerType(null);
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong uploading your media -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComposerFrame
      profile={profile} title={copy.title} onBack={back} onClose={close}
      error={error} submitLabel={uploading ? "Posting…" : "Post"} onSubmit={submit} submitDisabled={!canSubmit}
    >
      {mode !== "post" && (
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "video" ? "Give this video a title" : "Give this photo a title"}
          className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none mb-2"
        />
      )}
      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder={copy.placeholder} rows={3}
        className="w-full resize-none text-sm text-slate-700 placeholder:text-slate-400 outline-none"
      />

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3 mt-2">
          {images.map((img, i) => (
            <div key={img.previewUrl} className="relative w-16 h-16 rounded-lg overflow-hidden">
              <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      {video && (
        <div className="relative w-28 h-16 rounded-lg overflow-hidden mb-3 mt-2">
          <video src={video.previewUrl} className="w-full h-full object-cover" muted />
          <button onClick={removeVideo} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={10} /></button>
          <span className="absolute bottom-0.5 right-0.5 text-[10px] text-white bg-black/50 px-1 rounded">{Math.round(video.duration)}s</span>
        </div>
      )}

      {mediaRequired && !images.length && !video && (
        <button
          onClick={() => (mode === "video" ? videoInputRef : imageInputRef).current?.click()}
          className="w-full mt-2 mb-3 py-6 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 flex flex-col items-center gap-1.5 text-xs font-medium"
        >
          {mode === "video" ? <Video size={22} /> : <ImageIcon size={22} />}
          {mode === "video" ? "Add a video" : "Add photos"}
        </button>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-3 mt-2">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesPicked} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoPicked} />
        {mode === "post" && (
          <>
            <button onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40" aria-label="Add photos"><ImageIcon size={18} /></button>
            <button onClick={() => videoInputRef.current?.click()} disabled={uploading} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40" aria-label="Add a video"><Video size={18} /></button>
            <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-500" disabled aria-label="Attach research (coming soon)"><FlaskConical size={18} /></button>
          </>
        )}
      </div>
    </ComposerFrame>
  );
}
