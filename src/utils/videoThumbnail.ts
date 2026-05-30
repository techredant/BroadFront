import { useEffect, useState } from "react";
import { File, Paths } from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { isVideoMedia, resolveMediaUrl } from "@/utils/mediaUtils";

const thumbnailCache = new Map<string, string>();
const downloadCache = new Map<string, string>();

function hashUri(uri: string) {
  let h = 0;
  for (let i = 0; i < uri.length; i++) {
    h = (h * 31 + uri.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

async function resolveLocalVideoUri(videoUri: string): Promise<string> {
  if (!videoUri.startsWith("http://") && !videoUri.startsWith("https://")) {
    return videoUri;
  }

  const cached = downloadCache.get(videoUri);
  if (cached) {
    const existing = new File(cached);
    if (existing.exists) return existing.uri;
  }

  const ext = /\.mov(\?|$)/i.test(videoUri) ? "mov" : "mp4";
  const destFile = new File(Paths.cache, `vid-${hashUri(videoUri)}.${ext}`);

  if (destFile.exists) {
    downloadCache.set(videoUri, destFile.uri);
    return destFile.uri;
  }

  const downloaded = await File.downloadFileAsync(videoUri, destFile, {
    idempotent: true,
  });
  downloadCache.set(videoUri, downloaded.uri);
  return downloaded.uri;
}

export async function getVideoThumbnailUri(
  videoUri: string,
): Promise<string | null> {
  const resolved = resolveMediaUrl(videoUri) ?? videoUri;
  if (!resolved || !isVideoMedia(resolved)) return null;

  const cached = thumbnailCache.get(resolved);
  if (cached) return cached;

  try {
    const localVideo = await resolveLocalVideoUri(resolved);
    const { uri } = await VideoThumbnails.getThumbnailAsync(localVideo, {
      time: 500,
      quality: 0.72,
    });
    thumbnailCache.set(videoUri, uri);
    thumbnailCache.set(resolved, uri);
    return uri;
  } catch (err) {
    console.warn("Video thumbnail failed:", videoUri, err);
    return null;
  }
}

export function useVideoThumbnail(videoUri: string | undefined) {
  const resolved = videoUri ? resolveMediaUrl(videoUri) ?? videoUri : undefined;

  const [thumbUri, setThumbUri] = useState<string | null>(() => {
    if (!resolved) return null;
    return thumbnailCache.get(resolved) ?? null;
  });

  useEffect(() => {
    if (!resolved || !isVideoMedia(resolved)) {
      setThumbUri(null);
      return;
    }

    const cached = thumbnailCache.get(resolved);
    if (cached) {
      setThumbUri(cached);
      return;
    }

    let cancelled = false;

    getVideoThumbnailUri(resolved).then((uri) => {
      if (!cancelled) setThumbUri(uri);
    });

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return thumbUri;
}
