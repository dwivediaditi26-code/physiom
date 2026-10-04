import { useState } from "react";
import * as db from "../../data/db.js";

// "Withdraw" for the person who applied/registered: asks first, then takes
// their own application back. The organiser is told by the database, and a
// workshop's waiting list moves up. `onDone` re-reads the student's
// applications so the screen goes back to "Apply" / "Register".
export default function WithdrawButton({ oppId, label, confirmText, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const go = async () => {
    if (busy || !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await db.withdrawApplication(oppId);
      await onDone?.();
    } catch (e) {
      setError(e.message || "Couldn't withdraw — please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="text-center">
      <button type="button" onClick={go} disabled={busy} className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline-offset-2 hover:underline disabled:opacity-50">
        {busy ? "Withdrawing…" : label}
      </button>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
