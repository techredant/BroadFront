import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { MediaPostStack } from "@/components/media/MediaPostStack";
import type {
  MediaGalleryItem,
  MediaGalleryPostGroup,
} from "@/utils/mediaGallery";

type Props = {
  title?: string;
  groups: MediaGalleryPostGroup[];
  titleColor: string;
  onPressItem: (item: MediaGalleryItem) => void;
};

/** Horizontal row of post stacks; optional section title. */
export function MediaGallerySection({
  title,
  groups,
  titleColor,
  onPressItem,
}: Props) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      ) : null}
      <FlatList
        horizontal
        data={groups}
        keyExtractor={(group) => group.postId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item: group }) => (
          <MediaPostStack group={group} onPressItem={onPressItem} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    paddingHorizontal: 16,
  },
});
