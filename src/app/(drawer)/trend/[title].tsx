import React, { useEffect, useState, useCallback } from "react";
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

const BASE_URL = "https://cast-api-zeta.vercel.app";

type Post = {
  _id: string;
  content?: string;
  caption?: string;
  user?: {
    firstName?: string;
    nickName?: string;
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

  const renderItem = ({ item }: { item: Post }) => (
    <View
      style={{
        padding: 12,
        borderBottomWidth: 0.5,
        borderColor: "#ddd",
      }}
    >
      {/* USER HEADER */}
      <Pressable
        onPress={() => router.push(`/profileId/${item.user?._id}`)}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <Image
          source={{ uri: item.user?.image }}
          style={{ width: 35, height: 35, borderRadius: 18 }}
        />

        <View>
          <Text style={{ fontWeight: "700", color: theme.text }}>
            {item.user?.firstName}
          </Text>
          <Text style={{ fontSize: 12, color: theme.subtext }}>
            {item.user?.nickName}
          </Text>
        </View>
      </Pressable>

      {/* POST CONTENT */}
      <Text style={{ marginTop: 10, color: theme.text }}>
        {item.caption || item.content}
      </Text>
    </View>
  );

  // ✅ loading state (clean UI)
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={"small"} color={theme.text} />
        <Text>Loading trend...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 50 }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            marginLeft: 10,
            color: theme.text,
          }}
        >
          {title}
        </Text>
      </View>

      {/* POSTS */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No posts found for this trend
          </Text>
        }
      />
    </View>
  );
}
