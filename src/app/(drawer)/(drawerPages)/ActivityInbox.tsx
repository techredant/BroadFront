import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/notification";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import {
  NOTIFICATION_SECTIONS,
  type AppNotification,
  type NotificationSection,
} from "@/types/notifications";
import { handleNotificationDataRedirect } from "@/utils/notificationRouting";

function SectionTabs({
  active,
  onChange,
}: {
  active: NotificationSection;
  onChange: (section: NotificationSection) => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContent}
    >
      {NOTIFICATION_SECTIONS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: selected
                  ? isDark
                    ? "rgba(10,132,255,0.25)"
                    : "rgba(0,122,255,0.12)"
                  : theme.card,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: selected ? theme.primary : theme.text,
                fontWeight: selected ? "700" : "600",
                fontSize: 13,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function ActivityInbox() {
  const { theme } = useTheme();
  const {
    filteredNotifications = [],
    unreadCount = 0,
    loading = false,
    refreshing = false,
    activeSection = "all",
    setActiveSection,
    refresh,
    loadMore,
    hasMore = false,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  const list = filteredNotifications ?? [];

  const openNotification = useCallback(
    async (item: AppNotification) => {
      if (item._id && !item.read) {
        await markRead(item._id);
      }

      const data = item.data || {
        screen: item.type,
        postId: item.entityId,
        callId: item.callId,
        authorId: item.actor?.userId || item.authorId,
        entityId: item.entityId,
        url: item.data?.url,
      };

      handleNotificationDataRedirect(router, data);
    },
    [markRead],
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="notifications-off-outline" size={48} color={theme.subtext} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
      <Text style={[styles.emptyBody, { color: theme.subtext }]}>
        Likes, follows, messages, and live updates will show up here.
      </Text>
    </View>
  );

  return (
    <>
      <DrawerMenuButton />

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.fixedTop}>
          <View style={styles.headerRow}>
            <View style={styles.headerSide} />
            <View style={styles.headerCenter}>
              <Text style={[styles.header, { color: theme.text }]}>Activity</Text>
              {unreadCount > 0 ? (
                <Text style={[styles.subtitle, { color: theme.subtext }]}>
                  {unreadCount} unread
                </Text>
              ) : null}
            </View>
            <View style={[styles.headerSide, styles.headerSideRight]}>
              {unreadCount > 0 ? (
                <Pressable onPress={() => markAllRead(activeSection)}>
                  <Text style={[styles.markAll, { color: theme.primary }]}>
                    Mark all read
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <SectionTabs active={activeSection} onChange={setActiveSection} />
        </View>

        <FlatList
          style={styles.list}
          data={list}
          keyExtractor={(item, index) => item._id || `${item.type}-${index}`}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={openNotification}
              onMarkRead={markRead}
              onDelete={removeNotification}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />
          }
          onEndReached={() => {
            if (hasMore) void loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={loading ? null : renderEmpty}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={theme.primary} />
            ) : null
          }
          contentContainerStyle={
            list.length === 0 ? styles.emptyList : undefined
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedTop: {
    flexGrow: 0,
    flexShrink: 0,
  },
  list: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    flex: 1,
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
  },
  header: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 13, marginTop: 2, textAlign: "center" },
  markAll: { fontSize: 14, fontWeight: "700" },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: "center",
    gap: 8,
  },
  tab: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
