import { FlatList, View, StyleSheet } from "react-native";
import { CreateStatus } from "./CreateStatus";
import { useTheme } from "@/context/ThemeContext";
import { StatusItem } from "./StatusItem";

interface Status {
  _id: string;
  userId: string;
  viewed: boolean;
  caption: string;
  media: string[];
  backgroundColor: string;
  createdAt: string;
  
}

export function Status({ statuses }: { statuses: Status[] }) {
  const { theme } = useTheme();

  /* =========================
     GROUP BY USER
  ========================= */
const groupedStatuses = Object.values(
  statuses.reduce((acc: any, status) => {
    const key = status.userId;

    if (!acc[key]) {
      acc[key] = {
        userId: status.userId,
        statuses: [],
      };
    }

    acc[key].statuses.push(status);

    return acc;
  }, {})
).map((group: any) => {
  // IMPORTANT: sort each user’s statuses same as viewer
  group.statuses.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return group;
});

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <FlatList
        data={groupedStatuses}
        horizontal
        keyExtractor={(item: any) => item.userId}
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

  listContent: {
    paddingHorizontal: 12,
  },
});
