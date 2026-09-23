import { makeChoiceQuiz } from "./TabbedDetail.jsx";
import { hash } from "./SpecialTestDetail.jsx";

// Quick Check for the study items whose data is an assessment card (Cardio &
// Respiratory, Neuro conditions) rather than a flat table like ROM/MMT: each
// has an interpret.normal list and some have interpret.redFlags. Asks which
// finding is normal (or a red flag) for the item, with the wrong choices taken
// from OTHER items -- preferring ones in a different group, so a sibling
// measure with a similar normal range can't be an equally right answer.
//
// `pool` is [{ id, region, d }] for every item in the dataset.
const firstOf = (list) => (Array.isArray(list) && list.length ? String(list[0]) : null);

export function buildInterpretQuiz(id, title, d, region, pool) {
  const normal = firstOf(d.interpret?.normal);
  const red = firstOf(d.interpret?.redFlags);
  const useRed = !!red && hash(id) % 2 === 0;
  const answer = useRed ? red : normal;
  if (!answer) return null;

  const field = useRed ? "redFlags" : "normal";
  const others = pool.filter((p) => p.id !== id && firstOf(p.d.interpret?.[field]));
  const otherRegion = others.filter((p) => p.region !== region);
  const source = otherRegion.length >= 3 ? otherRegion : others;

  const list = (useRed ? d.interpret.redFlags : d.interpret.normal).join("; ");
  return makeChoiceQuiz({
    id: `${id}:${field}`,
    question: useRed ? `Which of these is a red flag when assessing ${title}?` : `Which of these is a normal finding for ${title}?`,
    answer,
    pool: source.map((p) => firstOf(p.d.interpret[field])),
    explanation: `${useRed ? "Red flags" : "Normal"} for ${title}: ${list}.`,
  });
}
