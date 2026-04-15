import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCall, useCallStateHooks } from "@stream-io/video-react-native-sdk";

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
        isLive ? styles.live : styles.offline,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {isLive && <View style={styles.liveDot} />}
        <Ionicons
          name={isLive ? "radio" : "play"}
          size={20}
          color="white"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.text}>{isLive ? "LIVE" : "Go Live"}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  live: { backgroundColor: "#EF4444" },
  offline: { backgroundColor: "#1F2937" },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  content: { flexDirection: "row", alignItems: "center" },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginRight: 8,
  },
  text: { color: "white", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 },
});
