// regionScreen.js
// Identifies primary region so irrelevant domain modules can be skipped downstream.
// The adapter sets subjective.region directly from whichever regional ROM/MMT/
// special-test data block actually has entries (far more reliable than parsing
// free text), so the explicit-region path below is what normally resolves this
// in the live app. The chief-complaint keyword fallback stays for cases where a
// region was typed into the chief complaint before any objective data exists yet.

const REGION_MAP = {
  shoulder: ["shoulder", "rotator cuff", "ac joint", "gh joint"],
  cervical: ["neck", "cervical", "c-spine"],
  thoracic: ["thoracic", "mid back", "t-spine", "rib"],
  lumbar: ["low back", "lumbar", "l-spine", "si joint", "sacroiliac"],
  knee: ["knee", "patella", "meniscus", "acl", "pcl"],
  hip: ["hip", "groin", "labrum"],
  ankle: ["ankle", "foot", "achilles", "plantar"],
  elbow: ["elbow", "epicondyle"],
  wrist: ["wrist", "hand", "carpal", "thumb"],
};

function regionScreen(assessmentData) {
  const chiefComplaint = (assessmentData.subjective?.chiefComplaint || "").toLowerCase();
  const explicitRegion = assessmentData.subjective?.region?.toLowerCase();

  if (explicitRegion) {
    for (const [region, keywords] of Object.entries(REGION_MAP)) {
      if (region === explicitRegion || keywords.some((k) => explicitRegion.includes(k))) {
        return { region, matchedVia: "explicit" };
      }
    }
  }

  for (const [region, keywords] of Object.entries(REGION_MAP)) {
    if (keywords.some((k) => chiefComplaint.includes(k))) {
      return { region, matchedVia: "chiefComplaint" };
    }
  }

  return { region: "unspecified", matchedVia: "none" };
}

export { regionScreen };
