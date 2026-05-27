import React, { useCallback, useEffect } from "react";
import type { Channel } from "stream-chat";
import {
  Avatar,
  ChannelPreviewMessenger,
  ChannelPreviewTitle,
  useChatContext,
  type ChannelPreviewMessengerProps,
  type ChannelPreviewTitleProps,
  type ChannelAvatarProps,
} from "stream-chat-expo";
import { useChatMemberProfiles } from "@/context/ChatMemberProfilesContext";
import {
  getRemoteChatMember,
  displayNameFromChatUser,
} from "@/utils/callDisplayName";
import { resolveChatDisplayName } from "@/utils/streamUser";
import {
  getGroupChannelImage,
  getGroupChannelName,
  isGroupChannel,
} from "@/utils/groupChat";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

function memberIdsFromChannel(channel: Channel, myId?: string) {
  return Object.values(channel.state.members)
    .map((m) => m.user_id || m.user?.id)
    .filter((id): id is string => !!id && id !== myId);
}

function BroadCastPreviewTitle({
  channel,
  displayName: _ignored,
}: ChannelPreviewTitleProps) {
  const { client } = useChatContext();
  const { getProfile, ensureProfiles } = useChatMemberProfiles();
  const myId = client?.userID;

  if (isGroupChannel(channel, myId)) {
    return (
      <ChannelPreviewTitle
        channel={channel}
        displayName={getGroupChannelName(channel)}
      />
    );
  }

  const remote = getRemoteChatMember(channel, myId ?? "");
  const remoteId = remote?.user_id || remote?.user?.id;
  const profile = getProfile(remoteId);
  const name = resolveChatDisplayName(
    remoteId,
    remote?.user?.name || displayNameFromChatUser(remote?.user),
    profile,
  );

  useEffect(() => {
    const ids = memberIdsFromChannel(channel, myId);
    if (ids.length) void ensureProfiles(ids);
  }, [channel.cid, myId, ensureProfiles]);

  return <ChannelPreviewTitle channel={channel} displayName={name} />;
}

function BroadCastPreviewAvatar({ channel }: ChannelAvatarProps) {
  const { client, ImageComponent } = useChatContext();
  const { getProfile, ensureProfiles } = useChatMemberProfiles();
  const myId = client?.userID;

  if (isGroupChannel(channel, myId)) {
    const name = getGroupChannelName(channel);
    const image = getGroupChannelImage(channel);
    return (
      <Avatar
        image={image}
        ImageComponent={ImageComponent}
        name={name}
        size={48}
      />
    );
  }

  const remote = getRemoteChatMember(channel, myId ?? "");
  const remoteId = remote?.user_id || remote?.user?.id;
  const profile = getProfile(remoteId);
  const name = resolveChatDisplayName(
    remoteId,
    remote?.user?.name || displayNameFromChatUser(remote?.user),
    profile,
  );

  useEffect(() => {
    const ids = memberIdsFromChannel(channel, myId);
    if (ids.length) void ensureProfiles(ids);
  }, [channel.cid, myId, ensureProfiles]);

  const image = profile?.image || remote?.user?.image;

  if (image) {
    return (
      <PresenceAvatar userId={remoteId} size={48} imageUri={image} />
    );
  }

  return (
    <PresenceAvatar userId={remoteId} size={48}>
      <Avatar
        image={image}
        ImageComponent={ImageComponent}
        name={name}
        size={48}
      />
    </PresenceAvatar>
  );
}

export function BroadCastChannelPreview(props: ChannelPreviewMessengerProps) {
  const { channel } = props;
  const { client } = useChatContext();
  const { theme } = useTheme();
  const membership = channel.state.membership as
    | { pinned?: boolean; pinned_at?: string }
    | undefined;
  const isPinned = Boolean(
    membership?.pinned || membership?.pinned_at,
  );
  const isMuted = channel.muteStatus?.().muted ?? false;

  const togglePin = useCallback(() => {
    const opts = client.userID ? { user_id: client.userID } : undefined;
    void (isPinned ? channel.unpin(opts) : channel.pin(opts));
  }, [channel, client.userID, isPinned]);

  const toggleMute = useCallback(() => {
    const opts = client.userID ? { user_id: client.userID } : undefined;
    void (isMuted ? channel.unmute(opts) : channel.mute(opts));
  }, [channel, client.userID, isMuted]);

  const deleteChat = useCallback(() => {
    void channel.hide(null, true);
  }, [channel]);

  return (
    <View className="flex-row items-center">
      <View className="flex-1">
        <ChannelPreviewMessenger
          {...props}
          PreviewTitle={BroadCastPreviewTitle}
          PreviewAvatar={BroadCastPreviewAvatar}
        />
      </View>
      {isPinned ? (
        <Ionicons
          name="pin"
          size={15}
          color={theme.primary}
          style={{ marginRight: 2 }}
        />
      ) : null}
   <Menu>
  <MenuTrigger>
    <View
      accessibilityLabel="Chat options"
      accessibilityRole="button"
      className="mr-1 h-11 w-11 items-center justify-center rounded-full"
    >
      <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
    </View>
  </MenuTrigger>

  <MenuOptions
    customStyles={{
      optionsContainer: {
        backgroundColor: theme.card,
        borderRadius: 16,
        paddingVertical: 8,
        width: 190,

        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      },
    }}
  >
    {/* PIN */}
    <MenuOption onSelect={togglePin}>
      <View className="flex-row items-center px-4 py-4">
        <Ionicons
          name={isPinned ? "pin-outline" : "pin"}
          size={18}
          color={theme.text}
        />
        <Text
          className="ml-3 text-[14px] font-bold"
          style={{ color: theme.text }}
        >
          {isPinned ? "Unpin chat" : "Pin chat"}
        </Text>
      </View>
    </MenuOption>

    {/* MUTE */}
    <MenuOption onSelect={toggleMute}>
      <View className="flex-row items-center px-4 py-4">
        <Ionicons
          name={isMuted ? "notifications-outline" : "notifications-off"}
          size={18}
          color={theme.text}
        />
        <Text
          className="ml-3 text-[14px] font-bold"
          style={{ color: theme.text }}
        >
          {isMuted ? "Unmute chat" : "Mute chat"}
        </Text>
      </View>
    </MenuOption>

    {/* DELETE */}
    <MenuOption onSelect={deleteChat}>
      <View className="flex-row items-center px-4 py-4">
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
        <Text className="ml-3 text-[14px] font-bold text-red-500">
          Delete chat
        </Text>
      </View>
    </MenuOption>
  </MenuOptions>
</Menu>
    </View>
  );
}
