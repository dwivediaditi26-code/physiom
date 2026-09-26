import React from "react";

/* Canonical type scale for every clinical-assessment screen (Ortho/Cardio/
   Neuro wizards + their Summary/Review screens + PDF export). Colors are
   deliberately NOT here -- each module keeps its own BRAND object
   (orthoFieldKit.jsx / CardiopulmonaryAssessment.jsx / NeurologicalAssessment.jsx),
   this file only owns size/weight/line-height so the three modules can't
   drift out of sync on scale while staying free to differ on color.
   Colorless and dependency-free on purpose -- Cardio/Neuro don't import
   orthoFieldKit.jsx today and shouldn't have to start just for type sizes. */
export const TYPO = {
  assessmentTitle:   { size: 26, weight: 700, lineHeight: 1.2 },
  sectionHeading:    { size: 19, weight: 600, lineHeight: 1.3 },
  subsectionHeading: { size: 16, weight: 600, lineHeight: 1.3 },
  fieldLabel:        { size: 13, weight: 500, lineHeight: 1.3 },
  // Aditi asked for clinical answers to stay bold/solid-black (2026-09-26,
  // "make it daeker bild") rather than the medium weight a generic
  // typography spec suggested -- keep both intents true: prominent AND bold.
  clinicalValue:     { size: 15, weight: 700, lineHeight: 1.55 },
  supportingText:    { size: 13, weight: 400, lineHeight: 1.45 },
};

export const SPACING = {
  labelToValue: 8,
  betweenRelatedFields: 16,
  betweenSubsections: 24,
  betweenMajorSections: 28,
  cardPaddingV: 16,
  cardPaddingH: 18,
};

export function AssessmentTitle({ children, ...rest }) {
  return <div className="assessment-title" {...rest}>{children}</div>;
}

export function SectionTitle({ children, ...rest }) {
  return <div className="section-intro-title" {...rest}>{children}</div>;
}

export function SubsectionTitle({ children, ...rest }) {
  return <div className="subheading" {...rest}>{children}</div>;
}

// variant="field" (default) = live data-entry question text (.field-label).
// variant="summary" = the label half of a Review-screen row (.summary-key).
export function FieldLabel({ children, variant = "field", ...rest }) {
  return <span className={variant === "summary" ? "summary-key" : "field-label"} {...rest}>{children}</span>;
}

// variant="summary" (default) = the Review-screen answer text (.summary-val).
// variant="input" = a live data-entry filled-in value (.value-input).
export function ClinicalValue({ children, variant = "summary", ...rest }) {
  return <span className={variant === "input" ? "value-input" : "summary-val"} {...rest}>{children}</span>;
}

export function SupportingText({ children, ...rest }) {
  if (!children) return null;
  return <div className="hint" {...rest}>💡 {children}</div>;
}

// One label+value row for a Review/Summary screen -- replaces the
// hand-rolled <div className="summary-row"> JSX previously copy-pasted
// across orthoSummary.jsx, CardiopulmonaryAssessment.jsx, and
// NeurologicalAssessment.jsx.
export function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="summary-row">
      <FieldLabel variant="summary">{label}</FieldLabel>
      <ClinicalValue variant="summary">{value}</ClinicalValue>
    </div>
  );
}
