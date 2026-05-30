import { useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";

const prefetchedImageUris = new Set<string>();

function normalizeImageUri(uri: unknown): string | null {
  if (typeof uri !== "string") return null;
  const resolved = resolveMediaUrl(uri);
  if (!resolved || isVideoMedia(resolved)) return null;
  return resolved;
}

function collectLinkPreviewImages(linkPreview: unknown): string[] {
  const previews = Array.isArray(linkPreview) ? linkPreview : [linkPreview];
  return previews
    .map((preview: any) => normalizeImageUri(preview?.image))
    .filter((uri): uri is string => Boolean(uri));
}

export function collectFeedPrefetchImages(item: any): string[] {
  if (!item) return [];

  const uris: string[] = [];
  const push = (uri: unknown) => {
    const normalized = normalizeImageUri(uri);
    if (normalized) uris.push(normalized);
  };

  if (item.feedItemType === "sponsored_ad" || item._feedKey?.startsWith?.("ad-")) {
    push(item.businessLogo);
    for (const mediaItem of item.media ?? []) {
      push(mediaItem?.thumbnailUrl);
      if (mediaItem?.type !== "video") push(mediaItem?.url);
    }
    return uris;
  }

  push(item.user?.image);
  push(item.reciteImage);
  collectLinkPreviewImages(item.linkPreview).forEach(push);

  for (const mediaUri of item.media ?? []) push(mediaUri);
  for (const mediaUri of item.reciteMedia ?? []) push(mediaUri);

  return uris;
}

export function prefetchImageUris(uris: string[]) {
  for (const uri of uris) {
    if (prefetchedImageUris.has(uri)) continue;
    prefetchedImageUris.add(uri);
    ExpoImage.prefetch(uri, "memory-disk").catch(() => {
      prefetchedImageUris.delete(uri);
    });
  }
}

type ViewableToken = {
  index?: number | null;
  item?: any;
};

export function useFeedMediaPrefetch(feedItems: any[], aheadCount = 4) {
  return useCallback(
    (viewableItems: ViewableToken[]) => {
      const indexes = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number");

      if (indexes.length === 0) return;

      const start = Math.max(...indexes) + 1;
      const end = Math.min(feedItems.length, start + aheadCount);
      const uris: string[] = [];

      for (let index = start; index < end; index += 1) {
        uris.push(...collectFeedPrefetchImages(feedItems[index]));
      }

      prefetchImageUris(uris);
    },
    [aheadCount, feedItems],
  );
}
