import { ExternalLink, Search } from "lucide-react";

// Real, verified-working search links (2026-09-30) -- not scraped listings.
// Naukri/Indeed/LinkedIn/NHS Jobs don't permit scraping without an approved
// API/partnership (Aditi's own ChatGPT research said as much), so rather
// than build a pipeline against their terms, this sends the physio
// straight to a live search on each site. Honest about what it is: a
// shortcut to search elsewhere, never presented as a verified vacancy the
// way a career_news card is.
const BOARDS = [
  { name: "Naukri", region: "India", url: "https://www.naukri.com/physiotherapist-jobs" },
  { name: "Indeed", region: "India", url: "https://in.indeed.com/jobs?q=physiotherapist" },
  { name: "LinkedIn Jobs", region: "Worldwide", url: "https://www.linkedin.com/jobs/search/?keywords=physiotherapist" },
  { name: "NHS Jobs", region: "UK", url: "https://www.jobs.nhs.uk/candidate/search/results?keyword=physiotherapist" },
  { name: "Google Jobs", region: "Worldwide", url: "https://www.google.com/search?q=physiotherapist+jobs" },
  // NCS -- India's own official government job portal (Ministry of Labour
  // & Employment, ncs.gov.in), not a third-party aggregator. Its job
  // search is behind a login, so this links to the site itself rather
  // than guessing at a query-string pattern that might silently 404.
  { name: "NCS (Govt of India)", region: "India", url: "https://ncs.gov.in/" },
  // A free-text Google search scoped to "government" specifically (2026-09-30,
  // Aditi: "goverment job vacancy from inter net... google should be
  // searchable") -- catches the many individual state/NHM/hospital
  // recruitment pages that don't have RSS and can't each be wired in
  // (see fetchCareerNews.js's source-by-source notes). Deliberately a
  // separate card from "Google Jobs" above -- a plain web search surfaces
  // government notice PDFs that Google's structured Jobs results miss.
  { name: "Govt jobs (Google)", region: "India", url: "https://www.google.com/search?q=physiotherapist+vacancy+government+India" },
];

export default function JobSearchLinks() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 mb-1">
        <Search size={13} /> Search more job boards
      </p>
      <p className="text-[11px] text-slate-400 mb-3">
        These open a live search on each site — not vacancies we've verified ourselves.
      </p>
      <div className="flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <a
            key={b.name}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-[#BFDBFE] hover:text-[#2563EB]"
          >
            {b.name} <span className="text-slate-400 font-medium">· {b.region}</span>
            <ExternalLink size={12} />
          </a>
        ))}
      </div>
    </div>
  );
}
