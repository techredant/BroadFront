import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";

import {
  View,
  Text,
  Pressable,
  StatusBar,
  FlatList,
  Animated,
  ActivityIndicator,
} from "react-native";

import axios from "axios";
import { useFocusEffect } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { FloatingLevelButton } from "@/modals/LevelFloatingAction";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { MemoizedFeedPostRow } from "@/app/components/posts/FeedPostRow";
import { useUser } from "@clerk/clerk-expo";
import { PostCardSkeleton } from "@/app/components/PostCardSkeleton";
import { usePushPrompt } from "@/context/PushPromptContext";
import {
  useShowTabBarOnFocus,
  useTabBarScrollHandler,
} from "@/context/TabBarVisibilityContext";
import { MemoizedHomeFeedHeader } from "@/app/components/home/HomeFeedHeader";

const BASE_URL = "https://cast-api-zeta.vercel.app";

const SKELETON_DATA = [{ _id: "sk-0" }, { _id: "sk-1" }, { _id: "sk-2" }, { _id: "sk-3" }, { _id: "sk-4" }];

export default function HomeScreen() {
  const {
    posts,
    currentLevel,
    refreshFeed,
    loadMore,
    loadingPosts,
    loadingMore,
    hasMorePosts,
    removePost,
    updatePost,
    prependPost,
  } = useLevel();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { notifyUserEngaged } = usePushPrompt();
  const onTabBarScroll = useTabBarScrollHandler();
  useShowTabBarOnFocus();

  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const listRef = useRef<FlatList>(null);
  const lastPrependedId = useRef<string | null>(null);
  const showScrollTopRef = useRef(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  const handleScroll = useCallback(
    (event: any) => {
      onTabBarScroll(event);
      const offsetY = event.nativeEvent.contentOffset.y;

      if (offsetY > 24) {
        notifyUserEngaged();
      }

      const shouldShow = offsetY > 400;
      if (shouldShow === showScrollTopRef.current) return;

      showScrollTopRef.current = shouldShow;
      setShowScrollTop(shouldShow);

      Animated.timing(scrollTopOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    },
    [notifyUserEngaged, onTabBarScroll, scrollTopOpacity],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const id = viewableItems[0]?.item?._id;
    if (!id) return;
    setVisiblePostId((prev) => (prev === id ? prev : id));
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/status`);
      setStatuses(res.data);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, [fetchStatuses]),
  );

  useEffect(() => {
    const firstId = posts[0]?._id;
    if (!firstId || firstId === lastPrependedId.current) return;
    if (String(firstId).startsWith("temp-")) {
      lastPrependedId.current = firstId;
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
  }, [posts]);

  const rawLevelValue =
    typeof currentLevel === "object" ? currentLevel?.value : "home";

  const levelType =
    typeof currentLevel === "object" ? currentLevel?.type : null;

  const displayValue =
    (rawLevelValue?.toLowerCase() === "home" ? "national" : rawLevelValue) ||
    "national";

  const formattedLevel =
    displayValue.charAt(0).toUpperCase() + displayValue.slice(1);

  const showInitialSkeleton = loadingPosts && posts.length === 0;
  const listData: any[] = showInitialSkeleton ? SKELETON_DATA : posts;

  const keyExtractor = useCallback(
    (item: { _id?: string }, index: number) => {
      const id = item?._id?.toString();
      return id ? `post-${id}` : `skeleton-${index}`;
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (showInitialSkeleton) {
        return <PostCardSkeleton />;
      }
      return (
        <MemoizedFeedPostRow
          post={item}
          isVisible={visiblePostId === item._id}
          onDeletePost={removePost}
          onUpdatePost={updatePost}
          onPrependPost={prependPost}
          onRemovePost={removePost}
        />
      );
    },
    [
      showInitialSkeleton,
      visiblePostId,
      removePost,
      updatePost,
      prependPost,
    ],
  );

  const listHeader = useMemo(
    () => (
      <MemoizedHomeFeedHeader
        formattedLevel={formattedLevel}
        levelType={levelType ?? null}
        theme={theme}
        statuses={statuses}
        currentUserId={user?.id}
      />
    ),
    [formattedLevel, levelType, theme, statuses, user?.id],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <DrawerMenuButton />

      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={visiblePostId}
        refreshing={false}
        onRefresh={refreshFeed}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 90 }}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : !hasMorePosts && posts.length > 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: theme.subtext, fontSize: 13 }}>
                You&apos;ve seen it all
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !showInitialSkeleton ? (
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 48,
                paddingBottom: 48,
                paddingHorizontal: 24,
              }}
            >
              <Text
                style={{
                  color: theme.subtext,
                  fontSize: 15,
                  textAlign: "center",
                }}
              >
                No posts at the moment
              </Text>
            </View>
          ) : null
        }
      />

      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 160,
          right: 20,
          opacity: scrollTopOpacity,
        }}
      >
        <Pressable
          onPress={scrollToTop}
          style={{
            backgroundColor: "#1F2937",
            padding: 12,
            borderRadius: 30,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>↑ Top</Text>
        </Pressable>
      </Animated.View>

      <FloatingLevelButton />
    </View>
  );
}
