// fascialChainMap.js
// Anatomy Trains-style fascial line tension/restriction propagation logic.

const FASCIAL_LINES = {
  superficialBackLine: ["plantar fascia", "gastrocnemius", "hamstrings", "erector spinae", "occiput"],
  superficialFrontLine: ["tibialis anterior", "quadriceps", "rectus abdominis", "sternocleidomastoid"],
  lateralLine: ["peroneals", "ITB", "obliques", "sternocleidomastoid/splenius"],
  spiralLine: ["splenius", "rhomboids", "serratus anterior", "external oblique", "TFL", "tibialis anterior"],
  functionalLines: ["pectoralis major", "external oblique", "contralateral adductors"],
};

function fascialChainMap(romData = [], palpationData = {}) {
  const findings = [];
  const tightStructures = (palpationData.tightStructures || []).map((s) => s.toLowerCase());
  const restrictedMovements = romData
    .filter((r) => r.passiveROM < r.normalROM * 0.85)
    .map((r) => r.movement?.toLowerCase());

  for (const [line, structures] of Object.entries(FASCIAL_LINES)) {
    const matchCount = structures.filter((s) =>
      tightStructures.some((t) => t.includes(s.split(" ")[0])) ||
      restrictedMovements.some((m) => m && s.toLowerCase().includes(m.split(" ")[0]))
    ).length;

    if (matchCount >= 2) {
      findings.push({
        domain: "fascial",
        finding: `${line}: ${matchCount}/${structures.length} nodes implicated`,
        severity: matchCount >= 3 ? "moderate" : "mild",
        confidence: matchCount >= 3 ? 0.5 : 0.3,
        flags: [line, "consider chain-based release rather than isolated segment"],
      });
    }
  }

  return findings;
}

export { fascialChainMap, FASCIAL_LINES };
