/** Decode route / ring param to a messaging channel id. */
export function messagingChannelIdFromRoute(raw: string) {
  const decoded = decodeURIComponent(raw);
  const id = decoded.includes(":") ? decoded.split(":").pop()! : decoded;
  if (id.startsWith("members-") && !id.startsWith("!")) {
    return `!${id}`;
  }
  return id;
}

/** Stream Video call ids must be URL-safe (no leading `!`). */
export function streamVideoCallId(channelId: string) {
  const id = channelId.startsWith("!") ? channelId.slice(1) : channelId;
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function messagingChannelCid(channelId: string) {
  return channelId.includes(":") ? channelId : `messaging:${channelId}`;
}
