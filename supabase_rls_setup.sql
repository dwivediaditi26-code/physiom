-- ============================================================
-- PhysioMind — Row Level Security Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- STEP 1: Add user_id column to patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 2: Create an index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- STEP 3: Enable Row Level Security on the table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view own patients"   ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

-- STEP 4b: CRITICAL -- also drop the wide-open policy created by
-- supabase/schema.sql ("allow_all_patients", using(true)/with check(true)).
-- Postgres combines multiple PERMISSIVE policies for the same command with
-- OR, not AND/replace -- so leaving that policy in place meant every row
-- stayed fully readable/writable by anyone regardless of the user_id-scoped
-- policies below. Running STEP 5 without this line does NOT actually
-- isolate patient data; it just adds stricter-looking policies that the
-- old permissive one silently overrides. If this script was already run
-- once without this line, re-run it now -- this is a real, live data
-- isolation gap, not a hypothetical one.
DROP POLICY IF EXISTS "allow_all_patients" ON patients;

-- STEP 5: Create the 4 policies — each clinician sees ONLY their own patients

CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 6: (Optional) If you want to migrate existing rows to a specific user,
-- replace 'YOUR-USER-UUID-HERE' with your Supabase user ID from Auth dashboard:
-- UPDATE patients SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;

-- DONE. Run the query, then test by logging in and adding a patient.
