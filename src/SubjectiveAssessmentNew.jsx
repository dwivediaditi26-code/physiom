import React, { useState, useEffect, useRef } from "react";

const PURPLE = "#6C4DFF";
const PURPLE_LIGHT = "#F3F1FC";
const PURPLE_BORDER = "#E4E1F5";
const TEXT_DARK = "#1C1C28";
const TEXT_GRAY = "#8E8E99";
const TEXT_PLACEHOLDER = "#B4B4BE";
const DIVIDER = "#EFEDF4";

const SECTIONS = [
  {
    id: "core",
    title: "CORE",
    icon: "📄",
    fields: [
      { id: "chiefComplaint", icon: "🎯", label: "Chief Complaint" },
      {
        id: "onset",
        icon: "📅",
        label: "Onset",
        options: ["Sudden", "Gradual", "Insidious", "Post-traumatic", "Post-surgical", "Post-partum"],
      },
      {
        id: "duration",
        icon: "⏱️",
        label: "Duration",
        options: ["<24 hours", "1–7 days", "1–4 weeks", "1–3 months", "3–6 months (chronic)", ">6 months (chronic)"],
      },
      {
        id: "mechanism",
        icon: "💥",
        label: "Mechanism of Injury",
        options: ["Post-partum", "Sports injury", "Road traffic accident", "Fall", "Repetitive strain", "Insidious / unknown", "Post-surgical"],
      },
      { id: "painIntensity", icon: "📊", label: "Pain Intensity (Now)" },
      {
        id: "painBehaviour",
        icon: "📈",
        label: "Pain Behaviour",
        options: [
          "Mechanical — varies with movement/position/load",
          "Inflammatory — worse at rest, eases with movement",
          "Neuropathic — burning/shooting/tingling quality",
          "Chemical — constant, unrelated to movement",
        ],
      },
      { id: "location", icon: "📍", label: "Location" },
      {
        id: "radiation",
        icon: "🔄",
        label: "Radiation",
        options: ["No radiation", "Radiates to buttock", "Radiates below knee", "Radiates to foot", "Bilateral radiation"],
      },
      {
        id: "numbness",
        icon: "✨",
        label: "Numbness / Tingling",
        options: ["No neurological symptoms", "Numbness present", "Tingling present", "Numbness and tingling"],
      },
    ],
  },
  {
    id: "symptom",
    title: "SYMPTOM BEHAVIOUR",
    icon: "⚙️",
    fields: [
      { id: "aggravating", icon: "⚡", label: "Aggravating Factors" },
      { id: "relieving", icon: "🍃", label: "Relieving Factors" },
      {
        id: "hour24",
        icon: "🕐",
        label: "24-hour Behaviour",
        options: ["Worse in morning", "Worse at night", "Worse with prolonged sitting", "Worse with prolonged standing", "No clear pattern"],
      },
      {
        id: "irritability",
        icon: "🎚️",
        label: "Irritability",
        options: ["Low — settles quickly", "Moderate — settles within hours", "High — takes days to settle"],
      },
    ],
  },
  {
    id: "safety",
    title: "SAFETY / SCREENING",
    icon: "🛡️",
    fields: [
      {
        id: "redFlags",
        icon: "🚩",
        label: "Red Flags",
        options: ["None reported", "Unexplained weight loss", "Bowel/bladder changes", "Saddle anaesthesia", "Night pain unrelieved by rest", "History of cancer"],
      },
      { id: "medicalHistory", icon: "📋", label: "Relevant Medical History" },
      { id: "medication", icon: "💊", label: "Medication" },
      {
        id: "prevEpisodes",
        icon: "🔁",
        label: "Previous Episodes",
        options: ["First episode", "Recurrent — 2–3 prior episodes", "Recurrent — >3 prior episodes", "Chronic / ongoing"],
      },
      { id: "prevTreatment", icon: "🧰", label: "Previous Treatment" },
    ],
  },
  {
    id: "function",
    title: "FUNCTION",
    icon: "👤",
    fields: [
      { id: "patientGoals", icon: "🎯", label: "Patient Goals" },
      { id: "functionalLimitations", icon: "🚶", label: "Functional Limitations" },
      { id: "activityLimitations", icon: "🏃", label: "Activity Limitations" },
      { id: "participationRestrictions", icon: "👥", label: "Participation Restrictions" },
    ],
  },
];

const DEMO_AI_DATA = {
  chiefComplaint: "Left lower back pain near hip dimple, 6 months postpartum",
  onset: "3–6 months (chronic)",
  mechanism: "Post-partum",
  aggravating:
    "Standing on one leg to wear pants, climbing stairs, turning in bed, carrying baby on one side, walking long distances",
  relieving: "Sitting",
  painBehaviour: "Mechanical — clearly varies with movement / position / load",
  location: "Around the left side of my lower back, close to the dimple near my hip",
  radiation: "No radiation",
  numbness: "No neurological symptoms",
};

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const h = time.getHours() % 12 || 12;
  const m = String(time.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function StatusBar() {
  const clock = useClock();
  return (
    <div style={styles.statusBar}>
      <span style={styles.statusTime}>{clock}</span>
      <div style={styles.statusIcons}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect x="0" y="7" width="3" height="5" rx="0.5" fill={TEXT_DARK} />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill={TEXT_DARK} />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill={TEXT_DARK} />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill={TEXT_DARK} />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 10.5a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6zM4.8 6.7a4.5 4.5 0 016.4 0l-1.2 1.2a2.8 2.8 0 00-4 0L4.8 6.7zM2.3 4.2a8 8 0 0111.4 0L12.5 5.4a6.3 6.3 0 00-9 0L2.3 4.2z"
            fill={TEXT_DARK}
          />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke={TEXT_DARK} />
          <rect x="2" y="2" width="18" height="8" rx="1.2" fill={TEXT_DARK} />
          <rect x="22.5" y="4" width="1.6" height="4" rx="0.8" fill={TEXT_DARK} />
        </svg>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  isEditing,
  onActivate,
  onChange,
  onDeactivate,
  isDropdownOpen,
  onToggleDropdown,
  onSelectOption,
}) {
  const taRef = useRef(null);
  const hasValue = value && value.trim().length > 0;
  const leftAlign = isEditing || hasValue;

  useEffect(() => {
    if (isEditing && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = taRef.current.scrollHeight + "px";
    }
  }, [isEditing, value]);

  return (
    <div
      style={{ ...styles.fieldRow, ...(isEditing ? styles.fieldRowActive : {}) }}
      onClick={() => !isEditing && onActivate(field.id)}
    >
      <div style={styles.fieldLabelCol}>
        <span style={styles.fieldIcon}>{field.icon}</span>
        <span style={styles.fieldLabel}>{field.label}</span>
      </div>
      <div
        style={{
          ...styles.fieldAnswerCol,
          alignItems: leftAlign ? "flex-start" : "flex-end",
          textAlign: leftAlign ? "left" : "right",
        }}
      >
        {isEditing ? (
          <textarea
            ref={taRef}
            autoFocus
            rows={1}
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            onBlur={onDeactivate}
            onClick={(e) => e.stopPropagation()}
            placeholder="Type here..."
            style={styles.inlineInput}
          />
        ) : hasValue ? (
          <>
            <span>{value}</span>
            <span style={styles.pencil}>✎</span>
          </>
        ) : (
          <span style={styles.placeholder}>Tap to add</span>
        )}
      </div>
      {field.options && (
        <button
          type="button"
          aria-label={`Choose ${field.label} from list`}
          style={styles.dropdownTrigger}
          onClick={(e) => onToggleDropdown(field.id, e)}
        >
          <span style={styles.triangle} />
          {isDropdownOpen && (
            <div style={styles.dropdownPanel} onClick={(e) => e.stopPropagation()}>
              {field.options.map((opt) => (
                <div
                  key={opt}
                  className="dropdown-option"
                  style={styles.dropdownOption}
                  onClick={() => onSelectOption(field.id, opt)}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

export default function SubjectiveAssessmentDemo() {
  const [values, setValues] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [aiFilled, setAiFilled] = useState(false);
  const [toast, setToast] = useState("");

  const totalFields = SECTIONS.reduce((n, s) => n + s.fields.length, 0);
  const completed = Object.values(values).filter((v) => v && v.trim()).length;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function activateField(id) {
    setOpenDropdown(null);
    setEditingId(id);
  }

  function updateValue(id, val) {
    setValues((v) => ({ ...v, [id]: val }));
  }

  function deactivateField() {
    setEditingId(null);
  }

  function toggleDropdown(id, e) {
    e.stopPropagation();
    setEditingId(null);
    setOpenDropdown((prev) => (prev === id ? null : id));
  }

  function selectOption(id, opt) {
    updateValue(id, opt);
    setOpenDropdown(null);
  }

  function closeDropdown() {
    setOpenDropdown(null);
  }

  function toggleAI() {
    if (!aiFilled) {
      setValues((v) => ({ ...v, ...DEMO_AI_DATA }));
      setAiFilled(true);
      showToast("AI extracted 9 fields");
    } else {
      setValues({});
      setAiFilled(false);
    }
  }

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <div style={styles.frame}>
        <StatusBar />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <button style={styles.backBtn} aria-label="Back">
              ←
            </button>
            <div style={styles.headerTitles}>
              <div style={styles.headerTitle}>Subjective Assessment</div>
              <div style={styles.headerSubtitle}>History &amp; Patient Report</div>
            </div>
            <button
              style={{ ...styles.aiPill, opacity: aiFilled ? 1 : 0.75 }}
              onClick={toggleAI}
            >
              ✨ AI Extracted
            </button>
            <button style={styles.menuBtn} aria-label="More">
              ⋮
            </button>
          </div>
          <div style={styles.progressRow}>
            <span style={styles.progressLabel}>SUBJECTIVE</span>
            <span style={styles.progressCount}>
              {completed} / {totalFields} completed
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={styles.content}>
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>{section.icon}</span>
                <span style={styles.sectionTitle}>{section.title}</span>
              </div>
              {section.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  isEditing={editingId === field.id}
                  onActivate={activateField}
                  onChange={updateValue}
                  onDeactivate={deactivateField}
                  isDropdownOpen={openDropdown === field.id}
                  onToggleDropdown={toggleDropdown}
                  onSelectOption={selectOption}
                />
              ))}
            </div>
          ))}
          <div style={{ height: 8 }} />
        </div>

        {/* Bottom action */}
        <div style={styles.bottomBar}>
          <button style={styles.saveBtn} onClick={() => showToast("Assessment saved")}>
            📋 Review &amp; Save Assessment
          </button>
        </div>
        <div style={styles.homeIndicator} />

        {openDropdown && <div style={styles.dropdownBackdrop} onClick={closeDropdown} />}

        {/* Toast */}
        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .dropdown-option:last-child { border-bottom: none; }
  .dropdown-option:hover { background: ${PURPLE_LIGHT}; }
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#E9E9EF",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "28px 12px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
  frame: {
    width: 390,
    maxWidth: "100%",
    height: 844,
    maxHeight: "92vh",
    background: "#fff",
    borderRadius: 44,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 24px 60px rgba(20,15,50,0.22), 0 2px 8px rgba(20,15,50,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  statusBar: {
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
  },
  statusTime: { fontSize: 15, fontWeight: 600, color: TEXT_DARK },
  statusIcons: { display: "flex", alignItems: "center", gap: 6 },
  header: { flexShrink: 0, borderBottom: `1px solid ${DIVIDER}` },
  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 16px 10px",
  },
  backBtn: {
    border: "none",
    background: "none",
    fontSize: 20,
    color: PURPLE,
    padding: 4,
    cursor: "pointer",
    flexShrink: 0,
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 19,
    fontWeight: 700,
    color: TEXT_DARK,
    letterSpacing: -0.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerSubtitle: { fontSize: 12.5, color: TEXT_GRAY, marginTop: 1 },
  aiPill: {
    border: "none",
    background: PURPLE_LIGHT,
    color: PURPLE,
    fontSize: 12.5,
    fontWeight: 600,
    padding: "7px 11px",
    borderRadius: 20,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  menuBtn: {
    border: "none",
    background: "none",
    fontSize: 18,
    color: TEXT_GRAY,
    padding: "4px 2px",
    cursor: "pointer",
    flexShrink: 0,
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px 12px",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: PURPLE,
    letterSpacing: 0.4,
  },
  progressCount: { fontSize: 13, color: TEXT_GRAY, fontWeight: 500 },
  content: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: PURPLE_LIGHT,
    padding: "9px 16px",
    borderTop: `1px solid ${PURPLE_BORDER}`,
    borderBottom: `1px solid ${PURPLE_BORDER}`,
  },
  sectionIcon: { fontSize: 13 },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: PURPLE,
    letterSpacing: 0.6,
  },
  fieldRow: {
    display: "flex",
    alignItems: "flex-start",
    padding: "13px 16px",
    borderBottom: `1px solid ${DIVIDER}`,
    cursor: "pointer",
    gap: 8,
    transition: "background 0.15s ease",
  },
  fieldRowActive: {
    background: PURPLE_LIGHT,
    margin: "0 -8px",
    padding: "13px 24px",
    borderRadius: 12,
  },
  fieldLabelCol: {
    width: "40%",
    flexShrink: 0,
    display: "flex",
    alignItems: "flex-start",
    gap: 7,
    paddingTop: 1,
  },
  fieldIcon: { fontSize: 15, lineHeight: "20px" },
  fieldLabel: {
    fontSize: 15.5,
    fontWeight: 600,
    color: TEXT_DARK,
    lineHeight: "20px",
  },
  fieldAnswerCol: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    fontSize: 15.5,
    fontWeight: 600,
    color: TEXT_DARK,
    lineHeight: "20px",
    paddingTop: 1,
    position: "relative",
  },
  inlineInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    resize: "none",
    overflow: "hidden",
    padding: 0,
    margin: 0,
    fontFamily: "inherit",
    fontSize: 15.5,
    fontWeight: 600,
    color: TEXT_DARK,
    lineHeight: "20px",
  },
  placeholder: { fontSize: 14.5, color: TEXT_PLACEHOLDER, fontWeight: 400 },
  pencil: {
    fontSize: 11,
    color: TEXT_PLACEHOLDER,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  bottomBar: {
    flexShrink: 0,
    padding: "10px 16px 6px",
    background: "#fff",
    borderTop: `1px solid ${DIVIDER}`,
  },
  saveBtn: {
    width: "100%",
    background: PURPLE,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "15px 0",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(108,77,255,0.35)",
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 3,
    background: TEXT_DARK,
    opacity: 0.85,
    margin: "0 auto 8px",
    flexShrink: 0,
  },
  dropdownTrigger: {
    position: "relative",
    flexShrink: 0,
    border: "none",
    background: "transparent",
    padding: "9px 2px 9px 6px",
    margin: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
  },
  triangle: {
    width: 0,
    height: 0,
    marginTop: 6,
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: `7px solid ${PURPLE}`,
  },
  dropdownPanel: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 6,
    minWidth: 190,
    maxWidth: 250,
    background: "#fff",
    border: `1px solid ${PURPLE_BORDER}`,
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(20,15,50,0.2)",
    overflow: "hidden",
    zIndex: 6,
  },
  dropdownOption: {
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 500,
    color: TEXT_DARK,
    borderBottom: `1px solid ${DIVIDER}`,
    textAlign: "left",
    cursor: "pointer",
  },
  dropdownBackdrop: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    background: "transparent",
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(28,28,40,0.92)",
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 600,
    padding: "10px 18px",
    borderRadius: 20,
    animation: "fadeIn 0.15s ease-out",
    zIndex: 10,
    whiteSpace: "nowrap",
  },
};
