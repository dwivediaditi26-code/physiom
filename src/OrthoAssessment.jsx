import React, { useState } from "react";
import { SectionIntro, Hint } from "./orthoFieldKit.jsx";
import { PickerList, PickerIcon, ConditionPicker, RegionPicker, regionLabelList, AiJourneyDots } from "./orthoSetupKit.jsx";
import { getTemplates, saveTemplate, deleteTemplate } from "./orthoTemplates.js";
import { orthoStyles } from "./orthoStyles.js";
import OrthoIPDAssessment, { IPD_CONDITIONS } from "./OrthoIPDAssessment.jsx";
import OrthoPostOpAssessment, { POSTOP_CONDITIONS } from "./OrthoPostOpAssessment.jsx";
import OrthoOutpatientAssessment, { OUTPATIENT_CONDITIONS, buildOrthoAssessSteps } from "./OrthoOutpatientAssessment.jsx";
import OrthoAIIntakePanel from "./OrthoAIIntakePanel.jsx";
import { DemographicsSection } from "./orthoOutpatientSections.jsx";

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
   over and runs its own condition-driven step list. Live in
   production via OrthoAssessmentNew.jsx's thin wrapper (AppFull.jsx's
   Clinical > Assessment > Ortho card) — the "standalone, not wired
   in" claim this comment used to make was stale and wrong; it's also
   reachable directly via ortho-preview.html for isolated review.
   ============================================================ */

const PATHWAYS = [
  { id: "ipd", icon: "ti-building-hospital", label: "IPD", desc: "Inpatient ward assessment" },
  { id: "postop", icon: "ti-bed", label: "Post-operative Rehab", desc: "Structured post-surgical rehabilitation" },
  { id: "outpatient", icon: "ti-walk", label: "Outpatient / Musculoskeletal", desc: "OPD / clinic-based MSK assessment" },
];

const PATHWAY_META = {
  ipd: { Component: OrthoIPDAssessment, conditions: IPD_CONDITIONS, label: "IPD" },
  postop: { Component: OrthoPostOpAssessment, conditions: POSTOP_CONDITIONS, label: "Post-operative Rehab" },
  outpatient: { Component: OrthoOutpatientAssessment, conditions: OUTPATIENT_CONDITIONS, label: "Outpatient / Musculoskeletal" },
};

// Where each pathway's own saveAssessment() (OrthoOutpatient/IPD/PostOpAssessment.jsx)
// autosaves its snapshot on the patient record -- same keys SpecialtyPatientProfile.jsx
// reads to build the "✏️ Edit" button's `resume` object.
const ORTHO_SNAPSHOT_KEYS = { outpatient: "ortho_outpatient_assessment", ipd: "ortho_ipd_assessment", postop: "ortho_postop_assessment" };

// All 5 stages are jumpable from here, including AI Objective/Summary
// (3-4) -- those used to render as plain, unclickable labels because the
// wizard they live in only mounted once Subjective was finished. Jumping
// to them now (handleJourneyJump, below) mounts the wizard straight onto
// that stage instead, leaving Subjective blank rather than gating on it
// (2026-09-16, Aditi: "should be activated and can be clicked on it even
// if the subjective assessment is not filled").
const AI_PRE_WIZARD_JUMPABLE = new Set([0, 1, 2, 3, 4]);

const OPD_MODES = [
  { id: "condition", icon: "ti-stethoscope", label: "Condition-wise", desc: "Pick a clinical context — promotes relevant assessments automatically" },
  { id: "general", icon: "ti-clipboard-list", label: "General Assessment", desc: "Quick standard OPD assessment — the core sections only" },
  { id: "advanced", icon: "ti-clipboard-check", label: "Advanced Assessment", desc: "Everything included — Kinetic Chain, CPA, STTT, Functional Movement, Palpation, Sessions, Home Protocol and more" },
  { id: "templates", icon: "ti-folder", label: "My Templates", desc: "Reuse a section list you saved from a previous assessment" },
];

export default function OrthoAssessment({ onExit, onNav, navContext, onSave, activePatientId, requireAuth, entryMode, patientData, resume, hideAiPathway } = {}) {
  // resume (2026-09-02, Aditi: "edit assessment... should take us to last
  // page of assessment summary and review, not to pathway selection or
  // region selection") -- SpecialtyPatientProfile.jsx's "Edit" button
  // passes { pathway, selectedRegions, condition, customConditionLabel,
  // data } rebuilt from the patient's own saved assessment snapshot, so
  // this skips straight to step 3 with that exact original selection
  // instead of making the therapist re-answer pathway/region/condition
  // for an assessment that's already fully answered. The pathway
  // Component itself (OrthoOutpatient/IPD/PostOpAssessment) gets
  // initialData=resume.data and initialStep="review" so it opens already
  // on the Review screen, not step 0 of its own internal wizard.
  // entryMode ("ai" | "template") comes from the honest "New Assessment"
  // picker (AppFull.jsx) -- Outpatient is the only pathway that picker
  // offers today, so both shortcuts force pathway=outpatient and skip
  // straight past the pathway-type and condition/mode screens (nothing to
  // choose there yet), landing the therapist on region selection -- the one
  // question that genuinely can't be skipped -- then straight into the
  // wizard. Reached the normal way (no entryMode, no resume), nothing changes.
  // Reload-resume (2026-09-24, Aditi: "whatever page we are it should be we
  // are stuck there... even if reload") -- this screen's own pathway/
  // region/condition picker (steps 0-2) has no history/URL binding, so a
  // genuine page reload while already inside the wizard (step 3) used to
  // remount this component back at step 0 with no memory of which pathway/
  // region/condition got it there, even though `resume` already solves the
  // exact same problem for the "✏️ Edit" button (SpecialtyPatientProfile.jsx
  // builds it from a saved snapshot). `navContext.wizardStep` is the one
  // thing that DOES survive a reload here (useWizardStepHistory.js pushes
  // it into the same navContext object AppFull.jsx already persists to
  // localStorage) -- its mere presence means the wizard was already reached
  // this session, so `patientData.care_setting` (mirrored by every
  // pathway's own saveAssessment() on its 2s autosave) says which pathway
  // that was, and that pathway's own autosaved snapshot has everything else
  // needed to rebuild the exact same resume object the Edit button would
  // have built -- computed once at mount, not on every render, since
  // `patientData` itself changes on every keystroke once the wizard is up.
  const [reloadResume] = useState(() => {
    if (resume || entryMode || !navContext?.wizardStep) return null;
    const reloadPathway = patientData?.care_setting;
    const snapshotKey = reloadPathway && ORTHO_SNAPSHOT_KEYS[reloadPathway];
    if (!snapshotKey) return null;
    try {
      const snap = JSON.parse(patientData?.[snapshotKey] || "null");
      if (!snap) return null;
      return {
        pathway: reloadPathway,
        selectedRegions: snap.selectedRegions || [],
        condition: snap.rawCondition || "general",
        customConditionLabel: snap.customConditionLabel,
        data: snap.data || {},
      };
    } catch { return null; }
  });
  const effectiveResume = resume || reloadResume;
  const [step, setStep] = useState(effectiveResume ? 3 : entryMode ? 1 : 0); // 0 pathway, 1 region, 2 condition, 3 assessment
  const [pathway, setPathway] = useState(effectiveResume ? effectiveResume.pathway : entryMode ? "outpatient" : null);
  const [selectedRegions, setSelectedRegions] = useState(effectiveResume ? effectiveResume.selectedRegions || [] : []);
  const [condition, setCondition] = useState(effectiveResume ? effectiveResume.condition || "general" : entryMode ? "general" : null);
  const [customConditionLabel, setCustomConditionLabel] = useState(effectiveResume?.customConditionLabel || "");
  const [opdMode, setOpdMode] = useState(entryMode ? "general" : null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // "✨ AI Assisted Assessment" as a 4th pathway-screen option, alongside
  // IPD/Post-op/Outpatient -- same shortcut the "New Assessment" picker's
  // "Start with AI" gives, just reachable without leaving this screen too.
  const [pickedAi, setPickedAi] = useState(false);
  const effectiveEntryMode = entryMode || (pickedAi ? "ai" : null);
  // The AI-assisted path's actual front pages: Demographics, then Region,
  // then Subjective (write/speak it, or skip to manual) -- all still under
  // step===1 (previously just the region screen), switched between by
  // aiSubStep so the rest of the step machine (0 pathway, 1 [demographics/
  // region/subjective], 3 mount) stays unchanged. 2026-09-16, Aditi: "first
  // show demographic data... then region then subjective... then the AI
  // objective page... summary/problem list/goals/treatment" -- Demographics
  // and Region collected here feed straight into the wizard's initial data
  // (see mount call below and AI_ENTRY_SKIP_IDS in OrthoOutpatientAssessment.jsx),
  // which is skipped past on mount instead of asking again.
  const [aiSubStep, setAiSubStep] = useState(0); // 0 demographics, 1 region, 2 subjective
  const [aiDemographicsData, setAiDemographicsData] = useState({});
  const [aiIntakeDone, setAiIntakeDone] = useState(false);
  const [pendingAiUpdates, setPendingAiUpdates] = useState(null);
  const [aiSuggestedRegions, setAiSuggestedRegions] = useState([]);
  // Which of the Subjective screen's two equal-weight cards (🎙 AI Parse /
  // ✍ Manual) is showing -- null is the chooser itself; "ai" reveals the
  // real intake panel inline.
  const [subjectiveChoice, setSubjectiveChoice] = useState(null);

  // One path for both AI-intake sources (a parsed narrative and an imported
  // old record): seed Subjective/Pain, and pre-tick whatever region(s) that
  // source already names (2026-09-03, Aditi: "I already told about the
  // region... when we go to the next page we should be able to see that this
  // region is selected"). Nothing is locked -- the RegionPicker (already
  // done by this point) lets an AI-suggested region be unticked, given a
  // different side, or joined by any other region. Subjective is now the
  // last pre-wizard phase (2026-09-16 reorder), so finishing it mounts the
  // wizard immediately -- nothing left to ask before then.
  // AI Objective(3)/Summary(4) used to render as plain, unclickable labels
  // on the pre-wizard Demographics/Region/Subjective screens -- the wizard
  // component (which those two stages actually live in) only ever mounted
  // once Subjective was finished, so there was no page to jump to yet
  // (2026-09-16, Aditi: "it should not be the way... should be activated
  // and can be clicked on it even if the subjective assessment is not
  // filled"). Mounts the wizard right now, straight onto that stage,
  // leaving Subjective (and anything else not yet filled) simply blank --
  // nothing here requires it, and the wizard's own dots still let you come
  // back to fill it later. Whatever Demographics/Region data was already
  // entered still carries over via aiDemographicsData/selectedRegions below.
  const [pendingInitialStep, setPendingInitialStep] = useState(undefined);
  function jumpToWizardStage(targetStepId) {
    setPathway("outpatient");
    setCondition("general");
    setOpdMode("general");
    setPickedAi(true);
    setPendingInitialStep(targetStepId);
    setStep(3);
  }
  function handleJourneyJump(i) {
    if (i <= 2) { setAiSubStep(i); return; }
    jumpToWizardStage(i === 3 ? "objectiveAI" : "functionalAssessment");
  }

  function applyIntakeUpdates(updates) {
    setPendingAiUpdates(updates);
    const suggested = (updates?.regions || []).filter((r) => r && r.id);
    if (suggested.length) {
      setAiSuggestedRegions(suggested);
      setSelectedRegions((prev) => {
        const next = [...prev];
        suggested.forEach((r) => {
          if (!next.some((x) => x.id === r.id)) next.push({ id: r.id, side: r.side || "" });
        });
        return next;
      });
    }
    setAiIntakeDone(true);
    setStep(3);
  }

  function restart() {
    setStep(entryMode ? 1 : 0);
    setPathway(entryMode ? "outpatient" : null);
    setSelectedRegions([]);
    setCondition(entryMode ? "general" : null);
    setCustomConditionLabel("");
    setOpdMode(entryMode ? "general" : null);
    setSelectedTemplate(null);
    setPickedAi(false);
    setAiSubStep(0);
    setAiDemographicsData({});
    setAiIntakeDone(false);
    setPendingAiUpdates(null);
    setAiSuggestedRegions([]);
    setSubjectiveChoice(null);
    setPendingInitialStep(undefined);
  }

  function selectAiAssisted() {
    setPathway("outpatient");
    setCondition("general");
    setOpdMode("general");
    setPickedAi(true);
    setAiSubStep(0);
    setAiDemographicsData({});
    setAiIntakeDone(false);
    setPendingAiUpdates(null);
    setAiSuggestedRegions([]);
    setSubjectiveChoice(null);
    setPendingInitialStep(undefined);
    setStep(1);
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
        onNav={onNav}
        navContext={navContext}
        onSave={onSave}
        activePatientId={activePatientId}
        patientData={patientData}
        requireAuth={requireAuth}
        initialAiUpdates={
          effectiveEntryMode === "ai" && aiDemographicsData.demographics
            ? { ...pendingAiUpdates, demographics: { ...pendingAiUpdates?.demographics, ...aiDemographicsData.demographics } }
            : pendingAiUpdates
        }
        entryMode={effectiveEntryMode}
        initialData={effectiveResume?.data}
        initialStep={pendingInitialStep || (resume ? resume.initialStep || "review" : undefined)}
      />
    );
  }

  const canProceedPathway = step !== 0 || !!pathway;
  const canProceedRegion =
    step !== 1 ||
    (effectiveEntryMode === "ai" ? aiSubStep !== 1 || selectedRegions.length > 0 : selectedRegions.length > 0);
  const canProceedCondition =
    step !== 2 ||
    (isOutpatient
      ? (opdMode === "condition" && !!condition) || opdMode === "general" || opdMode === "advanced" || (opdMode === "templates" && !!selectedTemplate)
      : !!condition);
  const canProceed = canProceedPathway && canProceedRegion && canProceedCondition;

  const meta = pathway ? PATHWAY_META[pathway] : null;

  function goNext() {
    // Demographics(0) -> Region(1) -> Subjective(2); Subjective mounts itself
    // once done (applyIntakeUpdates / the Manual card), so this only ever
    // advances the first two sub-phases.
    if (effectiveEntryMode && step === 1) { setAiSubStep((s) => Math.min(s + 1, 2)); return; }
    if (step < 2) setStep(step + 1);
    else setStep(3);
  }
  function goBack() {
    if (effectiveEntryMode && step === 1 && aiSubStep > 0) { setAiSubStep((s) => s - 1); return; }
    if (step > 0) setStep(step - 1);
  }

  function selectOpdMode(id) {
    setOpdMode(id);
    setCondition(null);
    setCustomConditionLabel("");
    setSelectedTemplate(null);
    if (id === "general") setCondition("general");
    if (id === "advanced") setCondition("advanced");
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
            {((step === 0 && !effectiveEntryMode) || (step === 1 && effectiveEntryMode)) && onExit && (
              <button className="back-btn" onClick={onExit} aria-label="Close">
                ✕
              </button>
            )}
          </div>
          {step === 1 && effectiveEntryMode === "ai" && (
            <AiJourneyDots activeIndex={aiSubStep} onJump={handleJourneyJump} jumpableIndices={AI_PRE_WIZARD_JUMPABLE} />
          )}
        </div>

        <div className="content">
          {step === 0 && (
            <>
              <SectionIntro title="Which pathway is this assessment for?" sub="This determines the base template — precautions and structure differ between a ward patient, a post-surgical rehab case, and an OPD visit." />
              <PickerList items={PATHWAYS} value={pathway} onSelect={setPathway} />
              {!hideAiPathway && (
                <button type="button" className="picker-card picker-card-ai" onClick={selectAiAssisted} style={{ width: "100%", marginTop: 8 }}>
                  <PickerIcon icon="ti-sparkles" />
                  <div>
                    <div className="picker-label">AI Assisted Assessment</div>
                    <div className="picker-desc">Say the assessment in your own words — AI fills Subjective and suggests Objective tests. Uses the Outpatient workflow.</div>
                  </div>
                </button>
              )}
            </>
          )}

          {/* Plain (non-AI) entry never sets aiSubStep, so none of the three
              aiSubStep-gated blocks below ever matched it -- this block was
              dropped when those got split out of the single shared region
              step, leaving step 1 blank for every ordinary IPD/Post-op/
              Outpatient pick (2026-09-16, Aditi: "the regions is nothing
              showing"). Restored as its own branch instead of folding back
              into the aiSubStep machinery, since it isn't an AI sub-step at
              all. */}
          {step === 1 && !effectiveEntryMode && (
            <>
              <SectionIntro
                icon="🧭"
                title="Which region(s) are involved?"
                sub="Select every region you plan to examine — you can always pull in another region later from within ROM, MMT, or Special Tests."
              />
              {aiSuggestedRegions.length > 0 && (
                <Hint>
                  ✨ Pre-selected from what you already told us: <b>{regionLabelList(aiSuggestedRegions)}</b> — check it's right, then add, remove, or change the side below.
                </Hint>
              )}
              <RegionPicker
                selectedRegions={selectedRegions}
                setSelectedRegions={setSelectedRegions}
                excludeIds={isOutpatient ? ["upperArm", "forearm", "thigh", "leg", "wholeBody", "multiple"] : undefined}
              />
            </>
          )}

          {step === 1 && effectiveEntryMode === "ai" && aiSubStep === 0 && (
            <>
              <DemographicsSection data={aiDemographicsData} setData={setAiDemographicsData} />
            </>
          )}

          {step === 1 && effectiveEntryMode === "ai" && aiSubStep === 1 && (
            <>
              <SectionIntro
                icon="🧭"
                title="Body Region"
                sub="What area are you assessing? Select up to 3 — you can always pull in another region later from within ROM, MMT, or Special Tests."
              />
              {aiSuggestedRegions.length > 0 && (
                <Hint>
                  ✨ Pre-selected from what you already told us: <b>{regionLabelList(aiSuggestedRegions)}</b> — check it's right, then add, remove, or change the side below.
                </Hint>
              )}
              <RegionPicker
                selectedRegions={selectedRegions}
                setSelectedRegions={setSelectedRegions}
                excludeIds={isOutpatient ? ["upperArm", "forearm", "thigh", "leg", "wholeBody", "multiple"] : undefined}
              />
              <div className="hint" style={{ marginTop: 12, fontStyle: "normal", fontWeight: 700, color: selectedRegions.length > 3 ? "#B45309" : undefined }}>
                Selected {selectedRegions.length}/3{selectedRegions.length > 3 ? " — that's fine, just more than a quick screen usually needs" : ""}
              </div>
            </>
          )}

          {step === 1 && effectiveEntryMode === "ai" && aiSubStep === 2 && (
            <>
              <SectionIntro icon="✨" title="Subjective" sub="How would you like to enter it?" />
              {subjectiveChoice !== "ai" && (
                <>
                  <div className="ai-choice-grid">
                    <button type="button" className="ai-choice-card ai-choice-primary" onClick={() => setSubjectiveChoice("ai")}>
                      <div className="ai-choice-icon">🎙</div>
                      <div className="ai-choice-body">
                        <div className="ai-choice-title">AI Parse</div>
                        <div className="ai-choice-desc">Speak or write your notes — AI converts them into structured subjective data.</div>
                      </div>
                      <div className="ai-choice-cta">Start →</div>
                    </button>
                    <button type="button" className="ai-choice-card" onClick={() => { setAiIntakeDone(true); setStep(3); }}>
                      <div className="ai-choice-icon">✍️</div>
                      <div className="ai-choice-body">
                        <div className="ai-choice-title">Manual</div>
                        <div className="ai-choice-desc">Enter the history yourself, right in the Subjective step.</div>
                      </div>
                      <div className="ai-choice-cta">Enter →</div>
                    </button>
                  </div>
                  <div className="hint" style={{ marginTop: 14 }}>ⓘ You can edit everything AI generates before continuing.</div>
                </>
              )}
              {subjectiveChoice === "ai" && (
                <>
                  <button type="button" className="ghost-btn" style={{ marginBottom: 14 }} onClick={() => setSubjectiveChoice(null)}>
                    ← Choose a different way
                  </button>
                  <OrthoAIIntakePanel
                    defaultOpen
                    requireAuth={requireAuth}
                    onApply={(updates) => { applyIntakeUpdates(updates); }}
                  />
                </>
              )}
            </>
          )}

          {step === 2 && meta && isOutpatient && (
            <>
              <SectionIntro icon="🩺" title="How do you want to start?" sub="Condition-wise promotes relevant assessments automatically. General starts with just the core set. Advanced includes every objective tool. My Templates reuses a section list you've saved before." />
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

        {!(step === 1 && effectiveEntryMode === "ai" && aiSubStep === 2) && (
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
        )}
      </div>
    </div>
  );
}

// Sections that don't make sense to hand-pick when building a template from
// scratch: pseudo/AI-only steps and ones already retired from the live step
// list (still in STEP_META for old records, see OrthoOutpatientAssessment.jsx).
// "review" is left out of the checklist itself but always appended to the
// saved stepOrder, since a template without a Final Review step would have
// nowhere to actually save from.
const TEMPLATE_COMPOSER_EXCLUDED_IDS = new Set(["region", "suggest", "objectiveAI", "techniques", "exercisePrescription", "review"]);

function TemplatePicker({ selected, onSelect }) {
  const [templates, setTemplates] = useState(() => getTemplates());
  const [composerOpen, setComposerOpen] = useState(false);

  function handleDelete(id) {
    deleteTemplate(id);
    setTemplates(getTemplates());
    if (selected?.id === id) onSelect(null);
  }

  return (
    <>
      <div className="picker-grid">
        <button type="button" className="picker-card" onClick={() => setComposerOpen(true)}>
          <div className="picker-icon">➕</div>
          <div>
            <div className="picker-label">Create New Template</div>
            <div className="picker-desc">Tick sections from the assessment list — no need to run a full assessment first</div>
          </div>
        </button>
        {templates.map((t) => (
          <div key={t.id} className={"picker-card" + (selected?.id === t.id ? " selected" : "")} style={{ cursor: "default" }}>
            <div className="picker-icon">📁</div>
            <div style={{ flex: 1 }}>
              <div className="picker-label">{t.name}</div>
              <div className="picker-desc">
                {[t.regionsLabel, t.conditionLabel].filter(Boolean).join(" · ")}
                {t.stepOrder ? ` · ${t.stepOrder.length} sections` : ""}
              </div>
            </div>
            <button type="button" className="ghost-btn" style={{ padding: "8px 12px" }} onClick={() => onSelect(t)}>
              {selected?.id === t.id ? "Selected ✓" : "Use"}
            </button>
            <button type="button" className="ghost-btn" style={{ padding: "8px 10px" }} aria-label="Delete template" onClick={() => handleDelete(t.id)}>
              🗑
            </button>
          </div>
        ))}
      </div>
      {!templates.length && (
        <div className="hint" style={{ padding: "10px 2px 2px" }}>
          Or build out a live assessment the way you like it and tap "💾 Save as Template" from its Final Review screen.
        </div>
      )}
      {composerOpen && (
        <TemplateComposer
          onClose={() => setComposerOpen(false)}
          onSaved={(entry) => {
            setTemplates(getTemplates());
            setComposerOpen(false);
            onSelect(entry);
          }}
        />
      )}
    </>
  );
}

function TemplateComposer({ onClose, onSaved }) {
  const library = buildOrthoAssessSteps().filter((s) => !TEMPLATE_COMPOSER_EXCLUDED_IDS.has(s.id));
  const [checked, setChecked] = useState(new Set());
  const [name, setName] = useState("");

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    const stepOrder = [...library.filter((s) => checked.has(s.id)).map((s) => s.id), "review"];
    onSaved(saveTemplate({ name, stepOrder, regionsLabel: "", conditionLabel: "Custom template" }));
  }

  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">➕ Create New Template</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-modal-body">
        <div className="text-input-wrap" style={{ marginBottom: 14 }}>
          <input className="text-input" autoFocus placeholder="Template name, e.g. Knee OA — quick clinic visit" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Tick every section this template should include — pulled straight from the Ortho assessment list. "Final Review" is always added automatically.
        </div>
        <div className="ct-group">
          {library.map((s) => {
            const isChecked = checked.has(s.id);
            return (
              <button type="button" key={s.id} className={"ct-item" + (isChecked ? " ct-item-checked" : "")} onClick={() => toggle(s.id)}>
                <span className="ct-checkbox">{isChecked ? "☑" : "☐"}</span>
                <span>
                  {s.icon} {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" disabled={!name.trim() || checked.size === 0} onClick={handleSave}>
          Save Template
        </button>
      </div>
    </div>
  );
}
