// The words of the "How to use PhysioMind" page (Settings). Kept apart from the
// component so they are easy to edit, and so a test can check that every button
// or label named here still exists in the app (src/__tests__/howToUse.test.jsx).
// Plain language, written for a physio who has never opened the app.
//
// Each step is a string; **double asterisks** mark a button or label as it is
// written on screen.

export const HOW_TO_TOPICS = [
  {
    id: "start",
    icon: "🚀",
    title: "First time here",
    summary: "A one-minute tour",
    steps: [
      "The bar at the bottom has five tabs: **Home**, **Clinical**, **PhysioFeed**, **Learn** and **Profile**. Clinical is where your patients and assessments live.",
      "Everything you type is saved as you go. The label at the top tells you where: **Saved on this device** or **Saved to cloud**.",
      "Tap ☰ (top left) to open the menu. **Settings** is at the bottom of it.",
    ],
    tip: "Not signed in? Guest mode lets you try the whole app, but nothing is kept and the AI features need an account.",
  },
  {
    id: "new",
    icon: "📝",
    title: "Start a new assessment",
    summary: "Ortho, Neuro or Cardio, step by step",
    steps: [
      "Tap **Clinical**, then **Assess**, then **＋ New Assessment**.",
      "Type the patient's name. Age and sex are optional but help the app's suggestions. Pick **Ortho**, **Neuro** or **Cardio**, the first time, tick **I confirm I will have each patient's permission before recording their details here.** (you are only asked once), then tap **Next →**.",
      "Ortho: the pathway starts on **Outpatient / Musculoskeletal**, the usual one, so just tap **Continue** (pick Inpatient or Post-operative Rehab instead if that fits). Pick the body region, and the side for an arm or leg, then **Continue**. **General Assessment** (the core steps) is already chosen; pick **Advanced Assessment** for more steps. Then tap **Start assessment**.",
      "Neuro: choose the setting, tap **Continue**, then **Use Template** and pick one, for example General Neurological. Cardio: tap **Start Assessment**, choose the setting, then the system (cardiovascular, respiratory or combined).",
      "Move through the steps with **Next** and **Back**, or tap any step at the top to jump to it. Ortho shows a counter like Step 3/21 so you can see how far along you are.",
      "On the last step, **Final Review**, tap **Save Assessment**. It needs the patient's name and age.",
    ],
    tip: "You do not have to finish in one go. Your answers are saved as you go, so you can stop and come back.",
  },
  {
    id: "ai",
    icon: "✨",
    title: "Say it instead of typing",
    summary: "AI Assessment fills the form from your words",
    steps: [
      "On Home, tap **AI Assessment**. The first time you are asked to confirm you will have each patient's permission. For an Ortho assessment you can also pick **AI Assisted Assessment** on the pathway screen.",
      "Describe the patient in your own words, for example: 42-year-old teacher, neck pain for 4 months, worse with laptop work. You can type it, or tap the microphone if your browser supports voice (Chrome works best).",
      "The app fills in the form from what you said. Read it through and fix anything that is wrong. You are still the one who checks it.",
    ],
    tip: "The AI features need an account and an internet connection. In guest mode you will be asked to sign in.",
  },
  {
    id: "find",
    icon: "🔎",
    title: "Find a patient or reopen an assessment",
    summary: "Search, open a profile, edit",
    steps: [
      "**Clinical → Patients** shows everyone. Type a name in **Search patients…** to find one.",
      "Tap a patient to open their profile: details, assessments, sessions and reports.",
      "To change an assessment, open the patient and tap **Edit**. You land on the review page with your answers already filled in.",
      "**Clinical → Today** lists the patients seen today.",
      "If you see **drafts not saved as patients**, those are assessments that do not have a name yet. Tap **Review** to name or remove them.",
    ],
  },
  {
    id: "session",
    icon: "▶️",
    title: "Record a follow-up session",
    summary: "A short form, about a minute",
    steps: [
      "Open the patient, either from **Clinical → Patients** or the patient shown in the ☰ menu.",
      "Tap **Start Session** (the green button in the menu), or open the **Sessions** part of their profile.",
      "For follow-ups, fill in the four short fields and sign. It takes about a minute.",
    ],
  },
  {
    id: "reports",
    icon: "📄",
    title: "Reports and sharing",
    summary: "PDF, copy as text, share with colleagues",
    steps: [
      "At the end of an assessment, **Final Review** has three buttons: **Copy assessment as text**, **Share as Clinical Discussion** and **Generate PDF Report**.",
      "The PDF has your name, clinic, address and phone at the top. Add them once in **Settings**, under **Clinic details for reports**.",
      "**Share as Clinical Discussion** posts only the sections you tick to PhysioFeed so colleagues can discuss the case. The patient's name and details are never included, and your original assessment stays private.",
    ],
  },
  {
    id: "saved",
    icon: "💾",
    title: "Is my work saved?",
    summary: "What the label at the top means",
    steps: [
      "**✓ Saved to cloud** means it reached the cloud and you can open it on any device.",
      "**● Saved on this device** means only this phone has it for now. Sign in to keep it in the cloud.",
      "**⚠ Not in the cloud yet — will retry** means the upload did not go through. Keep the app open and it tries again.",
      "No signal? The app keeps working, shows **Offline mode**, and uploads when you are back online.",
    ],
    tip: "The two sample patients every account starts with always stay on the device. Guests are never saved to the cloud.",
  },
  {
    id: "update",
    icon: "🔄",
    title: "Updating the app",
    summary: "When a new version is ready",
    steps: [
      "When a new version is out you will see **A new version of PhysioMind is ready**. It waits until you leave an assessment, so it never interrupts your work.",
      "Tap **Refresh** and you come back to the same screen, or tap **Later** to keep going. Closing and reopening the app also updates it.",
    ],
  },
  {
    id: "install",
    icon: "📲",
    title: "Put it on your home screen",
    summary: "Opens like an app",
    steps: [
      "iPhone: open the site in Safari, tap the **Share** icon, then **Add to Home Screen**.",
      "Android and Chrome: tap **Install** when it appears, or use the browser menu and choose Install app.",
      "It then opens full screen like any other app and updates itself.",
    ],
  },
  {
    id: "more",
    icon: "📰",
    title: "PhysioFeed, Learn and Profile",
    summary: "The other three tabs",
    steps: [
      "**PhysioFeed** has Feed, Opportunity (jobs), News (jobs, conferences and regulation), Case Discussion, People, Evidence and Saved.",
      "**Learn** has Practical Skills and Clinical Cases.",
      "**Profile** is your public profile on PhysioFeed. Your clinic details for reports are in Settings, not here.",
    ],
  },
  {
    id: "settings",
    icon: "⚙️",
    title: "Settings and your account",
    summary: "Clinic details, notifications, sign out",
    steps: [
      "Open **Settings** from the ☰ menu.",
      "**Clinic details for reports** appear at the top of every PDF report. **Notifications** turns phone alerts on or off.",
      "**Sign out** and **Delete account** are at the bottom.",
    ],
  },
  {
    id: "trouble",
    icon: "🛠",
    title: "If something looks wrong",
    summary: "Quick fixes",
    steps: [
      "Patient list empty? Wait a few seconds. If you see **Couldn't load your saved patients**, tap **Try again**. They are safe in the cloud.",
      "Page looks stuck, or the bottom bar looks out of place? Close the app completely and open it again.",
      "AI does not answer? It needs you to be signed in and online.",
      "Voice does not work? Voice needs a browser that supports it (Chrome works best). You can always type instead.",
    ],
  },
];

export const HOW_TO_DISCLAIMER =
  "PhysioMind supports your clinical thinking; it does not replace it. Check every suggestion before you rely on it.";
