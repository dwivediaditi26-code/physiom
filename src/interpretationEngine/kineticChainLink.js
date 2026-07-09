// kineticChainLink.js
// Regional interdependence rules: proximal/distal joint restrictions linked to symptom site.
//
// REFINED: the original tried every rule's trigger against BOTH romData and
// functionalData ("rule.trigger(rom) || rule.trigger(functional)"), relying on
// a try/catch to silently swallow the type mismatch on whichever parameter
// didn't apply. That worked by accident (calling .some() on an object throws,
// calling .overactiveMuscles on an array is just undefined), but it's fragile
// and makes it easy to add a new rule that silently never fires. Each rule now
// declares which shape it expects via `type`, and is only ever called with
// that shape.

const CHAIN_RULES = [
  {
    id: "ankle_to_knee",
    type: "rom",
    trigger: (rom) => rom.some((r) => r.movement === "ankle dorsiflexion" && r.passiveROM < r.normalROM - 10),
    implication: "Ankle DF restriction may drive knee valgus / knee pain via compensatory pronation.",
  },
  {
    id: "hip_to_lowback",
    type: "rom",
    trigger: (rom) => rom.some((r) => r.movement === "hip extension" && r.passiveROM < r.normalROM - 10),
    implication: "Hip extension restriction may drive lumbar hyperextension compensation / low back pain.",
  },
  {
    id: "thoracic_to_shoulder",
    type: "rom",
    trigger: (rom) => rom.some((r) => r.movement === "thoracic rotation" && r.passiveROM < r.normalROM - 15),
    implication: "Reduced thoracic rotation may drive compensatory shoulder impingement.",
  },
  {
    id: "hip_to_knee",
    type: "functional",
    trigger: (functionalData) => functionalData?.overactiveMuscles?.includes("TFL"),
    implication: "Hip abductor weakness/TFL dominance may drive knee valgus during loading (patellofemoral pain risk).",
  },
];

function kineticChainLink(romData = [], functionalData = {}) {
  const findings = [];

  for (const rule of CHAIN_RULES) {
    let triggered = false;
    try {
      triggered = rule.type === "rom" ? rule.trigger(romData) : rule.trigger(functionalData);
    } catch (e) {
      triggered = false;
    }
    if (triggered) {
      findings.push({
        domain: "kineticChain",
        finding: rule.implication,
        severity: "moderate",
        confidence: 0.5,
        flags: [rule.id],
      });
    }
  }

  return findings;
}

export { kineticChainLink, CHAIN_RULES };
