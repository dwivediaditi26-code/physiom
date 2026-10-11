-- Remove the leftover test listings from the Explore -> Opportunities board.
-- Run in Supabase Dashboard -> SQL Editor, one step at a time.
--
-- Why this file exists: three listings made while testing are still on the
-- live board, where students can see them and press Apply / Register:
--   * "TEST - please ignore (Job pass-withdraw-delete)"   (Test Clinic B)
--   * "TEST - please ignore (Workshop cover image)"       (Dr Aditi Dwivedi)
--   * "TEST - please ignore (Collab connect)"             (Dr Aditi Dwivedi)
--
-- This does exactly what the app's own Delete button does (db.js
-- deleteOpportunity sets deleted_at, and the board's SELECT policy hides any
-- row that has it). Nothing is erased: to bring a listing back, run
--   update public.opportunities set deleted_at = null where id = '<its id>';
--
-- It only touches rows whose title starts with TEST and contains
-- "please ignore", so the seeded sample listings (supabase/seed_opportunities.sql)
-- are not affected.

-- STEP 1 -- preview. Should list the three test listings and nothing else.
select id, type, title, status, created_at
from public.opportunities
where title ilike 'TEST%please ignore%'
  and deleted_at is null
order by created_at;

-- STEP 2 -- remove them from the board (run only if step 1 looked right).
update public.opportunities
set deleted_at = now()
where title ilike 'TEST%please ignore%'
  and deleted_at is null
returning id, type, title;

-- STEP 3 -- check. Should return no rows.
select id, type, title
from public.opportunities
where title ilike 'TEST%please ignore%'
  and deleted_at is null;
