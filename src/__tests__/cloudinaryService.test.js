import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadImage, uploadErrorMessage, isRealPhoto, CLOUDINARY_UPLOAD_URL } from "../services/cloudinary.js";

// jsdom never loads images, so stand in an Image that "loads" at a chosen size.
function stubImage(width, height) {
  class FakeImage {
    set src(_v) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      queueMicrotask(() => (width > 0 ? this.onload?.() : this.onerror?.()));
    }
  }
  vi.stubGlobal("Image", FakeImage);
}

const file = () => new File(["x"], "photo.jpg", { type: "image/jpeg" });

describe("shared Cloudinary upload", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("isRealPhoto rejects an empty stub image and accepts a real-sized one", async () => {
    stubImage(1, 1);
    expect(await isRealPhoto(file())).toBe(false);
    stubImage(800, 600);
    expect(await isRealPhoto(file())).toBe(true);
    stubImage(0, 0); // fails to load
    expect(await isRealPhoto(file())).toBe(false);
  });

  it("does not call Cloudinary for an empty stub image", async () => {
    stubImage(1, 1);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadImage(file(), "slot_1")).rejects.toThrow("empty-image");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the file, the ml_default preset and the slot id, and returns Cloudinary's answer", async () => {
    stubImage(800, 600);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ public_id: "slot_1" }) }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await uploadImage(file(), "slot_1");
    expect(out).toEqual({ public_id: "slot_1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(CLOUDINARY_UPLOAD_URL);
    expect(init.method).toBe("POST");
    expect(init.body.get("upload_preset")).toBe("ml_default");
    expect(init.body.get("public_id")).toBe("slot_1");
    expect(init.body.get("file")).toBeInstanceOf(File);
  });

  it("fails when Cloudinary answers with an error status", async () => {
    stubImage(800, 600);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    await expect(uploadImage(file(), "slot_1")).rejects.toThrow("Upload failed");
  });

  it("fails when Cloudinary says the slot already held a photo (nothing was replaced)", async () => {
    stubImage(800, 600);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ existing: true }) })));
    await expect(uploadImage(file(), "slot_1")).rejects.toThrow("blocked-overwrite");
  });

  it("gives each failure its own message", () => {
    expect(uploadErrorMessage(new Error("empty-image"))).toMatch(/looked empty/);
    expect(uploadErrorMessage(new Error("blocked-overwrite"))).toMatch(/already has an image/);
    expect(uploadErrorMessage(new Error("Upload failed"))).toMatch(/check your connection/);
    expect(uploadErrorMessage(undefined)).toMatch(/check your connection/);
  });
});
