// clinicalHomeTheme.js
// Shared pastel tokens for the Clinical home redesign (ClinicalHome.jsx +
// the tab row/specialty-picker restyle in AppFull.jsx). Colors below reuse
// the exact hex values already in PatientDatabase.jsx's SPECIALTY_CARD_META
// and AppFull.jsx's STREAM_ICONS rather than inventing a new palette --
// this is a consolidation point for two files that both need the same
// tokens, not a replacement for those existing per-specialty maps.
export const CLINICAL_PASTEL = {
  headerBg: "#EDE7FA",
  pageBg: "#F7F5FC",
  gradientPrimary: "linear-gradient(135deg,#7c3aed,#9333ea)", // same gradient as the existing "+ New Assessment" CTA
  cardRadius: 18,
  pillRadius: 999,
  shadow: "0 1px 6px rgba(16,24,40,0.05)",
  shadowRaised: "0 8px 18px rgba(124,58,237,0.16), 0 2px 4px rgba(124,58,237,0.10)",
  lavender: { bg: "#F3EEFF", fg: "#7c3aed" },
  mint: { bg: "#E6FBF8", fg: "#0d9488" },
  peach: { bg: "#FFF1E6", fg: "#ea580c" },
  pink: { bg: "#FDEAEC", fg: "#dc2626" },
  blue: { bg: "#EFF6FF", fg: "#2563eb" },
};
