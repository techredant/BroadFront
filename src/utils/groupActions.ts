import type { Channel } from "stream-chat";
import { uploadProfileImage } from "@/utils/mediaUpload";
import {
  getGroupAdminIds,
  getGroupCreatorId,
  isGroupAdmin,
  type GroupMemberRow,
} from "@/utils/groupChat";

function systemMessage(text: string) {
  return { text, type: "system" as const };
}

export async function promoteGroupAdmin(
  channel: Channel,
  targetId: string,
  targetName: string,
  actorName: string,
) {
  await channel.addModerators(
    [targetId],
    systemMessage(`${actorName} made ${targetName} a group admin`),
  );
}

export async function demoteGroupAdmin(
  channel: Channel,
  targetId: string,
  targetName: string,
  actorName: string,
) {
  await channel.demoteModerators(
    [targetId],
    systemMessage(`${actorName} removed ${targetName} as admin`),
  );
}

export async function removeGroupMember(
  channel: Channel,
  targetId: string,
  targetName: string,
  actorName: string,
) {
  await channel.removeMembers(
    [targetId],
    systemMessage(`${actorName} removed ${targetName}`),
  );
}

export async function leaveGroup(
  channel: Channel,
  myId: string,
  myName: string,
) {
  const adminIds = getGroupAdminIds(channel);
  const memberIds = Object.keys(channel.state.members || {});
  const amOnlyAdmin =
    adminIds.length === 1 && adminIds[0] === myId && memberIds.length > 1;

  if (amOnlyAdmin) {
    const nextAdmin = memberIds.find((id) => id !== myId);
    if (nextAdmin) {
      await channel.addModerators([nextAdmin]);
    }
  }

  await channel.removeMembers([myId], systemMessage(`${myName} left`));
}

export async function updateGroupIcon(channel: Channel, localUri: string) {
  const url = await uploadProfileImage(localUri);
  if (!url) {
    throw new Error("Could not upload group photo");
  }
  await channel.update({ image: url } as Record<string, unknown>);
  return url;
}

export async function announceMembersJoined(
  channel: Channel,
  actorName: string,
  joinedNames: string[],
) {
  if (!joinedNames.length) return;
  const label =
    joinedNames.length === 1
      ? joinedNames[0]
      : `${joinedNames.slice(0, -1).join(", ")} and ${joinedNames[joinedNames.length - 1]}`;
  await channel.sendMessage(
    systemMessage(`${actorName} added ${label}`),
  );
}

export function canManageMember(
  channel: Channel,
  myId: string,
  target: GroupMemberRow,
): boolean {
  if (!isGroupAdmin(channel, myId)) return false;
  if (target.userId === myId) return false;
  const creatorId = getGroupCreatorId(channel);
  if (creatorId && target.userId === creatorId) return false;
  return true;
}
