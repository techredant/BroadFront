import React, { useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";

type Trend = {
  id: string;
  category: string;
  title: string;
  posts: number;
};

export default function TrendsScreen() {
  const { currentLevel } = useLevel();
  const { theme } = useTheme();

  // Mock trends (replace with API later)
  const trends: Trend[] = useMemo(
    () => [
      {
        id: "1",
        category: "Politics · Trending",
        title: "#FinanceBill2026",
        posts: 12400,
      },
      {
        id: "2",
        category: "Kenya · Trending",
        title: "IEBC Reform",
        posts: 8400,
      },
      {
        id: "3",
        category: "County · Trending",
        title: "Governor Debate",
        posts: 5200,
      },
      {
        id: "4",
        category: "National · Trending",
        title: "Fuel Prices",
        posts: 9700,
      },
      {
        id: "5",
        category: "Civic · Trending",
        title: "Youth Empowerment",
        posts: 3100,
      },
    ],
    [],
  );

  const renderTrend = ({ item, index }: { item: Trend; index: number }) => (
    <Pressable style={[styles.trendItem, { borderBottomColor: theme.border }]}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  trendItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rank: {
    fontSize: 18,
    fontWeight: "600",
    width: 24,
  },
  category: {
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  postCount: {
    fontSize: 13,
    marginTop: 2,
  },
});
