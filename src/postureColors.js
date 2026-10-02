// The colour palette shared by the app shell and the posture screens. Lives in its
// own tiny file so the app shell does not have to load the whole posture engine
// (600 KB of source) just to read a few colours.
export const PC = {
  bg:"#faf8fc", surface:"#ffffff", s2:"#f5f0fb", s3:"#ede7f6",
  border:"#d8cce8", accent:"#7c3aed", a2:"#9333ea", a3:"#059669",
  text:"#1a1025", muted:"#7e6a9a", red:"#dc2626", yellow:"#b45309",
  green:"#059669", purple:"#9333ea", orange:"#f97316",
};
