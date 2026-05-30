import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { Post } from "@/types/post";

export const AI_FEED_ENABLED =
  process.env.EXPO_PUBLIC_AI_FEED_ENABLED?.trim() !== "false";

export function useAIRankedFeed() {
  const fetchAIRankedFeed = useCallback(
    async (input: {
      userId: string;
      levelType?: string;
      levelValue?: string;
      limit?: number;
    }) => {
      const res = await apiClient.get<{ posts: Post[] }>("/api/ai/feed", {
        params: input,
      });
      return res.data.posts;
    },
    [],
  );

  return { fetchAIRankedFeed, enabled: AI_FEED_ENABLED };
}
