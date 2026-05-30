import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import moment from "moment";
import { useTheme } from "@/context/ThemeContext";
import { StatusRing } from "@/components/status/StatusRing";
import { StatusStoryThumb } from "@/components/status/StatusStoryThumb";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";
import { STATUS_RING_SIZE } from "@/constants/statusTheme";
import { getLatestStatus, statusDisplayName } from "@/utils/statusUser";

type Props = {
  userStatus: any;
  currentUserId?: string | null;
  allUserIds?: string[];
  userIndex?: number;
};

export default function StatusListRow({ userStatus, currentUserId, allUserIds, userIndex }: Props) {
  const router = useRouter();
  const { theme } = useTheme();

  const latest = getLatestStatus(userStatus.statuses);
  const displayName = statusDisplayName(latest, userStatus);

  const latestTime = latest?.createdAt;
  const allViewed = (userStatus.statuses ?? []).every((s: any) =>
    (s.views ?? []).some(
      (v: any) => String(v.userId) === String(currentUserId),
    ),
  );

  const handlePress = () => {
    if (allUserIds && userIndex !== undefined) {
      const encodedList = encodeURIComponent(JSON.stringify(allUserIds));
      router.push({
        pathname: "/(status)/Viewer",
        params: {
          user: userStatus.userId,
          userList: encodedList,
          userIndex: userIndex.toString(),
        },
      });
    } else {
      router.push(`/(status)/Viewer?user=${userStatus.userId}`);
    }
  };

  return (
    <Pressable
      style={[styles.row, { backgroundColor: theme.background }]}
      onPress={handlePress}
    >
      <PresenceAvatar userId={userStatus.userId} size={STATUS_RING_SIZE}>
        <StatusRing
          size={STATUS_RING_SIZE}
          statuses={userStatus.statuses ?? []}
          currentUserId={currentUserId}
        />
        <StatusStoryThumb status={latest} ringSize={STATUS_RING_SIZE} />
      </PresenceAvatar>

      <View style={styles.middle}>
        <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
        <Text
          style={[
            styles.caption,
            { color: allViewed ? theme.subtext : theme.text },
          ]}
          numberOfLines={1}
        >
          {latestTime ? moment(latestTime).fromNow() : "Just now"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  middle: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  caption: {
    fontSize: 13,
    marginTop: 2,
  },
});
