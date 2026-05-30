export type AdMediaItem = {
  url: string;
  type?: "image" | "video";
  thumbnailUrl?: string;
};

export type SponsoredAd = {
  _id: string;
  _feedKey?: string;
  feedItemType: "sponsored_ad";
  campaignId: string;
  advertiserId: string;
  advertiserClerkId: string;
  businessName: string;
  businessLogo?: string;
  isVerified?: boolean;
  label: "Sponsored" | "Promoted";
  mediaType: "image" | "video" | "carousel" | "product";
  media: AdMediaItem[];
  caption?: string;
  ctaType: string;
  ctaLabel?: string;
  ctaUrl?: string;
  productId?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  saveCount?: number;
};

export type FeedItem =
  | ({ feedItemType?: "post" } & Record<string, unknown>)
  | SponsoredAd;

export function isSponsoredAd(item: FeedItem): item is SponsoredAd {
  return (
    (item as SponsoredAd).feedItemType === "sponsored_ad" ||
    String((item as SponsoredAd)._feedKey || "").startsWith("ad-")
  );
}

export type AdCampaign = {
  _id: string;
  name: string;
  status: string;
  budgetTotal: number;
  budgetSpent: number;
  startsAt: string;
  endsAt: string;
  paymentStatus: string;
  impressionsDelivered?: number;
  clicksDelivered?: number;
};

export type BudgetPlan = {
  id: string;
  name: string;
  minBudget: number;
  cpm: number;
  maxDurationDays: number;
  description: string;
};
