import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
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
import { EditProfileModal } from "@/components/posts/EditProfileModal";
import { PostCard } from "@/components/posts/PostCard";
import { upsertPostInList } from "@/utils/buildSharePost";
import { useIsFocused } from "@react-navigation/native";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  MemberListRow,
  ProfilePeopleListHint,
} from "@/components/profile/MemberListRow";
import { ProfileHeaderSkeleton } from "@/components/profile/ProfileHeaderSkeleton";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";

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
  const postsLoadedOnce = useRef(false);

  const memberSeed = useMemo(
    () => members.find((m) => m.clerkId === id),
    [members, id],
  );

  const [profileUser, setProfileUser] = useState<any>(null);
  const [modalProfileVisible, setModalProfileVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "followers" | "following"
  >("posts");

  const socketRef = useRef<Socket | null>(null);

  const isOwner = userDetails?.clerkId === profileUser?.clerkId;

  useEffect(() => {
    if (memberSeed && !profileUser) {
      setProfileUser(memberSeed);
    }
  }, [memberSeed, profileUser]);

  const loadProfile = useCallback(async () => {
    if (!id || !currentLevel?.type || !currentLevel?.value) return;

    const silent = postsLoadedOnce.current || !!memberSeed;
    if (!silent) setLoading(true);

    try {
      const [userRes, postsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/users/${id}`),
        axios.get(`${BASE_URL}/api/posts/${id}`, {
          params: {
            levelType: currentLevel.type,
            levelValue: currentLevel.value,
          },
        }),
      ]);

      setProfileUser(userRes.data);
      setPosts(postsRes.data ?? []);
      postsLoadedOnce.current = true;
    } catch (err) {
      console.error("❌ Error loading profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentLevel?.type, currentLevel?.value, memberSeed]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
    const list = members.filter((m) => profileFollowers.includes(m.clerkId));
    const myId = userDetails?.clerkId;
    if (!myId) return list;
  
    return [...list].sort((a, b) => {
      if (a.clerkId === myId) return -1;
      if (b.clerkId === myId) return 1;
      return 0;
    });
  }, [members, profileFollowers, userDetails?.clerkId]);
  
  const followingList = useMemo(() => {
    const list = members.filter((m) => profileFollowing.includes(m.clerkId));
    const myId = userDetails?.clerkId;
    if (!myId) return list;
  
    return [...list].sort((a, b) => {
      if (a.clerkId === myId) return -1;
      if (b.clerkId === myId) return 1;
      return 0;
    });
  }, [members, profileFollowing, userDetails?.clerkId]);

  /* ---------------- REFRESH ---------------- */
  const onRefresh = () => {
    setRefreshing(true);
    void loadProfile();
  };

  /* ---------------- LOADING ---------------- */
  if (isLoadingUser && !profileUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Pressable
          onPress={() => router.push("/(tabs)")}
          style={{ padding: 20, paddingTop: 50, position: "absolute" }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <ProfileHeaderSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Pressable
          onPress={() => router.push("/(tabs)")}
          style={{ padding: 20, paddingTop: 50, position: "absolute" }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <ProfileHeaderSkeleton />
        <PostCardSkeleton />
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
          onPrependPost={(newPost: any) =>
            setPosts((prev) => upsertPostInList(prev, newPost))
          }
          onRemovePost={(postId: string) =>
            setPosts((prev) => prev.filter((p) => p._id !== postId))
          }
          onDeletePost={(postId: any) =>
            setPosts((prev) => prev.filter((p) => p._id !== postId))
          }
        />
      );
    }

    // const isFollowing = profileUser?.following?.includes(item.clerkId);
    return (
      <MemberListRow
        item={item}
        isFollowing={following.includes(item.clerkId)}
        onFollowPress={handleFollow}
        currentUserId={userDetails?.clerkId}
      />
    );
  };

  const peopleListHeader =
    activeTab === "followers" || activeTab === "following" ? (
      <ProfilePeopleListHint
        count={getData().length}
        label={activeTab}
      />
    ) : null;

  /* ---------------- UI ---------------- */
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* <DrawerMenuButton /> */}
      <Pressable onPress={() => router.push("/(tabs)")} style={{ padding: 20, paddingTop: 50, position: "absolute" }}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{ uri: profileUser?.image }}
          style={styles.avatar}
          cachePolicy="memory-disk"
          contentFit="cover"
        />

        <View style={styles.bio}>
          <Text style={[styles.name, { color: theme.text }]}>
            {profileUser?.firstName} {profileUser?.lastName}{" "}
            {profileUser?.companyName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.username, { color: theme.subtext }]}>
              {profileUser?.nickName}
            </Text>
            <VerifiedBadge isVerified={profileUser?.isVerified} size={16} />
          </View>
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
        keyExtractor={(item, i) =>
          item?.clerkId ?? item?._id?.toString() ?? `row-${i}`
        }
        renderItem={renderItem}
        ListHeaderComponent={peopleListHeader}
        ListEmptyComponent={
          activeTab === "posts" && loading && posts.length === 0 ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : activeTab !== "posts" ? (
            <Text style={[styles.emptyPeople, { color: theme.subtext }]}>
              {activeTab === "followers"
                ? "No followers yet"
                : "Not following anyone yet"}
            </Text>
          ) : (
            <Text style={[styles.emptyPeople, { color: theme.subtext }]}>
              No posts yet
            </Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 50 }}
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
  name: { fontSize: 17, fontWeight: "700" },
  username: { fontSize: 12 },

  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },

  statItem: { alignItems: "center" },
  statNumber: { fontWeight: "700", fontSize: 15 },

  emptyPeople: {
    textAlign: "center",
    paddingVertical: 32,
    fontSize: 14,
  },
});
