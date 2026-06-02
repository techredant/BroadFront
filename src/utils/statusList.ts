import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import { readStatusCache, seedStatusCache } from "@/utils/statusCache";
import { sortStatusesForViewer } from "@/utils/statusUser";
import {
  CACHE_TTL,
  fetchWithCache,
  getCached,
  setCached,
  shouldRefetchOnFocus,
} from "@/utils/staleFetch";

const STATUS_API = `${API_PUBLIC_URL}/api/status`;
export const STATUS_LIST_KEY = "status-list";
export const STATUS_FEED_KEY = "status-feed";
/** First paint: stories for the N most recently active users (full list loads after). */
export const STATUS_PREVIEW_USER_LIMIT = 10;

/** In-memory snapshot (stale-while-revalidate, like feed cache). */
let snapshot: any[] = [];

function seedPerUserCaches(list: any[]) {
  const byUser = list.reduce((acc: Record<string, any[]>, row: any) => {
    const key = row.userId;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  Object.entries(byUser).forEach(([id, rows]) =>
    seedStatusCache(id, sortStatusesForViewer(rows)),
  );
}

function applyList(list: any[], options?: { partial?: boolean }) {
  snapshot = list;
  if (!options?.partial) {
    setCached(STATUS_LIST_KEY, list);
    setCached(STATUS_FEED_KEY, list);
  }
  seedPerUserCaches(list);
}

function hydrateSnapshotFromStore() {
  const hit = getCached<any[]>(STATUS_LIST_KEY, 86_400_000);
  if (hit?.length) snapshot = hit;
}

hydrateSnapshotFromStore();

export function getStatusListSnapshot(): any[] {
  return snapshot;
}

export function hasStatusListSnapshot(): boolean {
  return snapshot.length > 0;
}

export function statusesForUser(
  userId: string,
  list: any[] = snapshot,
): any[] {
  if (!userId) return [];
  return sortStatusesForViewer(
    list.filter((s) => String(s.userId) === String(userId)),
  );
}

export function resolveUserStatuses(userId: string): any[] {
  const cached = readStatusCache(userId);
  if (cached?.length) return cached;
  return statusesForUser(userId);
}

export function warmStatusCachesForUsers(userIds: string[]) {
  for (const id of userIds) {
    if (!id) continue;
    const rows = statusesForUser(id);
    if (rows.length) seedStatusCache(id, rows);
  }
}

function uniqueUserCount(list: any[]) {
  return new Set(list.map((s) => s.userId).filter(Boolean)).size;
}

async function fetchStatusFeed(viewerId?: string, userLimit?: number) {
  const res = await axios.get(`${STATUS_API}/feed`, {
    params: {
      ...(viewerId ? { viewerId } : {}),
      ...(userLimit ? { userLimit } : {}),
    },
  });
  const flat = Array.isArray(res.data?.flat) ? res.data.flat : [];
  return flat;
}

export async function refreshStatusList(options?: {
  force?: boolean;
  viewerId?: string;
}): Promise<any[]> {
  const force = options?.force ?? false;
  const viewerId = options?.viewerId;
  const coldStart = snapshot.length === 0;

  if (!force && snapshot.length > 0) {
    if (!shouldRefetchOnFocus(STATUS_LIST_KEY, CACHE_TTL.status)) {
      return snapshot;
    }
  }

  if (coldStart && !force) {
    try {
      const preview = await fetchStatusFeed(viewerId, STATUS_PREVIEW_USER_LIMIT);
      if (preview.length && snapshot.length === 0) {
        const users = uniqueUserCount(preview);
        if (users <= STATUS_PREVIEW_USER_LIMIT) {
          applyList(preview, { partial: true });
        } else {
          applyList(preview);
          return preview;
        }
      }
    } catch {
      /* preview is best-effort */
    }
  }

  try {
    const list = await fetchWithCache(
      STATUS_FEED_KEY,
      () => fetchStatusFeed(viewerId),
      { ttl: CACHE_TTL.status, force: force || coldStart },
    );
    if (list.length) applyList(list);
    return list.length ? list : snapshot;
  } catch {
    try {
      const list = await fetchWithCache(
        STATUS_LIST_KEY,
        async () => {
          const res = await axios.get(STATUS_API);
          return Array.isArray(res.data) ? res.data : [];
        },
        { ttl: CACHE_TTL.status, force: force || coldStart },
      );
      if (list.length) applyList(list);
      return list.length ? list : snapshot;
    } catch {
      return snapshot;
    }
  }
}

export function shouldRefreshStatusListOnFocus(): boolean {
  return shouldRefetchOnFocus(STATUS_LIST_KEY, CACHE_TTL.status);
}

/** Optimistic story while upload runs. */
export function applyOptimisticStatus(partial: Record<string, unknown>) {
  const tempId = `temp-${Date.now()}`;
  const row = {
    ...partial,
    _id: tempId,
    createdAt: new Date().toISOString(),
    views: [],
    optimistic: true,
  };
  snapshot = [row, ...snapshot];
  const uid = String(partial.userId ?? "");
  if (uid) {
    const existing = readStatusCache(uid) ?? [];
    seedStatusCache(uid, sortStatusesForViewer([...existing, row]));
  }
  setCached(STATUS_LIST_KEY, snapshot);
  return tempId;
}

export function confirmOptimisticStatus(tempId: string, serverRow: any) {
  snapshot = snapshot.map((s) =>
    String(s._id) === tempId ? { ...serverRow, optimistic: false } : s,
  );
  setCached(STATUS_LIST_KEY, snapshot);
  seedPerUserCaches(snapshot);
}

export function failOptimisticStatus(tempId: string) {
  snapshot = snapshot.filter((s) => String(s._id) !== tempId);
  setCached(STATUS_LIST_KEY, snapshot);
  seedPerUserCaches(snapshot);
}

export function patchStatusViewed(
  statusId: string,
  viewerId: string,
  views?: unknown[],
) {
  snapshot = snapshot.map((s) => {
    if (String(s._id) !== String(statusId)) return s;
    return { ...s, views: views ?? s.views };
  });
  setCached(STATUS_LIST_KEY, snapshot);
  seedPerUserCaches(snapshot);
}

export function prependStatusFromSocket(status: any) {
  if (!status?._id) return;
  const exists = snapshot.some((s) => String(s._id) === String(status._id));
  if (exists) return;
  snapshot = [status, ...snapshot];
  setCached(STATUS_LIST_KEY, snapshot);
  seedPerUserCaches(snapshot);
}

export function removeStatusFromSnapshot(statusId: string) {
  snapshot = snapshot.filter((s) => String(s._id) !== String(statusId));
  setCached(STATUS_LIST_KEY, snapshot);
  seedPerUserCaches(snapshot);
}
