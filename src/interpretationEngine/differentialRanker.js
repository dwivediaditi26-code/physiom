// differentialRanker.js
// Merges all domain findings, scores against config-driven differential list, ranks output.

import differentialConfig from "./differentialConfig.json";

function differentialRanker(findings = [], region = {}) {
  const candidates = differentialConfig[region.region] || [];
  if (candidates.length === 0) {
    return {
      primaryDifferential: null,
      confidence: 0,
      alternateDifferentials: [],
      note: `No differential rule set configured for region: ${region.region}`,
    };
  }

  const allFlags = findings.flatMap((f) => f.flags || []);
  const avgConfidenceByFlag = {};
  for (const f of findings) {
    for (const flag of f.flags || []) {
      if (!avgConfidenceByFlag[flag]) avgConfidenceByFlag[flag] = [];
      avgConfidenceByFlag[flag].push(f.confidence || 0.5);
    }
  }

  const scored = candidates.map((candidate) => {
    const supportMatches = candidate.supportFlags.filter((sf) =>
      allFlags.some((af) => af.toLowerCase().includes(sf.toLowerCase()))
    );
    const excludeMatches = candidate.excludeFlags.filter((ef) =>
      allFlags.some((af) => af.toLowerCase().includes(ef.toLowerCase()))
    );

    let score = 0;
    for (const match of supportMatches) {
      const confidences = avgConfidenceByFlag[match] || [0.5];
      const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      score += avgConf;
    }
    score *= candidate.baseWeight;
    score -= excludeMatches.length * 0.5; // exclusion penalty
    score = Math.max(0, score);

    const maxPossible = candidate.supportFlags.length * candidate.baseWeight;
    const confidencePct = maxPossible > 0 ? Math.min(1, score / maxPossible) : 0;

    return {
      name: candidate.name,
      confidence: Math.round(confidencePct * 100),
      supportingFindings: supportMatches,
      excludingFindings: excludeMatches,
    };
  });

  scored.sort((a, b) => b.confidence - a.confidence);

  return {
    primaryDifferential: scored[0]?.name || null,
    confidence: scored[0]?.confidence || 0,
    supportingFindings: scored[0]?.supportingFindings || [],
    alternateDifferentials: scored.slice(1, 3),
  };
}

export { differentialRanker };
