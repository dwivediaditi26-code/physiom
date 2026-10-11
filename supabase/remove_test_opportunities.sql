-- Remove the test and sample listings from the Explore -> Opportunities board.
-- Run in Supabase Dashboard -> SQL Editor, one step at a time.
--
-- Why this file exists: listings made for testing are still on the live board,
-- where students can see them and press Apply / Register. Two groups:
--   1. Test listings whose title starts with "TEST" and contains "please
--      ignore" (a job, a workshop and a collaboration).
--   2. The sample listings written by supabase/seed_opportunities.sql. Every
--      row that file writes is tagged details->>'seed' = 'true', and the
--      organisations in them (Sanjeevani, Meridian, PhysioFeed Academy, Apex,
--      SpineCare, ...) are invented.
--
-- This does exactly what the app's own Delete button does (db.js
-- deleteOpportunity sets deleted_at, and the board's SELECT policy hides any
-- row that has it). Nothing is erased, so applications and saves attached to
-- these listings are kept. To bring one back, run
--   update public.opportunities set deleted_at = null where id = '<its id>';
--
-- Do NOT re-run seed_opportunities.sql afterwards: it recreates the sample
-- listings.

-- STEP 1 -- preview. Should list only the test and sample listings.
select id, type, org_name, title, status, created_at
from public.opportunities
where deleted_at is null
  and (title ilike 'TEST%please ignore%' or details->>'seed' = 'true')
order by created_at;

-- STEP 2 -- remove them from the board (run only if step 1 looked right).
update public.opportunities
set deleted_at = now()
where deleted_at is null
  and (title ilike 'TEST%please ignore%' or details->>'seed' = 'true')
returning id, type, org_name, title;

-- STEP 3 -- check. Should return no rows.
select id, type, org_name, title
from public.opportunities
where deleted_at is null
  and (title ilike 'TEST%please ignore%' or details->>'seed' = 'true');
