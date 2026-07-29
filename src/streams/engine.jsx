import React, { useState, useMemo, useRef, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   Config-driven Assessment Engine (Step 2)

   Renders any clinical stream from a pure-data config (see neuro.js).
   Field state is bound to the app's shared flat `data` object via `set`,
   using a per-stream key prefix so streams never collide and notes save
   exactly like the ortho flow.

   Config shape:
     { id, label, phases: [
        { id, label, icon, sections: [
           { heading?, fields: [ FieldDescriptor ] } ] } ] }
   FieldDescriptor:
     { type, key, label, options?, rows?, mono?, columns?, regions?, modes?, layout? }
     type: text | textarea | select | checkgrid | limbtable | sensorytable
     layout: "full" | "half" | "third"  (default half)
   ───────────────────────────────────────────────────────────────────────── */

const span = { full: "1 / -1", half: "span 1", third: "span 1" };

function Label({ children, PC }) {
  return <span style={{display:"block",fontSize:"0.72rem",fontWeight:600,
    color:PC.muted,marginBottom:5,letterSpacing:"0.2px"}}>{children}</span>;
}

function baseInput(PC, mono) {
  return {width:"100%",borderRadius:9,border:`1px solid ${PC.border}`,
    background:PC.surface||"#fff",padding:"9px 11px",fontSize:"0.85rem",
    color:PC.text,fontFamily:mono?"ui-monospace,SFMono-Regular,Menlo,monospace":"inherit",
    outline:"none",boxSizing:"border-box"};
}

function Field({ f, val, onChange, PC }) {
  if (f.type === "textarea") {
    return (<label style={{display:"block"}}><Label PC={PC}>{f.label}</Label>
      <textarea rows={f.rows||3} value={val||""} placeholder={f.placeholder||""}
        onChange={e=>onChange(e.target.value)} style={{...baseInput(PC),resize:"vertical"}}/></label>);
  }
  if (f.type === "select") {
    return (<label style={{display:"block"}}><Label PC={PC}>{f.label}</Label>
      <select value={val||""} onChange={e=>onChange(e.target.value)} style={baseInput(PC)}>
        <option value="">—</option>
        {f.options.map(o=><option key={o} value={o}>{o}</option>)}
      </select></label>);
  }
  return (<label style={{display:"block"}}><Label PC={PC}>{f.label}</Label>
    <input type="text" value={val||""} placeholder={f.placeholder||""} onChange={e=>onChange(e.target.value)}
      style={baseInput(PC,f.mono)}/></label>);
}

function CheckGrid({ f, get, set, PC }) {
  return (
    <div style={{gridColumn:"1 / -1"}}>
      <Label PC={PC}>{f.label}</Label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
        {f.options.map(opt=>{
          const k=`${f.key}::${opt}`, on=!!get(k);
          return (
            <button key={opt} type="button" onClick={()=>set(k,!on)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,
                textAlign:"left",cursor:"pointer",fontSize:"0.82rem",
                border:`1px solid ${on?PC.accent:PC.border}`,
                background:on?PC.accent+"12":(PC.surface||"#fff"),
                color:on?PC.accent:PC.text}}>
              <span style={{width:15,height:15,flexShrink:0,borderRadius:4,display:"inline-flex",
                alignItems:"center",justifyContent:"center",fontSize:"0.7rem",color:"#fff",
                border:`1px solid ${on?PC.accent:PC.border}`,background:on?PC.accent:"transparent"}}>{on?"✓":""}</span>
              {opt}
            </button>);
        })}
      </div>
    </div>
  );
}

function GridTable({ f, get, set, PC, rows, cols, colOptions }) {
  return (
    <div style={{gridColumn:"1 / -1"}}>
      <Label PC={PC}>{f.label}</Label>
      <div style={{overflowX:"auto",border:`1px solid ${PC.border}`,borderRadius:10}}>
        <table style={{minWidth:"100%",borderCollapse:"collapse",fontSize:"0.82rem"}}>
          <thead><tr style={{background:PC.s2||"#f8fafc"}}>
            <th style={{padding:"8px 10px",textAlign:"left",color:PC.muted,fontWeight:600}}></th>
            {cols.map(c=><th key={c} style={{padding:"8px 10px",textAlign:"left",color:PC.muted,fontWeight:600,whiteSpace:"nowrap"}}>{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r} style={{background:i%2?(PC.surface||"#fff"):(PC.s2||"#f8fafc")+"66"}}>
                <td style={{padding:"7px 10px",fontWeight:600,color:PC.text,whiteSpace:"nowrap"}}>{r}</td>
                {cols.map(c=>{
                  const k=`${f.key}::${r}::${c}`;
                  return (<td key={c} style={{padding:"6px 8px"}}>
                    <select value={get(k)||""} onChange={e=>set(k,e.target.value)}
                      style={{...baseInput(PC),padding:"6px 8px"}}>
                      <option value="">—</option>
                      {(colOptions(c)||[]).map(o=><option key={o} value={o}>{o}</option>)}
                    </select></td>);
                })}
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AssessmentEngine({ config, data, set, PC, components, navTo }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [highlightKey, setHighlightKey] = useState(null);
  const [showChecklist, setShowChecklist] = useState(true);
  const exportRef = useRef(null);
  const P = `${config.id}_`; // key prefix in shared data
  const get = k => data[P+k];
  const put = (k,v) => set(P+k, v);

  const phase = config.phases[phaseIdx];

  // Conditional visibility: field/section may declare showIf {key, in|equals|any}
  const matchCond = (c) => {
    const v = get(c.key);
    if (c.in) return c.in.includes(v);
    if (c.equals !== undefined) return v === c.equals;
    if (c.any) return !!v;
    return true;
  };
  const visible = (item) => {
    const c = item.showIf; if (!c) return true;
    if (c.anyOf) return c.anyOf.some(matchCond);
    return matchCond(c);
  };

  // ── Guided workflow (from template checklists) ──
  const phaseIdxById = {};
  config.phases.forEach((p,i)=>{ phaseIdxById[p.id]=i; });
  const condition = get("condition");
  const fieldIndex = {};
  config.phases.forEach(ph=>ph.sections.forEach(sec=>sec.fields.forEach(fl=>{ fieldIndex[fl.key]=fl; })));
  const checklist = (config.checklists && (config.checklists[condition] || config.checklists._default)) || null;
  const highlightRef = useRef(null);
  const truthy = (val) => val !== "" && val != null && val !== false;
  const isFilled = (fieldKey) => {
    const fld = fieldIndex[fieldKey];
    if (fld && fld.match) { const ms = Array.isArray(fld.match)?fld.match:[fld.match];
      return Object.keys(data).some(k => ms.some(m=>k.startsWith(m)) && truthy(data[k])); }
    return Object.keys(data).some(k => (k === P+fieldKey || k.startsWith(P+fieldKey+"::")) && truthy(data[k]));
  };
  const jumpTo = (step) => {
    if (phaseIdxById[step.phase] != null) setPhaseIdx(phaseIdxById[step.phase]);
    setHighlightKey(step.fieldKey);
  };
  useEffect(() => {
    if (highlightKey && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
      const t = setTimeout(()=>setHighlightKey(null), 2200);
      return () => clearTimeout(t);
    }
  }, [highlightKey, phaseIdx]);

  const renderField = (f) => {
    if (!visible(f)) return null;
    let inner;
    if (f.type === "note") inner = (
      <div style={{padding:"10px 12px",borderRadius:10,background:(PC.s2||"#f8fafc"),
        border:`1px solid ${PC.border}`,color:PC.muted,fontSize:"0.78rem",lineHeight:1.55}}>
        <span style={{fontWeight:700,color:PC.accent}}>{f.tag||"\u2295 Clinical note"}</span> {f.text}</div>);
    else if (f.type === "checkgrid") inner = <CheckGrid f={f} get={get} set={put} PC={PC}/>;
    else if (f.type === "limbtable") inner = <GridTable f={f} get={get} set={put} PC={PC}
      rows={f.rows} cols={f.columns.map(c=>c.label)}
      colOptions={lbl=>{const c=f.columns.find(x=>x.label===lbl);return c?c.options:[];}}/>;
    else if (f.type === "sensorytable") inner = <GridTable f={f} get={get} set={put} PC={PC}
      rows={f.regions} cols={f.modes} colOptions={()=>f.grades}/>;
    else if (f.type === "component") {
      const Comp = components && components[f.widget];
      inner = Comp ? <Comp data={data} set={set} PC={PC} navTo={navTo}/>
        : <div style={{color:PC.muted,fontSize:"0.8rem"}}>Widget "{f.widget}" not registered.</div>;
    }
    else inner = <Field f={f} val={get(f.key)} onChange={v=>put(f.key,v)} PC={PC}/>;
    const hl = f.key === highlightKey;
    const full = f.type==="note"||f.type==="checkgrid"||f.type==="limbtable"||f.type==="sensorytable"||f.type==="component"||f.layout==="full";
    return (<div key={f.key} ref={hl?highlightRef:null}
      style={{gridColumn: full?"1 / -1":(span[f.layout]||span.half),
        ...(hl?{outline:`2px solid ${PC.accent}`,outlineOffset:4,borderRadius:12,transition:"outline 0.2s"}:{})}}>{inner}</div>);
  };

  const exportText = useMemo(() => {
    const out = [`${config.label.toUpperCase()} ASSESSMENT`, "=".repeat(40)];
    config.phases.forEach(ph=>{
      out.push("", ph.label.toUpperCase(), "-".repeat(ph.label.length));
      ph.sections.forEach(sec=>{
        if (!visible(sec)) return;
        if (sec.heading) out.push(`[${sec.heading}]`);
        sec.fields.forEach(f=>{
          if (!visible(f)) return;
          if (f.type==="note") return;
          if (f.type==="checkgrid") {
            const on=f.options.filter(o=>get(`${f.key}::${o}`));
            out.push(`${f.label}: ${on.length?on.join(", "):"None noted"}`);
          } else if (f.type==="limbtable") {
            f.rows.forEach(r=>out.push(`  ${r}: `+f.columns.map(c=>`${c.label}=${get(`${f.key}::${r}::${c.label}`)||"—"}`).join(", ")));
          } else if (f.type==="sensorytable") {
            f.regions.forEach(r=>out.push(`  ${r}: `+f.modes.map(m=>`${m}=${get(`${f.key}::${r}::${m}`)||"—"}`).join(", ")));
          } else {
            out.push(`${f.label}: ${get(f.key)||"—"}`);
          }
        });
      });
    });
    return out.join("\n");
  }, [data]); // eslint-disable-line

  const copyNote = async () => {
    try { await navigator.clipboard.writeText(exportText); }
    catch(e){ if(exportRef.current){ exportRef.current.select(); document.execCommand("copy"); } }
  };

  return (
    <div>
      {/* guided workflow checklist */}
      {checklist && (
        <div style={{marginBottom:18,border:`1px solid ${PC.border}`,borderRadius:12,overflow:"hidden"}}>
          <button type="button" onClick={()=>setShowChecklist(v=>!v)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"11px 14px",
              background:PC.s2||"#f8fafc",border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:"1rem"}}>🧭</span>
            <span style={{fontWeight:700,fontSize:"0.85rem",color:PC.text}}>Guided workflow — {condition}</span>
            <span style={{marginLeft:"auto",fontSize:"0.72rem",fontFamily:"ui-monospace,monospace",color:PC.muted}}>
              {checklist.filter(s=>isFilled(s.fieldKey)).length}/{checklist.length} done</span>
            <span style={{color:PC.muted,fontSize:"0.8rem"}}>{showChecklist?"\u25B2":"\u25BC"}</span>
          </button>
          {showChecklist && (
            <div style={{padding:"6px 8px"}}>
              {checklist.map((s,i)=>{
                const done = isFilled(s.fieldKey);
                return (
                  <button key={i} type="button" onClick={()=>jumpTo(s)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                      background:"none",border:"none",borderRadius:8,cursor:"pointer",textAlign:"left"}}>
                    <span style={{width:18,height:18,flexShrink:0,borderRadius:"50%",display:"inline-flex",
                      alignItems:"center",justifyContent:"center",fontSize:"0.7rem",color:done?"#fff":PC.muted,
                      background:done?PC.accent:"transparent",border:`1.5px solid ${done?PC.accent:PC.border}`}}>{done?"\u2713":i+1}</span>
                    <span style={{fontSize:"0.82rem",color:done?PC.muted:PC.text,textDecoration:done?"line-through":"none"}}>{s.label}</span>
                    <span style={{marginLeft:"auto",fontSize:"0.68rem",color:PC.muted}}>\u2192</span>
                  </button>);
              })}
            </div>)}
        </div>)}
      {/* phase pills */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {config.phases.map((ph,i)=>(
          <button key={ph.id} type="button" onClick={()=>setPhaseIdx(i)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:9,
              cursor:"pointer",fontSize:"0.8rem",fontWeight:700,
              border:`1px solid ${i===phaseIdx?PC.accent:PC.border}`,
              background:i===phaseIdx?PC.accent+"14":(PC.surface||"#fff"),
              color:i===phaseIdx?PC.accent:PC.muted}}>
            <span>{ph.icon}</span>{ph.label}
          </button>))}
        <button type="button" onClick={()=>setShowExport(true)}
          style={{marginLeft:"auto",padding:"7px 14px",borderRadius:9,cursor:"pointer",
            fontSize:"0.8rem",fontWeight:700,border:`1px solid ${PC.accent}`,
            background:PC.accent,color:"#fff"}}>📄 Generate note</button>
      </div>

      {/* active phase */}
      <div>
        <h2 style={{fontSize:"1.35rem",fontWeight:800,color:PC.text,marginBottom:4}}>{phase.label}</h2>
        {phase.subtitle && <p style={{fontSize:"0.82rem",color:PC.muted,marginBottom:16}}>{phase.subtitle}</p>}
        {phase.sections.filter(visible).map((sec,si)=>{
          const shown = sec.fields.filter(visible);
          if (!shown.length) return null;
          return (
          <div key={si} style={{marginBottom:22}}>
            {sec.heading && <h4 style={{fontSize:"0.78rem",fontWeight:700,color:PC.text,
              textTransform:"uppercase",letterSpacing:"0.6px",margin:"6px 0 12px"}}>{sec.heading}</h4>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
              {shown.map(renderField)}
            </div>
          </div>);
        })}
      </div>

      {/* phase nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginTop:24,paddingTop:16,borderTop:`1px solid ${PC.border}`}}>
        <button type="button" onClick={()=>setPhaseIdx(i=>Math.max(0,i-1))} disabled={phaseIdx===0}
          style={{fontSize:"0.82rem",color:PC.muted,background:"none",border:"none",
            cursor:phaseIdx===0?"default":"pointer",opacity:phaseIdx===0?0.3:1}}>← Previous</button>
        <span style={{fontSize:"0.72rem",color:PC.muted,fontFamily:"ui-monospace,monospace"}}>{phaseIdx+1} / {config.phases.length}</span>
        <button type="button" onClick={()=>setPhaseIdx(i=>Math.min(config.phases.length-1,i+1))} disabled={phaseIdx===config.phases.length-1}
          style={{fontSize:"0.82rem",color:PC.muted,background:"none",border:"none",
            cursor:phaseIdx===config.phases.length-1?"default":"pointer",opacity:phaseIdx===config.phases.length-1?0.3:1}}>Next →</button>
      </div>

      {/* export modal */}
      {showExport && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",
          alignItems:"center",justifyContent:"center",padding:16,zIndex:60}}>
          <div style={{background:PC.surface||"#fff",borderRadius:14,width:"100%",maxWidth:640,
            maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"14px 18px",borderBottom:`1px solid ${PC.border}`}}>
              <h3 style={{fontSize:"0.95rem",fontWeight:700,color:PC.text}}>{config.label} clinical note</h3>
              <button type="button" onClick={()=>setShowExport(false)}
                style={{background:"none",border:"none",cursor:"pointer",color:PC.muted,fontSize:"0.85rem"}}>Close</button>
            </div>
            <textarea ref={exportRef} readOnly value={exportText}
              style={{flex:1,minHeight:"45vh",resize:"none",padding:"14px 18px",fontSize:"0.75rem",
                fontFamily:"ui-monospace,monospace",color:PC.text,background:"transparent",border:"none",outline:"none"}}/>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,padding:"12px 18px",borderTop:`1px solid ${PC.border}`}}>
              <button type="button" onClick={copyNote}
                style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${PC.border}`,
                  background:"none",color:PC.text,fontSize:"0.78rem",cursor:"pointer"}}>Copy</button>
              <button type="button" onClick={()=>window.print()}
                style={{padding:"7px 14px",borderRadius:8,border:"none",background:PC.accent,
                  color:"#fff",fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Print</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
