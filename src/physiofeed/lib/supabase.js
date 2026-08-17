// Phase 6 (you): this is the only file that needs real values.
// Until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set (see .env.example),
// supabaseEnabled stays false and src/data/db.js quietly uses the in-memory
// mock store instead -- the whole app runs either way.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
