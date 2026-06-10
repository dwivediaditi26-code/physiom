// BodyChartPro.jsx — Professional Physiotherapy Pain Mapping System
// Upload your anatomical image to Cloudinary with public_id = "body-chart-4view"
// Then it auto-displays as the background. Admin Mode lets you refine polygon positions.

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BODY_IMAGE_URL =
  "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/body-chart-4view";

const SYMPTOM_TYPES = [
  { id:"pain",      label:"Pain",      color:"#ef4444", bg:"rgba(239,68,68,0.30)",   icon:"🔴" },
  { id:"tingling",  label:"Tingling",  color:"#eab308", bg:"rgba(234,179,8,0.30)",   icon:"🟡" },
  { id:"numbness",  label:"Numbness",  color:"#8b5cf6", bg:"rgba(139,92,246,0.30)",  icon:"🟣" },
  { id:"burning",   label:"Burning",   color:"#f97316", bg:"rgba(249,115,22,0.30)",  icon:"🟠" },
  { id:"stiffness", label:"Stiffness", color:"#3b82f6", bg:"rgba(59,130,246,0.30)",  icon:"🔵" },
  { id:"weakness",  label:"Weakness",  color:"#22c55e", bg:"rgba(34,197,94,0.30)",   icon:"🟢" },
  { id:"radiation", label:"Radiation", color:"#ec4899", bg:"rgba(236,72,153,0.30)",  icon:"⚡" },
  { id:"swelling",  label:"Swelling",  color:"#06b6d4", bg:"rgba(6,182,212,0.30)",   icon:"💧" },
];

// ─── ANATOMICAL REGIONS — percentage-based (0-100 on both axes) ─────────────
// Image layout: [Anterior | Left Lateral | Right Lateral | Posterior]
// Each view ≈ 25% of total width. Refine in Admin Mode.
const REGIONS = [
  // ══ ANTERIOR (x: 0–24%) ══════════════════════════════════════════════════
  { id:"ant_head",            view:"anterior",   label:"Head",
    pts:[[8.5,2.5],[15,2.5],[16.5,5.5],[16,12],[14,15],[10,15],[8,12],[7.5,5.5]] },
  { id:"ant_face",            view:"anterior",   label:"Face",
    pts:[[9.5,4.5],[14.5,4.5],[15,8],[14,12.5],[12,13.5],[10,12.5],[9,8]] },
  { id:"ant_neck",            view:"anterior",   label:"Neck",
    pts:[[10,15],[14,15],[14.5,18.5],[9.5,18.5]] },
  { id:"ant_chest",           view:"anterior",   label:"Chest",
    pts:[[7,18],[17,18],[18,21],[18.5,36],[15,37.5],[9,37.5],[5.5,36],[6,21]] },
  { id:"ant_upper_abdomen",   view:"anterior",   label:"Upper Abdomen",
    pts:[[8.5,37.5],[15.5,37.5],[16.5,38],[17,47],[7,47],[7.5,38]] },
  { id:"ant_lower_abdomen",   view:"anterior",   label:"Lower Abdomen",
    pts:[[7.5,47],[17,47],[17,51],[16,58],[13.5,59.5],[10,59.5],[7.5,58],[7,51]] },
  { id:"ant_right_shoulder",  view:"anterior",   label:"Right Shoulder",
    pts:[[2.5,18],[8,18],[7,21],[5,26],[2,23]] },
  { id:"ant_left_shoulder",   view:"anterior",   label:"Left Shoulder",
    pts:[[16.5,18],[21.5,18],[22,23],[19.5,26],[17,21]] },
  { id:"ant_right_arm",       view:"anterior",   label:"Right Arm",
    pts:[[1.5,23],[7.5,23],[8,39],[2.5,39]] },
  { id:"ant_left_arm",        view:"anterior",   label:"Left Arm",
    pts:[[16.5,23],[22.5,23],[21.5,39],[16,39]] },
  { id:"ant_right_elbow",     view:"anterior",   label:"Right Elbow",
    pts:[[2,39],[8,39],[8.5,44],[2.5,44]] },
  { id:"ant_left_elbow",      view:"anterior",   label:"Left Elbow",
    pts:[[16,39],[22,39],[21.5,44],[15.5,44]] },
  { id:"ant_right_forearm",   view:"anterior",   label:"Right Forearm",
    pts:[[2.5,44],[8.5,44],[9,55.5],[3,55.5]] },
  { id:"ant_left_forearm",    view:"anterior",   label:"Left Forearm",
    pts:[[15.5,44],[21.5,44],[21,55.5],[15,55.5]] },
  { id:"ant_right_wrist",     view:"anterior",   label:"Right Wrist",
    pts:[[3,55.5],[9,55.5],[9,60],[3,60]] },
  { id:"ant_left_wrist",      view:"anterior",   label:"Left Wrist",
    pts:[[15,55.5],[21,55.5],[21,60],[15,60]] },
  { id:"ant_right_hand",      view:"anterior",   label:"Right Hand",
    pts:[[1,60],[9.5,60],[9,67],[0.5,67]] },
  { id:"ant_left_hand",       view:"anterior",   label:"Left Hand",
    pts:[[14.5,60],[23,60],[23,67],[14.5,67]] },
  { id:"ant_right_hip",       view:"anterior",   label:"Right Hip",
    pts:[[7.5,58],[13,58],[12.5,65.5],[7,65.5]] },
  { id:"ant_left_hip",        view:"anterior",   label:"Left Hip",
    pts:[[11,58],[16.5,58],[17,65.5],[11.5,65.5]] },
  { id:"ant_right_thigh",     view:"anterior",   label:"Right Thigh",
    pts:[[7,65.5],[12.5,65.5],[12,75],[7,75]] },
  { id:"ant_left_thigh",      view:"anterior",   label:"Left Thigh",
    pts:[[11.5,65.5],[17,65.5],[17,75],[11.5,75]] },
  { id:"ant_right_knee",      view:"anterior",   label:"Right Knee",
    pts:[[7,75],[12,75],[12,79.5],[7,79.5]] },
  { id:"ant_left_knee",       view:"anterior",   label:"Left Knee",
    pts:[[11.5,75],[17,75],[17,79.5],[11.5,79.5]] },
  { id:"ant_right_leg",       view:"anterior",   label:"Right Leg",
    pts:[[7,79.5],[12,79.5],[12,90],[7,90]] },
  { id:"ant_left_leg",        view:"anterior",   label:"Left Leg",
    pts:[[12,79.5],[17,79.5],[17,90],[12,90]] },
  { id:"ant_right_ankle",     view:"anterior",   label:"Right Ankle",
    pts:[[7,90],[12,90],[12,94],[7,94]] },
  { id:"ant_left_ankle",      view:"anterior",   label:"Left Ankle",
    pts:[[12,90],[17,90],[17,94],[12,94]] },
  { id:"ant_right_foot",      view:"anterior",   label:"Right Foot",
    pts:[[6,94],[12.5,94],[12,98.5],[5,98.5]] },
  { id:"ant_left_foot",       view:"anterior",   label:"Left Foot",
    pts:[[11.5,94],[18,94],[18,98.5],[11,98.5]] },

  // ══ LEFT LATERAL (x: 24–49%) ═════════════════════════════════════════════
  { id:"ll_head",             view:"left_lat",   label:"Head",
    pts:[[28,2.5],[37,2.5],[38,5.5],[38,12],[36,15],[33,15],[30,12],[28.5,5.5]] },
  { id:"ll_cervical",         view:"left_lat",   label:"Cervical Spine",
    pts:[[31.5,15],[36,15],[36.5,18],[36.5,21],[32,21],[31.5,18]] },
  { id:"ll_thoracic",         view:"left_lat",   label:"Thoracic Spine",
    pts:[[30.5,21],[36,21],[37.5,22],[40.5,48],[36,49],[30.5,22]] },
  { id:"ll_lumbar",           view:"left_lat",   label:"Lumbar Spine",
    pts:[[33,49],[40.5,48],[41.5,58],[37,60],[32.5,58]] },
  { id:"ll_pelvis",           view:"left_lat",   label:"Pelvis",
    pts:[[30,58],[41.5,58],[44,65],[41,69],[30.5,69],[28.5,65]] },
  { id:"ll_shoulder",         view:"left_lat",   label:"Shoulder",
    pts:[[28,19],[38,19],[40,24],[38,27],[30.5,27],[27.5,23]] },
  { id:"ll_elbow",            view:"left_lat",   label:"Elbow",
    pts:[[40.5,38],[47.5,38],[48,44],[41,44]] },
  { id:"ll_wrist",            view:"left_lat",   label:"Wrist",
    pts:[[43,55.5],[48.5,55.5],[48.5,60],[43,60]] },
  { id:"ll_hip",              view:"left_lat",   label:"Hip",
    pts:[[28.5,63],[41,63],[41.5,70],[36.5,71],[28.5,70]] },
  { id:"ll_knee",             view:"left_lat",   label:"Knee",
    pts:[[30,73],[41.5,73],[41.5,80],[30,80]] },
  { id:"ll_ankle",            view:"left_lat",   label:"Ankle",
    pts:[[30,90],[41,90],[41.5,94],[30.5,94]] },
  { id:"ll_foot",             view:"left_lat",   label:"Foot",
    pts:[[28,94],[44.5,94],[47.5,98.5],[28,98.5]] },

  // ══ RIGHT LATERAL (x: 49–73%) ════════════════════════════════════════════
  { id:"rl_head",             view:"right_lat",  label:"Head",
    pts:[[55,2.5],[64.5,2.5],[66,5.5],[66,12],[63.5,15],[61,15],[57.5,12],[55,5.5]] },
  { id:"rl_cervical",         view:"right_lat",  label:"Cervical Spine",
    pts:[[57.5,15],[63,15],[63.5,18],[63.5,21],[57.5,21],[57,18]] },
  { id:"rl_thoracic",         view:"right_lat",  label:"Thoracic Spine",
    pts:[[55.5,21],[63,21],[64,22],[64.5,48],[59.5,49],[55.5,22]] },
  { id:"rl_lumbar",           view:"right_lat",  label:"Lumbar Spine",
    pts:[[55.5,49],[64.5,48],[65.5,58],[61,60],[55.5,58]] },
  { id:"rl_pelvis",           view:"right_lat",  label:"Pelvis",
    pts:[[54,58],[65.5,58],[67.5,65],[65,69],[54.5,69],[52.5,65]] },
  { id:"rl_shoulder",         view:"right_lat",  label:"Shoulder",
    pts:[[56.5,19],[67,19],[68,23],[66,27],[57,27],[55.5,23]] },
  { id:"rl_elbow",            view:"right_lat",  label:"Elbow",
    pts:[[49.5,38],[57,38],[57.5,44],[50,44]] },
  { id:"rl_wrist",            view:"right_lat",  label:"Wrist",
    pts:[[50,55.5],[56.5,55.5],[56.5,60],[50,60]] },
  { id:"rl_hip",              view:"right_lat",  label:"Hip",
    pts:[[53.5,63],[66,63],[66.5,70],[61.5,71],[53.5,70]] },
  { id:"rl_knee",             view:"right_lat",  label:"Knee",
    pts:[[53.5,73],[65.5,73],[65.5,80],[53.5,80]] },
  { id:"rl_ankle",            view:"right_lat",  label:"Ankle",
    pts:[[54,90],[65,90],[65,94],[54,94]] },
  { id:"rl_foot",             view:"right_lat",  label:"Foot",
    pts:[[51,94],[67,94],[70,98.5],[51,98.5]] },

  // ══ POSTERIOR (x: 73–100%) ════════════════════════════════════════════════
  { id:"pos_occiput",         view:"posterior",  label:"Occiput",
    pts:[[79,2.5],[88,2.5],[89,6],[88.5,10],[86,12.5],[83.5,12.5],[81,10],[80,6]] },
  { id:"pos_cervical",        view:"posterior",  label:"Cervical Spine",
    pts:[[82.5,12.5],[86,12.5],[86.5,16],[85,18.5],[83.5,16]] },
  { id:"pos_thoracic",        view:"posterior",  label:"Thoracic Spine",
    pts:[[82,18.5],[87,18.5],[88,21],[89,37],[84.5,38],[81.5,37],[81,21]] },
  { id:"pos_lumbar",          view:"posterior",  label:"Lumbar Spine",
    pts:[[82,38],[89,37],[89.5,48],[85,49.5],[81.5,48]] },
  { id:"pos_sacrum",          view:"posterior",  label:"Sacrum",
    pts:[[83,49.5],[89.5,49],[89.5,57],[87,59.5],[82,59.5],[80.5,57]] },
  { id:"pos_gluteals",        view:"posterior",  label:"Gluteals",
    pts:[[79.5,57],[91,57],[91.5,65],[86,67.5],[84,67.5],[79.5,65]] },
  { id:"pos_right_scapula",   view:"posterior",  label:"Right Scapula",
    pts:[[75.5,19.5],[83,19.5],[83.5,35.5],[79,36],[75,28]] },
  { id:"pos_left_scapula",    view:"posterior",  label:"Left Scapula",
    pts:[[86.5,19.5],[94.5,19.5],[97.5,28],[94,36],[87,35.5]] },
  { id:"pos_right_shoulder",  view:"posterior",  label:"Right Shoulder",
    pts:[[74,17],[82,17],[82,21],[78,24.5],[74,22]] },
  { id:"pos_left_shoulder",   view:"posterior",  label:"Left Shoulder",
    pts:[[87.5,17],[97,17],[97,22],[93,24.5],[87.5,21]] },
  { id:"pos_right_arm",       view:"posterior",  label:"Right Arm",
    pts:[[73.5,22],[79.5,22],[80,39],[74,39]] },
  { id:"pos_left_arm",        view:"posterior",  label:"Left Arm",
    pts:[[91,22],[97.5,22],[97.5,39],[91,39]] },
  { id:"pos_right_elbow",     view:"posterior",  label:"Right Elbow",
    pts:[[74,39],[80,39],[80.5,44],[74.5,44]] },
  { id:"pos_left_elbow",      view:"posterior",  label:"Left Elbow",
    pts:[[91,39],[97.5,39],[97.5,44],[91,44]] },
  { id:"pos_right_forearm",   view:"posterior",  label:"Right Forearm",
    pts:[[74.5,44],[80.5,44],[81,55.5],[75,55.5]] },
  { id:"pos_left_forearm",    view:"posterior",  label:"Left Forearm",
    pts:[[91,44],[97.5,44],[97.5,55.5],[91,55.5]] },
  { id:"pos_right_hand",      view:"posterior",  label:"Right Hand",
    pts:[[73.5,55.5],[81,55.5],[81,67],[73,67]] },
  { id:"pos_left_hand",       view:"posterior",  label:"Left Hand",
    pts:[[91,55.5],[98.5,55.5],[99,67],[91,67]] },
  { id:"pos_right_hip",       view:"posterior",  label:"Right Hip",
    pts:[[79.5,65],[85,65],[84.5,72],[79.5,72]] },
  { id:"pos_left_hip",        view:"posterior",  label:"Left Hip",
    pts:[[85.5,65],[91,65],[91,72],[85.5,72]] },
  { id:"pos_right_thigh",     view:"posterior",  label:"Right Thigh",
    pts:[[79.5,72],[85,72],[84.5,75],[79.5,75]] },
  { id:"pos_left_thigh",      view:"posterior",  label:"Left Thigh",
    pts:[[85.5,72],[91,72],[91,75],[85.5,75]] },
  { id:"pos_right_knee",      view:"posterior",  label:"Right Knee",
    pts:[[79.5,75],[84.5,75],[84.5,80],[79.5,80]] },
  { id:"pos_left_knee",       view:"posterior",  label:"Left Knee",
    pts:[[85.5,75],[91,75],[91,80],[85.5,80]] },
  { id:"pos_right_calf",      view:"posterior",  label:"Right Calf",
    pts:[[79.5,80],[84.5,80],[84,90],[79.5,90]] },
  { id:"pos_left_calf",       view:"posterior",  label:"Left Calf",
    pts:[[85.5,80],[91,80],[91,90],[85.5,90]] },
  { id:"pos_right_ankle",     view:"posterior",  label:"Right Ankle",
    pts:[[79.5,90],[84,90],[84,94],[79.5,94]] },
  { id:"pos_left_ankle",      view:"posterior",  label:"Left Ankle",
    pts:[[85.5,90],[91,90],[91,94],[85.5,94]] },
  { id:"pos_right_foot",      view:"posterior",  label:"Right Foot",
    pts:[[78.5,94],[84.5,94],[84,98.5],[78,98.5]] },
  { id:"pos_left_foot",       view:"posterior",  label:"Left Foot",
    pts:[[85.5,94],[92,94],[92,98.5],[85.5,98.5]] },
];

// ─── HELPER: pts array → SVG polygon points string ───────────────────────────
function ptsToSVG(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

// ─── SYMPTOM PANEL ────────────────────────────────────────────────────────────
function SymptomPanel({ region, entry, onSave, onClose }) {
  const [symptoms, setSymptoms] = useState(entry?.symptoms || []);
  const [intensity, setIntensity] = useState(entry?.intensity || 5);
  const [notes, setNotes] = useState(entry?.notes || "");
  const [radiation, setRadiation] = useState(entry?.radiation || false);

  const toggleSymptom = (id) => {
    setSymptoms(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  };

  const primaryColor = symptoms.length > 0
    ? SYMPTOM_TYPES.find(s => s.id === symptoms[0])?.color || "#7c3aed"
    : "#7c3aed";

  return (
    <div style={{
      position:"absolute", right:0, top:0, bottom:0, width:280,
      background:"#ffffff", borderLeft:"1px solid #e5e7eb",
      display:"flex", flexDirection:"column", zIndex:50,
      boxShadow:"-4px 0 20px rgba(0,0,0,0.12)", borderRadius:"0 12px 12px 0",
      fontFamily:"system-ui,sans-serif"
    }}>
      {/* Header */}
      <div style={{padding:"14px 16px", borderBottom:"1px solid #f0f0f0",
        background:`linear-gradient(135deg,${primaryColor}15,${primaryColor}05)`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontWeight:800, fontSize:"0.9rem", color:"#111"}}>📍 {region.label}</div>
            <div style={{fontSize:"0.65rem", color:"#9ca3af", marginTop:2, textTransform:"capitalize"}}>{region.view.replace("_"," ")}</div>
          </div>
          <button onClick={onClose} style={{background:"#f3f4f6", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:"0.9rem", display:"flex",
            alignItems:"center", justifyContent:"center"}}>✕</button>
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"14px 16px"}}>
        {/* Symptoms */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8}}>Symptoms</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:5}}>
            {SYMPTOM_TYPES.map(s => {
              const selected = symptoms.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSymptom(s.id)}
                  style={{padding:"7px 8px", borderRadius:8, cursor:"pointer", textAlign:"left",
                    border:`1.5px solid ${selected ? s.color : "#e5e7eb"}`,
                    background: selected ? s.bg : "#fafafa",
                    color: selected ? s.color : "#374151",
                    fontWeight: selected ? 700 : 400, fontSize:"0.72rem",
                    transition:"all 0.12s"}}>
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pain Scale */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6}}>
            Intensity — {intensity}/10
          </div>
          <input type="range" min={0} max={10} value={intensity}
            onChange={e => setIntensity(Number(e.target.value))}
            style={{width:"100%", accentColor: primaryColor}}/>
          <div style={{display:"flex", justifyContent:"space-between",
            fontSize:"0.6rem", color:"#9ca3af", marginTop:2}}>
            <span>0 — None</span><span>5 — Moderate</span><span>10 — Worst</span>
          </div>
        </div>

        {/* Radiation */}
        <div style={{marginBottom:14}}>
          <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
            <input type="checkbox" checked={radiation}
              onChange={e => setRadiation(e.target.checked)}
              style={{accentColor: primaryColor, width:15, height:15}}/>
            <span style={{fontSize:"0.78rem", fontWeight:600, color:"#374151"}}>
              ⚡ Radiation / Referred pain
            </span>
          </label>
        </div>

        {/* Notes */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6}}>Notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Clinical observations, onset, aggravating factors…"
            rows={3} style={{width:"100%", border:"1px solid #e5e7eb", borderRadius:8,
              padding:"8px 10px", fontSize:"0.75rem", fontFamily:"inherit",
              outline:"none", resize:"vertical", color:"#374151", boxSizing:"border-box"}}/>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"12px 16px", borderTop:"1px solid #f0f0f0",
        display:"flex", gap:8}}>
        <button onClick={() => onSave({ regionId:region.id, symptoms, intensity, radiation, notes })}
          style={{flex:1, padding:"9px", borderRadius:8, background:primaryColor,
            color:"#fff", border:"none", fontWeight:700, fontSize:"0.78rem",
            cursor:"pointer"}}>
          ✓ Save
        </button>
        <button onClick={onClose}
          style={{padding:"9px 14px", borderRadius:8, background:"#f3f4f6",
            color:"#6b7280", border:"none", fontWeight:600, fontSize:"0.78rem",
            cursor:"pointer"}}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN MODE — Polygon Editor ──────────────────────────────────────────────
function AdminOverlay({ regions, onUpdate, svgRef }) {
  const [dragging, setDragging] = useState(null); // { regionId, ptIdx }
  const [selected, setSelected] = useState(null); // regionId
  const [editedRegions, setEditedRegions] = useState(
    () => regions.reduce((acc, r) => { acc[r.id] = [...r.pts.map(p=>[...p])]; return acc; }, {})
  );

  const getSVGCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [
      ((clientX - rect.left) / rect.width) * 100,
      ((clientY - rect.top) / rect.height) * 100,
    ];
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const coords = getSVGCoords(e);
    if (!coords) return;
    setEditedRegions(prev => {
      const next = { ...prev };
      const pts = next[dragging.regionId].map((p, i) =>
        i === dragging.ptIdx ? coords : p
      );
      next[dragging.regionId] = pts;
      return next;
    });
  }, [dragging, getSVGCoords]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      onUpdate(dragging.regionId, editedRegions[dragging.regionId]);
      setDragging(null);
    }
  }, [dragging, editedRegions, onUpdate]);

  const addPoint = (regionId, afterIdx) => {
    setEditedRegions(prev => {
      const pts = [...prev[regionId]];
      const p1 = pts[afterIdx];
      const p2 = pts[(afterIdx + 1) % pts.length];
      pts.splice(afterIdx + 1, 0, [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2]);
      const next = { ...prev, [regionId]: pts };
      onUpdate(regionId, pts);
      return next;
    });
  };

  const removePoint = (regionId, ptIdx) => {
    setEditedRegions(prev => {
      const pts = prev[regionId].filter((_, i) => i !== ptIdx);
      if (pts.length < 3) return prev;
      const next = { ...prev, [regionId]: pts };
      onUpdate(regionId, pts);
      return next;
    });
  };

  return (
    <g onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
       onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
      {regions.map(r => {
        const pts = editedRegions[r.id] || r.pts;
        const isSel = selected === r.id;
        return (
          <g key={r.id}>
            <polygon
              points={ptsToSVG(pts)}
              fill={isSel ? "rgba(124,58,237,0.15)" : "rgba(0,229,255,0.06)"}
              stroke={isSel ? "#7c3aed" : "#00e5ff"}
              strokeWidth="0.4"
              strokeDasharray="1,1"
              style={{cursor:"pointer"}}
              onClick={() => setSelected(isSel ? null : r.id)}
            />
            {isSel && pts.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="0.8" fill="#7c3aed" stroke="#fff" strokeWidth="0.25"
                  style={{cursor:"grab"}}
                  onMouseDown={e => { e.stopPropagation(); setDragging({regionId:r.id, ptIdx:i}); }}
                  onTouchStart={e => { e.stopPropagation(); setDragging({regionId:r.id, ptIdx:i}); }}
                />
                <circle cx={x} cy={y} r="1.5" fill="transparent"
                  onDoubleClick={() => removePoint(r.id, i)}
                  onClick={e => { e.stopPropagation(); if(e.altKey) removePoint(r.id, i); }}
                />
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

// ─── RADIATION ARROW ─────────────────────────────────────────────────────────
function RadiationArrows({ arrows }) {
  return (
    <g>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4 Z" fill="#ec4899" opacity="0.85"/>
        </marker>
      </defs>
      {arrows.map((a, i) => (
        <line key={i}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="#ec4899" strokeWidth="0.6" strokeDasharray="2,1.5" opacity="0.85"
          markerEnd="url(#arrowhead)"/>
      ))}
    </g>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BodyChartPro({ data = {}, set = () => {} }) {
  // Body chart data stored as data.body_chart_pro
  const chartData = (() => {
    try { return JSON.parse(data.body_chart_pro || "{}"); } catch { return {}; }
  })();
  const saveData = (d) => set("body_chart_pro", JSON.stringify(d));

  const [entries, setEntries]           = useState(chartData.entries || []);
  const [hovered, setHovered]           = useState(null);
  const [tooltip, setTooltip]           = useState(null);
  const [activePanel, setActivePanel]   = useState(null); // region being edited
  const [adminMode, setAdminMode]       = useState(false);
  const [editedPts, setEditedPts]       = useState({});
  const [radiationMode, setRadiationMode] = useState(false);
  const [radiationDraw, setRadiationDraw] = useState(null);
  const [arrows, setArrows]             = useState(chartData.arrows || []);
  const [imgLoaded, setImgLoaded]       = useState(false);
  const svgRef = useRef(null);

  // Persist whenever entries/arrows change
  useEffect(() => {
    saveData({ entries, arrows });
  }, [entries, arrows]);

  const getRegion = (id) => REGIONS.find(r => r.id === id);
  const getEntry  = (id) => entries.find(e => e.regionId === id);
  const effectiveRegions = REGIONS.map(r => ({ ...r, pts: editedPts[r.id] || r.pts }));

  const handleRegionClick = useCallback((regionId, e) => {
    if (adminMode) return;
    if (radiationMode) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (!radiationDraw) {
        setRadiationDraw({ x1:x, y1:y });
      } else {
        setArrows(p => [...p, { ...radiationDraw, x2:x, y2:y, from:regionId }]);
        setRadiationDraw(null);
      }
      return;
    }
    setActivePanel(regionId);
  }, [adminMode, radiationMode, radiationDraw]);

  const handleSave = (saved) => {
    setEntries(prev => {
      const next = prev.filter(e => e.regionId !== saved.regionId);
      if (saved.symptoms.length > 0) return [...next, saved];
      return next;
    });
    setActivePanel(null);
  };

  const handleRemove = (regionId) => {
    setEntries(prev => prev.filter(e => e.regionId !== regionId));
    setActivePanel(null);
  };

  const getRegionFill = (regionId) => {
    const entry = getEntry(regionId);
    if (!entry || entry.symptoms.length === 0) return "transparent";
    const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
    return sym ? sym.bg : "rgba(124,58,237,0.2)";
  };

  const getRegionStroke = (regionId) => {
    if (hovered === regionId) return "#3b82f6";
    const entry = getEntry(regionId);
    if (!entry || entry.symptoms.length === 0) return "transparent";
    const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
    return sym ? sym.color : "#7c3aed";
  };

  // Export data
  const exportData = () => {
    const out = entries.map(e => ({
      region: getRegion(e.regionId)?.label || e.regionId,
      view: getRegion(e.regionId)?.view || "",
      symptoms: e.symptoms,
      intensity: e.intensity,
      radiation: e.radiation,
      notes: e.notes,
    }));
    return JSON.stringify(out, null, 2);
  };

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", userSelect:"none" }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
        <div style={{ fontWeight:800, fontSize:"0.82rem", color:"#1a1025", flex:1 }}>
          🫁 Body Chart
          {entries.length > 0 && (
            <span style={{ marginLeft:8, fontSize:"0.7rem", background:"rgba(124,58,237,0.12)",
              color:"#7c3aed", borderRadius:20, padding:"2px 9px", fontWeight:700 }}>
              {entries.length} region{entries.length!==1?"s":""}
            </span>
          )}
        </div>

        {/* Symptom legend */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {SYMPTOM_TYPES.map(s => (
            <span key={s.id} style={{ fontSize:"0.58rem", padding:"2px 7px", borderRadius:20,
              background:s.bg, color:s.color, fontWeight:700, border:`1px solid ${s.color}40` }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        <button onClick={() => setRadiationMode(p => !p)}
          style={{ padding:"5px 11px", borderRadius:8, border:`1.5px solid ${radiationMode?"#ec4899":"#e5e7eb"}`,
            background:radiationMode?"rgba(236,72,153,0.12)":"transparent",
            color:radiationMode?"#ec4899":"#6b7280",
            fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
          {radiationMode ? "⚡ Drawing…" : "⚡ Radiation"}
        </button>
        {radiationDraw && (
          <span style={{ fontSize:"0.7rem", color:"#ec4899", fontWeight:600 }}>
            Click end point →
          </span>
        )}
        {arrows.length > 0 && (
          <button onClick={() => setArrows([])}
            style={{ padding:"4px 9px", borderRadius:7, border:"1px solid #fca5a5",
              background:"#fef2f2", color:"#ef4444", fontSize:"0.65rem",
              fontWeight:700, cursor:"pointer" }}>
            Clear arrows
          </button>
        )}
        <button onClick={() => setAdminMode(p => !p)}
          style={{ padding:"5px 11px", borderRadius:8, border:`1.5px solid ${adminMode?"#7c3aed":"#e5e7eb"}`,
            background:adminMode?"rgba(124,58,237,0.12)":"transparent",
            color:adminMode?"#7c3aed":"#6b7280",
            fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
          {adminMode ? "🔧 Admin ON" : "🔧 Admin"}
        </button>
        {entries.length > 0 && (
          <button onClick={() => setEntries([])}
            style={{ padding:"5px 11px", borderRadius:8, border:"1px solid #fca5a5",
              background:"#fef2f2", color:"#ef4444",
              fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
            Clear all
          </button>
        )}
      </div>

      {/* ── Chart container ──────────────────────────────────────────────────── */}
      <div style={{ position:"relative", width:"100%", background:"#000",
        borderRadius:12, overflow:"hidden",
        border:"1px solid #e5e7eb" }}>

        {/* Body image */}
        <img
          src={BODY_IMAGE_URL}
          alt="Anatomical Body Chart"
          style={{ width:"100%", display:"block",
            opacity: imgLoaded ? 1 : 0, transition:"opacity 0.4s" }}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.target.style.opacity="0.4"; setImgLoaded(true); }}
        />

        {!imgLoaded && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", padding:24,
            background:"#111827", color:"#9ca3af" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🖼️</div>
            <div style={{ fontWeight:800, fontSize:"0.9rem", color:"#f9fafb", marginBottom:8 }}>
              Body Chart Image Not Uploaded
            </div>
            <div style={{ fontSize:"0.75rem", textAlign:"center", lineHeight:1.7, maxWidth:320, color:"#9ca3af" }}>
              Upload the anatomical body chart image to Cloudinary with public ID:
              <code style={{ display:"block", margin:"8px 0", padding:"6px 12px",
                background:"rgba(255,255,255,0.08)", borderRadius:6,
                color:"#a78bfa", fontSize:"0.82rem", fontWeight:700 }}>
                body-chart-4view
              </code>
              Use the <strong style={{color:"#f9fafb"}}>Cloudinary Uploader</strong> tool
              → filter by <strong style={{color:"#f43f5e"}}>⭐ Assets</strong> → drag the image
            </div>
          </div>
        )}

        {/* SVG overlay */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%",
            cursor: radiationMode ? "crosshair" : "default" }}
        >
          {/* Region polygons */}
          {effectiveRegions.map(r => {
            const entry = getEntry(r.id);
            const isHov = hovered === r.id;
            const isSel = activePanel === r.id;
            const fill  = getRegionFill(r.id);
            const stroke = getRegionStroke(r.id);
            const hasData = !!entry && entry.symptoms.length > 0;

            return (
              <polygon
                key={r.id}
                points={ptsToSVG(r.pts)}
                fill={isHov ? "rgba(59,130,246,0.18)" : isSel ? "rgba(124,58,237,0.18)" : fill}
                stroke={isHov ? "#3b82f6" : isSel ? "#7c3aed" : stroke}
                strokeWidth={isHov || isSel || hasData ? "0.35" : "0"}
                style={{ cursor:"pointer", transition:"fill 0.1s, stroke 0.1s" }}
                onMouseEnter={(e) => {
                  setHovered(r.id);
                  const svg = svgRef.current;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltip({
                      label: r.label,
                      view: r.view,
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                      entry,
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const svg = svgRef.current;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltip(t => t ? { ...t,
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                    } : t);
                  }
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                onClick={(e) => handleRegionClick(r.id, e)}
              />
            );
          })}

          {/* Symptom markers — small colored circles at centroid */}
          {entries.map(entry => {
            const r = effectiveRegions.find(rr => rr.id === entry.regionId);
            if (!r || !entry.symptoms.length) return null;
            const cx = r.pts.reduce((s, p) => s + p[0], 0) / r.pts.length;
            const cy = r.pts.reduce((s, p) => s + p[1], 0) / r.pts.length;
            const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
            return (
              <g key={entry.regionId}>
                <circle cx={cx} cy={cy} r="1.2" fill={sym?.color || "#7c3aed"}
                  opacity="0.9" stroke="#fff" strokeWidth="0.25"/>
                {entry.symptoms.length > 1 && (
                  <text x={cx + 1.8} y={cy + 0.5} fontSize="1.1" fill="#fff"
                    fontWeight="bold">+{entry.symptoms.length - 1}</text>
                )}
                {entry.intensity >= 7 && (
                  <circle cx={cx} cy={cy} r="2.2" fill="none"
                    stroke={sym?.color || "#ef4444"} strokeWidth="0.3" opacity="0.5">
                    <animate attributeName="r" values="1.8;2.8;1.8" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                )}
              </g>
            );
          })}

          {/* Radiation arrows */}
          <RadiationArrows arrows={arrows} />

          {/* Radiation in-progress */}
          {radiationDraw && (
            <circle cx={radiationDraw.x1} cy={radiationDraw.y1} r="1"
              fill="#ec4899" opacity="0.8"/>
          )}

          {/* Admin overlay */}
          {adminMode && (
            <AdminOverlay
              regions={effectiveRegions}
              svgRef={svgRef}
              onUpdate={(id, pts) => {
                setEditedPts(p => ({ ...p, [id]: pts }));
              }}
            />
          )}

          {/* Tooltip */}
          {tooltip && !adminMode && (
            <g>
              <rect
                x={Math.min(tooltip.x + 1, 72)}
                y={Math.max(tooltip.y - 6, 1)}
                width={22} height={tooltip.entry ? 10 : 7}
                rx="0.8" ry="0.8"
                fill="rgba(17,24,39,0.88)" stroke="#374151" strokeWidth="0.15"/>
              <text
                x={Math.min(tooltip.x + 2.5, 73.5)}
                y={Math.max(tooltip.y - 2.5, 4)}
                fontSize="1.6" fill="#f9fafb" fontWeight="600">
                {tooltip.label}
              </text>
              {tooltip.entry && tooltip.entry.symptoms.length > 0 && (
                <text
                  x={Math.min(tooltip.x + 2.5, 73.5)}
                  y={Math.max(tooltip.y + 1.5, 7)}
                  fontSize="1.3" fill="#9ca3af">
                  {tooltip.entry.symptoms.join(", ")} · {tooltip.entry.intensity}/10
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Admin help text */}
        {adminMode && (
          <div style={{ position:"absolute", bottom:8, left:8, right:8,
            background:"rgba(17,24,39,0.85)", borderRadius:8, padding:"6px 10px",
            fontSize:"0.65rem", color:"#9ca3af", textAlign:"center" }}>
            🔧 Admin Mode — Click polygon to select · Drag dots to move points
            · Double-click dot to remove · Alt+click dot to remove
          </div>
        )}

        {/* Symptom panel (slides in) */}
        {activePanel && !adminMode && (
          <SymptomPanel
            region={getRegion(activePanel)}
            entry={getEntry(activePanel)}
            onSave={handleSave}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* ── Selected regions summary ──────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
            Marked Areas ({entries.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {entries.map(e => {
              const r = getRegion(e.regionId);
              const sym = SYMPTOM_TYPES.find(s => s.id === e.symptoms[0]);
              return (
                <div key={e.regionId}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                    borderRadius:20, border:`1px solid ${sym?.color || "#e5e7eb"}40`,
                    background:`${sym?.color || "#7c3aed"}10`, cursor:"pointer" }}
                  onClick={() => setActivePanel(e.regionId)}>
                  <span style={{ fontSize:"0.75rem" }}>{sym?.icon}</span>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, color:sym?.color || "#374151" }}>
                    {r?.label}
                  </span>
                  <span style={{ fontSize:"0.62rem", color:"#9ca3af" }}>
                    {e.intensity}/10
                  </span>
                  <button
                    onClick={ev => { ev.stopPropagation(); handleRemove(e.regionId); }}
                    style={{ background:"none", border:"none", cursor:"pointer",
                      color:"#9ca3af", fontSize:"0.7rem", padding:0, lineHeight:1 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
