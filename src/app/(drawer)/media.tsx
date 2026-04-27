import React, { useEffect, useState, useCallback } from "react";
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

export default function MediaScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();

  const [mediaPosts, setMediaPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTab, setSelectedTab] = useState<"images" | "videos">("images");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // -------------------- Modal --------------------
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

  // -------------------- Fetch --------------------
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${BASE_URL}/api/posts`, {
        params: {
          levelType: currentLevel?.type,
          levelValue: currentLevel?.value,
        },
      });

      const allMedia = res.data
        .filter((post: any) => post.media?.length > 0)
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

  // -------------------- Helpers --------------------
  const isVideoFile = (uri: string) => /\.(mp4|mov|webm)$/i.test(uri);

  const images = mediaPosts.filter((m) => !isVideoFile(m));
  const videos = mediaPosts.filter((m) => isVideoFile(m));

  const displayedMedia =
    selectedTab === "images"
      ? images
      : selectedTab === "videos"
        ? videos
        : mediaPosts;

  // 🔥 Dynamic layout
  const numColumns = selectedTab === "videos" ? 2 : 3;

  const ITEM_SIZE =
    (SCREEN_WIDTH - POST_MARGIN * (numColumns * 2)) / numColumns;

  // -------------------- Render --------------------
  const renderItem = ({ item, index }: any) => {
    const isVideo = isVideoFile(item);

    return (
      <Pressable onPress={() => openMedia(index)}>
        {isVideo ? (
          <Video
            source={{ uri: item }}
            style={{
              width: ITEM_SIZE,
              height: ITEM_SIZE * 1.4,
              margin: POST_MARGIN,
              borderRadius: 10,
            }}
            resizeMode="cover"
            controls
            paused={false}
            muted
            repeat
          />
        ) : (
          <Image
            source={{ uri: item }}
            style={{
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              margin: POST_MARGIN,
              borderRadius: 10,
            }}
            resizeMode="cover"
          />
        )}
      </Pressable>
    );
  };

  // -------------------- UI --------------------
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerMenuButton />

      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.card }]}>
        <View style={styles.headerTopRow}>
          <View />

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
            <Text style={styles.countText}>{displayedMedia.length}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: "images", label: `Images (${images.length})` },
            { key: "videos", label: `Videos (${videos.length})` },
          ].map((tab) => {
            const active = selectedTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedTab(tab.key as any)}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: active ? theme.text : theme.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? theme.background : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={displayedMedia}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        numColumns={numColumns}
        key={numColumns} // 🔥 important for layout switch
        contentContainerStyle={{
          paddingBottom: 50,
          backgroundColor: theme.background,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.background}
            colors={[theme.text]}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            {loading ? (
              <LoaderKitView
                style={{ width: 50, height: 50 }}
                name="BallScaleRippleMultiple"
                color={theme.text}
              />
            ) : (
              <Text style={{ color: theme.subtext }}>No media found</Text>
            )}
          </View>
        }
      />

      {/* Modal */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={displayedMedia}
        selectedIndex={selectedIndex}
        post={null}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
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

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#666",
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

  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },

  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 5,
  },
});
