import { useCallback, useEffect, useRef, useState } from "react";
import { useLevel } from "@/context/LevelContext";
import { fetchActiveLives } from "@/rtc/agoraApi";
import type { LiveSessionRecord } from "@/rtc/types";
import {
  isMarketLiveCall,
  parseMarketCallId,
} from "@/utils/marketLive";
import { isStreamCallOnAir } from "@/utils/isStreamCallLive";
import type { MarketplaceProduct } from "@/types/marketplace";

const POLL_MS = 25_000;
const MIN_FETCH_MS = 12_000;

function sessionAsCallLike(session: LiveSessionRecord) {
  return {
    id: session.callId,
    state: {
      custom: session.custom ?? {},
      createdBy: { id: session.hostClerkId },
      backstage: false,
      endedAt: null,
    },
  };
}

function readCustom(session: LiveSessionRecord): Record<string, unknown> {
  return session.custom ?? {};
}

function hostIdFromSession(session: LiveSessionRecord): string | undefined {
  const custom = readCustom(session);
  const parsed = parseMarketCallId(session.callId);
  return (
    session.hostClerkId ||
    (typeof custom?.hostUserId === "string" && custom.hostUserId) ||
    parsed.hostId ||
    undefined
  );
}

function registerSession(
  session: LiveSessionRecord,
  liveHostIds: Set<string>,
  callIdByHostId: Map<string, string>,
  liveProductIds: Set<string>,
  liveSellerIds: Set<string>,
  callIdByProductId: Map<string, string>,
  callIdBySellerId: Map<string, string>,
) {
  const callLike = sessionAsCallLike(session);
  if (!isStreamCallOnAir(callLike)) return;

  const hostId = hostIdFromSession(session);
  if (hostId) {
    const key = String(hostId);
    liveHostIds.add(key);
    if (!callIdByHostId.has(key)) {
      callIdByHostId.set(key, session.callId);
    }
  }

  if (!isMarketLiveCall(callLike)) return;

  const custom = readCustom(session);
  const parsed = parseMarketCallId(session.callId);
  const sellerId = hostId;
  const productId =
    (typeof custom?.productId === "string" && custom.productId) ||
    parsed.productId;

  if (productId) {
    liveProductIds.add(String(productId));
    callIdByProductId.set(String(productId), session.callId);
  }
  if (sellerId) {
    liveSellerIds.add(String(sellerId));
    if (!callIdBySellerId.has(String(sellerId))) {
      callIdBySellerId.set(String(sellerId), session.callId);
    }
  }
}

async function buildLiveMaps(sessions: LiveSessionRecord[]) {
  const liveHostIds = new Set<string>();
  const callIdByHostId = new Map<string, string>();
  const liveProductIds = new Set<string>();
  const liveSellerIds = new Set<string>();
  const callIdByProductId = new Map<string, string>();
  const callIdBySellerId = new Map<string, string>();
  const activeLiveCallIds = new Set<string>();

  for (const session of sessions) {
    const callLike = sessionAsCallLike(session);
    if (!isStreamCallOnAir(callLike)) continue;
    activeLiveCallIds.add(session.callId);
    registerSession(
      session,
      liveHostIds,
      callIdByHostId,
      liveProductIds,
      liveSellerIds,
      callIdByProductId,
      callIdBySellerId,
    );
  }

  return {
    liveHostIds,
    callIdByHostId,
    liveProductIds,
    liveSellerIds,
    callIdByProductId,
    callIdBySellerId,
    activeLiveCallIds,
  };
}

export function useActiveMarketLives() {
  const { userDetails } = useLevel();
  const [liveProductIds, setLiveProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveSellerIds, setLiveSellerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveHostIds, setLiveHostIds] = useState<Set<string>>(() => new Set());
  const [callIdByHostId, setCallIdByHostId] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [callIdByProductId, setCallIdByProductId] = useState<
    Map<string, string>
  >(() => new Map());
  const [callIdBySellerId, setCallIdBySellerId] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [activeLiveCallIds, setActiveLiveCallIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveRevision, setLiveRevision] = useState(0);

  const lastFetchRef = useRef(0);
  const inflightRef = useRef(false);

  const fetchLives = useCallback(
    async (force = false) => {
      const clerkId = userDetails?.clerkId;
      if (!clerkId || inflightRef.current) return;

      const now = Date.now();
      if (!force && now - lastFetchRef.current < MIN_FETCH_MS) return;

      inflightRef.current = true;
      try {
        const sessions = (await fetchActiveLives("market")) as LiveSessionRecord[];
        const maps = await buildLiveMaps(sessions);
        setLiveHostIds(maps.liveHostIds);
        setCallIdByHostId(maps.callIdByHostId);
        setLiveProductIds(maps.liveProductIds);
        setLiveSellerIds(maps.liveSellerIds);
        setCallIdByProductId(maps.callIdByProductId);
        setCallIdBySellerId(maps.callIdBySellerId);
        setActiveLiveCallIds(maps.activeLiveCallIds);
        setLiveRevision((n) => n + 1);
        lastFetchRef.current = Date.now();
      } catch {
        /* API unavailable — badges stay hidden */
      } finally {
        inflightRef.current = false;
      }
    },
    [userDetails],
  );

  useEffect(() => {
    void fetchLives(true);
    const timer = setInterval(() => void fetchLives(), POLL_MS);
    return () => clearInterval(timer);
  }, [fetchLives]);

  const isProductLive = useCallback(
    (product: Pick<MarketplaceProduct, "_id" | "userId"> & {
      seller?: { clerkId?: string } | null;
    }) => {
      const sellerId = product.seller?.clerkId ?? product.userId;
      return (
        liveProductIds.has(String(product._id)) ||
        liveSellerIds.has(String(product.userId)) ||
        liveSellerIds.has(String(sellerId))
      );
    },
    [liveProductIds, liveSellerIds],
  );

  const getLiveCallId = useCallback(
    (product: Pick<MarketplaceProduct, "_id" | "userId"> & {
      seller?: { clerkId?: string } | null;
    }) => {
      const sellerId = product.seller?.clerkId ?? product.userId;
      return (
        callIdByProductId.get(String(product._id)) ??
        callIdBySellerId.get(String(product.userId)) ??
        callIdBySellerId.get(String(sellerId))
      );
    },
    [callIdByProductId, callIdBySellerId],
  );

  const isUserLive = useCallback(
    (userId?: string | null) => {
      if (!userId) return false;
      return liveHostIds.has(String(userId));
    },
    [liveHostIds],
  );

  const getUserLiveCallId = useCallback(
    (userId?: string | null) => {
      if (!userId) return undefined;
      return callIdByHostId.get(String(userId));
    },
    [callIdByHostId],
  );

  const refresh = useCallback(() => fetchLives(true), [fetchLives]);

  return {
    isProductLive,
    getLiveCallId,
    isUserLive,
    getUserLiveCallId,
    liveHostIds,
    activeLiveCallIds,
    refresh,
    liveRevision,
  };
}
