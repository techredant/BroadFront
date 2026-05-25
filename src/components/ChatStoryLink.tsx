import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { viewerPathForStoryUser } from "@/utils/streamStory";

type Props = {
  statusUserId: string;
  caption?: string;
};

export function ChatStoryLink({ statusUserId, caption }: Props) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(viewerPathForStoryUser(statusUserId))}
      style={[
        styles.row,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.primary + "22" }]}>
        <Ionicons name="albums-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.text }]}>View story</Text>
        {caption ? (
          <Text style={[styles.caption, { color: theme.subtext }]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1 },
  title: { fontSize: 13, fontWeight: "700" },
  caption: { fontSize: 11, marginTop: 2 },
});
