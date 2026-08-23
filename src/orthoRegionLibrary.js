/* ============================================================
   REGION DATA — shared "plug-in" layer used by every Ortho
   assessment module (IPD, Post-operative Rehab, ...). A region
   is chosen once per module instance and drives which ROM
   movements, MMT muscles, and special tests are shown.

   ROM/MMT/Special Tests pages also expose their OWN region tab
   bar (see RegionTabBar in orthoRegionAssessments.jsx) so the
   therapist can pull in an extra region on the fly — e.g. the
   case is scoped to "Cervical" but they want to quickly test
   the shoulder too — without changing the case-level region
   selection made at Setup.
   ============================================================ */
export const REGION_GROUPS = [
  { group: "Spine", sideless: true, items: [{ id: "cervical", label: "Cervical" }, { id: "thoracic", label: "Thoracic" }, { id: "lumbar", label: "Lumbar" }, { id: "sacrum", label: "Sacrum / Coccyx" }] },
  {
    group: "Upper Limb",
    items: [
      { id: "shoulder", label: "Shoulder" },
      { id: "upperArm", label: "Upper Arm" },
      { id: "elbow", label: "Elbow" },
      { id: "forearm", label: "Forearm" },
      { id: "wrist", label: "Wrist" },
      { id: "hand", label: "Hand / Fingers" },
    ],
  },
  {
    group: "Lower Limb",
    items: [
      { id: "hip", label: "Hip" },
      { id: "thigh", label: "Thigh" },
      { id: "knee", label: "Knee" },
      { id: "leg", label: "Leg" },
      { id: "ankle", label: "Ankle" },
      { id: "foot", label: "Foot / Toes" },
    ],
  },
  { group: "Trunk / General", sideless: true, items: [{ id: "pelvis", label: "Pelvis" }, { id: "multiple", label: "Multiple regions" }, { id: "wholeBody", label: "Whole body" }] },
];

export const ALL_REGIONS = REGION_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, sideless: !!g.sideless })));

/* ROM movements carry an optional `range` (textbook norm, shown as a hint
   under the movement name — informational only, never graded against it).
   MMT muscles are normally graded 0-5, but a muscle can instead be
   `type: "endurance"` (e.g. Deep Neck Flexor hold test) which swaps the
   grade chips for a timed hold-time field. Special tests carry a
   `category` used to power the filter chips on the Special Tests page. */
export const REGION_LIBRARY = {
  shoulder: {
    rom: [
      { name: "Flexion", range: "0–180°", plane: "Sagittal" },
      { name: "Extension", range: "0–60°", plane: "Sagittal" },
      { name: "Abduction", range: "0–180°", plane: "Frontal" },
      { name: "Adduction", range: "0–50°", plane: "Frontal" },
      { name: "IR", fullName: "Internal Rotation", range: "0–70°", plane: "Transverse" },
      { name: "ER", fullName: "External Rotation", range: "0–90°", plane: "Transverse" },
      { name: "Horiz Abduction", range: "0–45°", plane: "Transverse" },
      { name: "Horiz Adduction", range: "0–135°", plane: "Transverse" },
    ],
    mmt: [
      { name: "Deltoid" },
      { name: "Supraspinatus" },
      { name: "External Rotators", subtitle: "Infraspinatus · Teres minor", innervation: "Suprascapular / Axillary n.", roots: "C5–C6" },
      { name: "Internal Rotators", subtitle: "Subscapularis · Pec major", innervation: "Upper/Lower subscapular n.", roots: "C5–C7" },
      { name: "Biceps" },
      { name: "Triceps" },
    ],
    specialTests: [
      { name: "Hawkins-Kennedy", category: "Impingement" },
      { name: "Neer", category: "Impingement" },
      { name: "Painful Arc", category: "Impingement" },
      { name: "Empty Can", category: "Rotator Cuff" },
      { name: "Full Can", category: "Rotator Cuff" },
      { name: "Drop Arm", category: "Rotator Cuff" },
      { name: "ER Lag", category: "Rotator Cuff" },
      { name: "Apprehension", category: "Instability" },
      { name: "Relocation", category: "Instability" },
    ],
  },
  elbow: {
    rom: [
      { name: "Flexion", range: "0–150°" },
      { name: "Extension", range: "0°" },
      { name: "Pronation", range: "0–80°" },
      { name: "Supination", range: "0–80°" },
    ],
    mmt: ["Biceps", "Triceps", "Brachioradialis"],
    specialTests: [
      { name: "Tennis Elbow Test (Cozen's)", category: "Tendinopathy" },
      { name: "Golfer's Elbow Test", category: "Tendinopathy" },
      { name: "Ligamentous Stress Test", category: "Instability" },
    ],
  },
  wrist: {
    rom: [
      { name: "Flexion", range: "0–80°" },
      { name: "Extension", range: "0–70°" },
      { name: "Radial Deviation", range: "0–20°" },
      { name: "Ulnar Deviation", range: "0–30°" },
    ],
    mmt: ["Wrist Flexors", "Wrist Extensors"],
    specialTests: [
      { name: "Tinel's Sign", category: "Disc / Nerve" },
      { name: "Phalen's Test", category: "Disc / Nerve" },
      { name: "Finkelstein's Test", category: "Other" },
    ],
  },
  hand: {
    rom: [{ name: "Finger Flexion", range: "0–90°" }, { name: "Finger Extension", range: "0°" }, { name: "Thumb Opposition" }],
    mmt: ["Grip Strength", "Finger Flexors", "Intrinsics"],
    specialTests: [
      { name: "Tinel's Sign", category: "Disc / Nerve" },
      { name: "Bunnel-Littler Test", category: "Other" },
    ],
  },
  hip: {
    rom: [
      { name: "Flexion", range: "0–120°" },
      { name: "Extension", range: "0–30°" },
      { name: "Abduction", range: "0–45°" },
      { name: "Adduction", range: "0–30°" },
      { name: "Internal Rotation", range: "0–35°" },
      { name: "External Rotation", range: "0–45°" },
    ],
    mmt: ["Hip Flexors", "Hip Extensors", "Hip Abductors", "Hip Adductors"],
    specialTests: [
      { name: "FABER (Patrick's)", category: "Other" },
      { name: "Thomas Test", category: "Other" },
      { name: "Trendelenburg Test", category: "Instability" },
      { name: "FADIR", category: "Impingement" },
    ],
  },
  knee: {
    rom: [{ name: "Flexion", range: "0–135°" }, { name: "Extension", range: "0°" }],
    mmt: ["Quadriceps", "Hamstrings"],
    specialTests: [
      { name: "Lachman", category: "Ligament" },
      { name: "Anterior Drawer", category: "Ligament" },
      { name: "Posterior Drawer", category: "Ligament" },
      { name: "Valgus Stress", category: "Ligament" },
      { name: "Varus Stress", category: "Ligament" },
      { name: "McMurray", category: "Meniscus" },
      { name: "Thessaly", category: "Meniscus" },
    ],
  },
  ankle: {
    rom: [
      { name: "Dorsiflexion", range: "0–20°" },
      { name: "Plantarflexion", range: "0–50°" },
      { name: "Inversion", range: "0–35°" },
      { name: "Eversion", range: "0–15°" },
    ],
    mmt: ["Dorsiflexors", "Plantarflexors", "Invertors", "Evertors"],
    specialTests: [
      { name: "Anterior Drawer (Ankle)", category: "Ligament" },
      { name: "Talar Tilt", category: "Ligament" },
      { name: "Squeeze Test", category: "Other" },
      { name: "Thompson Test", category: "Other" },
    ],
  },
  foot: {
    rom: [{ name: "Toe Flexion" }, { name: "Toe Extension" }],
    mmt: ["Toe Flexors", "Toe Extensors"],
    specialTests: [{ name: "Windlass Test", category: "Other" }],
  },
  cervical: {
    rom: [
      { name: "Flexion", range: "0–50°", plane: "Sagittal" },
      { name: "Extension", range: "0–60°", plane: "Sagittal" },
      { name: "Lateral Flexion", range: "0–45°", plane: "Frontal" },
      { name: "Rotation", range: "0–80°", plane: "Transverse" },
    ],
    mmt: [
      { name: "Sternocleidomastoid", innervation: "CN XI + C2–C3", roots: "C2–C3" },
      { name: "Deep Neck Flexors", subtitle: "Longus colli · capitis", innervation: "C1–C4 anterior rami", roots: "C1–C4" },
      { name: "Upper Trapezius", innervation: "CN XI + C3–C4", roots: "C3–C4" },
      { name: "Middle Trapezius", innervation: "CN XI + C3–C4", roots: "C3–C4" },
      { name: "Levator Scapulae", innervation: "C3–C4 + dorsal scapular (C5)", roots: "C3–C5" },
      { name: "Scalenes", subtitle: "Ant · Mid · Post", innervation: "C3–C8 anterior rami", roots: "C3–C8" },
      { name: "Suboccipitals", innervation: "Suboccipital n. (C1)", roots: "C1" },
    ],
    specialTests: [
      { name: "Spurling's Test", category: "Disc / Nerve" },
      { name: "Cervical Distraction Test", category: "Disc / Nerve" },
      { name: "Upper Limb Tension Test (Median Nerve)", category: "Disc / Nerve" },
      { name: "Sharp-Purser Test", category: "Instability" },
      { name: "Vertebral Artery Test", category: "Other" },
    ],
  },
  thoracic: { rom: [{ name: "Flexion", range: "0–45°" }, { name: "Extension", range: "0–25°" }, { name: "Lateral Flexion", range: "0–25°" }, { name: "Rotation", range: "0–35°" }], mmt: ["Trunk Extensors"], specialTests: [{ name: "Rib Springing", category: "Other" }] },
  lumbar: {
    rom: [
      { name: "Flexion", range: "0–60°" },
      { name: "Extension", range: "0–25°" },
      { name: "Lateral Flexion", range: "0–25°" },
      { name: "Rotation", range: "0–5°" },
    ],
    mmt: ["Trunk Flexors", "Trunk Extensors"],
    specialTests: [
      { name: "SLR", category: "Disc / Nerve" },
      { name: "Slump Test", category: "Disc / Nerve" },
      { name: "FABER", category: "Other" },
    ],
  },
};

function normalizeMuscle(m) {
  return typeof m === "string" ? { name: m, type: "grade" } : { type: "grade", ...m };
}
function normalizeTest(t) {
  return typeof t === "string" ? { name: t, category: "Other" } : { category: "Other", ...t };
}
function normalizeMovement(m) {
  return typeof m === "string" ? { name: m } : m;
}

export function regionLib(regionId) {
  const raw = REGION_LIBRARY[regionId] || { rom: [], mmt: [], specialTests: [] };
  return {
    rom: (raw.rom || []).map(normalizeMovement),
    mmt: (raw.mmt || []).map(normalizeMuscle),
    specialTests: (raw.specialTests || []).map(normalizeTest),
  };
}

export const REGION_LABEL = (() => {
  const m = {};
  REGION_GROUPS.forEach((g) => g.items.forEach((it) => (m[it.id] = it.label)));
  return m;
})();

/* A region entry is normally { id, side }. A therapist can also write in a
   region that isn't in the standard list — that entry carries { id: "custom-...",
   side, customLabel }. This resolves the label either way. */
export function regionDisplayLabel(r) {
  return r.customLabel || REGION_LABEL[r.id] || "Region";
}

export function regionLabelList(selectedRegions) {
  if (!selectedRegions.length) return "";
  return selectedRegions.map((r) => [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ")).join(", ");
}
