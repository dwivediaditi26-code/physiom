// vitposeEngine.js — ViTPose ONNX engine for lateral posture analysis
// Drop this file into src/ alongside AppFull.jsx
//
// What this does:
//   • Loads onnxruntime-web from CDN (one-time, cached)
//   • Downloads ViTPose-S ONNX model (~25 MB, cached in memory)
//   • Preprocesses any image to the model's required 192×256 input
//   • Decodes 17-keypoint COCO heatmaps → (x, y, confidence)
//   • Maps COCO keypoints → MediaPipe 33-landmark format
//   • Returns landmarks in exactly the same shape as MediaPipe's poseLandmarks
//
// Usage (in AppFull.jsx):
//   import { runViTPoseLateral, warmupViTPose } from "./vitposeEngine";
//
// Call warmupViTPose() once on component mount to pre-load the model.
// Then replace runMediaPipe(img) with runViTPoseLateral(img) for left/right views.

// ─── Config ────────────────────────────────────────────────────────────────────
// ViTPose-S input resolution (matches training config)
const INPUT_W = 192;
const INPUT_H = 256;

// ImageNet normalisation — same as ViTPose training pipeline
const NORM_MEAN = [0.485, 0.456, 0.406];
const NORM_STD  = [0.229, 0.224, 0.225];

// Heatmap output size (model downsamples by 4×)
const HM_W = INPUT_W / 4; // 48
const HM_H = INPUT_H / 4; // 64

// ONNX runtime CDN — pinned version for stability
const ORT_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js";

// ViTPose-S ONNX model — publicly available on HuggingFace
// Model: ViTPose-S trained on COCO + AIC, converted to ONNX fp32
// Size: ~25 MB, cached in memory after first load
const VITPOSE_MODEL_URL =
  "https://huggingface.co/JunkyByte/easy_ViTPose/resolve/main/torch/coco/vitpose-s-coco.onnx";

// ─── COCO 17 → MediaPipe 33 keypoint index map ─────────────────────────────────
// MediaPipe has 33 landmarks; ViTPose/COCO has 17.
// Unmapped MediaPipe slots stay at visibility=0 (e.g. hand/foot detail landmarks).
// The analysis engine only uses the indices listed below.
const COCO_TO_MP = {
  0:  0,   // nose           → nose
  1:  2,   // left_eye       → left_eye (MP uses index 2 for left_eye)
  2:  5,   // right_eye      → right_eye (MP index 5)
  3:  7,   // left_ear       → left_ear
  4:  8,   // right_ear      → right_ear
  5:  11,  // left_shoulder  → left_shoulder
  6:  12,  // right_shoulder → right_shoulder
  7:  13,  // left_elbow     → left_elbow
  8:  14,  // right_elbow    → right_elbow
  9:  15,  // left_wrist     → left_wrist
  10: 16,  // right_wrist    → right_wrist
  11: 23,  // left_hip       → left_hip
  12: 24,  // right_hip      → right_hip
  13: 25,  // left_knee      → left_knee
  14: 26,  // right_knee     → right_knee
  15: 27,  // left_ankle     → left_ankle
  16: 28,  // right_ankle    → right_ankle
};

// ─── Module-level singletons (loaded once, reused across calls) ─────────────────
let ortLoaded    = false;
let ortLoading   = null;          // Promise while loading
let vitSession   = null;
let sessLoading  = null;          // Promise while loading

// ─── Step 1: Load onnxruntime-web from CDN ─────────────────────────────────────
async function ensureORT() {
  if (ortLoaded && window.ort) return;
  if (ortLoading) { await ortLoading; return; }

  ortLoading = new Promise((res, rej) => {
    if (window.ort) { ortLoaded = true; res(); return; }
    const s = document.createElement("script");
    s.src = ORT_CDN;
    s.onload  = () => { ortLoaded = true; res(); };
    s.onerror = () => rej(new Error("Failed to load onnxruntime-web from CDN"));
    document.head.appendChild(s);
  });

  await ortLoading;
  ortLoading = null;
}

// ─── Step 2: Load ViTPose-S ONNX model ─────────────────────────────────────────
async function ensureModel() {
  if (vitSession) return vitSession;
  if (sessLoading) return sessLoading;

  sessLoading = (async () => {
    await ensureORT();

    const session = await window.ort.InferenceSession.create(VITPOSE_MODEL_URL, {
      executionProviders: ["wasm"],      // WebAssembly — works in all modern browsers
      graphOptimizationLevel: "all",
      // WASM threads improve speed on desktop; gracefully ignored on mobile
      sessionOptions: { interOpNumThreads: 2, intraOpNumThreads: 2 },
    });

    vitSession = session;
    sessLoading = null;
    return session;
  })();

  return sessLoading;
}

// ─── Step 3: Preprocess image → Float32 tensor [1, 3, H, W] ────────────────────
function preprocessImage(imgEl) {
  const canvas = document.createElement("canvas");
  canvas.width  = INPUT_W;
  canvas.height = INPUT_H;
  const ctx = canvas.getContext("2d");

  // Letterbox-stretch to model input size
  ctx.drawImage(imgEl, 0, 0, INPUT_W, INPUT_H);
  const { data } = ctx.getImageData(0, 0, INPUT_W, INPUT_H);

  // CHW layout: [R-plane, G-plane, B-plane]
  const n     = INPUT_W * INPUT_H;
  const float = new Float32Array(3 * n);

  for (let i = 0; i < n; i++) {
    const pi = i * 4;
    float[i]         = (data[pi]     / 255 - NORM_MEAN[0]) / NORM_STD[0]; // R
    float[n + i]     = (data[pi + 1] / 255 - NORM_MEAN[1]) / NORM_STD[1]; // G
    float[2 * n + i] = (data[pi + 2] / 255 - NORM_MEAN[2]) / NORM_STD[2]; // B
  }

  return new window.ort.Tensor("float32", float, [1, 3, INPUT_H, INPUT_W]);
}

// ─── Step 4: Decode heatmaps → keypoint coordinates ────────────────────────────
// ViTPose output: [1, 17, HM_H, HM_W] float32 heatmaps
// Each keypoint heatmap has a peak at the predicted joint location.
// We find the argmax and apply sub-pixel refinement via the distribution shift trick.
function decodeHeatmaps(heatmapData) {
  const keypoints = [];
  const stride    = HM_H * HM_W;

  for (let k = 0; k < 17; k++) {
    const offset = k * stride;

    // Find argmax in this keypoint's heatmap
    let maxVal = -Infinity;
    let maxIdx = 0;
    for (let i = 0; i < stride; i++) {
      if (heatmapData[offset + i] > maxVal) {
        maxVal = heatmapData[offset + i];
        maxIdx = i;
      }
    }

    const px = maxIdx % HM_W;
    const py = Math.floor(maxIdx / HM_W);

    // Sub-pixel refinement: shift toward neighbouring peak if it's stronger
    // (standard Dark pose post-processing, simplified for browser)
    let rx = px, ry = py;
    if (px > 0 && px < HM_W - 1) {
      const l = heatmapData[offset + py * HM_W + px - 1];
      const r = heatmapData[offset + py * HM_W + px + 1];
      rx += r > l ? 0.25 : (l > r ? -0.25 : 0);
    }
    if (py > 0 && py < HM_H - 1) {
      const u = heatmapData[offset + (py - 1) * HM_W + px];
      const d = heatmapData[offset + (py + 1) * HM_W + px];
      ry += d > u ? 0.25 : (u > d ? -0.25 : 0);
    }

    // Convert to [0,1] normalised coords (matching MediaPipe convention)
    const xNorm = rx / HM_W;
    const yNorm = ry / HM_H;

    // Confidence: sigmoid of max heatmap value — gives a 0–1 visibility score
    const confidence = 1 / (1 + Math.exp(-maxVal));

    keypoints.push({ xNorm, yNorm, confidence });
  }

  return keypoints;
}

// ─── Step 5: Map COCO keypoints → MediaPipe 33-landmark array ──────────────────
// Fills a 33-element array matching MediaPipe's poseLandmarks structure.
// Unmapped slots get visibility=0 so the analysis engine ignores them safely.
function cocoToMediaPipe(keypoints) {
  // Initialise all 33 slots with zero visibility
  const lm = Array.from({ length: 33 }, () => ({
    x: 0.5, y: 0.5, z: 0, visibility: 0,
  }));

  for (const [cocoIdx, mpIdx] of Object.entries(COCO_TO_MP)) {
    const kp = keypoints[Number(cocoIdx)];
    if (!kp) continue;
    lm[mpIdx] = {
      x: kp.xNorm,
      y: kp.yNorm,
      z: 0,               // ViTPose doesn't provide Z; analysis engine handles null Z gracefully
      visibility: kp.confidence,
    };
  }

  // Synthesise missing MediaPipe-only landmarks that analysis code expects
  // left_eye_inner (1) = average of nose (0) and left_eye (2)
  if (lm[0].visibility > 0.3 && lm[2].visibility > 0.3) {
    lm[1] = { x: (lm[0].x + lm[2].x) / 2, y: (lm[0].y + lm[2].y) / 2, z: 0, visibility: Math.min(lm[0].visibility, lm[2].visibility) };
  }
  // right_eye_inner (4) = average of nose (0) and right_eye (5)
  if (lm[0].visibility > 0.3 && lm[5].visibility > 0.3) {
    lm[4] = { x: (lm[0].x + lm[5].x) / 2, y: (lm[0].y + lm[5].y) / 2, z: 0, visibility: Math.min(lm[0].visibility, lm[5].visibility) };
  }

  return lm;
}

// ─── Main export: run ViTPose on a lateral-view image ──────────────────────────
// imgEl: HTMLImageElement or HTMLCanvasElement
// Returns: MediaPipe-format poseLandmarks array (33 items), or null on failure
export async function runViTPoseLateral(imgEl) {
  try {
    const session = await ensureModel();
    const tensor  = preprocessImage(imgEl);

    // Determine input name (usually "input" but may vary by export)
    const inputName = session.inputNames[0];
    const feeds     = { [inputName]: tensor };
    const output    = await session.run(feeds);

    // Grab heatmap tensor (first output)
    const heatmapTensor = output[session.outputNames[0]];
    const heatmapData   = heatmapTensor.data; // Float32Array [1×17×HM_H×HM_W]

    const keypoints = decodeHeatmaps(heatmapData);
    const landmarks = cocoToMediaPipe(keypoints);

    // Sanity check: at least ONE shoulder and ONE hip must be detected.
    // This is a lateral photo by definition — the far-side shoulder/hip is
    // expected to be occluded by the body and legitimately low-confidence.
    // Requiring BOTH sides (as before) rejected almost every genuine profile
    // shot, since a clean side-on photo is exactly the case where the far
    // side is hidden. Near-side-only visibility is what actually matters.
    const hasBody = (
      Math.max(landmarks[11].visibility, landmarks[12].visibility) > 0.3 &&  // either shoulder
      Math.max(landmarks[23].visibility, landmarks[24].visibility) > 0.3     // either hip
    );
    if (!hasBody) {
      console.warn("ViTPose: low confidence on key lateral landmarks — will fallback to MediaPipe");
      return null;
    }

    return landmarks;
  } catch (err) {
    console.error("ViTPose inference failed:", err);
    return null;  // caller falls back to MediaPipe
  }
}

// ─── Warmup: call this once on component mount ─────────────────────────────────
// Pre-loads the ORT runtime and model so the first lateral analysis is fast.
export async function warmupViTPose() {
  try {
    await ensureModel();
    console.log("ViTPose-S loaded and ready");
  } catch (err) {
    console.warn("ViTPose warmup failed (will retry on first use):", err);
  }
}

// ─── Status helper — lets UI show a loading indicator ──────────────────────────
export function vitposeStatus() {
  if (vitSession) return "ready";
  if (sessLoading) return "loading";
  return "idle";
}
