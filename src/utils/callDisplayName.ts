import type { Channel } from "stream-chat";

/** Prefer chat profile name; never show raw clerk id when a label exists. */
export function displayNameFromChatUser(
  user?: { id?: string; name?: string } | null,
): string {
  if (!user) return "User";
  const name = user.name?.trim();
  if (name && name !== user.id) return name;
  return "User";
}

export function buildCallMemberDisplayNames(
  channel: Channel,
  myId: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const member of Object.values(channel.state.members)) {
    const id = member.user_id;
    if (!id) continue;
    map[id] = displayNameFromChatUser(member.user);
  }
  if (myId && !map[myId]) {
    map[myId] = "You";
  }
  return map;
}

export function getRemoteChatMember(channel: Channel, myId: string) {
  return Object.values(channel.state.members).find(
    (m) => m.user_id && m.user_id !== myId,
  );
}

export function resolveCallParticipantName(
  userId: string,
  displayNames: Record<string, string>,
  participantName?: string | null,
): string {
  const mapped = displayNames[userId]?.trim();
  if (mapped && mapped !== userId) return mapped;

  const raw = participantName?.trim();
  if (raw && raw !== userId) return raw;

  return "User";
}
