import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAppData } from "../../../context/AppDataContext.jsx";
import ComposerFrame from "./ComposerFrame.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

// Structured Clinical Case template (Aditi's spec, 2026-08-18) -- deliberately
// a form with fixed fields instead of a blank text box, so physios share
// educational cases in a consistent, scannable shape instead of freeform
// patient narratives. This is a fully separate, manually-typed form -- it
// never reads from or links to the real Clinical/patient-records database.
// That separation is the whole point: PhysioFeed only ever contains what a
// physio deliberately chooses to type here, never an automatic pull from
// an actual patient's chart.
export default function CaseComposer() {
  const { publishPost, profile, setComposerOpen, setComposerType } = useAppData();
  const [title, setTitle] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [occupation, setOccupation] = useState("");
  const [activity, setActivity] = useState("");
  const [presentation, setPresentation] = useState("");
  const [assessment, setAssessment] = useState("");
  const [management, setManagement] = useState("");
  const [outcome, setOutcome] = useState("");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Case Studies");
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const close = () => { setComposerType(null); setComposerOpen(false); };
  const back = () => setComposerType(null);
  const canSubmit = title.trim() && presentation.trim() && !uploading;

  const submit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      await publishPost({
        text: presentation.trim(),
        category,
        postType: "case",
        title: title.trim(),
        caseFields: {
          patientAge: age.trim(), patientSex: sex.trim(), patientOccupation: occupation.trim(), patientActivity: activity.trim(),
          presentation: presentation.trim(), assessment: assessment.trim(), management: management.trim(),
          outcome: outcome.trim(), question: question.trim(),
        },
      });
      setComposerType(null);
      setComposerOpen(false);
    } catch (e) {
      setError(e.message || "Something went wrong publishing this case -- please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComposerFrame
      profile={profile} title="Clinical Case" onBack={back} onClose={close}
      error={error} submitLabel={uploading ? "Posting…" : "Post Case"} onSubmit={submit} submitDisabled={!canSubmit}
    >
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-snug">
          Educational cases only -- de-identify everything (no names, no dates of birth, no record numbers). This is separate from your real patient records and is never linked to them.
        </p>
      </div>

      <label className={LABEL}>Case title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chronic shoulder pain in a recreational swimmer" className={`${FIELD} mb-3`} />

      <label className={LABEL}>Patient information</label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className={FIELD} />
        <input value={sex} onChange={(e) => setSex(e.target.value)} placeholder="Sex" className={FIELD} />
        <input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Occupation (optional)" className={FIELD} />
        <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Sport / activity" className={FIELD} />
      </div>

      <label className={LABEL}>Presentation</label>
      <textarea value={presentation} onChange={(e) => setPresentation(e.target.value)} rows={2} placeholder="How did the patient present? Onset, aggravating factors…" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>Assessment</label>
      <textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} rows={3} placeholder="ROM, MMT, special tests, functional outcome measures, relevant findings…" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>Management</label>
      <textarea value={management} onChange={(e) => setManagement(e.target.value)} rows={3} placeholder="Exercise, manual therapy, education, progression…" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>Outcome</label>
      <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} placeholder="How did the patient progress?" className={`${FIELD} mb-3 resize-none`} />

      <label className={LABEL}>Question to community (optional)</label>
      <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Would you have included a different test?" className={`${FIELD} mb-3`} />

      <div className="flex items-center gap-1.5 flex-wrap">
        {["Case Studies", "Techniques", "Research", "Education"].map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>
    </ComposerFrame>
  );
}
