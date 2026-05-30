import { useEffect, useState } from "react";
import { File, Paths } from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
<<<<<<< HEAD
import { isVideoMedia, resolveMediaUrl } from "@/utils/mediaUtils";
=======
import {
  buildCloudinaryUrl,
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";

const CLOUDINARY_VIDEO_RE =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//i;

const CLOUDINARY_THUMB_WIDTH = 540;
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408

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

<<<<<<< HEAD
=======
  // Cloudinary-hosted videos: skip the local download + native thumbnail
  // pipeline and let Cloudinary render the poster frame on the CDN.
  if (CLOUDINARY_VIDEO_RE.test(resolved)) {
    const cdnThumb = buildCloudinaryUrl(resolved, {
      kind: "thumb",
      width: CLOUDINARY_THUMB_WIDTH,
    });
    if (cdnThumb) {
      thumbnailCache.set(resolved, cdnThumb);
      thumbnailCache.set(videoUri, cdnThumb);
      return cdnThumb;
    }
  }

>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  const cached = thumbnailCache.get(resolved);
  if (cached) return cached;

  try {
    const localVideo = await resolveLocalVideoUri(resolved);
    const { uri } = await VideoThumbnails.getThumbnailAsync(localVideo, {
      time: 500,
      quality: 0.72,
    });
    thumbnailCache.set(videoUri, uri);
<<<<<<< HEAD
    thumbnailCache.set(resolved, uri);
=======
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
    return uri;
  } catch (err) {
    console.warn("Video thumbnail failed:", videoUri, err);
    return null;
  }
}

<<<<<<< HEAD
=======
function cloudinaryThumbFor(resolved: string | undefined): string | null {
  if (!resolved || !CLOUDINARY_VIDEO_RE.test(resolved)) return null;
  const cdnThumb = buildCloudinaryUrl(resolved, {
    kind: "thumb",
    width: CLOUDINARY_THUMB_WIDTH,
  });
  if (!cdnThumb) return null;
  thumbnailCache.set(resolved, cdnThumb);
  return cdnThumb;
}

>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
export function useVideoThumbnail(videoUri: string | undefined) {
  const resolved = videoUri ? resolveMediaUrl(videoUri) ?? videoUri : undefined;

  const [thumbUri, setThumbUri] = useState<string | null>(() => {
    if (!resolved) return null;
<<<<<<< HEAD
    return thumbnailCache.get(resolved) ?? null;
=======
    return cloudinaryThumbFor(resolved) ?? thumbnailCache.get(resolved) ?? null;
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  });

  useEffect(() => {
    if (!resolved || !isVideoMedia(resolved)) {
      setThumbUri(null);
      return;
    }

<<<<<<< HEAD
=======
    const cdnThumb = cloudinaryThumbFor(resolved);
    if (cdnThumb) {
      setThumbUri(cdnThumb);
      return;
    }

>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
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
