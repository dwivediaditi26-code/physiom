// ─── Interactive Body Chart ────────────────────────────────────────────────────
// Uses the 4-view anatomical body chart image (Cloudinary: body-chart)
// Click/tap anywhere → detects body region → places colored marker

const BODY_CHART_IMG = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/body-chart";

const SYMPTOM_TYPES = [
  { id:"pain",     label:"Pain",      color:"#EF4444", symbol:"✕", bg:"#FEF2F2" },
  { id:"referred", label:"Referred",  color:"#F97316", symbol:"○", bg:"#FFF7ED" },
  { id:"numb",     label:"Numbness",  color:"#3B82F6", symbol:"≡", bg:"#EFF6FF" },
  { id:"tingling", label:"Tingling",  color:"#EAB308", symbol:"~", bg:"#FEFCE8" },
  { id:"stiff",    label:"Stiffness", color:"#8B5CF6", symbol:"◆", bg:"#F5F3FF" },
];

// The image has 4 views side by side (each ~25% width):
// 0-25%: Anterior | 25-50%: Left Lateral | 50-75%: Right Lateral | 75-100%: Posterior
function getViewFromX(xPct) {
  if (xPct < 25)  return "anterior";
  if (xPct < 50)  return "left";
  if (xPct < 75)  return "right";
  return "posterior";
}

// Within each view, normalise x to 0-100% of that view
function getLocalX(xPct) {
  const view = getViewFromX(xPct);
  const offsets = { anterior:0, left:25, right:50, posterior:75 };
  return ((xPct - offsets[view]) / 25) * 100;
}

function getBodyRegionFromChart(xPct, yPct) {
  const view = getViewFromX(xPct);
  const lx   = getLocalX(xPct);
  const y    = yPct;

  // Each view occupies full height. Body figure is centred within each quadrant.
  // The figure runs roughly y: 2%–98%, centred around x: 50% of each view.
  // Lateral views: figure shifted slightly (centre ~45%)

  // ── Y bands (same for all views) ──────────────────────────────────────────
  if (y < 8)  return { region:"Head",           view };
  if (y < 14) return { region:"Neck",            view };

  if (view === "anterior" || view === "posterior") {
    // Frontal views: bilateral
    const isLeft  = lx < 45;
    const isRight = lx > 55;
    const mid     = !isLeft && !isRight;

    if (y < 24) {
      if (lx < 28 || lx > 72) return { region: lx<50 ? "Left Shoulder":"Right Shoulder", view };
      return { region: view==="anterior" ? "Upper Chest":"Upper Thoracic Spine", view };
    }
    if (y < 34) {
      if (lx < 26 || lx > 74) return { region: lx<50 ? "Left Upper Arm":"Right Upper Arm", view };
      return { region: view==="anterior" ? "Chest / Ribs":"Mid Thoracic Spine", view };
    }
    if (y < 44) {
      if (lx < 24 || lx > 76) return { region: lx<50 ? "Left Forearm":"Right Forearm", view };
      return { region: view==="anterior" ? "Abdomen":"Lower Thoracic Spine", view };
    }
    if (y < 54) {
      if (lx < 22 || lx > 78) return { region: lx<50 ? "Left Hand / Wrist":"Right Hand / Wrist", view };
      return { region: view==="anterior" ? "Lower Abdomen":"Lumbar Spine", view };
    }
    if (y < 62) return { region: view==="anterior" ? (lx<50?"Left Groin":"Right Groin"):(lx<50?"Left SIJ":"Right SIJ"), view };
    if (y < 68) return { region: view==="anterior" ? (lx<50?"Left Hip":"Right Hip"):"Gluteal / Sacrum", view };
    if (y < 78) return { region: lx<50 ? "Left Thigh":"Right Thigh", view };
    if (y < 85) return { region: lx<50 ? "Left Knee":"Right Knee",   view };
    if (y < 93) return { region: lx<50 ? "Left Calf":"Right Calf",   view };
    return        { region: lx<50 ? "Left Ankle / Foot":"Right Ankle / Foot", view };
  }

  // Lateral views (single side — figure faces right for left-lateral, left for right-lateral)
  const side = view === "left" ? "Left" : "Right";
  if (y < 24) return { region:`${side} Shoulder`, view };
  if (y < 34) return { region:`${side} Upper Arm`, view };
  if (y < 44) return { region: lx < 55 ? "Chest / Thoracic Spine" : `${side} Forearm`, view };
  if (y < 56) return { region: lx < 55 ? "Lumbar Spine / Abdomen" : `${side} Hand / Wrist`, view };
  if (y < 63) return { region:`${side} Hip`, view };
  if (y < 72) return { region:`${side} Thigh (${view==="left"?"L":"R"})`, view };
  if (y < 80) return { region:`${side} Knee`,  view };
  if (y < 90) return { region:`${side} Calf`,  view };
  return        { region:`${side} Ankle / Foot`, view };
}

export function BodyChartInteractive({ data, set, compact = false }) {
  const { useState, useRef, useCallback } = React;
  const markers    = Array.isArray(data.body_chart) ? data.body_chart : [];
  const [active, setActive]   = useState("pain");
  const [tooltip, setTooltip] = useState(null); // { x, y, region, view }
  const [imgLoaded, setImgLoaded] = useState(false);
  const containerRef = useRef(null);

  const handleClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width)  * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;
    const { region, view } = getBodyRegionFromChart(xPct, yPct);

    // Toggle off existing marker of same region+type
    const existing = markers.find(m => m.region === region && m.type === active);
    if (existing) {
      set("body_chart", markers.filter(m => m.id !== existing.id));
      setTooltip(null);
      return;
    }

    const newMarker = {
      id: Date.now().toString(36),
      x: xPct, y: yPct,
      view, region,
      type: active,
      timestamp: new Date().toISOString(),
    };
    set("body_chart", [...markers, newMarker]);
    setTooltip({ x: xPct, y: yPct, region, view });
    setTimeout(() => setTooltip(null), 2000);
  }, [markers, active, set]);

  const activeType = SYMPTOM_TYPES.find(t => t.id === active);

  if (compact) {
    // Compact read-only view for patient profile
    return (
      <div style={{ position:"relative", width:"100%", userSelect:"none" }}>
        <img src={BODY_CHART_IMG} alt="Body Chart" style={{ width:"100%", display:"block", borderRadius:8 }}
          onError={e=>{ e.target.style.opacity="0.3"; }} />
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          {markers.map(m => {
            const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
            return (
              <g key={m.id}>
                <circle cx={m.x} cy={m.y} r="2.5" fill={t.color} opacity="0.9"/>
                <text x={m.x} y={m.y + 0.8} textAnchor="middle" fontSize="2.5"
                  fontWeight="bold" fill="white">{t.symbol}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"inherit" }}>
      {/* Symptom type selector */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
        {SYMPTOM_TYPES.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{
              padding:"5px 11px", borderRadius:20, border:`2px solid ${active===t.id ? t.color : "#E5E7EB"}`,
              background: active===t.id ? t.bg : "#F9FAFB",
              color: active===t.id ? t.color : "#6B7280",
              fontWeight: active===t.id ? 800 : 500,
              fontSize:"0.72rem", cursor:"pointer", display:"flex", alignItems:"center", gap:5,
              transition:"all 0.15s",
            }}>
            <span style={{ fontSize:"1rem", lineHeight:1 }}>{t.symbol}</span>
            {t.label}
          </button>
        ))}
        {markers.length > 0 && (
          <button onClick={() => set("body_chart", [])}
            style={{ padding:"5px 11px", borderRadius:20, border:"1px solid #FCA5A5",
              background:"#FEF2F2", color:"#EF4444", fontSize:"0.72rem", cursor:"pointer", marginLeft:"auto" }}>
            Clear all
          </button>
        )}
      </div>

      {/* Instruction */}
      <div style={{ fontSize:"0.65rem", color:"#9CA3AF", marginBottom:7, textAlign:"center" }}>
        Tap body area to mark <strong style={{color:activeType?.color}}>{activeType?.label}</strong> · Tap again to remove
      </div>

      {/* Chart container */}
      <div ref={containerRef} onClick={handleClick}
        style={{ position:"relative", width:"100%", cursor:"crosshair",
          borderRadius:12, overflow:"hidden", background:"#000",
          border:"1.5px solid #E5E7EB", userSelect:"none" }}>

        <img src={BODY_CHART_IMG} alt="Body Chart"
          style={{ width:"100%", display:"block", opacity: imgLoaded ? 1 : 0, transition:"opacity 0.3s" }}
          onLoad={() => setImgLoaded(true)}
          onError={e => { e.target.style.opacity="0.2"; setImgLoaded(true); }} />

        {!imgLoaded && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
            justifyContent:"center", color:"#9CA3AF", fontSize:"0.75rem" }}>
            Loading body chart…
          </div>
        )}

        {/* View labels */}
        {[["Anterior","3%"],["Left Lat","28%"],["Right Lat","53%"],["Posterior","78%"]].map(([lbl,left]) => (
          <div key={lbl} style={{ position:"absolute", top:4, left, fontSize:"0.55rem",
            fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.5px",
            textTransform:"uppercase", pointerEvents:"none" }}>
            {lbl}
          </div>
        ))}

        {/* Markers SVG overlay */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          {markers.map(m => {
            const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
            return (
              <g key={m.id}>
                <circle cx={m.x} cy={m.y} r="2.2" fill={t.color} opacity="0.92"
                  stroke="white" strokeWidth="0.5"/>
                <text x={m.x} y={m.y+0.9} textAnchor="middle" fontSize="2.2"
                  fontWeight="bold" fill="white" style={{pointerEvents:"none"}}>{t.symbol}</text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip on click */}
        {tooltip && (
          <div style={{
            position:"absolute",
            left:`${Math.min(tooltip.x, 75)}%`,
            top:`${Math.max(tooltip.y - 12, 2)}%`,
            background:"rgba(0,0,0,0.85)",
            color:"#fff", padding:"4px 9px", borderRadius:8,
            fontSize:"0.65rem", fontWeight:700, whiteSpace:"nowrap",
            pointerEvents:"none", zIndex:10,
            border:`1px solid ${activeType?.color}`,
          }}>
            {activeType?.symbol} {tooltip.region}
          </div>
        )}
      </div>

      {/* Marker list */}
      {markers.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#6B7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
            Marked areas ({markers.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {markers.map(m => {
              const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
              return (
                <div key={m.id}
                  onClick={() => set("body_chart", markers.filter(x => x.id !== m.id))}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                    borderRadius:20, background:t.bg, border:`1px solid ${t.color}40`,
                    fontSize:"0.68rem", fontWeight:600, color:t.color, cursor:"pointer" }}>
                  <span>{t.symbol}</span>
                  <span style={{color:"#374151"}}>{m.region}</span>
                  <span style={{color:"#9CA3AF",fontSize:"0.55rem"}}>✕</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
