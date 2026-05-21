import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { useUser } from "@clerk/clerk-expo";
import { StatusRing } from "./StatusRing";
import { StatusStoryThumb } from "./StatusStoryThumb";
import { getLatestStatus } from "@/utils/statusUser";
import { WA_GREEN, STATUS_RING_SIZE } from "@/constants/statusTheme";

type Props = {
  myStatuses?: any[];
};

export function MyStatusRow({ myStatuses = [] }: Props) {
  const { theme } = useTheme();
  const { userDetails } = useLevel();
  const { user } = useUser();

  const latest = getLatestStatus(myStatuses);
  const hasStatus = myStatuses.length > 0;

  const openViewer = () => {
    if (hasStatus && user?.id) {
      router.push(`/(status)/Viewer?user=${user.id}`);
    } else {
      router.push("/(status)/StatusInput");
    }
  };

  const openCreate = () => router.push("/(status)/StatusInput");

  return (
    <Pressable
      onPress={openViewer}
      style={[styles.row, { backgroundColor: theme.background }]}
    >
      <Pressable onPress={openCreate} style={{ width: STATUS_RING_SIZE, height: STATUS_RING_SIZE }}>
        <View style={{ width: STATUS_RING_SIZE, height: STATUS_RING_SIZE }}>
          {hasStatus ? (
            <>
              <StatusRing size={STATUS_RING_SIZE} statuses={myStatuses} forceViewed />
              <StatusStoryThumb status={latest} ringSize={STATUS_RING_SIZE} />
            </>
          ) : (
            <View
              style={[
                styles.emptyRing,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="add" size={26} color={theme.subtext} />
            </View>
          )}
          <View style={styles.plus}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </View>
      </Pressable>

      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.text }]}>My status</Text>
        <Text style={[styles.sub, { color: theme.subtext }]} numberOfLines={1}>
          {hasStatus
            ? `Tap to view · ${moment(latest?.createdAt).fromNow()}`
            : "Tap to add status update"}
        </Text>
      </View>

      {hasStatus && (
        <Pressable onPress={openCreate} hitSlop={12} style={styles.addBtn}>
          <Ionicons name="camera-outline" size={22} color={WA_GREEN} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyRing: {
    width: STATUS_RING_SIZE,
    height: STATUS_RING_SIZE,
    borderRadius: STATUS_RING_SIZE / 2,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  plus: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WA_GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  textCol: { flex: 1, marginLeft: 14 },
  title: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 2 },
  addBtn: { padding: 8 },
});
