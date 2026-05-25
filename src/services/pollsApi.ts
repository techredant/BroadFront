import { apiClient } from "@/lib/api-client";
import type {
  CreatePollPayload,
  Poll,
  PollAnalytics,
  PollComment,
} from "@/types/poll";

export type PollListParams = {
  levelType: string;
  levelValue: string;
  userId?: string;
  tab?: "active" | "trending" | "closed";
  page?: number;
  limit?: number;
  liveCallId?: string;
};

export async function fetchPolls(params: PollListParams): Promise<Poll[]> {
  const res = await apiClient.get<Poll[]>("/api/polls", { params });
  return res.data;
}

export async function fetchTrendingPolls(
  params: Omit<PollListParams, "tab">,
): Promise<Poll[]> {
  const res = await apiClient.get<Poll[]>("/api/polls/trending", { params });
  return res.data;
}

export async function fetchPoll(
  pollId: string,
  userId?: string,
  withAnalytics = false,
): Promise<Poll> {
  const res = await apiClient.get<Poll>(`/api/polls/${pollId}`, {
    params: {
      userId,
      analytics: withAnalytics ? "true" : undefined,
    },
  });
  return res.data;
}

export async function createPoll(payload: CreatePollPayload): Promise<Poll> {
  const res = await apiClient.post<Poll>("/api/polls", payload);
  return res.data;
}

export async function votePoll(
  pollId: string,
  userId: string,
  optionId: string,
): Promise<Poll> {
  const res = await apiClient.post<Poll>(`/api/polls/${pollId}/vote`, {
    userId,
    optionId,
  });
  return res.data;
}

export async function fetchPollComments(
  pollId: string,
  page = 1,
): Promise<PollComment[]> {
  const res = await apiClient.get<PollComment[]>(
    `/api/polls/${pollId}/comments`,
    { params: { page } },
  );
  return res.data;
}

export async function postPollComment(
  pollId: string,
  userId: string,
  text: string,
): Promise<PollComment> {
  const res = await apiClient.post<PollComment>(
    `/api/polls/${pollId}/comments`,
    { userId, text },
  );
  return res.data;
}

export async function sharePoll(pollId: string): Promise<{
  shareCount: number;
  url: string;
}> {
  const res = await apiClient.post(`/api/polls/${pollId}/share`);
  return res.data;
}

export async function fetchPollAnalytics(
  pollId: string,
): Promise<PollAnalytics> {
  const res = await apiClient.get<PollAnalytics>(
    `/api/polls/${pollId}/analytics`,
  );
  return res.data;
}
