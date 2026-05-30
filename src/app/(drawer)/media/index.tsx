<<<<<<< HEAD
import React, { useState, useCallback } from "react";
=======
import React, { useState, useCallback, useRef } from "react";
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
import {
  View,
  Text,
  FlatList,
<<<<<<< HEAD
  StyleSheet,
  RefreshControl,
  ScrollView,
=======
  Pressable,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Animated,
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
} from "react-native";
import axios from "axios";
import LoaderKitView from "react-native-loader-kit";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { useFocusEffect, useRouter } from "expo-router";
<<<<<<< HEAD
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
=======
import { Post } from "@/types/post";
import { LightMediaTile } from "@/components/posts/LightMediaTile";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const SCREEN_WIDTH = Dimensions.get("window").width;
const POST_MARGIN = 2;
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const router = useRouter();

<<<<<<< HEAD
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
=======
  const [mediaPosts, setMediaPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true)
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;
  const levelBtnOpacity = useRef(new Animated.Value(1)).current; // starts visible
  
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    const shouldShow = offsetY > 400;

    setShowScrollTop(shouldShow);

    // 🔥 Fade Top Button
    Animated.timing(scrollTopOpacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // 🔥 Fade FloatingLevelButton (opposite behavior)
    Animated.timing(levelBtnOpacity, {
      toValue: shouldShow ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // ---------------- FlatList viewability ----------------
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setVisiblePostId(viewableItems[0].item._id);
    }
  }).current;
  const viewabilityConfig = { itemVisiblePercentThreshold: 80 };
  // -------------------- Fetch --------------------
  const fetchMedia = useCallback(
    async (pageNumber = 1, refresh = false) => {
      if (!currentLevel?.type || !currentLevel?.value) return;

      try {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        const url =
          `${BASE_URL}/api/posts/media` +
          `?levelType=${currentLevel.type}` +
          `&levelValue=${currentLevel.value}` +
          `&page=${pageNumber}` +
          `&limit=10`;

        const res = await axios.get<Post[]>(url);

        const newPosts = res.data ?? [];

        setHasMore(newPosts.length === 10);

        if (refresh || pageNumber === 1) {
          setMediaPosts(newPosts);
        } else {
          setMediaPosts((prev) => [...prev, ...newPosts]);
        }
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
<<<<<<< HEAD
=======
        setLoadingMore(false);
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
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
<<<<<<< HEAD
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

=======
    fetchMedia();
  };

  const numColumns = 3;
  const ITEM_SIZE =
    (SCREEN_WIDTH - POST_MARGIN * (numColumns * 2)) / numColumns;

  // -------------------- Render Item --------------------
  const renderItem = ({ item }: { item: Post }) => {
    const firstMedia = item.media?.[0];
    if (!firstMedia) return null;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/media/[id]",
            params: { id: item._id },
          })
        }
      >
        <View style={[styles.tileWrap, { width: ITEM_SIZE, height: ITEM_SIZE }]}>
          <LightMediaTile
            uri={firstMedia}
            width={ITEM_SIZE}
            height={ITEM_SIZE}
            borderRadius={10}
          />

          {item.media.length > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.media.length}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // -------------------- UI --------------------
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

<<<<<<< HEAD
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
=======
      {/* HEADER */}
      <View style={[styles.headerContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Media</Text>
      </View>

      {/* GRID */}
      <FlatList
        data={mediaPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={numColumns}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingBottom: 50,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <LoaderKitView
                style={{ width: 50, height: 50 }}
                name="BallScaleRippleMultiple"
                color={theme.text}
              />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={{ color: theme.subtext }}>No media yet</Text>
            </View>
          )
        }
      />
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
    </View>
  );
}

<<<<<<< HEAD
=======
// -------------------- Styles --------------------
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
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
<<<<<<< HEAD
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
=======
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
<<<<<<< HEAD
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
=======
  tileWrap: {
    margin: POST_MARGIN,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  },
});
