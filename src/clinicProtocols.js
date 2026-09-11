// clinicProtocols.js — a therapist's own saved, reusable exercise sets
// ("My Clinic Protocol"), separate from the built-in EVIDENCE_PROTOCOLS
// library. Needs a real Supabase table (see supabase_clinic_protocols_setup.sql)
// -- unlike the localStorage-only "My Templates" assessment-section-list
// feature (orthoTemplates.js), these need to survive across devices, so
// they follow the `patients` table's direct-client-call + RLS pattern
// instead (supabase.from(...) with the anon key, scoped by auth.uid()).
import { supabase } from "./supabase.js";

export async function listClinicProtocols() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("clinic_protocols")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) { console.warn("[clinicProtocols] list failed:", error.message); return []; }
  return data || [];
}

export async function saveClinicProtocol({ id, name, region, exercises }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const row = {
    ...(id ? { id } : {}),
    user_id: user.id,
    name: (name || "").trim() || "Untitled protocol",
    region: region || "",
    exercises: exercises || [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("clinic_protocols").upsert(row, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClinicProtocol(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("clinic_protocols").delete().eq("id", id).eq("user_id", user.id);
  if (error) console.warn("[clinicProtocols] delete failed:", error.message);
}
