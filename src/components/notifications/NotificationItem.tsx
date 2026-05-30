import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/context/ThemeContext";
import type { AppNotification } from "@/types/notifications";
import {
  formatNotificationTime,
  notificationIcon,
} from "@/types/notifications";

type Props = {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
};

function NotificationItemComponent({
  item,
  onPress,
  onMarkRead,
  onDelete,
}: Props) {
  const { theme, isDark } = useTheme();
  const id = item._id;
  const unread = !item.read;

  const renderRightActions = () => (
    <View style={styles.actions}>
      {!item.read && id ? (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => onMarkRead(id)}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </Pressable>
      ) : null}
      {id ? (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.danger || "#dc3545" }]}
          onPress={() => onDelete(id)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={() => onPress(item)}
        style={[
          styles.row,
          {
            backgroundColor: unread
              ? isDark
                ? "rgba(10,132,255,0.08)"
                : "rgba(0,122,255,0.06)"
              : theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          {item.actor?.image ? (
            <Image source={{ uri: item.actor.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.card }]}>
              <Ionicons
                name={notificationIcon(item.type) as any}
                size={20}
                color={theme.primary}
              />
            </View>
          )}
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
            {item.groupCount && item.groupCount > 1
              ? ` · ${item.groupCount}`
              : ""}
          </Text>
          {item.body ? (
            <Text style={[styles.body, { color: theme.subtext }]} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={[styles.time, { color: theme.subtext }]}>
            {formatNotificationTime(item.createdAt)}
          </Text>
        </View>

        {item.mediaPreview ? (
          <Image source={{ uri: item.mediaPreview }} style={styles.preview} />
        ) : null}
      </Pressable>
    </Swipeable>
  );
}

export const NotificationItem = memo(NotificationItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0A84FF",
    borderWidth: 2,
    borderColor: "#000",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  preview: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    width: 72,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
