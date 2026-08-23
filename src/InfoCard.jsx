import { useState } from "react";

/**
 * InfoCard — one reusable ⓘ learning-card shell.
 *
 * Usage:
 *   const [activeCard, setActiveCard] = useState(null);
 *   <button onClick={() => setActiveCard(cardioData.jvp)}>ⓘ</button>
 *   {activeCard && <InfoCard data={activeCard} onClose={() => setActiveCard(null)} />}
 *
 * This component never changes as you add tests. Every test's content
 * lives in a plain data object (see cardioPulmonaryData.js for the shape).
 */
export default function InfoCard({ data, onClose }) {
  const [tab, setTab] = useState(0);

  if (!data) return null;

  return (
    <div style={s.dim} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.head}>
          <div style={s.titleWrap}>
            <div style={s.iconBox}>{data.icon}</div>
            <div>
              <div style={s.kicker}>{data.category}</div>
              <div style={s.title}>{data.title}</div>
            </div>
          </div>
          <div style={s.closeX} onClick={onClose}>✕</div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {["Perform", data.scaleLabel || "Scale", "Interpret"].map((label, i) => (
            <div
              key={label}
              onClick={() => setTab(i)}
              style={{ ...s.tab, ...(tab === i ? s.tabOn : {}) }}
            >
              <span style={{ ...s.tabNum, ...(tab === i ? s.tabNumOn : {}) }}>{i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={s.body}>
          {tab === 0 && <PerformPane perform={data.perform} />}
          {tab === 1 && <ScalePane scale={data.scale} />}
          {tab === 2 && <InterpretPane interpret={data.interpret} />}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={s.dots}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ ...s.dot, ...(tab === i ? s.dotOn : {}) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Pane renderers ---------- */

function PerformPane({ perform }) {
  return (
    <>
      {/* Image slot — pass perform.image as a URL/import once you have real
          photos or illustrations; until then it shows a placeholder so the
          layout never has to change when you add one. */}
      {perform.image ? (
        <div style={s.illusImg}>
          <img src={perform.image} alt={perform.caption || ""} style={s.illusImgTag} />
          {perform.caption && <div style={s.illusImgCap}>{perform.caption}</div>}
        </div>
      ) : (
        <div style={s.illus}>
          <div style={s.illusPlaceholder}>
            <div style={s.illusPlaceholderIcon}>🖼️</div>
            <div style={s.illusCap}>{perform.caption || "Add position/technique image"}</div>
          </div>
        </div>
      )}
      {perform.boxes.map((b, i) => (
        <div key={i} style={{ ...s.box, ...(toneStyle[b.tone] || {}) }}>
          <div style={{ ...s.boxLabel, ...(toneLabelStyle[b.tone] || {}) }}>{b.label}</div>
          <div style={s.boxBody}>{b.text}</div>
        </div>
      ))}
    </>
  );
}

function ScalePane({ scale }) {
  if (scale.type === "meter") {
    return (
      <>
        <div style={s.meter} />
        {scale.rows.map((r, i) => (
          <div key={i} style={s.gradeRow}>
            <div style={{ ...s.gradeChip, background: r.color }}>{r.chip}</div>
            <div>
              <div style={s.gradeName}>{r.name}</div>
              <div style={s.gradeDesc}>{r.desc}</div>
            </div>
          </div>
        ))}
      </>
    );
  }
  // table
  return (
    <>
      {scale.rows.map((r, i) => (
        <div key={i} style={s.tblRow}>
          <div style={s.tblKey}>{r.k}</div>
          <div style={s.tblVal}>{r.v}</div>
        </div>
      ))}
    </>
  );
}

function InterpretPane({ interpret }) {
  return (
    <>
      <div style={{ ...s.interpCard, ...s.interpNormal }}>
        <div style={{ ...s.interpLabel, color: "#16A34A" }}>✓ Normal</div>
        <ul style={s.bullets}>
          {interpret.normal.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
      <div style={{ ...s.interpCard, ...s.interpAbn }}>
        <div style={{ ...s.interpLabel, color: "#E9484B" }}>⚠ Abnormal</div>
        <ul style={s.bullets}>
          {interpret.abnormal.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
      {interpret.redFlags && interpret.redFlags.length > 0 && (
        <div style={{ ...s.interpCard, ...s.interpRedFlag }}>
          <div style={{ ...s.interpLabel, color: "#B91C1C" }}>🚩 Red flags</div>
          <ul style={s.bullets}>
            {interpret.redFlags.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}
      <div style={{ ...s.box, ...toneStyle.purple }}>
        <div style={{ ...s.boxLabel, ...toneLabelStyle.purple }}>🔎 Clinical note</div>
        <div style={s.boxBody}>{interpret.note}</div>
      </div>
    </>
  );
}

/* ---------- Design tokens (inline styles — drop-in, no CSS file needed) ---------- */

const PURPLE = "#7C3AED", PURPLE_DEEP = "#5B21B6", PURPLE_TINT = "#F3EEFF", PURPLE_TINT2 = "#EDE4FF";
const INK = "#1F2333", MUTED = "#6B7280", LINE = "#ECE9F5";

const toneStyle = {
  blue: { background: "#EAF1FF", borderColor: "#DCE8FF" },
  amber: { background: "#FFF6E5", borderColor: "#FBE7B8" },
  purple: { background: PURPLE_TINT, borderColor: "#E2D4FB" },
};
const toneLabelStyle = {
  blue: { color: "#2F6FED" },
  amber: { color: "#B4740A" },
  purple: { color: PURPLE_DEEP },
};

const s = {
  dim: { position: "fixed", inset: 0, background: "rgba(20,10,45,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  sheet: { width: "60vw", height: "60vh", maxWidth: 480, maxHeight: 640, minWidth: 300, minHeight: 380, background: "#fff", borderRadius: 22, boxShadow: "0 24px 60px rgba(40,10,90,.35)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" },
  titleWrap: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  iconBox: { width: 28, height: 28, borderRadius: 9, flex: "none", background: `linear-gradient(140deg, ${PURPLE}, #A855F7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 },
  kicker: { fontSize: 9, fontWeight: 800, letterSpacing: ".06em", color: PURPLE, textTransform: "uppercase" },
  title: { fontSize: 15, fontWeight: 800, color: INK, marginTop: 1 },
  closeX: { width: 24, height: 24, borderRadius: "50%", background: "#F5F3FA", color: "#8B84A6", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  tabs: { display: "flex", gap: 4, margin: "0 14px 8px", background: PURPLE_TINT, borderRadius: 10, padding: 3 },
  tab: { flex: 1, textAlign: "center", padding: "7px 3px", borderRadius: 8, fontSize: 10.5, fontWeight: 700, color: PURPLE_DEEP, opacity: 0.55, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" },
  tabOn: { background: "#fff", opacity: 1, boxShadow: "0 2px 6px rgba(90,30,180,.14)" },
  tabNum: { width: 14, height: 14, borderRadius: "50%", background: "#D9CCF7", color: "#fff", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" },
  tabNumOn: { background: PURPLE },
  body: { flex: 1, overflowY: "auto", padding: "2px 14px 14px" },
  illus: { minHeight: 90, borderRadius: 12, marginBottom: 9, background: "linear-gradient(135deg, #F4EEFF, #EAF1FF)", border: `1.5px dashed #D9CCF7`, display: "flex", alignItems: "center", justifyContent: "center" },
  illusPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  illusPlaceholderIcon: { fontSize: 20, opacity: 0.6 },
  illusCap: { fontSize: 10, color: PURPLE_DEEP, fontWeight: 700, textAlign: "center", padding: "0 12px" },
  illusImg: { borderRadius: 12, marginBottom: 9, border: `1px solid ${LINE}`, overflow: "hidden", background: "#FAF9FD" },
  illusImgTag: { width: "100%", maxHeight: 160, objectFit: "cover", display: "block" },
  illusImgCap: { fontSize: 9.5, color: MUTED, textAlign: "center", padding: "5px 8px" },
  box: { background: "#FAF9FD", border: `1px solid ${LINE}`, borderRadius: 12, padding: "9px 10px", marginBottom: 8 },
  boxLabel: { fontSize: 8.5, fontWeight: 800, letterSpacing: ".05em", color: PURPLE, textTransform: "uppercase", marginBottom: 3 },
  boxBody: { fontSize: 11, color: INK, lineHeight: 1.45 },
  gradeRow: { display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: `1px solid ${LINE}` },
  gradeChip: { minWidth: 28, height: 22, padding: "0 5px", borderRadius: 6, color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" },
  gradeName: { fontSize: 10.5, fontWeight: 700, color: INK },
  gradeDesc: { fontSize: 9, color: MUTED },
  meter: { height: 7, borderRadius: 5, margin: "8px 0 3px", background: "linear-gradient(90deg, #E9484B 0%, #F59E0B 30%, #16A34A 55%, #F59E0B 78%, #E9484B 100%)" },
  tblRow: { display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: `1px solid ${LINE}`, fontSize: 10.5 },
  tblKey: { fontWeight: 800, color: PURPLE_DEEP, flex: "none", width: "38%" },
  tblVal: { color: INK, textAlign: "right" },
  interpCard: { borderRadius: 12, padding: "9px 10px", marginBottom: 8 },
  interpNormal: { background: "#EAFBF1", border: "1px solid #CDEFD9" },
  interpAbn: { background: "#FDECEC", border: "1px solid #F7D3D3" },
  interpRedFlag: { background: "#FEE2E2", border: "1.5px solid #FCA5A5" },
  interpLabel: { fontSize: 8.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 4 },
  bullets: { margin: 0, paddingLeft: 14, fontSize: 10, color: INK, lineHeight: 1.55 },
  footer: { padding: "8px 14px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${LINE}` },
  dots: { display: "flex", gap: 5 },
  dot: { width: 5, height: 5, borderRadius: "50%", background: "#E3DEF0" },
  dotOn: { width: 14, background: PURPLE },
  nextBtn: { background: `linear-gradient(135deg, ${PURPLE}, #9333EA)`, color: "#fff", fontWeight: 800, fontSize: 11, padding: "8px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 6px 14px -6px rgba(124,58,237,.55)", border: "none", cursor: "pointer" },
};
