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
