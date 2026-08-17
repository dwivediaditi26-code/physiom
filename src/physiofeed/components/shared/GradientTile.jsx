import { GRADIENTS } from "./constants.js";

// Placeholder media tile -- swap the inner div for a real <img>/<video> once
// Supabase Storage URLs exist (see media_urls in supabase/schema.sql).
export default function GradientTile({ grad = "violet", className = "" }) {
  return <div className={`bg-gradient-to-br ${GRADIENTS[grad]} ${className}`} />;
}
