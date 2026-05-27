import type { Socket } from "socket.io-client";
import { SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import { queryPresenceOnline } from "@/services/presenceApi";
import { presenceStore } from "@/lib/presenceStore";

const activeSockets = new Set<Socket>();

/** Attach presence listeners and register this client as online. */
export function bindPresenceSocket(
  socket: Socket,
  clerkId: string | null | undefined,
) {
  activeSockets.add(socket);

  const onSnapshot = (data: { onlineUserIds?: string[] }) => {
    if (Array.isArray(data?.onlineUserIds)) {
      presenceStore.applyOnlineSnapshot(data.onlineUserIds);
    }
  };

  const onBatch = (data: { onlineUserIds?: string[]; requestedIds?: string[] }) => {
    if (!Array.isArray(data?.onlineUserIds)) return;
    if (Array.isArray(data?.requestedIds)) {
      presenceStore.applyQueryResult(data.requestedIds, data.onlineUserIds);
    } else {
      presenceStore.markUsersOnline(data.onlineUserIds);
    }
  };

  const onOnline = (data: { userId?: string }) => {
    if (data?.userId) presenceStore.setUserOnline(String(data.userId), true);
  };

  const onOffline = (data: { userId?: string }) => {
    if (data?.userId) presenceStore.setUserOnline(String(data.userId), false);
  };

  socket.on("presence:snapshot", onSnapshot);
  socket.on("presence:batch", onBatch);
  socket.on("presence:online", onOnline);
  socket.on("presence:offline", onOffline);

  const register = () => {
    if (clerkId) socket.emit("join", clerkId);
  };

  socket.on("connect", register);
  if (socket.connected) register();

  return () => {
    activeSockets.delete(socket);
    socket.off("presence:snapshot", onSnapshot);
    socket.off("presence:batch", onBatch);
    socket.off("presence:online", onOnline);
    socket.off("presence:offline", onOffline);
    socket.off("connect", register);
  };
}

export function queryPresenceUserIds(userIds: Iterable<string>) {
  const ids = [...new Set(Array.from(userIds, String).filter(Boolean))];
  if (ids.length === 0) return;

  if (!SOCKET_IO_DISABLED_ON_HOST) {
    for (const socket of activeSockets) {
      if (socket.connected) {
        socket.emit("presence:query", ids);
      }
    }
  }

  void queryPresenceOnline(ids)
    .then((onlineUserIds) => {
      presenceStore.applyQueryResult(ids, onlineUserIds);
    })
    .catch(() => {});
}
