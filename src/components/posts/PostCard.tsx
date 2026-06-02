import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  View,
  Text,
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
import moment from "moment";
import { Link, router } from "expo-router";
import { LikeBubbles } from "@/components/posts/LikeBubbles";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PostMediaGrid } from "@/components/posts/PostMediaGrid";
import { uploadLocalMedia } from "@/utils/mediaUpload";
import { isVideoMedia, resolveMediaUrls } from "@/utils/mediaUtils";
import { buildOptimisticSharePost } from "@/utils/buildSharePost";
import axios from "axios";
import { ReciteModal } from "./ReciteModal";
import CommentModal from "./CommentModal";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { useMediaViewer } from "@/context/MediaViewerContext";
import {
  PresenceAvatar,
  PresenceAudioLabel,
  PresenceLiveLabel,
} from "@/components/presence/PresenceAvatar";
import { EditModal } from "./EditModal";
import { Linking } from "react-native";
import {
  formatConstituency,
  getPoliticalColors,
  PoliticalPalette,
} from "@/constants/politicalTheme";
import { formatNickHandle, stripNickPrefix } from "@/utils/nickName";
import { API_PUBLIC_URL } from "@/constants/api";

const urlRegex = /(https?:\/\/[^\s]+)/g;

const extractUrls = (text: any = "") =>
  typeof text === "string" ? text.match(urlRegex) || [] : [];

function isTempPostId(postId: unknown) {
  return typeof postId === "string" && postId.startsWith("temp-");
}

/* ---------------- BRIEFING LINK CARD (political press style) ---------------- */
function LinkPreviewCard({
  preview,
  theme,
  isDark,
}: {
  preview: any;
  theme: any;
  isDark: boolean;
}) {
  if (!preview?.url) return null;
  const civic = getPoliticalColors(isDark);

  return (
    <Pressable
      onPress={() => Linking.openURL(preview.url)}
      style={[
        styles.briefingCard,
        { borderColor: civic.cardBorder, backgroundColor: theme.card },
      ]}
    >
      {!!preview.image && (
        <Image source={{ uri: preview.image }} style={styles.briefingImage} />
      )}
      <View style={styles.briefingBody}>
        <Text style={[styles.briefingLabel, { color: civic.chipText }]}>
          BRIEFING
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.briefingTitle, { color: theme.text }]}
        >
          {preview.title || "External source"}
        </Text>
        {!!preview.description && (
          <Text
            numberOfLines={2}
            style={[styles.briefingDesc, { color: theme.subtext }]}
          >
            {preview.description}
          </Text>
        )}
        <Text
          numberOfLines={1}
          style={[styles.briefingUrl, { color: civic.chipText }]}
        >
          {preview.url.replace(/^https?:\/\//, "")}
        </Text>
      </View>
    </Pressable>
  );
}

const { width } = Dimensions.get("window");
const MEDIA_GAP = 4;

export function PostCard({
  post,
  isVisible,
  onDeletePost,
  socket,
  allPosts,
  onUpdatePost,
  onPrependPost,
  onRemovePost,
  onRefresh,
  ...otherProps
}: any) {
  const { theme, isDark } = useTheme();
  const civic = useMemo(() => getPoliticalColors(isDark), [isDark]);
  const { userDetails } = useLevel();
  const { openMediaViewer, closeMediaViewer } = useMediaViewer();

  const safeInitialPost = post ?? {};
  const [reposted, setReposted] = useState(false);

  const [recited, setRecited] = useState(false);

  const [postCard, setPostCard] = useState<any>(safeInitialPost);

  useEffect(() => {
    if (!post) return;
    setPostCard(post);
  }, [
    post,
    post?._id,
    post?.updatedAt,
    post?.commentsCount,
    post?.quoteCount,
    post?.recastCount,
    post?.reciteCount,
    post?.views,
    post?.__isDeleting,
    post?.likes?.length,
  ]);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [expandedStates, setExpandedStates] = useState<{
    [key: string]: boolean;
  }>({});

  const onOpenComments = (_postId: string) => {
    closeMediaViewer();
    setTimeout(() => setCommentModalVisible(true), 0);
    setPage(1); // reset pagination
  };
  const { updatePost, prependPost, replacePost, removePost } = useLevel();

  useEffect(() => {
    if (!commentModalVisible) return;

    setPage(1);
    fetchComments(1, true); // ✅ always first 5
  }, [commentModalVisible]);

  const LIKE_COLOR = "#E0245E";

  const mediaList = useMemo(
    () => resolveMediaUrls(Array.isArray(post?.media) ? post.media : []),
    [post?.media],
  );
  const reciteMediaList = Array.isArray(post?.reciteMedia)
    ? post.reciteMedia
    : [];

  const mediaCount = mediaList.length;

  const [quoteVisible, setQuoteVisible] = useState(false);
  const [loadingRecite, setLoadingRecite] = useState(false);
  const [loadingRecast, setLoadingRecast] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const gridWidth = width - 20;
  const itemSize = gridWidth / 2 - MEDIA_GAP;

  const isLiked = userDetails?.clerkId
    ? postCard?.likes?.includes(userDetails.clerkId)
    : false;
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const cardRef = useRef<View>(null);
  const likeButtonRef = useRef<View>(null);
  const [likeBubbleAnchor, setLikeBubbleAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const triggerLikeBurst = useCallback(() => {
    const card = cardRef.current;
    const likeBtn = likeButtonRef.current;
    if (!card || !likeBtn) {
      setLikeBurstKey((key) => key + 1);
      return;
    }
    likeBtn.measureLayout(
      card,
      (left, top, width, height) => {
        setLikeBubbleAnchor({ left, top, width, height });
        setLikeBurstKey((key) => key + 1);
      },
      () => setLikeBurstKey((key) => key + 1),
    );
  }, []);

  const closeMenu = () => setMenuVisible(false);
  const runMenuAction = (action: () => void) => {
    closeMenu();
    action();
  };

  const openMedia = (index: number) => {
    if (!postCard?._id && !postCard?.id) return;
    const postsWithMedia =
      Array.isArray(allPosts) && allPosts.length > 0
        ? allPosts.filter((item) => Array.isArray(item?.media) && item.media.length > 0)
        : [];
    const currentPostId = String(postCard._id ?? postCard.id ?? "");
    const hasCurrentPost = postsWithMedia.some(
      (item) => String(item?._id ?? item?.id ?? "") === currentPostId,
    );

    openMediaViewer({
      posts: hasCurrentPost ? postsWithMedia : [postCard, ...postsWithMedia],
      postId: currentPostId,
      mediaIndex: index,
      engagement: {
        commentsCount: visibleCommentsCount,
        quoteCount: postCard.quoteCount,
        recastCount: postCard.recastCount,
        likesCount: postCard.likes?.length ?? 0,
        views: postCard.views ?? 0,
        isLiked,
        recited,
        reposted,
        onComment: () => onOpenComments(postCard._id),
        onRecite: openReciteModal,
        onRecast: () => {
          if (!reposted) handleRecast("");
        },
        onLike: handleLike,
      },
    });
  };

  const [isMuted, setIsMuted] = useState(true); // default muted

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const visibleCommentsCount = Math.max(
    Number(postCard?.commentsCount) || 0,
    comments.length,
  );

  const spinValue = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(1)).current;
  const deleteScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!(post as any)?.__isDeleting) {
      deleteOpacity.setValue(1);
      deleteScale.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(deleteScale, {
        toValue: 0.98,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [deleteOpacity, deleteScale, post]);

  const toggleExpand = (postId: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

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

  const fetchComments = useCallback(
    async (pageNumber = 1, refresh = false) => {
      if (!postCard._id) return;

      try {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        const url = `${API_PUBLIC_URL}/api/comments/${postCard._id}?page=${pageNumber}&limit=5`;

        const res = await axios.get(url);

        const newComments = res.data ?? [];

        setHasMore(newComments.length === 5);

        if (refresh || pageNumber === 1) {
          setComments(newComments);
        } else {
          setComments((prev) => [...prev, ...newComments]);
        }
      } catch (err) {
        console.error("❌ Error fetching Comments:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [postCard._id],
  );

  // Fetch on mount or level change
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /* ---------------- BUTTON ANIMATIONS ---------------- */
  // Fix: Use Animated.Value from 'react-native' not 'react-native-reanimated'
  const animatedLike = useRef(new Animated.Value(1)).current;
  const animatedRepost = useRef(new Animated.Value(1)).current;

  const incrementViews = async () => {
    if (isTempPostId(postCard._id)) return;

    try {
      await axios.post(
        `${API_PUBLIC_URL}/api/posts/${postCard._id}/view`,
      );
      setPostCard((prev: any) => ({ ...prev, views: (prev.views || 0) + 1 }));
    } catch (err) {
      console.error("View increment failed:", err);
    }
  };

  const openReciteModal = useCallback(() => {
    setQuoteVisible(true);
    incrementViews();
  }, [postCard._id]);

  const incrementRecasts = async () => {
    if (isTempPostId(postCard._id)) return;

    try {
      await axios.post(
        `${API_PUBLIC_URL}/api/posts/${postCard._id}/recastCount`,
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
    if (isTempPostId(postCard._id)) return;

    try {
      await axios.post(
        `${API_PUBLIC_URL}/api/posts/${postCard._id}/reciteCount`,
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
    if (isTempPostId(postCard._id)) return;

    // Optimistic UI update
    const currentLikes = Array.isArray(postCard.likes) ? postCard.likes : [];
    const alreadyLiked = currentLikes.includes(userDetails.clerkId);
    const updatedLikes = alreadyLiked
      ? currentLikes.filter((id: string) => id !== userDetails.clerkId)
      : [...currentLikes, userDetails.clerkId];
    const updatedPost = { ...postCard, likes: updatedLikes };

    setPostCard(updatedPost);
    updatePost(updatedPost);
    onUpdatePost?.(updatedPost);
    if (!alreadyLiked) {
      triggerLikeBurst();
    }

    // Animate like button for feedback
    Animated.sequence([
      Animated.spring(animatedLike, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(animatedLike, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await axios.post(
        `${API_PUBLIC_URL}/api/posts/${postCard._id}/like`,
        { userId: userDetails.clerkId },
      );
      console.log("liked");
      await incrementViews(); // ✅ Increase views
    } catch (err) {
      console.error(err);
      // Rollback if backend fails
      setPostCard(postCard);
      updatePost(postCard);
      onUpdatePost?.(postCard);
    }
  };

  const handleEdit = async (data: {
    caption?: string;
    quote?: string;
    media: string[];
    linkPreview?: any;
  }) => {
    if (!userDetails.clerkId) return;

    setLoadingEdit(true);

    try {
      // Upload only new files
      const uploadedMedia = await Promise.all(
        data.media.map(async (item) => {
          const uploaded = await uploadLocalMedia(
            item,
            isVideoMedia(item) ? "video" : "image",
          );
          return uploaded ?? item;
        }),
      );

      const res = await axios.put(
        `${API_PUBLIC_URL}/api/posts/${postCard._id}`,
        {
          caption: data.caption,
          media: uploadedMedia, // ✅ always array
          userId: userDetails.clerkId,
          linkPreview: data.linkPreview || null,
          quote: data.quote,
        },
      );

      const updatedPost = res.data;

      setPostCard(updatedPost);
      onUpdatePost?.(updatedPost);
      onRefresh?.();

      setEditVisible(false);
    } catch (err) {
      console.error("Edit failed:", err);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleRecite = async (text: string) => {
    if (!userDetails?.clerkId || !postCard) return;

    const tempId = `temp-recite-${Date.now()}`;
    const optimistic = buildOptimisticSharePost({
      type: "recite",
      tempId,
      userDetails,
      sourcePost: postCard,
      quote: text,
    });

    prependPost(optimistic);
    onPrependPost?.(optimistic);
    setRecited(true);
    setQuoteVisible(false);
    setLoadingRecite(true);

    const payload = {
      userId: userDetails.clerkId,
      reciteUserId: postCard.user?.clerkId || postCard.userId,
      reciteImage: postCard.user?.image,
      reciteFirstName: postCard.user?.firstName || postCard.user?.companyName,
      reciteLastName: postCard.user?.lastName,
      reciteNickName: postCard.user?.nickName || "Anonymous",
      caption: postCard.caption,
      reciteMedia: postCard.media,
      levelType: postCard.levelType,
      levelValue: postCard.levelValue,
      quote: text,
      originalPostId: postCard._id || null,
      type: "recite",
    };

    try {
      const res = await axios.post(
        `${API_PUBLIC_URL}/api/posts`,
        payload,
      );

      const created = res.data;
      replacePost(tempId, created);
      onPrependPost?.(created);

      await incrementViews();
      await incrementRecite();
    } catch (err) {
      console.error(err);
      removePost(tempId);
      onRemovePost?.(tempId);
      setRecited(false);
    } finally {
      setLoadingRecite(false);
    }
  };
  // Prepare the recast payload

  // recast
  const handleRecast = async (text: string) => {
    if (!userDetails?.clerkId || !postCard) return;

    const tempId = `temp-recast-${Date.now()}`;
    const optimistic = buildOptimisticSharePost({
      type: "recast",
      tempId,
      userDetails,
      sourcePost: postCard,
      quote: text || null,
    });

    prependPost(optimistic);
    onPrependPost?.(optimistic);
    setReposted(true);
    setQuoteVisible(false);
    setLoadingRecast(true);

    const payload = {
      userId: userDetails.clerkId,
      originalPostId: postCard._id,
      caption: postCard.caption || "",
      quote: text || null,
      levelType: postCard.levelType,
      levelValue: postCard.levelValue,
      type: "recast",
      reciteUserId: postCard?.user?.clerkId || "",
      reciteFirstName: postCard?.user?.firstName || postCard?.user?.companyName,
      reciteLastName: postCard?.user?.lastName || "",
      reciteNickName: postCard?.user?.nickName || "",
      reciteImage: postCard?.user?.image || "",
    };

    try {
      const res = await axios.post(
        `${API_PUBLIC_URL}/api/posts`,
        payload,
      );

      replacePost(tempId, res.data);
      onPrependPost?.(res.data);

      const updated = {
        ...postCard,
        recastCount: (postCard.recastCount || 0) + 1,
      };

      setPostCard(updated);
      updatePost(updated);
      onUpdatePost?.(updated);

      await incrementRecasts();
      await incrementViews();
    } catch (err) {
      console.error("❌ Error reposting:", err);
      removePost(tempId);
      onRemovePost?.(tempId);
      setReposted(false);
    } finally {
      setLoadingRecast(false);
    }
  };

  const confirmDeletePost = async () => {
    const postId = postCard._id;
    setLoadingDelete(true);
    setDeleteVisible(false);

    removePost(postId);
    onDeletePost?.(postId);

    if (isTempPostId(postId)) {
      setLoadingDelete(false);
      return;
    }

    try {
      await axios.delete(
        `${API_PUBLIC_URL}/api/posts/${postId}`,
        {
          data: { userId: userDetails.clerkId },
        },
      );
    } catch (err) {
      console.error("❌ Delete failed:", err);
      onRefresh?.();
    } finally {
      setLoadingDelete(false);
    }
  };

  const text = postCard.quote ? postCard.quote : postCard.caption;

  const isExpanded = expandedStates[postCard._id];

  const isOwner = userDetails?.clerkId === postCard.userId;

  const isRecite = postCard.type === "recite";
  const constituency = formatConstituency(
    postCard.levelValue,
    postCard.levelType,
  );

  /* ---------------- LINK DETECTION ---------------- */
  const detectedUrl = extractUrls(text)[0];

  const linkPreview = Array.isArray(postCard.linkPreview)
    ? postCard.linkPreview[0]
    : postCard.linkPreview || null;

  const topLinkPreview = isRecite ? null : linkPreview;

  const findMentionEntry = (handle: string, mentions: any[]) => {
    const h = stripNickPrefix(handle).toLowerCase();
    if (!h || !mentions?.length) return null;

    for (const m of mentions) {
      if (typeof m === "string") {
        if (stripNickPrefix(m).toLowerCase() === h) {
          return { nickName: stripNickPrefix(m) };
        }
        continue;
      }
      const nick = stripNickPrefix(m?.nickName || m?.nickname).toLowerCase();
      if (nick === h) return m;
    }
    return null;
  };

  const openMentionProfile = useCallback(
    async (rawHandle: string, mentions: any[]) => {
      const handle = stripNickPrefix(rawHandle);
      if (!handle) return;

      const entry = findMentionEntry(handle, mentions);
      const userId = entry?.userId || entry?.clerkId;
      if (userId) {
        router.push(`/(profileId)/${userId}`);
        return;
      }

      try {
        const { data } = await axios.get(
          `${API_PUBLIC_URL}/api/users/by-nick/${encodeURIComponent(handle)}`,
        );
        if (data?.clerkId) {
          router.push(`/(profileId)/${data.clerkId}`);
        }
      } catch {
        Alert.alert(
          "Profile not found",
          `No user found for @${handle}.`,
        );
      }
    },
    [],
  );

  const renderCaptionWithMentions = (text: string, mentions: any[]) => {
    const parts = text.split(/(@+[A-Za-z0-9_]+)/g);

    return parts.map((part, index) => {
      if (/^@+/.test(part)) {
        const handle = stripNickPrefix(part);

        return (
          <Text
            key={index}
            onPress={() => openMentionProfile(handle, mentions)}
            style={{ color: civic.mention, fontWeight: "700" }}
          >
            {formatNickHandle(handle)}
          </Text>
        );
      }

      return (
        <Text key={index} style={{ color: theme.text }}>
          {part}
        </Text>
      );
    });
  };

  const displayName =
    postCard.userId === userDetails?.clerkId
      ? userDetails?.firstName || userDetails?.companyName
      : postCard.user?.firstName || postCard.user?.companyName;
  const avatarUri =
    postCard.userId === userDetails?.clerkId
      ? userDetails?.image
      : postCard.user?.image;
  const isVerifiedUser =
    postCard.userId === userDetails?.clerkId
      ? userDetails?.isVerified
      : postCard.user?.isVerified;
  const authorLiveId =
    postCard.user?.clerkId ?? postCard.userId ?? postCard.user?._id;

  if (!post) return null;

  return (
    <>
      <Animated.View
        ref={cardRef}
        collapsable={false}
        style={[
          styles.card,
          { backgroundColor: theme.card },
          {
            opacity: deleteOpacity,
            transform: [{ scale: deleteScale }],
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push(`/(profileId)/${postCard.userId}`)}
            style={styles.headerLeft}
          >
            <PresenceAvatar
              userId={authorLiveId}
              size={40}
              imageUri={avatarUri}
              verified={isVerifiedUser}
            />
            <View style={styles.headerMeta}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.displayName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <PresenceLiveLabel userId={authorLiveId} />
                <PresenceAudioLabel userId={authorLiveId} />
                <VerifiedBadge isVerified={isVerifiedUser} size={13} />
              </View>
              <Text
                style={[styles.handle, { color: theme.subtext }]}
                numberOfLines={1}
              >
                {formatNickHandle(postCard.user?.nickName)}
              </Text>
              {constituency ? (
                <View
                  style={[
                    styles.constituencyChip,
                    {
                      backgroundColor: civic.chipBg,
                      borderColor: civic.chipText,
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={10}
                    color={civic.chipText}
                  />
                  <Text
                    style={[styles.constituencyText, { color: civic.chipText }]}
                  >
                    {constituency.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.headerRight}>
            <View
              style={[styles.timePill, { backgroundColor: civic.actionBar }]}
            >
              <Text style={[styles.timeText, { color: theme.subtext }]}>
                {moment(postCard.createdAt).fromNow().toUpperCase()}
              </Text>
            </View>

            <Pressable onPress={() => setMenuVisible(true)} hitSlop={10}>
              <Feather name="more-vertical" size={20} color={theme.subtext} />
            </Pressable>
          </View>
        </View>
        {/* COLLAPSIBLE CAPTION */}
        {text ? (
          <View style={styles.captionBlock}>
            <Text
              numberOfLines={isExpanded ? undefined : 4}
              style={[styles.captionText, { color: theme.text }]}
            >
              {renderCaptionWithMentions(text, postCard.mentions || [])}
            </Text>

            {text.length > 80 && (
              <TouchableOpacity onPress={() => toggleExpand(postCard._id)}>
                <Text style={[styles.readMore, { color: civic.chipText }]}>
                  {isExpanded ? "Collapse" : "Read full statement"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* LINK PREVIEW (ALWAYS OUTSIDE TEXT) */}
        {topLinkPreview ? (
          <LinkPreviewCard
            preview={topLinkPreview}
            theme={theme}
            isDark={isDark}
          />
        ) : !isRecite && detectedUrl ? (
          <Pressable
            onPress={() => Linking.openURL(detectedUrl)}
            style={[
              styles.urlFallback,
              { borderColor: civic.cardBorder, backgroundColor: theme.card },
            ]}
          >
            <Feather name="external-link" size={14} color={civic.chipText} />
            <Text
              numberOfLines={1}
              style={[styles.urlFallbackText, { color: civic.chipText }]}
            >
              {detectedUrl}
            </Text>
          </Pressable>
        ) : null}

        {postCard.type === "recite" ? (
          <View
            style={[
              styles.chamberQuote,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
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
                  style={{ fontWeight: "700", fontSize: 10, color: theme.text }}
                >
                  {postCard?.reciteFirstName || postCard?.reciteCompanyName}
                </Text>
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 9,
                    color: theme.subtext,
                  }}
                >
                  {postCard?.reciteNickName}
                </Text>
              </View>
            </View>
            {reciteMediaList.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <PostMediaGrid
                  uris={reciteMediaList}
                  containerWidth={width - 48}
                  onPressItem={openMedia}
                  isVisible={isVisible}
                  useInlineVideo
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted((p) => !p)}
                />
              </View>
            )}

            <Text
              style={{ fontStyle: "italic", marginTop: 2, color: theme.text }}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {/* RECITE TEXT */}
              {postCard.caption ? (
                <View>
                  <Text
                    numberOfLines={isExpanded ? undefined : 3}
                    style={{
                      fontStyle: "italic",
                      color: theme.text,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {postCard.caption}
                  </Text>

                  {postCard.caption.length > 80 && (
                    <TouchableOpacity
                      onPress={() => toggleExpand(postCard._id)}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          marginTop: 4,
                          fontWeight: "600",
                        }}
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* RECITE LINK PREVIEW */}
              {linkPreview ? (
                <LinkPreviewCard
                  preview={linkPreview}
                  theme={theme}
                  isDark={isDark}
                />
              ) : detectedUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(detectedUrl)}
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 10,
                    width: "100%",
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  }}
                >
                  <Text style={{ color: theme.primary }}>{detectedUrl}</Text>
                </Pressable>
              ) : null}
            </Text>
          </View>
        ) : (
          mediaList.length > 0 && (
            <View style={styles.mainMediaWrap}>
              <PostMediaGrid
                uris={mediaList}
                containerWidth={gridWidth}
                onPressItem={openMedia}
                isVisible={isVisible}
              />
            </View>
          )
        )}

        {postCard.type == "recite" && (
          <View style={styles.attributionBar}>
            <Text style={[styles.attributionText, { color: theme.subtext }]}>
              Recited by{" "}
              <Link
                href={`/(profileId)/${postCard?.user.clerkId}`}
                style={{ color: civic.mention, fontWeight: "700" }}
              >
                {postCard?.user.nickName}
              </Link>
            </Text>
          </View>
        )}
        {postCard.type == "recast" && (
          <View style={styles.attributionBar}>
            <Text style={[styles.attributionText, { color: theme.subtext }]}>
              Recasted by{" "}
              <Link
                href={`/(profileId)/${postCard?.user.clerkId}`}
                style={{ color: civic.mention, fontWeight: "700" }}
              >
                {postCard?.user.nickName}
              </Link>{" "}
            </Text>
          </View>
        )}

        {/* CIVIC ENGAGEMENT BAR */}
        <View
          style={[
            styles.actionBar,
            {  borderColor: civic.cardBorder },
          ]}
        >
          <Pressable
            onPress={() => onOpenComments(postCard._id)}
            style={styles.actionItem}
          >
            <Feather name="message-circle" size={17} color={theme.subtext} />
            <Text style={[styles.actionCount, { color: theme.subtext }]}>
              {visibleCommentsCount > 0 ? visibleCommentsCount : ""}
            </Text>
          </Pressable>

          <Pressable onPress={openReciteModal} style={styles.actionItem}>
            <MaterialCommunityIcons
              name="comment-quote-outline"
              size={18}
              color={recited ? civic.chipText : theme.subtext}
            />
            <Text style={[styles.actionCount, { color: theme.subtext }]}>
              {postCard.quoteCount > 0 ? postCard.quoteCount : ""}
            </Text>
          </Pressable>

          <Animated.View style={animatedRepost}>
            <Pressable
              onPress={() => {
                if (!reposted) handleRecast("");
              }}
              style={styles.actionItem}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Entypo
                  name="cycle"
                  size={17}
                  color={reposted ? civic.chipText : theme.subtext}
                />
              </Animated.View>
              <Text
                style={[
                  styles.actionCount,
                  { color: reposted ? civic.chipText : theme.subtext },
                ]}
              >
                {postCard.recastCount > 0 ? postCard.recastCount : ""}
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={animatedLike}>
            <View ref={likeButtonRef} collapsable={false}>
              <Pressable
                onPress={handleLike}
                style={[styles.actionItem, styles.actionBubbleHost]}
              >
              {isLiked ? (
                <AntDesign name="heart" size={17} color={LIKE_COLOR} />
              ) : (
                <Feather name="heart" size={17} color={theme.subtext} />
              )}
              <Text
                style={[
                  styles.actionCount,
                  { color: isLiked ? LIKE_COLOR : theme.subtext },
                ]}
              >
                {postCard.likes?.length > 0 ? postCard.likes.length : ""}
              </Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.actionItem}>
            <Feather name="eye" size={17} color={theme.subtext} />
            <Text style={[styles.actionCount, { color: theme.subtext }]}>
              {postCard.views ?? 0}
            </Text>
          </View>
        </View>

        {likeBurstKey > 0 && likeBubbleAnchor ? (
          <View
            pointerEvents="none"
            style={[
              styles.likeBubbleOverlay,
              {
                left: likeBubbleAnchor.left,
                top: Math.max(0, likeBubbleAnchor.top - 56),
                width: likeBubbleAnchor.width,
                height: likeBubbleAnchor.height + 56,
              },
            ]}
          >
            <LikeBubbles burstKey={likeBurstKey} color={LIKE_COLOR} />
          </View>
        ) : null}
      </Animated.View>

      {/* POST OPTIONS BOTTOM SHEET */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <Pressable
            style={[styles.menuSheet, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: theme.border },
              ]}
            />
            <Text style={[styles.menuSheetTitle, { color: theme.text }]}>
              Post options
            </Text>

            {isOwner && (
              <PostMenuRow
                icon="edit-2"
                label="Edit post"
                color={theme.text}
                borderColor={theme.border}
                onPress={() => runMenuAction(() => setEditVisible(true))}
              />
            )}
            <PostMenuRow
              icon="bookmark"
              label="Save"
              color={theme.text}
              borderColor={theme.border}
              onPress={() => runMenuAction(() => alert("Save post"))}
            />
            <PostMenuRow
              icon="share-2"
              label="Share"
              color={theme.text}
              borderColor={theme.border}
              onPress={() => runMenuAction(() => alert("Share post"))}
            />
            <PostMenuRow
              icon="flag"
              label="Report"
              color="#9E9505"
              borderColor={theme.border}
              onPress={() => runMenuAction(() => alert("Report post"))}
            />
            <PostMenuRow
              icon="slash"
              label="Block"
              color="#DC2626"
              borderColor={theme.border}
              onPress={() => runMenuAction(() => alert("Block user"))}
            />
            {isOwner && (
              <PostMenuRow
                icon="trash-2"
                label="Delete"
                color="#DC2626"
                borderColor={theme.border}
                showBorder={false}
                onPress={() => runMenuAction(() => setDeleteVisible(true))}
              />
            )}

            <Pressable
              style={[styles.menuCancelBtn, { backgroundColor: theme.background }]}
              onPress={closeMenu}
            >
              <Text style={[styles.menuCancelText, { color: theme.subtext }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
                fontSize: 15,
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
                marginTop: 4,
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
        postCard={postCard}
        mediaList={mediaList}
        comments={comments}
        mediaCount={mediaCount}
        width={width}
        itemSize={itemSize}
        theme={theme}
        setComments={setComments}
        userId={userDetails?.clerkId}
        userName={userDetails?.nickName}
        userImage={userDetails?.image}
      />

      {/* reciteModal — always mounted; visibility via prop (same as CommentModal) */}
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
        handleRecite={handleRecite}
      />

      {/* //Edit Modal */}
      <EditModal
        editVisible={editVisible}
        setEditVisible={setEditVisible}
        loadingEdit={loadingEdit}
        postCard={postCard}
        theme={theme}
        mediaList={mediaList}
        mediaCount={mediaCount}
        width={width}
        itemSize={itemSize}
        handleEdit={handleEdit}
      />

    </>
  );
}

function PostMenuRow({
  icon,
  label,
  color,
  borderColor,
  onPress,
  showBorder = true,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  color: string;
  borderColor: string;
  onPress: () => void;
  showBorder?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuRow,
        showBorder && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.menuRowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 2,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  mainMediaWrap: {
    paddingHorizontal: 10,
    marginTop: 6,
    zIndex: 1,
  },
  typeRibbon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  typeRibbonText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    zIndex: 10,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  avatarRingVerified: {
    borderColor: PoliticalPalette.gold,
  },
  avatarRingLive: {
    borderColor: "#FF0033",
    borderWidth: 2,
    shadowColor: "#FF0033",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  liveBadge: {
    position: "absolute",
    left: -1,
    right: -1,
    bottom: -7,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: "#FF0033",
    borderWidth: 1,
    borderColor: "#fff",
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  headerMeta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  displayName: { fontSize: 13, fontWeight: "800", flexShrink: 1 },
  handle: { fontSize: 11, fontWeight: "600" },
  constituencyChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  constituencyText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  captionBlock: {
    paddingHorizontal: 14,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  readMore: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  briefingCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  briefingImage: { width: "100%", height: 160 },
  briefingBody: { padding: 12 },
  briefingLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  briefingTitle: { fontSize: 14, fontWeight: "800" },
  briefingDesc: { marginTop: 4, fontSize: 11, lineHeight: 17 },
  briefingUrl: { marginTop: 6, fontSize: 10, fontWeight: "600" },
  urlFallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  urlFallbackText: { flex: 1, fontSize: 11, fontWeight: "600" },
  chamberQuote: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  attributionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    // paddingVertical: 8,
  },
  attributionText: { fontSize: 11, fontWeight: "600", flex: 1, lineHeight: 18 },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 50,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
  },
  actionItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    paddingVertical: 2,
    flexDirection: "row",
    gap: 4,
  },
  actionBubbleHost: {
    position: "relative",
    overflow: "visible",
    zIndex: 40,
  },
  likeBubbleOverlay: {
    position: "absolute",
    overflow: "visible",
    zIndex: 200,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  actionCount: {
    fontSize: 10,
    fontWeight: "800",
    minHeight: 14,
  },
  actionLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  commentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    margin: 2,
    zIndex: 20,
  },
  linkPreview: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 12,
    flexDirection: "row",
  },
  linkImage: {
    width: 100,
    height: 100,
  },
  linkContent: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  linkDesc: {
    fontSize: 11,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 10,
  },
  linkClose: {
    padding: 8,
    justifyContent: "center",
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  menuSheetTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  menuCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
