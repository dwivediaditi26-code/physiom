import React, { useState, useEffect, lazy, Suspense } from "react";
import { SectionIntro, TextField, SelectField, Segmented, NumberField, TextArea, ScaleField, AssistField, Hint, LRGrid, VitalRow, useSectionData, DateField, InfoButton, InfoCard } from "./orthoFieldKit.jsx";
import { neuroExamLibraryData } from "./neuroExamLibraryData.js";

// Typical resting adult values -- Vitals now opens already filled with
// these instead of blank, since most patients most of the time are within
// normal range; the clinician expands (+) whichever one isn't and changes
// it, rather than typing all seven from scratch every time (2026-09-03,
// Aditi: "already built normal vital signs, and we can change it by
// minimize and maximize button"). Only seeds when the section is still
// completely untouched, so it never overwrites a real entry.
const NORMAL_VITALS = { bpSys: "120", bpDia: "80", hr: "72", rr: "16", spo2: "98", temp: "37.0", pain: "0" };

// Same interactive pain/symptom body chart used by the old Subjective flow
// (SubjectiveObjective.jsx) -- lazy-loaded since it's a large, self-contained
// SVG diagram component, only needed once a therapist actually opens Pain.
const LazyBodyChartPro = lazy(() => import("./BodyChartPro.jsx"));

/* ============================================================
   Sections that are identical (or near-identical) across every
   Ortho assessment module — IPD, Post-operative Rehab, ... —
   because they describe the patient/case and generic function,
   not anything specific to a clinical pathway.
   ============================================================ */

export function CaseInfoSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "caseInfo");
  return (
    <>
      <SectionIntro icon="📋" title="Patient / Case Information" />
      <TextField label="Patient name" value={d.name} onChange={(v) => set("name", v)} placeholder="Full name" />
      <div className="row-2">
        <NumberField label="Age" value={d.age} onChange={(v) => set("age", v)} unit="yrs" />
        <div style={{ flex: 1 }}>
          <Segmented label="Sex" options={["Male", "Female", "Other"]} value={d.sex} onChange={(v) => set("sex", v)} />
        </div>
      </div>
      <div className="row-2">
        <TextField label="Case / UHID" value={d.caseId} onChange={(v) => set("caseId", v)} placeholder="ID number" />
        <TextField label="Ward / Bed" value={d.ward} onChange={(v) => set("ward", v)} placeholder="e.g. Ortho-3 / Bed 12" />
      </div>
      <TextField label="Phone" value={d.phone} onChange={(v) => set("phone", v)} placeholder="Contact number" />
      <TextField label="Address" value={d.address} onChange={(v) => set("address", v)} placeholder="City / locality" />
      <TextField label="Occupation" value={d.occupation} onChange={(v) => set("occupation", v)} />
      <TextField label="Admitting diagnosis" value={d.diagnosis} onChange={(v) => set("diagnosis", v)} placeholder="Working / referral diagnosis" />
      <DateField label="Date of admission" value={d.admitDate} onChange={(v) => set("admitDate", v)} />
      <TextField label="Referring physician" value={d.referrer} onChange={(v) => set("referrer", v)} />
    </>
  );
}

export function VitalsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "vitals");
  useEffect(() => {
    setData((prev) => (prev.vitals && Object.keys(prev.vitals).length > 0 ? prev : { ...prev, vitals: { ...NORMAL_VITALS } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <SectionIntro icon="❤️" title="Vital Signs" sub="Opens at typical resting values — tap + to change whichever isn't normal for this patient." />
      <div className="vitals-grid">
        <VitalRow label="BP systolic" value={d.bpSys} onChange={(v) => set("bpSys", v)} unit="mmHg" max={250} />
        <VitalRow label="BP diastolic" value={d.bpDia} onChange={(v) => set("bpDia", v)} unit="mmHg" max={150} />
        <VitalRow label="Heart rate" value={d.hr} onChange={(v) => set("hr", v)} unit="bpm" max={220} />
        <VitalRow label="Respiratory rate" value={d.rr} onChange={(v) => set("rr", v)} unit="/min" max={60} />
        <VitalRow label="SpO₂" value={d.spo2} onChange={(v) => set("spo2", v)} unit="%" max={100} />
        <VitalRow label="Temperature" value={d.temp} onChange={(v) => set("temp", v)} unit="°C" max={42} step={0.1} />
        <VitalRow label="Pain (NRS)" value={d.pain} onChange={(v) => set("pain", v)} slider max={10} />
      </div>
    </>
  );
}

export function PainSection({ data, setData, selectedRegions, regionLabelOf }) {
  const [d, set] = useSectionData(data, setData, "pain");
  const locationOptions = selectedRegions.length ? selectedRegions.map((r) => regionLabelOf(r)) : ["Not specified"];
  return (
    <>
      <SectionIntro icon="😖" title="Pain" info="Ask current, best and worst over the last 24 hours. Character helps distinguish nociceptive, neuropathic, and inflammatory pain." />
      <div className="subheading">Body Chart</div>
      <Suspense fallback={<Hint>Loading body chart…</Hint>}>
        <LazyBodyChartPro data={d} set={set} />
      </Suspense>
      <div className="subheading">Pain Details</div>
      <div className="row-2">
        <ScaleField label="Current" value={d.current} onChange={(v) => set("current", v)} />
      </div>
      <div className="vitals-grid">
        <NumberField label="Best (24h)" value={d.best} onChange={(v) => set("best", v)} unit="/10" width="45%" />
        <NumberField label="Worst (24h)" value={d.worst} onChange={(v) => set("worst", v)} unit="/10" width="45%" />
      </div>
      <SelectField label="Character" type="multi" options={["Dull", "Sharp", "Burning", "Throbbing", "Aching", "Shooting", "Stabbing"]} value={d.character} onChange={(v) => set("character", v)} />
      <SelectField label="Location" type="multi" options={locationOptions} value={d.location} onChange={(v) => set("location", v)} />
      <SelectField label="Pattern" type="single" options={["Constant", "Intermittent", "Activity-related", "Night pain"]} value={d.pattern} onChange={(v) => set("pattern", v)} />
    </>
  );
}

export function ObservationSection({ data, setData, showResponseToActivity }) {
  const [d, set] = useSectionData(data, setData, "observation");
  return (
    <>
      <SectionIntro icon="👁️" title="General Observation" />
      <SelectField label="General appearance" type="multi" options={["No acute distress", "In distress", "Guarding", "Reluctant to move", "Alert & oriented", "Drowsy", "Confused"]} value={d.general} onChange={(v) => set("general", v)} />
      <SelectField label="Posture / alignment" type="multi" options={["Normal", "Antalgic posture", "Deformity", "Muscle wasting", "Asymmetry"]} value={d.posture} onChange={(v) => set("posture", v)} />
      <SelectField label="Skin" type="multi" options={["Normal", "Bruising", "Redness", "Pallor", "Pressure area", "Broken skin"]} value={d.skin} onChange={(v) => set("skin", v)} />
      {showResponseToActivity && (
        <Segmented label="Response to activity" options={["Tolerated well", "Increased pain/swelling", "Excessive fatigue", "Other"]} value={d.activityResponse} onChange={(v) => set("activityResponse", v)} />
      )}
    </>
  );
}

export function FunctionalMobilitySection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "functionalMobility");
  return (
    <>
      <SectionIntro icon="🛏️" title="Functional Mobility" />
      <div className="subheading">Bed mobility</div>
      <AssistField label="Rolling" value={d.rolling} onChange={(v) => set("rolling", v)} />
      <AssistField label="Supine → Sitting" value={d.supineToSit} onChange={(v) => set("supineToSit", v)} />
      <div className="subheading">Transfers</div>
      <AssistField label="Sit → Stand" value={d.sitToStand} onChange={(v) => set("sitToStand", v)} />
      <AssistField label="Bed → Chair" value={d.bedToChair} onChange={(v) => set("bedToChair", v)} />
    </>
  );
}

export function GaitSection({ data, setData, showStairs }) {
  const [d, set] = useSectionData(data, setData, "gait");
  return (
    <>
      <SectionIntro icon="🚶" title="Gait / Ambulation" info="Observe stance vs swing phase, step length, cadence, and symmetry, plus use of any assistive device. Note the specific abnormal pattern rather than just 'abnormal gait'." />
      <SelectField label="Pattern" type="single" options={["Normal", "Antalgic", "Ataxic", "Hemiplegic", "Steppage", "Trendelenburg", "Parkinsonian", "Other"]} value={d.pattern} onChange={(v) => set("pattern", v)} />
      <SelectField label="Assistive device" type="single" options={["None", "Cane", "Crutches", "Walker/Frame", "Wheelchair", "Other"]} value={d.device} onChange={(v) => set("device", v)} />
      <Segmented label="Assistance level" options={["Independent", "Supervision", "Min Assist", "Mod Assist", "Max Assist"]} value={d.assistance} onChange={(v) => set("assistance", v)} wrap />
      <NumberField label="Distance walked" value={d.distance} onChange={(v) => set("distance", v)} unit="m" />
      {showStairs && <Segmented label="Stairs" options={["Independent", "Supervision", "Handrail only", "Physical assist", "Unable", "Not assessed"]} value={d.stairs} onChange={(v) => set("stairs", v)} wrap />}
      <TextArea label="Additional gait observations" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

export function BalanceSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "balance");
  return (
    <>
      <SectionIntro icon="⚖️" title="Balance" />
      <Segmented label="Sitting balance" options={["Normal", "Impaired"]} value={d.sitting} onChange={(v) => set("sitting", v)} />
      <Segmented label="Standing balance" options={["Normal", "Impaired"]} value={d.standing} onChange={(v) => set("standing", v)} />
      <Segmented label="Assistance" options={["Independent", "Supervision", "Assist"]} value={d.assistance} onChange={(v) => set("assistance", v)} />
      <TextArea label="Additional balance test" value={d.extraTest} onChange={(v) => set("extraTest", v)} placeholder="e.g. Berg Balance Score, Tinetti..." />
    </>
  );
}

// Quick radiculopathy/neuro screen -- same myotome/dermatome/DTR grading
// used by the standalone Neuro assessment's Spinal Cord Injury workup
// (NeurologicalAssessment.jsx), trimmed to the key upper + lower limb levels
// an ortho exam actually screens (cervical and lumbar nerve roots), so a
// spine-condition MSK case doesn't need to leave Ortho to rule out nerve
// involvement.
// Reuses the exact same rich "Perform / Reference / Interpret" content and
// real Cloudinary reference photos NeurologicalAssessment.jsx's own myotome/
// dermatome/reflex grids already show via neuroExamLibraryData.js -- not
// separately-authored text (2026-09-17, Aditi, after a first pass added a
// plain-text ⓘ: "in neuro clinical assessment this have in sensory and
// reflex examination take reference of image and info card from there and
// put it images like rom" -- same imageTrigger info-card pattern ROM/MMT
// movements already use, sourced from the one real library instead of a
// second copy of the same clinical facts).
// neuroExamLibraryData.js's own images are already-built absolute URLs
// (CLOUDINARY_BASE + raw id); InfoButton's richItem.image instead wants
// just the raw id, since it builds its own thumbnail/full-size URLs --
// strip that known prefix back off.
const NEURO_LIB_IMG_PREFIX = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/";
function rawImgId(url) {
  return url ? url.replace(NEURO_LIB_IMG_PREFIX, "") : null;
}
// Converts one neuroExamLibraryData entry (its own {perform:{images,boxes},
// scale, interpret} shape, built for NeurologicalAssessment.jsx's sheet) into
// Ortho's InfoButton richItem shape ({image, perform, reference, interpret}
// as JSX, same shape romRichItem/mmtRichItem build in orthoRegionAssessments.jsx).
function neuroLibToRichItem(entry) {
  if (!entry) return null;
  return {
    image: rawImgId(entry.perform?.images?.[0]),
    title: entry.title,
    subtitle: entry.perform?.caption,
    perform: (
      <>
        {(entry.perform?.boxes || []).map((b, i) => (
          <InfoCard key={i} label={b.label} tint={b.tone === "purple" ? "violet" : b.tone || "gray"}>{b.text}</InfoCard>
        ))}
      </>
    ),
    reference: entry.scale && (
      <InfoCard label={entry.scaleLabel || "Grading"} tint="blue">
        {entry.scale.rows?.map((r) => <div key={r.k}><b>{r.k}:</b> {r.v}</div>)}
      </InfoCard>
    ),
    interpret: (entry.interpret?.normal || entry.interpret?.abnormal || entry.interpret?.note) && (
      <>
        {entry.interpret.normal && <InfoCard icon="✅" label="Normal" tint="green">{entry.interpret.normal.join("; ")}</InfoCard>}
        {entry.interpret.abnormal && <InfoCard icon="⚠️" label="Abnormal" tint="amber">{entry.interpret.abnormal.join("; ")}</InfoCard>}
        {entry.interpret.note && <InfoCard icon="📝" label="Note" tint="gray">{entry.interpret.note}</InfoCard>}
      </>
    ),
  };
}
// Keyed by nerve root, not exact row text -- this screen's own movement
// picked per level (e.g. C5 = shoulder abduction) doesn't always match
// NeurologicalAssessment.jsx's ASIA-exam convention (e.g. its C5 = elbow
// flexors) for the same root, but the reference photo/technique for that
// root is still the right clinical reference either way.
const MYOTOME_ROW_INFO = {
  "C5 Shoulder abduction": neuroLibToRichItem(neuroExamLibraryData["myoC5 Elbow flexors"]),
  "C6 Elbow flexion / wrist ext.": neuroLibToRichItem(neuroExamLibraryData["myoC6 Wrist extensors"]),
  "C7 Elbow extension": neuroLibToRichItem(neuroExamLibraryData["myoC7 Elbow extensors"]),
  "C8 Finger flexion": neuroLibToRichItem(neuroExamLibraryData["myoC8 Finger flexors"]),
  "T1 Finger abduction": neuroLibToRichItem(neuroExamLibraryData["myoT1 Finger abductors"]),
  "L2 Hip flexion": neuroLibToRichItem(neuroExamLibraryData["myoL2 Hip flexors"]),
  "L3 Knee extension": neuroLibToRichItem(neuroExamLibraryData["myoL3 Knee extensors"]),
  "L4 Ankle dorsiflexion": neuroLibToRichItem(neuroExamLibraryData["myoL4 Ankle dorsiflexors"]),
  "L5 Great toe extension": neuroLibToRichItem(neuroExamLibraryData["myoL5 Great toe extensors"]),
  "S1 Ankle plantarflexion": neuroLibToRichItem(neuroExamLibraryData["myoS1 Ankle plantarflexors"]),
};
const DERMATOME_ROW_INFO = {
  C5: neuroLibToRichItem(neuroExamLibraryData.dermC5),
  C6: neuroLibToRichItem(neuroExamLibraryData.dermC6),
  C7: neuroLibToRichItem(neuroExamLibraryData.dermC7),
  C8: neuroLibToRichItem(neuroExamLibraryData.dermC8),
  T1: neuroLibToRichItem(neuroExamLibraryData.dermT1),
  L3: neuroLibToRichItem(neuroExamLibraryData.dermL3),
  L4: neuroLibToRichItem(neuroExamLibraryData.dermL4),
  L5: neuroLibToRichItem(neuroExamLibraryData.dermL5),
  S1: neuroLibToRichItem(neuroExamLibraryData.dermS1),
};
const DTR_ROW_INFO = {
  "Biceps (C5-6)": neuroLibToRichItem(neuroExamLibraryData.reflexBiceps),
  "Brachioradialis (C5-6)": neuroLibToRichItem(neuroExamLibraryData.reflexBrachioradialis),
  "Triceps (C7-8)": neuroLibToRichItem(neuroExamLibraryData.reflexTriceps),
  "Patellar (L3-4)": neuroLibToRichItem(neuroExamLibraryData.reflexPatellar),
  "Achilles (S1-2)": neuroLibToRichItem(neuroExamLibraryData.reflexAchilles),
};
export function NeuroScreenSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "neuroScreen");
  return (
    <>
      <SectionIntro icon="⚡" title="Neuro Screen" info="Quick myotome/dermatome/reflex screen for suspected nerve root involvement -- not a full neurological exam. Refer to Neuro assessment for a complete workup." />
      <div className="subheading">Myotomes (MMT 0-5)</div>
      <LRGrid
        label="Key myotomes"
        rows={["C5 Shoulder abduction", "C6 Elbow flexion / wrist ext.", "C7 Elbow extension", "C8 Finger flexion", "T1 Finger abduction", "L2 Hip flexion", "L3 Knee extension", "L4 Ankle dorsiflexion", "L5 Great toe extension", "S1 Ankle plantarflexion"]}
        options={["5", "4", "3", "2", "1", "0"]}
        value={d.myotomes || {}}
        onChange={(v) => set("myotomes", v)}
        rowInfo={MYOTOME_ROW_INFO}
      />
      <div className="subheading">Dermatomes (sensation)</div>
      <LRGrid
        label="Key dermatomes"
        rows={["C5", "C6", "C7", "C8", "T1", "L2", "L3", "L4", "L5", "S1"]}
        options={["Normal", "Reduced", "Absent", "Hyperaesthesia"]}
        value={d.dermatomes || {}}
        onChange={(v) => set("dermatomes", v)}
        rowInfo={DERMATOME_ROW_INFO}
      />
      <div className="subheading">Deep tendon reflexes</div>
      <LRGrid
        label="DTRs"
        rows={["Biceps (C5-6)", "Brachioradialis (C5-6)", "Triceps (C7-8)", "Patellar (L3-4)", "Achilles (S1-2)"]}
        options={["0 - Absent", "1+ - Diminished", "2+ - Normal", "3+ - Brisk", "4+ - Clonus"]}
        value={d.dtr || {}}
        onChange={(v) => set("dtr", v)}
        rowInfo={DTR_ROW_INFO}
      />
      <div className="subheading">Pathological reflexes</div>
      <SelectField label="Plantar response (Babinski)" type="single" options={["Flexor (normal/downgoing)", "Extensor (Babinski positive/upgoing)", "Equivocal", "Not tested"]} value={d.babinski} onChange={(v) => set("babinski", v)} />
      <SelectField label="Clonus" type="multi" options={["Absent", "Ankle clonus present", "Patellar clonus present", "Sustained clonus"]} value={d.clonus} onChange={(v) => set("clonus", v)} />
      <TextArea label="Additional neuro notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

export function ActivityToleranceSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "activityTolerance");
  return (
    <>
      <SectionIntro icon="🏃" title="Activity Tolerance" />
      <SelectField label="Activity" type="single" options={["Walking", "Bed exercises", "Stairs", "Transfers", "Therapeutic exercise", "Other"]} value={d.activity} onChange={(v) => set("activity", v)} />
      <div className="vitals-grid">
        <NumberField label="Duration" value={d.duration} onChange={(v) => set("duration", v)} unit="min" width="45%" />
        <NumberField label="Distance" value={d.distance} onChange={(v) => set("distance", v)} unit="m" width="45%" />
        <NumberField label="Pre HR" value={d.preHR} onChange={(v) => set("preHR", v)} unit="bpm" width="45%" />
        <NumberField label="Post HR" value={d.postHR} onChange={(v) => set("postHR", v)} unit="bpm" width="45%" />
        <NumberField label="Pre SpO₂" value={d.preSpO2} onChange={(v) => set("preSpO2", v)} unit="%" width="45%" />
        <NumberField label="Post SpO₂" value={d.postSpO2} onChange={(v) => set("postSpO2", v)} unit="%" width="45%" />
      </div>
      <SelectField label="Symptoms" type="multi" options={["None", "Fatigue", "Dyspnea", "Dizziness", "Pain"]} value={d.symptoms} onChange={(v) => set("symptoms", v)} />
      <NumberField label="Recovery time" value={d.recovery} onChange={(v) => set("recovery", v)} unit="min" />
    </>
  );
}

const OUTCOME_SCALES = ["Barthel Index", "Modified Rankin Scale", "Lower Extremity Functional Scale", "DASH", "Oxford Knee Score", "Oxford Hip Score", "Knee Society Score", "Harris Hip Score", "WOMAC", "Berg Balance Scale", "Functional Independence Measure (FIM)"];
export function OutcomeMeasureSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "outcomeMeasure");
  const [q, setQ] = useState("");
  const added = d.scales || [];
  const query = q.trim().toLowerCase();
  const suggestions = query ? OUTCOME_SCALES.filter((s) => s.toLowerCase().includes(query) && !added.includes(s)) : [];
  function addScale(name) {
    set("scales", [...added, name]);
    set(name, "");
    setQ("");
  }
  function removeScale(name) {
    set("scales", added.filter((s) => s !== name));
  }
  return (
    <>
      <SectionIntro icon="📊" title="Outcome Measure" info="Choose the scale relevant to the region and condition — no scale is auto-applied, so scoring stays deliberate." />
      <div className="text-input-wrap" style={{ marginBottom: 10 }}>
        <input className="text-input" placeholder="🔍 Search scale..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {suggestions.length > 0 && (
        <div className="outcome-suggestions">
          {suggestions.map((s) => (
            <button type="button" key={s} className="outcome-suggestion" onClick={() => addScale(s)}>
              ＋ {s}
            </button>
          ))}
        </div>
      )}
      {added.map((s) => (
        <div className="rom-card" key={s}>
          <div className="rom-card-title">
            {s}
            <button type="button" className="outcome-remove" onClick={() => removeScale(s)}>
              Remove
            </button>
          </div>
          <TextField label="Score" value={d[s]} onChange={(v) => set(s, v)} placeholder="Enter score" />
        </div>
      ))}
      {!added.length && <Hint>Search above or tap a suggestion to add an outcome measure.</Hint>}
    </>
  );
}

export function ImpressionSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "impression");
  return (
    <>
      <SectionIntro icon="🧠" title="Clinical Impression & Plan" />
      <TextArea label="Problem list" value={d.problems} onChange={(v) => set("problems", v)} placeholder="Key problems in priority order..." />
      <TextArea label="Short-term goals" value={d.shortGoals} onChange={(v) => set("shortGoals", v)} />
      <TextArea label="Long-term goals" value={d.longGoals} onChange={(v) => set("longGoals", v)} />
      <TextArea label="Treatment plan / precautions for treatment" value={d.plan} onChange={(v) => set("plan", v)} />
    </>
  );
}
