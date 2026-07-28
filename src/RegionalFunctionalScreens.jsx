// RegionalFunctionalScreens.jsx — 10 per-region functional screens + hub
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes).
import React, { useState, useEffect, useMemo } from "react";
import { C } from "./utils.jsx";
// Shared component that remains in SubjectiveObjective.jsx (render-time only; safe cycle).
import { SmallClinicalImg } from "./SubjectiveObjective.jsx";

// ─── LUMBAR FUNCTIONAL SCREEN ─────────────────────────────────────────────────

const LUMBAR_TESTS = [
  {
    id:"lfs_sts", icon:"🪑", label:"Sit-to-Stand",
    subtitle:"Flexion → Extension Strategy",
    phase:"Hip Hinge / Load Transfer",
    setup:"Chair at knee height, no armrests. Feet hip-width, just behind knees. Arms crossed on chest. Rise × 3.",
    normalDesc:"Controlled 30–40° forward trunk lean, hip hinge initiates rise, lumbar stays neutral, symmetric bilateral loading.",
    svgNormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        {/* Normal: forward lean + hip hinge */}
        <text x="10" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        {/* Seated */}
        <circle cx="28" cy="22" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="28" y1="29" x2="24" y2="50" stroke="#059669" strokeWidth="2.5"/> {/* trunk angled fwd */}
        <line x1="24" y1="50" x2="16" y2="65" stroke="#059669" strokeWidth="2.5"/> {/* thigh */}
        <line x1="16" y1="65" x2="18" y2="82" stroke="#059669" strokeWidth="2.5"/> {/* shin */}
        <line x1="28" y1="29" x2="34" y2="44" stroke="#059669" strokeWidth="2"/> {/* arm */}
        <text x="6" y="92" fontSize="6" fill="#059669">Seated</text>
        {/* Rising - hip hinge */}
        <circle cx="72" cy="18" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="72" y1="25" x2="68" y2="48" stroke="#059669" strokeWidth="2.5"/> {/* trunk lean fwd */}
        <line x1="68" y1="48" x2="60" y2="62" stroke="#059669" strokeWidth="2.5"/> {/* hip hinge */}
        <line x1="60" y1="62" x2="62" y2="82" stroke="#059669" strokeWidth="2.5"/>
        <path d="M68,48 Q72,40 75,34" stroke="#059669" strokeWidth="1.5" fill="none" strokeDasharray="3,2"/>
        <text x="52" y="92" fontSize="6" fill="#059669">Hip leads</text>
        {/* Standing */}
        <circle cx="108" cy="14" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="108" y1="21" x2="108" y2="55" stroke="#059669" strokeWidth="2.5"/>
        <line x1="108" y1="55" x2="104" y2="80" stroke="#059669" strokeWidth="2.5"/>
        <line x1="108" y1="55" x2="112" y2="80" stroke="#059669" strokeWidth="2.5"/>
        <text x="95" y="92" fontSize="6" fill="#059669">Upright</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">COMPENSATED</text>
        {/* Lumbar dominant strategy */}
        <circle cx="60" cy="18" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="60" y1="25" x2="60" y2="55" stroke="#dc2626" strokeWidth="2.5"/> {/* upright trunk */}
        <line x1="60" y1="55" x2="52" y2="70" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="60" y1="55" x2="68" y2="70" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="52" y1="70" x2="52" y2="88" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="68" y1="70" x2="68" y2="88" stroke="#dc2626" strokeWidth="2.5"/>
        {/* Lumbar arch highlight */}
        <path d="M60,35 Q65,42 60,50" stroke="#f97316" strokeWidth="2" fill="none"/>
        <text x="67" y="44" fontSize="6" fill="#f97316">Lumbar↑</text>
        {/* Lateral shift arrow */}
        <path d="M30,55 L48,55" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="3,2"/>
        <text x="4" y="65" fontSize="5.5" fill="#dc2626">Shift</text>
        <text x="4" y="92" fontSize="6" fill="#dc2626">Lumbar dominant</text>
        <defs><marker id="arr" markerWidth="5" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L5,2 L0,4 Z" fill="#dc2626"/></marker></defs>
      </svg>
    ),
    observations:[
      { id:"lean",  q:"Forward trunk lean before rise",
        opts:["✓ Adequate (30–40°)","⚠ Excessive (>45°)","✗ Insufficient — upright strategy"],
        clues:["","Indicates hip flexor tightness or fear of load","Lumbar extension dominant — glute inhibition"] },
      { id:"hinge", q:"Hip hinge strategy",
        opts:["✓ Hip hinge initiates","✗ Lumbar extension dominates","✗ Momentum / bounce used"],
        clues:["","Gluteal inhibition, hip flexor dominance (Janda LCS)","Motor control deficit — screen for pain avoidance"] },
      { id:"sym",   q:"Weight bearing symmetry",
        opts:["✓ Equal bilateral","⚠ Mild lateral shift","✗ Significant shift / one leg dominant"],
        clues:["","Minor SIJ asymmetry — monitor","SIJ dysfunction or hip joint pathology — do FABER test"] },
      { id:"knee",  q:"Knee tracking",
        opts:["✓ Tracks over 2nd toe","⚠ Mild valgus","✗ Significant valgus collapse"],
        clues:["","Glute med weakness — single-leg squat screen","Dynamic valgus — screen glute med / max and foot pronation"] },
      { id:"pain",  q:"Pain provocation",
        opts:["✓ No pain","⚠ Pain at initiation","⚠ Pain mid-rise","✗ Pain at full extension"],
        clues:["","Discogenic / SIJ loading — centralisation test","Hip joint / mid-range disc","Facet joint or hip extension impingement"] },
    ],
    grades:["Normal — Hip hinge, symmetric, pain-free","Compensated — Minor strategy fault, no pain","Abnormal — Lumbar dominant / pain / significant asymmetry"],
  },
  {
    id:"lfs_fwd", icon:"🫄", label:"Forward Bend",
    subtitle:"Lateral Shift + Centralisation Screen",
    phase:"Lumbar Flexion / Instability Screen",
    setup:"Patient stands, feet shoulder-width. Bend forward slowly reaching toward toes. Observe from behind (lateral shift) and side (lumbar curve). Repeat 3×.",
    normalDesc:"Lumbar flexion reversal with progressive hip contribution. No lateral shift. Symptoms centralise or unchanged.",
    svgNormal:(
      <svg viewBox="0 0 140 100" style={{width:"100%",maxWidth:140}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL (side view)</text>
        {/* Standing */}
        <circle cx="25" cy="18" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <path d="M25,24 Q23,38 22,50" stroke="#059669" strokeWidth="2.5" fill="none"/> {/* lumbar curve */}
        <line x1="22" y1="50" x2="18" y2="68" stroke="#059669" strokeWidth="2.5"/>
        <line x1="18" y1="68" x2="20" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <line x1="22" y1="50" x2="26" y2="68" stroke="#059669" strokeWidth="2.5"/>
        <line x1="26" y1="68" x2="24" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <text x="12" y="96" fontSize="5.5" fill="#059669">Start</text>
        {/* Mid bend — lumbar flattens */}
        <circle cx="72" cy="22" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <path d="M72,28 Q68,40 62,52" stroke="#059669" strokeWidth="2.5" fill="none"/>
        <line x1="62" y1="52" x2="60" y2="70" stroke="#059669" strokeWidth="2.5"/>
        <line x1="60" y1="70" x2="62" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <line x1="62" y1="52" x2="66" y2="68" stroke="#059669" strokeWidth="2.5"/>
        <line x1="66" y1="68" x2="64" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <text x="52" y="96" fontSize="5.5" fill="#059669">Flat lumbar</text>
        {/* Full bend */}
        <circle cx="118" cy="38" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <path d="M118,44 Q110,52 104,56" stroke="#059669" strokeWidth="2.5" fill="none"/>
        <line x1="104" y1="56" x2="102" y2="72" stroke="#059669" strokeWidth="2.5"/>
        <line x1="102" y1="72" x2="104" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <line x1="104" y1="56" x2="108" y2="70" stroke="#059669" strokeWidth="2.5"/>
        <line x1="108" y1="70" x2="106" y2="86" stroke="#059669" strokeWidth="2.5"/>
        <text x="98" y="96" fontSize="5.5" fill="#059669">Hip hinge</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 140 100" style={{width:"100%",maxWidth:140}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">ABNORMAL (rear view)</text>
        {/* Lateral shift — posterior view */}
        <circle cx="70" cy="18" r="6" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="70" y1="24" x2="76" y2="46" stroke="#dc2626" strokeWidth="2.5"/> {/* spine shifts R */}
        <line x1="76" y1="46" x2="66" y2="62" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="66" y1="62" x2="64" y2="80" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="66" y1="62" x2="78" y2="80" stroke="#dc2626" strokeWidth="2.5"/>
        {/* Shoulder vs pelvis lines */}
        <line x1="50" y1="28" x2="90" y2="28" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2"/>
        <line x1="54" y1="62" x2="86" y2="62" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2"/>
        {/* Shift arrow */}
        <path d="M70,35 L80,35" stroke="#dc2626" strokeWidth="2" fill="none"/>
        <polygon points="80,33 84,35 80,37" fill="#dc2626"/>
        <text x="85" y="38" fontSize="6" fill="#dc2626">Shift R</text>
        <text x="18" y="96" fontSize="5.5" fill="#dc2626">Lateral shift = SIJ / disc pathology</text>
      </svg>
    ),
    observations:[
      { id:"shift",  q:"Lateral shift (from behind)?",
        opts:["✓ No lateral shift","⚠ Minor shift (<2cm)","✗ Clear lateral shift (>2cm)"],
        clues:["","Monitor — may be postural habit","SIJ dysfunction or disc herniation with lateral nerve root compression"] },
      { id:"lumbar", q:"Lumbar curve reversal?",
        opts:["✓ Flattens smoothly","⚠ Limited reversal","✗ Stays lordotic (instability)","✗ Flat throughout (loss of normal motion)"],
        clues:["","Early lumbar stiffness — extension bias","Lumbar instability or pain inhibition","Multi-segment stiffness or fusion"] },
      { id:"rhythm",  q:"Hip vs lumbar contribution?",
        opts:["✓ Equal hip + lumbar","⚠ Lumbar dominant (hip stiff)","⚠ Hip dominant (lumbar avoidance)"],
        clues:["","Hip flexor tightness or hip joint restriction","Pain-avoidant lumbar flexion restriction — screen for disc"] },
      { id:"central", q:"Symptom behaviour on bending?",
        opts:["✓ No change / centralises","⚠ Peripheralises slightly","✗ Clearly peripheralises","✗ Rapid onset peripheralisation"],
        clues:["","McKenzie principle — flexion may be directional preference","Neural involvement — limit flexion, try extension","Likely disc with neural compression — McKenzie assessment"] },
      { id:"return",  q:"Return to upright?",
        opts:["✓ Smooth reverse hip hinge","⚠ Hitches / catches","✗ Lateral deviation on return","✗ Requires hands-on-thighs"],
        clues:["","Mild instability segment","Segmental instability — Passive instability tests","Significant extensor weakness or instability"] },
    ],
    grades:["Normal — Smooth reversal, no shift, no peripheralisation","Compensated — Minor shift or rhythm fault","Abnormal — Lateral shift, peripheralisation, or instability sign"],
  },
  {
    id:"lfs_sls", icon:"🦩", label:"Single Leg Stance",
    subtitle:"SIJ & Lumbopelvic Control (Trendelenburg)",
    phase:"Lumbopelvic Stability / Glute Med",
    setup:"Patient stands facing therapist. Arms folded. Lift one leg to 90° hip/knee flex. Hold 30 seconds each side. Observe from front and behind.",
    normalDesc:"Pelvis stays level or rises slightly (Hiked) on lifted side. No trunk lean. Glute med visually contracts on standing side.",
    svgNormal:(
      <svg viewBox="0 0 100 100" style={{width:"100%",maxWidth:100}}>
        <text x="8" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        <circle cx="50" cy="18" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="50" y1="25" x2="50" y2="55" stroke="#059669" strokeWidth="2.5"/>
        {/* Pelvis horizontal */}
        <line x1="38" y1="55" x2="62" y2="55" stroke="#059669" strokeWidth="3"/>
        {/* Standing leg */}
        <line x1="44" y1="55" x2="44" y2="82" stroke="#059669" strokeWidth="2.5"/>
        <line x1="44" y1="82" x2="44" y2="96" stroke="#059669" strokeWidth="2"/>
        {/* Raised leg */}
        <line x1="56" y1="55" x2="62" y2="70" stroke="#059669" strokeWidth="2.5"/>
        <line x1="62" y1="70" x2="62" y2="58" stroke="#059669" strokeWidth="2"/>
        {/* Level pelvis marker */}
        <line x1="30" y1="55" x2="35" y2="55" stroke="#059669" strokeWidth="1.5" strokeDasharray="2,2"/>
        <line x1="65" y1="55" x2="70" y2="55" stroke="#059669" strokeWidth="1.5" strokeDasharray="2,2"/>
        <text x="22" y="70" fontSize="5.5" fill="#059669">Pelvis</text>
        <text x="22" y="76" fontSize="5.5" fill="#059669">level ✓</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 100 100" style={{width:"100%",maxWidth:100}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">TRENDELENBURG</text>
        <circle cx="52" cy="18" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        {/* Trunk leans to standing side */}
        <line x1="52" y1="25" x2="46" y2="55" stroke="#dc2626" strokeWidth="2.5"/>
        {/* Pelvis drops on lifted side */}
        <line x1="38" y1="52" x2="60" y2="60" stroke="#dc2626" strokeWidth="3"/>
        {/* Drop arrow */}
        <path d="M58,54 L60,62" stroke="#dc2626" strokeWidth="1.5" fill="none"/>
        <polygon points="58,62 60,66 62,62" fill="#dc2626"/>
        {/* Standing leg */}
        <line x1="42" y1="52" x2="42" y2="82" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="42" y1="82" x2="42" y2="96" stroke="#dc2626" strokeWidth="2"/>
        {/* Raised */}
        <line x1="56" y1="60" x2="62" y2="74" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="62" y1="74" x2="62" y2="62" stroke="#dc2626" strokeWidth="2"/>
        <text x="4" y="96" fontSize="5.5" fill="#dc2626">Pelvic drop = Glute med weak</text>
      </svg>
    ),
    observations:[
      { id:"pelvis",  q:"Pelvic level during stance?",
        opts:["✓ Level or slight hike (normal)","⚠ Mild drop (<2cm) lifted side","✗ Clear Trendelenburg drop","✗ Positive Trendelenburg + trunk lean"],
        clues:["","Minor glute med fatigue — compare sides","Glute med weakness on stance side — screen hip abd strength","Severe glute med weakness — may indicate THA, hip pathology, L5 motor"] },
      { id:"trunk",   q:"Trunk position?",
        opts:["✓ Stays midline","⚠ Slight lean to stance side","✗ Clear lateral lean (compensated Trendelenburg)"],
        clues:["","Minor balance compensation","Compensated Trendelenburg — trunk shifts to unload weak glute med. Classic pattern."] },
      { id:"balance", q:"Balance quality?",
        opts:["✓ Steady 30 sec","⚠ Sways but maintains","⚠ Cannot reach 30 sec","✗ Unable to stand single leg"],
        clues:["","Minor proprioceptive deficit","Significant stability deficit — cerebellar or proprioceptive screen","Cannot test — note and refer if bilateral"] },
      { id:"pain",    q:"Pain on single leg loading?",
        opts:["✓ No pain","⚠ Groin pain","⚠ SIJ/buttock pain","✗ Lumbar pain reproduced"],
        clues:["","Hip joint pathology — FADDIR screen","SIJ provocation — do SIJ compression/distraction","Lumbar instability or SIJ dysfunction"] },
      { id:"sym",     q:"Side-to-side difference?",
        opts:["✓ Symmetric","⚠ Mild difference (5–10 sec)","✗ Marked difference (>10 sec)","✗ One side unable"],
        clues:["","Monitoring point","Neurological, hip joint, or SIJ asymmetry","Significant unilateral deficit — warrant full hip screen + L5 myotome test"] },
    ],
    grades:["Normal — Level pelvis, balanced 30s, no pain","Compensated — Minor sway or mild pelvic drop","Abnormal — Trendelenburg, trunk lean, or pain reproduced"],
  },
  {
    id:"lfs_squat", icon:"🏋️", label:"Squat Pattern",
    subtitle:"Hip–Lumbar Rhythm & Pelvic Compensation",
    phase:"Lower Chain Integration / Motor Control",
    setup:"Feet shoulder-width, toes 10–30° out. Arms forward for balance. Squat to chair height (thighs ~parallel) × 5 reps. Observe side + front views.",
    normalDesc:"Lumbar neutral throughout, hips descend symmetrically, knees track over 2nd toe, heels stay down, trunk relatively upright.",
    svgNormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        {/* Standing */}
        <circle cx="28" cy="16" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="28" y1="22" x2="28" y2="52" stroke="#059669" strokeWidth="2.5"/>
        <line x1="28" y1="52" x2="22" y2="80" stroke="#059669" strokeWidth="2.5"/>
        <line x1="28" y1="52" x2="34" y2="80" stroke="#059669" strokeWidth="2.5"/>
        <line x1="22" y1="80" x2="20" y2="92" stroke="#059669" strokeWidth="2"/>
        <line x1="34" y1="80" x2="36" y2="92" stroke="#059669" strokeWidth="2"/>
        <text x="14" y="100" fontSize="5.5" fill="#059669">Start</text>
        {/* Squat — neutral */}
        <circle cx="80" cy="26" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="80" y1="32" x2="76" y2="54" stroke="#059669" strokeWidth="2.5"/> {/* slight trunk lean */}
        <line x1="76" y1="54" x2="66" y2="76" stroke="#059669" strokeWidth="2.5"/> {/* thigh */}
        <line x1="66" y1="76" x2="64" y2="92" stroke="#059669" strokeWidth="2"/> {/* shin */}
        <line x1="76" y1="54" x2="86" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="86" y1="76" x2="88" y2="92" stroke="#059669" strokeWidth="2"/>
        {/* Neutral lumbar curve mark */}
        <path d="M76,36 Q79,44 76,52" stroke="#059669" strokeWidth="1.5" fill="none"/>
        <text x="82" y="46" fontSize="5.5" fill="#059669">Neutral</text>
        <text x="62" y="100" fontSize="5.5" fill="#059669">Squat</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">COMPENSATIONS</text>
        {/* Butt wink */}
        <circle cx="30" cy="26" r="6" fill="none" stroke="#f97316" strokeWidth="2"/>
        <line x1="30" y1="32" x2="26" y2="52" stroke="#f97316" strokeWidth="2.5"/>
        <path d="M26,52 Q22,60 20,68" stroke="#f97316" strokeWidth="2.5" fill="none"/> {/* pelvis tucks */}
        <line x1="20" y1="68" x2="18" y2="84" stroke="#f97316" strokeWidth="2"/>
        <line x1="26" y1="52" x2="34" y2="68" stroke="#f97316" strokeWidth="2.5"/>
        <line x1="34" y1="68" x2="36" y2="84" stroke="#f97316" strokeWidth="2"/>
        <text x="6" y="96" fontSize="5.5" fill="#f97316">Butt wink</text>
        {/* Forward lean */}
        <circle cx="88" cy="24" r="6" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="88" y1="30" x2="78" y2="54" stroke="#dc2626" strokeWidth="2.5"/> {/* excessive forward lean */}
        <line x1="78" y1="54" x2="72" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="72" y1="76" x2="72" y2="92" stroke="#dc2626" strokeWidth="2"/>
        <line x1="78" y1="54" x2="88" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="88" y1="76" x2="86" y2="92" stroke="#dc2626" strokeWidth="2"/>
        {/* Lean arrow */}
        <path d="M90,34 L98,42" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#a2)"/>
        <text x="74" y="100" fontSize="5.5" fill="#dc2626">Fwd lean</text>
        <defs><marker id="a2" markerWidth="4" markerHeight="3" refX="2" refY="1.5" orient="auto"><path d="M0,0 L4,1.5 L0,3 Z" fill="#dc2626"/></marker></defs>
      </svg>
    ),
    observations:[
      { id:"lumbar",  q:"Lumbar spine during descent?",
        opts:["✓ Neutral maintained","⚠ Butt-wink (posterior pelvic tilt)","✗ Excessive anterior tilt (arch increases)","✗ Lateral lumbar shift"],
        clues:["","Hip flexor tightness / ankle dorsiflexion deficit — assess hip mobility","Lumbar extensor dominance / weak core","SIJ asymmetry or hip joint pathology — check FABER"] },
      { id:"knees",   q:"Knee tracking?",
        opts:["✓ Tracks over 2nd toe","⚠ Mild valgus (<2cm medial)","✗ Clear valgus collapse","⚠ Excessive lateral thrust"],
        clues:["","Minor glute med fatigue","Dynamic valgus = glute med/max weakness + possible foot pronation — priority","Lateral thrust = lateral compartment OA or LCL laxity"] },
      { id:"trunk",   q:"Trunk lean?",
        opts:["✓ Slight forward (<45°)","⚠ Excessive forward (>45°)","✗ Trunk collapses forward"],
        clues:["","Normal","Ankle dorsiflexion deficit or hip flexor tightness","Significant anterior chain weakness or fear-avoidance"] },
      { id:"heels",   q:"Heel contact maintained?",
        opts:["✓ Heels down throughout","⚠ Slight heel rise","✗ Heels lift clearly"],
        clues:["","","Ankle dorsiflexion restriction — assess with knee-to-wall test","Significant ankle restriction — may need orthotic screen"] },
      { id:"sym",     q:"Bilateral symmetry?",
        opts:["✓ Equal bilateral","⚠ Minor asymmetry","✗ Clear side-to-side difference"],
        clues:["","","Unilateral hip, knee or SIJ pathology — compare single-leg squat"] },
    ],
    grades:["Normal — Neutral lumbar, knee tracking, symmetric","Compensated — Butt-wink or minor valgus without pain","Abnormal — Pain, significant valgus collapse, or lateral shift"],
  },
  {
    id:"lfs_step", icon:"🪜", label:"Step-Up 20cm",
    subtitle:"Gluteal Activation & Lumbopelvic Stability",
    phase:"Single-Leg Load / Glute Power",
    setup:"20cm step. Patient steps up leading with test leg. Trail leg does not push off. Step up + controlled step down × 5 each side. Observe from front.",
    normalDesc:"Trunk upright, pelvis level throughout, knee tracks over foot, controlled eccentric return. Equal bilateral performance.",
    svgNormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        {/* Step platform */}
        <rect x="10" y="76" width="50" height="16" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <text x="18" y="88" fontSize="6" fill="#6b7280">20cm step</text>
        {/* Figure on step — trunk upright */}
        <circle cx="78" cy="18" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="78" y1="25" x2="78" y2="55" stroke="#059669" strokeWidth="2.5"/>
        <line x1="78" y1="55" x2="74" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="74" y1="76" x2="72" y2="92" stroke="#059669" strokeWidth="2.5"/>
        <line x1="78" y1="55" x2="82" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="82" y1="76" x2="84" y2="92" stroke="#059669" strokeWidth="2.5"/>
        {/* Pelvis level */}
        <line x1="68" y1="55" x2="88" y2="55" stroke="#059669" strokeWidth="2.5"/>
        <text x="60" y="50" fontSize="5.5" fill="#059669">Level ✓</text>
        {/* Knee arrow upward */}
        <path d="M74,76 L74,68" stroke="#059669" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">COMPENSATIONS</text>
        <rect x="10" y="76" width="50" height="16" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        {/* Trunk lean + pelvic drop */}
        <circle cx="74" cy="22" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="74" y1="29" x2="68" y2="55" stroke="#dc2626" strokeWidth="2.5"/> {/* lean L */}
        {/* Pelvic drop R */}
        <line x1="58" y1="52" x2="80" y2="60" stroke="#dc2626" strokeWidth="2.5"/>
        <path d="M78,54 L80,62" stroke="#dc2626" strokeWidth="1.5" fill="none"/>
        <polygon points="76,62 80,66 84,62" fill="#dc2626"/>
        <line x1="62" y1="52" x2="60" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="60" y1="76" x2="58" y2="92" stroke="#dc2626" strokeWidth="2"/>
        <line x1="76" y1="60" x2="80" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="80" y1="76" x2="82" y2="92" stroke="#dc2626" strokeWidth="2"/>
        {/* Knee valgus arrow */}
        <path d="M62,68 L66,68" stroke="#f97316" strokeWidth="2" fill="none"/>
        <text x="4" y="96" fontSize="5.5" fill="#dc2626">Trunk lean + pelvic drop</text>
      </svg>
    ),
    observations:[
      { id:"pelvis",  q:"Pelvic position during step-up?",
        opts:["✓ Level throughout","⚠ Mild drop (<2cm) on trail side","✗ Clear pelvic drop","✗ Lateral pelvic hitch"],
        clues:["","Minor glute med fatigue","Glute med weakness stance side — correlate with SLS test","Tensor fascia lata dominance — screen IT band / hip lateral rotators"] },
      { id:"trunk",   q:"Trunk alignment?",
        opts:["✓ Upright throughout","⚠ Slight ipsilateral lean","✗ Clear trunk lean to stepping side","✗ Trunk rotation"],
        clues:["","Minor compensated Trendelenburg","Compensated Trendelenburg — glute med weakness","Rotational instability — assess transversus abdominis, multifidus"] },
      { id:"knee",    q:"Knee tracking on step-up?",
        opts:["✓ Over 2nd toe","⚠ Mild medial drift","✗ Valgus collapse on loading"],
        clues:["","Mild glute med weakness or foot pronation","Dynamic valgus — priority rehab target. VMO + glute med + arch support"] },
      { id:"control", q:"Eccentric control on step-down?",
        opts:["✓ Controlled slow descent","⚠ Quick drop / loses control","✗ Trunk sway on descent","✗ Cannot control — uses rail"],
        clues:["","Eccentric deficit — grade glute/quad strength","Eccentric weakness — deceleration training needed","Significant weakness — formal MMT quadriceps and glutes"] },
      { id:"sym",     q:"Side-to-side difference?",
        opts:["✓ Symmetric","⚠ Minor (<10% difference)","✗ Marked difference","✗ Cannot complete one side"],
        clues:["","","Unilateral weakness — hip, knee or SIJ pathology likely","Significant deficit — full lower limb neurological + strength screen"] },
    ],
    grades:["Normal — Level pelvis, upright trunk, knee tracking, symmetric","Compensated — Minor pelvic drop or lean without pain","Abnormal — Pain, clear Trendelenburg, valgus collapse, or asymmetric"],
  },
,
  // ── FMS: Active Straight Leg Raise ────────────────────────────────────────
  {
    id:"fms_aslr", icon:"🦵", label:"Active Straight Leg Raise (FMS)",
    subtitle:"Hamstring / Hip Flexor Mobility · Core Stability",
    phase:"Posterior Chain / Core Stability Screen",
    setup:"Patient supine, legs extended. Place a dowel under the lumbar lordosis (maintains neutral). Patient raises one leg as high as possible, ankle dorsiflexed, knee straight. Observe where the malleolus of raised leg is relative to the opposite leg. Score: 3 = malleolus passes opposite ASIS. 2 = between knee and ASIS. 1 = at or below knee. 0 = pain or lumbar flatten.",
    normalDesc:"Active SLR to at least 70° (malleolus at or above opposite ASIS). Lumbar lordosis maintained on dowel. Opposite leg stays flat. No trunk rotation or hip hike. Ankle stays dorsiflexed.",
    observations:[
      { id:"height", q:"SLR height achieved?",
        opts:["✓ Malleolus passes opposite ASIS (≥70°)","⚠ Between knee and ASIS (50–70°)","✗ At or below knee level (<50°)","✗ Pain or lumbar flattening"],
        clues:["","Minor hamstring or posterior capsule restriction — hamstring stretching (supine + active)","Significant hamstring or gastroc restriction. Passive vs active SLR comparison: if passive > active = hamstring strength component. If equal = pure mobility","Lumbar flattening = core stability deficit — lumbar cannot maintain neutral during hip flexion. TA + multifidus activation before SLR loading"] },
      { id:"opp_leg", q:"Opposite leg stays flat?",
        opts:["✓ Stays flat and still","⚠ Minor hip flexion drift","✗ Opposite hip flexes clearly","✗ Pelvis rotates / arches up"],
        clues:["","Minor hip flexor overactivity on opposite side — monitor","Opposite hip flexion = hip flexor dominant strategy. Psoas overactivity lifting the non-tested leg. Cueing + hip flexor release contralateral","Pelvic rotation = lumbar instability. Core stability training priority — TA/multifidus before SLR progression"] },
      { id:"knee", q:"Knee stays straight during raise?",
        opts:["✓ Knee fully extended throughout","⚠ Minor knee bend at end range","✗ Knee bends significantly to achieve height","✗ Knee bends throughout — hamstring so tight cannot extend"],
        clues:["","Minor hamstring tightness — active hamstring stretching at limit of range","Knee bends to achieve height = hamstring tight, substituting with hip flexion. True hamstring ROM must be measured with knee extended","Cannot extend = severe hamstring tightness. Passive stretching first, progress to active. Neural tension screen (slump + ULNT1) if reproduces radicular symptoms"] },
      { id:"pelvis", q:"Pelvis / lumbar stability?",
        opts:["✓ Neutral spine maintained","⚠ Minor posterior tilt","✗ Lumbar flattens on dowel","✗ Pelvic hike / rotation"],
        clues:["","Minor control deficit — TA cueing during SLR","Core stability deficit — TA, multifidus, and deep hip flexors must stabilise lumbar before hamstring stretching is effective","Significant — begin SLR with supported knee (partial range) maintaining neutral. Progress gradually"] },
      { id:"sym", q:"Symmetry L vs R?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry (<10°)","✗ Clear asymmetry (≥10°)","✗ Cannot perform one side"],
        clues:["","Normal — minor dominant limb difference acceptable","Asymmetry ≥10° = treat restricted side. Common after hamstring strain history. Screen for neural tension if unilateral restriction","Cannot perform = pain inhibition or neural tension. Slump test + SLR passive test before treating as mobility deficit"] },
    ],
    grades:["Normal (FMS 3) — Malleolus passes ASIS, neutral spine maintained","Compensated (FMS 2) — Malleolus between knee and ASIS, minor compensation","Abnormal (FMS 0–1) — Below knee, lumbar instability, or pain"],
  },
  // ── FMS: Trunk Stability Push-Up ──────────────────────────────────────────
  {
    id:"fms_tspu", icon:"💪", label:"Trunk Stability Push-Up (FMS)",
    subtitle:"Anterior Core Stability · Spinal Rigidity Screen",
    phase:"Anterior Chain / Core Stability Screen",
    setup:"Patient prone: Men — thumbs at forehead level. Women — thumbs at chin level. Complete ONE push-up maintaining rigid spine — no lag in lumbar or hips. Score: 3 = perfect rigid spine push-up at forehead level (men) / chin (women). 2 = push-up at chin (men) / chest (women). 1 = cannot perform without spinal lag. 0 = pain. Clearing test: passive trunk extension (prone press-up) — pain = 0.",
    normalDesc:"Single push-up completed with rigid spine — no lumbar extension lead, no hip sag, no scapular winging. Trunk rises as a rigid unit. Clearing test negative (prone press-up pain-free).",
    observations:[
      { id:"spine", q:"Spinal rigidity during push-up?",
        opts:["✓ Rigid spine — rises as one unit","⚠ Minor lumbar lag at peak","✗ Lumbar sags / hips rise first (hip hinge pattern)","✗ Cannot complete even with modification"],
        clues:["","Minor anterior core weakness — TA/oblique activation in push-up position","Hip sag = anterior core deficit (TA, obliques, TrA). Lower push-up level first — find level where spine stays rigid. Build from there","Cannot complete = significant core instability. Begin with prone plank on elbows, progress to extended arm plank before push-up"] },
      { id:"scap", q:"Scapular position during push-up?",
        opts:["✓ Scapulae set — no winging","⚠ Minor protraction drift","✗ Scapular winging visible","✗ Asymmetric — one wing only"],
        clues:["","Minor serratus anterior weakness — push-up plus (serratus press) before full push-up","Serratus anterior inhibition — dynamic push-up plus × 3×15. Reduce load to wall push-up if winging is significant","Asymmetric winging = unilateral serratus or long thoracic nerve. Assess unilateral serratus anterior strength"] },
      { id:"hip", q:"Hip position throughout push-up?",
        opts:["✓ Hips neutral — maintain position","⚠ Minor hip extension increase","✗ Hips rise (jack-knife pattern)","✗ Hips sag below spine level"],
        clues:["","Minor hip flexor tightness or core substitution","Hip rise = RA dominance over TA. Patient uses spinal extension to push up. Teach dead-bug pattern first","Hip sag = posterior tilt deficit or lumbar extensor weakness. Prone plank training before push-up loading"] },
      { id:"clear", q:"Clearing test — prone press-up?",
        opts:["✓ Negative — no pain","✗ Central lumbar pain","✗ Unilateral lumbar / buttock pain","✗ Arm or leg symptoms reproduced"],
        clues:["","Normal — proceed with score","Central extension pain = lumbar disc or facet. FMS = 0. Extension-biased condition — do not load push-up","Unilateral = facet or SIJ. FMS = 0. Quadrant test + Kemp's before trunk stability loading","Referred symptoms = neural — FMS 0. Neurological screen before loading"] },
      { id:"sym", q:"Left-right symmetry during push-up?",
        opts:["✓ Symmetric","⚠ Minor asymmetric drift","✗ Clear trunk rotation during push-up","✗ Arm dominance — pushes from one side"],
        clues:["","Monitor — minor asymmetry in first rep acceptable","Trunk rotation during push-up = unilateral oblique or serratus weakness. Plank with rotation resistance (Pallof press) + unilateral core training","Arm dominance = unilateral shoulder girdle weakness. Screen rotator cuff and serratus on weaker side"] },
    ],
    grades:["Normal (FMS 3) — Rigid spine, no winging, clearing test negative","Compensated (FMS 2) — Push-up with minor lag or lower level","Abnormal (FMS 0–1) — Spinal lag, cannot complete, or pain"],
  },
  // ── FMS: Rotary Stability ─────────────────────────────────────────────────
  {
    id:"fms_rs", icon:"⚙️", label:"Rotary Stability (FMS)",
    subtitle:"Multi-Plane Core Control · Hip-Shoulder Coordination",
    phase:"Multi-Planar Trunk Stability Screen",
    setup:"Quadruped (hands under shoulders, knees under hips). Extend ipsilateral arm and leg simultaneously (same side — unilateral diagonal). Touch elbow to knee without rotation. Score: 3 = unilateral diagonal without trunk rotation/shift. 2 = diagonal performed with balance loss or can only do contralateral pattern. 1 = cannot complete even contralateral pattern. 0 = pain. Clearing test: child's pose (flexion) — pain = 0.",
    normalDesc:"Ipsilateral arm-leg extension with no trunk rotation, lateral shift, or hip drop. Touch elbow to knee in mid-line cleanly. Return controlled. No wobble. Clearing test negative.",
    observations:[
      { id:"rotation", q:"Trunk rotation during diagonal?",
        opts:["✓ No rotation — stays square","⚠ Minor rotation corrects itself","✗ Significant trunk rotation","✗ Cannot achieve position at all"],
        clues:["","Minor oblique or multifidus weakness — quadruped arm-raise then leg-raise before combining","Trunk rotation = oblique sling or contralateral multifidus insufficient. Dead-bug (supine) → quadruped unilateral → combine diagonal","Cannot achieve = major instability. Begin with quadruped arm raise only (all fours, lift one arm, hold 5s)"] },
      { id:"shift", q:"Lateral hip/trunk shift?",
        opts:["✓ No shift — stays centred","⚠ Minor lateral drift","✗ Significant lateral shift to support side","✗ Weight shifts so far body nearly falls"],
        clues:["","Minor — hip abductor or QL weakness on support side","Lateral shift = support-side glute med and QL cannot maintain trunk position. Side plank + glute med activation on support side","Major shift = significant instability. Begin with supported quadruped (stool under chest) to reduce demand"] },
      { id:"hip", q:"Hip drop on raised leg side?",
        opts:["✓ Hips level throughout","⚠ Minor hip drop","✗ Clear hip drop — support hip unable to hold","✗ Hip drop + trunk lean combined"],
        clues:["","Minor support glute med — unilateral hip stability work","Hip drop = support-side glute med failure during ipsilateral diagonal. Target support hip: clamshell, lateral band walk, single-leg holds","Combined hip drop + trunk lean = global instability pattern. Step back to quadruped basics and build progressively"] },
      { id:"touch", q:"Elbow-to-knee touch quality?",
        opts:["✓ Clean midline touch","⚠ Near-touch with minor drift","✗ Cannot touch — insufficient mobility or control","✗ Contralateral only (L arm-R leg)"],
        clues:["","Minor coordination deficit — slow-motion practice of the movement pattern","Cannot touch = either hamstring/hip flexor restriction OR core instability preventing full range. Screen ASLR (flexibility) and dead-bug (stability)","Contralateral only = ipsilateral cannot be controlled. Score 2 — contralateral pattern is acceptable but less stable"] },
      { id:"clear", q:"Clearing test — child's pose (flexion)?",
        opts:["✓ Negative — no pain","✗ Lumbar flexion pain","✗ SI joint pain","✗ Posterior thigh / radicular pain"],
        clues:["","Normal","Lumbar flexion pain = disc or flexion-intolerant condition. FMS = 0. McKenzie extension protocol first","SI joint pain = SIJ involvement. FMS = 0. SIJ stability screen before rotary loading","Radicular symptoms = neural tension or disc. FMS = 0. Neurological screen before loading"] },
    ],
    grades:["Normal (FMS 3) — Ipsilateral diagonal, no rotation/shift, clearing test negative","Compensated (FMS 2) — Contralateral pattern only or minor control loss","Abnormal (FMS 0–1) — Cannot complete or pain reproduced"],
  }
];

function LumbarFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  // Persist to patient data
  useEffect(() => {
    const saved = data["lfs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades) setGrades(p.grades);
        if (p.notes) setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f, g, n) => {
    set("lfs_data", JSON.stringify({ findings: f, grades: g, notes: n }));
  };

  const setObs = (testId, obsId, val) => {
    const nf = { ...findings, [`${testId}_${obsId}`]: val };
    setFindings(nf);
    save(nf, grades, notes);
  };

  const setGrade = (testId, val) => {
    const ng = { ...grades, [testId]: val };
    setGrades(ng);
    save(findings, ng, notes);
  };

  const setNote = (testId, val) => {
    const nn = { ...notes, [testId]: val };
    setNotes(nn);
    save(findings, grades, nn);
  };

  const completedCount = LUMBAR_TESTS.filter(t => grades[t.id]).length;

  const gradeColor = (g) =>
    g === 0 ? "#059669" : g === 1 ? "#d97706" : g === 2 ? "#dc2626" : C.muted;

  const gradeLabel = (t, g) => t.grades[g] || "";

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.08),rgba(59,130,246,0.05))", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: "1.4rem" }}>🦴</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: C.text }}>Lumbar Functional Screen</div>
            <div style={{ fontSize: "0.68rem", color: C.muted }}>5 movement-based tests · Clinical reasoning for students</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: C.accent }}>{completedCount}/5</div>
            <div style={{ fontSize: "0.58rem", color: C.muted }}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {LUMBAR_TESTS.map(t => {
            const g = grades[t.id];
            const done = g !== undefined;
            return (
              <div key={t.id} onClick={() => setActiveTest(activeTest === t.id ? null : t.id)}
                style={{ padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontSize: "0.68rem", fontWeight: 700,
                  border: `1px solid ${activeTest === t.id ? C.accent : done ? gradeColor(g) + "60" : C.border}`,
                  background: activeTest === t.id ? `${C.accent}12` : done ? `${gradeColor(g)}10` : "transparent",
                  color: activeTest === t.id ? C.accent : done ? gradeColor(g) : C.muted }}>
                {t.icon} {t.label} {done ? ["✓","⚠","✗"][g] : ""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {/* Test cards */}
      {LUMBAR_TESTS.map(t => {
        const isOpen = activeTest === t.id;
        const g = grades[t.id];
        const graded = g !== undefined;
        return (
          <div key={t.id} data-lfs-id={t.id} style={{ marginBottom: 10, background: C.surface, borderRadius: 14,
            border: `1.5px solid ${isOpen ? C.accent : graded ? gradeColor(g) + "50" : C.border}`,
            overflow: "hidden", boxShadow: isOpen ? "0 4px 16px rgba(124,58,237,0.1)" : "0 1px 4px rgba(0,0,0,0.04)" }}>

            {/* Card header */}
            <div onClick={() => setActiveTest(isOpen ? null : t.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer",
                borderLeft: `4px solid ${graded ? gradeColor(g) : C.border}` }}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{t.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: C.text }}>{t.label}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted }}>{t.subtitle}</div>
              </div>
              {graded && (
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 800,
                  background: `${gradeColor(g)}15`, color: gradeColor(g), flexShrink: 0 }}>
                  {["Normal","Compensated","Abnormal"][g]}
                </span>
              )}
              <span style={{ color: C.muted, fontSize: "0.75rem" }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>

                {/* Visual toggle + SVGs */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>📐 Visual Guide</div>
                  <button onClick={() => setShowVisual(v => !v)} style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                    {showVisual ? "Hide" : "Show"}
                  </button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Setup */}
                <div style={{ background: "#F8F7FF", borderRadius: 9, padding: "9px 11px", marginBottom: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>🎯 Setup & Procedure</div>
                  <div style={{ fontSize: "0.75rem", color: C.text, lineHeight: 1.6 }}>{t.setup}</div>
                  <div style={{ marginTop: 6, padding: "4px 8px", background: `${C.accent}08`, borderRadius: 6, border: `1px solid ${C.accent}20` }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: C.accent }}>Phase: {t.phase}</div>
                  </div>
                </div>

                {/* Observation checklist */}
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  👁 What To Observe
                </div>
                {t.observations.map(obs => {
                  const val = findings[`${t.id}_${obs.id}`];
                  const clue = val !== undefined ? obs.clues[val] : null;
                  return (
                    <div key={obs.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.text, marginBottom: 5 }}>{obs.q}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {obs.opts.map((opt, idx) => {
                          const sel = val === idx;
                          const isNorm = opt.startsWith("✓");
                          const isWarn = opt.startsWith("⚠");
                          const isAbn = opt.startsWith("✗");
                          const col = isNorm ? "#059669" : isWarn ? "#d97706" : isAbn ? "#dc2626" : C.muted;
                          return (
                            <div key={idx} onClick={() => setObs(t.id, obs.id, sel ? undefined : idx)}
                              style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                                border: `1.5px solid ${sel ? col : C.border}`,
                                background: sel ? `${col}10` : C.s2, transition: "all 0.12s" }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? col : C.border}`,
                                background: sel ? col : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {sel && <span style={{ fontSize: 8, color: "#fff", fontWeight: 900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: "0.72rem", fontWeight: sel ? 700 : 400, color: sel ? col : C.text, lineHeight: 1.35 }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && (
                        <div style={{ marginTop: 5, padding: "6px 10px", background: "rgba(124,58,237,0.06)", borderLeft: `3px solid ${C.accent}`, borderRadius: "0 6px 6px 0", fontSize: "0.68rem", color: C.text, lineHeight: 1.5 }}>
                          <strong>Clinical note:</strong> {clue}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Grade */}
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, marginTop: 4 }}>
                  📊 Grade This Test
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {t.grades.map((gLabel, idx) => {
                    const col = gradeColor(idx);
                    const sel = g === idx;
                    return (
                      <div key={idx} onClick={() => setGrade(t.id, sel ? undefined : idx)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                          border: `1.5px solid ${sel ? col : C.border}`, background: sel ? `${col}12` : C.s2 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${sel ? col : C.border}`,
                          background: sel ? col : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {sel && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{ fontSize: "0.73rem", fontWeight: sel ? 700 : 400, color: sel ? col : C.text }}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: 4 }}>Therapist notes</div>
                <textarea value={notes[t.id] || ""} onChange={e => setNote(t.id, e.target.value)}
                  placeholder="Clinical observations, patient reports, next steps..."
                  style={{ width: "100%", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
                    padding: "8px 10px", fontSize: "0.72rem", fontFamily: "inherit", resize: "vertical", minHeight: 56, outline: "none" }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {completedCount > 0 && (
        <div style={{ background: "#F8F7FF", borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, marginTop: 4 }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 10 }}>📋 Screen Summary</div>
          {LUMBAR_TESTS.filter(t => grades[t.id] !== undefined).map(t => {
            const g = grades[t.id];
            const col = gradeColor(g);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                <span style={{ flex: 1, fontSize: "0.75rem", fontWeight: 600, color: C.text }}>{t.label}</span>
                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 800, background: `${col}15`, color: col }}>
                  {["Normal","Compensated","Abnormal"][g]}
                </span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", fontSize: "0.7rem", color: "#dc2626", lineHeight: 1.5 }}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: SIJ compression/distraction, FABER/FADIR, hip quadrant, L4/5/S1 myotome testing, and McKenzie directional preference assessment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── SHOULDER FUNCTIONAL SCREEN ───────────────────────────────────────────────

const SHOULDER_TESTS = [
  {
    id:"sfs_flex", icon:"🙌", label:"Active Flexion (Overhead Reach)",
    subtitle:"Scapulohumeral Rhythm + Subacromial Screen",
    phase:"Glenohumeral + Scapular Upward Rotation",
    setup:"Patient standing, arms at side. Slowly elevate both arms in sagittal plane to maximum. Observe from side and behind. Repeat 3×.",
    normalDesc:"170–180°, scapular upward rotation begins ~60° GH, smooth rhythm 2:1 GH:scapular, no trunk lateral flex, no humeral head migration.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        {/* Body */}
        <circle cx="55" cy="24" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="55" y1="31" x2="55" y2="65" stroke="#059669" strokeWidth="2.5"/>
        <line x1="55" y1="65" x2="48" y2="90" stroke="#059669" strokeWidth="2"/>
        <line x1="55" y1="65" x2="62" y2="90" stroke="#059669" strokeWidth="2"/>
        {/* Arms fully overhead */}
        <line x1="55" y1="38" x2="48" y2="15" stroke="#059669" strokeWidth="2.5"/>
        <line x1="55" y1="38" x2="62" y2="15" stroke="#059669" strokeWidth="2.5"/>
        {/* Scapula upward rotation mark */}
        <path d="M44,36 Q38,40 40,48" stroke="#059669" strokeWidth="1.5" fill="none" strokeDasharray="3,2"/>
        <text x="4" y="50" fontSize="5.5" fill="#059669">Scapula</text>
        <text x="4" y="56" fontSize="5.5" fill="#059669">upward↑</text>
        {/* Range arc */}
        <path d="M55,31 Q72,20 68,12" stroke="#059669" strokeWidth="1" fill="none" strokeDasharray="2,2"/>
        <text x="70" y="14" fontSize="5.5" fill="#059669">180°</text>
        <text x="26" y="96" fontSize="6" fill="#059669">Full range, smooth rhythm</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">COMPENSATED</text>
        {/* Body with trunk lateral flex */}
        <circle cx="58" cy="24" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="58" y1="31" x2="55" y2="65" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="55" y1="65" x2="48" y2="90" stroke="#dc2626" strokeWidth="2"/>
        <line x1="55" y1="65" x2="62" y2="90" stroke="#dc2626" strokeWidth="2"/>
        {/* Arm stopped short + shrug */}
        <line x1="58" y1="37" x2="52" y2="22" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="58" y1="37" x2="72" y2="30" stroke="#dc2626" strokeWidth="2.5"/> {/* other arm lower */}
        {/* Upper trap elevation arrow */}
        <path d="M52,36 L50,28" stroke="#f97316" strokeWidth="2" fill="none"/>
        <polygon points="48,28 52,24 54,30" fill="#f97316"/>
        <text x="36" y="24" fontSize="5.5" fill="#f97316">Shrug</text>
        {/* Trunk lean arrow */}
        <path d="M64,50 L70,50" stroke="#dc2626" strokeWidth="1.5" fill="none"/>
        <polygon points="70,48 74,50 70,52" fill="#dc2626"/>
        <text x="75" y="53" fontSize="5" fill="#dc2626">Lean</text>
        <text x="4" y="96" fontSize="6" fill="#dc2626">Shrug + trunk lateral flex</text>
      </svg>
    ),
    observations:[
      { id:"rom",    q:"Range of motion achieved?",
        opts:["✓ 170–180° full elevation","⚠ 140–169° limited","✗ <140° significantly restricted","✗ Painful before 90°"],
        clues:["","Possible capsular tightness or subacromial impingement — check arc","Significant restriction — screen capsular pattern (ER most > Abd > IR)","Subacromial/rotator cuff pathology — Hawkins-Kennedy, Neer test"] },
      { id:"rhythm", q:"Scapulohumeral rhythm?",
        opts:["✓ Smooth 2:1 (GH:scapular)","⚠ Early scapular elevation (upper trap dominance)","✗ Scapular winging on elevation","✗ Reverse rhythm (scapula before GH)"],
        clues:["","Upper trap overactive — check lower trap and serratus anterior strength","Serratus anterior weakness — wall push-up plus test","Significant neuromuscular dysfunction — screen long thoracic nerve"] },
      { id:"arc",    q:"Painful arc during flexion?",
        opts:["✓ Pain-free throughout","⚠ Pain at 60–90° (early arc)","⚠ Pain at 90–130° (classic subacromial arc)","⚠ Pain at 150–180° (AC joint range)"],
        clues:["","Likely subacromial pathology — bursa or cuff — do Hawkins + Neer","Classic subacromial impingement arc — do Hawkins-Kennedy, Neer, Empty Can","AC joint pathology — do horizontal adduction (cross-arm) test"] },
      { id:"trunk",  q:"Trunk compensation?",
        opts:["✓ Trunk upright throughout","⚠ Slight ipsilateral lean","✗ Clear lateral trunk flex to elevate arm","✗ Trunk extension (lumbar) to achieve height"],
        clues:["","Minor — monitor bilaterally","Substitution for restricted GH flexion — true ROM less than apparent","Stiff thoracic / restricted GH — thoracic AROM assessment needed"] },
      { id:"sym",    q:"Bilateral symmetry?",
        opts:["✓ Symmetric","⚠ Minor difference <20°","✗ >20° side-to-side difference","✗ One side clearly pathological"],
        clues:["","Monitoring point","Unilateral restriction — capsular pattern or rotator cuff pathology likely","Priority assessment side — proceed to specific shoulder tests"] },
    ],
    grades:["Normal — Full range, smooth rhythm, pain-free, symmetric","Compensated — Minor restriction or rhythm fault without pain","Abnormal — Painful arc, significant restriction, or winging"],
  },
  {
    id:"sfs_abd", icon:"✈️", label:"Shoulder Abduction Arc",
    subtitle:"Painful Arc / Subacromial vs AC Joint Screen",
    phase:"Subacromial Space / AC Joint Loading",
    setup:"Patient standing. Abduct arms in coronal plane slowly to 180°. Observe for painful arc zones. Note start and end of pain. Assess bilaterally.",
    normalDesc:"Full 180° pain-free. Scapular upward rotation and thoracic lateral flex at end range. No painful arc zone.",
    svgNormal:(
      <svg viewBox="0 0 140 100" style={{width:"100%",maxWidth:140}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL + ARC ZONES</text>
        {/* Standing figure */}
        <circle cx="70" cy="28" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="70" y1="35" x2="70" y2="70" stroke="#059669" strokeWidth="2.5"/>
        <line x1="70" y1="70" x2="62" y2="92" stroke="#059669" strokeWidth="2"/>
        <line x1="70" y1="70" x2="78" y2="92" stroke="#059669" strokeWidth="2"/>
        {/* Full abduction arms */}
        <line x1="70" y1="42" x2="26" y2="28" stroke="#059669" strokeWidth="2.5"/>
        <line x1="70" y1="42" x2="114" y2="28" stroke="#059669" strokeWidth="2.5"/>
        {/* Arc zone labels */}
        <path d="M40,55 Q28,42 36,30" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeDasharray="2,2"/>
        <text x="4" y="70" fontSize="5" fill="#6b7280">60–120°</text>
        <text x="4" y="76" fontSize="5" fill="#f97316">Subacromial</text>
        <text x="100" y="70" fontSize="5" fill="#6b7280">140–180°</text>
        <text x="100" y="76" fontSize="5" fill="#dc2626">AC Joint</text>
        {/* Green = normal */}
        <text x="38" y="96" fontSize="5.5" fill="#059669">✓ Pain-free full range</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 140 100" style={{width:"100%",maxWidth:140}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">PAINFUL ARC ZONES</text>
        <circle cx="70" cy="28" r="7" fill="none" stroke="#6b7280" strokeWidth="2"/>
        <line x1="70" y1="35" x2="70" y2="70" stroke="#6b7280" strokeWidth="2.5"/>
        <line x1="70" y1="70" x2="62" y2="92" stroke="#6b7280" strokeWidth="2"/>
        <line x1="70" y1="70" x2="78" y2="92" stroke="#6b7280" strokeWidth="2"/>
        {/* Arm at 90° */}
        <line x1="70" y1="42" x2="36" y2="42" stroke="#6b7280" strokeWidth="2.5"/>
        <line x1="70" y1="42" x2="104" y2="42" stroke="#6b7280" strokeWidth="2.5"/>
        {/* Painful arc zone 1 — subacromial */}
        <path d="M42,55 Q30,42 42,30" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <text x="4" y="62" fontSize="5.5" fill="#f97316" fontWeight="bold">60–120°</text>
        <text x="4" y="69" fontSize="5" fill="#f97316">Subacromial</text>
        <text x="4" y="75" fontSize="5" fill="#f97316">(bursa/cuff)</text>
        {/* Painful arc zone 2 — AC */}
        <path d="M100,38 Q110,28 104,18" stroke="#dc2626" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <text x="106" y="40" fontSize="5.5" fill="#dc2626" fontWeight="bold">140–180°</text>
        <text x="106" y="47" fontSize="5" fill="#dc2626">AC Joint</text>
        {/* Pain symbol */}
        <text x="22" y="44" fontSize="8" fill="#f97316">⚡</text>
        <text x="100" y="24" fontSize="8" fill="#dc2626">⚡</text>
      </svg>
    ),
    observations:[
      { id:"arc60",  q:"Pain between 60–120° abduction?",
        opts:["✓ No pain in this range","⚠ Mild discomfort","✗ Clear pain — arc present"],
        clues:["","Minor subacromial irritation — monitor","Classic subacromial painful arc — suggests subacromial bursitis or supraspinatus pathology. Do Hawkins-Kennedy and Neer impingement tests"] },
      { id:"arc140", q:"Pain between 140–180° abduction?",
        opts:["✓ No pain in this range","⚠ Discomfort only","✗ Clear pain — AC arc present"],
        clues:["","Mild AC joint irritation","AC joint pathology likely — do horizontal adduction test (cross-arm), AC joint palpation, and AC joint stress test"] },
      { id:"rhythm", q:"Scapular rhythm during abduction?",
        opts:["✓ 2:1 GH:scapular","⚠ Early scapular elevation (shrug at ~60°)","✗ Scapular winging from behind","✗ Scapular dyskinesis — irregular movement"],
        clues:["","Upper trap overactive / lower trap weak — screen CPA (Janda)","Serratus anterior weakness — confirm wall push-up plus","Rotator cuff weakness or SICK scapula syndrome — full scapular screen"] },
      { id:"drop",   q:"Can patient slowly lower from 90°?",
        opts:["✓ Controlled throughout","⚠ Drop arm at ~90° eccentric","✗ Unable to control — drops arm"],
        clues:["","Minor cuff fatigue","Drop arm sign — likely supraspinatus tear (if positive on active abd). Do empty can + external rotation lag sign","Full thickness rotator cuff tear likely — MRI referral"] },
      { id:"sym",    q:"Range vs opposite side?",
        opts:["✓ Symmetric","⚠ Minor difference <20°","✗ >20° difference","✗ Unable to abduct >60°"],
        clues:["","Monitor","Unilateral restriction — capsular pattern vs impingement. Check passive range — if equal, muscular inhibition","Severe restriction — adhesive capsulitis if all passive ranges equally restricted"] },
    ],
    grades:["Normal — Full range, pain-free, smooth scapular rhythm","Compensated — Minor arc or rhythm fault","Abnormal — Painful arc or significant restriction"],
  },
  {
    id:"sfs_ir",  icon:"🤝", label:"Apley Scratch Lower (IR)",
    subtitle:"Internal Rotation + Extension Composite",
    phase:"Posterior Capsule / IR Range",
    setup:"Standing. Patient reaches hand behind back as high as possible — thumb tip level noted. Compare bilaterally. Note pain vs stiffness.",
    normalDesc:"Thumb reaches T7–T8 (mid-thoracic). No pain. Restriction = posterior capsule tightness or posterior rotator cuff.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        {/* Side view figure */}
        <circle cx="60" cy="22" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="60" y1="29" x2="60" y2="65" stroke="#059669" strokeWidth="2.5"/>
        <line x1="60" y1="65" x2="54" y2="88" stroke="#059669" strokeWidth="2"/>
        <line x1="60" y1="65" x2="66" y2="88" stroke="#059669" strokeWidth="2"/>
        {/* Arm behind back — reaching mid-thoracic */}
        <line x1="60" y1="38" x2="52" y2="46" stroke="#059669" strokeWidth="2.5"/>
        <line x1="52" y1="46" x2="56" y2="52" stroke="#059669" strokeWidth="2.5"/>
        {/* Hand position indicator */}
        <circle cx="57" cy="52" r="3" fill="#059669" opacity="0.6"/>
        <text x="62" y="54" fontSize="5.5" fill="#059669">T7–T8</text>
        <line x1="62" y1="52" x2="60" y2="50" stroke="#059669" strokeWidth="1"/>
        {/* Spine landmark */}
        <line x1="60" y1="35" x2="60" y2="62" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"/>
        <text x="26" y="96" fontSize="6" fill="#059669">Reaches mid-thoracic</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">RESTRICTED</text>
        <circle cx="60" cy="22" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="60" y1="29" x2="60" y2="65" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="60" y1="65" x2="54" y2="88" stroke="#dc2626" strokeWidth="2"/>
        <line x1="60" y1="65" x2="66" y2="88" stroke="#dc2626" strokeWidth="2"/>
        {/* Arm stuck low — only reaches lumbar */}
        <line x1="60" y1="38" x2="52" y2="50" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="52" y1="50" x2="55" y2="65" stroke="#dc2626" strokeWidth="2.5"/>
        {/* Hand stuck at lumbar */}
        <circle cx="55" cy="65" r="3" fill="#dc2626" opacity="0.6"/>
        <text x="40" y="74" fontSize="5.5" fill="#dc2626">Lumbar only</text>
        {/* Restricted symbol */}
        <text x="30" y="55" fontSize="8" fill="#dc2626">✗</text>
        <text x="4" y="96" fontSize="6" fill="#dc2626">Posterior capsule / IR restriction</text>
      </svg>
    ),
    observations:[
      { id:"level",  q:"Level reached?",
        opts:["✓ T7–T8 or above (normal)","⚠ T10–T12 (mild restriction)","✗ L1–L5 (moderate restriction)","✗ Below buttock (severe restriction)"],
        clues:["","Mild posterior capsule tightness or minor cuff restriction — monitor","Posterior capsule tightness — sleeper stretch, posterior joint mobilisation","Significant IR deficit — adhesive capsulitis pattern or massive posterior capsule tightness (GIRD)"] },
      { id:"type",   q:"Is restriction pain or stiffness?",
        opts:["✓ Neither","⚠ Stiffness — mechanical","✗ Pain posterior shoulder","✗ Pain anterior shoulder"],
        clues:["","Posterior capsule restriction — respond to stretching / mobilisation","Posterior cuff or posterior capsule — likely mechanical. PAIVM L5–S1 equivalent (Maitland PA)","Biceps tendon or anterior capsule pain with IR — screen bicipital groove palpation, Speed's test"] },
      { id:"sym",    q:"Bilateral comparison?",
        opts:["✓ Symmetric","⚠ 1–2 vertebral levels difference","✗ >3 levels difference","✗ Dominant arm significantly restricted"],
        clues:["","","GIRD (Glenohumeral Internal Rotation Deficit) likely — common in throwing athletes","GIRD — highest risk for SLAP lesions and posterior-superior impingement. Assess posterior capsule stretch response"] },
      { id:"scap",   q:"Scapular compensation?",
        opts:["✓ Scapula stays back","⚠ Mild scapular protraction","✗ Clear scapular protraction to gain range"],
        clues:["","","Substituting scapular protraction for true GH IR. True GH IR deficit > apparent — clinically stabilise scapula and remeasure"] },
      { id:"pain",   q:"Overall provocation?",
        opts:["✓ No pain","⚠ Dull ache end range","✗ Sharp posterior pain","✗ Clicking / clunking"],
        clues:["","Minor — monitor","Posterior capsule or posterior cuff pathology","Labral involvement possible — O'Brien's active compression test, bicipital groove tests"] },
    ],
    grades:["Normal — T7 or above, pain-free, symmetric","Compensated — Mild restriction or 1–2 levels asymmetry","Abnormal — <T12, significant pain, or GIRD pattern"],
  },
  {
    id:"sfs_er",  icon:"🙆", label:"Apley Scratch Upper (ER)",
    subtitle:"External Rotation + Abduction Composite",
    phase:"Anterior Capsule / ER + Flexion Range",
    setup:"Standing. Patient reaches hand behind head and down toward opposite scapula. Note how far hand reaches. Assess pain vs stiffness. Compare bilaterally.",
    normalDesc:"Fingers reach or pass contralateral scapula (opposite T4–T5). No pain. Limitation = anterior capsule or subscapularis tightness.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        <circle cx="60" cy="22" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="60" y1="29" x2="60" y2="65" stroke="#059669" strokeWidth="2.5"/>
        <line x1="60" y1="65" x2="54" y2="88" stroke="#059669" strokeWidth="2"/>
        <line x1="60" y1="65" x2="66" y2="88" stroke="#059669" strokeWidth="2"/>
        {/* Arm behind head + reaching opposite shoulder */}
        <line x1="60" y1="35" x2="70" y2="24" stroke="#059669" strokeWidth="2.5"/> {/* upper arm up */}
        <line x1="70" y1="24" x2="60" y2="32" stroke="#059669" strokeWidth="2.5"/> {/* forearm behind head */}
        <line x1="60" y1="32" x2="52" y2="38" stroke="#059669" strokeWidth="2.5"/> {/* reach contralateral */}
        <circle cx="50" cy="40" r="3" fill="#059669" opacity="0.6"/>
        <text x="28" y="40" fontSize="5.5" fill="#059669">Contra</text>
        <text x="28" y="46" fontSize="5.5" fill="#059669">scapula</text>
        <text x="22" y="96" fontSize="6" fill="#059669">Reaches opposite shoulder</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">RESTRICTED</text>
        <circle cx="60" cy="22" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="60" y1="29" x2="60" y2="65" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="60" y1="65" x2="54" y2="88" stroke="#dc2626" strokeWidth="2"/>
        <line x1="60" y1="65" x2="66" y2="88" stroke="#dc2626" strokeWidth="2"/>
        {/* Arm can't get behind head — elbow forward */}
        <line x1="60" y1="35" x2="72" y2="28" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="72" y1="28" x2="66" y2="36" stroke="#dc2626" strokeWidth="2.5"/>
        {/* Can't reach contralateral — stuck ipsilateral */}
        <circle cx="68" cy="36" r="3" fill="#dc2626" opacity="0.6"/>
        <text x="72" y="38" fontSize="5.5" fill="#dc2626">Ipsilateral</text>
        <text x="72" y="44" fontSize="5.5" fill="#dc2626">only</text>
        <text x="30" y="62" fontSize="8" fill="#dc2626">✗</text>
        <text x="4" y="96" fontSize="6" fill="#dc2626">Anterior capsule / subscap tight</text>
      </svg>
    ),
    observations:[
      { id:"reach",  q:"How far does hand reach?",
        opts:["✓ Passes contralateral scapula","⚠ Reaches contralateral shoulder tip","⚠ Touches top of head only (can't reach behind)","✗ Cannot get hand behind head"],
        clues:["","Minor restriction — asymmetry monitor","Anterior capsule tightness or subscapularis restriction — compare passive ER in neutral and 90° abd","Significant ER restriction — screen for adhesive capsulitis (all ranges limited) or traumatic anterior instability"] },
      { id:"type",   q:"Restriction character?",
        opts:["✓ No restriction","⚠ Stiffness — no pain","✗ Anterior shoulder pain","✗ Posterior shoulder pain on end range"],
        clues:["","Capsular restriction — anterior capsule + subscapularis. Respond to anterior capsule stretching and GH anterior glide mobilisation","Anterior capsule / biceps long head — Speeds test, anterior palpation","Posterior capsule stretch pain — combined restriction pattern"] },
      { id:"sym",    q:"Side-to-side difference?",
        opts:["✓ Symmetric","⚠ Minor difference (<5cm)","✗ Marked difference (>10cm)","✗ One side cannot complete movement"],
        clues:["","","Unilateral capsular or subscapularis restriction — assess passive ER at 0° and 90°","Significant — screen for acute pathology (dislocation history, RTC tear) vs chronic capsular pattern"] },
      { id:"impinge",q:"Clicking or impingement sensation?",
        opts:["✓ None","⚠ Clicking — no pain","✗ Painful click","✗ Clunk — labral feel"],
        clues:["","Minor — possibly bicipital tendon","Internal impingement — posterior-superior labral contact in ABER position. O'Brien's test, SLAP screen","Labral tear possible — Crank test, O'Brien's, Speed's test"] },
      { id:"sub",    q:"Subscapularis substitution (shoulder rises)?",
        opts:["✓ No compensation","⚠ Mild shoulder rise","✗ Clear shoulder elevation to gain range"],
        clues:["","","True ER deficit is greater than apparent — stabilise shoulder girdle passively and remeasure ER in 90° abduction"] },
    ],
    grades:["Normal — Reaches contralateral scapula, pain-free, symmetric","Compensated — Minor restriction or near-symmetric","Abnormal — Cannot reach contralateral side, pain, or significant asymmetry"],
  },
  {
    id:"sfs_scap", icon:"🧱", label:"Scapular Control (Wall Slide)",
    subtitle:"Serratus Anterior + Lower Trap Function",
    phase:"Scapular Stabilisation / Motor Control",
    setup:"Patient faces wall, hands at shoulder height, elbows slightly bent. Perform push-up plus (protract and then retract scapulae) × 5. Observe scapular borders from behind.",
    normalDesc:"Scapulae stay flat against ribcage throughout. No medial border or inferior angle lifting. Smooth, equal bilateral movement.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL (rear view)</text>
        {/* Torso from back */}
        <rect x="30" y="20" width="50" height="65" rx="8" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5"/>
        {/* Spine */}
        <line x1="55" y1="20" x2="55" y2="85" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2"/>
        {/* Scapulae flat — no winging */}
        <path d="M32,30 Q30,45 34,60" stroke="#059669" strokeWidth="2.5" fill="none"/>
        <path d="M78,30 Q80,45 76,60" stroke="#059669" strokeWidth="2.5" fill="none"/>
        {/* Flat indicator */}
        <text x="8" y="48" fontSize="5.5" fill="#059669">Flat ✓</text>
        <text x="84" y="48" fontSize="5.5" fill="#059669">✓ Flat</text>
        {/* Arms to wall */}
        <line x1="30" y1="38" x2="16" y2="38" stroke="#059669" strokeWidth="2"/>
        <line x1="80" y1="38" x2="94" y2="38" stroke="#059669" strokeWidth="2"/>
        <text x="22" y="96" fontSize="6" fill="#059669">Scapulae flat — no winging</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">WINGING (rear view)</text>
        <rect x="30" y="20" width="50" height="65" rx="8" fill="#FEF2F2" stroke="#dc2626" strokeWidth="1.5"/>
        <line x1="55" y1="20" x2="55" y2="85" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2"/>
        {/* Medial border winging */}
        <path d="M32,30 Q22,45 28,60" stroke="#dc2626" strokeWidth="2.5" fill="none"/>
        {/* Wing arrow */}
        <path d="M26,45 L18,45" stroke="#dc2626" strokeWidth="2" fill="none"/>
        <polygon points="18,43 14,45 18,47" fill="#dc2626"/>
        <text x="2" y="42" fontSize="5" fill="#dc2626">Medial</text>
        <text x="2" y="48" fontSize="5" fill="#dc2626">border</text>
        <text x="2" y="54" fontSize="5" fill="#dc2626">lifts</text>
        {/* Serratus label */}
        <text x="2" y="64" fontSize="4.5" fill="#f97316">= SA weak</text>
        {/* Inferior angle winging right side */}
        <path d="M78,30 Q82,48 78,62" stroke="#f97316" strokeWidth="2.5" fill="none"/>
        <path d="M78,60 L86,65" stroke="#f97316" strokeWidth="2" fill="none"/>
        <polygon points="86,63 90,67 84,67" fill="#f97316"/>
        <text x="88" y="60" fontSize="4.5" fill="#f97316">Inf</text>
        <text x="88" y="66" fontSize="4.5" fill="#f97316">angle</text>
        <text x="88" y="72" fontSize="4.5" fill="#f97316">=LT weak</text>
        <text x="8" y="96" fontSize="5.5" fill="#dc2626">Medial=Serratus · Inferior=Lower Trap</text>
      </svg>
    ),
    observations:[
      { id:"wing",   q:"Scapular winging present?",
        opts:["✓ No winging — scapulae flat","⚠ Mild medial border lift (serratus)","✗ Clear medial border winging","✗ Inferior angle lifts (lower trap)","✗ Both — global scapular instability"],
        clues:["","Mild serratus anterior weakness — screen with wall push-up and SA MMT","Serratus anterior weakness — long thoracic nerve screen (check C5/C6 myotome), progress wall push-up for activation","Lower trapezius weakness — screen with prone Y exercise and lower trap MMT","Combined — full scapular muscle screen: SA, LT, MT, rhomboids"] },
      { id:"timing", q:"When does winging appear?",
        opts:["✓ No winging","⚠ Only at end range (fatigue)","✗ From start of movement","✗ Winging on return (eccentric)"],
        clues:["","Endurance deficit — progressive loading needed","Significant motor control deficit — activation phase issue","Eccentric control weakness — priority in overhead athletes"] },
      { id:"sym",    q:"Bilateral comparison?",
        opts:["✓ Symmetric","⚠ Minor asymmetry","✗ Clear unilateral winging","✗ Dominant winging — check history"],
        clues:["","","Unilateral — screen for long thoracic nerve palsy (sudden onset) vs gradual weakness","Long thoracic nerve palsy if acute onset + global serratus weakness"] },
      { id:"elev",   q:"Resting scapular position?",
        opts:["✓ Level and neutral","⚠ Elevated (upper trap dominant)","⚠ Internally rotated / tilted","✗ Clearly depressed on one side"],
        clues:["","Upper trap overactive — screen pec minor + upper trap for tightness (Janda CPA)","SICK scapula pattern — pec minor tightness + CPA dysfunction","Depression may indicate accessory nerve or trapezius pathology"] },
      { id:"pain",   q:"Pain during scapular movement?",
        opts:["✓ No pain","⚠ Periscapular ache","✗ Sharp periscapular pain","✗ Referred pain / tingling"],
        clues:["","Muscle fatigue or trigger points in periscapular muscles — assess rhomboids, mid trap","Active trigger points — screen rhomboids, levator scapulae, mid/lower trap","Neural component — thoracic outlet / long thoracic nerve — do neurological screen"] },
    ],
    grades:["Normal — No winging, flat scapulae, symmetric","Compensated — Mild fatigue winging or minor asymmetry","Abnormal — Clear winging, pain, or SICK scapula pattern"],
  },
,
  // ── FMS: Shoulder Mobility ────────────────────────────────────────────────
  {
    id:"fms_sm", icon:"🖐️", label:"Shoulder Mobility (FMS)",
    subtitle:"Combined IR + ER + Adduction Screen",
    phase:"Shoulder / Thoracic Mobility Screen",
    setup:"Each hand: make a fist with thumb inside. One arm over shoulder (IR + Adduction, fist down spine), other arm under (ER + Abduction, fist up spine). Measure distance between knuckles. Normal: fists within one hand-length (or touching). Score: 3 = within one hand-length. 2 = within 1.5x hand length. 1 = more than 1.5x hand length. 0 = pain. Clearing test: push-up position — wrist pain = 0.",
    normalDesc:"Fists within one hand-length on both sides. Symmetric. No pain. Posterior shoulder and thoracic extension flexible. Clearing test negative (no wrist pain in push-up position).",
    observations:[
      { id:"reach", q:"Fist distance (knuckle to knuckle)?",
        opts:["✓ Within one hand-length (≤ hand width)","⚠ 1–1.5x hand-length","✗ >1.5x hand-length (significant restriction)","✗ Pain on movement — score 0"],
        clues:["","Minor posterior shoulder or pec minor restriction — posterior capsule stretch + pec minor release","Significant restriction — posterior capsule (cross-body stretch), lat tightness (doorway lat stretch), thoracic extension. Target specific muscle from asymmetry pattern","Pain = score 0. Screen for shoulder pathology before mobility work. Apprehension test + rotator cuff assessment"] },
      { id:"sym", q:"Symmetry — arms over vs under?",
        opts:["✓ Symmetric both sides","⚠ Mild asymmetry (<1 score difference)","✗ Clear asymmetry (≥1 score difference)","✗ Cannot perform one direction"],
        clues:["","Minor asymmetry — monitor. May be dominant side slight advantage in ER","Asymmetry ≥1 = increased shoulder injury risk. Tight over-shoulder side = posterior capsule + thoracic. Tight under-shoulder side = pec minor + anterior capsule","Complete failure one direction = significant capsular restriction or pain. Screen rotator cuff and labrum before mobility treatment"] },
      { id:"ir", q:"Internal rotation reach (arm from below)?",
        opts:["✓ Full — fist reaches mid-thoracic","⚠ Reaches lower thoracic only","✗ Only reaches lumbar","✗ Cannot achieve IR reach at all"],
        clues:["","Minor IR restriction — shoulder ER > IR imbalance. Sleeper stretch, SMR infraspinatus","Significant IR restriction — posterior capsule tightness (common in throwers). Sleeper stretch 3×45s + cross-body stretch + horizontal adduction PROM","Cannot achieve = severe posterior capsule. Grade III horizontal adduction mobilisation + sleeper stretch"] },
      { id:"er", q:"External rotation reach (arm from above)?",
        opts:["✓ Full — fist reaches mid-thoracic from above","⚠ Fist reaches upper thoracic only","✗ Significant restriction — arm cannot fully internally rotate overhead","✗ Pain on clearing test (push-up position)"],
        clues:["","Minor ER reach restriction — pec minor or anterior capsule. Pec minor stretch + anterior shoulder mobilisation","Pec minor dominant — upper crossed pattern. Thoracic extension + pec minor release priority","Pain on clearing test = potential shoulder pathology. Subacromial impingement or AC joint. Refer for special tests"] },
      { id:"clear", q:"Clearing test (wrist/elbow pain in push-up position)?",
        opts:["✓ Negative — no pain","✗ Wrist pain","✗ Elbow pain","✗ Shoulder pain"],
        clues:["","Normal — proceed with score","Wrist pain on clearing = TFCC or carpal screen. Wrist FMS score = 0 regardless of reach distance. Screen wrist separately","Elbow pain = screen lateral/medial epicondyle + PLRI. FMS = 0. Elbow assessment priority","Shoulder pain = FMS 0. Screen rotator cuff + labrum. Do not load shoulder mobility until cleared"] },
    ],
    grades:["Normal (FMS 3) — Within one hand-length, symmetric, clearing test negative","Compensated (FMS 2) — 1–1.5x hand-length restriction, no pain","Abnormal (FMS 0–1) — >1.5x hand-length, asymmetry ≥1 score, or pain"],
  },
  // ── FMS: Trunk Stability Push-Up ──────────────────────────────────────────
  {
    id:"fms_tspu", icon:"💪", label:"Trunk Stability Push-Up (FMS)",
    subtitle:"Anterior Core Stability · Spinal Rigidity Screen",
    phase:"Anterior Chain / Core Stability Screen",
    setup:"Patient prone: Men — thumbs at forehead level. Women — thumbs at chin level. Complete ONE push-up maintaining rigid spine — no lag in lumbar or hips. Score: 3 = perfect rigid spine push-up at forehead level (men) / chin (women). 2 = push-up at chin (men) / chest (women). 1 = cannot perform without spinal lag. 0 = pain. Clearing test: passive trunk extension (prone press-up) — pain = 0.",
    normalDesc:"Single push-up completed with rigid spine — no lumbar extension lead, no hip sag, no scapular winging. Trunk rises as a rigid unit. Clearing test negative (prone press-up pain-free).",
    observations:[
      { id:"spine", q:"Spinal rigidity during push-up?",
        opts:["✓ Rigid spine — rises as one unit","⚠ Minor lumbar lag at peak","✗ Lumbar sags / hips rise first (hip hinge pattern)","✗ Cannot complete even with modification"],
        clues:["","Minor anterior core weakness — TA/oblique activation in push-up position","Hip sag = anterior core deficit (TA, obliques, TrA). Lower push-up level first — find level where spine stays rigid. Build from there","Cannot complete = significant core instability. Begin with prone plank on elbows, progress to extended arm plank before push-up"] },
      { id:"scap", q:"Scapular position during push-up?",
        opts:["✓ Scapulae set — no winging","⚠ Minor protraction drift","✗ Scapular winging visible","✗ Asymmetric — one wing only"],
        clues:["","Minor serratus anterior weakness — push-up plus (serratus press) before full push-up","Serratus anterior inhibition — dynamic push-up plus × 3×15. Reduce load to wall push-up if winging is significant","Asymmetric winging = unilateral serratus or long thoracic nerve. Assess unilateral serratus anterior strength"] },
      { id:"hip", q:"Hip position throughout push-up?",
        opts:["✓ Hips neutral — maintain position","⚠ Minor hip extension increase","✗ Hips rise (jack-knife pattern)","✗ Hips sag below spine level"],
        clues:["","Minor hip flexor tightness or core substitution","Hip rise = RA dominance over TA. Patient uses spinal extension to push up. Teach dead-bug pattern first","Hip sag = posterior tilt deficit or lumbar extensor weakness. Prone plank training before push-up loading"] },
      { id:"clear", q:"Clearing test — prone press-up?",
        opts:["✓ Negative — no pain","✗ Central lumbar pain","✗ Unilateral lumbar / buttock pain","✗ Arm or leg symptoms reproduced"],
        clues:["","Normal — proceed with score","Central extension pain = lumbar disc or facet. FMS = 0. Extension-biased condition — do not load push-up","Unilateral = facet or SIJ. FMS = 0. Quadrant test + Kemp's before trunk stability loading","Referred symptoms = neural — FMS 0. Neurological screen before loading"] },
      { id:"sym", q:"Left-right symmetry during push-up?",
        opts:["✓ Symmetric","⚠ Minor asymmetric drift","✗ Clear trunk rotation during push-up","✗ Arm dominance — pushes from one side"],
        clues:["","Monitor — minor asymmetry in first rep acceptable","Trunk rotation during push-up = unilateral oblique or serratus weakness. Plank with rotation resistance (Pallof press) + unilateral core training","Arm dominance = unilateral shoulder girdle weakness. Screen rotator cuff and serratus on weaker side"] },
    ],
    grades:["Normal (FMS 3) — Rigid spine, no winging, clearing test negative","Compensated (FMS 2) — Push-up with minor lag or lower level","Abnormal (FMS 0–1) — Spinal lag, cannot complete, or pain"],
  }
];

function ShoulderFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["sfs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades)   setGrades(p.grades);
        if (p.notes)    setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f, g, n) => set("sfs_data", JSON.stringify({ findings: f, grades: g, notes: n }));

  const setObs = (testId, obsId, val) => {
    const nf = { ...findings, [`${testId}_${obsId}`]: val };
    setFindings(nf); save(nf, grades, notes);
  };
  const setGrade = (testId, val) => {
    const ng = { ...grades, [testId]: val };
    setGrades(ng); save(findings, ng, notes);
  };
  const setNote = (testId, val) => {
    const nn = { ...notes, [testId]: val };
    setNotes(nn); save(findings, grades, nn);
  };

  const completedCount = SHOULDER_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g === 0 ? "#059669" : g === 1 ? "#d97706" : g === 2 ? "#dc2626" : C.muted;

  return (
    <div>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(8,145,178,0.08),rgba(59,130,246,0.05))", border:"1px solid rgba(8,145,178,0.22)", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:"1.4rem" }}>🦾</span>
          <div>
            <div style={{ fontWeight:800, fontSize:"0.95rem", color:C.text }}>Shoulder Functional Screen</div>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>5 tests · Scapulohumeral rhythm · Arc + Capsular pattern · Student guide</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:"1.2rem", fontWeight:900, color:"#0891b2" }}>{completedCount}/5</div>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {SHOULDER_TESTS.map(t => {
            const g = grades[t.id];
            const done = g !== undefined;
            return (
              <div key={t.id} onClick={() => setActiveTest(activeTest === t.id ? null : t.id)}
                style={{ padding:"4px 10px", borderRadius:20, cursor:"pointer", fontSize:"0.78rem", fontWeight:700,
                  border:`1px solid ${activeTest===t.id?"#0891b2":done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?"rgba(8,145,178,0.1)":done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?"#0891b2":done?gradeColor(g):C.muted }}>
                {t.icon} {t.label.split(" ")[0]} {t.label.split(" ")[1]||""} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {/* Test cards */}
      {SHOULDER_TESTS.map(t => {
        const isOpen = activeTest === t.id;
        const g = grades[t.id];
        const graded = g !== undefined;
        return (
          <div key={t.id} style={{ marginBottom:10, background:C.surface, borderRadius:14,
            border:`1.5px solid ${isOpen?"#0891b2":graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden", boxShadow:isOpen?"0 4px 16px rgba(8,145,178,0.1)":"0 1px 4px rgba(0,0,0,0.04)" }}>

            <div onClick={() => setActiveTest(isOpen ? null : t.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer",
                borderLeft:`4px solid ${graded?gradeColor(g):C.border}` }}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{t.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:"0.85rem", color:C.text }}>{t.label}</div>
                <div style={{ fontSize:"0.75rem", color:C.muted }}>{t.subtitle}</div>
              </div>
              {graded && (
                <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:800,
                  background:`${gradeColor(g)}15`, color:gradeColor(g), flexShrink:0 }}>
                  {["Normal","Compensated","Abnormal"][g]}
                </span>
              )}
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{ padding:"0 14px 14px" }}>

                {/* Visuals */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#0891b2", textTransform:"uppercase", letterSpacing:"0.5px" }}>📐 Visual Guide</div>
                  <button onClick={() => setShowVisual(v=>!v)} style={{ fontSize:"0.8rem", padding:"2px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer" }}>
                    {showVisual?"Hide":"Show"}
                  </button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Setup */}
                <div style={{ background:"#F0F9FF", borderRadius:9, padding:"9px 11px", marginBottom:12, border:"1px solid #BAE6FD" }}>
                  <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#0891b2", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>🎯 Setup & Procedure</div>
                  <div style={{ fontSize:"0.75rem", color:C.text, lineHeight:1.6 }}>{t.setup}</div>
                  <div style={{ marginTop:6, padding:"4px 8px", background:"rgba(8,145,178,0.08)", borderRadius:6, border:"1px solid rgba(8,145,178,0.2)" }}>
                    <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#0891b2" }}>Phase: {t.phase}</div>
                  </div>
                </div>

                {/* Observation checklist */}
                <div style={{ fontSize:"0.78rem", fontWeight:800, color:C.text, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
                  👁 What To Observe
                </div>
                {t.observations.map(obs => {
                  const val = findings[`${t.id}_${obs.id}`];
                  const clue = val !== undefined ? obs.clues[val] : null;
                  return (
                    <div key={obs.id} style={{ marginBottom:10 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.text, marginBottom:5 }}>{obs.q}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {obs.opts.map((opt, idx) => {
                          const sel = val === idx;
                          const col = opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":opt.startsWith("✗")?"#dc2626":C.muted;
                          return (
                            <div key={idx} onClick={() => setObs(t.id, obs.id, sel ? undefined : idx)}
                              style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`, background:sel?`${col}10`:C.s2, transition:"all 0.12s" }}>
                              <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${sel?col:C.border}`,
                                background:sel?col:"transparent", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {sel && <span style={{ fontSize:8, color:"#fff", fontWeight:900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize:"0.82rem", fontWeight:sel?700:400, color:sel?col:C.text, lineHeight:1.35 }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && (
                        <div style={{ marginTop:5, padding:"6px 10px", background:"rgba(8,145,178,0.06)", borderLeft:"3px solid #0891b2", borderRadius:"0 6px 6px 0", fontSize:"0.78rem", color:C.text, lineHeight:1.5 }}>
                          <strong>Clinical note:</strong> {clue}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Grade */}
                <div style={{ fontSize:"0.78rem", fontWeight:800, color:C.text, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6, marginTop:4 }}>
                  📊 Grade This Test
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
                  {t.grades.map((gLabel, idx) => {
                    const col = gradeColor(idx);
                    const sel = g === idx;
                    return (
                      <div key={idx} onClick={() => setGrade(t.id, sel ? undefined : idx)}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:9, cursor:"pointer",
                          border:`1.5px solid ${sel?col:C.border}`, background:sel?`${col}12`:C.s2 }}>
                        <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${sel?col:C.border}`,
                          background:sel?col:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {sel && <span style={{ fontSize:9, color:"#fff", fontWeight:900 }}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{ fontSize:"0.73rem", fontWeight:sel?700:400, color:sel?col:C.text }}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.muted, marginBottom:4 }}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Clinical observations, pattern findings, next assessment steps..."
                  style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
                    padding:"8px 10px", fontSize:"0.82rem", fontFamily:"inherit", resize:"vertical", minHeight:56, outline:"none" }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {completedCount > 0 && (
        <div style={{ background:"#F0F9FF", borderRadius:14, padding:14, border:"1px solid #BAE6FD", marginTop:4 }}>
          <div style={{ fontWeight:800, color:C.text, marginBottom:10 }}>📋 Shoulder Screen Summary</div>
          {SHOULDER_TESTS.filter(t => grades[t.id] !== undefined).map(t => {
            const g = grades[t.id];
            const col = gradeColor(g);
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:"1rem" }}>{t.icon}</span>
                <span style={{ flex:1, fontSize:"0.75rem", fontWeight:600, color:C.text }}>{t.label}</span>
                <span style={{ padding:"2px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:800, background:`${col}15`, color:col }}>
                  {["Normal","Compensated","Abnormal"][g]}
                </span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{ marginTop:10, padding:"8px 10px", background:"#FEF2F2", borderRadius:8, border:"1px solid #FECACA", fontSize:"0.8rem", color:"#dc2626", lineHeight:1.5 }}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: Hawkins-Kennedy, Neer impingement, Empty Can (supraspinatus), O'Brien's (SLAP), horizontal adduction (AC), posterior capsule stretch test, and CPA (Janda) for motor pattern.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HIP FUNCTIONAL SCREEN ────────────────────────────────────────────────────

const HIP_TESTS = [
  {
    id:"hfs_sls", icon:"🦵", label:"Single Leg Squat",
    subtitle:"Glute Med / Dynamic Valgus / Pelvic Control",
    phase:"Frontal Plane Stability — Primary Hip Screen",
    setup:"Patient stands on one leg, arms crossed. Slowly squat to ~60° knee flexion, return. × 5 each side. Observe from front and behind.",
    normalDesc:"Pelvis level or slight contralateral hike, knee tracks over 2nd toe, trunk upright, controlled throughout. No hip drop or valgus.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        <circle cx="55" cy="18" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="55" y1="25" x2="55" y2="55" stroke="#059669" strokeWidth="2.5"/>
        <line x1="42" y1="55" x2="68" y2="55" stroke="#059669" strokeWidth="3"/>
        <line x1="48" y1="55" x2="44" y2="80" stroke="#059669" strokeWidth="2.5"/>
        <line x1="44" y1="80" x2="44" y2="95" stroke="#059669" strokeWidth="2"/>
        <line x1="62" y1="55" x2="66" y2="74" stroke="#059669" strokeWidth="2.5"/>
        <line x1="66" y1="74" x2="60" y2="60" stroke="#059669" strokeWidth="2"/>
        <text x="14" y="58" fontSize="5.5" fill="#059669">Level ✓</text>
        <text x="14" y="96" fontSize="6" fill="#059669">Knee over toe · pelvis level</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">VALGUS COLLAPSE</text>
        <circle cx="58" cy="18" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="58" y1="25" x2="52" y2="55" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="38" y1="53" x2="64" y2="59" stroke="#dc2626" strokeWidth="3"/>
        <path d="M36,51 L30,58" stroke="#dc2626" strokeWidth="2" fill="none"/>
        <polygon points="28,57 30,62 34,58" fill="#dc2626"/>
        <text x="4" y="56" fontSize="5" fill="#dc2626">Drop</text>
        <line x1="46" y1="53" x2="54" y2="78" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="54" y1="78" x2="48" y2="95" stroke="#dc2626" strokeWidth="2"/>
        <path d="M54,70 L62,68" stroke="#f97316" strokeWidth="2" fill="none"/>
        <polygon points="62,66 66,68 62,70" fill="#f97316"/>
        <text x="68" y="71" fontSize="5" fill="#f97316">Valgus</text>
        <text x="4" y="100" fontSize="5.5" fill="#dc2626">Pelvic drop + knee valgus</text>
      </svg>
    ),
    observations:[
      { id:"pelvis", q:"Pelvic position during squat?",
        opts:["✓ Level or slight contralateral hike","⚠ Mild ipsilateral drop (<2cm)","✗ Clear Trendelenburg drop","✗ Pelvic rotation (trunk twist)"],
        clues:["","Minor glute med fatigue — compare sides and endurance","Glute med weakness stance side — confirm with hip abductor MMT at 0° and sidelying","Rotational instability — assess multifidus and oblique activation"] },
      { id:"knee",   q:"Knee tracking?",
        opts:["✓ Over 2nd toe throughout","⚠ Mild medial drift at depth","✗ Clear valgus from initiation","✗ Lateral thrust"],
        clues:["","Minor glute med weakness or foot pronation — monitor bilaterally","Dynamic valgus — priority rehab: glute med, glute max, VMO activation. Assess foot pronation","Lateral compartment OA or LCL laxity possible — do varus stress test"] },
      { id:"trunk",  q:"Trunk alignment?",
        opts:["✓ Upright midline","⚠ Ipsilateral trunk lean","✗ Clear compensated Trendelenburg lean","✗ Forward trunk collapse"],
        clues:["","Minor glute med compensation — common in early weakness","Classic Duchenne — trunk shifts ipsilateral to unload weak glute med","Hip flexor weakness or fear-avoidance — assess hip flexor MMT and pain behaviour"] },
      { id:"depth",  q:"Depth achieved?",
        opts:["✓ 60°+ knee flexion controlled","⚠ Limited depth (<45°)","✗ Collapses before depth"],
        clues:["","Hip flexor tightness, hip joint restriction or pain — FADIR screen","Pain-limited or strength-limited — determine which: if pain stops before strength fails = likely hip joint / labral"] },
      { id:"pain",   q:"Pain during single leg squat?",
        opts:["✓ No pain","⚠ Lateral hip / gluteal pain","⚠ Groin / anterior hip pain","✗ Knee medial pain"],
        clues:["","Greater trochanteric bursitis / glute med tendinopathy — do lateral hip palpation and Ober test","Hip joint pathology / labral tear — do FADIR, FABER, hip quadrant test","Medial knee overload secondary to valgus — screen PF joint + MCL"] },
    ],
    grades:["Normal — Level pelvis, knee tracking, controlled to depth","Compensated — Minor pelvic drop or mild valgus without pain","Abnormal — Trendelenburg, valgus collapse, pain, or cannot complete"],
  },
  {
    id:"hfs_hinge", icon:"⚽", label:"Hip Hinge Pattern",
    subtitle:"Posterior Chain Length + Glute Max Activation",
    phase:"Sagittal Hip Mobility / Posterior Chain",
    setup:"Standing, feet hip-width, slight knee bend. Patient hinges at hips pushing glutes back (deadlift start position). Spine neutral. Reach fingertips toward floor. Assess spinal position and depth. × 3.",
    normalDesc:"Spine neutral throughout, 70–90° hip flexion, hamstring stretch felt, glutes loaded, no lumbar flexion to achieve depth.",
    svgNormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        <circle cx="28" cy="16" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="28" y1="22" x2="28" y2="52" stroke="#059669" strokeWidth="2.5"/>
        <line x1="28" y1="52" x2="22" y2="78" stroke="#059669" strokeWidth="2"/>
        <line x1="28" y1="52" x2="34" y2="78" stroke="#059669" strokeWidth="2"/>
        <text x="14" y="92" fontSize="5.5" fill="#059669">Standing</text>
        <circle cx="82" cy="24" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="82" y1="30" x2="70" y2="54" stroke="#059669" strokeWidth="2.5"/>
        <path d="M70,54 Q66,52 64,48" stroke="#059669" strokeWidth="1.5" fill="none" strokeDasharray="2,2"/>
        <line x1="70" y1="54" x2="64" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="64" y1="76" x2="64" y2="94" stroke="#059669" strokeWidth="2"/>
        <line x1="70" y1="54" x2="80" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="80" y1="76" x2="80" y2="94" stroke="#059669" strokeWidth="2"/>
        <text x="88" y="42" fontSize="5.5" fill="#059669">Neutral</text>
        <text x="88" y="48" fontSize="5.5" fill="#059669">spine ✓</text>
        <path d="M82,30 Q88,38 88,44" stroke="#059669" strokeWidth="1" fill="none" strokeDasharray="2,2"/>
        <text x="50" y="100" fontSize="5.5" fill="#059669">Hip hinge</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 120 100" style={{width:"100%",maxWidth:120}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">LUMBAR DOMINANT</text>
        <circle cx="70" cy="24" r="6" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <path d="M70,30 Q62,44 58,54" stroke="#dc2626" strokeWidth="2.5" fill="none"/>
        <line x1="58" y1="54" x2="54" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="54" y1="76" x2="54" y2="94" stroke="#dc2626" strokeWidth="2"/>
        <line x1="58" y1="54" x2="68" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="68" y1="76" x2="68" y2="94" stroke="#dc2626" strokeWidth="2"/>
        <path d="M70,30 Q78,40 76,52" stroke="#f97316" strokeWidth="2" fill="none"/>
        <text x="78" y="44" fontSize="5.5" fill="#f97316">Lumbar</text>
        <text x="78" y="50" fontSize="5.5" fill="#f97316">flexes ✗</text>
        <path d="M44,44 L36,44" stroke="#dc2626" strokeWidth="2" fill="none"/>
        <polygon points="36,42 32,44 36,46" fill="#dc2626"/>
        <text x="4" y="44" fontSize="5" fill="#dc2626">Rounds</text>
        <text x="28" y="100" fontSize="5.5" fill="#dc2626">Lumbar rounds — hip inflexibility</text>
      </svg>
    ),
    observations:[
      { id:"spine",  q:"Lumbar spine position at depth?",
        opts:["✓ Neutral throughout","⚠ Slight loss of neutral at full depth","✗ Lumbar flexion throughout","✗ Hyper-extends lumbar (anterior tilt)"],
        clues:["","Minor hamstring or posterior chain restriction — monitor with flexibility work","Hamstring / posterior chain restriction forcing lumbar flexion substitution. Key disc loading pattern — clinical priority","Lumbar extensor dominance — posterior pelvic tilt mobility exercises needed. Screen for anterior hip tightness"] },
      { id:"depth",  q:"Hip flexion depth achieved?",
        opts:["✓ 70°+ (good posterior chain length)","⚠ 45–70° (mild restriction)","✗ <45° (significant restriction)"],
        clues:["","Moderate hamstring or hip capsule restriction — Thomas test + passive SLR","Significant posterior chain restriction — do SLR, Thomas test, hip joint quadrant test to differentiate hamstring vs capsule"] },
      { id:"shift",  q:"Weight distribution / lateral shift?",
        opts:["✓ Symmetric bilateral","⚠ Slight lateral shift","✗ Clear shift to one side"],
        clues:["","Monitor — possible hip asymmetry","Unilateral hip joint restriction or SIJ dysfunction — compare FABER/FADIR bilaterally"] },
      { id:"kb",     q:"Knee position throughout?",
        opts:["✓ Slight flex maintained","⚠ Knees straighten excessively","✗ Valgus during hinge"],
        clues:["","Hamstring dominant strategy — cueing needed for hip hinge","Dynamic valgus even in hinge position — significant glute med weakness. Priority in rehab"] },
      { id:"pain",   q:"Pain during hip hinge?",
        opts:["✓ No pain","⚠ Posterior thigh (hamstring)","⚠ Groin / anterior hip","✗ Lumbar pain"],
        clues:["","Hamstring tightness or proximal hamstring tendinopathy — palpate ischial tuberosity","Anterior hip impingement during flexion — FAI screen (FADIR), hip quadrant test","Lumbar loading — disc or facet sensitisation. Reduce range and assess centralisation"] },
    ],
    grades:["Normal — Neutral spine, 70°+ hip flexion, symmetric","Compensated — Slight loss of neutral at end range only","Abnormal — Lumbar dominant, <45° depth, pain, or lateral shift"],
  },
  {
    id:"hfs_ext", icon:"🏊", label:"Prone Hip Extension",
    subtitle:"Glute Max Firing Pattern + Lumbar Compensation",
    phase:"Posterior Chain Motor Control (Janda)",
    setup:"Patient prone. Hip neutral, knee straight. Slowly lift one leg off table ~10–15cm. Observe firing sequence: Glute max → Hamstring → Contralateral erector. Repeat × 3 each side. Therapist palpates glute max and hamstring.",
    normalDesc:"Glute max fires FIRST (palpable), then hamstring, then erector. Pelvis stays level. No lumbar rotation to initiate extension.",
    svgNormal:(
      <svg viewBox="0 0 130 100" style={{width:"100%",maxWidth:130}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL SEQUENCE</text>
        <rect x="8" y="52" width="115" height="6" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <text x="14" y="62" fontSize="5" fill="#6b7280">table</text>
        <circle cx="28" cy="38" r="6" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="28" y1="44" x2="68" y2="52" stroke="#059669" strokeWidth="2.5"/>
        <line x1="68" y1="52" x2="110" y2="50" stroke="#059669" strokeWidth="2.5"/>
        <line x1="110" y1="50" x2="120" y2="38" stroke="#059669" strokeWidth="2.5"/>
        <circle cx="76" cy="50" r="5" fill="#059669" opacity="0.2" stroke="#059669" strokeWidth="1.5"/>
        <text x="72" y="48" fontSize="5.5" fill="#059669" fontWeight="bold">1</text>
        <text x="64" y="44" fontSize="5" fill="#059669">Glute</text>
        <circle cx="96" cy="50" r="5" fill="#d97706" opacity="0.2" stroke="#d97706" strokeWidth="1.5"/>
        <text x="92" y="48" fontSize="5.5" fill="#d97706" fontWeight="bold">2</text>
        <text x="88" y="44" fontSize="5" fill="#d97706">Hamst</text>
        <text x="50" y="96" fontSize="6" fill="#059669">Glute(1) → Hamstring(2) → Erector(3)</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 130 100" style={{width:"100%",maxWidth:130}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">ABNORMAL — GLUTE INHIBITED</text>
        <rect x="8" y="52" width="115" height="6" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
        <circle cx="28" cy="38" r="6" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="28" y1="44" x2="68" y2="52" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="68" y1="52" x2="110" y2="48" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="110" y1="48" x2="120" y2="36" stroke="#dc2626" strokeWidth="2.5"/>
        <circle cx="76" cy="51" r="5" fill="#dc2626" opacity="0.2" stroke="#dc2626" strokeWidth="1.5"/>
        <text x="72" y="49" fontSize="5.5" fill="#dc2626" fontWeight="bold">✗</text>
        <text x="64" y="44" fontSize="5" fill="#dc2626">No glute</text>
        <circle cx="92" cy="50" r="5" fill="#f97316" opacity="0.2" stroke="#f97316" strokeWidth="1.5"/>
        <text x="88" y="48" fontSize="5.5" fill="#f97316" fontWeight="bold">1</text>
        <text x="84" y="44" fontSize="5" fill="#f97316">Hamst</text>
        <path d="M28,46 L28,55" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="2,2"/>
        <text x="4" y="76" fontSize="5.5" fill="#dc2626">Lumbar rotation to initiate</text>
        <text x="4" y="96" fontSize="5.5" fill="#dc2626">Hamstring dominant = Janda LCS</text>
      </svg>
    ),
    observations:[
      { id:"seq",    q:"Glute max firing sequence?",
        opts:["✓ Glute fires first (palpable)","⚠ Glute and hamstring fire simultaneously","✗ Hamstring fires first — glute delayed","✗ No palpable glute max contraction"],
        clues:["","Minor sequencing issue — monitor under load","Classic Janda Lower Crossed Syndrome pattern. Hamstring overactive, glute max inhibited. Priority: glute max activation (bridging, clamshell)","Significant glute max inhibition — likely pain inhibition or Janda LCS. Check for hip flexor tightness (Thomas test) and lumbar extension pain"] },
      { id:"lumbar", q:"Lumbar/pelvic movement to initiate?",
        opts:["✓ Pelvis stays level","⚠ Slight lumbar extension","✗ Clear lumbar rotation","✗ Anterior pelvic tilt / hyperlordosis"],
        clues:["","Minor — cue neutral spine","Substitution for glute max — reduce range until glute activates","Classic LCS compensation — assess hip flexor length. Tight iliopsoas anteriorly tilts pelvis, inhibits glute max"] },
      { id:"sym",    q:"Bilateral comparison?",
        opts:["✓ Symmetric sequence both sides","⚠ Minor asymmetry","✗ Clear unilateral glute inhibition","✗ Unable to complete one side due to pain"],
        clues:["","Monitor under loading","Unilateral glute inhibition — likely same-side hip flexor tightness or pain inhibition from SIJ/hip joint","Pain-inhibited — assess SIJ and hip joint before loading"] },
      { id:"strength",q:"Perceived glute contraction strength?",
        opts:["✓ Strong contraction felt","⚠ Mild contraction — fatigues quickly","✗ Very weak — barely palpable","✗ No contraction detected"],
        clues:["","Glute endurance deficit — progressive loading needed","Glute max grade 3–4/5 weakness — formal MMT and loading progression","Severe glute max weakness — screen L5/S1 myotome, piriformis, and SIJ"] },
      { id:"pain",   q:"Pain during prone extension?",
        opts:["✓ No pain","⚠ Posterior hip / SIJ","⚠ Anterior hip / groin","✗ Lumbar pain"],
        clues:["","SIJ provocation — do Gillet test, SIJ compression/distraction","Hip joint or anterior labrum — FADIR test","Facet joint or disc sensitisation — reduce range, assess prone instability"] },
    ],
    grades:["Normal — Glute first, level pelvis, strong contraction, symmetric","Compensated — Simultaneous or minor delay, no pain","Abnormal — Hamstring dominant, lumbar rotation, pain, or absent glute"],
  },
  {
    id:"hfs_rot", icon:"🔄", label:"Seated Hip Rotation",
    subtitle:"Hip IR/ER Range — FAI + Capsular Screen",
    phase:"Hip Joint Mobility / Capsular Pattern",
    setup:"Patient seated at edge of table, hip at 90°. Let foot swing medially (ER) then laterally (IR). Assess range. Normal IR 30–40°, ER 40–60°. Compare bilaterally.",
    normalDesc:"IR 30–40°, ER 40–60°. Equal bilateral. No end-range pain. Pain or restriction = capsular pattern or FAI.",
    svgNormal:(
      <svg viewBox="0 0 130 100" style={{width:"100%",maxWidth:130}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL RANGES</text>
        <circle cx="65" cy="28" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="65" y1="35" x2="65" y2="60" stroke="#059669" strokeWidth="2.5"/>
        <line x1="50" y1="60" x2="80" y2="60" stroke="#059669" strokeWidth="3"/>
        <line x1="65" y1="60" x2="65" y2="90" stroke="#059669" strokeWidth="2.5"/>
        <path d="M65,90 Q52,85 48,78" stroke="#059669" strokeWidth="2" fill="none"/>
        <path d="M65,90 Q78,85 82,78" stroke="#059669" strokeWidth="2" fill="none"/>
        <text x="24" y="80" fontSize="6" fill="#059669" fontWeight="bold">ER 45°</text>
        <text x="82" y="80" fontSize="6" fill="#059669" fontWeight="bold">IR 35°</text>
        <text x="55" y="95" fontSize="5.5" fill="#059669">Normal bilateral</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 130 100" style={{width:"100%",maxWidth:130}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">RESTRICTION PATTERNS</text>
        <circle cx="65" cy="26" r="7" fill="none" stroke="#6b7280" strokeWidth="2"/>
        <line x1="65" y1="33" x2="65" y2="55" stroke="#6b7280" strokeWidth="2.5"/>
        <line x1="50" y1="55" x2="80" y2="55" stroke="#6b7280" strokeWidth="3"/>
        <line x1="65" y1="55" x2="65" y2="82" stroke="#6b7280" strokeWidth="2.5"/>
        <path d="M65,82 Q56,78 54,72" stroke="#059669" strokeWidth="2" fill="none"/>
        <text x="28" y="74" fontSize="5.5" fill="#059669">ER ok</text>
        <path d="M65,82 Q68,76 68,70" stroke="#dc2626" strokeWidth="2.5" fill="none"/>
        <text x="70" y="72" fontSize="5.5" fill="#dc2626">IR ✗</text>
        <text x="4" y="90" fontSize="5" fill="#dc2626">IR loss = posterior capsule / FAI</text>
        <text x="4" y="100" fontSize="5" fill="#f97316">Bilateral IR loss = OA pattern</text>
      </svg>
    ),
    observations:[
      { id:"ir",     q:"Internal rotation range?",
        opts:["✓ 30–40° (normal)","⚠ 20–29° (mildly restricted)","✗ <20° (significant restriction)","✗ Painful before end range"],
        clues:["","Minor posterior capsule tightness or early FAI — FADIR test","Significant IR restriction: posterior capsule (GIRD equivalent at hip) or FAI. Screen FADIR, hip quadrant. Cam or pincer FAI most restricted in IR","Pain before end-range in IR = FAI or early hip OA — refer for imaging if bilateral"] },
      { id:"er",     q:"External rotation range?",
        opts:["✓ 40–60° (normal)","⚠ 30–39° (mildly restricted)","✗ <30° (significant restriction)","✗ Bilateral equal restriction"],
        clues:["","Minor anterior capsule tightness","Anterior capsule or iliopsoas tightness — do Thomas test + passive ER in supine","Bilateral equal restriction — capsular pattern of hip OA (most loss in IR/flex/abd then ER/ext). Refer for imaging if >50yo"] },
      { id:"sym",    q:"Side-to-side symmetry?",
        opts:["✓ Symmetric (within 10°)","⚠ 10–20° asymmetry","✗ >20° clear asymmetry","✗ Unilateral end-range pain"],
        clues:["","Monitor — may be positional or bony asymmetry","Unilateral restriction suggests joint, labral or capsular pathology on restricted side","Unilateral pain at end-range = labral, FAI or early OA — FADIR provocation test"] },
      { id:"pain",   q:"Pain provocation during rotation?",
        opts:["✓ No pain","⚠ Anterior groin pain at end IR","⚠ Posterior hip pain at end ER","✗ Pain and apprehension — instability"],
        clues:["","Classic FAI / labral impingement sign in IR — do FADIR (flexion, adduction, IR) test next","Posterior capsule or external rotator pain — piriformis / external rotator screen, FABER test","Posterior instability pattern — do posterior hip instability tests"] },
      { id:"oa",     q:"Quality of end-feel?",
        opts:["✓ Soft tissue / firm (normal)","⚠ Firm and early","✗ Hard (bony) end-feel","✗ Springy / empty end-feel"],
        clues:["","","Osteophyte or bony restriction — hip OA likely. Confirm with FABER range and X-ray correlation","Labral or intra-articular — log-roll test, hip quadrant (scouring) test"] },
    ],
    grades:["Normal — IR 30–40°, ER 40–60°, symmetric, pain-free","Compensated — Minor restriction without pain, within 10° bilaterally","Abnormal — Pain, >20° asymmetry, bony end-feel, or restricted bilateral"],
  },
  {
    id:"hfs_step", icon:"🪜", label:"Lateral Step Down",
    subtitle:"Eccentric Glute Med — Frontal Plane Deceleration",
    phase:"Hip Abductor Eccentric Control",
    setup:"Patient stands sideways on 20cm step, arms crossed. Slowly lower unsupported leg toward floor (eccentric control × 5). Observe pelvic stability, knee tracking. Both sides.",
    normalDesc:"Pelvis stays level or rises slightly on lowering side. Knee tracks over 2nd toe. Slow controlled descent. No trunk sway.",
    svgNormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#059669" fontWeight="bold">NORMAL</text>
        <rect x="20" y="76" width="70" height="14" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <text x="34" y="87" fontSize="5.5" fill="#6b7280">Step (20cm)</text>
        <circle cx="55" cy="20" r="7" fill="none" stroke="#059669" strokeWidth="2"/>
        <line x1="55" y1="27" x2="55" y2="57" stroke="#059669" strokeWidth="2.5"/>
        <line x1="40" y1="57" x2="70" y2="57" stroke="#059669" strokeWidth="3"/>
        <text x="14" y="60" fontSize="5.5" fill="#059669">Level ✓</text>
        <line x1="48" y1="57" x2="46" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="46" y1="76" x2="46" y2="90" stroke="#059669" strokeWidth="2"/>
        <line x1="62" y1="57" x2="64" y2="76" stroke="#059669" strokeWidth="2.5"/>
        <line x1="64" y1="76" x2="72" y2="90" stroke="#059669" strokeWidth="2"/>
        <text x="12" y="100" fontSize="5.5" fill="#059669">Controlled descent</text>
      </svg>
    ),
    svgAbnormal:(
      <svg viewBox="0 0 110 100" style={{width:"100%",maxWidth:110}}>
        <text x="4" y="10" fontSize="7" fill="#dc2626" fontWeight="bold">PELVIC DROP</text>
        <rect x="20" y="76" width="70" height="14" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
        <circle cx="58" cy="20" r="7" fill="none" stroke="#dc2626" strokeWidth="2"/>
        <line x1="58" y1="27" x2="52" y2="57" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="36" y1="54" x2="66" y2="62" stroke="#dc2626" strokeWidth="3"/>
        <path d="M34,56 L30,64" stroke="#dc2626" strokeWidth="2" fill="none"/>
        <polygon points="28,63 30,68 34,64" fill="#dc2626"/>
        <text x="4" y="60" fontSize="5" fill="#dc2626">Drop</text>
        <line x1="44" y1="54" x2="48" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="48" y1="76" x2="42" y2="90" stroke="#dc2626" strokeWidth="2"/>
        <line x1="62" y1="62" x2="68" y2="76" stroke="#dc2626" strokeWidth="2.5"/>
        <line x1="68" y1="76" x2="76" y2="90" stroke="#dc2626" strokeWidth="2"/>
        <path d="M48,68 L54,66" stroke="#f97316" strokeWidth="1.5" fill="none"/>
        <text x="56" y="68" fontSize="5" fill="#f97316">Valgus</text>
        <text x="4" y="100" fontSize="5.5" fill="#dc2626">Drop + valgus = glute med deficit</text>
      </svg>
    ),
    observations:[
      { id:"pelvis", q:"Pelvic control during descent?",
        opts:["✓ Level throughout descent","⚠ Mild drop at end range only","✗ Drop immediately on loading","✗ Trunk compensates (ipsilateral lean)"],
        clues:["","Glute med endurance deficit — eccentric strengthening","Significant glute med weakness — priority. Confirm with MMT sidelying hip abduction","Compensated Trendelenburg — trunk offloads hip abductor demand. More severe than apparent. Assess MMT with trunk stabilised"] },
      { id:"knee",   q:"Knee tracking on step leg?",
        opts:["✓ Over 2nd toe throughout","⚠ Mild medial drift","✗ Clear valgus collapse","✗ Lateral thrust"],
        clues:["","Minor glute med / VMO ratio — monitor","Dynamic valgus — foot pronation screen + hip abductor / external rotator MMT","Lateral compartment / LCL — do varus stress test"] },
      { id:"speed",  q:"Speed of descent control?",
        opts:["✓ Slow and controlled","⚠ Slightly fast but recovers","✗ Drops uncontrolled","✗ Cannot complete movement"],
        clues:["","Minor eccentric deficit","Significant eccentric weakness — nordic-type progression for glute med. Assess hip abductor MMT grade","Severe weakness — formal hip abductor + hip extensor MMT, neurological screen L5"] },
      { id:"sym",    q:"Side-to-side difference?",
        opts:["✓ Symmetric","⚠ Minor difference","✗ Clear asymmetry","✗ One side unable to control"],
        clues:["","Monitor","Unilateral deficit — hip pathology or SIJ dysfunction on weaker side","Significant unilateral weakness — screen for L5 myotome weakness, hip OA, or post-surgical inhibition"] },
      { id:"pain",   q:"Pain during lateral step down?",
        opts:["✓ No pain","⚠ Lateral hip pain","⚠ Groin / anterior hip","✗ Medial knee pain"],
        clues:["","Greater trochanteric bursitis or glute med tendinopathy — palpate GT, Ober test","Hip joint loading — FADIR, hip quadrant, labral screen","Medial knee overload from dynamic valgus — PF joint + MCL assessment"] },
    ],
    grades:["Normal — Level pelvis, knee tracking, controlled descent","Compensated — Minor drop at depth or mild valgus","Abnormal — Pelvic drop on loading, valgus collapse, pain, or cannot complete"],
  },
,
  // ── FMS: Deep Squat ───────────────────────────────────────────────────────
  {
    id:"fms_sq", icon:"🏋️", label:"Deep Squat (FMS)",
    subtitle:"Global Lower Chain · FMS Standard Test",
    phase:"Multi-Joint / Kinetic Chain Screen",
    setup:"Feet shoulder-width, toes out 5–10°. Hold dowel overhead, arms fully extended. Descend as deep as possible, heels flat. Observe from front AND side. Score: 3 = full depth no compensation. 2 = heel rise / arm drop / lean. 1 = unable to achieve depth even with heel lift. 0 = pain.",
    normalDesc:"Full depth — thighs parallel or below. Torso vertical/parallel to tibia. Knees track over 2nd toe. Dowel remains overhead. Heels flat throughout. No trunk lean or rotation.",
    observations:[
      { id:"depth", q:"Squat depth achieved?",
        opts:["✓ Full depth — thighs parallel or below","⚠ Partial — 3/4 depth only","✗ Cannot achieve parallel","✗ Pain reproduced on squat"],
        clues:["","Minor hip or ankle restriction — heel lift test to differentiate","Heel lift test: if depth improves with heels raised = ankle DF restriction. No change = hip flexor or thoracic extension. Address primary driver first","Score 0. Screen hip FAI (FADIR), knee OA, or lumbar disc load test before reloading"] },
      { id:"heel", q:"Heel contact throughout?",
        opts:["✓ Heels flat throughout","⚠ Mild heel rise at end range","✗ Both heels rise significantly","✗ Asymmetric heel rise (one side)"],
        clues:["","Minor gastroc/soleus restriction — wall lunge drill + calf stretching","Talocrural DF restriction — talocrural PA mobilisation Grade III–IV + gastroc SMR + wall lunge drill 3 min daily","Asymmetric — treat restricted side. Check unilateral ankle injury or talocrural joint restriction ipsilateral to heel rise"] },
      { id:"knee", q:"Knee tracking alignment?",
        opts:["✓ Tracks over 2nd toe bilateral","⚠ Mild valgus tendency","✗ Bilateral knee valgus (collapse)","✗ Unilateral knee valgus"],
        clues:["","Minor glute med weakness — band cue + clamshells","Glute med + ER weakness, adductor dominance. SMR adductors/TFL → activate glute med clamshell → lateral band walk → squat with band knee-out cue","Unilateral — asymmetric glute med inhibition. Often post-injury. Treat affected side: single-leg clamshell + single-leg glute bridge"] },
      { id:"trunk", q:"Trunk position in squat?",
        opts:["✓ Upright — parallel to tibia","⚠ Mild forward lean","✗ Significant trunk lean forward","✗ Lateral trunk shift"],
        clues:["","Minor ankle DF or hip flexor restriction — screen ankle first with heel lift test","Ankle DF, hip flexor, OR thoracic extension — identify primary driver. Goblet squat (counterbalance) helps reveal true driver","Lateral shift = unilateral hip restriction or lumbar disc (shifts away from pain). Screen hip IR + lumbar quadrant test"] },
      { id:"arm", q:"Overhead arm position?",
        opts:["✓ Arms fully extended overhead","⚠ Slight elbow bend at bottom","✗ Arms fall forward significantly","✗ Cannot maintain overhead at all"],
        clues:["","Minor thoracic restriction or lat tightness — foam roller + lat stretch","Thoracic + lat restriction → arms fall into flexion. Foam roller thoracic extension + lat SMR + overhead wall slide","Significant shoulder flexion / thoracic deficit — screen shoulder ROM and thoracic extension separately before squat loading"] },
    ],
    grades:["Normal (FMS 3) — Full depth, heels flat, knees tracking, dowel overhead","Compensated (FMS 2) — Minor compensation: heel rise, arm drop, or forward lean","Abnormal (FMS 0–1) — Cannot achieve depth or pain reproduced"],
  },
  // ── FMS: Hurdle Step ──────────────────────────────────────────────────────
  {
    id:"fms_hs", icon:"🏃", label:"Hurdle Step (FMS)",
    subtitle:"Single-Leg Stance Control · Hip Hinge Quality",
    phase:"Hip Stability / Single-Leg Control Screen",
    setup:"Patient stands on one leg on a step-box (set at tibial tuberosity height). Step opposite leg over hurdle — clear without touching — return to start. Observe from front and side. Score: 3 = controlled step, pelvis level, no trunk lean. 2 = contact hurdle / pelvis drop / arm movement. 1 = contact step or loss of balance. 0 = pain.",
    normalDesc:"Stance hip stays stable. Pelvis level throughout step. Trunk stays upright — no lateral lean. Step leg clears hurdle cleanly. Foot dorsiflexed during swing phase. Returns to start with control.",
    observations:[
      { id:"pelvis", q:"Pelvic level during stance?",
        opts:["✓ Pelvis level throughout","⚠ Minor pelvic drop (<2cm)","✗ Contralateral pelvis drops >2cm (Trendelenburg)","✗ Compensatory trunk lean over stance leg"],
        clues:["","Minor glute med weakness — clamshells, lateral band walk","Trendelenburg positive — glute med cannot support pelvis. Priority: CPA glute med (release TFL/QL → activate glute med → lateral band walk → single-leg stance)","Compensatory lurch = severe glute med weakness. Patient reduces hip abductor demand by leaning trunk. Same protocol as Trendelenburg — treat glute med urgently"] },
      { id:"trunk", q:"Trunk position during step?",
        opts:["✓ Upright trunk — no lateral lean","⚠ Mild lean with control","✗ Significant lateral trunk lean","✗ Forward trunk lean + loss of control"],
        clues:["","Minor hip strategy adjustment — proprioceptive training on balance board","Lateral trunk lean = glute med weakness (reduces moment arm). Treat with glute med activation before progressing to hurdle","Forward lean = hip flexor dominance or lack of hip extension control. Hip flexor stretching + glute max activation"] },
      { id:"arm", q:"Arm movement to compensate?",
        opts:["✓ Arms at sides — no movement","⚠ Minor arm swing for balance","✗ Arms move significantly to compensate","✗ Loses balance — touches hurdle or step"],
        clues:["","Minor balance deficit — proprioceptive training: single-leg stance, BOSU","Compensatory arm swing = lack of hip/ankle stability on stance leg. Multi-level deficit — screen ankle proprioception + hip stability together","Score 1 — significant proprioceptive deficit. Begin with supported single-leg stance, progress to unsupported, then dynamic"] },
      { id:"df", q:"Swing leg dorsiflexion / hip flexion?",
        opts:["✓ Foot dorsiflexed, hip fully flexes to clear","⚠ Foot drops / minor toe catch","✗ Foot drop pattern — cannot dorsiflex","✗ Insufficient hip flexion — compensates with trunk lean"],
        clues:["","Minor tibialis anterior weakness — dorsiflexion strengthening (resistance band)","Foot drop = tibialis anterior inhibition or L4/L5 nerve root. Neurological screen if acute onset. Ankle DF strengthening if chronic","Insufficient hip flexion — hip flexor weakness or hip mobility restriction. Screen Thomas test and psoas strength"] },
      { id:"sym", q:"Symmetry left vs right?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry — same pattern","✗ Clear asymmetry — one side worse","✗ Cannot complete one side at all"],
        clues:["","Monitor — minor side-to-side difference may be normal dominant/non-dominant","Asymmetry >1 score = significant. Side with score ≤ 2 when other side is 3 = increased injury risk. Treat weaker side first","Complete failure one side = acute inhibition. Screen for recent injury, pain inhibition, or neural involvement on that side"] },
    ],
    grades:["Normal (FMS 3) — Pelvis level, trunk upright, clean step, no compensation","Compensated (FMS 2) — Minor pelvic drop, arm movement, or hurdle contact","Abnormal (FMS 0–1) — Trendelenburg, loss of balance, or pain"],
  },
  // ── FMS: Inline Lunge ─────────────────────────────────────────────────────
  {
    id:"fms_il", icon:"🧎", label:"Inline Lunge (FMS)",
    subtitle:"Sagittal Plane Control · Frontal Stability",
    phase:"Hip-Knee-Ankle Sagittal Chain Screen",
    setup:"Patient stands heel-to-toe (stride stance) on a 2×6 board, holding dowel vertically behind spine (touching head, thoracic, and sacrum). Descend to touch back knee to board. Observe from front and side. Score: 3 = controlled descent, torso stays upright, knee touches board. 2 = trunk deviation, loss of balance, or dowel contact lost. 1 = loss of balance. 0 = pain.",
    normalDesc:"Torso upright and dowel maintains 3-point contact (head, thoracic, sacrum). Lead knee tracks over 2nd toe. Rear knee touches board without collapse. Pelvis level. No trunk rotation or lateral shift.",
    observations:[
      { id:"knee_track", q:"Lead knee tracking?",
        opts:["✓ Tracks over 2nd toe","⚠ Mild medial deviation","✗ Significant valgus — knee collapses in","✗ Lateral deviation (varus)"],
        clues:["","Minor VMO or glute med weakness — terminal knee extension + clamshells","Medial knee collapse = VMO + glute med insufficient. Band cue above knees during lunge + VMO TKE + glute med protocol","Lateral deviation = IT band/TFL overactivity. IT band SMR + TFL release + adductor activation"] },
      { id:"trunk", q:"Trunk upright / dowel contact?",
        opts:["✓ Dowel — 3-point contact maintained","⚠ Minor trunk forward lean","✗ Significant trunk lean — loses dowel contact","✗ Rotation or lateral trunk shift"],
        clues:["","Hip flexor restriction limiting upright torso — couch stretch + hip flexor activation","Significant hip flexor tightness or ankle DF restriction. Screen with Thomas test and DF lunge test","Rotation = hip mobility asymmetry or thoracic restriction. Assess hip IR/ER bilaterally and thoracic rotation"] },
      { id:"balance", q:"Overall balance / control during lunge?",
        opts:["✓ Controlled throughout","⚠ Wobbles but maintains position","✗ Significant balance loss — steps out","✗ Falls or loses position"],
        clues:["","Minor proprioceptive deficit — lunge with support progressing to unsupported","Significant balance deficit — begin split squat (stable position) with control before progressing to true inline lunge","Score 1 — major motor control deficit. Step-back lunge from stable position, emphasise slow eccentric before adding dynamic"] },
      { id:"pelvis", q:"Pelvic control during descent?",
        opts:["✓ Pelvis level and neutral","⚠ Minor anterior tilt","✗ Pelvic drop contralaterally","✗ Anterior pelvic tilt + lumbar extension compensation"],
        clues:["","Minor TA or gluteal weakness — TA drawing-in + glute bridge before lunge","Lateral pelvic drop during lunge = weak hip abductors on stance side. Trendelenburg equivalent","Anterior tilt + extension = hip flexor dominant, glute max inhibited. Release hip flexors → activate glute max → progress to lunge"] },
      { id:"sym", q:"Symmetry?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry","✗ Clear asymmetry one side worse","✗ Cannot complete one side"],
        clues:["","Monitor — minor asymmetry may relate to dominant leg","Asymmetry = treat weaker side. Common after unilateral lower limb injury. Single-leg work on affected side","Complete failure = pain inhibition or motor control deficit. Screen for pain on that side before continuing"] },
    ],
    grades:["Normal (FMS 3) — Upright trunk, knee tracking, controlled throughout","Compensated (FMS 2) — Minor deviation, lean, or balance wobble","Abnormal (FMS 0–1) — Loss of control, significant valgus, or pain"],
  },
  // ── FMS: Active Straight Leg Raise ────────────────────────────────────────
  {
    id:"fms_aslr", icon:"🦵", label:"Active Straight Leg Raise (FMS)",
    subtitle:"Hamstring / Hip Flexor Mobility · Core Stability",
    phase:"Posterior Chain / Core Stability Screen",
    setup:"Patient supine, legs extended. Place a dowel under the lumbar lordosis (maintains neutral). Patient raises one leg as high as possible, ankle dorsiflexed, knee straight. Observe where the malleolus of raised leg is relative to the opposite leg. Score: 3 = malleolus passes opposite ASIS. 2 = between knee and ASIS. 1 = at or below knee. 0 = pain or lumbar flatten.",
    normalDesc:"Active SLR to at least 70° (malleolus at or above opposite ASIS). Lumbar lordosis maintained on dowel. Opposite leg stays flat. No trunk rotation or hip hike. Ankle stays dorsiflexed.",
    observations:[
      { id:"height", q:"SLR height achieved?",
        opts:["✓ Malleolus passes opposite ASIS (≥70°)","⚠ Between knee and ASIS (50–70°)","✗ At or below knee level (<50°)","✗ Pain or lumbar flattening"],
        clues:["","Minor hamstring or posterior capsule restriction — hamstring stretching (supine + active)","Significant hamstring or gastroc restriction. Passive vs active SLR comparison: if passive > active = hamstring strength component. If equal = pure mobility","Lumbar flattening = core stability deficit — lumbar cannot maintain neutral during hip flexion. TA + multifidus activation before SLR loading"] },
      { id:"opp_leg", q:"Opposite leg stays flat?",
        opts:["✓ Stays flat and still","⚠ Minor hip flexion drift","✗ Opposite hip flexes clearly","✗ Pelvis rotates / arches up"],
        clues:["","Minor hip flexor overactivity on opposite side — monitor","Opposite hip flexion = hip flexor dominant strategy. Psoas overactivity lifting the non-tested leg. Cueing + hip flexor release contralateral","Pelvic rotation = lumbar instability. Core stability training priority — TA/multifidus before SLR progression"] },
      { id:"knee", q:"Knee stays straight during raise?",
        opts:["✓ Knee fully extended throughout","⚠ Minor knee bend at end range","✗ Knee bends significantly to achieve height","✗ Knee bends throughout — hamstring so tight cannot extend"],
        clues:["","Minor hamstring tightness — active hamstring stretching at limit of range","Knee bends to achieve height = hamstring tight, substituting with hip flexion. True hamstring ROM must be measured with knee extended","Cannot extend = severe hamstring tightness. Passive stretching first, progress to active. Neural tension screen (slump + ULNT1) if reproduces radicular symptoms"] },
      { id:"pelvis", q:"Pelvis / lumbar stability?",
        opts:["✓ Neutral spine maintained","⚠ Minor posterior tilt","✗ Lumbar flattens on dowel","✗ Pelvic hike / rotation"],
        clues:["","Minor control deficit — TA cueing during SLR","Core stability deficit — TA, multifidus, and deep hip flexors must stabilise lumbar before hamstring stretching is effective","Significant — begin SLR with supported knee (partial range) maintaining neutral. Progress gradually"] },
      { id:"sym", q:"Symmetry L vs R?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry (<10°)","✗ Clear asymmetry (≥10°)","✗ Cannot perform one side"],
        clues:["","Normal — minor dominant limb difference acceptable","Asymmetry ≥10° = treat restricted side. Common after hamstring strain history. Screen for neural tension if unilateral restriction","Cannot perform = pain inhibition or neural tension. Slump test + SLR passive test before treating as mobility deficit"] },
    ],
    grades:["Normal (FMS 3) — Malleolus passes ASIS, neutral spine maintained","Compensated (FMS 2) — Malleolus between knee and ASIS, minor compensation","Abnormal (FMS 0–1) — Below knee, lumbar instability, or pain"],
  }
];

function HipFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["hfs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades)   setGrades(p.grades);
        if (p.notes)    setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f, g, n) => set("hfs_data", JSON.stringify({ findings: f, grades: g, notes: n }));
  const setObs = (tid, oid, val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid, val) => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote = (tid, val) => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = HIP_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":g===2?"#dc2626":C.muted;

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,rgba(217,70,239,0.08),rgba(124,58,237,0.05))", border:"1px solid rgba(217,70,239,0.22)", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:"1.4rem" }}>🦷</span>
          <div>
            <div style={{ fontWeight:800, fontSize:"0.95rem", color:C.text }}>Hip Functional Screen</div>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>5 tests · Glute med/max · FAI screen · Motor control · Student guide</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:"1.2rem", fontWeight:900, color:"#d946ef" }}>{completedCount}/5</div>
            <div style={{ fontSize:"0.78rem", color:C.muted }}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {HIP_TESTS.map(t => {
            const g = grades[t.id]; const done = g !== undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{ padding:"4px 10px", borderRadius:20, cursor:"pointer", fontSize:"0.78rem", fontWeight:700,
                  border:`1px solid ${activeTest===t.id?"#d946ef":done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?"rgba(217,70,239,0.1)":done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?"#d946ef":done?gradeColor(g):C.muted }}>
                {t.icon} {t.label.split(" ").slice(0,2).join(" ")} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {HIP_TESTS.map(t => {
        const isOpen = activeTest===t.id; const g = grades[t.id]; const graded = g !== undefined;
        return (
          <div key={t.id} style={{ marginBottom:10, background:C.surface, borderRadius:14,
            border:`1.5px solid ${isOpen?"#d946ef":graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden", boxShadow:isOpen?"0 4px 16px rgba(217,70,239,0.08)":"0 1px 4px rgba(0,0,0,0.04)" }}>

            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer", borderLeft:`4px solid ${graded?gradeColor(g):C.border}` }}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{t.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:"0.85rem", color:C.text }}>{t.label}</div>
                <div style={{ fontSize:"0.75rem", color:C.muted }}>{t.subtitle}</div>
              </div>
              {graded && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:800, background:`${gradeColor(g)}15`, color:gradeColor(g), flexShrink:0 }}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{ padding:"0 14px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#d946ef", textTransform:"uppercase", letterSpacing:"0.5px" }}>📐 Visual Guide</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{ fontSize:"0.8rem", padding:"2px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer" }}>{showVisual?"Hide":"Show"}</button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ background:"#FDF4FF", borderRadius:9, padding:"9px 11px", marginBottom:12, border:"1px solid #E9D5FF" }}>
                  <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#d946ef", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>🎯 Setup & Procedure</div>
                  <div style={{ fontSize:"0.75rem", color:C.text, lineHeight:1.6 }}>{t.setup}</div>
                  <div style={{ marginTop:6, padding:"4px 8px", background:"rgba(217,70,239,0.08)", borderRadius:6, border:"1px solid rgba(217,70,239,0.2)" }}>
                    <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#d946ef" }}>Phase: {t.phase}</div>
                  </div>
                </div>

                <div style={{ fontSize:"0.78rem", fontWeight:800, color:C.text, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>👁 What To Observe</div>
                {t.observations.map(obs => {
                  const val = findings[`${t.id}_${obs.id}`]; const clue = val !== undefined ? obs.clues[val] : null;
                  return (
                    <div key={obs.id} style={{ marginBottom:10 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.text, marginBottom:5 }}>{obs.q}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {obs.opts.map((opt, idx) => {
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":opt.startsWith("✗")?"#dc2626":C.muted;
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`, background:sel?`${col}10`:C.s2, transition:"all 0.12s" }}>
                              <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${sel?col:C.border}`, background:sel?col:"transparent", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                {sel && <span style={{ fontSize:8, color:"#fff", fontWeight:900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize:"0.82rem", fontWeight:sel?700:400, color:sel?col:C.text, lineHeight:1.35 }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{ marginTop:5, padding:"6px 10px", background:"rgba(217,70,239,0.06)", borderLeft:"3px solid #d946ef", borderRadius:"0 6px 6px 0", fontSize:"0.78rem", color:C.text, lineHeight:1.5 }}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}

                <div style={{ fontSize:"0.78rem", fontWeight:800, color:C.text, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6, marginTop:4 }}>📊 Grade This Test</div>
                <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
                  {t.grades.map((gLabel, idx) => {
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:9, cursor:"pointer", border:`1.5px solid ${sel?col:C.border}`, background:sel?`${col}12`:C.s2 }}>
                        <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${sel?col:C.border}`, background:sel?col:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {sel && <span style={{ fontSize:9, color:"#fff", fontWeight:900 }}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{ fontSize:"0.73rem", fontWeight:sel?700:400, color:sel?col:C.text }}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.muted, marginBottom:4 }}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Clinical observations, motor pattern notes, next steps..."
                  style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"8px 10px", fontSize:"0.82rem", fontFamily:"inherit", resize:"vertical", minHeight:56, outline:"none" }}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{ background:"#FDF4FF", borderRadius:14, padding:14, border:"1px solid #E9D5FF", marginTop:4 }}>
          <div style={{ fontWeight:800, color:C.text, marginBottom:10 }}>📋 Hip Screen Summary</div>
          {HIP_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:"1rem" }}>{t.icon}</span>
                <span style={{ flex:1, fontSize:"0.75rem", fontWeight:600, color:C.text }}>{t.label}</span>
                <span style={{ padding:"2px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:800, background:`${col}15`, color:col }}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{ marginTop:10, padding:"8px 10px", background:"#FEF2F2", borderRadius:8, border:"1px solid #FECACA", fontSize:"0.8rem", color:"#dc2626", lineHeight:1.5 }}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: FADIR, FABER, hip quadrant (scouring), Thomas test, hip abductor MMT, L5/S1 myotome testing, and Janda Lower Crossed Syndrome assessment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KNEE FUNCTIONAL SCREEN ───────────────────────────────────────────────────

const KNEE_TESTS = [
  {
    id:"kfs_squat", icon:"🦿", label:"Double Leg Squat",
    subtitle:"Patellofemoral Loading + Bilateral Valgus Screen",
    phase:"PF Joint / Basic Knee Mechanics",
    setup:"Feet shoulder-width, toes slightly out. Arms crossed or overhead. Squat to chair height (thighs parallel) × 5. Observe knee tracking from front and side.",
    normalDesc:"Knees track over 2nd toe throughout. No valgus. Even bilateral weight distribution. Smooth patellar glide. No anterior knee pain in the arc 30–60°.",
    observations:[
      { id:"valgus", q:"Knee valgus during descent?",
        opts:["✓ Both track over 2nd toe","⚠ Mild bilateral valgus at depth","✗ Clear valgus from initiation","✗ One-sided valgus only"],
        clues:["","Minor glute med / VMO imbalance — monitor with single-leg squat","Dynamic valgus — glute med, glute max, VMO activation priority. Check foot pronation","Unilateral — asymmetric hip abductor weakness or foot pathology. Compare single-leg squat"] },
      { id:"pain",   q:"Pain location during squat?",
        opts:["✓ Pain-free","⚠ Anterior knee (PF joint)","⚠ Medial knee","⚠ Lateral knee (IT band)","✗ Posterior knee"],
        clues:["","PF joint compression — worse 30–60° arc. Do patellar tilt/glide test, VMO assessment","Medial compartment / MCL — valgus overload. If OA age — weight-bearing X-ray","IT band syndrome — lateral retinaculum tightness. Do Ober test, Noble compression test","Posterior joint — possible PCL, posterior capsule or popliteus pathology"] },
      { id:"depth",  q:"Depth before symptoms / restriction?",
        opts:["✓ Full depth pain-free","⚠ Stops at 60° — PF arc","✗ Stops at 30° — early loading pain","✗ Cannot squat at all"],
        clues:["","PF joint sensitisation at classic compression angle. VMO strengthening + patellar mobilisation","Acute PF or OA sensitivity — reduce load, pool therapy","Significant restriction — screen for effusion (ballottement test), joint space narrowing"] },
      { id:"heel",   q:"Heel contact maintained?",
        opts:["✓ Heels flat throughout","⚠ Slight heel rise","✗ Heels lift — forces trunk forward"],
        clues:["","Ankle dorsiflexion restriction — knee-to-wall test. Tibialis anterior + gastrocnemius","Significant DF restriction — may need heel raise orthotic and ankle joint mobilisation"] },
      { id:"sym",    q:"Weight bearing symmetry?",
        opts:["✓ Equal bilateral","⚠ Mild asymmetry","✗ Clearly unilateral load","✗ Cannot weight bear equally"],
        clues:["","Monitor — possible pain avoidance","Unilateral offloading — pain-inhibited quadriceps. Do quad MMT and effusion screen","Significant asymmetry — post-surgical, ACL, or severe OA pattern"] },
    ],
    grades:["Normal — Bilateral tracking, pain-free to depth, symmetric","Compensated — Mild valgus or minor PF discomfort at depth","Abnormal — Pain arc, clear valgus, asymmetric loading"],
  },
  {
    id:"kfs_lunge", icon:"🏃", label:"Forward Lunge",
    subtitle:"PF Joint + IT Band + Terminal Extension",
    phase:"Anterior Compartment / Sagittal Knee Load",
    setup:"Standing. Step forward into lunge — trail knee approaches (not touching) floor. Front shin near vertical, trunk upright. Return. × 5 each leg. Observe from front and side.",
    normalDesc:"Shin vertical or slight forward lean. Knee stays over foot. Trunk upright. No lateral hip shift. Pain-free through full range. Knee straightens cleanly on return.",
    observations:[
      { id:"shin",   q:"Shin angle (tibial inclination)?",
        opts:["✓ Vertical or slight lean (<10°)","⚠ Excessive forward lean (>15°)","✗ Knee past toes by >5cm"],
        clues:["","Minor — cue upright shin. Patellar tendon loading increases with forward lean","Significant patellar tendon loading — screen for Osgood-Schlatter (adolescent) or patellar tendinopathy (VISA-P)"] },
      { id:"pain",   q:"Pain on forward lunge?",
        opts:["✓ No pain","⚠ Anterior knee at bottom","⚠ Lateral knee (especially step through)","✗ Medial joint line"],
        clues:["","PF joint compression at lunge depth — patellar taping trial, VMO activation","IT band / lateral retinaculum — worse as knee passes 30° in mid-lunge. Noble compression test","Medial compartment — meniscal or MCL. McMurray and Apley screen"] },
      { id:"trunk",  q:"Trunk alignment during lunge?",
        opts:["✓ Upright or neutral lean","⚠ Forward trunk collapse","✗ Lateral trunk lean","✗ Trunk rotation"],
        clues:["","Hip flexor or quad weakness — step length may need reducing","Contralateral hip abductor weakness or ipsilateral hip joint restriction — single-leg squat comparison","Rotational instability — assess thoracolumbar rotation and hip ER activation"] },
      { id:"ext",    q:"Full knee extension achieved on return?",
        opts:["✓ Full extension smooth","⚠ Slight lag at last 5–10°","✗ Clear extension lag (>10°)","✗ Pain at full extension"],
        clues:["","VMO endurance deficit","Extension lag — VMO weakness (inner range). Terminal extension exercise in sitting + standing","Significant lag — screen for quad weakness, effusion, or post-operative inhibition. MMT in inner range"] },
      { id:"lateral",q:"Lateral hip shift during lunge?",
        opts:["✓ Pelvis stays level","⚠ Mild ipsilateral shift","✗ Clear lateral shift"],
        clues:["","Minor contralateral glute med weakness — compare SLS test","Significant hip abductor weakness driving knee valgus indirectly — glute med / hip ER strengthening before knee loading"] },
    ],
    grades:["Normal — Upright trunk, pain-free, full extension on return","Compensated — Forward shin or mild discomfort without restriction","Abnormal — Pain arc, extension lag, lateral shift, or trunk collapse"],
  },
  {
    id:"kfs_step",  icon:"🪜", label:"Lateral Step Down",
    subtitle:"Eccentric VMO + PF Tracking + Valgus Control",
    phase:"Eccentric Quad / PF Compression at Speed",
    setup:"20cm step, sideways. Arms crossed. Lower unsupported leg toward floor slowly (3 sec count) × 5. Observe knee tracking and patellar position from front. Both legs.",
    normalDesc:"Knee tracks over 2nd toe throughout descent. Patella stays central (no medial or lateral glide). Controlled 3-second descent. No anterior knee pain.",
    observations:[
      { id:"track",  q:"Patellar tracking during descent?",
        opts:["✓ Patella tracks centrally","⚠ Slight medial glide (VMO weak)","✗ Clear medial glide — VMO dominant","✗ Lateral glide — tight lateral retinaculum"],
        clues:["","Minor VMO underactivation — inner-range quad exercises in terminal extension","VMO underactivation / lateral retinaculum tightness. Patellar taping (McConnell medial glide) + VMO isolation in inner range","Lateral retinaculum tightness — patellar lateral glide assessment, lateral retinaculum stretching, patellar mobilisation"] },
      { id:"valgus", q:"Knee valgus on loading?",
        opts:["✓ Tracks over 2nd toe","⚠ Mild medial drift","✗ Clear valgus collapse on step","✗ Rapid uncontrolled collapse"],
        clues:["","Minor glute med fatigue — compare bilaterally","Dynamic valgus on loading — priority: glute med + hip ER + VMO co-contraction","Severe — functional instability. ACL screen (pivot shift, Lachman). Rule out significant structural deficit"] },
      { id:"pain",   q:"Anterior knee pain during descent?",
        opts:["✓ No pain","⚠ Dull ache — PF joint","✗ Sharp pain — PF or patellar tendon","✗ Pain worse on 2nd–5th rep (loading fatigue)"],
        clues:["","PF joint sensitisation — patellar taping trial, VMO loading","PF or patellar tendon — patellar tilt test, Noble compression, VISA-P score","Reactive tendinopathy pattern — reduce repetitions, monitor load response"] },
      { id:"speed",  q:"Eccentric control quality?",
        opts:["✓ Smooth 3-second control","⚠ Slight speed variation","✗ Cannot slow descent — drops","✗ Immediately painful — cannot attempt"],
        clues:["","Minor eccentric deficit — progressive slow-descent training","Significant eccentric weakness — quad MMT grade 3–4. Nordic hamstring equivalent for quad needed","Pain-limited — establish pain-free range first. Pool therapy, isometrics"] },
      { id:"sym",    q:"Side-to-side difference?",
        opts:["✓ Symmetric","⚠ Minor asymmetry","✗ Clear marked difference","✗ One side unable"],
        clues:["","","Unilateral — prior injury, post-surgical inhibition, or structural asymmetry","Priority — formal quad MMT + neurological screen. Consider post-surgical atrophy"] },
    ],
    grades:["Normal — Central tracking, controlled descent, pain-free, symmetric","Compensated — Mild valgus or PF ache without significant restriction","Abnormal — Lateral/medial patellar glide, pain, valgus collapse, or asymmetric"],
  },
  {
    id:"kfs_hop",   icon:"💨", label:"Single Leg Hop & Stick",
    subtitle:"Dynamic Valgus + Landing Mechanics + ACL Risk",
    phase:"Neuromuscular Control / ACL Load Screen",
    setup:"Single leg. Patient hops forward ~30cm and lands on same leg, holds 3 seconds. × 3 each side. Observe knee, hip and trunk on landing. (Caution: skip if acute knee pathology.)",
    normalDesc:"Soft landing, knee slight flex, tracks over toe. Trunk upright. Pelvis level. Holds stable 3s. No excessive valgus or trunk collapse. Equal bilateral distance.",
    observations:[
      { id:"valgus", q:"Knee position on landing?",
        opts:["✓ Tracks over 2nd toe — stable","⚠ Brief valgus that self-corrects","✗ Clear valgus collapse on landing","✗ Severe — knee caves with trunk shift"],
        clues:["","Minor — neuromuscular timing — single-leg landing drills","Dynamic valgus — highest ACL risk factor in females. Glute med/max + VMO + hip ER activation. Landing technique training","Significant valgus risk pattern — neuromuscular ACL prevention programme (PEP, FIFA 11+). Do not progress loading until corrected"] },
      { id:"stable", q:"Landing stability (hold 3s)?",
        opts:["✓ Holds stable 3 seconds","⚠ Wobbles but stabilises","✗ Cannot hold — hops or takes extra step","✗ Falls or nearly falls"],
        clues:["","Minor proprioceptive deficit — balance progressions (wobble board, single leg tandem)","Significant instability — screen for effusion (ballottement), ACL laxity (Lachman), meniscal pathology","Significant deficit — formal ligamentous and meniscal screen before progression"] },
      { id:"sym",    q:"Hop distance symmetry (Limb Symmetry Index)?",
        opts:["✓ >90% symmetric (LSI normal)","⚠ 80–90% difference","✗ <80% asymmetry (LSI abnormal)","✗ Cannot hop one side"],
        clues:["","","LSI <90% = return-to-sport criterion not met post-ACL. Requires further quad/hamstring strength and neuromuscular work","Major deficit — post-injury or surgery inhibition. Formal quad/hamstring strength testing before hop testing"] },
      { id:"trunk",  q:"Trunk position on landing?",
        opts:["✓ Upright or neutral","⚠ Forward trunk lean","✗ Ipsilateral trunk lean","✗ Trunk rotation"],
        clues:["","Quad-dominant landing — hip flexion / trunk forward lean increases PF load. Cue hip hinge landing","Trunk shift to unload weak hip abductor — glute med priority. Links to dynamic valgus","Rotational instability — rotational control exercises pre-sport return"] },
      { id:"sound",  q:"Landing sound quality?",
        opts:["✓ Soft, quiet landing","⚠ Moderate impact sound","✗ Heavy / loud landing"],
        clues:["","Minor — cue soft landing technique","Stiff landing — quad-dominant deceleration. Knee flexion on landing too small. Teach hip hinge landing: land on hip-knee-ankle simultaneously"] },
    ],
    grades:["Normal — Stable landing, >90% LSI, knee tracking, quiet soft impact","Compensated — Minor valgus correcting or 80–90% LSI","Abnormal — Valgus collapse, <80% LSI, unable to hold, or loud stiff landing"],
  },
  {
    id:"kfs_tke",   icon:"🔲", label:"Wall Slide (PF Tracking)",
    subtitle:"Patellofemoral Contact at 30 / 60 / 90°",
    phase:"PF Joint Mechanics / Pain Arc Screen",
    setup:"Patient back against smooth wall. Slide down to 30°, hold 5s. Then 60°, hold 5s. Then 90°, hold 5s. Note pain onset angle. Observe patellar position and VMO contraction at each angle.",
    normalDesc:"Pain-free at all angles 30–90°. VMO visible contraction. Patella stays central. PF contact area progressively increases toward 90° with no pain.",
    observations:[
      { id:"arc30",  q:"Pain at 30° hold?",
        opts:["✓ Pain-free at 30°","⚠ Mild discomfort at 30°","✗ Clear pain at 30° — early PF sensitisation"],
        clues:["","Minor PF irritation — offload with VMO activation in open chain first","Significant early-arc PF pain — reduce load. Patellar taping trial. McConnell medial glide taping"],  },
      { id:"arc60",  q:"Pain at 60° hold?",
        opts:["✓ Pain-free at 60°","⚠ Mild discomfort at 60°","✗ Clear pain at 60° — classic PF arc"],
        clues:["","Classic PF sensitisation range — patellar taping + VMO isolation below 60°","Classic PF compression arc — do patellar tilt/glide, J-sign, VMO MMT inner range"] },
      { id:"arc90",  q:"Pain at 90° hold?",
        opts:["✓ Pain-free at 90°","⚠ Mild ache at 90° only","✗ Clear pain at 90°"],
        clues:["","Greater PF contact area loading — minor sensitisation, avoid sustained 90° holds initially","Deep PF compression pathology — trochlear groove, plica, or patellar baja. Imaging may be needed"] },
      { id:"vmo",    q:"VMO contraction visible / palpable?",
        opts:["✓ VMO visible at all angles","⚠ VMO only at 30°","✗ VMO absent — no contraction","✗ VMO fires late (after 60°)"],
        clues:["","Minor VMO inhibition","Significant VMO inhibition — isolated terminal extension exercise, biofeedback, NMES if available","VMO fires late — patellar instability risk. VMO timing training at inner range before loading"] },
      { id:"jsign",  q:"Patellar J-sign on descent?",
        opts:["✓ Smooth central tracking","⚠ Slight lateral deviation at terminal extension","✗ J-sign positive — lateral jump at ~30°"],
        clues:["","Minor lateral retinaculum tension","J-sign = lateral retinaculum dominance over VMO at terminal extension. Patellar mobility assessment + lateral retinaculum stretching + VMO inner range isolation"] },
    ],
    grades:["Normal — Pain-free 30–90°, VMO visible, central patellar tracking","Compensated — Mild ache at 60–90° or VMO only at shallow angles","Abnormal — Pain arc at any angle, VMO absent, or J-sign positive"],
  },
,
  // ── FMS: Deep Squat ───────────────────────────────────────────────────────
  {
    id:"fms_sq", icon:"🏋️", label:"Deep Squat (FMS)",
    subtitle:"Global Lower Chain · FMS Standard Test",
    phase:"Multi-Joint / Kinetic Chain Screen",
    setup:"Feet shoulder-width, toes out 5–10°. Hold dowel overhead, arms fully extended. Descend as deep as possible, heels flat. Observe from front AND side. Score: 3 = full depth no compensation. 2 = heel rise / arm drop / lean. 1 = unable to achieve depth even with heel lift. 0 = pain.",
    normalDesc:"Full depth — thighs parallel or below. Torso vertical/parallel to tibia. Knees track over 2nd toe. Dowel remains overhead. Heels flat throughout. No trunk lean or rotation.",
    observations:[
      { id:"depth", q:"Squat depth achieved?",
        opts:["✓ Full depth — thighs parallel or below","⚠ Partial — 3/4 depth only","✗ Cannot achieve parallel","✗ Pain reproduced on squat"],
        clues:["","Minor hip or ankle restriction — heel lift test to differentiate","Heel lift test: if depth improves with heels raised = ankle DF restriction. No change = hip flexor or thoracic extension. Address primary driver first","Score 0. Screen hip FAI (FADIR), knee OA, or lumbar disc load test before reloading"] },
      { id:"heel", q:"Heel contact throughout?",
        opts:["✓ Heels flat throughout","⚠ Mild heel rise at end range","✗ Both heels rise significantly","✗ Asymmetric heel rise (one side)"],
        clues:["","Minor gastroc/soleus restriction — wall lunge drill + calf stretching","Talocrural DF restriction — talocrural PA mobilisation Grade III–IV + gastroc SMR + wall lunge drill 3 min daily","Asymmetric — treat restricted side. Check unilateral ankle injury or talocrural joint restriction ipsilateral to heel rise"] },
      { id:"knee", q:"Knee tracking alignment?",
        opts:["✓ Tracks over 2nd toe bilateral","⚠ Mild valgus tendency","✗ Bilateral knee valgus (collapse)","✗ Unilateral knee valgus"],
        clues:["","Minor glute med weakness — band cue + clamshells","Glute med + ER weakness, adductor dominance. SMR adductors/TFL → activate glute med clamshell → lateral band walk → squat with band knee-out cue","Unilateral — asymmetric glute med inhibition. Often post-injury. Treat affected side: single-leg clamshell + single-leg glute bridge"] },
      { id:"trunk", q:"Trunk position in squat?",
        opts:["✓ Upright — parallel to tibia","⚠ Mild forward lean","✗ Significant trunk lean forward","✗ Lateral trunk shift"],
        clues:["","Minor ankle DF or hip flexor restriction — screen ankle first with heel lift test","Ankle DF, hip flexor, OR thoracic extension — identify primary driver. Goblet squat (counterbalance) helps reveal true driver","Lateral shift = unilateral hip restriction or lumbar disc (shifts away from pain). Screen hip IR + lumbar quadrant test"] },
      { id:"arm", q:"Overhead arm position?",
        opts:["✓ Arms fully extended overhead","⚠ Slight elbow bend at bottom","✗ Arms fall forward significantly","✗ Cannot maintain overhead at all"],
        clues:["","Minor thoracic restriction or lat tightness — foam roller + lat stretch","Thoracic + lat restriction → arms fall into flexion. Foam roller thoracic extension + lat SMR + overhead wall slide","Significant shoulder flexion / thoracic deficit — screen shoulder ROM and thoracic extension separately before squat loading"] },
    ],
    grades:["Normal (FMS 3) — Full depth, heels flat, knees tracking, dowel overhead","Compensated (FMS 2) — Minor compensation: heel rise, arm drop, or forward lean","Abnormal (FMS 0–1) — Cannot achieve depth or pain reproduced"],
  },
  // ── FMS: Hurdle Step ──────────────────────────────────────────────────────
  {
    id:"fms_hs", icon:"🏃", label:"Hurdle Step (FMS)",
    subtitle:"Single-Leg Stance Control · Hip Hinge Quality",
    phase:"Hip Stability / Single-Leg Control Screen",
    setup:"Patient stands on one leg on a step-box (set at tibial tuberosity height). Step opposite leg over hurdle — clear without touching — return to start. Observe from front and side. Score: 3 = controlled step, pelvis level, no trunk lean. 2 = contact hurdle / pelvis drop / arm movement. 1 = contact step or loss of balance. 0 = pain.",
    normalDesc:"Stance hip stays stable. Pelvis level throughout step. Trunk stays upright — no lateral lean. Step leg clears hurdle cleanly. Foot dorsiflexed during swing phase. Returns to start with control.",
    observations:[
      { id:"pelvis", q:"Pelvic level during stance?",
        opts:["✓ Pelvis level throughout","⚠ Minor pelvic drop (<2cm)","✗ Contralateral pelvis drops >2cm (Trendelenburg)","✗ Compensatory trunk lean over stance leg"],
        clues:["","Minor glute med weakness — clamshells, lateral band walk","Trendelenburg positive — glute med cannot support pelvis. Priority: CPA glute med (release TFL/QL → activate glute med → lateral band walk → single-leg stance)","Compensatory lurch = severe glute med weakness. Patient reduces hip abductor demand by leaning trunk. Same protocol as Trendelenburg — treat glute med urgently"] },
      { id:"trunk", q:"Trunk position during step?",
        opts:["✓ Upright trunk — no lateral lean","⚠ Mild lean with control","✗ Significant lateral trunk lean","✗ Forward trunk lean + loss of control"],
        clues:["","Minor hip strategy adjustment — proprioceptive training on balance board","Lateral trunk lean = glute med weakness (reduces moment arm). Treat with glute med activation before progressing to hurdle","Forward lean = hip flexor dominance or lack of hip extension control. Hip flexor stretching + glute max activation"] },
      { id:"arm", q:"Arm movement to compensate?",
        opts:["✓ Arms at sides — no movement","⚠ Minor arm swing for balance","✗ Arms move significantly to compensate","✗ Loses balance — touches hurdle or step"],
        clues:["","Minor balance deficit — proprioceptive training: single-leg stance, BOSU","Compensatory arm swing = lack of hip/ankle stability on stance leg. Multi-level deficit — screen ankle proprioception + hip stability together","Score 1 — significant proprioceptive deficit. Begin with supported single-leg stance, progress to unsupported, then dynamic"] },
      { id:"df", q:"Swing leg dorsiflexion / hip flexion?",
        opts:["✓ Foot dorsiflexed, hip fully flexes to clear","⚠ Foot drops / minor toe catch","✗ Foot drop pattern — cannot dorsiflex","✗ Insufficient hip flexion — compensates with trunk lean"],
        clues:["","Minor tibialis anterior weakness — dorsiflexion strengthening (resistance band)","Foot drop = tibialis anterior inhibition or L4/L5 nerve root. Neurological screen if acute onset. Ankle DF strengthening if chronic","Insufficient hip flexion — hip flexor weakness or hip mobility restriction. Screen Thomas test and psoas strength"] },
      { id:"sym", q:"Symmetry left vs right?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry — same pattern","✗ Clear asymmetry — one side worse","✗ Cannot complete one side at all"],
        clues:["","Monitor — minor side-to-side difference may be normal dominant/non-dominant","Asymmetry >1 score = significant. Side with score ≤ 2 when other side is 3 = increased injury risk. Treat weaker side first","Complete failure one side = acute inhibition. Screen for recent injury, pain inhibition, or neural involvement on that side"] },
    ],
    grades:["Normal (FMS 3) — Pelvis level, trunk upright, clean step, no compensation","Compensated (FMS 2) — Minor pelvic drop, arm movement, or hurdle contact","Abnormal (FMS 0–1) — Trendelenburg, loss of balance, or pain"],
  },
  // ── FMS: Inline Lunge ─────────────────────────────────────────────────────
  {
    id:"fms_il", icon:"🧎", label:"Inline Lunge (FMS)",
    subtitle:"Sagittal Plane Control · Frontal Stability",
    phase:"Hip-Knee-Ankle Sagittal Chain Screen",
    setup:"Patient stands heel-to-toe (stride stance) on a 2×6 board, holding dowel vertically behind spine (touching head, thoracic, and sacrum). Descend to touch back knee to board. Observe from front and side. Score: 3 = controlled descent, torso stays upright, knee touches board. 2 = trunk deviation, loss of balance, or dowel contact lost. 1 = loss of balance. 0 = pain.",
    normalDesc:"Torso upright and dowel maintains 3-point contact (head, thoracic, sacrum). Lead knee tracks over 2nd toe. Rear knee touches board without collapse. Pelvis level. No trunk rotation or lateral shift.",
    observations:[
      { id:"knee_track", q:"Lead knee tracking?",
        opts:["✓ Tracks over 2nd toe","⚠ Mild medial deviation","✗ Significant valgus — knee collapses in","✗ Lateral deviation (varus)"],
        clues:["","Minor VMO or glute med weakness — terminal knee extension + clamshells","Medial knee collapse = VMO + glute med insufficient. Band cue above knees during lunge + VMO TKE + glute med protocol","Lateral deviation = IT band/TFL overactivity. IT band SMR + TFL release + adductor activation"] },
      { id:"trunk", q:"Trunk upright / dowel contact?",
        opts:["✓ Dowel — 3-point contact maintained","⚠ Minor trunk forward lean","✗ Significant trunk lean — loses dowel contact","✗ Rotation or lateral trunk shift"],
        clues:["","Hip flexor restriction limiting upright torso — couch stretch + hip flexor activation","Significant hip flexor tightness or ankle DF restriction. Screen with Thomas test and DF lunge test","Rotation = hip mobility asymmetry or thoracic restriction. Assess hip IR/ER bilaterally and thoracic rotation"] },
      { id:"balance", q:"Overall balance / control during lunge?",
        opts:["✓ Controlled throughout","⚠ Wobbles but maintains position","✗ Significant balance loss — steps out","✗ Falls or loses position"],
        clues:["","Minor proprioceptive deficit — lunge with support progressing to unsupported","Significant balance deficit — begin split squat (stable position) with control before progressing to true inline lunge","Score 1 — major motor control deficit. Step-back lunge from stable position, emphasise slow eccentric before adding dynamic"] },
      { id:"pelvis", q:"Pelvic control during descent?",
        opts:["✓ Pelvis level and neutral","⚠ Minor anterior tilt","✗ Pelvic drop contralaterally","✗ Anterior pelvic tilt + lumbar extension compensation"],
        clues:["","Minor TA or gluteal weakness — TA drawing-in + glute bridge before lunge","Lateral pelvic drop during lunge = weak hip abductors on stance side. Trendelenburg equivalent","Anterior tilt + extension = hip flexor dominant, glute max inhibited. Release hip flexors → activate glute max → progress to lunge"] },
      { id:"sym", q:"Symmetry?",
        opts:["✓ Symmetric bilateral","⚠ Mild asymmetry","✗ Clear asymmetry one side worse","✗ Cannot complete one side"],
        clues:["","Monitor — minor asymmetry may relate to dominant leg","Asymmetry = treat weaker side. Common after unilateral lower limb injury. Single-leg work on affected side","Complete failure = pain inhibition or motor control deficit. Screen for pain on that side before continuing"] },
    ],
    grades:["Normal (FMS 3) — Upright trunk, knee tracking, controlled throughout","Compensated (FMS 2) — Minor deviation, lean, or balance wobble","Abnormal (FMS 0–1) — Loss of control, significant valgus, or pain"],
  }
];

function KneeFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["kfs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades)   setGrades(p.grades);
        if (p.notes)    setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f,g,n) => set("kfs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = KNEE_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(234,179,8,0.08),rgba(245,158,11,0.05))",border:"1px solid rgba(234,179,8,0.25)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🦿</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Knee Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · PF tracking · VMO · Dynamic valgus · ACL risk · Student guide</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:"#d97706"}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {KNEE_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?"#d97706":done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?"rgba(234,179,8,0.1)":done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?"#d97706":done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ").slice(0,2).join(" ")} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {KNEE_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?"#d97706":graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(234,179,8,0.1)":"0 1px 4px rgba(0,0,0,0.04)"}}>

            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{background:"#FFFBEB",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #FDE68A"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:"rgba(234,179,8,0.08)",borderRadius:6,border:"1px solid rgba(234,179,8,0.25)"}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:"#d97706"}}>Phase: {t.phase}</div>
                  </div>
                </div>

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:"rgba(234,179,8,0.07)",borderLeft:"3px solid #d97706",borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Pain arc, patellar tracking, clinical reasoning..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#FFFBEB",borderRadius:14,padding:14,border:"1px solid #FDE68A",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Knee Screen Summary</div>
          {KNEE_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{marginTop:10,padding:"8px 10px",background:"#FEF2F2",borderRadius:8,border:"1px solid #FECACA",fontSize:"0.8rem",color:"#dc2626",lineHeight:1.5}}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: patellar tilt/glide test, J-sign, McMurray meniscal test, Lachman / anterior drawer (ACL), valgus/varus stress (MCL/LCL), Noble compression (IT band), ballottement (effusion), and VISA-P (tendinopathy).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ANKLE / FOOT FUNCTIONAL SCREEN ──────────────────────────────────────────

const ANKLE_TESTS = [
  {
    id:"afs_hr", icon:"👟", label:"Single Leg Heel Raise",
    subtitle:"Calf Endurance + Tibialis Posterior + Achilles Load",
    phase:"Plantarflexor Endurance / Posterior Chain",
    setup:"Patient stands single leg, hands lightly touching wall for balance only. Rise onto toes fully, lower controlled. Count maximum reps with full range. Normal: 25 reps same height both sides. Observe: height achieved, range symmetry, heel inversion at top.",
    normalDesc:"25+ reps per side, symmetric height, heel inverts at top of each raise (tibialis posterior function), controlled eccentric descent each rep, no lateral ankle wobble.",
    observations:[
      { id:"reps",   q:"Reps achieved before form breaks?",
        opts:["✓ 25+ reps full height","⚠ 15–24 reps (mild deficit)","✗ <15 reps (significant deficit)","✗ Cannot perform — pain or too weak"],
        clues:["","Minor calf endurance deficit — progressive loading. Monitor bilaterally","Significant soleus/gastroc endurance deficit — key rehab target. Achilles tendinopathy screen (VISA-A), calf raise programme","Severe weakness — screen for Achilles rupture (Thompson test), tibialis posterior rupture, or neurological deficit (S1 myotome)"] },
      { id:"height", q:"Height of rise — heel above floor?",
        opts:["✓ Full height, consistent","⚠ Reduces progressively (fatigue)","✗ Never achieves full height","✗ Asymmetric — one side lower"],
        clues:["","Calf endurance deficit — eccentric loading programme (Alfredson for Achilles)","Structural restriction or severe weakness — assess passive plantarflexion range + Thompson test","Unilateral height deficit — calf atrophy post-injury, Achilles pathology, or tibialis posterior insufficiency on low side"] },
      { id:"invert", q:"Heel inversion at top of raise?",
        opts:["✓ Heel inverts at top (tibialis post. ✓)","⚠ Heel stays neutral — no inversion","✗ Heel everts at top — tibialis posterior failure"],
        clues:["","Minor tibialis posterior fatigue — single leg heel raise with inversion cueing","Classic tibialis posterior dysfunction — too-many-toes sign, navicular drop test, PTTD screen. Medial arch support consideration"] },
      { id:"wobble", q:"Lateral ankle stability during raises?",
        opts:["✓ Stable throughout","⚠ Mild wobble at fatigue","✗ Wobbles from start (proprioceptive deficit)","✗ Gives way — instability"],
        clues:["","Minor proprioceptive fatigue — balance board progression","Chronic ankle instability likely — do anterior drawer and talar tilt test. CAIT questionnaire","Functional instability — ATFL/CFL laxity. Lateral ligament stress testing + balance board rehab"] },
      { id:"sym",    q:"Side-to-side symmetry?",
        opts:["✓ Symmetric (within 3 reps)","⚠ 3–6 rep difference","✗ >6 reps asymmetry","✗ One side unable to attempt"],
        clues:["","Monitor — may be post-activity asymmetry","Significant asymmetry — screen for unilateral Achilles tendinopathy, calf tear, or S1 radiculopathy","Priority assessment — exclude S1 myotome weakness, Achilles rupture (Thompson), tibialis posterior rupture"] },
    ],
    grades:["Normal — 25+ reps, full height, heel inverts, symmetric","Compensated — 15–24 reps or height reduces with fatigue","Abnormal — <15 reps, no inversion, instability, or significant asymmetry"],
  },
  {
    id:"afs_df", icon:"📐", label:"Weight-Bearing Dorsiflexion (Knee-to-Wall)",
    subtitle:"Ankle DF Restriction — Impingement + CAI Screen",
    phase:"Talocrural Mobility / Posterior Capsule",
    setup:"Patient in lunge position facing wall. Big toe 10cm from wall. Keep heel flat. Push knee toward wall over big toe. Measure finger-widths from wall to knee tip. Normal ≥10cm (or knee touches wall at 10cm). Compare bilaterally.",
    normalDesc:"Knee touches wall at 10cm or beyond. Heel stays flat. No pinching at front of ankle. No pain. Side-to-side within 1cm.",
    observations:[
      { id:"reach",  q:"Knee-to-wall distance achieved with heel flat?",
        opts:["✓ ≥10cm (normal dorsiflexion)","⚠ 7–9cm (mild restriction)","✗ <7cm (significant restriction)","✗ Heel rises before wall reached"],
        clues:["","Minor ankle DF restriction — ankle joint mobilisation (Maitland AP talar glide), gastrocnemius stretching","Significant DF restriction — likely posterior talar capsule restriction or bony block. Do talus AP glide joint mobilisation. Assess squat, lunge, heel rise compensations","Gastrocnemius tightness forcing heel rise. Differentiate: if restriction improves with knee bent = gastrocnemius dominant. If unchanged = capsular/bony"] },
      { id:"pinch",  q:"Anterior ankle pinching at end range?",
        opts:["✓ No anterior pain","⚠ Mild anterior pinching","✗ Clear anterior impingement pain","✗ Clicking + pinching"],
        clues:["","Monitor — minor anterior capsule irritation","Anterior ankle impingement — footballer's ankle (osteophyte). AP talar glide + distraction mobilisation. Imaging if chronic","Osteophyte likely — refer for X-ray. Manual distraction traction may give temporary relief"] },
      { id:"heel",   q:"Heel contact maintained?",
        opts:["✓ Heel flat throughout","⚠ Slight heel rise at end range","✗ Heel rises early — before wall"],
        clues:["","Minor tightness — calf stretching + ankle mobilisation","Gastrocnemius dominant restriction — isolated gastroc stretch (knee straight). If still limited at 10cm with knee bent — talocrural joint restriction"] },
      { id:"arch",   q:"Medial arch during DF test?",
        opts:["✓ Arch maintained","⚠ Arch drops slightly","✗ Arch collapses — pronation compensation"],
        clues:["","Minor midfoot hypermobility","Pronation compensation for DF restriction — foot pronates to gain tibial advancement. True DF deficit is greater than apparent. Orthotics + DF mobility treatment"] },
      { id:"sym",    q:"Side-to-side difference?",
        opts:["✓ Within 1cm","⚠ 1–2cm difference","✗ >2cm difference"],
        clues:["","Monitor — minor asymmetry","Significant DF asymmetry — post-injury capsule restriction or growth plate history (adolescent). AP talar glide mobilisation priority on restricted side"] },
    ],
    grades:["Normal — ≥10cm, heel flat, no pinching, symmetric","Compensated — 7–9cm or arch drops without pain","Abnormal — <7cm, anterior impingement, heel rise, or >2cm asymmetry"],
  },
  {
    id:"afs_bal", icon:"🧍", label:"Single Leg Balance",
    subtitle:"Proprioception + Chronic Ankle Instability Screen",
    phase:"Ankle Proprioception / Lateral Stability",
    setup:"Eyes open: stand single leg 30 seconds. Eyes closed: stand single leg 10 seconds. Both legs. Observe: sway strategy, ankle wobble, hip/trunk compensation. SEBT (Star Excursion Balance Test) if available.",
    normalDesc:"Eyes open: 30s stable, minimal sway. Eyes closed: 10s with only minor ankle strategy correction. No major hip or trunk compensation. Equal bilateral.",
    observations:[
      { id:"eo",     q:"Eyes open stability (30 seconds)?",
        opts:["✓ Stable 30s — minimal sway","⚠ Sways but maintains — ankle strategy","✗ Hip strategy dominant — pelvis moves","✗ Cannot complete 30s"],
        clues:["","Minor proprioceptive fatigue — balance progressions (unstable surfaces)","Hip strategy = proximal compensation for distal instability. Ankle proprioception deficit — ATFL/CFL involvement likely. CAIT score","Significant proprioceptive deficit — screen for previous ankle sprains, ATFL laxity, peroneal nerve involvement"] },
      { id:"ec",     q:"Eyes closed stability (10 seconds)?",
        opts:["✓ 10s with minor corrections","⚠ 5–9s with significant corrections","✗ <5 seconds — fails","✗ Cannot attempt eyes closed"],
        clues:["","Minor vestibular or proprioceptive fatigue — single-leg eyes-closed balance progression","Significant proprioceptive deficit — likely chronic ankle instability or prior ligament injury. Wobble board + dynamic balance training","Significant deficit — screen for vestibular/cerebellar contribution if bilateral. ATFL grading + wobble board"] },
      { id:"cai",    q:"History of ankle sprains + current wobble?",
        opts:["✓ No prior sprains — stable","⚠ Prior sprains — still stable","✗ Prior sprains + instability pattern","✗ Frequent giving way on level ground"],
        clues:["","Resolved sprain — monitor with progressive loading","Subclinical CAI — CAIT questionnaire. Peroneal activation timing training","Chronic ankle instability — ATFL/CFL grading. Conservative: peroneal strengthening + proprioception. Surgical if grade III laxity + failed conservative"] },
      { id:"strat",  q:"Primary balance strategy used?",
        opts:["✓ Ankle strategy (foot/ankle small corrections)","⚠ Knee strategy","✗ Hip strategy (trunk sways)","✗ Steps / hops to recover"],
        clues:["","Normal","Early proprioceptive deficit — progress ankle instability rehab","Proximal compensation for distal instability — ankle proprioception is impaired. Check ATFL drawer test","Significant instability — consider bracing for sport, peroneal strength MMT, lateral ligament stress testing"] },
      { id:"sym",    q:"Bilateral symmetry?",
        opts:["✓ Symmetric both sides","⚠ Minor difference","✗ Clear asymmetry","✗ Unilateral failure"],
        clues:["","","Unilateral deficit — chronic ankle instability or prior fracture/sprain on affected side","Significant unilateral deficit — ATFL anterior drawer, talar tilt, peroneal MMT, Ottawa ankle rules if acute"] },
    ],
    grades:["Normal — 30s eyes open stable, 10s eyes closed, ankle strategy","Compensated — Hip strategy or 5–9s eyes closed with prior sprains","Abnormal — <5s eyes closed, giving way, or significant asymmetry"],
  },
  {
    id:"afs_hop", icon:"🦘", label:"Single Leg Hop Series",
    subtitle:"Dynamic Ankle Stability + Achilles Load + Limb Symmetry",
    phase:"Plyometric Load / Return to Sport Criteria",
    setup:"Mark start line. Single leg hop forward (× 3 consecutive hops), side hop (× 5 lateral), and hop & stick (land and hold 3s). Measure distance on 3-hop. Compare LSI. Observe landing quality each hop.",
    normalDesc:"3-hop LSI >90% of opposite leg. Quiet soft landings. Ankle stable — no excessive inversion. Controlled stick landing. No pain during or after.",
    observations:[
      { id:"lsi",    q:"3-hop distance LSI (% of opposite leg)?",
        opts:["✓ >90% LSI (return-to-sport criterion)","⚠ 80–90% LSI","✗ <80% LSI (significant deficit)","✗ Unable to complete hops due to pain"],
        clues:["","","LSI <90% = return-to-sport criterion not met. Continue loading programme — plyometric progression, calf power work","Pain-limited — Achilles tendinopathy VISA-A screen, plantar fascia palpation, stress fracture screen (hop pain)"] },
      { id:"land",   q:"Landing quality on each hop?",
        opts:["✓ Soft, controlled landings","⚠ Hard/loud landings","✗ Inverts on landing — ankle gives","✗ Cannot land single leg — hops to other leg"],
        clues:["","Stiff landing — ankle and knee flexion on landing too small. Landing mechanics coaching — soft heel-toe pattern","Inversion on landing = peroneal reaction time deficit + ATFL laxity. Key rehab: peroneal activation, lateral band exercises, perturbation training","Significant instability — ATFL anterior drawer + talar tilt. Consider ankle bracing for plyometric progression"] },
      { id:"pain",   q:"Pain provocation during hopping?",
        opts:["✓ Pain-free throughout","⚠ Posterior heel pain (Achilles)","⚠ Plantar heel pain (fascia)","✗ Lateral ankle pain (ligament)","✗ Anterior ankle (impingement)"],
        clues:["","Achilles reactive tendinopathy — reduce load, assess VISA-A, Royal London Hospital test, Simmond's palpation","Plantar fasciitis — windlass mechanism test, calcaneal palpation, first step pain pattern","ATFL/CFL loading — lateral ligament stress testing, peroneal assessment","Anterior impingement — AP talar glide deficit. Osteophyte screen if chronic"] },
      { id:"side",   q:"Side hop stability (5 lateral hops)?",
        opts:["✓ Controlled throughout","⚠ Progressive wobble on last 2–3","✗ Inversion wobble on each hop","✗ Cannot complete lateral hop"],
        clues:["","Minor peroneal fatigue — lateral resistance band work","Peroneal reaction time deficit — key CAI indicator. Peroneal eccentric strengthening + perturbation training","Significant lateral instability — ATFL/CFL grading required. Bracing + peroneal programme before lateral sport return"] },
      { id:"sym",    q:"Overall hop series symmetry?",
        opts:["✓ Symmetric — feels equal","⚠ Minor avoidance on injured side","✗ Clear asymmetry in distance or control","✗ Significant avoidance — psychological barrier"],
        clues:["","","Kinesiophobia component possible — TAMPA scale. Physical loading programme + graded exposure","Kinesiophobia likely contributing — combine physical rehab with graded return to confidence. ACL-equivalent psychological readiness criteria for ankle return-to-sport"] },
    ],
    grades:["Normal — LSI >90%, soft landings, pain-free, symmetric","Compensated — LSI 80–90% or landing stiffness without pain","Abnormal — LSI <80%, pain on hop, inversion, or significant avoidance"],
  },
  {
    id:"afs_arch", icon:"👣", label:"Dynamic Arch / Navicular Drop",
    subtitle:"Tibialis Posterior Function + Foot Pronation Screen",
    phase:"Medial Arch Control / Tibialis Posterior Insufficiency",
    setup:"Seated: mark navicular tuberosity height from floor. Stand bilateral. Mark again. Navicular drop = seated minus standing height. Normal <10mm. Then observe arch in single leg squat and heel raise. Assess too-many-toes sign from behind.",
    normalDesc:"Navicular drop <10mm. Medial arch visible in bilateral stance. Arch maintains in single leg. Heel inverts in heel raise. 1–2 toes visible from behind (neutral rearfoot).",
    observations:[
      { id:"drop",   q:"Navicular drop measurement?",
        opts:["✓ <10mm (normal)","⚠ 10–15mm (mild hyperpronation)","✗ >15mm (significant drop)","✗ Unable to palpate — severe flat foot"],
        clues:["","Monitor — borderline. Assess tibialis posterior strength and footwear","Significant hyperpronation — tibialis posterior strengthening (heel raise with inversion), arch support assessment. Kinetic chain effect on knee and hip","Severe PTTD or flat foot — tibialis posterior MMT, too-many-toes sign, single leg heel raise inversion test. Orthotic referral"] },
      { id:"tmt",    q:"Too-many-toes sign (from behind)?",
        opts:["✓ 1–2 toes visible (normal)","⚠ 3 toes visible (mild abduction)","✗ 4–5 toes visible (forefoot abduction)","✗ Unable to assess"],
        clues:["","","Mild tibialis posterior insufficiency — pes plano valgus. Heel raise inversion test priority","Classic too-many-toes sign — significant tibialis posterior dysfunction or rupture. Grade single leg heel raise — if cannot invert = PTTD grade 2+. Refer for ultrasound"] },
      { id:"slsq",   q:"Arch in single leg squat?",
        opts:["✓ Arch maintained","⚠ Arch drops but recovers","✗ Arch collapses under load","✗ Foot fully pronates — arch absent"],
        clues:["","Minor dynamic hyperpronation — tibialis posterior + peroneus longus activation exercises","Dynamic pronation under load — increases medial knee stress (valgus), tibial torsion. Orthotic + tibialis posterior eccentric training","Severe dynamic flat foot — full kinetic chain assessment. Medial post orthotic, tibialis posterior strengthening"] },
      { id:"rear",   q:"Rearfoot position in bilateral stance?",
        opts:["✓ Neutral (slight valgus 0–4°)","⚠ Mild valgus (5–8°)","✗ Significant valgus (>8°)","✗ Varus — supinated foot type"],
        clues:["","Normal or borderline — monitor under dynamic loading","Rearfoot valgus — pronated foot type. Arch support + tibialis posterior strengthening. Upstream effects on knee and hip","Rearfoot varus — supinated / cavus foot type. High arch, poor shock absorption, lateral ankle instability risk. Lateral wedge + peroneal strengthening"] },
      { id:"pain",   q:"Medial arch or heel pain?",
        opts:["✓ No pain","⚠ Medial arch ache under load","⚠ Medial heel / navicular pain","✗ First step plantar heel pain (morning)"],
        clues:["","Tibialis posterior stress or plantar fascia tension — tibialis posterior strengthening + intrinsic foot exercises","Tibialis posterior tendinopathy / stress on navicular — Spring ligament screen, navicular palpation, ultrasound if persistent","Plantar fasciitis — windlass test, calcaneal tuberosity palpation, first step pain + morning stiffness pattern"] },
    ],
    grades:["Normal — Navicular drop <10mm, arch maintained, neutral rearfoot","Compensated — 10–15mm drop or arch drops under single-leg load","Abnormal — >15mm, too-many-toes sign, arch collapse, or pain"],
  },
,
  // ── FMS: Deep Squat ───────────────────────────────────────────────────────
  {
    id:"fms_sq", icon:"🏋️", label:"Deep Squat (FMS)",
    subtitle:"Global Lower Chain · FMS Standard Test",
    phase:"Multi-Joint / Kinetic Chain Screen",
    setup:"Feet shoulder-width, toes out 5–10°. Hold dowel overhead, arms fully extended. Descend as deep as possible, heels flat. Observe from front AND side. Score: 3 = full depth no compensation. 2 = heel rise / arm drop / lean. 1 = unable to achieve depth even with heel lift. 0 = pain.",
    normalDesc:"Full depth — thighs parallel or below. Torso vertical/parallel to tibia. Knees track over 2nd toe. Dowel remains overhead. Heels flat throughout. No trunk lean or rotation.",
    observations:[
      { id:"depth", q:"Squat depth achieved?",
        opts:["✓ Full depth — thighs parallel or below","⚠ Partial — 3/4 depth only","✗ Cannot achieve parallel","✗ Pain reproduced on squat"],
        clues:["","Minor hip or ankle restriction — heel lift test to differentiate","Heel lift test: if depth improves with heels raised = ankle DF restriction. No change = hip flexor or thoracic extension. Address primary driver first","Score 0. Screen hip FAI (FADIR), knee OA, or lumbar disc load test before reloading"] },
      { id:"heel", q:"Heel contact throughout?",
        opts:["✓ Heels flat throughout","⚠ Mild heel rise at end range","✗ Both heels rise significantly","✗ Asymmetric heel rise (one side)"],
        clues:["","Minor gastroc/soleus restriction — wall lunge drill + calf stretching","Talocrural DF restriction — talocrural PA mobilisation Grade III–IV + gastroc SMR + wall lunge drill 3 min daily","Asymmetric — treat restricted side. Check unilateral ankle injury or talocrural joint restriction ipsilateral to heel rise"] },
      { id:"knee", q:"Knee tracking alignment?",
        opts:["✓ Tracks over 2nd toe bilateral","⚠ Mild valgus tendency","✗ Bilateral knee valgus (collapse)","✗ Unilateral knee valgus"],
        clues:["","Minor glute med weakness — band cue + clamshells","Glute med + ER weakness, adductor dominance. SMR adductors/TFL → activate glute med clamshell → lateral band walk → squat with band knee-out cue","Unilateral — asymmetric glute med inhibition. Often post-injury. Treat affected side: single-leg clamshell + single-leg glute bridge"] },
      { id:"trunk", q:"Trunk position in squat?",
        opts:["✓ Upright — parallel to tibia","⚠ Mild forward lean","✗ Significant trunk lean forward","✗ Lateral trunk shift"],
        clues:["","Minor ankle DF or hip flexor restriction — screen ankle first with heel lift test","Ankle DF, hip flexor, OR thoracic extension — identify primary driver. Goblet squat (counterbalance) helps reveal true driver","Lateral shift = unilateral hip restriction or lumbar disc (shifts away from pain). Screen hip IR + lumbar quadrant test"] },
      { id:"arm", q:"Overhead arm position?",
        opts:["✓ Arms fully extended overhead","⚠ Slight elbow bend at bottom","✗ Arms fall forward significantly","✗ Cannot maintain overhead at all"],
        clues:["","Minor thoracic restriction or lat tightness — foam roller + lat stretch","Thoracic + lat restriction → arms fall into flexion. Foam roller thoracic extension + lat SMR + overhead wall slide","Significant shoulder flexion / thoracic deficit — screen shoulder ROM and thoracic extension separately before squat loading"] },
    ],
    grades:["Normal (FMS 3) — Full depth, heels flat, knees tracking, dowel overhead","Compensated (FMS 2) — Minor compensation: heel rise, arm drop, or forward lean","Abnormal (FMS 0–1) — Cannot achieve depth or pain reproduced"],
  }
];

function AnkleFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["afs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades)   setGrades(p.grades);
        if (p.notes)    setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f,g,n) => set("afs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = ANKLE_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(20,184,166,0.08),rgba(6,182,212,0.05))",border:"1px solid rgba(20,184,166,0.25)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🦶</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Ankle / Foot Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · Calf endurance · DF mobility · Proprioception · Arch · LSI</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:"#0d9488"}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {ANKLE_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?"#0d9488":done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?"rgba(20,184,166,0.1)":done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?"#0d9488":done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ").slice(0,2).join(" ")} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {ANKLE_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?"#0d9488":graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(20,184,166,0.1)":"0 1px 4px rgba(0,0,0,0.04)"}}>

            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:"#0d9488",textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{background:"#F0FDFA",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #99F6E4"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:"#0d9488",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:"rgba(20,184,166,0.08)",borderRadius:6,border:"1px solid rgba(20,184,166,0.2)"}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:"#0d9488"}}>Phase: {t.phase}</div>
                  </div>
                </div>

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:"rgba(20,184,166,0.06)",borderLeft:"3px solid #0d9488",borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Heel raise count, DF measurement, balance quality, arch findings..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#F0FDFA",borderRadius:14,padding:14,border:"1px solid #99F6E4",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Ankle / Foot Summary</div>
          {ANKLE_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{marginTop:10,padding:"8px 10px",background:"#FEF2F2",borderRadius:8,border:"1px solid #FECACA",fontSize:"0.8rem",color:"#dc2626",lineHeight:1.5}}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: Thompson test (Achilles), anterior drawer + talar tilt (ATFL/CFL), Ottawa ankle rules, windlass test (plantar fascia), tibialis posterior MMT, CAIT questionnaire, and VISA-A (Achilles tendinopathy).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CERVICAL FUNCTIONAL SCREEN ──────────────────────────────────────────────

const CERVICAL_TESTS = [
  {
    id:"cfs_arom", icon:"🔄", label:"Cervical AROM Screen",
    subtitle:"6-Plane ROM + Pain + Combined Movement",
    phase:"Articular / Capsular / Myofascial Screen",
    setup:"Patient seated upright, arms relaxed. Assess: Flexion (chin to chest), Extension (look at ceiling), L/R Lateral Flexion (ear to shoulder), L/R Rotation (chin to shoulder). Note range, pain, deviation, and end-feel. Normal values: Flex 45–50°, Ext 45–50°, Lat Flex 45°, Rotation 60–80°.",
    normalDesc:"Full pain-free range in all planes. Smooth movement. No deviation or arc of pain. Rotation 60–80° bilateral. Lateral flexion 45° bilateral. No referred symptoms.",
    observations:[
      { id:"rot",    q:"Cervical rotation — most sensitive restriction?",
        opts:["✓ 60–80° bilateral, pain-free","⚠ 45–59° or mild pain at end range","✗ <45° one side (significant restriction)","✗ Bilateral equal restriction — capsular pattern"],
        clues:["","Minor facet/capsular restriction — unilateral or postural. Maitland PA/unilateral PA mobilisation","Significant unilateral restriction — likely C1/C2 (upper cervical) or C4/5/6 facet restriction. Screen with combined movement (rot + ext vs rot + flex)","Bilateral equal loss of rotation — capsular pattern. OA of C1/C2 most likely. Upper cervical screen"] },
      { id:"flex",   q:"Flexion — chin to chest?",
        opts:["✓ Chin touches or nears chest","⚠ 2–3 finger widths from chest","✗ >3 finger widths (significant restriction)","✗ Pain/symptom reproduction on flexion"],
        clues:["","Minor flexion restriction — upper cervical or myofascial. Suboccipital release + DNF activation","Significant flexion restriction — screen for upper cervical instability (Sharp-Purser if flexion reproduces symptoms). Check for cord sign","Symptom reproduction — peripheralisation on flexion = disc or neural tension. Centralisation test (McKenzie cervical). Neurological screen"] },
      { id:"ext",    q:"Extension — look at ceiling?",
        opts:["✓ Full extension, pain-free","⚠ Limited or pain at end range","✗ Reproduces headache","✗ Reproduces arm symptoms"],
        clues:["","Facet joint restriction or myofascial tightness — extension mobilisation if no headache reproduction","Upper cervical facet or C2/3 — cervicogenic headache source. Watson headache approach. Extension mobilisation with caution","Radiculopathy or discogenic — extension + ipsilateral rotation/lateral flex = Spurling test equivalent. Neural screen"] },
      { id:"latflex",q:"Lateral flexion symmetry?",
        opts:["✓ 45° bilateral, symmetric","⚠ Asymmetric — tight one side","✗ Pain on lateral flexion (ipsilateral)","✗ Pain + arm symptoms (contralateral)"],
        clues:["","Ipsilateral scalene/levator tightness — screen CPA (upper trap, levator scapulae)","Ipsilateral facet joint compression pain — unilateral PA mobilisation C3–C6","Contralateral lateral flexion pain = nerve root stretch. Screen with ULNT1. Foraminal compression (Spurling) test"] },
      { id:"qual",   q:"Quality of movement?",
        opts:["✓ Smooth, full range","⚠ Hinge point / catches at one level","✗ Deviation during movement","✗ Instability / shake"],
        clues:["","Segmental restriction — hinge point identifies hypomobile segment. Maitland mobilisation at that level","Segmental restriction with deviation — combined movement restriction (Blake — Maitland) or lateral shift equivalent","Cervical instability — screen Sharp-Purser, transverse ligament test. Refer if positive"] },
    ],
    grades:["Normal — Full range all planes, pain-free, smooth movement","Compensated — Minor restriction or end-range pain without symptoms","Abnormal — Restricted rotation, reproduced headache/arm symptoms, or instability"],
  },
  {
    id:"cfs_dnf", icon:"🧠", label:"Deep Neck Flexor Endurance",
    subtitle:"Cranio-Cervical Flexion — Chin Tuck Hold Test",
    phase:"DNF Activation / FHP Motor Control",
    setup:"Patient supine, head on pillow. Perform chin tuck (nod — NOT full flexion lift). Hold chin retracted while breathing. Timer starts. Stop when SCM visibly dominates or chin poke occurs. Normal: 38–40s. Or: Supine chin tuck × 10 without SCM activation — count clean reps.",
    normalDesc:"Holds 38–40 seconds of chin tuck without SCM dominant strategy. No chin poke. Craniovertebral angle stays maintained. Breathing continues normally throughout.",
    observations:[
      { id:"time",   q:"Chin tuck hold duration?",
        opts:["✓ ≥38 seconds (normal)","⚠ 20–37 seconds (mild deficit)","✗ <20 seconds (significant deficit)","✗ Cannot initiate chin tuck — SCM only"],
        clues:["","Minor DNF endurance deficit — CCFT programme, staged progression","Significant DNF weakness — classic pattern in cervicogenic headache, FHP, whiplash. Priority: DNF activation at lower pressure levels before endurance training","DNF cannot initiate — severe inhibition. Begin with biofeedback pressure cuff 22mmHg, suboccipital release first. Screen for pain inhibition"] },
      { id:"scm",    q:"SCM dominance during hold?",
        opts:["✓ SCM stays relaxed","⚠ SCM activates late (last 10s)","✗ SCM activates immediately at onset","✗ SCM only — no DNF engagement"],
        clues:["","Minor — acceptable fatigue pattern at end of hold","SCM overactive strategy — upper crossed syndrome pattern (Janda). DNF inhibited. Suboccipital release before activation work","Dominant SCM strategy — classic Janda upper crossed. DNF inhibited by forward head posture. Begin suboccipital release, cranio-cervical nodding biofeedback"] },
      { id:"chin",   q:"Chin poke during hold?",
        opts:["✓ Chin stays retracted","⚠ Mild chin drift at fatigue","✗ Chin pokes forward immediately","✗ Cannot retract chin at all"],
        clues:["","Minor endurance drift — acceptable","Classic forward head posture motor pattern — cannot dissociate cranio-cervical nod from cervicothoracic extension. Priority rehab","Severe FHP pattern — begin with postural correction (chin tuck against wall), suboccipital release, upper thoracic extension mobilisation"] },
      { id:"breath", q:"Breathing during hold?",
        opts:["✓ Normal breathing continues","⚠ Breath holds at onset","✗ Breath holds — cannot hold + breathe","✗ Valsalva — strain pattern"],
        clues:["","Minor breath-hold — cue: breathe normally through the nod","Breath-hold compensation = significant motor control deficit. Begin supine breathing + DNF activation separately before combining","Valsalva pattern — screen for intra-abdominal pressure issues + pain avoidance. Reassure and restart with minimal effort"] },
      { id:"sym",    q:"Symptom reproduction during test?",
        opts:["✓ No symptoms","⚠ Mild neck ache","✗ Headache reproduced","✗ Dizziness / vertigo onset"],
        clues:["","Minor muscle fatigue","Cervicogenic headache — Watson headache approach. Upper cervical (C1/2/3) is likely nociceptive source","Dizziness — cervicogenic or vertebrobasilar. Do Hallpike, smooth pursuit neck torsion test, screen VBI before cervical manipulation"] },
    ],
    grades:["Normal — ≥38s, SCM relaxed, chin retracted, pain-free","Compensated — 20–37s or late SCM with controlled form","Abnormal — <20s, SCM dominant from start, chin poke, or symptoms reproduced"],
  },
  {
    id:"cfs_post", icon:"📏", label:"Postural Screen (CVA + FHP)",
    subtitle:"Craniovertebral Angle + Forward Head Posture",
    phase:"Postural Assessment / Janda Upper Crossed",
    setup:"Lateral photograph or direct assessment. Patient standing relaxed in natural posture. Draw (or estimate) angle between: line from tragus of ear to C7 spinous process AND horizontal. CVA normal >50°. Assess: head position relative to shoulder, thoracic kyphosis, scapular position.",
    normalDesc:"CVA >50° (ear over shoulder). Chin horizontal or level. Thoracic kyphosis mild / normal. Scapulae retracted and level. No shoulder elevation. Earlobe over acromion in lateral view.",
    observations:[
      { id:"cva",    q:"Craniovertebral angle (CVA)?",
        opts:["✓ >50° (normal — ear over shoulder)","⚠ 45–50° (borderline FHP)","✗ <45° (significant FHP)","✗ <35° (severe FHP — clinically significant)"],
        clues:["","Borderline posture — education, DNF activation, thoracic extension","Significant FHP — each 1° below 50° = 4.5kg increased load on cervical spine. Priority: DNF activation, upper thoracic extension, pec minor / upper trap stretching","Severe FHP — CVA <35° = significantly increased risk of headache, cervical disc loading, shoulder impingement. Full Janda CPA assessment"] },
      { id:"thor",   q:"Thoracic kyphosis?",
        opts:["✓ Normal mild kyphosis","⚠ Increased — hyperkyphosis","✗ Significant flexed posture","✗ Flat thoracic (hypolordosis)"],
        clues:["","Monitor — early kyphosis increase. Thoracic extension mobilisation + prone extension exercise","Hyperkyphosis drives FHP — cannot correct cervical posture without thoracic extension. Foam roller extension + thoracic PA mobilisation priority","Flat thoracic — may indicate ankylosing spondylitis pattern if bilateral. Screen SI joints, hip extension"] },
      { id:"scap",   q:"Resting scapular position?",
        opts:["✓ Retracted and level","⚠ Protracted (rounded shoulders)","✗ Elevated + protracted (upper trap dominant)","✗ Asymmetric elevation"],
        clues:["","Pec minor tightness — classic upper crossed pattern. Pec minor stretch + lower/mid trap activation","Full Janda upper crossed pattern — upper trap + SCM overactive, lower trap + DNF inhibited. CPA assessment priority","Asymmetric elevation — levator scapulae dominant one side. Screen cervical lateral flexion restriction ipsilateral to elevated shoulder"] },
      { id:"ear",    q:"Earlobe over acromion (lateral view)?",
        opts:["✓ Earlobe over or near acromion","⚠ Earlobe 2–3cm anterior to acromion","✗ Earlobe clearly anterior (>3cm)"],
        clues:["","Minor FHP — posture education + targeted activation","Significant FHP — each cm anterior increases cervical load. Quantify with CVA and photograph for baseline + progress monitoring"] },
      { id:"chin",   q:"Chin position at rest?",
        opts:["✓ Horizontal chin — neutral","⚠ Chin poke — chin forward and up","✗ Chin depressed — dowager pattern","✗ Head tilted — lateral asymmetry"],
        clues:["","Classic chin poke = C1/C2 extension + lower cervical flexion. Target with chin tuck exercise (not neck extension)","Dowager hump pattern — C7 prominence with flexed posture. Thoracic extension + upper cervical correction together","Head tilt — screen sternocleidomastoid length asymmetry and C1/C2 rotation restriction"] },
    ],
    grades:["Normal — CVA >50°, ear over shoulder, neutral scapulae","Compensated — CVA 45–50° or mild rounding without symptoms","Abnormal — CVA <45°, significant FHP, or full upper crossed pattern"],
  },
  {
    id:"cfs_diz", icon:"😵", label:"Cervicogenic Dizziness Screen",
    subtitle:"Smooth Pursuit Neck Torsion + VBI Screen",
    phase:"Vestibular / Proprioceptive / VBI Safety",
    setup:"STEP 1 — VBI screen (if manual therapy planned): Sustained rotation test 30s each side. STEP 2 — Smooth pursuit neck torsion (SPNT): track moving target eyes only while body turns (dissociation). STEP 3 — Hautant test: arms outstretched, eyes closed, rotate head. Drift = positive. STEP 4 — Head repositioning accuracy: eyes closed, rotate to target, open, measure error. Normal <4.5°.",
    normalDesc:"VBI screen negative. SPNT — smooth eye tracking without saccades or nystagmus. Hautant — no arm drift. Head repositioning error <4.5° bilateral. No dizziness reproduction with any test.",
    observations:[
      { id:"vbi",    q:"Sustained rotation — any symptoms?",
        opts:["✓ No symptoms 30s each side","⚠ Minor dizziness — settles quickly","✗ Dizziness + nystagmus","✗ Drop attack / diplopia / dysphagia"],
        clues:["","Possible minor cervicogenic vestibular response — may be proprioceptive not vascular. Monitor, reassess","VBI screen positive — cervical manipulation CONTRAINDICATED. Refer to vestibular physiotherapist. Reassess with positional testing (Dix-Hallpike)","Absolute contraindication to cervical manipulation — 5Ds (Dizziness, Diplopia, Dysarthria, Dysphagia, Drop attack). Emergency referral if acute onset"] },
      { id:"spnt",   q:"Smooth pursuit neck torsion (SPNT)?",
        opts:["✓ Smooth tracking — no saccades","⚠ Mild saccades — inconsistent","✗ Clear saccadic eye movement with rotation","✗ Nystagmus present"],
        clues:["","Minor — may be cervicogenic. Compare sitting vs lying — if worse sitting = cervicogenic component likely","SPNT positive — cervicogenic dizziness likely. Upper cervical proprioceptive dysfunction. Cervical joint position sense training, gaze stability exercises","Nystagmus — vestibular origin (peripheral or central). Dix-Hallpike mandatory before any cervical treatment. Vestibular physiotherapy referral"] },
      { id:"haut",   q:"Hautant test (arm drift eyes closed + rotation)?",
        opts:["✓ No arm drift","⚠ Slight drift at end range rotation","✗ Clear bilateral arm drift","✗ Unilateral drift — neurological sign"],
        clues:["","Minor — possibly normal variation. Reassess with head in neutral","Bilateral drift = vascular or vestibular involvement — VBI screen before treatment. Do not manipulate","Unilateral drift = neurological — screen C5/C6/C7 myotomes and reflexes. Refer if progressive"] },
      { id:"reposition",q:"Head repositioning accuracy?",
        opts:["✓ <4.5° error (normal proprioception)","⚠ 4.5–7° error (mild deficit)","✗ >7° error (significant proprioceptive deficit)","✗ Reproduces dizziness on repositioning"],
        clues:["","Minor cervical proprioceptive deficit — laser pointer training, gaze stability exercises","Significant deficit — typical in chronic WAD and cervicogenic headache. Joint position sense training with laser pointer. Neck muscle endurance + cervical stabilisation","Symptom reproduction = vestibular/proprioceptive overlap — gaze stability + Epley if BPPV suspected + cervical stabilisation"] },
      { id:"hallpike",q:"Dix-Hallpike result (if performed)?",
        opts:["✓ Negative — no nystagmus","⚠ Not performed","✗ Positive — torsional nystagmus <60s (BPPV)","✗ Positive — nystagmus >60s or direction-changing (central)"],
        clues:["","","BPPV — Epley canalith repositioning (posterior canal). Monitor for resolution × 3 Epleys. If no response — anterior or lateral canal or central cause","Direction-changing or prolonged nystagmus = central cause — immediate medical referral. Do not treat cervically"] },
    ],
    grades:["Normal — VBI negative, SPNT smooth, no drift, repositioning <4.5°","Compensated — Minor saccades or 4.5–7° repositioning error without symptoms","Abnormal — VBI positive, nystagmus, dizziness reproduced, or Dix-Hallpike positive"],
  },
  {
    id:"cfs_ulnt", icon:"💪", label:"ULNT1 — Upper Limb Neurodynamic",
    subtitle:"Median Nerve Tension + C6/C7 Radiculopathy Screen",
    phase:"Neural Tension / Cervical Radiculopathy",
    setup:"Patient supine. Sequence: (1) Shoulder depression, (2) Shoulder abduction 110°, (3) Wrist/finger extension, (4) Forearm supination, (5) Elbow extension until symptom onset, (6) Cervical lateral flexion away (sensitises) then toward (desensitises). Normal: mild stretch sensation in forearm/hand — bilateral. Positive: reproduces patient symptoms + sensitised by lateral flexion away + desensitised by lateral flexion toward.",
    normalDesc:"Mild stretch feeling in forearm/cubital fossa bilaterally at elbow extension endpoint. No symptom reproduction. Sensitisation and desensitisation by cervical lateral flexion (normal response). Bilateral equal range.",
    observations:[
      { id:"symp",   q:"Symptom reproduction during ULNT1?",
        opts:["✓ Mild stretch only — bilateral","⚠ Familiar arm/hand symptoms reproduced","✗ Clear neurological symptoms reproduced","✗ Symptoms worse than other side"],
        clues:["","Normal mechanosensitivity — bilateral mild stretch is expected at end range","Neurodynamic test positive — reproduces patient symptoms. Differentiates nerve from muscle/joint. Neural mobilisation (slider vs tensioner based on irritability)","Positive ULNT1 — bilateral comparison needed. If significantly more symptomatic one side = neural sensitisation. Determine irritability before treatment"] },
      { id:"diff",   q:"Cervical lateral flexion differentiation?",
        opts:["✓ Not tested / not applicable","⚠ Sensitises but does not desensitise","✗ Positive — sensitises away AND desensitises toward","✗ No change with lateral flexion — not neural"],
        clues:["","","Equivocal — may be muscular or myofascial. Repeat with shoulder depression only as first step","Classic neurodynamic positive — sensitisation + desensitisation confirms neural origin. C5/6/7 radiculopathy or peripheral median nerve sensitisation. Butler neural mobilisation approach"] },
      { id:"level",  q:"Elbow extension deficit (vs other side)?",
        opts:["✓ Equal bilateral extension","⚠ 5–10° deficit — mildly positive","✗ >10° deficit clearly restricted","✗ Major restriction — barely extends past 90°"],
        clues:["","Minor — monitor and compare bilaterally","Moderate neurodynamic restriction — neural mobilisation indicated. Determine irritability (slider if high, tensioner if low)","Severe neural tension — high irritability. Begin with cervical pain relief, slider-only neurodynamics. Formal neurological screen C5/C6/C7 myotomes + reflexes"] },
      { id:"neuro",  q:"Neurological symptoms present?",
        opts:["✓ Stretch sensation only (non-neurological)","⚠ Tingling / paresthesia in distribution","✗ Numbness in median nerve distribution","✗ Weakness in tested myotome (grip / wrist ext)"],
        clues:["","Minor neural sensitisation — neural slider mobilisation, cervical decompression position","C6 or C7 radiculopathy pattern — confirm with dermatomal mapping, reflexes (biceps C6, triceps C7), myotome grip strength test","Significant neurological deficit — formal upper limb neurological screen. Refer if progressive weakness. MRI if myelopathy signs present"] },
      { id:"bilat",  q:"Bilateral comparison?",
        opts:["✓ Symmetric — equal range and sensation","⚠ Mild asymmetry — same symptoms","✗ Clearly more restricted + symptomatic one side","✗ Bilateral — possible central sensitisation"],
        clues:["","","Unilateral neural sensitisation — cervical origin on same side most likely. C5/C6/C7 myotome and reflex testing next","Bilateral neural sensitisation — consider central sensitisation (pain catastrophising), thoracic outlet, or double crush syndrome"] },
    ],
    grades:["Normal — Mild bilateral stretch, desensitises with lateral flexion","Compensated — Mildly more symptomatic one side without neurological signs","Abnormal — Reproduced symptoms, positive sensitisation, neurological signs, or significant asymmetry"],
  },
];

function CervicalFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["cfs_data"];
    if (saved && typeof saved === "string") {
      try {
        const p = JSON.parse(saved);
        if (p.findings) setFindings(p.findings);
        if (p.grades)   setGrades(p.grades);
        if (p.notes)    setNotes(p.notes);
      } catch {}
    }
  }, []);

  const save = (f,g,n) => set("cfs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = CERVICAL_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";
  const accentCol = "#7c3aed";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(139,92,246,0.05))",border:"1px solid rgba(124,58,237,0.22)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🧠</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Cervical Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · AROM · DNF endurance · CVA posture · Dizziness · ULNT1</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:accentCol}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>
          <div style={{fontSize:"0.75rem",color:"#dc2626",fontWeight:700}}>⚠ Safety first: Complete VBI screen (ULNT test 4) before any cervical manipulation. If 5Ds present — do not manipulate.</div>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {CERVICAL_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?accentCol:done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?`${accentCol}12`:done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?accentCol:done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ")[0]} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {CERVICAL_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?accentCol:graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(124,58,237,0.09)":"0 1px 4px rgba(0,0,0,0.04)"}}>

            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>

            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>

                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{background:"#F5F3FF",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #DDD6FE"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:`${accentCol}08`,borderRadius:6,border:`1px solid ${accentCol}20`}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:accentCol}}>Phase: {t.phase}</div>
                  </div>
                </div>

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:`${accentCol}06`,borderLeft:`3px solid ${accentCol}`,borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}

                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Range values, DNF hold time, CVA measurement, VBI screen result..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#F5F3FF",borderRadius:14,padding:14,border:"1px solid #DDD6FE",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Cervical Screen Summary</div>
          {CERVICAL_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
          {Object.values(grades).includes(2) && (
            <div style={{marginTop:10,padding:"8px 10px",background:"#FEF2F2",borderRadius:8,border:"1px solid #FECACA",fontSize:"0.8rem",color:"#dc2626",lineHeight:1.5}}>
              ⚠ <strong>Abnormal findings present.</strong> Consider: Sharp-Purser (instability), Spurling (radiculopathy), Watson headache approach (C1/C2/C3), Dix-Hallpike (BPPV), C5/C6/C7 myotomes + reflexes, and formal VBI screen before manual therapy.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── THORACIC FUNCTIONAL SCREEN ──────────────────────────────────────────────

const THORACIC_TESTS = [
  {
    id:"tfs_arom", icon:"🔄", label:"Thoracic AROM",
    subtitle:"Rotation · Extension · Lateral Flexion",
    phase:"Articular / Segmental Mobility Screen",
    setup:"Patient seated cross-armed (hands on opposite shoulders). Assess: rotation L/R (normal 40–45° each), extension (normal 20–25°), lateral flexion L/R (normal 20–30°). Compare symmetry. Note: hinge points (restricted segments), pain arcs, compensatory lumbar movement.",
    normalDesc:"Rotation 40–45° bilateral symmetric. Smooth extension without hinge. Lateral flexion 20–30° bilateral. No pain. No compensatory lumbar motion. Thoracic kyphosis mild and mobile.",
    observations:[
      { id:"rot",    q:"Thoracic rotation symmetry?",
        opts:["✓ 40–45° bilateral, smooth","⚠ Mild asymmetry (<10° difference)","✗ Significant asymmetry (>10°)","✗ Painful arc during rotation"],
        clues:["","Minor unilateral restriction — PA mobilisation at restricted segment (Maitland). Rotation SNAG","Significant unilateral restriction — rib head or costovertebral joint. Rib mobilisation + thoracic rotation mobilisation. Dry needling erector spinae if myofascial","Pain arc = segmental facet irritation — unilateral PA at pain level. Anti-inflammatory phase first if acute"] },
      { id:"ext",    q:"Thoracic extension quality?",
        opts:["✓ Smooth distributed extension","⚠ Stiff — reduced range uniformly","✗ Hinge point — one level only moves","✗ Pain on extension"],
        clues:["","Global hypomobility — foam roller extension + thoracic manipulation (HVLA if indicated). Upper crossed postural pattern","Segmental restriction — specific PA mobilisation at hinge level. Rib palpation for costovertebral involvement","Extension pain — facet compression. Extension mobilisation with caution. Flexion bias if pain persists"] },
      { id:"latflex",q:"Lateral flexion symmetry?",
        opts:["✓ 20–30° bilateral, symmetric","⚠ Mild asymmetry","✗ Significant asymmetry","✗ Reproduces pain / refers"],
        clues:["","Unilateral rib / intercostal restriction — rib spring test next. Lateral PA mobilisation","Significant lateral asymmetry — scoliosis screen (Adam's forward bend). Structural vs functional. Cobb angle if structural suspected","Referred pain on lateral flexion — intercostal neuralgia or T4 syndrome (T4 segment). T4 mobilisation + upper thoracic screen"] },
      { id:"hinge",  q:"Segmental hinge point identified?",
        opts:["✓ No hinge — even distribution","⚠ Mild preference one area","✗ Clear hinge — one segment dominates","✗ Multiple hinge points"],
        clues:["","Monitor — targeted mobilisation at stiff area","Segmental hypomobility — PA mobilisation at that level. Confirm with passive intervertebral motion (PIVM) testing","Multiple restriction levels — thoracic manipulation + foam roller extension + seated rotation stretching"] },
      { id:"comp",   q:"Compensatory lumbar movement?",
        opts:["✓ Thoracic rotates independently","⚠ Mild lumbar co-rotation","✗ Lumbar rotates instead of thoracic","✗ Patient cannot isolate movement"],
        clues:["","Minor — cueing and practice. Hands-on to assist isolation","Thoracic restriction compensated by lumbar — thoracic mobilisation priority. Over-rotation through lumbar segment increases L4/L5 disc stress","Motor control deficit — seated rotation against resistance, foam roller, thoracic rotation with lumbar lock"] },
    ],
    grades:["Normal — Full symmetric range, smooth quality, no pain","Compensated — Minor restriction or asymmetry without referred symptoms","Abnormal — Hinge point, significant asymmetry, pain, or compensatory lumbar movement"],
  },
  {
    id:"tfs_rib", icon:"🫁", label:"Rib Mobility Screen",
    subtitle:"Pump Handle · Bucket Handle · Rib Spring",
    phase:"Costovertebral / Costotransverse Joint Assessment",
    setup:"Patient prone. Palpate angle of ribs (posterior). Rib spring: apply PA pressure over each rib angle T2–T10. Normal = springy, painless bilateral. Pump handle (upper ribs 1–5): AP movement on respiration. Bucket handle (lower ribs 6–10): lateral movement. Assess during deep breath — restriction = asymmetric excursion.",
    normalDesc:"Springy, pain-free PA pressure all rib angles. Symmetric rib excursion bilaterally on deep breath. Pump handle movement ribs 1–5, bucket handle 6–10. No reproduction of local or referred pain.",
    observations:[
      { id:"spring", q:"Rib spring test (prone PA)?",
        opts:["✓ Springy, pain-free bilateral","⚠ Stiff one side — reduced spring","✗ Painful — local pain reproduction","✗ Painful — referred pain (chest/intercostal)"],
        clues:["","Unilateral costovertebral restriction — rib mobilisation (prone PA + rib rotation). Dry needling if myofascial","Local pain = costovertebral joint irritation — gentle rib PA mobilisation, intercostal stretching. Distinguish from pleuritis (reproduce on deep breath)","Referred pain / intercostal = intercostal nerve irritation or T4 syndrome. Unilateral PA to costovertebral junction. Exclude visceral referral (cardiac, pleuritis)"] },
      { id:"resp",   q:"Rib excursion on deep breath?",
        opts:["✓ Symmetric bilateral expansion","⚠ Mild asymmetry on deep breath","✗ Clear asymmetric — restricted one side","✗ Paradoxical movement"],
        clues:["","Minor costovertebral or myofascial restriction — rib mobilisation + lateral costal breathing training","Significant rib restriction — rib manipulation (HVLA if indicated) + diaphragmatic breathing + intercostal stretching","Paradoxical movement — possible flail chest history or intercostal muscle dysfunction. Medical referral if acute"] },
      { id:"pump",   q:"Upper rib pump handle (ribs 1–5)?",
        opts:["✓ Bilateral symmetric AP movement","⚠ Reduced one side","✗ Absent — fixed first rib","✗ Painful — first rib syndrome"],
        clues:["","Upper thoracic / rib 1 restriction — thoracic outlet screen. First rib mobilisation","Fixed first rib — very common in thoracic outlet syndrome, cervical tension headache. First rib mobilisation (supine) mandatory before scalene stretching","First rib pain = first rib syndrome. Thoracic outlet screen (EAST test, Adson, Roos). Cervical rib rule-out on X-ray"] },
      { id:"bucket", q:"Lower rib bucket handle (6–10)?",
        opts:["✓ Bilateral symmetric lateral expansion","⚠ Reduced lateral expansion one side","✗ Absent expansion","✗ Pain on expansion"],
        clues:["","Costovertebral restriction — rib mobilisation + lateral costal breathing exercise","Significant restriction — intercostal stretching + rib manipulation. Diaphragm assessment (may be contributing)","Pain on lateral expansion — intercostal irritation, costochondritis, or referred. Distinguish with palpation of costochondral junction"] },
      { id:"tender", q:"Costochondral or sternal tenderness?",
        opts:["✓ No tenderness","⚠ Mild costal margin tenderness","✗ Costochondritis (anterior)","✗ Costo-sternal tenderness (Tietze's)"],
        clues:["","Minor costal margin tenderness — myofascial or postural. Avoid direct pressure. Thoracic extension + postural correction","Costochondritis — anti-inflammatory approach. Postural correction. Avoid direct mobilisation over inflamed cartilage","Tietze's syndrome — visible + palpable swelling. Differentiate from cardiac. Refer if doubt"] },
    ],
    grades:["Normal — Springy PA, symmetric rib excursion, pain-free","Compensated — Minor stiffness or asymmetry without referred symptoms","Abnormal — Pain on spring, asymmetric excursion, fixed first rib, or referred intercostal pain"],
  },
  {
    id:"tfs_ext", icon:"📐", label:"Thoracic Extension Mobility",
    subtitle:"Foam Roller / Chair Test — Segmental Extension",
    phase:"Hypomobility / Postural Extension Assessment",
    setup:"Method 1 (foam roller): Patient supine, foam roller under T4–T8. Arms crossed. Extend over roller 30 sec each level T3 to T9. Assess range, pain, crepitus. Method 2 (chair back): Seated, hands behind head, extend over chair back. Assess level where motion occurs vs where it is blocked.",
    normalDesc:"Extension distributes evenly T1–T12. Comfortable range over foam roller. Chair extension — movement throughout upper-to-mid thoracic. No segmental block. No pain or clicking.",
    observations:[
      { id:"level",  q:"Level of restriction (foam roller)?",
        opts:["✓ Even throughout T1–T12","⚠ Mild stiffness upper thoracic (T1–T4)","✗ Block mid-thoracic (T4–T8)","✗ Block lower thoracic (T8–T12)"],
        clues:["","Upper thoracic restriction — very common with FHP. T1/T2/T3 PA mobilisation + chin tuck","Mid-thoracic restriction (T4–T8) — most common site. T4 syndrome suspect if combined with arm symptoms. PA mobilisation T4–T6 + foam roller extension","Lower thoracic — thoracolumbar junction. Screen L1/L2 for compensatory hypermobility. Thoracolumbar PA mobilisation"] },
      { id:"pain",   q:"Pain on extension over roller?",
        opts:["✓ Comfortable — mild pressure only","⚠ Mild ache at restriction site","✗ Sharp localised pain","✗ Referred pain (arm, anterior chest)"],
        clues:["","Muscle guarding — mobilise at adjacent pain-free level first, progress toward restricted segment","Acute facet irritation — PA in neutral before extension loading. Anti-inflammatory positioning (flexion)","Referred anterior chest or arm = T4 syndrome. Unilateral PA at T4. Upper thoracic mobilisation. Exclude cardiac cause"] },
      { id:"click",  q:"Audible/palpable clicking on extension?",
        opts:["✓ No clicking","⚠ Clicking with relief (cavitation)","✗ Clicking with pain","✗ Grinding / crepitus"],
        clues:["","Normal joint cavitation — no concern. Continue mobilisation","Facet irritation — mobilise below pain threshold first. May need traction technique","Crepitus = degenerative change. Reduce range, add muscle control before extension range work"] },
      { id:"scap",   q:"Scapular movement during thoracic extension?",
        opts:["✓ Scapulae retract symmetrically","⚠ One scapula lags / protracts","✗ Bilateral scapular protraction — cannot retract","✗ Scapular winging during extension"],
        clues:["","Serratus anterior / lower trap asymmetry. Scapular setting exercise on that side","Bilateral protraction — Janda upper crossed pattern. Lower/mid trap activation before extension range work","Winging = serratus anterior inhibition. Long thoracic nerve screen. Serratus wall slide + protraction-retraction exercise"] },
      { id:"breath", q:"Thoracic breathing on extension?",
        opts:["✓ Ribcage expands on extension","⚠ Breath-holds on extension","✗ Paradoxical pattern — ribcage narrows","✗ Cannot extend and breathe simultaneously"],
        clues:["","Minor breath-holding — cue to breathe out on extension. Monitor","Breath-hold compensation — diaphragm inhibited on extension. Breathing pattern retraining + thoracic extension mobility separately","Significant — respiratory physiotherapy or pain-avoidance behaviour. Address pain first"] },
    ],
    grades:["Normal — Even thoracic extension throughout T1–T12, pain-free","Compensated — Mild segmental restriction without referred symptoms","Abnormal — Segmental block, referred pain, or scapular dysfunction on extension"],
  },
  {
    id:"tfs_t4", icon:"⚡", label:"T4 Syndrome Screen",
    subtitle:"Upper Thoracic Referred Arm Symptoms",
    phase:"T4 Syndrome / Sympathetic Nervous System Screen",
    setup:"T4 syndrome = unilateral or bilateral vague arm symptoms (heaviness, tingling, numbness) with upper thoracic dysfunction. Screen: (1) Unilateral PA on T4 — reproduces arm symptoms? (2) Combined rotation + extension at T3/T4. (3) Upper limb elevation with T4 PA — changes symptoms? (4) Neurological screen C5–T1. T4 commonly co-presents with bilateral glove-like numbness.",
    normalDesc:"PA on T3–T5 does not reproduce arm symptoms. Arm elevation with thoracic PA does not change symptoms. Neuro screen C5–T1 clear. No bilateral glove tingling. Upper thoracic mobility in normal range.",
    observations:[
      { id:"pa",     q:"Unilateral PA T4 — arm symptom reproduction?",
        opts:["✓ No arm symptoms reproduced","⚠ Minor local thoracic ache only","✗ Arm symptoms reproduced unilaterally","✗ Bilateral arm symptoms with PA"],
        clues:["","Not T4 syndrome — reassess other sources (cervical, TOS, peripheral)","Positive T4 screen — unilateral upper thoracic mobilisation. Rotation SNAG T3/T4. Monitor for arm symptom change","Classic T4 syndrome — bilateral. Upper thoracic mobilisation T3–T5 priority. Often dramatic symptom relief. Add thoracic extension home programme"] },
      { id:"arm",    q:"Arm symptom quality?",
        opts:["✓ No arm symptoms","⚠ Vague heaviness in arm","✗ Glove-like tingling (not dermatomal)","✗ Clear dermatomal pattern"],
        clues:["","Not T4 syndrome — continue other assessment","T4 syndrome pattern — non-dermatomal vague symptoms typical of sympathetic nervous system involvement at T4","Dermatomal tingling — cervical radiculopathy more likely. ULNT + cervical screen priority. T4 may contribute but not primary"] },
      { id:"neuro",  q:"Neurological screen C5–T1?",
        opts:["✓ Myotomes and reflexes intact","⚠ Mild sensory change only","✗ Myotome weakness present","✗ Reflex changes present"],
        clues:["","Normal — T4 syndrome or functional cause likely","Sensory changes without motor — screen double crush. Cervical + thoracic + peripheral combined","Myotome weakness — cervical radiculopathy or myelopathy. Cervical MRI referral. Not T4 syndrome alone","Reflex changes — myelopathy or radiculopathy. Urgent neurological referral if progressive"] },
      { id:"bilat",  q:"Are symptoms bilateral?",
        opts:["✓ Unilateral","⚠ Predominantly one side","✗ Bilateral","✗ Bilateral + trunk symptoms"],
        clues:["","Unilateral — cervical radiculopathy or peripheral more likely than T4. Thoracic still contributory","Bilateral — T4 syndrome or central sensitisation. T4 mobilisation + pain education","Strong T4 syndrome indicator — bilateral non-dermatomal = autonomic referral pattern. T4 upper thoracic mobilisation","If trunk symptoms also present — screen for myelopathy (Lhermitte, Babinski, hyperreflexia). Urgent referral if myelopathic"] },
      { id:"posture",q:"Upper thoracic kyphosis at T3/T4?",
        opts:["✓ Normal kyphosis","⚠ Mild flexion increase","✗ Kyphotic flexion at T3/T4 level","✗ Severe kyphosis + chin poke"],
        clues:["","Normal — less likely pure T4 mechanism","Kyphosis at T3/T4 — confirms postural T4 syndrome. Thoracic extension + FHP correction core of treatment","Classic T4 posture — foam roller extension + chin tuck + scapular retraction. Upper thoracic PA mobilisation","Severe — Janda upper crossed full pattern + thoracic outlet screen"] },
    ],
    grades:["Normal — No arm symptom reproduction, intact neurology, no T4 kyphosis","Compensated — Vague arm symptoms without neurological deficit","Abnormal — Arm symptoms reproduced by T4 PA, bilateral non-dermatomal tingling, or myotome changes"],
  },
  {
    id:"tfs_scap", icon:"🦴", label:"Scapular Stability Screen",
    subtitle:"Winging · Dyskinesis · Lower Trap / Serratus",
    phase:"Scapulothoracic Motor Control",
    setup:"(1) Wall push-up — observe for scapular winging (medial border lifting). (2) Arm elevation — observe scapular rhythm (upward rotation, ER, posterior tilt). Normal: scapula smoothly rotates upward 60° with 120° glenohumeral for full 180°. (3) Scapular assistance test: therapist manually assists scapular upward rotation — does shoulder pain improve? (4) Retraction test: manual scapular retraction — does shoulder/cervical pain change?",
    normalDesc:"No winging on wall push-up. Smooth scapulothoracic rhythm on elevation. Scapula upward rotates 60° to 120° GH. No excessive elevation. No dyskinesis. Scapular assistance test negative (no improvement = non-scapular cause).",
    observations:[
      { id:"wing",   q:"Scapular winging?",
        opts:["✓ No winging","⚠ Mild medial border lift","✗ Medial winging (serratus anterior)","✗ Lateral winging (trapezius)"],
        clues:["","Minor serratus fatigue — serratus strengthening (wall push-up plus, dynamic hug)","Serratus anterior inhibition — long thoracic nerve screen (punch test). Wall slide + dynamic hug + push-up plus progression","Trapezius weakness (especially lower trap) — Y/T/W exercises. Screen spinal accessory nerve if severe (trap shrug test)"] },
      { id:"rhythm", q:"Scapulothoracic rhythm on elevation?",
        opts:["✓ Smooth upward rotation","⚠ Shrug pattern — early elevation","✗ Dyskinesis — jerky / inconsistent","✗ Scapular lag at initiation"],
        clues:["","Upper trap dominant — lower trap + serratus activation. Elevation cueing during exercise","Scapular dyskinesis — Kibler Type I/II/III. Identify dominant pattern. Scapular PNF + YTWL progression","Lag at initiation — rotator cuff or serratus inhibition. Reduce load, begin at 90° abduction and progress"] },
      { id:"assist", q:"Scapular assistance test (SAT)?",
        opts:["✓ Not applicable","⚠ Tested — no change","✗ Positive — shoulder pain reduced","✗ Positive — range improved"],
        clues:["","","Scapular assistance negative — shoulder pain from non-scapular source (GHJ, rotator cuff, AC)","SAT positive — scapular dysfunction contributing to shoulder impingement. Scapular stabilisation rehab indicated before rotator cuff isolation","SAT positive with range improvement — scapular-related sub-acromial impingement. Lower trap + serratus priority"] },
      { id:"retract",q:"Scapular retraction test?",
        opts:["✓ Not applicable","⚠ Tested — no change","✗ Positive — cervical pain reduced","✗ Positive — arm symptoms changed"],
        clues:["","","Retraction test negative — non-scapular cervical source","Retraction test positive for cervical pain — forward shoulder posture contributing to cervicogenic symptoms. Scapular retraction + DNF priority","Retraction changes arm symptoms — thoracic outlet or neural tension component. Thoracic outlet screen (Roos, EAST)"] },
      { id:"sym",    q:"Scapular position at rest (symmetry)?",
        opts:["✓ Level and symmetric","⚠ Mild protraction bilateral","✗ Unilateral protraction/elevation","✗ Bilateral winging at rest"],
        clues:["","Bilateral minor protraction — postural. Upper crossed correction","Unilateral — dominant hand preference or cervicothoracic restriction. Screen C4/5 for shoulder elevation coupling","Resting winging — significant serratus or trap inhibition. Formal scapular strength assessment"] },
    ],
    grades:["Normal — No winging, smooth rhythm, symmetric resting position","Compensated — Mild dyskinesis or SAT positive without functional limitation","Abnormal — Winging, significant dyskinesis, SAT positive with pain/restriction"],
  },
];

function ThoracicFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["thfs_data"];
    if (saved && typeof saved === "string") {
      try { const p=JSON.parse(saved); if(p.findings)setFindings(p.findings); if(p.grades)setGrades(p.grades); if(p.notes)setNotes(p.notes); } catch {}
    }
  }, []);

  const save = (f,g,n) => set("thfs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = THORACIC_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";
  const accentCol = "#0f766e";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(15,118,110,0.08),rgba(20,184,166,0.05))",border:"1px solid rgba(15,118,110,0.22)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🫁</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Thoracic Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · AROM · Rib mobility · Extension · T4 syndrome · Scapular stability</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:accentCol}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {THORACIC_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?accentCol:done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?`${accentCol}12`:done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?accentCol:done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ")[0]} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {THORACIC_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?accentCol:graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(15,118,110,0.09)":"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>
                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{background:"#F0FDFA",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #99F6E4"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:`${accentCol}08`,borderRadius:6,border:`1px solid ${accentCol}20`}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:accentCol}}>Phase: {t.phase}</div>
                  </div>
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:`${accentCol}06`,borderLeft:`3px solid ${accentCol}`,borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Rotation degrees, rib spring findings, T4 test result, scapular winging..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#F0FDFA",borderRadius:14,padding:14,border:"1px solid #99F6E4",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Thoracic Screen Summary</div>
          {THORACIC_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ELBOW FUNCTIONAL SCREEN ─────────────────────────────────────────────────

const ELBOW_TESTS = [
  {
    id:"efs_arom", icon:"🔄", label:"Elbow AROM",
    subtitle:"Flex · Ext · Pronation · Supination",
    phase:"Articular / Capsular Screen",
    setup:"Assess all 4 planes: Flexion (normal 145°), Extension (normal 0° — hyperextension common in hypermobility), Pronation (normal 75–85°), Supination (normal 80–90°). Note: carrying angle (normal 5–15° valgus), end-feel (firm/hard/empty), pain arc, crepitus.",
    normalDesc:"Flexion 145°, extension 0°, pronation 75°, supination 85°. Firm end-feel. No pain arc. No crepitus. Carrying angle 5–15° valgus. Symmetric bilateral.",
    observations:[
      { id:"flex",   q:"Elbow flexion?",
        opts:["✓ 140–145°","⚠ 120–139° — mild restriction","✗ <120° — significant restriction","✗ Pain at end-range flexion"],
        clues:["","Posterior capsule or posterior impingement. Extension bias in rehab. Posterior compartment screen (olecranon fossa)","Significant — posterior capsular contracture or prior fracture. End-feel: hard = bony block (loose body), firm = capsular","Pain at end flexion = bicipital tendon or anterior capsule involvement. Resisted flexion test next"] },
      { id:"ext",    q:"Elbow extension?",
        opts:["✓ Full extension (0°)","⚠ 5–15° extension deficit","✗ >15° extension deficit (flexion contracture)","✗ Hyperextension present"],
        clues:["","Common after elbow sprain/fracture — posterior capsule mobilisation. Gravity stretch in prone if pain-free","Flexion contracture — significant. Posterior capsule stretching + dynamic splinting if chronic. Screen for loose body (hard end-feel)","Hyperextension — assess UCL and joint stability. Hypermobility screen (Beighton). Avoid terminal extension loading"] },
      { id:"prosup", q:"Pronation and supination?",
        opts:["✓ 75° pro / 85° sup bilateral","⚠ Mild restriction pronation or supination","✗ Significant restriction (>30° loss)","✗ Pain on rotation — radiocapitellar"],
        clues:["","Minor DRUJ or radiocapitellar restriction. Passive rotation mobilisation","Significant — DRUJ instability, Essex-Lopresti (if trauma history), radiocapitellar arthritis","Radiocapitellar pain on rotation = radial head pathology. Radial head mobilisation. Screen for lateral ligament"] },
      { id:"carry",  q:"Carrying angle?",
        opts:["✓ 5–15° valgus (normal)","⚠ Cubitus valgus >15°","✗ Cubitus varus (reverse angle)"],
        clues:["","Increased valgus — increased ulnar nerve stress. UCL / medial compartment screen. Tardy ulnar nerve palsy risk","Cubitus varus — usually prior supracondylar fracture. Assess functional range and medial stability"] },
      { id:"crepitus",q:"Crepitus during AROM?",
        opts:["✓ No crepitus","⚠ Fine crepitus — end range","✗ Coarse crepitus mid-range","✗ Locking or clicking"],
        clues:["","Minor synovial or degenerative — monitor","Degenerative change — modify loading. Avoid impingement positions. Joint protection education","Locking = loose body (osteochondral fragment). Imaging referral. Do not mobilise into locked position"] },
    ],
    grades:["Normal — Full pain-free range, no crepitus, normal carrying angle","Compensated — Minor restriction or end-range pain without instability","Abnormal — Flexion contracture, pain arc, crepitus, or abnormal carrying angle"],
  },
  {
    id:"efs_lat", icon:"🎾", label:"Lateral Epicondyle Load Test",
    subtitle:"Cozen's · Mill's · Maudsley's — Lateral Epicondylalgia",
    phase:"Extensor Origin Load / Tendinopathy Screen",
    setup:"(1) Cozen's: patient makes fist, wrist extends, forearm pronated. Therapist resists wrist extension. Positive = pain at lateral epicondyle. (2) Mill's: therapist passively pronates, flexes wrist, extends elbow. Positive = lateral epicondyle pain. (3) Maudsley: resist extension of 3rd digit. (4) Palpate common extensor origin (CEO) — anterior lateral epicondyle.",
    normalDesc:"No pain on resisted wrist extension, passive stretch, or 3rd digit extension. Lateral epicondyle non-tender on palpation. Grip strength equal bilateral (dynamometer or squeeze).",
    observations:[
      { id:"cozen",  q:"Cozen's test (resisted wrist ext)?",
        opts:["✓ Pain-free","⚠ Mild — pain during sustained","✗ Positive — pain at lateral epicondyle","✗ Pain + immediate weakness"],
        clues:["","Minor CEO tendinopathy or cervical referral. Repeat with cervical lateral flexion — if changes, cervical component","Classic lateral epicondylalgia. Load management + IASTM + eccentric programme (Tyler twist, wrist curls)","High irritability — reduce load. Isometric wrist extension for analgesia. PEACE + LOVE principles acutely"] },
      { id:"mills",  q:"Mill's stretch (passive pronation + wrist flex + elbow ext)?",
        opts:["✓ No pain","⚠ Mild stretch sensation only","✗ Pain at lateral epicondyle","✗ Pain + elbow clicking"],
        clues:["","Normal — good tissue extensibility","Positive Mill's = tendinopathy + tissue extensibility deficit. Soft tissue mobilisation CEO + wrist extension mobility. Avoid aggressive stretching in high irritability","Pain + click = radio-capitellar or annular ligament. Palpate radial head. Screen lateral ligament"] },
      { id:"maud",   q:"Maudsley (resist 3rd digit extension)?",
        opts:["✓ No pain","⚠ Mild ache during","✗ Positive — lateral epicondyle pain","✗ Positive with grip weakness"],
        clues:["","Normal","Extensor digitorum communis involvement. Forearm extensor massage + EDC strengthening","Grip weakness with Maudsley positive — screen for PIN (posterior interosseous nerve) entrapment. EDC test, digit extension power"] },
      { id:"tender", q:"CEO palpation (anterior lateral epicondyle)?",
        opts:["✓ Non-tender","⚠ Mild tenderness on firm palpation","✗ Tender on light touch","✗ Tender + thickened / nodular"],
        clues:["","Minor — consistent with low-irritability tendinopathy","High irritability — do not directly palpate. Load management, isometrics only phase 1","Nodular tendinopathy — chronic. IASTM or dry needling. Eccentric + isometric programme. Monitor over 6–12 weeks"] },
      { id:"grip",   q:"Grip strength comparison?",
        opts:["✓ Equal bilateral","⚠ Mild deficit (<10%)","✗ Moderate deficit (10–30%)","✗ Severe deficit (>30%) or pain-limited"],
        clues:["","Minor inhibition — isometric grip strengthening","Significant — functional limitation. Graduated grip programme + proximal strengthening (scapular, rotator cuff, wrist)","Pain-limited grip = high irritability. Isometrics first. Wrist extension isometric hold 45° for immediate analgesia"] },
    ],
    grades:["Normal — Pain-free CEO, equal grip, no positive tests","Compensated — Mild tenderness or <10% grip deficit without functional impact","Abnormal — Positive Cozen/Mill's/Maudsley, significant grip deficit, or high irritability"],
  },
  {
    id:"efs_med", icon:"🏌️", label:"Medial Elbow / Valgus Screen",
    subtitle:"UCL Stress · Golfer's Elbow · Ulnar Nerve",
    phase:"Medial Compartment / Valgus Load",
    setup:"(1) Medial epicondyle palpation (FCU, FCR, PT origin). (2) Valgus stress test: elbow 20–30° flexion, apply valgus force. Normal = firm endpoint. (3) Moving valgus stress test (MVST): apply sustained valgus, move elbow 70° to 120° flexion. Positive = medial pain in arc (UCL sign). (4) Resisted wrist flexion (flexor-pronator strain). (5) Ulnar nerve: Tinel at cubital tunnel, sensory screen ring/little finger.",
    normalDesc:"Medial epicondyle non-tender. Firm UCL endpoint on valgus stress. MVST negative. Resisted wrist flexion pain-free. Tinel at cubital tunnel negative. Normal ring/little finger sensation.",
    observations:[
      { id:"ucl",    q:"Valgus stress test (UCL)?",
        opts:["✓ Firm endpoint, pain-free","⚠ Soft endpoint or mild pain","✗ Instability — excessive opening","✗ Instability + reproduction of medial pain"],
        clues:["","UCL laxity or minor sprain — dynamic stabiliser rehab (FCU + wrist flexor strengthening). Monitor","UCL insufficiency — significant. Throwing athletes: UCL reconstruction risk. Refer orthopaedics if grade II+","UCL insufficiency with pain = Tommy John pattern. Throwing athlete: specialist referral. Non-athletes: conservative flexor-pronator strengthening"] },
      { id:"mvst",   q:"Moving valgus stress test (MVST)?",
        opts:["✓ Negative","⚠ Discomfort but not pain","✗ Positive — medial pain 70–120°","✗ Positive with locking sensation"],
        clues:["","Normal","MVST positive = UCL stress response. Load management + flexor-pronator strengthening + throwing mechanics assessment","Locking sensation = loose body in posterior medial compartment. Posteromedial impingement screen (extend + valgus in end flexion)"] },
      { id:"fcu",    q:"Resisted wrist flexion / FCU palpation?",
        opts:["✓ Pain-free, equal bilateral","⚠ Mild medial elbow ache","✗ Pain at medial epicondyle (golfer's elbow)","✗ Pain + weakness"],
        clues:["","Monitor — minor flexor-pronator strain or cervical referral. Cervical screen","Medial epicondylalgia (golfer's elbow). FCU/FCR origin tendinopathy. Load management + isometric wrist flexion for analgesia + eccentric programme","Weakness with pain — screen for median nerve or C8/T1 cervical referral. Neurological exam"] },
      { id:"ulnar",  q:"Ulnar nerve screen (Tinel + sensation)?",
        opts:["✓ Tinel negative, sensation intact","⚠ Tinel positive — no sensory deficit","✗ Sensory deficit ring/little finger","✗ Intrinsic weakness (Froment's / clawing)"],
        clues:["","Normal","Cubital tunnel syndrome — mild. Avoid elbow flexion >90° at night (elbow pad). Ulnar nerve gliding","Cubital tunnel — moderate. Sensory deficit present. Avoid flexion >90° sustained. Nerve glide programme. EMG/NCS referral if progressive","Intrinsic weakness = severe cubital tunnel. Froment's test for adductor pollicis. Urgent referral if progressive motor loss"] },
      { id:"med_tender",q:"Medial epicondyle tenderness?",
        opts:["✓ Non-tender","⚠ Tender on firm palpation","✗ Tender — golfer's elbow pattern","✗ Tender + valgus instability"],
        clues:["","Normal","Flexor-pronator tendinopathy. FCU/FCR eccentric loading programme. Soft tissue therapy","Combined medial epicondylalgia + UCL laxity — common in overhead athletes. Treat tendinopathy first, assess UCL once irritability settled"] },
    ],
    grades:["Normal — Firm UCL, pain-free wrist flexion, Tinel negative","Compensated — Mild tenderness or minor UCL laxity without functional deficit","Abnormal — UCL instability, positive MVST, golfer's elbow, or ulnar neuropathy"],
  },
  {
    id:"efs_stab", icon:"🛡️", label:"Elbow Stability Screen",
    subtitle:"PLRI · Varus Stress · Posterolateral Rotatory",
    phase:"Ligamentous / Joint Stability",
    setup:"(1) Posterolateral rotatory instability (PLRI) — lateral pivot shift: patient supine, arm overhead, apply axial compression + valgus + supination through elbow extension. Positive = apprehension or subluxation. (2) Varus stress at 20° flexion. (3) Posterolateral apprehension (seated or standing — resist resupination). (4) Chair sign: patient pushes up from chair with forearm supinated — apprehension = positive.",
    normalDesc:"Lateral pivot shift apprehension negative. No varus laxity. Chair sign negative. Posterolateral apprehension negative. Symmetric stability bilateral.",
    observations:[
      { id:"plri",   q:"Lateral pivot shift / PLRI apprehension?",
        opts:["✓ Negative — no apprehension","⚠ Mild discomfort — no subluxation","✗ Apprehension — positive","✗ Subluxation palpable"],
        clues:["","May be minor lateral ligament sprain. Monitor and protect supination loading","PLRI positive — lateral ulnar collateral ligament (LUCL) insufficiency. Limit supination in loaded positions. Refer if functional impact significant","LUCL instability — surgical consultation if conservative management fails (common in post-radial head excision or prior dislocation)"] },
      { id:"chair",  q:"Chair sign (supinated push up)?",
        opts:["✓ Negative — confident push","⚠ Avoidance but no pain","✗ Positive — apprehension with supination","✗ Pain + instability"],
        clues:["","Normal","Functional test for PLRI. Positive = patient avoids supinated loading. Confirm with lateral pivot shift","High irritability PLRI. Lateral ulnar collateral reconstruction if conservative fails"] },
      { id:"varus",  q:"Varus stress test (radial collateral)?",
        opts:["✓ Firm endpoint","⚠ Soft — minor laxity","✗ Instability — significant opening","✗ Instability + pain"],
        clues:["","Normal","Minor radial collateral laxity — usually well-tolerated. Monitor. Avoid varus loads","Significant lateral instability — LUCL or radial collateral complex. Refer orthopaedics"] },
      { id:"post",   q:"Posteromedial impingement screen?",
        opts:["✓ No posteromedial pain","⚠ Discomfort at end-range extension + valgus","✗ Pain posteromedially (osteophyte)","✗ Locking in extension"],
        clues:["","Normal","Common in throwing athletes — olecranon osteophyte against medial wall. X-ray. Load management and throwing mechanics","Locking = loose body. Imaging referral. Arthroscopic debridement if symptomatic and conservative fails"] },
      { id:"nerve",  q:"Radial nerve screen (PIN)?",
        opts:["✓ Full digit extension, no radial pain","⚠ Mild radial tunnel pain on palpation","✗ Radial tunnel syndrome — pain without weakness","✗ PIN palsy — digit drop"],
        clues:["","Normal","Radial tunnel syndrome — similar to lateral epicondylalgia but more distal (radial tunnel, not CEO). Palpation 3–5 cm distal to epicondyle. Neural decompression position + elbow extension stretching","PIN palsy = posterior interosseous nerve entrapment. Urgent assessment — digit drop. EMG, refer if not resolving"] },
    ],
    grades:["Normal — All stability tests negative, intact radial nerve","Compensated — Minor apprehension or discomfort without instability","Abnormal — PLRI positive, chair sign positive, varus laxity, or PIN involvement"],
  },
  {
    id:"efs_neural", icon:"⚡", label:"ULNT2 — Radial/Median Neural Screen",
    subtitle:"ULNT2a (Median) · ULNT2b (Radial) · Cubital Tunnel",
    phase:"Neural Tension / Peripheral Nerve Screen",
    setup:"ULNT2a (median): Shoulder depression + 10° abduction + ER + wrist/finger ext + elbow extension. ULNT2b (radial): Same but IR + wrist flexion (radial nerve bias). Sensitise with cervical lateral flex. Compare bilateral range and symptom reproduction. Also: cubital tunnel Tinel (medial) and resisted elbow flexion (musculocutaneous screen).",
    normalDesc:"Mild bilateral stretch at elbow extension endpoint. No symptom reproduction. Cervical sensitisation/desensitisation response present bilaterally. No tingling or numbness in any nerve distribution.",
    observations:[
      { id:"ulnt2a", q:"ULNT2a — median nerve (ER + wrist ext)?",
        opts:["✓ Mild bilateral stretch","⚠ Mildly more symptomatic one side","✗ Symptoms reproduced — median distribution","✗ Major restriction — barely extends past 90°"],
        clues:["","Minor asymmetry — monitor, screen cervical C6/C7","Positive — median nerve sensitisation, pronator syndrome or carpal tunnel component. Neural slider programme (median bias). Screen carpal tunnel","Severe median restriction = high irritability neural tension. Cervical + elbow + wrist combined dysfunction. Slider neurodynamics only until irritability reduces"] },
      { id:"ulnt2b", q:"ULNT2b — radial nerve (IR + wrist flex)?",
        opts:["✓ Mild bilateral stretch","⚠ Mildly more symptomatic one side","✗ Symptoms reproduced — radial distribution","✗ Major restriction"],
        clues:["","Minor — monitor alongside lateral epicondylalgia","Positive radial — radial tunnel, wrist dorsal sensory branch, or cervical C7. Radial nerve slider (wrist flex + elbow ext + IR)","Severe radial restriction — combined cervical, radial tunnel, and lateral epicondylalgia common. Address in sequence"] },
      { id:"cervdiff",q:"Cervical lateral flex differentiation?",
        opts:["✓ Sensitises and desensitises","⚠ Sensitises only","✗ No change — not neural","✗ Worsens both ways"],
        clues:["","Classic neurodynamic positive — confirms neural origin. Butler neural mobilisation approach","Equivocal — may be muscular. Repeat with shoulder depression only","Not neural tension — myofascial or joint. Proceed to local elbow/wrist testing","Central sensitisation — both directions worsen. Pain education + graded exposure"] },
      { id:"mcut",   q:"Musculocutaneous screen (resisted elbow flex + forearm sensation)?",
        opts:["✓ Normal power, sensation intact","⚠ Mild weakness biceps","✗ Weakness biceps + lateral forearm numbness","✗ Complete biceps palsy"],
        clues:["","Normal","Minor biceps inhibition — screen cervical C6. Pain-inhibited or true nerve","Musculocutaneous or C6 involvement — EMG/NCS referral. Cervical C5/6 MRI if radiculopathic pattern","Complete biceps palsy — urgent. Axillary, musculocutaneous, or C5/6 root avulsion. Emergent referral"] },
      { id:"tinel",  q:"Tinel at cubital tunnel (medial) + olecranon groove?",
        opts:["✓ Negative","⚠ Positive Tinel without sensory deficit","✗ Positive + ring/little finger tingling","✗ Positive + intrinsic weakness"],
        clues:["","Normal","Cubital tunnel irritation — avoid elbow flexion at night. Elbow pad. Ulnar nerve glides","Ulnar neuropathy — sensory involvement. Monitor progression. EMG/NCS if not improving in 6–8 weeks","Motor involvement = significant — urgent EMG/NCS. Refer if intrinsic wasting"] },
    ],
    grades:["Normal — Mild bilateral stretch, no symptoms, Tinel negative","Compensated — Mild asymmetry or Tinel positive without sensory/motor deficit","Abnormal — Reproduced symptoms, neurological signs, or significant restriction"],
  },
];

function ElbowFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["elfs_data"];
    if (saved && typeof saved === "string") {
      try { const p=JSON.parse(saved); if(p.findings)setFindings(p.findings); if(p.grades)setGrades(p.grades); if(p.notes)setNotes(p.notes); } catch {}
    }
  }, []);

  const save = (f,g,n) => set("elfs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = ELBOW_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";
  const accentCol = "#0369a1";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(3,105,161,0.08),rgba(14,165,233,0.05))",border:"1px solid rgba(3,105,161,0.22)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>💪</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Elbow Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · AROM · Lateral epicondyle · Medial/UCL · Stability · Neural</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:accentCol}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {ELBOW_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?accentCol:done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?`${accentCol}12`:done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?accentCol:done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ")[0]} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {ELBOW_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?accentCol:graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(3,105,161,0.09)":"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>
                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{background:"#F0F9FF",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #BAE6FD"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:`${accentCol}08`,borderRadius:6,border:`1px solid ${accentCol}20`}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:accentCol}}>Phase: {t.phase}</div>
                  </div>
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:`${accentCol}06`,borderLeft:`3px solid ${accentCol}`,borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="ROM degrees, Cozen's result, UCL stress, neural findings..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#F0F9FF",borderRadius:14,padding:14,border:"1px solid #BAE6FD",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Elbow Screen Summary</div>
          {ELBOW_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── WRIST / HAND FUNCTIONAL SCREEN ──────────────────────────────────────────

const WRIST_TESTS = [
  {
    id:"wfs_arom", icon:"🔄", label:"Wrist AROM + Grip",
    subtitle:"Flex · Ext · RD · UD · Grip Strength",
    phase:"Articular / Tendon / Grip Capacity Screen",
    setup:"Assess: Flexion (normal 80°), Extension (normal 70°), Radial deviation (normal 20°), Ulnar deviation (normal 30°). Grip: isometric dynamometer (3 trials each hand, average). Pinch: lateral pinch. Compare dominant to non-dominant (dominant typically 10% stronger). Note: deformity, swelling, pain arc.",
    normalDesc:"Flexion 80°, extension 70°, RD 20°, UD 30°. Grip dominant = non-dominant + 10%. No pain arc. No deformity. End-feel firm throughout. No swelling. Equal bilateral tenodesis (passive opening/closing with wrist movement).",
    observations:[
      { id:"ext",    q:"Wrist extension range?",
        opts:["✓ 70°+ pain-free","⚠ 50–69° or mild discomfort","✗ <50° significant restriction","✗ Pain + crepitus"],
        clues:["","Wrist capsule tightness or prior sprain. Wrist extension mobilisation (PA on carpals, radial glide). Tendon gliding exercises","Significant restriction — carpal coalition, osteoarthritis, or post-fracture. Mobilisation + splint. Imaging if trauma history","Pain + crepitus = DRJ or radiocarpal OA, or scaphoid non-union. Screen scaphoid anatomical snuffbox"] },
      { id:"flex",   q:"Wrist flexion range?",
        opts:["✓ 80°+ pain-free","⚠ 60–79° or mild discomfort","✗ <60° significant restriction","✗ Finger flexion pattern changes with wrist movement"],
        clues:["","Minor capsular restriction — wrist flexion mobilisation. Volar glides","Significant restriction — Dupuytren's contracture screen (palmar cords), OA, or post-Colles","Tenodesis dysfunction — screen extrinsic tendon tightness (flex wrist = fingers should extend; ext wrist = fingers close)"] },
      { id:"dev",    q:"Radial / ulnar deviation?",
        opts:["✓ RD 20° / UD 30° bilateral","⚠ Mild restriction RD or UD one side","✗ Pain at extremes of deviation","✗ Ulnar-sided pain on UD"],
        clues:["","Minor triquetral or intercarpal restriction — carpal mobilisation","Radiocarpal impingement or styloid conflict — X-ray. Reduce end-range loading","Ulnar-sided UD pain = TFCC or ECU. Screen TFCC (ulnar fovea sign)"] },
      { id:"grip",   q:"Grip strength comparison?",
        opts:["✓ Equal ±10%","⚠ 10–25% deficit","✗ >25% deficit","✗ Pain-limited grip — cannot squeeze"],
        clues:["","Minor inhibition — CTS, tennis elbow, or cervical C8. Isometric grip progression","Significant deficit — functional limitation. Progressive grip strengthening + proximal rehab","Pain-limited — identify source first (CTS, TFCC, scaphoid, tendinopathy) before loading"] },
      { id:"tenod",  q:"Tenodesis pattern (passive flex/ext)?",
        opts:["✓ Normal — wrist ext = finger flex, wrist flex = finger ext","⚠ Sluggish tenodesis","✗ Absent tenodesis","✗ Reversed tenodesis"],
        clues:["","Intrinsic / extrinsic tendon tightness — tendon gliding programme","Absent tenodesis = significant extrinsic tendon adhesion or neurological. Passive tendon gliding + blocking exercises","Reversed tenodesis = intrinsic tightness (positive Bunnell-Littler). Intrinsic stretch + MP mobilisation"] },
    ],
    grades:["Normal — Full ROM, equal grip ±10%, normal tenodesis","Compensated — Minor restriction or 10–25% grip deficit without functional limitation","Abnormal — Significant restriction, >25% grip deficit, or pain-limited loading"],
  },
  {
    id:"wfs_cts", icon:"🤏", label:"Carpal Tunnel Screen",
    subtitle:"Phalen's · Tinel's · Compression Test · CTS",
    phase:"Median Nerve / Carpal Canal Pressure",
    setup:"(1) Phalen's: wrist sustained maximal flexion 60s — tingling in median distribution? (2) Tinel's: tap over carpal tunnel (wrist crease, central) — tingling digits 1–3? (3) Carpal compression test (Durkan): direct pressure carpal tunnel 30s. (4) Sensation: 2-point discrimination D1/D2/D3 vs D4/D5. (5) Thenar atrophy — inspect. (6) Screen cervical C6 + ULNT1.",
    normalDesc:"Phalen's negative at 60s. Tinel's negative. No median sensory deficit D1–D3. 2-point discrimination <6mm. No thenar atrophy. Grip and pinch equal bilateral.",
    observations:[
      { id:"phalen", q:"Phalen's test (60s wrist flexion)?",
        opts:["✓ Negative at 60s","⚠ Positive >45s (mild)","✗ Positive <45s (moderate)","✗ Positive <20s (severe/high pressure)"],
        clues:["","Minor — conservative management. Night splint (neutral wrist). Activity modification","Moderate CTS — splinting priority. Referral to hand therapist + nerve conduction. Consider injection","Severe CTS — urgent nerve conduction. Surgical referral if motor deficit or rapidly progressive. Splint while awaiting"] },
      { id:"tinel",  q:"Tinel's at carpal tunnel?",
        opts:["✓ Negative","⚠ Mild tingling distally","✗ Clear median tingling digits 1–3","✗ Sharp pain — highly irritable"],
        clues:["","Normal","Positive Tinel's = active demyelination at carpal tunnel. NCS + splinting. Median nerve slider neurodynamics once irritability reduces","High irritability — avoid provocative positions. Neutral wrist splint 24/7 initially"] },
      { id:"sensation",q:"Median nerve sensation D1–D3?",
        opts:["✓ Intact and symmetric","⚠ Mildly reduced D3/D2","✗ Numbness D1–D3","✗ Constant numbness + thenar weakness"],
        clues:["","Monitor — early sensory change. Night splint + activity modification","Sensory deficit = moderate–severe CTS. NCS urgent. Surgical evaluation if not responding to conservative in 8–12 weeks","Constant numbness + motor = severe. Thenar atrophy check. Urgent referral — irreversible axonal loss risk"] },
      { id:"thenar", q:"Thenar eminence bulk?",
        opts:["✓ Full and symmetric","⚠ Mild volume reduction","✗ Thenar atrophy present","✗ Complete thenar wasting"],
        clues:["","Monitor — may be dominant/non-dominant difference","Moderate motor involvement — NCS. Assess opponens and abductor pollicis brevis (APB)","Severe — long-standing CTS. Nerve conduction urgently. Surgical release likely indicated. Assess for irreversible motor damage"] },
      { id:"doublec", q:"Double crush screen (cervical C6)?",
        opts:["✓ Cervical screen clear","⚠ Mild cervical tenderness — possibly contributing","✗ Cervical C6 restriction + CTS signs","✗ Positive ULNT1 + CTS signs"],
        clues:["","Normal — isolated CTS likely","Minor cervical contribution — treat both. Cervical mobilisation may improve CTS symptoms","Double crush syndrome — cervical + carpal tunnel combined. Treat both simultaneously for best outcomes","Double crush confirmed — neural slider neurodynamics + cervical mobilisation + CTS splinting. Neural tissue most sensitised at both sites"] },
    ],
    grades:["Normal — Phalen/Tinel negative, intact sensation, no thenar atrophy","Compensated — Phalen positive >45s without sensory deficit","Abnormal — Sensory deficit, thenar atrophy, or positive tests <45s"],
  },
  {
    id:"wfs_tfcc", icon:"🔱", label:"TFCC / Ulnar Wrist Screen",
    subtitle:"Ulnar Fovea Sign · DRUJ Stability · ECU",
    phase:"Triangular Fibrocartilage Complex",
    setup:"(1) Ulnar fovea sign: press firm into fovea (between FCU tendon, ulnar styloid, pisiform) — pain = TFCC/ulnar ligament. (2) DRUJ stability: hold distal ulna, translate dorsal/volar — compare to contralateral. (3) ECU tendon (ulnar dorsal): palpate + resisted ulnar deviation/extension. (4) Piano key test: press on distal ulna in pronation — pain/clicking = DRUJ instability. (5) Ulnar deviation load test: axial load + ulnar deviation + supination.",
    normalDesc:"Fovea sign negative (no tenderness). DRUJ stable — firm dorsal/volar endpoint symmetric. ECU non-tender. Piano key test negative. No clicking on ulnar deviation load. Distal ulna in slight dorsal relation to radius (normal).",
    observations:[
      { id:"fovea",  q:"Ulnar fovea sign?",
        opts:["✓ Non-tender fovea","⚠ Tender fovea — mild","✗ Tender fovea — reproduction of patient pain","✗ Tender + crepitus on forearm rotation"],
        clues:["","Normal — TFCC likely intact","Positive fovea = TFCC peripheral tear (foveal attachment) or ulnocarpal ligament strain. Load management, DRUJ stabilisation splint","Crepitus with rotation = DRUJ osteoarthritis or TFCC tear. MRI referral for tear assessment. Refer hand surgeon if functional limitation"] },
      { id:"druj",   q:"DRUJ stability (dorsal/volar translation)?",
        opts:["✓ Firm symmetric endpoint","⚠ Mild laxity — greater than contralateral","✗ Instability — significant translation","✗ Painful instability"],
        clues:["","Normal","Minor DRUJ laxity — ECU and pronator quadratus strengthening. Avoid end-range rotation loading","DRUJ instability — Essex-Lopresti if radial head involved. Refer hand surgeon. DRUJ stabilisation programme if conservative","Painful instability = significant TFCC tear. MRI + hand surgeon referral. Do not load in unstable position"] },
      { id:"ecu",    q:"ECU palpation + resisted testing?",
        opts:["✓ Non-tender, full power","⚠ Tender ECU groove","✗ ECU tendinopathy — tender + pain on resist","✗ ECU subluxation — snap felt"],
        clues:["","Normal","ECU tendinopathy — load management. Eccentric ulnar deviation/extension. Reduce forearm rotation loading","ECU tendinopathy — load management + wrist stabilisation brace. Graduated return to aggravating activity","ECU subluxation = ECU subsheath tear. Click on rotation + ulnar deviation. Immobilisation (supinated) then ECU stabilisation sleeve"] },
      { id:"piano",  q:"Piano key test (distal ulna press)?",
        opts:["✓ No pain/clicking","⚠ Discomfort but no click","✗ Click or pop on piano key","✗ Marked instability on press"],
        clues:["","Normal DRUJ","Mild DRUJ irritation — monitor. Forearm stabilisation exercise","DRUJ instability — ECU + PQ strengthening. DRUJ stabilisation brace. Refer if not resolving","Marked DRUJ instability — hand surgeon referral for reconstruction assessment"] },
      { id:"uldev",  q:"Ulnar deviation load test?",
        opts:["✓ Pain-free","⚠ Mild discomfort","✗ Ulnar pain — TFCC or triquetral","✗ Click + pain — lunotriquetral"],
        clues:["","Normal","TFCC or ulnar styloid impaction — ulnar variance check X-ray. Wafer procedure if + ulnar variance","Lunotriquetral ligament tear — LT shear test. MRI. Refer hand surgeon if unstable","LT instability — VISI pattern on lateral X-ray. Referral"] },
    ],
    grades:["Normal — Fovea negative, DRUJ stable, ECU pain-free","Compensated — Mild fovea tenderness or minor DRUJ laxity without instability","Abnormal — Positive fovea, DRUJ instability, ECU subluxation, or positive ulnar load test"],
  },
  {
    id:"wfs_scaph", icon:"🦴", label:"Scaphoid / Carpal Screen",
    subtitle:"Anatomical Snuffbox · Watson · Scaphoid Shift",
    phase:"Scaphoid Fracture / SL Ligament Screen",
    setup:"(1) Anatomical snuffbox tenderness (between APL and EPB/EPL — distal to radial styloid). Positive = scaphoid fracture until proven otherwise. (2) Watson (scaphoid shift): thumb on scaphoid tubercle volarly, passive radial deviation. Positive = clunk + pain (SL instability). (3) Scaphoid compression: axial load through thumb. (4) Scaphoid tubercle palpation (volar wrist crease, radial side). (5) Resisted tip pinch (scaphoid load).",
    normalDesc:"Anatomical snuffbox non-tender. Watson test negative (no clunk, no pain). Scaphoid compression pain-free. Scaphoid tubercle non-tender. Pinch grip equal bilateral.",
    observations:[
      { id:"snuff",  q:"Anatomical snuffbox tenderness?",
        opts:["✓ Non-tender","⚠ Mild discomfort — not reproduced pain","✗ Tender — positive screen (fracture until proven)","✗ Tender + bruising/swelling"],
        clues:["","Normal","Snuffbox positive = treat as scaphoid fracture until X-ray (and MRI/CT if X-ray normal). Immobilise thumb spica splint. Refer. Do NOT mobilise","Acute — immobilise immediately. Scaphoid fracture non-union risk is high without early treatment. Imaging urgently. Refer orthopedics"] },
      { id:"watson", q:"Watson test (scaphoid shift)?",
        opts:["✓ Negative — no clunk","⚠ Discomfort but no clunk","✗ Positive — clunk + pain","✗ Positive bilateral (may be hypermobile)"],
        clues:["","Normal SL ligament","Minor SL laxity or dorsal impingement — wrist proprioception + scaphoid stabilisation exercise","SL ligament tear — dorsal intercalated segment instability (DISI) on X-ray. Refer hand surgeon. Wrist stabilisation splint","Bilateral positive — may be constitutional hypermobility (Beighton). Compare to contralateral. Assess for pain + functional limitation"] },
      { id:"compress",q:"Scaphoid compression (axial through thumb)?",
        opts:["✓ Pain-free","⚠ Mild ache","✗ Pain at scaphoid — positive","✗ Severe pain — refer"],
        clues:["","Normal","Mild scaphoid or thumb CMC loading pain — further screen. CMC grind test for basal thumb OA","Scaphoid pain — confirm with snuffbox. Immobilise and image if uncertain","Severe pain — scaphoid fracture or AVN. Emergency management"] },
      { id:"cmc",    q:"Thumb CMC (basal joint) screen — grind test?",
        opts:["✓ Pain-free grind test","⚠ Mild crepitus without pain","✗ Pain + crepitus — CMC OA","✗ Laxity + pain — UCL / Bennett's"],
        clues:["","Normal CMC","Minor CMC OA — activity modification. CMC stabilisation orthosis for gripping. Wrist/hand OA programme","CMC OA — FOPQ (force opposition pinch and grasp) modification. Splint during heavy activity. Intraarticular injection if severe","UCL laxity = skier's / gamekeeper's thumb. Ulnar collateral ligament integrity test. Immobilise if acute + refer"] },
      { id:"dequerv",q:"De Quervain's screen (Finkelstein)?",
        opts:["✓ Finkelstein negative","⚠ Mild first dorsal compartment tenderness","✗ Positive Finkelstein — reproduction of radial wrist pain","✗ Positive + crepitus / snapping"],
        clues:["","Normal APL/EPB tendons","Mild first dorsal compartment irritation — load modification. Thumb spica splint during activity","De Quervain's tenosynovitis — thumb spica splint, IASTM or soft tissue therapy, injection if not responding. Graduated return","Crepitus / snapping = intersecting syndrome (APL/ECRB crossing). More proximal. Treat with IASTM + load modification"] },
    ],
    grades:["Normal — Snuffbox negative, Watson negative, CMC pain-free","Compensated — Mild tenderness or minor findings without instability","Abnormal — Snuffbox positive (fracture screen), Watson clunk, CMC OA pain, or positive Finkelstein"],
  },
  {
    id:"wfs_fingers", icon:"🖐️", label:"Finger / Digit Screen",
    subtitle:"PIP/DIP AROM · Tendon Integrity · Collateral Stability",
    phase:"Digital Joint / Flexor-Extensor Assessment",
    setup:"(1) MCP/PIP/DIP flexion: full composite fist (fingertips to distal palmar crease). Extension: full digit extension. (2) Intrinsic tightness (Bunnell-Littler): PIP flexion at 0° MCP vs 45° MCP — tighter at 0° = intrinsic tightness. (3) FDP integrity: hold PIP in extension — patient flexes DIP. (4) Extensor zone: mallet, boutonniere, swan neck patterns. (5) Collateral ligament: RCL/UCL stress at PIP/MCP.",
    normalDesc:"Composite fist: fingertips to distal palmar crease. Full digit extension. Bunnell-Littler negative. FDP intact (active DIP flexion with PIP stabilised). No extensor zone deformity. Collateral ligaments stable.",
    observations:[
      { id:"fist",   q:"Composite fist (fingertips to crease)?",
        opts:["✓ Fingertips touch distal palmar crease","⚠ Fingertip 1–2cm from crease","✗ Fingertip >2cm from crease","✗ One finger significantly restricted"],
        clues:["","Minor flexor tendon tightness or joint restriction — flexor tendon gliding + blocking exercises","Significant restriction — place and hold exercises + joint mobilisation at restricted PIP/DIP level","Isolated digit restriction — screen for trigger finger (FDP/FDS tendon nodule), volar plate contracture, or post-fracture"] },
      { id:"ext",    q:"Digit extension (composite)?",
        opts:["✓ Full extension all digits","⚠ Mild MCP lag one digit","✗ Extensor lag at MCP (ED)","✗ Extensor lag at PIP (boutonniere)"],
        clues:["","Monitor — minor intrinsic tightness or MCP joint restriction","Sagittal band disruption at MCP — ED subluxation. Dorsal blocking splint. Buddy strap if unstable","Boutonnière deformity — central slip rupture. PIP extension splint, DIP active flexion while PIP extended. Refer if acute complete rupture"] },
      { id:"mallet", q:"DIP posture / mallet finger?",
        opts:["✓ DIP fully extends","⚠ Mild DIP extension lag (<20°)","✗ Mallet finger — DIP flexed at rest","✗ Mallet + fracture (bony mallet)"],
        clues:["","Monitor — minor extensor tendon laxity","Mallet finger — DIP extension splint continuously 6–8 weeks + active flexion at PIP. Patient education critical (never remove splint for 8 weeks)","Bony mallet — >1/3 articular surface or volar subluxation of DIP. Refer hand surgeon. Surgical fixation may be needed"] },
      { id:"bunnell",q:"Bunnell-Littler test (intrinsic tightness)?",
        opts:["✓ Negative — equal PIP flex at 0° and 45° MCP","⚠ Mild — slightly tighter at 0° MCP","✗ Positive — significantly tighter at 0° MCP","✗ Positive bilateral — systemic?"],
        clues:["","Normal","Minor intrinsic tightness — intrinsic stretching (composite flexion with MCP extension)","Positive Bunnell-Littler = intrinsic contracture. Common in RA, compartment syndrome sequelae. Intrinsic stretching + MCP mobilisation","Bilateral = rheumatological screen. RA, psoriatic arthropathy. Refer rheumatology if suspected inflammatory pattern"] },
      { id:"fdp",    q:"FDP integrity (isolated DIP flexion)?",
        opts:["✓ Active DIP flexion with PIP stabilised","⚠ Weak but present DIP flexion","✗ No DIP flexion — FDP absent","✗ Trigger on active flexion"],
        clues:["","Normal","FDP inhibition — pain or adhesion. Active-assisted DIP flexion exercises + blocking","FDP avulsion or rupture — jersey finger. Urgent surgical referral (within days for zone 1). Do not delay","Triggering = stenosing tenosynovitis. A1 pulley thickening. Corticosteroid injection or surgical release if conservative fails"] },
    ],
    grades:["Normal — Composite fist, full extension, intact FDP, no deformity","Compensated — Minor flexion deficit or mild intrinsic tightness without instability","Abnormal — Extensor deformity, FDP absence, boutonnière/mallet, or instability"],
  },
];

function WristFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["wffs_data"];
    if (saved && typeof saved === "string") {
      try { const p=JSON.parse(saved); if(p.findings)setFindings(p.findings); if(p.grades)setGrades(p.grades); if(p.notes)setNotes(p.notes); } catch {}
    }
  }, []);

  const save = (f,g,n) => set("wffs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = WRIST_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";
  const accentCol = "#be185d";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(190,24,93,0.08),rgba(236,72,153,0.05))",border:"1px solid rgba(190,24,93,0.22)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🖐️</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Wrist / Hand Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · AROM/grip · Carpal tunnel · TFCC · Scaphoid · Digits</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:accentCol}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>
          <div style={{fontSize:"0.75rem",color:"#dc2626",fontWeight:700}}>⚠ Positive anatomical snuffbox = scaphoid fracture until proven otherwise. Immobilise + refer immediately.</div>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {WRIST_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?accentCol:done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?`${accentCol}12`:done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?accentCol:done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ")[0]} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {WRIST_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?accentCol:graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(190,24,93,0.09)":"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>
                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{background:"#FDF2F8",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #FBCFE8"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:`${accentCol}08`,borderRadius:6,border:`1px solid ${accentCol}20`}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:accentCol}}>Phase: {t.phase}</div>
                  </div>
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:`${accentCol}06`,borderLeft:`3px solid ${accentCol}`,borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Grip strength values, Phalen timing, Watson clunk, scaphoid tenderness..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#FDF2F8",borderRadius:14,padding:14,border:"1px solid #FBCFE8",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 Wrist/Hand Screen Summary</div>
          {WRIST_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TMJ FUNCTIONAL SCREEN ───────────────────────────────────────────────────

const TMJ_TESTS = [
  {
    id:"tmj_arom", icon:"🔄", label:"Jaw AROM Screen",
    subtitle:"Opening · Lateral Deviation · Protrusion",
    phase:"TMJ Articular / Disc Displacement Screen",
    setup:"Patient seated. Assess: (1) Mouth opening — normal 40–55mm (3 finger widths between upper/lower incisors). (2) Lateral excursion L/R — normal 8–12mm each. (3) Protrusion — normal 6–9mm. (4) End-feel on opening: hard = bony block, firm = capsular/disc, soft = muscle. (5) Path of opening: straight = normal, S-curve or C-curve deviation = disc or muscle asymmetry.",
    normalDesc:"Opening ≥40mm (3 finger widths). Straight path with no deviation. Lateral excursion 8–12mm bilateral symmetric. Protrusion 6–9mm. Firm end-feel. No pain. No clicking.",
    observations:[
      { id:"open",   q:"Mouth opening distance?",
        opts:["✓ ≥40mm (3 finger widths)","⚠ 30–39mm (mild restriction)","✗ <30mm (moderate restriction)","✗ <25mm (severe restriction — cannot eat normally)"],
        clues:["","Minor capsular or pterygoid restriction — lateral pterygoid stretching + self-mobilisation. Warm pack","Significant — may be acute disc lock (closed lock) if sudden onset. Screen for disc displacement. Manual mobilisation with patient consent","Severe — acute closed lock or capsulitis. Refer TMD specialist / oral surgeon. Do not force opening"] },
      { id:"path",   q:"Path of opening?",
        opts:["✓ Straight — no deviation","⚠ Deflection — curves and stays one side","✗ Deviation — curves and returns midline","✗ S-curve bilateral"],
        clues:["","Normal","Deflection to one side = restricted disc or muscle on that side. Contralateral lateral pterygoid weakness. Lateral excursion to restricted side","Deviation + return midline = disc with reduction. Clicking often accompanies. Monitor — self-care + posture + avoid wide opening","S-curve = bilateral restriction. Bilateral pterygoid muscle guarding or bilateral disc dysfunction"] },
      { id:"lat",    q:"Lateral excursion symmetry?",
        opts:["✓ 8–12mm bilateral symmetric","⚠ Mild asymmetry (<3mm difference)","✗ Significant asymmetry (>3mm) or restriction","✗ Contralateral lateral excursion absent"],
        clues:["","Normal","Minor lateral pterygoid or disc asymmetry — joint mobilisation in restriction direction. Lateral stretching exercise","Significant — ipsilateral disc displacement without reduction, lateral pterygoid hypertonic, or condylar pathology","Absent contralateral excursion = ipsilateral medial pterygoid contracture or condylar ankylosis. Refer"] },
      { id:"prot",   q:"Protrusion (jaw forward)?",
        opts:["✓ 6–9mm, pain-free","⚠ Restricted or mildly painful","✗ Pain on protrusion","✗ Cannot protlude (ankylosis / bilateral)"],
        clues:["","Normal","Posterior capsule or retrodiscal tissue irritation — avoid protrusion loading. Slow return to range","Retrodiscal tissue pain — avoid bruxism + wide opening. Occlusal splint may offload","Bilateral restriction — consult with dentist / oral surgeon for imaging (OPG + MRI TMJ)"] },
      { id:"endfeel",q:"End-feel on maximum opening?",
        opts:["✓ Firm — capsular","⚠ Soft — muscle guarding","✗ Hard — bony block","✗ Empty — pain before end range"],
        clues:["","Normal capsular restriction — mobilisation as appropriate","Muscle guarding — address bruxism, stress, masseter / medial pterygoid hypertension first. Dry needling / trigger point","Bony block — condylar osteophyte, eminence, or fibrous ankylosis. OPG imaging referral","Empty end-feel — acute inflammation or retrodiscal pain. Anti-inflammatory management first"] },
    ],
    grades:["Normal — ≥40mm opening, straight path, symmetric lateral excursion","Compensated — 30–39mm or mild deviation without pain at rest","Abnormal — <30mm, disc lock, pain on opening, or absent lateral excursion"],
  },
  {
    id:"tmj_click", icon:"💥", label:"Joint Sound Screen",
    subtitle:"Clicking · Crepitus · Disc With/Without Reduction",
    phase:"Disc Displacement Classification",
    setup:"Palpate bilateral TMJ (lateral pole and posterior) during full opening-closing cycle. Note: (1) Timing of click (early / mid / late on opening), (2) Reciprocal click (opening + closing), (3) Crepitus (fine / coarse), (4) Lock (cannot open or close). Pain vs painless click. Compare bilateral. Auscultation if available.",
    normalDesc:"Silent opening and closing. No click, no crepitus, no catching. No locking. Palpation: mild condyle translation bilaterally, non-tender.",
    observations:[
      { id:"click",  q:"Click on opening?",
        opts:["✓ No click","⚠ Painless click — no functional limitation","✗ Painful click","✗ Click + limitation of opening"],
        clues:["","Normal","Disc displacement with reduction (DDwR) — painless click common in general population. Educate: self-care, avoid wide opening, bruxism management. Does not require treatment if painless","Painful DDwR — disc displacement with pain on reduction. TMD physiotherapy: mandibular repositioning, lateral pterygoid strengthening, occlusal splint","DDwR + limited opening — catching disc. Manipulation may reduce. Refer if persistent locked"] },
      { id:"recip",  q:"Reciprocal click (opening + closing)?",
        opts:["✓ No click","⚠ Opening click only","✗ Reciprocal click (opening + closing)","✗ Click then lock (intermittent closed lock)"],
        clues:["","Normal","Disc displacement with reduction during opening only — classic early DDwR. Monitor, self-care","Classic DDwR — disc clicks on in opening, out on closing. Educate + posture + avoid provoking movements. Refer if progressive","Progression to intermittent closed lock — refer TMD specialist. May require manipulation or arthrocentesis"] },
      { id:"crepit", q:"Crepitus on movement?",
        opts:["✓ No crepitus","⚠ Fine crepitus end range","✗ Coarse crepitus throughout range","✗ Crepitus + condylar tenderness"],
        clues:["","Normal","Fine crepitus — degenerative change early stage. Load management, jaw rest phases, soft diet","Coarse crepitus = TMJ OA (degenerative joint disease). OPG imaging. Load management + joint protection education + anti-inflammatory","Condylar tenderness + crepitus — acute OA or condylar resorption. Refer for imaging and dental consultation"] },
      { id:"lock",   q:"Locking (open or closed)?",
        opts:["✓ No locking","⚠ Occasional transient catching","✗ Closed lock — cannot open adequately","✗ Open lock — cannot close"],
        clues:["","Normal","Intermittent catching = transitional disc — self-manipulation technique (lateral chin tuck + gentle manipulation). Education","Closed lock — acute disc displacement without reduction. Urgent referral for manual distraction / arthrocentesis if <2 weeks. If chronic — jaw opening exercises + occlusal splint","Open lock / hypermobility — condyle dislocating anterior to eminence. Avoid wide opening. Occlusal splint. Refer if recurrent"] },
      { id:"bilat",  q:"Bilateral vs unilateral findings?",
        opts:["✓ No pathological sounds","⚠ Unilateral only","✗ Bilateral — same type","✗ Bilateral — different type each side"],
        clues:["","Normal","Unilateral — most common. Address symptomatic side. Monitor asymptomatic","Bilateral same = systemic process (RA, psoriatic, bruxism bilateral). Rheumatological screen. Full TMD assessment","Bilateral different = each side at different stage of disc displacement. Complex TMD. Dental/oral surgery referral recommended"] },
    ],
    grades:["Normal — No click, no crepitus, no locking","Compensated — Painless click without functional limitation","Abnormal — Painful click, crepitus, reciprocal click + pain, or locking"],
  },
  {
    id:"tmj_muscle", icon:"💪", label:"Masticatory Muscle Palpation",
    subtitle:"Masseter · Temporalis · Pterygoids · SCM",
    phase:"Myofascial / Muscle Guarding Screen",
    setup:"Bilateral palpation: (1) Masseter (lateral jaw — superficial and deep): 2 finger widths below zygomatic arch. (2) Temporalis (temporal fossa, anterior/middle/posterior fibres). (3) Lateral pterygoid (intraoral — just medial to upper molars, posterior). (4) Medial pterygoid (angle of mandible, medial surface). (5) SCM (refer to temple/eye). (6) Suboccipital muscles. Note: VAS pain 0–10, referral pattern, taut band.",
    normalDesc:"All muscles non-tender. No taut bands. No referred pain on palpation. Bilateral symmetric. Jaw closes symmetrically. No temporal headache on temporalis palpation.",
    observations:[
      { id:"mass",   q:"Masseter tenderness?",
        opts:["✓ Non-tender","⚠ Mildly tender — pressure required","✗ Tender — patient pain reproduced","✗ Tender + hardened/hypertrophied"],
        clues:["","Normal","Masseter myalgia — common in bruxism. Dry needling / trigger point massage. Bruxism management (occlusal splint)","Masseter pain reproduction = primary TMD myalgia. High priority muscle in TMD. Dry needling, massage, biofeedback, bruxism guard","Masseter hypertrophy — chronic bruxism. Botox referral if severe. Occlusal splint + stress management"] },
      { id:"temp",   q:"Temporalis tenderness?",
        opts:["✓ Non-tender","⚠ Mildly tender","✗ Tender — temporal headache reproduced","✗ Tender + temporal headache at rest"],
        clues:["","Normal","Minor temporalis myalgia — massage, jaw rest phase, reduce gum chewing","Temporal headache reproduction = temporalis trigger point referring to head. Classic temporal headache + jaw clenching pattern. Dry needling + bruxism management","Temporalis headache at rest = chronic tension-type headache with TMD component. Pain physiology education + combined cervical/TMD treatment"] },
      { id:"pteryg", q:"Lateral pterygoid provocation?",
        opts:["✓ No pain on intraoral palpation","⚠ Mildly tender","✗ Pain reproduced on palpation","✗ Pain on palpation + resisted protrusion"],
        clues:["","Normal","Minor LP involvement — common. Monitor. Opening exercise for LP length","LP tenderness = LP myalgia or retrodiscal strain. Jaw opening in limited range + side-to-side exercise. Avoid wide opening","Pain + resisted protrusion = LP strain / disc dysfunction. Refer if clicking + LP pain — anterior disc displacement mechanism"] },
      { id:"suboc",  q:"Suboccipital muscles (cervical-TMD link)?",
        opts:["✓ Non-tender","⚠ Mildly tender","✗ Tender — reproduces headache","✗ Tender + jaw symptoms change with suboccipital release"],
        clues:["","Normal","Minor suboccipital involvement — cervical posture correction + suboccipital release","Cervicogenic headache component. Watson headache approach. C1/C2/C3 assessment. Upper cervical mobilisation + suboccipital release","Suboccipital release changes TMJ symptoms = strong cervical-TMD link. Treat cervical component alongside TMD. Cervical mobilisation may improve jaw opening"] },
      { id:"scm_tmj",q:"SCM palpation — referred pain to jaw/face?",
        opts:["✓ Non-tender","⚠ Tender but no referral","✗ Referral to temple or cheek","✗ Referral to eye / teeth (toothache)"],
        clues:["","Normal","SCM myalgia — common with FHP. SCM stretching + postural correction","SCM trigger point referring to temple = cervicogenic component of temporal headache. Trigger point release + cervical mobilisation","SCM trigger point referring to eye or simulating toothache — classic SCM referral pattern. Distinguish from dental pathology. Cervical + TMD combined treatment"] },
    ],
    grades:["Normal — All muscles non-tender, no referral, no headache reproduction","Compensated — Mild tenderness without referral or functional limitation","Abnormal — Pain reproduction, headache triggered, or significant muscle hypertrophy"],
  },
  {
    id:"tmj_cerv", icon:"🔗", label:"Cervical-TMJ Relationship",
    subtitle:"CVA · C1/C2 · Watson Headache · Posture Link",
    phase:"Cervico-Mandibular Screen",
    setup:"The TMJ and cervical spine are biomechanically linked. Screen: (1) CVA assessment — FHP worsens condylar positioning. (2) Atlanto-axial rotation (C1/C2): cervical rotation test seated. (3) Watson headache test: PA on C2 — reproduces head/jaw symptoms? (4) Does chin tuck change jaw symptoms? (5) Does jaw positioning change neck symptoms? (6) Upper cervical palpation: C0/C1/C2 segmental tenderness.",
    normalDesc:"CVA >50°. C1/C2 rotation symmetric (80° bilateral). Watson test negative (PA on C2 does not reproduce head or jaw symptoms). Chin tuck does not change jaw pain. No C0/C1/C2 tenderness.",
    observations:[
      { id:"cva_tmj",q:"CVA and forward head posture effect on jaw?",
        opts:["✓ CVA >50° — jaw unaffected","⚠ CVA 45–50° — mild jaw tension","✗ CVA <45° — jaw posture affected","✗ Jaw opens less in erect vs slumped posture"],
        clues:["","Normal — minimal postural contribution","Minor postural contribution — FHP correction may improve jaw symptoms. DNF activation + postural education","Significant FHP — condylar position changes with head posture. Cervical correction priority. Foam roller + chin tuck before TMD-specific treatment","Postural jaw relationship confirmed — treat posture first then reassess jaw ROM. Highly responsive to cervical correction"] },
      { id:"watson", q:"Watson headache test (PA on C2) — jaw/head symptom?",
        opts:["✓ Negative — no symptom change","⚠ Positive — head symptoms reproduced","✗ Positive — jaw symptoms reproduced by C2 PA","✗ Positive — both jaw and head reproduced"],
        clues:["","Normal — cervical not primary driver of TMD","Cervicogenic headache — C2/3 nociceptive source. Watson headache approach. Upper cervical mobilisation C1/C2/C3","C2 PA reproducing jaw symptoms = strong cervico-mandibular link. Upper cervical mobilisation may directly improve jaw symptoms. Priority: treat C2/3 segment","Combined cervico-TMD — upper cervical + TMD combined treatment most effective. Watson + Rocabado approach"] },
      { id:"chintu", q:"Does chin tuck change jaw symptoms?",
        opts:["✓ No change — isolated TMD likely","⚠ Minor improvement","✗ Jaw pain reduces with chin tuck","✗ Jaw opens more with chin tuck"],
        clues:["","Isolated TMD — treat locally","Minor cervical contribution — teach chin tuck as home exercise","Significant improvement with chin tuck = postural jaw component. DNF activation + postural correction core of treatment","Jaw opens more with chin tuck = upper cervical restriction affecting condylar translation. Upper cervical mobilisation to improve jaw opening"] },
      { id:"sleep",  q:"Sleep position / bruxism screening?",
        opts:["✓ No clenching / grinding reported","⚠ Morning jaw stiffness only","✗ Partner reports grinding at night","✗ Toothwear pattern + jaw pain on waking"],
        clues:["","Normal — assess stress, occlusion","Morning stiffness = parafunctional clenching likely. Occlusal screen + stress management education","Nocturnal bruxism confirmed — refer dentist for hard acrylic occlusal splint. Jaw rest protocol. Stress management","Toothwear + jaw pain = severe bruxism. Dental referral urgent (tooth preservation). Hard splint + physiotherapy combined"] },
      { id:"occlus", q:"Occlusal / bite concerns?",
        opts:["✓ No occlusal symptoms reported","⚠ Unilateral chewing preference","✗ Bite feels 'off' or uneven","✗ Recent dental work + new TMD symptoms"],
        clues:["","Normal","Unilateral chewing = muscular asymmetry or disc displacement preventing comfortable bilateral chewing. Strengthen weaker side, open exercises","Malocclusion contributing — refer dentist for occlusal assessment. Physiotherapy for muscle and disc component","Post-dental TMD — common after extraction, prolonged opening. Refer dentist + mobilise TMJ gently"] },
    ],
    grades:["Normal — CVA >50°, Watson negative, no postural jaw link","Compensated — Mild postural contribution without pain or functional limitation","Abnormal — Watson positive, jaw changes with chin tuck, bruxism confirmed, or occlusal complaints"],
  },
  {
    id:"tmj_head", icon:"🤕", label:"Headache Classification Screen",
    subtitle:"Cervicogenic · Tension-Type · TMD-Related",
    phase:"Headache Differential Screen",
    setup:"Classify headache type to guide treatment: (1) Location — unilateral/bilateral, frontal/temporal/occipital/vertex. (2) Quality — pressure/throbbing/stabbing. (3) Duration — episodic (<4h / 4–72h) vs chronic (>15 days/month). (4) Triggers — jaw clenching, posture, stress, weather, food. (5) Associated features — nausea, photophobia, aura (migraine vs non-migraine). (6) Neck involvement — worse with neck movement, relieved by cervical treatment.",
    normalDesc:"No headache. Or clear migraine classification with neurological features absent. Or cervicogenic — unilateral, neck-movement triggered, relieved by cervical treatment. No red flags.",
    observations:[
      { id:"location",q:"Headache location?",
        opts:["✓ No headache","⚠ Bilateral frontal / band-like (tension-type)","✗ Unilateral — with/without autonomic features","✗ Vertex / parietal / occipital"],
        clues:["","Normal","Tension-type headache — bilateral pressure band. TMD + cervical components common. Treat both + stress management","Unilateral with autonomic features (lacrimation, nasal congestion) = trigeminal autonomic cephalalgia (TAC) group — refer neurology. Without autonomics = cervicogenic or migraine","Occipital = cervicogenic most likely. Vertex = tension-type or raised ICP (red flag if thunderclap). Watson test for cervicogenic"] },
      { id:"redflag",q:"Red flag screen?",
        opts:["✓ No red flags","⚠ New headache — not typical pattern","✗ Worst headache of life / thunderclap","✗ Progressive headache + neurological symptoms"],
        clues:["","Normal — proceed with treatment","New headache in patient >50 or new pattern — screen red flags carefully. Refer if uncertain","Thunderclap headache = subarachnoid haemorrhage until proven otherwise. EMERGENCY referral immediately","Progressive headache + neuro signs (visual, weakness, confusion) = space-occupying lesion / hydrocephalus. EMERGENCY referral"] },
      { id:"cerviog",q:"Cervicogenic features?",
        opts:["✓ No cervicogenic features","⚠ Headache worsens with neck movement","✗ Unilateral headache + restricted cervical rotation","✗ Watson test positive + headache reproduced"],
        clues:["","Not cervicogenic — focus on local TMD or migraine management","Possible cervicogenic contribution — screen Watson test, upper cervical AROM","Probable cervicogenic headache — Sjaastad criteria: unilateral, side-locked, neck movement triggers, cervical sign positive","Confirmed cervicogenic — upper cervical mobilisation (C1/2/3) + Watson headache technique. Highly responsive to manual therapy"] },
      { id:"migraine",q:"Migraine features?",
        opts:["✓ No migraine features","⚠ Migraine without aura — possible","✗ Migraine with aura — typical","✗ Chronic migraine + TMD coexisting"],
        clues:["","Normal","Monitor — may have cervicogenic + migraine components. Treat cervical component to reduce migraine frequency","Migraine with aura — refer GP for diagnosis + medication management. Physiotherapy for cervical component may reduce frequency. Not primary physiotherapy condition","Chronic migraine + TMD = complex presentation. Multidisciplinary management. Physiotherapy for cervical/TMD component + GP/neurologist for migraine prophylaxis"] },
      { id:"tmdhea", q:"TMD-related headache features?",
        opts:["✓ No TMD headache link","⚠ Headache on waking only — bruxism?","✗ Temporal headache + masseter/temporalis pain","✗ Headache worsens with jaw use / eating"],
        clues:["","Normal","Morning headache = nocturnal bruxism. Occlusal splint + bruxism education + stress management","TMD headache — temporalis trigger point + masseter involvement. Dry needling + occlusal splint + TMD physiotherapy","Headache with jaw use = masticatory myalgia + headache. Jaw rest protocol + soft diet short-term + TMD rehabilitation"] },
    ],
    grades:["Normal — No headache or clear non-serious classification","Compensated — Cervicogenic or tension-type without red flags, responsive to treatment","Abnormal — Red flags present, progressive headache, or complex migraine + TMD + cervical combined"],
  },
];

function TMJFunctionalScreen({ data, set }) {
  const [activeTest, setActiveTest] = useState(null);
  const [findings, setFindings] = useState({});
  const [grades, setGrades] = useState({});
  const [notes, setNotes] = useState({});
  const [showVisual, setShowVisual] = useState(true);
  const [hdrOpen, setHdrOpen] = useState(true);

  useEffect(() => {
    const saved = data["tmjfs_data"];
    if (saved && typeof saved === "string") {
      try { const p=JSON.parse(saved); if(p.findings)setFindings(p.findings); if(p.grades)setGrades(p.grades); if(p.notes)setNotes(p.notes); } catch {}
    }
  }, []);

  const save = (f,g,n) => set("tmjfs_data", JSON.stringify({findings:f,grades:g,notes:n}));
  const setObs   = (tid,oid,val) => { const nf={...findings,[`${tid}_${oid}`]:val}; setFindings(nf); save(nf,grades,notes); };
  const setGrade = (tid,val)     => { const ng={...grades,[tid]:val}; setGrades(ng); save(findings,ng,notes); };
  const setNote  = (tid,val)     => { const nn={...notes,[tid]:val}; setNotes(nn); save(findings,grades,nn); };

  const completedCount = TMJ_TESTS.filter(t => grades[t.id] !== undefined).length;
  const gradeColor = (g) => g===0?"#059669":g===1?"#d97706":"#dc2626";
  const accentCol = "#b45309";

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,rgba(180,83,9,0.08),rgba(245,158,11,0.05))",border:"1px solid rgba(180,83,9,0.22)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:"1.4rem"}}>🦷</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>TMJ Functional Screen</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>5 tests · AROM · Disc sounds · Muscles · Cervical link · Headache</div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:accentCol}}>{completedCount}/5</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>graded</div>
          </div>
            <button type="button" onClick={()=>setHdrOpen(o=>!o)} style={{marginLeft:8,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 9px",fontSize:"0.8rem",color:C.muted,cursor:"pointer",flexShrink:0,alignSelf:"center"}}>{hdrOpen?"▲":"▼"}</button>
        </div>
        <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>
          <div style={{fontSize:"0.75rem",color:"#dc2626",fontWeight:700}}>⚠ Screen red-flag headache features before any treatment. Thunderclap or progressive headache = emergency referral.</div>
        </div>
        {hdrOpen && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TMJ_TESTS.map(t=>{
            const g=grades[t.id]; const done=g!==undefined;
            return (
              <div key={t.id} onClick={()=>setActiveTest(activeTest===t.id?null:t.id)}
                style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:"0.78rem",fontWeight:700,
                  border:`1px solid ${activeTest===t.id?accentCol:done?gradeColor(g)+"60":C.border}`,
                  background:activeTest===t.id?`${accentCol}12`:done?`${gradeColor(g)}10`:"transparent",
                  color:activeTest===t.id?accentCol:done?gradeColor(g):C.muted}}>
                {t.icon} {t.label.split(" ")[0]} {done?["✓","⚠","✗"][g]:""}
              </div>
            );
          })}
        </div>
          )}
      </div>

      {TMJ_TESTS.map(t=>{
        const isOpen=activeTest===t.id; const g=grades[t.id]; const graded=g!==undefined;
        return (
          <div key={t.id} style={{marginBottom:10,background:C.surface,borderRadius:14,
            border:`1.5px solid ${isOpen?accentCol:graded?gradeColor(g)+"50":C.border}`,
            overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(180,83,9,0.09)":"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div onClick={()=>setActiveTest(isOpen?null:t.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${graded?gradeColor(g):C.border}`}}>
              <SmallClinicalImg id={t.id} title={t.label} />
              <span style={{fontSize:"1.4rem",flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:"0.85rem",color:C.text}}>{t.label}</div>
                <div style={{fontSize:"0.75rem",color:C.muted}}>{t.subtitle}</div>
              </div>
              {graded && <span style={{padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${gradeColor(g)}15`,color:gradeColor(g),flexShrink:0}}>{["Normal","Compensated","Abnormal"][g]}</span>}
              <span style={{color:C.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={{padding:"0 14px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Reference</div>
                  <button onClick={()=>setShowVisual(v=>!v)} style={{fontSize:"0.8rem",padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>{showVisual?"Hide":"Show"}</button>
                </div>
                {showVisual && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"#ECFDF5",borderRadius:10,padding:"10px 12px",border:"1px solid #A7F3D0"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#059669",marginBottom:6,textTransform:"uppercase"}}>✓ Normal</div>
                      <div style={{fontSize:"0.82rem",color:"#1a5c40",lineHeight:1.6}}>{t.normalDesc}</div>
                    </div>
                    <div style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",border:"1px solid #FECACA"}}>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:"#dc2626",marginBottom:6,textTransform:"uppercase"}}>⚠ Watch For</div>
                      <div style={{fontSize:"0.8rem",color:"#7f1d1d",lineHeight:1.6}}>
                        {t.observations.flatMap(o=>o.opts.filter(x=>x.startsWith("✗")).map(x=>x.replace(/^✗\s*/,""))).slice(0,5).map((x,i)=>(
                          <div key={i} style={{marginBottom:2}}>• {x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{background:"#FFFBEB",borderRadius:9,padding:"9px 11px",marginBottom:12,border:"1px solid #FDE68A"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:accentCol,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>🎯 Setup & Procedure</div>
                  <div style={{fontSize:"0.75rem",color:C.text,lineHeight:1.6}}>{t.setup}</div>
                  <div style={{marginTop:6,padding:"4px 8px",background:`${accentCol}08`,borderRadius:6,border:`1px solid ${accentCol}20`}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:accentCol}}>Phase: {t.phase}</div>
                  </div>
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>👁 What To Observe</div>
                {t.observations.map(obs=>{
                  const val=findings[`${t.id}_${obs.id}`]; const clue=val!==undefined?obs.clues[val]:null;
                  return (
                    <div key={obs.id} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:C.text,marginBottom:5}}>{obs.q}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {obs.opts.map((opt,idx)=>{
                          const sel=val===idx; const col=opt.startsWith("✓")?"#059669":opt.startsWith("⚠")?"#d97706":"#dc2626";
                          return (
                            <div key={idx} onClick={()=>setObs(t.id,obs.id,sel?undefined:idx)}
                              style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",
                                border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}10`:C.s2,transition:"all 0.12s"}}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {sel && <span style={{fontSize:8,color:"#fff",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:"0.82rem",fontWeight:sel?700:400,color:sel?col:C.text,lineHeight:1.35}}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {clue && <div style={{marginTop:5,padding:"6px 10px",background:`${accentCol}06`,borderLeft:`3px solid ${accentCol}`,borderRadius:"0 6px 6px 0",fontSize:"0.78rem",color:C.text,lineHeight:1.5}}><strong>Clinical note:</strong> {clue}</div>}
                    </div>
                  );
                })}
                <div style={{fontSize:"0.78rem",fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:4}}>📊 Grade This Test</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  {t.grades.map((gLabel,idx)=>{
                    const col=gradeColor(idx); const sel=g===idx;
                    return (
                      <div key={idx} onClick={()=>setGrade(t.id,sel?undefined:idx)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1.5px solid ${sel?col:C.border}`,background:sel?`${col}12`:C.s2}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${sel?col:C.border}`,background:sel?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {sel && <span style={{fontSize:9,color:"#fff",fontWeight:900}}>{["✓","⚠","✗"][idx]}</span>}
                        </div>
                        <span style={{fontSize:"0.73rem",fontWeight:sel?700:400,color:sel?col:C.text}}>{gLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,marginBottom:4}}>Therapist notes</div>
                <textarea value={notes[t.id]||""} onChange={e=>setNote(t.id,e.target.value)}
                  placeholder="Opening mm, click timing, muscle VAS, Watson result, headache features..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,padding:"8px 10px",fontSize:"0.82rem",fontFamily:"inherit",resize:"vertical",minHeight:56,outline:"none"}}/>
              </div>
            )}
          </div>
        );
      })}

      {completedCount > 0 && (
        <div style={{background:"#FFFBEB",borderRadius:14,padding:14,border:"1px solid #FDE68A",marginTop:4}}>
          <div style={{fontWeight:800,color:C.text,marginBottom:10}}>📋 TMJ Screen Summary</div>
          {TMJ_TESTS.filter(t=>grades[t.id]!==undefined).map(t=>{
            const g=grades[t.id]; const col=gradeColor(g);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:"1rem"}}>{t.icon}</span>
                <span style={{flex:1,fontSize:"0.75rem",fontWeight:600,color:C.text}}>{t.label}</span>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,background:`${col}15`,color:col}}>{["Normal","Compensated","Abnormal"][g]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FUNCTIONAL SCREEN HUB ───────────────────────────────────────────────────

function FunctionalScreenHub({ data, set, navTo=()=>{}, navContext={} }) {
  const regions = [
    { id:"lumbar",   label:"Lumbar",    icon:"🦴", color:"#7c3aed" },
    { id:"shoulder", label:"Shoulder",  icon:"🦾", color:"#0891b2" },
    { id:"hip",      label:"Hip",       icon:"🦷", color:"#d946ef" },
    { id:"knee",     label:"Knee",      icon:"🦿", color:"#d97706" },
    { id:"ankle",    label:"Ankle",     icon:"🦶", color:"#0d9488" },
    { id:"cervical", label:"Cervical",  icon:"🧠", color:"#7c3aed" },
    { id:"thoracic", label:"Thoracic",  icon:"🫁", color:"#0f766e" },
    { id:"elbow",    label:"Elbow",     icon:"💪", color:"#0369a1" },
    { id:"wrist",    label:"Wrist/Hand",icon:"🖐️", color:"#be185d" },
    { id:"tmj",      label:"TMJ",       icon:"🦷", color:"#b45309" },
  ];

  // All tests across all regions for search
  const ALL_TESTS = {
    lumbar:   LUMBAR_TESTS,
    shoulder: SHOULDER_TESTS,
    hip:      HIP_TESTS,
    knee:     KNEE_TESTS,
    ankle:    ANKLE_TESTS,
    cervical: CERVICAL_TESTS,
    thoracic: THORACIC_TESTS,
    elbow:    ELBOW_TESTS,
    wrist:    WRIST_TESTS,
    tmj:      TMJ_TESTS,
  };

  const initRegion = () => {
    if (navContext.fsRegion && regions.find(r=>r.id===navContext.fsRegion)) return navContext.fsRegion;
    return "lumbar";
  };

  const [region, setRegion] = useState(initRegion);
  const [search, setSearch] = useState("");
  const [fmsMobileSearch, setFmsMobileSearch] = useState(false);

  // Respond to navContext changes (from subjective suggestions)
  useEffect(()=>{
    if (navContext.fsRegion && regions.find(r=>r.id===navContext.fsRegion)) {
      setRegion(navContext.fsRegion);
      setSearch("");
    }
  },[navContext.fsRegion]);

  // Search results: [{regionId, regionLabel, regionIcon, test}]
  const searchResults = React.useMemo(()=>{
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const results = [];
    regions.forEach(r=>{
      (ALL_TESTS[r.id]||[]).forEach(t=>{
        if (
          t.label.toLowerCase().includes(q) ||
          (t.subtitle||"").toLowerCase().includes(q) ||
          (t.phase||"").toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q)
        ) {
          results.push({ regionId:r.id, regionLabel:r.label, regionIcon:r.icon, regionColor:r.color, test:t });
        }
      });
    });
    return results;
  },[search]);

  const selR = regions.find(r=>r.id===region)||regions[0];

  return (
    <div>
      {/* Search bar — desktop: always visible. Mobile: magnifying glass toggle */}
      <div className="pm-desktop-only" style={{position:"relative",marginBottom:12}}>
        <input
          type="text"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search tests or regions… (e.g. ASLR, Deep Squat, shoulder)"
          style={{width:"100%",boxSizing:"border-box",padding:"10px 36px 10px 14px",borderRadius:10,
            border:`1.5px solid ${search?C.accent:C.border}`,background:C.s2,color:C.text,
            fontSize:"0.8rem",fontFamily:"inherit",outline:"none"}}
        />
        {search && (
          <button onClick={()=>setSearch("")} type="button"
            style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
              background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"1rem",padding:0}}>
            ✕
          </button>
        )}
      </div>
      {/* Mobile: expanded search bar (only when active) */}
      {fmsMobileSearch && (
        <div className="pm-mobile-only" style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:"1rem",flexShrink:0}}>🔍</span>
            <input autoFocus type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search tests or regions…"
              style={{flex:1,padding:"6px 10px",borderRadius:8,border:`1.5px solid ${C.accent}`,background:C.s2,color:C.text,fontSize:"0.82rem",fontFamily:"inherit",outline:"none",minHeight:34}}/>
            <button type="button" onClick={()=>{setFmsMobileSearch(false);setSearch("");}}
              style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"1rem",padding:"0 2px",minHeight:34,flexShrink:0}}>✕</button>
          </div>
        </div>
      )}

      {/* Search results */}
      {search.trim() && (
        <div style={{marginBottom:12}}>
          {searchResults.length === 0 ? (
            <div style={{textAlign:"center",padding:"18px",color:C.muted,background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,fontSize:"0.8rem"}}>
              No tests found for "{search}"
            </div>
          ) : (
            <div>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>
                {searchResults.length} result{searchResults.length!==1?"s":""}
              </div>
              {searchResults.map((r,i)=>(
                <div key={i} onClick={()=>{setRegion(r.regionId);setSearch("");}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:6,borderRadius:10,
                    border:`1px solid ${r.regionColor}40`,background:`${r.regionColor}08`,cursor:"pointer"}}>
                  <span style={{fontSize:"1.3rem"}}>{r.test.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.8rem",fontWeight:700,color:C.text}}>{r.test.label}</div>
                    <div style={{fontSize:"0.82rem",color:C.muted}}>{r.test.subtitle}</div>
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:"0.82rem",fontWeight:700,
                    background:`${r.regionColor}15`,color:r.regionColor,flexShrink:0}}>
                    {r.regionIcon} {r.regionLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile search toggle — its own row above the region tabs so it's always visible
          instead of buried at the end of the scrollable chip row */}
      {!search.trim() && !fmsMobileSearch && (
        <div className="pm-mobile-only" style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
          <button type="button" onClick={()=>setFmsMobileSearch(true)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,
              border:`1px solid ${C.border}`,background:C.s2,color:C.muted,fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
            🔍 Search
          </button>
        </div>
      )}

      {/* Region picker — scrollable chip row */}
      {!search.trim() && (
        <div className="pm-region-chips-scroll" style={{marginBottom:10}}>
          {regions.map(r=>{
            const sel = region===r.id;
            return (
              <button key={r.id} type="button" onClick={()=>setRegion(r.id)}
                className={"pm-region-chip"+(sel?" active":"")}
                style={sel?{background:r.color,borderColor:r.color,color:"#fff"}:{borderColor:C.border,color:C.muted}}>
                {r.icon} {r.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active region label */}
      {!search.trim() && (
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"7px 12px",
          borderRadius:9,background:`${selR.color}08`,border:`1px solid ${selR.color}25`}}>
          <span style={{fontSize:"1.2rem"}}>{selR.icon}</span>
          <span style={{fontWeight:800,color:selR.color,fontSize:"0.85rem"}}>{selR.label} Functional Screen</span>
        </div>
      )}

      {/* Region screens */}
      {!search.trim() && region==="lumbar"   && <LumbarFunctionalScreen   data={data} set={set}/>}
      {!search.trim() && region==="shoulder" && <ShoulderFunctionalScreen data={data} set={set}/>}
      {!search.trim() && region==="hip"      && <HipFunctionalScreen      data={data} set={set}/>}
      {!search.trim() && region==="knee"     && <KneeFunctionalScreen     data={data} set={set}/>}
      {!search.trim() && region==="ankle"    && <AnkleFunctionalScreen    data={data} set={set}/>}
      {!search.trim() && region==="cervical" && <CervicalFunctionalScreen data={data} set={set}/>}
      {!search.trim() && region==="thoracic" && <ThoracicFunctionalScreen data={data} set={set}/>}
      {!search.trim() && region==="elbow"    && <ElbowFunctionalScreen    data={data} set={set}/>}
      {!search.trim() && region==="wrist"    && <WristFunctionalScreen    data={data} set={set}/>}
      {!search.trim() && region==="tmj"      && <TMJFunctionalScreen      data={data} set={set}/>}

      {/* Quick navigation */}
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button type="button" onClick={()=>navTo("overview")}
          style={{flex:1,padding:"10px 4px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:"0.78rem",fontFamily:"inherit",
            border:`1px solid ${C.border}`,background:C.s2,color:C.muted}}>
          👤 Patient Profile
        </button>
        <button type="button" onClick={()=>navTo("soap")}
          style={{flex:1,padding:"10px 4px",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:"0.78rem",fontFamily:"inherit",
            border:"none",background:`linear-gradient(135deg,${C.accent},${C.a2})`,color:"#fff"}}>
          📋 Go to SOAP →
        </button>
      </div>
    </div>
  );
}

export { FunctionalScreenHub };
