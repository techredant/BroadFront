import { apiClient } from "@/lib/api-client";

export type CivicAnswer = {
  answer: string;
  sources: {
    id: string;
    title: string;
    entityType: string;
    entityId: string;
    excerpt: string;
    county?: string;
  }[];
  model?: string;
  transcript?: string;
};

export async function askCivicAssistant(input: {
  question: string;
  userId?: string;
  county?: string;
  language?: string;
  history?: { role: string; content: string }[];
}) {
  const res = await apiClient.post<CivicAnswer>("/api/ai/civic/ask", input);
  return res.data;
}

export async function askCivicAssistantByVoice(input: {
  audioUrl: string;
  userId?: string;
  county?: string;
  language?: string;
}) {
  const res = await apiClient.post<CivicAnswer>("/api/ai/civic/voice", input);
  return res.data;
}

export async function sendAIFeedSignal(input: {
  userId: string;
  postId: string;
  action: "view" | "like" | "recite" | "recast" | "comment" | "dwell" | "hide";
  dwellMs?: number;
  county?: string;
  topics?: string[];
}) {
  await apiClient.post("/api/ai/feed/signal", input);
}
