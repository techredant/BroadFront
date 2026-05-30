import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MediaGalleryCard } from "@/components/media/MediaGalleryCard";
import type {
  MediaGalleryItem,
  MediaGalleryGroup,
} from "@/utils/mediaGallery";

type Props = {
  group: MediaGalleryGroup;
  cellWidth: number;
  gap: number;
  onPressItem: (item: MediaGalleryItem) => void;
};

/** Post group grid — count on first tile top-right when more than one item. */
export function MediaPostStack({
  group,
  cellWidth,
  gap,
  onPressItem,
}: Props) {
  const showCount = group.items.length > 1;

  return (
    <View style={[styles.stack, { marginBottom: gap + 4 }]}>
      <View style={[styles.grid, { gap }]}>
        {group.items.map((item, index) => (
          <View
            key={item.id}
            style={[styles.cell, { width: cellWidth }]}
          >
            <MediaGalleryCard
              item={item}
              width={cellWidth}
              hidePlayBadge={showCount && index === 0}
              onPress={() => onPressItem(item)}
            />
            {showCount && index === 0 ? (
              <View style={styles.countOverlay} pointerEvents="none">
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{group.items.length}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    position: "relative",
  },
  countOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
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
