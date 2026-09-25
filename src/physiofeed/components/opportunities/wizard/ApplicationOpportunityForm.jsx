import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Stepper from "./Stepper.jsx";
import { Field, inputCls, textareaCls, Combobox, PillSelect, CheckboxGroup, CriticalChangeConfirm, parseAmount, splitAudience, highlightValue } from "../FormFields.jsx";
import OpportunityCard from "../OpportunityCard.jsx";
import OpportunityDetail from "../OpportunityDetail.jsx";
import * as db from "../../../data/db.js";
import {
  SPECIALTIES, JOB_TYPES, SALARY_MODES, INTERNSHIP_AUDIENCE,
  COLLAB_TYPES, COLLAB_LOOKING_FOR, COLLAB_LOCATION_TYPES,
} from "../../../data/opportunitiesMock.js";
import { initialsOf, GRADIENTS } from "../../shared/constants.js";

const GRAD_KEYS = Object.keys(GRADIENTS);
const TITLE_LABEL = { job: "Job title *", internship: "Internship title *", collaboration: "Title *" };
const TITLE_PLACEHOLDER = { job: "e.g. Junior Physiotherapist", internship: "e.g. Sports Physiotherapy Internship", collaboration: "e.g. Physiotherapy Research Collaboration" };
const TYPE_LABEL = { job: "Job", internship: "Internship", collaboration: "Collaboration" };

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Reverses a job's saved `salary` display string ("Not disclosed" /
// "₹X/mo" / "₹min – ₹max/mo") back into the three fields the Salary step
// actually edits -- editingOpp only carries the formatted string, not the
// mode/min/max/fixed that produced it.
function parseSalary(salary) {
  if (!salary || salary === "Not disclosed") return { mode: "Not disclosed", min: "", max: "", fixed: "" };
  if (salary.includes("–")) {
    const [min, max] = salary.split("–").map((s) => s.trim());
    return { mode: "Range", min: parseAmount(min), max: parseAmount(max), fixed: "" };
  }
  return { mode: "Fixed", min: "", max: "", fixed: parseAmount(salary) };
}

// Job/Internship/Collaboration each get their own field set here rather
// than three near-duplicate files -- title/org/description, the Preview
// step, and the Save Draft/Publish submit are identical across all three;
// only the middle of the Details step branches on `type`. (2026-09-24,
// same day the Workshop-only wizard shipped -- these three still opened
// PostOpportunityModal's single flat screen until now.)
//
// `editingOpp` (Phase D, 2026-09-25): same shape as WorkshopWizard's edit
// mode -- prefill from it, collapse Save Draft/Publish into one "Save
// Changes" once the listing is past draft. Salary/startDate/duration/etc.
// only exist as display strings on a saved opportunity (detailHighlights,
// or a formatted `salary`), so parseSalary()/highlightValue() reverse them
// back into the raw values this form edits.
export default function ApplicationOpportunityForm({ type, onClose, onSubmit, editingOpp }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null); // { publish, changes } | null

  const editingDraft = editingOpp && editingOpp.rawStatus === "draft";
  const singleSaveMode = editingOpp && !editingDraft;

  const [title, setTitle] = useState(editingOpp?.title || "");
  const [org, setOrg] = useState(editingOpp?.org || "");
  const [description, setDescription] = useState(editingOpp?.description || "");
  const [location, setLocation] = useState(editingOpp?.location || "");
  const [deadline, setDeadline] = useState(editingOpp?.deadline || "");
  const [registrationMethod, setRegistrationMethod] = useState(editingOpp?.registrationMethod || (type === "collaboration" ? "contact" : "physiofeed"));
  const [registrationUrl, setRegistrationUrl] = useState(editingOpp?.registrationUrl || "");
  const [requirements, setRequirements] = useState(editingOpp?.requirements?.length ? editingOpp.requirements : [""]);

  // Job
  const [parsedSalary] = useState(() => parseSalary(editingOpp?.salary));
  const [jobType, setJobType] = useState(editingOpp?.employment || JOB_TYPES[0]);
  const [department, setDepartment] = useState(editingOpp?.specialty || SPECIALTIES[0]);
  const [experience, setExperience] = useState(highlightValue(editingOpp, "Experience"));
  const [salaryMode, setSalaryMode] = useState(parsedSalary.mode || SALARY_MODES[0]);
  const [salaryMin, setSalaryMin] = useState(parsedSalary.min);
  const [salaryMax, setSalaryMax] = useState(parsedSalary.max);
  const [salaryFixed, setSalaryFixed] = useState(parsedSalary.fixed);

  // Internship
  const [duration, setDuration] = useState(highlightValue(editingOpp, "Duration"));
  const [startDate, setStartDate] = useState(editingOpp?.startDate || "");
  const [paid, setPaid] = useState(editingOpp ? editingOpp.stipend !== "Unpaid" : true);
  const [stipend, setStipend] = useState(editingOpp && editingOpp.stipend !== "Unpaid" ? parseAmount(editingOpp.stipend) : "");
  const [audience, setAudience] = useState(editingOpp?.audience ? splitAudience(editingOpp.audience) : ["BPT", "MPT"]);
  const [learningOutcomes, setLearningOutcomes] = useState(editingOpp?.learningOutcomes?.length ? editingOpp.learningOutcomes : [""]);

  // Collaboration
  const [collabType, setCollabType] = useState(editingOpp?.tags?.[0] || COLLAB_TYPES[0]);
  const [lookingFor, setLookingFor] = useState(editingOpp?.audience ? splitAudience(editingOpp.audience) : ["BPT students", "Physiotherapists"]);
  const [collabLocationType, setCollabLocationType] = useState(editingOpp?.locationType || COLLAB_LOCATION_TYPES[0]);

  useEffect(() => {
    let cancelled = false;
    db.getProfile().then((p) => { if (!cancelled) setProfile(p); });
    return () => { cancelled = true; };
  }, []);

  const detailsValid = type === "collaboration"
    ? title.trim().length > 0
    : (title.trim() && org.trim() && description.trim());
  const priceValid = type !== "job" || salaryMode === "Not disclosed"
    || (salaryMode === "Fixed" ? salaryFixed.trim() : (salaryMin.trim() && salaryMax.trim()));
  const stipendValid = type !== "internship" || !paid || stipend.trim();
  const regValid = registrationMethod !== "external" || registrationUrl.trim();
  const canPublish = detailsValid && priceValid && stipendValid && regValid;
  const canSaveDraft = title.trim().length > 0;
  const step0Valid = canPublish; // single-step Details -> gate Next the same as Publish, since Preview is the very next (and last) screen

  const orgDisplay = org.trim() || profile?.name || "";

  function buildFields() {
    const mentor = { name: profile?.name || orgDisplay || "Organiser", role: profile?.clinicalTitle || profile?.role || "", initials: profile?.initials || initialsOf(orgDisplay || "PF"), gradient: profile?.gradient || "violet", bio: "" };
    const base = {
      type,
      title: title.trim(),
      org: orgDisplay || "PhysioFeed member",
      orgInitials: initialsOf(orgDisplay || "PF"),
      orgGradient: profile?.gradient || GRAD_KEYS[0],
      description: description.trim(),
      registrationMethod,
      registrationUrl: registrationMethod === "external" ? registrationUrl.trim() : "",
      mentor,
      requirements: requirements.map((r) => r.trim()).filter(Boolean),
    };

    if (type === "job") {
      const salary = salaryMode === "Not disclosed" ? "Not disclosed"
        : salaryMode === "Fixed" ? `₹${salaryFixed.trim()}/mo`
        : `₹${salaryMin.trim()} – ₹${salaryMax.trim()}/mo`;
      return {
        ...base,
        specialty: department,
        location: location.trim(),
        deadline: deadline || null,
        tags: [jobType, department].filter(Boolean),
        salary,
        employment: jobType,
        detailHighlights: [
          { label: "Employment", value: jobType },
          experience.trim() && { label: "Experience", value: experience.trim() },
          deadline && { label: "Application deadline", value: fmtDate(deadline) },
        ].filter(Boolean),
      };
    }

    if (type === "internship") {
      return {
        ...base,
        location: location.trim(),
        deadline: deadline || null,
        tags: [paid ? "Paid" : "Unpaid"].filter(Boolean),
        stipend: paid ? `₹${stipend.trim()}/mo` : "Unpaid",
        audience: audience.join(", "),
        learningOutcomes: learningOutcomes.map((o) => o.trim()).filter(Boolean),
        // fmtDate() below is display-only (locale-formatted); this raw copy
        // is what lets editing the same listing later re-populate the
        // <input type="date"> instead of showing it blank.
        startDate: startDate || undefined,
        detailHighlights: [
          duration.trim() && { label: "Duration", value: duration.trim() },
          startDate && { label: "Start date", value: fmtDate(startDate) },
          audience.length > 0 && { label: "Eligible applicants", value: audience.join(", ") },
          deadline && { label: "Application deadline", value: fmtDate(deadline) },
        ].filter(Boolean),
      };
    }

    // collaboration
    return {
      ...base,
      location: collabLocationType,
      locationType: collabLocationType,
      deadline: deadline || null,
      tags: [collabType].filter(Boolean),
      audience: lookingFor.join(", "),
      detailHighlights: [
        { label: "Type", value: collabType },
        lookingFor.length > 0 && { label: "Looking for", value: lookingFor.join(", ") },
        duration.trim() && { label: "Duration", value: duration.trim() },
        deadline && { label: "Deadline", value: fmtDate(deadline) },
      ].filter(Boolean),
    };
  }

  // Same idea as WorkshopWizard's criticalChanges() -- warn before saving
  // over a field someone already applied against. Salary/stipend live in
  // `details` jsonb, so trg_notify_opportunity_details_changed can't see
  // them either; this dialog is the only warning those two ever get.
  function criticalChanges() {
    if (!editingOpp) return [];
    const changes = [];
    if (deadline !== (editingOpp.deadline || "")) changes.push("the deadline");
    if (type !== "collaboration" && location.trim() !== (editingOpp.location || "")) changes.push("the location");
    if (type === "collaboration" && collabLocationType !== (editingOpp.locationType || COLLAB_LOCATION_TYPES[0])) changes.push("the location");
    if (registrationMethod === "external" && registrationUrl.trim() !== (editingOpp.registrationUrl || "")) changes.push("the application link");
    if (type === "job") {
      const currentSalary = salaryMode === "Not disclosed" ? "Not disclosed"
        : salaryMode === "Fixed" ? `₹${salaryFixed.trim()}/mo`
        : `₹${salaryMin.trim()} – ₹${salaryMax.trim()}/mo`;
      if (currentSalary !== (editingOpp.salary || "Not disclosed")) changes.push("the salary");
    }
    if (type === "internship") {
      const currentStipend = paid ? `₹${stipend.trim()}/mo` : "Unpaid";
      if (currentStipend !== (editingOpp.stipend || "Unpaid")) changes.push("the stipend");
    }
    return changes;
  }

  const submit = async (publish) => {
    if (publish ? !canPublish : !canSaveDraft) return;
    const applicantCount = editingOpp?.stats?.applications ?? 0;
    const changes = criticalChanges();
    if (applicantCount > 0 && changes.length > 0) {
      setPendingConfirm({ publish, changes });
      return;
    }
    await doSave(publish);
  };

  const doSave = async (publish) => {
    setSaving(publish ? "publish" : "draft");
    setError(null);
    try {
      await onSubmit(buildFields(), { publish });
    } catch (e) {
      setError(e.message || "Couldn't save this listing -- please try again.");
    } finally {
      setSaving(null);
      setPendingConfirm(null);
    }
  };

  const previewOpp = { id: "preview", postedAgo: "Just now", ...buildFields() };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{editingOpp ? "Edit " : "Create "}{TYPE_LABEL[type]}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        <div className="sticky top-[52px] bg-white z-10 border-b border-slate-100">
          <Stepper step={step} steps={["Details", "Preview"]} />
        </div>

        <div className="px-5 pt-4 pb-6">
          {step === 0 && (
            <>
              <Field label={TITLE_LABEL[type]}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TITLE_PLACEHOLDER[type]} className={inputCls} />
              </Field>
              <Field label={type === "collaboration" ? "Organisation / person" : "Organisation *"}>
                <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder={profile?.name || "e.g. Apex Movement Center"} className={inputCls} />
              </Field>

              {type === "job" && (
                <>
                  <Field label="Job type"><PillSelect value={jobType} onChange={setJobType} options={JOB_TYPES} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Department / specialty"><Combobox value={department} onChange={setDepartment} options={SPECIALTIES} placeholder="e.g. MSK" /></Field>
                    <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bhopal" className={inputCls} /></Field>
                  </div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">Salary</span>
                  <div className="mb-3"><PillSelect value={salaryMode} onChange={setSalaryMode} options={SALARY_MODES} /></div>
                  {salaryMode === "Range" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Min (₹/mo)"><input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inputCls} /></Field>
                      <Field label="Max (₹/mo)"><input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inputCls} /></Field>
                    </div>
                  )}
                  {salaryMode === "Fixed" && (
                    <Field label="Amount (₹/mo)"><input value={salaryFixed} onChange={(e) => setSalaryFixed(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inputCls} /></Field>
                  )}
                  <Field label="Experience required"><input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 2+ years" className={inputCls} /></Field>
                </>
              )}

              {type === "internship" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Duration"><input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 6 Weeks" className={inputCls} /></Field>
                    <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></Field>
                  </div>
                  <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bhopal" className={inputCls} /></Field>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">Paid / unpaid *</span>
                  <div className="mb-3"><PillSelect value={paid} onChange={setPaid} options={[true, false]} getKey={(v) => v} getLabel={(v) => v ? "Paid" : "Unpaid"} /></div>
                  {paid && <Field label="Stipend (₹/mo)"><input value={stipend} onChange={(e) => setStipend(e.target.value.replace(/\D/g, ""))} placeholder="15000" inputMode="numeric" className={inputCls} /></Field>}
                  <Field label="Eligible applicants"><CheckboxGroup value={audience} onChange={setAudience} options={INTERNSHIP_AUDIENCE} /></Field>
                </>
              )}

              {type === "collaboration" && (
                <>
                  <Field label="Collaboration type"><PillSelect value={collabType} onChange={setCollabType} options={COLLAB_TYPES} /></Field>
                  <Field label="Looking for"><CheckboxGroup value={lookingFor} onChange={setLookingFor} options={COLLAB_LOOKING_FOR} /></Field>
                  <Field label="Location"><PillSelect value={collabLocationType} onChange={setCollabLocationType} options={COLLAB_LOCATION_TYPES} /></Field>
                  <Field label="Duration (if applicable)"><input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 4 months" className={inputCls} /></Field>
                </>
              )}

              <Field label={type === "collaboration" ? "Description" : "Description *"}>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the opportunity..." className={textareaCls} />
              </Field>

              <span className="block text-xs font-semibold text-slate-600 mb-1.5">What will they need?</span>
              <div className="space-y-2 mb-2">
                {requirements.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={r}
                      onChange={(e) => setRequirements((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder="e.g. Registered physiotherapist"
                      className={inputCls}
                    />
                    {requirements.length > 1 && (
                      <button type="button" onClick={() => setRequirements((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove" className="p-2 text-slate-400 hover:text-rose-600 shrink-0"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setRequirements((prev) => [...prev, ""])} className="text-xs font-bold text-indigo-600 mb-5">+ Add requirement</button>

              {type === "internship" && (
                <>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">What will the student learn?</span>
                  <div className="space-y-2 mb-2">
                    {learningOutcomes.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={o}
                          onChange={(e) => setLearningOutcomes((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                          placeholder="e.g. Return-to-sport protocols"
                          className={inputCls}
                        />
                        {learningOutcomes.length > 1 && (
                          <button type="button" onClick={() => setLearningOutcomes((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove" className="p-2 text-slate-400 hover:text-rose-600 shrink-0"><X size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setLearningOutcomes((prev) => [...prev, ""])} className="text-xs font-bold text-indigo-600 mb-5">+ Add</button>
                </>
              )}

              {type !== "collaboration" && (
                <Field label="Application deadline">
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
                </Field>
              )}
              {type === "collaboration" && (
                <Field label="Deadline (if applicable)">
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
                </Field>
              )}

              <span className="block text-xs font-semibold text-slate-600 mb-1.5">{type === "collaboration" ? "How should people connect? *" : "Application method *"}</span>
              <div className="space-y-2 mb-1">
                {[
                  { key: "physiofeed", label: type === "collaboration" ? "Connect on PhysioFeed" : "Apply on PhysioFeed" },
                  { key: "external", label: "External link" },
                  { key: "contact", label: "Contact organiser" },
                ].map((o) => (
                  <label key={o.key} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer border border-slate-200 rounded-xl px-3.5 py-2.5">
                    <input type="radio" name="regMethod" checked={registrationMethod === o.key} onChange={() => setRegistrationMethod(o.key)} className="text-indigo-600 focus:ring-indigo-500" />
                    {o.label}
                  </label>
                ))}
              </div>
              {registrationMethod === "external" && (
                <Field label="Link *"><input value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} placeholder="https://..." className={inputCls} /></Field>
              )}
            </>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">This is what others will see</p>
              <div className="mb-4"><OpportunityCard opp={previewOpp} onOpen={() => {}} /></div>
              {/* pointer-events-none: look-only preview, previewOpp.id
                  ("preview") isn't a real row -- see WorkshopWizard's same
                  guard for why a stray tap must not reach a live handler. */}
              <div className="pointer-events-none">
                <OpportunityDetail opp={previewOpp} onBack={() => {}} onMessage={() => {}} applied={false} onApplied={async () => {}} saved={false} onToggleSave={() => {}} />
              </div>
              {!canPublish && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-4">
                  Some required fields are missing -- you can still save this as a draft and finish it later.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-600 mt-4">{error}</p>}

          <div className="flex items-center gap-2.5 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(0)} className="text-sm font-bold text-slate-600 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50">← Back</button>
            )}
            {step === 0 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!step0Valid}
                className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40 active:scale-[0.98] transition"
              >
                Preview →
              </button>
            ) : singleSaveMode ? (
              <button type="button" onClick={() => submit(true)} disabled={!canPublish || !!saving} className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => submit(false)} disabled={!canSaveDraft || !!saving} className="flex-1 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl py-3 disabled:opacity-40">
                  {saving === "draft" ? "Saving…" : "Save Draft"}
                </button>
                <button type="button" onClick={() => submit(true)} disabled={!canPublish || !!saving} className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40">
                  {saving === "publish" ? "Publishing…" : "Publish"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {pendingConfirm && (
        <CriticalChangeConfirm
          count={editingOpp?.stats?.applications ?? 0}
          noun="applicant"
          changes={pendingConfirm.changes}
          busy={!!saving}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={() => doSave(pendingConfirm.publish)}
        />
      )}
    </div>,
    document.body
  );
}
