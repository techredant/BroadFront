import { CallMissedMessage } from "@/app/components/CallMissedMessage";
import { ChatMessageText } from "@/app/components/ChatMessageText";
import { EmptyState } from "@/app/components/EmptyState";
import { ChatGallery } from "@/app/components/ChatGallery";
import { ChatMessageInput } from "@/app/components/ChatMessageInput";
import { ChatVideoThumbnail } from "@/app/components/ChatVideoThumbnail";
import { ChatKeyboardCompatibleView } from "@/app/components/ChatKeyboardCompatibleView";
import { ChatWallpaper } from "@/app/components/ChatWallpaper";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useChatMemberProfiles } from "@/context/ChatMemberProfilesContext";
import { resolveChatDisplayName } from "@/utils/streamUser";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStreamChannelLayout } from "@/utils/chatLayout";
import {
  Card as StreamCard,
  Channel,
  MessageList,
  useChatContext,
  useMessageContext,
  type DeepPartial,
  type Theme as StreamTheme,
} from "stream-chat-expo";

const ChannelScreen = () => {
  const { channel, setThread } = useAppContext();
  const { client } = useChatContext();
  const { theme } = useTheme();
  const { getProfile, ensureProfiles } = useChatMemberProfiles();

  const myMessageTheme = useMemo<DeepPartial<StreamTheme>>(
    () => ({
      messageSimple: {
        content: {
          senderMessageBackgroundColor: theme.card,
          markdown: {
            text: { color: theme.text },
            autolink: { color: theme.primary },
            mentions: { color: theme.primary },
          },
        },
      },
    }),
    [theme.card, theme.text, theme.primary],
  );

  const router = useRouter();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const channelLayout = useStreamChannelLayout(headerHeight);

  let displayName = "";
  let avatarUrl = "";
  let otherUserId = "";

  const isAiChannel = channel?.id?.startsWith("ai-assistant-") ?? false;

  if (channel) {
    if (isAiChannel) {
      displayName = "AI Assistant";
    }

    const members = Object.values(channel.state.members);
    const otherMember = members.find(
      (member) => member.user_id !== client.userID,
    );

    otherUserId = otherMember?.user?.id || otherMember?.user_id || "";
    if (!isAiChannel) {
      const profile = getProfile(otherUserId);
      displayName = resolveChatDisplayName(
        otherUserId,
        otherMember?.user?.name,
        profile,
      );
      avatarUrl = profile?.image || otherMember?.user?.image || "";
    }
  }

  useEffect(() => {
    if (otherUserId) void ensureProfiles([otherUserId]);
  }, [otherUserId, ensureProfiles]);

  const startCall = useCallback(
    (callMode: "video" | "audio") => {
      const callId = channel?.cid?.split(":").pop() ?? channel?.id ?? "";
      if (!callId) return;
      router.push({
        pathname: "/(drawer)/(stream)/call/[callId]",
        params: {
          callId,
          isCaller: "true",
          callMode,
        },
      });
    },
    [channel?.cid, channel?.id, router],
  );

  useLayoutEffect(() => {
   navigation.setOptions({
     headerShown: true,
     headerStyle: {
       backgroundColor: theme.background,
     },

     headerTintColor: theme.text,

     headerTitleContainerStyle: {
       left: 56,
       right: 108,
     },

     headerLeft: () => (
       <TouchableOpacity
         onPress={() => router.back()}
         style={{ paddingHorizontal: 10 }}
       >
         <Ionicons name="arrow-back" size={24} color={theme.text} />
       </TouchableOpacity>
     ),

     headerTitle: () => (
       <Pressable
         onPress={() => {
           if (otherUserId) {
             router.push(`/(profileId)/${otherUserId}`);
           }
         }}
         style={{
           flexDirection: "row",
           alignItems: "center",
           flex: 1,
         }}
       >
         {avatarUrl ? (
           <Image
             source={{ uri: avatarUrl }}
             contentFit="cover"
             style={{
               width: 36,
               height: 36,
               borderRadius: 18,
               marginRight: 10,
             }}
           />
         ) : (
           <View
             style={{
               width: 36,
               height: 36,
               borderRadius: 18,
               marginRight: 10,
               justifyContent: "center",
               alignItems: "center",
               backgroundColor: theme.card,
             }}
           >
             <Text style={{ color: theme.text }}>
               {displayName.charAt(0).toUpperCase()}
             </Text>
           </View>
         )}

         <Text
           numberOfLines={1}
           style={{
             color: theme.text,
             fontWeight: "600",
             fontSize: 15,
           }}
         >
           {displayName}
         </Text>
       </Pressable>
     ),
     headerRight: isAiChannel
       ? undefined
       : () => (
           <View style={headerStyles.callActions}>
             <Pressable
               onPress={() => startCall("video")}
               style={({ pressed }) => [
                 headerStyles.callBtn,
                 { opacity: pressed ? 0.55 : 1 },
               ]}
               hitSlop={6}
               accessibilityLabel="Video call"
             >
               <Ionicons
                 name="videocam"
                 size={22}
                 color={theme.text}
               />
             </Pressable>
             <View
               style={[
                 headerStyles.callDivider,
                 { backgroundColor: theme.border },
               ]}
             />
             <Pressable
               onPress={() => startCall("audio")}
               style={({ pressed }) => [
                 headerStyles.callBtn,
                 { opacity: pressed ? 0.55 : 1 },
               ]}
               hitSlop={6}
               accessibilityLabel="Voice call"
             >
               <Ionicons name="call" size={20} 
               color={theme.text} />
             </Pressable>
           </View>
         ),
   });
 }, [
   navigation,
   displayName,
   avatarUrl,
   channel?.cid,
   channel?.id,
   router,
   startCall,
   isAiChannel,
   theme.background,
   theme.text,
   theme.card,
   theme.border,
   otherUserId,
 ]);


  if (!channel) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

function CallMissedCard() {
  const { message } = useMessageContext();
  if (!message) return null;
  return <CallMissedMessage message={message} />;
}

  return (
    <View style={{ flex: 1 }}>
      <ChatWallpaper />
      <Channel
        channel={channel}
        {...channelLayout}
        KeyboardCompatibleView={ChatKeyboardCompatibleView}
        myMessageTheme={myMessageTheme}
        Gallery={ChatGallery}
        VideoThumbnail={ChatVideoThumbnail}
        MessageText={ChatMessageText}
        Card={(props) => {
          if (props.type === "call_missed") {
            return <CallMissedCard />;
          }
          return <StreamCard {...props} />;
        }}
        EmptyStateIndicator={() => (
          <EmptyState
            icon="chatbubble-outline"
            title="No messages yet"
            subtitle="Start the conversation"
          />
        )}
      >
        {/* 🔥 CUSTOM MESSAGE RENDER */}
        <MessageList
          additionalFlatListProps={{
            style: { backgroundColor: "transparent" },
            contentContainerStyle: { backgroundColor: "transparent" },
          }}
          onThreadSelect={(thread) => {
            setThread(thread);
            router.push(`/channel/${channel.cid}/thread/${thread.cid}`);
          }}
        />

        <ChatMessageInput audioRecordingEnabled />
      </Channel>
    </View>
  );
};

export default ChannelScreen;

const headerStyles = StyleSheet.create({
  callActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
    paddingHorizontal: 10,
  },
  callBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  callDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    marginHorizontal: 10,
  },
});