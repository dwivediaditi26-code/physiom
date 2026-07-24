// diagnosis.ts — Stage 5 PROVISIONAL DIAGNOSIS ENGINE. Config-driven (evidence
// models live in region JSON, never hardcoded here). For every diagnosis it
// computes an explicit weighted match against the present findings, produces
// TWO independent scores (DiagnosticMatchScore = fit to evidence present;
// EvidenceConfidence = completeness/reliability of the assessment), ranks the
// differentials, and returns full explainability (support / conflict / missing /
// why-reduced / recommended-additional). Deterministic throughout.

import type {
  Finding, EvidenceModel, DiagnosisCandidate, CompletenessReport, Domain,
} from "./types";
import { clamp, round, band, byScoreThenName } from "./determinism";
import { FINDING_DOMAIN } from "./findings";
import shoulderEvidence from "./regions/shoulder.evidence.json";
import cervicalEvidence from "./regions/cervical.evidence.json";
import lumbarEvidence from "./regions/lumbar.evidence.json";
import hipEvidence from "./regions/hip.evidence.json";
import kneeEvidence from "./regions/knee.evidence.json";
import elbowEvidence from "./regions/elbow.evidence.json";
import thoracicEvidence from "./regions/thoracic.evidence.json";
import ankleEvidence from "./regions/ankle.evidence.json";
import wristEvidence from "./regions/wrist.evidence.json";
import siEvidence from "./regions/si.evidence.json";

interface EvidenceConfig { region: string; diagnoses: EvidenceModel[]; }
const CONFIGS: Record<string, EvidenceConfig> = {
  shoulder: shoulderEvidence as EvidenceConfig,
  cervical: cervicalEvidence as EvidenceConfig,
  lumbar: lumbarEvidence as EvidenceConfig,
  hip: hipEvidence as EvidenceConfig,
  knee: kneeEvidence as EvidenceConfig,
  elbow: elbowEvidence as EvidenceConfig,
  thoracic: thoracicEvidence as EvidenceConfig,
  ankle: ankleEvidence as EvidenceConfig,
  wrist: wristEvidence as EvidenceConfig,
  si: siEvidence as EvidenceConfig,
};

const DEFAULT_WEIGHT = 0.5;

function domainWeight(model: EvidenceModel, code: string): number {
  const domain = FINDING_DOMAIN[code] as Domain | undefined;
  if (!domain) return DEFAULT_WEIGHT;
  return model.weights[domain] ?? DEFAULT_WEIGHT;
}

function humanize(code: string): string {
  return code.replace(/_/g, " ");
}

function scoreModel(
  model: EvidenceModel,
  presentCodes: Set<string>,
  findingsByCode: Map<string, Finding>,
  completeness: CompletenessReport
): DiagnosisCandidate {
  // Exclusion: any exclusion finding present zeroes the diagnosis.
  const excludedBy = model.exclusionFindings.filter((c) => presentCodes.has(c));
  const excluded = excludedBy.length > 0;

  const pool = [...new Set([...model.requiredFindings, ...model.supportingFindings])];
  let gained = 0;
  let maxPossible = 0;
  const supportingPresent: string[] = [];
  const missing: string[] = [];
  for (const code of pool) {
    const w = domainWeight(model, code);
    maxPossible += w;
    if (presentCodes.has(code)) {
      gained += w;
      supportingPresent.push(code);
    } else {
      missing.push(code);
    }
  }

  // Required-finding gating: missing required findings scale the score down.
  const reqTotal = model.requiredFindings.length;
  const reqPresent = model.requiredFindings.filter((c) => presentCodes.has(c)).length;
  const requiredFactor = reqTotal === 0 ? 1 : reqPresent / reqTotal;

  // Conflicting findings penalise the base fraction.
  const conflictingPresent = model.conflictingFindings.filter((c) => presentCodes.has(c));
  const conflictPenalty = conflictingPresent.length * 0.15;

  const baseFraction = maxPossible > 0 ? gained / maxPossible : 0;
  const matchRaw = (baseFraction * requiredFactor - conflictPenalty) * 100;
  const diagnosticMatchScore = excluded ? 0 : round(clamp(matchRaw));

  // Per-candidate confidence reduction reasons.
  const whyConfidenceReduced: string[] = [];
  if (completeness.evidenceConfidence < 90) {
    whyConfidenceReduced.push(`Assessment only ${completeness.evidenceConfidence}% complete — key domains not yet examined.`);
  }
  if (reqTotal > 0 && reqPresent < reqTotal) {
    whyConfidenceReduced.push(`Required finding(s) absent: ${model.requiredFindings.filter((c) => !presentCodes.has(c)).map(humanize).join(", ")}.`);
  }
  if (conflictingPresent.length) {
    whyConfidenceReduced.push(`Conflicting finding(s) present: ${conflictingPresent.map(humanize).join(", ")}.`);
  }
  for (const c of completeness.conflicts) whyConfidenceReduced.push(c);

  // Recommended additional = key exams for this dx whose supporting findings are
  // still unconfirmed (would most raise/lower this diagnosis).
  const recommendedAdditional = supportingPresent.length < pool.length ? [...model.keyExams] : [];

  const whySuggested = excluded
    ? `Excluded: ${excludedBy.map(humanize).join(", ")} present.`
    : supportingPresent.length
      ? `Supported by ${supportingPresent.length} finding(s): ${supportingPresent.map((c) => findingsByCode.get(c)?.source || humanize(c)).slice(0, 4).join("; ")}.`
      : "No supporting findings yet present for this pattern.";

  return {
    name: model.name,
    source: model.source,
    diagnosticMatchScore,
    evidenceConfidence: completeness.evidenceConfidence,
    band: band(diagnosticMatchScore),
    excluded,
    supportingFindings: supportingPresent.map((c) => findingsByCode.get(c)?.source || humanize(c)),
    conflictingFindings: conflictingPresent.map(humanize),
    missingFindings: missing.map(humanize),
    recommendedAdditional,
    whySuggested,
    whyConfidenceReduced,
  };
}

export function rankDifferentials(
  findings: Finding[],
  region: string,
  completeness: CompletenessReport
): DiagnosisCandidate[] {
  const config = CONFIGS[region];
  if (!config) return [];

  const presentCodes = new Set(findings.filter((f) => f.present).map((f) => f.code));
  const findingsByCode = new Map(findings.map((f) => [f.code, f]));

  const scored = config.diagnoses.map((m) => scoreModel(m, presentCodes, findingsByCode, completeness));

  // Deterministic ranking: match score desc, then name asc. Excluded sink to bottom.
  return scored.sort(byScoreThenName((c) => (c.excluded ? -1 : c.diagnosticMatchScore)));
}
