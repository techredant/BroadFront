import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import moment from "moment";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Poll } from "@/types/poll";
import { votePoll, sharePoll } from "@/services/pollsApi";

type Props = {
  poll: Poll;
  userId?: string;
  compact?: boolean;
  onUpdated?: (poll: Poll) => void;
};

function creatorLabel(poll: Poll) {
  if (poll.isAnonymous) return "Anonymous";
  const c = poll.creator;
  if (!c) return "Poll";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return name || c.companyName || c.nickName || "User";
}

export function PollCard({ poll, userId, compact, onUpdated }: Props) {
  const { theme, isDark } = useTheme();
  const { id: routePollId } = useLocalSearchParams<{ id?: string | string[] }>();
  const [local, setLocal] = useState(poll);
  const [voting, setVoting] = useState<string | null>(null);

  const activeRoutePollId = Array.isArray(routePollId)
    ? routePollId[0]
    : routePollId;
  const isOnThisPollDetail =
    activeRoutePollId != null &&
    String(activeRoutePollId) === String(local._id);

  const openPollDetail = useCallback(() => {
    if (isOnThisPollDetail) return;
    router.push({
      pathname: "/(drawer)/polls/[id]",
      params: { id: local._id },
    });
  }, [isOnThisPollDetail, local._id]);

  const closed =
    local.status === "closed" || new Date(local.expiresAt) <= new Date();
  const showResults = closed || local.hasVoted;

  const timeLeft = useMemo(() => {
    if (closed) return "Final results";
    return moment(local.expiresAt).fromNow(true) + " left";
  }, [closed, local.expiresAt]);

  const onVote = useCallback(
    async (optionId: string) => {
      if (!userId || local.hasVoted || closed || voting) return;
      setVoting(optionId);
      try {
        const updated = await votePoll(local._id, userId, optionId);
        setLocal(updated);
        onUpdated?.(updated);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 409) {
          setLocal((p) => ({ ...p, hasVoted: true }));
        }
      } finally {
        setVoting(null);
      }
    },
    [userId, local, closed, voting, onUpdated],
  );

  const onShare = useCallback(async () => {
    try {
      const { url } = await sharePoll(local._id);
      await Share.share({
        message: `${local.question}\n${url}`,
      });
      setLocal((p) => ({ ...p, shareCount: (p.shareCount || 0) + 1 }));
    } catch {
      /* user cancelled */
    }
  }, [local]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: isDark ? "#16181c" : "#fff",
      borderColor: isDark ? "#2f3336" : "#eff3f4",
    },
  ];

  const cardBody = (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {!local.isAnonymous && local.creator?.isVerified ? (
            <View style={styles.nameRow}>
              <Text style={[styles.creator, { color: theme.text }]}>
                {creatorLabel(local)}
              </Text>
              <VerifiedBadge
                isVerified={local.creator?.isVerified}
                verificationType={local.creator?.verificationType}
                size={14}
              />
            </View>
          ) : (
            <Text style={[styles.creator, { color: theme.text }]}>
              {creatorLabel(local)}
            </Text>
          )}
          <Text style={[styles.meta, { color: theme.subtext }]}>
            {local.levelType} · {local.levelValue} · {timeLeft}
            {local.verifiedOnly ? " · Verified voters" : ""}
          </Text>
        </View>
        {local.liveCallId ? (
          <Ionicons name="radio" size={18} color="#FE2C55" />
        ) : null}
      </View>

      <Text style={[styles.question, { color: theme.text }]}>
        {local.question}
      </Text>

      <View style={styles.options}>
        {local.options.map((opt) => {
          const selected = local.myVoteOptionId === opt._id;
          const pct = opt.percent ?? 0;

          return (
            <Pressable
              key={opt._id}
              disabled={showResults || !userId}
              onPress={(e) => {
                e.stopPropagation?.();
                void onVote(opt._id);
              }}
              style={[
                styles.option,
                {
                  borderColor: selected ? "#1d9bf0" : theme.border,
                  backgroundColor: isDark ? "#0f1419" : "#f7f9f9",
                },
              ]}
            >
              {showResults ? (
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: selected
                        ? "rgba(29,155,240,0.35)"
                        : "rgba(29,155,240,0.12)",
                    },
                  ]}
                />
              ) : null}
              <View style={styles.optionInner}>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.text,
                      fontWeight: selected ? "700" : "500",
                    },
                  ]}
                  numberOfLines={compact ? 1 : 2}
                >
                  {opt.text}
                </Text>
                {showResults ? (
                  <Text style={[styles.pct, { color: theme.subtext }]}>
                    {pct}%
                  </Text>
                ) : voting === opt._id ? (
                  <ActivityIndicator size="small" color="#1d9bf0" />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.votes, { color: theme.subtext }]}>
          {local.totalVotes.toLocaleString()} votes
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              openPollDetail();
            }}
            hitSlop={8}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={theme.subtext}
            />
            <Text style={[styles.actionCount, { color: theme.subtext }]}>
              {local.commentCount || 0}
            </Text>
          </Pressable>
          <Pressable onPress={() => void onShare()} hitSlop={8}>
            <Ionicons name="share-outline" size={18} color={theme.subtext} />
          </Pressable>
        </View>
      </View>
    </>
  );

  if (isOnThisPollDetail) {
    return <View style={cardStyle}>{cardBody}</View>;
  }

  return (
    <Pressable onPress={openPollDetail} style={cardStyle}>
      {cardBody}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creator: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  question: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 12,
  },
  options: { gap: 8 },
  option: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 44,
    justifyContent: "center",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 1,
  },
  optionText: { flex: 1, fontSize: 15 },
  pct: { fontSize: 14, fontWeight: "700", marginLeft: 8 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  votes: { fontSize: 13 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionCount: { fontSize: 12 },
});

export const MemoizedPollCard = React.memo(PollCard);
