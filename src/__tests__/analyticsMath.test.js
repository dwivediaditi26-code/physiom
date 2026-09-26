import { describe, it, expect } from "vitest";
import { resolveRange, distinctUsersSince, countFeature, buildInsights, buildUserDailyActivity, buildCumulativeSeries } from "../../api/admin/_lib/analyticsMath.js";

const NOW = new Date("2026-09-26T12:00:00.000Z");

describe("resolveRange", () => {
  it("today: spans just the current calendar day", () => {
    const { since, until } = resolveRange("today", {}, NOW);
    expect(new Date(since).toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(new Date(until).toISOString().slice(0, 10)).toBe("2026-09-27");
  });

  it("yesterday: spans the previous calendar day", () => {
    const { since, until } = resolveRange("yesterday", {}, NOW);
    expect(new Date(since).toISOString().slice(0, 10)).toBe("2026-09-25");
    expect(new Date(until).toISOString().slice(0, 10)).toBe("2026-09-26");
  });

  it("this_month / previous_month: calendar-month boundaries, back to back", () => {
    const thisMonth = resolveRange("this_month", {}, NOW);
    expect(thisMonth.since).toBe(new Date(2026, 8, 1).toISOString());
    expect(thisMonth.until).toBe(new Date(2026, 9, 1).toISOString());

    const prevMonth = resolveRange("previous_month", {}, NOW);
    expect(prevMonth.since).toBe(new Date(2026, 7, 1).toISOString());
    expect(prevMonth.until).toBe(new Date(2026, 8, 1).toISOString());
  });

  it("custom: honours explicit from/to", () => {
    const { since, until } = resolveRange("custom", { from: "2026-01-01", to: "2026-01-15" }, NOW);
    expect(since).toBe(new Date("2026-01-01").toISOString());
    expect(until).toBe(new Date("2026-01-15").toISOString());
  });

  it("numeric days: falls back to the pre-existing 'last N days' behaviour", () => {
    const { since, until } = resolveRange("7", {}, NOW);
    expect(new Date(until).getTime() - new Date(since).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("always returns an equal-length previous window immediately before the current one", () => {
    const { since, until, prevSince, prevUntil } = resolveRange("30", {}, NOW);
    const span = new Date(until).getTime() - new Date(since).getTime();
    expect(prevUntil).toBe(since);
    expect(new Date(since).getTime() - new Date(prevSince).getTime()).toBe(span);
  });
});

describe("distinctUsersSince", () => {
  const now = NOW.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const events = [
    { user_id: "a", created_at: new Date(now - 1000).toISOString() },
    { user_id: "a", created_at: new Date(now - 2000).toISOString() }, // same user, doesn't double-count
    { user_id: "b", created_at: new Date(now - 2 * dayMs).toISOString() }, // outside a 1-day window
  ];

  it("counts distinct users within the window, not raw events", () => {
    expect(distinctUsersSince(events, dayMs, now)).toBe(1);
  });

  it("widens correctly as the window grows", () => {
    expect(distinctUsersSince(events, 7 * dayMs, now)).toBe(2);
  });
});

describe("countFeature", () => {
  it("counts events matching a predicate", () => {
    const events = [{ event_name: "post_created" }, { event_name: "post_liked" }, { event_name: "post_created" }];
    expect(countFeature(events, (n) => n === "post_created")).toBe(2);
  });
});

describe("buildInsights", () => {
  const mk = (name, n) => Array.from({ length: n }, () => ({ event_name: name }));

  it("reports a real % increase when both periods have enough samples", () => {
    const current = mk("workshop_registered", 12);
    const previous = mk("workshop_registered", 10);
    const insight = buildInsights(current, previous).find((i) => i.label === "Workshop registrations");
    expect(insight.changePct).toBe(20);
    expect(insight.text).toMatch(/increased 20%/);
  });

  it("reports a real % decrease", () => {
    const current = mk("case_created", 6);
    const previous = mk("case_created", 12);
    const insight = buildInsights(current, previous).find((i) => i.label === "Clinical case activity");
    expect(insight.changePct).toBe(-50);
    expect(insight.text).toMatch(/decreased 50%/);
  });

  it("refuses to compute a trend below the minimum sample size in both periods", () => {
    const current = mk("post_created", 2);
    const previous = mk("post_created", 1);
    const insight = buildInsights(current, previous).find((i) => i.label === "Feed posts");
    expect(insight.changePct).toBeNull();
    expect(insight.text).toMatch(/not enough data/i);
  });

  it("does not divide by zero when the previous period had no activity", () => {
    const current = mk("job_application_submitted", 8);
    const previous = [];
    const insight = buildInsights(current, previous).find((i) => i.label === "Job/internship applications");
    expect(insight.changePct).toBeNull();
    expect(insight.text).toMatch(/no activity in the previous period/);
  });
});

describe("buildUserDailyActivity", () => {
  it("groups events by user and calendar day, and collects login times", () => {
    const events = [
      { user_id: "u1", event_name: "user_logged_in", created_at: "2026-09-20T09:00:00.000Z" },
      { user_id: "u1", event_name: "patient_created", created_at: "2026-09-20T09:05:00.000Z" },
      { user_id: "u1", event_name: "post_liked", created_at: "2026-09-21T10:00:00.000Z" },
      { user_id: "u2", event_name: "user_logged_in", created_at: "2026-09-20T11:00:00.000Z" },
    ];
    const rows = buildUserDailyActivity(events);
    expect(rows).toHaveLength(3);
    const u1day1 = rows.find((r) => r.userId === "u1" && r.date === "2026-09-20");
    expect(u1day1.loginTimes).toEqual(["2026-09-20T09:00:00.000Z"]);
    expect(u1day1.eventCount).toBe(2);
  });

  it("sums gaps between events as active time, capped per gap", () => {
    const events = [
      { user_id: "u1", event_name: "user_logged_in", created_at: "2026-09-20T09:00:00.000Z" },
      { user_id: "u1", event_name: "patient_created", created_at: "2026-09-20T09:05:00.000Z" }, // 5-min gap, under the cap
    ];
    const [row] = buildUserDailyActivity(events, { sessionGapMs: 15 * 60 * 1000, tailMs: 60 * 1000 });
    // 5-min gap + 1-min tail credit for the last event
    expect(row.activeMinutes).toBe(6);
  });

  it("does not let a long gap (tab left open) inflate active time", () => {
    const events = [
      { user_id: "u1", event_name: "user_logged_in", created_at: "2026-09-20T09:00:00.000Z" },
      { user_id: "u1", event_name: "post_liked", created_at: "2026-09-20T20:00:00.000Z" }, // 11-hour gap
    ];
    const [row] = buildUserDailyActivity(events, { sessionGapMs: 15 * 60 * 1000, tailMs: 60 * 1000 });
    // gap capped at 15 min + 1-min tail credit
    expect(row.activeMinutes).toBe(16);
  });

  it("gives a single lone event a small flat credit instead of zero", () => {
    const events = [{ user_id: "u1", event_name: "user_logged_in", created_at: "2026-09-20T09:00:00.000Z" }];
    const [row] = buildUserDailyActivity(events, { tailMs: 60 * 1000 });
    expect(row.activeMinutes).toBe(1);
  });

  it("ignores events with no user_id (never signed in)", () => {
    const events = [{ user_id: null, event_name: "user_logged_in", created_at: "2026-09-20T09:00:00.000Z" }];
    expect(buildUserDailyActivity(events)).toHaveLength(0);
  });
});

describe("buildCumulativeSeries", () => {
  it("starts from the baseline and climbs by however many were created each day", () => {
    const timestamps = [
      "2026-09-20T09:00:00.000Z",
      "2026-09-20T15:00:00.000Z", // same day as above -- 2 that day
      "2026-09-22T09:00:00.000Z",
    ];
    const series = buildCumulativeSeries(timestamps, 10, "2026-09-20T00:00:00.000Z", "2026-09-23T00:00:00.000Z");
    expect(series).toEqual([
      { date: "2026-09-20", total: 12 },
      { date: "2026-09-21", total: 12 },
      { date: "2026-09-22", total: 13 },
    ]);
  });

  it("never dips -- a day with nothing new repeats the running total", () => {
    const series = buildCumulativeSeries([], 5, "2026-09-20T00:00:00.000Z", "2026-09-22T00:00:00.000Z");
    expect(series.map((s) => s.total)).toEqual([5, 5]);
  });

  it("treats a zero baseline as a real start, not a gap", () => {
    const series = buildCumulativeSeries(["2026-09-21T00:00:00.000Z"], 0, "2026-09-20T00:00:00.000Z", "2026-09-22T00:00:00.000Z");
    expect(series).toEqual([
      { date: "2026-09-20", total: 0 },
      { date: "2026-09-21", total: 1 },
    ]);
  });
});
