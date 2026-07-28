// generateDiagnosis.jsx — legacy clinical diagnosis generator
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes).
// Pure function of `data`; no external dependencies.

function generateDiagnosis(data) {
  const dx=[], redFlags=[];
  const v=id=>data[id]||"";
  const has=(id,val)=>(data[id]||"").includes(val);
  const isPos=id=>has(id,"Positive")||has(id,"positive");
  const isBilPos=id=>isPos(id+"_left")||isPos(id+"_right");
  const isInh=id=>has(id,"Inhibited")||has(id+"_left","Inhibited")||has(id+"_right","Inhibited");
  const weakMMT=id=>{const vals=[v(id+"_left"),v(id+"_right"),v(id)];return vals.some(s=>s.startsWith("4/5")||s.startsWith("3/5")||s.startsWith("2/5")||s.startsWith("1/5")||s.startsWith("0/5"));};

  ["s_red1","s_red2","s_red3","s_red4","s_red5","s_red6","s_red7"].forEach(id=>{
    if(has(id,"REFER")){const lbs={s_red1:"Unexplained weight loss",s_red2:"Night sweats/fever",s_red3:"History of cancer",s_red4:"Bilateral pins & needles",s_red5:"Bowel/bladder dysfunction",s_red6:"Saddle anaesthesia",s_red7:"Progressive neuro deficit"};redFlags.push({label:lbs[id]||id,severity:has(id,"URGENT")?"urgent":"refer"});}
  });
  if(isBilPos("st_sharp_purser")||has("st_sharp_purser","Positive"))redFlags.push({label:"Sharp-Purser positive — C1/C2 (atlantoaxial) instability. NO cervical manipulation/mobilisation. Urgent imaging + medical referral.",severity:"urgent"});
  if(isBilPos("st_vbi")||has("st_vbi","Positive"))redFlags.push({label:"VBI / vertebral artery test positive — NO cervical manipulation. Refer for vascular assessment.",severity:"urgent"});
  if(isBilPos("st_alar")||has("st_alar","Positive"))redFlags.push({label:"Alar ligament test positive — upper cervical instability. NO manipulation; urgent referral.",severity:"urgent"});
  if(has("n_ref_babinski_left","Positive")||has("n_ref_babinski_right","Positive"))redFlags.push({label:"Babinski positive — UMN lesion",severity:"urgent"});
  if(has("n_ref_hoffmann_left","Positive")||has("n_ref_hoffmann_right","Positive"))redFlags.push({label:"Hoffmann's sign positive — cervical myelopathy",severity:"urgent"});
  if(has("n_ref_clonus_left","Positive")||has("n_ref_clonus_right","Positive"))redFlags.push({label:"Sustained clonus — UMN lesion",severity:"urgent"});
  // Legacy Babinski (old neuro module field)
  if(has("n_babinski","Positive"))redFlags.push({label:"Babinski positive — UMN lesion",severity:"urgent"});
  // New red flag module fields
  if(data["nrf_cauda"]==="Present"||data["nq_bladder"]==="Yes"||data["nq_saddle"]==="Yes")redFlags.push({label:"Cauda Equina signs present — EMERGENCY",severity:"urgent"});
  if(data["nrf_myelopathy"]==="Present")redFlags.push({label:"Cord compression / myelopathy signs",severity:"urgent"});
  if(data["nq_bilateral_legs"]==="Yes")redFlags.push({label:"Bilateral leg neurological signs",severity:"urgent"});
  if(data["nq_bowel"]==="Yes")redFlags.push({label:"New onset bowel dysfunction — cauda equina screen",severity:"urgent"});

  // ─── NEW: Full Neurological Module Integration ─────────────────────────────
  // Collect all dermatomal, myotomal, reflex and neural tension findings
  const neuroLevelFindings={};
  const DERM_LEVELS=[
    {id:"n_c3",level:"C3",disc:"C2/3"},{id:"n_c4",level:"C4",disc:"C3/4"},
    {id:"n_c5",level:"C5",disc:"C4/5"},{id:"n_c6",level:"C6",disc:"C5/6"},
    {id:"n_c7",level:"C7",disc:"C6/7"},{id:"n_c8",level:"C8",disc:"C7/T1"},
    {id:"n_t1",level:"T1",disc:"T1/2"},
    {id:"n_l2",level:"L2",disc:"L2/3"},{id:"n_l3",level:"L3",disc:"L3/4"},
    {id:"n_l4",level:"L4",disc:"L4/5"},{id:"n_l5",level:"L5",disc:"L4/5"},
    {id:"n_s1",level:"S1",disc:"L5/S1"},{id:"n_s4s5",level:"S4/5",disc:"Cauda equina"},
  ];
  DERM_LEVELS.forEach(d=>{
    const lv=data[d.id+"_left"]||"",rv=data[d.id+"_right"]||"";
    if((lv&&lv!=="Normal")||(rv&&rv!=="Normal")){
      if(!neuroLevelFindings[d.level])neuroLevelFindings[d.level]={level:d.level,disc:d.disc,dermL:lv,dermR:rv,myoL:"",myoR:"",reflex:"",tension:""};
      else{neuroLevelFindings[d.level].dermL=lv;neuroLevelFindings[d.level].dermR=rv;}
    }
  });
  // Myotomes
  const MYO_MAP=[
    {safeId:"myo_c5",level:"C5"},{safeId:"myo_c6",level:"C6"},{safeId:"myo_c7",level:"C7"},
    {safeId:"myo_c8",level:"C8"},{safeId:"myo_l2_l3_",level:"L2"},{safeId:"myo_l3",level:"L3"},
    {safeId:"myo_l4",level:"L4"},{safeId:"myo_l5",level:"L5"},{safeId:"myo_s1",level:"S1"},
  ];
  // Match by safeId prefix (exact) — avoids L2/L3/L5 substring collisions
  Object.keys(data).filter(k=>k.startsWith("myo_")).forEach(k=>{
    const baseKey=k.replace(/_left$/,"").replace(/_right$/,"");
    const sv=data[k]||"";
    if(!sv||sv.startsWith("5"))return;
    // Find the level by exact safeId match (longest match wins to prevent l2 matching myo_l2_l3_)
    let matched=null;
    MYO_MAP.forEach(m=>{
      if(baseKey===m.safeId || baseKey===m.safeId.replace(/_$/,"")){
        if(!matched || m.safeId.length>matched.safeId.length) matched=m;
      }
    });
    if(matched){
      if(!neuroLevelFindings[matched.level])neuroLevelFindings[matched.level]={level:matched.level,disc:"",dermL:"",dermR:"",myoL:"",myoR:"",reflex:"",tension:""};
      if(k.endsWith("_left"))neuroLevelFindings[matched.level].myoL=sv;
      else neuroLevelFindings[matched.level].myoR=sv;
    }
  });
  // Neural tension
  ["nt_slr","nt_slump","nt_femoral"].forEach(id=>{
    const lv=data[id+"_left"]||"",rv=data[id+"_right"]||"";
    if(lv.includes("Positive")||rv.includes("Positive")){
      const levels=id==="nt_slr"||id==="nt_slump"?["L4","L5","S1"]:["L2","L3","L4"];
      levels.forEach(lvl=>{
        if(neuroLevelFindings[lvl])neuroLevelFindings[lvl].tension=id;
      });
    }
  });
  ["nt_ultt1","nt_ultt2","nt_ultt3"].forEach(id=>{
    const lv=data[id+"_left"]||"",rv=data[id+"_right"]||"";
    if(lv.includes("Positive")||rv.includes("Positive")){
      const levels=id==="nt_ultt1"?["C5","C6","C7"]:id==="nt_ultt2"?["C6","C7","C8"]:["C8","T1"];
      levels.forEach(lvl=>{
        if(neuroLevelFindings[lvl])neuroLevelFindings[lvl].tension=id;
      });
    }
  });

  const neuroLevels=Object.values(neuroLevelFindings);
  if(neuroLevels.length>0){
    const cervNeuro=neuroLevels.filter(n=>n.level.startsWith("C")||n.level.startsWith("T"));
    const lumbNeuro=neuroLevels.filter(n=>n.level.startsWith("L")||n.level.startsWith("S"));
    const isMultiLevel=neuroLevels.length>2;
    const hasCauda=neuroLevelFindings["S4/5"]&&(neuroLevelFindings["S4/5"].dermL||neuroLevelFindings["S4/5"].dermR);
    if(hasCauda){redFlags.push({label:"S4/5 dermatomal deficit — cauda equina EMERGENCY",severity:"urgent"});}
    if(cervNeuro.length>0){
      const level=cervNeuro[0].level;
      const evidence=[`Dermatomal loss: ${cervNeuro.map(n=>`${n.level}(L:${n.dermL||"–"}/R:${n.dermR||"–"})`).join(", ")}`,cervNeuro.some(n=>n.myoL||n.myoR)?`Myotomal weakness: ${cervNeuro.filter(n=>n.myoL||n.myoR).map(n=>n.level).join(", ")}`:null,cervNeuro.some(n=>n.tension)?`Neural tension: positive`:null].filter(Boolean);
      dx.push({system:"Structural",name:`Cervical Radiculopathy (${cervNeuro.map(n=>n.level).join("/")} )`,confidence:cervNeuro.length>1?"High":"Moderate",evidence,mechanism:`Nerve root compression at ${cervNeuro.map(n=>n.disc||n.level).join("/")} disc level causing dermatomal sensory loss and myotomal weakness.`,treatment:["Cervical neural mobilisation — nerve gliding techniques","Cervical traction (intermittent or sustained)","Deep neck flexor stabilisation program","Postural correction: chin tuck, scapular retraction","Imaging: MRI cervical spine if no improvement 6 weeks","Referral: neurology/neurosurgery if progressive deficit"]});
    }
    if(lumbNeuro.length>0&&!hasCauda){
      const evidence=[`Dermatomal loss: ${lumbNeuro.map(n=>`${n.level}(L:${n.dermL||"–"}/R:${n.dermR||"–"})`).join(", ")}`,lumbNeuro.some(n=>n.myoL||n.myoR)?`Myotomal weakness: ${lumbNeuro.filter(n=>n.myoL||n.myoR).map(n=>n.level).join(", ")}`:null,lumbNeuro.some(n=>n.tension)?`Positive neural tension tests`:null].filter(Boolean);
      const lv=lumbNeuro[0].level;
      dx.push({system:"Structural",name:`Lumbar Radiculopathy (${lumbNeuro.map(n=>n.level).join("/")} )`,confidence:lumbNeuro.length>1?"High":"Moderate",evidence,mechanism:`Disc herniation or foraminal stenosis compressing ${lumbNeuro.map(n=>n.level).join("/")} nerve root(s).`,treatment:["Lumbar neural mobilisation — sciatic nerve flossing","McKenzie extension exercises (if directional preference)","Core stabilisation: TA, multifidus activation","MRI lumbar spine if red flags or no improvement","Spinal injection referral if persistent >6 weeks","Neuro monitoring: recheck myotomes/reflexes 2-weekly"]});
    }
    if(isMultiLevel&&!hasCauda){dx.push({system:"Structural",name:"Multi-Level Neurological Involvement",confidence:"Moderate",evidence:[`Levels involved: ${neuroLevels.map(n=>n.level).join(", ")}`,neuroLevels.length>3?"3+ levels — consider central stenosis or myelopathy":null].filter(Boolean),mechanism:"Multi-level involvement suggests central canal stenosis, myelopathy, or systemic neuropathy rather than single-level disc herniation.",treatment:["Full spine MRI — rule out myelopathy and stenosis","Neurological referral","Avoid spinal manipulation until imaging reviewed","Neuromodulation: TENS, pain management referral"]});}
  }
  // UMN / myelopathy pattern from new reflex fields
  const umnSigns=[];
  if(has("n_ref_babinski_left","Positive")||has("n_ref_babinski_right","Positive"))umnSigns.push("Babinski positive");
  if(has("n_ref_hoffmann_left","Positive")||has("n_ref_hoffmann_right","Positive"))umnSigns.push("Hoffmann's positive");
  if(has("n_ref_clonus_left","Positive")||has("n_ref_clonus_right","Positive"))umnSigns.push("Ankle clonus present");
  if(has("n_ref_jaw_left","Positive")||has("n_ref_jaw_right","Positive"))umnSigns.push("Jaw jerk brisk");
  if(umnSigns.length>0){dx.push({system:"Structural",name:"Upper Motor Neuron / Myelopathy Pattern",confidence:"High",evidence:umnSigns,mechanism:"Pathological reflexes indicate UMN lesion above the segmental level. Possible cervical myelopathy, cord compression, or intracranial pathology.",treatment:["URGENT: No cervical manipulation","MRI cervical + thoracic spine immediately","Neurosurgical / neurological referral","Monitor gait, hand function, and bladder symptoms"]});}

  // CPA from all region tests
  const nktPairs=[];
  ["nkt_dnf","nkt_scm","nkt_suboccip","nkt_upper_trap","nkt_scalenes","nkt_levator_scap","nkt_splenius","nkt_semispinalis","nkt_lower_trap","nkt_serratus","nkt_infraspinatus","nkt_subscapularis","nkt_mid_trap","nkt_pec_minor","nkt_ant_deltoid","nkt_post_deltoid","nkt_teres_major","nkt_ta","nkt_multifidus","nkt_diaphragm","nkt_ql","nkt_psoas","nkt_erector_spinae","nkt_obliques","nkt_pelvic_floor","nkt_gmax","nkt_gmed","nkt_piriformis","nkt_hip_flex_fo","nkt_adductors","nkt_tfl","nkt_rectus_fem","nkt_vmo","nkt_hamstrings","nkt_popliteus","nkt_tib_ant","nkt_tib_post","nkt_gastroc","nkt_peroneals","nkt_fhl","nkt_foot_intrinsics","nkt_biceps","nkt_triceps","nkt_wrist_ext","nkt_wrist_flex","nkt_pronator","nkt_grip"].forEach(id=>{
    const val=v(id);
    if(!val||val.includes("Normal")||val.includes("Facilitated")||val.includes("fires first"))return;
    // Find the test to get label
    let testLabel=id.replace("nkt_","").replace(/_/g," ");
    Object.values(NKT_REGIONS).forEach(reg=>reg.tests.forEach(t=>{if(t.id===id)testLabel=t.label;}));
    nktPairs.push(`${testLabel}: ${val}`);
  });
  if(nktPairs.length>0){
    dx.push({system:"CPA",name:"Motor Control Dysfunction (CPA)",confidence:"High",
      evidence:nktPairs,
      mechanism:"The Motor Control Centre (MCC) has stored compensation patterns. Inhibited muscles are substituted by synergists, creating overactive muscles that perpetuate pain and dysfunction cycles.",
      treatment:["STEP 1 — INHIBIT: SMR/foam roll overactive muscles 90 sec (release compensation)","STEP 2 — ACTIVATE: Immediately activate inhibited muscles 3–5 reps within 30 seconds","STEP 3 — INTEGRATE: Functional movement reprogramming with correct motor patterns","STEP 4 — REPROGRAM: Daily home exercises to reinforce new MCC motor programs"]
    });
  }

  // STTT
  const cyriaxLesion=[];
  Object.keys(data).filter(k=>k.startsWith("cy_")&&data[k]).forEach(id=>{
    const val=data[id];
    if(val.includes("Strong & Painful"))cyriaxLesion.push({id,type:"minor",finding:`${id}: Strong & Painful = minor contractile lesion`});
    if(val.includes("Weak & Painful"))cyriaxLesion.push({id,type:"serious",finding:`${id}: Weak & Painful = serious lesion — imaging required`});
    if(val.includes("Weak & Painless"))cyriaxLesion.push({id,type:"neuro",finding:`${id}: Weak & Painless = neurological`});
  });
  const isCap=has("cy_capsular","Yes");
  if(cyriaxLesion.length>0||isCap){
    const serious=cyriaxLesion.filter(l=>l.type==="serious"),minor=cyriaxLesion.filter(l=>l.type==="minor"),neuro=cyriaxLesion.filter(l=>l.type==="neuro");
    dx.push({system:"STTT",name:`Tissue Lesion: ${serious.length>0?"Serious Contractile":minor.length>0?"Minor Contractile":isCap?"Inert (Capsular)":"Neurological"} Pathology`,confidence:serious.length>0?"High":minor.length>0?"High":"Moderate",
      evidence:[...minor.map(l=>l.finding),...serious.map(l=>"⚠️ "+l.finding),...neuro.map(l=>"⚡ "+l.finding),isCap?"Capsular pattern confirmed":null,has("cy_endfeel","Empty")?"Empty end-feel — serious pathology":null].filter(Boolean),
      mechanism:"STTT STTT systematically differentiates inert vs contractile tissue to identify the exact structure at fault.",
      treatment:minor.length>0?["Deep Transverse Friction Massage (DTFM) to exact lesion site","Eccentric loading program for tendinopathy","Relative rest — modify aggravating activities","Progressive loading when pain-free"]:serious.length>0?["Refer for MRI/ultrasound immediately","Protect structure — splinting/bracing","Surgical consultation if rupture confirmed"]:isCap?["Maitland Grade III–IV joint mobilisation","End-range stretching program","Heat before mobilisation, ice after","Corticosteroid injection referral if severe"]:[]
    });
  }

  // NOTE: the classic 7-movement FMS scoring (Deep Squat/Hurdle Step/
  // Inline Lunge/Shoulder Mob/ASLR/Trunk Stability Push-Up/Rotary Stability,
  // reading sp_fms_* flat fields) was removed here -- confirmed via a
  // full-repo search that sp_fms_* fields were never written by any
  // component. The real, working Functional Assessment is FunctionalScreenHub
  // (region-based screens storing grades in a JSON blob per region, e.g.
  // data.lfs_data), which this diagnosis engine does not score directly.

  // Posture
  const ucs=v("p_ucs"),lcs=v("p_lcs");
  if(ucs.includes("Moderate")||ucs.includes("Severe")){dx.push({system:"Posture",name:"Upper Crossed Syndrome",confidence:"High",evidence:[`UCS: ${ucs}`,v("p_forward_head")&&!v("p_forward_head").includes("Normal")?`Forward head: ${v("p_forward_head")}`:null].filter(Boolean),mechanism:"Overactive: upper trap, SCM, pec minor. Underactive: DNF, lower trap, serratus anterior, rhomboids.",treatment:["INHIBIT: Upper trap, SCM, pec minor SMR","ACTIVATE: DNF chin nods, lower trap Y-T-W, serratus push-up plus","Manual therapy: thoracic manipulation","Ergonomic correction: workstation, monitor height"]});}
  if(lcs.includes("Moderate")||lcs.includes("Severe")){dx.push({system:"Posture",name:"Lower Crossed Syndrome",confidence:"High",evidence:[`LCS: ${lcs}`,v("p_pelvic_tilt")&&!v("p_pelvic_tilt").includes("Neutral")?`Pelvic tilt: ${v("p_pelvic_tilt")}`:null].filter(Boolean),mechanism:"Overactive: hip flexors, thoracolumbar extensors, QL. Underactive: glute max, glute med, TA, RA.",treatment:["INHIBIT: Hip flexors, QL SMR","ACTIVATE: Glute bridges, clamshells, dead bug","STRETCH: Couch stretch, 90-90 hip flexor","Core stability: TA → bridges → functional"]});}

  // Kinetic Chain
  const adfL=parseFloat(data.rom_adf_left||""),adfR=parseFloat(data.rom_adf_right||"");
  const hirL=parseFloat(data.rom_hir_left||""),hirR=parseFloat(data.rom_hir_right||"");
  const trotL=parseFloat(data.rom_trotl||""),trotR=parseFloat(data.rom_trotr||"");
  const ankleL=(!isNaN(adfL)&&adfL<15)||(!isNaN(adfR)&&adfR<15),hipIR=(!isNaN(hirL)&&hirL<35)||(!isNaN(hirR)&&hirR<35),thorR=(!isNaN(trotL)&&trotL<35)||(!isNaN(trotR)&&trotR<35);
  if(ankleL||hipIR||thorR){dx.push({system:"Kinetic Chain",name:"Kinetic Chain Dysfunction",confidence:"High",evidence:[ankleL?`Ankle DF limited (${Math.min(isNaN(adfL)?99:adfL,isNaN(adfR)?99:adfR)}° < 15°) → knee valgus, foot pronation chain`:null,hipIR?`Hip IR limited (${Math.min(isNaN(hirL)?99:hirL,isNaN(hirR)?99:hirR)}° < 35°) → lumbar compensation`:null,thorR?`Thoracic rotation limited → lumbar overload, shoulder impingement`:null].filter(Boolean),mechanism:"Mobile joints losing mobility force adjacent stable joints into excess motion — pain appears at stable joint.",treatment:[ankleL?"Ankle DF: wall lunge drill, gastroc stretch, talocrural mobilisation":null,hipIR?"Hip mobility: 90-90 stretch, hip IR in prone, pigeon pose":null,thorR?"Thoracic mobility: foam roller extension, thoracic rotation with dowel":null,"Address mobility BEFORE adding stability load"].filter(Boolean)});}

  // Fascia
  const fascRest=[];
  if(has("sp_sbl","Significant"))fascRest.push("Superficial Back Line restricted");
  if(has("sp_sfl","Significant"))fascRest.push("Superficial Front Line restricted");
  if(has("sp_ll_left","Significant")||has("sp_ll_right","Significant"))fascRest.push("Lateral Line restricted");
  if(has("sp_spl_left","Significant")||has("sp_spl_right","Significant"))fascRest.push("Spiral Line restricted");
  if(data.sp_mftp&&data.sp_mftp.length>3)fascRest.push(`Active trigger points: ${data.sp_mftp}`);
  if(fascRest.length>0){dx.push({system:"Fascia",name:"Myofascial Restriction Pattern",confidence:"Moderate",evidence:fascRest,mechanism:"Fascial restrictions along meridians create distant pull — one restriction propagates tension along the entire fascial line.",treatment:["Myofascial release: slow sustained pressure 90–120 sec along restricted lines","Skin rolling along paraspinals","Foam rolling: target identified fascial lines","Patient education: sustained postures shorten lines — movement variety essential"]});}

  // Muscle activation
  const muscImb=[];
  if(weakMMT("m_gmax"))muscImb.push("Gluteus Maximus underactive — inhibited, poor hip extension");
  if(weakMMT("m_gmed"))muscImb.push("Gluteus Medius underactive — Trendelenburg risk");
  if(weakMMT("m_lt"))muscImb.push("Lower Trapezius underactive — scapular depression deficit");
  if(weakMMT("m_sa"))muscImb.push("Serratus Anterior underactive — winging risk");
  if(weakMMT("m_ta"))muscImb.push("Transversus Abdominis underactive — core instability");
  if(has("m_dnf","deficit")||has("m_dnf","Severe"))muscImb.push("Deep Neck Flexors deficit — cervicogenic pattern");
  if(muscImb.length>0){dx.push({system:"Muscle Activation",name:"Muscle Activation Imbalance",confidence:"High",evidence:muscImb,mechanism:"Underactive muscles fail to generate force → synergists dominate → joint compression and overuse.",treatment:["INHIBIT overactive synergists first (SMR 90s)","ISOLATED ACTIVATION: low-load, high-rep isolation",weakMMT("m_gmax")||weakMMT("m_gmed")?"Glute program: bridges → clamshells → hip thrusts":null,weakMMT("m_lt")||weakMMT("m_sa")?"Scapular program: Y-T-W → wall slides → push-up plus":null,"INTEGRATE: progress to multi-joint functional movements"].filter(Boolean)});}

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOULDER — Full diagnostic battery (Magee; Cleland, Netter's; Kendall)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Helper: empty/full can weakness (tear pattern) ────────────────────────
  const emptyCan_weak  = isBilPos("st_empty_can") && (has("st_empty_can_left","weak")||has("st_empty_can_right","weak")||has("st_empty_can","weak"));
  const emptyCan_pain  = isBilPos("st_empty_can") && !emptyCan_weak;
  const fullCan_weak   = isBilPos("st_full_can") && (has("st_full_can_left","weak")||has("st_full_can_right","weak")||has("st_full_can","weak"));
  const hawkinsPos     = isBilPos("st_hawkins");
  const neerPos        = isBilPos("st_neer");
  const impingementTests = [neerPos, hawkinsPos, (emptyCan_pain||emptyCan_weak)].filter(Boolean).length;

  // ── 1. Subacromial Impingement Syndrome — Magee; Park et al.; Netter's ────
  // Clinical rule: ≥2 of Neer/Hawkins/painful arc (Cleland). Empty can adds specificity.
  if(impingementTests >= 2){
    dx.push({system:"Structural",name:"Subacromial Impingement Syndrome",confidence:impingementTests>=3?"High":"Moderate",
      evidence:[neerPos?"Neer's positive (sens 0.72, spec 0.66)":null,hawkinsPos?"Hawkins-Kennedy positive (sens 0.79, spec 0.59)":null,(emptyCan_pain||emptyCan_weak)?"Empty can positive":null,`${impingementTests}/3 impingement tests positive — ≥2 is sufficient (Park et al.; Cleland, Netter's)`].filter(Boolean),
      mechanism:"Supraspinatus/bursa compressed under coracoacromial arch, exacerbated by poor scapular kinematics and thoracic kyphosis. Hawkins-Kennedy is most sensitive for screening; Neer's adds specificity. (Magee, Orthopedic Physical Assessment)",
      treatment:["Rotator cuff ER/IR progressive strengthening (theraband → dumbbell)","Scapular stability: serratus anterior, lower/mid trapezius","Thoracic extension and rotation mobility","Posterior capsule stretch (sleeper stretch)","Avoid overhead reaching in early rehab — progressive reloading"]});
  }

  // ── 2. Rotator Cuff Tear (supraspinatus) — Magee; Netter's ───────────────
  // Weakness on resisted testing distinguishes tear from tendinopathy
  if(emptyCan_weak || fullCan_weak){
    dx.push({system:"Structural",name:"Supraspinatus Rotator Cuff Tear (Partial or Complete)",confidence:(emptyCan_weak&&fullCan_weak)?"High":"Moderate",
      evidence:[emptyCan_weak?"Empty can — weakness (partial/complete tear)":null,fullCan_weak?"Full can — weakness":null,"Weakness on empty/full can = supraspinatus structural failure; painful + weak = more likely complete or large partial tear (Magee)"].filter(Boolean),
      mechanism:"Tendinous failure of supraspinatus, typically at the 'critical zone' 1cm proximal to the greater tuberosity insertion. Weakness without pain may indicate complete tear with retraction.",
      treatment:["Urgent orthopaedic referral + MRI — confirm tear size and surgical candidacy","If conservative: pain-free range isometrics progressing to resisted ER/IR","Rotator cuff interval and posterior capsule mobilisation","Deltoid strengthening (compensatory) during recovery","Avoid overhead loading until MRI-guided plan confirmed"]});
  }

  // ── 3. Subscapularis tear — Magee; Netter's ──────────────────────────────
  const liftOffPos   = isBilPos("st_lift_off") && (has("st_lift_off_left","cannot")||has("st_lift_off_right","cannot")||has("st_lift_off","cannot"));
  const liftOffWeak  = isBilPos("st_lift_off") && (has("st_lift_off_left","weakness")||has("st_lift_off_right","weakness")||has("st_lift_off","weakness"));
  const bearHugPos   = isBilPos("st_bear_hug");
  const bellyPressPos= isBilPos("st_belly_press");
  if(liftOffPos || (liftOffWeak && bearHugPos) || (liftOffWeak && bellyPressPos)){
    const conf = liftOffPos?"High":"Moderate";
    dx.push({system:"Structural",name:"Subscapularis Tear (Medial Rotator Cuff)",confidence:conf,
      evidence:[liftOffPos?"Lift-off test — cannot lift off (full thickness tear)":null,liftOffWeak?"Lift-off weakness (partial tear)":null,bearHugPos?"Bear hug positive — upper subscapularis deficit":null,bellyPressPos?"Belly press positive — wrist flexion compensation":null,"Cluster of lift-off + belly press + bear hug: high specificity for subscapularis tear (Magee; Gerber)"].filter(Boolean),
      mechanism:"Subscapularis is the largest and strongest rotator cuff muscle (IR). Tear usually from anterior dislocation or forced ER. Lift-off tests the lower fibres; bear hug tests upper fibres.",
      treatment:["Orthopaedic referral + MRI urgently if cannot lift off","If partial: progressive IR strengthening (internal rotation with ER control)","Pectoralis minor stretching (commonly overactive)","Avoid forced external rotation in early stages"]});
  }

  // ── 4. SLAP Lesion — O'Brien; Magee; Netter's ────────────────────────────
  const obrienSLAP = has("st_obrien_left","SLAP")||has("st_obrien_right","SLAP")||has("st_obrien","SLAP")||has("st_obrien_left","Both")||has("st_obrien_right","Both")||has("st_obrien","Both");
  const speedsPos  = isBilPos("st_speeds");
  if(obrienSLAP || (speedsPos && obrienSLAP)){
    dx.push({system:"Structural",name:"SLAP Lesion (Superior Labrum Anterior-Posterior)",confidence:obrienSLAP&&speedsPos?"High":"Moderate",
      evidence:[obrienSLAP?"O'Brien's positive — pain with IR resolves with ER (SLAP pattern)":null,speedsPos?"Speed's positive — bicipital groove pain":null,"O'Brien's for SLAP: sens ~0.63, spec ~0.73; specificity improves when combined with Speed's (Magee; Cleland, Netter's)"].filter(Boolean),
      mechanism:"Superior labral tear at the biceps anchor (2–10 o'clock). Common in overhead athletes and after traction/fall-on-outstretched-hand. O'Brien's stresses the biceps anchor in IR.",
      treatment:["Avoid overhead loading and provocative positions initially","Rotator cuff and scapular stabiliser strengthening — reduce biceps anchor load","Orthopaedic referral + MRI arthrogram if symptoms persist >6 weeks","Young overhead athletes: lower threshold for surgical referral (type II SLAP)"]});
  }

  // ── 5. AC Joint Pathology — Magee; Netter's ──────────────────────────────
  const crossArmPos  = isBilPos("st_cross_arm");
  const obrienAC     = has("st_obrien_left","AC")||has("st_obrien_right","AC")||has("st_obrien","AC")||has("st_obrien_left","Both")||has("st_obrien_right","Both")||has("st_obrien","Both");
  if(crossArmPos || obrienAC){
    dx.push({system:"Structural",name:"Acromioclavicular (AC) Joint Pathology",confidence:(crossArmPos&&obrienAC)?"High":"Moderate",
      evidence:[crossArmPos?"Cross-arm adduction positive — AC joint pain":null,obrienAC?"O'Brien's positive — pain at top of shoulder (AC pattern)":null,"Cross-arm + O'Brien's AC cluster: specificity ~0.79 for AC pathology (Magee; Netter's)"].filter(Boolean),
      mechanism:"AC joint OA, sprain (Rockwood Grade I–III), or distal clavicle osteolysis. Cross-arm adduction compresses the AC joint; O'Brien's AC-pattern produces superior shoulder pain.",
      treatment:["AC joint mobilisation (Grade I–II): inferior glide","Clavicle bracing / sling if acute Grade II–III sprain","AC joint injection if refractory","Grade III rupture: orthopaedic referral for surgical consideration","Scapular stabilisation to reduce AC joint load"]});
  }

  // ── 6. Anterior GH Instability / Bankart — Magee; Netter's ──────────────
  const apprehensionPos = isBilPos("st_apprehension") && (has("st_apprehension_left","apprehension")||has("st_apprehension_right","apprehension")||has("st_apprehension","apprehension"));
  const relocationPos   = isBilPos("st_relocation");
  if(apprehensionPos || (isBilPos("st_apprehension") && relocationPos)){
    dx.push({system:"Structural",name:"Anterior Glenohumeral Instability (Bankart / Labral Tear)",confidence:(apprehensionPos&&relocationPos)?"High":"Moderate",
      evidence:[apprehensionPos?"Apprehension test positive — patient guards against ER/abd":null,relocationPos?"Relocation test positive — apprehension relieves with posterior pressure":null,"Apprehension + relocation: LR+ ≈ 5.0 for anterior instability (Magee; Lo et al.; Netter's)"].filter(Boolean),
      mechanism:"Anterior labral tear (Bankart) ± Hill-Sachs lesion from anterior GH dislocation. Apprehension reflects patient's fear of re-dislocation in the provocative position (90° abd + ER).",
      treatment:["Acute: immobilise 2–4 weeks in ER (reduces recurrence), then progressive rehab","Rotator cuff (ER emphasis) and scapular stability strengthening","Proprioceptive training in functional positions","Orthopaedic referral — young athletes: earlier surgical (Bankart repair) given high recurrence rate","Older/low-demand patients: conservative acceptable"]});
  }

  // ── 7. Multidirectional Instability (MDI) — Magee; Netter's ─────────────
  const sulcusGrade2 = has("st_sulcus_left","Grade 2")||has("st_sulcus_right","Grade 2")||has("st_sulcus_left","Grade 3")||has("st_sulcus_right","Grade 3")||has("st_sulcus","Grade 2")||has("st_sulcus","Grade 3");
  if(sulcusGrade2){
    dx.push({system:"Structural",name:"Multidirectional Glenohumeral Instability (MDI)",confidence:"Moderate",
      evidence:["Sulcus sign Grade 2–3 (>1cm inferior translation)","MDI defined by symptomatic instability in ≥2 directions; sulcus sign often bilateral (Magee; Neer & Foster)"],
      mechanism:"Inferior capsule laxity allows inferior subluxation (sulcus sign). In MDI, the rotator interval capsule is incompetent. Often in young hypermobile females or overhead athletes.",
      treatment:["Dynamic stabiliser strengthening program — 12+ weeks minimum","Rotator cuff: emphasis on ER and IR co-contraction","Scapular stabilisers: serratus anterior, lower trap","Proprioception: perturbation training in vulnerable positions","Surgical (capsular plication/shift) only after failed 6-month conservative trial"]});
  }

  // ── 8. Biceps LH Tendinopathy / Subluxation — Magee ─────────────────────
  const yergasonPos  = isBilPos("st_yergason");
  const yergSubl     = has("st_yergason_left","subluxes")||has("st_yergason_right","subluxes")||has("st_yergason","subluxes");
  if(speedsPos || yergasonPos){
    dx.push({system:"Structural",name:yergSubl?"Biceps LH Tendon Subluxation":"Biceps Long Head Tendinopathy",confidence:(speedsPos&&yergasonPos)?"High":"Moderate",
      evidence:[speedsPos?"Speed's positive — bicipital groove pain":null,yergasonPos?"Yergason's positive":null,yergSubl?"Tendon subluxes from groove on Yergason's — transverse humeral ligament rupture":null,"Speed's: sens ~0.38, spec ~0.84 for biceps pathology; Yergason's adds bicipital groove specificity (Magee)"].filter(Boolean),
      mechanism:yergSubl?"Transverse humeral ligament rupture allows biceps tendon to sublux medially on forearm supination (Yergason's). Requires urgent orthopaedic review.":"Biceps LH tendinopathy from overuse or secondary to rotator cuff pathology compressing the tendon in the groove. Often coexists with SLAP.",
      treatment:yergSubl?["Urgent orthopaedic referral — surgical repair/tenodesis indicated for subluxation","Avoid supination resistance loading until assessed"]:["Bicipital groove friction massage and ultrasound","Eccentric biceps loading (slowly lower resisted curl)","Address coexisting impingement/SLAP if present","Shoulder ER and scapular stabiliser strengthening"]});
  }

  // ── 9. Adhesive Capsulitis (Frozen Shoulder) — Magee; Netter's ───────────
  // Classical: global passive ROM loss; ER most restricted, then Abd, then IR (capsular pattern)
  const shER_l=parseFloat(data.rom_sh_er_left||""), shER_r=parseFloat(data.rom_sh_er_right||"");
  const shAbd_l=parseFloat(data.rom_sh_abd_left||""), shAbd_r=parseFloat(data.rom_sh_abd_right||"");
  const shFlex_l=parseFloat(data.rom_sh_flex_left||""), shFlex_r=parseFloat(data.rom_sh_flex_right||"");
  const erRestricted = (!isNaN(shER_l)&&shER_l<40)||(!isNaN(shER_r)&&shER_r<40);
  const abdRestricted= (!isNaN(shAbd_l)&&shAbd_l<100)||(!isNaN(shAbd_r)&&shAbd_r<100);
  const flexRestricted=(!isNaN(shFlex_l)&&shFlex_l<120)||(!isNaN(shFlex_r)&&shFlex_r<120);
  const capsularPattern= erRestricted && abdRestricted && flexRestricted;
  if(capsularPattern){
    dx.push({system:"Structural",name:"Adhesive Capsulitis (Frozen Shoulder)",confidence:"High",
      evidence:[erRestricted?`ER restricted (<40°): L ${isNaN(shER_l)?"NT":shER_l+"°"} / R ${isNaN(shER_r)?"NT":shER_r+"°"}`:null,abdRestricted?`Abduction restricted (<100°): L ${isNaN(shAbd_l)?"NT":shAbd_l+"°"} / R ${isNaN(shAbd_r)?"NT":shAbd_r+"°"}`:null,flexRestricted?"Flexion restricted (<120°)":null,"STTT capsular pattern: ER > Abd > IR loss — pathognomonic for GH capsular fibrosis (Magee; STTT)"].filter(Boolean),
      mechanism:"Fibrosis and contracture of the GH joint capsule (especially the axillary pouch and rotator interval). Insidious onset; 3 phases: painful/freezing → frozen → thawing. Duration 1–3 years without treatment.",
      treatment:["Patient education: natural history (1–3 years), reassurance","Corticosteroid injection (most evidence in freezing phase) — reduces pain, may shorten duration","Capsular stretching: end-range ER, Abd, IR stretching with warmth first","GH inferior and posterior capsule mobilisation (Grade III–IV Maitland when pain allows)","MUA or hydrodilatation if failed conservative treatment >3–6 months","Treat underlying cause: diabetes, thyroid (strong associations)"]});
  }

  // ── 10. Calcific Tendinopathy ─────────────────────────────────────────────
  // Usually severe acute pain + impingement tests positive in middle-aged patient
  // No specific test — but if impingement present + acute severe pain + age 35-60, flag it
  if(impingementTests>=1){
    const painScore=parseInt(data.hp_pain_now||data.s_pain||"0");
    const patAge=parseInt(data.dem_age||"0");
    if(painScore>=7 && patAge>=35 && patAge<=65){
      dx.push({system:"Structural",name:"Consider Calcific Tendinopathy (Rule Out)",confidence:"Low",
        evidence:["Severe acute-onset shoulder pain + impingement pattern in typical age group (35–65)",`Pain score ${painScore}/10`,`Age ${patAge}`,"No pathognomonic clinical test — confirm with X-ray (plain film AP views) or ultrasound (Magee; Speed)"],
        mechanism:"Calcium hydroxyapatite crystal deposition in the supraspinatus tendon. Acute phase (crystal resorption) produces intense pain. Can coexist with impingement.",
        treatment:["Plain AP X-ray (3 views) or shoulder ultrasound for confirmation","Acute: analgesia + short course NSAIDs, ice, activity modification","Needling/barbotage (ultrasound-guided) — high evidence for pain relief and resorption","Shockwave therapy — strong evidence if barbotage not available","Avoid corticosteroid injection during acute resorptive phase (may slow healing)"]});
    }
  }
  if(isBilPos("st_lachmans")||isBilPos("st_anterior_drawer")){dx.push({system:"Structural",name:"ACL Insufficiency",confidence:"High",evidence:[isBilPos("st_lachmans")?`Lachman's positive: ${v("st_lachmans_left")||v("st_lachmans_right")}`:null,isBilPos("st_anterior_drawer")?"Anterior drawer positive":null,"Lachman's is the most sensitive (~0.85) and specific clinical test for ACL rupture (Magee; Cleland, Netter's)"].filter(Boolean),mechanism:"ACL insufficient — anterior tibial translation unchecked. Lachman's outperforms anterior drawer because it avoids hamstring guarding and meniscal wedging.",treatment:["Refer orthopaedic — MRI confirmation","Quadriceps activation (avoid open-chain terminal extension early)","Hamstring/glute co-contraction strengthening","Proprioception: single-leg balance progression"]});}
  if(isBilPos("st_mcmurray_test")||isBilPos("st_thessaly")){
    const medMen=has("st_mcmurray_test_left","medial")||has("st_mcmurray_test_right","medial")||has("st_thessaly_left","medial")||has("st_thessaly_right","medial");
    const latMen=has("st_mcmurray_test_left","lateral")||has("st_mcmurray_test_right","lateral")||has("st_thessaly_left","lateral")||has("st_thessaly_right","lateral");
    const side=medMen&&latMen?"Medial + Lateral":medMen?"Medial":latMen?"Lateral":"Meniscal";
    dx.push({system:"Structural",name:`${side} Meniscal Pathology`,confidence:isBilPos("st_apley")?"High":"Moderate",
      evidence:[isBilPos("st_mcmurray_test")?"McMurray's positive":null,isBilPos("st_thessaly")?"Thessaly positive":null,isBilPos("st_apley")?"Apley compression positive":null,medMen?"Medial joint line — medial meniscus":null,latMen?"Lateral joint line — lateral meniscus":null,"Thessaly at 20° sens ~0.66, spec ~0.95; McMurray's with audible click is highly specific (Magee; Netter's)"].filter(Boolean),
      mechanism:"Meniscal tear — compressive and rotational loading provocative. McMurray's stresses the meniscus via valgus/varus + rotation; Thessaly is closer to functional load.",
      treatment:["Avoid deep knee flexion and pivoting acutely","Quadriceps and hamstring co-contraction strengthening","MRI referral if mechanical locking/giving way or failed conservative care at 6 weeks","Load management and graded return to sport"]});
  }

  // ── PCL tear — Magee; Netter's ───────────────────────────────────────────
  if(isBilPos("st_posterior_drawer")){
    dx.push({system:"Structural",name:"PCL Insufficiency (Posterior Cruciate Ligament)",confidence:"High",
      evidence:["Posterior drawer positive — posterior tibial sag or translation","Posterior drawer for PCL: sens ~0.90, spec ~0.99 (Magee; Cleland, Netter's)"],
      mechanism:"PCL restrains posterior tibial translation. Typically injured by direct blow to anterior tibia (dashboard), or forced hyperflexion/hyperextension.",
      treatment:["MRI to confirm and grade (I–III)","Grade I–II: conservative — quadriceps strengthening (PCL unloads in extension), progressive loading","Grade III + instability: orthopaedic referral for surgical assessment","Avoid posterior tibial force (resisted knee flexion early)","Proprioception and functional rehabilitation"]});
  }

  // ── PFPS / Chondromalacia patellae — Magee; Netter's ─────────────────────
  const clarkes=isBilPos("st_clarkes");
  const patelGrind=isBilPos("st_patellar_grind");
  const patelEffusion=isPos("st_effusion")||isBilPos("st_effusion");
  if(clarkes||patelGrind){
    const chondro=patelGrind&&(has("st_patellar_grind_left","crepitus")||has("st_patellar_grind_right","crepitus")||has("st_patellar_grind","crepitus"));
    dx.push({system:"Structural",name:chondro?"Chondromalacia Patellae":"Patellofemoral Pain Syndrome (PFPS)",confidence:(clarkes&&patelGrind)?"High":"Moderate",
      evidence:[clarkes?"Clarke's test positive (patellofemoral compression pain)":null,patelGrind?"Patellar grind positive":null,chondro?"Crepitus on grind — articular cartilage involvement (chondromalacia)":null,"Clarke's: high sensitivity for PFPS screening; crepitus raises chondromalacia probability (Magee; Netter's)"].filter(Boolean),
      mechanism:"Increased patellofemoral joint reaction force from lateral patellar maltracking, VMO inhibition, and/or excessive foot pronation. Crepitus indicates articular cartilage softening/fibrillation.",
      treatment:["VMO activation: terminal knee extensions, step-downs","Hip abductor + ER strengthening (reduces dynamic valgus)","Patellar taping (McConnell) for immediate pain relief","Foot orthoses if excessive pronation","Avoid aggravating: deep squats, stairs, prolonged sitting ('cinema sign')","Quadriceps stretching and ITB/TFL release"]});
  }

  // ── IT Band Syndrome — Magee; Noble; Fredericson ─────────────────────────
  const noblePos=isBilPos("st_noble");
  const oberPos=isBilPos("st_ober_test");
  if(noblePos){
    dx.push({system:"Structural",name:"Iliotibial Band Syndrome (ITBS / Runner's Knee)",confidence:oberPos?"High":"Moderate",
      evidence:[noblePos?"Noble compression test positive — lateral epicondyle tenderness at 30°":null,oberPos?"Ober's test positive — ITB/TFL tightness":null,"Noble test: high specificity for ITBS; lateral knee pain at 30° flexion on compression is pathognomonic (Noble; Magee)"].filter(Boolean),
      mechanism:"ITB compresses the lateral epicondyle fat pad during repetitive knee flexion-extension (30° = impingement zone). TFL overactivity, hip abductor weakness, and forefoot strike pattern are contributing factors.",
      treatment:["Load management: reduce running volume 50% acutely","Hip abductor/glute med strengthening (Fredericson protocol — strong evidence)","TFL and lateral quad foam rolling/stretching","Running biomechanics analysis: increase cadence, reduce crossover step","Avoid direct ITB stretching acutely (increases compression)","Corticosteroid injection at lateral epicondyle if failed 6 weeks conservative"]});
  }

  // ── MCL / LCL Sprain — Magee; Netter's ──────────────────────────────────
  const valgusKnee=isBilPos("st_valgus_stress_knee");
  const varusKnee=isBilPos("st_varus_stress_knee");
  if(valgusKnee){
    const grade=has("st_valgus_stress_knee_left","Grade 3")||has("st_valgus_stress_knee_right","Grade 3")||has("st_valgus_stress_knee","Grade 3")?"Grade III (complete)":has("st_valgus_stress_knee_left","Grade 2")||has("st_valgus_stress_knee_right","Grade 2")||has("st_valgus_stress_knee","Grade 2")?"Grade II (partial)":"Grade I (sprain)";
    dx.push({system:"Structural",name:`MCL Sprain — ${grade}`,confidence:"High",
      evidence:["Valgus stress test positive — medial joint opening",`${grade}`,`Grade I (<5mm): isolated sprain. Grade II (5–10mm): partial. Grade III (>10mm, no end-point): complete rupture (Magee)`],
      mechanism:"Valgus force tears MCL from femoral attachment. Grade III may involve posteromedial capsule and ACL co-injury ('unhappy triad' pattern with lateral contact mechanism).",
      treatment:[grade.includes("III")?"Orthopaedic referral — rule out concomitant ACL/PCL injury (MRI)":"Conservative management","Hinged brace: Grade II 2–4 weeks, Grade III 4–6 weeks","Quadriceps and hamstring strengthening from day 1","Valgus control: hip abductor and ER strengthening","Progressive return to sport with functional testing (single-leg hop)"]});
  }
  if(varusKnee){
    dx.push({system:"Structural",name:"LCL / Posterolateral Corner Sprain",confidence:"High",
      evidence:["Varus stress test positive — lateral joint pain/opening","LCL injuries often involve posterolateral corner structures (popliteus, popliteofibular ligament) — pure isolated LCL tears are rare (Magee; Netter's)"],
      mechanism:"Varus force ± tibial IR injures LCL and posterolateral corner. High energy mechanism — always check for concurrent peroneal nerve injury (foot drop).",
      treatment:["MRI — assess posterolateral corner structures","Check peroneal nerve function (dorsiflexion, EHL)","Grade I–II: conservative with bracing and progressive loading","Grade III or PLC involvement: orthopaedic referral — higher failure rate with conservative management"]});
  }

  // ── Lateral Epicondylalgia (Tennis Elbow) — Magee; Coombes; Netter's ─────
  const cozens=isBilPos("st_cozens");
  const mills=isBilPos("st_mills");
  if(cozens||mills){
    dx.push({system:"Structural",name:"Lateral Epicondylalgia (Tennis Elbow / ECRB Tendinopathy)",confidence:(cozens&&mills)?"High":"Moderate",
      evidence:[cozens?"Cozen's test positive — lateral epicondyle pain on resisted wrist extension":null,mills?"Mill's test positive — pain on passive wrist flex + elbow extension":null,"Cozen's sens ~0.84; Mill's adds specificity by passively loading the tendon (Magee; Netter's). Pathology is ECRB tendinosis (not tendinitis) — degenerative, not inflammatory."].filter(Boolean),
      mechanism:"Extensor carpi radialis brevis (ECRB) tendinopathy from repetitive wrist extension loading. Degenerative (tendinosis) histology — collagen disarray, angiofibroblastic proliferation. Not primarily inflammatory.",
      treatment:["Eccentric/isometric wrist extension loading (Coombes protocol — strong RCT evidence)","Pain-free grip strengthening progression","Counterforce brace (epicondyle strap) for symptom management","Assess workstation ergonomics and tool handle size","Avoid corticosteroid injection beyond 6 weeks (worse long-term outcomes vs wait-and-see — Coombes et al.)","Dry needling or PRP if chronic tendinosis >3 months"]});
  }

  // ── Medial Epicondylalgia (Golfer's Elbow) — Magee; Netter's ─────────────
  const golfersPos=isBilPos("st_golfers");
  if(golfersPos){
    dx.push({system:"Structural",name:"Medial Epicondylalgia (Golfer's Elbow / FCU-PT Tendinopathy)",confidence:"High",
      evidence:["Golfer's test positive — medial epicondyle pain on resisted wrist flexion/pronation","Medial epicondylalgia: FCU and pronator teres tendinosis (Magee). Always check UCL and cubital tunnel simultaneously."],
      mechanism:"Flexor-pronator mass (primarily FCU, pronator teres) overload at medial epicondyle. Common in overhead throwers, golfers, manual workers. Check for concurrent UCL insufficiency in throwing athletes.",
      treatment:["Eccentric wrist flexion and forearm pronation loading","Cervical screen — medial epicondylalgia can be referred from C6/C7","Assess throwing mechanics if sport-related","UCL stress test if throwing athlete (valgus stress, milking manoeuvre)","Treat coexisting cubital tunnel syndrome if tingling present"]});
  }

  // ── Cubital Tunnel Syndrome (Ulnar Nerve) — Magee; Netter's ─────────────
  const tinelElbow=isBilPos("st_tinel_elbow");
  if(tinelElbow){
    dx.push({system:"Structural",name:"Cubital Tunnel Syndrome (Ulnar Nerve Entrapment)",confidence:"Moderate",
      evidence:["Tinel's at cubital tunnel positive — ulnar tingling (ring + little finger)","Tinel's at elbow: sens ~0.70 for cubital tunnel (Magee). Confirm with elbow flexion test (>60 sec sustained elbow flexion reproduces symptoms)."],
      mechanism:"Ulnar nerve compressed/stretched at the medial epicondyle groove or between the two heads of FCU. Provoked by prolonged elbow flexion (increases tunnel pressure ×6). Ring and little finger paraesthesia ± grip weakness (intrinsics).",
      treatment:["Night splinting in elbow extension (20–30°) — reduces sustained flexion compression","Ulnar nerve gliding/mobilisation exercises","Avoid prolonged elbow flexion and elbow resting on hard surfaces","Nerve conduction study if persistent/progressive","Orthopaedic referral if intrinsic wasting or failed conservative care 3 months"]});
  }

  // ── Carpal Tunnel Syndrome — Magee; Phalen; Netter's ─────────────────────
  const phalenPos=isBilPos("st_phalen");
  const tinelWrist=isBilPos("st_tinel_wrist");
  if(phalenPos||tinelWrist){
    const severity=has("st_phalen_left","30 seconds")||has("st_phalen_right","30 seconds")||has("st_phalen","30 seconds")?"Severe":has("st_phalen_left","60 seconds")||has("st_phalen_right","60 seconds")||has("st_phalen","60 seconds")?"Moderate":"Mild";
    dx.push({system:"Structural",name:`Carpal Tunnel Syndrome (${severity})`,confidence:(phalenPos&&tinelWrist)?"High":"Moderate",
      evidence:[phalenPos?`Phalen's positive (<${severity==="Severe"?"30":"60"} seconds) — carpal tunnel compression`:null,tinelWrist?"Tinel's at carpal tunnel positive — median nerve tingling":null,"Phalen's sens ~0.68, spec ~0.73; combined with Tinel's LR+ ≈ 3.8 for CTS (Magee; Netter's). Bilateral positive = systemic cause (thyroid, diabetes, pregnancy) — investigate."].filter(Boolean),
      mechanism:"Median nerve compressed within the carpal tunnel, typically from flexor tendon tenosynovitis, fluid retention, or structural narrowing. Symptoms: thumb, index, middle, radial half of ring finger paraesthesia ± weakness of thenar muscles.",
      treatment:["Neutral-position wrist splinting at night (strong evidence)","Nerve and tendon gliding exercises","Address systemic causes: thyroid, glucose, BMI, pregnancy","Corticosteroid injection for moderate-severe: effective short-term (3–6 months)","Surgical decompression if thenar wasting, EMG-confirmed moderate-severe, or failed conservative care 3 months","Ergonomic assessment: keyboard, mouse, tool vibration"]});
  }

  // ── De Quervain's Tenosynovitis — Magee; Finkelstein ────────────────────
  const finkelPos=isBilPos("st_finkelstein");
  if(finkelPos){
    dx.push({system:"Structural",name:"De Quervain's Tenosynovitis (APL / EPB)",confidence:"High",
      evidence:["Finkelstein's test positive — radial styloid pain on ulnar deviation with thumb in fist","Finkelstein's is highly sensitive and specific for De Quervain's when reproducing radial styloid pain (Magee)"],
      mechanism:"Stenosing tenosynovitis of APL and EPB tendons in the first dorsal compartment. Common in new mothers (repetitive infant lifting), racquet sports, and repetitive thumb use.",
      treatment:["Thumb spica splint (3–6 weeks) immobilising CMC and IP joint","Activity modification — avoid repetitive thumb pinch/grip","Corticosteroid injection into first compartment: high success rate (80–90%) — first-line if >3 weeks duration","Eccentric loading of APL/EPB if failed injection at 3 months","Surgical decompression (first compartment release) if failed 2 injections + 6 months conservative"]});
  }

  // ── Scapholunate Instability — Watson; Magee; Netter's ───────────────────
  const watsonPos=isBilPos("st_watson");
  if(watsonPos){
    const clunk=has("st_watson_left","clunk")||has("st_watson_right","clunk")||has("st_watson","clunk");
    dx.push({system:"Structural",name:clunk?"Scapholunate Dissociation (Instability)":"Suspected Scapholunate Pathology",confidence:clunk?"High":"Moderate",
      evidence:[clunk?"Watson's test: scaphoid clunk — SL ligament rupture":null,!clunk?"Watson's test: dorsal pain without clunk — SL ligament sprain or partial tear":null,"Watson's clunk: specific for SL dissociation (Magee; Netter's). Clunk = scaphoid subluxes dorsally. Confirm with X-ray (Terry-Thomas sign: SL gap >3mm) or MR arthrogram."].filter(Boolean),
      mechanism:"Scapholunate ligament failure allows dorsal intercalated segment instability (DISI). Fall on outstretched hand (FOOSH) is the typical mechanism. Clunk indicates complete SL ligament rupture with scaphoid subluxation.",
      treatment:[clunk?"Urgent hand surgery referral — complete SL rupture requires surgical repair":"Hand therapy referral + orthopaedic review","Wrist immobilisation in neutral during acute phase","X-ray with weight-bearing (clenched fist): Terry-Thomas gap","MR arthrogram for definitive ligament assessment","Early surgical repair (within 3 months) has best outcomes for complete rupture"]});
  }

  // ── Lumbar Facet Syndrome — Kemp; Magee; Netter's ────────────────────────
  const kempPos=isBilPos("st_kemp");
  if(kempPos&&!has("st_kemp_left","radicular")&&!has("st_kemp_right","radicular")&&!has("st_kemp","radicular")){
    dx.push({system:"Structural",name:"Lumbar Facet Joint Syndrome",confidence:"Moderate",
      evidence:["Kemp's test positive — local LBP (non-radicular pattern)","Kemp's: extension + rotation + side-flex compresses the ipsilateral facet joint. Local pain without leg radiation = facet vs radicular (Magee; Netter's). Single test has limited LR — use with clinical pattern."],
      mechanism:"Facet (zygapophyseal) joint articular pain — typically worse in extension, rotation, and morning, easing with flexion and movement. L4/5 and L5/S1 most common levels.",
      treatment:["Lumbar mobilisation: PA glides at identified levels (Maitland Grade III–IV)","Flexion-biased exercise program (McKenzie if flexion preference)","Postural correction: reduce lumbar lordosis in standing","Facet joint injection if failed 6-week conservative trial","Address thoracic stiffness driving lumbar compensation"]});
  }

  // ── Lumbar Segmental Instability — McGill; O'Sullivan; Magee ─────────────
  const proneInstab=isBilPos("st_prone_instab")||isPos("st_prone_instab");
  if(proneInstab){
    dx.push({system:"Structural",name:"Lumbar Segmental Instability",confidence:"Moderate",
      evidence:["Prone instability test positive — pain reduces with spinal muscle activation","Prone instability test: pain in passive hanging position relieves with erector spinae activation — confirms muscular contribution to instability (Magee; O'Sullivan). LR+ ≈ 2.05"],
      mechanism:"Loss of segmental motor control (transversus abdominis, multifidus) allows excessive intervertebral motion. Pain is provoked in passive positions (sitting, prolonged standing) and relieved by co-contraction. Not structural hypermobility — it is neuromuscular control failure.",
      treatment:["Motor control training: TrA + multifidus activation (Richardson/Hodges protocol)","Progression from isolation → functional movement → sport","Avoid high-load spinal flexion early (Flexion Relaxation Phenomenon — McGill)","McGill 'Big 3': curl-up, side plank, bird-dog","Avoid passive treatment as sole approach — active rehab is essential","Address contributing factors: fatigue, fear-avoidance, deconditioning"]});
  }

  // ── Spondylolysis / Spondylolisthesis — Magee; Netter's ─────────────────
  const storkPos=isBilPos("st_stork")||isPos("st_stork");
  if(storkPos){
    dx.push({system:"Structural",name:"Suspected Spondylolysis / Spondylolisthesis",confidence:"Moderate",
      evidence:["Stork test positive — ipsilateral LBP on single-leg extension","Stork test: extension + rotation on single leg loads the pars interarticularis ipsilaterally. Sens ~0.50, spec ~0.64 — needs X-ray confirmation (Magee; Netter's). Bilateral = bilateral pars stress fracture."],
      mechanism:"Stress fracture of the pars interarticularis (L5 most common), often in young athletes with repeated hyperextension (gymnastics, fast bowling, swimming butterfly). Spondylolisthesis = vertebral slip when bilateral pars fractured.",
      treatment:["Urgent X-ray (lateral, oblique — 'Scotty dog' sign) + CT if X-ray equivocal","Activity modification: avoid extension loading for 3–6 months","Lumbar bracing if acute (Boston brace or thoracolumbar corset)","Core stability: TrA + multifidus (non-extension)","Refer orthopaedic if Grade II+ spondylolisthesis or neurological signs","Graded return to sport with imaging follow-up"]});
  }

  // ── Hip Flexor Tightness / Iliopsoas Syndrome — Thomas test; Magee ───────
  const thomasIliopsoas=isBilPos("st_thomas_test")&&(has("st_thomas_test_left","iliopsoas")||has("st_thomas_test_right","iliopsoas")||has("st_thomas_test","iliopsoas")||has("st_thomas_test_left","thigh elevated")||has("st_thomas_test_right","thigh elevated")||has("st_thomas_test","thigh elevated"));
  const thomasRF=isBilPos("st_thomas_test")&&(has("st_thomas_test_left","rectus")||has("st_thomas_test_right","rectus")||has("st_thomas_test","rectus")||has("st_thomas_test_left","knee extends")||has("st_thomas_test_right","knee extends")||has("st_thomas_test","knee extends"));
  if(thomasIliopsoas||thomasRF){
    dx.push({system:"Structural",name:"Hip Flexor Contracture"+(thomasIliopsoas&&thomasRF?" (Iliopsoas + Rectus Femoris)":thomasIliopsoas?" (Iliopsoas)":"(Rectus Femoris)"),confidence:"High",
      evidence:[thomasIliopsoas?"Thomas test — thigh elevated (iliopsoas contracture)":null,thomasRF?"Thomas test — knee extends (rectus femoris contracture)":null,"Thomas test: highly reliable for iliopsoas and RF contracture when thigh cannot remain flat or knee extends >90° (Magee; Kendall, Muscles: Testing and Function)"].filter(Boolean),
      mechanism:thomasIliopsoas?"Iliopsoas (iliacus + psoas major) contracture tilts the pelvis anteriorly and increases lumbar lordosis — a key driver of LCS (Lower Crossed Syndrome)":"Rectus femoris biarticular tightness limits hip extension and increases anterior pelvic tilt and knee loading.",
      treatment:[thomasIliopsoas?"Iliopsoas stretch: kneeling lunge with posterior pelvic tilt (neutralise lumbar extension compensation)":null,thomasRF?"Rectus femoris stretch: prone knee flexion with stable pelvis":null,"Address Lower Crossed Syndrome: activate glutes + deep abdominals","CPA: check for psoas inhibition of opposite gluteus maximus","Progress to dynamic hip flexor loading (eccentric) once flexibility improves"].filter(Boolean)});
  }

  // ── Piriformis Syndrome / Sciatic Nerve Compression — Magee ─────────────
  const piriformisPos=isBilPos("st_piriformis_test");
  if(piriformisPos){
    const sciatic=has("st_piriformis_test_left","sciatic")||has("st_piriformis_test_right","sciatic")||has("st_piriformis_test","sciatic");
    dx.push({system:"Structural",name:sciatic?"Piriformis Syndrome with Sciatic Nerve Compression":"Deep Gluteal Syndrome (Piriformis)",confidence:"Moderate",
      evidence:[sciatic?"Piriformis test — reproduces sciatic symptoms (deep buttock → leg)":"Piriformis test — deep buttock pain without sciatic radiation","Piriformis test: FAIR position (Flexion-Adduction-IR) compresses piriformis onto sciatic nerve (Magee). Must exclude L-spine radiculopathy first (SLR negative, no dermatome deficit)."],
      mechanism:sciatic?"Hypertrophied or shortened piriformis compresses the sciatic nerve at the greater sciatic notch. Distinguish from lumbar disc radiculopathy: SLR negative, no dermatomal deficit, no spinal provocation.":"Piriformis overactivation from glute med inhibition; deep buttock pain without neural involvement.",
      treatment:["Piriformis stretching (supine knee-to-opposite-shoulder, FAIR position)","Deep gluteal soft tissue: instrument-assisted or trigger point release","Glute med/max activation to reduce piriformis compensation","Lumbar spine clearing essential before labelling piriformis","Ultrasound-guided injection if failed 6-week conservative","MRI/MR neurography if neural compression suspected — rule out space-occupying lesion"]});
  }

  // ── Teres Minor Tear / Posterosuperior RC — Magee ────────────────────────
  const hornblowerPos=isBilPos("st_hornblower");
  const erLagPos=isBilPos("st_er_lag");
  if(hornblowerPos||erLagPos){
    dx.push({system:"Structural",name:"Posterior Rotator Cuff Tear (Teres Minor / Infraspinatus)",confidence:(hornblowerPos&&erLagPos)?"High":"Moderate",
      evidence:[hornblowerPos?"Hornblower's sign positive — teres minor tear (ER deficit in abduction)":null,erLagPos?`ER lag sign positive — ${has("st_er_lag_left","significant")||has("st_er_lag_right","significant")||has("st_er_lag","significant")?"significant lag (>10°) — massive RC tear":"lag present — partial/complete ER cuff tear"}`:null,"Hornblower's: specific for teres minor tear; ER lag: sen ~0.68, spec ~0.97 for full-thickness supraspinatus or infraspinatus tear (Magee; Walch)"].filter(Boolean),
      mechanism:"Teres minor and infraspinatus comprise the posterior ER cuff. ER lag sign = passive ER arc that patient cannot actively maintain. Hornblower's: loss of ER at 90° abduction = teres minor failure.",
      treatment:["Urgent orthopaedic referral + MRI — large/massive posterior tears have poor spontaneous healing","If surgical: early repair within 6 weeks before retraction and fatty infiltration","If conservative: deltoid strengthening, pain-free ROM","ER strengthening in functional range once repair protected"]});
  }

  // ── Scapular Dyskinesis — Kibler; Magee; Kendall ─────────────────────────
  const scapDysk=isPos("st_scapular_dyskinesis")||isBilPos("st_scapular_dyskinesis");
  const kibleSlide=isPos("st_kibler_slide")||isBilPos("st_kibler_slide");
  if(scapDysk||kibleSlide){
    const type=has("st_scapular_dyskinesis","Type I")?"Type I (inferior angle winging — serratus anterior deficit)":has("st_scapular_dyskinesis","Type II")?"Type II (medial border winging — serratus + lower trap deficit)":has("st_scapular_dyskinesis","Type III")?"Type III (superior border elevation — upper trap dominant)":"Scapular dyskinesis";
    dx.push({system:"Structural",name:`Scapular Dyskinesis — ${type}`,confidence:"Moderate",
      evidence:[scapDysk?`Scapular dyskinesis observed: ${type}`:null,kibleSlide?"Kibler lateral slide test positive — scapular asymmetry":null,"Dyskinesis classification guides treatment targets: Type I = serratus; Type II = serratus + lower trap; Type III = upper trap inhibition (Kibler; Magee; Kendall, Muscles: Testing and Function)"].filter(Boolean),
      mechanism:"Altered scapulohumeral rhythm reduces subacromial space, increases rotator cuff and labral load. Upper trap overactivation, serratus anterior inhibition, and lower trap weakness create the classic Type III pattern.",
      treatment:[has("st_scapular_dyskinesis","Type I")?"Serratus anterior activation: wall slide, push-up plus progression":has("st_scapular_dyskinesis","Type III")?"Upper trap inhibition: scapular depression exercises, lower trap rows":"Lower trap and serratus activation: Y/T/W exercises","Thoracic extension and rotation mobility (restricted thorax amplifies dyskinesis)","Cervicothoracic junction mobilisation (C7–T3)","Integrate scapular control into sport-specific loading","CPA: check serratus anterior inhibition pattern"]});
  }
  // Cervical radiculopathy — genuine Wainner cluster (Cleland, Netter's; Magee)
  const cervDermDeficit=["n_c5","n_c6","n_c7","n_c8"].some(id=>has(id+"_left","Reduced")||has(id+"_right","Reduced")||has(id+"_left","Absent")||has(id+"_right","Absent")||has(id,"Reduced")||has(id,"Absent"));
  // Reflex-based level localisation (myotome input fields do not exist in the data model — reflexes do)
  const dimRef=id=>has(id+"_left","Diminished")||has(id+"_right","Diminished")||has(id+"_left","Absent")||has(id+"_right","Absent")||has(id,"Diminished")||has(id,"Absent");
  const cervReflexLevel = (dimRef("n_ref_bicep")||dimRef("n_ref_brad"))?"C5/C6":dimRef("n_ref_tricep")?"C7":null;
  const cervReflexDim = !!cervReflexLevel;
  const cervUlttPos=isBilPos("nt_ultt1")||isBilPos("nt_ultt2")||isBilPos("nt_ultt3");
  // Wainner 4 items: Spurling+, distraction+ (relief), ULTT-A+, cervical rotation <60° to affected side
  const wainnerCount=[isBilPos("st_spurling"),isBilPos("st_distraction"),cervUlttPos,
    (isBilPos("st_cervical_rotation_lt")||(()=>{const l=parseFloat(data.rom_crotl||""),r=parseFloat(data.rom_crotr||"");return (!isNaN(l)&&l<60)||(!isNaN(r)&&r<60);})())].filter(Boolean).length;
  const cervRad=isBilPos("st_spurling")||cervDermDeficit||cervReflexDim||wainnerCount>=2;
  if(cervRad){
    const lv=has("n_c5_left","Reduced")||has("n_c5_right","Reduced")||has("n_c5","Reduced")?"C5":has("n_c6_left","Reduced")||has("n_c6_right","Reduced")||has("n_c6","Reduced")?"C6":has("n_c7_left","Reduced")||has("n_c7_right","Reduced")||has("n_c7","Reduced")?"C7":has("n_c8_left","Reduced")||has("n_c8_right","Reduced")||has("n_c8","Reduced")?"C8":cervReflexLevel||"multi-level";
    const conf=wainnerCount>=3?"High":wainnerCount>=2||cervDermDeficit||cervReflexDim?"High":"Moderate";
    dx.push({system:"Structural",name:`Cervical Radiculopathy (${lv})`,confidence:conf,
      evidence:[isBilPos("st_spurling")?"Spurling's positive":null,isBilPos("st_distraction")?"Distraction test positive (symptom relief)":null,cervUlttPos?"ULTT (upper limb neural tension) positive":null,cervDermDeficit?`Dermatomal sensory deficit: ${lv}`:null,cervReflexDim?`Diminished/absent DTR localising to ${cervReflexLevel} (biceps/brachioradialis = C5/6, triceps = C7)`:null,`Wainner cluster: ${wainnerCount}/4 positive`,"Wainner cluster — 3/4 LR+ ≈ 6.1, 4/4 LR+ ≈ 30; Spurling's specificity ~0.89 (Cleland, Netter's; Magee)"].filter(Boolean),
      mechanism:`${lv} nerve root compression — disc herniation or foraminal stenosis. Spurling's confirms (specific, not sensitive); distraction relieves; ULTT loads the neural tissue. Diminished DTR indicates a lower-motor-neuron (root) lesion.`,
      treatment:["Cervical traction (intermittent or sustained) — supported by Wainner-positive subgroup","Neural mobilisation — median/ulnar/radial nerve gliding to affected level","Deep neck flexor (DNF) stabilisation program","Postural correction: chin tuck, scapular setting","Imaging (MRI) if no improvement at 6 weeks or progressive motor deficit","Refer neurosurgery if progressive weakness or myelopathic signs"]});
  }

  // ── Cervicogenic Headache (C0–C2) — Hall; Magee; IHS criteria ────────────
  // FRT (flexion-rotation test) is the key test: <32° rotation = C1/C2 restriction.
  const frtPos = has("st_flex_rot","Positive")||has("st_flex_rot_left","Positive")||has("st_flex_rot_right","Positive")||has("st_flex_rot","restriction");
  const ccText = (v("cc_main")+" "+(v("cx_loc_primary")||"")).toLowerCase();
  const headachePattern = ccText.includes("headache")||ccText.includes("head ache")||ccText.includes("suboccipital")||ccText.includes("base of skull")||ccText.includes("occipital");
  const upperCervRotLimited = (()=>{const l=parseFloat(data.rom_crotl||""),r=parseFloat(data.rom_crotr||"");return (!isNaN(l)&&l<60)||(!isNaN(r)&&r<60);})();
  // Fire if FRT positive, OR (headache pattern + upper cervical restriction) without radiculopathy/red flags
  if(frtPos || (headachePattern && (upperCervRotLimited||frtPos))){
    dx.push({system:"Structural",name:"Cervicogenic Headache (C0–C2)",confidence:frtPos?"High":"Moderate",
      evidence:[frtPos?"Flexion-Rotation Test positive (<32° — C1/C2 rotational restriction)":null,headachePattern?"Headache referred from upper cervical spine (suboccipital/occipital pattern)":null,upperCervRotLimited?"Cervical rotation restricted":null,"FRT for C1/C2: sensitivity ~0.91, specificity ~0.90 for cervicogenic headache (Hall et al.; Magee). Unilateral, side-locked headache without side-shift supports cervicogenic origin (IHS criteria)."].filter(Boolean),
      mechanism:"Nociceptive convergence at the trigeminocervical nucleus: afferents from C1–C3 (greater occipital nerve, C2/C3 facets, suboccipital muscles) refer pain to the head. C1/C2 contributes ~50% of cervical rotation — the FRT isolates this segment.",
      treatment:["C1/C2 sustained natural apophyseal glides (SNAGs) — Mulligan, strong evidence for cervicogenic headache","Suboccipital soft-tissue release and deep neck flexor (DNF) retraining","Upper cervical mobilisation (C0–C2) within pain-free range","Postural correction — reduce forward-head/upper-cervical extension","Address ergonomics and screen-time posture","Refer if associated neurological signs, thunderclap onset, or atypical features (exclude migraine/secondary headache)"]});
  }
  if(isBilPos("st_slump_test")||isBilPos("st_slr_test")||has("n_slr_left","Positive")||has("n_slr_right","Positive")){const lv=has("n_l4","Reduced")?"L4":has("n_l5","Reduced")?"L5":has("n_s1","Reduced")?"S1":"lumbar";
dx.push({system:"Structural",name:`Lumbar Radiculopathy (${lv})`,confidence:"High",evidence:["Slump / SLR positive",`Level: ${lv}`,"SLR is sensitive (~0.91) for L4-S1 disc herniation; crossed-SLR is highly specific (~0.88). Slump is more sensitive than SLR (Magee; Netter's)"],mechanism:"Disc herniation or foraminal stenosis compressing the nerve root, reproducing dermatomal leg symptoms on neural tension loading.",treatment:["McKenzie method — establish directional preference","Neural mobilisation (sciatic slider/tensioner)","Core stability: transversus abdominis, multifidus","Imaging if cauda equina signs or progressive deficit"]});}
  if((isPos("st_si_distraction")||isPos("st_si_compression")) && (["st_si_distraction","st_si_compression","st_thigh_thrust","st_gaenslen","st_thigh_thrust"].filter(t=>isPos(t)).length>=2)){dx.push({system:"Structural",name:"Sacroiliac Joint Dysfunction",confidence:"Moderate",evidence:["Laslett provocation cluster: ≥3 of 5 positive (distraction, compression, thigh thrust, Gaenslen's, sacral thrust) gives LR+ ≈ 4.3 (Laslett; Magee; Netter's)"],mechanism:"SIJ pain confirmed by a cluster of provocation tests — single positive tests are unreliable, hence cluster requirement.",treatment:["SIJ manipulation / mobilisation","Lumbopelvic motor control and stability","Pelvic belt trial if hypermobile/peripartum","Injection or prolotherapy referral if persistent"]});}
  else if(isPos("st_si_distraction")||isPos("st_si_compression")){dx.push({system:"Structural",name:"Possible Sacroiliac Joint Involvement (single test)",confidence:"Low",evidence:["Only 1 SIJ provocation test positive — insufficient for diagnosis (Laslett cluster requires ≥3 of 5)"],mechanism:"Isolated positive SIJ test has poor diagnostic value; complete the full Laslett cluster before concluding SIJ pathology.",treatment:["Complete Laslett provocation cluster (5 tests)","Re-assess with lumbar clearing tests","Avoid over-attributing pain to SIJ on a single test"]});}
  if(isPos("st_windlass_test")){dx.push({system:"Structural",name:"Plantar Fasciitis / Fasciopathy",confidence:"High",evidence:["Windlass test positive","Windlass test specificity is high (~1.0) though sensitivity is modest (~0.32) — a positive test is meaningful (Magee)"],mechanism:"Plantar fascia overloaded at the medial calcaneal tubercle. Dorsiflexing the hallux tensions the fascia (windlass mechanism) and reproduces pain.",treatment:["Plantar fascia + gastroc/soleus stretching","Night splinting for first-step pain","Foot orthoses / arch support assessment","Shockwave therapy if symptoms >3 months"]});}

  // ── Ankle ligament injury (ATFL/CFL) — Magee; Ottawa Ankle Rules ─────────
  const ankleDrawer=isBilPos("st_ant_drawer_ankle")||isBilPos("st_ant_drawer_ankle");
  const talarTilt=isBilPos("st_talar_tilt");
  if(ankleDrawer||talarTilt){
    dx.push({system:"Structural",name:"Lateral Ankle Ligament Sprain (ATFL ± CFL)",confidence:ankleDrawer&&talarTilt?"High":"Moderate",
      evidence:[ankleDrawer?"Anterior drawer positive — ATFL laxity":null,talarTilt?"Talar tilt (inversion stress) positive — CFL involvement":null,"Anterior drawer best performed 4–5 days post-injury once guarding settles; delayed test improves accuracy (Magee). Apply Ottawa Ankle Rules to decide on radiography."].filter(Boolean),
      mechanism:"Inversion/plantarflexion injury. ATFL fails first (anterior drawer), CFL next (talar tilt). Grade I–III based on laxity and end-feel.",
      treatment:["Apply Ottawa Ankle Rules — refer for X-ray if bony tenderness at malleoli/navicular/5th MT base or unable to weight-bear 4 steps","Acute: relative rest, compression, elevation; early protected weight-bearing","Peroneal strengthening + proprioception (single-leg balance, wobble board)","Progressive return-to-sport; bracing/taping for high-demand activity","Refer if Grade III instability or failed conservative care at 6 weeks"]});
  }

  // ── Gluteal tendinopathy / GTPS — Grimaldi; Magee ────────────────────────
  // FADIR option text: "Positive — anterior groin pain (FAI)" vs "Positive — lateral hip pain"
  const fadirGroin = has("st_fadir_test_left","groin")||has("st_fadir_test_right","groin")||has("st_fadir_test","groin");
  const fadirLateral = has("st_fadir_test_left","lateral")||has("st_fadir_test_right","lateral")||has("st_fadir_test","lateral");
  const gmedWeak=weakMMT("m_gmed")||isInh("nkt_gmed");
  const latHipPain=((v("hp_loc_primary")||"").toLowerCase().includes("lateral"))||fadirLateral;
  const trendelenburg=isPos("st_trendelenburg_test")||isBilPos("st_trendelenburg_test");
  if(gmedWeak&&(latHipPain||trendelenburg||fadirLateral)){
    dx.push({system:"Structural",name:"Gluteal Tendinopathy / Greater Trochanteric Pain Syndrome (GTPS)",confidence:trendelenburg&&gmedWeak?"High":"Moderate",
      evidence:[gmedWeak?"Gluteus medius weak / inhibited":null,latHipPain?"Lateral hip pain over greater trochanter":null,trendelenburg?"Trendelenburg positive — hip abductor insufficiency":null,fadirLateral?"FADIR provokes lateral (not groin) pain — extra-articular pattern":null,"GTPS is now understood as gluteus medius/minimus tendinopathy + bursal involvement, not isolated bursitis (Grimaldi 2015; Magee)"].filter(Boolean),
      mechanism:"Compressive + tensile overload of glute med/min tendons at the greater trochanter, often with a hip-adduction posture (leg-crossing, hip-hitching). Trendelenburg reflects abductor failure.",
      treatment:["AVOID hip adduction/compression: no leg-crossing, no side-lying on affected hip, avoid hip-hitched standing","Isometric abductor loading early (pain-modulating), progress to isotonic","Gluteus medius/minimus progressive strengthening (Grimaldi LEAP protocol)","Load management education — reduce tendon compression","Corticosteroid injection only if refractory; address biomechanics first"]});
  }

  // ── Hip OA / FAI — Cleland Netter's hip cluster; Magee ───────────────────
  const hipIRlimited=(()=>{const l=parseFloat(data.rom_hir_left||""),r=parseFloat(data.rom_hir_right||"");return (!isNaN(l)&&l<35)||(!isNaN(r)&&r<35);})();
  const groinPain=((v("hp_loc_primary")||"").toLowerCase().includes("groin"))||((v("cc_main")||"").toLowerCase().includes("groin"))||fadirGroin;
  const ageNum=parseInt(data.dem_age||"0");
  if((hipIRlimited&&groinPain)||fadirGroin){
    const likelyFAI=fadirGroin&&ageNum<50;
    dx.push({system:"Structural",name:likelyFAI?"Femoroacetabular Impingement (FAI)":"Hip Osteoarthritis / Intra-articular Hip Pathology",confidence:(hipIRlimited&&fadirGroin)?"High":"Moderate",
      evidence:[hipIRlimited?"Hip internal rotation limited (<35°)":null,groinPain?"Anterior groin pain (C-sign)":null,fadirGroin?"FADIR provokes anterior groin pain — intra-articular pattern":null,ageNum>=50?`Age ${ageNum} — degenerative aetiology more likely`:null,"Cluster of limited hip IR + groin pain + positive FADIR strongly raises probability of intra-articular hip pathology (Cleland, Netter's; Magee)"].filter(Boolean),
      mechanism:likelyFAI?"Cam/pincer morphology causing femoroacetabular abutment in flexion-adduction-internal-rotation, reproduced by FADIR.":"Degenerative joint changes restricting capsular IR, producing groin pain and a capsular end-feel pattern.",
      treatment:likelyFAI?["Hip mobility within pain-free range; avoid end-range FADIR loading","Deep hip stabiliser + glute strengthening","Movement re-education (hip hinge, squat depth modification)","Orthopaedic referral + imaging (X-ray/MRA) if persistent or mechanical symptoms"]:["Hip strengthening (abductors, extensors) — GLA:D programme evidence-based","Range-of-motion and capsular mobilisation","Weight management and activity modification","Orthopaedic referral if functional decline / consider arthroplasty work-up"]});
  }

  // ── Inflammatory arthropathy soft red-flag — Magee red-flag screen ───────
  const morningStiffAll=["cx","tx","lx","sh","hp","kn"].map(p=>(data[`${p}_sb_morning`]||"")).join(" ").toLowerCase();
  const prolongedAMstiff=morningStiffAll.includes(">30")||morningStiffAll.includes(">60")||morningStiffAll.includes("stays bad")||morningStiffAll.includes("over an hour");
  const bilateralSymmetric=(()=>{const loc=(v("cc_main")+" "+(data.pa_pattern||"")).toLowerCase();return loc.includes("both")||loc.includes("bilateral")||loc.includes("symmetric")||loc.includes("hands")||loc.includes("multiple joint");})();
  if(prolongedAMstiff&&(bilateralSymmetric||ageNum>=40)){
    redFlags.push({label:"Possible inflammatory arthropathy — prolonged morning stiffness (>30–60 min) ± symmetrical/polyarticular pattern. Consider rheumatology screen (RF, anti-CCP, ESR/CRP).",severity:"refer"});
    dx.push({system:"Structural",name:"Suspected Inflammatory Arthropathy",confidence:"Moderate",
      evidence:["Prolonged early-morning stiffness (>30–60 min) — hallmark of inflammatory rather than mechanical pain (Magee red-flag chapter)",bilateralSymmetric?"Bilateral / symmetrical / polyarticular distribution":null,ageNum>=40?`Age ${ageNum}`:null].filter(Boolean),
      mechanism:"Inflammatory (vs mechanical) pain is suggested by prolonged morning stiffness, symmetrical small-joint involvement, and stiffness that eases with movement but not rest. Requires medical work-up to exclude RA/spondyloarthropathy.",
      treatment:["Refer to GP/rheumatology for serology (RF, anti-CCP, ESR, CRP) and imaging","Do NOT treat as purely mechanical until inflammatory cause excluded","Gentle ROM and activity pacing during flares","Joint protection and energy conservation education"]});
  }


  // ── ERGONOMIC MODULE INTEGRATION ─────────────────────────────────────────
  const ergoScore=parseInt(data.ergo_total_score||"0");
  const ergoRisks=[];
  if((data.ergo_cervical_risk||"").includes("High"))ergoRisks.push("High cervical strain risk from workstation");
  if((data.ergo_lumbar_risk||"").includes("High"))ergoRisks.push("High lumbar overload risk — seating/posture");
  if((data.ergo_rsi_risk||"").includes("High"))ergoRisks.push("High RSI risk — repetitive upper limb exposure");
  if((data.ergo_ucs_risk||"").includes("High"))ergoRisks.push("Workstation driving UCS pattern");
  if((data.ergo_nerve_risk||"").includes("High"))ergoRisks.push("Nerve compression risk — keyboard/mouse posture");
  if(ergoScore>=15||ergoRisks.length>=3){
    dx.push({system:"Ergonomic",name:`Occupational Ergonomic Syndrome (Score ${ergoScore}/30)`,confidence:ergoScore>=20?"High":"Moderate",
      evidence:[...ergoRisks,data.ergo_sitting_hrs?`Sitting duration: ${data.ergo_sitting_hrs}h/day`:null,data.ergo_break_freq?`Microbreak frequency: ${data.ergo_break_freq}`:null].filter(Boolean),
      mechanism:"Cumulative ergonomic load from sustained static posture, suboptimal workstation setup, and repetitive movement patterns driving musculoskeletal pathology.",
      treatment:["Immediate workstation correction per ergonomic assessment findings","Microbreak protocol: 20-20-20 rule (every 20 min, 20 sec break, look 20 ft)","Postural retraining: chin tuck, scapular retraction cues","Ergonomic equipment review: chair, monitor, keyboard, mouse","Progressive return to neutral posture with DNF activation","Review task rotation and load distribution"]
    });
  }

  // ── ALWAYS-PRESENT FALLBACK: build from whatever fields ARE filled ────────
  if (dx.length === 0) {
    const sympEvidence = [];
    const sympTreatment = [];
    // Demographics
    const name = data.dem_name || "Patient";
    const age  = parseInt(data.dem_age || "0");
    // Region-aware field accessor (matches regional architecture)
    const REGION_PREFIX_DDX = {
      "Cervical spine (neck)":"cx","Thoracic spine (mid back)":"tx","Lumbar spine / SI joint (low back)":"lx",
      "Shoulder":"sh","Elbow / forearm":"ew","Wrist / hand":"ew","Hip / groin":"hp","Knee":"kn",
      "Ankle / foot":"af","Temporomandibular (TMJ)":"tm",
    };
    const _region = data.cc_region || "";
    const _pfx = REGION_PREFIX_DDX[_region] || "";
    const rget = (suffix) => _pfx ? (data[`${_pfx}_${suffix}`] || "") : "";
    // Chief complaint
    if (data.cc_main)          sympEvidence.push(`Chief complaint: "${data.cc_main}"`);
    if (_region)               sympEvidence.push(`Primary region: ${_region}`);
    if (rget("loc_primary"))   sympEvidence.push(`Location: ${(typeof rget("loc_primary")==="string"?rget("loc_primary"):"").split("|||").join(", ")}`);
    if (rget("loc_radiation")) sympEvidence.push(`Radiation: ${(typeof rget("loc_radiation")==="string"?rget("loc_radiation"):"").split("|||").join(", ")}`);
    if (data.cc_onset)         sympEvidence.push(`Onset: ${Array.isArray(data.cc_onset)?data.cc_onset.join(", "):data.cc_onset}`);
    if (data.cc_duration)      sympEvidence.push(`Duration: ${Array.isArray(data.cc_duration)?data.cc_duration.join(", "):data.cc_duration}`);
    // Pain
    if (data.pa_vas_now)       sympEvidence.push(`Current pain: ${data.pa_vas_now}/10`);
    if (data.pa_vas_worst)     sympEvidence.push(`Worst pain: ${data.pa_vas_worst}/10`);
    // Aggravating / easing (region-specific)
    const _aggCombined = [rget("agg_movements"),rget("agg_postures"),rget("agg_activities"),rget("agg_other")].filter(Boolean).join("|||");
    const _relCombined = [rget("rel_movements"),rget("rel_postures"),rget("rel_manual"),rget("rel_med")].filter(Boolean).join("|||");
    if (_aggCombined && typeof _aggCombined==="string") sympEvidence.push(`Aggravated by: ${_aggCombined.split("|||").filter(Boolean).join(", ")}`);
    if (_relCombined && typeof _relCombined==="string") sympEvidence.push(`Eased by: ${_relCombined.split("|||").filter(Boolean).join(", ")}`);
    // Symptom behaviour
    if (rget("sb_morning"))    sympEvidence.push(`Morning: ${(typeof rget("sb_morning")==="string"?rget("sb_morning"):"").split("|||").join(", ")}`);
    if (rget("sb_night"))      sympEvidence.push(`Night: ${(typeof rget("sb_night")==="string"?rget("sb_night"):"").split("|||").join(", ")}`);
    // MOI
    if (rget("moi_type"))      sympEvidence.push(`Mechanism: ${(typeof rget("moi_type")==="string"?rget("moi_type"):"").split("|||").join(", ")}`);
    // History
    if (data.pmh_relevant)     sympEvidence.push(`PMH: ${Array.isArray(data.pmh_relevant)?data.pmh_relevant.join(", "):data.pmh_relevant}`);

    // Infer clinical pattern from available data
    let dxName = "Musculoskeletal Pain Presentation";
    let mechanism = "Insufficient clinical data for a definitive differential diagnosis. Presentation is consistent with a non-specific musculoskeletal pain pattern. Further assessment recommended.";
    let confidence = "Low";

    const painNow = parseFloat(data.pa_vas_now || "0");
    const quality = "";  // pa_quality removed in regional system; using radiation/symptoms instead
    const location = _region.toLowerCase();
    const agg = _aggCombined.toLowerCase();
    const ease = _relCombined.toLowerCase();
    const morning = rget("sb_morning").toLowerCase();
    const duration = (Array.isArray(data.cc_duration)?data.cc_duration.join(" "):data.cc_duration||"").toLowerCase();
    const radiation = rget("loc_radiation").toLowerCase();
    const armQuality = rget("arm_quality").toLowerCase();
    const neuroQuality = rget("neuro_quality").toLowerCase();

    // Pattern recognition from symptoms
    const isInflammatory = morning.includes("stiff") || morning.includes(">30") || morning.includes("stays bad");
    const isMechanical   = agg.includes("sit") || agg.includes("stand") || agg.includes("lift") || agg.includes("bending") || ease.includes("rest");
    const isNeuropathic  = armQuality.includes("burn") || armQuality.includes("shoot") || armQuality.includes("tin") || armQuality.includes("electric") || armQuality.includes("numb") ||
                           neuroQuality.includes("burn") || neuroQuality.includes("shoot") || neuroQuality.includes("tin") || neuroQuality.includes("electric") || neuroQuality.includes("numb") ||
                           (radiation && !radiation.includes("no radiation"));
    const isAcute        = duration.includes("day") || duration.includes("week") || duration.includes("acute");
    const isChronic      = duration.includes("month") || duration.includes("year") || duration.includes("chronic");

    if (isNeuropathic) {
      dxName = "Suspected Neuropathic Pain Pattern";
      mechanism = "Symptom quality (burning, shooting, tingling) suggests neural sensitisation or nerve root involvement. Dermatomal and neurological screening recommended.";
      confidence = "Moderate";
      sympTreatment.push("Neurological screening: dermatomes, myotomes, reflexes","Neural tension tests (SLR, slump, ULTT)","Desensitisation: graded sensory stimulation","Refer if progressive neurological deficit");
    } else if (isInflammatory) {
      dxName = "Suspected Inflammatory / Irritable Pain Pattern";
      mechanism = "Morning stiffness and throbbing/aching quality suggest inflammatory or irritable joint pathology. Rule out inflammatory arthropathy.";
      confidence = "Moderate";
      sympTreatment.push("Activity modification during flare","Ice / anti-inflammatory modalities","Gentle range-of-motion exercises","Consider rheumatological screen if persistent");
    } else if (isMechanical) {
      dxName = "Mechanical Musculoskeletal Pain";
      mechanism = "Pain aggravated by mechanical loading (sitting, standing, lifting) and relieved by rest is consistent with mechanical musculoskeletal dysfunction.";
      confidence = "Moderate";
      sympTreatment.push("Postural correction and ergonomic advice","Load management and graded return to activity","Core stability and movement re-education","Manual therapy: joint mobilisation and soft tissue techniques");
    }

    if (isChronic) {
      sympEvidence.push("Chronic presentation (>3 months) — consider central sensitisation");
      sympTreatment.push("Pain neurophysiology education","Graded exposure / graded activity","Consider psychosocial yellow flag screening (Örebro)");
    }
    if (isAcute) {
      sympTreatment.push("PRICE principles if acute trauma","Early active movement within pain limits","Reassure: natural history is favourable in acute MSK");
    }
    if (painNow >= 7) {
      sympEvidence.push(`High pain intensity (${painNow}/10) — consider pain management strategies`);
      sympTreatment.push("Pain management: modalities, analgesic liaison if required","Reduce fear-avoidance: active rather than passive treatment");
    }

    // Age-related considerations
    if (age > 50) {
      sympEvidence.push(`Age ${age} — consider degenerative pathology`);
      sympTreatment.push("Screen for osteoarthritis / degenerative disc disease");
    }
    if (age < 20) {
      sympEvidence.push(`Age ${age} — consider growth-related pathology (apophysitis, Scheuermann's)`);
    }

    if (sympEvidence.length === 0) sympEvidence.push("No assessment fields completed — enter patient data to refine diagnosis");
    if (sympTreatment.length === 0) sympTreatment.push("Complete assessment modules to generate targeted treatment plan","Full subjective and objective assessment recommended","Establish baseline measures before treatment");

    dx.push({
      system:"Posture",
      name: dxName,
      confidence,
      evidence: sympEvidence,
      mechanism,
      treatment: sympTreatment,
      interpretation: "Based on available symptoms only. Complete assessment modules for definitive multi-system diagnosis."
    });
  }

  // ── Deduplicate diagnoses by base name ───────────────────────────────────
  // Radiculopathy and other dx can fire from both the neuro-integration block
  // and the special-tests block. Merge duplicates: keep highest confidence,
  // combine unique evidence, prefer the richer treatment list.
  const confRank = { "High":3, "Moderate":2, "Low":1 };
  const baseName = n => n.replace(/\s*\([^)]*\)\s*/g,"").trim().toLowerCase();
  const merged = {};
  dx.forEach(d => {
    const key = baseName(d.name);
    if(!merged[key]) { merged[key] = {...d, evidence:[...(d.evidence||[])]}; return; }
    const ex = merged[key];
    // keep the more specific name (the one with a level in parentheses)
    if(/\(/.test(d.name) && !/\(/.test(ex.name)) ex.name = d.name;
    // highest confidence wins
    if((confRank[d.confidence]||0) > (confRank[ex.confidence]||0)) ex.confidence = d.confidence;
    // combine unique evidence
    (d.evidence||[]).forEach(e => { if(e && !ex.evidence.includes(e)) ex.evidence.push(e); });
    // prefer the longer treatment list
    if((d.treatment||[]).length > (ex.treatment||[]).length) ex.treatment = d.treatment;
  });
  const dedupDx = Object.values(merged);

  return { dx: dedupDx, redFlags };
}

export { generateDiagnosis };
