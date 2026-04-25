import { post } from "./api";

const  BASE_URL =  "https://cast-api-zeta.vercel.app"
export const startAI = async (channelId: string) =>
  post(`${BASE_URL}/api/start-ai-agent`, { channel_id: channelId });
export const stopAI = async (channelId: string) =>
  post(`${BASE_URL}/api/stop-ai-agent`, { channel_id: channelId });
export const summarize = async (text: string) =>
  post(`${BASE_URL}/api/summarize`, { text });