import React, { useMemo, useState } from "react";
import { SectionIntro, fmtVal } from "./orthoFieldKit.jsx";

/* Cardio-style summary/review — one card per completed section, each row a
   plain label/value pair, exactly matching CardiopulmonaryAssessment's
   SummarySection. Tapping a card jumps back to that step to edit it.

   Most sections are flat key/value objects and read fine with the generic
   fmtVal flattener. Region-driven sections (ROM, MMT, Joint Mobility,
   Special Tests) nest data per-region/per-movement — `formatters[stepId]`
   lets those modules supply their own {label, value}[] extractor so their
   results still show up here instead of "[object Object]". */
function rowsForStep(step, section, formatters) {
  const formatter = formatters?.[step.id];
  if (formatter) return formatter(section);
  return Object.entries(section)
    .filter(([k]) => !k.startsWith("__"))
    .map(([k, v]) => ({ label: k, value: fmtVal(v) }))
    .filter((r) => r.value);
}

export function AssessmentSummary({ icon, title, sub, steps, data, onEdit, exportHeaderLines, extra, formatters }) {
  const [copied, setCopied] = useState(false);
  const contentSteps = steps.filter((s) => s.id !== "review" && s.id !== "setup");

  const exportText = useMemo(() => {
    let lines = [...exportHeaderLines, ""];
    contentSteps.forEach((step) => {
      const rows = rowsForStep(step, data[step.id] || {}, formatters);
      if (rows.length) {
        lines.push(`— ${step.label} —`);
        rows.forEach(({ label, value }) => lines.push(`${label}: ${value}`));
        lines.push("");
      }
    });
    return lines.join("\n");
  }, [data, exportHeaderLines, contentSteps, formatters]);

  const anyData = contentSteps.some((step) => rowsForStep(step, data[step.id] || {}, formatters).length);

  return (
    <>
      <SectionIntro icon={icon} title={title} sub={sub} />
      {extra}
      {contentSteps.map((step) => {
        const rows = rowsForStep(step, data[step.id] || {}, formatters);
        if (!rows.length) return null;
        return (
          <button type="button" className="summary-card" key={step.id} onClick={() => onEdit(step.id)}>
            <div className="summary-title">
              {step.icon} {step.label}
            </div>
            {rows.map(({ label, value }, i) => (
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
