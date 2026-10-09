// phraseEngine.js -- the shared engine behind the everyday-phrase matchers (Elbow, Shoulder, Knee, ...).
//
// A region's file (elbowPhraseMap.js, shoulderPhraseMap.js ...) holds what is specific to that region:
// its phrase list, its word-order rules and its body-part words. This file holds how the matching works:
// spelling clean-up, longest-phrase-wins, negation, word-order rules and the safety guards.
// It SUGGESTS only -- nothing here ticks anything. No AI, no network, no cost.
//
// Phrase notation:  "~word"  = a bare word that only counts when the student is typing INTO that
// question's own box (e.g. "gripping" typed in "Aggravating movement"). In a free story it is ignored,
// because on its own it proves nothing.

// ───────────────────────── normalising ─────────────────────────
// Common Hinglish spellings -> one form. Phrases and typed text both go through this,
// so a phrase written one way still matches the same word spelled another way.
const HINGLISH = [
  [/\b(kehni|kuhni|kohnee|kohani|kohni)\b/g, "kohni"],
  [/\b(darad|dardd|dard)\b/g, "dard"],
  [/\b(nahin|nahi|nhi|nahee)\b/g, "nahi"],
  [/\b(sunn?pan|sunpan|sunnapan)\b/g, "sunnpan"],
  [/\b(jhunjhuni|jhunjhunee|jhunjhunahat|jhanjhanahat)\b/g, "jhunjhuni"],
  [/\b(ungli|unglee|ungliyan|ungliyon|unglian|ungliya|ungliyaan)\b/g, "ungli"],
  [/\b(kalai|kalayi|kalaee)\b/g, "kalai"],
  [/\b(angutha|angootha|anguthe|angoothe|angutho|anguthaa)\b/g, "angutha"],
  [/\b(hatheli|hathheli)\b/g, "hatheli"],
  [/\b(haath|hath|hathon|haathon)\b/g, "haath"],
  [/\b(uthana|uthane|uthaana|uthaane|uthate|uthaate|uthata|uthati|uthayi|uthaya|uthaye)\b/g, "uthana"],
  [/\b(pakadna|pakadne|pakadte|pakadta|pakadti|pakad|pakarna|pakarne|pakarte|pakar|pakadkar)\b/g, "pakad"],
  [/\b(zyada|jyada|jyaada|zyaada)\b/g, "zyada"],
  [/\b(subah|subha|savere)\b/g, "subah"],
  [/\b(kamzor|kamjor|kamzori|kamjori|kamzoree)\b/g, "kamzor"],
  [/\b(sujan|sujhan|sooji|suji|sooja|suja|soojan)\b/g, "sujan"],
  [/\b(garam|garm|garum)\b/g, "garam"],
  [/\b(laal|lal|laall)\b/g, "laal"],
  [/\bgir (gaya|gayi|gaye|jata|jati|jate|gya)\b/g, "gir"],
  [/\b(girne|girna|girta|girti|girte|gira|gire|giri|girgaya|girgayi)\b/g, "gir"],
  [/\b(tedhi|tedha|tedhe)\b/g, "tedha"],
  [/\btoot (gayi|gaya|gaye)\b/g, "toot"],
  [/\b(tooti|toota|tuta|tuti|toot)\b/g, "toot"],
  [/\b(badhta|badhti|badhne|badhna|badh rahi|badh raha|badh rahe|badh)\b/g, "badh"],
  [/\b(failta|failti|failna|phailta|phailti|phailna|fail)\b/g, "fail"],
  [/\b(chotein|chott|chot)\b/g, "chot"],
  [/\blag (gayi|gaya|gaye)\b/g, "lag"],
  [/\b(lagi|lagna|lagta|lagti|laga|lage|lagne|lag)\b/g, "lag"],
  [/\b(phenkne|phenkna|phenka|fenkne|fenkna)\b/g, "phenkna"],
  [/\b(chalane|chalana|chalate|chalata|chalani)\b/g, "chalana"],
  [/\b(khelne|khelna|khelte|khelta|khelti|khela)\b/g, "khelna"],
  [/\b(karne|karna|karte|karta|karti)\b/g, "karna"],
  [/\b(hilane|hilana|hilne|hilna|hilte)\b/g, "hilna"],
  [/\b(mudne|mudna|mudte|mudta|mudti|mudi|modne|modna|modti|mod kar|mod)\b/g, "mod"],
  [/\b(dhone|dhona|dhote|dhoti|dhoya|dhoye)\b/g, "dhona"],
  [/\b(aaram|araam|aram|aaraam)\b/g, "aaram"],
  [/\b(theek|thik|thikk|theeek)\b/g, "theek"],
];
const DEVA = [
  [/पकड(ना|ने|ते|ता|ती|कर)?/g, "पकड"],
  [/टूट(ी|ा|े)?/g, "टूट"],
  [/उठा(ना|ने|ते|ता|ती|या)/g, "उठाना"],
  [/उंगली(यां|यों|याँ)?/g, "उंगली"],
  [/अंगूठ[ाेों]/g, "अंगूठा"],
  [/हाथ(ों)?/g, "हाथ"],
  [/सूज(न|ी|ा)/g, "सूजन"],
  [/गिर(ा|ी|ने|ना|ते|ता|ती|े)?/g, "गिर"],
  [/नहीं|नही/g, "नहीं"],
  [/कमजोर(ी)?|कमज़ोर(ी)?/g, "कमजोर"],
];

export const NEGATORS = new Set(["no", "not", "never", "without", "none", "nothing", "neither", "nor", "nil",
  "dont", "doesnt", "didnt", "isnt", "wasnt", "arent", "hasnt", "havent", "wont", "wouldnt",
  "nahi", "bina", "bagair", "mat", "नहीं", "बिना", "बगैर", "मत"]);
const NEGATORS_AFTER = new Set(["nahi", "नहीं"]);
const RELIEF = new Set(["better", "relieved", "relief", "eases", "ease", "improves", "improve", "settles", "helps",
  "aaram", "rahat", "आराम", "राहत"]);
const CLAUSE_BREAKS = new Set(["|", "but", "however", "although", "though", "lekin", "magar", "लेकिन", "मगर", "परंतु", "किंतु"]);
const CONNECTORS = new Set([",", "and", "or", "aur", "ya", "और", "या"]);

// Word lists the region files share. Notation as in rules below ("a_b" = the two words "a b", trailing * = any ending).
export const WORDS = {
  PAIN: "pain pains painful paining hurt hurts hurting ache aches aching sore soreness tender burning throbbing throbs throb dard दर्द dukh* दुख* takleef तकलीफ jalan जलन",
  NERVE: "numb* tingl* sunn* jhunjhuni झनझनाहट सुन्न* pins_and_needles",
  SIDE: "side taraf wala wale wali तरफ वाला वाले वाली ओर border edge",
  OTHERS: "friend friends colleague colleagues neighbour neighbor dost",
};

function patMatchAt(tokens, i, alt) {
  if (i + alt.length > tokens.length) return false;
  for (let j = 0; j < alt.length; j++) {
    const t = tokens[i + j], p = alt[j];
    if (p.prefix ? !t.startsWith(p.w) : t !== p.w) return false;
  }
  return true;
}
// Every place a group occurs: [{s, e}]
function groupHits(tokens, group) {
  const hits = [];
  for (let i = 0; i < tokens.length; i++) for (const alt of group) if (patMatchAt(tokens, i, alt)) hits.push({ s: i, e: i + alt.length });
  return hits;
}
const anyWord = (tokens, group) => groupHits(tokens, group).length > 0;

// Smallest span that holds one hit from every group without overlapping hits.
function bestSpan(hitLists, win) {
  let best = null;
  const pick = (gi, chosen) => {
    if (gi === hitLists.length) {
      const s = Math.min(...chosen.map((h) => h.s)), e = Math.max(...chosen.map((h) => h.e));
      if (e - s <= win && (!best || e - s < best.e - best.s)) best = { s, e };
      return;
    }
    for (const h of hitLists[gi]) {
      if (chosen.some((c) => h.s < c.e && c.s < h.e)) continue;
      pick(gi + 1, [...chosen, h]);
    }
  };
  pick(0, []);
  return best;
}

function matchesAt(tokens, start, phraseTokens) {
  if (start + phraseTokens.length > tokens.length) return false;
  for (let i = 0; i < phraseTokens.length; i++) if (tokens[start + i] !== phraseTokens[i]) return false;
  return true;
}

// Splits canonical text into words plus, for each word, whether a comma sits just before it.
function wordsAndCommas(tokens) {
  const words = []; const commaBefore = [];
  let pendingComma = false;
  for (const t of tokens) {
    if (t === ",") { pendingComma = true; continue; }
    words.push(t); commaBefore.push(pendingComma); pendingComma = false;
  }
  return { words, commaBefore };
}

const RULE_CHUNK = 80;
const RULE_MAX_TOKENS = 400; // a real note is a few dozen words; a huge paste must not slow the screen

/**
 * createPhraseMatcher(config)
 *   phrases           { field: { option: [phrase, ...] } }  -- option text must be the form's exact option text
 *   singleChoiceFields  fields where only one option can be ticked (several suggestions = "ambiguous")
 *   noneOptions       { field: "None" } -- the "nothing" option of a field; never suggested beside a real one
 *   ownWords          words that say a sentence is about THIS region (rules' "painOrArm" test, foreign-part guard)
 *   foreignWords      words for OTHER body parts: a sentence with one and no own word is not about this region
 *   guardExempt       ["field|option", ...] -- options still suggested from a sentence about another body part (e.g. the
 *                     Shoulder option "Up to neck" from "my neck also hurts")
 *   optionGuards      { "field|option": "words" } -- that option is dropped from a sentence that contains one of these
 *                     words (e.g. "Cancer history" is not suggested for "my mother had cancer")
 *   hinglish, deva    extra spelling clean-ups [[regex, replacement]] for this region's body-part words
 *   rules(api)        registers the word-order rules; api = { rule, O, g, W }
 */
export function createPhraseMatcher({ phrases, singleChoiceFields = ["pattern"], noneOptions = {}, ownWords, foreignWords,
  optionGuards = {}, guardExempt = [], hinglish = [], deva = [], rules: registerRules }) {
  const FIELDS = Object.keys(phrases);
  const SINGLE = new Set(singleChoiceFields);
  const NONE_OF = new Map(Object.entries(noneOptions));

  function canon(raw) {
    let s = String(raw ?? "").normalize("NFC").toLowerCase();
    s = s.replace(/[​-‍﻿]/g, "");
    s = s.replace(/़/g, "");            // Devanagari nukta
    s = s.replace(/ँ/g, "ं");      // chandrabindu -> anusvara
    s = s.replace(/[’‘`´]/g, "'");
    s = s.replace(/([a-z])'([a-z])/g, "$1$2"); // don't -> dont
    s = s.replace(/'/g, "");
    s = s.replace(/[।.;!?\n\r]+/g, " | "); // sentence ends
    s = s.replace(/,/g, " , ");
    s = s.replace(/[()/:"“”\-–—_+*#<>{}[\]=~]/g, " ");
    for (const [re, to] of HINGLISH) s = s.replace(re, to);
    for (const [re, to] of hinglish) s = s.replace(re, to);
    for (const [re, to] of DEVA) s = s.replace(re, to);
    for (const [re, to] of deva) s = s.replace(re, to);
    s = s.replace(/\b(the|my|a|an)\b/g, " ");   // "back of my elbow" == "back of the elbow"
    return s.replace(/\s+/g, " ").trim();
  }

  // ───────────────────────── compiling ─────────────────────────
  const COMPILED = [];
  for (const field of FIELDS) {
    for (const [option, list] of Object.entries(phrases[field])) {
      for (const raw of list) {
        const bare = raw.startsWith("~");
        const tokens = canon(bare ? raw.slice(1) : raw).split(" ").filter((t) => t && t !== ",");
        if (!tokens.length) continue;
        const selfNegating = tokens.some((t) => NEGATORS.has(t));
        COMPILED.push({ field, option, bare, tokens, selfNegating, key: tokens.join(" ") });
      }
    }
  }
  // The exact wording of each checklist option always maps to itself, so pasting or typing
  // the option's own text works. One- and two-word labels ("Constant", "Lifting", "None")
  // are bare: they only count inside that question's own box.
  const SEEN = new Set(COMPILED.map((c) => c.field + "|" + c.option + "|" + c.key));
  for (const field of FIELDS) {
    for (const option of Object.keys(phrases[field])) {
      const tokens = canon(option).split(" ").filter((t) => t && t !== ",");
      const key = tokens.join(" ");
      if (!tokens.length || SEEN.has(field + "|" + option + "|" + key)) continue;
      COMPILED.push({ field, option, bare: tokens.length <= 2, tokens, selfNegating: tokens.some((t) => NEGATORS.has(t)), key });
    }
  }
  // Longest phrase first, so "thumb side of the wrist" wins over "thumb".
  COMPILED.sort((a, b) => b.tokens.length - a.tokens.length || b.key.length - a.key.length);

  // ───────────────────────── word-order rules ─────────────────────────
  // The phrase list needs the exact words in the exact order. Real typing is looser ("elbow outer
  // side", "glass pakadte hi dard hota hai"). A rule says: these WORD GROUPS must all appear close
  // together, in any order. Each group is a space-separated list of alternatives; "a_b" is the
  // two-word alternative "a b"; a trailing * matches any ending (lift* = lift, lifting, lifted).
  //
  // Safety, because a wrong suggestion misleads:
  //  - rules stay silent in a sentence that mentions another body part (back, knee, neck ...),
  //  - negation ("no", "not", "nahi") and "better with ..." kill a rule, as for phrases,
  //  - several rules also need a pain word, an own-region word, or must not have a blocking word between.
  const g = (s) => s.split(/\s+/).filter(Boolean).map((alt) => alt.split("_").map((w) => {
    const star = w.endsWith("*"); const c = canon(star ? w.slice(0, -1) : w);
    return { w: c, prefix: star };
  }));
  const RULES = [];
  const rule = (field, option, groups, win, o = {}) => {
    if (!phrases[field] || !phrases[field][option]) throw new Error(`rule for unknown option: ${field} / ${option}`);
    RULES.push({ field, option, groups: groups.map(g), win, selfNeg: false, ...o, src: groups, srcFlags: o,
      noComma: !!o.noComma, unless: o.unless ? g(o.unless) : null, block: o.block ? g(o.block) : null, blockBefore: o.blockBefore ? g(o.blockBefore) : null, blockAfter: o.blockAfter ? g(o.blockAfter) : null, ctx: o.ctx || null });
  };
  const O = (field, i) => Object.keys(phrases[field])[i];
  registerRules({ rule, O, g, W: WORDS });

  const FOREIGN = g(foreignWords), PAIN = g(WORDS.PAIN), OWN = g(ownWords);
  const EXEMPT = new Set(guardExempt);
  const GUARDS = new Map(Object.entries(optionGuards).map(([k, words]) => [k, g(words)]));
  const OTHERS = g(WORDS.OTHERS);

  function understandByRules(allTokens, allCommaBefore, fields) {
    const tokens = allTokens.slice(0, RULE_MAX_TOKENS), commaBefore = allCommaBefore.slice(0, RULE_MAX_TOKENS);
    if (tokens.length <= RULE_CHUNK) return understandByRulesChunk(tokens, commaBefore, fields);
    const seen = new Set(); const out = [];
    for (let s = 0; s < tokens.length; s += RULE_CHUNK / 2) {
      const part = tokens.slice(s, s + RULE_CHUNK);
      for (const r of understandByRulesChunk(part, commaBefore.slice(s, s + RULE_CHUNK), fields)) {
        const key = r.field + "|" + r.option; if (!seen.has(key)) { seen.add(key); out.push(r); }
      }
      if (s + RULE_CHUNK >= tokens.length) break;
    }
    return out;
  }
  function understandByRulesChunk(tokens, commaBefore, fields) {
    if (!RULES.length) return [];
    const out = [];
    const wordsBefore = (idx, n) => {
      const w = []; let i = idx - 1;
      if (idx < tokens.length && commaBefore[idx]) return w;
      while (i >= 0 && w.length < n) { w.push(tokens[i]); if (commaBefore[i]) break; i--; }
      return w;
    };
    const wordsAfter = (idx, n) => { const w = []; for (let i = idx; i < tokens.length && w.length < n; i++) { if (commaBefore[i]) break; w.push(tokens[i]); } return w; };
    const hasPain = anyWord(tokens, PAIN), hasOwn = anyWord(tokens, OWN);
    for (const r of RULES) {
      if (!fields.has(r.field)) continue;
      if (r.ctx === "pain" && !hasPain) continue;
      if (r.ctx === "painOrArm" && !hasPain && !hasOwn) continue;
      if (r.unless && anyWord(tokens, r.unless)) continue;
      const lists = r.groups.map((grp) => groupHits(tokens, grp));
      if (lists.some((l) => !l.length)) continue;
      const span = bestSpan(lists, r.win);
      if (!span) continue;
      const inside = tokens.slice(span.s, span.e);
      if (r.noComma && commaBefore.slice(span.s + 1, span.e).some(Boolean)) continue;
      if (r.block && groupHits(inside, r.block).length) continue;
      if (r.blockBefore && groupHits(wordsBefore(span.s, 3), r.blockBefore).length) continue;
      if (r.blockAfter && groupHits(wordsAfter(span.e, 3), r.blockAfter).length) continue;
      if (!r.selfNeg) {
        if (inside.some((t) => NEGATORS.has(t))) continue;
        if (wordsBefore(span.s, 4).some((t) => NEGATORS.has(t))) continue;
        if (wordsAfter(span.e, 3).some((t) => NEGATORS_AFTER.has(t))) continue;
      }
      if (r.reliefKills && (inside.some((t) => RELIEF.has(t)) || wordsBefore(span.s, 5).some((t) => RELIEF.has(t)))) continue;
      out.push({ field: r.field, option: r.option, phrase: "rule" });
    }
    return out;
  }

  function understandClause(rawTokens, fields, { bareAllowed }) {
    const { words: tokens, commaBefore } = wordsAndCommas(rawTokens);
    // "my back hurts when I lift", "neck pain is worse at night": about another body part, no own word -> not ours.
    const aboutOtherPart = anyWord(tokens, FOREIGN) && !anyWord(tokens, OWN);
    if (aboutOtherPart && !EXEMPT.size) return [];
    if (anyWord(tokens, OTHERS)) return []; // "my friend has tennis elbow"
    const claimed = new Array(tokens.length).fill(false);
    const found = [];
    for (const c of COMPILED) {
      if (!fields.has(c.field)) continue;
      if (c.bare && !bareAllowed) continue;
      for (let s = 0; s + c.tokens.length <= tokens.length; s++) {
        if (!matchesAt(tokens, s, c.tokens)) continue;
        const e = s + c.tokens.length;
        if (claimed.slice(s, e).some(Boolean)) continue;
        for (let i = s; i < e; i++) claimed[i] = true;
        found.push({ c, s, e });
      }
    }
    found.sort((a, b) => a.s - b.s);

    // The words just before a match, never reaching back across a comma.
    const wordsBefore = (idx, n) => {
      const out = []; let i = idx - 1;
      if (idx < tokens.length && commaBefore[idx]) return out;
      while (i >= 0 && out.length < n) { out.push(tokens[i]); if (commaBefore[i]) break; i--; }
      return out;
    };
    // The words just after a match, never reaching forward across a comma.
    const wordsAfter = (idx, n) => {
      const out = [];
      for (let i = idx; i < tokens.length && out.length < n; i++) { if (commaBefore[i]) break; out.push(tokens[i]); }
      return out;
    };
    const results = [];
    let prev = null;
    for (const f of found) {
      let negated = false;
      if (!f.c.selfNegating) {
        negated = wordsBefore(f.s, 4).some((t) => NEGATORS.has(t));
        if (!negated) negated = wordsAfter(f.e, 3).some((t) => NEGATORS_AFTER.has(t));
        // "no tennis or badminton" / "no tennis, badminton": the "no" reaches the next item of the list
        if (!negated && prev && prev.negated && f.s > 0) {
          const viaWord = CONNECTORS.has(tokens[f.s - 1]) && prev.e <= f.s - 1;
          const viaComma = commaBefore[f.s] && prev.e === f.s;
          if (viaWord || viaComma) negated = true;
        }
      }
      // "better with gripping" is relief, not something that makes it worse
      if (!negated && f.c.field === "aggravating" && wordsBefore(f.s, 5).some((t) => RELIEF.has(t))) negated = true;
      results.push({ ...f, negated });
      prev = results[results.length - 1];
    }
    const fromPhrases = results.filter((r) => !r.negated);
    const fromRules = understandByRules(tokens, commaBefore, fields)
      .map((x) => ({ c: { field: x.field, option: x.option, key: x.phrase } }));
    let all = [...fromPhrases, ...fromRules];
    if (aboutOtherPart) all = all.filter((r) => EXEMPT.has(r.c.field + "|" + r.c.option));
    if (!GUARDS.size) return all;
    return all.filter((r) => { const gd = GUARDS.get(r.c.field + "|" + r.c.option); return !gd || !anyWord(tokens, gd); });
  }

  function runUnderstanding(text, fields, bareAllowed) {
    const tokens = canon(text).split(" ").filter(Boolean);
    const clauses = []; let cur = [];
    for (const t of tokens) { if (CLAUSE_BREAKS.has(t)) { if (cur.length) clauses.push(cur); cur = []; } else cur.push(t); }
    if (cur.length) clauses.push(cur);
    const seen = new Set(); const suggestions = [];
    for (const clause of clauses) {
      for (const r of understandClause(clause, fields, { bareAllowed })) {
        const k = r.c.field + "|" + r.c.option;
        if (seen.has(k)) continue;
        seen.add(k);
        suggestions.push({ field: r.c.field, option: r.c.option, phrase: r.c.key });
      }
    }
    // "None" means nothing at all -- never suggest it next to a real symptom of the same question.
    const hasReal = (field) => suggestions.some((s) => s.field === field && s.option !== NONE_OF.get(field));
    const clean = suggestions.filter((s) => !(NONE_OF.has(s.field) && s.option === NONE_OF.get(s.field) && hasReal(s.field)));
    const byField = {};
    for (const s of clean) (byField[s.field] ||= []).push(s.option);
    const ambiguous = Object.keys(byField).filter((f) => SINGLE.has(f) && byField[f].length > 1);
    return { suggestions: clean, byField, ambiguous };
  }

  return {
    fields: FIELDS,
    PHRASE_COUNT: COMPILED.length,
    RULE_COUNT: RULES.length,
    phrasesFor: (field, option) => (phrases[field]?.[option] || []).map((p) => (p.startsWith("~") ? p.slice(1) : p)),
    allPhrases: () => COMPILED.map((c) => ({ field: c.field, option: c.option, bare: c.bare, key: c.key, selfNegating: c.selfNegating })),
    // For the review sheet: each rule in words (original word lists, not the compiled form).
    describeRules: () => RULES.map((r) => ({ field: r.field, option: r.option, groups: r.src, window: r.win, flags: r.srcFlags })),
    // The student typed into ONE question's own box: bare words count.
    understandField: (fieldId, text) => {
      if (!phrases[fieldId]) return { suggestions: [], byField: {}, ambiguous: [] };
      return runUnderstanding(text, new Set([fieldId]), true);
    },
    // The student wrote a free story: only phrases that carry their own context count.
    understandStory: (text) => runUnderstanding(text, new Set(FIELDS), false),
  };
}
