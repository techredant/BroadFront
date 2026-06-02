import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallStateHooks } from "@/rtc";
import {
  RtcLocalVideoView,
  RtcRemoteVideoView,
} from "@/components/call/RtcVideoViews";
import { resolveRemoteCallDisplayName } from "@/utils/callDisplayName";

type RemotePeer = {
  name: string;
  image?: string;
};

type Props = {
  displayNames: Record<string, string>;
  remotePeer: RemotePeer;
  duration?: string;
  localUserId?: string | null;
};

const PIP_WIDTH = 108;
const PIP_HEIGHT = 152;

/** WhatsApp-style 1:1 video: remote full screen, self mini window, tap to swap. */
export const BroadcastVideoCallLayout = memo(function BroadcastVideoCallLayout({
  displayNames,
  remotePeer,
  duration,
  localUserId,
}: Props) {
  const insets = useSafeAreaInsets();
  const { useLocalParticipant, useRemoteParticipants } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants[0];
  const [localInPip, setLocalInPip] = useState(true);

  const remoteName = useMemo(
    () =>
      resolveRemoteCallDisplayName(remotePeer, displayNames, localUserId),
    [remotePeer, displayNames, localUserId],
  );

  const topBarHeight = insets.top + 56;
  const pipTop = topBarHeight + 8;

  const mainIsLocal = localInPip === false && Boolean(localParticipant);

  const togglePip = () => {
    if (localParticipant && remoteParticipant) {
      setLocalInPip((value) => !value);
    }
  };

  const showPip =
    Boolean(localParticipant) &&
    (Boolean(remoteParticipant) || localInPip === false);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.topName} numberOfLines={1}>
          {remoteName}
        </Text>
        {duration ? <Text style={styles.topDuration}>{duration}</Text> : null}
      </View>

      <View style={styles.stage}>
        {mainIsLocal ? (
          <RtcLocalVideoView key="main-local" style={styles.fullVideo} />
        ) : remoteParticipant ? (
          <RtcRemoteVideoView
            key={`main-remote-${remoteParticipant.uid}`}
            uid={remoteParticipant.uid}
            style={styles.fullVideo}
          />
        ) : localParticipant ? (
          <RtcLocalVideoView key="main-local-fallback" style={styles.fullVideo} />
        ) : (
          <WaitingForRemote remotePeer={remotePeer} remoteName={remoteName} />
        )}
      </View>

      {showPip ? (
        <Pressable
          onPress={togglePip}
          style={[
            styles.pip,
            { top: pipTop, right: 12 + insets.right },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            localInPip ? "Show your video full screen" : "Show caller full screen"
          }
        >
          {localInPip ? (
            <RtcLocalVideoView
              key="pip-local"
              style={styles.pipVideo}
              zOrderMediaOverlay
            />
          ) : remoteParticipant ? (
            <RtcRemoteVideoView
              key={`pip-remote-${remoteParticipant.uid}`}
              uid={remoteParticipant.uid}
              style={styles.pipVideo}
              zOrderMediaOverlay
            />
          ) : (
            <RtcLocalVideoView
              key="pip-local-fallback"
              style={styles.pipVideo}
              zOrderMediaOverlay
            />
          )}
          <View style={styles.pipBadge}>
            <Ionicons
              name="swap-horizontal"
              size={12}
              color="#fff"
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
});

function WaitingForRemote({
  remotePeer,
  remoteName,
}: {
  remotePeer: RemotePeer;
  remoteName: string;
}) {
  return (
    <View style={styles.waiting}>
      {remotePeer.image ? (
        <Image
          source={{ uri: remotePeer.image }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
      )}
      <Text style={styles.waitingName}>{remoteName}</Text>
      <ActivityIndicator color="#3797F0" style={styles.spinner} />
      <Text style={styles.waitingText}>Connecting video…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  topName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "100%",
  },
  topDuration: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
  },
  fullVideo: {
    flex: 1,
  },
  pip: {
    position: "absolute",
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    zIndex: 25,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  pipVideo: {
    flex: 1,
  },
  pipBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  waiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0b0b0f",
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  waitingName: {
    marginTop: 16,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  spinner: {
    marginTop: 20,
  },
  waitingText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    fontWeight: "500",
  },
});
