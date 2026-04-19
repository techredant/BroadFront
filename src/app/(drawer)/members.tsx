import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoaderKitView } from "react-native-loader-kit";
import { useTheme } from "@/context/ThemeContext";
import { useUserContext } from "@/context/FollowContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";

interface Member {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  nickName: string;
  image: string;
  followers: string[];
  isFollowing?: boolean;
}

const MembersScreen = () => {
  const { theme, isDark } = useTheme();

  // ✅ comes from FollowContext (NOT local state anymore)
  const { members, currentUserId, loading, toggleFollow, loadingUserId } =
    useUserContext();

  // ---------------- RENDER ITEM ----------------
const renderMember = ({ item }: { item: Member }) => {
  const isCurrentUser = item.clerkId === currentUserId;

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.userInfo}>
        <Image
          source={{
            uri: item.image?.trim()
              ? item.image
              : `https://api.dicebear.com/7.x/initials/svg?seed=${item.firstName}`,
          }}
          style={styles.avatar}
        />

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>
            {item.firstName} {item.lastName}
          
          </Text>

          <Text style={[styles.username, { color: theme.subtext }]}>
            {item.nickName || "unknown"}
          </Text>
        </View>
      </View>

      {/* BUTTON LOGIC */}
      {isCurrentUser ? (
        <View style={styles.youChip}>
          <Text style={styles.youText}>You</Text>
        </View>
      ) : loadingUserId === item.clerkId ? (
        <ActivityIndicator size="small" color={theme.text} />
      ) : (
        <TouchableOpacity onPress={() => toggleFollow(item)}>
          <Text
            style={item.isFollowing ? styles.unfollowText : styles.followText}
          >
            {item.isFollowing ? "Unfollow" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

  // ---------------- UI ----------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <DrawerMenuButton />

      <Text style={[styles.title, { color: theme.text }]}>
        Members ({members.length})
      </Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />
    </SafeAreaView>
  );
};

export default MembersScreen;

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
  },

  list: {
    padding: 16,
    paddingBottom: 60,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    elevation: 2,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
  },

  username: {
    fontSize: 14,
    marginTop: 2,
  },

  followText: {
    color: "blue",
    fontWeight: "bold",
  },

  unfollowText: {
    color: "red",
    fontWeight: "bold",
  },

  youChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1DA1F2",
  },

  youText: {
    color: "#1DA1F2",
    fontWeight: "600",
    fontStyle: "italic",
  },
});
