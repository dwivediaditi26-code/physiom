// Regression test for a real, dated production risk found while
// working on the Subjective AI parser: Groq deprecated
// llama-3.3-70b-versatile on 2026-06-17 with a shutdown date of
// 2026-08-16 (console.groq.com/docs/deprecations). All three places in
// this codebase that called Groq were still hardcoded to that exact
// model id -- after the shutdown date every /api/parse and /api/chat
// call would 502 with "model ... has been decommissioned" (the real
// error text captured in groqErrorDetail.test.jsx, from hitting this
// live). Migrated to Groq's recommended replacement, openai/gpt-oss-120b.
//
// This test isn't about the deprecation date -- it's a tripwire so an
// unrelated future edit can't silently reintroduce the dead model id
// (e.g. a careless copy-paste of an old code sample) without a test
// noticing.

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GROQ_CONFIG } from "../groqSystemPrompt.js";

const parseSrc = readFileSync(resolve(process.cwd(), "api/parse.js"), "utf-8");
const chatSrc = readFileSync(resolve(process.cwd(), "api/chat.js"), "utf-8");

describe("Groq model migration off the deprecated llama-3.3-70b-versatile", () => {
  // Checks the actual `model:` assignment specifically (a regex on
  // `model:\s*['"]...['"]`), not a blanket "file doesn't contain this
  // substring" -- the migration comment left in both files deliberately
  // names the old model id for future readers, so a blanket check would
  // incorrectly fail on that explanatory prose rather than real code.
  test("api/parse.js's actual model field is the replacement, not the deprecated id", () => {
    expect(parseSrc).not.toMatch(/model:\s*['"]llama-3\.3-70b-versatile['"]/);
    expect(parseSrc).toMatch(/model:\s*['"]openai\/gpt-oss-120b['"]/);
  });

  test("api/chat.js's actual model field is the replacement, not the deprecated id", () => {
    expect(chatSrc).not.toMatch(/model:\s*['"]llama-3\.3-70b-versatile['"]/);
    expect(chatSrc).toMatch(/model:\s*['"]openai\/gpt-oss-120b['"]/);
  });

  test("GROQ_CONFIG (src/groqSystemPrompt.js) no longer references the deprecated model id", () => {
    expect(GROQ_CONFIG.model).toBe("openai/gpt-oss-120b");
  });

  test("gpt-oss is a reasoning model -- reasoning kept low-effort and out of the response, since neither endpoint reads message.reasoning", () => {
    expect(parseSrc).toMatch(/reasoning_effort:\s*['"]low['"]/);
    expect(parseSrc).toMatch(/include_reasoning:\s*false/);
    expect(chatSrc).toMatch(/reasoning_effort:\s*['"]low['"]/);
    expect(chatSrc).toMatch(/include_reasoning:\s*false/);
  });

  test("api/parse.js still uses max_completion_tokens (current Groq param name), not the legacy max_tokens alias", () => {
    expect(parseSrc).toContain("max_completion_tokens");
  });
});
