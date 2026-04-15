import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { useLevel } from "@/context/LevelContext";
import { useAppContext } from "@/contexts/AppProvider";
import { COLORS } from "@/lib/theme";
import { getGreetingForHour } from "@/lib/utils";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StatusBar, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Channel } from "stream-chat";
import { ChannelList } from "stream-chat-expo";

const ChatsScreen = () => {
  const router = useRouter();
  const { setChannel } = useAppContext();
  const { userDetails } = useLevel();
  const [search, setSearch] = useState("");

  const filters = { members: { $in: [userDetails?.clerkId!] }, type: "messaging" };

  const firstName = userDetails?.firstName || "there";

  const channelRenderFilterFn = (channels: Channel[]) => {
    if (!search.trim()) return channels;

    const q = search.toLowerCase();

    return channels.filter((channel) => {
      const name = (channel.data?.name as string | undefined)?.toLowerCase() ?? "";
      const cid = channel.cid.toLowerCase();
      return name.includes(q) || cid.includes(q);
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
         {/* <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle={"light-content"}
            /> */}
      
      {/* HEADER */}
      <DrawerMenuButton />
      <View className="px-5 pt-3 pb-2">
        <Text className="text-sm text-foreground-muted mb-0.5 text-center mt-2">
          {getGreetingForHour()}, {firstName}
        </Text>
      </View>

      {/* SEARCH BAR */}
      <View className="flex-row items-center bg-surface mx-5 mb-3 px-3.5 mt-2 rounded-[14px] gap-2.5 border border-border">
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          className="flex-1 text-[15px] text-foreground"
          placeholder="Search members..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* SECTION LABEL */}
      <View className="flex-row items-center px-5 my-1.5 gap-2">
        <Ionicons name="chatbubbles" size={16} color={COLORS.primaryLight} />
        <Text className="text-[15px] font-semibold text-primary-light">Your Chats</Text>
      </View>

      {/* CHANNEL LIST */}

      <ChannelList
        filters={filters}
        // state:true will fetch initial full data of the channel and watch:true will keep the channel updated with the latest data
        options={{ state: true, watch: true }}
        sort={{ last_updated: -1 }}
        channelRenderFilterFn={channelRenderFilterFn}
        onSelect={(channel) => {
          setChannel(channel);
          router.push(`/channel/${channel.id}`);
        }}
        additionalFlatListProps={{
          contentContainerStyle: { flexGrow: 1 },
        }}
        // EmptyStateIndicator={() => <Text className="flex-1 text-white">Hey start chatting</Text>}
      />
    </SafeAreaView>
  );
};

export default ChatsScreen;
