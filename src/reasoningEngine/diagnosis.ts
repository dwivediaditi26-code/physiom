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
import footEvidence from "./regions/foot.evidence.json";
import handEvidence from "./regions/hand.evidence.json";

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
  foot: footEvidence as EvidenceConfig,
  hand: handEvidence as EvidenceConfig,
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
    assessmentModules: assessmentModulesFor(model, findingsByCode),
  };
}


// Map a diagnosis to the clickable objective-assessment MODULES relevant to it.
// Authored layers (observation/posture/functional/fascia/outcome) come from the
// evidence model's conditionLayers; the rest are inferred from the finding tokens
// the model actually scores on, so the buttons are condition-specific.
function assessmentModulesFor(
  model: EvidenceModel,
  findingsByCode: Map<string, Finding>,
): { label: string; key: string; detail: string }[] {
  const toks = [...(model.requiredFindings || []), ...(model.supportingFindings || [])];
  const cl = ((model as unknown) as { conditionLayers?: Record<string, string> }).conditionLayers || {};
  const notNA = (v?: string) => !!v && !v.toUpperCase().startsWith("N/A");
  // Written expected finding for a derived layer: prefer the finding's own source
  // description, else a humanised token.
  const label = (c: string) => findingsByCode.get(c)?.source || humanize(c);
  const join = (pred: (t: string) => boolean) => toks.filter(pred).map(label).join("; ");
  const out: { label: string; key: string; detail: string }[] = [];
  if (notNA(cl.observation)) out.push({ label: "Observation", key: "observation", detail: cl.observation });
  if (notNA(cl.posture)) out.push({ label: "Posture", key: "posture", detail: cl.posture });
  if (notNA(cl.functionalScreen)) out.push({ label: "Functional (FMA)", key: "fma", detail: cl.functionalScreen });
  const sp = join((t) => t.endsWith("_positive") || t.includes("_test") || t.includes("cluster"));
  if (sp) out.push({ label: "Special tests", key: "special", detail: sp });
  const st = join((t) => t.includes("resisted") || t.includes("weak_or_painful") || t.includes("painful_resist"));
  if (st) out.push({ label: "STTT (Cyriax)", key: "cyriax_full", detail: st });
  const cp = join((t) => t.startsWith("cpa_"));
  if (cp) out.push({ label: "CPA", key: "nkt", detail: cp });
  const kc = join((t) => t.startsWith("kc_"));
  if (kc) out.push({ label: "Kinetic chain", key: "kinetic", detail: kc });
  const rm = join((t) => t.endsWith("_loss") || t.endsWith("_limited"));
  if (rm) out.push({ label: "ROM", key: "rom", detail: rm });
  const pl = join((t) => t.endsWith("tender"));
  if (pl) out.push({ label: "Palpation", key: "palpation", detail: pl });
  if (notNA(cl.fascia)) out.push({ label: "Fascia", key: "fascia", detail: cl.fascia });
  if (notNA(cl.outcome)) out.push({ label: "Outcome", key: "outcome", detail: cl.outcome });
  return out;
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
