// contourEngine.js — Sagittal Contour Analysis Engine v2
//
// Mirrors exactly what a physiotherapist does with a lateral photo + posture grid:
//
//  1. Segment the person from background → clean body silhouette
//  2. Extract the POSTERIOR body contour (the physio's eye traces this edge)
//  3. Drop a plumb line from the lateral malleolus (standard Kendall reference)
//  4. Trace the full spinal curve profile from shoulder to hip:
//       • Identify the THORACIC CONVEXITY (upper back bowing posteriorly)
//       • Find the THORACIC APEX (where it bows most)
//       • Identify the INFLECTION POINT (where curve changes direction — approx T12/L1)
//       • Identify the LUMBAR CONCAVITY (lower back bowing anteriorly)
//       • Find the LUMBAR APEX
//  5. Classify the curve SHAPE — not just peak values, but the PATTERN of the curve:
//       Kyphotic-Lordotic : both curves present and increased (S-curve amplified)
//       Flat-back          : lumbar concavity absent/reduced, no clear inflection
//       Sway-back          : lower thoracic mild increase + flat lumbar + hips far anterior
//       Kyphotic only      : thoracic increase, lumbar normal
//       Lordotic only      : lumbar increase, thoracic normal
//       Ideal              : both curves within normal range
//  6. Score confidence based on silhouette quality, clothing, visibility
//
// This IS the contour analysis. It does not imply Cobb angles or radiographic findings.

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
    if (!window.SelfieSegmentation) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = SEG_CDN; s.onload = res;
        s.onerror = () => rej(new Error("SelfieSegmentation CDN failed"));
        document.head.appendChild(s);
      });
    }
    const seg = new window.SelfieSegmentation({ locateFile: SEG_FILE });
    seg.setOptions({ modelSelection: 1 }); // landscape = better for full-body lateral
    await seg.initialize();
    _segmenter = seg; _segLoading = null;
    return seg;
  })();
  return _segLoading;
}

// ─── Segmentation ─────────────────────────────────────────────────────────────
async function runSegmentation(imgEl) {
  const seg = await ensureSegmenter();
  const W = imgEl.naturalWidth  || imgEl.width  || 640;
  const H = imgEl.naturalHeight || imgEl.height || 480;
  return new Promise(resolve => {
    seg.onResults(results => {
      const mc = results.segmentationMask;
      const ctx = mc.getContext("2d");
      const px  = ctx.getImageData(0, 0, mc.width, mc.height);
      const out = new Uint8Array(W * H);
      const sx = mc.width / W, sy = mc.height / H;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const mx = Math.min(Math.round(x * sx), mc.width  - 1);
          const my = Math.min(Math.round(y * sy), mc.height - 1);
          out[y * W + x] = px.data[(my * mc.width + mx) * 4] > 128 ? 255 : 0;
        }
      resolve({ mask: out, W, H });
    });
    seg.send({ image: imgEl }).catch(() => resolve(null));
  });
}

// ─── Contour extraction ───────────────────────────────────────────────────────
// viewSign = +1 → person faces right → posterior = leftmost pixel per row
// viewSign = -1 → person faces left  → posterior = rightmost pixel per row
function extractPosteriorContour(mask, W, H, viewSign) {
  const pts = [];
  for (let y = 0; y < H; y++) {
    let found = null;
    if (viewSign >= 0) { for (let x = 0;     x < W;  x++) { if (mask[y*W+x]>128) { found=x; break; } } }
    else               { for (let x = W-1; x >= 0; x--) { if (mask[y*W+x]>128) { found=x; break; } } }
    if (found !== null) pts.push({ x: found, y });
  }
  return pts;
}

function extractAnteriorContour(mask, W, H, viewSign) {
  const pts = [];
  for (let y = 0; y < H; y++) {
    let found = null;
    if (viewSign >= 0) { for (let x = W-1; x >= 0; x--) { if (mask[y*W+x]>128) { found=x; break; } } }
    else               { for (let x = 0;     x < W;  x++) { if (mask[y*W+x]>128) { found=x; break; } } }
    if (found !== null) pts.push({ x: found, y });
  }
  return pts;
}

// Gaussian-weighted moving average smoother
function smooth(pts, half = 14) {
  return pts.map((_, i) => {
    let sx = 0, sw = 0;
    for (let j = Math.max(0, i-half); j <= Math.min(pts.length-1, i+half); j++) {
      const w = 1 - Math.abs(j-i)/(half+1);
      sx += pts[j].x * w; sw += w;
    }
    return { x: sx/sw, y: pts[i].y };
  });
}

// Linear chord from pt1 to pt2 → function y → x
function chord(pt1, pt2) {
  const dy = pt2.y - pt1.y;
  if (Math.abs(dy) < 1) return () => pt1.x;
  const m = (pt2.x - pt1.x) / dy;
  return y => pt1.x + m * (y - pt1.y);
}

// ─── Body bounds from landmarks ───────────────────────────────────────────────
function getBodyBounds(lm, W, H) {
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  const py = i => lm[i].y * H;
  const px = i => lm[i].x * W;
  const avg = (...idxs) => { const v = idxs.filter(i => V(i)); return v.length ? v.reduce((s,i)=>s+py(i),0)/v.length : null; };
  const avgX = (...idxs) => { const v = idxs.filter(i => V(i)); return v.length ? v.reduce((s,i)=>s+px(i),0)/v.length : null; };
  return {
    headY:   V(0) ? py(0) - (py(0)*0.05) : null,
    earY:    avg(7,8),
    shY:     avg(11,12),   shX: avgX(11,12),
    hipY:    avg(23,24),   hipX: avgX(23,24),
    ankleY:  avg(27,28),   ankleX: avgX(27,28),
    kneeY:   avg(25,26),
    noseX:   V(0) ? px(0) : null,
    W, H,
  };
}

// ─── THE CORE: Spinal Curve Profile Extraction ────────────────────────────────
// This is what the physiotherapist does visually.
// The posterior contour of the body, from shoulder level to hip level,
// gives the shape of the spinal curves. We:
//   1. Compute deviation from a straight chord (shoulder→hip)
//      +dev = posterior bowing (kyphosis direction)
//      -dev = anterior bowing (lordosis direction)
//   2. Find the inflection point (where +dev crosses to -dev)
//   3. Characterise each region independently
//   4. Classify the overall pattern
//
// All measurements normalised to body depth (avg AP diameter of trunk)
// so they are camera-distance independent.
function extractSpinalCurveProfile(postContour, antContour, bounds, viewSign) {
  const { shY, hipY, W, H } = bounds;
  if (!shY || !hipY || hipY <= shY) return null;

  const trunkH = hipY - shY;

  // ── Get trunk segment of posterior contour ────────────────────────────────
  const trunk = postContour.filter(p => p.y >= shY && p.y <= hipY);
  if (trunk.length < 30) return null;

  // ── Average body depth (AP diameter) for normalisation ───────────────────
  const depths = [];
  for (const pp of trunk) {
    const ant = antContour.reduce((b,a) => Math.abs(a.y-pp.y)<Math.abs(b.y-pp.y)?a:b);
    const d = Math.abs(ant.x - pp.x);
    if (d > 0) depths.push(d);
  }
  const bodyDepth = depths.length ? depths.reduce((a,b)=>a+b)/depths.length : W * 0.15;

  // ── Chord: straight line from top to bottom of trunk contour ─────────────
  const topPt = trunk[0];
  const botPt = trunk[trunk.length-1];
  const chordFn = chord(topPt, botPt);

  // ── Compute deviation at each point ──────────────────────────────────────
  // viewSign≥0: posterior=left side; kyphosis→x<chord→dev=chordX-x>0
  // viewSign<0: posterior=right side; kyphosis→x>chord→dev=x-chordX>0
  const profile = trunk.map(pt => {
    const chordX = chordFn(pt.y);
    const dev    = viewSign >= 0 ? (chordX - pt.x) : (pt.x - chordX);
    const yNorm  = (pt.y - shY) / trunkH; // 0=shoulder, 1=hip
    return { yNorm, dev, devNorm: dev / bodyDepth };
  });

  // ── Find inflection point ─────────────────────────────────────────────────
  // Where the curve transitions from posterior bowing (+) to anterior bowing (-)
  // Smooth the deviation signal first to ignore noise
  const smoothedDev = profile.map((p,i) => {
    const lo = Math.max(0, i-8), hi = Math.min(profile.length-1, i+8);
    const sub = profile.slice(lo, hi+1);
    return sub.reduce((s,x)=>s+x.dev,0)/sub.length;
  });

  let inflectionYNorm = null;
  let inflectionIdx   = null;
  for (let i = 5; i < smoothedDev.length-5; i++) {
    if (smoothedDev[i-1] > 0 && smoothedDev[i] <= 0) {
      inflectionYNorm = (profile[i].yNorm + profile[i-1].yNorm) / 2;
      inflectionIdx   = i;
      break;
    }
  }

  // ── Thoracic segment ──────────────────────────────────────────────────────
  // From shoulder level to inflection (or to 0.55 if no inflection found)
  const thorBound = inflectionYNorm !== null ? inflectionIdx : Math.floor(profile.length * 0.55);
  const thorSeg   = profile.slice(0, thorBound);

  let thorMaxDevNorm = 0, thorApexYNorm = null;
  for (const p of thorSeg) {
    if (p.devNorm > thorMaxDevNorm) { thorMaxDevNorm = p.devNorm; thorApexYNorm = p.yNorm; }
  }

  // ── Lumbar segment ────────────────────────────────────────────────────────
  // From inflection (or 0.55) to hip level
  const lumSeg = inflectionIdx !== null ? profile.slice(inflectionIdx) : profile.slice(Math.floor(profile.length*0.55));

  let lumMaxDevNorm = 0, lumApexYNorm = null;
  for (const p of lumSeg) {
    const concavity = -p.devNorm; // negative dev = anterior concavity = lordosis
    if (concavity > lumMaxDevNorm) { lumMaxDevNorm = concavity; lumApexYNorm = p.yNorm; }
  }

  // ── Pattern classification ─────────────────────────────────────────────────
  // Thresholds normalised to body depth:
  //   Normal thoracic convexity  : < 0.08 (8% body depth)
  //   Mild                       : 0.08–0.14
  //   Moderate                   : 0.14–0.22
  //   Marked                     : > 0.22
  //
  //   Normal lumbar concavity    : < 0.06 (6% body depth)
  //   Reduced (flat-back)        : < 0.02
  //   Mild                       : 0.06–0.10
  //   Moderate                   : 0.10–0.18
  //   Marked                     : > 0.18

  const thorGrade = thorMaxDevNorm < 0.08 ? 0 : thorMaxDevNorm < 0.14 ? 1 : thorMaxDevNorm < 0.22 ? 2 : 3;
  const lumGrade  = lumMaxDevNorm  < 0.06 ? 0 : lumMaxDevNorm  < 0.10 ? 1 : lumMaxDevNorm  < 0.18 ? 2 : 3;
  const lumFlat   = lumMaxDevNorm  < 0.025; // essentially no lumbar concavity

  const thorLabel = ["Normal Thoracic Contour","Mild Increased Thoracic Contour","Moderate Increased Thoracic Contour","Marked Increased Thoracic Contour"][thorGrade];
  const lumLabel  = lumFlat
    ? "Reduced Lumbar Contour — flat-back appearance"
    : ["Normal Lumbar Contour","Mild Increased Lumbar Contour","Moderate Increased Lumbar Contour","Marked Increased Lumbar Contour"][lumGrade];

  // Where is the thoracic apex? Helps distinguish kyphotic from sway-back
  // Upper third (0–0.33) = upper thoracic apex
  // Middle third (0.33–0.66) = mid-thoracic apex (classic kyphosis)
  // Lower third (0.66+) = lower thoracic apex (sway-back, Scheuermann lower)
  const thorApexRegion = thorApexYNorm === null ? "unknown"
    : thorApexYNorm < 0.30 ? "upper-thoracic"
    : thorApexYNorm < 0.55 ? "mid-thoracic"
    : "lower-thoracic";

  // ── Spinal curve pattern from SHAPE of contour ────────────────────────────
  let curvePattern;
  if (thorGrade >= 2 && lumGrade >= 2 && inflectionYNorm !== null) {
    curvePattern = "kyphotic-lordotic"; // both increased + clear inflection
  } else if (lumFlat && thorGrade <= 1) {
    curvePattern = "flat-back";          // nearly straight posterior contour
  } else if (thorGrade >= 2 && lumGrade <= 1 && thorApexRegion === "lower-thoracic") {
    curvePattern = "sway-back";          // lower thoracic apex + flat lumbar
  } else if (thorGrade >= 2 && lumGrade <= 1) {
    curvePattern = "kyphotic";           // thoracic increase, lumbar normal
  } else if (lumGrade >= 2 && thorGrade <= 1 && inflectionYNorm !== null) {
    curvePattern = "lordotic";           // lumbar increase, thoracic normal
  } else {
    curvePattern = "ideal";              // both within normal range
  }

  return {
    // Grades (0=normal, 1=mild, 2=moderate, 3=marked)
    thorGrade, lumGrade,
    // Labels
    thorLabel, lumLabel,
    // Apex locations (normalised 0=shoulder, 1=hip)
    thorApexYNorm, lumApexYNorm, thorApexRegion,
    // Inflection point
    hasInflection: inflectionYNorm !== null,
    inflectionYNorm,
    // Raw normalised magnitudes
    thorMaxDevNorm: Math.round(thorMaxDevNorm * 1000) / 10,
    lumMaxDevNorm:  Math.round(lumMaxDevNorm  * 1000) / 10,
    lumFlat,
    // Overall pattern
    curvePattern,
    bodyDepth,
    // Full deviation profile for debug overlay
    _deviations: profile.map(p => ({ y: p.yNorm, dev: Math.round(p.devNorm * 1000)/10 })),
  };
}

// ─── Plumb line offsets ───────────────────────────────────────────────────────
// Lateral malleolus as reference — Kendall standard.
// Positive = anterior to plumb, negative = posterior.
function computePlumbOffsets(lm, W, H) {
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  const px = i => lm[i].x * W;
  const py = i => lm[i].y * H;
  const avgX = (...idxs) => { const v=idxs.filter(i=>V(i)); return v.length?v.reduce((s,i)=>s+px(i),0)/v.length:null; };
  const avgY = (...idxs) => { const v=idxs.filter(i=>V(i)); return v.length?v.reduce((s,i)=>s+py(i),0)/v.length:null; };

  const ankleX = avgX(27,28);
  if (!ankleX) return null;

  const norm = d => d === null ? null : Math.round((d/W)*1000)/10; // % frame width

  return {
    earOffset:      (avgX(7,8)  !== null) ? norm(avgX(7,8)  - ankleX) : null,
    shoulderOffset: (avgX(11,12)!== null) ? norm(avgX(11,12)- ankleX) : null,
    hipOffset:      (avgX(23,24)!== null) ? norm(avgX(23,24)- ankleX) : null,
    kneeOffset:     (avgX(25,26)!== null) ? norm(avgX(25,26)- ankleX) : null,
    _ankleX: ankleX,
    _earX:   avgX(7,8),
    _shX:    avgX(11,12),
    _hipX:   avgX(23,24),
    _knX:    avgX(25,26),
    _ankleY: avgY(27,28),
  };
}

// ─── Confidence scoring ───────────────────────────────────────────────────────
function scoreContourConfidence(mask, postContour, lm, W, H) {
  const V = i => (lm[i]?.visibility || 0) > 0.4;
  let score = 100;
  const flags = [];

  const coreVis = V(0) && (V(7)||V(8)) && (V(11)||V(12)) && (V(23)||V(24)) && (V(27)||V(28));
  if (!coreVis) { score -= 30; flags.push("Partial body visible — contour may be incomplete"); }

  const span = postContour.length > 0 ? (postContour[postContour.length-1].y - postContour[0].y)/H : 0;
  if (span < 0.5)  { score -= 25; flags.push("Full body not in frame — step back from camera"); }
  else if (span < 0.7) { score -= 10; flags.push("Partial body silhouette"); }

  const filled = mask.filter(p=>p>128).length;
  if (filled/(W*H) < 0.05) { score -= 20; flags.push("Person not clearly detected — improve background contrast"); }

  // Contour smoothness → clothing proxy (jagged = loose clothing)
  if (postContour.length > 40) {
    let jag = 0;
    for (let i=1; i<postContour.length-1; i++) {
      if ((postContour[i].x-postContour[i-1].x)*(postContour[i+1].x-postContour[i].x) < 0) jag++;
    }
    const jr = jag/postContour.length;
    if (jr > 0.45) { score -= 20; flags.push("Loose clothing detected — form-fitting clothing gives more accurate contour"); }
    else if (jr > 0.30) { score -= 10; flags.push("Clothing may partially affect contour accuracy"); }
  }

  const avgVis = [0,7,8,11,12,23,24,27,28].reduce((s,i)=>s+(lm[i]?.visibility||0),0)/9;
  if (avgVis < 0.4) { score -= 15; flags.push("Low landmark confidence — improve lighting"); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score>=80?"High":score>=55?"Moderate":"Low";
  const recommendation = score>=80 ? null : score>=55
    ? "Clinical confirmation recommended"
    : "Clinical confirmation required — results are indicative only";

  return { score, tier, flags, recommendation };
}

// ─── viewSign detection ───────────────────────────────────────────────────────
function detectViewSign(lm) {
  const V = i => (lm[i]?.visibility || 0) > 0.3;
  if (!V(0)) return 1;
  const noseX = lm[0].x;
  const earN  = (V(7)?1:0)+(V(8)?1:0);
  const earX  = earN > 0 ? ((V(7)?lm[7].x:0)+(V(8)?lm[8].x:0))/earN : noseX;
  const shN   = (V(11)?1:0)+(V(12)?1:0);
  const shX   = shN > 0 ? ((V(11)?lm[11].x:0)+(V(12)?lm[12].x:0))/shN : earX;
  return noseX > shX ? 1 : -1;
}

// ─── Validation mode overlay ──────────────────────────────────────────────────
// Renders what a physio sees on screen: posterior contour, thoracic/lumbar bands,
// apex markers, inflection point, plumb line, deviation curve.
export function renderContourDebugOverlay(ctx, W, H, cr) {
  if (!cr || !cr._debug) return;
  const { postContour, antContour, bounds, curveProfile } = cr._debug;

  // Posterior contour — red line (the spine surface the physio traces)
  if (postContour?.length > 1) {
    ctx.beginPath(); ctx.strokeStyle="rgba(255,60,60,0.9)"; ctx.lineWidth=2.5;
    postContour.forEach((p,i) => { const x=p.x*W, y=p.y*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();
    ctx.fillStyle="rgba(255,60,60,0.7)"; ctx.font="bold 11px system-ui";
    ctx.fillText("◄ POSTERIOR CONTOUR", postContour[Math.floor(postContour.length*0.3)].x*W+4,
      postContour[Math.floor(postContour.length*0.3)].y*H);
  }

  // Anterior contour — cyan
  if (antContour?.length > 1) {
    ctx.beginPath(); ctx.strokeStyle="rgba(0,229,255,0.5)"; ctx.lineWidth=1.5;
    antContour.forEach((p,i) => { const x=p.x*W, y=p.y*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();
  }

  // Thoracic region — yellow band
  if (bounds?.shY && bounds?.hipY) {
    const shPx = bounds.shY*H, hipPx = bounds.hipY*H;
    const trunkH = hipPx - shPx;
    const thorBot = curveProfile?.inflectionYNorm
      ? shPx + curveProfile.inflectionYNorm * trunkH
      : shPx + trunkH * 0.55;

    ctx.fillStyle="rgba(255,200,0,0.07)";
    ctx.fillRect(0, shPx, W, thorBot-shPx);
    ctx.strokeStyle="rgba(255,200,0,0.5)"; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.strokeRect(0, shPx, W, thorBot-shPx);
    ctx.setLineDash([]);
    ctx.fillStyle="rgba(255,200,0,0.9)"; ctx.font="bold 11px system-ui";
    ctx.fillText("THORACIC REGION", 6, shPx+16);

    // Lumbar region — green band
    ctx.fillStyle="rgba(0,200,120,0.07)";
    ctx.fillRect(0, thorBot, W, hipPx-thorBot);
    ctx.strokeStyle="rgba(0,200,120,0.5)"; ctx.setLineDash([6,4]);
    ctx.strokeRect(0, thorBot, W, hipPx-thorBot);
    ctx.setLineDash([]);
    ctx.fillStyle="rgba(0,200,120,0.9)";
    ctx.fillText("LUMBAR REGION", 6, thorBot+16);

    // Inflection point marker — magenta dot + label
    if (curveProfile?.inflectionYNorm !== null && curveProfile?.inflectionYNorm !== undefined) {
      const iy = shPx + curveProfile.inflectionYNorm * trunkH;
      ctx.beginPath(); ctx.arc(W*0.5, iy, 7, 0, Math.PI*2);
      ctx.fillStyle="rgba(255,0,200,0.9)"; ctx.fill();
      ctx.fillStyle="rgba(255,0,200,1)"; ctx.font="bold 10px system-ui";
      ctx.fillText("↔ INFLECTION (T12/L1 approx)", W*0.5+10, iy+4);
    }

    // Thoracic apex marker — yellow dot
    if (curveProfile?.thorApexYNorm !== null && curveProfile?.thorApexYNorm !== undefined && postContour?.length > 1) {
      const ay = shPx + curveProfile.thorApexYNorm * trunkH;
      const axPt = postContour.find(p => Math.abs(p.y*H - ay) < 10) || postContour[Math.floor(postContour.length*0.3)];
      ctx.beginPath(); ctx.arc(axPt.x*W-12, ay, 6, 0, Math.PI*2);
      ctx.fillStyle="rgba(255,200,0,0.95)"; ctx.fill();
      ctx.fillStyle="rgba(255,200,0,1)"; ctx.font="bold 10px system-ui";
      ctx.fillText("▲ THORACIC APEX", axPt.x*W-90, ay-8);
    }

    // Lumbar apex marker — green dot
    if (curveProfile?.lumApexYNorm !== null && curveProfile?.lumApexYNorm !== undefined && postContour?.length > 1) {
      const ay = shPx + curveProfile.lumApexYNorm * trunkH;
      const axPt = postContour.find(p => Math.abs(p.y*H - ay) < 10) || postContour[Math.floor(postContour.length*0.75)];
      ctx.beginPath(); ctx.arc(axPt.x*W-12, ay, 6, 0, Math.PI*2);
      ctx.fillStyle="rgba(0,200,120,0.95)"; ctx.fill();
      ctx.fillStyle="rgba(0,200,120,1)"; ctx.font="bold 10px system-ui";
      ctx.fillText("▼ LUMBAR APEX", axPt.x*W-80, ay+16);
    }

    // Chord line — dashed white (baseline the physio compares against)
    if (postContour?.length > 1) {
      const topPt = postContour[0], botPt = postContour[postContour.length-1];
      ctx.beginPath(); ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.5; ctx.setLineDash([10,6]);
      ctx.moveTo(topPt.x*W, shPx); ctx.lineTo(botPt.x*W, hipPx);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font="10px system-ui";
      ctx.fillText("chord", botPt.x*W+4, hipPx-4);
    }
  }

  // Plumb line — purple vertical from ankle
  if (cr.plumbOffsets?._ankleX) {
    const ax = cr.plumbOffsets._ankleX;
    ctx.beginPath(); ctx.strokeStyle="rgba(127,90,240,0.85)"; ctx.lineWidth=2; ctx.setLineDash([10,5]);
    ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke(); ctx.setLineDash([]);

    // Mark each landmark offset on the plumb line
    const marks = [
      { x: cr.plumbOffsets._earX,  y: cr.plumbOffsets._ankleY ? cr._debug.bounds?.earY*H : H*0.08, label:"Ear", off: cr.plumbOffsets.earOffset },
      { x: cr.plumbOffsets._shX,   y: cr._debug.bounds?.shY*H,  label:"Acromion", off: cr.plumbOffsets.shoulderOffset },
      { x: cr.plumbOffsets._hipX,  y: cr._debug.bounds?.hipY*H, label:"G.Troch",  off: cr.plumbOffsets.hipOffset },
    ];
    marks.forEach(m => {
      if (!m.x || !m.y || m.off === null) return;
      ctx.beginPath(); ctx.setLineDash([3,3]);
      ctx.strokeStyle="rgba(127,90,240,0.6)"; ctx.lineWidth=1.5;
      ctx.moveTo(ax, m.y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.setLineDash([]);
      const col = m.off > 0 ? "#ffb300" : "#00e5ff";
      ctx.fillStyle=col; ctx.font="bold 10px system-ui";
      ctx.fillText(`${m.label}: ${m.off>0?"+":""}${m.off?.toFixed(1)}%`, Math.min(m.x, ax)+2, m.y-3);
    });

    ctx.fillStyle="rgba(127,90,240,0.9)"; ctx.font="bold 10px system-ui";
    ctx.fillText("PLUMB LINE", ax+3, H*0.05);
  }

  // Pattern label + confidence badge
  const pLabel = cr._debug?.curveProfile?.curvePattern?.replace(/-/g," ").toUpperCase() ?? "UNKNOWN";
  const { score, tier } = cr.confidence || {};
  const col = tier==="High"?"#00c97a":tier==="Moderate"?"#ffb300":"#ff4d6d";
  ctx.fillStyle=`${col}dd`; ctx.fillRect(W-200, 4, 196, 20);
  ctx.fillStyle="#000"; ctx.font="bold 10px system-ui";
  ctx.fillText(`${pLabel} · ${score}% conf`, W-196, 18);
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export async function analyzeSagittalContour(imgEl, lm, view) {
  if (!lm || lm.length < 33) return null;

  const viewSign = detectViewSign(lm);
  const W = imgEl.naturalWidth  || imgEl.width  || 640;
  const H = imgEl.naturalHeight || imgEl.height || 480;

  let segResult = null;
  try { segResult = await runSegmentation(imgEl); }
  catch (e) { console.warn("Contour: segmentation failed —", e.message); return null; }
  if (!segResult) return null;

  const { mask } = segResult;
  const rawPost = extractPosteriorContour(mask, W, H, viewSign);
  const rawAnt  = extractAnteriorContour(mask, W, H, viewSign);
  if (rawPost.length < 30) return null;

  const postContour = smooth(rawPost, 15);
  const antContour  = smooth(rawAnt,  10);
  const bounds      = getBodyBounds(lm, W, H);
  const curveProfile= extractSpinalCurveProfile(postContour, antContour, bounds, viewSign);
  const plumbOffsets= computePlumbOffsets(lm, W, H);
  const confidence  = scoreContourConfidence(mask, postContour, lm, W, H);

  return {
    viewSign,
    curveProfile,          // full spinal curve analysis
    plumbOffsets,
    confidence,
    _debug: {
      postContour: postContour.map(p=>({x:p.x/W,y:p.y/H})),
      antContour:  antContour.map(p=>({x:p.x/W,y:p.y/H})),
      bounds: {
        earY: bounds.earY ? bounds.earY/H : null,
        shY:  bounds.shY  ? bounds.shY/H  : null,
        hipY: bounds.hipY ? bounds.hipY/H : null,
      },
      curveProfile,
    },
  };
}

export async function warmupContourEngine() {
  try { await ensureSegmenter(); console.log("ContourEngine ready"); }
  catch (e) { console.warn("ContourEngine warmup failed:", e.message); }
}
