import { useRef, useState } from "react";
import { ShieldAlert, Image as ImageIcon, Video, FileText, X } from "lucide-react";
import { useAppData } from "../../../context/AppDataContext.jsx";
import ComposerFrame from "./ComposerFrame.jsx";
import { validateImageFile, validateVideoFile, validateResumeFile, getVideoDuration, compressImage } from "../../../lib/media.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const TOPICS = ["Shoulder", "Lumbar", "Knee", "Neuro", "Sports", "Pediatrics", "Cardio"];

// Clinical Discussion composer (2026-09-23, Aditi's brief: "Quora for
// physiotherapy" -- a free paragraph the therapist asks the community
// about, NOT the structured Subjective/Objective/ROM/MMT form
// CaseComposer.jsx already covers for a different purpose (writing up a
// finished teaching case). No field here is auto-structured, summarized,
// or rewritten -- what's typed is exactly what gets posted. Deliberately no
// AI anywhere in this file.
export default function DiscussionComposer() {
  const { publishPost, profile, uploadImage, uploadVideo, uploadDocument, setComposerOpen, setComposerType } = useAppData();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState(null); // optional single-select topic
  const [attachment, setAttachment] = useState(null); // { kind: 'photo'|'video'|'document', file, previewUrl, duration? }
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const clearAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const handlePhotoPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    clearAttachment();
    setAttachment({ kind: "photo", file, previewUrl: URL.createObjectURL(file) });
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
      clearAttachment();
      setAttachment({ kind: "video", file, previewUrl: URL.createObjectURL(file), duration });
    } catch (readErr) {
      setError(readErr.message || "Couldn't read that video file.");
    }
  };

  const handleDocumentPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const err = validateResumeFile(file);
    if (err) { setError(err); return; }
    clearAttachment();
    setAttachment({ kind: "document", file });
  };

  const close = () => { clearAttachment(); setComposerType(null); setComposerOpen(false); };
  const back = () => { clearAttachment(); setComposerType(null); };
  const canSubmit = text.trim() && !uploading;

  const submit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      let media = null;
      if (attachment?.kind === "photo") {
        media = { type: "photo", urls: [await uploadImage(await compressImage(attachment.file))] };
      } else if (attachment?.kind === "video") {
        media = { type: "video", urls: [await uploadVideo(attachment.file)], duration: attachment.duration };
      } else if (attachment?.kind === "document") {
        media = { type: "document", urls: [await uploadDocument(attachment.file)] };
      }
      await publishPost({
        text: text.trim(), category: category || "General", media,
        title: title.trim() || undefined, postType: "discussion",
      });
      clearAttachment();
      setText(""); setTitle(""); setCategory(null);
      setComposerType(null);
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong posting this discussion -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComposerFrame
      profile={profile} title="Clinical Discussion" onBack={back} onClose={close}
      error={error} submitLabel={uploading ? "Posting…" : "Post Clinical Discussion"} onSubmit={submit} submitDisabled={!canSubmit}
    >
      <input
        value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. 28 y/o with shoulder pain — what would you assess next?"
        className={`${FIELD} mb-3`}
      />

      <label className={LABEL}>Describe your case or question</label>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={5}
        placeholder="Write the case in your own words. Tell the community what happened, what you found, and what you're unsure about."
        className={`${FIELD} mb-3 resize-none`}
      />

      {attachment?.kind === "photo" && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden mb-3">
          <img src={attachment.previewUrl} alt="" className="w-full h-full object-cover" />
          <button onClick={clearAttachment} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={10} /></button>
        </div>
      )}
      {attachment?.kind === "video" && (
        <div className="relative w-28 h-16 rounded-lg overflow-hidden mb-3">
          <video src={attachment.previewUrl} className="w-full h-full object-cover" muted />
          <button onClick={clearAttachment} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={10} /></button>
          <span className="absolute bottom-0.5 right-0.5 text-[10px] text-white bg-black/50 px-1 rounded">{Math.round(attachment.duration)}s</span>
        </div>
      )}
      {attachment?.kind === "document" && (
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 mb-3">
          <FileText size={16} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{attachment.file.name}</span>
          <button onClick={clearAttachment} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={13} /></button>
        </div>
      )}

      <div className="flex items-center gap-1 mb-3">
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPicked} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoPicked} />
        <input ref={documentInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleDocumentPicked} />
        <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg px-2 py-1.5 disabled:opacity-40">
          <ImageIcon size={15} /> Add photo
        </button>
        <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg px-2 py-1.5 disabled:opacity-40">
          <Video size={15} /> Add video
        </button>
        <button type="button" onClick={() => documentInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg px-2 py-1.5 disabled:opacity-40">
          <FileText size={15} /> Add document
        </button>
      </div>

      <label className={LABEL}>Topic (optional)</label>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {TOPICS.map((t) => (
          <button key={t} type="button" onClick={() => setCategory((prev) => (prev === t ? null : t))}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === t ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-snug">
          <span className="font-semibold">Patient privacy</span> — Do not include information that could identify the patient.
        </p>
      </div>
    </ComposerFrame>
  );
}
