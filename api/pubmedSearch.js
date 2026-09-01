import { authenticateAndRateLimit } from './_lib/rateLimit.js';

// Add Evidence admin screen, step 1 (see AdminAddEvidencePage.jsx). Searches
// PubMed's public E-utilities API server-side -- not called directly from
// the browser, same reasoning as every other external-API call in this repo
// (api/chat.js, api/parse.js): keeps the request shape consistent, and lets
// this ride the same auth + rate-limit gate so it can't be hammered by
// anyone who finds the URL. No API key required for this call volume (an
// admin searching occasionally, not a high-throughput integration).
const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

function extractYear(pubdate) {
  const m = /\d{4}/.exec(pubdate || '');
  return m ? parseInt(m[0], 10) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'pubmed-search');
  if (!userId) return;

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A search query is required.' });
  }

  try {
    const searchUrl = `${ESEARCH_URL}?db=pubmed&retmode=json&retmax=8&sort=relevance&term=${encodeURIComponent(query.trim())}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return res.status(502).json({ error: 'PubMed search failed.' });
    const searchJson = await searchRes.json();
    const ids = searchJson?.esearchresult?.idlist || [];
    if (ids.length === 0) return res.status(200).json({ results: [] });

    const summaryUrl = `${ESUMMARY_URL}?db=pubmed&retmode=json&id=${ids.join(',')}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) return res.status(502).json({ error: 'PubMed lookup failed.' });
    const summaryJson = await summaryRes.json();
    const byId = summaryJson?.result || {};

    const results = ids
      .map((pmid) => {
        const r = byId[pmid];
        if (!r || r.error) return null;
        return {
          pmid,
          title: r.title?.replace(/\.$/, '') || '(untitled)',
          journal: r.fulljournalname || r.source || 'PubMed',
          year: extractYear(r.pubdate),
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
