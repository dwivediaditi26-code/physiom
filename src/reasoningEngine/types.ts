// types.ts — shared interfaces for the PhysioMind deterministic reasoning engine.
// No runtime LLM, no randomness, no Date usage. Same input -> same output.

export type Priority = "High" | "Medium" | "Low";
export type ConfidenceBand = "High" | "Moderate" | "Low";

/** Clinical domains a finding can come from — used for weighted scoring. */
export type Domain =
  | "history"
  | "painBehaviour"
  | "rom"
  | "endFeel"
  | "mmt"
  | "palpation"
  | "specialTests"
  | "functional"
  | "imaging";

export const DOMAINS: Domain[] = [
  "history", "painBehaviour", "rom", "endFeel",
  "mmt", "palpation", "specialTests", "functional", "imaging",
];

/** A single normalised, deterministically-derived clinical finding. */
export interface Finding {
  code: string;         // stable finding code, e.g. "painful_arc"
  domain: Domain;
  present: boolean;     // true = affirmatively present; only present findings score
  source: string;       // human-readable provenance (e.g. "Hawkins-Kennedy: positive")
}

/** Normalised subjective assessment (Stage 1 output). Unknown => null/undefined. */
export interface SubjectiveInput {
  region?: string;
  chiefComplaint: string;
  ageOver50?: boolean;
  // red-flag sub-signals (booleans; undefined = not mentioned)
  saddleAnesthesia?: boolean;
  bladderBowelChange?: boolean;
  bilateralLegWeakness?: boolean;
  traumaHistory?: boolean;
  unableToWeightBear?: boolean;
  unexplainedWeightLoss?: boolean;
  nightPainUnrelieved?: boolean;
  suddenSevereHeadacheOrNeckPain?: boolean;
  vertebrobasilarSigns?: boolean;
  fever?: boolean;
  constantUnremittingPain?: boolean;
  myelopathySigns?: boolean;
  systemicIllness?: boolean;
  malignancyHistory?: boolean;
  // shoulder-relevant history signals
  constantPain?: boolean;
  easesWithRest?: boolean;
  nightPain?: boolean;
  paresthesia?: boolean;
  radiationBelowElbow?: boolean;
  onsetTraumatic?: boolean;
  onsetInsidious?: boolean;
  overheadAggravation?: boolean;
  progressiveStiffness?: boolean;
  ageBand?: "under40" | "40to65" | "over65";
  // cervical-relevant history signals
  radiatingArmPain?: boolean;
  dermatomalPattern?: boolean;
  headacheFromNeck?: boolean;
  unilateralHeadache?: boolean;
  neckStiffness?: boolean;
  extensionRotationAggravation?: boolean;
  gaitDisturbance?: boolean;
  dizzinessVBI?: boolean;
  // lumbar-relevant history signals
  legPainBelowKnee?: boolean;
  bilateralLegSymptoms?: boolean;
  flexionAggravation?: boolean;
  extensionAggravation?: boolean;
  sittingAggravation?: boolean;
  neurogenicClaudication?: boolean;
  centralisesWithExtension?: boolean;
  centralisesWithFlexion?: boolean;
  sacroiliacPainPattern?: boolean;
  youngAthleteExtensionPain?: boolean;
  footDropReported?: boolean;
  hotSwollenJoint?: boolean;
  irreducibleLocking?: boolean;
  vascularCompromiseSigns?: boolean;
  // hip-relevant history signals
  hipGroinDominantPattern?: boolean;
  cSignPositive?: boolean;
  fadirAggravation?: boolean;
  faberAggravation?: boolean;
  lateralHipPattern?: boolean;
  worseLyingOnAffectedSide?: boolean;
  ischialSittingPain?: boolean;
  proximalHamstringPattern?: boolean;
  adductorPattern?: boolean;
  pubicSymphysisPattern?: boolean;
  kickingOrSprintMechanism?: boolean;
  snappingHipInternal?: boolean;
  snappingHipExternal?: boolean;
  hipCatchingOrLocking?: boolean;
  hipCrepitusGrinding?: boolean;
  deepButtockPain?: boolean;
  meralgiaPattern?: boolean;
  hipMorningStiffness?: boolean;
  avnRiskFactors?: boolean;
  nonMskReferralSuspected?: boolean;
  // knee-relevant history signals
  kneeNonContactTwistMechanism?: boolean;
  kneeAcutePopFelt?: boolean;
  kneeImmediateHaemarthrosis?: boolean;
  kneeGivingWayWithPivot?: boolean;
  kneeTrueLocking?: boolean;
  kneeMovieSignPositive?: boolean;
  kneeWorseDescendingStairs?: boolean;
  kneeValgusMechanism?: boolean;
  kneeVarusMechanism?: boolean;
  kneePclMechanism?: boolean;
  kneeJointLineMechanical?: boolean;
  kneeDelayedOrRecurrentSwelling?: boolean;
  kneeAnteriorPainPattern?: boolean;
  kneePatellarTendonPattern?: boolean;
  kneeMedialJointPain?: boolean;
  kneeLateralJointPain?: boolean;
  kneeLateralItbPattern?: boolean;
  kneeDiffuseWholeKneePain?: boolean;
  symptomDurationDays?: number | null;
}

/** Normalised objective findings (Stage 3 output). */
export interface RomEntry {
  movement: string;
  activeROM: number | null;
  passiveROM: number | null;
  normalROM: number | null;
  endFeel?: string;
  painOnActive?: boolean;
  painOnPassive?: boolean;
}
export interface MmtEntry {
  muscle: string;
  grade: number;         // 0..5
  painOnResist?: boolean;
}
export interface ObjectiveFindings {
  rom: RomEntry[];
  mmt: MmtEntry[];
  specialTests: Record<string, boolean>;
  palpation: { tenderStructures: string[] };
  functional: { movements: { movementName: string; grade: number | string }[] };
  imaging?: { performed: boolean; summary?: string };
}

/** Red-flag screen (Stage, runs first). */
export interface RedFlag { id: string; message: string; }
export interface RedFlagResult { triggered: boolean; flags: RedFlag[]; }

/** Exam-planning (Stage 2). */
export interface ExamRecommendation {
  exam: string;
  why: string;
  confirmsOrExcludes: string;
  priority: Priority;
}
export interface ExamPlan {
  region: string;
  referFirst: RedFlagResult | null; // non-null => refer before further testing
  recommendations: ExamRecommendation[];
}

/** Completeness / validation (Stage 4). */
export interface CompletenessReport {
  missingCritical: { exam: string; why: string }[];
  conflicts: string[];
  domainsWithData: Domain[];
  evidenceConfidence: number;     // 0..100 — how complete/reliable the assessment is
}

/** Evidence model loaded from region JSON (config-driven, no hardcoded dx in code). */
export interface EvidenceModel {
  name: string;
  source: string;
  requiredFindings: string[];
  supportingFindings: string[];
  conflictingFindings: string[];
  exclusionFindings: string[];
  weights: Partial<Record<Domain, number>>;
  keyExams: string[];             // exams whose absence lowers confidence for THIS dx
}

/** Ranked diagnosis candidate with dual confidence + full explainability (Stage 5). */
export interface DiagnosisCandidate {
  name: string;
  source: string;
  diagnosticMatchScore: number;   // 0..100 — fit to available evidence
  evidenceConfidence: number;     // 0..100 — completeness/reliability (assessment-level)
  band: ConfidenceBand;
  excluded: boolean;
  supportingFindings: string[];
  conflictingFindings: string[];
  missingFindings: string[];
  recommendedAdditional: string[];
  whySuggested: string;
  whyConfidenceReduced: string[];
}

/** Clinical interpretation (Stage 6). */
export interface ClinicalInterpretation {
  summary: string;
  primaryImpairments: string[];
  likelyPainGenerators: string[];
  movementDysfunction: string[];
  functionalLimitations: string[];
  redFlags: string[];
  yellowFlags: string[];
  treatmentPriorities: string[];
  suggestedGoals: string[];
  homeAdvice: string[];
  referralRecommendation: string | null;
}

/** Full pipeline output. */
export interface ReasoningResult {
  region: string;
  redFlag: RedFlagResult;
  examPlan: ExamPlan;
  completeness: CompletenessReport;
  differentials: DiagnosisCandidate[];
  interpretation: ClinicalInterpretation | null;
  stopped: boolean;               // true when a red flag halts diagnosis
  message?: string;
}
