// DashboardModules.jsx — Home module, Therapist dashboard
// Extracted from AppFull.jsx — pure extraction, no logic changes
import { doctorFirstName } from "./userName.js";
import { withoutSamples } from "./samplePatients.js";
import React, { useState, useEffect } from "react";
import { getCareerNews } from "./physiofeed/data/db.js";

// ═══════════════════════════════════════════════════════════════════════════
// HOME MODULE — App Introduction & Feature Overview
// ═══════════════════════════════════════════════════════════════════════════
// Restored (2026-09-02) -- an unrelated upstream commit removed this
// alongside the demo PhysioFeed preview that used to be its only caller,
// not realizing TherapistDashboardModule's own "DP" avatar fix (same day,
// different commit) had since started calling it too; the two merged
// cleanly with no conflict marker, silently leaving a dangling reference
// that crashed the whole Clinical > Today dashboard at render time.
function initialsOf(fullName) {
  const clean = (fullName || "").replace(/^Dr\.?\s*/, "").split(",")[0].trim();
  const parts = clean.split(" ").filter(Boolean);
  return parts.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);

// Small flat illustration for the greeting card -- a clinician holding a
// clipboard, with a mini "patient card" behind and a sparkle badge, echoing
// the reference design without depending on any external image asset.
const GreetingIllustration = () => (
  <svg width="108" height="108" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-8 35 47)">
      <rect x="4" y="22" width="62" height="50" rx="10" fill="#fff" opacity="0.9"/>
      <circle cx="20" cy="38" r="7" fill="#C4B5FD"/>
      <rect x="31" y="34" width="26" height="4" rx="2" fill="#DDD6FE"/>
      <rect x="31" y="42" width="20" height="4" rx="2" fill="#EDE9FE"/>
      <rect x="14" y="53" width="44" height="4" rx="2" fill="#EDE9FE"/>
    </g>
    <rect x="46" y="52" width="46" height="60" rx="20" fill="#7C3AED"/>
    <circle cx="69" cy="40" r="16" fill="#F4C2A1"/>
    <path d="M55 35c1-11 27-11 28 0-4-5-24-5-28 0z" fill="#2B2233"/>
    <rect x="58" y="66" width="26" height="32" rx="4" fill="#fff"/>
    <rect x="63" y="74" width="16" height="3" rx="1.5" fill="#C4B5FD"/>
    <rect x="63" y="81" width="16" height="3" rx="1.5" fill="#EDE9FE"/>
    <path d="M64 90.5l4 4 8-8.5" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="96" cy="26" r="14" fill="#7C3AED"/>
    <path d="M96 18.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z" fill="#fff"/>
  </svg>
);

// Prompts a signed-in therapist to fill in the clinic details that head every PDF
// report (saved on the Profile tab). Hides itself once all are saved; "Later"
// snoozes it for 7 days so it never nags.
function ClinicDetailsBanner({ currentUser, onNav }) {
  const key = `pm_clinic_banner_snooze_${currentUser?.id || ""}`;
  const [snoozed, setSnoozed] = React.useState(() => {
    try { return Date.now() - Number(localStorage.getItem(key) || 0) < 7 * 24 * 3600 * 1000; } catch { return false; }
  });
  const m = currentUser?.user_metadata || {};
  const complete = m.clinic_name && m.clinic_address && m.clinic_phone;
  if (!currentUser?.id || complete || snoozed) return null;
  return (
    <div role="region" aria-label="Clinic details" style={{background:"linear-gradient(135deg,#F5F3FF,#EEF2FF)",border:"1px solid #DDD6FE",borderRadius:14,padding:"12px 14px"}}>
      <div style={{fontSize:13.5,fontWeight:800,color:"#4C1D95"}}>🏥 Add your clinic details</div>
      <div style={{fontSize:12,color:"#5B21B6",lineHeight:1.5,margin:"3px 0 10px"}}>
        Your name, clinic, address and phone appear at the top of every PDF report. Add them once and they fill in automatically.
      </div>
      <div style={{display:"flex",gap:8}}>
        <button type="button" onClick={()=>onNav("settings")}
          style={{flex:1,padding:"9px 12px",border:"none",borderRadius:10,background:"#7C3AED",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Add now</button>
        <button type="button" onClick={()=>{ try { localStorage.setItem(key, String(Date.now())); } catch {} setSnoozed(true); }}
          style={{padding:"9px 14px",border:"1px solid #DDD6FE",borderRadius:10,background:"#fff",color:"#6D28D9",fontWeight:600,fontSize:13,cursor:"pointer"}}>Later</button>
      </div>
    </div>
  );
}

function HomeModule({ onNav, patients=[], data={}, taskDB=[], onNewPatient, currentUser, onStartAI, showPosture=false }) {
  // Home was a fixed 640px mobile column even on laptop/desktop widths,
  // leaving large empty gutters either side of the sidebar-plus-content
  // shell (2026-08-25, laptop redesign). Widen the content column itself
  // on real desktop widths -- the tile/quick-access grids are already
  // repeat(4,1fr) so they fill the extra width without restructuring.
  const [isDesktop, setIsDesktop] = useState(typeof window!=="undefined" && window.innerWidth>=1100);
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth>=1100);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const greeting = new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening";
  // No made-up fallback name: someone with no name on file is just welcomed (was "Aditi").
  const firstName = doctorFirstName(currentUser);

  // Home's main preview card shows News for now instead of Evidence
  // (2026-10-02, Aditi: "where evidences are shown in home, news should
  // shown for now... when people actively put opportunity then it should
  // put this" -- News has real daily content right now; Evidence stays
  // reachable via the Quick Access tile below, and Opportunity can take
  // this same spot later once it has real, actively-posted content).
  const [news, setNews] = useState([]);
  useEffect(() => { getCareerNews().then((rows) => setNews(rows.slice(0, 3))).catch(() => {}); }, []);

  const TILES = [
    { key:"clinical",   icon:"📋", bg:"#EEF2FF", title:"Clinical",        sub:"Patients and treatment",            action:()=>onNav("clinical") },
    { key:"assessment", icon:"✅", bg:"#ECFDF5", title:"Assessment",      sub:"Ortho, Neuro, Cardio. More soon",         action:()=>onNav("clinical",{clinicalSubTab:"assessment"}) },
    // 2026-09-02, Aditi: "the AI Assessment tile takes us to the old AI...
    // put it in a new AI orthopedic button" -- this used to open the old
    // Subjective step with an auto-open-AI flag; now starts the same real
    // "Start with AI" entry point the New Assessment picker's own AI card
    // already uses (OrthoAssessmentNew.jsx's AI intake, entryMode:"ai"),
    // which also resets any stale patient/data first the way that picker
    // does -- onNav alone wouldn't do that.
    { key:"ai",         icon:"✨", bg:"#F5F3FF", title:"AI Assessment",   sub:"Say it, AI fills it in", action:()=>onStartAI ? onStartAI() : onNav("ortho_new_assessment", { entryMode: "ai" }) },
    // Posture Analysis is not launched yet: shown only to preview accounts (featureFlags.js).
    ...(showPosture ? [{ key:"posture",    icon:"🧍", bg:"#EFF6FF", title:"Posture Analysis",sub:"AI posture assessment",                       action:()=>onNav("posture") }] : []),
  ];

  const QUICK_ACCESS = [
    { key:"evidence", icon:"📚", bg:"#EFF6FF", title:"Evidence", sub:"Research and papers",   action:()=>onNav("physiofeed",{pfTab:"evidence"}) },
    { key:"explore",  icon:"🧭", bg:"#ECFEFF", title:"Explore",  sub:"Topics and tools",     action:()=>onNav("physiofeed") },
    { key:"learn",    icon:"🎓", bg:"#F5F3FF", title:"Learn",    sub:"Guides and techniques",action:()=>onNav("learn") },
    { key:"saved",    icon:"🔖", bg:"#FFF7ED", title:"Saved",    sub:"Your saved items",            action:()=>onNav("physiofeed") },
  ];

  return (
    <div style={{maxWidth: isDesktop?1100:640, margin:"0 auto", fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif"}}>

      {/* ── Greeting card ── */}
      <div style={{
        background:"linear-gradient(135deg,#F5F0FF 0%,#EDE4FF 55%,#E7DBFF 100%)",
        borderRadius:22, padding:"20px 14px 20px 20px", marginBottom:18,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
      }}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"#4C1D95"}}>{greeting},</div>
          <div style={{fontSize:21,fontWeight:800,color:"#1F1147",marginTop:2}}>{firstName ? `Dr. ${firstName}` : "Welcome"} 👋</div>
          <div style={{fontSize:12,color:"#6D28D9",marginTop:7,fontWeight:600}}>What would you like to do today?</div>
        </div>
        <div style={{flexShrink:0}}><GreetingIllustration/></div>
      </div>

      {/* ── Clinical / Assessment / AI Assessment / Posture Analysis ── */}
      <div className="pm-grid-tiles" style={{display:"grid",gap:8,marginBottom:18,"--pm-tiles":TILES.length}}>
        {TILES.map(t=>(
          <button key={t.key} data-testid={`home-tile-${t.key}`} onClick={t.action} style={{
            background:"#fff", border:"1px solid #EDEDF2", borderRadius:16, padding: isDesktop?"18px 16px":"12px 8px",
            display:"flex", flexDirection:"column", alignItems:"flex-start", gap:7, textAlign:"left",
            cursor:"pointer", boxShadow:"0 1px 4px rgba(16,24,40,0.04)", minHeight: isDesktop?150:126,
          }}>
            <div style={{width: isDesktop?40:34,height: isDesktop?40:34,borderRadius:10,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize: isDesktop?18:15}}>{t.icon}</div>
            <div style={{fontSize: isDesktop?13:11.5,fontWeight:800,color:"#111827",lineHeight:1.2}}>{t.title}</div>
            <div style={{fontSize: isDesktop?12:11,color:"#5B6270",lineHeight:1.3}}>{t.sub}</div>
            <span style={{marginTop:"auto",alignSelf:"flex-end",color:"#C7C7CE",fontSize:13}}>›</span>
          </button>
        ))}
      </div>

      {/* ── How to use PhysioMind (2026-10-02, Aditi: "add new tile at home") --
          opens Settings with the guide already expanded (AppFull.jsx reads
          navContext.howTo). ── */}
      <button data-testid="home-tile-howto" onClick={()=>onNav("settings",{howTo:true})} style={{
        width:"100%", display:"flex", alignItems:"center", gap:12, background:"#fff", border:"1px solid #EDEDF2",
        borderRadius:16, padding: isDesktop?"14px 16px":"12px 14px", marginBottom:18, cursor:"pointer", textAlign:"left",
        boxShadow:"0 1px 4px rgba(16,24,40,0.04)", fontFamily:"inherit",
      }}>
        <div style={{width: isDesktop?40:34,height: isDesktop?40:34,borderRadius:10,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center",fontSize: isDesktop?18:15,flexShrink:0}}>📖</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize: isDesktop?13:12,fontWeight:800,color:"#111827",lineHeight:1.2}}>How to use PhysioMind</div>
          <div style={{fontSize: isDesktop?12:11.5,color:"#5B6270",lineHeight:1.35,marginTop:2}}>Short guides: start an assessment, save it, find a patient, make a report</div>
        </div>
        <span style={{color:"#C7C7CE",fontSize:16,flexShrink:0}}>›</span>
      </button>

      {/* ── News preview (took over Evidence's spot here, see the comment
          above where `news` is fetched) ── */}
      <div style={{background:"#fff", border:"1px solid #EDEDF2", borderRadius:18, padding:"16px 16px 14px", marginBottom:18, boxShadow:"0 1px 4px rgba(16,24,40,0.04)"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <span style={{fontSize:18,lineHeight:1}}>📰</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>News & Updates</div>
              <div style={{fontSize:12,color:"#5B6270",marginTop:1}}>Jobs, conferences & regulation</div>
            </div>
          </div>
          <button onClick={()=>onNav("physiofeed",{pfTab:"news"})} style={{background:"none",border:"none",color:"#7C3AED",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,padding:0}}>View all ›</button>
        </div>

        {news.length ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {news.map((n,i)=>(
              <a key={n.id} href={n.source_url} target="_blank" rel="noopener noreferrer" style={{display:"block",border:"1px solid #F0F0F3", borderRadius:14, padding:"11px 13px", textDecoration:"none"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{fontSize:12.5,fontWeight:800,color:"#111827",lineHeight:1.35}}>{n.title}</div>
                  {i===0 && <span style={{flexShrink:0,fontSize:9,fontWeight:800,color:"#059669",background:"#ECFDF5",borderRadius:99,padding:"2.5px 8px",whiteSpace:"nowrap"}}>NEW</span>}
                </div>
                <div style={{fontSize:11.5,color:"#5B6270",marginTop:4}}>{n.source_name}{n.deadlineLabel ? ` · ${n.deadlineLabel}` : ""}</div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"20px 10px",color:"#9A9AA2",fontSize:12}}>Nothing here yet — check back soon.</div>
        )}
      </div>

      {/* ── Quick Access ── */}
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
          <GridIcon/>
          <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>Quick Access</div>
        </div>
        <div className="pm-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {QUICK_ACCESS.map(q=>(
            <button key={q.key} onClick={q.action} style={{background:"none",border:"none",padding:0,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:7,cursor:"pointer",textAlign:"left"}}>
              <div style={{width:32,height:32,borderRadius:10,background:q.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{q.icon}</div>
              <div style={{fontSize:11,fontWeight:800,color:"#111827"}}>{q.title}</div>
              <div style={{fontSize:11,color:"#5B6270",lineHeight:1.3}}>{q.sub}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST DASHBOARD MODULE
// ═══════════════════════════════════════════════════════════════════════════
function TherapistDashboardModule({ patients, data, onNav, onProfile, onQuickStart, onStartAI, currentUser }) {
  const { useState, useEffect, useMemo } = React;
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  // Only real derived value the minimal page still needs -- everything
  // else (tasks, schedule, outcomes analytics, trend chart) was removed
  // along with the sections that displayed it.
  const realPatients = useMemo(() => withoutSamples(patients), [patients]);
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return realPatients.filter(p => new Date(p.updatedAt).toDateString() === today).length;
  }, [realPatients]);

  const now = new Date();
  const greeting = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
  const dateStr  = now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  // No made-up fallback name for someone who has none on file (it used to say "Dr. Aditi").
  const todayName = doctorFirstName(currentUser);
  // Minimal Today page (Aditi: "the today page should be minimal remove
  // the task workflow, patient outcome remove... more minimal", then "put
  // here that total patient count") -- Today's count plus the overall
  // total, both routing to Clinical's real Patients list, not the old
  // Subjective tab.
  const STATS = [
    {label:"Today",   value:String(todayCount),      sub:"patients", icon:"👥",color:"#6D28D9",bg:"#EDE9FE",nav:"clinical",navCtx:{clinicalSubTab:"patients"}},
    {label:"Total",   value:String(realPatients.length),  sub:"patients", icon:"🗂️",color:"#0891B2",bg:"#ECFEFF",nav:"clinical",navCtx:{clinicalSubTab:"patients"}},
  ];

  return (
    <div style={{fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",background:"#F8FAFC",minHeight:"100vh",padding:"0 0 24px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideOut{from{opacity:1;transform:translateX(0) scaleY(1);max-height:200px}to{opacity:0;transform:translateX(60px) scaleY(0);max-height:0;margin:0;padding:0}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.35}}
        .dc{animation:fadeUp 0.45s ease both}
        .completing{animation:slideOut 0.55s cubic-bezier(.4,0,.2,1) forwards}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"white",padding:"20px 16px 14px",borderBottom:"1px solid #F1F5F9",
        position:"sticky",top:0,zIndex:20,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500,marginBottom:2}}>{dateStr}</div>
            <div style={{fontSize:16,fontWeight:800,color:"#111827",letterSpacing:"-0.4px"}}>
              {greeting}{todayName ? `, Dr. ${todayName}` : ""} 👋
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Sign out / Delete account moved to the sidebar, below
                Settings (2026-09-10, Aditi screenshot: "put this red circle
                in side bar below the settings ... remove from todays
                clinical section") -- account-level actions don't belong in
                the middle of the patient-facing Today dashboard. */}
            {/* 2026-09-02, Aditi: "what is DP, what does it do" -- this was
                a hardcoded "DP" placeholder (not this therapist's actual
                initials) that opened the old Ortho Subjective assessment
                on tap, which had nothing to do with what an avatar in a
                header normally does. Now shows the real signed-in
                therapist's initials and opens their own Profile tab. */}
            <div style={{width:38,height:38,borderRadius:11,
              background:"linear-gradient(135deg,#8f63f0 0%,#bb6be3 52%,#e77fc0 100%)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:800,color:"white",cursor:"pointer"}}
              onClick={()=>onNav("profile")}>
              {initialsOf(currentUser?.user_metadata?.full_name) || "Dr"}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:16}}>

        <ClinicDetailsBanner currentUser={currentUser} onNav={onNav}/>

        {/* ── TODAY STRIP -- compressed from a 2x2 grid (4 tall cards, real
            vertical scroll cost) into one row, one card. Same data, same
            click targets, far less space before the therapist reaches
            anything actionable. ── */}
        <div className="dc" style={{
          background:"white",borderRadius:16,padding:"12px 6px",
          border:"1px solid #F1F5F9",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
          display:"flex",
        }}>
          {STATS.map((st)=>(
            <div key={st.label} style={{flex:"1 1 0",minWidth:0,textAlign:"center",cursor:"pointer",padding:"2px 2px"}}
              onClick={()=>onNav(st.nav, st.navCtx||{})}>
              <div style={{fontSize:14,marginBottom:4}}>{st.icon}</div>
              <div style={{fontSize:20,fontWeight:800,color:"#111827",letterSpacing:"-0.5px",lineHeight:1}}>
                {st.value}
              </div>
              <div style={{fontSize:9.5,fontWeight:700,color:st.color,marginTop:3,textTransform:"uppercase",letterSpacing:"0.3px"}}>
                {st.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── START ASSESSMENT CTA ── */}
        <div className="dc" style={{
          background:"linear-gradient(135deg,#8f63f0 0%,#bb6be3 52%,#e77fc0 100%)",
          borderRadius:20,padding:"20px",
          boxShadow:"0 4px 20px rgba(187,107,227,0.3)",
          animationDelay:"0.35s",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          cursor:"pointer",
        }} onClick={()=>onNav("clinical",{clinicalSubTab:"assessment"})}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.3px"}}>Start Assessment</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.9)",marginTop:3}}>
              Ortho, Neuro, Cardio. More soon
            </div>
          </div>
          <div style={{width:44,height:44,borderRadius:13,background:"rgba(255,255,255,0.2)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem"}}>→</div>
        </div>

        {/* ── AI ASSESSMENT CTA -- same entry point as Home's "AI Assessment"
            tile (OrthoAssessmentNew's AI intake, entryMode:"ai"). ── */}
        <div className="dc" style={{
          background:"white",borderRadius:20,padding:"20px",
          border:"1.5px solid #EDE9FE",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
          animationDelay:"0.4s",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          cursor:"pointer",
        }} onClick={()=>onStartAI ? onStartAI() : onNav("ortho_new_assessment",{entryMode:"ai"})}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>✨ AI Assessment</div>
            <div style={{fontSize:11,color:"#6B7280",marginTop:3}}>
              Say your assessment in your words and get it filled
            </div>
          </div>
          <div style={{width:44,height:44,borderRadius:13,background:"#F5F3FF",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",color:"#7C3AED"}}>→</div>
        </div>

        {/* Recent Patients / schedule list removed for now (Aditi: "remove
            schedule list for now we will add later"). The task-workflow
            engine, Patient Outcomes analytics, and their derived data were
            all cut entirely in the same pass, so re-adding a schedule list
            later means rebuilding its data (a simple sort/map over
            `patients`, same shape as before), not just un-hiding it. */}

      </div>
    </div>
  );
}


// ── Exports ──────────────────────────────────────────────────────────────────
export { HomeModule, TherapistDashboardModule, ClinicDetailsBanner };
