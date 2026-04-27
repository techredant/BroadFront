import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { PostCard } from "@/app/components/posts/PostCard";
import { useIsFocused } from "@react-navigation/native";
import { Socket } from "socket.io-client";

const BASE_URL = "https://cast-api-zeta.vercel.app";

type Post = {
  _id: string;
  content?: string;
  caption?: string;
  user?: {
    firstName?: string;
    nickName?: string;
    lastName?: string;
    image?: string;
    _id?: string;
  };
};

export default function TrendFeed() {
  const { title, keyword } = useLocalSearchParams();
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

   const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setVisiblePostId(viewableItems[0].item._id);
      }
    }).current;
  const viewabilityConfig = { itemVisiblePercentThreshold: 80 };

  const cleanKeyword = String(keyword || title)
    .replace("#", "")
    .toLowerCase();

  // ✅ FIX: useCallback prevents infinite loop
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      const url = `${BASE_URL}/api/posts?levelType=${currentLevel?.type}&levelValue=${currentLevel?.value}`;

      const res = await fetch(url);
      const data = await res.json();

      const list = data.posts || data || [];

      const filtered = list.filter((post: Post) =>
        (post.caption || post.content || "")
          .toLowerCase()
          .includes(cleanKeyword),
      );

      setPosts(filtered);
    } catch (err) {
      console.log("Failed to fetch trend posts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanKeyword, currentLevel]);

  // ✅ FIX: proper dependency
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // ✅ loading state (clean UI)
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size={"small"} color={theme.text} />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, paddingTop: 20, backgroundColor: theme.background }}
    >
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 20 }}>
          <Ionicons name="arrow-back" size={30} color={theme.text} />
        </Pressable>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            marginLeft: 30,
            color: theme.text,
            marginBottom: 10,
          }}
        >
          {title}
        </Text>
      </View>

      {/* POSTS */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isVisible={visiblePostId === item._id && isFocused}
            socket={socketRef.current}
            allPosts={posts}
            onRefresh={onRefresh}
            onUpdatePost={(updatedPost: { _id: any }) => {
              setPosts((prev) =>
                prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)),
              );
            }}
            onDeletePost={(postId: any) =>
              setPosts((prev) => prev.filter((p) => p._id !== postId))
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No posts found for this trend
          </Text>
        }
      />
    </View>
  );
}
