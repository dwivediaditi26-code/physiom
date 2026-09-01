-- PhysioMind Pro — Evidence tab: source links + summary/conclusion
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds four columns to research_articles (created by
-- add_evidence_communities.sql):
--   source_url  -- the actual link to the paper/guideline (PubMed, JOSPT, etc.)
--   source_name -- short label for where it lives, e.g. "PubMed", "JOSPT", "BJSM"
--   summary     -- what the study did (design/population/what was measured)
--   conclusion  -- what it found, in clinical terms
-- Before this, every Evidence card's "Read research" button had nowhere to
-- send the reader -- there was no link field on the table at all. This is
-- the fix, plus the two new sections requested for each card.
--
-- Safe to run ahead of the app code that reads these columns, same as every
-- other migration in this folder -- nothing changes behaviour until the
-- matching db.js/EvidencePage/ResearchCard changes ship (they already have,
-- this migration just needs to be run to bring production in sync).

alter table research_articles add column if not exists source_url text not null default '';
alter table research_articles add column if not exists source_name text not null default '';
alter table research_articles add column if not exists summary text not null default '';
alter table research_articles add column if not exists conclusion text not null default '';

-- ── Optional: seed 8 real, verified papers (2 each for MSK / Neuro / Sports
--    / Cardio -- the app's new subject categories) ─────────────────────────
-- Every title/journal/year/link below was checked against the real source
-- before going in here. Skip this block if you'd rather curate your own
-- articles by hand -- without it the app just keeps showing this same set
-- as its built-in demo library (client-side fallback, nothing breaks).
-- Safe to re-run: matching ids get their content refreshed, not duplicated.
insert into research_articles (id, title, journal, type, year, level, category, tags, gradient, source_url, source_name, summary, conclusion) values
  ('ev1', 'Warming-up for the Latest on Diagnosing and Managing Tendinopathy', 'JOSPT', 'Narrative Review', 2023, 'Level 3', 'MSK', '{"Tendinopathy","Diagnosis"}', 'blue',
   'https://www.jospt.org/doi/10.2519/jospt.2023.12440', 'JOSPT',
   'Editorial overview framing a JOSPT evidence update on tendinopathy — persistent tendon pain and dysfunction without the classic inflammatory histopathology seen in acute injury.',
   'Positions tendon load-capacity and clinical reasoning, not imaging findings, as the primary anchor for diagnosis and management planning.'),
  ('ev2', 'The Efficacy of Exercise Therapy for Rotator Cuff–Related Shoulder Pain According to the FITT Principle', 'JOSPT', 'Systematic Review', 2024, 'Level 1', 'MSK', '{"RotatorCuff","ExerciseTherapy"}', 'blue',
   'https://www.jospt.org/doi/10.2519/jospt.2024.12453', 'JOSPT',
   'Systematic review with meta-analyses examining how exercise-therapy dosing — Frequency, Intensity, Time, Type (the FITT principle) — relates to outcomes in rotator cuff-related shoulder pain (RCRSP).',
   'Exercise therapy reduced pain and improved shoulder function in RCRSP across a range of FITT parameters, supporting individualized dosing over any single prescribed protocol.'),
  ('ev3', 'Efficacy of very early mobilization in patients with acute stroke', 'Annals of Palliative Medicine', 'Systematic Review', 2021, 'Level 1', 'Neuro', '{"Stroke","EarlyMobilization"}', 'teal',
   'https://pubmed.ncbi.nlm.nih.gov/34872302/', 'PubMed',
   'Systematic review and meta-analysis pooling trials of very early mobilization (VEM, generally <24–48h post-stroke) against usual-care timing, assessing adverse events, disability, bed-related complications, length of stay, and activities of daily living (ADL).',
   'VEM did not clearly improve disability or ADL outcomes and was linked to more adverse events in some pooled trials — supports individualized mobilization timing rather than a routine very-early protocol for every patient.'),
  ('ev4', 'Efficacy of Early Mobilization in Stroke Patients in Relation to Quality of Life and Level of Dependency', 'PubMed', 'Systematic Review', 2025, 'Level 2', 'Neuro', '{"Stroke","QualityOfLife"}', 'teal',
   'https://pubmed.ncbi.nlm.nih.gov/41517009/', 'PubMed',
   'Systematic review of nine studies assessing early mobilization (24–48h post-stroke) against dependency level and health-related quality of life (HRQoL).',
   'Early mobilization was associated with reduced dependency, but showed no significant improvement in quality-of-life scores — functional gains and perceived quality of life didn''t move together.'),
  ('ev5', 'Fifty-five per cent return to competitive sport following ACL reconstruction surgery', 'British Journal of Sports Medicine', 'Meta-Analysis', 2014, 'Level 1', 'Sports', '{"ACL","ReturnToSport"}', 'violet',
   'https://doi.org/10.1136/bjsports-2013-093398', 'BJSM',
   'Updated systematic review and meta-analysis pooling return-to-sport outcomes after ACL reconstruction, incorporating physical-functioning and psychological/contextual factors.',
   'Only 55% of patients returned to their competitive level of sport — notably lower than general return-to-sport rates — indicating physical recovery alone doesn''t guarantee competitive return; psychological readiness is a significant limiting factor.'),
  ('ev6', 'Provocation With Progressive Loading Is the Most Common Diagnostic Method for Achilles Tendinopathy — 1048 Physiotherapists', 'JOSPT Open', 'Cross-Sectional Study', 2024, 'Level 3', 'Sports', '{"Achilles","Tendinopathy"}', 'violet',
   'https://www.jospt.org/doi/abs/10.2519/josptopen.2024.0080', 'JOSPT',
   'International cross-sectional survey of 1,048 physiotherapists on the diagnostic methods used for Achilles tendinopathy.',
   'Symptom provocation via a series of progressive tendon-loading tests was the most commonly used diagnostic method, rated helpful by 92% of respondents — clinical loading tests, not imaging, dominate real-world diagnosis.'),
  ('ev7', 'Core Components of Cardiac Rehabilitation/Secondary Prevention Programs: 2007 Update', 'Circulation (AHA / AACVPR)', 'Scientific Statement', 2007, 'Level 1', 'Cardio', '{"CardiacRehab","SecondaryPrevention"}', 'rose',
   'https://pubmed.ncbi.nlm.nih.gov/17513578/', 'PubMed',
   'Scientific statement defining the core components required in a cardiac rehabilitation / secondary-prevention program.',
   'Set baseline patient assessment, nutritional counseling, risk-factor management (lipids, blood pressure, weight, diabetes, tobacco), psychosocial intervention, and physical-activity/exercise training as required components — exercise training in isolation does not constitute cardiac rehabilitation.'),
  ('ev8', 'Core Components of Cardiac Rehabilitation Programs: 2024 Update', 'Circulation (AHA / AACVPR)', 'Scientific Statement', 2024, 'Level 1', 'Cardio', '{"CardiacRehab","2024Update"}', 'rose',
   'https://pubmed.ncbi.nlm.nih.gov/39315436/', 'PubMed',
   'Updated scientific statement revising the core-components framework for cardiac rehabilitation programs in light of current evidence.',
   'Reaffirms the same multidisciplinary core-components model while incorporating current evidence — described by the writing group as a substantial progression in the field since the prior update.')
on conflict (id) do update set
  title = excluded.title, journal = excluded.journal, type = excluded.type, year = excluded.year,
  level = excluded.level, category = excluded.category, tags = excluded.tags, gradient = excluded.gradient,
  source_url = excluded.source_url, source_name = excluded.source_name,
  summary = excluded.summary, conclusion = excluded.conclusion;
