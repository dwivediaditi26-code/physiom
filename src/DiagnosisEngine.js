/**
 * DiagnosisEngine.js — PhysioM Clinical Reasoning Engine
 *
 * Sources used per diagnosis:
 *   MAG  = Magee's Orthopedic Physical Assessment, 7th ed.
 *   MAIT = Maitland's Vertebral Manipulation, 8th ed.
 *   CYR  = Cyriax Orthopaedic Medicine, 3rd ed.
 *   KEN  = Kendall's Muscles: Testing and Function, 5th ed.
 *   BUT  = Butler's Mobilisation of the Nervous System
 *   DUT  = Dutton's Orthopaedic Examination, 5th ed.
 *   COOK = Cook Clinical Reasoning in Musculoskeletal Practice
 *   CPR  = Published Clinical Prediction Rules (cited per diagnosis)
 *   NICE = NICE Clinical Guidelines
 *   PAIN = Explain Pain, Butler & Moseley
 */

const isPos  = v => { if(!v) return false; const s=String(v).toLowerCase(); return s.includes("positive")||s.includes("+ve")||s==="yes"||s==="present"||s==="true"; };
const isNeg  = v => { if(!v) return false; const s=String(v).toLowerCase(); return s.includes("negative")||s.includes("-ve")||s==="no"||s==="absent"; };
const num    = v => { const n=parseFloat(String(v||"").replace(/[^\d.-]/g,"")); return isNaN(n)?null:n; };
const txt    = v => v && String(v).trim().length > 0;
const match  = (v,...terms) => terms.some(t=>String(v||"").toLowerCase().includes(t.toLowerCase()));

export function runDiagnosisEngine(data) {
  const d = data || {};
  const v = k => d[k] || "";
  const results = [];

  const add = (region, diagnosis, icd10, hits, total, findings, refs) => {
    const pct = Math.round((hits/total)*100);
    const label = pct>=80?"High":pct>=55?"Moderate":"Low";
    if(hits>=1) results.push({region,diagnosis,icd10,confidence:pct,confidenceLabel:label,supportingFindings:findings.filter(Boolean),hits,total,reference:refs});
  };

  // ── helpers ──────────────────────────────────────────
  const age  = num(v("dem_age"));
  const sex  = String(v("dem_gender")||v("dem_sex")||"").toLowerCase();
  const bmi  = num(v("dem_bmi"));
  const onset= String(v("s_onset")||"").toLowerCase();
  const aggr = String(v("s_aggravating")||"").toLowerCase();
  const ease = String(v("s_easing")||"").toLowerCase();
  const behav= String(v("s_behaviour")||"").toLowerCase();
  const loc  = String(v("s_location")||v("dem_body_part")||"").toLowerCase();
  const cc   = String(v("s_chief_complaint")||"").toLowerCase();
  const rad  = String(v("s_radiation")||"").toLowerCase();
  const mech = String(v("s_mechanism")||"").toLowerCase();
  const palp = String(v("lx_palpation")||v("cx_palpation")||v("shr_palpation")||v("palpation_notes")||"").toLowerCase();

  // ═══════════════════════════════════════════════
  // CERVICAL SPINE
  // ═══════════════════════════════════════════════

  // Cervical Radiculopathy — Wainner CPR 2003 (Spine)
  {
    const spurling   = isPos(v("st_spurling"));
    const distract   = isPos(v("st_distraction"));
    const ultt       = isPos(v("st_upper_limb_tension"))||isPos(v("st_ultt"));
    const cx_rot     = num(v("cx_rot_r"))||num(v("cx_rot_l"));
    const rotLimit   = cx_rot!==null && cx_rot<60;
    const armPain    = match(rad,"arm","hand","finger","elbow","forearm");
    const dermatomal = txt(v("n_c5"))||txt(v("n_c6"))||txt(v("n_c7"))||txt(v("n_c8"))||txt(v("neuro_dermatomal"));
    const weaknessUL = txt(v("neuro_weakness")) && match(v("neuro_weakness"),"arm","grip","wrist","finger");
    const gradOnset  = match(onset,"gradual","insidious","slow");
    const hits=[spurling,distract,ultt,rotLimit,armPain,dermatomal,weaknessUL].filter(Boolean).length;
    add("Cervical","Cervical Radiculopathy","M54.12",hits,7,[
      spurling&&"Spurling's Test +ve (Sn 0.50, Sp 0.86 — Wainner CPR)",
      distract&&"Cervical Distraction relieves symptoms (CYR end-feel + Butler neural tension)",
      ultt&&"ULTT +ve — neural mechanosensitivity (Butler: Mobilisation of NS)",
      rotLimit&&`Cervical rotation < 60° — ${cx_rot}° (Maitland: segmental hypomobility)`,
      armPain&&"Arm/hand radiation (dermatomal pattern — MAG Ch.4)",
      dermatomal&&"C5–C8 dermatomal neurological pattern (KEN myotomal testing)",
      weaknessUL&&"Upper limb myotomal weakness (KEN Ch.5)"
    ],"Wainner et al. 2003 CPR; MAG Ch.4; Butler NS Mob; Maitland Cervical");
  }

  // Cervical Facet Syndrome — Maitland PIVM + Cyriax
  {
    const localPain  = match(loc,"neck","cerv","occipit","suboccip");
    const extPain    = match(v("cx_ext")||"","pain","limit","restrict");
    const latFlexPain= match(v("cx_lat_r")||v("cx_lat_l")||"","pain","restrict");
    const noRad      = !match(rad,"arm","hand","finger","below elbow");
    const morningS   = match(behav+aggr,"morning","stiff");
    const palpTend   = match(palp,"facet","paravert","tender");
    const spurlingNeg= isNeg(v("st_spurling"))||!isPos(v("st_spurling"));
    const pivm       = isPos(v("cx_pivm"))||match(v("cx_pivm")||"","restrict","stiff","hypomob");
    const hits=[localPain,extPain||latFlexPain,noRad,morningS||palpTend,pivm].filter(Boolean).length;
    add("Cervical","Cervical Facet Syndrome","M47.812",hits,5,[
      localPain&&"Localised cervical/occipital pain (Cyriax: non-capsular pattern)",
      extPain&&"Pain on extension (Maitland: posterior joint loading)",
      latFlexPain&&"Pain ipsilateral side-flexion (Maitland PIVM assessment)",
      noRad&&"No arm radiation below elbow (differentiates from radiculopathy)",
      morningS&&"Morning stiffness (Maitland: grade I-II mobilisation indicated)",
      palpTend&&"Paravertebral tenderness on palpation (Maitland PA pressures)",
      pivm&&"PIVM restricted at segmental level (Maitland Vertebral Manipulation)"
    ],"Maitland Vertebral Manipulation 8th ed.; Cyriax Orthopaedic Medicine; MAG Ch.4");
  }

  // Cervicogenic Headache — ICHD-3 + Hall & Robinson FRT
  {
    const headache   = match(loc+cc,"head","occipit","temple","frontal","unilateral");
    const frt        = isPos(v("st_frt"))||isPos(v("st_flexion_rotation_test"));
    const cxFlex     = num(v("cx_flex"));
    const flexLimit  = cxFlex!==null && cxFlex<40;
    const unilateral = match(cc+loc,"one side","unilateral","left","right");
    const nausea     = match(cc+behav,"nausea","vomit","light");
    const neckMove   = match(aggr,"neck","turn","look","bend");
    const hits=[headache,frt,flexLimit,unilateral,neckMove].filter(Boolean).length;
    add("Cervical","Cervicogenic Headache","G44.841",hits,5,[
      headache&&"Headache/occipital pain (ICHD-3 cervicogenic criteria)",
      frt&&"Flexion-Rotation Test +ve — Sp 0.93 (Hall & Robinson 2010)",
      flexLimit&&`Cervical flexion restricted ${cxFlex}° (Maitland: C1-2 restriction)`,
      unilateral&&"Unilateral head/neck pain (DUT: C2-3 zygapophyseal referral)",
      neckMove&&"Neck movement aggravates headache (COOK clinical reasoning)"
    ],"Hall & Robinson FRT 2010; ICHD-3; Maitland Ch.6; DUT Ch.25");
  }

  // Cervical Disc Herniation
  {
    const spurling   = isPos(v("st_spurling"));
    const ultt       = isPos(v("st_upper_limb_tension"))||isPos(v("st_ultt"));
    const distract   = isPos(v("st_distraction"));
    const armRad     = match(rad,"arm","forearm","hand","finger");
    const dermatomal = txt(v("neuro_dermatomal"))||txt(v("n_c5"))||txt(v("n_c6"))||txt(v("n_c7"));
    const flexWorsen = match(aggr,"flex","sit","forward","bend");
    const nightPain  = match(behav,"night","sleep","rest");
    const hits=[spurling,ultt,armRad,dermatomal,flexWorsen].filter(Boolean).length;
    add("Cervical","Cervical Disc Herniation","M50.10",hits,5,[
      spurling&&"Spurling's +ve (foraminal compression — MAG Ch.4)",
      ultt&&"ULTT +ve (dural/neural tension — Butler: Mob NS)",
      distract&&"Distraction relieves (disc unloading — CYR)",
      armRad&&"Arm/hand radiation along dermatomal pattern",
      dermatomal&&"C5-C8 dermatomal/myotomal involvement (KEN)",
      flexWorsen&&"Flexion/sitting worsens (Maitland: disc directional preference)",
      nightPain&&"Night pain (COOK: chemical irritation pattern)"
    ],"MAG Ch.4; Butler NS Mob; Cyriax; Maitland; KEN Ch.5");
  }

  // Cervical Myelopathy — Cook et al. 2009
  {
    const hoffmann   = isPos(v("st_hoffmann"));
    const babinski   = isPos(v("st_babinski"));
    const invSupin   = isPos(v("st_inverted_supinator"));
    const gaitDist   = txt(v("gait_pattern")) && match(v("gait_pattern"),"atax","shuffl","spastic","wide","unstead");
    const bilateral  = match(rad+loc,"bilat","both","legs","arms");
    const clonus     = isPos(v("st_clonus"));
    const hits=[hoffmann,babinski,invSupin,gaitDist,clonus].filter(Boolean).length;
    add("Cervical","Cervical Myelopathy","G99.2",hits,5,[
      hoffmann&&"Hoffmann's Sign +ve — UMN (Cook et al. 2009: Sn 0.58, Sp 0.78)",
      babinski&&"Babinski +ve — UMN pathology (DUT: long tract signs)",
      invSupin&&"Inverted Supinator Sign +ve (MAG: C5-6 cord compression)",
      gaitDist&&"Gait disturbance — ataxic/spastic (NICE: urgent referral criteria)",
      clonus&&"Clonus present (NICE: red flag — refer neurology)",
      bilateral&&"Bilateral limb symptoms (red flag pattern)"
    ],"Cook et al. 2009; MAG Ch.4; DUT Ch.25; NICE Cervical Myelopathy Guideline");
  }

  // Thoracic Outlet Syndrome
  {
    const roos       = isPos(v("st_roos"))||isPos(v("st_east_test"));
    const adson      = isPos(v("st_adson"));
    const ultt       = isPos(v("st_ultt"))||isPos(v("st_upper_limb_tension"));
    const armFatigue = match(aggr+cc,"overhead","arm up","carry","fatigue");
    const ulnarDist  = match(rad+v("neuro_dermatomal")||"","ring","little","4th","5th","ulnar","medial forearm");
    const hits=[roos,adson,ultt,armFatigue,ulnarDist].filter(Boolean).length;
    add("Cervical/Thoracic","Thoracic Outlet Syndrome","G54.0",hits,5,[
      roos&&"ROOS/EAST Test +ve (3-min elevated arm stress — DUT)",
      adson&&"Adson's Test +ve (scalene compression — MAG Ch.4)",
      ultt&&"ULTT +ve (neurodynamic — Butler: Mob NS)",
      armFatigue&&"Overhead/arm elevation aggravates (positional compression)",
      ulnarDist&&"Ulnar/medial forearm distribution symptoms (C8-T1 — KEN)"
    ],"DUT Ch.26; MAG Ch.4; Butler NS Mob; KEN Ch.5");
  }

  // ═══════════════════════════════════════════════
  // LUMBAR SPINE
  // ═══════════════════════════════════════════════

  // Lumbar Disc Herniation — Devillé meta-analysis + Maitland
  {
    const slr        = isPos(v("st_slr_test"))||isPos(v("st_slr"));
    const crossedSlr = isPos(v("st_crossed_slr"))||isPos(v("st_well_leg_raise"));
    const lxFlex     = num(v("lx_flex"));
    const flexLimit  = lxFlex!==null && lxFlex<60;
    const legRad     = match(rad,"leg","foot","calf","buttock","below knee","thigh");
    const dermL      = txt(v("n_l4"))||txt(v("n_l5"))||txt(v("n_s1"));
    const flexWorsen = match(aggr,"sit","flex","forward","bend","sneeze","cough");
    const extEase    = match(ease,"stand","walk","extend","lie");
    const acuteOnset = match(onset,"sudden","acute","lift","bend");
    const hits=[slr,crossedSlr,flexLimit,legRad,dermL,flexWorsen].filter(Boolean).length;
    add("Lumbar","Lumbar Disc Herniation with Radiculopathy","M51.16",hits,6,[
      slr&&"SLR +ve — neural tension (Devillé 2000: Sn 0.92, Sp 0.28)",
      crossedSlr&&"Crossed SLR +ve — high specificity (Sp 0.90) for disc herniation",
      flexLimit&&`Lumbar flexion restricted ${lxFlex}° (Maitland: disc directional preference)`,
      legRad&&"Leg/foot radiation below knee (dermatomal pattern — KEN)",
      dermL&&"L4/L5/S1 neurological involvement (KEN myotomal testing)",
      flexWorsen&&"Sitting/flexion worsens — Valsalva aggravates (CYR: disc sign)",
      extEase&&"Extension/walking eases (Maitland McKenzie directional preference)",
      acuteOnset&&"Acute onset with loading mechanism"
    ],"Devillé 2000 SLR meta-analysis; Maitland Vertebral Manip; CYR; KEN Ch.8; COOK Ch.9");
  }

  // Lumbar Facet Syndrome — Maitland + Cyriax
  {
    const extPain    = match(v("lx_ext")||"","pain","limit","restrict");
    const noLegRad   = !match(rad,"below knee","calf","foot","leg");
    const morningS   = match(aggr+behav,"morning","stiff","activity","move");
    const palpTend   = match(palp,"facet","paravert","tender","zygapo");
    const pivm       = isPos(v("lx_pivm"))||match(v("lx_pivm")||"","restrict","stiff");
    const unilateral = match(loc,"one side","unilateral","left","right");
    const slrNeg     = isNeg(v("st_slr"))||(!isPos(v("st_slr_test"))&&!isPos(v("st_slr")));
    const age50      = age!==null && age>40;
    const hits=[extPain,noLegRad&&slrNeg,morningS,palpTend,pivm,age50].filter(Boolean).length;
    add("Lumbar","Lumbar Facet Syndrome","M47.816",hits,6,[
      extPain&&"Extension/side-flex loads posterior joints (Maitland: PA pressure reproduces)",
      noLegRad&&"No radiation below knee (Cyriax: differentiates from disc)",
      slrNeg&&"SLR negative (Maitland: rules out significant disc/nerve root)",
      morningS&&"Morning stiffness improves with movement (Maitland: grade III-IV indicated)",
      palpTend&&"Paravertebral/facet tenderness on palpation (Maitland PA pressures)",
      pivm&&"PIVM restricted/painful at affected segment (Maitland Vertebral Manip)",
      age50&&`Age >40: degenerative facet changes likely (NICE LBP guideline, age ${age}y)`
    ],"Maitland Vertebral Manipulation 8th ed.; Cyriax Orthopaedic Medicine; NICE LBP 2021; DUT Ch.22");
  }

  // Lumbar Canal Stenosis — Katz 1995 + Sugioka 2008
  {
    const bilateral  = match(rad+loc,"bilat","both leg","both limb");
    const walkLimit  = match(aggr,"walk","stand","extend","distance");
    const sitRelief  = match(ease,"sit","forward flex","lean","crouch","shop cart");
    const older      = age!==null && age>55;
    const extPain    = match(v("lx_ext")||"","pain","limit");
    const neuroclaud = match(cc,"claudic","cramp","heavy","numb","tingle") && match(aggr,"walk","stand");
    const hits=[bilateral,walkLimit,sitRelief,older,neuroclaud].filter(Boolean).length;
    add("Lumbar","Lumbar Canal Stenosis","M48.06",hits,5,[
      bilateral&&"Bilateral leg symptoms (Katz 1995: bilateral = more specific for stenosis)",
      walkLimit&&"Walking/standing distance limited (neurogenic claudication — DUT Ch.22)",
      sitRelief&&"Relief with sitting/forward flexion — 'shopping cart sign' (Sugioka 2008)",
      older&&`Age >55 (${age}y) — degenerative stenosis pattern (NICE)`,
      neuroclaud&&"Neurogenic claudication: cramp/heaviness/numbness on walking",
      extPain&&"Extension provokes/worsens symptoms (Maitland: canal narrowing)"
    ],"Katz et al. 1995; Sugioka 2008 CPR; Maitland; DUT Ch.22; NICE LBP 2021");
  }

  // SIJ Dysfunction — Laslett CPR + van der Wurff
  {
    const thighThrust= isPos(v("st_thigh_thrust"))||isPos(v("st_posterior_shear"));
    const compress   = isPos(v("st_sacral_compression"))||isPos(v("st_compression"));
    const distract   = isPos(v("st_sacral_distraction"))||isPos(v("st_distraction_sij"));
    const faber      = isPos(v("st_faber"))||isPos(v("st_patrick"));
    const gaenslen   = isPos(v("st_gaenslen"));
    const sijLoc     = match(loc,"sij","sacral","sacroiliac","posterior iliac","psis");
    const pelvicPain = match(loc+cc,"pelvi","groin","buttock") && !match(rad,"below knee");
    const hits=[thighThrust,compress,distract,faber,gaenslen,sijLoc].filter(Boolean).length;
    add("Lumbar/Pelvis","SIJ Dysfunction","M53.3",hits,6,[
      thighThrust&&"Thigh Thrust +ve — best single SIJ test (Laslett: Sn 0.88)",
      compress&&"Sacral Compression +ve (van der Wurff CPR: ≥3/5 = Sn 0.85, Sp 0.79)",
      distract&&"Sacral Distraction +ve (van der Wurff CPR)",
      faber&&"FABER +ve — hip/SIJ stress (MAG Ch.11)",
      gaenslen&&"Gaenslen's +ve — SIJ torsion stress (DUT Ch.27)",
      sijLoc&&"PSIS/sacral localised pain (Maitland: SIJ palpation)",
      pelvicPain&&"Pelvic/buttock pain without below-knee radiation"
    ],"Laslett et al. 2005; van der Wurff 2006 CPR; Maitland; MAG Ch.9; DUT Ch.27");
  }

  // Piriformis Syndrome
  {
    const freiberg   = isPos(v("st_freiberg"));
    const pace       = isPos(v("st_pace"));
    const beatty     = isPos(v("st_beatty"));
    const deepButtock= match(loc,"buttock","piriform","deep glut","sciatic notch");
    const irPain     = match(v("rom_hp_ir_r")||v("rom_hp_ir_l")||"","pain","limit","restrict");
    const slrPos     = isPos(v("st_slr_test"))||isPos(v("st_slr"));
    const hits=[freiberg,pace,beatty,deepButtock,irPain].filter(Boolean).length;
    add("Lumbar/Hip","Piriformis Syndrome","G57.00",hits,5,[
      freiberg&&"Freiberg's Test +ve — passive IR pain (MAG Ch.11)",
      pace&&"Pace's Test +ve — resisted ER/abd pain (DUT Ch.27)",
      beatty&&"Beatty's Test +ve — lateral decubitus hip abduction (MAG)",
      deepButtock&&"Deep buttock/piriformis point pain (Maitland: piriformis palpation)",
      irPain&&"Hip internal rotation provokes pain (CYR: non-capsular pattern)",
      slrPos&&"SLR may be positive (sciatic nerve irritation — BUT)"
    ],"Fishman et al.; MAG Ch.11; DUT Ch.27; CYR; BUT Mob NS");
  }

  // Spondylolisthesis
  {
    const stepDef    = match(palp+v("obs_deformity_description")||"","step","defect","shelf");
    const extPain    = match(v("lx_ext")||"","pain","limit");
    const young      = age!==null && age<30;
    const sport      = match(cc+onset,"gymnast","bowler","cricket","sport","extension sport");
    const slr        = isPos(v("st_slr_test"))||isPos(v("st_slr"));
    const hamTight   = match(v("kc_hamstring")||v("rom_hip_flex")||"","tight","limit","restrict");
    const hits=[stepDef,extPain,young&&sport,hamTight].filter(Boolean).length;
    add("Lumbar","Spondylolisthesis","M43.10",hits,4,[
      stepDef&&"Step deformity on palpation (MAG: spinous process step sign)",
      extPain&&"Extension provokes/worsens (MAG Ch.9: pars stress)",
      young&&sport&&`Young athlete (${age}y) with extension sport (COOK: pars interarticularis)`,
      hamTight&&"Hamstring tightness — protective guarding (DUT Ch.22)",
      slr&&"SLR may be positive if nerve root compromise (Maitland)"
    ],"MAG Ch.9; COOK Clinical Reasoning; DUT Ch.22; Maitland");
  }

  // Non-Specific LBP / Myofascial LBP
  {
    const lbpLoc     = match(loc,"low back","lumbar","lumb","lx");
    const noRad      = !match(rad,"below knee","leg","calf","foot");
    const slrNeg     = !isPos(v("st_slr_test"))&&!isPos(v("st_slr"));
    const noNeuro    = !txt(v("n_l4"))&&!txt(v("n_l5"))&&!txt(v("n_s1"));
    const palpTend   = match(palp,"tender","trigger","spasm","taut");
    const stressWork = match(v("s_psychosocial")||v("s_yellow_flag")||"","stress","work","anxiet","fear","depress");
    const hits=[lbpLoc,noRad&&slrNeg&&noNeuro,palpTend,stressWork].filter(Boolean).length;
    add("Lumbar","Non-Specific Low Back Pain / Myofascial","M54.50",hits,4,[
      lbpLoc&&"Lumbar region pain — no serious pathology identified",
      noRad&&slrNeg&&"No radiation, negative neural tension — non-radicular (NICE LBP)",
      palpTend&&"Myofascial trigger points / muscle spasm on palpation (COOK)",
      stressWork&&"Psychosocial/yellow flags present (NICE LBP 2021: biopsychosocial)",
      noNeuro&&"No neurological deficit (DUT: mechanical LBP)"
    ],"NICE LBP 2021; COOK Ch.9; DUT Ch.22; PAIN Butler & Moseley");
  }

  // ═══════════════════════════════════════════════
  // SHOULDER
  // ═══════════════════════════════════════════════

  // Rotator Cuff Tear — Hegedus meta-analysis
  {
    const emptyCan   = isPos(v("st_empty_can"))||isPos(v("st_supraspinatus"));
    const dropArm    = isPos(v("st_drop_arm"));
    const erLag      = isPos(v("st_external_rotation_lag"))||isPos(v("st_er_lag"));
    const painfulArc = isPos(v("st_painful_arc"));
    const sAbd       = num(v("rom_shr_abd_R"))||num(v("rom_shr_abd_L"))||num(v("rom_sabd"));
    const abdWeakness= sAbd!==null&&sAbd<90;
    const trauma     = match(onset+mech,"fall","trauma","lift","force");
    const nightPain  = match(behav,"night","sleep");
    const hits=[emptyCan,dropArm,erLag,painfulArc,abdWeakness,nightPain].filter(Boolean).length;
    add("Shoulder","Rotator Cuff Tear","M75.120",hits,6,[
      emptyCan&&"Empty Can (Jobe) +ve — supraspinatus (Hegedus 2012: Sn 0.69, Sp 0.66)",
      dropArm&&"Drop Arm Test +ve — massive tear (MAG Ch.5: Sp 0.98)",
      erLag&&"External Rotation Lag Sign +ve — infraspinatus (Hertel: Sp 0.98)",
      painfulArc&&"Painful Arc 60–120° — impingement/cuff tear (CYR: arc sign)",
      abdWeakness&&`Shoulder abduction restricted/weak ${sAbd}° (KEN Ch.4: deltoid/supraspinatus)`,
      nightPain&&"Night pain — inflammatory/full thickness tear (COOK)",
      trauma&&"Traumatic onset (MAG: acute tear mechanism)"
    ],"Hegedus et al. 2012 meta-analysis; MAG Ch.5; CYR; KEN Ch.4; Hertel lag signs");
  }

  // Subacromial Impingement
  {
    const neer       = isPos(v("st_neer"));
    const hawkins    = isPos(v("st_hawkins"))||isPos(v("st_hawkins_kennedy"));
    const painfulArc = isPos(v("st_painful_arc"));
    const emptyCan   = isPos(v("st_empty_can"));
    const overhead   = match(aggr,"overhead","reach","lift","arm above");
    const noDropArm  = !isPos(v("st_drop_arm"));
    const hits=[neer,hawkins,painfulArc,overhead,noDropArm&&emptyCan].filter(Boolean).length;
    add("Shoulder","Subacromial Impingement Syndrome","M75.1",hits,5,[
      neer&&"Neer Impingement Sign +ve (MAG Ch.5: Sn 0.72)",
      hawkins&&"Hawkins-Kennedy +ve — internal rotation impingement (Sn 0.80 — Hegedus)",
      painfulArc&&"Painful Arc 60–120° (CYR: classic impingement arc)",
      overhead&&"Overhead activity aggravates (DUT Ch.20: outlet impingement)",
      noDropArm&&"Drop arm negative — no full tear (CYR: differentiates from cuff tear)",
      emptyCan&&"Empty Can +ve (MAG: supraspinatus outlet compression)"
    ],"Hegedus et al. 2012; MAG Ch.5; CYR; DUT Ch.20; COOK shoulder chapter");
  }

  // Adhesive Capsulitis — Cyriax capsular pattern
  {
    const sER        = num(v("rom_shr_er_R"))||num(v("rom_shr_er_L"))||num(v("rom_ser"));
    const sAbd       = num(v("rom_shr_abd_R"))||num(v("rom_shr_abd_L"))||num(v("rom_sabd"));
    const sFlex      = num(v("rom_shr_flex_R"))||num(v("rom_shr_flex_L"))||num(v("rom_sflex"));
    const capsular   = (sER!==null&&sER<40)&&(sAbd!==null&&sAbd<90);
    const nightPain  = match(behav,"night","sleep","3am","wake");
    const gradOnset  = match(onset,"gradual","insidious","slow","months");
    const diabetes   = match(v("dem_pmh")||v("s_pmh")||"","diabet","dm","insulin");
    const allMotion  = (sER!==null&&sER<40)||(sAbd!==null&&sAbd<90)||(sFlex!==null&&sFlex<120);
    const hits=[capsular,nightPain,gradOnset,allMotion].filter(Boolean).length;
    add("Shoulder","Adhesive Capsulitis (Frozen Shoulder)","M75.0",hits,4,[
      capsular&&`Capsular pattern: ER ${sER}° < 40°, Abd ${sAbd}° < 90° (Cyriax: ER>Abd>Flex proportional loss)`,
      nightPain&&"Night pain — freezing phase (COOK: inflammatory phase)",
      gradOnset&&"Gradual/insidious onset over months (DUT Ch.20: stages)",
      diabetes&&"Diabetes/endocrine history — increased risk (MAG Ch.5)",
      allMotion&&"Global restriction all planes — empty end-feel (CYR: capsular end-feel)"
    ],"Cyriax Orthopaedic Medicine; MAG Ch.5; DUT Ch.20; COOK Clinical Reasoning");
  }

  // Biceps Tendinopathy / SLAP
  {
    const speeds     = isPos(v("st_speeds"));
    const yergason   = isPos(v("st_yergason"));
    const obriens    = isPos(v("st_obriens"))||isPos(v("st_active_compression"));
    const anterior   = match(loc,"anterior","bicipital groove","front","bicep");
    const overhead   = match(cc+aggr,"overhead","throw","rack","pull");
    const hits=[speeds,yergason,obriens,anterior,overhead].filter(Boolean).length;
    add("Shoulder","Biceps Tendinopathy / SLAP Lesion","M75.2",hits,5,[
      speeds&&"Speed's Test +ve — bicipital groove tenderness (MAG Ch.5: Sn 0.90)",
      yergason&&"Yergason's Test +ve — biceps resisted supination (MAG Ch.5)",
      obriens&&"O'Brien's Active Compression +ve (Liu 1996: SLAP Sn 0.90, Sp 0.98)",
      anterior&&"Anterior shoulder/bicipital groove pain (CYR: tendon palpation)",
      overhead&&"Overhead/throwing aggravates (DUT Ch.20: SLAP mechanism)"
    ],"Liu et al. 1996; MAG Ch.5; CYR; DUT Ch.20");
  }

  // AC Joint Pathology
  {
    const crossArm   = isPos(v("st_cross_arm"))||isPos(v("st_horizontal_adduction"));
    const obriens    = isPos(v("st_obriens"));
    const acTend     = match(palp+loc,"ac joint","acromioclavic","acromio");
    const crossAdPain= match(aggr,"cross body","reach across","adduct");
    const hits=[crossArm,obriens,acTend,crossAdPain].filter(Boolean).length;
    add("Shoulder","AC Joint Pathology","M75.5",hits,4,[
      crossArm&&"Cross-arm Adduction Test +ve (Chronopoulos 2004: Sn 0.77, Sp 0.79)",
      obriens&&"O'Brien's +ve at AC joint (MAG Ch.5: AC vs SLAP differentiation)",
      acTend&&"AC joint local tenderness on palpation (CYR: local anaesthetic test)",
      crossAdPain&&"Cross-body adduction/reach aggravates (DUT Ch.20)"
    ],"Chronopoulos et al. 2004; MAG Ch.5; CYR; DUT Ch.20");
  }

  // GH Instability
  {
    const apprehend  = isPos(v("st_apprehension"))||isPos(v("st_anterior_apprehension"));
    const relocation = isPos(v("st_relocation"));
    const sulcus     = isPos(v("st_sulcus_sign"));
    const young      = age!==null&&age<35;
    const sport      = match(cc+onset,"throw","sport","rugby","contact","gym");
    const hits=[apprehend,relocation,sulcus,young&&sport].filter(Boolean).length;
    add("Shoulder","Glenohumeral Instability","M25.311",hits,4,[
      apprehend&&"Anterior Apprehension +ve (MAG Ch.5: Sp 0.99 for anterior instability)",
      relocation&&"Relocation Test +ve — confirms anterior instability (DUT Ch.20)",
      sulcus&&"Sulcus Sign +ve — inferior instability/multidirectional (MAG Ch.5)",
      young&&sport&&`Young athletic patient (${age}y) — high risk group (COOK)`,
    ],"MAG Ch.5; DUT Ch.20; COOK Clinical Reasoning");
  }

  // ═══════════════════════════════════════════════
  // ELBOW
  // ═══════════════════════════════════════════════

  // Lateral Epicondylalgia
  {
    const cozen      = isPos(v("st_cozen"))||isPos(v("st_tennis_elbow"));
    const mill       = isPos(v("st_mill"));
    const maudsley   = isPos(v("st_maudsley"));
    const lateral    = match(loc,"lateral","outer","extensor","tennis","epicondyl");
    const grip       = match(aggr,"grip","jar","turn","wring","type");
    const tender     = match(palp,"lateral epicondyle","extensor","ECRB");
    const hits=[cozen,mill,maudsley,lateral,grip,tender].filter(Boolean).length;
    add("Elbow","Lateral Epicondylalgia (Tennis Elbow)","M77.1",hits,6,[
      cozen&&"Cozen's Test +ve — resisted wrist ext (MAG Ch.6: Sn 0.85)",
      mill&&"Mill's Test +ve — passive wrist flex stretches ECRB (CYR)",
      maudsley&&"Maudsley's Test +ve — resisted 3rd finger ext (MAG Ch.6)",
      lateral&&"Lateral elbow/extensor forearm pain (DUT Ch.17)",
      grip&&"Grip/wrist extension aggravates (COOK: tendinopathy load model)",
      tender&&"Lateral epicondyle/ECRB tenderness on palpation (CYR)"
    ],"MAG Ch.6; Cyriax Orthopaedic Medicine; DUT Ch.17; COOK tendinopathy model");
  }

  // Medial Epicondylalgia
  {
    const golfer     = isPos(v("st_golfer_elbow"))||isPos(v("st_medial_epicondyle"));
    const medial     = match(loc,"medial","inner","flexor","golfer");
    const flexGrip   = match(aggr,"grip","flex","wrist","throw");
    const hits=[golfer,medial,flexGrip].filter(Boolean).length;
    add("Elbow","Medial Epicondylalgia (Golfer's Elbow)","M77.0",hits,3,[
      golfer&&"Medial Epicondyle Stress Test +ve (MAG Ch.6)",
      medial&&"Medial elbow/flexor forearm pain (CYR: common flexor origin)",
      flexGrip&&"Grip/wrist flexion aggravates (COOK: tendinopathy load)"
    ],"MAG Ch.6; CYR; COOK tendinopathy continuum");
  }

  // Cubital Tunnel Syndrome
  {
    const tinelElbow = isPos(v("st_tinel_elbow"))||isPos(v("st_tinel_cubital"));
    const elbowFlex  = isPos(v("st_elbow_flexion_test"));
    const ringLittle = match(rad+v("neuro_dermatomal")||"","ring","little","4th","5th","ulnar","medial forearm");
    const nightTing  = match(behav+cc,"tingle","numb","pins","night","sleep elbow bent");
    const hits=[tinelElbow,elbowFlex,ringLittle,nightTing].filter(Boolean).length;
    add("Elbow","Cubital Tunnel Syndrome","G56.20",hits,4,[
      tinelElbow&&"Tinel's at cubital tunnel +ve (Novak: Sn 0.70, Sp 0.98)",
      elbowFlex&&"Elbow Flexion Test +ve — sustained flexion reproduces (MAG Ch.6)",
      ringLittle&&"Ring/little finger paraesthesia — ulnar nerve (KEN; BUT)",
      nightTing&&"Night symptoms when elbow flexed (DUT Ch.17: positional compression)"
    ],"Novak et al.; MAG Ch.6; KEN; Butler Mob NS; DUT Ch.17");
  }

  // ═══════════════════════════════════════════════
  // WRIST / HAND
  // ═══════════════════════════════════════════════

  // Carpal Tunnel Syndrome — Wainner CPR 2005
  {
    const phalen     = isPos(v("st_phalen"));
    const tinelW     = isPos(v("st_tinel_wrist"))||isPos(v("st_tinel"));
    const flick      = isPos(v("st_flick_sign"));
    const carpComp   = isPos(v("st_carpal_compression"));
    const thumbIndex = match(rad+v("neuro_dermatomal")||"","thumb","index","middle","median","lateral 3");
    const nightSymp  = match(behav,"night","wake","shake","flick");
    const age35f     = sex.includes("f") && age!==null && age>35;
    const hits=[phalen,tinelW,flick,carpComp,thumbIndex,nightSymp].filter(Boolean).length;
    add("Wrist","Carpal Tunnel Syndrome","G56.00",hits,6,[
      phalen&&"Phalen's Test +ve (Wainner CPR 2005: Sn 0.75)",
      tinelW&&"Tinel's at wrist +ve (BUT: median nerve mechanosensitivity)",
      flick&&"Flick Sign +ve — shaking relieves (DUT Ch.18: Sn 0.93)",
      carpComp&&"Carpal Compression Test +ve (Durkan: Sp 0.97)",
      thumbIndex&&"Thumb/index/middle finger — median nerve distribution (KEN Ch.5)",
      nightSymp&&"Night symptoms — position-dependent compression (CYR)",
      age35f&&`Female >35y (${age}y) — highest risk demographic (COOK)`
    ],"Wainner et al. 2005 CPR; DUT Ch.18; Durkan 1991; CYR; KEN Ch.5; BUT Mob NS");
  }

  // De Quervain's Tenosynovitis
  {
    const finkelstein= isPos(v("st_finkelstein"));
    const thumbBase  = match(loc,"thumb","radial","de quervain","first","snuffbox");
    const newMother  = match(v("dem_pmh")||cc+onset,"post partum","new mother","baby","infant","carry");
    const hits=[finkelstein,thumbBase,newMother].filter(Boolean).length;
    add("Wrist","De Quervain's Tenosynovitis","M65.4",hits,3,[
      finkelstein&&"Finkelstein's Test +ve (MAG Ch.7: Sn 0.81, Sp 0.50 — high Sn)",
      thumbBase&&"Thumb base/radial styloid pain (CYR: APL/EPB tendon)",
      newMother&&"Post-partum/new parent — repetitive infant carrying (DUT Ch.18)"
    ],"MAG Ch.7; CYR; DUT Ch.18");
  }

  // ═══════════════════════════════════════════════
  // HIP
  // ═══════════════════════════════════════════════

  // Hip OA — Sutlive CPR 2008 + Cyriax capsular pattern
  {
    const hipFlex    = num(v("rom_hp_flex_R"))||num(v("rom_hp_flex_L"))||num(v("rom_hflex"));
    const hipIR      = num(v("rom_hp_ir_R"))||num(v("rom_hp_ir_L"))||num(v("rom_hir"));
    const hipAbd     = num(v("rom_hp_abd_R"))||num(v("rom_hp_abd_L"));
    const capsular   = (hipFlex!==null&&hipFlex<100)&&(hipIR!==null&&hipIR<15);
    const faber      = isPos(v("st_faber"))||isPos(v("st_patrick"));
    const groin      = match(loc,"groin","anterior hip","hip joint","c-sign");
    const scour      = isPos(v("st_scour"))||isPos(v("st_quadrant"));
    const crepitus   = isPos(v("st_crepitus"))||match(v("obs_general_notes")||"","crepitus","creak");
    const older      = age!==null&&age>45;
    const hits=[capsular,faber,groin,scour,crepitus,older].filter(Boolean).length;
    add("Hip","Hip Osteoarthritis","M16.10",hits,6,[
      capsular&&`Cyriax capsular pattern: Flex ${hipFlex}° (<100°), IR ${hipIR}° (<15°) — proportional loss`,
      faber&&"FABER +ve — hip/SIJ stress (Sutlive CPR 2008 criterion)",
      groin&&"Anterior hip/groin 'C-sign' pain (Sutlive CPR: location criterion)",
      scour&&"Scour/Quadrant Test +ve — acetabular loading (MAG Ch.11)",
      crepitus&&"Crepitus on movement (DUT Ch.26: articular degeneration)",
      older&&`Age >45 (${age}y) — primary OA most likely (NICE Hip OA guideline)`
    ],"Sutlive et al. 2008 CPR; Cyriax capsular pattern; MAG Ch.11; DUT Ch.26; NICE Hip OA");
  }

  // FAI
  {
    const fadir      = isPos(v("st_fadir"))||isPos(v("st_impingement_hip"));
    const faber      = isPos(v("st_faber"))||isPos(v("st_patrick"));
    const groin      = match(loc,"groin","anterior hip","deep hip");
    const young      = age!==null&&age<40;
    const sport      = match(cc+onset,"sport","run","squat","pivot","football","hockey");
    const hipIR      = num(v("rom_hp_ir_R"))||num(v("rom_hp_ir_L"));
    const irLimit    = hipIR!==null&&hipIR<20;
    const hits=[fadir,faber,groin,young&&sport,irLimit].filter(Boolean).length;
    add("Hip","Femoroacetabular Impingement (FAI)","M24.85",hits,5,[
      fadir&&"FADIR Test +ve (Reiman 2015 meta-analysis: Sn 0.87 for FAI)",
      faber&&"FABER +ve — anterior/lateral hip stress (MAG Ch.11)",
      groin&&"Deep groin/anterior hip pain (DUT Ch.26: cam/pincer pattern)",
      young&&sport&&`Young active patient (${age}y) — cam/pincer most likely (COOK)`,
      irLimit&&`Hip IR restricted ${hipIR}° (Cyriax: early capsular restriction in FAI)`
    ],"Reiman et al. 2015 meta-analysis; MAG Ch.11; DUT Ch.26; CYR; COOK");
  }

  // Greater Trochanteric Pain Syndrome
  {
    const ober       = isPos(v("st_ober"));
    const lateral    = match(loc,"lateral hip","greater trochanter","GTPS","ITB","outer hip");
    const palpTend   = match(palp+loc,"trochanter","gtps","gluteus med");
    const femAdPain  = match(aggr,"cross leg","adduct","lie on side","single leg");
    const hits=[ober,lateral,palpTend,femAdPain].filter(Boolean).length;
    add("Hip","Greater Trochanteric Pain Syndrome","M70.60",hits,4,[
      ober&&"Ober's Test +ve — ITB/TFL tightness (MAG Ch.11)",
      lateral&&"Lateral hip/greater trochanteric pain (Grimaldi & Fearon: tendinopathy model)",
      palpTend&&"Trochanteric tenderness on palpation (DUT Ch.26: gluteal tendinopathy)",
      femAdPain&&"Cross-leg adduction/side-lying aggravates (Grimaldi: compressive load)"
    ],"Grimaldi & Fearon; MAG Ch.11; DUT Ch.26; COOK tendinopathy model");
  }

  // ═══════════════════════════════════════════════
  // KNEE
  // ═══════════════════════════════════════════════

  // ACL Injury — Benjaminse meta-analysis
  {
    const lachman    = isPos(v("st_lachman"));
    const antDrawer  = isPos(v("st_anterior_drawer_knee"))||isPos(v("st_anterior_drawer"));
    const pivot      = isPos(v("st_pivot_shift"));
    const trauma     = match(onset+mech,"twist","plant","cut","pivot","sport","land","decel");
    const effusion   = isPos(v("obs_swelling_present"))||match(cc+v("s_chief_complaint")||"","swell","haemarthrosis","effusion");
    const instability= match(cc,"give","buckle","unstable","give way");
    const hits=[lachman,antDrawer,pivot,trauma,effusion].filter(Boolean).length;
    add("Knee","ACL Injury","S83.511A",hits,5,[
      lachman&&"Lachman's Test +ve — gold standard (Benjaminse 2006: Sn 0.85, Sp 0.94)",
      antDrawer&&"Anterior Drawer +ve (MAG Ch.12)",
      pivot&&"Pivot Shift +ve — anterolateral instability (Sp 0.98 — Benjaminse)",
      trauma&&"Twisting/pivoting/deceleration mechanism (DUT Ch.23: ACL injury pattern)",
      effusion&&"Acute haemarthrosis — ACL tear until proven otherwise (COOK)",
      instability&&"Giving way/buckling (MAG Ch.12: functional instability)"
    ],"Benjaminse et al. 2006 meta-analysis; MAG Ch.12; DUT Ch.23; COOK");
  }

  // Meniscal Tear — Hegedus + Karachalios
  {
    const mcmurray   = isPos(v("st_mcmurray"));
    const thessaly   = isPos(v("st_thessaly"));
    const apley      = isPos(v("st_apley"));
    const jointLine  = match(loc+palp,"joint line","medial joint","lateral joint");
    const twistMech  = match(onset+mech,"twist","squat","kneel","rot");
    const lockingCC  = match(cc,"lock","catch","click","block");
    const hits=[mcmurray,thessaly,apley,jointLine,lockingCC].filter(Boolean).length;
    add("Knee","Meniscal Tear","S83.200A",hits,5,[
      mcmurray&&"McMurray's +ve (MAG Ch.12: Sn 0.53, Sp 0.59 — best with cluster)",
      thessaly&&"Thessaly Test +ve at 20° (Karachalios 2005: Sn 0.89, Sp 0.97 — most accurate)",
      apley&&"Apley's Compression +ve (MAG Ch.12: prone tibial compression)",
      jointLine&&"Joint line tenderness (DUT Ch.23: Sn 0.63 — location criterion)",
      twistMech&&"Twisting/squatting mechanism (COOK: meniscal loading pattern)",
      lockingCC&&"Locking/catching/clicking (MAG Ch.12: bucket-handle pattern)"
    ],"Karachalios et al. 2005; Hegedus meta-analysis; MAG Ch.12; DUT Ch.23; COOK");
  }

  // Patellofemoral Pain
  {
    const clarke     = isPos(v("st_clarke"))||isPos(v("st_patella_grind"));
    const stairSquat = match(aggr,"stair","squat","sit","kneel","prolonged","theater","cinema");
    const anterior   = match(loc,"anterior","front","peripatellar","retropatellar","kneecap");
    const young      = age!==null&&age<35;
    const crepitus   = isPos(v("st_crepitus"))||match(cc,"crunch","grind","creak");
    const hits=[clarke,stairSquat,anterior,young].filter(Boolean).length;
    add("Knee","Patellofemoral Pain Syndrome","M22.2",hits,4,[
      clarke&&"Clarke's Sign +ve (MAG Ch.12: patellar compression)",
      stairSquat&&"Stairs/squatting/prolonged sitting aggravates — 'theater sign' (DUT Ch.23)",
      anterior&&"Anterior/peripatellar/retropatellar pain (COOK: PFJ load pattern)",
      young&&`Young patient (${age}y) — most common knee pain 15–35y (Nijs et al.)`,
      crepitus&&"Crepitus on movement (MAG Ch.12: articular surface)"
    ],"Nijs et al.; MAG Ch.12; DUT Ch.23; COOK patellofemoral chapter");
  }

  // Knee OA — Altman criteria 1986
  {
    const kFlex      = num(v("rom_knl_flex_R"))||num(v("rom_knl_flex_L"))||num(v("rom_kflex"));
    const flexLimit  = kFlex!==null&&kFlex<110;
    const crepitus   = isPos(v("st_crepitus"))||match(v("obs_general_notes")||"","crepitus");
    const older      = age!==null&&age>50;
    const varus      = match(v("obs_posture_lower")||"","varum","varus","bow");
    const morningS   = match(behav+aggr,"morning","stiff") && match(ease,"move","warm","walk");
    const bonyEng    = match(palp,"bony","osteophyte","enlarge");
    const hits=[flexLimit,crepitus,older,varus,morningS].filter(Boolean).length;
    add("Knee","Knee Osteoarthritis","M17.11",hits,5,[
      flexLimit&&`Knee flexion restricted ${kFlex}° (CYR: capsular pattern — flex>ext)`,
      crepitus&&"Crepitus on movement (Altman 1986 criteria)",
      older&&`Age >50 (${age}y) — primary OA most common (NICE Knee OA guideline)`,
      varus&&"Varus deformity — medial compartment (MAG Ch.12)",
      morningS&&"Morning stiffness <30 min improves with movement (Altman criteria)",
      bonyEng&&"Bony enlargement on palpation (Altman criteria: osteophytes)"
    ],"Altman et al. 1986 criteria; CYR capsular pattern; MAG Ch.12; DUT Ch.23; NICE Knee OA");
  }

  // ITB Syndrome
  {
    const obers      = isPos(v("st_ober"));
    const noble      = isPos(v("st_noble_compression"));
    const lateral    = match(loc,"lateral knee","ITB","outer knee","iliotibial");
    const runner     = match(cc+aggr,"run","cycle","downhill","distance","repeat");
    const hits=[obers,noble,lateral,runner].filter(Boolean).length;
    add("Knee","ITB Syndrome","M76.3",hits,4,[
      obers&&"Ober's Test +ve — ITB tightness (MAG Ch.11)",
      noble&&"Noble Compression Test +ve at 30° (MAG Ch.12: 2cm above lat epicondyle)",
      lateral&&"Lateral knee pain at ITB insertion (DUT Ch.23)",
      runner&&"Running/cycling/downhill aggravates (COOK: friction model)"
    ],"MAG Ch.11-12; DUT Ch.23; COOK tendinopathy model");
  }

  // Patellar Tendinopathy
  {
    const patellarTend= match(palp+loc,"patellar tendon","inferior pole","infrapatellar");
    const jumpSport   = match(cc+aggr,"jump","land","run","sport","basketball","volley");
    const squat       = match(aggr,"squat","lunge","stairs","load");
    const young2      = age!==null&&age<40;
    const hits=[patellarTend,jumpSport,squat,young2].filter(Boolean).length;
    add("Knee","Patellar Tendinopathy","M76.5",hits,4,[
      patellarTend&&"Patellar tendon/inferior pole tenderness (COOK: tendinopathy continuum)",
      jumpSport&&"Jumping/landing sport — 'jumper's knee' (DUT Ch.23)",
      squat&&"Squatting/loading aggravates (COOK: reactive tendinopathy load)",
      young2&&`Young active patient (${age}y) — peak incidence 15–35y`
    ],"COOK tendinopathy continuum; DUT Ch.23; MAG Ch.12");
  }

  // ═══════════════════════════════════════════════
  // ANKLE / FOOT
  // ═══════════════════════════════════════════════

  // Lateral Ankle Sprain
  {
    const antDrawerA = isPos(v("st_anterior_drawer_ankle"));
    const talarTilt  = isPos(v("st_talar_tilt"));
    const lateralAnk = match(loc,"lateral","outer","CFL","ATFL","peroneal","fibula");
    const inversion  = match(onset+mech,"inversion","roll","twist","land","turn over");
    const effusion   = isPos(v("obs_swelling_present"))||match(cc,"swell","bruise");
    const hits=[antDrawerA,talarTilt,lateralAnk,inversion,effusion].filter(Boolean).length;
    add("Ankle","Lateral Ankle Sprain (ATFL/CFL)","S93.401A",hits,5,[
      antDrawerA&&"Anterior Drawer (ankle) +ve — ATFL laxity (van Dijk: Sn 0.73, Sp 0.97 at 5d)",
      talarTilt&&"Talar Tilt +ve — CFL laxity (MAG Ch.13)",
      lateralAnk&&"Lateral ankle/fibular pain (DUT Ch.25)",
      inversion&&"Inversion/rolling mechanism (Ottawa Ankle Rules: mechanism)",
      effusion&&"Swelling/bruising — ATFL/CFL disruption (COOK)"
    ],"van Dijk 1996; Ottawa Ankle Rules; MAG Ch.13; DUT Ch.25; COOK");
  }

  // Achilles Tendinopathy — Cook & Purdam
  {
    const arcSign    = isPos(v("st_arc_sign"))||isPos(v("st_royal_london"));
    const thompson   = isPos(v("st_thompson"))||isPos(v("st_simmonds"));
    const posterior  = match(loc,"achilles","posterior heel","tendon","mid-tendon");
    const morningS   = match(behav+aggr,"morning","first step","stiff","warm up");
    const running    = match(aggr+cc,"run","walk","sport","jump","load");
    const hits=[arcSign,posterior,morningS,running,!thompson].filter(Boolean).length;
    add("Ankle","Achilles Tendinopathy","M76.6",hits,5,[
      arcSign&&"Arc Sign +ve — tendon nodule moves with ankle (Royal London Hospital Test)",
      posterior&&"Posterior heel/mid-tendon pain (COOK: tendinopathy continuum)",
      morningS&&"Morning stiffness, 'warm-up' pattern (COOK: reactive/degenerative)",
      running&&"Running/loading aggravates (COOK: load management principle)",
      !thompson&&"Thompson Test negative — no rupture (MAG Ch.13: differentiates rupture)"
    ],"COOK & Purdam tendinopathy continuum; MAG Ch.13; DUT Ch.25");
  }

  // Plantar Fasciitis
  {
    const windlass   = isPos(v("st_windlass"));
    const heel       = match(loc,"plantar","heel","sole","arch","medial calcan");
    const firstStep  = match(behav+aggr,"morning","first step","get up","out of bed");
    const bmi30      = bmi!==null&&bmi>28;
    const hits=[windlass,heel,firstStep,bmi30].filter(Boolean).length;
    add("Ankle","Plantar Fasciitis","M72.2",hits,4,[
      windlass&&"Windlass Test +ve — passive great toe extension (Owens: Sn 0.32, Sp 0.100)",
      heel&&"Plantar heel/medial calcaneal pain (DUT Ch.25: enthesopathy)",
      firstStep&&"Worst on first steps in morning — 'start-up pain' (COOK: fascia loading)",
      bmi30&&`BMI ${bmi} >28 — significant risk factor (NICE: weight management)`
    ],"Owens et al.; MAG Ch.13; DUT Ch.25; COOK; NICE musculoskeletal foot");
  }

  // Peroneal Tendinopathy
  {
    const lateral2   = match(loc,"peroneal","lateral ankle","fibula","outer ankle");
    const inversion2 = match(onset+mech,"inversion","sprain","ankle","roll");
    const eversion   = match(v("rom_af_eversion")||"","pain","weak","resist");
    const hits=[lateral2,inversion2,eversion].filter(Boolean).length;
    add("Ankle","Peroneal Tendinopathy","M76.7",hits,3,[
      lateral2&&"Lateral ankle/peroneal groove pain (DUT Ch.25: peroneal tendon)",
      inversion2&&"Previous inversion sprain history (MAG Ch.13: mechanism)",
      eversion&&"Pain/weakness on resisted eversion (CYR: peroneal testing)"
    ],"MAG Ch.13; CYR; DUT Ch.25");
  }

  // ═══════════════════════════════════════════════
  // GENERAL / SYSTEMIC
  // ═══════════════════════════════════════════════

  // Central Sensitisation — PAIN Butler & Moseley
  {
    const widespread = match(loc+cc,"widespread","whole body","multiple","everywhere");
    const allodyn    = match(cc+behav,"light touch","clothing","wind","allodyn");
    const disproportionate = match(cc+v("s_yellow_flag")||"","worse than","severe","excruciating","10/10");
    const yellow     = txt(v("s_psychosocial"))||txt(v("s_yellow_flag"));
    const sleepIssue = match(behav,"sleep","insomnia","fatigue","tired");
    const hits=[widespread,allodyn,disproportionate,yellow,sleepIssue].filter(Boolean).length;
    add("General","Central Sensitisation / Nociplastic Pain","M79.7",hits,5,[
      widespread&&"Widespread/multi-site pain (PAIN: central sensitisation pattern)",
      allodyn&&"Allodynia — pain to light touch (PAIN Butler & Moseley: CS)",
      disproportionate&&"Disproportionate pain response (COOK: CS flags)",
      yellow&&"Psychosocial yellow flags present (NICE: biopsychosocial model)",
      sleepIssue&&"Sleep disturbance/fatigue (PAIN: neuroplastic changes)"
    ],"Butler & Moseley — Explain Pain; COOK Ch.3; NICE LBP 2021 biopsychosocial");
  }

  // Fibromyalgia
  {
    const widespread2= match(loc+cc,"widespread","fibromyalg","all over","multiple site");
    const fatigue    = match(cc+behav,"fatigue","exhausted","tired","fog","cognit");
    const tender11   = match(palp+cc,"tender point","11/18","fibro","diffuse tender");
    const female     = sex.includes("f");
    const age30_60   = age!==null&&age>25&&age<65;
    const hits=[widespread2,fatigue,tender11,female&&age30_60].filter(Boolean).length;
    add("General","Fibromyalgia","M79.7",hits,4,[
      widespread2&&"Widespread musculoskeletal pain (ACR 2010: widespread pain index)",
      fatigue&&"Fatigue/cognitive symptoms (ACR 2010: symptom severity scale)",
      tender11&&"Multiple tender points (ACR 1990: ≥11/18 tender points)",
      female&&age30_60&&`Female, ${age}y — highest prevalence group (DUT; PAIN)`
    ],"ACR 1990/2010 criteria; PAIN Butler & Moseley; DUT; COOK biopsychosocial");
  }

  // Hypermobility Spectrum Disorder
  {
    const beighton   = num(v("st_beighton"))||num(v("beighton_score"));
    const hypermob   = beighton!==null&&beighton>=4;
    const multiJoint = match(loc+cc,"multiple joint","hypermob","lax","loose","flexible","unstable");
    const clicks     = match(cc+behav,"click","pop","sublux","dislocat");
    const young3     = age!==null&&age<40;
    const hits=[hypermob,multiJoint,clicks,young3&&multiJoint].filter(Boolean).length;
    add("General","Hypermobility Spectrum Disorder","M35.7",hits,4,[
      hypermob&&`Beighton Score ${beighton}/9 ≥ 4 (Grahame: HSD criteria)`,
      multiJoint&&"Multi-joint hypermobility/instability (DUT: connective tissue)",
      clicks&&"Recurrent clicking/subluxation (MAG: joint laxity pattern)",
      young3&&multiJoint&&`Young patient (${age}y) — peak presentation (Grahame)`
    ],"Grahame HSD criteria; DUT; MAG; COOK");
  }

  results.sort((a,b)=>b.confidence-a.confidence||b.hits-a.hits);
  return results;
}

export function getTopDiagnoses(data,n=3){ return runDiagnosisEngine(data).slice(0,n); }

/**
 * ALL_DIAGNOSES — complete flat list for dropdown
 * Used in Assessment section so no diagnosis name is ever missing
 */
export const ALL_DIAGNOSES = [
  // Cervical
  "Cervical Radiculopathy","Cervical Facet Syndrome","Cervical Disc Herniation",
  "Cervicogenic Headache","Cervical Myelopathy","Cervical Spondylosis","Upper Cervical Instability",
  "Thoracic Outlet Syndrome","Cervical Sprain/Strain","Cervical Canal Stenosis",
  "C1-C2 Instability","Cervical Myofascial Pain","Post-Whiplash Associated Disorder",
  // Thoracic
  "Thoracic Facet Syndrome","Thoracic Disc Herniation","Thoracic Outlet Syndrome",
  "Costochondritis","Rib Stress Fracture","Scheuermann's Disease","Thoracic Myofascial Pain",
  // Lumbar
  "Lumbar Disc Herniation with Radiculopathy","Lumbar Facet Syndrome","Lumbar Canal Stenosis",
  "SIJ Dysfunction","Spondylolisthesis","Piriformis Syndrome","Non-Specific Low Back Pain",
  "Lumbar Myofascial Pain","Lumbar Spondylosis","Cauda Equina Syndrome","Lumbar Stress Fracture",
  "Ankylosing Spondylitis","Lumbar Radiculopathy (L4)","Lumbar Radiculopathy (L5)","Lumbar Radiculopathy (S1)",
  // Shoulder
  "Rotator Cuff Tear (Supraspinatus)","Rotator Cuff Tear (Infraspinatus)","Rotator Cuff Tear (Subscapularis)",
  "Subacromial Impingement Syndrome","Adhesive Capsulitis (Frozen Shoulder)","Biceps Tendinopathy",
  "SLAP Lesion","AC Joint Pathology","Glenohumeral Instability","Calcific Tendinopathy",
  "Shoulder OA","Rotator Cuff Tendinopathy","Long Head Biceps Rupture","Brachial Neuritis (Parsonage-Turner)",
  // Elbow
  "Lateral Epicondylalgia (Tennis Elbow)","Medial Epicondylalgia (Golfer's Elbow)",
  "Cubital Tunnel Syndrome","Radial Tunnel Syndrome","Elbow OA","Olecranon Bursitis",
  "Biceps Tendon Rupture (distal)","Pronator Teres Syndrome","Posterior Interosseous Nerve Syndrome",
  // Wrist/Hand
  "Carpal Tunnel Syndrome","De Quervain's Tenosynovitis","TFCC Tear","Scaphoid Fracture",
  "Wrist OA","Ganglion Cyst","Ulnar Nerve Entrapment","Kienbock's Disease",
  "Trigger Finger","Dupuytren's Contracture","CMC Joint OA (Thumb)","Skier's Thumb (UCL)",
  // Hip
  "Hip OA","Femoroacetabular Impingement (FAI)","Hip Labral Tear",
  "Greater Trochanteric Pain Syndrome","Piriformis Syndrome","Snapping Hip Syndrome",
  "Psoas Tendinopathy","Hip Stress Fracture","Avascular Necrosis Hip","Gluteal Tendinopathy",
  "Hamstring Origin Tendinopathy","Ischial Bursitis",
  // Knee
  "ACL Injury","PCL Injury","MCL Sprain","LCL Sprain","Meniscal Tear (Medial)",
  "Meniscal Tear (Lateral)","Patellofemoral Pain Syndrome","Knee OA","ITB Syndrome",
  "Patellar Tendinopathy","Pes Anserinus Bursitis","Hoffa's Fat Pad Syndrome",
  "Osgood-Schlatter Disease","Plica Syndrome","Prepatellar Bursitis","Knee Effusion",
  // Ankle/Foot
  "Lateral Ankle Sprain (ATFL/CFL)","High Ankle Sprain (Syndesmosis)","Achilles Tendinopathy",
  "Achilles Rupture","Plantar Fasciitis","Peroneal Tendinopathy","Tibialis Posterior Tendinopathy",
  "Anterior Ankle Impingement","Posterior Ankle Impingement","Sinus Tarsi Syndrome",
  "Hallux Valgus","Morton's Neuroma","Stress Fracture (Foot/Ankle)","Tarsal Tunnel Syndrome",
  "Sesamoiditis","Tibialis Anterior Tendinopathy",
  // Neurological
  "Cervical Myelopathy","Lumbar Myelopathy","Peripheral Neuropathy","Meralgia Paraesthetica",
  "Tarsal Tunnel Syndrome","Brachial Plexus Injury","Complex Regional Pain Syndrome",
  // General
  "Myofascial Pain Syndrome","Fibromyalgia","Central Sensitisation / Nociplastic Pain",
  "Hypermobility Spectrum Disorder","Referred Pain (visceral)","Osteoporosis",
  "Rheumatoid Arthritis","Reactive Arthritis","Psoriatic Arthritis","Gout","Pseudogout",
  "Somatic Symptom Disorder","Chronic Widespread Pain"
];

// ─────────────────────────────────────────────────────────────────────────────
// NEUROLOGICAL PATTERN MATCHING ENGINE
// Added as a second pass after runDiagnosisEngine — reads dermatome/myotome/
// reflex/neural-tension keys stored by PhysioNeuro.jsx and generates specific
// nerve-root level diagnoses with confidence boosted when the full clinical
// triad (sensory + motor + reflex) is present at the same level.
// ─────────────────────────────────────────────────────────────────────────────

export function runNeuroPatternEngine(data) {
  if (!data) return [];
  const d = data;
  const results = [];

  // ── helpers ────────────────────────────────────────────────────────────────
  const pos  = k => { const v = String(d[k]||"").toLowerCase(); return v.includes("positive")||v.includes("+ve")||v==="present"||v==="yes"; };
  const abn  = k => { const v = String(d[k]||""); return v.length>0 && !v.startsWith("Normal") && !v.startsWith("5"); };
  const dim  = k => { const v = String(d[k]||"").toLowerCase(); return v.includes("diminish")||v.includes("absent")||v.includes("reduced")||v.includes("0")||v.includes("1+"); };
  const sidedAbn = (base) => abn(base+"_left")||abn(base+"_right");
  const sidedPos = (base) => pos(base+"_left")||pos(base+"_right");
  const sidedDim = (base) => dim(base+"_left")||dim(base+"_right");

  const push = (region, diagnosis, icd10, confidence, findings, refs, urgency) => {
    const label = urgency==="EMERGENCY"?"EMERGENCY":urgency==="URGENT"?"URGENT":confidence>=80?"High":confidence>=55?"Moderate":"Low";
    results.push({
      region, diagnosis, icd10,
      confidence, confidenceLabel: label,
      supportingFindings: findings.filter(Boolean),
      hits: findings.filter(Boolean).length,
      total: findings.length,
      reference: refs,
      urgency: urgency||null,
    });
  };

  // ── UMN / MYELOPATHY — highest priority ────────────────────────────────────
  const babinski   = sidedPos("n_ref_babinski");
  const hoffmann   = sidedPos("n_ref_hoffmann");
  const clonus     = sidedPos("n_ref_clonus_ankle")||sidedPos("n_ref_clonus_knee")||sidedPos("n_ref_clonus_wrist");
  const trommer    = sidedPos("n_ref_trommer");
  const pronDrift  = sidedPos("n_ref_pronator");
  const hyperref   = Object.keys(d).some(k=>k.startsWith("n_ref_")&&!k.includes("babinski")&&!k.includes("hoffmann")&&!k.includes("clonus")&&String(d[k]).toLowerCase().includes("hyper"));

  const umnCount = [babinski,hoffmann,clonus,trommer,pronDrift].filter(Boolean).length;
  if (umnCount >= 2) {
    push("Neurological","Cervical Myelopathy / Cord Compression","G99.2",
      Math.min(95, 60 + umnCount*8),
      [
        babinski  && "Babinski Sign +ve — corticospinal tract lesion (UMN)",
        hoffmann  && "Hoffmann's Sign +ve — C8/T1 cord involvement (Cook 2009)",
        clonus    && "Sustained Clonus +ve — UMN hyperexcitability (>3 beats)",
        trommer   && "Trömner's Sign +ve — cervical cord UMN pattern",
        pronDrift && "Pronator Drift +ve — contralateral corticospinal lesion",
        hyperref  && "Hyperreflexia noted — loss of descending inhibition",
      ],
      "Cook et al. 2009; Maitland Cervical; MAG Ch.4; DUT Ch.25; NICE Myelopathy",
      "URGENT"
    );
  } else if (umnCount === 1) {
    push("Neurological","Possible Myelopathy — Screen Further","G99.2",
      50,
      [
        babinski  && "Babinski Sign +ve",
        hoffmann  && "Hoffmann's Sign +ve",
        clonus    && "Clonus +ve",
        trommer   && "Trömner's Sign +ve",
      ],
      "Cook et al. 2009; MAG Ch.4",
      "URGENT"
    );
  }

  // ── CAUDA EQUINA ───────────────────────────────────────────────────────────
  const caudaFlag   = pos("nrf_cauda")||pos("nrf_sphincter")||pos("nrf_saddle");
  const saddleSens  = sidedAbn("n_s4s5")||sidedAbn("n_s3");
  const bilLegWeak  = (abn("myo_l4_left")&&abn("myo_l4_right"))||(abn("myo_l5_left")&&abn("myo_l5_right"))||(abn("myo_s1_left")&&abn("myo_s1_right"));
  const slrBilat    = sidedPos("nt_slr") && (pos("nt_slr_left")&&pos("nt_slr_right"));
  if (caudaFlag || saddleSens || bilLegWeak) {
    push("Neurological","Cauda Equina Syndrome","G83.4",
      caudaFlag ? 92 : 75,
      [
        caudaFlag  && "Red flag: saddle anaesthesia / sphincter dysfunction reported",
        saddleSens && "S3/S4/S5 dermatomal sensory loss — saddle distribution",
        bilLegWeak && "Bilateral lower limb myotomal weakness (L4/L5/S1)",
        slrBilat   && "Bilateral positive SLR — central compression pattern",
      ],
      "NICE CES Guidelines; MAG Ch.9; DUT Ch.22",
      "EMERGENCY"
    );
  }

  // ── LUMBAR NERVE ROOT LEVELS ───────────────────────────────────────────────

  // L4 root — Patella reflex, ankle DF, medial leg/foot sensation
  {
    const sens    = sidedAbn("n_l4");
    const motor   = sidedAbn("myo_l4")||abn("myo_l4_left")||abn("myo_l4_right");
    const reflex  = sidedDim("n_ref_patella");
    const slr     = sidedPos("nt_slr");
    const femoral = sidedPos("nt_femoral");
    const triad   = [sens,motor,reflex].filter(Boolean).length;
    if (triad >= 1 || (slr && (sens||motor))) {
      const conf = triad===3?90:triad===2?78:slr?65:52;
      push("Lumbar","Lumbar Radiculopathy — L4 Root","M54.14",conf,
        [
          sens    && "L4 dermatomal sensory change — medial leg / medial foot (KEN)",
          motor   && "L4 myotomal weakness — ankle dorsiflexion / tibialis anterior (KEN)",
          reflex  && "Patella reflex diminished/absent — L3/4 root (MAG Ch.9)",
          slr     && "SLR positive — L4/5 neural tension (Devillé 2000: Sn 0.92)",
          femoral && "Femoral nerve tension +ve — upper lumbar root (L2–L4)",
          triad===3 && "FULL TRIAD: sensory + motor + reflex at L4 — high specificity for L3/4 disc",
        ],
        "KEN Ch.8; MAG Ch.9; Devillé 2000 SLR meta-analysis; Maitland Vertebral Manip"
      );
    }
  }

  // L5 root — No standard reflex, EHL weakness, dorsum foot sensation
  {
    const sens    = sidedAbn("n_l5");
    const motor   = sidedAbn("myo_l5")||abn("myo_l5_left")||abn("myo_l5_right");
    const slr     = sidedPos("nt_slr");
    const slump   = sidedPos("nt_slump");
    const triad   = [sens,motor,slr||slump].filter(Boolean).length;
    if (triad >= 1) {
      const conf = (sens&&motor&&(slr||slump))?88:(sens&&motor)?75:(triad>=1)?58:45;
      push("Lumbar","Lumbar Radiculopathy — L5 Root","M54.15",conf,
        [
          sens    && "L5 dermatomal sensory loss — dorsum foot / 1st–2nd web space (KEN)",
          motor   && "L5 myotomal weakness — great toe extension (EHL) / hip abduction (KEN)",
          slr     && "SLR positive — L4/5 or L5/S1 nerve root tension",
          slump   && "Slump test +ve — neuromeningeal tension (Sn 0.84, Sp 0.83)",
          (sens&&motor) && "Sensory + motor deficit at L5 — L4/5 disc herniation most likely level",
        ],
        "KEN Ch.8; MAG Ch.9; Maitland; Butler Mob NS; Devillé 2000"
      );
    }
  }

  // S1 root — Achilles reflex, plantarflexion, lateral foot sensation
  {
    const sens    = sidedAbn("n_s1");
    const motor   = sidedAbn("myo_s1")||abn("myo_s1_left")||abn("myo_s1_right");
    const reflex  = sidedDim("n_ref_achilles");
    const slr     = sidedPos("nt_slr");
    const slump   = sidedPos("nt_slump");
    const triad   = [sens,motor,reflex].filter(Boolean).length;
    if (triad >= 1 || (slr && (sens||motor))) {
      const conf = triad===3?92:triad===2?80:slr?66:54;
      push("Lumbar","Lumbar Radiculopathy — S1 Root","M54.12",conf,
        [
          sens    && "S1 dermatomal sensory loss — lateral foot / heel / sole (KEN)",
          motor   && "S1 myotomal weakness — ankle plantarflexion / gastrocnemius (KEN)",
          reflex  && "Achilles reflex diminished/absent — most sensitive S1 indicator (MAG)",
          slr     && "SLR +ve — L5/S1 nerve root (Devillé 2000)",
          slump   && "Slump test +ve — neuromeningeal involvement",
          triad===3 && "FULL TRIAD: sensory + motor + reflex at S1 — L5/S1 disc highly likely",
        ],
        "KEN Ch.8; MAG Ch.9; Devillé 2000; Maitland Vertebral Manip"
      );
    }
  }

  // ── CERVICAL NERVE ROOT LEVELS ─────────────────────────────────────────────

  // C5 — Biceps reflex, deltoid/shoulder abd, lateral arm sensation
  {
    const sens   = sidedAbn("n_c5");
    const motor  = sidedAbn("myo_c5")||abn("myo_c5_left")||abn("myo_c5_right");
    const reflex = sidedDim("n_ref_bicep");
    const ultt   = sidedPos("nt_ultt1")||sidedPos("nt_ultt2");
    const triad  = [sens,motor,reflex].filter(Boolean).length;
    if (triad >= 1) {
      push("Cervical","Cervical Radiculopathy — C5 Root","M54.12",
        triad===3?88:triad===2?74:58,
        [
          sens   && "C5 dermatomal loss — lateral arm / deltoid badge (KEN)",
          motor  && "C5 myotomal weakness — shoulder abduction / elbow flexion (KEN)",
          reflex && "Biceps reflex diminished — C5/C6 root (MAG Ch.4)",
          ultt   && "ULTT positive — C5–C7 neural mechanosensitivity (Butler)",
          triad===3 && "FULL TRIAD at C5 — C4/5 disc herniation pattern",
        ],
        "KEN Ch.5; MAG Ch.4; Wainner CPR 2003; Butler Mob NS; Maitland Cervical"
      );
    }
  }

  // C6 — Brachioradialis reflex, wrist extension, thumb/index sensation
  {
    const sens   = sidedAbn("n_c6");
    const motor  = sidedAbn("myo_c6")||abn("myo_c6_left")||abn("myo_c6_right");
    const reflex = sidedDim("n_ref_brad");
    const ultt   = sidedPos("nt_ultt1");
    const triad  = [sens,motor,reflex].filter(Boolean).length;
    if (triad >= 1) {
      push("Cervical","Cervical Radiculopathy — C6 Root","M54.12",
        triad===3?90:triad===2?76:60,
        [
          sens   && "C6 dermatomal loss — lateral forearm / thumb + index finger (KEN)",
          motor  && "C6 myotomal weakness — wrist extension (ECRL/ECRB) (KEN)",
          reflex && "Brachioradialis reflex diminished — C5/C6 root (MAG Ch.4)",
          ultt   && "ULTT1 (median) +ve — C6 mechanosensitivity (Butler)",
          triad===3 && "FULL TRIAD at C6 — C5/6 disc (most common cervical level) highly likely",
        ],
        "KEN Ch.5; MAG Ch.4; Wainner CPR 2003; Butler Mob NS"
      );
    }
  }

  // C7 — Triceps reflex, elbow extension, middle finger sensation
  {
    const sens   = sidedAbn("n_c7");
    const motor  = sidedAbn("myo_c7")||abn("myo_c7_left")||abn("myo_c7_right");
    const reflex = sidedDim("n_ref_tricep");
    const ultt   = sidedPos("nt_ultt2");
    const triad  = [sens,motor,reflex].filter(Boolean).length;
    if (triad >= 1) {
      push("Cervical","Cervical Radiculopathy — C7 Root","M54.12",
        triad===3?88:triad===2?74:58,
        [
          sens   && "C7 dermatomal loss — middle finger (KEN)",
          motor  && "C7 myotomal weakness — elbow extension / wrist flexion (KEN)",
          reflex && "Triceps reflex diminished — most common cause is C7 radiculopathy (MAG)",
          ultt   && "ULTT2 (radial) +ve — C6–C8 neural tension (Butler)",
          triad===3 && "FULL TRIAD at C7 — C6/7 disc herniation pattern",
        ],
        "KEN Ch.5; MAG Ch.4; Wainner CPR 2003; Butler Mob NS"
      );
    }
  }

  // C8 — Finger flexion/grip weakness, ring/little finger sensation
  {
    const sens  = sidedAbn("n_c8");
    const motor = sidedAbn("myo_c8")||abn("myo_c8_left")||abn("myo_c8_right");
    const ultt  = sidedPos("nt_ultt3");
    if (sens||motor) {
      push("Cervical","Cervical Radiculopathy — C8 Root","M54.12",
        (sens&&motor)?72:54,
        [
          sens  && "C8 dermatomal loss — ring + little finger / medial forearm (KEN)",
          motor && "C8 myotomal weakness — finger flexion / grip strength (KEN)",
          ultt  && "ULTT3 (ulnar) +ve — C8/T1 neural tension (Butler)",
        ],
        "KEN Ch.5; MAG Ch.4; Butler Mob NS"
      );
    }
  }

  // ── MULTI-LEVEL / PERIPHERAL POLYNEUROPATHY ────────────────────────────────
  const levelsAffected = ["n_l4","n_l5","n_s1","n_c5","n_c6","n_c7","n_c8"].filter(k=>sidedAbn(k));
  const reflexesAbn    = ["n_ref_patella","n_ref_achilles","n_ref_bicep","n_ref_brad","n_ref_tricep"].filter(k=>sidedDim(k));
  if (levelsAffected.length >= 3 || reflexesAbn.length >= 3) {
    push("Neurological","Peripheral Polyneuropathy","G62.9",
      levelsAffected.length>=4?78:65,
      [
        levelsAffected.length>=3 && `${levelsAffected.length} dermatomal levels affected — non-root-specific distribution`,
        reflexesAbn.length>=3    && `${reflexesAbn.length} reflexes diminished/absent bilaterally`,
        levelsAffected.length>=3 && "Multi-level sensory involvement: peripheral polyneuropathy > multi-level disc",
        "Consider: diabetes, B12 deficiency, alcohol, chemotherapy, idiopathic",
      ],
      "DUT Ch.30; MAG Appendix; NICE Neuropathy Guidelines"
    );
  }

  // ── THORACIC OUTLET SYNDROME ───────────────────────────────────────────────
  {
    const t1Sens  = sidedAbn("n_t1");
    const c8Sens  = sidedAbn("n_c8");
    const ultt3   = sidedPos("nt_ultt3");
    const ulnar   = sidedAbn("myo_t1")||abn("myo_t1_left")||abn("myo_t1_right");
    const tosCrit = [t1Sens,c8Sens,ultt3,ulnar].filter(Boolean).length;
    if (tosCrit >= 2) {
      push("Upper Limb","Thoracic Outlet Syndrome (Neurogenic)","G54.0",
        tosCrit>=3?75:58,
        [
          t1Sens && "T1 dermatomal sensory change — medial forearm (KEN)",
          c8Sens && "C8 dermatomal involvement — ring/little finger (KEN)",
          ultt3  && "ULTT3 (ulnar) +ve — lower trunk brachial plexus (Butler)",
          ulnar  && "T1 myotomal weakness — intrinsic hand muscles (KEN)",
        ],
        "DUT Ch.18; MAG Ch.5; Butler Mob NS; Roos TOS criteria"
      );
    }
  }

  results.sort((a,b)=>b.confidence-a.confidence||b.hits-a.hits);
  return results;
}

/**
 * Combined engine — merges structural + neurological results, deduplicates,
 * promotes urgent findings to top, returns top N.
 */
export function getTopDiagnosesEnhanced(data, n=4) {
  const structural = runDiagnosisEngine(data);
  const neuro      = runNeuroPatternEngine(data);

  // Merge: neuro results first if urgent, then interleave
  const urgent   = neuro.filter(r=>r.urgency==="EMERGENCY"||r.urgency==="URGENT");
  const neuroReg = neuro.filter(r=>!r.urgency);
  const combined = [...urgent, ...structural, ...neuroReg];

  // Deduplicate by diagnosis name
  const seen = new Set();
  const deduped = combined.filter(r=>{
    if (seen.has(r.diagnosis)) return false;
    seen.add(r.diagnosis);
    return true;
  });

  return deduped.slice(0, n);
}
