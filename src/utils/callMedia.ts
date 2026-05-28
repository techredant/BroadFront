import type { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import { combineLatest, filter, firstValueFrom, take } from "rxjs";

let mediaLock: Promise<void> | null = null;
let mediaLockCallId: string | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitUntilJoined(call: Call): Promise<void> {
  if (call.state.callingState === CallingState.JOINED) return;
  if (call.state.callingState === CallingState.LEFT) {
    throw new Error("Call ended before join completed");
  }

  const state = await firstValueFrom(
    call.state.callingState$.pipe(
      filter(
        (next) =>
          next === CallingState.JOINED || next === CallingState.LEFT,
      ),
      take(1),
    ),
  );

  if (state === CallingState.LEFT) {
    throw new Error("Call ended before join completed");
  }
}

async function waitForLocalParticipant(call: Call): Promise<void> {
  if (call.state.localParticipant || isCallLeft(call)) return;

  const [, state] = await firstValueFrom(
    combineLatest([
      call.state.localParticipant$,
      call.state.callingState$,
    ]).pipe(
      filter(
        ([participant, next]) =>
          Boolean(participant) || next === CallingState.LEFT,
      ),
      take(1),
    ),
  );

  if (state === CallingState.LEFT) return;
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

/** Stop in-call audio routing (safe during screen unmount). */
export function stopCallMedia(): void {
  try {
    callManager.stop();
  } catch {
    /* ignore — native module may already be torn down */
  }
}

/** Host livestream — same media path as 1:1 video calls, then go live. */
export async function joinLivestreamAsHost(call: Call): Promise<void> {
  if (isCallLeft(call)) return;

  await call.join({ create: true, video: true });
  await joinCallWithMedia(call, true);
  await call.goLive();
  // goLive can reset tracks; re-sync like the call screen does after join.
  await syncCallMedia(call, true);
}
