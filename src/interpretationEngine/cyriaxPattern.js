// cyriaxPattern.js
// Capsular pattern matching + contractile vs inert tissue logic from combined ROM + MMT data.

const CAPSULAR_PATTERNS = {
  shoulder: { order: ["external rotation", "abduction", "internal rotation"] },
  hip: { order: ["flexion", "internal rotation", "abduction"] },
  knee: { order: ["flexion", "extension"] },
  ankle: { order: ["plantarflexion", "dorsiflexion"] },
  cervical: { order: ["extension", "lateral flexion (equal both sides)", "rotation"] },
};

// Cyriax rule: resisted contraction findings determine contractile vs inert
function classifyContractileVsInert(resisted) {
  const { strong, painful } = resisted;
  if (strong && !painful) return "Normal";
  if (strong && painful) return "Minor contractile lesion (tendinopathy/muscle strain)";
  if (!strong && painful) return "Major contractile lesion (partial/full tear) or serious pathology";
  if (!strong && !painful) return "Complete rupture or neurological lesion";
  return "Indeterminate";
}

function cyriaxPattern(romData = [], mmtData = []) {
  const findings = [];

  // Capsular pattern check: is restriction proportion matching known capsular ratios?
  for (const [region, pattern] of Object.entries(CAPSULAR_PATTERNS)) {
    const relevantROM = romData.filter((r) =>
      pattern.order.some((m) => r.movement?.toLowerCase().includes(m.split(" ")[0]))
    );
    if (relevantROM.length >= 2) {
      const restricted = relevantROM.filter((r) => r.passiveROM < r.normalROM * 0.85);
      const matchesCapsular = restricted.length === relevantROM.length;
      findings.push({
        domain: "cyriax",
        finding: `${region} capsular pattern: ${matchesCapsular ? "present" : "absent"}`,
        severity: matchesCapsular ? "moderate" : null,
        confidence: matchesCapsular ? 0.7 : 0.4,
        flags: [matchesCapsular ? "capsular/arthritic pattern" : "non-capsular — consider extra-articular cause"],
      });
    }
  }

  // Contractile vs inert per muscle tested
  for (const entry of mmtData) {
    const classification = classifyContractileVsInert({
      strong: entry.grade >= 4,
      painful: entry.painOnResist,
    });
    findings.push({
      domain: "cyriax",
      finding: `${entry.muscle} resisted test: ${classification}`,
      severity: classification.includes("Major") ? "high" : classification.includes("Minor") ? "moderate" : null,
      confidence: 0.7,
      flags: [classification],
    });
  }

  return findings;
}

export { cyriaxPattern, classifyContractileVsInert };
