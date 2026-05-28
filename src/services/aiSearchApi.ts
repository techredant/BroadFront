import { apiClient } from "@/lib/api-client";

export type AISearchResult = {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  excerpt: string;
  county?: string;
  metadata?: Record<string, unknown>;
  score?: number;
};

export async function aiSearch(input: {
  q: string;
  type?: string;
  county?: string;
  mode?: "results" | "answer";
  userId?: string;
}) {
  const res = await apiClient.get<{
    results: AISearchResult[];
    answer?: string;
    citations?: string[];
  }>("/api/ai/search", {
    params: input,
  });
  return res.data;
}
