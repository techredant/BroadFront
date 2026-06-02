import type { Socket } from "socket.io-client";
import { createFeedSocket } from "@/utils/feedSocket";

let shared: Socket | null = null;

export function getStatusSocket(): Socket {
  if (!shared) {
    shared = createFeedSocket();
  }
  return shared;
}

export type StatusSocketHandlers = {
  onCreated?: (status: unknown) => void;
  onViewed?: (payload: {
    statusId: string;
    userId: string;
    authorId?: string;
    views?: unknown[];
  }) => void;
  onDeleted?: (payload: { statusId: string; userId?: string }) => void;
};

export function bindStatusSocketEvents(
  socket: Socket,
  handlers: StatusSocketHandlers,
) {
  if (handlers.onCreated) socket.on("status:created", handlers.onCreated);
  if (handlers.onViewed) socket.on("status:viewed", handlers.onViewed);
  if (handlers.onDeleted) socket.on("status:deleted", handlers.onDeleted);

  return () => {
    if (handlers.onCreated) socket.off("status:created", handlers.onCreated);
    if (handlers.onViewed) socket.off("status:viewed", handlers.onViewed);
    if (handlers.onDeleted) socket.off("status:deleted", handlers.onDeleted);
  };
}
