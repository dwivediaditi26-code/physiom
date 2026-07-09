// mmtGrading.js
// Standard 0-5 MMT grading + pain-on-resist flagging.

const MMT_DESCRIPTIONS = {
  0: "No contraction",
  1: "Flicker/trace contraction",
  2: "Full ROM gravity eliminated",
  3: "Full ROM against gravity",
  4: "Full ROM against gravity + moderate resistance",
  5: "Full ROM against gravity + full resistance",
};

function mmtGrading(mmtData = []) {
  const findings = [];

  for (const entry of mmtData) {
    const { muscle, grade, painOnResist, breakTestFail } = entry;

    let severity = "none";
    if (grade <= 2) severity = "high";
    else if (grade === 3) severity = "moderate";
    else if (grade === 4) severity = "mild";

    const flags = [];
    if (painOnResist) flags.push("strong + painful = contractile lesion (Cyriax)");
    if (grade <= 2 && !painOnResist) flags.push("weak + painless = neurological or complete rupture");
    if (breakTestFail) flags.push("break test failed — possible full-thickness tear or neuro involvement");

    findings.push({
      domain: "mmt",
      finding: `${muscle}: grade ${grade}/5 (${MMT_DESCRIPTIONS[grade] || "unknown"})`,
      severity,
      confidence: 0.8,
      flags,
    });
  }

  return findings;
}

export { mmtGrading };
