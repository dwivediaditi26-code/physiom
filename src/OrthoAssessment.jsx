import React, { useState } from "react";
import { SectionIntro } from "./orthoFieldKit.jsx";
import { PickerList, ConditionPicker, RegionPicker, regionLabelList } from "./orthoSetupKit.jsx";
import { getTemplates } from "./orthoTemplates.js";
import { orthoStyles } from "./orthoStyles.js";
import OrthoIPDAssessment, { IPD_CONDITIONS } from "./OrthoIPDAssessment.jsx";
import OrthoPostOpAssessment, { POSTOP_CONDITIONS } from "./OrthoPostOpAssessment.jsx";
import OrthoOutpatientAssessment, { OUTPATIENT_CONDITIONS } from "./OrthoOutpatientAssessment.jsx";

/* ============================================================
   ORTHO ASSESSMENT — standalone entry point.

   Screen 1: Pathway  (IPD / Post-operative Rehab / Outpatient)
   Screen 2: Region(s) involved
   Screen 3: Clinical context / condition — always with a
             "write in your own" option, so the template is a
             guide and never a restriction. For Outpatient only,
             this screen also offers General Assessment (no
             promotions) and My Templates (a therapist's own
             saved section lists) alongside Condition-wise.

   Once all three are picked, the matching pathway module takes
   over and runs its own condition-driven step list. This file
   is intentionally NOT wired into App.jsx / AppFull.jsx — it is
   a standalone module for review, reached only via
   ortho-preview.html.
   ============================================================ */

const PATHWAYS = [
  { id: "ipd", icon: "🏥", label: "IPD", desc: "Inpatient ward assessment" },
  { id: "postop", icon: "🛏️", label: "Post-operative Rehab", desc: "Structured post-surgical rehabilitation" },
  { id: "outpatient", icon: "🚶", label: "Outpatient / Musculoskeletal", desc: "OPD / clinic-based MSK assessment" },
];

const PATHWAY_META = {
  ipd: { Component: OrthoIPDAssessment, conditions: IPD_CONDITIONS, label: "IPD" },
  postop: { Component: OrthoPostOpAssessment, conditions: POSTOP_CONDITIONS, label: "Post-operative Rehab" },
  outpatient: { Component: OrthoOutpatientAssessment, conditions: OUTPATIENT_CONDITIONS, label: "Outpatient / Musculoskeletal" },
};

const OPD_MODES = [
  { id: "condition", icon: "🩺", label: "Condition-wise", desc: "Pick a clinical context — promotes relevant assessments automatically" },
  { id: "general", icon: "📋", label: "General Assessment", desc: "Standard OPD assessment — nothing pre-promoted, add whatever you need" },
  { id: "templates", icon: "📁", label: "My Templates", desc: "Reuse a section list you saved from a previous assessment" },
];

export default function OrthoAssessment({ onExit, onSave, activePatientId } = {}) {
  const [step, setStep] = useState(0); // 0 pathway, 1 region, 2 condition, 3 assessment
  const [pathway, setPathway] = useState(null);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [condition, setCondition] = useState(null);
  const [customConditionLabel, setCustomConditionLabel] = useState("");
  const [opdMode, setOpdMode] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  function restart() {
    setStep(0);
    setPathway(null);
    setSelectedRegions([]);
    setCondition(null);
    setCustomConditionLabel("");
    setOpdMode(null);
    setSelectedTemplate(null);
  }

  const isOutpatient = pathway === "outpatient";

  if (step === 3 && pathway) {
    const { Component } = PATHWAY_META[pathway];
    return (
      <Component
        selectedRegions={selectedRegions}
        condition={condition}
        customConditionLabel={condition === "custom" ? customConditionLabel || "Other (written in)" : undefined}
        initialStepOrder={opdMode === "templates" ? selectedTemplate?.stepOrder : undefined}
        templateName={opdMode === "templates" ? selectedTemplate?.name : undefined}
        onExit={restart}
        onSave={onSave}
        activePatientId={activePatientId}
      />
    );
  }

  const canProceedPathway = step !== 0 || !!pathway;
  const canProceedRegion = step !== 1 || selectedRegions.length > 0;
  const canProceedCondition =
    step !== 2 ||
    (isOutpatient
      ? (opdMode === "condition" && !!condition) || opdMode === "general" || (opdMode === "templates" && !!selectedTemplate)
      : !!condition);
  const canProceed = canProceedPathway && canProceedRegion && canProceedCondition;

  const meta = pathway ? PATHWAY_META[pathway] : null;

  function goNext() {
    if (step < 2) setStep(step + 1);
    else setStep(3);
  }
  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  function selectOpdMode(id) {
    setOpdMode(id);
    setCondition(null);
    setCustomConditionLabel("");
    setSelectedTemplate(null);
    if (id === "general") setCondition("general");
  }

  return (
    <div className="app-shell">
      <style>{orthoStyles()}</style>
      <div className="app-inner">
        <div className="topbar">
          <div className="topbar-row">
            {step > 0 && (
              <button className="back-btn" onClick={goBack} aria-label="Back">
                ←
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div className="topbar-title">🦴 Ortho Assessment</div>
              {pathway && <div className="topbar-breadcrumb">{meta.label}{selectedRegions.length ? ` · ${regionLabelList(selectedRegions)}` : ""}</div>}
            </div>
            {step === 0 && onExit && (
              <button className="back-btn" onClick={onExit} aria-label="Close">
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {step === 0 && (
            <>
              <SectionIntro icon="🦴" title="Which pathway is this assessment for?" sub="This determines the base template — precautions and structure differ between a ward patient, a post-surgical rehab case, and an OPD visit." />
              <PickerList items={PATHWAYS} value={pathway} onSelect={setPathway} />
            </>
          )}

          {step === 1 && (
            <>
              <SectionIntro icon="🧭" title="Which region(s) are involved?" sub="Select every region you plan to examine — you can always pull in another region later from within ROM, MMT, or Special Tests." />
              <RegionPicker selectedRegions={selectedRegions} setSelectedRegions={setSelectedRegions} />
            </>
          )}

          {step === 2 && meta && isOutpatient && (
            <>
              <SectionIntro icon="🩺" title="How do you want to start?" sub="Condition-wise promotes relevant assessments automatically. General starts with the standard set. My Templates reuses a section list you've saved before." />
              <PickerList items={OPD_MODES} value={opdMode} onSelect={selectOpdMode} />

              {opdMode === "condition" && (
                <div style={{ marginTop: 16 }}>
                  <ConditionPicker
                    conditions={meta.conditions}
                    condition={condition}
                    setCondition={setCondition}
                    customLabel={customConditionLabel}
                    setCustomLabel={setCustomConditionLabel}
                  />
                </div>
              )}

              {opdMode === "templates" && (
                <div style={{ marginTop: 16 }}>
                  <TemplatePicker selected={selectedTemplate} onSelect={setSelectedTemplate} />
                </div>
              )}
            </>
          )}

          {step === 2 && meta && !isOutpatient && (
            <>
              <SectionIntro icon="🩺" title="What's the clinical context?" sub="This decides which assessments are promoted by default — nothing is ever locked, you can add or remove any assessment later." />
              <ConditionPicker
                conditions={meta.conditions}
                condition={condition}
                setCondition={setCondition}
                customLabel={customConditionLabel}
                setCustomLabel={setCustomConditionLabel}
              />
            </>
          )}
        </div>

        <div className="bottombar">
          {step > 0 && (
            <button className="ghost-btn" onClick={goBack}>
              Back
            </button>
          )}
          <button className="primary-btn" disabled={!canProceed} onClick={goNext}>
            {step === 2 ? "Start assessment" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatePicker({ selected, onSelect }) {
  const templates = getTemplates();
  if (!templates.length) {
    return (
      <div className="hint" style={{ padding: "8px 2px" }}>
        No saved templates yet — build out an assessment the way you like it, then tap "💾 Save as Template" from its Final Review screen.
      </div>
    );
  }
  return (
    <div className="picker-grid">
      {templates.map((t) => (
        <button key={t.id} type="button" className={"picker-card" + (selected?.id === t.id ? " selected" : "")} onClick={() => onSelect(t)}>
          <div className="picker-icon">📁</div>
          <div>
            <div className="picker-label">{t.name}</div>
            <div className="picker-desc">
              {[t.regionsLabel, t.conditionLabel].filter(Boolean).join(" · ")}
              {t.stepOrder ? ` · ${t.stepOrder.length} sections` : ""}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
