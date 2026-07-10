// PhysioNeuro.jsx — ALL_TESTS, ROM, MMT, Neurological
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { C, getC, RegionPickerButton, RegionChips, applyPersistentHighlight } from "./utils.jsx";
import { ALL_TESTS, ROM_DATA, ROM_REGIONS, RESTRICTION_GRADE, ROM_REDFLAGS, MMT_GRADES, MMT_DATA, MMT_GRADE_OPTIONS, MMT_REGIONS, MMT_ICONS, parseMuscleName, RED_FLAGS_MMT, KINETIC_CHAINS, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO, NERVE_ROOT_MAP, CRANIAL_NERVES, COORDINATION_TESTS, INVOLUNTARY_MOVEMENT_TYPES, VESTIBULAR_TESTS, PERCEPTUAL_TESTS } from "./sharedClinicalData.js";


const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";

function ImageModal({ src, title, onClose }) {
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:"95vw",maxHeight:"93vh",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"0.88rem"}}>{title}</span>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:6,color:"#fff",fontWeight:800,cursor:"pointer",padding:"4px 14px",fontSize:"0.75rem",marginLeft:12}}>✕ Close</button>
        </div>
        <img src={src} alt={title}
          style={{maxWidth:"90vw",maxHeight:"84vh",objectFit:"contain",borderRadius:10,display:"block"}}/>
      </div>
    </div>
  );
}

function ClinicalImage({ name, title, size=52 }) {
  const [exists, setExists] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  if (!exists) return null;
  const thumb = `${CLOUDINARY_BASE}/f_auto,q_auto,w_${size},h_${size},c_fill/${name}`;
  const full  = `${CLOUDINARY_BASE}/f_auto,q_auto/${name}`;
  return (
    <>
      <img src={thumb} alt={title||name}
        onError={()=>setExists(false)}
        onClick={()=>setOpen(true)}
        title={`Tap to view: ${title||name}`}
        style={{width:size,height:size,objectFit:"cover",borderRadius:7,cursor:"pointer",
          border:"2px solid rgba(124,58,237,0.25)",flexShrink:0,display:"block"}}
      />
      {open && <ImageModal src={full} title={title||name} onClose={()=>setOpen(false)}/>}
    </>
  );
}

// Small badge for muscle-card headers: shows an uploaded Cloudinary photo (named by
// the muscle id, e.g. "mmt_adduc") if one exists, falling back to the region emoji.
function MovementIcon({ size=20, color="#7c3aed" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.5" cy="5" r="2"/>
      <line x1="12" y1="7.2" x2="11.3" y2="13.5"/>
      <line x1="11.6" y1="9" x2="7.5" y2="11.5"/>
      <line x1="11.9" y1="9.3" x2="16.5" y2="10.5"/>
      <line x1="11.3" y1="13.5" x2="8" y2="19.5"/>
      <line x1="11.3" y1="13.5" x2="15.5" y2="18.5"/>
    </svg>
  );
}

// Badge for muscle-card headers: shows an uploaded Cloudinary photo (named by the
// muscle id, e.g. "mmt_adduc") if one exists, falling back to a simple movement icon.
function MuscleBadge({ id, title, size=40 }) {
  const [imgOk, setImgOk] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const thumb = `${CLOUDINARY_BASE}/f_auto,q_auto,w_${size*2},h_${size*2},c_fill/${id}`;
  const full  = `${CLOUDINARY_BASE}/f_auto,q_auto/${id}`;
  return (
    <>
      <div onClick={imgOk?(e=>{e.stopPropagation();setOpen(true);}):undefined}
        style={{width:size,height:size,borderRadius:11,background:`${C.accent}14`,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden",
        cursor:imgOk?"pointer":"default"}}>
        {imgOk
          ? <img src={thumb} alt="" onError={()=>setImgOk(false)}
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          : <MovementIcon size={size*0.5} color={C.accent}/>}
      </div>
      {open && <ImageModal src={full} title={title||id} onClose={()=>setOpen(false)}/>}
    </>
  );
}

function genROMSoap(data){
  const findings=[];
  ROM_REGIONS.forEach(reg=>{
    ROM_DATA[reg].forEach(m=>{
      const sides=m.bilateral?["_L","_R"]:[""];
      sides.forEach(s=>{
        const v=data[`${m.id}${s}_arom`]||data[`${m.id}${s}`];
        if(v){
          const g=RESTRICTION_GRADE(parseFloat(v),m.normal);
          if(g&&g.label!=="WNL") findings.push(`${m.mv}${s?` (${s.slice(1)})`:""}=${v}${m.unit} [${g.label} restriction: ${Math.round(g.pct)}% normal]`);
        }
      });
    });
  });
  return findings.length===0?"No significant ROM restrictions recorded.":`ROM restrictions identified:\n${findings.join("\n")}`;
}


// Deep-link highlight animation — injected once globally
if (typeof document !== "undefined" && !document.getElementById("physio-hl-style")) {
  const st = document.createElement("style");
  st.id = "physio-hl-style";
  st.textContent = `
    @keyframes physioHL {
      0%   { box-shadow: 0 0 0 0 rgba(147,51,234,0.5); border-color: #9333ea; }
      50%  { box-shadow: 0 0 0 8px rgba(147,51,234,0.2); border-color: #c084fc; }
      100% { box-shadow: 0 0 0 0 rgba(147,51,234,0); border-color: transparent; }
    }
    /* Brief attention pulse when a suggested item is deep-linked to. */
    .physio-highlight { animation: physioHL 1.8s ease-out 2; }
    /* Stays after the pulse ends -- previously the highlight vanished
       after a blind 4s timeout even if the user hadn't looked at it yet.
       Now it persists until the user clicks into the item (starting to
       complete it) or otherwise dismisses it. Subtle glow, not another
       animation, so it doesn't nag. */
    .physio-highlight-persist {
      border-color: #9333ea !important;
      background: rgba(147,51,234,0.09) !important;
      box-shadow: 0 0 0 2px rgba(147,51,234,0.35) !important;
      transition: background 0.25s, box-shadow 0.25s, border-color 0.25s;
    }
  `;
  document.head.appendChild(st);
}

function ROMModule({data,set,navContext={}}){
  const [region,setRegion]=useState(()=>{
    if(navContext.romRegion && ROM_REGIONS.includes(navContext.romRegion)) return navContext.romRegion;
    return ROM_REGIONS[0];
  });
  const hlRef = React.useRef({});

  // Auto-select region + scroll + highlight target movement
  React.useEffect(()=>{
    if(navContext.romRegion && ROM_REGIONS.includes(navContext.romRegion)) setRegion(navContext.romRegion);
  },[navContext.romRegion]);

  React.useEffect(()=>{
    // Support both single romHighlight and array romHighlights
    const targets = navContext.romHighlights
      ? navContext.romHighlights
      : navContext.romHighlight
        ? [navContext.romHighlight]
        : [];
    if(targets.length === 0) return;
    setTimeout(()=>{
      let scrolled = false;
      targets.forEach((id, i) => {
        const el = hlRef.current[id];
        if(el){
          // Scroll to first match only
          if(!scrolled){ el.scrollIntoView({ behavior:"smooth", block:"center" }); scrolled=true; }
          applyPersistentHighlight(el);
        }
      });
    }, 350);
  },[navContext.romHighlight, navContext.romHighlights]);
  const [selected,setSelected]=useState(null);
  const [showSoap,setShowSoap]=useState(false);
  const [mode,setMode]=useState("arom"); // arom | prom | resisted

  const movements=ROM_DATA[region]||[];

  const getVal=(id,side="")=>data[`${id}${side}_${mode}`]||"";
  const setVal=(id,side,val)=>set(`${id}${side}_${mode}`,val);

  const allFindings=[];
  ROM_REGIONS.forEach(reg=>{
    ROM_DATA[reg].forEach(m=>{
      const sides=m.bilateral?["_L","_R"]:[""];
      sides.forEach(s=>{
        const v=getVal(m.id,s)||data[`${m.id}${s}`];
        if(v){
          const g=RESTRICTION_GRADE(parseFloat(v),m.normal);
          if(g&&g.label!=="WNL") allFindings.push({mv:m.mv,side:s.slice(1)||"",grade:g,val:v,unit:m.unit});
        }
      });
    });
  });

  const romSnapshots = Array.isArray(data.rom_snapshots) ? data.rom_snapshots : [];

  const redFlagsActive=[];
  ROM_REGIONS.forEach(reg=>ROM_DATA[reg].forEach(m=>{
    ["_L","_R",""].forEach(s=>{
      const v=getVal(m.id,s);
      if(v) ROM_REDFLAGS.forEach(rf=>{if(rf.test(m.mv,v)) redFlagsActive.push({msg:rf.msg,color:rf.color});});
    });
  }));

  const btn=(lbl,active,fn,col)=>(
    <button type="button" onClick={fn} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${active?(col||C.accent):C.border}`,background:active?`${col||C.accent}18`:"transparent",color:active?(col||C.accent):C.muted,fontSize:"0.68rem",fontWeight:active?700:400,cursor:"pointer",transition:"all 0.15s"}}>
      {lbl}
    </button>
  );

  const barW=(val,normal)=>{
    if(!val||!normal) return 0;
    return Math.min(100,Math.round((parseFloat(val)/normal)*100));
  };

  return(
    <div>
      {/* Red Flags */}
      {redFlagsActive.map((rf,i)=>(
        <div key={i} style={{marginBottom:6,padding:"7px 12px",background:`${rf.color}12`,border:`1px solid ${rf.color}40`,borderRadius:8,fontSize:"0.74rem",color:rf.color,fontWeight:600}}>
          🚨 {rf.msg}
        </div>
      ))}

      {/* Mode Toggle */}
      <div className="pm-rom-controls" style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {[["arom","Active ROM"],["prom","Passive ROM"],["resisted","Resisted"]].map(([m,l])=>
          btn(l,mode===m,()=>setMode(m),C.accent)
        )}
        <div style={{marginLeft:"auto"}}>
          {btn(showSoap?"▲ Hide SOAP":"▼ SOAP Note",showSoap,()=>setShowSoap(p=>!p),C.a3)}
        </div>
      </div>

      {/* ── ROM SNAPSHOT & TREND ───────────────────────────────────────── */}
      <div className="pm-rom-snapshots" style={{background:"rgba(124,58,237,0.05)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:"0.65rem",fontWeight:700,color:"#7c3aed",textTransform:"uppercase",letterSpacing:"0.8px"}}>📸 Session Snapshots</span>
        <button onClick={()=>{
          const now = new Date();
          const snapshot = {
            id: now.getTime().toString(36),
            date: now.toLocaleDateString("en-AU",{day:"2-digit",month:"short",year:"numeric"}),
            dateISO: now.toISOString(),
            findings: allFindings.slice(0,8).map(f=>({mv:f.mv,side:f.side,val:f.val,grade:f.grade?.label||""})),
            restricted: allFindings.filter(f=>f.grade&&f.grade.label!=="WNL").length,
            total: allFindings.length,
          };
          set("rom_snapshots", [...romSnapshots, snapshot]);
        }} style={{padding:"5px 12px",background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:8,color:"#7c3aed",fontSize:"0.68rem",fontWeight:700,cursor:"pointer"}}>
          + Save Snapshot
        </button>
        {romSnapshots.length > 0 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {[...romSnapshots].reverse().slice(0,5).map((s,i)=>(
              <div key={s.id||i} style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,padding:"4px 10px",fontSize:"0.65rem",color:"#7c3aed",textAlign:"center"}}>
                <div style={{fontWeight:800}}>{s.date}</div>
                <div style={{fontSize:"0.6rem",opacity:0.8}}>{s.restricted}/{s.total} restricted</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOAP Note */}
      {showSoap&&(
        <div style={{marginBottom:12,padding:"10px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>ROM SOAP — Objective Findings</div>
          <pre style={{fontSize:"0.72rem",color:C.text,whiteSpace:"pre-wrap",margin:0,lineHeight:1.6}}>{genROMSoap(data)}</pre>
        </div>
      )}

      {/* Overall Restriction Summary */}
      {allFindings.length>0&&(
        <div style={{marginBottom:12,padding:"9px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Restriction Summary</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {allFindings.map((f,i)=>(
              <span key={i} style={{fontSize:"0.65rem",padding:"2px 7px",borderRadius:5,background:`${f.grade.color}18`,color:f.grade.color,border:`1px solid ${f.grade.color}30`,fontWeight:600}}>
                {f.mv}{f.side?` (${f.side})`:""}: {f.val}{f.unit} [{f.grade.label}]
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Region Picker */}
      {(()=>{
        const ROM_ICONS={
          "Cervical":["🔵","#0891b2"],"Thoracic":["🟠","#d97706"],"Lumbar":["🟠","#ea580c"],
          "Shoulder":["💪","#9333ea"],"Elbow":["🫀","#db2777"],"Wrist":["🤚","#16a34a"],
          "Hand & Fingers":["✋","#059669"],"Hip":["🦵","#16a34a"],"Knee":["🦿","#ca8a04"],
          "Ankle":["🦶","#0284c7"],"Foot":["🦶","#0369a1"],"TMJ":["🦷","#9f1239"],
          "Shoulder & Scapula":["💪","#9333ea"],"Elbow & Forearm":["🫀","#db2777"],
          "Wrist & Hand":["🤚","#16a34a"],"Spine & Core":["🪴","#78716c"],
          "Hip & Pelvis":["🦵","#16a34a"],"Ankle & Foot":["🦶","#0284c7"],"TMJ & Facial":["🦷","#9f1239"]
        };
        const romRegionList = ROM_REGIONS.map(r=>{
          const [icon,color]=ROM_ICONS[r]||["📍",C.a2];
          const filled=ROM_DATA[r]?ROM_DATA[r].filter(m=>{
            const sides=m.bilateral?["_L","_R"]:[""];
            return sides.some(s=>data[`${m.id}${s}_arom`]||data[`${m.id}${s}_prom`]||data[`${m.id}${s}`]);
          }).length:0;
          return {key:r,label:r,icon,color,filled};
        });
        return (
          <RegionChips
            regions={romRegionList}
            active={region}
            onSelect={r=>{setRegion(r);setSelected(null);}}
          />
        );
      })()}

      {/* Movement Cards */}
      <div style={{display:"grid",gap:8}}>
        {movements.map(m=>{
          const isOpen=selected===m.id;
          const sides=m.bilateral?["_L","_R"]:[""];
          const hasAnyVal=sides.some(s=>getVal(m.id,s));

          return(
            <div key={m.id} ref={el=>{ if(el) hlRef.current[m.id]=el; }} style={{background:C.surface,border:`1px solid ${hasAnyVal?C.accent+"30":C.border}`,borderRadius:10,overflow:"hidden"}}>
              {/* Card Header */}
              <div onClick={()=>setSelected(isOpen?null:m.id)} style={{padding:"10px 12px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                    <ClinicalImage name={m.id} title={`${m.mv} — ${region}`} size={44}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.82rem",color:hasAnyVal?C.text:C.muted}}>{m.mv}</div>
                      <div className="pm-test-card-sub" style={{fontSize:"0.6rem",color:C.muted,marginTop:1}}>{m.plane} · N={m.normal}{m.unit}</div>
                    </div>
                  </div>
                  {/* Bilateral inputs */}
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    {sides.map(s=>{
                      const val=getVal(m.id,s);
                      const grade=m.normal?RESTRICTION_GRADE(parseFloat(val),m.normal):null;
                      const bw=barW(val,m.normal);
                      return(
                        <div key={s} onClick={e=>e.stopPropagation()} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:52}}>
                          {m.bilateral&&<span style={{fontSize:"0.55rem",fontWeight:700,color:C.muted}}>{s.slice(1)}</span>}
                          <input
                            type="number" min="0" max={m.normal?m.normal*1.2:200}
                            value={val} placeholder="°"
                            onChange={e=>setVal(m.id,s,e.target.value)}
                            style={{width:52,padding:"3px 5px",borderRadius:6,border:`1px solid ${grade?grade.color:C.border}`,background:grade?`${grade.color}15`:C.s2,color:grade?grade.color:C.text,fontSize:"0.78rem",fontWeight:700,textAlign:"center"}}
                          />
                          {/* Bar indicator */}
                          {m.normal&&val&&(
                            <div style={{width:52,height:4,borderRadius:2,background:C.s3,overflow:"hidden"}}>
                              <div style={{width:`${bw}%`,height:"100%",background:grade?.color||C.green,borderRadius:2,transition:"width 0.3s"}}/>
                            </div>
                          )}
                          {grade&&<span style={{fontSize:"0.55rem",color:grade.color,fontWeight:700}}>{grade.label}</span>}
                        </div>
                      );
                    })}
                    <span style={{color:C.muted,fontSize:"0.7rem"}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Pain arc toggle */}
                <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}} onClick={e=>e.stopPropagation()}>
                  {["No pain","Painful arc","End-range pain","Throughout"].map(p=>(
                    <button type="button" key={p} className="pm-rom-qual-btn"
                      onClick={()=>set(`${m.id}_pain`,data[`${m.id}_pain`]===p?"":p)}
                      style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:5,border:`1px solid ${data[`${m.id}_pain`]===p?"#ff4d6d40":C.border}`,background:data[`${m.id}_pain`]===p?"#ff4d6d15":"transparent",color:data[`${m.id}_pain`]===p?"#ff4d6d":C.muted,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                  {["Soft","Firm","Hard","Empty","Springy"].map(ef=>(
                    <button type="button" key={ef} className="pm-rom-qual-btn"
                      onClick={()=>set(`${m.id}_ef`,data[`${m.id}_ef`]===ef?"":ef)}
                      style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:5,border:`1px solid ${data[`${m.id}_ef`]===ef?C.accent+"60":C.border}`,background:data[`${m.id}_ef`]===ef?C.accent+"15":"transparent",color:data[`${m.id}_ef`]===ef?C.accent:C.muted,cursor:"pointer"}}>
                      {ef}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expanded Detail Panel */}
              {isOpen&&(
                <div style={{padding:"0 12px 12px",borderTop:`1px solid ${C.border}`}}>

                  {/* Goniometer */}
                  <div style={{marginTop:10,padding:"8px 10px",background:C.s2,borderRadius:8,marginBottom:8}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a2,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>📐 Goniometer Placement</div>
                    <div style={{fontSize:"0.73rem",color:C.text,lineHeight:1.5}}>{m.gonio}</div>
                    <div style={{fontSize:"0.65rem",color:C.muted,marginTop:4}}>Starting position: {m.start}</div>
                  </div>

                  {/* Muscles */}
                  <div style={{padding:"7px 10px",background:`${C.a3}0d`,border:`1px solid ${C.a3}20`,borderRadius:7,marginBottom:8}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a3,marginBottom:3}}>💪 MUSCLES</div>
                    <div style={{fontSize:"0.73rem",color:C.text}}>{m.muscles}</div>
                  </div>

                  {/* End Feel */}
                  <div style={{padding:"7px 10px",background:`${C.accent}0d`,border:`1px solid ${C.accent}20`,borderRadius:7,marginBottom:8}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.accent,marginBottom:3}}>🖐 END FEEL</div>
                    <div style={{fontSize:"0.73rem",color:C.text}}><strong>Normal:</strong> {m.endfeel.normal}</div>
                    <div style={{fontSize:"0.73rem",color:C.muted,marginTop:2}}><strong>Abnormal:</strong> {m.endfeel.abnormal}</div>
                  </div>

                  {/* Compensation + Capsular */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                    <div style={{padding:"7px 10px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:7}}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:C.yellow,marginBottom:3}}>⚠️ COMPENSATION</div>
                      <div style={{fontSize:"0.7rem",color:C.text}}>{m.compensation}</div>
                    </div>
                    <div style={{padding:"7px 10px",background:`${C.a4}0d`,border:`1px solid ${C.a4}20`,borderRadius:7}}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a4,marginBottom:3}}>🔵 CAPSULAR PATTERN</div>
                      <div style={{fontSize:"0.7rem",color:C.text}}>{m.capsular}</div>
                    </div>
                  </div>

                  {/* Pathology + ADL */}
                  <div style={{padding:"7px 10px",background:C.s2,borderRadius:7,marginBottom:8}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>PATHOLOGY CORRELATION</div>
                    <div style={{fontSize:"0.73rem",color:C.text,lineHeight:1.5}}>{m.pathology}</div>
                    <div style={{marginTop:5,fontSize:"0.65rem",color:C.muted}}><strong>ADL Relevance:</strong> {m.adl}</div>
                  </div>

                  {/* Age considerations */}
                  {(m.pediatric||m.geriatric)&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
                      {m.pediatric&&<div style={{padding:"7px 10px",background:C.s2,borderRadius:7}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a2,marginBottom:3}}>👶 PEDIATRIC</div>
                        <div style={{fontSize:"0.7rem",color:C.text}}>{m.pediatric}</div>
                      </div>}
                      {m.geriatric&&<div style={{padding:"7px 10px",background:C.s2,borderRadius:7}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a4,marginBottom:3}}>👴 GERIATRIC</div>
                        <div style={{fontSize:"0.7rem",color:C.text}}>{m.geriatric}</div>
                      </div>}
                    </div>
                  )}

                  {/* Red Flag */}
                  {m.redflag&&(
                    <div style={{padding:"7px 10px",background:"#ff4d6d10",border:"1px solid #ff4d6d30",borderRadius:7}}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:"#ff4d6d",marginBottom:3}}>🚨 RED FLAGS</div>
                      <div style={{fontSize:"0.73rem",color:C.text}}>{m.redflag}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function MMTModule({data,set,navContext={}}){
  const [region,setRegion]=useState(()=>{
    if(navContext.mmtRegion && MMT_REGIONS.includes(navContext.mmtRegion)) return navContext.mmtRegion;
    return MMT_REGIONS[0];
  });
  const mmtHlRef = React.useRef({});

  React.useEffect(()=>{
    if(navContext.mmtRegion && MMT_REGIONS.includes(navContext.mmtRegion)) setRegion(navContext.mmtRegion);
  },[navContext.mmtRegion]);

  React.useEffect(()=>{
    // Support both single mmtHighlight and array mmtHighlights
    const targets = navContext.mmtHighlights
      ? navContext.mmtHighlights
      : navContext.mmtHighlight
        ? [navContext.mmtHighlight]
        : [];
    if(targets.length === 0) return;
    setTimeout(()=>{
      let scrolled = false;
      targets.forEach((id) => {
        const el = mmtHlRef.current[id];
        if(el){
          if(!scrolled){ el.scrollIntoView({ behavior:"smooth", block:"center" }); scrolled=true; }
          applyPersistentHighlight(el);
        }
      });
    }, 350);
  },[navContext.mmtHighlight, navContext.mmtHighlights]);
  const [selected,setSelected]=useState(null);
  const [showInterp,setShowInterp]=useState(false);
  const [showMMTScale,setShowMMTScale]=useState(false);

  const muscles=MMT_DATA[region]||[];
  const gradeColor=(g)=>MMT_GRADES.find(x=>x.g===g)?.color||C.muted;
  const gradeLabel=(g)=>MMT_GRADES.find(x=>x.g===g)?.label||"";

  const allGrades={};
  Object.values(MMT_DATA).flat().forEach(m=>{
    ["L","R"].forEach(side=>{
      const k=`mmt_${m.id}_${side}`;
      if(data[k]) allGrades[k]=data[k];
    });
  });

  const redFlags=RED_FLAGS_MMT.filter(rf=>rf.pattern(allGrades));

  const chainFindings=KINETIC_CHAINS.map(ch=>{
    const weak=ch.muscles.filter(mid=>["L","R"].some(s=>{
      const v=data[`mmt_${mid}_${s}`]||data[`${mid}_${s}`];
      return v && parseFloat(v)<4;
    }));
    return {...ch,weak};
  }).filter(ch=>ch.weak.length>=2);

  const myotomeAnalysis=(()=>{
    const map={
      "C5":["mmt_deltM","mmt_bicep"],"C6":["mmt_bicep","mmt_brachio","mmt_ecrb"],
      "C7":["mmt_tricep","mmt_ecul","mmt_fcr"],"C8":["mmt_fdp","mmt_fcu","mmt_edc"],
      "T1":["mmt_interos","mmt_apbrev"],"L2":["mmt_iliop","mmt_adduc"],
      "L3":["mmt_rectfem","mmt_quad"],"L4":["mmt_quad","mmt_ta","mmt_tp"],
      "L5":["mmt_ta","mmt_ehl","mmt_peronls"],"S1":["mmt_gastroc","mmt_soleus","mmt_hamstr"],
      "S2":["mmt_hamstr","mmt_fdl"]
    };
    return Object.entries(map).map(([level,mids])=>{
      const affected=mids.filter(mid=>{
        const vals=["L","R"].map(s=>data[`mmt_${mid}_${s}`]||data[`${mid}_${s}`]).filter(Boolean);
        return vals.some(v=>parseFloat(v)<4);
      });
      return {level,affected,total:mids.length};
    }).filter(x=>x.affected.length>0);
  })();

  const rehabSuggestions=(m)=>{
    const grade=data[`mmt_${m.id}_L`]||data[`mmt_${m.id}_R`];
    if(!grade) return null;
    const g=parseFloat(grade);
    if(g<=1) return"Grade 0–1: NMES/FES + passive ROM + facilitation (tapping, vibration, ice). Neurological consult.";
    if(g<=2) return"Grade 1–2: Gravity-eliminated active-assisted exercise. Pool therapy. Motor control re-education.";
    if(g<=3) return"Grade 2–3: Against-gravity exercise without resistance. Functional tasks. Daily living activities.";
    if(g<4) return"Grade 3–4: Progressive resistance training. Closed-chain loading. Sport/task-specific exercise.";
    if(g<5) return"Grade 4: Strengthening under load. Eccentric training. Plyometrics if appropriate.";
    return"Grade 5: Maintenance, sport-specific conditioning. Injury prevention.";
  };

  const btn=(label,active,onClick,col)=>(
    <button type="button" onClick={onClick} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${active?(col||C.accent):C.border}`,background:active?`${col||C.accent}18`:"transparent",color:active?(col||C.accent):C.muted,fontSize:"0.68rem",fontWeight:active?700:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  return(
    <div>
      {/* Red Flags */}
      {redFlags.length>0&&(
        <div style={{marginBottom:12}}>
          {redFlags.map((rf,i)=>(
            <div key={i} style={{padding:"8px 12px",background:`${rf.color}12`,border:`1px solid ${rf.color}40`,borderRadius:8,marginBottom:6,fontSize:"0.74rem",color:rf.color,fontWeight:600}}>
              🔴 {rf.msg}
            </div>
          ))}
        </div>
      )}

      {/* MMT Grade Legend — minimal slim strip, collapsed by default */}
      <div style={{marginBottom:8}}>
        <div onClick={()=>setShowMMTScale(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"2px 2px"}}>
          <span style={{fontSize:"0.55rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",flexShrink:0}}>MMT Scale</span>
          {!showMMTScale && (
            <span style={{fontSize:"0.58rem",color:C.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              5 Normal → 0 Zero
            </span>
          )}
          <span style={{color:C.muted,fontSize:"0.6rem",flexShrink:0}}>{showMMTScale?"▲":"▼"}</span>
        </div>
        {showMMTScale && (
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5,padding:"6px 8px",background:C.s2,borderRadius:7,border:`1px solid ${C.border}`}}>
            {MMT_GRADES.map(g=>(
              <span key={g.g} style={{fontSize:"0.62rem",padding:"2px 6px",borderRadius:5,background:`${g.color}20`,color:g.color,fontWeight:700,border:`1px solid ${g.color}30`}} title={g.desc}>
                {g.g} {g.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Region Picker */}
      {(()=>{
        const MMT_ICONS={
          "Cervical":["🔵","#0891b2"],"Shoulder & Scapula":["💪","#9333ea"],
          "Elbow & Forearm":["🫀","#db2777"],"Wrist & Hand":["🤚","#16a34a"],
          "Spine & Core":["🪴","#78716c"],"Hip & Pelvis":["🦵","#16a34a"],
          "Knee":["🦿","#ca8a04"],"Ankle & Foot":["🦶","#0284c7"],"TMJ & Facial":["🦷","#9f1239"]
        };
        const mmtRegionList = MMT_REGIONS.map(r=>{
          const [icon,color]=MMT_ICONS[r]||["📍",C.a2];
          const filled=MMT_DATA[r]?MMT_DATA[r].filter(m=>{
            return data[`mmt_${m.id}_L`]||data[`mmt_${m.id}_R`];
          }).length:0;
          return {key:r,label:r,icon,color,filled};
        });
        return (
          <RegionChips
            regions={mmtRegionList}
            active={region}
            onSelect={r=>{setRegion(r);setSelected(null);}}
          />
        );
      })()}

      {/* Muscle Cards */}
      <div style={{display:"grid",gap:8}}>
        {muscles.map(m=>{
          const isOpen=selected===m.id;
          const lv=data[`mmt_${m.id}_L`];
          const rv=data[`mmt_${m.id}_R`];
          const hasVal=lv||rv;
          const rehab=rehabSuggestions(m);
          return(
            <div key={m.id} ref={el=>{ if(el) mmtHlRef.current[m.id]=el; }} style={{background:C.surface,border:`1px solid ${hasVal?C.accent+"30":C.border}`,borderRadius:10,overflow:"hidden"}}>
              {/* Header */}
              <div onClick={()=>setSelected(isOpen?null:m.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <MuscleBadge id={m.id} title={m.muscle}/>
                  <div style={{minWidth:0,flex:1,paddingTop:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <div style={{minWidth:0,flex:1}}>
                        {(()=>{ const {title,sub}=parseMuscleName(m.muscle); return (
                          <>
                            <div style={{fontWeight:700,fontSize:"0.94rem",color:C.text,overflowWrap:"break-word"}}>{title}</div>
                            {sub && <div style={{fontSize:"0.76rem",color:C.muted,marginTop:2,overflowWrap:"break-word"}}>{sub}</div>}
                          </>
                        );})()}
                      </div>
                      <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                        {/* Bilateral Grading — compact, beside muscle name */}
                        {["L","R"].map(side=>{
                          const val=data[`mmt_${m.id}_${side}`];
                          return(
                            <div key={side} style={{display:"flex",alignItems:"center",gap:2}}>
                              <span style={{fontSize:"0.58rem",color:C.muted,fontWeight:600}}>{side}</span>
                              <select
                                className="pm-compact-select"
                                value={val||""}
                                onChange={e=>{e.stopPropagation();set(`mmt_${m.id}_${side}`,e.target.value);}}
                                onClick={e=>e.stopPropagation()}
                                title={val?gradeLabel(val):""}
                                style={{fontSize:"0.72rem",padding:"4px 2px",borderRadius:7,border:`1px solid ${val?gradeColor(val):C.border}`,background:val?`${gradeColor(val)}18`:"#fff",color:val?gradeColor(val):C.muted,fontWeight:700,cursor:"pointer",width:40}}
                              >
                                <option value="">--</option>
                                {MMT_GRADE_OPTIONS.map(g=><option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                          );
                        })}
                        <span style={{color:C.muted,fontSize:"0.65rem"}}>{isOpen?"▲":"▼"}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.72rem",color:"#5F5E5A",background:"#F1EFE8",padding:"3px 10px",borderRadius:20}}>{m.nerve}</span>
                      <span style={{fontSize:"0.72rem",color:"#5F5E5A",background:"#F1EFE8",padding:"3px 10px",borderRadius:20}}>{m.root}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isOpen&&(
                <div style={{padding:"0 12px 12px 12px",borderTop:`1px solid ${C.border}`}}>
                  {/* Anatomy */}
                  <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    {[["Action",m.action],["Nerve",m.nerve],["Root",m.root],["Origin",m.origin],["Insertion",m.insertion]].map(([lbl,val])=>(
                      <div key={lbl} style={{padding:"6px 8px",background:C.s2,borderRadius:7}}>
                        <div style={{fontSize:"0.55rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px"}}>{lbl}</div>
                        <div style={{fontSize:"0.72rem",color:C.text,marginTop:2,lineHeight:1.4}}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Testing Protocol */}
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a2,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Testing Protocol</div>
                    {[["Patient Position",m.patient,"👤"],["Therapist",m.therapist,"🙌"],["Resistance",m.resistance,"↕️"],["Gravity Eliminated",m.gravElim,"⬇️"],["Palpation",m.palpation,"👆"]].map(([lbl,val,icon])=>(
                      <div key={lbl} style={{display:"flex",gap:8,padding:"5px 9px",background:C.s3,borderRadius:7,marginBottom:4,alignItems:"flex-start"}}>
                        <span style={{flexShrink:0}}>{icon}</span>
                        <div>
                          <span style={{fontSize:"0.6rem",fontWeight:700,color:C.muted}}>{lbl}: </span>
                          <span style={{fontSize:"0.73rem",color:C.text}}>{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compensations */}
                  <div style={{marginBottom:8,padding:"7px 10px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:7}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,color:C.yellow,marginBottom:4}}>⚠️ COMPENSATION / SUBSTITUTION</div>
                    <div style={{fontSize:"0.73rem",color:C.text}}><strong>Compensation:</strong> {m.compensation}</div>
                    <div style={{fontSize:"0.73rem",color:C.text,marginTop:3}}><strong>Substitution:</strong> {m.substitution}</div>
                  </div>

                  {/* Functional / Kinetic Chain */}
                  {(m.functional||m.chain)&&(
                    <div style={{marginBottom:8,padding:"7px 10px",background:`${C.a2}0d`,border:`1px solid ${C.a2}25`,borderRadius:7}}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a2,marginBottom:4}}>⛓️ CLINICAL INTERPRETATION</div>
                      {m.functional&&<div style={{fontSize:"0.73rem",color:C.text,marginBottom:3}}>{m.functional}</div>}
                      {m.chain&&<div style={{fontSize:"0.72rem",color:C.muted,fontStyle:"italic"}}>{m.chain}</div>}
                    </div>
                  )}

                  {/* Rehab */}
                  {rehab&&(
                    <div style={{padding:"7px 10px",background:`${C.a3}0d`,border:`1px solid ${C.a3}25`,borderRadius:7}}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:C.a3,marginBottom:4}}>🏋️ REHAB RECOMMENDATION</div>
                      <div style={{fontSize:"0.73rem",color:C.text}}>{rehab}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interpretation Panel */}
      {(chainFindings.length>0||myotomeAnalysis.length>0)&&(
        <div style={{marginTop:14}}>
          <button type="button" onClick={()=>setShowInterp(p=>!p)} style={{width:"100%",padding:"9px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.accent,fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
            {showInterp?"▲ Hide":"▼ Show"} Clinical Interpretation
          </button>
          {showInterp&&(
            <div style={{marginTop:8}}>
              {chainFindings.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:"0.65rem",fontWeight:700,color:C.a4,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>⛓️ Kinetic Chain Patterns</div>
                  {chainFindings.map((ch,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:C.s2,borderRadius:8,marginBottom:6,border:`1px solid ${C.a4}30`}}>
                      <div style={{fontWeight:700,fontSize:"0.76rem",color:C.a4,marginBottom:3}}>{ch.label}</div>
                      <div style={{fontSize:"0.72rem",color:C.text}}>{ch.interpretation}</div>
                      <div style={{fontSize:"0.65rem",color:C.muted,marginTop:3}}>Weak: {ch.weak.join(", ")}</div>
                    </div>
                  ))}
                </div>
              )}
              {myotomeAnalysis.length>0&&(
                <div>
                  <div style={{fontSize:"0.65rem",fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>⚡ Myotome / Neurological Pattern</div>
                  {myotomeAnalysis.map((m,i)=>(
                    <div key={i} style={{padding:"7px 10px",background:C.s2,borderRadius:8,marginBottom:5,border:`1px solid ${C.accent}25`}}>
                      <span style={{fontWeight:700,fontSize:"0.76rem",color:C.accent}}>{m.level} </span>
                      <span style={{fontSize:"0.72rem",color:C.muted}}>— {m.affected.length}/{m.total} muscles affected. Consider {m.level} radiculopathy or peripheral nerve lesion.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEUROLOGICAL ASSESSMENT MODULE — Full Comprehensive Integration
// ═══════════════════════════════════════════════════════════════════════════════

function CollapsibleHow({ title, children }) {
  const C = getC();
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:14}}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
          background:C.s2, border:`1px solid ${open ? C.accent : C.border}`,
          borderRadius: open ? "10px 10px 0 0" : 10,
          padding:"10px 14px", cursor:"pointer", color:C.text, fontFamily:"inherit",
          transition:"all 0.15s",
        }}
      >
        <span style={{fontWeight:800, fontSize:"0.8rem", color:C.accent}}>{title}</span>
        <span style={{fontSize:"0.85rem", color:C.accent, fontWeight:700}}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          background:C.s2, borderRadius:"0 0 10px 10px",
          padding:"14px 16px", border:`1px solid ${C.accent}`, borderTop:"none",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function NeurologicalModule({ data, set, navContext={} }) {
  const [tab, setTab] = useState("dermatomes");
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);
  const [clinicianNotes, setClinicianNotes] = useState(data["neuro_clinician_notes"]||"");
  const [showAsiaGuide, setShowAsiaGuide] = useState(false);
  const [dermImgModal, setDermImgModal] = useState(null);
  const [cervImgOk, setCervImgOk] = useState(true);

  const inp = { width:"100%", background:C.s3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"7px 10px", fontSize:"0.78rem", outline:"none", fontFamily:"inherit", WebkitAppearance:"none", appearance:"none" };

  // Deep-link highlight: scroll to specific dermatome or neural test card
  React.useEffect(()=>{
    const targets=navContext.neuroHighlights?navContext.neuroHighlights:navContext.neuroHighlight?[navContext.neuroHighlight]:[];
    if(!targets.length) return;
    // Switch to correct tab
    const first=targets[0];
    if(first.startsWith("nt_")||first.startsWith("nrf_")) setTab("neural_tension");
    else if(first.startsWith("gcs_")) setTab("gcs");
    else if(first.startsWith("dtr_")) setTab("reflexes");
    else if(first.startsWith("cn_")) setTab("cranial");
    else if(first.startsWith("cog_")) setTab("cognition");
    else if(first.startsWith("coord_")) setTab("coordination");
    else if(first.startsWith("vest_")) setTab("vestibular");
    else if(first.startsWith("perc_")) setTab("perceptual");
    else setTab("dermatomes");
    setTimeout(()=>{
      let scrolled=false;
      targets.forEach(id=>{
        const el=document.querySelector(`[data-neuro-id="${id}"]`);
        if(el){ if(!scrolled){el.scrollIntoView({behavior:"smooth",block:"center"});scrolled=true;}
          applyPersistentHighlight(el); }
      });
    },500);
  },[navContext.neuroHighlight,navContext.neuroHighlights]);

  const getSensoryColor = (val) => {
    if(!val||val==="") return C.muted;
    if(val==="Normal") return C.green;
    if(val==="Reduced") return C.yellow;
    if(val==="Absent") return C.red;
    if(val==="Hyperaesthetic") return C.purple;
    return C.muted;
  };

  const getReflexColor = (val) => {
    if(!val||val==="") return C.muted;
    if(val==="Normal 2+") return C.green;
    if(val==="Trace 1+" || val==="Diminished 1+") return C.yellow;
    if(val==="Absent 0") return C.red;
    if(val==="Brisk 3+" || val==="Clonus 4+") return C.purple;
    return C.muted;
  };

  const getStrengthColor = (val) => {
    if(!val||val==="") return C.muted;
    if(val.startsWith("5")) return C.green;
    if(val.startsWith("4")) return C.yellow;
    if(val.startsWith("3")) return "#f97316";
    return C.red;
  };

  const SENSORY_OPTIONS = ["Normal","Reduced","Absent","Hyperaesthetic"];
  const REFLEX_OPTIONS  = ["Normal 2+","Trace 1+","Diminished 1+","Absent 0","Brisk 3+","Clonus 4+"];
  const STRENGTH_OPTIONS= ["5/5 Normal","4/5 Good","3/5 Fair","2/5 Poor","1/5 Trace","0/5 Zero"];
  const NTT_OPTIONS     = ["Not tested","Negative","Positive — symptoms reproduced","Positive — confirmed neural (sensitisation)","Equivocal"];

  // --- Red flag checker
  const activeRedFlags = RED_FLAGS_NEURO.filter(rf => {
    if(rf.id==="nrf_cauda") return (data["n_ref_s4s5_left"]||"").includes("Absent")||(data["n_ref_s4s5_right"]||"").includes("Absent")||data["nrf_cauda"]==="Present";
    if(rf.id==="nrf_myelopathy") return (data["n_ref_babinski_left"]||"").includes("Positive")||(data["n_ref_babinski_right"]||"").includes("Positive")||(data["n_ref_hoffmann_left"]||"").includes("Positive")||(data["n_ref_hoffmann_right"]||"").includes("Positive")||(data["n_ref_clonus_ankle_left"]||"").includes("Positive")||(data["n_ref_clonus_ankle_right"]||"").includes("Positive")||data["nrf_myelopathy"]==="Present";
    if(rf.id==="nrf_saddle") return data["nrf_saddle"]==="Present";
    if(rf.id==="nrf_bilateral") return data["nrf_bilateral"]==="Present";
    if(rf.id==="nrf_sphincter") return data["nrf_sphincter"]==="Present";
    if(rf.id==="nrf_prog_weak") return data["nrf_prog_weak"]==="Present";
    if(rf.id==="nrf_umnsigns") return (data["n_ref_babinski_left"]||"").includes("Positive")||(data["n_ref_babinski_right"]||"").includes("Positive")||(data["n_ref_hoffmann_left"]||"").includes("Positive")||(data["n_ref_hoffmann_right"]||"").includes("Positive");
    return data[rf.id]==="Present";
  });

  const tabs = [
    { key:"dermatomes",  label:"Dermatomes",       icon:"🗺️" },
    { key:"myotomes",    label:"Myotomes",          icon:"💪" },
    { key:"reflexes",    label:"Reflexes",          icon:"🔨" },
    { key:"tension",     label:"Neural Tension",    icon:"⚡" },
    { key:"gcs",         label:"GCS",               icon:"🧠" },
    { key:"cranial",     label:"Cranial Nerves",    icon:"👁️" },
    { key:"cognition",   label:"Cognition",         icon:"🗓️" },
    { key:"coordination",label:"Coordination",      icon:"🎯" },
    { key:"vestibular",  label:"Vestibular",        icon:"🌀" },
    { key:"perceptual",  label:"Perceptual",        icon:"🧩" },
    { key:"redflags",    label:"Red Flags",         icon:"🚨" },
    { key:"reasoning",   label:"Clinical Reasoning",icon:"📊" },
  ];

  // ─── CLINICAL REASONING ENGINE
  const reasoningOutput = (() => {
    const involved = [];
    DERMATOMES.forEach(d => {
      const lv = (data[d.id+"_left"]||""), rv = (data[d.id+"_right"]||"");
      const abnormalL = lv && lv!=="Normal";
      const abnormalR = rv && rv!=="Normal";
      if(abnormalL||abnormalR) {
        const sides = [abnormalL?"Left":"",abnormalR?"Right":""].filter(Boolean).join("+");
        involved.push({ level:d.level, type:"Sensory", detail:`${sides}: ${[lv,rv].filter(Boolean).join(" / ")}`, disc:d.disc });
      }
    });
    // reflexes
    REFLEXES.forEach(r => {
      const lv = (data[r.id+"_left"]||""), rv = (data[r.id+"_right"]||"");
      const abnL = lv&&lv!=="Normal 2+", abnR = rv&&rv!=="Normal 2+";
      if(r.pathological) {
        const both = (data[r.id+"_left"]||data[r.id+"_right"]||data[r.id]||"");
        if(both.includes("Positive")) involved.push({ level:r.level, type:"Pathological Reflex", detail:r.label+" positive", disc:"UMN" });
      } else if(abnL||abnR) {
        const sides = [abnL?"Left":"",abnR?"Right":""].filter(Boolean).join("+");
        involved.push({ level:r.level, type:"Reflex", detail:`${r.label} ${sides}: ${[lv,rv].filter(Boolean).join(" / ")}`, disc:"" });
      }
    });
    // myotome ids
    MYOTOMES.forEach(m => {
      const id = "myo_"+m.level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();
      const lv = data[id+"_left"]||"", rv = data[id+"_right"]||"";
      const abnL = lv&&!lv.startsWith("5"), abnR = rv&&!rv.startsWith("5");
      if(abnL||abnR) {
        const sides=[abnL?"Left":"",abnR?"Right":""].filter(Boolean).join("+");
        involved.push({ level:m.level, type:"Myotome", detail:`${sides}: ${m.action} ${[lv,rv].filter(Boolean).join(" / ")}`, disc:"" });
      }
    });
    // neural tension
    NEURAL_TENSION.forEach(nt => {
      const lv = data[nt.id+"_left"]||"", rv = data[nt.id+"_right"]||"";
      const posL = lv.includes("Positive"), posR = rv.includes("Positive");
      if(posL||posR) {
        const sides=[posL?"Left":"",posR?"Right":""].filter(Boolean).join("+");
        involved.push({ level:nt.nerve, type:"Neural Tension", detail:`${nt.label} ${sides} positive`, disc:"" });
      }
    });
    // group by level
    const byLevel = {};
    involved.forEach(item => {
      const key = item.level;
      if(!byLevel[key]) byLevel[key] = { level:key, findings:[], disc:item.disc };
      byLevel[key].findings.push({ type:item.type, detail:item.detail });
    });
    const patterns = Object.values(byLevel);
    // Pattern recognition
    const interpretations = [];
    const hasBabinski = (data["n_ref_babinski_left"]||"").includes("Positive")||(data["n_ref_babinski_right"]||"").includes("Positive");
    const hasHoffmann = (data["n_ref_hoffmann_left"]||"").includes("Positive")||(data["n_ref_hoffmann_right"]||"").includes("Positive");
    if(hasBabinski||hasHoffmann) interpretations.push({ title:"⚠️ Upper Motor Neuron Pattern", color:C.red, text:"Pathological reflexes indicate UMN lesion above the segmental level. Consider cervical myelopathy, cord compression, or intracranial pathology. Urgent MRI required.", action:"URGENT — Neurosurgical / Neurology Referral" });
    const isMultiLevel = patterns.filter(p=>p.findings.length>=2).length>=2;
    if(isMultiLevel) interpretations.push({ title:"Multi-Level Involvement", color:C.yellow, text:"Findings span 2+ nerve root levels. Consider central stenosis, myelopathy, peripheral polyneuropathy, or multi-level disc disease.", action:"MRI full spine + neurology referral" });
    const isBilateral = involved.some(i=>i.detail.includes("Left+Right")||(involved.filter(ii=>ii.level===i.level).some(ii=>ii.detail.includes("Left"))&&involved.filter(ii=>ii.level===i.level).some(ii=>ii.detail.includes("Right"))));
    if(isBilateral&&!hasBabinski) interpretations.push({ title:"Bilateral Pattern", color:C.yellow, text:"Bilateral neurological signs suggest central pathology (disc, cord) rather than single nerve root. Cauda equina must be excluded if lumbar.", action:"Rule out cauda equina / central compression" });
    // Single level radiculopathy
    const unilevel = patterns.filter(p=>!p.disc.includes("Cauda")).find(p=>p.findings.length>=1);
    if(unilevel&&!isMultiLevel&&patterns.length===1) {
      const rm = NERVE_ROOT_MAP[unilevel.level];
      if(rm) interpretations.push({ title:`Nerve Root Pattern — ${unilevel.level}`, color:C.accent, text:`Findings correlate with ${unilevel.level} nerve root at ${rm.disc} disc level. Expected: sensory loss ${rm.dermSensory}, reflex ${rm.reflex}, weakness of ${rm.myotome}. Peripheral nerve differential: ${rm.peripheral}.`, action:`Targeted imaging: ${rm.disc} disc. Neural mobilisation program.` });
    }
    if(interpretations.length===0&&patterns.length>0) interpretations.push({ title:"Findings Present — Pattern Incomplete", color:C.muted, text:"Neurological findings noted but insufficient for definitive pattern. Complete dermatomes, myotomes, reflexes and neural tension for full clinical reasoning.", action:"Complete all neurological sub-sections" });
    return { patterns, interpretations };
  })();

  const tabBtnStyle = (key) => ({
    padding:"7px 13px", borderRadius:20, border:`1px solid ${tab===key?C.accent:C.border}`,
    background:tab===key?"rgba(0,229,255,0.12)":"transparent",
    color:tab===key?C.accent:C.muted, fontSize:"0.72rem", fontWeight:tab===key?700:400,
    cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s"
  });

  const sectionHead = (label) => (
    <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
      <div style={{height:1,width:10,background:C.a2}}/>{label}<div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border},transparent)`}}/>
    </div>
  );

  return (
    <div>
      {/* Neuro Red Flag Banner */}
      {activeRedFlags.length>0&&(
        <div style={{background:"rgba(255,77,109,0.12)",border:`1.5px solid ${C.red}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:"1.3rem",flexShrink:0}}>🚨</span>
          <div>
            <div style={{fontWeight:800,color:C.red,fontSize:"0.85rem",marginBottom:4}}>NEUROLOGICAL RED FLAGS DETECTED</div>
            {activeRedFlags.map((rf,i)=>(
              <div key={i} style={{fontSize:"0.76rem",color:rf.severity==="EMERGENCY"?C.red:C.yellow,marginBottom:2,fontWeight:600}}>
                {rf.icon} {rf.severity}: {rf.label} — {rf.action}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Bar — scrollable chip row */}
      <div className="pm-region-chips-scroll pm-neuro-tabs" style={{marginBottom:14}}>
        {tabs.map(t=>(
          <button
            key={t.key}
            type="button"
            onClick={()=>setTab(t.key)}
            className={"pm-region-chip" + (tab===t.key?" active":"")}
            style={tab===t.key?{background:"rgba(0,229,255,0.18)",borderColor:C.accent,color:C.accent}:{borderColor:C.border,color:C.muted}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DERMATOMES ── */}
      {tab==="dermatomes"&&(
        <div>
          {sectionHead("Sensory Testing — All Spinal Levels")}
          <CollapsibleHow title="📋 HOW TO PERFORM — Dermatomal Sensory Testing">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:6,fontSize:"0.72rem"}}>⚙️ Setup</div>
                <div style={{fontSize:"0.71rem",lineHeight:1.7}}>• Patient seated or supine, relaxed<br/>• Eyes closed throughout (prevents visual cues)<br/>• Explain test first with eyes open as reference<br/>• Establish a "normal" reference point first (e.g. forehead or sternum)</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.accent,marginBottom:6,fontSize:"0.72rem"}}>🖐️ Light Touch Method</div>
                <div style={{fontSize:"0.71rem",lineHeight:1.7}}>• Use wisp of cotton wool or fingertip<br/>• Touch LIGHTLY — less than 1g pressure<br/>• Apply randomly, unpredictably<br/>• Ask: "Does this feel the same as here?"<br/>• Move distal → proximal along dermatome</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:"0.72rem"}}>📍 Pin Prick Method</div>
                <div style={{fontSize:"0.71rem",lineHeight:1.7}}>• Use sterile neurological pin or broken stick<br/>• Apply sharp end, then blunt end randomly<br/>• Ask: "Sharp or dull?"<br/>• NEVER break skin<br/>• Compare left vs right at same level</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a3,marginBottom:6,fontSize:"0.72rem"}}>📊 HOW TO MARK</div>
                <div style={{fontSize:"0.71rem",lineHeight:1.7}}><span style={{color:C.green}}>✅ Normal</span> — Same as reference; detected correctly<br/><span style={{color:C.yellow}}>⚠ Reduced</span> — Detected but duller/weaker than reference<br/><span style={{color:C.red}}>🔴 Absent</span> — Cannot detect stimulus<br/><span style={{color:C.purple}}>🟣 Hyperaesthetic</span> — Exaggerated/painful response</div>
              </div>
            </div>
            <div style={{background:"rgba(0,229,255,0.07)",borderRadius:8,padding:"8px 12px",fontSize:"0.7rem",color:C.text,borderLeft:`3px solid ${C.accent}`}}>
              <strong style={{color:C.accent}}>Clinical Pearl:</strong> Hyperaesthesia = early nerve root irritation (disc bulge compressing root). Reduced/Absent = axonal compromise (severe compression or chronicity). Always compare bilateral symmetry — subtle asymmetry is more significant than bilateral reduction.
            </div>
          </CollapsibleHow>

          {/* Cervical */}
          <div style={{marginBottom:12}}>
            {/* Cervical dermatome reference image */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 12px",background:"rgba(124,58,237,0.05)",borderRadius:8,border:"1px solid rgba(124,58,237,0.15)"}}>
              {cervImgOk ? (
              <img
                src="https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto,w_128/Firefly_Gemini_Flash_change_the_model_person_to_different_person_and_black_line_and_dot_should_be_red_664593_sxvcde"
                alt="Cervical dermatome map"
                onError={()=>setCervImgOk(false)}
                onClick={()=>setDermImgModal({src:"https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/Firefly_Gemini_Flash_change_the_model_person_to_different_person_and_black_line_and_dot_should_be_red_664593_sxvcde",title:"Cervical Dermatome Map"})}
                style={{width:64,height:64,objectFit:"cover",borderRadius:7,cursor:"pointer",border:"2px solid rgba(124,58,237,0.3)",flexShrink:0}}
              />
              ) : (
              <div style={{width:64,height:64,borderRadius:7,border:"2px dashed rgba(124,58,237,0.25)",background:"rgba(124,58,237,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>🗺️</div>
              )}
              <div>
                <div style={{fontSize:"0.68rem",fontWeight:700,color:"#7c3aed"}}>Cervical Dermatome Map</div>
                <div style={{fontSize:"0.6rem",color:"#7e6a9a",marginTop:2}}>Tap image to view full size</div>
              </div>
            </div>
            <div style={{fontSize:"0.7rem",fontWeight:700,color:C.yellow,marginBottom:8}}>● CERVICAL LEVELS</div>
          {DERMATOMES.filter(d=>d.level.startsWith("C")).map(d=>{
            const lv=data[d.id+"_left"]||"", rv=data[d.id+"_right"]||"";
            const lCol=getSensoryColor(lv), rCol=getSensoryColor(rv);
            const abnormal=(lv&&lv!=="Normal")||(rv&&rv!=="Normal");
            return(
              <div key={d.id} data-neuro-id={d.id} style={{background:C.surface,border:`1px solid ${abnormal?C.red+"50":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <ClinicalImage name={d.id} title={`${d.level} — ${d.region}`} size={40}/>
                    <div>
                      <span style={{fontWeight:800,color:abnormal?C.red:C.accent,marginRight:8}}>{d.level}</span>
                      <span style={{fontSize:"0.76rem",color:C.text}}>{d.region}</span>
                    </div>
                  </div>
                  <button type="button" onClick={()=>setExpandedLevel(expandedLevel===d.id?null:d.id)}
                    style={{padding:"2px 9px",background:"rgba(127,90,240,0.12)",border:`1px solid ${C.a2}40`,borderRadius:6,color:C.a2,fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>
                    {expandedLevel===d.id?"▲ Hide":"ℹ Guide"}
                  </button>
                </div>
                {expandedLevel===d.id&&(
                  <div style={{background:C.s3,borderRadius:8,padding:"9px 12px",marginBottom:8,fontSize:"0.74rem",color:C.muted,lineHeight:1.7}}>
                    <div><strong style={{color:C.yellow}}>Disc level:</strong> {d.disc}</div>
                    <div><strong style={{color:C.accent}}>Myotome:</strong> {d.myotome}</div>
                    {d.reflex&&<div><strong style={{color:C.a3}}>Reflex:</strong> {d.reflex}</div>}
                    <div style={{marginTop:6,color:C.text}}>Test with: light touch (cotton) + pin-prick at key point. Compare side to side. Hyperaesthesia = early irritation; Reduced/Absent = axonal compromise.</div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["_left","LEFT",lv,lCol],["_right","RIGHT",rv,rCol]].map(([sfx,side,sv,col])=>(
                    <div key={sfx}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:col,marginBottom:3}}>{side} {sv&&sv!=="Normal"?"⚠":""}</div>
                      <select value={sv} onChange={e=>set(d.id+sfx,e.target.value)} style={{...inp,borderColor:sv&&sv!=="Normal"?col:C.border}}>
                        <option value="">— select —</option>
                        {SENSORY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          </div>

          {/* Lumbar + Sacral */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 12px",background:"rgba(124,58,237,0.05)",borderRadius:8,border:"1px solid rgba(124,58,237,0.15)"}}>
              <ClinicalImage name="lumbar-dermatome" title="Lumbar / Sacral Dermatome Map" size={64}/>
              <div>
                <div style={{fontSize:"0.68rem",fontWeight:700,color:"#7c3aed"}}>Lumbar / Sacral Dermatome Map</div>
                <div style={{fontSize:"0.6rem",color:"#7e6a9a",marginTop:2}}>Tap to view full size</div>
              </div>
            </div>
            <div style={{fontSize:"0.7rem",fontWeight:700,color:C.a3,marginBottom:8}}>● LUMBAR & SACRAL LEVELS</div>
          {DERMATOMES.filter(d=>d.level.startsWith("L")||d.level.startsWith("S")||d.level.startsWith("T")).map(d=>{
            const lv=data[d.id+"_left"]||"", rv=data[d.id+"_right"]||"";
            const lCol=getSensoryColor(lv), rCol=getSensoryColor(rv);
            const abnormal=(lv&&lv!=="Normal")||(rv&&rv!=="Normal");
            const isCauda=d.level==="S4/5";
            return(
              <div key={d.id} style={{background:C.surface,border:`1px solid ${abnormal?(isCauda?C.red:C.red+"50"):C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8,flexWrap:"wrap"}}>
                  <div>
                    <span style={{fontWeight:800,color:abnormal?(isCauda?C.red:C.yellow):C.a3,marginRight:8}}>{d.level}</span>
                    <span style={{fontSize:"0.76rem",color:C.text}}>{d.region}</span>
                    {isCauda&&<span style={{marginLeft:8,padding:"1px 7px",borderRadius:8,background:"rgba(255,77,109,0.2)",color:C.red,fontSize:"0.62rem",fontWeight:700}}>CAUDA EQUINA</span>}
                  </div>
                  <button type="button" onClick={()=>setExpandedLevel(expandedLevel===d.id?null:d.id)}
                    style={{padding:"2px 9px",background:"rgba(127,90,240,0.12)",border:`1px solid ${C.a2}40`,borderRadius:6,color:C.a2,fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>
                    {expandedLevel===d.id?"▲ Hide":"ℹ Guide"}
                  </button>
                </div>
                {expandedLevel===d.id&&(
                  <div style={{background:C.s3,borderRadius:8,padding:"9px 12px",marginBottom:8,fontSize:"0.74rem",color:C.muted,lineHeight:1.7}}>
                    <div><strong style={{color:C.yellow}}>Disc level:</strong> {d.disc}</div>
                    <div><strong style={{color:C.accent}}>Myotome:</strong> {d.myotome}</div>
                    {d.reflex&&<div><strong style={{color:C.a3}}>Reflex:</strong> {d.reflex}</div>}
                    {isCauda&&<div style={{marginTop:6,padding:"6px 10px",borderRadius:6,background:"rgba(255,77,109,0.1)",color:C.red,fontWeight:600}}>⚠️ Any deficit here = potential cauda equina emergency. Ask about bladder/bowel dysfunction and perianal sensation immediately.</div>}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["_left","LEFT",lv,lCol],["_right","RIGHT",rv,rCol]].map(([sfx,side,sv,col])=>(
                    <div key={sfx}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:col,marginBottom:3}}>{side} {sv&&sv!=="Normal"?"⚠":""}</div>
                      <select value={sv} onChange={e=>set(d.id+sfx,e.target.value)} style={{...inp,borderColor:sv&&sv!=="Normal"?col:C.border}}>
                        <option value="">— select —</option>
                        {SENSORY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ── MYOTOMES ── */}
      {tab==="myotomes"&&(
        <div>
          {sectionHead("Myotome Grading — MRC Scale 0–5")}
          <CollapsibleHow title="📋 HOW TO PERFORM — Myotome Testing">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:6,fontSize:"0.72rem"}}>⚙️ How to Test</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}>• Position patient so muscle can work against gravity (or gravity-eliminated for weak muscles)<br/>• Apply resistance smoothly and gradually — not a sudden jerk<br/>• Hold resistance for 3–5 seconds<br/>• Compare left vs right bilaterally<br/>• Always test proximal before distal</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a3,marginBottom:6,fontSize:"0.72rem"}}>📊 HOW TO MARK — MRC Scale</div>
                <div style={{fontSize:"0.68rem",color:C.muted,lineHeight:1.8}}>
                  <span style={{color:C.green}}>5/5 Normal</span> — Full power against full resistance<br/>
                  <span style={{color:"#a3e635"}}>4/5 Good</span> — Moves against SOME resistance<br/>
                  <span style={{color:C.yellow}}>3/5 Fair</span> — Moves AGAINST gravity; no resistance<br/>
                  <span style={{color:"#f97316"}}>2/5 Poor</span> — Moves WITH gravity eliminated only<br/>
                  <span style={{color:C.red}}>1/5 Trace</span> — Visible/palpable flicker, no movement<br/>
                  <span style={{color:C.red}}>0/5 Zero</span> — No contraction whatsoever
                </div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a2,marginBottom:6,fontSize:"0.72rem"}}>🔍 Clinical Interpretation</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}><span style={{color:C.yellow}}>Grade 4 bilateral</span> — Possible nerve root irritation or pain inhibition<br/><span style={{color:"#f97316"}}>Grade 3 or below</span> — Significant axonal loss; urgent imaging<br/><span style={{color:C.red}}>Grade 0–1</span> — Severe radiculopathy or myelopathy; immediate referral<br/><span style={{color:C.muted}}>Asymmetry</span> — Even 1 grade difference is clinically significant</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:"0.72rem"}}>⚠️ Watch For</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}>• Pain inhibition can mimic weakness — check if pain-free testing improves grade<br/>• Compensation patterns — ensure correct muscle tested<br/>• Bilateral weakness = UMN / cord lesion, not bilateral root<br/>• Fasciculations at rest = LMN / motor neuron disease</div>
              </div>
            </div>
            <div style={{background:"rgba(0,229,255,0.07)",borderRadius:8,padding:"8px 12px",fontSize:"0.7rem",color:C.text,borderLeft:`3px solid ${C.accent}`}}>
              <strong style={{color:C.accent}}>Clinical Pearl:</strong> A myotomal pattern of weakness (e.g. C5 = deltoid + biceps weak) points to nerve root. A peripheral nerve pattern (e.g. median nerve = thenar + index/middle finger flex) points to peripheral lesion. Distinguishing these determines the treatment pathway.
            </div>
          </CollapsibleHow>
          <div style={{display:"grid",gap:6,marginBottom:14}}>
            {[{col:C.green,label:"5/5 Normal — full power against resistance"},{col:C.yellow,label:"4/5 — movement against some resistance (nerve irritation)"},{col:"#f97316",label:"3/5 — movement against gravity only (axonal compromise)"},{col:C.red,label:"2/5 or less — serious neurological deficit"}].map((g,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 10px",background:C.s3,borderRadius:7,fontSize:"0.72rem"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:g.col,flexShrink:0}}/>
                <span style={{color:C.text}}>{g.label}</span>
              </div>
            ))}
          </div>

          {MYOTOMES.map(m=>{
            const safeId = "myo_"+m.level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();
            const lv=data[safeId+"_left"]||"", rv=data[safeId+"_right"]||"";
            const lCol=getStrengthColor(lv), rCol=getStrengthColor(rv);
            const abnormal=(lv&&!lv.startsWith("5"))||(rv&&!rv.startsWith("5"));
            return(
              <div key={m.level} style={{background:C.surface,border:`1px solid ${abnormal?C.yellow+"60":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <ClinicalImage name={safeId} title={`${m.level} — ${m.action}`} size={36}/>
                    <div>
                      <span style={{fontWeight:800,color:abnormal?C.yellow:C.text,fontSize:"0.88rem",marginRight:8}}>{m.level}</span>
                      <span style={{fontSize:"0.78rem",color:C.text}}>{m.action}</span>
                    </div>
                  </div>
                  <button type="button" onClick={()=>setExpandedLevel(expandedLevel===safeId?null:safeId)}
                    style={{padding:"2px 9px",background:"rgba(0,229,255,0.1)",border:`1px solid ${C.accent}40`,borderRadius:6,color:C.accent,fontSize:"0.62rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    {expandedLevel===safeId?"▲":"👁 Technique"}
                  </button>
                </div>
                {expandedLevel===safeId&&(
                  <div style={{background:C.s3,borderRadius:8,padding:"9px 12px",marginBottom:8,fontSize:"0.74rem",lineHeight:1.7}}>
                    <div style={{color:C.accent,fontWeight:600,marginBottom:3}}>🔬 Test: <span style={{color:C.text,fontWeight:400}}>{m.test}</span></div>
                    <div style={{color:C.yellow,fontWeight:600}}>⚠ Compensation: <span style={{color:C.text,fontWeight:400}}>{m.compensation}</span></div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["_left","LEFT",lv,lCol],["_right","RIGHT",rv,rCol]].map(([sfx,side,sv,col])=>(
                    <div key={sfx}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:col,marginBottom:3}}>{side} {sv&&!sv.startsWith("5")?"⚠":""}</div>
                      <select value={sv} onChange={e=>set(safeId+sfx,e.target.value)} style={{...inp,borderColor:sv&&!sv.startsWith("5")?col:C.border}}>
                        <option value="">— select —</option>
                        {STRENGTH_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REFLEXES ── */}
      {tab==="reflexes"&&(
        <div>
          {sectionHead("Reflexes — DTR · UMN Signs · Clonus · LMN Signs")}

          {/* How to Perform Reflexes — collapsible */}
          <CollapsibleHow title="📋 HOW TO PERFORM — Reflex Testing">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:6,fontSize:"0.72rem"}}>⚙️ General Technique</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}>• Patient RELAXED — tension suppresses reflexes<br/>• Limb in mid-range position (not taut)<br/>• Strike tendon BRISKLY with the pointed end of reflex hammer<br/>• Use a single, sharp strike — not repeated taps<br/>• Jendrassik Manoeuvre: ask patient to interlock fingers and pull apart (reinforcement) if reflex absent</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a3,marginBottom:6,fontSize:"0.72rem"}}>📊 HOW TO MARK — Reflex Grading</div>
                <div style={{fontSize:"0.68rem",color:C.muted,lineHeight:1.8}}>
                  <span style={{color:C.red}}>0 Absent</span> — No response even with reinforcement = LMN lesion<br/>
                  <span style={{color:C.yellow}}>1+ Trace</span> — Barely detectable flicker only<br/>
                  <span style={{color:C.yellow}}>1+ Diminished</span> — Reduced but present; may be LMN<br/>
                  <span style={{color:C.green}}>2+ Normal</span> — Brisk, appropriate amplitude response<br/>
                  <span style={{color:C.purple}}>3+ Brisk</span> — Exaggerated; consider UMN if bilateral<br/>
                  <span style={{color:C.purple}}>4+ Clonus</span> — Sustained beats = definite UMN lesion
                </div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:"0.72rem"}}>⚠️ UMN vs LMN Pattern</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}><span style={{color:C.red}}>UMN (cord/brain)</span>: Hyperreflexia (3+/4+), Babinski +, Hoffmann +, clonus, spasticity<br/><span style={{color:C.yellow}}>LMN (root/nerve)</span>: Hyporeflexia (0/1+), flaccidity, wasting, fasciculations<br/>• Asymmetric reflex = more significant than bilateral change<br/>• Inverted brachioradialis reflex = pathognomonic for C5/6 myelopathy</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a2,marginBottom:6,fontSize:"0.72rem"}}>🔑 Pathological Signs — Perform These</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}><span style={{color:C.red}}>Babinski</span>: Stroke lateral plantar; upgoing toe = UMN<br/><span style={{color:C.red}}>Hoffmann's</span>: Flick middle finger DIP; thumb flexes = UMN<br/><span style={{color:C.red}}>Clonus</span>: Sustain dorsiflexion; 3+ beats = UMN<br/><span style={{color:C.red}}>Pronator Drift</span>: Eyes closed, arms supinated; drift = UMN</div>
              </div>
            </div>
            <div style={{background:"rgba(0,229,255,0.07)",borderRadius:8,padding:"8px 12px",fontSize:"0.7rem",color:C.text,borderLeft:`3px solid ${C.accent}`}}>
              <strong style={{color:C.accent}}>Clinical Pearl:</strong> Absent ankle reflex (S1) + positive SLR = L5/S1 radiculopathy until proven otherwise. Bilateral brisk reflexes + Babinski = cord compression — do NOT manipulate; urgent MRI. Inverted BR reflex is the most reliable single sign of C5/6 myelopathy.
            </div>
          </CollapsibleHow>

          {/* UMN vs LMN Quick Reference */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            <div style={{background:"rgba(255,77,109,0.07)",border:`1px solid ${C.red}30`,borderRadius:10,padding:"10px 13px"}}>
              <div style={{fontSize:"0.65rem",fontWeight:800,color:C.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>🔴 UMN Pattern (Upper Motor Neuron)</div>
              <div style={{fontSize:"0.72rem",color:C.text,lineHeight:1.7}}>
                <div>• <strong>Hyperreflexia</strong> (brisk DTRs)</div>
                <div>• <strong>Positive Babinski</strong> (upgoing toe)</div>
                <div>• <strong>Clonus</strong> (&gt;3 beats)</div>
                <div>• <strong>Hoffmann's +ve</strong> (upper limb)</div>
                <div>• <strong>Spasticity</strong> (clasp-knife tone)</div>
                <div>• <strong>No wasting</strong> (initially)</div>
                <div style={{marginTop:5,fontSize:"0.68rem",color:C.red,fontWeight:600}}>→ Lesion: brain, brainstem, spinal cord</div>
              </div>
            </div>
            <div style={{background:"rgba(255,179,0,0.07)",border:`1px solid ${C.yellow}30`,borderRadius:10,padding:"10px 13px"}}>
              <div style={{fontSize:"0.65rem",fontWeight:800,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>🟡 LMN Pattern (Lower Motor Neuron)</div>
              <div style={{fontSize:"0.72rem",color:C.text,lineHeight:1.7}}>
                <div>• <strong>Hyporeflexia / Absent DTRs</strong></div>
                <div>• <strong>Negative Babinski</strong> (no response)</div>
                <div>• <strong>No clonus</strong></div>
                <div>• <strong>Fasciculations</strong> (visible twitching)</div>
                <div>• <strong>Flaccid tone</strong> (reduced resistance)</div>
                <div>• <strong>Muscle wasting</strong> (denervation atrophy)</div>
                <div style={{marginTop:5,fontSize:"0.68rem",color:C.yellow,fontWeight:600}}>→ Lesion: anterior horn, nerve root, peripheral nerve</div>
              </div>
            </div>
          </div>

          <div style={{background:C.s2,borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:"0.76rem",color:C.muted,lineHeight:1.6}}>
            <strong style={{color:C.accent}}>DTR Grading (Wexler Scale):</strong> 0=Absent, 1+=Trace/diminished, 2+=Normal, 3+=Brisk (possibly normal), 4+=Clonus (pathological). Asymmetry is always significant. Compare side-to-side before grading as abnormal.
          </div>

          {/* Render by group */}
          {["DTR","UMN","Clonus","LMN"].map(grp=>{
            const groupRefs = REFLEXES.filter(r=>r.group===grp);
            const groupMeta = {
              DTR:{ label:"Deep Tendon Reflexes (DTR)", color:C.accent, icon:"🔨", desc:"Segmental reflex arcs. Diminished = LMN/root. Exaggerated = UMN. Always compare bilateral." },
              UMN:{ label:"Upper Motor Neuron Signs (Pathological)", color:C.red, icon:"🔴", desc:"Any positive UMN sign in adults = corticospinal tract lesion. Requires urgent investigation." },
              Clonus:{ label:"Clonus Tests", color:C.purple, icon:"〰️", desc:"Sustained rhythmic oscillation = UMN lesion with hyperexcitability of stretch reflex. >3 beats = positive." },
              LMN:{ label:"Lower Motor Neuron Signs & Tone", color:C.yellow, icon:"🟡", desc:"Denervation signs. Fasciculations + wasting + flaccid tone = anterior horn / peripheral nerve / root." },
            }[grp];
            return(
              <div key={grp} style={{marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${groupMeta.color}30`}}>
                  <span style={{fontSize:"1rem"}}>{groupMeta.icon}</span>
                  <span style={{fontWeight:800,color:groupMeta.color,fontSize:"0.82rem"}}>{groupMeta.label}</span>
                </div>
                <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:10,lineHeight:1.6,padding:"7px 11px",background:C.s2,borderRadius:8}}>{groupMeta.desc}</div>
                {groupRefs.map(r=>{
                  const lv=data[r.id+"_left"]||"", rv=data[r.id+"_right"]||"";
                  const lCol=getReflexColor(lv), rCol=getReflexColor(rv);
                  const pathL=(lv.includes("Brisk")||lv.includes("Clonus")||lv.includes("Positive"));
                  const pathR=(rv.includes("Brisk")||rv.includes("Clonus")||rv.includes("Positive"));
                  const absentL=lv.includes("Absent")||lv.includes("Trace")||lv.includes("Flaccid")||lv.includes("Wasting")||lv.includes("Present");
                  const absentR=rv.includes("Absent")||rv.includes("Trace")||rv.includes("Flaccid")||rv.includes("Wasting")||rv.includes("Present");
                  const urgent=(r.umnSign||r.pathological)&&(pathL||pathR||absentL||absentR);
                  const abnormal=pathL||pathR||absentL||absentR;
                  const isUMNGroup = grp==="UMN"||grp==="Clonus";
                  const isLMNGroup = grp==="LMN";
                  let opts;
                  if(isUMNGroup) opts=["Not tested","Negative (normal)","Equivocal","Positive — present","Positive — sustained"];
                  else if(isLMNGroup&&r.id==="n_ref_lmn_tone") opts=["Not assessed","Normal — smooth low resistance","Spastic — clasp-knife (UMN)","Rigid — lead-pipe (extrapyramidal)","Flaccid — no resistance (LMN)","Cogwheel rigidity (Parkinson)"];
                  else if(isLMNGroup) opts=["Not assessed","Absent","Mild/equivocal","Moderate — clearly present","Severe — marked"];
                  else opts=REFLEX_OPTIONS;
                  return(
                    <div key={r.id} style={{background:C.surface,border:`1.5px solid ${urgent?groupMeta.color:abnormal?groupMeta.color+"40":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:2}}>
                            <ClinicalImage name={r.id} title={r.label} size={36}/>
                          <span style={{fontWeight:700,color:urgent?groupMeta.color:abnormal?groupMeta.color:C.text,fontSize:"0.84rem"}}>{r.label}</span>
                            {(r.umnSign)&&<span style={{padding:"1px 6px",borderRadius:8,background:"rgba(255,77,109,0.2)",color:C.red,fontSize:"0.58rem",fontWeight:700}}>UMN SIGN</span>}
                            {(grp==="Clonus")&&<span style={{padding:"1px 6px",borderRadius:8,background:"rgba(127,90,240,0.2)",color:C.purple,fontSize:"0.58rem",fontWeight:700}}>CLONUS</span>}
                            {(grp==="LMN")&&<span style={{padding:"1px 6px",borderRadius:8,background:"rgba(255,179,0,0.2)",color:C.yellow,fontSize:"0.58rem",fontWeight:700}}>LMN</span>}
                          </div>
                          <div style={{fontSize:"0.67rem",color:C.muted}}>{r.level}</div>
                        </div>
                        <button type="button" onClick={()=>setExpandedLevel(expandedLevel===r.id?null:r.id)}
                          style={{padding:"2px 9px",background:`rgba(127,90,240,0.12)`,border:`1px solid ${C.a2}40`,borderRadius:6,color:C.a2,fontSize:"0.62rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>
                          {expandedLevel===r.id?"▲ Hide":"ℹ Technique"}
                        </button>
                      </div>
                      {expandedLevel===r.id&&(
                        <div style={{background:C.s3,borderRadius:8,padding:"10px 13px",marginBottom:8,fontSize:"0.74rem",lineHeight:1.8}}>
                          <div style={{marginBottom:6}}><strong style={{color:C.accent}}>📋 Technique:</strong><div style={{color:C.text,marginTop:3}}>{r.technique}</div></div>
                          <div style={{padding:"8px 11px",background:urgent?"rgba(255,77,109,0.08)":"rgba(255,179,0,0.07)",borderRadius:7,border:`1px solid ${urgent?C.red:C.yellow}30`}}>
                            <strong style={{color:urgent?C.red:C.yellow}}>⚕ Clinical Finding:</strong>
                            <div style={{color:C.text,marginTop:3,lineHeight:1.7}}>{r.finding}</div>
                          </div>
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {[["_left","LEFT",lv,lCol],["_right","RIGHT",rv,rCol]].map(([sfx,side,sv,col])=>(
                          <div key={sfx}>
                            <div style={{fontSize:"0.62rem",fontWeight:700,color:col,marginBottom:3}}>
                              {side} {(sv.includes("Positive")||sv.includes("Brisk")||sv.includes("Clonus")||sv.includes("Severe")||sv.includes("Sustained"))?"🔴":sv.includes("Absent")||sv.includes("Trace")||sv.includes("Flaccid")||sv.includes("Moderate")?"⚠":""}
                            </div>
                            <select value={sv} onChange={e=>set(r.id+sfx,e.target.value)} style={{...inp,borderColor:(sv.includes("Positive")||sv.includes("Brisk")||sv.includes("Clonus"))?(urgent?groupMeta.color:C.border):sv.includes("Absent")||sv.includes("Flaccid")?C.yellow:C.border}}>
                              <option value="">— select —</option>
                              {opts.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      {/* UMN alert when positive */}
                      {urgent&&(pathL||pathR)&&(
                        <div style={{marginTop:8,padding:"7px 11px",background:"rgba(255,77,109,0.1)",border:`1px solid ${C.red}40`,borderRadius:7,fontSize:"0.72rem",color:C.red,fontWeight:600}}>
                          🔴 POSITIVE UMN SIGN — Corticospinal tract lesion suspected. Do NOT manipulate. Refer for MRI + neurology.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEURAL TENSION TESTS ── */}
      {tab==="tension"&&(
        <div>
          {sectionHead("Neural Tension Tests — Neurodynamic Assessment")}
          <CollapsibleHow title="📋 HOW TO PERFORM — Neural Tension Tests (Neurodynamic Assessment)">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.yellow,marginBottom:6,fontSize:"0.72rem"}}>⚙️ Principle</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}>Neural tension tests load the nerve mechanically through sequential joint positions. A positive test = reproduction of the patient's FAMILIAR symptoms (not just tightness). The key differentiator: symptoms change when a sensitising component is added or released.</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.accent,marginBottom:6,fontSize:"0.72rem"}}>🔍 Sensitising Components</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}><strong style={{color:C.yellow}}>Add to increase load:</strong> cervical contralateral lateral flexion, ankle dorsiflexion, wrist extension, neck flexion (slump)<br/><strong style={{color:C.a3}}>Release to decrease:</strong> cervical ipsilateral flex, plantarflexion, wrist neutral<br/>→ Symptoms change with these = neural, not muscular</div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.a3,marginBottom:6,fontSize:"0.72rem"}}>📊 HOW TO MARK</div>
                <div style={{fontSize:"0.68rem",color:C.muted,lineHeight:1.8}}>
                  <span style={{color:C.muted}}>Not tested</span> — Not performed this session<br/>
                  <span style={{color:C.green}}>Negative</span> — No symptom reproduction<br/>
                  <span style={{color:C.yellow}}>Positive — symptoms reproduced</span> — Familiar symptoms occur at test position<br/>
                  <span style={{color:C.red}}>Positive — confirmed neural</span> — Symptoms change with sensitisation/release<br/>
                  <span style={{color:C.muted}}>Equivocal</span> — Tightness but no familiar symptom reproduction
                </div>
              </div>
              <div style={{background:C.s3,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6,fontSize:"0.72rem"}}>⚠️ Contraindications</div>
                <div style={{fontSize:"0.71rem",color:C.muted,lineHeight:1.7}}>• Acute spinal cord injury or myelopathy signs<br/>• Severe acute radiculopathy with neurological deficit<br/>• Vertebral artery insufficiency (cervical tests)<br/>• Recent surgery to spine or peripheral nerve<br/>• Do NOT over-sensitise — stop at first symptom reproduction</div>
              </div>
            </div>
            <div style={{background:"rgba(0,229,255,0.07)",borderRadius:8,padding:"8px 12px",fontSize:"0.7rem",color:C.text,borderLeft:`3px solid ${C.accent}`}}>
              <strong style={{color:C.accent}}>Clinical Pearl:</strong> SLR sensitivity 91% — excellent screening tool. Slump is more sensitive than SLR for central disc. ULTT1 (median) is the upper limb equivalent of SLR. Bilateral positive neural tension tests = central pathology (cord, central disc) until proven otherwise.
            </div>
          </CollapsibleHow>
          {NEURAL_TENSION.map(nt=>{
            const lv=data[nt.id+"_left"]||"", rv=data[nt.id+"_right"]||"";
            const posL=lv.includes("Positive"), posR=rv.includes("Positive");
            const abnormal=posL||posR;
            return(
              <div key={nt.id} data-nt-id={nt.id} style={{background:C.surface,border:`1px solid ${abnormal?C.accent+"60":C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:"0.9rem",color:abnormal?C.accent:C.text,marginBottom:2}}>{nt.label}</div>
                    <div style={{fontSize:"0.68rem",color:C.muted}}>{nt.nerve}</div>
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      <span style={{fontSize:"0.62rem",padding:"1px 7px",borderRadius:7,background:"rgba(0,229,255,0.1)",color:C.accent}}>Sens {nt.sensitivity}</span>
                    </div>
                  </div>
                  <button type="button" onClick={()=>setExpandedTest(expandedTest===nt.id?null:nt.id)}
                    style={{padding:"4px 10px",background:expandedTest===nt.id?"rgba(0,229,255,0.15)":"rgba(127,90,240,0.12)",border:`1px solid ${expandedTest===nt.id?C.accent:C.a2}40`,borderRadius:7,color:expandedTest===nt.id?C.accent:C.a2,fontSize:"0.65rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    {expandedTest===nt.id?"▲ Hide":"📋 Full Guide"}
                  </button>
                </div>
                {expandedTest===nt.id&&(
                  <div style={{background:C.s2,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>📋 Procedure</div>
                      <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.7}}>{nt.procedure}</div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>✓ Positive Finding</div>
                      <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.7}}>{nt.positive}</div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:C.a2,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>⚡ Differentiation</div>
                      <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.7}}>{nt.differentiation}</div>
                    </div>
                    <div>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>🧠 Clinical Pattern</div>
                      <div style={{fontSize:"0.76rem",color:C.text,lineHeight:1.7}}>{nt.pattern}</div>
                    </div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["_left","LEFT",lv],["_right","RIGHT",rv]].map(([sfx,side,sv])=>(
                    <div key={sfx}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,color:sv.includes("Positive")?C.accent:C.muted,marginBottom:3}}>{side} {sv.includes("Positive")?"⚡":""}</div>
                      <select value={sv} onChange={e=>set(nt.id+sfx,e.target.value)} style={{...inp,borderColor:sv.includes("Positive")?C.accent:C.border}}>
                        <option value="">— select —</option>
                        {NTT_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GCS — Glasgow Coma Scale ── */}
      {tab==="gcs"&&(
        <div>
          {sectionHead("Glasgow Coma Scale (GCS)")}
          <div style={{background:"rgba(0,229,255,0.06)",border:`1px solid ${C.accent}30`,borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:"0.76rem",color:C.muted,lineHeight:1.7}}>
            <strong style={{color:C.accent}}>Purpose:</strong> Standardised assessment of conscious level. Used in TBI, stroke, post-arrest, metabolic encephalopathy, spinal cord injury. Score range: <strong style={{color:C.red}}>3</strong> (deep coma) to <strong style={{color:C.green}}>15</strong> (fully conscious).<br/>
            <strong style={{color:C.yellow}}>Severity:</strong> 13–15 = Mild TBI | 9–12 = Moderate TBI | 3–8 = Severe TBI (intubation threshold ≤8)
          </div>

          {/* E — Eye Opening */}
          {[
            {
              id:"gcs_eye", label:"E — Eye Opening", maxScore:4, color:C.accent,
              options:[
                {score:4,label:"4 — Spontaneous",desc:"Eyes open without any stimulus"},
                {score:3,label:"3 — To Speech",desc:"Eyes open to verbal command or name-calling"},
                {score:2,label:"2 — To Pain",desc:"Eyes open to peripheral pain stimulus (nail bed pressure)"},
                {score:1,label:"1 — None",desc:"No eye opening to any stimulus"},
              ]
            },
            {
              id:"gcs_verbal", label:"V — Verbal Response", maxScore:5, color:C.a3,
              options:[
                {score:5,label:"5 — Oriented",desc:"Knows name, place, date — fully oriented"},
                {score:4,label:"4 — Confused",desc:"Converses but disoriented — confused sentences"},
                {score:3,label:"3 — Words",desc:"Inappropriate single words — cursing, calling out"},
                {score:2,label:"2 — Sounds",desc:"Incomprehensible sounds only — moaning, groaning"},
                {score:1,label:"1 — None",desc:"No verbal response. Use T if intubated (GCS VT)"},
              ]
            },
            {
              id:"gcs_motor", label:"M — Motor Response", maxScore:6, color:C.a2,
              options:[
                {score:6,label:"6 — Obeys Commands",desc:"Follows two-step motor command correctly"},
                {score:5,label:"5 — Localises",desc:"Purposeful movement toward pain stimulus"},
                {score:4,label:"4 — Withdrawal",desc:"Pulls away from pain (non-purposeful withdrawal)"},
                {score:3,label:"3 — Abnormal Flexion",desc:"Decorticate posturing — wrist flex, arm adduction"},
                {score:2,label:"2 — Extension",desc:"Decerebrate posturing — arm + leg extension, pronation"},
                {score:1,label:"1 — None",desc:"No motor response to any stimulus"},
              ]
            }
          ].map(comp=>{
            const val=parseInt(data[comp.id])||0;
            const pct=val/comp.maxScore*100;
            const col=val>=comp.maxScore?C.green:val>=Math.ceil(comp.maxScore*0.6)?C.yellow:C.red;
            return(
              <div key={comp.id} style={{background:C.surface,border:`1px solid ${val?comp.color+"40":C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontWeight:800,color:comp.color,fontSize:"0.88rem"}}>{comp.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontWeight:800,fontSize:"1.3rem",color:col}}>{val||"—"}</span>
                    <span style={{fontSize:"0.65rem",color:C.muted}}>/ {comp.maxScore}</span>
                  </div>
                </div>
                {val>0&&<div style={{height:4,background:C.s3,borderRadius:3,overflow:"hidden",marginBottom:10}}><div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:3,transition:"width 0.4s"}}/></div>}
                <div style={{display:"grid",gap:5}}>
                  {comp.options.map(opt=>{
                    const selected=val===opt.score;
                    return(
                      <div key={opt.score} onClick={()=>set(comp.id,String(opt.score))} style={{cursor:"pointer",padding:"8px 11px",borderRadius:8,background:selected?`${comp.color}18`:C.s2,border:`1px solid ${selected?comp.color:C.border}`,transition:"all 0.15s"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:"0.78rem",fontWeight:selected?700:400,color:selected?comp.color:C.text}}>{opt.label}</span>
                          {selected&&<span style={{color:comp.color,fontSize:"0.85rem"}}>✓</span>}
                        </div>
                        <div style={{fontSize:"0.68rem",color:C.muted,marginTop:2}}>{opt.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Total GCS */}
          {(()=>{
            const eye=parseInt(data["gcs_eye"])||0, verbal=parseInt(data["gcs_verbal"])||0, motor=parseInt(data["gcs_motor"])||0;
            const total=eye+verbal+motor;
            const hasAll=eye>0&&verbal>0&&motor>0;
            const severity=total>=13?"Mild / Normal":total>=9?"Moderate TBI":"Severe TBI";
            const sevCol=total>=13?C.green:total>=9?C.yellow:C.red;
            return(
              <div style={{background:hasAll?`${sevCol}12`:C.s2,border:`2px solid ${hasAll?sevCol:C.border}`,borderRadius:14,padding:"16px 18px",marginTop:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasAll?12:0}}>
                  <span style={{fontWeight:800,fontSize:"1rem",color:C.text}}>Total GCS Score</span>
                  <span style={{fontWeight:900,fontSize:"2rem",color:hasAll?sevCol:C.muted}}>{hasAll?total:"—"}</span>
                </div>
                {hasAll&&(
                  <>
                    <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                      <span style={{padding:"3px 10px",borderRadius:10,background:`${C.accent}15`,color:C.accent,fontSize:"0.72rem",fontWeight:700}}>E{eye}</span>
                      <span style={{padding:"3px 10px",borderRadius:10,background:`${C.a3}15`,color:C.a3,fontSize:"0.72rem",fontWeight:700}}>V{verbal}</span>
                      <span style={{padding:"3px 10px",borderRadius:10,background:`${C.a2}15`,color:C.a2,fontSize:"0.72rem",fontWeight:700}}>M{motor}</span>
                      <span style={{padding:"3px 10px",borderRadius:10,background:`${sevCol}20`,color:sevCol,fontSize:"0.72rem",fontWeight:800}}>{severity}</span>
                    </div>
                    <div style={{fontSize:"0.74rem",color:sevCol,fontWeight:600,lineHeight:1.6}}>
                      {total<=8&&"🔴 GCS ≤8: Airway protection threshold — anaesthesia/ICU alert. Severe TBI protocol."}
                      {total>=9&&total<=12&&"🟡 GCS 9–12: Moderate TBI. Frequent reassessment. Neurosurgical observation."}
                      {total>=13&&"✅ GCS 13–15: Mild / Normal. Continue monitoring for deterioration."}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Pupil Assessment */}
          <div style={{marginTop:14}}>
            {sectionHead("Pupil Assessment (Neuro Companion)")}
            {[
              {id:"gcs_pupil_l",label:"Left Pupil",options:["Not assessed","Equal & Reactive (normal)","Dilated — unreactive (CN III compression / herniation)","Constricted — pinpoint (opiates / pontine lesion)","Midpoint — non-reactive (midbrain)","Anisocoria — mildly asymmetric"]},
              {id:"gcs_pupil_r",label:"Right Pupil",options:["Not assessed","Equal & Reactive (normal)","Dilated — unreactive (CN III compression / herniation)","Constricted — pinpoint (opiates / pontine lesion)","Midpoint — non-reactive (midbrain)","Anisocoria — mildly asymmetric"]},
              {id:"gcs_pupil_react",label:"Pupil Reactivity",options:["Not assessed","Bilateral brisk reaction (normal)","Unilateral sluggish","Bilateral sluggish","Unilateral absent","Bilateral absent — ominous sign"]},
            ].map(q=>{
              const val=data[q.id]||""; const alarm=val.includes("unreactive")||val.includes("absent")||val.includes("ominous");
              return(
                <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"9px 12px",background:alarm?"rgba(255,77,109,0.08)":C.s2,border:`1px solid ${alarm?C.red:C.border}`,borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:"0.76rem",color:alarm?C.red:C.text,fontWeight:alarm?600:400}}>{alarm&&"🔴 "}{q.label}</span>
                  <select value={val} onChange={e=>set(q.id,e.target.value)} style={{...inp,width:"auto",minWidth:130,flexShrink:0,borderColor:alarm?C.red:C.border}}>
                    {q.options.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ── RED FLAGS ── */}
      {tab==="redflags"&&(
        <div>
          {sectionHead("Neurological Red Flags — Screening Checklist")}
          <div style={{background:"rgba(255,77,109,0.08)",border:`1px solid ${C.red}40`,borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:"0.76rem",color:C.muted,lineHeight:1.6}}>
            <strong style={{color:C.red}}>⚠️ IMPORTANT:</strong> Any positive red flag requires immediate action. Do NOT commence physiotherapy treatment until red flags are cleared or appropriately managed.
          </div>
          {RED_FLAGS_NEURO.map(rf=>{
            const val = data[rf.id]||"";
            const active = val==="Present";
            const isEmerg = rf.severity==="EMERGENCY";
            return(
              <div key={rf.id} style={{background:active?(isEmerg?"rgba(255,77,109,0.15)":"rgba(255,179,0,0.1)"):C.surface, border:`1.5px solid ${active?(isEmerg?C.red:C.yellow):C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8,transition:"all 0.2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:"1rem"}}>{rf.icon}</span>
                      <span style={{fontWeight:800,color:isEmerg?C.red:C.yellow,fontSize:"0.84rem"}}>{rf.label}</span>
                      <span style={{fontSize:"0.6rem",padding:"1px 7px",borderRadius:8,fontWeight:700,background:isEmerg?"rgba(255,77,109,0.2)":"rgba(255,179,0,0.2)",color:isEmerg?C.red:C.yellow}}>{rf.severity}</span>
                    </div>
                    <div style={{fontSize:"0.74rem",color:C.muted,marginBottom:6,lineHeight:1.5}}>{rf.description}</div>
                    {active&&<div style={{padding:"6px 10px",borderRadius:6,background:isEmerg?"rgba(255,77,109,0.15)":"rgba(255,179,0,0.1)",fontSize:"0.74rem",color:isEmerg?C.red:C.yellow,fontWeight:600}}>→ {rf.action}</div>}
                  </div>
                  <select value={val} onChange={e=>set(rf.id,e.target.value)} style={{...inp,width:"auto",minWidth:110,flexShrink:0,borderColor:active?(isEmerg?C.red:C.yellow):C.border}}>
                    <option value="">— screen —</option>
                    <option value="Cleared">✓ Cleared</option>
                    <option value="Present">🔴 Present</option>
                    <option value="Uncertain">⚠ Uncertain</option>
                  </select>
                </div>
              </div>
            );
          })}

          {/* Additional manual flags */}
          <div style={{marginTop:14}}>
            {sectionHead("Additional Screening Questions")}
            {[
              {id:"nq_bladder",label:"New onset bladder dysfunction (retention or incontinence)?"},
              {id:"nq_bowel",label:"New onset bowel dysfunction?"},
              {id:"nq_saddle",label:"Perineal / saddle area numbness or tingling?"},
              {id:"nq_bilateral_legs",label:"Bilateral leg weakness or paraesthesia?"},
              {id:"nq_gait_change",label:"Recent unexplained change in gait / balance?"},
              {id:"nq_drop_attacks",label:"Drop attacks or sudden falls?"},
              {id:"nq_diplopia",label:"Double vision, dysphagia, or dysarthria?"},
            ].map(q=>{
              const val=data[q.id]||"";
              const alarm=val==="Yes";
              return(
                <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"9px 12px",background:alarm?"rgba(255,77,109,0.1)":C.s2,border:`1px solid ${alarm?C.red:C.border}`,borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:"0.76rem",color:alarm?C.red:C.text,fontWeight:alarm?600:400,lineHeight:1.4,flex:1}}>{alarm&&"🔴 "}{q.label}</span>
                  <select value={val} onChange={e=>set(q.id,e.target.value)} style={{...inp,width:"auto",minWidth:90,flexShrink:0,borderColor:alarm?C.red:C.border}}>
                    <option value="">—</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Unsure">Unsure</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CLINICAL REASONING ── */}
      {tab==="reasoning"&&(
        <div>
          {sectionHead("Clinical Reasoning Engine — Nerve Root Pattern Analysis")}
          {reasoningOutput.patterns.length===0?(
            <div style={{textAlign:"center",padding:30,color:C.muted}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>🧠</div>
              <div>Complete dermatomes, myotomes, reflexes and neural tension tests to generate clinical pattern analysis.</div>
            </div>
          ):(
            <>
              {/* Interpretations */}
              {reasoningOutput.interpretations.map((interp,i)=>(
                <div key={i} style={{background:C.surface,border:`1.5px solid ${interp.color}60`,borderLeft:`4px solid ${interp.color}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                  <div style={{fontWeight:800,color:interp.color,marginBottom:6,fontSize:"0.88rem"}}>{interp.title}</div>
                  <div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.6,marginBottom:8}}>{interp.text}</div>
                  <div style={{fontSize:"0.72rem",color:interp.color,fontWeight:600,padding:"5px 10px",background:`${interp.color}12`,borderRadius:6}}>→ Recommended Action: {interp.action}</div>
                </div>
              ))}

              {/* Findings by level */}
              <div style={{marginTop:14}}>{sectionHead("Findings by Spinal Level")}</div>
              {reasoningOutput.patterns.map((p,i)=>(
                <div key={i} style={{background:C.s2,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                  <div style={{fontWeight:700,color:C.accent,marginBottom:6,fontSize:"0.85rem"}}>{p.level} {p.disc&&`— disc ${p.disc}`}</div>
                  {p.findings.map((f,j)=>(
                    <div key={j} style={{display:"flex",gap:8,marginBottom:4,fontSize:"0.76rem",color:C.text}}>
                      <span style={{color:f.type.includes("Pathological")||f.type.includes("Tension")?C.red:f.type==="Sensory"?C.yellow:C.a3,fontWeight:600,flexShrink:0}}>{f.type}:</span>
                      <span style={{color:C.muted}}>{f.detail}</span>
                    </div>
                  ))}
                  {/* Nerve root reference */}
                  {NERVE_ROOT_MAP[p.level]&&(
                    <div style={{marginTop:8,padding:"7px 10px",background:C.s3,borderRadius:7,fontSize:"0.72rem",color:C.muted}}>
                      <strong style={{color:C.text}}>Expected full pattern: </strong>
                      Sensory → {NERVE_ROOT_MAP[p.level].dermSensory} |
                      Reflex → {NERVE_ROOT_MAP[p.level].reflex} |
                      Motor → {NERVE_ROOT_MAP[p.level].myotome} |
                      Peripheral differentials: {NERVE_ROOT_MAP[p.level].peripheral}
                    </div>
                  )}
                </div>
              ))}

              {/* Nerve root vs peripheral differentiation */}
              <div style={{marginTop:16}}>
                {sectionHead("Nerve Root vs Peripheral Nerve — Key Differentials")}
                {[
                  {feature:"Sensory distribution",root:"Dermatomal (follows nerve root map)",peripheral:"Nerve territory (median, ulnar, radial etc.)"},
                  {feature:"Reflex change",root:"Segmental — affects muscles of that root",peripheral:"Distal to lesion — no segmental pattern"},
                  {feature:"Weakness pattern",root:"Myotomal — multi-muscle same level",peripheral:"Muscles of that specific nerve"},
                  {feature:"Neural tension tests",root:"Positive (root tension)",peripheral:"May be positive (Tinel's, Phalen's for CTS)"},
                  {feature:"Pain character",root:"Radicular — shooting, burning, lancinating",peripheral:"Distribution-specific, often aching/burning"},
                  {feature:"Autonomic features",root:"Rare",peripheral:"More common (swelling, colour change)"},
                ].map((row,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1.2fr",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:"0.73rem"}}>
                    <div style={{color:C.accent,fontWeight:600}}>{row.feature}</div>
                    <div style={{color:C.text}}>{row.root}</div>
                    <div style={{color:C.muted}}>{row.peripheral}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Clinician Notes */}
          <div style={{marginTop:20}}>
            {sectionHead("Clinician Notes — Neurological")}
            <textarea
              value={clinicianNotes}
              onChange={e=>{ setClinicianNotes(e.target.value); set("neuro_clinician_notes",e.target.value); }}
              placeholder="Document clinical reasoning, pattern impressions, referral decisions, treatment plan rationale..."
              style={{...inp,resize:"vertical",minHeight:100,display:"block",lineHeight:1.6}}
            />
          </div>
        </div>
      )}

      {/* ── CRANIAL NERVES ── */}
      {tab==="cranial"&&(
        <div>
          {sectionHead("Cranial Nerve Exam — I through XII")}
          {CRANIAL_NERVES.map(cn=>{
            const val = data[`cn_${cn.id}_status`]||"";
            const flagged = /Impaired|UMN pattern|LMN pattern|Conductive|Sensorineural|Deviates|Weak/.test(val);
            return (
              <div key={cn.id} data-neuro-id={`cn_${cn.id}`} style={{background:C.surface,border:`1px solid ${flagged?C.red+"50":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                  <div>
                    <span style={{fontWeight:800,fontSize:"0.8rem",color:C.text}}>CN {cn.numeral}</span>
                    <span style={{fontSize:"0.76rem",color:C.muted,marginLeft:6}}>{cn.name}</span>
                  </div>
                  <select value={val} onChange={e=>set(`cn_${cn.id}_status`,e.target.value)} style={{...inp,width:"auto",minWidth:150,flexShrink:0,borderColor:flagged?C.red:C.border,color:flagged?C.red:C.text}}>
                    <option value="">Not tested</option>
                    {cn.record.split(" / ").map(opt=><option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={{fontSize:"0.7rem",color:C.muted,lineHeight:1.5,marginBottom:5}}><strong style={{color:C.a2}}>Test:</strong> {cn.test}</div>
                <div style={{fontSize:"0.68rem",color:C.muted,lineHeight:1.5,background:C.s2,borderRadius:6,padding:"6px 8px"}}>{cn.note}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COGNITION ── */}
      {tab==="cognition"&&(
        <div>
          {sectionHead("Consciousness & Cognition — Orientation, MoCA, MMSE")}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:"0.78rem",color:C.text,marginBottom:8}}>Orientation</div>
            {[["cog_orient_person","Person — knows own name"],["cog_orient_place","Place — knows current location"],["cog_orient_time","Time — knows approximate date/time"],["cog_orient_situation","Situation — understands why they are here"]].map(([id,label])=>{
              const val=data[id]||"";
              return(
                <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:"0.75rem",color:C.text}}>{label}</span>
                  <div style={{display:"flex",gap:5}}>
                    {["Yes","No"].map(opt=>(
                      <button key={opt} type="button" onClick={()=>set(id,val===opt?"":opt)}
                        style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${val===opt?(opt==="Yes"?C.green:C.red):C.border}`,background:val===opt?(opt==="Yes"?C.green:C.red)+"18":"transparent",color:val===opt?(opt==="Yes"?C.green:C.red):C.muted,fontSize:"0.72rem",fontWeight:val===opt?700:400,cursor:"pointer"}}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {[
            {id:"cog_moca_score",label:"MoCA — Montreal Cognitive Assessment",max:30,cutoff:26,cutoffText:"impairment"},
            {id:"cog_mmse_score",label:"MMSE — Mini-Mental State Exam",max:30,cutoff:24,cutoffText:"impairment"},
          ].map(scale=>{
            const val=parseInt(data[scale.id])||"";
            const numVal=parseInt(data[scale.id]);
            const impaired = !isNaN(numVal) && numVal < scale.cutoff;
            return(
              <div key={scale.id} style={{background:C.surface,border:`1px solid ${impaired?C.red+"50":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:"0.78rem",color:C.text}}>{scale.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input type="number" min="0" max={scale.max} value={val} placeholder="—"
                      onChange={e=>set(scale.id,e.target.value)}
                      style={{width:54,padding:"4px 6px",borderRadius:6,border:`1px solid ${impaired?C.red:C.border}`,background:C.s2,color:impaired?C.red:C.text,fontSize:"0.8rem",fontWeight:700,textAlign:"center"}}/>
                    <span style={{fontSize:"0.68rem",color:C.muted}}>/ {scale.max}</span>
                  </div>
                </div>
                {!isNaN(numVal)&&<div style={{fontSize:"0.68rem",color:impaired?C.red:C.green,marginTop:5,fontWeight:600}}>{impaired?`Below ${scale.cutoff} — suggests cognitive ${scale.cutoffText}`:`At or above ${scale.cutoff} — within normal range`}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── COORDINATION ── */}
      {tab==="coordination"&&(
        <div>
          {sectionHead("Coordination & Involuntary Movements")}
          {COORDINATION_TESTS.map(t=>(
            <div key={t.id} data-neuro-id={t.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
              <div style={{fontWeight:700,fontSize:"0.78rem",color:C.text,marginBottom:4}}>{t.label}</div>
              <div style={{fontSize:"0.7rem",color:C.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {["L","R"].map(side=>{
                  const id=`${t.id}_${side}`; const val=data[id]||"";
                  const flagged=/dysmetria|ataxia|dysdiadochokinesia|Present|Unable/i.test(val)&&!/Absent|Normal/i.test(val);
                  return(
                    <div key={side}>
                      <div style={{fontSize:"0.6rem",fontWeight:700,color:C.muted,marginBottom:3}}>{side==="L"?"Left":"Right"}</div>
                      <select value={val} onChange={e=>set(id,e.target.value)} style={{...inp,borderColor:flagged?C.red:C.border,color:flagged?C.red:C.text}}>
                        <option value="">Not tested</option>
                        {t.record.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:"0.66rem",color:C.muted,lineHeight:1.5,background:C.s2,borderRadius:6,padding:"6px 8px"}}>{t.note}</div>
            </div>
          ))}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px"}}>
            <div style={{fontWeight:700,fontSize:"0.78rem",color:C.text,marginBottom:8}}>Involuntary movements</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {INVOLUNTARY_MOVEMENT_TYPES.map(opt=>{
                const active=data["neuro_involuntary_type"]===opt;
                return(
                  <button key={opt} type="button" onClick={()=>set("neuro_involuntary_type",active?"":opt)}
                    style={{padding:"5px 11px",borderRadius:8,border:`1px solid ${active?C.accent:C.border}`,background:active?`${C.accent}18`:"transparent",color:active?C.accent:C.muted,fontSize:"0.7rem",fontWeight:active?700:400,cursor:"pointer"}}>
                    {opt}
                  </button>
                );
              })}
            </div>
            <textarea value={data["neuro_involuntary_notes"]||""} onChange={e=>set("neuro_involuntary_notes",e.target.value)}
              placeholder="Describe frequency, amplitude, distribution, and any triggers..."
              style={{...inp,resize:"vertical",minHeight:60,lineHeight:1.5}}/>
          </div>
        </div>
      )}

      {/* ── VESTIBULAR / OCULOMOTOR ── */}
      {tab==="vestibular"&&(
        <div>
          {sectionHead("Vestibular & Oculomotor Screen")}
          {VESTIBULAR_TESTS.map(t=>{
            const id=`vest_${t.id}_result`; const val=data[id]||"";
            const flagged=/Positive|Abnormal|central|drop/i.test(val)&&!/Negative|Normal/i.test(val);
            return(
              <div key={t.id} data-neuro-id={t.id} style={{background:C.surface,border:`1px solid ${flagged?C.red+"50":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.78rem",color:C.text}}>{t.label}</div>
                    <div style={{fontSize:"0.65rem",color:C.a3,marginTop:1}}>{t.purpose}</div>
                  </div>
                </div>
                <div style={{fontSize:"0.7rem",color:C.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
                <select value={val} onChange={e=>set(id,e.target.value)} style={{...inp,borderColor:flagged?C.red:C.border,color:flagged?C.red:C.text,marginBottom:8}}>
                  <option value="">Not tested</option>
                  {t.record.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{fontSize:"0.66rem",color:C.muted,lineHeight:1.5,background:C.s2,borderRadius:6,padding:"6px 8px"}}>{t.note}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PERCEPTUAL ── */}
      {tab==="perceptual"&&(
        <div>
          {sectionHead("Perceptual Screen — Neglect, Apraxia, Body Scheme")}
          {PERCEPTUAL_TESTS.map(t=>{
            const id=`perc_${t.id}_result`; const val=data[id]||"";
            const flagged=/neglect|Ideomotor|Ideational|Impaired/i.test(val)&&!/No neglect|Absent|Intact/i.test(val);
            return(
              <div key={t.id} data-neuro-id={t.id} style={{background:C.surface,border:`1px solid ${flagged?C.red+"50":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:9}}>
                <div style={{fontWeight:700,fontSize:"0.78rem",color:C.text,marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:"0.7rem",color:C.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
                <select value={val} onChange={e=>set(id,e.target.value)} style={{...inp,borderColor:flagged?C.red:C.border,color:flagged?C.red:C.text,marginBottom:8}}>
                  <option value="">Not tested</option>
                  {t.record.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{fontSize:"0.66rem",color:C.muted,lineHeight:1.5,background:C.s2,borderRadius:6,padding:"6px 8px"}}>{t.note}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dermatome image modal */}
      {dermImgModal&&(
        <div onClick={()=>setDermImgModal(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:"95vw",maxHeight:"92vh",position:"relative"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:"0.9rem"}}>{dermImgModal.title}</span>
              <button onClick={()=>setDermImgModal(null)}
                style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"#fff",fontWeight:800,cursor:"pointer",padding:"4px 12px",fontSize:"0.75rem"}}>✕</button>
            </div>
            <img src={dermImgModal.src} alt={dermImgModal.title}
              style={{maxWidth:"90vw",maxHeight:"82vh",objectFit:"contain",borderRadius:10,display:"block"}}/>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// POSTURE CAMERA MODULE v2 — Professional Physiotherapy-Grade Pose Tracking
// ═══════════════════════════════════════════════════════════════════════════════


export { ALL_TESTS, ROMModule, MMTModule, NeurologicalModule,
  ROM_DATA, MMT_DATA, DERMATOMES, MYOTOMES, REFLEXES,
  NEURAL_TENSION, RED_FLAGS_NEURO, NERVE_ROOT_MAP };
