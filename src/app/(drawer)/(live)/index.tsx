import React, { useState, useEffect, useRef, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStreamVideoClient } from "@/rtc";
import { fetchActiveLives } from "@/rtc/agoraApi";
import { HomeScreen } from "@/components/live/HomeLivescreen";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import LiveScreen from "@/components/live/LiveScreen";
import {
  clearActiveCommunityLiveSession,
  getActiveCommunityLiveSession,
  setActiveCommunityLiveSession,
} from "@/utils/communityLiveSession";

type Session = {
  callId: string;
  isHost: boolean;
  roomTitle?: string;
  level?: string;
  playlist?: string[];
  initialIndex?: number;
};

export default function App() {
  const { userDetails } = useLevel();
  const { theme } = useTheme();
  const { callId: deepCallId } = useLocalSearchParams<{ callId?: string }>();
  const client = useStreamVideoClient();

  const [session, setSession] = useState<Session | null>(
    () => getActiveCommunityLiveSession(),
  );
  const deepLinkHandledRef = useRef<string | null>(null);

  const goToHomeScreen = useCallback(() => setSession(null), []);

  const startAsHost = useCallback(
    (id: string, meta?: { roomTitle?: string; level?: string }) => {
      const next = { callId: id, isHost: true, ...meta };
      setActiveCommunityLiveSession(next);
      setSession(next);
    },
    [],
  );

  const joinAsViewer = useCallback(
    (id: string, meta?: { playlist?: string[]; initialIndex?: number }) => {
      setSession({ callId: id, isHost: false, ...meta });
    },
    [],
  );

  const switchViewerLive = useCallback((id: string, index: number) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            callId: id,
            initialIndex: index,
            isHost: false,
          }
        : { callId: id, isHost: false, initialIndex: index },
    );
  }, []);

  useEffect(() => {
    const id =
      typeof deepCallId === "string"
        ? deepCallId
        : Array.isArray(deepCallId)
          ? deepCallId[0]
          : undefined;
    if (!id || !client || session) return;
    if (deepLinkHandledRef.current === id) return;
    deepLinkHandledRef.current = id;

    const resolveDeepLink = async () => {
      const me = userDetails?.clerkId;
      try {
        const sessions = await fetchActiveLives("community");
        const match = sessions.find(
          (s: { callId?: string }) => s.callId === id,
        );
        const roomTitle =
          typeof match?.roomTitle === "string" ? match.roomTitle : undefined;
        const level =
          typeof match?.level === "string" ? match.level : undefined;

        if (me && match?.hostClerkId === me) {
          startAsHost(id, { roomTitle, level });
        } else {
          joinAsViewer(id);
        }
      } catch {
        joinAsViewer(id);
      }
    };

    void resolveDeepLink();
  }, [deepCallId, client, session, joinAsViewer, startAsHost, userDetails?.clerkId]);

  if (!userDetails?.clerkId || !client) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {session ? (
        <LiveScreen
          goToHomeScreen={goToHomeScreen}
          onSwitchLive={switchViewerLive}
          callId={session.callId}
          isHost={session.isHost}
          roomTitle={session.roomTitle}
          level={session.level}
          playlist={session.playlist}
          initialIndex={session.initialIndex}
          onHostEnded={() => clearActiveCommunityLiveSession()}
        />
      ) : (
        <HomeScreen
          client={client}
          joinCall={joinAsViewer}
          liveScreen={startAsHost}
        />
      )}
    </View>
  );
}
