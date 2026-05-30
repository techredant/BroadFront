import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useNotificationBadge } from "@/context/notification";

type Props = {
  size?: number;
  color?: string;
};

export function NotificationBell({ size = 24, color }: Props) {
  const { theme } = useTheme();
  const unreadCount = useNotificationBadge();
  const tint = color || theme.text;

  return (
    <Pressable
      onPress={() => router.push("/(drawer)/(drawerPages)/ActivityInbox")}
      hitSlop={10}
      style={styles.wrap}
    >
      <Ionicons name="notifications-outline" size={size} color={tint} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.danger || "#dc3545" }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
