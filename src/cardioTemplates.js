/* ============================================================
   cardioTemplates.js — "My Templates" for the Cardiopulmonary
   assessment. Standalone prototype, no backend — saved templates
   persist to localStorage on this device/browser only. Mirrors
   orthoTemplates.js's shape: a template is a named, reusable
   stepOrder plus the setting/system it was built for, so applying
   one skips straight to the assessment with that exact section
   list instead of the fixed default.
   ============================================================ */

const STORAGE_KEY = "cardio.templates.v1";

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

export function saveTemplate({ name, stepOrder, setting, system }) {
  const list = readAll();
  const entry = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: (name || "").trim() || "Untitled template",
    stepOrder,
    setting: setting || "",
    system: system || "",
    savedAt: new Date().toISOString(),
  };
  writeAll([...list, entry]);
  return entry;
}

export function deleteTemplate(id) {
  writeAll(readAll().filter((t) => t.id !== id));
}
