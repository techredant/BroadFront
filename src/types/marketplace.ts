export type ProductCondition = "new" | "used";
export type ProductStatus = "active" | "sold" | "hidden" | "flagged";
export type SortOption =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular";

export type MarketplaceSeller = {
  clerkId: string;
  name: string;
  image?: string;
  isVerified: boolean;
  isPremiumSeller?: boolean;
  county?: string;
  ratingAvg: number;
  ratingCount: number;
};

export type MarketplaceProduct = {
  _id: string;
  title: string;
  price: number;
  media: string[];
  category: string;
  description?: string;
  userId: string;
  phoneNumber?: number | string;
  condition?: ProductCondition;
  status?: ProductStatus;
  location?: { county?: string; constituency?: string; ward?: string };
  isPromoted?: boolean;
  boostExpiresAt?: string | null;
  listingType?: "free" | "boosted";
  viewCount?: number;
  favoriteCount?: number;
  seller?: MarketplaceSeller | null;
  rankScore?: number;
  fraudFlags?: { score: number; warnings: string[] };
  fraudWarning?: string | null;
  createdAt?: string;
};

export type ProductFilters = {
  q?: string;
  category?: string | null;
  condition?: ProductCondition | null;
  minPrice?: string;
  maxPrice?: string;
  county?: string | null;
  verifiedOnly?: boolean;
  sort?: SortOption;
};

export type FeedResponse = {
  products: MarketplaceProduct[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type SellerAnalytics = {
  totalListings: number;
  activeListings: number;
  soldListings: number;
  boostedListings: number;
  totalViews: number;
  totalFavorites: number;
  totalChats: number;
  averageRating: number;
  reviewCount: number;
  isPremiumSeller: boolean;
  premiumExpiresAt?: string | null;
  listingQuota: {
    allowed: boolean;
    count: number;
    limit: number;
    isPremium: boolean;
  };
};

export type BoostPlan = {
  id: string;
  label: string;
  durationDays: number;
  amount: number;
  rankWeight: number;
};
