import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DrawerActions } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { useFollowContext } from "@/context/FollowContext";
import { useUser } from "@clerk/clerk-expo";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { formatNickHandle } from "@/utils/nickName";
import {
  PoliticalPalette,
  getPoliticalColors,
} from "@/constants/politicalTheme";

type FilterKey = "all" | "following" | "notFollowing";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "notFollowing", label: "Discover" },
];

const IG_BLUE = "#0095F6";

function memberAvatarUri(item: {
  image?: string;
  firstName?: string;
  companyName?: string;
}) {
  if (item?.image) return item.image;
  const name = item.firstName || item.companyName || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1B3A6B&color=fff`;
}

const MembersScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const civic = getPoliticalColors(isDark);

  const {
    members,
    handleFollow,
    following,
    followingCount,
    refreshMembers,
    loading,
  } = useFollowContext();
  const { user } = useUser();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMembers?.();
    }, [refreshMembers]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMembers?.();
    setRefreshing(false);
  }, [refreshMembers]);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    if (filter === "following") {
      filtered = members.filter((m) => following.includes(m.clerkId));
    }

    if (filter === "notFollowing") {
      filtered = members.filter(
        (m) => !following.includes(m.clerkId) && m.clerkId !== user?.id,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          `${m.firstName || ""} ${m.lastName || ""}`
            .toLowerCase()
            .includes(q) ||
          m.companyName?.toLowerCase().includes(q) ||
          m.nickName?.toLowerCase().includes(q),
      );
    }

    return [...filtered].sort((a, b) => {
      if (a.clerkId === user?.id) return -1;
      if (b.clerkId === user?.id) return 1;
      return 0;
    });
  }, [members, following, search, filter, user?.id]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return "No members match your search";
    if (filter === "following") return "You're not following anyone yet";
    if (filter === "notFollowing") return "You're connected with everyone here";
    return "No members in your community yet";
  }, [search, filter]);

  const renderMember = useCallback(
    ({ item }: { item: (typeof members)[0] }) => {
      const isCurrentUser = item.clerkId === user?.id;
      const isFollowingUser = following.includes(item.clerkId);
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
            <Image
              source={{ uri: memberAvatarUri(item) }}
              style={styles.avatar}
              cachePolicy="memory-disk"
              contentFit="cover"
            />

            <View style={styles.rowText}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <VerifiedBadge
                  isVerified={(item as { isVerified?: boolean }).isVerified}
                  size={14}
                />
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
              <Text style={[styles.youText, { color: theme.subtext }]}>
                You
              </Text>
            </View>
          ) : isFollowingUser ? (
            <Pressable
              style={[
                styles.followingBtn,
                {
                  backgroundColor: isDark ? "#262626" : "#EFEFEF",
                  borderColor: isDark ? "#363636" : "#DBDBDB",
                },
              ]}
              onPress={() => handleFollow(item.clerkId)}
            >
              <Text style={[styles.followingBtnText, { color: theme.text }]}>
                Following
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.followBtn}
              onPress={() => handleFollow(item.clerkId)}
            >
              <Text style={styles.followBtnText}>Follow</Text>
            </Pressable>
          )}
        </View>
      );
    },
    [following, handleFollow, isDark, theme, user?.id],
  );

  const ListHeader = (
    <>
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: isDark ? "#262626" : "#EFEFEF",
          },
        ]}
      >
        <Ionicons name="search" size={16} color={theme.subtext} />
        <TextInput
          placeholder="Search"
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.subtext} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {TABS.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => setFilter(tab.key)}
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
                  style={[styles.tabIndicator, { backgroundColor: theme.text }]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.resultHint, { color: theme.subtext }]}>
        {filteredMembers.length}{" "}
        {filteredMembers.length === 1 ? "person" : "people"}
        {filter === "all" && followingCount > 0
          ? ` · ${followingCount} following`
          : ""}
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

          <Text style={styles.heroTitle}>Community</Text>

          <View style={styles.menuBtnPlaceholder} />
        </View>

        <Text style={styles.heroSubtitle}>
          Discover and connect with people in your network
        </Text>
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.clerkId}
        renderItem={renderMember}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.list,
          filteredMembers.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={IG_BLUE}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading && members.length === 0 ? (
            <ActivityIndicator
              style={{ marginTop: 48 }}
              color={PoliticalPalette.gold}
            />
          ) : (
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: civic.chipBg },
                ]}
              >
                <Ionicons
                  name={
                    filter === "notFollowing"
                      ? "people-outline"
                      : "search-outline"
                  }
                  size={32}
                  color={PoliticalPalette.gold}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {emptyMessage}
              </Text>
              {filter === "notFollowing" && !search.trim() ? (
                <Text style={[styles.emptyBody, { color: theme.subtext }]}>
                  Check the Following tab to see who you already connect with.
                </Text>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
};

export default MembersScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  menuBtnPlaceholder: {
    width: 40,
  },
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
  },
  list: {
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 36,
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
  tabLabel: {
    fontSize: 13,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    borderRadius: 1,
  },
  resultHint: {
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
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
  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 56,
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
