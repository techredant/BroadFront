import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LightMediaTile } from "@/components/posts/LightMediaTile";
import type { MediaGalleryItem } from "@/utils/mediaGallery";

export const MEDIA_GALLERY_CARD_WIDTH = 118;
export const MEDIA_GALLERY_CARD_HEIGHT = 176;

type Props = {
  item: MediaGalleryItem;
  onPress: () => void;
  width?: number;
  square?: boolean;
  hidePlayBadge?: boolean;
};

export function MediaGalleryCard({
  item,
  onPress,
  width = MEDIA_GALLERY_CARD_WIDTH,
  square = false,
  hidePlayBadge = false,
}: Props) {
  const height = square
    ? width
    : Math.round(width * (MEDIA_GALLERY_CARD_HEIGHT / MEDIA_GALLERY_CARD_WIDTH));
  const isVideo = item.kind === "video";
  const isAudio = item.kind === "audio";

  return (
    <Pressable onPress={onPress} style={[styles.card, { width }]}>
      <View style={[styles.poster, { width, height }]}>
        {isAudio ? (
          <LinearGradient
            colors={["#1a1a2e", "#16213e", "#0f3460"]}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.audioCenter}>
              <View style={styles.audioIconWrap}>
                <Ionicons name="musical-notes" size={28} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        ) : (
          <LightMediaTile
            uri={item.uri}
            width={width}
            height={height}
            borderRadius={8}
            videoPreviewMs={0}
          />
        )}
        {isVideo && !hidePlayBadge ? (
          <View style={styles.playBadge} pointerEvents="none">
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        ) : null}
        <View style={styles.nicknameOverlay} pointerEvents="none">
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  poster: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  audioCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  audioIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  nicknameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  nickname: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
