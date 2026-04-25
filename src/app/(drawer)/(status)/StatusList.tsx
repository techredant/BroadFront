import { FlatList, View, Text, StyleSheet } from "react-native";
import { CreateStatus } from "./CreateStatus";
import { useTheme } from "@/context/ThemeContext";
import { StatusItem } from "./StatusItem";

interface Status {
  id: string;
  viewed: boolean;
  user: {
    name: string;
    avatar: string;
  };
}

export function StatusList({ statuses }: { statuses: Status[] }) {
  const { theme } = useTheme();

  const groupedStatuses = Object.values(
    statuses.reduce((acc: any, status) => {
      const key = status.user.name;

      if (!acc[key]) {
        acc[key] = {
          user: status.user,
          statuses: [],
        };
      }

      acc[key].statuses.push(status);
      return acc;
    }, {}),
  ).sort((a: any, b: any) => {
    const aUnviewed = a.statuses.filter((s: any) => !s.viewed).length;
    const bUnviewed = b.statuses.filter((s: any) => !s.viewed).length;

    return bUnviewed - aUnviewed; // 🔥 users with more new updates first
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <FlatList
        data={groupedStatuses}
        horizontal
        keyExtractor={(item: any, index) => item.user.name + index}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => <StatusItem userStatus={item} />}
        ListHeaderComponent={<CreateStatus />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  listContent: {
    paddingHorizontal: 12,
  },
});
