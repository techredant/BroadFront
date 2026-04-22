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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

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
  const [followers, setFollowers] = useState<any[]>([]);

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

  const followingData = members.filter((m) => m.isFollowing);

  const getData = () => {
    if (activeTab === "posts") return mediaPosts;
    if (activeTab === "followers") return followers;
    if (activeTab === "following") return followingData;
    return [];
  };

  /* ---------------- FETCH POSTS ---------------- */
  // Fetch Followers
  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/users/${userDetails.clerkId}`,
        );

        const followerIds: string[] = res.data.followers || [];

        // 🔥 Fetch full user objects
        const users = await Promise.all(
          followerIds.map((id) => axios.get(`${BASE_URL}/api/users/${id}`)),
        );

        const formatted = users.map((u) => ({
          ...u.data,
          isFollowing: followers.some((m) => m.clerkId === u.data.clerkId),
        }));

        setFollowers(formatted);
      } catch (err) {
        console.error("❌ Error fetching followers:", err);
      }
    };

    if (userDetails?.clerkId) {
      fetchFollowers();
    }
  }, [userDetails?.clerkId]);

  const handleFollowToggle = async (user: any) => {
    // 🔥 Optimistic update (instant UI change)
    setFollowers((prev) =>
      prev.map((f) =>
        f.clerkId === user.clerkId ? { ...f, isFollowing: !f.isFollowing } : f,
      ),
    );

    try {
      await toggleFollow(user);
    } catch (err) {
      console.error("❌ Failed:", err);

      // ❌ rollback if API fails
      setFollowers((prev) =>
        prev.map((f) =>
          f.clerkId === user.clerkId
            ? { ...f, isFollowing: !f.isFollowing }
            : f,
        ),
      );
    }
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

  if (isLoadingUser || loading) {
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
          <View>
            <Text style={styles.userName}>
              {item.firstName
                ? `${item.firstName} ${item.lastName}`
                : item.companyName}
            </Text>
            <Text>{item.nickName}</Text>
          </View>
        </View>
        {followers ? (
          <TouchableOpacity
            onPress={() => handleFollowToggle(item)}
            style={[
              styles.followButton,
              {
                backgroundColor: item.isFollowing ? "transparent" : "#1DA1F2",
                borderWidth: 1,
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
        ) : (
          <TouchableOpacity
            onPress={() => toggleFollow(item)}
            style={[
              styles.followButton,
              {
                backgroundColor: item.isFollowing ? "transparent" : "#1DA1F2",
                borderWidth: 1,
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
              {item.isFollowing ? "unFollow" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerMenuButton />
      <View style={styles.header}>
        {/* Avatar */}
        <Image
          source={{
            uri:
              userDetails?.image?.trim() || "https://i.pravatar.cc/150?img=32",
          }}
          style={styles.avatar}
        />

        {/* Name + Username */}
        <View style={styles.bio}>
          <Text style={[styles.name, { color: theme.text }]}>
            {userDetails?.firstName} {userDetails?.lastName}
          </Text>
          <Text style={[styles.username, { color: theme.subtext }]}>
            {userDetails?.nickName}
          </Text>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(onboarding)/nameScreen")}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={() => console.log("Verify Account")}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={theme.text}
            />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
              Verify
            </Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.stats}>
          {["posts", "followers", "following"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={styles.statItem}
            >
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {tab === "posts"
                  ? mediaPosts.length
                  : tab === "followers"
                    ? followers.length
                    : followingData.length}
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  { color: theme.subtext },
                  activeTab === tab && {
                    color: theme.primary,
                    fontWeight: "600",
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 10,
  },

  bio: {
    marginTop: 10,
    alignItems: "center",
  },

  name: {
    fontWeight: "700",
    fontSize: 18,
  },

  username: {
    fontSize: 13,
    marginTop: 2,
  },

  actionsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },

  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },

  secondaryBtnText: {
    fontWeight: "500",
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 18,
  },

  statItem: {
    alignItems: "center",
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

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
