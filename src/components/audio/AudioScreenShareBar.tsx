import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useCall } from "@stream-io/video-react-native-sdk";
import { Ionicons } from "@expo/vector-icons";
import { toggleCallScreenShare } from "@/utils/screenShareHelper";

/**
 * Shown to the local presenter while screen sharing — quick stop control.
 */
export default function AudioScreenShareBar() {
  const call = useCall();
  const sharing = call?.screenShare.enabled ?? false;

  if (!call || !sharing) return null;

  return (
    <View style={styles.bar}>
      <Ionicons name="easel" size={16} color="#25F4EE" />
      <Text style={styles.text}>
        {Platform.OS === "ios"
          ? "You are presenting (broadcast)"
          : "You are presenting your screen"}
      </Text>
      <Pressable
        style={styles.stopBtn}
        onPress={() => void toggleCallScreenShare(call)}
      >
        <Text style={styles.stopText}>Stop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(37,244,238,0.15)",
    borderWidth: 1,
    borderColor: "rgba(37,244,238,0.4)",
  },
  text: { flex: 1, color: "#fff", fontSize: 11, fontWeight: "600" },
  stopBtn: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stopText: { color: "#fff", fontWeight: "800", fontSize: 11 },
});
