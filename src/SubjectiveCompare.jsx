import React, { useState, useCallback, Suspense, lazy } from "react";
import SubjectiveAssessmentNew from "./SubjectiveAssessmentNew.jsx";

// Lazy-loaded on its own so this comparison screen doesn't force the (huge,
// ~6400-line) real clinical engine into the initial bundle for people who
// never open this screen. Points at the exact same file the app's real
// Subjective tab uses (via lazy_subjective.jsx) so the bundler shares one
// chunk instead of shipping SubjectiveObjective.jsx twice.
const LazyOldSubjective = lazy(() =>
  import("./SubjectiveObjective.jsx").then((m) => ({ default: m.SubjectiveModule }))
);

// Minimal error boundary -- the real engine (SubjectiveModule) is a huge,
// heavily-stateful component built to run inside the full app shell with a
// real patient record. Mounting it here with a stripped-down local `data`
// object is expected to work (viewStep="form" only needs a selected region,
// seeded below), but if some code path inside it ever assumes something
// this stripped-down context doesn't provide, this catches that and shows a
// message instead of taking the whole comparison page down.
class OldEngineBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: "#991b1b", fontSize: 13.5, lineHeight: 1.5 }}>
          The current live Subjective Assessment couldn't render here in
          isolation (it normally runs inside the full app with a real patient
          open). This is a limitation of this side-by-side preview only —
          the real Subjective tab elsewhere in the app is unaffected.
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11.5, color: "#7f1d1d", whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const WINDOW_HEIGHT = 880;

export default function SubjectiveCompare({ onBack }) {
  // Isolated local state for the OLD component — completely separate from
  // the real app's active-patient `data`/draft. Nothing typed in here is
  // saved anywhere or touches any real patient record. Seeded with
  // "Lumbar / SI" pre-selected so the old form actually shows its real
  // fields instead of its empty "select a region to begin" state — chosen
  // to match the kind of case (low back / postpartum) the new design's own
  // demo data uses, so the two are showing comparable content.
  const [oldData, setOldData] = useState(() => ({
    cx_selected_regions: JSON.stringify(["Lumbar / SI"]),
  }));

  const oldSet = useCallback((idOrObj, val) => {
    if (typeof idOrObj === "object" && idOrObj !== null) {
      setOldData((prev) => ({ ...prev, ...idOrObj }));
    } else {
      setOldData((prev) => ({ ...prev, [idOrObj]: val }));
    }
  }, []);

  // Old component's requireAuth() gate is for AI-backed buttons only — always
  // allow here so nothing pops a "sign in" prompt in a preview screen.
  const requireAuth = useCallback(() => true, []);
  const noop = useCallback(() => {}, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1C1C28" }}>
            🆚 Subjective Assessment — New vs Old
          </div>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4, maxWidth: 640, lineHeight: 1.45 }}>
            Side-by-side preview only. The <strong>new design</strong> (left) is a standalone mockup with its
            own demo data — nothing you type there is saved. The <strong>current live version</strong> (right)
            is the real engine, wired up here with a sample region so you can see its actual fields — also
            isolated from any real patient, nothing here touches a real record. Use this to spot what's
            missing or different in the new design.
          </div>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              flexShrink: 0,
              border: "1px solid #E4E1F5",
              background: "#F3F1FC",
              color: "#6C4DFF",
              fontWeight: 700,
              fontSize: "0.8rem",
              padding: "8px 14px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            ← Back to Subjective
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <div style={colLabelStyle("#6C4DFF", "#F3F1FC")}>🆕 NEW DESIGN (proposed)</div>
          <div
            style={{
              height: WINDOW_HEIGHT,
              overflow: "hidden",
              borderRadius: 16,
              border: "1px solid #E4E1F5",
              background: "#E9E9EF",
            }}
          >
            <SubjectiveAssessmentNew />
          </div>
        </div>

        <div>
          <div style={colLabelStyle("#374151", "#F3F4F6")}>📋 CURRENT LIVE VERSION (old)</div>
          <div
            style={{
              height: WINDOW_HEIGHT,
              overflowY: "auto",
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#fff",
              padding: 16,
            }}
          >
            <OldEngineBoundary>
              <Suspense fallback={<div style={{ padding: 20, fontSize: 13, color: "#6b7280" }}>Loading current version…</div>}>
                <LazyOldSubjective
                  data={oldData}
                  set={oldSet}
                  onNav={noop}
                  onTabChange={noop}
                  navContext={{}}
                  requireAuth={requireAuth}
                  viewStep="form"
                />
              </Suspense>
            </OldEngineBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

function colLabelStyle(color, bg) {
  return {
    display: "inline-block",
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.5px",
    color,
    background: bg,
    padding: "5px 10px",
    borderRadius: 8,
    marginBottom: 8,
  };
}
