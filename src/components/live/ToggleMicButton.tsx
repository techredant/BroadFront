import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { callManager, useCall, useCallStateHooks, OwnCapability } from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";

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
  loading,
  onPress,
}: {
  disabled?: boolean;
  muted?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        muted ? styles.muted : styles.active,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Ionicons name={muted ? "mic-off" : "mic"} size={28} color="white" />
      )}
    </Pressable>
  );
}

function ToggleMicButtonJoined() {
  const call = useCall();
  const { useMicrophoneState, useHasPermissions } = useCallStateHooks();
  const { status: micStatus } = useMicrophoneState();
  const hasPermission = useHasPermissions(OwnCapability.SEND_AUDIO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!call || call.state.callingState !== RtcConnectionState.JOINED) return;

    callManager.start({
      audioRole: "communicator",
      deviceEndpointType: "speaker",
    });
  }, [call, call?.state.callingState]);

  const toggleMic = async () => {
    if (!call || call.state.callingState !== RtcConnectionState.JOINED) return;

    try {
      setLoading(true);
      if (!hasPermission) {
        await call.requestPermissions({
          permissions: [OwnCapability.SEND_AUDIO],
        });
        return;
      }
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
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  active: { backgroundColor: "#7C3AED" },
  muted: { backgroundColor: "#EF4444" },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
});
