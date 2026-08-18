import { useState } from "react";
import { useAppData } from "../../../context/AppDataContext.jsx";
import ComposerFrame from "./ComposerFrame.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const TYPES = ["Systematic Review", "Meta-Analysis", "RCT", "Narrative Review", "Case Report", "Other"];

// A Research post is different from the curated Evidence library
// (research_articles table, admin-managed) -- this is any physio sharing
// and discussing a paper in the feed itself. Structured the same way
// Aditi's spec laid out: title/type/journal/year/key finding/clinical
// takeaway/reference, so it reads like a real journal-club note instead of
// a plain caption.
export default function ResearchComposer() {
  const { publishPost, profile, setComposerOpen, setComposerType } = useAppData();
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");
  const [keyFinding, setKeyFinding] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [reference, setReference] = useState("");
  const [category, setCategory] = useState("Research");
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const close = () => { setComposerType(null); setComposerOpen(false); };
  const back = () => setComposerType(null);
  const canSubmit = title.trim() && keyFinding.trim() && !uploading;

  const submit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      await publishPost({
        text: takeaway.trim() || keyFinding.trim(),
        category,
        postType: "research",
        title: title.trim(),
        researchFields: {
          type, journal: journal.trim(), year: year.trim(),
          keyFinding: keyFinding.trim(), takeaway: takeaway.trim(), reference: reference.trim(),
        },
      });
      setComposerType(null);
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong publishing this -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComposerFrame
      profile={profile} title="Research" onBack={back} onClose={close}
      error={error} submitLabel={uploading ? "Posting…" : "Post"} onSubmit={submit} submitDisabled={!canSubmit}
    >
      <label className={LABEL}>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Progressive loading for Achilles tendinopathy" className={`${FIELD} mb-3`} />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={LABEL}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" className={FIELD} />
        </div>
      </div>

      <label className={LABEL}>Journal</label>
      <input value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Journal name" className={`${FIELD} mb-3`} />

      <label className={LABEL}>Key finding</label>
      <textarea value={keyFinding} onChange={(e) => setKeyFinding(e.target.value)} rows={2} placeholder="Progressive loading appears to improve…" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>My clinical takeaway</label>
      <textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)} rows={2} placeholder="I would consider…" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>Reference (DOI / PubMed / journal link)</label>
      <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="https://…" className={`${FIELD} mb-3`} />

      <div className="flex items-center gap-1.5 flex-wrap">
        {["Research", "Case Studies", "Techniques", "Education"].map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>
    </ComposerFrame>
  );
}
