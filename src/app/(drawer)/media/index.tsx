import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import axios from "axios";
import LoaderKitView from "react-native-loader-kit";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { useFocusEffect, useRouter } from "expo-router";
import { API_PUBLIC_URL } from "@/constants/api";
import { MediaGalleryCard } from "@/components/media/MediaGalleryCard";
import {
  flattenPostsToMediaItems,
  splitMediaGalleryItems,
  type MediaGalleryItem,
} from "@/utils/mediaGallery";

type MediaPost = {
  _id: string;
  media?: string[];
  user?: { nickName?: string; nickname?: string };
};

function MediaGalleryRow({
  title,
  items,
  onPressItem,
  textColor,
}: {
  title: string;
  items: MediaGalleryItem[];
  onPressItem: (item: MediaGalleryItem) => void;
  textColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
        renderItem={({ item }) => (
          <MediaGalleryCard item={item} onPress={() => onPressItem(item)} />
        )}
      />
    </View>
  );
}

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const router = useRouter();

  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMedia = useCallback(
    async (refresh = false) => {
      if (!currentLevel?.type || !currentLevel?.value) return;

      try {
        if (!refresh) setLoading(true);

        const url =
          `${API_PUBLIC_URL}/api/posts/media` +
          `?levelType=${currentLevel.type}` +
          `&levelValue=${currentLevel.value}` +
          `&page=1` +
          `&limit=50`;

        const res = await axios.get<MediaPost[]>(url);
        setMediaPosts(res.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentLevel],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMedia();
    }, [fetchMedia]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia(true);
  };

  const galleryItems = flattenPostsToMediaItems(mediaPosts);
  const { videos, images } = splitMediaGalleryItems(galleryItems);

  const openItem = (item: MediaGalleryItem) => {
    router.push({
      pathname: "/media/[id]",
      params: { id: item.postId },
    });
  };

  const hasMedia = videos.length > 0 || images.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

      <View style={[styles.headerContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Media</Text>
        <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
          Videos and photos from your feed level
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoaderKitView
            style={{ width: 50, height: 50 }}
            name="BallScaleRippleMultiple"
            color={theme.text}
          />
        </View>
      ) : !hasMedia ? (
        <View style={styles.center}>
          <Text style={{ color: theme.subtext }}>No media yet</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
        >
          <MediaGalleryRow
            title="Videos"
            items={videos}
            onPressItem={openItem}
            textColor={theme.text}
          />
          <MediaGalleryRow
            title="Photos"
            items={images}
            onPressItem={openItem}
            textColor={theme.text}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  rowContent: {
    paddingHorizontal: 16,
  },
});
