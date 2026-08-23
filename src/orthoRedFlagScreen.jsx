import React from "react";
import { SelectField, TextArea, Alert, fmtVal } from "./orthoFieldKit.jsx";

/* ============================================================
   RedFlagFields — universal red-flag screening checklist,
   rendered by RedFlagScreenSection (orthoOutpatientSections.jsx)
   as its own step. `d`/`set` are the section-scoped pair the
   caller already has from useSectionData(data, setData, "redFlags").
   ============================================================ */
const GRF_CATEGORIES = [
  { id: "grf_systemic", label: "Systemic symptoms", negative: "None — systemically well", options: ["None — systemically well", "Unexplained weight loss", "Night sweats", "Fever / feeling unwell", "Severe unexplained fatigue", "Loss of appetite", "Generalised swollen glands"] },
  { id: "grf_cancer", label: "Cancer history", negative: "No cancer history", options: ["No cancer history", "Active cancer — in treatment", "Past cancer — cured over 5 years ago", "Past cancer — within last 5 years", "Known bone metastases", "Significant family history", "Suspected — not yet investigated"] },
  { id: "grf_fracture", label: "Fracture risk", negative: "No fracture indicators", options: ["No fracture indicators", "Major trauma — high energy", "Minor trauma + age over 50", "Minor trauma + known osteoporosis", "Long-term steroid use", "Point bone tenderness", "History of fragility fractures"] },
  { id: "grf_infection", label: "Infection risk", negative: "No infection risk", options: ["No infection risk", "IV drug use", "Recent infection elsewhere", "Immunocompromised", "On immunosuppressants / biologics", "Recent invasive procedure near the pain"] },
  { id: "grf_neuro", label: "Neurological red flags", negative: "No neurological red flags", options: ["No neurological red flags", "Progressive motor weakness", "Rapid deterioration", "Bilateral limb involvement", "Sudden severe headache", "Headache with fever + neck stiffness"] },
  { id: "grf_vascular", label: "Vascular red flags", negative: "No vascular red flags", options: ["No vascular red flags", "Absent or reduced pulses reported", "Limb pallor or discolouration", "Rest pain in a limb", "Non-healing wound / ulcer", "Suspected DVT (calf pain + swelling + warmth)"] },
];

function flaggedValues(value, negative) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(", ");
  return list.filter((v) => v && v !== negative);
}

export function RedFlagFields({ d, set }) {
  const flaggedCategories = GRF_CATEGORIES.filter((c) => flaggedValues(d[c.id], c.negative).length > 0);
  return (
    <>
      {flaggedCategories.length > 0 && (
        <Alert tone="red">
          🚩 Red flag{flaggedCategories.length > 1 ? "s" : ""} noted — {flaggedCategories.map((c) => c.label).join(", ")}. Record an action below.
        </Alert>
      )}
      {GRF_CATEGORIES.map((c) => (
        <SelectField key={c.id} label={c.label} type="multi" options={c.options} value={d[c.id]} onChange={(v) => set(c.id, v)} />
      ))}
      <SelectField label="Action taken" type="single" options={["No red flags — proceed with assessment", "Red flags noted — monitor closely", "GP referral — routine", "GP referral — urgent", "Emergency department referral", "Specialist urgent referral", "Awaiting investigation results before proceeding"]} value={d.grf_action} onChange={(v) => set("grf_action", v)} />
      <TextArea label="Red flag notes" value={d.grf_notes} onChange={(v) => set("grf_notes", v)} placeholder="Clinical reasoning behind the action taken..." />
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx: (section) => [{label, value}] */
export function formatRedFlagsSection(section) {
  const rows = [];
  GRF_CATEGORIES.forEach((c) => {
    const val = fmtVal(section[c.id]);
    if (val) rows.push({ label: c.label, value: val });
  });
  const action = fmtVal(section.grf_action);
  if (action) rows.push({ label: "Action taken", value: action });
  const notes = fmtVal(section.grf_notes);
  if (notes) rows.push({ label: "Notes", value: notes });
  return rows;
}
