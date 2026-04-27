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
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";
import { useFollowContext } from "@/context/FollowContext";
import { useUser } from "@clerk/clerk-expo";

const MembersScreen = () => {
  const { theme, isDark } = useTheme();
  const { members, handleFollow, following } = useFollowContext();
  const { user } = useUser();

  /** RENDER ITEM */
  const renderMember = ({ item }: any) => {
    const isCurrentUser = item.clerkId === user?.id;

    const isFollowing = following.includes(item.clerkId);

    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: item?.image,
            }}
            style={styles.avatar}
          />

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]}>
              {item?.firstName} {item?.lastName}
            </Text>

            <Text style={[styles.username, { color: theme.subtext }]}>
              {item?.nickName || "unknown"}
            </Text>
          </View>
        </View>

        {/* BUTTON */}
        {isCurrentUser ? (
          <View style={styles.youChip}>
            <Text style={styles.youText}>You</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleFollow(item.clerkId)}>
            <Text style={isFollowing ? styles.unfollowText : styles.followText}>
              {isFollowing ? "Unfollow" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /** LOADING */
  // if (loading) {
  //   return (
  //     <View style={styles.loader}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  /** UI */
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

/** STYLES */
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
