import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Features that are built but not launched yet are shown only to accounts marked
// admin in the `profiles` table (profiles.is_admin, the same flag that gates the
// admin pages in PhysioFeed). Everyone else -- including guests -- does not see them.
//
// This hides the screen, it does not secure anything: Posture Analysis runs
// entirely on the person's own phone. It is also not a download cost: the posture
// screen is a separate on-demand file (~104 KB gzipped) that is only fetched when
// the screen is opened, so a hidden feature adds nothing to anyone's first visit.

const cacheKey = (uid) => `pm_ff_admin_${uid}`;

function readCache(uid) {
  if (!uid) return false;
  try { return localStorage.getItem(cacheKey(uid)) === "1"; } catch { return false; }
}
function writeCache(uid, on) {
  try { on ? localStorage.setItem(cacheKey(uid), "1") : localStorage.removeItem(cacheKey(uid)); } catch { /* storage blocked */ }
}

// true / false, or null when it could not be found out (offline, error).
export async function fetchIsPreviewTester(userId) {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (error) return null;
    return !!data?.is_admin;
  } catch {
    return null;
  }
}

// { enabled, ready }: `enabled` is whether preview features show for this person;
// `ready` is false only while the answer is still on its way (so a restored
// Posture screen can wait instead of being thrown out too early). The last known
// answer is remembered on the device, so an admin does not see the feature pop in
// on every visit, and a failed check never switches it off.
export function usePreviewFeatures(currentUser) {
  const uid = currentUser?.id || null;
  const [state, setState] = useState(() => ({ enabled: readCache(uid), ready: !uid }));

  useEffect(() => {
    if (!uid) { setState({ enabled: false, ready: true }); return; }
    let live = true;
    setState((s) => ({ enabled: readCache(uid) || s.enabled, ready: false }));
    fetchIsPreviewTester(uid).then((answer) => {
      if (!live) return;
      if (answer === null) { setState((s) => ({ enabled: s.enabled, ready: true })); return; }
      writeCache(uid, answer);
      setState({ enabled: answer, ready: true });
    });
    return () => { live = false; };
  }, [uid]);

  return state;
}

// Same answer for a component that is not given the signed-in user (it looks the
// session up itself). Used by small admin-only controls deep inside a screen.
export function usePreviewFeaturesForCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.resolve(supabase.auth.getSession())
      .then((res) => { if (live) setUser(res?.data?.session?.user || null); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return usePreviewFeatures(user);
}
