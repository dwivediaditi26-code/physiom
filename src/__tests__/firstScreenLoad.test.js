// Keeps the first screen light on a weak connection:
//  - every ti-* icon the app uses is in the small icon font we ship (a missing one
//    draws as a blank square),
//  - nothing from another website can hold the first screen back.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (["__tests__", "__mocks__", "fonts", "node_modules"].includes(entry.name)) continue;
      sourceFiles(path.join(dir, entry.name), out);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

describe("icon font", () => {
  const css = read("src/fonts/tabler-icons-subset.css");
  const defined = new Set([...css.matchAll(/\.(ti-[a-z0-9-]+):before/g)].map((m) => m[1]));
  // icon names built in code ("ti-chevron-" + (open ? "up" : "down")) cannot be found by text search
  const builtInCode = ["ti-chevron-up", "ti-chevron-down"];

  it("has every icon the app uses (if this fails: python3 tools/make-tabler-subset.py)", () => {
    const used = new Set(builtInCode);
    for (const file of sourceFiles(path.join(root, "src"))) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bti-[a-z0-9]+(?:-[a-z0-9]+)*/g)) used.add(m[0]);
    }
    const missing = [...used]
      .filter((n) => !builtInCode.some((b) => b.startsWith(n + "-")))
      .filter((n) => !defined.has(n));
    expect(missing).toEqual([]);
  });

  it("ships the font file next to the stylesheet and keeps it small", () => {
    const font = path.join(root, "src/fonts/tabler-icons-subset.woff2");
    expect(fs.existsSync(font)).toBe(true);
    expect(fs.statSync(font).size).toBeLessThan(30 * 1024);
  });
});

describe("first screen does not wait for other websites", () => {
  for (const page of ["index.html", "tester.html"]) {
    it(`${page}: no normal (blocking) stylesheet from another site`, () => {
      const html = read(page).replace(/<noscript>[\s\S]*?<\/noscript>/g, "").replace(/<!--[\s\S]*?-->/g, "");
      const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
      const blocking = links.filter((l) => /rel="stylesheet"/.test(l) && /href="https?:/.test(l) && !/media="print"/.test(l));
      expect(blocking).toEqual([]);
    });

    it(`${page}: no icon stylesheet from a CDN`, () => {
      expect(read(page)).not.toMatch(/cdn\.jsdelivr\.net/);
    });
  }
});
