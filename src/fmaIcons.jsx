import React from "react";

/* Line-drawn icons for the Functional Movement Screen tiles -- a stick
   figure in the pose each test uses (or a simple body-part glyph for the
   region tests that aren't a whole-body movement), replacing the generic
   emoji. Drawn on a 48x48 grid, side view facing right unless the pose is
   naturally frontal (single-leg stance, abduction). */

const INK = "#6D28D9";
const SOFT = "#C4B5FD";

// Stick figure from joint points: h head, s shoulder, p pelvis, l/r knee(k),
// foot(f), elbow(e), hand(h2).
function fig({ h, s, p, lk, lf, rk, rf, le, lh, re, rh }) {
  const lines = [[s, p]];
  if (lk) lines.push([p, lk, lf]);
  if (rk) lines.push([p, rk, rf]);
  if (le) lines.push([s, le, lh]);
  if (re) lines.push([s, re, rh]);
  return { head: h, lines };
}
const pts = (a) => a.map((q) => q.join(",")).join(" ");

const POSES = {
  sts: { ...fig({ h: [22, 8], s: [23, 14], p: [17, 27], lk: [26, 29], lf: [24, 41], le: [30, 19], lh: [36, 17] }), props: [[[6, 30], [16, 30]], [[6, 20], [6, 30]]] },
  fwd: fig({ h: [31, 13], s: [27, 16], p: [17, 26], lk: [17, 34], lf: [17, 42], le: [30, 26], lh: [31, 35] }),
  sls: fig({ h: [24, 7], s: [24, 13], p: [24, 26], lk: [24, 34], lf: [24, 42], rk: [31, 29], rf: [31, 37], le: [16, 17], lh: [12, 22], re: [32, 17], rh: [36, 22] }),
  squat: fig({ h: [21, 9], s: [22, 14], p: [13, 28], lk: [26, 29], lf: [22, 41], le: [30, 15], lh: [38, 15] }),
  step: { ...fig({ h: [22, 7], s: [22, 13], p: [22, 25], lk: [29, 29], lf: [31, 34], rk: [19, 33], rf: [17, 42], le: [26, 18], lh: [30, 21] }), props: [[[26, 34], [42, 34], [42, 42]]] },
  aslr: { head: [6, 34], lines: [[[9, 36], [26, 36], [44, 36]], [[26, 36], [38, 16]]], props: [[[2, 40], [46, 40]]] },
  pushup: { head: [8, 22], lines: [[[12, 26], [29, 32], [42, 38]], [[12, 26], [12, 38]]], props: [[[2, 41], [46, 41]]] },
  rotary: { head: [11, 21], lines: [[[14, 26], [30, 26]], [[14, 26], [14, 38]], [[30, 26], [30, 38]], [[14, 26], [6, 18]], [[30, 26], [42, 22]]], props: [[[2, 40], [46, 40]]] },
  reach: fig({ h: [24, 10], s: [24, 16], p: [24, 28], lk: [24, 36], lf: [24, 42], le: [30, 9], lh: [31, 1], re: [18, 9], rh: [17, 1] }),
  abd: fig({ h: [24, 8], s: [24, 14], p: [24, 28], lk: [21, 36], lf: [21, 42], rk: [27, 36], rf: [27, 42], le: [15, 13], lh: [8, 10], re: [33, 13], rh: [40, 10] }),
  ir: fig({ h: [24, 8], s: [24, 14], p: [24, 28], lk: [21, 36], lf: [21, 42], rk: [27, 36], rf: [27, 42], le: [31, 22], lh: [26, 31], re: [18, 22], rh: [17, 30] }),
  er: fig({ h: [24, 8], s: [24, 14], p: [24, 28], lk: [21, 36], lf: [21, 42], rk: [27, 36], rf: [27, 42], le: [33, 8], lh: [26, 8], re: [18, 22], rh: [17, 30] }),
  wall: { ...fig({ h: [26, 8], s: [28, 14], p: [28, 27], lk: [28, 35], lf: [28, 42], le: [33, 10], lh: [35, 4] }), props: [[[38, 3], [38, 43]]] },
  mob: fig({ h: [24, 8], s: [24, 14], p: [24, 28], lk: [21, 36], lf: [21, 42], rk: [27, 36], rf: [27, 42], le: [31, 8], lh: [27, 17], re: [17, 22], rh: [23, 31] }),
  hinge: fig({ h: [32, 14], s: [28, 17], p: [17, 25], lk: [19, 34], lf: [18, 42], le: [26, 22], lh: [22, 25] }),
  proneExt: { head: [6, 36], lines: [[[9, 38], [26, 38], [44, 38]], [[26, 38], [40, 27]]], props: [[[2, 41], [46, 41]]] },
  seatRot: { ...fig({ h: [12, 8], s: [12, 14], p: [14, 26], lk: [26, 26], lf: [34, 36] }), props: [[[5, 26], [22, 26]], [[5, 26], [5, 42]]] },
  stepDown: { ...fig({ h: [14, 5], s: [14, 11], p: [14, 23], lk: [14, 32], lf: [14, 34], rk: [22, 30], rf: [27, 38] }), props: [[[4, 34], [24, 34], [24, 42]]] },
  deepSquat: { ...fig({ h: [22, 10], s: [22, 15], p: [14, 29], lk: [26, 29], lf: [22, 41], le: [28, 8], lh: [32, 4], re: [16, 8], rh: [12, 4] }), props: [[[10, 3], [34, 3]]] },
  hurdle: { ...fig({ h: [16, 8], s: [16, 14], p: [16, 26], lk: [16, 34], lf: [16, 42], rk: [26, 26], rf: [32, 34] }), props: [[[26, 30], [26, 42]], [[20, 30], [32, 30]]] },
  lunge: fig({ h: [22, 8], s: [22, 14], p: [22, 26], lk: [32, 28], lf: [32, 41], rk: [14, 36], rf: [7, 41] }),
  hop: { ...fig({ h: [24, 4], s: [24, 10], p: [24, 22], lk: [22, 30], lf: [22, 36], rk: [26, 30], rf: [26, 36], le: [16, 14], lh: [12, 20], re: [32, 14], rh: [36, 20] }), props: [[[8, 42], [40, 42]]] },
  heel: fig({ h: [24, 7], s: [24, 13], p: [24, 26], lk: [24, 34], lf: [24, 39], le: [19, 20], lh: [17, 26], re: [29, 20], rh: [31, 26] }),
  dfWall: { ...fig({ h: [26, 8], s: [26, 14], p: [24, 27], lk: [35, 30], lf: [30, 41], rk: [16, 36], rf: [10, 41], le: [32, 17], lh: [37, 14] }), props: [[[39, 3], [39, 43]]] },
  wallKnee: { ...fig({ h: [29, 8], s: [30, 14], p: [30, 27], lk: [22, 33], lf: [28, 42] }), props: [[[38, 3], [38, 43]]] },
  arch: { head: null, lines: [[[6, 36], [14, 22], [26, 16], [38, 24], [42, 36]]], props: [[[4, 40], [46, 40]]] },
};

// Region tests that aren't a whole-body movement: simple body-part glyphs.
const GLYPHS = {
  neck: { circle: [24, 13, 7], lines: [[[20, 20], [20, 36]], [[28, 20], [28, 36]]], props: [[[8, 12], [5, 22], [10, 32]], [[40, 12], [43, 22], [38, 32]]] },
  dnf: { circle: [20, 13, 7], lines: [[[16, 20], [17, 36]], [[24, 20], [25, 36]]], props: [[[38, 14], [30, 14]], [[33, 11], [30, 14], [33, 17]]] },
  post: { circle: [30, 12, 7], lines: [[[26, 19], [22, 36]], [[34, 19], [28, 36]]], props: [[[14, 4], [14, 44]]] },
  diz: { circle: [24, 24, 7], lines: [], props: [[[24, 24], [24, 17], [31, 17], [31, 31], [17, 31], [17, 10]]] },
  spine: { lines: [[[24, 4], [21, 12], [24, 20], [27, 28], [24, 36], [24, 44]]], dots: [[24, 4], [21, 12], [24, 20], [27, 28], [24, 36]], props: [] },
  ribs: { lines: [[[24, 6], [24, 42]]], props: [[[24, 12], [12, 14], [8, 24]], [[24, 12], [36, 14], [40, 24]], [[24, 22], [12, 24], [10, 32]], [[24, 22], [36, 24], [38, 32]], [[24, 32], [15, 34], [14, 40]], [[24, 32], [33, 34], [34, 40]]] },
  scapula: { lines: [[[24, 6], [24, 42]]], props: [[[24, 14], [12, 16], [10, 30], [20, 32]], [[24, 14], [36, 16], [38, 30], [28, 32]]] },
  arm: { lines: [[[6, 36], [22, 36], [34, 18]]], dots: [[22, 36]], props: [[[34, 18], [42, 14]]] },
  armNerve: { lines: [[[6, 36], [22, 36], [34, 18]]], props: [[[8, 30], [14, 26], [20, 30], [26, 24], [32, 28], [38, 22]]] },
  hand: { lines: [[[16, 44], [16, 26], [32, 26], [32, 44]], [[16, 26], [16, 8]], [[21, 26], [21, 5]], [[26, 26], [26, 6]], [[32, 26], [32, 12]]], props: [] },
  jaw: { lines: [[[12, 10], [12, 24], [20, 36], [34, 36], [38, 28]]], dots: [[38, 12]], props: [[[38, 12], [30, 20]]] },
  jawClick: { lines: [[[12, 10], [12, 24], [20, 36], [34, 36], [38, 28]]], props: [[[40, 8], [44, 12], [40, 16]], [[36, 6], [42, 12], [36, 18]]] },
  head: { circle: [24, 20, 12], lines: [], props: [[[16, 12], [20, 18], [16, 22], [20, 28]]] },
  foot: { lines: [[[6, 36], [14, 22], [26, 16], [38, 24], [42, 36]]], props: [[[4, 40], [46, 40]]] },
};

const MAP = {
  lfs_sts: "sts", lfs_fwd: "fwd", lfs_sls: "sls", lfs_squat: "squat", lfs_step: "step",
  fms_aslr: "aslr", fms_tspu: "pushup", fms_rs: "rotary",
  sfs_flex: "reach", sfs_abd: "abd", sfs_ir: "ir", sfs_er: "er", sfs_scap: "wall", fms_sm: "mob",
  hfs_sls: "sls", hfs_hinge: "hinge", hfs_ext: "proneExt", hfs_rot: "seatRot", hfs_step: "stepDown",
  fms_sq: "deepSquat", fms_hs: "hurdle", fms_il: "lunge",
  kfs_squat: "squat", kfs_lunge: "lunge", kfs_step: "stepDown", kfs_hop: "hop", kfs_tke: "wallKnee",
  afs_hr: "heel", afs_df: "dfWall", afs_bal: "sls", afs_hop: "hop", afs_arch: "arch",
  cfs_arom: "neck", cfs_dnf: "dnf", cfs_post: "post", cfs_diz: "diz", cfs_ulnt: "armNerve",
  tfs_arom: "spine", tfs_rib: "ribs", tfs_ext: "spine", tfs_t4: "spine", tfs_scap: "scapula",
  efs_arom: "arm", efs_lat: "arm", efs_med: "arm", efs_stab: "arm", efs_neural: "armNerve",
  wfs_arom: "hand", wfs_cts: "hand", wfs_tfcc: "hand", wfs_scaph: "hand", wfs_fingers: "hand",
  tmj_arom: "jaw", tmj_click: "jawClick", tmj_muscle: "jaw", tmj_cerv: "neck", tmj_head: "head",
};

const GLYPH_KEYS = new Set(Object.keys(GLYPHS));

export function FmaIcon({ id, size = 24 }) {
  const key = MAP[id] || "sls";
  const def = GLYPH_KEYS.has(key) ? GLYPHS[key] : POSES[key];
  const stroke = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  const soft = { fill: "none", stroke: SOFT, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block" }}>
      {(def.props || []).map((l, i) => <polyline key={"p" + i} points={pts(l)} {...soft} />)}
      {(def.lines || []).map((l, i) => <polyline key={"l" + i} points={pts(l)} {...stroke} />)}
      {def.head && <circle cx={def.head[0]} cy={def.head[1]} r="4.2" {...stroke} />}
      {def.circle && <circle cx={def.circle[0]} cy={def.circle[1]} r={def.circle[2]} {...stroke} />}
      {(def.dots || []).map((d, i) => <circle key={"d" + i} cx={d[0]} cy={d[1]} r="2.4" fill={INK} stroke="none" />)}
    </svg>
  );
}
