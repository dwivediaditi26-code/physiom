import { useState } from "react";
import { GRADIENTS } from "./constants.js";

// `photoUrl` (added 2026-08-18 for real profile-photo upload) renders an
// actual <img> instead of the gradient+initials placeholder. Falls back to
// the gradient automatically if the image fails to load (a stale/expired
// URL shouldn't leave a broken-image icon everywhere that avatar appears).
export default function Avatar({ size = 40, grad = "violet", initials = "AS", photoUrl = null }) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={initials}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`shrink-0 rounded-full bg-gradient-to-br ${GRADIENTS[grad]} flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}
