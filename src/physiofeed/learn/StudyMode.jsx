import RomStudy from "./RomStudy.jsx";
import MmtStudy from "./MmtStudy.jsx";
import SpecialStudy from "./SpecialStudy.jsx";
import NeuroStudy from "./NeuroStudy.jsx";

export default function StudyMode({ type, onBack }) {
  if (type === "rom") return <RomStudy onBack={onBack}/>;
  if (type === "mmt") return <MmtStudy onBack={onBack}/>;
  if (type === "special") return <SpecialStudy onBack={onBack}/>;
  if (type === "neuro") return <NeuroStudy onBack={onBack}/>;
  return null;
}
