import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { VideoRenderer } from "@stream-io/video-react-native-sdk";
import type { StreamVideoParticipant } from "@stream-io/video-client";
import { TT } from "@/utils/liveTikTokLayout";

type Props = {
  guests: StreamVideoParticipant[];
  topOffset: number;
};

/** Co-host circles under the top bar (TikTok LIVE guest style). */
export function LiveGuestStrip({ guests, topOffset }: Props) {
  if (!guests.length) return null;

  return (
    <View style={[styles.strip, { top: topOffset }]} pointerEvents="none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {guests.map((p) => {
          const trackKey = `${p.sessionId}-${p.publishedTracks?.join(",") ?? "none"}`;
          return (
            <View key={p.sessionId} style={styles.cell}>
              <View style={styles.circle} key={trackKey}>
                <VideoRenderer
                  participant={p}
                  trackType="videoTrack"
                  isVisible
                />
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
    right: TT.dockRightInset + 8,
    zIndex: 18,
  },
  row: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: "center",
  },
  cell: { alignItems: "center" },
  circle: {
    width: TT.guestSize,
    height: TT.guestSize,
    borderRadius: TT.guestSize / 2,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
