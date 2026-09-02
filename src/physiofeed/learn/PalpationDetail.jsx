import { ChevronLeft } from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";

// Full detail page for one palpation structure. Same chrome as
// StudyDetail.jsx (back button, white rounded-2xl card) but with a
// 3-slot image gallery instead of one hero image -- palpation entries
// typically need an attachments illustration plus one or two technique
// photos (this book's own figures show exactly that pattern, e.g.
// "Figure 10-45" posterior view + "Figure 10-46/10-47" starting
// position/technique). All three slots render StudyImage's existing
// "no image yet" placeholder until real photos are uploaded and their
// Cloudinary ids added to palpationData.js -- nothing here is a stand-in
// photo pretending to be real content.
function Row({ label, icon, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-2 items-start bg-slate-50 rounded-lg px-2.5 py-2">
      {icon && <span aria-hidden="true">{icon}</span>}
      <div className="text-xs text-slate-700"><span className="font-semibold text-slate-500">{label}: </span>{children}</div>
    </div>
  );
}

export default function PalpationDetail({ item, onBack }) {
  const a = item.attachments || {};
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 gap-0.5 bg-slate-100">
          {(item.images || [null, null, null]).slice(0, 3).map((img, i) => (
            <StudyImage key={i} name={img} square/>
          ))}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-xl font-semibold text-slate-900">{item.name}</div>
            <div className="text-sm font-medium text-violet-600 mt-1">{item.type}{item.position ? ` · ${item.position}` : ""}</div>
          </div>

          {(a.origin || a.insertion) && (
            <div className="grid grid-cols-2 gap-2">
              {a.origin && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Origin</div>
                  <div className="text-xs text-slate-700 mt-0.5">{a.origin}</div>
                </div>
              )}
              {a.insertion && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Insertion</div>
                  <div className="text-xs text-slate-700 mt-0.5">{a.insertion}</div>
                </div>
              )}
            </div>
          )}
          {item.actions && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Action</div>
              <div className="text-xs text-slate-700 mt-0.5">{item.actions}</div>
            </div>
          )}

          {(item.patientPosition || item.therapistPosition || item.handPlacement) && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Starting position</div>
              <div className="space-y-1.5">
                <Row label="Patient" icon="👤">{item.patientPosition}</Row>
                <Row label="Therapist" icon="🙌">{item.therapistPosition}</Row>
                <Row label="Hand placement" icon="👆">{item.handPlacement}</Row>
              </div>
            </div>
          )}

          {item.steps?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">How to palpate</div>
              <ol className="list-decimal list-outside pl-4 space-y-1.5">
                {item.steps.map((s, i) => (
                  <li key={i} className="text-xs text-slate-700 leading-relaxed">{s}</li>
                ))}
              </ol>
            </div>
          )}

          {item.feelFor && (
            <InfoBox icon="🔎" label="What you're feeling for" tint="green">{item.feelFor}</InfoBox>
          )}

          {item.notes?.length > 0 && (
            <InfoBox icon="📝" label="Palpation notes" tint="blue">
              {item.notes.map((n, i) => <div key={i} className={i > 0 ? "mt-1" : ""}>{n}</div>)}
            </InfoBox>
          )}

          {item.clinicalConsiderations && (
            <InfoBox icon="⚠️" label="Clinical considerations" tint="amber">{item.clinicalConsiderations}</InfoBox>
          )}
        </div>
      </div>
    </div>
  );
}
