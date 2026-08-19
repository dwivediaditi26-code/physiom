import { useState, useMemo, Fragment } from "react";
import { Download } from "lucide-react";
import { SCALES, downloadPDFFromHTML, makePDFPage } from "../../sharedClinicalData.js";
import { OUTCOME_GUIDES } from "./outcomeMeasureGuides.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

// Real data from SCALES -- same source the actual Outcome Measures
// clinical screen uses (a flat dict keyed by scale id, grouped here by its
// own real `category` field into region-style pills, same UX as ROM/MMT's
// region tabs). Detail sections show the real scale info (max score,
// MCID) then every real question/option exactly as the clinical entry
// screen shows them -- just without the answer selects, since this view
// is read-only. `emoji: s.icon` -- these scales don't have an uploaded
// photo, but DO have a real icon already used on the actual screen, so
// StudyGrid/StudyDetail show that instead of a blank "no image" box.
const CATEGORIES = [...new Set(Object.values(SCALES).map((s) => s.category))];

function fieldBlockHTML(f) {
  const noteHTML = f.note ? `<div style="font-size:9.5px;color:#64748b;margin:2px 0 6px;font-style:italic;">${f.note}</div>` : "";
  const isNumericScale = f.options && f.options.length > 0 && f.options.every((o) => /^\d+$/.test(o));
  let inputHTML;
  if (f.type === "timer") {
    inputHTML = `<div style="font-size:10.5px;color:#334155;">Time: <span style="display:inline-block;border-bottom:1px solid #94a3b8;min-width:100px;">&nbsp;</span> seconds</div>`;
  } else if (f.type === "activity") {
    inputHTML = `
      <div style="font-size:10.5px;color:#334155;margin-bottom:5px;">Activity: <span style="display:inline-block;border-bottom:1px solid #94a3b8;min-width:220px;">&nbsp;</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">${(f.options || []).map((o) => `<span style="display:inline-flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;border-radius:5px;width:20px;height:17px;font-size:9px;">${o}</span>`).join("")}</div>`;
  } else if (f.type === "slider" || isNumericScale) {
    inputHTML = `<div style="display:flex;flex-wrap:wrap;gap:5px;">${(f.options || []).map((o) => `<span style="display:inline-flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;border-radius:5px;width:20px;height:17px;font-size:9px;">${o}</span>`).join("")}</div>`;
  } else if (f.options && f.options.length > 0) {
    inputHTML = `<div style="display:flex;flex-direction:column;gap:2.5px;">${f.options.map((o) => `<div style="display:flex;gap:6px;align-items:flex-start;font-size:9.5px;color:#1e293b;"><span>&#9744;</span><span>${o}</span></div>`).join("")}</div>`;
  } else {
    inputHTML = `<div style="border-bottom:1px solid #94a3b8;min-height:16px;"></div>`;
  }
  return `<div class="no-break" style="margin-bottom:9px;">
    <div style="font-size:10.5px;font-weight:700;color:#0f172a;margin-bottom:2px;">${f.label}</div>
    ${noteHTML}
    ${inputHTML}
  </div>`;
}

function buildBlankFormHTML(s, guide) {
  const howText = s.adminNote || guide?.how;
  const metaRight = `<div><strong>Instrument:</strong> ${s.full}</div><div><strong>Category:</strong> ${s.category}</div><div><strong>Date:</strong> ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>`;
  const bodyHTML = `
    <span class="badge badge-blue">BLANK OUTCOME MEASURE FORM</span>
    <div class="info-grid">
      <div class="info-box"><div class="info-label">Patient Name</div><div style="border-bottom:1px solid #94a3b8;min-height:18px;">&nbsp;</div></div>
      <div class="info-box"><div class="info-label">Date Administered</div><div style="border-bottom:1px solid #94a3b8;min-height:18px;">&nbsp;</div></div>
    </div>
    ${howText ? `<div class="disclaimer"><strong>How to administer:</strong> ${howText}</div>` : ""}
    <div class="section-box" style="white-space:normal;">
      ${(s.fields || []).map(fieldBlockHTML).join("") || "<div style='font-size:10.5px;color:#64748b;'>This instrument is scored directly by the clinician -- no per-item form fields.</div>"}
    </div>
    ${s.mcid != null ? `<div style="font-size:9px;color:#64748b;">MCID = ${s.mcid}${s.unit || ""} (minimum clinically important difference for this instrument). Max score: ${s.maxScore}${s.unit || ""}.</div>` : ""}
    <div class="sig-row">
      <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Clinician signature</div></div>
      <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Date</div></div>
    </div>`;
  return makePDFPage(`${s.label} — Blank Form`, metaRight, bodyHTML);
}

function downloadBlankForm(s, guide) {
  const html = buildBlankFormHTML(s, guide);
  const safeName = s.label.replace(/[^a-zA-Z0-9]+/g, "_");
  downloadPDFFromHTML(html, `${safeName}_Blank_Form.pdf`);
}

function toCard(s) {
  const guide = OUTCOME_GUIDES[s.id];
  const how = s.adminNote || guide?.how;
  const why = guide?.why;
  return {
    id: s.id,
    emoji: s.icon,
    title: s.full,
    subtitle: s.label,
    tags: [s.unit && `Max ${s.maxScore}${s.unit}`, s.mcid != null && `MCID ${s.mcid}`].filter(Boolean),
    sections: (
      <Fragment>
        <button
          onClick={() => downloadBlankForm(s, guide)}
          className="flex items-center justify-center gap-2 w-full bg-violet-600 text-white text-sm font-semibold rounded-xl py-2.5 active:bg-violet-700"
        >
          <Download size={16}/> Download PDF (blank form)
        </button>
        {why && <InfoBox icon="🎯" label="Why this helps" tint="green">{why}</InfoBox>}
        {how && <InfoBox icon="📝" label="How to perform" tint="amber">{how}</InfoBox>}
        <InfoBox icon="📋" label="Category" tint="violet">{s.category}</InfoBox>
        {s.fields && s.fields.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Items ({s.fields.length})</div>
            <div className="space-y-1.5">
              {s.fields.map((f) => (
                <div key={f.id} className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">{f.label}</div>
                  {f.options && f.options.length > 0 && <div className="text-[11px] text-slate-500 mt-1">{f.options.join(" · ")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Fragment>
    ),
  };
}

export default function OutcomeStudy({ onBack }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(
    () => Object.values(SCALES).filter((s) => s.category === category).map(toCard),
    [category]
  );

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Outcome Measures"
      onBack={onBack}
      regions={CATEGORIES.map((c) => ({ key: c, label: c }))}
      activeRegion={category}
      onRegion={setCategory}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}
