import type { StreamVideoClient } from "@stream-io/video-react-native-sdk";

let videoClientRef: StreamVideoClient | null = null;

export function registerCallVideoClient(client: StreamVideoClient | null) {
  videoClientRef = client;
}

export function getCallVideoClient() {
  return videoClientRef;
}
