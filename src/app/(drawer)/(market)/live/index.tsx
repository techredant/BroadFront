import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStreamVideoClient } from "@/rtc";
import { fetchActiveLives } from "@/rtc/agoraApi";
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
import { HomeScreen } from "@/components/live/HomeLivescreen";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import LiveScreen from "@/components/live/LiveScreen";
import type { LiveHostPaywallMeta } from "@/components/live/LiveHostPaywall";

type Session = MarketLiveSession;

type HostPending = {
  callId: string;
  meta: LiveHostPaywallMeta;
};

export default function MarketLiveRoute() {
  const { userDetails, currentLevel } = useLevel();
  const { isDark, theme } = useTheme();
  const client = useStreamVideoClient();
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

  const [session, setSession] = useState<Session | null>(
    () => getActiveMarketLiveSession(),
  );
  const [hostPending, setHostPending] = useState<HostPending | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);

  const goToHomeScreen = useCallback(() => {
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
      enterHostSession(id, meta);
    },
    [enterHostSession],
  );

  const joinAsViewer = useCallback(
    (id: string, meta?: { hostClerkId?: string }) => {
      setHostPending(null);
      const next: Session = { callId: id, isHost: false, ...meta };
      setActiveMarketLiveSession(next);
      setSession(next);
    },
    [],
  );

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

    const resolveDeepLink = async () => {
      const me = userDetails?.clerkId;
      try {
        const sessions = await fetchActiveLives("market");
        const match = sessions.find(
          (s: { callId?: string }) => s.callId === id,
        );

        if (me && match?.hostClerkId === me) {
          enterHostSession(id, {
            roomTitle:
              typeof match?.roomTitle === "string" ? match.roomTitle : undefined,
            level:
              typeof match?.level === "string" ? match.level : undefined,
          });
        } else {
          joinAsViewer(id, {
            hostClerkId:
              typeof match?.hostClerkId === "string"
                ? match.hostClerkId
                : undefined,
          });
        }
      } catch {
        joinAsViewer(id);
      }
    };

    void resolveDeepLink();
  }, [
    deepCallId,
    client,
    session,
    hostPending,
    joinAsViewer,
    enterHostSession,
    userDetails?.clerkId,
  ]);

  if (!userDetails?.clerkId || !client) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      {session ? (
        <LiveScreen
          variant="market"
          goToHomeScreen={goToHomeScreen}
          onHostEnded={() => clearActiveMarketLiveSession()}
          callId={session.callId}
          isHost={session.isHost}
          hostClerkId={session.hostClerkId}
          roomTitle={session.roomTitle}
          level={session.level}
          productId={session.productId}
          productTitle={session.productTitle}
          productPrice={session.productPrice}
          productImage={session.productImage}
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
    </View>
  );
}
