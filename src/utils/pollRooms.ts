import { getFeedRoomsForViewer, levelRoomName } from "@/utils/feedRooms";

const NATIONAL_POLL_ROOM = "poll-national-Kenya";

export function pollRoomName(levelType: string, levelValue: string) {
  return `poll-${levelType}-${levelValue || "all"}`;
}

export function livePollRoom(callId: string) {
  return `poll-live-${callId}`;
}

/** Socket rooms for real-time poll updates at the viewer's geography. */
export function getPollRoomsForViewer(
  levelType: string,
  levelValue: string,
): string[] {
  const rooms = new Set<string>([NATIONAL_POLL_ROOM]);

  for (const feedRoom of getFeedRoomsForViewer(levelType, levelValue)) {
    const match = feedRoom.match(/^level-([^-]+)-(.+)$/);
    if (match) {
      rooms.add(pollRoomName(match[1], match[2]));
    }
  }

  if (levelType) {
    rooms.add(pollRoomName(levelType, levelValue));
  }

  return [...rooms];
}

export { NATIONAL_POLL_ROOM, levelRoomName };
