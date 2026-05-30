import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import axios from "axios";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { PostCard } from "@/components/posts/PostCard";
import { useIsFocused } from "@react-navigation/native";
import { Socket } from "socket.io-client";
import { API_PUBLIC_URL } from "@/constants/api";

function parseInitialPost(raw?: string | string[]) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function PostId() {
  const { id, initialPost } = useLocalSearchParams<{
    id?: string;
    initialPost?: string;
  }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const cachedPost = parseInitialPost(initialPost);
  const { theme } = useTheme();
  const [post, setPost] = useState<any>(cachedPost);
  const [loading, setLoading] = useState(!cachedPost);
  const [notFound, setNotFound] = useState(false);
  const isFocused = useIsFocused();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;

    const fetchPost = async () => {
      try {
        if (!cachedPost) setLoading(true);
        setNotFound(false);

        const res = await axios.get(
          `${API_PUBLIC_URL}/api/posts/item/${postId}`,
        );
        if (!cancelled) setPost(res.data);
      } catch (err) {
        console.log("Failed to fetch post", err);
        if (!cancelled && !cachedPost) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [postId, cachedPost]);

  if (loading && !post) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  if (!post || notFound) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: 20,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 12 }}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </Pressable>
        <Text
          style={{
            textAlign: "center",
            marginTop: 40,
            color: theme.subtext,
          }}
        >
          Post not found
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 20,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </Pressable>

        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            marginLeft: 10,
            color: theme.text,
          }}
        >
          Post
        </Text>
      </View>

      <PostCard
        post={post}
        isVisible={isFocused}
        socket={socketRef.current}
        allPosts={[post]}
        onRefresh={() => {}}
        onUpdatePost={setPost}
        onDeletePost={() => router.back()}
      />
    </View>
  );
}
