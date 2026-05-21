import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import moment from "moment";
import axios from "axios";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { MediaViewerModal } from "./MediaViewModal";
import { PostMediaGrid } from "./PostMediaGrid";
import { formatNickHandle } from "@/utils/nickName";
import { PoliticalPalette } from "@/constants/politicalTheme";

const LIKE_COLOR = "#E0245E";

function getAuthorName(item: any) {
  if (item?.user?.firstName) {
    return `${item.user.firstName} ${item.user.lastName || ""}`.trim();
  }
  return item?.user?.companyName || item?.userName || "User";
}

type ReplyTarget = { commentId: string; authorName: string };

type CommentPostHeaderProps = {
  postCard: any;
  mediaList: string[];
  mediaCount: number;
  gridWidth: number;
  commentCount: number;
  theme: any;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onPressMedia: (index: number) => void;
};

const CommentPostMedia = React.memo(function CommentPostMedia({
  mediaList,
  gridWidth,
  onPressMedia,
}: {
  mediaList: string[];
  gridWidth: number;
  onPressMedia: (index: number) => void;
}) {
  return (
    <View style={styles.postMedia}>
      <PostMediaGrid
        uris={mediaList}
        containerWidth={gridWidth}
        onPressItem={onPressMedia}
        tileRadius={10}
      />
    </View>
  );
});

const CommentPostHeader = React.memo(function CommentPostHeader({
  postCard,
  mediaList,
  mediaCount,
  gridWidth,
  commentCount,
  theme,
  isExpanded,
  onToggleExpand,
  onPressMedia,
}: CommentPostHeaderProps) {
  const commentText = postCard?.quote || postCard?.caption || "";
  const displayAuthor =
    postCard?.user?.firstName && postCard?.user?.lastName
      ? `${postCard.user.firstName} ${postCard.user.lastName}`
      : postCard?.user?.companyName || "Broadcaster";

  return (
    <View
      style={[
        styles.postCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.postHeader}>
        <Image
          source={{ uri: postCard?.user?.image }}
          style={styles.postAvatar}
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={postCard?.user?.image}
        />
        <View style={styles.postMeta}>
          <Text
            style={[styles.postAuthor, { color: theme.text }]}
            numberOfLines={1}
          >
            {displayAuthor}
          </Text>
          <Text style={[styles.postHandle, { color: theme.subtext }]}>
            {formatNickHandle(postCard?.user?.nickName)}
          </Text>
        </View>
        <View
          style={[
            styles.debateBadge,
            { backgroundColor: PoliticalPalette.goldSoft },
          ]}
        >
          <Text
            style={[styles.debateBadgeText, { color: PoliticalPalette.navy }]}
          >
            ORIGINAL
          </Text>
        </View>
      </View>

      {!!commentText && (
        <>
          <Text
            numberOfLines={isExpanded ? undefined : 4}
            style={[styles.postCaption, { color: theme.text }]}
          >
            {commentText}
          </Text>
          {commentText.length > 120 && (
            <TouchableOpacity onPress={() => onToggleExpand(postCard._id)}>
              <Text style={[styles.readMore, { color: PoliticalPalette.navy }]}>
                {isExpanded ? "Show less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {mediaCount > 0 && (
        <CommentPostMedia
          mediaList={mediaList}
          gridWidth={gridWidth}
          onPressMedia={onPressMedia}
        />
      )}

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Text style={[styles.threadLabel, { color: theme.subtext }]}>
        {commentCount === 0
          ? "Be the first to comment"
          : `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
      </Text>
    </View>
  );
});

export default function CommentModal({
  visible,
  onClose,
  postCard,
  comments,
  setComments,
  userId,
  userImage,
  userName,
  mediaList = [],
  mediaCount = 0,
  width,
  theme,
}: any) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>(
    {},
  );
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>(
    {},
  );

  const flatListRef = useRef<FlatList>(null);
  const animatedLike = useRef(new Animated.Value(1)).current;

  const gridWidth = useMemo(() => width - 24, [width]);
  const commentCount = comments?.length ?? 0;
  const isExpanded = expandedStates[postCard?._id];

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

  const openMedia = useCallback((index: number) => {
    setSelectedIndex(index);
    setMediaModalVisible(true);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setReplyTo(null);
      setText("");
      setReplyDraft("");
    }
  }, [visible]);

  const startReply = useCallback(
    (commentId: string, authorName: string, listIndex: number) => {
      setReplyTo({ commentId, authorName });
      setReplyDraft("");
      setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: listIndex,
          animated: true,
          viewPosition: 0.6,
        });
      });
    },
    [],
  );

  const listHeader = useMemo(
    () => (
      <CommentPostHeader
        postCard={postCard}
        mediaList={mediaList}
        mediaCount={mediaCount}
        gridWidth={gridWidth}
        commentCount={commentCount}
        theme={theme}
        isExpanded={!!isExpanded}
        onToggleExpand={toggleExpand}
        onPressMedia={openMedia}
      />
    ),
    [
      postCard,
      mediaList,
      mediaCount,
      gridWidth,
      commentCount,
      theme,
      isExpanded,
      toggleExpand,
      openMedia,
    ],
  );

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > 320;
    setShowScrollTop(shouldShow);
    Animated.timing(scrollTopOpacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const tempId = `temp-${Date.now()}`;
    const temp = {
      _id: tempId,
      userId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      likes: [],
      replies: [],
      user: {
        image: userImage,
        firstName: userName,
        nickName: userName,
      },
    };

    setComments((prev: any) => [...prev, temp]);
    setText("");
    setLoading(true);

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    try {
      const res = await fetch(
        `https://cast-api-zeta.vercel.app/api/comments/${postCard?._id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, text: trimmed }),
        },
      );

      const data = await res.json();
      setComments((prev: any) =>
        prev.map((c: any) => (c._id === tempId ? data : c)),
      );
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.log(err);
      setComments((prev: any) => prev.filter((c: any) => c._id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyTo) return;
    const trimmed = replyDraft.trim();
    if (!trimmed || replyLoading) return;

    const { commentId } = replyTo;
    const tempReplyId = `temp-reply-${Date.now()}`;
    const tempReply = {
      _id: tempReplyId,
      userId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      likes: [],
      user: {
        image: userImage,
        firstName: userName,
        nickName: userName,
      },
    };

    setComments((prev: any) =>
      prev.map((c: any) =>
        c._id === commentId
          ? { ...c, replies: [...(c.replies || []), tempReply] }
          : c,
      ),
    );
    setReplyDraft("");
    setReplyTo(null);
    setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
    setReplyLoading(true);

    try {
      const res = await axios.post(
        `https://cast-api-zeta.vercel.app/api/comments/${commentId}/replies`,
        { userId, text: trimmed, userName },
      );
      setComments((prev: any) =>
        prev.map((c: any) => (c._id === commentId ? res.data : c)),
      );
    } catch (err) {
      console.log(err);
      setComments((prev: any) =>
        prev.map((c: any) =>
          c._id === commentId
            ? {
                ...c,
                replies: (c.replies || []).filter(
                  (r: any) => r._id !== tempReplyId,
                ),
              }
            : c,
        ),
      );
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const prev = comments;
    setComments((p: any) => p.filter((c: any) => c._id !== commentId));

    try {
      await axios.delete(
        `https://cast-api-zeta.vercel.app/api/comments/${commentId}`,
        { data: { userId } },
      );
    } catch {
      setComments(prev);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    const prev = comments;
    setComments((p: any) =>
      p.map((c: any) =>
        c._id === commentId
          ? {
              ...c,
              replies: (c.replies || []).filter((r: any) => r._id !== replyId),
            }
          : c,
      ),
    );

    try {
      await axios.delete(
        `https://cast-api-zeta.vercel.app/api/comments/${commentId}/replies/${replyId}`,
      );
    } catch {
      setComments(prev);
    }
  };

  const handleLikeReply = async (commentId: string, replyId: string) => {
    setComments((prev: any) =>
      prev.map((c: any) => {
        if (c._id !== commentId) return c;
        return {
          ...c,
          replies: (c.replies || []).map((r: any) => {
            if (r._id !== replyId) return r;
            const likes = r.likes || [];
            const liked = likes.includes(userId);
            return {
              ...r,
              likes: liked
                ? likes.filter((id: string) => id !== userId)
                : [...likes, userId],
            };
          }),
        };
      }),
    );

    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/comments/${commentId}/replies/${replyId}/like`,
        { userId },
      );
    } catch (err) {
      console.log(err);
    }
  };

  const handleLike = async (commentId: string) => {
    setComments((prev: any) =>
      prev.map((c: any) => {
        if (c._id !== commentId) return c;
        const likes = c.likes || [];
        const liked = likes.includes(userId);
        return {
          ...c,
          likes: liked
            ? likes.filter((id: string) => id !== userId)
            : [...likes, userId],
        };
      }),
    );

    Animated.sequence([
      Animated.spring(animatedLike, { toValue: 1.25, useNativeDriver: true }),
      Animated.spring(animatedLike, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/comments/${commentId}/like`,
        { userId },
      );
    } catch (err) {
      console.log(err);
    }
  };

  const renderReply = (commentId: string, reply: any) => {
    const isMine = reply.userId === userId;
    const liked = (reply.likes || []).includes(userId);
    const authorName = getAuthorName(reply);

    return (
      <View key={reply._id} style={styles.replyRow}>
        <Image
          source={{ uri: reply?.user?.image }}
          style={styles.replyAvatar}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
        <View
          style={[
            styles.replyBubble,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.commentAuthor, { color: theme.text }]}>
            {authorName}
          </Text>
          <Text style={[styles.replyBody, { color: theme.text }]}>
            {reply.text}
          </Text>
          <View style={styles.commentActions}>
            <Pressable
              onPress={() => handleLikeReply(commentId, reply._id)}
              style={styles.commentActionBtn}
              hitSlop={8}
            >
              {liked ? (
                <AntDesign name="heart" size={13} color={LIKE_COLOR} />
              ) : (
                <Feather name="heart" size={13} color={theme.subtext} />
              )}
              {(reply.likes?.length ?? 0) > 0 && (
                <Text style={[styles.likeCount, { color: theme.subtext }]}>
                  {reply.likes.length}
                </Text>
              )}
            </Pressable>
            <Text style={[styles.commentTime, { color: theme.subtext }]}>
              {moment(reply.createdAt).fromNow()}
            </Text>
            {isMine && (
              <Pressable
                onPress={() => handleDeleteReply(commentId, reply._id)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={13} color={theme.subtext} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderComment = ({ item, index }: any) => {
    const isMine = item.userId === userId;
    const liked = (item.likes || []).includes(userId);
    const authorName = getAuthorName(item);
    const replies = item.replies || [];
    const showReplies = expandedReplies[item._id] ?? replies.length > 0;
    const isReplyingHere = replyTo?.commentId === item._id;
    const canSendReply = replyDraft.trim().length > 0 && !replyLoading;

    return (
      <View style={styles.commentBlock}>
        <View style={styles.commentRow}>
          <Image
            source={{ uri: item?.user?.image || item.image }}
            style={styles.commentAvatar}
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={item?._id}
          />
          <View
            style={[
              styles.commentBubble,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.commentAuthor, { color: theme.text }]}>
              {authorName}
            </Text>
            <Text style={[styles.commentBody, { color: theme.text }]}>
              {item.text}
            </Text>
            <View style={styles.commentActions}>
              <Pressable
                onPress={() => handleLike(item._id)}
                style={styles.commentActionBtn}
                hitSlop={8}
              >
                {liked ? (
                  <AntDesign name="heart" size={14} color={LIKE_COLOR} />
                ) : (
                  <Feather name="heart" size={14} color={theme.subtext} />
                )}
                {(item.likes?.length ?? 0) > 0 && (
                  <Text style={[styles.likeCount, { color: theme.subtext }]}>
                    {item.likes.length}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => startReply(item._id, authorName, index)}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.replyBtn,
                    {
                      color: isReplyingHere ? theme.primary : theme.primary,
                      fontWeight: isReplyingHere ? "800" : "700",
                    },
                  ]}
                >
                  {isReplyingHere ? "Replying…" : "Reply"}
                </Text>
              </Pressable>

              <Text style={[styles.commentTime, { color: theme.subtext }]}>
                {moment(item.createdAt).fromNow()}
              </Text>

              {isMine && (
                <Pressable
                  onPress={() => handleDeleteComment(item._id)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={14} color={theme.subtext} />
                </Pressable>
              )}
            </View>

            {isReplyingHere && (
              <View style={styles.igReplySection}>
                <View
                  style={[styles.igReplyDivider, { backgroundColor: theme.border }]}
                />
                <View style={styles.igReplyMeta}>
                  <Text
                    style={[styles.igReplyHint, { color: theme.subtext }]}
                    numberOfLines={1}
                  >
                    Replying to{" "}
                    <Text style={{ color: theme.text, fontWeight: "700" }}>
                      {authorName}
                    </Text>
                  </Text>
                  <Pressable
                    onPress={() => {
                      setReplyTo(null);
                      setReplyDraft("");
                    }}
                    hitSlop={8}
                  >
                    <Text style={[styles.igReplyCancel, { color: theme.primary }]}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.igReplyRow}>
                  <Image
                    source={{ uri: userImage }}
                    style={styles.igReplyAvatar}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                  />
                  <TextInput
                    placeholder={`Reply to ${authorName}…`}
                    placeholderTextColor={theme.subtext}
                    value={replyDraft}
                    onChangeText={setReplyDraft}
                    multiline
                    maxLength={500}
                    autoFocus
                    style={[
                      styles.igReplyInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={handleSubmitReply}
                    disabled={!canSendReply}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.igPostBtn,
                        {
                          color: canSendReply ? theme.primary : theme.subtext,
                          opacity: canSendReply ? 1 : 0.45,
                        },
                      ]}
                    >
                      {replyLoading ? "…" : "Post"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {replies.length > 0 && (
          <View style={styles.repliesWrap}>
            <Pressable
              onPress={() =>
                setExpandedReplies((prev) => ({
                  ...prev,
                  [item._id]: !showReplies,
                }))
              }
              style={styles.repliesToggle}
            >
              <Text style={[styles.repliesToggleText, { color: theme.primary }]}>
                {showReplies
                  ? `Hide ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
                  : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </Text>
            </Pressable>
            {showReplies &&
              replies.map((reply: any) => renderReply(item._id, reply))}
          </View>
        )}
      </View>
    );
  };

  const canSend = text.trim().length > 0 && !loading;
  const charCount = text.length;

  const renderTopComposer = () => (
    <View
      style={[
        styles.composerTop,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.composerTopAccent} />
      <View style={styles.composerTopInner}>
        <View style={styles.composerTopMeta}>
          <Text style={[styles.composerLabel, { color: theme.subtext }]}>
            ADD A COMMENT
          </Text>
          <Text
            style={[
              styles.charCount,
              {
                color: charCount > 450 ? PoliticalPalette.crimson : theme.subtext,
              },
            ]}
          >
            {charCount}/500
          </Text>
        </View>

        <View style={styles.composerRow}>
          <Image
            source={{ uri: userImage }}
            style={styles.composerAvatar}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              placeholder="Write a comment…"
              placeholderTextColor={theme.subtext}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
              style={[styles.composerInput, { color: theme.text }]}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: canSend
                  ? PoliticalPalette.navy
                  : theme.border,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <View style={styles.handleBar} />
          <View style={styles.topBarRow}>
            <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={12}>
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            <View style={styles.topBarCenter}>
              <Text style={[styles.topTitle, { color: theme.text }]}>Comments</Text>
              <Text style={[styles.topSub, { color: theme.subtext }]}>
                {commentCount}{" "}
                {commentCount === 1 ? "comment" : "comments"}
              </Text>
            </View>
            <View style={styles.iconBtn} />
          </View>
        </View>

        {renderTopComposer()}

        <FlatList
          ref={flatListRef}
          style={styles.list}
          data={comments}
          onScroll={handleScroll}
          keyExtractor={(item) => item._id}
          renderItem={renderComment}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="message-circle" size={36} color={theme.subtext} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No comments yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Be the first to respond above.
              </Text>
            </View>
          }
        />

        <Animated.View
          pointerEvents={showScrollTop ? "auto" : "none"}
          style={[
            styles.scrollTop,
            {
              bottom: Math.max(insets.bottom, 16) + 8,
              opacity: scrollTopOpacity,
            },
          ]}
        >
          <Pressable
            onPress={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
            style={styles.scrollTopBtn}
          >
            <Feather name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </Animated.View>

        <MediaViewerModal
          modalVisible={mediaModalVisible}
          setModalVisible={setMediaModalVisible}
          mediaList={mediaList}
          selectedIndex={selectedIndex}
          post={postCard}
          pinchGesture={pinchGesture}
          pinchStyle={pinchStyle}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  composerTop: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  composerTopAccent: {
    width: 4,
    backgroundColor: PoliticalPalette.gold,
  },
  composerTopInner: {
    flex: 1,
    padding: 12,
  },
  composerTopMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  composerLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  charCount: { fontSize: 10, fontWeight: "600" },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.45)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  topBarCenter: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 16, fontWeight: "800" },
  topSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingBottom: 60 },
  postCard: {
    margin: 12,
    marginBottom: 8,
    // padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postAvatar: { width: 42, height: 42, borderRadius: 21 },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: "800" },
  postHandle: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  debateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debateBadgeText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  postCaption: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    paddingHorizontal: 12,
  },
  readMore: { marginTop: 6, fontSize: 12, fontWeight: "700" },
  postMedia: { marginTop: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 10,
  },
  threadLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingHorizontal: 12,
  },
  commentBlock: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentBubble: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentAuthor: { fontSize: 11, fontWeight: "800", marginBottom: 4 },
  commentBody: { fontSize: 14, lineHeight: 21 },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyBtn: { fontSize: 11, fontWeight: "700" },
  likeCount: { fontSize: 10, fontWeight: "700" },
  commentTime: { fontSize: 10 },
  repliesWrap: {
    marginLeft: 44,
    marginTop: 6,
    gap: 6,
  },
  repliesToggle: {
    paddingVertical: 4,
  },
  repliesToggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  replyBubble: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyBody: { fontSize: 13, lineHeight: 20 },
  igReplySection: {
    marginTop: 10,
  },
  igReplyDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  igReplyMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  igReplyHint: { fontSize: 11, flex: 1, marginRight: 8 },
  igReplyCancel: { fontSize: 11, fontWeight: "700" },
  igReplyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  igReplyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  igReplyInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 36,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  igPostBtn: {
    fontSize: 13,
    fontWeight: "800",
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  scrollTop: { position: "absolute", right: 16 },
  scrollTopBtn: {
    backgroundColor: PoliticalPalette.navy,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  composerAvatar: { width: 40, height: 40, borderRadius: 20 },
  composerInput: {
    fontSize: 14,
    lineHeight: 21,
    maxHeight: 84,
    padding: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
