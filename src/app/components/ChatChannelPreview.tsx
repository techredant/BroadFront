import React, { useEffect } from "react";
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

  return (
    <Avatar
      image={image}
      ImageComponent={ImageComponent}
      name={name}
      size={48}
    />
  );
}

export function BroadCastChannelPreview(props: ChannelPreviewMessengerProps) {
  return (
    <ChannelPreviewMessenger
      {...props}
      PreviewTitle={BroadCastPreviewTitle}
      PreviewAvatar={BroadCastPreviewAvatar}
    />
  );
}
