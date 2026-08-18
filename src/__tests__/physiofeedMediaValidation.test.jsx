// Coverage for the pure validation helpers in src/physiofeed/lib/media.js
// (2026-08-18, real media upload rollout). compressImage()/getVideoDuration()
// need real image/video decoding that jsdom doesn't provide, so those are
// exercised indirectly via Composer.jsx in real usage rather than unit
// tested here -- this file covers the size/type guard rails, which are
// exactly the part that protects Supabase Storage from oversized uploads.
import { describe, it, expect } from "vitest";
import { validateImageFile, validateVideoFile, MAX_IMAGE_MB, MAX_VIDEO_MB } from "../physiofeed/lib/media.js";

function fakeFile(type, sizeBytes, name = "file") {
  const file = new File([new Uint8Array(Math.max(sizeBytes, 1))], name, { type });
  return file;
}

describe("PhysioFeed media validation", () => {
  it("accepts a small real image file", () => {
    expect(validateImageFile(fakeFile("image/jpeg", 1024))).toBeNull();
  });
  it("rejects a non-image file for photo upload", () => {
    expect(validateImageFile(fakeFile("application/pdf", 1024))).toMatch(/image/i);
  });
  it("rejects an image over the size limit", () => {
    expect(validateImageFile(fakeFile("image/png", (MAX_IMAGE_MB + 1) * 1024 * 1024))).toMatch(/MB/);
  });
  it("accepts a small real video file", () => {
    expect(validateVideoFile(fakeFile("video/mp4", 1024))).toBeNull();
  });
  it("rejects a non-video file for video upload", () => {
    expect(validateVideoFile(fakeFile("image/jpeg", 1024))).toMatch(/video/i);
  });
  it("rejects a video over the size limit", () => {
    expect(validateVideoFile(fakeFile("video/mp4", (MAX_VIDEO_MB + 1) * 1024 * 1024))).toMatch(/MB/);
  });
});
