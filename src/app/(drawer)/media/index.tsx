import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import axios from "axios";
import LoaderKitView from "react-native-loader-kit";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { useFocusEffect, useRouter } from "expo-router";
import { Post } from "@/types/post";
import { LightMediaTile } from "@/components/posts/LightMediaTile";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const SCREEN_WIDTH = Dimensions.get("window").width;
const POST_MARGIN = 2;

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const router = useRouter();

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
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
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

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
    </View>
  );
}

// -------------------- Styles --------------------
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  },
});
