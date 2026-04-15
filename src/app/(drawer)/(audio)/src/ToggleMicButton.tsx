import {
  callManager,
  useCall,
  useCallStateHooks,
  OwnCapability,
} from "@stream-io/video-react-native-sdk";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export const ToggleMicButton = () => {
  const call = useCall();
  const { useMicrophoneState, useHasPermissions } = useCallStateHooks();
  const { status: micStatus } = useMicrophoneState();

  const hasPermission = useHasPermissions(OwnCapability.SEND_AUDIO);

  const [loading, setLoading] = useState(false);

  const isJoined = call?.state.callingState === "joined";

  // 🔥 START AUDIO ONLY WHEN JOINED (NO STOP!)
  useEffect(() => {
    if (!call) return;

    if (call.state.callingState === "joined") {
      callManager.start({
        audioRole: "communicator",
        defaultAudioDeviceEndpointType: "speaker",
      });
    }
  }, [call?.state.callingState]);

  // 🔥 DEBUG CALL STATE
  useEffect(() => {
    if (!call) return;

    const unsub = call.on("call.state_changed", () => {
      console.log("CALL STATE:", call.state.callingState);
    });

    return () => unsub();
  }, [call]);

  const toggleMic = async () => {
    if (!call) return;

    // 🚨 CRITICAL FIX
    if (call.state.callingState !== "joined") {
      console.warn("Call not ready");
      return;
    }

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
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={toggleMic}
      disabled={!isJoined || loading}
      style={[
        styles.button,
        isMuted ? styles.muted : { backgroundColor: theme.primary },
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
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  active: { backgroundColor: "blue" },
  muted: { backgroundColor: "#EF4444" },
});
