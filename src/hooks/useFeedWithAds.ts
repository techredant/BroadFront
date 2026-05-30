import { useCallback, useRef, useState } from "react";
import type { FeedItem, SponsoredAd } from "@/types/ads";
import {
  countOrganicPosts,
  getPlacedAdIds,
  mergeFeedWithAds,
} from "@/utils/mergeFeedWithAds";
import { fetchAdsForFeed } from "@/services/adsApi";

type UseFeedWithAdsOptions = {
  viewerClerkId?: string;
  levelType?: string | null;
  levelValue?: string | null;
};

export function useFeedWithAds({
  viewerClerkId,
  levelType,
  levelValue,
}: UseFeedWithAdsOptions) {
  const [feedAdInterval, setFeedAdInterval] = useState(6);
  const pendingAdsRef = useRef<SponsoredAd[]>([]);
  const loadingAdsRef = useRef(false);

  const loadAds = useCallback(
    async (excludeAdIds: string[] = []) => {
      if (loadingAdsRef.current) return [];
      loadingAdsRef.current = true;
      try {
        const { ads, feedAdInterval: interval } = await fetchAdsForFeed({
          viewerClerkId,
          levelType: levelType ?? undefined,
          levelValue: levelValue ?? undefined,
          limit: 5,
          excludeAdIds: excludeAdIds.join(","),
        });
        setFeedAdInterval(interval || 6);
        pendingAdsRef.current = ads;
        return ads;
      } catch {
        return [];
      } finally {
        loadingAdsRef.current = false;
      }
    },
    [viewerClerkId, levelType, levelValue],
  );

  const mergePosts = useCallback(
    (posts: FeedItem[], freshAds?: SponsoredAd[]) => {
      const ads = freshAds?.length ? freshAds : pendingAdsRef.current;
      return mergeFeedWithAds(posts, ads, feedAdInterval);
    },
    [feedAdInterval],
  );

  const mergePostsWithFreshAds = useCallback(
    async (posts: FeedItem[]) => {
      const exclude = getPlacedAdIds(posts);
      const ads = await loadAds(exclude);
      return mergeFeedWithAds(posts, ads, feedAdInterval);
    },
    [loadAds, feedAdInterval],
  );

  const maybeFetchMoreAds = useCallback(
    async (currentFeed: FeedItem[]) => {
      const organic = countOrganicPosts(currentFeed);
      const placed = getPlacedAdIds(currentFeed).length;
      const expectedAds = Math.floor(organic / feedAdInterval);
      if (placed >= expectedAds) return currentFeed;

      const ads = await loadAds(getPlacedAdIds(currentFeed));
      return mergeFeedWithAds(currentFeed, ads, feedAdInterval);
    },
    [feedAdInterval, loadAds],
  );

  return {
    feedAdInterval,
    loadAds,
    mergePosts,
    mergePostsWithFreshAds,
    maybeFetchMoreAds,
  };
}
