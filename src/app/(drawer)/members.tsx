import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";
import { useFollowContext } from "@/context/FollowContext";
import { useUser } from "@clerk/clerk-expo";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const MembersScreen = () => {
  const { theme, isDark } = useTheme();
  const { members, handleFollow, following, refreshMembers } =
    useFollowContext();
  const { user } = useUser();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "following" | "notFollowing">(
    "all",
  );

  /* REFRESH ON FOCUS */
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (refreshMembers) {
          await refreshMembers();
        }
      };

      load();
    }, [refreshMembers]),
  );

  /* FILTERED MEMBERS */
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

    // Put current user first
    return [...filtered].sort((a, b) => {
      if (a.clerkId === user?.id) return -1;
      if (b.clerkId === user?.id) return 1;
      return 0;
    });
  }, [members, following, search, filter, user?.id]);

  /* RENDER MEMBER */
  const renderMember = ({ item }: any) => {
    const isCurrentUser = item.clerkId === user?.id;
    const isFollowing = following.includes(item.clerkId);

    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Pressable
          style={styles.userInfo}
          onPress={() => router.push(`/(profileId)/${item.clerkId}`)}
        >
          <Image source={{ uri: item?.image }} style={styles.avatar} />

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]}>
              {item?.firstName
                ? `${item.firstName} ${item.lastName || ""}`
                : item?.companyName}
            </Text>

            <Text style={[styles.username, { color: theme.subtext }]}>
              {item?.nickName || "unknown"}
            </Text>
          </View>
        </Pressable>

        {isCurrentUser ? (
          <View style={styles.youChip}>
            <Text style={styles.youText}>You</Text>
          </View>
        ) : (
          <>
            {isFollowing ? (
              <TouchableOpacity
                style={styles.unfollowBtn}
                onPress={() => handleFollow(item.clerkId)}
              >
                <Text style={styles.unfollowText}>Following</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.followBtn}
                onPress={() => handleFollow(item.clerkId)}
              >
                <Text style={styles.followText}>Follow</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <DrawerMenuButton />

      <Text style={[styles.title, { color: theme.text }]}>
        Members ({filteredMembers.length})
      </Text>

      {/* SEARCH */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.subtext} />

        <TextInput
          placeholder="Search members..."
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {/* FILTERS */}
      <View style={styles.filterRow}>
        {[
          { key: "all", label: "All" },
          { key: "following", label: "Following" },
          { key: "notFollowing", label: "Discover" },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setFilter(item.key as any)}
            style={[
              styles.filterBtn,
              filter === item.key && styles.activeFilter,
              {
                backgroundColor:
                  filter === item.key ? theme.primary : theme.card,
              },
            ]}
          >
            <Text
              style={{
                color: filter === item.key ? "#fff" : theme.text,
                fontWeight: "600",
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.clerkId}
        renderItem={renderMember}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default MembersScreen;

/* STYLES */
const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 14,
    letterSpacing: 0.3,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,

    // 🔥 modern shadow (iOS + Android)
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
  },

  username: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },

  /* 🔥 FOLLOW BUTTON (PRIMARY) */
  followBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1DA1F2",
  },

  followText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },

  /* 🔥 UNFOLLOW BUTTON (OUTLINE) */
  unfollowBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E53935",
  },

  unfollowText: {
    color: "#E53935",
    fontWeight: "600",
    fontSize: 13,
  },

  /* YOU CHIP */
  youChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#1DA1F215",
  },

  youText: {
    color: "#1DA1F2",
    fontWeight: "600",
    fontSize: 12,
  },

  /* SEARCH */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },

  /* FILTER PILLS */
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },

  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
  },

  activeFilter: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
});
