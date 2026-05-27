import type { Call } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import type { StreamVideoClient } from "@stream-io/video-react-native-sdk";

let mediaLock: Promise<void> | null = null;
let mediaLockCallId: string | null = null;

const POLL_MS = 32;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitUntilJoined(call: Call, timeoutMs = 12000): Promise<void> {
  const started = Date.now();

  while (call.state.callingState !== CallingState.JOINED) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting to join call");
    }
    if (call.state.callingState === CallingState.LEFT) {
      throw new Error("Call ended before join completed");
    }
    await sleep(POLL_MS);
  }
}

async function waitForLocalParticipant(call: Call, timeoutMs = 5000): Promise<void> {
  const started = Date.now();

  while (!call.state.localParticipant) {
    if (Date.now() - started > timeoutMs) {
      return;
    }
    if (call.state.callingState === CallingState.LEFT) {
      return;
    }
    await sleep(POLL_MS);
  }
}

/** Cache Stream call state while the incoming overlay is visible. */
export function prewarmIncomingCall(
  client: StreamVideoClient,
  callId: string,
  isVideoCall: boolean,
): void {
  try {
    const call = client.call("default", callId, { reuseInstance: true });
    void call.get({ ring: true, video: isVideoCall }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function isCallLeft(call: Call): boolean {
  return call.state.callingState === CallingState.LEFT;
}

async function ensureJoined(call: Call, isVideoCall: boolean): Promise<void> {
  if (call.state.callingState === CallingState.JOINING) {
    await waitUntilJoined(call);
    return;
  }

  if (call.state.callingState !== CallingState.JOINED) {
    await call.join({ video: isVideoCall });
    await waitUntilJoined(call);
  }
}

async function publishTracks(call: Call, isVideoCall: boolean): Promise<void> {
  if (isCallLeft(call)) return;

  await waitForLocalParticipant(call);

  if (!isVideoCall) {
    await call.camera.disable();
    if (call.microphone.state.status !== "enabled") {
      await call.microphone.enable();
    }
    callManager.start({
      audioRole: "communicator",
      deviceEndpointType: "earpiece",
    });
    return;
  }

  // Publish video + audio together so remote video appears sooner.
  await Promise.all([
    call.camera.state.status !== "enabled"
      ? call.camera.enable()
      : Promise.resolve(),
    call.microphone.state.status !== "enabled"
      ? call.microphone.enable()
      : Promise.resolve(),
  ]);

  callManager.start({
    audioRole: "communicator",
    deviceEndpointType: "speaker",
  });
}

export async function joinCallWithMedia(
  call: Call,
  isVideoCall: boolean,
): Promise<void> {
  if (isCallLeft(call)) {
    return;
  }

  if (mediaLock && mediaLockCallId === call.id) {
    await mediaLock.catch(() => {});
    return;
  }

  const task = (async () => {
    try {
      await ensureJoined(call, isVideoCall);
    } catch (err) {
      if (isCallLeft(call)) {
        return;
      }
      throw err;
    }

    try {
      await publishTracks(call, isVideoCall);
    } catch (firstErr) {
      console.warn("[Call] Publish failed, retrying…", firstErr);
      await sleep(250);
      await publishTracks(call, isVideoCall);
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

export async function syncCallMedia(
  call: Call,
  isVideoCall: boolean,
): Promise<void> {
  if (call.state.callingState !== CallingState.JOINED) return;
  await joinCallWithMedia(call, isVideoCall);
}

export function isCallJoinInProgress(callId: string): boolean {
  const normalized = callId.includes(":")
    ? callId.split(":").pop()!
    : callId;
  return mediaLockCallId === normalized && mediaLock !== null;
}
