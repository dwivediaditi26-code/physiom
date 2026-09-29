// Splits a plain-text abstract into a Summary and a Conclusion without
// calling any AI model (2026-09-28, Aditi: "remove the AI initiation in the
// evidences ... it will cost too much" -- Search Live's old "AI summary"
// button spent real Groq tokens per PubMed/europepmc.draft call, see
// api/pubmedDraft.js / api/europepmcDraft.js). Every result on that tab
// should always show a Summary + Conclusion, drawn straight from the
// article's own abstract instead.
//
// Most clinical-trial/systematic-review abstracts (the bulk of what a
// physiotherapy search turns up) are NLM "structured abstracts": labeled
// sections like "BACKGROUND: ... METHODS: ... RESULTS: ... CONCLUSION: ..."
// run together as one paragraph. When those labels are present, everything
// up to Results/Conclusion/Discussion becomes the Summary and everything
// from there on becomes the Conclusion. Otherwise (a plain narrative
// abstract with no labels) the closing sentence(s) -- where the take-home
// point usually lives -- become the Conclusion and the rest becomes the
// Summary.
const CONCLUSION_LABEL_RE = /result|finding|conclusion|discussion|interpretation/i;

export function splitAbstract(text) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return { summary: "", conclusion: "" };

  const labelRe = /\b([A-Z][A-Za-z]*(?:[ -][A-Za-z]+){0,3}):\s+/g;
  const matches = [...clean.matchAll(labelRe)];
  if (matches.length >= 2) {
    const sections = matches.map((m, i) => {
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
      return { label: m[1], body: clean.slice(start, end).trim() };
    }).filter((s) => s.body);

    const conclusionParts = sections.filter((s) => CONCLUSION_LABEL_RE.test(s.label)).map((s) => s.body);
    const summaryParts = sections.filter((s) => !CONCLUSION_LABEL_RE.test(s.label)).map((s) => s.body);
    if (summaryParts.length && conclusionParts.length) {
      return { summary: summaryParts.join(" "), conclusion: conclusionParts.join(" ") };
    }
  }

  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  if (sentences.length <= 1) return { summary: "", conclusion: clean };
  const tailCount = Math.min(2, Math.max(1, Math.ceil(sentences.length * 0.25)));
  const splitAt = sentences.length - tailCount;
  return {
    summary: sentences.slice(0, splitAt).join(" ").trim(),
    conclusion: sentences.slice(splitAt).join(" ").trim(),
  };
}
