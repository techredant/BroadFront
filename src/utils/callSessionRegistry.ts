import type { AgoraRtcClient } from "@/rtc/RtcCall";

let videoClientRef: AgoraRtcClient | null = null;

export function registerCallVideoClient(client: AgoraRtcClient | null) {
  videoClientRef = client;
}

export function getCallVideoClient() {
  return videoClientRef;
}
