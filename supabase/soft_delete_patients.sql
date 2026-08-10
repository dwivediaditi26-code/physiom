-- PhysioMind — Soft-delete for patients
-- Run this in: Supabase Dashboard → SQL Editor → New Query (production project)
--
-- Problem this fixes: deletePatient() in src/AppFull.jsx was a genuine
-- one-click hard DELETE, guarded only by a native browser confirm() dialog.
-- A misclick permanently destroyed that patient's full clinical record with
-- no recovery path short of restoring the whole database from a backup
-- (if one even exists/was tested). This adds a grace-period column so
-- "deleted" patients are just hidden from the app, not actually erased --
-- matching what the Privacy Policy already promises ("all data deleted
-- within 30 days" of an account/record deletion, not instantly).
--
-- This does NOT set up automatic purging after 30 days -- that needs a
-- scheduled job (pg_cron or a Vercel cron hitting a cleanup endpoint) and
-- is a separate follow-up. Until that exists, treat old soft-deleted rows
-- as needing occasional manual cleanup (see the commented DELETE at the
-- bottom of this file for how, run deliberately, never automatically).

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Speeds up the "active patients only" filter every load already needs.
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON patients(deleted_at);

-- No RLS policy change needed -- auth.uid() = user_id ownership rules are
-- unaffected. deleted_at is just an app-level "is this in the trash?" flag,
-- filtered by the app's own queries (see src/AppFull.jsx), not by RLS.

-- ── Manual cleanup (run deliberately, NOT automatically, until a real
--    scheduled job replaces this) ──────────────────────────────────────
-- SELECT id, name, deleted_at FROM patients
--   WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
-- -- review the above list first, THEN:
-- DELETE FROM patients
--   WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
