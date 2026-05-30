/** Nicknames in DB may already include a leading @ — normalize for display and mentions. */
export function stripNickPrefix(nick?: string | null): string {
  if (!nick) return "";
  return String(nick).replace(/^@+/, "").trim();
}

/** Single @ handle for UI, e.g. "@johndoe" */
export function formatNickHandle(nick?: string | null): string {
  const clean = stripNickPrefix(nick);
  return clean ? `@${clean}` : "";
}
