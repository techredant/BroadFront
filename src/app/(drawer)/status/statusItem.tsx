import {
  FlatList,
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import StatusListRow from "@/components/status/StatusListRow";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { MyStatusRow } from "@/components/status/MyStatusRow";
import { StatusRowSkeleton } from "@/components/status/StatusRowSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { enrichStatusGroup } from "@/utils/statusUser";
import { useStatusList } from "@/hooks/useStatusList";

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

  const { statuses, isRefreshing } = useStatusList();

  const { myGroup, recent, viewed } = useMemo(() => {
    const grouped = groupStatuses(statuses);
    const mine = grouped.find((g: any) => g.userId === viewerId);
    const others = grouped.filter((g: any) => g.userId !== viewerId);
    const unviewed = others.filter((g) => isGroupUnviewed(g, viewerId));
    const seen = others.filter((g) => !isGroupUnviewed(g, viewerId));
    return { myGroup: mine, recent: unviewed, viewed: seen };
  }, [statuses, viewerId]);

  const sections = useMemo(() => {
    const items: { type: "header" | "row"; key: string; group?: any; title?: string; userIndex?: number }[] = [];

    if (recent.length > 0) {
      items.push({ type: "header", key: "h-recent", title: "Recent updates" });
      recent.forEach((g: any, idx: number) =>
        items.push({ type: "row", key: g.userId, group: g, userIndex: idx }),
      );
    }
    if (viewed.length > 0) {
      items.push({ type: "header", key: "h-viewed", title: "Viewed updates" });
      viewed.forEach((g: any, idx: number) =>
        items.push({ type: "row", key: g.userId, group: g, userIndex: recent.length + idx }),
      );
    }

    return items;
  }, [recent, viewed]);

  const showSkeleton = isRefreshing && sections.length === 0;

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
        data={showSkeleton ? SKELETON_KEYS : sections}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <MyStatusRow myStatuses={myGroup?.statuses ?? []} />
        }
        renderItem={({ item }) => {
          if (showSkeleton) {
            return <StatusRowSkeleton />;
          }
          if (item.type === "header") {
            return (
              <Text style={[styles.sectionTitle, { color: theme.subtext }]}>
                {item.title}
              </Text>
            );
          }
          const allUsers = [...recent, ...viewed];
          const allUserIds = allUsers.map((g) => g.userId);
          return (
            <StatusListRow
              userStatus={item.group}
              currentUserId={viewerId}
              allUserIds={allUserIds}
              userIndex={item.userIndex}
            />
          );
        }}
        ItemSeparatorComponent={({ leadingItem }) =>
          !showSkeleton && leadingItem?.type === "row" ? (
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

const SKELETON_KEYS = [
  { key: "sk-0" },
  { key: "sk-1" },
  { key: "sk-2" },
  { key: "sk-3" },
];

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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 82,
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
  },
});
