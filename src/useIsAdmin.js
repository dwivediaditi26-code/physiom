import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Is the signed-in user an admin? Reads the same profiles.is_admin flag
// PhysioFeed's admin pages use (db.js maps it to profile.isAdmin), but works
// anywhere in the app: the Clinical screens sit outside PhysioFeed's
// AppDataProvider, so useAppData() can't be used there. Signed out, a guest,
// or any lookup failure all mean "not an admin" -- nobody becomes an admin by
// accident. The answer is remembered per user so every photo strip on a screen
// doesn't repeat the query.
let cached = null; // { uid, value }

async function lookup() {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return false;
  if (cached?.uid === uid) return cached.value;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
  cached = { uid, value: !!data?.is_admin };
  return cached.value;
}

export function useIsAdmin() {
  const [admin, setAdmin] = useState(cached?.value ?? false);
  useEffect(() => {
    let live = true;
    lookup().then((v) => { if (live) setAdmin(v); }).catch(() => { if (live) setAdmin(false); });
    return () => { live = false; };
  }, []);
  return admin;
}
