import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { PollCard } from "@/components/polls/PollCard";
import {
  fetchPoll,
  fetchPollComments,
  likePollComment,
  postPollComment,
} from "@/services/pollsApi";
import { Ionicons } from "@expo/vector-icons";
import type { Poll, PollComment } from "@/types/poll";
import { AppSpinner } from "@/components/ui/AppSpinner";
import moment from "moment";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useComposerKeyboardInset } from "@/hooks/useComposerKeyboardInset";

const COMPOSER_MIN_HEIGHT = 56;

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 48 : 8);
  const { composerStyle } = useComposerKeyboardInset(bottomInset);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [likeBusy, setLikeBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, c] = await Promise.all([
        fetchPoll(String(id), user?.id, true),
        fetchPollComments(String(id)),
      ]);
      setPoll(p);
      setComments(c);
    } catch (err) {
      console.error("poll detail:", err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendComment = async () => {
    if (!user?.id || !text.trim() || !id) return;
    setSending(true);
    try {
      const comment = await postPollComment(String(id), user.id, text.trim());
      setComments((prev) => [comment, ...prev]);
      setText("");
      setPoll((p) =>
        p ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p,
      );
    } finally {
      setSending(false);
    }
  };

  const toggleCommentLike = async (comment: PollComment) => {
    if (!user?.id || !id) return;
    setLikeBusy(comment._id);

    const wasLiked = comment.likes?.includes(user.id) ?? false;
    const optimisticLikes = wasLiked
      ? (comment.likes ?? []).filter((uid) => uid !== user.id)
      : [...(comment.likes ?? []), user.id];

    setComments((prev) =>
      prev.map((item) =>
        item._id === comment._id ? { ...item, likes: optimisticLikes } : item,
      ),
    );

    try {
      const updated = await likePollComment(String(id), comment._id, user.id);
      setComments((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (err) {
      console.error("poll comment like:", err);
      setComments((prev) =>
        prev.map((item) => (item._id === comment._id ? comment : item)),
      );
    } finally {
      setLikeBusy(null);
    }
  };

  if (loading || !poll) {
    return <AppSpinner />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FlatList
        style={styles.list}
        data={comments}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={{ padding: 12 }}>
            <PollCard poll={poll} userId={user?.id} onUpdated={setPoll} />
            {poll.analytics ? (
              <View
                style={[
                  styles.analytics,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.analyticsTitle, { color: theme.text }]}>
                  Vote breakdown
                </Text>
                {poll.analytics.byLevel?.slice(0, 5).map((row, i) => (
                  <Text key={i} style={{ color: theme.subtext, fontSize: 12 }}>
                    {row._id.levelType} · {row._id.levelValue}: {row.votes}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text
              style={{
                color: theme.text,
                fontWeight: "700",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Comments
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.comment, { borderBottomColor: theme.border }]}>
            <View style={styles.commentBody}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                {[item.user?.firstName, item.user?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                  item.user?.companyName ||
                  item.user?.nickName ||
                  "User"}
              </Text>
              <Text style={{ color: theme.text, marginTop: 4 }}>{item.text}</Text>
              <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>
                {moment(item.createdAt).fromNow()}
              </Text>
            </View>
            <Pressable
              onPress={() => void toggleCommentLike(item)}
              disabled={likeBusy === item._id || !user?.id}
              hitSlop={8}
              style={styles.commentLike}
            >
              <Ionicons
                name={item.likes?.includes(user?.id ?? "") ? "heart" : "heart-outline"}
                size={19}
                color={
                  item.likes?.includes(user?.id ?? "")
                    ? "#E0245E"
                    : theme.subtext
                }
              />
              <Text
                style={{
                  color: item.likes?.includes(user?.id ?? "")
                    ? "#E0245E"
                    : theme.subtext,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {item.likes?.length ?? 0}
              </Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={{
          paddingBottom: COMPOSER_MIN_HEIGHT + bottomInset + 16,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <Animated.View
        style={[
          styles.composer,
          composerStyle,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={theme.subtext}
          style={[
            styles.composerInput,
            { color: theme.text, borderColor: theme.border },
          ]}
        />
        <Pressable
          onPress={() => void sendComment()}
          disabled={sending || !text.trim()}
          style={[
            styles.sendBtn,
            { opacity: sending || !text.trim() ? 0.5 : 1 },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Post</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  analytics: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  analyticsTitle: { fontWeight: "700", marginBottom: 8 },
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentLike: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    paddingTop: 2,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: "#1d9bf0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
