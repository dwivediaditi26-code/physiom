import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useAppData } from "../../../context/AppDataContext.jsx";
import ComposerFrame from "./ComposerFrame.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

export default function PollComposer() {
  const { publishPost, profile, setComposerOpen, setComposerType } = useAppData();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [category, setCategory] = useState("Techniques");
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const close = () => { setComposerType(null); setComposerOpen(false); };
  const back = () => setComposerType(null);

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim() && filledOptions.length >= MIN_OPTIONS && !uploading;

  const setOption = (i, val) => setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addOption = () => { if (options.length < MAX_OPTIONS) setOptions((prev) => [...prev, ""]); };
  const removeOption = (i) => { if (options.length > MIN_OPTIONS) setOptions((prev) => prev.filter((_, idx) => idx !== i)); };

  const submit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      await publishPost({ text: question.trim(), category, postType: "poll", pollOptions: filledOptions });
      setComposerType(null);
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong publishing this poll -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComposerFrame
      profile={profile} title="Poll" onBack={back} onClose={close}
      error={error} submitLabel={uploading ? "Posting…" : "Post Poll"} onSubmit={submit} submitDisabled={!canSubmit}
    >
      <textarea
        value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
        placeholder="Which outcome measure do you commonly use for knee OA?"
        className={`${FIELD} mb-3 resize-none`}
      />
      <div className="space-y-2 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className={FIELD} maxLength={60} />
            {options.length > MIN_OPTIONS && (
              <button onClick={() => removeOption(i)} className="text-slate-400 hover:text-rose-500 shrink-0" aria-label="Remove option"><X size={15} /></button>
            )}
          </div>
        ))}
      </div>
      {options.length < MAX_OPTIONS && (
        <button onClick={addOption} className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 mb-3">
          <Plus size={13} /> Add option
        </button>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {["Techniques", "Case Studies", "Research", "Education"].map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>
    </ComposerFrame>
  );
}
