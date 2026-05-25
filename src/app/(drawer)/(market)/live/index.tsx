import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  consumeStashedMarketLiveProduct,
  marketLiveCallId,
  parseMarketLiveParams,
  type MarketLiveProduct,
} from "@/utils/marketLive";
import {
  clearActiveMarketLiveSession,
  getActiveMarketLiveSession,
  setActiveMarketLiveSession,
  type MarketLiveSession,
} from "@/utils/marketLiveSession";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { HomeScreen } from "@/components/live/HomeLivescreen";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { fetchStreamToken } from "@/utils/streamToken";
import LiveScreen from "@/components/live/LiveScreen";
import {
  LiveHostPaywall,
  type LiveHostPaywallMeta,
} from "@/components/live/LiveHostPaywall";
import { verifyHostAccessPaid } from "@/utils/liveHostPayments";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

type Session = MarketLiveSession;

type HostPending = {
  callId: string;
  meta: LiveHostPaywallMeta;
};

export default function MarketLiveRoute() {
  const { userDetails, currentLevel } = useLevel();
  const { isDark, theme } = useTheme();
  const params = useLocalSearchParams<{
    callId?: string;
    startMarketLive?: string;
    productId?: string;
    productTitle?: string;
    productPrice?: string;
    productImage?: string;
  }>();
  const deepCallId = params.callId;
  const pendingMarketLive = useMemo(() => {
    return consumeStashedMarketLiveProduct() ?? parseMarketLiveParams(params);
  }, [params.productId, params.productTitle, params.productPrice, params.startMarketLive]);
  const [marketLivePrompt, setMarketLivePrompt] =
    useState<MarketLiveProduct | null>(null);
  const [openGoLiveModal, setOpenGoLiveModal] = useState(false);
  const marketLiveHandledRef = useRef(false);

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [session, setSession] = useState<Session | null>(
    () => getActiveMarketLiveSession(),
  );
  const [hostPending, setHostPending] = useState<HostPending | null>(null);
  const [booting, setBooting] = useState(true);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);

  const goToHomeScreen = useCallback(() => {
    clearActiveMarketLiveSession();
    setSession(null);
    setHostPending(null);
  }, []);

  const enterHostSession = useCallback(
    (id: string, meta?: LiveHostPaywallMeta) => {
      const next: Session = {
        callId: id,
        isHost: true,
        roomTitle: meta?.roomTitle,
        level: meta?.level,
        productId: meta?.productId,
        productTitle: meta?.productTitle,
        productPrice: meta?.productPrice,
        productImage: meta?.productImage,
      };
      setActiveMarketLiveSession(next);
      setSession(next);
      setHostPending(null);
    },
    [],
  );

  const requestHostLive = useCallback(
    async (id: string, meta?: LiveHostPaywallMeta) => {
      const clerkId = userDetails?.clerkId;
      if (!clerkId) return;

      const paid = await verifyHostAccessPaid(clerkId, id);
      if (paid) {
        enterHostSession(id, meta);
        return;
      }

      setHostPending({ callId: id, meta: meta ?? {} });
    },
    [userDetails?.clerkId, enterHostSession],
  );

  const joinAsViewer = useCallback((id: string) => {
    setHostPending(null);
    const next: Session = { callId: id, isHost: false };
    setActiveMarketLiveSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    if (
      params.startMarketLive !== "1" ||
      marketLiveHandledRef.current ||
      session ||
      hostPending ||
      !client ||
      !userDetails?.clerkId
    ) {
      return;
    }
    marketLiveHandledRef.current = true;

    if (pendingMarketLive) {
      const id = marketLiveCallId(
        userDetails.clerkId,
        pendingMarketLive.productId,
      );
      void requestHostLive(id, {
        roomTitle: `Selling: ${pendingMarketLive.title}`,
        level: currentLevel?.value ?? "home",
        productId: pendingMarketLive.productId,
        productTitle: pendingMarketLive.title,
        productPrice: pendingMarketLive.price,
        productImage: pendingMarketLive.image,
      });
      return;
    }

    setOpenGoLiveModal(true);
  }, [
    params.startMarketLive,
    pendingMarketLive,
    session,
    hostPending,
    client,
    userDetails?.clerkId,
    currentLevel?.value,
    requestHostLive,
  ]);

  useEffect(() => {
    const id =
      typeof deepCallId === "string"
        ? deepCallId
        : Array.isArray(deepCallId)
          ? deepCallId[0]
          : undefined;
    if (!id || !client || session || hostPending) return;
    if (deepLinkHandledRef.current === id) return;
    deepLinkHandledRef.current = id;

    const restored = getActiveMarketLiveSession();
    if (restored?.callId === id) {
      setSession(restored);
      return;
    }

    joinAsViewer(id);
  }, [deepCallId, client, session, hostPending, joinAsViewer]);

  useEffect(() => {
    const clerkId = userDetails?.clerkId;
    if (!clerkId) {
      setBooting(false);
      return;
    }

    let cancelled = false;

    const initClient = async () => {
      try {
        const displayName =
          `${userDetails.firstName ?? ""} ${userDetails.lastName ?? ""} ${userDetails.nickName ?? ""}`.trim() ||
          clerkId;

        const videoClient = StreamVideoClient.getOrCreateInstance({
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

        if (!cancelled) {
          clientRef.current = videoClient;
          setClient(videoClient);
        }
      } catch (err) {
        console.error("Failed to initialize StreamVideoClient", err);
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    initClient();

    return () => {
      cancelled = true;
      if (!getActiveMarketLiveSession()) {
        clientRef.current?.disconnectUser().catch(() => {});
        clientRef.current = null;
        setClient(null);
      }
    };
  }, [userDetails?.clerkId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {booting || !client ? (
        <>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle={isDark ? "light-content" : "dark-content"}
          />
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="small" color={theme.text} />
          </View>
        </>
      ) : (
        <StreamVideo client={client}>
          {session ? (
            <LiveScreen
              variant="market"
              goToHomeScreen={goToHomeScreen}
              callId={session.callId}
              isHost={session.isHost}
              roomTitle={session.roomTitle}
              level={session.level}
              productId={session.productId}
              productTitle={session.productTitle}
              productPrice={session.productPrice}
              productImage={session.productImage}
            />
          ) : hostPending && userDetails?.clerkId ? (
            <LiveHostPaywall
              callId={hostPending.callId}
              streamKind="market"
              clerkId={userDetails.clerkId}
              meta={hostPending.meta}
              onPaid={() => enterHostSession(hostPending.callId, hostPending.meta)}
              onCancel={() => {
                setHostPending(null);
                goToHomeScreen();
              }}
            />
          ) : (
            <HomeScreen
              mode="market"
              client={client}
              joinCall={joinAsViewer}
              liveScreen={requestHostLive}
              pendingMarketLive={marketLivePrompt}
              onMarketLivePromptConsumed={() => setMarketLivePrompt(null)}
              openGoLiveOnMount={openGoLiveModal}
              onGoLiveModalOpened={() => setOpenGoLiveModal(false)}
            />
          )}
        </StreamVideo>
      )}
    </View>
  );
}
