
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import ExploreUserCard from "@/app/components/ExploreUserCard";
import ListEmptyComponent from "@/app/components/ListEmptyComponent";
import { useFollowContext } from "@/context/FollowContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import useStartChat from "@/hooks/useStartChat";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";


const ExploreScreen = () => {
  const { setChannel } = useAppContext();
  const { user } = useUser();
  const { client } = useChatContext();
  const userId = user?.id ?? "";
  const { theme } =useTheme()

  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    "followers",
  );
  const {
    followerUsers,
    followingUsers,
  } = useFollowContext();

  const { handleStartChat } = useStartChat({
    client,
    userId,
    setChannel,
    setCreating,
  });

  // ✅ Get correct base data
  const baseData = activeTab === "followers" ? followerUsers : followingUsers;

  // ✅ Apply search on correct dataset
  const filteredUsers = baseData.filter((u) => {
    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const name =
      `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.companyName ?? ""}`.toLowerCase();
    const nick = (u.nickName ?? "").toLowerCase();

    return name.includes(q) || nick.includes(q);
  });
console.log(filteredUsers);
  const renderUserItem = ({ item }: any) => (
    <ExploreUserCard
      item={item}
      creating={creating}
      onStartChat={handleStartChat}
    />
  );

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: theme.background }}
    >
      <DrawerMenuButton />

      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            textAlign: "center",
            color: theme.text,
          }}
        >
          Connections
        </Text>

        <Text
          style={{
            fontSize: 13,
            textAlign: "center",
            marginTop: 4,
            color: theme.subtext,
          }}
        >
          Followers & Following
        </Text>
      </View>

      {/* 🔥 TAB BUTTONS */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 20,
          marginTop: 16,
          borderRadius: 14,
          overflow: "hidden",
          borderColor: theme.border,
          backgroundColor: theme.card,
        }}
      >
        <Pressable
          onPress={() => setActiveTab("followers")}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor:
              activeTab === "followers" ? theme.primary : "transparent",
          }}
        >
          <Text
            style={{
              fontWeight: "600",
              color: activeTab === "followers" ? "#fff" : theme.text,
            }}
          >
            Followers
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("following")}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor:
              activeTab === "following" ? theme.primary : "transparent",
          }}
        >
          <Text
            style={{
              fontWeight: "600",
              color: activeTab === "following" ? "#fff" : theme.text,
            }}
          >
            Following
          </Text>
        </Pressable>
      </View>

      {/* SEARCH */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 20,
          marginVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
        }}
      >
        <Ionicons name="search" size={18} color={theme.subtext} />

        <TextInput
          placeholder="Search people..."
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            marginLeft: 8,
            color: theme.text,
            fontSize: 15,
          }}
        />

        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={theme.subtext} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.clerkId}
        renderItem={renderUserItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        ListEmptyComponent={
          search.trim() ? (
            <Text
              style={{ textAlign: "center", marginTop: 40, color: theme.subtext }}
            >
              No results found
            </Text>
          ) : (
            <ListEmptyComponent />
          )
        }
      />
    </SafeAreaView>
  );
};

export default ExploreScreen;
