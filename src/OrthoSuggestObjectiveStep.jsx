import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SectionIntro, Hint, useSectionData, BRAND } from "./orthoFieldKit.jsx";
import { suggestObjectiveTests } from "./orthoObjectiveSuggestions.js";
import { OBJECTIVE_CONTENT } from "./orthoObjectiveContent.js";
import { suggestIndividualItems, defaultSideFor, romWhy, romHow, mmtWhy, mmtHow, specialWhy, specialHow, obsWhy, obsHow } from "./orthoIndividualSuggestions.js";
import { ALL_REGIONS } from "./orthoRegionLibrary.js";
import { RESTRICTION_GRADE, MMT_GRADES } from "./orthoClinicalData.js";

function groupByRegion(items, selectedRegions) {
  if (selectedRegions.length <= 1) return null;
  const groups = new Map();
  items.forEach((item) => {
    const key = item.regionKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const regionLabel = (key) => {
    const r = selectedRegions.find((r) => r.id === key) || ALL_REGIONS.find((r) => r.id === key);
    return r ? r.label : key;
  };
  return [...groups.entries()].map(([key, items]) => ({ key, label: regionLabel(key), items }));
}
// The Objective item cards below render the EXACT same controls and info
// sheets the full ROM/MMT/Special Tests pages do (2026-09-03, Aditi:
// "objective assessment info cards are not showing the way it normally does
// in ortho info cards -- it has made their own info cards. I want it same as
// it is normally presented"). Everything visual here is now imported from
// orthoRegionAssessments.jsx rather than re-implemented, so the two screens
// cannot drift apart again.
import { RomMovementCard, GradeSelect, romInfoText, romRichItem, mmtInfoText, mmtRichItem, specialRichItem, isPositiveResult } from "./orthoRegionAssessments.jsx";
import { PalpationSection } from "./orthoOutpatientSections.jsx";
import { palpationFocusZoneIds, palpationZonesForRegions } from "./orthoPalpationData.js";
import { InfoButton } from "./orthoFieldKit.jsx";
import { contentKeyForRegion } from "./orthoSubjectiveRegionData.js";
import { runLumbarDifferential, hasLumbarChecklistData, lumbarConditionItemIds } from "./orthoLumbarReasoning.js";
import { runCervicalDifferential, hasCervicalChecklistData, cervicalConditionItemIds } from "./orthoCervicalReasoning.js";
import { runThoracicDifferential, hasThoracicChecklistData, thoracicConditionItemIds } from "./orthoThoracicReasoning.js";
import { runShoulderDifferential, hasShoulderChecklistData, shoulderConditionItemIds } from "./orthoShoulderReasoning.js";
import { runHipDifferential, hasHipChecklistData, hipConditionItemIds } from "./orthoHipReasoning.js";
import { runKneeDifferential, hasKneeChecklistData, kneeConditionItemIds } from "./orthoKneeReasoning.js";
import { runAnkleFootDifferential, hasAnkleFootChecklistData, ankleFootConditionItemIds } from "./orthoAnkleFootReasoning.js";
import { runElbowWristHandDifferential, hasElbowWristHandChecklistData, elbowWristHandConditionItemIds } from "./orthoElbowWristHandReasoning.js";
import { CpaSection, KineticChainSection, FmaSection, SttSection, FasciaSection } from "./orthoAdvancedTools.jsx";
import { MEASURES, suggestMeasures } from "./orthoOutcomeMeasureData.js";

/* ============================================================
   OrthoSuggestObjectiveStep — Objective Assessment as a list of
   fillable items, not a picker for whole categories. For the four
   categories with a real named-item library (Observation/ROM/MMT/
   Special Tests), each individual item (e.g. "Lachman's Test",
   "Quadriceps", "Knee flexion", "Scapula") gets its own card with
   an (i) info button and its real inline answer control -- writing straight
   into the exact field the full ROM/MMT/Special Tests/Observation
   page reads, via the same useSectionData sections those pages use.
   Everything else (edema, neuro screen, kinetic chain, ...) doesn't
   have that same per-item library, so it stays a whole-category
   suggestion card, same as before.
   ============================================================ */

function Sheet({ open, onClose, eyebrow, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-eyebrow">{eyebrow}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {title && <div className="sheet-title">{title}</div>}
        <div className="sheet-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// One combined sheet per item -- Why (whyLines) and How (howLines) stacked
// under one (i) trigger, instead of two separate "Why?"/"How?" text links.
function LineInfoSheet({ open, onClose, label, whyLines, howLines, howEyebrow = "How to perform" }) {
  const whyEmpty = Array.isArray(whyLines) ? whyLines.length === 0 : !whyLines;
  const howEmpty = !howLines || howLines.length === 0;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="ABOUT THIS TEST" title={label}>
      {whyEmpty && howEmpty ? (
        <Hint>No additional reference notes for this one yet.</Hint>
      ) : (
        <>
          {!whyEmpty && (
            <>
              <div className="subheading" style={{ marginTop: 0 }}>Why this test</div>
              {Array.isArray(whyLines) ? (
                <ul className="obj-what-list">
                  {whyLines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              ) : (
                <p className="obj-why-text">{whyLines}</p>
              )}
            </>
          )}
          {!howEmpty && (
            <>
              <div className="subheading">{howEyebrow}</div>
              <ul className="obj-what-list">
                {howLines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------- Whole-category cards (edema, neuroScreen, kineticChain, ...) ---------- */

// Same merge for the whole-category cards -- one (i) trigger opens why +
// what-it-tells-you + the structured how-to-perform detail together.
function InfoSheet({ open, onClose, label, content }) {
  const how = content?.how;
  const isEmpty = !content?.why && !content?.what?.length && !how;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="ABOUT THIS ASSESSMENT" title={label}>
      {isEmpty ? (
        <Hint>No additional reference notes for this one yet.</Hint>
      ) : (
        <>
          {content?.why && <p className="obj-why-text">{content.why}</p>}
          {content?.what?.length > 0 && (
            <>
              <div className="subheading" style={{ marginTop: 4 }}>What it tells you</div>
              <ul className="obj-what-list">
                {content.what.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </>
          )}
          {how && (
            <>
              <div className="subheading">How to perform</div>
              <div className="obj-how-row">
                <div className="obj-how-label">Purpose</div>
                <div className="obj-how-val">{how.purpose}</div>
              </div>
              <div className="obj-how-row">
                <div className="obj-how-label">Position</div>
                <div className="obj-how-val">{how.position}</div>
              </div>
              {how.needs?.length > 0 && (
                <div className="obj-how-row">
                  <div className="obj-how-label">What you need</div>
                  <ul className="obj-what-list">
                    {how.needs.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {how.steps?.length > 0 && (
                <div className="obj-how-row">
                  <div className="obj-how-label">Steps</div>
                  <ol className="obj-steps-list">
                    {how.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

// Key for the persisted objectiveSelection map -- one key per named
// Observation/ROM/MMT/Special Test item, shared by the item card that owns
// it and the top-level findings/tray/review logic below.
function itemKey(type, regionKey, itemId) {
  return `${type}:${regionKey}:${itemId}`;
}

const MATCH_TIER_TONE = {
  "Strong match": "#16a34a",
  "Possible match": "#d97706",
  "Weak match": "#6b7280",
  "Insufficient data": "#9ca3af",
  "Unlikely": "#9ca3af",
};

// Real match percentage from lumbarReasoningEngine.js's own count -- not a
// new score, just supportingMatched/supportingTotal expressed as a percent
// for the card badge.
function conditionMatchPct(condition) {
  const total = condition.supportingTotal;
  if (!total) return null;
  return Math.round((condition.supportingMatched.length / total) * 100);
}

/* Possible-Matches row -- the same real L01-L11 differential from
   lumbarReasoningEngine.js (via orthoLumbarReasoning.js), now shown as
   compact swipeable condition cards (name + match %) instead of a stack of
   always-expandable rows. Purely informational: tapping a card only swaps
   which condition's supporting/refuting detail is shown below -- it never
   adds or removes anything from the objective list itself. */
function ConditionMatchRow({ conditions, activeId, onSelect }) {
  return (
    <div className="obj-match-row">
      {conditions.map((c) => {
        const pct = conditionMatchPct(c);
        return (
          <button
            type="button"
            key={c.id}
            className={"obj-match-card" + (activeId === c.id ? " obj-match-card-active" : "")}
            onClick={() => onSelect(c.id === activeId ? null : c.id)}
          >
            {pct != null ? <span className="obj-match-pct">{pct}%</span> : <span className="obj-match-pct" style={{ color: MATCH_TIER_TONE[c.matchTier] }}>{c.matchTier}</span>}
            <span className="obj-match-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const MODULE_DOT = {
  observation: "#7C3AED",
  posture: "#3B82F6",
  fma: "#16A34A",
  cyriax_full: "#0D9488",
  nkt: "#D97706",
  kinetic: "#4F46E5",
  fascia: "#EC4899",
  outcome: "#6B7280",
  palpation: "#DC2626",
  special: "#8B5CF6",
  rom: "#059669",
};

const MODULE_TITLE = {
  observation: "WHAT TO LOOK FOR",
  posture: "POSTURE FOCUS",
  fma: "FUNCTIONAL SCREEN",
  cyriax_full: "SELECTIVE TENSION",
  nkt: "NEUROMUSCULAR TESTS",
  kinetic: "CHAIN LINKS",
  fascia: "FASCIAL LINES",
  outcome: "OUTCOME MEASURES",
  palpation: "FOCUS ZONES",
  special: "KEY TESTS",
  rom: "ROM FOCUS",
};

function splitDetailToChecks(detail) {
  if (!detail) return [];
  return detail.split(/[;,]/).map((s) => s.trim()).filter((s) => s.length > 2);
}

// FMA / Fascia / STTT / Kinetic Chain / CPA each already have a full, real
// section further down this same screen (FmaSection, FasciaSection,
// SttSection, KineticChainSection, CpaSection) with their own per-test info
// buttons and structured entry fields. Turning their one-line condition
// guidance into generic checkboxes would let a therapist "tick" a test that
// was never actually performed, so these keys don't get checkboxes at all --
// the module card just explains why they matter here and activates the real
// section (same activeIds/onToggle switch the rest of this page uses).
const MODULE_REDIRECT = {
  fma: { activeId: "fma", cta: "Open Functional Movement Screen" },
  fascia: { activeId: "fascia", cta: "Open Fascia Assessment" },
  cyriax_full: { activeId: "sttt", cta: "Open STTT (Cyriax)" },
  kinetic: { activeId: "kineticChain", cta: "Open Kinetic Chain Screen" },
  nkt: { activeId: "cpa", cta: "Open CPA" },
};

// ROM / Special Tests / Palpation are always rendered further down as soon
// as a region is picked -- there's no separate activation step for these --
// so the module card just points at where to find them.
const MODULE_ALWAYS_SHOWN = {
  rom: "the Range of Motion section below",
  special: "the Special Tests section below",
  palpation: "the Palpation section below",
};

// Instrument names as authored in conditionLayers.outcome ("Neck Disability
// Index (NDI); PSFS; NPRS") aren't all wired up as a fillable instrument in
// MEASURES yet. Match what we can to the real measure id so the module card
// can point at the same fill-in/score/save flow used everywhere else on this
// screen; anything unmatched is named as plain reference text rather than a
// checkbox that would falsely suggest a tap alone completes it.
const OUTCOME_ALIASES = {
  ndi: ["ndi", "neck disability index"],
  lumbarDisability: ["odi", "oswestry", "roland-morris", "rmdq", "lumbar disability"],
  spadi: ["spadi"],
  oks: ["oxford knee score", "oks"],
  oxfordHip: ["oxford hip score"],
  quickDash: ["quickdash", "dash"],
  faam: ["faam"],
  lefs: ["lefs"],
  psfs: ["psfs"],
};

function matchOutcomeMeasures(detail) {
  if (!detail) return { matchedIds: [], unmatched: [] };
  const parts = detail.split(/[;,]|\+/).map((s) => s.trim()).filter(Boolean);
  const matchedIds = [];
  const unmatched = [];
  parts.forEach((part) => {
    const low = part.toLowerCase();
    const hit = Object.entries(OUTCOME_ALIASES).find(([, aliases]) => aliases.some((a) => low.includes(a)));
    if (hit) { if (!matchedIds.includes(hit[0])) matchedIds.push(hit[0]); }
    else unmatched.push(part);
  });
  return { matchedIds, unmatched };
}

const MODULE_INFO = {
  observation: { why: "Systematic visual scan before hands-on assessment to identify posture deviations, swelling, muscle wasting, skin changes, and movement patterns that point toward the suspected condition.", what: ["Muscle guarding or spasm patterns", "Swelling, bruising, or skin changes", "Resting limb posture and alignment", "Willingness to move / antalgic behaviour"] },
  posture: { why: "Sustained postural faults load specific structures and maintain pain cycles. Identifying them guides corrective exercise and ergonomic advice.", what: ["Static alignment in standing and sitting", "Regional vs global postural deviation", "Load-transfer patterns through the kinetic chain"] },
  fma: { why: "Functional movement screening identifies movement-system impairments that standard ROM/MMT may miss — compensations, motor-control deficits, and movement-pattern faults.", what: ["Quality of movement patterns under load", "Asymmetries between sides", "Compensatory strategies during functional tasks", "Motor-control deficits vs mobility deficits"] },
  cyriax_full: { why: "Cyriax selective-tissue-tension testing systematically differentiates contractile from non-contractile structures by comparing active, passive, and resisted movements.", what: ["Capsular vs non-capsular restriction patterns", "Contractile vs inert tissue involvement", "End-feel classification for each movement", "Pain-resistance sequence"] },
  nkt: { why: "Clinical Prediction Analysis identifies neuromuscular compensation patterns — which muscles are facilitated (overactive) vs inhibited (underactive) — to guide corrective activation.", what: ["Facilitated vs inhibited muscle pairs", "Compensation patterns across regions", "Motor-control retraining priorities"] },
  kinetic: { why: "The kinetic chain screen assesses mobility and stability at each joint in the movement chain, identifying the source of dysfunction that may be remote from the site of symptoms.", what: ["Joint-by-joint mobility/stability balance", "Regional interdependence patterns", "Proximal-to-distal force-transfer efficiency"] },
  fascia: { why: "Fascial-line assessment identifies myofascial continuity restrictions that may refer symptoms or limit movement along anatomical trains.", what: ["Superficial vs deep fascial restrictions", "Myofascial line involvement (e.g. superficial back line, lateral line)", "Fascial glide and extensibility"] },
  outcome: { why: "Standardised outcome measures track patient progress objectively and support evidence-based clinical decision-making.", what: ["Baseline severity scoring", "Minimal clinically important difference (MCID) targets", "Patient-reported vs clinician-measured outcomes"] },
  palpation: { why: "Targeted palpation confirms tissue-level pathology suggested by the movement exam — tenderness, texture changes, temperature, and structural integrity.", what: ["Point tenderness localisation", "Tissue texture and tone abnormalities", "Temperature and swelling assessment", "Structural integrity and crepitus"] },
  special: { why: "Specific orthopaedic tests confirm or rule out the suspected diagnosis with known sensitivity and specificity values.", what: ["Diagnostic accuracy (sensitivity/specificity)", "Cluster testing for improved confidence", "Positive vs negative likelihood ratios"] },
  rom: { why: "Range-of-motion assessment quantifies movement restriction and identifies the pattern of limitation to guide treatment.", what: ["Active vs passive ROM comparison", "Painful arc identification", "Capsular vs non-capsular patterns", "End-feel classification"] },
};

function ModuleInfoSheet({ open, onClose, moduleKey, label, detail }) {
  const info = MODULE_INFO[moduleKey];
  return (
    <Sheet open={open} onClose={onClose} eyebrow="ABOUT THIS ASSESSMENT" title={label}>
      {info ? (
        <>
          <p className="obj-why-text">{info.why}</p>
          {info.what?.length > 0 && (
            <>
              <div className="subheading" style={{ marginTop: 4 }}>What it tells you</div>
              <ul className="obj-what-list">
                {info.what.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </>
          )}
          {detail && (
            <>
              <div className="subheading">Condition-specific focus</div>
              <p className="obj-why-text">{detail}</p>
            </>
          )}
        </>
      ) : (
        <Hint>No additional reference notes for this one yet.</Hint>
      )}
    </Sheet>
  );
}

function ConditionModuleCards({ modules, conditionId, data, setData, activeIds, onToggle }) {
  const [modChecks, setModCheck] = useSectionData(data, setData, "moduleChecks");
  const [closedKeys, setClosedKeys] = useState({});
  const [infoKey, setInfoKey] = useState(null);
  if (!modules || modules.length === 0) return null;
  const cid = conditionId || "default";

  function toggleOpen(key) {
    setClosedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function isChecked(modKey, idx) {
    return !!modChecks[`${cid}_${modKey}_${idx}`];
  }
  function toggleCheck(modKey, idx) {
    const k = `${cid}_${modKey}_${idx}`;
    setModCheck(k, !modChecks[k]);
  }

  const infoModule = infoKey ? modules.find((m) => m.key === infoKey) : null;

  return (
    <div className="cmod-list">
      {modules.map((m) => {
        const isOpen = !closedKeys[m.key];
        const dotColor = MODULE_DOT[m.key] || BRAND.purple;
        const title = MODULE_TITLE[m.key] || m.label.toUpperCase();
        const redirect = MODULE_REDIRECT[m.key];
        const alwaysShownNote = MODULE_ALWAYS_SHOWN[m.key];
        const isOutcome = m.key === "outcome";
        const checks = !redirect && !alwaysShownNote && !isOutcome ? splitDetailToChecks(m.detail) : [];
        const outcomeMatch = isOutcome ? matchOutcomeMeasures(m.detail) : null;
        return (
          <div key={m.key} className={"cmod-card" + (isOpen ? " cmod-card-open" : "")}>
            <button type="button" className="cmod-header" onClick={() => toggleOpen(m.key)}>
              <span className="cmod-dot" style={{ background: dotColor }} />
              <span className="cmod-label">{m.label}</span>
              <button type="button" className="info-btn-sm" onClick={(e) => { e.stopPropagation(); setInfoKey(m.key); }} aria-label={`About ${m.label}`}>ⓘ</button>
              <span className={"cmod-chev" + (isOpen ? " open" : "")}>⌄</span>
            </button>
            {isOpen && (
              <div className="cmod-body">
                <div className="cmod-detail">
                  <div className="cmod-detail-title">{title}</div>
                  {m.detail}
                </div>

                {checks.length > 0 && (
                  <div className="cmod-checks">
                    {checks.map((item, idx) => (
                      <label key={idx} className="cmod-check-row">
                        <input type="checkbox" checked={isChecked(m.key, idx)} onChange={() => toggleCheck(m.key, idx)} className="cmod-checkbox" />
                        <span className="cmod-check-text">{item}</span>
                      </label>
                    ))}
                  </div>
                )}

                {redirect && (
                  activeIds?.has(redirect.activeId) ? (
                    <div className="cmod-redirect-done">✓ Added — filled in below</div>
                  ) : (
                    <button type="button" className="cmod-redirect-btn" onClick={() => onToggle?.(redirect.activeId)}>
                      {redirect.cta} ↓
                    </button>
                  )
                )}

                {alwaysShownNote && <div className="cmod-note">Covered in {alwaysShownNote}.</div>}

                {isOutcome && (
                  <div className="cmod-note">
                    {outcomeMatch.matchedIds.length > 0 && (
                      <div>Opens in the Outcome Measure section below: {outcomeMatch.matchedIds.map((id) => MEASURES[id]?.label).filter(Boolean).join(", ")}.</div>
                    )}
                    {outcomeMatch.unmatched.length > 0 && (
                      <div style={{ marginTop: outcomeMatch.matchedIds.length > 0 ? 6 : 0 }}>Also consider tracking: {outcomeMatch.unmatched.join(", ")}.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <ModuleInfoSheet open={!!infoKey} onClose={() => setInfoKey(null)} moduleKey={infoKey} label={infoModule?.label || ""} detail={infoModule?.detail || ""} />
    </div>
  );
}


function ObjectiveCard({ id, label, reason, suggested, active, onToggle, onJump }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const content = OBJECTIVE_CONTENT[id];
  return (
    <div className={"obj-card" + (active ? " obj-card-active" : "")}>
      <div className="obj-card-top">
        <span className={"obj-card-badge" + (suggested ? " obj-card-badge-ai" : "")}>{suggested ? "✨ Suggested" : "Added by you"}</span>
        {active && <span className="obj-card-check">✓ Added</span>}
      </div>
      <div className="obj-card-title">
        {label}
        <button type="button" className="info-btn-sm" onClick={() => setInfoOpen(true)} aria-label={`About ${label}`}>
          ⓘ
        </button>
      </div>
      {reason && <div className="obj-card-reason">{reason}</div>}
      <div className="obj-card-actions">
        <span style={{ flex: 1 }} />
        {active ? (
          <>
            <button type="button" className="obj-card-jump" onClick={onJump}>
              Enter →
            </button>
            <button type="button" className="obj-card-remove" onClick={onToggle} aria-label="Remove">
              ✕
            </button>
          </>
        ) : (
          <button type="button" className="obj-card-add" onClick={onToggle}>
            + Add
          </button>
        )}
      </div>
      <InfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} label={label} content={content} />
    </div>
  );
}

/* ---------- Individual-item cards (ROM / MMT / Special Tests / Observation) ---------- */

// Collapsed by default -- a single compact row (name + optional value
// summary + an (i) info button) -- expanding only the actual input widget
// (`children`) on tap. Previously every named item (every ROM movement,
// every MMT muscle, every special test) rendered its FULL input widget
// inline and always expanded, which is what made a single Suggested
// Objective step run 6000+px of scroll for one region. The (i) button sits
// right beside the item name (was two separate "Why?"/"How?" text links)
// so a clinician can still learn about a test without opening it to fill
// it in.
// `selected` defaults to true so callers that never pass it (Palpation,
// which is always a base step, not part of the Suggested->Selected->Finding
// gate) keep the old always-expandable behavior unchanged. Callers that DO
// pass selected/onSelect (Rom/Mmt/SpecialTest/Observation) get the three-state
// row: plain "+ Select" button -> tap opens the real input -> an answer that
// is itself a positive/abnormal/recorded result turns the row green (finding).
function ItemCardShell({ label, sublabel, answered, summary, whyLines, howLines, howEyebrow = "How to perform", selected = true, onSelect, finding = false, children }) {
  const [open, setOpen] = useState(selected && !answered);
  const [infoOpen, setInfoOpen] = useState(false);
  function handleRowClick() {
    if (!selected) { onSelect?.(); setOpen(true); return; }
    setOpen((o) => !o);
  }
  const stateClass = finding ? " obj-item-finding" : selected && answered ? " obj-item-answered" : selected ? " obj-item-selected" : "";
  return (
    <div className={"obj-item" + stateClass}>
      <div className="obj-item-row" onClick={handleRowClick} role="button">
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">{label}</span>
          <button type="button" className="info-btn-sm" onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }} aria-label={`About ${label}`}>
            ⓘ
          </button>
          {sublabel && <span className="obj-item-row-sub">{sublabel}</span>}
        </div>
        <div className="obj-item-row-right">
          {selected && answered && summary && <span className="obj-item-row-summary">{finding ? "✓ " : ""}{summary}</span>}
          {!selected ? (
            <button type="button" className="obj-item-select-btn" onClick={(e) => { e.stopPropagation(); onSelect?.(); setOpen(true); }}>
              + Select
            </button>
          ) : (
            <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
          )}
        </div>
      </div>
      {selected && open && (
        <div className="obj-item-body" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
      <LineInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} label={label} whyLines={whyLines} howLines={howLines} howEyebrow={howEyebrow} />
    </div>
  );
}

function RomItemCard({ item, romData, setRom, selectionData, onSelectItem }) {
  const { regionKey, itemId, meta } = item;
  const entry = romData[regionKey] || {};
  const val = entry[itemId] || {};
  const key = itemKey("rom", regionKey, itemId);
  const gradeL = meta.normal ? RESTRICTION_GRADE(Number(val.left), meta.normal) : null;
  const gradeR = meta.normal ? RESTRICTION_GRADE(Number(val.right), meta.normal) : null;
  const norm = [meta.plane, meta.normal != null ? `N=${meta.normal}${meta.unit || "°"}` : null].filter(Boolean).join(" · ");
  function onSetVal(_id, side, v) {
    setRom(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
    onSelectItem(key);
  }
  function onSetMeta(_id, field, v) {
    setRom(regionKey, { ...entry, [itemId + "_" + field]: entry[itemId + "_" + field] === v ? "" : v });
    onSelectItem(key);
  }
  // The full ROM page's own row, verbatim: goniometer Stepper per side,
  // colour-graded restriction label, the (i) sheet with Perform/Reference/
  // Interpret tabs, and the collapsible pain-quality + end-feel list.
  return (
    <RomMovementCard
      m={meta}
      val={val}
      gradeL={gradeL}
      gradeR={gradeR}
      pain={entry[itemId + "_pain"]}
      endFeel={entry[itemId + "_ef"]}
      norm={norm}
      onSetVal={onSetVal}
      onSetMeta={onSetMeta}
    />
  );
}

function MmtItemCard({ item, mmtData, setMmt, selectionData, onSelectItem }) {
  const { regionKey, itemId, meta } = item;
  const entry = mmtData[regionKey] || {};
  const val = entry[itemId] || {};
  const key = itemKey("mmt", regionKey, itemId);
  function setSide(side, v) {
    setMmt(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
    onSelectItem(key);
  }
  // Same .movement-card markup and the same GradeSelect the full MMT page
  // uses -- the grade dropdown is colour-coded by grade (gradeColor), so a
  // filled-in muscle no longer reads as a flat grey box (2026-09-03, Aditi:
  // "MMT after filling, it is showing gray color").
  return (
    <div className="movement-card">
      <div className="movement-head">
        <div className="movement-info">
          <div className="movement-name-row">
            <span className="movement-name">{meta.muscle || item.label}</span>
            <InfoButton title={meta.muscle || item.label} text={mmtInfoText(meta)} richItem={mmtRichItem(meta)} />
          </div>
          {(meta.nerve || meta.root) && <div className="muscle-subtitle">{[meta.nerve, meta.root].filter(Boolean).join(" · ")}</div>}
        </div>
        <div className="movement-lr">
          <div className="movement-lr-col">
            <span className="movement-lr-tag">L</span>
            <GradeSelect value={val.left} onChange={(v) => setSide("left", v)} />
          </div>
          <div className="movement-lr-col">
            <span className="movement-lr-tag">R</span>
            <GradeSelect value={val.right} onChange={(v) => setSide("right", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialTestItemCard({ item, specialData, setSpecial, selectedRegions, isSideless, selectionData, onSelectItem }) {
  const { regionKey, itemId, meta } = item;
  const entry = specialData[regionKey] || {};
  const raw = entry[itemId];
  const key = itemKey("special", regionKey, itemId);
  const currentSide = isSideless ? null : entry[itemId + "__side"] || defaultSideFor(regionKey, selectedRegions);
  const currentValue = isSideless ? raw : raw && typeof raw === "object" ? raw[currentSide] : undefined;
  function setResult(optionValue) {
    if (isSideless) {
      setSpecial(regionKey, { ...entry, [itemId]: optionValue });
    } else {
      const obj = raw && typeof raw === "object" ? raw : {};
      setSpecial(regionKey, { ...entry, [itemId]: { ...obj, [currentSide]: optionValue } });
    }
    onSelectItem(key);
  }
  function setSideChip(sd) {
    setSpecial(regionKey, { ...entry, [itemId + "__side"]: sd });
  }
  const options = meta.options || ["Negative", "Positive"];
  // Same .test-card layout, same (i) sheet, and the same red-vs-purple
  // result chips as the full Special Tests page.
  return (
    <div className="test-card">
      <div className="test-card-title-row">
        <div className="test-card-title">{meta.label || item.label}</div>
        <InfoButton
          title={meta.label || item.label}
          text={[meta.how, meta.positive && `✅ Positive means: ${meta.positive}`, meta.negative && `⬜ Negative means: ${meta.negative}`].filter(Boolean).join("\n\n") || "No additional reference notes for this test."}
          richItem={specialRichItem(meta)}
        />
      </div>
      {(meta.structure || meta.sensitivity) && (
        <div className="muscle-subtitle">
          {meta.structure && <>Structure: {meta.structure}</>}
          {meta.sensitivity && <> · Sens: {meta.sensitivity} · Spec: {meta.specificity}</>}
        </div>
      )}
      {!isSideless && (
        <div className="side-row" style={{ marginTop: 6, marginBottom: 8 }}>
          {["Right", "Left", "Bilateral"].map((sd) => (
            <button type="button" key={sd} className={"side-chip" + (currentSide === sd.toLowerCase() ? " side-chip-active" : "")} onClick={() => setSideChip(sd.toLowerCase())}>
              {sd}
            </button>
          ))}
        </div>
      )}
      <div className="test-radio-row">
        {options.map((o) => {
          const isActive = currentValue === o;
          const positive = isPositiveResult(o);
          return (
            <button
              type="button"
              key={o}
              className={"test-radio" + (isActive ? (positive ? " test-radio-selected-red" : " test-radio-selected") : "")}
              onClick={() => setResult(isActive ? "" : o)}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ObservationItemCard({ item, obsData, setPostureRegion, selectionData, onSelectItem }) {
  const { regionKey, itemId, label, meta } = item;
  const view = meta.view;
  const regions = obsData.posture?.regions || {};
  const viewData = regions[regionKey]?.[view] || {};
  const value = viewData[itemId];
  const key = itemKey("observation", regionKey, `${view}:${itemId}`);
  const selected = !!selectionData[key] || !!value;
  function pick(o) {
    setPostureRegion(regionKey, view, itemId, value === o ? "" : o);
    onSelectItem(key);
  }
  return (
    <ItemCardShell label={label} answered={!!value} summary={value || ""} whyLines={obsWhy(meta)} howLines={obsHow()} selected={selected} onSelect={() => onSelectItem(key)} finding={!!value && value !== meta.options?.[0]}>
      <div className="test-radio-row">
        {(meta.options || []).map((o) => (
          <button type="button" key={o} className={"test-radio" + (value === o ? " test-radio-selected" : "")} onClick={() => pick(o)}>
            {o}
          </button>
        ))}
      </div>
    </ItemCardShell>
  );
}

/* ---------- Palpation ----------
   Rendered by the real PalpationSection (orthoOutpatientSections.jsx) --
   the interactive body map plus the same Findings fields, exactly as the
   full Palpation page presents them (2026-09-03, Aditi: "palpation is not
   the way it should be presented"). It used to be a bespoke 4-field
   inline card here with the body map merely linked away to, which is why
   the AI-assisted route looked nothing like the normal one. Writes to the
   same data.palpation either way. ---------- */

/* ---------- CPA / Kinetic Chain / Functional Movement / STTT / Fascia ----------
   Rendered by the REAL sections (orthoAdvancedTools.jsx) -- the same
   colour-coded option chips carrying each option's own clinical meaning,
   the same region tabs, and the same (i) sheets with how-to-test /
   compensator / kinetic-chain-effect / treatment content the standalone
   pages and the old Phase 0.5 modules show (2026-09-03, Aditi: "cpa,
   kinetic chain, functional screen, sttt, fascia like in old 0.5 phase
   does"). These used to be four bespoke one-line item cards here, which is
   why the AI-assisted route looked nothing like the rest of the app.
   Fascia had no Ortho screen at all before this. ---------- */

/* ---------- Outcome measure (inline) ----------
   Saves into the same data.outcomeMeasure.instances[measureId].history
   shape OrthoOutcomeMeasureFlow.jsx's own saveEntry() produces, so a
   "Reassess" later on the full page sees this entry as real history, not
   a duplicate. ---------- */
// No per-measure "why/how" reference existed on the old
// OrthoOutcomeMeasureFlow.jsx page either (MEASURES carries only scoring
// logic, not prose) -- built from the measure's own real item prompts (not
// invented) plus the same generic outcome-measure rationale
// OBJECTIVE_CONTENT already used.
function outcomeMeasureInfo(measure) {
  return {
    why: `${measure.full} gives an objective, comparable score for this region to track progress and justify the treatment plan.`,
    what: (measure.items || []).map((it) => it.prompt),
    how: {
      purpose: `Administer all ${measure.items?.length || 0} items and score per ${measure.label}'s standard key.`,
      position: "Seated, able to complete a questionnaire or physical performance test.",
    },
  };
}

function OutcomeMeasureInlineCard({ measure, reason, instance, onSave }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const score = measure.score(answers);
  const interp = score != null ? measure.interpret(score) : null;
  const history = instance?.history || [];
  const latest = history[history.length - 1];
  const hasHistory = history.length > 0;
  function pick(itemId, value) {
    setAnswers((a) => ({ ...a, [itemId]: a[itemId] === value ? undefined : value }));
  }
  function save() {
    onSave(measure.id, answers, score);
    setAnswers({});
  }
  return (
    <div className="obj-item">
      <div className="obj-item-row" onClick={() => setOpen((o) => !o)} role="button">
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">
            {measure.icon} {measure.label}
          </span>
          <button type="button" className="info-btn-sm" onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }} aria-label={`About ${measure.label}`}>
            ⓘ
          </button>
          <span className="obj-item-row-sub">{measure.full}</span>
        </div>
        <div className="obj-item-row-right">
          {hasHistory && (
            <span className="obj-item-row-summary">
              Last: {latest.score}
              {measure.unit}
            </span>
          )}
          <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
        </div>
      </div>
      {open && (
        <div className="obj-item-body" onClick={(e) => e.stopPropagation()}>
          {reason && (
            <div className="obj-card-reason" style={{ marginBottom: 8 }}>
              {reason}
            </div>
          )}
          {measure.items.map((it) => (
            <div key={it.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: "#334155", marginBottom: 4 }}>{it.prompt}</div>
              <div className="test-radio-row">
                {it.options.map((o) => (
                  <button type="button" key={o.value} className={"test-radio" + (answers[it.id] === o.value ? " test-radio-selected" : "")} onClick={() => pick(it.id, o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="obj-card-actions" style={{ marginTop: 4 }}>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: interp?.color || "#64748b" }}>{score != null ? `Score: ${score}${measure.unit} — ${interp.label}` : "Answer every item to see the score"}</span>
            <button type="button" className="obj-card-add" disabled={score == null} onClick={save}>
              💾 Save entry
            </button>
          </div>
        </div>
      )}
      <InfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} label={measure.full} content={outcomeMeasureInfo(measure)} />
    </div>
  );
}

export default function OrthoSuggestObjectiveStep({ data, setData, selectedRegions, condition, activeIds, onToggle, library, onJump }) {
  const [q, setQ] = useState("");
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [activeConditionId, setActiveConditionId] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  const [romData, setRomD] = useSectionData(data, setData, "rom");
  const [mmtData, setMmtD] = useSectionData(data, setData, "mmt");
  const [specialData, setSpecialD] = useSectionData(data, setData, "specialTests");
  const [obsData, setObsD] = useSectionData(data, setData, "observation");
  const [omData, setOmD] = useSectionData(data, setData, "outcomeMeasure");
  // Persists which items have been tapped "+ Select" so the Suggested /
  // Selected / Finding state survives navigating away and back -- an item
  // that already has a saved answer counts as selected even without an
  // entry here (see the `selected = !!selectionData[key] || answered`
  // pattern in each item card / in findingsAndSelection below).
  const [selectionData, setSelectionField] = useSectionData(data, setData, "objectiveSelection");
  function onSelectItem(key) {
    if (!selectionData[key]) setSelectionField(key, true);
  }
  const setRom = (k, v) => setRomD(k, v);
  const setMmt = (k, v) => setMmtD(k, v);
  const setSpecial = (k, v) => {
    setSpecialD(k, v);
    if (!activeIds.has("specialTests")) onToggle("specialTests");
  };
  const omInstances = omData.instances || {};
  function saveOutcomeEntry(measureId, answers, score) {
    const history = [...(omInstances[measureId]?.history || []), { score, date: new Date().toISOString(), answers }].slice(-10);
    setOmD("instances", { ...omInstances, [measureId]: { history } });
    if (!activeIds.has("outcomeMeasure")) onToggle("outcomeMeasure");
  }
  const setPostureRegion = (regionKey, view, fieldId, value) => {
    const posture = obsData.posture || {};
    const regions = posture.regions || {};
    const regionData = regions[regionKey] || {};
    const viewData = regionData[view] || {};
    setObsD("posture", { ...posture, regions: { ...regions, [regionKey]: { ...regionData, [view]: { ...viewData, [fieldId]: value } } } });
  };

  const isSideless = (regionKey) => !!ALL_REGIONS.find((r) => r.id === regionKey)?.sideless;

  const { rom, mmt, specialTests, observation } = useMemo(() => suggestIndividualItems(selectedRegions), [selectedRegions]);

  const suggestions = useMemo(
    () => suggestObjectiveTests({ subjective: data.subjective || {}, pain: data.pain || {}, condition, selectedRegions }).filter((s) => !["rom", "mmt", "specialTests"].includes(s.id)),
    [data.subjective, data.pain, condition, selectedRegions]
  );

  // CPA and Outcome Measure are optional (unlike ROM/MMT/Special
  // Tests/Palpation, which are always relevant) -- only fill inline once
  // suggested by suggestObjectiveTests/suggestMeasures or already added,
  // same gating the old whole-category "Enter →" card used.
  const cpaReason = suggestions.find((s) => s.id === "cpa")?.reason;
  const showCpa = !!cpaReason || activeIds.has("cpa");

  // Kinetic Chain / FMA / STTT / Fascia are optional too, same gating pattern
  // as CPA above -- only shown inline once suggestObjectiveTests actually
  // suggests them (or they're already added). Each renders its own real
  // section, which brings its own region tabs, so there is nothing to
  // pre-resolve per region here any more.
  const kcReason = suggestions.find((s) => s.id === "kineticChain")?.reason;
  const showKc = !!kcReason || activeIds.has("kineticChain");

  const fmaReason = suggestions.find((s) => s.id === "fma")?.reason;
  const showFma = !!fmaReason || activeIds.has("fma");

  const sttReason = suggestions.find((s) => s.id === "sttt")?.reason;
  const showStt = !!sttReason || activeIds.has("sttt");

  const fasciaReason = suggestions.find((s) => s.id === "fascia")?.reason;
  const showFascia = !!fasciaReason || activeIds.has("fascia");

  const { recommended: omRecommended } = useMemo(() => suggestMeasures({ selectedRegions, contentKeyForRegion }), [selectedRegions]);
  const omReasonById = Object.fromEntries(omRecommended.map((r) => [r.id, r.reason]));
  const omSuggestedFromReasoning = suggestions.find((s) => s.id === "outcomeMeasure")?.reason;
  const showOutcomeMeasure = omRecommended.length > 0 || !!omSuggestedFromReasoning || activeIds.has("outcomeMeasure");
  const outcomeMeasureIds = showOutcomeMeasure ? [...new Set([...omRecommended.map((r) => r.id), ...(activeIds.has("outcomeMeasure") ? Object.keys(omInstances) : [])])] : [];
  // Every region with a ported Phase 0.5 engine for THIS tool's data shape
  // All regions with a reasoning engine adapter. Each adapter flattens the
  // wizard's nested data into the old flow's flat format, runs the existing
  // reasoning engine(s), and maps differentials to the conditions shape
  // this UI reads (id, name, matchTier, objectiveTests, etc.).
  //
  // hasData/run take the full `data` object (not a narrower regionData
  // slice) so every engine can read whatever it actually needs -- Lumbar/
  // Cervical/Thoracic only read data.subjective.regions[region.id], but
  // Shoulder (see orthoShoulderReasoning.js's own header comment) has no
  // equivalent subjective checklist and reads data.rom/data.mmt/
  // data.specialTests instead, live, updating as the therapist fills in
  // items on this same screen rather than being fixed from Subjective alone.
  //
  // When AI intake was used, subjective.__aiExtracted carries the raw
  // extracted fields but regions[regionId] is empty -- synthesize a
  // minimal regionData from the AI fields so the spine engines can fire.
  function spineRegionData(d, r, engineKey) {
    const manual = d.subjective?.regions?.[r.id];
    if (manual && Object.values(manual).some((v) => String(v || "").trim())) return manual;
    const rows = d.subjective?.__aiExtracted;
    if (!rows?.length) return null;
    const byKey = {};
    rows.forEach((row) => { if (row.key && row.value) byKey[row.key] = row.value; });
    if (!Object.keys(byKey).length) return null;
    const rd = {};
    const low = (k) => (byKey[k] || "").toLowerCase();
    const aggMov = (byKey.aggMovements || "").split(", ").filter(Boolean);
    const FLEX = { cervical: "Flexion — looking down", lumbarSI: "Forward bending (flexion)", thoracic: "Forward bending (flexion)" };
    const EXT = { cervical: "Extension — looking up", lumbarSI: "Backward bending (extension)", thoracic: "Backward bending (extension)" };
    const mapped = [];
    for (const m of aggMov) {
      const ml = m.toLowerCase();
      if (ml.includes("look") && ml.includes("down") || ml.includes("flexion") || ml.includes("bending forward") || ml.includes("bend forward")) mapped.push(FLEX[engineKey] || m);
      else if (ml.includes("look") && ml.includes("up") || ml.includes("extension") || ml.includes("leaning back")) mapped.push(EXT[engineKey] || m);
      else if (ml.includes("turn") || ml.includes("rotation")) { if (ml.includes("right")) mapped.push("Rotation right"); else if (ml.includes("left")) mapped.push("Rotation left"); else mapped.push("Rotation"); }
      else if (ml.includes("side") || ml.includes("lateral")) mapped.push("Side bending");
      else mapped.push(m);
    }
    if (mapped.length) rd.aggMovements = mapped.join(", ");
    const aggAct = (byKey.aggActivities || "").split(", ").filter(Boolean);
    const mappedP = [];
    for (const a of aggAct) { const al = a.toLowerCase(); if (al.includes("computer") || al.includes("desk") || al.includes("screen")) mappedP.push("Computer / desk work"); else if (al.includes("driving")) mappedP.push("Driving"); else if (al.includes("sitting")) mappedP.push("Sitting — prolonged"); else if (al.includes("standing")) mappedP.push("Standing — prolonged"); else mappedP.push(a); }
    if (mappedP.length) rd.aggPostures = mappedP.join(", ");
    if (byKey.hasRadiation === "No" || low("hasRadiation") === "no") rd.radiation = "No radiation — local only";
    else if (byKey.radiationArea) rd.radiation = byKey.radiationArea;
    const neuro = low("neuroSymptoms");
    if (neuro.includes("no neuro") || neuro === "none" || neuro === "no") { rd.armNeuro = "No neurological symptoms"; rd.armPresent = "No arm / hand symptoms"; }
    else if (neuro && neuro !== "no neurological") rd.armNeuro = byKey.neuroSymptoms;
    const onset = low("onset");
    if (onset.includes("whiplash") || onset.includes("mva") || onset.includes("car accident")) rd.mechanismType = "Whiplash / rear-end collision";
    else if (onset.includes("no clear") || onset.includes("insidious") || onset.includes("gradual") || onset.includes("unknown")) rd.mechanismType = "No clear mechanism — insidious onset";
    else if (onset.includes("fall") || onset.includes("trauma")) rd.mechanismType = "Fall / direct trauma";
    else if (onset.includes("lift")) rd.mechanismType = "Lifting — heavy or awkward";
    const morning = low("morningSymptoms") || low("diurnalPattern");
    if (morning.includes("stiffness") && morning.includes("morning")) rd.morning = "Stiffness < 30 min (mechanical)";
    const loc = low("locationDescription");
    if (engineKey === "cervical") { if (loc.includes("right")) rd.location = "Right posterior cervical"; else if (loc.includes("left")) rd.location = "Left posterior cervical"; else rd.location = "Central/posterior cervical"; }
    else if (engineKey === "lumbarSI") { if (loc.includes("right")) rd.location = "Right lumbar"; else if (loc.includes("left")) rd.location = "Left lumbar"; else rd.location = "Central lumbar"; }
    else { if (loc.includes("right")) rd.location = "Right thoracic"; else if (loc.includes("left")) rd.location = "Left thoracic"; else rd.location = "Central thoracic"; }
    const pattern = low("symptomPattern");
    if (pattern.includes("mechanical")) rd.overallPattern = "Mechanical — varies with movement/position";
    else if (pattern.includes("constant")) rd.overallPattern = "Constant — never goes away";
    return Object.keys(rd).length > 0 ? rd : null;
  }
  const REGION_ENGINES = {
    lumbarSI: { hasData: (d, r) => hasLumbarChecklistData(d.subjective?.regions?.[r.id]) || !!spineRegionData(d, r, "lumbarSI"), run: (d, r) => runLumbarDifferential(spineRegionData(d, r, "lumbarSI") || d.subjective?.regions?.[r.id], d.subjective || {}), itemIds: lumbarConditionItemIds, label: "Lumbar/SI" },
    cervical: { hasData: (d, r) => hasCervicalChecklistData(d.subjective?.regions?.[r.id]) || !!spineRegionData(d, r, "cervical"), run: (d, r) => runCervicalDifferential(spineRegionData(d, r, "cervical") || d.subjective?.regions?.[r.id], d.subjective || {}), itemIds: cervicalConditionItemIds, label: "Cervical" },
    thoracic: { hasData: (d, r) => hasThoracicChecklistData(d.subjective?.regions?.[r.id]) || !!spineRegionData(d, r, "thoracic"), run: (d, r) => runThoracicDifferential(spineRegionData(d, r, "thoracic") || d.subjective?.regions?.[r.id], d.subjective || {}), itemIds: thoracicConditionItemIds, label: "Thoracic" },
    shoulder: { hasData: (d) => hasShoulderChecklistData(d), run: (d) => runShoulderDifferential(d), itemIds: shoulderConditionItemIds, label: "Shoulder" },
    hip: { hasData: (d) => hasHipChecklistData(d), run: (d) => runHipDifferential(d), itemIds: hipConditionItemIds, label: "Hip" },
    knee: { hasData: (d) => hasKneeChecklistData(d), run: (d) => runKneeDifferential(d), itemIds: kneeConditionItemIds, label: "Knee" },
    ankleFoot: { hasData: (d) => hasAnkleFootChecklistData(d), run: (d) => runAnkleFootDifferential(d), itemIds: ankleFootConditionItemIds, label: "Ankle/Foot" },
    elbowWristHand: { hasData: (d) => hasElbowWristHandChecklistData(d), run: (d) => runElbowWristHandDifferential(d), itemIds: elbowWristHandConditionItemIds, label: "Elbow/Wrist/Hand" },
  };
  const engineMatch = useMemo(() => {
    for (const region of selectedRegions) {
      const key = contentKeyForRegion(region);
      const engine = REGION_ENGINES[key];
      if (!engine) continue;
      if (!engine.hasData(data, region)) continue;
      try {
        const result = engine.run(data, region);
        return { region, key, engine, result };
      } catch { continue; }
    }
    return null;
  }, [selectedRegions, data]);
  const engineResult = engineMatch?.result || null;

  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const libraryById = Object.fromEntries(library.map((it) => [it.id, it]));
  // cpa/outcomeMeasure now fill inline above (like rom/mmt/specialTests) --
  // excluded here (and from `suggestions` below at render time) so they
  // don't also duplicate as a whole-category "Enter →" card. Kept in
  // `suggestions` itself since cpaReason/omSuggestedFromReasoning above
  // still read their `reason` text off it.
  const manuallyAdded = [...activeIds].filter((id) => !suggestedIds.has(id) && !["cpa", "outcomeMeasure", "kineticChain", "fma", "sttt", "fascia"].includes(id) && libraryById[id]);
  const otherSuggestions = suggestions.filter((s) => !["cpa", "outcomeMeasure", "kineticChain", "fma", "sttt", "fascia"].includes(s.id));

  const query = q.trim().toLowerCase();
  const searchResults = query ? library.filter((it) => !suggestedIds.has(it.id) && !activeIds.has(it.id) && it.label.toLowerCase().includes(query)) : [];

  const topConditions = useMemo(
    () => (engineResult ? engineResult.conditions.filter((c) => c.matchTier !== "Unlikely").slice(0, 3) : []),
    [engineResult]
  );
  const activeConditionIdOrDefault = activeConditionId ?? topConditions[0]?.id ?? null;
  const activeConditionObj = topConditions.find((c) => c.id === activeConditionIdOrDefault) || null;
  // Narrows the suggested Observation/ROM/MMT/Special Tests lists down to
  // what THIS condition's own objectiveTests actually cover, instead of
  // always showing the region's entire test library regardless of which
  // condition is suspected -- null (no condition matched/selected, or a
  // region without a ported Phase 0.5 engine) means "show everything",
  // same as before this existed.
  const conditionFilter = useMemo(() => (activeConditionObj && engineMatch ? engineMatch.engine.itemIds(activeConditionObj) : null), [activeConditionObj, engineMatch]);

  // Condition-wise palpation (2026-09-03, Aditi: "palpation condition wise")
  // -- each engine condition lists its own objective tests, some of which are
  // palpation targets ("Palpation -- Greater Tuberosity", "Joint line
  // palpation"). palpationFocusZoneIds matches those against the zones this
  // case's regions actually put on screen, so Palpation leads with the areas
  // the suspected condition calls for. Empty = show every zone, unchanged.
  const palpationFocusIds = useMemo(() => {
    const tests = [...(activeConditionObj?.objectiveTests?.required || []), ...(activeConditionObj?.objectiveTests?.recommended || [])];
    if (!tests.length) return null;
    return palpationFocusZoneIds(tests, palpationZonesForRegions(selectedRegions));
  }, [activeConditionObj, selectedRegions]);

  // The condition's own "outcome" module guidance (e.g. "Neck Disability
  // Index (NDI); PSFS; NPRS") names real instruments -- match them into the
  // exact same outcomeMeasureIds/OutcomeMeasureInlineCard flow the
  // region-based suggestions below already use, so tapping through actually
  // opens the fill-in/score/save form instead of a second, fake mechanism.
  const conditionOutcomeDetail = activeConditionObj?.assessmentModules?.find((m) => m.key === "outcome")?.detail;
  const conditionOutcomeMatch = useMemo(() => matchOutcomeMeasures(conditionOutcomeDetail), [conditionOutcomeDetail]);
  const finalOutcomeMeasureIds = [...new Set([...outcomeMeasureIds, ...conditionOutcomeMatch.matchedIds])];
  const finalShowOutcomeMeasure = showOutcomeMeasure || conditionOutcomeMatch.matchedIds.length > 0;
  const finalOmReasonById = { ...omReasonById };
  conditionOutcomeMatch.matchedIds.forEach((id) => {
    if (!finalOmReasonById[id]) finalOmReasonById[id] = `Named for ${activeConditionObj?.name || "this condition"}`;
  });

  // Scans the exact same rom/mmt/specialTests/observation data the item
  // cards above write into, and derives (a) which named items are
  // "selected" (explicitly tapped, or already answered from a previous
  // visit) and (b) which of those answers are themselves a positive,
  // abnormal, or recorded result -- a Finding. No separate state to keep in
  // sync: the drawer, the sticky tray, and the review screen all read this
  // one derived list.
  const { findings, selectedKeys } = useMemo(() => {
    const findingsOut = [];
    const keys = new Set();

    observation.forEach((item) => {
      const key = itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`);
      const regions = obsData.posture?.regions || {};
      const value = regions[item.regionKey]?.[item.meta.view]?.[item.itemId];
      if (!selectionData[key] && !value) return;
      keys.add(key);
      if (value && value !== item.meta.options?.[0]) findingsOut.push({ key, label: `${item.label} — ${value}` });
    });

    rom.forEach((item) => {
      const key = itemKey("rom", item.regionKey, item.itemId);
      const v = (romData[item.regionKey] || {})[item.itemId] || {};
      const answered = !!(v.left || v.right);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      if (answered) {
        const unit = item.meta.unit || "°";
        const parts = [v.left && `L ${v.left}${unit}`, v.right && `R ${v.right}${unit}`].filter(Boolean).join(" / ");
        findingsOut.push({ key, label: `${item.label} — ${parts}` });
      }
    });

    mmt.forEach((item) => {
      const key = itemKey("mmt", item.regionKey, item.itemId);
      const v = (mmtData[item.regionKey] || {})[item.itemId] || {};
      const answered = !!(v.left || v.right);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      const weak = (v.left && v.left !== "5") || (v.right && v.right !== "5");
      if (answered && weak) {
        const parts = [v.left && v.left !== "5" && `L ${v.left}/5`, v.right && v.right !== "5" && `R ${v.right}/5`].filter(Boolean).join(" / ");
        findingsOut.push({ key, label: `${item.label} weak — ${parts}` });
      }
    });

    specialTests.forEach((item) => {
      const key = itemKey("special", item.regionKey, item.itemId);
      const sideless = isSideless(item.regionKey);
      const specialEntry = specialData[item.regionKey] || {};
      const raw = specialEntry[item.itemId];
      const side = sideless ? null : specialEntry[item.itemId + "__side"] || defaultSideFor(item.regionKey, selectedRegions);
      const currentValue = sideless ? raw : raw && typeof raw === "object" ? raw[side] : undefined;
      const answered = sideless ? !!raw : !!(raw && typeof raw === "object" && raw[side]);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      const baseline = item.meta.options?.[0] || "Negative";
      if (answered && currentValue !== baseline) {
        findingsOut.push({ key, label: `${item.label} — ${currentValue}${side && !sideless ? ` (${side})` : ""}` });
      }
    });

    return { findings: findingsOut, selectedKeys: keys };
  }, [observation, rom, mmt, specialTests, obsData, romData, mmtData, specialData, selectionData, selectedRegions]);

  const activeOtherSuggestions = otherSuggestions.filter((s) => activeIds.has(s.id));
  const reviewObservation = observation.filter((item) => selectedKeys.has(itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`)));
  const reviewRom = rom.filter((item) => selectedKeys.has(itemKey("rom", item.regionKey, item.itemId)));
  const reviewMmt = mmt.filter((item) => selectedKeys.has(itemKey("mmt", item.regionKey, item.itemId)));
  const reviewSpecial = specialTests.filter((item) => selectedKeys.has(itemKey("special", item.regionKey, item.itemId)));

  // Suggest-screen lists only -- narrowed by conditionFilter (see above),
  // but never hides an item that's already selected/answered just because
  // the therapist switched to a different condition tab afterwards.
  function passesConditionFilter(type, itemId) {
    if (!conditionFilter) return true;
    if (type === "observation") return conditionFilter.showObservation;
    if (type === "rom") return conditionFilter.rom.has(itemId);
    if (type === "mmt") return conditionFilter.mmt.has(itemId);
    if (type === "special") return conditionFilter.special.has(itemId);
    return true;
  }
  const visibleObservation = observation.filter((item) => selectedKeys.has(itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`)) || passesConditionFilter("observation", item.itemId));
  const visibleRom = rom.filter((item) => selectedKeys.has(itemKey("rom", item.regionKey, item.itemId)) || passesConditionFilter("rom", item.itemId));
  const visibleMmt = mmt.filter((item) => selectedKeys.has(itemKey("mmt", item.regionKey, item.itemId)) || passesConditionFilter("mmt", item.itemId));
  const visibleSpecial = specialTests.filter((item) => selectedKeys.has(itemKey("special", item.regionKey, item.itemId)) || passesConditionFilter("special", item.itemId));

  const traySelectionCount = selectedKeys.size + manuallyAdded.length + activeOtherSuggestions.length;
  const trayLabels = [
    ...reviewObservation.map((item) => item.label),
    ...reviewRom.map((item) => item.label),
    ...reviewMmt.map((item) => item.label),
    ...reviewSpecial.map((item) => item.label),
    ...manuallyAdded.map((id) => libraryById[id]?.label).filter(Boolean),
    ...activeOtherSuggestions.map((s) => libraryById[s.id]?.label).filter(Boolean),
  ];

  const findingsBlock = (
    <>
      <button type="button" className={"obj-findings-toggle" + (findingsOpen ? " open" : "")} onClick={() => setFindingsOpen((o) => !o)}>
        <span>🗂 Objective findings · {findings.length}</span>
        <span className="obj-findings-chev">⌄</span>
      </button>
      {findingsOpen && (
        findings.length > 0 ? (
          <div className="obj-findings-drawer">
            {findings.map((f) => <div key={f.key}><b>✓</b>{f.label}</div>)}
          </div>
        ) : (
          <div className="obj-findings-empty">Nothing recorded yet — a finding appears here the moment a result is positive, abnormal, or measured.</div>
        )
      )}
    </>
  );

  if (reviewMode) {
    return (
      <div className="obj-no-zoom">
        <div className="obj-review-head">
          <button type="button" className="obj-review-back" onClick={() => setReviewMode(false)}>← Back to suggestions</button>
        </div>
        <SectionIntro icon="📋" title="Assessment" info={`${traySelectionCount} test(s) selected. Everything below writes to the exact same fields as the full Rom/MMT/Special Tests/Observation pages.`} />

        <div className="obj-review-findings">
          <h4>Objective findings — {findings.length}</h4>
          {findings.length > 0 ? findings.map((f) => <div key={f.key}><b>✓</b>{f.label}</div>) : <div style={{ color: "#9ca3af" }}>No positive findings yet.</div>}
        </div>

        {reviewObservation.length > 0 && (
          <>
            <div className="subheading" style={{ marginTop: 0 }}>👁️ Observation</div>
            {reviewObservation.map((item) => (
              <ObservationItemCard key={`obs-${item.regionKey}-${item.itemId}`} item={item} obsData={obsData} setPostureRegion={setPostureRegion} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {reviewRom.length > 0 && (
          <>
            <div className="subheading">📐 Range of Motion</div>
            <div className="rom-card">
              <div className="rom-row-grid rom-table-head">
                <span>Movement</span>
                <span>L</span>
                <span>R</span>
              </div>
              {reviewRom.map((item) => (
                <RomItemCard key={`rom-${item.regionKey}-${item.itemId}`} item={item} romData={romData} setRom={setRom} selectionData={selectionData} onSelectItem={onSelectItem} />
              ))}
            </div>
          </>
        )}
        {reviewMmt.length > 0 && (
          <>
            <div className="subheading">💪 Muscle Strength (MMT)</div>
            <div className="rom-card">
              {reviewMmt.map((item) => (
                <MmtItemCard key={`mmt-${item.regionKey}-${item.itemId}`} item={item} mmtData={mmtData} setMmt={setMmt} selectionData={selectionData} onSelectItem={onSelectItem} />
              ))}
            </div>
          </>
        )}
        {reviewSpecial.length > 0 && (
          <>
            <div className="subheading">🔬 Special Tests</div>
            {reviewSpecial.map((item) => (
              <SpecialTestItemCard key={`st-${item.regionKey}-${item.itemId}`} item={item} specialData={specialData} setSpecial={setSpecial} selectedRegions={selectedRegions} isSideless={isSideless(item.regionKey)} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {activeOtherSuggestions.map((s) => {
          const meta = libraryById[s.id];
          if (!meta) return null;
          return <ObjectiveCard key={s.id} id={s.id} label={`${meta.icon} ${meta.label}`} reason={s.reason} suggested active onToggle={() => onToggle(s.id)} onJump={() => onJump?.(s.id)} />;
        })}
        {manuallyAdded.map((id) => {
          const meta = libraryById[id];
          return <ObjectiveCard key={id} id={id} label={`${meta.icon} ${meta.label}`} suggested={false} active onToggle={() => onToggle(id)} onJump={() => onJump?.(id)} />;
        })}

        {traySelectionCount === 0 && <Hint>Nothing selected yet — go back and tap "+ Select" on a suggested test.</Hint>}

        <button type="button" className="obj-review-done" onClick={() => setReviewMode(false)}>
          Done — back to summary
        </button>
      </div>
    );
  }

  return (
    <div className="obj-no-zoom">
      <SectionIntro icon="🧠" title="Objective Assessment" info="Individual items below come from the region(s) you picked; the categories at the bottom come from what you documented in Subjective and Pain — none of this is a live AI/diagnosis call." />

      {topConditions.length > 0 ? (
        <>
          <div className="subheading" style={{ marginTop: 0 }}>🧠 Possible matches — {engineMatch.engine.label}</div>
          <ConditionMatchRow conditions={topConditions} activeId={activeConditionIdOrDefault} onSelect={setActiveConditionId} />
          {activeConditionObj?.assessmentModules?.length > 0 && (
            <ConditionModuleCards modules={activeConditionObj.assessmentModules} conditionId={activeConditionIdOrDefault} data={data} setData={setData} activeIds={activeIds} onToggle={onToggle} />
          )}
        </>
      ) : selectedRegions.length > 0 && !engineMatch ? (
        <Hint>Condition matching is available for Cervical, Thoracic, Lumbar/SI, Shoulder, Hip, Knee, Ankle/Foot, and Elbow/Wrist/Hand regions.</Hint>
      ) : null}

      {findingsBlock}

      {conditionFilter && (rom.length || mmt.length || specialTests.length || observation.length) ? (
        <Hint>Narrowed to what {activeConditionObj.name} actually calls for — switch the match above, or use search below, for anything else.</Hint>
      ) : null}

      {visibleObservation.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 0 }}>
            👁️ Observation
          </div>
          {visibleObservation.map((item) => (
            <ObservationItemCard key={`obs-${item.regionKey}-${item.itemId}`} item={item} obsData={obsData} setPostureRegion={setPostureRegion} selectionData={selectionData} onSelectItem={onSelectItem} />
          ))}
        </>
      )}

      {visibleRom.length > 0 && (() => {
        const groups = groupByRegion(visibleRom, selectedRegions);
        const renderRomGroup = (items) => (
          <div className="rom-card">
            <div className="rom-row-grid rom-table-head">
              <span>Movement</span><span>L</span><span>R</span>
            </div>
            {items.map((item) => (
              <RomItemCard key={`rom-${item.regionKey}-${item.itemId}`} item={item} romData={romData} setRom={setRom} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </div>
        );
        return (
          <>
            <div className="subheading">📐 Range of Motion</div>
            {groups ? groups.map((g) => (
              <React.Fragment key={g.key}>
                <div className="hint" style={{ fontWeight: 600, marginTop: 8, marginBottom: 2 }}>{g.label}</div>
                {renderRomGroup(g.items)}
              </React.Fragment>
            )) : renderRomGroup(visibleRom)}
          </>
        );
      })()}

      {visibleMmt.length > 0 && (() => {
        const groups = groupByRegion(visibleMmt, selectedRegions);
        const renderMmtGroup = (items) => (
          <div className="rom-card">
            {items.map((item) => (
              <MmtItemCard key={`mmt-${item.regionKey}-${item.itemId}`} item={item} mmtData={mmtData} setMmt={setMmt} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </div>
        );
        return (
          <>
            <div className="subheading">💪 Muscle Strength (MMT)</div>
            <div className="mmt-scale-bar">
              <span className="mmt-scale-label">MMT SCALE</span>
              <span>5 Normal → 0 Zero</span>
              <InfoButton title="MMT Grading Scale" text={MMT_GRADES.map((g) => `${g.g} — ${g.label}: ${g.desc}`).join("\n")} />
            </div>
            {groups ? groups.map((g) => (
              <React.Fragment key={g.key}>
                <div className="hint" style={{ fontWeight: 600, marginTop: 8, marginBottom: 2 }}>{g.label}</div>
                {renderMmtGroup(g.items)}
              </React.Fragment>
            )) : renderMmtGroup(visibleMmt)}
          </>
        );
      })()}

      {visibleSpecial.length > 0 && (() => {
        const groups = groupByRegion(visibleSpecial, selectedRegions);
        const renderSpecialGroup = (items) => items.map((item) => (
          <SpecialTestItemCard key={`st-${item.regionKey}-${item.itemId}`} item={item} specialData={specialData} setSpecial={setSpecial} selectedRegions={selectedRegions} isSideless={isSideless(item.regionKey)} selectionData={selectionData} onSelectItem={onSelectItem} />
        ));
        return (
          <>
            <div className="subheading">🔬 Special Tests</div>
            {groups ? groups.map((g) => (
              <React.Fragment key={g.key}>
                <div className="hint" style={{ fontWeight: 600, marginTop: 8, marginBottom: 2 }}>{g.label}</div>
                {renderSpecialGroup(g.items)}
              </React.Fragment>
            )) : renderSpecialGroup(visibleSpecial)}
          </>
        );
      })()}

      <PalpationSection
        data={data}
        setData={setData}
        selectedRegions={selectedRegions}
        focusZoneIds={palpationFocusIds}
        conditionLabel={activeConditionObj?.name || ""}
      />

      {showCpa && (
        <>
          {cpaReason && <Hint>{cpaReason}</Hint>}
          <CpaSection data={data} setData={setData} />
        </>
      )}

      {showKc && (
        <>
          {kcReason && <Hint>{kcReason}</Hint>}
          <KineticChainSection data={data} setData={setData} />
        </>
      )}

      {showFma && (
        <>
          {fmaReason && <Hint>{fmaReason}</Hint>}
          <FmaSection data={data} setData={setData} />
        </>
      )}

      {showStt && (
        <>
          {sttReason && <Hint>{sttReason}</Hint>}
          <SttSection data={data} setData={setData} />
        </>
      )}

      {showFascia && (
        <>
          {fasciaReason && <Hint>{fasciaReason}</Hint>}
          <FasciaSection data={data} setData={setData} />
        </>
      )}

      {finalShowOutcomeMeasure && finalOutcomeMeasureIds.length > 0 && (
        <>
          <div className="subheading">📊 Outcome Measure</div>
          {finalOutcomeMeasureIds.map((id) => {
            const measure = MEASURES[id];
            if (!measure) return null;
            return <OutcomeMeasureInlineCard key={id} measure={measure} reason={finalOmReasonById[id]} instance={omInstances[id]} onSave={saveOutcomeEntry} />;
          })}
        </>
      )}

      {(otherSuggestions.length > 0 || manuallyAdded.length > 0) && <div className="subheading">Other suggested assessments</div>}
      {otherSuggestions.map((s) => {
        const meta = libraryById[s.id];
        if (!meta) return null;
        return (
          <ObjectiveCard
            key={s.id}
            id={s.id}
            label={`${meta.icon} ${meta.label}`}
            reason={s.reason}
            suggested
            active={activeIds.has(s.id)}
            onToggle={() => onToggle(s.id)}
            onJump={() => onJump?.(s.id)}
          />
        );
      })}
      {manuallyAdded.map((id) => {
        const meta = libraryById[id];
        return (
          <ObjectiveCard
            key={id}
            id={id}
            label={`${meta.icon} ${meta.label}`}
            suggested={false}
            active
            onToggle={() => onToggle(id)}
            onJump={() => onJump?.(id)}
          />
        );
      })}

      <div className="subheading">Search / add any other assessment</div>
      <div className="text-input-wrap" style={{ marginBottom: 10 }}>
        <input className="text-input" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {query && searchResults.length === 0 && <Hint>No match — try a different term.</Hint>}
      {searchResults.map((it) => (
        <button type="button" key={it.id} className="suggest-card" onClick={() => onToggle(it.id)}>
          <span className="suggest-check">☐</span>
          <span className="suggest-title">
            {it.icon} {it.label}
          </span>
        </button>
      ))}

      {traySelectionCount > 0 && (
        <div className="obj-tray">
          <div className="obj-tray-info">
            <div className="obj-tray-count">{traySelectionCount} selected</div>
            <div className="obj-tray-chips">
              {trayLabels.slice(0, 4).map((label, i) => <span className="obj-tray-chip" key={i}>{label}</span>)}
              {trayLabels.length > 4 && <span className="obj-tray-chip">+{trayLabels.length - 4}</span>}
            </div>
          </div>
          <button type="button" className="obj-tray-cta" onClick={() => setReviewMode(true)}>
            View Assessment
          </button>
        </div>
      )}
    </div>
  );
}
