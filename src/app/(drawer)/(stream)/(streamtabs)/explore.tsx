
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import ExploreUserCard from "@/app/components/ExploreUserCard";
import ListEmptyComponent from "@/app/components/ListEmptyComponent";
import { useFollowContext } from "@/context/FollowContext";
import { useAppContext } from "@/contexts/AppProvider";
import useStartChat from "@/hooks/useStartChat";
import useStreamUsers from "@/hooks/useStreamUsers";
import { COLORS } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";


const ExploreScreen = () => {
  const { setChannel } = useAppContext();
  const { user } = useUser();
  const { client } = useChatContext();
  const userId = user?.id ?? "";

  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    "followers",
  );
  const {
    handleFollow,
    following,
    followersCount,
    followingCount,
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
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    const nick = (u.nickName ?? "").toLowerCase();

    return name.includes(q) || nick.includes(q);
  });

  const renderUserItem = ({ item }: any) => (
    <ExploreUserCard
      item={item}
      creating={creating}
      onStartChat={handleStartChat}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <DrawerMenuButton />

      {/* HEADER */}
      <View className="px-5 pt-3 pb-1">
        <Text className="text-[28px] font-bold text-center text-foreground">
          Connections
        </Text>
        <Text className="text-sm text-center text-foreground-muted mt-1">
          Followers & Following
        </Text>
      </View>

      {/* 🔥 TAB BUTTONS */}
      <View className="flex-row mx-5 mt-4 bg-surface rounded-[14px] border border-border overflow-hidden">
        <Pressable
          onPress={() => setActiveTab("followers")}
          className={`flex-1 py-3 items-center ${
            activeTab === "followers" ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === "followers" ? "text-white" : "text-foreground"
            }`}
          >
            Followers
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("following")}
          className={`flex-1 py-3 items-center ${
            activeTab === "following" ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === "following" ? "text-white" : "text-foreground"
            }`}
          >
            Following
          </Text>
        </Pressable>
      </View>

      {/* SEARCH */}
      <View className="flex-row items-center bg-surface mx-5 my-4 px-3.5 rounded-[14px] gap-2.5 border border-border">
        <Ionicons name="search" size={18} color={COLORS.textMuted} />

        <TextInput
          className="flex-1 text-[15px] text-foreground"
          placeholder="Search people..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

 
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.clerkId}
          renderItem={renderUserItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search.trim() ? (
              <Text className="text-center mt-10 text-foreground-muted">
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
