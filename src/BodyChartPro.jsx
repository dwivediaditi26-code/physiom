// BodyChartPro.jsx — Professional Physiotherapy Pain Mapping System
// Upload your anatomical image to Cloudinary with public_id = "body-chart-4view"
// Then it auto-displays as the background. Admin Mode lets you refine polygon positions.

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BODY_IMAGE_URL =
  "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/body-chart-4view";

const SYMPTOM_TYPES = [
  { id:"pain",      label:"Pain",      color:"#ef4444", bg:"rgba(239,68,68,0.30)",   icon:"🔴" },
  { id:"tingling",  label:"Tingling",  color:"#eab308", bg:"rgba(234,179,8,0.30)",   icon:"🟡" },
  { id:"numbness",  label:"Numbness",  color:"#8b5cf6", bg:"rgba(139,92,246,0.30)",  icon:"🟣" },
  { id:"burning",   label:"Burning",   color:"#f97316", bg:"rgba(249,115,22,0.30)",  icon:"🟠" },
  { id:"stiffness", label:"Stiffness", color:"#3b82f6", bg:"rgba(59,130,246,0.30)",  icon:"🔵" },
  { id:"weakness",  label:"Weakness",  color:"#22c55e", bg:"rgba(34,197,94,0.30)",   icon:"🟢" },
  { id:"radiation", label:"Radiation", color:"#ec4899", bg:"rgba(236,72,153,0.30)",  icon:"⚡" },
  { id:"swelling",  label:"Swelling",  color:"#06b6d4", bg:"rgba(6,182,212,0.30)",   icon:"💧" },
];

// ─── ANATOMICAL REGIONS — percentage-based (0-100 on both axes) ─────────────
// Image layout: [Anterior | Left Lateral | Right Lateral | Posterior]
// Each view ≈ 25% of total width. Refine in Admin Mode.
const REGIONS = [
  { id:"anterior_head", view:"anterior", label:"Head",
    pts:[[15.21,4.53],[13.6,4.92],[12.42,3.87],[12.75,2.3],[13.6,0.85],[14.87,0.59],[16.65,0.72],[17.58,2.17],[17.84,3.74],[17.5,4.92]] },
  { id:"left_lat_head", view:"left_lat", label:"Head",
    pts:[[38.9,2.95],[38.73,6.24],[37.37,5.98],[35.85,4.4],[35.34,2.56],[36.27,0.98],[37.29,0.98],[38.39,0.98],[39.75,0.59],[41.78,2.3],[41.69,3.61],[41.61,5.19],[40.68,7.03]] },
  { id:"right_lat_head", view:"right_lat", label:"Head",
    pts:[[60.59,3.48],[61.27,6.76],[59.92,5.84],[58.39,6.37],[57.54,4.79],[58.14,1.51],[59.41,0.72],[61.02,0.59],[62.54,0.98],[64.07,2.3],[62.97,3.48],[62.63,5.45]] },
  { id:"posterior_head", view:"posterior", label:"Head",
    pts:[[83.94,4.14],[83.43,5.45],[81.91,5.19],[81.99,3.22],[82.5,0.85],[84.03,0.85],[86.23,1.51],[86.31,3.35],[87.25,3.35],[87.25,5.32],[85.38,5.71]] },
  { id:"anterior_neck", view:"anterior", label:"Neck",
    pts:[[15.3,15.43],[13.26,12.02],[13.09,13.99],[12.16,14.9],[13.01,16.74],[14.96,17.66],[17.33,16.61],[18.43,15.96],[17.58,13.33],[17.08,11.75]] },
  { id:"left_lat_neck", view:"left_lat", label:"Neck",
    pts:[[38.81,12.67],[37.29,13.99],[37.37,15.69],[38.56,16.22],[40.34,14.64],[40.85,12.93],[40.68,10.83],[39.07,12.67],[37.03,13.59],[37.54,11.49],[38.47,9.91],[39.15,8.73],[40.51,9.65]] },
  { id:"right_lat_neck", view:"right_lat", label:"Neck",
    pts:[[59.66,12.8],[58.47,11.36],[58.22,9],[58.56,6.37],[59.92,8.34],[60.93,10.44],[62.8,12.67],[61.95,14.12],[60.85,15.3],[58.73,14.9],[57.46,14.9]] },
  { id:"posterior_neck", view:"posterior", label:"Neck",
    pts:[[84.62,12.67],[80.47,16.09],[81.99,14.38],[82.33,12.15],[82.33,8.34],[83.77,6.89],[85.47,8.21],[86.82,10.97],[87.42,14.64],[88.86,16.35]] },
  { id:"anterior_shoulder_rt", view:"anterior", label:"Shoulder Rt",
    pts:[[7.92,21.73],[6.4,26.59],[7.75,25.41],[9.45,23.83],[10.3,21.34],[10.81,19.76],[12.25,16.87],[10.72,16.35],[9.28,16.87],[8.01,18.19],[5.97,23.97]] },
  { id:"anterior_shoulder_lt", view:"anterior", label:"Shoulder Lt",
    pts:[[22.67,20.42],[22.42,18.45],[20.97,16.87],[19.7,16.22],[18.6,15.69],[18.69,17.93],[19.45,20.42],[20.64,22],[22.75,23.05],[24.11,21.86]] },
  { id:"left_lat_shoulder", view:"left_lat", label:"Shoulder",
    pts:[[40.34,19.76],[38.31,15.17],[37.37,17.01],[37.88,19.24],[37.54,22.39],[39.83,22.92],[41.95,21.21],[41.95,18.19],[42.2,15.96],[41.53,14.64],[40.42,15.04]] },
  { id:"right_lat_shoulder", view:"right_lat", label:"Shoulder",
    pts:[[59.07,19.11],[61.53,20.03],[61.44,18.58],[61.53,15.69],[59.49,15.43],[57.63,14.64],[56.69,15.96],[56.36,17.53],[56.86,18.98],[59.49,17.27],[57.37,19.37],[58.64,20.03],[60.25,20.68]] },
  { id:"posterior_shoulder_rt", view:"posterior", label:"Shoulder Rt",
    pts:[[91.06,20.42],[87.58,18.58],[87.75,20.68],[89.03,21.73],[91.23,23.44],[92.75,21.86],[92.42,18.58],[91.06,17.66],[89.7,16.61],[89.03,18.58],[88.52,22.13],[89.36,22.65],[90.55,23.31]] },
  { id:"posterior_shoulder_lt", view:"posterior", label:"Shoulder Lt",
    pts:[[77.75,19.11],[75.64,21.73],[75.72,23.44],[77.42,23.7],[79.36,21.86],[81.06,21.73],[81.14,19.24],[80.89,17.01],[79.96,15.82],[78.52,15.96],[77.16,16.87],[75.72,18.19],[75.3,20.16]] },
  { id:"anterior_chest", view:"anterior", label:"Chest",
    pts:[[15.47,19.76],[12.16,18.32],[11.31,18.71],[10.47,21.47],[10.72,22.78],[9.62,24.49],[10.38,25.8],[11.23,26.2],[11.99,28.69],[13.52,28.96],[14.45,28.96],[15.97,28.96],[18.09,28.82],[18.6,28.82],[20.04,27.25],[20.04,24.75],[20.72,24.75],[21.31,23.57],[20.21,21.73],[19.19,19.37],[18.26,17.79],[16.91,16.74],[14.87,17.27],[12.5,17.66]] },
  { id:"posterior_upper_back", view:"posterior", label:"Upper Back",
    pts:[[84.53,18.19],[82.5,20.16],[81.57,19.63],[81.31,16.87],[82.75,15.82],[84.7,15.69],[86.99,15.43],[89.19,16.22],[88.09,17.4],[87.08,18.45],[86.23,19.89],[85.21,20.42],[83.77,20.95]] },
  { id:"posterior_mid_back", view:"posterior", label:"Mid Back",
    pts:[[84.53,25.28],[82.25,20.68],[81.31,22.13],[80.38,23.7],[79.45,25.67],[79.36,28.3],[80.55,30.93],[83.18,32.76],[85.97,33.16],[87.58,35.13],[89.19,35.13],[89.79,33.03],[89.87,29.09],[90.47,26.85],[89.62,24.1],[88.35,22.26],[87.58,20.16],[84.79,21.34]] },
  { id:"left_lat_chest", view:"left_lat", label:"Chest",
    pts:[[36.19,23.7],[33.64,26.99],[34.92,28.17],[36.53,26.99],[37.54,26.07],[38.56,23.31],[37.63,21.34],[37.37,19.24],[36.86,17.4],[35.76,19.76],[34.92,21.86]] },
  { id:"right_lat_chest", view:"right_lat", label:"Chest",
    pts:[[63.47,23.18],[62.2,22],[61.36,24.62],[62.46,26.46],[63.31,28.04],[64.41,28.17],[65.76,27.64],[65.59,25.28],[63.22,18.71],[62.03,17.27],[61.69,20.16],[61.27,22.13]] },
  { id:"left_lat_lateral_thoracic", view:"left_lat", label:"Lateral Thoracic",
    pts:[[37.97,29.61],[34.32,28.69],[33.98,30.53],[34.41,32.24],[35.68,35.13],[37.12,35.13],[38.64,35.78],[39.83,35],[40.76,33.81],[40.76,31.45],[40.17,29.09],[38.98,26.99],[36.86,26.2],[35.34,27.51]] },
  { id:"right_lat_lateral_thoracic", view:"right_lat", label:"Lateral Thoracic",
    pts:[[60.93,29.61],[61.02,25.02],[59.75,27.25],[57.88,30.53],[57.46,32.9],[57.71,35.26],[60.34,34.87],[62.71,34.73],[63.64,33.42],[64.07,31.06],[63.81,29.61],[62.54,27.77],[62.29,25.8],[60.68,24.89]] },
  { id:"posterior_low_back", view:"posterior", label:"Low Back",
    pts:[[84.7,38.94],[84.03,32.63],[82.92,33.95],[81.82,33.95],[80.3,34.34],[79.7,35.65],[79.7,38.8],[81.31,39.99],[82.58,40.77],[86.82,36.84],[86.91,34.87],[85.89,33.95],[84.36,33.81],[84.45,38.8],[85.72,39.86],[86.99,39.99],[89.87,40.25],[89.36,37.89],[89.19,35.52]] },
  { id:"anterior_arm_rt", view:"anterior", label:"Arm Rt",
    pts:[[7.92,29.48],[5.97,27.91],[5.81,30.01],[6.48,33.42],[8.26,34.47],[8.77,32.5],[9.79,28.04],[9.03,26.72],[7.42,26.72],[7.67,29.61],[9.53,27.77],[9.45,26.2],[9.03,24.62],[7.58,23.83],[6.74,23.97],[6.4,25.8]] },
  { id:"left_lat_arm", view:"left_lat", label:"Arm",
    pts:[[42.37,26.33],[42.63,21.6],[41.61,21.34],[41.02,21.86],[39.75,23.05],[38.98,23.57],[38.22,25.02],[39.66,27.25],[40.51,28.96],[41.02,30.01],[43.05,32.11],[43.81,32.5],[44.92,32.24],[45.42,31.45],[45.42,29.35],[44.92,27.64],[44.41,25.28],[43.56,23.44]] },
  { id:"right_lat_arm", view:"right_lat", label:"Arm",
    pts:[[57.03,26.59],[54.92,27.51],[54.41,29.61],[54.07,31.71],[55.85,32.11],[58.14,30.01],[59.07,27.51],[60.25,25.02],[60.85,23.31],[61.36,20.81],[59.66,19.89],[58.05,18.98],[55.85,19.89],[55.51,23.05],[55.0,25.94],[54.49,27.91]] },
  { id:"posterior_arm_rt", view:"posterior", label:"Arm Rt",
    pts:[[91.99,28.96],[93.6,25.94],[93.6,23.7],[91.82,23.44],[90.47,23.83],[90.13,26.33],[90.3,30.14],[91.23,32.9],[92.33,34.34],[93.52,34.21],[93.94,31.32]] },
  { id:"posterior_arm_lt", view:"posterior", label:"Arm Lt",
    pts:[[76.74,29.61],[78.6,27.51],[78.86,26.2],[78.69,24.75],[77.5,23.31],[76.31,23.44],[75.47,24.49],[75.38,27.38],[76.65,30.53],[78.26,34.21],[75.89,34.73],[74.96,33.55],[74.36,31.71]] },
  { id:"posterior_hip_rt", view:"posterior", label:"Hip & Gluteal Rt",
    pts:[[88.86,49.18],[90.3,46.55],[90.21,43.53],[89.45,41.69],[88.43,40.25],[86.91,42.22],[86.48,43.66],[85.72,44.45],[85.72,47.47],[85.21,49.31],[85.64,51.67],[87.08,52.86],[88.69,52.33],[89.96,51.81],[89.53,49.44],[90.13,46.68]] },
  { id:"posterior_hip_lt", view:"posterior", label:"Hip & Gluteal Lt",
    pts:[[81.31,47.47],[84.36,49.57],[83.18,47.08],[82.84,44.32],[82.16,41.04],[79.79,40.38],[78.86,42.09],[78.86,45.9],[78.09,48.65],[78.52,50.62],[79.62,51.54],[81.74,52.2],[83.26,52.46],[84.03,51.54],[84.19,49.97]] },
  { id:"left_lat_hip", view:"left_lat", label:"Hip & Gluteal",
    pts:[[38.31,45.76],[34.83,44.58],[35.93,42.88],[37.46,42.22],[35.93,41.43],[37.2,40.64],[38.56,39.99],[39.49,40.12],[40.51,42.22],[41.78,43.27],[42.37,45.76],[42.37,48.26],[41.69,49.57],[40.85,50.62],[40.68,51.94]] },
  { id:"right_lat_hip", view:"right_lat", label:"Hip & Gluteal",
    pts:[[60.59,46.16],[63.05,47.21],[63.9,47.21],[64.58,44.32],[63.31,42.61],[62.63,40.77],[60.68,39.46],[59.15,40.12],[57.88,41.69],[57.12,43.53],[56.61,45.9],[56.53,48.92],[57.29,50.23],[58.56,51.54],[60.51,49.18],[62.2,48.52],[63.73,47.6]] },
  { id:"anterior_groin", view:"anterior", label:"Groin",
    pts:[[15.47,49.7],[14.87,55.22],[13.43,55.09],[13.01,53.25],[12.84,48],[14.53,47.08],[16.57,46.68],[17.84,46.95],[18.09,48.26],[18.18,50.1],[17.75,52.2],[17.33,53.91],[16.48,54.96],[15.64,55.48]] },
  { id:"posterior_sacrum", view:"posterior", label:"Sacrum / Tail Bone",
    pts:[[84.53,45.11],[84.28,43.01],[82.84,42.48],[83.94,49.31],[85.21,48.79],[86.65,42.74]] },
  { id:"posterior_si_joint", view:"posterior", label:"SI Joint",
    pts:[[84.7,42.48],[81.82,42.35],[82.84,44.19],[83.35,45.11],[85.04,45.5],[86.57,43.53],[87.58,41.83],[86.57,40.91]] },
  { id:"anterior_hip_rt", view:"anterior", label:"Hip Joint Rt",
    pts:[[11.99,50.89],[14.11,50.1],[12.58,47.87],[11.57,45.9],[10.13,46.03],[9.28,48.26],[9.28,51.41],[11.4,53.12],[12.84,53.64],[14.19,52.46],[14.28,51.15]] },
  { id:"anterior_hip_lt", view:"anterior", label:"Hip Joint Lt",
    pts:[[19.53,49.18],[20.89,47.34],[20.72,44.58],[19.28,44.58],[18.18,47.08],[16.57,49.05],[16.65,51.15],[18.86,52.86],[21.14,51.28],[21.4,47.6]] },
  { id:"anterior_thigh_rt", view:"anterior", label:"Thigh Rt",
    pts:[[11.65,57.32],[14.03,56.53],[13.09,53.91],[11.82,53.12],[9.96,52.59],[9.62,56.4],[9.53,59.16],[9.53,62.44],[10.81,63.49],[11.74,64.81],[13.86,64.41],[14.03,62.18],[14.03,60.34],[14.19,58.24]] },
  { id:"anterior_thigh_lt", view:"anterior", label:"Thigh Lt",
    pts:[[18.69,59.29],[21.74,58.11],[21.74,55.35],[20.97,53.64],[19.96,51.81],[18.69,52.07],[18.01,52.2],[17.08,53.91],[15.81,56.8],[16.57,59.95],[16.57,62.57],[18.01,62.84],[20.3,62.84],[21.57,60.08]] },
  { id:"anterior_knee_rt", view:"anterior", label:"Knee Rt",
    pts:[[12.84,68.09],[10.3,69.67],[10.47,72.42],[11.91,75.44],[13.26,75.05],[13.94,73.21],[14.11,69.8],[14.19,64.81],[11.99,64.28],[11.14,64.15],[10.21,64.67],[10.47,67.43]] },
  { id:"anterior_knee_lt", view:"anterior", label:"Knee Lt",
    pts:[[18.43,68.48],[16.48,69.14],[16.4,67.3],[16.31,64.54],[17.67,63.23],[19.28,63.89],[20.13,64.54],[20.38,67.83],[20.13,69.93],[19.62,73.47],[17.75,72.55],[16.82,72.03],[16.48,69.4]] },
  { id:"left_lat_knee", view:"left_lat", label:"Knee",
    pts:[[38.81,69.53],[40.25,68.09],[40.25,66.38],[40.42,64.02],[39.24,63.89],[37.97,63.89],[36.78,63.76],[36.1,66.12],[36.78,69.01],[37.12,72.03],[38.73,73.6],[40.08,72.42],[40.85,71.63],[40.93,70.06],[40.59,68.35]] },
  { id:"right_lat_knee", view:"right_lat", label:"Knee",
    pts:[[60.34,68.35],[62.8,68.09],[62.8,65.86],[61.44,64.94],[60.17,64.94],[59.15,65.2],[58.9,65.99],[57.88,70.45],[59.75,72.29],[61.19,73.6],[61.78,72.42],[61.86,70.19],[62.71,68.35]] },
  { id:"posterior_knee_rt", view:"posterior", label:"Knee Rt",
    pts:[[87.92,68.48],[89.87,67.83],[89.87,66.25],[89.11,64.81],[88.09,63.89],[86.31,64.28],[85.55,65.59],[85.47,68.35],[86.31,71.11],[87.08,71.63],[88.6,72.16],[89.28,70.72],[89.62,69.67]] },
  { id:"posterior_knee_lt", view:"posterior", label:"Knee Lt",
    pts:[[81.06,68.09],[83.52,67.83],[83.18,66.25],[81.99,64.94],[80.04,64.15],[78.94,65.59],[79.19,70.19],[79.7,72.16],[81.65,71.63],[82.5,70.98],[83.35,68.75]] },

  // ── FACE ──────────────────────────────────────────────────────────────────
  { id:"anterior_face", view:"anterior", label:"Face",
    pts:[[15.5,2.8],[14.2,3.8],[13.8,6.2],[14.5,9.5],[16,11],[18,11],[19.5,9.5],[20.2,6.2],[19.8,3.8],[18.5,2.8]] },
  { id:"left_lat_face", view:"left_lat", label:"Face",
    pts:[[36.5,2.5],[35.5,4.5],[35,6.5],[35.5,9],[37,11],[38.5,10.5],[39.5,8.5],[39.5,5],[38.5,2.5]] },
  { id:"right_lat_face", view:"right_lat", label:"Face",
    pts:[[61.5,2.5],[60.5,4.5],[59,5],[58.5,8.5],[59.5,10.5],[61,11],[62.5,9],[63,6.5],[62.5,4.5]] },

  // ── ABDOMEN ───────────────────────────────────────────────────────────────
  { id:"anterior_upper_abdomen", view:"anterior", label:"Upper Abdomen",
    pts:[[13.5,36.5],[12.8,38],[12.5,41],[13,44],[16,45],[18,45],[21,44],[21.5,41],[21.2,38],[20.5,36.5]] },
  { id:"anterior_lower_abdomen", view:"anterior", label:"Lower Abdomen",
    pts:[[13,44],[12.5,47],[12.8,50.5],[14,53],[16.5,55],[18,55],[20,53],[21.2,50.5],[21.5,47],[21,44]] },

  // ── SCAPULA ───────────────────────────────────────────────────────────────
  { id:"posterior_scapula_rt", view:"posterior", label:"Scapula Rt",
    pts:[[88,22],[90,24],[91,27],[90.5,31],[88.5,33],[86.5,32],[85,29],[85,25],[86,22]] },
  { id:"posterior_scapula_lt", view:"posterior", label:"Scapula Lt",
    pts:[[76,22],[74,24],[73,27],[73.5,31],[75.5,33],[77.5,32],[79,29],[79,25],[78,22]] },

  // ── ARM LT (ANTERIOR) ─────────────────────────────────────────────────────
  { id:"anterior_arm_lt", view:"anterior", label:"Arm Lt",
    pts:[[23.5,24.5],[24.5,26],[25,28],[25.2,31],[24.5,34],[23.5,34.5],[22.5,33],[22,30],[22,27],[22.5,24.5]] },

  // ── ELBOW ─────────────────────────────────────────────────────────────────
  { id:"anterior_elbow_rt", view:"anterior", label:"Elbow Rt",
    pts:[[9.5,34.5],[8.5,35],[8,36.5],[8.5,38],[10,38.5],[11.5,38],[12,36.5],[11.5,35],[10.5,34.5]] },
  { id:"anterior_elbow_lt", view:"anterior", label:"Elbow Lt",
    pts:[[22.5,34.5],[23.5,35],[24,36.5],[23.5,38],[22,38.5],[20.5,38],[20,36.5],[20.5,35],[21.5,34.5]] },
  { id:"left_lat_elbow", view:"left_lat", label:"Elbow",
    pts:[[43.5,31.5],[44,33],[44.5,35],[43.5,36],[42,35.5],[41.5,34],[41.5,32.5],[42.5,31.5]] },
  { id:"right_lat_elbow", view:"right_lat", label:"Elbow",
    pts:[[54.5,31.5],[54,33],[53.5,35],[54.5,36],[56,35.5],[56.5,34],[56.5,32.5],[55.5,31.5]] },
  { id:"posterior_elbow_rt", view:"posterior", label:"Elbow Rt",
    pts:[[90,34.5],[91.5,35],[92,36.5],[91.5,38],[90,38.5],[88.5,38],[88,36.5],[88.5,35],[89.5,34.5]] },
  { id:"posterior_elbow_lt", view:"posterior", label:"Elbow Lt",
    pts:[[76,34.5],[74.5,35],[74,36.5],[74.5,38],[76,38.5],[77.5,38],[78,36.5],[77.5,35],[76.5,34.5]] },

  // ── FOREARM ───────────────────────────────────────────────────────────────
  { id:"anterior_forearm_rt", view:"anterior", label:"Forearm Rt",
    pts:[[10,38.5],[8.5,39],[7.5,41],[7,43],[7.5,46],[9,47],[10.5,47],[12,46],[12.5,43],[12,40],[10.5,38.5]] },
  { id:"anterior_forearm_lt", view:"anterior", label:"Forearm Lt",
    pts:[[22,38.5],[23.5,39],[24.5,40],[25,43],[24.5,46],[23,47],[21.5,47],[20,46],[19.5,43],[20,40],[21.5,38.5]] },
  { id:"left_lat_forearm", view:"left_lat", label:"Forearm",
    pts:[[43.5,36],[44,38],[44.5,41],[44,44],[43,45],[41.5,44.5],[40.5,42],[40.5,39],[41.5,36]] },
  { id:"right_lat_forearm", view:"right_lat", label:"Forearm",
    pts:[[54.5,36],[54,38],[53.5,41],[54,44],[55,45],[56.5,44.5],[57.5,42],[57.5,39],[56.5,36]] },
  { id:"posterior_forearm_rt", view:"posterior", label:"Forearm Rt",
    pts:[[90,38.5],[91.5,39],[92.5,41],[93,44],[92.5,46],[91,47],[89.5,47],[88,46],[87.5,43],[88,40],[89.5,38.5]] },
  { id:"posterior_forearm_lt", view:"posterior", label:"Forearm Lt",
    pts:[[76,38.5],[74.5,39],[73.5,40],[73,43],[73.5,46],[75,47],[76.5,47],[78,46],[78.5,43],[78,40],[76.5,38.5]] },

  // ── WRIST ─────────────────────────────────────────────────────────────────
  { id:"anterior_wrist_rt", view:"anterior", label:"Wrist Rt",
    pts:[[9.5,47],[7.5,47.5],[7,49],[7.5,50.5],[9.5,51],[11.5,50.5],[12,49],[11.5,47.5]] },
  { id:"anterior_wrist_lt", view:"anterior", label:"Wrist Lt",
    pts:[[22.5,47],[24.5,47.5],[25,49],[24.5,50.5],[22.5,51],[20.5,50.5],[20,49],[20.5,47.5]] },
  { id:"posterior_wrist_rt", view:"posterior", label:"Wrist Rt",
    pts:[[90.5,47],[92.5,47.5],[93,49],[92.5,50.5],[90.5,51],[88.5,50.5],[88,49],[88.5,47.5]] },
  { id:"posterior_wrist_lt", view:"posterior", label:"Wrist Lt",
    pts:[[75.5,47],[73.5,47.5],[73,49],[73.5,50.5],[75.5,51],[77.5,50.5],[78,49],[77.5,47.5]] },

  // ── HAND ──────────────────────────────────────────────────────────────────
  { id:"anterior_hand_rt", view:"anterior", label:"Hand Rt",
    pts:[[9.5,51],[7,51.5],[6,53],[6.5,56],[8,58],[10,58.5],[12,58],[13.5,56],[14,53],[13,51.5]] },
  { id:"anterior_hand_lt", view:"anterior", label:"Hand Lt",
    pts:[[22.5,51],[25,51.5],[26,53],[25.5,56],[24,58],[22,58.5],[20,58],[18.5,56],[18,53],[19,51.5]] },
  { id:"posterior_hand_rt", view:"posterior", label:"Hand Rt",
    pts:[[90.5,51],[93,51.5],[94,53],[93.5,56],[92,58],[90,58.5],[88,58],[86.5,56],[86,53],[87,51.5]] },
  { id:"posterior_hand_lt", view:"posterior", label:"Hand Lt",
    pts:[[75.5,51],[73,51.5],[72,53],[72.5,56],[74,58],[76,58.5],[78,58],[79.5,56],[80,53],[79,51.5]] },

  // ── HAMSTRINGS (POSTERIOR THIGH) ──────────────────────────────────────────
  { id:"posterior_thigh_rt", view:"posterior", label:"Hamstring / Posterior Thigh Rt",
    pts:[[86,53],[88.5,54],[89,57],[88.5,61],[87,64],[85,64.5],[83,64],[81.5,61],[81.5,57],[82.5,54]] },
  { id:"posterior_thigh_lt", view:"posterior", label:"Hamstring / Posterior Thigh Lt",
    pts:[[80,53],[77.5,54],[77,57],[77.5,61],[79,64],[81,64.5],[83,64],[84.5,61],[84.5,57],[83.5,54]] },
  { id:"left_lat_hamstring", view:"left_lat", label:"Posterior Thigh",
    pts:[[39,52],[40.5,53],[41.5,55],[41.5,59],[40.5,63],[38.5,64],[36.5,63],[35.5,59],[35.5,55],[36.5,53]] },
  { id:"right_lat_hamstring", view:"right_lat", label:"Posterior Thigh",
    pts:[[59,52],[57.5,53],[56.5,55],[56.5,59],[57.5,63],[59.5,64],[61.5,63],[62.5,59],[62.5,55],[61.5,53]] },

  // ── LOWER LEG (SHIN / ANTERIOR LEG) ──────────────────────────────────────
  { id:"anterior_lower_leg_rt", view:"anterior", label:"Lower Leg / Shin Rt",
    pts:[[14.5,75.5],[12.5,76],[12,79],[12,83],[13,86],[15,87],[16.5,86],[17,83],[17,79],[15.5,75.5]] },
  { id:"anterior_lower_leg_lt", view:"anterior", label:"Lower Leg / Shin Lt",
    pts:[[19.5,75.5],[21.5,76],[22,79],[22,83],[21,86],[19,87],[17.5,86],[17,83],[17,79],[18.5,75.5]] },
  { id:"left_lat_lower_leg", view:"left_lat", label:"Lower Leg",
    pts:[[38.5,73.5],[40,74],[41,76],[41.5,80],[41,84],[39.5,86],[37.5,85.5],[36,84],[35.5,80],[36,76]] },
  { id:"right_lat_lower_leg", view:"right_lat", label:"Lower Leg",
    pts:[[59.5,73.5],[58,74],[57,76],[56.5,80],[57,84],[58.5,86],[60.5,85.5],[62,84],[62.5,80],[62,76]] },

  // ── CALF (POSTERIOR LEG) ──────────────────────────────────────────────────
  { id:"posterior_calf_rt", view:"posterior", label:"Calf Rt",
    pts:[[86,72.5],[88,73],[89,76],[89,80],[88,84],[86,85],[84,84],[83,80],[83,76],[84,73]] },
  { id:"posterior_calf_lt", view:"posterior", label:"Calf Lt",
    pts:[[80,72.5],[78,73],[77,76],[77,80],[78,84],[80,85],[82,84],[83,80],[83,76],[82,73]] },
  { id:"left_lat_calf", view:"left_lat", label:"Calf",
    pts:[[37.5,73.5],[35.5,74],[34.5,76],[34.5,80],[35.5,84],[37.5,85.5],[39.5,84],[40.5,80],[40.5,76],[39.5,74]] },
  { id:"right_lat_calf", view:"right_lat", label:"Calf",
    pts:[[60.5,73.5],[62.5,74],[63.5,76],[63.5,80],[62.5,84],[60.5,85.5],[58.5,84],[57.5,80],[57.5,76],[58.5,74]] },

  // ── ANKLE ─────────────────────────────────────────────────────────────────
  { id:"anterior_ankle_rt", view:"anterior", label:"Ankle Rt",
    pts:[[14.5,87],[12,87.5],[11.5,89.5],[12.5,91.5],[14.5,92],[16.5,91.5],[17.5,89.5],[17,87.5]] },
  { id:"anterior_ankle_lt", view:"anterior", label:"Ankle Lt",
    pts:[[19.5,87],[22,87.5],[22.5,89.5],[21.5,91.5],[19.5,92],[17.5,91.5],[16.5,89.5],[17,87.5]] },
  { id:"left_lat_ankle", view:"left_lat", label:"Ankle",
    pts:[[38.5,86],[36,87],[35,89],[35.5,91],[37.5,92],[39.5,91.5],[41,90],[41,88],[39.5,86]] },
  { id:"right_lat_ankle", view:"right_lat", label:"Ankle",
    pts:[[59.5,86],[62,87],[63,89],[62.5,91],[60.5,92],[58.5,91.5],[57,90],[57,88],[58.5,86]] },
  { id:"posterior_ankle_rt", view:"posterior", label:"Ankle Rt",
    pts:[[85.5,87],[87.5,87.5],[88.5,89.5],[88,91.5],[86,92],[84,91.5],[83,89.5],[83.5,87.5]] },
  { id:"posterior_ankle_lt", view:"posterior", label:"Ankle Lt",
    pts:[[80.5,87],[78.5,87.5],[77.5,89.5],[78,91.5],[80,92],[82,91.5],[83,89.5],[82.5,87.5]] },

  // ── FOOT ──────────────────────────────────────────────────────────────────
  { id:"anterior_foot_rt", view:"anterior", label:"Foot Rt",
    pts:[[15,92],[11.5,92.5],[10,94],[10.5,97],[12,98.5],[15,99],[17.5,98.5],[18.5,97],[18,94],[16.5,92.5]] },
  { id:"anterior_foot_lt", view:"anterior", label:"Foot Lt",
    pts:[[19,92],[22.5,92.5],[24,94],[23.5,97],[22,98.5],[19,99],[16.5,98.5],[15.5,97],[16,94],[17.5,92.5]] },
  { id:"left_lat_foot", view:"left_lat", label:"Foot",
    pts:[[38.5,91.5],[36,92.5],[34,94],[33.5,97],[35,98.5],[38.5,99],[42,98],[43,96],[41.5,93],[39.5,91.5]] },
  { id:"right_lat_foot", view:"right_lat", label:"Foot",
    pts:[[59.5,91.5],[62,92.5],[64,94],[64.5,97],[63,98.5],[59.5,99],[56,98],[55,96],[56.5,93],[58.5,91.5]] },
  { id:"posterior_foot_rt", view:"posterior", label:"Foot Rt",
    pts:[[85.5,92],[88.5,92.5],[90,94],[89.5,97],[88,98.5],[85,99],[82.5,98.5],[81.5,97],[82,94],[83.5,92.5]] },
  { id:"posterior_foot_lt", view:"posterior", label:"Foot Lt",
    pts:[[80.5,92],[77.5,92.5],[76,94],[76.5,97],[78,98.5],[81,99],[83.5,98.5],[84.5,97],[84,94],[82.5,92.5]] },

  // ── PELVIC FLOOR / PERINEUM ───────────────────────────────────────────────
  { id:"anterior_pelvic_floor", view:"anterior", label:"Pelvic Floor / Perineum",
    pts:[[16,56],[14.5,56.5],[13.5,58],[14,59.5],[16,60],[18,59.5],[18.5,58],[17.5,56.5]] },
];

// ─── HELPER: pts array → SVG polygon points string ───────────────────────────
function ptsToSVG(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

// ─── SYMPTOM PANEL ────────────────────────────────────────────────────────────
function SymptomPanel({ region, entry, onSave, onClose }) {
  const [symptoms, setSymptoms] = useState(entry?.symptoms || []);
  const [intensity, setIntensity] = useState(entry?.intensity || 5);
  const [notes, setNotes] = useState(entry?.notes || "");
  const [radiation, setRadiation] = useState(entry?.radiation || false);

  const toggleSymptom = (id) => {
    setSymptoms(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  };

  const primaryColor = symptoms.length > 0
    ? SYMPTOM_TYPES.find(s => s.id === symptoms[0])?.color || "#7c3aed"
    : "#7c3aed";

  return (
    <div style={{
      position:"absolute", right:0, top:0, bottom:0, width:280,
      background:"#ffffff", borderLeft:"1px solid #e5e7eb",
      display:"flex", flexDirection:"column", zIndex:50,
      boxShadow:"-4px 0 20px rgba(0,0,0,0.12)", borderRadius:"0 12px 12px 0",
      fontFamily:"system-ui,sans-serif"
    }}>
      {/* Header */}
      <div style={{padding:"14px 16px", borderBottom:"1px solid #f0f0f0",
        background:`linear-gradient(135deg,${primaryColor}15,${primaryColor}05)`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontWeight:800, fontSize:"0.9rem", color:"#111"}}>📍 {region.label}</div>
            <div style={{fontSize:"0.65rem", color:"#9ca3af", marginTop:2, textTransform:"capitalize"}}>{region.view.replace("_"," ")}</div>
          </div>
          <button onClick={onClose} style={{background:"#f3f4f6", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:"0.9rem", display:"flex",
            alignItems:"center", justifyContent:"center"}}>✕</button>
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"14px 16px"}}>
        {/* Symptoms */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8}}>Symptoms</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:5}}>
            {SYMPTOM_TYPES.map(s => {
              const selected = symptoms.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSymptom(s.id)}
                  style={{padding:"7px 8px", borderRadius:8, cursor:"pointer", textAlign:"left",
                    border:`1.5px solid ${selected ? s.color : "#e5e7eb"}`,
                    background: selected ? s.bg : "#fafafa",
                    color: selected ? s.color : "#374151",
                    fontWeight: selected ? 700 : 400, fontSize:"0.72rem",
                    transition:"all 0.12s"}}>
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pain Scale */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6}}>
            Intensity — {intensity}/10
          </div>
          <input type="range" min={0} max={10} value={intensity}
            onChange={e => setIntensity(Number(e.target.value))}
            style={{width:"100%", accentColor: primaryColor}}/>
          <div style={{display:"flex", justifyContent:"space-between",
            fontSize:"0.6rem", color:"#9ca3af", marginTop:2}}>
            <span>0 — None</span><span>5 — Moderate</span><span>10 — Worst</span>
          </div>
        </div>

        {/* Radiation */}
        <div style={{marginBottom:14}}>
          <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
            <input type="checkbox" checked={radiation}
              onChange={e => setRadiation(e.target.checked)}
              style={{accentColor: primaryColor, width:15, height:15}}/>
            <span style={{fontSize:"0.78rem", fontWeight:600, color:"#374151"}}>
              ⚡ Radiation / Referred pain
            </span>
          </label>
        </div>

        {/* Notes */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6}}>Notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Clinical observations, onset, aggravating factors…"
            rows={3} style={{width:"100%", border:"1px solid #e5e7eb", borderRadius:8,
              padding:"8px 10px", fontSize:"0.75rem", fontFamily:"inherit",
              outline:"none", resize:"vertical", color:"#374151", boxSizing:"border-box"}}/>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"12px 16px", borderTop:"1px solid #f0f0f0",
        display:"flex", gap:8}}>
        <button onClick={() => onSave({ regionId:region.id, symptoms, intensity, radiation, notes })}
          style={{flex:1, padding:"9px", borderRadius:8, background:primaryColor,
            color:"#fff", border:"none", fontWeight:700, fontSize:"0.78rem",
            cursor:"pointer"}}>
          ✓ Save
        </button>
        <button onClick={onClose}
          style={{padding:"9px 14px", borderRadius:8, background:"#f3f4f6",
            color:"#6b7280", border:"none", fontWeight:600, fontSize:"0.78rem",
            cursor:"pointer"}}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN MODE — Polygon Editor ──────────────────────────────────────────────
function AdminOverlay({ regions, onUpdate, svgRef }) {
  const [dragging, setDragging] = useState(null); // { regionId, ptIdx }
  const [selected, setSelected] = useState(null); // regionId
  const [editedRegions, setEditedRegions] = useState(
    () => regions.reduce((acc, r) => { acc[r.id] = [...r.pts.map(p=>[...p])]; return acc; }, {})
  );

  const getSVGCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [
      ((clientX - rect.left) / rect.width) * 100,
      ((clientY - rect.top) / rect.height) * 100,
    ];
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const coords = getSVGCoords(e);
    if (!coords) return;
    setEditedRegions(prev => {
      const next = { ...prev };
      const pts = next[dragging.regionId].map((p, i) =>
        i === dragging.ptIdx ? coords : p
      );
      next[dragging.regionId] = pts;
      return next;
    });
  }, [dragging, getSVGCoords]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      onUpdate(dragging.regionId, editedRegions[dragging.regionId]);
      setDragging(null);
    }
  }, [dragging, editedRegions, onUpdate]);

  const addPoint = (regionId, afterIdx) => {
    setEditedRegions(prev => {
      const pts = [...prev[regionId]];
      const p1 = pts[afterIdx];
      const p2 = pts[(afterIdx + 1) % pts.length];
      pts.splice(afterIdx + 1, 0, [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2]);
      const next = { ...prev, [regionId]: pts };
      onUpdate(regionId, pts);
      return next;
    });
  };

  const removePoint = (regionId, ptIdx) => {
    setEditedRegions(prev => {
      const pts = prev[regionId].filter((_, i) => i !== ptIdx);
      if (pts.length < 3) return prev;
      const next = { ...prev, [regionId]: pts };
      onUpdate(regionId, pts);
      return next;
    });
  };

  return (
    <g onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
       onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
      {regions.map(r => {
        const pts = editedRegions[r.id] || r.pts;
        const isSel = selected === r.id;
        return (
          <g key={r.id}>
            <polygon
              points={ptsToSVG(pts)}
              fill={isSel ? "rgba(124,58,237,0.15)" : "rgba(0,229,255,0.06)"}
              stroke={isSel ? "#7c3aed" : "#00e5ff"}
              strokeWidth="0.4"
              strokeDasharray="1,1"
              style={{cursor:"pointer"}}
              onClick={() => setSelected(isSel ? null : r.id)}
            />
            {isSel && pts.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="0.8" fill="#7c3aed" stroke="#fff" strokeWidth="0.25"
                  style={{cursor:"grab"}}
                  onMouseDown={e => { e.stopPropagation(); setDragging({regionId:r.id, ptIdx:i}); }}
                  onTouchStart={e => { e.stopPropagation(); setDragging({regionId:r.id, ptIdx:i}); }}
                />
                <circle cx={x} cy={y} r="1.5" fill="transparent"
                  onDoubleClick={() => removePoint(r.id, i)}
                  onClick={e => { e.stopPropagation(); if(e.altKey) removePoint(r.id, i); }}
                />
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

// ─── RADIATION ARROW ─────────────────────────────────────────────────────────
function RadiationArrows({ arrows }) {
  return (
    <g>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4 Z" fill="#ec4899" opacity="0.85"/>
        </marker>
      </defs>
      {arrows.map((a, i) => (
        <line key={i}
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="#ec4899" strokeWidth="0.6" strokeDasharray="2,1.5" opacity="0.85"
          markerEnd="url(#arrowhead)"/>
      ))}
    </g>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BodyChartPro({ data = {}, set = () => {} }) {
  // Body chart data stored as data.body_chart_pro
  const chartData = (() => {
    try { return JSON.parse(data.body_chart_pro || "{}"); } catch { return {}; }
  })();
  const saveData = (d) => set("body_chart_pro", JSON.stringify(d));

  const [entries, setEntries]           = useState(chartData.entries || []);
  const [hovered, setHovered]           = useState(null);
  const [tooltip, setTooltip]           = useState(null);
  const [activePanel, setActivePanel]   = useState(null); // region being edited
  const [adminMode, setAdminMode]       = useState(false);
  const [editedPts, setEditedPts]       = useState({});
  const [radiationMode, setRadiationMode] = useState(false);
  const [radiationDraw, setRadiationDraw] = useState(null);
  const [arrows, setArrows]             = useState(chartData.arrows || []);
  const [imgLoaded, setImgLoaded]       = useState(false);
  const svgRef = useRef(null);

  // Persist whenever entries/arrows change
  useEffect(() => {
    saveData({ entries, arrows });
  }, [entries, arrows]);

  const getRegion = (id) => REGIONS.find(r => r.id === id);
  const getEntry  = (id) => entries.find(e => e.regionId === id);
  const effectiveRegions = REGIONS.map(r => ({ ...r, pts: editedPts[r.id] || r.pts }));

  const handleRegionClick = useCallback((regionId, e) => {
    if (adminMode) return;
    if (radiationMode) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (!radiationDraw) {
        setRadiationDraw({ x1:x, y1:y });
      } else {
        setArrows(p => [...p, { ...radiationDraw, x2:x, y2:y, from:regionId }]);
        setRadiationDraw(null);
      }
      return;
    }
    setActivePanel(regionId);
  }, [adminMode, radiationMode, radiationDraw]);

  const handleSave = (saved) => {
    setEntries(prev => {
      const next = prev.filter(e => e.regionId !== saved.regionId);
      if (saved.symptoms.length > 0) return [...next, saved];
      return next;
    });
    setActivePanel(null);
  };

  const handleRemove = (regionId) => {
    setEntries(prev => prev.filter(e => e.regionId !== regionId));
    setActivePanel(null);
  };

  const getRegionFill = (regionId) => {
    const entry = getEntry(regionId);
    if (!entry || entry.symptoms.length === 0) return "transparent";
    const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
    return sym ? sym.bg : "rgba(124,58,237,0.2)";
  };

  const getRegionStroke = (regionId) => {
    if (hovered === regionId) return "#3b82f6";
    const entry = getEntry(regionId);
    if (!entry || entry.symptoms.length === 0) return "transparent";
    const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
    return sym ? sym.color : "#7c3aed";
  };

  // Export data
  const exportData = () => {
    const out = entries.map(e => ({
      region: getRegion(e.regionId)?.label || e.regionId,
      view: getRegion(e.regionId)?.view || "",
      symptoms: e.symptoms,
      intensity: e.intensity,
      radiation: e.radiation,
      notes: e.notes,
    }));
    return JSON.stringify(out, null, 2);
  };

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", userSelect:"none" }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
        <div style={{ fontWeight:800, fontSize:"0.82rem", color:"#1a1025", flex:1 }}>
          🫁 Body Chart
          {entries.length > 0 && (
            <span style={{ marginLeft:8, fontSize:"0.7rem", background:"rgba(124,58,237,0.12)",
              color:"#7c3aed", borderRadius:20, padding:"2px 9px", fontWeight:700 }}>
              {entries.length} region{entries.length!==1?"s":""}
            </span>
          )}
        </div>

        {/* Symptom legend */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {SYMPTOM_TYPES.map(s => (
            <span key={s.id} style={{ fontSize:"0.58rem", padding:"2px 7px", borderRadius:20,
              background:s.bg, color:s.color, fontWeight:700, border:`1px solid ${s.color}40` }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        <button onClick={() => setRadiationMode(p => !p)}
          style={{ padding:"5px 11px", borderRadius:8, border:`1.5px solid ${radiationMode?"#ec4899":"#e5e7eb"}`,
            background:radiationMode?"rgba(236,72,153,0.12)":"transparent",
            color:radiationMode?"#ec4899":"#6b7280",
            fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
          {radiationMode ? "⚡ Drawing…" : "⚡ Radiation"}
        </button>
        {radiationDraw && (
          <span style={{ fontSize:"0.7rem", color:"#ec4899", fontWeight:600 }}>
            Click end point →
          </span>
        )}
        {arrows.length > 0 && (
          <button onClick={() => setArrows([])}
            style={{ padding:"4px 9px", borderRadius:7, border:"1px solid #fca5a5",
              background:"#fef2f2", color:"#ef4444", fontSize:"0.65rem",
              fontWeight:700, cursor:"pointer" }}>
            Clear arrows
          </button>
        )}
        <button onClick={() => setAdminMode(p => !p)}
          style={{ padding:"5px 11px", borderRadius:8, border:`1.5px solid ${adminMode?"#7c3aed":"#e5e7eb"}`,
            background:adminMode?"rgba(124,58,237,0.12)":"transparent",
            color:adminMode?"#7c3aed":"#6b7280",
            fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
          {adminMode ? "🔧 Admin ON" : "🔧 Admin"}
        </button>
        {entries.length > 0 && (
          <button onClick={() => setEntries([])}
            style={{ padding:"5px 11px", borderRadius:8, border:"1px solid #fca5a5",
              background:"#fef2f2", color:"#ef4444",
              fontWeight:700, fontSize:"0.7rem", cursor:"pointer" }}>
            Clear all
          </button>
        )}
      </div>

      {/* ── Chart container ──────────────────────────────────────────────────── */}
      <div style={{ position:"relative", width:"100%", background:"#000",
        borderRadius:12, overflow:"hidden",
        border:"1px solid #e5e7eb" }}>

        {/* Body image */}
        <img
          src={BODY_IMAGE_URL}
          alt="Anatomical Body Chart"
          style={{ width:"100%", display:"block",
            opacity: imgLoaded ? 1 : 0, transition:"opacity 0.4s" }}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.target.style.opacity="0.4"; setImgLoaded(true); }}
        />

        {!imgLoaded && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", padding:24,
            background:"#111827", color:"#9ca3af" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🖼️</div>
            <div style={{ fontWeight:800, fontSize:"0.9rem", color:"#f9fafb", marginBottom:8 }}>
              Body Chart Image Not Uploaded
            </div>
            <div style={{ fontSize:"0.75rem", textAlign:"center", lineHeight:1.7, maxWidth:320, color:"#9ca3af" }}>
              Upload the anatomical body chart image to Cloudinary with public ID:
              <code style={{ display:"block", margin:"8px 0", padding:"6px 12px",
                background:"rgba(255,255,255,0.08)", borderRadius:6,
                color:"#a78bfa", fontSize:"0.82rem", fontWeight:700 }}>
                body-chart-4view
              </code>
              Use the <strong style={{color:"#f9fafb"}}>Cloudinary Uploader</strong> tool
              → filter by <strong style={{color:"#f43f5e"}}>⭐ Assets</strong> → drag the image
            </div>
          </div>
        )}

        {/* SVG overlay */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%",
            cursor: radiationMode ? "crosshair" : "default" }}
        >
          {/* Region polygons */}
          {effectiveRegions.map(r => {
            const entry = getEntry(r.id);
            const isHov = hovered === r.id;
            const isSel = activePanel === r.id;
            const fill  = getRegionFill(r.id);
            const stroke = getRegionStroke(r.id);
            const hasData = !!entry && entry.symptoms.length > 0;

            return (
              <polygon
                key={r.id}
                points={ptsToSVG(r.pts)}
                fill={isHov ? "rgba(59,130,246,0.18)" : isSel ? "rgba(124,58,237,0.18)" : fill}
                stroke={isHov ? "#3b82f6" : isSel ? "#7c3aed" : stroke}
                strokeWidth={isHov || isSel || hasData ? "0.35" : "0"}
                style={{ cursor:"pointer", transition:"fill 0.1s, stroke 0.1s" }}
                onMouseEnter={(e) => {
                  setHovered(r.id);
                  const svg = svgRef.current;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltip({
                      label: r.label,
                      view: r.view,
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                      entry,
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const svg = svgRef.current;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    setTooltip(t => t ? { ...t,
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                    } : t);
                  }
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                onClick={(e) => handleRegionClick(r.id, e)}
              />
            );
          })}

          {/* Symptom markers — small colored circles at centroid */}
          {entries.map(entry => {
            const r = effectiveRegions.find(rr => rr.id === entry.regionId);
            if (!r || !entry.symptoms.length) return null;
            const cx = r.pts.reduce((s, p) => s + p[0], 0) / r.pts.length;
            const cy = r.pts.reduce((s, p) => s + p[1], 0) / r.pts.length;
            const sym = SYMPTOM_TYPES.find(s => s.id === entry.symptoms[0]);
            return (
              <g key={entry.regionId}>
                <circle cx={cx} cy={cy} r="1.2" fill={sym?.color || "#7c3aed"}
                  opacity="0.9" stroke="#fff" strokeWidth="0.25"/>
                {entry.symptoms.length > 1 && (
                  <text x={cx + 1.8} y={cy + 0.5} fontSize="1.1" fill="#fff"
                    fontWeight="bold">+{entry.symptoms.length - 1}</text>
                )}
                {entry.intensity >= 7 && (
                  <circle cx={cx} cy={cy} r="2.2" fill="none"
                    stroke={sym?.color || "#ef4444"} strokeWidth="0.3" opacity="0.5">
                    <animate attributeName="r" values="1.8;2.8;1.8" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                )}
              </g>
            );
          })}

          {/* Radiation arrows */}
          <RadiationArrows arrows={arrows} />

          {/* Radiation in-progress */}
          {radiationDraw && (
            <circle cx={radiationDraw.x1} cy={radiationDraw.y1} r="1"
              fill="#ec4899" opacity="0.8"/>
          )}

          {/* Admin overlay */}
          {adminMode && (
            <AdminOverlay
              regions={effectiveRegions}
              svgRef={svgRef}
              onUpdate={(id, pts) => {
                setEditedPts(p => ({ ...p, [id]: pts }));
              }}
            />
          )}

          {/* Tooltip */}
          {tooltip && !adminMode && (
            <g>
              <rect
                x={Math.min(tooltip.x + 1, 72)}
                y={Math.max(tooltip.y - 6, 1)}
                width={22} height={tooltip.entry ? 10 : 7}
                rx="0.8" ry="0.8"
                fill="rgba(17,24,39,0.88)" stroke="#374151" strokeWidth="0.15"/>
              <text
                x={Math.min(tooltip.x + 2.5, 73.5)}
                y={Math.max(tooltip.y - 2.5, 4)}
                fontSize="1.6" fill="#f9fafb" fontWeight="600">
                {tooltip.label}
              </text>
              {tooltip.entry && tooltip.entry.symptoms.length > 0 && (
                <text
                  x={Math.min(tooltip.x + 2.5, 73.5)}
                  y={Math.max(tooltip.y + 1.5, 7)}
                  fontSize="1.3" fill="#9ca3af">
                  {tooltip.entry.symptoms.join(", ")} · {tooltip.entry.intensity}/10
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Admin help text */}
        {adminMode && (
          <div style={{ position:"absolute", bottom:8, left:8, right:8,
            background:"rgba(17,24,39,0.85)", borderRadius:8, padding:"6px 10px",
            fontSize:"0.65rem", color:"#9ca3af", textAlign:"center" }}>
            🔧 Admin Mode — Click polygon to select · Drag dots to move points
            · Double-click dot to remove · Alt+click dot to remove
          </div>
        )}

        {/* Symptom panel (slides in) */}
        {activePanel && !adminMode && (
          <SymptomPanel
            region={getRegion(activePanel)}
            entry={getEntry(activePanel)}
            onSave={handleSave}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* ── Selected regions summary ──────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
            Marked Areas ({entries.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {entries.map(e => {
              const r = getRegion(e.regionId);
              const sym = SYMPTOM_TYPES.find(s => s.id === e.symptoms[0]);
              return (
                <div key={e.regionId}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                    borderRadius:20, border:`1px solid ${sym?.color || "#e5e7eb"}40`,
                    background:`${sym?.color || "#7c3aed"}10`, cursor:"pointer" }}
                  onClick={() => setActivePanel(e.regionId)}>
                  <span style={{ fontSize:"0.75rem" }}>{sym?.icon}</span>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, color:sym?.color || "#374151" }}>
                    {r?.label}
                  </span>
                  <span style={{ fontSize:"0.62rem", color:"#9ca3af" }}>
                    {e.intensity}/10
                  </span>
                  <button
                    onClick={ev => { ev.stopPropagation(); handleRemove(e.regionId); }}
                    style={{ background:"none", border:"none", cursor:"pointer",
                      color:"#9ca3af", fontSize:"0.7rem", padding:0, lineHeight:1 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
