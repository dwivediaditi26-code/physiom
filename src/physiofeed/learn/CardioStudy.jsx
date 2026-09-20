import { useState, useMemo, Fragment } from "react";
import {
  HeartPulse, Activity, Heart, Gauge, GaugeCircle, Timer, Droplet, Droplets,
  Stethoscope, Eye, Thermometer, Move, Zap, Wind, Footprints, Hand, Vibrate,
  AlertTriangle,
} from "lucide-react";
import { cardiovascularData } from "../../cardiovascularData.js";
import { respiratoryData } from "../../respiratoryData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import { ImageGallery } from "./StudyDetail.jsx";
import TabbedDetail from "./TabbedDetail.jsx";
import InfoBox from "./InfoBox.jsx";
import { buildAssessmentQuiz } from "./assessmentQuiz.js";

// Per-item icon, keyed by the same object keys cardiovascularData.js/
// respiratoryData.js use -- replaces each entry's emoji with a lucide-react
// line icon (same icon set as the rest of the app) for Learn's study mode
// only; the live CardiopulmonaryAssessment.jsx info-card popups still show
// the original emoji from d.icon, untouched.
const ICONS = {
  heartRate: HeartPulse, pulseRhythm: Activity, pulseVolume: Activity, pulses: Heart,
  bloodPressure: Gauge, orthostatic: Gauge, capRefill: Timer, edema: Droplet, jvp: Activity,
  cardiacAuscultation: Stethoscope, aorticArea: Stethoscope, pulmonaryArea: Stethoscope,
  tricuspidArea: Stethoscope, mitralArea: Stethoscope, s1s2: Stethoscope,
  additionalHeartSounds: Stethoscope, murmurs: Stethoscope,
  skinColour: Eye, skinTemperature: Thermometer, peripheralPerfusion: Droplets,
  limbSymmetry: Move, peripheralVascularInspection: Eye,
  restingCVResponse: Activity, exerciseHRResponse: HeartPulse, exerciseBPResponse: Gauge,
  hrRecovery: Timer, bpRecovery: Timer, borgRPE: Zap, dyspneaRating: Wind, sixMWT: Footprints,
  pulsePressure: Gauge, clubbing: Hand, homans: Footprints, abi: GaugeCircle, allensTest: Hand,
  nyha: HeartPulse,
  respRate: Wind, chestShape: Move, breathingPattern: Wind, workOfBreathing: Zap,
  trachea: Move, chestExpansion: Move, fremitus: Vibrate, surgicalEmphysema: AlertTriangle,
  breathSounds: Stethoscope, addedSounds: Stethoscope, cough: Wind, sputum: Droplet,
  peakCoughFlow: Wind, spo2: Activity, cyanosis: Eye, spirometry: Wind, mmrc: Gauge, borg: Zap,
};

// Real data straight from cardiovascularData.js/respiratoryData.js -- the
// exact same reference library CardiopulmonaryAssessment.jsx's own ⓘ
// InfoCard buttons already pull from (see e.g. info={cardiovascularData.pulses}
// there). Unlike ROM/MMT's flat fields, these use the richer InfoCard
// perform/scale/interpret shape, so toCard() here maps that shape into the
// Learn / Technique / Quiz sections of the same tabbed detail screen ROM,
// MMT, Special Tests and Neurological use.
const ALL = { ...cardiovascularData, ...respiratoryData };
const ENTRIES = Object.entries(ALL);

// Region pills = the category string's last "·"-segment ("Basic
// Examination", "Auscultation", ... ) with a flat "Respiratory" fallback
// for respiratoryData's entries, which don't have a sub-category.
function regionOf(d) {
  const parts = d.category.split("·").map((s) => s.trim());
  return parts.length > 2 ? parts[2] : parts[parts.length - 1];
}
const REGIONS = [...new Set(Object.values(ALL).map(regionOf))];
const QUIZ_POOL = ENTRIES.map(([id, d]) => ({ id, region: regionOf(d), d }));

const BOX_TINTS = { "": "gray", blue: "blue", amber: "amber", purple: "violet" };

// The live InfoCard.jsx popup (cardiovascularData.js/respiratoryData.js's
// perform.image/perform.images) already stores real photos, just as full
// Cloudinary URLs built from the same base + "f_auto,q_auto/" transform
// StudyImage.jsx also uses -- StudyImage takes a bare public id and builds
// its own URL, so this strips that known prefix back off instead of
// passing the full URL through (which would double it). Skips (rather than
// keeping) anything that isn't that exact pattern.
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/";
function stripPrefix(src) {
  return typeof src === "string" && src.startsWith(CLOUDINARY_PREFIX) ? src.slice(CLOUDINARY_PREFIX.length) : null;
}
// 2026-09-02, Aditi: "cardio study mode doesn't show the same three
// images as the live cardio info cards" -- the live InfoCard.jsx popup pages
// through up to 3 photos per item (perform.images), so the detail screen's
// gallery does too. Returns every real (uploaded) photo id, up to 3, in order.
function realImages(d) {
  const raw = Array.isArray(d.perform?.images) && d.perform.images.length
    ? d.perform.images.slice(0, 3).map((it) => (it && typeof it === "object" ? it.src : it))
    : [d.perform?.image];
  return raw.map(stripPrefix).filter(Boolean);
}

// 2026-09-19, Aditi: "do neurological and cardio same as rom mmt is shown" --
// Cardio's detail was still the old single scrolling page; it now gets the
// same header, photo, Learn / Technique / Video / Quiz tabs and Next button as
// ROM and MMT. The photo (or, until it's uploaded, the item's icon) is tried
// first exactly as before; the tabs just split the same real content up.
function toCard(id, d) {
  const Icon = ICONS[id] || Stethoscope;
  const images = realImages(d);
  const region = regionOf(d);
  const system = d.category.includes("Respiratory") ? "Respiratory" : "Cardiovascular";
  const noPhoto = <Icon size={88} strokeWidth={1.25} className="text-rose-500 py-6" aria-hidden="true"/>;
  const boxes = d.perform?.boxes || [];
  return {
    id,
    Icon,
    image: images[0] || null,
    title: d.title,
    subtitle: d.perform?.caption,
    badge: region === system ? system : `${region} • ${system}`,
    media: images.length ? <ImageGallery names={images} fallback={noPhoto}/> : noPhoto,
    learn: (
      <Fragment>
        {d.scale && (
          <InfoBox icon="📊" label={d.scaleLabel || "Scale"} tint="violet">
            <div className="space-y-1.5">
              {d.scale.rows.map((r, i) =>
                d.scale.type === "meter" ? (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-bold text-white rounded px-1.5 py-0.5" style={{ background: r.color }}>{r.chip}</span>
                    <div><span className="font-semibold">{r.name}</span> — {r.desc}</div>
                  </div>
                ) : (
                  <div key={i}><span className="font-semibold">{r.k}:</span> {r.v}</div>
                )
              )}
            </div>
          </InfoBox>
        )}
        {d.interpret?.normal && (
          <InfoBox icon="✅" label="Normal" tint="green">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.normal.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.abnormal && (
          <InfoBox icon="⚠️" label="Abnormal" tint="amber">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.abnormal.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.redFlags?.length > 0 && (
          <InfoBox icon="🚨" label="Red flags" tint="red">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.redFlags.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.note && (
          <InfoBox label="Clinical note" tint="gray">{d.interpret.note}</InfoBox>
        )}
      </Fragment>
    ),
    technique: boxes.length > 0 ? (
      <Fragment>
        {boxes.map((b, i) => (
          <InfoBox key={i} label={b.label} tint={BOX_TINTS[b.tone] || "gray"}>{b.text}</InfoBox>
        ))}
      </Fragment>
    ) : null,
    quiz: buildAssessmentQuiz(id, d.title, d, region, QUIZ_POOL),
  };
}

export default function CardioStudy({ onBack }) {
  const [region, setRegion] = useState(REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(
    () => ENTRIES.filter(([, d]) => regionOf(d) === region).map(([id, d]) => toCard(id, d)),
    [region]
  );

  if (selected) {
    const idx = cards.findIndex((c) => c.id === selected.id);
    const nextCard = idx >= 0 && idx < cards.length - 1 ? cards[idx + 1] : null;
    return (
      <TabbedDetail
        id={selected.id}
        badge={selected.badge}
        title={selected.title}
        subtitle={selected.subtitle}
        media={selected.media}
        learn={selected.learn}
        technique={selected.technique}
        quiz={selected.quiz}
        theme="rose"
        next={nextCard ? { label: `Next: ${nextCard.title}`, onClick: () => { setSelected(nextCard); window.scrollTo({ top: 0 }); } } : null}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <StudyShell
      title="Cardio & Respiratory"
      onBack={onBack}
      regions={REGIONS.map((r) => ({ key: r, label: r }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}
