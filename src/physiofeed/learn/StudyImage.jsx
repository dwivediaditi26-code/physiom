import { useState } from "react";
import { ImageOff } from "lucide-react";

// Same real Cloudinary asset pattern + URL scheme already used throughout
// PhysioNeuro.jsx's ClinicalImage/ClinicalImageCard (f_auto,q_auto +
// w/h/c_fill for cropped thumbnails, f_auto,q_auto with no crop for the
// full uncropped photo) -- duplicated here (not imported) since those
// components aren't exported for reuse outside their own files.
const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";

// name: the real Cloudinary public id (same id used everywhere else, e.g.
// "rom_sflex", "mmt_scm", "cn1"). square: small cropped thumbnail for list
// rows. full: the whole uploaded photo at its natural aspect ratio, never
// cropped or zoomed -- for the detail page hero image. fallback: node to
// render instead of the generic "broken image" icon when there's no name
// or the photo 404s (2026-09-01) -- CardioStudy.jsx/NeuroStudy.jsx pass
// each item's own lucide icon here so a not-yet-uploaded photo still shows
// a meaningful medical icon instead of a bare ImageOff glyph; callers with
// no more specific icon (ROM/MMT/Special Tests) just omit it.
export default function StudyImage({ name, square = false, full = false, size = 72, fallback }) {
  const [failed, setFailed] = useState(false);

  if (!name || failed) {
    const boxStyle = square ? { aspectRatio: "1", width: "100%" } : full ? { minHeight: 160, width: "100%" } : { height: size, width: "100%" };
    return (
      <div style={boxStyle} className="flex items-center justify-center bg-slate-50 text-slate-300">
        {fallback || <ImageOff size={square ? 20 : 28}/>}
      </div>
    );
  }

  if (full) {
    const src = `${CLOUDINARY_BASE}/f_auto,q_auto/${name}`;
    return <img src={src} alt="" style={{ width: "100%", height: "auto", display: "block" }} onError={() => setFailed(true)}/>;
  }

  const boxStyle = square ? { aspectRatio: "1", width: "100%" } : { height: size, width: "100%" };
  const src = `${CLOUDINARY_BASE}/f_auto,q_auto,w_160,h_160,c_fill/${name}`;
  return <img src={src} alt="" style={{ ...boxStyle, objectFit: "cover" }} onError={() => setFailed(true)}/>;
}
