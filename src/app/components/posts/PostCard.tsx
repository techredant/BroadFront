import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  use,
  useMemo,
} from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import {
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  AntDesign,
  Entypo,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Gesture } from "react-native-gesture-handler";
import moment from "moment";
import { router } from "expo-router";
import { MediaViewerModal } from "./MediaViewModal";
import axios from "axios";
import {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";
import { SafeAreaView } from "react-native-safe-area-context";
import Video from "react-native-video";
import { ReciteModal } from "./ReciteModal";
import CommentModal from "./CommentModal";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { useUserContext } from "@/context/FollowContext";

interface Member {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  nickName: string;
  image: string;
  followers: string[];
  isFollowing?: boolean;
}

const { width } = Dimensions.get("window");

export function PostCard({
  post,
  isVisible,
  onDeletePost,
  socket,
  allPosts,
  onUpdatePost,
  onRefresh,
  ...otherProps
}: any) {
  const { theme } = useTheme();
  const { userDetails } = useLevel();

  if (!post) return null;

  const [reposted, setReposted] = useState(false);

  const [recited, setRecited] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [postCard, setPostCard] = useState(post);

  const [commentModalVisible, setCommentModalVisible] = useState(false);

  const onOpenComments = (postId: string) => {
    setCommentModalVisible(true);
    fetchComments(); // reload comments when modal opens
  };

  const LIKE_COLOR = "#E0245E";

  const mediaList = Array.isArray(post.media) ? post.media : [];
  const reciteMediaList = Array.isArray(post.reciteMedia)
    ? post.reciteMedia
    : [];
  const reciteMediaCount = reciteMediaList.length;
  const reciteGridWidth = width - 60; // slightly smaller than main
  const reciteItemSize = reciteGridWidth / 3 - 4;

  const mediaCount = mediaList.length;
  const [expandedStates, setExpandedStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [showMoreStates, setShowMoreStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [loadingRecite, setLoadingRecite] = useState(false);
  const [loadingRecast, setLoadingRecast] = useState(false);

  const [linkData, setLinkData] = useState<any>(null);

  const isExpanded = expandedStates[postCard._id];
  const showMore = showMoreStates[postCard._id];

  const gridWidth = width - 24;
  const itemSize = gridWidth / 2 - 4;

  const isLiked = userDetails?.clerkId
    ? postCard.likes?.includes(userDetails.clerkId)
    : false;
  const isRecasted = userDetails?.clerkId
    ? postCard.recasts?.some((r: any) => r.userId === userDetails.clerkId)
    : false;

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [reciteVisible, setReciteVisible] = useState(false);
  // const [loadingRecite, setLoadingRecite] = useState(false);

  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const [isMuted, setIsMuted] = useState(true); // default muted

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (loadingRecast) {
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      );
      animation.start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [loadingRecast]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fetchComments = useCallback(async () => {
    if (!postCard._id) return;
    try {
      setLoading(true);
      const url = `https://cast-api-zeta.vercel.app/api/${postCard._id}`;
      // console.log("Fetching Comments from:", url);

      const res = await axios.get(url);
      // console.log("Comments received:", res.data);

      setComments(res.data ?? []);
    } catch (err) {
      console.error("❌ Error fetching Comments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postCard._id]);

  // Fetch on mount or level change
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);



  // /* ---------------- PINCH ZOOM ---------------- */
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

  /* ---------------- BUTTON ANIMATIONS ---------------- */
  // Fix: Use Animated.Value from 'react-native' not 'react-native-reanimated'
  const animatedLike = useRef(new Animated.Value(1)).current;
  const animatedRepost = useRef(new Animated.Value(1)).current;

  const incrementViews = async () => {
    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts/${postCard._id}/view`,
      );
      setPostCard((prev: any) => ({ ...prev, views: prev.views + 1 }));
    } catch (err) {
      console.error("View increment failed:", err);
    }
  };

  const incrementRecasts = async () => {
    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts/${postCard._id}/recastCount`,
      );
      setPostCard((prev: any) => ({
        ...prev,
        recastCount: prev.recastCount + 1,
      }));
    } catch (err) {
      console.error("View increment failed:", err);
    }
  };

  const incrementRecite = async () => {
    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts/${postCard._id}/reciteCount`,
      );
      setPostCard((prev: any) => ({
        ...prev,
        reciteCount: prev.reciteCount + 1,
      }));
    } catch (err) {
      console.error("View increment failed:", err);
    }
  };

  const handleLike = async () => {
    if (!userDetails.clerkId) return;

    // Optimistic UI update
    const alreadyLiked = postCard.likes?.includes(userDetails.clerkId);
    const updatedLikes = alreadyLiked
      ? postCard.likes.filter((id: string) => id !== userDetails.clerkId)
      : [...postCard.likes, userDetails.clerkId];

    setPostCard({ ...postCard, likes: updatedLikes });

    // Animate like button for feedback
    Animated.sequence([
      Animated.spring(animatedLike, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(animatedLike, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts/${postCard._id}/like`,
        { userId: userDetails.clerkId },
      );
      console.log("liked");
      await incrementViews(); // ✅ Increase views
    } catch (err) {
      console.error(err);
      // Rollback if backend fails
      setPostCard(postCard);
    }
  };

  const handleRecite = async (text: string) => {
    if (!userDetails.clerkId) return;
    setLoadingRecite(true);

    const newRecite = {
      userId: userDetails.clerkId,
      reciteImage: postCard.user?.image,
      reciteFirstName: postCard.user.firstName,
      reciteLastName: postCard.user.firstName,
      reciteNickName: postCard.user.nickName || "Anonymous",
      caption: postCard.caption,
      reciteMedia: postCard.media,
      levelType: postCard.levelType,
      levelValue: postCard.levelValue,
      quote: text, // ✅ use the argument directly
      originalPostId: postCard._id || null,
    };

    setRecited(true);

    try {
      await axios.post(`https://cast-api-zeta.vercel.app/api/posts`, {
        ...newRecite,
        type: "recite",
      });

      await incrementViews();
      await incrementRecite();
      onRefresh?.();


      setQuoteVisible(false);
    } catch (err) {
      console.error(err);
      setRecited(false);
    } finally {
      setLoadingRecite(false);
    }
  };
  // Prepare the recast payload

  // recast
  const handleRecast = async (text: string) => {
    if (!userDetails?.clerkId || !postCard) return;

    setLoadingRecast(true);
    const newRecast = {
      userId: userDetails.clerkId,
      originalPostId: postCard._id, // required for backend to copy
      caption: postCard.caption || "",
      media: postCard.media || [],
      quote: text || null,
      levelType: postCard.levelType,
      levelValue: postCard.levelValue,

      type: "recast", // marks it as a recast/recite

      reciteFirstName: postCard?.user?.firstName || "",
      reciteLastName: postCard?.user?.lastName || "",
      reciteNickName: postCard?.user?.nickName || "",
      reciteImage: postCard?.user?.image || "",
    };
    try {
      await axios.post(`https://cast-api-zeta.vercel.app/api/posts`, newRecast);

      const updated = {
        ...postCard,
        recastCount: (postCard.recastCount || 0) + 1,
      };

      setPostCard(updated);

      onUpdatePost?.(updated); // 🔥 IMPORTANT
      // ✅ THIS is what you missed
      onRefresh?.();
      await incrementRecasts();
    } catch (err) {
      console.error("❌ Error reposting:", err);
    } finally {
      setLoadingRecast(false);
    }
  };

  const confirmDeletePost = async () => {
    setLoadingDelete(true);
    try {
      await axios.delete(
        `https://cast-api-zeta.vercel.app/api/posts/${postCard._id}`,
        {
          data: { userId: userDetails.clerkId },
        },
      );

      onDeletePost?.(postCard._id); // remove from feed
      setDeleteVisible(false);
    } catch (err) {
      console.error("❌ Delete failed:", err);
      setDeleteVisible(false);
    } finally {
      setLoadingDelete(false);
    }
  };

  const isOwner = userDetails?.clerkId === postCard.userId;
  const { members, currentUserId, toggleFollow } = useUserContext();
  return (
    <>
      {/* RECAST BANNER */}
      {postCard.recastedBy && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingBottom: 6,
          }}
        >
          <Feather name="repeat" size={14} color={theme.text} />
          <Text
            style={{
              color: theme.text,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            Recasted by {postCard.recastedBy?.nickName}
          </Text>
        </View>
      )}

      <View
        style={{
          backgroundColor: "theme.card",
          paddingVertical: 12,
          marginBottom: 8,
          borderRadius: 12,
        }}
      >
        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
          }}
        >
          <Pressable
            onPress={() => router.push(`/profileId/${postCard.userId}`)}
            style={{ flex: 1, flexDirection: "row", gap: 10 }}
          >
            <Image
              source={{ uri: postCard.user?.image }}
              style={{ width: 30, height: 30, borderRadius: 15 }}
            />
            <View>
              <Text style={{ color: theme.text, fontWeight: "bold" }}>
                {postCard.user?.firstName}
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12 }}>
                {postCard.user?.nickName}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  fontStyle: "italic",
                  color: theme.subtext,
                }}
              >
                {postCard.levelValue === "Home"
                  ? ""
                  : `#${postCard.levelValue} ${postCard.levelType}`}
              </Text>
            </View>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
              backgroundColor: theme.background,
              borderRadius: 50,
              padding: 4,
            }}
          >
            <Ionicons name="time-outline" size={14} color="gray" />
            <Text
              style={{
                color: theme.subtext,
                fontWeight: "600",
                fontSize: 10,
                fontStyle: "italic",
              }}
            >
              {moment(postCard.createdAt).fromNow()}
            </Text>
          </View>

          <Menu>
            <MenuTrigger>
              <Feather name="more-vertical" size={20} color="gray" />
            </MenuTrigger>

            <MenuOptions
              customStyles={{
                optionsContainer: {
                  borderRadius: 12,
                  paddingVertical: 6,
                  width: 180,
                },
              }}
            >
              {/* Save */}
              <MenuOption onSelect={() => alert("Save post")}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                  }}
                >
                  <Feather name="bookmark" size={16} color="#111" />
                  <Text>Save</Text>
                </View>
              </MenuOption>

              {/* Share */}
              <MenuOption onSelect={() => alert("Share post")}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                  }}
                >
                  <Feather name="share-2" size={16} color="#111" />
                  <Text>Share</Text>
                </View>
              </MenuOption>

              {/* Report */}
              <MenuOption onSelect={() => alert("Report post")}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                  }}
                >
                  <Feather name="flag" size={16} color="#E11D48" />
                  <Text style={{ color: "#E11D48" }}>Report</Text>
                </View>
              </MenuOption>

              {/* Block */}
              <MenuOption onSelect={() => alert("Block user")}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                  }}
                >
                  <Feather name="slash" size={16} color="#DC2626" />
                  <Text style={{ color: "#DC2626", fontWeight: "600" }}>
                    Block
                  </Text>
                </View>
              </MenuOption>

              {/* Delete (only show if owner) */}
              {isOwner && (
                <MenuOption onSelect={() => setDeleteVisible(true)}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                    }}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                    <Text style={{ color: "#DC2626", fontWeight: "600" }}>
                      Delete
                    </Text>
                  </View>
                </MenuOption>
              )}
            </MenuOptions>
          </Menu>
        </View>
        {/* COLLAPSIBLE CAPTION */}
        <Text
          numberOfLines={isExpanded ? undefined : 3}
          style={{
            color: theme.text,
            paddingHorizontal: 12,
            marginTop: 6,
          }}
        >
          {postCard.quote ? postCard.quote : postCard.caption}
        </Text>
        {postCard.quote ? (
          <View
            style={{
              backgroundColor: theme.badge,
              padding: 12,
              marginHorizontal: 12,
              marginTop: 6,
              // borderLeftWidth: 1,
              // borderLeftColor: "#4B9CE2",
              borderRadius: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={{ uri: postCard?.reciteImage }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  marginRight: 6,
                }}
              />
              <View style={{ flexDirection: "column" }}>
                <Text
                  style={{ fontWeight: "700", fontSize: 11, color: theme.text }}
                >
                  {postCard?.reciteFirstName}
                </Text>
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 10,
                    color: theme.subtext,
                  }}
                >
                  {postCard?.reciteNickName}
                </Text>
              </View>
            </View>
            {/* RECITE MEDIA GRID */}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
            >
              {reciteMediaList.slice(0, 4).map((uri: string, idx: number) => {
                const remaining = reciteMediaCount - 2;
                const isLast = idx === 3 && remaining > 0;
                const isSingle = reciteMediaCount === 1;

                const containerWidth = isSingle ? "100%" : reciteItemSize;
                const containerHeight = isSingle ? 280 : reciteItemSize;

                const isVideo =
                  uri?.toLowerCase().endsWith(".mp4") ||
                  uri?.toLowerCase().endsWith(".mov");

                return (
                  <Pressable
                    key={`${uri}-${idx}`}
                    onPress={() => openMedia(idx)}
                    style={{
                      width: containerWidth,
                      height: containerHeight,
                      margin: isSingle ? 0 : 2,
                      borderRadius: 10,
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor: "#000",
                    }}
                  >
                    {isVideo ? (
                      <>
                        <Video
                          source={{ uri }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                          paused={!isVisible}
                          muted={isMuted}
                          controls
                          pointerEvents="none"
                        />

                        <TouchableOpacity
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            borderRadius: 20,
                            padding: 5,
                          }}
                          onPress={() => setIsMuted((prev) => !prev)}
                        >
                          <Ionicons
                            name={isMuted ? "volume-mute" : "volume-high"}
                            size={16}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    )}

                    {isLast && (
                      <View
                        style={{
                          // ...StyleSheet.absoluteFillObject,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 26,
                            fontWeight: "bold",
                          }}
                        >
                          +{remaining}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={{ fontStyle: "italic", marginTop: 6, color: theme.text }}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {postCard.caption}
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              // marginHorizontal: 12,
            }}
          >
            {mediaList.slice(0, 4).map((uri: string, idx: number) => {
              const remaining = mediaCount - 4;
              const isLast = idx === 3 && remaining > 0;

              const isSingle = mediaCount === 1;
              const isTwo = mediaCount === 4;

              const widthStyle = isSingle
                ? width - 3
                : isTwo
                  ? width - 3
                  : itemSize;

              const heightStyle = isSingle ? 420 : isTwo ? 500 : itemSize;

              const isVideo = uri.endsWith(".mp4") || uri.endsWith(".mov");

              return (
                <Pressable
                  key={uri}
                  onPress={() => openMedia(idx)}
                  style={{
                    width: widthStyle,
                    height: heightStyle,
                    margin: 2,
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    backgroundColor: "#000",
                  }}
                >
                  {isVideo ? (
                    <>
                      <Video
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                        paused={!isVisible}
                        muted={isMuted}
                        controls
                        pointerEvents="none" // ✅ allows touches to go through
                      />
                      {/* Transparent overlay to catch press */}
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          backgroundColor: "rgba(0,0,0,0.4)",
                          borderRadius: 20,
                          padding: 6,
                        }}
                        onPress={() => setIsMuted((prev) => !prev)}
                      >
                        <Ionicons
                          name={isMuted ? "volume-mute" : "volume-high"}
                          size={20}
                          color="#fff"
                        />
                      </TouchableOpacity>
                      <View
                        style={{
                          ...StyleSheet.absoluteFillObject,
                        }}
                      />
                    </>
                  ) : (
                    <Image
                      source={{ uri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  )}

                  {isLast && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 32,
                          fontWeight: "bold",
                        }}
                      >
                        +{remaining}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
        {/* MEDIA GRID */}

        {/* ACTIONS */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
            alignItems: "center",
            paddingHorizontal: 20,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 50,
            borderColor: theme.border,
            marginBottom: 8,
            padding: 2,
            marginHorizontal: 12,
          }}
        >
          {/* Comments */}
          <Pressable
            onPress={() => onOpenComments(postCard._id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              padding: 4,
              margin: 2,
            }}
          >
            <Feather name="message-circle" size={18} color={theme.subtext} />
            <Text style={{ color: theme.subtext }}>
              {postCard.commentsCount > 0 ? postCard.commentsCount : " "}
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              (await incrementViews(), setQuoteVisible(true));
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              padding: 4,
              margin: 2,
            }}
          >
            <MaterialCommunityIcons
              name="comment-quote-outline"
              size={20}
              color={recited ? theme.text : theme.subtext}
            />
            <Text style={{ color: theme.subtext }}>
              {postCard.quoteCount > 0 ? postCard.quoteCount : " "}
            </Text>
          </Pressable>

          {/* Repost */}
          <Animated.View style={[animatedRepost, { padding: 4 }]}>
            <Pressable
              onPress={() => {
                if (!reposted) handleRecast("");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                padding: 4,
                margin: 2,
              }}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Entypo
                  name="cycle"
                  size={18}
                  color={reposted ? theme.text : theme.subtext}
                />
              </Animated.View>

              <Text
                style={{
                  color: reposted ? theme.text : theme.subtext,
                  minWidth: 8,
                }}
              >
                {postCard.recastCount > 0 ? postCard.recastCount : " "}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Like */}
          <Animated.View style={[animatedLike, { padding: 4 }]}>
            <Pressable
              onPress={handleLike}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                padding: 4,
                margin: 2,
              }}
            >
              {isLiked ? (
                <AntDesign name="heart" size={18} color={LIKE_COLOR} /> // solid heart
              ) : (
                <Feather name="heart" size={18} color={theme.subtext} /> // outline heart
              )}
              <Text
                style={{
                  color: isLiked ? LIKE_COLOR : theme.subtext,
                  minWidth: 8,
                }}
              >
                {postCard.likes?.length > 0 ? postCard.likes.length : " "}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Views */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              padding: 4,
              margin: 2,
            }}
          >
            <Feather name="eye" size={18} color={theme.subtext} />
            <Text style={{ color: theme.subtext }}>{postCard.views}</Text>
          </View>
        </View>
      </View>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
          onPress={() => setDeleteVisible(false)}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 320,
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: theme.text,
                textAlign: "center",
              }}
            >
              Delete post?
            </Text>

            <Text
              style={{
                color: theme.subtext,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              This action cannot be undone.
            </Text>

            <View
              style={{
                flexDirection: "row",
                marginTop: 20,
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => setDeleteVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: theme.background,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmDeletePost}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: "#DC2626",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {loadingDelete ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* commentModal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={postCard._id}
        comments={comments}
        setComments={setComments}
        userId={userDetails?.clerkId}
        userName={userDetails?.nickName}
        userImage={userDetails?.image}
      />

      {/* reciteModal */}
      <ReciteModal
        quoteVisible={quoteVisible}
        setQuoteVisible={setQuoteVisible}
        loadingRecite={loadingRecite}
        postCard={postCard}
        theme={theme}
        mediaList={mediaList}
        mediaCount={mediaCount}
        width={width}
        itemSize={itemSize}
        handleRecite={async (text) => {
          setLoadingRecite(true);
          try {
            await handleRecite(text); // reuse your existing logic
          } finally {
            setLoadingRecite(false);
          }
        }}
      />

      {/* MEDIA MODAL */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={mediaList}
        selectedIndex={selectedIndex}
        post={postCard}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  followText: {
    color: "blue",
    fontWeight: "bold",
  },

  unfollowText: {
    color: "red",
    fontWeight: "bold",
  },
});
