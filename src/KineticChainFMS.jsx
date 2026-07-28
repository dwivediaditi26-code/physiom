// KineticChainFMS.jsx — Kinetic Chain section + FMS camera / movement analysis
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes).
import React, { useState, useEffect, useRef } from "react";
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

// All compensation options with their rule-based analysis
const COMPENSATIONS = {
  knee_valgus:         { label:"Knee Valgus", icon:"🦵", color:"#ff4d6d" },
  knee_varus:          { label:"Knee Varus", icon:"🦵", color:"#ff8c42" },
  pelvic_drop:         { label:"Pelvic Drop", icon:"🍑", color:"#ff4d6d" },
  anterior_pelvic_tilt:{ label:"Anterior Pelvic Tilt", icon:"🍑", color:"#ffb300" },
  posterior_pelvic_tilt:{ label:"Posterior Pelvic Tilt", icon:"🍑", color:"#ffb300" },
  trunk_lean_forward:  { label:"Trunk Lean Forward", icon:"🏋️", color:"#ff8c42" },
  trunk_lean_lateral:  { label:"Trunk Lean Lateral", icon:"↔️", color:"#ff8c42" },
  trunk_shift:         { label:"Trunk Shift", icon:"↕️", color:"#ffb300" },
  foot_pronation:      { label:"Foot Pronation", icon:"👣", color:"#ff8c42" },
  foot_supination:     { label:"Foot Supination", icon:"👣", color:"#ffb300" },
  heel_rise:           { label:"Heel Rise", icon:"👟", color:"#ff4d6d" },
  asymmetric_loading:  { label:"Asymmetric Loading", icon:"⚖️", color:"#ff4d6d" },
  instability:         { label:"Instability / Wobbling", icon:"⚡", color:"#ff4d6d" },
  limited_depth:       { label:"Limited Depth / ROM", icon:"📏", color:"#ffb300" },
  scapular_winging:    { label:"Scapular Winging", icon:"🪶", color:"#ff4d6d" },
  lumbar_flexion_comp: { label:"Lumbar Flexion Compensation", icon:"🔩", color:"#ff4d6d" },
  lumbar_extension_comp:{ label:"Lumbar Extension Compensation", icon:"🔩", color:"#ffb300" },
  pain_avoidance:      { label:"Pain Avoidance Movement", icon:"⚠️", color:"#ff4d6d" },
  forward_head:        { label:"Forward Head", icon:"🗣️", color:"#ffb300" },
  shoulder_elevation:  { label:"Shoulder Elevation", icon:"🫱", color:"#ffb300" },
  trunk_rotation:      { label:"Trunk Rotation", icon:"🔄", color:"#ff4d6d" },
  tremor_shaking:      { label:"Tremor / Shaking", icon:"〰️", color:"#ff8c42" },
};

// Rule-based analysis engine
const RULES = {
  // SQUAT
  squat:{
    knee_valgus:{
      weak:["Gluteus Medius","Gluteus Maximus","VMO (Vastus Medialis Oblique)"],
      tight:["IT Band","TFL (Tensor Fascia Latae)","Adductors","Gastrocnemius"],
      deficit:"Stability deficit — hip abductor weakness + ankle mobility",
      kinetic:"Ankle DF restriction → tibial IR → knee collapse. Glute med inhibited → TFL overactive → valgus.",
      root:"Glute Med inhibition (CPA) + Ankle DF restriction (kinetic chain). Treat ankle first, then activate glute med.",
      risk:["Medial knee ligaments (MCL)","ACL (lateral ground reaction force)","Medial meniscus","Patellofemoral joint"],
      assess:["Ankle DF lunge test","CPA Glute Med","Trendelenburg test","Ober's test (TFL)","VMO timing during terminal extension"],
      exercises:["Ankle DF mobility: wall lunge drill × 3 min daily","Clamshells (glute med isolation)","Lateral band walks","Terminal knee extension (VMO)","Single-leg squat progression"],
      progression:["Week 1–2: Ankle mobility + clamshells","Week 3–4: Goblet squat with cue","Week 5–6: Single-leg squat","Week 7+: Loaded squat with knee alignment feedback"],
    },
    knee_varus:{
      weak:["Adductors","Medial Hamstrings","Gastrocnemius medial head"],
      tight:["IT Band","Biceps Femoris","Lateral Gastrocnemius"],
      deficit:"Mobility deficit — lateral chain tightness",
      kinetic:"Lateral line (LL) restriction — IT band + lateral calf pulling tibia into varus.",
      root:"Lateral line fascial restriction (LL) + lateral hamstring overactivity. Release IT band first.",
      risk:["Lateral knee compartment","LCL","Lateral meniscus","Fibular head"],
      assess:["Noble compression test (IT band)","Ober's test","Lateral LL assessment","Ankle supination check"],
      exercises:["IT band SMR (foam roll)","TFL release","Adductor strengthening","Single-leg squat with medial cue"],
      progression:["Week 1: IT band SMR daily","Week 2: Adductor activation","Week 3: Squat with band cue","Week 4+: Loaded squat"],
    },
    heel_rise:{
      weak:["Tibialis Anterior","Deep Ankle Dorsiflexors"],
      tight:["Gastrocnemius","Soleus","Posterior Ankle Capsule","Achilles Tendon"],
      deficit:"Mobility deficit — ankle dorsiflexion restriction (primary driver)",
      kinetic:"Ankle DF restricted → heel rises → trunk leans forward → knees push forward → anterior pelvic tilt. ENTIRE chain disrupted by one ankle restriction.",
      root:"Gastrocnemius/soleus fascial restriction + possible posterior ankle capsule tightness. This is MOBILITY not weakness.",
      risk:["Achilles tendon","Plantar fascia","Patellar tendon","Lumbar discs (flexion load)"],
      assess:["Weight-bearing lunge test (DF)","Subtalar mobility","SBL tension test","Passive ankle DF measurement"],
      exercises:["Wall lunge DF drill × 3 min","Eccentric heel drops (soleus)","Gastrocnemius stretch × 3 × 30 sec","Talocrural posterior glide mobilisation","Ankle DF strengthening (tibialis anterior)"],
      progression:["Week 1–2: Ankle mobility daily (priority)","Week 3: Squat with heel elevation (board) + mobility","Week 4–5: Remove heel elevation","Week 6+: Full squat with normal heel contact"],
    },
    anterior_pelvic_tilt:{
      weak:["Gluteus Maximus","Abdominals (TA, RA)","Hamstrings"],
      tight:["Iliopsoas","Rectus Femoris","Lumbar Extensors"],
      deficit:"Both: hip flexor tightness (mobility) + glute/core weakness (stability)",
      kinetic:"Hip flexors pull ASIS forward → pelvis tilts → lumbar extends → facet loading. Classic LCS pattern.",
      root:"Lower Crossed Syndrome. Psoas overactive (CPA) + Glute max inhibited. Thomas test will confirm.",
      risk:["Lumbar facet joints","L4/L5 disc","Anterior hip labrum"],
      assess:["Thomas test","CPA Gluteus Maximus","LCS postural assessment","Prone instability test"],
      exercises:["Couch stretch (hip flexors)","TA drawing-in manoeuvre","Glute bridges (glute activation priority)","Dead bug","Hip hinge retraining (waiter's bow)"],
      progression:["Week 1–2: Hip flexor release + glute activation","Week 3–4: Bridge progression","Week 5–6: Hinge pattern (RDL)","Week 7+: Squat with pelvic neutral cue"],
    },
    trunk_lean_forward:{
      weak:["Spinal Extensors","Thoracic Extensors","Hip Extensors (Glutes)"],
      tight:["Hip Flexors","Thoracic Flexors","Ankle DF restriction (driving lean)"],
      deficit:"Mobility + stability: ankle restriction drives lean; thoracic kyphosis limits extension",
      kinetic:"Ankle DF restriction OR hip flexor tightness OR thoracic kyphosis — any of these drives trunk lean forward in squat. Must identify primary driver.",
      root:"Test: squat with heels elevated — if lean resolves, ankle is primary. Squat with arm support — if lean resolves, thoracic extension is primary.",
      risk:["Lumbar discs (shear)","Patellar tendon","Anterior hip capsule"],
      assess:["Ankle DF lunge test","Thoracic extension mobility","Thomas test","FMS Deep Squat"],
      exercises:["Address primary driver first (ankle or thoracic)","Thoracic extension: foam roller + wall angel","Goblet squat (counterweight helps trunk position)"],
      progression:["Week 1: Identify and address primary driver","Week 2: Goblet squat with cue","Week 3–4: Bodyweight squat with improvement","Week 5+: Loaded squat"],
    },
    foot_pronation:{
      weak:["Tibialis Posterior","Foot Intrinsics","Peroneus Longus"],
      tight:["Gastrocnemius","Achilles tendon","Peroneus Brevis"],
      deficit:"Stability deficit (foot) + mobility deficit (ankle) driving compensatory pronation",
      kinetic:"Foot pronates → tibial IR → knee valgus → hip IR → anterior pelvic tilt. Chain from foot to pelvis.",
      root:"Tibialis posterior inhibited (CPA) + ankle DF restriction → foot collapses medially to gain pseudo-dorsiflexion.",
      risk:["Tibialis posterior tendon","Plantar fascia","Medial ankle ligaments","Medial knee (MCL, medial meniscus)"],
      assess:["Navicular drop test","CPA Tibialis Posterior","Ankle DF lunge test","Subtalar mobility"],
      exercises:["Short foot exercise × 20 reps","Heel raise with inversion (tib post)","Ankle DF mobility","Intrinsic foot strengthening"],
      progression:["Week 1: Short foot + tib post","Week 2: Squat with arch awareness","Week 3: Single-leg stance on arch","Week 4+: Functional squat"],
    },
    limited_depth:{
      weak:["Hip Flexors (cannot eccentrically load)","Ankle DF"],
      tight:["Hip Capsule","Ankle DF restriction","Thoracic Spine"],
      deficit:"Mobility deficit primary — ankle, hip, or thoracic restriction",
      kinetic:"Ankle DF limits depth most commonly. Hip capsule restriction second. Thoracic extension third.",
      root:"Test: squat with heels elevated (↑ if ankle). Squat with hands overhead (↑ if thoracic). Assess sequentially.",
      risk:["Knee compressive load at limited range","Hip labrum if hip restriction"],
      assess:["Ankle DF lunge test","Hip IR mobility","Thoracic extension test","FMS Deep Squat"],
      exercises:["Identify the limiting joint and mobilise it","Ankle: wall lunge × 3 min daily","Hip: 90-90 stretch","Thoracic: foam roller extension + rotation"],
      progression:["Mobility work for 2 weeks first","Then add depth gradually","Box squat at achievable depth → lower box progressively"],
    },
    lumbar_flexion_comp:{
      weak:["Lumbar Multifidus","Transversus Abdominis","Hip Extensors"],
      tight:["Hamstrings","Hip Capsule"],
      deficit:"Stability deficit — lumbar flexion when hips cannot flex sufficiently",
      kinetic:"Hip mobility restriction → lumbar compensates with flexion → disc loading increases. Classic hip-lumbar compensation.",
      root:"Hip flexion mobility restriction (capsule or hamstrings) forces lumbar into flexion. TREAT HIP, not just lumbar.",
      risk:["L4/L5 and L5/S1 discs","Lumbar posterior ligaments"],
      assess:["Hip flexion ROM","Thomas test","90-90 test (hamstrings)","Prone instability test"],
      exercises:["Hip mobility first (90-90 stretch, pigeon)","Then hip hinge retraining (waiter's bow)","Core stability: TA + multifidus","Squat depth to pain-free range only"],
      progression:["Week 1–2: Hip mobility","Week 3–4: Hip hinge pattern","Week 5+: Squat with lumbar neutral cue"],
    },
  },

  // GAIT
  gait:{
    pelvic_drop:{
      weak:["Gluteus Medius","Gluteus Minimus","TFL (stabilising role)"],
      tight:["Contralateral QL","Ipsilateral adductors"],
      deficit:"Stability deficit — lateral pelvic stabilisers insufficient for single-leg stance",
      kinetic:"Glute med inhibited → QL elevates pelvis on swing side → lateral trunk lean → medial knee overload on stance side.",
      root:"Glute Med inhibition (CPA primary finding). Trendelenburg sign positive. TFL overactive as compensator.",
      risk:["Medial knee (stance side)","SIJ (asymmetric loading)","Lumbar discs (lateral shear)","IT band (swing side)"],
      assess:["Trendelenburg test","CPA Glute Med","Hip abduction firing order","Single-leg stance test"],
      exercises:["Clamshells (glute med — must be in slight extension, not flexion)","Side-lying hip abduction","Lateral band walks","Single-leg stance with level pelvis cue","Step-ups with pelvic level focus"],
      progression:["Week 1: Clamshells + TFL release","Week 2: Side-lying abduction","Week 3: Single-leg stance 30 sec","Week 4: Step-ups","Week 5+: Running with pelvic level cue"],
    },
    foot_pronation:{
      weak:["Tibialis Posterior","Intrinsic Foot Muscles"],
      tight:["Gastrocnemius/Soleus","Peroneals (overactive)"],
      deficit:"Stability deficit (foot) — medial arch fails during push-off",
      kinetic:"Foot pronates at push-off → tibia internally rotates → knee valgus → hip adduction → LBP. Per step repetition makes this highly injurious.",
      root:"Tibialis posterior inhibited (CPA). Overactive peroneals compensating. Gastrocnemius restriction reducing DF → compensatory pronation.",
      risk:["Tibialis posterior tendon (progressive rupture)","Plantar fascia","Medial knee","Shin splints (tib ant reactive)"],
      assess:["CPA Tibialis Posterior","Navicular drop","Ankle DF lunge test","Subtalar mobility"],
      exercises:["Short foot exercise integrated into walking","Heel raises with inversion","Ankle DF mobility (reduce compensatory pronation)"],
      progression:["Short foot walking practice","Barefoot training on varied surfaces","Orthotic if navicular drop >10mm","Reduce pronation before increasing gait speed/load"],
    },
    trunk_lean_lateral:{
      weak:["Contralateral Gluteus Medius","Ipsilateral QL (lateral stabiliser)"],
      tight:["Ipsilateral QL","Contralateral lateral trunk"],
      deficit:"Stability deficit — compensatory trunk lean to reduce hip abductor demand",
      kinetic:"Glute med weak → patient reduces load on hip abductor by leaning trunk over stance leg (reduces moment arm). Classic gluteus medius lurch.",
      root:"Glute Med weakness/inhibition. Patient self-protecting by reducing mechanical demand on weak muscle. This is a STRATEGY, not a structural problem.",
      risk:["Lumbar spine (repeated lateral bending)","Contralateral SI joint","Ipsilateral IT band"],
      assess:["Trendelenburg test","CPA Glute Med","Single-leg stance","Hip abduction strength MMT"],
      exercises:["Glute med activation (clamshells, sidelying abduction)","Single-leg stance with upright trunk constraint (standing near wall)","Lateral step-ups with level pelvis"],
      progression:["Week 1–2: Glute med isolation","Week 3: Single-leg with upright cue","Week 4+: Walking retraining with pelvis level"],
    },
    asymmetric_loading:{
      weak:["Ipsilateral Glute Max/Med","Core stabilisers on affected side"],
      tight:["Contralateral hip structures","Scar tissue / adhesions"],
      deficit:"Both: unilateral strength deficit + possible structural driver (pain, scar, LLD)",
      kinetic:"Asymmetric loading creates cumulative asymmetric joint stress. Over 10,000 steps/day this becomes injurious quickly.",
      root:"Identify side of reduced loading (pain avoidance, weakness, leg length discrepancy, or scar adhesion limiting that side).",
      risk:["Overloaded side: knee, hip, SIJ","Underloaded side: atrophy, bone density loss"],
      assess:["Single-leg stance each side","FMA single-leg squat","Leg length measurement","Pain provocation tests on both sides"],
      exercises:["Address the cause of asymmetry","If pain: pain management first","If weakness: strengthen deficient side","Symmetry cue during gait retraining"],
      progression:["Equal time on both feet","Mirror feedback during gait","Treadmill gait analysis if available"],
    },
    pain_avoidance:{
      weak:["Variable — dependent on pain source"],
      tight:["Variable — dependent on pain source"],
      deficit:"Pain-driven compensation — neurological protective mechanism",
      kinetic:"Pain inhibits normal motor program via pain-motor interaction (Hodges & Moseley model). The movement pattern is changed to unload the painful structure.",
      root:"Identify the pain source FIRST. Pain avoidance movement is a symptom, not a cause. Treat pain → motor pattern often self-corrects.",
      risk:["Compensated structures: risk of secondary overuse injury","Prolonged avoidance leads to cortical motor map changes (persistent movement dysfunction even after pain resolves)"],
      assess:["Identify pain source via special tests","Visual analog scale (VAS)","Pain provocation testing","Palpation of suspected structure"],
      exercises:["Pain management first (modalities, manual therapy)","Graded exposure: small doses of normal movement","Motor relearning after pain resolves"],
      progression:["Pain < 3/10 for exercise","Graded exposure to normal pattern","Full pattern once pain-free"],
    },
  },

  // SINGLE LEG STANCE
  single_leg:{
    instability:{
      weak:["Gluteus Medius","Tibialis Anterior","Peroneals","Deep Ankle Stabilisers","Core (TA, multifidus)"],
      tight:["Ankle DF restriction limiting base of support"],
      deficit:"Multi-level stability deficit — ankle, hip, and core all contributing",
      kinetic:"Ankle proprioception + glute med + core ALL required for single-leg stability. Failure in any one creates instability.",
      root:"Identify the PRIMARY level of instability: ankle (foot wobbles), knee (knee shakes), hip (pelvis drops), or trunk (trunk sways). Treat the lowest level first.",
      risk:["Ankle (repeated micro-sprains)","Knee (meniscus/ACL stress)","SIJ","Lumbar"],
      assess:["Single-leg stance with eyes open/closed (Romberg variation)","Star Excursion Balance Test (SEBT)","CPA Glute Med + Tibialis Ant","Ankle anterior drawer"],
      exercises:["Ankle: single-leg balance on foam pad","Glute med: clamshells → sidelying abduction → SLS","Core: TA activation during SLS","Progress: eyes open → eyes closed → unstable surface"],
      progression:["Week 1: SLS eyes open on floor 30 sec","Week 2: Eyes closed","Week 3: Foam pad","Week 4: Added perturbation","Week 5+: Sport-specific"],
    },
    pelvic_drop:{
      weak:["Gluteus Medius (ipsilateral)"],
      tight:["Contralateral QL — compensating for glute med weakness"],
      deficit:"Stability deficit — pure glute med failure",
      kinetic:"Glute med cannot hold pelvis level → contralateral pelvis drops → lateral trunk shift → knee valgus loading. Trendelenburg equivalent.",
      root:"Glute Med inhibited (CPA). Confirm with palpation during SLS — glute med fires late or minimally. TFL and QL compensating.",
      risk:["Medial knee","SIJ","Lumbar lateral shear","IT band"],
      assess:["Trendelenburg test","CPA Glute Med","Hip abduction firing order","MMT Glute Med"],
      exercises:["Clamshells (slight hip extension position)","Lateral band walks","SLS with pelvis level cue","Step-downs with pelvic control focus"],
      progression:["Isolation → functional → sport-specific over 6 weeks"],
    },
    knee_valgus:{
      weak:["Gluteus Medius","VMO","Hip External Rotators"],
      tight:["TFL","IT Band","Adductors"],
      deficit:"Stability deficit — multi-level valgus during high-demand single-leg task",
      kinetic:"Same as squat valgus but at higher load (full body weight single leg). ACL injury risk position.",
      root:"Glute Med + VMO both insufficient for single-leg demand. Ankle DF restriction often contributing. Highest injury risk position.",
      risk:["ACL","MCL","Medial meniscus","Patellofemoral joint (high stress)"],
      assess:["CPA Glute Med","VMO timing","Ankle DF lunge test","Patellofemoral assessment"],
      exercises:["Progress glute med and VMO BEFORE single-leg loading","SLS with band at knee (resist valgus)","Step-down with alignment mirror feedback"],
      progression:["Do NOT load until glute med ≥4/5 and VMO firing correctly"],
    },
  },

  // LUNGE
  lunge:{
    knee_valgus:{
      weak:["Gluteus Medius","VMO","Hip External Rotators"],
      tight:["TFL","IT Band","Adductors"],
      deficit:"Stability deficit — frontal plane control insufficient for split-stance load",
      kinetic:"Lunge places high demand on frontal plane stability. Glute med must eccentrically control pelvic drop AND knee alignment simultaneously.",
      root:"Glute med + VMO insufficient. Check if worse with front or back leg — identifies which side is primary weakness.",
      risk:["Medial knee structures","Patellofemoral joint","ACL risk in sport context"],
      assess:["Trendelenburg test","CPA Glute Med","VMO assessment","Ankle DF (if heel rises in lunge)"],
      exercises:["Reverse lunge (lower demand than forward lunge)","Split squat with support","Glute med focus before progressing to lunge"],
      progression:["Split squat → reverse lunge → forward lunge → walking lunge → loaded lunge"],
    },
    trunk_lean_forward:{
      weak:["Hip Extensors","Thoracic Extensors"],
      tight:["Hip Flexors (front leg)","Thoracic flexors"],
      deficit:"Mobility + stability: hip flexor tightness on back leg limits upright torso",
      kinetic:"Back hip flexor tight → pelvis tips anterior → trunk leans forward → lumbar extends. Front hip must extend from compromised position.",
      root:"Back leg hip flexor (iliopsoas) tight. Thomas test on that side positive. Release hip flexor → lunge trunk position improves.",
      risk:["Back leg: anterior hip capsule","Lumbar facets","Front leg: patellar tendon"],
      assess:["Thomas test","Hip extension ROM","CPA Psoas","FMS In-Line Lunge"],
      exercises:["Couch stretch (back leg hip flexor)","Half-kneeling hip flexor stretch","Then lunge with upright trunk cue"],
      progression:["Mobility before lunge loading","Half-kneeling → static lunge → walking lunge"],
    },
    heel_rise:{
      weak:["Tibialis Anterior (front leg)"],
      tight:["Gastrocnemius/Soleus","Posterior Ankle Capsule"],
      deficit:"Mobility deficit — ankle DF restriction on front leg",
      kinetic:"Front leg heel rises → knee shifts forward → anterior knee shear force increases → patellar tendon overloaded.",
      root:"Ankle DF restricted on lunge front foot. Same driver as in squat heel rise. TREAT ANKLE FIRST.",
      risk:["Patellar tendon","Anterior knee cartilage","Achilles tendon"],
      assess:["Ankle DF lunge test (front foot)","Passive ankle DF","Gastrocnemius tightness"],
      exercises:["Ankle mobility drill before lunge practice","Elevate heel temporarily (remove once mobility restored)"],
      progression:["Heel elevation → reduce elevation over weeks → normal lunge"],
    },
    lumbar_extension_comp:{
      weak:["Core (TA, obliques)","Glute Max (back leg)"],
      tight:["Hip Flexors","Thoracolumbar Extensors"],
      deficit:"Both: core stability insufficient for split-stance + hip flexor driving lumbar into extension",
      kinetic:"Back leg hip flexor pulls ASIS forward in lunge → lumbar extends → facet compression. Core must resist this but is insufficient.",
      root:"LCS pattern + core instability. Psoas tight + TA weak. Release psoas → activate TA → lunge position improves.",
      risk:["Lumbar facet joints (extension + compression)","L4/L5 disc"],
      assess:["Thomas test","Prone instability test","TA activation assessment","CPA Psoas"],
      exercises:["TA activation before lunge","Hip flexor stretching (back leg)","Half-kneeling lunge with posterior pelvic tilt cue"],
      progression:["Half-kneeling with pelvic neutral → static lunge → dynamic lunge"],
    },
  },

  // OVERHEAD REACH
  overhead:{
    limited_depth:{
      weak:["Shoulder External Rotators","Lower Trapezius","Serratus Anterior"],
      tight:["Pectoralis Minor","Upper Trapezius","Thoracic Spine (kyphosis)","Posterior GH Capsule","Latissimus Dorsi"],
      deficit:"Both: thoracic mobility deficit + shoulder complex mobility/stability",
      kinetic:"Thoracic kyphosis → scapula cannot upwardly rotate → GH must compensate → impingement. Or posterior capsule → GIRD → overhead limited.",
      root:"Test: if thoracic extension improves overhead reach → thoracic is primary. If not → shoulder complex (posterior capsule, lat, pec minor) is primary.",
      risk:["Supraspinatus (impingement)","Biceps long head","Anterior labrum (forced overhead)"],
      assess:["Thoracic extension test","GH IR (GIRD)","Scapular dyskinesis","Wall angel test","FMS Shoulder Mobility"],
      exercises:["Thoracic foam roller extension daily","Wall angel × 15 reps","Pec minor release","Lat stretch","Sleeper stretch (if GIRD)"],
      progression:["Thoracic mobility → scapular stability → GH mobility → integrated overhead"],
    },
    shoulder_elevation:{
      weak:["Lower Trapezius","Serratus Anterior","Rotator Cuff (IR/ER balance)"],
      tight:["Upper Trapezius","Levator Scapulae"],
      deficit:"Stability deficit — upper trap dominant, lower trap inhibited (UCS pattern)",
      kinetic:"Upper trap fires first → shoulder rises → scapula cannot upwardly rotate properly → impingement zone narrows → pain with overhead.",
      root:"UCS pattern. CPA: lower trap inhibited → upper trap overactive. Scapulohumeral rhythm disrupted — shoulder rises before arm reaches 90°.",
      risk:["Supraspinatus","Biceps long head","AC joint","Subacromial bursa"],
      assess:["Scapulohumeral rhythm assessment","CPA Lower Trapezius","CPA Serratus Anterior","Scapular dyskinesis classification"],
      exercises:["Upper trap SMR first","Prone Y-exercise (lower trap)","Serratus punch","Arm elevation pattern retraining (no shrug cue)"],
      progression:["Release → activate → retrain elevation pattern over 4–6 weeks"],
    },
    scapular_winging:{
      weak:["Serratus Anterior","Lower Trapezius"],
      tight:["Pectoralis Minor"],
      deficit:"Stability deficit — serratus anterior inhibited (UCS component)",
      kinetic:"Serratus inhibited → scapula cannot protract/upwardly rotate → medial border wings → GH abduction limited → overhead impingement.",
      root:"Pec minor overactive (CPA) → inhibits serratus anterior. Long thoracic nerve palsy must be excluded (if severe winging at rest).",
      risk:["Rotator cuff (impingement due to poor scapular position)","Anterior labrum","Long thoracic nerve"],
      assess:["Wall push-up plus (serratus test)","CPA Serratus Anterior","CPA Pec Minor","Scapular winging classification"],
      exercises:["Pec minor release (coracoid pressure 90 sec)","Serratus punch","Push-up plus progression","Wall slides with protraction cue"],
      progression:["Isolation → closed chain → open chain overhead"],
    },
    forward_head:{
      weak:["Deep Neck Flexors"],
      tight:["SCM","Scalenes","Suboccipitals","Upper Trapezius"],
      deficit:"Stability deficit — DNF inhibited, UCS pattern at cervical spine",
      kinetic:"During overhead reach, cervical spine extends if DNF insufficient → suboccipitals compress → headache. Also: forward head increases shoulder impingement (reduces subacromial space via thoracic link).",
      root:"DNF inhibited (CPA). Address before overhead loading. Every 2.5cm of forward head = +4.5kg on cervical spine at full overhead load.",
      risk:["Suboccipitals (compression)","C4/C5 disc","Supraspinatus (shoulder link)"],
      assess:["CCFT (deep neck flexor test)","CPA DNF","Cervical rotation ROM","UCS assessment"],
      exercises:["Chin tuck exercise × 20 reps daily","DNF strengthening before overhead loading","Thoracic extension to reduce forward head"],
      progression:["DNF activation → overhead with neutral neck → loaded overhead"],
    },
  },

  // FORWARD BEND
  bend:{
    lumbar_flexion_comp:{
      weak:["Gluteus Maximus","Hamstrings (hip hinge movers)","Core (TA, multifidus)"],
      tight:["Hamstrings","Hip Capsule (posterior)"],
      deficit:"Stability deficit — lumbar flexion when hips cannot flex sufficiently. Same as squat.",
      kinetic:"Hip flexion restricted (hamstrings or capsule) → lumbar must flex to get hands near floor → repeated disc loading.",
      root:"Hip hinge pattern lost. Patient bends from lumbar, not hip. Hip mobility restriction driving pattern. Waiter's bow test confirms.",
      risk:["L4/L5 and L5/S1 discs (repeated flexion)","Lumbar posterior ligaments","Sciatic nerve (neural tension)"],
      assess:["Waiter's bow test","Hip flexion ROM","SBL tension test (hamstrings fascial vs muscle)","Prone instability test"],
      exercises:["Hip hinge pattern (dowel rod on spine)","Romanian deadlift (gradual hip hinge loading)","Hamstring mobility (if fascial: SBL release. If muscular: PNF)"],
      progression:["Waiter's bow → RDL bodyweight → loaded RDL → functional bending"],
    },
    trunk_shift:{
      weak:["Contralateral QL and lateral trunk stabilisers","Contralateral Glute Med"],
      tight:["Ipsilateral QL","Ipsilateral lateral trunk (LL)"],
      deficit:"Combined: lateral line restriction + contralateral stability deficit",
      kinetic:"Trunk shifts laterally during forward bend = disc herniation protective pattern (shifts AWAY from herniation) OR lateral chain (LL) restriction (shifts TOWARD restriction).",
      root:"CRITICAL: lateral shift toward pain = lateral chain restriction (LL). Lateral shift away from pain = disc herniation (protective). Must differentiate urgently.",
      risk:["If disc: L4/L5 disc (most common lateral shift level)","If LL: lateral structures"],
      assess:["SLR and slump test (if shift away from pain)","LL lateral line assessment","Kemp's test (facet)","Lateral shift correction test"],
      exercises:["If disc: McKenzie lateral correction first → then extension","If LL: lateral line MFR → then hip hinge"],
      progression:["Correct shift first before adding load"],
    },
    pain_avoidance:{
      weak:["Variable"],
      tight:["Variable"],
      deficit:"Pain-driven compensation — most critical finding in bending assessment",
      kinetic:"Forward bending is the highest-risk movement for disc pathology. Pain avoidance during bending = likely disc, facet, or neural involvement.",
      root:"Identify structure: disc (worse flexion, centralises with extension) vs facet (worse extension, eases with flexion) vs SIJ (one-sided pain with bend).",
      risk:["The avoided structure — it is under stress even with compensation"],
      assess:["SLR + slump (disc/neural)","Kemp's (facet)","SI provocation cluster","McKenzie assessment (direction of preference)"],
      exercises:["Direction of preference first (McKenzie)","Avoid provocative direction until pain controlled"],
      progression:["Pain control → neutral spine → gradual loading"],
    },
  },
  // ── STEP DOWN ──────────────────────────────────────────────────────────────
  step_down:{
    knee_valgus:{
      weak:["Gluteus Medius","VMO","Hip External Rotators"],
      tight:["IT Band","TFL","Hip Adductors"],
      deficit:"Stability — dynamic hip abductor weakness during eccentric loading",
      root:"Gluteus medius unable to control femoral IR under single-leg eccentric load",
      kinetic:"Knee valgus during step-down → patellofemoral maltracking → medial meniscus shear",
      risk:"Patellofemoral pain syndrome, ACL injury, IT band syndrome, medial meniscus irritation",
      assess:["Single-leg squat video analysis","Hip abductor strength side-lying","Trendelenburg test","Glute med MMT"],
      exercises:["Clamshell 3×20 with band","Lateral band walk 3×10m","Step-down with knee-out cue 3×8","Single-leg glute bridge 3×12","Hip thrust 3×12"],
      progression:["Clamshell → lateral band walk → step-down → lateral step-up → single-leg squat"],
    },
    pelvic_drop:{
      weak:["Gluteus Medius (stance side)","QL (stance side)","Lateral core"],
      tight:["Contralateral QL","Hip adductors"],
      deficit:"Stability — Trendelenburg pattern on stance limb",
      root:"Insufficient hip abductor force to maintain pelvis during single-leg stance",
      kinetic:"Pelvic drop → contralateral hip drop → lumbar lateral flexion → SI joint rotation",
      risk:"SI joint dysfunction, lumbar facet irritation, contralateral hip OA progression",
      assess:["Trendelenburg test (30s hold)","Hip abductor strength MMT","Single-leg stance timed"],
      exercises:["Side-lying abduction 3×15","Standing hip abduction band 3×15","Lateral step-up 3×10","Side plank 3×30s"],
      progression:["Supine → side-lying → standing → single-leg loaded"],
    },
    trunk_lean_lateral:{
      weak:["Ipsilateral hip abductors","Lateral core stabilisers"],
      tight:["Contralateral QL","IT band"],
      deficit:"Stability + Motor Control — compensatory trunk shift to reduce hip abductor demand",
      root:"Patient leans trunk over stance limb to reduce moment arm on hip abductors",
      kinetic:"Trunk lean → lumbar lateral flexion stress → contralateral hip overload → gait asymmetry",
      risk:"Lumbar facet arthropathy, IT band syndrome, SI dysfunction",
      assess:["Trendelenburg","Hip abductor MMT","SLS with trunk position observation"],
      exercises:["Side plank 3×30s","Pallof press 3×12","Lateral step-down mirror feedback 3×8","Hip abductor machine or band 3×15"],
      progression:["Lateral plank → Pallof → lateral step-up → step-down with neutral trunk cue"],
    },
    foot_pronation:{
      weak:["Posterior Tibialis","Peroneus Longus","Intrinsic foot muscles"],
      tight:["Plantar Fascia","Achilles tendon","Gastrocnemius"],
      deficit:"Stability — foot/ankle dynamic pronation under single-leg load",
      root:"Insufficient arch control during eccentric load — foot collapses medially",
      kinetic:"Pronation → tibial IR → knee valgus → hip adduction — complete medial collapse chain",
      risk:"Plantar fasciitis, patellofemoral pain, posterior tibialis tendinopathy",
      assess:["Foot Posture Index (static)","Single-leg heel raise assessment","Weight-bearing ankle DF"],
      exercises:["Short foot exercise 3×10s","Single-leg heel raise inversion bias 3×15","Towel scrunches 3×30s","Posterior tibialis resistance band 3×15"],
      progression:["Short foot hold → heel raise → single-leg balance → step-down with arch cue"],
    },
    pain_avoidance:{
      weak:["Region-specific — assess primary complaint"],
      tight:["Region-specific"],
      deficit:"Pain inhibition — altered loading strategy due to pain",
      root:"Protective motor strategy reducing load through painful structure",
      kinetic:"Antalgic loading → contralateral overload → secondary musculoskeletal complaints",
      risk:"Chronic compensation patterns, kinesiophobia development",
      assess:["VAS during task","Identify painful structure via special tests","Pain mechanisms screening"],
      exercises:["Address pain source first","Graded exposure to loading","Pain neurophysiology education if indicated"],
      progression:["Pain-free movement → load progression → return to function"],
    },
  },
  // ── PUSH-UP PLUS ──────────────────────────────────────────────────────────
  pushup_plus:{
    scapular_winging:{
      weak:["Serratus Anterior (primary)","Lower Trapezius","Middle Trapezius"],
      tight:["Pectoralis Minor","Rhomboids (over-recruited)"],
      deficit:"Stability — serratus anterior inhibition prevents scapular protraction",
      root:"Serratus anterior inhibition — cannot complete scapular protraction in push-up plus position",
      kinetic:"Scapular winging → reduced subacromial space → impingement risk during overhead activities",
      risk:"Subacromial impingement, rotator cuff tendinopathy, cervicothoracic overuse",
      assess:["Serratus anterior MMT (wall push-up plus)","Kibler scapular winging test","Scapular assistance test"],
      exercises:["Wall push-up plus 3×15","Push-up plus on knees progress to toes 3×12","Serratus punch supine 3×15","Bear crawl 3×10m","Dead bug with reach 3×10"],
      progression:["Supine serratus → wall → knees → full → dynamic bear crawl"],
    },
    shoulder_elevation:{
      weak:["Lower Trapezius","Serratus Anterior"],
      tight:["Upper Trapezius","Levator Scapulae","Pectoralis Minor"],
      deficit:"Motor Control — upper trap dominant pattern during push-up",
      root:"Upper trapezius overactive due to lower trap and serratus inhibition — shrug pattern",
      kinetic:"Shoulder elevation → altered force couple → reduced subacromial space",
      risk:"Shoulder impingement, AC joint irritation, cervicogenic headache",
      assess:["Lower trapezius MMT prone Y","Upper trap palpation during push-up","Cervical screen"],
      exercises:["Prone Y-T-W 3×12","Scapular depression squeeze 3×15","Wall slide 3×12","Chin tuck with push-up 3×10"],
      progression:["Isolated lower trap → integrated in push-up → dynamic overhead"],
    },
    asymmetric_loading:{
      weak:["Weaker side serratus / trapezius"],
      tight:["Dominant side pectorals"],
      deficit:"Asymmetrical Stability — unilateral scapular dysfunction",
      root:"Previous shoulder injury or dominance pattern creating asymmetric scapular control",
      kinetic:"Asymmetric load → spinal rotation pattern → cervical compensation",
      risk:"Unilateral shoulder overuse, cervical dysfunction, AC joint asymmetric loading",
      assess:["Bilateral scapular observation","Manual muscle test each side independently","Lateral scapular slide test"],
      exercises:["Unilateral push-up plus on weaker side 3×12","Single-arm cable serratus punch 3×15","Asymmetric plank reaches 3×10"],
      progression:["Bilateral corrected → unilateral emphasis → asymmetric loaded"],
    },
    forward_head:{
      weak:["Deep Cervical Flexors (longus colli, capitis)","Lower Trapezius"],
      tight:["Suboccipitals","Upper Trapezius","SCM"],
      deficit:"Motor Control — cervicothoracic coupling pattern during push-up",
      root:"As fatigue accumulates, head protrudes compensating for thoracic kyphosis demand",
      kinetic:"Forward head → suboccipital compression → upper trap recruitment → shoulder elevation chain",
      risk:"Cervicogenic headache, cervical facet irritation, shoulder impingement",
      assess:["Craniovertebral angle measurement","CCFT (craniocervical flexion test)","Cervical posture assessment"],
      exercises:["Chin tuck 3×10 5s holds","Push-up with neutral cervical cue 3×10","Thoracic foam roll 2min before push-up"],
      progression:["Chin tuck isolated → integrated into push-up position → loaded with neutral cervical"],
    },
  },
  // ── ROTARY STABILITY ──────────────────────────────────────────────────────
  rotary_stability:{
    trunk_rotation:{
      weak:["Transverse Abdominis","Multifidus","Obliques","Gluteus Medius"],
      tight:["Thoracolumbar Fascia","Hip Rotators"],
      deficit:"Stability — failure of anti-rotation core control",
      root:"Insufficient lumbopelvic stiffness to transfer load from UL to LL without trunk rotation",
      kinetic:"Trunk rotation during rotation stability → asymmetric lumbar facet loading → SIJ stress",
      risk:"Lumbar facet arthropathy, SIJ dysfunction, rotational injury during sport",
      assess:["Pallof press — anti-rotation assessment","McGill side plank","Rotary torque test","McGill endurance tests"],
      exercises:["Dead bug (contralateral) 3×10","Bird-dog 3×10","Pallof press 3×12","Half-kneeling chop/lift 3×10","McGill big 3 daily"],
      progression:["Dead bug → bird-dog → Pallof → cable chop → sport-specific rotation"],
    },
    pelvic_drop:{
      weak:["Gluteus Medius","Lateral core","QL (ipsilateral)"],
      tight:["Hip capsule","Contralateral adductors"],
      deficit:"Stability — cannot maintain pelvis during limb loading in quadruped",
      root:"Insufficient hip and core co-activation to stabilise pelvis during limb dissociation",
      kinetic:"Pelvic drop in quadruped → SI joint rotation → lumbar instability chain",
      risk:"Low back pain during loaded activity, SI joint dysfunction, pelvic instability",
      assess:["Active straight leg raise test (SIJ motor control)","Hip abductor MMT","Quadruped rock stability"],
      exercises:["Quadruped hold neutral 3×30s","Bird-dog progression 3×10","Side plank 3×30s","Hip abductor strengthening 3×15"],
      progression:["Static quadruped → contralateral bird-dog → ipsilateral → loaded"],
    },
    instability:{
      weak:["Global core stabilisers","Hip stabilisers"],
      tight:["Not primary — neuromuscular coordination issue"],
      deficit:"Motor Control + Neuromuscular — cannot coordinate ipsilateral limb extension",
      root:"CNS unable to sequence ipsilateral activation pattern — poor proprioceptive integration",
      kinetic:"Instability during rotation stability → fall risk → unpredictable loading patterns",
      risk:"Falls, inability to decelerate in sport, dynamic stability failure",
      assess:["CCFT — motor control screen","Star excursion balance test","McGill endurance battery"],
      exercises:["Quadruped rocking 3×10","Bird-dog contralateral first 3×10","Ipsilateral progression when diagonal is clean","Bear plank holds 3×20s"],
      progression:["Contralateral (easier) → diagonal (harder) → ipsilateral (hardest) — only progress when step pain-free and controlled"],
    },
    asymmetric_loading:{
      weak:["Weaker side rotary stabilisers"],
      tight:["Restricted side hip rotators"],
      deficit:"Asymmetrical Stability — unilateral rotary control deficit",
      root:"Asymmetric between sides identifies dominant limb compensating or previous injury pattern",
      kinetic:"Asymmetric trunk control → rotational injury risk with fatigue",
      risk:"Lateral lumbar disc herniation, unilateral facet syndrome, sport injury in rotation",
      assess:["Compare sides systematically","Previous lumbar or hip injury history","Functional asymmetry screen"],
      exercises:["Focus exercises on weaker side","Unilateral bird-dog emphasis 3×12","Unilateral Pallof press weaker 3×15"],
      progression:["Symmetry achieved at each level before progressing load"],
    },
  },
  // ── UPPER LIMB REACH ──────────────────────────────────────────────────────
  upper_reach:{
    shoulder_elevation:{
      weak:["Lower Trapezius","Serratus Anterior","Rotator Cuff (ER)"],
      tight:["Upper Trapezius","Levator Scapulae","Pectoralis Minor"],
      deficit:"Motor Control — upper trap dominant pattern during arm elevation",
      root:"Force couple imbalance: upper trap elevates while lower trap/serratus insufficient for rotation",
      kinetic:"Shoulder elevation → reduced subacromial clearance → impingement with repeated overhead",
      risk:"Subacromial impingement, rotator cuff tendinopathy, AC joint irritation",
      assess:["Painful arc test","Neer/Hawkins-Kennedy","Lower trap MMT (prone Y)","Scapular assistance test"],
      exercises:["Prone Y-T-W 3×12","Wall slide 3×12","Serratus punch 3×15","Lower trap bias reach (thumb up) 3×15"],
      progression:["Isolated lower trap → integrated reach → loaded overhead → sport-specific"],
    },
    scapular_winging:{
      weak:["Serratus Anterior","Lower Trapezius"],
      tight:["Pectoralis Minor","Rhomboids (over-recruited)"],
      deficit:"Stability — serratus anterior cannot maintain scapular protraction during reach",
      root:"Serratus anterior inhibition — medial scapular border lifts from thorax during arm elevation",
      kinetic:"Winging → loss of stable base for rotator cuff → glenohumeral instability chain",
      risk:"Rotator cuff tears, SLAP lesions, multidirectional instability",
      assess:["Kibler winging test (wall push)","Serratus MMT","Lateral scapular slide test bilateral"],
      exercises:["Wall push-up plus 3×15","Serratus punch supine 3×15","Push-up plus progression 3×12","Bear crawl 3×10m"],
      progression:["Supine → wall → floor push-up plus → dynamic overhead"],
    },
    limited_depth:{
      weak:["Rotator Cuff (ER)","Lower Trapezius","Thoracic extensors"],
      tight:["Pectoralis Major / Minor","Latissimus Dorsi","Posterior Capsule","Thoracic Paraspinals"],
      deficit:"Mobility — restricted shoulder or thoracic ROM limits functional reach",
      root:"Combined soft tissue restriction in pec minor, lat, and posterior capsule reducing overhead range",
      kinetic:"Limited reach → compensatory cervical and lumbar extension → overuse injury in compensatory regions",
      risk:"Shoulder impingement, cervical facet irritation, lumbar extension overload",
      assess:["Shoulder PROM flexion, ER, IR","Thoracic extension mobility","Pec minor length test","Lat length supine overhead"],
      exercises:["Pec minor doorway stretch 3×30s","Lat overhead stretch 3×30s","Thoracic foam roll extension 2min","Sleeper stretch posterior capsule 3×30s"],
      progression:["Mobility restoration → strengthening in range → integrated overhead reach patterns"],
    },
    asymmetric_loading:{
      weak:["Weaker side rotator cuff / periscapular muscles"],
      tight:["Restricted side posterior capsule or pec minor"],
      deficit:"Asymmetrical Mobility/Stability — dominant arm compensation masks weaker side",
      root:"Previous shoulder injury, handedness dominance, or cervical nerve root contribution (C5-C6)",
      kinetic:"Asymmetric reach → trunk rotation compensation → spine loading asymmetry",
      risk:"Overuse of dominant side, cumulative trauma, cervical radiculopathy mimicking shoulder",
      assess:["Bilateral comparison — document degrees and quality","Cervical screen (Spurling, ULNT1)","Rotator cuff MMT bilateral"],
      exercises:["Emphasise weaker side reaching practice","Unilateral cable/band reach 3×15 weaker","Cervical treatment if root involved"],
      progression:["Symmetry first → bilateral loaded → sport-specific overhead patterns"],
    },
    pain_avoidance:{
      weak:["Region-specific — assess rotator cuff and periscapular muscles"],
      tight:["Assess direction of restriction and tissue-specific tightness"],
      deficit:"Pain-Limited Mobility — guarded reaching pattern",
      root:"Pain inhibiting full range — identify structural source before strengthening",
      kinetic:"Antalgic reach → compensatory cervical and trunk patterns → secondary pain sites",
      risk:"Chronic pain sensitisation, avoidance behaviour, functional decline",
      assess:["Identify pain arc (60-120° = subacromial; full = capsular)","Active vs passive comparison","Neural tension (ULNT1-3)"],
      exercises:["Pain-free range first — pendulum exercises","Submaximal isometrics (ER, abduction) 5×10s","Progressive range expansion within pain limits"],
      progression:["Pain-free isometric → short arc → full range → loaded"],
    },
    forward_head:{
      weak:["Deep Cervical Flexors","Lower Trapezius"],
      tight:["Suboccipitals","Upper Trapezius","SCM"],
      deficit:"Motor Control — cervical compensation during arm elevation",
      root:"As arm elevates, head protrudes to maintain visual field or compensate for thoracic restriction",
      kinetic:"Forward head during reach → suboccipital compression → upper trap recruitment → elevation chain",
      risk:"Cervicogenic headache, thoracic outlet syndrome, shoulder impingement via cervical contribution",
      assess:["CVA measurement","CCFT","Combined cervical-shoulder movement assessment"],
      exercises:["Chin tuck with arm raise 3×10","Cervical retraction with shoulder ER 3×12","Thoracic extension + reach combo 3×10"],
      progression:["Neutral cervical position during all reach practice — mirror feedback useful"],
    },
  },
};

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

// ─── RULE-BASED ANALYSIS FUNCTION ────────────────────────────────────────────
function analyzeMovement(movementId, selectedCompensations) {
  if (!selectedCompensations || selectedCompensations.length === 0) return null;

  const movementRules = RULES[movementId] || {};
  const allWeak = new Set(), allTight = new Set(), allRisk = new Set();
  const allAssess = new Set(), allExercises = [], allProgression = [];
  const analyses = [];

  selectedCompensations.forEach(compId => {
    const rule = movementRules[compId];
    if (!rule) return;
    rule.weak?.forEach(m => allWeak.add(m));
    rule.tight?.forEach(m => allTight.add(m));
    rule.risk?.forEach(r => allRisk.add(r));
    rule.assess?.forEach(a => allAssess.add(a));
    if (rule.exercises) allExercises.push(...rule.exercises);
    if (rule.progression) allProgression.push(...rule.progression);
    analyses.push({ compId, ...rule });
  });

  // Determine primary deficit type
  const deficitTypes = analyses.map(a => a.deficit || "");
  const isMobility = deficitTypes.some(d => d.toLowerCase().includes("mobility"));
  const isStability = deficitTypes.some(d => d.toLowerCase().includes("stability"));
  const deficitType = isMobility && isStability ? "Both Mobility AND Stability Deficits" : isMobility ? "Primary Mobility Deficit" : isStability ? "Primary Stability Deficit" : "Mixed Pattern";

  // Find primary root cause (first highest priority)
  const primaryAnalysis = analyses[0];

  // Kinetic chain summary
  const kineticChain = analyses.map(a => a.kinetic).filter(Boolean);

  return {
    compensationCount: selectedCompensations.length,
    deficitType,
    weakStructures: [...allWeak],
    tightStructures: [...allTight],
    overloadRisk: [...allRisk],
    relatedAssessments: [...allAssess],
    analyses,
    kineticChain,
    primaryRootCause: primaryAnalysis?.root || "Assess further to determine root cause",
    exercises: [...new Set(allExercises)].slice(0, 8),
    progression: [...new Set(allProgression)].slice(0, 6),
  };
}

// ─── FMA SECTION COMPONENT ───────────────────────────────────────────────────
// ─── FMS CLINICAL DATABASE ────────────────────────────────────────────────────
const FMS_DB = {
  sq:{
    label:"Deep Squat", icon:"🏋️",
    how:"Stand feet shoulder-width, toes slightly out 5-10°. Hold dowel overhead wide grip, arms fully extended. Descend as deep as possible, heels flat. Observe from anterior AND lateral.",
    cues:["Heels completely flat on floor throughout","Arms fully extended overhead — no elbow bend","Knees track over 2nd toe","Lumbar spine neutral throughout","Head neutral — no forward jut","Feet symmetrical"],
    scoring:"3=Full depth, torso parallel/vertical to tibia, knees over toes, dowel overhead. 2=Heel rise OR arm drop OR compensatory lean. 1=Unable to achieve depth even with heel lift. 0=Pain.",
    defects:{
      knee_valgus:{
        label:"Bilateral Knee Valgus",
        meaning:"Both knees collapse medially — cardinal sign of hip abductor and external rotator weakness combined with adductor dominance.",
        biomech:"Insufficient gluteus medius and deep ER torque allows adductors to pull femur into IR and adduction. Tibial IR follows, creating medial patellar stress and ACL loading.",
        weak:["Gluteus medius (primary)","Gluteus maximus (ER component)","Piriformis","Obturator internus/externus","VMO","Posterior tibialis"],
        tight:["Hip adductors (longus, brevis, magnus)","TFL","Lateral hamstring","IT band"],
        kinetic:"Foot pronation → tibial IR → femoral IR/adduction → medial patellar maltracking → hip impingement. Complete lower chain failure.",
        type:"Stability + Motor Control",
        risk:"Patellofemoral pain, ACL tear, medial meniscus stress, IT band syndrome, hip labral irritation.",
        compensation:"Adductor group dominates due to delayed glute activation — collapses medially to find wider BoS.",
        treatment:["Inhibit: SMR adductors + TFL 90s/spot","Lengthen: adductor long-sit stretch 3×45s, couch stretch","Activate: clamshell 3×20, side-lying abduction 3×15","Integrate: lateral band walk, sumo squat with band above knees","Motor control: squat with band cue knees-out + mirror feedback"],
        exercises:["Clamshell 3×15 (band)","Lateral band walk 3×10m","Glute bridge + abduction band 3×15","Single-leg squat to box knee-over-toe 3×8","Hip thrust 3×12","TKE with band 3×20"]},
      unilateral_knee_valgus:{
        label:"Unilateral Knee Valgus (One Side)",
        meaning:"One knee collapses medially while the other tracks — asymmetric hip abductor weakness often from previous lower limb injury.",
        biomech:"Unilateral glute med inhibition post-injury creates asymmetric loading. Dominant side overcompensates, accelerating asymmetric wear.",
        weak:["Glute med (affected side)","VMO (affected side)","Posterior tibialis (affected side)"],
        tight:["Hip adductors (affected side)","TFL (affected side)"],
        kinetic:"Unilateral collapse → pelvic obliquity → contralateral lumbar QL overload → SI joint rotation.",
        type:"Stability (Asymmetrical)",
        risk:"Unilateral ACL risk, patellofemoral syndrome, SI joint dysfunction.",
        compensation:"Trunk leans toward stronger side to offload affected knee — scoliotic loading pattern.",
        treatment:["Focus glute activation on weaker side only","Single-leg exercises emphasising affected limb","Correct foot pronation with orthotics if structural","Address previous ankle/knee injury — treat inhibition"],
        exercises:["Unilateral clamshell 3×20 (affected)","Single-leg glute bridge 3×12 (affected)","Step-up knee-out cue 3×10 each","Split squat with band 3×10","Y-balance comparison sides"]},
      knee_varus:{
        label:"Knee Varus (Bow-Legged Pattern)",
        meaning:"Knees deviate laterally during squat — IT band/TFL overactivity or structural varus loading lateral compartment.",
        biomech:"IT band + TFL overactivity pulls tibia into varus. Lateral compartment overloaded, medial compartment gapped.",
        weak:["Hip adductors","VMO","Medial hamstring (semimembranosus)"],
        tight:["IT band","TFL","Lateral hamstring","Lateral gastrocnemius"],
        kinetic:"Varus → lateral tibiofemoral overload → lateral meniscus compression → fibular head stress.",
        type:"Mobility + Structural",
        risk:"Lateral meniscus tear, lateral compartment OA, fibular stress fracture.",
        compensation:"Weight shifts medially — excessive pronation at foot to compensate for lateral knee load.",
        treatment:["IT band SMR slow passes 2min/side","TFL stretch figure-4","Strengthen medial stabilisers: adductor squeeze, VMO TKE","Orthotics assessment if structural varus","Gait analysis for varus thrust"],
        exercises:["IT band SMR 2min/side","Adductor squeeze ball 3×20","TKE medial cue 3×15","Sumo squat 3×12","Copenhagen adductor 3×10"]},
      heel_rise:{
        label:"Bilateral Heel Rise",
        meaning:"Both heels lift — primary indicator of ankle dorsiflexion restriction from soft tissue or joint limitation.",
        biomech:"Restricted talocrural joint or gastroc/soleus complex prevents forward tibial translation required for deep squat.",
        weak:["Tibialis anterior","Extensor hallucis longus","Peroneals (secondary)"],
        tight:["Soleus","Gastrocnemius","Posterior ankle joint capsule","Achilles tendon","Plantar fascia (indirect)"],
        kinetic:"Heel rise → CoM shifts anterior → excessive lumbar flexion → knee shear → quad overload → patellar tendon stress.",
        type:"Mobility",
        risk:"Patellar tendinopathy, patellofemoral pain, lumbar disc stress, Achilles tendinopathy.",
        compensation:"Trunk leans forward to maintain balance as heels rise — transfers load to lumbar spine.",
        treatment:["Talocrural posterior glide mob band or manual 2min/side","Gastroc stretch straight knee 3×45s, soleus bent knee 3×45s","Lunge into wall knee-over-toe self mob","Heel-elevated squat → progressively reduce elevation 6-8 weeks","Single-leg balance on inclined surface"],
        exercises:["Wall ankle DF stretch bent knee 3×45s","Band ankle posterior glide mob 2min/side","Heel-elevated goblet squat 3×10 progress to flat","Eccentric heel drop off step 3×15","Ankle alphabets 2×full"]},
      unilateral_heel_rise:{
        label:"Unilateral Heel Rise",
        meaning:"One heel rises while the other stays flat — asymmetric ankle DF restriction from previous ankle sprain or immobilisation.",
        biomech:"Unilateral posterior capsule tightening from lateral ankle sprain restricts DF on affected side only.",
        weak:["Tibialis anterior (affected side)"],
        tight:["Posterior ankle capsule (affected)","Gastroc/soleus (affected)"],
        kinetic:"Asymmetric heel rise → ipsilateral knee valgus → contralateral hip drop → scoliotic trunk lean.",
        type:"Mobility (Asymmetrical)",
        risk:"Recurrent ankle sprain, ipsilateral knee pathology, contralateral hip overload.",
        compensation:"Body weight shifts to unaffected side — asymmetric lower limb loading.",
        treatment:["Unilateral ankle mob priority — anterior talar glide 2min affected","Address previous ankle sprain history and scar tissue","Proprioception board affected side 3×30s"],
        exercises:["Unilateral ankle DF lunge stretch 3×45s (affected)","Banded ankle mob 2min (affected)","Single-leg heel-elevated squat progression (affected)","Towel scrunches intrinsic 3×30s","Proprioception board (affected) 3×30s"]},
      trunk_lean_forward:{
        label:"Excessive Trunk Forward Lean",
        meaning:"Torso collapses forward — restricted thoracic mobility and/or hip mobility combined with poor anterior core activation.",
        biomech:"Limited thoracic extension or hip flexion ROM forces trunk forward to maintain CoM over BoS. Anterior core weakness allows passive collapse into lumbar flexion.",
        weak:["Thoracic erector spinae","Deep cervical flexors","Anterior core (TA, obliques, multifidus)","Hip flexors (insufficient eccentric control)"],
        tight:["Thoracic paraspinals (kyphotic shortening)","Hip flexors (iliopsoas)","Thoracolumbar fascia","Anterior hip capsule"],
        kinetic:"Trunk lean → lumbar flexion moment increases → disc posterior migration → hip anterior impingement → patellar tendon overload.",
        type:"Mobility + Motor Control",
        risk:"Lumbar disc herniation, hip FAI, patellar tendinopathy.",
        compensation:"Lumbar hyperflexes to lower CoM while trunk falls forward — entire posterior structure under load.",
        treatment:["Thoracic mob: foam roller extension 2min, open-book rotation 3×10/side","Hip flex mob: couch stretch 3×60s, anterior hip capsule mob","Core: dead bug 3×10, bird-dog 3×10","Squat cue: chest up, elbows up — goblet squat as corrective","Overhead squat PVC pipe to feel upright"],
        exercises:["Thoracic foam roll extension 2min","Cat-cow 2×15","Goblet squat chest up 3×10","Dead bug 3×10/side","Box squat broomstick overhead 3×10","Couch stretch 3×60s/side"]},
      lateral_trunk_lean:{
        label:"Lateral Trunk Lean / Side-Shift",
        meaning:"Trunk shifts laterally during descent — unilateral hip mobility restriction or leg length discrepancy causing CoM compensation.",
        biomech:"Body shifts toward the more restricted hip to unload that hip's mobility demand, creating asymmetric spinal loading.",
        weak:["Contralateral hip abductors","Contralateral QL","Lateral core stabilisers"],
        tight:["Hip capsule (restricted side)","QL (ipsilateral to lean)","IT band"],
        kinetic:"Lateral trunk lean → lumbar lateral flexion → facet joint compression ipsilateral → SI joint torsion.",
        type:"Mobility (Asymmetrical) + Motor Control",
        risk:"SI joint dysfunction, lumbar facet irritation, hip labral pathology.",
        compensation:"Trunk lean toward restricted side reduces hip flexion demand — masks asymmetric restriction.",
        treatment:["Hip capsule mob: 90/90 stretch, lying IR stretch 3×45s restricted side","QL stretch lateral side bend 3×30s","Lateral core: side plank 3×30s, Pallof press 3×12","Reassess leg length — refer if >1cm discrepancy"],
        exercises:["90/90 hip stretch 3×45s restricted side","Side plank 3×30s each","Pallof press 3×12 each direction","Single-leg squat restricted side emphasis 3×8","Lateral step-down 3×10 each"]},
      arms_drop:{
        label:"Arms Drop / Cannot Maintain Overhead",
        meaning:"Unable to keep arms extended overhead — thoracic kyphosis, lat tightness or shoulder flexion restriction.",
        biomech:"Limited shoulder flexion ROM from lat/pec minor tightness or thoracic kyphosis cannot maintain overhead arm as squat depth increases thoracic demand.",
        weak:["Lower trapezius","Serratus anterior","Thoracic extensors"],
        tight:["Latissimus dorsi","Pec minor","Posterior shoulder capsule","Thoracic paraspinals"],
        kinetic:"Arms forward → trunk leans → lumbar flexion increases → full spine loading chain.",
        type:"Mobility",
        risk:"Shoulder impingement, lumbar disc stress, thoracic hyperkyphosis progression.",
        compensation:"Elbows bend and arms move forward — reduces overhead shoulder demand at cost of trunk position.",
        treatment:["Lat stretch doorway + side bend 3×30s","Thoracic extension foam roller + open-book","Lower trap Y-T-W prone 3×12, wall slide 3×12","Overhead mobility: dowel overhead squat practice"],
        exercises:["Lat doorway stretch 3×30s","Thoracic foam roll 2min","Y-T-W prone 3×12","Wall slide 3×12","Overhead dowel squat practice 3×10"]},
      foot_pronation:{
        label:"Foot Pronation / Arch Collapse",
        meaning:"Medial arch collapses — intrinsic foot muscle weakness and posterior tibialis insufficiency.",
        biomech:"Arch collapse → talus adducts and plantarflexes → tibial IR → femoral IR → knee valgus. Foot is the foundation of the kinetic chain.",
        weak:["Posterior tibialis","Peroneus longus","Intrinsic foot muscles (FDB, abductor hallucis)","Flexor hallucis longus"],
        tight:["Plantar fascia","Gastrocnemius","Achilles tendon"],
        kinetic:"Pronation → tibial IR → femoral IR → knee valgus → hip adduction → lumbar rotation.",
        type:"Stability + Mobility",
        risk:"Plantar fasciitis, posterior tibialis dysfunction, patellofemoral pain, tibial stress fracture.",
        compensation:"Knee valgus and hip IR compensate — transfers load medially through entire chain.",
        treatment:["Intrinsic strengthening: short foot exercise, toe spread, marble pick-up","Posterior tibialis: single-leg heel raise inversion bias 3×15","Plantar fascia stretch 3×30s","Orthotics if structural pes planus","Proprioception single-leg balance arch cue"],
        exercises:["Short foot exercise 3×10s holds","Towel scrunches 3×30s","Single-leg heel raise inversion bias 3×15","Plantar fascia stretch 3×30s","Barefoot balance training 3×30s/side"]},
      anterior_pelvic_tilt:{
        label:"Anterior Pelvic Tilt During Squat",
        meaning:"Pelvis tilts anteriorly during descent — hip flexor dominance preventing neutral pelvis.",
        biomech:"Tight iliopsoas and rectus femoris anteriorly rotate pelvis as depth increases, creating lumbar hyperlordosis.",
        weak:["Gluteus maximus","Hamstrings","Anterior core (rectus abdominis)"],
        tight:["Iliopsoas","Rectus femoris","TFL","Anterior hip capsule"],
        kinetic:"Anterior tilt → lumbar extension → L4-5 compression → SI joint anterior rotation → hip impingement.",
        type:"Mobility + Motor Control",
        risk:"Lumbar facet arthropathy, hip FAI, SI joint dysfunction.",
        compensation:"Lumbar lordosis increases as pelvis tilts — unloads hip at expense of spinal extension.",
        treatment:["Hip flexor: couch stretch 3×60s, kneeling stretch","Pelvic clock awareness: anterior → neutral → posterior drill","Core: dead bug with posterior pelvic tilt hold","Glute activation: glute bridge posterior tilt cue"],
        exercises:["Couch stretch 3×60s/side","Kneeling hip flex stretch 3×45s","Pelvic clock supine 3×10","Dead bug 3×10","Glute bridge neutral pelvis 3×12"]},
      butt_wink:{
        label:"Butt Wink (Posterior Pelvic Tilt at Depth)",
        meaning:"Pelvis posteriorly rotates at depth — hamstring tethering forces lumbar flexion at end-range squat.",
        biomech:"Hamstrings pull ischium posteriorly at depth, converting lumbar lordosis to flexion. Posterior disc shear force increases significantly.",
        weak:["Multifidus","Lumbar stabilisers","TA"],
        tight:["Hamstrings (primarily)","Posterior hip capsule"],
        kinetic:"Butt wink → lumbar flexion under load → posterior annular stress → disc herniation risk at depth.",
        type:"Mobility",
        risk:"Lumbar disc herniation, posterior annulus tear — highest risk under loaded squat.",
        compensation:"Lumbar flexion allows pelvis to continue rotating when hip flexion ROM exhausted.",
        treatment:["Hamstring: SLR neural glide 2×10, supine towel stretch 3×45s","Squat depth management: stop above pelvic tuck point","Hip mob: 90/90 stretch, pigeon pose 3×60s","Lumbar stabilisation: bird-dog, dead bug before loaded squats"],
        exercises:["Supine hamstring stretch towel 3×45s","SLR neural glide 2×10 oscillations","Hip 90/90 stretch 3×45s/side","Goblet squat limit depth to neutral pelvis 3×10","Box squat sit to box before tuck 3×12"]},
      cervical_compensation:{
        label:"Forward Head / Cervical Compensation",
        meaning:"Head juts forward or chin protrudes during squat — deep cervical flexor weakness and/or global fatigue pattern.",
        biomech:"As trunk falls forward, head protrudes to maintain visual horizon. Each 2.5cm forward head posture adds ~5kg load to cervical extensors.",
        weak:["Longus colli","Longus capitis","Lower trapezius","Thoracic extensors"],
        tight:["Suboccipital muscles","Upper trapezius","SCM","Thoracic paraspinals"],
        kinetic:"Cervical compensation → suboccipital compression → headache risk → upper trap overactivation → shoulder elevation chain.",
        type:"Motor Control + Posture",
        risk:"Cervical facet irritation, headache, upper trapezius overuse, shoulder impingement.",
        compensation:"Global extension strategy — posterior chain activates pulling head forward or backward.",
        treatment:["Chin tuck jowl exercise 3×10 5s holds","Suboccipital release manual or tennis ball 2min","Thoracic extension mob: foam roller","Cue: eyes on horizon during squat"],
        exercises:["Chin tuck supine 3×10 5s holds","Suboccipital self-release tennis ball 2min","Thoracic foam roll 2min","Chin tuck hold during squat 3×10","Shoulder retraction neck neutral 3×15"]},
      loss_of_balance_sq:{
        label:"Loss of Balance / Instability",
        meaning:"Patient sways or grabs support — vestibular, proprioceptive, or ankle/hip stability deficit.",
        biomech:"Squat challenges multi-segmental proprioceptive integration. Any deficit at foot, ankle, knee, hip, or CNS level disrupts postural sway.",
        weak:["Peroneals","Tibialis anterior","Intrinsic foot muscles","Hip abductors","Core stabilisers"],
        tight:["Posterior ankle capsule"],
        kinetic:"Instability → compensatory joint stiffening → reduced shock absorption → increased injury risk.",
        type:"Motor Control + Proprioception",
        risk:"Falls risk, ankle sprains, inability to decelerate in sport.",
        compensation:"Widening stance, arms forward, trunk lean — reduce balance demand at cost of movement quality.",
        treatment:["Progression: bilateral → narrow stance → tandem → single-leg","Eyes open → eyes closed","Stable → foam pad → Bosu → trampoline","Y-balance test to quantify reach asymmetry"],
        exercises:["Narrow stance squat 3×10","Single-leg balance firm 3×30s","Single-leg balance eyes closed 3×20s","Bosu squat 3×10","Perturbation training partner taps 3×30s"]},
      tremor_shaking:{
        label:"Tremor / Shaking During Movement",
        meaning:"Visible tremor during squat — neuromuscular fatigue, inadequate motor unit recruitment, or significant deconditioning.",
        biomech:"Insufficient motor unit synchronisation to maintain position under load. May indicate severe deconditioning or neurological issue.",
        weak:["Global lower extremity musculature","Core stabilisers"],
        tight:["Not primary — neuromuscular issue"],
        kinetic:"Tremor → inefficient force production → increased injury risk under dynamic loading.",
        type:"Motor Control + Neuromuscular",
        risk:"Sudden giving way, fall risk, inability to absorb loading forces.",
        compensation:"Rapid descent/ascent to avoid sustained loading demand.",
        treatment:["Graded strengthening — regress to pain-free, fatigue-free range","Isometric wall sit 3×20s progress to 60s","NMES if severe inhibition","Rule out neurological cause — refer if persistent"],
        exercises:["Wall sit 3×20s progress duration","Leg press 3×15 controlled","Step-up 3×10 each","Isometric squat hold 60° 3×20s","Cycling or swimming if severe deconditioning"]}
    }
  },
  hs:{
    label:"Hurdle Step", icon:"🏃",
    how:"Hurdle at tibial tuberosity height. Dowel behind neck across shoulders. Step over hurdle, touch heel to ground, return. Both sides. Observe anterior and lateral.",
    cues:["Stance leg fully extended throughout","Stepping hip must fully flex over hurdle","No hurdle contact","Return under full control","Dowel remains horizontal and still"],
    scoring:"3=No trunk shift, hips level, dowel horizontal, full step-over. 2=Trunk shift OR hip drop OR dowel tilts. 1=Foot touches hurdle OR loss of balance. 0=Pain.",
    defects:{
      hip_drop_trendelenburg:{
        label:"Hip Drop — Trendelenburg Sign",
        meaning:"Pelvis drops on the swing side during single-leg stance — stance-side gluteus medius insufficiency.",
        biomech:"Glute med generates abductor torque to level pelvis in single-leg stance. Insufficient force → pelvis drops → trunk leans ipsilaterally to shift CoM over foot.",
        weak:["Gluteus medius (stance side — primary)","Gluteus minimus","TFL (secondary)","Piriformis"],
        tight:["Contralateral QL","Hip adductors (stance side)"],
        kinetic:"Hip drop → lateral trunk lean → IT band tension → contralateral SI joint compression → knee valgus cascade.",
        type:"Stability",
        risk:"IT band syndrome, patellofemoral pain, SI joint dysfunction, contralateral lumbar overload.",
        compensation:"Ipsilateral trunk lean (compensated Trendelenburg) — shifts CoM masking abductor weakness.",
        treatment:["Activate: clamshell 3×20, side-lying abduction 3×15","Weight-bearing: lateral band walk, lateral step-up","Stability: mirror feedback single-leg, perturbation","Functional: step-over pelvic level cue, single-leg RDL"],
        exercises:["Clamshell 3×20 band","Side-lying hip abduction 3×15","Lateral band walk 3×12m","Single-leg stance level pelvis mirror 3×30s","Lateral step-up 3×10 each","Single-leg deadlift 3×8"]},
      lateral_trunk_shift:{
        label:"Lateral Trunk Shift / Lean",
        meaning:"Trunk deviates laterally during stance — compensatory strategy for abductor weakness or QL tightness.",
        biomech:"Insufficient hip abductor torque on stance side → trunk leans ipsilaterally to shift CoM medially, reducing abductor demand.",
        weak:["Glute med (stance side)","Lateral core (QL, obliques)","Contralateral hip abductors"],
        tight:["QL (ipsilateral to lean)","Hip adductors","Thoracolumbar fascia (lateral)"],
        kinetic:"Trunk shift → asymmetric lumbar facet loading → disc lateral compression → sciatica risk.",
        type:"Stability + Motor Control",
        risk:"Lumbar facet arthropathy, sciatica, hip impingement.",
        compensation:"Trunk lean shifts CoM — uses trunk mass to stabilise rather than muscle force.",
        treatment:["QL stretch standing side bend 3×30s each","Lateral core: side plank 3×30-60s, suitcase carry 3×20m","Glute med activation protocol","Cue: keep pelvis level and trunk upright"],
        exercises:["Side plank 3×30s to 60s","Pallof press 3×12 each","QL side bend stretch 3×30s","Suitcase carry 3×20m each","Single-leg RDL 3×8 each"]},
      insufficient_hip_flexion:{
        label:"Insufficient Hip Flexion / Step Height",
        meaning:"Stepping hip cannot achieve adequate flexion to clear hurdle — hip flexor weakness or posterior capsule restriction.",
        biomech:"Iliopsoas and rectus femoris generate hip flexion; if limited, patient compensates with trunk lean or toe drag. Hip FAI may limit deep flexion.",
        weak:["Iliopsoas","Rectus femoris","TFL hip flexion component"],
        tight:["Posterior hip capsule","Hamstrings (restrict pelvic rotation)","Piriformis"],
        kinetic:"Insufficient hip flex → toe drag → falls risk → compensatory lumbar flexion → disc load.",
        type:"Mobility + Strength",
        risk:"Trip/fall injury, hip FAI irritation, lumbar disc stress.",
        compensation:"Trunk leans forward and pelvis tilts posteriorly to achieve apparent hip flexion — uses lumbar range.",
        treatment:["Hip flexor strengthening: lying leg raise 3×12, standing hip flex band 3×15","Hip capsule mob: posterior glide, prone mob","ASLR to differentiate strength vs mobility","Step training: progressive hurdle height"],
        exercises:["Lying leg raise 3×12","Standing hip flex band 3×15","Posterior hip capsule stretch pigeon 3×60s","Progressive hurdle step lower height","Lunge with high knee drive 3×10"]},
      stance_knee_flexion:{
        label:"Stance Leg Knee Flexion",
        meaning:"Stance knee bends during step-over — quadriceps weakness or pain-avoidance pattern.",
        biomech:"Single-leg knee extension requires strong VMO and rectus femoris engagement. Failure indicates quad insufficiency or pain avoidance.",
        weak:["Vastus lateralis","VMO","Rectus femoris"],
        tight:["Hamstrings","Gastrocnemius"],
        kinetic:"Knee flexion on stance → increased patellofemoral joint reaction → quad tendon stress.",
        type:"Stability + Strength",
        risk:"Patellar tendinopathy, patellofemoral pain, knee OA progression.",
        compensation:"Trunk leans forward to reduce extension moment arm — reduces quad demand at cost of spinal position.",
        treatment:["Quad strengthening: TKE 3×20, step-up 3×12","VMO emphasis: short arc quad, TKE medial cue","Single-leg press 3×12 progressing to single-leg squat","Cue: lock the knee — stand tall"],
        exercises:["TKE band 3×20","Short arc quad 3×15","Step-up 3×12 each","Single-leg press 3×12","Wall sit 3×30s"]},
      loss_of_balance_hs:{
        label:"Loss of Balance on Stance Leg",
        meaning:"Postural sway or support-seeking — proprioceptive and/or ankle/hip stability deficit.",
        biomech:"Single-leg balance integrates vestibular, visual, somatosensory input. Deficit at ankle, hip, or CNS creates instability.",
        weak:["Peroneals","Tibialis anterior","Intrinsic foot muscles","Glute med"],
        tight:["Posterior ankle capsule"],
        kinetic:"Balance loss → compensatory co-contraction → increased energy cost → fall risk in dynamic environments.",
        type:"Motor Control + Proprioception",
        risk:"Falls risk, ankle sprain recurrence, inadequate deceleration.",
        compensation:"Wide arm abduction, trunk lean, rapid foot placement — reduce balance challenge.",
        treatment:["Single-leg balance: firm → foam → Bosu → trampoline","Eyes open → eyes closed","Perturbation: partner taps, ball toss","Y-balance test quantification"],
        exercises:["Single-leg balance firm 3×30s","Single-leg balance eyes closed 3×20s","Bosu single-leg 3×30s","Perturbation training 3×30s","Y-balance 3 directions"]},
      hurdle_contact:{
        label:"Foot Contacts Hurdle",
        meaning:"Stepping limb touches hurdle — insufficient hip flexion, foot clearance, or coordination deficit.",
        biomech:"Inadequate hip flexion strength or coordination fails to achieve required limb trajectory over hurdle height.",
        weak:["Hip flexors stepping side","Tibialis anterior foot DF for clearance"],
        tight:["Posterior hip capsule","Hamstrings limit flexion"],
        kinetic:"Repeated hurdle contact → trip mechanism → falls risk in functional environments.",
        type:"Motor Control + Mobility",
        risk:"Trip injury, reduced dynamic foot clearance in gait, stair navigation impairment.",
        compensation:"Trunk lean increases apparent hip flexion — foot clears using trunk position.",
        treatment:["Practice step-over at progressive heights","Hip flexor strengthening","Anterior tibialis: ankle DF strengthening","Motor control: slow step-over visual feedback"],
        exercises:["Standing hip flex band 3×15","Ankle DF strengthening foot on ledge lift toes 3×20","Slow hurdle step visual feedback 3×10","Marching high knee drive 3×30s","Step-up to high box 3×10"]},
      dowel_tilt:{
        label:"Dowel Tilts / Shoulders Not Level",
        meaning:"Dowel tilts indicating unilateral shoulder or thoracic restriction or asymmetric trunk lean.",
        biomech:"Unilateral thoracic restriction or QL tightness creates ipsilateral lateral flexion, tilting dowel.",
        weak:["Contralateral lateral core","Lower trapezius restricted side"],
        tight:["QL (tilt side)","Thoracic rotators","Thoracolumbar fascia unilateral"],
        kinetic:"Dowel tilt → trunk rotation → asymmetric spinal loading → SI joint torsion.",
        type:"Mobility (Asymmetrical)",
        risk:"Thoracic asymmetry, SI joint dysfunction, unilateral shoulder impingement.",
        compensation:"Trunk compensates by laterally flexing to achieve step-over, tilting dowel.",
        treatment:["QL stretch tilt side 3×30s","Thoracic rotation mob restricted side 3×10","Lateral core: side plank weaker side 3×30s","Check SM test for shoulder mobility contribution"],
        exercises:["QL side bend stretch restricted 3×30s","Thoracic rotation foam roll restricted side 1min","Side plank weaker side 3×30s","Open-book rotation 3×10/side","Horizontal adduction stretch 3×30s"]}
    }
  },
  il:{
    label:"Inline Lunge", icon:"🦵",
    how:"Stand on a line, feet tandem heel-to-toe. Dowel vertical behind back — 3 contacts: back of head, thoracic spine, sacrum. Lower rear knee to line, return. Both sides.",
    cues:["Front foot completely flat on line","Rear knee lowers to — not slams into — line","Dowel maintains all 3 contacts","No trunk rotation or lateral lean","Foot stays on line — no step-off"],
    scoring:"3=All dowel contacts maintained, no deviation, controlled. 2=Dowel loses contact OR knee deviates OR step-off. 1=Loss of balance prevents completion. 0=Pain.",
    defects:{
      trunk_rotation_il:{
        label:"Trunk Rotation",
        meaning:"Spine rotates during lunge — inadequate hip mobility forcing lumbar rotation to compensate.",
        biomech:"Restricted hip IR or ER forces lumbar spine to rotate to allow limb advancement. Dowel loses thoracic contact first, then head contact.",
        weak:["Deep core multifidus TA","Anti-rotation obliques","Hip rotators restricted side"],
        tight:["Hip joint capsule IR restriction","Thoracolumbar fascia","Piriformis","Hip flexors creating torsion"],
        kinetic:"Trunk rotation → asymmetric lumbar facet loading → SI joint torsion → contralateral hip impingement.",
        type:"Mobility + Motor Control",
        risk:"Lumbar facet arthropathy, disc annular stress, SI joint dysfunction.",
        compensation:"Spine rotates to allow hip past its ROM — lumbar substitutes for hip mobility.",
        treatment:["Hip IR mob: prone IR AROM, FABER stretch 3×45s","Anti-rotation: Pallof press 3×12, half-kneeling chop 3×10","Motor control: lunge holding dowel contacts — coach rotation","Progress: add resistance when contacts maintained"],
        exercises:["Pallof press 3×12 each direction","Half-kneeling anti-rotation hold 3×30s","Hip IR stretch seated 3×45s","Lunge with dowel visual feedback 3×8","Cable chop lunge position 3×10"]},
      front_knee_valgus_il:{
        label:"Front Knee Valgus",
        meaning:"Forward knee collapses medially — single-leg abductor and VMO demand exceeds capacity.",
        biomech:"Single-leg loading amplifies hip abductor demand. VMO insufficiency allows lateral patellar tracking. Adductors dominate.",
        weak:["Glute med front leg","VMO","Deep hip ER"],
        tight:["Hip adductors","TFL/IT band","Lateral hamstring"],
        kinetic:"Knee valgus → medial patellar maltracking → ACL valgus stress → medial meniscus compression.",
        type:"Stability",
        risk:"ACL injury, patellofemoral syndrome, medial meniscus degeneration.",
        compensation:"Trunk leans toward collapse side — reduces valgus appearance but increases SI stress.",
        treatment:["Band cue above knee during lunge RNT","Single-leg glute work: clamshell → step-up → split squat","VMO: TKE 3×20, short arc quad 3×15","Mirror feedback: watch knee during lunge"],
        exercises:["Lateral band walk 3×15","TKE band 3×20","Step-up knee-out cue 3×10","Split squat band above knee 3×10","Single-leg press valgus cue 3×12"]},
      rear_knee_valgus_il:{
        label:"Rear Knee Valgus",
        meaning:"Rear knee collapses medially during descent — hip abductor weakness on rear leg side.",
        biomech:"Rear hip abductors must stabilise pelvis and femur in adducted single-leg position. Weakness creates medial collapse.",
        weak:["Glute med rear leg side","Hip ER rear leg","VMO rear leg"],
        tight:["Adductors rear leg side"],
        kinetic:"Rear knee valgus → pelvic torsion → lumbar rotation → SI joint loading.",
        type:"Stability",
        risk:"Patellofemoral pain rear side, patellar tendon stress, SI joint dysfunction.",
        compensation:"Pelvic rotation compensates — trunk shifts to offload rear knee.",
        treatment:["Rear leg glute med activation","Bulgarian split squat 3×10","Cue: keep rear knee pointing straight down","Band above rear knee as tactile cue"],
        exercises:["Rear leg clamshell 3×20","Bulgarian split squat 3×10","Rear knee tracking split squat 3×10","Single-leg bridge rear leg 3×12","Lateral step-up rear leg dominant 3×10"]},
      lateral_trunk_lean_il:{
        label:"Lateral Trunk Lean",
        meaning:"Trunk leans laterally during lunge — QL tightness or hip abductor weakness causing CoM shift.",
        biomech:"Lateral trunk lean shifts CoM medially to reduce hip abductor demand, masking weakness.",
        weak:["Lateral core QL obliques","Hip abductors front leg"],
        tight:["QL ipsilateral to lean"],
        kinetic:"Lateral lean → asymmetric spinal loading → facet compression lean side → contralateral disc stress.",
        type:"Stability + Motor Control",
        risk:"Lumbar facet irritation, lateral disc bulge, SI joint torsion.",
        compensation:"Trunk leans to reduce abductor demand and maintain balance — increases spinal load.",
        treatment:["QL stretch standing side bend 3×30s","Side plank 3×30s to 60s","Pallof press 3×12 each","Lunge trunk upright cueing mirror"],
        exercises:["Side plank 3×30s each","Pallof press 3×12 each direction","QL side bend stretch 3×30s","Suitcase carry 3×20m each","Lateral step-up 3×10"]},
      loss_of_balance_il:{
        label:"Loss of Balance / Step-Off Line",
        meaning:"Cannot maintain narrow-base tandem stance — proprioceptive or stability deficit.",
        biomech:"Tandem stance dramatically reduces BoS, amplifying single-plane balance demand.",
        weak:["Peroneals","Tibialis anterior","Intrinsic foot muscles","Hip abductors"],
        tight:["Posterior ankle capsule"],
        kinetic:"Repeated balance loss → inefficient patterns → fall risk in narrow corridors or sport.",
        type:"Motor Control + Proprioception",
        risk:"Falls risk, ankle injury, inability to perform cutting movements.",
        compensation:"Wide arm abduction, trunk rotation, foot widening — reduce tandem demand.",
        treatment:["Tandem balance 3×30s progressing to eyes closed","Single-leg on unstable surface","Y-balance quantification","Ankle proprioception: wobble board, Bosu"],
        exercises:["Tandem stance balance 3×30s","Tandem balance eyes closed 3×20s","Single-leg balance foam pad 3×30s","Bosu single-leg 3×30s","Tandem walk tightrope 3×10m"]},
      rear_hip_extension_deficit:{
        label:"Rear Hip Extension Deficit",
        meaning:"Rear hip cannot achieve full extension — hip flexor tightness or anterior capsule restriction.",
        biomech:"Iliopsoas shortening prevents full hip extension, causing anterior pelvic tilt and lumbar lordosis.",
        weak:["Gluteus maximus rear leg","Hamstrings rear leg"],
        tight:["Iliopsoas","Rectus femoris","Anterior hip capsule","TFL"],
        kinetic:"Hip flex restriction → anterior pelvic tilt → lumbar hyperextension → L4-5 disc posterior compression.",
        type:"Mobility",
        risk:"Hip flexor injury, lumbar disc herniation extension type, SI joint irritation.",
        compensation:"Anterior pelvic tilt increases lumbar lordosis to achieve lunge depth — sacrifices spinal position.",
        treatment:["Couch stretch 3×60s priority","Anterior hip capsule mob prone on elbows","Kneeling hip flex stretch with posterior pelvic tilt","Glute max activation: prone hip extension, hip thrust"],
        exercises:["Couch stretch 3×60s/side","Kneeling hip flex stretch posterior tilt 3×45s","Half-kneeling lunge upright trunk 3×10","Hip thrust 3×12","Single-leg RDL 3×10"]},
      foot_rotation_il:{
        label:"Foot Rotation Off Line",
        meaning:"Front or rear foot rotates off line — hip rotation restriction forcing foot ER to achieve clearance.",
        biomech:"Limited hip IR forces foot into ER as compensation — reduces medial arch stress but creates rotational knee loading.",
        weak:["Hip IR muscles TFL anterior glute med"],
        tight:["Hip ER muscles piriformis obturators gemelli","Posterior hip capsule"],
        kinetic:"Foot ER → tibial ER → knee lateral rotation → patellofemoral maltracking.",
        type:"Mobility",
        risk:"Patellofemoral syndrome, IT band syndrome, lumbar rotation stress.",
        compensation:"Foot ER allows hip to clear limited IR range — avoids discomfort at cost of alignment.",
        treatment:["Hip IR mob: prone IR AROM, seated IR stretch 3×45s","Pigeon pose hip ER stretch 3×60s","Lunge practice with foot placement cue tape on floor"],
        exercises:["Hip IR stretch seated 3×45s","Pigeon pose ER stretch 3×60s","Lunge with foot-on-tape line cue 3×10","Single-leg squat rotation awareness 3×10","Cossack squat 3×10 each"]}
    }
  },
  sm:{
    label:"Shoulder Mobility", icon:"💪",
    how:"Make a fist both hands thumbs inside. Simultaneously reach one hand up behind the head and the other up the back. Measure fist-to-fist distance. Both sides. CLEARING TEST: Push-up impingement test — pain = score 0.",
    cues:["Make a tight fist — thumb inside","Both hands move simultaneously","Record knuckle-to-knuckle distance","Measure against patient's own hand-length","Clearing test mandatory"],
    scoring:"3=Within 1 hand-length. 2=Within 1.5 hand-lengths. 1=More than 1.5 hand-lengths. 0=Pain.",
    defects:{
      limited_overhead_sm:{
        label:"Limited Shoulder Flexion + IR (Overhead Restricted)",
        meaning:"Arm cannot reach adequately behind the head — restricted GH flexion, IR, or thoracic extension.",
        biomech:"Posterior capsule tightness or pec minor shortening limits GH IR in elevation. Thoracic kyphosis reduces scapular upward rotation capacity, compressing subacromial space.",
        weak:["Lower trapezius","Serratus anterior","Posterior rotator cuff (infraspinatus, teres minor)"],
        tight:["Pec minor","Pec major (anterior fibres)","Anterior GH capsule","Subscapularis","Thoracic paraspinals"],
        kinetic:"Restricted overhead → compensatory scapular elevation → upper trap dominance → cervical load → impingement.",
        type:"Mobility",
        risk:"Subacromial impingement, rotator cuff tears, cervical radiculopathy, AC joint stress.",
        compensation:"Scapular elevation + contralateral trunk lean to achieve overhead reach.",
        treatment:["Pec minor: corner stretch or doorway 3×30s","Thoracic extension foam roller T-spine 2min","GH posterior glide mob manual or self-stretch","Lower trap Y-T-W prone 3×12","Sleeper stretch 3×30s","Wall slide scapular depression cue 3×12"],
        exercises:["Pec minor doorway stretch 3×30s","Thoracic foam roll 2min","Y-T-W prone 3×12","Wall slide 3×12","Sleeper stretch 3×30s","Shoulder flexion AROM 2×10"]},
      gird:{
        label:"GIRD — Glenohumeral IR Deficit (Behind-Back Restricted)",
        meaning:"Arm cannot reach behind the back — GH internal rotation deficit, classic in overhead athletes.",
        biomech:"Posterior capsule tightening from repetitive overhead loading reduces GH IR. Creates obligate humeral head superior migration and posterior labrum stress.",
        weak:["Posterior rotator cuff (infraspinatus, teres minor)","Rhomboids","Serratus anterior"],
        tight:["Posterior GH capsule","Posterior rotator cuff adaptive shortening","Teres major"],
        kinetic:"GIRD → scapular anterior tilt → subacromial narrowing → superior labrum stress → SLAP risk.",
        type:"Mobility",
        risk:"SLAP tear, posterior labral injury, subacromial impingement, rotator cuff degeneration.",
        compensation:"Trunk rotation and scapular protraction to achieve internal reach.",
        treatment:["Sleeper stretch BEST for GIRD 3×30s side-lying","Cross-body posterior capsule stretch 3×30s","GH posterior glide mobilisation","Rotator cuff ER: side-lying band ER 3×15","Scapular retraction rows, face pulls 3×15"],
        exercises:["Sleeper stretch 3×30s each","Cross-body cuff stretch 3×30s","Band ER side-lying 3×15 each","Scapular retraction row 3×12","Face pull 3×15"]},
      bilateral_asymmetry_sm:{
        label:"L/R Asymmetry (>1 Hand-Length Difference)",
        meaning:"Significant side-to-side difference — highest FMS injury predictor. Unilateral restriction from previous injury or sport.",
        biomech:"Asymmetric capsular tightness or muscle shortening restricts one side disproportionately. Creates compensatory spinal patterns.",
        weak:["Restricted side posterior rotator cuff","Restricted side lower trap"],
        tight:["Dominant throwing arm posterior capsule","Restricted side pec minor"],
        kinetic:"Asymmetry → compensatory scoliotic trunk → uneven rib cage → cervical dysfunction.",
        type:"Mobility (Asymmetrical)",
        risk:"High asymmetric injury risk — strongest FMS predictor.",
        compensation:"Trunk lateral lean and rotation to compensate restricted side reach.",
        treatment:["Priority: stretch ONLY restricted side until symmetric","Reassess every 4 weeks","Do not aggravate overhead loading until symmetric","Address dominant arm overload sport-specific"],
        exercises:["Unilateral sleeper stretch restricted side 3×30s","Unilateral pec stretch restricted 3×30s","Thoracic rotation toward restricted side 3×10","Unilateral shoulder mob until symmetric","Bilateral ER strengthening after symmetry"]},
      scapular_elevation_sm:{
        label:"Scapular Elevation / Shoulder Shrug During Reach",
        meaning:"Shoulder elevates during reach — upper trapezius dominance compensating for lower trap and serratus weakness.",
        biomech:"Upper trap fires to achieve apparent shoulder elevation when lower trap and serratus cannot generate adequate upward rotation torque.",
        weak:["Lower trapezius","Serratus anterior","Middle trapezius"],
        tight:["Upper trapezius","Levator scapulae","SCM"],
        kinetic:"Scapular elevation → cervical compression → upper trap overuse → AC joint stress → thoracic outlet potential.",
        type:"Motor Control + Stability",
        risk:"Thoracic outlet syndrome, AC joint pathology, cervicogenic headache.",
        compensation:"Shrugging substitutes for proper scapular upward rotation — wrong muscle sequence.",
        treatment:["Upper trap inhibition: SMR upper trap 90s/side","Lower trap: Y-T-W prone, wall slide depression cue","Scapular PNF: depression + retraction","Motor control: shoulder flex with scapular depression hold"],
        exercises:["Upper trap SMR ball against wall 90s/side","Y-T-W prone 3×12","Wall slide depress scapula during slide 3×12","Scapular depression holds 3×10 5s","Face pull 3×15"]},
      scapular_winging_sm:{
        label:"Scapular Winging",
        meaning:"Medial border of scapula lifts — serratus anterior weakness or long thoracic nerve dysfunction.",
        biomech:"Serratus anterior holds scapula against thorax and generates upward rotation. Weakness or inhibition allows winging, reducing overhead ROM.",
        weak:["Serratus anterior (primary)","Lower trapezius","Middle trapezius"],
        tight:["Pec minor (tips scapula anteriorly causing winging)"],
        kinetic:"Winging → reduced GH ROM → impingement → rotator cuff compensation → cervical chain overload.",
        type:"Stability + Motor Control",
        risk:"Subacromial impingement, rotator cuff stress, long thoracic neuropathy.",
        compensation:"Shoulder elevation and trunk lean substitute for inadequate scapular control.",
        treatment:["Serratus: wall push-up plus protraction 3×15","Push-up with serratus plus extra protraction at top","Pec minor stretch to release scapular depression","Refer if severe — long thoracic nerve injury"],
        exercises:["Wall push-up plus protraction 3×15","Push-up plus on knees 3×12","Serratus punch band 3×15","Pec minor corner stretch 3×30s","Scapular protraction drills 3×10"]},
      cervical_lateral_flex_sm:{
        label:"Cervical Lateral Flexion / Head Tilt",
        meaning:"Head tilts during shoulder reach — cervical mobility deficit or upper trap tightness creating neck movement as compensation.",
        biomech:"Restricted ipsilateral cervical lateral flexion forces head to tilt to allow trunk side-bend for apparent shoulder reach.",
        weak:["Contralateral deep cervical flexors","Contralateral SCM"],
        tight:["Ipsilateral upper trapezius","Ipsilateral SCM","Scalenes","Levator scapulae"],
        kinetic:"Cervical compensation → suboccipital compression → cervicogenic headache → upper limb neural tension.",
        type:"Mobility + Motor Control",
        risk:"Cervicogenic headache, cervical radiculopathy C4-6, thoracic outlet syndrome.",
        compensation:"Head tilts to create extra trunk side-bending allowing limited shoulder to appear to reach further.",
        treatment:["Cervical lateral flexion stretch ear to shoulder 3×30s","Upper trap stretch + SCM stretch","Cervical rotation mob gentle AROM 3×10","Address shoulder mobility as primary driver"],
        exercises:["Ear-to-shoulder stretch 3×30s each","Upper trap stretch 3×30s each","Cervical rotation AROM 3×10 each","Levator scapulae stretch 3×30s each","Address SM deficits first"]},
      pain_impingement_sm:{
        label:"Pain During Movement (Clearing Test Positive)",
        meaning:"Shoulder pain during impingement clearing test — subacromial pathology present.",
        biomech:"Subacromial space compromised — inflammation, structural narrowing, or rotator cuff pathology causing pain with shoulder elevation + IR.",
        weak:["Rotator cuff all four","Lower trapezius","Serratus anterior"],
        tight:["Posterior capsule creating anterior-superior migration","Pec minor scapular depression"],
        kinetic:"Impingement → guarded movement → altered motor patterns → compensatory cervical and trunk strategies.",
        type:"Pathological — Score = 0",
        risk:"Rotator cuff tear progression, SLAP injury, AC joint degeneration. DO NOT load overhead without clearance.",
        compensation:"Arm held close, shoulder elevated, trunk rotation to reduce elevation demand.",
        treatment:["IMMEDIATE: Score = 0. Refer for shoulder assessment — imaging may be warranted","Conservative: posterior capsule stretch, lower trap activation, postural correction","Avoid aggravating overhead loading until pain-free","Address scapular dyskinesia and posture"],
        exercises:["Address pain first — no overhead loading","Postural correction exercises","Pendulum Codman's for acute relief","Posterior capsule gentle stretch pain-free range","Refer to physiotherapist or orthopaedic if not resolving"]}
    }
  },
  aslr:{
    label:"Active Straight Leg Raise", icon:"🦿",
    how:"Patient supine on firm surface. Arms flat at sides palms up. Raise one leg as high as possible, knee completely straight, opposite leg flat on floor. Measure raised leg height relative to midpoint between ASIS and knee of stationary leg. Both sides.",
    cues:["Keep raised knee fully straight","Raised foot dorsiflexed toe toward face","Opposite leg completely flat","Arms do not press into floor","Pelvis neutral — no tilt or rotation"],
    scoring:"3=Raised leg reaches between ASIS and vertical. 2=Between ASIS line and mid-thigh of opposite. 1=Below opposite knee. 0=Pain.",
    defects:{
      limited_hamstring_length:{
        label:"Limited Hamstring Length / Hip Flexion Range",
        meaning:"Inability to raise leg sufficiently — posterior chain tightness or sciatic neural tension limits active hip flexion.",
        biomech:"Hamstring tightness resists passive elongation during hip flexion. Hip flexors must overcome hamstring tension AND inertia — combined demand may exceed capacity.",
        weak:["Iliopsoas","Rectus femoris","TFL hip flexion component"],
        tight:["Biceps femoris long and short head","Semimembranosus","Semitendinosus","Posterior hip capsule","Sciatic nerve neural tension — differentiate with neurodynamics"],
        kinetic:"Posterior chain restriction → compensatory lumbar flexion → decreased lumbar stability → disc posterior migration.",
        type:"Mobility",
        risk:"Hamstring tear, proximal tendinopathy, lumbar disc herniation, sciatic nerve sensitisation.",
        compensation:"Pelvis posteriorly tilts, opposite knee flexes, or lumbar flattens to increase apparent range.",
        treatment:["Neural mob: SLR neural glide if neurogenic 2×10","Hamstring stretch: supine towel 3×45s, standing 3×45s","Active: lying leg raise 3×12, dead bug leg lowering 3×10","Eccentric: Nordic hamstring progressive loading","Differentiate neural tension vs muscle — Slump test"],
        exercises:["Supine hamstring stretch towel 3×45s","SLR neural glide 2×10 oscillations","Lying leg raise 3×12","Dead bug leg lowering 3×10","Nordic hamstring eccentric progressive","Standing hamstring stretch 3×45s"]},
      posterior_pelvic_tilt_aslr:{
        label:"Compensatory Posterior Pelvic Tilt",
        meaning:"Pelvis rotates posteriorly as leg rises — deep core cannot stabilise pelvis against hip flexor pull.",
        biomech:"TA and multifidus must create lumbar stiffness to resist extension moment created by leg raising. Weakness allows pelvis to rotate.",
        weak:["Transverse abdominis primary","Multifidus","Internal oblique","Pelvic floor"],
        tight:["Hamstrings contribute to pelvic tilt","Thoracolumbar fascia"],
        kinetic:"Pelvic tilt → lumbar flexion → posterior disc shear → hip flexor labral stress.",
        type:"Stability + Motor Control",
        risk:"Lumbar disc herniation, hip labral tear, SI joint dysfunction.",
        compensation:"Pelvis tilts to reduce hamstring tension — creates false impression of greater ROM.",
        treatment:["TA activation: drawing-in 3×10 10s holds","Dead bug with pelvic neutral 3×10 each","Pressure biofeedback lumbar support during ASLR","Bird-dog 3×10","ASLR with therapist hand under lumbar for feedback"],
        exercises:["TA drawing-in 3×10 10s holds","Dead bug neutral lumbar 3×10","Bird-dog 3×10","ASLR with pressure biofeedback 3×10","Supine heel slide neutral pelvis 3×10"]},
      opposite_leg_rise:{
        label:"Opposite Leg Lifts During Test",
        meaning:"Stationary leg flexes or lifts — bilateral posterior chain tightness pulling through pelvis.",
        biomech:"Severe bilateral hamstring tightness creates reciprocal tension through pelvis when one leg is raised, pulling opposite leg into slight flexion.",
        weak:["Bilateral hip flexors","Bilateral core stabilisers"],
        tight:["Bilateral hamstrings","Bilateral posterior chain gastroc, plantar fascia"],
        kinetic:"Bilateral restriction → reduced gait efficiency → lumbar overload bilaterally → increased disc stress.",
        type:"Mobility (Bilateral)",
        risk:"Bilateral hamstring tearing, lumbar disc herniation bilateral, reduced gait stride length.",
        compensation:"Opposite leg flexes allowing slight pelvic movement — chain reaction from bilateral tightness.",
        treatment:["Bilateral hamstring stretching 2 sessions/day","Neural mobilisation bilateral SLR glides","Yoga forward fold soft knee to straight progression","Address thoracolumbar fascia foam roll"],
        exercises:["Bilateral supine hamstring stretch 3×45s","SLR neural glide bilateral 2×10","Standing hamstring both 3×45s","Yoga forward fold progression 3×30s","Foam roll thoracolumbar 2min"]},
      pelvic_rotation_aslr:{
        label:"Pelvic Rotation During Raise",
        meaning:"Pelvis rotates as leg rises — hip rotator tightness or asymmetric core creating rotational pull.",
        biomech:"Hip ER tightness on tested side creates ER moment as hip flexes, causing pelvis to rotate away. Core cannot stabilise against rotational demand.",
        weak:["Anti-rotation core obliques TA","Hip IR muscles allow ER torque to dominate"],
        tight:["Hip external rotators piriformis obturators gemelli","Posterior hip capsule"],
        kinetic:"Pelvic rotation → SI joint torsion → asymmetric lumbar facet loading → disc torsion.",
        type:"Mobility + Motor Control",
        risk:"SI joint dysfunction, lumbar disc torsion, hip labral stress.",
        compensation:"Pelvis rotates to allow hip greater flexion without requiring IR — avoids posterior capsule stretch.",
        treatment:["Hip ER stretch: figure-4, pigeon pose 3×60s","SI joint stabilisation if hypermobile","Anti-rotation core: Pallof press 3×12","Motor control: ASLR with pelvic stabilisation cue"],
        exercises:["Pigeon pose 3×60s each","Figure-4 stretch 3×45s each","Pallof press 3×12 each direction","ASLR with pelvic control cue 3×10","Dead bug rotation control 3×10"]},
      raised_knee_flexion:{
        label:"Raised Knee Flexes During Test",
        meaning:"Raised leg knee bends — hamstring tightness inhibits full knee extension under hip flexion demand.",
        biomech:"Hamstrings cross both hip and knee. During hip flexion with knee extension, maximal two-joint length is demanded — flexibility limitation causes passive knee flexion.",
        weak:["Quadriceps must resist passive knee flexion","Hip flexors insufficient to maintain position"],
        tight:["Hamstrings all 3 heads primary","Proximal hamstring — ischial attachment tendinopathy consideration"],
        kinetic:"Knee flexion reduces hamstring stretch demand — system cheats by flexing knee.",
        type:"Mobility",
        risk:"Proximal hamstring tendinopathy, hamstring tear, reduced running economy.",
        compensation:"Knee flexion shortens hamstring demand — achieves apparent hip flexion at cost of pattern quality.",
        treatment:["Hamstring: supine towel stretch emphasise knee extension 3×45s","Neural mob: SLR ankle DF and knee extension emphasis","Seated hamstring: knee extension from 90° 3×45s","Eccentric Nordic hamstring for length and strength"],
        exercises:["Supine towel hamstring straight knee 3×45s","Seated knee extension stretch 3×45s","SLR neural glide knee ankle emphasis 2×10","Standing hamstring flat back hinge 3×45s","Nordic hamstring eccentric progressive"]},
      asymmetry_aslr:{
        label:"L/R Asymmetry in Raise Height",
        meaning:"Significant side-to-side difference — unilateral restriction from previous injury or sport adaptation.",
        biomech:"Unilateral hamstring restriction from previous strain or neural sensitisation creates asymmetric pattern.",
        weak:["Hip flexors restricted side"],
        tight:["Hamstrings restricted side","Sciatic nerve restricted side neural tension"],
        kinetic:"Asymmetry → asymmetric gait stride → ipsilateral hip overload → contralateral compensation.",
        type:"Mobility (Asymmetrical)",
        risk:"Recurrent hamstring strain restricted side, gait asymmetry, contralateral hip overload.",
        compensation:"Trunk leans or pelvis tilts to increase apparent range on restricted side.",
        treatment:["Priority: stretch restricted side only until symmetric","Slump test: rule out neural component","Unilateral hamstring program restricted side","Reassess every 4 weeks"],
        exercises:["Unilateral supine hamstring stretch restricted 3×45s","Unilateral SLR neural glide restricted 2×10","Unilateral Nordic restricted side 3×8","Progress bilateral only after symmetry","Y-balance posterior reach comparison"]}
    }
  },
  tspu:{
    label:"Trunk Stability Push-Up", icon:"🤸",
    how:"Prone position. Men: thumbs at forehead. Women: thumbs at chin. Perform ONE push-up rising as completely rigid plank. If unable: men try thumbs at chin, women at shoulder. CLEARING TEST: Prone press-up cobra — pain = score 0.",
    cues:["Body rises as one single rigid unit","No hip hike before or during push","No lumbar sag at any point","Head, thoracic, lumbar, hips, legs all move together","One push-up only — quality over repetition"],
    scoring:"3=Single push-up rigid appropriate level. 2=Lumbar sag or hip leads. 1=Cannot perform at level, can at regressed. 0=Pain.",
    defects:{
      lumbar_sag_tspu:{
        label:"Lumbar Sag / Anterior Lag",
        meaning:"Hips and lumbar drop and rise last — anterior core insufficient trunk rigidity for push-up force transfer.",
        biomech:"TA, multifidus and obliques must create IAP and lumbar stiffness to transfer force from chest through trunk to hips. Weakness creates wet-noodle pattern.",
        weak:["Transverse abdominis primary","Multifidus","Internal and external obliques","Rectus abdominis","Pelvic floor part of core canister"],
        tight:["Thoracolumbar fascia prevents TA full tensioning","Hip flexors pull lumbar into extension adding to sag"],
        kinetic:"Lumbar sag → L4-5 extension loading → posterior disc compression → facet approximation.",
        type:"Stability + Motor Control",
        risk:"Lumbar disc herniation extension type, facet arthropathy, SI joint stress.",
        compensation:"Hips sag and rise independently — caterpillar push-up pattern.",
        treatment:["Phase 1: TA activation drawing-in + bracing 3×10 10s","Phase 2: Plank 3×20s → 30s → 60s strict","Phase 3: Dead bug with TA brace 3×10","Phase 4: Push-up regression wall → incline → knee → full","Phase 5: Full push-up with dowel on back rigid body feedback"],
        exercises:["Plank 3×30s to 60s","Dead bug 3×10","Modified push-up knees rigid 3×10","TA drawing-in 3×10 10s","Full push-up rigid body cue 3×5"]},
      hip_hike_pike:{
        label:"Hip Hike / Piking",
        meaning:"Hips rise first before chest — posterior chain dominance avoiding anterior push-up demand.",
        biomech:"Hamstrings and glutes fire first instead of pectorals and anterior deltoids — pyramid/pike shape. CNS chooses familiar posterior chain pattern.",
        weak:["Pectoralis major","Anterior deltoid","Triceps","Serratus anterior","Anterior core"],
        tight:["Hamstrings","Posterior hip capsule","Gastrocnemius"],
        kinetic:"Hip hike → lumbar flexion moment → posterior disc loading — opposite of lumbar sag equally problematic.",
        type:"Motor Control",
        risk:"Lumbar disc posterior herniation, hamstring overuse, poor upper body push capacity.",
        compensation:"Posterior chain fires to initiate — avoids chest push demand by hinging at hips first.",
        treatment:["Motor control: simultaneous hands + feet press into ground","Regression: incline push-up rigid body timing","Chest + tricep: chest press 3×12, dips 3×10","Push-up timing drill: 3-count lower pause press","Plank to push-up transition practice"],
        exercises:["Incline push-up rigid 3×12","Wall push-up motor control 3×10","Chest press 3×12","Tricep push-down 3×15","Push-up timing drill 3×5"]},
      asymmetric_push_tspu:{
        label:"Asymmetric Push / Trunk Rotation",
        meaning:"Trunk rotates during push-up — unilateral pectoral or shoulder weakness creating rotational force.",
        biomech:"Asymmetric force from one pec/deltoid creates rotational moment — trunk rotates toward weaker side as stronger side pushes faster.",
        weak:["Pec major weaker side","Anterior deltoid weaker side","Serratus anterior weaker side","Triceps weaker side"],
        tight:["Pec minor dominant side over-pulls toward dominance"],
        kinetic:"Trunk rotation → asymmetric thoracic/cervical load → repeated rotational disc stress → contralateral shoulder compensation.",
        type:"Stability (Asymmetrical)",
        risk:"Cervical disc asymmetric stress, shoulder impingement dominant side, thoracic asymmetry.",
        compensation:"Dominant side pushes faster creating visible trunk rotation.",
        treatment:["Unilateral: single-arm chest press 3×12 weaker side emphasis","Single-arm plank 3×20s each","Push-up on unstable surface alternate hand Bosu","Stretch dominant pec minor","Equalise bilateral training volume"],
        exercises:["Single-arm chest press 3×12 each","Single-arm plank 3×20s each","Push-up alternating Bosu 3×8","Band pull-apart 3×15","Push-up symmetry cue mirror 3×8"]},
      head_drop_tspu:{
        label:"Head Drop / Cervical Compensation",
        meaning:"Head drops or juts forward during push-up — deep cervical flexor weakness.",
        biomech:"Longus colli and longus capitis must maintain craniovertebral neutral during push-up. Weakness allows head to drop with gravity.",
        weak:["Longus colli","Longus capitis","Deep cervical flexors","Lower trapezius"],
        tight:["Suboccipital extensors","Upper trapezius","SCM"],
        kinetic:"Head drop → cervical extension → suboccipital compression → headache risk → cervical disc stress.",
        type:"Motor Control + Stability",
        risk:"Cervicogenic headache, cervical facet irritation, suboccipital neuralgia.",
        compensation:"Head drops to reduce cervical flexor demand — trunk completes push-up without craniovertebral neutral.",
        treatment:["Chin tuck jowl exercise 3×10 5s holds","Suboccipital release manual or tennis ball 2min","Neck dissociation: maintain chin tuck during push-up","Scapular stability lower trap to reduce cervical chain overload"],
        exercises:["Chin tuck supine 3×10 5s holds","Suboccipital release 2min","Push-up chin tuck maintained 3×5","Deep neck flexor endurance practice","Lower trap Y-T-W 3×12"]},
      scapular_winging_tspu:{
        label:"Scapular Winging During Push-Up",
        meaning:"Medial scapular border wings — serratus anterior weakness under load.",
        biomech:"Serratus anterior generates protraction and upward rotation at top of push-up. Weakness allows medial border to wing, creating impingement and poor load transfer.",
        weak:["Serratus anterior primary","Lower trapezius","Middle trapezius"],
        tight:["Pec minor scapular depression and anterior tilting"],
        kinetic:"Scapular winging → GH instability → rotator cuff overload → impingement → cervical chain compensation.",
        type:"Stability + Motor Control",
        risk:"Subacromial impingement, rotator cuff overuse, cervical overload.",
        compensation:"Shoulder elevation and trunk tilt substitute — visible scapular lifting.",
        treatment:["Serratus: push-up plus extra protraction 3×15","Wall push-up plus 3×15","Serratus punch band 3×15","Pec minor stretch release scapular depression"],
        exercises:["Wall push-up plus 3×15","Push-up plus knees 3×12","Serratus punch 3×15","Pec minor corner stretch 3×30s","Bear crawl scapular stability 3×10m"]},
      elbow_flare_tspu:{
        label:"Excessive Elbow Flare (>45° From Trunk)",
        meaning:"Elbows abduct excessively — pec tightness or poor motor pattern creating shoulder impingement position.",
        biomech:"Elbow flare >45° places GH in maximal anterior impingement position. Indicates pec major dominance over triceps.",
        weak:["Triceps insufficient elbow extension","Serratus anterior"],
        tight:["Pec major pulls arms into horizontal abduction","Anterior shoulder capsule"],
        kinetic:"Elbow flare → anterior GH impingement → rotator cuff tension → potential SLAP stress.",
        type:"Motor Control + Mobility",
        risk:"Anterior shoulder impingement, SLAP tear, AC joint stress.",
        compensation:"Elbows flare to reduce pec stretch demand — engage pec major preferentially.",
        treatment:["Pec major stretch doorway 3×30s","Motor control: push-up with elbows at 45° cue","Tricep: diamond push-up, close-grip press","Kinesiology tape for elbow position cue"],
        exercises:["Pec major doorway stretch 3×30s","Close-grip push-up 45° elbow 3×10","Tricep push-down 3×15","Motor control push-up elbow cue mirror 3×10","Band pull-apart 3×15"]},
      pain_clearing_tspu:{
        label:"Pain on Clearing Test (Spinal Extension Pain)",
        meaning:"Pain with prone press-up — lumbar extension pathology present.",
        biomech:"Prone press-up creates lumbar extension moment — compresses posterior elements (facets) and reduces posterior disc space.",
        weak:["Anterior core weak allows excessive extension"],
        tight:["Thoracolumbar extensors","Hip flexors anteriorly tilt pelvis"],
        kinetic:"Extension pain → guarded posture → flexion-biased compensation → risk of flexion disc herniation.",
        type:"Pathological — Score = 0",
        risk:"Lumbar facet arthropathy, spondylolisthesis, extension-type disc herniation. DO NOT LOAD.",
        compensation:"Patient avoids extension entirely — flexion-biased posture develops.",
        treatment:["IMMEDIATE: Score = 0. Refer for lumbar assessment","Flexion-biased rehab: knee-to-chest, cat-cow flexion","Core stabilisation neutral/flexion position","Avoid extension exercises until cleared"],
        exercises:["Address pain first — no extension loading","Knee-to-chest stretch 3×30s","Cat-cow flexion emphasis 2×15","Supine core stabilisation neutral 3×10","Refer if persistent or radiating"]}
    }
  },
  rs:{
    label:"Rotary Stability", icon:"🔄",
    how:"Quadruped: hands under shoulders, knees under hips, spine neutral. Attempt 1: Extend ipsilateral (same side) arm + leg simultaneously, return. Attempt 2 if fails: Diagonal opposite arm + leg. Both sides. CLEARING TEST: Quadruped rocking child's pose — pain = score 0.",
    cues:["Spine completely neutral — no rotation, flexion or extension","Extend arm and leg together — no momentum","Keep pelvis level and still","Repeat both sides","Note: unilateral vs diagonal performance"],
    scoring:"3=Unilateral same-side without trunk rotation. 2=Diagonal opposite arm-leg without rotation. 1=Rotation present OR unable. 0=Pain.",
    defects:{
      trunk_rotation_rs:{
        label:"Trunk Rotation During Extension",
        meaning:"Spine rotates as arm or leg extends — deep core fails to resist rotational moment from limb extension.",
        biomech:"TA, multifidus, and diaphragm form core canister providing stiffness. Ipsilateral extension creates rotational moment — core failure allows trunk to rotate with limbs.",
        weak:["Transverse abdominis primary","Multifidus rotational stabiliser","Gluteus maximus ipsilateral","Deep hip stabilisers","Diaphragm coordination"],
        tight:["Thoracolumbar fascia limits TA tensioning","Hip flexors create anterior rotation"],
        kinetic:"Trunk rotation → asymmetric SI joint loading → lumbar facet asymmetric stress → poor athletic force transfer.",
        type:"Stability + Motor Control",
        risk:"SI joint dysfunction, lumbar disc torsion, poor sports performance force leaks at lumbopelvic junction.",
        compensation:"Trunk rotates with extending limbs — treats trunk and limb as single unit rather than dissociating.",
        treatment:["Phase 1: arm extension only no leg 3×10","Phase 2: leg extension only 3×10","Phase 3: combine slowly 3s hold 3×8","Phase 4: add resistance band on extending limb","Phase 5: book on back maintain level","Exhale to brace → then extend"],
        exercises:["Bird-dog arm only 3×10","Bird-dog leg only 3×10","Bird-dog combined slow 3s hold 3×8","Book on back quadruped hold 3×30s","Pallof press 3×12 each direction","Dead bug 3×10"]},
      hip_drop_rs:{
        label:"Hip Drop in Quadruped",
        meaning:"Hip drops on extending leg side — lateral hip stabiliser weakness in quadruped.",
        biomech:"Extending leg creates abduction moment — glute med must resist. Weakness allows pelvis to drop toward extending leg side.",
        weak:["Gluteus medius ipsilateral","Gluteus minimus","Deep hip stabilisers","QL contralateral"],
        tight:["Contralateral QL must lengthen to allow drop","Hip adductors ipsilateral"],
        kinetic:"Hip drop → pelvic obliquity → asymmetric L4-5 loading → SI joint rotation.",
        type:"Stability",
        risk:"SI joint dysfunction, asymmetric lumbar disc loading, hip abductor tendinopathy.",
        compensation:"Contralateral trunk lean reduces apparent hip drop — masking abductor weakness.",
        treatment:["Glute med: clamshell 3×20, side-lying abduction 3×15","Quadruped hip extension donkey kick level pelvis 3×15","Cue: keep hips level like a table-top","Palpate ASIS for symmetry during exercise"],
        exercises:["Clamshell 3×20","Side-lying hip abduction 3×15","Quadruped hip extension level 3×15","Single-leg bridge 3×12","Lateral band walk 3×12"]},
      spine_flexion_extension_rs:{
        label:"Lumbar Flexion or Extension During Movement",
        meaning:"Lumbar moves into flexion or extension instead of neutral — poor core control in quadruped.",
        biomech:"Hip flexors pull lumbar into extension OR abdominals allow flexion during limb extension. Both indicate failure to maintain neutral.",
        weak:["Multifidus limits extension","TA limits flexion","Gluteus maximus limits anterior pelvic tilt"],
        tight:["Hip flexors cause extension","Hamstrings cause flexion compensation"],
        kinetic:"Lumbar movement → increased disc and facet loading dynamically → cumulative injury risk.",
        type:"Stability + Motor Control",
        risk:"Lumbar disc herniation, facet degeneration, SI joint stress.",
        compensation:"Lumbar moves to allow limb range that trunk stability cannot support — spine subsidises for lack of control.",
        treatment:["Pelvic neutral awareness: anterior → neutral → posterior tilt drill","Bird-dog with therapist hand under lumbar feedback","Pressure biofeedback maintain pressure during bird-dog","Core stabilisation in 4-point before limb movement"],
        exercises:["Pelvic tilt awareness drill 3×10 each direction","Bird-dog with lumbar feedback 3×10","TA drawing-in bird-dog 3×10","Pressure biofeedback bird-dog 3×10","Dead bug mirror pattern 3×10"]},
      loss_of_balance_rs:{
        label:"Loss of Balance / Falls from Quadruped",
        meaning:"Cannot maintain quadruped stability during limb extension — severe proximal stability deficit.",
        biomech:"Quadruped balance requires integrated wrist, shoulder, trunk, and hip proprioception. Loss indicates multi-segmental failure.",
        weak:["Wrist shoulder stabilisers","Core globally","Hip stabilisers"],
        tight:["Not primarily a tightness issue"],
        kinetic:"Balance loss → inability to perform safe functional loading → high injury risk.",
        type:"Motor Control + Proprioception",
        risk:"Falls risk, inability to safely perform athletic movements, poor deceleration.",
        compensation:"Rapid limb replacement, trunk lean, wide hand/knee placement.",
        treatment:["Regress: quadruped hold no limb extension 3×30s","Bear crawl dynamic quadruped 3×10m","Wrist stability: wrist circles closed-chain","Progress very gradually — stable before extending limbs"],
        exercises:["Quadruped hold stable 3×30s","Bear crawl 3×10m","Wrist stability drills 3×10","Quadruped weight shifts 3×10","Single-limb extension only when stable 3×10"]},
      only_diagonal_rs:{
        label:"Can Only Perform Diagonal (Not Unilateral) — Grade 2",
        meaning:"Cannot extend same-side arm + leg but can do contralateral — incomplete proximal stability.",
        biomech:"Unilateral extension creates greater rotational moment than diagonal. Diagonal is biomechanically easier — contralateral extension creates counterbalancing moments.",
        weak:["Deep stabilisers multifidus TA","Ipsilateral glute max","Core canister generally"],
        tight:["None specifically — strength/control deficit"],
        kinetic:"Unilateral deficit → reliance on counter-rotation strategy — adequate for daily function, insufficient for sport.",
        type:"Motor Control",
        risk:"Moderate athletic performance limitation — insufficient for sport-specific demands.",
        compensation:"Uses diagonal as compensatory strategy — counterbalancing reduces rotational demand.",
        treatment:["Practice unilateral bird-dog same side emphasis","Progress: resistance band on extending arm and leg","Core advancement: plank, dead bug with load","Re-test monthly — expect 6-8 weeks to achieve unilateral"],
        exercises:["Bird-dog ipsilateral emphasis 3×10 each","Ipsilateral bird-dog 2s hold 3×8","Pallof press anti-rotation 3×12","Dead bug challenging 3×10","Plank alternate leg lift 3×10 each"]},
      asymmetry_rs:{
        label:"Left-Right Asymmetry",
        meaning:"Performance differs between sides — unilateral stability or mobility deficit from previous injury or compensation.",
        biomech:"Asymmetric motor control from CNS adaptation to previous injury or dominant side overuse creates side-to-side difference.",
        weak:["Deep stabilisers weaker side","Glute max/med affected side"],
        tight:["Hip rotators affected side create rotational pull"],
        kinetic:"Asymmetry → asymmetric athletic load → overuse injury restricted side — key injury predictor.",
        type:"Motor Control (Asymmetrical)",
        risk:"High injury risk restricted side — asymmetry strongest predictor of future musculoskeletal injury.",
        compensation:"Stronger side used preferentially — restricted side avoids demand.",
        treatment:["Emphasise weaker side all exercises","Single-limb core exercises restricted side","Document and track progress every 4 weeks","Sport-specific loading after symmetry achieved"],
        exercises:["Bird-dog restricted side emphasis 3×10","Single-leg bridge restricted 3×12","Pallof press restricted side lead 3×12","Unilateral dead bug 3×10 restricted","Re-assess monthly track asymmetry"]},
      pain_clearing_rs:{
        label:"Pain on Clearing Test (Quadruped Rocking)",
        meaning:"Pain during quadruped rocking / child's pose — lumbar flexion or hip pathology limiting safe testing.",
        biomech:"Quadruped rocking loads hip flexion and lumbar flexion simultaneously. Pain indicates hip FAI, labral issue, lumbar flexion sensitivity, or SI joint dysfunction.",
        weak:["Not a weakness issue — pathological limitation"],
        tight:["Posterior hip capsule hip pain","Thoracolumbar fascia lumbar pain"],
        kinetic:"Pain → guarded movement → global co-contraction → further stiffness and restriction.",
        type:"Pathological — Score = 0",
        risk:"Hip FAI/labral tear, lumbar disc herniation flexion type, SI joint dysfunction. DO NOT LOAD.",
        compensation:"Hip pain avoidance → posterior lean → lumbar hyperextension substitute.",
        treatment:["IMMEDIATE: Score = 0. Refer for assessment — imaging if indicated","Differentiate: hip vs lumbar origin of pain","Address FAI conservatively or refer surgically","Lumbar: McKenzie assessment directional preference"],
        exercises:["Address pain first — no quadruped loading","Hip: gentle AROM pain-free range","Lumbar: directional preference McKenzie","Refer if not resolving","Water-based therapy if too painful for land"]}
    }
  }
};

const MP_CONNECTIONS_FMS=[[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32]];

function drawSkeletonFMS(ctx,lm,w,h){
  if(!lm||!lm.length)return;
  ctx.clearRect(0,0,w,h);
  ctx.lineWidth=2.5; ctx.strokeStyle="rgba(0,229,255,0.85)";
  MP_CONNECTIONS_FMS.forEach(([a,b])=>{
    const A=lm[a],B=lm[b];
    if(!A||!B||A.visibility<0.4||B.visibility<0.4)return;
    ctx.beginPath(); ctx.moveTo(A.x*w,A.y*h); ctx.lineTo(B.x*w,B.y*h); ctx.stroke();
  });
  lm.forEach((pt,i)=>{
    if(!pt||pt.visibility<0.4)return;
    ctx.beginPath(); ctx.arc(pt.x*w,pt.y*h,i===0?5:3.5,0,Math.PI*2);
    ctx.fillStyle="#00e5ff"; ctx.fill();
  });
}

function loadScriptFMS(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// SHARED PDF EXPORT UTILITY — replaces all window.print() calls
// Uses jsPDF loaded from CDN. Generates proper A4 PDFs that download
// directly without opening a print dialog.
// ═══════════════════════════════════════════════════════════════════════════

async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await new Promise((res, rej) => {
    if (document.querySelector('script[data-jspdf]')) { res(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.setAttribute('data-jspdf', '1');
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

// ── Core renderer — builds A4 pages from an HTML string via iframe ────────
async function generateFMSReportPDF(report){
  if(!window.jspdf){
    await new Promise((res,rej)=>{
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
  }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,pad=15; let y=pad;

  doc.setFillColor(13,17,23); doc.rect(0,0,W,32,"F");
  doc.setTextColor(0,229,255); doc.setFontSize(15); doc.setFont("helvetica","bold");
  doc.text("FUNCTIONAL MOVEMENT SCREEN — CLINICAL REPORT",pad,16);
  doc.setTextColor(140,170,200); doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Tests assessed: ${Object.keys(report).length}`,pad,24);
  y=40;

  Object.entries(report).forEach(([testId, testData])=>{
    const test=FMS_DB[testId];
    if(!test) return;
    if(y>250){doc.addPage();y=20;}

    // Test header
    doc.setFillColor(20,35,55); doc.rect(pad,y-6,W-pad*2,10,"F");
    doc.setTextColor(0,229,255); doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.text(`${test.label}  —  Score: ${testData.score??'—'}/3`,pad+2,y);
    y+=10;

    testData.defects.forEach(defId=>{
      const def=test.defects[defId]; if(!def) return;
      if(y>255){doc.addPage();y=20;}

      doc.setTextColor(255,179,0); doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.text(`⚠ ${def.label}`,pad+3,y); y+=6;

      doc.setTextColor(30,50,80); doc.setFontSize(8); doc.setFont("helvetica","bold");
      doc.text("Type:",pad+5,y); doc.setFont("helvetica","normal"); doc.text(def.type,pad+20,y); y+=5;

      doc.setFont("helvetica","bold"); doc.text("Clinical:",pad+5,y);
      const meaningLines=doc.splitTextToSize(def.meaning,W-pad*2-25);
      doc.setFont("helvetica","normal"); doc.text(meaningLines,pad+25,y); y+=meaningLines.length*4.5+2;

      doc.setFont("helvetica","bold"); doc.setTextColor(255,77,109); doc.text("Weak:",pad+5,y);
      doc.setFont("helvetica","normal"); doc.setTextColor(50,70,90);
      doc.text(def.weak.join(", "),pad+20,y); y+=5;

      doc.setFont("helvetica","bold"); doc.setTextColor(255,179,0); doc.text("Tight:",pad+5,y);
      doc.setFont("helvetica","normal"); doc.setTextColor(50,70,90);
      doc.text(def.tight.join(", "),pad+20,y); y+=5;

      if(y>250){doc.addPage();y=20;}
      doc.setFont("helvetica","bold"); doc.setTextColor(0,180,200); doc.text("Exercises:",pad+5,y); y+=4;
      def.exercises.forEach((ex,i)=>{
        if(y>268){doc.addPage();y=20;}
        doc.setFont("helvetica","normal"); doc.setTextColor(30,50,80); doc.setFontSize(7.5);
        doc.text(`${i+1}. ${ex}`,pad+8,y); y+=4.5;
      });
      y+=3;
      doc.setDrawColor(200,215,230); doc.line(pad,y,W-pad,y); y+=5;
    });
    y+=4;
  });

  doc.setFillColor(13,17,23); doc.rect(0,285,W,15,"F");
  doc.setTextColor(100,130,160); doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.text("FMS Clinical Report — PostureApp. For professional use only.",W/2,292,{align:"center"});
  const fname = report?.patient?.name
    ? `FMS_Report_${report.patient.name.replace(/\s+/g,"_")}_${Date.now()}.pdf`
    : `FMS_Clinical_Report_${Date.now()}.pdf`;
  doc.save(fname);
}

// ─── AI CAMERA PANEL (Optional) ───────────────────────────────────────────────
function FMSCameraPanel({onClose}){
  const videoRef=useRef(null), canvasRef=useRef(null), streamRef=useRef(null);
  const poseRef=useRef(null), cameraRef=useRef(null);
  const [status,setStatus]=useState("loading");
  const [camFacing,setCamFacing]=useState("user");

  useEffect(()=>{
    initCam();
    return ()=>{ cleanup(); };
  },[]);

  async function initCam(){
    setStatus("loading");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:camFacing,width:{ideal:640},height:{ideal:480}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      await loadScriptFMS("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScriptFMS("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
      await loadScriptFMS("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");
      if(!window.Pose){setStatus("cam-only");return;}
      const pose=new window.Pose({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`});
      pose.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      pose.onResults((results)=>{
        const canvas=canvasRef.current,video=videoRef.current;
        if(!canvas||!video)return;
        const W=canvas.width=video.videoWidth||640,H=canvas.height=video.videoHeight||480;
        if(results.poseLandmarks) drawSkeletonFMS(canvas.getContext("2d"),results.poseLandmarks,W,H);
      });
      poseRef.current=pose;
      const camera=new window.Camera(videoRef.current,{onFrame:async()=>{if(poseRef.current)await poseRef.current.send({image:videoRef.current});},width:640,height:480});
      cameraRef.current=camera; camera.start();
      setStatus("active");
    }catch(e){setStatus("error");}
  }

  function cleanup(){
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());}
    if(poseRef.current){try{poseRef.current.close();}catch{}}
    if(cameraRef.current){try{cameraRef.current.stop();}catch{}}
  }

  function flipCam(){cleanup();setCamFacing(f=>f==="user"?"environment":"user");setTimeout(initCam,300);}

  return(
    <div style={{background:"#FFFFFF",borderRadius:12,overflow:"hidden",marginBottom:12,position:"relative"}}>
      <div style={{position:"relative",aspectRatio:"4/3"}}>
        <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}} playsInline muted autoPlay/>
        <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",transform:"scaleX(-1)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:8,left:8,padding:"3px 8px",borderRadius:8,background:status==="active"?"rgba(0,201,122,0.85)":status==="loading"?"rgba(255,179,0,0.85)":"rgba(255,77,109,0.85)",fontSize:"0.82rem",color:"#fff",fontWeight:700}}>
          {status==="active"?"🟢 AI Pose Active":status==="loading"?"⏳ Loading...":status==="cam-only"?"📷 Camera Only":"❌ Error"}
        </div>
        <div style={{position:"absolute",top:8,right:8,display:"flex",gap:6}}>
          <button type="button" onClick={flipCam} style={{padding:"5px 9px",background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,color:"#fff",fontSize:"0.8rem",cursor:"pointer"}}>🔄</button>
          <button type="button" onClick={onClose} style={{padding:"5px 9px",background:"rgba(255,77,109,0.8)",border:"none",borderRadius:7,color:"#fff",fontSize:"0.8rem",cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
      </div>
      <div style={{padding:"8px 12px",background:"rgba(0,229,255,0.05)",borderTop:"1px solid rgba(0,229,255,0.15)",fontSize:"0.8rem",color:"rgba(0,229,255,0.8)"}}>
        ⚠ AI camera is assistive only — use it to observe posture. All clinical decisions remain manual.
      </div>
    </div>
  );
}

export { KineticChainSection, MOVEMENTS };
