import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { RtcSessionProvider, useStreamVideoClient } from "@/rtc";
import type { RtcCall } from "@/rtc/RtcCall";
import { startLiveSession } from "@/rtc/agoraApi";
import { useLevel } from "@/context/LevelContext";
import { useActiveLiveHosts } from "@/context/ActiveLiveHostsContext";
import { useTheme } from "@/context/ThemeContext";
import { AudioRoomUI } from "./AudioRoomUI";
import { buildAudioRoomGetOrCreateRequest } from "@/utils/audioRoomCall";
import { RtcConnectionState } from "@/rtc/types";

export type AudioRoomSessionMeta = {
  callId: string;
  isHost: boolean;
  roomTitle?: string;
  level?: string;
  category?: string;
};

type Props = {
  session: AudioRoomSessionMeta;
  onExit: () => void;
};

export function AudioRoomSession({ session, onExit }: Props) {
  const client = useStreamVideoClient();
  const { userDetails } = useLevel();
  const { refresh: refreshActiveSessions } = useActiveLiveHosts();
  const { theme } = useTheme();
  const [call, setCall] = useState<RtcCall | null>(null);
  const joinGenRef = useRef(0);

  const streamCall = useMemo(() => {
    if (!client) return null;
    return client.call("audio_room", session.callId);
  }, [client, session.callId]);

  useEffect(() => {
    if (!streamCall || !userDetails?.clerkId) return;

    const gen = ++joinGenRef.current;
    let active = true;

    const custom = {
      title: session.roomTitle || "Audio room",
      category: session.category || "National",
      level: session.level || "home",
      callMode: "audio",
      hostUserId: session.isHost ? userDetails.clerkId : undefined,
    };

    void (async () => {
      try {
        if (
          streamCall.state.callingState === RtcConnectionState.JOINED ||
          streamCall.state.callingState === RtcConnectionState.JOINING
        ) {
          if (active && joinGenRef.current === gen) setCall(streamCall);
          return;
        }

        if (session.isHost) {
          await streamCall.getOrCreate(
            buildAudioRoomGetOrCreateRequest({ custom }),
          );
          await streamCall.join({ create: true, video: false, role: "host" });
          await streamCall.microphone.enable();
          await streamCall.goLive();
          await startLiveSession({
            callId: session.callId,
            hostClerkId: userDetails.clerkId,
            variant: "audio",
            roomTitle: custom.title as string,
            level: custom.level as string,
            custom,
          }).catch(() => {});
          refreshActiveSessions();
        } else {
          await streamCall.join({
            create: false,
            video: false,
            role: "audience",
          });
        }

        if (!active || joinGenRef.current !== gen) {
          await streamCall.leave().catch(() => {});
          return;
        }

        setCall(streamCall);
      } catch (e) {
        console.log("Audio room join error:", e);
        if (active && joinGenRef.current === gen) {
          onExit();
        }
      }
    })();

    return () => {
      active = false;
      void streamCall.leave().catch(() => {});
    };
  }, [
    streamCall,
    session.callId,
    session.isHost,
    session.roomTitle,
    session.level,
    session.category,
    userDetails?.clerkId,
    refreshActiveSessions,
    onExit,
  ]);

  const handleExit = () => {
    if (call) {
      if (session.isHost) {
        void call.endCall().catch(() => {});
      } else {
        void call.leave().catch(() => {});
      }
    }
    onExit();
  };

  if (!call) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <RtcSessionProvider call={call}>
      <AudioRoomUI goToHomeScreen={handleExit} isHost={session.isHost} />
    </RtcSessionProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
});
