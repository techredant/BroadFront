import type { Call } from "@stream-io/video-react-native-sdk";
import { CallingState, StreamVideoClient } from "@stream-io/video-react-native-sdk";

export type CallMode = "video" | "audio";

type ResolveOptions = {
  /** Mode from route params (set by call.ring handler). */
  urlMode: CallMode;
  isCaller: boolean;
};

/**
 * Resolve video vs voice for UI + publishing.
 * Incoming calls trust the ring route param (from event.video + settings).
 */
export function resolveCallModeFromCall(
  call: Call | null | undefined,
  { urlMode, isCaller }: ResolveOptions,
): CallMode {
  if (isCaller) {
    return urlMode;
  }

  const custom = call?.state?.custom as { callMode?: string } | undefined;
  if (custom?.callMode === "audio") return "audio";
  if (custom?.callMode === "video") return "video";

  const videoEnabled = call?.state?.settings?.video?.enabled;
  if (videoEnabled === false) return "audio";
  if (videoEnabled === true) return "video";

  return urlMode;
}

/** Map Stream call.ring event to our call mode. */
export function callModeFromRingEvent(event: {
  video?: boolean;
  call?: {
    custom?: Record<string, unknown>;
    settings?: { video?: { enabled?: boolean } };
  };
}): CallMode {
  if (event.video === true) return "video";
  if (event.video === false) return "audio";

  const videoEnabled = event.call?.settings?.video?.enabled;
  if (videoEnabled === true) return "video";
  if (videoEnabled === false) return "audio";

  const custom = event.call?.custom as { callMode?: string } | undefined;
  if (custom?.callMode === "video") return "video";
  if (custom?.callMode === "audio") return "audio";

  return "video";
}

export function buildOutgoingCallRequest(
  isVideoCall: boolean,
  myId: string,
  memberIds: string[],
  channelCid?: string,
) {
  const callMode: CallMode = isVideoCall ? "video" : "audio";
  return {
    ring: true as const,
    video: isVideoCall,
    data: {
      members: memberIds.map((user_id) => ({ user_id })),
      custom: { triggeredBy: myId, callMode },
      ...(channelCid ? { channel_cid: channelCid } : {}),
    },
  };
}

export async function endStaleCallBeforeOutgoing(
  videoClient: StreamVideoClient,
  callId: string,
): Promise<void> {
  const cid = `default:${callId}`;
  const probe = videoClient.state.calls.find((c) => c.cid === cid);
  if (!probe) return;

  if (probe.state.callingState === CallingState.LEFT) return;

  try {
    if (probe.isCreatedByMe) {
      await probe.endCall();
    } else {
      await probe.leave({ reject: true, reason: "cancel" });
    }
  } catch {
    try {
      await probe.leave();
    } catch {
      /* ignore */
    }
  }
}
