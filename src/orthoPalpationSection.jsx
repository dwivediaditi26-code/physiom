import React, { useState, lazy, Suspense } from "react";
import { SectionIntro, SelectField, Segmented, TextArea, TextField, Hint, useSectionData } from "./orthoFieldKit.jsx";
import {
  palpationZonesForRegions,
  PALP_TENDERNESS,
  PALP_TEXTURE,
  PALP_TEMP,
  palpStructureKey,
  isPalpationAnswered,
  isPalpationFinding,
  palpationStructureRows,
} from "./orthoPalpationData.js";

const LazyPalpationModule = lazy(() => import("./lazy_palpation.jsx"));

/* ============================================================
   PalpationSection — region-wise, structure-by-structure
   (2026-09-03, Aditi: "palpation condition wise, which shows
   tenderness, spasm etc in region-specific muscles").

   One tab per anatomical zone belonging to the region(s) picked at
   Setup — the case's own side first — and inside each, that zone's
   real structures (muscles, tendons, ligaments, bursae, bony
   landmarks, from the same ANATOMICAL_HOTSPOTS the body map uses),
   each graded for tenderness (0–4+), tissue texture (spasm, trigger
   point, thickening, crepitus...), and temperature.

   `focusZoneIds` narrows the tab bar to the zones a suspected
   condition actually calls for (the AI/Suggested Objective screen
   passes the active condition's own palpation targets) — narrowing
   only, never hiding a zone that already has findings recorded.

   The interactive body map stays below, unchanged, for point-by-point
   pin marking, and so do the four whole-patient findings fields the
   summary and the older records already use.
   ============================================================ */
export function PalpationSection({ data, setData, selectedRegions = [], focusZoneIds = null, conditionLabel = "" }) {
  const [d, set] = useSectionData(data, setData, "palpation");
  const [mapOpen, setMapOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);

  const allZones = palpationZonesForRegions(selectedRegions);
  const structures = d.structures || {};

  function entryFor(zoneId, structure) {
    return structures[palpStructureKey(zoneId, structure)] || {};
  }
  function setEntry(zoneId, structure, patch) {
    const key = palpStructureKey(zoneId, structure);
    set("structures", { ...structures, [key]: { ...(structures[key] || {}), ...patch } });
  }
  function zoneCount(zone) {
    return zone.structures.filter((s) => isPalpationAnswered(entryFor(zone.id, s))).length;
  }

  // Condition narrowing: keep any zone the condition names, plus any zone
  // already carrying findings, so switching condition never hides work.
  const focus = focusZoneIds && focusZoneIds.length ? new Set(focusZoneIds) : null;
  const zones = focus ? allZones.filter((z) => focus.has(z.id) || zoneCount(z) > 0) : allZones;
  const visibleZones = zones.length ? zones : allZones;

  const [activeId, setActiveId] = useState(null);
  const active = visibleZones.find((z) => z.id === activeId) || visibleZones[0] || null;

  const findings = palpationStructureRows(structures).length;

  return (
    <>
      <SectionIntro icon="🖐️" title="Palpation" info="Palpate systematically through the region's own structures, comparing with the other side. Grade tenderness 0–4+ and note tissue texture — spasm, trigger point, thickening, crepitus — and temperature." />

      {!allZones.length && (
        <Hint>No palpation zones mapped for the region(s) picked at Setup — use the body map below to mark and grade points directly.</Hint>
      )}

      {allZones.length > 0 && (
        <>
          {focus && visibleZones.length < allZones.length && (
            <Hint>
              Narrowed to the areas {conditionLabel ? <b>{conditionLabel}</b> : "the suspected condition"} actually calls for — everything already recorded stays listed.
            </Hint>
          )}
          <div className="region-tab-row-wrap">
            <div className="region-tab-row">
              {visibleZones.map((z) => {
                const count = zoneCount(z);
                return (
                  <button
                    type="button"
                    key={z.id}
                    className={"region-tab" + (active?.id === z.id ? " region-tab-active" : "")}
                    onClick={() => setActiveId(z.id)}
                  >
                    {z.label}
                    {count > 0 && <span className="region-tab-badge">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {active && (
            <div className="rom-card">
              <div className="rom-card-title">
                {active.label}
                <span className="muscle-subtitle" style={{ marginLeft: 8 }}>{active.view === "back" ? "Posterior" : "Anterior"}</span>
              </div>
              {active.structures.map((s) => (
                <PalpStructureCard
                  key={s}
                  structure={s}
                  entry={entryFor(active.id, s)}
                  onChange={(patch) => setEntry(active.id, s, patch)}
                />
              ))}
            </div>
          )}

          {findings > 0 && <Hint>{findings} palpation finding{findings > 1 ? "s" : ""} recorded so far — they carry through to Review.</Hint>}
        </>
      )}

      <button type="button" className="collapsible-head" onClick={() => setMapOpen((o) => !o)}>
        <span>Body Map — mark points directly</span>
        <span className={"collapsible-chevron" + (mapOpen ? " open" : "")}>⌄</span>
      </button>
      {mapOpen && (
        <Suspense fallback={<Hint>Loading palpation body map…</Hint>}>
          <LazyPalpationModule data={d} set={set} />
        </Suspense>
      )}

      <button type="button" className="collapsible-head" onClick={() => setGeneralOpen((o) => !o)}>
        <span>General findings (whole region)</span>
        <span className={"collapsible-chevron" + (generalOpen ? " open" : "")}>⌄</span>
      </button>
      {generalOpen && (
        <>
          <Segmented label="Swelling" options={["None", "Mild", "Moderate", "Severe"]} value={d.swelling} onChange={(v) => set("swelling", v)} />
          <SelectField label="Muscle tone" type="multi" options={["Normal", "Hypertonic", "Hypotonic", "Spasm", "Guarding"]} value={d.muscleTone} onChange={(v) => set("muscleTone", v)} />
          <TextArea label="Trigger points" value={d.triggerPoints} onChange={(v) => set("triggerPoints", v)} placeholder="Location and referral pattern..." />
          <SelectField label="Scar / tissue mobility" type="multi" options={["N/A", "Normal", "Adherent", "Restricted", "Hypersensitive"]} value={d.scarMobility} onChange={(v) => set("scarMobility", v)} />
        </>
      )}
    </>
  );
}

/* One structure: collapsed to a single row until tapped, the same
   interaction the rest of the wizard's item lists use. The row turns green
   once it carries a real finding (tender, abnormal texture, or abnormal
   temperature) and purple once merely answered, so a long structure list
   reads at a glance. */
function PalpStructureCard({ structure, entry, onChange }) {
  const [open, setOpen] = useState(false);
  const answered = isPalpationAnswered(entry);
  const finding = isPalpationFinding(entry);
  const texture = Array.isArray(entry.texture) ? entry.texture : entry.texture ? [entry.texture] : [];
  const summary = [
    entry.tenderness ? `Tender ${entry.tenderness}` : null,
    texture.length ? texture.join(", ") : null,
    entry.temp && entry.temp !== "Normal" ? entry.temp : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function toggleTexture(t) {
    const next = texture.includes(t) ? texture.filter((x) => x !== t) : [...texture, t];
    onChange({ texture: next });
  }

  return (
    <div className={"obj-item" + (finding ? " obj-item-finding" : answered ? " obj-item-answered" : "")}>
      <div className="obj-item-row" role="button" onClick={() => setOpen((o) => !o)}>
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">{structure}</span>
        </div>
        <div className="obj-item-row-right">
          {summary && <span className="obj-item-row-summary">{finding ? "✓ " : ""}{summary}</span>}
          <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
        </div>
      </div>
      {open && (
        <div className="obj-item-body">
          <div className="mini-list-label">Tenderness</div>
          <div className="chip-mini-row">
            {PALP_TENDERNESS.map((t) => {
              const selected = entry.tenderness === t.val;
              const style = selected
                ? { background: t.color, borderColor: t.color, color: "#fff", fontWeight: 700 }
                : { borderColor: t.color, color: t.color };
              return (
                <button type="button" key={t.val} className="chip-mini funky-chip" style={style} onClick={() => onChange({ tenderness: selected ? "" : t.val })}>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mini-list-label">Tissue texture</div>
          <div className="chip-mini-row">
            {PALP_TEXTURE.map((t) => (
              <button type="button" key={t} className={"chip-mini" + (texture.includes(t) ? " chip-mini-active" : "")} onClick={() => toggleTexture(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="mini-list-label">Temperature</div>
          <div className="chip-mini-row">
            {PALP_TEMP.map((t) => (
              <button type="button" key={t} className={"chip-mini" + (entry.temp === t ? " chip-mini-active" : "")} onClick={() => onChange({ temp: entry.temp === t ? "" : t })}>
                {t}
              </button>
            ))}
          </div>

          <TextField label="Notes" value={entry.notes || ""} onChange={(v) => onChange({ notes: v })} placeholder="Referral pattern, exact site, comparison to other side..." />
        </div>
      )}
    </div>
  );
}

export default PalpationSection;
