import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StatusBar,
  RefreshControl,
  FlatList,
} from "react-native";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import { Status } from "@/app/status/Status";
import { useFocusEffect } from "expo-router";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LoaderKitView } from "react-native-loader-kit";
import SAMPLE_STATUSES from "@/assets/data/SampleStatuses.json";
import { Post } from "@/types/post";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { FloatingLevelButton } from "@/modals/LevelFloatingAction";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { PostCard } from "@/app/components/posts/PostCard";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function HomeScreen() {
  const { currentLevel } = useLevel();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // ---------------- FlatList viewability ----------------
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setVisiblePostId(viewableItems[0].item._id);
    }
  }).current;
  const viewabilityConfig = { itemVisiblePercentThreshold: 80 };

  // ---------------- Fetch posts ----------------
  const fetchPosts = useCallback(async () => {
    if (!currentLevel?.type || !currentLevel?.value) {
      console.log("Level not ready yet");
      return;
    }

    setLoading(true);

    try {
      const url = `${BASE_URL}/api/posts?levelType=${currentLevel.type}&levelValue=${currentLevel.value}`;

      const res = await axios.get<Post[]>(url);
      setPosts(res.data ?? []);
    } catch (err) {
      console.error("❌ Error fetching posts:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [currentLevel]);

  useEffect(() => {
    setPosts([]); // 🔥 clear old posts
    setLoading(true); // 🔥 show loader immediately
  }, [currentLevel]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // ---------------- Socket setup ----------------
  useEffect(() => {
    if (!currentLevel?.type || !currentLevel?.value) return;
    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const room = `level-${currentLevel.type}-${currentLevel.value}`;
    socket.emit("joinRoom", room);

    socket.on("newPost", (post) => {
      setPosts((prev) =>
        prev.some((p) => p._id === post._id) ? prev : [post, ...prev],
      );
    });

    socket.on("deletePost", (deletedPostId) => {
      setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    });

    return () => {
      socket.emit("leaveRoom", room);
      socket.disconnect();
    };
  }, [currentLevel]);

  const rawLevelValue =
    typeof currentLevel === "object"
      ? currentLevel?.value
      : (currentLevel ?? "home");

  const levelType =
    typeof currentLevel === "object" ? currentLevel?.type : null;

  // 🔥 Convert "home" → "national"
  const displayValue =
    rawLevelValue?.toLowerCase() === "home"
      ? "national"
      : (rawLevelValue ?? "national");

  const formattedLevel =
    displayValue.charAt(0).toUpperCase() + displayValue.slice(1);

  // ---------------- Render ----------------
  return (
    // <BottomSheetModalProvider>
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <DrawerMenuButton />
      {/* Posts List */}
      <FlatList
        data={posts}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item._id.toString()}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isVisible={visiblePostId === item._id && isFocused}
            socket={socketRef.current}
            allPosts={posts}
            onDeletePost={(postId: any) =>
              setPosts((prev) => prev.filter((p) => p._id !== postId))
            }
          />
        )}
        ListHeaderComponent={
          <>
            <View
              className="px-4 py-2 justify-center items-center mt-8"
              style={{ backgroundColor: theme.background }}
            >
              <Text
                className="font-bold text-2xl"
                style={{ color: theme.text, fontSize: 18, marginTop: 14 }}
              >
                {formattedLevel}
                {levelType && levelType !== "home" ? ` ${levelType}` : ""}
              </Text>
            </View>
            <Status statuses={SAMPLE_STATUSES} />
          </>
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.background}
            colors={[theme.text]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.background,
              }}
            >
              <LoaderKitView
                style={{ width: 50, height: 50 }}
                name="BallScaleRippleMultiple"
                color={theme.text}
              />
              <Text style={{ marginTop: 10, color: theme.text }}>
                Switching to {currentLevel?.value}...
              </Text>
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.subtext }}>No posts yet</Text>
            </View>
          )
        }
      />

      <FloatingLevelButton />
    </View>
  );
}
