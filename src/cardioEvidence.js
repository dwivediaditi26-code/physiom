/* ============================================================
   cardioEvidence.js — structured, citation-only evidence library
   for the Cardio Treatment Assistant. Deliberately citation-only:
   title/author/year/type/tier metadata so the AI can point to a
   real source, never the source's actual text. No copyrighted
   textbook content is stored or ingested here — Main & Denehy is
   cited the same way a reference list cites it, nothing more.
   Swap/extend this once licensed excerpt text is actually cleared
   for ingestion; until then this is the safe default for every
   tier, including textbooks.

   Tier meaning (therapist-facing, matches the app's own hierarchy):
   1 = current guideline / scientific statement
   2 = professional position statement
   3 = systematic review / meta-analysis / RCT
   4 = textbook (assessment, technique, physiology, teaching)
   ============================================================ */
export const CARDIO_EVIDENCE = {
  ahaAacvpr2024: {
    tier: 1,
    type: "Scientific statement",
    source: "AHA / AACVPR",
    title: "Core Components of Cardiac Rehabilitation Programs — 2024 Update",
    year: 2024,
    note: "Endorsed by the American College of Cardiology.",
  },
  aacvpr2025Volume: {
    tier: 2,
    type: "Position statement",
    source: "AACVPR",
    title: "Volume of Aerobic Exercise to Optimize Outcomes in Cardiac Rehabilitation",
    year: 2025,
  },
  whoCardiopulm: {
    tier: 1,
    type: "WHO guidance package",
    source: "World Health Organization",
    title: "Package of Interventions for Rehabilitation — Module 4: Cardiopulmonary Conditions",
    year: 2023,
  },
  mainDenehy: {
    tier: 4,
    type: "Textbook",
    source: "Main E, Denehy L (eds)",
    title: "Cardiorespiratory Physiotherapy: Adults and Paediatrics, 5th ed.",
    year: 2016,
    note: "Cited for assessment/technique framework only — text not reproduced.",
  },
  pryorPrasad: {
    tier: 4,
    type: "Textbook",
    source: "Pryor JA, Prasad SA",
    title: "Physiotherapy for Respiratory and Cardiac Problems",
    year: 2008,
    note: "Foundational reference — cited for technique/procedure framework only.",
  },
};

export const EVIDENCE_TIER_LABEL = {
  1: "Guideline / scientific statement",
  2: "Position statement",
  3: "Systematic review / trial",
  4: "Textbook",
};
