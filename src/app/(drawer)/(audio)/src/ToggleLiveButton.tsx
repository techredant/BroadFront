import { useCall, useCallStateHooks } from "@stream-io/video-react-native-sdk";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaColors } from "@/constants/mediaTheme";

export const ToggleLiveButton = () => {
  const call = useCall();
  const { useIsCallLive } = useCallStateHooks();
  const isLive = useIsCallLive();

  const handlePress = () => {
    if (!call) return;
    if (isLive) call.stopLive();
    else call.goLive();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        isLive ? styles.liveButton : styles.offlineButton,
        pressed && styles.pressed,
      ]}
    >
      {isLive ? (
        <>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </>
      ) : (
        <>
          <Ionicons name="radio" size={22} color="#fff" />
          <Text style={styles.goLabel}>Go live</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 72,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  liveButton: { backgroundColor: MediaColors.liveRed },
  offlineButton: { backgroundColor: "rgba(255,255,255,0.12)" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  liveLabel: { color: "#fff", fontWeight: "800", fontSize: 12 },
  goLabel: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
