import type { Call } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";

let mediaLock: Promise<void> | null = null;
let mediaLockCallId: string | null = null;

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

async function waitForLocalParticipant(call: Call, timeoutMs = 8000): Promise<void> {
  const started = Date.now();

  while (!call.state.localParticipant) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for local participant");
    }
    if (call.state.callingState === CallingState.LEFT) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function publishTracks(call: Call, isVideoCall: boolean): Promise<void> {
  if (call.state.callingState === CallingState.LEFT) return;

  await waitForLocalParticipant(call);

  // Let the SFU session settle before negotiating tracks.
  await new Promise((r) => setTimeout(r, 450));

  if (!isVideoCall) {
    await call.camera.disable();
  }
  if (call.microphone.state.status !== "enabled") {
    await call.microphone.enable();
  }
  if (isVideoCall && call.camera.state.status !== "enabled") {
    await call.camera.enable();
  }

  callManager.start({
    audioRole: "communicator",
    deviceEndpointType: isVideoCall ? "speaker" : "earpiece",
  });
}

/**
 * Join the SFU session, wait until joined, then publish tracks once.
 * Serialized per call id to avoid duplicate negotiation.
 */
export async function joinCallWithMedia(
  call: Call,
  isVideoCall: boolean,
): Promise<void> {
  if (call.state.callingState === CallingState.LEFT) {
    return;
  }

  if (mediaLock && mediaLockCallId === call.id) {
    await mediaLock.catch(() => {});
    return;
  }

  const task = (async () => {
    if (call.state.callingState !== CallingState.JOINED) {
      await call.join({ video: isVideoCall });
      try {
        await waitUntilJoined(call);
      } catch (err) {
        if (call.state.callingState === CallingState.LEFT) {
          return;
        }
        throw err;
      }
    }

    const publish = async () => publishTracks(call, isVideoCall);

    try {
      await publish();
    } catch (firstErr) {
      console.warn("[Call] Publish failed, retrying…", firstErr);
      await new Promise((r) => setTimeout(r, 800));
      await publish();
    }
  })();

  mediaLock = task;
  mediaLockCallId = call.id;

  try {
    await task;
  } finally {
    if (mediaLock === task) {
      mediaLock = null;
      mediaLockCallId = null;
    }
  }
}

/** Re-publish tracks after reconnect without calling join again. */
export async function syncCallMedia(
  call: Call,
  isVideoCall: boolean,
): Promise<void> {
  if (call.state.callingState !== CallingState.JOINED) return;
  await joinCallWithMedia(call, isVideoCall);
}
