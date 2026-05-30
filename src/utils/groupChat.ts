import type { Channel, ChannelMemberResponse } from "stream-chat";

export type GroupChannelData = {
  name?: string;
  is_group?: boolean;
  created_by_id?: string;
  image?: string;
};

export type GroupMemberRole = "admin" | "member";

export type GroupMemberRow = {
  userId: string;
  name: string;
  image?: string;
  role: GroupMemberRole;
  isCreator: boolean;
  isSelf: boolean;
};

const MIN_GROUP_MEMBERS = 3;
const ADMIN_ROLE = "channel_moderator";

export function isGroupChannel(channel: Channel, myId?: string): boolean {
  const data = channel.data as GroupChannelData | undefined;
  if (data?.is_group === true) return true;

  const memberIds = Object.values(channel.state.members)
    .map((m) => m.user_id || m.user?.id)
    .filter((id): id is string => !!id && id !== "ai-assistant");

  if (memberIds.length >= MIN_GROUP_MEMBERS) return true;

  if (channel.id?.startsWith("group_")) return true;

  return false;
}

export function getGroupChannelName(channel: Channel): string {
  const data = channel.data as GroupChannelData | undefined;
  if (data?.name?.trim()) return data.name.trim();

  const count = Object.keys(channel.state.members).length;
  return count > 0 ? `Group (${count})` : "Group chat";
}

export function getGroupChannelImage(channel: Channel): string | undefined {
  const data = channel.data as GroupChannelData | undefined;
  const image = data?.image?.trim();
  return image || undefined;
}

export function memberCountLabel(channel: Channel): string {
  const n = Object.keys(channel.state.members).length;
  return `${n} member${n === 1 ? "" : "s"}`;
}

export function generateGroupChannelId(creatorId: string): string {
  const safe = creatorId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `group_${safe}_${Date.now()}`;
}

export function collectMemberIds(channel: Channel, myId?: string): string[] {
  return Object.values(channel.state.members)
    .map((m) => m.user_id || m.user?.id)
    .filter((id): id is string => !!id && id !== myId && id !== "ai-assistant");
}

export function getGroupCreatorId(channel: Channel): string | undefined {
  const data = channel.data as GroupChannelData | undefined;
  return data?.created_by_id;
}

export function isGroupAdminMember(
  member: ChannelMemberResponse,
  channel: Channel,
): boolean {
  if (member.channel_role === ADMIN_ROLE || member.is_moderator) return true;
  const userId = member.user_id || member.user?.id;
  const creatorId = getGroupCreatorId(channel);
  return !!userId && !!creatorId && userId === creatorId;
}

export function isGroupAdmin(channel: Channel, userId?: string): boolean {
  if (!userId) return false;
  const member = channel.state.members[userId];
  if (!member) return false;
  return isGroupAdminMember(member, channel);
}

export function getGroupAdminIds(channel: Channel): string[] {
  return Object.values(channel.state.members)
    .filter((m) => isGroupAdminMember(m, channel))
    .map((m) => m.user_id || m.user?.id)
    .filter((id): id is string => !!id);
}

export function buildGroupMemberRows(
  channel: Channel,
  myId: string,
  resolveName: (userId: string, streamName?: string) => string,
): GroupMemberRow[] {
  const creatorId = getGroupCreatorId(channel);

  const rows: GroupMemberRow[] = [];

  for (const member of Object.values(channel.state.members)) {
    const userId = member.user_id || member.user?.id;
    if (!userId || userId === "ai-assistant") continue;

    const isAdmin = isGroupAdminMember(member, channel);
    rows.push({
      userId,
      name: userId === myId ? "You" : resolveName(userId, member.user?.name),
      image: member.user?.image,
      role: isAdmin ? "admin" : "member",
      isCreator: userId === creatorId,
      isSelf: userId === myId,
    });
  }

  rows.sort((a, b) => {
    if (a.isSelf) return -1;
    if (b.isSelf) return 1;
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return rows;
}
