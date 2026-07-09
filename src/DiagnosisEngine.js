/**
 * DiagnosisEngine.js — flat diagnosis name list only.
 *
 * The clinical diagnosis SUGGESTION engine that used to live in this file
 * (runDiagnosisEngine, runNeuroPatternEngine, runFunctionalScreenEngine,
 * runOutcomeMeasureEngine, and the getTopDiagnoses/getTopDiagnosesEnhanced
 * wrappers around them) has been removed and replaced by
 * src/interpretationEngine/ (fed by src/interpretationAdapter.js), which is
 * now what powers "Suggested Clinical Diagnoses" in SOAP Notes' Assessment
 * tab. That old engine also read several field names (s_onset,
 * s_chief_complaint, s_aggravating, etc.) that the current Subjective module
 * doesn't actually write anymore -- the new engine's adapter was built
 * against the real, current field names instead.
 *
 * ALL_DIAGNOSES stays here because it's a separate, still-active feature: the
 * manual "Provisional Diagnosis" / differential dropdown pickers in SOAP
 * Notes search this full flat list independent of any suggestion engine.
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
