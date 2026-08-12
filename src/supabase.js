import { createClient } from '@supabase/supabase-js'

// Reads from Vite env vars if set (e.g. VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY), falling back to the real production project so
// every existing deploy (Vercel prod, Vercel preview, local dev) behaves
// EXACTLY as before with zero config changes needed. This only matters when
// a build explicitly sets those env vars -- e.g. a CI job building the app
// against a separate, disposable test Supabase project for E2E tests, so
// automated browser tests can never touch real student data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v-dPE6_pd7a88gOFVuoDag_DmLUbgrT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Shared helper for calling our own auth-gated /api/* endpoints (api/parse.js
// and friends). Returns { Authorization: 'Bearer <token>' } when a session
// exists, or {} when signed out -- spread this into a fetch()'s headers.
// Used by AIAssistant.jsx, SubjectiveObjective.jsx, and the manual
// physioAITest console harness (aiIntakeTestHarness.js) so all three real
// callers of /api/parse send the same thing the server now requires.
export async function authHeader() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}
