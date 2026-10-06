// "Replace photo" never worked: the open upload preset cannot overwrite an existing photo. An admin
// now gets a signed upload (the server checks is_admin and signs that one photo id); everyone else
// keeps the old behaviour.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
import { supabase } from "../supabase.js";
import { uploadImage, uploadErrorMessage, CLOUDINARY_UPLOAD_URL } from "../services/cloudinary.js";
import { signUpload } from "../../api/admin/cloudinarySign.js";

class FakeImage { set src(_v) { this.naturalWidth = 800; this.naturalHeight = 600; queueMicrotask(() => this.onload?.()); } }
const file = () => new File(["x"], "photo.jpg", { type: "image/jpeg" });
const signIn = () => vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:t"); URL.revokeObjectURL = vi.fn();
  vi.stubGlobal("Image", FakeImage);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("signUpload (server)", () => {
  it("signs the sorted parameters followed by the secret with SHA-1, as Cloudinary requires", () => {
    const sig = signUpload({ timestamp: 1700000000, public_id: "c_heart_rate", overwrite: "true", invalidate: "true" }, "s3cret");
    const expected = crypto.createHash("sha1").update("invalidate=true&overwrite=true&public_id=c_heart_rate&timestamp=1700000000s3cret").digest("hex");
    expect(sig).toBe(expected);
  });
});

describe("uploadImage", () => {
  it("an admin uploads with the signature and overwrite on, and never uses the open preset", async () => {
    signIn();
    const fetchMock = vi.fn(async (url) => url === "/api/admin/cloudinarySign"
      ? { ok: true, status: 200, json: async () => ({ api_key: "k", timestamp: 5, public_id: "slot_1", signature: "sig" }) }
      : { ok: true, json: async () => ({ public_id: "slot_1" }) });
    vi.stubGlobal("fetch", fetchMock);
    const out = await uploadImage(file(), "slot_1");
    expect(out).toEqual({ public_id: "slot_1" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(CLOUDINARY_UPLOAD_URL);
    expect(init.body.get("signature")).toBe("sig");
    expect(init.body.get("overwrite")).toBe("true");
    expect(init.body.get("upload_preset")).toBeNull();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("a non-admin (server says 403) falls back to the open preset, as before", async () => {
    signIn();
    const fetchMock = vi.fn(async (url) => url === "/api/admin/cloudinarySign"
      ? { ok: false, status: 403, json: async () => ({}) }
      : { ok: true, json: async () => ({ public_id: "slot_1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await uploadImage(file(), "slot_1");
    expect(fetchMock.mock.calls[1][1].body.get("upload_preset")).toBe("ml_default");
  });

  it("an admin on a server without the Cloudinary keys gets a clear message when the photo exists", async () => {
    signIn();
    const fetchMock = vi.fn(async (url) => url === "/api/admin/cloudinarySign"
      ? { ok: false, status: 501, json: async () => ({ error: "not_configured" }) }
      : { ok: true, json: async () => ({ existing: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const err = await uploadImage(file(), "slot_1").catch((e) => e);
    expect(err.message).toBe("replace-not-set-up");
    expect(uploadErrorMessage(err)).toMatch(/CLOUDINARY_API_KEY/);
  });

  it("signed out: no sign request at all", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ public_id: "slot_1" }) }));
    vi.stubGlobal("fetch", fetchMock);
    await uploadImage(file(), "slot_1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(CLOUDINARY_UPLOAD_URL);
  });
});
