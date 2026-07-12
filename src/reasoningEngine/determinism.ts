// determinism.ts — helpers guaranteeing reproducible, explainable output.
// Deliberately no Date, no Math.random anywhere in the engine.

import type { ConfidenceBand } from "./types";

export function clamp(n: number, lo = 0, hi = 100): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function round(n: number): number {
  return Math.round(clamp(n));
}

export function band(pct: number): ConfidenceBand {
  if (pct >= 70) return "High";
  if (pct >= 40) return "Moderate";
  return "Low";
}

/** Stable stringify with sorted keys — used by the determinism test harness so
 *  the same logical input always serialises identically. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/** Deterministic tie-break sort: primary numeric desc, then name asc. */
export function byScoreThenName<T extends { name: string }>(
  scoreOf: (t: T) => number
): (a: T, b: T) => number {
  return (a, b) => {
    const d = scoreOf(b) - scoreOf(a);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  };
}
