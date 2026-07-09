// subjectiveParser.js
// Extracts pattern (mechanical/chemical/neuropathic), stage, irritability from subjective data.

function subjectiveParser(subjective = {}) {
  const findings = [];

  // Pain pattern classification
  let pattern = "unclear";
  if (subjective.painWithMovementOnly && subjective.easesWithRest) {
    pattern = "mechanical";
  } else if (subjective.constantPain && !subjective.easesWithRest) {
    pattern = "chemical/inflammatory";
  } else if (subjective.burningTinglingNumbness || subjective.dermatomalDistribution) {
    pattern = "neuropathic";
  }
  findings.push({
    domain: "subjective",
    finding: `Pain pattern: ${pattern}`,
    severity: null,
    confidence: pattern === "unclear" ? 0.3 : 0.7,
    flags: [pattern],
  });

  // Stage classification (duration based)
  let stage = "unspecified";
  const durationDays = subjective.symptomDurationDays;
  if (typeof durationDays === "number") {
    if (durationDays <= 7) stage = "acute";
    else if (durationDays <= 42) stage = "subacute";
    else stage = "chronic";
  }
  findings.push({
    domain: "subjective",
    finding: `Stage: ${stage}`,
    severity: null,
    confidence: stage === "unspecified" ? 0.2 : 0.9,
    flags: [stage],
  });

  // Irritability (based on: pain to reach onset, time to settle, ease of aggravation)
  let irritability = "low";
  if (subjective.painOnsetLatencyMinutes <= 5 && subjective.settleTimeMinutes >= 60) {
    irritability = "high";
  } else if (subjective.painOnsetLatencyMinutes <= 15 && subjective.settleTimeMinutes >= 20) {
    irritability = "moderate";
  }
  findings.push({
    domain: "subjective",
    finding: `Irritability: ${irritability}`,
    severity: irritability,
    confidence: 0.6,
    flags: [irritability],
  });

  return findings;
}

export { subjectiveParser };
