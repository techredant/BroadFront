import { useEffect, useRef, useState } from "react";
import type { RtcCall } from "@/rtc/RtcCall";
import type { AgoraRtcClient } from "@/rtc/RtcCall";
import { CallingState } from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";
import { useAgoraRtc } from "@/rtc/AgoraRtcContext";
import type { StreamChat } from "stream-chat";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  buildCallMemberDisplayNames,
  displayNameFromChatUser,
  getRemoteChatMember,
  resolveCallParticipantName,
} from "@/utils/callDisplayName";
import { syncChatMemberProfiles } from "@/utils/streamUser";
import {
  messagingChannelCid,
  messagingChannelIdFromRoute,
  streamVideoCallId,
} from "@/utils/callDisplay";
import {
  buildOutgoingCallRequest,
  endStaleCallBeforeOutgoing,
  type CallMode,
} from "@/utils/callMode";
import { joinCallWithMedia, isCallJoinInProgress } from "@/utils/callMedia";
import { upsertStreamUser } from "@/utils/streamUser";
import { isUserBusyInAnotherCall, rejectRingingCall } from "@/utils/callBusy";
import { callDebug } from "@/utils/callDebug";
import { configureCallDefaults } from "@/utils/streamCallLifecycle";
import { setActiveRtcCall } from "@/rtc/RtcCall";
import { fetchCallSession } from "@/rtc/agoraApi";

export type CallRemotePeer = {
  name: string;
  image?: string;
};

type UseCallManagerOptions = {
  videoClient: AgoraRtcClient | null | undefined;
  chatClient: StreamChat | null | undefined;
  rawCallId: string;
  isCaller: boolean;
  urlCallMode: CallMode;
  userId: string | null | undefined;
  callAccepted?: boolean;
  initialRemotePeer?: { name?: string; image?: string };
};

export function useCallManager({
  videoClient,
  chatClient,
  rawCallId,
  isCaller,
  urlCallMode,
  userId,
  callAccepted = false,
  initialRemotePeer,
}: UseCallManagerOptions) {
  const { socket } = useAgoraRtc();
  const channelId = rawCallId ? messagingChannelIdFromRoute(rawCallId) : "";
  const videoCallId = channelId ? streamVideoCallId(channelId) : "";

  const [call, setCall] = useState<RtcCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveCallMode, setEffectiveCallMode] =
    useState<CallMode>(urlCallMode);
  const [remotePeer, setRemotePeer] = useState<CallRemotePeer>(() => ({
    name: initialRemotePeer?.name?.trim() || "Member",
    image: initialRemotePeer?.image,
  }));
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const callRef = useRef<RtcCall | null>(null);
  callRef.current = call;
  const chatUserId = chatClient?.userID;
  const acceptHandledRef = useRef(false);
  const calleeJoinStartedRef = useRef(false);
  const setupGenerationRef = useRef(0);

  useEffect(() => {
    if (!videoCallId || !channelId) {
      setLoading(false);
      setError("Invalid call.");
      return;
    }

    if (!videoClient || !chatUserId || !userId) {
      return;
    }

    const generation = ++setupGenerationRef.current;
    let cancelled = false;
    acceptHandledRef.current = false;
    calleeJoinStartedRef.current = false;

    const resolveCallMode = (streamCall: RtcCall) => {
      const custom = streamCall.state?.custom as { callMode?: string } | undefined;
      if (custom?.callMode === "audio") return "audio" as const;
      if (custom?.callMode === "video") return "video" as const;
      return urlCallMode;
    };

    const hydratePeerInfo = async () => {
      const channel = chatClient.channel("messaging", channelId);
      await channel.watch();

      const myId = chatUserId;
      const nameMap = buildCallMemberDisplayNames(channel, myId);
      const remote = getRemoteChatMember(channel, myId);

      const memberIds = Object.keys(channel.state.members).filter(
        (id) => id && id !== "ai-assistant",
      );
      try {
        const profiles = await syncChatMemberProfiles(memberIds);
        for (const profile of profiles) {
          if (profile.name?.trim()) {
            nameMap[profile.clerkId] = profile.name.trim();
          }
        }
      } catch {
        /* keep chat-derived names */
      }

      const remoteName = remote?.user_id
        ? resolveCallParticipantName(
            remote.user_id,
            nameMap,
            remote.user?.name,
          )
        : "Member";

      if (!cancelled && generation === setupGenerationRef.current) {
        setDisplayNames(nameMap);
        setRemotePeer({
          name: remoteName !== "User" ? remoteName : displayNameFromChatUser(remote?.user),
          image: remote?.user?.image,
        });
      }

      void Promise.all(
        Object.entries(nameMap).map(([uid, name]) =>
          uid === myId
            ? Promise.resolve()
            : upsertStreamUser({
                userId: uid,
                name,
                image: channel.state.members[uid]?.user?.image,
              }).catch(() => {}),
        ),
      );
    };

    const setup = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isCaller && isUserBusyInAnotherCall(videoClient, videoCallId)) {
          if (!cancelled) setError("You are already in another call.");
          return;
        }

        if (!isCaller && isUserBusyInAnotherCall(videoClient, videoCallId)) {
          await rejectRingingCall(videoClient, videoCallId, "busy");
          if (!cancelled) setError("You are already in another call.");
          return;
        }

        if (!isCaller) {
          const streamCall = videoClient.call("default", videoCallId);
          configureCallDefaults(streamCall);

          const session = await fetchCallSession(videoCallId);
          if (!session || session.status === "ended") {
            if (!cancelled) setError("Call ended.");
            return;
          }

          if (session.callMode) {
            streamCall.state.custom = {
              ...streamCall.state.custom,
              callMode: session.callMode,
            };
          }

          if (streamCall.state.callingState === RtcConnectionState.LEFT) {
            streamCall.resetForIncomingRing({
              callMode: session.callMode,
            });
          }

          const mode = resolveCallMode(streamCall);

          if (streamCall.state.callingState === RtcConnectionState.IDLE) {
            await streamCall.get({ ring: false, video: mode === "video" });
          }

          if (!cancelled && generation === setupGenerationRef.current) {
            setEffectiveCallMode(mode);
            setCall(streamCall);
            setActiveRtcCall(streamCall);
          }

          void hydratePeerInfo().catch(() => {});
          return;
        }

        await endStaleCallBeforeOutgoing(videoClient, videoCallId, chatUserId);

        const channel = chatClient.channel("messaging", channelId);
        await channel.watch();

        const myId = chatUserId;
        const streamCall = videoClient.call("default", videoCallId);
        configureCallDefaults(streamCall);
        const isVideoCall = urlCallMode === "video";
        const memberIds = new Set<string>([myId]);
        Object.values(channel.state.members).forEach((m) => {
          if (m.user_id) memberIds.add(m.user_id);
        });

        if (memberIds.size < 2) {
          if (!cancelled) {
            setError("Could not find anyone to call in this chat.");
          }
          return;
        }

        const watchPromise = hydratePeerInfo().catch((err) =>
          callDebug.warn("hydrate-peer-failed", err),
        );

        await streamCall.getOrCreate(
          buildOutgoingCallRequest(
            isVideoCall,
            myId,
            Array.from(memberIds),
            messagingChannelCid(channelId),
          ),
        );

        callDebug.log("setup-complete", {
          videoCallId,
          isCaller,
          mode: urlCallMode,
        });

        if (!cancelled && generation === setupGenerationRef.current) {
          setCall(streamCall);
          setActiveRtcCall(streamCall);
        }

        void watchPromise;
      } catch (err) {
        callDebug.error("setup-failed", err, { apiBase: API_PUBLIC_URL });
        if (!cancelled && generation === setupGenerationRef.current) {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Failed to start the call.";
          setError(message);
        }
      } finally {
        if (!cancelled && generation === setupGenerationRef.current) {
          setLoading(false);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [
    videoClient,
    chatClient,
    videoCallId,
    channelId,
    chatUserId,
    userId,
    isCaller,
    urlCallMode,
  ]);

  useEffect(() => {
    if (!call || isCaller) return;
    if (!callAccepted && call.state.callingState !== RtcConnectionState.JOINED) return;
    if (calleeJoinStartedRef.current) return;
    if (isCallJoinInProgress(call.id)) return;

    calleeJoinStartedRef.current = true;
    void joinCallWithMedia(call, effectiveCallMode === "video").catch((err) =>
      callDebug.warn("callee-join-failed", err),
    );
  }, [call, isCaller, callAccepted, effectiveCallMode]);

  useEffect(() => {
    if (!call || !socket) return;

    const onEnded = (payload: { channelName?: string }) => {
      if (payload.channelName !== call.id) return;
      if (call.state.callingState === RtcConnectionState.LEFT) return;
      void call.leave({ skipBackend: true }).catch(() => {});
    };

    socket.on("call:ended", onEnded);
    return () => {
      socket.off("call:ended", onEnded);
    };
  }, [call, socket]);

  useEffect(() => {
    if (!call || !isCaller) return;

    const mode = effectiveCallMode === "video";

    const joinCallerMedia = async () => {
      if (acceptHandledRef.current) return;
      if (call.state.callingState === RtcConnectionState.LEFT) return;
      if (isCallJoinInProgress(call.id)) return;

      acceptHandledRef.current = true;
      try {
        await joinCallWithMedia(call, mode);
        callDebug.log("caller-joined-on-accept");
      } catch (err) {
        acceptHandledRef.current = false;
        callDebug.error("caller-join-failed", err);
      }
    };

    const onAccepted = (payload: { channelName: string; userId: string }) => {
      if (payload.channelName !== call.id) return;
      if (payload.userId === call.currentUserId) return;
      void joinCallerMedia();
    };

    const onRemoteJoined = () => {
      const remoteJoined = call.state.remoteParticipants.some(
        (participant) => participant.userId !== call.currentUserId,
      );
      if (!remoteJoined && call.ringing) return;
      void joinCallerMedia();
    };

    onRemoteJoined();

    const unsubCall = call.on("call.accepted", onAccepted);
    socket?.on("call:accepted", onAccepted);

    const pollAccepted = setInterval(() => {
      if (acceptHandledRef.current) return;
      void fetchCallSession(call.id).then((session) => {
        if (session?.status !== "active") return;
        const peerAccepted = (session.acceptedBy ?? []).some(
          (id) => id && id !== call.currentUserId,
        );
        if (peerAccepted) void joinCallerMedia();
      });
    }, 2000);

    return () => {
      unsubCall();
      socket?.off("call:accepted", onAccepted);
      clearInterval(pollAccepted);
    };
  }, [call, isCaller, effectiveCallMode, socket]);

  useEffect(() => {
    return () => {
      const activeCall = callRef.current;
      if (!activeCall) return;

      const state = activeCall.state.callingState;
      if (state === RtcConnectionState.LEFT || state === RtcConnectionState.JOINING) {
        return;
      }

      if (
        activeCall.isCreatedByMe &&
        (state === RtcConnectionState.RINGING || activeCall.ringing)
      ) {
        void activeCall.leave({ reject: true, reason: "cancel" }).catch(() => {});
      }
    };
  }, []);

  return {
    call,
    loading,
    error,
    remotePeer,
    displayNames,
    effectiveCallMode,
    videoCallId,
    channelId,
  };
}

export { CallingState };
