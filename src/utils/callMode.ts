import type { RtcCall } from "@/rtc/RtcCall";
import type { AgoraRtcClient } from "@/rtc/RtcCall";
import { RtcConnectionState } from "@/rtc/types";
import { endCall } from "@/rtc/agoraApi";

export type CallMode = "video" | "audio";

type ResolveOptions = {
  urlMode: CallMode;
  isCaller: boolean;
};

export function resolveCallModeFromCall(
  call: RtcCall | null | undefined,
  { urlMode, isCaller }: ResolveOptions,
): CallMode {
  if (isCaller) return urlMode;

  const custom = call?.state?.custom as { callMode?: string } | undefined;
  if (custom?.callMode === "audio") return "audio";
  if (custom?.callMode === "video") return "video";

  const videoEnabled = call?.state?.settings?.video?.enabled;
  if (videoEnabled === false) return "audio";
  if (videoEnabled === true) return "video";

  return urlMode;
}

export function callModeFromRingEvent(event: {
  callMode?: string;
  video?: boolean;
}): CallMode {
  if (event.callMode === "audio") return "audio";
  if (event.callMode === "video") return "video";
  if (event.video === false) return "audio";
  if (event.video === true) return "video";
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
  videoClient: AgoraRtcClient,
  callId: string,
  userId?: string,
): Promise<void> {
  if (userId) {
    await endCall(callId, userId, "cancel").catch(() => {});
  }

  const probe = videoClient.state.calls.find((c) => c.id === callId);
  if (!probe) return;

  if (probe.state.callingState === RtcConnectionState.LEFT) return;

  try {
    await endCall(callId, probe.currentUserId || userId, "cancel").catch(() => {});
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
