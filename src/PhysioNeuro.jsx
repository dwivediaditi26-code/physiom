// PhysioNeuro.jsx — ALL_TESTS, ROM, MMT, Neurological
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { C, getC } from "./utils.jsx";


const ALL_TESTS = {
  home:{ label:"Home", icon:"🏠", desc:"App Overview & Features", groups:{ "Welcome":"HOME_MODULE" }},
  dashboard:{ label:"Dashboard", icon:"📊", desc:"Therapist Overview", groups:{ "Therapist Dashboard":"DASHBOARD_MODULE" }},
  subjective:{ label:"Subjective", icon:"📝", desc:"History & Complaint", groups:{ "Full Subjective Assessment":"SUBJECTIVE_MODULE" }},
  palpation:{ label:"Palpation", icon:"🖐️", desc:"Tissue Assessment", groups:{ "Palpation Findings":"PALPATION_MODULE" }},
  posture:{ label:"Posture Analysis", icon:"🧍", desc:"AI Postural Analysis", groups:{}},
  observation:{ label:"Observation", icon:"👁️", desc:"Visual Inspection — Magee's", groups:{
    "Clinical Observation":"OBSERVATION_MODULE",
  }},
  rom:{ label:"ROM", icon:"📐", desc:"Range of Motion", groups:{ "Full ROM Assessment":"ROM_MODULE" }},
  mmt:{ label:"Muscle MMT", icon:"💪", groups:{ "Full MMT Assessment":"MMT_MODULE" }},
  special:{ label:"Special Tests (100+)", icon:"🔬", groups:{ "All Special Tests":"SPECIAL_TESTS_MODULE" }},
  neuro:{ label:"Neurological", icon:"⚡", groups:{ "Full Neurological Assessment":"NEURO_MODULE" }},
  gait:{ label:"Gait Analysis", icon:"🚶", groups:{ "Full Gait Analysis":"GAIT_MODULE" }},
  nkt:{ label:"CPA — Compensation Pattern Analysis", icon:"🧠", groups:{ "Compensation Pattern Tests":"NKT_REGION" }},
  kinetic:{ label:"Kinetic Chain", icon:"⛓️", groups:{ "Joint-by-Joint Assessment":"KC_REGION" }},
  fascia:{ label:"Fascia Integration", icon:"🕸️", groups:{ "Fascial Assessment":"FASCIA_REGION" }},
  fma:{ label:"Functional Movement", icon:"🏃", groups:{ "Movement Analysis":"FMA_REGION" }},
  cyriax_full:{ label:"STTT — Selective Tissue Tension Test", icon:"🦴", groups:{ "Complete STTT Assessment":"CYRIAX_MODULE" }},
  outcome:{ label:"Outcome Measures", icon:"📈", groups:{ "Validated Outcome Measures":"OUTCOME_MODULE" }},
  exercise:{ label:"Treatment Prescription", icon:"💊", desc:"Exercise & Treatment Plan", groups:{ "Exercise Prescription":"EXERCISE_MODULE" }},
  tx_techniques:{ label:"Tx Techniques", icon:"🤲", groups:{ "Treatment Techniques":"TX_TECHNIQUES_MODULE" }},
  tx_sessions:{ label:"Session Log", icon:"📋", groups:{ "Treatment Session Log":"TX_SESSION_MODULE" }},
  soap:{ label:"SOAP Notes", icon:"📋", desc:"SOAP Documentation", groups:{ "SOAP Note Generator":"SOAP_MODULE" }},
  ai_assistant:{ label:"AI Assistant", icon:"🤖", desc:"AI Clinical Assistant", groups:{ "AI Clinical Assistant":"AI_MODULE" }},
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROM MODULE — Advanced Range of Motion Assessment
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Cloudinary Clinical Image System ──────────────────────────────────────
// Cloud name: dr15y1pwj
// Upload images to Cloudinary with names matching clinical IDs (e.g. rom_cflex, n_c3)
// If image doesn't exist → component renders nothing automatically
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

const ROM_DATA={
  "Cervical":[
    {id:"rom_cflex",mv:"Flexion",bilateral:false,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal (coronal)",
     start:"Seated, head neutral, stabilise thorax",gonio:"Axis: C7 SP; Fixed: vertical ref; Moving: along mastoid/ear",
     muscles:"Sternocleidomastoid, longus colli/capitis, anterior scalenes",
     endfeel:{normal:"Firm (ligamentous — posterior structures)",abnormal:"Hard=OA/disc; Empty=fracture/neoplasm; Springy=meniscoid"},
     compensation:"Thoracic flexion, chin poke (forward head)",
     capsular:"Lateral flex=Rot>Flex=Ext (cervical facet capsular pattern)",
     adl:"Looking down at phone, eating, reading",
     pathology:"Limited painfully: disc herniation (C4/5 or C5/6), facet OA; painless: muscle tightness",
     redflag:"Bilateral arm paresthesia on flex = cord compression; trauma + limited = C-spine fracture protocol",
     pediatric:"Neonatal: limited = torticollis, Klippel-Feil. Children: normal=80°",
     geriatric:"Degenerative changes reduce all planes by 25–30% by age 70"},
    {id:"rom_cext",mv:"Extension",bilateral:false,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Seated, head neutral",gonio:"Axis: C7 SP; Fixed: vertical ref; Moving: along mastoid",
     muscles:"Semispinalis capitis, splenius capitis, upper trapezius, suboccipitals",
     endfeel:{normal:"Firm (anterior ligaments)",abnormal:"Hard=OA/stenosis; Empty=instability; Springy=disc"},
     compensation:"Thoracic extension, mouth opening",
     capsular:"Extension often more limited than flexion in degenerative disease",
     adl:"Looking up at ceiling, overhead activities, reversing car",
     pathology:"Limited: cervical stenosis, OA, disc osteophyte. Pain on ext: facet compression",
     redflag:"Bilateral LE symptoms on extension = spinal stenosis. Dizziness = VBI — stop, perform VBI screen"},
    {id:"rom_clatl",mv:"Lat Flex L",bilateral:false,normal:45,unit:"°",plane:"Frontal",axis:"AP (anterior-posterior)",
     start:"Seated, stabilise ipsilateral shoulder to prevent elevation",gonio:"Axis: C7 SP; Fixed: vertical; Moving: along midline skull",
     muscles:"Ipsilateral: scalenes, SCM, upper trap, splenius; Contralateral: stretched",
     endfeel:{normal:"Firm (contralateral capsule + muscles)",abnormal:"Hard=OA/Unco; Springy=disc"},
     compensation:"Shoulder elevation (shrug), trunk lateral lean",
     capsular:"Asymmetric restriction: facet OA pattern",
     adl:"Ear to shoulder stretch, lateral reach activities",
     pathology:"Unilateral limitation: unilateral facet OA, disc herniation, scalene tightness",
     redflag:"Arm pain reproduced = radiculopathy (C4–C8). Lhermitte's sign on any cervical movement = cord lesion"},
    {id:"rom_clatr",mv:"Lat Flex R",bilateral:false,normal:45,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, stabilise contralateral shoulder",gonio:"Axis: C7 SP; Fixed: vertical; Moving: along skull midline",
     muscles:"Ipsilateral scalenes, SCM, upper trap, splenius capitis/cervicis",
     endfeel:{normal:"Firm",abnormal:"Hard=OA; Empty=trauma"},
     compensation:"Shoulder elevation, trunk lean opposite direction",
     capsular:"Compare L vs R: asymmetry >10° clinically significant",
     adl:"Phone held to ear, lateral reaching",
     pathology:"Same as Lat Flex L — compare sides for asymmetry",
     redflag:"Pain down ipsilateral arm = Spurling's positive cluster"},
    {id:"rom_crotl",mv:"Rotation L",bilateral:false,normal:60,unit:"°",plane:"Transverse",axis:"Vertical (longitudinal)",
     start:"Seated, head neutral, stabilise thorax",gonio:"Axis: crown of head; Fixed: acromial line; Moving: nose direction",
     muscles:"Contralateral SCM, ipsilateral splenius, suboccipitals",
     endfeel:{normal:"Firm (capsule + alar ligament)",abnormal:"Hard=OA/fixation; Springy=disc protrusion"},
     compensation:"Trunk rotation, chin elevation",
     capsular:"Rotation most limited in atlantoaxial OA (C1/C2)",
     adl:"Checking blind spot driving, looking sideways",
     pathology:"C1/2 OA: rotation limited bilaterally. Disc: often asymmetric + painful arc",
     redflag:"<30° rotation = atlantoaxial instability or end-stage OA. VBI symptoms: dizziness, nystagmus, diplopia"},
    {id:"rom_crotr",mv:"Rotation R",bilateral:false,normal:60,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same method",
     muscles:"Same contralateral pattern as rotation L",
     endfeel:{normal:"Firm",abnormal:"Same as rotation L"},
     compensation:"Trunk rotation, chin elevation",
     capsular:"RA: atlantoaxial instability — bilateral rotation severely limited",
     adl:"Same as rotation L",
     pathology:"Unilateral loss: facet OA, unilateral disc; Bilateral equal loss: C1/2",
     redflag:"RA patient: odontoid fracture risk — <30° rotation → X-ray"},
  ],
  "Thoracic":[
    {id:"rom_thflex",mv:"Flexion",bilateral:false,normal:50,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Seated or standing, arms crossed",gonio:"Axis: T12; Fixed: vertical; Moving: spinous process line",
     muscles:"Rectus abdominis, external obliques",
     endfeel:{normal:"Firm (posterior ligaments + facets)",abnormal:"Hard=OA/AS; Springy=disc (rare thoracic)"},
     compensation:"Lumbar flexion (monitor separately), hip flex",
     capsular:"Thoracic: Ext>Lat Flex>Rot in spondylosis; symmetric in AS",
     adl:"Bending forward (combined with lumbar), stooping",
     pathology:"AS: reduced chest expansion + all planes; Osteoporotic wedge: flexion + kyphosis",
     redflag:"Severe flexion pain with percussion tenderness = vertebral fracture. Thoracic mass: bilateral UMN signs"},
    {id:"rom_thext",mv:"Extension",bilateral:false,normal:25,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing or prone, lumbar stabilised",gonio:"Axis: T12; Fixed: vertical; Moving: spinous process",
     muscles:"Erector spinae, multifidus, semispinalis",
     endfeel:{normal:"Firm (anterior longitudinal ligament + disc)",abnormal:"Hard=OA/AS; Empty=malignancy"},
     compensation:"Lumbar hyperextension",
     capsular:"Extension earliest limited in thoracic OA",
     adl:"Upright posture, overhead reach, back bend",
     pathology:"Thoracic kyphosis: extension severely limited; Scheuermann's: fixed kyphosis",
     redflag:"Night pain + weight loss + extension pain = malignancy/infection"},
    {id:"rom_throtl",mv:"Rotation L",bilateral:false,normal:35,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Seated, arms crossed, pelvis fixed",gonio:"Axis: T1; Fixed: pelvis line; Moving: shoulder line",
     muscles:"Ipsilateral internal oblique + contralateral external oblique",
     endfeel:{normal:"Firm",abnormal:"Hard=AS/costovertebral joint restriction"},
     compensation:"Lumbar rotation, trunk lateral lean",
     capsular:"AS: marked bilateral symmetric restriction",
     adl:"Golf swing, tennis serve, trunk twisting in daily life",
     pathology:"Costovertebral joint restriction: local thoracic pain + limited ipsilateral rotation",
     redflag:"Rib pain with rotation = costovertebral joint pathology, stress fracture in athletes"},
    {id:"rom_throtr",mv:"Rotation R",bilateral:false,normal:35,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same",muscles:"Same contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Hard=costovertebral restriction"},
     compensation:"Lumbar rotation",capsular:"Compare L vs R",
     adl:"Same as rotation L",
     pathology:"Asymmetric restriction: scoliosis, unilateral facet OA",
     redflag:"Rib fracture: localized pain + limited rotation + crepitus"},
  ],
  "Lumbar":[
    {id:"rom_lflex",mv:"Flexion",bilateral:false,normal:60,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing, knees extended; also assess fingertip-to-floor distance (N=<7cm)",gonio:"Axis: S2; Fixed: vertical; Moving: T12 spinous process line; ALTERNATIVE: Schober's test (distraction from S2+10cm line: N≥5cm increase)",
     muscles:"Psoas, rectus abdominis, obliques (assist); Erector spinae eccentric control",
     endfeel:{normal:"Firm (posterior ligaments, disc tension)",abnormal:"Springy=disc herniation; Hard=OA/end-stage; Empty=fracture/malignancy"},
     compensation:"Hip flexion substituting for lumbar flex, thoracic flexion, knee bend",
     capsular:"Lumbar capsular: Ext>Lat Flex>Rot (facet joints)",
     adl:"Picking up objects, dressing, tying shoes, toileting",
     pathology:"Limited painfully: disc herniation, acute facet lock, spondylolisthesis; Painful return from flexion = disc",
     redflag:"Bowel/bladder symptoms + LBP = cauda equina — URGENT. Painful arc in flexion/return = disc pathology"},
    {id:"rom_lext",mv:"Extension",bilateral:false,normal:25,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing, hands on posterior iliac crests for stabilisation",gonio:"Axis: greater trochanter; Fixed: vertical; Moving: mid-axillary line",
     muscles:"Erector spinae, multifidus, quadratus lumborum",
     endfeel:{normal:"Firm (anterior disc/ALL + facet joint approximation)",abnormal:"Hard=OA severe; Springy=facet impingement; Empty=instability"},
     compensation:"Hip extension (gluteal contraction), knee flexion",
     capsular:"Facet OA: extension most limited + painful",
     adl:"Standing from seated, walking, reaching overhead, bending backward",
     pathology:"Limited painfully: facet OA, spondylolysis/listhesis, spinal stenosis; Pain in extension = neurogenic claudication",
     redflag:"Bilateral leg pain on extension relieved by sitting = spinal stenosis. Instability = spondylolisthesis (step sign)"},
    {id:"rom_llfl",mv:"Lat Flex L",bilateral:false,normal:25,unit:"°",plane:"Frontal",axis:"AP",
     start:"Standing, knees extended, arms at sides — measure fingertip distance traveled down leg",gonio:"Axis: S2; Fixed: vertical; Moving: T12 SP",
     muscles:"Ipsilateral: QL, erector spinae, obliques; Contralateral: stretched",
     endfeel:{normal:"Firm (contralateral ligaments + muscles)",abnormal:"Hard=OA/scoliosis; Springy=disc"},
     compensation:"Trunk rotation, lateral hip shift, knee flexion",
     capsular:"Asymmetric restriction: unilateral facet OA or disc herniation",
     adl:"Side bending for reaching, lateral reaching in ADLs",
     pathology:"Painful limited: disc herniation (list toward or away from disc depending on HNP position relative to nerve root)",
     redflag:"Lateral list: disc herniation or muscle spasm. Scoliosis: structural vs functional"},
    {id:"rom_llfr",mv:"Lat Flex R",bilateral:false,normal:25,unit:"°",plane:"Frontal",axis:"AP",
     start:"Same as Lat Flex L",gonio:"Same",muscles:"Same contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Springy=disc"},
     compensation:"Trunk rotation, hip shift",capsular:"Compare L vs R",
     adl:"Same",pathology:"Compare with L — asymmetry >10° significant",
     redflag:"Painful list = disc pathology — assess dermatomes"},
    {id:"rom_lrotl",mv:"Rotation L",bilateral:false,normal:5,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Seated, arms crossed, pelvis fixed to chair",gonio:"Axis: midline between PSIS; Fixed: pelvis; Moving: shoulder girdle line",
     muscles:"Ipsilateral internal oblique + multifidus; Contralateral external oblique",
     endfeel:{normal:"Firm (disc + capsule)",abnormal:"Hard=OA; Springy=disc"},
     compensation:"Pelvic rotation, trunk lateral lean",
     capsular:"NOTE: lumbar rotation is very limited (5°) — restriction most significant in acute disc",
     adl:"Rolling in bed, getting in/out of car, twisting",
     pathology:"Painful rotation: disc herniation (early sign), spondylodiscitis; Symmetric loss: AS",
     redflag:"Severe bilateral rotation loss + SI joint involvement = AS — check BASMI"},
    {id:"rom_lrotr",mv:"Rotation R",bilateral:false,normal:5,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same",muscles:"Same",
     endfeel:{normal:"Firm",abnormal:"Springy=disc"},
     compensation:"Pelvic rotation",capsular:"Compare L vs R",
     adl:"Same",pathology:"Same as rotation L",redflag:"Same"},
  ],
  "TMJ":[
    {id:"rom_topen",mv:"Mouth Opening",bilateral:false,normal:45,unit:"mm",plane:"Sagittal",axis:"Frontal",
     start:"Seated, teeth in crest-to-crest occlusion; measure interincisal distance",gonio:"Ruler: between upper and lower central incisors",
     muscles:"Bilateral lateral pterygoid, digastric, mylohyoid (opening); masseter, temporalis, medial pterygoid (close)",
     endfeel:{normal:"Firm (muscle/capsule at end range)",abnormal:"Springy=anterior disc displacement with reduction (click); Hard=bony block/closed lock; Empty=acute inflammation"},
     compensation:"Forward head posture to gain opening, jaw deviation (note deviation direction)",
     capsular:"TMJ capsular: limitation in opening=protrusion=contralateral deviation (ipsilateral condyle restriction)",
     adl:"Eating, yawning, talking, dental treatment",
     pathology:"<30mm = significant trismus; Clicking with opening: disc displacement with reduction; No click + limited: disc displacement without reduction (closed lock)",
     redflag:"Sudden inability to open after locking = closed lock — urgent referral. Trismus + fever = infection"},
    {id:"rom_tlatl",mv:"Lat Deviation L",bilateral:false,normal:10,unit:"mm",plane:"Frontal",axis:"Vertical",
     start:"Seated, mouth slightly open, measure deviation of lower midline from upper",gonio:"Ruler from upper to lower central incisor midlines",
     muscles:"Ipsilateral medial pterygoid + contralateral lateral pterygoid",
     endfeel:{normal:"Firm",abnormal:"Hard=bony block; Limited=ipsilateral disc; Painful=synovitis"},
     compensation:"Head tilt to compensate",capsular:"Reduced ipsilateral deviation = ipsilateral disc/capsule restriction",
     adl:"Chewing (lateral grinding movement)",
     pathology:"Deviation toward affected side on opening = ipsilateral disc or muscle pathology",
     redflag:"Unilateral deviation + pain + swelling = septic arthritis or condylar fracture"},
    {id:"rom_tlatr",mv:"Lat Deviation R",bilateral:false,normal:10,unit:"mm",plane:"Frontal",axis:"Vertical",
     start:"Same",gonio:"Same",muscles:"Contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Hard/Springy"},
     compensation:"Head tilt",capsular:"Compare L vs R",adl:"Chewing",pathology:"Same as L",redflag:"Same"},
    {id:"rom_tpro",mv:"Protrusion",bilateral:false,normal:8,unit:"mm",plane:"Sagittal",axis:"Frontal",
     start:"Seated, teeth together; measure forward movement of lower incisor beyond upper",gonio:"Ruler measurement",
     muscles:"Bilateral lateral pterygoid",
     endfeel:{normal:"Firm (temporomandibular ligament)",abnormal:"Hard=bony/OA; Reduced=capsular restriction"},
     compensation:"Forward head posture",capsular:"Reduced protrusion: bilateral capsular pattern",
     adl:"Chewing tough foods, mandibular positioning",
     pathology:"Reduced protrusion: bilateral disc displacement, OA, fibrosis post-infection",
     redflag:"Malocclusion post-trauma = condylar fracture"},
  ],
  "Shoulder":[
    {id:"rom_sflex",mv:"Flexion",bilateral:true,normal:180,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or seated; scapula stabilised after 60°",gonio:"Axis: lateral shoulder (GH joint); Fixed: mid-axillary line; Moving: lateral humerus to lateral epicondyle",
     muscles:"Anterior deltoid, coracobrachialis (0–90°); upper trap + serratus anterior (scapular upward rotation 60–180°)",
     endfeel:{normal:"Firm (posterior capsule + infraspinatus/teres minor)",abnormal:"Hard=OA/calcification; Springy=subacromial impingement; Empty=septic/acute RC tear"},
     compensation:"Trunk extension (lean back), elbow flex, shoulder hike (upper trap), scapular winging",
     capsular:"GH capsular pattern: ER>Abd>IR (STTT); impingement pattern: painful arc 60–120°",
     adl:"Reaching overhead (shelf, hair wash), throwing, swimming",
     pathology:"Arc 60–120°: impingement or partial RC. Arc 120–180° on ascent: AC joint. Full loss: frozen shoulder",
     redflag:"Sudden painless loss after trauma = complete RC tear. Fever + hot joint = septic arthritis"},
    {id:"rom_sext",mv:"Extension",bilateral:true,normal:60,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Prone or standing; stabilise scapula to prevent anterior tipping",gonio:"Axis: lateral GH; Fixed: mid-axillary line; Moving: lateral humerus",
     muscles:"Posterior deltoid, teres major, latissimus dorsi, long head triceps",
     endfeel:{normal:"Firm (anterior capsule + coracohumeral ligament)",abnormal:"Hard=OA; Springy=biceps long head"},
     compensation:"Trunk flexion, scapular anterior tipping, shoulder IR",
     capsular:"Extension less affected in GH capsular pattern than ER/Abd",
     adl:"Reaching behind back (hand to back pocket, bra hook), pushing off from chair",
     pathology:"Limited: anterior capsule tightness, biceps tendon pathology, pec major tightness",
     redflag:"Pain at extreme extension = anterior instability, SLAP lesion"},
    {id:"rom_sabd",mv:"Abduction",bilateral:true,normal:180,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, elbow extended, thumb up (scapular plane preferred = 30° forward)",gonio:"Axis: posterior GH joint; Fixed: parallel to spine; Moving: posterior humerus",
     muscles:"Supraspinatus (0–15°), deltoid (15–90°), serratus + trap (60–180° scapular rotation)",
     endfeel:{normal:"Firm (inferior GH capsule + adductors)",abnormal:"Hard=OA/calcification; Springy=subacromial impingement; Empty=fracture/acute tear"},
     compensation:"Trunk lateral lean (Trendelenburg shoulder), shoulder hike, scapular winging, elbow flex",
     capsular:"Primary GH restriction: ER>Abd>IR. Assess scapulohumeral rhythm (N = 2:1 GH:scap ratio)",
     adl:"Reaching out to side, dressing (arm into sleeve), carrying objects at side",
     pathology:"Arc 60–120°: impingement or partial RC; Full loss: frozen shoulder, GH OA, complete RC tear",
     redflag:"Acute painful arc + weakness + trauma = complete RC tear. Document scapulohumeral rhythm deviation"},
    {id:"rom_sadd",mv:"Adduction",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, assess cross-body adduction (horizontal adduction)",gonio:"Axis: anterior GH; Fixed: acromion to acromion line; Moving: humerus",
     muscles:"Pec major, latissimus dorsi, teres major, anterior deltoid",
     endfeel:{normal:"Soft (arm contact with trunk) or firm",abnormal:"Pain at extreme: AC joint pathology (horizontal add)"},
     compensation:"Trunk lean",capsular:"AC joint positive: horizontal adduction most painful",
     adl:"Hugging, crossing arms, ADL cross-body reach",
     pathology:"Horizontal adduction pain: AC joint OA, ACJ injury, subacromial pathology",
     redflag:"Cross-body pain after fall = ACJ sprain — assess step deformity"},
    {id:"rom_ser",mv:"ER",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, shoulder 0° abduction, elbow 90°; ALSO test at 90° abduction",gonio:"Axis: olecranon; Fixed: vertical/perpendicular to table; Moving: ulna/forearm",
     muscles:"Infraspinatus, teres minor, posterior deltoid",
     endfeel:{normal:"Firm (anterior capsule + subscapularis)",abnormal:"Hard=OA; Springy=impingement; Empty=acute"},
     compensation:"Shoulder elevation, trunk rotation, scapular protraction",
     capsular:"ER most limited in GH capsular pattern (frozen shoulder) — key diagnostic finding",
     adl:"Combing hair, overhead reach, throwing wind-up",
     pathology:"ER loss primary sign of GH capsular restriction. ER loss at 90° = posterior capsule tightness → impingement",
     redflag:"ER lag sign (passive > active by >5°) = infraspinatus tear. Profound ER weakness = axillary nerve injury"},
    {id:"rom_sir",mv:"IR",bilateral:true,normal:70,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, shoulder 0° abduction, elbow 90°; assess thumb-to-back (functional IR) = N: T8–T10 level",gonio:"Axis: olecranon; Fixed: vertical; Moving: ulna",
     muscles:"Subscapularis, anterior deltoid, teres major, pec major, latissimus",
     endfeel:{normal:"Firm (posterior capsule + muscles)",abnormal:"Hard=OA; Springy=posterior capsule restriction"},
     compensation:"Shoulder protraction, trunk rotation, scapular anterior tipping",
     capsular:"Posterior capsule tightness: IR limited → GIRD (glenohumeral internal rotation deficit) in throwers",
     adl:"Reaching behind back, bra hook, tucking shirt, toileting",
     pathology:"GIRD: IR loss >15° vs opposite in overhead athletes → impingement risk. Posterior labral tear",
     redflag:"Internal rotation lag sign = subscapularis tear. Belly press weakness = subscapularis rupture"},
    {id:"rom_shabd",mv:"Horiz Abduction",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine or seated, shoulder 90° abduction → assess horizontal abd",gonio:"Axis: AC joint; Fixed: acromion line; Moving: humerus",
     muscles:"Posterior deltoid, infraspinatus, teres minor",
     endfeel:{normal:"Firm (anterior capsule + pec major)",abnormal:"Springy=posterior capsule impingement"},
     compensation:"Trunk rotation",capsular:"Horizontal ABD stretches posterior capsule: reproduce posterior shoulder pain",
     adl:"Throwing follow-through, backstroke",
     pathology:"Limited horizontal ABD + posterior pain: posterior capsule tightness or posterior labral tear",
     redflag:"Instability testing: apprehension with horizontal ABD + ER = anterior instability"},
    {id:"rom_shadd",mv:"Horiz Adduction",bilateral:true,normal:135,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Shoulder 90° flex → add horizontally across body",gonio:"Axis: posterior GH; Fixed: shoulder line; Moving: humerus",
     muscles:"Pec major (sternal), anterior deltoid, coracobrachialis",
     endfeel:{normal:"Soft (contact) or firm",abnormal:"Pain at end: AC joint pathology"},
     compensation:"Trunk rotation",capsular:"AC joint: positive horizontal ADD — Scarf/cross-body test",
     adl:"Reaching across body, hugging",
     pathology:"Horizontal ADD pain at AC joint = AC pathology (Scarf test); posterior = subacromial",
     redflag:"AC joint injury grading: I (sprain), II (ACJ step), III (complete)"},
  ],
  "Elbow":[
    {id:"rom_eflex",mv:"Flexion",bilateral:true,normal:145,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Anatomical position, forearm supinated",gonio:"Axis: lateral epicondyle; Fixed: lateral humerus mid-axillary; Moving: lateral forearm to radial styloid",
     muscles:"Biceps brachii, brachialis, brachioradialis",
     endfeel:{normal:"Soft (muscle bulk contact) or hard (bone-to-bone in lean patients)",abnormal:"Hard (osteophyte/loose body); Springy (anterior capsule issue)"},
     compensation:"Shoulder flex/abd to assist",capsular:"Elbow capsular: Flex>Ext (lateral pivot shift pattern)",
     adl:"Feeding, grooming, phone use, pulling objects",
     pathology:"Limited flex: posterior osteophyte, loose body, OA; pain at end range: posterior impingement",
     redflag:"Effusion: check fat pad sign (X-ray). Valgus stress pain with flexion = UCL injury"},
    {id:"rom_eext",mv:"Extension",bilateral:true,normal:0,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Anatomical position",gonio:"Same as flexion",
     muscles:"Triceps brachii, anconeus",
     endfeel:{normal:"Hard (bone-to-bone: olecranon in fossa)",abnormal:"Firm (capsular — common in OA); Springy (loose body)"},
     compensation:"Shoulder elevation, wrist flex",capsular:"Extension loss primary sign elbow OA/capsular",
     adl:"Pushing, pressing, reaching far, overhead work",
     pathology:"Extension loss: OA, posterior impingement, loose body, flexion contracture post-fracture; Hyperextension: laxity/UCL injury",
     redflag:"Extension loss after trauma = fracture (radial head, coronoid). Hyperextension = posterior dislocation risk"},
    {id:"rom_esup",mv:"Supination",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Longitudinal",
     start:"Elbow 90° flexion, arm at side (eliminates shoulder rotation compensation)",gonio:"Axis: third finger; Fixed: parallel to humerus; Moving: dorsal forearm/pencil held in hand",
     muscles:"Biceps brachii (primary), supinator",
     endfeel:{normal:"Firm (interosseous membrane, pronator teres, oblique cord)",abnormal:"Hard=radial head OA/DRUJ arthritis; Springy=ligamentous"},
     compensation:"Shoulder ER, trunk rotation",capsular:"DRUJ capsular: supination>pronation",
     adl:"Receiving change, carrying soup bowl, turning door handle (external knob), hammering upward blow",
     pathology:"Limited supination: radial head fracture/OA, DRUJ arthritis, interosseous membrane injury",
     redflag:"Supination pain + lateral elbow = radial head fracture post-fall. DRUJ dislocation"},
    {id:"rom_epro",mv:"Pronation",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Longitudinal",
     start:"Elbow 90° flexion, arm at side",gonio:"Same as supination",
     muscles:"Pronator teres, pronator quadratus",
     endfeel:{normal:"Firm (interosseous membrane + supinator stretch)",abnormal:"Hard=DRUJ OA; Empty=acute fracture"},
     compensation:"Shoulder IR, trunk rotation",capsular:"DRUJ: pronation often better preserved than supination",
     adl:"Typing, cutting food, writing, pouring liquid",
     pathology:"Limited pronation: DRUJ arthritis, distal radius malunion, interosseous membrane",
     redflag:"Loss after distal radius fracture = DRUJ injury. Pronator syndrome: painful pronation + median nerve symptoms"},
  ],
  "Wrist":[
    {id:"rom_wflex",mv:"Wrist Flexion",bilateral:true,normal:80,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Forearm supported in pronation, wrist neutral",gonio:"Axis: lateral wrist (triquetrum); Fixed: ulna; Moving: 5th metacarpal",
     muscles:"FCR, FCU, palmaris longus; FDP/FDS assist",
     endfeel:{normal:"Firm (posterior capsule + extensor muscle stretch)",abnormal:"Hard=OA/Kienböck; Springy=TFCC/SL ligament"},
     compensation:"Forearm supination, finger extension",capsular:"Wrist capsular: flex=ext restriction in symmetry (capsular) or asymmetric (ligamentous)",
     adl:"Typing (neutral preferred), prayer position, push-up position",
     pathology:"Limited painful flex: dorsal ganglia, DISI instability, dorsal wrist impingement; Wrist OA",
     redflag:"Limited + painful with swelling = scaphoid fracture (snuffbox tenderness). TFCC: ulnar sided pain + limited"},
    {id:"rom_wext",mv:"Wrist Extension",bilateral:true,normal:70,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Forearm supported in pronation",gonio:"Axis: lateral wrist; Fixed: ulna; Moving: 5th metacarpal",
     muscles:"ECRL, ECRB, ECU",
     endfeel:{normal:"Firm (anterior capsule + flexor stretch)",abnormal:"Hard=OA; Springy=volar plate laxity"},
     compensation:"Forearm pronation, finger flex",capsular:"Wrist OA: both flex and ext equally limited",
     adl:"Push-up, weight bearing on hands, typing (slight extension), keyboard use",
     pathology:"Limited extension: tennis elbow (wrist ext pain); distal radius fracture malunion; volar ganglia",
     redflag:"<30° extension after Colles fracture = malunion — DRUJ check"},
    {id:"rom_wrad",mv:"Radial Deviation",bilateral:true,normal:20,unit:"°",plane:"Frontal",axis:"AP",
     start:"Forearm pronated on table, wrist neutral",gonio:"Axis: middle of wrist (capitate); Fixed: forearm midline; Moving: 3rd metacarpal",
     muscles:"FCR (with ECRL), APL, EPB",
     endfeel:{normal:"Firm (ulnar collateral ligament + ECU/FCU)",abnormal:"Hard=OA/scaphoid impingement; Springy=radial styloid"},
     compensation:"Forearm supination",capsular:"RA: radial deviation restricted early",
     adl:"Keyboard use, pouring, hammering",
     pathology:"Limited radial deviation: scaphoid OA, radial styloid impingement, intersection syndrome",
     redflag:"Painful radial deviation after fall = de Quervain's (Finkelstein test). Scaphoid fracture"},
    {id:"rom_wuln",mv:"Ulnar Deviation",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Forearm pronated on table, wrist neutral",gonio:"Same as radial deviation",
     muscles:"FCU, ECU",
     endfeel:{normal:"Firm (radial collateral ligament + muscles)",abnormal:"Hard=OA; Springy=TFCC"},
     compensation:"Forearm pronation",capsular:"RA: ulnar deviation is deformity direction — assess actively",
     adl:"Hammering, wringing, reaching lateral objects",
     pathology:"TFCC injury: painful ulnar deviation; Ulnar impaction: ulnar wrist pain + limited ulnar dev",
     redflag:"RA: ulnar drift deformity — do not force ulnar deviation. TFCC + ulnar impaction"},
  ],
  "Hand & Fingers":[
    {id:"rom_mcp",mv:"MCP Flexion",bilateral:true,normal:90,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Wrist neutral, assess each finger MCP individually",gonio:"Axis: dorsal MCP joint; Fixed: metacarpal shaft; Moving: proximal phalanx dorsum",
     muscles:"Flexor digitorum superficialis/profundus, lumbricals, interossei",
     endfeel:{normal:"Firm (collateral ligaments + joint capsule)",abnormal:"Springy=flexor tenosynovitis; Hard=OA/Dupuytren"},
     compensation:"Wrist flexion, finger abd/add",capsular:"RA: MCP volar subluxation + ulnar drift — assess passively with care",
     adl:"Gripping, keyboard, writing, pinching",
     pathology:"Limited MCP flex: Dupuytren's contracture, flexor tenosynovitis, RA/OA, post-fracture",
     redflag:"Sudden triggering = trigger finger (stenosing tenosynovitis). RA: MCPs swollen bilaterally = synovitis"},
    {id:"rom_pip",mv:"PIP Flexion",bilateral:true,normal:100,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"MCP neutral, assess each PIP",gonio:"Axis: lateral PIP; Fixed: proximal phalanx; Moving: middle phalanx",
     muscles:"FDS (primary PIP flexor)",
     endfeel:{normal:"Soft (tissue contact, lean) or firm",abnormal:"Springy=volar plate laxity; Hard=OA/bony block"},
     compensation:"MCP flex, wrist flex",capsular:"PIP capsular: flex>ext",
     adl:"All grip functions",
     pathology:"PIP limited: Boutonnière deformity (RA/trauma), volar plate injury, fracture, post-immobilisation contracture",
     redflag:"PIP swelling after injury = volar plate avulsion (jammed finger). Boutonnière = PIP flex + DIP ext deformity"},
    {id:"rom_dip",mv:"DIP Flexion",bilateral:true,normal:90,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"PIP in extension; assess DIP flex/ext",gonio:"Axis: lateral DIP; Fixed: middle phalanx; Moving: distal phalanx",
     muscles:"FDP (sole DIP flexor)",
     endfeel:{normal:"Firm (dorsal capsule + extensor mechanism)",abnormal:"Hard=Heberden's nodes (OA); Springy=extensor mechanism"},
     compensation:"PIP flex",capsular:"DIP: OA causes Heberden's nodes + limited flex",
     adl:"Fine pinch, typing, intricate hand work",
     pathology:"DIP extension loss: mallet finger (extensor digitorum avulsion). DIP OA: Heberden's nodes",
     redflag:"Mallet finger: DIP rests in flex, cannot actively extend = extensor avulsion — splint 6 weeks"},
    {id:"rom_thopp",mv:"Thumb Opposition",bilateral:true,normal:null,unit:"",plane:"Multi",axis:"Multi",
     start:"Assess little finger pad contact with thumb pad",gonio:"Kapandji index (0–10 scale): 0=thumb cannot reach index; 10=full opposition past little finger base",
     muscles:"Opponens pollicis, FPB, APB, FPL",
     endfeel:{normal:"Firm (1st CMC joint + AdPoll + EP)",abnormal:"Hard=CMC OA; Springy=UCL laxity (Skier's thumb)"},
     compensation:"Wrist flex, forearm pronation",capsular:"1st CMC OA: adduction + extension most limited → Z-deformity",
     adl:"Pinching, writing, buttoning, feeding, key grip",
     pathology:"CMC OA (common in women >50): adduction/extension limited → pain base thumb. CTS: APB weakness → opposition weakness",
     redflag:"CMC OA grading: I (ligamentous laxity), II–IV (progressive narrowing). Grind test positive"},
    {id:"rom_thabdm",mv:"Thumb Abd/Ext",bilateral:true,normal:70,unit:"°",plane:"Frontal",axis:"AP",
     start:"Wrist neutral, thumb alongside index; palmar abduction (out of palm plane)",gonio:"Axis: 1st MCP; Fixed: 1st metacarpal; Moving: proximal phalanx",
     muscles:"APB, APL (abduction); EPL, EPB (extension)",
     endfeel:{normal:"Firm (adductor pollicis + 1st dorsal interosseous)",abnormal:"Hard=1st CMC OA; Springy=UCL"},
     compensation:"Wrist radial deviation",capsular:"1st CMC: abduction + extension restriction in OA",
     adl:"Holding large objects, typing space bar, jar opening",
     pathology:"de Quervain's: APL/EPB tenosynovitis — painful abduction; Limited: CMC OA",
     redflag:"UCL injury (Skier's thumb): valgus stress test at MCP. Stener lesion = surgical"},
  ],
  "Hip":[
    {id:"rom_hflex",mv:"Flexion",bilateral:true,normal:120,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, knee flexed (eliminates hamstring restriction) — assess also with knee extended",gonio:"Axis: greater trochanter; Fixed: mid-axillary line; Moving: lateral femur to lateral condyle",
     muscles:"Iliopsoas (primary), rectus femoris, TFL, sartorius",
     endfeel:{normal:"Soft (anterior thigh-abdomen contact) or firm",abnormal:"Firm early=capsular/OA; Hard=CAM impingement; Empty=acute"},
     compensation:"Lumbar flexion (monitor: loss of lordosis), contralateral hip flex, posterior pelvic tilt",
     capsular:"Hip capsular: IR>Flex>Abd (late stage: all planes)",
     adl:"Sitting, stair climbing, getting out of car, sexual activity, tying shoes",
     pathology:"Limited flex: hip OA (capsular), CAM/pincer FAI, iliopsoas tendinopathy, labral tear",
     redflag:"Groin pain at end-range flex = labral tear (FADIR positive). Trauma + loss = fracture/dislocation"},
    {id:"rom_hext",mv:"Extension",bilateral:true,normal:20,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Prone, stabilise pelvis; knee extended (test hip capsule) + knee flexed 90° (test iliopsoas)",gonio:"Axis: greater trochanter; Fixed: mid-axillary line; Moving: lateral femur",
     muscles:"Gluteus maximus, hamstrings (knee extended), posterior adductor magnus",
     endfeel:{normal:"Firm (iliofemoral ligament + anterior capsule)",abnormal:"Hard=OA/CAM; Springy=posterior impingement"},
     compensation:"Lumbar hyperextension (anterior pelvic tilt), knee flex (to use hamstrings)",
     capsular:"Hip OA: extension + IR restricted earliest",
     adl:"Walking push-off, stair descending, standing from seated",
     pathology:"Hip ext loss: hip flexor contracture (Thomas test), hip OA, lumbar facet compensation",
     redflag:"Bilateral hip ext loss + fixed flexion = AS. Thomas test positive = psoas/rectus tightness"},
    {id:"rom_habd",mv:"Abduction",bilateral:true,normal:45,unit:"°",plane:"Frontal",axis:"AP",
     start:"Supine, pelvis level; stabilise contralateral ASIS",gonio:"Axis: ASIS; Fixed: ASIS-to-ASIS line; Moving: midline of thigh to midpoint of patella",
     muscles:"Gluteus medius/minimus, TFL, piriformis (at 0° flex)",
     endfeel:{normal:"Firm (adductors + pubofemoral ligament + medial capsule)",abnormal:"Hard=OA/CAM; Springy=labrum"},
     compensation:"Lateral pelvic tilt (hip hike), lumbar lateral flex, trunk lean",
     capsular:"Hip OA: abduction limited with internal rotation (combined movement most restricted)",
     adl:"Getting in/out of car, stepping sideways, putting on trousers/socks",
     pathology:"Limited abd: OA, labral tear (CAM), adductor tightness, Legg-Calvé-Perthes, DDH",
     redflag:"Bilateral abd loss in child = DDH/LCP — urgent referral. Trendelenburg sign = Gmed weakness"},
    {id:"rom_hadd",mv:"Adduction",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Supine, move test leg across midline; stabilise contralateral ASIS",gonio:"Axis: ASIS; Fixed: ASIS line; Moving: midline thigh",
     muscles:"Adductor longus/brevis/magnus, gracilis, pectineus",
     endfeel:{normal:"Firm (IT band + abductors + lateral capsule)",abnormal:"Springy=adductor strain; Hard=OA"},
     compensation:"Contralateral pelvis drop, trunk lean ipsilateral",capsular:"Less restricted than abd in OA",
     adl:"Crossing legs, horseback riding",
     pathology:"Painful adduction: adductor strain, osteitis pubis, sports hernia",
     redflag:"Adductor squeeze test <18cmHg = groin strain. Groin pain in child/adolescent = SUFE — urgent X-ray"},
    {id:"rom_her",mv:"ER",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, hip + knee 90° (seated) OR prone, knee 90° (pelvis stabilised)",gonio:"Axis: knee (midpoint); Fixed: vertical; Moving: distal fibula/tibia (pendulum method)",
     muscles:"Piriformis, obturator internus/externus, gemelli, gluteus maximus (posterior fibers)",
     endfeel:{normal:"Firm (anterior capsule + iliofemoral ligament + internal rotators)",abnormal:"Hard=OA; Springy=labral tear"},
     compensation:"Lateral pelvic tilt, lumbar rotation",capsular:"Hip OA: IR more limited than ER (early); Both limited end-stage",
     adl:"Cross-legged sitting, walking toe-out gait, external rotation in sport",
     pathology:"Piriformis syndrome: painful ER + sciatic symptoms; Hip OA: ER preserved longer than IR",
     redflag:"Bilateral ER loss in child = SUFE. Painful ER in trauma = posterior hip dislocation"},
    {id:"rom_hir",mv:"IR",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Prone knee 90° (most reliable); or supine hip 90°",gonio:"Same pendulum method as ER",
     muscles:"Gluteus medius (anterior), TFL, adductor longus",
     endfeel:{normal:"Firm (posterior capsule + external rotators + ischiofemoral ligament)",abnormal:"Hard=OA/FAI; Empty=acute; Springy=labrum"},
     compensation:"Trunk rotation, pelvic rotation",capsular:"Hip IR FIRST AND MOST LIMITED in early hip OA — key diagnostic sign",
     adl:"Getting in/out of car, sitting cross-legged is limited, pivoting",
     pathology:"IR loss: hip OA (earliest sign), CAM FAI, posterior capsule tightness; GIRD equivalent at hip",
     redflag:"IR loss + groin pain in middle-aged = hip OA. Sudden IR loss in child = SUFE/LCP — X-ray"},
  ],
  "Knee":[
    {id:"rom_kflex",mv:"Flexion",bilateral:true,normal:140,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or prone; assess both actively and passively",gonio:"Axis: lateral knee (lateral condyle); Fixed: lateral femur (greater trochanter to condyle line); Moving: lateral fibula to lateral malleolus",
     muscles:"Hamstrings (primary), gastrocnemius (assists at end range), popliteus (initiates)",
     endfeel:{normal:"Soft (posterior calf-thigh contact) or firm (capsule in lean patients)",abnormal:"Springy=meniscal block; Hard=OA/loose body; Empty=acute hemarthrosis"},
     compensation:"Hip flex to assist, ankle plantar flex to increase apparent knee flex",
     capsular:"Knee capsular: Flex>Ext (3:1 ratio in OA)",
     adl:"Stair climbing (N=85°), sitting (N=90°), squatting (N=130°), kneeling (N=140°)",
     pathology:"Limited flex: knee OA, effusion (30° is maximum comfortable flexion in effusion), patellofemoral OA, quadriceps contracture",
     redflag:"Springy block = meniscal tear (bucket handle). Locked knee = urgent. Haemarthrosis post-trauma = ACL tear"},
    {id:"rom_kext",mv:"Extension",bilateral:true,normal:0,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine; assess extension lag (difference between passive and active extension)",gonio:"Same as flexion",
     muscles:"Quadriceps (rectus femoris, vasti)",
     endfeel:{normal:"Firm (posterior capsule + posterior ligaments) or hard (bone-to-bone in hyperextension)",abnormal:"Springy=posterior impingement; Hard=OA; Soft early=effusion"},
     compensation:"Hip extension, ankle DF",capsular:"Extension loss: OA, post-surgery (arthrofibrosis), hamstring tightness",
     adl:"Walking (requires 0°), stair descent, standing",
     pathology:"Extension lag: quadriceps weakness or patella tendon rupture. Flexion contracture: OA, post-fracture, arthrofibrosis",
     redflag:"Extension lag >10° = quadriceps mechanism injury (patella or patellar tendon). PCL injury = posterior sag"},
  ],
  "Ankle":[
    {id:"rom_adf",mv:"Dorsiflexion",bilateral:true,normal:20,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or seated (non-weight bearing); also assess weight-bearing lunge test (N ≥ 10cm heel-to-wall)",gonio:"Axis: lateral malleolus; Fixed: fibula shaft; Moving: 5th metatarsal shaft",
     muscles:"Tibialis anterior, EHL, EDL, peroneus tertius",
     endfeel:{normal:"Firm (posterior capsule + Achilles/soleus tension)",abnormal:"Hard=bony block (anterior OA/os trigonum); Springy=anterior impingement; Empty=Achilles rupture"},
     compensation:"Subtalar eversion (to compensate DF with pronation), knee flex, hip flex, anterior trunk lean",
     capsular:"Ankle capsular: PF>DF (STTT)",
     adl:"Stair climbing (N=15–20°), squatting, kneeling, gait push-off",
     pathology:"Limited DF: Achilles/soleus tightness (equinus), anterior bony impingement, os trigonum, posterior capsule adhesions",
     redflag:"<10° DF = kinetic chain effects: knee valgus, foot pronation, pelvic anterior tilt in squat. Heel cord: Silfverskiöld test"},
    {id:"rom_apf",mv:"Plantarflexion",bilateral:true,normal:50,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, ankle relaxed",gonio:"Axis: lateral malleolus; Fixed: fibula; Moving: 5th metatarsal",
     muscles:"Gastrocnemius, soleus, tibialis posterior, peroneals, FHL/FDL",
     endfeel:{normal:"Firm (anterior capsule + anterior muscles stretch)",abnormal:"Hard=posterior OA/loose body; Springy=ligamentous"},
     compensation:"Hip IR, trunk lean",capsular:"Plantarflexion less affected than DF in ankle OA",
     adl:"Heel raise, ballet, push-off in walking, cycling",
     pathology:"Limited PF: anterior impingement syndrome, Achilles calcification, anterior capsule adhesion",
     redflag:"Sudden PF loss after push-off = Achilles rupture (Thompson test negative)"},
    {id:"rom_ainv",mv:"Inversion",bilateral:true,normal:35,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, ankle in plantar flex (tests subtalar); assess talar tilt",gonio:"Axis: posterior calcaneus; Fixed: tibia shaft; Moving: posterior calcaneus",
     muscles:"Tibialis posterior, FHL, FDL, tibialis anterior",
     endfeel:{normal:"Firm (lateral ligaments + peroneal muscles)",abnormal:"Springy=ATFL/CFL laxity; Hard=coalition; Empty=acute sprain"},
     compensation:"Tibial IR, knee flex",capsular:"Subtalar: inversion > eversion restriction in subtalar OA",
     adl:"Walking on uneven ground, sand",
     pathology:"Hypermobile inversion: lateral ankle sprain (ATFL/CFL); Limited: subtalar OA, tarsal coalition, peroneal tendinopathy",
     redflag:">35° inversion + pain + swelling post-sprain = grade III ATFL tear — anterior draw test. Ottawa rules: X-ray"},
    {id:"rom_aev",mv:"Eversion",bilateral:true,normal:15,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, ankle neutral",gonio:"Axis: posterior calcaneus; Fixed: tibia; Moving: posterior calcaneus",
     muscles:"Peroneus longus/brevis, peroneus tertius, EDB",
     endfeel:{normal:"Firm (medial deltoid ligament + tibialis posterior)",abnormal:"Hard=coalition; Springy=deltoid laxity"},
     compensation:"Tibial ER, knee ext",capsular:"Eversion less commonly restricted than inversion",
     adl:"Walking on uneven ground (medial stability)",
     pathology:"Hypomobile eversion: peroneal tendinopathy, subtalar OA; Hypermobile: deltoid ligament laxity",
     redflag:"Eversion force mechanism injury = deltoid ligament tear (medial ankle) — assess with stress X-ray"},
  ],
  "Foot":[
    {id:"rom_1mtpf",mv:"1st MTP Extension",bilateral:true,normal:70,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing (functional) or supine; windlass test: active hallux extension",gonio:"Axis: 1st MTP joint; Fixed: 1st metatarsal; Moving: proximal phalanx plantar surface",
     muscles:"EHL (active); passive: plantar fascia (windlass mechanism)",
     endfeel:{normal:"Firm (plantar plate + FHL + plantar fascia windlass)",abnormal:"Hard=hallux rigidus (OA); Springy=sesamoiditis; Empty=fracture"},
     compensation:"Supination of forefoot, external rotation of limb, early heel rise (antalgic gait)",
     capsular:"1st MTP OA (hallux rigidus): extension severely limited, end-range painful",
     adl:"Walking push-off (requires 65–70° MTP extension), running, going up stairs",
     pathology:"Hallux rigidus: progressive MTP extension loss → antalgic gait with external rotation. Hallux valgus: deviated alignment",
     redflag:"Acute MTP pain + limitation = turf toe (plantar plate sprain) or fracture. Grade III turf toe = surgical"},
    {id:"rom_1mtpp",mv:"1st MTP Flexion",bilateral:true,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, ankle neutral",gonio:"Axis: dorsal MTP; Fixed: 1st metatarsal; Moving: dorsal proximal phalanx",
     muscles:"FHL, FHB",
     endfeel:{normal:"Firm (dorsal capsule + EHL stretch)",abnormal:"Hard=OA; Springy=sesamoid"},
     compensation:"Ankle DF to assist toe flex",capsular:"OA: both flex and ext limited",
     adl:"Running, push-off power",
     pathology:"Limited: hallux rigidus, FHL tenosynovitis (dancer's posterior ankle pain)",
     redflag:"Posterior ankle pain + limited MTP flex in dancer = FHL tenosynovitis or os trigonum"},
    {id:"rom_mtpf2",mv:"2nd–5th MTP Extension",bilateral:true,normal:40,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine; assess each MTP extension passively",gonio:"Axis: each MTP joint",
     muscles:"EDL, EDB",
     endfeel:{normal:"Firm (plantar plate + FDL)",abnormal:"Springy=plantar plate injury; Hard=OA"},
     compensation:"Hip and knee extension",capsular:"Lesser MTP OA: variable restriction",
     adl:"Walking push-off, running",
     pathology:"Limited/painful MTP ext: Morton's neuroma (not joint), metatarsalgia, stress fracture, plantar plate injury",
     redflag:"2nd MTP dorsal dislocation (Lisfranc injury): severe pain + limited ROM + plantar ecchymosis"},
  ],
};

const ROM_REGIONS=Object.keys(ROM_DATA);
const RESTRICTION_GRADE=(measured,normal)=>{
  if(!measured||!normal) return null;
  const pct=(measured/normal)*100;
  if(pct>=85) return{label:"WNL",color:"#00c97a",pct};
  if(pct>=65) return{label:"Mild",color:"#ffb300",pct};
  if(pct>=40) return{label:"Moderate",color:"#ff8c42",pct};
  return{label:"Severe",color:"#ff4d6d",pct};
};

const ROM_REDFLAGS=[
  {test:(mv,val)=>mv.toLowerCase().includes("cervical")&&parseFloat(val)<20,msg:"Cervical ROM <20° — fracture/instability protocol. Do not passively test.",color:"#ff4d6d"},
  {test:(mv,val)=>mv.toLowerCase().includes("ankle dorsiflexion")&&parseFloat(val)<10,msg:"Ankle DF <10° — significant equinus. Kinetic chain assessment required.",color:"#ff8c42"},
  {test:(mv,val)=>mv.toLowerCase().includes("hip ir")&&parseFloat(val)<20,msg:"Hip IR <20° — possible early hip OA or FAI. Labral tear assessment indicated.",color:"#ff8c42"},
  {test:(mv,val)=>mv.toLowerCase().includes("knee flex")&&parseFloat(val)<90,msg:"Knee flexion <90° — functional limitation for ADLs. Effusion assessment needed.",color:"#ff8c42"},
];

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
    .physio-highlight { animation: physioHL 1.8s ease-out 2; }
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
          el.classList.add("physio-highlight");
          setTimeout(()=>el.classList.remove("physio-highlight"), 4000);
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
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {[["arom","Active ROM"],["prom","Passive ROM"],["resisted","Resisted"]].map(([m,l])=>
          btn(l,mode===m,()=>setMode(m),C.accent)
        )}
        <div style={{marginLeft:"auto"}}>
          {btn(showSoap?"▲ Hide SOAP":"▼ SOAP Note",showSoap,()=>setShowSoap(p=>!p),C.a3)}
        </div>
      </div>

      {/* ── ROM SNAPSHOT & TREND ───────────────────────────────────────── */}
      <div style={{background:"rgba(124,58,237,0.05)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
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

      {/* Region Tabs */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
        {ROM_REGIONS.map(r=>btn(r,region===r,()=>{setRegion(r);setSelected(null);},C.a2))}
      </div>

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
                      <div style={{fontSize:"0.6rem",color:C.muted,marginTop:1}}>{m.plane} · N={m.normal}{m.unit}</div>
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
                    <button type="button" key={p}
                      onClick={()=>set(`${m.id}_pain`,data[`${m.id}_pain`]===p?"":p)}
                      style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:5,border:`1px solid ${data[`${m.id}_pain`]===p?"#ff4d6d40":C.border}`,background:data[`${m.id}_pain`]===p?"#ff4d6d15":"transparent",color:data[`${m.id}_pain`]===p?"#ff4d6d":C.muted,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                  {["Soft","Firm","Hard","Empty","Springy"].map(ef=>(
                    <button type="button" key={ef}
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

const MMT_GRADES=[
  {g:"5",label:"Normal",desc:"Full ROM against gravity + full resistance. No fatigue.",color:"#00c97a"},
  {g:"4+",label:"Good+",desc:"Full ROM against gravity + strong resistance, slight give at end.",color:"#43d68a"},
  {g:"4",label:"Good",desc:"Full ROM against gravity + moderate resistance.",color:"#7fe88a"},
  {g:"4-",label:"Good-",desc:"Full ROM against gravity + less than moderate resistance.",color:"#b5f0a0"},
  {g:"3+",label:"Fair+",desc:"Full ROM against gravity + minimal resistance.",color:"#ffb300"},
  {g:"3",label:"Fair",desc:"Full ROM against gravity, no added resistance.",color:"#ffc940"},
  {g:"3-",label:"Fair-",desc:"More than half ROM against gravity.",color:"#ffd97a"},
  {g:"2+",label:"Poor+",desc:"Initiates movement against gravity OR full ROM gravity eliminated.",color:"#ff8c42"},
  {g:"2",label:"Poor",desc:"Full ROM in gravity-eliminated position.",color:"#ff6b2b"},
  {g:"2-",label:"Poor-",desc:"More than half ROM gravity eliminated.",color:"#ff8c6b"},
  {g:"1",label:"Trace",desc:"Palpable/visible contraction, no movement.",color:"#ff4d6d"},
  {g:"0",label:"Zero",desc:"No contraction detected on palpation.",color:"#8b0000"},
];

const MMT_DATA={
  "Cervical":[
    {id:"mmt_scm",muscle:"Sternocleidomastoid",action:"Neck flexion + ipsilateral lateral flex + contralateral rotation",nerve:"CN XI + C2–C3",root:"C2–C3",origin:"Manubrium + medial clavicle",insertion:"Mastoid process + lateral occiput",
     patient:"Supine",therapist:"Hand on forehead; stabilise thorax",resistance:"Anterior forehead into extension",gravElim:"Side-lying, support head",palpation:"Anterior neck — prominent cord from clavicle to mastoid",
     compensation:"Trunk flexion, chin poke",substitution:"Anterior scalenes, platysma",
     functional:"Head control, swallowing, UCS pattern",chain:"Overactive SCM → inhibited DNF → forward head posture"},
    {id:"mmt_dnf",muscle:"Deep Neck Flexors (longus colli/capitis)",action:"Cervical flexion with chin tuck",nerve:"C1–C4 anterior rami",root:"C1–C4",origin:"Anterior vertebral bodies C1–T3",insertion:"Basilar occiput + anterior atlas",
     patient:"Supine",therapist:"Two fingers under chin; watch for chin poke",resistance:"Posterior occiput into extension — CCFT preferred (pressure biofeedback 22–30 mmHg)",gravElim:"N/A",palpation:"Deep to SCM — cannot directly palpate; use CCFT",
     compensation:"SCM dominant — chin protrudes instead of retracts",substitution:"SCM, scalenes",
     functional:"Cervicogenic headache, WAD, forward head correction",chain:"Weak DNF → SCM overactivity → suboccipital compression → headache"},
    {id:"mmt_trap_u",muscle:"Upper Trapezius",action:"Scapular elevation + cervical lat flex + extension",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"Occiput + nuchal ligament + C7 SP",insertion:"Lateral clavicle + acromion",
     patient:"Seated",therapist:"Hand on top of shoulder",resistance:"Depress shoulder while patient shrugs",gravElim:"Supine — shoulder elevation against table",palpation:"Superior shoulder — thick band from neck to shoulder",
     compensation:"Lateral trunk lean",substitution:"Levator scapulae",
     functional:"UCS overactivation → inhibits lower trap — test bilaterally",chain:"Overactive UT + inhibited LT = classic UCS → impingement"},
    {id:"mmt_levsc",muscle:"Levator Scapulae",action:"Scapular elevation + cervical rotation/lateral flex",nerve:"C3–C4 + dorsal scapular (C5)",root:"C3–C5",origin:"C1–C4 transverse processes",insertion:"Superior angle scapula",
     patient:"Seated",therapist:"Resist shoulder elevation with neck rotated away",resistance:"Depress scapula",gravElim:"N/A",palpation:"Posterior neck between SCM and upper trap — taut band in tension",
     compensation:"Trunk lean",substitution:"Upper trap",
     functional:"Often overactive and shortened in desk workers; rarely truly weak",chain:"Tight levator → scapular downward rotation → impingement pattern"},
    {id:"mmt_scalenes",muscle:"Scalenes (Ant/Mid/Post)",action:"Cervical lateral flex + rib 1 elevation (inspiration)",nerve:"C3–C8 anterior rami",root:"C3–C8",origin:"C2–C7 transverse processes",insertion:"Rib 1 (ant/mid) + Rib 2 (post)",
     patient:"Supine",therapist:"Hand on temple, resist lateral flex",resistance:"Lateral cervical flex resistance",gravElim:"Supine supported",palpation:"Lateral neck between SCM and trapezius — palpate with caution (brachial plexus proximity)",
     compensation:"Trunk lean",substitution:"SCM",
     functional:"Thoracic outlet syndrome. TOS cluster: scalene tightness + first rib elevation + paresthesia",chain:"Tight scalenes → first rib elevation → TOS → ulnar symptoms"},
  ],
  "Shoulder & Scapula":[
    {id:"mmt_deltA",muscle:"Deltoid — Anterior",action:"Shoulder flexion 0–90°",nerve:"Axillary nerve",root:"C5–C6",origin:"Anterior lateral clavicle",insertion:"Deltoid tuberosity",
     patient:"Seated, arm at side",therapist:"Proximal forearm; stabilise shoulder",resistance:"Downward into extension at ~80° flex",gravElim:"Sidelying, support arm horizontal",palpation:"Anterior shoulder — bulk anterior to acromion",
     compensation:"Trunk extension, shoulder hike",substitution:"Biceps, pec major (clavicular head)",
     functional:"Reach forward, feeding, grooming",chain:"Weak ant delt → pec dominant → protracted shoulder → impingement"},
    {id:"mmt_deltM",muscle:"Deltoid — Middle",action:"Shoulder abduction 0–90°",nerve:"Axillary nerve",root:"C5–C6",origin:"Acromion",insertion:"Deltoid tuberosity",
     patient:"Seated",therapist:"Proximal forearm; scapula stabilised",resistance:"Downward into adduction at 90° abd",gravElim:"Supine, arm horizontal",palpation:"Lateral shoulder — most prominent deltoid mass",
     compensation:"Trunk lean, shoulder hike, scapular winging",substitution:"Supraspinatus initiates, upper trap hike",
     functional:"Reaching overhead, carrying",chain:"Weak mid delt + upper trap overactivity → impingement arc"},
    {id:"mmt_deltP",muscle:"Deltoid — Posterior",action:"Shoulder extension + ER + horizontal abduction",nerve:"Axillary nerve",root:"C5–C6",origin:"Scapular spine",insertion:"Deltoid tuberosity",
     patient:"Prone, arm over edge",therapist:"Distal humerus",resistance:"Downward into flexion",gravElim:"Sidelying",palpation:"Posterior lateral deltoid — posterior to acromion",
     compensation:"Trunk rotation, scapular retraction substitution",substitution:"Teres major, posterior RC",
     functional:"Posterior chain weakness → rounded shoulder pattern",chain:"Weak post delt → anterior dominance → thoracic kyphosis"},
    {id:"mmt_supra",muscle:"Supraspinatus",action:"Shoulder abduction initiation (0–15°) + GH compression",nerve:"Suprascapular nerve",root:"C5–C6",origin:"Supraspinous fossa",insertion:"Greater tuberosity (superior facet)",
     patient:"Seated, scapular plane (30° forward of frontal)",therapist:"Proximal forearm",resistance:"Downward at 90° in scapular plane",gravElim:"Supine",palpation:"Superior fossa above scapular spine — assess for atrophy",
     compensation:"Shoulder hike (upper trap), trunk lean",substitution:"Middle deltoid (loses initiation role)",
     functional:"Most commonly torn RC muscle. Test with empty-can and full-can",chain:"Supraspinatus tear → loss of superior cuff force couple → impingement"},
    {id:"mmt_infra",muscle:"Infraspinatus",action:"Shoulder ER",nerve:"Suprascapular nerve",root:"C5–C6",origin:"Infraspinous fossa",insertion:"Greater tuberosity (middle facet)",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm; stabilise elbow",resistance:"Into IR (downward) at neutral rotation",gravElim:"Supine, elbow at side",palpation:"Infraspinous fossa below scapular spine — assess for atrophy",
     compensation:"Trunk rotation, scapular retraction",substitution:"Teres minor, posterior deltoid",
     functional:"Key humeral head depressor. Weak infra → superior humeral migration → impingement",chain:"Infra + teres minor weakness → anterosuperior humeral migration"},
    {id:"mmt_subscap",muscle:"Subscapularis",action:"Shoulder IR",nerve:"Upper + lower subscapular nerves",root:"C5–C6",origin:"Subscapular fossa",insertion:"Lesser tuberosity",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm",resistance:"Into ER (upward)",gravElim:"Supine",palpation:"Axilla — difficult; use lift-off + belly press tests",
     compensation:"Trunk rotation, shoulder protraction",substitution:"Pec major, teres major, anterior delt",
     functional:"Primary IR and anterior stabiliser. Tear → ER lag + anterior instability",chain:"Weak subscap → anterior instability → recurrent dislocation risk"},
    {id:"mmt_tmin",muscle:"Teres Minor",action:"Shoulder ER + GH compression",nerve:"Axillary nerve",root:"C5–C6",origin:"Lateral border scapula (upper 2/3)",insertion:"Greater tuberosity (inferior facet)",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm",resistance:"Into IR",gravElim:"Supine",palpation:"Posterior axillary fold lateral to infraspinatus — below scapular spine",
     compensation:"Same as infraspinatus",substitution:"Infraspinatus",
     functional:"Hornblower's sign specific for teres minor. Isolated ER at 90° abd",chain:"Teres minor tear → ER lag at 90° abduction — Hornblower positive"},
    {id:"mmt_tmaj",muscle:"Teres Major",action:"Shoulder IR + extension + adduction",nerve:"Lower subscapular nerve",root:"C5–C6",origin:"Inferior angle scapula",insertion:"Medial lip bicipital groove",
     patient:"Prone, arm at side, shoulder slightly abducted",therapist:"Distal humerus",resistance:"Into ER and abduction",gravElim:"Sidelying",palpation:"Posterior axillary fold below teres minor — bulk inferior to infra",
     compensation:"Trunk rotation",substitution:"Latissimus dorsi, subscapularis",
     functional:"Often overactive — compensates for weak lat dorsi",chain:""},
    {id:"mmt_lat",muscle:"Latissimus Dorsi",action:"Shoulder IR + extension + adduction; depression of shoulder girdle",nerve:"Thoracodorsal nerve",root:"C6–C8",origin:"T7–L5 SPs + iliac crest + inferior angle scapula",insertion:"Floor bicipital groove",
     patient:"Prone, arm abducted 120°, IR (thumb down)",therapist:"Distal humerus",resistance:"Upward and outward (into abduction+ER)",gravElim:"Sidelying",palpation:"Posterior axillary fold and lateral thorax — large fan",
     compensation:"Trunk rotation, pelvis drop",substitution:"Teres major, posterior deltoid",
     functional:"Pull-down, rowing power. Weakness → poor shoulder depression, thoracic kyphosis driver",chain:"Weak lat → poor shoulder depression → rib flare → LBP in overhead athletes"},
    {id:"mmt_pec_maj_c",muscle:"Pectoralis Major — Clavicular",action:"Shoulder flexion + horizontal adduction",nerve:"Lateral pectoral nerve",root:"C5–C6",origin:"Medial clavicle",insertion:"Lateral lip bicipital groove",
     patient:"Supine, arm 90° flex",therapist:"Distal humerus",resistance:"Into extension + abduction",gravElim:"Seated, arm supported",palpation:"Superior pec — anterior axillary fold, near clavicle",
     compensation:"Trunk rotation, shoulder hike",substitution:"Anterior deltoid",
     functional:"Horizontal press, throwing. Often overactive → protracted shoulder",chain:""},
    {id:"mmt_pec_maj_s",muscle:"Pectoralis Major — Sternal",action:"Shoulder adduction + IR + extension from 90° flex",nerve:"Medial + lateral pectoral nerves",root:"C6–T1",origin:"Sternum + ribs 2–6",insertion:"Lateral lip bicipital groove",
     patient:"Supine, arm 60° abduction",therapist:"Distal humerus",resistance:"Into abduction",gravElim:"Seated, arm supported",palpation:"Anterior chest — sternal portion below clavicular head",
     compensation:"Trunk rotation",substitution:"Latissimus, teres major",
     functional:"Adduction and IR power. Often overactive in UCS",chain:"Overactive sternal pec → anterior humeral glide → impingement"},
    {id:"mmt_pec_min",muscle:"Pectoralis Minor",action:"Scapular protraction + anterior tilt + depression",nerve:"Medial pectoral nerve",root:"C8–T1",origin:"Ribs 3–5",insertion:"Coracoid process",
     patient:"Supine",therapist:"Test via forward shoulder position — passive stretch assessment preferred",resistance:"Coracoid press (manual)",gravElim:"N/A",palpation:"Below clavicle, under pec major — requires firm palpation through pec major",
     compensation:"N/A",substitution:"Serratus anterior (protraction)",
     functional:"Commonly short/tight → scapular anterior tilt → subacromial narrowing",chain:"Tight pec minor → scapular anterior tilt → impingement → RC tear risk"},
    {id:"mmt_serrant",muscle:"Serratus Anterior",action:"Scapular protraction + upward rotation; holds medial border to thorax",nerve:"Long thoracic nerve",root:"C5–C7",origin:"Ribs 1–8 lateral surface",insertion:"Medial border + inferior angle scapula (costal surface)",
     patient:"Standing or seated — wall push-up test",therapist:"Observe scapula during arm elevation + push-up plus",resistance:"Resist scapular protraction at elbow",gravElim:"Supine — protract scapula",palpation:"Lateral thorax below pec major — serrated fingers visible in lean athlete",
     compensation:"Scapular winging (medial border lifts), upper trap dominance",substitution:"Upper trapezius (incomplete substitute)",
     functional:"Long thoracic nerve palsy → classic winging. Critical for impingement prevention",chain:"Weak serratus → winging → reduced upward rotation → impingement"},
    {id:"mmt_trap_m",muscle:"Middle Trapezius",action:"Scapular retraction",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"C7–T3 spinous processes",insertion:"Acromion + scapular spine (medial)",
     patient:"Prone, arm 90° abduction (T position)",therapist:"Distal humerus",resistance:"Into protraction (downward and forward)",gravElim:"Seated, arm supported",palpation:"Between scapulae at T1–T3 level",
     compensation:"Trunk rotation, scapular elevation",substitution:"Rhomboids (poor quality substitute — downward rotate)",
     functional:"Scapular retraction for rowing, posture. Often inhibited in rounded shoulder",chain:"Weak mid trap + overactive pec → protraction → impingement"},
    {id:"mmt_trap_l",muscle:"Lower Trapezius",action:"Scapular depression + upward rotation + retraction",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"T4–T12 spinous processes",insertion:"Scapular spine (medial end)",
     patient:"Prone, arm 130–160° (Y position)",therapist:"Distal humerus",resistance:"Downward and lateral (into elevation + protraction)",gravElim:"Seated, arm at 130°",palpation:"Inferior to scapular spine converging toward T5–T8 midline",
     compensation:"Trunk extension, lat dominance",substitution:"Latissimus (pulls scapula down but internally rotates arm)",
     functional:"Most commonly inhibited in UCS. Essential for overhead stability",chain:"Weak lower trap → scapular upward rotation failure → impingement → RC tear"},
    {id:"mmt_rhomb",muscle:"Rhomboids (Maj + Min)",action:"Scapular retraction + downward rotation + elevation",nerve:"Dorsal scapular nerve",root:"C4–C5",origin:"C7–T5 spinous processes",insertion:"Medial scapular border",
     patient:"Prone, hand on opposite buttock (scapula winging)",therapist:"Resist scapular border lifting",resistance:"Into protraction",gravElim:"Seated, arm behind back",palpation:"Medial scapular border — deep to trapezius; difficult",
     compensation:"Trunk rotation",substitution:"Middle trap",
     functional:"Often overused as substitute for lower trap. Downward rotation is harmful pattern",chain:"Rhomboid dominance → scapular downward rotation → impingement"},
    {id:"mmt_corbrach",muscle:"Coracobrachialis",action:"Shoulder flexion + adduction",nerve:"Musculocutaneous nerve",root:"C5–C7",origin:"Coracoid process",insertion:"Medial humerus (mid-shaft)",
     patient:"Seated, arm 45° flexion + slight adduction",therapist:"Distal humerus",resistance:"Into extension + abduction",gravElim:"Sidelying",palpation:"Medial arm proximal — deep to biceps in axilla region",
     compensation:"Trunk flex, shoulder hike",substitution:"Anterior deltoid, pec major clavicular",
     functional:"Rarely isolated clinically; assessed with anterior shoulder complex",chain:""},
  ],
  "Elbow & Forearm":[
    {id:"mmt_bicep",muscle:"Biceps Brachii",action:"Elbow flexion + forearm supination",nerve:"Musculocutaneous nerve",root:"C5–C6",origin:"Coracoid (short) + supraglenoid tubercle (long)",insertion:"Radial tuberosity + bicipital aponeurosis",
     patient:"Seated, elbow 90°, forearm supinated",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine, arm at side",palpation:"Anterior arm belly — most palpable with supinated elbow flex",
     compensation:"Trunk flexion, shoulder shrug",substitution:"Brachialis, brachioradialis (lose supination component)",
     functional:"Rupture — Popeye sign. SLAP associated. Test C5/C6 myotome",chain:"Biceps overactivity (tight) → inhibited triceps → elbow extension limitation"},
    {id:"mmt_brach",muscle:"Brachialis",action:"Elbow flexion (all positions)",nerve:"Musculocutaneous nerve (+ small radial nerve branch)",root:"C5–C6",origin:"Anterior humerus (distal half)",insertion:"Coronoid process + ulnar tuberosity",
     patient:"Seated, elbow 90°, forearm PRONATED (eliminates biceps supination advantage)",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine, arm at side",palpation:"Lateral to biceps, distal arm — under biceps",
     compensation:"Trunk flex, shoulder flex",substitution:"Biceps (different forearm position distinguishes)",
     functional:"True elbow flexor. Test with pronated forearm to isolate from biceps",chain:""},
    {id:"mmt_brachio",muscle:"Brachioradialis",action:"Elbow flexion (midprone position most effective)",nerve:"Radial nerve",root:"C5–C6",origin:"Lateral supracondylar ridge",insertion:"Styloid process radius",
     patient:"Seated, forearm MIDPRONE (thumb up)",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine",palpation:"Lateral forearm proximal — superficial cord when resisted in midprone",
     compensation:"Trunk flex",substitution:"Biceps, brachialis",
     functional:"Radial nerve test muscle (C5/C6). Preserved in posterior interosseous nerve injury",chain:""},
    {id:"mmt_tricep",muscle:"Triceps Brachii",action:"Elbow extension",nerve:"Radial nerve",root:"C6–C8 (primarily C7)",origin:"Infraglenoid tubercle (long) + posterior humerus (med/lat)",insertion:"Olecranon",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm",resistance:"Into flexion",gravElim:"Supine, arm supported in 90° shoulder flex",palpation:"Posterior arm — all three heads palpable; long head medial, lateral head lateral",
     compensation:"Shoulder extension, trunk extension",substitution:"Gravity (in supine positioning)",
     functional:"C7 myotome. Key test for C6/7 disc herniation. Radial nerve palsy = triceps weakness",chain:"Weak triceps → elbow extension deficit → overhead press limitation"},
    {id:"mmt_supinator",muscle:"Supinator",action:"Forearm supination (with elbow extended — eliminates biceps)",nerve:"Deep radial nerve (posterior interosseous)",root:"C6",origin:"Lateral epicondyle + supinator crest of ulna",insertion:"Anterior radius (proximal third)",
     patient:"Seated, elbow extended, forearm pronated",therapist:"Distal forearm",resistance:"Into pronation",gravElim:"Supported forearm",palpation:"Deep — cannot palpate directly; isolate by testing with elbow extended",
     compensation:"Shoulder ER, biceps activation (flex elbow to test supinator alone)",substitution:"Biceps (dominant supinator when elbow flexed)",
     functional:"Posterior interosseous nerve injury → supinator + wrist/finger extensor weakness",chain:""},
    {id:"mmt_pt",muscle:"Pronator Teres",action:"Forearm pronation + elbow flexion assist",nerve:"Median nerve",root:"C6–C7",origin:"Medial epicondyle + coronoid process",insertion:"Lateral radius (mid)",
     patient:"Seated, elbow 90°, forearm supinated",therapist:"Distal forearm",resistance:"Into supination",gravElim:"Supported",palpation:"Medial forearm proximal — oblique cord from medial epicondyle",
     compensation:"Shoulder IR",substitution:"Pronator quadratus",
     functional:"Pronator syndrome: compression of median nerve by PT — pain with resisted pronation + elbow flex",chain:""},
    {id:"mmt_pq",muscle:"Pronator Quadratus",action:"Forearm pronation (with elbow extended — isolates from PT)",nerve:"Anterior interosseous nerve (median)",root:"C8–T1",origin:"Distal anterior ulna",insertion:"Distal anterior radius",
     patient:"Seated, elbow extended, forearm supinated",therapist:"Distal forearm",resistance:"Into supination",gravElim:"Supported",palpation:"Distal anterior forearm — deep; cannot distinguish from PT by palpation",
     compensation:"Shoulder IR",substitution:"Pronator teres",
     functional:"AIN injury → loss of PQ + FPL + FDP index → weak pinch (OK sign)",chain:""},
  ],
  "Wrist & Hand":[
    {id:"mmt_ecrb",muscle:"ECRL + ECRB",action:"Wrist extension + radial deviation",nerve:"Radial nerve (ECRL) + deep radial/PIN (ECRB)",root:"C6–C7",origin:"Lateral supracondylar ridge",insertion:"2nd (ECRL) + 3rd (ECRB) metacarpal bases",
     patient:"Seated, forearm pronated, wrist neutral",therapist:"Dorsum of hand",resistance:"Into flexion + ulnar deviation",gravElim:"Forearm supported on table",palpation:"Dorsal forearm lateral — prominent with wrist ext + radial dev",
     compensation:"Finger extensors, trunk",substitution:"EDC (finger extensors extend wrist weakly)",
     functional:"C6 myotome. Radial nerve palsy = wrist drop. Tennis elbow: ECRB origin",chain:"ECRB weakness → compensatory wrist flex → CTS risk"},
    {id:"mmt_ecul",muscle:"Extensor Carpi Ulnaris",action:"Wrist extension + ulnar deviation",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Lateral epicondyle + posterior ulna",insertion:"5th metacarpal base",
     patient:"Forearm pronated, wrist neutral",therapist:"Dorso-ulnar hand",resistance:"Into flexion + radial deviation",gravElim:"Forearm supported",palpation:"Dorso-ulnar forearm — distal to lateral epicondyle",
     compensation:"EDC",substitution:"ECU absent → ECR only → radial deviation during extension",
     functional:"DRUJ stabiliser. ECU instability → ulnar wrist pain in athletes",chain:""},
    {id:"mmt_fcr",muscle:"Flexor Carpi Radialis",action:"Wrist flexion + radial deviation",nerve:"Median nerve",root:"C6–C7",origin:"Medial epicondyle",insertion:"2nd metacarpal base",
     patient:"Forearm supinated, wrist neutral",therapist:"Palmar radial hand",resistance:"Into extension + ulnar deviation",gravElim:"Forearm supported",palpation:"Volar forearm radial — prominent tendon with resisted flex + radial dev",
     compensation:"FDP/FDS (finger flex weakly flex wrist)",substitution:"FCU",
     functional:"Median nerve injury → FCR weak → wrist deviates ulnar during flex",chain:""},
    {id:"mmt_fcu",muscle:"Flexor Carpi Ulnaris",action:"Wrist flexion + ulnar deviation",nerve:"Ulnar nerve",root:"C7–T1",origin:"Medial epicondyle + olecranon/ulnar border",insertion:"Pisiform → hook hamate → 5th metacarpal",
     patient:"Forearm supinated",therapist:"Palmar ulnar hand",resistance:"Into extension + radial deviation",gravElim:"Forearm supported",palpation:"Ulnar border volar forearm — tendon to pisiform",
     compensation:"FDP/FDS",substitution:"FCR",
     functional:"Cubital tunnel: ulnar nerve at elbow → FCU weak + intrinsic weak + ulnar claw",chain:""},
    {id:"mmt_fdp",muscle:"FDP (Flexor Digitorum Profundus)",action:"DIP flexion (all fingers)",nerve:"AIN of median (index/middle) + ulnar (ring/little)",root:"C7–C8",origin:"Anterior ulna + interosseous membrane",insertion:"Distal phalanx base (volar)",
     patient:"Stabilise middle phalanx; flex DIP",therapist:"Stabilise PIP in extension",resistance:"DIP extension",gravElim:"Hand flat on table",palpation:"Anterior forearm — deep layer",
     compensation:"FDS activation (flexes PIP not DIP)",substitution:"Intrinsics cannot flex DIP",
     functional:"AIN injury: FDP index + FDP middle + FPL weak → pinch deficit (OK sign). Profundus avulsion: jersey finger",chain:""},
    {id:"mmt_fds",muscle:"FDS (Flexor Digitorum Superficialis)",action:"PIP flexion",nerve:"Median nerve",root:"C7–T1",origin:"Medial epicondyle + radius",insertion:"Middle phalanx base (volar)",
     patient:"Hold all non-tested fingers in extension; active PIP flex on tested finger",therapist:"Stabilise adjacent fingers (blocks FDP)",resistance:"PIP extension",gravElim:"Hand resting",palpation:"Anterior forearm — mid layer; feel tendons at wrist",
     compensation:"FDP (if adjacent fingers not blocked)",substitution:"Cannot substitute in correct isolation",
     functional:"Median nerve injury proximal → FDS weak. Test each finger independently",chain:""},
    {id:"mmt_edc",muscle:"EDC (Extensor Digitorum Communis)",action:"MCP extension (finger extension)",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Lateral epicondyle",insertion:"Extensor hood → middle + distal phalanges",
     patient:"Fist then extend MCPs",therapist:"Dorsal proximal phalanges",resistance:"Into MCP flexion",gravElim:"Hand resting",palpation:"Dorsal forearm — four tendons visible on dorsum hand",
     compensation:"Intrinsics (IP extension without MCP extension)",substitution:"EIP, EDM (partial)",
     functional:"Radial nerve palsy → wrist drop + finger drop. PIN injury → finger drop only (wrist ext preserved)",chain:""},
    {id:"mmt_lumb",muscle:"Lumbricals (1st–4th)",action:"MCP flexion + IP extension simultaneously",nerve:"Median (1st + 2nd) + Ulnar (3rd + 4th)",root:"C8–T1",origin:"FDP tendons",insertion:"Radial lateral band extensor hood",
     patient:"MCP 90° flex, IPs extended",therapist:"Resist MCP into extension + IP into flexion",resistance:"Disrupt intrinsic-plus position",gravElim:"Hand supported",palpation:"Lateral aspect finger — very small; impractical to palpate",
     compensation:"EDC (extends IPs but also extends MCPs)",substitution:"Interossei (similar action)",
     functional:"Key for intrinsic-plus position. Ulnar nerve injury → 4th+5th claw (ring/little finger claw deformity)",chain:"Intrinsic weakness → claw hand → grip deficit"},
    {id:"mmt_interos",muscle:"Palmar + Dorsal Interossei",action:"Finger adduction (palmar) + abduction (dorsal) + MCP flex + IP ext",nerve:"Ulnar nerve (deep branch)",root:"C8–T1",origin:"Metacarpal shafts",insertion:"Extensor hood + proximal phalanx bases",
     patient:"Fingers flat on table; abduct/adduct against resistance",therapist:"Resist individual finger adduction/abduction",resistance:"Into adduction (dorsal) or abduction (palmar)",gravElim:"Hand on table",palpation:"First dorsal interosseous — web space thumb/index; most accessible",
     compensation:"Flexor or extensor tendons impart some deviation",substitution:"N/A",
     functional:"Ulnar nerve injury → all interossei weak → Froment's sign + claw. Wartenberg's sign",chain:"Weak interossei → poor lateral pinch → grip compensation → flexor overuse → trigger finger"},
    {id:"mmt_apbrev",muscle:"Abductor Pollicis Brevis",action:"Thumb palmar abduction",nerve:"Median nerve (recurrent branch)",root:"C8–T1",origin:"Flexor retinaculum + scaphoid + trapezium",insertion:"Radial base proximal phalanx thumb",
     patient:"Hand supinated, thumb raised away from palm",therapist:"Resist thumb back toward palm",resistance:"Into adduction",gravElim:"Hand on table",palpation:"Thenar eminence — most superficial thenar muscle",
     compensation:"APL (abducts thumb in plane of palm — not palmar abduction)",substitution:"FPB (assists weakly)",
     functional:"CTS → APB weakness + thenar atrophy. Key median nerve test at wrist",chain:"Weak APB → poor opposition → thumb circumduction → grip pattern change"},
    {id:"mmt_adpoll",muscle:"Adductor Pollicis",action:"Thumb adduction",nerve:"Ulnar nerve (deep branch)",root:"C8–T1",origin:"3rd metacarpal + capitate + 2nd metacarpal (oblique head)",insertion:"Ulnar base proximal phalanx thumb",
     patient:"Thumb parallel to index, adduct toward index",therapist:"Resist thumb from adducting",resistance:"Abduction",gravElim:"Hand flat",palpation:"First web space — deep; palpate between thumb and index metacarpals",
     compensation:"FPL (flexes IP to maintain paper between fingers = Froment's sign)",substitution:"FPL substitution",
     functional:"Froment's sign: paper held between thumb/index — IP flex = FPL compensating for weak Add Poll (ulnar nerve)",chain:""},
    {id:"mmt_fpoll",muscle:"FPL (Flexor Pollicis Longus)",action:"Thumb IP flexion",nerve:"Anterior interosseous nerve (median)",root:"C7–C8",origin:"Anterior radius + interosseous membrane",insertion:"Distal phalanx thumb (volar)",
     patient:"Stabilise proximal phalanx; flex thumb DIP",therapist:"Stabilise thumb MCP in extension",resistance:"IP extension",gravElim:"Hand resting",palpation:"Anterior forearm radial — deep to FCR",
     compensation:"FPB (MCP flex only)",substitution:"None for IP flex",
     functional:"AIN injury: FPL + FDP (index/middle) + PQ → cannot make OK sign (circle sign test)",chain:""},
    {id:"mmt_epi",muscle:"Extensor Pollicis Longus + Brevis",action:"Thumb IP extension (EPL) + MCP extension (EPB)",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Posterior ulna (EPL) + posterior radius (EPB)",insertion:"Distal phalanx (EPL) + proximal phalanx (EPB)",
     patient:"Forearm pronated, thumb extended",therapist:"Resist thumb into flexion at IP (EPL) or MCP (EPB)",resistance:"Into flexion",gravElim:"Forearm supported",palpation:"Anatomical snuffbox borders — EPL ulnar border; EPB radial border",
     compensation:"APL (abducts but cannot extend)",substitution:"N/A",
     functional:"EPL rupture: RA complication (attrition rupture at Lister's tubercle). Retroposition test = EPL integrity",chain:""},
  ],
  "Spine & Core":[
    {id:"mmt_rflex",muscle:"Rectus Abdominis",action:"Trunk flexion",nerve:"T5–T12 anterior rami",root:"T5–T12",origin:"Pubic crest + symphysis",insertion:"Xiphoid + costal cartilages 5–7",
     patient:"Supine, knees flexed",therapist:"Watch trunk curl",resistance:"Grade 5: arms crossed + curl off table; Grade 4: arms forward; Grade 3: arms at head; Grade 2: partial curl; Grade 1: palpate",gravElim:"N/A",palpation:"Anterior abdomen between linea alba",
     compensation:"Hip flexors pull pelvis — watch lumbar arch",substitution:"Hip flexors (flex trunk weakly via pelvis)",
     functional:"Diastasis recti: linea alba separation — palpate gap during crunch",chain:"Weak rectus → posterior pelvic tilt deficit → LBP pattern"},
    {id:"mmt_oblique",muscle:"External + Internal Obliques",action:"Trunk rotation + lateral flex",nerve:"T6–L1 anterior rami",root:"T6–L1",origin:"Ribs 5–12 (EO); iliac crest + inguinal lig (IO)",insertion:"Linea alba + iliac crest",
     patient:"Supine, knees flexed",therapist:"Resist rotation",resistance:"Oblique curl — elbow to opposite knee",gravElim:"Gravity eliminated rotation in sidelying",palpation:"Lateral abdominal wall — EO most superficial; IO under EO",
     compensation:"Trunk extension, hip flexors",substitution:"RA (flexion only)",
     functional:"Core rotation power. Weak obliques → poor rotational control → disc injury",chain:"Weak obliques + tight hip flexors → anterior pelvic tilt → LBP"},
    {id:"mmt_ta",muscle:"Transversus Abdominis",action:"Intra-abdominal pressure + lumbar corset",nerve:"T6–L1 anterior rami",root:"T6–L1",origin:"Lateral inguinal lig + iliac crest + thoracolumbar fascia + costal cartilages 7–12",insertion:"Linea alba + pubic crest via conjoint tendon",
     patient:"Crook-lying; draw-in manoeuvre",therapist:"Ultrasound preferred; or RTPU method — palpate just medial to ASIS",resistance:"Not a standard MMT — assess via draw-in / CCFT / ultrasound",gravElim:"N/A",palpation:"2cm medial + inferior to ASIS — feel firm contraction during draw-in without OI activation",
     compensation:"Breath holding, OI/EO dominant contraction",substitution:"External oblique (sucking in belly)",
     functional:"Inhibited in ALL chronic LBP. Must activate BEFORE limb movement (feed-forward). Assessed via CCFT and real-time US",chain:"Weak TA → loss of lumbar segmental control → disc, facet, SIJ injury"},
    {id:"mmt_multif",muscle:"Multifidus",action:"Lumbar segmental extension + rotation control",nerve:"Medial branch of posterior rami",root:"L1–S3",origin:"Posterior sacrum + mammillary processes L1–L5",insertion:"Spinous processes 2–4 levels above",
     patient:"Prone",therapist:"Palpate adjacent to spinous process; ask for isolated 'swelling' contraction",resistance:"Prone leg lift with multifidus palpation at target segment",gravElim:"N/A",palpation:"1–2cm lateral to spinous process — bimanual fingertip palpation; compare segmental bulk",
     compensation:"Global extensor contraction",substitution:"Erector spinae (extension without segmental control)",
     functional:"Atrophies unilaterally and rapidly after LBP onset. Assess by palpation bilaterally for symmetry. MRI gold standard",chain:"Multifidus atrophy → segmental instability → recurrent disc herniation"},
    {id:"mmt_es",muscle:"Erector Spinae",action:"Trunk extension + lateral flex",nerve:"Posterior rami L1–L5",root:"L1–L5",origin:"Sacrum + iliac crest + spinous processes",insertion:"Ribs + transverse processes + occipital",
     patient:"Prone, arms at side",therapist:"Posterior thorax",resistance:"Resist trunk extension lift off table",gravElim:"Sidelying",palpation:"Bilateral paravertebral columns lateral to spinous processes — very palpable",
     compensation:"Gluteus maximus assists",substitution:"Short intersegmental extensors",
     functional:"Often overactive (hypertonic) rather than truly weak. Assess length-tension",chain:"Overactive ES + weak glute max → hip ext substitution → LBP"},
    {id:"mmt_ql",muscle:"Quadratus Lumborum",action:"Lateral trunk flex + hip hike + respiratory rib 12 anchor",nerve:"T12–L3 anterior rami",root:"T12–L3",origin:"Posterior iliac crest + iliolumbar ligament",insertion:"12th rib + transverse processes L1–L4",
     patient:"Sidelying, hip hike against gravity",therapist:"Stabilise pelvis",resistance:"Hip drop (adduction with lateral trunk flex)",gravElim:"Supine — lateral pelvic tilt",palpation:"Lateral to erector spinae above iliac crest — posterior triangle; bimanual deep pressure",
     compensation:"Lat dorsi, obliques",substitution:"Hip abductors via pelvis",
     functional:"Often OVERACTIVE (tight) when glute med inhibited. QL spasm mimics LBP. Referred pain: buttock, lateral hip, lateral thigh",chain:"Tight QL → elevated iliac crest → scoliotic posture → SIJ strain → hip OA"},
    {id:"mmt_iliop",muscle:"Iliopsoas",action:"Hip flexion + lumbar lordosis",nerve:"Femoral nerve + direct L1–L3",root:"L1–L3",origin:"Iliac fossa (iliacus) + T12–L5 VBs + discs (psoas)",insertion:"Lesser trochanter",
     patient:"Seated at table edge — hip flexion against resistance",therapist:"Distal thigh",resistance:"Into extension",gravElim:"Supine, thigh slides on table",palpation:"Deep to abdominal wall below ASIS — difficult; assess functionally",
     compensation:"Trunk flexion, hip hiking, RA contraction",substitution:"TFL, rectus femoris, sartorius",
     functional:"Thomas test positive = tight. Hip flexion weakness (L2/L3). Psoas abscess mimics hip pathology. Snapping hip syndrome",chain:"Tight iliopsoas → anterior pelvic tilt → lumbar hyperlordosis → facet overload → LBP"},
  ],
  "Hip & Pelvis":[
    {id:"mmt_gmax",muscle:"Gluteus Maximus",action:"Hip extension + ER",nerve:"Inferior gluteal nerve",root:"L5–S2",origin:"Posterior ilium + sacrum + coccyx + sacrotuberous ligament",insertion:"Gluteal tuberosity + IT band",
     patient:"Prone, knee flexed 90° (shortens hamstrings)",therapist:"Posterior distal thigh",resistance:"Into flexion (downward toward table)",gravElim:"Sidelying",palpation:"Buttock mass — most powerful hip extensor; palpate with knee flexed",
     compensation:"Hamstrings, erector spinae, QL",substitution:"Hamstrings (extend hip but flex knee — different pattern)",
     functional:"Dead lift, stair ascent, running push-off. Weak Gmax → hamstring strain, LBP, SIJ instability",chain:"Weak glute max → hamstring compensation → proximal hamstring tendinopathy"},
    {id:"mmt_gmed",muscle:"Gluteus Medius",action:"Hip abduction + IR (anterior fibres) + ER (posterior fibres)",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"Outer ilium (between anterior and posterior gluteal lines)",insertion:"Greater trochanter (lateral + superoposterior)",
     patient:"Sidelying, test leg on top, hip neutral",therapist:"Distal thigh",resistance:"Into adduction",gravElim:"Supine, abduct along table",palpation:"Lateral hip between ASIS and greater trochanter — wide fan",
     compensation:"Hip flexion (TFL substitute), trunk lateral lean, pelvis elevation",substitution:"TFL (flex + IR component), piriformis (ER component)",
     functional:"Trendelenburg sign. Key Gmax for running, stairs. Weak Gmed → lateral knee pain, IT band, patellofemoral pain",chain:"Weak Gmed → Trendelenburg → contralateral hip drop → IT band tension → lateral knee pain"},
    {id:"mmt_gmin",muscle:"Gluteus Minimus",action:"Hip abduction + IR",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"Outer ilium (between anterior and inferior gluteal lines)",insertion:"Greater trochanter (anterior)",
     patient:"Sidelying — same as Gmed test",therapist:"Distal thigh",resistance:"Into adduction",gravElim:"Supine",palpation:"Anterior to Gmed — cannot differentiate clinically from Gmed",
     compensation:"TFL, hip flexion",substitution:"TFL",
     functional:"Clinically grouped with Gmed. Tear: trochanteric bursitis-like presentation",chain:""},
    {id:"mmt_tfl",muscle:"Tensor Fasciae Latae",action:"Hip flexion + abduction + IR; IT band tension",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"ASIS + anterior iliac crest",insertion:"IT band → Gerdy's tubercle",
     patient:"Supine, hip flexed 30° + slight abd + IR",therapist:"Distal thigh",resistance:"Into extension + adduction + ER",gravElim:"Sidelying",palpation:"Lateral to ASIS — anterior lateral thigh proximal",
     compensation:"Rectus femoris, hip flexors",substitution:"Gmed anterior fibres",
     functional:"Often overactive compensating for weak Gmed. IT band tightness. Ober test",chain:"Tight TFL → IT band tension → lateral knee pain → patella maltracking → PFPS"},
    {id:"mmt_adduc",muscle:"Hip Adductors (Longus/Brevis/Magnus/Gracilis/Pectineus)",action:"Hip adduction",nerve:"Obturator nerve (+ femoral for pectineus)",root:"L2–L4",origin:"Pubic rami + ischial tuberosity (magnus)",insertion:"Linea aspera + adductor tubercle (magnus) + medial tibia (gracilis)",
     patient:"Sidelying, test leg on bottom; top leg supported",therapist:"Medial distal thigh",resistance:"Into abduction",gravElim:"Supine — squeeze legs against resistance",palpation:"Medial thigh — longus most anterior; palpate proximal medial thigh",
     compensation:"Hip flexion, trunk lean",substitution:"Gracilis (also flexes knee)",
     functional:"Groin strain = adductor longus usually. Adductor squeeze test <1.0kg = groin strain risk. Sports hernia cluster",chain:"Weak adductors → poor medial knee control → valgus → ACL risk"},
    {id:"mmt_hamstr",muscle:"Hamstrings (Biceps Femoris + Semitendinosus + Semimembranosus)",action:"Knee flexion + hip extension",nerve:"Sciatic nerve (tibial division for semi; common peroneal for BF short head)",root:"L5–S2",origin:"Ischial tuberosity (long) + linea aspera BF (short)",insertion:"Fibula head (BF) + medial tibia (semi)",
     patient:"Prone, knee 90°",therapist:"Distal lower leg",resistance:"Into knee extension",gravElim:"Sidelying",palpation:"Posterior thigh — BF lateral, semiT + semiM medial; palpate at 90° flex",
     compensation:"Hip ER/IR for BF vs semi isolation",substitution:"Gastrocnemius (knee flex at end range)",
     functional:"L5/S1 myotome. Proximal hamstring tendinopathy: ischial tuberosity pain. Strain: musculotendinous junction",chain:"Weak hamstrings → knee hyperextension tendency → PCL stress + quad dominant pattern"},
    {id:"mmt_pirif",muscle:"Piriformis",action:"Hip ER (neutral) + abduction (90° flex)",nerve:"Nerve to piriformis (S1–S2)",root:"S1–S2",origin:"Anterior sacrum (S2–S4)",insertion:"Greater trochanter (superior)",
     patient:"Prone, knee 90°, ER foot toward ceiling (hip ER test)",therapist:"Medial lower leg",resistance:"Into IR (push foot outward = IR = resist ER)",gravElim:"Supine",palpation:"Deep gluteal — midpoint between PSIS and greater trochanter; difficult",
     compensation:"Gluteus maximus",substitution:"Obturators, gemelli",
     functional:"Piriformis syndrome: sciatic nerve compression. FAIR test. Often overactive when Gmed/Gmax inhibited",chain:"Tight piriformis → sciatic compression → pseudo-sciatica → missed disc diagnosis"},
    {id:"mmt_rectfem",muscle:"Rectus Femoris",action:"Knee extension + hip flexion",nerve:"Femoral nerve",root:"L2–L4",origin:"AIIS + acetabular ridge",insertion:"Quadriceps tendon → patella → patellar tendon → tibial tuberosity",
     patient:"Supine, assess knee extension from 90°",therapist:"Distal lower leg",resistance:"Into knee flex",gravElim:"Sidelying",palpation:"Anterior thigh central — straight line from AIIS to patella",
     compensation:"Hip flexion substitution (if tested separately)",substitution:"Vasti (for knee ext); iliopsoas (for hip flex)",
     functional:"Two-joint muscle. Prone knee bend test for tightness. Ely's test. AIIS avulsion in adolescents",chain:"Tight rectus femoris → anterior pelvic tilt → LBP + patellofemoral pain"},
  ],
  "Knee":[
    {id:"mmt_quad",muscle:"Quadriceps (Vastus Medialis/Lateralis/Intermedius)",action:"Knee extension",nerve:"Femoral nerve",root:"L2–L4",origin:"Anterior femur",insertion:"Tibial tuberosity via patellar tendon",
     patient:"Seated, lower leg hanging",therapist:"Anterior distal lower leg",resistance:"Into knee flexion",gravElim:"Sidelying",palpation:"VMO: medial patella — last 10–15° extension. VL: lateral thigh. VI: deep central",
     compensation:"Trunk extension, hip hike",substitution:"None effective",
     functional:"VMO:VL ratio key for patellar tracking. Atrophy post ACL/knee injury. L3/L4 myotome",chain:"Weak VMO → lateral patella tilt → PFPS → chondromalacia"},
    {id:"mmt_gastroc",muscle:"Gastrocnemius",action:"Ankle PF + knee flexion",nerve:"Tibial nerve",root:"S1–S2",origin:"Medial + lateral femoral condyles",insertion:"Calcaneus via Achilles tendon",
     patient:"Prone, knee extended (to test gastroc vs soleus)",therapist:"Plantar foot",resistance:"Into dorsiflexion",gravElim:"Sidelying",palpation:"Posterior calf — most superficial; medial head larger; palpate belly",
     compensation:"Tibialis posterior, peroneals",substitution:"Soleus (if knee flexed — gastroc slack)",
     functional:"Single-leg heel raise × 25 reps = normal. S1 myotome. Achilles rupture (Thompson test). DVT risk: calf pain",chain:"Weak gastroc + soleus → reduced push-off → gait compensation → Achilles tendinopathy"},
    {id:"mmt_poplit",muscle:"Popliteus",action:"Knee IR (tibia on femur) + unlock knee from extension",nerve:"Tibial nerve",root:"L4–S1",origin:"Lateral femoral condyle + arcuate ligament",insertion:"Posterior proximal tibia",
     patient:"Prone, knee 90°, tibial IR",therapist:"Distal lower leg medial border",resistance:"Into tibial ER",gravElim:"Sidelying",palpation:"Posterior knee — deep to heads of gastroc; palpate in popliteal fossa",
     compensation:"Hamstrings",substitution:"Semitendinosus/semimembranosus",
     functional:"First muscle to fire in knee flexion from full extension. Popliteus strain: acute posterolateral knee pain",chain:"Weak popliteus → failed screw-home unlock → knee buckling in early stance"},
  ],
  "Ankle & Foot":[
    {id:"mmt_ta",muscle:"Tibialis Anterior",action:"Ankle dorsiflexion + inversion",nerve:"Deep peroneal nerve",root:"L4–L5",origin:"Lateral tibial condyle + proximal 2/3 anterior tibia",insertion:"Medial cuneiform + 1st metatarsal base",
     patient:"Seated or supine",therapist:"Dorsomedial foot",resistance:"Into plantarflexion + eversion",gravElim:"Sidelying",palpation:"Anterior shin — most prominent tendon medial to tibial crest",
     compensation:"Long toe extensors",substitution:"EHL, EDL (partial DF with eversion)",
     functional:"L4 myotome. Foot drop = L4/L5 or common peroneal nerve. Anterior compartment syndrome risk with exercise",chain:"Weak TA → foot drop → steppage gait → hip flexor overuse → hip flexor strain"},
    {id:"mmt_soleus",muscle:"Soleus",action:"Ankle plantarflexion (dominant with knee flexed)",nerve:"Tibial nerve",root:"S1–S2",origin:"Posterior fibula + soleal line tibia",insertion:"Calcaneus via Achilles tendon",
     patient:"Prone, KNEE FLEXED 90° (slackens gastroc — isolates soleus)",therapist:"Plantar foot",resistance:"Into dorsiflexion",gravElim:"Sidelying",palpation:"Posterior calf deep to gastroc — bulges lateral to gastroc at ankle",
     compensation:"Hip extension assist",substitution:"Gastroc (only if knee extends)",
     functional:"Single-leg heel raise with knee bent. Soleus dominant in quiet standing and low-speed walking. Key for Achilles loading",chain:"Weak soleus → eccentric Achilles overload → mid-portion Achilles tendinopathy"},
    {id:"mmt_tp",muscle:"Tibialis Posterior",action:"Ankle PF + inversion + arch support",nerve:"Tibial nerve",root:"L4–L5",origin:"Posterior interosseous membrane + tibia + fibula",insertion:"Navicular + cuneiforms + metatarsals 2–4",
     patient:"Seated, ankle plantarflexed + inverted",therapist:"Medial plantar foot",resistance:"Into DF + eversion",gravElim:"Supine",palpation:"Medial ankle behind medial malleolus — posterior to medial malleolus tendon",
     compensation:"Gastroc/soleus PF",substitution:"FHL, FDL",
     functional:"TP insufficiency → progressive flatfoot. Navicular drop test. Single-leg heel raise with TP dysfunction: too many toes sign",chain:"Weak TP → medial arch collapse → subtalar pronation → knee valgus → patellofemoral pain → hip IR"},
    {id:"mmt_peronls",muscle:"Peroneals (Longus + Brevis)",action:"Ankle eversion + PF assist; 1st ray plantarflexion (longus)",nerve:"Superficial peroneal nerve",root:"L5–S1",origin:"Fibula shaft (lateral)",insertion:"1st metatarsal/medial cuneiform (longus) + 5th metatarsal base (brevis)",
     patient:"Sidelying, foot everted + plantarflexed",therapist:"Lateral plantar foot",resistance:"Into inversion + DF",gravElim:"Supine",palpation:"Lateral lower leg — posterior to fibula; tendons behind lateral malleolus",
     compensation:"EDL (eversion + DF)",substitution:"EDL",
     functional:"Lateral ankle sprain → peroneal injury + weakness → recurrent sprain. Peroneal tendon subluxation. Superficial peroneal nerve injury → weak eversion",chain:"Weak peroneals → inversion instability → recurrent lateral ankle sprain → OA"},
    {id:"mmt_ehl",muscle:"Extensor Hallucis Longus",action:"Great toe extension + ankle DF assist",nerve:"Deep peroneal nerve",root:"L5",origin:"Mid-anterior fibula + interosseous membrane",insertion:"Distal phalanx great toe",
     patient:"Supine, foot relaxed",therapist:"Dorsum distal phalanx great toe",resistance:"Into great toe flexion",gravElim:"N/A",palpation:"Anterior lower leg medial to EDL — tendon visible on dorsum foot to great toe",
     compensation:"Tibialis anterior (DF without toe ext)",substitution:"EDL (partial toe extension)",
     functional:"L5 myotome. EHL weakness: L4/L5 disc herniation hallmark sign. Foot drop assessment",chain:""},
    {id:"mmt_edl",muscle:"Extensor Digitorum Longus + Peroneus Tertius",action:"Toe extension + DF + eversion",nerve:"Deep peroneal nerve",root:"L5–S1",origin:"Lateral condyle tibia + anterior fibula",insertion:"Middle + distal phalanges toes 2–5; 5th metatarsal base (PT)",
     patient:"Supine, foot relaxed",therapist:"Dorsum of toes",resistance:"Into toe flexion",gravElim:"N/A",palpation:"Lateral to TA tendon on dorsum — four tendons visible",
     compensation:"EHL",substitution:"None effective",
     functional:"Foot drop: TA + EHL + EDL all weak (L4/L5 + CPN). Anterior compartment",chain:""},
    {id:"mmt_fdl",muscle:"FDL + FHL (toe flexors)",action:"Toe IP flexion (FDL) + great toe IP flex (FHL)",nerve:"Tibial nerve",root:"S2–S3",origin:"Posterior tibia (FDL) + posterior fibula (FHL)",insertion:"Distal phalanges toes",
     patient:"Supine, flex toes against resistance",therapist:"Plantar surface distal phalanges",resistance:"Into toe extension",gravElim:"Foot resting",palpation:"FHL: medial ankle behind posterior tibialis — behind medial malleolus",
     compensation:"Intrinsic foot muscles",substitution:"Plantar intrinsics (MTP flexion only)",
     functional:"Hallux IP flex = FHL. FHL tenosynovitis in dancers: posterior ankle pain. Trigger toe",chain:""},
    {id:"mmt_abdhal",muscle:"Abductor Hallucis",action:"Great toe abduction + MTP flex",nerve:"Medial plantar nerve",root:"S2–S3",origin:"Calcaneal tuberosity",insertion:"Medial base proximal phalanx great toe",
     patient:"Supine, abduct great toe from 2nd",therapist:"Medial distal great toe",resistance:"Into adduction",gravElim:"Foot resting",palpation:"Medial foot between medial malleolus and 1st metatarsal head — medial arch",
     compensation:"FHL",substitution:"None",
     functional:"Hallux valgus: AbdHal weak and malpositioned. Plantar fasciitis: weak intrinsics. Key foot stability muscle",chain:"Weak AbdHal → loss of medial arch control → plantar fascia overload → plantar fasciitis"},
  ],
  "TMJ & Facial":[
    {id:"mmt_masseter",muscle:"Masseter",action:"Jaw closure (elevation)",nerve:"CN V3 (trigeminal — mandibular)",root:"CN V3",origin:"Zygomatic arch",insertion:"Ramus + angle of mandible",
     patient:"Seated, slightly open mouth",therapist:"Chin — resist closure",resistance:"Into jaw opening",gravElim:"N/A",palpation:"Angle of jaw — prominent with clenching",
     compensation:"Temporalis",substitution:"Temporalis, medial pterygoid",
     functional:"TMJ pain: assess for asymmetric hypertrophy, bruxism, trismus. Normal opening 40–50mm",chain:"Masseter hypertonicity → TMJ compression → disc displacement → headache"},
    {id:"mmt_temporalis",muscle:"Temporalis",action:"Jaw elevation + retraction",nerve:"CN V3",root:"CN V3",origin:"Temporal fossa",insertion:"Coronoid process",
     patient:"Seated",therapist:"Chin",resistance:"Into depression",gravElim:"N/A",palpation:"Temple — palpate during clenching",
     compensation:"Masseter",substitution:"Masseter",
     functional:"Temporal headache from TMJ. Temporalis tenderness = bruxism / TMD",chain:""},
    {id:"mmt_lat_pter",muscle:"Lateral Pterygoid",action:"Jaw opening + protrusion + contralateral deviation",nerve:"CN V3",root:"CN V3",origin:"Lateral pterygoid plate + greater wing sphenoid",insertion:"Condylar neck + articular disc",
     patient:"Resist jaw protrusion",therapist:"Chin anterior surface",resistance:"Into retrusion",gravElim:"N/A",palpation:"Intraoral posterior to upper molars — technically demanding",
     compensation:"Digastric",substitution:"N/A",
     functional:"Hyperactive lat pterygoid → TMJ clicking (disc pulled anteriorly). Key in TMD",chain:"Hyperactive lat pterygoid → anterior disc displacement → clicking → closed lock"},
  ],
  "Respiratory":[
    {id:"mmt_diaphragm",muscle:"Diaphragm",action:"Primary inspiration",nerve:"Phrenic nerve (C3–C5)",root:"C3–C5",origin:"Xiphoid + costal cartilages 6–12 + lumbar vertebrae",insertion:"Central tendon",
     patient:"Supine, observe abdominal expansion on inspiration",therapist:"Hands on lower chest + abdomen",resistance:"Assess paradoxical breathing or reduced excursion",gravElim:"N/A",palpation:"Subcostal — palpate diaphragm excursion; ultrasound preferred",
     compensation:"Accessory muscles (SCM, scalenes, pec minor)",substitution:"Intercostals + accessory muscles",
     functional:"C3/C4 SCI → diaphragm paralysis → ventilator dependence. Hiccups = phrenic irritation. Hook-lying: observe abdominal rise before chest",chain:"Weak diaphragm → accessory muscle over-use → rib 1 elevation → TOS → cervicogenic symptoms"},
    {id:"mmt_intercost",muscle:"Intercostals (External + Internal)",action:"Rib elevation (external) + depression (internal)",nerve:"Intercostal nerves T1–T11",root:"T1–T11",origin:"Rib below (external) + rib above (internal)",insertion:"Rib above (external) + rib below (internal)",
     patient:"Observe chest expansion — measure at axilla with tape",therapist:"Assess symmetry of chest expansion (normal: 3–5cm)",resistance:"N/A",gravElim:"N/A",palpation:"Between ribs — palpate movement during breathing",
     compensation:"Accessory muscles",substitution:"N/A",
     functional:"<2.5cm chest expansion = restrictive (ankylosing spondylitis). Assess with tape measure at T4",chain:"Intercostal restriction → reduced vital capacity → O2 desaturation on exertion"},
  ],
};

const MMT_GRADE_OPTIONS=["5","4+","4","4-","3+","3","3-","2+","2","2-","1","0","NT"];
const MMT_REGIONS=Object.keys(MMT_DATA);

const RED_FLAGS_MMT=[
  {pattern:(r)=>Object.values(r).some(v=>v&&["1","0"].includes(v.split("_")[0])),msg:"Grade 0–1 detected — consider neurological workup and urgent referral if acute onset.",color:"#ff4d6d"},
  {pattern:(r)=>["mmt_gmed_L","mmt_gmed_R"].every(k=>r[k]&&parseInt(r[k])<3),msg:"Bilateral Gmed ≤ 2 — significant fall risk. Neurological vs myopathic cause?",color:"#ff4d6d"},
  {pattern:(r)=>["mmt_dnf_L","mmt_dnf_R","mmt_scm_L","mmt_scm_R"].some(k=>r[k]&&parseInt(r[k])===0),msg:"Cervical muscle grade 0 — possible high cervical cord lesion. URGENT.",color:"#ff4d6d"},
];

const KINETIC_CHAINS=[
  {muscles:["mmt_dnf","mmt_ta","mmt_gmax","mmt_gmed"],label:"Posterior Oblique Sling",interpretation:"Weakness pattern: forward head + anterior pelvic tilt + Trendelenburg gait."},
  {muscles:["mmt_serrant","mmt_trap_l","mmt_gmed","mmt_tp"],label:"Upper + Lower Cross Stabilisers",interpretation:"Weakness: scapular winging + medial arch collapse. Classic UCS+LCS pattern."},
  {muscles:["mmt_quad","mmt_ta","mmt_gmax"],label:"Anterior-Posterior Force Couple",interpretation:"Weakness: knee hyperextension + anterior pelvic tilt + lumbar hyperlordosis."},
  {muscles:["mmt_peronls","mmt_tp","mmt_abdhal"],label:"Ankle Stability Complex",interpretation:"Weakness: recurrent lateral sprain + progressive flatfoot + plantar fasciitis."},
];

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
          el.classList.add("physio-highlight");
          setTimeout(()=>el.classList.remove("physio-highlight"), 4000);
        }
      });
    }, 350);
  },[navContext.mmtHighlight, navContext.mmtHighlights]);
  const [selected,setSelected]=useState(null);
  const [showInterp,setShowInterp]=useState(false);

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

      {/* MMT Grade Legend */}
      <div style={{marginBottom:12,padding:"8px 10px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:"0.6rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>MMT Scale</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {MMT_GRADES.map(g=>(
            <span key={g.g} style={{fontSize:"0.62rem",padding:"2px 6px",borderRadius:5,background:`${g.color}20`,color:g.color,fontWeight:700,border:`1px solid ${g.color}30`}} title={g.desc}>
              {g.g} {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* Region Tabs */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
        {MMT_REGIONS.map(r=>btn(r,region===r,()=>{setRegion(r);setSelected(null)},C.a2))}
      </div>

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
              <div onClick={()=>setSelected(isOpen?null:m.id)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"0.82rem",color:hasVal?C.text:C.muted}}>{m.muscle}</div>
                  <div style={{fontSize:"0.65rem",color:C.muted,marginTop:1}}>{m.nerve} · {m.root}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {/* Bilateral Grading */}
                  {["L","R"].map(side=>{
                    const val=data[`mmt_${m.id}_${side}`];
                    return(
                      <div key={side} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <span style={{fontSize:"0.55rem",color:C.muted,fontWeight:600}}>{side}</span>
                        <select
                          value={val||""}
                          onChange={e=>{e.stopPropagation();set(`mmt_${m.id}_${side}`,e.target.value);}}
                          onClick={e=>e.stopPropagation()}
                          style={{fontSize:"0.68rem",padding:"2px 4px",borderRadius:5,border:`1px solid ${val?gradeColor(val):C.border}`,background:val?`${gradeColor(val)}18`:C.s2,color:val?gradeColor(val):C.muted,fontWeight:700,cursor:"pointer",width:46}}
                        >
                          <option value="">--</option>
                          {MMT_GRADE_OPTIONS.map(g=><option key={g} value={g}>{g}</option>)}
                        </select>
                        {val&&<span style={{fontSize:"0.55rem",color:gradeColor(val),fontWeight:600}}>{gradeLabel(val)}</span>}
                      </div>
                    );
                  })}
                  <span style={{color:C.muted,fontSize:"0.7rem",marginLeft:4}}>{isOpen?"▲":"▼"}</span>
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

const DERMATOMES = [
  { id:"n_c3",  level:"C3",  region:"Posterior neck / occipital",         reflex:null,    myotome:"Neck lateral flexion",         disc:"C2/3" },
  { id:"n_c4",  level:"C4",  region:"Cape (shoulder top)",                reflex:null,    myotome:"Shoulder elevation (trap)",    disc:"C3/4" },
  { id:"n_c5",  level:"C5",  region:"Lateral arm / deltoid badge",        reflex:"Biceps (C5–C6)", myotome:"Shoulder abduction / elbow flex", disc:"C4/5" },
  { id:"n_c6",  level:"C6",  region:"Lateral forearm / thumb + index",    reflex:"Brachioradialis", myotome:"Wrist extension (ECRL/ECRB)",   disc:"C5/6" },
  { id:"n_c7",  level:"C7",  region:"Middle finger",                       reflex:"Triceps (C6–C7)", myotome:"Elbow extension / wrist flex",  disc:"C6/7" },
  { id:"n_c8",  level:"C8",  region:"Little + ring finger / medial FA",   reflex:null,    myotome:"Finger flexion / intrinsics",  disc:"C7/T1" },
  { id:"n_t1",  level:"T1",  region:"Medial forearm / elbow",             reflex:null,    myotome:"Finger abduction (1st dorsal)", disc:"T1/2" },
  { id:"n_l1",  level:"L1",  region:"Groin / upper anterior thigh",       reflex:null,    myotome:"Hip flexion",                  disc:"L1/2" },
  { id:"n_l2",  level:"L2",  region:"Anterior + medial thigh",            reflex:null,    myotome:"Hip flexion / knee ext (assist)", disc:"L2/3" },
  { id:"n_l3",  level:"L3",  region:"Medial knee / lower anterior thigh", reflex:"Patella (L3–L4)", myotome:"Knee extension (quad)",      disc:"L3/4" },
  { id:"n_l4",  level:"L4",  region:"Medial leg / medial foot",           reflex:"Patella (L3–L4)", myotome:"Ankle dorsiflexion (TA)",    disc:"L4/5" },
  { id:"n_l5",  level:"L5",  region:"Dorsum foot / 1st–2nd web space",    reflex:null,    myotome:"Great toe extension (EHL)",    disc:"L4/5" },
  { id:"n_s1",  level:"S1",  region:"Lateral foot / heel / sole",         reflex:"Achilles (S1)", myotome:"Ankle plantarflexion (gastroc)", disc:"L5/S1" },
  { id:"n_s2",  level:"S2",  region:"Posterior thigh",                    reflex:null,    myotome:"Knee flexion (hamstrings)",    disc:"S1/2" },
  { id:"n_s3",  level:"S3",  region:"Medial thigh / perineum",            reflex:null,    myotome:"Bowel/bladder sphincter",      disc:"—" },
  { id:"n_s4s5",level:"S4/5",region:"Perianal / saddle",                  reflex:"Anal wink", myotome:"Sphincter tone",           disc:"Cauda equina" },
];

const MYOTOMES = [
  { level:"C1–C2", action:"Neck flexion",              test:"Active neck curl against gravity", compensation:"SCM dominant — look for chin poke" },
  { level:"C3",    action:"Neck lateral flexion",       test:"Side flex against resistance",     compensation:"Shoulder elevation (trap)" },
  { level:"C4",    action:"Shoulder elevation",         test:"Shrug against resistance",         compensation:"Neck side flex" },
  { level:"C5",    action:"Shoulder abduction / deltoid", test:"Arm abduction 0–90° resist",   compensation:"Trunk lean, shoulder hike" },
  { level:"C6",    action:"Wrist extension",            test:"Make fist, extend wrist resist",  compensation:"Supinator, BR activation" },
  { level:"C7",    action:"Elbow extension / wrist flex", test:"Triceps push, wrist curl",      compensation:"Shoulder ER, elbow flex" },
  { level:"C8",    action:"Finger flexion (grip)",      test:"Grip dynamometer or resist 3rd–5th DIP flex", compensation:"Wrist flexor dominant" },
  { level:"T1",    action:"Finger abduction",           test:"Spread fingers resist adduction", compensation:"Flexor override" },
  { level:"L1–L2", action:"Hip flexion",                test:"Hip flex seated 0–90° resist",    compensation:"QL, trunk lean back" },
  { level:"L3",    action:"Knee extension",             test:"Extend knee from 90° against resist", compensation:"Hip flexor assist" },
  { level:"L4",    action:"Ankle dorsiflexion (TA)",    test:"Walk on heels / resist DF",       compensation:"EHL dominant" },
  { level:"L5",    action:"Great toe extension (EHL)",  test:"Lift big toe resist",             compensation:"EDB firing, ankle inversion" },
  { level:"S1",    action:"Ankle plantarflexion",       test:"25 single-leg calf raises",       compensation:"Peroneals, flexor hallucis" },
  { level:"S2",    action:"Knee flexion (hamstring)",   test:"Prone knee flex 90° resist",      compensation:"Gastrocnemius, gluteus max" },
];

const REFLEXES = [
  // ── Deep Tendon Reflexes (LMN indicators) ────────────────────────────────
  { id:"n_ref_jaw",     label:"Jaw Jerk",               level:"V (trigeminal)",  group:"DTR", technique:"Patient relaxed, mouth slightly open. Place finger on chin, tap with reflex hammer. Normal = minimal jaw closure. Brisk = pathological.", finding:"Brisk/exaggerated = UMN lesion ABOVE the pons (supranuclear). Normal or absent = brainstem/LMN. Urgency: CNS referral if brisk.", pathological:true, umnSign:true },
  { id:"n_ref_bicep",   label:"Biceps",                  level:"C5–C6",           group:"DTR", technique:"Elbow flexed to ~90°. Place thumb firmly on biceps tendon in antecubital fossa. Tap thumb with reflex hammer. Observe/feel for elbow flexion.", finding:"Diminished or absent = C5/C6 LMN (radiculopathy, peripheral nerve). Brisk/hyperactive = UMN (myelopathy, cord compression above C5). Asymmetry always significant.", pathological:false, umnSign:false },
  { id:"n_ref_brad",    label:"Brachioradialis",         level:"C5–C6",           group:"DTR", technique:"Forearm in neutral (semi-pronated), resting on thigh. Tap brachioradialis tendon 2–3cm proximal to radial styloid. Normal = forearm flexion + slight supination.", finding:"Absent = C5/6 radiculopathy. INVERTED reflex: BR absent + finger flexors contract = pathognomonic of cervical myelopathy at C5/6 — URGENT.", pathological:false, umnSign:false },
  { id:"n_ref_tricep",  label:"Triceps",                 level:"C6–C7",           group:"DTR", technique:"Support arm at 90° abduction or drape over forearm. Tap triceps tendon directly above olecranon. Observe elbow extension.", finding:"Diminished or absent = C7 radiculopathy (most common cause). Absent bilaterally = peripheral polyneuropathy or motor neuron disease. Brisk = UMN above C7.", pathological:false, umnSign:false },
  { id:"n_ref_patella", label:"Patella (Quadriceps)",    level:"L3–L4",           group:"DTR", technique:"Patient seated with legs hanging freely (or supine with knee supported at 20–30°). Tap patellar tendon briskly. Observe quadriceps contraction / knee extension.", finding:"Diminished = L3/4 disc herniation (most common). Absent = severe radiculopathy or femoral neuropathy. Brisk + Babinski = cord/UMN.", pathological:false, umnSign:false },
  { id:"n_ref_achilles",label:"Achilles (Plantar Flex)", level:"S1",              group:"DTR", technique:"Knee flexed, hip ER (patient kneeling or prone). Gently dorsiflex foot to tension tendon. Tap Achilles tendon. Observe plantarflexion jerk.", finding:"Diminished or absent = S1 radiculopathy (L5/S1 disc) OR peripheral neuropathy (diabetes, alcohol). Most sensitive indicator of S1 root. Absent bilaterally = peripheral polyneuropathy.", pathological:false, umnSign:false },
  { id:"n_ref_cremast", label:"Cremaster Reflex",        level:"L1–L2",           group:"DTR", technique:"Lightly stroke the superior medial thigh. Normal = ipsilateral testicular elevation (cremasteric muscle contraction).", finding:"Absent = L1/2 radiculopathy, femoral neuropathy, or cauda equina. Absent bilaterally with lower limb signs = UMN lesion or cauda equina syndrome — urgent.", pathological:false, umnSign:false },
  { id:"n_ref_plantar", label:"Plantar Reflex (Normal)", level:"S1–S2",           group:"DTR", technique:"Stroke lateral plantar surface heel-to-ball with blunt object (Babinski hammer or key). Normal adult response = toe plantarflexion (downgoing).", finding:"Normal adult = plantarflexion of toes (NEGATIVE/normal response). Upgoing = Babinski sign (see below — UMN). Absent response = possible LMN or dense sensory loss.", pathological:false, umnSign:false },

  // ── UMN Pathological Signs ────────────────────────────────────────────────
  { id:"n_ref_babinski",label:"Babinski Sign",           level:"UMN — Corticospinal Tract", group:"UMN", technique:"Patient supine and relaxed. Use blunt object (Babinski hammer handle, key). Stroke firmly from lateral heel along plantar surface curving medially to the ball of the foot. Observe great toe and other toes. POSITIVE = great toe extends (dorsiflexes) upward ± fanning of toes (Babinski response). NEGATIVE (normal adult) = toes plantarflex (curl down).", finding:"POSITIVE (ABNORMAL in adults): Extension of hallux ± toe fanning = corticospinal tract (UMN) lesion anywhere from motor cortex to S1 cord level. Causes: stroke, cord compression, myelopathy, MS, TBI, ALS. NEGATIVE: Normal in adults. Note: Normal in infants <12 months (tract unmyelinated).", pathological:true, umnSign:true },
  { id:"n_ref_chaddock",label:"Chaddock Sign",           level:"UMN — Alternative Babinski", group:"UMN", technique:"Stroke the lateral dorsum of the foot from the lateral malleolus toward the little toe. Alternative Babinski variant — useful when plantar skin is very calloused.", finding:"POSITIVE = upgoing great toe = same significance as Babinski. Use as confirmatory test when Babinski equivocal. Positive = UMN lesion.", pathological:true, umnSign:true },
  { id:"n_ref_oppenheim",label:"Oppenheim Sign",         level:"UMN — Babinski variant",    group:"UMN", technique:"Apply firm pressure with knuckles or thumb down the tibial crest (anterior shin), sliding distally from below the knee to the ankle.", finding:"POSITIVE = hallux extension (upgoing toe) = UMN lesion. Same clinical significance as Babinski. Use when Babinski is equivocal or patient refuses plantar stimulation.", pathological:true, umnSign:true },
  { id:"n_ref_hoffmann",label:"Hoffmann's Sign",         level:"UMN — Cervical Cord",       group:"UMN", technique:"Hold patient's middle finger loosely with forearm slightly pronated. Flick the distal phalanx DOWNWARD (releasing suddenly). Observe thumb and index finger. POSITIVE = thumb FLEXES and adducts involuntarily.", finding:"POSITIVE = upper motor neuron sign indicating corticospinal tract lesion at or above C8/T1. Suggests cervical myelopathy or cord compression. Always combined with clinical context — can be normal in hyperreflexic individuals. Bilateral positive = more significant. REFER for MRI cervical spine.", pathological:true, umnSign:true },
  { id:"n_ref_trommer", label:"Trömner's Sign",          level:"UMN — Cervical Cord",       group:"UMN", technique:"Hold middle finger from above. Flick the PALMAR surface of the middle finger's distal phalanx UPWARD (reverse of Hoffmann's). Observe thumb flexion.", finding:"POSITIVE = thumb and other finger flexion = UMN sign. Equivalent significance to Hoffmann's. Some clinicians find it more reliable. Bilateral positive = myelopathy suspected.", pathological:true, umnSign:true },

  // ── Clonus Tests ──────────────────────────────────────────────────────────
  { id:"n_ref_clonus_ankle", label:"Ankle Clonus",       level:"UMN — S1/S2 Cord",         group:"Clonus", technique:"Support knee in slight flexion. Cup the foot and apply sudden, sustained DORSIFLEXION pressure, maintaining force. Count rhythmic beats of plantarflexion–dorsiflexion oscillation. Time how long it sustains. POSITIVE = 3 or more sustained beats.", finding:"POSITIVE (>3 beats sustained) = UMN lesion. Mechanism: gamma motor neuron hyperactivity with loss of descending inhibition. Causes: cord compression, cervical/thoracic myelopathy, stroke, MS, cerebral palsy. 1–2 beats = equivocal (can be normal in anxious patients). Sustained (>10 beats) = severe UMN involvement — URGENT MRI + neurosurgical referral.", pathological:true, umnSign:true },
  { id:"n_ref_clonus_knee",  label:"Patellar Clonus",    level:"UMN — L3/L4",               group:"Clonus", technique:"Patient supine with leg extended. Grasp patella between thumb and index finger. Apply sudden, sustained DOWNWARD (distal) thrust. Maintain downward pressure and observe for rhythmic patellar oscillation.", finding:"POSITIVE = repeated patellofemoral oscillations = UMN lesion at or above L3/4. Less commonly used than ankle clonus but clinically significant. Indicates spasticity and loss of descending inhibition.", pathological:true, umnSign:true },
  { id:"n_ref_clonus_wrist", label:"Wrist Clonus",       level:"UMN — Cervical Cord",       group:"Clonus", technique:"Support forearm. Apply sudden sustained EXTENSION force to the wrist. Observe for rhythmic flexion–extension oscillation.", finding:"POSITIVE = wrist clonus = UMN sign suggesting cervical cord involvement. Combined with Hoffmann's and Babinski = very strong myelopathy pattern — urgent MRI cervical spine.", pathological:true, umnSign:true },

  // ── LMN Signs & Pattern Tests ─────────────────────────────────────────────
  { id:"n_ref_lmn_fascic",  label:"Fasciculations",      level:"LMN — Anterior Horn",       group:"LMN", technique:"Inspect muscle belly at rest for spontaneous, irregular, brief twitching. Use tangential lighting. May observe in tongue, limbs, trunk. Cannot be voluntarily controlled.", finding:"POSITIVE = visible fasciculations = lower motor neuron / anterior horn cell pathology. DDx: ALS/MND (urgent), benign fasciculation syndrome (common), electrolyte imbalance, medication. Combined with weakness and wasting = motor neuron disease pattern. REFER neurology.", pathological:true, umnSign:false },
  { id:"n_ref_lmn_wasting", label:"Muscle Wasting / Atrophy", level:"LMN — Denervation",   group:"LMN", technique:"Inspect and measure limb circumference bilaterally at standardised points (10cm above/below medial knee joint line; 15cm below acromion). >1cm asymmetry = significant.", finding:"POSITIVE = visible/measurable wasting = denervation (LMN) pattern. Causes: nerve root compression with chronic axonal loss, peripheral nerve injury, motor neuron disease. Combined with weakness in myotomal pattern = radiculopathy with axonal involvement. Note: atrophy also occurs with disuse — differentiate with EMG.", pathological:true, umnSign:false },
  { id:"n_ref_lmn_tone",    label:"Muscle Tone Assessment", level:"UMN / LMN differentiation", group:"LMN", technique:"Assess tone passively. For UMN: passive limb movement — catch/release pattern (clasp-knife spasticity) or lead-pipe rigidity. For LMN: passive movement feels flaccid, no resistance. Assess arms (flex/extend elbow, rotate wrist) and legs (roll leg, flex knee quickly).", finding:"SPASTIC (UMN): velocity-dependent resistance, clasp-knife release, associated hyperreflexia. RIGID (extrapyramidal): lead-pipe or cogwheel, not velocity-dependent, associated with Parkinsonism. FLACCID (LMN): reduced resistance, associated hyporeflexia and wasting — nerve root, peripheral nerve, or anterior horn. NORMAL: smooth with consistent low resistance.", pathological:false, umnSign:false },
  { id:"n_ref_pronator",   label:"Pronator Drift",        level:"UMN — Corticospinal",       group:"LMN", technique:"Patient stands with eyes CLOSED, arms outstretched in supination (palms up), held for 10–20 seconds. Observe for downward drift, pronation, or finger flexion of one arm.", finding:"POSITIVE = downward drift with pronation of one arm = contralateral corticospinal (UMN) lesion. Very sensitive early sign. Also seen in: early stroke, space-occupying lesion, TBI. Arm that drifts = ipsilateral hemisphere lesion (contralateral arm affected). If both drift with eyes open = cerebellar / proprioceptive issue.", pathological:true, umnSign:true },
];

const NEURAL_TENSION = [
  {
    id:"nt_slr", label:"Straight Leg Raise (SLR)",
    nerve:"L4–S1 (sciatic / lumbosacral roots)", sensitivity:"91%", specificity:"26%",
    procedure:"Patient supine. Lift leg with knee EXTENDED. Note angle of symptom onset. At positive angle, sensitise by adding cervical flexion + ankle DF.",
    positive:"Radicular pain/paraesthesia in distribution below knee between 30–70°. Above 70° = hamstring tightness.",
    differentiation:"Add ankle DF: worse = neural. Add cervical flex: worse = neuromeningeal. Remove DF at max angle: improves = neural tension.",
    pattern:"L4/5 disc: reproduces leg/foot symptoms. High specificity if crossed SLR positive.",
  },
  {
    id:"nt_slump", label:"Slump Test",
    nerve:"Entire neuraxis (spinal cord + nerve roots)", sensitivity:"84%", specificity:"83%",
    procedure:"Seated. Step 1: Slump trunk (thoracic kyphosis). Step 2: Flex neck. Step 3: Extend knee. Step 4: Add ankle DF. Positive = symptoms reproduced. Release neck extension.",
    positive:"Reproduction of symptoms relieved by neck extension = neural tension positive. More sensitive than SLR.",
    differentiation:"If symptoms increase with neck flex but reduce with neck extension = neural. If no change = hamstring tightness.",
    pattern:"Central sensitisation shows bilateral symptoms. Disc herniation = unilateral leg symptoms.",
  },
  {
    id:"nt_ultt1", label:"ULTT1 — Median Nerve",
    nerve:"Median nerve / C5–C7", sensitivity:"72%", specificity:"33%",
    procedure:"Shoulder depress → abduct 90° → ER → extend elbow → supinate forearm → extend wrist/fingers. Add cervical lateral flex (contralateral).",
    positive:"Paraesthesia in median nerve distribution (thumb/index/middle). Symptom change with cervical sensitisation.",
    differentiation:"Change symptoms by adding/removing ipsilateral vs contralateral cervical side flex.",
    pattern:"C5/6/7 radiculopathy. Thoracic outlet syndrome. Carpal tunnel (distal reproduction).",
  },
  {
    id:"nt_ultt2", label:"ULTT2 — Radial Nerve",
    nerve:"Radial nerve / C6–C8", sensitivity:"72%", specificity:"33%",
    procedure:"Shoulder depress + ER → abduct 90° → IR → extend elbow → pronate forearm → flex wrist.",
    positive:"Symptoms in posterior forearm / radial nerve distribution.",
    differentiation:"Pronate vs supinate forearm — radial nerve = worse with pronation.",
    pattern:"Tennis elbow, de Quervain's with radial nerve component. C6/7 radiculopathy.",
  },
  {
    id:"nt_ultt3", label:"ULTT3 — Ulnar Nerve",
    nerve:"Ulnar nerve / C8–T1", sensitivity:"69%", specificity:"N/A",
    procedure:"Shoulder depress + abduct → flex elbow → pronate forearm → extend wrist + fingers.",
    positive:"Paraesthesia in ring/little finger distribution. Medial elbow symptoms.",
    differentiation:"Adds cubital tunnel assessment. Positive with elbow flexion as sensitiser.",
    pattern:"Cubital tunnel syndrome. C8/T1 radiculopathy. TOS (lower trunk).",
  },
  {
    id:"nt_femoral", label:"Femoral Nerve Tension Test (FNTT)",
    nerve:"Femoral nerve / L2–L4", sensitivity:"88%", specificity:"N/A",
    procedure:"Patient prone. Flex knee to 90°. Therapist extends hip. Add cervical extension to sensitise. Positive = anterior thigh pain / L2–L4 distribution.",
    positive:"Anterior thigh and groin pain reproduced with hip extension + knee flexion.",
    differentiation:"Differentiate from hip pathology: add cervical extension — neural involvement increases symptoms.",
    pattern:"L2/3/4 disc herniation. Upper lumbar radiculopathy. Femoral neuropathy.",
  },
];

const RED_FLAGS_NEURO = [
  { id:"nrf_cauda",     label:"Cauda Equina Syndrome",   severity:"EMERGENCY",   description:"Saddle anaesthesia (S3–S5), bilateral leg weakness, bowel/bladder incontinence or retention", action:"999 / Emergency Department NOW. MRI within 24h.", icon:"🆘" },
  { id:"nrf_myelopathy",label:"Cord Compression / Myelopathy", severity:"URGENT", description:"Positive Babinski, Hoffmann's, clonus, hyperreflexia + long tract signs, progressive spastic gait", action:"Urgent neurosurgical referral. No manipulation.", icon:"🔴" },
  { id:"nrf_prog_weak", label:"Progressive Neurological Weakness", severity:"URGENT", description:"Weakness deteriorating over days/weeks, widespread myotomal involvement, bilateral findings", action:"Urgent MRI + neurological referral within 48h.", icon:"🔴" },
  { id:"nrf_saddle",    label:"Saddle Anaesthesia",       severity:"EMERGENCY",   description:"Loss of sensation perineum, anus, inner thighs (S3–S5 distribution)", action:"Emergency Department immediately.", icon:"🆘" },
  { id:"nrf_umnsigns",  label:"Upper Motor Neuron Signs", severity:"URGENT",      description:"Babinski positive, hyperreflexia, spasticity, sustained clonus (>3 beats)", action:"Neurology referral. Cervical/thoracic MRI.", icon:"🔴" },
  { id:"nrf_bilateral", label:"Bilateral Neurological Signs", severity:"URGENT",  description:"Bilateral leg weakness, bilateral dermatomal loss, bilateral reflex changes", action:"Urgent referral — central disc, cord pathology.", icon:"🔴" },
  { id:"nrf_sphincter", label:"Sphincter Dysfunction",    severity:"EMERGENCY",   description:"New onset bowel/bladder dysfunction alongside back/leg pain", action:"Emergency admission.", icon:"🆘" },
];

const NERVE_ROOT_MAP = {
  "C5": { dermSensory:"Lateral arm", reflex:"Biceps", myotome:"Shoulder abduction, elbow flex", disc:"C4/5", peripheral:"Musculocutaneous / axillary" },
  "C6": { dermSensory:"Lateral forearm, thumb, index", reflex:"Brachioradialis", myotome:"Wrist extension (ECRL/ECRB)", disc:"C5/6", peripheral:"Median / radial" },
  "C7": { dermSensory:"Middle finger", reflex:"Triceps", myotome:"Elbow extension, wrist flex", disc:"C6/7", peripheral:"Radial / median" },
  "C8": { dermSensory:"Ring, little finger, medial forearm", reflex:"None standard", myotome:"Finger flexion, grip", disc:"C7/T1", peripheral:"Ulnar / median" },
  "T1": { dermSensory:"Medial forearm", reflex:"None", myotome:"Finger abduction", disc:"T1/2", peripheral:"Ulnar (intrinsics)" },
  "L2": { dermSensory:"Anterior/medial thigh", reflex:"None", myotome:"Hip flexion", disc:"L2/3", peripheral:"Femoral / obturator" },
  "L3": { dermSensory:"Medial knee, lower ant thigh", reflex:"Patella (with L4)", myotome:"Knee extension", disc:"L3/4", peripheral:"Femoral" },
  "L4": { dermSensory:"Medial leg and foot", reflex:"Patella", myotome:"Ankle dorsiflexion (TA)", disc:"L4/5", peripheral:"Deep peroneal" },
  "L5": { dermSensory:"Dorsum foot, 1st web space", reflex:"None reliable", myotome:"Great toe extension (EHL)", disc:"L4/5", peripheral:"Deep peroneal" },
  "S1": { dermSensory:"Lateral foot, heel", reflex:"Achilles", myotome:"Ankle plantarflexion", disc:"L5/S1", peripheral:"Sural / tibial" },
};

// ─── Collapsible How-To Panel ─────────────────────────────────────────────────
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
    else setTab("dermatomes");
    setTimeout(()=>{
      let scrolled=false;
      targets.forEach(id=>{
        const el=document.querySelector(`[data-neuro-id="${id}"]`);
        if(el){ if(!scrolled){el.scrollIntoView({behavior:"smooth",block:"center"});scrolled=true;}
          el.classList.add("physio-highlight"); setTimeout(()=>el.classList.remove("physio-highlight"),4000); }
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

      {/* Tab Bar */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
        {tabs.map(t=><button key={t.key} type="button" onClick={()=>setTab(t.key)} style={tabBtnStyle(t.key)}>{t.icon} {t.label}</button>)}
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
              <img
                src="https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto,w_80/Firefly_Gemini_Flash_change_the_model_person_to_different_person_and_black_line_and_dot_should_be_red_664593_sxvcde"
                alt="Cervical dermatome map"
                onClick={()=>setDermImgModal({src:"https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/Firefly_Gemini_Flash_change_the_model_person_to_different_person_and_black_line_and_dot_should_be_red_664593_sxvcde",title:"Cervical Dermatome Map"})}
                style={{width:64,height:64,objectFit:"cover",borderRadius:7,cursor:"pointer",border:"2px solid rgba(124,58,237,0.3)",flexShrink:0}}
              />
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
                  <div>
                    <span style={{fontWeight:800,color:abnormal?C.yellow:C.text,fontSize:"0.88rem",marginRight:8}}>{m.level}</span>
                    <span style={{fontSize:"0.78rem",color:C.text}}>{m.action}</span>
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
              <div key={nt.id} style={{background:C.surface,border:`1px solid ${abnormal?C.accent+"60":C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
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
