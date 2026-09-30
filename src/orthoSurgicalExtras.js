/* ============================================================
   SURGICAL LISTS — additions merged on top of orthoSurgicalLibrary.

   Source: the region / procedure / approach / implant framework in the
   "Orthopedic Surgery Lists" review, cross-checked against AAOS OrthoInfo
   and AO fixation terminology. These are DOCUMENTATION options only — they
   never infer an approach or implant from a procedure name (a THR does not
   tell you whether the surgeon went posterior or anterior), and every
   list still gets "Not documented / Unknown / Other" fallbacks plus free
   typing in the form. The operative note and the surgeon's orders decide
   the real plan.

   Shape per region → bucket key (same keys orthoSurgicalLibrary uses):
     procedures, approaches, fixation, graft, immobilization,
     additionalProcedures, restrictionPresets, woundOptions
   Lists here are UNIONED into any existing bucket (existing entries keep
   their order and stay first), or create the bucket where none existed.
   ============================================================ */

export const EXTRA_BUCKETS = {
  /* ─────────────────────────── SHOULDER ─────────────────────────── */
  shoulder: {
    fracture: {
      procedures: ["ORIF proximal humerus", "ORIF humeral shaft", "ORIF distal humerus", "ORIF clavicle", "ORIF scapula", "Hemiarthroplasty for fracture", "Reverse shoulder arthroplasty for fracture"],
      approaches: ["Deltopectoral", "Deltoid-split (lateral)", "Anterolateral", "Superior (clavicle)", "Posterior", "Percutaneous"],
      fixation: ["Locking plate + screws", "Proximal humeral nail", "Intramedullary humeral nail", "Suture fixation / tension band", "Prosthesis (hemi / reverse)"],
    },
    rotatorCuff: {
      procedures: ["Shoulder arthroscopy", "Labral repair", "SLAP repair", "Bankart repair", "Capsular release (frozen shoulder)", "Rotator cuff reconstruction with patch / graft", "Superior capsular reconstruction", "Biceps tendon repair"],
      approaches: ["Arthroscopic portals", "Deltoid-split (open cuff)"],
      fixation: ["Suture anchors", "Buttons", "Knotless anchors"],
      graft: ["Autograft", "Allograft", "Synthetic patch"],
      restrictionPresets: ["Follow the surgeon's cuff-repair protocol — tear size and tissue quality change the timeline"],
    },
    dislocation: {
      procedures: ["Capsular shift / capsulorrhaphy", "SLAP repair", "Remplissage", "AC joint reconstruction", "Sternoclavicular stabilization", "Open Bankart repair"],
      approaches: ["Deltopectoral", "Arthroscopic portals", "Superior (AC joint)"],
      fixation: ["Suture anchors", "Suspensory button fixation (AC joint)", "Tendon graft (AC joint reconstruction)", "Hook plate"],
      immobilization: ["Sling + abduction pillow"],
    },
    jointReplacement: {
      procedures: ["Shoulder hemiarthroplasty", "Resurfacing arthroplasty", "Revision reverse shoulder arthroplasty"],
      approaches: ["Deltopectoral", "Superior", "Anterosuperior", "Posterior"],
      fixation: ["Anatomic shoulder prosthesis", "Reverse shoulder prosthesis", "Stemless humeral implant", "Humeral stem — cemented", "Humeral stem — press-fit", "Glenoid component — cemented", "Glenoid baseplate + glenosphere (reverse)"],
      additionalProcedures: ["Subscapularis repair / management", "Biceps tenodesis", "Bone graft (glenoid / humeral)"],
    },
    tendonTransfer: {
      procedures: ["Latissimus dorsi transfer", "Lower trapezius transfer", "Pectoralis major transfer", "Tendon transfer for irreparable cuff tear", "Other tendon transfer"],
      approaches: ["Deltopectoral", "Posterior / axillary", "Open"],
      fixation: ["Suture anchors", "Transosseous suture", "Interference screw"],
      immobilization: ["Abduction brace / pillow sling", "Sling"],
      restrictionPresets: ["Protect the transfer from active loading until surgeon clearance", "Re-education of the transferred muscle is a core rehab goal — follow the surgeon's protocol"],
    },
  },

  /* ─────────────────────────── ELBOW ─────────────────────────── */
  elbow: {
    fracture: {
      procedures: ["ORIF distal humerus", "ORIF olecranon", "ORIF radial head", "Radial head replacement", "Coronoid fixation", "ORIF both-bone forearm"],
      approaches: ["Posterior (olecranon osteotomy)", "Posterior triceps-sparing", "Lateral (Kocher)", "Kaplan (lateral)", "Medial (Hotchkiss)", "Anterior"],
      fixation: ["Dual (orthogonal / parallel) locking plates", "Olecranon plate", "Tension band wiring", "Headless screws (radial head)", "Radial head prosthesis"],
    },
    dislocation: {
      approaches: ["Lateral", "Medial", "Posterior", "Combined lateral + medial"],
    },
    tendonLigament: {
      procedures: ["LCL / posterolateral corner reconstruction", "Lateral epicondyle debridement / release", "Medial epicondyle debridement / release", "Elbow arthroscopy", "Ulnar nerve transposition"],
      approaches: ["Lateral", "Medial", "Posterior", "Arthroscopic portals"],
      graft: ["Palmaris longus", "Hamstring", "Allograft"],
    },
    jointReplacement: {
      procedures: ["Total elbow arthroplasty", "Radial head arthroplasty", "Revision elbow arthroplasty", "Interposition arthroplasty"],
      approaches: ["Posterior (triceps-sparing)", "Posterior (triceps-reflecting)", "Lateral"],
      fixation: ["Linked (semi-constrained) prosthesis", "Unlinked prosthesis", "Cemented stems", "Radial head prosthesis"],
      immobilization: ["Posterior splint", "Sling", "Hinged elbow brace"],
      restrictionPresets: ["Lifetime lifting limit per surgeon (commonly a few kg for total elbow replacement)", "Avoid weight-bearing through the arm (pushing up from a chair)", "Protect the triceps repair / attachment per surgeon protocol"],
    },
    arthroscopy: {
      procedures: ["Elbow arthroscopy", "Loose body removal", "Synovectomy", "Capsular release", "Debridement", "Osteochondral procedure"],
      approaches: ["Arthroscopic portals"],
      immobilization: ["Sling", "Splint", "None"],
    },
  },

  /* ─────────────────────────── FOREARM ─────────────────────────── */
  forearm: {
    fracture: {
      procedures: ["ORIF both-bone forearm", "ORIF radial shaft", "ORIF ulnar shaft", "Monteggia fracture fixation", "Galeazzi fracture fixation", "Distal radius fixation", "Intramedullary fixation"],
      approaches: ["Volar (Henry)", "Dorsal (Thompson)", "Subcutaneous border (ulna)", "Percutaneous"],
      fixation: ["Compression plates + screws", "Locking plates", "Intramedullary nail", "K-wires", "External fixator"],
      immobilization: ["Long-arm cast", "Long-arm splint", "Sugar-tong splint", "Sling"],
      restrictionPresets: ["No weight-bearing / lifting through the forearm until union confirmed", "Avoid forearm rotation against resistance in the early phase", "Monitor for compartment syndrome / neurovascular change and escalate"],
    },
    tendonRepair: {
      procedures: ["Flexor tendon repair", "Extensor tendon repair", "Tendon transfer", "Fasciotomy (compartment release)"],
      approaches: ["Volar", "Dorsal", "Longitudinal"],
      fixation: ["Core suture repair", "Suture anchor"],
      immobilization: ["Dynamic splint", "Static splint"],
    },
  },

  /* ─────────────────────────── WRIST ─────────────────────────── */
  wrist: {
    fracture: {
      procedures: ["ORIF distal radius", "Scaphoid fixation", "Ulnar styloid fixation", "Lunate / carpal bone fixation", "Wrist arthrodesis (post-fracture)"],
      approaches: ["Volar (FCR)", "Dorsal", "Dorsoradial", "Percutaneous"],
      fixation: ["Volar locking plate", "Dorsal spanning plate", "Headless compression screw (scaphoid)", "K-wires", "External fixator", "Fragment-specific fixation"],
      graft: ["Autograft (iliac crest / distal radius)", "Vascularised bone graft", "Allograft"],
    },
    tendonInjury: {
      procedures: ["Carpal tunnel release", "De Quervain release", "Extensor tendon relocation / repair"],
      approaches: ["Volar", "Dorsal", "Longitudinal", "Zigzag (Brunner)"],
    },
    jointReplacement: {
      procedures: ["Total wrist arthroplasty", "Wrist arthrodesis (fusion)", "Proximal row carpectomy", "Four-corner fusion", "Distal ulna resection / Sauvé-Kapandji"],
      approaches: ["Dorsal", "Volar"],
      fixation: ["Wrist prosthesis", "Fusion plate", "Staples / screws", "K-wires"],
      immobilization: ["Wrist splint", "Short-arm cast"],
    },
    arthroscopy: {
      procedures: ["Wrist arthroscopy", "TFCC repair / debridement", "Ganglion excision (arthroscopic)", "Synovectomy", "Ligament (SL) debridement / repair"],
      approaches: ["Arthroscopic portals"],
      immobilization: ["Wrist splint", "Short-arm cast", "None"],
    },
    jointStabilization: {
      procedures: ["Scapholunate ligament repair / reconstruction", "TFCC repair", "Distal radioulnar joint stabilization", "Capsulodesis"],
      approaches: ["Dorsal", "Volar", "Arthroscopic portals"],
      fixation: ["Suture anchors", "K-wires", "Tendon graft"],
      immobilization: ["Short-arm cast", "Wrist splint"],
    },
  },

  /* ─────────────────────────── HAND ─────────────────────────── */
  hand: {
    fracture: {
      procedures: ["ORIF metacarpal", "ORIF phalanx", "Percutaneous pinning", "Scaphoid fixation", "Bennett / Rolando fracture fixation"],
      approaches: ["Dorsal", "Midaxial", "Volar", "Percutaneous"],
      fixation: ["K-wires", "Mini plates + screws", "Lag screws", "Intramedullary screw", "External mini fixator"],
    },
    tendonInjury: {
      procedures: ["Trigger finger release", "Dupuytren fasciectomy / fasciotomy", "Tenolysis", "Two-stage tendon reconstruction"],
      approaches: ["Palmar", "Volar zigzag (Bruner)", "Midaxial", "Dorsal"],
    },
    jointReplacement: {
      procedures: ["MCP arthroplasty", "PIP arthroplasty", "Thumb CMC arthroplasty / trapeziectomy", "Thumb CMC ligament reconstruction", "Finger joint arthrodesis"],
      approaches: ["Dorsal", "Volar (thumb CMC)", "Palmar"],
      fixation: ["Silicone implant", "Pyrocarbon implant", "Tendon interposition / suspension", "K-wires / tension band (fusion)"],
      immobilization: ["Thumb-spica splint", "Dynamic splint", "Static splint"],
    },
  },

  /* ─────────────────────────── HIP ─────────────────────────── */
  hip: {
    fracture: {
      procedures: ["Femoral neck fixation", "Intertrochanteric fracture fixation", "Subtrochanteric fracture fixation", "Femoral head fracture fixation", "Acetabular fracture fixation", "Periprosthetic femoral fracture fixation", "Bipolar hemiarthroplasty"],
      approaches: ["Direct lateral (Hardinge)", "Anterolateral (Watson-Jones)", "Posterior (Kocher-Langenbeck)", "Lateral (percutaneous / MIS)", "Direct anterior (Smith-Petersen)"],
      fixation: ["Sliding hip screw + plate", "Cephalomedullary nail (PFN / PFNA / TFN / Gamma)", "Cannulated screws", "Locking plate", "Unipolar prosthesis", "Bipolar prosthesis", "Cemented stem", "Uncemented stem"],
    },
    jointReplacement: {
      procedures: ["Primary total hip replacement", "Hip resurfacing", "Bipolar hemiarthroplasty", "Unipolar hemiarthroplasty", "Total hip replacement for fracture (acute)", "Conversion THR", "Two-stage revision (infection)"],
      approaches: ["Direct anterior (Smith-Petersen)", "Anterolateral (Watson-Jones)", "Direct lateral (Hardinge)", "Posterolateral (Southern / Moore)", "Posterior", "Minimally invasive"],
      fixation: ["Reverse hybrid", "Cemented stem", "Uncemented stem", "Uncemented (press-fit) acetabular cup", "Cemented cup", "Dual-mobility cup", "Constrained liner", "Metal-on-polyethylene", "Ceramic-on-ceramic", "Ceramic-on-polyethylene", "Modular revision stem", "Bone graft / augment (acetabular or femoral)"],
      additionalProcedures: ["Trochanteric osteotomy / fixation", "Bone grafting", "Abductor repair", "Hardware removal"],
      restrictionPresets: ["Record the exact hip precautions AND their duration from the operative note (they differ by approach and by surgeon)", "Trochanteric osteotomy / abductor repair: protect abductors — no active abduction / passive adduction limits per surgeon"],
    },
    dislocation: {
      approaches: ["Posterior", "Anterior", "Lateral"],
      procedures: ["Acetabular revision (dual-mobility conversion)", "Abductor / capsular repair", "Femoral head-neck component exchange"],
      fixation: ["Dual-mobility cup", "Constrained liner"],
    },
    tendonRepair: {
      procedures: ["Gluteal tendon repair (gluteus medius / minimus)", "Hamstring origin repair", "Iliopsoas release / lengthening", "Abductor reconstruction", "Rectus femoris repair", "Adductor repair"],
      approaches: ["Lateral (trochanteric)", "Posterior", "Longitudinal", "Endoscopic"],
      fixation: ["Suture anchors", "Transosseous suture", "Suture-bridge repair"],
      graft: ["Autograft", "Allograft (Achilles)", "Synthetic augment"],
      immobilization: ["Hip abduction brace", "Abduction pillow / wedge", "None"],
      restrictionPresets: ["Protect the repair — avoid active contraction and stretch of the repaired muscle until surgeon clearance", "Weight-bearing status per surgeon (often partial in the early phase)"],
    },
    arthroscopy: {
      procedures: ["Hip arthroscopy", "Labral repair", "Labral debridement", "Labral reconstruction", "FAI cam resection (femoroplasty)", "Pincer resection (acetabuloplasty)", "Capsular repair / plication", "Loose body removal", "Chondroplasty / microfracture", "Gluteal tendon endoscopic repair"],
      approaches: ["Arthroscopic portals (anterolateral / mid-anterior / posterolateral)", "Peripheral compartment", "Central compartment"],
      fixation: ["Suture anchors", "Capsular sutures"],
      graft: ["Autograft (labral reconstruction)", "Allograft (labral reconstruction)"],
      immobilization: ["Hip brace (abduction / flexion-limiting)", "None"],
      restrictionPresets: ["Protect the labral / capsular repair — flexion, rotation and extension limits per surgeon", "Crutches with partial / flat-foot weight-bearing for the surgeon-specified period"],
    },
    tendonTransfer: {
      procedures: ["Gluteus maximus transfer", "Tensor fasciae latae transfer", "Iliopsoas transfer", "Other tendon transfer"],
      approaches: ["Lateral", "Posterior", "Anterior"],
      fixation: ["Suture anchors", "Transosseous suture"],
    },
  },

  /* ─────────────────────────── THIGH ─────────────────────────── */
  thigh: {
    fracture: {
      procedures: ["Femoral shaft fixation", "Subtrochanteric fracture fixation", "Distal femur fixation", "Periprosthetic femur fracture fixation", "Pathological fracture fixation"],
      approaches: ["Antegrade nailing (piriformis / trochanteric entry)", "Retrograde nailing (transarticular)", "Lateral", "Posterolateral", "Minimally invasive (MIPO)"],
      fixation: ["Intramedullary nail (antegrade)", "Intramedullary nail (retrograde)", "Locking plate + screws", "Cephalomedullary nail", "External fixator (damage control)", "Cerclage / cable"],
      restrictionPresets: ["Weight-bearing status strictly per surgeon (nail vs plate, fracture pattern and comminution change it)", "Watch for calf swelling / pain and breathlessness (DVT / PE risk after major femoral surgery)"],
    },
    tendonRepair: {
      procedures: ["Hamstring repair (proximal avulsion)", "Quadriceps muscle repair", "Adductor repair", "Rectus femoris repair", "Myositis ossificans excision"],
      approaches: ["Longitudinal", "Transverse (gluteal fold)", "Lateral"],
      fixation: ["Suture anchors", "Transosseous suture"],
      immobilization: ["Hip / knee brace", "None"],
    },
    deformityCorrection: {
      procedures: ["Femoral osteotomy", "Femoral derotation osteotomy", "Femoral lengthening (nail / external fixator)"],
    },
  },

  /* ─────────────────────────── KNEE ─────────────────────────── */
  knee: {
    fracture: {
      procedures: ["Distal femur fixation", "Tibial plateau fixation", "Tibial shaft fixation", "Patella fixation", "Tibial spine avulsion fixation", "Periprosthetic knee fracture fixation"],
      approaches: ["Lateral", "Medial", "Anteromedial", "Posteromedial", "Posterolateral", "Midline anterior", "Minimally invasive (MIPO)", "Retrograde nail entry", "Arthroscopic-assisted"],
      fixation: ["Locking plate + screws", "Buttress plate", "Retrograde intramedullary nail", "Tibial intramedullary nail", "Cannulated screws", "Tension band wiring (patella)", "Circular / hybrid external fixator", "Suture fixation (tibial spine)", "Bone graft / substitute"],
    },
    aclReconstruction: {
      procedures: ["PCL reconstruction", "PCL repair", "MCL repair / reconstruction", "LCL reconstruction", "Posterolateral corner (PLC) reconstruction", "Multiligament knee reconstruction", "Anterolateral ligament (ALL) reconstruction / lateral extra-articular tenodesis"],
      approaches: ["Arthroscopic portals", "Anteromedial portal", "Anterolateral portal", "Medial (MCL)", "Lateral (LCL / PLC)", "Open"],
      fixation: ["Interference screw (femoral)", "Interference screw (tibial)", "Suspensory / cortical button (femoral)", "Suture anchors", "Bone tunnel / tibial inlay (PCL)", "Staple", "Screw + washer"],
      graft: ["Hamstring (semitendinosus / gracilis) autograft", "Bone-patellar tendon-bone autograft", "Quadriceps tendon autograft", "Peroneus longus autograft", "Allograft", "Synthetic (LARS)"],
      additionalProcedures: ["Meniscal repair", "Partial meniscectomy", "Lateral extra-articular tenodesis", "Cartilage procedure"],
      immobilization: ["Hinged knee brace", "Locked in extension (per surgeon)", "Post-op ROM brace", "PCL brace (dynamic)", "None"],
    },
    meniscus: {
      procedures: ["Knee arthroscopy", "Cartilage procedure (microfracture / OATS / ACI)", "Loose body removal", "Synovectomy", "Lateral release", "ACL arthroscopic reconstruction", "Debridement / chondroplasty"],
      approaches: ["Arthroscopic portals (anteromedial / anterolateral)", "Mini-open"],
      fixation: ["All-inside meniscal repair device", "Inside-out sutures", "Outside-in sutures", "Suture anchors (root repair)", "Fibrin clot / biological augmentation"],
      immobilization: ["Hinged knee brace", "Locked in extension", "Crutches", "None"],
      restrictionPresets: ["Meniscal repair: limit weight-bearing and deep flexion under load per surgeon (repair site, tear pattern)", "Cartilage procedure: protected / partial weight-bearing and CPM per surgeon — the protocol is graft- and lesion-size specific"],
    },
    patellarInstability: {
      procedures: ["Medial patellofemoral ligament (MPFL) reconstruction", "Trochleoplasty", "Distal realignment (tibial tubercle transfer)", "Lateral retinacular lengthening", "Medial retinacular imbrication"],
      graft: ["Gracilis / semitendinosus autograft", "Quadriceps tendon strip", "Allograft"],
    },
    jointReplacement: {
      procedures: ["Primary TKR", "Revision TKR", "Unicompartmental knee replacement (medial / lateral)", "Patellofemoral replacement", "TKA with patellar resurfacing", "TKA without patellar resurfacing", "Bilateral TKR (single stage)", "Bilateral TKR (staged)", "Robotic-assisted TKR", "Arthrodesis (knee fusion)"],
      approaches: ["Standard anterior midline (medial parapatellar)", "Lateral parapatellar", "Quadriceps-sparing", "Minimally invasive", "Tibial tubercle osteotomy (exposure)"],
      fixation: ["Cruciate-retaining (CR)", "Posterior-stabilized (PS)", "Cruciate-sacrificing / ultracongruent", "Constrained condylar", "Rotating-hinge", "Mobile-bearing", "High-flexion design", "Patellar component", "Metaphyseal cones / sleeves", "Stemmed components"],
      additionalProcedures: ["Lateral release", "Patella resurfacing", "Tibial tubercle osteotomy", "Bone grafting"],
    },
    tendonRepair: {
      procedures: ["Patellar tendon repair", "Quadriceps tendon repair", "Patellar tendon reconstruction (augmented)", "Hamstring tendon repair", "Popliteus / iliotibial band procedure"],
      approaches: ["Midline anterior", "Medial parapatellar", "Longitudinal", "Posterior (hamstring)"],
      fixation: ["Transosseous patellar tunnels", "Suture anchors", "Cerclage / augmentation wire", "Suture-bridge repair"],
      graft: ["Autograft", "Allograft (Achilles / patellar tendon)", "Synthetic augment"],
      immobilization: ["Hinged knee brace (locked in extension)", "Knee immobilizer", "Cast", "ROM-limited brace"],
      restrictionPresets: ["Protect the repair — no active knee extension against resistance / straight-leg raise until the surgeon clears it", "Flexion limits per surgeon, typically progressed in stages", "Weight-bearing status and brace lock settings per operative note"],
    },
    tendonTransfer: {
      procedures: ["Hamstring transfer", "Quadriceps advancement", "Tibialis anterior transfer", "Other tendon transfer"],
      approaches: ["Medial", "Lateral", "Posterior"],
    },
  },

  /* ─────────────────────────── LEG (tibia / fibula) ─────────────────────────── */
  leg: {
    fracture: {
      procedures: ["Tibial shaft fixation", "Tibial plateau fixation", "Distal tibia / pilon fixation", "Fibular fixation", "Open fracture debridement + fixation", "Compartment syndrome fasciotomy", "Nonunion / malunion revision"],
      approaches: ["Intramedullary nail (infrapatellar / suprapatellar)", "Anterolateral", "Anteromedial", "Posterolateral", "Medial", "Minimally invasive (MIPO)"],
      fixation: ["Intramedullary nail", "Locking plate + screws", "Circular (Ilizarov) external fixator", "Uniplanar external fixator", "Lag screws", "Bone graft / substitute", "Flap cover (soft-tissue)"],
      immobilization: ["Long-leg cast", "Below-knee cast", "Functional fracture brace", "Splint", "Air-cast boot"],
      restrictionPresets: ["Weight-bearing status per surgeon — nail vs plate vs frame differ; record the exact order", "Pin-site care per protocol if an external fixator is in place", "Monitor for compartment syndrome and neurovascular change; escalate immediately"],
    },
    tendonRepair: {
      procedures: ["Achilles tendon repair (open)", "Achilles tendon repair (percutaneous)", "Achilles reconstruction (FHL / VY-plasty / graft)", "Fasciotomy"],
      approaches: ["Open posteromedial", "Percutaneous", "Minimally invasive"],
      fixation: ["Core suture repair", "Suture anchors (insertional)", "Tendon graft augmentation"],
      immobilization: ["Cast / boot with equinus wedges", "Air-cast boot with heel lifts", "Splint"],
    },
    deformityCorrection: {
      procedures: ["Proximal tibial osteotomy (HTO)", "Tibial derotation osteotomy", "Tibial lengthening", "Distal tibial osteotomy", "Correction with circular fixator (Ilizarov)"],
    },
  },

  /* ─────────────────────────── ANKLE ─────────────────────────── */
  ankle: {
    fracture: {
      procedures: ["Ankle fracture fixation (unimalleolar)", "Ankle fracture fixation (bimalleolar)", "Ankle fracture fixation (trimalleolar)", "Posterior malleolus fixation", "Pilon fracture fixation", "Talus fracture fixation", "Ankle arthrodesis"],
      approaches: ["Lateral (fibula)", "Medial (malleolus)", "Posterolateral", "Posteromedial", "Anterior (pilon / arthrodesis)", "Percutaneous"],
      fixation: ["Lateral fibular plate + screws", "Lag screws (medial malleolus)", "Tension band wiring", "Posterior antiglide plate", "Syndesmotic screw", "Suture-button (TightRope)", "Circular external fixator", "K-wires"],
    },
    achillesRupture: {
      procedures: ["Achilles tendon repair", "Achilles tendon reconstruction", "Peroneal tendon repair", "Tibialis posterior reconstruction", "Haglund / retrocalcaneal excision"],
      approaches: ["Posteromedial", "Posterolateral", "Longitudinal", "Minimally invasive"],
      fixation: ["Suture anchors", "Interference screw", "Tendon graft"],
    },
    ankleLigament: {
      procedures: ["Modified Broström repair", "Broström-Gould", "Anatomic lateral ligament reconstruction (graft)", "Deltoid ligament repair", "Syndesmosis fixation", "Ankle arthroscopy with ligament repair"],
      approaches: ["Lateral", "Medial", "Anterolateral", "Arthroscopic portals"],
      graft: ["Peroneus brevis (split)", "Gracilis / semitendinosus autograft", "Allograft"],
      immobilization: ["Below-knee cast", "Air-cast boot", "Lace-up ankle brace"],
    },
    jointReplacement: {
      procedures: ["Total ankle replacement", "Ankle arthrodesis (open)", "Ankle arthrodesis (arthroscopic)", "Revision ankle replacement", "Tibiotalocalcaneal fusion"],
      approaches: ["Anterior", "Lateral (transfibular)", "Arthroscopic portals"],
      fixation: ["Cemented component", "Cementless component", "Fusion screws", "Fusion plate", "Retrograde nail (TTC fusion)", "Bone graft"],
      immobilization: ["Below-knee cast", "Air-cast boot", "Splint"],
      restrictionPresets: ["Non-weight-bearing period per surgeon before progressive loading", "Elevation and wound protection early — soft tissue cover at the ankle is thin"],
    },
    arthroscopy: {
      procedures: ["Ankle arthroscopy", "Anterior impingement debridement", "Osteochondral lesion procedure (microfracture / OATS / ACI)", "Loose body removal", "Synovectomy", "Ankle ligament repair (arthroscopic)"],
      approaches: ["Arthroscopic portals (anteromedial / anterolateral / posterior)"],
      fixation: ["Suture anchors", "Bioabsorbable pins (OCD fixation)"],
      immobilization: ["Splint", "Air-cast boot", "None"],
    },
    jointStabilization: {
      procedures: ["Broström repair", "Lateral ligament reconstruction", "Syndesmotic stabilization", "Peroneal tendon stabilization"],
      approaches: ["Lateral", "Medial", "Arthroscopic portals"],
      fixation: ["Suture anchors", "Suture-button", "Tendon graft"],
      immobilization: ["Below-knee cast", "Air-cast boot", "Ankle brace"],
    },
    tendonTransfer: {
      procedures: ["Tibialis posterior transfer", "FHL (flexor hallucis longus) transfer", "Peroneal tendon transfer", "Tibialis anterior transfer"],
      approaches: ["Medial", "Lateral", "Posterior"],
      fixation: ["Interference screw", "Suture anchors"],
    },
  },

  /* ─────────────────────────── FOOT ─────────────────────────── */
  foot: {
    fracture: {
      procedures: ["Calcaneal fracture fixation", "Talus fracture fixation", "Metatarsal fixation", "Lisfranc fixation", "Phalangeal fixation", "Navicular / cuboid fixation", "Ankle fracture fixation"],
      approaches: ["Extensile lateral (calcaneus)", "Sinus tarsi (minimally invasive)", "Medial", "Dorsal", "Percutaneous", "Lateral"],
      fixation: ["Calcaneal plate + screws", "Cannulated screws", "K-wires", "Mini plates", "Lisfranc screws / bridge plate", "Suture-button", "External fixator"],
    },
    jointReplacement: {
      procedures: ["1st MTP arthroplasty", "1st MTP fusion", "Subtalar fusion", "Triple arthrodesis", "Midfoot fusion", "Ankle fusion"],
      approaches: ["Dorsal", "Medial", "Lateral"],
      fixation: ["Fusion screws", "Fusion plate", "Staples", "K-wires", "Bone graft", "Implant arthroplasty"],
      immobilization: ["Below-knee cast", "Post-op shoe", "Air-cast boot"],
    },
    deformityCorrection: {
      procedures: ["Bunion correction (hallux valgus) — osteotomy", "Bunion correction — soft tissue (McBride)", "Bunion correction — Lapidus procedure", "Hammer toe correction", "Flatfoot reconstruction", "Cavus foot correction", "Clubfoot release (Ponseti / PMSTR)"],
      approaches: ["Medial", "Dorsal", "Plantar", "Lateral", "Minimally invasive / percutaneous"],
      fixation: ["Screws", "K-wires", "Staples", "Plates", "Intramedullary pin"],
    },
    tendonRepair: {
      procedures: ["Achilles tendon repair", "Peroneal tendon repair", "Tibialis posterior reconstruction", "Plantar fascia release", "FHL / FDL transfer"],
      approaches: ["Medial", "Lateral", "Posterior", "Plantar"],
    },
    arthroscopy: {
      procedures: ["Subtalar arthroscopy", "Ankle arthroscopy", "Great toe (1st MTP) arthroscopy", "Endoscopic plantar fascia release", "Endoscopic gastrocnemius recession"],
      approaches: ["Arthroscopic / endoscopic portals"],
      immobilization: ["Post-op shoe", "Air-cast boot", "None"],
    },
    jointStabilization: {
      procedures: ["Lateral ligament reconstruction", "Peroneal tendon stabilization", "Lisfranc ligament reconstruction"],
      approaches: ["Lateral", "Dorsal"],
    },
    tendonTransfer: {
      procedures: ["Tibialis anterior transfer (split / full)", "Tibialis posterior transfer", "Peroneal transfer", "FHL / FDL transfer"],
      approaches: ["Medial", "Lateral", "Dorsal"],
      fixation: ["Interference screw", "Suture anchors"],
    },
  },

  /* ─────────────────────────── PELVIS ─────────────────────────── */
  pelvis: {
    fracture: {
      procedures: ["Pelvic ring fixation", "Acetabular fracture fixation", "Sacroiliac (SI) screw fixation", "Symphyseal plating", "Sacral fracture fixation", "Iliac wing fixation"],
      approaches: ["Ilioinguinal", "Stoppa (modified Rives)", "Pfannenstiel", "Kocher-Langenbeck (posterior)", "Extended iliofemoral", "Percutaneous (SI screws)", "Lateral window (anterior pelvic)"],
      fixation: ["Symphyseal plate", "Reconstruction plate", "SI screws (percutaneous)", "Iliosacral / transsacral screws", "Spinopelvic fixation", "Anterior pelvic external fixator", "Supra-acetabular external fixator"],
      restrictionPresets: ["Weight-bearing status per surgeon — pelvic and acetabular fixation usually restrict loading for weeks", "Avoid active hip abduction / straight-leg raise where the surgeon has flagged the fixation"],
    },
    jointReplacement: {
      procedures: ["Acetabular reconstruction", "Total hip replacement after acetabular fracture", "Custom pelvic prosthesis"],
      approaches: ["Posterior", "Direct lateral", "Anterior"],
      fixation: ["Acetabular cage / cup", "Bone graft", "Custom-made implant"],
    },
    deformityCorrection: {
      procedures: ["Periacetabular osteotomy (PAO)", "Pelvic osteotomy (Salter / Dega)", "Triple osteotomy"],
      approaches: ["Ilioinguinal", "Smith-Petersen"],
      fixation: ["Cortical screws", "K-wires"],
    },
  },

  /* ─────────────────────────── CERVICAL ─────────────────────────── */
  cervical: {
    fracture: {
      procedures: ["Anterior cervical plating", "Posterior cervical fusion", "Occipitocervical fusion", "Odontoid (dens) screw fixation", "C1–C2 fusion", "Halo fixation"],
      approaches: ["Anterior (Smith-Robinson)", "Posterior midline", "Combined anterior + posterior", "Transoral"],
      fixation: ["Anterior plate + screws", "Lateral mass screws + rods", "Pedicle screws", "Occipital plate + rods", "C1–C2 (Harms / Magerl) construct", "Odontoid screw", "Halo vest", "Bone graft"],
    },
    degenerative: {
      procedures: ["Cervical fusion (ACDF)", "Cervical disc replacement (arthroplasty)", "Posterior cervical fusion", "Laminoplasty", "Foraminotomy", "Corpectomy + cage", "Occipitocervical fusion", "Cervical microdiscectomy (posterior)"],
      approaches: ["Anterior (Smith-Robinson)", "Anterolateral", "Posterior midline", "Posterolateral (keyhole)", "Combined anterior + posterior", "Minimally invasive / tubular"],
      fixation: ["Interbody cage", "Anterior cervical plate", "Artificial disc", "Lateral mass screws + rods", "Pedicle screws + rods", "Occipital plate", "Bone graft (autograft / allograft / substitute)", "Laminoplasty plates / spacers"],
      immobilization: ["Soft collar", "Rigid cervical collar (Philadelphia / Aspen)", "Cervicothoracic brace", "Halo vest", "None"],
      restrictionPresets: ["Record collar type and duration exactly as prescribed", "Neck range-of-motion limits, lifting and driving restrictions per surgeon", "Report new swallowing difficulty, voice change, or arm weakness / numbness immediately"],
    },
    discHerniation: {
      procedures: ["Cervical disc replacement", "ACDF", "Posterior foraminotomy"],
      approaches: ["Anterior (Smith-Robinson)", "Posterior keyhole"],
      fixation: ["Interbody cage", "Anterior plate", "Artificial disc", "Bone graft"],
    },
  },

  /* ─────────────────────────── THORACIC ─────────────────────────── */
  thoracic: {
    fracture: {
      procedures: ["Thoracolumbar fracture fixation", "Kyphoplasty", "Vertebroplasty", "Posterior instrumented fusion", "Corpectomy + cage", "Spinal deformity correction"],
      approaches: ["Posterior midline", "Percutaneous", "Anterior (thoracotomy)", "Lateral (extracavitary)", "Combined"],
      fixation: ["Pedicle screws + rods", "Vertebral cement (PMMA)", "Interbody cage", "Anterior plate", "Bone graft"],
    },
    degenerative: {
      procedures: ["Posterior thoracic fusion", "Laminectomy", "Thoracic discectomy", "Scoliosis correction", "Kyphosis correction", "Costotransversectomy"],
      approaches: ["Posterior midline", "Posterolateral", "Anterior (thoracotomy)", "Lateral", "Minimally invasive / tubular", "Combined"],
      fixation: ["Pedicle screws + rods", "Hooks + rods", "Interbody cage", "Sublaminar wires", "Bone graft"],
      immobilization: ["Thoracolumbar brace (TLSO)", "None"],
    },
  },

  /* ─────────────────────────── LUMBAR ─────────────────────────── */
  lumbar: {
    fracture: {
      procedures: ["Thoracolumbar fracture fixation", "Kyphoplasty", "Vertebroplasty", "Posterior instrumented fusion", "Corpectomy + cage", "Percutaneous pedicle screw fixation"],
      approaches: ["Posterior midline", "Percutaneous", "Anterior", "Lateral (transpsoas)", "Combined"],
      fixation: ["Pedicle screws + rods", "Vertebral cement (PMMA)", "Interbody cage", "Anterior plate", "Bone graft"],
    },
    degenerative: {
      procedures: ["Lumbar microdiscectomy", "Lumbar discectomy", "Laminotomy", "Laminectomy", "Lumbar decompression", "Posterior lumbar fusion (PLF)", "TLIF", "PLIF", "ALIF", "XLIF / LLIF (lateral)", "OLIF (oblique)", "Lumbar disc replacement", "Interspinous device", "Spinal instrumentation", "Scoliosis correction", "Spondylolisthesis reduction + fusion", "Endoscopic discectomy / decompression", "Revision spine surgery"],
      approaches: ["Posterior midline", "Posterolateral (Wiltse)", "Paramedian", "Anterior (retroperitoneal)", "Lateral / transpsoas", "Oblique (OLIF)", "Percutaneous", "Minimally invasive / tubular", "Endoscopic (transforaminal / interlaminar)", "Combined"],
      fixation: ["Pedicle screws + rods", "Interbody cage (TLIF / PLIF)", "Interbody cage (ALIF / LLIF / OLIF)", "Lateral plate", "Artificial disc", "Interspinous spacer", "Vertebral cement (PMMA)", "Bone graft (autograft / allograft / substitute)", "Bone morphogenetic protein (BMP)"],
      immobilization: ["Lumbosacral corset", "Rigid TLSO / LSO brace", "None"],
      restrictionPresets: ["Record levels operated and number of fused levels", "Bending / lifting / twisting (BLT) restrictions and brace duration per surgeon", "Report new leg weakness, numbness, or bladder / bowel change immediately (cauda equina warning)", "Dural tear / CSF leak, if documented, changes early positioning and activity rules"],
    },
    discHerniation: {
      procedures: ["Lumbar microdiscectomy", "Endoscopic discectomy", "Lumbar decompression + discectomy", "Lumbar fusion (recurrent herniation)"],
      approaches: ["Posterior midline", "Paramedian", "Endoscopic (transforaminal / interlaminar)", "Minimally invasive / tubular"],
    },
  },

  /* ─────────────────────────── SACRUM ─────────────────────────── */
  sacrum: {
    fracture: {
      procedures: ["SI screw fixation", "Sacral fracture fixation", "Spinopelvic fixation", "Sacroplasty"],
      approaches: ["Percutaneous", "Posterior midline", "Anterior"],
      fixation: ["Iliosacral screws", "Transsacral screws", "Lumbopelvic (spinopelvic) fixation", "Sacral bar / plate"],
    },
    degenerative: {
      procedures: ["Sacroiliac joint fusion", "Lumbosacral fusion (L5–S1)", "Sacral decompression"],
      approaches: ["Lateral transarticular", "Posterior midline", "Anterior (ALIF L5–S1)", "Percutaneous"],
      fixation: ["SI fusion implants (triangular)", "Iliac screws", "Pedicle screws + rods"],
    },
  },
};

/* Flat (non-region) buckets — extra items unioned in. */
export const EXTRA_FLAT = {
  arthritis: {
    procedures: ["Arthrodesis / joint fusion", "Joint resurfacing", "Interpositional arthroplasty", "Cartilage restoration procedure", "High tibial osteotomy (knee)", "Periacetabular / femoral osteotomy (hip)", "Cheilectomy (1st MTP)"],
  },
  deformity: {
    procedures: ["High tibial osteotomy (HTO)", "Distal femoral osteotomy (DFO)", "Periacetabular osteotomy (PAO)", "Femoral / tibial derotation osteotomy", "Limb lengthening (nail / external fixator)", "Bunion / foot deformity correction", "Scoliosis correction (spinal)", "Growth modulation (guided growth)"],
    approaches: ["Medial opening wedge", "Lateral closing wedge", "Anterior", "Lateral", "Percutaneous", "Minimally invasive"],
    fixation: ["Locking plate + screws (opening wedge)", "Intramedullary lengthening nail", "Blade plate", "K-wires", "Screws"],
  },
  softTissue: {
    procedures: ["Soft-tissue release", "Bone grafting", "Debridement", "Bursectomy", "Ganglion / cyst excision", "Tendon lengthening", "Muscle repair"],
  },
  amputation: {
    procedures: ["Above-knee (transfemoral) amputation", "Below-knee (transtibial) amputation", "Through-knee disarticulation", "Ankle disarticulation (Syme)", "Partial foot amputation (Chopart / Lisfranc / transmetatarsal / toe)", "Upper-limb amputation (transradial / transhumeral / shoulder disarticulation)", "Partial hand / finger amputation", "Revision of residual limb", "Targeted muscle reinnervation (TMR)", "Osseointegration"],
    approaches: ["Long posterior flap", "Skew flap", "Fish-mouth (equal anteroposterior)", "Guillotine (staged)", "Ertl (bone-bridge) technique", "Myodesis / myoplasty closure"],
  },
  infection: {
    procedures: ["Two-stage revision (spacer + reimplantation)", "One-stage revision", "DAIR (debridement, antibiotics, implant retention)", "Excision arthroplasty (Girdlestone)", "Sequestrectomy", "Antibiotic cement / bead placement"],
  },
};

/* ---------------------------------------------------------------
   SURGICAL SITE — anatomical sub-sites per region. The form combines
   these with the selected region + side ("Right Hip", "Right Hip —
   Proximal femur").
   --------------------------------------------------------------- */
export const SITES_BY_REGION = {
  shoulder: ["Glenohumeral joint", "Proximal humerus", "Humeral shaft", "Clavicle", "AC joint", "Sternoclavicular joint", "Scapula", "Rotator cuff / subacromial space"],
  elbow: ["Elbow joint", "Distal humerus", "Olecranon", "Radial head / neck", "Coronoid", "Medial epicondyle (UCL / flexor origin)", "Lateral epicondyle (LCL / extensor origin)"],
  forearm: ["Radial shaft", "Ulnar shaft", "Both bones", "Distal radius", "Proximal radioulnar joint", "Distal radioulnar joint"],
  wrist: ["Distal radius", "Distal ulna / ulnar styloid", "Scaphoid", "Lunate / other carpal bones", "Carpal tunnel", "TFCC", "Radiocarpal joint"],
  hand: ["Metacarpal", "Proximal phalanx", "Middle / distal phalanx", "Thumb CMC joint", "MCP joint", "PIP / DIP joint", "Flexor tendon zone", "Extensor tendon zone"],
  hip: ["Hip joint", "Proximal femur (neck)", "Intertrochanteric / subtrochanteric", "Pelvis / acetabulum", "Greater trochanter / gluteal tendons", "Hamstring origin"],
  thigh: ["Femoral shaft", "Proximal femur", "Distal femur", "Quadriceps", "Hamstrings", "Adductors"],
  knee: ["Knee joint", "Distal femur", "Proximal tibia (plateau)", "Patella", "Patellar / quadriceps tendon", "Medial compartment", "Lateral compartment", "Patellofemoral compartment", "ACL / PCL", "Medial / lateral collateral ligaments", "Meniscus"],
  leg: ["Tibial shaft", "Fibula", "Proximal tibia", "Distal tibia (pilon)", "Achilles tendon", "Calf compartments"],
  ankle: ["Ankle joint", "Lateral malleolus", "Medial malleolus", "Posterior malleolus", "Distal tibia (pilon)", "Syndesmosis", "Talus", "Lateral ligament complex", "Achilles tendon", "Peroneal tendons"],
  foot: ["Calcaneus", "Talus", "Midfoot / Lisfranc", "Metatarsals", "1st MTP joint", "Toes / phalanges", "Subtalar joint", "Plantar fascia"],
  pelvis: ["Pelvic ring", "Acetabulum", "Sacroiliac joint", "Pubic symphysis", "Iliac wing"],
  cervical: ["Upper cervical (C1–C2)", "Mid cervical (C3–C5)", "Lower cervical (C5–C7)", "Cervicothoracic junction"],
  thoracic: ["Upper thoracic", "Mid thoracic", "Lower thoracic", "Thoracolumbar junction"],
  lumbar: ["Upper lumbar (L1–L3)", "Lower lumbar (L4–L5)", "Lumbosacral (L5–S1)", "Thoracolumbar junction"],
  sacrum: ["Sacrum", "Sacroiliac joint", "Coccyx", "Lumbosacral junction"],
};

/* ---------------------------------------------------------------
   INCISION TYPE — region + operation-group specific. `all` applies to
   every operation at that region; group keys refine it. Groups come
   from the condition (see INCISION_GROUP_BY_CONDITION below).
   --------------------------------------------------------------- */
export const INCISION_GROUP_BY_CONDITION = {
  jointReplacement: "replacement",
  fractureORIF: "fracture", fracture: "fracture",
  ligamentReconstruction: "ligament",
  tendonRepair: "tendon", tendonTransfer: "tendon",
  arthroscopy: "arthroscopy",
  spineSurgery: "spine", spine: "spine",
  jointStabilization: "stabilization", dislocation: "stabilization",
  deformityCorrection: "deformity",
  amputation: "amputation",
  softTissueMuscle: "soft", softTissue: "soft",
};

export const INCISIONS_BY_REGION = {
  shoulder: {
    all: ["Deltopectoral", "Arthroscopic portals", "Superior (deltoid-split / mini-open)", "Posterior", "Anterolateral"],
    replacement: ["Deltopectoral", "Superior (mini-open)"],
    fracture: ["Deltopectoral", "Deltoid-split (lateral)", "Superior / along clavicle", "Posterior", "Percutaneous"],
    tendon: ["Arthroscopic portals", "Deltoid-split (mini-open)", "Deltopectoral (subscapularis / pectoralis)", "Axillary / posterior (transfers)"],
    arthroscopy: ["Posterior portal", "Anterior portal", "Anterosuperior portal", "Lateral (subacromial) portal", "Accessory portals (Neviaser / 7 o'clock)"],
    stabilization: ["Arthroscopic portals", "Deltopectoral (open Bankart / Latarjet)", "Superior (AC joint)"],
  },
  elbow: {
    all: ["Posterior midline", "Lateral (Kocher / Kaplan)", "Medial", "Anterior", "Arthroscopic portals"],
    replacement: ["Posterior midline", "Lateral"],
    fracture: ["Posterior midline (triceps-splitting / olecranon osteotomy)", "Lateral (Kocher / Kaplan)", "Medial (Hotchkiss)", "Anterior"],
    tendon: ["Medial (UCL / flexor origin)", "Lateral (extensor origin)", "Anterior (distal biceps — single / double incision)", "Posterior (triceps)"],
    arthroscopy: ["Anteromedial portal", "Anterolateral portal", "Posterolateral portal", "Direct posterior portal"],
  },
  forearm: {
    all: ["Volar (Henry)", "Dorsal (Thompson)", "Subcutaneous border (ulna)", "Percutaneous"],
    fracture: ["Volar (Henry)", "Dorsal (Thompson)", "Subcutaneous border (ulna)", "Percutaneous / minimally invasive"],
    tendon: ["Volar", "Dorsal", "Zigzag (Brunner)"],
  },
  wrist: {
    all: ["Volar (FCR approach)", "Dorsal", "Radial", "Ulnar", "Arthroscopic portals", "Zigzag (Brunner)"],
    replacement: ["Dorsal longitudinal"],
    fracture: ["Volar (FCR approach)", "Dorsal", "Dorsoradial", "Percutaneous"],
    tendon: ["Volar longitudinal", "Zigzag (Brunner)", "Dorsal"],
    arthroscopy: ["3-4 portal", "4-5 portal", "6R portal", "Midcarpal portals"],
  },
  hand: {
    all: ["Dorsal", "Midaxial", "Volar zigzag (Brunner)", "Palmar (Dupuytren / trigger release)", "Percutaneous"],
    fracture: ["Dorsal", "Midaxial", "Volar", "Percutaneous pinning"],
    tendon: ["Volar zigzag (Brunner)", "Midaxial", "Dorsal", "Palmar (A1 pulley release)"],
    replacement: ["Dorsal (MCP / PIP)", "Volar (thumb CMC)", "Wagner (thumb CMC)"],
  },
  hip: {
    all: ["Direct anterior (Smith-Petersen)", "Anterolateral (Watson-Jones)", "Direct lateral (Hardinge)", "Posterior / posterolateral (Kocher-Langenbeck / Southern)", "Arthroscopic portals", "Percutaneous"],
    replacement: ["Direct anterior (Smith-Petersen)", "Anterolateral (Watson-Jones)", "Direct lateral (Hardinge)", "Posterior / posterolateral (Kocher-Langenbeck / Southern)", "Minimally invasive posterior / anterior"],
    fracture: ["Lateral (proximal femoral nail / sliding hip screw)", "Percutaneous (cannulated screws / nail)", "Direct lateral / anterolateral (hemiarthroplasty)", "Posterior (hemiarthroplasty / acetabulum)", "Ilioinguinal / Stoppa (acetabulum)"],
    arthroscopy: ["Anterolateral portal", "Mid-anterior portal", "Posterolateral portal", "Distal anterolateral accessory portal"],
    tendon: ["Lateral (trochanteric) longitudinal", "Posterior (hamstring origin — transverse gluteal fold)", "Endoscopic portals"],
  },
  thigh: {
    all: ["Lateral", "Posterolateral", "Anterior", "Percutaneous / MIPO", "Nail entry site (antegrade / retrograde)"],
    fracture: ["Antegrade nail entry (piriformis / trochanteric)", "Retrograde nail entry (infrapatellar)", "Lateral (plate)", "Percutaneous / MIPO"],
    tendon: ["Posterior longitudinal (hamstring)", "Transverse gluteal fold (hamstring origin)", "Anterior (quadriceps)"],
  },
  knee: {
    all: ["Midline anterior", "Medial parapatellar", "Lateral parapatellar", "Subvastus", "Midvastus", "Arthroscopic portals", "Medial", "Lateral", "Posteromedial", "Posterolateral"],
    replacement: ["Midline anterior with medial parapatellar arthrotomy", "Midline anterior with subvastus arthrotomy", "Midline anterior with midvastus arthrotomy", "Lateral parapatellar (valgus knee)", "Minimally invasive (quadriceps-sparing)"],
    fracture: ["Midline anterior", "Lateral (locking plate)", "Medial", "Anteromedial", "Posteromedial", "Posterolateral", "Percutaneous / MIPO", "Retrograde nail (infrapatellar)"],
    ligament: ["Arthroscopic portals (anteromedial / anterolateral)", "Graft-harvest incision — hamstring (anteromedial tibial)", "Graft-harvest incision — patellar tendon (midline)", "Graft-harvest incision — quadriceps tendon", "Medial hockey-stick (MCL)", "Lateral hockey-stick (LCL / PLC)", "Posteromedial (PCL inlay)"],
    arthroscopy: ["Anterolateral portal", "Anteromedial portal", "Posteromedial portal", "Posterolateral portal", "Superolateral portal", "Accessory portals"],
    stabilization: ["Medial parapatellar (MPFL)", "Medial (MPFL / VMO)", "Lateral (release)", "Arthroscopic portals", "Tibial tubercle (anteromedial)"],
    tendon: ["Midline anterior (patellar / quadriceps tendon)", "Medial parapatellar", "Posterior (hamstring)"],
  },
  leg: {
    all: ["Anterior / infrapatellar (nail)", "Anterolateral", "Anteromedial", "Posterolateral", "Medial", "Percutaneous / MIPO"],
    fracture: ["Infrapatellar (nail entry)", "Suprapatellar (nail entry)", "Anterolateral", "Anteromedial", "Posterolateral", "Medial (plate)", "Percutaneous / MIPO", "Fasciotomy incisions (medial + lateral)"],
    tendon: ["Posteromedial (open Achilles)", "Percutaneous (Achilles)", "Minimally invasive (Achilles)", "Posterolateral"],
  },
  ankle: {
    all: ["Lateral (fibula)", "Medial (malleolus)", "Anterior", "Posterolateral", "Posteromedial", "Arthroscopic portals", "Percutaneous"],
    fracture: ["Lateral (fibula — longitudinal)", "Medial (malleolus — curved / longitudinal)", "Posterolateral (posterior malleolus)", "Posteromedial", "Anterior (pilon / arthrodesis)", "Percutaneous (syndesmosis)"],
    replacement: ["Anterior (midline)", "Lateral transfibular (fusion)"],
    tendon: ["Posteromedial (Achilles)", "Percutaneous / minimally invasive (Achilles)", "Retromalleolar (peroneal)", "Medial (tibialis posterior)"],
    ligament: ["Lateral curvilinear (Broström)", "Anterolateral", "Arthroscopic portals"],
    arthroscopy: ["Anteromedial portal", "Anterolateral portal", "Posterolateral portal", "Posteromedial portal"],
  },
  foot: {
    all: ["Medial", "Dorsal", "Plantar", "Lateral", "Extensile lateral (calcaneus)", "Sinus tarsi", "Percutaneous", "Arthroscopic / endoscopic portals"],
    fracture: ["Extensile lateral (calcaneus)", "Sinus tarsi (minimally invasive)", "Medial", "Dorsal (metatarsal / Lisfranc)", "Percutaneous pinning"],
    deformity: ["Medial (bunion / first ray)", "Dorsal (hammer toe / first ray)", "Plantar (plantar fascia / sesamoid)", "Lateral (cavus foot / fifth ray)", "Minimally invasive / percutaneous"],
    replacement: ["Dorsal (1st MTP / midfoot)", "Medial (subtalar / triple)", "Lateral (subtalar / triple)"],
    tendon: ["Medial (tibialis posterior / FHL)", "Lateral (peroneal)", "Posterior (Achilles)", "Plantar (release)"],
  },
  pelvis: {
    all: ["Ilioinguinal", "Stoppa (modified Rives)", "Pfannenstiel", "Kocher-Langenbeck (posterior)", "Percutaneous (SI screws)", "Extended iliofemoral"],
    fracture: ["Ilioinguinal", "Stoppa (modified Rives)", "Pfannenstiel (symphysis)", "Kocher-Langenbeck (posterior wall / column)", "Percutaneous (iliosacral / transsacral screws)", "Extended iliofemoral"],
  },
  cervical: {
    all: ["Anterior (Smith-Robinson)", "Anterolateral", "Posterior midline", "Posterolateral (keyhole)", "Transoral", "Minimally invasive / tubular"],
    spine: ["Anterior transverse (skin crease)", "Anterior longitudinal (multilevel / corpectomy)", "Posterior midline", "Posterolateral (keyhole foraminotomy)", "Minimally invasive / tubular"],
    fracture: ["Anterior (Smith-Robinson)", "Posterior midline", "Combined anterior + posterior", "Transoral (odontoid)"],
  },
  thoracic: {
    all: ["Posterior midline", "Posterolateral", "Anterior (thoracotomy)", "Lateral (extracavitary)", "Thoracoscopic portals", "Minimally invasive / tubular", "Percutaneous"],
    spine: ["Posterior midline", "Posterolateral / costotransversectomy", "Anterior (thoracotomy)", "Lateral (extracavitary)", "Thoracoscopic portals", "Minimally invasive / tubular"],
    fracture: ["Posterior midline (open)", "Percutaneous pedicle screw", "Kyphoplasty / vertebroplasty (stab incisions)", "Anterior (thoracotomy)"],
  },
  lumbar: {
    all: ["Posterior midline", "Paramedian / Wiltse (muscle-splitting)", "Posterolateral", "Anterior retroperitoneal (ALIF)", "Lateral / transpsoas (XLIF / LLIF)", "Oblique (OLIF)", "Percutaneous", "Minimally invasive / tubular", "Endoscopic"],
    spine: ["Posterior midline (open laminectomy / fusion)", "Paramedian / Wiltse (muscle-splitting)", "Minimally invasive tubular (microdiscectomy / MIS-TLIF)", "Endoscopic (transforaminal / interlaminar)", "Anterior retroperitoneal (ALIF)", "Lateral transpsoas (XLIF / LLIF)", "Oblique (OLIF)", "Percutaneous pedicle screw (stab incisions)"],
    fracture: ["Posterior midline (open)", "Percutaneous pedicle screw", "Kyphoplasty / vertebroplasty (stab incisions)", "Lateral / anterior (corpectomy)"],
  },
  sacrum: {
    all: ["Posterior midline", "Percutaneous (SI screws)", "Lateral transarticular (SI fusion)", "Anterior retroperitoneal (L5–S1)"],
  },
  /* Region-agnostic operation groups — used when the region has no group entry. */
  _groups: {
    amputation: ["Long posterior flap", "Skew flap", "Fish-mouth (equal anteroposterior)", "Guillotine (to be revised)", "Sagittal flap", "Myodesis / myoplasty closure"],
    soft: ["Longitudinal", "Transverse", "Curvilinear", "Zigzag", "Percutaneous / minimally invasive", "Endoscopic"],
    deformity: ["Medial", "Lateral", "Anterior", "Percutaneous osteotomy", "Minimally invasive"],
    arthroscopy: ["Anterior portal", "Posterior portal", "Anterolateral portal", "Anteromedial portal", "Accessory portal"],
  },
};
