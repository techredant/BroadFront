import React, { useRef, useState, useEffect, useCallback } from "react";

import { View, Text, StatusBar, RefreshControl, FlatList } from "react-native";

import axios from "axios";
import io, { Socket } from "socket.io-client";


import { useIsFocused } from "@react-navigation/native";

import { LoaderKitView } from "react-native-loader-kit";

import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";

import { FloatingLevelButton } from "@/modals/LevelFloatingAction";
import { PostCard } from "@/app/components/posts/PostCard";
import { LevelHeader } from "@/app/components/level/NewsHeader";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

const BASE_URL = "https://cast-api-zeta.vercel.app";

interface Post {
  _id: string;
  text: string;
  images?: string[];
  createdAt: string;
  likes: number;
  commentsCount: number;
  views: number;
  accountType: string;
  user: {
    accountType: string;
  };
}

export default function NewsScreen() {
  const { currentLevel, isLoadingUser } = useLevel();
  const { theme, isDark } = useTheme();

  const isFocused = useIsFocused();

  const socketRef = useRef<Socket | null>(null);

  const [news, setNews] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);

  /* ---------------- Viewability ---------------- */

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setVisiblePostId(viewableItems[0].item._id);
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
  };

  /* ---------------- Fetch News ---------------- */

  const fetchNews = useCallback(async () => {
    if (!currentLevel?.type || !currentLevel?.value) return;

    setLoading(true);

    try {
      const res = await axios.get(`${BASE_URL}/api/posts`, {
        params: {
          levelType: currentLevel.type,
          levelValue: currentLevel.value,
        },
      });

      const filteredNews = res.data.filter(
        (item: Post) => item.user.accountType !== "Personal Account",
      );

      setNews(filteredNews);
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLevel?.type, currentLevel?.value]);

  /* ---------------- Initial Load ---------------- */

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  /* ---------------- Pull To Refresh ---------------- */

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  /* ---------------- Socket Setup ---------------- */

  useEffect(() => {
    if (!currentLevel?.type || !currentLevel?.value) return;

    socketRef.current?.disconnect();

    const socket = io(BASE_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const room = `level-${currentLevel.type}-${currentLevel.value}`;

    socket.emit("joinRoom", room);

    socket.on("newPost", (post: Post) => {
      if (post.accountType !== "Personal Account") return;

      setNews((prev) => {
        if (prev.find((p) => p._id === post._id)) return prev;
        return [post, ...prev];
      });
    });

    socket.on("deletePost", (deletedPostId: string) => {
      setNews((prev) => prev.filter((p) => p._id !== deletedPostId));
    });

    return () => {
      socket.emit("leaveRoom", room);
      socket.disconnect();
    };
  }, [currentLevel]);

  /* ---------------- Render Post ---------------- */

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      return (
        <PostCard
          post={item}
          isVisible={visiblePostId === item._id && isFocused}
          socket={socketRef.current}
          allPosts={news}
          onDeletePost={(postId: string) =>
            setNews((prev) => prev.filter((p) => p._id !== postId))
          }
        />
      );
    },
    [visiblePostId, isFocused, news],
  );

  /* ---------------- Render ---------------- */

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <FlatList
        data={news}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        ListHeaderComponent={<LevelHeader />}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.background}
            colors={[theme.text]}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            {loading || isLoadingUser ? (
              <>
                <LoaderKitView
                  style={{ width: 50, height: 50 }}
                  name="BallScaleRippleMultiple"
                  animationSpeedMultiplier={1}
                  color={theme.text}
                />

                <Text style={{ marginTop: 16, color: theme.text }}>
                  Loading {currentLevel?.value} news...
                </Text>
              </>
            ) : (
              <Text style={{ color: theme.subtext }}>
                No news for this level yet
              </Text>
            )}
          </View>
        }
      />

      <FloatingLevelButton />
    </View>
  );
}
