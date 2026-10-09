// reasoningHelpers.js — small readers shared by the Ortho region adapters
// (orthoLumbarReasoning.js, orthoCervicalReasoning.js, orthoThoracicReasoning.js,
// orthoHipReasoning.js, orthoKneeReasoning.js, orthoAnkleFootReasoning.js,
// orthoElbowWristHandReasoning.js, orthoShoulderReasoning.js). Each adapter
// used to carry its own identical copy of the ones it needed.

// ── Subjective checklist answers (Lumbar / Cervical / Thoracic) ──────────────
// A multi-select answer is stored as a ", "-joined string.
export function arr(regionData, key) {
  const x = regionData[key];
  if (!x) return [];
  return String(x).split(", ").filter(Boolean);
}

export function str(regionData, key) {
  return String(regionData[key] || "").trim();
}

// Multi-select question -> "unknown" (not answered), "absent" (only the
// negative options ticked) or "present" (with the positive answers).
export function multicheckState(regionData, key, negativeOptions) {
  const values = arr(regionData, key);
  if (values.length === 0) return { state: "unknown", values: [] };
  const positives = values.filter((v) => !negativeOptions.includes(v));
  if (positives.length === 0) return { state: "absent", values: [] };
  return { state: "present", values: positives };
}

// Single-select question -> "unknown" or "answered" with the chosen option.
export function selectState(regionData, key) {
  const v = str(regionData, key);
  if (!v) return { state: "unknown", value: null };
  return { state: "answered", value: v };
}

// The patient's age / sex / occupation from the Ortho Demographics step
// (data.demographics) in the shape the Lumbar/Cervical/Thoracic engines read
// (`variables.demographics`). Anything not filled in stays null, which the
// engines already treat as "unknown".
export function demographicsForEngine(d) {
  const clean = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };
  const src = d || {};
  return { age: clean(src.age), sex: clean(src.sex), occupation: clean(src.occupation) };
}

// ── Limb regions (Hip / Knee / Ankle-Foot / Elbow-Wrist-Hand / Shoulder) ─────
// A special test's stored answer is a string, or { right, left, bilateral }.
export function specialTestValue(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw.right || raw.left || raw.bilateral || "";
  return "";
}

// A multi-select value (array or string) as one ", "-joined string.
export function joinMulti(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

// The Subjective form (and the AI intake) save each region's answers under that
// region's OWN id -- subjective.regions.elbow, .wrist, .hand, .ankle, .foot. The
// Elbow/Wrist/Hand and Ankle/Foot matchers want one set of answers for the whole
// group, and used to read subjective.regions.elbowWristHand / .ankleFoot, which
// nothing ever writes -- so every ticked answer was invisible to them and the
// AI Objective Assessment showed "0%" for everything. This gathers the answers
// of every region in the group (plus the group's own key, kept for older saved
// data). Where two regions answered the same question the answers are joined; a
// single-choice answer (the 24-hour pattern) keeps the first one given.
export function mergedRegionAnswers(regions, ids) {
  const out = {};
  for (const id of ids) {
    const answers = regions?.[id];
    if (!answers || typeof answers !== "object") continue;
    for (const [field, value] of Object.entries(answers)) {
      const next = joinMulti(value);
      if (!next) continue;
      const have = out[field];
      if (!have) out[field] = value;
      else if (field !== "pattern" && joinMulti(have) !== next) out[field] = `${joinMulti(have)}, ${next}`;
    }
  }
  return out;
}

// The plain-language label for one differential's strength of match.
export function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}
