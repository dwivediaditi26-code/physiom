import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { useIsAdmin } from "./useIsAdmin.js";

// The two AI credit counters (supabase/add_ai_credits.sql):
//   parser  -- "Parse with AI" on the Subjective step (spent by /api/parse on the server)
//   analyze -- "Re-analyze" on the AI Objective step (spent here, via consume_my_credit)
// One shared store so the header chip and the buttons always agree.
// `null` = not known yet (signed out, or the counter table isn't set up): nothing is locked then,
// the same fail-open choice the server makes.
let balances = { parser: null, analyze: null };
const listeners = new Set();
function publish(next) { balances = { ...balances, ...next }; listeners.forEach((l) => l(balances)); }

export async function refreshCredits() {
  try {
    const { data, error } = await supabase.rpc("get_my_credits");
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return;
    publish({ parser: row.parser_credits, analyze: row.analyze_credits });
  } catch { /* leave as unknown */ }
}

// The server tells us the new parser balance in a response header.
export function setParserCredits(n) { if (Number.isFinite(n)) publish({ parser: n }); }

// Spend one Re-analyze credit. true = go ahead, false = out of credits (locked).
export async function spendAnalyzeCredit() {
  if (balances.analyze === 0) return false;
  try {
    const { data, error } = await supabase.rpc("consume_my_credit", { p_kind: "analyze" });
    if (error || typeof data !== "number") return true; // counter unavailable: don't block
    if (data === -1) { publish({ analyze: 0 }); return false; }
    publish({ analyze: data });
    return true;
  } catch { return true; }
}

// { parser, analyze, unlimited } -- admins are never charged.
export function useCredits() {
  const unlimited = useIsAdmin();
  const [b, setB] = useState(balances);
  useEffect(() => {
    listeners.add(setB);
    refreshCredits();
    return () => { listeners.delete(setB); };
  }, []);
  return { ...b, unlimited };
}
