// specialTestCluster.js
// Cluster-based special test logic. Requires N/M positive for cluster confidence, not
// single-test reliance. Test IDs match the app's real SPECIAL_TESTS_DATA entries
// (src/sharedClinicalData.js) so this reads real recorded results, not placeholders.
// Extended from the original shoulder/lumbar/knee-only coverage to also cover
// cervical, hip, ankle, elbow and wrist -- every region the app's Special Tests
// module actually supports. Regions/tests that only have one reliably distinct
// special test in the app are left out rather than padded into a fake cluster --
// this module's whole premise is "don't rely on a single test."

const CLUSTERS = {
  cervical: [
    {
      name: "Cervical radiculopathy",
      tests: ["st_spurling", "st_distraction", "st_ultt1"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
    {
      name: "Upper cervical instability",
      tests: ["st_sharp_purser", "st_alar", "st_vbi"],
      minPositiveForHigh: 1,
      minPositiveForModerate: 1,
    },
  ],
  shoulder: [
    {
      name: "Subacromial impingement",
      tests: ["st_hawkins", "st_neer", "st_empty_can"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
    {
      name: "Rotator cuff tear",
      tests: ["st_er_lag", "st_empty_can"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  elbow: [
    {
      name: "Lateral epicondylalgia",
      tests: ["st_cozens", "st_mills"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  wrist: [
    {
      name: "Carpal tunnel syndrome",
      tests: ["st_phalen", "st_tinel_wrist"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  lumbar: [
    {
      name: "SI joint dysfunction",
      tests: ["st_thigh_thrust", "st_si_distraction", "st_si_compression", "st_gaenslen"],
      minPositiveForHigh: 3,
      minPositiveForModerate: 2,
    },
    {
      name: "Lumbar radiculopathy",
      tests: ["st_slr_test", "st_slump_test"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  hip: [
    {
      name: "Hip impingement / labral pathology",
      tests: ["st_fadir_test", "st_hip_scour", "st_faber_test"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  knee: [
    {
      name: "Meniscal tear",
      tests: ["st_mcmurray_test", "st_thessaly", "st_apley"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
    {
      name: "ACL tear",
      tests: ["st_lachmans", "st_anterior_drawer", "st_pivot_shift"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
  ankle: [
    {
      name: "Lateral ankle ligament sprain",
      tests: ["st_ant_drawer_ankle", "st_talar_tilt"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
    {
      name: "Achilles tendon pathology",
      tests: ["st_thompson_test", "st_royal_london"],
      minPositiveForHigh: 2,
      minPositiveForModerate: 1,
    },
  ],
};

function specialTestCluster(specialTestResults = {}, region = {}) {
  const findings = [];
  const clusters = CLUSTERS[region.region] || [];

  for (const cluster of clusters) {
    const positiveCount = cluster.tests.filter((t) => specialTestResults[t] === true).length;

    let severity = "low";
    let confidence = 0.3;
    if (positiveCount >= cluster.minPositiveForHigh) {
      severity = "high";
      confidence = 0.85;
    } else if (positiveCount >= cluster.minPositiveForModerate) {
      severity = "moderate";
      confidence = 0.55;
    }

    findings.push({
      domain: "specialTest",
      finding: `${cluster.name} cluster: ${positiveCount}/${cluster.tests.length} positive`,
      severity,
      confidence,
      flags: [cluster.name],
    });
  }

  return findings;
}

export { specialTestCluster, CLUSTERS };
