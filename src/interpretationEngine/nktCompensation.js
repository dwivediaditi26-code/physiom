// nktCompensation.js
// Neurokinetic Therapy-style logic: inhibited (weak+overridden) vs facilitated (overactive/compensating) muscle mapping.
// functionalData is the normalised {movements, overactiveMuscles} shape produced by the
// adapter (see kineticChainLink.js header for why this was made consistent).

const COMPENSATION_PAIRS = [
  { inhibited: "gluteus medius", facilitatedCompensator: "tensor fasciae latae / QL" },
  { inhibited: "deep neck flexors", facilitatedCompensator: "sternocleidomastoid / scalenes" },
  { inhibited: "lower trapezius", facilitatedCompensator: "upper trapezius / levator scapulae" },
  { inhibited: "transverse abdominis", facilitatedCompensator: "rectus abdominis / erector spinae" },
  { inhibited: "vastus medialis obliquus", facilitatedCompensator: "TFL / lateral quad" },
  { inhibited: "serratus anterior", facilitatedCompensator: "pectoralis minor / upper trap" },
];

function nktCompensation(mmtData = [], functionalData = {}) {
  const findings = [];
  const weakMuscles = mmtData.filter((m) => m.grade <= 3).map((m) => m.muscle.toLowerCase());
  const overactive = functionalData?.overactiveMuscles || [];

  for (const pair of COMPENSATION_PAIRS) {
    const isInhibited = weakMuscles.some((m) => m.includes(pair.inhibited.split(" ")[0]));
    const compensationObserved = overactive.some((m) =>
      pair.facilitatedCompensator.toLowerCase().includes(m.toLowerCase())
    );

    if (isInhibited || compensationObserved) {
      findings.push({
        domain: "nkt",
        finding: `${pair.inhibited} inhibition with ${pair.facilitatedCompensator} compensation`,
        severity: isInhibited && compensationObserved ? "high" : "moderate",
        confidence: isInhibited && compensationObserved ? 0.75 : 0.4,
        flags: ["compensation pattern", pair.inhibited, pair.facilitatedCompensator],
      });
    }
  }

  return findings;
}

export { nktCompensation, COMPENSATION_PAIRS };
