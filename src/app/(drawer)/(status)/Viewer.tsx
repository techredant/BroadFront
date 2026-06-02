import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Video from "react-native-video";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useChatContext } from "stream-chat-expo";
import { useAppContext } from "@/contexts/AppProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  sortStatusesForViewer,
  statusDisplayName,
} from "@/utils/statusUser";
import { useStatusProfileImage } from "@/hooks/useStatusProfileImage";
import {
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";
import {
  buildStreamDisplayName,
  upsertStreamUser,
  type StreamChatTarget,
} from "@/utils/streamUser";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";
import { writeStatusCache } from "@/utils/statusCache";
import {
  patchStatusViewed,
  resolveUserStatuses,
  warmStatusCachesForUsers,
  STATUS_PREVIEW_USER_LIMIT,
} from "@/utils/statusList";
import {
  markStatusViewedInMemory,
  prefetchStatusMedia,
  prefetchAdjacentUsers,
} from "@/utils/statusEngine";
import { useStoryPlayback } from "@/hooks/useStoryPlayback";
import { Image as ExpoImage } from "expo-image";
import { API_PUBLIC_URL } from "@/constants/api";
const POSTER_REPLY_BAR_HEIGHT = 58;
const { width, height } = Dimensions.get("window");

export type StatusViewRow = {
  userId: string;
  viewedAt?: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  companyName?: string;
  image?: string;
};

type StatusForChat = {
  _id?: string;
  userId?: string;
  caption?: string;
  media?: string[];
};

/** User reply plus story caption/media for Stream Chat. */
function buildStatusStoryStreamMessage(
  status: StatusForChat | null | undefined,
  userText: string,
) {
  const trimmed = userText.trim();
  const caption = (status?.caption ?? "").trim();
  const mediaUrl = status?.media?.[0]
    ? resolveMediaUrl(status.media[0])
    : null;
  const video = mediaUrl ? isVideoMedia(mediaUrl) : false;

  let text = trimmed;
  if (trimmed && caption) {
    text = `${trimmed}\n\n— ${caption}`;
  } else if (!text && caption) {
    text = caption;
  } else if (!text) {
    text = "Replied to your story";
  }

  const attachments: Record<string, unknown>[] = [];
  if (mediaUrl) {
    if (video) {
      attachments.push({
        type: "video",
        asset_url: mediaUrl,
        title: caption || "Story",
      });
    } else {
      attachments.push({
        type: "image",
        image_url: mediaUrl,
        thumb_url: mediaUrl,
        title: caption || "Story",
        fallback: caption || "Story",
      });
    }
  }

  return {
    text,
    ...(attachments.length > 0 ? { attachments } : {}),
    custom: {
      storyReply: true,
      statusId: status?._id,
      statusUserId: status?.userId,
      storyCaption: caption || undefined,
      storyMediaUrl: mediaUrl || undefined,
    },
  };
}

export function displayNameFromView(v: Partial<StatusViewRow>): string {
  const fn = (v.firstName ?? "").trim();
  const ln = (v.lastName ?? "").trim();
  const full = [fn, ln].filter(Boolean).join(" ").trim();
  if (full.length) return full;

  const nick = (v.nickName ?? "").trim();
  if (nick.length) return nick;

  const company = (v.companyName ?? "").trim();
  if (company.length) return company;

  const id = v.userId ?? "";
  if (id.length >= 4) return `User ···${id.slice(-4)}`;
  return "User";
}

export default function Viewer() {
  const { user, userList, userIndex } = useLocalSearchParams();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user: clerkUser } = useUser();
  const { userDetails } = useLevel();
  const { client } = useChatContext();
  const { setChannel } = useAppContext();
  const { theme } = useTheme();

  const userIdStr = Array.isArray(user) ? user[0] : user;
  const userListStr = Array.isArray(userList) ? userList[0] : userList;
  const userIndexNum = Array.isArray(userIndex) ? parseInt(userIndex[0] || "0") : (typeof userIndex === "string" ? parseInt(userIndex) : 0);
  
  const allUserIds: string[] = userListStr ? JSON.parse(decodeURIComponent(userListStr)) : [];

  const closeViewer = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(drawer)/(tabs)");
  }, [navigation]);

  useLayoutEffect(() => {
    const drawer = navigation.getParent()?.getParent();
    drawer?.setOptions({
      sceneContainerStyle: { backgroundColor: "#000" },
    });
    return () => {
      drawer?.setOptions({
        sceneContainerStyle: { backgroundColor: theme.background },
      });
    };
  }, [navigation, theme.background]);

  const [statuses, setStatuses] = useState<any[]>(() =>
    userIdStr ? resolveUserStatuses(userIdStr) : [],
  );
  const [loadedUserId, setLoadedUserId] = useState<string | null>(() => {
    if (!userIdStr) return null;
    return resolveUserStatuses(userIdStr).length ? userIdStr : null;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pagerRef = useRef<FlatList<any>>(null);
  const [viewsModalVisible, setViewsModalVisible] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [dmTarget, setDmTarget] = useState<StatusViewRow | null>(null);
  const [sendingDm, setSendingDm] = useState(false);

  const insets = useSafeAreaInsets();
  const listMaxH = height * 0.34;
  const userId = userIdStr;
  const viewerId = clerkUser?.id;

  const effectiveStatuses = useMemo(() => {
    if (statuses.length > 0) return statuses;
    if (userIdStr) return resolveUserStatuses(userIdStr);
    return [];
  }, [statuses, userIdStr]);

  const storiesReady = !!userId && effectiveStatuses.length > 0;
  const safeStoryIndex = Math.min(
    currentIndex,
    Math.max(effectiveStatuses.length - 1, 0),
  );
  const current = storiesReady ? effectiveStatuses[safeStoryIndex] : undefined;
  const posterImage = useStatusProfileImage(userId, current);
  const isVideo = current?.media?.[0]?.includes(".mp4");
  const [posterReplyText, setPosterReplyText] = useState("");
  const [posterBarFocused, setPosterBarFocused] = useState(false);
  const [sendingToPoster, setSendingToPoster] = useState(false);
  const [longPressPaused, setLongPressPaused] = useState(false);


  const isStoryOwner = Boolean(
    viewerId && userId && String(viewerId) === String(userId),
  );

  const canMessagePoster =
    !!client?.userID &&
    !!viewerId &&
    !!userId &&
    !isStoryOwner &&
    String(viewerId) !== String(userId);

  const posterReplyBottomInset =
    Math.max(insets.bottom, 10) + POSTER_REPLY_BAR_HEIGHT;


  const viewCount = current?.views?.length ?? 0;

  const viewsSorted = useMemo(() => {
    const list = [...(current?.views ?? [])] as StatusViewRow[];
    return list.sort((a, b) => {
      const ta = new Date((b as any).viewedAt ?? 0).getTime();
      const tb = new Date((a as any).viewedAt ?? 0).getTime();
      return ta - tb;
    });
  }, [current?.views, current?._id]);

  const overlayBlocksPlayback =
    menuOpen ||
    viewsModalVisible ||
    posterBarFocused ||
    playbackPaused ||
    longPressPaused;

  const recordViewPayload = useCallback(() => {
    const me = String(viewerId ?? "");
    const u = userDetails ?? {};
    return {
      userId: me,
      firstName: (clerkUser?.firstName ?? u.firstName ?? "").trim(),
      lastName: (clerkUser?.lastName ?? u.lastName ?? "").trim(),
      nickName: (u.nickName ?? "").trim(),
      companyName: (u.companyName ?? "").trim(),
      image: (clerkUser?.imageUrl ?? u.image ?? "").trim(),
    };
  }, [viewerId, clerkUser, userDetails]);

  const scrollToSlide = useCallback(
    (index: number, animated = true) => {
      const len = effectiveStatuses.length;
      const clamped = Math.max(0, Math.min(index, Math.max(len - 1, 0)));
      setCurrentIndex(clamped);
      if (len > 0) {
        pagerRef.current?.scrollToIndex({ index: clamped, animated });
      }
    },
    [effectiveStatuses.length],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === "number") {
        setCurrentIndex(idx);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  useLayoutEffect(() => {
    if (!userIdStr) return;
    const hydrated = resolveUserStatuses(userIdStr);
    setCurrentIndex(0);
    setVideoLoading(false);
    setPlaybackPaused(false);
    setMenuOpen(false);
    setViewsModalVisible(false);
    setPosterBarFocused(false);
    setReplyText("");
    setPosterReplyText("");
    if (hydrated.length) {
      setStatuses(hydrated);
      setLoadedUserId(userIdStr);
    } else {
      setStatuses([]);
      setLoadedUserId(null);
    }
  }, [userIdStr]);

  useEffect(() => {
    if (!effectiveStatuses.length) return;
    requestAnimationFrame(() => {
      pagerRef.current?.scrollToIndex({ index: 0, animated: false });
    });
  }, [userIdStr, effectiveStatuses.length]);

  useEffect(() => {
    if (!userId) return;
    if (effectiveStatuses.length > 0) return;
    if (loadedUserId === userId && statuses.length === 0) {
      closeViewer();
    }
  }, [
    loadedUserId,
    userId,
    statuses.length,
    effectiveStatuses.length,
    closeViewer,
  ]);

  useEffect(() => {
    if (!userId || allUserIds.length === 0) return;
    const start = Math.max(0, userIndexNum - 1);
    const end = Math.min(allUserIds.length, userIndexNum + STATUS_PREVIEW_USER_LIMIT);
    warmStatusCachesForUsers(allUserIds.slice(start, end));
  }, [userId, allUserIds, userIndexNum]);

  useEffect(() => {
    if (!userId) return;

    const cached = resolveUserStatuses(userIdStr);
    if (cached.length > 0) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `${API_PUBLIC_URL}/api/status/user/${encodeURIComponent(userId)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;

        const sorted = sortStatusesForViewer(data);
        writeStatusCache(userIdStr, sorted);
        setStatuses(sorted);
        setLoadedUserId(userIdStr);
        void prefetchStatusMedia(sorted, 0, 3);
      } catch {
        /* ignore abort / network */
      }
    })();

    return () => controller.abort();
  }, [userId, userIdStr]);

  useEffect(() => {
    if (!storiesReady || !current?._id || !viewerId) return;

    const authorId = String(current.userId ?? "");
    const me = String(viewerId);
    if (authorId === me) return;

    const alreadyViewed = (current.views ?? []).some(
      (v: { userId?: string }) => String(v.userId) === me,
    );
    if (!alreadyViewed) {
      const payload = recordViewPayload();
      setStatuses((prev) =>
        prev.map((s) =>
          s._id === current._id
            ? {
                ...s,
                views: [
                  ...(s.views ?? []),
                  { ...payload, viewedAt: new Date().toISOString() },
                ],
              }
            : s,
        ),
      );
      if (userIdStr) {
        markStatusViewedInMemory(userIdStr, String(current._id), me, payload);
      }
    }

    const controller = new AbortController();

    (async () => {
      try {
        const enriched = await fetch(`${API_PUBLIC_URL}/api/status/${current._id}/view`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordViewPayload()),
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null));
        if (enriched?.views) {
          patchStatusViewed(String(current._id), me, enriched.views);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => controller.abort();
  }, [
    storiesReady,
    currentIndex,
    current?._id,
    viewerId,
    current?.userId,
    recordViewPayload,
    userIdStr,
  ]);

  const goToNextUser = useCallback(() => {
    if (allUserIds.length > 0 && userIndexNum < allUserIds.length - 1) {
      const nextUserIndex = userIndexNum + 1;
      const nextUserId = allUserIds[nextUserIndex];
      const encodedList = encodeURIComponent(JSON.stringify(allUserIds));
      router.replace({
        pathname: "/(status)/Viewer",
        params: {
          user: nextUserId,
          userList: encodedList,
          userIndex: nextUserIndex.toString(),
        },
      });
      return;
    }
    closeViewer();
  }, [allUserIds, userIndexNum, closeViewer]);

  const goToPrevUser = useCallback(() => {
    if (allUserIds.length > 0 && userIndexNum > 0) {
      const prevUserIndex = userIndexNum - 1;
      const prevUserId = allUserIds[prevUserIndex];
      const encodedList = encodeURIComponent(JSON.stringify(allUserIds));
      router.replace({
        pathname: "/(status)/Viewer",
        params: {
          user: prevUserId,
          userList: encodedList,
          userIndex: prevUserIndex.toString(),
        },
      });
    }
  }, [allUserIds, userIndexNum]);

  const handleNext = useCallback(() => {
    if (currentIndex < effectiveStatuses.length - 1) {
      scrollToSlide(currentIndex + 1);
      return;
    }
    goToNextUser();
  }, [currentIndex, effectiveStatuses.length, scrollToSlide, goToNextUser]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      scrollToSlide(currentIndex - 1);
      return;
    }
    goToPrevUser();
  }, [currentIndex, scrollToSlide, goToPrevUser]);

  useStoryPlayback({
    items: effectiveStatuses,
    activeIndex: safeStoryIndex,
    isVideo: Boolean(isVideo),
    paused: overlayBlocksPlayback,
    enabled: storiesReady,
    onComplete: handleNext,
  });

  useEffect(() => {
    if (!effectiveStatuses.length) return;
    void prefetchStatusMedia(
      effectiveStatuses,
      Math.max(0, currentIndex),
      3,
    );
    if (allUserIds.length) {
      prefetchAdjacentUsers(allUserIds, userIndexNum, resolveUserStatuses);
    }
  }, [currentIndex, effectiveStatuses, allUserIds, userIndexNum]);

  const onPagerScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, velocity } = e.nativeEvent;
      const vx = velocity?.x ?? 0;
      const maxOffset = width * Math.max(effectiveStatuses.length - 1, 0);
      const atStart = contentOffset.x <= 8;
      const atEnd = contentOffset.x >= maxOffset - 8;

      if (atEnd && vx > 0.2) {
        handleNext();
      } else if (atStart && vx < -0.2) {
        handlePrev();
      }
    },
    [width, effectiveStatuses.length, handleNext, handlePrev],
  );

  const openViewsModal = () => {
    setViewsModalVisible(true);
    setPlaybackPaused(true);
    setDmTarget(null);
    setReplyText("");
  };

  const closeViewsModal = () => {
    setViewsModalVisible(false);
    setPlaybackPaused(false);
    setDmTarget(null);
    setReplyText("");
  };

  const renderStatusSlide = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const slideMedia = item.media?.[0];
      const slideIsVideo = slideMedia?.includes(".mp4");
      const mediaUri = slideMedia ? resolveMediaUrl(slideMedia) : undefined;
      const hasSlideMedia = Boolean(slideMedia);
      const isActive = index === currentIndex;
      const slideCaptionPad = canMessagePoster
        ? posterReplyBottomInset + 16
        : hasSlideMedia
          ? 80
          : 0;
      const videoPaused =
        !isFocused || overlayBlocksPlayback || !isActive;

      return (
        <View style={{ width, height }}>
          {hasSlideMedia && mediaUri ? (
            slideIsVideo ? (
              <Video
                source={{ uri: mediaUri }}
                style={styles.media}
                resizeMode="contain"
                paused={videoPaused}
                repeat
                onLoadStart={() => {
                  if (isActive) setVideoLoading(true);
                }}
                onLoad={() => {
                  if (isActive) setVideoLoading(false);
                }}
              />
            ) : (
              <ExpoImage
                source={{ uri: mediaUri }}
                style={styles.media}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={120}
              />
            )
          ) : null}

          {!hasSlideMedia && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: item.backgroundColor ?? "#075E54" },
              ]}
            />
          )}

          {item.caption ? (
            <View
              style={[
                styles.textContainer,
                {
                  justifyContent: hasSlideMedia ? "flex-end" : "center",
                  paddingBottom: slideCaptionPad,
                  backgroundColor: hasSlideMedia
                    ? "transparent"
                    : item.backgroundColor,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.text}>{item.caption}</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [
      canMessagePoster,
      currentIndex,
      isFocused,
      overlayBlocksPlayback,
      posterReplyBottomInset,
    ],
  );

  const sendStoryReply = async (
    target: StreamChatTarget,
    messageText: string,
    onSent?: () => void,
  ) => {
    const targetUserId = target?.clerkId;
    if (!client?.userID || !targetUserId || !messageText.trim()) return;

    setPlaybackPaused(true);

    const displayName = buildStreamDisplayName(target);
    const image = (target.image ?? "").trim() || undefined;

    await upsertStreamUser({
      userId: String(targetUserId),
      name: displayName,
      image,
    });

    try {
      await client.queryUsers(
        { id: { $in: [String(targetUserId)] } } as Parameters<
          typeof client.queryUsers
        >[0],
      );
    } catch {
      /* non-fatal */
    }

    const channel = client.channel("messaging", {
      members: [client.userID, String(targetUserId)],
    });
    await channel.watch();
    setChannel(channel);
    await channel.sendMessage(
      buildStatusStoryStreamMessage(current, messageText),
    );
    onSent?.();
    router.replace(`/channel/${channel.cid}`);
  };

  const sendDmToPoster = async () => {
    const body = posterReplyText.trim();
    if (!client?.userID || !body || !userId) return;

    setSendingToPoster(true);
    try {
      const author = effectiveStatuses[0] ?? current;
      await sendStoryReply(
        {
          clerkId: String(userId),
          firstName: author?.firstName,
          lastName: author?.lastName,
          companyName: author?.companyName,
          nickName: author?.nickName,
          image: author?.image,
        },
        body,
        () => setPosterReplyText(""),
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not send message.");
    } finally {
      setSendingToPoster(false);
    }
  };

  /** DM the tapped viewer (story owner replying from “Viewed by” sheet). */
  const sendDmToTarget = async () => {
    const targetId = dmTarget?.userId;
    const body = replyText.trim();

    if (!client?.userID || !targetId || !body) {
      Alert.alert(
        "Reply",
        !targetId
          ? "Tap someone in the list to reply."
          : "Type a message first.",
      );
      return;
    }

    if (String(targetId) === String(client.userID)) {
      Alert.alert("Reply", "You cannot message yourself.");
      return;
    }

    setSendingDm(true);
    try {
      await sendStoryReply(
        {
          clerkId: String(targetId),
          firstName: dmTarget?.firstName,
          lastName: dmTarget?.lastName,
          companyName: dmTarget?.companyName,
          nickName: dmTarget?.nickName,
          image: dmTarget?.image,
        },
        body,
        () => {
          setReplyText("");
          closeViewsModal();
        },
      );
    } catch (err) {
      console.error("Failed to send DM:", err);
      Alert.alert("Error", "Could not send message. Try again.");
    } finally {
      setSendingDm(false);
    }
  };

  if (!userId) {
    return null;
  }

  if (!current) {
    return (
      <View style={styles.loader}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Pressable
          style={[styles.storyHeader, { top: insets.top + 8 }]}
          onPress={closeViewer}
          hitSlop={12}
        >
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const posterName = statusDisplayName(current);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={[styles.storyHeader, { top: insets.top + 16 }]}>
        <Pressable
          onPress={closeViewer}
          hitSlop={12}
        >
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        <PresenceAvatar
          userId={current.userId}
          size={36}
          imageUri={posterImage}
        />
        <View style={styles.headerTextCol}>
          <Text style={styles.headerName} numberOfLines={1}>
            {posterName}
          </Text>
          <Text style={styles.headerTime}>
            {current.createdAt
              ? new Date(current.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
        </View>
      </View>

      <View style={[styles.menuWrapper, { top: insets.top + 8 }]}>
        <Menu
          onOpen={() => {
            setMenuOpen(true);
            setPlaybackPaused(true);
          }}
          onClose={() => {
            setMenuOpen(false);
            if (!viewsModalVisible) setPlaybackPaused(false);
          }}
        >
          <MenuTrigger>
            <View style={{ borderRadius: 50, padding: 10 }}>
              <Feather name="more-vertical" size={22} color="white" />
            </View>
          </MenuTrigger>

          <MenuOptions
            customStyles={{
              optionsContainer: {
                borderRadius: 12,
                paddingVertical: 6,
                width: 180,
                backgroundColor: "#fff",
              },
            }}
          >
            <MenuOption onSelect={() => alert("Save")}>
              <View style={styles.menuItem}>
                <Feather name="bookmark" size={16} />
                <Text>Save</Text>
              </View>
            </MenuOption>

            <MenuOption onSelect={() => alert("Share")}>
              <View style={styles.menuItem}>
                <Feather name="share-2" size={16} />
                <Text>Share</Text>
              </View>
            </MenuOption>

            <MenuOption onSelect={() => alert("Report")}>
              <View style={styles.menuItem}>
                <Feather name="flag" size={16} color="red" />
                <Text style={{ color: "red" }}>Report</Text>
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      {isStoryOwner && (
        <Pressable
          style={styles.viewsPill}
          onPress={openViewsModal}
          hitSlop={12}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={styles.viewsPillText}>{viewCount}</Text>
        </Pressable>
      )}

      <View style={styles.mediaLayer} pointerEvents="box-none">
        <Pressable
          style={styles.tapLeft}
          onPress={handlePrev}
          onLongPress={() => setLongPressPaused(true)}
          onPressOut={() => setLongPressPaused(false)}
          delayLongPress={200}
        />
        <Pressable
          style={styles.tapRight}
          onPress={handleNext}
          onLongPress={() => setLongPressPaused(true)}
          onPressOut={() => setLongPressPaused(false)}
          delayLongPress={200}
        />
        <FlatList
          ref={pagerRef}
          data={effectiveStatuses}
          horizontal
          pagingEnabled
          bounces
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderStatusSlide}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialScrollIndex={0}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollEndDrag={onPagerScrollEndDrag}
          onScrollToIndexFailed={(info) => {
            pagerRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          windowSize={3}
          maxToRenderPerBatch={2}
        />

      </View>

      <Modal
  visible={viewsModalVisible}
  transparent
  animationType="slide"
  onRequestClose={closeViewsModal}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={20}
  >
    <View style={styles.modalBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeViewsModal}
      />

      <View
        style={[
          styles.modalSheet,
          {
            backgroundColor: theme.card,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.modalHandle} />

        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Viewed by ({viewCount})
        </Text>

        <View style={{ flex: 1, maxHeight: listMaxH }}>
          <FlatList
            style={{ flex: 1 }}
            data={viewsSorted}
            keyExtractor={(item, index) =>
              `${item.userId}-${index}-${(item as any).viewedAt ?? ""}`
            }
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 120,
            }}
            ListEmptyComponent={
              <Text
                style={{
                  color: theme.subtext,
                  padding: 16,
                }}
              >
                No views yet
              </Text>
            }
            renderItem={({ item }) => {
              const label = displayNameFromView(item);

              const sub =
                item.companyName?.trim() &&
                !label.includes(item.companyName.trim())
                  ? item.companyName.trim()
                  : "";

              const selected =
                dmTarget &&
                String(dmTarget.userId) === String(item.userId);

              return (
                <Pressable
                  onPress={() => setDmTarget(item)}
                  style={[
                    styles.viewerRow,
                    selected && {
                      backgroundColor: theme.background,
                      borderRadius: 12,
                    },
                  ]}
                >
                  {item.image ? (
                    <PresenceAvatar
                      userId={item.userId}
                      size={40}
                      imageUri={item.image}
                    />
                  ) : (
                    <PresenceAvatar userId={item.userId} size={40}>
                      <View
                        style={[
                          styles.viewerAvatar,
                          styles.viewerAvatarPlaceholder,
                          {
                            backgroundColor: theme.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={20}
                          color={theme.subtext}
                        />
                      </View>
                    </PresenceAvatar>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.viewerName,
                        { color: theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>

                    {!!sub && (
                      <Text
                        style={{
                          color: theme.subtext,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {sub}
                      </Text>
                    )}
                  </View>

                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#4CAF50"
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </View>

        {!!dmTarget && (
          <Text
            style={{
              color: theme.subtext,
              fontSize: 11,
              marginBottom: 6,
              marginTop: 8,
            }}
            numberOfLines={1}
          >
            Replying to {displayNameFromView(dmTarget)}
          </Text>
        )}

        <View style={styles.replyRow}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder={
              dmTarget
                ? "Message…"
                : "Tap a viewer, then type…"
            }
            placeholderTextColor={theme.subtext}
            style={[
              styles.replyInput,
              {
                color: theme.text,
                borderColor: theme.border ?? "#ccc",
                backgroundColor: theme.background,
              },
            ]}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          <Pressable
            onPress={sendDmToTarget}
            disabled={
              sendingDm ||
              !replyText.trim() ||
              !dmTarget
            }
            style={[
              styles.sendBtn,
              {
                opacity:
                  sendingDm ||
                  !replyText.trim() ||
                  !dmTarget
                    ? 0.5
                    : 1,
              },
            ]}
          >
            {sendingDm ? (
              <ActivityIndicator
                size="small"
                color={theme.text}
              />
            ) : (
              <Ionicons
                name="send"
                size={22}
                color={theme.text}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

{canMessagePoster && (
  <View
    style={[
      styles.posterReplyBar,
      { paddingBottom: Math.max(insets.bottom, 10) },
    ]}
  >
    <TextInput
      value={posterReplyText}
      onChangeText={setPosterReplyText}
      placeholder="Reply…"
      placeholderTextColor="#aaa"
      onFocus={() => setPosterBarFocused(true)}
      onBlur={() => setPosterBarFocused(false)}
      style={{
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "rgba(255,255,255,0.12)",
        color: "#fff",
      }}
      multiline
    />
    <Pressable
      onPress={sendDmToPoster}
      disabled={sendingToPoster || !posterReplyText.trim()}
      style={{ padding: 10 }}
    >
      {sendingToPoster ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name="send" size={22} color="#fff" />
      )}
    </Pressable>
  </View>
)}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  tapLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "38%",
    zIndex: 20,
  },
  tapRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "38%",
    zIndex: 20,
  },
  storyHeader: {
    position: "absolute",
    left: 8,
    right: 56,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerTextCol: { flex: 1 },
  headerName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  headerTime: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 1,
  },

  viewsPill: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    zIndex: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  viewsPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  media: {
    width,
    height,
    position: "absolute",
  },
  mediaHidden: {
    opacity: 0,
  },
  mediaSpinner: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
  },

  textContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
  },

  text: {
    color: "#fff",
    fontSize: 27,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  pager: {
    flex: 1,
    width,
    height,
  },

  loader: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  menuWrapper: {
    position: "absolute",
    right: 8,
    zIndex: 200,
    borderRadius: 50,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: height * 0.72,
    minHeight: height * 0.45,
  },

  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.5)",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },

  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },

  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  viewerAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  viewerName: {
    fontSize: 15,
    fontWeight: "600",
  },

  replyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.35)",
  },

  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },

  sendBtn: {
    padding: 10,
    marginBottom: 2,
  },

  posterReplyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    zIndex: 300,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
});