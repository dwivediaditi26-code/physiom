import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Field, inputCls, todayLocalIso } from "./FormFields.jsx";

// "Extend" on My Postings: give people more time -- a later closing date and,
// for a workshop, a later event date or more seats -- without reopening the
// whole edit form. A closed listing is reopened by extending it, and an
// expired one is live again as soon as its dates lie ahead. Nothing is
// pre-filled with an invented date: the fields start from what the listing
// already has, and Save stays off until something actually changes.
export default function ExtendListingModal({ opp, onClose, onSave }) {
  const isWorkshop = opp.type === "workshop";
  const today = todayLocalIso();
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(opp.date || "") ? opp.date : "";
  const [deadline, setDeadline] = useState(opp.deadline || "");
  const [eventDate, setEventDate] = useState(isoDate);
  const [seats, setSeats] = useState(opp.maxParticipants ? String(opp.maxParticipants) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const eventPast = isWorkshop && isoDate && isoDate < today;
  const problems = [];
  if (deadline && deadline < today) problems.push("The closing date can't be in the past.");
  if (isWorkshop && eventDate && eventDate < today) problems.push(eventPast ? "This workshop's date has passed — choose a new date." : "The workshop date can't be in the past.");
  if (isWorkshop && eventPast && eventDate === isoDate) problems.push("This workshop's date has passed — choose a new date.");
  if (isWorkshop && deadline && eventDate && deadline > eventDate) problems.push("Registration must close on or before the workshop date.");
  if (isWorkshop && opp.maxParticipants && (!(Number(seats) >= opp.maxParticipants))) problems.push(`Seats can only go up from ${opp.maxParticipants}.`);
  const changed = deadline !== (opp.deadline || "")
    || (isWorkshop && eventDate !== isoDate)
    || (isWorkshop && opp.maxParticipants && Number(seats) !== opp.maxParticipants);
  const needsChange = opp.lifecycleStatus === "expired" || opp.lifecycleStatus === "closed";
  const canSave = problems.length === 0 && (changed || (needsChange && opp.lifecycleStatus === "closed")) && !busy;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const fields = { deadline };
      if (isWorkshop) {
        fields.eventDate = eventDate;
        if (opp.maxParticipants) fields.maxParticipants = Number(seats);
      }
      await onSave(fields);
    } catch (e) {
      setError(e.message || "Couldn't extend that listing.");
      setBusy(false);
    }
  };

  const deadlineLabel = isWorkshop ? "Registration closes on" : opp.type === "collaboration" ? "Deadline" : "Last date to apply";
  return createPortal(
    <div className="physiofeed-root fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh] p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-900">Extend listing</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{opp.title}</p>
        {opp.lifecycleStatus === "closed" && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">This listing is closed. Extending it opens it again.</p>}
        {opp.lifecycleStatus === "expired" && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">This listing has expired. Choose new dates to make it live again.</p>}

        <Field label={deadlineLabel}>
          <input type="date" min={today} max={isWorkshop && eventDate ? eventDate : undefined} value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
        </Field>
        <p className="text-xs text-slate-400 -mt-2 mb-3">Leave empty for no closing date.</p>

        {isWorkshop && (
          <Field label="Workshop date">
            <input type="date" min={today} value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
          </Field>
        )}
        {isWorkshop && opp.maxParticipants ? (
          <Field label="Number of seats">
            <input value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inputCls} />
          </Field>
        ) : null}

        {problems.length > 0 && <p className="text-xs text-rose-600 mb-3">{problems[0]}</p>}
        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl py-2.5">Cancel</button>
          <button type="button" onClick={save} disabled={!canSave} className="flex-1 text-sm font-bold text-white rounded-xl py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-40">{busy ? "Saving…" : opp.lifecycleStatus === "closed" ? "Extend & reopen" : "Extend"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
