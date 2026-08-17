import { GRADIENTS } from "./constants.js";

export default function Avatar({ size = 40, grad = "violet", initials = "AS" }) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`shrink-0 rounded-full bg-gradient-to-br ${GRADIENTS[grad]} flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}
