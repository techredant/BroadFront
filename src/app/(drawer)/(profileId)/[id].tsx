import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFollowContext } from "@/context/FollowContext";
import { EditProfileModal } from "@/app/components/posts/EditProfileModal";
import { PostCard } from "@/app/components/posts/PostCard";
import { useIsFocused } from "@react-navigation/native";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();

  const { handleFollow, members, following } = useFollowContext();
  const { userDetails, isLoadingUser, currentLevel } = useLevel();
  const { theme } = useTheme();
  const isFocused = useIsFocused();

  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profileUser, setProfileUser] = useState<any>(null);
  const [modalProfileVisible, setModalProfileVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "followers" | "following"
  >("posts");

  const socketRef = useRef<Socket | null>(null);

  const isOwner = userDetails?.clerkId === profileUser?.clerkId;

  /* ---------------- FETCH PROFILE USER ---------------- */
  const fetchUser = useCallback(async () => {
    if (!id) return;

    try {
      const res = await axios.get(`${BASE_URL}/api/users/${id}`);
      setProfileUser(res.data);
    } catch (err) {
      console.error("❌ Error fetching user:", err);
    }
  }, [id]);

  /* ---------------- FETCH POSTS ---------------- */
  const fetchPosts = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const res = await axios.get(`${BASE_URL}/api/posts/${id}`, {
        params: {
          levelType: currentLevel?.type,
          levelValue: currentLevel?.value,
        },
      });

      setPosts(res.data);
    } catch (err) {
      console.error("❌ Error fetching posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentLevel]);

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, [fetchUser, fetchPosts]);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!id) return;

    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("newPost", (post: any) => {
      if (post.userId === id) {
        setPosts((prev) => [post, ...prev]);
      }
    });

    socket.on("deletePost", (postId: string) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  /* ---------------- PROFILE FOLLOW DATA (IMPORTANT FIX) ---------------- */
  const profileFollowers = useMemo(() => {
    return profileUser?.followers || [];
  }, [profileUser]);

  const profileFollowing = useMemo(() => {
    return profileUser?.following || [];
  }, [profileUser]);

  const followersList = useMemo(() => {
    return members.filter((m) => profileFollowers.includes(m.clerkId));
  }, [members, profileFollowers]);

  const followingList = useMemo(() => {
    return members.filter((m) => profileFollowing.includes(m.clerkId));
  }, [members, profileFollowing]);

  /* ---------------- REFRESH ---------------- */
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  /* ---------------- LOADING ---------------- */
  if (isLoadingUser || loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  /* ---------------- DATA ---------------- */
  const getData = () => {
    if (activeTab === "posts") return posts;
    if (activeTab === "followers") return followersList;
    if (activeTab === "following") return followingList;
    return [];
  };

  /* ---------------- RENDER ITEM ---------------- */
  const renderItem = ({ item }: any) => {
    if (activeTab === "posts") {
      return (
        <PostCard
          post={item}
          isVisible={isFocused}
          socket={socketRef.current}
          allPosts={posts}
          onRefresh={onRefresh}
          onUpdatePost={(updatedPost: any) => {
            setPosts((prev) =>
              prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)),
            );
          }}
          onDeletePost={(postId: any) =>
            setPosts((prev) => prev.filter((p) => p._id !== postId))
          }
        />
      );
    }

    // const isFollowing = profileUser?.following?.includes(item.clerkId);
    const isFollowing = following.includes(item.clerkId);

    const you = item.clerkId === userDetails?.clerkId;


   

    return (
      <View style={[styles.userRow, { backgroundColor: theme.background }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={{ uri: item?.image }} style={styles.userAvatar} />

          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.firstName
                ? `${item.firstName} ${item.lastName}`
                : item.companyName}
            </Text>
            <Text style={{ color: theme.subtext }}>{item.nickName}</Text>
          </View>
        </View>


        <TouchableOpacity
          onPress={() => handleFollow(item.clerkId)}
          style={[
            styles.followButton,
            {
              backgroundColor: isFollowing ? "transparent" : "#1DA1F2",
              borderWidth: 1,
              borderColor: "#1DA1F2",
            },
          ]}
        >
          <Text
            style={{
              color: isFollowing ? "#1DA1F2" : "#fff",
              fontWeight: "bold",
            }}
          >
            {you ? "You" : isFollowing ? "Unfollow" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* <DrawerMenuButton /> */}
      <Pressable onPress={() => router.push("/(tabs)")} style={{ padding: 20, paddingTop: 50, position: "absolute" }}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={{ uri: profileUser?.image }} style={styles.avatar} />

        <View style={styles.bio}>
          <Text style={[styles.name, { color: theme.text }]}>
            {profileUser?.firstName} {profileUser?.lastName}{" "}
            {profileUser?.companyName}
          </Text>
          <Text style={[styles.username, { color: theme.subtext }]}>
            {profileUser?.nickName}
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.stats}>
          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            style={styles.statItem}
          >
            <Text style={[styles.statNumber, {color:theme.text}]}>{posts.length}</Text>
            <Text style={{ color:theme.text }}>Posts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("followers")}
            style={styles.statItem}
          >
            <Text style={[styles.statNumber, {color:theme.text}]}>
              {profileUser?.followers?.length}
            </Text>
            <Text style={{ color:theme.text }}>Followers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("following")}
            style={styles.statItem}
          >
            <Text style={[styles.statNumber, {color:theme.text}]}>
              {profileUser?.following?.length}
            </Text>
            <Text style={{ color:theme.text }}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={getData()}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
            {
                paddingBottom: 50
            }
        }
      />

      {/* EDIT PROFILE (ONLY OWNER) */}
      {isOwner && (
        <EditProfileModal
          visible={modalProfileVisible}
          onClose={() => setModalProfileVisible(false)}
          userDetails={profileUser}
        />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { alignItems: "center", padding: 16, paddingTop: 50 },
  avatar: { width: 100, height: 100, borderRadius: 50 },

  bio: { alignItems: "center", marginTop: 10 },
  name: { fontSize: 18, fontWeight: "700" },
  username: { fontSize: 13 },

  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },

  statItem: { alignItems: "center" },
  statNumber: { fontWeight: "700", fontSize: 16 },

  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },

  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  userName: { fontSize: 16, fontWeight: "500" },

  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
