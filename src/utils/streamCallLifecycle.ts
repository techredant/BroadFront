import type { RtcCall } from "@/rtc/RtcCall";

/** Agora RTC — no Stream disconnection timeout; kept for call setup compatibility. */
export function configureCallDefaults(_call: RtcCall): void {}

/** Per-call join locks — avoids blocking unrelated calls (global lock anti-pattern). */
const joinLocks = new Map<string, Promise<void>>();

export function normalizeCallLockId(callId: string): string {
  return callId.includes(":") ? callId.split(":").pop()! : callId;
}

export async function withCallJoinLock(
  callId: string,
  task: () => Promise<void>,
): Promise<void> {
  const key = normalizeCallLockId(callId);
  const existing = joinLocks.get(key);
  if (existing) {
    await existing.catch(() => {});
    return;
  }

  const run = task();
  joinLocks.set(key, run);
  try {
    await run;
  } finally {
    if (joinLocks.get(key) === run) {
      joinLocks.delete(key);
    }
  }
}

export function isCallJoinInProgressForId(callId: string): boolean {
  return joinLocks.has(normalizeCallLockId(callId));
}
