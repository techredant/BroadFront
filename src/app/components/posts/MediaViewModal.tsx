import React, { useCallback, useMemo } from "react";
import {
  Modal,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import {
  AntDesign,
  Entypo,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Video from "react-native-video";
import { Image } from "expo-image";
import LoaderKitView from "react-native-loader-kit";
import * as Haptics from "expo-haptics";
import moment from "moment";
import { router } from "expo-router";
import { isVideoMedia, resolveMediaUrls } from "@/utils/mediaUtils";
import { formatNickHandle } from "@/utils/nickName";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";

const LIKE_COLOR = "#E0245E";
const ACTIVE_ACCENT = "#8AB4F8";

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

type Props = {
  modalVisible: boolean;
  setModalVisible: (v: boolean) => void;
  mediaList: string[];
  selectedIndex: number;
  post?: any;
  engagement?: MediaViewerEngagement;
  pinchGesture: any;
  pinchStyle: any;
};

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
  engagement,
  pinchGesture,
  pinchStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const flatListRef = React.useRef<FlatList>(null);
  const resolvedMedia = useMemo(
    () => resolveMediaUrls(mediaList),
    [mediaList],
  );

  const [currentIndex, setCurrentIndex] = React.useState(selectedIndex);
  const [loadingVideoIndex, setLoadingVideoIndex] = React.useState<
    number | null
  >(null);
  const [isVideoReady, setIsVideoReady] = React.useState<
    Record<number, boolean>
  >({});
  const [isZooming, setIsZooming] = React.useState(false);
  const [captionExpanded, setCaptionExpanded] = React.useState(false);

  const total = resolvedMedia.length;
  const counterLabel = useMemo(
    () => `${currentIndex + 1} / ${total}`,
    [currentIndex, total],
  );

  const authorName = useMemo(() => {
    if (!post) return "";
    return (
      post.user?.firstName ||
      post.user?.companyName ||
      post.firstName ||
      post.companyName ||
      "User"
    );
  }, [post]);

  const authorAvatar = post?.user?.image || post?.image;
  const authorNick = post?.user?.nickName || post?.nickName;
  const authorId = post?.userId || post?.user?.clerkId || post?.user?._id;
  const isVerified = post?.user?.isVerified ?? post?.isVerified;
  const caption = (post?.caption || post?.content || "").trim();
  const timeLabel = post?.createdAt
    ? moment(post.createdAt).fromNow()
    : "";

  const hasEngagement = Boolean(
    engagement?.onComment ||
      engagement?.onRecite ||
      engagement?.onRecast ||
      engagement?.onLike,
  );

  const showBottomChrome = total > 1 || Boolean(post) || hasEngagement;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (typeof index === "number") setCurrentIndex(index);
    },
    [],
  );

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const enhancedPinchGesture = useMemo(
    () =>
      pinchGesture
        .runOnJS(true)
        .onStart(() => setIsZooming(true))
        .onEnd(() => setIsZooming(false)),
    [pinchGesture],
  );

  const close = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCaptionExpanded(false);
    setModalVisible(false);
  }, [setModalVisible]);

  React.useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  React.useEffect(() => {
    if (!modalVisible) {
      setIsVideoReady({});
      setLoadingVideoIndex(null);
      setCaptionExpanded(false);
      return;
    }

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
    });
  }, [modalVisible, selectedIndex]);

  const itemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const runAction = (fn?: () => void) => {
    if (!fn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={close}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.root}>
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          data={resolvedMedia}
          initialScrollIndex={selectedIndex}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item}-${index}`}
          getItemLayout={itemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled={!isZooming}
          decelerationRate="fast"
          bounces={total > 1}
          renderItem={({ item, index }) => {
            const video = isVideoMedia(item);
            const active = index === currentIndex;
            const isLoading = loadingVideoIndex === index;

            return (
              <View style={[styles.slide, { width, height }]}>
                {video ? (
                  <View style={styles.mediaFrame}>
                    {isLoading && (
                      <View style={styles.loadingOverlay}>
                        <View style={styles.loadingBadge}>
                          <LoaderKitView
                            style={styles.loaderIcon}
                            name="BallScaleRippleMultiple"
                            color="#fff"
                          />
                        </View>
                      </View>
                    )}

                    <Video
                      source={{
                        uri: item,
                        bufferConfig: {
                          minBufferMs: 2500,
                          maxBufferMs: 8000,
                          bufferForPlaybackMs: 1000,
                          bufferForPlaybackAfterRebufferMs: 1500,
                        },
                      }}
                      style={styles.media}
                      resizeMode="contain"
                      paused={!active}
                      repeat
                      controls={isVideoReady[index] === true}
                      onLoadStart={() => {
                        setLoadingVideoIndex(index);
                        setIsVideoReady((p) => ({ ...p, [index]: false }));
                      }}
                      onLoad={() => {
                        setLoadingVideoIndex(null);
                        setIsVideoReady((p) => ({ ...p, [index]: true }));
                      }}
                      onBuffer={({ isBuffering }) => {
                        setLoadingVideoIndex(isBuffering ? index : null);
                      }}
                    />
                  </View>
                ) : (
                  <GestureDetector gesture={enhancedPinchGesture}>
                    <Animated.View style={[styles.mediaFrame, pinchStyle]}>
                      <Image
                        source={{ uri: item }}
                        style={StyleSheet.absoluteFill}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    </Animated.View>
                  </GestureDetector>
                )}
              </View>
            );
          }}
        />

        <LinearGradient
          colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.4)", "transparent"]}
          style={[styles.topGradient, { paddingTop: insets.top + 8 }]}
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

            {total > 1 && (
              <View style={styles.counterCenter} pointerEvents="none">
                <View style={styles.counterPill}>
                  <Text style={styles.counterText}>{counterLabel}</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        {showBottomChrome && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
            style={[
              styles.bottomGradient,
              { paddingBottom: insets.bottom + 14 },
            ]}
            pointerEvents="box-none"
          >
            {post ? (
              <View style={styles.postMeta} pointerEvents="box-none">
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

            {resolvedMedia[currentIndex] &&
            isVideoMedia(resolvedMedia[currentIndex]) ? (
              <View style={styles.mediaTypeRow}>
                <Ionicons
                  name="play-circle"
                  size={16}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.mediaTypeLabel}>Video</Text>
              </View>
            ) : null}

            {total > 1 && (
              <View style={styles.dotsRow}>
                {resolvedMedia.map((_, i) => (
                  <PageDot key={i} active={i === currentIndex} />
                ))}
              </View>
            )}
          </LinearGradient>
        )}

        {hasEngagement ? (
          <View
            style={[
              styles.actionRail,
              {
                top: insets.top + 72,
                bottom: insets.bottom + (post ? 140 : 48),
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.actionRailInner} pointerEvents="auto">
              <ActionItem
                onPress={() => runAction(engagement?.onComment)}
                count={engagement?.commentsCount}
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
                onPress={() => runAction(engagement?.onRecite)}
                count={engagement?.quoteCount}
                countColor={
                  engagement?.recited
                    ? ACTIVE_ACCENT
                    : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  <MaterialCommunityIcons
                    name="comment-quote-outline"
                    size={25}
                    color={
                      engagement?.recited
                        ? ACTIVE_ACCENT
                        : "rgba(255,255,255,0.95)"
                    }
                  />
                </View>
              </ActionItem>

              <ActionItem
                onPress={() => runAction(engagement?.onRecast)}
                count={engagement?.recastCount}
                countColor={
                  engagement?.reposted
                    ? ACTIVE_ACCENT
                    : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  <Entypo
                    name="cycle"
                    size={24}
                    color={
                      engagement?.reposted
                        ? ACTIVE_ACCENT
                        : "rgba(255,255,255,0.95)"
                    }
                  />
                </View>
              </ActionItem>

              <ActionItem
                onPress={() => runAction(engagement?.onLike)}
                count={engagement?.likesCount}
                countColor={
                  engagement?.isLiked ? LIKE_COLOR : "rgba(255,255,255,0.9)"
                }
              >
                <View style={styles.actionIconWrap}>
                  {engagement?.isLiked ? (
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

              <ActionItem count={engagement?.views}>
                <View style={styles.actionIconWrap}>
                  <Feather
                    name="eye"
                    size={24}
                    color="rgba(255,255,255,0.8)"
                  />
                </View>
              </ActionItem>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  mediaFrame: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 2,
  },
  loadingBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderIcon: {
    width: 36,
    height: 36,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
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
  iconButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.24)",
    transform: [{ scale: 0.96 }],
  },
  counterPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  counterText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  postMeta: {
    width: "100%",
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  authorTextCol: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  authorHandle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 21,
  },
  captionMore: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  actionRail: {
    position: "absolute",
    right: 10,
    zIndex: 12,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionRailInner: {
    alignItems: "center",
    gap: 4,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minWidth: 52,
    gap: 4,
  },
  actionItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  actionCount: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionCountSpacer: {
    height: 0,
  },
  mediaTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
  },
  mediaTypeLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  dotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  dotActiveInner: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
