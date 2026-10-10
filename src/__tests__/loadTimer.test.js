// The open-speed timer: one event per page load, only times and connection type, and nothing
// when the page was hidden while it opened.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent }));

import { markAppReady, markPatientsReady, connectionFacts, resetLoadTimerForTests } from "../analytics/loadTimer.js";
import { buildSpeedStats, SLOW_OPEN_MS } from "../../api/admin/_lib/analyticsMath.js";

beforeEach(() => { trackEvent.mockClear(); resetLoadTimerForTests(); localStorage.clear(); });
afterEach(() => vi.useRealTimers());

describe("reporting an open", () => {
  it("sends one app_loaded event with times, connection and a size band, and no patient data", () => {
    markAppReady();
    markPatientsReady({ count: 7, ok: true });
    markPatientsReady({ count: 8, ok: true }); // a second call changes nothing
    expect(trackEvent).toHaveBeenCalledTimes(1);
    const [name, options] = trackEvent.mock.calls[0];
    expect(name).toBe("app_loaded");
    const p = options.properties;
    expect(p.appReadyMs).toBeGreaterThanOrEqual(0);
    expect(p.patientsReadyMs).toBeGreaterThanOrEqual(p.appReadyMs);
    expect(p.patients).toBe("6-20"); // a band, not the number
    expect(p.patientsFailed).toBe(false);
    expect(p.visit).toBe("first");
    expect(Object.keys(p)).not.toContain("patientNames");
    expect(JSON.stringify(p)).not.toMatch(/name|dem_|dob/i);
  });

  it("says 'return' on the next visit", () => {
    markAppReady(); markPatientsReady({ count: 0 });
    resetLoadTimerForTests(); trackEvent.mockClear();
    markAppReady(); markPatientsReady({ count: 0 });
    expect(trackEvent.mock.calls[0][1].properties.visit).toBe("return");
  });

  it("marks a failed cloud read", () => {
    markAppReady(); markPatientsReady({ count: 3, ok: false });
    expect(trackEvent.mock.calls[0][1].properties.patientsFailed).toBe(true);
  });

  it("reports after 30 s with the patients marked not ready when they never arrive", () => {
    vi.useFakeTimers();
    markAppReady();
    expect(trackEvent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30000);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent.mock.calls[0][1].properties.patientsReadyMs).toBeNull();
  });

  it("sends nothing when the page was hidden while it opened", () => {
    document.dispatchEvent(new Event("visibilitychange")); // visible: stays reportable
    const spy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    spy.mockRestore();
    markAppReady(); markPatientsReady({ count: 1 });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe("the connection the browser reports", () => {
  it("passes on the type, speed and delay", () => {
    expect(connectionFacts({ connection: { effectiveType: "3g", downlink: 1.4, rtt: 300, saveData: true } }))
      .toEqual({ connection: "3g", downlinkMbps: 1.4, rttMs: 300, saveData: true });
  });
  it("says unknown where the browser does not tell (iPhone)", () => {
    expect(connectionFacts({})).toEqual({ connection: "unknown", downlinkMbps: null, rttMs: null, saveData: false });
  });
});

describe("what the admin page shows", () => {
  const load = (user, appReadyMs, patientsReadyMs, extra = {}) => ({ event_name: "app_loaded", user_id: user, properties: { appReadyMs, patientsReadyMs, connection: "4g", visit: "return", ...extra } });

  it("is empty when nobody has opened the app yet", () => {
    expect(buildSpeedStats([])).toEqual({ total: null, byConnection: [], byVisit: [] });
    expect(buildSpeedStats([{ event_name: "page_view", properties: {} }]).total).toBeNull();
  });

  it("gives typical and slowest-tenth times, and the share over 5 s", () => {
    const events = [1000, 1200, 1500, 1800, 2000, 2200, 2500, 3000, 4000, 9000].map((ms, i) => load(`u${i % 3}`, ms, ms + 500));
    const { total } = buildSpeedStats(events);
    expect(total.loads).toBe(10);
    expect(total.students).toBe(3);
    expect(total.medianOpenMs).toBe(2000);
    expect(total.p90OpenMs).toBe(4000);
    expect(total.slowPct).toBe(10); // one open over SLOW_OPEN_MS
    expect(SLOW_OPEN_MS).toBe(5000);
    expect(total.medianPatientsMs).toBe(2500);
  });

  it("splits by connection and counts patients that never arrived", () => {
    const events = [
      load("a", 1500, 2000), load("b", 1600, 2100),
      load("c", 8000, null, { connection: "3g" }), load("d", 9000, 20000, { connection: "3g", patientsFailed: true }),
      load("e", 2000, 2500, { connection: "unknown" }),
    ];
    const s = buildSpeedStats(events);
    expect(s.byConnection.map((r) => r.key)).toEqual(["4g", "3g", "unknown"]);
    const weak = s.byConnection.find((r) => r.key === "3g");
    expect(weak.slowPct).toBe(100);
    expect(weak.patientsNotReady).toBe(1);
    expect(weak.patientsFailed).toBe(1);
    expect(s.total.patientsNotReady).toBe(1);
  });

  it("ignores events without a usable open time", () => {
    expect(buildSpeedStats([{ event_name: "app_loaded", properties: { appReadyMs: "slow" } }]).total).toBeNull();
  });
});
