import { useTheme } from "@/context/ThemeContext";
import { formatNickHandle } from "@/utils/nickName";
import type { StreamChatTarget } from "@/utils/streamUser";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Shared row spacing — vertical gaps match horizontal gutters. */
export const EXPLORE_ROW_GAP = 16;
const ROW_PADDING_V = 9;
const ROW_PADDING_H = EXPLORE_ROW_GAP;
const AVATAR_SIZE = 44;

type ExploreUserCardProps = {
  item: StreamChatTarget & {
    image: string | null;
    firstName: string;
    lastName: string;
    nickName: string;
    companyName: string;
  };
  creating: string | null;
  onStartChat: (target: StreamChatTarget) => void;
  showDivider?: boolean;
};

function avatarUri(item: ExploreUserCardProps["item"]) {
  if (item.image) return item.image;
  const name = item.firstName || item.companyName || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1B3A6B&color=fff`;
}

const ExploreUserCard = ({
  item,
  creating,
  onStartChat,
  showDivider = false,
}: ExploreUserCardProps) => {
  const { theme } = useTheme();
  const displayName = item.firstName
    ? `${item.firstName} ${item.lastName || ""}`.trim()
    : item.companyName || "Member";
  const handle = formatNickHandle(item.nickName) || "@member";
  const subtitle =
    item.companyName && item.firstName
      ? `${handle} · ${item.companyName}`
      : handle;

  const busy = creating !== null;
  const isCreating = creating === item.clerkId;

  return (
    <Pressable
      onPress={() => onStartChat(item)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${displayName}`}
      accessibilityHint="Opens a direct message"
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: theme.border },
        showDivider && styles.rowDivider,
        pressed && !busy && styles.rowPressed,
      ]}
    >
      <View style={styles.rowInner}>
        <View style={styles.identity}>
          <Image
            source={{ uri: avatarUri(item) }}
            style={styles.avatar}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
          <View style={styles.userInfo}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.subtext }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.chatAction,
            { opacity: busy && !isCreating ? 0.45 : 1 },
          ]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View style={styles.chatActionInner}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={theme.primary}
                style={styles.chatIcon}
              />
              <Text style={[styles.messageLabel, { color: theme.primary }]}>
                Message
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default ExploreUserCard;

const styles = StyleSheet.create({
  row: {
    paddingVertical: ROW_PADDING_V,
    paddingHorizontal: ROW_PADDING_H,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: ROW_PADDING_H,

  },
  rowPressed: {
    opacity: 0.72,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginRight: EXPLORE_ROW_GAP,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 14,
    backgroundColor: "#262626",
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  chatAction: {
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: "center",
    paddingLeft: 8,
    paddingRight: 2,
  },
  chatActionInner: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  chatIcon: {
    marginRight: 6,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 0,
  },
});
