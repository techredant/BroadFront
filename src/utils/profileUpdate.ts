const COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** User-facing delay copy — keep in sync with COOLDOWN_MS */
export const PROFILE_UPDATE_DELAY_LABEL = "24 hours";

export type ProfileUserFields = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  county?: string | null;
  constituency?: string | null;
  ward?: string | null;
  profileUpdateAt?: string | Date | null;
  pendingFirstName?: string | null;
  pendingLastName?: string | null;
  pendingCompanyName?: string | null;
  pendingCounty?: string | null;
  pendingConstituency?: string | null;
  pendingWard?: string | null;
  pendingImage?: string | null;
  updatedAt?: string | Date | null;
};

const norm = (value?: string | null) => (value ?? "").trim();

export function hasPendingProfileFields(user?: ProfileUserFields | null): boolean {
  if (!user) return false;
  return Boolean(
    (user.pendingFirstName &&
      norm(user.pendingFirstName) !== norm(user.firstName)) ||
      (user.pendingLastName &&
        norm(user.pendingLastName) !== norm(user.lastName)) ||
      (user.pendingCompanyName &&
        norm(user.pendingCompanyName) !== norm(user.companyName)) ||
      (user.pendingCounty && norm(user.pendingCounty) !== norm(user.county)) ||
      (user.pendingConstituency &&
        norm(user.pendingConstituency) !== norm(user.constituency)) ||
      (user.pendingWard && norm(user.pendingWard) !== norm(user.ward)),
  );
}

/** When the scheduled profile goes live */
export function getProfileUpdateTarget(
  user?: ProfileUserFields | string | Date | null,
): Date | null {
  if (!user) return null;

  if (typeof user === "string" || user instanceof Date) {
    const t = new Date(user);
    return Number.isNaN(t.getTime()) ? null : t;
  }

  if (user.profileUpdateAt) {
    const t = new Date(user.profileUpdateAt);
    if (!Number.isNaN(t.getTime())) return t;
  }

  if (hasPendingProfileFields(user) && user.updatedAt) {
    const base = new Date(user.updatedAt);
    if (!Number.isNaN(base.getTime())) {
      return new Date(base.getTime() + COOLDOWN_MS);
    }
  }

  return null;
}

export function isProfileUpdatePending(
  user?: ProfileUserFields | string | Date | null,
): boolean {
  if (!hasPendingProfileFields(user as ProfileUserFields)) return false;
  const target = getProfileUpdateTarget(user);
  if (!target) return false;
  return target.getTime() > Date.now();
}

export function msUntilProfileUpdate(
  user?: ProfileUserFields | string | Date | null,
): number {
  const target = getProfileUpdateTarget(user);
  if (!target) return 0;
  return Math.max(0, target.getTime() - Date.now());
}

/** e.g. "23h 12m 05s" — null when cooldown finished */
export function formatProfileCountdown(
  user?: ProfileUserFields | string | Date | null,
): string | null {
  const diff = msUntilProfileUpdate(user);
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function profileUpdateVisibleAt(
  user?: ProfileUserFields | string | Date | null,
): Date | null {
  const target = getProfileUpdateTarget(user);
  if (!target || target.getTime() <= Date.now()) return null;
  return target;
}

export { COOLDOWN_MS };
