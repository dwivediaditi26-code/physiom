-- ============================================================
-- PhysioMind — Clinic Protocols table + Row Level Security
-- Run this in Supabase Dashboard → SQL Editor → New Query
--
-- Backs the "My Clinic Protocol" feature: a therapist's own saved,
-- named exercise sets (built from the real exercise library) that they
-- can reuse across patients. New table, no legacy data, no existing
-- permissive policy to worry about (unlike patients -- see the STEP 4b
-- comment in supabase_rls_setup.sql for why that one needed extra care).
-- ============================================================

-- STEP 1: Create the table
CREATE TABLE IF NOT EXISTS clinic_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled protocol',
  region TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Create an index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_clinic_protocols_user_id ON clinic_protocols(user_id);

-- STEP 3: Enable Row Level Security
ALTER TABLE clinic_protocols ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create the 4 policies — each clinician sees ONLY their own protocols
DROP POLICY IF EXISTS "Users can view own clinic protocols"   ON clinic_protocols;
DROP POLICY IF EXISTS "Users can insert own clinic protocols" ON clinic_protocols;
DROP POLICY IF EXISTS "Users can update own clinic protocols" ON clinic_protocols;
DROP POLICY IF EXISTS "Users can delete own clinic protocols" ON clinic_protocols;

CREATE POLICY "Users can view own clinic protocols"
  ON clinic_protocols FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clinic protocols"
  ON clinic_protocols FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clinic protocols"
  ON clinic_protocols FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clinic protocols"
  ON clinic_protocols FOR DELETE
  USING (auth.uid() = user_id);

-- DONE. Run the query, then test by signing in, building a small exercise
-- programme in Clinical → an Ortho assessment → Exercise Prescription
-- step, and tapping "💾 Save as Clinic Protocol".
