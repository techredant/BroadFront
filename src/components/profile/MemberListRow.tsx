import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatNickHandle } from "@/utils/nickName";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";

const IG_BLUE = "#0095F6";

export type MemberListUser = {
  clerkId: string;
  image?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  nickName?: string;
  isVerified?: boolean;
};

function memberAvatarUri(item: MemberListUser) {
  if (item?.image) return item.image;
  const name = item.firstName || item.companyName || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1B3A6B&color=fff`;
}

type Props = {
  item: MemberListUser;
  isFollowing: boolean;
  onFollowPress: (clerkId: string) => void;
  /** Override Clerk user id for "You" detection */
  currentUserId?: string;
};

export function MemberListRow({
  item,
  isFollowing,
  onFollowPress,
  currentUserId,
}: Props) {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const myId = currentUserId ?? user?.id;
  const isCurrentUser = item.clerkId === myId;

  const displayName = item.firstName
    ? `${item.firstName} ${item.lastName || ""}`.trim()
    : item.companyName || "Member";
  const handle = formatNickHandle(item.nickName) || "@member";

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable
        style={styles.rowMain}
        onPress={() => router.push(`/(profileId)/${item.clerkId}`)}
      >
        <PresenceAvatar
          userId={item.clerkId}
          size={44}
          imageUri={memberAvatarUri(item)}
        />

        <View style={styles.rowText}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <VerifiedBadge isVerified={item.isVerified} size={14} />
          </View>
          <Text
            style={[styles.handle, { color: theme.subtext }]}
            numberOfLines={1}
          >
            {handle}
          </Text>
          {item.companyName && item.firstName ? (
            <Text
              style={[styles.meta, { color: theme.subtext }]}
              numberOfLines={1}
            >
              {item.companyName}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {isCurrentUser ? (
        <View
          style={[
            styles.youPill,
            { backgroundColor: isDark ? "#262626" : "#EFEFEF" },
          ]}
        >
          <Text style={[styles.youText, { color: theme.subtext }]}>You</Text>
        </View>
      ) : isFollowing ? (
        <Pressable
          style={[
            styles.followingBtn,
            {
              backgroundColor: isDark ? "#262626" : "#EFEFEF",
              borderColor: isDark ? "#363636" : "#DBDBDB",
            },
          ]}
          onPress={() => onFollowPress(item.clerkId)}
        >
          <Text style={[styles.followingBtnText, { color: theme.text }]}>
            Following
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.followBtn}
          onPress={() => onFollowPress(item.clerkId)}
        >
          <Text style={styles.followBtnText}>Follow</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ProfilePeopleListHint({
  count,
  label,
}: {
  count: number;
  label: "followers" | "following";
}) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.resultHint, { color: theme.subtext }]}>
      {count} {count === 1 ? "person" : "people"} · {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 12,
    backgroundColor: "#262626",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  handle: {
    fontSize: 12,
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    marginTop: 1,
    opacity: 0.85,
  },
  followBtn: {
    minWidth: 92,
    height: 32,
    borderRadius: 8,
    backgroundColor: IG_BLUE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  followBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  followingBtn: {
    minWidth: 92,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  followingBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  youPill: {
    minWidth: 72,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  youText: {
    fontSize: 12,
    fontWeight: "600",
  },
  resultHint: {
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
});
