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
  Image,
  Animated,
} from "react-native";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import { Status } from "@/app/(drawer)/(status)/Status";
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
  const [loading, setLoading] = useState(true);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;
  const levelBtnOpacity = useRef(new Animated.Value(1)).current; // starts visible

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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

  // ---------------- Fetch posts ----------------
  const fetchPosts = useCallback(
    async (pageNumber = 1, refresh = false) => {
      if (!currentLevel?.type || !currentLevel?.value) return;

      try {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        const url =
          `${BASE_URL}/api/posts` +
          `?levelType=${currentLevel.type}` +
          `&levelValue=${currentLevel.value}` +
          `&page=${pageNumber}` +
          `&limit=5`;

        const res = await axios.get<Post[]>(url);

        const newPosts = res.data ?? [];

        setHasMore(newPosts.length === 5);

        if (refresh || pageNumber === 1) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
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

  useEffect(() => {
    setPage(1);
    fetchPosts(1, true);
  }, [currentLevel]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts]),
  );

  const loadMore = () => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;

    setPage(nextPage);

    fetchPosts(nextPage);
  };

  const fetchStatuses = async () => {
    const res = await axios.get(`${BASE_URL}/api/status`);
    setStatuses(res.data);
  };

  useEffect(() => {
    fetchStatuses(); // initial load

    const interval = setInterval(() => {
      fetchStatuses();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    fetchPosts();
  }, [fetchPosts]);

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

    socket.on("postUpdated", (updatedPost) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)),
      );
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
  // {
  //   loading && posts.length === 0 && (
  //     <View
  //       style={{
  //         position: "absolute",
  //         top: "50%",
  //         left: 0,
  //         right: 0,
  //         alignItems: "center",
  //         zIndex: 10,
  //       }}
  //     >
  //       <LoaderKitView
  //         style={{ width: 50, height: 50 }}
  //         name="BallScaleRippleMultiple"
  //         color={theme.text}
  //       />
  //     </View>
  //   );
  // }

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
        ref={listRef}
        onScroll={handleScroll}
        data={posts}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item._id.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={16}
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
        ListHeaderComponent={
          <>
            <View />

            <View
              className="px-4 py-2 mt-8"
              style={{
                backgroundColor: theme.background,
                justifyContent: "center",
              }}
            >
              {/* Centered Text */}
              <Text
                className="font-bold text-2xl"
                style={{
                  color: theme.text,
                  fontSize: 18,
                  textAlign: "center",
                  position: "absolute",
                  alignSelf: "center",
                }}
              >
                {formattedLevel}
                {levelType && levelType !== "home" ? ` ${levelType}` : ""}
              </Text>

              {/* Right Image */}
              <Image
                source={require("../../../../assets/images/icon.jpg")}
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 50,
                  alignSelf: "flex-end",
                }}
              />
            </View>

            <Status statuses={statuses} />
          </>
        }
        ListFooterComponent={
          loadingMore ? (
            <LoaderKitView
              style={{ width: 40, height: 40, alignSelf: "center" }}
              name="BallScaleRippleMultiple"
              color={theme.text}
            />
          ) : null
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.background,
              paddingTop: 100,
            }}
          >
            {loading ? (
              <Text> </Text>
            ) : (
              <Text style={{ color: theme.subtext }}>No posts yet</Text>
            )}
          </View>
        }
      />
      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 60,
          right: 20,
          opacity: scrollTopOpacity,
          transform: [
            {
              translateY: scrollTopOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0], // slight slide up effect
              }),
            },
          ],
        }}
      >
        <Pressable
          onPress={() =>
            listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }
          style={{
            backgroundColor: "#1F2937",
            padding: 12,
            borderRadius: 30,
            elevation: 5,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>↑ Top</Text>
        </Pressable>
      </Animated.View>

      <FloatingLevelButton />
    </View>
  );
}
