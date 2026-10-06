// lazy() for code-split screens that survives a deploy. A deploy replaces the hashed script files,
// so a tab opened before it can fail to load a screen ("Importing a module script failed" on
// iPhone, "Failed to fetch dynamically imported module" elsewhere). main.jsx already reloads once
// on Vite's own preload error, but a failed import() itself is a different error and slipped
// through. This reloads once to pick up the new build; the flag stops a reload loop, and if the
// reload does not help the normal error screen shows.
import { lazy as reactLazy } from "react";

const FLAG = "pm_chunk_reload";
const NEVER = new Promise(() => {});

export function isChunkLoadError(err) {
  const msg = String(err?.message || err || "");
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(msg);
}

export function lazy(factory) {
  return reactLazy(() =>
    factory().catch((err) => {
      if (isChunkLoadError(err)) {
        try {
          if (!sessionStorage.getItem(FLAG)) {
            sessionStorage.setItem(FLAG, "1");
            window.location.reload();
            return NEVER; // keep the spinner up while the page reloads
          }
        } catch { /* storage blocked: fall through to the normal error */ }
      }
      throw err;
    })
  );
}
