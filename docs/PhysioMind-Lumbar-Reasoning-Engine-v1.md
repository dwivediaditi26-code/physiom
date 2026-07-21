# PhysioMind Pro — Lumbar Clinical Reasoning Engine (Knowledge Base) v1.0

Status: in progress. This is a working clinical knowledge base, not yet clinically validated by a licensed physiotherapist — treat all content below as a draft pending human review before it drives any live recommendation.

---

## 0. Governing Architecture

**Three layers, strictly separated:**

1. **AI Interpreter** — input: patient's natural language (from `aiIntakeParser.js` / the Subjective Assessment AI panel). Output: structured variables only. Never diagnoses, never infers what wasn't stated.
2. **Knowledge Base** — this document. Curated condition profiles: supporting features, refuting features, red flags, typical presentation, objective test sequence. No AI involved in this layer — it's authored/reviewed content.
3. **Reasoning Engine** — deterministic code (not AI) that takes Layer 1's structured variables, compares against Layer 2's knowledge base, and outputs ranked clinical hypotheses, confidence, missing-information prompts, and suggested objective tests.

**AI's four permitted actions (Layer 1 only):**
1. Extract — the patient explicitly said it.
2. Normalize — map different wording ("catches" / "locks" / "gets stuck") to one canonical feature.
3. Classify — assign to the correct structured field.
4. Mark as Unknown — if not clearly stated. Never infer, never default to "No."

**Build order (do not skip ahead):**
1. Define the condition.
2. Define the complete subjective signature.
3. Define supporting variables.
4. Define refuting variables.
5. Define mandatory red flags.
6. Only then assign weights.

Weights are intentionally **not yet assigned** anywhere in this document — that happens only after every condition in the library below has its variables defined and reviewed.

**Variable state model (for when weighting does happen):** every variable will eventually carry three states — Present (supports), Absent (refutes), Unknown (0 points, but lowers confidence rather than counting as evidence). Unknown must never be silently treated as "No."

---

## 1. Lumbar Region Condition Library (v1)

| ID | Condition |
|---|---|
| L01 | Mechanical / Non-Specific Low Back Pain |
| L02 | Lumbar Disc Herniation / Radiculopathy |
| L03 | Lumbar Facet Joint Dysfunction |
| L04 | Lumbar Spinal Stenosis |
| L05 | Sacroiliac Joint Dysfunction |
| L06 | Lumbar Instability |
| L07 | Spondylolisthesis |
| L08 | Lumbar Muscle Strain |
| L09 | Lumbar Myofascial Pain |
| L10 | Inflammatory Back Pain |
| L11 | Serious Pathology (Red Flag) |

These represent clinical **hypotheses/patterns**, not confirmed diagnoses. Conditions with meaningfully different objective-finding profiles (e.g. discogenic pain without radiculopathy vs. radiculopathy vs. disc extrusion with high neural involvement) may later be split into sub-hypotheses even though they share much of the subjective signature — noted per-condition where relevant.

---

## 2. Universal Subjective Variables (collected for every lumbar patient, before any condition-specific reasoning)

- **A. Demographics** — age, sex, occupation, activity/sport level
- **B. Chief Complaint** — primary pain location, secondary pain location, pain distribution, unilateral/bilateral
- **C. Onset** — sudden, gradual, traumatic, non-traumatic, lifting, twisting, fall, repetitive loading, unknown
- **D. Duration** — <48h, acute, subacute, chronic, recurrent
- **E. Pain Behaviour** — constant, intermittent, morning, evening, night, mechanical, inflammatory, unpredictable
- **F. Aggravating Factors** — sitting, standing, walking, flexion, extension, rotation, lifting, cough, sneeze, Valsalva, stairs, running, sleeping
- **G. Relieving Factors** — rest, walking, sitting, standing, flexion, extension, heat, medication, lying, position change
- **H. Symptom Quality** — sharp, dull, ache, burning, electric, stabbing, throbbing, tightness, stiffness
- **I. Pain Distribution** — local lumbar, buttock, groin, posterior thigh, below knee, calf, foot, bilateral
- **J. Neurological Symptoms** — numbness, tingling, weakness, foot drop, balance problems
- **K. Red Flags** — all mandatory, every patient screened regardless of leading hypothesis
- **L. Previous Episodes**
- **M. Functional Limitation**
- **N. Patient Goal**

Condition-specific specs below re-use these same category letters (A–J) so the schema stays consistent across the whole library.

---

## 3. Condition Specifications

### L02 — Lumbar Disc Herniation / Lumbar Radiculopathy
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 Lumbar Spine — Table 9-5 "Differential Diagnosis of Mechanical Low Back Pain" (p.560–561), Table 9-18 "Differential Diagnosis of Lumbar Strain and Posterolateral Lumbar Disc Herniation at L5-S1" (p.641), Slump Test description (p.599–600), Straight Leg Raising Test description (p.600–601); McKenzie – *Mechanical Diagnosis and Therapy*; Goodman & Snyder – *Differential Diagnosis for Physical Therapists*; evidence-based lumbar radiculopathy CPGs. Page numbers verified against the actual uploaded Magee text, not recalled from training knowledge — see Section 3.5 for the source tables reproduced directly.

**Step 1 — Clinical Definition**
A lumbar intervertebral disc lesion with or without nerve root involvement, causing mechanical and/or radicular symptoms. Not a confirmed diagnosis — a working hypothesis.

**Step 2 — Subjective Variables**

- *A. Chief Complaint:* low back pain, leg pain, buttock pain, numbness, tingling, burning, weakness
- *B. Pain Distribution:* local lumbar (common), buttock (common), posterior thigh (common), lateral leg (common), below knee (very important), foot (important), dermatomal distribution (very important), bilateral (less common unless central lesion)
- *C. Onset:* heavy lifting, forward bending, twisting, lifting while rotating, sudden onset, acute onset, gradual onset, previous episodes, morning after lifting
- *D. Pain Behaviour — increases with:* sitting, driving, forward bending, putting on shoes, picking up objects, coughing, sneezing, Valsalva, long sitting, repeated flexion. *Decreases with:* walking, standing, lying prone (some patients), changing posture, extension (McKenzie responders)
- *E. Symptom Quality:* sharp, shooting, electric, burning, radiating, pins and needles, deep ache
- *F. Neurological Symptoms:* numbness, tingling, leg weakness, foot feels heavy, foot dragging, difficulty walking, loss of balance
- *G. Severity:* pain scale, irritability, constant/intermittent, pain after sitting, pain after bending, settling time
- *H. Functional Limitation:* cannot sit long, difficulty driving, lifting, bending, wearing shoes, getting out of bed, standing from chair, walking long distance
- *I. History:* previous episode, previous MRI, previous surgery, previous physiotherapy, previous injections
- *J. Red Flags (mandatory):* bladder changes, bowel changes, saddle anaesthesia, rapid weakness, fever, cancer history, night pain, weight loss

**Magee's SLR/Slump clinical nuance (p.600–601, directly from the text, not previously captured):** on the Straight Leg Raise, if the provoked pain is primarily *back* pain, the pathology is more likely central (smaller, more central disc prolapse); if primarily *leg* pain, the pathology is more likely lateral. Pain in both areas suggests a lesion between the two extremes. This should become a derived variable (`slrPainLocation`: back-dominant / leg-dominant / both) once objective SLR findings are captured, refining L02 vs. a more central discogenic pattern rather than just SLR positive/negative.

**Step 3 — Supporting Variables:** leg pain greater than back pain; pain radiates below knee; dermatomal symptoms; numbness; tingling; pain during cough/sneeze; flexion aggravates; sitting aggravates; acute lifting mechanism; recurrent episodes; walking reduces symptoms (in some patients); mechanical pattern; symptoms change with position; peripheralization with flexion history (if described).

**Step 4 — Refuting Variables:** completely localized pain only; no leg symptoms; pain never changes with movement; constant unremitting pain; fever; unexplained weight loss; progressive night pain unrelated to movement; morning stiffness >60 min; symptoms unaffected by posture or load; widespread diffuse pain without mechanical behaviour. (These make the hypothesis less likely — they don't necessarily prove another condition.)

**Step 5 — Derived/Calculated Variables:** mechanical behaviour (Yes/No); radicular pattern (Yes/Possible/No); neural involvement (None/Possible/Likely); flexion bias (Present/Absent); extension preference (Present/Absent); irritability (Low/Moderate/High); severity (Mild/Moderate/Severe); red flag screen (Negative/Incomplete/Positive); confidence in extracted data (High/Moderate/Low).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation → lumbar active ROM → repeated movement assessment (when appropriate) → neurological screen (myotomes, dermatomes, reflexes) → SLR → slump test.
- *Recommended (depending on findings):* crossed SLR; femoral nerve tension test (if upper lumbar symptoms); functional testing (sit-to-stand, gait, squat); core muscle assessment (only after irritability is considered).

Objective findings update the hypothesis; they don't replace it.

**Note — sub-hypothesis split (flagged, not yet built):** L02 likely needs three internal variants sharing most of the above subjective signature but diverging on objective findings/probability updates: mechanical discogenic pain without radiculopathy; lumbar radiculopathy; disc extrusion with high neural involvement. Deferred until weighting stage.

---

### L01 — Mechanical / Non-Specific Low Back Pain
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 Lumbar Spine — Table 9-5 "Differential Diagnosis of Mechanical Low Back Pain" (p.560–561, Muscle Strain column), Table 9-18 "Lumbar Strain vs. L5-S1 Disc Herniation" (p.641, Lumbar Strain column), Patient History red/yellow flag list (p.562–563); Kisner & Colby – *Therapeutic Exercise* (lumbar stabilization); McKenzie – *Mechanical Diagnosis and Therapy* (directional preference); Goodman & Snyder – *Differential Diagnosis for Physical Therapists* (screening out non-mechanical causes); O'Sullivan's classification of non-specific LBP (movement-impairment subgroups — widely used alongside the above, added here since it's directly relevant to this pattern even though not in your original reference list); NICE / APTA low back pain CPGs.

**Step 1 — Clinical Definition**
Low back pain arising from musculoskeletal structures (muscle, ligament, facet joint, disc, or a combination) without nerve root involvement, red-flag pathology, or a specific identifiable structural diagnosis. The most common lumbar presentation in general MSK practice (non-specific LBP accounts for the large majority of primary-care/OPD low back presentations). Not a confirmed diagnosis — a working hypothesis, and often the "default" pattern once L02/L04/L10/L11 are screened out.

**Step 2 — Subjective Variables**

- *A. Chief Complaint:* localized low back pain, general ache, stiffness, occasional non-dermatomal referral to buttock/proximal thigh
- *B. Pain Distribution:* local lumbar (very common), buttock (common, non-dermatomal), proximal thigh (occasional), below knee (rare — if present, reconsider L02/L04), no dermatomal pattern, usually unilateral or central, occasionally bilateral
- *C. Onset:* gradual (common) or sudden with an identifiable mechanical trigger (bending, lifting, twisting, prolonged static posture, unaccustomed activity); often no single clear traumatic event; recurrent episodes common
- *D. Pain Behaviour — increases with:* prolonged static posture (sitting or standing), specific movement directions (flexion or extension, patient-dependent), transitional movements (sit-to-stand, rolling in bed), end-range movement, load-bearing activity, fatigue accumulating through the day. *Decreases with:* position change, short rest, movement/activity within pain-free range, avoiding the specific aggravating posture
- *E. Symptom Quality:* dull ache (most common), stiffness, tightness, occasional sharp pain with a specific movement. No burning, electric, or radiating quality — presence of these should shift suspicion toward L02.
- *F. Neurological Symptoms:* absent — the absence itself is a defining/supporting feature for this pattern, not just a lack of a finding
- *G. Severity:* usually mild–moderate; irritability typically low–moderate (settles with rest or a position change within minutes, not hours); intermittent more common than constant unremitting pain
- *H. Functional Limitation:* difficulty with prolonged sitting/standing, bending, lifting; walking and gait usually preserved
- *I. History:* previous similar episodes very common (recurrent non-specific LBP is the norm, not the exception); no significant red-flag history; typically good response to prior conservative treatment if any
- *J. Red Flags (mandatory):* bladder changes, bowel changes, saddle anaesthesia, rapid/progressive weakness, fever, cancer history, unremitting night pain, unexplained weight loss — all expected **absent**; any present should immediately redirect toward L11.

**Magee's exact red-flag question list (p.562, verified from the uploaded text, not recalled):** history of cancer, sudden unexplained weight loss, immunosuppressive disorder, infection, fever, bilateral leg weakness, long-term steroid use (osteoporosis risk), and difficulty with micturition (urinary retention, chronic partial retention, vesicular irritability, or loss of awareness of the need to void — flagged as possibly myelopathy, cauda equina, tabes dorsalis, tumor, or multiple sclerosis, or alternatively a disc protrusion/stenosis with minimal back pain).

**Yellow flags (p.563, Waddell et al.'s Fear-Avoidance Beliefs Questionnaire and the New Zealand Acute Low Back Pain Guide, as cited in Magee):** belief that pain and activity are harmful; "sickness behaviors" (e.g. extended rest); low or negative mood, social withdrawal; treatment not fitting best practice; problems with compensation/claims; history of back pain, time off work, other claims; poor job satisfaction/problems at work; heavy work, unsociable hours; overprotective family or lack of support. Two screening questions Magee highlights specifically (Haggman et al.): "During the past month, have you often been bothered by feeling down, depressed, or hopeless?" and "During the past month, have you been bothered by little interest or pleasure in doing things?" — positive answers to either should prompt closer monitoring and possible psychological follow-up.

**Step 3 — Supporting Variables:** pain localized to lumbar/buttock without leg symptoms; symptoms clearly vary with posture/movement (mechanical behaviour); no neurological symptoms; no dermatomal pattern; pain eases with rest or position change; gradual or activity-related onset; previous similar episodes with full recovery; identifiable directional preference (McKenzie-type response to a specific movement); symptoms proportionate to mechanical load/activity.

**Step 4 — Refuting Variables:** leg pain greater than back pain (→ reconsider L02); pain below the knee or dermatomal pattern (→ L02); positive neurological symptoms (→ L02); any red flag present (→ L11); constant, unremitting pain unaffected by position or movement (→ L10/L11); progressive night pain (→ L10/L11); onset in an older adult with no mechanical trigger and no directional preference (→ consider L04); morning stiffness >60 minutes (→ consider L10); bilateral leg symptoms relieved by flexion / worsened by extended walking (→ consider L04).

**Step 5 — Derived/Calculated Variables:** mechanical behaviour (Yes/No); radicular pattern (expected None — presence contradicts this hypothesis); neural involvement (expected None); directional preference (Flexion/Extension/None identified); irritability (Low/Moderate/High); chronicity (Acute/Subacute/Chronic/Recurrent); red flag screen (Negative/Incomplete/Positive); confidence in extracted data (High/Moderate/Low).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation (posture, gait, muscle guarding) → lumbar AROM (flexion, extension, side flexion, rotation — range, quality, pain response, directional preference) → repeated movement assessment (McKenzie-style, to establish directional preference/centralization) → neurological screen (myotomes, dermatomes, reflexes — expected normal, done to actively rule out L02) → SLR (expected negative, done to screen out neural tension).
- *Recommended (depending on findings):* palpation (soft tissue and segmental) for pain provocation/muscle guarding; PA/central PA glides (segmental joint mobility and pain provocation — differentiates facet/segmental involvement); core/lumbopelvic motor control assessment; functional movement screen (squat, sit-to-stand, single-leg stance); outcome measures — Oswestry Disability Index, Numeric Pain Rating Scale, and a psychosocial/fear-avoidance screen (Fear-Avoidance Beliefs Questionnaire or STarT Back) given this pattern's chronicity/recurrence risk.

Objective findings update the hypothesis (e.g. a clear directional preference strengthens it; a positive neuro screen or SLR should demote it in favor of L02).

---

### L03 — Lumbar Facet (Zygapophyseal) Joint Dysfunction
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-5 Osteoarthritis column (p.560–561), facet joint pain-pattern prose (p.557–558), Quadrant/Kemp's Test description (p.610), "Key Tests... for Joint Dysfunction" list (p.593).

**Step 1 — Clinical Definition**
Pain arising from the facet (zygapophyseal) joints — degenerative (osteoarthritic) or mechanically irritated — typically unilateral, localized, extension/rotation-provoked. Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* unilateral back pain, occasional referral to buttock/proximal thigh (non-dermatomal), stiffness
- *B. Pain Distribution:* local lumbar (unilateral), buttock (occasional), no below-knee pain, no dermatomal pattern
- *C. Onset:* insidious/degenerative (typical, older patients) — Magee's Table 9-5 lists age >50 for the osteoarthritis pattern; can also be mechanical/acute in younger patients from a specific extension+rotation movement
- *D. Pain Behaviour — increases with:* standing, extension, rotation to the painful side, combined extension+side-flexion+rotation (quadrant loading). *Decreases with:* sitting, flexion, lying with knees bent
- *E. Symptom Quality:* localized ache, stiffness, occasional sharp catch on specific movement
- *F. Neurological Symptoms:* none — presence should shift toward L02
- *G. Severity:* usually mild–moderate; morning stiffness from joint effusion common
- *H. Functional Limitation:* difficulty with standing, walking downhill (facet loading), transitional extension movements
- *I. History:* often a long-standing, slowly progressive pattern in degenerative cases; may be acute in younger patients after a specific extension/rotation load
- *J. Red Flags (mandatory):* same universal screen as L01/L02 — expected absent

**Key distinguishing feature Magee notes explicitly (p.558):** with facet joint problems, active ROM restriction is present from the *start* and stays roughly the same through the exam — it does not progressively worsen with repeated movement the way disc-related restriction can. This is a real, citable differentiator from L02, worth its own derived variable.

**Step 3 — Supporting Variables:** extension and/or rotation aggravates; flexion relieves; sitting relieves; no leg symptoms below knee; no dermatomal pattern; ROM restricted but stable/consistent (not progressively worsening); age >50 (if degenerative); ROM restricted from movement onset, not a delayed/progressive block.

**Step 4 — Refuting Variables:** pain below knee or dermatomal (→ L02); flexion aggravates and extension relieves (→ reconsider L01/L02, opposite directional pattern); progressively worsening ROM restriction through repeated movement testing (→ L02); bilateral leg symptoms with walking (→ L04); any red flag (→ L11).

**Step 5 — Derived/Calculated Variables:** extension/rotation bias (Present/Absent); ROM restriction pattern (Fixed-from-onset / Progressive — the L03 vs. L02 differentiator above); radicular pattern (expected None); age band (matches Table 9-5 OA column if >50).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation → lumbar AROM all planes (note ROM restriction pattern) → **Quadrant Test / Kemp's Test** (extension + side flexion + rotation to symptomatic side with overpressure — maximally narrows the intervertebral foramen and loads the facet on that side; positive if symptoms reproduced) → neuro screen (expected normal).
- *Recommended:* PA central and unilateral vertebral pressures (PACVP/PAUVP — segmental facet provocation); passive physiological intervertebral movements; one-leg standing (stork) lumbar extension test (also screens for L07); x-ray if degenerative changes suspected (Table 9-5 lists x-ray positive for this pattern).

---

### L04 — Lumbar Spinal Stenosis
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-5 Spinal Stenosis column (p.560–561), Table 9-15 Vascular vs. Neurogenic Claudication (p.614), Bicycle Test of van Gelderen / Stoop Test / Treadmill Test descriptions (p.611–612).

**Step 1 — Clinical Definition**
Narrowing of the central canal, lateral recess, and/or neural foramina causing neurogenic (pseudo)claudication — bilateral leg symptoms provoked by walking/standing, relieved by flexion. Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* leg pain/heaviness/aching, usually bilateral, provoked by walking or prolonged standing
- *B. Pain Distribution:* leg (bilateral — Table 9-5), back pain often minor or secondary to the leg symptoms
- *C. Onset:* insidious (Table 9-5); age >60 typical
- *D. Pain Behaviour — increases with:* standing, walking (especially extended distance/uphill/extended posture), lumbar extension. *Decreases with:* sitting, forward flexion, leaning on a trolley/counter ("shopping trolley sign")
- *E. Symptom Quality:* aching, heaviness, cramping in both legs, spreading from area to area with continued walking (per Table 9-15)
- *F. Neurological Symptoms:* may follow specific dermatomes once provoked (Table 9-15); reflexes decreased during/after provocation but return quickly at rest
- *G. Severity:* symptom onset is walking-distance dependent — Magee's Stoop Test description notes classic onset "within a distance of 50 m (165 feet)" of brisk walking
- *H. Functional Limitation:* limited walking distance, better with a flexed posture (leaning on a cart), difficulty with prolonged standing
- *I. History:* gradual progression typical of degenerative stenosis
- *J. Red Flags (mandatory):* bilateral leg symptoms plus any bladder/bowel change should immediately raise cauda equina concern (L11) rather than being assumed benign stenosis

**Step 3 — Supporting Variables:** bilateral leg symptoms; walking provokes symptoms; flexion/sitting/leaning-forward relieves; age >60; insidious onset; pulse present after exercise (distinguishes from vascular claudication per Table 9-15); symptoms spread from area to area rather than appearing simultaneously at fixed sites.

**Step 4 — Refuting Variables:** unilateral leg symptoms only (→ reconsider L02); pulse absent after exercise (→ vascular claudication, not neurogenic — refer appropriately); symptoms unrelated to walking/posture; pain at multiple sites simultaneously rather than spreading (→ vascular); young age with acute onset (→ reconsider L02/L07).

**Step 5 — Derived/Calculated Variables:** claudication type (Neurogenic/Vascular/Mixed/Unclear — per Table 9-15 criteria); walking distance to symptom onset; flexion relief (Present/Absent); bilaterality (Present/Absent — bilateral is the expected/supporting pattern here).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation (posture, often flexed/forward-leaning) → lumbar AROM (extension likely limited/provocative, flexion relatively preserved) → neuro screen bilateral lower limb → bilateral SLR.
- *Recommended, specifically for claudication differentiation:* **Bicycle Test of van Gelderen** (pedal leaning back — provokes buttock/thigh pain then tingling if positive; leaning forward while continuing to pedal relieves symptoms if genuinely neurogenic); **Stoop Test** (brisk walking until symptoms, then forward flexion — relief supports neurogenic pattern); **Treadmill Test** (walk at 1.2 mph and at preferred speed up to 15 minutes, recording time-to-first-symptoms and total ambulatory time) — useful to distinguish from vascular claudication and to document a baseline/outcome measure; pulse check (present after exercise supports neurogenic per Table 9-15, absent suggests vascular — refer accordingly).

---

### L07 — Spondylolisthesis / Spondylolysis
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-5 Spondylolisthesis column (p.560–561), Step Deformity observation (p.569), One-Leg Standing (Stork Standing) Lumbar Extension Test (p.593, listed under "Key Tests... for Joint Dysfunction"), Meyerding grading system reference (p.628, figure).

**Step 1 — Clinical Definition**
Spondylolysis: a stress fracture/defect of the pars interarticularis without vertebral slippage. Spondylolisthesis: forward slippage of one vertebra on the one below (graded 1–4 by the Meyerding system), which may follow a spondylolytic defect or degenerative change. Classically a young athlete with repetitive lumbar extension loading. Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* back pain, typically without leg pain (Table 9-5: "Back" only)
- *B. Pain Distribution:* local lumbar; leg symptoms only if slippage is significant enough to compromise a nerve root
- *C. Onset:* insidious (Table 9-5); classically young athlete (~20 years, Table 9-5), sport involving repeated lumbar extension/hyperextension (gymnastics, fast bowling, diving, weightlifting)
- *D. Pain Behaviour — increases with:* standing, extension (loads the pars/slipped segment). *Decreases with:* sitting, flexion
- *E. Symptom Quality:* localized ache, sometimes sharp with extension-loading activity
- *F. Neurological Symptoms:* usually absent unless significant slip compromises a nerve root
- *G. Severity:* often activity-related, worse with sport participation
- *H. Functional Limitation:* difficulty with extension-loading sport activity specifically
- *I. History:* sport with repetitive extension loading; growth-phase athlete (paediatric/adolescent) is a recognized risk group
- *J. Red Flags (mandatory):* universal screen — same as other conditions; a large/progressive slip with new neurological signs should escalate concern

**Step 3 — Supporting Variables:** young athlete; sport with repeated lumbar extension; extension aggravates, flexion relieves; back pain only, no leg pain; step deformity on observation/palpation (spinous process prominence where one vertebra has slipped on another, per Magee's Figure 9-23).

**Step 4 — Refuting Variables:** older patient with no relevant sport history and no step deformity (though degenerative spondylolisthesis in older adults is a recognized separate pattern, not covered by this younger-athlete-oriented spec); leg pain dominant with dermatomal features (→ L02, though may co-exist with a significant slip); flexion aggravates and extension relieves (opposite pattern, → reconsider L01/L03).

**Step 5 — Derived/Calculated Variables:** extension bias (Present/Absent); step deformity (Present/Absent, on palpation); athlete/repetitive-extension-sport history (Present/Absent); age band (young/growth-phase vs. older/degenerative).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation (palpate for step deformity/spinous process prominence) → lumbar AROM (extension likely provocative) → **One-Leg Standing (Stork Standing) Lumbar Extension Test** (patient stands on one leg and extends the lumbar spine; positive if pain reproduced on the tested side — loads the pars on that side) → neuro screen (expected normal unless significant slip).
- *Recommended:* lumbar x-ray (AP, lateral, oblique — Table 9-5 lists x-ray positive for this pattern; oblique view classically shows the "Scotty dog" pars defect); SPECT/MRI if x-ray negative but clinical suspicion remains high (more sensitive for an active pars stress reaction, especially relevant in young athletes); Meyerding grading (1–4) once imaging confirms a slip, to gauge severity; hamstring length (tight hamstrings are a recognized associated finding).

---

### L05 — Sacroiliac Joint (SIJ) Dysfunction
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.10 Pelvis — Appendix 10-1 "Reliability, Validity, Specificity, and Sensitivity of Special/Diagnostic Tests Used in the Pelvis" (p.668.e1–e2); Gaenslen's Test, Gillet's Test descriptions (p.679).

**Step 1 — Clinical Definition**
Pain arising from the sacroiliac joint(s) — mechanical/movement dysfunction rather than a structural lesion in most cases. Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* unilateral buttock/SI region pain, occasional groin or posterior thigh referral (rarely below knee)
- *B. Pain Distribution:* SI joint region, buttock, occasionally posterior thigh — no dermatomal pattern
- *C. Onset:* often a specific event (pregnancy/postpartum, single-leg-loading injury, fall onto buttock) or insidious
- *D. Pain Behaviour — increases with:* unilateral standing/weight-bearing, transitional movements (rolling in bed, getting out of car), stairs, prolonged standing on one leg. *Decreases with:* rest, avoiding asymmetric loading
- *E–J:* same universal categories as other conditions; no dermatomal/neuro findings expected

**Step 3 — Supporting Variables:** pain localized to SI joint region; provoked by asymmetric/unilateral loading; recent pregnancy or postpartum status; positive response to a cluster of SIJ provocation tests (see note below — single tests are individually weak).

**Step 4 — Refuting Variables:** dermatomal or below-knee leg pain (→ L02); midline lumbar pain without SI-region localization (→ L01/L03); any red flag (→ L11).

**Important evidence-strength note, directly from Magee's own reliability appendix (not general recall):** individual SIJ special tests are, on their own, weak diagnostic tools. From Appendix 10-1: FABERE sensitivity only 10% (specificity 86%); Gillet's Test reliability is poor to the point of unusable alone (intrarater kappa 0.08, interrater kappa −0.00 to 0.02 across two cited studies); Gaenslen's Test sensitivity ~50–53%; Compression Test sensitivity 60% (specificity 69%); Distraction Test sensitivity 55–60% (specificity 81–100%); Sacral Thrust sensitivity 63% (specificity 75%). No single test here should carry much weight alone — this matches the wider literature's move toward test *clusters* (e.g., Laslett's cluster) rather than any one isolated test, though the cluster itself isn't detailed in this particular chapter.

**Step 5 — Derived/Calculated Variables:** unilateral loading pattern (Present/Absent); postpartum/pregnancy-related (Present/Absent); SIJ provocation cluster result (Positive/Negative/Equivocal — once objective tests are run).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation → **SIJ provocation cluster**, not a single test: Compression Test, Distraction Test, Sacral Thrust, Gaenslen's Test, FABERE/Patrick Test, Gillet's (Sacral Fixation) Test → active straight leg raise.
- *Recommended:* palpation (PSIS, sacral sulcus, sacral inferior lateral angle — noted in Magee's own appendix as having weak interrater reliability, kappa 0.04–0.08, so palpation findings alone shouldn't be over-weighted either); standing/sitting flexion tests; referral for ESR/CRP/HLA-B27 if inflammatory features co-exist (overlaps with L10).

---

### L06 — Lumbar Instability
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — "Tests for Lumbar Instability" section (p.605–607): Passive Lumbar Extension Test, H and I Stability Tests, Farfan Torsion Test, Pheasant Test.

**Step 1 — Clinical Definition**
A brief (millisecond-scale) loss of the patient's ability to control movement through part of the range — Pope's "loss of control in the neutral spine" — as distinct from true structural instability (most often from spondylolisthesis). Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* pain with a "catch," apprehension, or a sudden give-way sensation during movement — Magee's own term is an "instability jog" (sudden shift of movement partway through the range)
- *C. Onset:* often insidious, commonly associated with disc degeneration (spondylosis); structural instability specifically associated with spondylolisthesis (cross-reference L07)
- *D. Pain Behaviour:* pain/apprehension at a specific, repeatable point in a movement (not simply end-range) — the give-way point itself, not just aggravating positions
- *F:* usually no true neurological findings unless co-existing nerve root involvement
- *I. History:* recurrent "giving way" episodes, feeling the back needs to be guarded/braced during ordinary movement

**Step 3 — Supporting Variables:** reported catch/give-way/apprehension during specific movement; positive Passive Lumbar Extension Test (strong lumbar pain, a heavy feeling, or a sensation the low back is "coming off," resolving when the legs are lowered — numbness/tingling during the test does *not* count as positive); asymmetric limitation pattern on H and I testing (only one of the two test movements limited in the same quadrant, rather than both — see note below); known/imaged spondylolisthesis.

**Step 4 — Refuting Variables:** limitation present on *both* H and I movements in the same quadrant (→ suggests hypomobility, not instability); numbness/tingling as the only positive Passive Lumbar Extension Test finding (Magee explicitly notes this does not count); no repeatable give-way point, just general pain with movement (→ reconsider L01/L03).

**Step 5 — Derived/Calculated Variables:** instability pattern (Present/Absent); structural vs. functional instability (per H/I test differentiation above); associated spondylolisthesis (Present/Absent/Unknown).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation for instability jog during active movement → **Passive Lumbar Extension Test** (prone, both legs lifted/extended ~30cm with gentle traction; positive = strong lumbar pain/heaviness/"coming off" feeling relieved on lowering) → **H and I Stability Tests** (side-flex/flex/extend pattern; both moves limited in same quadrant = hypomobility, only one move limited = instability).
- *Recommended:* Farfan Torsion Test (prone, ilium pulled posteriorly to torque the spine — positive if symptoms reproduced); Pheasant Test (prone, spine pressure + passive knee flexion to heels — positive if leg pain provoked, indicating an unstable segment); imaging if structural instability/spondylolisthesis suspected (cross-reference L07's imaging matrix).

---

### L08 — Lumbar Muscle Strain
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-5 Muscle Strain column (p.560–561), Table 9-18 Lumbar Strain column in full (p.641).

**Step 1 — Clinical Definition**
Injury to lumbar musculature (or its musculotendinous attachments) from flexion/side-flexion/rotation under load or an uncontrolled movement. The most literally "mechanical" of the lumbar patterns — no neural involvement by definition. Not a confirmed diagnosis.

**Step 2 — Subjective Variables**
- *A. Chief Complaint:* unilateral back pain, may refer to buttock (Table 9-5/9-18)
- *C. Onset:* acute (Table 9-5: age 20–40 typical), mechanism = flexion, side flexion, and/or rotation under load, or an uncontrolled/unguarded movement (Table 9-18)
- *D. Pain Behaviour — increases with:* standing (Table 9-5); on stretch — flexion, side flexion, rotation (Table 9-18); pain especially on muscle contraction (resisted testing). *Decreases with:* sitting (Table 9-5)
- *F. Neurological Symptoms:* none (Table 9-18: neurological tests negative, myotomes/sensation/reflexes all normal)
- *G. Severity:* pain on resisted/muscle contraction often minimal per Magee, despite pain on stretch being more prominent

**Step 3 — Supporting Variables (Table 9-18, directly):** pain especially on stretch (flexion/side flexion/rotation) and on unguarded movement; muscle spasm on observation; pain on resisted isometric contraction (though often minimal); limited ROM; all neurological findings normal; SLR negative (Table 9-5); onset from a flexion/rotation-under-load mechanism.

**Step 4 — Refuting Variables:** any positive neurological finding (myotome/sensation/reflex — → L02, per Table 9-18's own contrast column); SLR or slump positive (→ L02); pain that increases specifically with extension rather than flexion/stretch (→ reconsider L03); insidious onset with no load-based mechanism (→ L01).

**Step 5 — Derived/Calculated Variables:** stretch-pain pattern (Present/Absent — pain on flexion/side-flexion/rotation stretch); load-based acute mechanism (Present/Absent); neuro screen (expected entirely normal — a genuine differentiator from L02, not just an absence).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation (muscle spasm/guarding) → lumbar AROM (pain especially on stretch directions, limited ROM) → resisted isometric movements (pain on contraction, though Magee notes this is often minimal) → neuro screen (expected fully normal, to actively exclude L02).
- *Recommended:* palpation (localize the strained muscle); SLR (expected negative, screening test); x-ray only if red flags present (Table 9-5 lists x-ray negative for this pattern, i.e. not routinely needed).

---

### L09 — Lumbar Myofascial Pain
**Clinical Signature Specification v1.0 — LOW CONFIDENCE, NOT GROUNDED IN UPLOADED TEXT**

**Honesty flag:** none of the three uploaded books (Magee, Kendall, Kisner & Colby) have a dedicated myofascial pain/trigger point section in the material reviewed so far — a search of the extracted Lumbar Spine and Pelvis chapters found zero mentions of "myofascial" or "trigger point." The authoritative reference for this condition is normally Travell & Simons' *Myofascial Pain and Dysfunction: The Trigger Point Manual*, which has **not** been uploaded. Everything below is trained-knowledge recall only, unverified against any real source — treat this condition as the least reliable in the library until a proper reference is provided.

**Step 1 — Clinical Definition (unverified)** Regional muscular pain associated with palpable taut bands and trigger points (quadratus lumborum, multifidus, erector spinae, gluteal muscles referring to the low back) that reproduce the patient's pain pattern on palpation, often with a referred pain pattern distinct from a dermatome.

**Step 2 — Subjective Variables (unverified):** deep ache, focal tender points, referred pain pattern not following a dermatome, often associated with sustained postural load, stress, poor sleep, or deconditioning; typically no true neurological findings.

**Step 6 — Objective Assessment (unverified):** palpation for taut bands/trigger points reproducing referred pain; assessment of postural/movement contributors.

**This condition should not be relied on until re-built against a real source** — flagged in Section 4 as a priority to fix, not to weight.

---

### L10 — Inflammatory Back Pain (Axial Spondyloarthritis / Ankylosing Spondylitis Pattern)
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-6 "Indications of Serious Spinal Pathology," Inflammatory Disorders column (p.566, citing Waddell G: *The Back Pain Revolution*, 1998, p.12); Table 9-3 stiffness-pattern notes (p.557).

**Step 1 — Clinical Definition**
An inflammatory (rather than purely mechanical) pattern of low back pain, classically associated with axial spondyloarthritis/ankylosing spondylitis. Not a confirmed diagnosis — a pattern that should prompt rheumatology referral and serology if present.

**Step 2 — Subjective Variables (Table 9-6, directly cited)**
- *C. Onset:* gradual, before age 40
- *D. Pain Behaviour:* marked morning stiffness; persisting limitation of spinal movement in *all* directions (not just one plane — a real differentiator from mechanical patterns); per Table 9-3, stiffness on first rising that reflects "prolonged stiffness, active inflammatory disease" rather than simple nocturnal fluid imbibition
- *F/other systemic features:* peripheral joint involvement; iritis; skin rashes (psoriasis); colitis; urethral discharge
- *I. History:* family history of the same/related conditions
- *J. Red Flags overlap:* this pattern sits adjacent to, not inside, the urgent-red-flag list — it's a referral trigger, not an emergency

**Step 3 — Supporting Variables:** onset before age 40; morning stiffness that is marked and prolonged; movement limitation in all planes, not one direction; peripheral joint involvement; iritis/psoriasis/colitis/urethral discharge; family history; NSAID-responsive pain (general knowledge addition, not in the Table 9-6 excerpt itself — flagged as such).

**Step 4 — Refuting Variables:** movement limitation confined to one specific direction/plane (→ reconsider L01/L03); no morning stiffness pattern; onset after age 55 with no other inflammatory features (Table 9-6's general red-flag column separately notes onset >55 as its own concern, pointing more toward L11 than L10); absence of any systemic/extra-spinal feature.

**Step 5 — Derived/Calculated Variables:** inflammatory pattern screen (Negative/Possible/Likely); morning stiffness duration category; movement-limitation distribution (single-plane vs. all-planes — the key L10 vs. mechanical differentiator).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* observation → lumbar AROM **all planes** (documenting whether restriction is uniform across all directions, not just one) → peripheral joint screen.
- *Recommended:* referral for ESR/CRP, HLA-B27; ophthalmology screen if iritis suspected; skin/GI history follow-up (psoriasis/IBD); FABER and posterior SIJ provocation (inflammatory sacroiliitis commonly co-exists — cross-reference L05, noting individual SIJ test weaknesses documented there).

---

### L11 — Serious Pathology (Red Flag)
**Clinical Signature Specification v1.0**

**Primary References:** Magee – *Orthopedic Physical Assessment*, Ch.9 — Table 9-6 "Indications of Serious Spinal Pathology" in full (p.566, sourced from Waddell G: *The Back Pain Revolution*, New York, 1998, Churchill Livingstone, p.12), Patient History questions 20–21 on micturition/red flags (p.561–562).

**Step 1 — Clinical Definition**
Not a single condition but the mandatory screen for pathology requiring urgent or specialist referral rather than routine physiotherapy — cauda equina syndrome/widespread neurologic disorder, fracture, malignancy, infection, and other serious non-mechanical causes. This pattern, if positive, should override and interrupt normal hypothesis ranking for every other condition in this library.

**Step 2 — Subjective Variables, exactly as Table 9-6 lists them (not paraphrased)**

*General red flags:*
- Presentation age <20 years or onset >55 years
- Violent trauma (fall from height, car accident)
- Constant, progressive, non-mechanical pain
- Thoracic pain
- Previous history of carcinoma, systemic steroids, drug abuse, HIV
- Unexpected weight loss
- Systemically unwell
- Persisting severe restriction of lumbar flexion
- Widespread neurology
- Structural deformity
- (Investigation-based, once ordered: ESR >25; plain x-ray showing vertebral collapse or bone destruction)

*Cauda equina syndrome / widespread neurologic disorder — its own explicit sub-column:*
- Blood in urine or stools
- Difficulty with micturition
- Loss of anal sphincter tone or fecal incontinence
- Saddle anesthesia (anus, perineum, or genitals)
- Widespread (more than one nerve root) or progressive motor weakness in the legs, or gait disturbance
- A sensory level

**Step 3 — Supporting Variables:** any single item from the lists above is significant on its own — this is the one condition in the library where a single strong positive (e.g., saddle anesthesia, new bladder retention) should immediately dominate the reasoning output regardless of how many "supporting" points other conditions have accumulated.

**Step 4 — Refuting Variables:** not really applicable in the usual sense — the absence of all listed items across a *complete* screen is what allows every other condition in the library to be considered safely. An *incomplete* screen (some items never asked) should never be treated as equivalent to a negative screen (per the Unknown-vs-Absent principle in Section 0).

**Step 5 — Derived/Calculated Variables:** red flag screen (Negative/Incomplete/Positive — already implemented this way in `lumbarVariableExtractor.js`); cauda equina sub-screen specifically (same three states); urgency tier (Routine / Same-day referral / Emergency — cauda equina signs and progressive neurological deficit warrant same-day-or-sooner, per NICE NG59 in the wider CPG literature, not yet cross-checked against an uploaded NICE document).

**Step 6 — Objective Assessment Trigger Matrix**
- *Required:* full neurological screen (myotomes, dermatomes, reflexes, both legs); perianal sensation and anal tone screening question (asked, not physically tested by a physiotherapist without appropriate scope); gait assessment.
- *Action, not just "tests":* if any cauda equina indicator is positive, the correct output is same-day emergency referral, not a routine objective assessment sequence — this condition's Step 6 is fundamentally different in kind from every other condition in the library, and the reasoning engine must treat it as a hard override rather than one more differential to score.

---

## 3.5 Source Tables — Reproduced Directly from the Uploaded Magee Text

Read directly from the uploaded PDF (*Orthopedic Physical Assessment*, David J. Magee), not recalled from training knowledge. Reproduced here as short reference tables (not the surrounding prose) — small excerpts used to ground the conditions above, not a copy of the book.

**Table 9-5 — Differential Diagnosis of Mechanical Low Back Pain (p.560–561)**

| | Muscle Strain (L08) | Herniated Nucleus Pulposus (L02) | Osteoarthritis (~L03) | Spinal Stenosis (L04) | Spondylolisthesis (L07) | Scoliosis |
|---|---|---|---|---|---|---|
| Age (yr) | 20–40 | 30–50 | >50 | >60 | 20 | 30 |
| Location | Back (unilateral) | Back, leg (unilateral) | Back (unilateral) | Leg (bilateral) | Back | Back |
| Onset | Acute | Acute (prior episodes) | Insidious | Insidious | Insidious | Insidious |
| Standing | ↑ | ↓ | ↑ | ↑ | ↑ | ↑ |
| Sitting | ↓ | ↑ | ↓ | ↓ | ↓ | ↓ |
| Bending | ↑ | ↑ | ↓ | ↓ | ↑ | ↑ |
| SLR | − | + | − | + (stress) | − | − |
| Plain x-ray | − | − | + | + | + | + |

(Source: Borenstein DG, et al., cited in Magee p.561.)

**Table 9-18 — Lumbar Strain (L08) vs. Posterolateral Disc Herniation at L5-S1 (L02), p.641**

| | Lumbar Strain | L5-S1 Disc Herniation |
|---|---|---|
| Mechanism | Flexion, side flexion, and/or rotation under load or uncontrolled | Quick movement into flexion, rotation, side flexion, or extension |
| Pain location | Lumbar spine, may refer to buttocks | Lumbar spine with radicular referral to posterior leg/foot |
| Pain increases with | Extension (muscle contraction) or flexion (stretch) | Extension |
| Observation | Scoliosis may be present, muscle spasm | Scoliosis may be present, muscle guarding |
| Active movement | Pain especially on stretch (flexion/side flexion/rotation), limited ROM | Pain especially on extension and flexion, limited ROM |
| Resisted isometric | Pain on contraction (often minimal) | Minimal pain unless large protrusion |
| Myotomes | Normal | L5-S1 myotomes may be affected |
| Special tests | Neurological tests negative | SLR and slump often positive |
| Sensation | Normal | L5-S1 dermatomes may be affected |
| Reflexes | Normal | L5-S1 reflexes may be affected |

**Table 9-15 — Vascular vs. Neurogenic Claudication (p.614)** — relevant to L04 Spinal Stenosis, to be built out next

| | Vascular | Neurogenic |
|---|---|---|
| Pain | Related to exercise, occurs at various sites simultaneously | Related to exercise, spreads from area to area |
| Pulse | Absent after exercise | Present after exercise |
| Sensory change | Variable | Follows specific dermatomes |
| Reflexes | Normal | Decreased but returns quickly |

---

## 4. Status & Next Steps

**Completed (subjective signature stage, pre-weighting):** all 11 — L01 through L11. Ten of eleven (all except L09) are grounded against the actual uploaded Magee text (Ch.9 Lumbar Spine p.550–648, Ch.10 Pelvis p.649–668e2), with page-cited tables/tests, not training-knowledge recall.
**L09 (Myofascial Pain) is the one exception** — explicitly flagged low-confidence in its own section above. None of the three uploaded books cover myofascial pain/trigger points in the material reviewed; it needs a real source (e.g. Travell & Simons) before being trusted at the same level as the other ten.
**Explicitly deferred until every condition above has variables defined:** weight assignment, probability scoring formula, normalization, condition-vs-condition comparison logic.
**Other uploaded references not yet incorporated:** Kendall's *Muscles: Testing and Function* (relevant to Step 6 objective MMT specifics per myotome) and Kisner & Colby's *Therapeutic Exercise* (relevant later, to the treatment/rehab stage past Step 6) — not yet read in this pass; APTA, IFOMPT, NICE, and JOSPT guidelines named but not uploaded as files, so not yet directly checked against either.

Each new condition should be validated (by you / a clinician) before moving to the next, per the build order in Section 0.
