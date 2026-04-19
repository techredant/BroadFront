import { EmptyState } from "@/app/components/EmptyState";
import { useAppContext } from "@/contexts/AppProvider";
import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Channel,
  MessageInput,
  MessageList,
  useChatContext,
} from "stream-chat-expo";

const ChannelScreen = () => {
  const { channel, setThread } = useAppContext();
  const { client } = useChatContext();

  const router = useRouter();
  const navigation = useNavigation();

  const headerHeight = useHeaderHeight();

  let displayName = "";
  let avatarUrl = "";

  if (channel) {
    const members = Object.values(channel.state.members);
    const otherMember = members.find(
      (member) => member.user_id !== client.userID,
    );
    displayName = otherMember?.user?.name!;
    avatarUrl = otherMember?.user?.image || "";
  }

  // ? useLayoutEffect vs useEffect
  // - useLayoutEffect runs before the screen has been painted (sync)
  // - useEffect runs after the screen has been painted (async)
  // so here if you use a useEffect, there will be a flicker effect when the screen is mounted

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.surface,
      },
      headerTintColor: COLORS.text,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          className="ml-2 flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <View className="flex-row items-center">
          {avatarUrl ? (
            <Image
              source={avatarUrl}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                marginRight: 10,
              }}
            />
          ) : (
            <View
              className="mr-2.5 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Text className="text-base font-semibold text-foreground">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="font-semibold text-foreground">{displayName}</Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "/(drawer)/(stream)/call/[callId]",
              params: { callId: channel?.id! },
            });
          }}
        >
          <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, displayName, avatarUrl, channel?.cid, channel?.id, router]);

  if (!channel)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );

  return (
    <SafeAreaView className=" bg-border" edges={["bottom"]}>
      <Channel
        channel={channel}
        keyboardVerticalOffset={headerHeight}
        // thread={thread}
        // threadList
        EmptyStateIndicator={() => (
          <EmptyState
            icon="book-outline"
            title="No messages yet"
            subtitle="Start a conversation!"
          />
        )}
      >
        <MessageList
          onThreadSelect={(thread) => {
            setThread(thread);
            router.push(`/channel/${channel.cid}/thread/${thread?.cid}`);
          }}
        />

        <View className="pb-5 bg-surface">
          <MessageInput audioRecordingEnabled />
        </View>
      </Channel>
    </SafeAreaView>
  );
};

export default ChannelScreen;
