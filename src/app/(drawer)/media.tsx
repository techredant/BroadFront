// media.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import axios from "axios";
import Video from "react-native-video";
import LoaderKitView from "react-native-loader-kit";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";
import { MediaViewerModal } from "../components/posts/MediaViewModal";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const SCREEN_WIDTH = Dimensions.get("window").width;
const POST_MARGIN = 2;
const NUM_COLUMNS = 3;
const POST_SIZE =
  (SCREEN_WIDTH - POST_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS;

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const [mediaPosts, setMediaPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------- Media Modal --------------------
  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const pinchScale = useSharedValue(1);
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1);
    });
  const pinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinchScale.value }],
  }));

  // ------

  // Fetch media posts based on currentLevel
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}/api/posts`;
      const res = await axios.get(url, {
        params: {
          levelType: currentLevel?.type,
          levelValue: currentLevel?.value,
        },
      });

      // Flatten media from posts
      const allMedia = res.data
        .filter((post: any) => post.media && post.media.length > 0)
        .flatMap((post: any) => post.media);

      setMediaPosts(allMedia);
    } catch (err) {
      console.error("❌ Error fetching media:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);

    }
  }, [currentLevel]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const isVideo = item.endsWith(".mp4") || item.endsWith(".mov");

    return (
      <Pressable onPress={() => openMedia(index)}>
        {isVideo ? (
          <Video
            source={{ uri: item }}
            style={styles.postImage}
            resizeMode="cover"
            repeat
            paused={false}
            muted
          />
        ) : (
          <Image source={{ uri: item }} style={styles.postImage} />
        )}
      </Pressable>
    );
  };

  // if (loading) {
  //   return (
  //     <View style={[styles.loader, { backgroundColor: theme.background }]}>
  //       <ActivityIndicator size="large" color="#1DA1F2" />
  //       <Text>Loading media...</Text>
  //     </View>
  //   );
  // }

  return (
    <>
      <DrawerMenuButton />
      <FlatList
        data={mediaPosts}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{
          paddingBottom: 50,
          backgroundColor: theme.background,
          flex: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.background}
            colors={[theme.text]}
          />
        }
        ListHeaderComponent={
          <View
            style={[styles.headerContainer, { backgroundColor: theme.card }]}
          >
            <View style={styles.headerTopRow}>
              <View></View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Media
                </Text>
                <Text style={styles.headerSubtitle}>
                  {currentLevel?.value?.charAt(0).toUpperCase() +
                    currentLevel?.value?.slice(1)}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{mediaPosts.length}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              // marginTop: 60,
            }}
          >
            {loading ? (
              <>
                <LoaderKitView
                  style={{ width: 50, height: 50 }}
                  name="BallScaleRippleMultiple"
                  animationSpeedMultiplier={1.0}
                  color={theme.text}
                />
                <Text style={{ marginTop: 16, color: theme.text }}>
                  Loading {currentLevel?.value} posts...
                </Text>
              </>
            ) : (
              <Text style={{ color: theme.subtext }}>
                No posts for this level yet
              </Text>
            )}
          </View>
        }
      />
      {/* Media Modal */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={mediaPosts}
        selectedIndex={selectedIndex}
        post={null}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  postImage: {
    width: POST_SIZE,
    height: POST_SIZE,
    margin: POST_MARGIN,
    borderRadius: 8,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 40, // space for DrawerMenuButton
    paddingBottom: 16,
    backgroundColor: "#fff",
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  countBadge: {
    backgroundColor: "#1DA1F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  countText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 16,
  },
});
