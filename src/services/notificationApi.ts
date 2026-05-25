import { apiClient } from "@/lib/api-client";
import type {
  AppNotification,
  NotificationPreferences,
  NotificationSection,
} from "@/types/notifications";
import { sectionToCategory } from "@/types/notifications";

export async function fetchNotifications(params: {
  userId: string;
  section?: NotificationSection;
  cursor?: string | null;
  limit?: number;
}) {
  const category = sectionToCategory(params.section || "all");
  const { data } = await apiClient.get<{
    notifications: AppNotification[];
    unreadCount: number;
    nextCursor: string | null;
  }>("/api/notifications", {
    params: {
      userId: params.userId,
      category: category || "all",
      cursor: params.cursor || undefined,
      limit: params.limit || 30,
    },
  });
  return data;
}

export async function fetchUnreadCount(userId: string) {
  const { data } = await apiClient.get<{ unreadCount: number }>(
    "/api/notifications/unread-count",
    { params: { userId } },
  );
  return data.unreadCount;
}

export async function markNotificationRead(userId: string, id: string) {
  const { data } = await apiClient.patch<{ unreadCount: number }>(
    `/api/notifications/${id}/read`,
    { userId },
  );
  return data;
}

export async function markAllNotificationsRead(
  userId: string,
  section: NotificationSection = "all",
) {
  const category = sectionToCategory(section);
  const { data } = await apiClient.patch<{ unreadCount: number }>(
    "/api/notifications/read-all",
    { userId, category: category || "all" },
  );
  return data;
}

export async function deleteNotificationApi(userId: string, id: string) {
  const { data } = await apiClient.delete<{ unreadCount: number }>(
    `/api/notifications/${id}`,
    { params: { userId } },
  );
  return data;
}

export async function fetchNotificationPreferences(userId: string) {
  const { data } = await apiClient.get<{ preferences: NotificationPreferences }>(
    "/api/notifications/preferences",
    { params: { userId } },
  );
  return data.preferences;
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>,
) {
  const { data } = await apiClient.patch<{ preferences: NotificationPreferences }>(
    "/api/notifications/preferences",
    { userId, ...updates },
  );
  return data.preferences;
}

export async function registerDeviceToken(payload: {
  userId: string;
  deviceId: string;
  token: string;
  fcmToken?: string;
  platform?: string;
  appVersion?: string;
  osVersion?: string;
  deviceName?: string;
}) {
  const { data } = await apiClient.post("/api/notifications/device/register", payload);
  return data;
}

export async function savePushTokenLegacy(userId: string, token: string, deviceId?: string) {
  const { data } = await apiClient.post("/api/notification-token/token", {
    userId,
    token,
    deviceId,
  });
  return data;
}
