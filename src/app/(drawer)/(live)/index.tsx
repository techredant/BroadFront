import React, { useState, useEffect, useRef, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { HomeScreen } from "@/components/live/HomeLivescreen";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { fetchStreamToken } from "@/utils/streamToken";
import LiveScreen from "@/components/live/LiveScreen";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

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

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);

  const goToHomeScreen = useCallback(() => setSession(null), []);

  const startAsHost = useCallback(
    (id: string, meta?: { roomTitle?: string; level?: string }) => {
      setSession({ callId: id, isHost: true, ...meta });
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
    joinAsViewer(id);
  }, [deepCallId, client, session, joinAsViewer]);

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
      clientRef.current = null;
      setClient(null);
    };
  }, [
    userDetails?.clerkId,
    userDetails?.firstName,
    userDetails?.lastName,
    userDetails?.nickName,
    userDetails?.image,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>

      {booting || !client ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="small" color={theme.text} />
        </View>
      ) : (
        <StreamVideo client={client}>
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
            />
          ) : (
            <HomeScreen
              client={client}
              joinCall={joinAsViewer}
              liveScreen={startAsHost}
            />
          )}
        </StreamVideo>
      )}
    </View>
  );
}