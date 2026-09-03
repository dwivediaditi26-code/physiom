/* ============================================================
   orthoPalpationData.js — region-wise palpation for the Ortho
   Outpatient wizard (2026-09-03, Aditi: "palpation condition wise,
   which shows tenderness, spasm etc in region-specific muscles").

   The wizard's Palpation step used to be a body map plus four
   whole-patient fields (swelling / tone / trigger points / scar),
   so nothing on screen ever named the muscles and structures of
   the region actually being assessed. This resolves each region
   picked at Setup onto the SAME real anatomical zones the body-map
   palpation module uses (ANATOMICAL_HOTSPOTS — every zone carries
   its own structure list: muscles, tendons, ligaments, bursae,
   bony landmarks), so the screen lists this patient's own region's
   structures to grade one by one.

   Nothing here is new clinical content: the zones and their
   structure lists are the app's own palpation data, only regrouped
   by the wizard's region ids. The body map itself stays available
   on the same screen for point-by-point pin marking.
   ============================================================ */
import { ANATOMICAL_HOTSPOTS } from "./palpationHotspots.js";

// Wizard region id (orthoRegionLibrary.js) -> the body-map zones that
// belong to it. Sideless regions (spine, pelvis) list their single zone;
// limb regions list both sides, and the therapist's chosen side is used to
// order them (see palpationZonesForRegions below) rather than to hide one:
// bilateral comparison is part of palpation, so the other side stays one
// tap away instead of being filtered out.
const REGION_ZONES = {
  cervical: ["post_cervical", "cerv_lat_r", "cerv_lat_l", "ant_cervical", "scm_r", "scm_l", "scalp"],
  thoracic: ["thoracic_spine", "mid_trap", "scapula_r", "scapula_l"],
  lumbar: ["lumbar_spine", "ql_r", "ql_l", "si_joint_r", "si_joint_l", "abdomen"],
  sacrum: ["si_joint_r", "si_joint_l", "lumbar_spine", "gmax_r", "gmax_l"],
  pelvis: ["si_joint_r", "si_joint_l", "asis_r", "asis_l", "groin_r", "groin_l", "gmax_r", "gmax_l"],

  shoulder: ["ac_joint_r", "ac_joint_l", "ant_deltoid_r", "ant_deltoid_l", "lat_deltoid_r", "lat_deltoid_l", "post_deltoid_r", "post_deltoid_l", "supraspinatus_r", "supraspinatus_l", "infraspinatus_r", "infraspinatus_l", "trapezius_r", "trapezius_l", "scapula_r", "scapula_l", "sternum", "pec_major_r", "pec_major_l"],
  upperArm: ["ant_deltoid_r", "ant_deltoid_l", "post_deltoid_r", "post_deltoid_l", "ant_cubital_r", "ant_cubital_l"],
  elbow: ["lat_epicon_r", "lat_epicon_l", "med_epicon_r", "med_epicon_l", "ant_cubital_r", "ant_cubital_l"],
  forearm: ["ant_forearm_r", "ant_forearm_l", "lat_epicon_r", "lat_epicon_l", "med_epicon_r", "med_epicon_l"],
  wrist: ["wrist_r", "wrist_l", "ant_forearm_r", "ant_forearm_l"],
  hand: ["wrist_r", "wrist_l"],

  hip: ["gt_r", "gt_l", "groin_r", "groin_l", "gmax_r", "gmax_l", "piriformis_r", "piriformis_l", "asis_r", "asis_l", "si_joint_r", "si_joint_l"],
  thigh: ["quad_r", "quad_l", "hamstring_r", "hamstring_l", "itband_r", "itband_l", "groin_r", "groin_l"],
  knee: ["patella_r", "patella_l", "med_knee_r", "med_knee_l", "lat_knee_r", "lat_knee_l", "popliteal_r", "popliteal_l", "itband_r", "itband_l", "quad_r", "quad_l"],
  leg: ["ant_shin_r", "ant_shin_l", "gastroc_r", "gastroc_l", "achilles_r", "achilles_l"],
  ankle: ["lat_ankle_r", "lat_ankle_l", "med_ankle_r", "med_ankle_l", "achilles_r", "achilles_l"],
  foot: ["plantar_r", "plantar_l", "med_ankle_r", "med_ankle_l", "lat_ankle_r", "lat_ankle_l"],
};

const ZONE_BY_ID = Object.fromEntries(ANATOMICAL_HOTSPOTS.map((h) => [h.id, h]));

function sideOfZoneId(id) {
  if (id.endsWith("_r")) return "Right";
  if (id.endsWith("_l")) return "Left";
  return "";
}

/* The zones to palpate for the regions this case is scoped to, in the
   order to show them: the chosen side first (a "Right Knee" case leads
   with the right-sided zones), the other side after it for comparison,
   and midline/sideless zones in their listed order. Never dedupes across
   regions — a zone shared by two picked regions (e.g. SI joint for both
   Lumbar and Hip) is listed once. */
export function palpationZonesForRegions(selectedRegions = []) {
  const out = [];
  const seen = new Set();
  selectedRegions.forEach((region) => {
    const ids = REGION_ZONES[region.id];
    if (!ids) return;
    const caseSide = region.side === "Left" || region.side === "Right" ? region.side : "";
    const ordered = caseSide
      ? [...ids.filter((id) => sideOfZoneId(id) === caseSide), ...ids.filter((id) => sideOfZoneId(id) !== caseSide)]
      : ids;
    ordered.forEach((id) => {
      const zone = ZONE_BY_ID[id];
      if (!zone || seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        label: zone.label,
        side: sideOfZoneId(id),
        view: zone.side,
        structures: zone.structures || [],
        regionId: region.id,
      });
    });
  });
  return out;
}

export function hasPalpationZones(selectedRegions = []) {
  return palpationZonesForRegions(selectedRegions).length > 0;
}

/* Finding vocabularies — the same ones the body-map palpation module
   records per pin (grades 0–4+, tissue texture including Spasm and Trigger
   Point, temperature), so a structure graded here and a pin dropped on the
   map speak the same language. */
export const PALP_TENDERNESS = [
  { val: "0", label: "0 — none", color: "#16a34a" },
  { val: "1+", label: "1+ — mild", color: "#65a30d" },
  { val: "2+", label: "2+ — moderate", color: "#d97706" },
  { val: "3+", label: "3+ — marked (withdraws)", color: "#dc2626" },
  { val: "4+", label: "4+ — severe (will not allow)", color: "#b91c1c" },
];
export const PALP_TEXTURE = ["Normal / soft", "Tight / restricted", "Spasm", "Trigger point", "Thickened / fibrosed", "Crepitus", "Fluctuant / oedema"];
export const PALP_TEMP = ["Normal", "Warm", "Hot", "Cool", "Cold"];

export const PALP_TENDERNESS_COLOR = Object.fromEntries(PALP_TENDERNESS.map((t) => [t.val, t.color]));

// A structure counts as a finding when it is tender at all, or its texture
// is anything other than normal, or its temperature is not normal.
export function isPalpationFinding(entry = {}) {
  if (!entry) return false;
  if (entry.tenderness && entry.tenderness !== "0") return true;
  const texture = Array.isArray(entry.texture) ? entry.texture : entry.texture ? [entry.texture] : [];
  if (texture.some((t) => t && t !== "Normal / soft")) return true;
  if (entry.temp && entry.temp !== "Normal") return true;
  return false;
}

export function isPalpationAnswered(entry = {}) {
  if (!entry) return false;
  const texture = Array.isArray(entry.texture) ? entry.texture : entry.texture ? [entry.texture] : [];
  return !!(entry.tenderness || texture.length || entry.temp || String(entry.notes || "").trim());
}

// Storage key for one structure inside data.palpation.structures.
export function palpStructureKey(zoneId, structure) {
  return `${zoneId}::${structure}`;
}

// Flat {label, value} rows for the Review screen / "copy as text", so a
// region-wise palpation reads back the way it was recorded.
export function palpationStructureRows(structures = {}) {
  return Object.entries(structures)
    .map(([key, entry]) => {
      if (!isPalpationAnswered(entry)) return null;
      const [zoneId, structure] = key.split("::");
      const zone = ZONE_BY_ID[zoneId];
      const texture = Array.isArray(entry.texture) ? entry.texture : entry.texture ? [entry.texture] : [];
      const value = [
        entry.tenderness ? `Tenderness ${entry.tenderness}` : null,
        texture.length ? texture.join(", ") : null,
        entry.temp && entry.temp !== "Normal" ? entry.temp : null,
        entry.notes,
      ]
        .filter(Boolean)
        .join(" · ");
      return { label: `${zone?.label || zoneId} — ${structure}`, value };
    })
    .filter(Boolean);
}

/* Condition-wise narrowing. Each region's Phase 0.5 engine lists a
   condition's own objective tests as plain strings, some of which are
   palpation targets ("Palpation — Greater Tuberosity", "Joint line
   palpation", "Ischial tuberosity palpation"...). This matches those
   strings against the zones/structures actually on screen by shared
   anatomical words, so the Palpation screen can lead with the areas the
   suspected condition calls for. Purely a narrowing hint: a zone is never
   dropped for having no match — the caller keeps every zone that already
   carries findings, and shows the full list when nothing matches. */
const STOP_WORDS = new Set([
  "palpation", "palpate", "palpating", "the", "and", "for", "with", "test", "tests", "over", "around",
  "left", "right", "bilateral", "anterior", "posterior", "medial", "lateral", "proximal", "distal",
  "assessment", "screen", "tender", "tenderness", "point", "points", "joint", "muscle", "area",
]);

function keywordsOf(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

export function palpationFocusZoneIds(testStrings = [], zones = []) {
  const palpTests = testStrings.filter((t) => /palpat/i.test(String(t)));
  if (!palpTests.length) return [];
  const testWords = palpTests.map(keywordsOf);
  const out = [];
  zones.forEach((zone) => {
    const zoneWords = keywordsOf([zone.label, ...(zone.structures || [])].join(" "));
    const hit = testWords.some((words) => [...words].some((w) => zoneWords.has(w)));
    if (hit) out.push(zone.id);
  });
  return out;
}
