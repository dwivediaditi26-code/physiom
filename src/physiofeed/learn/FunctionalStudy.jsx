import { useState, useMemo, Fragment } from "react";
import {
  Armchair, Move, PersonStanding, Dumbbell, Footprints, MoveUp, Activity,
  RotateCw, ArrowUp, ArrowUpRight, Hand, HandMetal, Bone, ArrowRightLeft,
  Zap, Scale, Brain, Eye, Wind, Shield, Volume2, Link2,
} from "lucide-react";
import { FUNCTIONAL_SCREEN_DATA } from "../../RegionalFunctionalScreens.jsx";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const REGION_KEYS = Object.keys(FUNCTIONAL_SCREEN_DATA);

// Per-test icon, keyed by the same test ids FUNCTIONAL_SCREEN_DATA uses --
// replaces each entry's emoji with a lucide-react line icon (same icon set
// as the rest of the app) for Learn's study mode only; the live
// FunctionalScreenHub clinical screen (RegionalFunctionalScreens.jsx) still
// shows the original emoji from t.icon, untouched. A test id that recurs
// across regions (e.g. the FMS battery items reused on Hip/Knee/Ankle) is
// the same real-world test everywhere, so it keeps the same icon.
const ICONS = {
  lfs_sts: Armchair, lfs_fwd: Move, lfs_sls: PersonStanding, lfs_squat: Dumbbell,
  lfs_step: Footprints, fms_aslr: MoveUp, fms_tspu: Activity, fms_rs: RotateCw,
  sfs_flex: ArrowUp, sfs_abd: ArrowUpRight, sfs_ir: Hand, sfs_er: HandMetal,
  sfs_scap: Bone, fms_sm: Move,
  hfs_sls: PersonStanding, hfs_hinge: Move, hfs_ext: ArrowUp, hfs_rot: RotateCw,
  hfs_step: Footprints,
  fms_sq: Dumbbell, fms_hs: Footprints, fms_il: ArrowRightLeft,
  kfs_squat: Dumbbell, kfs_lunge: ArrowRightLeft, kfs_step: Footprints,
  kfs_hop: Zap, kfs_tke: Move,
  afs_hr: ArrowUp, afs_df: Move, afs_bal: Scale, afs_hop: Zap, afs_arch: Footprints,
  cfs_arom: RotateCw, cfs_dnf: Activity, cfs_post: PersonStanding, cfs_diz: Eye,
  cfs_ulnt: Zap,
  tfs_arom: RotateCw, tfs_rib: Wind, tfs_ext: ArrowUp, tfs_t4: Zap, tfs_scap: Bone,
  efs_arom: RotateCw, efs_lat: Dumbbell, efs_med: Dumbbell, efs_stab: Shield,
  efs_neural: Zap,
  wfs_arom: Hand, wfs_cts: Zap, wfs_tfcc: Bone, wfs_scaph: Bone, wfs_fingers: Hand,
  tmj_arom: RotateCw, tmj_click: Volume2, tmj_muscle: Hand, tmj_cerv: Link2,
  tmj_head: Brain,
};

// Real data from FUNCTIONAL_SCREEN_DATA (RegionalFunctionalScreens.jsx) --
// the exact same LUMBAR_TESTS/SHOULDER_TESTS/etc. arrays the actual
// Functional Screen clinical screen (FunctionalScreenHub) renders.
// `grades` and `svgNormal`/`svgAbnormal` only exist on some regions'
// items (e.g. Lumbar has hand-drawn normal/compensated SVGs, most don't)
// -- all optional, guarded below, same "only show a section if the real
// data has it" rule as every other study-mode card.
function toCard(t) {
  return {
    id: t.id,
    Icon: ICONS[t.id] || Activity,
    title: t.label,
    subtitle: t.subtitle,
    tags: [t.phase].filter(Boolean),
    sections: (
      <Fragment>
        {t.setup && <InfoBox icon="🧍" label="Setup" tint="blue">{t.setup}</InfoBox>}
        {t.normalDesc && <InfoBox icon="✅" label="Normal pattern" tint="green">{t.normalDesc}</InfoBox>}
        {(t.svgNormal || t.svgAbnormal) && (
          <div className="grid grid-cols-2 gap-3">
            {t.svgNormal && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 flex items-center justify-center">{t.svgNormal}</div>
            )}
            {t.svgAbnormal && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 flex items-center justify-center">{t.svgAbnormal}</div>
            )}
          </div>
        )}
        {t.observations && t.observations.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">What to observe</div>
            <div className="space-y-2">
              {t.observations.map((o) => (
                <div key={o.id} className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">{o.q}</div>
                  {o.opts && o.opts.length > 0 && <div className="text-[11px] text-slate-500 mt-1">{o.opts.join(" · ")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {t.grades && t.grades.length > 0 && (
          <InfoBox icon="🏷️" label="Grading" tint="gray">
            {t.grades.map((g, i) => <div key={i} className={i > 0 ? "mt-1.5" : ""}>{g}</div>)}
          </InfoBox>
        )}
      </Fragment>
    ),
  };
}

export default function FunctionalStudy({ onBack }) {
  const [region, setRegion] = useState(REGION_KEYS[0]);
  const [selected, setSelected] = useState(null);
  const bucket = FUNCTIONAL_SCREEN_DATA[region];
  const cards = useMemo(() => (bucket?.tests || []).map(toCard), [bucket]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Functional Screen"
      onBack={onBack}
      regions={REGION_KEYS.map((k) => ({ key: k, label: FUNCTIONAL_SCREEN_DATA[k].label }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}
