import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import axios from "axios";
import { router } from "expo-router";
import {
  useShowTabBarOnFocus,
  useTabBarScrollHandler,
} from "@/context/TabBarVisibilityContext";
import { getPoliticalColors, PoliticalPalette } from "@/constants/politicalTheme";
import { SmartSearchBar } from "@/components/ai/SmartSearchBar";
import { TrendRowSkeleton } from "@/components/trends/TrendRowSkeleton";

type Trend = {
  id: string;
  category: string;
  title: string;
  posts: number;
  keyword: string;
};

const BASE_URL = "https://cast-api-zeta.vercel.app";

const POLITICAL_KEYWORDS = [
  "ruto",
  "president",
  "raila",
  "iebc",
  "parliament",
  "senate",
  "mp",
  "governor",
  "finance bill",
  "budget",
  "cabinet",
  "election",
  "votes",
  "cs",
  "mwejeje",
];

type Post = {
  id: string;
  content?: string;
  caption?: string;
};

function extractTrends(posts: Post[]): Trend[] {
  const counts: Record<string, number> = {};

  posts?.forEach((post) => {
    const text = (post.caption || post.content || "").toLowerCase();
    const hashtags = text.match(/#\w+/g) || [];
    hashtags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 2;
    });

    POLITICAL_KEYWORDS.forEach((keyword) => {
      if (text.includes(keyword)) {
        const tag = `#${keyword.replace(/\s/g, "")}`;
        counts[tag] = (counts[tag] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .map(([title, postCount], index) => ({
      id: `${title}-${index}`,
      category: "Kenya · Politics",
      title,
      posts: postCount,
      keyword: title.replace("#", "").toLowerCase(),
    }))
    .sort((a, b) => b.posts - a.posts);
}

function rankStyle(index: number) {
  if (index === 0) return { bg: PoliticalPalette.goldSoft, color: PoliticalPalette.gold };
  if (index === 1) return { bg: "rgba(148,163,184,0.2)", color: "#94A3B8" };
  if (index === 2) return { bg: "rgba(180,120,80,0.2)", color: "#B47850" };
  return { bg: "transparent", color: undefined };
}

export default function TrendsScreen() {
  const { currentLevel, userDetails, posts: levelPosts } = useLevel();
  const { theme, isDark } = useTheme();
  const civic = useMemo(() => getPoliticalColors(isDark), [isDark]);
  const onTabBarScroll = useTabBarScrollHandler();
  useShowTabBarOnFocus();

  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const maxPosts = useMemo(
    () => (trends.length ? Math.max(...trends.map((t) => t.posts)) : 1),
    [trends],
  );

  const levelLabel = useMemo(() => {
    const v = currentLevel?.value;
    if (!v || v.toLowerCase() === "home") return "National";
    return v.charAt(0).toUpperCase() + v.slice(1);
  }, [currentLevel?.value]);

  const fetchTrends = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        const url = `${BASE_URL}/api/posts?levelType=${currentLevel?.type}&levelValue=${currentLevel?.value}`;
        const res = await axios.get(url);
        const posts = res.data || [];
        setTrends(extractTrends(posts));
      } catch (err) {
        console.log("Failed to fetch trends", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentLevel],
  );

  useEffect(() => {
    if (levelPosts.length > 0) {
      setTrends(extractTrends(levelPosts as Post[]));
      setLoading(false);
      return;
    }
    fetchTrends();
  }, [fetchTrends, levelPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrends(true);
  };

  const openTrend = (item: Trend) => {
    router.push({
      pathname: "/trends/[title]",
      params: { title: item.title, keyword: item.keyword },
    });
  };

  const renderTrend = ({ item, index }: { item: Trend; index: number }) => {
    const rank = rankStyle(index);
    const heat = Math.max(0.12, item.posts / maxPosts);
    const isTopThree = index < 3;

    return (
      <Pressable
        onPress={() => openTrend(item)}
        style={({ pressed }) => [
          styles.trendCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
          },
          isTopThree && styles.trendCardFeatured,
        ]}
      >
        <View
          style={[
            styles.rankBadge,
            {
              backgroundColor: rank.bg || civic.chipBg,
            },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              { color: rank.color || civic.chipText },
            ]}
          >
            {index + 1}
          </Text>
        </View>

        <View style={styles.trendBody}>
          <Text style={[styles.trendCategory, { color: theme.subtext }]}>
            {item.category}
          </Text>
          <Text
            style={[styles.trendTitle, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={styles.trendMeta}>
            <View style={styles.postCountRow}>
              <Ionicons name="chatbubbles-outline" size={14} color={theme.subtext} />
              <Text style={[styles.postCount, { color: theme.subtext }]}>
                {item.posts.toLocaleString()}{" "}
                {item.posts === 1 ? "post" : "posts"}
              </Text>
            </View>
            <View
              style={[
                styles.heatTrack,
                { backgroundColor: isDark ? "#2a2a2a" : "#eee" },
              ]}
            >
              <View
                style={[
                  styles.heatFill,
                  {
                    width: `${heat * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.subtext}
          style={styles.chevron}
        />
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.header}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: civic.chipBg }]}>
          <Ionicons name="flame" size={28} color={civic.chipText} />
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Trending now</Text>
          <Text style={[styles.heroSub, { color: theme.subtext }]}>
            What {levelLabel} is talking about
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statPill,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>
            {trends.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Topics</Text>
        </View>
        <View
          style={[
            styles.statPill,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={[styles.statValue, { color: theme.text }]}
            numberOfLines={1}
          >
            {trends[0]?.title ?? "—"}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>
            #1 trend
          </Text>
        </View>
      </View>

      <SmartSearchBar
        userId={userDetails?.clerkId}
        county={userDetails?.county || currentLevel?.value}
      />

      {trends.length > 0 && (
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
          TOP TOPICS
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerMenuButton />

      <FlatList
        data={loading && !refreshing ? [] : trends}
        keyExtractor={(item) => item.id}
        renderItem={renderTrend}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading && !refreshing ? (
            <TrendRowSkeleton />
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: civic.chipBg }]}>
                <Ionicons name="trending-up" size={32} color={civic.chipText} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No trends yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Post with hashtags or political keywords to start a trend in{" "}
                {levelLabel}.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingCard: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    marginTop: 48,
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  listContent: {
    paddingTop: 48,
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    marginBottom: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  separator: { height: 10 },
  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  trendCardFeatured: {
    paddingVertical: 16,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 15,
    fontWeight: "800",
  },
  trendBody: {
    flex: 1,
    minWidth: 0,
  },
  trendCategory: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  trendMeta: {
    marginTop: 10,
    gap: 8,
  },
  postCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  heatTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  heatFill: {
    height: "100%",
    borderRadius: 2,
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.6,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 21,
  },
});
