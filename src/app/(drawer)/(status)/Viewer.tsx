import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  PixelRatio,
  Platform,
  Alert,
  StatusBar,
  Image,
} from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { statusAvatarUri, statusDisplayName } from "@/utils/statusUser";
import {
  buildCloudinaryUrl,
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";
import {
  buildStreamDisplayName,
  upsertStreamUser,
  type StreamChatTarget,
} from "@/utils/streamUser";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const POSTER_REPLY_BAR_HEIGHT = 58;
const { width, height } = Dimensions.get("window");
const STORY_PIXEL_WIDTH = Math.round(width * PixelRatio.get());

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

  const [statuses, setStatuses] = useState<any[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [duration, setDuration] = useState(5000);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewsModalVisible, setViewsModalVisible] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [dmTarget, setDmTarget] = useState<StatusViewRow | null>(null);
  const [sendingDm, setSendingDm] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressAtPause = useRef(0);
  /** True only while resuming the same slide after hold-to-pause (not on slide change). */
  const resumeFromPauseRef = useRef(false);
  const insets = useSafeAreaInsets();
  const listMaxH = height * 0.34;
  const userId = userIdStr;
  const viewerId = clerkUser?.id;
  const storiesReady =
    !!userId && loadedUserId === userId && statuses.length > 0;
  const current = storiesReady ? statuses[currentIndex] : undefined;
  const slideKey = current?._id ? String(current._id) : null;
  const isVideo = current?.media?.[0]?.includes(".mp4");
  const rawSlideMedia: string | undefined = current?.media?.[0];
  const optimizedSlideMedia = useMemo(() => {
    if (!rawSlideMedia) return rawSlideMedia;
    return (
      buildCloudinaryUrl(rawSlideMedia, {
        width: STORY_PIXEL_WIDTH,
        kind: isVideo ? "video" : "image",
      }) ?? rawSlideMedia
    );
  }, [rawSlideMedia, isVideo]);
  const [posterReplyText, setPosterReplyText] = useState("");
  const [posterBarFocused, setPosterBarFocused] = useState(false);
  const [sendingToPoster, setSendingToPoster] = useState(false);


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

  const overlayBlocksProgress = menuOpen || viewsModalVisible || posterBarFocused;

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

  const resetSlideProgress = useCallback(() => {
    resumeFromPauseRef.current = false;
    progressAtPause.current = 0;
    progress.setValue(0);
    animationRef.current?.stop();
    setDuration(5000);
    setPaused(false);
  }, [progress]);

  const stopViewerPlayback = useCallback(() => {
    animationRef.current?.stop();
    resumeFromPauseRef.current = false;
    progressAtPause.current = 0;
    progress.setValue(0);
    setPaused(true);
  }, [progress]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopViewerPlayback();
      };
    }, [stopViewerPlayback]),
  );

  useEffect(() => {
    return () => {
      animationRef.current?.stop();
    };
  }, []);

  useLayoutEffect(() => {
    if (!userId) return;
    setStatuses([]);
    setLoadedUserId(null);
    setCurrentIndex(0);
    setVideoLoading(true);
    setMenuOpen(false);
    setViewsModalVisible(false);
    setPosterBarFocused(false);
    setReplyText("");
    setPosterReplyText("");
    resetSlideProgress();
  }, [userId, resetSlideProgress]);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/status/user/${userId}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;

        const sorted = [...data].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setStatuses(sorted);
        setLoadedUserId(userId);
      } catch {
        /* ignore abort / network */
      }
    })();

    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!storiesReady || !current?._id || !viewerId) return;

    const authorId = String(current.userId ?? "");
    const me = String(viewerId);
    if (authorId === me) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/status/${current._id}/view`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordViewPayload()),
          signal: controller.signal,
        });
        if (res.ok) {
          const updated = await res.json();
          setStatuses((prev) =>
            prev.map((s) => (s._id === updated._id ? updated : s)),
          );
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
  ]);

  useLayoutEffect(() => {
    if (!slideKey) return;
    resetSlideProgress();
    const hasMedia = (current?.media?.length ?? 0) > 0;
    setVideoLoading(hasMedia);
  }, [slideKey, current?.media?.length, resetSlideProgress]);

  useEffect(() => {
    if ((current?.media?.length ?? 0) === 0) return;

    const fallback = setTimeout(() => {
      setVideoLoading(false);
    }, 8000);

    return () => clearTimeout(fallback);
  }, [slideKey, current?.media?.length]);

  /** Cached images may skip onLoadEnd on replay — still start the timer. */
  useEffect(() => {
    if (!slideKey || isVideo || (current?.media?.length ?? 0) === 0) return;

    const quickReady = setTimeout(() => {
      setVideoLoading((loading) => {
        if (!loading) return loading;
        setDuration(5000);
        progressAtPause.current = 0;
        progress.setValue(0);
        return false;
      });
    }, 150);

    return () => clearTimeout(quickReady);
  }, [slideKey, isVideo, current?.media?.length, progress]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < statuses.length - 1) return prev + 1;
      
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
        return prev;
      }
      
      router.replace("/(drawer)/(tabs)");
      return prev;
    });
  }, [statuses.length, allUserIds, userIndexNum]);

  const stopProgress = useCallback(() => {
    animationRef.current?.stop();
    progress.stopAnimation((value) => {
      progressAtPause.current = typeof value === "number" ? value : 0;
    });
  }, [progress]);

  const startProgress = useCallback(() => {
    if (!statuses.length || videoLoading || overlayBlocksProgress) return;

    animationRef.current?.stop();

    const from = resumeFromPauseRef.current ? progressAtPause.current : 0;
    resumeFromPauseRef.current = false;

    if (from <= 0) {
      progressAtPause.current = 0;
      progress.setValue(0);
    }

    const remaining = Math.max((1 - from) * duration, 80);
    progress.setValue(from);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });

    animationRef.current = anim;

    anim.start(({ finished }) => {
      if (finished) {
        progressAtPause.current = 0;
        handleNext();
      }
    });
  }, [
    statuses.length,
    videoLoading,
    overlayBlocksProgress,
    duration,
    progress,
    handleNext,
  ]);

  useEffect(() => {
    if (!isFocused || paused || videoLoading || overlayBlocksProgress) {
      stopProgress();
      return;
    }
    startProgress();
    return () => animationRef.current?.stop();
  }, [
    isFocused,
    paused,
    videoLoading,
    overlayBlocksProgress,
    currentIndex,
    slideKey,
    duration,
    startProgress,
    stopProgress,
  ]);

  const handleVideoLoad = (meta: any) => {
    setVideoLoading(false);
    const ms = Math.min(
      Math.max((meta?.duration ?? 5) * 1000, 3000),
      60000,
    );
    setDuration(ms);
    progressAtPause.current = 0;
    progress.setValue(0);
  };

  const handleImageLoad = () => {
    setVideoLoading(false);
    setDuration(5000);
    progressAtPause.current = 0;
    progress.setValue(0);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
  };

  const handlePause = () => {
    if (overlayBlocksProgress || paused) return;
    resumeFromPauseRef.current = true;
    stopProgress();
    setPaused(true);
  };

  const handleResume = () => {
    if (overlayBlocksProgress) return;
    setPaused(false);
  };

  const openViewsModal = () => {
    setViewsModalVisible(true);
    stopProgress();
    setPaused(true);
    setDmTarget(null);
    setReplyText("");
  };

  const closeViewsModal = () => {
    setViewsModalVisible(false);
    setPaused(false);
    setDmTarget(null);
    setReplyText("");
  };

  const sendStoryReply = async (
    target: StreamChatTarget,
    messageText: string,
    onSent?: () => void,
  ) => {
    const targetUserId = target?.clerkId;
    if (!client?.userID || !targetUserId || !messageText.trim()) return;

    stopViewerPlayback();

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
      const author = statuses[0] ?? current;
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

  if (!storiesReady || !current) {
    return (
      <View style={styles.loader}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  const posterName = statusDisplayName(current);
  const posterImage = statusAvatarUri(current);

  const captionBottomPad = canMessagePoster
    ? posterReplyBottomInset + 16
    : current.media?.length > 0
      ? 80
      : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={[styles.progressContainer, { top: insets.top + 8 }]}>
        {statuses.map((_, i) => (
          <View key={i} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i === currentIndex
                      ? progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        })
                      : i < currentIndex
                        ? "100%"
                        : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={[styles.storyHeader, { top: insets.top + 20 }]}>
        <Pressable
          onPress={() => router.replace("/(drawer)/(tabs)")}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
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

      <View style={[styles.menuWrapper, { top: insets.top + 20 }]}>
        <Menu
          onOpen={() => {
            setMenuOpen(true);
            setPaused(true);
            animationRef.current?.stop();
          }}
          onClose={() => {
            setMenuOpen(false);
            if (!viewsModalVisible) setPaused(false);
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
        {current.media?.length > 0 &&
          optimizedSlideMedia &&
          (isVideo ? (
            <Video
              key={slideKey}
              source={{ uri: optimizedSlideMedia }}
              style={[styles.media, videoLoading && styles.mediaHidden]}
              resizeMode="contain"
              paused={paused || overlayBlocksProgress || !isFocused}
              onLoad={handleVideoLoad}
              onLoadStart={() => setVideoLoading(true)}
            />
          ) : (
            <Image
              key={slideKey}
              source={{ uri: optimizedSlideMedia }}
              style={[styles.media, videoLoading && styles.mediaHidden]}
              resizeMode="contain"
              onLoadStart={() => setVideoLoading(true)}
              onLoadEnd={handleImageLoad}
            />
          ))}

        {videoLoading && (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        )}

        {current.caption && (
          <View
            style={[
              styles.textContainer,
              {
                justifyContent:
                  current.media?.length > 0 ? "flex-end" : "center",
                paddingBottom: captionBottomPad,
                backgroundColor:
                  current.media?.length > 0
                    ? "transparent"
                    : current.backgroundColor,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.text}>{current.caption}</Text>
          </View>
        )}
      </View>

      <View style={styles.touchRow} pointerEvents="box-none">
        <Pressable
          style={styles.left}
          onPress={handlePrev}
          onPressIn={handlePause}
          onPressOut={handleResume}
        />
        <Pressable
          style={styles.right}
          onPress={handleNext}
          onPressIn={handlePause}
          onPressOut={handleResume}
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

  progressContainer: {
    flexDirection: "row",
    position: "absolute",
    left: 10,
    right: 10,
    gap: 3,
    zIndex: 110,
  },

  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  progressFill: {
    height: 3,
    backgroundColor: "#fff",
  },

  loader: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  touchRow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flexDirection: "row",
  },

  left: { flex: 1 },
  right: { flex: 1 },

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