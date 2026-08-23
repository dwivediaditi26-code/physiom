/* ============================================================
   orthoTemplates.js — "My Templates" for the Outpatient pathway.
   Standalone prototype, no backend — saved templates persist to
   localStorage on this device/browser only. A template is just a
   named, reusable step list (the same `stepOrder` array the
   condition-picker would otherwise compute), so applying one
   skips the condition-promote logic entirely and goes straight
   to the therapist's own saved section set.
   ============================================================ */

const STORAGE_KEY = "ortho.outpatient.templates.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, etc.) — template just won't persist.
  }
}

export function getTemplates() {
  return readAll();
}

export function saveTemplate({ name, stepOrder, regionsLabel, conditionLabel }) {
  const list = readAll();
  const entry = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: (name || "").trim() || "Untitled template",
    stepOrder,
    regionsLabel: regionsLabel || "",
    conditionLabel: conditionLabel || "",
    savedAt: new Date().toISOString(),
  };
  writeAll([...list, entry]);
  return entry;
}

export function deleteTemplate(id) {
  writeAll(readAll().filter((t) => t.id !== id));
}
