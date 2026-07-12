// completeness.ts — Stage 4 DATA COMPLETENESS & VALIDATION. Deterministic and
// computed client-side (never asks an LLM to self-report its own gaps). Produces
// the missing-information checklist, conflicting-findings list, and the
// assessment-level EvidenceConfidence that later reduces diagnostic confidence
// when key examinations are absent.

import type {
  Finding, ObjectiveFindings, CompletenessReport, Domain,
} from "./types";
import { clamp, round } from "./determinism";

interface RegionCompletenessConfig {
  expectedDomains: Domain[];
  criticalExams: { exam: string; domain: Domain; why: string }[];
}

const CONFIGS: Record<string, RegionCompletenessConfig> = {
  cervical: {
    expectedDomains: ["history", "painBehaviour", "rom", "mmt", "specialTests", "palpation"],
    criticalExams: [
      { exam: "Active/Passive cervical ROM", domain: "rom", why: "Range + directional provocation is required to separate facet from radicular presentations." },
      { exam: "Neurological screen (dermatomes/myotomes/reflexes)", domain: "mmt", why: "Neuro testing is required to confirm or clear radiculopathy/myelopathy." },
      { exam: "Cervical special-test cluster", domain: "specialTests", why: "Wainner/flexion-rotation/UMN testing is required to raise or lower structural probabilities." },
    ],
  },
  shoulder: {
    expectedDomains: ["history", "painBehaviour", "rom", "endFeel", "mmt", "specialTests", "palpation"],
    criticalExams: [
      { exam: "Active/Passive ROM", domain: "rom", why: "Range + capsular-pattern data is required to separate stiffness-driven from impingement-driven presentations." },
      { exam: "Resisted isometrics / MMT", domain: "mmt", why: "Contractile testing is required to implicate or clear the rotator cuff." },
      { exam: "Subacromial/cuff special tests", domain: "specialTests", why: "Special-test clustering is required to raise or lower structural probabilities." },
    ],
  },
};

function domainsWithData(findings: Finding[], objective: ObjectiveFindings): Domain[] {
  const set = new Set<Domain>();
  for (const f of findings) set.add(f.domain);
  if (objective.rom.length) set.add("rom");
  if (objective.mmt.length) set.add("mmt");
  if (Object.keys(objective.specialTests).length) set.add("specialTests");
  if (objective.palpation.tenderStructures.length) set.add("palpation");
  if (objective.functional.movements.length) set.add("functional");
  if (objective.imaging?.performed) set.add("imaging");
  return [...set].sort();
}

function detectConflicts(findings: Finding[]): string[] {
  const has = (c: string) => findings.some((f) => f.code === c);
  const conflicts: string[] = [];
  if (has("capsular_pattern") && has("apprehension_positive")) {
    conflicts.push("Capsular pattern (stiffness) co-exists with positive apprehension (instability) — clinically unusual; re-check both.");
  }
  if (has("drop_arm_positive") && !has("abduction_weak")) {
    conflicts.push("Drop-arm positive but abduction strength graded normal — recheck MMT or drop-arm test.");
  }
  if (has("capsular_pattern") && has("painful_arc") && !has("global_rom_loss")) {
    conflicts.push("Painful arc requires available range, yet a capsular restriction pattern is recorded — verify ROM values.");
  }
  return conflicts;
}

export function assessCompleteness(
  findings: Finding[],
  objective: ObjectiveFindings,
  region: string
): CompletenessReport {
  const config = CONFIGS[region];
  const present = domainsWithData(findings, objective);
  const conflicts = detectConflicts(findings);

  const missingCritical = config
    ? config.criticalExams
        .filter((c) => !present.includes(c.domain))
        .map((c) => ({ exam: c.exam, why: c.why }))
    : [];

  let evidenceConfidence = 0;
  if (config) {
    const covered = config.expectedDomains.filter((d) => present.includes(d)).length;
    const base = (covered / config.expectedDomains.length) * 100;
    const conflictPenalty = conflicts.length * 8;
    const criticalPenalty = missingCritical.length * 12;
    evidenceConfidence = round(clamp(base - conflictPenalty - criticalPenalty));
  }

  return { missingCritical, conflicts, domainsWithData: present, evidenceConfidence };
}
