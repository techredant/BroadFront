import type { Call } from "@stream-io/video-react-native-sdk";
import { isStreamCallLive } from "@/utils/isStreamCallLive";

/** Ended livestreams are removed from the server after this window */
export const ENDED_RETENTION_MS = 24 * 60 * 60 * 1000;

export function getCallEndedAtMs(call: Call): number | null {
  const endedAt = call.state.endedAt;
  if (endedAt) return endedAt.getTime();

  const sessionEnded = call.state.session?.ended_at;
  if (sessionEnded) return new Date(sessionEnded).getTime();

  return null;
}

export function isEndedCallExpired(
  call: Call,
  maxAgeMs = ENDED_RETENTION_MS,
): boolean {
  if (isStreamCallLive(call)) return false;

  const endedMs =
    getCallEndedAtMs(call) ??
    call.state.updatedAt?.getTime() ??
    call.state.createdAt?.getTime();

  if (endedMs == null) return false;
  return Date.now() - endedMs >= maxAgeMs;
}

/** Human-readable relative time since the stream ended */
export function formatEndedAgo(call: Call): string {
  const endedMs =
    getCallEndedAtMs(call) ??
    call.state.updatedAt?.getTime() ??
    call.state.createdAt?.getTime();

  if (endedMs == null) return "Ended";

  const diffMin = Math.floor((Date.now() - endedMs) / 60_000);
  if (diffMin < 1) return "Ended just now";
  if (diffMin < 60) return `Ended ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Ended ${diffHr}h ago`;
  return `Ended ${Math.floor(diffHr / 24)}d ago`;
}

/**
 * Hard-delete ended calls older than 24h (creator only) and drop expired rows from the list.
 */
export async function purgeExpiredEndedCalls(
  calls: Call[],
  userId?: string,
): Promise<Call[]> {
  const visible = calls.filter((c) => !isEndedCallExpired(c));

  const toDelete = calls.filter(
    (c) =>
      isEndedCallExpired(c) &&
      userId &&
      c.state.createdBy?.id === userId,
  );

  if (toDelete.length > 0) {
    await Promise.allSettled(
      toDelete.map((c) => c.delete({ hard: true })),
    );
  }

  return visible;
}
