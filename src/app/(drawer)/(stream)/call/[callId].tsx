import { useTheme } from "@/context/ThemeContext";
import {
  BroadcastActiveCallControls,
  BroadcastIncomingCallControls,
  BroadcastOutgoingCallControls,
} from "@/components/call/BroadcastCallControls";
import { BroadcastRingingCall } from "@/components/call/BroadcastRingingCall";
import { BroadcastVideoCallLayout } from "@/components/call/BroadcastVideoCallLayout";
import { useCallManager } from "@/hooks/useCallManager";
import { useCallRingtone } from "@/hooks/useCallRingtone";
import { useWebRTC } from "@/hooks/useWebRTC";
import {
  mapCallingStateToStatus,
  statusLabel,
} from "@/utils/callStatus";
import { Ionicons } from "@expo/vector-icons";
import {
  RtcSessionProvider,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
} from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";
import { useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";
import type { CallMode } from "@/utils/callMode";
import { useCallDuration } from "@/hooks/useCallDuration";
import { streamChannelPath } from "@/utils/notificationRouting";
import { StreamConnectionOverlay } from "@/components/call/StreamConnectionOverlay";

function resolveCallId(raw: string) {
  return raw.includes(":") ? raw.split(":").pop()! : raw;
}

const CallScreen = () => {
  const {
    callId: rawCallId,
    isCaller: callerParam,
    callMode: callModeParam,
    accepted: acceptedParam,
    peerName,
    peerImage,
  } = useLocalSearchParams<{
    callId: string;
    isCaller: string;
    callMode?: string;
    accepted?: string;
    peerName?: string;
    peerImage?: string;
  }>();

  const callId = rawCallId ? resolveCallId(rawCallId) : "";
  const isCaller = callerParam === "true";
  const acceptedFromOverlay = acceptedParam === "true";
  const callMode: CallMode = callModeParam === "audio" ? "audio" : "video";

  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();
  const router = useRouter();

  const {
    call,
    loading,
    error,
    remotePeer,
    displayNames,
    effectiveCallMode,
    channelId,
  } = useCallManager({
    videoClient,
    chatClient,
    rawCallId: callId,
    isCaller,
    urlCallMode: callMode,
    userId: chatClient?.userID,
    callAccepted: acceptedFromOverlay,
    initialRemotePeer: {
      name: typeof peerName === "string" ? peerName : undefined,
      image: typeof peerImage === "string" ? peerImage : undefined,
    },
  });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3797F0" />
      </View>
    );
  }

  if (error) return <ErrorCallUI error={error} />;

  if (!call) return <ErrorCallUI error="Call unavailable" />;

  return (
    <RtcSessionProvider call={call}>
      <CallUI
        isCaller={isCaller}
        callMode={effectiveCallMode}
        displayNames={displayNames}
        remotePeer={remotePeer}
        channelId={channelId}
      />
    </RtcSessionProvider>
  );
};

function CallUI({
  isCaller,
  callMode,
  displayNames,
  remotePeer,
  channelId,
}: {
  isCaller: boolean;
  callMode: CallMode;
  displayNames: Record<string, string>;
  remotePeer: { name: string; image?: string };
  channelId: string;
}) {
  const isVideoCall = callMode === "video";
  const call = useCall();
  const router = useRouter();
  const { useCallCallingState, useRemoteParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remoteParticipants = useRemoteParticipants();

  const calleeConnected = useMemo(() => {
    if (!isCaller || !call) return true;
    return remoteParticipants.some((p) => p.userId !== call.currentUserId);
  }, [isCaller, call, remoteParticipants]);

  const exitToChat = () => {
    if (channelId) {
      router.replace(streamChannelPath(channelId) as never);
      return;
    }
    router.back();
  };

  const isJoined = callingState === RtcConnectionState.JOINED;
  const waitingForCallee = isCaller && !calleeConnected;
  const isCalleeConnecting =
    !isCaller && callingState === RtcConnectionState.JOINING;
  const callDuration = useCallDuration(isJoined);

  const isRinging = isCaller
    ? !isJoined &&
      (waitingForCallee ||
        [RtcConnectionState.RINGING, RtcConnectionState.JOINING, RtcConnectionState.IDLE].includes(
          callingState as RtcConnectionState,
        ) ||
        Boolean(
          call?.ringing &&
            callingState !== RtcConnectionState.LEFT,
        ))
    : !isJoined &&
      callingState !== RtcConnectionState.LEFT &&
      !isCalleeConnecting;

  const sessionStatus = mapCallingStateToStatus(callingState);

  useCallRingtone(
    isCaller
      ? callingState !== RtcConnectionState.JOINED &&
          callingState !== RtcConnectionState.LEFT
      : isRinging,
    !isCaller,
  );

  const { toggleSpeaker, flipCamera, permissionError } = useWebRTC(
    call,
    isVideoCall,
    isJoined,
  );

  const hangup = async () => {
    if (call?.isCreatedByMe) {
      await call.endCall();
    } else {
      await call?.leave();
    }
    exitToChat();
  };

  useEffect(() => {
    if (callingState === RtcConnectionState.LEFT) {
      exitToChat();
    }
  }, [callingState, channelId, router]);

  if (permissionError && isJoined) {
    return <ErrorCallUI error={permissionError} />;
  }

  if (isRinging) {
    return (
      <BroadcastRingingCall
        remoteName={remotePeer.name}
        remoteImage={remotePeer.image}
        isCaller={isCaller}
        isVideoCall={isVideoCall}
        statusText={statusLabel(sessionStatus)}
        controls={
          isCaller ? (
            <BroadcastOutgoingCallControls onDone={exitToChat} />
          ) : (
            <BroadcastIncomingCallControls
              isVideoCall={isVideoCall}
              onDone={exitToChat}
            />
          )
        }
      />
    );
  }

  if (!isVideoCall || !isJoined) {
    if (!isVideoCall) {
      return (
        <SafeAreaView style={styles.activeRoot}>
          <StreamConnectionOverlay />
          <View style={styles.audioCallBody}>
            <Ionicons name="call" size={48} color="rgba(255,255,255,0.9)" />
            <Text style={styles.audioCallLabel}>{remotePeer.name}</Text>
            <Text style={styles.audioCallSub}>
              {isJoined
                ? callDuration
                : statusLabel(sessionStatus) || "Voice call"}
            </Text>
          </View>
          <BroadcastActiveCallControls
            showCamera={false}
            showSpeakerToggle
            onToggleSpeaker={toggleSpeaker}
            onHangup={hangup}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.activeRoot}>
        <BroadcastRingingCall
          remoteName={remotePeer.name}
          remoteImage={remotePeer.image}
          isCaller={isCaller}
          isVideoCall={isVideoCall}
          statusText="Connecting video…"
          controls={
            <BroadcastActiveCallControls
              showCamera
              showSpeakerToggle
              showFlipCamera
              onToggleSpeaker={toggleSpeaker}
              onFlipCamera={() => void flipCamera()}
              onHangup={hangup}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.activeRoot} edges={[]}>
      <StreamConnectionOverlay />
      <BroadcastVideoCallLayout
        displayNames={displayNames}
        remotePeer={remotePeer}
        duration={callDuration}
        localUserId={call?.currentUserId}
      />
      <BroadcastActiveCallControls
        showCamera
        showSpeakerToggle
        showFlipCamera
        onToggleSpeaker={toggleSpeaker}
        onFlipCamera={() => void flipCamera()}
        onHangup={hangup}
      />
    </SafeAreaView>
  );
}

export default CallScreen;

function ErrorCallUI({ error }: { error: string }) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.ringingRoot, { backgroundColor: theme.background }]}
    >
      <View style={styles.errorBox}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <Pressable
          style={[styles.errorBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.errorBtnText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0f",
  },
  ringingRoot: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  activeRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  audioCallBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  audioCallLabel: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  audioCallSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorText: { textAlign: "center", fontSize: 15 },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: { color: "#fff", fontWeight: "700" },
});
