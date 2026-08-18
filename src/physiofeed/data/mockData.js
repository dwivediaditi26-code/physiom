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

export const STORIES = [
  { id: "s2", name: "Rahul Mehta", grad: "blue", seen: false },
  { id: "s3", name: "Sarah Chen", grad: "rose", seen: false },
  { id: "s4", name: "Kevin Park", grad: "teal", seen: true },
  { id: "s5", name: "Maria Silva", grad: "amber", seen: true },
  { id: "s6", name: "Imran Ali", grad: "slate", seen: false },
];

export const PEOPLE = [
  { id: "u-priya", name: "Dr. Priya Nair", role: "Neuro Physiotherapist", location: "Bengaluru, India", mutual: 12, grad: "rose", following: false },
  { id: "u-james", name: "Dr. James Okafor", role: "Sports Physiotherapist", location: "Lagos, Nigeria", mutual: 7, grad: "blue", following: false },
  { id: "u-wei", name: "Dr. Wei Zhang", role: "Manual Therapy Specialist", location: "Singapore", mutual: 4, grad: "teal", following: false },
  { id: "u-rahul", name: "Dr. Rahul Mehta", role: "Orthopaedic Physiotherapist", location: "Delhi, India", mutual: 9, grad: "blue", following: false },
  { id: "u-sarah", name: "Dr. Sarah Chen", role: "Pain Science Educator", location: "Singapore", mutual: 15, grad: "rose", following: true },
  { id: "u-kevin", name: "Dr. Kevin Park", role: "Sports Rehab Specialist", location: "Seoul, South Korea", mutual: 3, grad: "teal", following: false },
];

export const NOTIFICATIONS = [
  { id: "n1", iconName: "Heart", text: "Dr. Rahul Mehta liked your post on ACL rehab", time: "12m", tone: "text-rose-500" },
  { id: "n2", iconName: "MessageCircle", text: "Dr. Sarah Chen commented on your hamstring post", time: "1h", tone: "text-violet-600" },
  { id: "n3", iconName: "UserPlus", text: "Dr. Maria Silva started following you", time: "3h", tone: "text-blue-500" },
  { id: "n4", iconName: "BookOpen", text: "New research added in ACL rehabilitation", time: "6h", tone: "text-emerald-600" },
];

export const EXERCISES = [
  { id: "e1", title: "Single Leg Squat", subtitle: "Strength", grad: "violet", likes: 142 },
  { id: "e2", title: "Step Down", subtitle: "Knee Control", grad: "slate", likes: 128 },
  { id: "e3", title: "Clamshell", subtitle: "Hip Strength", grad: "rose", likes: 112 },
  { id: "e4", title: "Calf Raise", subtitle: "Strength", grad: "teal", likes: 98 },
];

export const EDUCATION = [
  { title: "MPT — Orthopaedics", subtitle: "XYZ University, India", iconName: "GraduationCap" },
  { title: "BPT — Physiotherapy", subtitle: "ABC College of Physiotherapy", iconName: "GraduationCap" },
  { title: "Certified Manual Therapist", subtitle: "IASTM — Level 1 & 2", iconName: "Award" },
  { title: "Dry Needling — Level 1", subtitle: "Kinetacore", iconName: "Award" },
];

export const ACHIEVEMENTS = [
  { title: "Top Contributor", subtitle: "PhysioLink Community · 2024", iconName: "Trophy", tone: "text-amber-500" },
  { title: "Research Contributor", subtitle: "5+ research posts published", iconName: "Award", tone: "text-violet-600" },
  { title: "Most Helpful Physio", subtitle: "Top rated by peers", iconName: "Star", tone: "text-rose-500" },
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

export const EVIDENCE = [
  { id: "ev1", title: "Progressive loading in hamstring injury rehabilitation", journal: "British Journal of Sports Medicine", type: "Systematic Review", year: 2026, level: "Level 1", category: "Sports", tags: ["Hamstring", "SportsRehab"], grad: "violet", saved: false },
  { id: "ev2", title: "Criteria-based vs time-based return to sport after ACL reconstruction", journal: "JOSPT", type: "Meta-Analysis", year: 2025, level: "Level 1", category: "Sports", tags: ["ACL", "ReturnToSport"], grad: "blue", saved: false },
  { id: "ev3", title: "Dry needling for myofascial pain: an updated review", journal: "Physical Therapy Reviews", type: "Systematic Review", year: 2025, level: "Level 2", category: "Pain", tags: ["DryNeedling", "PainScience"], grad: "rose", saved: false },
  { id: "ev4", title: "Early mobilization after stroke: functional outcomes", journal: "Stroke Rehabilitation Journal", type: "RCT", year: 2026, level: "Level 1", category: "Neuro", tags: ["Stroke", "Neuro"], grad: "teal", saved: false },
  { id: "ev5", title: "Load management strategies in tendinopathy", journal: "Sports Medicine", type: "Narrative Review", year: 2024, level: "Level 3", category: "MSK", tags: ["Tendinopathy", "LoadManagement"], grad: "amber", saved: true },
  { id: "ev6", title: "Pelvic floor rehabilitation in postpartum women", journal: "Women's Health Physical Therapy", type: "Systematic Review", year: 2025, level: "Level 2", category: "Women's Health", tags: ["PostPartum", "PelvicFloor"], grad: "slate", saved: false },
];

export const COMMUNITIES = [
  { id: "cm1", name: "Sports Physiotherapy", members: 4820, grad: "violet", joined: true, desc: "Return-to-sport protocols, injury prevention, and performance rehab." },
  { id: "cm2", name: "Neuro Physiotherapy", members: 2310, grad: "teal", joined: false, desc: "Stroke, spinal cord injury, and neurodegenerative rehab discussion." },
  { id: "cm3", name: "Manual Therapy", members: 3105, grad: "blue", joined: false, desc: "Joint mobilization, soft tissue technique, and hands-on practice." },
  { id: "cm4", name: "Women's Health", members: 1540, grad: "rose", joined: false, desc: "Pelvic health, pre/postnatal care, and pelvic floor rehab." },
  { id: "cm5", name: "Students", members: 6210, grad: "amber", joined: true, desc: "For DPT/BPT students — study groups, case discussion, mentorship." },
  { id: "cm6", name: "Geriatric Physiotherapy", members: 980, grad: "slate", joined: false, desc: "Fall prevention, mobility, and healthy aging." },
];
