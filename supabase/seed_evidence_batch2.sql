-- PhysioMind Pro — Evidence tab: second batch of real articles
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds 8 more real, verified papers to research_articles (2 each for
-- MSK/Neuro/Sports/Cardio, on top of the first 8 from
-- add_evidence_source_and_summary.sql) -- low back pain, knee
-- osteoarthritis, Parkinson's disease, hamstring injury prevention, and
-- pulmonary rehab. Every title/journal/year/link was checked against the
-- real source before going in here.
--
-- No schema change needed -- source_url/source_name/summary/conclusion
-- already exist from the first migration. Safe to re-run: matching ids
-- get their content refreshed, not duplicated.

insert into research_articles (id, title, journal, type, year, level, category, tags, gradient, source_url, source_name, summary, conclusion) values
  ('ev9', 'Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021', 'JOSPT', 'Clinical Practice Guideline', 2021, 'Level 1', 'MSK', '{"LowBackPain","ClinicalGuideline"}', 'blue',
   'https://pubmed.ncbi.nlm.nih.gov/34719942/', 'PubMed',
   'Clinical practice guideline update from the Academy of Orthopaedic Physical Therapy (APTA), synthesizing evidence on non-pharmacologic interventions physical therapists deliver for acute and chronic low back pain (LBP).',
   'Recommends exercise therapy, manual therapy, and patient education as first-line physical therapy management for LBP, with recommendation strength varying by intervention and by acute vs. chronic presentation.'),
  ('ev10', 'Effectiveness of exercise therapy in patients with knee osteoarthritis: an overview of systematic reviews', 'PubMed', 'Overview of Reviews', 2025, 'Level 2', 'MSK', '{"KneeOA","ExerciseTherapy"}', 'blue',
   'https://pubmed.ncbi.nlm.nih.gov/40669904/', 'PubMed',
   'Overview (review-of-reviews) synthesizing systematic reviews on exercise therapy for knee osteoarthritis, evaluating both patient outcomes and the methodological quality of the underlying evidence base.',
   '63.7% of the included reviews found exercise therapy improved outcomes, led by muscle-strengthening and aerobic exercise — but 87.4% of those reviews were themselves rated critically low quality, so the positive signal is real but the evidence base underneath it is weak.'),
  ('ev11', 'Parkinson''s disease and intensive exercise therapy — a systematic review and meta-analysis of randomized controlled trials', 'PubMed', 'Meta-Analysis', 2015, 'Level 1', 'Neuro', '{"Parkinsons","ExerciseTherapy"}', 'teal',
   'https://pubmed.ncbi.nlm.nih.gov/25936252/', 'PubMed',
   'Systematic review and meta-analysis of randomized controlled trials evaluating intensive exercise therapy in Parkinson''s disease (PD).',
   'Intensive exercise therapy is feasible and safe in PD, with beneficial effects on motor symptom severity.'),
  ('ev12', 'Effect of Physiotherapy Interventions on Motor Symptoms in People With Parkinson''s Disease: A Systematic Review and Meta-Analysis', 'PubMed', 'Systematic Review', 2023, 'Level 1', 'Neuro', '{"Parkinsons","MotorSymptoms"}', 'teal',
   'https://pubmed.ncbi.nlm.nih.gov/37070664/', 'PubMed',
   'Systematic review and meta-analysis comparing physiotherapy modalities — strength training, mind-body exercise, aerobic exercise, and non-invasive brain stimulation — for motor symptoms in Parkinson''s disease.',
   'Exercise-based physiotherapy (strength training, mind-body exercise, aerobic exercise) improved motor symptoms and outperformed non-invasive brain stimulation and acupuncture, supporting exercise as the preferred modality for PD motor symptoms.'),
  ('ev13', 'Why methods matter in a meta-analysis: a reappraisal showed inconclusive injury preventive effect of Nordic hamstring exercise', 'PubMed', 'Meta-Analysis', 2021, 'Level 2', 'Sports', '{"HamstringInjury","NordicExercise"}', 'violet',
   'https://pubmed.ncbi.nlm.nih.gov/34520846/', 'PubMed',
   'Methodological reappraisal re-analyzing the trials behind earlier meta-analyses on the Nordic hamstring exercise''s effect on hamstring injury prevention.',
   'When appropriate meta-analytic methods are applied, the injury-preventive effect of the Nordic hamstring exercise is inconclusive — a caution against over-interpreting the ~50% risk-reduction figure commonly cited from earlier reviews.'),
  ('ev14', 'Effectiveness of Injury Prevention Programs With Core Muscle Strengthening Exercises to Reduce the Incidence of Hamstring Injury Among Soccer Players: A Systematic Review and Meta-Analysis', 'PubMed', 'Meta-Analysis', 2023, 'Level 1', 'Sports', '{"HamstringInjury","InjuryPrevention"}', 'violet',
   'https://pubmed.ncbi.nlm.nih.gov/37139743/', 'PubMed',
   'Systematic review and meta-analysis of injury-prevention programs combining core muscle strengthening with other exercises to reduce hamstring injury incidence in soccer players.',
   'Core-strengthening-based prevention programs meaningfully reduced hamstring injury incidence in soccer players, supporting their inclusion in athlete conditioning alongside eccentric hamstring work.'),
  ('ev15', 'Pulmonary Rehabilitation: Joint ACCP/AACVPR Evidence-Based Clinical Practice Guidelines', 'PubMed', 'Clinical Practice Guideline', 2007, 'Level 1', 'Cardio', '{"PulmonaryRehab","COPD"}', 'rose',
   'https://pubmed.ncbi.nlm.nih.gov/17494825/', 'PubMed',
   'Joint clinical practice guideline from the American College of Chest Physicians (ACCP) and AACVPR on pulmonary rehabilitation for chronic lung disease.',
   'Established pulmonary rehabilitation, centered on structured exercise training, as an evidence-based standard of care for COPD and other chronic lung diseases.'),
  ('ev16', 'Pulmonary rehabilitation for chronic obstructive pulmonary disease', 'Cochrane Database of Systematic Reviews', 'Systematic Review', 2015, 'Level 1', 'Cardio', '{"PulmonaryRehab","COPD"}', 'rose',
   'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003793.pub3/full', 'Cochrane',
   'Cochrane systematic review pooling randomized controlled trials of pulmonary rehabilitation programs (exercise training, with or without education/psychosocial support) versus usual care in COPD.',
   'Pulmonary rehabilitation significantly improved health-related quality of life and exercise capacity in COPD, rated among the highest-quality evidence in respiratory rehabilitation.')
on conflict (id) do update set
  title = excluded.title, journal = excluded.journal, type = excluded.type, year = excluded.year,
  level = excluded.level, category = excluded.category, tags = excluded.tags, gradient = excluded.gradient,
  source_url = excluded.source_url, source_name = excluded.source_name,
  summary = excluded.summary, conclusion = excluded.conclusion;
