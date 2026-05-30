import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LightMediaTile } from "@/components/posts/LightMediaTile";
import type { MediaGalleryItem } from "@/utils/mediaGallery";

export const MEDIA_GALLERY_CARD_WIDTH = 118;
export const MEDIA_GALLERY_CARD_HEIGHT = 176;

type Props = {
  item: MediaGalleryItem;
  onPress: () => void;
};

export function MediaGalleryCard({ item, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.poster}>
        <LightMediaTile
          uri={item.uri}
          width={MEDIA_GALLERY_CARD_WIDTH}
          height={MEDIA_GALLERY_CARD_HEIGHT}
          borderRadius={8}
          videoPreviewMs={0}
        />
        {item.isVideo ? (
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
  card: {
    width: MEDIA_GALLERY_CARD_WIDTH,
    marginRight: 10,
  },
  poster: {
    width: MEDIA_GALLERY_CARD_WIDTH,
    height: MEDIA_GALLERY_CARD_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#111",
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  nickname: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
