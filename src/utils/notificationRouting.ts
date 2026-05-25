import type { Router } from "expo-router";
import type { Notification } from "expo-notifications";
import {
  isChatNotification,
  isIncomingCallNotification,
} from "@/utils/callNotifications";

export type NotificationData = {
  url?: string;
  screen?: string;
  postId?: string;
  callId?: string;
  channelId?: string;
  authorId?: string;
  callMode?: string;
  isCaller?: string;
  type?: string;
};

export function getNotificationData(
  notification: Notification,
): NotificationData {
  return (notification.request.content.data ?? {}) as NotificationData;
}

/** Stream channel id only (no `messaging:` prefix). */
export function streamChannelPath(channelId: string) {
  const id = channelId.includes(":")
    ? channelId.split(":").pop()!
    : channelId;
  return `/(drawer)/(stream)/channel/${id}` as const;
}

export function handleNotificationDataRedirect(
  router: Router,
  data: NotificationData,
) {
  if (data.screen === "live" && data.callId) {
    router.push({
      pathname: "/(drawer)/(live)",
      params: { callId: String(data.callId) },
    } as any);
    return;
  }

  if (typeof data.url === "string" && data.url.startsWith("/")) {
    const path = data.url.split("?")[0];

    if (path.includes("/(live)") || path.endsWith("/(live)")) {
      const callId =
        data.callId ||
        new URLSearchParams(data.url.split("?")[1] || "").get("callId");
      if (callId) {
        router.push({
          pathname: "/(drawer)/(live)",
          params: { callId },
        } as any);
        return;
      }
    }

    if (data.url.includes("isCaller=")) {
      const isCaller = data.url.includes("isCaller=true") ? "true" : "false";
      const callMode = data.url.includes("callMode=audio") ? "audio" : "video";
      const callId =
        data.callId ||
        path.match(/\/call\/([^/?]+)/)?.[1];
      if (callId) {
        router.push({
          pathname: "/(drawer)/(stream)/call/[callId]",
          params: { callId, isCaller, callMode },
        } as any);
        return;
      }
    }
    router.push(path as any);
    return;
  }

  if (isIncomingCallNotification(data) && data.callId) {
    router.push({
      pathname: "/(drawer)/(stream)/call/[callId]",
      params: {
        callId: String(data.callId),
        isCaller: data.isCaller ?? "false",
        callMode: data.callMode === "audio" ? "audio" : "video",
      },
    } as any);
    return;
  }

  if (isChatNotification(data) && data.channelId) {
    router.push(streamChannelPath(data.channelId) as any);
    return;
  }

  if (data.screen === "verification") {
    router.push("/(drawer)/verification" as any);
    return;
  }

  if (data.screen === "profile" && data.authorId) {
    router.push(`/(profileId)/${data.authorId}` as any);
    return;
  }

  if (data.screen === "follow" && data.authorId) {
    router.push(`/(profileId)/${data.authorId}` as any);
    return;
  }

  if (data.screen === "post" || data.screen === "mention") {
    router.push("/(drawer)/(tabs)" as any);
    return;
  }

  if (data.screen === "notifications") {
    router.push("/(drawer)/(drawerPages)/Notifications" as any);
  }
}

export function handleNotificationRedirect(
  router: Router,
  notification: Notification,
) {
  const data = getNotificationData(notification);
  handleNotificationDataRedirect(router, data);
}

/** Only incoming calls should auto-open while the app is in the foreground. */
export function shouldAutoOpenInForeground(notification: Notification) {
  return isIncomingCallNotification(getNotificationData(notification));
}
