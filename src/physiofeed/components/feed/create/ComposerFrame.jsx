import { X, ChevronLeft, AlertCircle } from "lucide-react";
import Avatar from "../../shared/Avatar.jsx";

// Shared chrome for every "type" composer (Post/Case/Research/Poll, plus
// the Video/Photo variants of Post) -- avatar+name+type label up top, a
// back arrow to the type picker, an inline error line, and a submit
// button footer. Keeps each composer file focused on its own fields
// instead of re-deriving this header/footer four times.
export default function ComposerFrame({ profile, title, onBack, onClose, error, submitLabel, onSubmit, submitDisabled, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 -ml-1" aria-label="Back to create menu">
            <ChevronLeft size={18} />
          </button>
        )}
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-900 block truncate">{profile.name}</span>
          <span className="text-[11px] text-violet-600 font-medium">{title}</span>
        </div>
        <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
      </div>

      {children}

      {error && (
        <div className="flex items-start gap-1.5 mt-3 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end pt-3 mt-3 border-t border-slate-100">
        <button
          onClick={onSubmit}
          disabled={submitDisabled}
          className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
