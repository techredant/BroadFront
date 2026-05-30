import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { MemoizedPollCard } from "@/components/polls/PollCard";
import { fetchPolls, fetchTrendingPolls } from "@/services/pollsApi";
import { usePollsSocket } from "@/hooks/usePollsSocket";
import type { Poll } from "@/types/poll";
import { AppSpinner } from "@/components/ui/AppSpinner";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "active" | "trending" | "closed";

function upsertPoll(list: Poll[], poll: Poll): Poll[] {
  const idx = list.findIndex((p) => p._id === poll._id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...poll };
    return next;
  }
  return [poll, ...list];
}

export default function PollsScreen() {
  const { user } = useUser();
  const { currentLevel } = useLevel();
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>("active");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const levelType = currentLevel?.type ?? "county";
  const levelValue = currentLevel?.value ?? "Kenya";

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = {
        levelType,
        levelValue,
        userId: user.id,
        tab,
        limit: 30,
      };
      const data =
        tab === "trending"
          ? await fetchTrendingPolls(params)
          : await fetchPolls(params);
      setPolls(data);
    } catch (err) {
      console.error("polls load:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, levelType, levelValue, tab]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  usePollsSocket(levelType, levelValue, {
    onNewPoll: (poll) => {
      if (tab === "active") {
        setPolls((prev) => upsertPoll(prev, poll));
      }
    },
    onVoteUpdated: (poll) => {
      setPolls((prev) => upsertPoll(prev, poll));
    },
    onPollClosed: (poll) => {
      setPolls((prev) => upsertPoll(prev, poll));
    },
  });

  const tabs = useMemo(
    (): { key: Tab; label: string }[] => [
      { key: "active", label: "Active" },
      { key: "trending", label: "Trending" },
      { key: "closed", label: "Ended" },
    ],
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.topBar]}>
        <DrawerMenuButton />
        <Text style={[styles.title, { color: theme.text }]}>Polls</Text>
        <View style={styles.topBarSide}>
          <Pressable
            onPress={() => router.push("/(drawer)/polls/create")}
            hitSlop={12}
            style={styles.addButton}
          >
            <Ionicons name="add-circle" size={28} color="#1d9bf0" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabs]}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                active && {
                  borderBottomColor: "#1d9bf0",
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.text : theme.subtext,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <AppSpinner />
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListEmptyComponent={
            <Text
              style={{
                color: theme.subtext,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              No {tab} polls for {levelType} · {levelValue}
            </Text>
          }
          renderItem={({ item }) => (
            <MemoizedPollCard
              poll={item}
              userId={user?.id}
              onUpdated={(p) => setPolls((prev) => upsertPoll(prev, p))}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 40,
    paddingBottom: 10,
    // borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarSide: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  addButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 2,
    paddingBottom: 2,
    // borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
});
