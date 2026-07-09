// romEndFeelLogic.js
// Active/Passive/Overpressure ROM + Cyriax end-feel classification.

const NORMAL_ENDFEEL = {
  hard: ["elbow extension", "knee extension"],
  soft: ["elbow flexion", "knee flexion"],
  springy: ["forearm pronation", "forearm supination"],
  empty: [], // always abnormal — pain stops movement before tissue resistance
};

function classifyEndFeel(endFeelReported, movement) {
  if (endFeelReported === "empty") {
    return { normal: false, note: "Empty end-feel — pain-limited, suggests acute inflammation or serious pathology." };
  }
  const expected = Object.entries(NORMAL_ENDFEEL).find(([, movements]) =>
    movements.includes(movement?.toLowerCase())
  );
  if (!expected) return { normal: null, note: "No reference end-feel on file for this movement." };
  const [expectedType] = expected;
  return {
    normal: endFeelReported === expectedType,
    note:
      endFeelReported === expectedType
        ? `Normal ${expectedType} end-feel.`
        : `Abnormal — expected ${expectedType}, found ${endFeelReported}.`,
  };
}

function romEndFeelLogic(romData = []) {
  const findings = [];

  for (const entry of romData) {
    const { movement, activeROM, passiveROM, normalROM, endFeel, painOnActive, painOnPassive } = entry;

    const deficit = normalROM ? normalROM - passiveROM : null;
    const severity =
      deficit === null ? null : deficit <= 10 ? "mild" : deficit <= 25 ? "moderate" : "high";

    const endFeelResult = classifyEndFeel(endFeel, movement);

    // Active vs passive comparison (classic differentiation logic)
    let tissueImplicated = "unclear";
    if (activeROM < normalROM && passiveROM >= normalROM - 5) {
      tissueImplicated = "contractile/neurological (active limited, passive near-full)";
    } else if (activeROM < normalROM && passiveROM < normalROM) {
      tissueImplicated = "inert/capsular (both active and passive limited)";
    }

    findings.push({
      domain: "rom",
      finding: `${movement}: active ${activeROM}°, passive ${passiveROM}°, normal ${normalROM}°`,
      severity,
      confidence: normalROM ? 0.75 : 0.3,
      flags: [
        tissueImplicated,
        endFeelResult.note,
        painOnActive ? "pain on active" : null,
        painOnPassive ? "pain on passive" : null,
      ].filter(Boolean),
    });
  }

  return findings;
}

export { romEndFeelLogic, classifyEndFeel };
