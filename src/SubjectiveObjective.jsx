// SubjectiveObjective.jsx — Special Tests, Subjective, CPA, KineticChain, FMS, Fascia, Ergo
import React from "react";
import { REG_MOD_S } from "./sharedClinicalData.js";
import { FunctionalScreenHub } from "./RegionalFunctionalScreens.jsx";


// ─── COMPLETE SPECIAL TESTS DATABASE 100+ ────────────────────────────────────
const CLOUDINARY_BASE_SO = "https://res.cloudinary.com/dr15y1pwj/image/upload";

function ImageModal_SO({ src, title, onClose }) {
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
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


// SmallClinicalImg — compact inline thumbnail (for tables / rows)
function SmallClinicalImg({ id, title }) {
  const [exists, setExists] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  if (!exists) return null;
  const thumb = `${CLOUDINARY_BASE_SO}/f_auto,q_auto,w_48,h_48,c_fill/${id}`;
  const full  = `${CLOUDINARY_BASE_SO}/f_auto,q_auto/${id}`;
  return (
    <>
      <img src={thumb} alt={title||id}
        onError={()=>setExists(false)}
        onClick={e=>{e.stopPropagation();setOpen(true);}}
        title={`Tap to view: ${title||id}`}
        style={{width:44,height:44,objectFit:"cover",borderRadius:7,cursor:"pointer",border:"2px solid rgba(124,58,237,0.25)",flexShrink:0,display:"block"}}
      />
      {open && <ImageModal_SO src={full} title={title||id} onClose={()=>setOpen(false)}/>}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CYRIAX COMPLETE ASSESSMENT MODULE
// Full STTT • Active/Passive ROM • End-Feel • Resisted Tests • Joint Play
// Auto Clinical Reasoning • Tissue Diagnosis • Treatment Direction
// ═══════════════════════════════════════════════════════════════════════════

// ─── CYRIAX CORE DATA ────────────────────────────────────────────────────────


const SEP_S="|||";


// runEngineV6's per-region results are keyed by the specific, laterality-
// suffixed region the clinician selected (e.g. "Elbow (R)", "Ankle/Foot (L)"),
// but REGION_NAV above only defines one shared entry per region *family*
// (bare "Elbow/Wrist/Hand", "Ankle / Foot", etc — Shoulder and Knee are the
// only two families broken out per-side, matching how REGION_NAV happens to
// key them). Without this mapping, REGION_NAV[r.region] silently misses for
// every region except Shoulder/Knee, since the exact strings never match --
// the "Guided assessment workflow" smart-action grid and the results engine's
// own analysis-module lookup both need this same translation, so it's shared
// here rather than defined twice (it used to be redeclared inside
// runEngineV6 as a local named _RKEY2).
const REGION_FAMILY_KEY = {
  "Cervical (L)":"Cervical spine","Cervical (R)":"Cervical spine",
  "Thoracic (L)":"Thoracic spine","Thoracic (R)":"Thoracic spine",
  "Lumbar/SI (L)":"Lumbar / SI","Lumbar/SI (R)":"Lumbar / SI",
  "Elbow (L)":"Elbow/Wrist/Hand","Elbow (R)":"Elbow/Wrist/Hand",
  "Wrist/Hand (L)":"Elbow/Wrist/Hand","Wrist/Hand (R)":"Elbow/Wrist/Hand",
  "Hip/Groin (L)":"Hip / Groin","Hip/Groin (R)":"Hip / Groin",
  "Ankle/Foot (L)":"Ankle / Foot","Ankle/Foot (R)":"Ankle / Foot",
};

function runEngineV6(data, selectedRegions) {
  if (!selectedRegions || selectedRegions.length === 0) return null;

  // ── Utility functions ──────────────────────────────────────────────
  const av = (k) => { const x = data[k]; if (!x) return ""; return String(x).split(SEP_S).filter(Boolean).join(", "); };
  const vl = (k) => String(data[k] || "").trim();
  const L  = (s) => String(s || "").toLowerCase();
  const any = (txt, ...keys) => keys.some(k => L(txt).includes(L(k)));
  const count = (txt, ...keys) => keys.filter(k => L(txt).includes(L(k))).length;

  // ── Universal data ─────────────────────────────────────────────────
  const nrsNow    = parseFloat(vl("cc_vas_now"))    || 0;
  const nrsWorst  = parseFloat(vl("cc_vas_worst"))  || 0;
  const nrsBest   = parseFloat(vl("cc_vas_best"))   || 0;
  const dur       = L(vl("cc_duration"));
  const onset     = L(vl("cc_onset"));
  const pmh       = L(av("pmh_conditions"));
  const meds      = L(av("med_current"));
  const grf       = L(av("grf_systemic"));
  const grfCancer = L(av("grf_cancer"));
  const grfFract  = L(av("grf_fracture"));
  const pedAge    = L(vl("ped_age_group"));
  const hmScreen  = L(av("hm_screen"));
  const bpsBeliefs= L(av("bps_beliefs"));
  const bpsFear   = L(av("bps_fear"));
  const bpsWork   = L(av("bps_work_facs"));

  // ── Duration classification ────────────────────────────────────────
  const isAcute    = /< 1 week|1–2 weeks|2–6 weeks/.test(dur);
  const isSubacute = /6 weeks–3 months/.test(dur);
  const isChronic  = /3–6 months|6–12|1–2 years|> 2 years|recurring/.test(dur);

  // ── NRS severity classification ────────────────────────────────────
  const nrsSevere   = nrsWorst >= 8;
  const nrsModerate = nrsWorst >= 5 && nrsWorst < 8;
  const nrsMild     = nrsWorst > 0 && nrsWorst < 5;
  const nrsVariance = nrsWorst - nrsBest; // large variance = mechanical

  // ── Global red flags ───────────────────────────────────────────────
  const globalRedFlags = [];
  const malignancy = any(grfCancer,"active cancer","past cancer — <5 years","known bone metastases") || any(grf,"unexplained weight loss","night sweats","fever");
  const fracRisk   = any(grfFract,"major trauma","known osteoporosis","long-term corticosteroid","point bone tenderness","fragility fractures");
  if (malignancy) globalRedFlags.push("⚠ URGENT — Possible malignancy / serious pathology: urgent medical review before physiotherapy");
  if (fracRisk)   globalRedFlags.push("⚠ Fracture risk indicators: imaging before loading; manipulation contraindicated");

  // ── Psychosocial load ──────────────────────────────────────────────
  const psychLoad = count(bpsBeliefs,"catastrophising","hopeless","believes cannot recover","nocebo","passive") +
                    count(bpsFear,"severe avoidance","kinesiophobia","catastrophising") +
                    count(bpsWork,"litigation","compensation","solicitor");
  const highPsych = psychLoad >= 2;

  // ── Hypermobility / paediatric flags ──────────────────────────────
  const isHypermobile = count(hmScreen,"multiple joint disloc","beighton","loose","since childhood") >= 1;
  const isPaediatric  = any(pedAge,"child","adolescent","growth");

  // ══════════════════════════════════════════════════════════════════
  // PER-REGION ANALYSIS
  // ══════════════════════════════════════════════════════════════════
  const regionResults = selectedRegions.map(region => {
    const mod = REG_MOD_S[REGION_FAMILY_KEY[region]||region];
    if (!mod) return null;
    const px = mod.prefix;
    const rf = (suf) => av(`${px}_${suf}`);
    const rv = (suf) => vl(`${px}_${suf}`);

    // Field reads
    const inAggMov  = L(rf("agg_mov"));
    const inAggPost = L(rf("agg_post"));
    const inAggAct  = L(rf("agg_act"));
    const inAggOther= L(rf("agg_other"));
    const inRelMov  = L(rf("rel_mov"));
    const inRelPost = L(rf("rel_post"));
    const inRelMan  = L(rf("rel_manual") || rf("rel"));
    const inRelMed  = L(rf("rel_med") || rf("rel"));
    const inPattern = L(rf("pattern"));
    const inMorning = L(rf("morning"));
    const inNight   = L(rf("night"));
    const inIrrit   = L(rv("irritability"));
    const inRad     = L(rf("radiation") || rf("loc_radiation"));
    const inLoc     = L(rf("loc") || rf("location"));
    const inMoi     = L(rf("moi"));
    const inSb24hr  = L(rf("sb_24hr") || rf("24hr"));

    // ── Irritability (Maitland SIN) with NRS override ──────────────
    let irritLevel = inIrrit;
    if (!irritLevel && nrsWorst >= 8 && isAcute) irritLevel = "high";
    else if (!irritLevel && nrsWorst >= 6) irritLevel = "moderate";
    else if (!irritLevel && nrsMild) irritLevel = "low";
    const highIrrit = irritLevel === "high" || irritLevel === "very high";
    const modIrrit  = irritLevel === "moderate";
    const lowIrrit  = irritLevel === "low";

    const tags = [];
    const prec = [];
    const differentials = []; // [{label, confidence, evidence, tests}]
    let urgentFlag = false;
    let primaryPattern = "";
    let confidence = "LOW";
    let objTests = [];

    // Duration tag
    if (isAcute) tags.push("Acute");
    else if (isSubacute) tags.push("Subacute");
    else if (isChronic) tags.push("Chronic");

    // NRS severity tag
    if (nrsWorst > 0) {
      if (nrsSevere) tags.push(`Severe pain NRS ${nrsWorst}/10`);
      else if (nrsModerate) tags.push(`Moderate pain NRS ${nrsWorst}/10`);
      else if (nrsMild) tags.push(`Mild pain NRS ${nrsWorst}/10`);
    }

    // Irritability tags
    if (highIrrit) tags.push("⚠ High irritability");
    else if (modIrrit) tags.push("Moderate irritability");
    else if (lowIrrit) tags.push("Low irritability");

    // Irritability precautions
    if (highIrrit) prec.push("High irritability — short-duration low-load testing; no end-range or combined loading; monitor 24hr response (Maitland)");

    // ── Universal pattern analysis ─────────────────────────────────
    const constantPain   = any(inPattern, "constant — never goes away", "constant — varies");
    const morningStiff30 = any(inMorning, ">30 min", "stays bad", "stays painful all morning", ">1 hour", "30–60 min");
    const easesWithMove  = any(inRelMov, "walking") || any(inPattern, "eases with movement", "improves with movement");
    const warmUpPattern  = any(inPattern, "warms up") || any(inPattern, "eases after");
    const postActDelay   = any(inPattern, "post-activity delayed", "delayed 24 hours", "next day");
    const largeNrsVar    = nrsVariance >= 5;
    const nsaidEffective = any(inRelMed, "nsaids — effective", "nsaids very effective");
    const noMedHelps     = any(inRelMed, "no medication helps", "no meds help", "no meds effective");

    // ── Inflammatory pattern ───────────────────────────────────────
    const inflammatoryPattern = (morningStiff30 && easesWithMove) ||
      any(inSb24hr, "inflammatory") ||
      any(rf("rf_inflammatory"), "morning stiffness", "improves with movement", "alternating buttock") ||
      (nsaidEffective && morningStiff30);
    if (inflammatoryPattern) tags.push("Inflammatory pattern");

    // ── Mechanical pattern ─────────────────────────────────────────
    const aggCount = (inAggMov + inAggPost + inAggAct).split(",").filter(s => s.trim()).length;
    const relCount = (inRelMov + inRelPost + inRelMan).split(",").filter(s => s.trim()).length;
    const mechanicalPattern = !constantPain && aggCount >= 2 && relCount >= 1 && largeNrsVar;
    if (mechanicalPattern) tags.push("Mechanical");

    // ── Tendinopathic pattern ──────────────────────────────────────
    const tendinopathicPattern = warmUpPattern && (
      any(onset, "repetitive", "overuse", "gradual", "sport") ||
      postActDelay ||
      any(inMoi, "overuse", "repetitive", "gradual", "marathon", "training load")
    );

    // ── Neural signals ─────────────────────────────────────────────
    const neuralQuality = any(rf("arm_quality"), "burning", "shooting", "tingling", "numbness", "electric") ||
                          any(rf("neuro_quality"), "burning", "shooting", "tingling", "numbness") ||
                          any(rf("neuro"), "burning", "shooting", "tingling", "numbness", "electric");
    const hasRadiation  = inRad && !inRad.includes("no radiation") && inRad.length > 5;
    const neuroDeficit  = any(rf("arm_neuro"), "weakness", "numbness", "dropping") ||
                          any(rf("neuro_signs"), "foot drop", "weakness", "reduced reflex", "saddle");
    const dermatomalDist= any(rf("dermatomal"), "c5", "c6", "c7", "c8", "l4", "l5", "s1") &&
                          !any(rf("dermatomal"), "not dermatomal", "not applicable");
    // Radiculopathy: neural quality + (deficit OR dermatomal) + radiation — partial data tolerant
    const radiculopathyScore = (neuralQuality ? 1 : 0) + (neuroDeficit ? 1 : 0) +
                                (dermatomalDist ? 1 : 0) + (hasRadiation ? 1 : 0);
    const radiculopathySig  = radiculopathyScore >= 2; // partial data tolerant
    const neurodynamicSig   = neuralQuality && radiculopathyScore < 2;

    if (radiculopathySig) tags.push("Radiculopathy");
    else if (neurodynamicSig) tags.push("Neurodynamic");

    // ── Nociplastic signal ─────────────────────────────────────────
    const nociplasticSig = (isChronic && constantPain && noMedHelps) ||
                           (isChronic && highPsych && constantPain) ||
                           (selectedRegions.length >= 3);
    if (nociplasticSig && !urgentFlag) tags.push("Nociplastic risk");

    // ══════════════════════════════════════════════════════════════
    // REGION-SPECIFIC PATTERN RECOGNITION
    // ══════════════════════════════════════════════════════════════

    // ─── CERVICAL SPINE ──────────────────────────────────────────
    if (region === "Cervical spine") {
      const myelop  = any(av("cx_rf_myelopathy"), "bilateral hand", "fine motor", "gait disturbance", "ataxia", "bladder", "bowel", "lhermitte");
      const vbi     = any(av("cx_rf_vbi"), "dizziness", "diplopia", "drop attacks", "dysarthria", "dysphagia", "thunderclap", "horner");
      const instab  = any(av("cx_rf_instability"), "rheumatoid arthritis", "down syndrome", "recent significant trauma", "post-surgical cervical");
      const fracSc  = any(av("cx_fracture_screen"), "high-energy", "axial loading", "cannot move neck", "neurological symptoms from time", "nexus", "canadian c-spine");
      const headache= L(rv("ha_present")).includes("yes");
      const haType  = L(rv("ha_type"));
      const armRelief = any(rf("arm_position"), "better with arm overhead", "shoulder abduction relief sign");
      const discogenic = any(inAggMov, "flexion — looking down") && any(inAggPost, "computer", "sitting") && any(inRelMov, "chin tuck", "retraction", "extension");
      const facet = any(inAggMov, "combined extension + rotation", "quadrant") && !any(inAggMov, "flexion — looking down");
      const postural = any(inAggPost, "computer", "looking down", "sustained") && !radiculopathySig;
      const cxCervicogenic = headache && any(haType, "cervicogenic");

      // Urgent flags first
      if (fracSc)  { prec.push("⚠ URGENT — Cervical fracture indicators: immobilise; do not move; emergency department"); urgentFlag = true; tags.push("⚠ Fracture screen"); }
      if (myelop)  { prec.push("⚠ URGENT — Myelopathy features: neurosurgical opinion before any cervical loading or manipulation"); urgentFlag = true; tags.push("⚠ Myelopathy"); }
      if (vbi)     { prec.push("⚠ URGENT — VBI screen positive: cervical manipulation absolutely contraindicated; urgent medical review"); urgentFlag = true; tags.push("⚠ VBI"); }
      if (instab)  { prec.push("⚠ Craniovertebral instability risk — Sharp-Purser / alar ligament testing before any mobilisation"); tags.push("Instability risk"); }

      // Build differentials
      if (radiculopathySig) {
        const dermLevel = any(rf("dermatomal"),"c6") ? "C6" : any(rf("dermatomal"),"c7") ? "C7" : any(rf("dermatomal"),"c8") ? "C8" : any(rf("dermatomal"),"c5") ? "C5" : "C5-C8";
        differentials.push({
          label: `Cervical radiculopathy — ${dermLevel}`,
          confidence: radiculopathyScore >= 3 ? "HIGH" : "MODERATE",
          evidence: `Neural quality symptoms${dermatomalDist?" with dermatomal distribution":""}${hasRadiation?" radiating to arm/hand":""}${neuroDeficit?" with neurological deficit":""}`,
          tests: ["Upper limb neurological exam (dermatomes C5-T1, myotomes, reflexes)","ULNT 1–4 (Butler)","Spurling's test","Cervical AROM with overpressure","Distraction test"],
        });
      }
      if (armRelief) {
        tags.push("Abduction relief sign +ve");
        if (!differentials.some(d => d.label.includes("radiculopathy")))
          differentials.push({ label:"C5/C6 nerve root compression", confidence:"MODERATE", evidence:"Shoulder abduction relief sign — arm overhead reduces symptoms", tests:["Spurling's R/L","ULNT1","Cervical traction test"] });
      }
      if (discogenic) {
        differentials.push({ label:"Cervical discogenic pain", confidence: (any(inAggAct,"coughing") || any(inAggMov,"flexion — looking down")) ? "MODERATE" : "LOW",
          evidence:"Flexion + sustained posture aggravates; retraction / extension relieves (McKenzie pattern)",
          tests:["Repeated cervical movements — centralisation","PA intervertebral pressures (Maitland)","Cervical flexion AROM","Upper limb neurological screen"] });
      }
      if (facet) {
        differentials.push({ label:"Cervical facet joint syndrome", confidence: any(inAggMov,"quadrant") ? "MODERATE" : "LOW",
          evidence:"Combined extension + rotation aggravates; localised pain without radiation",
          tests:["Combined movement quadrant testing","PA pressures C2-C7","Facet loading in extension + rotation","Passive physiological intervertebral movements (PIVMs)"] });
      }
      if (postural && !radiculopathySig && !discogenic && !facet) {
        differentials.push({ label:"Cervical postural / myofascial dysfunction", confidence:"LOW",
          evidence:"Sustained posture (computer / phone) primary aggravator; no neurological features",
          tests:["Postural assessment","Cervical AROM all planes","Muscle length — levator scapulae / upper trapezius","Scapular stability assessment"] });
      }
      if (cxCervicogenic) {
        differentials.push({ label:"Cervicogenic headache", confidence:"MODERATE",
          evidence:"Headache reproduced / altered with neck movement; unilateral without autonomic features",
          tests:["C1/C2/C3 PPIVM","Flexion-rotation test (FRT — C1/C2)","Upper cervical pressures","Head eye movement coordination test"] });
      }
      if (inflammatoryPattern && !radiculopathySig) {
        differentials.push({ label:"Cervical inflammatory arthropathy (RA / AS)", confidence:any(pmh,"rheumatoid","ankylosing")?"MODERATE":"LOW",
          evidence:"Morning stiffness >30 min easing with movement; PMH relevant",
          tests:["Neurological screen (RA — atlantoaxial)","Sharp-Purser if RA","Referral for ESR/CRP/RF if not yet done","Bilateral assessment"] });
      }

      // Primary pattern from highest confidence differential
      if (urgentFlag) primaryPattern = differentials.length > 0 ? `⚠ ${differentials[0].label} — Urgent` : "⚠ Urgent referral required";
      else if (differentials.length > 0) {
        differentials.sort((a,b) => (b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0) - (a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
        primaryPattern = differentials[0].label;
        confidence = differentials[0].confidence;
      } else primaryPattern = "Cervical pain — insufficient data for pattern classification";

      // Objective tests
      objTests = urgentFlag ? ["Do not load cervically until urgent consultation complete"] :
        ["Postural observation — head/neck/shoulder alignment","Cervical AROM all planes with overpressure",
         "Passive physiological intervertebral movements (PIVMs)","PA intervertebral pressures (Maitland)",
         ...(radiculopathySig ? ["Full upper limb neurological exam","ULNT 1–4","Spurling's","Distraction test"] : []),
         ...(headache ? ["Flexion-rotation test (C1/C2)","Upper cervical PPIVM"] : []),
         highIrrit ? "HIGH IRRITABILITY — limit to 1–2 test movements; assess 24hr response before progressing" : ""];
    }

    // ─── LUMBAR / SI ──────────────────────────────────────────────
    if (region === "Lumbar / SI") {
      const cauda    = any(av("lx_rf_cauda"), "bilateral leg weakness", "saddle", "bladder retention", "bladder incontinence", "bowel incontinence", "rapidly progressive");
      const lxFract  = any(av("lx_rf_fracture"), "major high-energy", "known osteoporosis", "long-term corticosteroid", "point bone tenderness") || fracRisk;
      const inflammL = any(av("lx_rf_inflammatory"), "morning stiffness >30", "improves with movement", "alternating buttock", "nsaids very effective", "uveitis", "psoriasis", "ibd") || (inflammatoryPattern && any(pmh, "ankylosing", "psoriatic", "reactive"));
      const spondylo = any(av("lx_spondylo_screen"), "young athlete", "extension pain", "pars stress", "sport with repeated extension", "single leg extension", "forward slip");
      const discogenic = any(inAggMov, "forward bending") && (any(inAggAct, "coughing", "sneezing", "straining") || any(inAggPost, "sitting >30", "sitting >1 hour")) &&
                         (any(inRelMov, "extension", "press-up") || any(inRelPost, "walking") || any(rv("directional"), "extension preference"));
      const facet    = (any(inAggMov, "backward bending", "extension", "rotation") && !any(inAggMov, "forward bending")) && any(inRelPost, "lying", "knees bent", "sitting");
      const stenosis = any(inAggAct, "walking — extended", "prolonged walking", "bilateral leg") && (any(inRelPost, "leaning forward", "hands and knees", "sitting") || any(inRelMov, "walking"));
      const sijPatt  = any(inLoc, "si joint") && any(inAggMov, "fadir", "faber") && !radiculopathySig;
      const spondylolisthesis = any(inAggMov, "backward bending") && any(av("lx_spondylo_screen"), "forward slip", "spondylolisthesis", "young athlete");

      // Urgent flags
      if (cauda)   { prec.push("⚠ URGENT — Cauda equina indicators: same-day emergency medical review; do not defer (NICE NG59)"); urgentFlag = true; tags.push("⚠ Cauda equina"); }
      if (lxFract) { prec.push("⚠ Fracture risk: imaging before any loading; manipulation absolutely contraindicated"); tags.push("⚠ Fracture risk"); }
      if (inflammL && !urgentFlag) prec.push("Inflammatory / spondyloarthropathy features — rheumatology referral; ESR, CRP, HLA-B27");

      // Build differentials — all confidence scored
      if (radiculopathySig) {
        const dermLevel = any(rf("dermatomal"),"l4") ? "L4" : any(rf("dermatomal"),"l5") ? "L5" : any(rf("dermatomal"),"s1") ? "S1" : "L4-S1";
        const belowKnee = any(rv("below_knee"), "below knee", "extends to foot");
        differentials.push({ label:`Lumbar radiculopathy — ${dermLevel}`,
          confidence: radiculopathyScore >= 3 || belowKnee ? "HIGH" : "MODERATE",
          evidence:`Pain below knee${dermatomalDist?" with dermatomal pattern":""}; neural quality${neuroDeficit?" with neurological signs":""}`,
          tests:["Full lower limb neurological exam (L3-S1)","SLR with sensitisation (Bragard / Brudzinski)","Slump test","Repeated lumbar extension — centralisation?","Femoral nerve stretch (if L2-L4)"] });
      }
      if (discogenic) {
        differentials.push({ label:"Lumbar discogenic pain",
          confidence: any(inAggAct,"coughing","sneezing") && any(inRelMov,"extension") ? "HIGH" : "MODERATE",
          evidence:`Flexion / Valsalva aggravates${any(rv("directional"),"extension preference")?" + extension centralises (McKenzie)":""}; sustained sitting aggravates`,
          tests:["Repeated extension standing + lying (McKenzie)","PA pressures L1-L5","Centralisation testing","SLR if leg symptoms","Upper / lower quarter neurological screen"] });
      }
      if (facet) {
        differentials.push({ label:"Lumbar facet / zygapophyseal joint syndrome",
          confidence: any(inAggMov,"rotation") && any(inAggMov,"backward bending") ? "MODERATE" : "LOW",
          evidence:"Extension + rotation aggravates; flexion / lying with knees bent relieves",
          tests:["Lumbar quadrant test (extension + rotation + side bend)","PA intervertebral pressures","Passive physiological movements (PIVMs)","Spring testing"] });
      }
      if (stenosis) {
        differentials.push({ label:"Lumbar spinal stenosis (neurogenic claudication)",
          confidence: any(inAggAct,"bilateral leg") && any(inRelPost,"leaning forward") ? "HIGH" : "MODERATE",
          evidence:"Walking provokes bilateral leg symptoms; leaning forward / sitting relieves (shopping trolley sign)",
          tests:["Treadmill walking test","Bicycle test (can cycle — flexed — further than walk)","Neurological screen both lower limbs","SLR bilateral"] });
      }
      if (inflammL) {
        differentials.push({ label:"Inflammatory lumbar / spondyloarthropathy",
          confidence: any(av("lx_rf_inflammatory"),"alternating buttock","morning stiffness >30") ? "MODERATE" : "LOW",
          evidence:`Morning stiffness >30 min; eases with movement${nsaidEffective?" + NSAID responsive":""}${any(pmh,"ankylosing","psoriatic")?" + relevant PMH":""}`,
          tests:["FABER test (SIJ provocation)","Posterior SIJ shear","Active straight leg raise","Referral: ESR, CRP, HLA-B27","Sacroiliac imaging if clinical"] });
      }
      if (sijPatt) {
        differentials.push({ label:"Sacroiliac joint dysfunction",
          confidence: count(inAggMov,"fadir","faber") >= 1 && any(inLoc,"si joint") ? "MODERATE" : "LOW",
          evidence:"SI joint location; FADIR / FABER aggravates; unilateral buttock / SI area",
          tests:["SIJ provocation cluster (Laslett) — FABER, posterior shear, compression, distraction","Active straight leg raise","Sacral spring","Gillet test"] });
      }
      if (spondylo || spondylolisthesis) {
        differentials.push({ label: spondylolisthesis ? "Spondylolisthesis" : "Spondylolysis (pars stress fracture)",
          confidence: isPaediatric || any(onset,"sport") ? "MODERATE" : "LOW",
          evidence:`Young athlete with extension pain${isPaediatric?" during growth phase":""}; sport with repetitive lumbar extension`,
          tests:["Single leg extension (Stork) test — unilateral pain reproduction","Lumbar AROM — extension pain","Lumbar x-ray (AP + lateral + oblique)","SPECT / MRI if x-ray negative and clinical suspicion high","Hamstring length"] });
      }
      if (!differentials.length) {
        differentials.push({ label:"Non-specific low back pain (mechanical)", confidence:"LOW",
          evidence:"Insufficient specific features for classification — mechanical pattern likely",
          tests:["Lumbar AROM all planes","PA pressures","Repeated movements","SLR if any leg symptoms","STarT Back Tool"] });
      }

      // STarT Back
      const startBack = L(rv("yf_startback"));
      if (any(startBack,"high risk")) { prec.push("STarT Back HIGH RISK — psychologically-informed physiotherapy (PIP); standard physio alone insufficient"); tags.push("STarT High"); }
      else if (any(startBack,"medium risk")) { prec.push("STarT Back MEDIUM RISK — enhanced physiotherapy addressing psychosocial factors"); tags.push("STarT Medium"); }

      primaryPattern = urgentFlag ? "⚠ Urgent referral required" :
        (differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0)), differentials[0].label);
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";

      objTests = urgentFlag ? ["Do not proceed — urgent cauda equina assessment"] :
        ["Postural observation — lumbar/pelvic alignment","Lumbar AROM all planes (standing)",
         "Repeated movements — centralisation testing (McKenzie)","PA intervertebral pressures L1-S1",
         ...(radiculopathySig ? ["Full lower limb neurological exam (L3-S1)","SLR + sensitisation","Slump test","Femoral nerve stretch"] : []),
         ...(spondylo ? ["Stork / single leg extension test"] : []),
         ...(sijPatt ? ["SIJ provocation cluster (Laslett 2 of 5)"] : []),
         highIrrit ? "HIGH IRRITABILITY — assess single movement then stop; 24hr monitoring" : ""];
    }

    // ─── SHOULDER ─────────────────────────────────────────────────
    if (region === "Shoulder (L)" || region === "Shoulder (R)") {
      const nightSleep   = any(rv("night"), "wakes multiple", "cannot sleep on affected", "constant night pain");
      const painfulArc   = any(rv("arc"), "60", "120°");
      const acjArc       = any(rv("arc"), "above 120");
      const capsPattern  = any(rv("stiffness"), "cannot externally rotate", "all directions", "capsular pattern");
      const progStiff    = any(inPattern, "progressive stiffness");
      const instab       = any(rv("instability"), "recurrent dislocation", "single dislocation", "apprehension") || isHypermobile;
      const slap         = any(inAggMov, "deceleration of overhead");
      const dropArm      = any(rf("weakness"), "drop arm", "cannot hold arm up against gravity");
      const suddenWeak   = any(rf("moi_first"), "immediate weakness") && isAcute;
      const brachNeuritis= any(av(`${px}_brachial_neuritis`), "sudden severe", "profound weakness", "rapidly followed");
      const bilateral    = any(rv("bilateral"), "symmetrical bilateral");
      const rfField      = av(`${px}_rf`);
      const proxBicepsR  = any(av(`${px}_extra`) || "", "felt pop in upper arm", "popeye sign");

      // Urgent flags
      if (any(rfField,"suspected fracture","suspected unreduced","acute hot","vascular compromise")) { prec.push(`⚠ Red flags — ${region}: urgent orthopaedic review`); urgentFlag = true; }
      if (dropArm && isAcute) { prec.push(`⚠ Drop arm sign — possible acute massive rotator cuff tear: urgent orthopaedic referral`); urgentFlag = true; tags.push("⚠ Drop arm"); }
      if (brachNeuritis) { prec.push("⚠ Possible brachial neuritis (Parsonage-Turner) — urgent neurology referral; EMG/NCS; do not exercise into weakness"); urgentFlag = true; tags.push("⚠ Brachial neuritis"); }

      // Differentials
      if (capsPattern || (progStiff && isChronic)) {
        differentials.push({ label:`Adhesive capsulitis (frozen shoulder) — ${region}`,
          confidence: capsPattern && progStiff ? "HIGH" : "MODERATE",
          evidence:`Capsular pattern loss (ER > ABD > IR)${progStiff?" with progressive stiffness over months":""}`,
          tests:["Passive GH ROM all planes — capsular end-feel","ER / abduction / IR measurement","Rule out: glenohumeral OA (x-ray)","Diabetes screen if not done"] });
      }
      if ((nightSleep || painfulArc) && !capsPattern) {
        differentials.push({ label:`Rotator cuff-related shoulder pain — ${region}`,
          confidence: nightSleep && painfulArc ? "HIGH" : nightSleep || painfulArc ? "MODERATE" : "LOW",
          evidence:`${nightSleep?"Night pain waking patient; ":""}${painfulArc?"painful arc 60-120°":""}`,
          tests:["Hawkins-Kennedy","Neer sign","Empty can (supraspinatus)","ER lag sign","Belly press / bear hug (subscapularis)","Drop arm test","Scapular dyskinesis assessment"] });
      }
      if (acjArc) {
        differentials.push({ label:`AC joint pathology — ${region}`,
          confidence:"MODERATE",
          evidence:"Painful arc above 120° (AC joint loading range); localised AC joint tenderness likely",
          tests:["AC joint palpation","Horizontal adduction (cross-body adduction)","AC shear test","O'Brien's test"] });
      }
      if (instab) {
        differentials.push({ label:`Glenohumeral instability — ${region}`,
          confidence: any(rv("instability"),"recurrent dislocation") ? "HIGH" : "MODERATE",
          evidence:`${any(rv("instability"),"recurrent dislocation")?"Recurrent dislocation history":"Apprehension / sense of looseness"}${isHypermobile?" + generalised hypermobility":""}`,
          tests:["Apprehension test (anterior)","Relocation test","Sulcus sign (inferior)","Posterior stress test","Anterior/posterior load and shift","Kim test (posterior-inferior)"] });
      }
      if (slap) {
        differentials.push({ label:`SLAP lesion / labral pathology — ${region}`,
          confidence:"MODERATE",
          evidence:"Overhead deceleration mechanism aggravates; deep pain with overhead loading",
          tests:["O'Brien's active compression test","Speed's test (bicipital groove)","Kim test","Biceps load test II","ULNT if neural component"] });
      }
      if (brachNeuritis) {
        differentials.push({ label:"Brachial neuritis (Parsonage-Turner syndrome)",
          confidence:"HIGH",
          evidence:"Sudden severe pain then profound multi-muscle weakness; post-viral / post-vaccination",
          tests:["EMG / NCS (gold standard)","MRI brachial plexus","Cervical spine screen","Manual muscle testing all shoulder muscles","Diaphragm function if phrenic nerve"] });
      }
      if (proxBicepsR) {
        differentials.push({ label:`Proximal biceps long head rupture — ${region}`,
          confidence:"HIGH",
          evidence:"Pop in upper arm/anterior shoulder with Popeye sign visible",
          tests:["Speed's test","Yergason's test","Visible muscle deformity — Popeye sign","Urgency: orthopaedic review for surgical candidates"] });
      }

      if (!differentials.length) {
        differentials.push({ label:`Mechanical shoulder dysfunction — ${region}`, confidence:"LOW",
          evidence:"Insufficient specific features for classification",
          tests:["Full shoulder AROM + PROM","Rotator cuff isometric testing","Scapular dyskinesis","Cervical screen"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral required"}` : differentials[0].label;
      confidence = urgentFlag ? "HIGH" : differentials[0].confidence;
      objTests = urgentFlag ? ["Do not load shoulder — urgent referral"] :
        ["Postural observation — shoulder height / scapular position","GH AROM all planes","Rotator cuff isometric testing (ER/IR/abduction)","Scapular dyskinesis assessment",
         ...(painfulArc||nightSleep?["Hawkins-Kennedy","Neer","Empty can","ER lag sign","Drop arm test"]:[]),
         ...(capsPattern||progStiff?["Passive GH ROM — capsular end-feel","ER measurement"]:[]),
         ...(instab?["Apprehension / relocation test","Sulcus sign"]:[]),
         highIrrit?"HIGH IRRITABILITY — assess resting position only first session":""];
    }

    // ─── KNEE ─────────────────────────────────────────────────────
    if (region === "Knee (L)" || region === "Knee (R)") {
      const pop         = any(rv("pop"), "clear pop");
      const haemSwelling= any(rv("swelling"), "immediate within 2", "immediate <2hrs", "haemarthrosis");
      const rfField     = av(`${px}_rf`);
      const locked      = any(rfField, "irreducible locked");
      const pfps        = any(rv("movie"), "yes — typical pfps") || any(rv("descent"), "worse going down");
      const ottawa      = any(rfField, "unable to bear weight for 4", "bony tenderness fibular", "bony tenderness patella");
      const septic      = any(rfField, "acute hot", "septic arthritis");
      const patellarT   = any(inLoc, "patellar tendon") && (warmUpPattern || any(inAggAct,"jumping","stairs — up"));
      const itb         = any(inLoc, "itb attachment") && any(inAggAct, "running — downhill", "running");
      const meniscal    = (any(inLoc, "medial joint line","lateral joint line")) && (any(rv("locking"),"true locking") || any(rv("clicking"),"clunk","catching"));
      const pcl         = any(av(`${px}_pcl`) || "", "dashboard", "direct blow to anterior tibia", "fall onto flexed knee", "posterior");
      const plc         = any(av(`${px}_plc`) || "", "varus stress", "hyperextension + varus", "varus thrust");
      const bursa       = any(av(`${px}_bursa`) || "", "prepatellar", "infrapatellar", "pes anserine", "occupational");
      const osgood      = any(inLoc, "tibial tuberosity") && isPaediatric;
      const pfpsConfidence = (any(rv("movie"),"yes — typical pfps") ? 1:0) + (any(rv("descent"),"worse going down")?1:0) + (any(inAggAct,"sitting prolonged")?1:0);

      // ── NEW: MCL / LCL sprain detection ──────────────────────────────
      const mclMoi      = any(inMoi, "direct blow medial", "valgus stress");
      const lclMoi      = any(inMoi, "direct blow lateral", "varus stress");
      const mclLoc      = any(inLoc, "medial collateral region");
      const lclLoc      = any(inLoc, "lateral collateral region", "fibular head");
      const mcl         = (mclMoi || mclLoc) && !pop; // pop = likely ACL not isolated MCL
      const lcl         = (lclMoi || lclLoc) && !pop;

      // ── NEW: Knee OA detection ────────────────────────────────────────
      const oaCrep      = any(rv("clicking"), "grinding / crepitus — coarse", "grinding");
      const oaPattern   = any(inPattern, "morning stiffness", "warms up", "getting worse over time");
      const oaAge       = parseInt(data.dem_dob ? (new Date().getFullYear() - parseInt((data.dem_dob||"").split("/")[2]||"0")) : 0) >= 45;
      const oaLoc       = any(inLoc, "medial joint line","lateral joint line","whole knee — diffuse");
      const oaAggAct    = any(inAggAct,"prolonged walking","standing","getting up from low chair");
      const oaScore     = (oaCrep?2:0)+(oaPattern?1:0)+(oaAge?1:0)+(oaLoc?1:0)+(oaAggAct?1:0)+(isChronic?1:0);
      const kneeOA      = oaScore >= 3 && !isPaediatric;

      // ── NEW: Fat pad (Hoffa) impingement detection ────────────────────
      const fatPad      = any(inLoc, "patellar tendon — inferior pole", "anterior knee — diffuse") &&
                          any(inAggAct, "stairs — going up", "hills — going up", "full extension", "prolonged standing") &&
                          !patellarT; // distinguish from patellar tendinopathy

      // Urgent flags
      if (locked)  { prec.push(`⚠ Locked knee ${region} — possible bucket-handle meniscal tear: urgent orthopaedic referral`); urgentFlag = true; }
      if (septic)  { prec.push(`⚠ Possible septic arthritis ${region} — same-day emergency medical review`); urgentFlag = true; }
      if (ottawa)  { prec.push(`Ottawa Rules positive — ${region}: x-ray required; do not load until cleared`); tags.push("⚠ Ottawa +ve"); }
      if (pcl && haemSwelling && isAcute) { prec.push(`⚠ Possible PCL injury — ${region}: posterior drawer test; imaging`); tags.push("⚠ PCL suspected"); }

      // Differentials
      if (pop && haemSwelling) {
        differentials.push({ label:`ACL injury — ${region}`,
          confidence: pop && haemSwelling && any(inMoi,"twisting","non-contact","contact") ? "HIGH" : "MODERATE",
          evidence:`Clear pop + immediate haemarthrosis + twisting mechanism`,
          tests:["Lachman test (best sensitivity/specificity)","Anterior drawer","Pivot shift test","Valgus/varus stress (exclude associated MCL/LCL)","Ottawa Rules — x-ray if indicated","Urgent MRI if Lachman positive"] });
      }
      if (mcl) {
        const mclConf = (mclMoi && mclLoc) ? "HIGH" : mclMoi || mclLoc ? "MODERATE" : "LOW";
        differentials.push({ label:`MCL sprain — ${region}`,
          confidence: mclConf,
          evidence:`${mclMoi?"Valgus / medial blow mechanism; ":""}${mclLoc?"Medial collateral region pain; ":""}no haemarthrosis (isolated MCL)`,
          tests:[
            "Valgus stress test at 0° (MCL + posterior capsule) AND 30° (isolated MCL)",
            "Grade laxity: 1 = pain only, 2 = 5–10mm opening, 3 = >10mm (complete)",
            "Medial joint line + MCL palpation (femoral vs tibial attachment)",
            "Lachman test — exclude concurrent ACL injury",
            "X-ray if Ottawa Rules positive or Grade 3 laxity",
            "MRI if Grade 2–3 or multi-ligament injury suspected"
          ] });
      }
      if (lcl) {
        differentials.push({ label:`LCL sprain — ${region}`,
          confidence: lclMoi && lclLoc ? "MODERATE" : "LOW",
          evidence:`${lclMoi?"Varus / lateral blow mechanism; ":""}${lclLoc?"Lateral collateral / fibular head pain":""}`,
          tests:[
            "Varus stress test at 0° (LCL + PCL + posterolateral corner) AND 30° (isolated LCL)",
            "Fibular head palpation — LCL attaches here",
            "Peroneal nerve screen — common peroneal wraps fibular neck (foot drop risk)",
            "Posterolateral corner screen — Dial test if combined instability suspected",
            "MRI if Grade 2–3 or concurrent PCL / PLC injury suspected"
          ] });
      }
      if (pfps) {
        differentials.push({ label:`Patellofemoral pain syndrome — ${region}`,
          confidence: pfpsConfidence >= 2 ? "HIGH" : pfpsConfidence === 1 ? "MODERATE" : "LOW",
          evidence:`${any(rv("movie"),"yes")?"Movie sign (prolonged sitting)":""}${any(rv("descent"),"worse going down")?" + worse stairs descent":""}${any(inAggAct,"sitting prolonged")?" + prolonged sitting":""}`,
          tests:["Single leg squat — dynamic valgus assessment","Clarke's test","VMO assessment","Patellar mobility","Hip abductor / external rotator strength","Foot pronation assessment","Patellar taping trial"] });
      }
      if (patellarT && !urgentFlag) {
        differentials.push({ label:`Patellar tendinopathy — ${region}`,
          confidence: warmUpPattern && any(inAggAct,"jumping") ? "MODERATE" : "LOW",
          evidence:`Patellar tendon location + ${warmUpPattern?"warm-up pattern":""}${any(inAggAct,"jumping")?" + jumping aggravates":""}`,
          tests:["VISA-P questionnaire","Single leg decline squat (most sensitive)","Palpation inferior pole patella","VISA-P score","US if diagnosis unclear","Load assessment (training volume)"] });
      }
      if (fatPad && !urgentFlag) {
        differentials.push({ label:`Infrapatellar fat pad impingement (Hoffa's) — ${region}`,
          confidence: any(inAggAct,"full extension","prolonged standing") && any(inLoc,"anterior knee") ? "MODERATE" : "LOW",
          evidence:`Anterior / infrapatellar pain; aggravated by full extension and stairs up; no warm-up pattern (distinguishes from tendinopathy)`,
          tests:[
            "Hoffa's test — compress fat pad bilaterally below patella during passive extension; positive = pain reproduced",
            "Passive knee extension — end-range compression pain",
            "Palpation — medial and lateral to patellar tendon (fat pad borders)",
            "Observe hyperextension posture — chronic fat pad loading",
            "Patellar taping (unload fat pad) — therapeutic trial",
            "US or MRI if diagnosis uncertain (fat pad oedema visible)"
          ] });
      }
      if (itb) {
        differentials.push({ label:`ITB syndrome — ${region}`,
          confidence: any(inAggAct,"running — downhill") && any(inLoc,"itb") ? "MODERATE" : "LOW",
          evidence:"ITB attachment location; downhill running aggravates; overuse running mechanism",
          tests:["Ober test","Noble compression test (lateral femoral condyle)","Single leg squat — hip drop","Hip abductor strength","Running analysis if available","Training load assessment"] });
      }
      if (meniscal) {
        differentials.push({ label:`Meniscal pathology — ${region}`,
          confidence: any(rv("locking"),"true locking") || (pop && any(inLoc,"joint line")) ? "MODERATE" : "LOW",
          evidence:`Joint line location${any(rv("locking"),"true locking")?" + true locking":""}${any(rv("clicking"),"clunk")?" + clunk":""}`,
          tests:["McMurray test","Thessaly test (3° and 20° flexion)","Apley compression","Joint line palpation","MRI if clinical diagnosis uncertain"] });
      }
      if (kneeOA) {
        const oaConf = oaScore >= 5 ? "HIGH" : oaScore >= 3 ? "MODERATE" : "LOW";
        differentials.push({ label:`Knee OA — ${region}`,
          confidence: oaConf,
          evidence:`${oaCrep?"Coarse crepitus; ":""}${oaPattern?"Morning stiffness / warms up pattern; ":""}${oaAge?"Age ≥45; ":""}${isChronic?"Chronic duration; ":""}${oaLoc?"Joint line / diffuse location":""}`,
          tags:["Consider x-ray","GP referral if severe"],
          tests:[
            "Knee AROM — loss of flexion > extension (OA capsular pattern)",
            "Passive knee flexion + extension — capsular end-feel",
            "Valgus/varus alignment observation — medial vs lateral compartment loading",
            "Effusion sweep test — low-grade synovitis common in OA",
            "Single leg squat — load tolerance and valgus collapse",
            "Weight-bearing x-ray (AP + lateral + skyline) — joint space narrowing, osteophytes",
            "GP referral if severe pain / significant restriction — surgical review if indicated",
            "WOMAC or Oxford Knee Score — baseline function",
            isChronic && oaScore >= 4 ? "Refer for x-ray if not yet done — confirm OA grade (Kellgren-Lawrence)" : ""
          ].filter(Boolean) });
        if (oaScore >= 5 && isChronic) prec.push(`Knee OA pattern — ${region}: weight-bearing x-ray recommended; GP referral if not yet investigated`);
      }
      if (pcl) {
        differentials.push({ label:`PCL injury — ${region}`,
          confidence:"MODERATE",
          evidence:"Dashboard / direct anterior tibial blow mechanism; posterior knee fullness",
          tests:["Posterior drawer test (90° flexion)","Posterior sag sign (Godfrey)","Quadriceps active test","Associated LCL / posterolateral corner screen"] });
      }
      if (plc) {
        differentials.push({ label:`Posterolateral corner injury — ${region}`,
          confidence:"MODERATE",
          evidence:"Varus + hyperextension mechanism; lateral knee instability; varus thrust in gait",
          tests:["Dial test (30° + 90° — increased ER vs other knee)","Varus stress 0° + 30°","Posterolateral drawer","External rotation recurvatum test","Urgent orthopaedic referral if confirmed"] });
      }
      if (bursa) {
        differentials.push({ label:`Knee bursitis — ${region}`,
          confidence:"MODERATE",
          evidence:"Occupational kneeling or direct blow; fluctuant soft swelling; localised",
          tests:["Bursae palpation — prepatellar / infrapatellar / pes anserine","Temperature comparison","Fluctuance assessment","Septic bursitis: urgent aspiration if hot + systemically unwell"] });
      }
      if (osgood) {
        differentials.push({ label:`Osgood-Schlatter disease — ${region}`,
          confidence: isPaediatric && any(inLoc,"tibial tuberosity") ? "HIGH" : "LOW",
          evidence:"Adolescent athlete; tibial tuberosity pain; jumping / sport aggravates",
          tests:["Tibial tuberosity palpation","Knee AROM","Resisted knee extension — SLR","Quad flexibility — Ely test","X-ray if diagnosis uncertain"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || `Mechanical knee dysfunction — ${region}`;
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Defer loading — urgent referral as above"] :
        ["Gait observation — antalgic / varus thrust / valgus alignment","Knee AROM — extension and flexion (OA: flexion > extension loss)","Valgus/varus stress 0° + 30°",
         ...(pop&&haemSwelling?["Lachman","Anterior drawer","Pivot shift"]:meniscal?["McMurray","Thessaly","Apley"]:[]),
         ...(mcl?["Valgus stress test 0° + 30° — grade MCL laxity","Medial joint line palpation","Peroneal nerve screen if LCL"]:
             lcl?["Varus stress test 0° + 30° — grade LCL laxity","Fibular head palpation","Peroneal nerve screen (foot drop risk)"]:[]),
         ...(pfps?["Single leg squat","VMO assessment","Patellar mobility","Hip abductor strength"]:[]),
         ...(patellarT?["Single leg decline squat","VISA-P"]:itb?["Ober test","Noble compression test"]:[]),
         ...(fatPad?["Hoffa's test","Passive extension end-range compression","Fat pad palpation bilateral to patellar tendon"]:[]),
         ...(kneeOA?["Effusion sweep test","Passive ROM — capsular end-feel","Weight-bearing x-ray if not done","WOMAC / Oxford Knee Score"]:[]),
         highIrrit?"HIGH IRRITABILITY — passive ROM only first session":""];
    }

    // ─── HIP / GROIN ──────────────────────────────────────────────
    if (region === "Hip / Groin") {
      const rfField    = av("hp_rf");
      const avn        = any(rfField,"avascular necrosis");
      const fracHip    = any(rfField,"suspected neck of femur","cannot weight bear","elderly");
      const septicHip  = any(rfField,"acute hot swollen hip","septic arthritis");
      const cSign      = L(rv("c_sign")).includes("yes — typical");
      const locPatt    = L(rv("loc_pattern"));
      const fadir      = any(inAggMov,"fadir");
      const hamstrPT   = any(inLoc,"ischial tuberosity") && any(inAggAct,"sitting on hard surface","sprinting");
      const adductor   = any(inLoc,"adductor") && any(inAggMov,"resisted adduction");
      const hamstrStrain= any(av("hp_hamstring_onset")||"","sudden onset sprinting","felt pop","immediate sharp","bruising appeared");
      const quadStrain = any(av("hp_quad_onset")||"","sudden onset kicking","direct blow","immediate","cannot fully flex knee");
      const piriform   = any(av("hp_piriformis")||"","deep buttock pain","hip internal rotation","sciatica-like","sitting causes buttock");
      const meralgia   = any(av("hp_meralgia")||"","lateral thigh burning","no back pain","worse standing","tight clothing","pregnancy");
      const pubicSPD   = any(inLoc,"pubic symphysis") && any(inMoi,"post-partum","pregnancy");

      if (avn)      { prec.push("⚠ Avascular necrosis risk — urgent imaging before weight-bearing; no loading until MRI"); urgentFlag = true; }
      if (fracHip)  { prec.push("⚠ Possible hip fracture — non-weight bearing; emergency imaging"); urgentFlag = true; }
      if (septicHip){ prec.push("⚠ Possible septic hip — same-day emergency medical review; aspiration"); urgentFlag = true; }

      if (hamstrStrain) {
        differentials.push({ label:"Hamstring muscle strain",
          confidence: any(av("hp_hamstring_onset")||"","felt pop","bruising appeared","immediate sharp") ? "HIGH" : "MODERATE",
          evidence:`Sprinting / overstretching mechanism; sudden posterior thigh pain${any(av("hp_hamstring_onset")||"","bruising")?" + bruising":""}`,
          tests:["Palpation — musculotendinous junction / myotendinous","Passive straight leg raise — neural vs muscle","Resisted knee flexion at 15°","Resisted knee flexion at 90° (proximal vs distal)","Imaging: US / MRI for grading","MRI scan: grade 1/2/3 and location"] });
      }
      if (quadStrain) {
        differentials.push({ label:"Quadriceps muscle strain",
          confidence:"MODERATE",
          evidence:"Kicking / direct blow mechanism; anterior thigh pain; knee flexion restricted",
          tests:["Palpation anterior thigh — locate defect","Passive knee flexion range","Resisted knee extension isometric","Myositis ossificans risk — do not massage acutely if >48hrs","US if haematoma suspected"] });
      }
      if (cSign || (any(locPatt,"groin-dominant") && fadir)) {
        differentials.push({ label:"Intra-articular hip pathology (FAI / labral tear / OA)",
          confidence: cSign && fadir ? "HIGH" : fadir || cSign ? "MODERATE" : "LOW",
          evidence:`${cSign?"C-sign positive (patient cups anterolateral hip); ":""}${fadir?"FADIR aggravates (FAI pattern); ":""}groin-dominant location`,
          tests:["FADIR test (sensitivity: labral)","FABER test","Hip quadrant / scour test","Hip passive ROM all planes","Limb length assessment","X-ray hip (FAI — cam / pincer morphology)","MR arthrogram if labral tear suspected"] });
      }
      if (hamstrPT && !hamstrStrain) {
        differentials.push({ label:"Proximal hamstring tendinopathy",
          confidence:"MODERATE",
          evidence:"Ischial tuberosity pain; sitting on hard surfaces aggravates; sprinting / lunging aggravates",
          tests:["Ischial tuberosity palpation","Resisted knee flexion at 15° vs 90°","VISA-H questionnaire","Passive straight leg raise — stretch pain","US or MRI if diagnosis uncertain","Avoid stretching in acute phase (Kujala)"] });
      }
      if (adductor) {
        differentials.push({ label:"Adductor strain / tendinopathy",
          confidence:"MODERATE",
          evidence:"Adductor location; resisted adduction aggravates; kicking / sprinting mechanism",
          tests:["Resisted adduction — isometric","Squeeze test (0° and 45° hip flexion)","Adductor palpation","Pubic symphysis tenderness — athletic pubalgia screen","Resisted hip flexion (iliopsoas differentiation)"] });
      }
      if (any(locPatt,"lateral hip")) {
        differentials.push({ label:"Greater trochanteric pain syndrome (GTPS) / abductor tendinopathy",
          confidence: any(inAggAct,"lying on affected side","crossing legs","climbing stairs") ? "MODERATE" : "LOW",
          evidence:"Lateral hip pain over greater trochanter; lying on side / crossing legs aggravates",
          tests:["FABER test — lateral hip pain reproduction","Single leg stance — Trendelenburg","Hip abductor strength (side-lying)","30-second single-leg standing test","Avoid compressive positions (crossing legs / lying on affected side advice)"] });
      }
      if (piriform) {
        differentials.push({ label:"Piriformis / deep gluteal syndrome",
          confidence:"LOW",
          evidence:"Deep buttock pain without lumbar cause; hip internal rotation aggravates; sitting triggers sciatica",
          tests:["FAIR test (hip flexion + adduction + internal rotation)","Beatty test (side-lying hip ABD)","Palpation deep gluteal (piriformis point)","Lumbar screen — SLR to exclude radiculopathy","ULNT differential if neural component"] });
      }
      if (meralgia) {
        differentials.push({ label:"Meralgia paraesthetica (lateral femoral cutaneous nerve)",
          confidence: any(av("hp_meralgia")||"","no back pain","lateral thigh burning") ? "MODERATE" : "LOW",
          evidence:"Lateral thigh burning / numbness; no motor weakness; worse standing / walking; no lumbar cause",
          tests:["Sensory testing lateral thigh (LFCN territory)","Lumbar AROM + SLR to exclude lumbar cause","Hip quadrant — local vs referred","LFCN provocation (Tinel below inguinal ligament)","GP referral if persistent — possible nerve block"] });
      }
      if (pubicSPD) {
        differentials.push({ label:"Pubic symphysis dysfunction / SPD",
          confidence:"MODERATE",
          evidence:"Pubic symphysis location; post-partum / pregnancy; adductor / pubic pain",
          tests:["Active straight leg raise (ASLR)","Posterior pelvic pain provocation (P4/PPPP)","Palpation pubic symphysis","Hip adductor squeeze test","Sacral thrust","Pelvic floor referral"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? "⚠ Urgent referral required" : differentials[0]?.label || "Hip / groin dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Emergency referral — no loading"] :
        ["Gait observation — Trendelenburg / antalgic","Hip AROM all planes (flexion/ER/IR/abduction)",
         "FADIR test","FABER test","Thomas test (hip flexor length)",
         ...(hamstrStrain?["Hamstring palpation","Resisted knee flexion 15° + 90°","SLR — muscle vs neural"]:
             hamstrPT?["Ischial tuberosity palpation","Resisted knee flexion 15°"]:
             any(locPatt,"lateral hip")?["Single leg stance","Hip abductor strength"]:[]),
         "Lumbar screen if posterior / radiating symptoms",
         highIrrit?"Limit to passive ROM and observation first session":""];
    }

    // ─── ANKLE / FOOT ─────────────────────────────────────────────
    if (region === "Ankle / Foot") {
      const rfField    = av("af_rf");
      const plantar    = any(rv("morning"), "first step severely painful", "first step painful — then eases", "plantar fascia classic");
      const rupture    = any(rv("moi_pop"), "felt at achilles insertion", "felt at mid-achilles");
      const ottawaAF   = any(rfField,"ottawa rules — bony","ottawa rules — cannot weight bear","navicular","5th metatarsal");
      const tendinMid  = any(inLoc,"mid-portion achilles") && (warmUpPattern || any(inAggAct,"running"));
      const insertAch  = any(inLoc,"insertional") && any(rf("morning"),"achilles stiff");
      const mortons    = any(inLoc,"3rd / 4th interspace") && any(inAggAct,"tight shoes","narrow toe box");
      const tibPost    = any(inLoc,"tibialis posterior") && any(inAggAct,"walking","standing prolonged");
      const calfStrain = any(av("af_calf_onset")||"","sudden onset sprint","felt pop","shot in back of leg","immediate sharp","bruising appeared","visible defect");
      const achRupture = any(av("af_calf_onset")||"","cannot rise on tiptoe","felt like shot","achilles rupture");
      const shinPain   = any(av("af_shin_pain")||"","medial tibial","stress reaction","mtss","stress fracture");
      const lisfranc   = any(av("af_lisfranc")||"","midfoot pain","bruising on plantar","sole of foot");
      const peroneal   = any(av("af_peroneal")||"","clicking / snapping behind lateral","felt tendon flick");

      if (rupture || achRupture) { prec.push("⚠ Possible Achilles rupture — Thompson test urgently; do not weight bear; urgent orthopaedic referral"); urgentFlag = true; tags.push("⚠ Achilles rupture"); }
      if (ottawaAF) { prec.push("Ottawa Rules positive — ankle x-ray required before physiotherapy loading"); tags.push("⚠ Ottawa +ve"); }
      if (lisfranc) { prec.push("⚠ Possible Lisfranc injury — urgent orthopaedic review; non-weight bearing until x-ray + CT cleared"); tags.push("⚠ Lisfranc screen"); urgentFlag = true; }
      if (any(rfField,"compartment syndrome")) { prec.push("⚠ Compartment syndrome — emergency surgical review"); urgentFlag = true; }

      if (calfStrain || any(inMoi,"inversion sprain") && any(inLoc,"calf")) {
        differentials.push({ label:"Calf muscle strain (gastrocnemius / soleus)",
          confidence: any(av("af_calf_onset")||"","sudden onset sprint","shot in back","felt pop","bruising") ? "HIGH" : "MODERATE",
          evidence:`Sudden onset sprint / push-off mechanism; posterior calf pain${any(av("af_calf_onset")||"","bruising")?" + bruising":""}${any(av("af_calf_onset")||"","visible defect")?" + visible defect (grade 3)":""}`,
          tests:["Palpation gastrocnemius / soleus — locate tear","Thompson test (Achilles rupture exclusion)","Passive dorsiflexion — stretch pain","Resisted plantarflexion — pain + weakness","Single heel raise — endurance","US / MRI for grade 2-3 tears"] });
      }
      if (plantar) {
        differentials.push({ label:"Plantar fasciopathy",
          confidence: any(rv("morning"),"first step severely painful","then eases") ? "HIGH" : "MODERATE",
          evidence:"First-step morning pain easing with walking (classic plantar fascia pattern)",
          tests:["Windlass test (great toe extension)","Plantar fascia palpation — medial calcaneal attachment","Weight-bearing ankle DF ROM","Silfverskiöld test (equinus?)","Footwear assessment","VISA-PF questionnaire"] });
      }
      if (tendinMid) {
        differentials.push({ label:"Mid-portion Achilles tendinopathy",
          confidence: warmUpPattern && any(inAggAct,"running") ? "MODERATE" : "LOW",
          evidence:`Mid-portion Achilles location; ${warmUpPattern?"warms up with activity (classic tendinopathy)":""}; running / overuse mechanism`,
          tests:["Palpation mid-portion Achilles (2-7cm above insertion)","Single leg heel raise — endurance (30 reps)","VISA-A questionnaire","Hop test — pain provocation","Royal London Hospital test (arc sign)","US if diagnosis uncertain"] });
      }
      if (insertAch) {
        differentials.push({ label:"Insertional Achilles tendinopathy / Haglund's",
          confidence:"MODERATE",
          evidence:"Achilles insertion pain; morning stiffness; aggravated by shoe counter",
          tests:["Insertional palpation (anterior fibres)","Squeeze test — insertional","Passive DF — posterior impingement","Haglund's — bony prominence visible / palpable","VISA-A","Heel raise modification (relieve compressive load)"] });
      }
      if (mortons) {
        differentials.push({ label:"Morton's neuroma (interdigital nerve)",
          confidence:"MODERATE",
          evidence:"3rd/4th interspace burning; tight shoes aggravate; relieved by removing shoes",
          tests:["Mulder's click test (webspace compression + forefoot squeeze)","Webspace palpation — 3rd/4th space","Metatarsal compression test","Toe splay — neural tension","US confirms diagnosis (gold standard for Morton's)"] });
      }
      if (tibPost) {
        differentials.push({ label:"Tibialis posterior tendinopathy / insufficiency",
          confidence:"MODERATE",
          evidence:"Medial ankle / tibialis posterior location; walking / standing aggravates; progressive flatfoot",
          tests:["Too many toes sign (hindfoot valgus / flatfoot)","Single heel raise — inability to invert heel","Tibialis posterior palpation","Too many toes test","Resisted plantarflexion + inversion","US / MRI if rupture suspected (stage II-IV)"] });
      }
      if (shinPain) {
        differentials.push({ label: any(av("af_shin_pain")||"","focal","stress fracture","at rest") ? "Tibial stress fracture" : "Medial tibial stress syndrome (MTSS / shin splints)",
          confidence: any(av("af_shin_pain")||"","focal","at rest","stress fracture") ? "MODERATE" : "LOW",
          evidence:`${any(av("af_shin_pain")||"","focal","at rest")?"Focal tibial tenderness at rest — stress fracture screen":"Diffuse medial tibial pain with running overload"}`,
          tests:["Tibial palpation — focal vs diffuse","Ottawa-equivalent: focal + unable to hop","If stress fracture suspected: MRI (gold standard) or bone scan","Training load assessment","Running biomechanics","Bone density if recurrent"] });
      }
      if (peroneal) {
        differentials.push({ label:"Peroneal tendon subluxation / tendinopathy",
          confidence:"MODERATE",
          evidence:"Lateral ankle clicking / snapping behind fibula; felt tendon flick out of groove",
          tests:["Peroneal tendon palpation posterior to fibula","Resisted eversion","Circumduction test — reproduce subluxation","US — dynamic assessment (gold standard for subluxation)"] });
      }

      if (!differentials.length && !urgentFlag) {
        if (any(inMoi,"inversion sprain")) {
          differentials.push({ label:"Lateral ankle ligament sprain",
            confidence: any(rv("prev_sprains"),"first time") && isAcute ? "MODERATE" : "LOW",
            evidence:"Inversion mechanism; lateral ankle pain",
            tests:["Ottawa Rules (clear fracture)","Anterior drawer (ATFL)","Talar tilt (CFL)","Syndesmosis squeeze test (high ankle)","Peroneal tendons (associated injury screen)","Proprioception / balance assessment"] });
        } else {
          differentials.push({ label:"Ankle / foot dysfunction — insufficient data",
            confidence:"LOW", evidence:"Insufficient specific features for classification",
            tests:["Ankle AROM all planes","Weight-bearing DF ROM","Single leg heel raise","Gait observation","Ottawa Rules"] });
        }
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Ankle / foot dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Emergency referral — no loading until cleared"] :
        ["Gait observation — antalgic / foot mechanics","Ankle AROM all planes","Weight-bearing DF ROM (knee-to-wall test)",
         ...(plantar?["Windlass test","Plantar fascia palpation"]:tendinMid?["Heel raise endurance (30 reps)","VISA-A"]:mortons?["Mulder's click","Webspace palpation"]:[]),
         ...(shinPain?["Tibial palpation — focal vs diffuse","Hop test"]:calfStrain?["Thompson test","Calf palpation"]:[]),
         "Ottawa Rules if acute",
         highIrrit?"Limit to observation + gentle PROM only":""];
    }

    // ─── ELBOW / WRIST / HAND ─────────────────────────────────────
    if (region === "Elbow/Wrist/Hand") {
      const rfField    = av("ew_rf");
      const scaph      = any(rfField,"suspected scaphoid","anatomical snuffbox");
      const compartment= any(rfField,"acute compartment syndrome");
      const crps       = any(rfField,"reflex sympathetic","crps");
      const cts        = any(rf("neuro"),"median nerve","night — wakes","improves with shaking hand");
      const cub        = any(rf("neuro"),"ulnar nerve — worse with elbow flexion","cubital tunnel");
      const lateralEpi = any(inAggMov,"wrist extension (resisted)") && any(inAggAct,"tennis","computer mouse","lifting kettle");
      const medialEpi  = any(inAggMov,"wrist flexion (resisted)") && any(inAggAct,"golf","medial","throwing");
      const deQ        = any(rf("neuro"),"de quervain's","thumb base pain","finkelstein") || (any(inAggMov,"thumb extension / abduction") && any(inAggAct,"new parent","lifting baby"));
      const tfing      = any(rf("neuro"),"trigger finger","click / lock with flexion");
      const tfcc       = any(av("ew_tfcc")||"","ulnar wrist pain","forearm rotation","clicking / clunking at ulnar wrist");
      const ucl        = any(av("ew_ucl")||"","overhead throwing","medial elbow","valgus stress","throwing velocity");
      const olecBursa  = any(av("ew_olecranon")||"","posterior elbow swelling","visible bump","direct trauma to posterior");
      const bicepsR    = any(av("ew_biceps_rupture")||"","pop in anterior elbow","hook test","distal","visible muscle deformity");
      const pectR      = any(av("ew_pect_rupture")||"","bench press","pop in chest","immediate weakness horizontal");

      if (scaph)      { prec.push("⚠ Suspected scaphoid fracture — immobilise in scaphoid cast; MRI/CT recommended (x-ray false negative up to 20%); orthopaedic referral"); urgentFlag = true; tags.push("⚠ Scaphoid"); }
      if (compartment){ prec.push("⚠ Acute compartment syndrome — emergency surgical review; do not elevate above heart level"); urgentFlag = true; }
      if (crps)       { prec.push("⚠ CRPS features — pain clinic referral; avoid aggressive manual therapy; graded motor imagery approach"); tags.push("⚠ CRPS"); urgentFlag = true; }
      if (bicepsR)    { prec.push("⚠ Possible distal biceps rupture — urgent orthopaedic review within 2 weeks for surgical candidates"); tags.push("⚠ Biceps rupture"); urgentFlag = true; }

      if (lateralEpi) {
        differentials.push({ label:"Lateral epicondylalgia (common extensor tendinopathy)",
          confidence: any(inAggAct,"tennis","computer mouse") && any(inAggMov,"wrist extension (resisted)") ? "HIGH" : "MODERATE",
          evidence:`Lateral epicondyle; wrist extension resisted aggravates; ${any(inAggAct,"tennis")?"racquet sport":"overuse"} mechanism`,
          tests:["Cozen's test (resisted wrist extension)","Mill's test (passive wrist flexion + elbow extension)","Lateral epicondyle palpation","Grip strength comparison","PRTEE questionnaire","Cervical screen — C6 referral"] });
      }
      if (medialEpi) {
        differentials.push({ label:"Medial epicondylalgia (common flexor tendinopathy)",
          confidence:"MODERATE",
          evidence:"Medial epicondyle; wrist flexion resisted aggravates; golf / throwing mechanism",
          tests:["Resisted wrist flexion + pronation","Medial epicondyle palpation","UCL screen (valgus stress)","Ulnar nerve screen (cubital tunnel)","PRTEE questionnaire"] });
      }
      if (cts) {
        differentials.push({ label:"Carpal tunnel syndrome (median nerve)",
          confidence: any(rf("neuro"),"night — wakes","improves with shaking") ? "HIGH" : "MODERATE",
          evidence:`Median nerve distribution${any(rf("neuro"),"night — wakes")?" waking at night (classic)":""}${any(rf("neuro"),"improves with shaking")?" + flick test positive":""}`,
          tests:["Phalen's test (wrist flexion 60s)","Tinel's test at carpal tunnel","ULNT median","Two-point discrimination index finger","Nerve conduction study (gold standard)","Boston CTS questionnaire"] });
      }
      if (cub) {
        differentials.push({ label:"Cubital tunnel syndrome (ulnar nerve at elbow)",
          confidence:"MODERATE",
          evidence:"Ulnar nerve distribution (little + ring); worse with elbow flexion sustained (phone call)",
          tests:["Elbow flexion test (sustained 60s)","Tinel's at cubital tunnel","ULNT ulnar","Two-point discrimination little finger","Nerve conduction study","Intrinsic muscle wasting assessment"] });
      }
      if (deQ) {
        differentials.push({ label:"De Quervain's tenosynovitis (1st dorsal compartment)",
          confidence: any(inAggAct,"new parent","lifting baby") && any(inAggMov,"thumb extension / abduction") ? "HIGH" : "MODERATE",
          evidence:`Thumb base / radial wrist; thumb extension aggravates${any(inAggAct,"new parent","lifting baby")?" + new parent (classic)":""}`,
          tests:["Finkelstein's test","Thumb CMC loading / grinding test (exclude CMC OA)","1st dorsal compartment palpation","US if diagnosis uncertain","Thumb spica splint trial"] });
      }
      if (tfcc) {
        differentials.push({ label:"TFCC injury (triangular fibrocartilage complex)",
          confidence:"MODERATE",
          evidence:"Ulnar wrist pain; rotation (pronation/supination) aggravates; clicking with forearm rotation",
          tests:["TFCC compression test (ulnar deviation + axial load)","Piano key test (distal radioulnar joint)","Passive forearm rotation — pain arc","Fovea sign (ulnar styloid fovea palpation)","MR arthrogram (gold standard)"] });
      }
      if (ucl) {
        differentials.push({ label:"UCL elbow (medial collateral ligament — thrower's elbow)",
          confidence:"MODERATE",
          evidence:"Overhead throwing athlete; medial elbow pain at late cocking / ball release; valgus stress",
          tests:["Valgus stress test 30° flexion (moving valgus stress test)","Milking manoeuvre","Medial epicondyle vs UCL palpation","Ulnar nerve screen (associated cubital tunnel)","MRI (high sensitivity for UCL)"] });
      }
      if (tfing) {
        differentials.push({ label:"Trigger finger (digital flexor tenosynovitis)",
          confidence:"HIGH",
          evidence:"Clicking / locking with finger flexion; finger gets stuck in flexion",
          tests:["Passive / active finger flexion — trigger reproduction","A1 pulley palpation","Finger locking assessment (stuck in flexion)","GP referral for steroid injection as first line"] });
      }
      if (olecBursa) {
        differentials.push({ label:"Olecranon bursitis",
          confidence:"MODERATE",
          evidence:"Posterior elbow visible swelling; direct trauma or occupational (leaning on elbows)",
          tests:["Olecranon palpation","Fluctuance assessment","Temperature comparison","Septic bursitis: urgent aspiration if hot + systemically unwell","Gout screen if crystalline suspected"] });
      }

      if (!differentials.length && !urgentFlag) {
        differentials.push({ label:"Upper limb peripheral dysfunction — insufficient data", confidence:"LOW",
          evidence:"Insufficient specific features", tests:["Elbow/wrist/hand AROM","Grip + pinch strength","ULNT 1-4","Cervical screen"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Upper limb dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Defer assessment — urgent referral as above"] :
        ["Observation — wasting / deformity / posture","AROM — elbow / wrist / fingers / thumb","Grip strength (dynamometer)","Pinch strength",
         ...(cts?["Phalen's","Tinel's at carpal tunnel","ULNT median"]:cub?["Elbow flexion test","Tinel's at cubital tunnel","ULNT ulnar"]:
             lateralEpi?["Cozen's test","Mill's test","Grip strength comparison"]:deQ?["Finkelstein's","Thumb CMC loading"]:[]),
         "Cervical screen — AROM + ULNT (exclude double crush)"];
    }

    // ─── THORACIC ─────────────────────────────────────────────────
    if (region === "Thoracic spine") {
      const txRF   = av("tx_rf");
      const cardiac= any(txRF,"cardiac symptoms","cardiac history","radiation to left arm / jaw");
      const cord   = any(txRF,"neurological symptoms in legs","bilateral leg weakness");
      const fracT  = any(txRF,"recent trauma","known osteoporosis","pathological fracture") || fracRisk;
      const serious= txRF && !txRF.toLowerCase().includes("no red flags") && txRF.length > 5;
      const rib    = any(av("tx_rib_screen")||"","direct trauma","stress fracture","point tenderness over specific rib","rib spring");
      const costch  = any(av("tx_rib_screen")||"","costochondritis","anterior chest","cartilage tenderness","tietze");
      const facet  = any(inAggMov,"rotation") && mechanicalPattern && !constantPain;
      const postural= any(inAggPost,"computer","sitting","driving","backpack") && !constantPain;

      if (cardiac) { prec.push("⚠ Cardiac symptoms with thoracic pain — urgent ECG / medical review; not MSK until cardiac excluded"); urgentFlag = true; tags.push("⚠ Cardiac screen"); }
      if (cord)    { prec.push("⚠ Cord compression signs — urgent neurosurgical opinion"); urgentFlag = true; }
      if (fracT)   { prec.push("⚠ Thoracic fracture risk — imaging before loading; manipulation contraindicated"); tags.push("⚠ Fracture risk"); }
      if (serious && !cardiac && !cord) { prec.push("⚠ Thoracic red flags: visceral, malignancy, fracture differentials require urgent medical screening"); urgentFlag = true; }

      if (rib) {
        differentials.push({ label: any(av("tx_rib_screen")||"","stress fracture","rowing","coughing athlete") ? "Rib stress fracture" : "Rib fracture / contusion",
          confidence: any(av("tx_rib_screen")||"","direct trauma","point tenderness") ? "MODERATE" : "LOW",
          evidence:`${any(av("tx_rib_screen")||"","direct trauma")?"Direct trauma; ":""}${any(av("tx_rib_screen")||"","point tenderness")?"point rib tenderness; ":""}worse breathing / coughing`,
          tests:["Rib spring test (anterior-posterior chest compression)","Localised rib palpation","Chest x-ray (insensitive acutely — bone scan / CT better)","Breathing assessment","Spirometry if respiratory compromise"] });
      }
      if (costch) {
        differentials.push({ label:"Costochondritis / Tietze syndrome",
          confidence:"MODERATE",
          evidence:"Anterior chest wall; cartilage tenderness; no trauma; worse deep breath / cough",
          tests:["Costochondral junction palpation (2nd-5th ribs most common)","Tietze: swelling present at junction","Horizontal shoulder adduction — chest wall stress","Cardiac exclusion first if any chest symptoms"] });
      }
      if (facet && !serious) {
        differentials.push({ label:"Thoracic facet / costovertebral dysfunction",
          confidence:"MODERATE",
          evidence:"Rotation aggravates; localised thoracic pain; mechanical pattern; responds to manipulation",
          tests:["Thoracic AROM — rotation especially","PA central + unilateral pressures T1-T12","Rib springing","Costovertebral palpation","Combined movement assessment"] });
      }
      if (postural && !serious) {
        differentials.push({ label:"Thoracic postural / myofascial dysfunction",
          confidence:"LOW",
          evidence:"Sustained desk / screen posture aggravates; mechanical; no red flags",
          tests:["Thoracic kyphosis assessment","Scapular position / winging","Pectoralis minor length","Mid-thoracic AROM","PA pressures"] });
      }
      if (!differentials.length) {
        differentials.push({ label: serious ? "⚠ Thoracic pain with red flag indicators" : "Mechanical thoracic dysfunction", confidence: serious ? "HIGH" : "LOW",
          evidence: serious ? "Red flags identified — require urgent medical screening" : "Mechanical pattern, no specific classification features",
          tests: serious ? ["Urgent medical referral — do not treat as MSK yet"] : ["Thoracic AROM","PA pressures","Rib springing","Postural assessment"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Thoracic dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Urgent medical referral — do not treat as MSK until cleared"] :
        ["Postural observation — thoracic kyphosis","Thoracic AROM all planes","PA central + unilateral pressures T1-T12",
         "Rib springing","Costovertebral palpation",
         ...(rib?["Rib spring test","Localised rib palpation"]:costch?["Costochondral palpation","Horizontal shoulder adduction"]:facet?["Rotation AROM","Combined movements"]:[]),
         highIrrit?"Limit to observation + gentle PROM only":""];
    }

    // Final output for this region
    return {
      region, tags, primaryPattern, confidence, urgentFlag,
      differentials: differentials.slice(0, 3), // Top 3 only
      precautions: [...globalRedFlags, ...prec].filter(Boolean),
      objTests: objTests.filter(Boolean),
      highIrrit, modIrrit,
      inflammatoryPattern, mechanicalPattern, tendinopathicPattern,
      radiculopathySig, neurodynamicSig, nociplasticSig,
      nrsNow, nrsWorst, isAcute, isSubacute, isChronic,
    };
  }).filter(Boolean);

  // ══════════════════════════════════════════════════════════════════
  // CROSS-REGION ANALYSIS (unchanged — clinically correct)
  // ══════════════════════════════════════════════════════════════════
  const cross = [];
  const rgs = selectedRegions;
  const hasCx  = rgs.includes("Cervical spine");
  const hasLx  = rgs.includes("Lumbar / SI");
  const hasTx  = rgs.includes("Thoracic spine");
  const hasSHL = rgs.includes("Shoulder (L)");
  const hasSHR = rgs.includes("Shoulder (R)");
  const hasKnL = rgs.includes("Knee (L)");
  const hasKnR = rgs.includes("Knee (R)");
  const hasAF  = rgs.includes("Ankle / Foot");
  const hasHp  = rgs.includes("Hip / Groin");
  const hasEW  = rgs.includes("Elbow/Wrist/Hand");

  if (hasCx && (hasSHL || hasSHR))
    cross.push({type:"Differential",title:"Cervical vs Shoulder — Referred Pain",detail:"Concurrent cervical and shoulder: C4=top of shoulder; C5=deltoid region. ULNT reproducing shoulder symptoms = cervical origin. Shoulder special tests negative in pure cervical referral. Shoulder abduction relief sign (arm overhead relieves arm symptoms) = C5/C6 root. Assess cervical AROM first.",refs:"Magee Ch.3+Ch.5 / Butler (ULNT) / Wainner"});
  if (hasLx && (hasKnL || hasKnR))
    cross.push({type:"Differential",title:"Lumbar vs Knee — L3/L4 Referral",detail:"L3 radiculopathy refers to anterior thigh and medial knee. L4 to medial lower leg. Obturator nerve (L2-L4) mimics knee/groin pain. Screen lumbar AROM + SLR before knee loading. If lumbar reproduces knee symptoms, lumbar takes priority.",refs:"Magee Ch.9+Ch.12 / Butler"});
  if (hasLx && hasHp)
    cross.push({type:"Clinical note",title:"Lumbar + Hip — Kinetic Chain",detail:"Hip OA refers to groin/medial knee. Restricted hip flexion/IR increases lumbar demand through hip-lumbar rhythm. Thomas test, FABER, hip quadrant early. If hip ROM restricted, address hip before attributing all symptoms to lumbar.",refs:"Sahrmann / Magee Ch.9+Ch.11"});
  if (hasHp && (hasKnL || hasKnR))
    cross.push({type:"Clinical note",title:"Hip + Knee — Kinetic Chain",detail:"Hip abductor weakness drives dynamic knee valgus — PFPS, ITB syndrome, medial knee overload. Ankle DF restriction increases tibial internal rotation and knee valgus. Assess hip abductor strength and ankle DF ROM as part of knee evaluation.",refs:"Brukner & Khan / Cook & Purdam / BJSM"});
  if (hasAF && (hasKnL || hasKnR))
    cross.push({type:"Clinical note",title:"Ankle + Knee — Kinetic Chain",detail:"Ankle DF restriction (<35-38° weight-bearing) increases tibial internal rotation during squat/landing, loading the medial knee and patellofemoral joint. Foot hyperpronation drives dynamic valgus. Previous ankle sprains alter proprioception affecting knee stability.",refs:"Brukner & Khan / Cook & Purdam"});
  if (hasCx && hasLx)
    cross.push({type:"Clinical note",title:"Cervical + Lumbar — Multi-level Spinal",detail:"Multi-level spinal raises: axial spondyloarthropathy (AS), DISH, generalised degenerative polyarthropathy, or nociplastic pain. ESR, CRP, HLA-B27, spinal x-rays, rheumatology review if constitutional symptoms. Multi-site pain alone increases nociplastic probability.",refs:"Magee Ch.3+Ch.9 / ASAS / NICE"});
  if (hasSHL && hasSHR)
    cross.push({type:"⚠ Clinical flag",title:"Bilateral Shoulder — Systemic Screen",detail:"Screen for: PMR (age >50, bilateral shoulder + pelvic girdle, elevated ESR, prednisolone responsive — classically missed), bilateral RCT, RA, thoracic outlet. Check ESR, CRP, RF urgently. PMR responds dramatically to low-dose prednisolone.",refs:"EULAR PMR guidelines / Magee Ch.5 / BSR"});
  if (hasKnL && hasKnR)
    cross.push({type:"Clinical note",title:"Bilateral Knee — Systemic Screen",detail:"Screen for: crystal arthropathy (gout/pseudogout — acute hot joint), inflammatory arthritis (RA, psoriatic, reactive), obesity-related bilateral OA, bilateral PFPS in adolescent females. ESR, CRP, uric acid if inflammatory pattern suspected.",refs:"Magee Ch.12 / NICE / BSR"});
  if (hasCx && hasEW)
    cross.push({type:"Differential",title:"Cervical + Elbow/Wrist — Double Crush",detail:"Proximal nerve compression (cervical disc) sensitises nerve distally for compression at elbow (cubital tunnel) or wrist (carpal tunnel). ULNT 1-4 differentiates source. Treat proximal before distal. Both sites may need simultaneous treatment.",refs:"Magee Ch.3 / Butler (ULNT) / Upton & McComas (1973)"});
  if (hasLx && hasTx)
    cross.push({type:"Clinical note",title:"Thoracic + Lumbar — Combined Spinal",detail:"T12-L1 is a common hinge point — T12 refers to iliac crest/groin mimicking lumbar. Thoracic red flags must be screened carefully (higher serious pathology rate). Thoracolumbar fascia connects both regions.",refs:"Magee Ch.8+Ch.9"});
  if (hasHp && hasAF)
    cross.push({type:"Clinical note",title:"Hip + Ankle — Pelvic Kinetic Chain",detail:"Hip abductor weakness + ankle hyperpronation often co-exist driving a medial collapse pattern. Address both simultaneously. Meralgia paraesthetica (LFCN) can be aggravated by hip position changes secondary to ankle pronation compensation.",refs:"Sahrmann / Brukner & Khan"});
  if (rgs.length >= 3)
    cross.push({type:"⚠ Clinical flag",title:`${rgs.length} Simultaneous Regions — Nociplastic Screening`,detail:`${rgs.length} simultaneous pain regions significantly raises the prior probability of nociplastic pain regardless of local structural findings. The number of pain sites is independently predictive of central sensitisation. Complete: CSI (≥40 = positive), STarT Back, Örebro, PCS-13, TSK-11. Prioritise pain neurophysiology education and multidisciplinary assessment.`,refs:"Woolf (nociplastic pain — IASP 2017) / Moseley & Butler / Nijs"});

  const anyUrgent = regionResults.some(r => r.urgentFlag);
  return { regionResults, cross, anyUrgent };
}
// CollapsibleNavGroup kept for compatibility but replaced by compact 2-row nav below


// ══════════════════════════════════════════════════════════════════
// SETTINGS-STYLE ASSESSMENT UI — reusable row components
// (iOS Settings pattern: label left, value right-aligned, hairline
// dividers only — no per-field borders/boxes, no per-row icons.
// Suggestions live in a bottom sheet instead of on-screen at all times)
// ══════════════════════════════════════════════════════════════════


// ─── DIAGNOSIS ENGINE ────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// GAIT ANALYSIS MODULE
// ═══════════════════════════════════════════════════════════════════════════════


export { REG_MOD_S, runEngineV6, REGION_FAMILY_KEY, SmallClinicalImg, FunctionalScreenHub };
