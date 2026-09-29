// ortho-cases.fixtures.ts — 10 SYNTHETIC orthopedic test patients.
//
// These are NOT real patients. Names are fabricated ("E2E ORTHO DELETE ME")
// and the complaints are textbook-realistic, so the automated suite exercises
// the same code paths a real assessment would, with zero PHI exposure.
//
// Consumed by ortho-cases.spec.ts. Each case says who the patient is (age,
// sex), which body region and side to assess, and what they tell the
// physio (the chief complaint). `expectImpression` is the wording a sensible
// differential would use for that case; the spec only REPORTS whether it
// showed up (see ortho-cases.spec.ts), it does not fail on it.
//
// The first version of these cases (until 2026-09) also carried ROM angles,
// MMT grades, special-test results and observation notes for the old
// Screening Workflow. Those screens are gone; the values are still in git
// history (`git log -- e2e/ortho-cases.fixtures.ts`) if you want to enter
// them into today's ROM / MMT / Special Tests steps.

import type { Region, Side } from "./appMap";

export interface OrthoCase {
  id: string;
  diagnosis: string;
  age: number;
  gender: "Male" | "Female";
  region: Region;
  side: Side;
  chiefComplaint: string;
  expectImpression: RegExp;
}

export const ORTHO_CASES: OrthoCase[] = [
  {
    id: "adhesive-capsulitis", diagnosis: "Adhesive Capsulitis", age: 52, gender: "Male", region: "Shoulder", side: "Right",
    chiefComplaint: "E2ECASE1 right shoulder pain 5 months gradual onset night pain",
    expectImpression: /capsulitis|frozen|capsular|shoulder/i,
  },
  {
    id: "acl-tear", diagnosis: "ACL Tear", age: 24, gender: "Male", region: "Knee", side: "Right",
    chiefComplaint: "E2ECASE2 football injury pop sound immediate swelling instability pain 8/10",
    expectImpression: /acl|cruciate|instability|knee/i,
  },
  {
    id: "knee-oa", diagnosis: "Knee Osteoarthritis", age: 61, gender: "Female", region: "Knee", side: "Right",
    chiefComplaint: "E2ECASE3 knee pain 3 years stairs painful morning stiffness 15 min crepitus",
    expectImpression: /osteoarthritis|oa|degenerat|knee/i,
  },
  {
    id: "cervical-radiculopathy", diagnosis: "Cervical Radiculopathy", age: 38, gender: "Female", region: "Cervical", side: "Right",
    chiefComplaint: "E2ECASE4 neck pain radiates to thumb tingling computer worker",
    expectImpression: /radiculopath|cervical|nerve root|c6/i,
  },
  {
    id: "lumbar-disc-herniation", diagnosis: "Lumbar Disc Herniation", age: 29, gender: "Male", region: "Lumbar", side: "Left",
    chiefComplaint: "E2ECASE5 low back pain after lifting pain into calf cough increases pain",
    expectImpression: /disc|herniat|radiculopath|lumbar|sciatic|l5|s1/i,
  },
  {
    id: "lateral-epicondylitis", diagnosis: "Lateral Epicondylitis", age: 45, gender: "Female", region: "Elbow", side: "Right",
    chiefComplaint: "E2ECASE6 pain while gripping opening jars difficult computer work",
    expectImpression: /epicondyl|tennis elbow|lateral|elbow/i,
  },
  {
    id: "plantar-fasciitis", diagnosis: "Plantar Fasciitis", age: 34, gender: "Male", region: "Foot / Toes", side: "Right",
    chiefComplaint: "E2ECASE7 morning heel pain first steps painful standing worse",
    expectImpression: /plantar|fascii|heel|foot/i,
  },
  {
    id: "patellofemoral-pain", diagnosis: "Patellofemoral Pain Syndrome", age: 27, gender: "Female", region: "Knee", side: "Right",
    chiefComplaint: "E2ECASE8 pain during stairs pain after sitting runner",
    expectImpression: /patellofemoral|pfps|patella|knee/i,
  },
  {
    id: "rotator-cuff-tendinopathy", diagnosis: "Rotator Cuff Tendinopathy", age: 42, gender: "Male", region: "Shoulder", side: "Right",
    chiefComplaint: "E2ECASE9 pain after overhead painting night pain pain lifting objects",
    expectImpression: /rotator cuff|tendinopath|supraspinatus|impingement|shoulder/i,
  },
  {
    id: "gtps", diagnosis: "Greater Trochanteric Pain Syndrome", age: 58, gender: "Female", region: "Hip", side: "Right",
    chiefComplaint: "E2ECASE10 lateral hip pain sleeping difficult pain climbing stairs",
    expectImpression: /trochanteric|gtps|gluteal|hip|abductor/i,
  },
];
