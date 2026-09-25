// KineticChainFMS.jsx — Kinetic Chain section + functional movement definitions (MOVEMENTS)
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes).
import React, { useState } from "react";
import { C, RegionChips, applyPersistentHighlight } from "./utils.jsx";
import { KC_REGIONS } from "./sharedClinicalData.js";
// Shared component that remains in SubjectiveObjective.jsx (render-time only; safe cycle).
import { SmallClinicalImg } from "./SubjectiveObjective.jsx";


// ─── CPA REGION DATABASE ─────────────────────────────────────────────────────
function KineticChainSection({ data, set, navContext={} }) {
    const [region, setRegion] = useState(navContext.kcRegion||"foot_ankle");
  React.useEffect(()=>{ if(navContext.kcRegion) setRegion(navContext.kcRegion); },[navContext.kcRegion]);
  React.useEffect(()=>{
    const targets=navContext.kcHighlights?navContext.kcHighlights:navContext.kcHighlight?[navContext.kcHighlight]:[];
    if(!targets.length) return;
    setTimeout(()=>{
      let scrolled=false;
      targets.forEach(id=>{
        const el=document.querySelector(`[data-kc-id="${id}"]`);
        if(el){ if(!scrolled){el.scrollIntoView({behavior:"smooth",block:"center"});scrolled=true;}
          applyPersistentHighlight(el); }
      });
    },450);
  },[navContext.kcHighlight,navContext.kcHighlights]);
  const [openTest, setOpenTest] = useState(null);
  const [modalTest, setModalTest] = useState(null);
  const [showTheory, setShowTheory] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const reg = KC_REGIONS[region];

  const roleColor = (role) => role==="MOBILITY"?"#00c97a":role==="STABILITY"?"#ff4d6d":"#ffb300";

  return (
    <div>
      {/* Theory banner — collapsible */}
      <div style={{ border:"1px solid rgba(0,229,255,0.2)", borderRadius:12, marginBottom:12, overflow:"hidden" }}>
        <div onClick={()=>setShowTheory(p=>!p)}
          style={{ background:"rgba(0,229,255,0.05)", padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontWeight:800, color:C.accent, fontSize:"0.85rem" }}>⛓️ Joint-by-Joint Theory (Cook &amp; Boyle)</span>
          <span style={{ color:C.muted, fontSize:"0.8rem", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.72rem", padding:"2px 8px", borderRadius:6, background:"rgba(0,229,255,0.1)", color:C.accent }}>{showTheory?"hide":"show"}</span>
            {showTheory?"▲":"▼"}
          </span>
        </div>
        {showTheory && (
          <div style={{ padding:"12px 14px", background:"rgba(0,229,255,0.03)" }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {[
                ["Foot","MOBILITY","#00c97a"],["Ankle","MOBILITY","#00c97a"],["Knee","STABILITY","#ff4d6d"],
                ["Hip","MOBILITY","#00c97a"],["Lumbar","STABILITY","#ff4d6d"],["Thoracic","MOBILITY","#00e5ff"],
                ["Scapula","STABILITY","#ff4d6d"],["GH","MOBILITY","#00c97a"],["Elbow","STABILITY","#ff4d6d"],
                ["Wrist","MOBILITY","#00c97a"],
              ].map(([j,r,col])=>(
                <div key={j} style={{ textAlign:"center", padding:"4px 9px", borderRadius:8, border:`1px solid ${col}40`, background:`${col}10` }}>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:col }}>{j}</div>
                  <div style={{ fontSize:"0.72rem", color:col, opacity:0.8 }}>{r}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:"0.76rem", color:C.muted, lineHeight:1.6 }}>
              <strong style={{ color:C.text }}>Key Rule:</strong> When a MOBILE joint loses mobility → the adjacent STABLE joint is forced to become mobile → pain appears at the STABLE joint. <strong style={{ color:C.yellow }}>Always treat the CAUSE (mobile joint) not just the PAIN (stable joint).</strong>
            </div>
          </div>
        )}
      </div>

      {/* Region chips */}
      <RegionChips
        regions={Object.entries(KC_REGIONS).map(([key,r])=>({
          key,
          label: r.label,
          filled: Object.keys(data).filter(k=>k.startsWith("kc_"+key+"_")&&data[k]).length,
        }))}
        active={region}
        onSelect={k=>{setRegion(k);setOpenTest(null);setShowIntro(false);}}
      />

      {/* Region intro — collapsible, desktop only */}
      <div className="pm-desktop-only" style={{ border:`1px solid ${reg.color}25`, borderRadius:10, marginBottom:14, overflow:"hidden" }}>
        <div onClick={()=>setShowIntro(p=>!p)}
          style={{ background:`${reg.color}08`, padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ padding:"2px 8px", borderRadius:8, background:`${roleColor(reg.role)}20`, color:roleColor(reg.role), fontSize:"0.75rem", fontWeight:700 }}>{reg.role}</span>
            <span style={{ fontSize:"0.82rem", fontWeight:700, color:C.text }}>{reg.label} — About this region</span>
          </div>
          <span style={{ color:C.muted, fontSize:"0.75rem" }}>{showIntro?"▲":"▼"}</span>
        </div>
        {showIntro && (
          <div style={{ padding:"10px 12px", background:`${reg.color}04`, fontSize:"0.8rem", color:C.text, lineHeight:1.7 }}>
            {reg.intro}
          </div>
        )}
      </div>

      {/* Tests */}
      {reg.tests.map((t)=>{
        const currentVal = data[t.id] || "";
        const currentOption = t.options.find(o=>o.val===currentVal);
        const isOpen = openTest === t.id;

        return (
          <div key={t.id} data-kc-id={t.id} style={{ background:C.surface, border:`1px solid ${currentVal?reg.color+"40":C.border}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
            {/* Header */}
            <div onClick={()=>setOpenTest(isOpen?null:t.id)}
              style={{ padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${currentVal?reg.color:"#1a2d45"}` }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:3 }}>
                  <span style={{ fontSize:"0.8rem", padding:"2px 7px", borderRadius:7, background:`${roleColor(t.role.split(" ")[0])}20`, color:roleColor(t.role.split(" ")[0]), fontWeight:700 }}>{t.role}</span>
                  <span style={{ fontSize:"0.8rem", color:C.muted }}>Joint: {t.joint}</span>
                </div>
                <div style={{ fontWeight:700, fontSize:"0.88rem", color:C.text }}>{t.label}</div>
                {currentVal && (
                  <div style={{ marginTop:5, display:"inline-flex", alignItems:"center", gap:6, padding:"2px 8px", borderRadius:8, background:`${currentOption?.color||C.muted}18`, border:`1px solid ${currentOption?.color||C.muted}40` }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:currentOption?.color||C.muted }} />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:currentOption?.color||C.muted }}>{currentVal}</span>
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, marginLeft:10 }}>
                <button type="button" onClick={e=>{ e.stopPropagation(); setModalTest(t); }}
                  style={{ padding:"3px 10px", background:"rgba(127,90,240,0.15)", border:`1px solid ${C.a2}40`, borderRadius:6, color:C.a2, fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                  ℹ How to Test
                </button>
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>

            {/* Body */}
            {isOpen && (
              <div style={{ padding:"0 14px 14px" }}>

                {/* How to */}
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, padding:12, marginBottom:12 }}>
                  <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>👐 How to Perform</div>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <SmallClinicalImg id={t.id} title={t.label} />
                    <div style={{ fontSize:"0.8rem", color:C.text, lineHeight:1.7, flex:1 }}>{t.how}</div>
                  </div>
                </div>

                {/* Options */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>📊 Select Finding — What Each Result Means</div>
                  {t.options.map(opt=>(
                    <div key={opt.val} onClick={()=>set(t.id, currentVal===opt.val?"":opt.val)}
                      style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 12px", borderRadius:9, marginBottom:7, cursor:"pointer", border:`1px solid ${currentVal===opt.val?opt.color:C.border}`, background:currentVal===opt.val?`${opt.color}12`:"transparent", transition:"all 0.15s" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${opt.color}`, background:currentVal===opt.val?opt.color:"transparent", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {currentVal===opt.val && <span style={{ color:"#000", fontSize:"0.75rem", fontWeight:900 }}>✓</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:"0.8rem", color:opt.color, marginBottom:3 }}>{opt.val}</div>
                        <div style={{ fontSize:"0.76rem", color:C.text, lineHeight:1.6 }}>{opt.meaning}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chain Effect */}
                <div style={{ background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.2)", borderRadius:8, padding:11, marginBottom:10 }}>
                  <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>⛓️ Kinetic Chain Effect</div>
                  <div style={{ fontSize:"0.77rem", color:C.text, lineHeight:1.6 }}>{t.chainEffect}</div>
                </div>

                {/* Treatment */}
                <div style={{ background:`${reg.color}08`, border:`1px solid ${reg.color}25`, borderRadius:8, padding:11 }}>
                  <div style={{ fontSize:"0.73rem", fontWeight:700, color:reg.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>→ Treatment Protocol</div>
                  <div style={{ fontSize:"0.77rem", color:C.text, lineHeight:1.7 }}>{t.treatment}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal */}
      {modalTest && (
        <div onClick={()=>setModalTest(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${reg.color}50`, borderRadius:14, padding:24, maxWidth:560, width:"100%", maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, color:reg.color, fontSize:"1rem" }}>{modalTest.label}</div>
                <div style={{ fontSize:"0.8rem", color:C.muted, marginTop:3 }}>{modalTest.joint} · {modalTest.role}</div>
              </div>
              <button onClick={()=>setModalTest(null)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>👐 How to Perform</div>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <SmallClinicalImg id={modalTest.id} title={modalTest.label} />
                <div style={{ background:C.s2, borderRadius:8, padding:14, fontSize:"0.82rem", color:C.text, lineHeight:1.8, flex:1 }}>{modalTest.how}</div>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.a3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>📊 What Each Result Means</div>
              {modalTest.options.map(opt=>(
                <div key={opt.val} style={{ padding:"8px 12px", borderRadius:8, marginBottom:7, border:`1px solid ${opt.color}30`, background:`${opt.color}08` }}>
                  <div style={{ fontWeight:700, fontSize:"0.78rem", color:opt.color, marginBottom:3 }}>{opt.val}</div>
                  <div style={{ fontSize:"0.76rem", color:C.text, lineHeight:1.6 }}>{opt.meaning}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.2)", borderRadius:8, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>⛓️ Kinetic Chain Effect</div>
              <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.6 }}>{modalTest.chainEffect}</div>
            </div>

            <div style={{ background:`${reg.color}08`, border:`1px solid ${reg.color}25`, borderRadius:8, padding:12, marginBottom:16 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:reg.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>→ Treatment Protocol</div>
              <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.7 }}>{modalTest.treatment}</div>
            </div>

            <button onClick={()=>setModalTest(null)} style={{ width:"100%", padding:"9px", background:C.a2, border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── FUNCTIONAL MOVEMENT ANALYSIS ENGINE ─────────────────────────────────────


// Movement definitions
const MOVEMENTS = {
  squat:{
    label:"Bilateral Squat", icon:"🏋️",
    description:"Bilateral weightbearing — tests global lower limb and core mechanics. Most comprehensive lower body screen.",
    howToObserve:"Patient performs 3 bodyweight squats to comfortable depth. Observe from anterior (knee alignment, trunk), lateral (trunk lean, heel rise, pelvic tilt), and posterior (pelvic drop, foot pronation). Ask patient to go as deep as comfortable. Repeat in slow motion.",
    checklistKeys:["knee_valgus","knee_varus","heel_rise","anterior_pelvic_tilt","posterior_pelvic_tilt","trunk_lean_forward","foot_pronation","foot_supination","limited_depth","lumbar_flexion_comp","lumbar_extension_comp","pain_avoidance","asymmetric_loading"],
  },
  gait:{
    label:"Gait Analysis", icon:"🚶",
    description:"Walking pattern — reveals chronic compensation patterns. Observe at normal walking speed. 10+ steps each way.",
    howToObserve:"Observe from posterior (pelvic drop, trunk lean, foot pronation), anterior (knee alignment, arm swing), and lateral (trunk lean, heel strike, push-off pattern). Ask patient to walk 10m away and 10m back at natural pace. Observe 3 cycles each view.",
    checklistKeys:["pelvic_drop","foot_pronation","trunk_lean_lateral","asymmetric_loading","pain_avoidance","instability","knee_valgus"],
  },
  single_leg:{
    label:"Single Leg Stance", icon:"🦶",
    description:"Highest demand test for lumbopelvic and lower limb stability. Reveals deficits not seen in bilateral tasks.",
    howToObserve:"Patient stands on one leg with contralateral knee raised to 90° hip flexion. Hold 30 seconds each side. Observe: pelvic level, trunk position, knee alignment, foot arch, wobbling. Compare sides. Eyes open first, then closed.",
    checklistKeys:["pelvic_drop","knee_valgus","instability","trunk_lean_lateral","foot_pronation","pain_avoidance"],
  },
  lunge:{
    label:"Forward Lunge", icon:"🤸",
    description:"Split stance — tests asymmetric loading, hip mobility, and frontal plane control. Step forward 2–3 feet.",
    howToObserve:"Patient performs 3 forward lunges each side. Observe from anterior (knee alignment, pelvic level), lateral (trunk position, heel rise, lumbar), and posterior (foot position, pelvic drop). Compare left vs right sides.",
    checklistKeys:["knee_valgus","trunk_lean_forward","heel_rise","lumbar_extension_comp","lumbar_flexion_comp","anterior_pelvic_tilt","pelvic_drop","asymmetric_loading","pain_avoidance"],
  },
  overhead:{
    label:"Overhead Reach", icon:"🙌",
    description:"Tests integrated shoulder, thoracic, and cervical mechanics. Both arms simultaneously overhead.",
    howToObserve:"Patient reaches both arms straight overhead against a wall. Observe from anterior (arm symmetry, shoulder elevation, trunk lean) and lateral (thoracic extension, head position, lumbar arch). Also observe arm elevation from side — when does scapula start rotating?",
    checklistKeys:["limited_depth","shoulder_elevation","scapular_winging","forward_head","lumbar_extension_comp","trunk_lean_forward","asymmetric_loading","pain_avoidance"],
  },
  bend:{
    label:"Forward Bending", icon:"🙇",
    description:"Standing forward bend — tests hip hinge pattern, SBL chain, and neural tension. Critical for LBP assessment.",
    howToObserve:"Patient bends forward reaching hands toward floor. Observe from lateral (where does motion initiate — hip or lumbar?), posterior (trunk shift left/right, spinal curvature), and at end range. Observe motion returning to upright — any reversal of lurch?",
    checklistKeys:["lumbar_flexion_comp","trunk_shift","foot_pronation","pain_avoidance","knee_valgus","limited_depth"],
  },
  step_down:{
    label:"Step-Down Test", icon:"🪜",
    description:"Single-leg eccentric control — highest sensitivity test for hip abductor weakness and dynamic knee valgus. Critical for PFJ, ITB and hip assessment.",
    howToObserve:"Patient stands on a 20cm step on one leg, arms crossed on chest. Slowly lower contralateral foot toward floor, touch lightly, return to start. 5 reps each side. Observe from anterior (knee alignment, pelvic drop, trunk lean) and from 45° angle. Time to complete 5 reps each side.",
    checklistKeys:["knee_valgus","pelvic_drop","trunk_lean_lateral","trunk_lean_forward","foot_pronation","pain_avoidance","instability","knee_varus","asymmetric_loading"],
  },
  pushup_plus:{
    label:"Push-Up Plus (Scapular Control)", icon:"💪",
    description:"Scapular protraction control — tests serratus anterior and lower trapezius function. Essential for shoulder, thoracic, and cervical assessment.",
    howToObserve:"Patient performs standard push-up position (or modified on knees for reduced capacity). At the top of the push-up, add an extra 'plus' — push thorax away from floor by protracting scapulae maximally. Observe from posterior: scapular symmetry, winging, position. 5 reps. Can also perform against wall for assessment only.",
    checklistKeys:["scapular_winging","shoulder_elevation","asymmetric_loading","pain_avoidance","forward_head","trunk_rotation","instability","limited_depth"],
  },
  rotary_stability:{
    label:"Rotary Stability", icon:"🔄",
    description:"Multi-planar trunk stability — tests neuromuscular coordination between upper and lower limbs through trunk. Modified FMS pattern. Very sensitive for core stability deficits.",
    howToObserve:"Patient on hands and knees (quadruped), spine neutral. Extend ipsilateral arm and ipsilateral leg simultaneously (same side) to horizontal. Hold 2 seconds. Return. Then attempt diagonal (opposite arm/leg). 3 attempts each side. Observe: spine rotation, pelvis drop, loss of neutral, tremor. Score: diagonal pattern first — if cannot do ipsilateral.",
    checklistKeys:["trunk_rotation","pelvic_drop","instability","asymmetric_loading","limited_depth","tremor_shaking","pain_avoidance","forward_head"],
  },
  upper_reach:{
    label:"Upper Limb Functional Reach", icon:"🙌",
    description:"Upper limb mobility and shoulder complex function — tests combined cervical rotation, shoulder flexion/elevation, and scapular control in functional reach pattern.",
    howToObserve:"Patient seated or standing. Ask to reach one arm forward maximally (shoulder flexion 180° if possible), then diagonally across midline, then to the side (abduction), then reach behind back (IR). Compare sides. Note: pain, restricted range, scapular winging, or compensatory trunk movement at each direction. Also test combined: reach overhead while rotating head — tests cervical-shoulder coupling.",
    checklistKeys:["shoulder_elevation","scapular_winging","asymmetric_loading","pain_avoidance","limited_depth","trunk_rotation","forward_head","trunk_lean_lateral"],
  },
};




export { KineticChainSection, MOVEMENTS };
