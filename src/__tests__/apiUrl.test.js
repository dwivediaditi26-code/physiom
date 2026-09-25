// apiUrl()/siteOrigin(): relative on the web, absolute live-site URLs inside
// the Capacitor app (where the page runs on https://localhost and a bare
// "/api/..." path reaches nothing).
import { describe, test, expect, vi, beforeEach } from "vitest";

const isNative = vi.fn();
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => isNative() } }));

import { apiUrl, siteOrigin } from "../apiUrl.js";

describe("apiUrl / siteOrigin", () => {
  beforeEach(() => isNative.mockReset());

  test("web: API paths stay relative, links use this page's origin", () => {
    isNative.mockReturnValue(false);
    expect(apiUrl("/api/parse")).toBe("/api/parse");
    expect(siteOrigin()).toBe(window.location.origin);
  });

  test("native app: API paths and links point at the live site", () => {
    isNative.mockReturnValue(true);
    expect(apiUrl("/api/parse")).toBe("https://physiom-sbs4.vercel.app/api/parse");
    expect(siteOrigin()).toBe("https://physiom-sbs4.vercel.app");
  });
});
