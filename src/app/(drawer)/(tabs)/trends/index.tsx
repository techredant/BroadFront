import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../../../components/Button/DrawerMenuButton";
import axios from "axios";
import { router } from "expo-router";

type Trend = {
  id: string;
  category: string;
  title: string;
  posts: number;
  keyword: string;
};

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function TrendsScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();

  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  ];

  type Post = {
    id: string;
    content?: string;
    caption?: string;
  };

  // ✅ FIXED: correct helper function (NO hooks inside)
  const extractTrends = (posts: Post[]): Trend[] => {
    const counts: Record<string, number> = {};

    posts?.forEach((post) => {
      const text = (post.caption || post.content || "").toLowerCase();

      // hashtags
      const hashtags = text.match(/#\w+/g) || [];
      hashtags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 2;
      });

      // keywords
      POLITICAL_KEYWORDS.forEach((keyword) => {
        if (text.includes(keyword)) {
          const tag = `#${keyword.replace(/\s/g, "")}`;
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([title, posts], index) => ({
        id: String(index),
        category: "Kenya · Politics",
        title,
        posts,
        keyword: title.replace("#", "").toLowerCase(),
      }))
      .sort((a, b) => b.posts - a.posts);
  };

  // ✅ FIXED fetch function
  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);

      const url = `${BASE_URL}/api/posts?levelType=${currentLevel?.type}&levelValue=${currentLevel?.value}`;

      const res = await axios.get(url);

      const posts = res.data || [];

      const generatedTrends = extractTrends(posts);

      setTrends(generatedTrends);
    } catch (err) {
      console.log("Failed to fetch trends", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLevel]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrends(); // ✅ FIXED (was fetchPosts ❌)
  };

    // ✅ loading state (clean UI)
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size={"small"} color={theme.text}/>
          <Text>Loading trends...</Text>
        </View>
      );
    }
  const renderTrend = ({ item, index }: { item: Trend; index: number }) => (
    <Pressable
      style={[styles.trendItem, { borderBottomColor: theme.border }]}
      onPress={() => {
        router.push({
          pathname: "/(drawer)/trend/[title]",
          params: {
            title: item.title,
            keyword: item.keyword,
          },
        });
      }}
    >
      <View style={{ flexDirection: "row" }}>
        <Text style={[styles.rank, { color: theme.subtext }]}>{index + 1}</Text>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[styles.category, { color: theme.subtext }]}>
            {item.category}
          </Text>

          <Text style={[styles.title, { color: theme.text }]}>
            {item.title}
          </Text>

          <Text style={[styles.postCount, { color: theme.subtext }]}>
            {item.posts.toLocaleString()} posts
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerMenuButton />

      <FlatList
        data={trends}
        keyExtractor={(item) => item.id}
        renderItem={renderTrend}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingTop: 40, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Trends
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Trends for {currentLevel?.value}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No trends found
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  trendItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rank: { fontSize: 18, fontWeight: "600", width: 24 },
  category: { fontSize: 12, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: "700" },
  postCount: { fontSize: 13, marginTop: 2 },
});
