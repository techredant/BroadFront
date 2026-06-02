import React, {
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import {
  AntDesign,
  Entypo,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import moment from "moment";
import { router } from "expo-router";
import { MediaPostPager } from "@/components/posts/MediaPostPager";
import { EdgeSwipeHint } from "@/components/posts/EdgeSwipeHint";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LikeBubbles } from "@/components/posts/LikeBubbles";
import { isVideoMedia, resolveMediaUrls } from "@/utils/mediaUtils";
import { formatNickHandle } from "@/utils/nickName";
import { useActivePostTracking } from "@/hooks/useActivePostTracking";
import { useMediaViewerPostActions } from "@/hooks/useMediaViewerPostActions";
import { formatConstituency } from "@/constants/politicalTheme";
import { useTheme } from "@/context/ThemeContext";

const LIKE_COLOR = "#E0245E";
const ACTIVE_ACCENT = "#8AB4F8";
const SPRING = { damping: 18, stiffness: 240, mass: 0.85 };

export type MediaViewerEngagement = {
  commentsCount?: number;
  quoteCount?: number;
  recastCount?: number;
  likesCount?: number;
  views?: number;
  isLiked?: boolean;
  recited?: boolean;
  reposted?: boolean;
  onComment?: () => void;
  onRecite?: () => void;
  onRecast?: () => void;
  onLike?: () => void;
};

type MediaViewerPost = {
  _id?: string;
  id?: string;
  media?: string[];
  [key: string]: any;
};

type Props = {
  modalVisible: boolean;
  setModalVisible: (v: boolean) => void;
  mediaList: string[];
  selectedIndex: number;
  post?: MediaViewerPost;
  posts?: MediaViewerPost[];
  engagement?: MediaViewerEngagement;
  pinchGesture?: any;
  pinchStyle?: any;
  totalPosts?: number;
  currentPostIndex?: number;
  onPostChange?: (index: number, mediaIndex: number) => void;
  onMediaIndexChange?: (index: number) => void;
  getPostId?: (index: number) => string | undefined;
  mediaIndexByPostIdRef?: MutableRefObject<Map<string, number>>;
};

function hasMedia(item: MediaViewerPost) {
  return Array.isArray(item.media) && item.media.length > 0;
}

function PageDot({ active }: { active: boolean }) {
  return (
    <View style={[styles.dot, active && styles.dotActive]}>
      {active ? <View style={styles.dotActiveInner} /> : null}
    </View>
  );
}

function ActionItem({
  onPress,
  disabled,
  children,
  count,
  countColor = "rgba(255,255,255,0.85)",
}: {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  count?: number;
  countColor?: string;
}) {
  const showCount = typeof count === "number" && count > 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.actionItem,
        pressed && onPress && styles.actionItemPressed,
      ]}
      hitSlop={6}
    >
      {children}
      {showCount ? (
        <Text style={[styles.actionCount, { color: countColor }]}>{count}</Text>
      ) : (
        <Text style={styles.actionCountSpacer} />
      )}
    </Pressable>
  );
}

export function MediaViewerModal({
  modalVisible,
  setModalVisible,
  mediaList,
  selectedIndex,
  post,
  posts,
  engagement,
  pinchGesture,
  pinchStyle,
  currentPostIndex = 0,
  onPostChange,
  onMediaIndexChange,
  getPostId,
  mediaIndexByPostIdRef,
}: Props) {
  const { width, height } = useWindowDimensions();
  const { isDark } = useTheme();
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [engagementOverrides, setEngagementOverrides] = useState<
    Record<string, Partial<MediaViewerEngagement>>
  >({});
  const [hintDirection, setHintDirection] = useState<"up" | "down" | undefined>();
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const localPinchScale = useSharedValue(1);

  const viewerPosts = useMemo(() => {
    const source =
      posts && posts.length > 0
        ? posts
        : post
          ? [{ ...post, media: post.media ?? mediaList }]
          : [{ _id: "standalone", media: mediaList }];
    const mediaPosts = source.filter(hasMedia);
    return mediaPosts.length > 0 ? mediaPosts : source;
  }, [mediaList, post, posts]);

  const {
    activePost,
    activePostIndex,
    activeMediaIndex,
    getId,
    getMediaIndex,
    setActivePost,
    setMediaIndexForPost,
  } = useActivePostTracking({
    visible: modalVisible,
    posts: viewerPosts,
    initialPostIndex: currentPostIndex,
    initialMediaIndex: selectedIndex,
    onPostChange,
    onMediaIndexChange,
    getPostId,
    mediaIndexByPostIdRef,
  });

  const activeMedia = useMemo(
    () => resolveMediaUrls(Array.isArray(activePost?.media) ? activePost.media : []),
    [activePost],
  );
  const totalMedia = activeMedia.length;
  const activeMediaItem = activeMedia[activeMediaIndex];
  const activePostId = getId(activePostIndex);
  const canNavigateNextPost = activePostIndex < viewerPosts.length - 1;
  const canNavigatePrevPost = activePostIndex > 0;

  const authorName = useMemo(() => {
    if (!activePost) return "";
    return (
      activePost.user?.firstName ||
      activePost.user?.companyName ||
      activePost.firstName ||
      activePost.companyName ||
      "User"
    );
  }, [activePost]);

  const authorAvatar = activePost?.user?.image || activePost?.image;
  const authorNick = activePost?.user?.nickName || activePost?.nickName;
  const authorId =
    activePost?.userId || activePost?.user?.clerkId || activePost?.user?._id;
  const isVerified = activePost?.user?.isVerified ?? activePost?.isVerified;
  const caption = (activePost?.caption || activePost?.content || "").trim();
  const timeLabel = activePost?.createdAt ? moment(activePost.createdAt).fromNow() : "";
  const postLevelLabel = formatConstituency(
    activePost?.levelValue,
    activePost?.levelType,
  );

  const fallbackEngagement = useMediaViewerPostActions(activePost, {
    onAfterLike: () => setLikeBurstKey((key) => key + 1),
  });

  const baseEngagement = useMemo<MediaViewerEngagement>(() => {
    const likes = Array.isArray(activePost?.likes)
      ? activePost.likes.length
      : activePost?.likesCount;
    return {
      commentsCount:
        engagement?.commentsCount ??
        activePost?.commentsCount ??
        activePost?.commentCount ??
        fallbackEngagement.commentsCount,
      quoteCount:
        engagement?.quoteCount ??
        activePost?.quoteCount ??
        activePost?.reciteCount ??
        fallbackEngagement.quoteCount,
      recastCount:
        engagement?.recastCount ??
        activePost?.recastCount ??
        fallbackEngagement.recastCount,
      likesCount: engagement?.likesCount ?? likes ?? fallbackEngagement.likesCount,
      views: engagement?.views ?? activePost?.views ?? fallbackEngagement.views,
      isLiked: engagement?.isLiked ?? fallbackEngagement.isLiked,
      recited: engagement?.recited,
      reposted: engagement?.reposted,
      onComment: engagement?.onComment,
      onRecite: engagement?.onRecite,
      onRecast: engagement?.onRecast,
      onLike: engagement?.onLike ?? fallbackEngagement.onLike,
    };
  }, [activePost, engagement, fallbackEngagement]);

  const viewerEngagement = useMemo<MediaViewerEngagement>(
    () => ({
      ...baseEngagement,
      ...engagementOverrides[activePostId],
    }),
    [activePostId, baseEngagement, engagementOverrides],
  );

  const hasEngagement = Boolean(
    activePost ||
      viewerEngagement.onComment ||
      viewerEngagement.onRecite ||
      viewerEngagement.onRecast ||
      viewerEngagement.onLike,
  );

  const enhancedPinchGesture = useMemo(
    () =>
      pinchGesture
        ? pinchGesture
            .runOnJS(true)
            .onStart(() => setIsZooming(true))
            .onEnd(() => setIsZooming(false))
        : Gesture.Pinch()
            .runOnJS(true)
            .onStart(() => setIsZooming(true))
            .onUpdate((event) => {
              localPinchScale.value = event.scale;
            })
            .onEnd(() => {
              localPinchScale.value = withSpring(1, SPRING);
              setIsZooming(false);
            }),
    [localPinchScale, pinchGesture],
  );

  const localPinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: localPinchScale.value }],
  }));

  const showEdgeHint = useCallback((direction: "up" | "down") => {
    setHintDirection(direction);
    setHintVisible(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintVisible(false), 1400);
  }, []);

  useEffect(() => {
    setCaptionExpanded(false);
    setVideoBuffering(false);
  }, [activePostIndex, activeMediaIndex]);

  useEffect(() => {
    if (!modalVisible) {
      setEngagementOverrides({});
    }
  }, [modalVisible]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const close = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCaptionExpanded(false);
    setModalVisible(false);
  }, [setModalVisible]);

  useEffect(() => {
    if (!modalVisible) return;

    StatusBar.setBarStyle("light-content", true);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#000000");
      StatusBar.setTranslucent(false);
    }

    return () => {
      StatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("transparent");
        StatusBar.setTranslucent(true);
      }
    };
  }, [modalVisible, isDark]);

  const runAction = (fn?: () => void) => {
    if (!fn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  const runLikeAction = () => {
    if (!viewerEngagement.onLike) return;
    const nextLiked = !viewerEngagement.isLiked;
    const currentLikes = viewerEngagement.likesCount ?? 0;

    setEngagementOverrides((prev) => ({
      ...prev,
      [activePostId]: {
        ...prev[activePostId],
        isLiked: nextLiked,
        likesCount: Math.max(currentLikes + (nextLiked ? 1 : -1), 0),
      },
    }));

    if (!viewerEngagement.isLiked) {
      setLikeBurstKey((key) => key + 1);
    }
    runAction(viewerEngagement.onLike);
  };

  const runReciteAction = () => {
    if (!viewerEngagement.onRecite) return;
    close();
    setTimeout(() => runAction(viewerEngagement.onRecite), 0);
  };

  const runRecastAction = () => {
    if (!viewerEngagement.onRecast) return;
    close();
    setTimeout(() => runAction(viewerEngagement.onRecast), 0);
  };

  const runCommentAction = () => {
    if (!viewerEngagement.onComment) return;
    runAction(viewerEngagement.onComment);
  };

  const effectivePinchStyle = pinchStyle ?? localPinchStyle;
  const showBottomChrome = totalMedia > 1 || Boolean(activePost) || hasEngagement;

  return (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={false}
      onRequestClose={close}
    >
      <ExpoStatusBar style="light" backgroundColor="#000000" />
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.root} pointerEvents="box-none">
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <MediaPostPager
            posts={viewerPosts}
            width={width}
            height={height}
            activePostIndex={activePostIndex}
            getPostId={getId}
            getMediaIndex={getMediaIndex}
            setActivePost={setActivePost}
            setMediaIndexForPost={setMediaIndexForPost}
            onEdgeHint={showEdgeHint}
            zoomStyle={effectivePinchStyle}
            pinchGesture={enhancedPinchGesture}
            isZooming={isZooming}
            onBufferingChange={setVideoBuffering}
            showVideoControls={false}
          />
        </View>

        <LinearGradient
          colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.4)", "transparent"]}
          style={styles.topGradient}
          pointerEvents="box-none"
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={22} color="#fff" />
            </Pressable>

            <View style={styles.counterCenter} pointerEvents="none">
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>
                  {`${activeMediaIndex + 1} / ${Math.max(totalMedia, 1)}`}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {showBottomChrome ? (
          <View style={styles.bottomChrome} pointerEvents="box-none">
            {totalMedia > 1 ? (
              <View style={styles.dotsRow}>
                {activeMedia.map((_, i) => (
                  <PageDot key={i} active={i === activeMediaIndex} />
                ))}
              </View>
            ) : null}

            {activePost ? (
              <View
                key={activePostId}
                style={styles.postMeta}
                pointerEvents="box-none"
              >
                <Pressable
                  style={styles.authorRow}
                  onPress={() => {
                    if (authorId) {
                      close();
                      router.push(`/(profileId)/${authorId}`);
                    }
                  }}
                >
                  {authorAvatar ? (
                    <Image
                      source={{ uri: authorAvatar }}
                      style={styles.authorAvatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.authorAvatar, styles.avatarFallback]}>
                      <Feather name="user" size={18} color="#fff" />
                    </View>
                  )}
                  <View style={styles.authorTextCol}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName} numberOfLines={1}>
                        {authorName}
                      </Text>
                      <VerifiedBadge isVerified={isVerified} size={14} />
                    </View>
                    {authorNick ? (
                      <Text style={styles.authorHandle} numberOfLines={1}>
                        {formatNickHandle(authorNick)}
                        {timeLabel ? ` · ${timeLabel}` : ""}
                      </Text>
                    ) : timeLabel ? (
                      <Text style={styles.authorHandle}>{timeLabel}</Text>
                    ) : null}
                  </View>
                </Pressable>

                {postLevelLabel ? (
                  <View style={styles.levelChip}>
                    <Ionicons
                      name="location-outline"
                      size={11}
                      color="rgba(255,255,255,0.9)"
                    />
                    <Text style={styles.levelChipText} numberOfLines={1}>
                      {postLevelLabel.toUpperCase()}
                    </Text>
                  </View>
                ) : null}

                {caption ? (
                  <Pressable onPress={() => setCaptionExpanded((v) => !v)}>
                    <Text
                      style={styles.caption}
                      numberOfLines={captionExpanded ? undefined : 3}
                    >
                      {caption}
                    </Text>
                    {caption.length > 120 && !captionExpanded ? (
                      <Text style={styles.captionMore}>See more</Text>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {activeMediaItem && isVideoMedia(activeMediaItem) ? (
              <View style={styles.mediaTypeRow}>
                <Ionicons
                  name={videoBuffering ? "hourglass-outline" : "play-circle"}
                  size={16}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.mediaTypeLabel}>
                  {videoBuffering ? "Buffering" : "Video"}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {hasEngagement ? (
          <View style={styles.actionRail} pointerEvents="box-none">
            <View style={styles.actionRailInner} pointerEvents="auto">
              <ActionItem
                onPress={runCommentAction}
                count={viewerEngagement.commentsCount}
              >
                <View style={styles.actionIconWrap}>
                  <Feather
                    name="message-circle"
                    size={24}
                    color="rgba(255,255,255,0.95)"
                  />
                </View>
              </ActionItem>

              <ActionItem
                onPress={runReciteAction}
                count={viewerEngagement.quoteCount}
                countColor={
                  viewerEngagement.recited
                    ? ACTIVE_ACCENT
                    : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  <MaterialCommunityIcons
                    name="comment-quote-outline"
                    size={25}
                    color={
                      viewerEngagement.recited
                        ? ACTIVE_ACCENT
                        : "rgba(255,255,255,0.95)"
                    }
                  />
                </View>
              </ActionItem>

              <ActionItem
                onPress={runRecastAction}
                count={viewerEngagement.recastCount}
                countColor={
                  viewerEngagement.reposted
                    ? ACTIVE_ACCENT
                    : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  <Entypo
                    name="cycle"
                    size={24}
                    color={
                      viewerEngagement.reposted
                        ? ACTIVE_ACCENT
                        : "rgba(255,255,255,0.95)"
                    }
                  />
                </View>
              </ActionItem>

              <ActionItem
                onPress={runLikeAction}
                count={viewerEngagement.likesCount}
                countColor={
                  viewerEngagement.isLiked
                    ? LIKE_COLOR
                    : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  <LikeBubbles burstKey={likeBurstKey} color={LIKE_COLOR} />
                  {viewerEngagement.isLiked ? (
                    <AntDesign name="heart" size={24} color={LIKE_COLOR} />
                  ) : (
                    <Feather
                      name="heart"
                      size={24}
                      color="rgba(255,255,255,0.95)"
                    />
                  )}
                </View>
              </ActionItem>

              <ActionItem count={viewerEngagement.views}>
                <View style={styles.actionIconWrap}>
                  <Feather name="eye" size={24} color="rgba(255,255,255,0.8)" />
                </View>
              </ActionItem>
            </View>
          </View>
        ) : null}

        <EdgeSwipeHint
          direction={hintDirection}
          visible={hintVisible}
          canNavigate={
            hintDirection === "up"
              ? canNavigateNextPost
              : hintDirection === "down"
                ? canNavigatePrevPost
                : false
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 32,
  },
  bottomChrome: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 30,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counterCenter: { alignItems: "flex-end", justifyContent: "center" },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonPressed: { backgroundColor: "rgba(255,255,255,0.24)", transform: [{ scale: 0.96 }] },
  counterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  counterText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.3 },
  postMeta: { width: "100%", marginBottom: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  authorTextCol: { flex: 1 },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  authorName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  authorHandle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  levelChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "92%",
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  levelChipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  caption: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 21,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionMore: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "600", marginTop: 4 },
  actionRail: {
    position: "absolute",
    right: 10,
    top: 120,
    bottom: 160,
    zIndex: 100,
    elevation: 100,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionRailInner: { alignItems: "center", gap: 4 },
  actionIconWrap: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  actionItem: { alignItems: "center", justifyContent: "center", paddingVertical: 4, minWidth: 52, gap: 4 },
  actionItemPressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
  actionCount: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionCountSpacer: { height: 0 },
  mediaTypeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 },
  mediaTypeLabel: { color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "500", letterSpacing: 0.2 },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 80,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  dotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  dotActiveInner: { width: 22, height: 7, borderRadius: 4, backgroundColor: "#fff" },
});
