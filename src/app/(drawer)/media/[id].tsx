import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { PostCard } from "@/app/components/posts/PostCard";
import { useIsFocused } from "@react-navigation/native";
import { Socket } from "socket.io-client";
import { useLevel } from "@/context/LevelContext";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function PostId() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { currentLevel } = useLevel();
  const isFocused = useIsFocused();
  const socketRef = useRef<Socket | null>(null);

  // ✅ Fetch ONLY one post
useEffect(() => {
  if (!id || !currentLevel?.type || !currentLevel?.value) return;

  const fetchPost = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${BASE_URL}/api/posts?levelType=${currentLevel.type}&levelValue=${currentLevel.value}`,
      );

      const data = await res.json();
      const list = data.posts || data || [];

      // ✅ find clicked post
      const foundPost = list.find((p: any) => p._id === id);

   

      setPost(foundPost);
    } catch (err) {
      console.log("Failed to fetch post", err);
    } finally {
      setLoading(false);
    }
  };

  fetchPost();
}, [id, currentLevel]);

  

  // ✅ Loader
  if (loading || !post) {
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* HEADER */}
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
            fontSize: 18,
            fontWeight: "700",
            marginLeft: 10,
            color: theme.text,
          }}
        >
          Post 
        </Text>
      </View>

      {/* ✅ SINGLE POST */}
      <PostCard
        post={post}
        isVisible={isFocused}
        socket={socketRef.current}
        allPosts={[post]}
        onRefresh={() => {}}
        onUpdatePost={() => {}}
        onDeletePost={() => router.back()}
      />
    </View>
  );
}
