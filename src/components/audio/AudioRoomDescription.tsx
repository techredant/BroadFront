import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCallStateHooks } from "@/rtc";
import { MediaColors } from "@/constants/mediaTheme";

export default function AudioRoomDescription() {
  const { useCallCustomData, useParticipants, useIsCallLive } = useCallStateHooks();
  const custom = useCallCustomData();
  const participants = useParticipants();
  const isLive = useIsCallLive();

  const title = (custom as Record<string, unknown>)?.title || "Audio room";
  const category = (custom as Record<string, unknown>)?.category;

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={[styles.livePill, !isLive && styles.offlinePill]}>
          <View style={[styles.dot, !isLive && styles.dotOff]} />
          <Text style={styles.liveText}>{isLive ? "LIVE" : "OFFLINE"}</Text>
        </View>
        {category ? (
          <Text style={styles.category}>{String(category)}</Text>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {String(title)}
      </Text>
      <Text style={styles.count}>
        {participants.length} {participants.length === 1 ? "listener" : "listeners"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MediaColors.liveRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  offlinePill: { backgroundColor: "rgba(255,255,255,0.15)" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  dotOff: { backgroundColor: MediaColors.textMuted },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  category: {
    color: MediaColors.accentCyan,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: MediaColors.textPrimary,
    textAlign: "center",
  },
  count: {
    marginTop: 6,
    fontSize: 13,
    color: MediaColors.textSecondary,
    fontWeight: "600",
  },
});
