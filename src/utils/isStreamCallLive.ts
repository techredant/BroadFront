import type { Call } from "@stream-io/video-react-native-sdk";

/**
 * Whether a call from queryCalls is still active (not ended on Stream).
 */
export function isStreamCallLive(call: Call): boolean {
  if (call.state.endedAt != null) return false;

  const session = call.state.session;
  if (session?.ended_at) return false;

  return true;
}
