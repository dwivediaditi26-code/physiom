// Tapping a push notification opened "404 NOT_FOUND": the notifications link to PhysioFeed's own
// paths (/news, /messages?with=..., /explore?view=postings ...) but the server only knew "/".
// pushLinkTarget decides which paths the app opens as a PhysioFeed screen, and vercel.json must
// serve the app for every one of them.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { pushLinkTarget } from "../pushLink.js";

// Every url the senders use: api/cron/fetchCareerNews.js, api/admin/news.js and the notification
// trigger in supabase/add_push_notification_trigger.sql.
const SENT = [
  ["/news", ""], ["/messages", "?with=5e821e41-1d4b-45f4-8817-4e0b4cb95848"], ["/profile/5e821e41-1d4b", ""],
  ["/people", ""], ["/explore", "?view=postings"], ["/explore", "?view=applications"], ["/explore", "?opp=12"],
];

describe("pushLinkTarget", () => {
  it("accepts every path the senders use, keeping the ?query", () => {
    for (const [path, search] of SENT) expect(pushLinkTarget(path, search)).toBe(path + search);
  });
  it("ignores the home page and anything else", () => {
    for (const p of ["/", "/privacy", "/terms", "/tester", "/assets/x.js", "/admin/news", "/messages/extra/part", "/profile"]) {
      expect(pushLinkTarget(p, "")).toBeNull();
    }
  });
  it("tolerates a trailing slash and drops a malformed query", () => {
    expect(pushLinkTarget("/news/", "")).toBe("/news");
    expect(pushLinkTarget("/news", "garbage")).toBe("/news");
  });
});

describe("vercel.json", () => {
  const rewrites = JSON.parse(fs.readFileSync("vercel.json", "utf8")).rewrites;
  it("serves the app (index.html) for each notification path", () => {
    for (const src of ["/news", "/messages", "/people", "/explore", "/notifications", "/profile/:userId"]) {
      expect(rewrites.find((r) => r.source === src)?.destination).toBe("/index.html");
    }
  });
  it("still has the privacy, terms and tester rewrites", () => {
    expect(rewrites.find((r) => r.source === "/privacy")?.destination).toBe("/index.html");
    expect(rewrites.find((r) => r.source === "/terms")?.destination).toBe("/index.html");
    expect(rewrites.find((r) => r.source === "/tester")?.destination).toBe("/tester.html");
  });
});
