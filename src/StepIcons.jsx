/* Shared outline icon set for assessment step navigation, section
   headers, "add assessment" library modals and summary cards --
   replaces the emoji previously used in STEP_META/CT_LIBRARY/
   NEURO_LIBRARY/SETTINGS/SYSTEMS across Ortho, Cardio and Neuro so the
   same concept always renders the same glyph instead of relying on
   whatever an OS emoji font happens to draw. All strokes use
   currentColor so callers control color the same way they used to
   control emoji color (via the surrounding element's CSS `color`). */

const PATHS = {
  clipboard: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM6 6h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM9 11h6M9 14h6M9 17h3.5",
  notes: "M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M9 12h6M9 15h6M9 18h4",
  flag: "M6 21V4M6 4h11l-2.5 3.5L17 11H6",
  heart: "M12 20s-7.2-4.4-9.6-9A5 5 0 0 1 12 6a5 5 0 0 1 9.6 5c-2.4 4.6-9.6 9-9.6 9z",
  pain: "M12 3v4M12 3l-2.5 3M12 3l2.5 3M6 8l2.5 2M6 8l3-1M18 8l-2.5 2M18 8l-3-1M12 11l-2 5h4l-2 6",
  eye: "M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  hand: "M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11.5V5a1.5 1.5 0 0 1 3 0v9M8 12l-1.6 1.2a2 2 0 0 0-.6 2.5l1.9 3.5A4 4 0 0 0 11.2 21H14a5 5 0 0 0 5-5v-2",
  brain: "M9 4.5a3 3 0 0 0-3 3v.4A3 3 0 0 0 4.5 11a3 3 0 0 0 1.2 5.7A3 3 0 0 0 9 20a3 3 0 0 0 3-3V7.5a3 3 0 0 0-3-3zM15 4.5a3 3 0 0 1 3 3v.4A3 3 0 0 1 19.5 11a3 3 0 0 1-1.2 5.7A3 3 0 0 1 15 20a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3z",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-2 5-5 2 2-5z",
  droplet: "M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11z",
  ruler: "M4 16l8-8 8 8-2 2-1.5-1.5L15 18l-2-2 1.5-1.5L13 13l-1.5 1.5L10 13l1.5-1.5L10 10 6 14z",
  muscle: "M4 14c0-3 1-6 4-7 1.5-.5 2.5 0 3 1 .5-1.5 2-2.5 4-2 3 0 6 3 6 8 0 3-2 6-6 6h-3c-3 0-5-2-5-4v-1c-1.5 0-3-.5-3-1z",
  microscope: "M9 21h8M11 21v-3.5M7 17.5h8M9 3v5.5a3 3 0 0 0 3 3 3 3 0 0 0 3-3M9 6h3M17 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  chain: "M9 15l6-6M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2",
  bone: "M6 14c-1.5 0-2.5 1-2.5 2.5S4.5 19 6 19c1 0 1.8-.6 2.2-1.4L15.4 11c.4-.4 1-.4 1.4 0l1 1M18 10c1.5 0 2.5-1 2.5-2.5S19.5 5 18 5c-1 0-1.8.6-2.2 1.4L8.6 13c-.4.4-1 .4-1.4 0l-1-1",
  run: "M14.5 5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM9 9l3-1.6 2 2.3 3.5 1.3M8 22l2.5-5.5-2-2 1-4.5M13 9l-1.5 4L15 15l2 5.5M6 15l3-2",
  thread: "M4 6c3 0 3 3 6 3s3-3 6-3 3 3 6 3M4 12c3 0 3 3 6 3s3-3 6-3 3 3 6 3M4 18c3 0 3 3 6 3s3-3 6-3 3 3 6 3",
  walk: "M14 4.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM11 8l3-1 2 3 3 1.5M9 22l2-6-1.5-2 1-4M15 9l-1 4 2.5 2 1.5 5M8 15l-3 2",
  scale: "M12 3v18M6 21h12M12 6 6 15h12L12 6zM8 12h8",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  puzzle: "M9 4h4a1.5 1.5 0 0 1 0 3 1.5 1.5 0 0 0 0 3h4a1 1 0 0 1 1 1v4a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 0-3 0v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 1 0-3h4V4z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  dumbbell: "M4 9v6M2 10v4M20 9v6M22 10v4M8 12h8M6 8v8M18 8v8",
  calendar: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 10h16M8 2v4M16 2v4M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01",
  trend: "M4 17l5-6 4 3 7-9M14 5h6v6",
  handshake: "M3 12l4-4 3 2 2-2 3 2 3-3 3 3M7 10l4 5 2-1 3 3M12 14l-1.5 1.5",
  home: "M4 11l8-7 8 7M6 10v10h5v-6h2v6h5V10",
  check: "M4 12.5l5 5L20 6",
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z",
  bandage: "M6 12a4.2 4.2 0 0 1 6-6l6 6a4.2 4.2 0 0 1-6 6l-6-6zM9.5 8.5l1 1M13 12l1 1",
  stethoscope: "M6 3v5a3 3 0 0 0 6 0V3M8 3H6M14 3h-2M12 8v3a5 5 0 0 0 10 0v-1M20 11a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z",
  leg: "M10 3h4v6l2 9a2.2 2.2 0 0 1-4.3.6L10.5 13l-1.6 5.4A2.2 2.2 0 0 1 4.6 17L7 12V6a3 3 0 0 1 3-3z",
  prosthetic: "M10 3h4v7l1 2h3v2h-3l1 3h2v2h-2.3a2 2 0 0 1-1.9-1.4L11 9H9v6l1.5 5.6a2 2 0 0 1-3.9 1L5 14V6a3 3 0 0 1 3-3z",
  bed: "M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 19v2M21 19v2M3 15h18M6 10V6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4",
  lungs: "M12 3v9M12 12c-1-3-3-4-5-3-2.5 1-3 4-2 8 .5 2 2 3 3.5 2S11 17 11 15v-3M12 12c1-3 3-4 5-3 2.5 1 3 4 2 8-.5 2-2 3-3.5 2S13 17 13 15v-3",
  warning: "M12 3 2 20h20L12 3zM12 10v4M12 17h.01",
  siren: "M12 3a5 5 0 0 1 5 5v5H7V8a5 5 0 0 1 5-5zM4 20a8 8 0 0 1 16 0H4zM12 3V1",
  speech: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  hospital: "M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16M9 21v-4h6v4M12 6v6M9 9h6M4 21h16",
  wheelchair: "M10 3v7h6M10 10l4 8h4M10 10 6 20M13 20a6 6 0 1 1 3.5-10.9",
  spiral: "M12 20a8 8 0 1 1 0-16 6 6 0 1 1 0 12 4 4 0 1 1 0-8 2 2 0 1 1 0 4",
  flame: "M12 2c2 3-2 4-1 7 1-1 2-1 2 0 1-1 3-1 3 2a6 6 0 1 1-12 0c0-3 2-4 3-6 0 1 .5 2 1 2 0-2-1-3 1-5z",
  burst: "M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z",
  dna: "M6 3c0 5 12 5 12 10s-12 5-12 10M18 3c0 5-12 5-12 10s12 5 12 10M7.5 8h9M7.5 16h9",
  star: "M12 2l3 6.5 7 1-5 5 1.5 7L12 18l-6.5 3.5L7 14.5l-5-5 7-1z",
  gait: "M14 4.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM11 8l3-1 2 3 3 1.5M9 22l2-6-1.5-2 1-4M15 9l-1 4 2.5 2 1.5 5M8 15l-3 2",
};

// Aliases so callers can use the most descriptive name for their
// context without duplicating a path definition.
const ALIAS = {
  balance: "scale",
  rom: "ruler",
  angle: "ruler",
  mmt: "muscle",
  motor: "muscle",
  edema: "droplet",
  cognition: "brain",
  neurovascular: "brain",
  interpretation: "brain",
  impression: "brain",
  cpa: "brain",
  sensory: "hand",
  palpation: "hand",
  observation: "eye",
  cranial: "eye",
  vitals: "heart",
  cardio: "heart",
  cardiovascular: "heart",
  respiratory: "lungs",
  resp: "lungs",
  precautions: "warning",
  safety: "siren",
  icu: "siren",
  subjective: "speech",
  communication: "speech",
  chart: "folder",
  review: "check",
  summary: "check",
  goals: "target",
  coordination: "target",
  treatment: "dumbbell",
  exercise: "dumbbell",
  sessions: "calendar",
  progress: "trend",
  outcomes: "chart",
  outcome: "chart",
  techniques: "handshake",
  problems: "puzzle",
  region: "puzzle",
  fascia: "thread",
  functional: "run",
  activity: "run",
  rehab: "run",
  jointMobility: "bone",
  sttt: "bone",
  spinalCordInjury: "bone",
  kineticChain: "chain",
  specialTests: "microscope",
  neuroScreen: "bolt",
  tone: "bolt",
  suggest: "brain",
  objectiveAI: "compass",
  ataxia: "compass",
  woundSite: "bandage",
  surgicalSite: "bandage",
  surgicalReview: "stethoscope",
  otherCardiothoracic: "stethoscope",
  residualLimb: "leg",
  prosthesis: "prosthetic",
  functionalMobility: "bed",
  postop: "bed",
  neuroRespiratory: "lungs",
  peripheralNerve: "dna",
  inpatient: "hospital",
  parkinsons: "spiral",
  vestibular: "spiral",
  multipleSclerosis: "flame",
  tbi: "burst",
  myTemplates: "star",
  template: "clipboard",
  demographics: "clipboard",
  caseInfo: "clipboard",
  carePlanPlan: "clipboard",
  homeProtocol: "home",
  redFlags: "flag",
  pain: "pain",
};

export function Icon({ name, size = 18, title, style, className }) {
  const key = ALIAS[name] || name;
  const d = PATHS[key];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", ...style }}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}

// Two-glyph combo (used where a single picker slot previously showed a
// pair of emoji, e.g. "🫀🫁" for a combined cardiopulmonary system).
export function IconPair({ names, size = 18, style }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center", ...style }}>
      <Icon name={names[0]} size={size} />
      <Icon name={names[1]} size={size} />
    </span>
  );
}
