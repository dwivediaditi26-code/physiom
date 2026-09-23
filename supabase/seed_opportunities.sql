-- Seed the Explore board with real `opportunities` rows.
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run (see below).
--
-- Why this file exists: `opportunities` was empty in production, so Explore
-- had nothing in it -- nothing to open, save, apply to, or find in search.
-- That blocks the P4/P5/P6/P8 acceptance tests, all of which need at least
-- one real listing to exist. The content is the seven listings the board
-- was designed against (src/physiofeed/data/opportunitiesMock.js), which
-- until now only ever lived in the front end.
--
-- WARNING -- re-running this deletes and recreates the seeded rows. Any
-- applications, saves or chats attached to them are deleted too
-- (applications.opportunity_id is ON DELETE CASCADE). Once you have started
-- testing against these listings, don't re-run it.
--
-- Three deliberate differences from the front-end mock:
--   1. Org names: "AIIMS Delhi" and "Bansal Hospital" are real institutions
--      that did not post these invented roles, so they're renamed to
--      fictional organisations. Roles, locations and clinical detail are
--      unchanged.
--   2. stats.views and stats.chats are 0, not the mock's invented 480/890/
--      720. Fabricated engagement counts displayed as real numbers are the
--      same lie the rest of this app spent P7-P9 removing. The applicant
--      count isn't stored at all -- db.js counts real `applications` rows.
--      (Money note: salary/stipend are stored WITHOUT the rupee sign --
--      OpportunityCard and OpportunityDetail both draw their own rupee
--      icon, so the mock's "₹15,000/mo" rendered a doubled symbol.
--      Workshop `fee` keeps its sign: WorkshopDetail prints it bare.)
--   3. `daysRemaining` is dropped in favour of a real `deadline` date. A
--      stored "14 days left" is wrong two weeks from now; MyPostingsPage
--      simply omits the suffix when it's absent.

begin;

do $$
declare
  v_a uuid;  -- "Dr Aditi Dwivedi"  -- owns the listings you manage as a recruiter
  v_b uuid;  -- "Dr. Aditi"         -- owns the listings you apply to from the other account
begin
  select id into v_a from public.profiles where name = 'Dr Aditi Dwivedi';
  select id into v_b from public.profiles where name = 'Dr. Aditi';

  if v_a is null or v_b is null then
    raise exception 'Could not resolve both seed owners. Found Dr Aditi Dwivedi=%, Dr. Aditi=%. Check the exact names in public.profiles.', v_a, v_b;
  end if;

  -- Idempotency: every row this file writes is tagged details->>'seed'.
  delete from public.opportunities where details->>'seed' = 'true';

  insert into public.opportunities
    (creator_id, org_name, type, title, description, location, location_type, specialty, tags, deadline, status, details)
  values
  -- 1. Sports Physiotherapy Internship -- yours to manage
  (v_a, 'Apex Movement & Performance Rehab', 'internship',
   'Sports Physiotherapy Internship',
   'Gain hands-on experience in sports injury rehabilitation, working alongside senior sports physiotherapists on return-to-sport programs.',
   'Arera Colony, Bhopal', 'On-site', 'Sports', array['Orthopedics','Exercise Science'],
   current_date + 14, 'published',
   jsonb_build_object(
     'seed', true,
     'orgShort', 'Apex Movement Center', 'orgInitials', 'AM', 'orgGradient', 'blue',
     'stipend', '15,000/mo', 'duration', '6 Weeks', 'audience', 'BPT Students', 'certificate', true,
     'highlights', jsonb_build_array('Clinical Experience','Advanced Rehab Techniques','Client Management'),
     'detailHighlights', jsonb_build_array(
        jsonb_build_object('label','Duration','value','6 Weeks'),
        jsonb_build_object('label','Patient load','value','8-10 athletes/day'),
        jsonb_build_object('label','Scope','value','ACL return-to-sport, dynamometry testing')),
     'setup', jsonb_build_array('Force plates','Functional turf track','Hydrotherapy'),
     'mentor', jsonb_build_object('name','Dr. Ankit Mehta, PT','role','Program Director & Senior Sports PT','initials','AM','gradient','violet','bio','MPT (Sports), 10+ years in elite athlete rehabilitation and return-to-play protocols.'),
     'views', 0, 'chats', 0)),

  -- 2. Consultant Neuro-Physiotherapist -- apply to this from your other account
  (v_b, 'SpineCare Neurology Center', 'job',
   'Consultant Neuro-Physiotherapist',
   'Expert required for neuro rehabilitation & patient care in a dedicated spine and neurology setting.',
   'Bhopal, MP', 'On-site', 'Neuro', array['Neurology','Clinical'],
   current_date + 30, 'published',
   jsonb_build_object(
     'seed', true,
     'orgInitials', 'SC', 'orgGradient', 'teal',
     'salary', '70,000 - 90,000/mo', 'employment', 'Full-Time', 'audience', 'MPT / BPT + 2y experience',
     'highlights', jsonb_build_array('Neuro Rehabilitation','Patient Assessment','Team Collaboration'),
     'detailHighlights', jsonb_build_array(
        jsonb_build_object('label','Employment','value','Full-Time'),
        jsonb_build_object('label','Experience','value','2+ years'),
        jsonb_build_object('label','Scope','value','Stroke, spinal cord injury, and post-surgical neuro rehab')),
     'setup', jsonb_build_array('Gait lab','Neuro-rehab suite','EMG biofeedback'),
     'mentor', jsonb_build_object('name','Dr. Ritu Nair, PT','role','Clinical Lead, Neurology','initials','RN','gradient','teal','bio','MPT (Neurology), leads the center''s stroke and spinal rehabilitation program.'),
     'views', 0, 'chats', 0)),

  -- 3. Junior Neuro-Physiotherapist -- yours to manage. Org renamed: was "Bansal Hospital".
  (v_a, 'Sanjeevani Multispecialty Hospital', 'job',
   'Junior Neuro-Physiotherapist',
   'Hospital-based role supporting inpatient and outpatient neuro-rehabilitation caseloads.',
   'Shahpura, Bhopal', 'On-site', 'Neuro', array['Hospital','Neuro'],
   current_date + 22, 'published',
   jsonb_build_object(
     'seed', true,
     'orgInitials', 'SM', 'orgGradient', 'slate',
     'salary', '40,000/mo', 'employment', 'Full-Time', 'audience', 'MPT / BPT + 2y',
     'highlights', jsonb_build_array('Inpatient Rehab','Outpatient Follow-up','Case Documentation'),
     'detailHighlights', jsonb_build_array(
        jsonb_build_object('label','Employment','value','Full-Time'),
        jsonb_build_object('label','Setting','value','Hospital, in- and outpatient'),
        jsonb_build_object('label','Scope','value','Stroke, TBI, and general neuro caseload')),
     'setup', jsonb_build_array('Inpatient ward access','Gait training bay','Hydrotherapy pool'),
     'mentor', jsonb_build_object('name','Dr. Kavya Rao, PT','role','Senior Physiotherapist','initials','KR','gradient','rose','bio','10+ years in hospital-based neuro-rehabilitation.'),
     'views', 0, 'chats', 0)),

  -- 4. Knee OA Meta-Analysis Co-Author. Org renamed: was "AIIMS Delhi".
  (v_b, 'Meridian Institute of Rehabilitation Research', 'collaboration',
   'Knee OA Meta-Analysis Co-Author',
   'Seeking a co-author with strong literature-review experience for a systematic review and meta-analysis on exercise therapy in knee osteoarthritis.',
   'Remote / Hybrid', 'Remote', 'MSK', array['MSK','Research'],
   current_date + 45, 'published',
   jsonb_build_object(
     'seed', true,
     'orgInitials', 'MI', 'orgGradient', 'amber',
     'audience', 'Research experience preferred',
     'highlights', jsonb_build_array('Systematic Review','Data Extraction','Co-authorship'),
     'detailHighlights', jsonb_build_array(
        jsonb_build_object('label','Commitment','value','~5 hrs/week'),
        jsonb_build_object('label','Timeline','value','4 months'),
        jsonb_build_object('label','Scope','value','Screening, data extraction, and manuscript drafting')),
     'mentor', jsonb_build_object('name','Dr. R. Sharma, PT PhD','role','Research Lead, Meridian Institute','initials','RS','gradient','amber','bio','Publishes on musculoskeletal rehabilitation and evidence synthesis.'),
     'views', 0, 'chats', 0)),

  -- 5. Clinical Taping Fundamentals Workshop.
  -- `date` lives in details, not the event_date column: rowToOpportunity()
  -- prefers event_date and would render the raw ISO date where the design
  -- calls for "18 October 2026".
  (v_b, 'PhysioFeed Academy', 'workshop',
   'Clinical Taping Fundamentals Workshop',
   'A hands-on introduction to kinesiology and rigid taping techniques across common MSK presentations.',
   '', 'Remote', 'MSK', array['MSK','Taping'],
   null, 'published',
   jsonb_build_object(
     'seed', true,
     'orgInitials', 'PF', 'orgGradient', 'violet',
     'date', '18 October 2026', 'time', '10:00 AM', 'mode', 'Online', 'fee', '₹499', 'feeNote', 'Early bird',
     'instructor', jsonb_build_object('name','Dr. Sameer Sen, PT','role','Instructor — Sports and Musculoskeletal Physiotherapy','initials','SS','gradient','blue'),
     'syllabus', jsonb_build_array(
        'Introduction to Kinesiology Taping (Principles & Concepts)',
        'Shoulder Stability & Impingement Taping Techniques',
        'Knee Patellar Taping (McConnell and Kinesiology)',
        'Ankle Sprain Prevention and Treatment Taping',
        'Edema and Pain Management Applications'),
     'views', 0, 'chats', 0)),

  -- 6. Pediatric Rehab Summer Internship -- closed, so My Postings has a
  --    past listing to show and Reopen has something to act on.
  (v_a, 'Apex Movement & Performance Rehab', 'internship',
   'Pediatric Rehab Summer Internship',
   'Summer cohort supporting pediatric developmental and neuro-rehab caseloads.',
   'Arera Colony, Bhopal', 'On-site', 'Pediatrics', array['Pediatrics','Neuro'],
   null, 'closed',
   jsonb_build_object(
     'seed', true,
     'orgShort', 'Apex Movement Center', 'orgInitials', 'AM', 'orgGradient', 'blue',
     'stipend', '10,000/mo',
     'mentor', jsonb_build_object('name','Dr. Ankit Mehta, PT','role','Program Director & Senior Sports PT','initials','AM','gradient','violet','bio',''),
     'views', 0, 'chats', 0)),

  -- 7. Outpatient MSK Physiotherapist -- closed. Org renamed: was "Bansal Hospital".
  (v_a, 'Sanjeevani Multispecialty Hospital', 'job',
   'Outpatient MSK Physiotherapist',
   'Outpatient MSK caseload role — position filled.',
   'Shahpura, Bhopal', 'On-site', 'MSK', array['MSK','Hospital'],
   null, 'closed',
   jsonb_build_object(
     'seed', true,
     'orgInitials', 'SM', 'orgGradient', 'slate',
     'salary', '35,000/mo',
     'mentor', jsonb_build_object('name','Dr. Kavya Rao, PT','role','Senior Physiotherapist','initials','KR','gradient','rose','bio',''),
     'views', 0, 'chats', 0));

  raise notice 'Seeded % opportunities (% owned by Dr Aditi Dwivedi, % by Dr. Aditi).',
    (select count(*) from public.opportunities where details->>'seed' = 'true'),
    (select count(*) from public.opportunities where details->>'seed' = 'true' and creator_id = v_a),
    (select count(*) from public.opportunities where details->>'seed' = 'true' and creator_id = v_b);
end $$;

commit;

-- Check it worked:
-- select id, status, type, org_name, title from opportunities order by created_at desc;
