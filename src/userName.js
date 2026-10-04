// The doctor's first name as shown in greetings ("Dr Meera"). Uses the name typed at
// sign-up (user_metadata.full_name), drops a leading "Dr"/"Dr.", and falls back to the
// start of the email address only if there is no name at all. Returns null if nothing
// usable exists, so callers can just say "Welcome" instead of inventing a name.
export function doctorFirstName(user) {
  const meta = user?.user_metadata || {};
  const raw = meta.full_name || meta.name || user?.name || "";
  const cleaned = String(raw).trim().replace(/^dr\.?\s+/i, "");
  if (cleaned) return cleaned.split(/\s+/)[0];
  const local = String(user?.email || "").split("@")[0].trim();
  return local || null;
}
