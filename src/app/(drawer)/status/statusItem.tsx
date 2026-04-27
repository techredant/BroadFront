import useSWR from "swr";
import {
  FlatList,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import StatusItem from "./drawer_status";
import { CreateStatus } from "@/app/(drawer)/(status)/CreateStatus";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StatusScreen() {
  const { theme } = useTheme();

  const { data, isLoading, error } = useSWR(
    "https://cast-api-zeta.vercel.app/api/status",
    fetcher,
  );

  const statuses = data || [];

  const groupedStatuses = Object.values(
    statuses.reduce((acc: any, status: any) => {
      const key = status.userId;

      if (!acc[key]) {
        acc[key] = {
          userId: key,
          firstName: status.firstName,
          lastName: status.lastName,
          statuses: [],
        };
      }

      acc[key].statuses.push(status);

      return acc;
    }, {}),
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Failed to load statuses</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]}>
        <DrawerMenuButton />
      <Text style={{ textAlign: "center", marginTop: 20, fontWeight: "bold", fontSize: 20 }}>{groupedStatuses.length} status</Text>
      <FlatList
        data={groupedStatuses}
        keyExtractor={(item: any) => item.userId}
        renderItem={({ item }) => <StatusItem userStatus={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<CreateStatus />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* =========================
     CONTAINERS
  ========================= */
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* =========================
     LIST STYLES
  ========================= */
  separator: {
    height: 1,
    marginLeft: 80,
    opacity: 0.2,
    backgroundColor: "#999",
  },

  /* =========================
     TEXT
  ========================= */
  title: {
    fontSize: 14,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 12,
    opacity: 0.7,
  },

  /* =========================
     LOADING / STATES
  ========================= */
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 14,
    color: "red",
    fontWeight: "500",
  },
});
