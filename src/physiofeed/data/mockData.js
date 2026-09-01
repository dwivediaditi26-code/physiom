// Seed data for the in-memory store in db.js.
// Field names deliberately mirror the Supabase schema in /supabase/schema.sql
// so swapping the data layer later is a rename, not a redesign.

export const CURRENT_USER = {
  id: "u-self",
  name: "Dr. Aditi Sharma, PT",
  role: "Sports Physiotherapist · Mumbai",
  verified: true,
  gradient: "violet",
  initials: "AS",
  location: "Mumbai, Maharashtra, India",
  bio: "Sports physiotherapist focused on ACL rehabilitation, sports injuries and strength & conditioning. Helping clinicians make evidence-based rehabilitation easier.",
  followers: 1200,
  following: 486,
  quote: "Evidence guides us. Experience shapes us. Compassion drives us.",
  // About-card fields (2026-08-19) -- these keep the demo profile looking
  // exactly like it did before AboutCard.jsx became editable. Real
  // signed-in users get a blank slate instead (see db.js's getProfile()).
  experience: "5+ years of experience",
  languages: "English, Hindi, Marathi",
  memberships: "IAP, WCPT",
  availableForConsults: true,
};

export const INITIAL_POSTS = [
  { id: "p1", authorId: "u-self", author: "Dr. Aditi Sharma, PT", isSelf: true, verified: true,
    role: "Sports Physiotherapist · Mumbai", time: "2h", category: "Techniques",
    media: "image", gradient: "violet", iconName: "Dumbbell",
    heading: "3 changes that reshaped my ACL rehab protocol",
    caption: "Shifted from time-based to criteria-based progression this year — outcomes and confidence both went up.",
    tags: ["ACLRehab", "SportsPhysio", "EvidenceBased"],
    likes: 248, liked: false, saved: false,
    likedByPreview: ["Dr. Rahul Mehta", "Dr. Sarah Chen"],
    commentList: [
      { id: "c1", author: "Dr. Rahul Mehta", text: "Curious what criteria you use for the strength phase." },
      { id: "c2", author: "Dr. Sarah Chen", text: "This matches what we're seeing too." },
    ] },
  { id: "p2", authorId: "u-self", author: "Dr. Aditi Sharma, PT", isSelf: true, verified: true,
    role: "Sports Physiotherapist · Mumbai", time: "1d", category: "Case Studies",
    media: "checklist", gradient: "slate", iconName: "FlaskConical",
    heading: "Hamstring injury: my rehab progression",
    checklist: ["Pain control", "Strengthening", "Neuromuscular control", "Return to sport"],
    caption: "Step-by-step progression for grade II hamstring strains.",
    tags: ["Hamstring", "Rehab", "ReturnToSport"],
    likes: 196, liked: false, saved: false,
    likedByPreview: ["Dr. Kevin Park"],
    commentList: [{ id: "c3", author: "Dr. Kevin Park", text: "Saving this for my next case review." }] },
  { id: "p3", authorId: "u-rahul", author: "Dr. Rahul Mehta, PT", isSelf: false, verified: true, following: false,
    role: "Orthopaedic Physiotherapist · Delhi", time: "2d", category: "Research",
    media: "carousel", gradient: "blue", iconName: "FlaskConical",
    images: [{ gradient: "blue", label: "Before — week 1" }, { gradient: "slate", label: "After — week 8" }],
    heading: "Before/after: 8-week rotator cuff program",
    caption: "Sharing a de-identified case — full protocol in the comments.",
    tags: ["RotatorCuff", "ShoulderRehab"],
    likes: 134, liked: false, saved: false,
    likedByPreview: ["Dr. Aditi Sharma"],
    commentList: [{ id: "c4", author: "Dr. Aditi Sharma", text: "Would you share the loading scheme?" }] },
  { id: "p4", authorId: "u-self", author: "Dr. Aditi Sharma, PT", isSelf: true, verified: true,
    role: "Sports Physiotherapist · Mumbai", time: "3d", category: "Techniques",
    media: "video", duration: "1:24", gradient: "amber", iconName: "Play",
    heading: "Lumbar mobilization — manual therapy walkthrough",
    caption: "A technique breakdown I share with new grads on my team.",
    tags: ["ManualTherapy", "LumbarSpine"],
    likes: 172, liked: false, saved: false,
    likedByPreview: ["Dr. Sarah Chen", "Dr. Imran Ali"],
    commentList: [{ id: "c5", author: "Dr. Imran Ali", text: "Great cueing on the setup." }] },
  { id: "p5", authorId: "u-sarah", author: "Dr. Sarah Chen, PT", isSelf: false, verified: true, following: true,
    role: "Pain Science Educator · Singapore", time: "4d", category: "Research",
    media: "image", gradient: "rose", iconName: "BookOpen",
    heading: "What the latest dry needling review actually says",
    caption: "A shorter, plainer summary of a systematic review I keep getting asked about.",
    tags: ["DryNeedling", "PainScience"],
    likes: 289, liked: false, saved: false,
    likedByPreview: ["Dr. Aditi Sharma", "Dr. Rahul Mehta"],
    commentList: [{ id: "c6", author: "Dr. Aditi Sharma", text: "Sending this to my whole team." }] },
  { id: "p6", authorId: "u-self", author: "Dr. Aditi Sharma, PT", isSelf: true, verified: true,
    role: "Sports Physiotherapist · Mumbai", time: "5d", category: "Education",
    media: "phases", gradient: "teal", iconName: "BarChart3",
    heading: "Return to running after knee injury",
    phases: ["Walk", "Jog", "Run", "Sport"],
    caption: "The framework I use with patients — simple enough to explain in one visit.",
    tags: ["RunningRehab", "KneeInjury", "ReturnToSport"],
    likes: 201, liked: false, saved: false,
    likedByPreview: ["Dr. Kevin Park", "Dr. Maria Silva"], commentList: [] },
  { id: "p7", authorId: "u-self", author: "Dr. Aditi Sharma, PT", isSelf: true, verified: true,
    role: "Sports Physiotherapist · Mumbai", time: "1w", category: "Research",
    media: "image", gradient: "rose", iconName: "BookOpen",
    heading: "What the loading literature says about tendinopathy",
    caption: "A plain-language pass through the evidence I keep getting asked about.",
    tags: ["Tendinopathy", "EvidenceBased"],
    likes: 219, liked: false, saved: false,
    likedByPreview: ["Dr. Rahul Mehta"],
    commentList: [{ id: "c7", author: "Dr. Rahul Mehta", text: "Sharing this with my juniors." }] },
  // The three structured content types below (Case/Research/Poll) exist so
  // the demo feed shows what each one looks like before any real one has
  // been posted -- same "never look empty/broken before the SQL runs"
  // rule as every other demo post here.
  { id: "p8", authorId: "u-wei", author: "Dr. Wei Zhang, PT", isSelf: false, verified: true, following: false,
    role: "Manual Therapy Specialist · Singapore", time: "6h", category: "Case Studies",
    postType: "case", media: "checklist", gradient: "teal", iconName: "Stethoscope",
    heading: "Chronic shoulder pain in a recreational swimmer",
    case: {
      patientAge: "35", patientSex: "Female", patientOccupation: "", patientActivity: "Swimming",
      presentation: "Pain for 6 months, aggravated by overhead activity.",
      assessment: "Reduced overhead ROM, positive Hawkins-Kennedy, weak external rotators on MMT.",
      management: "Rotator cuff strengthening, scapular control drills, gradual return to overhead loading.",
      outcome: "Improved pain and overhead function after 6 weeks.",
      question: "Would you have included a different special test?",
    },
    caption: "Pain for 6 months, aggravated by overhead activity.",
    tags: ["Shoulder", "Swimming", "CaseStudy"],
    likes: 87, liked: false, saved: false, likedByPreview: ["Dr. Sarah Chen"],
    commentList: [{ id: "c8", author: "Dr. Sarah Chen", text: "Would've added an empty can test too, but great writeup." }] },
  { id: "p9", authorId: "u-james", author: "Dr. James Okafor, PT", isSelf: false, verified: true, following: false,
    role: "Sports Physiotherapist · Lagos", time: "10h", category: "Research",
    postType: "research", media: "checklist", gradient: "blue", iconName: "FlaskConical",
    heading: "Progressive loading for Achilles tendinopathy",
    research: {
      type: "Systematic Review", journal: "British Journal of Sports Medicine", year: "2026",
      keyFinding: "Progressive loading protocols outperform passive rest for mid-portion Achilles tendinopathy.",
      takeaway: "I've started front-loading isometrics earlier in the irritable phase.",
      reference: "https://pubmed.ncbi.nlm.nih.gov/",
    },
    caption: "I've started front-loading isometrics earlier in the irritable phase.",
    tags: ["Achilles", "Tendinopathy", "EvidenceBased"],
    likes: 156, liked: false, saved: false, likedByPreview: ["Dr. Aditi Sharma"],
    commentList: [] },
  { id: "p10", authorId: "u-kevin", author: "Dr. Kevin Park, PT", isSelf: false, verified: true, following: false,
    role: "Sports Rehab Specialist · Seoul", time: "1d", category: "Techniques",
    postType: "poll", media: "checklist", gradient: "violet", iconName: "BarChart3",
    heading: "Which outcome measure do you commonly use for knee OA?",
    poll: { options: ["KOOS", "WOMAC", "LEFS", "Other"], counts: [18, 11, 6, 2], total: 37, myVote: null },
    caption: "Which outcome measure do you commonly use for knee OA?",
    tags: ["KneeOA", "OutcomeMeasures"],
    likes: 41, liked: false, saved: false, likedByPreview: [], commentList: [] },
];

// Grouped shape (2026-08-19, real stories feature) -- matches what
// db.js's real getStories() returns (one entry per author, an `items`
// array for however many stories they have up). These five are pure
// decoration though: `items[].mediaUrl` is null since there was never any
// real photo/video behind them, so StoriesBar.jsx knows (via `isDemo`) to
// just flip the ring gray locally on tap instead of opening a viewer with
// nothing to show.
export const STORIES = [
  { authorId: "demo-s2", name: "Rahul Mehta", grad: "blue", avatarUrl: null, isDemo: true, seen: false, items: [{ id: "demo-s2-1", mediaUrl: null, mediaType: "image" }] },
  { authorId: "demo-s3", name: "Sarah Chen", grad: "rose", avatarUrl: null, isDemo: true, seen: false, items: [{ id: "demo-s3-1", mediaUrl: null, mediaType: "image" }] },
  { authorId: "demo-s4", name: "Kevin Park", grad: "teal", avatarUrl: null, isDemo: true, seen: true, items: [{ id: "demo-s4-1", mediaUrl: null, mediaType: "image" }] },
  { authorId: "demo-s5", name: "Maria Silva", grad: "amber", avatarUrl: null, isDemo: true, seen: true, items: [{ id: "demo-s5-1", mediaUrl: null, mediaType: "image" }] },
  { authorId: "demo-s6", name: "Imran Ali", grad: "slate", avatarUrl: null, isDemo: true, seen: false, items: [{ id: "demo-s6-1", mediaUrl: null, mediaType: "image" }] },
];

export const PEOPLE = [
  { id: "u-priya", name: "Dr. Priya Nair", role: "Neuro Physiotherapist", location: "Bengaluru, India", mutual: 12, grad: "rose", following: false },
  { id: "u-james", name: "Dr. James Okafor", role: "Sports Physiotherapist", location: "Lagos, Nigeria", mutual: 7, grad: "blue", following: false },
  { id: "u-wei", name: "Dr. Wei Zhang", role: "Manual Therapy Specialist", location: "Singapore", mutual: 4, grad: "teal", following: false },
  { id: "u-rahul", name: "Dr. Rahul Mehta", role: "Orthopaedic Physiotherapist", location: "Delhi, India", mutual: 9, grad: "blue", following: false },
  { id: "u-sarah", name: "Dr. Sarah Chen", role: "Pain Science Educator", location: "Singapore", mutual: 15, grad: "rose", following: true },
  { id: "u-kevin", name: "Dr. Kevin Park", role: "Sports Rehab Specialist", location: "Seoul, South Korea", mutual: 3, grad: "teal", following: false },
];

// `link` on like/comment (2026-08-27, "like how it happens in Insta") jumps
// straight to the post that was liked/commented on -- postId matches
// INITIAL_POSTS above (p1 = the ACL rehab post, p2 = the hamstring post).
// FeedPage.jsx reads /feed?post=<id> and opens PostDetailModal.jsx for it.
// Same behaviour real accounts get from getNotifications() in db.js, once
// add_notification_post_id.sql is applied server-side.
export const NOTIFICATIONS = [
  { id: "n1", iconName: "Heart", text: "Dr. Rahul Mehta liked your post on ACL rehab", time: "12m", tone: "text-rose-500", link: "/feed?post=p1" },
  { id: "n2", iconName: "MessageCircle", text: "Dr. Sarah Chen commented on your hamstring post", time: "1h", tone: "text-violet-600", link: "/feed?post=p2" },
  { id: "n3", iconName: "UserPlus", text: "Dr. Maria Silva started following you", time: "3h", tone: "text-blue-500" },
  { id: "n4", iconName: "BookOpen", text: "New research added in ACL rehabilitation", time: "6h", tone: "text-emerald-600", link: "/evidence" },
];

export const EXERCISES = [
  { id: "e1", title: "Single Leg Squat", subtitle: "Strength", grad: "violet", likes: 142 },
  { id: "e2", title: "Step Down", subtitle: "Knee Control", grad: "slate", likes: 128 },
  { id: "e3", title: "Clamshell", subtitle: "Hip Strength", grad: "rose", likes: 112 },
  { id: "e4", title: "Calf Raise", subtitle: "Strength", grad: "teal", likes: 98 },
];

// "demo-" prefixed ids (2026-08-19, education/achievements editing feature)
// mark these as placeholder rows -- db.js's addEducationEntry() etc. only
// ever produce real numeric ids from the education_entries/achievements
// tables, so a stable string prefix here is enough for the UI to tell "can
// this be edited for real" apart from "still showing the placeholder list"
// without a separate flag.
export const EDUCATION = [
  { id: "demo-edu-1", title: "MPT — Orthopaedics", subtitle: "XYZ University, India", iconName: "GraduationCap" },
  { id: "demo-edu-2", title: "BPT — Physiotherapy", subtitle: "ABC College of Physiotherapy", iconName: "GraduationCap" },
  { id: "demo-edu-3", title: "Certified Manual Therapist", subtitle: "IASTM — Level 1 & 2", iconName: "Award" },
  { id: "demo-edu-4", title: "Dry Needling — Level 1", subtitle: "Kinetacore", iconName: "Award" },
];

export const ACHIEVEMENTS = [
  { id: "demo-ach-1", title: "Top Contributor", subtitle: "PhysioLink Community · 2024", iconName: "Trophy", tone: "text-amber-500" },
  { id: "demo-ach-2", title: "Research Contributor", subtitle: "5+ research posts published", iconName: "Award", tone: "text-violet-600" },
  { id: "demo-ach-3", title: "Most Helpful Physio", subtitle: "Top rated by peers", iconName: "Star", tone: "text-rose-500" },
];

export const EXPERTISE = [
  { name: "Sports Rehabilitation", stars: 5, endorsed: false, count: 32 },
  { name: "ACL Rehabilitation", stars: 5, endorsed: false, count: 28 },
  { name: "Manual Therapy", stars: 4, endorsed: false, count: 19 },
  { name: "Strength & Conditioning", stars: 5, endorsed: false, count: 24 },
  { name: "Neuro Rehabilitation", stars: 4.5, endorsed: false, count: 11 },
  { name: "Exercise Prescription", stars: 5, endorsed: false, count: 21 },
  { name: "Pain Management", stars: 4, endorsed: false, count: 9 },
];

// Real, verified papers (2026-09-01, Evidence tab redesign) -- title/journal/
// year/URL all checked against the actual source before going in here, not
// invented. category is one of the four subjects the Evidence tab now
// filters by (MSK/Neuro/Sports/Cardio); sourceUrl+sourceName back the "Read
// on <site>" link on ResearchCard.jsx, summary+conclusion are its two new
// sections. This is what a signed-out visitor (or any visitor before the
// research_articles table has real rows -- see add_evidence_source_and_summary.sql)
// sees, same "never look empty" fallback every other PhysioFeed list uses.
export const EVIDENCE = [
  { id: "ev1", title: "Warming-up for the Latest on Diagnosing and Managing Tendinopathy", journal: "JOSPT", type: "Narrative Review", year: 2023, level: "Level 3", category: "MSK", tags: ["Tendinopathy", "Diagnosis"], grad: "blue", saved: false,
    sourceUrl: "https://www.jospt.org/doi/10.2519/jospt.2023.12440", sourceName: "JOSPT",
    summary: "Editorial overview framing a JOSPT evidence update on tendinopathy — persistent tendon pain and dysfunction without the classic inflammatory histopathology seen in acute injury.",
    conclusion: "Positions tendon load-capacity and clinical reasoning, not imaging findings, as the primary anchor for diagnosis and management planning." },
  { id: "ev2", title: "The Efficacy of Exercise Therapy for Rotator Cuff–Related Shoulder Pain According to the FITT Principle", journal: "JOSPT", type: "Systematic Review", year: 2024, level: "Level 1", category: "MSK", tags: ["RotatorCuff", "ExerciseTherapy"], grad: "blue", saved: false,
    sourceUrl: "https://www.jospt.org/doi/10.2519/jospt.2024.12453", sourceName: "JOSPT",
    summary: "Systematic review with meta-analyses examining how exercise-therapy dosing — Frequency, Intensity, Time, Type (the FITT principle) — relates to outcomes in rotator cuff-related shoulder pain (RCRSP).",
    conclusion: "Exercise therapy reduced pain and improved shoulder function in RCRSP across a range of FITT parameters, supporting individualized dosing over any single prescribed protocol." },
  { id: "ev3", title: "Efficacy of very early mobilization in patients with acute stroke", journal: "Annals of Palliative Medicine", type: "Systematic Review", year: 2021, level: "Level 1", category: "Neuro", tags: ["Stroke", "EarlyMobilization"], grad: "teal", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/34872302/", sourceName: "PubMed",
    summary: "Systematic review and meta-analysis pooling trials of very early mobilization (VEM, generally <24–48h post-stroke) against usual-care timing, assessing adverse events, disability, bed-related complications, length of stay, and activities of daily living (ADL).",
    conclusion: "VEM did not clearly improve disability or ADL outcomes and was linked to more adverse events in some pooled trials — supports individualized mobilization timing rather than a routine very-early protocol for every patient." },
  { id: "ev4", title: "Efficacy of Early Mobilization in Stroke Patients in Relation to Quality of Life and Level of Dependency", journal: "PubMed", type: "Systematic Review", year: 2025, level: "Level 2", category: "Neuro", tags: ["Stroke", "QualityOfLife"], grad: "teal", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41517009/", sourceName: "PubMed",
    summary: "Systematic review of nine studies assessing early mobilization (24–48h post-stroke) against dependency level and health-related quality of life (HRQoL).",
    conclusion: "Early mobilization was associated with reduced dependency, but showed no significant improvement in quality-of-life scores — functional gains and perceived quality of life didn't move together." },
  { id: "ev5", title: "Fifty-five per cent return to competitive sport following ACL reconstruction surgery", journal: "British Journal of Sports Medicine", type: "Meta-Analysis", year: 2014, level: "Level 1", category: "Sports", tags: ["ACL", "ReturnToSport"], grad: "violet", saved: false,
    sourceUrl: "https://doi.org/10.1136/bjsports-2013-093398", sourceName: "BJSM",
    summary: "Updated systematic review and meta-analysis pooling return-to-sport outcomes after ACL reconstruction, incorporating physical-functioning and psychological/contextual factors.",
    conclusion: "Only 55% of patients returned to their competitive level of sport — notably lower than general return-to-sport rates — indicating physical recovery alone doesn't guarantee competitive return; psychological readiness is a significant limiting factor." },
  { id: "ev6", title: "Provocation With Progressive Loading Is the Most Common Diagnostic Method for Achilles Tendinopathy — 1048 Physiotherapists", journal: "JOSPT Open", type: "Cross-Sectional Study", year: 2024, level: "Level 3", category: "Sports", tags: ["Achilles", "Tendinopathy"], grad: "violet", saved: false,
    sourceUrl: "https://www.jospt.org/doi/abs/10.2519/josptopen.2024.0080", sourceName: "JOSPT",
    summary: "International cross-sectional survey of 1,048 physiotherapists on the diagnostic methods used for Achilles tendinopathy.",
    conclusion: "Symptom provocation via a series of progressive tendon-loading tests was the most commonly used diagnostic method, rated helpful by 92% of respondents — clinical loading tests, not imaging, dominate real-world diagnosis." },
  { id: "ev7", title: "Core Components of Cardiac Rehabilitation/Secondary Prevention Programs: 2007 Update", journal: "Circulation (AHA / AACVPR)", type: "Scientific Statement", year: 2007, level: "Level 1", category: "Cardio", tags: ["CardiacRehab", "SecondaryPrevention"], grad: "rose", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/17513578/", sourceName: "PubMed",
    summary: "Scientific statement defining the core components required in a cardiac rehabilitation / secondary-prevention program.",
    conclusion: "Set baseline patient assessment, nutritional counseling, risk-factor management (lipids, blood pressure, weight, diabetes, tobacco), psychosocial intervention, and physical-activity/exercise training as required components — exercise training in isolation does not constitute cardiac rehabilitation." },
  { id: "ev8", title: "Core Components of Cardiac Rehabilitation Programs: 2024 Update", journal: "Circulation (AHA / AACVPR)", type: "Scientific Statement", year: 2024, level: "Level 1", category: "Cardio", tags: ["CardiacRehab", "2024Update"], grad: "rose", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/39315436/", sourceName: "PubMed",
    summary: "Updated scientific statement revising the core-components framework for cardiac rehabilitation programs in light of current evidence.",
    conclusion: "Reaffirms the same multidisciplinary core-components model while incorporating current evidence — described by the writing group as a substantial progression in the field since the prior update." },
  // Batch 2 (2026-09-01, "I add more now" -- Aditi asked for more of each
  // subject). Same rule as batch 1: every title/journal/year/URL checked
  // against the real source, nothing invented.
  { id: "ev9", title: "Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021", journal: "JOSPT", type: "Clinical Practice Guideline", year: 2021, level: "Level 1", category: "MSK", tags: ["LowBackPain", "ClinicalGuideline"], grad: "blue", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/34719942/", sourceName: "PubMed",
    summary: "Clinical practice guideline update from the Academy of Orthopaedic Physical Therapy (APTA), synthesizing evidence on non-pharmacologic interventions physical therapists deliver for acute and chronic low back pain (LBP).",
    conclusion: "Recommends exercise therapy, manual therapy, and patient education as first-line physical therapy management for LBP, with recommendation strength varying by intervention and by acute vs. chronic presentation." },
  { id: "ev10", title: "Effectiveness of exercise therapy in patients with knee osteoarthritis: an overview of systematic reviews", journal: "PubMed", type: "Overview of Reviews", year: 2025, level: "Level 2", category: "MSK", tags: ["KneeOA", "ExerciseTherapy"], grad: "blue", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/40669904/", sourceName: "PubMed",
    summary: "Overview (review-of-reviews) synthesizing systematic reviews on exercise therapy for knee osteoarthritis, evaluating both patient outcomes and the methodological quality of the underlying evidence base.",
    conclusion: "63.7% of the included reviews found exercise therapy improved outcomes, led by muscle-strengthening and aerobic exercise — but 87.4% of those reviews were themselves rated critically low quality, so the positive signal is real but the evidence base underneath it is weak." },
  { id: "ev11", title: "Parkinson's disease and intensive exercise therapy — a systematic review and meta-analysis of randomized controlled trials", journal: "PubMed", type: "Meta-Analysis", year: 2015, level: "Level 1", category: "Neuro", tags: ["Parkinsons", "ExerciseTherapy"], grad: "teal", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25936252/", sourceName: "PubMed",
    summary: "Systematic review and meta-analysis of randomized controlled trials evaluating intensive exercise therapy in Parkinson's disease (PD).",
    conclusion: "Intensive exercise therapy is feasible and safe in PD, with beneficial effects on motor symptom severity." },
  { id: "ev12", title: "Effect of Physiotherapy Interventions on Motor Symptoms in People With Parkinson's Disease: A Systematic Review and Meta-Analysis", journal: "PubMed", type: "Systematic Review", year: 2023, level: "Level 1", category: "Neuro", tags: ["Parkinsons", "MotorSymptoms"], grad: "teal", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/37070664/", sourceName: "PubMed",
    summary: "Systematic review and meta-analysis comparing physiotherapy modalities — strength training, mind-body exercise, aerobic exercise, and non-invasive brain stimulation — for motor symptoms in Parkinson's disease.",
    conclusion: "Exercise-based physiotherapy (strength training, mind-body exercise, aerobic exercise) improved motor symptoms and outperformed non-invasive brain stimulation and acupuncture, supporting exercise as the preferred modality for PD motor symptoms." },
  { id: "ev13", title: "Why methods matter in a meta-analysis: a reappraisal showed inconclusive injury preventive effect of Nordic hamstring exercise", journal: "PubMed", type: "Meta-Analysis", year: 2021, level: "Level 2", category: "Sports", tags: ["HamstringInjury", "NordicExercise"], grad: "violet", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/34520846/", sourceName: "PubMed",
    summary: "Methodological reappraisal re-analyzing the trials behind earlier meta-analyses on the Nordic hamstring exercise's effect on hamstring injury prevention.",
    conclusion: "When appropriate meta-analytic methods are applied, the injury-preventive effect of the Nordic hamstring exercise is inconclusive — a caution against over-interpreting the ~50% risk-reduction figure commonly cited from earlier reviews." },
  { id: "ev14", title: "Effectiveness of Injury Prevention Programs With Core Muscle Strengthening Exercises to Reduce the Incidence of Hamstring Injury Among Soccer Players: A Systematic Review and Meta-Analysis", journal: "PubMed", type: "Meta-Analysis", year: 2023, level: "Level 1", category: "Sports", tags: ["HamstringInjury", "InjuryPrevention"], grad: "violet", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/37139743/", sourceName: "PubMed",
    summary: "Systematic review and meta-analysis of injury-prevention programs combining core muscle strengthening with other exercises to reduce hamstring injury incidence in soccer players.",
    conclusion: "Core-strengthening-based prevention programs meaningfully reduced hamstring injury incidence in soccer players, supporting their inclusion in athlete conditioning alongside eccentric hamstring work." },
  { id: "ev15", title: "Pulmonary Rehabilitation: Joint ACCP/AACVPR Evidence-Based Clinical Practice Guidelines", journal: "PubMed", type: "Clinical Practice Guideline", year: 2007, level: "Level 1", category: "Cardio", tags: ["PulmonaryRehab", "COPD"], grad: "rose", saved: false,
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/17494825/", sourceName: "PubMed",
    summary: "Joint clinical practice guideline from the American College of Chest Physicians (ACCP) and AACVPR on pulmonary rehabilitation for chronic lung disease.",
    conclusion: "Established pulmonary rehabilitation, centered on structured exercise training, as an evidence-based standard of care for COPD and other chronic lung diseases." },
  { id: "ev16", title: "Pulmonary rehabilitation for chronic obstructive pulmonary disease", journal: "Cochrane Database of Systematic Reviews", type: "Systematic Review", year: 2015, level: "Level 1", category: "Cardio", tags: ["PulmonaryRehab", "COPD"], grad: "rose", saved: false,
    sourceUrl: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003793.pub3/full", sourceName: "Cochrane",
    summary: "Cochrane systematic review pooling randomized controlled trials of pulmonary rehabilitation programs (exercise training, with or without education/psychosocial support) versus usual care in COPD.",
    conclusion: "Pulmonary rehabilitation significantly improved health-related quality of life and exercise capacity in COPD, rated among the highest-quality evidence in respiratory rehabilitation." },
];

export const COMMUNITIES = [
  { id: "cm1", name: "Sports Physiotherapy", members: 4820, grad: "violet", joined: true, desc: "Return-to-sport protocols, injury prevention, and performance rehab." },
  { id: "cm2", name: "Neuro Physiotherapy", members: 2310, grad: "teal", joined: false, desc: "Stroke, spinal cord injury, and neurodegenerative rehab discussion." },
  { id: "cm3", name: "Manual Therapy", members: 3105, grad: "blue", joined: false, desc: "Joint mobilization, soft tissue technique, and hands-on practice." },
  { id: "cm4", name: "Women's Health", members: 1540, grad: "rose", joined: false, desc: "Pelvic health, pre/postnatal care, and pelvic floor rehab." },
  { id: "cm5", name: "Students", members: 6210, grad: "amber", joined: true, desc: "For DPT/BPT students — study groups, case discussion, mentorship." },
  { id: "cm6", name: "Geriatric Physiotherapy", members: 980, grad: "slate", joined: false, desc: "Fall prevention, mobility, and healthy aging." },
];
