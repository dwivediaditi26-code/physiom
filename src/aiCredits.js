import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

/* ============================================================
   AI credits (Aditi, 2026-10-10) -- the app side of supabase/add_ai_credits.sql.

   What costs a credit: Generate with AI (the paragraph box, charged by api/parse.js on the server) and
   Analyze Case (charged here, by the ai_spend_analysis function). The balance lives only in Supabase; this
   file asks for it and asks to spend -- it never decides a balance itself.

   state:
     "loading"       first answer not back yet
     "guest"         not signed in: no account, no credits
     "unconfigured"  the SQL has not been run (or there is no Supabase here, e.g. in tests): everything is free
     "ready"         balance known (balance / unlimited)
     "error"         could not reach Supabase: spending is refused until it can be checked
   ============================================================ */

let snapshot = { state: "loading", balance: 0, unlimited: false, cases: {} };
const listeners = new Set();
function setSnapshot(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
}
export function getCreditsSnapshot() { return snapshot; }
export function subscribeCredits(fn) { listeners.add(fn); return () => listeners.delete(fn); }
// Test helper: put the store back to its first-load shape.
export function resetCreditsForTests(next = {}) { snapshot = { state: "loading", balance: 0, unlimited: false, cases: {}, ...next }; listeners.forEach((fn) => fn()); }

export function functionMissing(error) {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function|function .* does not exist/i.test(error.message || "");
}

export function newRequestId() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* fall through */ }
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function signedIn() {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  } catch { return false; }
}

const canCallRpc = () => typeof supabase?.rpc === "function";

// Ask Supabase for the balance (and, with a case key, that case's free re-analyses left).
export async function refreshCredits(caseKey) {
  if (!canCallRpc()) { setSnapshot({ state: "unconfigured" }); return getCreditsSnapshot(); }
  if (!(await signedIn())) { setSnapshot({ state: "guest", balance: 0, unlimited: false, cases: {} }); return getCreditsSnapshot(); }
  try {
    const { data, error } = await supabase.rpc("ai_credits_status", { p_case_key: caseKey || null });
    if (functionMissing(error)) { setSnapshot({ state: "unconfigured" }); return getCreditsSnapshot(); }
    if (error || !data) { setSnapshot({ state: "error" }); return getCreditsSnapshot(); }
    const cases = caseKey ? { ...snapshot.cases, [caseKey]: { analyzed: !!data.analyzed, freeLeft: data.free_reanalyses_remaining ?? 3 } } : snapshot.cases;
    setSnapshot({ state: "ready", balance: data.balance ?? 0, unlimited: !!data.unlimited, cases });
  } catch {
    setSnapshot({ state: "error" });
  }
  return getCreditsSnapshot();
}

// The reply of api/parse.js says what is left ("unlimited" or a number); take it without another round trip.
export function applyServerBalance(headerValue) {
  if (headerValue == null || headerValue === "") return;
  if (headerValue === "unlimited") { setSnapshot({ state: "ready", unlimited: true }); return; }
  const n = Number(headerValue);
  if (Number.isFinite(n)) setSnapshot({ state: "ready", balance: n });
}

// One request id per (case, scores) until the server has really answered, so a retry after a lost reply
// is never charged twice.
let pendingSpend = null;

// -> { ok, reason, charged, balance, freeLeft } | { ok:false, reason:"error" | "unavailable" }
export async function spendAnalysis(caseKey, sig) {
  if (!canCallRpc()) return { ok: true, reason: "unconfigured", charged: false };
  const key = `${caseKey}|${sig}`;
  if (!pendingSpend || pendingSpend.key !== key) pendingSpend = { key, id: newRequestId() };
  let result;
  try {
    result = await supabase.rpc("ai_spend_analysis", { p_case_key: caseKey, p_sig: sig, p_request_id: pendingSpend.id });
  } catch {
    return { ok: false, reason: "error" };
  }
  const { data, error } = result || {};
  if (functionMissing(error)) { setSnapshot({ state: "unconfigured" }); return { ok: true, reason: "unconfigured", charged: false }; }
  if (error || !data) return { ok: false, reason: "error" };
  pendingSpend = null; // the server answered for real
  const cases = { ...snapshot.cases, [caseKey]: { analyzed: !!data.ok || snapshot.cases[caseKey]?.analyzed, freeLeft: data.free_reanalyses_remaining ?? 3 } };
  setSnapshot({ state: "ready", balance: data.balance ?? snapshot.balance, cases });
  return { ok: !!data.ok, reason: data.reason, charged: !!data.charged, balance: data.balance, freeLeft: data.free_reanalyses_remaining };
}

// React hook: the live balance for the screen, and (with a case key) that case's free re-analyses left.
export function useAiCredits(caseKey) {
  const [snap, setSnap] = useState(getCreditsSnapshot);
  useEffect(() => subscribeCredits(() => setSnap(getCreditsSnapshot())), []);
  useEffect(() => { refreshCredits(caseKey); }, [caseKey]);
  const refresh = useCallback(() => refreshCredits(caseKey), [caseKey]);
  const info = (caseKey && snap.cases[caseKey]) || null;
  return {
    state: snap.state,
    balance: snap.balance,
    unlimited: snap.unlimited,
    caseAnalyzed: info ? info.analyzed : null,
    freeLeft: info ? info.freeLeft : null,
    refresh,
  };
}

// "Is this person's credit count enforced here?" -- only for a signed-in account whose credits are set up
// (or a guest, when the screen can ask them to sign in). Everywhere else the features stay free.
export function creditsEnforced(state, canAskToSignIn) {
  return state === "ready" || state === "error" || (state === "guest" && !!canAskToSignIn);
}
