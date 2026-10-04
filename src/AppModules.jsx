// AppModules.jsx — PDF reports, HEP helpers, QuickVisit, Intake, Onboarding
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useRef, useEffect } from "react";

// Scroll-and-tap Day / Month / Year picker -- same "DD/MM/YYYY" string a
// plain text/date input would hold, so it drops straight into dem_dob etc.
// (Aditi: "select from the list date, year, month... like a scrolling
// thing" instead of typing or a native calendar). Self-contained inline
// styles so it renders correctly wherever it's used across the app.
const DATE_WHEEL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function DateWheelField({ value, onChange, inputStyle, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parts = (value || "").split("/");
  const day = parts[0] || "", month = parts[1] || "", year = parts[2] || "";
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  function setPart(which, v) {
    const d = which === "day" ? v : day, m = which === "month" ? v : month, y = which === "year" ? v : year;
    onChange([d, m, y].filter(Boolean).length ? `${d || "--"}/${m || "--"}/${y || "----"}` : "");
  }
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = DATE_WHEEL_MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - 100 + i).reverse().map(String);
  const display = day && month && year ? `${day}/${month}/${year}` : "";
  const colStyle = { flex: 1, maxHeight: 170, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, border: "1px solid #E5E1F5", borderRadius: 8, padding: 4 };
  const itemStyle = (active) => ({ padding: "7px 4px", textAlign: "center", borderRadius: 6, fontSize: "0.8rem", fontWeight: active ? 800 : 500, background: active ? "#7c3aed" : "transparent", color: active ? "#fff" : "#111827", cursor: "pointer", border: "none", fontFamily: "inherit" });
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value={display} placeholder={placeholder || "DD/MM/YYYY"} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
          style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={() => setOpen((o) => !o)} title="Pick date"
          style={{ flexShrink: 0, width: 40, borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>
          📅
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E5E1F5", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: "0.78rem" }}>Select date</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={colStyle}>{days.map((d) => (<button key={d} type="button" style={itemStyle(d === day)} onClick={() => setPart("day", d)}>{parseInt(d, 10)}</button>))}</div>
            <div style={colStyle}>{months.map((m) => (<button key={m.value} type="button" style={itemStyle(m.value === month)} onClick={() => setPart("month", m.value)}>{m.label}</button>))}</div>
            <div style={colStyle}>{years.map((y) => (<button key={y} type="button" style={itemStyle(y === year)} onClick={() => setPart("year", y)}>{y}</button>))}</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} style={{ marginTop: 8, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
      )}
    </div>
  );
}

// Loaded on demand (see PdfReportsModal.jsx): it carries the SOAP builder and the
// Ortho summary code, which the first screen does not need.
const LazyPdfReportsModal = React.lazy(() => import("./PdfReportsModal.jsx"));
function PdfReportsModal(props) {
  return (
    <React.Suspense fallback={null}>
      <LazyPdfReportsModal {...props} />
    </React.Suspense>
  );
}

// Loaded on demand (see SessionDetailView.jsx): the session editor carries the
// exercise library. Not React.lazy, so that once the file has arrived (it starts
// loading as soon as the sessions area opens, see QuickVisitForm, so it is usually
// ready before a session is tapped) every later render is immediate.
let SessionDetailViewImpl = null;
let sessionDetailViewLoading = null;
function preloadSessionDetailView() {
  if (SessionDetailViewImpl) return Promise.resolve(SessionDetailViewImpl);
  if (!sessionDetailViewLoading) {
    sessionDetailViewLoading = import("./SessionDetailView.jsx")
      .then((m) => { SessionDetailViewImpl = m.default; return SessionDetailViewImpl; })
      .catch((e) => { sessionDetailViewLoading = null; throw e; });
  }
  return sessionDetailViewLoading;
}
function SessionDetailView(props) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!SessionDetailViewImpl) preloadSessionDetailView().then(() => rerender((n) => n + 1)).catch(() => {});
  }, []);
  const Impl = SessionDetailViewImpl;
  return Impl ? <Impl {...props} /> : null;
}









// ── Shared small components for the Sessions feature ──────────────────────

function SessionPill({bg,col,children,onClick,title}){
  return <span onClick={onClick} title={title} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:7,background:bg,color:col,fontSize:"0.8rem",fontWeight:800,cursor:"pointer",flexShrink:0,userSelect:"none"}}>{children}</span>;
}

// Reusable add/edit/remove list -- same Pill buttons, same input style, same
// dashed "+ Add" box as the existing exercise list, so modalities, treatment,
// and past-session exercises all look and behave identically to each other
// and to the exercise list they were modelled on.
function EditableItemList({ PC, items, onAdd, onEdit, onRemove, addLabel, quickOptions }) {
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [addDetail, setAddDetail] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"7px 9px",fontSize:"0.8rem"};
  const startEdit = (it) => { setEditingId(it.id); setEditText(it.name); setEditDetail(it.detail||""); };
  const applyEdit = () => { if(editText.trim()) onEdit(editingId,{name:editText.trim(),detail:editDetail.trim()}); setEditingId(null); };
  const submitAdd = () => { if(addText.trim()){ onAdd({name:addText.trim(),detail:addDetail.trim()}); setAddText(""); setAddDetail(""); setAdding(false); } };
  const itemNames = items.map(it=>it.name);
  return (
    <div>
      {items.length===0 && <div style={{fontSize:"0.78rem",color:PC.muted,padding:"4px 0 8px"}}>None recorded yet.</div>}
      {items.map(it=>(
        <div key={it.id} style={{marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:9}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{it.name}</div>
              {it.detail&&<div style={{fontSize:"0.82rem",color:PC.muted}}>{it.detail}</div>}
            </div>
            <SessionPill bg={`${PC.accent}14`} col={PC.accent} title="Edit" onClick={()=>startEdit(it)}>✎</SessionPill>
            <SessionPill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>onRemove(it.id)}>−</SessionPill>
          </div>
          {editingId===it.id&&(
            <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.accent}08`,border:`1px dashed ${PC.accent}40`,borderRadius:9,marginTop:3,flexWrap:"wrap"}}>
              <input style={{...inp,flex:"1 1 100px"}} placeholder="Name" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyEdit()}/>
              <input style={{...inp,flex:"1 1 100px"}} placeholder="Detail (optional)" value={editDetail} onChange={e=>setEditDetail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyEdit()}/>
              <button onClick={applyEdit} style={{padding:"6px 12px",borderRadius:7,border:"none",background:PC.accent,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
            </div>
          )}
        </div>
      ))}
      {quickOptions&&quickOptions.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>
          {quickOptions.filter(o=>!itemNames.includes(o)).map(o=>(
            <button key={o} onClick={()=>onAdd({name:o,detail:""})} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>＋ {o}</button>
          ))}
        </div>
      )}
      {!adding?(
        <div onClick={()=>setAdding(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer"}}>{addLabel}</div>
      ):(
        <div style={{display:"flex",gap:6,alignItems:"center",padding:"9px 10px",border:`1.5px solid ${PC.accent}35`,borderRadius:11,background:`${PC.accent}06`,flexWrap:"wrap"}}>
          <input autoFocus style={{...inp,flex:"1 1 100px"}} placeholder="Name" value={addText} onChange={e=>setAddText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAdd()}/>
          <input style={{...inp,flex:"1 1 100px"}} placeholder="Detail (optional)" value={addDetail} onChange={e=>setAddDetail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAdd()}/>
          <button onClick={submitAdd} style={{padding:"6px 12px",borderRadius:7,border:"none",background:PC.accent,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Add</button>
          <button onClick={()=>{setAdding(false);setAddText("");setAddDetail("");}} style={{padding:"6px 10px",borderRadius:7,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
      )}
    </div>
  );
}

// Legacy sessions (saved before this feature) only ever stored treatment as
// one comma-joined string, since it was built by tapping chips that got
// appended together. Splitting it back into discrete items is a faithful,
// non-lossy reconstruction of what was already discrete data -- not a guess.
function legacyTreatmentToList(treatmentGiven){
  if(!treatmentGiven) return [];
  return treatmentGiven.split(",").map(s=>s.trim()).filter(Boolean).map(name=>({id:Math.random().toString(36).slice(2,9),name,detail:""}));
}

function sessionSummaryLine(s){
  const exN = Array.isArray(s.exercises)?s.exercises.length:0;
  const moN = Array.isArray(s.modalities)?s.modalities.length:0;
  const txN = Array.isArray(s.treatment)?s.treatment.length:legacyTreatmentToList(s.treatmentGiven).length;
  const parts=[];
  if(exN) parts.push(`${exN} exercise${exN!==1?"s":""}`);
  if(moN) parts.push(`${moN} modalit${moN!==1?"ies":"y"}`);
  if(txN) parts.push(`${txN} treatment${txN!==1?"s":""}`);
  return parts.join(" · ")||"No details logged";
}

// ── Screen 1: list of all sessions, newest first ───────────────────────────
function SessionListView({ PC, sessions, onOpen, onNew }) {
  const lbl = {fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px"};
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div style={lbl}>Sessions {sessions.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· {sessions.length} logged</span>}</div>
        <button onClick={onNew} style={{padding:"7px 14px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>＋ New session</button>
      </div>
      {sessions.length===0&&(
        <div style={{padding:"16px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,textAlign:"center"}}>No sessions logged yet — tap "＋ New session" to record the first visit.</div>
      )}
      {sessions.map((s,i)=>{
        const vs=parseFloat(s.vasStart), ve=parseFloat(s.vasEnd!==undefined&&s.vasEnd!==""?s.vasEnd:s.vasStart);
        const hasPain=!isNaN(vs);
        const better=hasPain&&!isNaN(ve)&&ve<vs, worse=hasPain&&!isNaN(ve)&&ve>vs;
        const note = s.quickNote||s.response||"";
        return (
          <div key={s.id||i} onClick={()=>onOpen(s.id)} style={{padding:"10px 11px",background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:10,marginBottom:8,cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,gap:8}}>
              <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.text}}>Session {s.sessionNo||sessions.length-i} <span style={{color:PC.muted,fontWeight:600}}>· {s.date}</span></span>
              {hasPain&&(
                <span style={{flexShrink:0,fontSize:"0.75rem",fontWeight:800,padding:"2px 9px",borderRadius:99,background:better?`${PC.a3}18`:worse?"rgba(220,38,38,0.12)":`${PC.a4}18`,color:better?PC.a3:worse?"#dc2626":PC.a4}}>
                  {vs}{!isNaN(ve)&&ve!==vs?`→${ve}`:""}
                </span>
              )}
            </div>
            <div style={{fontSize:"0.76rem",color:PC.muted,marginBottom:note?4:0}}>{sessionSummaryLine(s)}</div>
            {note&&<div style={{fontSize:"0.76rem",color:PC.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{note}"</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Top-level: switches between the session list and one session's detail ──
function QuickVisitForm({ PC, data, set, navTo }) {
  // Start loading the session editor now so it is ready when a session is tapped.
  useEffect(() => { preloadSessionDetailView().catch(() => {}); }, []);
  const sessionsArr = Array.isArray(data.tx_sessions)?data.tx_sessions:[];
  const [view, setView] = useState("list");
  const [activeId, setActiveId] = useState(null);

  if (view === "list") {
    return <SessionListView PC={PC} sessions={sessionsArr}
      onOpen={(id)=>{setActiveId(id); setView("detail");}}
      onNew={()=>{setActiveId(null); setView("detail");}}/>;
  }
  return <SessionDetailView key={activeId||"new"} PC={PC} data={data} set={set} navTo={navTo}
    sessionsArr={sessionsArr} activeId={activeId} onBack={()=>{setView("list"); setActiveId(null);}}/>;
}

// The "+ New" button in the top header opens this. Two steps, in this order
// (2026-08-31, Aditi: "new patient should [be] 6 ques max for demographic
// data or patient details and then ask for neuro ortho cardio sports"):
//
//   Step 1 — 7 patient-detail questions, nothing more on screen.
//   Step 2 — which specialty this assessment runs under.
//
// Step 1 was 6 questions; Address was added as the 7th on request
// (2026-08-31) after it had first been tucked into "More details". Still a
// short form -- the point was never the number 6 for its own sake.
//
// The old version asked ~20 questions across four tabs (Essential/Contact/
// Clinical/Consent) before it would create anything, and never asked which
// specialty the assessment was for -- every new patient silently became an
// Ortho one. Everything that used to be asked up front is still here and
// still saves to the same field keys; it just lives behind the optional
// "More details" toggle on step 1 instead of standing between the clinician
// and a usable patient record. Consent moved to step 2 (it isn't a
// demographic question, so it doesn't take a step-1 slot) and is still
// required before a record can be created.
const INTAKE_SPECIALTIES = [
  { id:"ortho",  label:"Ortho",  icon:"🦴", color:"#7c3aed", live:true  },
  { id:"neuro",  label:"Neuro",  icon:"🧠", color:"#0d9488", live:true  },
  { id:"cardio", label:"Cardio", icon:"❤️", color:"#dc2626", live:true  },
  { id:"sports", label:"Sports", icon:"🏃", color:"#ea580c", live:false },
  { id:"pedia",  label:"Pedia",  icon:"🧸", color:"#db2777", live:false },
];

function IntakeForm({ PC, currentUser, onCancel, onSubmit }) {
  // Fills the "nothing saves until you finish the whole intake form" gap:
  // before a patient record exists there's nowhere in Supabase to attach
  // this data to yet, and saving it to the cloud before the student has even
  // reached the consent checkbox "I consent to storage of my data" would
  // undercut the consent flow itself — so this is a local-only,
  // short-lived draft (namespaced per signed-in user, same reasoning as the
  // per-user patient DB) that just survives an accidental reload/crash/tab
  // close mid-intake. It's deleted the moment the form is submitted or
  // cancelled — it's scratch space, not a permanent record.
  const draftKey = `physio_intake_draft_v1_${currentUser?.id || "anon"}`;
  const [restoredDraft] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return !!(raw && typeof raw === "object" && Object.keys(raw).length > 0);
    } catch { return false; }
  });
  const [fd, setFd] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch { return {}; }
  });
  const [step, setStep] = React.useState("details"); // "details" | "specialty"
  const [moreOpen, setMoreOpen] = React.useState(false);
  const set = (k,v) => setFd(p=>({...p,[k]:v}));

  React.useEffect(() => {
    if (Object.keys(fd).length === 0) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(fd)); } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [fd, draftKey]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch {} };

  // Two field styles on purpose. `inp`/`lbl`/`field` is the compact
  // treatment, still used for the optional "More details" section. The
  // `n*` set below matches the full-page Clinical > Demographics step in
  // AppFull.jsx exactly -- larger rounded boxes, bold dark labels, red
  // required asterisk, htmlFor/id pairing -- so the app's two
  // patient-detail screens read as the same product rather than two
  // different forms.
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.82rem",marginBottom:0,boxSizing:"border-box"};
  const lbl = {fontSize:"0.78rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const field = (label, node) => (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      {node}
    </div>
  );
  const nInp = {width:"100%",background:PC.surface,border:`1.5px solid ${PC.border}`,borderRadius:10,color:PC.text,fontFamily:"inherit",outline:"none",padding:"11px 13px",fontSize:"0.9rem",boxSizing:"border-box"};
  const nLbl = {fontSize:"0.82rem",fontWeight:700,color:PC.text,marginBottom:6,display:"block"};
  const req = <span style={{color:"#dc2626"}}> *</span>;
  const nField = (label, el, required, id) => (
    <div style={{marginBottom:16}}>
      <label htmlFor={id} style={nLbl}>{label}{required&&req}</label>
      {el}
    </div>
  );
  // Sex as three tappable pills rather than a dropdown, and the same
  // Male/Female/Other set the Demographics and Cardio screens standardised
  // on -- one control, one vocabulary across the app.
  const SEX_OPTS = ["Male","Female","Other"];
  const sel = (k, opts) => (
    <select style={inp} value={fd[k]||""} onChange={e=>set(k,e.target.value)}>
      <option value="">—</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );

  // Step 1 gate: the two questions a patient record is meaningless without.
  const detailsOk = !!(fd.dem_name?.trim() && fd.cc_main?.trim());
  // Step 2 gate: a live specialty AND treatment consent, same hard
  // requirement the old Consent tab enforced before anything was created.
  const specialty = INTAKE_SPECIALTIES.find(s=>s.id===fd.assessment_specialty);
  const canSubmit = detailsOk && !!(specialty?.live) && !!fd.consent_treat;

  return (
    <div>
      {restoredDraft && (
        <div style={{padding:"7px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.75rem",color:PC.muted,marginBottom:14}}>
          ↺ Restored what you'd already typed before this got interrupted.
        </div>
      )}

      {/* Two-step progress — deliberately not tabs: the old free-jump tab
          strip is what let a half-filled intake sit around unfinished. */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        {[["details","Patient details"],["specialty","Specialty"]].map(([id,label],i)=>{
          const on = step===id;
          const done = id==="details" && step==="specialty";
          return (
            <div key={id} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:12,
              border:`1.5px solid ${on?PC.accent:PC.border}`,
              background: on ? `${PC.accent}12` : PC.surface}}>
              <span style={{width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:"0.7rem",fontWeight:800,
                background: on||done ? PC.accent : PC.s2,
                color: on||done ? "#fff" : PC.muted}}>
                {done ? "✓" : i+1}
              </span>
              <span style={{fontSize:"0.78rem",fontWeight:700,color:on?PC.accent:PC.muted,whiteSpace:"nowrap",
                overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1 · the 7 patient-detail questions ── */}
      {step==="details" && (
        <div>
          {nField("Full name",<input id="intake_dem_name" style={nInp} placeholder="e.g. Riya Sharma" value={fd.dem_name||""} onChange={e=>set("dem_name",e.target.value)} autoFocus/>,true,"intake_dem_name")}
          {nField("Age",<input id="intake_dem_age" style={nInp} type="text" placeholder="e.g. 34" value={fd.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>,false,"intake_dem_age")}
          <div style={{marginBottom:16}}>
            <label style={nLbl}>Sex</label>
            <div style={{display:"flex",gap:8}}>
              {SEX_OPTS.map(o=>(
                <button key={o} type="button" onClick={()=>set("dem_sex",o)}
                  style={{flex:1,padding:"11px 0",textAlign:"center",borderRadius:10,fontSize:"0.85rem",fontWeight:700,fontFamily:"inherit",
                    border:`1.5px solid ${fd.dem_sex===o?PC.accent:PC.border}`,
                    background:fd.dem_sex===o?PC.accent:PC.surface,
                    color:fd.dem_sex===o?"#fff":PC.text,cursor:"pointer"}}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          {nField("Phone",<input id="intake_dem_phone" style={nInp} type="tel" placeholder="+91 98765 43210" value={fd.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>,false,"intake_dem_phone")}
          {nField("Occupation",<input id="intake_dem_occupation" style={nInp} placeholder="e.g. Teacher, Desk worker" value={fd.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>,false,"intake_dem_occupation")}
          {nField("Address",<input id="intake_dem_address" style={nInp} placeholder="Street, City, Postcode" value={fd.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>,false,"intake_dem_address")}
          {nField("Chief complaint",<input id="intake_cc_main" style={nInp} placeholder="e.g. Lower back pain, knee injury" value={fd.cc_main||""} onChange={e=>set("cc_main",e.target.value)}/>,true,"intake_cc_main")}

          {/* Everything the old four-tab intake asked for, kept on file and
              kept optional. Nothing was dropped — it just no longer blocks
              getting to the assessment. */}
          <button type="button" onClick={()=>setMoreOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:"4px 0 10px",color:PC.accent,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{transform:moreOpen?"rotate(90deg)":"none",transition:"transform .15s",display:"inline-block"}}>▶</span>
            More details (optional)
          </button>

          {moreOpen && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Date of birth", <DateWheelField value={fd.dem_dob||""} onChange={v=>set("dem_dob",v)} inputStyle={inp}/>)}</div>
                <div>{field("Dominant hand", sel("dem_hand",["Right","Left","Ambidextrous"]))}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Pain now (0–10)", <input style={inp} type="number" min="0" max="10" placeholder="0–10" value={fd.cc_vas_now||""} onChange={e=>set("cc_vas_now",e.target.value)}/>)}</div>
                <div>{field("Duration", <input style={inp} placeholder="e.g. 3 weeks" value={fd.cc_duration||""} onChange={e=>set("cc_duration",e.target.value)}/>)}</div>
              </div>
              {field("Email address", <input style={inp} type="email" placeholder="patient@email.com" value={fd.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>{field("Emergency contact name", <input style={inp} placeholder="Full name" value={fd.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}</div>
                <div>{field("Emergency contact phone", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}</div>
              </div>
              {field("Referring doctor / GP", <input style={inp} placeholder="Dr. Name, Hospital" value={fd.dem_referral_dr||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
              {field("Referral source", sel("dem_referral_source",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
              {field("Insurance / Fund", <input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={fd.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
              {field("Policy / Member number", <input style={inp} placeholder="Optional" value={fd.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
              {field("Relevant medical history", <textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={fd.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
              {field("Current medications", <input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={fd.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
            </div>
          )}

          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>{clearDraft();onCancel();}} style={{flex:1,padding:"14px",borderRadius:12,border:`1.5px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit"}}>Cancel</button>
            <button disabled={!detailsOk} onClick={()=>setStep("specialty")}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:detailsOk?PC.accent:"#D1D5DB",color:"#fff",fontWeight:800,cursor:detailsOk?"pointer":"not-allowed",fontSize:"0.9rem",fontFamily:"inherit"}}>
              {detailsOk ? "Next: choose specialty →" : "Name & chief complaint first"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 · which specialty ── */}
      {step==="specialty" && (
        <div>
          <div style={{fontSize:"0.95rem",fontWeight:800,color:PC.text,marginBottom:3}}>Which specialty is this assessment?</div>
          <div style={{fontSize:"0.78rem",color:PC.muted,marginBottom:14}}>This decides which assessment flow {fd.dem_name?.trim()||"this patient"} starts in.</div>

          {/* Sports and Pedia are listed but not selectable — the same
              honest SOON treatment the Clinical tab's specialty grid uses,
              rather than offering a card that leads nowhere. */}
          <div data-testid="intake-specialty-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(96px,1fr))",gap:8,marginBottom:16}}>
            {INTAKE_SPECIALTIES.map(sp=>{
              const picked = fd.assessment_specialty === sp.id;
              return (
                <button key={sp.id} type="button"
                  onClick={()=>{ if(!sp.live) return; set("assessment_specialty", sp.id); }}
                  style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"14px 6px",borderRadius:14,fontFamily:"inherit",
                    cursor:sp.live?"pointer":"not-allowed",opacity:sp.live?1:0.55,
                    border:`1.5px solid ${picked?sp.color:(sp.live?sp.color+"50":"#E5E7EB")}`,
                    background:picked?sp.color+"1f":(sp.live?sp.color+"0d":"#F9FAFB")}}>
                  {!sp.live && <span style={{position:"absolute",top:6,right:6,fontSize:"0.55rem",fontWeight:800,padding:"1px 5px",borderRadius:8,background:"#E5E7EB",color:"#9CA3AF"}}>SOON</span>}
                  <span style={{fontSize:"1.5rem",lineHeight:1}}>{sp.icon}</span>
                  <span style={{fontWeight:700,fontSize:"0.8rem",color:sp.live?sp.color:"#9CA3AF"}}>{sp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Consent — same hard requirement as before, and the same
              guest-vs-signed-in storage wording main already corrected
              (data is NOT "on this device only" for a signed-in user);
              it's just no longer a whole tab of its own. */}
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:12,marginBottom:12,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Consent to Treatment</strong><br/>
            I consent to physiotherapy assessment and treatment. I understand I may withdraw consent at any time. Treatment goals and procedures have been explained to me.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:10}}>
            <input type="checkbox" checked={!!fd.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>I consent to physiotherapy assessment and treatment <span style={{color:"#ef4444"}}>*</span></span>
          </label>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:12,marginBottom:12,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Data Storage Consent</strong><br/>
            {currentUser?.id
              ? "Your clinical data is stored securely in your PhysioMind account. It is not shared with third parties. You may request deletion at any time."
              : "You're in guest mode: this data stays in your browser only and is not saved to any account. Sign in to store it securely and access it later."}
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:12}}>
            <input type="checkbox" checked={!!fd.consent_data} onChange={e=>set("consent_data",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:500}}>I consent to storage of my clinical data {currentUser?.id ? "in my PhysioMind account" : "in this browser"}</span>
          </label>
          {!fd.consent_treat && (
            <div style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,fontSize:"0.78rem",color:"#ef4444",fontWeight:600,marginBottom:10}}>
              ⚠ Treatment consent is required to create a patient record.
            </div>
          )}
          <div style={{padding:"8px 12px",background:PC.s3,borderRadius:8,fontSize:"0.75rem",color:PC.muted}}>
            Consent date: {new Date().toLocaleDateString("en-GB")} · Clinician: {currentUser?.user_metadata?.full_name ? `Dr. ${currentUser.user_metadata.full_name.replace(/^dr\.?\s+/i,"")}` : "Guest"}
          </div>

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>setStep("details")} style={{flex:1,padding:"14px",borderRadius:12,border:`1.5px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.88rem",fontFamily:"inherit"}}>← Back</button>
            <button disabled={!canSubmit} onClick={()=>{clearDraft();onSubmit(fd);}}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:canSubmit?PC.accent:"#D1D5DB",color:"#fff",fontWeight:800,cursor:canSubmit?"pointer":"not-allowed",fontSize:"0.9rem",fontFamily:"inherit"}}>
              {!specialty?.live ? "Pick a specialty" : !fd.consent_treat ? "Consent required" : `Start ${specialty.label} Assessment →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingModal({ PC, onDismiss }) {
  // iconGlyph = Tabler outline icon shown in the colored circle badge
  // (2026-09-16, Aditi: "make it good not this font and this grey thing")
  // -- replaces the giant standalone emoji + the flat grey PC.s2 disclaimer
  // fill with a proper card built from each step's own accent color.
  const STEPS = [
    { iconGlyph:"ti-stethoscope", title:"Welcome to PhysioMind", desc:"PhysioMind is strictly an educational training tool for physiotherapy students and clinicians. It does not provide medical diagnoses, treatment decisions, or replace professional clinical judgment.", color:"#7c3aed" },
    { iconGlyph:"ti-user-plus",   title:"Start with a Patient",        desc:'Tap "New Patient" on the dashboard to create a record. Fill in the name and chief complaint — everything else can be added as you go.',           color:"#0891b2" },
    { iconGlyph:"ti-list-check",  title:"Assess Step by Step",          desc:"Pick Ortho, Neuro or Cardio under Assess, then work through the steps one by one: Subjective, Pain, ROM, Special Tests and more. Your answers save automatically as you type.",             color:"#059669" },
  ];
  const [step, setStep] = React.useState(0);
  // Apple 5.1.1(v) / DPDP Act Sec 6: this acknowledgment is a mandatory
  // clickwrap, not a dismissible tour slide -- it cannot be skipped or
  // closed via backdrop click until the checkbox is explicitly checked.
  const [ackChecked, setAckChecked] = React.useState(false);
  const s = STEPS[step];
  const onLastStep = step === STEPS.length - 1;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{fontFamily:"'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",background:PC.surface,borderRadius:20,padding:"28px 24px 22px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.45)",border:`1px solid ${s.color}44`,textAlign:"center"}}>
        {/* Step dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=>(<div key={i} style={{width:i===step?20:7,height:7,borderRadius:99,background:i===step?s.color:PC.border,transition:"all 0.3s"}}/>))}
        </div>
        <div style={{width:56,height:56,borderRadius:"50%",background:`${s.color}17`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <i className={"ti "+s.iconGlyph} aria-hidden="true" style={{fontSize:26,color:s.color}}></i>
        </div>
        <div style={{fontWeight:800,fontSize:"1.2rem",color:PC.text,marginBottom:10,letterSpacing:"-0.3px"}}>{s.title}</div>
        <div style={{fontSize:"0.88rem",color:PC.muted,lineHeight:1.65,marginBottom:onLastStep?18:24}}>{s.desc}</div>
        {onLastStep && (
          <label style={{display:"flex",gap:10,alignItems:"flex-start",textAlign:"left",marginBottom:20,cursor:"pointer",background:`${s.color}0d`,border:`1px solid ${s.color}33`,borderRadius:12,padding:12}}>
            <input type="checkbox" checked={ackChecked} onChange={e=>setAckChecked(e.target.checked)} style={{marginTop:2,width:16,height:16,flexShrink:0,accentColor:s.color}}/>
            <span style={{fontSize:"0.78rem",color:PC.text,lineHeight:1.5,fontWeight:600}}>
              I understand that PhysioMind is an academic training aid and that all clinical interpretations must be verified by a licensed physical therapist.
            </span>
          </label>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(n=>n-1)} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${PC.border}`,background:"#fff",color:PC.muted,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>← Back</button>
          )}
          {!onLastStep ? (
            <button onClick={()=>setStep(n=>n+1)} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Next →</button>
          ) : (
            <button onClick={onDismiss} disabled={!ackChecked} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:ackChecked?s.color:`${s.color}55`,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:ackChecked?"pointer":"not-allowed"}}>Let's go →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────
export { PdfReportsModal, QuickVisitForm, IntakeForm, OnboardingModal, SessionListView, SessionDetailView, EditableItemList, SessionPill, legacyTreatmentToList, sessionSummaryLine, preloadSessionDetailView };
