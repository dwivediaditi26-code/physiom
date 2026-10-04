// The assessment PDF report. Split out of AppModules.jsx so the heavy code it needs
// (the SOAP builder, the region tables and the whole Ortho wizard's summary code)
// is only downloaded when someone actually generates a report, instead of with the
// first screen. AppModules.jsx still exports PdfReportsModal, as a small wrapper that
// loads this file on demand.

import { useEffect } from "react";
import { injectViewerControls } from "./sharedClinicalData.js";
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
export default function PdfReportsModal({ data, dx, onClose, currentUser }) {
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
  const bcCondition = d.soap_a_diagnosis || d.soap_a || "";
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
        ${dxMain && dxMain !== "--" ? sec("🩺","Clinical diagnosis","#1e3a5f", `
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

export { PdfReportsModal };
