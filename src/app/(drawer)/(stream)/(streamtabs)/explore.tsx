import ExploreUserCard from "@/components/ExploreUserCard";
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
        showDivider
      />
    ),
    [creating, handleStartChat],
  );

  const ListHeader = (
    <>
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: civic.chipBg,
              borderColor: civic.cardBorder,
            },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>
            {followerUsers.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>
            Followers
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: civic.chipBg,
              borderColor: civic.cardBorder,
            },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>
            {followingUsers.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>
            Following
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: isDark ? "#262626" : "#EFEFEF" },
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

      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {(
          [
            { key: "followers" as const, label: "Followers" },
            { key: "following" as const, label: "Following" },
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

      <Text style={[styles.resultHint, { color: theme.subtext }]}>
        {filteredUsers.length}{" "}
        {filteredUsers.length === 1 ? "person" : "people"}
        {activeTab === "followers" ? " follow you" : " you follow"}
      </Text>
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
            paddingTop: insets.top + 6,
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
    paddingBottom: 16,
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnPlaceholder: { width: 40 },
  heroTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  list: { paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: "row",
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: { fontSize: 13 },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "22%",
    right: "22%",
    height: 2,
    borderRadius: 1,
  },
  resultHint: {
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
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
