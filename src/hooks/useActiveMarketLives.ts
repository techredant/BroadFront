import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { fetchActiveLives } from "@/rtc/agoraApi";
import { buildActiveSessionMaps, parseActiveSessions } from "@/utils/activeSessions";
import type { MarketplaceProduct } from "@/types/marketplace";

const POLL_MS = 25_000;
const MIN_FETCH_MS = 12_000;

export function useActiveMarketLives() {
  const { userId } = useAuth();
  const { userDetails } = useLevel();
  const viewerClerkId = userDetails?.clerkId ?? userId ?? null;
  const [liveProductIds, setLiveProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveSellerIds, setLiveSellerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveHostIds, setLiveHostIds] = useState<Set<string>>(() => new Set());
  const [audioHostIds, setAudioHostIds] = useState<Set<string>>(() => new Set());
  const [callIdByHostId, setCallIdByHostId] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [callIdByAudioHostId, setCallIdByAudioHostId] = useState<
    Map<string, string>
  >(() => new Map());
  const [callIdByProductId, setCallIdByProductId] = useState<
    Map<string, string>
  >(() => new Map());
  const [callIdBySellerId, setCallIdBySellerId] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [activeLiveCallIds, setActiveLiveCallIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeAudioCallIds, setActiveAudioCallIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveRevision, setLiveRevision] = useState(0);

  const lastFetchRef = useRef(0);
  const inflightRef = useRef(false);

  const fetchLives = useCallback(
    async (force = false) => {
      if (!viewerClerkId || inflightRef.current) return;

      const now = Date.now();
      if (!force && now - lastFetchRef.current < MIN_FETCH_MS) return;

      inflightRef.current = true;
      try {
        const [communityRaw, marketRaw, audioRaw] = await Promise.all([
          fetchActiveLives("community").catch(() => []),
          fetchActiveLives("market").catch(() => []),
          fetchActiveLives("audio").catch(() => []),
        ]);

        const sessions = [
          ...parseActiveSessions(communityRaw),
          ...parseActiveSessions(marketRaw),
          ...parseActiveSessions(audioRaw),
        ];

        const maps = buildActiveSessionMaps(sessions);

        setLiveHostIds(maps.liveHostIds);
        setAudioHostIds(maps.audioHostIds);
        setCallIdByHostId(maps.callIdByLiveHostId);
        setCallIdByAudioHostId(maps.callIdByAudioHostId);
        setLiveProductIds(maps.liveProductIds);
        setLiveSellerIds(maps.liveSellerIds);
        setCallIdByProductId(maps.callIdByProductId);
        setCallIdBySellerId(maps.callIdBySellerId);
        setActiveLiveCallIds(maps.activeLiveCallIds);
        setActiveAudioCallIds(maps.activeAudioCallIds);
        setLiveRevision((n) => n + 1);
        lastFetchRef.current = Date.now();
      } catch {
        /* API unavailable — badges stay hidden */
      } finally {
        inflightRef.current = false;
      }
    },
    [viewerClerkId],
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

  const isUserInAudio = useCallback(
    (userId?: string | null) => {
      if (!userId) return false;
      return audioHostIds.has(String(userId));
    },
    [audioHostIds],
  );

  const getUserLiveCallId = useCallback(
    (userId?: string | null) => {
      if (!userId) return undefined;
      return callIdByHostId.get(String(userId));
    },
    [callIdByHostId],
  );

  const getUserAudioCallId = useCallback(
    (userId?: string | null) => {
      if (!userId) return undefined;
      return callIdByAudioHostId.get(String(userId));
    },
    [callIdByAudioHostId],
  );

  const refresh = useCallback(() => fetchLives(true), [fetchLives]);

  return {
    isProductLive,
    getLiveCallId,
    isUserLive,
    isUserInAudio,
    getUserLiveCallId,
    getUserAudioCallId,
    liveHostIds,
    audioHostIds,
    activeLiveCallIds,
    activeAudioCallIds,
    refresh,
    liveRevision,
  };
}
