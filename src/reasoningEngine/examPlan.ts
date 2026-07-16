// examPlan.ts — Stage 2 EXAMINATION-PLANNING engine. Runs immediately after the
// subjective assessment. It does NOT diagnose. It answers: "given this history,
// what objective examination should the therapist perform next?" — with a
// rationale, what each exam confirms/excludes, and a clinical priority.
// If a red flag is present, it recommends referral BEFORE any further testing.

import type {
  SubjectiveInput, ExamPlan, ExamRecommendation, RedFlagResult, Priority,
} from "./types";
import shoulderPlan from "./regions/shoulder.examplan.json";
import cervicalPlan from "./regions/cervical.examplan.json";
import lumbarPlan from "./regions/lumbar.examplan.json";
import hipPlan from "./regions/hip.examplan.json";
import kneePlan from "./regions/knee.examplan.json";
import elbowPlan from "./regions/elbow.examplan.json";

interface PlanConfig {
  region: string;
  always: ExamRecommendation[];
  conditional: { when: { flag: keyof SubjectiveInput; equals: boolean }; add: ExamRecommendation }[];
  supporting: ExamRecommendation[];
}

const CONFIGS: Record<string, PlanConfig> = {
  shoulder: shoulderPlan as PlanConfig,
  cervical: cervicalPlan as PlanConfig,
  lumbar: lumbarPlan as PlanConfig,
  hip: hipPlan as PlanConfig,
  knee: kneePlan as PlanConfig,
  elbow: elbowPlan as PlanConfig,
};

const PRIORITY_RANK: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

export function buildExamPlan(
  subjective: SubjectiveInput,
  region: string,
  redFlag: RedFlagResult
): ExamPlan {
  const config = CONFIGS[region];

  if (redFlag.triggered) {
    return {
      region,
      referFirst: redFlag,
      recommendations: [
        {
          exam: "Refer / escalate before further physical testing",
          why: redFlag.flags.map((f) => f.message).join(" "),
          confirmsOrExcludes: "Serious pathology screen — safety first",
          priority: "High",
        },
      ],
    };
  }

  if (!config) {
    return { region, referFirst: null, recommendations: [] };
  }

  const byExam = new Map<string, ExamRecommendation>();
  const push = (r: ExamRecommendation) => {
    const existing = byExam.get(r.exam);
    if (!existing || PRIORITY_RANK[r.priority] > PRIORITY_RANK[existing.priority]) {
      byExam.set(r.exam, r);
    }
  };

  for (const r of config.always) push(r);
  for (const c of config.conditional) {
    if (subjective[c.when.flag] === c.when.equals) push(c.add);
  }
  for (const r of config.supporting) push(r);

  const recommendations = [...byExam.values()].sort((a, b) => {
    const d = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (d !== 0) return d;
    return a.exam.localeCompare(b.exam); // deterministic tie-break
  });

  return { region, referFirst: null, recommendations };
}
