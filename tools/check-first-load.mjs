// Fails when a first visit to the app downloads more than the budget.
//
// "First visit" = every file index.html asks the browser to fetch at once (the
// entry script, the <link rel="modulepreload"> files and the stylesheet), measured
// the way the network sends them: gzip-compressed. Run after `npm run build`.
//
// Why this exists: the first visit once weighed ~1,600 KB because the assessments,
// the patient profile, the posture engine, a 900 KB clinical library and the PDF
// libraries had all been tied into it. After they were loaded on demand it was
// ~250 KB. This stops it quietly growing back. If it fails, run
// `node tools/check-first-load.mjs --why` to see which files are in the list, then
// find what imports the heavy one from the first screen.
//
//   FIRST_LOAD_BUDGET_KB   budget in KB (default 260)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dist = path.resolve(process.argv.find((a) => a.startsWith("--dist="))?.slice(7) || "dist");
const budget = Number(process.env.FIRST_LOAD_BUDGET_KB || 260);
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
if (!refs.length) { console.error("No /assets files found in dist/index.html: did the build run?"); process.exit(2); }

let total = 0;
const rows = refs.map((r) => {
  const bytes = zlib.gzipSync(fs.readFileSync(path.join(dist, r))).length;
  total += bytes;
  return [bytes, r];
}).sort((a, b) => b[0] - a[0]);

console.log(`First visit downloads ${refs.length} files:`);
for (const [bytes, r] of rows) console.log(`  ${String(Math.round(bytes / 1024)).padStart(5)} KB  ${r}`);
const kb = Math.round(total / 1024);
console.log(`Total: ${kb} KB gzipped (budget ${budget} KB)`);
if (kb > budget) {
  console.error(`\nFirst visit is ${kb - budget} KB over budget. Something heavy was tied into the first screen again.`);
  process.exit(1);
}
