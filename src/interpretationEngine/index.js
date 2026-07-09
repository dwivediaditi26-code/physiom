// index.js
// Main entry point. Call runInterpretation(assessmentData) with the shape
// produced by buildAssessmentData() in src/interpretationAdapter.js.

import { redFlagScreen } from "./redFlagScreen";
import { regionScreen } from "./regionScreen";
import { subjectiveParser } from "./subjectiveParser";
import { romEndFeelLogic } from "./romEndFeelLogic";
import { mmtGrading } from "./mmtGrading";
import { specialTestCluster } from "./specialTestCluster";
import { cyriaxPattern } from "./cyriaxPattern";
import { nktCompensation } from "./nktCompensation";
import { functionalScreen } from "./functionalScreen";
import { kineticChainLink } from "./kineticChainLink";
import { fascialChainMap } from "./fascialChainMap";
import { differentialRanker } from "./differentialRanker";

function runInterpretation(assessmentData = {}) {
  const redFlag = redFlagScreen(assessmentData);
  if (redFlag.triggered) {
    return {
      redFlag,
      stopped: true,
      message: "Red flag(s) triggered. Interpretation halted — refer per protocol.",
    };
  }

  const region = regionScreen(assessmentData);

  const findings = [
    ...subjectiveParser(assessmentData.subjective),
    ...romEndFeelLogic(assessmentData.rom),
    ...mmtGrading(assessmentData.mmt),
    ...specialTestCluster(assessmentData.specialTests, region),
    ...cyriaxPattern(assessmentData.rom, assessmentData.mmt),
    ...nktCompensation(assessmentData.mmt, assessmentData.functional),
    ...functionalScreen(assessmentData.functional),
    ...kineticChainLink(assessmentData.rom, assessmentData.functional),
    ...fascialChainMap(assessmentData.rom, assessmentData.palpation),
  ];

  const ranked = differentialRanker(findings, region);

  return {
    redFlag,
    region,
    findings,
    ranked,
    stopped: false,
  };
}

export { runInterpretation };
