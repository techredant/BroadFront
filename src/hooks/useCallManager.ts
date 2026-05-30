import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import type { StreamChat } from "stream-chat";
import {
  buildCallMemberDisplayNames,
  displayNameFromChatUser,
  getRemoteChatMember,
} from "@/utils/callDisplayName";
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

export type CallRemotePeer = {
  name: string;
  image?: string;
};

type UseCallManagerOptions = {
  videoClient: StreamVideoClient | null | undefined;
  chatClient: StreamChat | null | undefined;
  rawCallId: string;
  isCaller: boolean;
  urlCallMode: CallMode;
  userId: string | null | undefined;
};

export function useCallManager({
  videoClient,
  chatClient,
  rawCallId,
  isCaller,
  urlCallMode,
  userId,
}: UseCallManagerOptions) {
  const channelId = rawCallId ? messagingChannelIdFromRoute(rawCallId) : "";
  const videoCallId = channelId ? streamVideoCallId(channelId) : "";

  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveCallMode, setEffectiveCallMode] =
    useState<CallMode>(urlCallMode);
  const [remotePeer, setRemotePeer] = useState<CallRemotePeer>({ name: "User" });
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const callRef = useRef<Call | null>(null);
  callRef.current = call;
  const chatUserId = chatClient?.userID;
  const acceptHandledRef = useRef(false);
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

    const resolveCallMode = (streamCall: Call) => {
      const custom = streamCall.state?.custom as
        | { callMode?: string }
        | undefined;
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

      if (!cancelled && generation === setupGenerationRef.current) {
        setDisplayNames(nameMap);
        setRemotePeer({
          name: displayNameFromChatUser(remote?.user),
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
          if (!cancelled) {
            setError("You are already in another call.");
          }
          return;
        }

        if (!isCaller && isUserBusyInAnotherCall(videoClient, videoCallId)) {
          await rejectRingingCall(videoClient, videoCallId, "busy");
          if (!cancelled) {
            setError("You are already in another call.");
          }
          return;
        }

        if (!isCaller) {
          const streamCall = videoClient.call("default", videoCallId, {
            reuseInstance: true,
          });
          const mode = resolveCallMode(streamCall);

          if (streamCall.state.callingState === CallingState.LEFT) {
            if (!cancelled) {
              setError("Call ended.");
            }
            return;
          }

          if (
            streamCall.state.callingState === CallingState.JOINING ||
            isCallJoinInProgress(videoCallId)
          ) {
            if (!cancelled && generation === setupGenerationRef.current) {
              setEffectiveCallMode(mode);
              setCall(streamCall);
            }
            void hydratePeerInfo().catch(() => {});
            void joinCallWithMedia(streamCall, mode === "video").catch((err) =>
              callDebug.warn("callee-join-failed", err),
            );
            return;
          }

          if (streamCall.state.callingState !== CallingState.JOINED) {
            if (!streamCall.ringing) {
              await streamCall.get({
                ring: true,
                video: mode === "video",
              });
            }
            await joinCallWithMedia(streamCall, mode === "video");
          } else {
            await joinCallWithMedia(streamCall, mode === "video");
          }

          if (!cancelled && generation === setupGenerationRef.current) {
            setEffectiveCallMode(mode);
            setCall(streamCall);
          }

          void hydratePeerInfo().catch(() => {});
          return;
        }

        await endStaleCallBeforeOutgoing(videoClient, videoCallId);

        const channel = chatClient.channel("messaging", channelId);
        const myId = chatUserId;
        const streamCall = videoClient.call("default", videoCallId, {
          reuseInstance: false,
        });
        const isVideoCall = urlCallMode === "video";
        const memberIds = new Set<string>([myId]);
        Object.values(channel.state.members).forEach((m) => {
          if (m.user_id) memberIds.add(m.user_id);
        });

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
        }

        void watchPromise;
      } catch (err) {
        callDebug.error("setup-failed", err);
        if (!cancelled && generation === setupGenerationRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to start the call.",
          );
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
    if (!call || !isCaller) return;

    const joinCaller = async () => {
      if (acceptHandledRef.current) return;
      if (call.state.callingState === CallingState.LEFT) return;
      if (call.state.callingState === CallingState.JOINING) return;
      if (isCallJoinInProgress(call.id)) return;

      const shouldJoin =
        call.state.callingState === CallingState.JOINED ||
        !call.ringing ||
        call.state.remoteParticipants.length > 0;

      if (!shouldJoin) return;

      acceptHandledRef.current = true;
      try {
        await joinCallWithMedia(call, effectiveCallMode === "video");
        callDebug.log("caller-joined-on-accept");
      } catch (err) {
        acceptHandledRef.current = false;
        callDebug.error("caller-join-failed", err);
      }
    };

    const onAccepted = (event: { user: { id?: string } }) => {
      if (event.user?.id === call.currentUserId) return;
      void joinCaller();
    };
    const onJoined = (event: { participant?: { user?: { id?: string } } }) => {
      if (event.participant?.user?.id === call.currentUserId) return;
      void joinCaller();
    };

    void joinCaller();

    const unsubAccepted = call.on("call.accepted", onAccepted);
    const unsubJoined = call.on("call.session_participant_joined", onJoined);

    return () => {
      unsubAccepted();
      unsubJoined();
    };
  }, [call, isCaller, effectiveCallMode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const activeCall = callRef.current;
      if (next !== "active" || !activeCall) return;
      if (activeCall.state.callingState !== CallingState.JOINED) return;

      void joinCallWithMedia(activeCall, effectiveCallMode === "video").catch(
        (err) => callDebug.warn("resume-media-failed", err),
      );
    });

    return () => sub.remove();
  }, [effectiveCallMode]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const activeCall = callRef.current;
      if (!state.isConnected || !activeCall) return;
      if (activeCall.state.callingState !== CallingState.JOINED) return;

      void joinCallWithMedia(activeCall, effectiveCallMode === "video").catch(
        (err) => callDebug.warn("reconnect-media-failed", err),
      );
    });

    return unsub;
  }, [effectiveCallMode]);

  useEffect(() => {
    return () => {
      const activeCall = callRef.current;
      if (!activeCall) return;

      const state = activeCall.state.callingState;
      if (state === CallingState.LEFT || state === CallingState.JOINING) {
        return;
      }

      if (state === CallingState.RINGING || activeCall.ringing) {
        try {
          callManager.stop();
        } catch {
          /* ignore */
        }

        void activeCall
          .leave({
            reject: true,
            reason: activeCall.isCreatedByMe ? "cancel" : "decline",
          })
          .catch(() => {});
        return;
      }

      if (state === CallingState.JOINED) {
        try {
          callManager.stop();
        } catch {
          /* ignore */
        }
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
