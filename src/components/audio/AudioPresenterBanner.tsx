import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useCallStateHooks } from "@/rtc";
import { Ionicons } from "@expo/vector-icons";
import { MediaColors } from "@/constants/mediaTheme";

/**
 * Shows who is presenting (screen share) — Teams-style presenter indicator.
 */
export default function AudioPresenterBanner() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  const presenter = useMemo(
    () => participants.find((p) => p.publishedTracks?.includes("screenShareTrack")),
    [participants],
  );

  if (!presenter) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Ionicons name="easel" size={14} color={MediaColors.accentCyan} />
        <Text style={styles.badgeText} numberOfLines={1}>
          {presenter.name || "Presenter"} is presenting
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: MediaColors.glass,
  },
  badgeText: {
    flex: 1,
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
});
