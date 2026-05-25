import type { Call } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";

async function waitUntilJoined(call: Call, timeoutMs = 15000): Promise<void> {
  const started = Date.now();

  while (call.state.callingState !== CallingState.JOINED) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting to join call");
    }
    if (call.state.callingState === CallingState.LEFT) {
      throw new Error("Call ended before join completed");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Join the SFU session, wait until joined, then publish tracks.
 * Pass `video: true` on join so the session matches video calls (desktop → mobile).
 */
export async function joinCallWithMedia(
  call: Call,
  isVideoCall: boolean,
): Promise<void> {
  if (call.state.callingState !== CallingState.JOINED) {
    await call.join({ video: isVideoCall });
    await waitUntilJoined(call);
  }

  await new Promise((r) => setTimeout(r, 300));

  const publish = async () => {
    if (!isVideoCall) {
      await call.camera.disable();
    }
    await call.microphone.enable();
    if (isVideoCall) {
      await call.camera.enable();
    }
  };

  try {
    await publish();
  } catch (firstErr) {
    console.warn("[Call] Publish failed, retrying…", firstErr);
    await new Promise((r) => setTimeout(r, 600));
    await publish().catch((retryErr) => {
      console.error("[Call] Publish retry failed:", retryErr);
    });
  }

  callManager.start({
    audioRole: "communicator",
    deviceEndpointType: "speaker",
  });
}
