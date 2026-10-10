// phraseSides.js -- left / right, shared by the spine matchers (Cervical, Thoracic, Lumbar/SI).
// Some checklist answers come in a left and a right version ("Trapezius (L)" / "Trapezius (R)"). Students write
// "left", "bayen", "baayein", "बाएं", "बायां" ... all of which must read as the same side.
// Phrases and typed text both go through these clean-ups, so any spelling meets the same word.

// Hinglish spellings -> one form. (Students usually type the English "left" / "right" too: those need no clean-up.)
export const SIDE_HINGLISH = [
  [/\b(baayen|baayein|bayein|bayen|baaye|baye|baayan|bayan|baaya|baya|baayi|bayi|baayee|bayee)\b/g, "bayen"],
  [/\b(daayen|daayein|dayein|dayen|daaye|daye|daayan|dayan|daaya|daya|daayi|dayi|dahina|dahine|dahini|dahinee|dahin)\b/g, "dayen"],
];
// Devanagari spellings -> one form (the chandrabindu is already turned into an anusvara before these run).
export const SIDE_DEVA = [
  [/बायीं|बाईं|बायां|बायें|बाएं|बाया|बाये/g, "बायां"],
  [/दायीं|दाईं|दायां|दायें|दाएं|दाया|दाये|दाहिना|दाहिनी|दाहिने|दाहिन/g, "दायां"],
];
// Word lists for the word-order rules.
export const LEFT_W = "left bayen बायां";
export const RIGHT_W = "right dayen दायां";
// Both sides together, for "both arms" kinds of phrases.
export const BOTH_W = "both dono दोनों bilateral bilaterally either_side";

/**
 * sided(templates) -> { L: [...], R: [...] }
 * A template is a phrase with {e} (English left/right), {h} (Hinglish bayen/dayen) or {d} (Devanagari बायां/दायां).
 *   sided(["pain in {e} arm", "{h} haath me dard", "{d} हाथ में दर्द"])
 */
export function sided(templates) {
  const words = { L: { e: "left", h: "bayen", d: "बायां" }, R: { e: "right", h: "dayen", d: "दायां" } };
  const make = (side) => templates.map((t) => t.replace(/\{([ehd])\}/g, (_, k) => words[side][k]));
  return { L: make("L"), R: make("R") };
}
