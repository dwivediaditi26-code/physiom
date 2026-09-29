import { authenticateAndRateLimit } from './_lib/rateLimit.js';
import { splitAbstract } from './_lib/abstractSplit.js';

// Used by both the Evidence tab's Search Live panel and the Add Evidence
// admin screen (see AdminAddEvidencePage.jsx). Searches PubMed's public
// E-utilities API server-side -- not called directly from the browser, same
// reasoning as every other external-API call in this repo (e.g. api/parse.js):
// keeps the request shape consistent, and lets this ride the same auth +
// rate-limit gate so it can't be hammered by anyone who finds the URL. No
// API key required for this call volume.
const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

function extractYear(pubdate) {
  const m = /\d{4}/.exec(pubdate || '');
  return m ? parseInt(m[0], 10) : null;
}

function decodeXmlEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// One batched efetch (XML) for every id in the result page, instead of a
// per-result call -- same free NCBI endpoint api/pubmedDraft.js already used
// for a single article, just fetched up front for all of them so Search
// Live can show a real Summary/Conclusion (see abstractSplit.js) without an
// AI call. Best-effort: if this fails, results still come back with title/
// journal/year, just without a Summary/Conclusion.
async function fetchAbstracts(ids) {
  const byId = {};
  try {
    const url = `${EFETCH_URL}?db=pubmed&rettype=abstract&retmode=xml&id=${ids.join(',')}`;
    const r = await fetch(url);
    if (!r.ok) return byId;
    const xml = await r.text();
    for (const articleMatch of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
      const chunk = articleMatch[1];
      const pmidMatch = /<PMID[^>]*>(\d+)<\/PMID>/.exec(chunk);
      if (!pmidMatch) continue;
      const parts = [...chunk.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(([, attrs, body]) => {
        const label = /Label="([^"]*)"/.exec(attrs)?.[1];
        const text = decodeXmlEntities(body.replace(/<[^>]+>/g, '')).trim();
        return label ? `${label}: ${text}` : text;
      });
      byId[pmidMatch[1]] = parts.join(' ');
    }
  } catch (e) {
    console.error('pubmedSearch: fetchAbstracts failed --', e.message);
  }
  return byId;
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
    const abstractsById = await fetchAbstracts(ids);

    const results = ids
      .map((pmid) => {
        const r = byId[pmid];
        if (!r || r.error) return null;
        const { summary, conclusion } = splitAbstract(abstractsById[pmid]);
        return {
          pmid,
          title: r.title?.replace(/\.$/, '') || '(untitled)',
          journal: r.fulljournalname || r.source || 'PubMed',
          year: extractYear(r.pubdate),
          summary,
          conclusion,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
