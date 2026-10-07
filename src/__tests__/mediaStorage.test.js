// Phase A of the PhysioFeed media plan: every upload goes through putMedia(), which enforces a hard
// size limit per bucket (a backstop behind the screens' own checks) and records an upload event.
import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn(async () => ({ error: null }));
const track = vi.fn();
vi.mock("../supabase.js", () => ({
  supabase: { storage: { from: (bucket) => ({ upload: (...a) => upload(bucket, ...a), getPublicUrl: (path) => ({ data: { publicUrl: `https://store.test/${bucket}/${path}` } }) }) } },
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: (...a) => track(...a) }));

import { putMedia, BUCKET_LIMIT_MB, bucketLimitBytes, STORAGE_BACKEND } from "../physiofeed/data/mediaStorage.js";

const file = (size, type = "image/jpeg") => { const f = new File(["x"], "a.jpg", { type }); Object.defineProperty(f, "size", { value: size }); return f; };
beforeEach(() => { upload.mockClear(); track.mockClear(); });

describe("putMedia", () => {
  it("stores the file under the person's own folder and returns the public URL", async () => {
    const url = await putMedia({ bucket: "post-images", uid: "u1", file: file(1000), ext: "jpg" });
    expect(url).toMatch(/^https:\/\/store\.test\/post-images\/u1\/\d+_[a-z0-9]+\.jpg$/);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe("post-images");
    expect(upload.mock.calls[0][3]).toMatchObject({ upsert: false, contentType: "image/jpeg" });
  });
  it("refuses a file over the bucket's limit and never uploads it", async () => {
    await expect(putMedia({ bucket: "post-images", uid: "u1", file: file(11 * 1024 * 1024), ext: "jpg" })).rejects.toThrow(/too large.*10MB/);
    expect(upload).not.toHaveBeenCalled();
  });
  it("gives videos a larger limit than photos, and documents a smaller one", () => {
    expect(BUCKET_LIMIT_MB["post-videos"]).toBeGreaterThan(BUCKET_LIMIT_MB["post-images"]);
    expect(BUCKET_LIMIT_MB["post-documents"]).toBeLessThan(BUCKET_LIMIT_MB["post-images"]);
    expect(bucketLimitBytes("resumes")).toBe(8 * 1024 * 1024);
    expect(bucketLimitBytes("nope")).toBeNull();
  });
  it("rejects an unknown bucket", async () => {
    await expect(putMedia({ bucket: "nope", uid: "u1", file: file(10), ext: "jpg" })).rejects.toThrow(/Unknown storage bucket/);
  });
  it("records one upload event with the kind, size and store", async () => {
    await putMedia({ bucket: "post-videos", uid: "u1", file: file(5000, "video/mp4"), ext: "mp4" });
    expect(track).toHaveBeenCalledWith("media_uploaded", { entityType: "media", entityId: "post-videos", properties: { bytes: 5000, type: "video/mp4", backend: STORAGE_BACKEND } });
  });
  it("passes a storage error up instead of swallowing it, and records nothing", async () => {
    upload.mockResolvedValueOnce({ error: { message: "The resource already exists" } });
    await expect(putMedia({ bucket: "post-images", uid: "u1", file: file(10), ext: "jpg" })).rejects.toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });
});
