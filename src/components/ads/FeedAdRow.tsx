import React, { memo } from "react";
import { SponsoredAdCard } from "./SponsoredAdCard";
import type { SponsoredAd } from "@/types/ads";
import { useFeedItemVisibility } from "@/hooks/useFeedItemVisibility";

type Props = {
  ad: SponsoredAd;
  onHidden?: (adId: string) => void;
};

function FeedAdRowInner({ ad, onHidden }: Props) {
  const isVisible = useFeedItemVisibility(ad?._id);
  return <SponsoredAdCard ad={ad} isVisible={isVisible} onHidden={onHidden} />;
}

export const MemoizedFeedAdRow = memo(FeedAdRowInner);
