import { useState } from "react";
import { ImageOff } from "lucide-react";

// Same real Cloudinary asset pattern already used for clinical images
// throughout PhysioNeuro.jsx (CLOUDINARY_BASE + image keyed by test id) --
// duplicated here (not imported) since PhysioNeuro's own ClinicalImage
// isn't exported for reuse. Graceful fallback icon, never a broken-image
// glyph, if an asset doesn't exist yet for a given id.
const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";

export default function StudyImage({ name, height = 200, square = false }) {
  const [failed, setFailed] = useState(false);
  const boxStyle = square ? { aspectRatio: "1", width: "100%" } : { height, width: "100%" };
  if (!name || failed) {
    return (
      <div style={boxStyle} className="flex items-center justify-center bg-slate-50 text-slate-300">
        <ImageOff size={square ? 20 : 28}/>
      </div>
    );
  }
  return (
    <img
      src={`${CLOUDINARY_BASE}/${name}.jpg`}
      alt=""
      style={{ ...boxStyle, objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
