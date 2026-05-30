import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { MemoizedPollCard } from "@/components/polls/PollCard";
import { fetchPolls } from "@/services/pollsApi";
import { usePollsSocket } from "@/hooks/usePollsSocket";
import type { Poll } from "@/types/poll";

type Props = {
  callId: string;
  isHost?: boolean;
};

function upsertPoll(list: Poll[], poll: Poll): Poll[] {
  const idx = list.findIndex((p) => p._id === poll._id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...poll };
    return next;
  }
  return [poll, ...list];
}

export function LivePollOverlay({ callId, isHost }: Props) {
  const { user } = useUser();
  const { currentLevel } = useLevel();
  const [open, setOpen] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);

  const levelType = currentLevel?.type ?? "national";
  const levelValue = currentLevel?.value ?? "Kenya";

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchPolls({
        liveCallId: callId,
        levelType,
        levelValue,
        userId: user.id,
        tab: "active",
        limit: 10,
      });
      setPolls(data);
    } catch (err) {
      console.error("live polls:", err);
    }
  }, [callId, user?.id, levelType, levelValue]);

  useEffect(() => {
    void load();
  }, [load]);

  usePollsSocket(levelType, levelValue, {
    onNewPoll: (poll) => {
      if (poll.liveCallId === callId) {
        setPolls((prev) => upsertPoll(prev, poll));
      }
    },
    onVoteUpdated: (poll) => {
      setPolls((prev) => upsertPoll(prev, poll));
    },
    onPollClosed: (poll) => {
      setPolls((prev) => upsertPoll(prev, poll));
    },
  }, callId);

  const activeCount = polls.filter((p) => p.status === "active").length;

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Ionicons name="stats-chart" size={22} color="#fff" />
        {activeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Live polls</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {isHost ? (
              <Pressable
                style={styles.createBtn}
                onPress={() => {
                  setOpen(false);
                  router.push({
                    pathname: "/(drawer)/polls/create",
                    params: { liveCallId: callId },
                  });
                }}
              >
                <Ionicons name="add-circle" size={20} color="#1d9bf0" />
                <Text style={styles.createText}>Create live poll</Text>
              </Pressable>
            ) : null}

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {polls.length === 0 ? (
                <Text style={styles.empty}>No active polls on this stream</Text>
              ) : (
                polls.map((poll) => (
                  <MemoizedPollCard
                    key={poll._id}
                    poll={poll}
                    userId={user?.id}
                    compact
                    onUpdated={(p) =>
                      setPolls((prev) => upsertPoll(prev, p))
                    }
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 12,
    bottom: 200,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(29,155,240,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "#16181c",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createText: { color: "#1d9bf0", fontWeight: "700" },
  empty: { color: "#71767b", textAlign: "center", marginTop: 24 },
});
