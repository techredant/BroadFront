import { apiClient } from "@/lib/api-client";

export async function sendPresenceHeartbeat(userId: string) {
  await apiClient.post("/api/presence/heartbeat", { userId });
}

export async function queryPresenceOnline(userIds: string[]) {
  if (userIds.length === 0) return [];
  const res = await apiClient.post<{ onlineUserIds?: string[] }>(
    "/api/presence/query",
    { userIds },
  );
  return Array.isArray(res.data?.onlineUserIds) ? res.data.onlineUserIds : [];
}
