/* ============================================================
   SURGICAL / MEDICAL DETAILS — region + condition driven.

   This is deliberately NOT one universal hardcoded list. Each
   region carries a set of clinical "buckets" (fracture, joint
   replacement, ACL reconstruction, ...) with the procedures,
   approaches, fixation/implant options, immobilization, graft
   choices, and restriction presets that are actually relevant
   to that combination — modelled after the examination/condition
   organisation in Magee's Orthopedic Physical Assessment and,
   for surgical terminology, AAOS OrthoInfo and current AO
   (Arbeitsgemeinschaft für Osteosynthesefragen) fixation principles.

   2026-09, grounded against current Indian orthopedic practice
   rather than US textbook defaults alone:
   - Hip fracture fixation names the implant actually used on Indian
     wards for intertrochanteric fractures (PFN/PFNA, sized for
     Indian/Asian femoral anthropometry, not the original Western
     PFN) alongside DHS/cannulated screws.
   - Total hip/knee replacement restrictions call out floor-sitting,
     squatting, and cross-legged sitting explicitly (namaz, festivals,
     Indian-style toilets routinely need >120° flexion) since this
     drives real Indian rehab goals and implant choice (high-flex
     designs) that Western protocols don't address, and notes that
     recent evidence increasingly questions blanket posterior-approach
     hip precautions rather than presenting them as fixed dogma.
   - Spinal infection (conditionId "infection" on a spine region)
     resolves to a dedicated TB-spine bucket instead of the generic
     joint-infection bucket — spinal tuberculosis (Pott's disease) is
     common in India and managed completely differently (ATT +
     posterior decompression/instrumentation, not incision & drainage).
   - ACL reconstruction graft/fixation options are ordered with
     hamstring (quadrupled semitendinosus-gracilis) autograft first,
     the dominant Indian graft choice, ahead of BPTB.

   Every list is a starting point, never a restriction — the
   section built on top of this always appends "Not documented",
   "Unknown", and "Other", and every field still accepts free
   typing for anything not listed.
   ============================================================ */

export const WEIGHT_BEARING_OPTIONS = ["NWB", "TTWB", "PWB", "WBAT", "FWB"];

const SURGICAL_BUCKETS = {
  shoulder: {
    fracture: {
      procedures: ["ORIF proximal humerus", "ORIF clavicle", "ORIF scapula", "Closed reduction", "Intramedullary fixation", "Hemiarthroplasty", "Reverse shoulder arthroplasty"],
      approaches: ["Deltopectoral", "Anterolateral", "Superior", "Posterior"],
      fixation: ["Plate + screws", "Intramedullary nail", "Tension band wiring", "Screws", "Suture fixation", "External fixation", "Prosthesis"],
      immobilization: ["Arm sling", "Shoulder immobilizer", "Abduction sling", "Clavicle brace / figure-of-8"],
      restrictionPresets: ["Sling worn except for hygiene / prescribed exercise", "No weight-bearing through the operated arm", "No active shoulder ROM until surgeon clearance", "Avoid lifting with the operated arm"],
    },
    rotatorCuff: {
      procedures: ["Arthroscopic rotator cuff repair", "Open rotator cuff repair", "Debridement", "Subacromial decompression / acromioplasty", "Biceps tenodesis", "Biceps tenotomy"],
      approaches: ["Arthroscopic", "Mini-open", "Open"],
      fixation: ["Single-row suture anchor repair", "Double-row suture anchor repair", "Transosseous repair"],
      immobilization: ["Shoulder immobilizer", "Abduction pillow sling", "Sling", "None"],
      restrictionPresets: ["No active or active-assisted ROM until cleared — passive only in early phase", "No lifting or supporting body weight through the arm", "Sling worn at all times except supervised exercise / hygiene", "Avoid behind-the-back reaching / early internal rotation stretch"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Arthroscopic stabilization", "Bankart repair", "Latarjet procedure"],
      approaches: ["Arthroscopic", "Open (Latarjet)"],
      fixation: ["Suture anchors", "Coracoid bone block + screws (Latarjet)"],
      immobilization: ["Sling", "External rotation brace", "Shoulder immobilizer"],
      restrictionPresets: ["Avoid combined abduction + external rotation (anterior instability repair)", "Sling compliance for the prescribed duration", "No contact / collision sport until surgeon clearance"],
    },
    jointReplacement: {
      procedures: ["Total shoulder arthroplasty", "Reverse total shoulder arthroplasty", "Hemiarthroplasty", "Revision arthroplasty"],
      approaches: ["Deltopectoral", "Anterosuperior / superior"],
      fixation: ["Cemented", "Uncemented", "Hybrid"],
      immobilization: ["Sling", "Abduction pillow (reverse TSA)"],
      restrictionPresets: ["Reverse TSA: avoid combined adduction + internal rotation + extension (the reverse-specific dislocation position)", "Anatomic TSA: avoid extremes of external rotation and extension", "No lifting beyond 1–2 kg with the operated arm initially", "No driving until surgeon clearance", "No pushing up from a chair through the operated arm"],
    },
  },
  elbow: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "Intramedullary fixation", "Screw fixation", "Plate fixation", "External fixation", "Elbow arthroplasty"],
      approaches: ["Posterior", "Lateral", "Medial", "Anterior"],
      fixation: ["Plate + screws", "Tension band wiring", "K-wires", "Screws", "External fixator", "Radial head prosthesis"],
      immobilization: ["Posterior splint", "Long-arm cast", "Hinged elbow brace", "Sling"],
      restrictionPresets: ["Avoid varus / valgus stress", "No weight-bearing through the arm (pushing up from a chair, etc.)", "Gradual surgeon-guided ROM progression, not self-paced", "Splint / brace worn between exercise sessions"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Open reduction", "Ligament repair", "Ligament reconstruction"],
      fixation: ["Hinged external fixator", "Suture anchor repair", "Ligament reconstruction graft fixation"],
      immobilization: ["Hinged elbow brace", "Long-arm splint", "Sling"],
      restrictionPresets: ["Avoid varus stress (LCL injury) or valgus stress (MCL injury) per injury pattern", "Avoid terminal extension in the early phase if posterior instability", "Brace-controlled ROM progression, not free ROM"],
    },
    tendonLigament: {
      procedures: ["UCL repair", "UCL reconstruction", "Distal biceps repair", "Triceps repair"],
      approaches: ["Medial (UCL)", "Anterior (distal biceps)", "Posterior (triceps)"],
      fixation: ["Suture anchors", "Interference screw (biceps)", "Bone tunnel / button fixation"],
      graft: ["Autograft", "Allograft"],
      immobilization: ["Hinged elbow brace", "Extension-blocking brace", "Splint"],
      restrictionPresets: ["No resisted elbow flexion / supination until cleared (biceps repair)", "No resisted elbow extension until cleared (triceps repair)", "Avoid valgus stress throughout rehab (UCL)", "Brace-controlled ROM progression only"],
    },
  },
  wrist: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "Percutaneous pinning", "Plate + screw fixation", "External fixation", "Intramedullary fixation"],
      approaches: ["Volar", "Dorsal", "Radial", "Ulnar"],
      fixation: ["Volar locking plate", "Dorsal plate", "K-wires", "External fixator", "Screws"],
      immobilization: ["Short-arm cast", "Long-arm cast", "Wrist splint", "Thumb-spica", "Ulnar-gutter"],
      restrictionPresets: ["No weight-bearing through the hand", "Avoid resisted grip / lifting until cleared", "Splint / cast compliance", "Watch for median nerve symptoms (carpal tunnel) and report promptly"],
    },
    tendonInjury: {
      procedures: ["Flexor tendon repair", "Extensor tendon repair", "Tendon reconstruction", "Tendon transfer"],
      fixation: ["Core suture repair (flexor)", "End-to-end repair (extensor)", "Tendon graft fixation"],
      immobilization: ["Dynamic splint", "Static splint", "Extension-blocking splint", "Custom hand orthosis"],
      restrictionPresets: ["Protected / splint-controlled motion only — no unprotected active motion", "No unprotected active extension (flexor repair) or flexion (extensor repair)", "No resisted use of the hand until cleared", "Strict splint compliance between exercise sessions"],
    },
    nerveInjury: {
      procedures: ["Nerve repair", "Nerve graft", "Nerve transfer", "Decompression"],
      immobilization: ["Splint", "Protective orthosis", "None"],
      restrictionPresets: ["Protect the repair site from tension / stretch per surgeon protocol", "Splint positioned to minimise nerve tension", "Sensory re-education / desensitization once healing allows", "Monitor and document sensory/motor recovery at each visit"],
    },
  },
  hip: {
    fracture: {
      procedures: ["ORIF", "Cannulated screw fixation", "Dynamic hip screw", "Intramedullary fixation", "Hemiarthroplasty", "Total hip arthroplasty"],
      approaches: ["Anterior", "Posterior", "Lateral"],
      fixation: ["Dynamic hip screw (DHS)", "Cannulated screws", "Proximal femoral nail (PFN / PFNA)", "Intramedullary nail", "Hemiarthroplasty prosthesis", "Total hip prosthesis"],
      immobilization: ["Usually none", "Hip abduction brace if specifically prescribed"],
      restrictionPresets: ["Weight-bearing status strictly per surgeon order (see Weight-bearing field)", "Avoid rotational / torsional stress at the fracture site", "Fall-prevention precautions", "Early, guided mobilization to reduce bed-rest complications — this is now common practice even before full radiological union"],
    },
    jointReplacement: {
      procedures: ["Total hip arthroplasty", "Hemiarthroplasty", "Revision THA"],
      approaches: ["Anterior", "Posterior", "Direct lateral", "Anterolateral"],
      fixation: ["Cemented", "Uncemented", "Hybrid"],
      immobilization: ["Usually none", "Abduction pillow / wedge if prescribed"],
      restrictionPresets: ["Posterior approach: avoid hip flexion beyond ~90°, internal rotation, and adduction past midline", "Anterior / anterolateral approach: avoid combined extension + external rotation + adduction — posterior-style precautions are often relaxed", "Use a raised toilet seat / higher chair; avoid low seating early on", "Discuss floor-sitting, squatting, and cross-legged (padmasana) positions with the surgeon before resuming — often needs a high-flexion implant and surgeon sign-off, not a fixed timeline", "Recent evidence increasingly questions blanket hip precautions after posterior approach — follow the operating surgeon's own protocol rather than a generic rule", "Fall-prevention precautions"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Open reduction", "Revision arthroplasty"],
      approaches: ["Closed (non-operative)", "Open (operative)"],
      fixation: ["Revision arthroplasty components (if arthroplasty performed)"],
      immobilization: ["Hip abduction brace", "Derotation boot"],
      restrictionPresets: ["Hip precautions per the causative/repaired approach", "Avoid the specific movement combination that produced the dislocation", "Movement restrictions as directed", "Weight-bearing restriction as directed"],
    },
  },
  knee: {
    fracture: {
      procedures: ["ORIF", "Intramedullary nail", "Plate + screws", "Screw fixation", "External fixation", "Patellar fixation"],
      approaches: ["Anterior", "Anterolateral", "Medial parapatellar", "Lateral parapatellar"],
      fixation: ["Plate + screws", "Intramedullary nail", "Cannulated screws", "Tension band wiring (patella)", "External fixator"],
      immobilization: ["Knee immobilizer", "Hinged knee brace", "Long-leg cast", "Cylinder cast"],
      restrictionPresets: ["Weight-bearing status strictly per surgeon order", "Avoid resisted knee extension (patellar / extensor mechanism fractures)", "Brace locked in extension for ambulation if prescribed", "Protect the fixation from rotational / varus-valgus stress"],
    },
    aclReconstruction: {
      procedures: ["ACL reconstruction", "ACL repair", "Revision ACL reconstruction"],
      approaches: ["Arthroscopic"],
      fixation: ["Interference screw (femoral)", "Interference screw (tibial)", "Suspensory / cortical button fixation (femoral)", "Screw + post/washer (tibial)"],
      graft: ["Hamstring tendon autograft (quadrupled semitendinosus-gracilis)", "Bone–patellar tendon–bone autograft", "Quadriceps tendon autograft", "Allograft"],
      additionalProcedures: ["Meniscal repair", "Partial meniscectomy", "MCL repair / reconstruction", "Lateral extra-articular procedure"],
      immobilization: ["Hinged knee brace", "Functional ACL brace", "Knee immobilizer", "None"],
      restrictionPresets: ["Brace locked in extension for ambulation and sleeping until quadriceps control returns", "Weight-bearing as tolerated unless a concurrent meniscus repair restricts it", "Avoid open-chain resisted knee extension in the early graft-healing phase", "Avoid pivoting / cutting / twisting until cleared", "No return to sport by time alone — criteria-based clearance (strength + hop testing)"],
    },
    meniscus: {
      procedures: ["Meniscal repair", "Partial meniscectomy", "Meniscal root repair", "Meniscal transplantation"],
      approaches: ["Arthroscopic"],
      immobilization: ["Hinged knee brace", "Knee immobilizer", "None"],
      restrictionPresets: ["Repair: restricted weight-bearing and deep flexion until healing, per repair type/zone", "Partial meniscectomy: weight-bearing and ROM generally progressed early", "Avoid deep squatting / pivoting until cleared", "Repair vs meniscectomy rehab differ significantly — confirm which was actually done, not just \"scope\""],
    },
    patellarInstability: {
      procedures: ["MPFL reconstruction", "MPFL repair", "Tibial tubercle osteotomy", "Lateral release", "Patellar stabilization"],
      approaches: ["Arthroscopic (lateral release)", "Open (MPFL / osteotomy)"],
      fixation: ["Suture anchors (MPFL femoral fixation)", "Interference screw", "Screws (tibial tubercle osteotomy)"],
      graft: ["Hamstring autograft", "Allograft"],
      immobilization: ["Hinged knee brace", "Patellar stabilization brace"],
      restrictionPresets: ["Avoid resisted terminal knee extension early — protects the MPFL graft", "Brace-controlled ROM progression", "Avoid pivoting or lateral-stress activities until cleared", "Patellar taping / tracking cues as directed"],
    },
    jointReplacement: {
      procedures: ["Total knee arthroplasty", "Unicompartmental knee arthroplasty", "Patellofemoral arthroplasty", "Revision TKA"],
      approaches: ["Medial parapatellar", "Subvastus", "Midvastus"],
      fixation: ["Cemented", "Cementless", "Hybrid", "Revision components"],
      immobilization: ["Usually none", "Hinged brace if specifically prescribed"],
      restrictionPresets: ["Early mobilization on the day of surgery / day 1 is now standard (ERAS protocols) — not prolonged bed rest", "Avoid kneeling until soft tissues have healed / surgeon clearance", "Fall-prevention precautions", "Avoid sustained high-impact activity long-term", "Discuss floor-sitting / squatting with the surgeon — high-flexion implants may allow greater flexion, but it is implant- and surgeon-specific"],
    },
  },
  ankle: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "External fixation", "Intramedullary fixation", "Plate + screws", "Syndesmotic fixation"],
      approaches: ["Lateral", "Medial", "Posterolateral", "Anterolateral"],
      fixation: ["Plate + screws", "Syndesmotic screws / suture-button (TightRope)", "K-wires", "External fixator"],
      immobilization: ["Short-leg cast", "CAM boot", "Posterior splint", "Ankle brace"],
      restrictionPresets: ["Weight-bearing status strictly per surgeon order and fixation stability", "Avoid inversion / eversion stress", "Boot / cast compliance", "Elevate the limb to control swelling"],
    },
    achillesRupture: {
      procedures: ["Open Achilles repair", "Percutaneous repair", "Non-operative management"],
      approaches: ["Percutaneous", "Open posteromedial"],
      fixation: ["Core suture repair", "Suture anchor (insertional / avulsion repair)"],
      immobilization: ["Achilles boot", "CAM boot", "Equinus cast"],
      restrictionPresets: ["Progressive equinus-to-neutral positioning per protocol — do not force dorsiflexion early", "Avoid unprotected active dorsiflexion / stretching of the repair", "Weight-bearing per surgeon protocol, often progressive within the boot", "No forceful push-off (running / jumping) until cleared"],
    },
    ankleLigament: {
      procedures: ["Broström repair", "Lateral ligament reconstruction", "Syndesmotic fixation"],
      fixation: ["Suture anchor repair (Broström)", "Suture-tape augmentation"],
      graft: ["Local repair", "Autograft", "Allograft"],
      immobilization: ["CAM boot", "Ankle brace", "Hinged ankle brace"],
      restrictionPresets: ["Protect the repair from inversion stress", "Avoid aggressive early stretching into inversion / plantarflexion", "Boot / brace compliance during weight-bearing", "Progressive proprioceptive training only once tissue healing allows"],
    },
  },
  cervical: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      approaches: ["Anterior", "Posterior"],
      fixation: ["Anterior cervical plate + screws", "Posterior lateral mass screw–rod construct", "Occipitocervical fixation"],
      immobilization: ["Cervical collar", "None"],
      restrictionPresets: ["Collar worn as prescribed — do not remove for self-care unless cleared", "Avoid extremes of neck flexion / extension / rotation", "Log-roll for bed mobility", "No driving while a collar is required"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      fixation: ["Anterior cervical plate + screws", "Posterior lateral mass screw–rod construct", "Interbody cage (ACDF)"],
      immobilization: ["Cervical collar", "None"],
      restrictionPresets: ["Spinal movement restrictions per surgeon", "Lifting restriction as prescribed", "Collar / brace worn as directed for out-of-bed activity", "Surgeon-specific precautions — confirm before progressing"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      approaches: ["Anterior", "Posterior"],
      immobilization: ["None", "Cervical collar"],
      restrictionPresets: ["Avoid heavy lifting and repetitive neck flexion/rotation for the surgeon-specified period", "Gradual return to activity guided by symptoms", "Collar only if specifically prescribed", "No driving while symptomatic or collared"],
    },
  },
  thoracic: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      approaches: ["Anterior", "Posterior"],
      fixation: ["Pedicle screw–rod construct", "Vertebral body augmentation (cement)", "Anterior plate + screws"],
      immobilization: ["TLSO", "None"],
      restrictionPresets: ["No Bending, Lifting, or Twisting — \"BLT\" precautions — per the surgeon's weight limit", "Log-roll for bed mobility", "Brace worn as prescribed for out-of-bed activity", "Avoid prolonged sitting/standing in early recovery"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      fixation: ["Pedicle screw–rod construct", "Interbody cage", "Anterior plate + screws"],
      immobilization: ["TLSO", "None"],
      restrictionPresets: ["Spinal movement restrictions per surgeon", "Lifting restriction as prescribed", "Brace worn as directed", "Surgeon-specific precautions — confirm before progressing"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      approaches: ["Posterior", "Posterolateral"],
      immobilization: ["None", "TLSO"],
      restrictionPresets: ["Avoid heavy lifting and repetitive bending/twisting for the surgeon-specified period", "Gradual return to activity guided by symptoms", "Brace only if specifically prescribed"],
    },
  },
  lumbar: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      approaches: ["Anterior", "Posterior"],
      fixation: ["Pedicle screw–rod construct", "Vertebral body augmentation (cement)", "Anterior plate + screws"],
      immobilization: ["TLSO", "Lumbar orthosis", "None"],
      restrictionPresets: ["No Bending, Lifting, or Twisting — \"BLT\" precautions — per the surgeon's weight limit", "Log-roll for bed mobility", "Brace worn as prescribed for out-of-bed activity", "Avoid prolonged sitting/standing in early recovery"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      fixation: ["Pedicle screw–rod construct", "Interbody cage (TLIF / PLIF / ALIF)", "Anterior plate + screws"],
      immobilization: ["Lumbar orthosis", "None"],
      restrictionPresets: ["No Bending, Lifting (commonly >4–5 kg, per surgeon limit), or Twisting — \"BLT\" precautions, typically for 6–12 weeks", "Log-roll for bed mobility", "Brace worn as directed for out-of-bed activity", "Surgeon-specific precautions — confirm before progressing"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      approaches: ["Posterior", "Posterolateral"],
      immobilization: ["None", "Lumbar brace", "Surgeon-specific"],
      restrictionPresets: ["Avoid heavy lifting and repetitive bending/twisting for the surgeon-specified period", "Gradual return to activity guided by symptoms", "No prolonged sitting in early recovery", "Brace only if specifically prescribed"],
    },
  },
  pelvis: {
    fracture: {
      procedures: ["ORIF", "Percutaneous fixation", "External fixation", "SI screw fixation", "Plate fixation"],
      approaches: ["Anterior (ilioinguinal / Stoppa)", "Posterior", "Percutaneous"],
      fixation: ["Plate + screws", "SI (sacroiliac) screws", "External fixator", "Symphyseal plating"],
      immobilization: ["Usually none", "Pelvic binder (acute phase)"],
      restrictionPresets: ["Bed mobility restrictions", "Transfer restrictions", "Hip precautions if concurrent acetabular involvement", "Log-roll for bed mobility", "Surgeon-specific weight-bearing and loading limits"],
    },
  },
};
/* foot and hand share their parent limb's terminology closely enough that
   they resolve through the ankle / wrist buckets above; sacrum resolves via
   the lumbar buckets. Regions with no curated data fall back gracefully
   below (empty lists — the therapist enters everything manually). */
SURGICAL_BUCKETS.foot = SURGICAL_BUCKETS.ankle;
SURGICAL_BUCKETS.hand = SURGICAL_BUCKETS.wrist;
SURGICAL_BUCKETS.sacrum = SURGICAL_BUCKETS.lumbar;

/* Regions whose "infection" condition resolves to the dedicated spinal
   (TB / Pott's disease) infection bucket below instead of the generic
   joint/bone infection bucket — see bucketFor(). */
const SPINE_REGION_IDS = ["cervical", "thoracic", "lumbar", "sacrum"];

const AMPUTATION_BUCKET = {
  procedures: ["Transfemoral amputation", "Transtibial amputation", "Knee disarticulation", "Hip disarticulation", "Transradial amputation", "Transhumeral amputation"],
  approaches: ["Definitive (single-stage) closure", "Guillotine / staged closure"],
  immobilization: ["Rigid dressing", "Soft dressing", "Shrinker", "Knee immobilizer", "Rigid removable dressing"],
  restrictionPresets: ["No pillow under the knee for a transtibial amputation — risks a knee flexion contracture", "Avoid prolonged hip/knee flexion (chair-sitting); periods of prone lying help prevent a hip flexion contracture, especially transfemoral", "Residual limb desensitization once the wound is stable", "Compression wrapping / shrinker for volume control and limb shaping", "Daily skin inspection of the residual limb for pressure areas"],
};

const INFECTION_BUCKET = {
  procedures: ["Incision and drainage", "Debridement", "Washout", "Implant retention + debridement", "Implant removal", "Revision surgery"],
  woundOptions: ["Open", "Closed", "Drain", "Dressing", "Negative-pressure wound therapy"],
  restrictionPresets: ["Complete the full prescribed antibiotic course", "Wound / dressing precautions per infection-control protocol", "Weight-bearing status per surgeon — often restricted until infection is controlled", "Monitor for systemic signs (fever, rising inflammatory markers) and escalate promptly"],
};

/* Spinal tuberculosis (Pott's disease) is a common cause of spinal
   infection in India and is managed completely differently from a
   joint/prosthetic infection: anti-tubercular therapy (ATT) plus,
   for neurological compromise/instability/progressive kyphosis,
   posterior decompression with instrumented fusion — the posterior
   transpedicular approach is now preferred over anterior surgery
   specifically because it avoids the anterior TB focus. */
const SPINE_INFECTION_BUCKET = {
  procedures: ["Anti-tubercular therapy (ATT) — conservative, no surgery", "Posterior decompression + instrumented fusion", "Anterior debridement + fusion", "Combined anterior–posterior decompression + fusion", "Abscess drainage"],
  approaches: ["Posterior (transpedicular)", "Anterior", "Anterolateral", "Combined anterior–posterior"],
  fixation: ["Posterior pedicle screw–rod construct", "Anterior plate + screws", "Bone graft (autograft / strut) + instrumentation"],
  restrictionPresets: ["Continue anti-tubercular therapy (ATT) for the full physician-directed course — surgery does not replace it", "\"BLT\" precautions (no bending / lifting / twisting) as for any spinal fusion", "Brace / collar worn as prescribed", "Monitor neurological status closely at every session", "Nutritional support — active TB plus prolonged immobilization raises catabolic/deconditioning risk"],
};

/* "Arthritis / Degenerative" (chronic joint disease, not yet or not
   undergoing replacement) isn't naturally region-specific the way
   fracture/replacement procedure names are, so — like infection and
   amputation — it resolves to one flat bucket regardless of region. */
const ARTHRITIS_BUCKET = {
  procedures: ["Conservative management — no surgery", "Arthroscopic debridement", "Synovectomy", "Corrective / realignment osteotomy", "Injections (viscosupplementation / corticosteroid) — non-surgical"],
  restrictionPresets: ["Activity modification to reduce joint loading", "Weight-bearing as tolerated unless a procedure was performed", "Follow the surgeon-specific post-procedure protocol if debridement/osteotomy was performed"],
};

/* "Deformity Correction" (angular/rotational limb malalignment) —
   gradual correction with a ring fixator (Ilizarov / hexapod) is a
   long-standing, widely-practised Indian technique alongside acute
   correction with internal fixation, so both are represented. */
const DEFORMITY_BUCKET = {
  procedures: ["Corrective osteotomy", "External fixator-assisted correction (Ilizarov / hexapod ring fixator)", "Guided growth surgery (hemiepiphysiodesis)", "Internal fixation after acute correction"],
  fixation: ["External fixator (Ilizarov / hexapod ring fixator)", "Plate + screws", "Intramedullary nail", "Guided-growth plate / screw"],
  immobilization: ["Cast", "Brace", "External fixator pin-site care"],
  restrictionPresets: ["Pin-site care per protocol if an external fixator is in place", "Follow the prescribed gradual correction/distraction schedule — never self-adjust an external fixator", "Weight-bearing status per surgeon and fixation stability", "Monitor neurovascular status distal to the correction site at every session"],
};

/* Region-agnostic bucket for "Soft-Tissue / Muscle Surgery", which
   previously resolved to `null` (no curated options -- manual entry
   only). Spans every region rather than one joint, so it doesn't fit
   the per-region SURGICAL_BUCKETS shape above. */
const SOFT_TISSUE_MUSCLE_BUCKET = {
  procedures: ["Muscle/tendon debridement", "Muscle repair (laceration/rupture)", "Fasciotomy", "Fascia release", "Soft-tissue mass excision", "Muscle flap / transfer", "Compartment release"],
  approaches: ["Longitudinal", "Transverse", "Curvilinear", "Percutaneous"],
  immobilization: ["Splint", "Brace", "None"],
};

/* Some conditions mean something different depending on the region — e.g.
   "Ligament Reconstruction" is ACL work at the knee but a Broström at the
   ankle. This maps a condition id to the region-appropriate bucket key. */
const REGION_OVERRIDE = {
  ligamentReconstruction: { knee: "aclReconstruction", ankle: "ankleLigament", foot: "ankleLigament", elbow: "tendonLigament", shoulder: "dislocation" },
  tendonRepair: { shoulder: "rotatorCuff", elbow: "tendonLigament", wrist: "tendonInjury", hand: "tendonInjury", ankle: "achillesRupture", foot: "achillesRupture" },
  tendonTransfer: { elbow: "tendonLigament", wrist: "tendonInjury", hand: "tendonInjury" },
  jointStabilization: { shoulder: "dislocation", hip: "dislocation", knee: "patellarInstability" },
  arthroscopy: { knee: "meniscus", shoulder: "rotatorCuff" },
};

/* Maps this app's existing condition ids (IPD + Post-op) to a bucket key.
   `null` means "no curated bucket for this condition" — the section still
   renders, just with empty presets (manual entry only). "infection",
   "amputation", "arthritis", and "deformityCorrection" are handled as
   special cases in bucketFor() below rather than through this map, since
   their buckets aren't looked up per-region the same way. */
const CONDITION_BUCKET = {
  // IPD
  fracture: "fracture",
  postop: null,
  jointReplacement: "jointReplacement",
  dislocation: "dislocation",
  spine: "degenerative",
  softTissue: null,
  painFunctional: null,
  deconditioning: null,
  other: null,
  notDiagnosed: null,
  // Post-op (ids not already covered above)
  fractureORIF: "fracture",
  ligamentReconstruction: "ligamentReconstruction",
  tendonRepair: "tendonRepair",
  arthroscopy: "arthroscopy",
  spineSurgery: "degenerative",
  jointStabilization: "jointStabilization",
  softTissueMuscle: null,
  tendonTransfer: "tendonTransfer",
};

function bucketFor(regionId, conditionId) {
  if (conditionId === "infection") return SPINE_REGION_IDS.includes(regionId) ? SPINE_INFECTION_BUCKET : INFECTION_BUCKET;
  if (conditionId === "amputation") return AMPUTATION_BUCKET;
  if (conditionId === "arthritis") return ARTHRITIS_BUCKET;
  if (conditionId === "deformityCorrection") return DEFORMITY_BUCKET;
  if (conditionId === "softTissueMuscle") return SOFT_TISSUE_MUSCLE_BUCKET;
  const override = REGION_OVERRIDE[conditionId];
  if (override && override[regionId]) return (SURGICAL_BUCKETS[regionId] || {})[override[regionId]] || {};
  const key = CONDITION_BUCKET[conditionId];
  if (!key) return {};
  return (SURGICAL_BUCKETS[regionId] || {})[key] || {};
}

function union(...lists) {
  const seen = new Set();
  const out = [];
  lists.forEach((l) => (l || []).forEach((v) => {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }));
  return out;
}

/* Resolves the merged surgical bucket across every selected region for the
   given condition. Multiple regions (e.g. "Right Knee, Left Ankle") union
   their option lists rather than picking just one. */
export function resolveSurgicalOptions(selectedRegions, conditionId) {
  const buckets = (selectedRegions.length ? selectedRegions : [{ id: null }]).map((r) => bucketFor(r.id, conditionId));
  return {
    procedures: union(...buckets.map((b) => b.procedures)),
    approaches: union(...buckets.map((b) => b.approaches)),
    fixation: union(...buckets.map((b) => b.fixation)),
    immobilization: union(...buckets.map((b) => b.immobilization)),
    graft: union(...buckets.map((b) => b.graft)),
    additionalProcedures: union(...buckets.map((b) => b.additionalProcedures)),
    restrictionPresets: union(...buckets.map((b) => b.restrictionPresets)),
    woundOptions: union(...buckets.map((b) => b.woundOptions)),
  };
}

export function withFallbacks(list) {
  return union(list, ["Not documented", "Unknown", "Other"]);
}
