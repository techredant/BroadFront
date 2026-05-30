import type { AppNotification } from "@/types/notifications";

const LIVESTREAM_TYPES = new Set([
  "livestream_started",
  "live_invite",
  "live_join_request",
  "live_reaction",
]);

export function getNotificationCallId(
  item: AppNotification,
): string | undefined {
  const id = item.callId ?? item.data?.callId ?? item.entityId;
  return id ? String(id) : undefined;
}

export function isLivestreamNotification(item: AppNotification): boolean {
  const type = String(item.type ?? "");
  return item.category === "livestreams" || LIVESTREAM_TYPES.has(type);
}

/** Hide livestream activity rows once the underlying Stream call has ended. */
export function filterActiveLivestreamNotifications(
  notifications: AppNotification[],
  activeCallIds: ReadonlySet<string>,
): AppNotification[] {
  return notifications.filter((item) => {
    if (!isLivestreamNotification(item)) return true;
    const callId = getNotificationCallId(item);
    if (!callId) return false;
    return activeCallIds.has(callId);
  });
}
