/* ============================================================
   SURGICAL / MEDICAL DETAILS — region + condition driven.

   This is deliberately NOT one universal hardcoded list. Each
   region carries a set of clinical "buckets" (fracture, joint
   replacement, ACL reconstruction, ...) with the procedures,
   approaches, fixation/implant options, immobilization, graft
   choices, and restriction presets that are actually relevant
   to that combination — modelled after the examination/condition
   organisation in Magee's Orthopedic Physical Assessment and,
   for surgical terminology, AAOS OrthoInfo (e.g. hip replacement
   approaches, ACL graft choices).

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
      fixation: ["Plate + screws", "Intramedullary nail", "Screws", "Suture fixation", "External fixation", "Prosthesis"],
      immobilization: ["Arm sling", "Shoulder immobilizer", "Abduction sling"],
    },
    rotatorCuff: {
      procedures: ["Arthroscopic rotator cuff repair", "Open rotator cuff repair", "Debridement", "Subacromial decompression / acromioplasty", "Biceps tenodesis", "Biceps tenotomy"],
      approaches: ["Arthroscopic", "Mini-open", "Open"],
      immobilization: ["Shoulder immobilizer", "Abduction pillow sling", "Sling", "None"],
      restrictionPresets: ["Active ROM restriction", "Resisted shoulder activity restriction", "Weight-bearing through arm restriction"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Arthroscopic stabilization", "Bankart repair", "Latarjet procedure"],
      immobilization: ["Sling", "External rotation brace", "Shoulder immobilizer"],
    },
    jointReplacement: {
      procedures: ["Total shoulder arthroplasty", "Reverse total shoulder arthroplasty", "Hemiarthroplasty", "Revision arthroplasty"],
      approaches: ["Deltopectoral", "Anterosuperior / superior"],
      fixation: ["Anatomic TSA", "Reverse TSA", "Hemiarthroplasty"],
    },
  },
  elbow: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "Intramedullary fixation", "Screw fixation", "Plate fixation", "External fixation", "Elbow arthroplasty"],
      approaches: ["Posterior", "Lateral", "Medial", "Anterior"],
      immobilization: ["Posterior splint", "Long-arm cast", "Hinged elbow brace", "Sling"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Open reduction", "Ligament repair", "Ligament reconstruction"],
      immobilization: ["Hinged elbow brace", "Long-arm splint", "Sling"],
    },
    tendonLigament: {
      procedures: ["UCL repair", "UCL reconstruction", "Distal biceps repair", "Triceps repair"],
      graft: ["Autograft", "Allograft"],
      immobilization: ["Hinged elbow brace", "Extension-blocking brace", "Splint"],
    },
  },
  wrist: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "Percutaneous pinning", "Plate + screw fixation", "External fixation", "Intramedullary fixation"],
      approaches: ["Volar", "Dorsal", "Radial", "Ulnar"],
      immobilization: ["Short-arm cast", "Long-arm cast", "Wrist splint", "Thumb-spica", "Ulnar-gutter"],
    },
    tendonInjury: {
      procedures: ["Flexor tendon repair", "Extensor tendon repair", "Tendon reconstruction", "Tendon transfer"],
      immobilization: ["Dynamic splint", "Static splint", "Extension-blocking splint", "Custom hand orthosis"],
    },
    nerveInjury: {
      procedures: ["Nerve repair", "Nerve graft", "Nerve transfer", "Decompression"],
      immobilization: ["Splint", "Protective orthosis", "None"],
    },
  },
  hip: {
    fracture: {
      procedures: ["ORIF", "Cannulated screw fixation", "Dynamic hip screw", "Intramedullary fixation", "Hemiarthroplasty", "Total hip arthroplasty"],
      approaches: ["Anterior", "Posterior", "Lateral"],
    },
    jointReplacement: {
      procedures: ["Total hip arthroplasty", "Hemiarthroplasty", "Revision THA"],
      approaches: ["Anterior", "Posterior", "Direct lateral", "Anterolateral"],
      fixation: ["Cemented", "Uncemented", "Hybrid"],
      restrictionPresets: ["Hip precautions", "Surgeon-specific precautions", "None specified"],
    },
    dislocation: {
      procedures: ["Closed reduction", "Open reduction", "Revision arthroplasty"],
      restrictionPresets: ["Hip precautions", "Movement restrictions", "Weight-bearing restriction"],
    },
  },
  knee: {
    fracture: {
      procedures: ["ORIF", "Intramedullary nail", "Plate + screws", "Screw fixation", "External fixation", "Patellar fixation"],
      immobilization: ["Knee immobilizer", "Hinged knee brace", "Long-leg cast", "Cylinder cast"],
    },
    aclReconstruction: {
      procedures: ["ACL reconstruction", "ACL repair", "Revision ACL reconstruction"],
      graft: ["Bone–patellar tendon–bone autograft", "Hamstring tendon autograft", "Quadriceps tendon autograft", "Allograft"],
      additionalProcedures: ["Meniscal repair", "Partial meniscectomy", "MCL repair / reconstruction", "Lateral extra-articular procedure"],
      immobilization: ["Hinged knee brace", "Functional ACL brace", "Knee immobilizer", "None"],
    },
    meniscus: {
      procedures: ["Meniscal repair", "Partial meniscectomy", "Meniscal root repair", "Meniscal transplantation"],
      immobilization: ["Hinged knee brace", "Knee immobilizer", "None"],
    },
    patellarInstability: {
      procedures: ["MPFL reconstruction", "MPFL repair", "Tibial tubercle osteotomy", "Lateral release", "Patellar stabilization"],
      graft: ["Hamstring autograft", "Allograft"],
      immobilization: ["Hinged knee brace", "Patellar stabilization brace"],
    },
    jointReplacement: {
      procedures: ["Total knee arthroplasty", "Unicompartmental knee arthroplasty", "Patellofemoral arthroplasty", "Revision TKA"],
      fixation: ["Cemented", "Cementless", "Hybrid", "Revision components"],
      immobilization: ["Usually none", "Hinged brace if specifically prescribed"],
    },
  },
  ankle: {
    fracture: {
      procedures: ["ORIF", "Closed reduction", "External fixation", "Intramedullary fixation", "Plate + screws", "Syndesmotic fixation"],
      approaches: ["Lateral", "Medial", "Posterolateral", "Anterolateral"],
      immobilization: ["Short-leg cast", "CAM boot", "Posterior splint", "Ankle brace"],
    },
    achillesRupture: {
      procedures: ["Open Achilles repair", "Percutaneous repair", "Non-operative management"],
      immobilization: ["Achilles boot", "CAM boot", "Equinus cast"],
    },
    ankleLigament: {
      procedures: ["Broström repair", "Lateral ligament reconstruction", "Syndesmotic fixation"],
      graft: ["Local repair", "Autograft", "Allograft"],
      immobilization: ["CAM boot", "Ankle brace", "Hinged ankle brace"],
    },
  },
  cervical: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      immobilization: ["Cervical collar", "None"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      immobilization: ["Cervical collar", "None"],
      restrictionPresets: ["Spinal movement restrictions", "Lifting restriction", "Surgeon-specific precautions"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      immobilization: ["None", "Cervical collar"],
    },
  },
  thoracic: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      immobilization: ["TLSO", "None"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      immobilization: ["TLSO", "None"],
      restrictionPresets: ["Spinal movement restrictions", "Lifting restriction", "Surgeon-specific precautions"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      immobilization: ["None", "TLSO"],
    },
  },
  lumbar: {
    fracture: {
      procedures: ["Vertebral fixation", "Posterior instrumentation", "Fusion", "Decompression + fixation", "Vertebral augmentation"],
      immobilization: ["TLSO", "Lumbar orthosis", "None"],
    },
    degenerative: {
      procedures: ["Decompression", "Discectomy", "Laminectomy", "Fusion", "Instrumented fusion"],
      approaches: ["Anterior", "Posterior", "Posterolateral"],
      immobilization: ["Lumbar orthosis", "None"],
      restrictionPresets: ["Spinal movement restrictions", "Lifting restriction", "Surgeon-specific precautions"],
    },
    discHerniation: {
      procedures: ["Microdiscectomy", "Discectomy", "Decompression", "Fusion"],
      immobilization: ["None", "Lumbar brace", "Surgeon-specific"],
    },
  },
  pelvis: {
    fracture: {
      procedures: ["ORIF", "Percutaneous fixation", "External fixation", "SI screw fixation", "Plate fixation"],
      restrictionPresets: ["Bed mobility restrictions", "Transfer restrictions", "Hip precautions", "Surgeon-specific"],
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

const AMPUTATION_BUCKET = {
  procedures: ["Transfemoral amputation", "Transtibial amputation", "Knee disarticulation", "Hip disarticulation", "Transradial amputation", "Transhumeral amputation"],
  immobilization: ["Rigid dressing", "Soft dressing", "Shrinker", "Knee immobilizer", "Rigid removable dressing"],
};

const INFECTION_BUCKET = {
  procedures: ["Incision and drainage", "Debridement", "Washout", "Implant retention + debridement", "Implant removal", "Revision surgery"],
  woundOptions: ["Open", "Closed", "Drain", "Dressing", "Negative-pressure wound therapy"],
};

/* Region-agnostic buckets for the two condition ids that previously
   resolved to `null` (no curated options -- manual entry only). Both
   procedures span every region rather than one joint, so they don't fit
   the per-region SURGICAL_BUCKETS shape above. */
const SOFT_TISSUE_MUSCLE_BUCKET = {
  procedures: ["Muscle/tendon debridement", "Muscle repair (laceration/rupture)", "Fasciotomy", "Fascia release", "Soft-tissue mass excision", "Muscle flap / transfer", "Compartment release"],
  approaches: ["Longitudinal", "Transverse", "Curvilinear", "Percutaneous"],
  immobilization: ["Splint", "Brace", "None"],
};

const DEFORMITY_CORRECTION_BUCKET = {
  procedures: ["Corrective osteotomy", "Limb lengthening", "External fixator-assisted correction", "Guided growth (hemiepiphysiodesis)", "Angular correction with plate fixation"],
  approaches: ["Medial", "Lateral", "Anterior", "Percutaneous / minimally invasive"],
  fixation: ["Plate + screws", "Intramedullary nail", "External fixator (monolateral)", "External fixator (circular/Ilizarov)"],
  immobilization: ["Cast", "Brace", "None"],
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
   renders, just with empty presets (manual entry only). */
const CONDITION_BUCKET = {
  // IPD
  fracture: "fracture",
  postop: null,
  jointReplacement: "jointReplacement",
  dislocation: "dislocation",
  infection: "__infection__",
  amputation: "__amputation__",
  spine: "degenerative",
  arthritis: null,
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
  deformityCorrection: null,
};

function bucketFor(regionId, conditionId) {
  if (conditionId === "infection") return INFECTION_BUCKET;
  if (conditionId === "amputation") return AMPUTATION_BUCKET;
  if (conditionId === "softTissueMuscle") return SOFT_TISSUE_MUSCLE_BUCKET;
  if (conditionId === "deformityCorrection") return DEFORMITY_CORRECTION_BUCKET;
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
