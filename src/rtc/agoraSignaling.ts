import type { Socket } from "socket.io-client";
import type { CallRingPayload } from "./types";

export type CallSignalingHandlers = {
  onRing?: (payload: CallRingPayload) => void;
  onAccepted?: (payload: { channelName: string; userId: string; callMode?: string }) => void;
  onDeclined?: (payload: { channelName: string; userId: string; reason?: string }) => void;
  onEnded?: (payload: { channelName: string; userId?: string; reason?: string }) => void;
  onBusy?: (payload: { channelName: string }) => void;
};

export type LiveSignalingHandlers = {
  onStarted?: (payload: Record<string, unknown>) => void;
  onEnded?: (payload: Record<string, unknown>) => void;
  onViewerCount?: (payload: { callId: string; viewerCount: number }) => void;
  onGuestInvite?: (payload: Record<string, unknown>) => void;
  onSpeakDenied?: (payload: Record<string, unknown>) => void;
  onLiveEvent?: (type: string, payload: Record<string, unknown>) => void;
};

export function bindCallSignaling(socket: Socket, handlers: CallSignalingHandlers) {
  const onRing = (payload: CallRingPayload) => handlers.onRing?.(payload);
  const onAccepted = (payload: { channelName: string; userId: string; callMode?: string }) =>
    handlers.onAccepted?.(payload);
  const onDeclined = (payload: { channelName: string; userId: string; reason?: string }) =>
    handlers.onDeclined?.(payload);
  const onEnded = (payload: { channelName: string; userId?: string; reason?: string }) =>
    handlers.onEnded?.(payload);
  const onBusy = (payload: { channelName: string }) => handlers.onBusy?.(payload);

  socket.on("call:ring", onRing);
  socket.on("call:accepted", onAccepted);
  socket.on("call:declined", onDeclined);
  socket.on("call:ended", onEnded);
  socket.on("call:busy", onBusy);

  return () => {
    socket.off("call:ring", onRing);
    socket.off("call:accepted", onAccepted);
    socket.off("call:declined", onDeclined);
    socket.off("call:ended", onEnded);
    socket.off("call:busy", onBusy);
  };
}

export function bindLiveSignaling(socket: Socket, handlers: LiveSignalingHandlers) {
  const wrap =
    (type: string) =>
    (payload: Record<string, unknown>) =>
      handlers.onLiveEvent?.(type, payload);

  socket.on("live:started", (p) => handlers.onStarted?.(p));
  socket.on("live:ended", (p) => handlers.onEnded?.(p));
  socket.on("live:viewer_count", (p) => handlers.onViewerCount?.(p));
  socket.on("live:guest_invite", (p) => handlers.onGuestInvite?.(p));
  socket.on("live:speak_denied", (p) => handlers.onSpeakDenied?.(p));
  socket.on("live:chat", wrap("live:chat"));
  socket.on("live:reaction", wrap("live:reaction"));
  socket.on("live:join_ping", wrap("live:join_ping"));
  socket.on("live:speak_request", wrap("live:speak_request"));

  return () => {
    socket.off("live:started");
    socket.off("live:ended");
    socket.off("live:viewer_count");
    socket.off("live:guest_invite");
    socket.off("live:speak_denied");
    socket.off("live:chat");
    socket.off("live:reaction");
    socket.off("live:join_ping");
    socket.off("live:speak_request");
  };
}

export function joinLiveSocketRoom(socket: Socket, callId: string) {
  socket.emit("joinLiveRoom", callId);
}

export function leaveLiveSocketRoom(socket: Socket, callId: string) {
  socket.emit("leaveLiveRoom", callId);
}
