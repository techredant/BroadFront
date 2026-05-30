import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MediaGalleryCard } from "@/components/media/MediaGalleryCard";
import type {
  MediaGalleryItem,
  MediaGalleryGroup,
} from "@/utils/mediaGallery";

type Props = {
  group: MediaGalleryGroup;
  size: number;
  onPressItem: (item: MediaGalleryItem) => void;
};

/** One cover tile per post; count top-right when the post has multiple items. */
export function MediaGalleryTile({ group, size, onPressItem }: Props) {
  const cover = group.items[0];
  if (!cover) return null;

  const showCount = group.items.length > 1;

  return (
    <View style={[styles.cell, { width: size }]}>
      <MediaGalleryCard
        item={cover}
        width={size}
        square
        hidePlayBadge={showCount}
        onPress={() => onPressItem(cover)}
      />
      {showCount ? (
        <View style={styles.countOverlay} pointerEvents="none">
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{group.items.length}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: "relative",
  },
  countOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
