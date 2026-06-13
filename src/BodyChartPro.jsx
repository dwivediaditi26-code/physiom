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
  { id:"anterior_head", view:"anterior", label:"Head",
    pts:[[17.71,4.53],[16.1,4.92],[14.92,3.87],[15.25,2.3],[16.1,0.85],[17.37,0.59],[19.15,0.72],[20.08,2.17],[20.34,3.74],[20,4.92]] },
  { id:"left_lat_head", view:"left_lat", label:"Head",
    pts:[[38.9,2.95],[38.73,6.24],[37.37,5.98],[35.85,4.4],[35.34,2.56],[36.27,0.98],[37.29,0.98],[38.39,0.98],[39.75,0.59],[41.78,2.3],[41.69,3.61],[41.61,5.19],[40.68,7.03]] },
  { id:"right_lat_head", view:"right_lat", label:"Head",
    pts:[[60.59,3.48],[61.27,6.76],[59.92,5.84],[58.39,6.37],[57.54,4.79],[58.14,1.51],[59.41,0.72],[61.02,0.59],[62.54,0.98],[64.07,2.3],[62.97,3.48],[62.63,5.45]] },
  { id:"posterior_head", view:"posterior", label:"Head",
    pts:[[81.44,4.14],[80.93,5.45],[79.41,5.19],[79.49,3.22],[80,0.85],[81.53,0.85],[83.73,1.51],[83.81,3.35],[84.75,3.35],[84.75,5.32],[82.88,5.71]] },
  { id:"anterior_neck", view:"anterior", label:"Neck",
    pts:[[17.8,15.43],[15.76,12.02],[15.59,13.99],[14.66,14.9],[15.51,16.74],[17.46,17.66],[19.83,16.61],[20.93,15.96],[20.08,13.33],[19.58,11.75]] },
  { id:"left_lat_neck", view:"left_lat", label:"Neck",
    pts:[[38.81,12.67],[37.29,13.99],[37.37,15.69],[38.56,16.22],[40.34,14.64],[40.85,12.93],[40.68,10.83],[39.07,12.67],[37.03,13.59],[37.54,11.49],[38.47,9.91],[39.15,8.73],[40.51,9.65]] },
  { id:"right_lat_neck", view:"right_lat", label:"Neck",
    pts:[[59.66,12.8],[58.47,11.36],[58.22,9],[58.56,6.37],[59.92,8.34],[60.93,10.44],[62.8,12.67],[61.95,14.12],[60.85,15.3],[58.73,14.9],[57.46,14.9]] },
  { id:"posterior_neck", view:"posterior", label:"Neck",
    pts:[[82.12,12.67],[77.97,16.09],[79.49,14.38],[79.83,12.15],[79.83,8.34],[81.27,6.89],[82.97,8.21],[84.32,10.97],[84.92,14.64],[86.36,16.35]] },
  { id:"anterior_shoulder_rt", view:"anterior", label:"Shoulder Rt",
    pts:[[10.42,21.73],[8.9,26.59],[10.25,25.41],[11.95,23.83],[12.8,21.34],[13.31,19.76],[14.75,16.87],[13.22,16.35],[11.78,16.87],[10.51,18.19],[8.47,23.97]] },
  { id:"anterior_shoulder_lt", view:"anterior", label:"Shoulder Lt",
    pts:[[25.17,20.42],[24.92,18.45],[23.47,16.87],[22.2,16.22],[21.1,15.69],[21.19,17.93],[21.95,20.42],[23.14,22],[25.25,23.05],[26.61,21.86]] },
  { id:"left_lat_shoulder", view:"left_lat", label:"Shoulder",
    pts:[[40.34,19.76],[38.31,15.17],[37.37,17.01],[37.88,19.24],[37.54,22.39],[39.83,22.92],[41.95,21.21],[41.95,18.19],[42.2,15.96],[41.53,14.64],[40.42,15.04]] },
  { id:"right_lat_shoulder", view:"right_lat", label:"Shoulder",
    pts:[[59.07,19.11],[61.53,20.03],[61.44,18.58],[61.53,15.69],[59.49,15.43],[57.63,14.64],[56.69,15.96],[56.36,17.53],[56.86,18.98],[59.49,17.27],[57.37,19.37],[58.64,20.03],[60.25,20.68]] },
  { id:"posterior_shoulder_rt", view:"posterior", label:"Shoulder Rt",
    pts:[[88.56,20.42],[85.08,18.58],[85.25,20.68],[86.53,21.73],[88.73,23.44],[90.25,21.86],[89.92,18.58],[88.56,17.66],[87.2,16.61],[86.53,18.58],[86.02,22.13],[86.86,22.65],[88.05,23.31]] },
  { id:"posterior_shoulder_lt", view:"posterior", label:"Shoulder Lt",
    pts:[[75.25,19.11],[73.14,21.73],[73.22,23.44],[74.92,23.7],[76.86,21.86],[78.56,21.73],[78.64,19.24],[78.39,17.01],[77.46,15.82],[76.02,15.96],[74.66,16.87],[73.22,18.19],[72.8,20.16]] },
  { id:"anterior_chest", view:"anterior", label:"Chest",
    pts:[[17.97,19.76],[14.66,18.32],[13.81,18.71],[12.97,21.47],[13.22,22.78],[12.12,24.49],[12.88,25.8],[13.73,26.2],[14.49,28.69],[16.02,28.96],[16.95,28.96],[18.47,28.96],[20.59,28.82],[21.1,28.82],[22.54,27.25],[22.54,24.75],[23.22,24.75],[23.81,23.57],[22.71,21.73],[21.69,19.37],[20.76,17.79],[19.41,16.74],[17.37,17.27],[15,17.66]] },
  { id:"posterior_upper_back", view:"posterior", label:"Upper Back",
    pts:[[82.03,18.19],[80,20.16],[79.07,19.63],[78.81,16.87],[80.25,15.82],[82.2,15.69],[84.49,15.43],[86.69,16.22],[85.59,17.4],[84.58,18.45],[83.73,19.89],[82.71,20.42],[81.27,20.95]] },
  { id:"posterior_mid_back", view:"posterior", label:"Mid Back",
    pts:[[82.03,25.28],[79.75,20.68],[78.81,22.13],[77.88,23.7],[76.95,25.67],[76.86,28.3],[78.05,30.93],[80.68,32.76],[83.47,33.16],[85.08,35.13],[86.69,35.13],[87.29,33.03],[87.37,29.09],[87.97,26.85],[87.12,24.1],[85.85,22.26],[85.08,20.16],[82.29,21.34]] },
  { id:"left_lat_chest", view:"left_lat", label:"Chest",
    pts:[[36.19,23.7],[33.64,26.99],[34.92,28.17],[36.53,26.99],[37.54,26.07],[38.56,23.31],[37.63,21.34],[37.37,19.24],[36.86,17.4],[35.76,19.76],[34.92,21.86]] },
  { id:"right_lat_chest", view:"right_lat", label:"Chest",
    pts:[[63.47,23.18],[62.2,22],[61.36,24.62],[62.46,26.46],[63.31,28.04],[64.41,28.17],[65.76,27.64],[65.59,25.28],[63.22,18.71],[62.03,17.27],[61.69,20.16],[61.27,22.13]] },
  { id:"left_lat_lateral_thoracic", view:"left_lat", label:"Lateral Thoracic",
    pts:[[37.97,29.61],[34.32,28.69],[33.98,30.53],[34.41,32.24],[35.68,35.13],[37.12,35.13],[38.64,35.78],[39.83,35],[40.76,33.81],[40.76,31.45],[40.17,29.09],[38.98,26.99],[36.86,26.2],[35.34,27.51]] },
  { id:"right_lat_lateral_thoracic", view:"right_lat", label:"Lateral Thoracic",
    pts:[[60.93,29.61],[61.02,25.02],[59.75,27.25],[57.88,30.53],[57.46,32.9],[57.71,35.26],[60.34,34.87],[62.71,34.73],[63.64,33.42],[64.07,31.06],[63.81,29.61],[62.54,27.77],[62.29,25.8],[60.68,24.89]] },
  { id:"posterior_low_back", view:"posterior", label:"Low Back",
    pts:[[82.2,38.94],[81.53,32.63],[80.42,33.95],[79.32,33.95],[77.8,34.34],[77.2,35.65],[77.2,38.8],[78.81,39.99],[80.08,40.77],[84.32,36.84],[84.41,34.87],[83.39,33.95],[81.86,33.81],[81.95,38.8],[83.22,39.86],[84.49,39.99],[87.37,40.25],[86.86,37.89],[86.69,35.52]] },
  { id:"anterior_arm_rt", view:"anterior", label:"Arm Rt",
    pts:[[10.42,29.48],[8.47,27.91],[8.31,30.01],[8.98,33.42],[10.76,34.47],[11.27,32.5],[12.29,28.04],[11.53,26.72],[9.92,26.72],[10.17,29.61],[12.03,27.77],[11.95,26.2],[11.53,24.62],[10.08,23.83],[9.24,23.97],[8.9,25.8]] },
  { id:"left_lat_arm", view:"left_lat", label:"Arm",
    pts:[[42.37,26.33],[42.63,21.6],[41.61,21.34],[41.02,21.86],[39.75,23.05],[38.98,23.57],[38.22,25.02],[39.66,27.25],[40.51,28.96],[41.02,30.01],[43.05,32.11],[43.81,32.5],[44.92,32.24],[45.42,31.45],[45.42,29.35],[44.92,27.64],[44.41,25.28],[43.56,23.44]] },
  { id:"right_lat_arm", view:"right_lat", label:"Arm",
    pts:[[57.03,26.59],[54.92,27.51],[54.41,29.61],[54.07,31.71],[55.85,32.11],[58.14,30.01],[59.07,27.51],[60.25,25.02],[60.85,23.31],[61.36,20.81],[59.66,19.89],[58.05,18.98],[55.85,19.89],[55.51,23.05],[55,25.94],[54.49,27.91]] },
  { id:"posterior_arm_rt", view:"posterior", label:"Arm Rt",
    pts:[[89.49,28.96],[91.1,25.94],[91.1,23.7],[89.32,23.44],[87.97,23.83],[87.63,26.33],[87.8,30.14],[88.73,32.9],[89.83,34.34],[91.02,34.21],[91.44,31.32]] },
  { id:"posterior_arm_lt", view:"posterior", label:"Arm Lt",
    pts:[[74.24,29.61],[76.1,27.51],[76.36,26.2],[76.19,24.75],[75,23.31],[73.81,23.44],[72.97,24.49],[72.88,27.38],[74.15,30.53],[75.76,34.21],[73.39,34.73],[72.46,33.55],[71.86,31.71]] },
  { id:"posterior_hip_rt", view:"posterior", label:"Hip & Gluteal Rt",
    pts:[[86.36,49.18],[87.8,46.55],[87.71,43.53],[86.95,41.69],[85.93,40.25],[84.41,42.22],[83.98,43.66],[83.22,44.45],[83.22,47.47],[82.71,49.31],[83.14,51.67],[84.58,52.86],[86.19,52.33],[87.46,51.81],[87.03,49.44],[87.63,46.68]] },
  { id:"posterior_hip_lt", view:"posterior", label:"Hip & Gluteal Lt",
    pts:[[78.81,47.47],[81.86,49.57],[80.68,47.08],[80.34,44.32],[79.66,41.04],[77.29,40.38],[76.36,42.09],[76.36,45.9],[75.59,48.65],[76.02,50.62],[77.12,51.54],[79.24,52.2],[80.76,52.46],[81.53,51.54],[81.69,49.97]] },
  { id:"left_lat_hip", view:"left_lat", label:"Hip & Gluteal",
    pts:[[38.31,45.76],[34.83,44.58],[35.93,42.88],[37.46,42.22],[35.93,41.43],[37.2,40.64],[38.56,39.99],[39.49,40.12],[40.51,42.22],[41.78,43.27],[42.37,45.76],[42.37,48.26],[41.69,49.57],[40.85,50.62],[40.68,51.94]] },
  { id:"right_lat_hip", view:"right_lat", label:"Hip & Gluteal",
    pts:[[60.59,46.16],[63.05,47.21],[63.9,47.21],[64.58,44.32],[63.31,42.61],[62.63,40.77],[60.68,39.46],[59.15,40.12],[57.88,41.69],[57.12,43.53],[56.61,45.9],[56.53,48.92],[57.29,50.23],[58.56,51.54],[60.51,49.18],[62.2,48.52],[63.73,47.6]] },
  { id:"anterior_groin", view:"anterior", label:"Groin",
    pts:[[17.97,49.7],[17.37,55.22],[15.93,55.09],[15.51,53.25],[15.34,48],[17.03,47.08],[19.07,46.68],[20.34,46.95],[20.59,48.26],[20.68,50.1],[20.25,52.2],[19.83,53.91],[18.98,54.96],[18.14,55.48]] },
  { id:"posterior_sacrum", view:"posterior", label:"Sacrum / Tail Bone",
    pts:[[82.03,45.11],[81.78,43.01],[80.34,42.48],[81.44,49.31],[82.71,48.79],[84.15,42.74]] },
  { id:"posterior_si_joint", view:"posterior", label:"SI Joint",
    pts:[[82.2,42.48],[79.32,42.35],[80.34,44.19],[80.85,45.11],[82.54,45.5],[84.07,43.53],[85.08,41.83],[84.07,40.91]] },
  { id:"anterior_hip_rt", view:"anterior", label:"Hip Joint Rt",
    pts:[[14.49,50.89],[16.61,50.1],[15.08,47.87],[14.07,45.9],[12.63,46.03],[11.78,48.26],[11.78,51.41],[13.9,53.12],[15.34,53.64],[16.69,52.46],[16.78,51.15]] },
  { id:"anterior_hip_lt", view:"anterior", label:"Hip Joint Lt",
    pts:[[22.03,49.18],[23.39,47.34],[23.22,44.58],[21.78,44.58],[20.68,47.08],[19.07,49.05],[19.15,51.15],[21.36,52.86],[23.64,51.28],[23.9,47.6]] },
  { id:"anterior_thigh_rt", view:"anterior", label:"Thigh Rt",
    pts:[[14.15,57.32],[16.53,56.53],[15.59,53.91],[14.32,53.12],[12.46,52.59],[12.12,56.4],[12.03,59.16],[12.03,62.44],[13.31,63.49],[14.24,64.81],[16.36,64.41],[16.53,62.18],[16.53,60.34],[16.69,58.24]] },
  { id:"anterior_thigh_lt", view:"anterior", label:"Thigh Lt",
    pts:[[21.19,59.29],[24.24,58.11],[24.24,55.35],[23.47,53.64],[22.46,51.81],[21.19,52.07],[20.51,52.2],[19.58,53.91],[18.31,56.8],[19.07,59.95],[19.07,62.57],[20.51,62.84],[22.8,62.84],[24.07,60.08]] },
  { id:"anterior_knee_rt", view:"anterior", label:"Knee Rt",
    pts:[[15.34,68.09],[12.8,69.67],[12.97,72.42],[14.41,75.44],[15.76,75.05],[16.44,73.21],[16.61,69.8],[16.69,64.81],[14.49,64.28],[13.64,64.15],[12.71,64.67],[12.97,67.43]] },
  { id:"anterior_knee_lt", view:"anterior", label:"Knee Lt",
    pts:[[20.93,68.48],[18.98,69.14],[18.9,67.3],[18.81,64.54],[20.17,63.23],[21.78,63.89],[22.63,64.54],[22.88,67.83],[22.63,69.93],[22.12,73.47],[20.25,72.55],[19.32,72.03],[18.98,69.4]] },
  { id:"left_lat_knee", view:"left_lat", label:"Knee",
    pts:[[38.81,69.53],[40.25,68.09],[40.25,66.38],[40.42,64.02],[39.24,63.89],[37.97,63.89],[36.78,63.76],[36.1,66.12],[36.78,69.01],[37.12,72.03],[38.73,73.6],[40.08,72.42],[40.85,71.63],[40.93,70.06],[40.59,68.35]] },
  { id:"right_lat_knee", view:"right_lat", label:"Knee",
    pts:[[60.34,68.35],[62.8,68.09],[62.8,65.86],[61.44,64.94],[60.17,64.94],[59.15,65.2],[58.9,65.99],[57.88,70.45],[59.75,72.29],[61.19,73.6],[61.78,72.42],[61.86,70.19],[62.71,68.35]] },
  { id:"posterior_knee_rt", view:"posterior", label:"Knee Rt",
    pts:[[85.42,68.48],[87.37,67.83],[87.37,66.25],[86.61,64.81],[85.59,63.89],[83.81,64.28],[83.05,65.59],[82.97,68.35],[83.81,71.11],[84.58,71.63],[86.1,72.16],[86.78,70.72],[87.12,69.67]] },
  { id:"posterior_knee_lt", view:"posterior", label:"Knee Lt",
    pts:[[78.56,68.09],[81.02,67.83],[80.68,66.25],[79.49,64.94],[77.54,64.15],[76.44,65.59],[76.69,70.19],[77.2,72.16],[79.15,71.63],[80,70.98],[80.85,68.75]] },
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
