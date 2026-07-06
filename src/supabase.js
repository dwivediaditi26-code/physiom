import { createClient } from '@supabase/supabase-js'

// Reads from Vite env vars if set (e.g. VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY), falling back to the real production project so
// every existing deploy (Vercel prod, Vercel preview, local dev) behaves
// EXACTLY as before with zero config changes needed. This only matters when
// a build explicitly sets those env vars -- e.g. a CI job building the app
// against a separate, disposable test Supabase project for E2E tests, so
// automated browser tests can never touch real student data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dlauxdokkrqbvbormxte.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_K1TTiK_OqjI16xKkEHdtlg_9ZRVq-SK'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
