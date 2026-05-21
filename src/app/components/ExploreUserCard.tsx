import { useTheme } from "@/context/ThemeContext";
import { PoliticalPalette } from "@/constants/politicalTheme";
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
  const { theme, isDark } = useTheme();
  const isCreating = creating === item.clerkId;
  const displayName = item.firstName
    ? `${item.firstName} ${item.lastName || ""}`.trim()
    : item.companyName || "Member";
  const handle = formatNickHandle(item.nickName) || "@member";

  return (
    <View
      style={[
        styles.row,
        showDivider && { borderBottomColor: theme.border },
        showDivider && styles.rowDivider,
      ]}
    >
      <Image
        source={{ uri: avatarUri(item) }}
        style={styles.avatar}
        cachePolicy="memory-disk"
        contentFit="cover"
      />

      <View style={styles.rowText}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {displayName}
        </Text>
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

      <Pressable
        onPress={() => onStartChat(item)}
        disabled={creating !== null}
        style={({ pressed }) => [
          styles.messageBtn,
          {
            backgroundColor: isDark
              ? PoliticalPalette.navy
              : PoliticalPalette.navy,
            opacity: pressed || (creating !== null && !isCreating) ? 0.55 : 1,
          },
        ]}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <>
            <Ionicons name="chatbubble-outline" size={20} color={theme.text} />
            <Text style={[styles.messageBtnText, { color: theme.text }]}>Message</Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

export default ExploreUserCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: "#262626",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  handle: {
    fontSize: 12,
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.85,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 96,
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  messageBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
