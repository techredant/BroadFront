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

/** Vercel serverless body limit is ~4.5 MB */
const UPLOAD_SIZE_LIMIT_BYTES = 4 * 1024 * 1024;
/** Target after compression — leave headroom for multipart overhead */
const VIDEO_TARGET_BYTES = 3.6 * 1024 * 1024;

import { API_PUBLIC_URL } from "@/constants/api";

const API_URL = API_PUBLIC_URL;

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

export async function compressImage(
  uri: string,
  maxWidth = MEDIA_LIMITS.imageMaxWidth,
  compress = MEDIA_LIMITS.imageCompress,
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

/** Shrink videos so they fit Vercel's ~4.5 MB upload cap (Android copies full files from gallery). */
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
    let compressed = await compressPass(uri, 720, 900_000);
    let size = await getLocalFileSize(compressed);

    if (size != null && size > UPLOAD_SIZE_LIMIT_BYTES) {
      compressed = await compressPass(compressed, 480, 500_000);
      size = await getLocalFileSize(compressed);
    }

    if (size != null && size > UPLOAD_SIZE_LIMIT_BYTES) {
      console.warn(
        `Video still ${(size / (1024 * 1024)).toFixed(1)} MB after compression`,
      );
    }

    return compressed;
  } catch (err) {
    console.warn("Video compression failed, using original:", err);
    return uri;
  }
}

export async function uploadMedia(
  uri: string,
  type: "image" | "video",
): Promise<string | null> {
  let uploadUri = uri;

  if (type === "image") {
    uploadUri = await compressImage(uri);
  } else {
    uploadUri = await compressVideo(uri);
  }

  const size = await getLocalFileSize(uploadUri);
  if (size != null && size > UPLOAD_SIZE_LIMIT_BYTES) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    console.error(
      `Media upload skipped: ${type} is ${mb} MB (max ~4 MB). Try a shorter video.`,
    );
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

  try {
    const res = await fetch(`${API_URL}/api/media/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const hint =
        res.status === 413
          ? " — file too large for server (try a shorter video)"
          : "";
      console.error(`Media upload failed: ${res.status}${hint}`);
      return null;
    }

    const data = await res.json();
    return data.url ?? null;
  } catch (err) {
    console.error("Media upload error:", err);
    return null;
  }
}

/** Upload local files; pass through existing http(s) URLs */
export async function uploadLocalMedia(
  uri: string,
  type?: "image" | "video",
): Promise<string | null> {
  if (!isLocalMediaUri(uri)) return uri;

  const mediaType = type ?? (isVideoMedia(uri) ? "video" : "image");
  return uploadMedia(uri, mediaType);
}

export async function uploadMediaItems(
  items: { uri: string; type: "image" | "video" }[],
): Promise<string[]> {
  const urls: string[] = [];
  let videoFailed = false;
  let imageFailed = false;

  for (const item of items) {
    const url = await uploadLocalMedia(item.uri, item.type);
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

  return uploadMedia(compressed, "image");
}
