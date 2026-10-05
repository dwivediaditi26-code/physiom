// Region-specific diagnosis options for the Ortho Clinical Interpretation page
// (2026-10-05, Aditi: "in the outpatient, it should have the region specific
// physiotherapy diagnosis, differential diagnosis that are normally present for
// region wise").
//
// REGION_CONDITIONS are the app's own authored condition names for each region
// (the same list the Objective step uses: cervicalConditions.json,
// shoulderConditions.json ... ). They are copied here as names only so this page
// does not pull those large files into the assessment screens; a test checks
// the copy still matches the files.
//
// REGION_ALSO_CONSIDER are what is normally on the differential list for that
// region besides its own conditions: referred pain, nerve and vascular
// causes, fractures and red-flag pathology. Standard physiotherapy teaching
// content -- pick-or-type suggestions only, never filled in for the clinician.

// Which condition list a case's region uses -- the same rule the Objective step
// uses (sacrum/pelvis -> Lumbar, upper arm -> Shoulder, forearm/wrist/hand ->
// Elbow/Wrist/Hand, foot -> Ankle/Foot). Thigh, leg, whole body and "multiple"
// have no list of their own.
const BUCKET_OF_REGION = {
  cervical: "cervical", thoracic: "thoracic",
  lumbar: "lumbar", sacrum: "lumbar", pelvis: "lumbar",
  shoulder: "shoulder", upperArm: "shoulder",
  hip: "hip", knee: "knee",
  ankle: "ankleFoot", foot: "ankleFoot",
  elbow: "elbowWristHand", forearm: "elbowWristHand", wrist: "elbowWristHand", hand: "elbowWristHand",
};

export const BUCKET_LABEL = {
  cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar / SI", shoulder: "Shoulder",
  hip: "Hip", knee: "Knee", ankleFoot: "Ankle / Foot", elbowWristHand: "Elbow / Wrist / Hand",
};

export const REGION_CONDITIONS = {
  cervical: [
    "Mechanical / Non-Specific Neck Pain",
    "Cervical Radiculopathy (Disc Herniation / Nerve Root Compression)",
    "Cervical Facet (Zygapophyseal) Joint Dysfunction",
    "Cervicogenic Headache",
    "Whiplash-Associated Disorder (WAD)",
    "Acute Cervical Muscle Strain / Torticollis",
    "Cervical Spondylosis with Degenerative Stenosis",
    "Brachial Plexus Lesion / Burner-Stinger Syndrome",
    "Peripheral Nerve Entrapment (Distal, Non-Radicular)",
    "Cervical Myofascial Pain",
    "Serious Pathology / Red Flag",
  ],
  thoracic: [
    "Thoracic Facet (Zygapophyseal) / Mechanical Dysfunction",
    "Thoracic Disc Herniation / Nerve Root Pain",
    "Rib / Costovertebral-Costotransverse Dysfunction",
    "Thoracic Outlet Syndrome",
    "Scheuermann's Disease",
    "Postural Kyphosis (Round Back) / Upper Crossed Pattern",
    "Idiopathic Scoliosis",
    "Costochondritis / Tietze Syndrome",
    "Thoracic Myofascial Pain",
    "Ankylosing Spondylitis / Inflammatory Spondyloarthropathy",
    "Serious Pathology / Red Flag",
  ],
  lumbar: [
    "Mechanical / Non-Specific Low Back Pain",
    "Lumbar Disc Herniation / Radiculopathy",
    "Lumbar Facet (Zygapophyseal) Joint Dysfunction",
    "Lumbar Spinal Stenosis",
    "Sacroiliac Joint (SIJ) Dysfunction",
    "Lumbar Instability",
    "Spondylolisthesis / Spondylolysis",
    "Lumbar Muscle Strain",
    "Lumbar Myofascial Pain",
    "Inflammatory Back Pain (Axial Spondyloarthritis Pattern)",
    "Serious Pathology / Red Flag",
  ],
  shoulder: [
    "Subacromial Pain Syndrome (Impingement)",
    "Rotator Cuff Tendinopathy",
    "Rotator Cuff Tear (Full-Thickness)",
    "Adhesive Capsulitis (Frozen Shoulder)",
    "AC Joint Pathology",
    "Biceps Tendinopathy / SLAP",
    "Anterior Glenohumeral Instability",
    "Calcific Tendinopathy",
    "Glenohumeral Osteoarthritis",
    "Cervical Referral / Radiculopathy (exclude)",
  ],
  hip: [
    "Femoroacetabular Impingement (FAI) / Acetabular Labral Tear",
    "Hip Osteoarthritis",
    "Greater Trochanteric Pain Syndrome (Gluteal Tendinopathy)",
    "Proximal Hamstring Tendinopathy",
    "Adductor-Related Groin Pain (Adductor Strain / Athletic Pubalgia)",
    "Piriformis Syndrome / Deep Gluteal Syndrome",
    "Snapping Hip Syndrome (Coxa Saltans, Internal or External)",
  ],
  knee: [
    "ACL Tear / Insufficiency",
    "PCL Injury",
    "Meniscal Tear",
    "MCL Sprain",
    "LCL Sprain",
    "Patellofemoral Pain Syndrome (PFPS)",
    "Patellar Tendinopathy",
    "Knee Osteoarthritis",
    "Iliotibial Band Friction Syndrome",
  ],
  ankleFoot: [
    "Lateral Ankle Sprain (ATFL/CFL) — Acute",
    "Chronic Ankle Instability (CAI)",
    "High Ankle Sprain (Syndesmosis)",
    "Achilles Tendinopathy (Insertional or Mid-Portion)",
    "Achilles Tendon Rupture (Complete)",
    "Ankle Osteoarthritis",
    "Tibialis Posterior Dysfunction / Progressive Flatfoot (PTTD)",
    "Peroneal Tendinopathy",
    "Tarsal Tunnel Syndrome",
    "Anterior Ankle Impingement",
    "Plantar Fasciitis / Plantar Fasciopathy",
    "Heel Fat Pad Syndrome",
    "Morton's Neuroma (Interdigital Neuroma)",
    "Metatarsalgia (Mechanical Forefoot Overload)",
    "First MTP Osteoarthritis / Hallux Rigidus",
    "Turf Toe (1st MTP Hyperextension Sprain)",
    "Midfoot Sprain / Osteoarthritis (Navicular / Cuboid)",
  ],
  elbowWristHand: [
    "Lateral Epicondylalgia (ECRB Tendinopathy / Tennis Elbow)",
    "Medial Epicondylalgia (FCR/FCU / Golfer's Elbow)",
    "Distal Biceps Tendinopathy / Rupture",
    "Elbow Osteoarthritis",
    "Olecranon Bursitis",
    "UCL (Ulnar Collateral Ligament) Sprain",
    "Cubital Tunnel Syndrome (Ulnar Neuropathy at the Elbow)",
    "Radial Tunnel Syndrome",
    "Pronator Teres Syndrome",
    "Carpal Tunnel Syndrome (Median Nerve)",
    "De Quervain's Tenosynovitis",
    "TFCC Tear (Ulnar-Sided Wrist Pain)",
    "Scapholunate Ligament Instability",
    "Wrist Osteoarthritis (Radiocarpal)",
    "Distal Radius Fracture (Suspected, Colles/Barton)",
    "Scaphoid Fracture (Suspected)",
    "1st CMC Osteoarthritis (Thumb Base)",
    "ECU Tendinopathy / Instability",
    "Trigger Finger / Flexor Tenosynovitis (Wrist model)",
    "Digital Osteoarthritis (Heberden's / Bouchard's Nodes)",
    "Thumb Ulnar Collateral Ligament Injury (Skier's / Gamekeeper's Thumb)",
    "Trigger Finger / Thumb (Stenosing Flexor Tenosynovitis, Hand model)",
    "Dupuytren's Contracture (Palmar Fascia)",
    "Finger Sprain / Collateral Ligament Injury (Jammed Finger)",
    "Raynaud's Phenomenon (Vascular Differential)",
  ],
};

export const REGION_ALSO_CONSIDER = {
  cervical: ["Cervical myelopathy", "Thoracic outlet syndrome", "Shoulder pathology (referred pain)", "Vertebral artery insufficiency", "Temporomandibular disorder", "Cardiac cause (left arm or neck pain)"],
  thoracic: ["Cardiac or pulmonary cause", "Visceral referral (gallbladder, stomach, kidney)", "Cervical or lumbar referral", "Osteoporotic compression fracture", "Herpes zoster (shingles)", "Shoulder pathology"],
  lumbar: ["Hip osteoarthritis (referred pain)", "Piriformis / deep gluteal syndrome", "Cauda equina syndrome", "Vertebral fracture", "Spinal infection or tumour", "Visceral referral (kidney, gynaecological, vascular)", "Peripheral neuropathy"],
  shoulder: ["Cervical radiculopathy", "Thoracic outlet syndrome", "Suprascapular nerve entrapment", "Scapular dyskinesis", "Cardiac or diaphragmatic referral", "Fracture or dislocation"],
  hip: ["Lumbar referral (L1-L3)", "Sacroiliac joint dysfunction", "Femoral neck stress fracture", "Avascular necrosis", "Inguinal hernia or visceral cause", "Perthes disease / slipped femoral epiphysis (young patient)"],
  knee: ["Hip referral", "Lumbar referral (L3-L4)", "Pes anserine or prepatellar bursitis", "Fat pad impingement", "Plica syndrome", "Osgood-Schlatter disease (adolescent)", "Stress fracture", "Gout or septic arthritis", "Deep vein thrombosis"],
  ankleFoot: ["Lumbar radiculopathy (L5/S1)", "Stress fracture", "Fracture (check Ottawa rules)", "Gout", "Peripheral neuropathy", "Compartment syndrome", "Deep vein thrombosis", "Sever's disease (child)"],
  elbowWristHand: ["Cervical radiculopathy (C6-C8)", "Thoracic outlet syndrome", "Fracture", "Inflammatory arthritis (e.g. rheumatoid)", "Peripheral neuropathy", "Complex regional pain syndrome"],
};

// Not a diagnosis the physiotherapist would write -- listed under the
// differential only ("exclude" prompts, red-flag screens, vascular mimics).
const NOT_A_DIAGNOSIS = /\(exclude\)|serious pathology|vascular differential/i;

// "(Wrist model)" / "(Hand model)" mark which data set an entry belongs to; the
// clinician does not need to see them.
const tidy = (name) => name.replace(/\s*\((?:Wrist|Hand) model\)/i, "").replace(/,\s*(?:Wrist|Hand) model/i, "").trim();
const unique = (list) => [...new Set(list)];

export function regionBucketsOf(selectedRegions) {
  return unique((selectedRegions || []).map((r) => BUCKET_OF_REGION[r?.id]).filter(Boolean));
}

// { diagnoses, differentials, label } for the case's region(s); empty lists
// when none of them has a condition list of its own.
export function diagnosisOptionsFor(selectedRegions) {
  const buckets = regionBucketsOf(selectedRegions);
  const conditions = buckets.flatMap((b) => REGION_CONDITIONS[b]);
  return {
    diagnoses: unique(conditions.filter((n) => !NOT_A_DIAGNOSIS.test(n)).map(tidy)),
    differentials: unique([...conditions.map(tidy), ...buckets.flatMap((b) => REGION_ALSO_CONSIDER[b])]),
    label: buckets.map((b) => BUCKET_LABEL[b]).join(" / "),
  };
}
