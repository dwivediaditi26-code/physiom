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
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

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
// same InfoBox sections RomStudy/OutcomeStudy use, instead of reusing their
// field names directly.
const ALL = { ...cardiovascularData, ...respiratoryData };

// Region pills = the category string's last "·"-segment ("Basic
// Examination", "Auscultation", ... ) with a flat "Respiratory" fallback
// for respiratoryData's entries, which don't have a sub-category.
function regionOf(d) {
  const parts = d.category.split("·").map((s) => s.trim());
  return parts.length > 2 ? parts[2] : parts[parts.length - 1];
}
const REGIONS = [...new Set(Object.values(ALL).map(regionOf))];

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
// 2026-09-02, Aditi: "cardio study mode doesn't show the same three images
// as the live cardio info cards" -- the live InfoCard.jsx popup pages
// through up to 3 photos per item (perform.images), but this only ever
// passed the first one through, so StudyDetail had nothing left to page
// between. Returns every real (uploaded) photo id, up to 3, in order.
function realImages(d) {
  const raw = Array.isArray(d.perform?.images) && d.perform.images.length
    ? d.perform.images.slice(0, 3).map((it) => (it && typeof it === "object" ? it.src : it))
    : [d.perform?.image];
  return raw.map(stripPrefix).filter(Boolean);
}

function toCard(id, d) {
  // 2026-09-01, Aditi: "learn study mode doesn't show the same photos as
  // the live cardio infocards" -- pass through the real photo (same
  // Cloudinary asset the live InfoCard.jsx popup already shows) alongside
  // the icon; StudyGrid/StudyDetail try the photo first and only fall
  // back to Icon if it hasn't actually been uploaded yet (404), so this
  // no longer has to guess whether a photo will load before choosing.
  // 2026-09-02: `images` (all up to 3 real photos) drives StudyDetail's
  // full gallery; `image` (just the first) still drives StudyGrid's single
  // list thumbnail, unchanged.
  const images = realImages(d);
  return {
    id,
    Icon: ICONS[id] || Stethoscope,
    image: images[0] || null,
    images,
    title: d.title,
    subtitle: d.category.replace("Learn · ", ""),
    sections: (
      <Fragment>
        {d.perform?.caption && (
          <InfoBox icon="🖐" label="How to perform" tint="blue">{d.perform.caption}</InfoBox>
        )}
        {(d.perform?.boxes || []).map((b, i) => (
          <InfoBox key={i} label={b.label} tint={BOX_TINTS[b.tone] || "gray"}>{b.text}</InfoBox>
        ))}
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
  };
}

export default function CardioStudy({ onBack }) {
  const [region, setRegion] = useState(REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(
    () => Object.entries(ALL).filter(([, d]) => regionOf(d) === region).map(([id, d]) => toCard(id, d)),
    [region]
  );

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

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
