import { Image } from "expo-image";
import { resolveMediaUrl, isVideoMedia } from "@/utils/mediaUtils";
import { getVideoThumbnailUri } from "@/utils/videoThumbnail";
import { sortStatusesForViewer } from "@/utils/statusUser";
import { readStatusCache, seedStatusCache, writeStatusCache } from "@/utils/statusCache";

const mediaWarm = new Set<string>();
const PREFETCH_AHEAD = 3;

export type StatusDoc = {
  _id?: string;
  userId?: string;
  media?: string[];
  caption?: string;
  backgroundColor?: string;
  createdAt?: string;
  views?: { userId?: string }[];
  [key: string]: unknown;
};

function mediaKey(uri: string) {
  return uri;
}

/** Prefetch story media URIs (images + video thumbs) — skips already warmed. */
export async function prefetchStatusMedia(
  statuses: StatusDoc[],
  fromIndex = 0,
  count = PREFETCH_AHEAD,
) {
  const slice = statuses.slice(fromIndex, fromIndex + count);
  const imageUris: string[] = [];
  const videoUris: string[] = [];

  for (const s of slice) {
    const raw = s.media?.[0];
    if (!raw) continue;
    const url = resolveMediaUrl(raw);
    if (!url || mediaWarm.has(mediaKey(url))) continue;
    if (isVideoMedia(url)) {
      videoUris.push(url);
    } else {
      imageUris.push(url);
    }
    mediaWarm.add(mediaKey(url));
  }

  await Promise.all(
    imageUris.map((uri) => Image.prefetch(uri).catch(() => undefined)),
  );

  for (let i = 0; i < videoUris.length; i += 2) {
    const batch = videoUris.slice(i, i + 2);
    await Promise.all(batch.map((uri) => getVideoThumbnailUri(uri).catch(() => null)));
  }
}

export function prefetchAdjacentUsers(
  userIds: string[],
  activeIndex: number,
  resolveStatuses: (userId: string) => StatusDoc[],
) {
  const start = Math.max(0, activeIndex);
  const end = Math.min(userIds.length, activeIndex + PREFETCH_AHEAD + 1);
  for (let i = start; i < end; i++) {
    const uid = userIds[i];
    if (!uid) continue;
    const stories = resolveStatuses(uid);
    if (stories.length) {
      seedStatusCache(uid, sortStatusesForViewer(stories));
      void prefetchStatusMedia(sortStatusesForViewer(stories), 0, PREFETCH_AHEAD);
    }
  }
}

export function markStatusViewedInMemory(
  userId: string,
  statusId: string,
  viewerId: string,
  viewRow: Record<string, unknown>,
) {
  const cached = readStatusCache(userId);
  if (!cached?.length) return;
  const next = cached.map((s) => {
    if (String(s._id) !== String(statusId)) return s;
    const views = [...(s.views ?? [])];
    if (!views.some((v: { userId?: string }) => String(v.userId) === viewerId)) {
      views.push({ ...viewRow, viewedAt: new Date().toISOString() });
    }
    return { ...s, views };
  });
  writeStatusCache(userId, next);
}
