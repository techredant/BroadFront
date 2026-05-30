import { AppState } from "react-native";
import type { AppNotification } from "@/types/notifications";
import {
  displayActivityNotification,
  displayChatNotification,
} from "@/utils/notifeeNotifications";

const SHADE_DEDUP_MS = 20_000;
const recentShadeIds = new Map<string, number>();

function shadeDedupeKey(notification: AppNotification): string {
  return (
    notification._id ||
    `${notification.type}-${notification.entityId}-${notification.actor?.userId}-${notification.createdAt}`
  );
}

function shouldPresentInShade(notification: AppNotification): boolean {
  if (notification.type === "incoming_call") return false;

  const key = shadeDedupeKey(notification);
  const now = Date.now();

  for (const [id, at] of recentShadeIds) {
    if (now - at > SHADE_DEDUP_MS) recentShadeIds.delete(id);
  }

  if (recentShadeIds.has(key)) return false;
  recentShadeIds.set(key, now);
  return true;
}

/** Mirror Activity inbox items in the system notification shade (Notifee). */
export async function presentActivityNotificationInShade(
  notification: AppNotification,
): Promise<void> {
  if (!shouldPresentInShade(notification)) return;
  await displayActivityNotification(notification);
}

export function shouldMirrorActivityToShade(): boolean {
  return AppState.currentState !== "active";
}

function messagePreviewFromStream(msg: {
  text?: string;
  attachments?: Array<{ type?: string; image_url?: string; productId?: string }>;
}): string {
  const text = msg.text?.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117)}...` : text;

  const attachments = msg.attachments ?? [];
  if (attachments.some((a) => a.type === "image" || a.image_url)) return "Sent a photo";
  if (attachments.some((a) => a.type === "video")) return "Sent a video";
  if (attachments.some((a) => a.type === "audio")) return "Sent a voice note";
  if (attachments.some((a) => a.productId)) return "Sent a product";
  if (attachments.length) return "New message";
  return "";
}

/** Show incoming chat messages in the notification curtain (grouped). */
export async function presentChatMessageInShade(params: {
  messageId?: string;
  channelId: string;
  title: string;
  body: string;
  senderId?: string;
  isGroup?: boolean;
}): Promise<void> {
  const preview = params.body?.trim() || "New message";
  const dedupeKey = params.messageId || `chat-${params.channelId}-${params.senderId}-${preview}`;
  if (!shouldPresentInShade({ type: "message", _id: dedupeKey } as AppNotification)) {
    return;
  }

  await displayChatNotification({
    channelId: params.channelId,
    title: params.title || "New message",
    body: preview,
    messageId: params.messageId,
    senderId: params.senderId,
    isGroup: params.isGroup,
  });
}

export function chatPreviewFromStreamMessage(msg: {
  text?: string;
  attachments?: Array<{ type?: string; image_url?: string; productId?: string }>;
}): string {
  return messagePreviewFromStream(msg) || "New message";
}
