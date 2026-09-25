import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Folder } from "lucide-react";
import Stepper from "./Stepper.jsx";
import { Field, inputCls, textareaCls, PillSelect, CheckboxGroup } from "../FormFields.jsx";
import OpportunityCard from "../OpportunityCard.jsx";
import WorkshopDetail from "../WorkshopDetail.jsx";
import * as db from "../../../data/db.js";
import { WORKSHOP_CATEGORIES, WORKSHOP_FORMATS, WORKSHOP_AUDIENCE, EXPERIENCE_LEVELS } from "../../../data/opportunitiesMock.js";
import { initialsOf, GRADIENTS } from "../../shared/constants.js";

const STEPS = ["Basic Info", "Date & Location", "Learning Details", "Instructor", "Pricing & Registration", "Cover Image", "Preview"];
const GRAD_KEYS = Object.keys(GRADIENTS);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// The real, multi-step Create Workshop flow (2026-09-24), replacing the old
// single-screen PostOpportunityModal path for workshops (retired -- it had
// a stale "Step 1 of 2" label with no step 2 and published with only 9
// generic fields). Workshop is PhysioFeed's primary opportunity type per
// the brief, so it gets its own 7-step wizard; Job/Internship/Collaboration
// share the shorter wizard/ApplicationOpportunityForm.jsx instead.
export default function WorkshopWizard({ onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(null); // null | "draft" | "publish"
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // Step 1 -- Basic Info
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState(WORKSHOP_CATEGORIES[0]);
  const [format, setFormat] = useState(WORKSHOP_FORMATS[0]);
  const [orgName, setOrgName] = useState("");

  // Step 2 -- Date & Location
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [platform, setPlatform] = useState("Zoom");
  const [meetingLink, setMeetingLink] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // Step 3 -- Learning Details
  const [outcomes, setOutcomes] = useState([""]);
  const [audience, setAudience] = useState(["BPT Students", "MPT Students", "Physiotherapists"]);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[3]);

  // Step 4 -- Instructor
  const [useMyProfile, setUseMyProfile] = useState(true);
  const [instructorName, setInstructorName] = useState("");
  const [instructorRole, setInstructorRole] = useState("");

  // Step 5 -- Pricing & Registration
  const [isFree, setIsFree] = useState(true);
  const [fee, setFee] = useState("");
  const [earlyBird, setEarlyBird] = useState(false);
  const [earlyBirdFee, setEarlyBirdFee] = useState("");
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState("");
  const [hasLimit, setHasLimit] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [registrationMethod, setRegistrationMethod] = useState("physiofeed");
  const [registrationUrl, setRegistrationUrl] = useState("");

  // Step 6 -- Cover Image
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.getProfile().then((p) => { if (!cancelled) setProfile(p); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const needsOnline = format !== "In-person";
  const needsInPerson = format !== "Online";

  const step0Valid = title.trim() && shortDescription.trim() && category && format;
  const step1Valid = date && startTime && endTime
    && (!needsOnline || platform)
    && (!needsInPerson || (venue.trim() && city.trim() && address.trim()));
  const step4Valid = registrationMethod !== "external" || registrationUrl.trim();
  const step4PriceValid = isFree || fee.trim();
  const canPublish = step0Valid && step1Valid && step4Valid && step4PriceValid;
  const canSaveDraft = title.trim().length > 0;

  const stepValid = [step0Valid, step1Valid, true, true, step4Valid && step4PriceValid, true, true][step];

  const orgDisplayName = orgName.trim() || profile?.name || "";
  const instructor = useMyProfile
    ? { name: profile?.name || "You", role: profile?.clinicalTitle || profile?.role || "Physiotherapist", initials: profile?.initials || "PT", gradient: profile?.gradient || "blue" }
    : { name: instructorName.trim() || "Instructor", role: instructorRole.trim() || "", initials: initialsOf(instructorName.trim() || "Instructor"), gradient: "blue" };

  const timeLabel = startTime && endTime ? `${startTime} – ${endTime}` : (startTime || "TBA");
  const dateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "TBA";

  async function buildFields() {
    let bannerUrl;
    if (coverFile) bannerUrl = await db.uploadOpportunityCoverImage(coverFile);
    const org = orgDisplayName || "PhysioFeed member";
    return {
      type: "workshop",
      title: title.trim(),
      description: shortDescription.trim(),
      specialty: category,
      tags: [category],
      location: needsInPerson ? (city.trim() || format) : "Online",
      locationType: format,
      date: date || undefined,
      registrationUrl: registrationMethod === "external" ? registrationUrl.trim() : "",
      maxParticipants: hasLimit && maxParticipants ? Number(maxParticipants) : undefined,
      org,
      orgInitials: initialsOf(org),
      orgGradient: profile?.gradient || GRAD_KEYS[0],
      time: timeLabel,
      mode: format,
      platform: needsOnline ? platform : undefined,
      meetingLink: needsOnline ? meetingLink.trim() || undefined : undefined,
      venue: needsInPerson ? venue.trim() || undefined : undefined,
      city: needsInPerson ? city.trim() || undefined : undefined,
      address: needsInPerson ? address.trim() || undefined : undefined,
      fee: isFree ? "Free" : `₹${fee.trim()}`,
      feeNote: !isFree && earlyBird ? "Early bird" : undefined,
      earlyBirdFee: !isFree && earlyBird && earlyBirdFee.trim() ? `₹${earlyBirdFee.trim()}` : undefined,
      earlyBirdDeadline: !isFree && earlyBird ? earlyBirdDeadline || undefined : undefined,
      registrationMethod,
      instructor,
      syllabus: outcomes.map((o) => o.trim()).filter(Boolean),
      audience: audience.join(", "),
      experienceLevel,
      bannerUrl,
    };
  }

  const submit = async (publish) => {
    if (publish ? !canPublish : !canSaveDraft) return;
    setSaving(publish ? "publish" : "draft");
    setError(null);
    try {
      const fields = await buildFields();
      await onSubmit(fields, { publish });
    } catch (e) {
      setError(e.message || "Couldn't save this workshop -- please try again.");
    } finally {
      setSaving(null);
    }
  };

  const previewOpp = {
    id: "preview", type: "workshop", org: orgDisplayName || "Your organisation",
    orgInitials: initialsOf(orgDisplayName || "PF"), orgGradient: profile?.gradient || "violet",
    title: title.trim() || "Workshop title", description: shortDescription.trim() || "Short description goes here.",
    date: dateLabel, time: timeLabel, mode: format, fee: isFree ? "Free" : (fee.trim() ? `₹${fee.trim()}` : "₹0"),
    feeNote: !isFree && earlyBird ? "Early bird" : undefined, postedAgo: "Just now", tags: [category],
    instructor, syllabus: outcomes.map((o) => o.trim()).filter(Boolean),
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Create Workshop</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        <div className="sticky top-[52px] bg-white z-10 border-b border-slate-100">
          <Stepper step={step} steps={STEPS} />
        </div>

        <div className="px-5 pt-4 pb-6">
          {step === 0 && (
            <>
              <Field label="Workshop title *">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Clinical Taping Fundamentals" className={inputCls} />
              </Field>
              <Field label="Short description *">
                <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} placeholder="Tell students what this workshop is about..." className={textareaCls} />
              </Field>
              <Field label="Hosted by (optional)">
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={profile?.name || "Defaults to your name"} className={inputCls} />
              </Field>
              <Field label="Workshop category *">
                <PillSelect value={category} onChange={setCategory} options={WORKSHOP_CATEGORIES} />
              </Field>
              <Field label="Format *">
                <PillSelect value={format} onChange={setFormat} options={WORKSHOP_FORMATS} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Date *">
                <input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time *">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </Field>
                <Field label="End time *">
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                </Field>
              </div>
              {needsOnline && (
                <>
                  <Field label="Platform *">
                    <PillSelect value={platform} onChange={setPlatform} options={["Zoom", "Google Meet", "MS Teams", "Other"]} />
                  </Field>
                  <Field label="Meeting link (optional -- add later if you don't have one yet)">
                    <input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://zoom.us/..." className={inputCls} />
                  </Field>
                </>
              )}
              {needsInPerson && (
                <>
                  <Field label="Venue *">
                    <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. ABC Physiotherapy Centre" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City *">
                      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bhopal" className={inputCls} />
                    </Field>
                    <Field label="Address *">
                      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" className={inputCls} />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">What will participants learn?</span>
              <div className="space-y-2 mb-2">
                {outcomes.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={o}
                      onChange={(e) => setOutcomes((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder="e.g. Basic taping principles"
                      className={inputCls}
                    />
                    {outcomes.length > 1 && (
                      <button type="button" onClick={() => setOutcomes((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove" className="p-2 text-slate-400 hover:text-rose-600 shrink-0">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setOutcomes((prev) => [...prev, ""])} className="text-xs font-bold text-indigo-600 mb-5">
                + Add learning outcome
              </button>

              <Field label="Who is this for?">
                <CheckboxGroup value={audience} onChange={setAudience} options={WORKSHOP_AUDIENCE} />
              </Field>

              <Field label="Experience required?">
                <PillSelect value={experienceLevel} onChange={setExperienceLevel} options={EXPERIENCE_LEVELS} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 mb-4 cursor-pointer">
                <input type="checkbox" checked={useMyProfile} onChange={(e) => setUseMyProfile(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Use my profile as instructor
              </label>

              {useMyProfile ? (
                <div className="flex items-center gap-3 border border-slate-200 rounded-2xl p-3.5">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${GRADIENTS[instructor.gradient] || GRADIENTS.blue} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {instructor.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{instructor.name}</p>
                    <p className="text-xs text-slate-500 truncate">{instructor.role}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Field label="Instructor name">
                    <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="e.g. Dr. Sameer Sen, PT" className={inputCls} />
                  </Field>
                  <Field label="Instructor role">
                    <input value={instructorRole} onChange={(e) => setInstructorRole(e.target.value)} placeholder="e.g. Sports Physiotherapist" className={inputCls} />
                  </Field>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Is this workshop free?</span>
              <div className="flex gap-1.5 mb-4">
                <PillSelect value={isFree} onChange={setIsFree} options={[true, false]} getKey={(v) => v} getLabel={(v) => v ? "Free" : "Paid"} />
              </div>

              {!isFree && (
                <>
                  <Field label="Workshop fee *">
                    <input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="499" inputMode="numeric" className={inputCls} />
                  </Field>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 mb-3 cursor-pointer">
                    <input type="checkbox" checked={earlyBird} onChange={(e) => setEarlyBird(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Early bird price?
                  </label>
                  {earlyBird && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Early bird price">
                        <input value={earlyBirdFee} onChange={(e) => setEarlyBirdFee(e.target.value)} placeholder="399" inputMode="numeric" className={inputCls} />
                      </Field>
                      <Field label="Early bird ends">
                        <input type="date" min={todayIso()} max={date || undefined} value={earlyBirdDeadline} onChange={(e) => setEarlyBirdDeadline(e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                  )}
                </>
              )}

              <span className="block text-xs font-semibold text-slate-600 mb-1.5 mt-1">Maximum participants</span>
              <div className="flex gap-1.5 mb-3">
                <PillSelect value={hasLimit} onChange={setHasLimit} options={[false, true]} getKey={(v) => v} getLabel={(v) => v ? "Limited seats" : "No limit"} />
              </div>
              {hasLimit && (
                <Field label="Number of seats">
                  <input value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value.replace(/\D/g, ""))} placeholder="50" inputMode="numeric" className={inputCls} />
                </Field>
              )}

              <span className="block text-xs font-semibold text-slate-600 mb-1.5 mt-1">How should students register? *</span>
              <div className="space-y-2 mb-3">
                {[
                  { key: "physiofeed", label: "Register on PhysioFeed", hint: "Recommended -- registrations, reminders and a chat with participants, right here." },
                  { key: "external", label: "External registration link", hint: null },
                  { key: "contact", label: "Contact organiser", hint: null },
                ].map((o) => (
                  <label key={o.key} className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer border border-slate-200 rounded-xl px-3.5 py-2.5">
                    <input type="radio" name="regMethod" checked={registrationMethod === o.key} onChange={() => setRegistrationMethod(o.key)} className="mt-0.5 text-indigo-600 focus:ring-indigo-500" />
                    <span>
                      <span className="block font-semibold">{o.label}</span>
                      {o.hint && <span className="block text-xs text-slate-400 mt-0.5">{o.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
              {registrationMethod === "external" && (
                <Field label="Registration link *">
                  <input value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                </Field>
              )}
            </>
          )}

          {step === 5 && (
            <CoverImageStep
              preview={coverPreview}
              onPick={(file) => { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }}
              onClear={() => { setCoverFile(null); setCoverPreview(null); }}
            />
          )}

          {step === 6 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">This is what students will see</p>
              {/* pointer-events-none: this is a look-only mock-up, not a
                  live card -- previewOpp.id ("preview") isn't a real row,
                  so a stray tap on WorkshopDetail's own Register button
                  would otherwise call db.registerForWorkshop("preview",...)
                  and fail. */}
              <div className="pointer-events-none">
                <div className="mb-4"><OpportunityCard opp={previewOpp} onOpen={() => {}} /></div>
                <WorkshopDetail opp={previewOpp} onBack={() => {}} registered={false} onRegistered={async () => {}} />
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
              <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm font-bold text-slate-600 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50">
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid}
                className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40 active:scale-[0.98] transition"
              >
                Next →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={!canSaveDraft || !!saving}
                  className="flex-1 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl py-3 disabled:opacity-40"
                >
                  {saving === "draft" ? "Saving…" : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={!canPublish || !!saving}
                  className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40"
                >
                  {saving === "publish" ? "Publishing…" : "Publish Workshop"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Same "hold a blob URL, upload on submit" shape as PostOpportunityModal's
// BannerUpload -- except this one's onPick keeps the raw File too (not just
// an object URL), because this is the version that actually uploads it
// (db.uploadOpportunityCoverImage) instead of leaving it to die on reload.
function CoverImageStep({ preview, onPick, onClear }) {
  if (preview) {
    return (
      <div className="mb-2">
        <span className="block text-xs font-semibold text-slate-600 mb-1.5">Workshop image</span>
        <div className="relative rounded-xl overflow-hidden aspect-[1200/630] bg-slate-100">
          <img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
          <button type="button" onClick={onClear} aria-label="Remove cover image" className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-2">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">Workshop image (optional)</span>
      <label className="block w-full border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-5 text-center cursor-pointer hover:bg-indigo-50 transition-colors">
        <ImagePlus size={22} className="mx-auto mb-1.5" color="#4F46E5" />
        <p className="text-xs font-semibold text-slate-700">Add cover image</p>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">Recommended: 1200 × 630 · PNG, JPG up to 5MB</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-3 py-1.5">
          <Folder size={13} /> Browse File
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) onPick(file); e.target.value = ""; }}
        />
      </label>
      <p className="text-[11px] text-slate-400 mt-2">No image? We'll use a clean default workshop placeholder.</p>
    </div>
  );
}
