// Small helpers the three Ortho assessment wizards (Outpatient, IPD, Post-op)
// all need. Each wizard used to carry its own copy.
import { regionDisplayLabel } from "./orthoRegionLibrary.js";
import { formatBodyChartSummary } from "./BodyChartPro.jsx";
import { humanizeKey } from "./medicalAbbreviations.js";
import { fmtVal } from "./orthoFieldKit.jsx";

// "Right Knee", "Left Shoulder", "Lumbar" ...
export function regionLabelOf(r) {
  return [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
}

// Pain carries a JSON-blob body chart field that the generic summary would dump
// raw: the body chart gets its own rows, the rest are plain label/value rows.
// Internal "__" fields are skipped and labels are made readable ("nrs_now" ->
// "NRS now"), as the Outpatient summary already did.
export function formatPainSection(section) {
  const { body_chart_pro, ...rest } = section;
  const restRows = Object.entries(rest)
    .filter(([k]) => !k.startsWith("__"))
    .map(([k, v]) => ({ label: humanizeKey(k), value: fmtVal(v) }))
    .filter((r) => r.value);
  return [...formatBodyChartSummary(body_chart_pro), ...restRows];
}
