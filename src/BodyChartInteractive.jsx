// ─── Interactive Body Chart — SVG embedded, 4 views ───────────────────────────

const SYMPTOM_TYPES = [
  { id:"pain",     label:"Pain",      color:"#EF4444", symbol:"✕", bg:"#FEF2F2" },
  { id:"referred", label:"Referred",  color:"#F97316", symbol:"○", bg:"#FFF7ED" },
  { id:"numb",     label:"Numbness",  color:"#3B82F6", symbol:"≡", bg:"#EFF6FF" },
  { id:"tingling", label:"Tingling",  color:"#EAB308", symbol:"~", bg:"#FEFCE8" },
  { id:"stiff",    label:"Stiffness", color:"#8B5CF6", symbol:"◆", bg:"#F5F3FF" },
];

// Each zone: { id, label, view, path (SVG path data in 0-100 coordinate space per view) }
// ViewBox per view: 0 0 60 200
const ZONES = {
  anterior: [
    { id:"a_head",    label:"Head",             d:"M20,2 Q30,-2 40,2 Q46,6 46,18 Q46,28 30,30 Q14,28 14,18 Q14,6 20,2Z" },
    { id:"a_neck",    label:"Neck",             d:"M24,30 Q30,28 36,30 L37,40 Q30,42 23,40Z" },
    { id:"a_lsh",     label:"Left Shoulder",    d:"M23,40 Q16,40 10,46 L8,56 Q14,52 22,50Z" },
    { id:"a_rsh",     label:"Right Shoulder",   d:"M37,40 Q44,40 50,46 L52,56 Q46,52 38,50Z" },
    { id:"a_chest",   label:"Chest / Ribs",     d:"M22,40 L38,40 L40,68 L20,68Z" },
    { id:"a_larm",    label:"Left Upper Arm",   d:"M8,56 L14,52 L16,76 L10,78Z" },
    { id:"a_rarm",    label:"Right Upper Arm",  d:"M52,56 L46,52 L44,76 L50,78Z" },
    { id:"a_lfarm",   label:"Left Forearm",     d:"M10,78 L16,76 L15,98 L9,98Z" },
    { id:"a_rfarm",   label:"Right Forearm",    d:"M50,78 L44,76 L45,98 L51,98Z" },
    { id:"a_lhand",   label:"Left Hand/Wrist",  d:"M9,98 L15,98 L14,112 L8,112Z" },
    { id:"a_rhand",   label:"Right Hand/Wrist", d:"M51,98 L45,98 L46,112 L52,112Z" },
    { id:"a_abd",     label:"Abdomen",          d:"M20,68 L40,68 L40,90 L20,90Z" },
    { id:"a_pelvis",  label:"Pelvis",           d:"M18,90 L42,90 L44,106 L16,106Z" },
    { id:"a_lhip",    label:"Left Hip",         d:"M16,106 L30,106 L29,120 L14,118Z" },
    { id:"a_rhip",    label:"Right Hip",        d:"M30,106 L44,106 L46,118 L31,120Z" },
    { id:"a_lthigh",  label:"Left Thigh",       d:"M14,118 L29,120 L27,148 L12,146Z" },
    { id:"a_rthigh",  label:"Right Thigh",      d:"M31,120 L46,118 L48,146 L33,148Z" },
    { id:"a_lknee",   label:"Left Knee",        d:"M12,146 L27,148 L26,160 L11,158Z" },
    { id:"a_rknee",   label:"Right Knee",       d:"M33,148 L48,146 L49,158 L34,160Z" },
    { id:"a_lcalf",   label:"Left Calf",        d:"M11,158 L26,160 L25,186 L10,184Z" },
    { id:"a_rcalf",   label:"Right Calf",       d:"M34,160 L49,158 L50,184 L35,186Z" },
    { id:"a_lfoot",   label:"Left Ankle/Foot",  d:"M10,184 L25,186 L22,196 L7,194Z" },
    { id:"a_rfoot",   label:"Right Ankle/Foot", d:"M35,186 L50,184 L53,194 L38,196Z" },
  ],
  left: [
    { id:"l_head",   label:"Head",              d:"M20,2 Q36,0 40,12 Q42,24 30,30 Q18,28 18,18 Q16,8 20,2Z" },
    { id:"l_neck",   label:"Neck",              d:"M26,30 Q34,28 36,30 L34,42 Q28,44 24,42Z" },
    { id:"l_sh",     label:"Left Shoulder",     d:"M26,40 L40,42 L42,58 L24,56Z" },
    { id:"l_chest",  label:"Chest/Thoracic",    d:"M20,56 L42,58 L40,90 L18,88Z" },
    { id:"l_arm",    label:"Left Upper Arm",    d:"M40,42 L50,46 L52,72 L42,74Z" },
    { id:"l_farm",   label:"Left Forearm",      d:"M42,74 L52,72 L52,96 L42,98Z" },
    { id:"l_hand",   label:"Left Hand/Wrist",   d:"M42,98 L52,96 L52,112 L42,112Z" },
    { id:"l_lumb",   label:"Lumbar Spine",      d:"M18,88 L40,90 L38,110 L16,108Z" },
    { id:"l_hip",    label:"Left Hip",          d:"M16,108 L38,110 L36,126 L14,124Z" },
    { id:"l_thigh",  label:"Left Thigh",        d:"M14,124 L36,126 L34,154 L12,152Z" },
    { id:"l_knee",   label:"Left Knee",         d:"M12,152 L34,154 L33,166 L11,164Z" },
    { id:"l_calf",   label:"Left Calf",         d:"M11,164 L33,166 L32,188 L10,186Z" },
    { id:"l_foot",   label:"Left Ankle/Foot",   d:"M10,186 L32,188 L34,198 L8,196Z" },
  ],
  right: [
    { id:"r_head",   label:"Head",              d:"M20,2 Q36,0 40,12 Q42,24 30,30 Q18,28 18,18 Q16,8 20,2Z" },
    { id:"r_neck",   label:"Neck",              d:"M24,30 Q32,28 34,30 L34,42 Q28,44 24,42Z" },
    { id:"r_sh",     label:"Right Shoulder",    d:"M20,40 L34,42 L36,58 L18,56Z" },
    { id:"r_chest",  label:"Chest/Thoracic",    d:"M18,56 L40,58 L42,90 L20,88Z" },
    { id:"r_arm",    label:"Right Upper Arm",   d:"M10,46 L20,42 L18,74 L8,72Z" },
    { id:"r_farm",   label:"Right Forearm",     d:"M8,72 L18,74 L18,98 L8,96Z" },
    { id:"r_hand",   label:"Right Hand/Wrist",  d:"M8,96 L18,98 L18,112 L8,112Z" },
    { id:"r_lumb",   label:"Lumbar Spine",      d:"M20,88 L42,90 L44,110 L22,108Z" },
    { id:"r_hip",    label:"Right Hip",         d:"M22,108 L44,110 L46,126 L24,124Z" },
    { id:"r_thigh",  label:"Right Thigh",       d:"M24,124 L46,126 L48,154 L26,152Z" },
    { id:"r_knee",   label:"Right Knee",        d:"M26,152 L48,154 L49,166 L27,164Z" },
    { id:"r_calf",   label:"Right Calf",        d:"M27,164 L49,166 L50,188 L28,186Z" },
    { id:"r_foot",   label:"Right Ankle/Foot",  d:"M28,186 L50,188 L52,198 L26,196Z" },
  ],
  posterior: [
    { id:"p_head",   label:"Head",              d:"M20,2 Q30,-2 40,2 Q46,6 46,18 Q46,28 30,30 Q14,28 14,18 Q14,6 20,2Z" },
    { id:"p_neck",   label:"Neck",              d:"M24,30 Q30,28 36,30 L37,40 Q30,42 23,40Z" },
    { id:"p_lsh",    label:"Left Shoulder",     d:"M23,40 Q16,40 10,46 L8,56 Q14,52 22,50Z" },
    { id:"p_rsh",    label:"Right Shoulder",    d:"M37,40 Q44,40 50,46 L52,56 Q46,52 38,50Z" },
    { id:"p_upper",  label:"Upper Thoracic",    d:"M22,40 L38,40 L39,62 L21,62Z" },
    { id:"p_larm",   label:"Left Upper Arm",    d:"M8,56 L14,52 L16,76 L10,78Z" },
    { id:"p_rarm",   label:"Right Upper Arm",   d:"M52,56 L46,52 L44,76 L50,78Z" },
    { id:"p_lfarm",  label:"Left Forearm",      d:"M10,78 L16,76 L15,98 L9,98Z" },
    { id:"p_rfarm",  label:"Right Forearm",     d:"M50,78 L44,76 L45,98 L51,98Z" },
    { id:"p_lhand",  label:"Left Hand/Wrist",   d:"M9,98 L15,98 L14,112 L8,112Z" },
    { id:"p_rhand",  label:"Right Hand/Wrist",  d:"M51,98 L45,98 L46,112 L52,112Z" },
    { id:"p_mid",    label:"Mid Thoracic",      d:"M21,62 L39,62 L40,80 L20,80Z" },
    { id:"p_lumb",   label:"Lumbar Spine",      d:"M20,80 L40,80 L41,96 L19,96Z" },
    { id:"p_sij",    label:"SIJ / Sacrum",      d:"M19,96 L41,96 L42,110 L18,110Z" },
    { id:"p_lglut",  label:"Left Gluteal",      d:"M18,110 L30,110 L29,126 L14,124Z" },
    { id:"p_rglut",  label:"Right Gluteal",     d:"M30,110 L42,110 L46,124 L31,126Z" },
    { id:"p_lthigh", label:"Left Thigh",        d:"M14,124 L29,126 L27,152 L12,150Z" },
    { id:"p_rthigh", label:"Right Thigh",       d:"M31,126 L46,124 L48,150 L33,152Z" },
    { id:"p_lknee",  label:"Left Knee",         d:"M12,150 L27,152 L26,164 L11,162Z" },
    { id:"p_rknee",  label:"Right Knee",        d:"M33,152 L48,150 L49,162 L34,164Z" },
    { id:"p_lcalf",  label:"Left Calf",         d:"M11,162 L26,164 L25,188 L10,186Z" },
    { id:"p_rcalf",  label:"Right Calf",        d:"M34,164 L49,162 L50,186 L35,188Z" },
    { id:"p_lfoot",  label:"Left Ankle/Foot",   d:"M10,186 L25,188 L22,198 L7,196Z" },
    { id:"p_rfoot",  label:"Right Ankle/Foot",  d:"M35,188 L50,186 L53,196 L38,198Z" },
  ],
};

const VIEWS = [
  { key:"anterior",  label:"Anterior" },
  { key:"left",      label:"Left Lat" },
  { key:"right",     label:"Right Lat" },
  { key:"posterior", label:"Posterior" },
];

function BodyView({ viewKey, markers, activeType, onZoneClick, hovered, setHovered }) {
  const zones  = ZONES[viewKey] || [];
  const mSet   = new Set(markers.filter(m=>m.view===viewKey).map(m=>m.zoneId));

  return (
    <svg viewBox="0 0 60 200" style={{ flex:1, cursor:"pointer", background:"#0a0a0a" }}
      xmlns="http://www.w3.org/2000/svg">
      {/* View label */}
      <text x="30" y="8" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)"
        fontWeight="bold" style={{textTransform:"uppercase",letterSpacing:"0.5px"}}>
        {VIEWS.find(v=>v.key===viewKey)?.label}
      </text>

      {zones.map(z => {
        const isMarked  = mSet.has(z.id);
        const marker    = markers.find(m=>m.zoneId===z.id&&m.view===viewKey);
        const mType     = marker ? SYMPTOM_TYPES.find(t=>t.id===marker.type) : null;
        const isHovered = hovered === z.id;
        const fill = isMarked
          ? mType?.color + "60"
          : isHovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.04)";
        const stroke = isMarked ? (mType?.color||"#fff") : "rgba(255,255,255,0.5)";

        return (
          <g key={z.id}
            onClick={() => onZoneClick(z, viewKey)}
            onMouseEnter={() => setHovered(z.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor:"pointer" }}>
            <path d={z.d} fill={fill} stroke={stroke} strokeWidth={isMarked?"1.2":"0.6"}
              style={{transition:"all 0.15s"}}/>
            {isMarked && mType && (
              <text
                x={(() => { const pts=z.d.match(/-?\d+\.?\d*/g).map(Number); const xs=pts.filter((_,i)=>i%2===0); return (Math.min(...xs)+Math.max(...xs))/2; })()}
                y={(() => { const pts=z.d.match(/-?\d+\.?\d*/g).map(Number); const ys=pts.filter((_,i)=>i%2===1); return (Math.min(...ys)+Math.max(...ys))/2+1.2; })()}
                textAnchor="middle" fontSize="4.5" fill={mType.color} fontWeight="bold">
                {mType.symbol}
              </text>
            )}
            {isHovered && !isMarked && (
              <text
                x={(() => { const pts=z.d.match(/-?\d+\.?\d*/g).map(Number); const xs=pts.filter((_,i)=>i%2===0); return (Math.min(...xs)+Math.max(...xs))/2; })()}
                y={(() => { const pts=z.d.match(/-?\d+\.?\d*/g).map(Number); const ys=pts.filter((_,i)=>i%2===1); return (Math.min(...ys)+Math.max(...ys))/2+1.2; })()}
                textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.7)">
                {z.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BodyChartInteractive({ data, set, compact = false }) {
  const { useState } = React;
  const markers = Array.isArray(data.body_chart) ? data.body_chart : [];
  const [active, setActive]   = useState("pain");
  const [hovered, setHovered] = useState(null);
  const [lastClick, setLastClick] = useState(null);

  const activeType = SYMPTOM_TYPES.find(t => t.id === active);

  const handleZoneClick = (zone, viewKey) => {
    const existing = markers.find(m => m.zoneId === zone.id && m.view === viewKey);
    if (existing) {
      set("body_chart", markers.filter(m => m.id !== existing.id));
      setLastClick(null);
    } else {
      const nm = {
        id: Date.now().toString(36), zoneId: zone.id,
        region: zone.label, view: viewKey,
        type: active, timestamp: new Date().toISOString(),
      };
      set("body_chart", [...markers, nm]);
      setLastClick(zone.label);
      setTimeout(() => setLastClick(null), 2000);
    }
  };

  if (compact) {
    return (
      <div style={{ display:"flex", gap:2, background:"#0a0a0a", borderRadius:8, overflow:"hidden", padding:4 }}>
        {VIEWS.map(v => (
          <BodyView key={v.key} viewKey={v.key} markers={markers} activeType={activeType}
            onZoneClick={()=>{}} hovered={null} setHovered={()=>{}}/>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Symptom selector */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
        {SYMPTOM_TYPES.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            padding:"5px 11px", borderRadius:20,
            border:`2px solid ${active===t.id ? t.color : "#E5E7EB"}`,
            background: active===t.id ? t.bg : "#F9FAFB",
            color: active===t.id ? t.color : "#6B7280",
            fontWeight: active===t.id ? 800 : 500,
            fontSize:"0.72rem", cursor:"pointer",
            display:"flex", alignItems:"center", gap:4,
          }}>
            <span style={{fontSize:"0.95rem"}}>{t.symbol}</span>{t.label}
          </button>
        ))}
        {markers.length > 0 && (
          <button onClick={() => set("body_chart", [])} style={{
            marginLeft:"auto", padding:"5px 11px", borderRadius:20,
            border:"1px solid #FCA5A5", background:"#FEF2F2",
            color:"#EF4444", fontSize:"0.72rem", cursor:"pointer",
          }}>Clear all</button>
        )}
      </div>

      {/* Instruction / last clicked */}
      <div style={{ fontSize:"0.65rem", color:"#9CA3AF", marginBottom:6, textAlign:"center", minHeight:16 }}>
        {lastClick
          ? <span style={{color:activeType?.color, fontWeight:700}}>✓ {lastClick} marked</span>
          : <>Tap to mark <strong style={{color:activeType?.color}}>{activeType?.label}</strong> · Tap again to remove</>
        }
      </div>

      {/* 4-view SVG body chart */}
      <div style={{ display:"flex", borderRadius:12, overflow:"hidden",
        border:"1px solid #333", background:"#0a0a0a", gap:1 }}>
        {VIEWS.map(v => (
          <BodyView key={v.key} viewKey={v.key} markers={markers} activeType={activeType}
            onZoneClick={handleZoneClick} hovered={hovered} setHovered={setHovered}/>
        ))}
      </div>

      {/* Marked areas list */}
      {markers.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#6B7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>
            Marked areas ({markers.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {markers.map(m => {
              const t = SYMPTOM_TYPES.find(x=>x.id===m.type)||SYMPTOM_TYPES[0];
              return (
                <div key={m.id} onClick={() => set("body_chart", markers.filter(x=>x.id!==m.id))}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                    borderRadius:20, background:t.bg, border:`1px solid ${t.color}50`,
                    fontSize:"0.68rem", fontWeight:600, color:t.color, cursor:"pointer" }}>
                  <span>{t.symbol}</span>
                  <span style={{color:"#374151"}}>{m.region}</span>
                  <span style={{color:"#9CA3AF",fontSize:"0.55rem",marginLeft:2}}>✕</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
