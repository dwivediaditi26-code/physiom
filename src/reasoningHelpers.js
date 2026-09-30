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

// The plain-language label for one differential's strength of match.
export function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}
