import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Folder } from "lucide-react";
import { SPECIALTIES, LOCATION_TYPES } from "../../data/opportunitiesMock.js";
import { GRADIENTS } from "../shared/constants.js";

// 2026-09-21, Aditi's follow-up after seeing this modal live: the type
// selector was a cramped 2x2 grid, and the submit button clipped against
// the sheet's bottom edge with the page's own floating "+ Post" FAB
// visibly bleeding through underneath it (fixed by hiding that FAB while
// this modal is open -- see ExplorePage.jsx).
const TYPE_PILLS = [
  { key: "job", label: "Job", icon: "💼" },
  { key: "internship", label: "Internship", icon: "🎓" },
  { key: "collaboration", label: "Collab", icon: "🤝" },
  { key: "workshop", label: "Workshop", icon: "🎓" },
];
const PRACTICE_SETTINGS = ["Private OPD", "Tertiary Hospital", "Sports Academy"];
const GRAD_KEYS = Object.keys(GRADIENTS);

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "h-11 w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:text-sm";
const textareaCls = "w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:text-sm resize-none";

let comboboxSeq = 0;

// A bare <select> only allows a preset value. Aditi asked for the freedom
// to type a custom one too (2026-09-22) -- e.g. a specialty or setting we
// didn't anticipate. Native input+datalist keeps tap-to-pick suggestions
// while never blocking free text.
function Combobox({ value, onChange, options, placeholder }) {
  const [listId] = useState(() => `combo-opts-${comboboxSeq++}`);
  return (
    <>
      <input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}

const BANNER_HINT = {
  workshop: "Upload workshop schedule or CME banner",
  default: "Upload clinic photo, logo, or rehab facility",
};

// Optional cover image/flyer for the listing (2026-09-21, Aditi's spec).
// Never uploaded anywhere -- object URL held in memory only, same "demo,
// no backend table yet" scope as the rest of this board.
function BannerUpload({ type, bannerUrl, onPick, onClear }) {
  const fileRef = useRef(null);
  const hint = BANNER_HINT[type] || BANNER_HINT.default;

  if (bannerUrl) {
    return (
      <div className="mb-4">
        <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-slate-100">
          <img src={bannerUrl} alt="Cover preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove cover image"
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
          >
            <X size={14} />
          </button>
          <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/60 px-2 py-0.5 rounded-full">Cover Image</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-4 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
      >
        <ImagePlus size={22} className="mx-auto mb-1.5" color="#4F46E5" />
        <p className="text-xs font-semibold text-slate-700">{hint}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">PNG, JPG up to 5MB</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-3 py-1.5">
          <Folder size={13} /> Browse File
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(URL.createObjectURL(file));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function PostOpportunityModal({ onClose, onPublish }) {
  const [type, setType] = useState("job");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [practiceSetting, setPracticeSetting] = useState(PRACTICE_SETTINGS[0]);
  const [city, setCity] = useState("");
  const [workMode, setWorkMode] = useState(LOCATION_TYPES[0]);
  const [pay, setPay] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState(null);

  const canPublish = title.trim() && org.trim();
  const payLabel = type === "internship" ? "Monthly Stipend" : type === "job" ? "Salary / CTC" : "Fee";
  const payPlaceholder = type === "workshop" ? "₹499" : "₹15,000/mo";

  const publish = () => {
    if (!canPublish) return;
    const initials = org.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "PF";
    const locationLabel = workMode === "Remote" ? "Remote" : city.trim() || workMode;
    onPublish({
      id: `op-${Date.now()}`,
      type,
      org: org.trim(),
      orgInitials: initials,
      orgGradient: GRAD_KEYS[Math.floor(Math.random() * GRAD_KEYS.length)],
      title: title.trim(),
      location: locationLabel,
      postedAgo: "Just now",
      postedByMe: true,
      status: "active",
      daysRemaining: 30,
      stats: { views: 0, applications: 0, chats: 0 },
      description: description.trim() || `${specialty} opportunity posted via PhysioFeed.`,
      stipend: type === "internship" ? pay || undefined : undefined,
      salary: type === "job" ? pay || undefined : undefined,
      fee: type === "workshop" ? pay || "Free" : undefined,
      date: type === "workshop" ? "TBA" : undefined,
      time: type === "workshop" ? "TBA" : undefined,
      mode: type === "workshop" ? workMode : undefined,
      tags: [specialty, practiceSetting],
      bannerUrl: bannerUrl || undefined,
      mentor: { name: org.trim() || "Program lead", role: `${specialty} lead`, initials, gradient: "violet", bio: "" },
      instructor: type === "workshop" ? { name: org.trim() || "Instructor", role: `${specialty} instructor`, initials, gradient: "blue" } : undefined,
      syllabus: type === "workshop" ? [] : undefined,
    });
  };

  // Portaled to document.body (2026-09-22) so this always mounts as a
  // direct body child, same pattern as InfoCard.jsx's modal. z-[200]
  // (2026-09-22, Aditi's report: header/close button hidden after opening
  // over scrolled content) -- the app's own real chrome sits above z-50:
  // `.pm-mobile-hdr` is z-101, `.pm-bnav` is z-140, so this modal's header
  // was painting *underneath* them, not actually off-screen.
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white z-10">
          <div>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Step 1 of 2</p>
            <h2 className="text-lg font-bold text-slate-900">Post an opportunity</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-5 pb-10">
          <span className="block text-xs font-semibold text-slate-600 mb-1.5">Select Type</span>
          <div className="flex gap-1.5 mb-5">
            {TYPE_PILLS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] sm:text-xs font-semibold rounded-full py-2 px-1 border transition ${type === t.key ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <span aria-hidden="true">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <BannerUpload type={type} bannerUrl={bannerUrl} onPick={setBannerUrl} onClear={() => setBannerUrl(null)} />

          <Field label="Opportunity Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sports Physiotherapy Intern" className={inputCls} />
          </Field>

          <Field label="Clinic / Hospital Name">
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Apex Movement Center" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Specialty">
              <Combobox value={specialty} onChange={setSpecialty} options={SPECIALTIES} placeholder="e.g. MSK" />
            </Field>
            <Field label="Practice Setting">
              <Combobox value={practiceSetting} onChange={setPracticeSetting} options={PRACTICE_SETTINGS} placeholder="e.g. Private OPD" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bhopal" className={inputCls} />
            </Field>
            <Field label="Work Mode">
              <Combobox value={workMode} onChange={setWorkMode} options={LOCATION_TYPES} placeholder="e.g. On-site" />
            </Field>
          </div>

          <Field label={payLabel}>
            <input value={pay} onChange={(e) => setPay(e.target.value)} placeholder={payPlaceholder} className={inputCls} />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will they be doing?" className={textareaCls} />
          </Field>

          <button
            type="button"
            onClick={publish}
            disabled={!canPublish}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md disabled:opacity-40 active:scale-[0.98] transition mt-1"
          >
            Next: Requirements & Scope →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
