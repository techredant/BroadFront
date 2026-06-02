import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { BroadCastChannelPreview } from "@/components/ChatChannelPreview";
import { useFollowContext } from "@/context/FollowContext";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import { useChatMemberProfiles } from "@/context/ChatMemberProfilesContext";
import { getGreetingForHour } from "@/lib/utils";
import { resolveChatDisplayName } from "@/utils/streamUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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
  const { followerUsers, followingUsers } = useFollowContext();
  const { ensureProfiles, getProfile } = useChatMemberProfiles();
  const [search, setSearch] = useState("");
  const { theme } = useTheme();

  const membersCount = useMemo(() => {
    const ids = new Set<string>();
    followerUsers.forEach((u) => ids.add(u.clerkId));
    followingUsers.forEach((u) => ids.add(u.clerkId));
    return ids.size;
  }, [followerUsers, followingUsers]);

  const myId = userDetails?.clerkId;
  const filters = useMemo(
    () => ({ members: { $in: [myId ?? ""] }, type: "messaging" }),
    [myId],
  );
  const options = useMemo(() => ({ state: true, watch: true }), []);
  const sort = useMemo(
    () => ({ pinned_at: -1 as const, last_message_at: -1 as const }),
    [],
  );
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
      <View className="px-5 pt-1 pb-0">
        <Text className="text-[13px] text-foreground-muted text-center">
          {getGreetingForHour()}, {firstName}
        </Text>
      </View>


      <View
        className="flex-row items-center mx-5 mb-1.5 mt-1.5 px-3 rounded-xl gap-2"
        style={{
          backgroundColor: theme.card,
          height: 36,
        }}
      >
        <Ionicons name="search" size={16} color={theme.subtext} />
        <TextInput
          className="flex-1 text-[13px] text-foreground py-0"
          placeholder="Search members..."
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View className="flex-row items-center justify-between px-5 mb-1 mt-0.5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="chatbubbles" size={15} color={theme.text} />
          <Text
            className="text-[13px] font-semibold"
            style={{ color: theme.primary }}
          >
            Chats
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(drawer)/(stream)/create-group")}
          className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5"
          style={{
            backgroundColor: theme.card,
          }}
        >
          <Ionicons name="people" size={14} color={theme.primary} />
          <Text
            className="text-[13px] font-medium"
            style={{ color: theme.primary }}
          >
            Group
          </Text>
        </Pressable>
      </View>

      {myId ? (
        <ChannelList
          filters={filters}
          options={options}
          sort={sort}
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
      ) : null}
    </SafeAreaView>
  );
};

export default ChatsScreen;
