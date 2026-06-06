// contourEngine.js — Sagittal Body Contour Analysis Engine
//
// PURPOSE
// Extracts and analyses the posterior body silhouette from a lateral-view photograph.
// Produces clinically defensible contour appearance indices WITHOUT implying radiographic
// measurements. No Cobb angles. No spinal curvature diagnoses from surface landmarks alone.
//
// PIPELINE
//  1. MediaPipe SelfieSegmentation → person mask
//  2. Posterior contour extraction from mask
//  3. Thoracic Curve Appearance Index (TCAI)
//  4. Lumbar Curve Appearance Index (LCAI)
//  5. Plumb line offsets (lateral malleolus reference)
//  6. Confidence scoring
//
// Reference: Kendall FP et al. Muscles: Testing and Function, 5th ed.

// ─── CDN ──────────────────────────────────────────────────────────────────────
const SEG_CDN  = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js";
const SEG_FILE = f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`;

// ─── Singleton segmenter ──────────────────────────────────────────────────────
let _segmenter = null;
let _segLoading = null;

async function ensureSegmenter() {
  if (_segmenter) return _segmenter;
  if (_segLoading) return _segLoading;

  _segLoading = (async () => {
    // Load MediaPipe SelfieSegmentation script
    if (!window.SelfieSegmentation) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = SEG_CDN;
        s.onload = res;
        s.onerror = () => rej(new Error("SelfieSegmentation CDN failed"));
        document.head.appendChild(s);
      });
    }

    const seg = new window.SelfieSegmentation({
      locateFile: SEG_FILE,
    });
    // modelSelection 1 = landscape model (better for full-body lateral photos)
    seg.setOptions({ modelSelection: 1 });

    await seg.initialize();
    _segmenter = seg;
    _segLoading = null;
    return seg;
  })();

  return _segLoading;
}

// ─── Segmentation → Uint8 mask ────────────────────────────────────────────────
// Returns a Uint8Array of length W×H where 255 = person, 0 = background.
async function runSegmentation(imgEl) {
  const seg = await ensureSegmenter();
  const W = imgEl.naturalWidth  || imgEl.width  || 640;
  const H = imgEl.naturalHeight || imgEl.height || 480;

  return new Promise((resolve) => {
    seg.onResults((results) => {
      // segmentationMask is an HTMLCanvasElement (greyscale, white = person)
      const maskCanvas = results.segmentationMask;
      const ctx = maskCanvas.getContext("2d");
      const px  = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      // Resize mask to match image dims if needed
      const out = new Uint8Array(W * H);
      const scaleX = maskCanvas.width  / W;
      const scaleY = maskCanvas.height / H;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const mx = Math.round(x * scaleX);
          const my = Math.round(y * scaleY);
          const idx = (my * maskCanvas.width + mx) * 4;
          // Red channel = segmentation confidence (white = 255 = person)
          out[y * W + x] = px.data[idx] > 128 ? 255 : 0;
        }
      }
      resolve({ mask: out, W, H });
    });

    seg.send({ image: imgEl }).catch(() => resolve(null));
  });
}

// ─── Posterior contour extraction ─────────────────────────────────────────────
// In a lateral view, the posterior contour is one edge of the body silhouette:
//   viewSign = +1 (person faces RIGHT): posterior = leftmost mask pixel per row
//   viewSign = -1 (person faces LEFT):  posterior = rightmost mask pixel per row
//
// Returns [{x, y}] — one point per row where the person exists.
function extractPosteriorContour(mask, W, H, viewSign) {
  const contour = [];

  for (let y = 0; y < H; y++) {
    let found = null;
    if (viewSign >= 0) {
      // Posterior = leftmost filled pixel
      for (let x = 0; x < W; x++) {
        if (mask[y * W + x] > 128) { found = x; break; }
      }
    } else {
      // Posterior = rightmost filled pixel
      for (let x = W - 1; x >= 0; x--) {
        if (mask[y * W + x] > 128) { found = x; break; }
      }
    }
    if (found !== null) contour.push({ x: found, y });
  }
  return contour;
}

// ─── Anterior contour (for body width reference) ──────────────────────────────
function extractAnteriorContour(mask, W, H, viewSign) {
  const contour = [];
  for (let y = 0; y < H; y++) {
    let found = null;
    if (viewSign >= 0) {
      for (let x = W - 1; x >= 0; x--) {
        if (mask[y * W + x] > 128) { found = x; break; }
      }
    } else {
      for (let x = 0; x < W; x++) {
        if (mask[y * W + x] > 128) { found = x; break; }
      }
    }
    if (found !== null) contour.push({ x: found, y });
  }
  return contour;
}

// ─── Contour smoothing (Gaussian-like moving average) ─────────────────────────
function smoothContour(pts, winHalf = 12) {
  return pts.map((_, i) => {
    const lo = Math.max(0, i - winHalf);
    const hi = Math.min(pts.length - 1, i + winHalf);
    let sumX = 0, sumW = 0;
    for (let j = lo; j <= hi; j++) {
      const w = 1 - Math.abs(j - i) / (winHalf + 1);
      sumX += pts[j].x * w;
      sumW += w;
    }
    return { x: sumX / sumW, y: pts[i].y };
  });
}

// ─── Body bounds from landmarks ───────────────────────────────────────────────
// Returns pixel Y positions of key anatomical reference levels.
// MediaPipe landmarks are normalised [0,1]; multiply by H to get pixels.
function getBodyBounds(lm, W, H) {
  const g = i => lm[i];
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  const py = i => (lm[i]?.y || 0) * H;
  const px = i => (lm[i]?.x || 0) * W;

  // Head top (estimated above nose)
  const headY  = V(0) ? py(0) - (py(0) * 0.04) : null;
  // Ear (C1 approximate)
  const earY   = (V(7) || V(8)) ? ((V(7) ? py(7) : 0) + (V(8) ? py(8) : 0)) / ((V(7) ? 1 : 0) + (V(8) ? 1 : 0)) : null;
  // Shoulder midpoint (T1 approximate)
  const shY    = (V(11) && V(12)) ? (py(11) + py(12)) / 2 : V(11) ? py(11) : V(12) ? py(12) : null;
  const shX    = (V(11) && V(12)) ? (px(11) + px(12)) / 2 : V(11) ? px(11) : V(12) ? px(12) : null;
  // Hip midpoint (L5/S1 approximate)
  const hipY   = (V(23) && V(24)) ? (py(23) + py(24)) / 2 : V(23) ? py(23) : V(24) ? py(24) : null;
  const hipX   = (V(23) && V(24)) ? (px(23) + px(24)) / 2 : V(23) ? px(23) : V(24) ? px(24) : null;
  // Ankle (lateral malleolus reference)
  const ankleY = (V(27) || V(28)) ? ((V(27) ? py(27) : 0) + (V(28) ? py(28) : 0)) / ((V(27) ? 1 : 0) + (V(28) ? 1 : 0)) : null;
  const ankleX = (V(27) || V(28)) ? ((V(27) ? px(27) : 0) + (V(28) ? px(28) : 0)) / ((V(27) ? 1 : 0) + (V(28) ? 1 : 0)) : null;
  // Knee
  const kneeY  = (V(25) || V(26)) ? ((V(25) ? py(25) : 0) + (V(26) ? py(26) : 0)) / ((V(25) ? 1 : 0) + (V(26) ? 1 : 0)) : null;
  // Nose
  const noseX  = V(0) ? px(0) : null;

  const bodyH  = (shY && hipY) ? hipY - shY : null;

  return { headY, earY, shY, shX, hipY, hipX, ankleY, ankleX, kneeY, noseX, bodyH, W, H };
}

// ─── Baseline (chord) between two contour endpoints ──────────────────────────
// Returns a function y → x interpolating the straight line from pt1 to pt2.
function makeChord(pt1, pt2) {
  const dy = pt2.y - pt1.y;
  if (Math.abs(dy) < 1) return () => pt1.x;
  const slope = (pt2.x - pt1.x) / dy;
  return y => pt1.x + slope * (y - pt1.y);
}

// ─── Thoracic Curve Appearance Index ─────────────────────────────────────────
// Analyses the posterior contour in the thoracic region (shoulder → thoracolumbar).
// Measures maximum posterior convexity relative to the chord.
//
// Classification thresholds are empirically derived from contour depth/bodyWidth ratio.
// These are APPEARANCE indices, NOT Cobb angle equivalents.
function analyzeThoracicContour(postContour, antContour, bounds, viewSign) {
  const { shY, hipY, H } = bounds;
  if (!shY || !hipY) return null;

  const trunkH = hipY - shY;

  // Thoracic window: from shoulder level to 55% of trunk height below shoulder
  // (approximately T1 → T12 in normal proportions)
  const thorTop = shY;
  const thorBot = shY + trunkH * 0.55;

  const thorSeg = postContour.filter(p => p.y >= thorTop && p.y <= thorBot);
  if (thorSeg.length < 20) return { grade: 0, label: "Insufficient data", confidence: 0 };

  // Body width at each level (anterior − posterior gap)
  // Used for normalization
  const bodyWidthSamples = [];
  for (const pp of thorSeg) {
    const ant = antContour.find(a => a.y === pp.y) || antContour.reduce((best, a) => Math.abs(a.y - pp.y) < Math.abs(best.y - pp.y) ? a : best);
    const w = Math.abs(ant.x - pp.x);
    if (w > 0) bodyWidthSamples.push(w);
  }
  const refWidth = bodyWidthSamples.length > 0
    ? bodyWidthSamples.reduce((a, b) => a + b, 0) / bodyWidthSamples.length
    : bounds.W * 0.15; // fallback

  // Chord from top to bottom of segment
  const chord = makeChord(thorSeg[0], thorSeg[thorSeg.length - 1]);

  // Convexity deviation: how far the posterior contour bows posteriorly from chord
  // viewSign ≥ 0: posterior = leftmost x; kyphosis → x < chord_x → deviation = chord - x
  // viewSign < 0: posterior = rightmost x; kyphosis → x > chord_x → deviation = x - chord
  let maxConvexity = 0;
  let convexitySum = 0;
  let convexityCount = 0;

  for (const pt of thorSeg) {
    const chordX = chord(pt.y);
    const dev = viewSign >= 0 ? (chordX - pt.x) : (pt.x - chordX);
    if (dev > 0) {
      convexitySum += dev;
      convexityCount++;
    }
    maxConvexity = Math.max(maxConvexity, dev);
  }

  const avgConvexity = convexityCount > 0 ? convexitySum / convexityCount : 0;
  // Use combined metric: max gives peak, avg gives sustained
  const convexityMetric = 0.6 * maxConvexity + 0.4 * avgConvexity;
  const ratio = convexityMetric / refWidth; // normalised 0–1

  let grade, label;
  if (ratio < 0.04)      { grade = 0; label = "Normal Thoracic Contour"; }
  else if (ratio < 0.09) { grade = 1; label = "Mild Increased Thoracic Contour"; }
  else if (ratio < 0.16) { grade = 2; label = "Moderate Increased Thoracic Contour"; }
  else                   { grade = 3; label = "Marked Increased Thoracic Contour"; }

  return {
    grade,
    label,
    convexityRatio: Math.round(ratio * 1000) / 10, // % for debug display
    thoracicSegmentCount: thorSeg.length,
  };
}

// ─── Lumbar Curve Appearance Index ────────────────────────────────────────────
// Analyses the posterior contour in the lumbar region (thoracolumbar → sacral).
// Measures maximum anterior concavity (inward bowing) relative to the chord.
function analyzeLumbarContour(postContour, antContour, bounds, viewSign) {
  const { shY, hipY } = bounds;
  if (!shY || !hipY) return null;

  const trunkH = hipY - shY;

  // Lumbar window: 55%–95% of trunk height below shoulder (T12 → S1 approx)
  const lumTop = shY + trunkH * 0.55;
  const lumBot = shY + trunkH * 0.95;

  const lumSeg = postContour.filter(p => p.y >= lumTop && p.y <= lumBot);
  if (lumSeg.length < 15) return { grade: 0, label: "Insufficient data", confidence: 0 };

  // Body width reference
  const bodyWidthSamples = [];
  for (const pp of lumSeg) {
    const ant = antContour.reduce((best, a) => Math.abs(a.y - pp.y) < Math.abs(best.y - pp.y) ? a : best);
    const w = Math.abs(ant.x - pp.x);
    if (w > 0) bodyWidthSamples.push(w);
  }
  const refWidth = bodyWidthSamples.length > 0
    ? bodyWidthSamples.reduce((a, b) => a + b, 0) / bodyWidthSamples.length
    : bounds.W * 0.15;

  const chord = makeChord(lumSeg[0], lumSeg[lumSeg.length - 1]);

  // Concavity deviation: how far the posterior contour bows ANTERIORLY (inward)
  // Lordosis → lumbar posterior contour bows INWARD (toward the front)
  // viewSign ≥ 0 (faces right): inward = rightward (larger x) → dev = x - chord
  // viewSign < 0 (faces left):  inward = leftward  (smaller x) → dev = chord - x
  let maxConcavity = 0;
  let concavitySum = 0;
  let concavityCount = 0;

  for (const pt of lumSeg) {
    const chordX = chord(pt.y);
    const dev = viewSign >= 0 ? (pt.x - chordX) : (chordX - pt.x);
    if (dev > 0) {
      concavitySum += dev;
      concavityCount++;
    }
    maxConcavity = Math.max(maxConcavity, dev);
  }

  const avgConcavity = concavityCount > 0 ? concavitySum / concavityCount : 0;
  const concavityMetric = 0.6 * maxConcavity + 0.4 * avgConcavity;
  const ratio = concavityMetric / refWidth;

  let grade, label;
  if (ratio < 0.03)      { grade: 0; label = "Normal Lumbar Contour"; }
  else if (ratio < 0.08) { grade = 1; label = "Mild Increased Lumbar Contour"; }
  else if (ratio < 0.14) { grade = 2; label = "Moderate Increased Lumbar Contour"; }
  else                   { grade = 3; label = "Marked Increased Lumbar Contour"; }

  // Flat-back detection: concavity LESS than expected (flattened lumbar)
  if (ratio < 0.02 && lumSeg.length > 15) {
    grade = 0;
    label = "Reduced Lumbar Contour (Flat-back appearance)";
  }

  return {
    grade: grade ?? 0,
    label: label ?? "Normal Lumbar Contour",
    concavityRatio: Math.round(ratio * 1000) / 10,
    lumbarSegmentCount: lumSeg.length,
  };
}

// ─── Plumb line offsets ───────────────────────────────────────────────────────
// Reference: vertical line through lateral malleolus.
// Kendall ideal: plumb line passes through ear, acromion, greater trochanter,
//                just anterior to knee joint, just anterior to lateral malleolus.
// Positive offset = anterior displacement; negative = posterior.
function computePlumbOffsets(lm, W, H) {
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  const px = i => (lm[i]?.x || 0) * W;
  const py = i => (lm[i]?.y || 0) * H;

  // Lateral malleolus (ankle) as plumb reference
  let ankleX = null;
  if (V(27) && V(28)) ankleX = (px(27) + px(28)) / 2;
  else if (V(27)) ankleX = px(27);
  else if (V(28)) ankleX = px(28);

  if (!ankleX) return null;

  // Offsets in normalised image units (divide by W for 0–1 scale)
  const norm = d => d === null ? null : Math.round((d / W) * 1000) / 10; // % of frame width

  const earX = (V(7) || V(8)) ? ((V(7) ? px(7) : 0) + (V(8) ? px(8) : 0)) / ((V(7) ? 1 : 0) + (V(8) ? 1 : 0)) : null;
  const shX  = (V(11) && V(12)) ? (px(11) + px(12)) / 2 : V(11) ? px(11) : V(12) ? px(12) : null;
  const hipX = (V(23) && V(24)) ? (px(23) + px(24)) / 2 : V(23) ? px(23) : V(24) ? px(24) : null;
  const knX  = (V(25) && V(26)) ? (px(25) + px(26)) / 2 : V(25) ? px(25) : V(26) ? px(26) : null;

  // Positive = anterior (in front of plumb line), negative = posterior
  // Direction depends on viewSign — but we report as absolute with direction label
  return {
    earOffset:      earX  !== null ? norm(earX  - ankleX) : null,
    shoulderOffset: shX   !== null ? norm(shX   - ankleX) : null,
    hipOffset:      hipX  !== null ? norm(hipX  - ankleX) : null,
    kneeOffset:     knX   !== null ? norm(knX   - ankleX) : null,
    // Raw values for debug
    _ankleX: ankleX, _earX: earX, _shX: shX, _hipX: hipX, _knX: knX,
  };
}

// ─── Confidence scoring ───────────────────────────────────────────────────────
// Evaluates how reliable the contour analysis is likely to be.
// Factors: silhouette clarity, full body coverage, contour smoothness (clothing proxy).
function scoreContourConfidence(mask, postContour, lm, W, H) {
  const V = i => (lm[i]?.visibility || 0) > 0.4;
  let score = 100;
  const flags = [];

  // ── 1. Full body visibility from landmarks ─────────────────────────────────
  const coreVisible = V(0) && (V(7) || V(8)) && (V(11) || V(12)) && (V(23) || V(24)) && (V(27) || V(28));
  if (!coreVisible) { score -= 30; flags.push("Partial body visible — contour may be incomplete"); }

  // ── 2. Silhouette completeness — does the contour span most of the body? ──
  const contourSpan = postContour.length > 0
    ? (postContour[postContour.length - 1].y - postContour[0].y) / H
    : 0;
  if (contourSpan < 0.5)  { score -= 25; flags.push("Body silhouette incomplete — full body should be in frame"); }
  else if (contourSpan < 0.7) { score -= 10; flags.push("Partial body silhouette"); }

  // ── 3. Mask coverage quality (is the person well-separated from background?)
  const filledPixels = mask.filter(p => p > 128).length;
  const fillRatio = filledPixels / (W * H);
  if (fillRatio < 0.05) { score -= 20; flags.push("Person not clearly detected — check lighting and background contrast"); }

  // ── 4. Contour smoothness proxy for clothing ────────────────────────────────
  // Loose clothing causes high-frequency jaggedness in the contour.
  if (postContour.length > 40) {
    let jag = 0;
    for (let i = 1; i < postContour.length - 1; i++) {
      const d1 = postContour[i].x - postContour[i-1].x;
      const d2 = postContour[i+1].x - postContour[i].x;
      if (d1 * d2 < 0) jag++; // direction reversal = jagged
    }
    const jagRatio = jag / postContour.length;
    if (jagRatio > 0.45) {
      score -= 20;
      flags.push("Clothing may be obscuring body contour — form-fitting clothing recommended");
    } else if (jagRatio > 0.30) {
      score -= 10;
      flags.push("Clothing may partially affect contour accuracy");
    }
  }

  // ── 5. Landmark confidence aggregate ──────────────────────────────────────
  const keyLandmarks = [0, 7, 8, 11, 12, 23, 24, 27, 28];
  const avgVis = keyLandmarks.reduce((s, i) => s + (lm[i]?.visibility || 0), 0) / keyLandmarks.length;
  if (avgVis < 0.4) { score -= 15; flags.push("Low landmark confidence — improve lighting"); }

  score = Math.max(0, Math.min(100, score));

  let tier, recommendation;
  if (score >= 80)      { tier = "High";     recommendation = null; }
  else if (score >= 55) { tier = "Moderate"; recommendation = "Clinical confirmation recommended"; }
  else                  { tier = "Low";      recommendation = "Clinical confirmation required — results are indicative only"; }

  return { score, tier, flags, recommendation };
}

// ─── viewSign detection ───────────────────────────────────────────────────────
// +1 = person faces right (nose right of ear), -1 = faces left
function detectViewSign(lm) {
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  if (!V(0)) return 1; // default
  const noseX = lm[0].x;
  const earX = (V(7) ? lm[7].x : 0) + (V(8) ? lm[8].x : 0);
  const earN = (V(7) ? 1 : 0) + (V(8) ? 1 : 0);
  if (earN === 0) return 1;
  const avgEarX = earX / earN;
  const shX = (V(11) ? lm[11].x : 0) + (V(12) ? lm[12].x : 0);
  const shN = (V(11) ? 1 : 0) + (V(12) ? 1 : 0);
  const avgShX = shN > 0 ? shX / shN : avgEarX;
  // If nose is to the right of shoulder midpoint → facing right
  return noseX > avgShX ? 1 : -1;
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Call this after running pose estimation on a lateral-view photo.
// imgEl: HTMLImageElement of the photo
// lm:    MediaPipe poseLandmarks array (33 items)
// view:  "left" | "right"
//
// Returns ContourResult object consumed by sagittalFindings.js
export async function analyzeSagittalContour(imgEl, lm, view) {
  if (!lm || lm.length < 33) return null;

  const viewSign = detectViewSign(lm);
  const W = imgEl.naturalWidth  || imgEl.width  || 640;
  const H = imgEl.naturalHeight || imgEl.height || 480;

  let segResult = null;
  try {
    segResult = await runSegmentation(imgEl);
  } catch (e) {
    console.warn("Contour: segmentation failed —", e.message);
    return { error: "segmentation_failed", confidence: { score: 0, tier: "Low", flags: ["Segmentation unavailable"], recommendation: "Clinical confirmation required" } };
  }

  if (!segResult) return null;
  const { mask } = segResult;

  // Extract contours
  const rawPost = extractPosteriorContour(mask, W, H, viewSign);
  const rawAnt  = extractAnteriorContour(mask, W, H, viewSign);

  if (rawPost.length < 30) {
    return { error: "contour_too_short", confidence: { score: 0, tier: "Low", flags: ["Body not clearly segmented"], recommendation: "Clinical confirmation required" } };
  }

  // Smooth contours (reduces clothing noise)
  const postContour = smoothContour(rawPost, 15);
  const antContour  = smoothContour(rawAnt,  10);

  // Body bounds
  const bounds = getBodyBounds(lm, W, H);

  // Curve analyses
  const thoracic = analyzeThoracicContour(postContour, antContour, bounds, viewSign);
  const lumbar   = analyzeLumbarContour(postContour, antContour, bounds, viewSign);

  // Plumb line
  const plumbOffsets = computePlumbOffsets(lm, W, H);

  // Confidence
  const confidence = scoreContourConfidence(mask, postContour, lm, W, H);

  return {
    viewSign,
    thoracic,
    lumbar,
    plumbOffsets,
    confidence,
    // Debug data (used by validation mode overlay)
    _debug: {
      postContour: postContour.map(p => ({ x: p.x / W, y: p.y / H })),
      antContour:  antContour.map(p => ({ x: p.x / W, y: p.y / H })),
      bounds: {
        shY:    bounds.shY    ? bounds.shY    / H : null,
        hipY:   bounds.hipY   ? bounds.hipY   / H : null,
        ankleY: bounds.ankleY ? bounds.ankleY / H : null,
      },
    },
  };
}

// ─── Validation mode overlay ──────────────────────────────────────────────────
// Renders the contour debug overlay onto a canvas for developer audit mode.
// ctx: CanvasRenderingContext2D, W/H: canvas dimensions, contourResult from above.
export function renderContourDebugOverlay(ctx, W, H, cr) {
  if (!cr || !cr._debug) return;
  const { postContour, antContour, bounds } = cr._debug;

  // Posterior contour — red
  if (postContour.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,60,60,0.85)";
    ctx.lineWidth = 2;
    postContour.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x * W, p.y * H);
      else ctx.lineTo(p.x * W, p.y * H);
    });
    ctx.stroke();
  }

  // Anterior contour — cyan
  if (antContour.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,229,255,0.6)";
    ctx.lineWidth = 1.5;
    antContour.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x * W, p.y * H);
      else ctx.lineTo(p.x * W, p.y * H);
    });
    ctx.stroke();
  }

  // Thoracic region band — yellow
  if (bounds.shY && bounds.hipY) {
    const thorTop = bounds.shY;
    const thorBot = bounds.shY + (bounds.hipY - bounds.shY) * 0.55;
    ctx.fillStyle = "rgba(255,200,0,0.08)";
    ctx.fillRect(0, thorTop * H, W, (thorBot - thorTop) * H);
    ctx.strokeStyle = "rgba(255,200,0,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, thorTop * H, W, (thorBot - thorTop) * H);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,200,0,0.8)";
    ctx.font = "bold 11px system-ui";
    ctx.fillText("THORACIC", 6, thorTop * H + 14);
  }

  // Lumbar region band — green
  if (bounds.shY && bounds.hipY) {
    const lumTop = bounds.shY + (bounds.hipY - bounds.shY) * 0.55;
    const lumBot = bounds.shY + (bounds.hipY - bounds.shY) * 0.95;
    ctx.fillStyle = "rgba(0,200,120,0.08)";
    ctx.fillRect(0, lumTop * H, W, (lumBot - lumTop) * H);
    ctx.strokeStyle = "rgba(0,200,120,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, lumTop * H, W, (lumBot - lumTop) * H);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,200,120,0.8)";
    ctx.font = "bold 11px system-ui";
    ctx.fillText("LUMBAR", 6, lumTop * H + 14);
  }

  // Plumb line from ankle
  if (cr.plumbOffsets?._ankleX) {
    const ax = cr.plumbOffsets._ankleX;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(127,90,240,0.7)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.moveTo(ax, 0);
    ctx.lineTo(ax, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(127,90,240,0.9)";
    ctx.font = "bold 10px system-ui";
    ctx.fillText("PLUMB", ax + 4, H * 0.1);
  }

  // Confidence badge
  const { score, tier } = cr.confidence || {};
  const badgeColor = tier === "High" ? "#00c97a" : tier === "Moderate" ? "#ffb300" : "#ff4d6d";
  ctx.fillStyle = `${badgeColor}cc`;
  ctx.fillRect(W - 120, 6, 114, 24);
  ctx.fillStyle = "#000";
  ctx.font = "bold 11px system-ui";
  ctx.fillText(`Confidence: ${score ?? "?"}%`, W - 115, 22);
}

// ─── Warmup export ────────────────────────────────────────────────────────────
export async function warmupContourEngine() {
  try {
    await ensureSegmenter();
    console.log("ContourEngine: SelfieSegmentation ready");
  } catch (e) {
    console.warn("ContourEngine warmup failed:", e.message);
  }
}
