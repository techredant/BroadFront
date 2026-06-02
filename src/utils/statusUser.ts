/** Oldest → newest for story playback (WhatsApp order). */
export function sortStatusesForViewer(statuses: any[]) {
  return [...statuses].sort(
    (a, b) =>
      new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );
}

/** Pick the newest status in a user group (API may return mixed order). */
export function getLatestStatus(statuses: any[] | undefined) {
  if (!statuses?.length) return null;
  return [...statuses].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

/** Display name for status UI — first name only, else company. */
export function statusDisplayName(
  latest: any | null,
  group?: { firstName?: string; companyName?: string },
): string {
  const first = (latest?.firstName || group?.firstName || "").trim();
  const company = (latest?.companyName || group?.companyName || "").trim();
  if (first) return first;
  if (company) return company;
  return "Contact";
}

/** Avatar URL for status UI */
export function statusAvatarUri(
  latest: any | null,
  group?: { firstName?: string; lastName?: string; companyName?: string; image?: string },
): string {
  const image = (latest?.image || group?.image || "").trim();
  if (image) return image;

  const label = statusDisplayName(latest, group);
  const seed =
    label === "Contact" ? "?" : encodeURIComponent(label.replace(/^@/, ""));
  return `https://ui-avatars.com/api/?name=${seed}&background=3797F0&color=fff`;
}

/** After grouping statuses by userId, attach profile fields from the latest story */
export function enrichStatusGroup(group: {
  userId: string;
  statuses: any[];
  firstName?: string;
  lastName?: string;
  companyName?: string;
  nickName?: string;
  image?: string;
}) {
  const sorted = [...group.statuses].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = sorted[0];
  return {
    ...group,
    statuses: sorted,
    firstName: latest?.firstName ?? group.firstName,
    lastName: latest?.lastName ?? group.lastName,
    companyName: latest?.companyName ?? group.companyName,
    nickName: latest?.nickName ?? group.nickName,
    image: latest?.image ?? group.image,
  };
}
