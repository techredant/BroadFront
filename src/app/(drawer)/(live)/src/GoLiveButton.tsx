import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  isLive: boolean; // live state
  onPress: () => void; // button action
};

export const GoLiveButton = ({ isLive, onPress }: Props) => {
  return (
    <Pressable
      onPress={onPress}
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
          color="black"
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  live: {
    backgroundColor: "#EF4444", // red when live
  },
  offline: {
    backgroundColor: "#1F2937", // dark gray when not live
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginRight: 8,
  },
  text: {
    color: "black",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
