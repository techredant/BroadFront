import type { RtcCall, AgoraRtcClient } from "@/rtc/RtcCall";
import { RtcConnectionState } from "@/rtc/types";
import { acceptCall, declineCall } from "@/rtc/agoraApi";
import {
  setActiveRtcCall,
  isUserBusyInRtcCall,
  rtcDeviceManager,
} from "@/rtc/RtcCall";
import { PermissionsAndroid, Platform } from "react-native";
import { withCallJoinLock, isCallJoinInProgressForId, normalizeCallLockId } from "@/utils/streamCallLifecycle";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureCallPermissions(isVideoCall: boolean): Promise<void> {
  if (Platform.OS !== "android") return;
  const permissions = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ...(isVideoCall ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
  ];
  await PermissionsAndroid.requestMultiple(permissions);
}

export function prewarmIncomingCall(
  _client: AgoraRtcClient,
  _callId: string,
): void {
  /* Agora: no prewarm needed */
}

export async function joinCallWithMedia(
  call: RtcCall,
  isVideoCall: boolean,
): Promise<void> {
  if (call.state.callingState === RtcConnectionState.LEFT) return;

  await withCallJoinLock(call.id, async () => {
    if (call.state.callingState === RtcConnectionState.LEFT) return;

    await ensureCallPermissions(isVideoCall);

    if (call.state.callingState !== RtcConnectionState.JOINED) {
      await call.join({ video: isVideoCall, create: false });
    }

    if (!isVideoCall) {
      await call.camera.disable();
      await call.microphone.enable();
      rtcDeviceManager.start({ audioRole: "communicator", deviceEndpointType: "earpiece" });
    } else {
      await call.microphone.enable();
      await call.camera.enable();
      rtcDeviceManager.start({ audioRole: "communicator", deviceEndpointType: "speaker" });
    }

    setActiveRtcCall(call);
    await acceptCall(call.id, call.currentUserId).catch(() => {});
  });
}

export async function syncCallMedia(call: RtcCall, isVideoCall: boolean): Promise<void> {
  if (call.state.callingState !== RtcConnectionState.JOINED) return;
  if (isVideoCall) await call.camera.enable();
  else await call.camera.disable();
}

export function isCallJoinInProgress(callId: string): boolean {
  return isCallJoinInProgressForId(normalizeCallLockId(callId));
}

export function stopCallMedia(): void {
  rtcDeviceManager.stop();
  setActiveRtcCall(null);
}

export async function joinLivestreamAsHost(
  call: RtcCall,
  options?: { rejoin?: boolean },
): Promise<void> {
  if (call.state.callingState === RtcConnectionState.LEFT) return;

  await withCallJoinLock(call.id, async () => {
    if (call.state.callingState === RtcConnectionState.LEFT) return;

    if (call.state.callingState !== RtcConnectionState.JOINED) {
      await call.join({
        video: true,
        create: !options?.rejoin,
        role: "host",
      });
    }

    await call.microphone.enable();
    await call.camera.enable();
    rtcDeviceManager.start({ deviceEndpointType: "speaker" });

    const onAir = call.state.backstage === false;
    if (!onAir) await call.goLive();
    setActiveRtcCall(call);
  });
}

export function configureLivestreamViewerMedia(call: RtcCall): void {
  void call.camera.disable();
  void call.microphone.disable();
}

export async function leaveCallWithReason(
  call: RtcCall,
  userId: string,
  reason: "decline" | "cancel" | "busy" = "decline",
) {
  await declineCall(call.id, userId, reason).catch(() => {});
  await call.leave({ reject: true, reason, skipBackend: true });
  setActiveRtcCall(null);
}

export { isUserBusyInRtcCall };
