import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";

import {
  View,
  Text,
  Pressable,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";

import axios from "axios";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { FloatingLevelButton } from "@/modals/LevelFloatingAction";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { MemoizedFeedPostRow } from "@/components/posts/FeedPostRow";
import { useUser } from "@clerk/clerk-expo";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { usePushPrompt } from "@/context/PushPromptContext";
import {
  useShowTabBarOnFocus,
  useTabBarScrollHandler,
} from "@/context/TabBarVisibilityContext";
import { MemoizedHomeFeedHeader } from "@/components/home/HomeFeedHeader";
import { setVisibleFeedItems } from "@/utils/feedVisibility";
import { useStatusList } from "@/hooks/useStatusList";

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

  const { statuses } = useStatusList();
  const listRef = useRef<FlashListRef<any>>(null);
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
    setVisibleFeedItems(
      viewableItems
        .map(({ item }: any) => item?._id?.toString())
        .filter(Boolean),
    );
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

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

  const [initialFeedSettled, setInitialFeedSettled] = useState(false);
  useEffect(() => {
    if (loadingPosts) {
      setInitialFeedSettled(false);
      return;
    }

    if (!currentLevel) return;
    const timer = setTimeout(() => setInitialFeedSettled(true), 120);
    return () => clearTimeout(timer);
  }, [currentLevel, loadingPosts]);

  const showFeedPlaceholder =
    posts.length === 0 && (!initialFeedSettled || loadingPosts);
  const listData: any[] = showFeedPlaceholder ? SKELETON_DATA : posts;

  const keyExtractor = useCallback(
    (item: { _id?: string }, index: number) => {
      const id = item?._id?.toString();
      return id ? `post-${id}` : `skeleton-${index}`;
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (showFeedPlaceholder) {
        return <PostCardSkeleton />;
      }
      return (
        <MemoizedFeedPostRow
          post={item}
          allPosts={posts}
          onDeletePost={removePost}
          onUpdatePost={updatePost}
          onPrependPost={prependPost}
          onRemovePost={removePost}
        />
      );
    },
    [
      showFeedPlaceholder,
      posts,
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

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }

    if (!hasMorePosts && posts.length > 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <Text style={{ color: theme.subtext, fontSize: 13 }}>
            You&apos;ve seen it all
          </Text>
        </View>
      );
    }

    return null;
  }, [hasMorePosts, loadingMore, posts.length, theme.primary, theme.subtext]);

  const listEmpty = useMemo(() => {
    if (showFeedPlaceholder) return null;

    return (
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
    );
  }, [showFeedPlaceholder, theme.subtext]);

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

      <FlashList
        ref={listRef}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshing={false}
        onRefresh={refreshFeed}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        drawDistance={900}
        overrideProps={{ initialDrawBatchSize: 4 }}
        contentContainerStyle={{ paddingBottom: 90 }}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
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
