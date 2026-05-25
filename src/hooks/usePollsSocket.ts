import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { Poll } from "@/types/poll";
import {
  bindLevelRooms,
  createFeedSocket,
} from "@/utils/feedSocket";
import { getPollRoomsForViewer, livePollRoom } from "@/utils/pollRooms";

export type PollSocketHandlers = {
  onNewPoll?: (poll: Poll) => void;
  onVoteUpdated?: (poll: Poll) => void;
  onPollClosed?: (poll: Poll) => void;
  onCommentAdded?: (payload: { pollId: string; comment: unknown }) => void;
};

export function usePollsSocket(
  levelType: string | undefined,
  levelValue: string | undefined,
  handlers: PollSocketHandlers,
  liveCallId?: string,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!levelType || !levelValue) return;

    const socket: Socket = createFeedSocket();
    const rooms = getPollRoomsForViewer(levelType, levelValue);
    if (liveCallId) {
      rooms.push(livePollRoom(liveCallId));
    }

    const unbindRooms = bindLevelRooms(socket, rooms);

    const onNew = (poll: Poll) => handlersRef.current.onNewPoll?.(poll);
    const onVote = (poll: Poll) =>
      handlersRef.current.onVoteUpdated?.(poll);
    const onClosed = (poll: Poll) =>
      handlersRef.current.onPollClosed?.(poll);
    const onComment = (payload: { pollId: string; comment: unknown }) =>
      handlersRef.current.onCommentAdded?.(payload);

    socket.on("newPoll", onNew);
    socket.on("pollVoteUpdated", onVote);
    socket.on("pollClosed", onClosed);
    socket.on("pollCommentAdded", onComment);

    return () => {
      unbindRooms();
      socket.off("newPoll", onNew);
      socket.off("pollVoteUpdated", onVote);
      socket.off("pollClosed", onClosed);
      socket.off("pollCommentAdded", onComment);
      socket.disconnect();
    };
  }, [levelType, levelValue, liveCallId]);
}
