import { API_PUBLIC_URL } from "@/constants/api";
import * as ImagePicker from "expo-image-picker";

/** Instagram-style limits: compress on device, cap video length */
export const MEDIA_LIMITS = {
  imageMaxWidth: 1080,
  imageCompress: 0.75,
  profileImageMaxWidth: 720,
  profileImageCompress: 0.8,
  pickerQuality: 0.7,
  videoMaxDuration: 60,
} as const;

export function isLocalMediaUri(uri: string): boolean {
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://")
  );
}

export function isVideoMedia(uri: string): boolean {
  if (!uri) return false;
  const path = uri.split("?")[0].toLowerCase();
  return (
    path.endsWith(".mp4") ||
    path.endsWith(".mov") ||
    path.endsWith(".webm") ||
    path.endsWith(".m4v") ||
    path.includes("/video/")
  );
}

export const imagePickerMediaOptions = {
  quality: MEDIA_LIMITS.pickerQuality,
  videoMaxDuration: MEDIA_LIMITS.videoMaxDuration,
  /** iOS: transcode picked/recorded videos to a smaller H.264 file */
  videoExportPreset: ImagePicker.VideoExportPreset.H264_640x480,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
} as const;

/** Reliable image vs video from expo-image-picker (Android can omit `type`). */
export function normalizePickerAsset(
  asset: ImagePicker.ImagePickerAsset,
): { uri: string; type: "image" | "video" } {
  const mime = asset.mimeType?.toLowerCase() ?? "";
  const isVideo =
    asset.type === "video" ||
    mime.startsWith("video/") ||
    (typeof asset.duration === "number" &&
      asset.duration > 0 &&
      !mime.startsWith("image/"));

  return {
    uri: asset.uri,
    type: isVideo ? "video" : "image",
  };
}

export function getUploadMimeType(
  uri: string,
  type: "image" | "video",
): string {
  if (type === "image") return "image/jpeg";
  const path = uri.split("?")[0].toLowerCase();
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

export function getUploadFileName(
  uri: string,
  type: "image" | "video",
): string {
  if (type === "image") return "media.jpg";
  const path = uri.split("?")[0].toLowerCase();
  if (path.endsWith(".mov")) return "media.mov";
  if (path.endsWith(".webm")) return "media.webm";
  return "media.mp4";
}

const LOCAL_HOST_PATTERN =
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i;

/**
 * Production builds block HTTP (cleartext). Uploaded media URLs must be HTTPS
 * and point at the public API — fixes black tiles on Play Store when DB has
 * http:// or localhost links from dev uploads.
 */
export function resolveMediaUrl(
  uri: string | null | undefined,
): string | null {
  if (!uri || typeof uri !== "string") return null;

  let trimmed = uri.trim();
  if (!trimmed) return null;

  if (isLocalMediaUri(trimmed)) return trimmed;

  if (trimmed.startsWith("/api/media/")) {
    return `${API_PUBLIC_URL}${trimmed}`;
  }

  if (LOCAL_HOST_PATTERN.test(trimmed)) {
    const path = trimmed.match(/\/api\/media\/[^?\s#]+/)?.[0];
    if (path) return `${API_PUBLIC_URL}${path}`;
  }

  if (trimmed.startsWith("http://")) {
    try {
      const parsed = new URL(trimmed);
      const isOurApi =
        parsed.hostname.includes("cast-api") ||
        parsed.hostname.includes("vercel.app") ||
        LOCAL_HOST_PATTERN.test(parsed.hostname);

      if (isOurApi) {
        parsed.protocol = "https:";
        trimmed = parsed.toString();
      }
    } catch {
      trimmed = trimmed.replace(/^http:\/\//i, "https://");
    }
  }

  return trimmed;
}

export function resolveMediaUrls(uris: string[] | undefined | null): string[] {
  if (!Array.isArray(uris)) return [];
  return uris
    .map((u) => resolveMediaUrl(u))
    .filter((u): u is string => Boolean(u));
}
