import { useCallback, useEffect, useRef, useState } from "react";
import {
  StreamVideoClient,
  type Call,
} from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";
import { fetchStreamToken } from "@/utils/streamToken";
import {
  isMarketLiveCall,
  parseMarketCallId,
} from "@/utils/marketLive";
import { isStreamCallLive } from "@/utils/isStreamCallLive";
import type { MarketplaceProduct } from "@/types/marketplace";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;
const POLL_MS = 25_000;
const MIN_FETCH_MS = 12_000;

function readCustom(call: Call): Record<string, unknown> | undefined {
  const fromState = call.state?.custom as Record<string, unknown> | undefined;
  if (fromState && Object.keys(fromState).length > 0) return fromState;

  const raw = call.state as { settings?: { custom?: Record<string, unknown> } };
  return raw?.settings?.custom;
}

function hostIdFromCall(call: Call): string | undefined {
  const custom = readCustom(call);
  const parsed = parseMarketCallId(call.id);
  return (
    (typeof custom?.hostUserId === "string" && custom.hostUserId) ||
    call.state?.createdBy?.id ||
    parsed.hostId ||
    undefined
  );
}

function registerCall(
  call: Call,
  liveHostIds: Set<string>,
  callIdByHostId: Map<string, string>,
  liveProductIds: Set<string>,
  liveSellerIds: Set<string>,
  callIdByProductId: Map<string, string>,
  callIdBySellerId: Map<string, string>,
) {
  if (!isStreamCallLive(call)) return;

  const hostId = hostIdFromCall(call);
  if (hostId) {
    const key = String(hostId);
    liveHostIds.add(key);
    if (!callIdByHostId.has(key)) {
      callIdByHostId.set(key, call.id);
    }
  }

  if (!isMarketLiveCall(call)) return;

  const custom = readCustom(call);
  const parsed = parseMarketCallId(call.id);

  const sellerId = hostId;
  const productId =
    (typeof custom?.productId === "string" && custom.productId) ||
    parsed.productId;

  if (productId) {
    liveProductIds.add(String(productId));
    callIdByProductId.set(String(productId), call.id);
  }
  if (sellerId) {
    liveSellerIds.add(String(sellerId));
    if (!callIdBySellerId.has(String(sellerId))) {
      callIdBySellerId.set(String(sellerId), call.id);
    }
  }
}

async function buildLiveMaps(calls: Call[]) {
  const liveHostIds = new Set<string>();
  const callIdByHostId = new Map<string, string>();
  const liveProductIds = new Set<string>();
  const liveSellerIds = new Set<string>();
  const callIdByProductId = new Map<string, string>();
  const callIdBySellerId = new Map<string, string>();
  const activeLiveCallIds = new Set<string>();

  const candidates = calls.filter((c) => isStreamCallLive(c));

  await Promise.all(
    candidates.map(async (call) => {
      try {
        await call.get();
      } catch {
        /* use cached state */
      }
      if (!isStreamCallLive(call)) return;
      activeLiveCallIds.add(call.id);
      registerCall(
        call,
        liveHostIds,
        callIdByHostId,
        liveProductIds,
        liveSellerIds,
        callIdByProductId,
        callIdBySellerId,
      );
    }),
  );

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
      if (!clerkId || !apiKey || inflightRef.current) return;

      const now = Date.now();
      if (!force && now - lastFetchRef.current < MIN_FETCH_MS) return;

      inflightRef.current = true;
      try {
        const displayName =
          `${userDetails.firstName ?? ""} ${userDetails.lastName ?? ""} ${userDetails.nickName ?? ""}`.trim() ||
          clerkId;

        const client = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: {
            id: clerkId,
            name: displayName,
            image: userDetails.image,
          },
          tokenProvider: () =>
            fetchStreamToken({
              userId: clerkId,
              name: displayName,
              image: userDetails.image,
            }),
        });

        const res = await client.queryCalls({
          filter_conditions: { type: "livestream" },
          sort: [{ field: "created_at", direction: -1 }],
        });

        const maps = await buildLiveMaps(res.calls);
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
        /* Stream unavailable — badges stay hidden */
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
