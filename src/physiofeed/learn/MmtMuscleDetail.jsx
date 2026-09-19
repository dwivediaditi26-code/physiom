import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import { QuickCheck, hash } from "./SpecialTestDetail.jsx";

// MMT muscle detail: hero photo, then Learn / Technique / Video / Quiz tabs
// (same layout as Special Tests and ROM). Content is the MMT data the app
// already has. The Quick Check asks which nerve supplies the muscle, with
// the other choices taken from other muscles' nerves.

const TABS = ["Learn", "Technique", "Video", "Quiz"];

function buildQuiz(m, list, allMuscles) {
  if (!m.nerve) return null;
  const pool = (arr) => [...new Set(arr.filter((x) => x.id !== m.id && x.nerve && x.nerve !== m.nerve).map((x) => x.nerve))];
  let others = pool(list);
  if (others.length < 3) others = [...new Set([...others, ...pool(allMuscles)])];
  const picks = others.map((v) => ({ v, k: hash(m.id + ":" + v) })).sort((a, b) => a.k - b.k).slice(0, 3).map((o) => o.v);
  if (picks.length < 3) return null;
  const ordered = [...picks, m.nerve]
    .map((v, i) => ({ v, k: hash(m.id + "#" + v + i) }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: "ABCD"[i], text: o.v }));
  const correct = ordered.find((o) => o.text === m.nerve).id;
  return {
    question: `Which nerve supplies ${m.muscle}?`,
    options: ordered,
    correctOptionId: correct,
    explanation: `${m.muscle} is supplied by the ${m.nerve}${m.root ? ` (${m.root})` : ""}.${m.action ? ` Action: ${m.action}.` : ""}`,
  };
}

export default function MmtMuscleDetail({ muscle: m, region, list, allMuscles, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const quiz = useMemo(() => buildQuiz(m, list || [], allMuscles || []), [m.id]);
  const next = useMemo(() => {
    const i = (list || []).findIndex((x) => x.id === m.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [m.id, list]);

  const anatomy = [["Action", m.action], ["Nerve", m.nerve], ["Root", m.root], ["Origin", m.origin], ["Insertion", m.insertion]].filter(([, v]) => v);
  const protocol = [
    ["Patient position", m.patient, "👤"], ["Therapist", m.therapist, "🙌"],
    ["Resistance", m.resistance, "↕️"], ["Gravity eliminated", m.gravElim, "⬇️"],
    ["Palpation", m.palpation, "👆"],
  ].filter(([, v]) => v);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>

      <span className="inline-block text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 mb-2">{region} • Manual muscle testing</span>
      <h2 className="text-xl font-bold text-slate-900 leading-tight">{m.muscle}</h2>
      {m.action && <p className="text-sm text-slate-500 mt-1">{m.action}</p>}

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
            {anatomy.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {anatomy.map(([lbl, val]) => (
                  <div key={lbl} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{lbl}</div>
                    <div className="text-xs text-slate-700 mt-0.5">{val}</div>
                  </div>
                ))}
              </div>
            )}
            {(m.functional || m.chain) && (
              <InfoBox icon="⛓️" label="Clinical interpretation" tint="violet">
                {m.functional && <div>{m.functional}</div>}
                {m.chain && <div className="italic text-slate-500 mt-1">{m.chain}</div>}
              </InfoBox>
            )}
          </>
        )}

        {tab === "Technique" && (
          <>
            {protocol.length > 0 && (
              <InfoBox icon="📋" label="Testing protocol" tint="amber">
                <div className="space-y-2">
                  {protocol.map(([lbl, val, icon]) => (
                    <div key={lbl} className="flex gap-2 items-start">
                      <span aria-hidden="true">{icon}</span>
                      <div><span className="font-semibold text-slate-500">{lbl}: </span>{val}</div>
                    </div>
                  ))}
                </div>
              </InfoBox>
            )}
            {(m.compensation || m.substitution) && (
              <InfoBox icon="⚠️" label="Compensation / substitution" tint="red">
                {m.compensation && <div><span className="font-semibold">Compensation:</span> {m.compensation}</div>}
                {m.substitution && <div className="mt-1"><span className="font-semibold">Substitution:</span> {m.substitution}</div>}
              </InfoBox>
            )}
            {protocol.length === 0 && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
            <VideoIcon size={28} className="mx-auto text-slate-300 mb-2"/>
            <div className="text-sm font-semibold text-slate-600">Video coming soon</div>
            <div className="text-xs text-slate-400 mt-1">A demonstration of testing {m.muscle} will appear here.</div>
          </div>
        )}

        {tab === "Quiz" && <QuickCheck key={m.id} quiz={quiz}/>}
      </div>

      {next && (
        <button type="button" onClick={() => onNext(next)} className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-700">
          Next muscle: {next.muscle} <ChevronRight size={16}/>
        </button>
      )}
    </div>
  );
}
