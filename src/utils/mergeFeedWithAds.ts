import type { FeedItem, SponsoredAd } from "@/types/ads";
import { isSponsoredAd } from "@/types/ads";

/**
 * Insert sponsored ads every `interval` organic posts.
 * `ads` is consumed in order; already-placed ad ids in `existingFeed` are skipped.
 */
export function mergeFeedWithAds(
  posts: FeedItem[],
  ads: SponsoredAd[],
  interval = 6,
): FeedItem[] {
  if (!ads.length || !posts.length) return posts;

  const usedAdIds = new Set<string>();
  for (const item of posts) {
    if (isSponsoredAd(item)) usedAdIds.add(String(item._id));
  }

  const queue = ads.filter((a) => !usedAdIds.has(String(a._id)));
  if (!queue.length) return posts;

  const result: FeedItem[] = [];
  let adIndex = 0;
  let organicSinceLastAd = 0;

  for (const item of posts) {
    if (isSponsoredAd(item)) {
      result.push(item);
      continue;
    }

    result.push(item);
    organicSinceLastAd += 1;

    if (organicSinceLastAd >= interval && adIndex < queue.length) {
      const ad = {
        ...queue[adIndex],
        feedItemType: "sponsored_ad" as const,
        _feedKey: `ad-${queue[adIndex]._id}`,
      };
      result.push(ad);
      adIndex += 1;
      organicSinceLastAd = 0;
    }
  }

  return result;
}

export function countOrganicPosts(items: FeedItem[]): number {
  return items.filter((i) => !isSponsoredAd(i)).length;
}

export function getPlacedAdIds(items: FeedItem[]): string[] {
  return items.filter(isSponsoredAd).map((a) => String(a._id));
}
