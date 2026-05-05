import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import axios from "axios";
import Video from "react-native-video";
import LoaderKitView from "react-native-loader-kit";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../../components/Button/DrawerMenuButton";
import { useFocusEffect, useRouter } from "expo-router";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const SCREEN_WIDTH = Dimensions.get("window").width;
const POST_MARGIN = 2;

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const router = useRouter();

  const [mediaPosts, setMediaPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------- Fetch --------------------
  const fetchMedia = useCallback(async () => {
    // 🚫 wait for level
    if (!currentLevel?.type || !currentLevel?.value) {
      console.log("Level not ready yet");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${BASE_URL}/api/posts`, {
        params: {
          levelType: currentLevel.type,
          levelValue: currentLevel.value,
        },
      });

      const posts = res.data.posts || res.data || [];

      // ✅ GROUPED POSTS (no flatMap)
      const grouped = posts.filter(
        (post: any) => post.media && post.media.length > 0,
      );

      setMediaPosts(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLevel]);

  useFocusEffect(
    useCallback(() => {
      fetchMedia();
    }, [fetchMedia]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  // -------------------- Helpers --------------------
  const isVideoFile = (uri: string) => /\.(mp4|mov|webm)$/i.test(uri);

  const numColumns = 3;
  const ITEM_SIZE =
    (SCREEN_WIDTH - POST_MARGIN * (numColumns * 2)) / numColumns;

  // -------------------- Render Item --------------------
  const renderItem = ({ item }: any) => {
    const firstMedia = item.media[0];
    const isVideo = isVideoFile(firstMedia);

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/media/[id]", // ✅ FIXED route
            params: { id: item._id },
          })
        }
      >
        <View>
          {isVideo ? (
            <View
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                margin: POST_MARGIN,
                borderRadius: 10,
                backgroundColor: "#000",
              }}
            >
              <Video
                source={{ uri: firstMedia }}
                resizeMode="cover"
                muted
                repeat
                paused
              />
            </View>
          ) : (
            <Image
              source={{ uri: firstMedia }}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                margin: POST_MARGIN,
                borderRadius: 10,
              }}
              resizeMode="cover"
            />
          )}

          {/* 🔥 MULTI MEDIA COUNT BADGE */}
          {item.media.length > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.media.length}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // -------------------- UI --------------------
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

      {/* HEADER */}
      <View style={[styles.headerContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Media</Text>
      </View>

      {/* GRID */}
      <FlatList
        data={mediaPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={numColumns}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingBottom: 50,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <LoaderKitView
                style={{ width: 50, height: 50 }}
                name="BallScaleRippleMultiple"
                color={theme.text}
              />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={{ color: theme.subtext }}>No media yet</Text>
            </View>
          )
        }
      />
    </View>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
