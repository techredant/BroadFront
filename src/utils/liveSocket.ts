import type { Socket } from "socket.io-client";
import { SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import { createFeedSocket } from "@/utils/feedSocket";
import {
  joinLiveSocketRoom,
  leaveLiveSocketRoom,
} from "@/rtc/agoraSignaling";

let sharedLiveSocket: Socket | null = null;
let liveSocketRefCount = 0;
const joinedLiveRooms = new Set<string>();

function ensureLiveSocket(): Socket | null {
  if (SOCKET_IO_DISABLED_ON_HOST) return null;
  if (!sharedLiveSocket) {
    sharedLiveSocket = createFeedSocket();
    sharedLiveSocket.on("connect", () => {
      for (const callId of joinedLiveRooms) {
        joinLiveSocketRoom(sharedLiveSocket!, callId);
      }
      if (__DEV__ && joinedLiveRooms.size) {
        console.log(
          "[LiveSocket] rejoined rooms:",
          [...joinedLiveRooms].join(", "),
        );
      }
    });
  }
  return sharedLiveSocket;
}

/** One shared Socket.IO connection for live rooms (comments, likes, gifts). */
export function acquireLiveSocket(callId: string): Socket | null {
  const socket = ensureLiveSocket();
  if (!socket || !callId) return null;

  liveSocketRefCount += 1;
  if (!joinedLiveRooms.has(callId)) {
    joinedLiveRooms.add(callId);
    joinLiveSocketRoom(socket, callId);
    if (__DEV__) {
      console.log("[LiveSocket] joined live room:", callId);
    }
  } else if (socket.connected) {
    joinLiveSocketRoom(socket, callId);
  }

  return socket;
}

export function releaseLiveSocket(callId: string) {
  liveSocketRefCount = Math.max(0, liveSocketRefCount - 1);
  if (callId) {
    joinedLiveRooms.delete(callId);
    if (sharedLiveSocket?.connected) {
      leaveLiveSocketRoom(sharedLiveSocket, callId);
    }
  }

  if (liveSocketRefCount === 0 && sharedLiveSocket) {
    sharedLiveSocket.disconnect();
    sharedLiveSocket = null;
    joinedLiveRooms.clear();
  }
}
