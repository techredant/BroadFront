import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { BroadCastChannelPreview } from "@/app/components/ChatChannelPreview";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import { useChatMemberProfiles } from "@/context/ChatMemberProfilesContext";
import { getGreetingForHour } from "@/lib/utils";
import { resolveChatDisplayName } from "@/utils/streamUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Channel } from "stream-chat";
import { ChannelList } from "stream-chat-expo";

function collectOtherMemberIds(channel: Channel, myId?: string) {
  return Object.values(channel.state.members)
    .map((m) => m.user_id || m.user?.id)
    .filter((id): id is string => !!id && id !== myId && id !== "ai-assistant");
}

const ChatsScreen = () => {
  const router = useRouter();
  const { setChannel } = useAppContext();
  const { userDetails } = useLevel();
  const { ensureProfiles, getProfile } = useChatMemberProfiles();
  const [search, setSearch] = useState("");
  const { theme } = useTheme();

  const myId = userDetails?.clerkId;
  const filters = { members: { $in: [myId!] }, type: "messaging" };
  const firstName = userDetails?.firstName || "there";

  const syncProfilesFromChannels = useCallback(
    (channels: Channel[]) => {
      const ids = channels.flatMap((ch) => collectOtherMemberIds(ch, myId));
      if (ids.length) void ensureProfiles(ids);
    },
    [ensureProfiles, myId],
  );

  const channelRenderFilterFn = useCallback(
    (channels: Channel[]) => {
      syncProfilesFromChannels(channels);

      if (!search.trim()) return channels;

      const q = search.toLowerCase();

      return channels.filter((channel) => {
        const otherMembers = Object.values(channel.state.members).filter(
          (m) => m.user?.id !== myId,
        );

        return otherMembers.some((m) => {
          const id = m.user?.id || "";
          const profile = getProfile(id);
          const name = resolveChatDisplayName(
            id,
            m.user?.name,
            profile,
          ).toLowerCase();
          return name.includes(q) || id.toLowerCase().includes(q);
        });
      });
    },
    [search, myId, getProfile, syncProfilesFromChannels],
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <DrawerMenuButton />
      <View className="px-5 pt-3 pb-2">
        <Text className="text-sm text-foreground-muted mb-0.5 text-center mt-2">
          {getGreetingForHour()}, {firstName}
        </Text>
      </View>

      <View
        className="flex-row items-center  mx-5 mb-3 px-3.5 mt-2 rounded-[14px] gap-2.5 border "
        style={{ backgroundColor: theme.background, borderColor: theme.border }}
      >
        <Ionicons name="search" size={18} color={theme.text} />
        <TextInput
          className="flex-1 text-[14px] text-foreground"
          placeholder="Search members..."
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View className="flex-row items-center px-5 my-1.5 gap-2">
        <Ionicons name="chatbubbles" size={16} color={theme.text} />
        <Text
          className="text-[14px] font-semibold"
          style={{ color: theme.primary }}
        >
          Your Chats
        </Text>
      </View>

      <ChannelList
        filters={filters}
        options={{ state: true, watch: true }}
        sort={{ last_updated: -1 }}
        Preview={BroadCastChannelPreview}
        channelRenderFilterFn={channelRenderFilterFn}
        onSelect={(channel) => {
          setChannel(channel);
          router.push(`/channel/${channel.id}`);
        }}
        additionalFlatListProps={{
          contentContainerStyle: {
            flexGrow: 1,
            backgroundColor: theme.background,
          },
          style: {
            backgroundColor: theme.background,
          },
        }}
      />
    </SafeAreaView>
  );
};

export default ChatsScreen;
