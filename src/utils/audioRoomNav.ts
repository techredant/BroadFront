import { router } from "expo-router";

/** Open an audio room in the audio drawer tab. */
export function openAudioRoom(callId?: string) {
  if (callId) {
    router.push({
      pathname: "/(drawer)/(audio)",
      params: { callId },
    });
  } else {
    router.push("/(drawer)/(audio)");
  }
}
