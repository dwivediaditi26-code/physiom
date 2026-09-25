-- PhysioMind Pro — fill in a complete demo profile for one real account
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Purpose-built to exercise the 2026-09-24 single-scroll profile redesign
-- end to end: fills profiles + education_entries + rotations +
-- achievements + publications + contributions for ONE real signed-up
-- user, so every section on the profile page (About, Current Role,
-- Education, Experience, Certifications, Research, Professional
-- Evidence) renders real data instead of an empty/"+ Add" state.
--
-- STEP 1 (required): replace the email below with the address you use to
-- sign in to PhysioMind/PhysioFeed -- this looks the row up in
-- auth.users, it does NOT create a new login.
--
-- Safe to run more than once: the profiles row is upserted (ON CONFLICT
-- DO UPDATE) and every list table is cleared for this user first, so
-- re-running just refreshes the same demo content rather than
-- duplicating rows.

do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'REPLACE_WITH_YOUR_LOGIN_EMAIL';

  if v_uid is null then
    raise exception 'No auth user found for that email -- open Authentication > Users in the Supabase dashboard, copy the exact email you sign in with, and edit this script.';
  end if;

  -- Profile header + About + Clinical fields
  insert into profiles (
    id, name, role, verified, gradient, initials, location, bio, quote,
    headline, clinical_title, college, open_to_work, willing_to_relocate,
    skills, area_of_practice, clinical_interests, research_interests
  )
  values (
    v_uid, 'Dr Aditi Dwivedi', 'Physiotherapist', false, 'violet', 'AD', 'Indore, India',
    'Physiotherapist interested in musculoskeletal rehabilitation and evidence-based clinical practice.',
    'Movement. Function. Better Lives.',
    'Helping patients return to pain-free, confident movement.',
    'Musculoskeletal Physiotherapist',
    'RGPV University, Bhopal',
    true, false,
    array['Manual Therapy', 'Exercise Prescription', 'Postural Analysis'],
    array['Musculoskeletal Rehab', 'Sports Physiotherapy'],
    array['Manual Therapy', 'Postural Analysis'],
    array['Musculoskeletal Rehab', 'Manual Therapy', 'Postural Analysis']
  )
  on conflict (id) do update set
    name = excluded.name, role = excluded.role, gradient = excluded.gradient,
    initials = excluded.initials, location = excluded.location, bio = excluded.bio,
    quote = excluded.quote, headline = excluded.headline, clinical_title = excluded.clinical_title,
    college = excluded.college, open_to_work = excluded.open_to_work,
    willing_to_relocate = excluded.willing_to_relocate, skills = excluded.skills,
    area_of_practice = excluded.area_of_practice, clinical_interests = excluded.clinical_interests,
    research_interests = excluded.research_interests, updated_at = now();

  -- Education
  delete from education_entries where user_id = v_uid;
  insert into education_entries (user_id, title, subtitle, icon_name, month, year) values
    (v_uid, 'Master of Physiotherapy (Musculoskeletal)', 'XYZ College of Physiotherapy', 'GraduationCap', 'June', '2024'),
    (v_uid, 'Bachelor of Physiotherapy (BPT)', 'ABC College of Physiotherapy', 'GraduationCap', 'May', '2021');

  -- Experience (rotations table -- "<Title> — <Organization>" / "<Start> – <End or Present>" convention)
  delete from rotations where user_id = v_uid;
  insert into rotations (user_id, department, duration) values
    (v_uid, 'Physiotherapist — ABC Hospital', 'Jan 2024 – Present'),
    (v_uid, 'Physiotherapy Intern — XYZ Hospital', 'Jun 2023 – Dec 2023');

  -- Certifications
  delete from achievements where user_id = v_uid;
  insert into achievements (user_id, title, subtitle, icon_name, tone, issuer, year, month, credential_id, verified) values
    (v_uid, 'Manual Therapy Certification', 'Mulligan Concept · 2023', 'ShieldCheck', 'text-violet-600', 'Mulligan Concept', '2023', '', '', false),
    (v_uid, 'Basic Life Support (BLS)', 'American Heart Association · 2022', 'Award', 'text-rose-500', 'American Heart Association', '2022', '', '', false);

  -- Research / publications
  delete from publications where user_id = v_uid;
  insert into publications (user_id, title, journal, year, authors, doi_url) values
    (v_uid, 'Effect of Exercise Therapy on Chronic Low Back Pain', 'Journal of Physiotherapy Research', '2024', 'Aditi Dwivedi, et al.', ''),
    (v_uid, 'Role of Core Stability in Postural Control', 'Poster Presentation — National Physiotherapy Conference', '2024', '', '');

  -- Professional Evidence / contributions
  delete from contributions where user_id = v_uid;
  insert into contributions (user_id, type, title, year, location) values
    (v_uid, 'Workshop', 'Workshop on Sports Rehabilitation', '2023', 'Indian Association of Physiotherapists'),
    (v_uid, 'Guest Lecture', 'Ergonomics in Clinical Practice', '2024', 'XYZ College of Physiotherapy');

end $$;
