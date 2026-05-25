import { useTheme } from "@/context/ThemeContext";
import { PoliticalPalette } from "@/constants/politicalTheme";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

export function NotificationPermissionModal({
  visible,
  onEnable,
  onDismiss,
}: Props) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isDark ? "rgba(201,162,39,0.15)" : PoliticalPalette.goldSoft },
            ]}
          >
            <Ionicons
              name="notifications"
              size={32}
              color={PoliticalPalette.gold}
            />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Stay in the loop
          </Text>
          <Text style={[styles.body, { color: theme.subtext }]}>
            Get alerts for messages, calls, mentions, and posts from people you
            follow.
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: PoliticalPalette.navy }]}
            onPress={onEnable}
          >
            <Text style={styles.primaryBtnText}>Turn on notifications</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={onDismiss} hitSlop={8}>
            <Text style={[styles.secondaryBtnText, { color: theme.subtext }]}>
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
