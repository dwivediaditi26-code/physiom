// UnderstoodChips.jsx -- "We understood: Lateral elbow -- tap to add".
//
// Shown under a Subjective question (or under the free-story box) while a student types in their own
// words. It only SUGGESTS: nothing is ticked until the student taps a chip. Uses the everyday-phrase
// matcher of the region (elbowPhraseMap.js, shoulderPhraseMap.js ...: no AI, no network, no cost).
//
// Each matcher is big (hundreds of phrases and rules), so it is loaded the first time someone types in that
// region, not with the app.
import React, { useEffect, useMemo, useState } from "react";
import { splitMultiValue } from "./orthoFieldKit.jsx";

// Which questions have phrases, per region group (the ones that change the AI Objective Assessment ranking).
export const PHRASE_FIELDS = {
  elbowWristHand: ["location", "radiation", "mechanism", "aggravating", "pattern", "neuro", "redFlags"],
  shoulder: ["mechanism", "aggravating", "relieving", "pattern", "radiation", "redFlags"],
  knee: ["location", "mechanism", "givingWay", "locking", "pattern", "redFlags"],
  hip: ["location", "locationPattern", "mechanism", "aggravating", "pattern", "mechanical", "redFlags"],
  ankleFoot: ["location", "radiation", "mechanism", "aggravating", "pattern", "swelling", "redFlags"],
  thoracic: ["location", "radiation", "mechanismType", "aggMovements", "relTreatments", "pattern", "redFlags", "fnAdl"],
  cervical: ["location", "radiation", "mechanismType", "armPresent", "lhermitte", "aggMovements", "relMovements", "overallPattern", "haPresent", "redFlagsMyelopathy", "redFlagsVbi", "redFlagsInstability", "redFlagsOther", "fractureScreen", "fnAdl"],
  lumbarSI: ["location", "radiation", "mechanismType", "aggPostures", "relPostures", "overallPattern", "neuroPresent", "bladderBaseline", "redFlagsCauda", "redFlagsFracture", "redFlagsInflammatory", "redFlagsSerious", "adlRestrictions", "workImpact"],
};
// How to load each region's matcher (a separate chunk, fetched on first use).
const MATCHER_LOADERS = {
  elbowWristHand: () => import("./elbowPhraseMap.js"),
  shoulder: () => import("./shoulderPhraseMap.js"),
  knee: () => import("./kneePhraseMap.js"),
  hip: () => import("./hipPhraseMap.js"),
  ankleFoot: () => import("./ankleFootPhraseMap.js"),
  thoracic: () => import("./thoracicPhraseMap.js"),
  cervical: () => import("./cervicalPhraseMap.js"),
  lumbarSI: () => import("./lumbarSIPhraseMap.js"),
};
export const hasPhrases = (contentKey, fieldId) => !!PHRASE_FIELDS[contentKey]?.includes(fieldId);
const hasRegionPhrases = (contentKey) => !!PHRASE_FIELDS[contentKey];

// Wait for a short pause in typing before suggesting, so a chip does not flash up and vanish mid-sentence
// ("tennis ... nahi khelta": the "nahi" at the end cancels it).
const PAUSE_MS = 300;
function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (value === v) return undefined;
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, v, ms]);
  return v;
}

const loadedMatchers = {};
function useMatcher(contentKey, active) {
  const [matcher, setMatcher] = useState(loadedMatchers[contentKey] || null);
  useEffect(() => {
    const load = MATCHER_LOADERS[contentKey];
    if (!active || !load) return undefined;
    if (loadedMatchers[contentKey]) { setMatcher(loadedMatchers[contentKey]); return undefined; }
    let alive = true;
    load().then((m) => { loadedMatchers[contentKey] = m; if (alive) setMatcher(m); }).catch(() => {});
    return () => { alive = false; };
  }, [contentKey, active]);
  return matcher;
}

// The value of a question after tapping `option`: a multi-select gains it, a single choice becomes it.
// The student's own words that MEANT this option ("pakadne me dard") are replaced by it, so the box does not
// end up saying the same thing twice; anything else they typed is kept.
export function valueWithOption(field, value, option, matcher) {
  if (field.type === "single") return option;
  const options = field.options || [];
  const parts = splitMultiValue(value, options);
  if (parts.includes(option)) return value;
  const kept = parts.filter((p) => options.includes(p) || !matcher || !(matcher.understandField(field.id, p).byField[field.id] || []).includes(option));
  return [...kept, option].join(", ");
}
const isAlreadyChosen = (field, value, option) =>
  field.type === "single" ? value === option : splitMultiValue(value, field.options || []).includes(option);

/**
 * mode "field": typed into ONE question's own box.  props: field, value (what is in the box), onPick(newValue)
 * mode "story": a free story under the region heading. props: fields (all of the region's), regionData, onPick(fieldId, newValue)
 */
export default function UnderstoodChips({ mode = "field", contentKey, field, value, fields, regionData, text, onPick }) {
  const typedNow = String(mode === "story" ? text ?? "" : value ?? "");
  const typed = useDebounced(typedNow, PAUSE_MS); // what to understand: after a pause
  const matcher = useMatcher(contentKey, typedNow.trim().length >= 3 && hasRegionPhrases(contentKey));

  // Understood from `typed` (after the pause), but "already ticked" is checked against the live value,
  // so a tapped chip disappears at once.
  const chips = useMemo(() => {
    if (!matcher || typed.trim().length < 3) return [];
    if (mode === "field") {
      if (!hasPhrases(contentKey, field.id)) return [];
      return matcher.understandField(field.id, typed).suggestions
        .filter((s) => !isAlreadyChosen(field, value, s.option))
        .map((s) => ({ field, option: s.option }));
    }
    const byId = Object.fromEntries((fields || []).map((f) => [f.id, f]));
    return matcher.understandStory(typed).suggestions
      .filter((s) => byId[s.field] && hasPhrases(contentKey, s.field) && !isAlreadyChosen(byId[s.field], regionData?.[s.field], s.option))
      .map((s) => ({ field: byId[s.field], option: s.option }));
  }, [matcher, typed, mode, contentKey, field, value, fields, regionData]);

  if (!chips.length) return null;
  const pick = (c) => {
    if (mode === "field") onPick(valueWithOption(c.field, value, c.option, matcher));
    else onPick(c.field.id, valueWithOption(c.field, regionData?.[c.field.id], c.option, matcher));
  };
  return (
    <div className="understood-row" data-testid="understood-chips">
      <div className="understood-title">We understood — tap to add:</div>
      {chips.map((c) => (
        <button type="button" key={c.field.id + "|" + c.option} className="understood-chip" onClick={() => pick(c)}>
          ＋ {mode === "story" ? `${c.field.label}: ` : ""}{c.option}
        </button>
      ))}
    </div>
  );
}
