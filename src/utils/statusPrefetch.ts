import { Image } from "expo-image";
import { getLatestStatus } from "@/utils/statusUser";
import { getVideoThumbnailUri } from "@/utils/videoThumbnail";
import { isVideoMedia, resolveMediaUrl } from "@/utils/mediaUtils";
import { STATUS_PREVIEW_USER_LIMIT } from "@/utils/statusList";

const VIDEO_PREFETCH_BATCH = 4;

/** Prefetch strip ring previews for the first N users (images + video thumbs). */
export async function prefetchStatusStripPreviews(
  statuses: any[],
  userLimit = STATUS_PREVIEW_USER_LIMIT,
) {
  if (!statuses.length) return;

  const byUser = statuses.reduce((acc: Record<string, any[]>, row: any) => {
    const key = row.userId;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const userIds = Object.keys(byUser)
    .sort((a, b) => {
      const latestA = getLatestStatus(byUser[a]);
      const latestB = getLatestStatus(byUser[b]);
      const ta = latestA?.createdAt
        ? new Date(latestA.createdAt).getTime()
        : 0;
      const tb = latestB?.createdAt
        ? new Date(latestB.createdAt).getTime()
        : 0;
      return tb - ta;
    })
    .slice(0, userLimit);

  const imageUris: string[] = [];
  const videoUris: string[] = [];

  for (const uid of userIds) {
    const latest = getLatestStatus(byUser[uid]);
    const raw = latest?.media?.[0];
    if (!raw) continue;
    const url = resolveMediaUrl(raw);
    if (!url) continue;
    if (isVideoMedia(url)) {
      videoUris.push(url);
    } else {
      imageUris.push(url);
    }
  }

  await Promise.all(
    imageUris.map((uri) => Image.prefetch(uri).catch(() => undefined)),
  );

  for (let i = 0; i < videoUris.length; i += VIDEO_PREFETCH_BATCH) {
    const batch = videoUris.slice(i, i + VIDEO_PREFETCH_BATCH);
    await Promise.all(
      batch.map((uri) => getVideoThumbnailUri(uri).catch(() => null)),
    );
  }
}
