import { useTheme } from "@/context/ThemeContext";
import {
  BroadcastActiveCallControls,
  BroadcastIncomingCallControls,
  BroadcastOutgoingCallControls,
} from "@/components/call/BroadcastCallControls";
import { BroadcastParticipantLabel } from "@/components/call/BroadcastParticipantLabel";
import { BroadcastRingingCall } from "@/components/call/BroadcastRingingCall";
import { BroadcastFloatingLocalVideo } from "@/components/call/BroadcastFloatingLocalVideo";
import { useCallManager } from "@/hooks/useCallManager";
import { useCallRingtone } from "@/hooks/useCallRingtone";
import { useWebRTC } from "@/hooks/useWebRTC";
import {
  mapCallingStateToStatus,
  statusLabel,
} from "@/utils/callStatus";
import { Ionicons } from "@expo/vector-icons";
import {
  CallContent,
  CallingState,
  StreamCall,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";
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

function resolveCallId(raw: string) {
  return raw.includes(":") ? raw.split(":").pop()! : raw;
}

const CallScreen = () => {
  const {
    callId: rawCallId,
    isCaller: callerParam,
    callMode: callModeParam,
  } = useLocalSearchParams<{
    callId: string;
    isCaller: string;
    callMode?: string;
  }>();

  const callId = rawCallId ? resolveCallId(rawCallId) : "";
  const isCaller = callerParam === "true";
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
  } = useCallManager({
    videoClient,
    chatClient,
    rawCallId: callId,
    isCaller,
    urlCallMode: callMode,
    userId: chatClient?.userID,
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
    <StreamCall call={call}>
      <CallUI
        isCaller={isCaller}
        callMode={effectiveCallMode}
        displayNames={displayNames}
        remotePeer={remotePeer}
      />
    </StreamCall>
  );
};

function CallUI({
  isCaller,
  callMode,
  displayNames,
  remotePeer,
}: {
  isCaller: boolean;
  callMode: CallMode;
  displayNames: Record<string, string>;
  remotePeer: { name: string; image?: string };
}) {
  const isVideoCall = callMode === "video";
  const call = useCall();
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [calleeConnected, setCalleeConnected] = useState(!isCaller);

  useEffect(() => {
    if (!call || !isCaller) return;

    const markConnected = (userId?: string) => {
      if (!userId || userId === call.currentUserId) return;
      setCalleeConnected(true);
    };

    const unsubAccepted = call.on("call.accepted", (event) => {
      markConnected(event.user?.id);
    });
    const unsubJoined = call.on("call.session_participant_joined", (event) => {
      markConnected(event.participant?.user?.id);
    });

    return () => {
      unsubAccepted();
      unsubJoined();
    };
  }, [call, isCaller]);

  const isJoined = callingState === CallingState.JOINED;
  const waitingForCallee = isCaller && !calleeConnected;
  const isRinging =
    waitingForCallee ||
    [CallingState.RINGING, CallingState.JOINING, CallingState.IDLE].includes(
      callingState,
    ) ||
    Boolean(
      call?.ringing &&
        callingState !== CallingState.JOINED &&
        callingState !== CallingState.LEFT,
    );

  const sessionStatus = mapCallingStateToStatus(callingState, {
    ringing: Boolean(call?.ringing),
    isCaller,
  });

  useCallRingtone(
    callingState !== CallingState.JOINED &&
      callingState !== CallingState.LEFT,
    !isCaller,
  );

  const { toggleSpeaker, flipCamera, permissionError } = useWebRTC(
    call,
    isVideoCall,
    isJoined && !waitingForCallee,
  );

  const hangup = async () => {
    if (call?.isCreatedByMe) {
      await call.endCall();
    } else {
      await call?.leave();
    }
    router.back();
  };

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      router.back();
    }
  }, [callingState, router]);

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
            <BroadcastOutgoingCallControls onDone={() => router.back()} />
          ) : (
            <BroadcastIncomingCallControls
              isVideoCall={isVideoCall}
              onDone={() => router.back()}
            />
          )
        }
      />
    );
  }

  if (!isVideoCall) {
    return (
      <SafeAreaView style={styles.activeRoot}>
        <View style={styles.audioCallBody}>
          <Ionicons name="call" size={48} color="rgba(255,255,255,0.9)" />
          <Text style={styles.audioCallLabel}>{remotePeer.name}</Text>
          <Text style={styles.audioCallSub}>
            {statusLabel(sessionStatus) || "Voice call"}
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
    <SafeAreaView style={styles.activeRoot} edges={["top"]}>
      <CallContent
        layout="grid"
        FloatingParticipantView={BroadcastFloatingLocalVideo}
        ParticipantLabel={(props) => (
          <BroadcastParticipantLabel
            {...props}
            displayNames={displayNames}
          />
        )}
        CallControls={() => (
          <BroadcastActiveCallControls
            showCamera
            showSpeakerToggle
            showFlipCamera
            onToggleSpeaker={toggleSpeaker}
            onFlipCamera={() => void flipCamera()}
            onHangup={hangup}
          />
        )}
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
