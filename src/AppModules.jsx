// AppModules.jsx — PDF reports, HEP helpers, QuickVisit, Intake, Onboarding
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useRef, useEffect } from "react";

// Scroll-and-tap Day / Month / Year picker -- same "DD/MM/YYYY" string a
// plain text/date input would hold, so it drops straight into dem_dob etc.
// (Aditi: "select from the list date, year, month... like a scrolling
// thing" instead of typing or a native calendar). Self-contained inline
// styles so it renders correctly wherever it's used across the app.
const DATE_WHEEL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function DateWheelField({ value, onChange, inputStyle, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parts = (value || "").split("/");
  const day = parts[0] || "", month = parts[1] || "", year = parts[2] || "";
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  function setPart(which, v) {
    const d = which === "day" ? v : day, m = which === "month" ? v : month, y = which === "year" ? v : year;
    onChange([d, m, y].filter(Boolean).length ? `${d || "--"}/${m || "--"}/${y || "----"}` : "");
  }
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = DATE_WHEEL_MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - 100 + i).reverse().map(String);
  const display = day && month && year ? `${day}/${month}/${year}` : "";
  const colStyle = { flex: 1, maxHeight: 170, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, border: "1px solid #E5E1F5", borderRadius: 8, padding: 4 };
  const itemStyle = (active) => ({ padding: "7px 4px", textAlign: "center", borderRadius: 6, fontSize: "0.8rem", fontWeight: active ? 800 : 500, background: active ? "#7c3aed" : "transparent", color: active ? "#fff" : "#111827", cursor: "pointer", border: "none", fontFamily: "inherit" });
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value={display} placeholder={placeholder || "DD/MM/YYYY"} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
          style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={() => setOpen((o) => !o)} title="Pick date"
          style={{ flexShrink: 0, width: 40, borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>
          📅
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E5E1F5", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: "0.78rem" }}>Select date</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={colStyle}>{days.map((d) => (<button key={d} type="button" style={itemStyle(d === day)} onClick={() => setPart("day", d)}>{parseInt(d, 10)}</button>))}</div>
            <div style={colStyle}>{months.map((m) => (<button key={m.value} type="button" style={itemStyle(m.value === month)} onClick={() => setPart("month", m.value)}>{m.label}</button>))}</div>
            <div style={colStyle}>{years.map((y) => (<button key={y} type="button" style={itemStyle(y === year)} onClick={() => setPart("year", y)}>{y}</button>))}</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} style={{ marginTop: 8, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
      )}
    </div>
  );
}

import { downloadPDFFromHTML, injectViewerControls } from "./sharedClinicalData.js";
import { EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, TEMPLATE_TX } from "./sharedClinicalData.js";
// buildRealtimeSOAP is the single, verified-correct source for real
// Subjective/Objective field names (ROM_DERIVED, dynamic mmt_*/st_* scans,
// DERMATOMES/MYOTOMES/REFLEXES/NEURAL_TENSION, multi-region agg/rel/red-flag
// aggregation via REG_MOD_S) -- already used by SOAP Notes and Live SOAP.
// The assessment PDF previously re-implemented its own field mapping
// separately and had drifted onto guessed/stale key names across most of
// the Subjective and Objective sections, silently dropping real data.
// Reusing this function instead of a second parallel implementation means
// the PDF can never drift out of sync with SOAP Notes again.
import { buildRealtimeSOAP } from "./ClinicalModules.jsx";
import { REG_MOD_S } from "./SubjectiveObjective.jsx";
// Ortho Outpatient "New Assessment" wizard data, for the PDF's Ortho cards
// (see the orthoWizardData/orthoStepCard comment below in PdfReportsModal
// for why this is a deliberate second source alongside buildRealtimeSOAP
// above, not a re-introduction of the drift that comment warns against).
import { orthoSummaryFormatters } from "./OrthoOutpatientAssessment.jsx";
import { rowsForStep } from "./orthoSummary.jsx";

// No UI of its own (2026-09-29, Aditi: "why so much written when clicking
// pdf ... just generate pdf remove this page") -- this used to be a modal
// listing report choices (Assessment Report / Treatment Plan, each with its
// own description card and Generate button) before those two reports were
// merged into one. With only one report left, showing a card to choose it
// was pure friction: this now builds and opens that one PDF the instant
// it mounts, then calls onClose() -- clicking "Generate PDF Report" in an
// assessment's Review screen goes straight to the browser's print dialog.
function PdfReportsModal({ data, dx, onClose, currentUser }) {
  const d = data || {};
  const patName = d.dem_name || "Patient";
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const dob = d.dem_dob || "--";
  const age = d.dem_age || "--";
  const sex = d.dem_sex || d.dem_gender || "--";
  const occ = d.dem_occupation || "--";
  const gp = d.dem_gp || "--";
  const refNo = d.dem_ins_ref || "--";
  const insurer = d.dem_insurer || "--";
  const refSource = d.dem_referral || "--";

  const brand = { primary:"#1a3a5c", accent:"#2563eb", teal:"#0891b2", green:"#059669", red:"#dc2626", amber:"#d97706", purple:"#7c3aed", grey:"#6b7280", lightGrey:"#f1f5f9", border:"#e2e8f0", midGrey:"#94a3b8" };

  const escHtml = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const val = (k, fallback="--") => escHtml(d[k]||fallback);
  const arr = (k) => { const v=d[k]; return Array.isArray(v)?v:(typeof v==="string"?v:"").split("|||").filter(Boolean); };

  // Shared card/row markup for every section of the report (2026-09-29,
  // Aditi: PDF was "too much" -- busy colour-coded section headers, tag
  // pills, number tiles -- vs. the plain white cards + label/value rows
  // her app's own Final Review / Care Plan screens already use
  // (.summary-card/.summary-row in orthoStyles.js). `card`/`row` reproduce
  // that same look here so the PDF and the in-app summary read as one
  // design instead of two. `value` must already be HTML-safe (escHtml'd
  // by the caller), same convention the old miniField/fieldRow used.
  const card = (icon, title, bodyHtml) => `<div class="pdf-card"><div class="pdf-card-title">${icon ? icon + " " : ""}${title}</div>${bodyHtml}</div>`;
  const row = (label, value) => (!value || value === "--") ? "" : `<div class="pdf-row"><span class="pdf-row-label">${escHtml(label)}</span><span class="pdf-row-val">${value}</span></div>`;
  const textRow = (value) => (!value || value === "--") ? "" : `<div class="pdf-row" style="display:block;">${value}</div>`;

  // Ortho Outpatient "New Assessment" wizard's own saved snapshot -- when
  // present, this (not the buildRealtimeSOAP-derived fields below) is the
  // source for every Ortho-specific card (2026-09-29, Aditi: "i want pdf to
  // have new assessment final review data only", "no soap or soap live
  // idnt want in pdf"). PainSection/RedFlagScreenSection/RomSection/
  // SpecialTestsSection/etc. (orthoCommonSections.jsx/orthoOutpatientSections.jsx/
  // orthoRegionAssessments.jsx) never write back into the flat cc_main/
  // cc_vas_now/red_flags/etc. fields buildRealtimeSOAP reads -- only
  // Demographics does -- so those stay empty for any patient assessed this
  // way even though Final Review shows real data for the same session.
  // OrthoOutpatientAssessment.jsx's own saveAssessment() already persists
  // the wizard's whole local `data` object here (onSave("ortho_outpatient_
  // assessment", JSON.stringify({..., data}))) on every autosave, so it's
  // reliably present by the time a report is generated.
  // orthoSummaryFormatters/rowsForStep are the exact functions Final
  // Review's own AssessmentSummary renders with (orthoSummary.jsx) --
  // reusing them means this card shows literally the same labels/values as
  // Final Review, instead of a third hand-maintained field mapping.
  let orthoWizardData = null;
  try {
    const raw = d.ortho_outpatient_assessment;
    const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    orthoWizardData = parsed?.data || null;
  } catch {}
  const ORTHO_STEP_LABELS = {
    subjective: ["📝", "Subjective"], redFlags: ["🚩", "Red Flag Screen"], pain: ["📊", "Pain"],
    observation: ["👁️", "General Observation"], palpation: ["✋", "Palpation"],
    rom: ["📏", "Range of Motion"], mmt: ["💪", "Muscle Strength (MMT)"], jointMobility: ["🦴", "Joint Mobility"],
    specialTests: ["🔬", "Special Tests"], neuroScreen: ["⚡", "Neuro Screen"], limbLength: ["📐", "Limb Length"],
    kineticChain: ["⛓️", "Kinetic Chain"], cpa: ["🧠", "CPA (NKT)"], sttt: ["🦴", "STTT (Cyriax)"],
    fma: ["🏃", "Functional Movement"], fascia: ["🕸️", "Fascia"], clinicalAssessment: ["🩺", "Clinical Assessment"],
    carePlanProblems: ["🧩", "Problem List"], carePlanGoals: ["🎯", "Care Plan Goals"],
  };
  const orthoStepCard = (stepId) => {
    if (!orthoWizardData) return "";
    const [icon, label] = ORTHO_STEP_LABELS[stepId] || ["📄", stepId];
    const result = rowsForStep({ id: stepId }, orthoWizardData[stepId] || {}, orthoSummaryFormatters);
    let body = "";
    if (Array.isArray(result)) {
      body = result.map(({ label: l, value: val2 }) => row(l, escHtml(val2))).join("");
    } else if (result?.groups) {
      body = result.groups.map(({ heading, rows: grows }) => grows.length
        ? `<div class="pdf-group-heading">${escHtml(heading)}</div>${grows.map(({ label: l, value: val2 }) => row(l, escHtml(val2))).join("")}`
        : "").join("");
    }
    return body ? card(icon, label, body) : "";
  };

  // Breadcrumb strip (Aditi: "specify which region ortho neuro cardio ip op
  // condition etc everything") -- specialty is derived from what's actually
  // recorded rather than a stored field (no wizard currently saves one):
  // real ortho objective data (any rom_/mmt_/etc-prefixed field) means
  // "Ortho", d.cardio/d.neuro existing means those specialties ran too.
  // Pathway is only ever shown for Ortho, hardcoded to the one pathway
  // that's actually reachable from live navigation today (Outpatient/
  // Musculoskeletal -- IPD/Post-op exist in code but aren't wired into
  // nav yet) rather than inventing a value with nowhere real to read it
  // from. Condition reuses the same diagnosis fields the report already
  // shows on its Clinical diagnosis section.
  const bcRegion = Object.keys(REG_MOD_S||{}).filter(r => {
    const px = REG_MOD_S[r]?.prefix;
    return px && Object.keys(d).some(k => k.startsWith(px + "_"));
  }).join(", ");
  const bcSpecialties = [];
  if (bcRegion) bcSpecialties.push("Ortho");
  if (d.cardio) bcSpecialties.push("Cardio");
  if (d.neuro) bcSpecialties.push("Neuro");
  const bcSpecialty = bcSpecialties.join(" + ");
  const bcPathway = bcSpecialties.includes("Ortho") ? "Outpatient / Musculoskeletal" : "";
  const bcCondition = d.soap_a_diagnosis || d.soap_a || dx?.dx?.[0]?.diagnosis || "";
  const breadcrumbHtml = (bcSpecialty || bcPathway || bcRegion || bcCondition) ? `
    <div class="pdf-crumb">
      ${bcSpecialty ? `<b>${escHtml(bcSpecialty)}</b>` : ""}
      ${bcPathway ? `<span class="sep">&middot;</span><span>${escHtml(bcPathway)}</span>` : ""}
      ${bcRegion ? `<span class="sep">&middot;</span><span>${escHtml(bcRegion)}</span>` : ""}
      ${bcCondition ? `<span class="sep">&middot;</span><b>${escHtml(bcCondition)}</b>` : ""}
    </div>` : "";

  // Header right-hand block: clinician + clinic (name, address), then the date
  // once. Anything not on file renders as an empty, click-to-type field (shows
  // a dotted line when printed) so it can be written in the preview or by hand.
  const meta = currentUser?.user_metadata || {};
  const rawClinician = d.therapist_name || meta.full_name || "";
  const clinicianName = rawClinician ? `Dr. ${String(rawClinician).replace(/^dr\.?\s+/i, "")}` : "";
  const clinicNameTxt = d.clinic_name || d.soap_clinic || meta.clinic_name || "";
  const clinicAddrTxt = d.clinic_address || meta.clinic_address || "";
  const clinicPhoneTxt = d.clinic_phone || meta.clinic_phone || "";
  const fillField = (val, ph, style) => `<div class="pdf-fill" contenteditable="true" data-ph="${escHtml(ph)}" style="${style}">${escHtml(val)}</div>`;
  const clinicBlockHtml = `<style>.pdf-fill{min-width:180px;border-bottom:1px dotted #cbd5e1;outline:none;}.pdf-fill:empty:before{content:attr(data-ph);color:#94a3b8;font-weight:400;}@media print{.pdf-fill{border-bottom-color:#94a3b8;}.pdf-fill:empty:before{content:"";}}</style>
    ${fillField(clinicianName, "Clinician / doctor name", "font-size:14px;font-weight:700;color:#1e293b;")}
    ${fillField(clinicNameTxt, "Clinic name", "font-size:11px;font-weight:600;color:#334155;margin-top:4px;")}
    ${fillField(clinicAddrTxt, "Clinic address", "font-size:10px;color:#64748b;margin-top:3px;")}
    ${fillField(clinicPhoneTxt, "Clinic phone", "font-size:10px;color:#64748b;margin-top:3px;")}`;
  const clinicBlockCompact = `<style>.pdf-fill{min-width:120px;border-bottom:1px dotted #cbd5e1;outline:none;}.pdf-fill:empty:before{content:attr(data-ph);color:#94a3b8;font-weight:400;}@media print{.pdf-fill{border-bottom-color:#94a3b8;}.pdf-fill:empty:before{content:"";}}</style>
    ${fillField(clinicianName, "Clinician / doctor name", "font-size:10px;font-weight:700;color:#1e293b;")}
    ${fillField([clinicNameTxt, clinicAddrTxt].filter(Boolean).join(", "), "Clinic name & address", "font-size:8.5px;color:#64748b;margin-top:2px;")}
    ${fillField(clinicPhoneTxt, "Clinic phone", "font-size:8.5px;color:#64748b;margin-top:2px;")}`;

  const pdfHeader = (title, subtitle, color, compact = false) => {
    // Pages after the first: small logo + clinician/clinic strip only.
    if (compact) {
      return `<div style="background:#fff;border-bottom:2px solid #7c3aed;padding:8px 32px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="/logo.svg" alt="PhysioMind" style="height:30px;width:auto;display:block;" />
          <div style="border-left:1px solid #e2e8f0;padding-left:10px;font-size:8.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${title}</div>
        </div>
        <div style="text-align:right;max-width:55%;">${clinicBlockCompact}</div>
      </div>`;
    }
    const inlineLogo = `<img src="/logo.svg" alt="PhysioMind" style="height:68px;width:auto;display:block;" />`;
    return `<div style="background:#fff;border-bottom:1px solid #e2e8f0;">
      <div style="padding:14px 32px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:18px;">
          ${inlineLogo}
          <div style="border-left:2px solid #e2e8f0;padding-left:18px;margin-left:4px;">
            <div style="font-size:8.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${title}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1px;">${subtitle}</div>
          </div>
        </div>
        <div style="text-align:right;max-width:46%;">
          ${clinicBlockHtml}
          <div style="font-size:10px;color:#64748b;margin-top:5px;">${today}</div>
        </div>
      </div>
      <div style="background:linear-gradient(to right,#3730a3,#7c3aed,#a855f7);padding:6px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">Smarter Assessment &middot; Better Outcomes</span>
        <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.8px;text-transform:uppercase;">Confidential Medical Document</span>
      </div>
    </div>`;
  };

  const pdfFooter = (docName, pageLabel) => {
    const therapistName = d.therapist_name || "Your Physiotherapist";
    // App Store Guideline 1.4.1 requires this exact disclaimer on
    // assessment report export views, not just onboarding.
    return '<div style="background:#f8fafc;padding:8px 40px;border-top:1px solid #e2e8f0;text-align:center;">'
      + '<div style="color:#94a3b8;font-size:7.5px;line-height:1.5;">PhysioMind is strictly an educational training tool for physiotherapy students and clinicians. It does not provide medical diagnoses, treatment decisions, or replace professional clinical judgment.</div>'
      + '</div>'
      + '<div style="background:#1e293b;padding:10px 40px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div style="color:#94a3b8;font-size:8px;">PhysioMind &middot; ' + docName + '</div>'
      + '<div style="color:#64748b;font-size:8px;text-align:center;"><span style="color:#c9a84c;font-weight:700;">CONFIDENTIAL</span> &mdash; For Authorised Healthcare Professionals Only &middot; Not for Distribution</div>'
      + '<div style="color:#94a3b8;font-size:8px;">' + (pageLabel || ('Page 1 &middot; ' + today)) + '</div>'
      + '</div>';
  };

  const sectionCard = (title, icon, content, borderColor) => '<div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">'
    + '<div style="padding:11px 16px;border-bottom:2px solid '+borderColor+'20;display:flex;align-items:center;gap:8px;">'
    + '<div style="width:28px;height:28px;background:'+borderColor+'12;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;border:1px solid '+borderColor+'25;">'+icon+'</div>'
    + '<span style="font-size:11px;font-weight:700;color:'+borderColor+';text-transform:uppercase;letter-spacing:1px;font-family:Georgia,serif;">'+title+'</span>'
    + '<div style="flex:1;height:1px;background:'+borderColor+'15;margin-left:4px;"></div>'
    + '</div>'
    + '<div style="padding:14px 16px;">'+content+'</div>'
    + '</div>';

  const badge = (text, color) => `<span style="display:inline-block;padding:3px 8px;background:${color}15;border:1px solid ${color}40;border-radius:5px;font-size:9px;font-weight:700;color:${color};margin:2px 3px 2px 0;">${escHtml(text)}</span>`;

  const postureSvg = () => {
    const fhp = d.post_fhp || "";
    const sh = d.post_sh || "";
    const kyphosis = d.post_kyphosis || "";
    const lordosis = d.post_lordosis || "";
    const pelvis = d.post_pelvis || "";
    return `<svg viewBox="0 0 220 340" width="160" height="248" style="display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626"/></marker></defs>
      <rect width="220" height="340" fill="#f8fafc" rx="10"/>
      <line x1="110" y1="10" x2="110" y2="330" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"/>
      <ellipse cx="${fhp&&fhp.includes("Moderate")?120:fhp&&fhp.includes("Severe")?128:110}" cy="38" rx="22" ry="26" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="${fhp&&fhp.includes("Severe")?112:106}" y="62" width="14" height="22" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <line x1="${sh&&sh.includes("elevated")?62:68}" y1="${sh&&sh.includes("elevated")?84:88}" x2="${sh&&sh.includes("elevated")?158:152}" y2="${sh&&sh.includes("elevated")?88:84}" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="${sh&&sh.includes("elevated")?62:68}" cy="${sh&&sh.includes("elevated")?84:88}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="${sh&&sh.includes("elevated")?158:152}" cy="${sh&&sh.includes("elevated")?88:84}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <path d="M104,84 Q${kyphosis&&kyphosis.includes("increased")?98:104},120 ${kyphosis&&kyphosis.includes("increased")?98:104},145" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M${kyphosis&&kyphosis.includes("increased")?98:104},145 Q${lordosis&&lordosis.includes("increased")?116:104},170 ${lordosis&&lordosis.includes("increased")?114:104},190" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M68,88 L74,190 L148,190 L152,88 Z" fill="#dde8f8" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="110" cy="${pelvis&&pelvis.includes("anterior")?196:192}" rx="36" ry="20" fill="#c7d7f0" stroke="#2563eb" strokeWidth="1.5"/>
      <rect x="90" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="90" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="99" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      <ellipse cx="121" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      ${fhp&&!fhp.includes("Normal")?'<text x="135" y="35" fontSize="8" fill="#dc2626" fontWeight="700">FHP</text>':""}
      ${sh&&sh.includes("elevated")?'<text x="30" y="80" fontSize="8" fill="#dc2626" fontWeight="700">Sh elev.</text>':""}
      ${kyphosis&&kyphosis.includes("increased")?'<text x="20" y="120" fontSize="8" fill="#d97706" fontWeight="700">Kyph+</text>':""}
      ${lordosis&&lordosis.includes("increased")?'<text x="140" y="170" fontSize="8" fill="#d97706" fontWeight="700">Lord+</text>':""}
      ${pelvis&&pelvis.includes("anterior")?'<text x="150" y="200" fontSize="8" fill="#7c3aed" fontWeight="700">APT</text>':""}
      <line x1="110" y1="15" x2="110" y2="325" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
    </svg>`;
  };

  const gatherExercises = () => {
    // ── 1. Real data: merge Exercise Prescription (tx_exercise_prescription
    // -- clinic-directed program added via the Treatment tab) with Home
    // Exercise Programme (hep_programme -- separate home-only module). These
    // two stores were deliberately split earlier so Sessions/SOAP could show
    // them as distinct concepts, but this previously only ever read
    // hep_programme -- so exercises added the more commonly used way, via
    // Exercise Prescription, never appeared in the Treatment PDF (whose own
    // section is literally titled "Exercise Prescription") or the Home
    // Exercise Program PDF at all. De-duplicated by id/name in case the same
    // library exercise was added to both lists.
    const rx  = Array.isArray(d.tx_exercise_prescription) ? d.tx_exercise_prescription : [];
    const hep = Array.isArray(d.hep_programme) ? d.hep_programme : [];
    const mapEx = (ex) => ({
      name:        ex.name || "Unnamed Exercise",
      sets:        ex.customSets  || ex.sets  || "",
      reps:        ex.customReps  || ex.reps  || "",
      hold:        ex.customHold  || ex.hold  || "",
      rest:        ex.customRest  || ex.rest  || "",
      freq:        ex.customFreq  || ex.freq  || "",
      phase:       ex.phase       || "Exercises",
      notes:       ex.notes       || "",
      target:      ex.target      || ex.muscle || "",
      progression: ex.progression || "",
      _key:        ex.id || ex.name || Math.random().toString(36),
    });
    if (rx.length > 0 || hep.length > 0) {
      const seen = new Set();
      const combined = [...rx.map(mapEx), ...hep.map(mapEx)].filter(ex => {
        if (seen.has(ex._key)) return false;
        seen.add(ex._key);
        return true;
      }).map(({ _key, ...rest }) => rest);
      if (combined.length > 0) return combined;
    }
    // ── 2. Manual entries: ex_name_1..12 ────────────────────────────────────
    const exs = [];
    for (let i = 1; i <= 12; i++) {
      const name = d[`ex_name_${i}`] || d[`exercise_${i}_name`] || "";
      if (!name) continue;
      exs.push({
        name, sets: d[`ex_sets_${i}`] || "", reps: d[`ex_reps_${i}`] || "",
        hold: d[`ex_hold_${i}`] || "", rest: d[`ex_rest_${i}`] || "",
        freq: d[`ex_freq_${i}`] || "", phase: d[`ex_phase_${i}`] || "Exercises",
        notes: d[`ex_notes_${i}`] || "", target: d[`ex_target_${i}`] || "",
        progression: d[`ex_progression_${i}`] || "",
      });
    }
    return exs;
  };

  const gatherTechniques = () => {
    // ── 1. Real data: tx_techniques array (TreatmentTechniquesModule) ───────
    const txArr = Array.isArray(d.tx_techniques) ? d.tx_techniques : [];
    if (txArr.length > 0) {
      return txArr.map(t => {
        if (t.type === "manual") return {
          name:      t.technique || "Joint Mobilisation",
          area:      [t.region, t.laterality].filter(Boolean).join(" — "),
          duration:  t.dosage || t.duration || "",
          rationale: [t.grade ? `Grade ${t.grade}` : "", t.response || ""].filter(Boolean).join(". "),
        };
        if (t.type === "dn") return {
          name:      `Dry Needling — ${t.dn_muscle || "Muscle"}`,
          area:      [t.laterality, t.dn_depth ? `depth ${t.dn_depth}mm` : ""].filter(Boolean).join(", "),
          duration:  `${t.dn_needles || "1"} needle${t.dn_needles!="1"?"s":""}${t.dn_twitch ? ` · LTR: ${t.dn_twitch}` : ""}`,
          rationale: t.response || t.notes || "Myofascial trigger point release",
        };
        if (t.type === "st") return {
          name:      t.st_technique || "Soft Tissue Therapy",
          area:      t.st_region || t.laterality || "",
          duration:  t.duration || t.dosage || "",
          rationale: t.response || "",
        };
        // fallback for unknown types
        return {
          name:      t.technique || t.name || "Manual Technique",
          area:      t.region || t.area || "",
          duration:  t.dosage || t.duration || "",
          rationale: t.rationale || t.response || "",
        };
      });
    }
    // ── 2. Manual entries: tx_name_1..10 ────────────────────────────────────
    const techs = [];
    for (let i = 1; i <= 10; i++) {
      const name = d[`tx_name_${i}`] || d[`technique_${i}`] || "";
      if (!name) continue;
      techs.push({ name, area: d[`tx_area_${i}`] || "", duration: d[`tx_duration_${i}`] || "", rationale: d[`tx_rationale_${i}`] || "" });
    }
    return techs;
  };

  const buildAssessmentPdf = () => {
    // ── helpers ──────────────────────────────────────────────────────────
    const v  = (k, fb="") => escHtml(d[k] || fb);
    const av = (k) => { const x = d[k]; return Array.isArray(x) ? x : (typeof x === "string" ? x : "").split("|||").filter(Boolean); };
    const hasAny = (...keys) => keys.some(k => d[k] && String(d[k]).trim() !== "");
    const sec = (icon, title, _color, body) => card(icon, title, body);
    const fieldRow = row;
    const miniField = row;
    const badge = (text, color="#dc2626", bg="#fee2e2") =>
      `<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;background:${bg};color:${color};white-space:nowrap;">${escHtml(text)}</span>`;
    const testRow = (name, result) => {
      const isPos = /positive|abnormal|restricted|present|reduced|elevated|absent|weak|impaired/i.test(result);
      const isNeg = /negative|normal|full|wn|intact|equal|bilateral/i.test(result);
      const dot = isPos ? `<span style="color:#dc2626;font-weight:800;margin-right:4px;">+</span>` :
                  isNeg ? `<span style="color:#059669;font-weight:800;margin-right:4px;">−</span>` :
                          `<span style="color:#94a3b8;font-weight:800;margin-right:4px;">·</span>`;
      return `<div style="display:flex;gap:4px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        ${dot}
        <span style="font-weight:600;color:#334155;min-width:130px;">${escHtml(name)}</span>
        <span style="color:#64748b;flex:1;">${escHtml(result)}</span>
      </div>`;
    };
    const romRow = (movement, left, right, normal, limitedSide) => {
      if (!left && !right) return "";
      const statusColor = limitedSide ? "#dc2626" : "#059669";
      const statusText  = limitedSide ? `↓ ${limitedSide}` : "WNL";
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${movement}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${right||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#94a3b8;">${normal}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;font-weight:700;color:${statusColor};">${statusText}</td>
      </tr>`;
    };
    const mmtRow = (muscle, left, right) => {
      if (!left && !right) return "";
      const low = (v) => v && parseFloat(v) < 5;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${muscle}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(left)?"#dc2626":"#059669"};font-weight:${low(left)?"700":"400"};">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(right)?"#dc2626":"#059669"};font-weight:${low(right)?"700":"400"};">${right||"—"}</td>
      </tr>`;
    };

    // ── patient meta ──────────────────────────────────────────────────────
    const patName   = v("dem_name", "Patient");
    const dob       = v("dem_dob");
    const sex       = v("dem_sex");
    const occ       = v("dem_occupation");
    const employer  = v("dem_employer");
    const gp        = v("dem_gp");
    const referral  = v("dem_referral");
    const consent   = v("dem_consent");
    const therapist = v("therapist_name", "___________________");
    const ahpra     = v("therapist_qual", "___________________");
    const clinicAddr = d.clinic_address || "PhysioMind";

    // ── real-time SOAP text -- single verified source for subjective +
    // objective field names (see import comment above for why) ─────────────
    const soap = buildRealtimeSOAP(d);
    const sLine = (label) => {
      const m = soap.S.split("\n").find(l => l.startsWith(label + ":"));
      return m ? m.slice(label.length + 1).trim().replace(/\.$/, "") : "";
    };
    const sTags = (label) => { const t = sLine(label); return t ? t.split(/[,;]/).map(s=>s.trim()).filter(Boolean) : []; };

    // ── subjective fields (demographic/chief-complaint fields verified real;
    // everything region-dependent now sourced from buildRealtimeSOAP, which
    // already correctly aggregates across every active region via REG_MOD_S
    // instead of guessing a single region from a field that doesn't exist) ──
    const cc        = v("cc_main");
    const onset     = v("cc_onset");
    const duration  = v("cc_duration");
    const mechanism = v("cc_mechanism");
    const vasNow    = v("cc_vas_now");
    const vasWorst  = v("cc_vas_worst");
    const vasBest   = v("cc_vas_best");
    const behaviour = sLine("Behaviour");
    const bodyRegion = Object.keys(REG_MOD_S||{}).filter(r => {
      const px = REG_MOD_S[r]?.prefix;
      return px && Object.keys(d).some(k => k.startsWith(px + "_"));
    }).join(", ");

    const aggAll = sTags("Aggravating");
    const relAll = sTags("Easing");

    const rfLine = (() => {
      const m = soap.S.split("\n").find(l => l.startsWith("⚠ RED FLAGS IDENTIFIED:"));
      return m ? m.replace("⚠ RED FLAGS IDENTIFIED:","").replace(/— medical review indicated\.?$/,"").trim() : "";
    })();
    const rfItems = rfLine ? rfLine.split(",").map(s=>s.trim()).filter(Boolean) : [];
    const rfAction = v("grf_action") || v("grf_notes");
    const yfItems = [];

    // PMH — sourced from buildRealtimeSOAP's Past medical history/Medications lines
    const pmhConds  = sLine("Past medical history");
    const pmhMeds   = sLine("Medications");
    const pmhAllerg = sLine("Allergies/precautions");
    const pmhSurg   = "";
    const pmhFam    = "";

    // goals / lifestyle
    const goal       = sLine("Patient goals");
    const goalBelief = "";
    const lsExercise = "";
    const lsSleep    = "";
    const lsStress   = "";
    const lsWork     = "";
    const lsNotes    = sLine("Lifestyle");

    // clinician notes
    const ccNotes  = v("cc_notes");
    const hxNotes  = v("hx_notes");
    const goalNotes = v("goal_notes");

    // ── objective fields ──────────────────────────────────────────────────
    // Every objective/advanced-assessment section (Observation, Palpation,
    // ROM, MMT, Neurological, Special Tests, CPA, Kinetic Chain, STTT,
    // Fascial, Outcome Measures, Gait, Functional Screens, Ergonomic) comes
    // from soap.O -- split into individual blocks below rather than each
    // being re-derived from field names by hand a second time.
    const objSections = soap.O.split("\n\n").map(block => {
      const idx = block.indexOf(":");
      if (idx === -1) return null;
      const title = block.slice(0, idx).trim();
      const body = block.slice(idx + 1).trim().replace(/\.$/, "");
      return title && body ? { title, body } : null;
    }).filter(Boolean);

    const OBJ_ICON = {
      "Observation/Posture": "\ud83d\udc41\ufe0f", "Observation": "\ud83d\udc41\ufe0f",
      "Palpation": "\ud83e\udd0f", "Range of Motion": "\ud83d\udcd0",
      "Muscle Strength (MMT)": "\ud83d\udcaa", "Neurological": "\u26a1",
      "Special Tests": "\ud83d\udd2c", "Neuromuscular Assessment (CPA)": "\ud83e\udde0",
      "Kinetic Chain Assessment": "\u26d3\ufe0f", "STTT / Selective Tissue Tension": "\ud83e\uddec",
      "Fascial Assessment": "\ud83d\udd78\ufe0f", "Pain Location (Body Chart)": "\ud83d\udccd",
      "Outcome Measures": "\ud83d\udcc8", "Gait Analysis": "\ud83d\udeb6",
      "Ergonomic Assessment": "\ud83d\udcbc", "Treatment Given": "\ud83c\udfe5", "Pain response": "\ud83d\udcca",
    };
    const objIcon = (title) => OBJ_ICON[title] || (/screen/i.test(title) ? "\ud83c\udfc3" : "\ud83d\udcc4");
    // First attempt (a coloured left-border block per line) still read as
    // one repetitive stack -- every row had identical shape, just with a
    // stripe. This instead reuses the exact row style the Special Tests
    // section already uses (testRow, defined below): a coloured +/-/*
    // indicator, a bold fixed-width label column, and a lighter value
    // column, so STTT and every other objective section reads as a proper
    // scannable findings list instead of paragraphs of prose -- consistent
    // with the one section of this PDF that never got a "too dense" complaint.
    const renderObjBody = (body) => {
      const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
      return lines.map(line => {
        const isHeader = line.endsWith(":") && line.length < 50;
        if (isHeader) {
          return `<div class="pdf-group-heading">${escHtml(line.slice(0,-1))}</div>`;
        }
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1 || colonIdx > 45) {
          return textRow(escHtml(line));
        }
        const name = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        return row(name, escHtml(val));
      }).join("");
    };

    // Diagnosis
    const dxMain  = (orthoWizardData?.demographics?.provisionalDiagnosis ? escHtml(orthoWizardData.demographics.provisionalDiagnosis) : "") || v("soap_a_diagnosis") || v("soap_a");
    const dxIcd   = v("soap_icd10");
    const dxAssess = v("soap_assessment");
    const dxList  = dx?.dx || [];

    // ── CSS ───────────────────────────────────────────────────────────────
    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{background:#fff;max-width:860px;margin:0 auto 0;box-shadow:0 4px 40px rgba(0,0,0,0.12);}
      .body{padding:22px 32px 28px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;padding:6px 6px;text-align:left;border-bottom:1px solid #e2e8f0;}
      td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}
      @media print{body{background:white;}.page{box-shadow:none;max-width:100%;}}
      .pdf-crumb{padding:7px 32px;background:#faf9ff;border-bottom:1px solid #ECE9F7;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:9.5px;color:#334155;}
      .pdf-crumb b{color:#7C3AED;font-weight:600;}
      .pdf-crumb .sep{color:#c4b5fd;}
      .pdf-card{border:1.5px solid #ECE9F7;border-radius:14px;padding:12px 14px;margin-bottom:10px;break-inside:avoid;}
      .pdf-card-title{font-weight:600;font-size:12px;color:#1A1A2E;margin-bottom:6px;}
      .pdf-row{display:flex;gap:8px;padding:4px 0;border-top:1px solid #F5F3FB;font-size:9.5px;color:#334155;}
      .pdf-row:first-child{border-top:none;}
      .pdf-row-label{flex:0 0 42%;color:#64748b;}
      .pdf-row-val{flex:1;font-weight:600;color:#1A1A2E;}
      .pdf-group-heading{font-weight:700;font-size:9.5px;color:#7C3AED;margin:8px 0 3px;}
      .pdf-group-heading:first-child{margin-top:0;}
      .pdf-sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:8px 4px;margin-top:4px;}
      .pdf-sign-label{font-size:9.5px;color:#64748b;margin-bottom:18px;}
      .pdf-sign-line{border-bottom:1px solid #334155;height:20px;margin-bottom:4px;}
      .pdf-sign-note{font-size:9.5px;color:#64748b;}
    `;

    // ── PAGE FOOTER ───────────────────────────────────────────────────────
    // Bug fix (2026-08-19, Aditi's request): a completed cardio assessment
    // never appeared in this PDF at all -- CardiopulmonaryAssessment.jsx
    // was disconnected from the patient record until this same pass (see
    // that file's header comment), so there was nothing here to show
    // before now. Appends a 3rd page ONLY when d.cardio has data, and a
    // 4th when d.neuro has data (NeurologicalAssessment.jsx, same pass),
    // rather than reworking page1/page2's dense, precisely laid-out ortho
    // content to make room -- page count in every footer adjusts.
    // +1 for the Treatment Plan page merged onto the end of this same
    // document (2026-09-29, Aditi: the standalone "Treatment Plan" report
    // and the Home-screen entry point that only offered these two reports
    // as separate choices are both gone -- one "Generate PDF" button, from
    // inside the assessment itself, now produces the whole thing).
    // Skip the Objective Findings page entirely when there is nothing to show
    // (it used to print as a near-empty page holding one grey line).
    const objStepIds = ["observation","palpation","rom","mmt","jointMobility","specialTests","neuroScreen","limbLength","kineticChain","cpa","sttt","fma","fascia","clinicalAssessment"];
    const orthoObjHtml = orthoWizardData ? objStepIds.map(orthoStepCard).join("") : "";
    const hasObjective = orthoWizardData ? !!orthoObjHtml : objSections.length > 0;
    const totalPages = 1 + (hasObjective ? 1 : 0) + (d.cardio ? 1 : 0) + (d.neuro ? 1 : 0) + 1;
    const specialtyStart = hasObjective ? 3 : 2;
    const pgFooter = (n, total) => `
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;color:#94a3b8;">PhysioMind · CONFIDENTIAL · Patient: ${escHtml(patName)}</span>
        <span style="font-size:8px;color:#94a3b8;">${today} · Page ${n} of ${total}</span>
      </div>`;

    // ── PAGE 1: DEMOGRAPHICS + SUBJECTIVE ────────────────────────────────
    const page1 = `<div class="page">
      ${pdfHeader("Physiotherapy Assessment Report", "Initial Clinical Evaluation", "#1e3a5f")}
      ${breadcrumbHtml}
      <div class="body">

        ${sec("👤","Demographics","#334155", `
          ${row("Patient name", patName !== "Patient" ? escHtml(patName) : "")}
          ${row("Age / Sex", [age, sex].filter((x) => x && x !== "--").map((x, i) => (i === 0 ? escHtml(String(x)) + " yrs" : x)).join(" · "))}
          ${row("Date of birth", dob)}
          ${row("Phone", v("dem_phone"))}
          ${row("Email", v("dem_email"))}
          ${row("Address", v("dem_address"))}
          ${row("Occupation", orthoWizardData?.demographics?.occupation ? escHtml(orthoWizardData.demographics.occupation) : occ)}
          ${row("Referring GP", orthoWizardData?.demographics?.gp ? escHtml(orthoWizardData.demographics.gp) : gp)}
          ${row("Session type", "Initial assessment")}
        `)}

        ${orthoWizardData ? `
          ${orthoStepCard("subjective")}
          ${orthoStepCard("redFlags")}
          ${orthoStepCard("pain")}
        ` : `
          ${/* Chief complaint/Red flags/History/Goals used to show here --
              this generic Ortho-intake-shaped fallback's own fields (cc_/
              rf_/pmh_ etc). Removed for every patient, not just Neuro/
              Cardio (2026-10-02, Aditi: "remove this chief red flags goals
              history... totally remove", then "remove for ortho also"):
              "Red & yellow flags" asserted a false "No red flags
              identified" whenever nothing had actually been screened, and
              for a Neuro/Cardio patient these duplicated that module's own
              real Subjective/Safety sections a few pages later ("Subjective
              bhi repeat ho raha hai"). Pain scores stays -- it isn't
              hardcoded/duplicated the same way. */ ""}

          ${sec("📊","Pain scores (NRS /10)","#991b1b", `
            ${row("Current", vasNow ? vasNow + "/10" : "")}
            ${row("Worst", vasWorst ? vasWorst + "/10" : "")}
            ${row("Best", vasBest ? vasBest + "/10" : "")}
          `)}

          ${(aggAll.length > 0 || relAll.length > 0) ? sec("⬆️","Aggravating & easing factors","#78350f", `
            ${row("Aggravating", escHtml(aggAll.join(", ")))}
            ${row("Easing", escHtml(relAll.join(", ")))}
          `) : ""}

          ${ccNotes && ccNotes !== "--" ? sec("📝","Clinician notes — subjective","#334155", textRow(ccNotes)) : ""}
        `}

      </div>
      ${pgFooter(1, totalPages)}
    </div>`;

    // ── PAGE 2: OBJECTIVE FINDINGS ────────────────────────────────────────
    const page2 = !hasObjective ? "" : `<div class="page">
      ${pdfHeader("Objective Findings", "Assessment & Advanced Assessment", "#0f6e56", true)}
      ${breadcrumbHtml}
      <div class="body">

        ${orthoWizardData ? orthoObjHtml : (objSections.map(s => sec(
          objIcon(s.title), escHtml(s.title), null, renderObjBody(s.body)
        )).join(""))}

      </div>
      ${pgFooter(2, totalPages)}
    </div>`;

    // ── PAGES 3/4: CARDIOPULMONARY / NEUROLOGICAL (only when recorded) ──
    // Generic key/value dump per section rather than per-field knowledge of
    // either file's own ~13-18 steps -- each owns its own field labels/
    // shape; this just needs to show whatever's there without duplicating
    // (and risking drifting from) that internal model. `specialtyValueText`
    // handles object-valued fields too (e.g. NeurologicalAssessment.jsx's
    // LRGrid tables for MMT/DTR/sensory are {"Right__Left": "3"}-shaped
    // objects, not strings) -- Array.isArray-only handling would have
    // rendered those as "[object Object]".
    const specialtyLabel = (k) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    const specialtyValueText = (val) => {
      if (val == null || val === "") return "";
      if (Array.isArray(val)) return val.join(", ");
      if (typeof val === "object") return Object.entries(val).filter(([,v]) => v).map(([k,v]) => `${k.replace("__", " ")}: ${v}`).join(" · ");
      return String(val);
    };
    const specialtyPage = (pageNum, dataObj, title, subtitle, icon, color) => dataObj ? `<div class="page">
      ${pdfHeader(title, subtitle, color, true)}
      ${breadcrumbHtml}
      <div class="body">
        ${Object.entries(dataObj).map(([sectionId, fields]) => {
          // "meta" is NeurologicalAssessment.jsx's/CardiopulmonaryAssessment.jsx's
          // own internal bookkeeping (setting/stepOrder/customStepsMeta/
          // selectedRegions -- which steps were picked and in what order),
          // not a clinical section. Printing it dumped raw internal state
          // (including "[object Object]" for customStepsMeta) straight into
          // the PDF (2026-10-02, Aditi: "why this section showing... remove
          // these things").
          if (sectionId === "meta") return "";
          if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) return "";
          const rows = Object.entries(fields).map(([k, val]) => row(specialtyLabel(k), escHtml(specialtyValueText(val)))).join("");
          if (!rows) return "";
          return sec(icon, specialtyLabel(sectionId), null, rows);
        }).join("") || `<div style="padding:14px;text-align:center;color:#94a3b8;font-size:10px;">No findings recorded yet.</div>`}
      </div>
      ${pgFooter(pageNum, totalPages)}
    </div>` : "";
    const page3 = specialtyPage(specialtyStart, d.cardio, "Cardiopulmonary Assessment", "Cardiovascular & Respiratory Findings", "🫀", "#dc2626");
    const page4 = specialtyPage(d.cardio ? specialtyStart + 1 : specialtyStart, d.neuro, "Neurological Assessment", "Full Neurological Examination Findings", "🧠", "#7c3aed");
    const closingHtml = `
        ${(dxMain && dxMain !== "--") || dxList.length > 0 ? sec("🩺","Clinical diagnosis","#1e3a5f", `
          ${dxList.length > 0 ? dxList.slice(0,4).map((dx2, i) => row(`Diagnosis ${i+1}`, `${escHtml(dx2.diagnosis||"")}${dx2.icd10?" · "+escHtml(dx2.icd10):""}${dx2.confidence?" · "+Math.round(dx2.confidence)+"%":""}`)).join("") : ""}
          ${dxMain && dxMain !== "--" ? textRow(dxMain) : ""}
          ${dxIcd  && dxIcd  !== "--" ? row("ICD-10", dxIcd) : ""}
          ${dxAssess && dxAssess !== "--" ? textRow(dxAssess) : ""}
        `) : ""}

        <div class="pdf-sign">
          <div><div class="pdf-sign-label">Physiotherapist signature:</div><div class="pdf-sign-line"></div><div class="pdf-sign-note">Name · Registration no. · Date</div></div>
          <div><div class="pdf-sign-label">Next review / follow-up:</div><div class="pdf-sign-line"></div><div class="pdf-sign-note">Date · Treating clinician · Location</div></div>
        </div>
    `;
    const page5 = buildTreatmentPageHtml(`Page ${totalPages} of ${totalPages} &middot; ${today}`, closingHtml, true);

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Assessment &amp; Treatment Report — ${escHtml(patName)}</title>
      <style>${css}</style>
    </head><body>${page1}${page2}${page3}${page4}${page5}</body></html>`;
  };

  // Treatment Plan content, as one page appended onto the end of the
  // combined Assessment & Treatment PDF above -- this used to be its own
  // separate "Treatment Plan" report with its own Generate PDF button
  // (2026-09-29, Aditi: "remove ... treatment ... make it one"). `pageLabel`
  // lets the caller give this page its real position when it's merged in
  // (buildAssessmentPdf's pgFooter-style "Page N of Total") instead of the
  // hardcoded "Page 1" pdfFooter() falls back to for a standalone doc.
  const buildTreatmentPageHtml = (pageLabel, closingHtml = "", compactHeader = false) => {
    const exercises = gatherExercises();
    const techniques = gatherTechniques();
    const sessions = Array.isArray(d.tx_sessions) ? [...d.tx_sessions] : [];
    const groupedExercises = exercises.reduce((acc, ex) => { const p = ex.phase || "Phase 1"; if(!acc[p]) acc[p]=[]; acc[p].push(ex); return acc; }, {});

    const vasBaseline = sessions.length>0 ? (parseFloat(sessions[sessions.length-1].vasStart)||0) : (parseFloat(d.pa_vas_now||d.cc_vas_now)||0);
    const vasNow      = sessions.length>0 ? (parseFloat(sessions[0].vasEnd||sessions[0].vasStart)||0) : vasBaseline;
    const psfsNow     = d.om_psfs1_now||d.psfs_score||"";
    const vasDiff     = vasBaseline - vasNow;
    const vasPct      = vasBaseline>0 ? Math.round((vasDiff/vasBaseline)*100) : 0;
    const sessionRows = sessions.length>0
      ? sessions.slice().reverse().map((s,i)=>{
          const vs=parseFloat(s.vasStart||"0")||0, ve=parseFloat(s.vasEnd||s.vasStart||"0")||0;
          const vc=vs-ve, vCol=vc>0?"#059669":vc<0?"#dc2626":"#94a3b8";
          const arrow=vc>0?"&#9660;":vc<0?"&#9650;":"&harr;";
          const tx=String(s.treatmentGiven||s.treatment||""); const txShort=tx.slice(0,65)+(tx.length>65?"…":"");
          const resp=String(s.response||""); const respShort=resp.slice(0,60)+(resp.length>60?"…":"");
          return `<tr>
            <td>S${escHtml(String(s.sessionNo||i+1))}</td>
            <td>${escHtml(s.date||"")}</td>
            <td style="white-space:nowrap;">${vs}/10 <span style="color:${vCol};">${arrow}</span> ${ve}/10</td>
            <td>${escHtml(txShort)}</td>
            <td>${escHtml(respShort)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No sessions logged yet — use Sessions to record each treatment session.</td></tr>`;

    return `<div class="page">
${pdfHeader("Physiotherapy Treatment Plan","Evidence-Based Clinical Management Program","#059669", compactHeader)}
${breadcrumbHtml}
<div class="body">
  ${card("👤","Patient details & plan", `
    ${row("Occupation", orthoWizardData?.demographics?.occupation ? escHtml(orthoWizardData.demographics.occupation) : occ)}
    ${row("Pain (VAS now)", (d.pa_vas_now||d.cc_vas_now) ? escHtml(d.pa_vas_now||d.cc_vas_now) + "/10" : "")}
    ${row("Treatment frequency", escHtml(d.tx_frequency||d.soap_frequency||""))}
    ${row("Expected duration", escHtml(d.tx_duration_plan||d.tx_plan_duration||""))}
    ${row("Sessions planned", escHtml(String(d.tx_plan_sessions||d.plan_sessions||"")))}
    ${row("Sessions done", String(sessions.length))}
  `)}
  ${(() => {
    const tiers = [
      ["Short-term (2–4 wks)", [d.ar_goal_pain, d.ar_goal_function].filter(Boolean)],
      ["Medium-term (4–8 wks)", [d.ar_goal_str, d.ar_goal_func].filter(Boolean)],
      ["Long-term (8–12 wks)", [d.ar_goal_return].filter(Boolean)],
    ];
    const hasAny = tiers.some(([,goals]) => goals.length > 0);
    return orthoStepCard("carePlanGoals") || card("🎯","Care plan goals", hasAny
      ? tiers.filter(([,goals])=>goals.length>0).map(([label,goals])=>`
        <div class="pdf-group-heading">${label}</div>
        ${goals.map(g=>textRow(escHtml(String(g)))).join("")}
      `).join("")
      : `<div style="color:#94a3b8;">No care plan goals recorded yet.</div>`
    );
  })()}
  ${card("🖐️","Manual therapy & treatment techniques", techniques.length > 0 ? `
    <table><thead><tr><th>Technique</th><th>Target area</th><th>Duration / dosage</th></tr></thead><tbody>
    ${techniques.map(t=>`<tr><td>${escHtml(t.name)}</td><td>${escHtml(t.area)}</td><td>${escHtml(t.duration)}</td></tr>`).join("")}
    </tbody></table>
  ` : `<div style="color:#94a3b8;">No manual therapy techniques logged yet.</div>`)}
  ${Object.keys(groupedExercises).length > 0 ? Object.entries(groupedExercises).map(([phase,exs])=>card("🏋️", `Exercise prescription — ${escHtml(phase)}`, exs.map(ex => `
    <div class="pdf-group-heading">${escHtml(ex.name)}</div>
    ${row("Dosage", [ex.sets&&ex.reps?`${escHtml(String(ex.sets))} sets &times; ${escHtml(String(ex.reps))} reps`:(ex.sets?`${escHtml(String(ex.sets))} sets`:(ex.reps?`${escHtml(String(ex.reps))} reps`:"")), ex.hold?"hold "+escHtml(String(ex.hold)):"", ex.freq?escHtml(String(ex.freq)):""].filter(Boolean).join(" · "))}
    ${ex.target ? row("Target", escHtml(ex.target)) : ""}
    ${ex.notes ? row("Notes", escHtml(ex.notes)) : ""}
    ${ex.progression ? row("Progression", escHtml(ex.progression)) : ""}
  `).join(""))).join("") : card("🏋️","Exercise prescription", `<div style="color:#94a3b8;">Not yet prescribed — add exercises in the Exercise Prescription tab.</div>`)}
  ${card("📈","Outcome measures & session log", `
    ${row("VAS pain", vasBaseline?`${vasBaseline}/10`:"")}
    ${row("VAS worst", d.pa_vas_worst?escHtml(d.pa_vas_worst)+"/10":"")}
    ${row("PSFS score", psfsNow?`${escHtml(String(psfsNow))}/10`:"")}
    ${row("Patient goal", escHtml(d.ar_goal_function||d.ar_goal_pain||""))}
    ${row("Sessions completed", String(sessions.length))}
    ${row("Pain change", sessions.length&&vasBaseline?(vasDiff>=0?"-":"+")+Math.abs(vasPct)+"%":"")}
    <div class="pdf-group-heading">Session history</div>
    <table><thead><tr><th>Sess.</th><th>Date</th><th>Pain (start&rarr;end)</th><th>Treatment given</th><th>Response</th></tr></thead>
    <tbody>${sessionRows}</tbody></table>
  `)}
  ${closingHtml || `<div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 4px;"><div><div style="font-size:9.5px;color:#64748b;margin-bottom:18px;">Therapist signature:</div><div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div><div style="font-size:9.5px;color:#64748b;">Name · Registration no. · Date</div></div><div><div style="font-size:9.5px;color:#64748b;margin-bottom:18px;">Review date:</div><div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div><div style="font-size:9.5px;color:#64748b;">Date</div></div></div>`}
</div>
${pdfFooter("Assessment & Treatment Report", pageLabel)}
</div>`;
  };

  const buildHomeExercisePdf = () => {
    const exercises = gatherExercises();
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Your Condition");
    const nextAppt = d.next_appointment || "_______________________";
    const physioName = d.therapist_name || "Your Physiotherapist";
    const clinicName = d.clinic_name || "PhysioMind Clinic";
    const clinicPhone = d.clinic_phone || "";
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Program - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:24px 36px;}.ex-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid;box-shadow:0 2px 8px rgba(0,0,0,0.05);}.ex-body{display:grid;grid-template-columns:1fr;}.ex-content{padding:14px 16px;}.dosage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(75px,1fr));gap:8px;margin-bottom:10px;}.dosage-chip{text-align:center;padding:7px 6px;border-radius:8px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Home Exercise Program","Your Personalised Daily Rehabilitation Protocol","#7c3aed")}
<div class="body">
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:16px;align-items:flex-start;">
    <div style="font-size:28px;flex-shrink:0;">&#127968;</div>
    <div><div style="font-size:14px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">Hello, ${escHtml(patName.split(" ")[0]||patName)}!</div><div style="font-size:10.5px;color:#6b7280;line-height:1.6;">This personalised home exercise program has been designed specifically for you by <strong style="color:#1a3a5c;">${escHtml(physioName)}</strong> to help manage <strong style="color:#7c3aed;">${dxLabel}</strong>. Performing these exercises consistently is essential for your recovery.</div><div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">${[["&#128197;","Program Start",today],["&#128222;","Next Appointment",escHtml(nextAppt)],["&#127973;","Clinic",escHtml(clinicName)]].map(([icon,l,v])=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><span>${icon}</span><div><div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</div></div></div>`).join("")}</div></div>
  </div>
  <div style="margin-bottom:14px;font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #7c3aed;padding-bottom:8px;">Your Exercises &mdash; ${exercises.length} Total</div>
  ${exercises.length === 0 ? `<div style="color:#94a3b8;font-size:11px;padding:12px 0;">No exercises prescribed yet.</div>` : ""}
  ${exercises.map((ex,i)=>{
    const phaseColors2={"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const pColor=phaseColors2[ex.phase]||"#7c3aed";
    const steps=ex.notes?[ex.notes]:[];
    return `<div class="ex-card">
      <div style="background:linear-gradient(135deg,${pColor}15,${pColor}05);border-bottom:1px solid ${pColor}30;padding:12px 16px;display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#1a3a5c;">${escHtml(ex.name)}</div><div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;"><span style="display:inline-block;padding:3px 8px;background:${pColor}15;border:1px solid ${pColor}40;border-radius:5px;font-size:9px;font-weight:700;color:${pColor};">${escHtml(ex.phase||"Phase 1")}</span>${ex.target?`<span style="display:inline-block;padding:3px 8px;background:#0891b215;border:1px solid #0891b240;border-radius:5px;font-size:9px;font-weight:700;color:#0891b2;">${escHtml(ex.target)}</span>`:""}</div></div>
        ${ex.freq?`<div style="text-align:right;"><div style="font-size:9px;color:#6b7280;">Frequency</div><div style="font-size:12px;font-weight:800;color:${pColor};">${escHtml(ex.freq)}</div></div>`:""}
      </div>
      <div class="ex-body">
        <div class="ex-content">
          <div class="dosage-grid">${[["Sets",ex.sets,pColor],["Reps",ex.reps,"#2563eb"],["Hold",ex.hold,"#0891b2"],["Rest",ex.rest,"#6b7280"]].filter(c=>c&&c[1]).map(([l,v,c])=>`<div class="dosage-chip" style="background:${c}10;border:1px solid ${c}30;"><div style="font-size:7.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${l}</div><div style="font-size:14px;font-weight:800;color:${c};line-height:1.2;">${escHtml(v)}</div></div>`).join("")}</div>
          <div style="margin-bottom:8px;">${steps.length?`<div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Instructions</div>`:""}${steps.map((step,si)=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e2e8f0;align-items:flex-start;font-size:10px;line-height:1.5;"><div style="width:20px;height:20px;min-width:20px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;">${si+1}</div><span style="color:#1a3a5c;">${escHtml(step)}</span></div>`).join("")}</div>
          ${ex.progression?`<div style="margin-top:6px;padding:6px 10px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:6px;font-size:8.5px;"><strong style="color:#059669;">&#11014; When easier, progress to:</strong> ${escHtml(ex.progression)}</div>`:""}
        </div>
      </div>
    </div>`;
  }).join("")}
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;"><div><div style="font-size:12px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">${escHtml(clinicName)}</div>${clinicPhone?`<div style="font-size:11px;font-weight:600;color:#2563eb;margin-top:4px;">&#128222; ${escHtml(clinicPhone)}</div>`:""}</div><div style="border-left:1px solid rgba(124,58,237,0.2);padding-left:16px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Next Appointment</div><div style="font-size:14px;font-weight:800;color:#7c3aed;">${escHtml(nextAppt)}</div><div style="font-size:9px;color:#6b7280;margin-top:4px;">Bring this program to your session</div></div></div>
</div>
${pdfFooter("Home Exercise Program &mdash; Patient Copy")}
</div></body></html>`;
  };

  const buildPostureReportPdf = () => {
    const postScore = d.posture_score || d.post_score || "N/A";
    const postBand  = d.posture_band  || d.post_band  || "N/A";
    const cva       = d.post_cva      || d.cva_angle  || "N/A";
    const fhp       = d.post_fhp_dist || d.fhp_dist   || "N/A";
    const shAngle   = d.post_shoulder_angle || d.shoulder_angle || "N/A";
    const kyph      = d.post_kyphosis_angle || d.kyphosis_angle || "N/A";
    const lord      = d.post_lordosis_angle || d.lordosis_angle || "N/A";
    const pelv      = d.post_pelvic_tilt    || d.pelvic_tilt    || "N/A";
    const reliability = d.posture_reliability || "N/A";
    const view      = d.posture_view || "Anterior";
    const DEFECT_LABELS = {
      forward_head:"Forward Head Posture (CVA reduced)",rounded_shoulders:"Rounded/Protracted Shoulders",
      thoracic_kyphosis:"Increased Thoracic Kyphosis",lumbar_hyperlordosis:"Lumbar Hyperlordosis",
      anterior_pelvic_tilt:"Anterior Pelvic Tilt",posterior_pelvic_tilt:"Posterior Pelvic Tilt",
      lateral_pelvic_tilt:"Lateral Pelvic Tilt",genu_valgum:"Knee Medial Tendency (clinical assessment required)",
      genu_varum:"Knee Lateral Tendency (clinical assessment required)",foot_pronation:"Foot Overpronation / Flat Arch",
      foot_supination:"Foot Supination / High Arch",scoliosis:"Lateral Spinal Curvature Tendency (clinical assessment required)",
      head_tilt:"Lateral Head Tilt",scapular_winging:"Scapular Winging",
    };
    const DEFECT_MUSCLES = {
      forward_head:{tight:["Upper trapezius","SCM","Suboccipitals"],weak:["Deep neck flexors","Lower trapezius"]},
      rounded_shoulders:{tight:["Pec major","Pec minor","Subscapularis"],weak:["Lower trapezius","Rhomboids"]},
      thoracic_kyphosis:{tight:["Pec major/minor","Ant intercostals"],weak:["Thoracic extensors","Lower trap"]},
      lumbar_hyperlordosis:{tight:["Iliopsoas","QL","Lumbar erectors"],weak:["Gluteus maximus","TA"]},
      anterior_pelvic_tilt:{tight:["Iliopsoas","Rectus femoris","TFL"],weak:["Gluteus maximus","Hamstrings"]},
      posterior_pelvic_tilt:{tight:["Hamstrings","Gluteus max","Rect abdominis"],weak:["Hip flexors","Lumb ext"]},
      lateral_pelvic_tilt:{tight:["Ipsilateral QL","Ipsilateral TFL"],weak:["Contralateral glut med"]},
      genu_valgum:{tight:["TFL","IT band","Hip adductors"],weak:["Glut med","VMO","Hip ext rotators"]},
      genu_varum:{tight:["IT band","Biceps femoris"],weak:["Hip adductors","VMO"]},
      foot_pronation:{tight:["Gastrocnemius","Soleus","Peroneals"],weak:["Tib posterior","Intrinsic foot"]},
      foot_supination:{tight:["IT band","Plantar fascia"],weak:["Peroneals","Intrinsic foot muscles"]},
      scoliosis:{tight:["Ipsilateral paraspinals","Ipsilateral QL"],weak:["Contralateral paraspinals"]},
      head_tilt:{tight:["Ipsilat upper trap","SCM","Levator scap"],weak:["Contralat lateral neck flexors"]},
      scapular_winging:{tight:["Pec minor","Ant shoulder"],weak:["Serratus anterior","Lower trapezius"]},
    };
    const DEFECT_RX = {
      forward_head:"Chin tucks x15 daily - DNF activation - Pec minor stretch",
      rounded_shoulders:"Band pull-apart x20 - Face pulls x15 - Pec doorway stretch",
      thoracic_kyphosis:"Foam roller extension T4-T8 - T-spine rotation - Prone Y-T-W",
      lumbar_hyperlordosis:"Hip flexor couch stretch - Glute bridges 3x15 - Dead bug",
      anterior_pelvic_tilt:"Pelvic tilts - Couch stretch - Glute activation",
      posterior_pelvic_tilt:"Hip flexor stretching - Lumbar extension - Cat-cow",
      lateral_pelvic_tilt:"Side-lying hip abduction - Clamshells - QL stretch",
      genu_valgum:"Clamshells - Monster walks - Single-leg squat with knee tracking",
      genu_varum:"IT band foam rolling - Hip adductor strengthening",
      foot_pronation:"Short foot exercise - Calf raises - Tib posterior strengthening",
      foot_supination:"Peroneal strengthening - Single-leg balance - Lateral band walks",
      scoliosis:"Schroth breathing - Concave-side stretch - Convex-side strengthening",
      head_tilt:"Contralat cervical lat flexion stretch - Upper trap SMR",
      scapular_winging:"Serratus ant wall push-ups - Lower trap Y-T-W",
    };
    const selectedDefects = Object.keys(DEFECT_LABELS).filter(function(id) { return d["posture_defect_" + id]; });
    const dxLabel = escHtml((dx && dx.dx && dx.dx[0] && dx.dx[0].label) ? dx.dx[0].label : (d.cc_main || "Postural Dysfunction"));
    const scoreNum = parseFloat(postScore) || 0;
    const scoreColor = scoreNum >= 75 ? "#059669" : scoreNum >= 50 ? "#d97706" : "#dc2626";
    const photoImg = d.posture_photo_url || d.posture_captured_img || "";

    // Pre-build all HTML sections as plain strings -- no nested template literals
    var patientCells = [
      ["Patient", escHtml(patName)],
      ["DOB / Age", escHtml(dob) + " / " + escHtml(String(age))],
      ["Occupation", escHtml(occ)],
      ["Report Date", today],
      ["Referring GP", escHtml(gp)],
      ["Insurer", escHtml(insurer)],
      ["Method", "AI Landmark Detection"],
      ["View", escHtml(view)],
    ].map(function(p) {
      return '<div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">' + p[0] + '</div>'
           + '<div style="font-size:10px;font-weight:600;color:#1a3a5c;">' + p[1] + '</div></div>';
    }).join("");

    var circ50 = 2 * Math.PI * 50;
    var dash = (scoreNum / 100) * circ50;
    var scoreRing = '<svg viewBox="0 0 120 120" width="110" height="110" style="display:block;margin:0 auto 8px;">'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="10"/>'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="' + scoreColor + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ50 + '" stroke-linecap="round" transform="rotate(-90 60 60)"/>'
      + '<text x="60" y="54" text-anchor="middle" fill="' + scoreColor + '" font-size="22" font-weight="800">' + (scoreNum || "N/A") + '</text>'
      + '<text x="60" y="68" text-anchor="middle" fill="#94a3b8" font-size="9">/100</text>'
      + '<text x="60" y="82" text-anchor="middle" fill="' + scoreColor + '" font-size="8" font-weight="700">' + escHtml(postBand) + '</text>'
      + '</svg>';

    var scoreLegend = [["75-100","Excellent","#059669"],["50-74","Moderate","#d97706"],["25-49","Poor","#dc2626"],["0-24","Critical","#7f1d1d"]]
      .map(function(r) {
        return '<div style="background:' + r[2] + '12;border-radius:5px;padding:4px 6px;border:1px solid ' + r[2] + '30;">'
             + '<div style="font-size:8px;font-weight:700;color:' + r[2] + ';">' + r[1] + '</div>'
             + '<div style="font-size:7px;color:#94a3b8;">' + r[0] + '</div></div>';
      }).join("");

    var measData = [
      // Normal values per Yip 2008 (CVA), Magee 6th ed. (kyphosis, lordosis, shoulder), Lee & Nussbaum (head tilt)
      {label:"CVA (Yip 2008 norm >55°)",value:cva,  normal:"&gt;55&deg;",bad:parseFloat(cva)<49,        warn:parseFloat(cva)<55,          bc:"#dc2626"},
      {label:"Forward Head Posture",  value:fhp,     normal:"&lt;20mm",   bad:parseFloat(fhp)>30,        warn:parseFloat(fhp)>20,          bc:"#dc2626"},
      {label:"Shoulder Asymmetry",    value:shAngle, normal:"&lt;2.5&deg;",bad:parseFloat(shAngle)>5,   warn:parseFloat(shAngle)>2.5,     bc:"#d97706"},
      {label:"Thoracic Kyphosis Est.",value:kyph,    normal:"20–45&deg;", bad:parseFloat(kyph)>50,      warn:parseFloat(kyph)>45,         bc:"#d97706"},
      {label:"Lumbar Lordosis Est.",  value:lord,    normal:"40–60&deg;", bad:parseFloat(lord)>65||parseFloat(lord)<30, warn:false,       bc:"#d97706"},
      {label:"Pelvic Tilt (proxy)",   value:pelv,    normal:"0–5&deg;",   bad:false,                     warn:false,                       bc:"#6b7280"},
    ];
    var measCards = measData.map(function(m) {
      var c = (m.bad && m.value !== "N/A") ? m.bc : (m.warn && m.value !== "N/A") ? "#d97706" : (m.value === "N/A" ? "#94a3b8" : "#059669");
      var status = m.value === "N/A" ? "N/A" : m.bad ? "Outside Normal" : m.warn ? "Borderline" : "Normal";
      return '<div style="background:' + c + '08;border:1px solid ' + c + '25;border-radius:8px;padding:9px 11px;border-left:3px solid ' + c + ';">'
           + '<div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">' + m.label + '</div>'
           + '<div style="font-size:18px;font-weight:800;color:' + c + ';line-height:1;">' + escHtml(String(m.value)) + '</div>'
           + '<div style="display:flex;justify-content:space-between;margin-top:3px;">'
           + '<span style="font-size:7.5px;color:#94a3b8;">Norm: ' + m.normal + '</span>'
           + '<span style="font-size:7.5px;font-weight:700;color:' + c + ';">' + status + '</span>'
           + '</div></div>';
    }).join("");

    var defectRows = selectedDefects.map(function(id, i) {
      var label = DEFECT_LABELS[id] || id;
      var sev = d["posture_defect_" + id + "_severity"] || "mild";
      var sc = sev === "severe" ? "#dc2626" : sev === "moderate" ? "#d97706" : "#059669";
      var muscles = DEFECT_MUSCLES[id];
      var tight = muscles ? muscles.tight.slice(0,2).join(", ") : "N/A";
      var rx = DEFECT_RX[id] || "Clinical assessment required";
      return '<tr style="background:' + (i%2===0?"#fff":"#f8fafc") + ';">'
           + '<td style="font-size:9.5px;font-weight:700;color:#1a3a5c;">' + escHtml(label) + '</td>'
           + '<td><span style="padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;background:' + sc + '15;color:' + sc + ';">' + sev.charAt(0).toUpperCase() + sev.slice(1) + '</span></td>'
           + '<td style="font-size:8.5px;color:#6b7280;">' + escHtml(tight) + '</td>'
           + '<td style="font-size:8.5px;color:#1a3a5c;">' + rx + '</td></tr>';
    }).join("");

    var defectSection = selectedDefects.length > 0
      ? sectionCard("Regional Postural Findings", "&#128450;",
          '<table><thead><tr><th>Region / Defect</th><th>Severity</th><th>Tight Structures</th><th>Clinical Action</th></tr></thead>'
          + '<tbody>' + defectRows + '</tbody></table>', "#64748b")
      : sectionCard("Regional Postural Findings", "&#128450;",
          '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:10px;">No postural defects recorded. Use the Posture Defect Assessment module to document findings.</div>',
          "#64748b");

    var hasUCS = selectedDefects.some(function(id) { return id==="forward_head"||id==="rounded_shoulders"||id==="thoracic_kyphosis"; });
    var hasLCS = selectedDefects.some(function(id) { return id==="anterior_pelvic_tilt"||id==="lumbar_hyperlordosis"; });
    var regionSet = {};
    selectedDefects.forEach(function(id) {
      regionSet[(id.indexOf("foot")>=0||id.indexOf("genu")>=0)?"Lower Limb":(id.indexOf("thoracic")>=0||id.indexOf("shoulder")>=0||id.indexOf("scapular")>=0)?"Thoracic":"Spinal/Pelvic"] = 1;
    });
    var regions = Object.keys(regionSet).join(", ") || "N/A";
    var scoreMsg = scoreNum < 50 ? "Priority intervention required." : scoreNum < 75 ? "Moderate dysfunction -- structured correction indicated." : "Good alignment -- maintenance program recommended.";

    var bioCards = [
      {title:"Upper Crossed Pattern Tendency", active:hasUCS, text:"Possible overactivity: upper trapezius/pectorals. Possible underactivity: deep neck flexors. May contribute to forward head and shoulder protraction tendency. Clinical muscle testing required to confirm.", color:"#dc2626"},
      {title:"Lower Crossed Pattern Tendency", active:hasLCS, text:"Possible overactivity: hip flexors/lumbar extensors. Possible underactivity: glutes/TA. May contribute to anterior pelvic tilt tendency. Clinical assessment required to confirm.", color:"#d97706"},
      {title:"Kinetic Chain Impact",   active:true,   text:"Compensatory load across the kinetic chain. " + selectedDefects.length + " defect(s) identified across " + regions + " regions.", color:"#0891b2"},
      {title:"Postural Load Index",    active:true,   text:"AI Posture Score: " + scoreNum + "/100 (" + escHtml(postBand) + "). " + scoreMsg, color:scoreColor},
    ].map(function(item) {
      return '<div style="background:' + item.color + '06;border:1px solid ' + item.color + '20;border-radius:8px;padding:10px 12px;' + (!item.active?"opacity:0.45;":"") + '">'
           + '<div style="font-size:9px;font-weight:700;color:' + item.color + ';margin-bottom:4px;">' + item.title + '</div>'
           + '<div style="font-size:9px;color:#6b7280;line-height:1.6;">' + item.text + '</div></div>';
    }).join("");

    var bioSection = selectedDefects.length > 0
      ? sectionCard("Biomechanical Correlation","&#129518;",
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + bioCards + '</div>', "#7c3aed")
      : "";

    var methodRows = [
      ["AI Engine","MediaPipe BlazePose"],
      ["View", escHtml(view)],
      ["Reliability", escHtml(reliability)],
      ["Landmarks","33 body landmarks"],
      ["Calibration", d.posture_calibration || "Auto"],
      ["Platform","PhysioMind AI"],
    ].map(function(r) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;">'
           + '<span style="font-size:8.5px;color:#94a3b8;">' + r[0] + '</span>'
           + '<span style="font-size:8.5px;font-weight:600;color:#1a3a5c;">' + r[1] + '</span></div>';
    }).join("");

    var photoBlock = photoImg
      ? '<img src="' + photoImg + '" style="width:100%;border-radius:8px;margin-bottom:6px;object-fit:cover;max-height:220px;" alt="Postural photo"/>'
      : '<div style="background:#f1f5f9;border-radius:8px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #cbd5e1;margin-bottom:8px;">'
        + '<div style="font-size:9px;font-weight:700;color:#6b7280;margin-bottom:3px;">AI-Analysed Photo</div>'
        + '<div style="font-size:8px;color:#94a3b8;">with Landmark Overlay</div></div>';

    var sigRow = [["Treating Physiotherapist",""],["Signature",""],["Date / Stamp", today]].map(function(p) {
      return '<div>'
           + '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">' + p[0] + '</div>'
           + '<div style="height:30px;border-bottom:1.5px solid #334155;margin-bottom:3px;display:flex;align-items:flex-end;">'
           + '<span style="font-size:10px;font-weight:600;color:#1e293b;">' + escHtml(p[1]) + '</span></div></div>';
    }).join("");

    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Posture Analysis Report - PhysioMind</title>"
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:7px 9px;text-align:left;}td{padding:6px 9px;font-size:10px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>"
      + "</head><body><div class=\"page\">"
      + pdfHeader("Posture Screening Report","AI-Assisted Posture Screening &middot; Education only, not a medical diagnosis &middot; PhysioMind","#0a1628")
      + "<div class=\"body\">"
      + "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;padding:13px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;\">" + patientCells + "</div>"
      + "<div style=\"background:linear-gradient(135deg,#0a1628,#1a3358);border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:14px;align-items:center;border:1px solid #1a3358;\">"
      + "<div style=\"flex:1;\">"
      + "<div style=\"font-size:9px;color:#e8c96e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;\">Clinical Diagnosis</div>"
      + "<div style=\"font-size:14px;font-weight:800;color:#fff;\">" + dxLabel + "</div>"
      + "<div style=\"font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:2px;\">MediaPipe BlazePose AI &middot; 33 landmarks &middot; " + escHtml(view) + " view</div>"
      + "</div><div style=\"flex-shrink:0;text-align:center;\">" + scoreRing + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 230px;gap:18px;align-items:start;\">"
      + "<div>"
      + sectionCard("Quantitative Postural Measurements","&#128207;",
          "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:12px;\">" + measCards + "</div>"
          + "<div style=\"padding:8px 11px;background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.15);border-radius:7px;font-size:8.5px;color:#1a3a5c;\">"
          + "<strong style=\"color:#2563eb;\">AI Reliability:</strong> " + escHtml(reliability)
          + " &nbsp;&middot;&nbsp; <strong>View:</strong> " + escHtml(view)
          + " &nbsp;&middot;&nbsp; <strong>Calibration:</strong> " + (d.posture_calibration || "Auto") + "</div>",
          "#0891b2")
      + defectSection
      + bioSection
      + "</div>"
      + "<div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;\">Overall Posture Score</div>"
      + scoreRing
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:5px;\">" + scoreLegend + "</div></div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;\">Postural Photo</div>"
      + photoBlock
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;margin-top:3px;\">Assessment Method</div>"
      + methodRows + "</div>"
      + "<div style=\"background:#fef3c7;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:9px 11px;\">"
      + "<div style=\"font-size:8px;font-weight:700;color:#92400e;margin-bottom:3px;\">Clinical Disclaimer</div>"
      + "<div style=\"font-size:8px;color:#92400e;line-height:1.6;\">AI-assisted assessment is a clinical decision support tool. All measurements require clinical correlation and must be interpreted by a qualified physiotherapist.</div></div>"
      + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;\">" + sigRow + "</div>"
      + "</div>"
      + pdfFooter("Postural Analysis Report &mdash; PhysioMind AI Platform")
      + "</div></body></html>";
  };

  const openPdf = (htmlContent) => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF generation"); return; }
    // Screen-only nudge (hidden when printing) telling the therapist where to
    // save their clinic details once, so they stop being blank on every report.
    const missing = !clinicianName || !clinicNameTxt || !clinicAddrTxt || !clinicPhoneTxt;
    const nudge = missing ? '<div class="no-print" style="background:#fffbeb;border-bottom:1px solid #fde68a;color:#92400e;padding:10px 16px;font:13px/1.5 -apple-system,Helvetica,Arial,sans-serif;text-align:center;">Clinic details are blank. Click a dotted line in the report header to type them now, or save them once in <b>Settings → Clinic details for reports</b> so every PDF fills them in automatically.</div><style>@media print{.no-print{display:none!important}}</style>' : "";
    win.document.open(); win.document.write(injectViewerControls(htmlContent.replace(/<body[^>]*>/i, (m) => m + nudge))); win.document.close();
    setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
  };

  useEffect(() => {
    try {
      openPdf(buildAssessmentPdf());
    } catch (e) {
      console.error(e);
      alert("Error generating PDF: " + e.message);
    }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}







// ── HEP protocol helpers — versioned home programme with WhatsApp/PDF send ──
function hepDose(e){ const st=e.customSets||e.sets, rp=e.customReps||e.reps, hd=e.customHold||e.hold, fq=e.customFreq||e.freq; return [st&&rp?`${st}×${rp}`:st?`${st} sets`:rp?`${rp} reps`:"", hd?`hold ${hd}s`:"", fq||""].filter(Boolean).join(" · "); }
function buildHepWhatsAppText(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length) return "";
  const v=parseInt(d.hep_version)||1;
  const lines=prog.map((e,i)=>`${i+1}. ${e.name} — ${hepDose(e)}`);
  return `🏥 ${d.clinic_name||"PhysioMind"} — Home Exercise Programme (v${v})\nPatient: ${d.dem_name||""}\nDate: ${new Date().toLocaleDateString("en-GB")}\n\n${lines.join("\n")}\n\nStop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.`;
}
export function sendHepWhatsApp(d){
  const text=buildHepWhatsAppText(d);
  if(!text){alert("No exercises in the home protocol yet.");return;}
  const phone=String(d.dem_phone||d.dem_contact||"").replace(/[^0-9]/g,"");
  const url=phone.length>=10?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,"_blank");
}
export function downloadHepPdf(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length){alert("No exercises in the home protocol yet.");return;}
  const v=parseInt(d.hep_version)||1;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Programme</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}.logo{font-size:20px;font-weight:900;color:#7c3aed}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-h{background:#7c3aed;color:#fff;padding:8px 12px;display:flex;justify-content:space-between}.ex-t{font-size:12px;font-weight:800}.ex-b{padding:10px 12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.st{background:#f5f3ff;border-radius:6px;padding:5px 8px;text-align:center}.sv{font-size:13px;font-weight:900;color:#7c3aed}.sl{font-size:8px;color:#64748b;text-transform:uppercase}.desc{font-size:10.5px;color:#334155;margin-bottom:6px}.cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header"><div><div class="logo">PhysioMind</div><div style="font-size:11px;color:#555;margin-top:2px">Home Exercise Programme — v${v}</div></div><div class="meta"><div><b>Patient:</b> ${d.dem_name||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div></div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${prog.map((ex,i)=>`<div class="ex"><div class="ex-h"><span class="ex-t">${i+1}. ${ex.name}</span><span style="font-size:9px;opacity:0.85">${ex.phase||""}</span></div><div class="ex-b"><div class="grid"><div class="st"><div class="sv">${ex.customSets||ex.sets||"—"}</div><div class="sl">Sets</div></div><div class="st"><div class="sv">${ex.customReps||ex.reps||"—"}</div><div class="sl">Reps</div></div><div class="st"><div class="sv">${(ex.customHold||ex.hold)?(ex.customHold||ex.hold)+"s":"—"}</div><div class="sl">Hold</div></div><div class="st"><div class="sv" style="font-size:9px">${ex.customFreq||ex.freq||"—"}</div><div class="sl">Freq</div></div></div><div class="desc">${ex.desc||""}</div>${ex.cues?`<div class="cues">💡 ${ex.cues}</div>`:""}</div></div>`).join("")}
<div class="footer">Generated by PhysioMind · ${new Date().toLocaleString()}</div>
</body></html>`;
  try{ downloadPDFFromHTML(html, `HEP_v${v}_${d.dem_name||"Patient"}_${Date.now()}.pdf`); }
  catch(e){ const w=window.open("","_blank"); w.document.write(injectViewerControls(html)); w.document.close(); setTimeout(()=>{try{w.print();}catch(_){}},500); }
}

// ── Shared small components for the Sessions feature ──────────────────────

function SessionPill({bg,col,children,onClick,title}){
  return <span onClick={onClick} title={title} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:7,background:bg,color:col,fontSize:"0.8rem",fontWeight:800,cursor:"pointer",flexShrink:0,userSelect:"none"}}>{children}</span>;
}

// Reusable add/edit/remove list -- same Pill buttons, same input style, same
// dashed "+ Add" box as the existing exercise list, so modalities, treatment,
// and past-session exercises all look and behave identically to each other
// and to the exercise list they were modelled on.
function EditableItemList({ PC, items, onAdd, onEdit, onRemove, addLabel, quickOptions }) {
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [addDetail, setAddDetail] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"7px 9px",fontSize:"0.8rem"};
  const startEdit = (it) => { setEditingId(it.id); setEditText(it.name); setEditDetail(it.detail||""); };
  const applyEdit = () => { if(editText.trim()) onEdit(editingId,{name:editText.trim(),detail:editDetail.trim()}); setEditingId(null); };
  const submitAdd = () => { if(addText.trim()){ onAdd({name:addText.trim(),detail:addDetail.trim()}); setAddText(""); setAddDetail(""); setAdding(false); } };
  const itemNames = items.map(it=>it.name);
  return (
    <div>
      {items.length===0 && <div style={{fontSize:"0.78rem",color:PC.muted,padding:"4px 0 8px"}}>None recorded yet.</div>}
      {items.map(it=>(
        <div key={it.id} style={{marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:9}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{it.name}</div>
              {it.detail&&<div style={{fontSize:"0.82rem",color:PC.muted}}>{it.detail}</div>}
            </div>
            <SessionPill bg={`${PC.accent}14`} col={PC.accent} title="Edit" onClick={()=>startEdit(it)}>✎</SessionPill>
            <SessionPill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>onRemove(it.id)}>−</SessionPill>
          </div>
          {editingId===it.id&&(
            <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.accent}08`,border:`1px dashed ${PC.accent}40`,borderRadius:9,marginTop:3,flexWrap:"wrap"}}>
              <input style={{...inp,flex:"1 1 100px"}} placeholder="Name" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyEdit()}/>
              <input style={{...inp,flex:"1 1 100px"}} placeholder="Detail (optional)" value={editDetail} onChange={e=>setEditDetail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyEdit()}/>
              <button onClick={applyEdit} style={{padding:"6px 12px",borderRadius:7,border:"none",background:PC.accent,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
            </div>
          )}
        </div>
      ))}
      {quickOptions&&quickOptions.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>
          {quickOptions.filter(o=>!itemNames.includes(o)).map(o=>(
            <button key={o} onClick={()=>onAdd({name:o,detail:""})} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>＋ {o}</button>
          ))}
        </div>
      )}
      {!adding?(
        <div onClick={()=>setAdding(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer"}}>{addLabel}</div>
      ):(
        <div style={{display:"flex",gap:6,alignItems:"center",padding:"9px 10px",border:`1.5px solid ${PC.accent}35`,borderRadius:11,background:`${PC.accent}06`,flexWrap:"wrap"}}>
          <input autoFocus style={{...inp,flex:"1 1 100px"}} placeholder="Name" value={addText} onChange={e=>setAddText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAdd()}/>
          <input style={{...inp,flex:"1 1 100px"}} placeholder="Detail (optional)" value={addDetail} onChange={e=>setAddDetail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAdd()}/>
          <button onClick={submitAdd} style={{padding:"6px 12px",borderRadius:7,border:"none",background:PC.accent,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Add</button>
          <button onClick={()=>{setAdding(false);setAddText("");setAddDetail("");}} style={{padding:"6px 10px",borderRadius:7,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
      )}
    </div>
  );
}

// Legacy sessions (saved before this feature) only ever stored treatment as
// one comma-joined string, since it was built by tapping chips that got
// appended together. Splitting it back into discrete items is a faithful,
// non-lossy reconstruction of what was already discrete data -- not a guess.
function legacyTreatmentToList(treatmentGiven){
  if(!treatmentGiven) return [];
  return treatmentGiven.split(",").map(s=>s.trim()).filter(Boolean).map(name=>({id:Math.random().toString(36).slice(2,9),name,detail:""}));
}

function sessionSummaryLine(s){
  const exN = Array.isArray(s.exercises)?s.exercises.length:0;
  const moN = Array.isArray(s.modalities)?s.modalities.length:0;
  const txN = Array.isArray(s.treatment)?s.treatment.length:legacyTreatmentToList(s.treatmentGiven).length;
  const parts=[];
  if(exN) parts.push(`${exN} exercise${exN!==1?"s":""}`);
  if(moN) parts.push(`${moN} modalit${moN!==1?"ies":"y"}`);
  if(txN) parts.push(`${txN} treatment${txN!==1?"s":""}`);
  return parts.join(" · ")||"No details logged";
}

// ── Screen 1: list of all sessions, newest first ───────────────────────────
function SessionListView({ PC, sessions, onOpen, onNew }) {
  const lbl = {fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px"};
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div style={lbl}>Sessions {sessions.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· {sessions.length} logged</span>}</div>
        <button onClick={onNew} style={{padding:"7px 14px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>＋ New session</button>
      </div>
      {sessions.length===0&&(
        <div style={{padding:"16px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,textAlign:"center"}}>No sessions logged yet — tap "＋ New session" to record the first visit.</div>
      )}
      {sessions.map((s,i)=>{
        const vs=parseFloat(s.vasStart), ve=parseFloat(s.vasEnd!==undefined&&s.vasEnd!==""?s.vasEnd:s.vasStart);
        const hasPain=!isNaN(vs);
        const better=hasPain&&!isNaN(ve)&&ve<vs, worse=hasPain&&!isNaN(ve)&&ve>vs;
        const note = s.quickNote||s.response||"";
        return (
          <div key={s.id||i} onClick={()=>onOpen(s.id)} style={{padding:"10px 11px",background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:10,marginBottom:8,cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,gap:8}}>
              <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.text}}>Session {s.sessionNo||sessions.length-i} <span style={{color:PC.muted,fontWeight:600}}>· {s.date}</span></span>
              {hasPain&&(
                <span style={{flexShrink:0,fontSize:"0.75rem",fontWeight:800,padding:"2px 9px",borderRadius:99,background:better?`${PC.a3}18`:worse?"rgba(220,38,38,0.12)":`${PC.a4}18`,color:better?PC.a3:worse?"#dc2626":PC.a4}}>
                  {vs}{!isNaN(ve)&&ve!==vs?`→${ve}`:""}
                </span>
              )}
            </div>
            <div style={{fontSize:"0.76rem",color:PC.muted,marginBottom:note?4:0}}>{sessionSummaryLine(s)}</div>
            {note&&<div style={{fontSize:"0.76rem",color:PC.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{note}"</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Screen 2: one session, fully editable — exercises, modalities,
// treatment (each with its own add/edit/remove), pain, and a quick note.
// For a brand-new (unsaved) session, exercises still edit the live,
// ongoing hep_programme exactly as before (today's changes should affect
// the active protocol). For a past, already-saved session, exercises are
// that session's own frozen snapshot -- editing it corrects the historical
// record without silently rewriting today's active protocol.
function SessionDetailView({ PC, data, set, navTo, sessionsArr, activeId, onBack }) {
  const isNew = activeId===null;
  const activeSession = isNew ? null : (sessionsArr.find(s=>s.id===activeId)||null);
  const lastSession = sessionsArr[0];
  const sessionNo = isNew ? sessionsArr.length+1 : (activeSession?.sessionNo||sessionsArr.length);

  const [qv, setQv] = useState(()=> isNew
    ? {pain_today:data.cc_vas_now||"",pain_after:"",response:"",next_plan:""}
    : {pain_today:activeSession?.vasStart||"",pain_after:activeSession?.vasEnd||"",response:activeSession?.quickNote||activeSession?.response||"",next_plan:activeSession?.nextPlan||""});
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState([]);          // protocol change descriptions this visit (new session only)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("library");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerRegion, setPickerRegion] = useState("all");
  const [openTemplate, setOpenTemplate] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDose, setEditDose] = useState({sets:"",reps:"",hold:""});
  const [removeId, setRemoveId] = useState(null);

  const [treatmentList, setTreatmentList] = useState(()=> isNew
    ? (Array.isArray(lastSession?.treatment) ? lastSession.treatment.map(t=>({...t})) : legacyTreatmentToList(lastSession?.treatmentGiven))
    : (Array.isArray(activeSession?.treatment) ? activeSession.treatment.map(t=>({...t})) : legacyTreatmentToList(activeSession?.treatmentGiven)));
  const [modalities, setModalities] = useState(()=> isNew ? [] : (Array.isArray(activeSession?.modalities)?activeSession.modalities.map(m=>({...m})):[]));
  const [pastExercises, setPastExercises] = useState(()=> isNew ? [] : (Array.isArray(activeSession?.exercises)?activeSession.exercises.map(e=>({...e})):[]));
  // Exercise Prescription -- a separate, standing treatment programme from
  // hep_programme (see ExercisePrescriptionModule, Treatment tab). This was
  // being prescribed for patients but never surfaced anywhere in Sessions.
  // Live for a new session (removing here removes from the real prescription,
  // same as Exercises does for hep_programme); a frozen snapshot for a past
  // session, same pattern as Exercises/Modalities/Treatment.
  const rxProgramme = Array.isArray(data.tx_exercise_prescription) ? data.tx_exercise_prescription : [];
  const [pastRx, setPastRx] = useState(()=> isNew ? [] : (Array.isArray(activeSession?.exercisePrescription)?activeSession.exercisePrescription.map(e=>({...e})):[]));
  const removeRx = (id) => { if(!set) return; set("tx_exercise_prescription", rxProgramme.filter(e=>e.id!==id)); };

  const txOptions = ["Joint mobilisation","Soft tissue massage","Dry needling","Exercise therapy","TENS/IFT","Neural mobilisation","Taping/strapping","Education & advice","Postural correction","Manual therapy","Other"];
  const modalityOptions = ["IFT","TENS","Hot pack","Cold pack","Ultrasound","Laser","Shockwave","Traction","Paraffin wax"];
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const lbl = {fontSize:"0.8rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const sectionLbl = {fontSize:"0.82rem",fontWeight:800,color:PC.text,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6};

  const prog = Array.isArray(data.hep_programme)?data.hep_programme:[];

  const addExercise = (ex) => {
    if(prog.find(p=>p.id===ex.id)) { setPickerOpen(false); return; }
    set("hep_programme",[...prog,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}]);
    setPending(p=>[...p,`＋ ${ex.name}`]);
    setPickerOpen(false); setPickerSearch("");
  };
  const removeExercise = (id,reason) => {
    const ex=prog.find(p=>p.id===id);
    set("hep_programme",prog.filter(p=>p.id!==id));
    setPending(p=>[...p,`− ${ex?.name||id}${reason?` (${reason.toLowerCase()})`:""}`]);
    setRemoveId(null);
  };
  const startProgress = (e) => { setEditId(e.id); setEditDose({sets:String(e.customSets||e.sets||""),reps:String(e.customReps||e.reps||""),hold:String(e.customHold||e.hold||"")}); };
  const applyProgress = () => {
    const ex=prog.find(p=>p.id===editId); if(!ex){setEditId(null);return;}
    set("hep_programme",prog.map(p=>p.id===editId?{...p,customSets:editDose.sets,customReps:editDose.reps,customHold:editDose.hold,progressedSession:sessionNo}:p));
    setPending(p=>[...p,`↑ ${ex.name} ${editDose.sets}×${editDose.reps}${editDose.hold?` · ${editDose.hold}s`:""}`]);
    setEditId(null);
  };

  const addTxItem = (name) => setTreatmentList(list=>list.find(t=>t.name===name)?list:[...list,{id:Math.random().toString(36).slice(2,9),name,detail:""}]);
  const addTemplate = (key) => {
    const t=PROGRAMME_TEMPLATES[key]; if(!t) return;
    const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean).filter(e=>!prog.find(p=>p.id===e.id));
    if(exs.length){
      set("hep_programme",[...prog,...exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}))]);
      setPending(p=>[...p,`＋ ${t.label} template (${exs.length} exercise${exs.length!==1?"s":""})`]);
    }
    const tx=TEMPLATE_TX[key];
    if(tx){ (tx.manual||[]).forEach(addTxItem); (tx.machine||[]).forEach(addTxItem); }
  };
  const pickerResults = (()=>{
    if(!pickerOpen) return [];
    let pool = pickerRegion==="all" ? ALL_EXERCISES : (Object.values(EXERCISE_DB[pickerRegion]?.categories||{}).flat());
    const q=pickerSearch.trim().toLowerCase();
    if(q) pool=pool.filter(e=>e.name.toLowerCase().includes(q)||String(e.target||"").toLowerCase().includes(q));
    return pool.filter(e=>!prog.find(p=>p.id===e.id)).slice(0,8);
  })();

  const saveNew = () => {
    set("cc_vas_now",qv.pain_today);
    let hepNote="";
    if(pending.length){
      const version=(parseInt(data.hep_version)||1)+1;
      set("hep_version",version);
      const log=Array.isArray(data.hep_log)?data.hep_log:[];
      set("hep_log",[{session:sessionNo,date:new Date().toLocaleDateString("en-GB"),changes:pending,version},...log]);
      hepNote=`HEP v${version}: ${pending.join(" · ")}`;
    }
    set("soap_extra_p",[qv.next_plan,hepNote].filter(Boolean).join(" | "));
    const exercisesSnapshot = prog.map(e=>({id:e.id,name:e.name,detail:hepDose(e)}));
    const rxSnapshot = rxProgramme.map(e=>({id:e.id,name:e.name,detail:hepDose(e)}));
    const entry = {
      id:(Date.now()).toString(36),date:new Date().toLocaleDateString("en-GB"),sessionNo,type:"Follow-up Treatment",
      vasStart:qv.pain_today,vasEnd:qv.pain_after||qv.pain_today,
      treatmentGiven:treatmentList.map(t=>t.name).join(", "),response:qv.response,nextPlan:qv.next_plan,hepChanges:pending,
      exercises:exercisesSnapshot, modalities, treatment:treatmentList, quickNote:qv.response,
      exercisePrescription:rxSnapshot,
      savedAt:new Date().toISOString()
    };
    set("tx_sessions",[entry,...sessionsArr]);
    setPending([]);
    setSaved(true);
    setTimeout(()=>{setSaved(false); navTo("home");},900);
  };

  const updatePast = () => {
    const updated = {
      ...activeSession,
      vasStart:qv.pain_today, vasEnd:qv.pain_after||qv.pain_today,
      treatmentGiven:treatmentList.map(t=>t.name).join(", "), response:qv.response, nextPlan:qv.next_plan,
      exercises:pastExercises, modalities, treatment:treatmentList, quickNote:qv.response,
      exercisePrescription:pastRx,
      editedAt:new Date().toISOString()
    };
    set("tx_sessions", sessionsArr.map(s=>s.id===activeId?updated:s));
    setSaved(true);
    setTimeout(()=>{setSaved(false); onBack();},700);
  };

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span onClick={onBack} style={{cursor:"pointer",fontSize:"0.95rem",color:PC.muted,lineHeight:1}} title="Back to sessions">←</span>
        <div style={{...sectionLbl,marginBottom:0}}>{isNew?`Today — Session ${sessionNo}`:`Session ${sessionNo} · ${activeSession?.date||""}`}</div>
      </div>

      {(()=>{
        const TEAL="#0F6E56", TEAL_BG=PC.isDark?"rgba(29,158,117,0.14)":"#E1F5EE", TEAL_BORDER="#5DCAA5";
        const start=parseFloat(qv.pain_today), end=parseFloat(qv.pain_after);
        const bothSet=!isNaN(start)&&!isNaN(end);
        const delta=bothSet?start-end:0;
        const endLower=bothSet&&end<start;
        const endStyle={...inp,...(endLower?{border:`1.5px solid ${TEAL_BORDER}`,background:TEAL_BG,color:TEAL,fontWeight:700}:{})};
        return(
          <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>Pain — start</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 5" value={qv.pain_today} onChange={e=>setQv(p=>({...p,pain_today:e.target.value}))}/></div>
              <div><label style={lbl}>Pain — end</label><input style={endStyle} type="number" min="0" max="10" placeholder="e.g. 3" value={qv.pain_after} onChange={e=>setQv(p=>({...p,pain_after:e.target.value}))}/></div>
            </div>
            {bothSet&&(
              <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6,fontSize:"0.78rem",padding:"7px 10px",borderRadius:8,
                background:delta>0?TEAL_BG:(delta<0?"rgba(220,38,38,0.08)":PC.s2),
                color:delta>0?TEAL:(delta<0?"#dc2626":PC.muted)}}>
                <span style={{fontWeight:800}}>{delta>0?`↓ ${delta} point${delta!==1?"s":""} lower`:delta<0?`↑ ${Math.abs(delta)} point${Math.abs(delta)!==1?"s":""} higher`:"No change"}</span>
                <span style={{color:PC.muted}}>this session</span>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{marginBottom:14}}>
        <div style={sectionLbl}>Treatment {isNew&&lastSession&&treatmentList.length>0&&<span style={{fontWeight:500,textTransform:"none",color:PC.muted}}>(copied from S{lastSession.sessionNo||sessionNo-1})</span>}</div>
        <EditableItemList PC={PC} items={treatmentList}
          onAdd={(it)=>setTreatmentList(l=>[...l,{id:Math.random().toString(36).slice(2,9),...it}])}
          onEdit={(id,patch)=>setTreatmentList(l=>l.map(t=>t.id===id?{...t,...patch}:t))}
          onRemove={(id)=>setTreatmentList(l=>l.filter(t=>t.id!==id))}
          addLabel="＋ Add treatment" quickOptions={txOptions}/>
      </div>

      <div style={{marginBottom:14}}>
        <div style={sectionLbl}>Modalities</div>
        <EditableItemList PC={PC} items={modalities}
          onAdd={(it)=>setModalities(l=>[...l,{id:Math.random().toString(36).slice(2,9),...it}])}
          onEdit={(id,patch)=>setModalities(l=>l.map(m=>m.id===id?{...m,...patch}:m))}
          onRemove={(id)=>setModalities(l=>l.filter(m=>m.id!==id))}
          addLabel="＋ Add modality" quickOptions={modalityOptions}/>
      </div>

      <div style={{marginBottom:10}}><label style={lbl}>Quick note</label><input style={inp} placeholder="e.g. Good improvement, less pain on movement" value={qv.response} onChange={e=>setQv(p=>({...p,response:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><label style={lbl}>Plan for next session</label><input style={inp} placeholder="e.g. Progress to single-leg squat" value={qv.next_plan} onChange={e=>setQv(p=>({...p,next_plan:e.target.value}))}/></div>

      <div style={{marginBottom:14}}>
        <div style={sectionLbl}>Exercises {isNew&&prog.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· v{parseInt(data.hep_version)||1} · {prog.length} exercise{prog.length!==1?"s":""}</span>}</div>

        {isNew?(<>
          {prog.length===0&&(
            <div style={{padding:"10px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,marginBottom:8}}>No protocol yet — add exercises below or build it in the Exercise Prescription tab.</div>
          )}
          {prog.map(e=>(
            <div key={e.id} style={{marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:e.addedSession===sessionNo?`${PC.accent}10`:PC.s2,border:`1px solid ${e.addedSession===sessionNo?PC.accent+"35":PC.border}`,borderRadius:9}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{e.name}
                    {e.addedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.accent}}>＋ just added</span>}
                    {e.progressedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.a3}}>↑ progressed</span>}
                  </div>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>{hepDose(e)}</div>
                </div>
                <SessionPill bg={`${PC.a3}18`} col={PC.a3} title="Progress dosage" onClick={()=>startProgress(e)}>↑</SessionPill>
                <SessionPill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>setRemoveId(removeId===e.id?null:e.id)}>−</SessionPill>
              </div>
              {editId===e.id&&(
                <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.a3}08`,border:`1px dashed ${PC.a3}40`,borderRadius:9,marginTop:3}}>
                  {["sets","reps","hold"].map(f=>(
                    <input key={f} style={{...inp,width:62,padding:"5px 7px",fontSize:"0.82rem"}} placeholder={f} value={editDose[f]} onChange={ev=>setEditDose(p=>({...p,[f]:ev.target.value}))}/>
                  ))}
                  <span style={{fontSize:"0.78rem",color:PC.muted}}>sets × reps · hold s</span>
                  <button onClick={applyProgress} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:7,border:"none",background:PC.a3,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
                </div>
              )}
              {removeId===e.id&&(
                <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"7px 10px",background:"rgba(220,38,38,0.05)",border:"1px dashed rgba(220,38,38,0.35)",borderRadius:9,marginTop:3,alignItems:"center"}}>
                  <span style={{fontSize:"0.8rem",color:"#dc2626",fontWeight:700}}>Why?</span>
                  {["Mastered","Aggravating","Replaced","Other"].map(r=>(
                    <button key={r} onClick={()=>removeExercise(e.id,r)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#dc2626",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>{r}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!pickerOpen?(
            <div onClick={()=>setPickerOpen(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer",marginBottom:10}}>＋ Add exercise from library</div>
          ):(
            <div style={{border:`1.5px solid ${PC.accent}35`,borderRadius:11,padding:"10px",marginBottom:10,background:`${PC.accent}06`}}>
              <div style={{display:"flex",gap:6,marginBottom:7}}>
                {[["library","📚 Library"],["templates","📦 Templates"]].map(([m,l])=>(
                  <button key={m} onClick={()=>setPickerMode(m)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${pickerMode===m?PC.accent:PC.border}`,background:pickerMode===m?`${PC.accent}15`:"transparent",color:pickerMode===m?PC.accent:PC.muted,fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>{l}</button>
                ))}
                <button onClick={()=>setPickerOpen(false)} style={{padding:"0 10px",borderRadius:8,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
              </div>
              {pickerMode==="templates"&&(
                <div>
                  {Object.entries(PROGRAMME_TEMPLATES).map(([key,t])=>{
                    const tx=TEMPLATE_TX[key];
                    const isOpen=openTemplate===key;
                    return(
                      <div key={key} style={{marginBottom:4}}>
                        <div onClick={()=>setOpenTemplate(isOpen?null:key)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${isOpen?PC.accent+"45":PC.border}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{t.label}</div>
                            <div style={{fontSize:"0.78rem",color:PC.muted}}>{t.exercises.length} exercises{tx?` · ${(tx.manual||[]).length} manual · ${(tx.machine||[]).length} machine`:""}</div>
                          </div>
                          <span style={{fontSize:"0.75rem",color:PC.accent,fontWeight:800}}>{isOpen?"▲":"▼"}</span>
                        </div>
                        {isOpen&&(
                          <div style={{padding:"8px 10px",border:`1px dashed ${PC.accent}35`,borderTop:"none",borderRadius:"0 0 8px 8px",background:`${PC.accent}05`}}>
                            <button onClick={()=>{addTemplate(key);setOpenTemplate(null);}} style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer",marginBottom:7}}>＋ Add {t.exercises.length} exercises to protocol</button>
                            {tx&&(tx.manual||[]).length>0&&(
                              <div style={{marginBottom:5}}>
                                <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>🤲 Manual — tap to add to treatment</div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {tx.manual.map(m=><button key={m} onClick={()=>addTxItem(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${treatmentList.find(t=>t.name===m)?PC.accent:PC.border}`,background:treatmentList.find(t=>t.name===m)?`${PC.accent}14`:PC.surface,color:treatmentList.find(t=>t.name===m)?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{treatmentList.find(t=>t.name===m)?"✓ ":""}{m}</button>)}
                                </div>
                              </div>
                            )}
                            {tx&&(tx.machine||[]).length>0&&(
                              <div>
                                <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>⚡ Machine — tap to add to treatment</div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {tx.machine.map(m=><button key={m} onClick={()=>addTxItem(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${treatmentList.find(t=>t.name===m)?PC.a2:PC.border}`,background:treatmentList.find(t=>t.name===m)?`${PC.a2}14`:PC.surface,color:treatmentList.find(t=>t.name===m)?PC.a2:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{treatmentList.find(t=>t.name===m)?"✓ ":""}{m}</button>)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {pickerMode==="library"&&(
              <div style={{display:"flex",gap:6,marginBottom:7}}>
                <input autoFocus style={{...inp,flex:1}} placeholder="Search exercises… e.g. plank, chin tuck" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/>
                <select style={{...inp,width:120}} value={pickerRegion} onChange={e=>setPickerRegion(e.target.value)}>
                  <option value="all">All regions</option>
                  {Object.entries(EXERCISE_DB).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
                </select>
              </div>
              )}
              {pickerMode==="library"&&pickerResults.length===0&&<div style={{fontSize:"0.66rem",color:PC.muted,padding:"4px 2px"}}>No matches — try another term or region.</div>}
              {pickerMode==="library"&&pickerResults.map(ex=>(
                <div key={ex.id} onClick={()=>addExercise(ex)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${PC.border}`,marginBottom:4}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{ex.name}</div>
                    <div style={{fontSize:"0.78rem",color:PC.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.sets}×{ex.reps}{ex.hold?` · ${ex.hold}s`:""} · {ex.freq} · {ex.target}</div>
                  </div>
                  <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,flexShrink:0}}>＋ Add</span>
                </div>
              ))}
            </div>
          )}

          {pending.length>0&&(
            <div style={{padding:"8px 11px",background:`${PC.accent}0a`,border:`1px solid ${PC.accent}25`,borderRadius:9,fontSize:"0.75rem",color:PC.text,marginBottom:10,lineHeight:1.6}}>
              <span style={{fontWeight:800,color:PC.accent}}>This session:</span> {pending.join(" · ")} <span style={{color:PC.muted}}>(will be logged as v{(parseInt(data.hep_version)||1)+1} on save)</span>
            </div>
          )}
        </>):(
          <EditableItemList PC={PC} items={pastExercises}
            onAdd={(it)=>setPastExercises(l=>[...l,{id:Math.random().toString(36).slice(2,9),...it}])}
            onEdit={(id,patch)=>setPastExercises(l=>l.map(e=>e.id===id?{...e,...patch}:e))}
            onRemove={(id)=>setPastExercises(l=>l.filter(e=>e.id!==id))}
            addLabel="＋ Add exercise"/>
        )}
      </div>

      <div style={{marginBottom:14}}>
        <div style={sectionLbl}>Exercise Prescription {rxProgramme.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· {rxProgramme.length} exercise{rxProgramme.length!==1?"s":""}</span>}</div>
        {/* Exercise Prescription is a standing treatment programme, not a
            per-visit event like Modalities/Treatment -- always shows what's
            CURRENTLY prescribed (data.tx_exercise_prescription) whether
            you're looking at today's session or a past one, rather than a
            frozen historical snapshot. A past session freezing this the
            same way it freezes Modalities/Treatment meant exercises picked
            after that session was saved would never show up when you
            reopened it -- which is exactly what "not showing in session"
            reports were describing. */}
        {rxProgramme.length===0&&<div style={{fontSize:"0.78rem",color:PC.muted,padding:"4px 0 8px"}}>None prescribed yet.</div>}
        {rxProgramme.map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:9,marginBottom:5}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{e.name}</div>
              <div style={{fontSize:"0.82rem",color:PC.muted}}>{hepDose(e)}</div>
            </div>
            <SessionPill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>removeRx(e.id)}>−</SessionPill>
          </div>
        ))}
        <div onClick={()=>navTo("treatment")} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer"}}>＋ Add / edit in Exercise Prescription →</div>
      </div>

      <button onClick={isNew?saveNew:updatePast} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"#0F6E56",color:"#fff",fontWeight:800,fontSize:"0.85rem",cursor:"pointer",marginBottom:8}}>
        {saved?(isNew?"✅ Session saved":"✅ Session updated"):(isNew?"Save session":"Update session")}
      </button>
      {isNew&&(
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>sendHepWhatsApp(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a3}40`,background:`${PC.a3}10`,color:PC.a3,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📲 Send protocol — WhatsApp</button>
          <button onClick={()=>downloadHepPdf(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a2}40`,background:`${PC.a2}10`,color:PC.a2,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📄 PDF handout</button>
        </div>
      )}
    </div>
  );
}

// ── Top-level: switches between the session list and one session's detail ──
function QuickVisitForm({ PC, data, set, navTo }) {
  const sessionsArr = Array.isArray(data.tx_sessions)?data.tx_sessions:[];
  const [view, setView] = useState("list");
  const [activeId, setActiveId] = useState(null);

  if (view === "list") {
    return <SessionListView PC={PC} sessions={sessionsArr}
      onOpen={(id)=>{setActiveId(id); setView("detail");}}
      onNew={()=>{setActiveId(null); setView("detail");}}/>;
  }
  return <SessionDetailView key={activeId||"new"} PC={PC} data={data} set={set} navTo={navTo}
    sessionsArr={sessionsArr} activeId={activeId} onBack={()=>{setView("list"); setActiveId(null);}}/>;
}

// The "+ New" button in the top header opens this. Two steps, in this order
// (2026-08-31, Aditi: "new patient should [be] 6 ques max for demographic
// data or patient details and then ask for neuro ortho cardio sports"):
//
//   Step 1 — 7 patient-detail questions, nothing more on screen.
//   Step 2 — which specialty this assessment runs under.
//
// Step 1 was 6 questions; Address was added as the 7th on request
// (2026-08-31) after it had first been tucked into "More details". Still a
// short form -- the point was never the number 6 for its own sake.
//
// The old version asked ~20 questions across four tabs (Essential/Contact/
// Clinical/Consent) before it would create anything, and never asked which
// specialty the assessment was for -- every new patient silently became an
// Ortho one. Everything that used to be asked up front is still here and
// still saves to the same field keys; it just lives behind the optional
// "More details" toggle on step 1 instead of standing between the clinician
// and a usable patient record. Consent moved to step 2 (it isn't a
// demographic question, so it doesn't take a step-1 slot) and is still
// required before a record can be created.
const INTAKE_SPECIALTIES = [
  { id:"ortho",  label:"Ortho",  icon:"🦴", color:"#7c3aed", live:true  },
  { id:"neuro",  label:"Neuro",  icon:"🧠", color:"#0d9488", live:true  },
  { id:"cardio", label:"Cardio", icon:"❤️", color:"#dc2626", live:true  },
  { id:"sports", label:"Sports", icon:"🏃", color:"#ea580c", live:false },
  { id:"pedia",  label:"Pedia",  icon:"🧸", color:"#db2777", live:false },
];

function IntakeForm({ PC, currentUser, onCancel, onSubmit }) {
  // Fills the "nothing saves until you finish the whole intake form" gap:
  // before a patient record exists there's nowhere in Supabase to attach
  // this data to yet, and saving it to the cloud before the student has even
  // reached the consent checkbox "I consent to storage of my data" would
  // undercut the consent flow itself — so this is a local-only,
  // short-lived draft (namespaced per signed-in user, same reasoning as the
  // per-user patient DB) that just survives an accidental reload/crash/tab
  // close mid-intake. It's deleted the moment the form is submitted or
  // cancelled — it's scratch space, not a permanent record.
  const draftKey = `physio_intake_draft_v1_${currentUser?.id || "anon"}`;
  const [restoredDraft] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return !!(raw && typeof raw === "object" && Object.keys(raw).length > 0);
    } catch { return false; }
  });
  const [fd, setFd] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch { return {}; }
  });
  const [step, setStep] = React.useState("details"); // "details" | "specialty"
  const [moreOpen, setMoreOpen] = React.useState(false);
  const set = (k,v) => setFd(p=>({...p,[k]:v}));

  React.useEffect(() => {
    if (Object.keys(fd).length === 0) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(fd)); } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [fd, draftKey]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch {} };

  // Two field styles on purpose. `inp`/`lbl`/`field` is the compact
  // treatment, still used for the optional "More details" section. The
  // `n*` set below matches the full-page Clinical > Demographics step in
  // AppFull.jsx exactly -- larger rounded boxes, bold dark labels, red
  // required asterisk, htmlFor/id pairing -- so the app's two
  // patient-detail screens read as the same product rather than two
  // different forms.
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.82rem",marginBottom:0,boxSizing:"border-box"};
  const lbl = {fontSize:"0.78rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const field = (label, node) => (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      {node}
    </div>
  );
  const nInp = {width:"100%",background:PC.surface,border:`1.5px solid ${PC.border}`,borderRadius:10,color:PC.text,fontFamily:"inherit",outline:"none",padding:"11px 13px",fontSize:"0.9rem",boxSizing:"border-box"};
  const nLbl = {fontSize:"0.82rem",fontWeight:700,color:PC.text,marginBottom:6,display:"block"};
  const req = <span style={{color:"#dc2626"}}> *</span>;
  const nField = (label, el, required, id) => (
    <div style={{marginBottom:16}}>
      <label htmlFor={id} style={nLbl}>{label}{required&&req}</label>
      {el}
    </div>
  );
  // Sex as three tappable pills rather than a dropdown, and the same
  // Male/Female/Other set the Demographics and Cardio screens standardised
  // on -- one control, one vocabulary across the app.
  const SEX_OPTS = ["Male","Female","Other"];
  const sel = (k, opts) => (
    <select style={inp} value={fd[k]||""} onChange={e=>set(k,e.target.value)}>
      <option value="">—</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );

  // Step 1 gate: the two questions a patient record is meaningless without.
  const detailsOk = !!(fd.dem_name?.trim() && fd.cc_main?.trim());
  // Step 2 gate: a live specialty AND treatment consent, same hard
  // requirement the old Consent tab enforced before anything was created.
  const specialty = INTAKE_SPECIALTIES.find(s=>s.id===fd.assessment_specialty);
  const canSubmit = detailsOk && !!(specialty?.live) && !!fd.consent_treat;

  return (
    <div>
      {restoredDraft && (
        <div style={{padding:"7px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.75rem",color:PC.muted,marginBottom:14}}>
          ↺ Restored what you'd already typed before this got interrupted.
        </div>
      )}

      {/* Two-step progress — deliberately not tabs: the old free-jump tab
          strip is what let a half-filled intake sit around unfinished. */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        {[["details","Patient details"],["specialty","Specialty"]].map(([id,label],i)=>{
          const on = step===id;
          const done = id==="details" && step==="specialty";
          return (
            <div key={id} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:12,
              border:`1.5px solid ${on?PC.accent:PC.border}`,
              background: on ? `${PC.accent}12` : PC.surface}}>
              <span style={{width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:"0.7rem",fontWeight:800,
                background: on||done ? PC.accent : PC.s2,
                color: on||done ? "#fff" : PC.muted}}>
                {done ? "✓" : i+1}
              </span>
              <span style={{fontSize:"0.78rem",fontWeight:700,color:on?PC.accent:PC.muted,whiteSpace:"nowrap",
                overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1 · the 7 patient-detail questions ── */}
      {step==="details" && (
        <div>
          {nField("Full name",<input id="intake_dem_name" style={nInp} placeholder="e.g. Riya Sharma" value={fd.dem_name||""} onChange={e=>set("dem_name",e.target.value)} autoFocus/>,true,"intake_dem_name")}
          {nField("Age",<input id="intake_dem_age" style={nInp} type="text" placeholder="e.g. 34" value={fd.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>,false,"intake_dem_age")}
          <div style={{marginBottom:16}}>
            <label style={nLbl}>Sex</label>
            <div style={{display:"flex",gap:8}}>
              {SEX_OPTS.map(o=>(
                <button key={o} type="button" onClick={()=>set("dem_sex",o)}
                  style={{flex:1,padding:"11px 0",textAlign:"center",borderRadius:10,fontSize:"0.85rem",fontWeight:700,fontFamily:"inherit",
                    border:`1.5px solid ${fd.dem_sex===o?PC.accent:PC.border}`,
                    background:fd.dem_sex===o?PC.accent:PC.surface,
                    color:fd.dem_sex===o?"#fff":PC.text,cursor:"pointer"}}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          {nField("Phone",<input id="intake_dem_phone" style={nInp} type="tel" placeholder="+91 98765 43210" value={fd.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>,false,"intake_dem_phone")}
          {nField("Occupation",<input id="intake_dem_occupation" style={nInp} placeholder="e.g. Teacher, Desk worker" value={fd.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>,false,"intake_dem_occupation")}
          {nField("Address",<input id="intake_dem_address" style={nInp} placeholder="Street, City, Postcode" value={fd.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>,false,"intake_dem_address")}
          {nField("Chief complaint",<input id="intake_cc_main" style={nInp} placeholder="e.g. Lower back pain, knee injury" value={fd.cc_main||""} onChange={e=>set("cc_main",e.target.value)}/>,true,"intake_cc_main")}

          {/* Everything the old four-tab intake asked for, kept on file and
              kept optional. Nothing was dropped — it just no longer blocks
              getting to the assessment. */}
          <button type="button" onClick={()=>setMoreOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:"4px 0 10px",color:PC.accent,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{transform:moreOpen?"rotate(90deg)":"none",transition:"transform .15s",display:"inline-block"}}>▶</span>
            More details (optional)
          </button>

          {moreOpen && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Date of birth", <DateWheelField value={fd.dem_dob||""} onChange={v=>set("dem_dob",v)} inputStyle={inp}/>)}</div>
                <div>{field("Dominant hand", sel("dem_hand",["Right","Left","Ambidextrous"]))}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Pain now (0–10)", <input style={inp} type="number" min="0" max="10" placeholder="0–10" value={fd.cc_vas_now||""} onChange={e=>set("cc_vas_now",e.target.value)}/>)}</div>
                <div>{field("Duration", <input style={inp} placeholder="e.g. 3 weeks" value={fd.cc_duration||""} onChange={e=>set("cc_duration",e.target.value)}/>)}</div>
              </div>
              {field("Email address", <input style={inp} type="email" placeholder="patient@email.com" value={fd.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Emergency contact name", <input style={inp} placeholder="Full name" value={fd.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}</div>
                <div>{field("Emergency contact phone", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}</div>
              </div>
              {field("Referring doctor / GP", <input style={inp} placeholder="Dr. Name, Hospital" value={fd.dem_referral_dr||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
              {field("Referral source", sel("dem_referral_source",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
              {field("Insurance / Fund", <input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={fd.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
              {field("Policy / Member number", <input style={inp} placeholder="Optional" value={fd.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
              {field("Relevant medical history", <textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={fd.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
              {field("Current medications", <input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={fd.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
            </div>
          )}

          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>{clearDraft();onCancel();}} style={{flex:1,padding:"14px",borderRadius:12,border:`1.5px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit"}}>Cancel</button>
            <button disabled={!detailsOk} onClick={()=>setStep("specialty")}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:detailsOk?PC.accent:"#D1D5DB",color:"#fff",fontWeight:800,cursor:detailsOk?"pointer":"not-allowed",fontSize:"0.9rem",fontFamily:"inherit"}}>
              {detailsOk ? "Next: choose specialty →" : "Name & chief complaint first"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 · which specialty ── */}
      {step==="specialty" && (
        <div>
          <div style={{fontSize:"0.95rem",fontWeight:800,color:PC.text,marginBottom:3}}>Which specialty is this assessment?</div>
          <div style={{fontSize:"0.78rem",color:PC.muted,marginBottom:14}}>This decides which assessment flow {fd.dem_name?.trim()||"this patient"} starts in.</div>

          {/* Sports and Pedia are listed but not selectable — the same
              honest SOON treatment the Clinical tab's specialty grid uses,
              rather than offering a card that leads nowhere. */}
          <div data-testid="intake-specialty-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(96px,1fr))",gap:8,marginBottom:16}}>
            {INTAKE_SPECIALTIES.map(sp=>{
              const picked = fd.assessment_specialty === sp.id;
              return (
                <button key={sp.id} type="button"
                  onClick={()=>{ if(!sp.live) return; set("assessment_specialty", sp.id); }}
                  style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"14px 6px",borderRadius:14,fontFamily:"inherit",
                    cursor:sp.live?"pointer":"not-allowed",opacity:sp.live?1:0.55,
                    border:`1.5px solid ${picked?sp.color:(sp.live?sp.color+"50":"#E5E7EB")}`,
                    background:picked?sp.color+"1f":(sp.live?sp.color+"0d":"#F9FAFB")}}>
                  {!sp.live && <span style={{position:"absolute",top:6,right:6,fontSize:"0.55rem",fontWeight:800,padding:"1px 5px",borderRadius:8,background:"#E5E7EB",color:"#9CA3AF"}}>SOON</span>}
                  <span style={{fontSize:"1.5rem",lineHeight:1}}>{sp.icon}</span>
                  <span style={{fontWeight:700,fontSize:"0.8rem",color:sp.live?sp.color:"#9CA3AF"}}>{sp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Consent — same hard requirement as before, and the same
              guest-vs-signed-in storage wording main already corrected
              (data is NOT "on this device only" for a signed-in user);
              it's just no longer a whole tab of its own. */}
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:12,marginBottom:12,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Consent to Treatment</strong><br/>
            I consent to physiotherapy assessment and treatment. I understand I may withdraw consent at any time. Treatment goals and procedures have been explained to me.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:10}}>
            <input type="checkbox" checked={!!fd.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>I consent to physiotherapy assessment and treatment <span style={{color:"#ef4444"}}>*</span></span>
          </label>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:12,marginBottom:12,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Data Storage Consent</strong><br/>
            {currentUser?.id
              ? "Your clinical data is stored securely in your PhysioMind account. It is not shared with third parties. You may request deletion at any time."
              : "You're in guest mode: this data stays in your browser only and is not saved to any account. Sign in to store it securely and access it later."}
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:12}}>
            <input type="checkbox" checked={!!fd.consent_data} onChange={e=>set("consent_data",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:500}}>I consent to storage of my clinical data {currentUser?.id ? "in my PhysioMind account" : "in this browser"}</span>
          </label>
          {!fd.consent_treat && (
            <div style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,fontSize:"0.78rem",color:"#ef4444",fontWeight:600,marginBottom:10}}>
              ⚠ Treatment consent is required to create a patient record.
            </div>
          )}
          <div style={{padding:"8px 12px",background:PC.s3,borderRadius:8,fontSize:"0.75rem",color:PC.muted}}>
            Consent date: {new Date().toLocaleDateString("en-GB")} · Clinician: {currentUser?.user_metadata?.full_name ? `Dr. ${currentUser.user_metadata.full_name.replace(/^dr\.?\s+/i,"")}` : "Guest"}
          </div>

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>setStep("details")} style={{flex:1,padding:"14px",borderRadius:12,border:`1.5px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit"}}>← Back</button>
            <button disabled={!canSubmit} onClick={()=>{clearDraft();onSubmit(fd);}}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:canSubmit?PC.accent:"#D1D5DB",color:"#fff",fontWeight:800,cursor:canSubmit?"pointer":"not-allowed",fontSize:"0.9rem",fontFamily:"inherit"}}>
              {!specialty?.live ? "Pick a specialty" : !fd.consent_treat ? "Consent required" : `Start ${specialty.label} Assessment →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingModal({ PC, onDismiss }) {
  // iconGlyph = Tabler outline icon shown in the colored circle badge
  // (2026-09-16, Aditi: "make it good not this font and this grey thing")
  // -- replaces the giant standalone emoji + the flat grey PC.s2 disclaimer
  // fill with a proper card built from each step's own accent color.
  const STEPS = [
    { iconGlyph:"ti-stethoscope", title:"Welcome to PhysioMind", desc:"PhysioMind is strictly an educational training tool for physiotherapy students and clinicians. It does not provide medical diagnoses, treatment decisions, or replace professional clinical judgment.", color:"#7c3aed" },
    { iconGlyph:"ti-user-plus",   title:"Start with a Patient",        desc:'Tap "New Patient" on the dashboard to create a record. Fill in the name and chief complaint — everything else can be added as you go.',           color:"#0891b2" },
    { iconGlyph:"ti-list-check",  title:"Assess Step by Step",          desc:"Work through the left-hand menu: Subjective → Posture → ROM → Special Tests. Each module saves automatically as you type.",             color:"#059669" },
  ];
  const [step, setStep] = React.useState(0);
  // Apple 5.1.1(v) / DPDP Act Sec 6: this acknowledgment is a mandatory
  // clickwrap, not a dismissible tour slide -- it cannot be skipped or
  // closed via backdrop click until the checkbox is explicitly checked.
  const [ackChecked, setAckChecked] = React.useState(false);
  const s = STEPS[step];
  const onLastStep = step === STEPS.length - 1;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{fontFamily:"'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",background:PC.surface,borderRadius:20,padding:"28px 24px 22px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.45)",border:`1px solid ${s.color}44`,textAlign:"center"}}>
        {/* Step dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=>(<div key={i} style={{width:i===step?20:7,height:7,borderRadius:99,background:i===step?s.color:PC.border,transition:"all 0.3s"}}/>))}
        </div>
        <div style={{width:56,height:56,borderRadius:"50%",background:`${s.color}17`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <i className={"ti "+s.iconGlyph} aria-hidden="true" style={{fontSize:26,color:s.color}}></i>
        </div>
        <div style={{fontWeight:800,fontSize:"1.2rem",color:PC.text,marginBottom:10,letterSpacing:"-0.3px"}}>{s.title}</div>
        <div style={{fontSize:"0.88rem",color:PC.muted,lineHeight:1.65,marginBottom:onLastStep?18:24}}>{s.desc}</div>
        {onLastStep && (
          <label style={{display:"flex",gap:10,alignItems:"flex-start",textAlign:"left",marginBottom:20,cursor:"pointer",background:`${s.color}0d`,border:`1px solid ${s.color}33`,borderRadius:12,padding:12}}>
            <input type="checkbox" checked={ackChecked} onChange={e=>setAckChecked(e.target.checked)} style={{marginTop:2,width:16,height:16,flexShrink:0,accentColor:s.color}}/>
            <span style={{fontSize:"0.78rem",color:PC.text,lineHeight:1.5,fontWeight:600}}>
              I understand that PhysioMind is an academic training aid and that all clinical interpretations must be verified by a licensed physical therapist.
            </span>
          </label>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(n=>n-1)} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${PC.border}`,background:"#fff",color:PC.muted,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>← Back</button>
          )}
          {!onLastStep ? (
            <button onClick={()=>setStep(n=>n+1)} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Next →</button>
          ) : (
            <button onClick={onDismiss} disabled={!ackChecked} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:ackChecked?s.color:`${s.color}55`,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:ackChecked?"pointer":"not-allowed"}}>Let's go →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────
export { PdfReportsModal, QuickVisitForm, IntakeForm, OnboardingModal, SessionListView, SessionDetailView, EditableItemList, legacyTreatmentToList, sessionSummaryLine };
