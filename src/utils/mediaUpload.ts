import { API_PUBLIC_URL } from "@/constants/api";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { Video } from "react-native-compressor";
import {
  getUploadFileName,
  getUploadMimeType,
  isLocalMediaUri,
  isVideoMedia,
  MEDIA_LIMITS,
} from "./mediaUtils";

/**
 * Legacy server-proxy cap (kept around for reference only — Cloudinary direct
 * uploads handle far larger files). We no longer block uploads on it.
 */
export const UPLOAD_SIZE_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * Soft target for on-device video compression. We still shrink very chunky
 * clips to keep upload time + user data usage reasonable, but we no longer
 * need to squeeze under Vercel's body-size cap.
 */
const VIDEO_TARGET_BYTES = 25 * 1024 * 1024;

const API_URL = API_PUBLIC_URL;

const DEFAULT_UPLOAD_FOLDER = "broadcast/uploads";
const AVATAR_UPLOAD_FOLDER = "broadcast/avatars";

type SignedUploadPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

export async function compressImage(
  uri: string,
  maxWidth: number = MEDIA_LIMITS.imageMaxWidth,
  compress: number = MEDIA_LIMITS.imageCompress,
): Promise<string> {
  if (!isLocalMediaUri(uri)) return uri;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

async function getLocalFileSize(uri: string): Promise<number | null> {
  if (!isLocalMediaUri(uri)) return null;
  try {
    const file = new File(uri);
    return file.exists ? file.size : null;
  } catch {
    return null;
  }
}

/**
 * Mild on-device video compression. Cloudinary will re-encode/optimize on
 * delivery, so we mostly want to keep upload bandwidth + user data in check.
 */
export async function compressVideo(uri: string): Promise<string> {
  if (!isLocalMediaUri(uri)) return uri;

  const initialSize = await getLocalFileSize(uri);
  if (initialSize != null && initialSize <= VIDEO_TARGET_BYTES) {
    return uri;
  }

  const compressPass = async (
    inputUri: string,
    maxSize: number,
    bitrate: number,
  ) => {
    return Video.compress(inputUri, {
      compressionMethod: "manual",
      maxSize,
      bitrate,
      minimumFileSizeForCompress: 0,
    });
  };

  try {
    let compressed = await compressPass(uri, 1080, 2_500_000);
    let size = await getLocalFileSize(compressed);

    if (size != null && size > VIDEO_TARGET_BYTES) {
      compressed = await compressPass(compressed, 720, 1_400_000);
      size = await getLocalFileSize(compressed);
    }

    return compressed;
  } catch (err) {
    console.warn("Video compression failed, using original:", err);
    return uri;
  }
}

/**
 * Ask the backend for a short-lived signed upload payload. Uses GET — the
 * route accepts both GET and POST; GET keeps things simple (no body, fewer
 * surprises with native FormData/JSON content-types on RN).
 */
async function fetchSignedUploadPayload(
  folder: string,
): Promise<SignedUploadPayload> {
  const url = `${API_URL}/api/media/sign?folder=${encodeURIComponent(folder)}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    throw new MediaUploadError(
      `Failed to sign Cloudinary upload (HTTP ${res.status})`,
    );
  }

  const data = (await res.json()) as Partial<SignedUploadPayload>;
  if (
    !data.cloudName ||
    !data.apiKey ||
    !data.signature ||
    typeof data.timestamp !== "number" ||
    !data.folder
  ) {
    throw new MediaUploadError("Sign endpoint returned an incomplete payload");
  }

  return data as SignedUploadPayload;
}

export type UploadMediaOptions = {
  /** Cloudinary folder override (defaults to `broadcast/uploads`). */
  folder?: string;
};

export async function uploadMedia(
  uri: string,
  type: "image" | "video",
  opts: UploadMediaOptions = {},
): Promise<string | null> {
  const folder = opts.folder ?? DEFAULT_UPLOAD_FOLDER;

  let uploadUri = uri;
  if (type === "image") {
    uploadUri = await compressImage(uri);
  } else {
    uploadUri = await compressVideo(uri);
  }

  let signed: SignedUploadPayload;
  try {
    signed = await fetchSignedUploadPayload(folder);
  } catch (err) {
    console.error("[mediaUpload] sign failed:", err);
    return null;
  }

  const mimeType = getUploadMimeType(uploadUri, type);
  const fileName = getUploadFileName(uploadUri, type);

  const formData = new FormData();
  formData.append("file", {
    uri: uploadUri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);

  const resourceType = type === "video" ? "video" : "image";
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`;

  try {
    const res = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.text();
        detail = body ? ` — ${body.slice(0, 240)}` : "";
      } catch {
        // ignore body parse failures
      }
      console.error(
        `[mediaUpload] cloudinary upload failed: HTTP ${res.status}${detail}`,
      );

      // Signed direct upload can fail with 401 when API secret/key mismatch on
      // the server — fall back to server-side upload which uses the SDK secret.
      if (res.status === 401 || res.status === 403) {
        return uploadViaServerProxy(uploadUri, type, folder);
      }
      return null;
    }

    const data = (await res.json()) as { secure_url?: string; url?: string };
    return data.secure_url ?? data.url ?? null;
  } catch (err) {
    console.error("[mediaUpload] cloudinary upload error:", err);
    return uploadViaServerProxy(uploadUri, type, folder);
  }
}

/** Server-side Cloudinary upload — avoids client signature issues. */
async function uploadViaServerProxy(
  uploadUri: string,
  type: "image" | "video",
  folder: string,
): Promise<string | null> {
  const mimeType = getUploadMimeType(uploadUri, type);
  const fileName = getUploadFileName(uploadUri, type);

  const formData = new FormData();
  formData.append("file", {
    uri: uploadUri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);
  formData.append("folder", folder);

  try {
    const res = await fetch(`${API_URL}/api/media/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 240);
      } catch {
        // ignore
      }
      console.error(
        `[mediaUpload] server proxy upload failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      );
      return null;
    }

    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch (err) {
    console.error("[mediaUpload] server proxy upload error:", err);
    return null;
  }
}

/** Upload local files; pass through existing http(s) URLs */
export async function uploadLocalMedia(
  uri: string,
  type?: "image" | "video",
  opts: UploadMediaOptions = {},
): Promise<string | null> {
  if (!isLocalMediaUri(uri)) return uri;

  const mediaType = type ?? (isVideoMedia(uri) ? "video" : "image");
  return uploadMedia(uri, mediaType, opts);
}

export async function uploadMediaItems(
  items: { uri: string; type: "image" | "video" }[],
  opts: UploadMediaOptions = {},
): Promise<string[]> {
  const urls: string[] = [];
  let videoFailed = false;
  let imageFailed = false;

  for (const item of items) {
    const url = await uploadLocalMedia(item.uri, item.type, opts);
    if (url) {
      urls.push(url);
    } else if (item.type === "video") {
      videoFailed = true;
    } else {
      imageFailed = true;
    }
  }

  if (videoFailed || imageFailed) {
    if (videoFailed && imageFailed) {
      throw new MediaUploadError(
        "Some photos and videos could not be uploaded. Try shorter videos or check your connection.",
      );
    }
    if (videoFailed) {
      throw new MediaUploadError(
        "Video could not be uploaded. Try a shorter clip (under 60s) or check your connection.",
      );
    }
    throw new MediaUploadError(
      "A photo could not be uploaded. Check your connection and try again.",
    );
  }

  return urls;
}

export async function uploadProfileImage(uri: string): Promise<string | null> {
  if (!isLocalMediaUri(uri)) return uri;

  const compressed = await compressImage(
    uri,
    MEDIA_LIMITS.profileImageMaxWidth,
    MEDIA_LIMITS.profileImageCompress,
  );

  return uploadMedia(compressed, "image", { folder: AVATAR_UPLOAD_FOLDER });
}
