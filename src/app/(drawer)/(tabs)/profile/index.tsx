import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { io, Socket } from "socket.io-client";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFollowContext } from "@/context/FollowContext";
import { EditProfileModal } from "@/components/posts/EditProfileModal";
import { PostCard } from "@/components/posts/PostCard";
import { normalizePostId, upsertPostInList } from "@/utils/buildSharePost";
import { useIsFocused } from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { isProfileUpdatePending } from "@/utils/profileUpdate";
import { ProfileUpdateCountdown } from "@/components/profile/ProfileUpdateCountdown";
import {
  MemberListRow,
  ProfilePeopleListHint,
} from "@/components/profile/MemberListRow";
import {
  useShowTabBarOnFocus,
  useTabBarScrollHandler,
} from "@/context/TabBarVisibilityContext";
import { CACHE_TTL, setCached, shouldRefetchOnFocus } from "@/utils/staleFetch";
import { ProfileHeaderSkeleton } from "@/components/profile/ProfileHeaderSkeleton";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function ProfileScreen() {
  const {
    handleFollow,
    following,
    followersCount,
    followingCount,
    followerUsers,
    followingUsers,
  } = useFollowContext();
  const {
    userDetails,
    isLoadingUser,
    currentLevel,
    refreshUserDetails,
    updateUserDetails,
    posts: feedPosts,
  } = useLevel();
  const { theme } = useTheme();

  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [modalProfileVisible, setModalProfileVisible] = useState(false);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const isFocused = useIsFocused();

  const postsLoadedOnce = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const clerkId = userDetails?.clerkId;
  const levelType = currentLevel?.type;
  const levelValue = currentLevel?.value;
  const [activeTab, setActiveTab] = useState<
    "posts" | "followers" | "following"
  >("posts");

  const onTabBarScroll = useTabBarScrollHandler();
  useShowTabBarOnFocus();

  const fetchMedia = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!clerkId) return;

      const silent = opts?.silent ?? postsLoadedOnce.current;
      if (!silent) setPostsLoading(true);

      try {
        const res = await axios.get(`${BASE_URL}/api/posts/${clerkId}`, {
          params: {
            levelType,
            levelValue,
          },
        });
        const data = res.data ?? [];
        setPosts(data);
        postsLoadedOnce.current = true;
        if (clerkId) {
          setCached(`profile-posts:${clerkId}:${levelType}-${levelValue}`, data);
        }
      } catch (err) {
        console.error("Error fetching profile posts:", err);
      } finally {
        setPostsLoading(false);
        setRefreshing(false);
      }
    },
    [clerkId, levelType, levelValue],
  );

  useEffect(() => {
    if (!clerkId) return;
    fetchMedia({ silent: postsLoadedOnce.current });
  }, [clerkId, levelType, levelValue, fetchMedia]);

  useEffect(() => {
    if (!clerkId || !levelType || !levelValue) return;

    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const room = `level-${levelType}-${levelValue}`;
    socket.emit("joinRoom", room);

    const handleNewPost = (post: any) => {
      if (post.userId === clerkId) {
        setPosts((prev) => upsertPostInList(prev, normalizePostId(post)));
      }
    };

    const handleDeletePost = (postId: string) => {
      setPosts((prev) => prev.filter((p) => String(p._id) !== String(postId)));
    };

    socket.on("newPost", handleNewPost);
    socket.on("deletePost", handleDeletePost);

    return () => {
      socket.emit("leaveRoom", room);
      socket.off("newPost", handleNewPost);
      socket.off("deletePost", handleDeletePost);
      socket.disconnect();
    };
  }, [clerkId, levelType, levelValue]);

  /** Keep profile grid in sync with home feed (composer uses prependPost there) */
  useEffect(() => {
    if (!clerkId) return;

    const mine = feedPosts.filter((p) => p.userId === clerkId);
    if (mine.length === 0) return;

    postsLoadedOnce.current = true;

    setPosts((prev) => {
      let next = prev;
      for (const post of mine) {
        next = upsertPostInList(next, post);
      }
      return next;
    });
  }, [feedPosts, clerkId]);

  useFocusEffect(
    useCallback(() => {
      if (!clerkId || !levelType || !levelValue) return;
      const cacheKey = `profile-posts:${clerkId}:${levelType}-${levelValue}`;
      if (!shouldRefetchOnFocus(cacheKey, CACHE_TTL.profilePosts)) return;
      fetchMedia({ silent: true });
    }, [clerkId, levelType, levelValue, fetchMedia]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUserDetails(),
        fetchMedia({ silent: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUserDetails, fetchMedia]);

  const showInitialLoader = !userDetails && isLoadingUser;
  const showPostsLoader =
    activeTab === "posts" && postsLoading && !postsLoadedOnce.current;

  if (showInitialLoader || !userDetails) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <DrawerMenuButton />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <ProfileHeaderSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  const isPersonal = userDetails?.accountType === "Personal Account";
  const profileUpdatePending = isProfileUpdatePending(userDetails);

  const tabData =
    activeTab === "posts"
      ? posts
      : activeTab === "followers"
        ? followerUsers
        : followingUsers;

  const renderPost = (item: any) => (
    <PostCard
      key={item._id}
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
      onPrependPost={(newPost: any) =>
        setPosts((prev) => upsertPostInList(prev, newPost))
      }
      onRemovePost={(postId: string) =>
        setPosts((prev) => prev.filter((p) => p._id !== postId))
      }
      onDeletePost={(postId: string) =>
        setPosts((prev) => prev.filter((p) => p._id !== postId))
      }
    />
  );

  const renderUserRow = (item: any) => (
    <MemberListRow
      key={item.clerkId}
      item={item}
      isFollowing={following.includes(item.clerkId)}
      onFollowPress={handleFollow}
      currentUserId={userDetails?.clerkId}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerMenuButton />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: userDetails?.image }}
              style={styles.avatar}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
            {profileUpdatePending ? (
              <View
                style={[styles.avatarBadge, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="time" size={12} color="#fff" />
              </View>
            ) : null}
          </View>

          <ProfileUpdateCountdown
            userDetails={userDetails}
            isBusiness={!isPersonal}
            theme={theme}
            onExpired={refreshUserDetails}
            compact
          />

          <View style={styles.bio}>
            <Text style={[styles.name, { color: theme.text }]}>
              {isPersonal
                ? `${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`.trim()
                : userDetails?.companyName}
            </Text>
            <View style={styles.nickRow}>
              <Text style={[styles.username, { color: theme.subtext }]}>
                {userDetails?.nickName}
              </Text>
              <VerifiedBadge isVerified={userDetails?.isVerified} size={16} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={() => setModalProfileVisible(true)}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => router.push("/(drawer)/verification")}
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

          <View style={styles.stats}>
            {(["posts", "followers", "following"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.statItem}
              >
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {tab === "posts"
                    ? posts.length
                    : tab === "followers"
                      ? followersCount
                      : followingCount}
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

        <View style={styles.body}>
          {activeTab !== "posts" && tabData.length > 0 ? (
            <ProfilePeopleListHint
              count={tabData.length}
              label={activeTab}
            />
          ) : null}

          {showPostsLoader ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : tabData.length === 0 ? (
            <Text style={[styles.empty, { color: theme.subtext }]}>
              {activeTab === "posts"
                ? "No posts yet"
                : activeTab === "followers"
                  ? "No followers yet"
                  : "Not following anyone yet"}
            </Text>
          ) : activeTab === "posts" ? (
            tabData.map(renderPost)
          ) : (
            tabData.map(renderUserRow)
          )}
        </View>
      </ScrollView>

      <EditProfileModal
        visible={modalProfileVisible}
        onClose={() => setModalProfileVisible(false)}
        userDetails={userDetails}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  avatarWrap: {
    marginTop: 10,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  devTestBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bio: {
    marginTop: 10,
    alignItems: "center",
  },
  nickRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
    textAlign: "center",
  },
  username: {
    fontSize: 12,
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
    marginTop: 12,
    paddingBottom: 8,
  },
  statItem: {
    alignItems: "center",
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    width: "100%",
  },
  postsLoader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 32,
    fontSize: 14,
  },
});
