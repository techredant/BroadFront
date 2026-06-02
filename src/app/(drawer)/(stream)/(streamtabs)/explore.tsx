import ExploreUserCard, { EXPLORE_ROW_GAP } from "@/components/ExploreUserCard";
import { useFollowContext } from "@/context/FollowContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import useStartChat from "@/hooks/useStartChat";
import {
  PoliticalPalette,
  getPoliticalColors,
} from "@/constants/politicalTheme";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useChatContext } from "stream-chat-expo";

type TabKey = "followers" | "following";

const ExploreScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setChannel } = useAppContext();
  const { user } = useUser();
  const { client } = useChatContext();
  const userId = user?.id ?? "";
  const { theme, isDark } = useTheme();
  const civic = getPoliticalColors(isDark);

  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("followers");

  const { followerUsers, followingUsers } = useFollowContext();

  const { handleStartChat } = useStartChat({
    client,
    userId,
    setChannel,
    setCreating,
  });

  const baseData =
    activeTab === "followers" ? followerUsers : followingUsers;

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return baseData;

    const q = search.toLowerCase();
    return baseData.filter((u) => {
      const name =
        `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.companyName ?? ""}`.toLowerCase();
      const nick = (u.nickName ?? "").toLowerCase();
      return name.includes(q) || nick.includes(q);
    });
  }, [baseData, search]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return "No connections match your search";
    return activeTab === "followers"
      ? "No followers yet"
      : "You're not following anyone yet";
  }, [search, activeTab]);

  const emptyBody = useMemo(() => {
    if (search.trim()) return "Try a different name or handle.";
    return activeTab === "followers"
      ? "When people follow you, they'll show up here so you can message them."
      : "Find people in Community and follow them to start a conversation.";
  }, [search, activeTab]);

  const renderUserItem = useCallback(
    ({ item }: { item: (typeof baseData)[0] }) => (
      <ExploreUserCard
        item={item}
        creating={creating}
        onStartChat={handleStartChat}
      />
    ),
    [creating, handleStartChat],
  );

  const renderItemSeparator = useCallback(
    () => <View style={styles.listSeparator} />,
    [],
  );

  const ListHeader = (
    <>
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: theme.card },
        ]}
      >
        <Ionicons name="search" size={16} color={theme.subtext} />
        <TextInput
          placeholder="Search by name or handle"
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.subtext} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(
          [
            {
              key: "followers" as const,
              label: `Followers (${followerUsers.length})`,
            },
            {
              key: "following" as const,
              label: `Following (${followingUsers.length})`,
            },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? theme.text : theme.subtext,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
              {active ? (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: PoliticalPalette.navy },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.resultRow}>
        <Text style={[styles.resultHint, { color: theme.subtext }]}>
          {filteredUsers.length}{" "}
          {filteredUsers.length === 1 ? "person" : "people"}
          {activeTab === "followers" ? " follow you" : " you follow"}
        </Text>
        <View style={styles.chatHint}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={12}
            color={theme.primary}
          />
          <Text style={[styles.chatHintText, { color: theme.primary }]}>
            Tap to chat
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + 4,
            backgroundColor: isDark
              ? PoliticalPalette.navyDark
              : PoliticalPalette.navy,
          },
        ]}
      >
        <View style={styles.goldBar} />

        <View style={styles.heroRow}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuBtn}
            hitSlop={8}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>

          <Text style={styles.heroTitle}>Connections</Text>

          <View style={styles.menuBtnPlaceholder} />
        </View>

        <Text style={styles.heroSubtitle}>
          Message people who follow you or who you follow
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.clerkId}
        renderItem={renderUserItem}
        ItemSeparatorComponent={renderItemSeparator}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.list,
          filteredUsers.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[styles.emptyIcon, { backgroundColor: civic.chipBg }]}
            >
              <Ionicons
                name={
                  search.trim()
                    ? "search-outline"
                    : activeTab === "followers"
                      ? "person-add-outline"
                      : "people-outline"
                }
                size={32}
                color={PoliticalPalette.gold}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {emptyMessage}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.subtext }]}>
              {emptyBody}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  goldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PoliticalPalette.gold,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnPlaceholder: { width: 36 },
  heroTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 15,
    paddingHorizontal: 12,
  },
  list: { paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  listSeparator: {
    height: EXPLORE_ROW_GAP,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: "row",
    marginTop: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  tabLabel: { fontSize: 12 },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "22%",
    right: "22%",
    height: 2,
    borderRadius: 1,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 8,
  },
  resultHint: {
    flex: 1,
    fontSize: 10,
  },
  chatHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chatHintText: {
    fontSize: 10,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 48,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
