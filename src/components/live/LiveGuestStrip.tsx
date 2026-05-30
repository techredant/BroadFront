import React from "react";
import { View, ScrollView, Text, StyleSheet } from "react-native";
import type { EnrichedRtcParticipant } from "@/rtc/types";
import { RtcRemoteVideoView } from "@/components/call/RtcVideoViews";
import { TT } from "@/utils/liveTikTokLayout";

type Props = {
  guests: EnrichedRtcParticipant[];
  topOffset: number;
  activeSpeakerId?: string;
};

/** Up to 4 co-host cards under the top bar — active speaker glow. */
export function LiveGuestStrip({ guests, topOffset, activeSpeakerId }: Props) {
  const slots = guests.slice(0, TT.guestMax);
  if (!slots.length) return null;

  return (
    <View style={[styles.strip, { top: topOffset }]} pointerEvents="none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {slots.map((p) => {
          const isActive = activeSpeakerId === p.sessionId || p.isSpeaking;
          const hasVideo = Boolean(p.hasVideo);
          const initial = (p.name || p.userId || "?").charAt(0).toUpperCase();

          return (
            <View
              key={p.sessionId}
              style={[styles.card, isActive && styles.cardActive]}
            >
              {hasVideo ? (
                <RtcRemoteVideoView uid={p.uid} style={styles.guestVideo} />
              ) : (
                <View style={styles.fallback}>
                  <Text style={styles.fallbackInitial}>{initial}</Text>
                </View>
              )}
              <View style={styles.nameTag}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {p.name || "Guest"}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: TT.dockLeft,
    right: TT.dockRightInset,
    zIndex: 20,
  },
  row: {
    paddingHorizontal: 4,
    gap: 10,
    alignItems: "center",
  },
  card: {
    width: TT.guestCardW,
    height: TT.guestCardH,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    ...TT.shadow,
  },
  cardActive: {
    borderColor: TT.accentCyan,
    shadowColor: TT.accentCyan,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 12,
  },
  guestVideo: {
    flex: 1,
    backgroundColor: "#000",
  },
  fallback: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackInitial: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  nameTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.62)",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  nameText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
