import type { AgoraRtcClient, RtcCall } from "@/rtc/RtcCall";
import { CallingState, callManager } from "@/rtc";
import { isUserBusyInRtcCall } from "@/rtc/RtcCall";
import { declineCall } from "@/rtc/agoraApi";
import { callDebug } from "@/utils/callDebug";
import { RtcConnectionState } from "@/rtc/types";

export function getActiveCall(
  client: AgoraRtcClient | null | undefined,
  excludeCallId?: string,
): RtcCall | undefined {
  if (!client) return undefined;

  return client.state.calls.find((c) => {
    if (excludeCallId && c.id === excludeCallId) return false;
    const state = c.state.callingState;
    if (state === RtcConnectionState.LEFT) return false;
    return (
      state === RtcConnectionState.JOINED ||
      state === RtcConnectionState.RINGING ||
      state === RtcConnectionState.JOINING ||
      Boolean(c.ringing)
    );
  });
}

export function isUserBusyInAnotherCall(
  client: AgoraRtcClient | null | undefined,
  videoCallId: string,
): boolean {
  if (isUserBusyInRtcCall(videoCallId)) return true;
  return Boolean(getActiveCall(client, videoCallId));
}

export async function rejectRingingCall(
  client: AgoraRtcClient,
  videoCallId: string,
  reason: "decline" | "busy" = "decline",
): Promise<void> {
  try {
    const call = client.call("default", videoCallId);
    await call.get().catch(() => {});
    if (call.state.callingState !== RtcConnectionState.LEFT) {
      await declineCall(videoCallId, call.currentUserId, reason).catch(() => {});
      await call.leave({ reject: true, reason });
      callDebug.log("reject", { videoCallId, reason });
    }
  } catch (err) {
    callDebug.warn("reject-failed", err);
  }
}

export async function cleanupCallSession(call: RtcCall | null | undefined): Promise<void> {
  if (!call) return;

  try {
    callManager.stop();
  } catch {
    /* ignore */
  }

  try {
    const state = call.state.callingState;
    if (state === RtcConnectionState.LEFT) return;

    if (call.isCreatedByMe) {
      await call.endCall();
    } else {
      await call.leave();
    }
    callDebug.log("cleanup", { callId: call.id });
  } catch (err) {
    callDebug.warn("cleanup-failed", err);
    try {
      await call.leave();
    } catch {
      /* ignore */
    }
  }
}

export { CallingState };
