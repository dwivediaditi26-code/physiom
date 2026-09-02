import { authenticateAndRateLimit } from './_lib/rateLimit.js';

// Evidence tab live search, second source (see PubMedSearchPanel.jsx --
// now LiveSearchPanel.jsx). Europe PMC (EMBL-EBI, europepmc.org) is a
// free, public, no-API-key REST search over biomedical literature --
// verified reachable/documented the same way api/pubmedSearch.js's
// PubMed E-utilities were: https://europepmc.org/RestfulWebService.
// Restricted to SRC:MED (MEDLINE/PubMed-indexed) OR SRC:PMC (PubMed
// Central full text) so results stay peer-reviewed, published literature
// -- explicitly excludes SRC:PPR (preprints, not peer-reviewed) as
// inappropriate for a clinical evidence library by default.
//
// Unlike PubMed's esearch+esummary two-call shape, Europe PMC's
// resultType=core response includes abstractText directly in the search
// result -- no separate efetch-style call needed, so
// europepmcDraft.js skips straight to drafting instead of re-fetching.
const SEARCH_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

function resultUrl(r) {
  if (r.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`;
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.pmcid) return `https://europepmc.org/article/PMC/${r.pmcid}`;
  return `https://europepmc.org/article/${r.source}/${r.id}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'europepmc-search');
  if (!userId) return;

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A search query is required.' });
  }

  try {
    const fullQuery = `(${query.trim()}) AND (SRC:MED OR SRC:PMC)`;
    const url = `${SEARCH_URL}?query=${encodeURIComponent(fullQuery)}&format=json&resultType=core&pageSize=8`;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'Europe PMC search failed.' });
    const json = await r.json();
    const raw = json?.resultList?.result || [];

    const results = raw.map((r) => ({
      id: r.id,
      source: r.source,
      pmid: r.pmid || null,
      pmcid: r.pmcid || null,
      doi: r.doi || null,
      title: (r.title || '(untitled)').replace(/\.$/, ''),
      journal: r.journalTitle || 'Europe PMC',
      year: r.pubYear ? parseInt(r.pubYear, 10) : null,
      abstractText: r.abstractText || '',
      url: resultUrl(r),
    }));

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
