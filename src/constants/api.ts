/** Public API base — must be HTTPS for Play Store / release builds (no cleartext). */
export const API_PUBLIC_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app"
).replace(/\/$/, "");
