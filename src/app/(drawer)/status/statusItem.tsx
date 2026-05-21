import useSWR from "swr";
import {
  FlatList,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import StatusListRow from "./drawer_status";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { useUser } from "@clerk/clerk-expo";
import { MyStatusRow } from "@/app/(drawer)/(status)/MyStatusRow";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { enrichStatusGroup } from "@/utils/statusUser";

const BASE_URL = "https://cast-api-zeta.vercel.app/api/status";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function groupStatuses(raw: any[]) {
  return Object.values(
    raw.reduce((acc: any, status: any) => {
      const key = status.userId;
      if (!acc[key]) {
        acc[key] = {
          userId: key,
          firstName: status.firstName,
          lastName: status.lastName,
          companyName: status.companyName,
          nickName: status.nickName,
          image: status.image,
          statuses: [],
        };
      }
      acc[key].statuses.push(status);
      return acc;
    }, {}),
  ).map((g: any) => enrichStatusGroup(g));
}

function isGroupUnviewed(group: any, viewerId: string | null) {
  if (!viewerId) return true;
  return group.statuses.some(
    (s: any) =>
      !(s.views ?? []).some(
        (v: any) => String(v.userId) === String(viewerId),
      ),
  );
}

export default function StatusScreen() {
  const { theme } = useTheme();
  const { user } = useUser();
  const viewerId = user?.id ?? null;

  const { data, isLoading, error } = useSWR(BASE_URL, fetcher);

  const { myGroup, recent, viewed } = useMemo(() => {
    const grouped = groupStatuses(data || []);
    const mine = grouped.find((g: any) => g.userId === viewerId);
    const others = grouped.filter((g: any) => g.userId !== viewerId);
    const unviewed = others.filter((g) => isGroupUnviewed(g, viewerId));
    const seen = others.filter((g) => !isGroupUnviewed(g, viewerId));
    return { myGroup: mine, recent: unviewed, viewed: seen };
  }, [data, viewerId]);

  const sections = useMemo(() => {
    const items: { type: "header" | "row"; key: string; group?: any; title?: string }[] = [];

    if (recent.length > 0) {
      items.push({ type: "header", key: "h-recent", title: "Recent updates" });
      recent.forEach((g: any) =>
        items.push({ type: "row", key: g.userId, group: g }),
      );
    }
    if (viewed.length > 0) {
      items.push({ type: "header", key: "h-viewed", title: "Viewed updates" });
      viewed.forEach((g: any) =>
        items.push({ type: "row", key: g.userId, group: g }),
      );
    }

    return items;
  }, [recent, viewed]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#3797F0" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Failed to load statuses</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={styles.topBar}>
        {/* <DrawerMenuButton /> */}
        <Pressable onPress={() => router.push("/(drawer)/(tabs)")} hitSlop={12} style={{ paddingHorizontal: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Updates</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <MyStatusRow myStatuses={myGroup?.statuses ?? []} />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
                {item.title}
              </Text>
            );
          }
          return (
            <StatusListRow
              userStatus={item.group}
              currentUserId={viewerId}
            />
          );
        }}
        ItemSeparatorComponent={({ leadingItem }) =>
          leadingItem?.type === "row" ? (
            <View
              style={[styles.separator, { backgroundColor: theme.border }]}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          sections.length === 0 ? (
            <Text style={[styles.empty, { color: theme.subtext }]}>
              No updates from contacts yet
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 86,
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
  },
});
