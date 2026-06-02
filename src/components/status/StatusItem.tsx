import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { StatusRing } from "./StatusRing";
import { StatusStoryThumb } from "./StatusStoryThumb";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";
import {
  STATUS_ITEM_WIDTH,
  STATUS_RING_SIZE,
} from "@/constants/statusTheme";
import { getLatestStatus, statusDisplayName } from "@/utils/statusUser";
import { seedStatusCache } from "@/utils/statusCache";
import {
  STATUS_PREVIEW_USER_LIMIT,
  warmStatusCachesForUsers,
} from "@/utils/statusList";
import { prefetchStatusMedia } from "@/utils/statusEngine";

export function StatusItem({
  userStatus,
  currentUserId,
  allUserIds,
  userIndex,
}: {
  userStatus: any;
  currentUserId?: string | null;
  allUserIds?: string[];
  userIndex?: number;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const latest = getLatestStatus(userStatus.statuses);
  const displayName = statusDisplayName(latest, userStatus);

  const handlePress = () => {
    const stories = userStatus.statuses ?? [];
    seedStatusCache(userStatus.userId, stories);
    void prefetchStatusMedia(stories, 0, 3);
    if (allUserIds?.length && userIndex !== undefined) {
      const warmStart = Math.max(0, userIndex);
      const warmEnd = Math.min(
        allUserIds.length,
        userIndex + STATUS_PREVIEW_USER_LIMIT,
      );
      warmStatusCachesForUsers(allUserIds.slice(warmStart, warmEnd));
      const encodedList = encodeURIComponent(JSON.stringify(allUserIds));
      router.push({
        pathname: "/(status)/Viewer",
        params: {
          user: userStatus.userId,
          userList: encodedList,
          userIndex: String(userIndex),
        },
      });
      return;
    }
    router.push(`/(status)/Viewer?user=${userStatus.userId}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <PresenceAvatar userId={userStatus.userId} size={STATUS_RING_SIZE}>
        <StatusRing
          size={STATUS_RING_SIZE}
          statuses={userStatus.statuses ?? []}
          currentUserId={currentUserId}
        />
        <StatusStoryThumb status={latest} ringSize={STATUS_RING_SIZE} />
      </PresenceAvatar>
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
