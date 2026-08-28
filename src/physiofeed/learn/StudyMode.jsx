import RomStudy from "./RomStudy.jsx";
import MmtStudy from "./MmtStudy.jsx";
import SpecialStudy from "./SpecialStudy.jsx";
import NeuroStudy from "./NeuroStudy.jsx";
import OutcomeStudy from "./OutcomeStudy.jsx";
import KineticStudy from "./KineticStudy.jsx";
import FunctionalStudy from "./FunctionalStudy.jsx";
import CardioStudy from "./CardioStudy.jsx";

export default function StudyMode({ type, onBack }) {
  if (type === "rom") return <RomStudy onBack={onBack}/>;
  if (type === "mmt") return <MmtStudy onBack={onBack}/>;
  if (type === "special") return <SpecialStudy onBack={onBack}/>;
  if (type === "neuro") return <NeuroStudy onBack={onBack}/>;
  if (type === "outcome") return <OutcomeStudy onBack={onBack}/>;
  if (type === "kinetic") return <KineticStudy onBack={onBack}/>;
  if (type === "fma") return <FunctionalStudy onBack={onBack}/>;
  if (type === "cardio") return <CardioStudy onBack={onBack}/>;
  return null;
}
