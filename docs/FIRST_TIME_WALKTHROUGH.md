# First-time physio walkthrough (2026-10-02)

Walked through the web app on a phone-size screen (390 x 844) as a physio who has never seen
it: sign up, Home, Clinical (Today / Assess / Patients / Treatment), start an Ortho assessment
and fill it in step by step, Final Review and Save, AI Assessment entry, Learn, PhysioFeed,
Profile, the menu and Settings. Run against the test Supabase project with a fresh account.
Not covered: a real iPhone, a slow connection, the voice/AI parts (they need real services),
the PDF's look, and the patient profile in depth.

## What works well
- Sign-up is short, and "Try the full app, no sign-up needed" is easy to find.
- The Home "How to use PhysioMind" tile is visible; Home, Clinical and Assess read clearly.
- The assessment itself is good: photos on ROM and special tests (with sensitivity and
  specificity), name/age/sex typed in the first popup are already on Demographics, and Final
  Review shows only what was actually entered.

## Fixed in the same change (2026-10-02)
1. The Pain step showed a note meant for the app's builders ("Body Chart Image Not Uploaded,
   upload it to Cloudinary...") whenever the picture was still loading. Now it says "Loading
   body chart..."; if the picture really cannot load it says so plainly with "Try again".
2. The body chart showed a "Admin" button (the region-position editor) to every user. Admin
   accounts only now.
3. The Clinical header greeted "Dr dwivediaditi26" (the start of the email address) instead of
   the name; and Home greeted anyone with no name on file as "Dr. Aditi". Both use the name
   typed at sign-up now (`userName.js`); with no name it just says "Welcome".
4. Home and Clinical said "Ortho, Neuro, Cardio, Pedia, Sports" although Pedia and Sports are
   not available yet. Now "Ortho, Neuro, Cardio. More soon".
5. Hiding Posture left three Home tiles, and the phone's global rule that squeezes any 3-column
   grid stacked them into tall single cards. The tile row has its own column rule now.

## Done later the same day (Aditi picked 1, 3, 5, 6)
- **1. Sample patients:** now tagged "Sample", left out of the counts, with a "Remove samples" button.
- **3. AI Assessment:** signed-in users land on the speaking screen first (guests keep Demographics first, since the AI box needs an account).
- **5. PhysioFeed made-up posts:** the demo posts are for guests only. A signed-in person whose feed could not load now sees an empty feed, not canned posts.
- **6. Red Flag Screen:** a "No red flags identified" button marks all six questions negative in one tap.

## Done on 2026-10-03
- **4. Pre-filled public profile:** the demo entries now show to guests only; a signed-in person whose profile could not be read gets a blank profile of their own.
- **8. Save easy to miss:** "Save Assessment" is now the main button on Final Review for Ortho.
- **11. Disabled buttons give no reason:** Create free account and the Ortho Continue buttons now say what is missing.

- **7. ROM boxes showing 45:** they start empty now, with the normal value as a faint hint.
- **9. Small, pale text:** Home tile descriptions are bigger and darker.
- **10. Cut-off labels:** shorter step-bar labels, and the PhysioFeed top bar no longer cuts "PhysioMind".

- **2. Too many choices before the first question:** Outpatient and General Assessment start chosen; "IPD" is now "Inpatient (IPD)".
- **12. Clutter:** Learn's "Soon" cards are one line, the clinic-details prompt waits for a first patient, and the Patients options say what they are.
- **Extra (asked for after this walkthrough):** a "patient permission" tick before a new patient record starts.

## For a decision (not changed)
Ordered roughly by how likely a new physio is to be confused or put off. Items 1 to 12 are all done (above); the text is kept as written.

1. **Sample patients look real.** Every new account starts with "Priya Sharma" and "Arjun
   Kapoor", counted in "1 patient today / 2 total", with no "sample" label. Suggest a Sample
   badge, leave them out of the counts, and a "Remove samples" button.
2. **Too many choices before the first question.** Quick popup (name, age, phone, sex,
   specialty) then pathway, then region, then "How do you want to start?", then 21 steps.
   Suggest preselecting Outpatient and General Assessment (or a "Start now" shortcut) and
   plain wording for "IPD".
3. **AI Assessment does not start with AI.** The Home tile promises "Say your assessment in
   your words" but opens Demographics, then Region; the speaking screen is step 3.
4. **Public profile is pre-filled with things the person never entered.** A brand-new account's
   Profile tab shows "Physiotherapist, Active Physio & Rehab Centre" and "5 Posts". Needs a look
   at where those defaults come from.
5. **PhysioFeed shows made-up posts** (e.g. "Dr. Aditi Sharma, PT" with a verified tick, 248
   likes). The "Demo content" notice showed in guest mode but I did not see it signed in.
6. **Red Flag Screen** is six empty fields with no one-tap "No red flags identified"; it is not
   clear whether blank means negative.
7. **ROM** shows 45 in every box with "Normal, document N=45". Final Review showed nothing for
   ROM, so nothing untouched was saved, but 45 looks like an entered value.
8. **Save is easy to miss.** On Final Review the main bottom button is "Start new assessment";
   "Save Assessment" is further down the page (leaving does ask to save).
9. **Small, pale text.** Tile descriptions on Home are 9 to 11 px light grey.
10. **Cut-off labels.** The step bar says "Demograp..." and "General Observatic..."; the green
    tick in the assessment header has no label; PhysioFeed's title shows "PhysioMir".
11. **Disabled buttons give no reason.** "Create free account" (until the terms box is ticked)
    and "Continue" on pathway/region look faded with no hint.
12. **Clutter.** Learn has three "Soon" cards; "Add your clinic details" appears before the first
    patient; "Sort, filters & backup" on Patients does not say what it does.
