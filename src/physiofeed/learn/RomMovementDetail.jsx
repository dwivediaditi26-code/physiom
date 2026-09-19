import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import { QuickCheck, hash } from "./SpecialTestDetail.jsx";

// ROM movement detail: hero photo, then Learn / Technique / Video / Quiz tabs
// (same layout as the Special Test screen). All content is the ROM data the
// app already has; the Quick Check asks for the movement's normal range,
// built from the other movements in the same region.

const TABS = ["Learn", "Technique", "Video", "Quiz"];

function buildQuiz(m, list) {
  if (m.normal == null) return null;
  const others = [...new Set(list.filter((x) => x.id !== m.id && x.normal != null && x.normal !== m.normal).map((x) => x.normal))];
  // Regions with few distinct normals (e.g. cervical, where several
  // movements share 45) pad the choices with plausible nearby values.
  const step = m.normal >= 60 ? 20 : m.normal >= 20 ? 15 : 5;
  [m.normal - step, m.normal + step, m.normal + 2 * step, m.normal - 2 * step, m.normal + 3 * step].forEach((v) => {
    if (v > 0 && v !== m.normal && !others.includes(v)) others.push(v);
  });
  if (others.length < 3) return null;
  const seed = hash(m.id);
  const picks = others.map((v) => ({ v, k: hash(m.id + ":" + v) })).sort((a, b) => a.k - b.k).slice(0, 3).map((o) => o.v);
  if (picks.length < 3) return null;
  const unit = m.unit || "°";
  const ordered = [...picks, m.normal]
    .map((v, i) => ({ v, k: (seed + i * 11) % 89 }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: "ABCD"[i], v: o.v, text: `${o.v}${unit}` }));
  const correct = ordered.find((o) => o.v === m.normal).id;
  return {
    question: `What is the normal range for ${m.mv}?`,
    options: ordered.map(({ id, text }) => ({ id, text })),
    correctOptionId: correct,
    explanation: `Normal ${m.mv} is ${m.normal}${unit}.${m.endfeel?.normal ? ` The normal end feel is ${m.endfeel.normal.toLowerCase().replace(/\.$/, "")}.` : ""}${m.muscles ? ` Muscles: ${m.muscles}.` : ""}`,
  };
}

export default function RomMovementDetail({ movement: m, region, list, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const quiz = useMemo(() => buildQuiz(m, list || []), [m.id]);
  const next = useMemo(() => {
    const i = (list || []).findIndex((x) => x.id === m.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [m.id, list]);
  const unit = m.unit || "°";

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>

      <span className="inline-block text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 mb-2">{region} • Range of motion</span>
      <h2 className="text-xl font-bold text-slate-900 leading-tight">{m.mv}</h2>
      <p className="text-sm text-slate-500 mt-1">{[m.plane, m.normal != null && `Normal ${m.normal}${unit}`].filter(Boolean).join(" · ")}</p>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        <StudyImage name={m.id} full/>
      </div>

      <div className="flex mt-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (
          <>
            {m.normal != null && <InfoBox icon="📏" label="Normal range" tint="violet">{m.normal}{unit}{m.plane ? ` in the ${m.plane} plane` : ""}</InfoBox>}
            {m.muscles && <InfoBox icon="💪" label="Muscles" tint="green">{m.muscles}</InfoBox>}
            {m.endfeel && (
              <InfoBox icon="🖐" label="End feel" tint="violet">
                <div><span className="font-semibold">Normal:</span> {m.endfeel.normal}</div>
                {m.endfeel.abnormal && <div className="text-slate-500 mt-1"><span className="font-semibold">Abnormal:</span> {m.endfeel.abnormal}</div>}
              </InfoBox>
            )}
            {m.capsular && <InfoBox icon="🔵" label="Capsular pattern" tint="blue">{m.capsular}</InfoBox>}
            {m.pathology && (
              <InfoBox label="Pathology correlation" tint="gray">
                {m.pathology}
                {m.adl && <div className="mt-2"><span className="font-semibold">ADL relevance:</span> {m.adl}</div>}
              </InfoBox>
            )}
            {(m.pediatric || m.geriatric) && (
              <div className="space-y-3">
                {m.pediatric && <InfoBox icon="👶" label="Pediatric" tint="violet">{m.pediatric}</InfoBox>}
                {m.geriatric && <InfoBox icon="👴" label="Geriatric" tint="blue">{m.geriatric}</InfoBox>}
              </div>
            )}
          </>
        )}

        {tab === "Technique" && (
          <>
            {m.start && <InfoBox icon="👤" label="Starting position" tint="violet">{m.start}</InfoBox>}
            {m.gonio && <InfoBox icon="📐" label="Goniometer placement" tint="amber">{m.gonio}</InfoBox>}
            {m.compensation && <InfoBox icon="⚠️" label="Watch for compensation" tint="amber">{m.compensation}</InfoBox>}
            {m.redflag && <InfoBox icon="🚨" label="Red flags" tint="red">{m.redflag}</InfoBox>}
            {!m.start && !m.gonio && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
            <VideoIcon size={28} className="mx-auto text-slate-300 mb-2"/>
            <div className="text-sm font-semibold text-slate-600">Video coming soon</div>
            <div className="text-xs text-slate-400 mt-1">A demonstration of {m.mv} will appear here.</div>
          </div>
        )}

        {tab === "Quiz" && <QuickCheck key={m.id} quiz={quiz}/>}
      </div>

      {next && (
        <button type="button" onClick={() => onNext(next)} className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-700">
          Next movement: {next.mv} <ChevronRight size={16}/>
        </button>
      )}
    </div>
  );
}
