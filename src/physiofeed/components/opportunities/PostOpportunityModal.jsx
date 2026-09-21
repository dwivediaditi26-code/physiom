import { useState } from "react";
import { X } from "lucide-react";
import { OPPORTUNITY_CATEGORIES, SPECIALTIES, LOCATION_TYPES } from "../../data/opportunitiesMock.js";
import { GRADIENTS } from "../shared/constants.js";

const TYPES = OPPORTUNITY_CATEGORIES.filter((c) => c.key !== "all");
const GRAD_KEYS = Object.keys(GRADIENTS);

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-violet-400 focus:bg-white placeholder:text-slate-400";

export default function PostOpportunityModal({ onClose, onPublish }) {
  const [type, setType] = useState("job");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [locationType, setLocationType] = useState(LOCATION_TYPES[0]);
  const [location, setLocation] = useState("");
  const [pay, setPay] = useState("");
  const [description, setDescription] = useState("");

  const canPublish = title.trim() && org.trim();

  const publish = () => {
    if (!canPublish) return;
    const initials = org.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "PF";
    onPublish({
      id: `op-${Date.now()}`,
      type,
      org: org.trim(),
      orgInitials: initials,
      orgGradient: GRAD_KEYS[Math.floor(Math.random() * GRAD_KEYS.length)],
      title: title.trim(),
      location: locationType === "Remote" ? "Remote" : location.trim() || locationType,
      postedAgo: "Just now",
      description: description.trim() || `${specialty} opportunity posted via PhysioFeed.`,
      stipend: type === "internship" ? pay || undefined : undefined,
      salary: type === "job" ? pay || undefined : undefined,
      fee: type === "workshop" ? pay || "Free" : undefined,
      date: type === "workshop" ? "TBA" : undefined,
      time: type === "workshop" ? "TBA" : undefined,
      mode: type === "workshop" ? locationType : undefined,
      tags: [specialty],
      mentor: { name: org.trim() || "Program lead", role: `${specialty} lead`, initials, gradient: "violet", bio: "" },
      instructor: type === "workshop" ? { name: org.trim() || "Instructor", role: `${specialty} instructor`, initials, gradient: "blue" } : undefined,
      syllabus: type === "workshop" ? [] : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white">
          <div>
            <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wide">Step 1 of 2</p>
            <h2 className="text-lg font-bold text-slate-900">Post an opportunity</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-5 pb-6">
          <div className="grid grid-cols-2 gap-2 mb-5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`text-sm font-semibold rounded-xl py-2.5 border transition ${type === t.key ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {t.label.replace(/s$/, "")}
              </button>
            ))}
          </div>

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sports Physiotherapy Internship" className={inputCls} />
          </Field>

          <Field label="Clinic / Hospital name">
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Apex Movement Center" className={inputCls} />
          </Field>

          <Field label="Specialty">
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputCls}>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location type">
              <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={inputCls}>
                {LOCATION_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label={type === "workshop" ? "Fee" : "Stipend / salary"}>
              <input value={pay} onChange={(e) => setPay(e.target.value)} placeholder="₹15,000/mo" className={inputCls} />
            </Field>
          </div>

          {locationType !== "Remote" && (
            <Field label="City / area">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bhopal, MP" className={inputCls} />
            </Field>
          )}

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will they be doing?" className={inputCls + " resize-none"} />
          </Field>

          <button
            type="button"
            onClick={publish}
            disabled={!canPublish}
            className="w-full text-sm font-bold text-white rounded-xl py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm disabled:opacity-40 active:scale-[0.98] transition mt-1"
          >
            Preview & Publish
          </button>
        </div>
      </div>
    </div>
  );
}
