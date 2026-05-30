import type { RtcCall } from "@/rtc/RtcCall";
import { isStreamCallEnded } from "@/utils/isStreamCallLive";

/** Ended livestreams are removed from the server after this window */
export const ENDED_RETENTION_MS = 24 * 60 * 60 * 1000;

export function getCallEndedAtMs(call: RtcCall): number | null {
  const endedAt = call.state.endedAt;
  if (endedAt != null) return endedAt;

  const sessionEnded = (call.state as { session?: { ended_at?: string } }).session
    ?.ended_at;
  if (sessionEnded) return new Date(sessionEnded).getTime();

  return null;
}

export function isEndedCallExpired(
  call: RtcCall,
  maxAgeMs = ENDED_RETENTION_MS,
): boolean {
  if (!isStreamCallEnded(call)) return false;

  const endedMs =
    getCallEndedAtMs(call) ??
    call.state.updatedAt ??
    call.state.createdAt;

  if (endedMs == null) return false;
  return Date.now() - endedMs >= maxAgeMs;
}

/** Human-readable relative time since the stream ended */
export function formatEndedAgo(call: RtcCall): string {
  const endedMs =
    getCallEndedAtMs(call) ??
    call.state.updatedAt ??
    call.state.createdAt;

  if (endedMs == null) return "Ended";

  const diffMin = Math.floor((Date.now() - endedMs) / 60_000);
  if (diffMin < 1) return "Ended just now";
  if (diffMin < 60) return `Ended ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Ended ${diffHr}h ago`;
  return `Ended ${Math.floor(diffHr / 24)}d ago`;
}

/** Hard-delete ended calls older than 24h (creator only) and drop expired rows. */
export async function purgeExpiredEndedCalls(
  calls: RtcCall[],
  userId?: string,
): Promise<RtcCall[]> {
  const visible = calls.filter((c) => !isEndedCallExpired(c));

  const toDelete = calls.filter(
    (c) =>
      isEndedCallExpired(c) &&
      userId &&
      c.state.createdBy?.id === userId,
  );

  if (toDelete.length > 0) {
    await Promise.allSettled(toDelete.map((c) => c.delete({ hard: true })));
  }

  return visible;
}
