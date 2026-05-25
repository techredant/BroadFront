import io, { type Socket } from "socket.io-client";
import { SOCKET_IO_DISABLED_ON_HOST, SOCKET_IO_URL } from "@/constants/api";

export type FeedSocketStatus = "connecting" | "connected" | "disconnected";

/** Long-running Node server only — same host as API when using local backend. */
export function createFeedSocket(): Socket {
  const socket = io(SOCKET_IO_URL, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
    autoConnect: true,
  });

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    socket.on("connect", () => {
      console.log("[Socket.IO] connected", socket.id);
    });
    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] disconnected:", reason);
    });
    socket.on("connect_error", (err) => {
      console.warn(
        "[Socket.IO] connect_error:",
        err.message,
        SOCKET_IO_DISABLED_ON_HOST
          ? "— enable EXPO_PUBLIC_USE_LOCAL_API and run backend on your PC"
          : "",
      );
    });
    socket.on("roomsJoined", (rooms: string[]) => {
      console.log("[Socket.IO] joined rooms:", rooms?.length ?? 0, rooms);
    });
  }

  return socket;
}

export { levelRoomName } from "@/utils/feedRooms";

/** Join all feed rooms for this level (matches what GET /posts returns). */
export function bindLevelRooms(socket: Socket, rooms: string[]) {
  const unique = [...new Set(rooms.filter(Boolean))];

  const joinAll = () => {
    if (unique.length === 0) return;
    socket.emit("joinRooms", unique);
    if (unique.length === 1) {
      socket.emit("joinRoom", unique[0]);
    }
  };

  socket.on("connect", joinAll);
  if (socket.connected) joinAll();

  return () => {
    socket.off("connect", joinAll);
    for (const room of unique) {
      socket.emit("leaveRoom", room);
    }
  };
}

export type FeedSocketHandlers = {
  onNewPost?: (post: unknown) => void;
  onDeletePost?: (postId: string) => void;
  onPostUpdated?: (post: unknown) => void;
};

export function bindFeedSocketEvents(
  socket: Socket,
  handlers: FeedSocketHandlers,
) {
  const onUpdated = (post: unknown) => handlers.onPostUpdated?.(post);
  if (handlers.onNewPost) socket.on("newPost", handlers.onNewPost);
  if (handlers.onDeletePost) socket.on("deletePost", handlers.onDeletePost);
  socket.on("updatePost", onUpdated);
  socket.on("postUpdated", onUpdated);
  return () => {
    if (handlers.onNewPost) socket.off("newPost", handlers.onNewPost);
    if (handlers.onDeletePost) {
      socket.off("deletePost", handlers.onDeletePost);
    }
    socket.off("updatePost", onUpdated);
    socket.off("postUpdated", onUpdated);
  };
}
