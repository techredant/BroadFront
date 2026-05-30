import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  AppState,
} from "react-native";
import axios from "axios";
import LoaderKitView from "react-native-loader-kit";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { useFocusEffect, useRouter } from "expo-router";
import {
  API_PUBLIC_URL,
  HOSTED_FEED_REFRESH_MS,
  SOCKET_IO_DISABLED_ON_HOST,
} from "@/constants/api";
import { MediaGalleryTile } from "@/components/media/MediaGalleryTile";
import {
  countMediaItemsInGroups,
  groupMediaItemsByPost,
  mergeMediaPosts,
  sortMediaPostsNewestFirst,
  type MediaGalleryItem,
  type MediaGalleryGroup,
} from "@/utils/mediaGallery";
import { fetchRemovedPostIds, filterRemovedPosts } from "@/utils/postVisibility";
import type { MediaKind } from "@/utils/mediaUtils";

type MediaPost = {
  _id: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  media?: string[];
  user?: { clerkId?: string; nickName?: string; nickname?: string };
};

type MediaTab = "videos" | "audio" | "images";

const TABS: { key: MediaTab; label: string; kind: MediaKind }[] = [
  { key: "videos", label: "Videos", kind: "video" },
  { key: "audio", label: "Audio", kind: "audio" },
  { key: "images", label: "Images", kind: "image" },
];

const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const HORIZONTAL_PADDING = 2;

export default function MediaScreen() {
  const { currentLevel, posts: feedPosts } = useLevel();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const cellSize =
    (screenWidth -
      HORIZONTAL_PADDING * 2 -
      GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS;

  const levelKey = `${currentLevel?.type ?? ""}-${currentLevel?.value ?? ""}`;
  const levelKeyRef = useRef(levelKey);
  const fetchSeqRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<MediaTab>("videos");
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const feedMediaPosts = useMemo((): MediaPost[] => {
    const withMedia = feedPosts
      .map((post) => post as unknown as MediaPost)
      .filter((post) => (post.media?.length ?? 0) > 0);
    return sortMediaPostsNewestFirst(withMedia);
  }, [feedPosts]);

  const allMediaPosts = useMemo(
    () => mergeMediaPosts(mediaPosts, feedMediaPosts),
    [mediaPosts, feedMediaPosts],
  );

  useEffect(() => {
    if (levelKeyRef.current === levelKey) return;
    levelKeyRef.current = levelKey;
    hasLoadedRef.current = false;
    fetchSeqRef.current += 1;
    setMediaPosts([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
  }, [levelKey]);

  const fetchMedia = useCallback(
    async (pageNumber = 1, refresh = false) => {
      if (!currentLevel?.type || !currentLevel?.value) return;

      const fetchId = ++fetchSeqRef.current;

      try {
        if (pageNumber === 1 && !refresh && !hasLoadedRef.current) {
          setLoading(true);
        } else if (pageNumber > 1) {
          setLoadingMore(true);
        }

        const url =
          `${API_PUBLIC_URL}/api/posts/media` +
          `?levelType=${currentLevel.type}` +
          `&levelValue=${currentLevel.value}` +
          `&page=${pageNumber}` +
          `&limit=20`;

        const res = await axios.get<MediaPost[]>(url);
        if (fetchId !== fetchSeqRef.current) return;

        const newPosts = sortMediaPostsNewestFirst(res.data ?? []);
        setHasMore(newPosts.length === 20);

        const applyMerged = (merged: MediaPost[]) => {
          void fetchRemovedPostIds(merged.map((post) => String(post._id ?? ""))).then(
            (removedIds) => {
              if (fetchId !== fetchSeqRef.current) return;
              setMediaPosts(filterRemovedPosts(merged, removedIds));
            },
          );
        };

        if (pageNumber === 1) {
          hasLoadedRef.current = true;
          setMediaPosts((prev) => {
            const merged = mergeMediaPosts(prev, newPosts);
            applyMerged(merged);
            return merged;
          });
          setPage(1);
        } else {
          setMediaPosts((prev) => {
            const merged = mergeMediaPosts(prev, newPosts);
            applyMerged(merged);
            return merged;
          });
          setPage(pageNumber);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (fetchId === fetchSeqRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [currentLevel],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMedia(1);
    }, [fetchMedia]),
  );

  useEffect(() => {
    if (!SOCKET_IO_DISABLED_ON_HOST || !currentLevel?.type || !currentLevel?.value) {
      return;
    }

    let appState = AppState.currentState;
    let syncing = false;

    const syncMedia = () => {
      if (appState !== "active" || syncing) return;
      syncing = true;
      fetchMedia(1, true).finally(() => {
        syncing = false;
      });
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      appState = nextState;
      if (nextState === "active") syncMedia();
    });

    const interval = setInterval(syncMedia, HOSTED_FEED_REFRESH_MS);
    syncMedia();

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [currentLevel?.type, currentLevel?.value, fetchMedia]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    fetchMedia(page + 1);
  };

  const tabGroups = useMemo(
    () => ({
      videos: groupMediaItemsByPost(allMediaPosts, "video"),
      audio: groupMediaItemsByPost(allMediaPosts, "audio"),
      images: groupMediaItemsByPost(allMediaPosts, "image"),
    }),
    [allMediaPosts],
  );

  const activeGroups = tabGroups[activeTab];

  const openItem = (item: MediaGalleryItem) => {
    const post = allMediaPosts.find((p) => p._id === item.postId);
    router.push({
      pathname: "/media/[id]",
      params: {
        id: item.postId,
        ...(post ? { initialPost: JSON.stringify(post) } : {}),
      },
    });
  };

  const emptyLabel =
    activeTab === "videos"
      ? "No videos yet"
      : activeTab === "audio"
        ? "No audio yet"
        : "No images yet";

  const showInitialLoader = loading && allMediaPosts.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

      <View style={[styles.headerContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Media</Text>
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.card,
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          const count = countMediaItemsInGroups(tabGroups[tab.key]);
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                selected && {
                  borderBottomColor: theme.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: selected ? theme.text : theme.subtext },
                  selected && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 ? (
                <Text style={[styles.tabCount, { color: theme.subtext }]}>
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {showInitialLoader ? (
        <View style={styles.center}>
          <LoaderKitView
            style={{ width: 50, height: 50 }}
            name="BallScaleRippleMultiple"
            color={theme.text}
          />
        </View>
      ) : (
        <FlatList
          key={activeTab}
          numColumns={GRID_COLUMNS}
          data={activeGroups}
          keyExtractor={(group: MediaGalleryGroup) => group.groupId}
          columnWrapperStyle={styles.column}
          contentContainerStyle={[
            styles.listContent,
            activeGroups.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.subtext }}>{emptyLabel}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.loadMore}
                color={theme.text}
              />
            ) : null
          }
          renderItem={({ item: group }) => (
            <MediaGalleryTile
              group={group}
              size={cellSize}
              onPressItem={openItem}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  tabCount: {
    fontSize: 11,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: GRID_GAP,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  column: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  loadMore: {
    marginVertical: 16,
  },
});
