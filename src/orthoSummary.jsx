import React, { useMemo, useState } from "react";
import { SectionIntro, fmtVal } from "./orthoFieldKit.jsx";
import { humanizeKey } from "./medicalAbbreviations.js";

/* Cardio-style summary/review — one card per completed section, each row a
   plain label/value pair, exactly matching CardiopulmonaryAssessment's
   SummarySection. Tapping a card jumps back to that step to edit it.

   Most sections are flat key/value objects and read fine with the generic
   fmtVal flattener. Region-driven sections (ROM, MMT, Joint Mobility,
   Special Tests) nest data per-region/per-movement — `formatters[stepId]`
   lets those modules supply their own {label, value}[] extractor so their
   results still show up here instead of "[object Object]". Some formatters
   (Care Plan — formatCarePlanSection) instead return { groups: [{heading,
   rows}] } so Problem List/Goals/Treatment render as their own labeled
   blocks rather than one flat list; isGrouped()/groupsForStep() below
   normalize both shapes to a flat row count where a plain count is needed. */
function rowsForStep(step, section, formatters) {
  const formatter = formatters?.[step.id];
  if (formatter) return formatter(section);
  return Object.entries(section)
    .filter(([k]) => !k.startsWith("__"))
    .map(([k, v]) => ({ label: humanizeKey(k), value: fmtVal(v) }))
    .filter((r) => r.value);
}
const isGrouped = (result) => result && !Array.isArray(result) && Array.isArray(result.groups);
const rowCount = (result) => (isGrouped(result) ? result.groups.reduce((n, g) => n + g.rows.length, 0) : result.length);

export function AssessmentSummary({ icon, title, sub, steps, data, onEdit, exportHeaderLines, extra, formatters, hideTitle }) {
  const [copied, setCopied] = useState(false);
  const contentSteps = steps.filter((s) => s.id !== "review" && s.id !== "setup");

  const exportText = useMemo(() => {
    let lines = [...exportHeaderLines, ""];
    contentSteps.forEach((step) => {
      const result = rowsForStep(step, data[step.id] || {}, formatters);
      if (!rowCount(result)) return;
      lines.push(`— ${step.label} —`);
      if (isGrouped(result)) {
        result.groups.forEach(({ heading, rows }) => {
          if (!rows.length) return;
          lines.push(heading + ":");
          rows.forEach(({ label, value }) => lines.push(value ? `  ${label}: ${value}` : `  ${label}`));
        });
      } else {
        result.forEach(({ label, value }) => lines.push(`${label}: ${value}`));
      }
      lines.push("");
    });
    return lines.join("\n");
  }, [data, exportHeaderLines, contentSteps, formatters]);

  const anyData = contentSteps.some((step) => rowCount(rowsForStep(step, data[step.id] || {}, formatters)));

  return (
    <>
      {/* SpecialtyPatientProfile.jsx's card already renders its own
          icon/title header row (with New Assessment/Edit buttons) right
          above this component -- rendering it again here duplicated the
          title on the patient profile screen (2026-09-10, Aditi screenshot:
          "why it showing like that"). The wizard's own Review step is the
          only place on its page with a heading, so it still needs this. */}
      {!hideTitle && <SectionIntro icon={icon} title={title} sub={sub} />}
      {extra}
      {contentSteps.map((step) => {
        const result = rowsForStep(step, data[step.id] || {}, formatters);
        if (!rowCount(result)) return null;
        return (
          <button type="button" className="summary-card" key={step.id} onClick={() => onEdit(step.id)}>
            <div className="summary-title">
              {step.icon} {step.label}
            </div>
            {isGrouped(result)
              ? result.groups.map(({ heading, rows }) =>
                  rows.length ? (
                    <div key={heading} className="summary-group">
                      <div className="summary-group-heading">{heading}</div>
                      {rows.map(({ label, value }, i) => (
                        <div className="summary-row" key={label + i}>
                          <span className="summary-key">{label}</span>
                          {value && <span className="summary-val">{value}</span>}
                        </div>
                      ))}
                    </div>
                  ) : null
                )
              : result.map(({ label, value }, i) => (
                  <div className="summary-row" key={label + i}>
                    <span className="summary-key">{label}</span>
                    <span className="summary-val">{value}</span>
                  </div>
                ))}
          </button>
        );
      })}
      {!anyData && <div className="summary-empty">Nothing recorded yet — fill in a few sections and they'll appear here.</div>}
      <button
        type="button"
        className="primary-btn"
        style={{ marginTop: 12 }}
        onClick={() => {
          navigator.clipboard?.writeText(exportText);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied ✓" : "Copy assessment as text"}
      </button>
    </>
  );
}
