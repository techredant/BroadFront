import type { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import { callDebug } from "@/utils/callDebug";

export function getActiveCall(
  client: StreamVideoClient | null | undefined,
  excludeCallId?: string,
): Call | undefined {
  if (!client) return undefined;

  return client.state.calls.find((c) => {
    if (excludeCallId && c.id === excludeCallId) return false;
    const state = c.state.callingState;
    if (state === CallingState.LEFT) return false;
    return (
      state === CallingState.JOINED ||
      state === CallingState.RINGING ||
      state === CallingState.JOINING ||
      Boolean(c.ringing)
    );
  });
}

export function isUserBusyInAnotherCall(
  client: StreamVideoClient | null | undefined,
  videoCallId: string,
): boolean {
  const active = getActiveCall(client, videoCallId);
  return Boolean(active);
}

export async function rejectRingingCall(
  client: StreamVideoClient,
  videoCallId: string,
  reason: "decline" | "busy" = "decline",
): Promise<void> {
  try {
    const call = client.call("default", videoCallId, { reuseInstance: true });
    await call.get().catch(() => {});
    if (call.state.callingState !== CallingState.LEFT) {
      await call.leave({ reject: true, reason });
      callDebug.log("reject", { videoCallId, reason });
    }
  } catch (err) {
    callDebug.warn("reject-failed", err);
  }
}

export async function cleanupCallSession(
  call: Call | null | undefined,
): Promise<void> {
  if (!call) return;

  try {
    callManager.stop();
  } catch {
    /* ignore */
  }

  try {
    const state = call.state.callingState;
    if (state === CallingState.LEFT) return;

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
