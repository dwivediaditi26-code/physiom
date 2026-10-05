// ClinicProtocolBuilder.jsx -- create / edit one "My Clinic Protocol": a name (e.g. "Knee
// Osteoarthritis") plus the exercises, techniques and modalities a clinic always uses for it.
//
// Stored in the existing clinic_protocols row ({name, region, exercises[], techniques[]}), so no
// database change: modalities are techniques of type ultrasound / electrotherapy / taping, or a
// quick-pick entry flagged `modality: true`. Exercises keep the exercise-library shape
// ({id, name, target, sets, reps, hold, freq}) so adding one later goes through the normal dose screen.
import React, { useMemo, useState } from "react";
import { TextField, BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB } from "./sharedClinicalData.js";
import { TECHNIQUE_TYPES, BLANK_TECHNIQUE, techniqueEntryForm, techniqueLabel } from "./orthoOutpatientSections.jsx";
import { saveClinicProtocol } from "./clinicProtocols.js";

export const MODALITY_TYPES = ["us", "electro", "taping"];
export const QUICK_PROTOCOL_MODALITIES = ["Heat / Cold", "TENS", "IFT", "Ultrasound", "Laser", "Shockwave", "Traction", "Paraffin wax"];
export const isModality = (t) => t?.modality === true || MODALITY_TYPES.includes(t?.type);

const uid = () => Math.random().toString(36).slice(2, 9);
const doseText = (e) => [e.sets && e.reps ? `${e.sets} × ${e.reps}` : "", e.hold ? `hold ${e.hold}s` : "", e.freq || ""].filter(Boolean).join(" · ");

const card = { background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 14, padding: "10px 12px", marginBottom: 8 };
const smallBtn = { border: "none", background: "#EDE9FE", color: BRAND.purpleDark, fontWeight: 800, fontSize: 12.5, borderRadius: 10, padding: "7px 12px", minHeight: 34, cursor: "pointer", fontFamily: "inherit" };

function Row({ title, sub, onRemove, children }) {
  return (
    <div style={{ borderTop: `1px solid ${BRAND.border}`, padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.ink }}>{title}</div>
          {sub ? <div style={{ fontSize: 11.5, color: BRAND.gray }}>{sub}</div> : null}
        </div>
        <button type="button" aria-label={`Remove ${title}`} onClick={onRemove} style={{ width: 36, height: 36, border: "none", background: "none", color: "#dc2626", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>
      {children}
    </div>
  );
}

export default function ClinicProtocolBuilder({ initial, onSaved, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [exercises, setExercises] = useState(() => (initial?.exercises || []).map((e) => ({ ...e, id: e.id ?? e.exerciseId ?? uid() })));
  const [techniques, setTechniques] = useState(() => initial?.techniques || []);
  const [tab, setTab] = useState("ex");
  const [search, setSearch] = useState("");
  const [libRegion, setLibRegion] = useState("all");
  const [formType, setFormType] = useState(null);       // technique/modality type being filled in
  const [form, setForm] = useState(BLANK_TECHNIQUE);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const allExercises = useMemo(() => {
    const out = [];
    Object.entries(EXERCISE_DB).forEach(([rk, r]) => Object.entries(r.categories || {}).forEach(([cat, list]) => list.forEach((e) => out.push({ ...e, category: cat, _region: rk }))));
    return out;
  }, []);
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    let pool = libRegion === "all" ? allExercises : allExercises.filter((e) => e._region === libRegion);
    if (q) pool = pool.filter((e) => e.name.toLowerCase().includes(q) || String(e.target || "").toLowerCase().includes(q));
    else if (libRegion === "all") return [];
    return pool.filter((e) => !exercises.some((x) => x.id === e.id)).slice(0, 25);
  }, [search, libRegion, allExercises, exercises]);

  const techs = techniques.filter((t) => !isModality(t));
  const mods = techniques.filter(isModality);

  const addExercise = (e) => setExercises((l) => [...l, { id: e.id, name: e.name, target: e.target, category: e.category, sets: e.sets, reps: e.reps, hold: e.hold, freq: e.freq }]);
  const setDose = (id, patch) => setExercises((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const addTechnique = (t) => setTechniques((l) => [...l, t]);
  const removeTechnique = (t) => setTechniques((l) => l.filter((x) => x !== t));
  const addQuickModality = (label) => {
    if (mods.some((m) => m.type === "other" && m.technique === label)) return;
    addTechnique({ ...BLANK_TECHNIQUE, type: "other", technique: label, name: label, category: "Technique", modality: true });
  };
  const confirmForm = () => {
    const t = { ...form, type: formType, id: undefined };
    addTechnique({ ...t, name: techniqueLabel(t), category: "Technique", ...(MODALITY_TYPES.includes(formType) ? { modality: true } : {}) });
    setFormType(null); setForm(BLANK_TECHNIQUE);
  };

  const save = async () => {
    if (!name.trim()) { setError("Give the protocol a name, e.g. Knee Osteoarthritis."); setTab("ex"); return; }
    if (exercises.length + techniques.length === 0) { setError("Add at least one exercise, technique or modality."); return; }
    setError(""); setSaving(true);
    try {
      const row = await saveClinicProtocol({ id: initial?.id, name, region, exercises, techniques });
      onSaved?.(row);
    } catch (e) {
      setError("Couldn't save — " + (e.message || "try again."));
    } finally { setSaving(false); }
  };

  const tabBtn = (k, label, n) => (
    <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setFormType(null); }}
      style={{ flex: 1, padding: "8px 4px", minHeight: 38, borderRadius: 10, border: "none", background: tab === k ? BRAND.purple : "#F5F3FF", color: tab === k ? "#fff" : BRAND.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
      {label} <span style={{ opacity: 0.85, fontWeight: 600 }}>{n}</span>
    </button>
  );
  const typeTile = (key) => {
    const t = TECHNIQUE_TYPES.find((x) => x.key === key);
    return (
      <button key={key} type="button" onClick={() => { setFormType(key); setForm({ ...BLANK_TECHNIQUE, type: key }); }}
        style={{ padding: "8px 12px", minHeight: 38, borderRadius: 12, border: `1.5px solid ${BRAND.border}`, background: "#fff", fontWeight: 700, fontSize: 13, color: BRAND.ink, cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
      </button>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: BRAND.ink }}>{initial?.id ? "Edit protocol" : "New clinic protocol"}</div>
        <button type="button" onClick={onCancel} style={smallBtn}>Cancel</button>
      </div>

      <div style={card}>
        <TextField label="Protocol name" value={name} onChange={setName} placeholder="e.g. Knee Osteoarthritis" />
        <TextField label="Region / condition (optional)" value={region} onChange={setRegion} placeholder="e.g. Knee" />
      </div>

      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {tabBtn("ex", "Exercises", exercises.length)}
        {tabBtn("tech", "Techniques", techs.length)}
        {tabBtn("mod", "Modalities", mods.length)}
      </div>

      <div style={card}>
        {tab === "ex" && (
          <>
            {exercises.length === 0 && <div className="summary-empty" style={{ margin: "4px 0 8px" }}>No exercises yet — search the library below.</div>}
            {exercises.map((e) => (
              <Row key={e.id} title={e.name} sub={doseText(e) || e.target} onRemove={() => setExercises((l) => l.filter((x) => x.id !== e.id))}>
                <div style={{ display: "flex", gap: 6, paddingBottom: 4 }}>
                  {[["sets", "Sets"], ["reps", "Reps"], ["hold", "Hold s"]].map(([k, l]) => (
                    <label key={k} style={{ flex: 1, fontSize: 11, color: BRAND.gray, fontWeight: 700 }}>{l}
                      <input type="number" inputMode="numeric" min="0" value={e[k] ?? ""} onChange={(ev) => setDose(e.id, { [k]: ev.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${BRAND.border}`, borderRadius: 8, padding: "5px 6px", fontSize: 13, fontFamily: "inherit" }} />
                    </label>
                  ))}
                </div>
              </Row>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input aria-label="Search exercise library" placeholder="🔍 Search exercises (e.g. bridge, quads)" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 0, border: `1.5px solid ${BRAND.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 13.5, fontFamily: "inherit" }} />
              <select aria-label="Region" value={libRegion} onChange={(e) => setLibRegion(e.target.value)}
                style={{ width: 110, border: `1.5px solid ${BRAND.border}`, borderRadius: 10, padding: "6px", fontSize: 12.5, fontFamily: "inherit", background: "#fff" }}>
                <option value="all">All regions</option>
                {Object.entries(EXERCISE_DB).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </div>
            {results.length === 0 && (search.trim() || libRegion !== "all") && <div style={{ fontSize: 12, color: BRAND.gray, padding: "6px 2px" }}>No matches — try another word or region.</div>}
            {results.map((e) => (
              <button key={e.id} type="button" onClick={() => addExercise(e)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${BRAND.border}`, padding: "8px 2px", cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: BRAND.ink }}>{e.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: BRAND.gray }}>{e.target}</span>
                </span>
                <span style={{ color: BRAND.purple, fontWeight: 800, fontSize: 12.5 }}>＋ Add</span>
              </button>
            ))}
          </>
        )}

        {tab === "tech" && !formType && (
          <>
            {techs.length === 0 && <div className="summary-empty" style={{ margin: "4px 0 8px" }}>No techniques yet.</div>}
            {techs.map((t, i) => <Row key={i} title={t.name || techniqueLabel(t)} sub={TECHNIQUE_TYPES.find((x) => x.key === t.type)?.label} onRemove={() => removeTechnique(t)} />)}
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray, margin: "10px 0 6px" }}>Add a technique</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["manual", "dn", "st", "other"].map(typeTile)}</div>
          </>
        )}

        {tab === "mod" && !formType && (
          <>
            {mods.length === 0 && <div className="summary-empty" style={{ margin: "4px 0 8px" }}>No modalities yet.</div>}
            {mods.map((t, i) => <Row key={i} title={t.name || techniqueLabel(t)} sub={TECHNIQUE_TYPES.find((x) => x.key === t.type)?.label} onRemove={() => removeTechnique(t)} />)}
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray, margin: "10px 0 6px" }}>Quick add</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {QUICK_PROTOCOL_MODALITIES.filter((m) => !mods.some((x) => x.technique === m)).map((m) => (
                <button key={m} type="button" onClick={() => addQuickModality(m)} style={{ padding: "5px 11px", minHeight: 34, borderRadius: 99, border: `1px dashed ${BRAND.purple}`, background: "#fff", color: BRAND.purpleDark, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>＋ {m}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray, margin: "10px 0 6px" }}>With settings</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{MODALITY_TYPES.map(typeTile)}</div>
          </>
        )}

        {formType && (
          <>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{TECHNIQUE_TYPES.find((x) => x.key === formType)?.label}</div>
            {techniqueEntryForm(formType, form, (k, v) => setForm((f) => ({ ...f, [k]: v })))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" className="ghost-btn" style={{ flex: 1, minHeight: 40 }} onClick={() => { setFormType(null); setForm(BLANK_TECHNIQUE); }}>Back</button>
              <button type="button" className="primary-btn" style={{ flex: 2, minHeight: 40 }} onClick={confirmForm}>Add to protocol</button>
            </div>
          </>
        )}
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))", borderTop: `1px solid ${BRAND.border}` }}>
        {error && <div role="alert" style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 700, marginBottom: 6 }}>{error}</div>}
        <button type="button" className="primary-btn" style={{ width: "100%", minHeight: 42 }} disabled={saving} onClick={save}>
          {saving ? "Saving…" : "💾 Save protocol"}
        </button>
        <div style={{ fontSize: 11.5, color: BRAND.gray, textAlign: "center", paddingTop: 4 }}>{exercises.length} exercises · {techs.length} techniques · {mods.length} modalities</div>
      </div>
    </div>
  );
}
