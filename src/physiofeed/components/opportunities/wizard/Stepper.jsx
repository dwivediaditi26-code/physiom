// Progress bar + "Step N of M" label for the Create Workshop/Job/Internship/
// Collaboration wizards. No prior art to extract this from -- the only other
// multi-step-with-dots UI in the app is the Ortho "Screening Workflow"
// stepper, built entirely inline in src/AppFull.jsx (off-limits, another
// session's in-progress work) -- so this is new, not lifted from there.
export default function Stepper({ step, steps }) {
  const total = steps.length;
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
          Step {step + 1} of {total}
        </p>
        <p className="text-[11px] font-semibold text-slate-400">{steps[step]}</p>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-indigo-600" : i === step ? "bg-indigo-400" : "bg-slate-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
