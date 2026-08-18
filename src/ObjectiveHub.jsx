// ObjectiveHub.jsx — the Objective step of the Ortho new-assessment flow.
// Shows ROM / MMT / Special Tests / Neuro as expand-in-place cards, scoped
// to the body region(s) picked in Subjective (data.cx_selected_regions),
// reusing the exact same curated region -> test mapping (REGION_NAV) and
// real clinical modules (ROMModule/MMTModule/SpecialTestsSection/
// NeurologicalModule via their existing lazy_*.jsx wrappers) already used
// everywhere else in the app -- nothing invented, workflow only.
import React, { useState } from "react";
import { REGION_NAV, REGION_FAMILY_KEY } from "./SubjectiveObjective.jsx";
import { LazyTab } from "./utils.jsx";
import HowToPerformDrawer, { romInfoSections, mmtInfoSections } from "./HowToPerformDrawer.jsx";

const LazyROM = React.lazy(() => import("./lazy_rom.jsx"));
const LazyMMT = React.lazy(() => import("./lazy_mmt.jsx"));
const LazySpecial = React.lazy(() => import("./lazy_special.jsx"));
const LazyNeuro = React.lazy(() => import("./lazy_neuro.jsx"));
const LazyObservation = React.lazy(() => import("./lazy_observation.jsx"));

function Sec({ icon, title, PC, expanded, onToggle, children }) {
  return (
    <div style={{ background: PC.surface, borderRadius: 14, marginBottom: 10, border: `1px solid ${PC.border}`, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div onClick={onToggle} style={{ padding: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: PC.text }}>{icon} {title}</span>
        <span style={{ fontSize: 11, color: PC.accent, fontWeight: 700 }}>{expanded ? "Close ↑" : "Open →"}</span>
      </div>
      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${PC.border}`, background: PC.s2 || "#F8FAFC", padding: "10px 4px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ObjectiveHub({ data, set, navTo, PC }) {
  const [expandedKey, setExpandedKey] = useState(null); // `${region}:${type}`
  const [howTo, setHowTo] = useState(null);

  let selectedRegions = [];
  try { selectedRegions = JSON.parse(data.cx_selected_regions || "[]"); } catch { selectedRegions = []; }

  if (selectedRegions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "56px 24px", maxWidth: 460, margin: "0 auto" }}>
        <div style={{ fontSize: "2.4rem", marginBottom: 10 }}>📍</div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: PC.text, marginBottom: 6 }}>No body region selected yet</div>
        <div style={{ fontSize: "0.85rem", color: PC.muted, marginBottom: 18, lineHeight: 1.5 }}>
          Pick 1–3 body regions in Subjective first — Objective will show ROM, MMT and the other curated tests for exactly those regions.
        </div>
        <button type="button" onClick={() => navTo("subjective")}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: PC.accent, color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
          Go to Subjective →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" onClick={() => navTo("subjective")}
          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${PC.border}`, background: PC.s2 || "#F8FAFC", color: PC.muted, fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}>
          + Add / change regions
        </button>
      </div>

      {/* Clinical Observation -- general visual inspection (posture,
          gait, swelling, deformity, skin, etc.), not tied to any one
          selected region like ROM/MMT/Special Tests below, so it sits
          above the per-region sections instead of inside one of them. */}
      <Sec icon="👁️" title="Clinical Observation" PC={PC} expanded={expandedKey === "observation"} onToggle={() => setExpandedKey(k => k === "observation" ? null : "observation")}>
        <LazyTab><LazyObservation data={data} set={set} navContext={{}} /></LazyTab>
      </Sec>

      {selectedRegions.map(region => {
        const familyKey = REGION_FAMILY_KEY[region] || region;
        const navList = REGION_NAV[familyKey] || [];
        const romEntry = navList.find(e => e.nav === "rom");
        const mmtEntry = navList.find(e => e.nav === "mmt");
        const specialEntry = navList.find(e => e.nav === "special");
        const neuroEntry = navList.find(e => e.nav === "neuro");
        const mainEntries = [romEntry, mmtEntry, specialEntry, neuroEntry].filter(Boolean);
        const moreEntries = navList.filter(e => !mainEntries.includes(e));

        return (
          <div key={region} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: PC.accent, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>{region}</div>

            {navList.length === 0 && (
              <div style={{ fontSize: 12, color: PC.muted, padding: "10px 12px", background: PC.s2 || "#F8FAFC", borderRadius: 10, marginBottom: 10 }}>
                No curated objective tests mapped for this region yet.
              </div>
            )}

            {romEntry && (
              <Sec icon="📐" title="Range of Motion" PC={PC} expanded={expandedKey === `${region}:rom`} onToggle={() => setExpandedKey(k => k === `${region}:rom` ? null : `${region}:rom`)}>
                <LazyTab>
                  <LazyROM data={data} set={set} navContext={romEntry.ctx || {}} compact
                    onShowInfo={(m, r) => setHowTo({ title: m.mv, subtitle: `${r ? r.charAt(0).toUpperCase() + r.slice(1) : ""}${m.normal ? ` · Normal ${m.normal}${m.unit || ""}` : ""}`, sections: romInfoSections(m) })} />
                </LazyTab>
              </Sec>
            )}
            {mmtEntry && (
              <Sec icon="💪" title="Manual Muscle Testing" PC={PC} expanded={expandedKey === `${region}:mmt`} onToggle={() => setExpandedKey(k => k === `${region}:mmt` ? null : `${region}:mmt`)}>
                <LazyTab>
                  <LazyMMT data={data} set={set} navContext={mmtEntry.ctx || {}} compact
                    onShowInfo={(m, r, rehab) => setHowTo({ title: m.muscle, subtitle: m.action || "", sections: mmtInfoSections(m, rehab) })} />
                </LazyTab>
              </Sec>
            )}
            {specialEntry && (
              <Sec icon="🔬" title="Special Tests" PC={PC} expanded={expandedKey === `${region}:special`} onToggle={() => setExpandedKey(k => k === `${region}:special` ? null : `${region}:special`)}>
                <LazyTab><LazySpecial data={data} set={set} navContext={specialEntry.ctx || {}} /></LazyTab>
              </Sec>
            )}
            {neuroEntry && (
              <Sec icon="⚡" title="Neurological" PC={PC} expanded={expandedKey === `${region}:neuro`} onToggle={() => setExpandedKey(k => k === `${region}:neuro` ? null : `${region}:neuro`)}>
                <LazyTab><LazyNeuro data={data} set={set} navContext={neuroEntry.ctx || {}} navTo={navTo} /></LazyTab>
              </Sec>
            )}

            {moreEntries.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
                {moreEntries.map((e, i) => (
                  <button key={i} type="button" onClick={() => navTo(e.nav, e.ctx)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, border: `1px solid ${e.col}40`, background: `${e.col}12`, color: e.col, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                    <span>{e.icon}</span>{e.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <HowToPerformDrawer open={!!howTo} onClose={() => setHowTo(null)} title={howTo?.title} subtitle={howTo?.subtitle} sections={howTo?.sections} />
    </div>
  );
}
