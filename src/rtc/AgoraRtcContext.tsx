import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import { createFeedSocket } from "@/utils/feedSocket";
import { SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import { AgoraRtcClient, initSharedRtcEngine, releaseSharedRtcEngine } from "./RtcCall";
import { fetchAgoraAppId } from "./agoraApi";
import { bindCallSignaling } from "./agoraSignaling";
import type { CallRingPayload, EnrichedRtcParticipant } from "./types";
import { RtcConnectionState } from "./types";

type AgoraRtcContextValue = {
  client: AgoraRtcClient | null;
  appId: string | null;
  socket: Socket | null;
  ready: boolean;
  lastRingEvent: CallRingPayload | null;
  clearRingEvent: () => void;
};

const AgoraRtcContext = createContext<AgoraRtcContextValue>({
  client: null,
  appId: null,
  socket: null,
  ready: false,
  lastRingEvent: null,
  clearRingEvent: () => {},
});

export function useAgoraRtc() {
  return useContext(AgoraRtcContext);
}

/** @deprecated Use useAgoraRtc — compatibility alias */
export function useStreamVideoClient() {
  const { client } = useAgoraRtc();
  return client;
}

const RtcSessionContext = createContext<import("./RtcCall").RtcCall | null>(null);

export function RtcSessionProvider({
  call,
  children,
}: {
  call: import("./RtcCall").RtcCall | null;
  children: React.ReactNode;
}) {
  return (
    <RtcSessionContext.Provider value={call}>{children}</RtcSessionContext.Provider>
  );
}

/** Replaces Stream useCall() */
export function useRtcSession() {
  return useContext(RtcSessionContext);
}

/** @deprecated alias */
export function useCall() {
  return useRtcSession();
}

export function useRtcState() {
  const call = useRtcSession();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!call) return;
    const unsub = call.on("stateChanged", () => tick((n) => n + 1));
    return unsub;
  }, [call]);

  return useMemo(
    () => ({
      callingState: call?.state.callingState ?? "left",
      micEnabled: call?.isMicEnabled() ?? false,
      cameraEnabled: call?.isCameraEnabled() ?? false,
      remoteParticipants: call?.state.remoteParticipants ?? [],
      localParticipant: call?.state.localParticipant,
      backstage: call?.state.backstage ?? true,
    }),
    [call, call?.state.callingState, call?.state.remoteParticipants.length, call?.state.localParticipant?.uid],
  );
}

function enrichParticipant(
  p: import("./types").RtcParticipant,
  localUserId: string | undefined,
): EnrichedRtcParticipant {
  const hasVideo = p.hasVideo ?? false;
  const hasAudio = p.hasAudio ?? false;
  return {
    ...p,
    sessionId: `${p.userId}-${p.uid}`,
    isLocalParticipant: p.userId === localUserId,
    isSpeaking: hasAudio,
    publishedTracks: [
      ...(hasAudio ? ["audioTrack"] : []),
      ...(hasVideo ? ["videoTrack"] : []),
    ],
  };
}

export function useCallStateHooks() {
  const call = useRtcSession();
  const state = useRtcState();
  const localUserId = call?.currentUserId;

  const participants = useMemo(() => {
    const all: EnrichedRtcParticipant[] = [];
    if (state.localParticipant) {
      all.push(enrichParticipant(state.localParticipant, localUserId));
    }
    for (const p of state.remoteParticipants) {
      all.push(enrichParticipant(p, localUserId));
    }
    return all;
  }, [state.localParticipant, state.remoteParticipants, localUserId]);

  const ownCapabilities = call?.state.ownCapabilities ?? [];
  const isHost = Boolean(call?.isCreatedByMe);

  return {
    useCallCallingState: () => state.callingState,
    useLocalParticipant: () =>
      state.localParticipant
        ? enrichParticipant(state.localParticipant, localUserId)
        : undefined,
    useRemoteParticipants: () =>
      state.remoteParticipants.map((p) => enrichParticipant(p, localUserId)),
    useRawParticipants: () => participants,
    useParticipants: () => participants,
    useParticipantCount: () =>
      Math.max(
        participants.length,
        (call?.state.participants?.length ?? 0) || participants.length,
      ),
    useCallCustomData: () => call?.state.custom ?? {},
    useCallEndedAt: () => call?.state.endedAt ?? null,
    useIsCallLive: () =>
      state.callingState === RtcConnectionState.JOINED && !state.backstage,
    useHasPermissions: (cap?: string) => {
      if (!cap) return true;
      if (isHost) return true;
      return ownCapabilities.includes(cap);
    },
    useOwnCapabilities: () => ownCapabilities,
    useCallSettings: () => call?.state.settings ?? {},
    useMicrophoneState: () => ({
      status: state.micEnabled ? ("enabled" as const) : ("disabled" as const),
      optimisticIsMute: !state.micEnabled,
      microphone: {
        toggle: () => call?.microphone.toggle(),
        enable: () => call?.microphone.enable(),
        disable: () => call?.microphone.disable(),
      },
    }),
    useCameraState: () => ({
      isEnabled: state.cameraEnabled,
      camera: {
        toggle: () => call?.camera.toggle(),
        enable: () => call?.camera.enable(),
        disable: () => call?.camera.disable(),
      },
    }),
  };
}

type ProviderProps = {
  userId: string | undefined;
  children: React.ReactNode;
  onIncomingRing?: (payload: CallRingPayload) => void;
};

export function AgoraRtcProvider({ userId, children, onIncomingRing }: ProviderProps) {
  const [client, setClient] = useState<AgoraRtcClient | null>(null);
  const [appId, setAppId] = useState<string | null>(
    process.env.EXPO_PUBLIC_AGORA_APP_ID || null,
  );
  const [ready, setReady] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastRingEvent, setLastRingEvent] = useState<CallRingPayload | null>(null);
  const onRingRef = useRef(onIncomingRing);
  onRingRef.current = onIncomingRing;

  const clearRingEvent = useCallback(() => setLastRingEvent(null), []);

  useEffect(() => {
    if (!userId) {
      setClient(null);
      setReady(false);
      releaseSharedRtcEngine();
      return;
    }

    let cancelled = false;

    const boot = async () => {
      try {
        const resolvedAppId =
          process.env.EXPO_PUBLIC_AGORA_APP_ID || (await fetchAgoraAppId());
        if (cancelled) return;
        setAppId(resolvedAppId);
        await initSharedRtcEngine(resolvedAppId);
        if (cancelled) return;
        setClient(new AgoraRtcClient(userId));
        setReady(true);
      } catch (err) {
        console.error("Agora RTC init failed:", err);
        if (!cancelled) setReady(false);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      releaseSharedRtcEngine();
      setClient(null);
      setReady(false);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || SOCKET_IO_DISABLED_ON_HOST) return;

    const sock = createFeedSocket();
    setSocket(sock);

    const joinUser = () => sock.emit("join", userId);
    sock.on("connect", joinUser);
    if (sock.connected) joinUser();

    const unbind = bindCallSignaling(sock, {
      onRing: (payload) => {
        if (payload.callerId === userId) return;
        setLastRingEvent(payload);
        onRingRef.current?.(payload);
      },
    });

    return () => {
      unbind();
      sock.disconnect();
      setSocket(null);
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      client,
      appId,
      socket,
      ready,
      lastRingEvent,
      clearRingEvent,
    }),
    [client, appId, socket, ready, lastRingEvent, clearRingEvent],
  );

  return (
    <AgoraRtcContext.Provider value={value}>{children}</AgoraRtcContext.Provider>
  );
}
