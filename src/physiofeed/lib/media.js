// Client-side media prep for real PhysioFeed uploads -- pure browser APIs
// only (canvas, <video> metadata, File/Blob). No Supabase/network calls
// live here -- those belong in data/db.js (uploadPostImage/uploadPostVideo),
// same "db.js is the only thing that talks to the backend" rule as the
// rest of this app. Composer.jsx wires these together: validate -> (for
// images) compress -> db.js uploads -> createPost().

export const MAX_IMAGE_MB = 10;
export const MAX_IMAGES = 10; // matches the "1-10 images per post" spec
export const MAX_VIDEO_MB = 100;
export const MAX_VIDEO_SECONDS = 90;

const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.82;

export function validateImageFile(file) {
  if (!file.type.startsWith("image/")) return "That's not an image file.";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Images must be under ${MAX_IMAGE_MB}MB.`;
  return null;
}

export function validateVideoFile(file) {
  if (!file.type.startsWith("video/")) return "That's not a video file.";
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) return `Videos must be under ${MAX_VIDEO_MB}MB.`;
  return null;
}

// The only reliable cross-browser way to read a video's real duration
// without a server-side probe: load it into a throwaway <video> element
// and wait for its metadata.
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that video file."));
    };
    v.src = url;
  });
}

// Downscales + re-encodes an image to JPEG via canvas -- cuts typical
// phone-camera photos (4-12MB) down to a few hundred KB before upload.
// Deliberately no video equivalent: real video compression needs an actual
// encoder (ffmpeg.wasm, or a server-side transcode job), which is a
// separate project on its own -- out of scope for V1. Videos are only
// size/duration-limited, not compressed.
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
        const scale = COMPRESS_MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image."))), "image/jpeg", COMPRESS_QUALITY);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image file."));
    };
    img.src = url;
  });
}
