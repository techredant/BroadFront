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
  resolveMediaUrl,
} from "./mediaUtils";

const VIDEO_TARGET_BYTES = 25 * 1024 * 1024;

const API_URL = API_PUBLIC_URL;

const DEFAULT_UPLOAD_FOLDER = "broadcast/uploads";
const AVATAR_UPLOAD_FOLDER = "broadcast/avatars";

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
    }

    return compressed;
  } catch (err) {
    console.warn("Video compression failed, using original:", err);
    return uri;
  }
}

export type UploadMediaOptions = {
  folder?: string;
};

async function uploadToServer(
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
        `[mediaUpload] upload failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      );
      return null;
    }

    const data = (await res.json()) as { url?: string };
    return resolveMediaUrl(data.url ?? null);
  } catch (err) {
    console.error("[mediaUpload] upload error:", err);
    return null;
  }
}

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

  return uploadToServer(uploadUri, type, folder);
}

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
