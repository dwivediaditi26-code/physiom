
/* Rich neuro widgets embedded in the config-driven stream via the
   "component" field type. They read/write the SAME shared data keys as
   the existing NeurologicalModule (gcs_eye/verbal/motor, gcs_pupil_*,
   cn_<id>_status), so the new Neuro stream and the old neuro tab stay
   perfectly in sync. */


/* ── Region/side sensory grid — for CENTRAL (stroke/TBI) lesions where loss
   is hemisensory by region, not dermatomal. Shares keys sregion_<reg>_<mode>. ── */
export const SREGIONS = ["Face","Left UE","Right UE","Trunk","Left LE","Right LE"];
export const SMODES = ["Light touch","Pinprick","Proprioception","Vibration","Stereognosis"];
export const sregSlug = (s) => s.replace(/[^a-zA-Z0-9]/g,"_");

