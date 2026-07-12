// Regression test for a real live failure: a case failed 3 times with
// only "Groq error" shown in the console -- api/parse.js's 502 branch
// actually includes the real underlying reason from Groq in a `detail`
// field, but callParseOnce only ever read `.error`, so every possible
// Groq-side failure (bad key, rate limit, deprecated model, outage)
// looked identical and undiagnosable from the console.

import { describe, test, expect, vi } from "vitest";
import { runOne } from "../aiIntakeTestHarness.js";

describe("Groq error detail is surfaced, not swallowed", () => {
  test("a 502 with a detail field includes that detail in the thrown error message", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "Groq error", detail: "model `llama-3.3-70b-versatile` has been decommissioned" }),
    });

    const promise = runOne("test narrative", { label: "detail test" });
    await vi.advanceTimersByTimeAsync(2100); // 1st retry backoff
    await vi.advanceTimersByTimeAsync(4100); // 2nd retry backoff
    const result = await promise;

    expect(result.error).toContain("Groq error");
    expect(result.error).toContain("decommissioned");
    vi.useRealTimers();
  });
});
