import { apiClient } from "@/lib/api-client";
import type { BudgetPlan, SponsoredAd } from "@/types/ads";

export async function fetchAdConfig() {
  const res = await apiClient.get("/api/ads/config");
  return res.data as {
    budgetPlans: BudgetPlan[];
    feedAdInterval: number;
    ctaTypes: string[];
    interests: string[];
  };
}

export async function fetchAdsForFeed(params: {
  viewerClerkId?: string;
  levelType?: string;
  levelValue?: string;
  limit?: number;
  excludeAdIds?: string[];
}) {
  const res = await apiClient.get("/api/ads/delivery", { params });
  return res.data as { ads: SponsoredAd[]; feedAdInterval: number };
}

export async function fetchAdDetail(adId: string, viewerClerkId?: string) {
  const res = await apiClient.get(`/api/ads/${adId}`, {
    params: { viewerClerkId },
  });
  return res.data;
}

export async function trackAdImpression(
  adId: string,
  payload: {
    viewerClerkId?: string;
    levelType?: string;
    levelValue?: string;
    watchTimeMs?: number;
    sessionId?: string;
  },
) {
  await apiClient.post(`/api/ads/${adId}/impression`, payload);
}

export async function trackAdClick(
  adId: string,
  payload: { viewerClerkId?: string; clickType?: string },
) {
  const res = await apiClient.post(`/api/ads/${adId}/click`, payload);
  return res.data as { ctaUrl?: string };
}

export async function engageAd(
  adId: string,
  type: "like" | "save" | "share" | "comment",
  viewerClerkId?: string,
) {
  await apiClient.post(`/api/ads/${adId}/engage`, { type, viewerClerkId });
}

export async function hideAd(adId: string, viewerClerkId: string) {
  await apiClient.post(`/api/ads/${adId}/hide`, { viewerClerkId });
}

export async function reportAd(
  adId: string,
  payload: { reporterClerkId: string; reason: string; details?: string },
) {
  await apiClient.post(`/api/ads/${adId}/report`, payload);
}

export async function fetchAdvertiserProfile(clerkId: string) {
  const res = await apiClient.get(`/api/advertiser/profile/${clerkId}`);
  return res.data;
}

export async function fetchAdvertiserCampaigns(clerkId: string) {
  const res = await apiClient.get(`/api/advertiser/campaigns/${clerkId}`);
  return res.data;
}

export async function createAdCampaign(payload: {
  clerkId: string;
  campaign: Record<string, unknown>;
  creative: Record<string, unknown>;
}) {
  const res = await apiClient.post("/api/advertiser/campaigns", payload);
  return res.data;
}

export async function payForCampaign(
  campaignId: string,
  payload: { clerkId: string; method: string; phoneNumber?: string },
) {
  const res = await apiClient.post(
    `/api/advertiser/campaigns/${campaignId}/pay`,
    payload,
  );
  return res.data;
}

export async function pauseCampaign(campaignId: string, clerkId: string) {
  const res = await apiClient.post(
    `/api/advertiser/campaigns/${campaignId}/pause`,
    { clerkId },
  );
  return res.data;
}

export async function resumeCampaign(campaignId: string, clerkId: string) {
  const res = await apiClient.post(
    `/api/advertiser/campaigns/${campaignId}/resume`,
    { clerkId },
  );
  return res.data;
}

export async function fetchCampaignDetail(clerkId: string, campaignId: string) {
  const res = await apiClient.get(
    `/api/advertiser/campaigns/${clerkId}/${campaignId}`,
  );
  return res.data;
}
