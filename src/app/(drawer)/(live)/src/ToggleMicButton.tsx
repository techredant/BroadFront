import React, { useState, useEffect } from "react";
import { Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  callManager,
  useCall,
  useCallStateHooks,
  OwnCapability,
} from "@stream-io/video-react-native-sdk";

export const ToggleMicButton = () => {
  const call = useCall();
  const { useMicrophoneState, useHasPermissions } = useCallStateHooks();
  const { status: micStatus } = useMicrophoneState();
  const hasPermission = useHasPermissions(OwnCapability.SEND_AUDIO);

  const [loading, setLoading] = useState(false);
  const isJoined = call?.state.callingState === "joined";

  // 🔥 START AUDIO WHEN JOINED
  useEffect(() => {
    if (!call) return;
    if (call.state.callingState === "joined") {
      callManager.start({
        audioRole: "communicator",
        defaultAudioDeviceEndpointType: "speaker",
      });
    }
  }, [call?.state.callingState]);

  const toggleMic = async () => {
    if (!call || call.state.callingState !== "joined") return;
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
    <Pressable
      onPress={toggleMic}
      disabled={!isJoined || loading}
      style={({ pressed }) => [
        styles.button,
        isMuted ? styles.muted : styles.active,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="white" />
      )}
    </Pressable>
  );
};

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
