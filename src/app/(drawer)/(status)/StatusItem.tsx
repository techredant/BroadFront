import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { StatusRing } from "./StatusRing";
import { StatusStoryThumb } from "./StatusStoryThumb";
import {
  STATUS_ITEM_WIDTH,
  STATUS_RING_SIZE,
} from "@/constants/statusTheme";
import { getLatestStatus, statusDisplayName } from "@/utils/statusUser";

export function StatusItem({
  userStatus,
  currentUserId,
}: {
  userStatus: any;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const latest = getLatestStatus(userStatus.statuses);
  const displayName = statusDisplayName(latest, userStatus);

  const handlePress = () => {
    router.push(`/(status)/Viewer?user=${userStatus.userId}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.ringWrap}>
        <StatusRing
          size={STATUS_RING_SIZE}
          statuses={userStatus.statuses ?? []}
          currentUserId={currentUserId}
        />
        <StatusStoryThumb status={latest} ringSize={STATUS_RING_SIZE} />
      </View>
      <Text
        style={[styles.label, { color: theme.text }]}
        numberOfLines={1}
      >
        {displayName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: STATUS_ITEM_WIDTH,
  },
  ringWrap: {
    width: STATUS_RING_SIZE,
    height: STATUS_RING_SIZE,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    width: STATUS_ITEM_WIDTH,
  },
});
