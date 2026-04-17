import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Pressable,
  Dimensions,
  RefreshControl,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { useLevel } from "@/context/LevelContext";
import { useUserContext } from "@/context/FollowContext";
import { useTheme } from "@/context/ThemeContext";
import Video from "react-native-video";
import { io, Socket } from "socket.io-client";
import { MediaViewerModal } from "@/app/components/posts/MediaViewModal";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

const BASE_URL = "https://cast-api-zeta.vercel.app";

const SCREEN_WIDTH = Dimensions.get("window").width;
const POST_MARGIN = 2;
const NUM_COLUMNS = 3;
const POST_SIZE =
  (SCREEN_WIDTH - POST_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS;

export default function ProfileScreen() {
  const { members, toggleFollow } = useUserContext();
  const { userDetails, isLoadingUser, currentLevel } = useLevel();
  const { theme } = useTheme();

  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
  

  const socketRef = useRef<Socket | null>(null);

  const [activeTab, setActiveTab] = useState<
    "posts" | "followers" | "following"
  >("posts");

  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  /* ---------------- FOLLOW DATA ---------------- */
  const followersData = members.filter((m) =>
    m.followers?.includes(userDetails?.clerkId),
  );
  const followingData = members.filter((m) => m.isFollowing);



  const getData = () => {
    if (activeTab === "posts") return mediaPosts;
    if (activeTab === "followers") return followersData;
    if (activeTab === "following") return followingData;
    return [];
  };

  /* ---------------- FETCH POSTS ---------------- */
  // Fetch media posts based on currentLevel
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      const url = `${BASE_URL}/api/posts/${userDetails.clerkId}`;
      const res = await axios.get(url, {
        params: {
          levelType: currentLevel?.type,
          levelValue: currentLevel?.value,
        },
      });

      setPosts(res.data);
    } catch (err) {
      console.error("❌ Error fetching media:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);

    }
  }, [currentLevel, userDetails?.clerkId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

const mediaPosts = useMemo(() => {
  const result = posts.filter((p) => p.media?.length).flatMap((p) => p.media);

  console.log("🖼 mediaPosts computed:", result);

  return result;
}, [posts]);


  /* ---------------- REALTIME SOCKET ---------------- */
  useEffect(() => {
    if (!userDetails?.clerkId) return;

    const socket = io(BASE_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const handleNewPost = (post: any) => {
      if (post.userId === userDetails.clerkId) {
        setPosts((prev) => {
          if (prev.find((p) => p._id === post._id)) return prev;
          return [post, ...prev];
        });
      }
    };

    const handleDeletePost = (postId: string) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };

    socket.on("newPost", handleNewPost);
    socket.on("deletePost", handleDeletePost);

    return () => {
      socket.off("newPost", handleNewPost);
      socket.off("deletePost", handleDeletePost);
      socket.disconnect();
    };
  }, [userDetails?.clerkId]);

  /* ---------------- PINCH ---------------- */
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  if (isLoadingUser) {
    return (
      <View style={styles.center}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  /* ---------------- RENDER ---------------- */
  const renderItem = ({ item, index }: any) => {
    if (activeTab === "posts") {
      const isVideo = item.endsWith(".mp4") || item.endsWith(".mov");

      return (
        <Pressable onPress={() => openMedia(index)}>
          {isVideo ? (
            <Video
              source={{ uri: item }}
              style={styles.postImage}
              resizeMode="cover"
              repeat
              muted
            />
          ) : (
            <Image source={{ uri: item }} style={styles.postImage} />
          )}
        </Pressable>
      );
    }

    return (
      <View style={[styles.userRow, { backgroundColor: theme.background }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={{ uri: item?.image }} style={styles.userAvatar} />
          <Text style={styles.userName}>
            {item.firstName
              ? `${item.firstName} ${item.lastName}`
              : item.companyName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => toggleFollow(item)}
          style={[
            styles.followButton,
            {
              backgroundColor: item.isFollowing ? "#fff" : "#1DA1F2",
              borderWidth: item.isFollowing ? 1 : 0,
              borderColor: "#1DA1F2",
            },
          ]}
        >
          <Text
            style={{
              color: item.isFollowing ? "#1DA1F2" : "#fff",
              fontWeight: "bold",
            }}
          >
            {item.isFollowing ? "Unfollow" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerMenuButton />
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              userDetails?.image?.trim() || "https://i.pravatar.cc/150?img=32",
          }}
          style={styles.avatar}
        />

        <View style={styles.bio}>
          <Text style={[styles.name, { color: theme.text }]}>
            {userDetails?.firstName}
          </Text>
          <Text style={styles.username}>@{userDetails?.nickName}</Text>
        </View>

        <View style={styles.stats}>
          {["posts", "followers", "following"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={styles.statItem}
            >
              <Text style={styles.statNumber}>
                {tab === "posts"
                  ? mediaPosts.length
                  : tab === "followers"
                    ? followersData.length
                    : followingData.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  activeTab === tab && styles.activeLabel,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CONTENT */}
      <FlatList
        data={getData()}
        key={activeTab}
        numColumns={activeTab === "posts" ? 3 : 1}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
              refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.background}
                    colors={[theme.text]}
                  />
                }
      />

      {/* MODAL */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={mediaPosts}
        selectedIndex={selectedIndex}
        post={posts.find((p) => p.media?.includes(mediaPosts[selectedIndex]))}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { alignItems: "center", paddingHorizontal: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45 },

  bio: { marginTop: 10, alignItems: "center" },
  name: { fontWeight: "bold", fontSize: 16 },
  username: { color: "#666" },

  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 12, color: "#666" },
  activeLabel: { color: "#1DA1F2", fontWeight: "bold" },

  postImage: {
    width: POST_SIZE,
    height: POST_SIZE,
    margin: POST_MARGIN,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userName: { fontSize: 16, fontWeight: "500" },

  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
