import type { LiveSessionRecord } from "@/rtc/types";
import { isMarketLiveCall } from "@/utils/marketLive";

export function parseActiveSessions(
  raw: Array<Record<string, unknown>>,
): LiveSessionRecord[] {
  return raw
    .map((s) => ({
      callId: String(s.callId ?? ""),
      hostClerkId:
        typeof s.hostClerkId === "string" ? s.hostClerkId : undefined,
      hostName: typeof s.hostName === "string" ? s.hostName : undefined,
      variant: typeof s.variant === "string" ? s.variant : undefined,
      status:
        typeof s.status === "string"
          ? (s.status as LiveSessionRecord["status"])
          : undefined,
      roomTitle: typeof s.roomTitle === "string" ? s.roomTitle : undefined,
      level: typeof s.level === "string" ? s.level : undefined,
      custom:
        typeof s.custom === "object" && s.custom
          ? (s.custom as Record<string, unknown>)
          : undefined,
    }))
    .filter((s) => s.callId.length > 0);
}

export function isAudioSession(session: LiveSessionRecord): boolean {
  if (session.variant === "audio") return true;
  if (session.callId.startsWith("audio_")) return true;
  const custom = session.custom ?? {};
  if (custom.callMode === "audio") return true;
  return false;
}

export function isActiveSessionOnAir(session: LiveSessionRecord): boolean {
  if (session.status === "ended") return false;
  if (session.status === "scheduled") return false;
  return session.status === "live" || session.status == null;
}

function hostIdFromSession(session: LiveSessionRecord): string | undefined {
  const custom = session.custom ?? {};
  return (
    session.hostClerkId ||
    (typeof custom.hostUserId === "string" ? custom.hostUserId : undefined)
  );
}

export type ActiveSessionMaps = {
  liveHostIds: Set<string>;
  callIdByLiveHostId: Map<string, string>;
  audioHostIds: Set<string>;
  callIdByAudioHostId: Map<string, string>;
  liveProductIds: Set<string>;
  liveSellerIds: Set<string>;
  callIdByProductId: Map<string, string>;
  callIdBySellerId: Map<string, string>;
  activeLiveCallIds: Set<string>;
  activeAudioCallIds: Set<string>;
};

export function buildActiveSessionMaps(
  sessions: LiveSessionRecord[],
): ActiveSessionMaps {
  const liveHostIds = new Set<string>();
  const callIdByLiveHostId = new Map<string, string>();
  const audioHostIds = new Set<string>();
  const callIdByAudioHostId = new Map<string, string>();
  const liveProductIds = new Set<string>();
  const liveSellerIds = new Set<string>();
  const callIdByProductId = new Map<string, string>();
  const callIdBySellerId = new Map<string, string>();
  const activeLiveCallIds = new Set<string>();
  const activeAudioCallIds = new Set<string>();

  for (const session of sessions) {
    if (!isActiveSessionOnAir(session)) continue;

    const hostId = hostIdFromSession(session);

    if (isAudioSession(session)) {
      activeAudioCallIds.add(session.callId);
      if (hostId) {
        const key = String(hostId);
        audioHostIds.add(key);
        if (!callIdByAudioHostId.has(key)) {
          callIdByAudioHostId.set(key, session.callId);
        }
      }
      continue;
    }

    activeLiveCallIds.add(session.callId);
    if (hostId) {
      const key = String(hostId);
      liveHostIds.add(key);
      if (!callIdByLiveHostId.has(key)) {
        callIdByLiveHostId.set(key, session.callId);
      }
    }

    const callLike = {
      id: session.callId,
      state: {
        custom: session.custom ?? {},
        createdBy: { id: session.hostClerkId },
      },
    };
    if (!isMarketLiveCall(callLike)) continue;

    const custom = session.custom ?? {};
    const productId =
      typeof custom.productId === "string" ? custom.productId : undefined;
    if (productId) {
      liveProductIds.add(productId);
      callIdByProductId.set(productId, session.callId);
    }
    if (hostId) {
      liveSellerIds.add(String(hostId));
      if (!callIdBySellerId.has(String(hostId))) {
        callIdBySellerId.set(String(hostId), session.callId);
      }
    }
  }

  return {
    liveHostIds,
    callIdByLiveHostId,
    audioHostIds,
    callIdByAudioHostId,
    liveProductIds,
    liveSellerIds,
    callIdByProductId,
    callIdBySellerId,
    activeLiveCallIds,
    activeAudioCallIds,
  };
}
