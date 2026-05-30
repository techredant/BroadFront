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
<<<<<<< HEAD
=======

// --- Cloudinary delivery -----------------------------------------------------

export type CldKind = "image" | "video" | "thumb";

export type CldOpts = {
  width?: number;
  height?: number;
  kind?: CldKind;
  dpr?: number;
};

const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || "";

const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * Matches `https://res.cloudinary.com/<cloud>/(image|video)/upload/<rest>` and
 * captures the cloud, the resource type, and everything after `/upload/`.
 */
const CLOUDINARY_DELIVERY_RE =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(.+)$/i;

function roundDim(n: number | undefined): number | undefined {
  if (typeof n !== "number" || !isFinite(n) || n <= 0) return undefined;
  return Math.max(1, Math.round(n));
}

function buildImageTransform(width?: number, dpr?: number): string {
  const parts = ["f_auto", "q_auto"];
  const w = roundDim(width);
  if (w) {
    parts.push(`w_${w}`);
    parts.push("c_limit");
  }
  const d = roundDim(dpr);
  if (d && d > 1) parts.push(`dpr_${d}`);
  return parts.join(",");
}

function buildVideoTransform(width?: number, dpr?: number): string {
  const parts = ["f_auto", "q_auto", "vc_auto"];
  const w = roundDim(width);
  if (w) {
    parts.push(`w_${w}`);
    parts.push("c_limit");
  }
  const d = roundDim(dpr);
  if (d && d > 1) parts.push(`dpr_${d}`);
  return parts.join(",");
}

function buildThumbTransform(width?: number): string {
  const parts = ["so_2", "f_jpg"];
  const w = roundDim(width);
  if (w) {
    parts.push(`w_${w}`);
    parts.push("c_limit");
  }
  return parts.join(",");
}

/** A Cloudinary path segment is a transformation chain if any comma-separated
 *  token matches `<letters>_<value>` (e.g. `f_auto`, `w_540`, `so_2`).
 *  A version segment like `v1700000000` does NOT match (no underscore), and
 *  folder names like `broadcast` also don't match. */
function isTransformationSegment(segment: string): boolean {
  if (!segment) return false;
  return segment.split(",").some((token) => /^[a-z]+_/i.test(token));
}

function hasExistingTransform(rest: string): boolean {
  const firstSegment = rest.split("/", 1)[0] ?? "";
  return isTransformationSegment(firstSegment);
}

function rewriteCloudinaryUrl(
  match: RegExpMatchArray,
  opts: CldOpts | undefined,
  original: string,
): string {
  const [, cloud, resourceType, rest] = match;
  const kind = opts?.kind;
  const isVideoResource = resourceType.toLowerCase() === "video";

  // If the URL already carries a transformation chain (e.g. it's the result
  // of a previous buildCloudinaryUrl call, or a thumb produced upstream),
  // keep it as-is rather than chaining redundant transforms.
  if (hasExistingTransform(rest)) return original;

  if (kind === "thumb" && isVideoResource) {
    const transform = buildThumbTransform(opts?.width);
    // Rewrite the trailing extension to .jpg for the poster frame.
    const pathWithJpg = rest.replace(/\.[a-z0-9]+(\?.*)?$/i, (_, q) =>
      q ? `.jpg${q}` : ".jpg",
    );
    const finalPath = /\.[a-z0-9]+(\?|$)/i.test(pathWithJpg)
      ? pathWithJpg
      : `${pathWithJpg}.jpg`;
    return `https://${CLOUDINARY_HOST}/${cloud}/video/upload/${transform}/${finalPath}`;
  }

  const transform =
    kind === "video" || (isVideoResource && kind !== "thumb")
      ? buildVideoTransform(opts?.width, opts?.dpr)
      : buildImageTransform(opts?.width, opts?.dpr);

  return `https://${CLOUDINARY_HOST}/${cloud}/${resourceType}/upload/${transform}/${rest}`;
}

function buildFetchUrl(
  absoluteUrl: string,
  opts: CldOpts | undefined,
): string {
  const transform = buildImageTransform(opts?.width, opts?.dpr);
  return `https://${CLOUDINARY_HOST}/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transform}/${encodeURIComponent(
    absoluteUrl,
  )}`;
}

function isOurBackendMediaUrl(absoluteUrl: string): boolean {
  // resolveMediaUrl already normalises legacy paths onto API_PUBLIC_URL, so we
  // just need to detect the `/api/media/<id>` shape on an https URL.
  try {
    const parsed = new URL(absoluteUrl);
    if (parsed.protocol !== "https:") return false;
    return parsed.pathname.startsWith("/api/media/");
  } catch {
    return false;
  }
}

/**
 * Produce a Cloudinary-optimized URL for delivery. Pass through unchanged in:
 *  - empty/null input
 *  - local picker URIs (file://, content://, ph://)
 *  - EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME unset (graceful dev no-op)
 *  - hosts we don't recognise (third-party CDN, Clerk, Stream, etc.)
 *  - legacy mp4 on our backend (free-tier Cloudinary fetch is image-only;
 *    caller falls back to expo-video-thumbnails for the poster frame)
 */
export function buildCloudinaryUrl(
  uri: string | null | undefined,
  opts?: CldOpts,
): string | null {
  const resolved = resolveMediaUrl(uri);
  if (!resolved) return null;

  if (isLocalMediaUri(resolved)) return resolved;

  if (!CLOUDINARY_CLOUD_NAME) return resolved;

  const cldMatch = resolved.match(CLOUDINARY_DELIVERY_RE);
  if (cldMatch) return rewriteCloudinaryUrl(cldMatch, opts, resolved);

  if (isOurBackendMediaUrl(resolved)) {
    // Free-tier Cloudinary fetch is image-only — leave legacy videos and
    // their on-device thumbs alone.
    if (opts?.kind === "video" || isVideoMedia(resolved)) return resolved;
    if (opts?.kind === "thumb") return resolved;
    return buildFetchUrl(resolved, opts);
  }

  return resolved;
}
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
