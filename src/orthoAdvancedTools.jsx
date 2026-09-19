import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FmaIcon, poseForJoint } from "./fmaIcons.jsx";
import { SectionIntro, TextArea, InfoButton, InfoCard, InfoCardGrid, Hint, useSectionData } from "./orthoFieldKit.jsx";
import { RESTRICTION_GRADE } from "./orthoClinicalData.js";
import {
  KC_REGIONS,
  NKT_REGIONS,
  CYRIAX_REGIONS_DATA,
  KC_REGION_KEYS,
  NKT_REGION_KEYS,
  CYRIAX_REGION_KEYS,
  FMA_DATA,
  FMA_REGION_KEYS,
  CYRIAX_RESISTED_RESULTS,
  CYRIAX_PAIN_OPTIONS,
  CYRIAX_LIMITED_OPTIONS,
  CYRIAX_DEFAULT_ENDFEEL,
  KALTENBORN_GRADES,
  FASCIA_REGIONS_DATA,
  FASCIA_REGION_KEYS,
  FASCIA_LINES_DATA,
} from "./orthoAdvancedLibrary.js";

/* The real app's KC_REGIONS / NKT_REGIONS / CYRIAX_REGIONS_DATA colors are
   tuned for a dark theme (saturated neon green/cyan/pink) — too loud on our
   light cards. Mute them by blending toward a soft neutral, keeping the
   hue (so the colour-coding still reads at a glance) without the glow. */
function mixToward(hex, target, amount) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (ch) => Math.round(ch * (1 - amount) + target * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function muteColor(hex) {
  return hex ? mixToward(hex, 130, 0.42) : hex;
}
/* Very light pastel tint for badge/chip backgrounds — same hue, mostly white. */
function tintColor(hex) {
  return hex ? mixToward(hex, 255, 0.88) : hex;
}

/* ============================================================
   Shared colorful region tab bar — each region tints its own
   tab with its real PhysioMind color when active, instead of a
   flat purple strip. That's the "funky" visual signature these
   four modules carry in the real app (vs. the plainer ROM/MMT
   style) — muted for our light theme.
   ============================================================ */
function ColorRegionTabs({ tabs, activeKey, onSelect, regionsData, counts }) {
  return (
    <div className="region-tab-row-wrap">
      <div className="region-tab-row">
        {tabs.map((k) => {
          const meta = regionsData?.[k];
          const active = activeKey === k;
          const color = meta?.color ? muteColor(meta.color) : undefined;
          const style = active && color ? { background: color, borderColor: color, color: "#fff" } : color ? { borderColor: color, color } : undefined;
          const count = counts?.[k] || 0;
          return (
            <button type="button" key={k} className={"region-tab" + (active ? " region-tab-active" : "")} style={style} onClick={() => onSelect(k)}>
              {meta?.icon ? meta.icon + " " : ""}
              {meta?.label || k}
              {count > 0 && <span className="region-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useAdvActiveRegion(data, setData, sectionKey_, keys) {
  const [d, set] = useSectionData(data, setData, sectionKey_);
  const [activeKey, setActiveKeyState] = useState(d.activeRegion || keys[0]);
  function setActiveKey(k) {
    setActiveKeyState(k);
    set("activeRegion", k);
  }
  return { d, set, activeKey, setActiveKey };
}

/* ============================================================
   Colorful option-chip row — used by Kinetic Chain + CPA/NKT.
   Each option carries its own clinical-meaning color straight
   from the real data (green = facilitated/normal, amber = mild,
   red = inhibited/severe...), tapped to select, tap again to
   clear.
   ============================================================ */
/* Two-step CPA result picker: pick the state (Normal / Facilitated /
   Overactive / Inhibited), then -- only when that state has more than one
   pattern (e.g. several "Overactive — X compensation" variants) -- pick the
   pattern. The stored value is still the full option `val`, so saved data
   and every reader of it are unchanged. */
const CPA_STATE_ORDER = ["Normal", "Facilitated", "Overactive", "Inhibited"];
const CPA_STATE_COLOR = { Normal: "#059669", Facilitated: "#059669", Overactive: "#dc2626", Inhibited: "#2563eb", Other: "#6b7280" };
function cpaStateOf(val) {
  const m = /^(normal|facilitat|overactive|inhibit)/i.exec(val || "");
  if (!m) return "Other";
  const k = m[1].toLowerCase();
  return k === "normal" ? "Normal" : k.startsWith("facil") ? "Facilitated" : k === "overactive" ? "Overactive" : "Inhibited";
}
function cpaPatternOf(val) {
  const parts = String(val || "").split(/\s[—–-]\s/);
  return parts.length > 1 ? parts.slice(1).join(" — ") : val;
}
export function CpaOptionPicker({ options, value, onChange }) {
  const groups = {};
  options.forEach((o) => { (groups[cpaStateOf(o.val)] ||= []).push(o); });
  const states = [...CPA_STATE_ORDER, "Other"].filter((k) => groups[k]);
  const currentState = value ? cpaStateOf(value) : null;
  const [pending, setPending] = useState(null);
  const openState = currentState || pending;
  const selectedOpt = options.find((o) => o.val === value);
  function pickState(st) {
    if (openState === st) { setPending(null); onChange(""); return; }
    const g = groups[st];
    if (g.length === 1) { setPending(null); onChange(g[0].val); }
    else { setPending(st); onChange(""); }
  }
  const col = openState ? CPA_STATE_COLOR[openState] : null;
  return (
    <div>
      <div style={{ display: "flex", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
        {states.map((st, i) => {
          const on = openState === st;
          return (
            <button type="button" key={st} onClick={() => pickState(st)}
              style={{ flex: 1, padding: "10px 4px", border: "none", borderLeft: i ? "1px solid #E5E7EB" : "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: on ? 700 : 500, background: on ? `${CPA_STATE_COLOR[st]}18` : "#fff", color: on ? CPA_STATE_COLOR[st] : "#6b7280" }}>
              {st}
            </button>
          );
        })}
      </div>
      {openState && groups[openState].length > 1 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: 2 }}>Which pattern?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {groups[openState].map((o) => {
              const sel = value === o.val;
              return (
                <button type="button" key={o.val} onClick={() => onChange(sel ? "" : o.val)}
                  style={{ padding: "5px 11px", borderRadius: 16, fontSize: "0.76rem", cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? col : "#D1D5DB"}`, background: sel ? `${col}18` : "#fff", color: sel ? col : "#6b7280", fontWeight: sel ? 700 : 500 }}>
                  {cpaPatternOf(o.val)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {selectedOpt?.meaning && (
        <div style={{ marginTop: 8, fontSize: "0.76rem", lineHeight: 1.5, color: "#374151" }}>{selectedOpt.meaning}</div>
      )}
    </div>
  );
}

/* Drop-in replacement for <GradeSelect> with the same
   <option> children and an e.target.value-style onChange -- but its list is
   our own white popover instead of the browser/OS-native picker, which
   renders as a grey system menu on desktop (2026-09-18, Aditi: "white,
   make white not grey"). */
export function GradeSelect({ value, onChange, children, style, className = "grade-select" }) {
  const opts = React.Children.toArray(children)
    .filter((c) => c && c.type === "option")
    .map((c) => ({ value: c.props.value ?? "", label: c.props.children }));
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = React.useRef(null);
  const current = opts.find((o) => o.value === (value || ""));
  const placeholder = opts.find((o) => o.value === "");
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);
  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const maxH = Math.min(280, Math.max(140, Math.max(below, r.top) - 16));
      const up = below < 200 && r.top > below;
      setPos({ left: r.left, width: Math.max(r.width, 160), maxH, top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined });
    }
    setOpen((o) => !o);
  }
  return (
    <>
      <button ref={btnRef} type="button" className={className} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", fontFamily: "inherit", ...style }} onClick={toggle}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? undefined : "#6b7280", fontWeight: value ? 700 : 500 }}>{value ? (current?.label ?? value) : (placeholder?.label ?? "Select")}</span>
        <span aria-hidden="true" style={{ fontSize: 10, color: "#6b7280" }}>▾</span>
      </button>
      {open && pos && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, overflowY: "auto", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 10px 28px rgba(20,10,60,.18)", padding: 4 }}>
            {opts.map((o) => {
              const sel = (value || "") === o.value;
              return (
                <button type="button" key={o.value || "__none"} onClick={() => { onChange({ target: { value: o.value } }); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderRadius: 8, background: sel ? "#F3EFFF" : "#fff", color: o.value ? "#1f2937" : "#6b7280", fontWeight: sel ? 700 : 500, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.35 }}>
                  <span style={{ width: 14, color: "#6D28D9" }}>{sel ? "✓" : ""}</span>
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function OptionChips({ options, value, onChange }) {
  return (
    <div className="chip-mini-row">
      {options.map((o) => {
        const selected = value === o.val;
        const muted = muteColor(o.color);
        const style = selected ? { background: muted, borderColor: muted, color: "#fff", fontWeight: 700 } : { borderColor: muted, color: muted };
        return (
          <button type="button" key={o.val} className="chip-mini funky-chip" style={style} onClick={() => onChange(selected ? "" : o.val)}>
            {o.val}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   KINETIC CHAIN — Cook & Boyle joint-by-joint (mobility/
   stability) screen, straight from KC_REGIONS.
   ============================================================ */
function kcCount(entry, tests) {
  if (!entry) return 0;
  return tests.filter((t) => entry[t.id]).length;
}

// Same real KC_REGIONS data (id/how/chainEffect/treatment), split across
// Perform/Reference/Interpret tabs -- same pattern as Ortho's ROM/MMT/
// Special Tests. image uses the test's own real id -- present on
// Cloudinary for the foot/ankle and hip regions today; falls back to
// InfoButton's own placeholder for regions not yet photographed.
// Shows EVERY selectable result with its clinical meaning (Normal /
// Facilitated / Inhibited / Overactive variants...), matching the older
// NKT and Kinetic Chain screens ("Select Finding — What Each Result Means")
// -- the first version of this filtered to inhibit/overactive only, so
// Normal/Facilitated and the other overactive variants were missing.
function optionTint(val) {
  if (/inhibit/i.test(val)) return "red";
  if (/overactive|hyper/i.test(val)) return "amber";
  if (/bilateral/i.test(val)) return "violet";
  if (/normal|facilitat/i.test(val)) return "green";
  return "blue";
}
function optionMeaningCards(options, icon = "📊") {
  return (options || []).filter((o) => o && o.meaning).map((o, i) => (
    <InfoCard key={i} icon={icon} label={o.val} tint={optionTint(o.val)}>{o.meaning}</InfoCard>
  ));
}

export function kcRichItem(t) {
  return {
    image: t.id,
    title: t.label,
    subtitle: t.joint,
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
    reference: <InfoCard icon="⛓️" label="Kinetic chain effect" tint="blue">{t.chainEffect}</InfoCard>,
    interpret: (
      <>
        {optionMeaningCards(t.options)}
        <InfoCard icon="🎯" label="Treatment protocol" tint="green">{t.treatment}</InfoCard>
      </>
    ),
  };
}

function firstSentence(str) {
  const m = /^.*?[.!?](\s|$)/.exec(String(str || ""));
  return m ? m[0].trim() : String(str || "");
}
function HelpsFindLine({ text }) {
  return (
    <span style={{ fontSize: "0.7rem", color: "#4C1D95", lineHeight: 1.35, marginTop: 2 }}>
      <b style={{ fontWeight: 800 }}>Helps find: </b>
      <span style={{ display: "inline", color: "#4b5563" }}>{text}</span>
    </span>
  );
}

function kcHelpsFind(t) {
  const m = /^.*?[.!?](\s|$)/.exec(String(t.chainEffect || ""));
  const first = m ? m[0].trim() : String(t.chainEffect || "");
  return `Screens ${t.joint || "this joint"} (${String(t.role || "").toLowerCase()}). ${first}`.trim();
}

export function KineticChainSection({ data, setData, sectionKey = "kineticChain" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, KC_REGION_KEYS);
  const [openId, setOpenId] = useState(null);
  const region = KC_REGIONS[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  KC_REGION_KEYS.forEach((k) => (counts[k] = kcCount(d[k], KC_REGIONS[k].tests)));
  const openTest = openId ? region.tests.find((t) => t.id === openId) : null;

  return (
    <>
      <SectionIntro icon="⛓️" title="Kinetic Chain" info="Joint-by-joint theory (Cook & Boyle): each region alternates between needing mobility and needing stability. A restriction or instability at one link commonly shows up as compensation further along the chain." />
      <ColorRegionTabs tabs={KC_REGION_KEYS} activeKey={activeKey} onSelect={(k) => { setOpenId(null); setActiveKey(k); }} regionsData={KC_REGIONS} counts={counts} />
      <div className="rom-card">
        <div className="rom-card-title">
          {region.label}
          <span className="funky-role-badge" style={{ background: tintColor(region.color), color: muteColor(region.color) }}>
            {region.role}
          </span>
        </div>

        {!openTest && (
          <div className="tile-grid-2" style={{ gap: 10 }}>
            {region.tests.map((t) => {
              const done = !!entry[t.id];
              return (
                <button type="button" key={t.id} onClick={() => setOpenId(t.id)}
                  style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", background: "#fff", borderRadius: 14, padding: "12px 12px 10px", border: done ? "1.5px solid #34D399" : "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: "#F3EFFF", display: "flex", alignItems: "center", justifyContent: "center" }}><FmaIcon pose={poseForJoint(t.joint)} size={28} /></span>
                  <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "#1f2937", lineHeight: 1.25 }}>{t.label}</span>
                  <span style={{ fontSize: "0.68rem", color: "#6b7280", lineHeight: 1.3 }}>{t.joint}</span>
                  <HelpsFindLine text={firstSentence(t.chainEffect)} />
                  <span style={{ alignSelf: "flex-start", marginTop: 4, fontSize: "0.68rem", padding: "1px 8px", borderRadius: 10, background: done ? "#DCFCE7" : "#F3F4F6", color: done ? "#166534" : "#6b7280", fontWeight: 600 }}>
                    {done ? "Done" : "Not done"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {openTest && (() => {
          const t = openTest;
          const val = entry[t.id];
          const selOpt = t.options.find((o) => o.val === val);
          return (
            <div>
              <button type="button" onClick={() => setOpenId(null)} style={{ background: "none", border: "none", padding: 0, marginBottom: 10, color: "#6D28D9", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>‹ Back to all {region.label} tests</button>
              <div className="movement-name-row">
                <span className="movement-name" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><FmaIcon pose={poseForJoint(t.joint)} size={26} />{t.label}</span>
                <InfoButton title={t.label} richItem={kcRichItem(t)} />
              </div>
              <div className="muscle-subtitle">{t.joint}</div>
              <InfoCard icon="🔎" label="Helps find" tint="violet">{kcHelpsFind(t)}</InfoCard>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#6b7280", margin: "12px 0 6px" }}>Result</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {t.options.map((o) => {
                  const sel = val === o.val;
                  return (
                    <button type="button" key={o.val} onClick={() => set(activeKey, { ...entry, [t.id]: sel ? "" : o.val })}
                      style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: sel ? `${o.color}18` : "#fff", border: `1.5px solid ${sel ? o.color : "#E5E7EB"}` }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: `2px solid ${o.color}`, background: sel ? o.color : "transparent" }} />
                      <span style={{ fontSize: "0.82rem", fontWeight: sel ? 700 : 500, color: "#1f2937", lineHeight: 1.3 }}>{o.val}</span>
                    </button>
                  );
                })}
              </div>
              {selOpt?.meaning && <Hint>{selOpt.meaning}</Hint>}
            </div>
          );
        })()}
      </div>
    </>
  );
}

/* ============================================================
   CPA — Compensation Pattern Analysis (Neurokinetic Therapy),
   straight from NKT_REGIONS.
   ============================================================ */
// Same real NKT_REGIONS data (id/how/compensator/treatment), split across
// Perform/Reference/Interpret tabs. No NKT photos on Cloudinary yet --
// image stays unset, falling back to InfoButton's own placeholder, same
// honest-empty-state pattern used everywhere else in this system.
// t.options already carries this exact clinical detail (Facilitated/
// Inhibited/Overactive, each with a real `meaning`) but it only ever
// surfaced as bare option-chip labels in the test row itself -- a student
// picking a chip had no way to see what that finding actually means before
// deciding whether to test it. Surface the Inhibited/Overactive meanings on
// the Interpret tab (2026-09-03, Aditi: "if this muscle is inhibited, then
// what it causes, if overactive what it causes... a student should know if
// he wants to assess it or not") so it's read before the exam, not just
// after picking a result.
export function cpaRichItem(t) {
  return {
    image: t.id,
    hideHeroOn: ["interpret"],
    title: t.label,
    subtitle: t.muscle,
    perform: <InfoCard icon="👐" label="How to test" tint="violet">{t.how}</InfoCard>,
    reference: <InfoCard icon="🔀" label="Common compensators" tint="amber">{t.compensator}</InfoCard>,
    interpret: (
      <>
        {optionMeaningCards(t.options, null)}
        <InfoCard label="Treatment protocol" tint="green">{t.treatment}</InfoCard>
      </>
    ),
  };
}

export function CpaSection({ data, setData, sectionKey = "cpa" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, NKT_REGION_KEYS);
  const region = NKT_REGIONS[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  NKT_REGION_KEYS.forEach((k) => (counts[k] = kcCount(d[k], NKT_REGIONS[k].tests)));

  return (
    <>
      <SectionIntro icon="🧠" title="CPA — Compensation Pattern Analysis" info="Neurokinetic Therapy screening: identifies which muscles the motor control centre has inhibited, and which synergists have become overworked compensators as a result." />
      <ColorRegionTabs tabs={NKT_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={NKT_REGIONS} counts={counts} />
      <div className="rom-card">
        <div className="rom-card-title">{region.label}</div>
        {region.tests.map((t) => (
          <div className="movement-card" key={t.id}>
            <div className="movement-name-row">
              <span className="movement-name">{t.label}</span>
              <InfoButton title={t.label} richItem={cpaRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{t.muscle}</div>
            <CpaOptionPicker options={t.options} value={entry[t.id]} onChange={(v) => set(activeKey, { ...entry, [t.id]: v })} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   STTT — Selective Tissue Tension Testing (Cyriax), straight
   from CYRIAX_REGIONS_DATA. Active / Passive / Resisted / Joint
   Play sub-tabs, each with the field type Cyriax actually uses.
   ============================================================ */
const CYRIAX_TABS = [
  { id: "activeROM", label: "Active", icon: "🚶" },
  { id: "passiveROM", label: "Passive", icon: "🤲" },
  { id: "resistedTests", label: "Resisted", icon: "💪" },
  { id: "jointPlay", label: "Joint Play", icon: "🔧" },
];

// Region-level reference card, from the real CYRIAX_REGIONS_DATA anatomy/
// capsularPattern/redFlags/differentials fields -- Perform=anatomy,
// Reference=capsular pattern, Interpret=red flags + differentials.
function cyriaxRegionRichItem(region) {
  return {
    title: `${region.label} — reference`,
    perform: <InfoCard icon="🩻" label="Anatomy" tint="violet">{region.anatomy}</InfoCard>,
    reference: <InfoCard icon="🔵" label="Capsular pattern" tint="blue">{region.capsularPattern}</InfoCard>,
    interpret: (region.redFlags?.length || region.differentials?.length) && (
      <>
        {region.redFlags?.length > 0 && <InfoCard icon="🚩" label="Red flags" tint="red">{region.redFlags.join(", ")}</InfoCard>}
        {region.differentials?.length > 0 && <InfoCard label="Differentials to consider" tint="gray">{region.differentials.join(", ")}</InfoCard>}
      </>
    ),
  };
}

// Individual Cyriax test (t.how only, no id-based photos) -- always
// Perform-only; the InfoButton sheet hides tabs with no content, so this
// renders as a single-pane sheet without a tab strip.
export function cyriaxTestRichItem(t) {
  return {
    title: t.label,
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
  };
}

function cyriaxCount(entry) {
  if (!entry) return 0;
  return Object.keys(entry).filter((k) => !k.startsWith("__") && entry[k]).length;
}

export function SttSection({ data, setData, sectionKey = "sttt" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, CYRIAX_REGION_KEYS);
  const [tab, setTab] = useState("activeROM");
  const region = CYRIAX_REGIONS_DATA[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  CYRIAX_REGION_KEYS.forEach((k) => (counts[k] = cyriaxCount(d[k])));

  const items = region[tab] || [];

  return (
    <>
      <SectionIntro
        icon="🦴"
        title="STTT — Selective Tissue Tension"
        info="Cyriax's selective tension approach: active movement shows willingness to move, passive movement isolates inert structures (end-feel), resisted testing isolates the contractile unit (muscle/tendon), joint play checks accessory glide."
      />
      <ColorRegionTabs tabs={CYRIAX_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={CYRIAX_REGIONS_DATA} counts={counts} />

      <div className="rom-card">
        <div className="rom-card-title">
          {region.icon} {region.label}
          <InfoButton title={`${region.label} — reference`} richItem={cyriaxRegionRichItem(region)} />
        </div>

        <div className="category-chip-row">
          {CYRIAX_TABS.map((t) => (
            <button type="button" key={t.id} className={"category-chip" + (tab === t.id ? " category-chip-active" : "")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {items.length === 0 && <Hint>Nothing catalogued for this tab in this region.</Hint>}

        {tab === "activeROM" &&
          items.map((t) => {
            const normalDeg = Number(String(t.normal).match(/\d+/)?.[0]);
            const deg = entry[t.id + "_deg"];
            const gr = normalDeg && deg ? RESTRICTION_GRADE(Number(deg), normalDeg) : null;
            return (
              <div className="movement-card" key={t.id}>
                <div className="movement-head">
                  <div>
                    <div className="movement-name-row">
                      <span className="movement-name">{t.label}</span>
                      <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
                    </div>
                    <div className="muscle-subtitle">Normal: {t.normal}</div>
                  </div>
                  <div className="movement-lr-col-stack">
                    <input className="value-input" type="number" placeholder="--" value={deg ?? ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_deg"]: e.target.value })} />
                    {gr && (
                      <div className="restriction-bar" title={gr.label}>
                        <div className="restriction-bar-fill" style={{ width: Math.min(100, gr.pct) + "%", background: gr.color }} />
                      </div>
                    )}
                    {gr && <span className="restriction-label" style={{ color: gr.color }}>{gr.label}</span>}
                  </div>
                </div>
                <div className="row-2" style={{ marginTop: 6 }}>
                  <GradeSelect value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                    <option value="">Pain?</option>
                    {CYRIAX_PAIN_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </GradeSelect>
                  <GradeSelect value={entry[t.id + "_limited"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_limited"]: e.target.value })}>
                    <option value="">Range?</option>
                    {CYRIAX_LIMITED_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </GradeSelect>
                </div>
              </div>
            );
          })}

        {tab === "passiveROM" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="row-2" style={{ marginTop: 6 }}>
                <GradeSelect value={entry[t.id + "_ef"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_ef"]: e.target.value })}>
                  <option value="">End-feel?</option>
                  {(t.endfeel_options || CYRIAX_DEFAULT_ENDFEEL).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </GradeSelect>
                <GradeSelect value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                  <option value="">Pain?</option>
                  {CYRIAX_PAIN_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </GradeSelect>
              </div>
            </div>
          ))}

        {tab === "resistedTests" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="muscle-subtitle">{t.muscle}</div>
              <GradeSelect style={{ marginTop: 6, width: "100%" }} value={entry[t.id + "_result"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_result"]: e.target.value })}>
                <option value="">Select result...</option>
                {CYRIAX_RESISTED_RESULTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </GradeSelect>
            </div>
          ))}

        {tab === "jointPlay" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="row-2" style={{ marginTop: 6 }}>
                <GradeSelect value={entry[t.id + "_grade"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_grade"]: e.target.value })}>
                  <option value="">Kaltenborn grade...</option>
                  {KALTENBORN_GRADES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </GradeSelect>
                <GradeSelect value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                  <option value="">Pain?</option>
                  {CYRIAX_PAIN_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </GradeSelect>
              </div>
            </div>
          ))}

        <TextArea label="Clinical reasoning notes" value={entry.reasoningNotes} onChange={(v) => set(activeKey, { ...entry, reasoningNotes: v })} placeholder="Tissue hypothesis, next tests, correlation with subjective findings..." />
      </div>
    </>
  );
}

/* ============================================================
   FUNCTIONAL MOVEMENT SCREEN — real per-test setup/observations/
   grading straight from the FMA *_TESTS arrays, rendered through
   one shared compact card (the real app builds 10 bespoke
   components with hand-drawn SVGs; here every region reuses the
   same fast-fill card so the tool stays consistent + quick).
   ============================================================ */
const FMA_GRADE_COLOR = { 0: "#16A34A", 1: "#D97706", 2: "#DC2626" };

// FMA tests carry a hand-drawn SVG stick-figure illustration (t.svgNormal,
// from RegionalFunctionalScreens.jsx) that used to render inline here in
// the Perform tab -- dropped (2026-09-17, Aditi) from this info card and
// from Learn's Functional Screen study mode (FunctionalStudy.jsx). The
// underlying t.svgNormal/t.svgAbnormal data is untouched in case either
// surface wants it back later.
export function fmaRichItem(t) {
  // Same content the older Functional Screen carries: what to observe, what
  // each option means clinically (obs.clues), and the grading scale -- the
  // first version only had setup + normal pattern.
  const obsCards = (t.observations || []).map((obs) => {
    const rows = (obs.opts || []).map((opt, i) => ({ opt, clue: obs.clues?.[i] }));
    return (
      <InfoCard key={obs.id} label={obs.q} tint="blue">
        {rows.map((r, i) => (
          <div key={i} style={{ marginTop: i ? 8 : 0 }}>
            <div style={{ fontWeight: 700, color: r.opt.startsWith("✗") ? "#dc2626" : r.opt.startsWith("⚠") ? "#d97706" : "#059669" }}>{r.opt}</div>
            {r.clue && <div>{r.clue}</div>}
          </div>
        ))}
      </InfoCard>
    );
  });
  return {
    hideHeroOn: ["interpret"],
    title: t.label,
    subtitle: t.phase,
    perform: (
      <>
        <InfoCard icon="👐" label="Setup & procedure" tint="violet">{t.setup}</InfoCard>
        <InfoCard icon="✅" label="Normal pattern" tint="green">{t.normalDesc}</InfoCard>
      </>
    ),
    interpret: (
      <>
        {obsCards}
        {(t.grades || []).length > 0 && (
          <InfoCard label="Grading" tint="amber">
            {t.grades.map((g, i) => <div key={i} style={{ marginTop: i ? 6 : 0 }}>{g}</div>)}
          </InfoCard>
        )}
      </>
    ),
  };
}

function fmaCount(entry, tests) {
  if (!entry) return 0;
  return tests.filter((t) => entry[t.id + "_grade"]).length;
}

/* One-line "what this test helps find" per functional test id, shown at
   the top of an opened test. Draft clinical wording -- review before relying on it. */
const FMA_HELPS = {
  lfs_sts: "Weak glutes/quads, poor hip hinge, and whether the spine or the hips take the load when rising. Shows compensation that overloads the low back.",
  lfs_fwd: "Painful or restricted lumbar flexion, a lateral shift, and whether symptoms centralise or peripheralise. Helps separate a disc/flexion-intolerant pattern from hip or hamstring tightness.",
  lfs_sls: "Weak gluteus medius and poor lumbopelvic or SIJ control. A pelvic drop or trunk lean points to hip abductor weakness (Trendelenburg).",
  lfs_squat: "Poor hip–lumbar rhythm, early lumbar flexion, or pelvic tilt at depth. Shows whether the back is compensating for stiff hips or ankles.",
  lfs_step: "Glute weakness and poor single-leg stability under load. Shows pelvic drop, trunk lean or knee collapse when driving up.",
  fms_aslr: "Hamstring and hip-flexor tightness on one side versus core stability. Tells you whether limited leg raise is a flexibility or a control problem.",
  fms_tspu: "Anterior core stability. A sagging low back or lagging hips means the trunk can't stay rigid while the limbs move.",
  fms_rs: "Multi-plane trunk control and hip–shoulder coordination. Shows rotational instability that loads the spine during reaching or walking.",
  sfs_flex: "Scapulohumeral rhythm and early shrugging or arching. Helps find subacromial pinching, weak upward rotators, or a stiff thoracic spine.",
  sfs_abd: "A painful arc, which separates subacromial problems (around 60–120°) from AC joint pain (near the top of the range).",
  sfs_ir: "Restricted internal rotation, typically posterior capsule or cuff tightness. Compare sides for a side-to-side difference.",
  sfs_er: "Restricted external rotation and abduction, typically anterior capsule or lat/pec tightness. Compare sides.",
  sfs_scap: "Serratus anterior and lower trapezius weakness. Shows winging or the blade lifting off the wall during the slide.",
  fms_sm: "Combined shoulder and thoracic mobility. A gap between fists longer than the normal hand-length suggests restriction.",
  hfs_sls: "Weak gluteus medius, dynamic knee valgus and poor pelvic control on one leg. The main frontal-plane screen for the hip.",
  hfs_hinge: "Posterior chain tightness and glute max activation. Shows whether the movement comes from the hips or from the lumbar spine.",
  hfs_ext: "Glute max firing order. If the hamstrings or low back fire first, the glute is under-recruited (Janda pattern).",
  hfs_rot: "Restricted hip internal/external rotation from FAI or capsular tightness. A loss of internal rotation is the classic early hip sign.",
  hfs_step: "Eccentric glute med control while lowering. Shows pelvic drop and knee valgus when decelerating.",
  fms_sq: "Whole lower-chain mobility and control in one movement. Shows which link (ankle, hip, thoracic or shoulder) limits depth and form.",
  fms_hs: "Single-leg stance control and hip hinge quality while the other leg moves. Shows pelvic drop, trunk lean or loss of balance.",
  fms_il: "Sagittal control and frontal stability through hip, knee and ankle. Shows asymmetry between sides and poor hip–core stability.",
  kfs_squat: "Patellofemoral loading and knee valgus in a basic squat. Shows pain-provoking depth and quad/glute weakness.",
  kfs_lunge: "Patellofemoral compression and terminal knee extension control. Shows front-knee pain, IT band tightness and quad weakness.",
  kfs_step: "Eccentric VMO control, patellar tracking and valgus while lowering. Provokes patellofemoral pain at speed.",
  kfs_hop: "Landing mechanics, dynamic valgus and neuromuscular control, and so ACL injury risk. Common return-to-sport screen.",
  kfs_tke: "Patellofemoral contact pain through the range. The angle where pain starts shows which part of the joint is loaded.",
  afs_hr: "Calf endurance, tibialis posterior and Achilles load tolerance. Fewer reps than the other side means plantarflexor weakness.",
  afs_df: "Ankle dorsiflexion restriction from posterior capsule tightness or anterior impingement. Common in chronic ankle instability.",
  afs_bal: "Ankle proprioception and lateral stability. Poor balance after a sprain suggests chronic ankle instability.",
  afs_hop: "Dynamic ankle stability, Achilles loading and limb symmetry. Used to decide readiness to return to sport.",
  afs_arch: "Tibialis posterior function and excessive pronation. A large navicular drop shows a collapsing medial arch.",
  cfs_arom: "Which neck motions are limited or painful, and whether the cause is joint, capsular or muscular. A first screen before any specific test.",
  cfs_dnf: "Deep neck flexor endurance and control. A short hold time is linked to forward head posture and neck pain.",
  cfs_post: "Forward head posture using the craniovertebral angle. Fits the upper crossed pattern (Janda).",
  cfs_diz: "Dizziness that comes from the neck rather than the inner ear, plus a vertebrobasilar (VBI) safety check before neck treatment.",
  cfs_ulnt: "Neural tension in the median nerve. Reproducing arm symptoms points to a C6/C7 radiculopathy or a sensitised nerve.",
  tfs_arom: "Which thoracic movements are stiff or painful and at which level. Shows segmental hypomobility.",
  tfs_rib: "Rib joint stiffness that limits breathing and rotation. Checks the costovertebral and costotransverse joints.",
  tfs_ext: "Poor thoracic extension that pushes the neck or shoulders to compensate. Common in slumped, desk-bound posture.",
  tfs_t4: "T4 syndrome: hand/arm tingling with no clear neck cause. A sympathetic-type referral from the upper thoracic spine.",
  tfs_scap: "Scapular winging or dyskinesis from weak lower trapezius/serratus. Explains shoulder and upper-back pain with overhead use.",
  efs_arom: "Elbow and forearm range: what is restricted, what is painful, and the end-feel.",
  efs_lat: "Tennis elbow (lateral epicondylalgia). Pain on resisted wrist extension confirms extensor origin tendinopathy.",
  efs_med: "Golfer's elbow, UCL strain and ulnar nerve irritation. Common in throwers and overhead athletes.",
  efs_stab: "Elbow ligament stability, especially posterolateral rotatory instability. Important after dislocation or repeated injections.",
  efs_neural: "Radial or median nerve tension, and cubital tunnel irritation. Separates a nerve source from a muscle or joint one.",
  wfs_arom: "Wrist range and grip capacity. Lower grip strength points to tendon, joint or nerve involvement.",
  wfs_cts: "Carpal tunnel syndrome. Reproducing night tingling in the thumb-to-ring finger points to median nerve compression.",
  wfs_tfcc: "Ulnar-sided wrist pain from the TFCC, DRUJ instability or ECU. Common after a fall on the hand or with twisting.",
  wfs_scaph: "Scaphoid fracture or scapholunate ligament injury after a fall on an outstretched hand. Snuffbox tenderness is a red flag.",
  wfs_fingers: "Finger joint range, tendon integrity and collateral ligament stability.",
  tmj_arom: "Jaw opening range, deviation and protrusion. A deviating or limited opening suggests disc displacement.",
  tmj_click: "Whether clicking is a disc that reduces or one that doesn't. Crepitus suggests joint surface change.",
  tmj_muscle: "Muscle guarding around the jaw. Tender masseter/temporalis point to a myofascial (muscle) source.",
  tmj_cerv: "How neck posture and upper cervical joints feed jaw and head pain.",
  tmj_head: "Which headache type it is: cervicogenic, tension-type or TMD-related. Guides what to treat first."
};

export function FmaSection({ data, setData, sectionKey = "fma" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, FMA_REGION_KEYS);
  const [openId, setOpenId] = useState(null);
  const tests = FMA_DATA[activeKey] || [];
  const entry = d[activeKey] || {};
  const counts = {};
  FMA_REGION_KEYS.forEach((k) => (counts[k] = fmaCount(d[k], FMA_DATA[k])));
  const openTest = openId ? tests.find((t) => t.id === openId) : null;
  const doneCount = (t) => t.observations.filter((o) => entry[t.id + "_" + o.id]).length + (entry[t.id + "_grade"] ? 1 : 0);

  return (
    <>
      <SectionIntro icon="🏃" title="Functional Movement Screen" info="Fundamental movement patterns, screened for compensation strategy rather than a pass/fail score — grade each pattern Normal, Compensated, or Abnormal, and note which specific fault was observed." />
      <ColorRegionTabs tabs={FMA_REGION_KEYS} activeKey={activeKey} onSelect={(k) => { setOpenId(null); setActiveKey(k); }} counts={counts} labelFor={(k) => k} regionsData={undefined} />

      {!openTest && (
        <div className="rom-card">
          <div className="rom-card-title">{activeKey}</div>
          <div className="tile-grid-2" style={{ gap: 10 }}>
            {tests.map((t) => {
              const done = doneCount(t);
              const total = t.observations.length + 1;
              return (
                <button type="button" key={t.id} onClick={() => setOpenId(t.id)}
                  style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", background: "#fff", borderRadius: 14, padding: "12px 12px 10px", border: done ? "1.5px solid #34D399" : "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: "#F3EFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}><FmaIcon id={t.id} size={28} /></span>
                  <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "#1f2937", lineHeight: 1.25 }}>{t.label}</span>
                  <HelpsFindLine text={firstSentence(FMA_HELPS[t.id]) || t.subtitle} />
                  <span style={{ alignSelf: "flex-start", marginTop: 4, fontSize: "0.68rem", padding: "1px 8px", borderRadius: 10, background: done ? "#DCFCE7" : "#F3F4F6", color: done ? "#166534" : "#6b7280", fontWeight: 600 }}>
                    {done ? `${done} of ${total} done` : "Not done"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openTest && (() => {
        const t = openTest;
        const grade = entry[t.id + "_grade"];
        const gradeIdx = grade ? t.grades.indexOf(grade) : -1;
        return (
          <div className="rom-card">
            <button type="button" onClick={() => setOpenId(null)} style={{ background: "none", border: "none", padding: 0, marginBottom: 10, color: "#6D28D9", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>‹ Back to all {activeKey} tests</button>
            <div className="movement-name-row">
              <span className="movement-name" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><FmaIcon id={t.id} size={26} />{t.label}</span>
              <InfoButton title={t.label} richItem={fmaRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{t.subtitle}</div>

            <InfoCard icon="🔎" label="Helps find" tint="violet">{FMA_HELPS[t.id] || `${t.phase}. ${t.subtitle}.`}</InfoCard>

            <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#6b7280", margin: "12px 0 2px" }}>What to observe</div>
            {t.observations.map((obs) => {
              const val = entry[t.id + "_" + obs.id];
              const idx = obs.opts.indexOf(val);
              const clue = idx > 0 ? obs.clues[idx] : "";
              return (
                <div key={obs.id} style={{ marginTop: 8 }}>
                  <GradeSelect style={{ width: "100%" }} value={val || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_" + obs.id]: e.target.value })}>
                    <option value="">{obs.q}</option>
                    {obs.opts.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </GradeSelect>
                  {clue && <Hint>{clue}</Hint>}
                </div>
              );
            })}

            <div className="chip-mini-row" style={{ marginTop: 12 }}>
              {t.grades.map((g, i) => {
                const selected = grade === g;
                const color = FMA_GRADE_COLOR[i];
                const style = selected ? { background: color, borderColor: color, color: "#fff", fontWeight: 700 } : { borderColor: color + "55", color };
                return (
                  <button type="button" key={g} className="chip-mini funky-chip" style={style} onClick={() => set(activeKey, { ...entry, [t.id + "_grade"]: selected ? "" : g })}>
                    {["Normal", "Compensated", "Abnormal"][i] || g}
                  </button>
                );
              })}
            </div>
            {gradeIdx >= 0 && <Hint>{grade}</Hint>}
          </div>
        );
      })()}
    </>
  );
}

/* ============================================================
   SUMMARY FORMATTERS
   ============================================================ */

/* ============================================================
   FASCIA — myofascial line assessment, straight from the same
   FASCIA_REGIONS_DATA / FASCIA_LINES_DATA the old Phase 0.5
   Fascia module renders (2026-09-03, Aditi: "cpa, kinetic chain,
   functional screen, sttt, fascia like in old 0.5 phase does").
   Ortho had no Fascia screen at all before this. Same structure
   as CPA/Kinetic Chain above: coloured region tabs, one card per
   test with its real how-to/treatment in the (i) sheet, and the
   test's own colour-coded options — each option carrying the
   clinical meaning the data itself defines.
   ============================================================ */
function fasciaRichItem(t) {
  const line = FASCIA_LINES_DATA[String(t.line || "").toLowerCase()];
  return {
    title: t.label,
    subtitle: [t.line, t.type].filter(Boolean).join(" · "),
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
    reference: line && (
      <>
        <InfoCard icon="🧵" label={`${line.label} — route`} tint="blue">{line.route}</InfoCard>
        {line.restrictions && <InfoCard icon="⚠️" label="Common restrictions" tint="amber">{line.restrictions}</InfoCard>}
        {line.compensation && <InfoCard icon="⛓️" label="Compensation pattern" tint="gray">{line.compensation}</InfoCard>}
      </>
    ),
    interpret: t.treatment && <InfoCard icon="🎯" label="Treatment" tint="green">{t.treatment}</InfoCard>,
  };
}

function fasciaCount(entry, tests) {
  if (!entry) return 0;
  return (tests || []).filter((t) => entry[t.id]).length;
}

export function FasciaSection({ data, setData, sectionKey = "fascia" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, FASCIA_REGION_KEYS);
  const region = FASCIA_REGIONS_DATA[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  FASCIA_REGION_KEYS.forEach((k) => (counts[k] = fasciaCount(d[k], FASCIA_REGIONS_DATA[k]?.tests)));
  const selectedMeaning = (t) => (t.options || []).find((o) => o.val === entry[t.id])?.meaning;

  return (
    <>
      <SectionIntro icon="🧵" title="Fascia" info="Myofascial line assessment: fascia transmits force along continuous lines, so a restriction in one segment shows up as symptoms further along the chain. Screen globally first, then test the line the pattern points to." />
      <ColorRegionTabs tabs={FASCIA_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={FASCIA_REGIONS_DATA} counts={counts} />
      {region?.intro && <Hint>{region.intro}</Hint>}
      <div className="rom-card">
        <div className="rom-card-title">{region?.label || activeKey}</div>
        {(region?.tests || []).map((t) => (
          <div className="movement-card" key={t.id}>
            <div className="movement-name-row">
              <span className="movement-name">{t.label}</span>
              <InfoButton title={t.label} richItem={fasciaRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{[t.line, t.type].filter(Boolean).join(" · ")}</div>
            <OptionChips options={t.options || []} value={entry[t.id]} onChange={(v) => set(activeKey, { ...entry, [t.id]: v })} />
            {selectedMeaning(t) && <div className="obj-card-reason">{selectedMeaning(t)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

export function formatFasciaSection(sectionData) {
  const rows = [];
  FASCIA_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    (FASCIA_REGIONS_DATA[k]?.tests || []).forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${FASCIA_REGIONS_DATA[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatKineticChainSection(sectionData) {
  const rows = [];
  KC_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    KC_REGIONS[k].tests.forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${KC_REGIONS[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatCpaSection(sectionData) {
  const rows = [];
  NKT_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    NKT_REGIONS[k].tests.forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${NKT_REGIONS[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatSttSection(sectionData) {
  const rows = [];
  CYRIAX_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    const region = CYRIAX_REGIONS_DATA[k];
    ["activeROM", "passiveROM", "resistedTests", "jointPlay"].forEach((tab) => {
      (region[tab] || []).forEach((t) => {
        Object.keys(entry).forEach((key) => {
          if (!key.startsWith(t.id + "_") || !entry[key]) return;
          const field = key.slice(t.id.length + 1);
          rows.push({ label: `${region.label} — ${t.label} (${field})`, value: entry[key] });
        });
      });
    });
    if (entry.reasoningNotes) rows.push({ label: `${region.label} — Reasoning notes`, value: entry.reasoningNotes });
  });
  return rows;
}

// Was: only the bare top-level grade (Normal/Compensated/Abnormal) made it
// into the Summary/Review and any exported report -- the per-observation
// answer and its clinical clue (e.g. "⚠ Pain at initiation — Discogenic /
// SIJ loading — centralisation test"), visible while filling the form,
// never carried through (2026-09-03, Aditi: "previously it shows what it
// means if anything in the four options we selected... give me back the
// interpretation"). Now every answered observation gets its own row with
// the selected finding and its clue, not just the summary grade.
export function formatFmaSection(sectionData) {
  const rows = [];
  FMA_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    (FMA_DATA[k] || []).forEach((t) => {
      const grade = entry[t.id + "_grade"];
      if (grade) rows.push({ label: `${k} — ${t.label}`, value: grade });
      (t.observations || []).forEach((obs) => {
        const val = entry[t.id + "_" + obs.id];
        if (!val) return;
        const idx = obs.opts.indexOf(val);
        const clue = idx > 0 ? obs.clues[idx] : "";
        rows.push({ label: `${k} — ${t.label} — ${obs.q}`, value: clue ? `${val} — ${clue}` : val });
      });
    });
  });
  return rows;
}
