import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusRing } from "./StatusRing";
import { StatusStoryThumb } from "./StatusStoryThumb";
import {
  STATUS_ITEM_WIDTH,
  STATUS_RING_SIZE,
  WA_GREEN,
} from "@/constants/statusTheme";
import { useTheme } from "@/context/ThemeContext";
import { getLatestStatus } from "@/utils/statusUser";

interface AvatarWithStatusProps {
  hasStatus?: boolean;
  onPress?: () => void;
  showLabel?: boolean;
  statuses?: any[];
  currentUserId?: string | null;
}

export function AvatarWithStatus({
  hasStatus = false,
  onPress,
  showLabel = true,
  statuses = [],
  currentUserId,
}: AvatarWithStatusProps) {
  const { theme } = useTheme();
  const latest = getLatestStatus(statuses);
  const showRing = hasStatus && statuses.length > 0;

  return (
    <Pressable
      onPress={onPress || (() => router.push("/(status)/StatusInput"))}
      style={styles.wrap}
    >
      <View style={styles.ringWrap}>
        {showRing ? (
          <>
            <StatusRing
              size={STATUS_RING_SIZE}
              statuses={statuses}
              currentUserId={currentUserId}
              forceViewed
            />
            <StatusStoryThumb status={latest} ringSize={STATUS_RING_SIZE} />
          </>
        ) : (
          <View
            style={[
              styles.emptyRing,
              {
                width: STATUS_RING_SIZE,
                height: STATUS_RING_SIZE,
                borderRadius: STATUS_RING_SIZE / 2,
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
          >
            <Ionicons name="add" size={28} color={theme.subtext} />
          </View>
        )}

        <View style={styles.plusBadge}>
          <Ionicons name="add" size={16} color="#fff" />
        </View>
      </View>

      {showLabel && (
        <Text
          style={[styles.label, { color: theme.text }]}
          numberOfLines={1}
        >
          My status
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: STATUS_ITEM_WIDTH,
    marginRight: 2,
  },
  ringWrap: {
    width: STATUS_RING_SIZE,
    height: STATUS_RING_SIZE,
  },
  emptyRing: {
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: WA_GREEN,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    width: STATUS_ITEM_WIDTH,
  },
});
