import {
  callManager,
  useCall,
  useCallStateHooks,
  OwnCapability,
} from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

/** Mic hooks need a live call — only mount after join. */
export const ToggleMicButton = () => {
  const call = useCall();
  const isJoined = call?.state.callingState === RtcConnectionState.JOINED;

  if (!call || !isJoined) {
    return <MicButtonShell disabled muted />;
  }

  return <ToggleMicButtonJoined />;
};

function MicButtonShell({
  disabled,
  muted,
  locked,
  loading,
  onPress,
}: {
  disabled?: boolean;
  muted?: boolean;
  locked?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading || locked}
      style={[
        styles.button,
        locked || muted ? styles.muted : { backgroundColor: theme.primary },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Ionicons
          name={locked ? "lock-closed" : muted ? "mic-off" : "mic"}
          size={locked ? 24 : 28}
          color="white"
        />
      )}
    </Pressable>
  );
}

function ToggleMicButtonJoined() {
  const call = useCall();
  const { useMicrophoneState, useHasPermissions } = useCallStateHooks();
  const { status: micStatus } = useMicrophoneState();
  const hasSpeakPermission = useHasPermissions(OwnCapability.SEND_AUDIO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!call || call.state.callingState !== RtcConnectionState.JOINED) return;

    callManager.start({
      audioRole: "communicator",
      deviceEndpointType: "speaker",
    });
  }, [call, call?.state.callingState]);

  if (!hasSpeakPermission) {
    return <MicButtonShell locked muted disabled />;
  }

  const toggleMic = async () => {
    if (!call || call.state.callingState !== RtcConnectionState.JOINED) return;

    try {
      setLoading(true);
      await call.microphone.toggle();
    } catch (e) {
      console.error("MIC ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  const isMuted = micStatus !== "enabled";

  return (
    <MicButtonShell
      muted={isMuted}
      loading={loading}
      onPress={toggleMic}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  muted: { backgroundColor: "#EF4444" },
});
