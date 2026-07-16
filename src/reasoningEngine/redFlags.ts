// redFlags.ts — runs FIRST, independent of all other logic. Any trigger halts
// diagnosis and forces refer-first in the exam plan. Deterministic; missing
// field = not triggered (never crashes the screen).

import type { SubjectiveInput, RedFlagResult, RedFlag } from "./types";

interface Rule { id: string; check: (s: SubjectiveInput) => boolean; message: string; }

const RULES: Rule[] = [
  {
    id: "cauda_equina",
    check: (s) => !!(s.saddleAnesthesia || s.bladderBowelChange || s.bilateralLegWeakness),
    message: "Possible cauda equina syndrome — immediate referral required.",
  },
  {
    id: "fracture",
    check: (s) => !!(s.traumaHistory && s.unableToWeightBear),
    message: "Possible fracture — imaging referral indicated before loading.",
  },
  {
    id: "malignancy",
    check: (s) => !!(s.unexplainedWeightLoss && s.nightPainUnrelieved && s.ageOver50),
    message: "Malignancy screen positive — refer for further investigation.",
  },
  {
    id: "vascular",
    check: (s) => !!(s.suddenSevereHeadacheOrNeckPain || s.vertebrobasilarSigns || s.vascularCompromiseSigns),
    message: "Possible vascular pathology — do not proceed with manual therapy.",
  },
  {
    id: "joint_emergency",
    check: (s) => !!(s.hotSwollenJoint || s.irreducibleLocking),
    message: "Acute joint emergency (septic arthritis / irreducible mechanical block) — urgent same-day referral; do not proceed with routine assessment.",
  },
  {
    id: "infection",
    check: (s) => !!(s.fever && s.constantUnremittingPain),
    message: "Possible infective process — refer for medical assessment.",
  },
  {
    id: "myelopathy",
    check: (s) => !!s.myelopathySigns,
    message: "Possible cervical myelopathy — urgent referral required.",
  },
  {
    id: "systemic",
    check: (s) => !!(s.systemicIllness || s.malignancyHistory),
    message: "Systemic/serious pathology flag raised — refer per protocol before proceeding.",
  },
];

export function redFlagScreen(subjective: SubjectiveInput): RedFlagResult {
  const flags: RedFlag[] = [];
  for (const r of RULES) {
    try {
      if (r.check(subjective)) flags.push({ id: r.id, message: r.message });
    } catch {
      // missing field -> treat as not triggered
    }
  }
  return { triggered: flags.length > 0, flags };
}
