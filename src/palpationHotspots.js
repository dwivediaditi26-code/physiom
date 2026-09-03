/* ============================================================
   palpationHotspots.js — ANATOMICAL_HOTSPOTS, moved verbatim out
   of ClinicalModules.jsx (2026-09-03) so the data can be shared
   without pulling that whole module in. ClinicalModules.jsx now
   imports it from here and re-exports it, so every existing
   consumer (the body-map PalpationModule, genericTestNav.js's
   condition -> hotspot targeting) is unchanged; the Ortho
   Outpatient wizard's region-wise Palpation screen
   (orthoPalpationData.js) reads the same one source.

   Each zone: { id, label, structures[], x (%), y (%), r, side }.
   Coordinates are % of the body-figure box; see the body-map
   renderer in ClinicalModules.jsx for how they are projected.
   ============================================================ */
export const ANATOMICAL_HOTSPOTS = [
  // ── HEAD & NECK (front) ─────────────────────────────────────────────────────
  { id:"scalp",           x:50.22,  y:9.92,   r:14, side:"front", label:"Scalp / Occiput",
    structures:["Occipitofrontalis","Temporalis","Suboccipital muscles","Occipital protuberance","Mastoid process"] },
  { id:"tmj_r",           x:55.7,  y:14.72,  r:7,  side:"front", label:"Right TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"tmj_l",           x:45.2,  y:14.72,  r:7,  side:"front", label:"Left TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"scm_r",           x:57,  y:20,  r:7,  side:"front", label:"Right SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"scm_l",           x:43,  y:20,  r:7,  side:"front", label:"Left SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"ant_cervical",    x:50,  y:19,  r:6,  side:"front", label:"Anterior Cervical Spine",
    structures:["C2–C7 anterior vertebral bodies","Longus colli / longus capitis","Thyroid cartilage (C4/5)","Hyoid bone (C3)","Carotid pulse"] },

  // ── NECK (back) ──────────────────────────────────────────────────────────────
  { id:"post_cervical",   x:50,  y:17,  r:10, side:"back", label:"Posterior Cervical Spine",
    structures:["C2–C7 spinous processes","Suboccipital triangle","Semispinalis capitis","Splenius capitis","Trapezius — upper fibres","Facet joints C2–C7"] },
  { id:"cerv_lat_r",      x:52.98,  y:19.74,  r:7,  side:"back", label:"Right Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },
  { id:"cerv_lat_l",      x:45.22,  y:19.74,  r:7,  side:"back", label:"Left Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },

  // ── SHOULDER (front) ─────────────────────────────────────────────────────────
  { id:"ac_joint_r",      x:64.83,  y:20.42,  r:6,  side:"front", label:"Right AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments (conoid & trapezoid)","Acromion tip"] },
  { id:"ac_joint_l",      x:36.52,  y:21.34,  r:6,  side:"front", label:"Left AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments","Acromion tip"] },
  { id:"ant_deltoid_r",   x:71.67,  y:23.16,  r:7,  side:"front", label:"Right Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"ant_deltoid_l",   x:31.5,  y:24.53,  r:7,  side:"front", label:"Left Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"lat_deltoid_r",   x:72.13,  y:26.81,  r:6,  side:"front", label:"Right Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"lat_deltoid_l",   x:26.93,  y:24.08,  r:6,  side:"front", label:"Left Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"sternum",         x:50,  y:32,  r:7,  side:"front", label:"Sternum / SC Joint",
    structures:["Sternoclavicular joint","Manubrium","Sternal body","Xiphoid process","Pectoralis major — sternal origin"] },
  { id:"pec_major_r",     x:58.43,  y:26.13,  r:8,  side:"front", label:"Right Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },
  { id:"pec_major_l",     x:39.72,  y:26.59,  r:8,  side:"front", label:"Left Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },

  // ── SHOULDER (back) ──────────────────────────────────────────────────────────
  { id:"post_deltoid_r",  x:71.24,  y:25.67,  r:7,  side:"back", label:"Right Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"post_deltoid_l",  x:28.33,  y:26.81,  r:7,  side:"back", label:"Left Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"supraspinatus_r", x:69.41,  y:21.79,  r:6,  side:"back", label:"Right Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"supraspinatus_l", x:30.61,  y:22.48,  r:6,  side:"back", label:"Left Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"infraspinatus_r", x:64.85,  y:26.81,  r:7,  side:"back", label:"Right Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"infraspinatus_l", x:33.8,  y:27.96,  r:7,  side:"back", label:"Left Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"trapezius_r",     x:61.65,  y:21.34,  r:8,  side:"back", label:"Right Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"trapezius_l",     x:38.37,  y:20.88,  r:8,  side:"back", label:"Left Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"scapula_r",       x:55.72,  y:26.81,  r:8,  side:"back", label:"Right Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },
  { id:"scapula_l",       x:41.11,  y:27.04,  r:8,  side:"back", label:"Left Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },

  // ── THORACIC SPINE (back) ────────────────────────────────────────────────────
  { id:"thoracic_spine",  x:49.33,  y:29.78,  r:8,  side:"back", label:"Thoracic Spine (T1–T12)",
    structures:["T1–T12 spinous processes","Thoracic facet joints","Erector spinae (iliocostalis / longissimus)","Multifidus","Costotransverse joints"] },
  { id:"mid_trap",        x:49.78,  y:24.08,  r:6,  side:"back", label:"Mid Trapezius / Interscapular",
    structures:["Middle trapezius","Lower trapezius","Rhomboid major","Interscapular trigger point zone","T2–T5 spinous processes"] },

  // ── ELBOW (front) ────────────────────────────────────────────────────────────
  { id:"lat_epicon_r",    x:79.43,  y:36.4,  r:6,  side:"front", label:"Right Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"lat_epicon_l",    x:21.91,  y:37.09,  r:6,  side:"front", label:"Left Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"med_epicon_r",    x:72.13,  y:37.32,  r:6,  side:"front", label:"Right Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"med_epicon_l",    x:28.76,  y:38.69,  r:6,  side:"front", label:"Left Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"ant_cubital_r",   x:74.87,  y:36.63,  r:5,  side:"front", label:"Right Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },
  { id:"ant_cubital_l",   x:26.02,  y:36.4,  r:5,  side:"front", label:"Left Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },

  // ── FOREARM (front) ──────────────────────────────────────────────────────────
  { id:"ant_forearm_r",   x:77.61,  y:41.88,  r:6,  side:"front", label:"Right Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },
  { id:"ant_forearm_l",   x:21.46,  y:42.57,  r:6,  side:"front", label:"Left Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },

  // ── WRIST & HAND ─────────────────────────────────────────────────────────────
  { id:"wrist_r",         x:81.26,  y:46.68,  r:6,  side:"front", label:"Right Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },
  { id:"wrist_l",         x:19.63,  y:46.68,  r:6,  side:"front", label:"Left Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },

  // ── ABDOMEN / LUMBAR (front) ─────────────────────────────────────────────────
  { id:"abdomen",         x:50,  y:43,  r:10, side:"front", label:"Abdomen",
    structures:["Rectus abdominis","External oblique","Linea alba","Umbilical region","Inguinal ligament","McBurney's point (appendix)"] },

  // ── LUMBAR SPINE (back) ──────────────────────────────────────────────────────
  { id:"lumbar_spine",    x:50.24,  y:42.34,  r:9,  side:"back", label:"Lumbar Spine (L1–L5)",
    structures:["L1–L5 spinous processes","Lumbar facet joints","Erector spinae (paraspinal)","Multifidus","Interspinous ligaments","L4/L5 — most common disc level"] },
  { id:"si_joint_r",      x:53.89,  y:45.31,  r:7,  side:"back", label:"Right Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"si_joint_l",      x:44.3,  y:45.31,  r:7,  side:"back", label:"Left Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"ql_r",            x:61.2,  y:39.6,  r:6,  side:"back", label:"Right Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },
  { id:"ql_l",            x:39.74,  y:40.06,  r:6,  side:"back", label:"Left Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },

  // ── HIP (front) ──────────────────────────────────────────────────────────────
  { id:"asis_r",          x:63,  y:48.05,  r:7,  side:"front", label:"Right ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"asis_l",          x:36.52,  y:47.82,  r:7,  side:"front", label:"Left ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"groin_r",         x:54.33,  y:51.7,  r:7,  side:"front", label:"Right Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },
  { id:"groin_l",         x:47.02,  y:51.93,  r:7,  side:"front", label:"Left Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },

  // ── HIP (back) ───────────────────────────────────────────────────────────────
  { id:"gmax_r",          x:62.57,  y:48.96,  r:9,  side:"back", label:"Right Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gmax_l",          x:37.46,  y:49.87,  r:9,  side:"back", label:"Left Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gt_r",            x:62.57,  y:53.98,  r:6,  side:"back", label:"Right Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"gt_l",            x:36.09,  y:53.75,  r:6,  side:"back", label:"Left Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"piriformis_r",    x:54.8,  y:52.84,  r:6,  side:"back", label:"Right Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },
  { id:"piriformis_l",    x:44.76,  y:52.38,  r:6,  side:"back", label:"Left Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },

  // ── THIGH (front) ────────────────────────────────────────────────────────────
  { id:"quad_r",          x:61.17,  y:58.55,  r:8,  side:"front", label:"Right Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },
  { id:"quad_l",          x:40.63,  y:59.23,  r:8,  side:"front", label:"Left Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },

  // ── THIGH (back) ─────────────────────────────────────────────────────────────
  { id:"hamstring_r",     x:59.83,  y:58.78,  r:9,  side:"back", label:"Right Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"hamstring_l",     x:40.2,  y:59.69,  r:9,  side:"back", label:"Left Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"itband_r",        x:63.93,  y:63.8,  r:6,  side:"back", label:"Right IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },
  { id:"itband_l",        x:35.17,  y:64.71,  r:6,  side:"back", label:"Left IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },

  // ── KNEE (front) ─────────────────────────────────────────────────────────────
  { id:"patella_r",       x:60.72,  y:68.14,  r:6,  side:"front", label:"Right Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"patella_l",       x:39.26,  y:66.77,  r:6,  side:"front", label:"Left Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"med_knee_r",      x:56.61,  y:69.28,  r:5,  side:"front", label:"Right Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"med_knee_l",      x:44.28,  y:67.45,  r:5,  side:"front", label:"Left Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"lat_knee_r",      x:64.37,  y:69.73,  r:5,  side:"front", label:"Right Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },
  { id:"lat_knee_l",      x:35.15,  y:67.22,  r:5,  side:"front", label:"Left Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },

  // ── KNEE (back) ──────────────────────────────────────────────────────────────
  { id:"popliteal_r",     x:59.37,  y:67.22,  r:7,  side:"back", label:"Right Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },
  { id:"popliteal_l",     x:39.28,  y:67.68,  r:7,  side:"back", label:"Left Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },

  // ── LOWER LEG (front) ────────────────────────────────────────────────────────
  { id:"ant_shin_r",      x:61.17,  y:77.5,  r:6,  side:"front", label:"Right Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },
  { id:"ant_shin_l",      x:39.72,  y:77.5,  r:6,  side:"front", label:"Left Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },

  // ── LOWER LEG (back) ─────────────────────────────────────────────────────────
  { id:"gastroc_r",       x:59.37,  y:75.21,  r:7,  side:"back", label:"Right Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },
  { id:"gastroc_l",       x:39.74,  y:75.9,  r:7,  side:"back", label:"Left Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },

  // ── ANKLE & FOOT ─────────────────────────────────────────────────────────────
  { id:"achilles_r",      x:59.83,  y:86.4, r:5,  side:"back", label:"Right Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"achilles_l",      x:37.91,  y:87.31, r:5,  side:"back", label:"Left Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"lat_ankle_r",     x:63,  y:86.86, r:6,  side:"front", label:"Right Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"lat_ankle_l",     x:36.98,  y:87.77, r:6,  side:"front", label:"Left Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"med_ankle_r",     x:57.52,  y:87.77, r:6,  side:"front", label:"Right Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"med_ankle_l",     x:43.37,  y:88, r:6,  side:"front", label:"Left Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"plantar_r",       x:63,  y:91, r:6,  side:"front", label:"Right Plantar Fascia / Heel",
    structures:["Plantar fascia — calcaneal origin","Calcaneal fat pad","Medial calcaneal tubercle","Plantar fascia — mid-band","1st MTP joint (hallux rigidus)"] },
  { id:"plantar_l",       x:38.35,  y:91.65, r:6,  side:"front", label:"Left Plantar Fascia / Heel",
    structures:["Plantar fascia — calcaneal origin","Calcaneal fat pad","Medial calcaneal tubercle","Plantar fascia — mid-band","1st MTP joint (hallux rigidus)"] },
];
