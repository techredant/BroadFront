import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";

export async function notifyLiveStarted(params: {
  hostClerkId: string;
  callId: string;
  title?: string;
  level?: string;
}): Promise<void> {
  try {
    await axios.post(`${API_PUBLIC_URL}/api/live/notify-started`, params, {
      timeout: 15000,
    });
  } catch (err) {
    console.warn("notifyLiveStarted failed:", err);
  }
}
