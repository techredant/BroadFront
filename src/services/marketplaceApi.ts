import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import type {
  FeedResponse,
  MarketplaceProduct,
  ProductFilters,
  SellerAnalytics,
  BoostPlan,
  ProductReview,
} from "@/types/marketplace";

const api = axios.create({
  baseURL: `${API_PUBLIC_URL}/api`,
  timeout: 20000,
});

export async function fetchProductFeed(
  page: number,
  filters: ProductFilters,
  limit = 20,
  userId?: string,
): Promise<FeedResponse> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
    sort: filters.sort || "relevance",
  };
  if (filters.q) params.q = filters.q;
  if (filters.category) params.category = filters.category;
  if (filters.condition) params.condition = filters.condition;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.county) params.county = filters.county;
  if (filters.verifiedOnly) params.verifiedOnly = "true";
  if (userId) params.userId = userId;

  const { data } = await api.get<FeedResponse>("/products/feed", { params });
  return data;
}

export async function fetchPromoted(): Promise<MarketplaceProduct[]> {
  const { data } = await api.get<MarketplaceProduct[]>("/products/promoted");
  return data;
}

export async function fetchTrending(): Promise<MarketplaceProduct[]> {
  const { data } = await api.get<MarketplaceProduct[]>("/products/trending");
  return data;
}

export async function fetchProduct(
  id: string,
): Promise<MarketplaceProduct & { seller?: MarketplaceProduct["seller"] }> {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function fetchRelated(
  id: string,
): Promise<MarketplaceProduct[]> {
  const { data } = await api.get<MarketplaceProduct[]>(`/products/related/${id}`);
  return data;
}

export async function toggleFavorite(
  productId: string,
  userId: string,
): Promise<{ favorited: boolean }> {
  const { data } = await api.post(`/products/${productId}/favorite`, {
    userId,
  });
  return data;
}

export async function fetchFavoriteStatus(
  productId: string,
  userId?: string,
): Promise<{ favorited: boolean }> {
  const { data } = await api.get(`/products/${productId}/favorite-status`, {
    params: { userId },
  });
  return data;
}

export async function fetchFavorites(
  userId: string,
): Promise<MarketplaceProduct[]> {
  const { data } = await api.get<MarketplaceProduct[]>(
    `/products/favorites/${userId}`,
  );
  return data;
}

export async function fetchSellerListings(
  userId: string,
  limit = 100,
): Promise<MarketplaceProduct[]> {
  const data = await fetchProductFeed(1, { sort: "newest" }, limit, userId);
  return data.products;
}

export async function reportProduct(body: {
  productId: string;
  reporterId: string;
  reason: string;
  details?: string;
}) {
  const { data } = await api.post("/marketplace/report", body);
  return data;
}

export async function submitReview(body: {
  productId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
}) {
  const { data } = await api.post("/marketplace/reviews", body);
  return data;
}

export async function fetchProductReviews(
  productId: string,
): Promise<ProductReview[]> {
  const { data } = await api.get<ProductReview[]>(
    `/marketplace/products/${productId}/reviews`,
  );
  return data;
}

export async function trackChatStarted(productId: string) {
  await api.post("/marketplace/chat-started", { productId });
}

export async function fetchSellerAnalytics(
  userId: string,
): Promise<SellerAnalytics> {
  const { data } = await api.get<SellerAnalytics>(
    `/marketplace/analytics/${userId}`,
  );
  return data;
}

export async function fetchMarketPlans() {
  const { data } = await api.get<{
    boostPlans: BoostPlan[];
    sellerSubscription: { amount: number; label: string; durationDays: number };
  }>("/marketplace/plans");
  return data;
}

export async function payBoost(body: {
  productId: string;
  userId: string;
  planId: string;
  phoneNumber: string;
}) {
  const { data } = await api.post("/marketplace/boost/pay", body);
  return data;
}

export async function paySellerSubscription(body: {
  userId: string;
  phoneNumber: string;
}) {
  const { data } = await api.post("/marketplace/subscribe/pay", body);
  return data;
}

export const MARKET_CATEGORIES = [
  "Electronics",
  "Mobile Phones",
  "Fashion",
  "Home & Garden",
  "Vehicles & Cars",
  "Real Estate",
  "Health & Beauty",
  "Sports & Fitness",
  "Services",
  "Agriculture",
] as const;
