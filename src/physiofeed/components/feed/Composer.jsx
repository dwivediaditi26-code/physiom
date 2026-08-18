import { useRef, useState } from "react";
import { X, Image as ImageIcon, Video, FlaskConical, AlertCircle } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import {
  MAX_IMAGES, MAX_VIDEO_SECONDS, validateImageFile, validateVideoFile,
  getVideoDuration, compressImage,
} from "../../lib/media.js";

const CATEGORIES = ["Techniques", "Case Studies", "Research", "Education"];

export default function Composer() {
  const { composerOpen, setComposerOpen, publishPost, profile, uploadImage, uploadVideo } = useAppData();
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState([]); // [{ file, previewUrl }]
  const [video, setVideo] = useState(null); // { file, previewUrl, duration }
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  if (!profile) return null;

  if (!composerOpen) {
    return (
      <button
        onClick={() => setComposerOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-left hover:border-violet-200 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} />
        <span className="text-sm text-slate-400">Share a clinical tip, case, or research with the community…</span>
      </button>
    );
  }

  const resetMedia = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    if (video) URL.revokeObjectURL(video.previewUrl);
    setImages([]);
    setVideo(null);
  };

  const handleImagesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again later
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
      if (duration > MAX_VIDEO_SECONDS) {
        setError(`Videos must be under ${MAX_VIDEO_SECONDS} seconds.`);
        return;
      }
      setVideo({ file, previewUrl: URL.createObjectURL(file), duration });
    } catch (readErr) {
      setError(readErr.message || "Couldn't read that video file.");
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };
  const removeVideo = () => {
    URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  };

  const close = () => {
    resetMedia();
    setText("");
    setError(null);
    setComposerOpen(false);
  };

  const submit = async () => {
    if (!text.trim() || uploading) return;
    setUploading(true);
    setError(null);
    try {
      let media = null;
      if (images.length > 0) {
        const urls = [];
        for (const img of images) {
          const compressed = await compressImage(img.file);
          urls.push(await uploadImage(compressed));
        }
        media = { type: "photo", urls };
      } else if (video) {
        const url = await uploadVideo(video.file);
        media = { type: "video", urls: [url], duration: video.duration };
      }
      await publishPost({ text: text.trim(), category, media });
      resetMedia();
      setText("");
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong uploading your media -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} />
        <span className="text-sm font-semibold text-slate-900">{profile.name}</span>
        <button onClick={close} className="ml-auto text-slate-400 hover:text-slate-600"><X size={18} /></button>
      </div>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder="What are you seeing in clinic this week?" rows={3}
        className="w-full resize-none text-sm text-slate-700 placeholder:text-slate-400 outline-none"
      />

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {images.map((img, i) => (
            <div key={img.previewUrl} className="relative w-16 h-16 rounded-lg overflow-hidden group">
              <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {video && (
        <div className="relative w-28 h-16 rounded-lg overflow-hidden mb-3">
          <video src={video.previewUrl} className="w-full h-full object-cover" muted />
          <button onClick={removeVideo} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center">
            <X size={10} />
          </button>
          <span className="absolute bottom-0.5 right-0.5 text-[10px] text-white bg-black/50 px-1 rounded">{Math.round(video.duration)}s</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesPicked} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoPicked} />
          <button onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40" aria-label="Add photos"><ImageIcon size={18} /></button>
          <button onClick={() => videoInputRef.current?.click()} disabled={uploading} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40" aria-label="Add a video"><Video size={18} /></button>
          <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-500" disabled aria-label="Attach research (coming soon)"><FlaskConical size={18} /></button>
        </div>
        <button onClick={submit} disabled={uploading || !text.trim()} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
          {uploading ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
