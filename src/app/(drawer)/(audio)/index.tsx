import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStreamVideoClient } from "@/rtc";
import { fetchActiveLives } from "@/rtc/agoraApi";
import { HomeAudioScreen } from "@/components/audio/HomeAudioScreen";
import {
  AudioRoomSession,
  type AudioRoomSessionMeta,
} from "@/components/audio/AudioRoomSession";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";

export default function AudioIndex() {
  const { userDetails } = useLevel();
  const { theme } = useTheme();
  const { callId: deepCallId, create: createParam } = useLocalSearchParams<{
    callId?: string;
    create?: string;
  }>();
  const client = useStreamVideoClient();

  const [session, setSession] = useState<AudioRoomSessionMeta | null>(null);
  const [openCreateOnMount, setOpenCreateOnMount] = useState(
    createParam === "1" || createParam === "true",
  );
  const deepLinkHandledRef = useRef<string | null>(null);

  const goToHomeScreen = useCallback(() => setSession(null), []);

  const startAsHost = useCallback(
    (
      id: string,
      meta?: { roomTitle?: string; level?: string; category?: string },
    ) => {
      setSession({ callId: id, isHost: true, ...meta });
    },
    [],
  );

  const joinAsListener = useCallback(
    (
      id: string,
      meta?: {
        hostClerkId?: string;
        roomTitle?: string;
      },
    ) => {
      void meta;
      setSession({ callId: id, isHost: false, roomTitle: meta?.roomTitle });
    },
    [],
  );

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
        const sessions = await fetchActiveLives("audio");
        const match = sessions.find(
          (s: { callId?: string }) => s.callId === id,
        );
        const roomTitle =
          typeof match?.roomTitle === "string" ? match.roomTitle : undefined;
        const level =
          typeof match?.level === "string" ? match.level : undefined;
        const category =
          typeof (match?.custom as { category?: string } | undefined)
            ?.category === "string"
            ? (match?.custom as { category?: string }).category
            : undefined;

        if (me && match?.hostClerkId === me) {
          startAsHost(id, { roomTitle, level, category });
        } else {
          joinAsListener(id, { roomTitle, hostClerkId: match?.hostClerkId });
        }
      } catch {
        joinAsListener(id);
      }
    };

    void resolveDeepLink();
  }, [
    deepCallId,
    client,
    session,
    joinAsListener,
    startAsHost,
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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {session ? (
        <AudioRoomSession session={session} onExit={goToHomeScreen} />
      ) : (
        <HomeAudioScreen
          client={client}
          joinRoom={joinAsListener}
          audioScreen={startAsHost}
          openCreateOnMount={openCreateOnMount}
          onCreateModalOpened={() => setOpenCreateOnMount(false)}
        />
      )}
    </View>
  );
}
